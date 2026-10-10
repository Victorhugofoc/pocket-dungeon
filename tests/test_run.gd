extends "res://tests/test_case.gd"

const DbScript := preload("res://core/db.gd")
const RunScript := preload("res://core/run/run_state.gd")
const Pieces := preload("res://core/run/pieces.gd")
const WaveGen := preload("res://core/run/wave_generator.gd")

var _db: Object = DbScript.load_from("res://data")


func _run(seed: int = 7, opts: Dictionary = {}) -> Object:
	return RunScript.start(_db, seed, opts)


## Coloca uma peça direto na bancada, sem passar pela loja.
func _give(run: Object, kind: String, id: String, level: int = 1, variant: String = "") -> int:
	var b: int = run.free_bench_slot()
	var p := Pieces.make(kind, id, level, Pieces.price(_db, kind, level))
	p.variant = variant
	run.bench[b] = p
	return b


func _fortress(run: Object) -> void:
	var d: Object = run.dungeon
	for slot in ["a1", "b1", "d1"]:
		d.contents[slot].room = Pieces.make("room", "camara", 3)
		for i in 3:
			d.contents[slot].monsters.append(Pieces.make("monster", "golem", 4))
	d.contents.coracao.monsters.append(Pieces.make("monster", "golem", 4))


# --- Início e calendário ----------------------------------------------------------

func test_start_state() -> void:
	var run := _run()
	assert_eq(run.gold, 10)
	assert_eq(run.heart_hp, 20)
	assert_eq(run.bench.size(), 6)
	assert_eq(run.free_bench_slot(), 0)
	assert_eq(run.offers.size(), 4)
	assert_eq(run.wave, 1)
	assert_eq(run.status, "playing")
	for o in run.offers:
		assert_eq(o.price, Pieces.price(_db, o.kind, o.level))


func test_pact_changes_start() -> void:
	var run := _run(7, {"pact": "ganancia"})
	assert_eq(run.gold, 15)
	assert_eq(run.heart_hp, 17)
	var nest := _run(7, {"pact": "ninhada"})
	assert_eq(nest.bench.size(), 7)
	assert_eq(nest.offers.size(), 3)


func test_schedule_shape() -> void:
	for seed in 20:
		var s: Dictionary = WaveGen.schedule(_db, seed)
		assert_eq(s.themes.size(), 8)
		assert_eq(s.themes[7], "chefe")
		assert_eq(s.parties[7][0], {"boss": s.boss})
		for w in range(1, 7):
			assert_ne(s.themes[w], s.themes[w - 1], "tema repetido em seguida (semente %d)" % seed)
		for w in 7:
			assert_true(s.parties[w].size() >= 1, "onda %d vazia" % (w + 1))
			assert_true(s.parties[w].size() <= _db.balance.max_party_size)
		for inv in s.parties[3]:
			assert_eq(inv.modifiers.size(), 1, "onda de elite: todos com modificador")


func test_schedule_is_deterministic_and_varies() -> void:
	assert_eq(WaveGen.schedule(_db, 5), WaveGen.schedule(_db, 5))
	var bosses := {}
	for seed in 40:
		bosses[WaveGen.schedule(_db, seed).boss] = true
	assert_true(bosses.size() >= 4, "chefes deveriam variar: %s" % [bosses.keys()])


func test_waves_grow() -> void:
	var s: Dictionary = WaveGen.schedule(_db, 3)
	var cost := func(party: Array) -> int:
		var c := 0
		for inv in party:
			c += _db.adventurers[inv.id].gen_cost
		return c
	assert_true(cost.call(s.parties[6]) > cost.call(s.parties[0]))


func test_boss_revealed_from_wave_5() -> void:
	var run := _run()
	assert_eq(run.revealed_boss(), "")
	run.wave = 5
	assert_eq(run.revealed_boss(), run.schedule.boss)


# --- Loja ---------------------------------------------------------------------------

func test_buy_moves_offer_to_bench() -> void:
	var run := _run()
	var price: int = run.offers[0].price
	assert_eq(run.buy(0), "")
	assert_eq(run.gold, 10 - price)
	assert_eq(run.bench[0].paid, price)
	assert_eq(run.offers[0], null)
	assert_ne(run.buy(0), "", "oferta já comprada")


func test_buy_needs_gold_and_space() -> void:
	var run := _run()
	run.gold = 0
	assert_eq(run.buy(1), "ouro insuficiente")
	run.gold = 100
	for i in 6:
		_give(run, "monster", "slime")
	assert_eq(run.buy(1), "bancada cheia")


func test_reroll_costs_and_keeps_locked() -> void:
	var run := _run()
	var kept: Dictionary = run.offers[2]
	assert_eq(run.toggle_lock(2), "")
	assert_eq(run.reroll(), "")
	assert_eq(run.gold, 9)
	assert_eq(run.offers[0], kept)
	assert_eq(run.locked, 0)


func test_sell_refunds_half() -> void:
	var run := _run()
	var b := _give(run, "monster", "golem", 2)
	assert_eq(run.sell(b), "")
	assert_eq(run.gold, 10 + 3)
	assert_eq(run.bench[b], null)


# --- Masmorra e merge -------------------------------------------------------------

