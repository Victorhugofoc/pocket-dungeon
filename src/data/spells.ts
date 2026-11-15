// Spells do Dungeon Reign (marco M6). Fonte em dungeon-idle: src/data/spells.lua, src/core/constants.lua (§27),
// src/spells/spell_system.lua. As definições das 11 spells entram no M6-01; aqui fica a estrutura, conferida
// contra o original por tests/parity.test.ts.

/** Espaços de spell além da técnica (constants.lua `C.MAX_SPELLS`). */
export const MAX_SPELLS = 2;
/** Nível máximo de spell e de técnica (constants.lua `C.SPELL_MAX_LEVEL`). */
export const SPELL_MAX_LEVEL = 5;

/** As 11 spells, na ordem de spells.lua `S.order`. */
export const SPELL_ORDER = [
  "fireball", "iceball", "chain_lightning", "arcane_bolt", "healing_field", "blade_orbit", "venom_nova",
  "cyclone", "rune_traps", "prism_beam", "quake_totem",
] as const;

export type SpellId = (typeof SPELL_ORDER)[number];
