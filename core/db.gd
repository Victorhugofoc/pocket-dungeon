class_name Db
extends RefCounted
## Carrega e valida todas as definições de conteúdo de data/*.json.
##
## Uso: `var db := Db.load_from("res://data")`; se `db.errors` não estiver
## vazio, o conteúdo é inválido e nada deve rodar. Todos os números viram
## int (o JSON da Godot entrega float). As definições são Dictionaries e
## devem ser tratadas como somente leitura.

const Traits := preload("res://core/traits.gd")

var balance: Dictionary = {}
var layout: Dictionary = {}
var monsters: Dictionary = {}
var summons: Dictionary = {}
var rooms: Dictionary = {}
var traps: Dictionary = {}
var adventurers: Dictionary = {}
var modifiers: Dictionary = {}
var bosses: Dictionary = {}
var powers: Dictionary = {}
var pacts: Dictionary = {}
var wave_themes: Dictionary = {}
var families: Dictionary = {}

var errors: Array[String] = []


static func load_from(dir: String = "res://data") -> Db:
	var db := Db.new()
	db._load_all(dir)
	return db


# --- Consultas -------------------------------------------------------------

## Valor de um parâmetro por nível: aceita int fixo ou array (nível 1 = índice 0).
static func lv(value: Variant, level: int) -> int:
	if value is Array:
		return value[clampi(level, 1, value.size()) - 1]
	return value


## Atributos de um monstro num nível, com a variante (a/b) aplicada a partir do
## nível de bifurcação. Retorna um Dictionary novo, seguro para modificar.
func monster_at(id: String, level: int, variant: String = "") -> Dictionary:
	var def: Dictionary = monsters[id]
	var mult: int = balance.level_mult_bp[level - 1]
	var out := {
		"id": id,
		"name": def.name,
		"family": def.family,
		"role": def.role,
		"level": level,
		"variant": "",
		"hp": scale_bp(def.hp, mult),
		"atk": scale_bp(def.atk, mult),
		"attack_ticks": def.attack_ticks,
		"range": def.range,
		"damage_type": def.damage_type,
		"armor": def.armor,
		"traits": def.traits.duplicate(true),
	}
	if variant != "" and level >= balance.variant_level:
		var v: Dictionary = def.variants[variant]
		out.variant = variant
		out.name = v.name
		out.traits.append_array(v.traits.duplicate(true))
	return out


## value * bp / 10000, arredondado para o inteiro mais próximo.
static func scale_bp(value: int, bp: int) -> int:
	return (value * bp + 5000) / 10000


# --- Carregamento ----------------------------------------------------------

func _load_all(dir: String) -> void:
	var raw_balance: Variant = _read(dir, "balance.json")
	var raw_layout: Variant = _read(dir, "layout.json")
	if raw_balance is Dictionary:
		balance = raw_balance
	if raw_layout is Dictionary:
		layout = raw_layout
	monsters = _index(_read(dir, "monsters.json"), "monsters")
	summons = _index(_read(dir, "summons.json"), "summons")
	rooms = _index(_read(dir, "rooms.json"), "rooms")
	traps = _index(_read(dir, "traps.json"), "traps")
	adventurers = _index(_read(dir, "adventurers.json"), "adventurers")
	modifiers = _index(_read(dir, "modifiers.json"), "modifiers")
	bosses = _index(_read(dir, "bosses.json"), "bosses")
	powers = _index(_read(dir, "powers.json"), "powers")
	pacts = _index(_read(dir, "pacts.json"), "pacts")
	wave_themes = _index(_read(dir, "wave_themes.json"), "wave_themes")
	families = _index(_read(dir, "families.json"), "families")
	if errors.is_empty():
		_validate()


func _read(dir: String, file: String) -> Variant:
	var path := dir.path_join(file)
	if not FileAccess.file_exists(path):
		errors.append("%s: arquivo não encontrado" % file)
		return null
	var json := JSON.new()
	if json.parse(FileAccess.get_file_as_string(path)) != OK:
		errors.append("%s:%d: %s" % [file, json.get_error_line(), json.get_error_message()])
		return null
	return _intify(json.data, file)


