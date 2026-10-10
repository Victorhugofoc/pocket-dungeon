extends Node2D
## Tela de um desafio: preparação (montar a masmorra por toque), onda (assistir
## e usar o poder) e relatório (por que ganhou/perdeu, tentar de novo).

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
const BG := Color("17121a")
const SEED := 1

var db: Db
var challenges: Array = []
var ch: Dictionary = {}
var dungeon: Dungeon
var tray: Array = []
var digs_left: int = 0
var state: String = "prep"

var board: Node2D
var sim: CombatSim
var paused := true
var speed := 1
var slowmo := 0.0
var targeting := false
var commands_used: Array = []
var _acc := 0.0
var _cursor := 0
var _log: Array = []
var _selected := -1

# Interface
var _title: Label
var _party: Label
var _routes_label: Label
var _status: Label
var _message: Label
var _log_label: Label
var _tray_box: HFlowContainer
var _prep_bar: HBoxContainer
var _combat_bar: HBoxContainer
var _play_button: Button
var _speed_button: Button
var _power_button: Button
var _mana_bar: ProgressBar
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


## Captura para revisão sem abrir o editor:
##   godot --path . --quit-after 1200 res://game/screens/challenge_screen.tscn -- --shot a.png --challenge 1 [--solution] [--tick 120] [--report]
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
	return shot


func _take_shot(shot: Dictionary) -> void:
	if shot.get("solution", false):
		dungeon = Dungeon.new(db)
		Challenges.build_solution(db, ch, dungeon)
		tray = []
		_enter_prep()
	if shot.has("tick") or shot.get("report", false):
		_start_wave()
		paused = false
		var target: int = shot.get("tick", 100000)
		while not sim.finished and sim.tick < target:
			sim.step()
			while _cursor < sim.events.size():
				_on_event(sim.events[_cursor])
				_cursor += 1
		paused = true
		if sim.finished:
			_show_report()
		for u in sim.units:
			board._display[u.uid] = board.unit_pos(u)
	await RenderingServer.frame_post_draw
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(shot.path)
	print("captura salva em ", shot.path)
	get_tree().quit()


# --- Carregar / preparar ---------------------------------------------------------

func _load(index: int) -> void:
	Session.challenge_index = index
	ch = challenges[index]
	dungeon = Dungeon.new(db)
	tray = Challenges.pieces(ch)
	digs_left = ch.digs
	_enter_prep()


func _enter_prep() -> void:
	state = "prep"
	sim = null
	targeting = false
	board.setup(db, dungeon)
	_selected = -1
	_report.visible = false
	_prep_bar.visible = true
	_tray_box.visible = true
	_combat_bar.visible = false
	_mana_bar.visible = false
	_routes_label.visible = true
	_log_label.visible = false
	_banner.visible = false
	_title.text = "%s  (desafio %d/%d)" % [ch.title, Session.challenge_index + 1, challenges.size()]
	_party.text = ch.intro + "\nGrupo: " + _party_names()
	_message.text = "Toque numa peça abaixo e depois num slot. Toque numa peça posicionada para devolvê-la."
	_refresh_prep()


func _refresh_prep() -> void:
	_status.text = "Meta: no máximo %d de dano ao Coração.   Escavações: %d" % [ch.goal, digs_left]
	for child in _tray_box.get_children():
		child.queue_free()
	for i in tray.size():
		var p: Dictionary = tray[i]
		var b := Button.new()
		b.text = _piece_name(p)
		b.toggle_mode = true
		b.button_pressed = i == _selected
		b.custom_minimum_size = Vector2(0, 40)
		b.add_theme_color_override("font_color", {"room": Color("c9b6ff"), "monster": Color("9be09b"), "trap": Color("ff9b9b")}[p.kind])
		b.pressed.connect(_on_tray.bind(i))
		_tray_box.add_child(b)
	board.highlight.clear()
	if _selected >= 0:
		for slot in dungeon.contents:
			if _can_place(tray[_selected], slot):
				board.highlight[slot] = Color("6fd36f")
	elif digs_left > 0:
		for slot in dungeon.contents:
			if dungeon.can_dig(slot) == "":
				board.highlight[slot] = Color("ffd24a")
	_update_routes()


