// As Depths na tela (M13-02 parte 1): a linha do HUD, o painel da tela I e as Marcas no resultado. Só apresentação;
// a lógica está em core/depths.ts. Referências de lá: ui/hud/panel.lua, ui/screens/results.lua (`depths_marks`).
import { activeMutations, depthsScoreMult, runPerk, type DepthsSave } from "../core/depths";
import { PERKS, type PerkId } from "../data/depths";
import { segmentOf } from "../core/waves";
import type { RunState } from "../core/run";
import { depthsLevel } from "../data/run";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
export const DEPTHS_COLOR = "#c07cff";

/** As cargas das vantagens de uso (Reserve Potion, Card Swap, Relic Reroll): disponível ou gasta. */
function perkCharges(run: RunState): { name: string; ready: boolean; tip: string }[] {
  const seg = segmentOf(Math.max(1, run.wave));
  const out: { name: string; ready: boolean; tip: string }[] = [];
  if (runPerk(run, "reserve_potion")) out.push({ name: "Potion", ready: !run.potionUsed, tip: "Reserve Potion: once per run, below 20% HP heals 30%" });
  if (runPerk(run, "card_swap")) out.push({ name: "Swap", ready: !run.cardSwaps.includes(seg), tip: "Card Swap: G rerolls the gates, once per zone" });
  if (runPerk(run, "relic_reroll")) out.push({ name: "Relic Reroll", ready: !run.relicRerolls.includes(seg), tip: "Relic Reroll: rerolls one relic choice, once per zone" });
  return out;
}

/** O que muda o chip das Depths (o HUD só redesenha quando muda). */
export function depthsHudKey(run: RunState): string {
  return perkCharges(run).map((c) => +c.ready).join("");
}

/** HUD: "Depths N" com as mutações no `title` e as cargas das vantagens. */
export function depthsHudHtml(run: RunState): string {
  const lvl = depthsLevel(run.difficultyId);
  if (!lvl) return "";
  const muts = activeMutations(lvl);
  const charges = perkCharges(run).map((c) =>
    `<i class="dp-charge ${c.ready ? "" : "used"}" title="${esc(c.tip)}${c.ready ? "" : " (used)"}">${c.name}</i>`).join("");
  return `<div class="ch ev" style="border-color:${DEPTHS_COLOR}" title="${esc(muts.map((m) => `${m.name}: ${m.text}`).join("\n"))}">`
    + `<b style="color:${DEPTHS_COLOR}">Depths ${lvl}</b><small>${muts.map((m) => m.name).join(" · ")}</small>`
    + (charges ? `<span class="dp-charges">${charges}</span>` : "") + `</div>`;
}

/** Tela de herói (depths_setup.lua): as Marcas e as 9 vantagens, comprar (dois cliques) e ligar/desligar. */
export function depthsPerksHtml(save: DepthsSave, heroId: string, confirming: string): string {
  const h = save[heroId];
  const marks = h?.marks ?? 0;
  const rows = PERKS.map((p) => {
    const owned = h?.owned[p.id] === true;
    const on = owned && h?.enabled[p.id] === true;
    const label = owned ? (on ? "ON" : "OFF") : confirming === p.id ? `Confirm · ${p.cost}` : `Buy · ${p.cost}`;
    const cls = owned ? (on ? "on" : "off") : confirming === p.id ? "confirm" : marks >= p.cost ? "buy" : "poor";
    return `<li class="dp-perk ${cls}"><div><b>${esc(p.name)}</b><small>${esc(p.text)}</small></div>`
      + `<button data-perk="${p.id}" ${!owned && marks < p.cost ? "disabled" : ""} title="${owned ? "Click to switch on or off" : "Spend Marks (click twice)"}">${label}</button></li>`;
  }).join("");
  return `<div class="section">Depths perks <small>· ${marks} Marks · switched-on perks apply to the run</small></div><ul class="dp-perks">${rows}</ul>`;
}

export type { PerkId };

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
