// A partida do Dungeon Reign (marco M20, decisão D13): ondas, XP, melhorias de nível, mapa da partida, dificuldades e
// chefes. Os números ficam como lá (px, s, frações) para comparar com o Lua; tests/parity.test.ts confere cada bloco.
// Fontes em dungeon-idle: src/core/constants.lua, src/data/waves.lua, src/data/tuning.lua, src/data/run_map.lua,
// src/data/difficulties.lua, src/data/bosses.lua, src/progression/level_up.lua.
// As fórmulas que usam estes números estão em src/core/waves.ts.

/** constants.lua `TOTAL_WAVES`; chefes nas ondas 5, 10, 15 e 20 (`BOSS_WAVES`), e a cada 5 no modo sem fim. */
export const TOTAL_WAVES = 20;
export const BOSS_EVERY = 5;
/** Ondas por zona aqui (D13): cada zona = 5 ondas, igual ao `segmentOf` do mapa da partida de lá. */
export const WAVES_PER_ZONE = 5;

/** waves.lua (§5) e tuning.lua: duração, contagem, escala e recompensa de cada onda. */
export const WAVES = {
  /** duração em s das ondas 1 a 4; da 5 em diante, `durationLater` */
  duration: [20, 25, 30, 35],
  durationLater: 40,
  /** contagem base das ondas 1 a 5; depois +`countStep` por onda */
  baseCount: [8, 10, 12, 14, 16],
  countStep: 2,
  countGrowth: 0.07,
  countFactor: 0.73,
  /** curva de ritmo por onda (`W.COUNT_MULT`, D-164) */
  countMult: [2.8, 2.6, 2.5, 2.1, 2.2, 2.2, 1.9, 1.8, 1.72, 1.65, 1.6, 1.51, 1.42, 1.36, 0.77, 1.17, 1.12, 1.05, 0.99, 0.5],
  hpPerWave: 0.035,
  damagePerWave: 0.020,
  spawnWindow: 0.9,
  firstSpawnDelay: 0.5,
  /** ouro e XP da onda: base + onda × perWave (§13.2, §13.3) */
  gold: { base: 18, perWave: 6 },
  xp: { base: 12, perWave: 4 },
  /** parte da onda normal que nasce numa onda de chefe (tuning.lua `BOSS_WAVE_SPAWN`) */
  bossWaveSpawn: 0.60,
} as const;

/** constants.lua `ENDLESS`: modo sem fim depois da onda 20. */
export const ENDLESS = {
  hpPerWave: 0.20, damagePerWave: 0.10, countWave: 19, championsPerWave: 1, maxChampions: 5,
  step2: { from: 26, hpPerWave: 0.70, damagePerWave: 0.25 },
} as const;

/** waves.lua `WEIGHT`: peso de cada inimigo no sorteio da onda. */
export const ENEMY_WEIGHT: Record<string, number> = {
  goblin: 5, orc: 3, swarm: 3, archer: 2.2, assassin: 1.5, shieldbearer: 1.2, berserker: 1.2,
  spellcaster: 1.2, hexer: 0.9, plaguebearer: 0.9, splitter: 0.9, leaper: 0.9, bombardier: 0.7,
  summoner: 0.5, warden: 0.5,
};

/** waves.lua `STAGES`: a partir de que onda cada inimigo entra no sorteio. */
export const WAVE_STAGES: { from: number; pool: string[]; weights?: Record<string, number> }[] = [
  { from: 1, pool: ["goblin"] },
  { from: 2, pool: ["goblin", "orc"], weights: { goblin: 3, orc: 1 } },
  { from: 3, pool: ["goblin", "orc", "swarm", "archer"] },
  { from: 4, pool: ["goblin", "orc", "swarm", "archer", "assassin", "shieldbearer"] },
  { from: 6, pool: ["goblin", "orc", "swarm", "archer", "assassin", "shieldbearer", "berserker", "spellcaster"] },
  { from: 8, pool: ["goblin", "orc", "swarm", "archer", "assassin", "shieldbearer", "berserker", "spellcaster",
    "hexer", "plaguebearer", "splitter", "leaper", "bombardier"] },
  { from: 10, pool: ["goblin", "orc", "swarm", "archer", "assassin", "shieldbearer", "berserker", "spellcaster",
    "hexer", "plaguebearer", "summoner", "bombardier", "warden", "splitter", "leaper"] },
];

/** constants.lua `PLAYER` (o que a partida usa) e `XP_GROWTH`, `LEVEL_UP_CHOICES`. */
export const RUN_START = { level: 1, xp: 0, xpToNext: 50, gold: 0 } as const;
export const XP_GROWTH = 1.35;
export const LEVEL_UP_CHOICES = 3;

/** level_up.lua: raridade das melhorias de nível. +1 ponto de épica (tirado da comum) a cada 5 níveis. */
export const UPGRADE_TIERS = { common: 1, rare: 1.6, epic: 2.5 } as const;
export const UPGRADE_TIER_WEIGHTS = { common: 75, rare: 20, epic: 5 } as const;
/** tuning.lua `LEVELUP_REROLL`: trocar as 3 melhorias custa base + perLevel × nível, uma vez por nível */
export const LEVELUP_REROLL = { base: 20, perLevel: 5, limit: 1 } as const;

