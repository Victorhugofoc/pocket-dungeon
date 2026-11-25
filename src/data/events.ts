// Os 17 eventos da carta de evento do mapa (data/events.lua do Dungeon Reign, §12) e os 8 pactos (data/pacts.lua,
// §11). Números iguais aos de lá (teste de paridade). A lógica está em core/events.ts; o texto das cartas sai dos
// números (`eventLines`, `pactLines` lá), para não ficar diferente deles.
import type { StatKey } from "../core/stats";

/** As chaves da camada da onda e da camada de pacto (modifier_engine.lua `KEYS`). */
export type LayerKey = "reward" | "enemyHp" | "enemyDamage" | "enemySpeed" | "projectileSpeed" | "enemyCount" | "duration" | "spawnRate";
export type LayerMods = Partial<Record<LayerKey, number>>;
export const LAYER_KEYS: readonly LayerKey[] = ["reward", "enemyHp", "enemyDamage", "enemySpeed", "projectileSpeed", "enemyCount", "duration", "spawnRate"];

export interface StatEffect { stat: StatKey; value: number }

export interface EventDef {
  id: string;
  name: string;
  /** os 12 de 1.2 e 1.4 (D-155, D-181) */
  extension?: boolean;
  /** o que acontece na hora */
  immediate?: { gold?: number; maxHpLossPct?: number; healPct?: number; levelUps?: number; freeRerolls?: number };
  /** camada da onda que o evento leva (só ela) */
  mods?: LayerMods;
  /** atributos do herói na onda que o evento leva */
  effects?: StatEffect[];
  /** Blood Altar: ouro por algumas ondas, contado à parte (§12) */
  goldWaves?: { pct: number; waves: number };
  /** Cursed Chamber: +1 escolha no próximo chefe (no máximo 1 pendente) */
  bossRelicBonus?: number;
  /** ouro pago na hora; sem ele, o evento fica indisponível */
  cost?: { gold: number };
  /** escolha de 1 de 2 exclusivas deste pool, logo depois */
  poolRelic?: "event";
  /** Ominous Omen: a camada cai `waves` ondas depois do mapa (contado como lá, a partir da onda já vencida) */
  delayed?: { waves: number; mods: LayerMods };
  /** Gambler's Den */
  gamble?: { chance: number; win: number; lose: number };
}

export const EVENTS: EventDef[] = [
  { id: "treasure_cache", name: "Treasure Cache", immediate: { gold: 100 }, mods: { enemyHp: 1.10 }, effects: [{ stat: "goldPct", value: 0.08 }] },
  { id: "blood_altar", name: "Blood Altar", immediate: { maxHpLossPct: 0.15 }, goldWaves: { pct: 0.30, waves: 2 } },
  { id: "cursed_chamber", name: "Cursed Chamber", mods: { enemyHp: 1.15 }, bossRelicBonus: 1 },
  { id: "infernal_deal", name: "Infernal Deal", mods: { enemyHp: 1.15 }, effects: [{ stat: "spellDamagePct", value: 0.40 }] },
  { id: "swift_bargain", name: "Swift Bargain", mods: { reward: 1.25, duration: 0.85, spawnRate: 1.15 } },
  { id: "wandering_merchant", name: "Wandering Merchant", extension: true, cost: { gold: 100 }, poolRelic: "event" },
  { id: "healing_spring", name: "Healing Spring", extension: true, immediate: { healPct: 0.40 }, mods: { enemyCount: 1.10 } },
  { id: "forgotten_library", name: "Forgotten Library", extension: true, immediate: { levelUps: 1 }, mods: { enemyDamage: 1.10 } },
  { id: "ominous_omen", name: "Ominous Omen", extension: true, immediate: { gold: 150 }, delayed: { waves: 2, mods: { enemyCount: 1.20 } } },
  { id: "ancient_shrine", name: "Ancient Shrine", extension: true, immediate: { maxHpLossPct: 0.20 }, poolRelic: "event" },
  { id: "training_grounds", name: "Training Grounds", extension: true, mods: { enemySpeed: 1.10 }, effects: [{ stat: "xpPct", value: 0.25 }] },
  { id: "smugglers_cache", name: "Smuggler's Cache", extension: true, immediate: { gold: 60, freeRerolls: 1 } },
  { id: "blood_moon_rite", name: "Blood Moon Rite", extension: true, mods: { enemyDamage: 1.20 }, effects: [{ stat: "damagePct", value: 0.30 }] },
  { id: "quiet_rest", name: "Quiet Rest", extension: true, immediate: { healPct: 1.0 }, mods: { reward: 0.85 } },
  { id: "gamblers_den", name: "Gambler's Den", extension: true, gamble: { chance: 0.5, win: 200, lose: 50 } },
  { id: "sealed_door", name: "Sealed Door", extension: true, mods: { enemyHp: 1.25, enemyCount: 0.80, reward: 1.40 } },
  { id: "call_of_the_horde", name: "Call of the Horde", extension: true, mods: { enemyCount: 1.40, reward: 1.50 } },
];
export const EVENT_BY_ID: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
export const EVENT_IDS: string[] = EVENTS.map((e) => e.id);
/** `E.CHOICES` */
export const EVENT_CHOICES = 3;

export interface PactDef {
  id: string;
  name: string;
  mods: LayerMods;
  effects?: StatEffect[];
  /** D-206: pontos somados à chance de campeão sorteado */
  championChance?: number;
}

export const PACTS: PactDef[] = [
  { id: "blood_oath", name: "Blood Oath", mods: { enemyHp: 1.10, enemyDamage: 1.08, reward: 1.20 } },
  { id: "glass_covenant", name: "Glass Covenant", mods: { enemyDamage: 1.25, reward: 1.28 } },
  { id: "hunters_pact", name: "Hunter's Pact", mods: { enemySpeed: 1.14, reward: 1.10 }, effects: [{ stat: "goldPct", value: 0.20 }] },
  { id: "swarm_covenant", name: "Swarm Covenant", mods: { enemyCount: 1.18, enemyHp: 0.94, reward: 1.22 } },
  { id: "arcane_bet", name: "Arcane Bet", mods: { enemyHp: 1.10, reward: 1.12 }, effects: [{ stat: "spellDamagePct", value: 0.15 }] },
  { id: "iron_bargain", name: "Iron Bargain", mods: { enemyHp: 1.20, enemyDamage: 1.05, reward: 1.24 } },
  { id: "champions_call", name: "Champion's Call", championChance: 0.15, mods: { reward: 1.14 } },
  { id: "gilded_hunt", name: "Gilded Hunt", championChance: 0.10, mods: { enemyHp: 1.06, reward: 1.06 }, effects: [{ stat: "championGoldPct", value: 0.40 }] },
];
export const PACT_BY_ID: Record<string, PactDef> = Object.fromEntries(PACTS.map((p) => [p.id, p]));
export const PACT_IDS: string[] = PACTS.map((p) => p.id);
/** `P.MAX_ACTIVE` */
export const PACT_MAX_ACTIVE = 3;

/** Nome curto de cada chave da camada, para as cartas e o HUD. */
export const LAYER_LABEL: Record<LayerKey, string> = {
  reward: "Reward", enemyHp: "Enemy HP", enemyDamage: "Enemy damage", enemySpeed: "Enemy speed",
  projectileSpeed: "Projectile speed", enemyCount: "Enemies", duration: "Duration", spawnRate: "Spawn",
};
