// Spells do Dungeon Reign (marco M6). Fonte em dungeon-idle: src/data/spells.lua, src/core/constants.lua (§27),
// src/spells/spell_system.lua, src/data/tuning.lua. Conferidas campo a campo contra o original por tests/parity.test.ts.
//
// Como nas técnicas, os números ficam como lá (pixels, segundos, vida de lá); src/core/spells.ts converte para metros
// e para o multiplicador sobre o dano do herói (DR_PX_PER_M, DR_BASE_DAMAGE, DR_BASE_HP em data/techniques.ts).
import { DR_PX_PER_M } from "./techniques";

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

/** Texto curto de cada spell na escolha inicial (spell_select.lua `DESC`, com shop.lua `DESC` para as outras). */
export const SPELL_TEXT: Readonly<Record<SpellId, string>> = {
  fireball: "Projectile that explodes in an area and applies Burn. Bosses still burn.",
  iceball: "Area damage and Slow. Bosses ignore Slow.",
  chain_lightning: "Jumps between nearby targets. Great against crowds.",
  arcane_bolt: "Long-range arcane projectile with Echo.",
  healing_field: "A healing circle around you that moves with you.",
  blade_orbit: "Blades spin around you. With a cooldown shorter than the duration, they spin faster.",
  venom_nova: "A wave of poison around you; the poison stacks.",
  cyclone: "A tornado at the mouse that pulls enemies to its center and damages them.",
  rune_traps: "While you walk, you leave runes on the floor; an enemy that steps on one sets it off and is held in place.",
  prism_beam: "A held beam toward your aim that goes through every enemy on the line.",
  quake_totem: "A stone totem at your aim that slams the ground and pushes enemies away.",
};

/** Números gerais das spells (spells.lua, tuning.lua e constants.lua). */
export const SPELL_TUNING = {
  /** escala do dano por nível (spells.lua `S.LEVEL_STEP`): nível 5 = ×3,25 */
  levelStep: 0.5625,
  /** piso da recarga (constants.lua `COOLDOWN_FLOOR`) */
  cooldownFloor: 0.35,
  /** teto da lentidão (tuning.lua `SLOW_MAX`) */
  slowMax: 0.9,
  /** queimadura: + poder de magia × isto por segundo (tuning.lua `BURN_SP_SCALE`) */
  burnSpScale: 0.06,
  /** queimadura: +25% por nível da spell (tuning.lua `BURN_LEVEL_STEP`) */
  burnLevelStep: 0.25,
  /** quanto do poder de magia proporcional as spells levam (tuning.lua `SP_WEIGHT`) */
  spWeight: 0.5,
} as const;

export type SpellKind = "projectile" | "chain" | "field" | "orbit" | "nova" | "vortex" | "rune" | "beam" | "totem";

/** Efeitos de marco, modificador e relíquia (spell_stats.lua `LISTS` e `FLATS`). As listas acumulam como percentual
 * (`stackMultiplier`) ou chance; os planos somam. */
export const SPELL_LIST_KEYS = [
  "damagePct", "areaPct", "rangePct", "cooldownPct", "slowDurationPct", "chainRangePct", "echoChance", "volatileChance",
  "doubleHitChance", "surgeChance", "pullPct", "widthPct", "knockbackPct",
] as const;
export const SPELL_FLAT_KEYS = [
  "burnDurationFlat", "slowDurationFlat", "durationFlat", "slowPoints", "targets", "projectiles", "healFlat",
  "extraFields", "brittle", "runes", "rootFlat",
] as const;
export type SpellListKey = (typeof SPELL_LIST_KEYS)[number];
export type SpellFlatKey = (typeof SPELL_FLAT_KEYS)[number];
export type SpellEffect = Partial<Record<SpellListKey | SpellFlatKey, number>>;

export interface SpellMilestone { level: number; id: string; text: string; effect: SpellEffect }
export interface SpellModifier { id: string; name: string; text: string; effect: SpellEffect }

