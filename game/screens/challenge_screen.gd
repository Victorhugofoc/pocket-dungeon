extends Node2D
## Tela de um desafio.
##   Preparação em duas etapas: 1) escavar e posicionar salas; 2) monstros e
##   armadilhas. Toque numa peça (do estoque ou já posicionada) para
##   selecioná-la e ver o que ela faz; toque num slot para colocá-la ou movê-la.
##   Onda: assistir; com mana suficiente as salas válidas acendem e basta tocar.
##   Relatório: o caminho de cada invasor, quem causou dano, dicas.

const Board := preload("res://game/ui/dungeon_board.gd")
const Challenges := preload("res://game/proto/challenges.gd")
const Session := preload("res://game/proto/session.gd")
const Pathing := preload("res://core/combat/pathing.gd")
const Report := preload("res://core/run/wave_report.gd")

const ROUTE_TEXT := {
	"most_monsters": "procura o ramo com mais monstros",
	"fewest_traps": "evita o ramo com mais armadilhas",
	"shortest": "vai pelo caminho mais curto",
	"treasure": "vai atrás do tesouro",
}
const STATUS_TEXT := {
	"stun": "atordoado", "root": "preso", "fear": "medo", "slow": "lento",
	"poison": "veneno", "burn": "queimando",
}
const KIND_COLOR := {"room": Color("c9b6ff"), "monster": Color("9be09b"), "trap": Color("ff9b9b")}
const STEP_TEXT := {
	1: "[b]Etapa 1: escavar e salas.[/b] Toque numa sala do estoque e depois num slot vazio (verde). Slots amarelos podem ser escavados: escavar transforma rocha em slot de sala, e abrir o ramo da direita cria um segundo caminho até o Coração.",
	2: "[b]Etapa 2: monstros e armadilhas.[/b] Toque numa peça e depois numa sala com espaço (verde). Monstros também podem ficar no Coração (Guardião). Toque numa peça já posicionada para movê-la ou devolvê-la.",
}
const BG := Color("17121a")
const SEED := 1

var db: Db
var challenges: Array = []
var ch: Dictionary = {}
var dungeon: Dungeon
var tray: Array = []
var digs_left: int = 0
var state: String = "prep"
var step: int = 1
## {} | {"src": "tray", "i"} | {"src": "board", "slot", "kind", "index"}
var sel: Dictionary = {}

var board: Node2D
var sim: CombatSim
var paused := true
var speed := 1
var slowmo := 0.0
var commands_used: Array = []
var _acc := 0.0
var _cursor := 0
var _log: Array = []

# Interface
var _title: Label
var _intro: Label
var _goal: Label
var _party: RichTextLabel
var _info: RichTextLabel
var _mana_bar: ProgressBar
var _power_info: RichTextLabel
var _steps_bar: HBoxContainer
var _step_buttons: Array = []
var _tray_box: HFlowContainer
var _prep_bar: HBoxContainer
var _return_button: Button
var _combat_bar: HBoxContainer
var _play_button: Button
var _speed_button: Button
var _power_button: Button
var _banner: Label
var _report: PanelContainer
var _report_text: RichTextLabel
var _legend: PanelContainer


func _ready() -> void:
	RenderingServer.set_default_clear_color(BG)
	db = Db.load_from("res://data")
	challenges = Challenges.load_all()
	board = Board.new()
	add_child(board)
	_build_ui()
	var shot := _parse_shot_args()
	_load(Session.challenge_index)
	if not shot.is_empty():
		_take_shot.call_deferred(shot)


# --- Carregar ------------------------------------------------------------------------

func _load(index: int) -> void:
	Session.challenge_index = index
	ch = challenges[index]
	_reset_build()
	_enter_prep()


func _reset_build() -> void:
	dungeon = Dungeon.new(db)
	tray = Challenges.pieces(ch)
	digs_left = ch.digs
	step = 1
	sel = {}


func _enter_prep() -> void:
	state = "prep"
	sim = null
	board.setup(db, dungeon)
	sel = {}
	_report.visible = false
	_banner.visible = false
	_set_mode_visibility()
	_title.text = "%s  (desafio %d/%d)" % [ch.title, Session.challenge_index + 1, challenges.size()]
	_intro.text = ch.intro
	_refresh_prep()


