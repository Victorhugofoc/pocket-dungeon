// Desafios da partida (run/challenges.lua do Dungeon Reign, AB-2, D-306). Os números ficam aqui; a lógica em
// core/challenges.ts. Ordem das definições igual à do Lua: o sorteio anda nela.

/** ondas que trazem um desafio novo (`Ch.OFFER_WAVES`) */
export const CHALLENGE_OFFER_WAVES: readonly number[] = [1, 6, 11, 16];
/** desafios abertos ao mesmo tempo (`Ch.MAX_OPEN`) */
export const CHALLENGE_MAX_OPEN = 2;
/** multiplicador do pagamento por tamanho (`Ch.SIZE`) */
export const CHALLENGE_SIZE = { small: 1, medium: 2, large: 3 } as const;
export type ChallengeSize = keyof typeof CHALLENGE_SIZE;
/** pagamento em ouro: tamanho × (base + porOnda × onda em que completou) (`Ch.gold`) */
export const CHALLENGE_GOLD = { base: 15, perWave: 6 };
/** C-04: parte do preço da relíquia da Encomenda que volta (`Ch.REFUND`) */
export const CHALLENGE_REFUND = 0.8;
/** prazo "plus8": ondas depois da oferta */
export const CHALLENGE_PLUS_WAVES = 8;

/**
 * Limiares de cada desafio. Vieram do combate do original; o nosso é outro (D18), então ficam aqui para
 * ajustar pelo registro de partidas (`logs/runs.jsonl`, `challenges`).
 */
export const CHALLENGE_TUNING = {
  /** Quick Duel: matar o chefe em menos de N s depois que ele aparece */
  fastBossSeconds: 40,
  /** Sharp Technique: abates com a técnica */
  techniqueKills: 25,
  /** Hunter: campeões derrotados */
  elites: 2,
  /** Hurry: ondas apressadas seguidas */
  hastenStreak: 3,
  /** Iron Health: ondas seguidas terminadas acima desta fração de vida */
  healthyStreak: 2,
  healthyFrac: 0.8,
  /** Daring: ondas da maldição que precisa sobreviver */
  cursedWaves: 2,
  /** Spell Master: a spell (até este nível) precisa subir tantos níveis */
  spellLevelMax: 3,
  spellLevelGain: 2,
  /** Thrift: ouro guardado = base + porOnda × onda da oferta */
  hoardBase: 300,
  hoardPerWave: 40,
};

export type ChallengeDeadline = "block" | "boss" | "plus8";
export type ChallengeReward = "gold" | "refund" | "shop_reroll" | "levelup_reroll";

export interface ChallengeDef {
  id: string;
  /** nome na tela (en.lua) */
  name: string;
  size: ChallengeSize;
  deadline: ChallengeDeadline;
  reward: ChallengeReward;
  /** meta fixa; os que montam a meta no sorteio deixam vazio */
  goal?: number;
}

const T = CHALLENGE_TUNING;

export const CHALLENGES: readonly ChallengeDef[] = [
  { id: "untouchable_boss", name: "UNTOUCHABLE", size: "large", deadline: "boss", reward: "gold" },
  { id: "clean_wave", name: "STEEL SKIN", size: "small", deadline: "block", reward: "gold" },
  { id: "evolution", name: "EVOLUTION", size: "large", deadline: "plus8", reward: "gold" },
  { id: "relic_order", name: "SPECIAL ORDER", size: "medium", deadline: "block", reward: "refund" },
  { id: "technique_kills", name: "SHARP TECHNIQUE", size: "medium", deadline: "block", reward: "gold", goal: T.techniqueKills },
  { id: "elites", name: "HUNTER", size: "medium", deadline: "block", reward: "gold", goal: T.elites },
  { id: "fast_boss", name: "QUICK DUEL", size: "large", deadline: "boss", reward: "gold" },
  { id: "hasten_streak", name: "HURRY", size: "small", deadline: "block", reward: "shop_reroll", goal: T.hastenStreak },
  { id: "spell_level", name: "SPELL MASTER", size: "large", deadline: "plus8", reward: "gold" },
  { id: "synergy", name: "SYNERGY", size: "large", deadline: "plus8", reward: "gold" },
  { id: "cursed", name: "DARING", size: "large", deadline: "block", reward: "gold", goal: T.cursedWaves },
  { id: "healthy_streak", name: "IRON HEALTH", size: "small", deadline: "block", reward: "gold", goal: T.healthyStreak },
  { id: "gold_hoard", name: "THRIFT", size: "small", deadline: "block", reward: "levelup_reroll" },
];

export const CHALLENGE_BY_ID: Record<string, ChallengeDef> = Object.fromEntries(CHALLENGES.map((d) => [d.id, d]));
