// Códex (M13-04): porta de dungeon-idle/src/core/codex.lua. O que o jogador já conheceu: heróis, spells (e
// evoluções), relíquias, inimigos e chefes (ao derrotar), melhorias, modificadores, pactos e eventos. Só informação:
// nada aqui muda a partida. O estado mora no save das conquistas (`AchievementState.seen`), como antes.
// Melhorias daqui (escolhidas pelo usuário em 2026-11-25): "NOVO" por entrada até abrir, contagem de derrotados por
// inimigo e chefe, e semeadura pelo save e pelo registro de partidas (um save antigo não abre o códex vazio).
import { ACHIEVEMENTS } from "../data/achievements";
import { AFFIX_ORDER, AFFIXES } from "../data/affixes";
import { BEHAVIOR_EPICS } from "../data/epics";
import { BOSS_ORDER, BOSSES, ENEMIES } from "../data/enemies";
import { EVENTS, PACTS } from "../data/events";
import { HERO_ORDER, HEROES } from "../data/heroes";
import { RELIC_IDS, RELICS } from "../data/relics";
import { EVOLUTIONS, SPELL_ORDER, SPELLS } from "../data/spells";
import { UPGRADES } from "../data/upgrades";
import type { AchievementState } from "./achievements";

/** codex.lua `KINDS`: o que é marcado como visto */
export const CODEX_KINDS = ["hero", "spell", "relic", "enemy", "boss", "upgrade", "modifier", "pact", "event"] as const;
export type CodexKind = (typeof CODEX_KINDS)[number];

/** As abas da tela (codex.lua `Screen.TABS`); "pactevent" junta pactos e eventos, ids "pact:<id>" e "event:<id>". */
export const CODEX_TABS = [
  { id: "hero", label: "Heroes" }, { id: "spell", label: "Spells" }, { id: "relic", label: "Relics" },
  { id: "enemy", label: "Enemies" }, { id: "boss", label: "Bosses" }, { id: "upgrade", label: "Upgrades" },
  { id: "modifier", label: "Modifiers" }, { id: "pactevent", label: "Pacts/Events" }, { id: "affix", label: "Affixes" },
  { id: "achievement", label: "Achievements" },
] as const;
export type CodexTab = (typeof CODEX_TABS)[number]["id"];

export interface CodexEntry {
  /** o id na aba (na "pactevent", "pact:<id>" ou "event:<id>"; na "modifier", "<spell>:<mod>") */
  id: string;
  name: string;
  /** spell: é uma evolução */
  evolution?: boolean;
}

export function emptySeen(): Record<CodexKind, string[]> {
  return Object.fromEntries(CODEX_KINDS.map((k) => [k, []])) as unknown as Record<CodexKind, string[]>;
}

/** codex.lua `split`: a aba e o id da tela viram o tipo e o id guardados. */
export function codexSplit(tab: CodexTab, id: string): { kind: CodexKind | "affix" | "achievement"; id: string } {
  if (tab === "pactevent") {
    const m = /^(pact|event):(.+)$/.exec(id);
    if (m) return { kind: m[1] as CodexKind, id: m[2] };
  }
  return { kind: tab as CodexKind, id };
}

const entryCache = new Map<CodexTab, CodexEntry[]>();

/** codex.lua `entries`: as entradas da aba, na ordem do jogo. */
export function codexEntries(tab: CodexTab): CodexEntry[] {
  const hit = entryCache.get(tab);
  if (hit) return hit;
  let out: CodexEntry[] = [];
  switch (tab) {
    case "hero": out = HERO_ORDER.map((id) => ({ id, name: HEROES[id].name })); break;
    case "spell":
      out = SPELL_ORDER.map((id) => ({ id: id as string, name: SPELLS[id].name }));
      out.push(...Object.values(EVOLUTIONS).map((e) => ({ id: e.id as string, name: e.name, evolution: true }))
        .sort((a, b) => a.name.localeCompare(b.name)));
      break;
    case "relic": out = RELIC_IDS.map((id) => ({ id, name: RELICS[id].name })); break;
    case "enemy": out = Object.keys(ENEMIES).map((id) => ({ id, name: ENEMIES[id].name })); break;
    case "boss": out = BOSS_ORDER.map((id) => ({ id: id as string, name: BOSSES[id].name })); break;
    case "upgrade": {
      const seen = new Set<string>();
      for (const u of [...UPGRADES, ...BEHAVIOR_EPICS]) if (!seen.has(u.id)) { seen.add(u.id); out.push({ id: u.id, name: u.name }); }
      break;
    }
    case "modifier":
      for (const sid of SPELL_ORDER) for (const m of SPELLS[sid].modifiers) out.push({ id: `${sid}:${m.id}`, name: `${m.name} (${SPELLS[sid].name})` });
      break;
    case "pactevent":
      out = [...PACTS.map((p) => ({ id: `pact:${p.id}`, name: p.name })), ...EVENTS.map((e) => ({ id: `event:${e.id}`, name: e.name }))];
      break;
    case "affix": out = AFFIX_ORDER.map((id) => ({ id: id as string, name: AFFIXES[id].name })); break;
    case "achievement": out = ACHIEVEMENTS.map((a) => ({ id: a.id, name: a.name })); break;
  }
  entryCache.set(tab, out);
  return out;
}

