// Inimigos e chefes, a partir de dungeon-idle/src/data/enemies.lua e bosses.lua.
// hp/damage/xp são os valores canônicos; distâncias já convertidas (px / 16).
import type { LeapSpec } from "../core/leap";

export type EnemyBehavior = "melee" | "ranged" | "charger" | "summoner" | "bombardier" | "shield" | "leaper" | "static";
export type BodyKind = "humanoid" | "brute" | "bug" | "robed" | "slime" | "toad" | "wisp";

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
  /** enemies.lua `armor`: a fórmula de armadura do herói (`armorReduction`) no dano que leva */
  armor?: number;
  /**
   * enemies.lua `shieldArcDeg`, `shieldDamageMult`, `shieldTurnRate` (rad/s): escudo de frente que gira devagar para o herói;
   * o dano que vem de dentro do arco é multiplicado por `damageMult` (ai.lua `behaviors.shield`, damage.lua `shieldBlocks`)
   */
  shield?: { arcDeg: number; damageMult: number; turnRate: number };
  /**
   * enemies.lua `hexDuration`, `hexDamageMult`: o tiro que acerta amaldiçoa o herói, que causa `damageMult` do dano por `duration` s
   * (enemy_attacks.lua `applyHex`: renova sem acumular, fica o tempo maior e o multiplicador menor)
   */
  hex?: { duration: number; damageMult: number };
  /**
   * enemies.lua `hazardRadius`, `hazardDuration` e ai.lua `onKill` (§54, D-069): ao morrer deixa uma poça de peste de raio
   * `radius` (m; px × TUNING.enemy.pxToUnit) por `duration` s, que fere o herói em `dpsBase + dpsPerWave × onda` por segundo
   */
  plague?: { radius: number; duration: number; dpsBase: number; dpsPerWave: number };
  /**
   * enemies.lua `supportRadius`, `supportDamageMult` (§54, D-071): aliados a até `radius` m (px × TUNING.enemy.pxToUnit) levam
   * `damageMult` do dano (damage.lua `wardenNearby`; um Warden não protege outro)
   */
  support?: { radius: number; damageMult: number };
  /**
   * enemies.lua `leapCooldown`, `leapRange`, `leapRadius`, `leapDamage`, `leapWindup`, `leapAirTime` e ai.lua `behaviors.leaper`
   * (o mínimo de 70 px e a altura `hop` de 26 px): salto marcado até o lugar do herói; distâncias em m (px × TUNING.enemy.pxToUnit)
   */
  leap?: LeapSpec;
  /** enemies.lua `helper`: ajudante de chefe, nunca na composição da onda e sem recompensa (nem orbe de cura) */
  helper?: boolean;
  /** enemies.lua `sprite` e `alpha`: usa o corpo de outro personagem, com esta opacidade (as cópias do Mirage Djinn) */
  look?: { model: string; opacity: number };
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
  // M9-01: corpo provisório por código (D17); a arte do Blender fica para a fase 2
  shieldbearer: { id: "shieldbearer", name: "Shieldbearer", hp: 94, speed: 1.7, damage: 11, behavior: "shield", radius: 0.66, xp: 52, gold: 11,
    category: "elite", cooldown: 1.6, attackRange: 1.6, armor: 20, shield: { arcDeg: 70, damageMult: 0.2, turnRate: 0.7 },
    body: "brute", color: 0x8a96aa, accent: 0x4a5a78, scale: 1.1 },
  // M9-02: bruxa curvada do tiro de maldição (hex_bolt verde); corpo no Blender (tools/blender/hexer.py)
  hexer: { id: "hexer", name: "Hexer", hp: 40, speed: 1.95, damage: 7, behavior: "ranged", radius: 0.47, xp: 48, gold: 10, category: "ranged",
    cooldown: 2.8, range: 15, projectileSpeed: 10.5, projectileColor: 0x7ad94a, hex: { duration: 3, damageMult: 0.88 },
    body: "robed", color: 0x5a2f5e, accent: 0x7ad94a, scale: 0.95 },
  // M9-03: zumbi inchado com barril nas costas; ao morrer vira uma poça de peste; corpo no Blender (tools/blender/plaguebearer.py)
  plaguebearer: { id: "plaguebearer", name: "Plaguebearer", hp: 57, speed: 2.1, damage: 8, behavior: "melee", radius: 0.56, xp: 50, gold: 12,
    category: "special", cooldown: 1.4, attackRange: 1.5, plague: { radius: 3, duration: 3.8, dpsBase: 5, dpsPerWave: 0.45 },
    body: "brute", color: 0xb8a868, accent: 0x8c2a22, scale: 1.05 },
  // M9-04: golem lento que protege os aliados por perto (aura azul); corpo no Blender (tools/blender/warden.py)
  warden: { id: "warden", name: "Warden", hp: 72, speed: 1.75, damage: 7, behavior: "melee", radius: 0.63, xp: 64, gold: 15,
    category: "elite", cooldown: 1.6, attackRange: 1.55, support: { radius: 7, damageMult: 0.65 },
    body: "brute", color: 0x6a7a8a, accent: 0x66b8ff, scale: 1.2 },
  // M9-05: sapo com chifres que salta no lugar do herói (círculo no chão); corpo no Blender (tools/blender/leaper.py)
  leaper: { id: "leaper", name: "Leaper", hp: 43, speed: 3.2, damage: 9, behavior: "leaper", radius: 0.47, xp: 52, gold: 12,
    category: "special", cooldown: 1.4, attackRange: 1.35,
    leap: { cooldown: 5.3, range: 245 / 16, minDist: 70 / 16, radius: 38 / 16, damage: 1.15, windup: 0.6, airTime: 0.45, height: 26 / 16 },
    body: "toad", color: 0xc8962a, accent: 0xeee0b0, scale: 1.0 },
};