func _set_mode_visibility() -> void:
	var prep := state == "prep"
	_steps_bar.visible = prep
	_tray_box.visible = prep
	_prep_bar.visible = prep
	_party.visible = prep
	_combat_bar.visible = state == "combat"
	_mana_bar.visible = state == "combat"
	_power_info.visible = state == "combat"


# --- Preparação ----------------------------------------------------------------------

func _refresh_prep() -> void:
	_goal.text = "Meta: no máximo %d de dano ao Coração   ·   Escavações disponíveis: %d" % [ch.goal, digs_left]
	for i in _step_buttons.size():
		_step_buttons[i].button_pressed = step == i + 1
	for child in _tray_box.get_children():
		child.queue_free()
	var shown := 0
	for i in tray.size():
		var p: Dictionary = tray[i]
		if (step == 1) != (p.kind == "room"):
			continue
		shown += 1
		var b := Button.new()
		b.text = _piece_name(p)
		b.toggle_mode = true
		b.button_pressed = sel.get("src") == "tray" and sel.i == i
		b.custom_minimum_size = Vector2(0, 30)
		b.add_theme_font_size_override("font_size", 13)
		b.add_theme_color_override("font_color", KIND_COLOR[p.kind])
		b.pressed.connect(_on_tray.bind(i))
		_tray_box.add_child(b)
	if shown == 0:
		var l := Label.new()
		l.text = "Nenhuma sala sobrando: vá para a etapa 2." if step == 1 else "Estoque vazio: tudo posicionado."
		l.add_theme_color_override("font_color", Color("9c8c96"))
		_tray_box.add_child(l)
	_return_button.visible = sel.get("src") == "board"
	board.selected = {} if sel.get("src") != "board" else {"slot": sel.slot, "kind": sel.kind, "index": sel.index}
	board.highlight.clear()
	if not sel.is_empty():
		for slot in dungeon.contents:
			if _destination_ok(slot):
				board.highlight[slot] = Color("6fd36f")
	elif step == 1 and digs_left > 0:
		for slot in dungeon.contents:
			if dungeon.can_dig(slot) == "":
				board.highlight[slot] = Color("ffd24a")
	_update_party_text()
	_info.text = _selection_text() if not sel.is_empty() else STEP_TEXT[step]


func _selection_text() -> String:
	var p: Dictionary = _selected_piece()
	var where := "" if sel.src == "tray" else "  (posicionada em %s — toque em outro slot para mover)" % sel.slot
	return "[b][color=#%s]%s[/color][/b]%s\n%s" % [KIND_COLOR[p.kind].to_html(false), _piece_name(p), where, _piece_desc(p)]


func _selected_piece() -> Dictionary:
	if sel.src == "tray":
		return tray[sel.i]
	var c: Dictionary = dungeon.contents[sel.slot]
	match sel.kind:
		"room":
			return c.room
		"monster":
			return c.monsters[sel.index]
	return c.traps[sel.index]


func _destination_ok(slot: String) -> bool:
	var probe := Dungeon.new(db)
	probe.load_dict(dungeon.to_dict())
	if sel.src == "tray":
		return Challenges.place(probe, tray[sel.i], slot) == ""
	if slot == sel.slot:
		return false
	return _move(probe, sel, slot) == ""


## Move uma peça posicionada para `dest` (salas levam o conteúdo; trocam de lugar com outra sala).
func _move(d: Dungeon, s: Dictionary, dest: String) -> String:
	match s.kind:
		"room":
			if d.slot_kind[dest] != "slot" or d.slot_state[dest] != "room":
				return "salas só vão em slots escavados"
			var tmp: Dictionary = d.contents[s.slot]
			d.contents[s.slot] = d.contents[dest]
			d.contents[dest] = tmp
			return ""
		"monster", "trap":
			var list: Array = d.contents[s.slot].monsters if s.kind == "monster" else d.contents[s.slot].traps
			var piece: Dictionary = list.pop_at(s.index)
			var err := Challenges.place(d, piece, dest)
			if err != "":
				list.insert(s.index, piece)
			return err
	return "?"


func _on_tray(i: int) -> void:
	sel = {} if sel.get("src") == "tray" and sel.i == i else {"src": "tray", "i": i}
	_refresh_prep()