/** Uma spell como em spells.lua. Distâncias em px de lá, tempos em segundos, dano e cura em vida de lá. */
export interface SpellDef {
  id: SpellId;
  name: string;
  school: string;
  kind: SpellKind;
  cooldown: number;
  range: number;
  /** dano = (baseDamage + poder de magia × damageScale) × escala do nível; por golpe, tique ou acúmulo conforme o tipo */
  baseDamage?: number;
  damageScale?: number;
  projectileSpeed?: number;
  projectiles?: number;
  radius?: number;
  width?: number;
  duration?: number;
  tick?: number;
  burnDps?: number;
  burnDuration?: number;
  slow?: number;
  slowDuration?: number;
  targets?: number;
  chainRange?: number;
  heal?: number;
  blades?: number;
  hitCooldown?: number;
  stacks?: number;
  pull?: number;
  bossPull?: number;
  maxRunes?: number;
  root?: number;
  trigger?: number;
  arm?: number;
  knockback?: number;
  /** Healing Field nunca é spell inicial (`startable = false`) */
  startable?: false;
  milestones: SpellMilestone[];
  modifiers: SpellModifier[];
  /** ids das evoluções (as definições entram no M6-06) */
  evolutions: string[];
}

const ms = (level: number, id: string, text: string, effect: SpellEffect): SpellMilestone => ({ level, id, text, effect });
const mod = (id: string, name: string, text: string, effect: SpellEffect): SpellModifier => ({ id, name, text, effect });

