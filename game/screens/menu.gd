extends Control
## Menu do protótipo 0.2: lista de desafios e o visualizador de debug.

const Challenges := preload("res://game/proto/challenges.gd")
const Session := preload("res://game/proto/session.gd")


func _ready() -> void:
	RenderingServer.set_default_clear_color(Color("17121a"))
	var box := VBoxContainer.new()
	box.position = Vector2(40, 60)
	box.size = Vector2(460, 840)
	box.add_theme_constant_override("separation", 12)
	add_child(box)
	var title := Label.new()
	title.text = "Covil"
	title.add_theme_font_size_override("font_size", 40)
	box.add_child(title)
	var sub := Label.new()
	sub.text = "Protótipo 0.2 — desafios em graybox.\nMonte a masmorra, assista à onda, entenda o que aconteceu."
	sub.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	sub.add_theme_color_override("font_color", Color("9c8c96"))
	box.add_child(sub)
	var done := Session.completed()
	var list := Challenges.load_all()
	for i in list.size():
		var ch: Dictionary = list[i]
		var b := Button.new()
		b.text = "%s%d. %s" % ["✓ " if ch.id in done else "", i + 1, ch.title]
		b.custom_minimum_size = Vector2(0, 56)
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.add_theme_font_size_override("font_size", 18)
		b.pressed.connect(_open.bind(i))
		box.add_child(b)
	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, 24)
	box.add_child(spacer)
	var dbg := Button.new()
	dbg.text = "Visualizador de combate (debug)"
	dbg.custom_minimum_size = Vector2(0, 44)
	dbg.pressed.connect(func(): get_tree().change_scene_to_file("res://game/debug/combat_viewer.tscn"))
	box.add_child(dbg)


func _open(index: int) -> void:
	Session.challenge_index = index
	get_tree().change_scene_to_file("res://game/screens/challenge_screen.tscn")
