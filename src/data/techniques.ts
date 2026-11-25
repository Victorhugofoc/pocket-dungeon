// As 9 técnicas e as passivas dos heróis, portadas do Dungeon Reign (marco M19).
// Fontes em dungeon-idle: src/data/spells.lua (`tech({...})`), src/data/characters.lua (`frost`, `autoPoison`, `brood`),
// src/spells/spell_stats.lua (escala), src/combat/frost.lua, src/combat/auto_attack.lua, src/combat/shield_throw.lua.
//
// Os números ficam como lá, em pixels e segundos, para comparar linha a linha com o Lua. A conversão para metros e para
// o multiplicador de dano deste jogo é feita em src/core/techniques.ts com as constantes abaixo.

/** Pixels do Dungeon Reign por metro daqui. O alcance do tiro lá é 160 px; aqui o dos atiradores fica entre 13 e 16 m. */
export const DR_PX_PER_M = 12;
/** Dano base do herói no Dungeon Reign (C.PLAYER.baseDamage): o dano de uma técnica lá dividido por ele é o multiplicador
 * sobre o dano do herói aqui. */
export const DR_BASE_DAMAGE = 8;
/** Poder de magia inicial do Dungeon Reign (C.PLAYER.spellPower); entra na fórmula base + poder × damageScale. */
export const DR_SPELL_POWER = 8;
/** Vida inicial do herói no Dungeon Reign: curas fixas de lá viram fração da vida máxima aqui. */
export const DR_BASE_HP = 100;
/** Escala do dano por nível (spells.lua `S.LEVEL_STEP`): nível 5 = ×3,25. */
export const TECH_LEVEL_STEP = 0.5625;
export const TECH_MAX_LEVEL = 5;

export type TechKind =
  | "blink" | "rift" | "fan" | "icewall" | "leap" | "charge" | "shadowstep" | "aegis" | "brood";

/** Efeito de um marco de nível. Percentuais em decimal, `durationFlat` em segundos, `projectiles` em tiros. */
export interface TechMilestoneEffect {
  cooldownPct?: number;
  rangePct?: number;
  areaPct?: number;
  damagePct?: number;
  durationFlat?: number;
  projectiles?: number;
}

export interface TechMilestone {
  level: number;
  id: string;
  text: string;
  effect: TechMilestoneEffect;
}

export interface TechDef {
  id: string;
  hero: string;
  name: string;
  school: "lightning" | "arcane" | "auto" | "ice" | "fire" | "holy" | "poison";
  kind: TechKind;
  text: string;
  cooldown: number;
  /** px */
  range?: number;
  minRange?: number;
  maxRange?: number;
  radius?: number;
  width?: number;
  length?: number;
  thickness?: number;
  /** dano = baseDamage + poder de magia × damageScale (px de vida do Dungeon Reign) */
  baseDamage?: number;
  damageScale?: number;
  /** técnicas que usam o dano do ataque básico em vez da fórmula acima */
  autoFraction?: number;
  autoMult?: number;
  duration?: number;
  invuln?: number;
  freeze?: number;
  stun?: number;
  /** M21-11: técnica alternativa da maestria; `base` é a original do herói (ícone, testes de paridade) */
  base?: string;
  /** M21-11 (Cull): o Shadow Step escolhe o inimigo mais fraco por perto em vez do mais forte */
  pickWeakest?: boolean;
  [extra: string]: unknown;
  milestones: TechMilestone[];
  evolution: { name: string; text: string };
}

const m = (level: number, id: string, text: string, effect: TechMilestoneEffect): TechMilestone => ({ level, id, text, effect });