export const SPELLS: Readonly<Record<SpellId, SpellDef>> = {
  fireball: {
    id: "fireball", name: "Fireball", school: "fire", kind: "projectile",
    cooldown: 3.0, projectileSpeed: 280, range: 160, baseDamage: 14, damageScale: 0.55,
    radius: 48, burnDps: 5, burnDuration: 3.0,
    milestones: [
      ms(2, "SEARING CORE", "+0.75s Burn duration", { burnDurationFlat: 0.75 }),
      ms(3, "WIDENING FLAME", "+20% area", { areaPct: 0.20 }),
      ms(4, "VOLATILE EMBER", "+15% Volatile chance", { volatileChance: 0.15 }),
      ms(5, "INFERNO CORE", "+25% damage", { damagePct: 0.25 }),
    ],
    modifiers: [
      mod("hotter_core", "HOTTER CORE", "+18% Fireball damage", { damagePct: 0.18 }),
      mod("wider_blast", "WIDER BLAST", "+18% Fireball area", { areaPct: 0.18 }),
      mod("deep_burn", "DEEP BURN", "+1.5s Burn duration", { burnDurationFlat: 1.5 }),
      mod("long_fuse", "LONG FUSE", "+25% range", { rangePct: 0.25 }),
      mod("volatile_core", "VOLATILE CORE",
        "+25% chance for Burning enemies to explode on death (35% of damage, radius 42)", { volatileChance: 0.25 }),
    ],
    evolutions: ["firestorm", "firewave"],
  },
  iceball: {
    id: "iceball", name: "Iceball", school: "ice", kind: "projectile",
    cooldown: 2.4, projectileSpeed: 240, range: 160, baseDamage: 16, damageScale: 0.50,
    radius: 42, slow: 0.30, slowDuration: 1.25,
    milestones: [
      ms(2, "DEEP CHILL", "+10% Slow", { slowPoints: 0.10 }),
      ms(3, "FROST BLOOM", "+20% area", { areaPct: 0.20 }),
      ms(4, "PERMAFROST", "+30% Slow duration", { slowDurationPct: 0.30 }),
      ms(5, "ABSOLUTE CORE", "+25% damage", { damagePct: 0.25 }),
    ],
    modifiers: [
      mod("frost_wave", "FROST WAVE", "+18% area", { areaPct: 0.18 }),
      mod("chilling_winds", "CHILLING WINDS", "+10% Slow", { slowPoints: 0.10 }),
      mod("lasting_chill", "LASTING CHILL", "+0.5s Slow duration", { slowDurationFlat: 0.5 }),
      mod("cryo_core", "CRYO CORE", "+15% Iceball damage", { damagePct: 0.15 }),
      mod("cold_front", "COLD FRONT", "+25% range", { rangePct: 0.25 }),
      mod("deep_chill", "DEEP CHILL", "Extra Slow (+10% Slow)", { slowPoints: 0.10 }),
      mod("brittle_chill", "BRITTLE CHILL", "Slowed enemies take +15% damage", { brittle: 0.15 }),
    ],
    evolutions: ["blizzard"],
  },
  chain_lightning: {
    id: "chain_lightning", name: "Chain Lightning", school: "lightning", kind: "chain",
    cooldown: 4.2, range: 160, baseDamage: 18, damageScale: 0.45, targets: 3, chainRange: 105,
    milestones: [
      ms(2, "FORKED CURRENT", "+1 target", { targets: 1 }),
      ms(3, "LONG ARC", "+20% jump range", { chainRangePct: 0.20 }),
      ms(4, "STORM WEAVE", "+1 target", { targets: 1 }),
      ms(5, "THUNDER CORE", "+25% damage", { damagePct: 0.25 }),
    ],
    modifiers: [
      mod("chain_plus_one", "CHAIN +1", "+1 target", { targets: 1 }),
      mod("arc_reach", "ARC REACH", "+25% range", { rangePct: 0.25 }),
      mod("quick_arc", "QUICK ARC", "-12% cooldown", { cooldownPct: -0.12 }),
      mod("overload", "OVERLOAD", "+20% damage", { damagePct: 0.20 }),
      mod("static_field", "STATIC FIELD", "15% chance to hit the main target twice", { doubleHitChance: 0.15 }),
    ],
    evolutions: ["lightning_strike"],
  },
  arcane_bolt: {
    id: "arcane_bolt", name: "Arcane Bolt", school: "arcane", kind: "projectile",
    cooldown: 2.5, projectileSpeed: 350, range: 185, baseDamage: 14, damageScale: 0.50,
    radius: 26, projectiles: 1,
    milestones: [
      ms(2, "TWIN SIGIL", "+1 projectile", { projectiles: 1 }),
      ms(3, "AETHER BLOOM", "+20% area", { areaPct: 0.20 }),
      ms(4, "RESONANCE", "+20% Echo chance", { echoChance: 0.20 }),
      ms(5, "ARCANE CORE", "+25% damage", { damagePct: 0.25 }),
    ],
    modifiers: [
      mod("arcane_force", "ARCANE FORCE", "+18% damage", { damagePct: 0.18 }),
      mod("quick_bolt", "QUICK BOLT", "-12% cooldown", { cooldownPct: -0.12 }),
      mod("seeking_rune", "SEEKING RUNE", "+18% range", { rangePct: 0.18 }),
      mod("aether_bloom", "AETHER BLOOM", "+18% impact area", { areaPct: 0.18 }),
      mod("resonant_core", "RESONANT CORE", "+10% Echo chance", { echoChance: 0.10 }),
    ],
    evolutions: ["arcane_strike"],
  },
  healing_field: {
    id: "healing_field", name: "Healing Field", school: "healing", kind: "field", startable: false,
    cooldown: 8.0, range: 170, radius: 58, duration: 8.0, heal: 2, tick: 0.75,
    milestones: [
      ms(2, "WIDER CIRCLE", "+15% area", { areaPct: 0.15 }),
      ms(3, "DEEP WELL", "+1 heal", { healFlat: 1 }),
      ms(4, "LINGERING GRACE", "+2s duration", { durationFlat: 2 }),
      ms(5, "LIFE CORE", "+1 heal", { healFlat: 1 }),
    ],
    modifiers: [
      mod("renewal", "RENEWAL", "+1 HP per tick", { healFlat: 1 }),
      mod("sanctuary_mod", "SANCTUARY", "+1s duration", { durationFlat: 1 }),
      mod("rapid_mending", "RAPID MENDING", "-10% cooldown", { cooldownPct: -0.10 }),
      mod("safe_haven", "SAFE HAVEN", "+20% radius", { areaPct: 0.20 }),
      mod("vital_surge", "VITAL SURGE", "10% chance per tick to heal +1 HP", { surgeChance: 0.10 }),
      mod("blooming_sanctuary", "BLOOMING SANCTUARY",
        "Each cast creates 2 extra nearby areas (max 4 random areas)", { extraFields: 2 }),
    ],
    evolutions: ["sanctuary"],
  },
  blade_orbit: {
    id: "blade_orbit", name: "Blade Orbit", school: "blade", kind: "orbit",
    cooldown: 9.0, range: 70, radius: 60, duration: 6.0, blades: 3, hitCooldown: 0.5,
    baseDamage: 9, damageScale: 0.35,
    milestones: [
      ms(2, "THIRD EDGE", "+1 blade", { targets: 1 }),
      ms(3, "WIDE SWEEP", "+20% radius", { areaPct: 0.20 }),
      ms(4, "LONG DANCE", "+1.5s duration", { durationFlat: 1.5 }),
      ms(5, "EDGE CORE", "+25% damage", { damagePct: 0.25 }),
    ],
    modifiers: [
      mod("keen_edges", "KEEN EDGES", "+18% damage", { damagePct: 0.18 }),
      mod("extra_blade", "EXTRA BLADE", "+1 blade", { targets: 1 }),
      mod("wide_orbit", "WIDE ORBIT", "+20% radius", { areaPct: 0.20 }),
      mod("endless_dance", "ENDLESS DANCE", "+1s duration", { durationFlat: 1 }),
      mod("quick_spin", "QUICK SPIN", "-12% cooldown", { cooldownPct: -0.12 }),
    ],
    evolutions: ["blade_storm"],
  },
  venom_nova: {
    id: "venom_nova", name: "Venom Nova", school: "poison", kind: "nova",
    cooldown: 7.0, range: 110, radius: 110, duration: 4.0, stacks: 5,
    baseDamage: 6, damageScale: 0.25,
    milestones: [
      ms(2, "VIRULENCE", "+1 max stack", { targets: 1 }),
      ms(3, "MIASMA", "+20% area", { areaPct: 0.20 }),
      ms(4, "LINGERING TOXIN", "+1s duration", { durationFlat: 1 }),
      ms(5, "VENOM CORE", "+25% damage", { damagePct: 0.25 }),
    ],
    modifiers: [
      mod("potent_toxin", "POTENT TOXIN", "+18% damage", { damagePct: 0.18 }),
      mod("spreading_cloud", "SPREADING CLOUD", "+20% area", { areaPct: 0.20 }),
      mod("slow_poison", "SLOW POISON", "+1.5s duration", { durationFlat: 1.5 }),
      mod("deep_wounds", "DEEP WOUNDS", "+1 max stack", { targets: 1 }),
      mod("quick_nova", "QUICK NOVA", "-12% cooldown", { cooldownPct: -0.12 }),
    ],
    evolutions: ["plague_bloom"],
  },
  cyclone: {
    id: "cyclone", name: "Cyclone", school: "wind", kind: "vortex",
    cooldown: 7.0, range: 170, radius: 70, duration: 3.5, tick: 0.5, pull: 90, bossPull: 0.20,
    baseDamage: 5, damageScale: 0.20,
    milestones: [
      ms(2, "UPDRAFT", "+25% pull", { pullPct: 0.25 }),
      ms(3, "WIDE FUNNEL", "+20% area", { areaPct: 0.20 }),
      ms(4, "LONG WIND", "+1s duration", { durationFlat: 1 }),
      ms(5, "STORM CORE", "+25% damage", { damagePct: 0.25 }),
    ],
    modifiers: [
      mod("gale_force", "GALE FORCE", "+18% damage", { damagePct: 0.18 }),
      mod("eye_of_the_storm", "EYE OF THE STORM", "+20% radius", { areaPct: 0.20 }),
      mod("long_gust", "LONG GUST", "+1s duration", { durationFlat: 1 }),
      mod("quick_wind", "QUICK WIND", "-12% cooldown", { cooldownPct: -0.12 }),
      mod("undertow", "UNDERTOW", "+30% pull", { pullPct: 0.30 }),
    ],
    evolutions: ["maelstrom"],
  },
  rune_traps: {
    id: "rune_traps", name: "Rune Traps", school: "rune", kind: "rune",
    cooldown: 1.6, range: 0, radius: 40, duration: 8.0, maxRunes: 4, root: 0.6, trigger: 12, arm: 0.3,
    baseDamage: 12, damageScale: 0.45,
    milestones: [
      ms(2, "SECOND GLYPH", "+1 rune", { runes: 1 }),
      ms(3, "WIDE SIGIL", "+20% area", { areaPct: 0.20 }),
      ms(4, "DEEP BINDING", "+0.4s held", { rootFlat: 0.4 }),
      ms(5, "ELDER GLYPH", "+25% damage", { damagePct: 0.25 }),
    ],
    modifiers: [
      mod("sharper_glyph", "SHARPER GLYPH", "+18% damage", { damagePct: 0.18 }),
      mod("wide_sigil", "WIDE SIGIL", "+20% area", { areaPct: 0.20 }),
      mod("quick_inscription", "QUICK INSCRIPTION", "-12% interval", { cooldownPct: -0.12 }),
      mod("binding_rune", "BINDING RUNE", "+0.3s held", { rootFlat: 0.3 }),
      mod("twin_glyph", "TWIN GLYPH", "15% to go off twice", { doubleHitChance: 0.15 }),
    ],
    evolutions: ["rune_circle"],
  },
  prism_beam: {
    id: "prism_beam", name: "Prism Beam", school: "light", kind: "beam",
    cooldown: 6.0, range: 220, width: 12, duration: 1.8, tick: 0.15,
    baseDamage: 3, damageScale: 0.15,
    milestones: [
      ms(2, "LONG FOCUS", "+20% length", { rangePct: 0.20 }),
      ms(3, "HELD LIGHT", "+0.5s duration", { durationFlat: 0.5 }),
      ms(4, "BROAD RAY", "+30% width", { widthPct: 0.30 }),
      ms(5, "PRISM CORE", "+25% damage", { damagePct: 0.25 }),
    ],
    modifiers: [
      mod("focused_lens", "FOCUSED LENS", "+18% damage", { damagePct: 0.18 }),
      mod("long_lens", "LONG LENS", "+20% length", { rangePct: 0.20 }),
      mod("wide_lens", "WIDE LENS", "+30% width", { widthPct: 0.30 }),
      mod("overcharge", "OVERCHARGE", "+0.5s duration", { durationFlat: 0.5 }),
      mod("quick_focus", "QUICK FOCUS", "-12% cooldown", { cooldownPct: -0.12 }),
    ],
    evolutions: ["spectrum"],
  },
  quake_totem: {
    id: "quake_totem", name: "Quake Totem", school: "earth", kind: "totem",
    cooldown: 10.0, range: 150, radius: 70, duration: 6.0, tick: 1.2, knockback: 20,
    baseDamage: 10, damageScale: 0.40,
    milestones: [
      ms(2, "WIDE TREMOR", "+20% area", { areaPct: 0.20 }),
      ms(3, "DEEP ROOTS", "+1.5s duration", { durationFlat: 1.5 }),
      ms(4, "STAGGER", "Stuns 0.3s", { rootFlat: 0.3 }),
      ms(5, "MOUNTAIN CORE", "+25% damage", { damagePct: 0.25 }),
    ],
    modifiers: [
      mod("heavy_stone", "HEAVY STONE", "+18% damage", { damagePct: 0.18 }),
      mod("wide_tremor", "WIDE TREMOR", "+20% area", { areaPct: 0.20 }),
      mod("enduring_idol", "ENDURING IDOL", "+1.5s duration", { durationFlat: 1.5 }),
      mod("quick_raise", "QUICK RAISE", "-12% cooldown", { cooldownPct: -0.12 }),
      mod("aftershock", "AFTERSHOCK", "20% to slam twice", { doubleHitChance: 0.20 }),
    ],
    evolutions: ["earthen_ward"],
  },
};