/** run_map.lua (§7): as cartas do mapa da partida entre as ondas. */
export const RUN_MAP = {
  nodes: [
    { id: "combat_room", weight: 3.0 },
    { id: "cursed_room", weight: 2.0 },
    { id: "pact", weight: 1.5 },
    { id: "event", weight: 1.4 },
    { id: "shop", weight: 1.4 },
    { id: "elite", weight: 1.1 },
    { id: "relic_shrine", weight: 1.25 },
    { id: "boss_ambush", weight: 0.75 },
  ],
  choices: 3,
  /** a loja aparece garantida antes de toda onda múltipla de 3 */
  shopEvery: 3,
  /** cartas que podem dar lugar à loja garantida */
  replaceable: ["combat_room", "cursed_room", "event"],
} as const;

export type DifficultyId = "easy" | "normal" | "hard";

export interface Difficulty {
  id: DifficultyId;
  name: string;
  enemyHp: number; enemyDamage: number; enemySpeed: number; projectileSpeed: number;
  bossHp: number; bossDamage: number; bossSpeed: number; reward: number;
  earlyBossCut?: boolean;
  /** dano dos inimigos nas primeiras ondas (índice 0 = onda 1) */
  earlyDamage?: number[];
  lateHp?: { from: number; mult: number }[];
  riskGold?: number;
  ambushHp?: Record<string, number>;
  crownHp?: number;
}

/** difficulties.lua (§4.1). Depths 1 a 5 ficam para o M13. */
export const DIFFICULTY_ORDER: DifficultyId[] = ["easy", "normal", "hard"];
export const DIFFICULTIES: Record<DifficultyId, Difficulty> = {
  easy: {
    id: "easy", name: "Easy",
    enemyHp: 0.85, enemyDamage: 0.80, enemySpeed: 0.92, projectileSpeed: 0.90,
    bossHp: 0.82, bossDamage: 0.78, bossSpeed: 0.92, reward: 0.90,
    earlyBossCut: true,
  },
  normal: {
    id: "normal", name: "Normal",
    enemyHp: 1.00, enemyDamage: 1.00, enemySpeed: 1.00, projectileSpeed: 1.00,
    bossHp: 1.25, bossDamage: 1.00, bossSpeed: 1.00, reward: 1.00,
  },
  hard: {
    id: "hard", name: "Hard",
    earlyDamage: [1.35, 1.35, 1.35, 1.35, 1.35, 1.425],
    enemyHp: 1.40, enemyDamage: 1.50, enemySpeed: 1.10, projectileSpeed: 1.12,
    bossHp: 1.80, bossDamage: 1.30, bossSpeed: 1.12, reward: 1.35,
    lateHp: [{ from: 16, mult: 1.25 }, { from: 11, mult: 1.15 }],
    riskGold: 0.80,
    ambushHp: { boss_ambush: 0.90, boss_ambush_plus: 0.85 },
    crownHp: 1.5,
  },
};
export const DEPTHS_STEP = 0.08;
export const DEPTHS_FROM = 6;

/** bosses.lua (§§59-71) e tuning.lua: vida, dano, recompensa e relíquia dos chefes. */
export const BOSS = {
  /** vida = hpBase + onda × hpPerWave; dano = damageBase + onda × damagePerWave */
  base: { hpBase: 260, hpPerWave: 55, damageBase: 11, damagePerWave: 1.5, enrageAt: 0.30 },
  /** a cada 5 ondas (tier = max(1, onda ÷ 5)) */
  tier: { hp: 0.12, damage: 0.08, speed: 0.025, reward: 0.20 },
  /** ouro e XP = base + (onda − 1) × perWave */
  gold: { base: 170, perWave: 38 },
  xp: { base: 150, perWave: 35 },
  relicChoices: 3,
  premiumChance: 0.35,
  final: { wave: 20, hp: 1.18, damage: 1.10, telegraph: 0.92 },
  /** tuning.lua: todo chefe ×2,2 de vida, +10% por onda depois da 5, mais leve nas ondas 5 e 10 */
  hpMult: 2.2,
  hpPerWaveAfter5: 0.10,
  hpEarly: [{ upTo: 5, mult: 0.50 }, { upTo: 10, mult: 0.75 }],
  /** vencer um chefe cura 20% da vida máxima */
  healPct: 0.20,
} as const;

/** tuning.lua: regras gerais de combate da partida. */
export const RUN_TUNING = {
  introTime: 1.8,
  clearedTime: 2.6,
  /** cura e regeneração durante a onda valem 35% */
  combatHealMult: 0.35,
  /** todo dano de inimigo e chefe ×1,5 */
  enemyDamageMult: 1.5,
  /** orbes de cura deixados por inimigos */
  healOrb: { heal: 0.08, maxPerWave: 2, life: 8, pickup: 32, chance: { normal: 0.02, elite: 0.04, champion: 0.10, swarm: 0 } },
  /** Apressar: acelera o resto de uma onda normal por mais recompensa */
  hasten: { unlockAfter: 5, timeMult: 1.5, spawnMult: 2.0, maxBonus: 0.30, fullAt: 20, exponent: 1.4, enemySpeed: 1.20 },
} as const;
