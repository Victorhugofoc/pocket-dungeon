extends SceneTree
## Mede quanto tempo leva uma onda simulada (para dimensionar os bots).
##   godot --headless --path . --script res://tools/bench_sim.gd

const Scenarios := preload("res://game/debug/scenarios.gd")


func _init() -> void:
	var db := Db.load_from("res://data")
	for idx in [0, 2, 3]:
		var n := 50
		var ticks := 0
		var start := Time.get_ticks_usec()
		for i in n:
			var sc: Dictionary = Scenarios.build(db, idx)
			var sim := CombatSim.new(db, sc.dungeon, sc.party, i)
			sim.run()
			ticks += sim.result.ticks
		var us := Time.get_ticks_usec() - start
		print("cenário %d: %.2f ms por onda (%d ticks em média)" % [idx, us / 1000.0 / n, ticks / n])
	quit()
