class_name Dungeon
extends RefCounted
## Estado da masmorra durante a preparação: estado de cada slot (rocha, túnel,
## sala), escavações feitas e o que está posicionado em cada slot.
##
## Peças são Dictionaries:
##   sala:      {"kind": "room", "id": "camara", "level": 1}
##   monstro:   {"kind": "monster", "id": "slime", "level": 1, "variant": ""}
##   armadilha: {"kind": "trap", "id": "espinhos", "level": 1}
## Métodos que alteram o estado retornam "" em caso de sucesso ou a mensagem
## de erro, que a interface pode mostrar ao jogador.

var db: Db
var layout: Dictionary
var slot_state: Dictionary = {}   ## slot -> "rock" | "tunnel" | "room"
var slot_kind: Dictionary = {}    ## slot -> "entrance" | "slot" | "heart"
var adjacency: Dictionary = {}    ## slot -> Array[String] ordenado
var digs_done: int = 0
## slot -> {"room": peça ou null, "monsters": [peças], "traps": [peças]}
var contents: Dictionary = {}


func _init(p_db: Db) -> void:
	db = p_db
	layout = db.layout
	for s in layout.slots:
		slot_state[s.id] = s.start
		slot_kind[s.id] = s.kind
		adjacency[s.id] = []
		contents[s.id] = {"room": null, "monsters": [], "traps": []}
	for e in layout.edges:
		adjacency[e[0]].append(e[1])
		adjacency[e[1]].append(e[0])
	for id in adjacency:
		adjacency[id].sort()


# --- Escavação -------------------------------------------------------------

func dig_cost() -> int:
	var costs: Array = db.balance.dig_costs
	return costs[digs_done] if digs_done < costs.size() else -1


func can_dig(slot: String) -> String:
	if not slot_state.has(slot):
		return "slot inexistente"
	if slot_kind[slot] != "slot":
		return "este lugar não pode ser escavado"
	if slot_state[slot] == "room":
		return "já está escavado"
	return ""


## Não cobra ouro: quem chama (a run) verifica `dig_cost()` e debita.
func dig(slot: String) -> String:
	var err := can_dig(slot)
	if err != "":
		return err
	slot_state[slot] = "room"
	digs_done += 1
	# Abrir um ramo transforma o resto dele em passagem (D-008).
	for group in layout.get("branch_groups", []):
		if slot in group:
			for other in group:
				if slot_state[other] == "rock":
					slot_state[other] = "tunnel"
	return ""


func passable(slot: String) -> bool:
	return slot_state[slot] != "rock"


# --- Posicionamento --------------------------------------------------------

func room_at(slot: String) -> Variant:
	return contents[slot].room


func capacity(slot: String) -> int:
	if slot_kind[slot] == "heart":
		return 1
	var room: Variant = contents[slot].room
	if room == null:
		return 0
	return Db.lv(db.rooms[room.id].capacity, room.level)


func trap_sockets(slot: String) -> int:
	var room: Variant = contents[slot].room
	if room == null or slot_kind[slot] == "heart":
		return 0
	return db.rooms[room.id].trap_sockets


func place_room(slot: String, piece: Dictionary) -> String:
	if slot_kind.get(slot, "") != "slot":
		return "salas só podem ir em slots da masmorra"
	if slot_state[slot] != "room":
		return "escave este slot antes"
	if contents[slot].room != null:
		return "já existe uma sala aqui"
	contents[slot].room = piece
	return ""


## Remove a sala e devolve tudo que estava nela: [sala, monstros..., armadilhas...].
func remove_room(slot: String) -> Array:
	var c: Dictionary = contents[slot]
	if c.room == null:
		return []
	var out: Array = [c.room]
	out.append_array(c.monsters)
	out.append_array(c.traps)
	contents[slot] = {"room": null, "monsters": [], "traps": []}
	return out


func place_monster(slot: String, piece: Dictionary) -> String:
	if not contents.has(slot):
		return "slot inexistente"
	if slot_kind[slot] != "heart" and contents[slot].room == null:
		return "monstros precisam de uma sala"
	if contents[slot].monsters.size() >= capacity(slot):
		return "a sala está cheia"
	contents[slot].monsters.append(piece)
	return ""


func place_trap(slot: String, piece: Dictionary) -> String:
	if not contents.has(slot) or contents[slot].room == null:
		return "armadilhas precisam de uma sala"
	if contents[slot].traps.size() >= trap_sockets(slot):
		return "sem soquete de armadilha livre"
	contents[slot].traps.append(piece)
	return ""


func remove_monster(slot: String, index: int) -> Variant:
	var list: Array = contents[slot].monsters
	return list.pop_at(index) if index >= 0 and index < list.size() else null


func remove_trap(slot: String, index: int) -> Variant:
	var list: Array = contents[slot].traps
	return list.pop_at(index) if index >= 0 and index < list.size() else null


# --- Save ---------------------------------------------------------------------

func to_dict() -> Dictionary:
	return {"slot_state": slot_state.duplicate(), "digs_done": digs_done, "contents": contents.duplicate(true)}


func load_dict(d: Dictionary) -> void:
	slot_state = d.slot_state.duplicate()
	digs_done = d.digs_done
	contents = d.contents.duplicate(true)


# --- Informação para a escolha de rota ------------------------------------

## slot -> {"monsters": int, "traps": int, "treasure": bool}, a partir do que
## está posicionado. O combate monta a mesma estrutura com o estado ao vivo.
func route_info() -> Dictionary:
	var info := {}
	for slot in contents:
		var c: Dictionary = contents[slot]
		info[slot] = {
			"monsters": c.monsters.size(),
			"traps": c.traps.size(),
			"treasure": c.room != null and c.room.id == "tesouro",
		}
	return info