/**
 * enemies.lua `soul_ward` (1.6 D-208): o Selo de Alma do Hollow King (Soul Tether). Parado e sem dano; a vida vem do chefe
 * (`BOSS_MECHANICS.soul_tether.wardHp`). Corpo no Blender (tools/blender/soul_ward.py). Fora de `ENEMIES` para não entrar no
 * sorteio nem nas listas de inimigos; `enemyDef` acha os dois.
 */
export const HELPERS: Record<string, EnemyDef> = {
  soul_ward: { id: "soul_ward", name: "Soul Ward", hp: 60, speed: 0, damage: 0, behavior: "static", radius: 15 / 16, xp: 0, gold: 0,
    category: "special", cooldown: 99, helper: true, body: "wisp", color: 0x69bfa6, accent: 0x73ffcc, scale: 1 },
  /**
   * enemies.lua `mirage_illusion` (1.6 D-208): as cópias do Mirage Djinn. Atiradoras; vida e dano vêm do chefe
   * (`BOSS_MECHANICS.mirage`); desenhadas com o corpo do chefe (`look`) a 55% de opacidade (`alpha` de lá).
   */
  mirage_illusion: { id: "mirage_illusion", name: "Mirage", hp: 60, speed: 40 / 16, damage: 6, behavior: "ranged", radius: 20 / 16, xp: 0, gold: 0,
    category: "special", cooldown: 2.4, range: 260 / 16, projectileSpeed: 190 / 16, projectileColor: 0xff8ce6, helper: true,
    look: { model: "mirage_djinn", opacity: 0.55 }, body: "robed", color: 0x3ec8c0, accent: 0x6a2a8a, scale: 1 },
};

/** enemy_attacks.lua `EA.hazard`: tique padrão das poças no chão, em s */
export const HAZARD_TICK = 0.5;

/** tuning.lua `SHIELD_CYCLE` (D-178): o escudo do Shieldbearer fica erguido `up` s, pisca `warn` s e cai `down` s */
export const SHIELD_CYCLE = { up: 6, warn: 1, down: 5 } as const;