func _set_step(s: int) -> void:
	step = s
	sel = {}
	_refresh_prep()


func _prep_tap(pos: Vector2) -> void:
	var slot: String = board.slot_at(pos)
	if sel.get("src") == "tray":
		if slot == "":
			return
		var p: Dictionary = tray[sel.i]
		var err := Challenges.place(dungeon, p, slot)
		if err != "":
			_flash_error(slot, err)
			return
		tray.remove_at(sel.i)
		sel = {}
		if step == 1 and not tray.any(func(x): return x.kind == "room"):
			step = 2
		_refresh_prep()
		return
	if sel.get("src") == "board":
		var hit: Dictionary = board.piece_at(pos)
		if hit.get("slot") == sel.slot and hit.get("kind") == sel.kind and hit.get("index") == sel.index:
			sel = {}
			_refresh_prep()
			return
		if slot != "" and slot != sel.slot:
			var err := _move(dungeon, sel, slot)
			if err != "":
				_flash_error(slot, err)
				return
			sel = {}
			_refresh_prep()
			return
	var piece_hit: Dictionary = board.piece_at(pos)
	if not piece_hit.is_empty():
		sel = {"src": "board", "slot": piece_hit.slot, "kind": piece_hit.kind, "index": piece_hit.index}
		_refresh_prep()
		return
	if slot != "" and digs_left > 0 and dungeon.can_dig(slot) == "":
		dungeon.dig(slot)
		digs_left -= 1
		step = 1
		_refresh_prep()
		_info.text = "Escavado: [b]%s[/b]. Agora ele aceita uma sala. %s" % [slot,
				"O ramo da direita está aberto: os invasores podem escolher entre dois caminhos." if slot in ["c1", "c2"] else ""]


func _return_selected() -> void:
	if sel.get("src") != "board":
		return
	match sel.kind:
		"room":
			tray.append_array(dungeon.remove_room(sel.slot))
		"monster":
			tray.append(dungeon.remove_monster(sel.slot, sel.index))
		"trap":
			tray.append(dungeon.remove_trap(sel.slot, sel.index))
	sel = {}
	_refresh_prep()


func _restart_build() -> void:
	_reset_build()
	_enter_prep()


func _flash_error(slot: String, err: String) -> void:
	board.float_text(board.slot_center(slot), err, Color("ff6b6b"), 12)
	_info.text = "[color=#ff6b6b]Não deu: %s.[/color]\n%s" % [err, _selection_text() if not sel.is_empty() else ""]


func _update_party_text() -> void:
	var parts := []
	var seen := {}
	for entry in ch.party:
		var id: String = entry.get("boss", entry.get("id", ""))
		var def: Dictionary = db.bosses[id] if entry.has("boss") else db.adventurers[id]
		var name: String = def.name.split(",")[0]
		var mods: Array = entry.get("modifiers", []).map(func(m): return db.modifiers[m].name.to_lower())
		var label := name + ("" if mods.is_empty() else " (%s)" % ", ".join(mods))
		var col: Color = board.CLASS.get(id, Color.WHITE)
		parts.append("[color=#%s]%s[/color]" % [col.to_html(false), label])
		seen[name] = [col, ROUTE_TEXT[def.route_pref]]
	var routes := []
	for n in seen:
		routes.append("[color=#%s]%s[/color] %s" % [seen[n][0].to_html(false), n, seen[n][1]])
	_party.text = "[b]Grupo:[/b] %s\n[color=#9c8c96]Rotas tracejadas: %s.[/color]" % [", ".join(parts), "; ".join(routes)]
	if state == "prep":
		_compute_routes()


func _compute_routes() -> void:
	var passable := {}
	for s in dungeon.slot_state:
		passable[s] = dungeon.passable(s)
	var paths := Pathing.all_paths(dungeon.adjacency, passable, db.layout.entrance, db.layout.heart)
	var info := dungeon.route_info()
	var groups := {}
	var order := []
	var leader: Array = []
	for entry in ch.party:
		var id: String = entry.get("boss", entry.get("id", ""))
		var def: Dictionary = db.bosses[id] if entry.has("boss") else db.adventurers[id]
		var path := Pathing.choose(paths, def.route_pref, info, leader)
		if leader.is_empty():
			leader = path
		var key := ",".join(path)
		if not groups.has(key):
			groups[key] = {"path": path, "color": board.CLASS.get(id, Color.WHITE), "label": ""}
			order.append(key)
	board.routes = order.map(func(k): return groups[k])


