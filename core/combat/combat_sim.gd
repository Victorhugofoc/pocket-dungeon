class_name CombatSim
extends RefCounted
## Simulação determinística de uma onda.
##
## Entrada: masmorra preparada, grupo invasor, semente e comandos de poder
## (tick + alvo). Saída: lista de eventos e `result`. Mesma entrada, mesmos
## eventos, em qualquer plataforma: só inteiros, RNG próprio, iteração por uid.
##
## Uso:
##   var sim := CombatSim.new(db, dungeon, party, seed, opts)
##   sim.run()            # ou sim.step() tick a tick (visualizador)
##   sim.result, sim.events
##
## party: lista em ordem de marcha; o primeiro é o líder.
##   {"id": "guerreiro", "modifiers": ["blindado"], "hp_bp": 10000}
##   {"boss": "varok"}            (CombatSim.boss_party() expande a escolta)
## opts:
##   heart_hp: int (PV atuais do Coração; padrão: balance.heart_hp)
##   power: id do poder equipado ("" = nenhum)
##   commands: [{"t": tick, "target": slot}]
##   pact: Dictionary de efeitos do pacto (data/pacts.json)

const UnitScript := preload("res://core/combat/unit.gd")
const Pathing := preload("res://core/combat/pathing.gd")

const SPAWN_GAP_TICKS := 10
const MIN_ATTACK_TICKS := 2

var db: Db
var dungeon: Dungeon
var rng: Rng
var bal: Dictionary

var tick: int = 0
var finished: bool = false
var units: Array = []
var events: Array = []
var result: Dictionary = {}

var heart_hp: int = 0
var mana: int = 0
var power: Dictionary = {}
var power_cost: int = 0
var commands: Array = []
var pact: Dictionary = {}

var _next_uid: int = 1
var _spawn_queue: Array = []        ## [{"unit", "at"}]
var _traps: Dictionary = {}         ## slot -> [{"id", "level", "armed", "power_bp"}]
var _zones: Array = []              ## [{"slot", "dps", "until"}]
var _chests: Dictionary = {}        ## slot -> ouro do baú (enquanto intacto)
var _blocked: Dictionary = {}       ## slot -> tick em que desbloqueia
var _leader_path: Array = []
var _gold: int = 0
var _kills: int = 0
var _elite_kills: int = 0
## Índice de unidades vivas por sala, reconstruído quando algo muda de lugar ou estado.
var _by_slot: Dictionary = {}
var _index_dirty: bool = true
## Propriedades fixas das salas durante a onda.
var _single_file: Dictionary = {}
var _room_slow: Dictionary = {}
const _NO_UNITS: Array = []


func _init(p_db: Db, p_dungeon: Dungeon, party: Array, seed: int, opts: Dictionary = {}) -> void:
	db = p_db
	dungeon = p_dungeon
	bal = db.balance
	rng = Rng.new(seed, "combat")
	pact = opts.get("pact", {})
	heart_hp = opts.get("heart_hp", bal.heart_hp)
	mana = pact.get("start_mana_add", 0)
	var power_id: String = opts.get("power", "")
	if power_id != "":
		power = db.powers[power_id]
		power_cost = power.cost + pact.get("power_cost_add", 0)
	commands = opts.get("commands", []).duplicate(true)
	commands.sort_custom(func(a, b): return a.t < b.t)
	_setup_dungeon()
	_setup_party(party)


## Expande um Herói-Chefe em [chefe, escolta...].
static func boss_party(p_db: Db, boss_id: String) -> Array:
	var out: Array = [{"boss": boss_id}]
	for e in p_db.bosses[boss_id].escorts:
		for i in e.count:
			out.append({"id": e["class"], "modifiers": [], "hp_bp": e.get("hp_bp", 10000)})
	return out


func run() -> Dictionary:
	while not finished:
		step()
	return result


func step() -> void:
	if finished:
		return
	_process_commands()
	_spawn()
	if tick % bal.ticks_per_second == 0:
		_per_second()
	_move_invaders()
	_act()
	_check_end()
	tick += 1


# --- Montagem ------------------------------------------------------------------

