// Visualização da build (M12-06 parte 2): ícones de relíquia (D19, vindos do original), bolinhas de progresso das
// tags e o painel da build da tela I. Só apresentação; a lógica está em core/synergies.ts.
// Referências de lá: synergy_view.lua (`chips`, `progressLines`), build_sheet.lua, relic_reward.lua (D-514, D-515).
import { buildIdentity, nearestSynergies, synergyPreview, synergyProgress, tagCount, type Tags } from "../core/synergies";
import {
  BUILD_EVOLUTION_BY_ID, BUILD_EVOLUTION_BY_PATH, BUILD_EVOLUTION_THRESHOLD, BUILD_EVOLUTIONS, IDENTITIES, PATH_NAMES, SYNERGIES, SYNERGY_BY_ID,
} from "../data/synergies";
import type { RelicRarity } from "../data/relics";

const ICONS = import.meta.glob("../assets/relics/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const ICON_BY_ID: Record<string, string> = Object.fromEntries(
  Object.entries(ICONS).map(([path, url]) => [path.slice(path.lastIndexOf("/") + 1, -4), url]));

/** Cor da moldura por raridade (a carta e a fileira de relíquias da tela I). */
export const RARITY_COLOR: Record<RelicRarity, string> = {
  uncommon: "#6fd36a", rare: "#4fa3ff", epic: "#b36bff", boss: "#ff8a3d", evolved: "#ffd34d",
};

export function relicIconUrl(id: string): string | undefined {
  return ICON_BY_ID[id];
}

/** Ícone da relíquia em pixel art ampliado (vazio se não houver ícone). */
export function relicIconHtml(id: string, size: number, cls = "ricon"): string {
  const url = ICON_BY_ID[id];
  return url ? `<img class="${cls}" src="${url}" width="${size}" height="${size}" alt="">` : "";
}

/** Bolinhas: `now` cheias, `add` novas (douradas), o resto vazias até `max`. */
export function pipsHtml(now: number, add: number, max: number): string {
  let out = "";
  for (let i = 0; i < max; i++) out += `<i class="pip${i < now ? " f" : i < now + add ? " nw" : ""}"></i>`;
  return `<span class="pips">${out}</span>`;
}

const pathName = (tag: string) => PATH_NAMES[tag] ?? tag;

/**
 * Rodapé das cartas de nível, relíquia e loja: uma caixa por sinergia que a escolha liga (nome e efeito) e uma
 * fileira de bolinhas por caminho que ela soma, até o próximo limiar (synergy_view.lua `chips`).
 */
export function synergyCardHtml(tags: Tags, add: readonly string[], owned: readonly string[] = []): string {
  if (!add.length) return "";
  const pv = synergyPreview(tags, add, [], owned);
  let out = pv.evolved.map((id) => {
    const b = BUILD_EVOLUTION_BY_ID[id];
    return `<div class="syn-act evo"><b>Build evolution: ${b.name}</b><span>${b.text}</span></div>`;
  }).join("");
  out += pv.gained.map((id) => {
    const d = SYNERGY_BY_ID[id];
    return `<div class="syn-act"><b>Activates ${d.name}</b><span>${d.text}</span></div>`;
  }).join("");
  for (const p of synergyProgress(tags, add, 2)) {
    if (!p.next.id && owned.includes(BUILD_EVOLUTION_BY_PATH[p.tag]?.id ?? "")) continue; // evolução já alcançada
    const label = p.hit ? "" : `<span class="to">next: ${p.next.name}</span>`;
    out += `<div class="syn-chip"><span class="tag">${p.tagName}</span>${pipsHtml(p.now, 1, p.next.n)}${label}</div>`;
  }
  return out ? `<div class="syn-foot">${out}</div>` : "";
}

/** O teto das bolinhas de uma tag: o próximo limiar de sinergia que a usa, ou a evolução de build ainda não alcançada. */
function pathCap(tags: Tags, tag: string, owned: readonly string[]): number {
  const now = tagCount(tags, tag);
  const caps = SYNERGIES.flatMap((s) => (s.requires[tag] ?? 0) > now ? [s.requires[tag]] : []);
  if (caps.length) return Math.min(...caps);
  const evo = BUILD_EVOLUTION_BY_PATH[tag];
  return evo && !owned.includes(evo.id) && now < BUILD_EVOLUTION_THRESHOLD ? BUILD_EVOLUTION_THRESHOLD : Math.max(now, 1);
}

/**
 * Painel da build da tela I (build_sheet.lua, enxuto): as sinergias ativas com o efeito, os caminhos que o herói
 * tem com bolinhas e o que está mais perto de ligar, e a lista completa recolhida.
 */
