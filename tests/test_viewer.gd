extends "res://tests/test_case.gd"
## Garante que o visualizador de debug compila e que todos os cenários montam
## a masmorra sem recusas e terminam a onda.

const DbScript := preload("res://core/db.gd")
const Scenarios := preload("res://game/debug/scenarios.gd")
const Sim := preload("res://core/combat/combat_sim.gd")


func test_viewer_script_compiles() -> void:
	var script: GDScript = load("res://game/debug/combat_viewer.gd")
	assert_true(script != null and script.can_instantiate())


func test_all_scenarios_build_and_finish() -> void:
	var db: Object = DbScript.load_from("res://data")
	for i in Scenarios.names().size():
		var sc: Dictionary = Scenarios.build(db, i)
		var monsters := 0
		for slot in sc.dungeon.contents:
			monsters += sc.dungeon.contents[slot].monsters.size()
		assert_true(monsters >= 4, "cenário %d com poucos monstros (posicionamento recusado?)" % i)
		var sim: Object = Sim.new(db, sc.dungeon, sc.party, 1000 + i, {"power": sc.power})
		sim.run()
		assert_true(sim.finished, "cenário %d" % i)