func _setup_dungeon() -> void:
	for s in db.layout.slots:
		var slot: String = s.id
		var c: Dictionary = dungeon.contents[slot]
		var room: Variant = c.room
		var stat_bp := 0
		var trap_bp := 0
		if room != null:
			var rdef: Dictionary = db.rooms[room.id]
			for t in rdef.traits:
				match t.id:
					"single_file":
						_single_file[slot] = true
					"room_slow":
						_room_slow[slot] = Db.lv(t.bp, room.level)
					"occupant_stat_bonus":
						stat_bp = Db.lv(t.bp, room.level)
					"trap_power_bonus":
						trap_bp = Db.lv(t.bp, room.level)
					"treasure_chest":
						var gold := Db.lv(t.gold, room.level)
						_chests[slot] = Db.scale_bp(gold, pact.get("treasure_gold_mult_bp", 10000))
		var placed: Array = []
		for i in c.monsters.size():
			var piece: Dictionary = c.monsters[i]
			var u := _make_monster(db.monster_at(piece.id, piece.level, piece.get("variant", "")), slot)
			u.origin = {"slot": slot, "index": i}
			if stat_bp > 0:
				u.max_hp = Db.scale_bp(u.max_hp, 10000 + stat_bp)
				u.hp = u.max_hp
				u.atk = Db.scale_bp(u.atk, 10000 + stat_bp)
			placed.append(u)
		_apply_synergies(placed)
		for u in placed:
			if u.shield == 0 and u.has("start_shield"):
				u.shield = Db.scale_bp(u.max_hp, u.tp("start_shield", "bp"))
			_add_unit(u)
		var traps: Array = []
		for piece in c.traps:
			traps.append({"id": piece.id, "level": piece.level, "armed": true, "power_bp": 10000 + trap_bp})
		_traps[slot] = traps


func _apply_synergies(placed: Array) -> void:
	var count := {}
	for u in placed:
		count[u.family] = count.get(u.family, 0) + 1
	for u in placed:
		var fam: Variant = db.families.get(u.family)
		if fam == null or count[u.family] < fam.synergy_min:
			continue
		for t in fam.bonus_traits:
			match t.id:
				"start_shield":
					u.shield = Db.scale_bp(u.max_hp, t.bp)
				"haste":
					u.base_haste_bp += t.bp
				"gold_on_kill":
					u.timers["syn_gold"] = t.amount
				"lifesteal":
					u.timers["syn_lifesteal"] = t.bp


func _make_monster(stats: Dictionary, slot: String) -> Object:
	var u: Object = UnitScript.new()
	u.side = "monster"
	u.id = stats.id
	u.name = stats.name
	u.level = stats.level
	u.variant = stats.variant
	u.family = stats.family
	u.role = stats.get("role", "")
	u.max_hp = stats.hp
	u.hp = stats.hp
	u.atk = stats.atk
	u.attack_ticks = stats.attack_ticks
	u.range = stats.range
	u.damage_type = stats.damage_type
	u.armor = stats.armor
	u.add_traits(stats.traits)
	if u.has("damage_type_override"):
		u.damage_type = u.tp("damage_type_override", "damage_type")
	if u.has("range_override"):
		u.range = u.tp("range_override", "range")
	if u.has("haste"):
		u.base_haste_bp += u.tp("haste", "bp")
	u.slot = slot
	u.spawned = true
	u.cooldown = u.attack_ticks
	return u


func _setup_party(party: Array) -> void:
	for i in party.size():
		var entry: Dictionary = party[i]
		var u := _make_invader(entry)
		_add_unit(u)
		_spawn_queue.append({"unit": u, "at": i * SPAWN_GAP_TICKS})


func _make_invader(entry: Dictionary) -> Object:
	var u: Object = UnitScript.new()
	u.side = "invader"
	var def: Dictionary
	if entry.has("boss"):
		def = db.bosses[entry.boss]
		u.is_boss = true
		u.elite = true
		u.id = entry.boss
	else:
		def = db.adventurers[entry.id]
		u.id = entry.id
	u.name = def.name
	u.family = "invasor"
	u.max_hp = Db.scale_bp(def.hp, entry.get("hp_bp", 10000))
	u.atk = def.atk
	u.attack_ticks = def.attack_ticks
	u.range = def.range
	u.damage_type = def.damage_type
	u.armor = def.armor
	u.move_speed = def.move_speed
	u.threat = def.threat
	u.route_pref = def.route_pref
	u.add_traits(def.traits)
	for mod_id in entry.get("modifiers", []):
		var m: Dictionary = db.modifiers[mod_id]
		u.elite = true
		u.armor += m.stats.get("armor_add", 0)
		u.move_speed = Db.scale_bp(u.move_speed, 10000 + m.stats.get("move_speed_bp", 0))
		u.threat += m.threat_add
		u.add_traits(m.traits)
	u.hp = u.max_hp
	u.slot = db.layout.entrance
	u.cooldown = u.attack_ticks
	return u


