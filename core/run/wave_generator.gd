extends RefCounted
## Gera o calendário de ondas de uma run a partir da semente.
##
## O calendário inteiro (tema e grupo de cada onda, Herói-Chefe) é gerado no
## início: depende só da semente, não das escolhas do jogador. Isso permite
## mostrar a próxima onda e o tema da seguinte, e reproduzir a run.

const Sim := preload("res://core/combat/combat_sim.gd")

const BOSS_THEME := "chefe"


## Retorna {"themes": [id...], "parties": [[entrada...]...], "boss": id}.
## O índice 0 é a onda 1.
static func schedule(db: Db, seed: int) -> Dictionary:
	var rng := Rng.new(seed, "waves")
	var bal := db.balance
	var boss_ids := db.bosses.keys()
	boss_ids.sort()
	var boss: String = rng.pick(boss_ids)
	var theme_ids := db.wave_themes.keys()
	theme_ids.sort()
	var themes: Array = []
	var parties: Array = []
	var prev := ""
	for w in range(1, bal.waves_per_run + 1):
		if w == bal.boss_wave:
			themes.append(BOSS_THEME)
			parties.append(Sim.boss_party(db, boss))
			continue
		var options := theme_ids.filter(func(t): return t != prev)
		var theme: String = rng.pick(options)
		prev = theme
		themes.append(theme)
		parties.append(_party(db, rng, theme, w))
	return {"themes": themes, "parties": parties, "boss": boss}


static func _party(db: Db, rng: Rng, theme_id: String, wave: int) -> Array:
	var bal := db.balance
	var theme: Dictionary = db.wave_themes[theme_id]
	var budget: int = bal.wave_budget_base + bal.wave_budget_per_wave * wave
	var mod_chance: int = bal.modifier_chance_base_bp + bal.modifier_chance_per_wave_bp * wave
	var elite: bool = wave == bal.elite_wave
	if elite:
		budget = Db.scale_bp(budget, bal.elite_budget_bp)
	var party: Array = []
	while party.size() < bal.max_party_size:
		var classes := {}
		for c in theme.class_weights:
			if theme.class_weights[c] > 0 and db.adventurers[c].gen_cost <= budget:
				classes[c] = theme.class_weights[c]
		if classes.is_empty():
			break
		var cls := _weighted(rng, classes)
		budget -= db.adventurers[cls].gen_cost
		var mods: Array = []
		if elite or rng.chance_bp(mod_chance):
			var options := {}
			for m in theme.modifier_weights:
				if elite or db.modifiers[m].gen_cost <= budget:
					options[m] = theme.modifier_weights[m]
			if not options.is_empty():
				var mod := _weighted(rng, options)
				# Na onda de elite o modificador é bônus: não consome orçamento (D-013).
				if not elite:
					budget -= db.modifiers[mod].gen_cost
				mods.append(mod)
		party.append({"id": cls, "modifiers": mods})
		if budget <= 0:
			break
	return party


## Escolha ponderada em ordem de chave estável.
static func _weighted(rng: Rng, weights: Dictionary) -> String:
	var keys := weights.keys()
	keys.sort()
	var total := 0
	for k in keys:
		total += weights[k]
	var roll := rng.range_int(0, total - 1)
	for k in keys:
		roll -= weights[k]
		if roll < 0:
			return k
	return keys[-1]