# --- Onda ----------------------------------------------------------------------------

func _start_wave(replay_commands: Array = []) -> void:
	state = "combat"
	sel = {}
	board.selected = {}
	sim = CombatSim.new(db, dungeon, ch.party, SEED, {"power": ch.power, "commands": replay_commands.duplicate(true)})
	board.sim = sim
	board.routes = []
	board.highlight.clear()
	commands_used = replay_commands.duplicate(true)
	_cursor = 0
	_acc = 0.0
	_log.clear()
	paused = replay_commands.is_empty()
	_report.visible = false
	_set_mode_visibility()
	_banner.visible = paused
	_banner.text = "Toque em ▶ para começar a onda"
	_play_button.text = "▶" if paused else "❚❚"
	var p: Dictionary = db.powers[ch.power]
	_power_info.text = "[b]Poder: %s[/b] (custa %d de mana; a mana enche 1 por segundo). %s Quando estiver pronto, as salas válidas acendem em azul: toque numa delas." % [p.name, sim.power_cost, p.desc]
	_info.text = ""
	_add_log("A onda começa.")


func _process(delta: float) -> void:
	if state != "combat" or sim == null:
		return
	_mana_bar.max_value = db.balance.mana_max
	_mana_bar.value = sim.mana
	_goal.text = "Coração %d PV   ·   tempo %.1f s   ·   mana %d/%d" % [sim.heart_hp, sim.tick / 10.0, sim.mana, db.balance.mana_max]
	_update_power_ui()
	if paused or sim.finished:
		return
	slowmo = maxf(slowmo - delta, 0.0)
	var rate := 0.35 if slowmo > 0.0 else 1.0
	_acc += delta * db.balance.ticks_per_second * speed * rate
	while _acc >= 1.0 and not sim.finished:
		_acc -= 1.0
		sim.step()
		while _cursor < sim.events.size():
			_on_event(sim.events[_cursor])
			_cursor += 1
	if sim.finished:
		_show_report()


func _valid_power_targets() -> Array:
	var out := []
	for slot in dungeon.contents:
		if sim.power_target_error(slot) == "":
			out.append(slot)
	return out


func _update_power_ui() -> void:
	var p: Dictionary = db.powers[ch.power]
	var targets := _valid_power_targets()
	var ready: bool = sim.mana >= sim.power_cost
	board.highlight.clear()
	if targets.is_empty():
		_power_button.text = "%s: sem alvo" % p.name
		_power_button.disabled = true
	elif ready:
		_power_button.text = "%s PRONTO: toque numa sala azul" % p.name
		_power_button.disabled = false
		for s in targets:
			# Salas com invasores dentro ficam bem mais visíveis que as vazias.
			var busy: bool = sim.units.any(func(u): return u.side == "invader" and u.is_alive() and u.spawned and u.slot == s)
			board.highlight[s] = Color("6aa8ff") if busy else Color(0.42, 0.66, 1.0, 0.35)
	else:
		_power_button.text = "%s (%d/%d de mana)" % [p.name, sim.mana, sim.power_cost]
		_power_button.disabled = true


func _on_power_button() -> void:
	var targets := _valid_power_targets()
	if targets.is_empty():
		_add_log("Sem alvo: " + sim.power_target_error("b1"))
	else:
		_add_log("Toque numa sala destacada em azul para usar o poder.")


func _combat_tap(pos: Vector2) -> void:
	var slot: String = board.slot_at(pos)
	if slot == "" or sim.finished:
		return
	var err := sim.power_target_error(slot)
	if err == "" and sim.mana < sim.power_cost:
		err = "falta mana (%d/%d)" % [sim.mana, sim.power_cost]
	if err != "":
		board.float_text(board.slot_center(slot), err, Color("ff6b6b"), 12)
		return
	var cmd := {"t": sim.tick, "target": slot}
	sim.commands.append(cmd)
	commands_used.append(cmd)
	if paused:
		_toggle_play()