func _add_unit(u: Object) -> void:
	u.uid = _next_uid
	_next_uid += 1
	units.append(u)
	_mark()


func _emit(type: String, data: Dictionary = {}) -> void:
	data["t"] = tick
	data["type"] = type
	events.append(data)


# --- Comandos e entrada -------------------------------------------------------

func _process_commands() -> void:
	while not commands.is_empty() and commands[0].t <= tick:
		var cmd: Dictionary = commands.pop_front()
		var reason := power_target_error(cmd.target)
		if reason == "" and mana < power_cost:
			reason = "mana insuficiente"
		if reason != "":
			_emit("power_failed", {"target": cmd.target, "mana": mana, "reason": reason})
			continue
		mana -= power_cost
		_emit("power", {"id": power.id, "target": cmd.target})
		_apply_power(cmd.target)


func _spawn() -> void:
	while not _spawn_queue.is_empty() and _spawn_queue[0].at <= tick:
		var u: Object = _spawn_queue.pop_front().unit
		u.spawned = true
		_mark()
		u.path = _choose_path(u, u.slot)
		if _leader_path.is_empty():
			_leader_path = u.path
		u.path_index = 0
		u.arrived_tick = tick
		_emit("spawn", {"u": u.uid, "id": u.id, "path": u.path})


func _choose_path(u: Object, from: String) -> Array:
	var passable := {}
	for s in dungeon.slot_state:
		passable[s] = dungeon.passable(s) and not _is_blocked(s)
	var paths := Pathing.all_paths(dungeon.adjacency, passable, from, db.layout.heart)
	return Pathing.choose(paths, u.route_pref, _route_info(), _leader_path,
			pact.get("treasure_lures_all", false))


func _route_info() -> Dictionary:
	var info := {}
	for s in dungeon.slot_state:
		info[s] = {"monsters": 0, "traps": 0, "treasure": _chests.has(s)}
	for u in units:
		if u.side == "monster" and u.is_alive():
			info[u.slot].monsters += 1
	for s in _traps:
		for t in _traps[s]:
			if t.armed:
				info[s].traps += 1
	return info


func _is_blocked(slot: String) -> bool:
	return _blocked.get(slot, 0) > tick


# --- A cada segundo -----------------------------------------------------------

func _per_second() -> void:
	if not power.is_empty() and tick > 0:
		mana = mini(mana + bal.mana_per_second, bal.mana_max)
	for i in units.size():
		var u: Object = units[i]
		if not u.is_alive() or not u.spawned:
			continue
		for p in u.poison:
			if p.until > tick and u.is_alive():
				_damage(u, p.dps, "poison", _unit(p.src), false, "poison")
		for b in u.burn:
			if b.until > tick and u.is_alive():
				_damage(u, b.dps, "fire", _unit(b.src), false, "burn")
		if not u.is_alive():
			continue
		if u.has("regen"):
			_heal(u, u.tp("regen", "hp_per_sec"))
		if u.has("heal_allies"):
			for ally in _units_in(u.slot, "invader"):
				_heal(ally, u.tp("heal_allies", "hp_per_sec"))
		u.poison = u.poison.filter(func(p): return p.until > tick)
		u.burn = u.burn.filter(func(b): return b.until > tick)
		u.haste = u.haste.filter(func(h): return h.until > tick)
	for z in _zones:
		if z.until > tick:
			for inv in _units_in(z.slot, "invader"):
				_damage(inv, z.dps, "fire", null, false, "fire_zone")
	_zones = _zones.filter(func(z): return z.until > tick)


# --- Movimento ------------------------------------------------------------------

func _move_invaders() -> void:
	for i in units.size():
		var u: Object = units[i]
		if u.side != "invader" or not u.spawned or not u.is_alive():
			continue
		if _arrival_checks(u):
			continue
		if u.cannot_move(tick) or _is_held(u):
			continue
		u.progress += _move_speed(u)
		while u.progress >= bal.room_length and u.is_alive():
			if u.path_index + 1 >= u.path.size():
				u.progress = bal.room_length - 1
				break
			var nxt: String = u.path[u.path_index + 1]
			if _is_blocked(nxt):
				var new_path := _choose_path(u, u.slot)
				if new_path.is_empty() or _is_blocked(new_path[1]):
					u.progress = bal.room_length - 1
					break
				u.path = new_path
				u.path_index = 0
				nxt = u.path[1]
			u.progress -= bal.room_length
			_enter(u, nxt)
			if not u.is_alive() or _is_held(u):
				u.progress = 0
				break


