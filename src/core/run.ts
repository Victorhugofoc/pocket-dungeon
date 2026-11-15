// Estado de uma partida, puro (game_state.lua, run_controller.lua, run_save.lua, rng.lua e records.lua do Dungeon Reign).
// A partida tem uma seed; cada finalidade sorteia no seu fluxo (RUN_STREAMS), então um sorteio a mais em um
// não muda os outros. O checkpoint é a partida inteira mais o estado dos fluxos, gravado antes de cada onda;
// continuar refaz a partida dali e recomeça aquela onda.
import { Rng, hashStr } from "./rng";
import type { Item, Slot } from "./items";
import { DIFFICULTIES, RUN_START, type DifficultyId } from "../data/run";
import { HEROES } from "../data/heroes";
import type { UpgradeTier } from "./levelup";

/** rng.lua `RNG.STREAMS`: um fluxo de sorteio por finalidade, na mesma ordem. */
export const RUN_STREAMS = [
  "map", "events", "shop", "relics", "rewards", "levelup", "evolution", "bosses", "spawns", "combat", "champions", "challenges",
] as const;
export type StreamId = (typeof RUN_STREAMS)[number];

/** Versão do checkpoint; um checkpoint de outra versão é descartado. */
export const RUN_VERSION = 2;

/** rng.lua: as seeds ficam em [1, 2^31 - 2], para todo código de 7 letras voltar à mesma seed. */
const SEED_MOD = 2147483647;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LEN = 7;

/** rng.lua `RNG.encode`: código de 7 letras sem caracteres parecidos (sem I, O, 0, 1). */
export function encodeSeed(seed: number): string {
  let n = Math.floor(Math.abs(seed)) % SEED_MOD;
  const out: string[] = [];
  for (let i = 0; i < CODE_LEN; i++) {
    out.unshift(ALPHABET[n % 32]);
    n = Math.floor(n / 32);
  }
  return out.join("");
}

/** rng.lua `RNG.decode`: um código válido volta exato; qualquer outro texto vira seed por hash. */
export function decodeSeed(text: string): number | null {
  const t = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!t) return null;
  if (t.length === CODE_LEN && !/[IO01]/.test(t)) {
    let n = 0;
    for (const ch of t) n = n * 32 + ALPHABET.indexOf(ch);
    n %= SEED_MOD;
    return n === 0 ? 1 : n;
  }
  return normalizeSeed(hashStr(t));
}

export function normalizeSeed(seed: number): number {
  const n = Math.floor(Math.abs(seed)) % SEED_MOD;
  return n === 0 ? 1 : n;
}

/** Os fluxos de sorteio de uma partida. */
export class RunRng {
  readonly streams: Record<StreamId, Rng>;

  constructor(readonly seed: number) {
    this.streams = Object.fromEntries(RUN_STREAMS.map((id) => [id, Rng.of(seed, "run:" + id)])) as Record<StreamId, Rng>;
  }

  get(id: StreamId): Rng {
    return this.streams[id];
  }

  states(): Record<StreamId, number> {
    return Object.fromEntries(RUN_STREAMS.map((id) => [id, this.streams[id].state])) as Record<StreamId, number>;
  }

  restore(states: Partial<Record<StreamId, number>>): void {
    for (const id of RUN_STREAMS) {
      const st = states[id];
      if (typeof st === "number") this.streams[id].state = st;
    }
  }
}

export interface SpellSlot {
  id: string;
  level: number;
  evolution: string | null;
}

export interface RunStatistics {
  kills: number;
  damage: number;
  damageTaken: number;
  /** segundos jogados */
  elapsed: number;
  goldEarned: number;
  goldSpent: number;
  xpEarned: number;
  healed: number;
}

/**
 * Progresso do jogo antigo que ainda vive dentro da partida até o M20 terminar:
 * itens no M20-04, a contagem de mortes no M20-06 (morrer encerra a partida).
 */
export interface LegacyProgress {
  bag: Item[];
  equipped: Partial<Record<Slot, Item>>;
  deaths: number;
}

