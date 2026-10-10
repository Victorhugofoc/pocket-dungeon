extends Node2D
## Tabuleiro da masmorra (graybox): desenha salas, peças, rotas previstas e,
## durante a onda, as unidades da CombatSim. Também responde "o que está
## neste ponto da tela" para a interação por toque.

const ROOM_SIZE := Vector2(150, 80)
const ORIGIN := Vector2(105, 200)
const STEP := Vector2(165, 94)

const C := {
	"rock": Color("2a2228"), "tunnel": Color("3b3138"), "room": Color("4a3c45"),
	"heart": Color("4a2630"), "line": Color("8a7484"), "edge": Color("5b4a55"),
	"text": Color("eadfe6"), "dim": Color("9c8c96"), "hp": Color("6fd36f"),
	"hp_bg": Color("3a1f24"), "shield": Color("8fc7ff"), "trap": Color("ff6b6b"),
	"trap_used": Color("5a4a50"), "gold": Color("ffd24a"), "blocked": Color("1f3550"),
}
const FAMILY := {
	"gosma": Color("6ccf8a"), "besta": Color("c99a5b"), "goblinoide": Color("d4d05a"),
	"morto_vivo": Color("b8b8d8"),
}
const CLASS := {
	"guerreiro": Color("d9534f"), "arqueira": Color("5cb85c"), "mago": Color("9b6bd6"),
	"ladino": Color("f0ad4e"), "frostine": Color("8fdcff"), "kaelen": Color("ffe066"),
	"aurelius": Color("d18cff"), "ignis": Color("ff7a1a"), "zephyr": Color("e6b366"),
	"varok": Color("f2594a"),
}
const DTYPE := {
	"physical": Color("ffffff"), "magic": Color("c79bff"), "fire": Color("ff8a3d"),
	"poison": Color("8be36b"), "pure": Color("ffd0d0"),
}

var db: Db
var dungeon: Dungeon
var sim: CombatSim = null
## slot -> Color (destaques: alvos válidos, slot selecionado)
var highlight: Dictionary = {}
## [{"path": [slots], "label": String, "color": Color}]
var routes: Array = []
## Peça selecionada na preparação ({"slot", "kind", "index"} ou {}).
var selected: Dictionary = {}
var font: Font

var _floaters: Array = []
var _flashes: Array = []
var _display: Dictionary = {}


func _ready() -> void:
	font = ThemeDB.fallback_font


func setup(p_db: Db, p_dungeon: Dungeon) -> void:
	db = p_db
	dungeon = p_dungeon
	sim = null
	_floaters.clear()
	_flashes.clear()
	_display.clear()


# --- Geometria e toque ---------------------------------------------------------

func slot_center(slot: String) -> Vector2:
	for s in db.layout.slots:
		if s.id == slot:
			return ORIGIN + Vector2((s.pos[0] - 1) * STEP.x, s.pos[1] * STEP.y)
	return Vector2.ZERO


func slot_rect(slot: String) -> Rect2:
	return Rect2(slot_center(slot) - ROOM_SIZE / 2, ROOM_SIZE)


func slot_at(pos: Vector2) -> String:
	for s in db.layout.slots:
		if slot_rect(s.id).has_point(pos):
			return s.id
	return ""


## Posição de cada monstro posicionado (preparação), na mesma disposição do combate.
func monster_pos(slot: String, index: int, count: int) -> Vector2:
	return slot_center(slot) + Vector2((index - (count - 1) / 2.0) * 46, 12)


## Peça posicionada sob o ponto: {"slot", "kind", "index"} ou {}.
func piece_at(pos: Vector2) -> Dictionary:
	var slot := slot_at(pos)
	if slot == "":
		return {}
	var c: Dictionary = dungeon.contents[slot]
	for i in c.monsters.size():
		if monster_pos(slot, i, c.monsters.size()).distance_to(pos) < 20:
			return {"slot": slot, "kind": "monster", "index": i}
	var r := slot_rect(slot)
	if pos.y > r.end.y - 18:
		for i in c.traps.size():
			if pos.x < r.position.x + 10 + (i + 1) * 70:
				return {"slot": slot, "kind": "trap", "index": i}
	if c.room != null:
		return {"slot": slot, "kind": "room", "index": 0}
	return {}


# --- Efeitos -------------------------------------------------------------------------

func float_text(pos: Vector2, text: String, color: Color, size: int = 14) -> void:
	var jitter := float((_floaters.size() * 7) % 5 - 2) * 10.0
	_floaters.append({"pos": pos + Vector2(jitter, 0), "text": text, "color": color, "age": 0.0, "size": size})


func flash(slot: String, color: Color = Color(0.6, 0.8, 1.0)) -> void:
	_flashes.append({"slot": slot, "age": 0.0, "color": color})


