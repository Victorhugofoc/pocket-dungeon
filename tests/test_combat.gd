extends "res://tests/test_case.gd"

const DbScript := preload("res://core/db.gd")
const DungeonScript := preload("res://core/dungeon.gd")
const Sim := preload("res://core/combat/combat_sim.gd")

var _db: Object = DbScript.load_from("res://data")


# --- Montagem ------------------------------------------------------------------

func _d() -> Object:
	return DungeonScript.new(_db)


## monsters: ["slime", ["golem", 4], ["slime", 3, "a"]]; traps: ["espinhos"]
func _place(d: Object, slot: String, room: String, monsters: Array = [], traps: Array = [], level: int = 1) -> void:
	if d.slot_state[slot] != "room":
		assert_eq(d.dig(slot), "", "escavar " + slot)
	if slot != "coracao":
		assert_eq(d.place_room(slot, {"kind": "room", "id": room, "level": level}), "", "sala em " + slot)
	for m in monsters:
		var spec: Array = m if m is Array else [m]
		var piece := {"kind": "monster", "id": spec[0], "level": spec[1] if spec.size() > 1 else 1,
				"variant": spec[2] if spec.size() > 2 else ""}
		assert_eq(d.place_monster(slot, piece), "", "monstro em " + slot)
	for t in traps:
		assert_eq(d.place_trap(slot, {"kind": "trap", "id": t, "level": 1}), "", "armadilha em " + slot)


func _inv(id: String, mods: Array = []) -> Dictionary:
	return {"id": id, "modifiers": mods}


func _run(d: Object, party: Array, seed: int = 1, opts: Dictionary = {}, db: Object = _db) -> Object:
	var sim: Object = Sim.new(db, d, party, seed, opts)
	sim.run()
	return sim


func _events(sim: Object, type: String) -> Array:
	return sim.events.filter(func(e): return e.type == type)


func _uid_of(sim: Object, id: String, nth: int = 0) -> int:
	var found: Array = sim.units.filter(func(u): return u.id == id)
	return found[nth].uid


# --- Básico ----------------------------------------------------------------------

func test_empty_dungeon_invader_hits_heart() -> void:
	var sim := _run(_d(), [_inv("guerreiro")])
	assert_eq(sim.result.heart_damage, 2)
	assert_eq(sim.result.heart_hp, 18)
	assert_eq(sim.result.outcomes.values(), ["escaped"])
	assert_eq(_events(sim, "heart_hit").size(), 1)


func test_heart_hp_comes_from_opts() -> void:
	var sim := _run(_d(), [_inv("mago")], 1, {"heart_hp": 2})
	assert_eq(sim.result.heart_hp, 0)


func test_strong_room_kills_invader_and_pays_gold() -> void:
	var d := _d()
	_place(d, "a1", "camara", [["golem", 4], "slime"])
	var sim := _run(d, [_inv("guerreiro")])
	assert_eq(sim.result.heart_damage, 0)
	assert_eq(sim.result.kills, 1)
	assert_eq(sim.result.kill_gold, 1)
	assert_eq(sim.result.outcomes.values(), ["dead"])


func test_elite_kill_pays_more_and_loot_carrier_adds() -> void:
	var d := _d()
	_place(d, "a1", "camara", [["golem", 4], ["golem", 4]])
	var sim := _run(d, [_inv("ladino", ["abastado"])])
	assert_eq(sim.result.elite_kills, 1)
	assert_eq(sim.result.kill_gold, 2 + 3)


func test_guardian_defends_heart() -> void:
	var d := _d()
	_place(d, "coracao", "", [["golem", 4]])
	var sim := _run(d, [_inv("ladino")])
	assert_eq(sim.result.heart_damage, 0)
	assert_eq(sim.result.kills, 1)


func test_timeout_makes_invaders_flee_without_heart_damage() -> void:
	var db: Object = DbScript.load_from("res://data")
	db.balance.wave_time_limit_ticks = 30
	var sim := _run(DungeonScript.new(db), [_inv("guerreiro")], 1, {}, db)
	assert_eq(sim.result.outcomes.values(), ["fled"])
	assert_eq(sim.result.heart_damage, 0)
	assert_eq(sim.result.ticks, 30)


# --- Dano --------------------------------------------------------------------------

func _first_damage(sim: Object, target_uid: int, source: String = "attack") -> Dictionary:
	for e in sim.events:
		if e.type == "damage" and e.u == target_uid and e.source == source:
			return e
	return {}


func test_armor_reduces_physical_damage() -> void:
	var d := _d()
	_place(d, "a1", "covil", ["goblin"])
	var sim := _run(d, [_inv("guerreiro")])
	# Goblin no Covil: 9 de ATQ +40% = 13; armadura 3 do Guerreiro -> 10.
	assert_eq(_first_damage(sim, _uid_of(sim, "guerreiro")).amount, 10)


