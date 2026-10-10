extends "res://tools/bots/bot_base.gd"
## Bot de busca: testa cada compra e posição simulando a onda e fica com a
## melhor. Dois modos com o MESMO algoritmo, mudando só a informação usada:
##
##   generic (informed = false): avalia contra grupos padrão (tema "misto").
##   counter (informed = true):  avalia contra o grupo real da próxima onda,
##       um grupo do tema da onda seguinte e o Herói-Chefe quando revelado.
##       É exatamente o que o jogador vê na tela de reconhecimento.
##
## Se o counter vence o generic, ler a onda importa (gate da Fase 1).

const WaveGen := preload("res://core/run/wave_generator.gd")

const MAX_STEPS := 10
const MAX_REROLLS := 2
const MAX_SLOT_OPTIONS := 4

var informed: bool = false
var _ref_cache: Dictionary = {}


func _init(p_db: Db, seed: int, p_informed: bool) -> void:
	super(p_db, seed)
	informed = p_informed
	name = "counter" if informed else "generic"


func prep(run: RunState) -> void:
	var parties := _eval_parties(run)
	var choose := func(p: Dictionary) -> String: return _best_variant(run, p, parties)
	auto_merge(run, choose)
	var rerolls := 0
	for step in MAX_STEPS:
		_place_bench(run, parties)
		var base := _eval(run.dungeon, parties)
		var best: Dictionary = {}
		var best_score: int = base.score
		for cand in _candidates(run):
			var d: Variant = _apply_to_copy(run, cand)
			if d == null:
				continue
			var s: int = _eval(d, parties).score
			if s > best_score:
				best_score = s
				best = cand
		if not best.is_empty():
			_apply(run, best, choose)
			auto_merge(run, choose)
			continue
		if base.perfect:
			break
		if rerolls < MAX_REROLLS and run.gold >= db.balance.reroll_cost + 3:
			run.reroll()
			rerolls += 1
			continue
		break
	_place_bench(run, parties)


# --- Avaliação ----------------------------------------------------------------------

func _eval_parties(run: RunState) -> Array:
	var w := run.wave
	var out := []
	if informed:
		out.append({"party": run.next_party(), "w": 10, "primary": true})
		var after := run.theme_after()
		if after != "" and after != WaveGen.BOSS_THEME:
			out.append({"party": _ref(after, w + 1), "w": 3, "primary": false})
		var boss := run.revealed_boss()
		if boss != "" and w < db.balance.boss_wave:
			out.append({"party": CombatSim.boss_party(db, boss), "w": 3, "primary": false})
	else:
		out.append({"party": _ref("misto", w), "w": 10, "primary": true})
		if w < db.balance.waves_per_run:
			out.append({"party": _ref("misto", w + 1), "w": 3, "primary": false})
	return out


## Grupo de referência de um tema numa onda (fixo, independente da semente da run).
func _ref(theme: String, wave: int) -> Array:
	var key := "%s_%d" % [theme, wave]
	if not _ref_cache.has(key):
		_ref_cache[key] = WaveGen._party(db, Rng.new(7777 + wave, "ref_" + theme), theme, wave)
	return _ref_cache[key]


## {"score", "perfect"}: perfect = nenhum invasor do grupo principal sobreviveu.
func _eval(dungeon: Dungeon, parties: Array) -> Dictionary:
	var score := 0
	var perfect := true
	for pe in parties:
		var sim := CombatSim.new(db, dungeon, pe.party, 1, {"power": POWER, "commands": commands_for(dungeon)})
		sim.run()
		var s: int = -1000 * sim.result.heart_damage + 10 * (sim.result.kill_gold + sim.result.treasure_gold)
		for u in sim.units:
			if u.side == "invader" and not u.summoned and u.state != "dead":
				s -= u.hp + 50
				if pe.primary:
					perfect = false
			elif u.side == "monster" and u.is_alive():
				# Margem de defesa: vencer com folga vale mais que vencer no limite.
				s += u.hp / 10
		score += s * pe.w
	return {"score": score, "perfect": perfect}


