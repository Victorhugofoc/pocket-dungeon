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

/** spells.lua `school` de cada spell (o sorteio das melhorias olha a escola das spells da build). */
export const SPELL_SCHOOL: Readonly<Record<SpellId, string>> = {
  fireball: "fire", iceball: "ice", chain_lightning: "lightning", arcane_bolt: "arcane", healing_field: "healing",
  blade_orbit: "blade", venom_nova: "poison", cyclone: "wind", rune_traps: "rune", prism_beam: "light", quake_totem: "earth",
};

/**
 * Texto curto de cada spell na escolha inicial (spell_select.lua `DESC`, com shop.lua `DESC` para as outras).
 * Os números (recarga, dano, alcance) entram com as definições no M6-01.
 */
export const SPELL_TEXT: Readonly<Record<SpellId, string>> = {
  fireball: "Projétil que explode em área e aplica Burn. Bosses continuam queimando.",
  iceball: "Dano em área e Slow. Bosses ignoram o Slow.",
  chain_lightning: "Salta entre alvos próximos. Excelente contra densidade.",
  arcane_bolt: "Projétil arcano de longo alcance com Echo.",
  healing_field: "Um círculo de cura em volta de você que te acompanha.",
  blade_orbit: "Lâminas giram em volta de você. Com recarga menor que a duração, giram mais rápido.",
  venom_nova: "Onda de veneno em volta de você; o veneno acumula.",
  cyclone: "Tornado no mouse que puxa os inimigos para o centro e causa dano.",
  rune_traps: "Andando, deixa runas no chão; o inimigo que pisa detona a runa e fica preso.",
  prism_beam: "Raio contínuo na direção da mira que atravessa todos os inimigos da linha.",
  quake_totem: "Totem de pedra na mira que golpeia o chão e empurra os inimigos para longe.",
};
