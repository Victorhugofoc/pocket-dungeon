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
    text: "Teleporta até o mouse, acertando tudo no caminho. 0,3 s invulnerável e deixa um rastro elétrico.",
    milestones: [
      m(2, "FAST STEP", "-10% recarga", { cooldownPct: -0.10 }),
      m(3, "LONG STRIDE", "+20% distância", { rangePct: 0.20 }),
      m(4, "STORM CORE", "+25% dano", { damagePct: 0.25 }),
      m(5, "TEMPEST STEP", "Evolução: rastro dura 4 s e a chegada solta um choque em área", {}),
    ],
    evolution: { name: "TEMPEST STEP", text: "O rastro dura 4 s e a chegada solta um choque (raio 70)." },
    evoTrail: 4.0, evoShockRadius: 70,
  },
  time_rift: {
    id: "time_rift", hero: "aurelius", name: "Time Rift", school: "arcane", kind: "rift",
    cooldown: 9.0, range: 230, radius: 80, duration: 3.0, riftSlow: 0.60,
    baseDamage: 20, damageScale: 0.60, perEnemy: 0.15, maxMult: 3.0,
    text: "Fenda no mouse: inimigos 60% mais lentos e projéteis inimigos parados; após 3 s implode (mais dano com mais inimigos presos).",
    milestones: [
      m(2, "WIDER RIFT", "+15% área", { areaPct: 0.15 }),
      m(3, "QUICK RIFT", "-10% recarga", { cooldownPct: -0.10 }),
      m(4, "RIFT CORE", "+25% dano", { damagePct: 0.25 }),
      m(5, "STASIS FIELD", "Evolução: +50% área e a implosão atordoa por 1 s", { areaPct: 0.50 }),
    ],
    evolution: { name: "STASIS FIELD", text: "Fenda 50% maior; a implosão atordoa por 1 s." },
    evoStun: 1.0,
  },
  fan_the_hammer: {
    id: "fan_the_hammer", hero: "zephyr", name: "Fan the Hammer", school: "auto", kind: "fan",
    cooldown: 5.0, range: 260, shots: 5, spread: 0.16, autoFraction: 1.0,
    text: "Rajada de 5 tiros em cone que usa o dano do ataque básico.",
    milestones: [
      m(2, "SIXTH ROUND", "+1 tiro", { projectiles: 1 }),
      m(3, "QUICK DRAW", "-10% recarga", { cooldownPct: -0.10 }),
      m(4, "HEAVY ROUNDS", "+25% dano", { damagePct: 0.25 }),
      m(5, "TRICK SHOT", "Evolução: as balas ricocheteiam até 4 vezes nas paredes (+20% de dano por ricochete)", {}),
    ],
    evolution: { name: "TRICK SHOT", text: "As balas ricocheteiam até 4 vezes nas paredes, +20% de dano a cada ricochete." },
    evoBounces: 4, evoBounceDamage: 0.20,
  },
  glacial_wall: {
    id: "glacial_wall", hero: "frostine", name: "Glacial Wall", school: "ice", kind: "icewall",
    cooldown: 8.0, range: 90, minRange: 50, maxRange: 200,
    length: 150, thickness: 14, duration: 5.0, freeze: 1.0, baseDamage: 10, damageScale: 0.30,
    text: "Parede de gelo na direção do mouse por 5 s: inimigos não atravessam e quem bate fica congelado por 1 s.",
    milestones: [
      m(2, "LONG WALL", "+20% comprimento", { areaPct: 0.20 }),
      m(3, "COLD SNAP", "-10% recarga", { cooldownPct: -0.10 }),
      m(4, "DEEP FREEZE", "+1 s de duração", { durationFlat: 1 }),
      m(5, "PERMAFROST BASTION", "Evolução: dura 8 s e explode em estilhaços no fim", { durationFlat: 2 }),
    ],
    evolution: { name: "PERMAFROST BASTION", text: "A parede dura 8 s e explode em estilhaços quando some." },
  },
  execution_leap: {
    id: "execution_leap", hero: "varok", name: "Execution Leap", school: "auto", kind: "leap",
    cooldown: 14.0, range: 320, radius: 70, baseDamage: 30, damageScale: 0.0, maxHpFraction: 0.08, stun: 0.5,
    leapTime: 0.45,
    text: "Salta até o mouse: o inimigo com mais vida na área de pouso perde 8% da vida máxima, e todos em volta ficam atordoados por 0,5 s.",
    milestones: [
      m(2, "HEAVY LANDING", "+20% área", { areaPct: 0.20 }),
      m(3, "QUICK HUNT", "-10% recarga", { cooldownPct: -0.10 }),
      m(4, "BUTCHER", "+25% dano", { damagePct: 0.25 }),
      m(5, "KINGSLAYER", "Evolução: 12% da vida máxima e -30% recarga", { cooldownPct: -0.30 }),
    ],
    evolution: { name: "KINGSLAYER", text: "Passa a tirar 12% da vida máxima do alvo, com 30% menos recarga." },
    evoMaxHpFraction: 0.12,
  },
  inferno_charge: {
    id: "inferno_charge", hero: "ignis", name: "Inferno Charge", school: "fire", kind: "charge",
    cooldown: 8.0, range: 200, width: 30, radius: 75, dashTime: 0.22, baseDamage: 18, damageScale: 0.40,
    burnDps: 4, burnDuration: 2.5, ringMult: 1.3, invuln: 0.22,
    text: "Avança em chamas até o mouse atravessando os inimigos e termina com um soco que abre um anel de fogo.",
    milestones: [
      m(2, "WIDER RING", "+20% área", { areaPct: 0.20 }),
      m(3, "QUICK FLAME", "-10% recarga", { cooldownPct: -0.10 }),
      m(4, "BLAZE CORE", "+25% dano", { damagePct: 0.25 }),
      m(5, "PHOENIX RUSH", "Evolução: o caminho fica em chamas por 3 s", {}),
    ],
    evolution: { name: "PHOENIX RUSH", text: "O caminho da investida fica em chamas por 3 s." },
    evoFireTrail: 3.0,
  },
  shadow_step: {
    id: "shadow_step", hero: "umbra", name: "Shadow Step", school: "auto", kind: "shadowstep",
    cooldown: 7.0, range: 240, autoMult: 3.0, invuln: 0.6, behind: 26,
    text: "Some por 0,6 s (invulnerável) e reaparece atrás do inimigo mais forte por perto com um golpe que sempre é crítico.",
    milestones: [
      m(2, "LONG SHADOW", "+20% distância", { rangePct: 0.20 }),
      m(3, "QUICK VANISH", "-10% recarga", { cooldownPct: -0.10 }),
      m(4, "DEEP CUT", "+25% dano", { damagePct: 0.25 }),
      m(5, "ECLIPSE", "Evolução: uma sombra repete o golpe 1 s depois", {}),
    ],
    evolution: { name: "ECLIPSE", text: "Uma sombra fica no lugar e repete o golpe 1 s depois (60% do dano)." },
    evoEchoDelay: 1.0, evoEchoFraction: 0.60,
  },
  aegis: {
    id: "aegis", hero: "seraph", name: "Aegis", school: "holy", kind: "aegis",
    cooldown: 10.0, range: 0, radius: 90, duration: 3.0, baseDamage: 21, damageScale: 0.585, healFraction: 0.10,
    text: "Escudo de luz por 3 s que bloqueia o próximo golpe; quando acaba, explode em volta (dano) e cura 10% da vida.",
    milestones: [
      m(2, "WIDE LIGHT", "+20% área", { areaPct: 0.20 }),
      m(3, "QUICK PRAYER", "-10% recarga", { cooldownPct: -0.10 }),
      m(4, "RADIANCE", "+25% dano", { damagePct: 0.25 }),
      m(5, "SANCTUM", "Evolução: a explosão deixa um círculo de cura no chão por 4 s", {}),
    ],
    evolution: { name: "SANCTUM", text: "Ao explodir, o escudo deixa um círculo de cura no chão por 4 s." },
    evoSanctumTime: 4.0,
  },
  brood: {
    id: "brood", hero: "vesper", name: "Brood", school: "poison", kind: "brood",
    cooldown: 9.0, range: 200, duration: 6.0, spiders: 2, baseDamage: 9, damageScale: 0.30, poisonDuration: 3.0,
    poisonStacks: 3,
    text: "Chama 2 vespas grandes por 6 s que voam até os inimigos e ferroam aplicando veneno.",
    milestones: [
      m(2, "LONG BROOD", "+2 s de duração", { durationFlat: 2 }),
      m(3, "QUICK HATCH", "-10% recarga", { cooldownPct: -0.10 }),
      m(4, "VENOM FANGS", "+25% dano", { damagePct: 0.25 }),
      m(5, "BROODMOTHER", "Evolução: 3 vespas, e a que some deixa uma poça de veneno", {}),
    ],
    evolution: { name: "BROODMOTHER", text: "3 vespas grandes; quando uma some, deixa uma poça de veneno por 3 s." },
    evoPoolTime: 3.0,
  },
};

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
    "Estilhaçar: gelo em inimigo congelado causa o dobro e quebra o gelo.",
    "Quebradiço: chefes e campeões cobertos de gelo sofrem +30% de dano por 4 s.",
    "Pingente: o 4º tiro seguido no mesmo alvo causa o triplo.",
  ],
} as const;