# --- Candidatos ------------------------------------------------------------------------

func _candidates(run: RunState) -> Array:
	var out := []
	var dig_price := run.dig_price()
	for i in run.offers.size():
		var o: Variant = run.offers[i]
		if o == null or o.price > run.gold:
			continue
		var p := Pieces.make(o.kind, o.id, o.level, o.price)
		var target := find_in_dungeon(run.dungeon, p)
		if not target.is_empty() and p.level < Pieces.max_level(db, p.kind):
			out.append({"offer": i, "merge": target, "piece": p})
			continue
		var has_twin := run.bench.any(func(x): return Pieces.same(x, p))
		if run.free_bench_slot() < 0 and not has_twin:
			continue
		var eval_piece := p
		if has_twin and p.level < Pieces.max_level(db, p.kind):
			eval_piece = Pieces.merged(db, p, p, "a")
		var slots := valid_slots(run.dungeon, eval_piece)
		for s in slots.slice(0, MAX_SLOT_OPTIONS):
			out.append({"offer": i, "place": s, "piece": eval_piece})
		if slots.is_empty() and eval_piece.kind == "monster":
			for slot in PATH_ORDER:
				var idx := _weakest(run.dungeon, slot)
				if idx >= 0 and run.dungeon.contents[slot].monsters[idx].level <= eval_piece.level:
					out.append({"offer": i, "place": slot, "replace": idx, "piece": eval_piece})
		if slots.is_empty() and eval_piece.kind == "room" and dig_price >= 0 and o.price + dig_price <= run.gold:
			for s in diggable(run.dungeon):
				out.append({"offer": i, "dig": s, "place": s, "piece": eval_piece})
	out.append_array(_room_pairs(run))
	return out


## Sala + monstro para dentro dela, avaliados juntos: uma sala vazia sozinha
## não muda a onda, então a busca de um passo nunca compraria salas.
func _room_pairs(run: RunState) -> Array:
	var out := []
	var dig_price := run.dig_price()
	for i in run.offers.size():
		var o: Variant = run.offers[i]
		if o == null or o.kind != "room" or o.price > run.gold:
			continue
		var room := Pieces.make("room", o.id, o.level, o.price)
		var spots := []
		for s in valid_slots(run.dungeon, room).slice(0, 2):
			spots.append({"place": s, "extra": 0})
		if spots.is_empty() and dig_price >= 0:
			for s in diggable(run.dungeon).slice(0, 2):
				spots.append({"place": s, "dig": s, "extra": dig_price})
		for spot in spots:
			var budget: int = run.gold - o.price - spot.extra
			if budget < 0:
				continue
			for j in run.offers.size():
				var m: Variant = run.offers[j]
				if j != i and m != null and m.kind == "monster" and m.price <= budget:
					var cand := {"offer": i, "place": spot.place, "piece": room,
							"then_offer": j, "then_piece": Pieces.make("monster", m.id, m.level, m.price)}
					if spot.has("dig"):
						cand["dig"] = spot.dig
					out.append(cand)
			for b in run.bench.size():
				var bp: Variant = run.bench[b]
				if bp != null and bp.kind == "monster":
					var cand := {"offer": i, "place": spot.place, "piece": room, "then_bench": b, "then_piece": bp}
					if spot.has("dig"):
						cand["dig"] = spot.dig
					out.append(cand)
	return out


func _weakest(dungeon: Dungeon, slot: String) -> int:
	var list: Array = dungeon.contents[slot].monsters
	var best := -1
	for i in list.size():
		if best < 0 or list[i].level < list[best].level or (list[i].level == list[best].level and list[i].paid < list[best].paid):
			best = i
	return best


func _copy(dungeon: Dungeon) -> Dungeon:
	var d := Dungeon.new(db)
	d.load_dict(dungeon.to_dict())
	return d


