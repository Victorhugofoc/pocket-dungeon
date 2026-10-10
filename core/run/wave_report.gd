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
	for u in sim.units:
		if u.side == "invader" and not u.summoned:
			invaders.append({"uid": u.uid, "id": u.id, "name": u.name, "outcome": u.state, "slot": u.slot})
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
		tips.append("O baú foi saqueado: proteja a Sala de Tesouro com um monstro, ou deixe-a como isca de propósito.")
	if escaped.any(func(u): return u.move_speed >= 70):
		tips.append("Invasores rápidos passaram: Rede e Corredor Estreito seguram quem corre.")
	if escaped.size() > 0 and tips.is_empty():
		tips.append("%d invasor(es) chegaram ao Coração: reforce a última sala antes dele (d1) ou o Guardião." % escaped.size())
	if sim.result.heart_damage == 0 and tips.is_empty():
		tips.append("Defesa perfeita: nenhum invasor chegou ao Coração.")
	return tips.slice(0, MAX_TIPS)