export interface RunState {
  seed: number;
  seedCode: string;
  /** a seed veio do jogador (replay de uma partida) */
  customSeed: boolean;
  heroId: string;
  difficultyId: DifficultyId;
  startingSpell: string;
  /** onda atual (0 antes da primeira) */
  wave: number;
  gold: number;
  xp: number;
  level: number;
  xpToNext: number;
  /** níveis ganhos que ainda esperam a escolha de melhoria no intervalo */
  pendingLevelUps: number;
  /** vida atual; null = cheia (o máximo é calculado pelo jogo a partir dos atributos) */
  hp: number | null;
  /** spells automáticas, até MAX_SPELLS */
  spells: SpellSlot[];
  /** técnica do herói (fora das spells; game_state.lua guarda no slot 0) */
  technique: SpellSlot;
  relics: string[];
  upgradesTaken: string[];
  /** raridade de cada melhoria pega, na mesma ordem de `upgradesTaken` */
  upgradeTiers: UpgradeTier[];
  /** pontos de tag das melhorias (level_up.lua `run.tags`; o sorteio olha os elementos) */
  tags: Record<string, number>;
  endless: boolean;
  victory: boolean;
  /** quantas vezes a partida foi continuada */
  resumes: number;
  statistics: RunStatistics;
  legacy: LegacyProgress;
}

export interface NewRunOptions {
  heroId: string;
  difficultyId: DifficultyId;
  startingSpell: string;
  /** seed escolhida pelo jogador; sem ela vem de `randomSeed` */
  seed?: number;
  randomSeed: number;
}

/** game_state.lua `newRun`. */
export function newRun(opts: NewRunOptions): RunState {
  const hero = HEROES[opts.heroId];
  if (!hero) throw new Error(`herói inválido: ${opts.heroId}`);
  if (!DIFFICULTIES[opts.difficultyId]) throw new Error(`dificuldade inválida: ${opts.difficultyId}`);
  if (!hero.startingSpells.includes(opts.startingSpell as never)) throw new Error(`spell inicial inválida: ${opts.startingSpell}`);
  const seed = normalizeSeed(opts.seed ?? opts.randomSeed);
  return {
    seed,
    seedCode: encodeSeed(seed),
    customSeed: opts.seed !== undefined,
    heroId: hero.id,
    difficultyId: opts.difficultyId,
    startingSpell: opts.startingSpell,
    wave: 0,
    gold: RUN_START.gold,
    xp: RUN_START.xp,
    level: RUN_START.level,
    xpToNext: RUN_START.xpToNext,
    pendingLevelUps: 0,
    hp: null,
    spells: [newSpellSlot(opts.startingSpell)],
    technique: newSpellSlot(hero.technique.id),
    relics: [],
    upgradesTaken: [],
    upgradeTiers: [],
    tags: {},
    endless: false,
    victory: false,
    resumes: 0,
    statistics: { kills: 0, damage: 0, damageTaken: 0, elapsed: 0, goldEarned: 0, goldSpent: 0, xpEarned: 0, healed: 0 },
    legacy: {
      bag: [],
      equipped: {},
      deaths: 0,
    },
  };
}

export function newSpellSlot(id: string): SpellSlot {
  return { id, level: 1, evolution: null };
}

/** Seed do mapa de uma zona: só depende da seed da partida, da zona e da volta (0; 1 em diante no modo sem fim), nunca dos fluxos. */
export function zoneSeed(runSeed: number, zoneId: string, visit: number): number {
  return ((runSeed ^ hashStr("zone:" + zoneId)) + visit * 7919) >>> 0;
}

// ---------------------------------------------------------------- checkpoint (run_save.lua)

