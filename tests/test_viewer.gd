extends "res://tests/test_case.gd"
## Garante que o visualizador de debug compila e que todos os cenários montam
## a masmorra sem recusas e terminam a onda.

const DbScript := preload("res://core/db.gd")
const Scenarios := preload("res://game/debug/scenarios.gd")
const Sim := preload("res://core/combat/combat_sim.gd")


func test_all_game_scripts_compile() -> void:
	var dirs := ["res://game"]
	var count := 0
	while not dirs.is_empty():
		var dir: String = dirs.pop_back()
		for sub in DirAccess.get_directories_at(dir):
			dirs.append(dir.path_join(sub))
		for f in DirAccess.get_files_at(dir):
			if f.ends_with(".gd"):
				var script: GDScript = load(dir.path_join(f))
				assert_true(script != null and script.can_instantiate(), "não compila: " + dir.path_join(f))
				count += 1
	assert_true(count >= 6, "esperava pelo menos 6 scripts em game/, achei %d" % count)


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