func unit_pos(u: Object) -> Vector2:
	if u == null:
		return Vector2.ZERO
	if u.side == "monster":
		var mates := sim.units.filter(func(m): return m.side == "monster" and m.slot == u.slot and m.is_alive())
		return monster_pos(u.slot, maxi(mates.find(u), 0), maxi(mates.size(), 1))
	if not u.spawned:
		return slot_center(db.layout.entrance) + Vector2(0, -70)
	var pos := slot_center(u.slot)
	if u.path_index + 1 < u.path.size():
		var nxt: String = u.path[u.path_index + 1]
		var frac: float = float(u.progress) / db.balance.room_length
		if sim._is_blocked(nxt):
			frac = minf(frac, 0.5)
		pos = pos.lerp(slot_center(nxt), frac)
	return pos + Vector2(((u.uid % 5) - 2) * 10, -22 + (u.uid % 3) * 6)


func _process(delta: float) -> void:
	if sim != null:
		for u in sim.units:
			var target := unit_pos(u)
			var cur: Vector2 = _display.get(u.uid, target)
			_display[u.uid] = cur.lerp(target, clampf(delta * 12.0, 0.0, 1.0))
	for f in _floaters:
		f.age += delta
	_floaters = _floaters.filter(func(f): return f.age < 1.3)
	for fl in _flashes:
		fl.age += delta
	_flashes = _flashes.filter(func(fl): return fl.age < 0.7)
	queue_redraw()


# --- Desenho -------------------------------------------------------------------------

func _draw() -> void:
	if db == null:
		return
	for e in db.layout.edges:
		if dungeon.passable(e[0]) and dungeon.passable(e[1]):
			draw_line(slot_center(e[0]), slot_center(e[1]), C.edge, 6.0)
	# Camadas: fundo das salas, rotas, texto e peças por cima.
	for s in db.layout.slots:
		_draw_slot_bg(s.id)
	_draw_routes()
	for s in db.layout.slots:
		_draw_slot(s.id)
	if sim == null:
		_draw_static_pieces()
	else:
		for u in sim.units:
			if u.side == "monster" and u.is_alive():
				_draw_monster(_display.get(u.uid, unit_pos(u)), u.family, u.name.split(" ")[0], u.level,
						u.hp, u.max_hp, u.shield, _marks(u))
		for u in sim.units:
			if u.side == "invader" and u.is_alive() and u.spawned:
				_draw_invader(u)
	for f in _floaters:
		var c: Color = f.color
		c.a = clampf(1.3 - f.age, 0.0, 1.0)
		_text(f.pos + Vector2(0, -30 * f.age), f.text, f.size, c, true)


func _draw_slot_bg(slot: String) -> void:
	var r := slot_rect(slot)
	var c: Dictionary = dungeon.contents[slot]
	if dungeon.slot_state[slot] == "rock":
		draw_rect(r, C.rock)
		return
	var fill: Color = C.room if c.room != null else C.tunnel
	if dungeon.slot_kind[slot] == "heart":
		fill = C.heart
	if sim != null and sim._is_blocked(slot):
		fill = C.blocked
	draw_rect(r, fill)
	draw_rect(r, C.line, false, 2.0)


func _draw_slot(slot: String) -> void:
	var r := slot_rect(slot)
	var state: String = dungeon.slot_state[slot]
	var kind: String = dungeon.slot_kind[slot]
	var c: Dictionary = dungeon.contents[slot]
	if state == "rock":
		_text(r.get_center() + Vector2(0, 4), "rocha", 11, C.dim, true)
	else:
		var title := ""
		match kind:
			"heart":
				title = "CORAÇÃO %d PV" % (sim.heart_hp if sim != null else db.balance.heart_hp)
			"entrance":
				title = "entrada"
			_:
				title = "%s %d" % [db.rooms[c.room.id].name, c.room.level] if c.room != null else "%s (vazio)" % slot
		_text(r.position + Vector2(6, 15), title, 11, C.text)
		if c.room != null or kind == "heart":
			var cap: int = dungeon.capacity(slot)
			var sockets: int = dungeon.trap_sockets(slot)
			var info := "monstros %d/%d" % [c.monsters.size(), cap] if kind == "heart" else \
					"monstros %d/%d · armadilhas %d/%d" % [c.monsters.size(), cap, c.traps.size(), sockets]
			if kind == "heart":
				info = "Guardião %d/1" % c.monsters.size()
			_text(r.position + Vector2(6, 28), info, 9, C.dim)
		var traps: Array = sim._traps.get(slot, []) if sim != null else c.traps
		for i in traps.size():
			var t: Dictionary = traps[i]
			var armed: bool = t.get("armed", true)
			_text(r.position + Vector2(6 + i * 70, r.size.y - 6), db.traps[t.id].name, 10,
					C.trap if armed else C.trap_used)
		var chest: Variant = null
		if sim != null:
			chest = sim._chests.get(slot)
		elif c.room != null and c.room.id == "tesouro":
			chest = "baú"
		if chest != null:
			_text(r.position + Vector2(r.size.x - 44, r.size.y - 6), "baú" if chest is String else "baú %d" % chest, 10, C.gold)
		if sim != null:
			for z in sim._zones:
				if z.slot == slot and z.until > sim.tick:
					draw_rect(r.grow(-3), Color(1, 0.4, 0.1, 0.2))
	if highlight.has(slot):
		draw_rect(r.grow(3), highlight[slot], false, 3.0)
	if not selected.is_empty() and selected.slot == slot:
		match selected.kind:
			"room":
				draw_rect(r.grow(6), Color.WHITE, false, 3.0)
			"monster":
				var n: int = c.monsters.size()
				draw_rect(Rect2(monster_pos(slot, selected.index, n) - Vector2(18, 18), Vector2(36, 36)), Color.WHITE, false, 2.5)
			"trap":
				var tp := r.position + Vector2(4 + selected.index * 70, r.size.y - 18)
				draw_rect(Rect2(tp, Vector2(66, 16)), Color.WHITE, false, 2.0)
	for fl in _flashes:
		if fl.slot == slot:
			var col: Color = fl.color
			col.a = 0.7 * (1.0 - fl.age / 0.7)
			draw_rect(r.grow(4), col)