func _on_event(e: Dictionary) -> void:
	var u: Object = _unit(e.get("u", 0))
	var at: Vector2 = board.unit_pos(u)
	match e.type:
		"damage":
			if e.amount > 0 or e.get("absorbed", 0) > 0:
				var txt := str(e.amount) + ("!" if e.get("crit", false) else "")
				board.float_text(at, txt, board.DTYPE.get(e.dtype, Color.WHITE), 17 if e.get("crit", false) else 13)
		"heal":
			board.float_text(at, "+%d" % e.amount, Color("6fd36f"), 12)
		"status":
			board.float_text(at + Vector2(0, -14), STATUS_TEXT.get(e.status, e.status), Color("ffd27a"), 11)
		"trap":
			_add_log("%s ativou %s em %s" % [_short(u), db.traps[e.trap].name, e.slot])
			board.flash(e.slot, Color(1, 0.4, 0.4))
			board.float_text(board.slot_center(e.slot), db.traps[e.trap].name + "!", Color("ff6b6b"), 16)
			slowmo = 0.8
		"disarm":
			_add_log("%s desarmou %s" % [_short(u), db.traps[e.trap].name])
			board.float_text(board.slot_center(e.slot), "desarmou " + db.traps[e.trap].name, Color("f0ad4e"), 14)
		"effect_blocked":
			_add_log("%s anulou um efeito" % _short(u))
		"death":
			_add_log("%s morreu" % _short(u))
		"heart_hit":
			_add_log("%s ATINGIU O CORAÇÃO (-%d)" % [_short(u), e.amount])
			board.flash(db.layout.heart, Color(1, 0.2, 0.3))
			board.float_text(board.slot_center(db.layout.heart), "-%d PV" % e.amount, Color("e0405a"), 22)
			slowmo = 0.8
		"loot":
			_add_log("%s levou o baú e foi embora" % _short(u))
			board.flash(e.slot, Color(1, 0.85, 0.3))
			slowmo = 0.8
		"power":
			_add_log("Você usou %s em %s" % [db.powers[e.id].name, e.target])
			board.flash(e.target)
			board.float_text(board.slot_center(e.target), db.powers[e.id].name + "!", Color("6aa8ff"), 20)
		"power_failed":
			_add_log("Poder recusado: " + e.get("reason", ""))
		"blink":
			_add_log("%s atravessou a sala (Passo da Tempestade)" % _short(u))
			slowmo = 0.8
		"revive":
			_add_log("%s reviveu" % _short(u))
		"summon":
			_add_log("%s surgiu" % _short(u))
		"flee":
			_add_log("%s fugiu (tempo esgotado)" % _short(u))


func _toggle_play() -> void:
	paused = not paused
	_banner.visible = false
	_play_button.text = "▶" if paused else "❚❚"


func _cycle_speed() -> void:
	speed = {1: 2, 2: 4, 4: 1}[speed]
	_speed_button.text = "%dx" % speed


# --- Relatório ----------------------------------------------------------------------

func _show_report() -> void:
	state = "report"
	_set_mode_visibility()
	board.highlight.clear()
	var rep: Dictionary = Report.build(db, sim)
	var dmg: int = sim.result.heart_damage
	var won: bool = dmg <= ch.goal
	if won:
		Session.mark_completed(ch.id)
	var t := "[color=#6fd36f][b]Meta cumprida![/b][/color] " if won else "[color=#e0405a][b]Meta não cumprida.[/b][/color] "
	t += "Coração: %s (meta: no máximo %d).\n\n" % ["intacto" if dmg == 0 else "-%d PV" % dmg, ch.goal]
	t += "[b]O caminho de cada invasor[/b]\n"
	for inv in rep.invaders:
		t += "• [b]%s[/b]: %s\n   %s\n" % [_short(_unit(inv.uid)), _outcome_text(inv), _journey_text(inv)]
	if not rep.top_monsters.is_empty():
		t += "\n[b]Quem mais causou dano[/b]\n"
		for m in rep.top_monsters:
			t += "• %s: %d\n" % [m.name, m.damage]
	t += "\n[b]Dica[/b]\n"
	for tip in rep.tips:
		t += "• %s\n" % tip
	if not won:
		t += "• %s\n" % ch.hint
	_report_text.text = t
	_report.visible = true
	_banner.visible = false


