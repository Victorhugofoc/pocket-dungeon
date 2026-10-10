extends SceneTree
## Mostra o calendário de ondas de uma semente e o que uma masmorra vazia sofre.
##   godot --headless --path . --script res://tools/print_schedule.gd -- <semente>

const WaveGen := preload("res://core/run/wave_generator.gd")


func _init() -> void:
	var args := OS.get_cmdline_user_args()
	var seed := int(args[0]) if args.size() > 0 else 1
	var db := Db.load_from("res://data")
	var s: Dictionary = WaveGen.schedule(db, seed)
	print("Semente %d — chefe: %s" % [seed, s.boss])
	for w in s.parties.size():
		var names := []
		var threat := 0
		for inv in s.parties[w]:
			if inv.has("boss"):
				names.append(inv.boss.to_upper())
				threat += db.bosses[inv.boss].threat
			else:
				var mods := "" if inv.modifiers.is_empty() else "(" + ",".join(inv.modifiers) + ")"
				names.append(inv.id + mods)
				threat += db.adventurers[inv.id].threat
		print("  onda %d [%s] ameaça total %d: %s" % [w + 1, s.themes[w], threat, ", ".join(names)])
	var run := RunState.start(db, seed)
	var line := []
	while run.status == "playing":
		var r: Dictionary = run.play_wave()
		line.append("o%d:-%d (ouro +%d)" % [r.wave, r.heart_damage, r.income_total])
	print("  masmorra vazia: %s -> %s com %d PV" % [" ".join(line), run.status, run.heart_hp])
	quit()
