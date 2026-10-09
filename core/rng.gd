class_name Rng
extends RefCounted
## Gerador determinístico (xoshiro128**) em aritmética de 32 bits.
##
## Só usa inteiros mascarados em 32 bits, sem float e sem overflow de int64,
## para dar a mesma sequência em desktop, web e Android. Cada domínio
## (combate, loja, ondas) usa um stream próprio, derivado da mesma semente.
## A referência em Python que gerou os valores dos testes está em tools/rng_ref.py.

const MASK := 0xFFFFFFFF
const GOLDEN := 0x9E3779B9

var _s: PackedInt64Array = PackedInt64Array([0, 0, 0, 0])


func _init(seed: int = 0, stream: String = "") -> void:
	var lo := seed & MASK
	var hi := (seed >> 32) & MASK
	var k := _fmix(lo ^ _fnv1a(stream))
	for i in 4:
		_s[i] = _fmix((k + i * GOLDEN + hi) & MASK)
	if _s[0] == 0 and _s[1] == 0 and _s[2] == 0 and _s[3] == 0:
		_s[0] = 1


## Próximo inteiro em [0, 2^32).
func next_u32() -> int:
	var s0 := _s[0]
	var s1 := _s[1]
	var s2 := _s[2]
	var s3 := _s[3]
	var result := (_rotl((s1 * 5) & MASK, 7) * 9) & MASK
	var t := (s1 << 9) & MASK
	s2 ^= s0
	s3 ^= s1
	s1 ^= s2
	s0 ^= s3
	s2 ^= t
	s3 = _rotl(s3, 11)
	_s[0] = s0
	_s[1] = s1
	_s[2] = s2
	_s[3] = s3
	return result


## Inteiro uniforme em [lo, hi], inclusive, sem viés (rejeição).
func range_int(lo: int, hi: int) -> int:
	assert(hi >= lo, "range_int: hi < lo")
	var n := hi - lo + 1
	if n > MASK:
		return lo + next_u32()
	var limit := ((MASK + 1) / n) * n
	var x := next_u32()
	while x >= limit:
		x = next_u32()
	return lo + x % n


## true com probabilidade bp / 10000 (pontos-base).
func chance_bp(bp: int) -> bool:
	return range_int(0, 9999) < bp


func pick(items: Array) -> Variant:
	assert(not items.is_empty(), "pick: lista vazia")
	return items[range_int(0, items.size() - 1)]


## Fisher-Yates in-place.
func shuffle(items: Array) -> void:
	for i in range(items.size() - 1, 0, -1):
		var j := range_int(0, i)
		var tmp: Variant = items[i]
		items[i] = items[j]
		items[j] = tmp


## Estado serializável, para salvar uma run no meio.
func get_state() -> PackedInt64Array:
	return _s.duplicate()


func set_state(state: PackedInt64Array) -> void:
	assert(state.size() == 4, "set_state: esperado 4 palavras")
	_s = state.duplicate()


static func _rotl(x: int, k: int) -> int:
	return ((x << k) | (x >> (32 - k))) & MASK


## a * b mod 2^32 sem passar de 2^63: multiplica b por metades de 16 bits de a.
static func _mul32(a: int, b: int) -> int:
	var lo := (a & 0xFFFF) * b
	var hi := ((a >> 16) & 0xFFFF) * b
	return (lo + ((hi & 0xFFFF) << 16)) & MASK


static func _fmix(h: int) -> int:
	h ^= h >> 16
	h = _mul32(h, 0x85EBCA6B)
	h ^= h >> 13
	h = _mul32(h, 0xC2B2AE35)
	h ^= h >> 16
	return h


static func _fnv1a(s: String) -> int:
	var h := 2166136261
	for b in s.to_utf8_buffer():
		h ^= b
		h = _mul32(h, 16777619)
	return h