func _can_place(p: Dictionary, slot: String) -> bool:
	var probe := Dungeon.new(db)
	probe.load_dict(dungeon.to_dict())
	return Challenges.place(probe, p, slot) == ""


func _on_tray(i: int) -> void:
	_selected = -1 if _selected == i else i
	_refresh_prep()


func _prep_tap(pos: Vector2) -> void:
	var slot: String = board.slot_at(pos)
	if _selected >= 0:
		if slot == "":
			return
		var err := Challenges.place(dungeon, tray[_selected], slot)
		if err != "":
			_message.text = "Não deu: %s." % err
			return
		_message.text = "%s posicionado em %s." % [_piece_name(tray[_selected]), slot]
		tray.remove_at(_selected)
		_selected = -1
		_refresh_prep()
		return
	var hit: Dictionary = board.piece_at(pos)
	if not hit.is_empty():
		var c: Dictionary = dungeon.contents[hit.slot]
		var piece: Variant = null
		match hit.kind:
			"monster":
				piece = dungeon.remove_monster(hit.slot, hit.index)
			"trap":
				piece = dungeon.remove_trap(hit.slot, hit.index)
			"room":
				if not c.monsters.is_empty() or not c.traps.is_empty():
					_message.text = "Esvazie a sala antes de devolvê-la."
					return
				piece = dungeon.remove_room(hit.slot)[0]
		if piece != null:
			tray.append(piece)
			_message.text = "%s voltou para o estoque." % _piece_name(piece)
			_refresh_prep()
		return
	if slot != "" and digs_left > 0 and dungeon.can_dig(slot) == "":
		dungeon.dig(slot)
		digs_left -= 1
		_message.text = "Escavado: %s. O outro lado do ramo vira passagem." % slot
		_refresh_prep()


func _update_routes() -> void:
	var passable := {}
	for s in dungeon.slot_state:
		passable[s] = dungeon.passable(s)
	var paths := Pathing.all_paths(dungeon.adjacency, passable, db.layout.entrance, db.layout.heart)
	var info := dungeon.route_info()
	var groups := {}
	var order := []
	var leader: Array = []
	for entry in ch.party:
		var def: Dictionary = db.bosses[entry.boss] if entry.has("boss") else db.adventurers[entry.id]
		var path := Pathing.choose(paths, def.route_pref, info, leader)
		if leader.is_empty():
			leader = path
		var key := ",".join(path)
		if not groups.has(key):
			groups[key] = {"path": path, "names": [], "color": board.CLASS.get(entry.get("boss", entry.get("id", "")), Color.WHITE)}
			order.append(key)
		groups[key].names.append(def.name.split(",")[0].substr(0, 1))
	board.routes = []
	for key in order:
		board.routes.append({"path": groups[key].path, "label": " ".join(groups[key].names), "color": groups[key].color})
	var prefs := {}
	for entry in ch.party:
		var def: Dictionary = db.bosses[entry.boss] if entry.has("boss") else db.adventurers[entry.id]
		prefs[def.name.split(",")[0]] = ROUTE_TEXT[def.route_pref]
	var lines := []
	for n in prefs:
		lines.append("%s %s" % [n, prefs[n]])
	_routes_label.text = "Rotas (tracejado): " + "; ".join(lines) + "."


# --- Onda -------------------------------------------------------------------------

func _start_wave(replay_commands: Array = []) -> void:
	state = "combat"
	var opts := {"power": ch.power, "commands": replay_commands.duplicate(true)}
	sim = CombatSim.new(db, dungeon, ch.party, SEED, opts)
	board.sim = sim
	board.routes = []
	board.highlight.clear()
	commands_used = replay_commands.duplicate(true)
	_cursor = 0
	_acc = 0.0
	_log.clear()
	paused = replay_commands.is_empty()
	targeting = false
	_report.visible = false
	_prep_bar.visible = false
	_tray_box.visible = false
	_combat_bar.visible = true
	_mana_bar.visible = true
	_routes_label.visible = false
	_log_label.visible = true
	_banner.visible = paused
	_banner.text = "Toque em ▶ para começar a onda" if paused else ""
	_message.text = ""
	_play_button.text = "▶" if paused else "❚❚"
	_add_log("Onda começa: " + _party_names())


