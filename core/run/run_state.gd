class_name RunState
extends RefCounted
## Estado e regras de uma run: ouro, Coração, bancada, loja, masmorra,
## calendário de ondas e histórico.
##
## Cada ação do jogador é um método que retorna "" em caso de sucesso ou a
## mensagem de erro. `play_wave()` roda o combate da onda atual, aplica o
## resultado e prepara a próxima loja.
##
##   var run := RunState.start(db, seed, {"power": "fechar_porta", "pact": ""})
##   run.buy(0); run.place(0, "a1"); run.play_wave()

const Pieces := preload("res://core/run/pieces.gd")
const WaveGen := preload("res://core/run/wave_generator.gd")
const Report := preload("res://core/run/wave_report.gd")

const SAVE_VERSION := 1

var db: Db
var seed: int = 0
var dungeon: Dungeon
var gold: int = 0
var heart_hp: int = 0
var wave: int = 1
var bench: Array = []
var power_id: String = ""
var pact_id: String = ""
var pact: Dictionary = {}
var unlocks: Array = []
var schedule: Dictionary = {}
var offers: Array = []
var locked: int = -1
var shop_rng: Rng
var status: String = "playing"   ## "playing" | "won" | "lost"
var history: Array = []
var free_digs: int = 0


## opts: power (id), pact (id), unlocks (ids desbloqueados na meta, além de "start").
static func start(p_db: Db, p_seed: int, opts: Dictionary = {}) -> RunState:
	var r := RunState.new()
	r._init_common(p_db, p_seed, opts.get("power", ""), opts.get("pact", ""), opts.get("unlocks", []))
	var bal := p_db.balance
	r.gold = bal.start_gold + r.pact.get("start_gold_add", 0)
	r.heart_hp = bal.heart_hp + r.pact.get("heart_hp_add", 0)
	r.bench.resize(bal.bench_size + r.pact.get("bench_size_add", 0))
	r.bench.fill(null)
	r.free_digs = 1 if r.pact.get("first_dig_free", false) else 0
	r.shop_rng = Rng.new(p_seed, "shop")
	r._refresh_shop()
	return r


func _init_common(p_db: Db, p_seed: int, p_power: String, p_pact: String, p_unlocks: Array) -> void:
	db = p_db
	seed = p_seed
	power_id = p_power
	pact_id = p_pact
	pact = db.pacts[p_pact].effects if p_pact != "" else {}
	unlocks = p_unlocks.duplicate()
	dungeon = Dungeon.new(db)
	schedule = WaveGen.schedule(db, seed)


# --- Consultas -------------------------------------------------------------------

func next_party() -> Array:
	return schedule.parties[wave - 1]


func next_theme() -> String:
	return schedule.themes[wave - 1]


## Tema da onda depois da próxima ("" se não houver).
func theme_after() -> String:
	return schedule.themes[wave] if wave < schedule.themes.size() else ""


## O Herói-Chefe é revelado a partir da onda `boss_reveal_wave`.
func revealed_boss() -> String:
	return schedule.boss if wave >= db.balance.boss_reveal_wave else ""


func free_bench_slot() -> int:
	return bench.find(null)


func dig_price() -> int:
	if dungeon.dig_cost() < 0:
		return -1
	return 0 if free_digs > 0 else dungeon.dig_cost()


## Almas ganhas até agora (fim de run: valor final).
func souls() -> int:
	var survived := history.size() - (1 if status == "lost" else 0)
	var total: int = db.balance.souls_per_wave * survived
	if status == "won":
		total += db.balance.souls_win_bonus
	return total


func unlocked(def: Dictionary) -> bool:
	return def.get("unlock", "start") == "start" or def.id in unlocks


# --- Loja -------------------------------------------------------------------------

func buy(i: int) -> String:
	if i < 0 or i >= offers.size() or offers[i] == null:
		return "oferta inválida"
	var offer: Dictionary = offers[i]
	if gold < offer.price:
		return "ouro insuficiente"
	var slot := free_bench_slot()
	if slot < 0:
		return "bancada cheia"
	var piece := Pieces.make(offer.kind, offer.id, offer.level, offer.price)
	bench[slot] = piece
	gold -= offer.price
	offers[i] = null
	if locked == i:
		locked = -1
	return ""


