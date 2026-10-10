extends Node2D
## Visualizador de combate (debug, graybox).
##
## Roda a CombatSim tick a tick e desenha o estado: salas, monstros, invasores
## andando pela rota, barras de vida, status, números de dano e um log.
## Toque/clique numa sala para usar o poder do cenário.
##
## Captura de tela (para revisão sem abrir o editor):
##   godot --path . res://game/debug/combat_viewer.tscn -- --shot user://a.png --scenario 0 --tick 120

const Scenarios := preload("res://game/debug/scenarios.gd")

const ROOM_SIZE := Vector2(140, 92)
const COLORS := {
	"bg": Color("17121a"),
	"rock": Color("2a2228"),
	"tunnel": Color("3b3138"),
	"room": Color("4a3c45"),
	"room_line": Color("8a7484"),
	"edge": Color("5b4a55"),
	"text": Color("eadfe6"),
	"dim": Color("9c8c96"),
	"hp": Color("6fd36f"),
	"hp_bg": Color("3a1f24"),
	"shield": Color("8fc7ff"),
	"heart": Color("e0405a"),
	"mana": Color("6aa8ff"),
	"gosma": Color("6ccf8a"),
	"besta": Color("c99a5b"),
	"goblinoide": Color("d4d05a"),
	"morto_vivo": Color("b8b8d8"),
	"invasor": Color("e8e8e8"),
}
const CLASS_COLORS := {
	"guerreiro": Color("d9534f"), "arqueira": Color("5cb85c"), "mago": Color("9b6bd6"),
	"ladino": Color("f0ad4e"), "frostine": Color("8fdcff"), "kaelen": Color("ffe066"),
	"aurelius": Color("d18cff"), "ignis": Color("ff7a1a"), "zephyr": Color("e6b366"),
	"varok": Color("f2594a"),
}
const DTYPE_COLORS := {
	"physical": Color("ffffff"), "magic": Color("c79bff"), "fire": Color("ff8a3d"),
	"poison": Color("8be36b"), "pure": Color("ffd0d0"),
}
const STATUS_TEXT := {
	"stun": "atordoado", "root": "preso", "fear": "medo", "slow": "lento",
	"poison": "veneno", "burn": "queimando",
}

var db: Db
var sim: CombatSim
var scenario_index := 0
var scenario: Dictionary = {}
var speed := 1
var paused := false
var _acc := 0.0
var _event_cursor := 0
var _floaters: Array = []      ## [{"pos", "text", "color", "age", "size"}]
var _flashes: Array = []       ## [{"slot", "age"}] clarão de poder numa sala
var _log: Array = []           ## linhas mais recentes no fim
var _display_pos: Dictionary = {}  ## uid -> Vector2 (suavizado)
var _font: Font
var _speed_button: Button
var _pause_button: Button
var _shot: Dictionary = {}


func _ready() -> void:
	_font = ThemeDB.fallback_font
	db = Db.load_from("res://data")
	if not db.errors.is_empty():
		push_error("Dados inválidos: %s" % [db.errors])
		return
	_parse_args()
	_build_ui()
	_load_scenario(scenario_index)
	if not _shot.is_empty():
		_take_shot.call_deferred()


func _parse_args() -> void:
	var args := OS.get_cmdline_user_args()
	for i in args.size():
		match args[i]:
			"--shot":
				_shot["path"] = args[i + 1]
			"--scenario":
				scenario_index = int(args[i + 1])
			"--tick":
				_shot["tick"] = int(args[i + 1])


func _take_shot() -> void:
	var target: int = _shot.get("tick", 100)
	while not sim.finished and sim.tick < target:
		_step_sim()
	for u in sim.units:
		_display_pos[u.uid] = _unit_target_pos(u)
	for f in _floaters:
		f.age = 0.3
	paused = true
	queue_redraw()
	await RenderingServer.frame_post_draw
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	img.save_png(_shot.path)
	print("captura salva em ", ProjectSettings.globalize_path(_shot.path))
	get_tree().quit()


# --- Interface -----------------------------------------------------------------

func _build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	var bar := HBoxContainer.new()
	bar.position = Vector2(10, 912)
	bar.size = Vector2(520, 40)
	bar.add_theme_constant_override("separation", 6)
	layer.add_child(bar)
	_add_button(bar, "Reiniciar", func(): _load_scenario(scenario_index))
	_add_button(bar, "Próximo", func(): _load_scenario((scenario_index + 1) % Scenarios.names().size()))
	_speed_button = _add_button(bar, "1x", _cycle_speed)
	_pause_button = _add_button(bar, "Pausar", _toggle_pause)
	_add_button(bar, "+1 tick", func():
		paused = true
		_pause_button.text = "Seguir"
		_step_sim()
	)