## Um invasor parado num slot pode, sem se mover: atingir o Coração (Guardião
## morto) ou levar o baú (sala vazia). Retorna true se saiu de cena.
func _arrival_checks(u: Object) -> bool:
	if _has_monsters(u.slot):
		return false
	if u.slot == db.layout.heart:
		_hit_heart(u)
		return true
	if _chests.has(u.slot) and u.has("loots_treasure"):
		_loot(u)
		return true
	return false


func _enter(u: Object, slot: String) -> void:
	u.slot = slot
	_mark()
	u.path_index += 1
	u.arrived_tick = tick
	u.effect_shield = u.has("room_effect_shield")
	_emit("enter", {"u": u.uid, "slot": slot})
	for trap in _traps.get(slot, []):
		if trap.armed and u.is_alive():
			_trigger_trap(u, slot, trap)
	if u.is_alive():
		_arrival_checks(u)


## Parado por monstros vivos na sala, a menos que o Passo da Tempestade esteja pronto.
func _is_held(u: Object) -> bool:
	if not _has_monsters(u.slot):
		return false
	if u.has("blink_past_room") and tick >= u.timers.get("blink", 0) and u.slot != db.layout.heart:
		u.timers["blink"] = tick + u.tp("blink_past_room", "every_ticks")
		_emit("blink", {"u": u.uid, "slot": u.slot})
		u.progress = bal.room_length
		return false
	return true


func _move_speed(u: Object) -> int:
	var slow := 0
	if u.is_slowed(tick):
		slow += u.slow_bp
	slow += _room_slow.get(u.slot, 0)
	return maxi(1, Db.scale_bp(u.move_speed, maxi(1000, 10000 - slow)))


func _hit_heart(u: Object) -> void:
	var dmg: int = u.threat
	heart_hp = maxi(0, heart_hp - dmg)
	u.heart_damage += dmg
	u.state = "escaped"
	_mark()
	_emit("heart_hit", {"u": u.uid, "amount": dmg, "heart_hp": heart_hp})


func _loot(u: Object) -> void:
	var gold: int = _chests[u.slot]
	_chests.erase(u.slot)
	u.state = "looted"
	_mark()
	_emit("loot", {"u": u.uid, "slot": u.slot, "gold": gold})


# --- Armadilhas ------------------------------------------------------------------

func _trigger_trap(u: Object, slot: String, trap: Dictionary) -> void:
	trap.armed = false
	if u.has("disarm_first_trap") and not u.disarm_used:
		u.disarm_used = true
		_emit("disarm", {"u": u.uid, "slot": slot, "trap": trap.id})
		return
	if u.effect_shield:
		u.effect_shield = false
		_emit("effect_blocked", {"u": u.uid, "slot": slot, "source": trap.id})
		return
	_emit("trap", {"u": u.uid, "slot": slot, "trap": trap.id})
	var p: int = trap.power_bp
	for e in db.traps[trap.id].effects:
		match e.id:
			"damage":
				_damage(u, Db.scale_bp(Db.lv(e.amount, trap.level), p), e.damage_type, null, false, trap.id)
			"root":
				_status(u, "root", {"duration": Db.scale_bp(Db.lv(e.duration_ticks, trap.level), p)})
			"fire_zone":
				_zones.append({"slot": slot, "dps": Db.scale_bp(Db.lv(e.dmg_per_sec, trap.level), p),
						"until": tick + Db.lv(e.duration_ticks, trap.level)})
			"ally_haste":
				_haste_monsters(slot, e.scope, Db.scale_bp(Db.lv(e.attack_speed_bp, trap.level), p),
						Db.lv(e.duration_ticks, trap.level))


func _haste_monsters(slot: String, scope: String, bp: int, duration: int) -> void:
	var slots := [slot]
	if scope == "room_and_adjacent":
		slots.append_array(dungeon.adjacency[slot])
	for s in slots:
		for m in _units_in(s, "monster"):
			m.haste.append({"bp": bp, "until": tick + duration})


# --- Ataques ---------------------------------------------------------------------

