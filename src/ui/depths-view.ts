// As Depths na tela (M13-02 parte 1): a linha do HUD, o painel da tela I e as Marcas no resultado. Só apresentação;
// a lógica está em core/depths.ts. Referências de lá: ui/hud/panel.lua, ui/screens/results.lua (`depths_marks`).
import { activeMutations, depthsScoreMult } from "../core/depths";
import type { RunState } from "../core/run";
import { depthsLevel } from "../data/run";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
export const DEPTHS_COLOR = "#c07cff";

/** HUD: "Depths N" com as mutações no `title`. */
export function depthsHudHtml(run: RunState): string {
  const lvl = depthsLevel(run.difficultyId);
  if (!lvl) return "";
  const muts = activeMutations(lvl);
  return `<div class="ch ev" style="border-color:${DEPTHS_COLOR}" title="${esc(muts.map((m) => `${m.name}: ${m.text}`).join("\n"))}">`
    + `<b style="color:${DEPTHS_COLOR}">Depths ${lvl}</b><small>${muts.map((m) => m.name).join(" · ")}</small></div>`;
}

/** Tela I: as mutações valendo, com o texto inteiro. */
export function depthsPanelHtml(run: RunState): string {
  const lvl = depthsLevel(run.difficultyId);
  if (!lvl) return "";
  return `<div class="section">Depths ${lvl} · score x${depthsScoreMult(lvl).toFixed(1)}</div><div class="ch-list">${activeMutations(lvl).map((m) =>
    `<div class="ch-card" style="border-left-color:${DEPTHS_COLOR}"><div class="ch-head"><b style="color:${DEPTHS_COLOR}">${esc(m.name)}</b></div><p>${esc(m.text)}</p></div>`).join("")}</div>`;
}

/** Resultado: as Marcas da vitória (ou por que não vieram) e o total do herói. */
export function depthsResultHtml(run: RunState, total: number): string {
  const lvl = depthsLevel(run.difficultyId);
  if (!lvl) return "";
  const r = run.depthsReward;
  const line = r
    ? `<b style="color:${DEPTHS_COLOR}">+${r.marks} Marks</b>${r.first ? ` · first win of Depths ${r.level}` : " · repeat win"}`
    : run.devUsed ? "No Marks: DEV run" : "No Marks: Marks come from winning wave 20";
  return `<div class="kv"><span>Depths ${lvl}</span><b>${line}</b></div><div class="kv"><span>Marks (hero)</span><b>${r?.total ?? total}</b></div>`;
}