func _apply_to_copy(run: RunState, cand: Dictionary) -> Variant:
	var d := _copy(run.dungeon)
	if cand.has("merge"):
		_merge_in_place(d, cand.merge, cand.piece, "a")
		return d
	if cand.has("dig") and d.dig(cand.dig) != "":
		return null
	if cand.has("replace"):
		d.remove_monster(cand.place, cand.replace)
	if _place_on(d, cand.piece, cand.place) != "":
		return null
	if cand.has("then_piece") and _place_on(d, cand.then_piece, cand.place) != "":
		return null
	return d


static func _place_on(d: Dungeon, p: Dictionary, slot: String) -> String:
	match p.kind:
		"room":
			return d.place_room(slot, p)
		"monster":
			return d.place_monster(slot, p)
	return d.place_trap(slot, p)


func _merge_in_place(d: Dungeon, target: Dictionary, p: Dictionary, variant: String) -> void:
	var c: Dictionary = d.contents[target.slot]
	match p.kind:
		"room":
			c.room = Pieces.merged(db, c.room, p, variant)
		"monster":
			c.monsters[target.index] = Pieces.merged(db, c.monsters[target.index], p, variant)
		"trap":
			c.traps[target.index] = Pieces.merged(db, c.traps[target.index], p, variant)


func _apply(run: RunState, cand: Dictionary, choose: Callable) -> void:
	if cand.has("replace"):
		var fb := run.free_bench_slot()
		if fb >= 0 and run.pick_up(cand.place, "monster", cand.replace) == "":
			run.sell(fb)
	var b := run.free_bench_slot()
	if run.buy(cand.offer) != "":
		return
	if cand.has("merge"):
		var p: Dictionary = run.bench[b]
		var variant: String = choose.call(p) if Pieces.needs_variant(db, p) else ""
		run.merge_onto(b, cand.merge.slot, p.kind, cand.merge.index, variant)
		return
	if cand.has("dig"):
		run.dig(cand.dig)
	auto_merge(run, choose)
	var best := -1
	for i in run.bench.size():
		var x: Variant = run.bench[i]
		if x != null and x.kind == cand.piece.kind and x.id == cand.piece.id and (best < 0 or x.level > run.bench[best].level):
			best = i
	if best >= 0:
		run.place(best, cand.place)
	if cand.has("then_offer"):
		var mb := run.free_bench_slot()
		if run.buy(cand.then_offer) == "":
			run.place(mb, cand.place)
	elif cand.has("then_bench"):
		run.place(cand.then_bench, cand.place)


## Posiciona as peças que sobraram na bancada no melhor lugar válido.
func _place_bench(run: RunState, parties: Array) -> void:
	for b in run.bench.size():
		var p: Variant = run.bench[b]
		if p == null:
			continue
		var slots := valid_slots(run.dungeon, p)
		if slots.is_empty():
			continue
		var best_slot: String = slots[0]
		if slots.size() > 1:
			var best_score := -9223372036854775807
			for s in slots.slice(0, MAX_SLOT_OPTIONS):
				var d := _copy(run.dungeon)
				_place_on(d, p, s)
				var sc: int = _eval(d, parties).score
				if sc > best_score:
					best_score = sc
					best_slot = s
		run.place(b, best_slot)


## Escolhe a variante (a/b) simulando as duas.
func _best_variant(run: RunState, p: Dictionary, parties: Array) -> String:
	if p.kind != "monster":
		return "a"
	var scores := {}
	for v in ["a", "b"]:
		var d := _copy(run.dungeon)
		var target := find_in_dungeon(d, p)
		if not target.is_empty():
			_merge_in_place(d, target, p, v)
		else:
			var merged := Pieces.merged(db, p, p, v)
			var slots := valid_slots(d, merged)
			if slots.is_empty():
				return "a"
			_place_on(d, merged, slots[0])
		scores[v] = _eval(d, parties).score
	return "b" if scores.b > scores.a else "a"