func _act() -> void:
	for i in units.size():
		var u: Object = units[i]
		if not u.is_alive() or not u.spawned:
			continue
		var foes := _targetable_foes(u)
		if foes.is_empty():
			u.cooldown = maxi(u.cooldown - 1, 0)
			continue
		_timed_abilities(u, foes)
		if u.cannot_act(tick):
			continue
		u.cooldown -= 1
		if u.cooldown > 0:
			continue
		for t in _select_targets(u, foes):
			if t.is_alive() and u.is_alive():
				_hit(u, t)
		u.cooldown = _attack_interval(u)


## Invasores na fila do Corredor Estreito não atacam nem são atacados.
func _targetable_foes(u: Object) -> Array:
	if u.side == "invader" and not _is_front_of_queue(u):
		return []
	var foe_side := "invader" if u.side == "monster" else "monster"
	var foes := _units_in(u.slot, foe_side)
	if foe_side == "invader" and _is_single_file(u.slot):
		foes = foes.filter(func(f): return _is_front_of_queue(f))
	return foes


func _is_front_of_queue(inv: Object) -> bool:
	if not _is_single_file(inv.slot):
		return true
	for other in _units_in(inv.slot, "invader"):
		if other.arrived_tick < inv.arrived_tick or (other.arrived_tick == inv.arrived_tick and other.uid < inv.uid):
			return false
	return true


func _is_single_file(slot: String) -> bool:
	return _single_file.has(slot)


func _timed_abilities(u: Object, foes: Array) -> void:
	if u.has("stun_pulse") and tick >= u.timers.get("stun_pulse", u.tp("stun_pulse", "every_ticks")):
		u.timers["stun_pulse"] = tick + u.tp("stun_pulse", "every_ticks")
		_status(foes[0], "stun", {"duration": u.tp("stun_pulse", "duration_ticks")}, u)
	if u.has("summon") and u.summons_alive < u.tp("summon", "max") \
			and tick >= u.timers.get("summon", u.tp("summon", "every_ticks")):
		u.timers["summon"] = tick + u.tp("summon", "every_ticks")
		_summon(u, u.tp("summon", "unit"), -1, -1)


func _select_targets(u: Object, foes: Array) -> Array:
	if u.has("aoe_attack"):
		return foes
	var pool := foes
	if u.has("target_backline") or u.has("backline_strike"):
		var back := foes.filter(func(f): return f.range == "ranged" or f.role == "suporte")
		if not back.is_empty():
			pool = back
	else:
		var taunts := foes.filter(func(f): return f.has("taunt"))
		if not taunts.is_empty():
			pool = taunts
		elif u.range == "melee":
			var front := foes.filter(func(f): return f.range == "melee")
			if not front.is_empty():
				pool = front
	pool = pool.duplicate()
	if u.has("target_lowest_hp"):
		pool.sort_custom(func(a, b): return a.hp < b.hp or (a.hp == b.hp and a.uid < b.uid))
	elif u.has("bonus_vs_strongest"):
		pool.sort_custom(_stronger)
	var n: int = u.tp("multi_target", "count") if u.has("multi_target") else 1
	return pool.slice(0, n)


func _stronger(a: Object, b: Object) -> bool:
	if a.level != b.level:
		return a.level > b.level
	if a.max_hp != b.max_hp:
		return a.max_hp > b.max_hp
	return a.uid < b.uid


func _strongest_monster() -> Object:
	var best: Object = null
	for m in units:
		if m.side == "monster" and m.is_alive() and (best == null or _stronger(m, best)):
			best = m
	return best


func _attack_interval(u: Object) -> int:
	var haste: int = u.base_haste_bp
	for h in u.haste:
		if h.until > tick:
			haste += h.bp
	if u.has("berserk") and u.hp * 10000 < u.max_hp * u.tp("berserk", "threshold_bp"):
		haste += u.tp("berserk", "attack_speed_bp")
	var slow := 0
	if u.is_slowed(tick):
		slow += u.slow_bp
	if u.side == "monster":
		for inv in _units_in(u.slot, "invader"):
			if inv.has("frost_aura"):
				slow += inv.tp("frost_aura", "bp")
	var speed := maxi(2000, 10000 + haste - slow)
	return maxi(MIN_ATTACK_TICKS, (u.attack_ticks * 10000 + speed / 2) / speed)


