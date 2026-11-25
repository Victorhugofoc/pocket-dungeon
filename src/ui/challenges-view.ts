// Desafios da partida na tela (M20-13): a lista curta do HUD e o painel da tela I. Só apresentação; a lógica está
// em core/challenges.ts. Referências de lá: hud/panel.lua, screens/pause.lua (aba BUILD), challenges.lua `Ch.view`.
import { challengeRows, type ChallengeRow } from "../core/challenges";
import type { RunState } from "../core/run";
import { CHALLENGE_OFFER_WAVES } from "../data/challenges";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

function state(r: ChallengeRow): string {
  return r.done ? " done" : r.failed ? " failed" : "";
}

function progressText(r: ChallengeRow): string {
  return r.goal !== undefined ? ` ${r.progress ?? 0}/${r.goal}` : "";
}

/** A chave que muda quando o HUD precisa redesenhar a lista. */
export function challengeHudKey(run: RunState): string {
  return (run.challenges ?? []).map((c) => `${c.id}:${c.progress}:${c.done ? 1 : 0}${c.failed ? 1 : 0}:${c.deadline}`).join("|");
}

/** HUD: uma linha por desafio (nome, progresso, prazo); o texto inteiro fica no `title` e na tela I. */
export function challengeHudHtml(run: RunState): string {
  const rows = challengeRows(run);
  if (!rows.length) return "";
  return rows.map((r) => `<div class="ch${state(r)}" title="${esc(`${r.text} (${r.reward})`)}"><b>${r.done ? "✓ " : r.failed ? "✗ " : ""}${r.name}</b>`
    + `<span>${progressText(r)}</span><small>${r.done ? "DONE" : r.deadline}</small></div>`).join("");
}

/** Tela I: "RUN CHALLENGES (done: N)" com o texto, o prêmio e o prazo de cada um. */
export function challengePanelHtml(run: RunState): string {
  const rows = challengeRows(run);
  const list = rows.length
    ? rows.map((r) => `<div class="ch-card${state(r)}"><div class="ch-head"><b>${r.name}</b><small>${r.done ? "DONE" : r.deadline}</small></div>`
      + `<p>${esc(r.text)}${r.goal !== undefined ? ` <b class="ch-prog">${r.progress ?? 0}/${r.goal}</b>` : ""}</p>`
      + `<p class="ch-reward">${esc(r.reward)}</p></div>`).join("")
    : `<p class="note">No open challenge. A new one comes on ${CHALLENGE_OFFER_WAVES.map((w) => `W${w}`).join(", ").replace(/, (W\d+)$/, " and $1")}.</p>`;
  return `<div class="section">Run challenges (done: ${run.challengesDone ?? 0})</div><div class="ch-list">${list}</div>`;
}

/** Carta do portão: a sala amaldiçoada vale para o desafio Daring aberto. */
export function daringOpen(run: RunState): boolean {
  return (run.challenges ?? []).some((c) => c.id === "cursed" && !c.done && !c.failed && !c.armed);
}
