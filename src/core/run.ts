// Estado de uma partida, puro (game_state.lua, run_controller.lua, run_save.lua, rng.lua e records.lua do Dungeon Reign).
// A partida tem uma seed; cada finalidade sorteia no seu fluxo (RUN_STREAMS), então um sorteio a mais em um
// não muda os outros. O checkpoint é a partida inteira mais o estado dos fluxos, gravado antes de cada onda;
// continuar refaz a partida dali e recomeça aquela onda.
import { Rng, hashStr } from "./rng";
import { DIFFICULTIES, RUN_START, type DifficultyId } from "../data/run";
import { HEROES } from "../data/heroes";
import type { UpgradeTier } from "./levelup";
import { newShopState, type ShopState } from "./shop";
import type { MapOffer } from "./runmap";
import { runId, type WaveEntry } from "./runlog";

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
  /** modificadores comprados na loja (spell_system.lua `addModifier`) */
  modifiers: string[];
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
  /** loot.lua `lootBank` (D-618): orbes [ouro, XP] que ficaram no chão no fim de uma onda; voltam como orbe "2x" */
  lootBank: [number, number][];
  /** Magic Shop (shop_system.lua `Shop.state`): compras, visitas e histórico */
  shop: ShopState;
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
  /** muda a cada relíquia nova (relic_system.lua `relicVersion`): uma evolução recusada volta quando muda */
  relicVersion: number;
  /** "espaço:evolução" → `relicVersion` de quando foi recusada (evolution.lua `evolutionDeclined`) */
  evolutionDeclined: Record<string, number>;
  evolutionsDone: number;
  upgradesTaken: string[];
  /** raridade de cada melhoria pega, na mesma ordem de `upgradesTaken` */
  upgradeTiers: UpgradeTier[];
  /** pontos de tag das melhorias (level_up.lua `run.tags`; o sorteio olha os elementos) */
  tags: Record<string, number>;
  /** telas de nível seguidas sem épica de comportamento (M21-07; a chance sobe com ela) */
  epicPity: number;
  /** sala ou maldição da carta do mapa, valendo para a onda atual (rooms.ts); null = sem sala */
  room: string | null;
  /** ondas que a maldição ainda dura (run_map.lua `curseWavesLeft`) */
  curseWavesLeft: number;
  /** a maldição segue na próxima onda: ela não tem mapa (D-150) */
  curseContinues: boolean;
  /** cartas escolhidas no mapa, em ordem */
  mapHistory: string[];
  /** M21-08: o mapa da onda atual, sorteado ao preparar a onda e escolhido andando por um portão */
  mapOffer: MapOffer | null;
  /** saco de chefes (boss_bag.lua): o que falta sair, o último que saiu e a ordem de todos */
  bossBag: string[];
  lastBoss: string | null;
  bossHistory: string[];
  endless: boolean;
  victory: boolean;
  /** quantas vezes a partida foi continuada */
  resumes: number;
  statistics: RunStatistics;
  /** quem deu o golpe final (results.lua `killedBy`); null enquanto vivo */
  killedBy: string | null;
  /** o DEV Grimoire (F1) foi aberto: a partida não grava checkpoint nem entra nos registros (run_save.lua, results.lua) */
  devUsed: boolean;
  /** registro de partidas (core/runlog.ts): id, hora de início e as ondas vencidas até agora */
  runId: string;
  startedAt: string;
  waveLog: WaveEntry[];
}

export interface NewRunOptions {
  heroId: string;
  difficultyId: DifficultyId;
  startingSpell: string;
  /** seed escolhida pelo jogador; sem ela vem de `randomSeed` */
  seed?: number;
  randomSeed: number;
  /** hora de início (ISO), para o registro de partidas; sem ela fica vazia */
  startedAt?: string;
}

