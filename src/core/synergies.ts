// Sinergias (build_system.lua `count`, `meets`, `refresh`, `activeList`, `preview`; synergy_view.lua). Lógica pura.
// - `refreshSynergies` é chamado sempre que as tags mudam (o jogo chama no `recompute`): liga as que passaram do
//   limiar e desliga as que caíram (§50), e devolve o que mudou para os avisos.
// - `synergySources` dá os atributos das ativas, uma fonte por sinergia, como `synergy:<id>` lá.
// - `synergyPreview` e `synergyProgress` mostram, numa carta, o que uma escolha liga e o próximo limiar.
// - M12-09: evolução de build com 8 pontos num caminho (§52; fica até o fim da partida, D-059) e identidade (§51, D-058).
import {
  BUILD_EVOLUTION_BY_ID, BUILD_EVOLUTION_BY_PATH, BUILD_EVOLUTION_THRESHOLD, BUILD_EVOLUTIONS, BUILD_PATHS, IDENTITY_BY_PATH,
  PATH_NAMES, SYNERGIES, SYNERGY_BY_ID, type SynergyDef, type SynergyEffect,
} from "../data/synergies";
import type { StatBlock } from "./stats";

export type Tags = Readonly<Record<string, number>>;

export function tagCount(tags: Tags, tag: string): number {
  return tags[tag] ?? 0;
}

export function meetsSynergy(def: SynergyDef, tags: Tags): boolean {
  for (const [tag, n] of Object.entries(def.requires)) if (tagCount(tags, tag) < n) return false;
  return true;
}

/** As sinergias que as tags ligam, na ordem de synergies.lua. */
export function synergiesFor(tags: Tags): string[] {
  return SYNERGIES.filter((s) => meetsSynergy(s, tags)).map((s) => s.id);
}

export interface SynergyState {
  tags: Record<string, number>;
  /** build_system.lua `activeSynergies` (na ordem de synergies.lua) */
  activeSynergies: string[];
  /** `synergiesEver`: as que já valeram nesta partida */
  synergiesEver: string[];
  /** build_system.lua `buildEvolutions`: as evoluções de build alcançadas (ficam até o fim da partida) */
  buildEvolutions: string[];
}

export interface SynergyChange {
  gained: string[];
  lost: string[];
  /** evoluções de build novas (ids) */
  evolved: string[];
}

/** As evoluções de build que estas tags alcançam e ainda não estão em `owned`. */
function newEvolutions(tags: Tags, owned: readonly string[]): string[] {
  return BUILD_EVOLUTIONS.filter((b) => !owned.includes(b.id) && tagCount(tags, b.path) >= BUILD_EVOLUTION_THRESHOLD).map((b) => b.id);
}

/** build_system.lua `refresh`: liga e desliga as sinergias pelas tags de agora; a evolução de build não volta atrás. */
export function refreshSynergies(run: SynergyState): SynergyChange {
  const was = new Set(run.activeSynergies);
  const now = synergiesFor(run.tags);
  const gained = now.filter((id) => !was.has(id));
  const lost = run.activeSynergies.filter((id) => !now.includes(id));
  run.activeSynergies = now;
  for (const id of gained) if (!run.synergiesEver.includes(id)) run.synergiesEver.push(id);
  const evolved = newEvolutions(run.tags, run.buildEvolutions);
  run.buildEvolutions.push(...evolved);
  return { gained, lost, evolved };
}

function block(effects: readonly SynergyEffect[]): StatBlock {
  const b: StatBlock = {};
  for (const x of effects) b[x.stat] = (b[x.stat] ?? 0) + x.value;
  return b;
}

/** Os atributos das sinergias ativas e das evoluções de build, uma fonte por item (`synergy:<id>`, `buildevo:<id>`). */
export function synergySources(active: readonly string[], evolutions: readonly string[] = []): StatBlock[] {
  const out: StatBlock[] = [];
  for (const id of active) if (SYNERGY_BY_ID[id]) out.push(block(SYNERGY_BY_ID[id].effects));
  for (const id of evolutions) if (BUILD_EVOLUTION_BY_ID[id]) out.push(block(BUILD_EVOLUTION_BY_ID[id].effects));
  return out;
}

