extends RefCounted
## Relatório de fim de onda: o que aconteceu com cada invasor, quem causou
## mais dano e até duas dicas geradas por regras simples.
##
## Pilar 2.2: toda derrota precisa produzir uma conclusão útil.

const MAX_TIPS := 2


static func build(db: Db, sim: CombatSim) -> Dictionary:
	var invaders: Array = []
	var culprits: Array = []
	var monsters: Array = []
	var journeys := _journeys(sim)
	for u in sim.units:
		if u.side == "invader" and not u.summoned:
			var j: Dictionary = journeys.get(u.uid, {"steps": [], "killer": ""})
			invaders.append({"uid": u.uid, "id": u.id, "name": u.name, "outcome": u.state, "slot": u.slot,
					"elite": u.elite, "steps": j.steps, "killer": j.killer})
			if u.heart_damage > 0:
				culprits.append({"uid": u.uid, "name": u.name, "amount": u.heart_damage})
		elif u.side == "monster" and u.damage_dealt > 0:
			monsters.append({"uid": u.uid, "name": u.name, "damage": u.damage_dealt})
	monsters.sort_custom(func(a, b): return a.damage > b.damage or (a.damage == b.damage and a.uid < b.uid))
	culprits.sort_custom(func(a, b): return a.amount > b.amount or (a.amount == b.amount and a.uid < b.uid))
	return {
		"heart_damage": sim.result.heart_damage,
		"invaders": invaders,
		"top_monsters": monsters.slice(0, 3),
		"culprits": culprits,
		"tips": _tips(db, sim),
	}


## Caminho de cada invasor: [{"slot", "secs"}] (segundos parado/andando em cada
## slot, arredondados) e o nome de quem deu o golpe final.
static func _journeys(sim: CombatSim) -> Dictionary:
	var tps: int = sim.bal.ticks_per_second
	var enters := {}   # uid -> [[slot, tick]]
	var ends := {}     # uid -> tick
	var killer := {}   # uid -> nome
	for e in sim.events:
		match e.type:
			"spawn":
				enters[e.u] = [[sim.db.layout.entrance, e.t]]
			"enter", "push":
				if enters.has(e.u):
					enters[e.u].append([e.slot, e.t])
			"death", "heart_hit", "loot", "flee":
				if not ends.has(e.u):
					ends[e.u] = e.t
				if e.type == "death" and e.has("killer"):
					var k: Object = sim._unit(e.killer)
					if k != null:
						killer[e.u] = k.name
	var out := {}
	for uid in enters:
		var list: Array = enters[uid]
		var steps := []
		for i in list.size():
			var until: int = list[i + 1][1] if i + 1 < list.size() else ends.get(uid, sim.tick)
			steps.append({"slot": list[i][0], "secs": int(round(float(until - list[i][1]) / tps))})
		out[uid] = {"steps": steps, "killer": killer.get(uid, "")}
	return out


static func _tips(db: Db, sim: CombatSim) -> Array:
	var tips: Array = []
	var escaped := sim.units.filter(func(u): return u.side == "invader" and u.state == "escaped")
	var has_anti_armor := false
	for m in sim.units:
		if m.side == "monster" and (m.has("poison_on_hit") or m.has("armor_shred_on_hit") or m.damage_type != "physical"):
			has_anti_armor = true
	if sim.units.any(func(u): return u.side == "invader" and u.state == "fled"):
		tips.append("Invasores fugiram por falta de tempo: falta dano para fechar a onda.")
	for u in escaped:
		if u.is_boss:
			tips.append("%s passou. %s" % [u.name, db.bosses[u.id].question])
			break
	if not has_anti_armor and escaped.any(func(u): return u.armor >= 5):
		tips.append("Invasores blindados passaram: veneno (Aranha), Slime Ácido ou dano mágico (Bruxo) ignoram armadura.")
	if escaped.any(func(u): return u.id == "mago"):
		tips.append("Um Mago passou: atordoamento (Morcego) e Espinhos derrubam alvos frágeis antes do dano em área.")
	if sim.units.any(func(u): return u.state == "looted"):
		tips.append("Um Ladino levou o baú: você perde o ouro dele, mas esse Ladino foi embora sem atacar o Coração. Com um monstro na Sala de Tesouro, o baú fica protegido.")
	if escaped.any(func(u): return u.move_speed >= 70):
		tips.append("Invasores rápidos passaram: Rede e Corredor Estreito seguram quem corre.")
	if escaped.size() > 0 and tips.is_empty():
		tips.append("%d invasor(es) chegaram ao Coração: reforce a última sala antes dele (d1) ou o Guardião." % escaped.size())
	if sim.result.heart_damage == 0 and tips.is_empty():
		tips.append("Defesa perfeita: nenhum invasor chegou ao Coração.")
	return tips.slice(0, MAX_TIPS)
