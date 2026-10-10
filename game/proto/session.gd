extends RefCounted
## Estado compartilhado entre telas do protótipo e progresso salvo.

const SAVE := "user://progresso_desafios.json"

static var challenge_index: int = 0


static func completed() -> Array:
	if not FileAccess.file_exists(SAVE):
		return []
	var data: Variant = JSON.parse_string(FileAccess.get_file_as_string(SAVE))
	return data.get("done", []) if data is Dictionary else []


static func mark_completed(id: String) -> void:
	var done := completed()
	if id in done:
		return
	done.append(id)
	var f := FileAccess.open(SAVE, FileAccess.WRITE)
	if f != null:
		f.store_string(JSON.stringify({"done": done}))