export const TECHNIQUES: Record<string, TechDef> = {
  storm_step: {
    id: "storm_step", hero: "kaelen", name: "Storm Step", school: "lightning", kind: "blink",
    cooldown: 8.0, range: 200, width: 26, baseDamage: 18, damageScale: 0.45, invuln: 0.3,
    trail: 2.0, trailTick: 0.4, trailFraction: 0.35,
    text: "Teleports to the mouse, hitting everything in the way. 0.3 s invulnerable and leaves an electric trail.",
    milestones: [
      m(2, "FAST STEP", "-10% cooldown", { cooldownPct: -0.10 }),
      m(3, "LONG STRIDE", "+20% distance", { rangePct: 0.20 }),
      m(4, "STORM CORE", "+25% damage", { damagePct: 0.25 }),
      m(5, "TEMPEST STEP", "Evolution: the trail lasts 4 s and the arrival releases an area shock", {}),
    ],
    evolution: { name: "TEMPEST STEP", text: "The trail lasts 4 s and the arrival releases a shock (radius 70)." },
    evoTrail: 4.0, evoShockRadius: 70,
  },
  time_rift: {
    id: "time_rift", hero: "aurelius", name: "Time Rift", school: "arcane", kind: "rift",
    cooldown: 9.0, range: 230, radius: 80, duration: 3.0, riftSlow: 0.60,
    baseDamage: 20, damageScale: 0.60, perEnemy: 0.15, maxMult: 3.0,
    text: "Rift at the mouse: enemies 60% slower and enemy shots frozen; after 3 s it implodes (more damage with more enemies caught).",
    milestones: [
      m(2, "WIDER RIFT", "+15% area", { areaPct: 0.15 }),
      m(3, "QUICK RIFT", "-10% cooldown", { cooldownPct: -0.10 }),
      m(4, "RIFT CORE", "+25% damage", { damagePct: 0.25 }),
      m(5, "STASIS FIELD", "Evolution: +50% area and the implosion stuns for 1 s", { areaPct: 0.50 }),
    ],
    evolution: { name: "STASIS FIELD", text: "Rift 50% larger; the implosion stuns for 1 s." },
    evoStun: 1.0,
  },
  fan_the_hammer: {
    id: "fan_the_hammer", hero: "zephyr", name: "Fan the Hammer", school: "auto", kind: "fan",
    cooldown: 5.0, range: 260, shots: 5, spread: 0.16, autoFraction: 1.0,
    text: "A burst of 5 shots in a cone using the basic attack damage.",
    milestones: [
      m(2, "SIXTH ROUND", "+1 shot", { projectiles: 1 }),
      m(3, "QUICK DRAW", "-10% cooldown", { cooldownPct: -0.10 }),
      m(4, "HEAVY ROUNDS", "+25% damage", { damagePct: 0.25 }),
      m(5, "TRICK SHOT", "Evolution: bullets ricochet off the walls up to 4 times (+20% damage per ricochet)", {}),
    ],
    evolution: { name: "TRICK SHOT", text: "Bullets ricochet off the walls up to 4 times, +20% damage per ricochet." },
    evoBounces: 4, evoBounceDamage: 0.20,
  },
  glacial_wall: {
    id: "glacial_wall", hero: "frostine", name: "Glacial Wall", school: "ice", kind: "icewall",
    cooldown: 8.0, range: 90, minRange: 50, maxRange: 200,
    length: 150, thickness: 14, duration: 5.0, freeze: 1.0, baseDamage: 10, damageScale: 0.30,
    text: "Ice wall toward the mouse for 5 s: enemies cannot pass and whoever bumps into it is frozen for 1 s.",
    milestones: [
      m(2, "LONG WALL", "+20% length", { areaPct: 0.20 }),
      m(3, "COLD SNAP", "-10% cooldown", { cooldownPct: -0.10 }),
      m(4, "DEEP FREEZE", "+1 s duration", { durationFlat: 1 }),
      m(5, "PERMAFROST BASTION", "Evolution: lasts 8 s and bursts into shards at the end", { durationFlat: 2 }),
    ],
    evolution: { name: "PERMAFROST BASTION", text: "The wall lasts 8 s and bursts into shards when it fades." },
  },
  execution_leap: {
    id: "execution_leap", hero: "varok", name: "Execution Leap", school: "auto", kind: "leap",
    cooldown: 14.0, range: 320, radius: 70, baseDamage: 30, damageScale: 0.0, maxHpFraction: 0.08, stun: 0.5,
    leapTime: 0.45,
    text: "Leaps to the mouse: the enemy with the most HP in the landing area loses 8% of its max HP, and everyone around is stunned for 0.5 s.",
    milestones: [
      m(2, "HEAVY LANDING", "+20% area", { areaPct: 0.20 }),
      m(3, "QUICK HUNT", "-10% cooldown", { cooldownPct: -0.10 }),
      m(4, "BUTCHER", "+25% damage", { damagePct: 0.25 }),
      m(5, "KINGSLAYER", "Evolution: 12% of max HP and -30% cooldown", { cooldownPct: -0.30 }),
    ],
    evolution: { name: "KINGSLAYER", text: "Now takes 12% of the target's max HP, with 30% less cooldown." },
    evoMaxHpFraction: 0.12,
  },
  inferno_charge: {
    id: "inferno_charge", hero: "ignis", name: "Inferno Charge", school: "fire", kind: "charge",
    cooldown: 8.0, range: 200, width: 30, radius: 75, dashTime: 0.22, baseDamage: 18, damageScale: 0.40,
    burnDps: 4, burnDuration: 2.5, ringMult: 1.3, invuln: 0.22,
    text: "Rushes in flames to the mouse through the enemies and ends with a punch that opens a ring of fire.",
    milestones: [
      m(2, "WIDER RING", "+20% area", { areaPct: 0.20 }),
      m(3, "QUICK FLAME", "-10% cooldown", { cooldownPct: -0.10 }),
      m(4, "BLAZE CORE", "+25% damage", { damagePct: 0.25 }),
      m(5, "PHOENIX RUSH", "Evolution: the path stays on fire for 3 s", {}),
    ],
    evolution: { name: "PHOENIX RUSH", text: "The charge path stays on fire for 3 s." },
    evoFireTrail: 3.0,
  },
  shadow_step: {
    id: "shadow_step", hero: "umbra", name: "Shadow Step", school: "auto", kind: "shadowstep",
    cooldown: 7.0, range: 240, baseDamage: 0, damageScale: 0, autoMult: 3.0, invuln: 0.6, behind: 26,
    text: "Vanishes for 0.6 s (invulnerable) and reappears behind the strongest nearby enemy with a strike that always crits.",
    milestones: [
      m(2, "LONG SHADOW", "+20% distance", { rangePct: 0.20 }),
      m(3, "QUICK VANISH", "-10% cooldown", { cooldownPct: -0.10 }),
      m(4, "DEEP CUT", "+25% damage", { damagePct: 0.25 }),
      m(5, "ECLIPSE", "Evolution: a shadow repeats the strike 1 s later", {}),
    ],
    evolution: { name: "ECLIPSE", text: "A shadow stays behind and repeats the strike 1 s later (60% damage)." },
    evoEchoDelay: 1.0, evoEchoFraction: 0.60,
  },
  aegis: {
    id: "aegis", hero: "seraph", name: "Aegis", school: "holy", kind: "aegis",
    cooldown: 10.0, range: 0, radius: 90, duration: 3.0, baseDamage: 21, damageScale: 0.585, healFraction: 0.10,
    text: "A shield of light for 3 s that blocks the next hit; when it ends it bursts around you (damage) and heals 10% HP.",
    milestones: [
      m(2, "WIDE LIGHT", "+20% area", { areaPct: 0.20 }),
      m(3, "QUICK PRAYER", "-10% cooldown", { cooldownPct: -0.10 }),
      m(4, "RADIANCE", "+25% damage", { damagePct: 0.25 }),
      m(5, "SANCTUM", "Evolution: the burst leaves a healing circle on the ground for 4 s", {}),
    ],
    evolution: { name: "SANCTUM", text: "When it bursts, the shield leaves a healing circle on the ground for 4 s." },
    evoSanctumTime: 4.0,
  },
  brood: {
    id: "brood", hero: "vesper", name: "Brood", school: "poison", kind: "brood",
    cooldown: 9.0, range: 200, duration: 6.0, spiders: 2, baseDamage: 9, damageScale: 0.30, poisonDuration: 3.0,
    poisonStacks: 3,
    text: "Summons 2 big wasps for 6 s that fly to enemies and sting, applying Poison.",
    milestones: [
      m(2, "LONG BROOD", "+2 s duration", { durationFlat: 2 }),
      m(3, "QUICK HATCH", "-10% cooldown", { cooldownPct: -0.10 }),
      m(4, "VENOM FANGS", "+25% damage", { damagePct: 0.25 }),
      m(5, "BROODMOTHER", "Evolution: 3 wasps, and one that expires leaves a venom pool", {}),
    ],
    evolution: { name: "BROODMOTHER", text: "3 big wasps; when one expires it leaves a venom pool for 3 s." },
    evoPoolTime: 3.0,
  },
};