func _outcome_text(inv: Dictionary) -> String:
	match inv.outcome:
		"dead":
			var k: String = "" if inv.killer == "" else ", golpe final de %s" % inv.killer.split(",")[0]
			return "[color=#6fd36f]morreu em %s[/color]%s" % [inv.slot, k]
		"escaped":
			return "[color=#e0405a]chegou ao Coração (-%d)[/color]" % _unit(inv.uid).heart_damage
		"looted":
			return "[color=#ffd24a]levou o baú em %s e foi embora[/color]" % inv.slot
		"fled":
			return "fugiu quando o tempo acabou"
	return inv.outcome


## "a1 → b1 (parou 9 s) → b2 → d1 → Coração"
func _journey_text(inv: Dictionary) -> String:
	var parts := []
	for s in inv.steps:
		if s.slot == db.layout.entrance:
			continue
		var name: String = "Coração" if s.slot == db.layout.heart else s.slot
		parts.append(name + (" (%d s)" % s.secs if s.secs >= 3 else ""))
	return "[color=#9c8c96]caminho: %s[/color]" % " → ".join(parts)


# --- Utilidades ---------------------------------------------------------------------

func _short(u: Object) -> String:
	return "?" if u == null else u.name.split(",")[0]


func _piece_name(p: Dictionary) -> String:
	match p.kind:
		"monster":
			return "%s %d" % [db.monster_at(p.id, p.level, p.get("variant", "")).name, p.level]
		"room":
			return "%s %d" % [db.rooms[p.id].name, p.level]
	return "%s %d" % [db.traps[p.id].name, p.level]


func _piece_desc(p: Dictionary) -> String:
	match p.kind:
		"monster":
			var m: Dictionary = db.monster_at(p.id, p.level, p.get("variant", ""))
			return "Vida %d · ataque %d · %s. %s" % [m.hp, m.atk, "à distância" if m.range == "ranged" else "corpo a corpo", db.monsters[p.id].desc]
		"room":
			return db.rooms[p.id].desc
	return db.traps[p.id].desc


func _unit(uid: int) -> Object:
	if sim == null:
		return null
	for u in sim.units:
		if u.uid == uid:
			return u
	return null


func _add_log(text: String) -> void:
	_log.append("%4.1fs  %s" % [sim.tick / 10.0, text])
	while _log.size() > 4:
		_log.pop_front()
	_info.text = "\n".join(_log)


func _unhandled_input(event: InputEvent) -> void:
	var pos := Vector2.INF
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		pos = event.position
	elif event is InputEventScreenTouch and event.pressed:
		pos = event.position
	if pos == Vector2.INF or _legend.visible or _report.visible:
		return
	if state == "prep":
		_prep_tap(pos)
	elif state == "combat":
		_combat_tap(pos)


# --- Construção da interface ---------------------------------------------------------