/** game_state.lua `newRun`. */
export function newRun(opts: NewRunOptions): RunState {
  const hero = HEROES[opts.heroId];
  if (!hero) throw new Error(`invalid hero: ${opts.heroId}`);
  if (!DIFFICULTIES[opts.difficultyId]) throw new Error(`invalid difficulty: ${opts.difficultyId}`);
  if (!hero.startingSpells.includes(opts.startingSpell as never)) throw new Error(`invalid starting spell: ${opts.startingSpell}`);
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
    lootBank: [],
    shop: newShopState(),
    xp: RUN_START.xp,
    level: RUN_START.level,
    xpToNext: RUN_START.xpToNext,
    pendingLevelUps: 0,
    hp: null,
    spells: [newSpellSlot(opts.startingSpell)],
    technique: newSpellSlot(hero.technique.id),
    relics: [],
    relicVersion: 0,
    evolutionDeclined: {},
    evolutionsDone: 0,
    upgradesTaken: [],
    upgradeTiers: [],
    tags: {},
    epicPity: 0,
    room: null,
    curseWavesLeft: 0,
    curseContinues: false,
    mapHistory: [],
    mapOffer: null,
    bossBag: [],
    lastBoss: null,
    bossHistory: [],
    endless: false,
    victory: false,
    resumes: 0,
    statistics: { kills: 0, damage: 0, damageTaken: 0, elapsed: 0, goldEarned: 0, goldSpent: 0, xpEarned: 0, healed: 0 },
    killedBy: null,
    devUsed: false,
    runId: opts.startedAt ? runId(encodeSeed(seed), opts.startedAt) : "",
    startedAt: opts.startedAt ?? "",
    waveLog: [],
  };
}

export function newSpellSlot(id: string): SpellSlot {
  return { id, level: 1, modifiers: [], evolution: null };
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
  run.epicPity ??= 0;
  // checkpoints de antes do M20-05
  run.room ??= null;
  run.curseWavesLeft ??= 0;
  run.curseContinues ??= false;
  run.mapHistory ??= [];
  // checkpoints de antes do M21-08
  run.mapOffer ??= null;
  // checkpoints de antes do M20-09
  run.bossBag ??= [];
  run.lastBoss ??= null;
  run.bossHistory ??= [];
  // checkpoints de antes do M6-06
  run.relicVersion ??= 0;
  run.evolutionDeclined ??= {};
  run.evolutionsDone ??= 0;
  // checkpoints de antes do M6-07
  run.devUsed ??= false;
  // checkpoints de antes do registro de partidas
  run.runId ??= "";
  run.startedAt ??= "";
  run.waveLog ??= [];
  // checkpoints de antes do M7-02
  run.lootBank ??= [];
  // checkpoints de antes do M7-03
  run.shop ??= newShopState();
  // checkpoints de antes do M6-01
  for (const s of [...run.spells, run.technique]) s.modifiers ??= [];
  // checkpoints de antes do M20-06 guardavam o progresso do jogo antigo (mochila, equipamento, mortes)
  delete (run as { legacy?: unknown }).legacy;
  run.killedBy = null;
  run.wave = cp.wave;
  return { run, rng, wave: cp.wave };
}

/** Confere a forma de um checkpoint lido do disco; qualquer coisa estranha é descartada. */
export function isCheckpoint(x: unknown): x is Checkpoint {
  const cp = x as Checkpoint;
  if (!cp || cp.v !== RUN_VERSION || typeof cp.wave !== "number" || !cp.run || !cp.rng) return false;
  const r = cp.run;
  if (typeof r.seed !== "number" || !HEROES[r.heroId] || !DIFFICULTIES[r.difficultyId]) return false;
  if (typeof r.level !== "number" || !Array.isArray(r.relics) || !Array.isArray(r.spells) || !r.statistics) return false;
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
  killedBy: string | null;
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
    killedBy: run.killedBy,
  };
}

/** records.lua `add`: soma a partida encerrada; devolve true quando é a melhor daquele herói nessa dificuldade. */
/** results.lua: partida com o DEV Grimoire não soma nos registros. */
export function recordsRun(run: Pick<RunState, "devUsed">): boolean {
  return !run.devUsed;
}

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