// ---------------------------------------------------------------------------------------------------------------
// M21-11: técnicas alternativas da maestria (não vêm do Dungeon Reign). Mesmo tipo e mesmo código da original, outra
// forma e uma troca: nunca mais fortes (tests/mastery.test.ts compara dano por recarga em cada nível). Herdam os
// marcos e a evolução da original, a não ser que digam outra coisa.
const alt = (base: string, d: Partial<TechDef> & { id: string; name: string; text: string }): TechDef =>
  ({ ...TECHNIQUES[base], ...d, base });

export const ALT_TECHNIQUES: Record<string, TechDef> = {
  flicker_step: alt("storm_step", {
    id: "flicker_step", name: "Flicker Step", cooldown: 4.5, range: 130, baseDamage: 15, damageScale: 0.4, trail: 0.8,
    evoTrail: 1.5, evoShockRadius: 50,
    text: "A short teleport to the mouse, hitting everything in the way, with about half the cooldown. 0.3 s invulnerable and a short electric trail.",
    evolution: { name: "TEMPEST STEP", text: "The trail lasts 1.5 s and the arrival releases a small shock (radius 50)." },
  }),
  collapse: alt("time_rift", {
    id: "collapse", name: "Collapse", cooldown: 6.0, radius: 60, duration: 1.2, riftSlow: 0.85, baseDamage: 13, damageScale: 0.45,
    text: "A small rift at the mouse: enemies 85% slower and enemy shots frozen; it implodes after 1.2 s.",
  }),
  deadeye: alt("fan_the_hammer", {
    id: "deadeye", name: "Deadeye", cooldown: 5.0, range: 340, shots: 2, spread: 0.04, autoFraction: 2.0,
    text: "Two aimed shots in a tight line, each with 200% of the basic attack damage, and longer reach.",
  }),
  frost_pillar: alt("glacial_wall", {
    id: "frost_pillar", name: "Frost Pillar", cooldown: 5.0, minRange: 30, maxRange: 160, length: 60, thickness: 20,
    duration: 3.0, freeze: 2.0, baseDamage: 6, damageScale: 0.18,
    text: "A short, thick block of ice toward the mouse for 3 s: whoever bumps into it is frozen for 2 s.",
  }),
  ground_breaker: alt("execution_leap", {
    id: "ground_breaker", name: "Ground Breaker", cooldown: 10.0, range: 200, radius: 110, baseDamage: 20, maxHpFraction: 0.03,
    stun: 1.2, evoMaxHpFraction: 0.06,
    text: "A shorter leap to the mouse: a wide landing that stuns everyone for 1.2 s; the biggest enemy loses 3% of its max HP.",
    evolution: { name: "KINGSLAYER", text: "Now takes 6% of the target's max HP, with 30% less cooldown." },
  }),
  flame_dash: alt("inferno_charge", {
    id: "flame_dash", name: "Flame Dash", cooldown: 5.5, range: 280, width: 24, radius: 45, baseDamage: 12, damageScale: 0.25,
    burnDps: 3, ringMult: 0.8,
    text: "A long, fast rush in flames to the mouse, burning the path, and a small burst at the end.",
  }),
  cull: alt("shadow_step", {
    id: "cull", name: "Cull", cooldown: 4.5, range: 200, autoMult: 1.9, pickWeakest: true,
    text: "Vanishes for 0.6 s (invulnerable) and reappears behind the weakest nearby enemy with a strike that always crits.",
  }),
  flash_of_light: alt("aegis", {
    id: "flash_of_light", name: "Flash of Light", cooldown: 6.0, radius: 70, duration: 0.6, baseDamage: 12, damageScale: 0.33,
    healFraction: 0.05,
    text: "A quick flash of light: blocks hits for 0.6 s, then bursts around you (damage) and heals 5% HP.",
  }),
  swarm: alt("brood", {
    id: "swarm", name: "Swarm", cooldown: 9.0, duration: 3.5, spiders: 4, baseDamage: 7, damageScale: 0.24,
    text: "Summons 4 big wasps for 3.5 s that fly to enemies and sting, applying Poison.",
    milestones: [
      m(2, "LONG SWARM", "+1 s duration", { durationFlat: 1 }),
      m(3, "QUICK HATCH", "-10% cooldown", { cooldownPct: -0.10 }),
      m(4, "VENOM FANGS", "+25% damage", { damagePct: 0.25 }),
      m(5, "BROODMOTHER", "Evolution: 5 wasps, and one that expires leaves a venom pool", {}),
    ],
    evolution: { name: "BROODMOTHER", text: "5 big wasps; when one expires it leaves a venom pool for 3 s." },
  }),
};
Object.assign(TECHNIQUES, ALT_TECHNIQUES);

