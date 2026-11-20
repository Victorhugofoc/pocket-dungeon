// Envio do registro de partidas (core/runlog.ts): guarda no navegador e, no `npm run dev`, manda ao servidor,
// que acrescenta uma linha em `logs/runs.jsonl` (vite.config.ts `/__runlog`).
import { addRunLog, toJsonl, type RunLogEntry } from "../core/runlog";
import { loadRunLog, writeRunLog, type Storage } from "../core/save";

declare const __BUILD__: string;
export const BUILD: string = typeof __BUILD__ === "string" ? __BUILD__ : "unknown";

/** `beacon`: a aba está fechando, e só o `sendBeacon` chega ao servidor. */
export function storeRunLog(storage: Storage | undefined, e: RunLogEntry, beacon = false): void {
  writeRunLog(storage, addRunLog(loadRunLog(storage), e));
  const mins = Math.floor(e.statistics.elapsed / 60), secs = Math.round(e.statistics.elapsed % 60);
  console.info(`[runlog] ${e.outcome} · ${e.heroId} · ${e.difficultyId} · wave ${e.wave} · level ${e.level} · ${e.statistics.kills} kills · ${mins}m${secs}s${e.killedBy ? ` · killed by ${e.killedBy}` : ""}${e.devUsed ? " · DEV" : ""}`);
  if (!import.meta.env.DEV) return;
  const body = JSON.stringify(e);
  if (beacon) navigator.sendBeacon?.("/__runlog", body);
  else fetch("/__runlog", { method: "POST", body, keepalive: true }).catch(() => { /* servidor fora: fica no navegador */ });
}

/** Baixa o registro inteiro do navegador como `.jsonl` (para quem joga a build mandar de volta). */
export function downloadRunLog(storage: Storage | undefined): number {
  const list = loadRunLog(storage);
  const url = URL.createObjectURL(new Blob([toJsonl(list)], { type: "application/x-ndjson" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `dungeon-reign-runs-${new Date().toISOString().slice(0, 10)}.jsonl`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return list.length;
}
