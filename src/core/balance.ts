// M17-01 parte 4: o relatório de balanceamento (como o `BALANCE_REPORT.md` do Dungeon Reign), montado das linhas
// do bot no registro de partidas (`logs/runs.jsonl`, marcadas `bot`): a mesma régua das partidas do usuário.
// Lógica pura; quem lê o arquivo e grava `docs/balance.md` é `tools/sim.mjs`.

import type { RunLogEntry } from "./runlog";

export interface BalanceMeta {
  difficulty: string;
  batch: string;
  date: string;
  build: string;
  /** a linha de comando que gerou o lote */
  command: string;
  /** partidas que não deixaram linha no registro (página travada, erro), com o motivo */
  failures: { hero: string; seed: number; reason: string }[];
  heroes: readonly string[];
}

const num = (x: unknown): number => (typeof x === "number" && isFinite(x) ? x : 0);
const avg = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (a: number, b: number): string => (b ? `${Math.round((a / b) * 100)}%` : "-");
const f0 = (x: number): string => Math.round(x).toLocaleString("en-US");
const f1 = (x: number): string => (Math.round(x * 10) / 10).toFixed(1);

/** Conta e ordena, maior primeiro; empate pelo nome. */
export function tally(items: string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function sumBy<T>(rows: T[], key: (r: T) => string, val: (r: T) => number): [string, number][] {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + val(r));
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

const list = (xs: [string, number][], n: number, fmt: (v: number) => string = String): string =>
  xs.length ? xs.slice(0, n).map(([k, v]) => `${k} ${fmt(v)}`).join(", ") : "-";

interface Uses { technique?: number; dodge?: number; spells?: number[] }

/** Uma seção do `docs/balance.md` (uma dificuldade), em markdown. */
export function balanceSection(entries: RunLogEntry[], meta: BalanceMeta): string {
  const runs = entries.filter((e) => e.bot && e.bot.batch === meta.batch);
  const out: string[] = [];
  const total = runs.length + meta.failures.length;
  out.push(`## ${meta.difficulty}`, "");
  out.push(`${meta.date} · build \`${meta.build}\` · \`${meta.command}\` · ${total} partidas, ${runs.filter((r) => r.victory).length} vitórias (${pct(runs.filter((r) => r.victory).length, total)})`, "");
  out.push("| Herói | Partidas | Vitória | Onda média da morte | Mortes por onda | Tempo médio (s) | Técnica / esquiva por partida | Presas ou no limite |");
  out.push("|---|---|---|---|---|---|---|---|");
  for (const h of meta.heroes) {
    const rs = runs.filter((r) => r.heroId === h);
    const fails = meta.failures.filter((f) => f.hero === h);
    if (!rs.length && !fails.length) continue;
    const wins = rs.filter((r) => r.victory).length;
    const deaths = rs.filter((r) => r.outcome === "death");
    const stuck = rs.filter((r) => r.outcome === "stuck" || r.outcome === "timeout");
    const uses = rs.map((r) => (r.bot?.uses ?? {}) as Uses);
    const deathWaves = deaths.map((r) => r.wave).sort((a, b) => a - b);
    out.push(`| ${h} | ${rs.length + fails.length} | ${pct(wins, rs.length + fails.length)} | ${deaths.length ? f1(avg(deathWaves)) : "-"} | ${deathWaves.join(", ") || "-"} | ${f0(avg(rs.map((r) => num(r.statistics?.elapsed))))} | ${f1(avg(uses.map((u) => num(u.technique))))} / ${f1(avg(uses.map((u) => num(u.dodge))))} | ${stuck.length + fails.length || "-"} |`);
  }
  out.push("");

  const deaths = runs.filter((r) => r.outcome === "death");
  out.push("### Golpe final", "");
  out.push(`Geral: ${list(tally(deaths.map((r) => r.killedBy ?? "?")), 8)}`, "");
  for (const h of meta.heroes) {
    const d = deaths.filter((r) => r.heroId === h);
    if (d.length) out.push(`- ${h}: ${list(tally(d.map((r) => r.killedBy ?? "?")), 4)}`);
  }
  out.push("");

  out.push("### Dano por fonte (média por partida)", "");
  out.push("| Herói | Causado (maiores) | Recebido (maiores) |", "|---|---|---|");
  for (const h of meta.heroes) {
    const rs = runs.filter((r) => r.heroId === h);
    if (!rs.length) continue;
    const dealt = sumBy(rs.flatMap((r) => r.dealtBySource ?? []), (d) => d.source, (d) => d.damage / rs.length);
    const taken = sumBy(rs.flatMap((r) => r.takenBySource ?? []), (d) => d.source, (d) => d.damage / rs.length);
    out.push(`| ${h} | ${list(dealt, 4, f0)} | ${list(taken, 4, f0)} |`);
  }
  out.push("");

  out.push("### Escolhas do bot", "");
  for (const h of meta.heroes) {
    const rs = runs.filter((r) => r.heroId === h);
    if (!rs.length) continue;
    const relics = tally(rs.flatMap((r) => r.relics));
    const ups = tally(rs.flatMap((r) => r.upgrades.map((u) => u.id)));
    const spells = tally(rs.flatMap((r) => r.spells.map((s) => (s.evolution ? `${s.id}→${s.evolution}` : s.id))));
    out.push(`- **${h}** · spells: ${list(spells, 4)} · relíquias: ${list(relics, 5)} · melhorias: ${list(ups, 5)}`);
  }
  out.push("");

  const odd = runs.filter((r) => r.outcome === "stuck" || r.outcome === "timeout");
  if (odd.length || meta.failures.length) {
    out.push("### Partidas presas, no limite ou sem linha", "");
    for (const r of odd) out.push(`- ${r.heroId} seed ${num(r.bot?.seed)}: ${r.outcome}${r.bot?.stuckAt ? ` em ${String(r.bot.stuckAt)} (onda/fase)` : ""}`);
    for (const f of meta.failures) out.push(`- ${f.hero} seed ${f.seed}: ${f.reason}`);
    out.push("");
  }
  return out.join("\n");
}

const HEAD = "# Balanceamento (bot)\n\nGerado por `npm run sim -- <partidas> <dificuldade> [herói] [seed]` (`M17-01`). Uma seção por dificuldade; rodar de novo troca só a seção dela. Lido das linhas `bot` de `logs/runs.jsonl`.\n";

/** O arquivo inteiro com a seção da dificuldade trocada (ou acrescentada); as outras ficam. */
export function mergeBalanceDoc(doc: string, difficulty: string, section: string): string {
  const parts = (doc.trim() ? doc : HEAD).split(/^(?=## )/m);
  const head = parts[0].startsWith("## ") ? HEAD : parts[0];
  const sections = parts.filter((p) => p.startsWith("## "));
  const i = sections.findIndex((p) => p.startsWith(`## ${difficulty}\n`));
  const s = section.trimEnd() + "\n\n";
  if (i >= 0) sections[i] = s;
  else sections.push(s);
  return (head.trimEnd() + "\n\n" + sections.map((p) => p.trimEnd() + "\n\n").join("")).trimEnd() + "\n";
}
