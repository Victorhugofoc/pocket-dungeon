extends "res://tests/test_case.gd"

const DbScript := preload("res://core/db.gd")
const DungeonScript := preload("res://core/dungeon.gd")
const Pathing := preload("res://core/combat/pathing.gd")

var _db: Object = DbScript.load_from("res://data")


func _dungeon() -> Object:
	return DungeonScript.new(_db)


func _room(id: String, level: int = 1) -> Dictionary:
	return {"kind": "room", "id": id, "level": level}


func _mon(id: String, level: int = 1) -> Dictionary:
	return {"kind": "monster", "id": id, "level": level, "variant": ""}


func _trap(id: String) -> Dictionary:
	return {"kind": "trap", "id": id, "level": 1}


func _passable(d: Object) -> Dictionary:
	var out := {}
	for s in d.slot_state:
		out[s] = d.passable(s)
	return out


func _paths(d: Object) -> Array:
	return Pathing.all_paths(d.adjacency, _passable(d), "entrada", "coracao")


func _open_c(d: Object) -> Object:
	assert_eq(d.dig("c1"), "")
	return d


const PATH_B := ["entrada", "a1", "b1", "b2", "d1", "coracao"]
const PATH_C := ["entrada", "a1", "c1", "c2", "d1", "coracao"]


# --- Escavação ---------------------------------------------------------------

func test_initial_state_matches_layout() -> void:
	var d := _dungeon()
	assert_eq(d.slot_state.a1, "room")
	assert_eq(d.slot_state.b2, "tunnel")
	assert_eq(d.slot_state.c1, "rock")
	assert_eq(_paths(d), [PATH_B])


func test_dig_costs_escalate_in_order() -> void:
	var d := _dungeon()
	assert_eq(d.dig_cost(), 3)
	d.dig("b2")
	assert_eq(d.dig_cost(), 5)
	d.dig("c2")
	assert_eq(d.dig_cost(), 7)
	d.dig("c1")
	assert_eq(d.dig_cost(), -1)


func test_opening_branch_turns_rest_into_tunnel() -> void:
	var d := _dungeon()
	assert_eq(d.dig("c2"), "")
	assert_eq(d.slot_state.c2, "room")
	assert_eq(d.slot_state.c1, "tunnel")
	assert_eq(_paths(d), [PATH_B, PATH_C])


func test_dig_rejects_invalid_targets() -> void:
	var d := _dungeon()
	assert_ne(d.dig("a1"), "", "já é sala")
	assert_ne(d.dig("entrada"), "")
	assert_ne(d.dig("coracao"), "")
	assert_ne(d.dig("zz"), "")
	assert_eq(d.digs_done, 0)


# --- Posicionamento -----------------------------------------------------------

func test_room_needs_dug_slot() -> void:
	var d := _dungeon()
	assert_ne(d.place_room("c1", _room("camara")), "", "rocha")
	assert_ne(d.place_room("b2", _room("camara")), "", "túnel")
	assert_eq(d.place_room("a1", _room("camara")), "")
	assert_ne(d.place_room("a1", _room("covil")), "", "ocupado")
	assert_ne(d.place_room("coracao", _room("camara")), "")


func test_room_capacity_by_type_and_level() -> void:
	var d := _dungeon()
	d.place_room("a1", _room("camara"))
	assert_eq(d.place_monster("a1", _mon("slime")), "")
	assert_eq(d.place_monster("a1", _mon("goblin")), "")
	assert_ne(d.place_monster("a1", _mon("aranha")), "", "Câmara nível 1 cabe 2")
	d.place_room("b1", _room("camara", 3))
	for i in 3:
		assert_eq(d.place_monster("b1", _mon("slime")), "")
	d.place_room("d1", _room("covil"))
	assert_eq(d.place_monster("d1", _mon("golem")), "")
	assert_ne(d.place_monster("d1", _mon("golem")), "")


func test_monster_needs_room_except_heart_guardian() -> void:
	var d := _dungeon()
	assert_ne(d.place_monster("a1", _mon("slime")), "")
	assert_eq(d.place_monster("coracao", _mon("golem")), "")
	assert_ne(d.place_monster("coracao", _mon("slime")), "", "um Guardião só")


