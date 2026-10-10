extends SceneTree
## Roda runs completas com um bot e grava um CSV (uma linha por run).
##   godot --headless --path . --script res://tools/sim_runner.gd -- --bot counter --runs 50 --seed 1000 --out reports/x.csv
## Bots: random, generic, counter. Use tools/run_bots.ps1 para rodar em paralelo.

const RandomBot := preload("res://tools/bots/random_bot.gd")
const SearchBot := preload("res://tools/bots/search_bot.gd")

const HEADER := "bot,seed,status,waves_survived,heart_hp,souls,boss,loss_wave,themes,heart_damage,monsters,rooms,traps,digs,gold_end,ms"


func _init() -> void:
	var opts := {"bot": "random", "runs": 10, "seed": 1, "out": ""}
	var args := OS.get_cmdline_user_args()
	for i in range(0, args.size() - 1, 2):
		opts[args[i].trim_prefix("--")] = args[i + 1]
	var db := Db.load_from("res://data")
	if not db.errors.is_empty():
		printerr("dados inválidos: ", db.errors)
		quit(1)
		return
	var lines: Array[String] = [HEADER]
	var runs := int(opts.runs)
	var seed0 := int(opts.seed)
	var wins := 0
	for i in runs:
		var seed := seed0 + i
		var start := Time.get_ticks_msec()
		var bot: Object = _make_bot(String(opts.bot), db, seed)
		var run := RunState.start(db, seed, bot.setup())
		while run.status == "playing":
			bot.prep(run)
			run.play_wave(bot.commands(run))
		if run.status == "won":
			wins += 1
		lines.append(_row(String(opts.bot), seed, run, Time.get_ticks_msec() - start))
		if (i + 1) % 5 == 0 or i + 1 == runs:
			print("%s: %d/%d runs, %d vitórias" % [opts.bot, i + 1, runs, wins])
	if String(opts.out) != "":
		var f := FileAccess.open(String(opts.out), FileAccess.WRITE)
		f.store_string("\n".join(lines) + "\n")
		f.close()
	else:
		print("\n".join(lines))
	quit()


func _make_bot(kind: String, db: Db, seed: int) -> Object:
	match kind:
		"generic":
			return SearchBot.new(db, seed, false)
		"counter":
			return SearchBot.new(db, seed, true)
	return RandomBot.new(db, seed)


func _row(bot: String, seed: int, run: RunState, ms: int) -> String:
	var survived := run.history.size() - (1 if run.status == "lost" else 0)
	var damage := run.history.map(func(h): return str(h.heart_damage))
	var monsters := []
	var rooms := []
	var traps := []
	for slot in run.dungeon.contents:
		var c: Dictionary = run.dungeon.contents[slot]
		if c.room != null:
			rooms.append("%s:%d" % [c.room.id, c.room.level])
		for m in c.monsters:
			monsters.append("%s:%d%s" % [m.id, m.level, m.get("variant", "")])
		for t in c.traps:
			traps.append("%s:%d" % [t.id, t.level])
	var loss_wave: int = run.wave if run.status == "lost" else 0
	return ",".join([bot, seed, run.status, survived, run.heart_hp, run.souls(), run.schedule.boss, loss_wave,
			";".join(run.schedule.themes), ";".join(damage), ";".join(monsters), ";".join(rooms),
			";".join(traps), run.dungeon.digs_done, run.gold, ms].map(func(x): return str(x)))