func _process(delta: float) -> void:
	if state != "combat" or sim == null:
		return
	var p: Dictionary = db.powers[ch.power]
	_mana_bar.max_value = db.balance.mana_max
	_mana_bar.value = sim.mana
	var ready: bool = sim.mana >= sim.power_cost
	_power_button.text = "%s (%d)%s" % [p.name, sim.power_cost, "  ✓" if ready else ""]
	_power_button.disabled = not ready and not targeting
	_status.text = "Coração %d PV   tempo %.1fs   mana %d/%d" % [sim.heart_hp, sim.tick / 10.0, sim.mana, db.balance.mana_max]
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
			_add_log("%s ativou %s em %s" % [u.name, db.traps[e.trap].name, e.slot])
			board.flash(e.slot, Color(1, 0.4, 0.4))
			board.float_text(board.slot_center(e.slot), db.traps[e.trap].name + "!", Color("ff6b6b"), 16)
			slowmo = 0.8
		"disarm":
			_add_log("%s desarmou %s" % [u.name, db.traps[e.trap].name])
			board.float_text(board.slot_center(e.slot), "desarmou " + db.traps[e.trap].name, Color("f0ad4e"), 14)
		"effect_blocked":
			_add_log("%s anulou um efeito" % u.name)
		"death":
			_add_log("%s morreu" % u.name)
		"heart_hit":
			_add_log("%s ATINGIU O CORAÇÃO (-%d)" % [u.name, e.amount])
			board.flash(db.layout.heart, Color(1, 0.2, 0.3))
			board.float_text(board.slot_center(db.layout.heart), "-%d PV" % e.amount, Color("e0405a"), 22)
			slowmo = 0.8
		"loot":
			_add_log("%s levou o baú e foi embora" % u.name)
			board.flash(e.slot, Color(1, 0.85, 0.3))
			slowmo = 0.8
		"power":
			_add_log("Você usou %s em %s" % [db.powers[e.id].name, e.target])
			board.flash(e.target)
			board.float_text(board.slot_center(e.target), db.powers[e.id].name + "!", Color("6aa8ff"), 20)
		"power_failed":
			var why: String = e.get("reason", "")
			_add_log("Poder recusado: " + why)
			board.float_text(board.slot_center(e.target), why, Color("ff6b6b"), 12)
		"blink":
			_add_log("%s atravessou a sala (Passo da Tempestade)" % u.name)
			slowmo = 0.8
		"revive":
			_add_log("%s reviveu" % u.name)
		"summon":
			_add_log("%s surgiu" % u.name)
		"flee":
			_add_log("%s fugiu (tempo esgotado)" % u.name)


func _combat_tap(pos: Vector2) -> void:
	if not targeting:
		return
	var slot: String = board.slot_at(pos)
	if slot == "" or sim.power_target_error(slot) != "":
		if slot != "":
			board.float_text(board.slot_center(slot), sim.power_target_error(slot), Color("ff6b6b"), 12)
		return
	var cmd := {"t": sim.tick, "target": slot}
	sim.commands.append(cmd)
	commands_used.append(cmd)
	targeting = false
	board.highlight.clear()


func _on_power() -> void:
	targeting = not targeting
	board.highlight.clear()
	if targeting:
		for slot in dungeon.contents:
			if sim.power_target_error(slot) == "":
				board.highlight[slot] = Color("6aa8ff")
		_message.text = "Toque na sala alvo (destacadas em azul)."
	else:
		_message.text = ""


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
	var rep: Dictionary = Report.build(db, sim)
	var dmg: int = sim.result.heart_damage
	var won: bool = dmg <= ch.goal
	if won:
		Session.mark_completed(ch.id)
	var t := ""
	if won:
		t += "[color=#6fd36f][b]Meta cumprida![/b][/color] "
	else:
		t += "[color=#e0405a][b]Meta não cumprida.[/b][/color] "
	t += "Coração: %s (meta: no máximo %d).\n\n" % ["intacto" if dmg == 0 else "-%d PV" % dmg, ch.goal]
	t += "[b]O que aconteceu com cada invasor[/b]\n"
	for inv in rep.invaders:
		t += "• %s: %s\n" % [_invader_label(inv.uid), _outcome_text(inv)]
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
	_combat_bar.visible = false


