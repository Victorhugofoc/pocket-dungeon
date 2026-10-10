extends RefCounted
## Caminhos até o Coração e escolha de rota por preferência de classe.
##
## Funções estáticas e puras: recebem a adjacência, o conjunto de slots
## passáveis e um `info` por slot ({"monsters", "traps", "treasure"}), para
## servir tanto à preparação (prévia da rota) quanto ao combate (rota ao vivo,
## com salas esvaziadas, tesouro saqueado e ramos bloqueados).
##
## Desempate legível: quem empata segue o líder do grupo; o líder que empata
## pega o primeiro caminho na ordem estável (ramo B, à esquerda, antes do C).


## Todos os caminhos simples de `from` até `to` por slots passáveis, em ordem
## estável (vizinhos visitados em ordem alfabética). `from` sempre é aceito.
static func all_paths(adjacency: Dictionary, passable: Dictionary, from: String, to: String) -> Array:
	var out: Array = []
	_dfs(adjacency, passable, from, to, [from], {from: true}, out)
	return out


static func _dfs(adj: Dictionary, passable: Dictionary, cur: String, to: String,
		path: Array, seen: Dictionary, out: Array) -> void:
	if cur == to:
		out.append(path.duplicate())
		return
	for nxt in adj[cur]:
		if seen.has(nxt) or not passable.get(nxt, false):
			continue
		seen[nxt] = true
		path.append(nxt)
		_dfs(adj, passable, nxt, to, path, seen, out)
		path.pop_back()
		seen.erase(nxt)


## Escolhe um caminho entre `paths` pela preferência `pref`.
## `leader_path` é a escolha do líder (vazio se quem escolhe é o próprio líder).
## `lure_all`: o pacto Caçador de Tesouros faz todos preferirem o tesouro.
static func choose(paths: Array, pref: String, info: Dictionary,
		leader_path: Array = [], lure_all: bool = false) -> Array:
	if paths.is_empty():
		return []
	if lure_all:
		pref = "treasure"
	var best: Array = []
	var best_score: int = -9223372036854775807
	for p in paths:
		var s := _score(p, pref, info)
		if s > best_score:
			best_score = s
			best = [p]
		elif s == best_score:
			best.append(p)
	if pref == "treasure" and best_score == 0:
		# Sem tesouro em nenhum caminho: segue o líder.
		best = paths
	if not leader_path.is_empty():
		for p in best:
			if p == leader_path:
				return p
	return best[0]


static func _score(path: Array, pref: String, info: Dictionary) -> int:
	match pref:
		"most_monsters":
			return _sum(path, info, "monsters")
		"fewest_traps":
			return -_sum(path, info, "traps")
		"shortest":
			return -path.size()
		"treasure":
			for slot in path:
				if info.get(slot, {}).get("treasure", false):
					return 1
			return 0
	assert(false, "preferência de rota desconhecida: %s" % pref)
	return 0


static func _sum(path: Array, info: Dictionary, key: String) -> int:
	var total := 0
	for slot in path:
		total += info.get(slot, {}).get(key, 0)
	return total