func test_place_and_pick_up() -> void:
	var run := _run()
	var r := _give(run, "room", "camara")
	assert_eq(run.place(r, "a1"), "")
	var m := _give(run, "monster", "slime")
	assert_eq(run.place(m, "a1"), "")
	assert_eq(run.pick_up("a1", "room"), "esvazie a sala antes")
	assert_eq(run.pick_up("a1", "monster", 0), "")
	assert_eq(run.pick_up("a1", "room"), "")
	assert_eq(run.bench.filter(func(p): return p != null).size(), 2)


func test_place_errors_keep_piece_on_bench() -> void:
	var run := _run()
	var m := _give(run, "monster", "slime")
	assert_ne(run.place(m, "a1"), "", "sem sala")
	assert_ne(run.bench[m], null)


func test_merge_bench_and_variant_choice() -> void:
	var run := _run()
	var a := _give(run, "monster", "slime")
	var b := _give(run, "monster", "slime")
	assert_eq(run.merge_bench(a, b), "")
	assert_eq(run.bench[a].level, 2)
	assert_eq(run.bench[a].paid, 6)
	var c := _give(run, "monster", "slime", 2)
	assert_eq(run.merge_bench(a, c), "escolha a variante (a ou b)")
	assert_eq(run.merge_bench(a, c, "a"), "")
	assert_eq(run.bench[a].level, 3)
	assert_eq(run.bench[a].variant, "a")
	var d := _give(run, "monster", "slime", 3, "b")
	assert_ne(run.merge_bench(a, d), "", "variantes diferentes não se fundem")


func test_merge_rejects_different_or_max() -> void:
	var run := _run()
	var a := _give(run, "monster", "slime")
	var b := _give(run, "monster", "goblin")
	assert_ne(run.merge_bench(a, b), "")
	var r1 := _give(run, "room", "camara", 3)
	var r2 := _give(run, "room", "camara", 3)
	assert_eq(run.merge_bench(r1, r2), "já está no nível máximo")


func test_merge_onto_placed_piece() -> void:
	var run := _run()
	run.place(_give(run, "room", "camara"), "a1")
	run.place(_give(run, "monster", "goblin"), "a1")
	assert_eq(run.merge_onto(_give(run, "monster", "goblin"), "a1", "monster", 0), "")
	assert_eq(run.dungeon.contents.a1.monsters[0].level, 2)
	assert_eq(run.merge_onto(_give(run, "room", "camara"), "a1", "room"), "")
	assert_eq(run.dungeon.contents.a1.room.level, 2)


func test_dig_costs_gold_and_free_dig_pact() -> void:
	var run := _run()
	assert_eq(run.dig("c1"), "")
	assert_eq(run.gold, 7)
	var digger := _run(7, {"pact": "escavadores"})
	assert_eq(digger.dig_price(), 0)
	assert_eq(digger.dig("c1"), "")
	assert_eq(digger.gold, 10)
	assert_eq(digger.dig_price(), 5)


# --- Ondas -------------------------------------------------------------------------

func test_play_wave_applies_result_and_income() -> void:
	var run := _run()
	var gold_before: int = run.gold
	var res: Dictionary = run.play_wave()
	assert_eq(run.wave, 2)
	assert_eq(run.history.size(), 1)
	assert_true(res.heart_damage > 0, "masmorra vazia: alguém chega ao Coração")
	assert_eq(run.heart_hp, 20 - res.heart_damage)
	assert_eq(res.income.interest, gold_before / 5)
	assert_eq(run.gold, gold_before + res.income_total)
	assert_true(res.report.tips.size() >= 1)
	assert_eq(run.offers.size(), 4)


func test_empty_dungeon_loses_run() -> void:
	var run := _run(11, {"pact": "ganancia"})
	while run.status == "playing":
		run.play_wave()
	assert_eq(run.status, "lost")
	assert_eq(run.souls(), 2 * (run.history.size() - 1))


func test_fortress_survives_early_waves() -> void:
	var run := _run(3)
	_fortress(run)
	for i in 3:
		var res: Dictionary = run.play_wave()
		assert_eq(res.heart_damage, 0, "onda %d" % res.wave)
		assert_true(res.report.tips[0].begins_with("Defesa perfeita"), str(res.report.tips))


func test_souls_on_win() -> void:
	var run := _run()
	run.status = "won"
	run.history.resize(8)
	assert_eq(run.souls(), 2 * 8 + 5)


func test_same_seed_same_run() -> void:
	var a := _run(21)
	var b := _run(21)
	for i in 3:
		a.buy(i)
		b.buy(i)
		a.play_wave()
		b.play_wave()
	assert_eq(JSON.stringify(a.to_dict()), JSON.stringify(b.to_dict()))


func test_save_roundtrip_continues_identically() -> void:
	var run := _run(33)
	run.buy(0)
	run.play_wave()
	run.play_wave()
	var json := JSON.stringify(run.to_dict())
	var loaded: Object = RunScript.from_dict(_db, JSON.parse_string(json))
	assert_eq(JSON.stringify(loaded.to_dict()), json)
	for r in [run, loaded]:
		r.buy(1)
		r.reroll()
		r.play_wave()
	assert_eq(JSON.stringify(loaded.to_dict()), JSON.stringify(run.to_dict()))