func _draw_routes() -> void:
	for i in routes.size():
		var rt: Dictionary = routes[i]
		var off := Vector2((i - (routes.size() - 1) / 2.0) * 14, 0)
		var col: Color = rt.color
		col.a = 0.6
		for j in rt.path.size() - 1:
			var b := slot_center(rt.path[j + 1]) + off
			if rt.path[j + 1] == db.layout.heart:
				b.y -= ROOM_SIZE.y / 2  # termina na porta do Coração, sem cobrir o texto
			draw_dashed_line(slot_center(rt.path[j]) + off, b, col, 3.0, 7.0)


func _draw_static_pieces() -> void:
	for slot in dungeon.contents:
		var list: Array = dungeon.contents[slot].monsters
		for i in list.size():
			var m: Dictionary = list[i]
			var stats: Dictionary = db.monster_at(m.id, m.level, m.get("variant", ""))
			_draw_monster(monster_pos(slot, i, list.size()), stats.family, stats.name.split(" ")[0], m.level,
					stats.hp, stats.hp, 0, "")


func _draw_monster(p: Vector2, family: String, short: String, level: int, hp: int, max_hp: int, shield: int, marks: String) -> void:
	var col: Color = FAMILY.get(family, Color.GRAY)
	draw_rect(Rect2(p - Vector2(13, 13), Vector2(26, 26)), col)
	_text(p + Vector2(0, 5), str(level), 12, Color.BLACK, true)
	_text(p + Vector2(0, 26), short, 9, C.text, true)
	_hp_bar(p, 13.0, hp, max_hp, shield)
	if marks != "":
		_text(p + Vector2(15, -8), marks, 10, Color("ffd27a"))


func _draw_invader(u: Object) -> void:
	var p: Vector2 = _display.get(u.uid, unit_pos(u))
	var r := 14.0 if u.is_boss else 11.0
	draw_circle(p, r, CLASS.get(u.id, Color.WHITE))
	if u.elite:
		draw_arc(p, r + 2, 0, TAU, 24, Color.WHITE, 1.5)
	_text(p + Vector2(0, 4), u.name.substr(0, 1), 11, Color.BLACK, true)
	_hp_bar(p, r, u.hp, u.max_hp, u.shield)
	var marks := _marks(u)
	if marks != "":
		_text(p + Vector2(r + 2, -6), marks, 10, Color("ffd27a"))


func _hp_bar(p: Vector2, r: float, hp: int, max_hp: int, shield: int) -> void:
	var w := r * 2.4
	var bar := Rect2(p + Vector2(-w / 2, -r - 7), Vector2(w, 4))
	draw_rect(bar, C.hp_bg)
	draw_rect(Rect2(bar.position, Vector2(w * hp / max(max_hp, 1), 4)), C.hp)
	if shield > 0:
		draw_rect(Rect2(bar.position - Vector2(0, 3), Vector2(w * mini(shield, max_hp) / max(max_hp, 1), 2)), C.shield)


func _marks(u: Object) -> String:
	var t := sim.tick
	var m := ""
	if u.cannot_act(t):
		m += "Z"
	elif u.cannot_move(t):
		m += "R"
	if u.is_slowed(t):
		m += "L"
	if u.poison.any(func(s): return s.until > t):
		m += "V"
	if u.burn.any(func(s): return s.until > t):
		m += "F"
	return m


func _text(pos: Vector2, text: String, size: int, color: Color, centered: bool = false) -> void:
	if centered:
		pos.x -= font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x / 2
	draw_string(font, pos, text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, color)