/** build_system.lua `preview`: as sinergias que pegar (e largar) estas tags ligaria e desligaria, e as evoluções novas. */
export function synergyPreview(tags: Tags, add: readonly string[], remove: readonly string[] = [], owned: readonly string[] = []): SynergyChange {
  const t: Record<string, number> = { ...tags };
  for (const tag of remove) t[tag] = Math.max(0, (t[tag] ?? 0) - 1);
  for (const tag of add) t[tag] = (t[tag] ?? 0) + 1;
  const before = new Set(synergiesFor(tags));
  const after = synergiesFor(t);
  return {
    gained: after.filter((id) => !before.has(id)), lost: [...before].filter((id) => !after.includes(id)),
    evolved: newEvolutions(t, owned),
  };
}

/**
 * build_system.lua `identity` (§51, D-058): o caminho principal com mais pontos (3 ou mais); BATTLE MAGE quando auto e
 * magic têm 3 ou mais e no máximo 1 de diferença; UNDEFINED sem caminho.
 */
export function buildIdentity(tags: Tags): string {
  const auto = tagCount(tags, "auto"), magic = tagCount(tags, "magic");
  let best: string | null = null, bestN = 2;
  for (const path of BUILD_PATHS) {
    const n = tagCount(tags, path);
    if (n > bestN) { best = path; bestN = n; }
  }
  if (auto >= 3 && magic >= 3 && Math.abs(auto - magic) <= 1 && (best === "auto" || bestN <= Math.max(auto, magic))) return "BATTLE MAGE";
  return best ? IDENTITY_BY_PATH[best] : "UNDEFINED";
}

export interface Threshold {
  n: number;
  /** id da sinergia, ou null na evolução de build de 8 pontos */
  id: string | null;
  name: string;
}

let cache: Record<string, Threshold[]> | null = null;

/** synergy_view.lua `thresholds`: os limiares das sinergias de uma tag só, por tag, e a evolução de build no fim. */
export function tagThresholds(): Record<string, Threshold[]> {
  if (cache) return cache;
  const out: Record<string, Threshold[]> = {};
  for (const s of SYNERGIES) {
    const keys = Object.keys(s.requires);
    if (keys.length !== 1) continue;
    (out[keys[0]] ??= []).push({ n: s.requires[keys[0]], id: s.id, name: s.name });
  }
  for (const list of Object.values(out)) {
    list.sort((a, b) => a.n - b.n);
  }
  // a evolução de build de 8 pontos depois do último limiar (Dodge não tem, só conta para a identidade)
  for (const [tag, list] of Object.entries(out)) {
    const evo = BUILD_EVOLUTION_BY_PATH[tag];
    if (evo) list.push({ n: BUILD_EVOLUTION_THRESHOLD, id: null, name: evo.name });
  }
  return (cache = out);
}

export interface TagProgress {
  tag: string;
  tagName: string;
  now: number;
  next: Threshold;
  /** pegar esta tag alcança o limiar */
  hit: boolean;
}

/** synergy_view.lua `progressLines`/`chips`: o próximo limiar de cada tag que a escolha soma (até `max`). */
export function synergyProgress(tags: Tags, add: readonly string[], max = 2): TagProgress[] {
  const out: TagProgress[] = [];
  const seen = new Set<string>();
  const th = tagThresholds();
  for (const tag of add) {
    if (!th[tag] || seen.has(tag)) continue;
    seen.add(tag);
    const now = tagCount(tags, tag);
    const next = th[tag].find((t) => t.n > now);
    if (!next) continue;
    out.push({ tag, tagName: PATH_NAMES[tag] ?? tag, now, next, hit: now + 1 >= next.n });
    if (out.length >= max) break;
  }
  return out;
}

/** Quantos pontos de tag faltam para a sinergia ligar (somando todas as tags que ela pede). */
export function synergyMissing(def: SynergyDef, tags: Tags): number {
  let n = 0;
  for (const [tag, need] of Object.entries(def.requires)) n += Math.max(0, need - tagCount(tags, tag));
  return n;
}

export interface NearSynergies {
  /** pontos que faltam para as mais perto */
  missing: number;
  ids: string[];
}

/** Painel da build: as sinergias desligadas que usam esta tag e estão mais perto de ligar (null se nenhuma). */
export function nearestSynergies(tags: Tags, tag: string): NearSynergies | null {
  let best: NearSynergies | null = null;
  for (const s of SYNERGIES) {
    if (!(tag in s.requires)) continue;
    const m = synergyMissing(s, tags);
    if (m === 0) continue;
    if (!best || m < best.missing) best = { missing: m, ids: [s.id] };
    else if (m === best.missing) best.ids.push(s.id);
  }
  return best;
}
