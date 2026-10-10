extends "res://tools/bots/bot_base.gd"
## Bot aleatório: a cada passo escolhe uma ação válida qualquer (comprar,
## posicionar, escavar, re-sortear) ou para. Referência de "não pensar".


func _init(p_db: Db, seed: int) -> void:
	super(p_db, seed)
	name = "random"


func prep(run: RunState) -> void:
	for step in 20:
		auto_merge(run, func(_p): return "a" if rng.chance_bp(5000) else "b")
		var actions := []
		for i in run.offers.size():
			if run.offers[i] != null and run.offers[i].price <= run.gold and run.free_bench_slot() >= 0:
				actions.append(["buy", i])
		for b in run.bench.size():
			if run.bench[b] != null:
				for slot in valid_slots(run.dungeon, run.bench[b]):
					actions.append(["place", b, slot])
		var price := run.dig_price()
		if price >= 0 and price <= run.gold:
			for slot in diggable(run.dungeon):
				actions.append(["dig", slot])
		if run.gold >= db.balance.reroll_cost:
			actions.append(["reroll"])
		actions.append(["stop"])
		var a: Array = rng.pick(actions)
		match a[0]:
			"buy":
				run.buy(a[1])
			"place":
				run.place(a[1], a[2])
			"dig":
				run.dig(a[1])
			"reroll":
				run.reroll()
			"stop":
				break
	# Posiciona o que der antes da onda (um jogador não deixaria tudo na bancada).
	for b in run.bench.size():
		if run.bench[b] != null:
			var slots := valid_slots(run.dungeon, run.bench[b])
			if not slots.is_empty():
				run.place(b, rng.pick(slots))