func reroll() -> String:
	if gold < db.balance.reroll_cost:
		return "ouro insuficiente"
	gold -= db.balance.reroll_cost
	_refresh_shop()
	return ""


func toggle_lock(i: int) -> String:
	if i < 0 or i >= offers.size() or offers[i] == null:
		return "oferta inválida"
	locked = -1 if locked == i else i
	return ""


func sell(b: int) -> String:
	if b < 0 or b >= bench.size() or bench[b] == null:
		return "nada para vender"
	gold += Db.scale_bp(bench[b].paid, db.balance.sell_refund_bp)
	bench[b] = null
	return ""


## Nova loja; a oferta travada continua (vai para a primeira posição).
func _refresh_shop() -> void:
	var n: int = db.balance.shop_offers + pact.get("shop_offers_add", 0)
	var kept: Variant = offers[locked] if locked >= 0 and locked < offers.size() else null
	offers = []
	locked = -1
	if kept != null:
		offers.append(kept)
		locked = 0
	while offers.size() < n:
		offers.append(_roll_offer())


func _roll_offer() -> Dictionary:
	var bal := db.balance
	var kind := WaveGen._weighted(shop_rng, bal.shop_kind_weights)
	var id: String = shop_rng.pick(_pool(kind))
	var level := 1
	if wave >= bal.shop_level2_from_wave and shop_rng.chance_bp(bal.shop_level2_chance_bp):
		level = 2
	return {"kind": kind, "id": id, "level": level, "price": Pieces.price(db, kind, level)}


func _pool(kind: String) -> Array:
	var source: Dictionary = {"monster": db.monsters, "room": db.rooms, "trap": db.traps}[kind]
	var out := []
	for id in source:
		if unlocked(source[id]):
			out.append(id)
	out.sort()
	return out


# --- Masmorra e bancada ---------------------------------------------------------

func place(b: int, slot: String) -> String:
	if b < 0 or b >= bench.size() or bench[b] == null:
		return "bancada vazia nesta posição"
	var piece: Dictionary = bench[b]
	var err: String
	match piece.kind:
		"room":
			err = dungeon.place_room(slot, piece)
		"monster":
			err = dungeon.place_monster(slot, piece)
		_:
			err = dungeon.place_trap(slot, piece)
	if err == "":
		bench[b] = null
	return err


## Devolve à bancada uma peça da masmorra. Salas precisam estar vazias.
func pick_up(slot: String, kind: String, index: int = 0) -> String:
	var b := free_bench_slot()
	if b < 0:
		return "bancada cheia"
	if not dungeon.contents.has(slot):
		return "slot inexistente"
	var piece: Variant = null
	match kind:
		"room":
			var c: Dictionary = dungeon.contents[slot]
			if c.room == null:
				return "não há sala aqui"
			if not c.monsters.is_empty() or not c.traps.is_empty():
				return "esvazie a sala antes"
			piece = dungeon.remove_room(slot)[0]
		"monster":
			piece = dungeon.remove_monster(slot, index)
		"trap":
			piece = dungeon.remove_trap(slot, index)
	if piece == null:
		return "nada para pegar"
	bench[b] = piece
	return ""


## Funde bench[j] em bench[i].
func merge_bench(i: int, j: int, variant: String = "") -> String:
	if i == j or i < 0 or j < 0 or i >= bench.size() or j >= bench.size():
		return "posições inválidas"
	var err := Pieces.can_merge(db, bench[i], bench[j], variant)
	if err != "":
		return err
	bench[i] = Pieces.merged(db, bench[i], bench[j], variant)
	bench[j] = null
	return ""