func _build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	_title = _label(layer, Vector2(12, 6), 516, 17)
	_intro = _label(layer, Vector2(12, 30), 516, 12)
	_goal = _label(layer, Vector2(12, 68), 516, 12)
	_goal.add_theme_color_override("font_color", Color("e0405a"))
	_party = _rich(layer, Vector2(12, 88), Vector2(516, 62), 11)
	_mana_bar = ProgressBar.new()
	_mana_bar.position = Vector2(12, 88)
	_mana_bar.size = Vector2(516, 12)
	_mana_bar.show_percentage = false
	_mana_bar.add_theme_stylebox_override("fill", _box(Color("6aa8ff"), Color("6aa8ff"), 0))
	_mana_bar.add_theme_stylebox_override("background", _box(Color("2a2238"), Color("2a2238"), 0))
	layer.add_child(_mana_bar)
	_info = _rich(layer, Vector2(12, 718), Vector2(516, 82), 12)
	_power_info = _rich(layer, Vector2(12, 800), Vector2(516, 100), 12)

	_steps_bar = HBoxContainer.new()
	_steps_bar.position = Vector2(10, 802)
	_steps_bar.add_theme_constant_override("separation", 6)
	layer.add_child(_steps_bar)
	for s in [1, 2]:
		var b := _button(_steps_bar, "1. Escavar e salas" if s == 1 else "2. Monstros e armadilhas", _set_step.bind(s), 255, 32)
		b.toggle_mode = true
		_step_buttons.append(b)
	_tray_box = HFlowContainer.new()
	_tray_box.position = Vector2(10, 840)
	_tray_box.size = Vector2(520, 64)
	layer.add_child(_tray_box)

	_prep_bar = HBoxContainer.new()
	_prep_bar.position = Vector2(10, 910)
	_prep_bar.add_theme_constant_override("separation", 5)
	layer.add_child(_prep_bar)
	_button(_prep_bar, "Iniciar onda ▶", func(): _start_wave(), 132)
	_return_button = _button(_prep_bar, "Devolver", _return_selected, 82)
	_button(_prep_bar, "Recomeçar", _restart_build, 92)
	_button(_prep_bar, "Legenda", func(): _legend.visible = true, 80)
	_button(_prep_bar, "Dica", func(): _info.text = "[b]Dica:[/b] " + ch.hint, 52)
	_button(_prep_bar, "Menu", _go_menu, 60)

	_combat_bar = HBoxContainer.new()
	_combat_bar.position = Vector2(10, 910)
	_combat_bar.add_theme_constant_override("separation", 6)
	layer.add_child(_combat_bar)
	_play_button = _button(_combat_bar, "▶", _toggle_play, 54)
	_speed_button = _button(_combat_bar, "1x", _cycle_speed, 54)
	_power_button = _button(_combat_bar, "Poder", _on_power_button, 300)
	_button(_combat_bar, "Legenda", func(): _legend.visible = true, 96)

	_banner = _label(layer, Vector2(20, 420), 500, 20)
	_banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_banner.add_theme_color_override("font_outline_color", Color.BLACK)
	_banner.add_theme_constant_override("outline_size", 6)

	_report = PanelContainer.new()
	_report.add_theme_stylebox_override("panel", _box(Color("221a24"), Color("8a7484"), 10))
	_report.position = Vector2(14, 96)
	_report.size = Vector2(512, 850)
	layer.add_child(_report)
	var vb := VBoxContainer.new()
	_report.add_child(vb)
	_report_text = RichTextLabel.new()
	_report_text.bbcode_enabled = true
	_report_text.custom_minimum_size = Vector2(490, 770)
	_report_text.add_theme_font_size_override("normal_font_size", 13)
	_report_text.add_theme_font_size_override("bold_font_size", 14)
	vb.add_child(_report_text)
	var rb := HBoxContainer.new()
	rb.add_theme_constant_override("separation", 6)
	vb.add_child(rb)
	_button(rb, "Ajustar e tentar", _enter_prep, 150)
	_button(rb, "Rever a onda", func(): _start_wave(commands_used), 126)
	_button(rb, "Próximo", func(): _load((Session.challenge_index + 1) % challenges.size()), 100)
	_button(rb, "Menu", _go_menu, 80)
	_report.visible = false

	_legend = PanelContainer.new()
	_legend.add_theme_stylebox_override("panel", _box(Color("221a24"), Color("8a7484"), 10))
	_legend.position = Vector2(14, 96)
	_legend.size = Vector2(512, 760)
	layer.add_child(_legend)
	var lv := VBoxContainer.new()
	_legend.add_child(lv)
	var lt := RichTextLabel.new()
	lt.bbcode_enabled = true
	lt.custom_minimum_size = Vector2(490, 690)
	lt.add_theme_font_size_override("normal_font_size", 13)
	lt.text = """[b]Objetivo[/b]
Os invasores entram por cima e descem até o [color=#e0405a]CORAÇÃO[/color]. Cada um que chega tira PV dele. A meta de cada desafio diz quanto dano você pode tomar.

[b]Regras principais[/b]
• Um invasor [b]para na primeira sala com monstros vivos[/b] e luta até eles morrerem.
• Monstros precisam de uma sala; o Coração aceita um monstro (Guardião).
• Armadilhas disparam no primeiro invasor que entra na sala.
• Armadura reduz só dano físico. Veneno e magia passam direto.
• [b]Escavar[/b] transforma rocha em slot de sala. Abrir o ramo da direita cria um segundo caminho: cada classe escolhe o seu (veja as rotas tracejadas).
• Ladinos pegam o baú da Sala de Tesouro (se ela estiver sem monstros) e vão embora sem atacar o Coração.
• [b]Poder[/b]: a mana enche 1 por segundo. Quando dá para usar, as salas válidas acendem em azul; toque numa delas.

[b]Na tela[/b]
• [b]Quadrados[/b]: seus monstros (número = nível). Cor = família: [color=#6ccf8a]gosma[/color], [color=#c99a5b]besta[/color], [color=#d4d05a]goblinoide[/color].
• [b]Círculos[/b]: invasores (letra = classe). Contorno branco = elite ou chefe.
• Texto [color=#ff6b6b]vermelho[/color] na sala = armadilha armada (cinza = já usada).
• Letras ao lado: Z atordoado, R preso, L lento, V veneno, F queimando.
• Números: branco físico, [color=#c79bff]roxo mágico[/color], [color=#ff8a3d]laranja fogo[/color], [color=#8be36b]verde veneno[/color]."""
	lv.add_child(lt)
	_button(lv, "Fechar", func(): _legend.visible = false, 120)
	_legend.visible = false