func _hit(u: Object, t: Object) -> void:
	var bonus := 0
	if u.side == "monster":
		for ally in _units_in(u.slot, "monster"):
			if ally != u and ally.has("ally_damage_aura"):
				bonus += ally.tp("ally_damage_aura", "bp")
	if u.has("bonus_vs_impaired") and t.is_impaired(tick):
		bonus += u.tp("bonus_vs_impaired", "bp")
	if u.has("bonus_vs_strongest") and t == _strongest_monster():
		bonus += u.tp("bonus_vs_strongest", "bp")
	var dmg := Db.scale_bp(u.atk, 10000 + bonus)
	var crit := false
	if u.has("crit") and rng.chance_bp(u.tp("crit", "chance_bp")):
		crit = true
		dmg = Db.scale_bp(dmg, u.tp("crit", "mult_bp"))
	var dealt := _damage(t, dmg, u.damage_type, u, crit, "attack")
	if dealt <= 0:
		return
	var steal: int = u.timers.get("syn_lifesteal", 0)
	if u.has("lifesteal"):
		steal += u.tp("lifesteal", "bp")
	if steal > 0:
		_heal(u, Db.scale_bp(dealt, steal))
	if t.has("reflect") and u.is_alive():
		_damage(u, Db.scale_bp(dealt, t.tp("reflect", "bp")), "pure", t, false, "reflect")
	if not t.is_alive():
		return
	if u.has("poison_on_hit"):
		var stacks: int = u.tp("poison_stacks", "max") if u.has("poison_stacks") else 1
		_status(t, "poison", {"dps": u.tp("poison_on_hit", "dmg_per_sec"),
				"duration": u.tp("poison_on_hit", "duration_ticks"), "max": stacks}, u)
	if u.has("burn_on_hit"):
		_status(t, "burn", {"dps": u.tp("burn_on_hit", "dmg_per_sec"),
				"duration": u.tp("burn_on_hit", "duration_ticks"), "max": u.tp("burn_on_hit", "max_stacks")}, u)
	if u.has("slow_on_hit"):
		_status(t, "slow", {"bp": u.tp("slow_on_hit", "bp"), "duration": u.tp("slow_on_hit", "duration_ticks")}, u)
	if u.has("armor_shred_on_hit"):
		t.armor_shred = mini(t.armor_shred + u.tp("armor_shred_on_hit", "amount"), u.tp("armor_shred_on_hit", "max"))
	for kind in ["root_on_hit", "fear_on_hit"]:
		if u.has(kind) and tick >= u.timers.get(kind, 0):
			u.timers[kind] = tick + u.tp(kind, "every_ticks")
			_status(t, "root" if kind == "root_on_hit" else "fear", {"duration": u.tp(kind, "duration_ticks")}, u)


# --- Dano, cura, status, morte ---------------------------------------------------

## Aplica dano já com armadura, reduções e escudo. Retorna o dano efetivo.
func _damage(t: Object, amount: int, dtype: String, src: Object, crit: bool, source: String) -> int:
	if not t.is_alive():
		return 0
	if dtype == "physical":
		amount = maxi(1, amount - maxi(0, t.armor - t.armor_shred))
	if dtype != "pure":
		if t.has("damage_reduction") and t.tp("damage_reduction", "damage_type") == dtype:
			amount = Db.scale_bp(amount, 10000 - t.tp("damage_reduction", "bp"))
		if t.has("resist") and t.tp("resist", "damage_type") == dtype:
			amount = Db.scale_bp(amount, 10000 - t.tp("resist", "bp"))
	var absorbed := mini(t.shield, amount)
	t.shield -= absorbed
	var dealt := mini(amount - absorbed, t.hp)
	t.hp -= dealt
	var data := {"u": t.uid, "amount": dealt, "dtype": dtype, "source": source}
	if src != null:
		data["src"] = src.uid
		src.damage_dealt += dealt
	if crit:
		data["crit"] = true
	if absorbed > 0:
		data["absorbed"] = absorbed
	_emit("damage", data)
	if t.hp <= 0:
		_die(t, src)
	return dealt


func _heal(u: Object, amount: int) -> void:
	var healed := mini(amount, u.max_hp - u.hp)
	if healed > 0 and u.is_alive():
		u.hp += healed
		_emit("heal", {"u": u.uid, "amount": healed})