export const TECHNIQUE_ORDER = [
  "storm_step", "time_rift", "fan_the_hammer", "glacial_wall", "execution_leap", "inferno_charge",
  "shadow_step", "aegis", "brood",
] as const;

// ---------------------------------------------------------------------------------------------------------------
// Passivas (characters.lua e combat/*.lua). Curas fixas de lá estão aqui como fração da vida máxima (÷ DR_BASE_HP).

/** Frostine (characters.lua `frost`, combat/frost.lua, auto_attack.lua `Auto.FROST`). */
export const FROST = {
  /** Estilhaçar: gelo em inimigo congelado (não chefe) dá +100% e descongela */
  shatterMult: 1.0,
  /** Quebradiço: acertos de gelo em chefe ou campeão somam acúmulos; no limite fica Quebradiço */
  stacks: 8,
  /** intervalo mínimo entre acúmulos do mesmo alvo (pingente ignora) */
  stackGap: 0.2,
  brittleTime: 4.0,
  brittleMult: 0.30,
  /** Pingente: o 4º tiro seguido no mesmo alvo sai ×3 e soma 2 acúmulos */
  icicleEvery: 4,
  icicleMult: 3.0,
  icicleStacks: 2,
  /** Frio profundo: 3 acertos de gelo em 3 s congelam inimigo comum por 0,8 s */
  chillHits: 3,
  chillWindow: 3.0,
  chillFreeze: 0.8,
  /** o tiro dela deixa lento (auto_attack.lua Auto.FROST) */
  autoSlow: 0.30,
  autoSlowTime: 1.5,
  /** o gelo dela deixa chefes lentos até este teto (characters.lua `bossSlowCap`) */
  bossSlowCap: 0.20,
  passiveText: [
    "Shatter: ice on a frozen enemy deals double and breaks the ice.",
    "Brittle: ice-covered bosses and Champions take +30% damage for 4 s.",
    "Icicle: the 4th shot in a row on the same target deals triple.",
  ],
} as const;