func _outcome_text(inv: Dictionary) -> String:
	match inv.outcome:
		"dead":
			return "morreu em %s" % inv.slot
		"escaped":
			var u: Object = _unit(inv.uid)
			return "[color=#e0405a]chegou ao Coração (-%d)[/color]" % u.heart_damage
		"looted":
			return "[color=#ffd24a]levou o baú em %s e foi embora[/color]" % inv.slot
		"fled":
			return "fugiu quando o tempo acabou"
	return inv.outcome


func _invader_label(uid: int) -> String:
	var u: Object = _unit(uid)
	return u.name.split(",")[0] + (" (elite)" if u.elite and not u.is_boss else "")


# --- Utilidades ---------------------------------------------------------------------

func _party_names() -> String:
	var parts := []
	for e in ch.party:
		if e.has("boss"):
			parts.append(db.bosses[e.boss].name)
		else:
			var mods: Array = e.modifiers.map(func(m): return db.modifiers[m].name.to_lower())
			parts.append(db.adventurers[e.id].name + ("" if mods.is_empty() else " (%s)" % ", ".join(mods)))
	return ", ".join(parts)


func _piece_name(p: Dictionary) -> String:
	match p.kind:
		"monster":
			return "%s %d" % [db.monster_at(p.id, p.level, p.get("variant", "")).name, p.level]
		"room":
			return "%s %d" % [db.rooms[p.id].name, p.level]
	return "%s %d" % [db.traps[p.id].name, p.level]


func _unit(uid: int) -> Object:
	if sim == null:
		return null
	for u in sim.units:
		if u.uid == uid:
			return u
	return null


func _add_log(text: String) -> void:
	_log.append("%4.1fs %s" % [sim.tick / 10.0, text])
	while _log.size() > 4:
		_log.pop_front()
	_log_label.text = "\n".join(_log)


func _unhandled_input(event: InputEvent) -> void:
	var pos := Vector2.INF
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		pos = event.position
	elif event is InputEventScreenTouch and event.pressed:
		pos = event.position
	if pos == Vector2.INF or _legend.visible:
		return
	if state == "prep":
		_prep_tap(pos)
	elif state == "combat":
		_combat_tap(pos)


# --- Construção da interface ---------------------------------------------------------