## kind: stun | root | fear | slow | poison | burn.
func _status(t: Object, kind: String, p: Dictionary, src: Object = null) -> void:
	if not t.is_alive():
		return
	if t.effect_shield:
		t.effect_shield = false
		_emit("effect_blocked", {"u": t.uid, "source": kind})
		return
	var until: int = tick + p.duration
	match kind:
		"stun":
			t.stun_until = maxi(t.stun_until, until)
		"root":
			t.root_until = maxi(t.root_until, until)
		"fear":
			t.fear_until = maxi(t.fear_until, until)
		"slow":
			t.slow_bp = maxi(t.slow_bp if t.is_slowed(tick) else 0, p.bp)
			t.slow_until = maxi(t.slow_until, until)
		"poison", "burn":
			var list: Array = t.poison if kind == "poison" else t.burn
			var live := list.filter(func(s): return s.until > tick)
			if live.size() >= p.max:
				live.sort_custom(func(a, b): return a.until < b.until)
				live.pop_front()
			live.append({"dps": p.dps, "until": until, "src": src.uid if src != null else 0})
			if kind == "poison":
				t.poison = live
			else:
				t.burn = live
	var data := {"u": t.uid, "status": kind, "until": until}
	if src != null:
		data["src"] = src.uid
	_emit("status", data)


func _die(t: Object, killer: Object) -> void:
	if t.has("revive_once") and not t.revived:
		t.revived = true
		t.hp = maxi(1, Db.scale_bp(t.max_hp, t.tp("revive_once", "hp_bp")))
		_emit("revive", {"u": t.uid, "hp": t.hp})
		return
	t.state = "dead"
	_mark()
	var data := {"u": t.uid}
	if killer != null:
		data["killer"] = killer.uid
	_emit("death", data)
	if t.parent_uid > 0:
		var parent: Object = _unit(t.parent_uid)
		if parent != null:
			parent.summons_alive -= 1
	if t.side == "invader":
		_kills += 1
		var gold: int = bal.gold_per_elite_kill if t.elite else bal.gold_per_kill
		if t.has("loot_carrier"):
			gold += t.tp("loot_carrier", "gold")
		if killer != null and killer.side == "monster":
			gold += killer.timers.get("syn_gold", 0)
			if killer.has("gold_on_kill"):
				gold += killer.tp("gold_on_kill", "amount")
		if t.elite:
			_elite_kills += 1
		_gold += gold
		_emit("gold", {"amount": gold, "u": t.uid})
	elif t.has("split_on_death") and not t.summoned:
		for i in t.tp("split_on_death", "count"):
			_summon(t, "blob", Db.scale_bp(t.max_hp, t.tp("split_on_death", "hp_bp")), t.atk / 2)


## Cria uma unidade invocada no slot de `parent`, do mesmo lado.
func _summon(parent: Object, unit_id: String, hp: int, atk: int) -> void:
	var def: Dictionary = db.summons[unit_id]
	var u: Object = _make_monster({
		"id": unit_id, "name": def.name, "level": 1, "variant": "", "family": def.family,
		"hp": hp if hp > 0 else def.hp, "atk": atk if atk >= 0 else def.atk,
		"attack_ticks": def.attack_ticks, "range": def.range, "damage_type": def.damage_type,
		"armor": def.armor, "traits": def.traits,
	}, parent.slot)
	u.side = parent.side
	u.summoned = true
	u.parent_uid = parent.uid
	if parent.side == "invader":
		u.path = parent.path
		u.path_index = parent.path_index
		u.move_speed = parent.move_speed
		u.route_pref = parent.route_pref
		u.arrived_tick = tick
	parent.summons_alive += 1
	_add_unit(u)
	_emit("summon", {"u": u.uid, "id": unit_id, "parent": parent.uid, "slot": u.slot})


# --- Poderes -------------------------------------------------------------------

## "" se o poder equipado pode ser usado em `target`; senão o motivo (sem gastar mana).
## Fechar Porta só vale onde existe outro caminho até o Coração: fechar uma
## passagem obrigatória travaria os invasores até o tempo acabar.
func power_target_error(target: String) -> String:
	if power.is_empty():
		return "nenhum poder equipado"
	if not dungeon.slot_state.has(target):
		return "alvo inválido"
	for e in power.effects:
		if e.id == "block_branch":
			if dungeon.slot_kind[target] != "slot" or not dungeon.passable(target):
				return "só dá para fechar a entrada de um ramo"
			var passable := {}
			for s in dungeon.slot_state:
				passable[s] = dungeon.passable(s) and not _is_blocked(s) and s != target
			if Pathing.all_paths(dungeon.adjacency, passable, db.layout.entrance, db.layout.heart).is_empty():
				return "não há caminho alternativo: fechar aqui travaria a masmorra"
	return ""


