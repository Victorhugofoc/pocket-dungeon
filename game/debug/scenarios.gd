extends RefCounted
## Cenários prontos para o visualizador de combate (graybox).
## Cada cenário monta uma masmorra e um grupo; nada aqui é balanceado.

const Sim := preload("res://core/combat/combat_sim.gd")


static func names() -> Array:
	return ["Onda mista", "Isca do tesouro", "Zephyr e o bando", "Varok", "Kaelen", "Ignis"]


## Retorna {"dungeon", "party", "power", "title", "hint"}.
static func build(db: Db, index: int) -> Dictionary:
	var d := Dungeon.new(db)
	var party: Array = []
	var power := "desabamento"
	var hint := ""
	match index:
		0:
			_place(d, "a1", "camara", [["slime"], ["morcego"]], ["rede"])
			_place(d, "b1", "covil", [["goblin", 2]])
			_place(d, "d1", "corredor", [["golem", 2]], ["alarme"])
			_place(d, "coracao", "", [["bruxo", 2]])
			party = [_inv("guerreiro", ["blindado"]), _inv("arqueira"), _inv("mago"), _inv("ladino")]
			hint = "Toque numa sala para usar o Desabamento (7 de mana)."
		1:
			_place(d, "c1", "tesouro")
			_place(d, "b1", "camara", [["slime", 2], ["golem"]], ["espinhos"])
			_place(d, "d1", "camara", [["goblin"], ["aranha"]])
			party = [_inv("guerreiro"), _inv("ladino"), _inv("ladino"), _inv("arqueira")]
			power = "fechar_porta"
			hint = "Ladinos vão atrás do tesouro no ramo C. Toque em b1/c1 para Fechar Porta."
		2:
			_place(d, "a1", "camara", [["golem", 2], ["bruxo", 2]], ["brasa"])
			_place(d, "b1", "camara", [["goblin", 2], ["goblin", 2]])
			_place(d, "d1", "galeria", [["aranha", 3, "a"]], ["espinhos", "brasa"])
			_place(d, "coracao", "", [["golem", 3, "b"]])
			party = Sim.boss_party(db, "zephyr")
			hint = "Zephyr mira primeiro nos suportes (Bruxo)."
		3:
			_place(d, "a1", "covil", [["golem", 4]])
			_place(d, "b1", "camara", [["aranha", 2], ["aranha", 2]], ["rede"])
			_place(d, "d1", "camara", [["slime", 3, "b"], ["goblin", 2]])
			_place(d, "coracao", "", [["morcego", 2]])
			party = Sim.boss_party(db, "varok")
			hint = "Varok causa dano dobrado no seu monstro mais forte."
		4:
			_place(d, "a1", "camara", [["golem", 3], ["slime", 2]])
			_place(d, "b1", "corredor", [["aranha", 3, "b"]], ["rede"])
			_place(d, "d1", "camara", [["morcego", 2], ["goblin", 2]], ["espinhos"])
			_place(d, "coracao", "", [["golem", 2]])
			party = Sim.boss_party(db, "kaelen")
			power = "fechar_porta"
			hint = "Kaelen atravessa uma sala a cada 8 s (Passo da Tempestade)."
		5:
			_place(d, "a1", "camara", [["slime", 2], ["slime", 2]], ["brasa"])
			_place(d, "b1", "galeria", [["bruxo", 3, "b"]], ["brasa", "espinhos"])
			_place(d, "d1", "camara", [["golem", 3], ["aranha", 2]])
			_place(d, "coracao", "", [["goblin", 3]])
			party = Sim.boss_party(db, "ignis")
			hint = "Ignis é imune a fogo: a Brasa e o Piromante não funcionam."
	return {"dungeon": d, "party": party, "power": power, "title": names()[index], "hint": hint}


static func _inv(id: String, mods: Array = []) -> Dictionary:
	return {"id": id, "modifiers": mods}


static func _place(d: Dungeon, slot: String, room: String, monsters: Array = [], traps: Array = []) -> void:
	if d.slot_state[slot] != "room":
		d.dig(slot)
	if slot != "coracao":
		d.place_room(slot, {"kind": "room", "id": room, "level": 1})
	for m in monsters:
		d.place_monster(slot, {"kind": "monster", "id": m[0], "level": m[1] if m.size() > 1 else 1,
				"variant": m[2] if m.size() > 2 else ""})
	for t in traps:
		d.place_trap(slot, {"kind": "trap", "id": t, "level": 1})