## Converte todo float inteiro em int; float com parte decimal é erro.
func _intify(v: Variant, path: String) -> Variant:
	match typeof(v):
		TYPE_FLOAT:
			if v != floorf(v):
				errors.append("%s: número não inteiro (%s); use inteiros ou pontos-base" % [path, v])
			return int(v)
		TYPE_ARRAY:
			var arr := []
			for i in v.size():
				arr.append(_intify(v[i], "%s[%d]" % [path, i]))
			return arr
		TYPE_DICTIONARY:
			var d := {}
			for k in v:
				d[k] = _intify(v[k], "%s.%s" % [path, k])
			return d
	return v


func _index(list: Variant, category: String) -> Dictionary:
	var out := {}
	if list == null:
		return out
	if not list is Array:
		errors.append("%s: esperado uma lista" % category)
		return out
	for entry in list:
		if not entry is Dictionary or not entry.has("id"):
			errors.append("%s: entrada sem id" % category)
			continue
		var id: String = entry.id
		if not _is_snake(id):
			errors.append("%s.%s: id deve ser snake_case" % [category, id])
		if out.has(id):
			errors.append("%s.%s: id duplicado" % [category, id])
		out[id] = entry
	return out


static func _is_snake(s: String) -> bool:
	var re := RegEx.create_from_string("^[a-z][a-z0-9_]*$")
	return re.search(s) != null


# --- Validação -------------------------------------------------------------

const BALANCE_INT_KEYS := [
	"ticks_per_second", "room_length", "wave_time_limit_ticks", "heart_hp", "waves_per_run",
	"elite_wave", "boss_wave", "boss_reveal_wave", "max_monster_level", "max_room_level",
	"max_trap_level", "variant_level", "bench_size", "shop_offers", "shop_level2_from_wave",
	"reroll_cost", "sell_refund_bp", "start_gold", "income_base", "gold_per_kill",
	"gold_per_elite_kill", "interest_per", "interest_max", "mana_per_second", "mana_max",
	"wave_budget_base", "wave_budget_per_wave", "modifier_chance_base_bp",
	"modifier_chance_per_wave_bp", "souls_per_wave", "souls_win_bonus",
]

const UNIT_INT_KEYS := ["hp", "atk", "attack_ticks", "armor"]