func test_trap_sockets() -> void:
	var d := _dungeon()
	d.place_room("a1", _room("galeria"))
	assert_eq(d.place_trap("a1", _trap("espinhos")), "")
	assert_eq(d.place_trap("a1", _trap("rede")), "")
	assert_ne(d.place_trap("a1", _trap("brasa")), "")
	d.place_room("b1", _room("covil"))
	assert_ne(d.place_trap("b1", _trap("brasa")), "", "Covil não tem soquete")
	assert_ne(d.place_trap("coracao", _trap("brasa")), "")


func test_remove_room_returns_everything() -> void:
	var d := _dungeon()
	d.place_room("a1", _room("camara"))
	d.place_monster("a1", _mon("slime"))
	d.place_trap("a1", _trap("rede"))
	var back: Array = d.remove_room("a1")
	assert_eq(back.size(), 3)
	assert_eq(d.room_at("a1"), null)
	assert_eq(d.contents.a1.monsters.size(), 0)


# --- Escolha de rota -----------------------------------------------------------

func _setup_two_branches() -> Object:
	var d := _open_c(_dungeon())
	d.place_room("b1", _room("camara"))
	d.place_monster("b1", _mon("slime"))
	d.place_monster("b1", _mon("goblin"))
	d.place_room("c1", _room("galeria"))
	d.place_trap("c1", _trap("espinhos"))
	d.place_trap("c1", _trap("rede"))
	return d


func test_guerreiro_seeks_most_monsters() -> void:
	var d := _setup_two_branches()
	assert_eq(Pathing.choose(_paths(d), "most_monsters", d.route_info()), PATH_B)


func test_arqueira_avoids_traps() -> void:
	var d := _setup_two_branches()
	assert_eq(Pathing.choose(_paths(d), "fewest_traps", d.route_info()), PATH_B)
	# Move as armadilhas para o ramo B: agora ela vai pelo C.
	var d2 := _open_c(_dungeon())
	d2.place_room("b1", _room("galeria"))
	d2.place_trap("b1", _trap("espinhos"))
	assert_eq(Pathing.choose(_paths(d2), "fewest_traps", d2.route_info()), PATH_C)


func test_ladino_seeks_treasure_as_decoy() -> void:
	var d := _setup_two_branches()
	assert_eq(d.dig("c2"), "")
	assert_eq(d.place_room("c2", _room("tesouro")), "")
	assert_eq(Pathing.choose(_paths(d), "treasure", d.route_info()), PATH_C)


func test_ladino_without_treasure_follows_leader() -> void:
	var d := _setup_two_branches()
	var info: Dictionary = d.route_info()
	assert_eq(Pathing.choose(_paths(d), "treasure", info, PATH_C), PATH_C)
	assert_eq(Pathing.choose(_paths(d), "treasure", info), PATH_B, "sem líder: ordem estável")


func test_tie_follows_leader_then_stable_order() -> void:
	var d := _open_c(_dungeon())
	var info: Dictionary = d.route_info()
	assert_eq(Pathing.choose(_paths(d), "shortest", info), PATH_B)
	assert_eq(Pathing.choose(_paths(d), "shortest", info, PATH_C), PATH_C)
	assert_eq(Pathing.choose(_paths(d), "most_monsters", info, PATH_C), PATH_C)


func test_leader_ignored_when_not_tied() -> void:
	var d := _setup_two_branches()
	assert_eq(Pathing.choose(_paths(d), "most_monsters", d.route_info(), PATH_C), PATH_B)


func test_treasure_pact_lures_everyone() -> void:
	var d := _setup_two_branches()
	assert_eq(d.dig("c2"), "")
	assert_eq(d.place_room("c2", _room("tesouro")), "")
	assert_eq(Pathing.choose(_paths(d), "most_monsters", d.route_info(), [], true), PATH_C)


func test_blocked_branch_reroutes_mid_wave() -> void:
	# Fechar Porta no ramo B com o invasor ainda em a1: só sobra o C.
	var d := _setup_two_branches()
	var passable := _passable(d)
	passable["b1"] = false
	var paths := Pathing.all_paths(d.adjacency, passable, "a1", "coracao")
	assert_eq(paths, [["a1", "c1", "c2", "d1", "coracao"]])
	assert_eq(Pathing.choose(paths, "most_monsters", d.route_info())[1], "c1")


func test_invader_in_branch_can_backtrack_if_blocked_ahead() -> void:
	var d := _setup_two_branches()
	var passable := _passable(d)
	passable["b2"] = false
	var paths := Pathing.all_paths(d.adjacency, passable, "b1", "coracao")
	assert_eq(paths, [["b1", "a1", "c1", "c2", "d1", "coracao"]])
