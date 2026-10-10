extends RefCounted
## Peças da run (monstros, salas, armadilhas) e as regras de merge.
##
## Peça: {"kind": "monster"|"room"|"trap", "id", "level", "variant", "paid"}
## `paid` é o ouro investido (soma das cópias fundidas); a venda devolve uma
## fração dele.


static func make(kind: String, id: String, level: int = 1, paid: int = 0) -> Dictionary:
	return {"kind": kind, "id": id, "level": level, "variant": "", "paid": paid}


static func max_level(db: Db, kind: String) -> int:
	match kind:
		"monster":
			return db.balance.max_monster_level
		"room":
			return db.balance.max_room_level
	return db.balance.max_trap_level


## Preço na loja: uma peça de nível N custa o mesmo que as 2^(N-1) cópias de nível 1.
static func price(db: Db, kind: String, level: int) -> int:
	return db.balance.cost[kind] * (1 << (level - 1))


static func same(a: Variant, b: Variant) -> bool:
	return a != null and b != null and a.kind == b.kind and a.id == b.id \
			and a.level == b.level and a.get("variant", "") == b.get("variant", "")


## Verifica se `a` e `b` podem ser fundidas; "" se sim, senão o motivo.
## `variant` é obrigatória quando o resultado chega ao nível de bifurcação.
static func can_merge(db: Db, a: Variant, b: Variant, variant: String = "") -> String:
	if not same(a, b):
		return "só peças iguais (mesmo tipo, nível e variante) se fundem"
	if a.level >= max_level(db, a.kind):
		return "já está no nível máximo"
	if needs_variant(db, a) and not variant in ["a", "b"]:
		return "escolha a variante (a ou b)"
	return ""


## true se fundir duas cópias de `piece` leva à escolha de variante.
static func needs_variant(db: Db, piece: Dictionary) -> bool:
	return piece.kind == "monster" and piece.level + 1 == db.balance.variant_level


static func merged(db: Db, a: Dictionary, b: Dictionary, variant: String = "") -> Dictionary:
	var out := a.duplicate()
	out.level = a.level + 1
	out.paid = a.paid + b.paid
	if needs_variant(db, a):
		out.variant = variant
	return out


static func describe(db: Db, piece: Dictionary) -> String:
	var name: String
	match piece.kind:
		"monster":
			name = db.monster_at(piece.id, piece.level, piece.get("variant", "")).name
		"room":
			name = db.rooms[piece.id].name
		_:
			name = db.traps[piece.id].name
	return "%s %d" % [name, piece.level]
