extends "res://tests/test_case.gd"

const RngScript := preload("res://core/rng.gd")


func _first(seed: int, stream: String, n: int) -> Array:
	var r := RngScript.new(seed, stream)
	var out := []
	for i in n:
		out.append(r.next_u32())
	return out


# Valores gerados por tools/rng_ref.py. Se mudarem, o determinismo entre
# plataformas e entre versões quebrou.
func test_matches_python_reference() -> void:
	assert_eq(_first(0, "", 5), [2866555124, 74640064, 151123778, 3167292569, 3427313615])
	assert_eq(_first(12345, "combat", 5), [747367741, 3301362537, 1657050893, 3117484119, 1302524552])
	assert_eq(_first(-7, "shop", 5), [4246564625, 1635601241, 2551610446, 1675572101, 777589633])
	assert_eq(_first(1099511627779, "waves", 5), [3716856493, 3722874054, 3649381769, 2091482585, 3703016005])


func test_streams_are_independent() -> void:
	assert_ne(_first(42, "combat", 3), _first(42, "shop", 3))


func test_range_int_bounds_and_coverage() -> void:
	var r := RngScript.new(99, "t")
	var seen := {}
	for i in 2000:
		var v := r.range_int(-2, 3)
		assert_between(v, -2, 3)
		seen[v] = true
	assert_eq(seen.size(), 6, "todos os valores de -2 a 3 devem aparecer")


func test_chance_bp_extremes() -> void:
	var r := RngScript.new(1, "t")
	for i in 200:
		assert_false(r.chance_bp(0))
		assert_true(r.chance_bp(10000))


func test_chance_bp_rate() -> void:
	var r := RngScript.new(7, "t")
	var hits := 0
	for i in 10000:
		if r.chance_bp(2500):
			hits += 1
	assert_between(hits, 2300, 2700, "~25%")


func test_shuffle_is_permutation_and_deterministic() -> void:
	var a := [1, 2, 3, 4, 5, 6, 7, 8]
	var b := a.duplicate()
	RngScript.new(5, "s").shuffle(a)
	RngScript.new(5, "s").shuffle(b)
	assert_eq(a, b)
	var sorted := a.duplicate()
	sorted.sort()
	assert_eq(sorted, [1, 2, 3, 4, 5, 6, 7, 8])


func test_state_roundtrip() -> void:
	var r := RngScript.new(321, "x")
	r.next_u32()
	var saved := r.get_state()
	var expected := [r.next_u32(), r.next_u32()]
	var r2 := RngScript.new()
	r2.set_state(saved)
	assert_eq([r2.next_u32(), r2.next_u32()], expected)