/** spells.lua `S.modifierDef`: o modificador do conjunto da própria spell, ou undefined. */
export function modifierDef(spellId: SpellId, modId: string): SpellModifier | undefined {
  return SPELLS[spellId].modifiers.find((m) => m.id === modId);
}

/** Números do lançamento no jogo (behaviors.lua, status.lua, tuning.lua), já em metros. */
export const SPELL_CAST = {
  /** rad entre projéteis múltiplos (tuning.lua `SPELL_PROJECTILE_SPREAD`) */
  projectileSpread: 0.14,
  /** raio de colisão do projétil (behaviors.lua: 8 px) */
  hitRadius: 8 / DR_PX_PER_M,
  /** Volátil: raio fixo (42 px) e fração do dano do Fireball (behaviors.lua `VOLATILE_RADIUS`, `VOLATILE_FRACTION`) */
  volatileRadius: 42 / DR_PX_PER_M,
  volatileFraction: 0.35,
  /** chefes levam o Slow a 20% da força (status.lua `BOSS_SLOW_EFFECT`) */
  bossSlowEffect: 0.2,
  /** Chain Lightning: velocidade do dardo que começa a cadeia (behaviors.lua `CHAIN_BOLT_SPEED`, 900 px/s) */
  chainBoltSpeed: 900 / DR_PX_PER_M,
  /** Eco: atraso do relançamento grátis (tuning.lua `SPELL_ECHO_DELAY`) */
  echoDelay: 0.2,
  /** passo máximo do projétil por verificação de colisão, em metros */
  maxStep: 0.4,
  /** Cyclone: o puxão alcança este tanto de raios, mais do que o dano (techniques.lua `VORTEX_REACH`) */
  vortexReach: 1.5,
  /** Cyclone: o olho, onde o puxão para (techniques.lua: 2 px) */
  vortexEye: 2 / DR_PX_PER_M,
  /** Blade Orbit: rad/s do giro (techniques.lua `updateOrbit`: 5,5) e raio do golpe de cada lâmina (12 px) */
  orbitSpin: 5.5,
  bladeHit: 12 / DR_PX_PER_M,
  /** Healing Field: distância dos campos extras do Blooming Sanctuary (tuning.lua `SPELL_FIELD_EXTRA_DISTANCE`, 70 px)
   * e o teto de campos extras ao mesmo tempo (constants.lua `CAPS.healingFields`) */
  fieldExtraDistance: 70 / DR_PX_PER_M,
  fieldExtraCap: 4,
  /** Rune Traps: o herói conta como andando acima desta velocidade (m/s), e a runa deixada anda sozinha enquanto ele anda */
  runeWalkSpeed: 0.5,
  /** Rune Traps: o ataque básico estoura runa armada de longe, menos as que estão a até gatilho + isto do herói (16 px;
   * techniques.lua `RUNE_SHOT_CLEAR`: o tiro sai dos pés dele) */
  runeShotClear: 16 / DR_PX_PER_M,
  /** visual: altura e tamanho da bola */
  height: 1.2,
  ballSize: 0.38,
} as const;
