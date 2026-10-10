extends "res://tests/test_case.gd"
## Cada desafio do protótipo precisa ter solução (a de referência cumpre a
## meta) e ser um desafio de verdade (a masmorra vazia não cumpre).

const DbScript := preload("res://core/db.gd")
const DungeonScript := preload("res://core/dungeon.gd")
const Sim := preload("res://core/combat/combat_sim.gd")
const Challenges := preload("res://game/proto/challenges.gd")

var _db: Object = DbScript.load_from("res://data")


func _damage(ch: Dictionary, d: Object) -> int:
	var sim: Object = Sim.new(_db, d, ch.party, 1, {"power": ch.power})
	sim.run()
	return sim.result.heart_damage


func test_every_challenge_has_valid_data() -> void:
	for ch in Challenges.load_all():
		for p in Challenges.pieces(ch):
			var source: Dictionary = {"room": _db.rooms, "monster": _db.monsters, "trap": _db.traps}[p.kind]
			assert_true(source.has(p.id), "%s: peça desconhecida %s" % [ch.id, p.id])
		assert_true(_db.powers.has(ch.power), ch.id)
		assert_true(ch.get("dig_solution", []).size() <= ch.digs, "%s: solução escava mais que o permitido" % ch.id)


func test_reference_solutions_meet_goal() -> void:
	for ch in Challenges.load_all():
		var d: Object = DungeonScript.new(_db)
		var err: String = Challenges.build_solution(_db, ch, d)
		assert_eq(err, "", ch.id)
		assert_true(_damage(ch, d) <= ch.goal, "%s: a solução não cumpre a meta" % ch.id)


func test_empty_dungeon_fails_every_challenge() -> void:
	for ch in Challenges.load_all():
		assert_true(_damage(ch, DungeonScript.new(_db)) > ch.goal, "%s: fácil demais" % ch.id)