export type BossPatternKind = "slam" | "charge" | "nova" | "fan" | "summon" | "meteors" | "spiral" | "skillshot" | "mark" | "crossfire"
  | "sandvolley" | "tailsweep" | "erupt" | "orbitals" | "prismbeam" | "miragedash" | "venomfield"
  | "acidlob" | "slimewave" | "frostbreath" | "iciclerain" | "glacierdive" | "stormfield" | "radial"
  | "quake" | "armorbreak" | "leap";

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
  /** `mark`: a retícula segue o herói por `warning` s e fica travada `lock` s antes de bater */
  lock?: number;
  /** `mark`: quanto tempo o herói fica marcado e o multiplicador do dano do chefe nele */
  markTime?: number;
  markMult?: number;
  /** `sandvolley`: buracos na parede e distância entre tiros (m); `tailsweep`: número de linhas; `tailsweep`/`erupt`: s entre um e outro */
  gap?: number;
  spacing?: number;
  lines?: number;
  stagger?: number;
  /** `orbitals`: giro do orbe em rad/s (o sentido é sorteado) e alcance em m; `prismbeam`: graus entre as linhas */
  curve?: number;
  reach?: number;
  stepDeg?: number;
  /** `miragedash`: s sumido, distância do herói onde reaparece (m), tiros da nova e o dano deles */
  blink?: number;
  away?: number;
  nova?: number;
  novaDamage?: number;
  /** multiplicador da velocidade do tiro de chefe (`BOSS_PROJECTILE_SPEED`) */
  speedMult?: number;
  /** `fan` (bosses.lua `fanvolley`): tiros quando o chefe está enfurecido (fase 3) */
  enragedCount?: number;
  /** `venomfield`: s que a poça fica no chão, dano por s (× dano do chefe) e distância dos círculos extras ao herói (m) */
  time?: number;
  dps?: number;
  around?: number;
  /** `acidlob`: raio da poça (× raio do círculo); `slimewave`: miolo seguro (× raio) e grossura do anel (m) */
  poolScale?: number;
  inner?: number;
  thickness?: number;
  /** `frostbreath`: meia abertura do cone (graus) e s de Chilled em quem leva; `iciclerain`: distância entre círculos (m) */
  halfAngleDeg?: number;
  /** `armorbreak`: armadura que o herói perde (negativa) por `time` s */
  armor?: number;
  chill?: number;
  step?: number;
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
  /** bosses.lua `preferred`: distância que o chefe tenta manter do herói, em m (sem = vai atrás, como lá o 0) */
  preferred?: number;
  /** bosses.lua `minDifficulty` (boss_bag.lua `Bag.allowed`): só sai do saco dessa dificuldade para cima */
  minDifficulty?: "hard";
  /** M10-08 (bosses.lua `guard`, §65): levanta a guarda de frente de tempos em tempos (`BOSS_GUARD`) */
  guard?: boolean;
  /** M10-08 (bosses.lua `boulder`, D-219): arremessa pedra no herói na recarga do tiro comum (`BOSS_BOULDER`) */
  boulder?: boolean;
  /** M10-08 (bosses.lua `phaseSpeed`, D-219): multiplicador do passo ao entrar em cada fase, além do da fase */
  phaseSpeed?: readonly [number, number, number];
}

/** Ordem dos 13 chefes em `bosses.lua` (`B.order`); o saco usa os que existem em `BOSSES` (M20-09, D6). */
export const BOSS_ORDER = [
  "bloodfang", "deathstalker", "storm_tyrant", "iron_colossus", "venom_hydra", "gravekeeper", "void_reaver",
  "ember_matriarch", "rimefang_wyrm", "gorged_ooze", "dune_leviathan", "hollow_king", "mirage_djinn",
] as const;

/**
 * `bosses.lua` `CROWN.borrow`: ataques que o rei coroado da onda 20 pode pegar de outro chefe. Lá são `nova`,
 * `crossfire`, `radial`, `fanvolley`, `spiralvolley`, `stormfield`, `venomfield` e `quake`; aqui só existem os
 * equivalentes de todos: `nova`, `crossfire` (M10-01), `radial` e `stormfield` (M10-07), `fanvolley`, `spiralvolley`,
 * `venomfield` (M10-04) e `quake` (M10-08).
 */