func _validate() -> void:
	_validate_balance()
	_validate_layout()
	for id in _sorted(monsters):
		var m: Dictionary = monsters[id]
		var p := "monsters.%s" % id
		_check_unit(m, p)
		_check_enum(m, "role", Traits.ROLES, p)
		_check_enum(m, "unlock", Traits.UNLOCKS, p)
		if _require(m, "variants", TYPE_DICTIONARY, p):
			for key in ["a", "b"]:
				if not m.variants.has(key):
					errors.append("%s.variants: falta a variante '%s'" % [p, key])
					continue
				var v: Dictionary = m.variants[key]
				_require(v, "id", TYPE_STRING, "%s.variants.%s" % [p, key])
				_require(v, "name", TYPE_STRING, "%s.variants.%s" % [p, key])
				_check_traits(v.get("traits", []), "%s.variants.%s" % [p, key], 1)
	for id in _sorted(summons):
		_check_unit(summons[id], "summons.%s" % id)
	for id in _sorted(rooms):
		var r: Dictionary = rooms[id]
		var p := "rooms.%s" % id
		_require(r, "name", TYPE_STRING, p)
		_check_enum(r, "unlock", Traits.UNLOCKS, p)
		_check_levels(r.get("capacity"), balance.max_room_level, "%s.capacity" % p)
		_require(r, "trap_sockets", TYPE_INT, p)
		_check_traits(r.get("traits", []), p, balance.max_room_level)
	for id in _sorted(traps):
		var t: Dictionary = traps[id]
		var p := "traps.%s" % id
		_require(t, "name", TYPE_STRING, p)
		_check_enum(t, "unlock", Traits.UNLOCKS, p)
		_check_enum(t, "trigger", Traits.TRAP_TRIGGERS, p)
		_check_effects(t.get("effects", []), p, balance.max_trap_level)
	for id in _sorted(adventurers):
		var a: Dictionary = adventurers[id]
		var p := "adventurers.%s" % id
		_check_unit(a, p)
		_require(a, "gen_cost", TYPE_INT, p)
		_require(a, "threat", TYPE_INT, p)
		_require(a, "move_speed", TYPE_INT, p)
		_check_enum(a, "route_pref", Traits.ROUTE_PREFS, p)
	for id in _sorted(modifiers):
		var md: Dictionary = modifiers[id]
		var p := "modifiers.%s" % id
		_require(md, "name", TYPE_STRING, p)
		_require(md, "gen_cost", TYPE_INT, p)
		_require(md, "threat_add", TYPE_INT, p)
		_require(md, "stats", TYPE_DICTIONARY, p)
		_check_traits(md.get("traits", []), p, 1)
	for id in _sorted(bosses):
		var b: Dictionary = bosses[id]
		var p := "bosses.%s" % id
		_check_unit(b, p)
		_require(b, "threat", TYPE_INT, p)
		_require(b, "move_speed", TYPE_INT, p)
		_check_enum(b, "route_pref", Traits.ROUTE_PREFS, p)
		for e in b.get("escorts", []):
			if not adventurers.has(e.get("class", "")):
				errors.append("%s.escorts: classe desconhecida '%s'" % [p, e.get("class", "")])
	for id in _sorted(powers):
		var pw: Dictionary = powers[id]
		var p := "powers.%s" % id
		_require(pw, "name", TYPE_STRING, p)
		_require(pw, "cost", TYPE_INT, p)
		_check_enum(pw, "unlock", Traits.UNLOCKS, p)
		_check_effects(pw.get("effects", []), p, 1)
	for id in _sorted(pacts):
		var pc: Dictionary = pacts[id]
		_require(pc, "name", TYPE_STRING, "pacts.%s" % id)
		_require(pc, "effects", TYPE_DICTIONARY, "pacts.%s" % id)
	for id in _sorted(families):
		var f: Dictionary = families[id]
		var p := "families.%s" % id
		if not id in Traits.FAMILIES:
			errors.append("%s: família desconhecida" % p)
		_require(f, "synergy_min", TYPE_INT, p)
		_check_traits(f.get("bonus_traits", []), p, 1)
	for id in _sorted(wave_themes):
		var th: Dictionary = wave_themes[id]
		var p := "wave_themes.%s" % id
		if _require(th, "class_weights", TYPE_DICTIONARY, p):
			for c in th.class_weights:
				if not adventurers.has(c):
					errors.append("%s.class_weights: classe desconhecida '%s'" % [p, c])
		if _require(th, "modifier_weights", TYPE_DICTIONARY, p):
			for mo in th.modifier_weights:
				if not modifiers.has(mo):
					errors.append("%s.modifier_weights: modificador desconhecido '%s'" % [p, mo])


func _validate_balance() -> void:
	for k in BALANCE_INT_KEYS:
		_require(balance, k, TYPE_INT, "balance")
	if not errors.is_empty():
		return
	_check_levels(balance.get("level_mult_bp"), balance.max_monster_level, "balance.level_mult_bp")
	if balance.variant_level < 2 or balance.variant_level > balance.max_monster_level:
		errors.append("balance.variant_level fora do intervalo de níveis")
	if balance.elite_wave >= balance.boss_wave or balance.boss_wave != balance.waves_per_run:
		errors.append("balance: onda de elite deve vir antes da onda do chefe, que é a última")
	if _require(balance, "cost", TYPE_DICTIONARY, "balance"):
		for k in ["monster", "trap", "room"]:
			_require(balance.cost, k, TYPE_INT, "balance.cost")


func _validate_layout() -> void:
	var p := "layout"
	if not (_require(layout, "slots", TYPE_ARRAY, p) and _require(layout, "edges", TYPE_ARRAY, p)):
		return
	var ids := {}
	var diggable := 0
	for s in layout.slots:
		_check_enum(s, "kind", Traits.SLOT_KINDS, p)
		_check_enum(s, "start", Traits.SLOT_STATES, p)
		ids[s.id] = s
		if s.get("kind") == "slot" and s.get("start") != "room":
			diggable += 1
	for k in ["entrance", "heart"]:
		if not ids.has(layout.get(k, "")):
			errors.append("layout.%s: slot inexistente" % k)
	for e in layout.edges:
		if e.size() != 2 or not ids.has(e[0]) or not ids.has(e[1]):
			errors.append("layout.edges: aresta inválida %s" % [e])
	if balance.has("dig_costs") and balance.dig_costs.size() != diggable:
		errors.append("balance.dig_costs: %d preços para %d slots escaváveis" % [balance.dig_costs.size(), diggable])
	if errors.is_empty() and not _reachable(layout.entrance, layout.heart, ids):
		errors.append("layout: o Coração não é alcançável a partir da entrada no início da run")