func _label(parent: Node, pos: Vector2, width: float, size: int) -> Label:
	var l := Label.new()
	l.position = pos
	l.size = Vector2(width, 0)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.add_theme_font_size_override("font_size", size)
	parent.add_child(l)
	return l


func _rich(parent: Node, pos: Vector2, size: Vector2, font_size: int) -> RichTextLabel:
	var r := RichTextLabel.new()
	r.bbcode_enabled = true
	r.position = pos
	r.size = size
	r.scroll_active = false
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	r.add_theme_font_size_override("normal_font_size", font_size)
	r.add_theme_font_size_override("bold_font_size", font_size)
	parent.add_child(r)
	return r


func _button(parent: Node, text: String, cb: Callable, width: float, height: float = 40) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(width, height)
	b.add_theme_font_size_override("font_size", 13)
	b.pressed.connect(cb)
	parent.add_child(b)
	return b


func _box(bg: Color, border: Color, margin: int) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(2 if margin > 0 else 0)
	s.set_corner_radius_all(6 if margin > 0 else 3)
	s.set_content_margin_all(margin)
	return s


func _go_menu() -> void:
	get_tree().change_scene_to_file("res://game/screens/menu.tscn")


# --- Captura de tela (revisão) -------------------------------------------------------

## godot --path . --quit-after 3000 res://game/screens/challenge_screen.tscn -- --shot a.png --challenge 1 [--solution] [--step 2] [--select N] [--tick T] [--report]
func _parse_shot_args() -> Dictionary:
	var args := OS.get_cmdline_user_args()
	var shot := {}
	for i in args.size():
		match args[i]:
			"--shot":
				shot["path"] = args[i + 1]
			"--challenge":
				Session.challenge_index = int(args[i + 1])
			"--solution":
				shot["solution"] = true
			"--tick":
				shot["tick"] = int(args[i + 1])
			"--report":
				shot["report"] = true
			"--step":
				shot["step"] = int(args[i + 1])
			"--select":
				shot["select"] = int(args[i + 1])
	return shot


func _take_shot(shot: Dictionary) -> void:
	if shot.get("solution", false):
		dungeon = Dungeon.new(db)
		Challenges.build_solution(db, ch, dungeon)
		tray = []
		_enter_prep()
	if shot.has("step"):
		_set_step(shot.step)
	if shot.has("select"):
		_on_tray(shot.select)
	if shot.has("tick") or shot.get("report", false):
		_start_wave()
		_banner.visible = false
		var target: int = shot.get("tick", 100000)
		while not sim.finished and sim.tick < target:
			sim.step()
			while _cursor < sim.events.size():
				_on_event(sim.events[_cursor])
				_cursor += 1
		if sim.finished:
			_show_report()
		else:
			_process(0.0)
		for u in sim.units:
			board._display[u.uid] = board.unit_pos(u)
	await RenderingServer.frame_post_draw
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(shot.path)
	print("captura salva em ", shot.path)
	get_tree().quit()
