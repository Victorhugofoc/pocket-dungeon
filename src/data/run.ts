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
/** run_setup.lua: o texto de cada dificuldade na escolha. */
export const DIFFICULTY_TEXT: Readonly<Record<DifficultyId, string>> = {
  easy: "Weaker, slower enemies. Rewards x0.90.",
  normal: "The reference experience. Wave 20 is a real test of your build.",
  hard: "Much stronger enemies. Rewards x1.35.",
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
/** status.lua: queimadura num efeito só por inimigo; cada acúmulo extra soma 50% do maior dano (D-161), até 8 contados. */
export const BURN = { tick: 0.5, stackBonus: 0.5, stackCap: 8 } as const;

export const RUN_TUNING = {
  introTime: 1.8,
  clearedTime: 2.6,
  /** cura e regeneração durante a onda valem 35% */
  combatHealMult: 0.35,
  /** todo dano de inimigo e chefe ×1,5 */
  enemyDamageMult: 1.5,
  /** orbes de cura deixados por inimigos */
  healOrb: { heal: 0.08, maxPerWave: 2, life: 8, pickup: 32, chance: { normal: 0.02, elite: 0.04, champion: 0.10, swarm: 0 } },
  /**
   * tuning.lua `LOOT` (D-618), em px de lá (÷ `DR_PX_PER_M`): o ouro e o XP do inimigo morto ficam no chão como orbe.
   * `pickup` conta da borda do herói (`heroRadius`, constants.lua `PLAYER.radius`); `settle` é o tempo antes de poder ser puxado;
   * `maxOnFloor` é o teto (o mais velho absorve o novo); `hop` é o pulo para fora do corpo (loot.lua `onKill`).
   */
  loot: { pickup: 36, settle: 0.25, pullSpeed: 160, pullAccel: 900, maxOnFloor: 220, heroRadius: 12, hop: [4, 14] },
  /** Apressar: acelera o resto de uma onda normal por mais recompensa */
  hasten: { unlockAfter: 5, timeMult: 1.5, spawnMult: 2.0, maxBonus: 0.30, fullAt: 20, exponent: 1.4, enemySpeed: 1.20 },
} as const;

/** tuning.lua `ARENA_CROWD`: a arena de lá (1200 × 608 px) tem mais área que a de referência (880 × 632). */
export const ARENA_CROWD = 1 + ((1200 * 608) / (880 * 632) - 1) / 2;

/** constants.lua e tuning.lua: inimigos nascem na borda, longe do herói, depois de um aviso no chão. */
export const SPAWN = {
  /** s de aviso antes de o inimigo aparecer (`SPAWN_TELEGRAPH`) */
  telegraph: 0.60,
  /** s de aviso do chefe (`BOSS_TELEGRAPH`) */
  bossTelegraph: 1.4,
  /** distância mínima do herói, em px de lá (`SPAWN_MIN_DISTANCE`); vezes TUNING.enemy.pxToUnit no jogo */
  minDistancePx: 170,
} as const;

/** enemies.lua `CHAMPION` (§56): vida = max(vida normal, base + onda × perWave) × hpMult. */
export const CHAMPION = { hpBase: 120, hpPerWave: 26, hpMult: 1.55, damageMult: 1.75, speedMult: 1.12, rewardMult: 4.5 } as const;
/** affixes.lua `RANDOM`: chance de uma onda normal promover um inimigo sorteado a campeão. */
export const RANDOM_CHAMPION = { base: 0.02, perWave: 0.02, cap: 0.30 } as const;
/** enemies.lua: invocados e filhos da gosma (sem recompensa). */
export const MINION_SCALE = { hp: 0.75, damage: 0.75, speed: 1.10 } as const;
export const CHILD_SCALE = { hp: 0.72, damage: 0.78, speed: 1.18 } as const;
/** enemies.lua `SUMMON_CAP`: invocados vivos no máximo, somando todos os invocadores (as crias do splitter não contam) */
export const SUMMON_CAP = 30;
/**
 * enemies.lua (`enemy.lua` `create`): as recargas começam pela metade (a invocação em 0,6), para o primeiro golpe não
 * sair junto com o aggro nem esperar a recarga inteira.
 */
export const FIRST_TIMER = { attack: 0.5, summon: 0.6, mortar: 0.5, charge: 0.5, leap: 0.5 } as const;
/** constants.lua `SURVIVOR_FACTOR`: quem sobra no fim da onda rende 35% do ouro e do XP. */
export const SURVIVOR_FACTOR = 0.35;

/** bosses.lua `builds[id].mults`: só dos 4 chefes que existem aqui (M10 traz os outros). */
export const BOSS_MULTS: Record<string, { hp: number; damage: number; speed: number; projectileSpeed: number }> = {
  bloodfang: { hp: 1.12, damage: 1.18, speed: 1.12, projectileSpeed: 0.90 },
  gravekeeper: { hp: 1.10, damage: 1.00, speed: 0.88, projectileSpeed: 0.90 },
  ember_matriarch: { hp: 1.04, damage: 1.08, speed: 0.94, projectileSpeed: 0.90 },
  hollow_king: { hp: 1.12, damage: 1.14, speed: 0.92, projectileSpeed: 1.00 },
  deathstalker: { hp: 0.92, damage: 1.02, speed: 0.95, projectileSpeed: 0.88 },
  dune_leviathan: { hp: 1.10, damage: 1.10, speed: 1.00, projectileSpeed: 0.95 },
  mirage_djinn: { hp: 1.06, damage: 1.12, speed: 1.10, projectileSpeed: 1.05 },
};

/** bosses.lua `BASE.projectileSpeed`: velocidade do tiro de chefe em px/s (os ataques novos multiplicam por ela) */
export const BOSS_PROJECTILE_SPEED = 210;

/**
 * bosses.lua `BASE`: o skillshot (linha fina avisada e tiro rápido) tem recarga própria, fora da rotação, e só corre
 * quando a fase já abriu o ataque `skillshot` da lista do chefe (`BA.hasSkillshot`). Velocidade em px/s.
 */
export const BOSS_SKILLSHOT = { cooldown: 2.15, speed: 300 } as const;

/**
 * bosses.lua `PHASES` (§63): fase pela fração de vida (acima de 0,60 = 1, acima de 0,30 = 2, senão 3, enfurecido).
 * Os multiplicadores valem uma vez, ao entrar na fase (`Boss.updatePhase`), e se acumulam. Aqui o chefe tem uma
 * rotação só de padrões (lá `attackCooldown`) e o golpe corpo a corpo (lá o contato, `contactCooldown`); lá ainda há o
 * tiro comum (`rangedCooldown`), que aqui não existe; o skillshot (`skillshotCooldown`) corre à parte desde o M10-01.
 */
export const BOSS_PHASES = [
  { above: 0.60 },
  { above: 0.30, speed: 1.10, attackCooldown: 0.90, rangedCooldown: 0.78, skillshotCooldown: 0.88 },
  { above: -1, speed: 1.12, attackCooldown: 0.82, contactCooldown: 0.78, skillshotCooldown: 0.82, enraged: true },
] as const;

export type BossMechanicId = "blood_rush" | "army_of_the_damned" | "meteor_siege" | "soul_tether" | "marked_prey" | "burrow" | "mirage";

/** bosses.lua `builds[id].mechanic` e `mechanicName`, dos 4 chefes daqui. */
export const BOSS_MECHANIC: Record<string, { id: BossMechanicId; name: string }> = {
  bloodfang: { id: "blood_rush", name: "Blood Rush" },
  gravekeeper: { id: "army_of_the_damned", name: "Army of the Damned" },
  ember_matriarch: { id: "meteor_siege", name: "Meteor Siege" },
  hollow_king: { id: "soul_tether", name: "Soul Tether" },
  deathstalker: { id: "marked_prey", name: "Marked Prey" },
  dune_leviathan: { id: "burrow", name: "Burrow" },
  mirage_djinn: { id: "mirage", name: "Mirage" },
};

/**
 * bosses.lua `MECHANICS` (D-096), com o que cada uma pega de `ATTACKS`:
 * - Blood Rush: a cada 10% de vida perdida, +6% de velocidade e +5% de dano.
 * - Army of the Damned (D-199): uma invocação por fase (4, 6 e 8), aviso e lacaio de `ATTACKS.summon`; sai da rotação.
 * - Meteor Siege: cada meteoro deixa fogo no chão (`ATTACKS.meteorstorm` `fireTime`, `fireDps` × dano do chefe, raio ×0,8).
 * - Soul Tether (D-256): Selos de Alma por fase (2, 3, 3), cada um com 6% da vida do chefe; com selo de pé o chefe leva 35%.
 * - Marked Prey: o ataque `mark` marca o herói (`ATTACKS.mark` `markTime`, `markMult`); marcado, ele leva ×1,25 de todo dano
 *   desse chefe (boss_ai.lua `BA.damage`, conta na hora em que o golpe ou o tiro sai).
 */
export const BOSS_MECHANICS = {
  blood_rush: { perStep: 0.10, speed: 0.06, damage: 0.05 },
  army_of_the_damned: { perPhase: [4, 6, 8], minion: "goblin", warning: 0.8 },
  meteor_siege: { fireTime: 2.5, fireDps: 0.35, radiusMult: 0.8 },
  soul_tether: { perPhase: [2, 3, 3], damageTakenMult: 0.35, wardHp: 0.06 },
  marked_prey: { mult: 1.25 },
  /** boss_ai_ext.lua `burrow`: a cada `interval` s (o primeiro em `first`, `mechanicTimer` de boss.lua) some `under` s e
   * emerge onde o herói estava, círculo de `radius` px com ×`dmg` */
  burrow: { interval: 8, under: 1.2, radius: 70, dmg: 1.4, first: 3 },
  /** boss_ai_ext.lua `mirage` e `spawnHelpers`: a cada fase, `perPhase` cópias a `ring` px do chefe com `illusionHp` da vida
   * dele e `damage` do dano dele; as da fase anterior somem */
  mirage: { perPhase: [2, 2, 2], illusionHp: 0.07, ring: 110, damage: 0.35 },
} as const;