func _add_button(parent: Control, text: String, cb: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(96, 38)
	b.pressed.connect(cb)
	parent.add_child(b)
	return b


func _cycle_speed() -> void:
	speed = {1: 2, 2: 4, 4: 1}[speed]
	_speed_button.text = "%dx" % speed


func _toggle_pause() -> void:
	paused = not paused
	_pause_button.text = "Seguir" if paused else "Pausar"


func _load_scenario(index: int) -> void:
	scenario_index = index
	scenario = Scenarios.build(db, index)
	var seed := 1000 + index
	sim = CombatSim.new(db, scenario.dungeon, scenario.party, seed, {"power": scenario.power})
	_event_cursor = 0
	_floaters.clear()
	_log.clear()
	_display_pos.clear()
	_acc = 0.0
	_log_line("Cenário: %s" % scenario.title)
	if scenario.hint != "":
		_log_line(scenario.hint)


func _unhandled_input(event: InputEvent) -> void:
	var pos := Vector2.INF
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		pos = event.position
	elif event is InputEventScreenTouch and event.pressed:
		pos = event.position
	if pos == Vector2.INF or sim == null or sim.finished:
		return
	for s in db.layout.slots:
		if Rect2(_slot_center(s.id) - ROOM_SIZE / 2, ROOM_SIZE).has_point(pos):
			sim.commands.append({"t": sim.tick, "target": s.id})
			return


# --- Laço -----------------------------------------------------------------------

func _process(delta: float) -> void:
	if sim == null:
		return
	if not paused and not sim.finished:
		_acc += delta * db.balance.ticks_per_second * speed
		while _acc >= 1.0 and not sim.finished:
			_acc -= 1.0
			_step_sim()
	for u in sim.units:
		var target := _unit_target_pos(u)
		var cur: Vector2 = _display_pos.get(u.uid, target)
		_display_pos[u.uid] = cur.lerp(target, clampf(delta * 12.0, 0.0, 1.0))
	for f in _floaters:
		f.age += delta
	_floaters = _floaters.filter(func(f): return f.age < 1.2)
	for fl in _flashes:
		fl.age += delta
	_flashes = _flashes.filter(func(fl): return fl.age < 0.7)
	queue_redraw()


func _step_sim() -> void:
	sim.step()
	while _event_cursor < sim.events.size():
		_on_event(sim.events[_event_cursor])
		_event_cursor += 1


func _on_event(e: Dictionary) -> void:
	var u: Object = _unit(e.get("u", 0))
	var where: Vector2 = _unit_target_pos(u) if u != null else Vector2.ZERO
	match e.type:
		"damage":
			if e.amount > 0 or e.get("absorbed", 0) > 0:
				var txt := str(e.amount) + ("!" if e.get("crit", false) else "")
				if e.get("absorbed", 0) > 0:
					txt += " (%d)" % e.absorbed
				_float(where, txt, DTYPE_COLORS.get(e.dtype, Color.WHITE), 18 if e.get("crit", false) else 14)
		"heal":
			_float(where, "+%d" % e.amount, COLORS.hp, 13)
		"status":
			_float(where + Vector2(0, -14), STATUS_TEXT.get(e.status, e.status), Color("ffd27a"), 12)
		"spawn":
			_log_line("%s entrou na masmorra" % u.name)
		"trap":
			_log_line("%s ativou %s" % [u.name, db.traps[e.trap].name])
			_float(where + Vector2(0, -24), db.traps[e.trap].name, Color("ff6b6b"), 14)
		"disarm":
			_log_line("%s desarmou %s" % [u.name, db.traps[e.trap].name])
			_float(where + Vector2(0, -24), "desarmou", Color("f0ad4e"), 14)
		"effect_blocked":
			_log_line("%s anulou %s" % [u.name, e.source])
			_float(where + Vector2(0, -24), "anulado", COLORS.shield, 14)
		"death":
			_log_line("%s morreu" % u.name)
		"heart_hit":
			_log_line("%s atingiu o Coração (-%d)" % [u.name, e.amount])
			_float(_slot_center(db.layout.heart), "-%d PV" % e.amount, COLORS.heart, 22)
		"loot":
			_log_line("%s levou o baú (%d de ouro)" % [u.name, e.gold])
		"power":
			_log_line("Poder: %s em %s" % [db.powers[e.id].name, e.target])
			_float(_slot_center(e.target), db.powers[e.id].name + "!", COLORS.mana, 22)
			_flashes.append({"slot": e.target, "age": 0.0})
		"power_failed":
			var why: String = e.get("reason", "mana insuficiente")
			if why == "mana insuficiente":
				why = "falta mana %d/%d" % [e.mana, sim.power_cost]
			_log_line("Poder recusado: %s" % why)
			_float(_slot_center(e.target), why, Color("ff6b6b"), 13)
		"blink":
			_log_line("%s: Passo da Tempestade" % u.name)
			_float(where + Vector2(0, -24), "Passo!", CLASS_COLORS.kaelen, 15)
		"revive":
			_log_line("%s reviveu" % u.name)
		"summon":
			_log_line("%s surgiu" % u.name)
		"push":
			_log_line("%s foi empurrado" % u.name)
		"flee":
			_log_line("%s fugiu (tempo esgotado)" % u.name)
		"end":
			var r: Dictionary = sim.result
			_log_line("FIM: Coração %d PV (-%d) | abates %d | ouro %d + baú %d" %
					[r.heart_hp, r.heart_damage, r.kills, r.kill_gold, r.treasure_gold])


func _float(pos: Vector2, text: String, color: Color, size: int) -> void:
	# Espalha horizontalmente para números simultâneos não se sobreporem.
	var jitter := float((_event_cursor * 7) % 5 - 2) * 10.0
	_floaters.append({"pos": pos + Vector2(jitter, 0), "text": text, "color": color, "age": 0.0, "size": size})


func _log_line(text: String) -> void:
	var secs: float = 0.0 if sim == null else float(sim.tick) / db.balance.ticks_per_second
	_log.append("%5.1fs  %s" % [secs, text])
	while _log.size() > 8:
		_log.pop_front()


# --- Geometria --------------------------------------------------------------------

func _slot_center(slot: String) -> Vector2:
	for s in db.layout.slots:
		if s.id == slot:
			return Vector2(105 + (s.pos[0] - 1) * 165, 140 + s.pos[1] * 118)
	return Vector2.ZERO


func _unit_target_pos(u: Object) -> Vector2:
	if u == null:
		return Vector2.ZERO
	var center := _slot_center(u.slot)
	if u.side == "monster":
		var mates := sim.units.filter(func(m): return m.side == "monster" and m.slot == u.slot and m.is_alive())
		var i := mates.find(u)
		var n := maxi(mates.size(), 1)
		return center + Vector2((i - (n - 1) / 2.0) * 34, 14)
	if not u.spawned:
		return _slot_center(db.layout.entrance) + Vector2(0, -60)
	var pos := center
	if u.path_index + 1 < u.path.size():
		var next_slot: String = u.path[u.path_index + 1]
		var frac: float = float(u.progress) / db.balance.room_length
		if sim._is_blocked(next_slot):
			frac = minf(frac, 0.5)  # esperando diante da porta fechada
		pos = center.lerp(_slot_center(next_slot), frac)
	return pos + Vector2(((u.uid % 5) - 2) * 9, -18 + (u.uid % 3) * 6)


func _unit(uid: int) -> Object:
	for u in sim.units:
		if u.uid == uid:
			return u
	return null


# --- Desenho -----------------------------------------------------------------------

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, Vector2(540, 960)), COLORS.bg)
	if sim == null:
		return
	_draw_header()
	for e in db.layout.edges:
		if sim.dungeon.passable(e[0]) and sim.dungeon.passable(e[1]):
			draw_line(_slot_center(e[0]), _slot_center(e[1]), COLORS.edge, 6.0)
	for s in db.layout.slots:
		_draw_slot(s.id)
	for u in sim.units:
		if u.side == "monster" and u.is_alive():
			_draw_unit(u)
	for u in sim.units:
		if u.side == "invader" and u.is_alive() and u.spawned:
			_draw_unit(u)
	for f in _floaters:
		var a := clampf(1.2 - f.age, 0.0, 1.0)
		var c: Color = f.color
		c.a = a
		_text(f.pos + Vector2(0, -30 * f.age), f.text, f.size, c, true)
	_draw_log()


