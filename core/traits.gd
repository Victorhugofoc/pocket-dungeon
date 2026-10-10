extends RefCounted
## Vocabulário de traits (unidades e salas) e efeitos (armadilhas e poderes).
##
## Cada id lista os parâmetros obrigatórios. O carregador (core/db.gd) recusa
## ids desconhecidos ou parâmetros faltando, para que um erro de digitação no
## JSON apareça no carregamento e não como um comportamento silencioso no combate.
## A simulação (Fase 1.4) implementa cada id daqui.

const TRAITS := {
	# Monstros
	"damage_reduction": ["damage_type", "bp"],
	"split_on_death": ["count", "hp_bp"],
	"armor_shred_on_hit": ["amount", "max"],
	"taunt": [],
	"knockback_immune": [],
	"reflect": ["bp"],
	"aoe_attack": [],
	"stun_pulse": ["every_ticks", "duration_ticks"],
	"multi_target": ["count"],
	"lifesteal": ["bp"],
	"poison_on_hit": ["dmg_per_sec", "duration_ticks"],
	"slow_on_hit": ["bp", "duration_ticks"],
	"poison_stacks": ["max"],
	"root_on_hit": ["every_ticks", "duration_ticks"],
	"bonus_vs_impaired": ["bp"],
	"gold_on_kill": ["amount"],
	"berserk": ["threshold_bp", "attack_speed_bp"],
	"ally_damage_aura": ["bp"],
	"summon": ["unit", "every_ticks", "max"],
	"damage_type_override": ["damage_type"],
	"range_override": ["range"],
	"revive_once": ["hp_bp"],
	"backline_strike": [],
	"fear_on_hit": ["every_ticks", "duration_ticks"],
	# Aventureiros e chefes
	"target_lowest_hp": [],
	"disarm_first_trap": [],
	"loots_treasure": [],
	"resist": ["damage_type", "bp"],
	"loot_carrier": ["gold"],
	"heal_allies": ["hp_per_sec"],
	"ignore_first_guarded_room": [],
	"slow_immune_on_enter": ["duration_ticks"],
	"room_effect_shield": [],
	"frost_aura": ["bp"],
	"blink_past_room": ["every_ticks"],
	"crit": ["chance_bp", "mult_bp"],
	"regen": ["hp_per_sec"],
	"burn_on_hit": ["dmg_per_sec", "duration_ticks", "max_stacks"],
	"target_backline": [],
	"bonus_vs_strongest": ["bp"],
	# Salas
	"occupant_stat_bonus": ["bp"],
	"trap_power_bonus": ["bp"],
	"treasure_chest": ["gold"],
	"single_file": [],
	"room_slow": ["bp"],
}

const EFFECTS := {
	"damage": ["damage_type", "amount"],
	"root": ["duration_ticks"],
	"fire_zone": ["dmg_per_sec", "duration_ticks"],
	"ally_haste": ["attack_speed_bp", "duration_ticks", "scope"],
	"block_branch": ["duration_ticks"],
	"stun": ["duration_ticks"],
	"revive_strongest": ["hp_bp"],
	"push_back": [],
	"fear": ["duration_ticks", "count"],
}

const DAMAGE_TYPES := ["physical", "magic", "fire", "poison"]
const RANGES := ["melee", "ranged"]
const FAMILIES := ["gosma", "besta", "goblinoide", "morto_vivo", "invasor"]
const ROLES := ["tanque", "dano", "controle", "suporte"]
const ROUTE_PREFS := ["most_monsters", "fewest_traps", "shortest", "treasure"]
const UNLOCKS := ["start", "meta"]
const TRAP_TRIGGERS := ["first_enter"]
const SCOPES := ["room", "room_and_adjacent", "room_enemies"]
const SLOT_STATES := ["rock", "tunnel", "room"]
const SLOT_KINDS := ["entrance", "slot", "heart"]
