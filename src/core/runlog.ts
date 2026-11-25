// Registro de partidas (pedido do usuário, 2026-11-20): um resumo por partida encerrada, com a linha do tempo das ondas,
// para ler depois como foram as runs. No `npm run dev` cada resumo também vira uma linha em `logs/runs.jsonl`
// (vite.config.ts); fora dele fica só no navegador e sai pelo botão "Export run log" da tela de título.
import type { RunState } from "./run";
import type { FrameStats, RunPerf } from "./perflog";
import type { ChallengeLogEntry } from "./challenges";
import { depthsLevel } from "../data/run";

export const RUNLOG_VERSION = 1;
/** quantas partidas o navegador guarda (as mais novas) */
export const RUNLOG_MAX = 100;

/** como a partida terminou: morte, vitória encerrada, "Quit to title" ou a aba fechada no meio */
export type RunOutcome = "death" | "victory" | "quit" | "closed";

/** Uma onda vencida (ou a última, interrompida). Os números de partida são acumulados até ali. */
export interface WaveEntry {
  wave: number;
  /** sala ou maldição da onda (rooms.ts); null = sem sala */
  room: string | null;
  /** M11-08: evento valendo na onda (ausente nas partidas antigas) */
  event?: string | null;
  /** chefe da onda de chefe (o último do saco); null nas outras */
  boss: string | null;
  /** segundos de combate desta onda */
  time: number;
  /** segundos de combate da partida até o fim da onda */
  elapsed: number;
  /** vida no fim da onda, 0 a 1 */
  hp: number;
  level: number;
  gold: number;
  kills: number;
  damage: number;
  damageTaken: number;
  healed: number;
  hastened: boolean;
  clearedEarly: boolean;
  /** false só na última entrada de uma partida que acabou no meio da onda */
  cleared: boolean;
  /** M21-13: segundos andando desde o fim da onda anterior (ou da fogueira) até entrar na clareira; posto pelo jogo */
  travel?: number;
  /** fps e travadinhas da onda (core/perflog.ts); posto pelo jogo, ausente nos testes e nas partidas antigas */
  perf?: FrameStats;
}

export interface RunLogEntry {
  v: typeof RUNLOG_VERSION;
  /** identifica a partida: continuar depois de "quit" troca a entrada antiga pela nova */
  runId: string;
  startedAt: string;
  endedAt: string;
  /** versão do jogo e commit (vite.config.ts `__BUILD__`) */
  build: string;
  outcome: RunOutcome;
  heroId: string;
  difficultyId: string;
  startingSpell: string;
  seedCode: string;
  customSeed: boolean;
  /** o DEV Grimoire foi aberto: a partida não vale como teste de balanceamento */
  devUsed: boolean;
  resumes: number;
  wave: number;
  level: number;
  victory: boolean;
  endless: boolean;
  killedBy: string | null;
  gold: number;
  statistics: RunState["statistics"];
  spells: { id: string; level: number; evolution: string | null; modifiers: string[] }[];
  technique: { id: string; level: number; modifiers: string[] };
  relics: string[];
  upgrades: { id: string; tier: string }[];
  mapHistory: string[];
  /** M21-09: desvios usados (onda e tipo) */
  detours: { wave: number; kind: string }[];
  bossHistory: string[];
  waves: WaveEntry[];
  /** M13-02: nível das Depths (0 fora) e as Marcas pagas pela vitória */
  depths?: number;
  depthsMarks?: number;
  /** M13-02 parte 2: as vantagens ligadas e as cargas usadas (poção, Card Swap e Relic Reroll por zona) */
  depthsPerks?: string[];
  depthsUsed?: { potion: boolean; cardSwaps: number[]; relicRerolls: number[] };
  /** M11-08: eventos escolhidos (onda, id, resultado da aposta) */
  events?: { wave: number; id: string; gamble?: "win" | "lose" }[];
  /** M13-03: pactos aceitos (onda, id) */
  pacts?: { wave: number; id: string }[];
  /** M20-13: desafios oferecidos e como acabaram (os abertos com o progresso de agora) */
  challenges?: { offered: number; done: number; list: ChallengeLogEntry[] };
  /** desempenho da partida (só do trecho jogado nesta sessão do navegador; as ondas guardam o delas) */
  perf?: RunPerf;
}

const round = (x: number, d = 0) => Math.round(x * 10 ** d) / 10 ** d;

/** Id da partida: a seed mais a hora de início (a mesma seed jogada duas vezes são duas partidas). */
export function runId(seedCode: string, startedAt: string): string {
  return `${seedCode}-${startedAt.replace(/\D/g, "").slice(0, 14)}`;
}

