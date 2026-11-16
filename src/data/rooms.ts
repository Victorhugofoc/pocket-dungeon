// Salas (§9) e salas amaldiçoadas (§10) do mapa da partida, valendo só para a onda seguinte.
// Fonte em dungeon-idle: src/data/rooms.lua (conferido por tests/parity.test.ts). Os perigos de chão (`hazards`,
// raios) e as poças de cura (`pools`) seguem src/run/room_effects.lua (núcleo em src/core/roomfx.ts).

/** As chaves da camada da onda em modifier_engine.lua; o que a sala não diz vale 1. */
export interface RoomMods {
  reward?: number;
  enemyHp?: number;
  enemyDamage?: number;
  enemySpeed?: number;
  projectileSpeed?: number;
  enemyCount?: number;
}

export type EnemyGroup = "ranged" | "caster" | "melee" | "heavy";

export interface RoomDef {
  id: string;
  name: string;
  kind: "room" | "curse";
  mods: RoomMods;
  /** a sala multiplica o peso do grupo dentro do sorteio normal da onda */
  bias?: { group: EnemyGroup; mult: number };
  /** Iron Pack: os pesados ganham vida e dano a mais */
  heavyScaling?: { hp: number; damage: number };
  /** Champion's Den: um campeão no meio do cronograma, com pelo menos tantos afixos (afixos no M9) */
  champions?: number;
  minAffixes?: number;
  /** Boss Ambush: um chefe enfraquecido entra na onda normal */
  ambush?: { hp: number; damage: number };
  ambushOnly?: boolean;
  /** Horde Den: sala opcional de lá (entra no sorteio do mesmo jeito) */
  extension?: boolean;
  hazards?: { interval: number; duration: number; rate?: number };
  pools?: { interval: number; duration: number; radius: number; heal: number };
  notes?: string[];
}

/** rooms.lua `GROUPS`: grupos de inimigos que o viés da sala olha. */
export const ENEMY_GROUPS: Readonly<Record<EnemyGroup, readonly string[]>> = {
  ranged: ["archer", "spellcaster", "hexer", "bombardier", "summoner"],
  caster: ["spellcaster", "hexer", "summoner"],
  melee: ["goblin", "orc", "swarm", "assassin", "shieldbearer", "berserker", "plaguebearer", "warden", "splitter", "leaper"],
  heavy: ["orc", "shieldbearer", "berserker", "warden"],
};

/** rooms.lua `BIAS`. */
export const ROOM_BIAS = { ranged: 3, caster: 3.5, melee: 2.5, strongMelee: 4, heavy: 4 } as const;

const B = ROOM_BIAS;
const room = (r: Omit<RoomDef, "kind">): RoomDef => ({ ...r, kind: "room" });
const curse = (r: Omit<RoomDef, "kind">): RoomDef => ({ ...r, kind: "curse" });

/** §9, na ordem de rooms.lua (`roomOrder`). */
export const ROOMS: readonly RoomDef[] = [
  room({ id: "burning_embers", name: "Burning Embers", mods: { reward: 1.28, enemyHp: 1.05, enemyDamage: 1.08, projectileSpeed: 1.15 },
    bias: { group: "ranged", mult: B.ranged }, notes: ["Mais inimigos à distância"] }),
  room({ id: "arrow_hall", name: "Arrow Hall", mods: { reward: 1.36, enemyDamage: 1.12, enemyCount: 1.10, projectileSpeed: 1.18 },
    bias: { group: "ranged", mult: B.ranged }, notes: ["Mais inimigos à distância"] }),
  room({ id: "blood_moon", name: "Blood Moon", mods: { reward: 1.48, enemyHp: 1.18, enemyDamage: 1.15, enemySpeed: 1.08 } }),
  room({ id: "crosswind", name: "Crosswind", mods: { reward: 1.40, enemyHp: 1.05, enemyDamage: 1.08, projectileSpeed: 1.35 } }),
  room({ id: "swarm", name: "Swarm", mods: { reward: 1.43, enemyHp: 0.82, enemyDamage: 1.05, enemyCount: 1.55 } }),
  room({ id: "volatile_room", name: "Volatile Room", mods: { reward: 1.52, enemyHp: 1.10, enemyDamage: 1.20, enemyCount: 1.10, projectileSpeed: 1.20 } }),
  room({ id: "iron_pack", name: "Iron Pack", mods: { reward: 1.45, enemyHp: 1.10, enemyDamage: 1.15, enemyCount: 1.15, enemySpeed: 1.25 },
    bias: { group: "melee", mult: B.melee }, heavyScaling: { hp: 1.15, damage: 1.10 },
    notes: ["Mais inimigos corpo a corpo", "Pesados: Vida x1.15, Dano x1.10"] }),
  room({ id: "heavy_assault", name: "Heavy Assault", mods: { reward: 1.47, enemyHp: 1.30, enemyDamage: 1.12, enemyCount: 0.82 },
    bias: { group: "heavy", mult: B.heavy }, notes: ["Composição de pesados"] }),
  room({ id: "storm_floor", name: "Storm Floor", mods: { reward: 1.43, enemyHp: 1.05, enemyDamage: 1.10 },
    hazards: { interval: 3.25, duration: 4.25 }, notes: ["Zonas de raio persistentes"] }),
  room({ id: "horde_den", name: "Horde Den", extension: true, mods: { reward: 1.70, enemyCount: 1.60 },
    notes: ["Horda: muito mais inimigos na tela"] }),
  room({ id: "champions_den", name: "Champion's Den", mods: { reward: 1.58, enemyHp: 1.12, enemyDamage: 1.12, enemyCount: 0.95 },
    champions: 1, minAffixes: 2, notes: ["1 Elite com 2 afixos"] }),
  room({ id: "boss_ambush", name: "Boss Ambush", ambushOnly: true, mods: { reward: 1.55, enemyHp: 1.08, enemyDamage: 1.08 },
    ambush: { hp: 0.75, damage: 0.78 } }),
  room({ id: "berserker_den", name: "Berserker Den", mods: { reward: 1.50, enemyHp: 1.08, enemyDamage: 1.10, enemyCount: 1.30, enemySpeed: 1.30 },
    bias: { group: "melee", mult: B.strongMelee }, notes: ["Forte viés corpo a corpo"] }),
  room({ id: "arcane_chamber", name: "Arcane Chamber", mods: { reward: 1.50, enemyHp: 1.08, enemyDamage: 1.12, projectileSpeed: 1.15 },
    bias: { group: "caster", mult: B.caster }, notes: ["Mais conjuradores"] }),
  room({ id: "fractured_floor", name: "Fractured Floor", mods: { reward: 1.55, enemyHp: 1.05, enemyDamage: 1.12 },
    hazards: { interval: 3.25, duration: 4.25, rate: 1.80 }, notes: ["Raios x1.80 mais frequentes"] }),
  room({ id: "boss_ambush_plus", name: "Boss Ambush+", ambushOnly: true,
    mods: { reward: 1.72, enemyHp: 1.10, enemyDamage: 1.10, enemyCount: 0.95, projectileSpeed: 1.05 }, ambush: { hp: 0.68, damage: 0.74 } }),
  room({ id: "sanctuary_floor", name: "Sanctuary Floor", mods: { reward: 1.34, enemyHp: 1.05, enemyDamage: 1.16 },
    pools: { interval: 5.6, duration: 8, radius: 58, heal: 2 }, notes: ["Poças de cura (2 de vida/tique)"] }),
  room({ id: "blessed_onslaught", name: "Blessed Onslaught",
    mods: { reward: 1.52, enemyHp: 1.15, enemyDamage: 1.12, enemyCount: 1.18, projectileSpeed: 1.05 },
    pools: { interval: 4.6, duration: 8, radius: 54, heal: 2 }, notes: ["Poças de cura frequentes"] }),
];

