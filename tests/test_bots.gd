extends "res://tests/test_case.gd"
## Fumaça dos bots: o aleatório joga uma run inteira; o de busca prepara a
## primeira onda e deixa monstros posicionados. As runs completas dos bots de
## busca ficam no tools/run_bots.ps1 (lentas demais para a suíte).

const DbScript := preload("res://core/db.gd")
const RunScript := preload("res://core/run/run_state.gd")
const RandomBot := preload("res://tools/bots/random_bot.gd")
const SearchBot := preload("res://tools/bots/search_bot.gd")

var _db: Object = DbScript.load_from("res://data")


func test_random_bot_finishes_a_run() -> void:
	var bot: Object = RandomBot.new(_db, 5)
	var run: Object = RunScript.start(_db, 5, bot.setup())
	while run.status == "playing":
		bot.prep(run)
		run.play_wave(bot.commands(run))
	assert_ne(run.status, "playing")


func test_counter_bot_builds_a_defense() -> void:
	var bot: Object = SearchBot.new(_db, 9, true)
	var run: Object = RunScript.start(_db, 9, bot.setup())
	bot.prep(run)
	var monsters := 0
	for slot in run.dungeon.contents:
		monsters += run.dungeon.contents[slot].monsters.size()
	assert_true(monsters >= 1, "o bot deveria posicionar ao menos um monstro")
	assert_true(run.gold < 10, "o bot deveria gastar ouro na primeira loja")