func test_slime_reduces_physical_damage() -> void:
	var d := _d()
	_place(d, "a1", "camara", ["slime"])
	var sim := _run(d, [_inv("guerreiro")])
	# 8 de ATQ, -25% do Slime = 6.
	assert_eq(_first_damage(sim, _uid_of(sim, "slime")).amount, 6)


func test_family_synergy_shield_absorbs() -> void:
	var d := _d()
	_place(d, "a1", "camara", ["slime", "golem"])
	var sim := _run(d, [_inv("mago")])
	var slime: Object = sim.units.filter(func(u): return u.id == "slime")[0]
	var hit := _first_damage(sim, slime.uid)
	assert_true(hit.get("absorbed", 0) > 0, "escudo de Gosma deveria absorver: %s" % hit)


func test_poison_damage_is_credited_to_spider() -> void:
	var d := _d()
	_place(d, "a1", "camara", ["aranha", ["golem", 3]])
	var sim := _run(d, [_inv("guerreiro")])
	var spider := _uid_of(sim, "aranha")
	var poison := _first_damage(sim, _uid_of(sim, "guerreiro"), "poison")
	assert_eq(poison.get("src", -1), spider)


# --- Armadilhas e tesouro -----------------------------------------------------------

func test_spikes_hit_only_first_invader() -> void:
	var d := _d()
	_place(d, "a1", "camara", [], ["espinhos"])
	var sim := _run(d, [_inv("guerreiro"), _inv("guerreiro")])
	var hits := _events(sim, "damage").filter(func(e): return e.source == "espinhos")
	assert_eq(hits.size(), 1)
	assert_eq(hits[0].u, _uid_of(sim, "guerreiro", 0))
	assert_eq(hits[0].amount, 17, "20 físico - 3 de armadura")


func test_rogue_disarms_first_trap_only() -> void:
	var d := _d()
	_place(d, "a1", "galeria", [], ["espinhos", "rede"])
	var sim := _run(d, [_inv("ladino")])
	assert_eq(_events(sim, "disarm").size(), 1)
	assert_eq(_events(sim, "disarm")[0].trap, "espinhos")
	assert_eq(_events(sim, "trap").size(), 1)
	assert_eq(_events(sim, "trap")[0].trap, "rede")


func test_rogue_loots_empty_treasure_and_leaves() -> void:
	var d := _d()
	_place(d, "b1", "tesouro")
	var sim := _run(d, [_inv("ladino")])
	assert_eq(sim.result.outcomes.values(), ["looted"])
	assert_eq(sim.result.treasure_gold, 0)
	assert_eq(sim.result.heart_damage, 0)


func test_warrior_ignores_treasure() -> void:
	var d := _d()
	_place(d, "b1", "tesouro")
	var sim := _run(d, [_inv("guerreiro")])
	assert_eq(sim.result.treasure_gold, 3)
	assert_eq(sim.result.heart_damage, 2)


func test_treasure_as_decoy_on_other_branch() -> void:
	# Ladino vai pelo ramo C atrás do tesouro; o Guerreiro vai pelo B.
	var d := _d()
	_place(d, "c1", "tesouro")
	_place(d, "b1", "camara", ["slime"])
	var sim := _run(d, [_inv("guerreiro"), _inv("ladino")])
	var rogue := _uid_of(sim, "ladino")
	assert_eq(sim.result.outcomes[rogue], "looted")
	var spawn: Dictionary = _events(sim, "spawn").filter(func(e): return e.u == rogue)[0]
	assert_true("c1" in spawn.path)


func test_brasa_fire_zone_hits_group() -> void:
	var d := _d()
	_place(d, "a1", "camara", [["golem", 3]], ["brasa"])
	var sim := _run(d, [_inv("guerreiro"), _inv("arqueira"), _inv("mago")])
	var burned := {}
	for e in _events(sim, "damage"):
		if e.source == "fire_zone":
			burned[e.u] = true
	assert_true(burned.size() >= 2, "a Brasa deveria atingir mais de um invasor: %s" % [burned])


# --- Corredor e rota -----------------------------------------------------------------

func test_single_file_only_front_invader_fights() -> void:
	var d := _d()
	_place(d, "a1", "corredor", [["golem", 4]])
	var sim := _run(d, [_inv("guerreiro"), _inv("guerreiro")])
	var first := _uid_of(sim, "guerreiro", 0)
	var second := _uid_of(sim, "guerreiro", 1)
	var first_death := -1
	for e in sim.events:
		if e.type == "death" and e.u == first:
			first_death = e.t
	for e in _events(sim, "damage"):
		if e.get("src", 0) == second or e.u == second:
			assert_true(e.t >= first_death, "o segundo só luta depois que o primeiro cai (t=%d)" % e.t)