func _draw_header() -> void:
	_text(Vector2(14, 26), "%s  (cenário %d/%d)" % [scenario.title, scenario_index + 1, Scenarios.names().size()], 16, COLORS.text)
	var secs: float = float(sim.tick) / db.balance.ticks_per_second
	_text(Vector2(14, 50), "Coração %d/%d PV   tempo %.1fs   %s" % [sim.heart_hp, db.balance.heart_hp, secs,
			"PAUSADO" if paused else ""], 14, COLORS.heart)
	if not sim.power.is_empty():
		var w := 200.0
		var ready: bool = sim.mana >= sim.power_cost
		var fill: Color = COLORS.mana if ready else Color("4a5a78")
		draw_rect(Rect2(14, 62, w, 12), COLORS.hp_bg)
		draw_rect(Rect2(14, 62, w * sim.mana / db.balance.mana_max, 12), fill)
		var cost_x: float = 14 + w * sim.power_cost / db.balance.mana_max
		draw_line(Vector2(cost_x, 58), Vector2(cost_x, 78), Color.WHITE, 2.0)
		var label := "%s: PRONTO, toque numa sala" % sim.power.name if ready \
				else "%s: mana %d/%d" % [sim.power.name, sim.mana, sim.power_cost]
		_text(Vector2(222, 73), label, 12, COLORS.mana if ready else COLORS.dim)