func _apply_power(target: String) -> void:
	for e in power.effects:
		match e.id:
			"block_branch":
				_blocked[target] = tick + e.duration_ticks
			"ally_haste":
				_haste_monsters(target, e.scope, e.attack_speed_bp, e.duration_ticks)
			"damage":
				for inv in _units_in(target, "invader"):
					_damage(inv, e.amount, e.damage_type, null, false, power.id)
			"stun":
				for inv in _units_in(target, "invader"):
					_status(inv, "stun", {"duration": e.duration_ticks})
			"fear":
				var targets := _units_in(target, "invader")
				for i in mini(e.count, targets.size()):
					_status(targets[i], "fear", {"duration": e.duration_ticks})
			"push_back":
				for inv in _units_in(target, "invader"):
					if inv.has("knockback_immune") or inv.path_index == 0:
						continue
					inv.path_index -= 1
					inv.slot = inv.path[inv.path_index]
					_mark()
					inv.progress = 0
					inv.arrived_tick = tick
					_emit("push", {"u": inv.uid, "slot": inv.slot})
			"revive_strongest":
				var best: Object = null
				for m in units:
					if m.side == "monster" and m.state == "dead" and not m.summoned \
							and m.origin.get("slot", "") == target and (best == null or _stronger(m, best)):
						best = m
				if best != null:
					best.state = "active"
					_mark()
					best.hp = maxi(1, Db.scale_bp(best.max_hp, e.hp_bp))
					best.cooldown = best.attack_ticks
					_emit("revive", {"u": best.uid, "hp": best.hp})


# --- Fim ---------------------------------------------------------------------------

func _check_end() -> void:
	var active := false
	for u in units:
		if u.side == "invader" and u.is_alive():
			active = true
			break
	if active and tick + 1 < bal.wave_time_limit_ticks:
		return
	if not active and not _spawn_queue.is_empty():
		return
	for u in units:
		if u.side == "invader" and u.is_alive():
			u.state = "fled"
			_mark()
			_emit("flee", {"u": u.uid})
	finished = true
	_build_result()
	_emit("end", {"heart_hp": heart_hp, "heart_damage": result.heart_damage})


func _build_result() -> void:
	var outcomes := {}
	var damage := {}
	var heart := {}
	var heart_damage := 0
	for u in units:
		if u.side == "invader":
			outcomes[u.uid] = u.state
			heart_damage += u.heart_damage
			if u.heart_damage > 0:
				heart[u.uid] = u.heart_damage
		elif u.damage_dealt > 0:
			damage[u.uid] = u.damage_dealt
	var treasure := 0
	for s in _chests:
		treasure += _chests[s]
	result = {
		"ticks": tick + 1,
		"heart_damage": heart_damage,
		"heart_hp": heart_hp,
		"kills": _kills,
		"elite_kills": _elite_kills,
		"kill_gold": _gold,
		"treasure_gold": treasure,
		"chests_left": _chests.keys(),
		"outcomes": outcomes,
		"monster_damage": damage,
		"invader_heart_damage": heart,
	}


## Impressão digital da onda: muda se qualquer evento mudar.
func events_hash() -> String:
	return JSON.stringify(events).sha256_text()


# --- Utilidades -------------------------------------------------------------------

## Marca o índice por sala como desatualizado (unidade mudou de sala ou de estado).
func _mark() -> void:
	_index_dirty = true


## Unidades vivas e em cena de um lado numa sala, em ordem de uid.
## O array é compartilhado: quem chama não deve modificá-lo.
func _units_in(slot: String, side: String) -> Array:
	if _index_dirty:
		_by_slot.clear()
		for u in units:
			if u.is_alive() and u.spawned:
				if not _by_slot.has(u.slot):
					_by_slot[u.slot] = {"monster": [], "invader": []}
				_by_slot[u.slot][u.side].append(u)
		_index_dirty = false
	var entry: Variant = _by_slot.get(slot)
	return _NO_UNITS if entry == null else entry[side]


func _has_monsters(slot: String) -> bool:
	return not _units_in(slot, "monster").is_empty()


func _unit(uid: int) -> Object:
	for u in units:
		if u.uid == uid:
			return u
	return null