/** A entrada da onda atual: chamar ao vencer a onda (`cleared`) ou ao encerrar no meio dela. */
export function waveEntry(
  run: RunState,
  w: { isBossWave: boolean; hastened: boolean; clearedEarly: boolean } | null,
  hp: number,
  cleared: boolean,
): WaveEntry {
  const s = run.statistics;
  const prev = run.waveLog.length ? run.waveLog[run.waveLog.length - 1].elapsed : 0;
  return {
    wave: run.wave, room: run.room, event: run.event ?? null, boss: w?.isBossWave ? run.lastBoss : null,
    time: round(Math.max(0, s.elapsed - prev), 1), elapsed: round(s.elapsed, 1), hp: round(Math.max(0, Math.min(1, hp)), 3),
    level: run.level, gold: run.gold, kills: s.kills, damage: Math.round(s.damage), damageTaken: Math.round(s.damageTaken),
    healed: Math.round(s.healed), hastened: w?.hastened ?? false, clearedEarly: w?.clearedEarly ?? false, cleared,
  };
}

/** O resumo da partida encerrada; `last` é a onda interrompida (morte, quit), que ainda não está em `run.waveLog`. */
export function runLogEntry(run: RunState, outcome: RunOutcome, endedAt: string, build: string, last: WaveEntry | null, perf?: RunPerf): RunLogEntry {
  const s = run.statistics;
  return {
    v: RUNLOG_VERSION, runId: run.runId || runId(run.seedCode, endedAt), startedAt: run.startedAt, endedAt, build, outcome,
    heroId: run.heroId, difficultyId: run.difficultyId, startingSpell: run.startingSpell, seedCode: run.seedCode,
    customSeed: run.customSeed, devUsed: run.devUsed, resumes: run.resumes, wave: run.wave, level: run.level,
    victory: run.victory, endless: run.endless, killedBy: run.killedBy, gold: run.gold,
    statistics: {
      ...s, damage: Math.round(s.damage), damageTaken: Math.round(s.damageTaken), healed: Math.round(s.healed),
      elapsed: round(s.elapsed, 1),
    },
    spells: run.spells.map((x) => ({ id: x.id, level: x.level, evolution: x.evolution, modifiers: [...x.modifiers] })),
    technique: { id: run.technique.id, level: run.technique.level, modifiers: [...run.technique.modifiers] },
    relics: [...run.relics],
    upgrades: run.upgradesTaken.map((id, i) => ({ id, tier: run.upgradeTiers[i] ?? "common" })),
    mapHistory: [...run.mapHistory], detours: run.detours.map((d) => ({ ...d })), bossHistory: [...run.bossHistory],
    waves: last ? [...run.waveLog, last] : [...run.waveLog],
    depths: depthsLevel(run.difficultyId), depthsMarks: run.depthsReward?.marks ?? 0,
    depthsPerks: [...(run.depthsPerks ?? [])], depthsUsed: { potion: !!run.potionUsed, cardSwaps: [...(run.cardSwaps ?? [])], relicRerolls: [...(run.relicRerolls ?? [])] },
    events: (run.eventLog ?? []).map((e) => ({ ...e })),
    pacts: (run.pactLog ?? []).map((e) => ({ ...e })),
    challenges: {
      offered: run.challengesOffered ?? 0, done: run.challengesDone ?? 0,
      list: (run.challengeLog ?? []).map((e) => {
        const open = e.result === "open" ? run.challenges?.find((c) => c.id === e.id && c.wave === e.wave) : undefined;
        return open?.goal !== undefined ? { ...e, progress: open.progress, goal: open.goal } : { ...e };
      }),
    },
    ...(perf ? { perf } : {}),
  };
}

/** Põe a partida na lista (a mais nova por último); a mesma partida continuada depois de "quit" troca a entrada velha. */
export function addRunLog(list: RunLogEntry[], e: RunLogEntry): RunLogEntry[] {
  const out = list.filter((x) => x.runId !== e.runId);
  out.push(e);
  return out.slice(-RUNLOG_MAX);
}

export function isRunLog(x: unknown): x is RunLogEntry[] {
  return Array.isArray(x) && x.every((e) => e && (e as RunLogEntry).v === RUNLOG_VERSION && typeof (e as RunLogEntry).runId === "string");
}

/** Uma partida por linha (JSON Lines), o mesmo formato do `logs/runs.jsonl`. */
export function toJsonl(list: readonly RunLogEntry[]): string {
  return list.map((e) => JSON.stringify(e)).join("\n") + (list.length ? "\n" : "");
}