/** codex.lua `seen`: afixos abertos desde o início; conquista vista = liberada. */
export function codexSeen(s: AchievementState, tab: CodexTab, id: string): boolean {
  if (tab === "affix") return true;
  if (tab === "achievement") return s.unlocked[id] === true;
  const k = codexSplit(tab, id);
  return s.seen[k.kind as CodexKind]?.includes(k.id) ?? false;
}

/** codex.lua `mark`: true na primeira vez. `quiet` (semeadura) não põe o "NOVO". */
export function codexMark(s: AchievementState, kind: CodexKind, id: string | null | undefined, quiet = false): boolean {
  if (!id) return false;
  const list = (s.seen[kind] ??= []);
  if (list.includes(id)) return false;
  list.push(id);
  if (!quiet) s.codexNew[`${kind}:${id}`] = true;
  return true;
}

/** A chave do "NOVO" de uma entrada da tela. */
function newKey(tab: CodexTab, id: string): string {
  const k = codexSplit(tab, id);
  return `${k.kind}:${k.id}`;
}

export function codexIsNew(s: AchievementState, tab: CodexTab, id: string): boolean {
  return s.codexNew[newKey(tab, id)] === true;
}

/** Tira o "NOVO" ao abrir a entrada; true quando havia (para salvar). */
export function codexOpened(s: AchievementState, tab: CodexTab, id: string): boolean {
  const k = newKey(tab, id);
  if (!s.codexNew[k]) return false;
  delete s.codexNew[k];
  return true;
}

export function codexNewCount(s: AchievementState, tab: CodexTab): number {
  return codexEntries(tab).reduce((n, e) => n + (codexIsNew(s, tab, e.id) ? 1 : 0), 0);
}

/** O que a partida mostra (codex.lua `syncRun`). Aceita a partida em curso e a linha do registro de partidas. */
export interface CodexRunLike {
  heroId: string;
  spells?: ReadonlyArray<{ id: string; evolution?: string | null; modifiers?: readonly string[] }>;
  relics?: readonly string[];
  upgradesTaken?: readonly string[];
  /** o registro guarda as melhorias como `{id}` */
  upgrades?: ReadonlyArray<{ id: string }>;
  pacts?: ReadonlyArray<string | { id: string }>;
  events?: ReadonlyArray<{ id: string }>;
  eventLog?: ReadonlyArray<{ id: string }>;
}

/** Marca tudo o que a partida mostra; devolve o que entrou agora (para o aviso). */
export function codexSyncRun(s: AchievementState, run: CodexRunLike, quiet = false): { kind: CodexKind; id: string }[] {
  const out: { kind: CodexKind; id: string }[] = [];
  const mark = (kind: CodexKind, id: string | null | undefined) => {
    if (id && codexMark(s, kind, id, quiet)) out.push({ kind, id });
  };
  mark("hero", run.heroId);
  for (const sp of run.spells ?? []) {
    mark("spell", sp.id);
    mark("spell", sp.evolution);
    for (const m of sp.modifiers ?? []) mark("modifier", `${sp.id}:${m}`);
  }
  for (const r of run.relics ?? []) mark("relic", r);
  for (const u of run.upgradesTaken ?? []) mark("upgrade", u);
  for (const u of run.upgrades ?? []) mark("upgrade", u.id);
  for (const p of run.pacts ?? []) mark("pact", typeof p === "string" ? p : p.id);
  for (const e of run.events ?? []) mark("event", e.id);
  for (const e of run.eventLog ?? []) mark("event", e.id);
  return out;
}

/** Inimigo ou chefe derrotado (codex.lua: entra ao derrotar, não ao aparecer). Devolve se entrou agora. */
export function codexDefeat(s: AchievementState, boss: boolean, id: string): boolean {
  s.defeated[id] = (s.defeated[id] ?? 0) + 1;
  return codexMark(s, boss ? "boss" : "enemy", id);
}

/** Visto / total, todas as abas menos Afixos (codex.lua `Screen.completion`). */
export function codexCompletion(s: AchievementState): { seen: number; total: number } {
  let seen = 0, total = 0;
  for (const t of CODEX_TABS) {
    if (t.id === "affix") continue;
    for (const e of codexEntries(t.id)) {
      total++;
      if (codexSeen(s, t.id, e.id)) seen++;
    }
  }
  return { seen, total };
}

/**
 * Semeia o códex uma vez (save de antes da M13-04): heróis jogados ou com medalha, e tudo o que o registro de
 * partidas mostra. Sem "NOVO". Devolve true quando mudou (para salvar).
 */
export function codexSeed(s: AchievementState, runs: readonly CodexRunLike[]): boolean {
  if (s.codexSeeded) return false;
  s.codexSeeded = true;
  for (const h of [...s.played, ...Object.keys(s.medals)]) codexMark(s, "hero", h, true);
  for (const r of runs) codexSyncRun(s, r, true);
  return true;
}