/** Umbra (auto_attack.lua `Auto.SHADOWBLADE`, spells.lua `shadow_step`). */
export const SHADOW = {
  backstab: 0.5,
  /** janela de golpe pelas costas depois do Shadow Step */
  afterStep: 2.0,
  backstabKillHeal: 4 / DR_BASE_HP,
  passiveText: [
    "Golpe pelas costas: +50% de dano em quem está se afastando, atordoado ou nos 2 s depois do Shadow Step; matar assim cura 4% da vida.",
  ],
} as const;

/** Seraph (combat/shield_throw.lua). */
export const SHIELD_THROW = {
  healEvery: 4,
  heal: 2 / DR_BASE_HP,
  passiveText: ["Arremessa o escudo, que ricocheteia e volta; a cada 4 arremessos, cura 2% da vida."],
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
  passiveText: ["Ninhada: a cada 8 s nasce uma abelha pequena (até 3, vive 15 s) que ferroa e envenena."],
} as const;

/** Varok (characters.lua `maxHitFraction`). */
export const UNBREAKABLE = {
  maxHitFraction: 0.50,
  passiveText: ["Inquebrável: um golpe tira no máximo 50% da vida."],
} as const;

/** Zephyr (characters.lua `passiveText`, auto_attack.lua gunslinger). */
export const RICOCHET = {
  bounces: 1,
  bounceDamage: 0.70,
  passiveText: ["Ricochete: todo tiro ricocheteia 1 vez (70% do dano)."],
} as const;