/** §10, na ordem de rooms.lua (`curseOrder`). Uma maldição vale por 2 ondas, sem mapa entre elas. */
export const CURSES: readonly RoomDef[] = [
  curse({ id: "cursed_blood", name: "Cursed Blood", mods: { enemyHp: 1.25, enemyDamage: 1.15, reward: 1.55 } }),
  curse({ id: "glass_crypt", name: "Glass Crypt", mods: { enemyHp: 0.85, enemyDamage: 1.40, reward: 1.48 } }),
  curse({ id: "swarm_pit", name: "Swarm Pit", mods: { enemyHp: 0.82, enemyDamage: 1.05, enemyCount: 1.45, reward: 1.52 } }),
  curse({ id: "blood_hunt", name: "Blood Hunt", mods: { enemyHp: 1.08, enemyDamage: 1.10, enemySpeed: 1.25, reward: 1.50 } }),
  curse({ id: "storm_vault", name: "Storm Vault", mods: { enemyHp: 1.08, enemyDamage: 1.10, reward: 1.50 },
    hazards: { interval: 3.25, duration: 4.25 }, notes: ["Zonas de raio persistentes"] }),
  curse({ id: "iron_grave", name: "Iron Grave", mods: { enemyHp: 1.40, enemyDamage: 1.12, enemyCount: 0.72, reward: 1.58 },
    bias: { group: "heavy", mult: B.heavy }, notes: ["Pesados corpo a corpo"] }),
  curse({ id: "arcane_rift", name: "Arcane Rift", mods: { enemyHp: 1.10, enemyDamage: 1.10, projectileSpeed: 1.30, reward: 1.52 },
    bias: { group: "ranged", mult: B.ranged }, notes: ["Mais inimigos à distância"] }),
  curse({ id: "deadly_crossroads", name: "Deadly Crossroads",
    mods: { enemyHp: 1.12, enemyDamage: 1.12, enemySpeed: 1.12, enemyCount: 1.20, reward: 1.55 } }),
];

/** rooms.lua `STORM` (D-080, provisório lá também): aviso, raio em px, tique, dano por segundo = base + onda × perWave,
 * chance de cair perto do herói (até `nearPlayerPx`, número fixo em room_effects.lua). Distâncias × TUNING.enemy.pxToUnit. */
export const STORM = { warning: 0.8, radius: 44, tick: 0.5, dpsBase: 4, dpsPerWave: 0.5, nearPlayerChance: 0.6, nearPlayerPx: 110 } as const;
/** rooms.lua `POOL_TICK` (D-081): s entre as curas da poça. */
export const POOL_TICK = 1.0;

export const ROOM_BY_ID: Readonly<Record<string, RoomDef>> = Object.fromEntries([...ROOMS, ...CURSES].map((r) => [r.id, r]));

/** rooms.lua `combatRoomPool`: a carta de combate comum não sorteia as emboscadas (a Toca dos Campeões fica). */
export const COMBAT_ROOM_POOL: readonly string[] = ROOMS.filter((r) => !r.ambushOnly).map((r) => r.id);

/** tuning.lua `AMBUSH_DELAY`: segundos de onda antes do aviso do chefe da emboscada. */
export const AMBUSH_DELAY = 1.5;

/** run_map.lua `CURSE_WAVES`: quantas ondas a maldição dura. */
export const CURSE_WAVES = 2;