func test_close_door_reroutes_invader() -> void:
	var d := _d()
	_place(d, "c1", "camara")
	var opts := {"power": "fechar_porta", "commands": [{"t": 45, "target": "b1"}]}
	var sim := _run(d, [_inv("guerreiro")], 1, opts)
	assert_eq(_events(sim, "power").size(), 1)
	var entered := _events(sim, "enter").map(func(e): return e.slot)
	assert_true("c1" in entered, "deveria desviar para o ramo C: %s" % [entered])
	assert_false("b1" in entered)


func test_power_fails_without_mana() -> void:
	var opts := {"power": "desabamento", "commands": [{"t": 5, "target": "a1"}]}
	var sim := _run(_d(), [_inv("guerreiro")], 1, opts)
	assert_eq(_events(sim, "power_failed").size(), 1)


# --- Chefes e traits especiais -------------------------------------------------------

func test_boss_party_expansion() -> void:
	assert_eq(Sim.boss_party(_db, "varok").size(), 1)
	var z: Array = Sim.boss_party(_db, "zephyr")
	assert_eq(z.size(), 7)
	assert_eq(z[1].hp_bp, 6000)


func test_kaelen_blinks_past_a_room() -> void:
	var d := _d()
	_place(d, "a1", "camara", [["golem", 4], ["golem", 4]])
	var sim := _run(d, [{"boss": "kaelen"}])
	assert_true(_events(sim, "blink").size() >= 1)


func test_aurelius_shield_blocks_trap() -> void:
	var d := _d()
	_place(d, "a1", "camara", [], ["espinhos"])
	var sim := _run(d, [{"boss": "aurelius"}])
	assert_eq(_events(sim, "effect_blocked").size(), 1)
	assert_eq(_events(sim, "trap").size(), 0)


func test_ignis_is_immune_to_fire() -> void:
	var d := _d()
	_place(d, "a1", "camara", [["golem", 2]], ["brasa"])
	var sim := _run(d, [{"boss": "ignis"}])
	var ignis := _uid_of(sim, "ignis")
	for e in _events(sim, "damage"):
		if e.u == ignis and e.dtype == "fire":
			assert_eq(e.amount, 0)


func test_rei_slime_splits_on_death() -> void:
	var d := _d()
	_place(d, "a1", "camara", [["slime", 3, "a"]])
	var sim := _run(d, [{"boss": "varok"}])
	var summons := _events(sim, "summon").filter(func(e): return e.id == "blob")
	assert_eq(summons.size(), 2)


func test_skeleton_revives_once() -> void:
	var d := _d()
	_place(d, "a1", "camara", ["esqueleto"])
	var sim := _run(d, [{"boss": "varok"}])
	assert_eq(_events(sim, "revive").size(), 1)


# --- Determinismo -----------------------------------------------------------------------

func _busy_dungeon() -> Object:
	var d := _d()
	_place(d, "a1", "camara", ["slime", "morcego"], ["rede"])
	_place(d, "b1", "covil", [["goblin", 2]])
	_place(d, "c2", "galeria", [["aranha", 3, "a"]], ["espinhos", "brasa"])
	_place(d, "d1", "corredor", [["golem", 2]], ["alarme"])
	_place(d, "coracao", "", [["bruxo", 3, "b"]])
	return d


func test_same_input_same_events() -> void:
	var party: Array = [_inv("guerreiro", ["blindado"]), _inv("arqueira"), _inv("mago"), _inv("ladino", ["apressado"])]
	party.append_array(Sim.boss_party(_db, "zephyr"))
	var opts := {"power": "desabamento", "commands": [{"t": 80, "target": "a1"}]}
	var h1: String = _run(_busy_dungeon(), party, 42, opts).events_hash()
	var h2: String = _run(_busy_dungeon(), party, 42, opts).events_hash()
	assert_eq(h1, h2)


func test_many_seeds_deterministic_and_terminate() -> void:
	var bosses := ["frostine", "kaelen", "aurelius", "ignis", "zephyr", "varok"]
	for seed in 30:
		var party := Sim.boss_party(_db, bosses[seed % bosses.size()])
		var a := _run(_busy_dungeon(), party, seed)
		var b := _run(_busy_dungeon(), party, seed)
		assert_eq(a.events_hash(), b.events_hash(), "semente %d" % seed)
		assert_true(a.finished)
		assert_true(a.result.ticks <= _db.balance.wave_time_limit_ticks)


func test_crit_seed_changes_outcome_detail() -> void:
	var hashes := {}
	for seed in 5:
		hashes[_run(_busy_dungeon(), [{"boss": "kaelen"}], seed).events_hash()] = true
	assert_true(hashes.size() > 1, "críticos de Kaelen deveriam variar com a semente")
