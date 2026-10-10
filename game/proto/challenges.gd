extends RefCounted
## Desafios do protótipo 0.2: grupo fixo + estoque fixo de peças.
## Cada desafio traz uma solução de referência (testada em tests/test_challenges.gd).

const PATH := "res://game/proto/challenges.json"


static func load_all() -> Array:
	var data: Variant = JSON.parse_string(FileAccess.get_file_as_string(PATH))
	return Db.to_ints(data)


## Peças do estoque como Dictionaries de peça (core/run/pieces.gd).
static func pieces(ch: Dictionary) -> Array:
	var out := []
	for spec in ch.pieces:
		out.append({"kind": spec[0], "id": spec[1], "level": spec[2],
				"variant": spec[3] if spec.size() > 3 else "", "paid": 0})
	return out


## Monta a masmorra da solução de referência. Retorna "" ou o primeiro erro.
static func build_solution(db: Db, ch: Dictionary, dungeon: Dungeon) -> String:
	for slot in ch.get("dig_solution", []):
		var err := dungeon.dig(slot)
		if err != "":
			return "escavar %s: %s" % [slot, err]
	var stock := pieces(ch)
	# Salas primeiro: monstros e armadilhas dependem delas.
	var order: Array = ch.solution.duplicate()
	order.sort_custom(func(a, b): return int(stock[a[1]].kind == "room") > int(stock[b[1]].kind == "room"))
	for step in order:
		var p: Dictionary = stock[step[1]]
		var err := place(dungeon, p, step[0])
		if err != "":
			return "%s em %s: %s" % [p.id, step[0], err]
	return ""


static func place(dungeon: Dungeon, p: Dictionary, slot: String) -> String:
	match p.kind:
		"room":
			return dungeon.place_room(slot, p)
		"monster":
			return dungeon.place_monster(slot, p)
	return dungeon.place_trap(slot, p)
