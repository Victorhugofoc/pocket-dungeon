// Eventos e pactos na tela (M11-08, M13-03): as cartas da escolha de evento, a confirmação do pacto, a carta do
// portão, a lista do HUD e o painel da tela I. Só apresentação; a lógica está em core/events.ts. Referências de
// lá: ui/screens/event.lua, ui/screens/pact.lua, ui/modifier_view.lua.
import { activeRows, eventAvailable, eventLines, omenFor, pactLines, pactPreview, type ActiveRow, type Line } from "../core/events";
import type { RunState } from "../core/run";
import { EVENT_BY_ID, PACT_BY_ID, PACT_MAX_ACTIVE } from "../data/events";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export const EVENT_COLOR = "#5fd3c8";
export const PACT_COLOR = "#ff5a5a";

function linesHtml(L: Line[]): string {
  return L.map(([t, good]) => `<div class="stat${good ? "" : " neg"}">${esc(t)}</div>`).join("");
}

/** As 3 cartas da escolha de evento; a que custa ouro que o herói não tem fica apagada. */
export function eventCardsHtml(run: RunState, ids: readonly string[]): string {
  return ids.map((id, i) => {
    const d = EVENT_BY_ID[id];
    const ok = eventAvailable(run, id);
    return `<div class="card${ok ? "" : " off"}" data-event="${id}" style="--cc:${EVENT_COLOR}"><div class="meta">${i + 1} · Event</div>`
      + `<h3>${esc(d.name)}</h3>${linesHtml(eventLines(d, run.wave))}${ok ? "" : `<p class="note neg">Not enough gold</p>`}</div>`;
  }).join("");
}

const mult = (v: number) => `x${v.toFixed(2)}`;

/** A confirmação do pacto: o pacto, os ativos e o risco somado depois de aceitar (pact.lua). */
export function pactConfirmHtml(run: RunState, id: string): string {
  const d = PACT_BY_ID[id];
  const rows = pactPreview(run, id).map((r) => {
    const changed = Math.abs(r.after - r.before) > 1e-9;
    const worse = r.key === "reward" ? r.after < r.before : r.after > r.before;
    return `<tr${changed ? ` class="${worse ? "neg" : "good"}"` : ""}><td>${r.label}</td><td>${mult(r.before)}</td><td>→</td><td><b>${mult(r.after)}</b></td></tr>`;
  }).join("");
  const active = run.pacts.length
    ? run.pacts.map((p) => `<span class="pact-chip">${esc(PACT_BY_ID[p]?.name ?? p)}</span>`).join("")
    : `<span class="note">none</span>`;
  return `<div class="pact-confirm"><div class="card" style="--cc:${PACT_COLOR};cursor:default"><div class="meta">Risk Pact · for the rest of the run</div>`
    + `<h3>${esc(d.name)}</h3>${linesHtml(pactLines(d))}<p class="note">Then choose 1 of 2 pact relics.</p></div>`
    + `<div><div class="section" style="margin-top:0">Combined pact risk</div><table class="pact-table">${rows}</table>`
    + `<p class="note">Active pacts (${run.pacts.length}/${PACT_MAX_ACTIVE}): ${active}</p>`
    + `<p class="note">One pact per 5 waves. A pact can't be removed.</p></div></div>`;
}

/** O corpo da carta do portão de pacto ou de evento (o resto das cartas fica em ui.ts). */
export function gateExtraHtml(node: string, pact?: string): string {
  if (node === "pact" && pact && PACT_BY_ID[pact]) {
    const d = PACT_BY_ID[pact];
    return `<h3 style="margin-top:6px">${esc(d.name)}</h3>${linesHtml(pactLines(d))}`;
  }
  return "";
}

/** O aviso do Ominous Omen no portão da onda em que ele cai. */
export function omenGateHtml(run: RunState): string {
  const t = omenFor(run, run.wave);
  return t ? `<p class="ev-gate">This wave: ${esc(t)}</p>` : "";
}

const KIND_COLOR: Record<ActiveRow["kind"], string> = { pact: PACT_COLOR, event: EVENT_COLOR, gold: "#ffd34d", omen: "#ff9a5a", boss: "#b36bff" };

export function eventHudKey(run: RunState): string {
  return `${run.wave}|${run.pacts.join(",")}|${run.event}|${run.eventGold?.waves ?? ""}|${run.delayedMods.map((d) => d.wave).join(",")}|${run.bossRelicBonus}`;
}

/** HUD: uma linha por pacto, evento da onda, ouro do Blood Altar, Omen que vem e bônus do chefe. */
export function eventHudHtml(run: RunState): string {
  return activeRows(run, run.wave).map((r) => `<div class="ch ev" style="border-color:${KIND_COLOR[r.kind]}" title="${esc(r.text)}">`
    + `<b style="color:${KIND_COLOR[r.kind]}">${esc(r.name)}</b><small>${esc(r.when)}</small></div>`).join("");
}

/** Tela I: pactos e eventos valendo, com o texto inteiro. */
export function eventPanelHtml(run: RunState): string {
  const rows = activeRows(run, run.wave);
  if (!rows.length) return "";
  return `<div class="section">Pacts and events</div><div class="ch-list">${rows.map((r) => `<div class="ch-card" style="border-left-color:${KIND_COLOR[r.kind]}">`
    + `<div class="ch-head"><b style="color:${KIND_COLOR[r.kind]}">${esc(r.name)}</b><small>${esc(r.when)}</small></div><p>${esc(r.text)}</p></div>`).join("")}</div>`;
}