## Funde bench[b] numa peça já posicionada (a peça sobe de nível no lugar).
func merge_onto(b: int, slot: String, kind: String, index: int = 0, variant: String = "") -> String:
	if b < 0 or b >= bench.size() or bench[b] == null:
		return "bancada vazia nesta posição"
	if not dungeon.contents.has(slot):
		return "slot inexistente"
	var c: Dictionary = dungeon.contents[slot]
	var target: Variant = null
	match kind:
		"room":
			target = c.room
		"monster":
			target = c.monsters[index] if index < c.monsters.size() else null
		"trap":
			target = c.traps[index] if index < c.traps.size() else null
	var err := Pieces.can_merge(db, target, bench[b], variant)
	if err != "":
		return err
	var result := Pieces.merged(db, target, bench[b], variant)
	match kind:
		"room":
			c.room = result
		"monster":
			c.monsters[index] = result
		"trap":
			c.traps[index] = result
	bench[b] = null
	return ""


func dig(slot: String) -> String:
	var price := dig_price()
	if price < 0:
		return "não há mais o que escavar"
	if gold < price:
		return "ouro insuficiente"
	var err := dungeon.dig(slot)
	if err != "":
		return err
	if free_digs > 0:
		free_digs -= 1
	else:
		gold -= price
	return ""


# --- Onda --------------------------------------------------------------------------

## Roda a onda atual. commands: [{"t": tick, "target": slot}] para o poder.
## Retorna o registro da onda (também guardado em `history`) mais "sim".
func play_wave(commands: Array = []) -> Dictionary:
	assert(status == "playing", "a run já terminou")
	var sim := CombatSim.new(db, dungeon, next_party(), combat_seed(), {
		"heart_hp": heart_hp, "power": power_id, "commands": commands, "pact": pact,
	})
	sim.run()
	var bal := db.balance
	var interest_cap: int = pact.get("interest_max_override", bal.interest_max)
	var income := {
		"base": bal.income_base + pact.get("income_base_add", 0),
		"kills": sim.result.kill_gold,
		"treasure": sim.result.treasure_gold,
		"interest": mini(gold / bal.interest_per, interest_cap),
	}
	var total := 0
	for k in income:
		total += income[k]
	heart_hp = sim.result.heart_hp
	var entry := {
		"wave": wave,
		"theme": next_theme(),
		"heart_damage": sim.result.heart_damage,
		"heart_hp": heart_hp,
		"income": income,
		"income_total": total,
		"report": Report.build(db, sim),
	}
	history.append(entry)
	if heart_hp <= 0:
		status = "lost"
	elif wave >= bal.waves_per_run:
		status = "won"
	else:
		gold += total
		wave += 1
		_refresh_shop()
	var out := entry.duplicate()
	out["sim"] = sim
	return out


func combat_seed() -> int:
	return Rng.new(seed, "combat_wave_%d" % wave).next_u32()


# --- Save ------------------------------------------------------------------------------

func to_dict() -> Dictionary:
	return {
		"version": SAVE_VERSION,
		"seed": seed,
		"gold": gold,
		"heart_hp": heart_hp,
		"wave": wave,
		"bench": bench.duplicate(true),
		"power_id": power_id,
		"pact_id": pact_id,
		"unlocks": unlocks.duplicate(),
		"offers": offers.duplicate(true),
		"locked": locked,
		"shop_rng": Array(shop_rng.get_state()),
		"status": status,
		"history": history.duplicate(true),
		"free_digs": free_digs,
		"dungeon": dungeon.to_dict(),
	}


## Reconstrói a partir de to_dict() (aceita o dicionário vindo de JSON).
static func from_dict(p_db: Db, raw: Dictionary) -> RunState:
	var d: Dictionary = Db.to_ints(raw)
	assert(d.version == SAVE_VERSION, "versão de save desconhecida")
	var r := RunState.new()
	r._init_common(p_db, d.seed, d.power_id, d.pact_id, d.unlocks)
	r.gold = d.gold
	r.heart_hp = d.heart_hp
	r.wave = d.wave
	r.bench = d.bench
	r.offers = d.offers
	r.locked = d.locked
	r.shop_rng = Rng.new()
	r.shop_rng.set_state(PackedInt64Array(d.shop_rng))
	r.status = d.status
	r.history = d.history
	r.free_digs = d.free_digs
	r.dungeon.load_dict(d.dungeon)
	return r
