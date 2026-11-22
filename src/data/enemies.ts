// Inimigos e chefes, a partir de dungeon-idle/src/data/enemies.lua e bosses.lua.
// hp/damage/xp são os valores canônicos; distâncias já convertidas (px / 16).

export type EnemyBehavior = "melee" | "ranged" | "charger" | "summoner" | "bombardier";
export type BodyKind = "humanoid" | "brute" | "bug" | "robed" | "slime";

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  speed: number;
  damage: number;
  behavior: EnemyBehavior;
  radius: number;
  xp: number;
  /** ouro que rende (no fim da onda, como sobrevivente; o M7 traz os orbes de ouro) */
  gold: number;
  /** enemies.lua `category`: decide a chance do orbe de cura */
  category: "basic" | "ranged" | "elite" | "special";
  cooldown: number;
  attackRange?: number;
  range?: number;
  projectileSpeed?: number;
  projectileColor?: number;
  summon?: { id: string; count: number; cooldown: number };
  /** ai.lua `berserker`: com a vida em `threshold` ou menos, fica furioso (velocidade e dano multiplicados) */
  berserk?: { threshold: number; speed: number; damage: number };
  splitInto?: { id: string; count: number };
  charge?: { cooldown: number; range: number; speed: number; windup: number; damage: number };
  /** enemies.lua `mortarCooldown`, `mortarRadius`, `mortarWarning`: a bomba no chão, com recarga própria */
  mortar?: { radius: number; warning: number; cooldown: number };
  body: BodyKind;
  color: number;
  accent: number;
  scale: number;
}

export const ENEMIES: Record<string, EnemyDef> = {
  goblin: { id: "goblin", name: "Goblin", hp: 36, speed: 3.0, damage: 5, behavior: "melee", radius: 0.5, xp: 20, gold: 4, category: "basic",
    cooldown: 1.2, attackRange: 1.4, body: "humanoid", color: 0x6fae4a, accent: 0x7a5230, scale: 0.8 },
  orc: { id: "orc", name: "Orc", hp: 64, speed: 2.1, damage: 10, behavior: "melee", radius: 0.7, xp: 32, gold: 7, category: "basic",
    cooldown: 1.4, attackRange: 1.7, body: "brute", color: 0x4d7a3a, accent: 0x5b4636, scale: 1.15 },
  swarm: { id: "swarm", name: "Swarm", hp: 17, speed: 4.3, damage: 4, behavior: "melee", radius: 0.38, xp: 10, gold: 2, category: "basic",
    cooldown: 1.0, attackRange: 1.1, body: "bug", color: 0x8a5ac8, accent: 0xd9c8ff, scale: 0.6 },
  assassin: { id: "assassin", name: "Assassin", hp: 29, speed: 5.4, damage: 12, behavior: "melee", radius: 0.42, xp: 38, gold: 9, category: "basic",
    cooldown: 1.7, attackRange: 1.3, body: "humanoid", color: 0x3a2f55, accent: 0xc23b5a, scale: 0.9 },
  archer: { id: "archer", name: "Archer", hp: 34, speed: 2.3, damage: 7, behavior: "ranged", radius: 0.45, xp: 28, gold: 4, category: "ranged",
    cooldown: 1.8, range: 12, projectileSpeed: 13.5, projectileColor: 0xe8d9a0,
    body: "humanoid", color: 0x8a6a3c, accent: 0x3f6b4a, scale: 0.9 },
  spellcaster: { id: "spellcaster", name: "Spellcaster", hp: 42, speed: 1.9, damage: 9, behavior: "ranged", radius: 0.47, xp: 40, gold: 8, category: "ranged",
    cooldown: 2.7, range: 14, projectileSpeed: 11, projectileColor: 0xc86bff,
    body: "robed", color: 0x5a3f9a, accent: 0xc86bff, scale: 0.95 },
  bombardier: { id: "bombardier", name: "Bombardier", hp: 48, speed: 1.7, damage: 10, behavior: "bombardier", radius: 0.53, xp: 55, gold: 13, category: "ranged",
    cooldown: 3.6, range: 17, mortar: { radius: 3.2, warning: 1.25, cooldown: 4.2 }, projectileSpeed: 9.4, projectileColor: 0xff9a3c,
    body: "brute", color: 0x7a4a2a, accent: 0x2b2b2b, scale: 0.95 },
  summoner: { id: "summoner", name: "Summoner", hp: 58, speed: 1.6, damage: 6, behavior: "summoner", radius: 0.53, xp: 58, gold: 12, category: "special",
    cooldown: 3.4, range: 14, projectileSpeed: 11, projectileColor: 0x7affc8,
    summon: { id: "swarm", count: 2, cooldown: 5.5 },
    body: "robed", color: 0x2f6a5a, accent: 0x7affc8, scale: 1.0 },
  berserker: { id: "berserker", name: "Berserker", hp: 52, speed: 3.4, damage: 9, behavior: "charger", radius: 0.69, xp: 46, gold: 10, category: "elite",
    cooldown: 1.3, attackRange: 1.5, charge: { cooldown: 6, range: 15, speed: 17, windup: 0.7, damage: 1.25 },
    berserk: { threshold: 0.5, speed: 1.55, damage: 1.35 },
    body: "brute", color: 0xa83a2a, accent: 0xe8c8a0, scale: 1.1 },
  splitter: { id: "splitter", name: "Splitter", hp: 46, speed: 2.0, damage: 7, behavior: "melee", radius: 0.8, xp: 42, gold: 9, category: "special",
    cooldown: 1.3, attackRange: 1.9, splitInto: { id: "swarm", count: 2 },
    body: "slime", color: 0x7ad94a, accent: 0xc8ffa0, scale: 1.1 },
};