export const CROWN_BORROW = ["nova", "crossfire", "radial", "fan", "spiral", "stormfield", "venomfield", "quake"] as const;

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
      // M10-10 (D-199): a invocação saiu da rotação; o exército vem uma vez por fase (Army of the Damned)
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
  // M10-01: o caçador. Fica a 230 px do herói; skillshot desde a fase 1, Mark na 2 e Crossfire na 3 (bosses.lua, px ÷ 16).
  deathstalker: {
    id: "deathstalker", name: "Deathstalker", title: "The Hunter", hp: 1700, damage: 12, speed: 2.9, radius: 1.5,
    attackRange: 3.0, attackCooldown: 1.5, patternCooldown: 4.0, preferred: 230 / 16,
    patterns: [
      { kind: "skillshot", warning: 0.45, damage: 1.1, width: 10 / 16, length: 520 / 16, radius: 6 / 16 },
      { kind: "mark", warning: 1.0, lock: 0.55, damage: 1.25, radius: 42 / 16, markTime: 4, markMult: 1.25 },
      { kind: "crossfire", warning: 0.8, damage: 1.2, width: 26 / 16, length: 840 / 16 },
    ],
    body: "bug", color: 0x2a2d33, accent: 0xd9a23a, glow: 0x8cff7a, scale: 2.4, projectileColor: 0xb6ff7a, xp: 55,
    relicBuild: "hunter",
  },
  // M10-02: a serpente da areia. Fica a 150 px; parede de areia, varrida de cauda na 2 e erupções na 3 (px ÷ 16).
  dune_leviathan: {
    id: "dune_leviathan", name: "Dune Leviathan", title: "The Burrower", hp: 2200, damage: 13, speed: 2.8, radius: 1.6,
    attackRange: 3.2, attackCooldown: 1.6, patternCooldown: 4.0, preferred: 150 / 16,
    patterns: [
      { kind: "sandvolley", warning: 0.8, damage: 0.8, count: 15, gap: 3, spacing: 30 / 16 },
      { kind: "tailsweep", warning: 0.7, damage: 1.2, width: 30 / 16, length: 300 / 16, lines: 3, spreadDeg: 70, stagger: 0.2 },
      { kind: "erupt", warning: 0.8, damage: 1.2, radius: 52 / 16, count: 3, stagger: 0.45 },
    ],
    body: "bug", color: 0x8a6a3a, accent: 0xf0b0a8, glow: 0xffc86a, scale: 2.4, projectileColor: 0xe8c47a, xp: 60,
  },
  // M10-04: a mãe da ninhada. Fica a 170 px; campos de veneno, skillshot na 2 e leque na 3 (bosses.lua, px ÷ 16).
  // Venom Bloom: todo tiro dela vira poça onde acaba (BOSS_MECHANICS.venom_bloom).
  venom_hydra: {
    id: "venom_hydra", name: "Venom Hydra", title: "The Broodmother", hp: 2100, damage: 13, speed: 2.9, radius: 1.6,
    attackRange: 3.2, attackCooldown: 1.6, patternCooldown: 4.0, preferred: 170 / 16,
    patterns: [
      { kind: "venomfield", warning: 0.8, damage: 0, dps: 0.7, radius: 52 / 16, count: 3, time: 5, around: 90 / 16 },
      { kind: "skillshot", warning: 0.45, damage: 1.1, width: 10 / 16, length: 520 / 16, radius: 6 / 16 },
      { kind: "fan", warning: 0.4, damage: 1.0, count: 5, enragedCount: 7, spreadDeg: 50 },
    ],
    body: "brute", color: 0x3f7a2a, accent: 0xd8cf8a, glow: 0x9be84a, scale: 2.4, projectileColor: 0x8ce63a, xp: 65,
    relicBuild: "venom_hydra",
  },
  // M10-05: a gosma devoradora. Vai atrás do herói (preferred 0); ácido, onda de lodo na 2 e bote na 3 (bosses.lua, px ÷ 16).
  // Mitosis: 3 splitters invocados ao entrar nas fases 2 e 3 (BOSS_MECHANICS.mitosis).
  gorged_ooze: {
    id: "gorged_ooze", name: "Gorged Ooze", title: "The Devourer", hp: 2600, damage: 13, speed: 2.4, radius: 1.8,
    attackRange: 3.2, attackCooldown: 1.6, patternCooldown: 4.0,
    patterns: [
      { kind: "acidlob", warning: 1.0, damage: 0.9, radius: 44 / 16, count: 3, stagger: 0.15, around: 75 / 16, time: 4, dps: 0.35, poolScale: 0.85 },
      { kind: "slimewave", warning: 0.9, damage: 1.1, radius: 130 / 16, inner: 0.35, speed: 220 / 16, thickness: 22 / 16 },
      { kind: "charge", warning: 0.8, damage: 1.5, length: 320 / 16, width: 48 / 16, speed: 300 / 16 },
    ],
    body: "brute", color: 0x99f259, accent: 0x2f5a1a, glow: 0xb6ff5a, scale: 2.0, projectileColor: 0x9be84a, xp: 70,
  },
  // M10-06: o dragão de gelo. Mantém 170 px; sopro em cone, chuva de estalactites na 2 e mergulho na 3 (bosses.lua, px ÷ 16).
  // Glacial Wake: deixa gelo onde passa e o gelo deixa o herói lento (BOSS_MECHANICS.glacial_wake).
  rimefang_wyrm: {
    id: "rimefang_wyrm", name: "Rimefang Wyrm", title: "The Wyrm", hp: 2100, damage: 13, speed: 3.0, radius: 1.6,
    attackRange: 3.2, attackCooldown: 1.6, patternCooldown: 4.0, preferred: 170 / 16,
    patterns: [
      { kind: "frostbreath", warning: 1.0, damage: 1.0, length: 240 / 16, halfAngleDeg: 28, chill: 2.0 },
      { kind: "iciclerain", warning: 0.7, damage: 0.9, radius: 30 / 16, count: 7, stagger: 0.12, step: 58 / 16 },
      { kind: "glacierdive", warning: 1.0, damage: 1.5, radius: 88 / 16, poolScale: 0.8 },
    ],
    body: "brute", color: 0x8cd9ff, accent: 0xe8f6ff, glow: 0x9fe6ff, scale: 2.4, projectileColor: 0xbfefff, xp: 70,
  },
  // M10-07: o rei da tempestade. Mantém 190 px; skillshot, campo de tempestade na 2 e rajada radial na 3 (bosses.lua, px ÷ 16).
  // Storm Field: a cada 5 s um raio cai onde o herói está e deixa zona elétrica (BOSS_MECHANICS.storm_field).
  storm_tyrant: {
    id: "storm_tyrant", name: "Storm Tyrant", title: "The Stormcaller", hp: 2000, damage: 13, speed: 2.8, radius: 1.5,
    attackRange: 3.2, attackCooldown: 1.6, patternCooldown: 4.0, preferred: 190 / 16,
    patterns: [
      { kind: "skillshot", warning: 0.45, damage: 1.1, width: 10 / 16, length: 520 / 16, radius: 6 / 16 },
      { kind: "stormfield", warning: 0.8, damage: 0, dps: 0.55, radius: 50 / 16, count: 3, time: 4, around: 80 / 16 },
      { kind: "radial", warning: 0.5, damage: 0.7, count: 18, speedMult: 0.8 },
    ],
    body: "robed", color: 0x8c99ff, accent: 0xe8d27a, glow: 0xbfd0ff, scale: 2.5, projectileColor: 0x9fc8ff, xp: 65,
    relicBuild: "stormcaller",
  },
  // M10-08: o colosso de ferro. Vai atrás do herói (lento); Quake em anel, Armorbreak na 2 e salto na fúria (bosses.lua,
  // px ÷ 16). Earthbreaker: cada um desses golpes deixa chão rachado. Levanta a guarda, arremessa pedras e acelera por fase.
  iron_colossus: {
    id: "iron_colossus", name: "Iron Colossus", title: "The Juggernaut", hp: 2600, damage: 14, speed: 2.4, radius: 1.8,
    attackRange: 3.4, attackCooldown: 1.7, patternCooldown: 4.0,
    patterns: [
      { kind: "quake", warning: 0.9, damage: 1.1, radius: 145 / 16, inner: 0.45, speed: 260 / 16, thickness: 20 / 16 },
      { kind: "armorbreak", warning: 0.9, damage: 1.2, radius: 64 / 16, armor: -15, time: 6 },
      { kind: "leap", warning: 1.0, damage: 1.4, radius: 92 / 16 },
    ],
    body: "brute", color: 0xb3b8c7, accent: 0x4a4e58, glow: 0xff8a3a, scale: 2.4, projectileColor: 0x8a7a6a, xp: 70,
    relicBuild: "iron_colossus", guard: true, boulder: true, phaseSpeed: [1, 1.15, 1.35 / 1.15],
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
    minDifficulty: "hard",
  },
  // M10-03: o ilusionista. Fica a 190 px; orbes em espiral, feixe prismático na 2 e investida da miragem na 3 (px ÷ 16).
  // Mirage: 2 cópias a cada fase (HELPERS.mirage_illusion). Só na Hard (bosses.lua `minDifficulty`).
  mirage_djinn: {
    id: "mirage_djinn", name: "Mirage Djinn", title: "The Illusionist", hp: 2000, damage: 13, speed: 3.1, radius: 1.4,
    attackRange: 3.0, attackCooldown: 1.5, patternCooldown: 4.0, preferred: 190 / 16,
    patterns: [
      { kind: "orbitals", warning: 0.5, damage: 0.7, count: 8, curve: 1.6, speedMult: 0.75, reach: 900 / 16 },
      { kind: "prismbeam", warning: 0.55, damage: 1.1, width: 22 / 16, length: 600 / 16, lines: 6, stepDeg: 22, stagger: 0.16 },
      { kind: "miragedash", warning: 0.7, blink: 0.45, damage: 1.3, width: 26 / 16, length: 700 / 16, away: 140 / 16, nova: 8, novaDamage: 0.6, speedMult: 0.7 },
    ],
    body: "robed", color: 0x3ec8c0, accent: 0x6a2a8a, glow: 0xff8ce6, scale: 2.4, projectileColor: 0xff8ce6, xp: 75,
    minDifficulty: "hard",
  },
};
