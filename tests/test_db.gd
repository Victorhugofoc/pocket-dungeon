extends "res://tests/test_case.gd"

const DbScript := preload("res://core/db.gd")
const TMP := "user://test_data"


func _db() -> Object:
	return DbScript.load_from("res://data")


## Copia data/ para user://, aplica `mutate` ao JSON de `file` e carrega.
func _broken(file: String, mutate: Callable) -> Object:
	DirAccess.make_dir_recursive_absolute(TMP)
	for f in DirAccess.get_files_at("res://data"):
		if f.ends_with(".json"):
			DirAccess.copy_absolute("res://data".path_join(f), TMP.path_join(f))
	var data: Variant = JSON.parse_string(FileAccess.get_file_as_string(TMP.path_join(file)))
	mutate.call(data)
	var fa := FileAccess.open(TMP.path_join(file), FileAccess.WRITE)
	fa.store_string(JSON.stringify(data))
	fa.close()
	return DbScript.load_from(TMP)


func _has_error(db: Object, fragment: String) -> bool:
	for e in db.errors:
		if fragment in e:
			return true
	return false


func test_real_data_is_valid() -> void:
	var db := _db()
	assert_eq(db.errors.size(), 0, "\n    ".join(db.errors))


func test_content_counts_match_mvp_scope() -> void:
	var db := _db()
	assert_eq(db.monsters.size(), 8)
	assert_eq(db.rooms.size(), 5)
	assert_eq(db.traps.size(), 4)
	assert_eq(db.adventurers.size(), 4)
	assert_eq(db.modifiers.size(), 6)
	assert_eq(db.bosses.size(), 3)
	assert_eq(db.powers.size(), 6)
	assert_eq(db.pacts.size(), 6)
	assert_eq(db.wave_themes.size(), 6)


func test_numbers_become_ints() -> void:
	var db := _db()
	assert_eq(typeof(db.balance.heart_hp), TYPE_INT)
	assert_eq(typeof(db.monsters.slime.hp), TYPE_INT)
	assert_eq(typeof(db.rooms.covil.traits[0].bp[2]), TYPE_INT)


func test_monster_level_scaling() -> void:
	var db := _db()
	assert_eq(db.monster_at("slime", 1).hp, 60)
	assert_eq(db.monster_at("slime", 2).hp, 102)
	assert_eq(db.monster_at("slime", 4).hp, 295)
	assert_eq(db.monster_at("goblin", 3).atk, 26)


func test_variant_applies_only_from_variant_level() -> void:
	var db := _db()
	var lvl2: Dictionary = db.monster_at("slime", 2, "a")
	assert_eq(lvl2.variant, "")
	assert_eq(lvl2.traits.size(), 1)
	var lvl3: Dictionary = db.monster_at("slime", 3, "a")
	assert_eq(lvl3.variant, "a")
	assert_eq(lvl3.name, "Rei Slime")
	assert_eq(lvl3.traits.size(), 2)
	assert_eq(lvl3.traits[1].id, "split_on_death")


func test_monster_at_does_not_mutate_defs() -> void:
	var db := _db()
	var m: Dictionary = db.monster_at("slime", 3, "b")
	m.traits.clear()
	assert_eq(db.monsters.slime.traits.size(), 1)


func test_lv_helper() -> void:
	assert_eq(DbScript.lv(7, 3), 7)
	assert_eq(DbScript.lv([1, 2, 3], 1), 1)
	assert_eq(DbScript.lv([1, 2, 3], 3), 3)
	assert_eq(DbScript.lv([1, 2, 3], 9), 3)


func test_rejects_unknown_trait() -> void:
	var db := _broken("monsters.json", func(d): d[0].traits[0].id = "damage_reductoin")
	assert_true(_has_error(db, "trait desconhecido 'damage_reductoin'"), str(db.errors))


func test_rejects_missing_trait_param() -> void:
	var db := _broken("monsters.json", func(d): d[0].traits[0].erase("bp"))
	assert_true(_has_error(db, "falta o parâmetro 'bp'"), str(db.errors))


func test_rejects_wrong_level_array_size() -> void:
	var db := _broken("rooms.json", func(d): d[0].capacity = [2, 3])
	assert_true(_has_error(db, "rooms.camara.capacity"), str(db.errors))


func test_rejects_fractional_number() -> void:
	var db := _broken("adventurers.json", func(d): d[0].hp = 100.5)
	assert_true(_has_error(db, "número não inteiro"), str(db.errors))


func test_rejects_duplicate_id() -> void:
	var db := _broken("traps.json", func(d): d[1].id = d[0].id)
	assert_true(_has_error(db, "id duplicado"), str(db.errors))


func test_rejects_unknown_class_in_theme() -> void:
	var db := _broken("wave_themes.json", func(d): d[0].class_weights["paladino"] = 2)
	assert_true(_has_error(db, "classe desconhecida 'paladino'"), str(db.errors))


func test_rejects_unknown_summon() -> void:
	var db := _broken("monsters.json", func(d): d[5].variants.a.traits[0].unit = "dragao")
	assert_true(_has_error(db, "unidade invocada desconhecida 'dragao'"), str(db.errors))


func test_rejects_unreachable_heart() -> void:
	var db := _broken("layout.json", func(d):
		for s in d.slots:
			if s.id == "b2":
				s.start = "rock"
	)
	assert_true(_has_error(db, "não é alcançável"), str(db.errors))
