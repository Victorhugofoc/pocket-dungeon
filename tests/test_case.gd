extends RefCounted
## Base dos testes. Cada método que começa com `test_` é um caso;
## tools/run_tests.gd chama um por um e lê `failures` depois.

var failures: Array[String] = []


func assert_true(cond: bool, msg: String = "") -> void:
	if not cond:
		failures.append("esperado verdadeiro. %s" % msg)


func assert_false(cond: bool, msg: String = "") -> void:
	if cond:
		failures.append("esperado falso. %s" % msg)


func assert_eq(actual: Variant, expected: Variant, msg: String = "") -> void:
	if typeof(actual) != typeof(expected) or actual != expected:
		failures.append("esperado %s, obtido %s. %s" % [var_to_str(expected), var_to_str(actual), msg])


func assert_ne(actual: Variant, other: Variant, msg: String = "") -> void:
	if typeof(actual) == typeof(other) and actual == other:
		failures.append("valores não deveriam ser iguais: %s. %s" % [var_to_str(actual), msg])


func assert_between(value: int, lo: int, hi: int, msg: String = "") -> void:
	if value < lo or value > hi:
		failures.append("%d fora de [%d, %d]. %s" % [value, lo, hi, msg])
