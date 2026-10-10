extends SceneTree
## Confere cada desafio: a solução vence? a masmorra vazia perde?
##   godot --headless --path . --script res://tools/check_challenges.gd

const Challenges := preload("res://game/proto/challenges.gd")
const Bot := preload("res://tools/bots/bot_base.gd")


func _init() -> void:
	var db := Db.load_from("res://data")
	for ch in Challenges.load_all():
		var empty := _sim(db, ch, Dungeon.new(db), [])
		var d := Dungeon.new(db)
		var err := Challenges.build_solution(db, ch, d)
		if err != "":
			print("%-18s ERRO na solução: %s" % [ch.id, err])
			continue
		var no_power := _sim(db, ch, d, [])
		var keep: CombatSim = _last
		var with_power := _sim(db, ch, d, Bot.commands_for(d))
		_last = keep
		if no_power.heart_damage > ch.goal:
			for u in _last.units:
				if u.side == "invader":
					print("    %s: %s em %s (rota %s)" % [u.name, u.state, u.slot, ",".join(u.path)])
		print("%-18s vazia -%d | solução -%d (com poder -%d) | meta <= %d" % [
				ch.id, empty.heart_damage, no_power.heart_damage, with_power.heart_damage, ch.goal])
	quit()


var _last: CombatSim


func _sim(db: Db, ch: Dictionary, d: Dungeon, commands: Array) -> Dictionary:
	var sim := CombatSim.new(db, d, ch.party, 1, {"power": ch.power, "commands": commands})
	sim.run()
	_last = sim
	return sim.result