func _build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	_title = _label(layer, Vector2(12, 8), 516, 17)
	_party = _label(layer, Vector2(12, 34), 516, 12)
	_status = _label(layer, Vector2(12, 96), 516, 13)
	_status.add_theme_color_override("font_color", Color("e0405a"))
	_routes_label = _label(layer, Vector2(12, 118), 516, 11)
	_routes_label.add_theme_color_override("font_color", Color("9c8c96"))
	_mana_bar = ProgressBar.new()
	_mana_bar.position = Vector2(12, 120)
	_mana_bar.size = Vector2(516, 14)
	_mana_bar.show_percentage = false
	_mana_bar.add_theme_stylebox_override("fill", _box(Color("6aa8ff"), Color("6aa8ff")))
	_mana_bar.add_theme_stylebox_override("background", _box(Color("2a2238"), Color("2a2238")))
	layer.add_child(_mana_bar)
	_message = _label(layer, Vector2(12, 792), 516, 12)
	_message.add_theme_color_override("font_color", Color("ffd27a"))
	_log_label = _label(layer, Vector2(12, 812), 516, 12)
	_tray_box = HFlowContainer.new()
	_tray_box.position = Vector2(10, 826)
	_tray_box.size = Vector2(520, 80)
	layer.add_child(_tray_box)

	_prep_bar = HBoxContainer.new()
	_prep_bar.position = Vector2(10, 912)
	_prep_bar.add_theme_constant_override("separation", 8)
	layer.add_child(_prep_bar)
	_button(_prep_bar, "Iniciar onda ▶", func(): _start_wave(), 170)
	_button(_prep_bar, "Dica", func(): _message.text = ch.hint, 80)
	_button(_prep_bar, "Legenda", func(): _legend.visible = true, 100)
	_button(_prep_bar, "Menu", _go_menu, 90)

	_combat_bar = HBoxContainer.new()
	_combat_bar.position = Vector2(10, 912)
	_combat_bar.add_theme_constant_override("separation", 8)
	layer.add_child(_combat_bar)
	_play_button = _button(_combat_bar, "▶", _toggle_play, 60)
	_speed_button = _button(_combat_bar, "1x", _cycle_speed, 60)
	_power_button = _button(_combat_bar, "Poder", _on_power, 210)
	_button(_combat_bar, "Legenda", func(): _legend.visible = true, 100)

	_banner = _label(layer, Vector2(20, 440), 500, 20)
	_banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_banner.add_theme_color_override("font_color", Color("ffffff"))
	_banner.add_theme_color_override("font_outline_color", Color.BLACK)
	_banner.add_theme_constant_override("outline_size", 6)

	_report = PanelContainer.new()
	_report.add_theme_stylebox_override("panel", _box(Color("221a24"), Color("8a7484")))
	_report.position = Vector2(20, 150)
	_report.size = Vector2(500, 640)
	layer.add_child(_report)
	var vb := VBoxContainer.new()
	_report.add_child(vb)
	_report_text = RichTextLabel.new()
	_report_text.bbcode_enabled = true
	_report_text.custom_minimum_size = Vector2(480, 560)
	_report_text.add_theme_font_size_override("normal_font_size", 14)
	_report_text.add_theme_font_size_override("bold_font_size", 15)
	vb.add_child(_report_text)
	var rb := HBoxContainer.new()
	rb.add_theme_constant_override("separation", 6)
	vb.add_child(rb)
	_button(rb, "Ajustar e tentar", _enter_prep, 150)
	_button(rb, "Rever a onda", func(): _start_wave(commands_used), 130)
	_button(rb, "Próximo", func(): _load((Session.challenge_index + 1) % challenges.size()), 100)
	_button(rb, "Menu", _go_menu, 80)
	_report.visible = false

	_legend = PanelContainer.new()
	_legend.add_theme_stylebox_override("panel", _box(Color("221a24"), Color("8a7484")))
	_legend.position = Vector2(20, 150)
	_legend.size = Vector2(500, 560)
	layer.add_child(_legend)
	var lv := VBoxContainer.new()
	_legend.add_child(lv)
	var lt := RichTextLabel.new()
	lt.bbcode_enabled = true
	lt.custom_minimum_size = Vector2(480, 480)
	lt.add_theme_font_size_override("normal_font_size", 14)
	lt.text = """[b]Como ler a masmorra[/b]
• Os invasores entram por cima e descem até o [color=#e0405a]CORAÇÃO[/color]. Cada um que chega tira PV dele.
• Um invasor [b]para na primeira sala com monstros vivos[/b] e luta até eles morrerem.
• [b]Quadrados[/b] são seus monstros (número = nível). Cor = família: [color=#6ccf8a]gosma[/color], [color=#c99a5b]besta[/color], [color=#d4d05a]goblinoide[/color].
• [b]Círculos[/b] são invasores (letra = classe). Contorno branco = elite ou chefe.
• Texto [color=#ff6b6b]vermelho[/color] embaixo da sala = armadilha armada (fica cinza depois de usada). Dispara no primeiro que entra.
• Linhas tracejadas = rota prevista de cada invasor.
• Letras ao lado: Z atordoado, R preso, L lento, V veneno, F queimando.
• Números: branco físico, [color=#c79bff]roxo mágico[/color], [color=#ff8a3d]laranja fogo[/color], [color=#8be36b]verde veneno[/color].
• Armadura reduz só dano físico. Veneno e magia passam direto.
• Ladinos levam o baú da Sala de Tesouro (se ela estiver sem monstros) e vão embora sem atacar o Coração."""
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


func _button(parent: Node, text: String, cb: Callable, width: float) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(width, 40)
	b.pressed.connect(cb)
	parent.add_child(b)
	return b


func _box(bg: Color, border: Color) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(2)
	s.set_corner_radius_all(6)
	s.set_content_margin_all(10)
	return s


func _go_menu() -> void:
	get_tree().change_scene_to_file("res://game/screens/menu.tscn")
