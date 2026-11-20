// Save em localStorage, como no Dungeon Reign (save.lua): três entradas separadas.
// - partida em andamento: o checkpoint antes da onda atual (core/run.ts); some quando a partida acaba.
// - registros entre partidas: só estatística, nunca dá poder a uma partida nova.
// - conquistas e desbloqueios: alargam o sorteio (heróis, relíquias), nunca dão poder.
// O save contínuo antigo (v1, um herói com itens e nível até 60) é descartado na primeira leitura.
import { emptyAchievements, normalizeAchievements, type AchievementState } from "./achievements";
import { isRunLog, type RunLogEntry } from "./runlog";
import { emptyRecords, isCheckpoint, isRecords, type Checkpoint, type Records } from "./run";

export const RUN_KEY = "dungeon-reign-rpg.run.v2";
export const RECORDS_KEY = "dungeon-reign-rpg.records.v2";
/** registro das partidas encerradas (core/runlog.ts) */
export const RUNLOG_KEY = "dungeon-reign-rpg.runlog.v1";
export const ACHIEVEMENTS_KEY = "dungeon-reign-rpg.achievements.v1";
/** chave do save contínuo antigo (até a D13) */
export const LEGACY_SAVE_KEY = "dungeon-reign-rpg.save.v1";

export interface Storage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

function readJson(storage: Storage | undefined, key: string): unknown {
  try {
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(storage: Storage | undefined, key: string, data: unknown): boolean {
  try {
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function remove(storage: Storage | undefined, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    /* sem armazenamento disponível */
  }
}

/** A partida em andamento, ou null se não há (ou se o checkpoint é de outra versão ou está estragado). */
export function loadRun(storage: Storage | undefined): Checkpoint | null {
  const cp = readJson(storage, RUN_KEY);
  return isCheckpoint(cp) ? cp : null;
}

export function writeRun(storage: Storage | undefined, cp: Checkpoint): boolean {
  return writeJson(storage, RUN_KEY, cp);
}

/** A partida acabou (morte, vitória ou desistência): não há mais o que continuar. */
export function clearRun(storage: Storage | undefined): void {
  remove(storage, RUN_KEY);
}

export function loadRecords(storage: Storage | undefined): Records {
  const r = readJson(storage, RECORDS_KEY);
  return isRecords(r) ? r : emptyRecords();
}

export function writeRecords(storage: Storage | undefined, r: Records): boolean {
  return writeJson(storage, RECORDS_KEY, r);
}

export function loadRunLog(storage: Storage | undefined): RunLogEntry[] {
  const r = readJson(storage, RUNLOG_KEY);
  return isRunLog(r) ? r : [];
}

export function writeRunLog(storage: Storage | undefined, list: RunLogEntry[]): boolean {
  return writeJson(storage, RUNLOG_KEY, list);
}

/** Conquistas e desbloqueios entre partidas (core/achievements.ts). */
export function loadAchievements(storage: Storage | undefined): AchievementState {
  return normalizeAchievements(readJson(storage, ACHIEVEMENTS_KEY)) ?? emptyAchievements();
}

export function writeAchievements(storage: Storage | undefined, a: AchievementState): boolean {
  return writeJson(storage, ACHIEVEMENTS_KEY, a);
}

/** Apaga o save contínuo antigo, se existir; devolve true quando apagou (para avisar o jogador uma vez). */
export function discardLegacySave(storage: Storage | undefined): boolean {
  try {
    if (storage?.getItem(LEGACY_SAVE_KEY) == null) return false;
  } catch {
    return false;
  }
  remove(storage, LEGACY_SAVE_KEY);
  return true;
}

export function safeStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