export function buildPanelHtml(run: { tags: Tags; activeSynergies: readonly string[]; buildEvolutions: readonly string[] }): string {
  const active = run.activeSynergies.map((id) => SYNERGY_BY_ID[id]).filter(Boolean);
  const evos = run.buildEvolutions.map((id) => BUILD_EVOLUTION_BY_ID[id]).filter(Boolean);
  const identity = buildIdentity(run.tags);
  const paths = Object.keys(PATH_NAMES).filter((t) => tagCount(run.tags, t) > 0)
    .sort((a, b) => tagCount(run.tags, b) - tagCount(run.tags, a));
  const activeHtml = active.length
    ? active.map((d) => `<span class="syn-badge" data-syn="${d.id}"><b>${d.name}</b> ${d.text}</span>`).join("")
    : `<span class="muted">None yet. Relics and upgrades add path points; enough points in a path turn a synergy on.</span>`;
  const pathRows = paths.map((t) => {
    const now = tagCount(run.tags, t);
    const near = nearestSynergies(run.tags, t);
    const evoDef = BUILD_EVOLUTION_BY_PATH[t];
    const evo = evoDef && !run.buildEvolutions.includes(evoDef.id) && now < BUILD_EVOLUTION_THRESHOLD ? evoDef : null;
    const next = near
      ? `${near.missing} point${near.missing > 1 ? "s" : ""} away: ${near.ids.map((id) => {
        // a tag que falta pode ser outra (Warden's Oath pede Healing e Survival)
        const req = SYNERGY_BY_ID[id].requires;
        const short = Object.keys(req).filter((k) => tagCount(run.tags, k) < req[k]);
        const needs = short.includes(t) ? "" : ` <small>(needs ${short.map(pathName).join(", ")})</small>`;
        return `<b data-syn="${id}">${SYNERGY_BY_ID[id].name}</b>${needs}`;
      }).join(", ")}`
      : evo ? `${BUILD_EVOLUTION_THRESHOLD - now} point${BUILD_EVOLUTION_THRESHOLD - now > 1 ? "s" : ""} away: <b class="evo-name" data-evo="${evo.id}">${evo.name}</b> (build evolution)`
      : evoDef && run.buildEvolutions.includes(evoDef.id) ? `evolved: <b class="evo-name" data-evo="${evoDef.id}">${evoDef.name}</b>` : "all synergies on";
    return `<div class="path-row"><span>${pathName(t)} <small>${now}</small></span>${pipsHtml(now, 0, pathCap(run.tags, t, run.buildEvolutions))}<span class="next">${next}</span></div>`;
  }).join("");
  const all = SYNERGIES.map((d) => {
    const req = Object.keys(d.requires).sort().map((t) => `${pathName(t)} ${Math.min(tagCount(run.tags, t), d.requires[t])}/${d.requires[t]}`).join(" · ");
    return `<div class="syn-all${run.activeSynergies.includes(d.id) ? " on" : ""}" data-syn="${d.id}"><b>${d.name}</b><span>${d.text}</span><small>${req}</small></div>`;
  }).join("");
  const evoHtml = evos.length ? `<div class="section">Build evolutions (${evos.length})</div><div class="syn-badges">${
    evos.map((b) => `<span class="syn-badge evo" data-evo="${b.id}"><b>${b.name}</b> ${b.text}</span>`).join("")}</div>` : "";
  const idHtml = identity !== "UNDEFINED" ? `<p class="identity"><b>${identity}</b> ${IDENTITIES[identity]}</p>` : "";
  const evoAll = BUILD_EVOLUTIONS.map((b) => `<div class="syn-all evo${run.buildEvolutions.includes(b.id) ? " on" : ""}" data-evo="${b.id}"><b>${b.name}</b><span>${b.text}</span><small>${
    pathName(b.path)} ${Math.min(tagCount(run.tags, b.path), BUILD_EVOLUTION_THRESHOLD)}/${BUILD_EVOLUTION_THRESHOLD} · lasts the whole run</small></div>`).join("");
  return `${idHtml}${evoHtml}<div class="section">Active synergies (${active.length})</div><div class="syn-badges">${activeHtml}</div>
    ${paths.length ? `<div class="section">Your build paths</div><div class="paths">${pathRows}</div>` : ""}
    <details class="syn-list"><summary>All synergies (${SYNERGIES.length}) and build evolutions (${BUILD_EVOLUTIONS.length})</summary><div>${all}${evoAll}</div></details>`;
}

/** Fileira de bolinhas compacta para a tela I: as tags de uma relíquia ("Fire · Magic"). */
export function tagListHtml(tags: readonly string[]): string {
  const shown = tags.filter((t) => PATH_NAMES[t]);
  return shown.length ? `<span class="rtags">${shown.map(pathName).join(" · ")}</span>` : "";
}