func _draw_slot(slot: String) -> void:
	var c := _slot_center(slot)
	var rect := Rect2(c - ROOM_SIZE / 2, ROOM_SIZE)
	var state: String = sim.dungeon.slot_state[slot]
	var kind: String = sim.dungeon.slot_kind[slot]
	if state == "rock":
		draw_rect(rect, COLORS.rock)
		_text(c + Vector2(0, 4), "rocha", 11, COLORS.dim, true)
		return
	var room: Variant = sim.dungeon.contents[slot].room
	var fill: Color = COLORS.room if room != null or kind == "heart" else COLORS.tunnel
	if kind == "heart":
		fill = Color("4a2630")
	if sim._is_blocked(slot):
		fill = Color("1f3550")
	draw_rect(rect, fill)
	draw_rect(rect, COLORS.room_line, false, 2.0)
	var title := slot
	if kind == "heart":
		title = "CORAÇÃO %d" % sim.heart_hp
	elif kind == "entrance":
		title = "entrada"
	elif room != null:
		title = "%s %s" % [slot, db.rooms[room.id].name]
	_text(rect.position + Vector2(5, 14), title, 11, COLORS.text)
	var traps: Array = sim._traps.get(slot, [])
	for i in traps.size():
		var t: Dictionary = traps[i]
		var col := Color("ff6b6b") if t.armed else Color("5a4a50")
		_text(rect.position + Vector2(5 + i * 64, ROOM_SIZE.y - 6), db.traps[t.id].name, 10, col)
	if sim._chests.has(slot):
		_text(rect.position + Vector2(ROOM_SIZE.x - 40, ROOM_SIZE.y - 6), "baú %d" % sim._chests[slot], 10, Color("ffd24a"))
	for z in sim._zones:
		if z.slot == slot and z.until > sim.tick:
			draw_rect(rect.grow(-3), Color(1, 0.4, 0.1, 0.18))
	for fl in _flashes:
		if fl.slot == slot:
			draw_rect(rect.grow(4), Color(0.6, 0.8, 1.0, 0.7 * (1.0 - fl.age / 0.7)))


func _draw_unit(u: Object) -> void:
	var p: Vector2 = _display_pos.get(u.uid, _unit_target_pos(u))
	var r := 13.0 if u.is_boss else (9.0 if u.summoned else 11.0)
	if u.side == "monster":
		var col: Color = COLORS.get(u.family, Color.GRAY)
		draw_rect(Rect2(p - Vector2(r, r), Vector2(r, r) * 2), col)
		_text(p + Vector2(0, 4), u.id.substr(0, 2).to_upper() + str(u.level), 10, Color.BLACK, true)
	else:
		var col: Color = CLASS_COLORS.get(u.id, Color.WHITE)
		draw_circle(p, r, col)
		if u.elite:
			draw_arc(p, r + 2, 0, TAU, 20, Color.WHITE, 1.5)
		_text(p + Vector2(0, 4), u.id.substr(0, 1).to_upper(), 11, Color.BLACK, true)
	var w := r * 2.4
	var bar := Rect2(p + Vector2(-w / 2, -r - 7), Vector2(w, 4))
	draw_rect(bar, COLORS.hp_bg)
	draw_rect(Rect2(bar.position, Vector2(w * u.hp / u.max_hp, 4)), COLORS.hp)
	if u.shield > 0:
		draw_rect(Rect2(bar.position - Vector2(0, 3), Vector2(w * mini(u.shield, u.max_hp) / u.max_hp, 2)), COLORS.shield)
	var marks := ""
	if u.cannot_act(sim.tick):
		marks += "Z"
	elif u.cannot_move(sim.tick):
		marks += "R"
	if u.is_slowed(sim.tick):
		marks += "L"
	if u.poison.any(func(s): return s.until > sim.tick):
		marks += "V"
	if u.burn.any(func(s): return s.until > sim.tick):
		marks += "F"
	if marks != "":
		_text(p + Vector2(r + 2, -r + 4), marks, 10, Color("ffd27a"))


func _draw_log() -> void:
	draw_rect(Rect2(0, 770, 540, 136), Color(0, 0, 0, 0.35))
	for i in _log.size():
		_text(Vector2(10, 788 + i * 16), _log[i], 12, COLORS.text if i == _log.size() - 1 else COLORS.dim)


func _text(pos: Vector2, text: String, size: int, color: Color, centered: bool = false) -> void:
	if centered:
		var w := _font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
		pos.x -= w / 2
	draw_string(_font, pos, text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, color)