export type BossPatternKind = "slam" | "charge" | "nova" | "fan" | "summon" | "meteors" | "spiral";

export interface BossPattern {
  kind: BossPatternKind;
  warning: number;
  damage: number; // multiplicador do dano do chefe
  radius?: number;
  count?: number;
  length?: number;
  width?: number;
  speed?: number;
  spreadDeg?: number;
  minion?: string;
}

export interface BossDef {
  id: string;
  name: string;
  title: string;
  hp: number;
  damage: number;
  speed: number;
  radius: number;
  attackRange: number;
  attackCooldown: number;
  patternCooldown: number;
  patterns: BossPattern[];
  body: BodyKind;
  color: number;
  accent: number;
  glow: number;
  scale: number;
  projectileColor: number;
  xp: number;
  /** bosses.lua `relicBuild`: as relíquias de chefe por build (§69) que este chefe dá; sem = só as universais */
  relicBuild?: string;
}

/** Ordem dos 13 chefes em `bosses.lua` (`B.order`); o saco usa os que existem em `BOSSES` (M20-09, D6). */
export const BOSS_ORDER = [
  "bloodfang", "deathstalker", "storm_tyrant", "iron_colossus", "venom_hydra", "gravekeeper", "void_reaver",
  "ember_matriarch", "rimefang_wyrm", "gorged_ooze", "dune_leviathan", "hollow_king", "mirage_djinn",
] as const;

/**
 * `bosses.lua` `CROWN.borrow`: ataques que o rei coroado da onda 20 pode pegar de outro chefe. Lá são `nova`,
 * `crossfire`, `radial`, `fanvolley`, `spiralvolley`, `stormfield`, `venomfield` e `quake`; aqui só existem os
 * equivalentes de `nova`, `fanvolley` e `spiralvolley` (os outros chegam com os chefes do `M10`).
 */
export const CROWN_BORROW = ["nova", "fan", "spiral"] as const;

/** Título do rei coroado (en.lua: "THE CROWNED KING", D-640). */
export const CROWN_TITLE = "The Crowned King";

export const BOSSES: Record<string, BossDef> = {
  bloodfang: {
    id: "bloodfang", name: "Bloodfang", title: "The Berserker", hp: 1500, damage: 14, speed: 3.6, radius: 1.5,
    attackRange: 3.0, attackCooldown: 1.5, patternCooldown: 4.6,
    patterns: [
      { kind: "charge", warning: 0.8, damage: 1.5, length: 22, width: 3.2, speed: 26 },
      { kind: "slam", warning: 0.9, damage: 1.5, radius: 6.5 },
      { kind: "fan", warning: 0.5, damage: 0.9, count: 5, spreadDeg: 50, speed: 13 },
    ],
    body: "brute", color: 0xb8262e, accent: 0x3a1a1a, glow: 0xff3b3b, scale: 2.6, projectileColor: 0xff5a4a, xp: 50,
    relicBuild: "berserker",
  },
  gravekeeper: {
    id: "gravekeeper", name: "Gravekeeper", title: "The Summoner", hp: 2100, damage: 12, speed: 2.6, radius: 1.4,
    attackRange: 3.0, attackCooldown: 1.7, patternCooldown: 4.4,
    patterns: [
      { kind: "summon", warning: 0.8, damage: 0, count: 4, minion: "goblin" },
      { kind: "meteors", warning: 1.0, damage: 1.2, radius: 3.0, count: 5 },
      { kind: "nova", warning: 0.6, damage: 0.8, count: 14, speed: 10 },
    ],
    body: "robed", color: 0x5f7fa3, accent: 0xd9e6f2, glow: 0x9ad1ff, scale: 2.5, projectileColor: 0x9ad1ff, xp: 60,
    relicBuild: "gravekeeper",
  },
  ember_matriarch: {
    id: "ember_matriarch", name: "Ember Matriarch", title: "The Artillerist", hp: 2400, damage: 13, speed: 2.8, radius: 1.5,
    attackRange: 3.2, attackCooldown: 1.6, patternCooldown: 4.0,
    patterns: [
      { kind: "meteors", warning: 1.1, damage: 1.3, radius: 2.9, count: 7 },
      { kind: "fan", warning: 0.4, damage: 1.0, count: 7, spreadDeg: 60, speed: 14 },
      { kind: "spiral", warning: 0.4, damage: 0.6, count: 24, speed: 9.5 },
      { kind: "slam", warning: 0.9, damage: 1.4, radius: 6 },
    ],
    body: "brute", color: 0x4a2a1e, accent: 0xff8a2a, glow: 0xff6a1a, scale: 2.7, projectileColor: 0xff8a2a, xp: 70,
  },
  hollow_king: {
    id: "hollow_king", name: "Hollow King", title: "The Lich", hp: 3000, damage: 14, speed: 3.0, radius: 1.5,
    attackRange: 3.2, attackCooldown: 1.5, patternCooldown: 3.6,
    patterns: [
      { kind: "nova", warning: 0.6, damage: 0.8, count: 18, speed: 10.5 },
      { kind: "spiral", warning: 0.4, damage: 0.6, count: 30, speed: 10 },
      { kind: "summon", warning: 0.8, damage: 0, count: 3, minion: "assassin" },
      { kind: "meteors", warning: 1.0, damage: 1.3, radius: 3.1, count: 8 },
      { kind: "charge", warning: 0.7, damage: 1.4, length: 22, width: 3.0, speed: 28 },
    ],
    body: "robed", color: 0x1f3a3a, accent: 0xe8d27a, glow: 0x73ffcc, scale: 2.8, projectileColor: 0x73ffcc, xp: 90,
  },
};