export interface Checkpoint {
  v: typeof RUN_VERSION;
  /** a onda que recomeça ao continuar */
  wave: number;
  run: RunState;
  rng: Record<StreamId, number>;
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** run_save.lua `checkpoint`: cópia da partida e dos fluxos agora (a partida viva continua mudando depois). */
export function checkpoint(run: RunState, rng: RunRng, wave: number): Checkpoint {
  return { v: RUN_VERSION, wave, run: clone(run), rng: rng.states() };
}

/** run_controller.lua `new` com `restore`: refaz a partida e os fluxos do checkpoint; a onda recomeça. */
export function continueRun(cp: Checkpoint): { run: RunState; rng: RunRng; wave: number } {
  const run = clone(cp.run);
  const rng = new RunRng(run.seed);
  rng.restore(cp.rng);
  run.resumes = (run.resumes ?? 0) + 1;
  // checkpoints de antes do M20-03
  run.upgradeTiers ??= run.upgradesTaken.map(() => "common");
  run.tags ??= {};
  run.wave = cp.wave;
  return { run, rng, wave: cp.wave };
}

/** Confere a forma de um checkpoint lido do disco; qualquer coisa estranha é descartada. */
export function isCheckpoint(x: unknown): x is Checkpoint {
  const cp = x as Checkpoint;
  if (!cp || cp.v !== RUN_VERSION || typeof cp.wave !== "number" || !cp.run || !cp.rng) return false;
  const r = cp.run;
  if (typeof r.seed !== "number" || !HEROES[r.heroId] || !DIFFICULTIES[r.difficultyId]) return false;
  if (typeof r.level !== "number" || !Array.isArray(r.relics) || !Array.isArray(r.spells) || !r.statistics || !r.legacy) return false;
  return RUN_STREAMS.every((id) => typeof cp.rng[id] === "number");
}

// ---------------------------------------------------------------- registros (records.lua)

export interface RunSummary {
  heroId: string;
  difficultyId: DifficultyId;
  wave: number;
  kills: number;
  damage: number;
  level: number;
  relics: number;
  elapsed: number;
  victory: boolean;
  endless: boolean;
  seedCode: string;
}

export interface RecordEntry extends RunSummary {
  score: number;
  date: string;
}

export interface Records {
  runs: number;
  wins: number;
  kills: number;
  highestWave: number;
  bestEndless: number;
  /** melhor partida por herói e dificuldade, chave `heroId/difficultyId` */
  best: Record<string, RecordEntry>;
  /** últimas partidas, a mais nova primeiro */
  history: RecordEntry[];
}

export const RECORDS_HISTORY_MAX = 20;

export function emptyRecords(): Records {
  return { runs: 0, wins: 0, kills: 0, highestWave: 0, bestEndless: 0, best: {}, history: [] };
}

/** session.lua `score`: a onda pesa mais, depois os abates, e o dano desempata. */
export function runScore(wave: number, kills: number, damage: number): number {
  return wave * 1_000_000 + kills * 100 + damage / 1_000_000;
}

export function summarize(run: RunState): RunSummary {
  return {
    heroId: run.heroId, difficultyId: run.difficultyId, wave: run.wave, kills: run.statistics.kills,
    damage: run.statistics.damage, level: run.level, relics: run.relics.length,
    elapsed: Math.floor(run.statistics.elapsed), victory: run.victory, endless: run.endless, seedCode: run.seedCode,
  };
}

/** records.lua `add`: soma a partida encerrada; devolve true quando é a melhor daquele herói nessa dificuldade. */
export function addRecord(rec: Records, s: RunSummary, date: string): boolean {
  rec.runs++;
  if (s.victory) rec.wins++;
  rec.kills += s.kills;
  rec.highestWave = Math.max(rec.highestWave, s.wave);
  if (s.endless) rec.bestEndless = Math.max(rec.bestEndless, s.wave);
  const entry: RecordEntry = { ...s, score: runScore(s.wave, s.kills, s.damage), date };
  const key = `${s.heroId}/${s.difficultyId}`;
  const prev = rec.best[key];
  const isBest = !prev || entry.score > prev.score;
  if (isBest) rec.best[key] = entry;
  rec.history.unshift(entry);
  rec.history.length = Math.min(rec.history.length, RECORDS_HISTORY_MAX);
  return isBest;
}

export function isRecords(x: unknown): x is Records {
  const r = x as Records;
  return !!r && typeof r.runs === "number" && typeof r.best === "object" && Array.isArray(r.history);
}
