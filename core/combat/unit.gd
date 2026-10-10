extends RefCounted
## Uma unidade em combate: monstro (lado "monster") ou invasor (lado "invader").
## Só dados e consultas simples; as regras ficam em combat_sim.gd.

var uid: int = 0
var side: String = ""
var id: String = ""
var name: String = ""
var level: int = 1
var variant: String = ""
var family: String = ""
var role: String = ""
var max_hp: int = 1
var hp: int = 1
var atk: int = 0
var attack_ticks: int = 10
var range: String = "melee"
var damage_type: String = "physical"
var armor: int = 0
var move_speed: int = 0
var threat: int = 0
var route_pref: String = "shortest"
var elite: bool = false
var is_boss: bool = false
var summoned: bool = false
var parent_uid: int = -1
## id do trait -> parâmetros. Se o mesmo id aparece duas vezes, vale o último.
var traits: Dictionary = {}

## Monstros posicionados: de onde vieram ({"slot", "index"}); vazio para invocados.
var origin: Dictionary = {}
var spawned: bool = false
## "active" | "dead" | "escaped" (chegou ao Coração) | "looted" (saiu com o baú) | "fled"
var state: String = "active"

# Posição
var slot: String = ""
var path: Array = []
var path_index: int = 0
var progress: int = 0
var arrived_tick: int = 0

# Combate
var cooldown: int = 0
var shield: int = 0
var armor_shred: int = 0
var revived: bool = false
var disarm_used: bool = false
var effect_shield: bool = false
var summons_alive: int = 0
var base_haste_bp: int = 0
var timers: Dictionary = {}
var damage_dealt: int = 0
var heart_damage: int = 0

# Status: tick em que terminam (exclusivo)
var stun_until: int = 0
var root_until: int = 0
var fear_until: int = 0
var slow_bp: int = 0
var slow_until: int = 0
var poison: Array = []   ## [{"dps", "until"}]
var burn: Array = []     ## [{"dps", "until"}]
var haste: Array = []    ## [{"bp", "until"}]


func is_alive() -> bool:
	return state == "active"


func has(trait_id: String) -> bool:
	return traits.has(trait_id)


func tp(trait_id: String, key: String) -> Variant:
	return traits[trait_id][key]


func cannot_act(tick: int) -> bool:
	return tick < stun_until or tick < fear_until


func cannot_move(tick: int) -> bool:
	return cannot_act(tick) or tick < root_until


func is_slowed(tick: int) -> bool:
	return tick < slow_until


func is_impaired(tick: int) -> bool:
	return cannot_move(tick) or is_slowed(tick)


func add_traits(list: Array) -> void:
	for t in list:
		traits[t.id] = t


## Resumo para eventos e para o visualizador.
func label() -> String:
	return "%s#%d" % [id, uid]