/** Umbra (auto_attack.lua `Auto.SHADOWBLADE`, spells.lua `shadow_step`). */
export const SHADOW = {
  backstab: 0.5,
  /** janela de golpe pelas costas depois do Shadow Step */
  afterStep: 2.0,
  backstabKillHeal: 4 / DR_BASE_HP,
  passiveText: [
    "Back hit: +50% damage to enemies moving away, stunned, or for 2 s after Shadow Step; a kill like that heals 4% HP.",
  ],
} as const;

/** Seraph (combat/shield_throw.lua). */
export const SHIELD_THROW = {
  healEvery: 4,
  heal: 2 / DR_BASE_HP,
  passiveText: ["Throws the shield, which ricochets and comes back; every 4th throw heals 2% HP."],
} as const;

/** Vesper (characters.lua `autoPoison` e `brood`). */
export const VENOM = {
  /** veneno do tiro: dano por segundo = dano do tiro × fraction por acúmulo */
  autoFraction: 0.35,
  autoDuration: 3.0,
  autoStacks: 3,
  /** Ninhada: uma abelha pequena a cada `every` s, até `max`, cada uma vive `life` s */
  broodEvery: 8,
  broodMax: 3,
  broodLife: 15,
  passiveText: ["Brood: every 8 s a small bee hatches (up to 3, lives 15 s) that stings and poisons."],
} as const;

/** Varok (characters.lua `maxHitFraction`). */
export const UNBREAKABLE = {
  maxHitFraction: 0.50,
  passiveText: ["Unbreakable: one hit takes at most 50% of max HP."],
} as const;

/** Zephyr (characters.lua `passiveText`, auto_attack.lua gunslinger). */
export const RICOCHET = {
  bounces: 1,
  bounceDamage: 0.70,
  passiveText: ["Ricochet: every shot bounces once (70% damage)."],
} as const;

/** Números fixos das evoluções que não estão em `spells.lua` (techniques.lua). Distâncias em metros, curas em % da vida. */
export const TECH_EVO = {
  /** Phoenix Rush: o rastro fere a cada 0,5 s com 25% do dano da técnica, e queima */
  fireTrailEvery: 0.5, fireTrailFraction: 0.25,
  /** Broodmother: poça de 50 px, envenena a cada 0,5 s */
  poolRadius: 50 / DR_PX_PER_M, poolEvery: 0.5,
  /** Sanctum: Healing Field parado com tique de 0,75 s e cura 2 (= 2% da vida) */
  sanctumTick: 0.75, sanctumHeal: 2 / DR_BASE_HP,
} as const;