## Busca em largura pelos slots que não são rocha.
func _reachable(from: String, to: String, ids: Dictionary) -> bool:
	var seen := {from: true}
	var queue := [from]
	while not queue.is_empty():
		var cur: String = queue.pop_front()
		if cur == to:
			return true
		for e in layout.edges:
			for i in 2:
				if e[i] == cur and not seen.has(e[1 - i]) and ids[e[1 - i]].start != "rock":
					seen[e[1 - i]] = true
					queue.append(e[1 - i])
	return false


func _check_unit(u: Dictionary, p: String) -> void:
	_require(u, "name", TYPE_STRING, p)
	for k in UNIT_INT_KEYS:
		_require(u, k, TYPE_INT, p)
	if u.get("hp", 1) <= 0 or u.get("attack_ticks", 1) <= 0:
		errors.append("%s: hp e attack_ticks devem ser positivos" % p)
	_check_enum(u, "range", Traits.RANGES, p)
	_check_enum(u, "damage_type", Traits.DAMAGE_TYPES, p)
	if u.has("family"):
		_check_enum(u, "family", Traits.FAMILIES, p)
	_check_traits(u.get("traits", []), p, 1)


func _check_traits(list: Variant, p: String, levels: int) -> void:
	_check_params(list, Traits.TRAITS, p, levels, "trait")


func _check_effects(list: Variant, p: String, levels: int) -> void:
	_check_params(list, Traits.EFFECTS, p, levels, "efeito")


func _check_params(list: Variant, vocab: Dictionary, p: String, levels: int, what: String) -> void:
	if not list is Array:
		errors.append("%s: lista de %ss inválida" % [p, what])
		return
	for t in list:
		var id: String = t.get("id", "")
		if not vocab.has(id):
			errors.append("%s: %s desconhecido '%s'" % [p, what, id])
			continue
		for param in vocab[id]:
			if not t.has(param):
				errors.append("%s.%s: falta o parâmetro '%s'" % [p, id, param])
				continue
			var v: Variant = t[param]
			if v is Array:
				_check_levels(v, levels, "%s.%s.%s" % [p, id, param])
			if param == "damage_type" and not v in Traits.DAMAGE_TYPES:
				errors.append("%s.%s: damage_type inválido '%s'" % [p, id, v])
			if param == "range" and not v in Traits.RANGES:
				errors.append("%s.%s: range inválido '%s'" % [p, id, v])
			if param == "scope" and not v in Traits.SCOPES:
				errors.append("%s.%s: scope inválido '%s'" % [p, id, v])
			if param == "unit" and not summons.has(v):
				errors.append("%s.%s: unidade invocada desconhecida '%s'" % [p, id, v])


## Um valor por nível precisa ser int ou array com exatamente `levels` ints.
func _check_levels(v: Variant, levels: int, p: String) -> void:
	if v is int:
		return
	if not v is Array or v.size() != levels:
		errors.append("%s: esperado int ou %d valores (um por nível)" % [p, levels])
		return
	for x in v:
		if not x is int:
			errors.append("%s: valores por nível devem ser inteiros" % p)
			return


func _require(d: Variant, key: String, type: int, p: String) -> bool:
	if not d is Dictionary or not d.has(key):
		errors.append("%s: falta o campo '%s'" % [p, key])
		return false
	if typeof(d[key]) != type:
		errors.append("%s.%s: tipo errado (%s)" % [p, key, type_string(typeof(d[key]))])
		return false
	return true


func _check_enum(d: Dictionary, key: String, allowed: Array, p: String) -> void:
	if not d.has(key):
		errors.append("%s: falta o campo '%s'" % [p, key])
	elif not d[key] in allowed:
		errors.append("%s.%s: valor '%s' não está em %s" % [p, key, d[key], allowed])


static func _sorted(d: Dictionary) -> Array:
	var keys := d.keys()
	keys.sort()
	return keys
