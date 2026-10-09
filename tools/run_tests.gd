extends SceneTree
## Roda todos os tests/test_*.gd em modo headless.
##   godot --headless --path . --script res://tools/run_tests.gd [-- filtro]
## O filtro (opcional) restringe aos arquivos cujo nome contém o texto.
## Sai com código 1 se algum caso falhar.


func _init() -> void:
	var args := OS.get_cmdline_user_args()
	var filter := args[0] if args.size() > 0 else ""

	var files: Array[String] = []
	for f in DirAccess.get_files_at("res://tests"):
		if f.begins_with("test_") and f.ends_with(".gd") and f != "test_case.gd" and (filter.is_empty() or filter in f):
			files.append(f)
	files.sort()

	var total := 0
	var failed := 0
	var start := Time.get_ticks_msec()
	for f in files:
		var script: GDScript = load("res://tests/" + f)
		var suite: Object = script.new()
		var names: Array[String] = []
		for m in suite.get_method_list():
			if String(m.name).begins_with("test_"):
				names.append(m.name)
		names.sort()
		for n in names:
			suite.failures.clear()
			suite.call(n)
			total += 1
			if suite.failures.is_empty():
				continue
			failed += 1
			print("FALHOU %s::%s" % [f, n])
			for msg in suite.failures:
				print("    " + msg)

	var ms := Time.get_ticks_msec() - start
	print("%d testes, %d falhas (%d ms)" % [total, failed, ms])
	quit(1 if failed > 0 else 0)
