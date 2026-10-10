extends RefCounted
## Base dos bots de balanceamento. Um bot decide a fase de preparação de cada
## onda (`prep`) e os comandos de poder (`commands`). Todos usam o mesmo poder
## e a mesma regra de uso, para que só a preparação diferencie os bots.

const Pieces := preload("res://core/run/pieces.gd")

const PATH_ORDER := ["a1", "b1", "c1", "b2", "c2", "d1", "coracao"]
const POWER := "desabamento"
const POWER_TICK := 75

var db: Db
var rng: Rng
var name: String = "base"


func _init(p_db: Db, seed: int) -> void:
	db = p_db
	rng = Rng.new(seed, "bot")


func setup() -> Dictionary:
	return {"power": POWER, "pact": ""}


func prep(_run: RunState) -> void:
	pass


## Desabamento na primeira sala com monstros (onde a luta começa), quando a mana chega.
func commands(run: RunState) -> Array:
	return commands_for(run.dungeon)


static func commands_for(dungeon: Dungeon) -> Array:
	for slot in PATH_ORDER:
		if slot != "coracao" and not dungeon.contents[slot].monsters.is_empty():
			return [{"t": POWER_TICK, "target": slot}]
	return []


## Funde tudo que for possível, repetindo até não haver pares.
## choose_variant(piece) -> "a" | "b" é chamado quando o merge leva ao nível 3.
func auto_merge(run: RunState, choose_variant: Callable) -> void:
	var changed := true
	while changed:
		changed = false
		for b in run.bench.size():
			var p: Variant = run.bench[b]
			if p == null:
				continue
			var variant := ""
			if Pieces.needs_variant(db, p):
				variant = choose_variant.call(p)
			var target := find_in_dungeon(run.dungeon, p)
			if not target.is_empty() and run.merge_onto(b, target.slot, p.kind, target.index, variant) == "":
				changed = true
				break
			for j in run.bench.size():
				if j != b and run.merge_bench(b, j, variant) == "":
					changed = true
					break
			if changed:
				break


## Localiza na masmorra uma peça idêntica a `p` ({} se não houver).
static func find_in_dungeon(dungeon: Dungeon, p: Dictionary) -> Dictionary:
	for slot in PATH_ORDER:
		var c: Dictionary = dungeon.contents[slot]
		match p.kind:
			"room":
				if Pieces.same(c.room, p):
					return {"slot": slot, "index": 0}
			"monster":
				for i in c.monsters.size():
					if Pieces.same(c.monsters[i], p):
						return {"slot": slot, "index": i}
			"trap":
				for i in c.traps.size():
					if Pieces.same(c.traps[i], p):
						return {"slot": slot, "index": i}
	return {}


## Slots onde a peça pode ser posicionada agora, em ordem de caminho.
static func valid_slots(dungeon: Dungeon, p: Dictionary) -> Array:
	var out := []
	for slot in PATH_ORDER:
		var c: Dictionary = dungeon.contents[slot]
		match p.kind:
			"room":
				if dungeon.slot_kind[slot] == "slot" and dungeon.slot_state[slot] == "room" and c.room == null:
					out.append(slot)
			"monster":
				if c.monsters.size() < dungeon.capacity(slot):
					out.append(slot)
			"trap":
				if c.traps.size() < dungeon.trap_sockets(slot):
					out.append(slot)
	return out


## Slots que ainda podem ser escavados.
static func diggable(dungeon: Dungeon) -> Array:
	return PATH_ORDER.filter(func(s): return dungeon.can_dig(s) == "")
