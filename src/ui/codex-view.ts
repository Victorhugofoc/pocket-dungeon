// Tela do códex (M13-04 parte 2): porta de dungeon-idle/src/ui/screens/codex.lua em DOM. Só apresentação; a lógica
// está em core/codex.ts. Abas com contagem e "NOVO", busca pelo nome (só no que já foi visto), lista à esquerda e
// ficha à direita. O que está trancado por conquista mostra a silhueta e a condição (D-630); o que não foi visto, "???".
import { isOpen, isSecret, progress, unlockCondition, type AchievementState } from "../core/achievements";
import {
  CODEX_TABS, codexCompletion, codexEntries, codexIsNew, codexNewCount, codexSeen, codexSplit, type CodexEntry, type CodexTab,
} from "../core/codex";
import { eventLines, pactLines } from "../core/events";
import { ACHIEVEMENT_BY_ID, COSMETIC_NAMES, UNLOCK_REWARDS, type UnlockKind } from "../data/achievements";
import { AFFIX_REWARD_PER, AFFIXES, type AffixId } from "../data/affixes";
import { BOSSES, ENEMIES } from "../data/enemies";
import { EVENT_BY_ID, PACT_BY_ID } from "../data/events";
import { HEROES, type HeroDef } from "../data/heroes";
import { RELICS, type RelicDef } from "../data/relics";
import { EVOLUTIONS, SPELL_TEXT, SPELLS, type SpellId } from "../data/spells";
import { UPGRADE_BY_ID, type UpgradeDef } from "../data/upgrades";
import { TUNING } from "../data/tuning";
import { RARITY_COLOR } from "./theme";
import { evolutionIconUrl, iconHtml, relicIconUrl, spellIconUrl, upgradeIconUrl, uiIconUrl } from "./icons";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const hex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;

/** O que a ficha pega emprestado de ui.ts (os mesmos textos das cartas). */
export interface CodexFormat {
  heroKit: (h: HeroDef) => string;
  relicLines: (d: RelicDef) => string;
  upgradeLines: (u: UpgradeDef) => string;
}

export interface CodexView {
  tab: CodexTab;
  /** id selecionado na aba */
  sel: string;
  query: string;
}

const MEDALS = ["Easy", "Normal", "Hard"];

/** codex.lua `Screen.locked`: herói, relíquia, pacto ou evento ainda trancado por conquista. */
function lockedKind(s: AchievementState, tab: CodexTab, id: string): { kind: UnlockKind; id: string } | null {
  const k = codexSplit(tab, id);
  if (k.kind !== "hero" && k.kind !== "relic" && k.kind !== "pact" && k.kind !== "event") return null;
  return isOpen(s, k.kind, k.id, TUNING.unlockAll) ? null : { kind: k.kind, id: k.id };
}

/** A aba de conquistas mostra o nome mesmo trancada (codex.lua `OPEN_NAMES`), menos a secreta. */
function shownName(s: AchievementState, tab: CodexTab, e: CodexEntry): string | null {
  if (codexSeen(s, tab, e.id)) return e.name;
  if (tab === "achievement") return ACHIEVEMENT_BY_ID[e.id].secret ? null : e.name;
  return null;
}

function entryIcon(tab: CodexTab, id: string, size: number): string {
  const k = codexSplit(tab, id);
  let url: string | undefined;
  if (tab === "relic") url = relicIconUrl(id);
  else if (tab === "spell") url = EVOLUTIONS[id as keyof typeof EVOLUTIONS] ? evolutionIconUrl(id) : spellIconUrl(id);
  else if (tab === "modifier") url = spellIconUrl(id.split(":")[0]);
  else if (tab === "upgrade") url = upgradeIconUrl(id);
  else if (tab === "achievement") url = uiIconUrl("achievement") ?? uiIconUrl("trophy");
  if (url) return iconHtml(url, size);
  // sem ícone do original: um disco na cor do personagem (o modelo 3D entra na ficha, parte 3)
  const color = tab === "hero" ? HEROES[id]?.color : tab === "enemy" ? ENEMIES[id]?.color : tab === "boss" ? BOSSES[id]?.color
    : tab === "affix" ? undefined : undefined;
  const aff = tab === "affix" ? AFFIXES[id as AffixId]?.color : undefined;
  const css = color !== undefined ? hex(color) : aff ? `rgb(${aff.map((v) => Math.round(v * 255)).join(",")})` : k.kind === "pact" ? "#ff5a5a" : "#5fd3c8";
  return `<i class="cx-dot" style="--dc:${css};width:${size}px;height:${size}px"></i>`;
}

/** A lista da aba, filtrada pela busca (só nome já visto entra na busca, para não entregar o "???"). */
export function codexList(s: AchievementState, v: CodexView): CodexEntry[] {
  const q = v.query.trim().toLowerCase();
  const all = codexEntries(v.tab);
  if (!q) return all;
  return all.filter((e) => shownName(s, v.tab, e)?.toLowerCase().includes(q));
}

function medalsHtml(s: AchievementState, heroId: string): string {
  const r = s.medals[heroId] ?? 0;
  return `<div class="cx-medals">${MEDALS.map((m, i) => `<span class="${r > i ? "got" : ""}">${m}</span>`).join("")}</div>`;
}

const line = (t: string, cls = "") => `<p class="cx-line ${cls}">${t}</p>`;

function rewardNames(achId: string): string {
  return (UNLOCK_REWARDS[achId] ?? []).map(([k, id]) => k === "hero" ? HEROES[id]?.name : k === "relic" ? RELICS[id]?.name
    : k === "pact" ? PACT_BY_ID[id]?.name : k === "event" ? EVENT_BY_ID[id]?.name : COSMETIC_NAMES[id] ?? id).filter(Boolean).join(", ");
}

/** O corpo da ficha de uma entrada vista (codex.lua `Screen.details`). */
function detailBody(s: AchievementState, tab: CodexTab, id: string, f: CodexFormat, recordKills: number): string {
  const k = codexSplit(tab, id);
  switch (tab) {
    case "hero": {
      const h = HEROES[id];
      return line(esc(h.title), "dim") + medalsHtml(s, id) + line(esc(h.identity)) + f.heroKit(h);
    }
    case "spell": {
      const evo = EVOLUTIONS[id as keyof typeof EVOLUTIONS];
      if (evo) {
        const req = evo.requires.map((r) => RELICS[r]?.name ?? r).join(" or ");
        return line("Spell evolution", "dim") + line(esc(evo.text)) + line(`Recipe: ${esc(SPELLS[evo.spell].name)} Lv 5 + ${esc(req)}`, "gold");
      }
      const sp = SPELLS[id as SpellId];
      return line(`${cap(sp.school)} · ${sp.kind}`, "dim") + line(esc(SPELL_TEXT[id as SpellId]))
        + sp.milestones.map((m) => line(`Lv ${m.level}: ${esc(m.text)}`, "small")).join("")
        + (sp.evolutions.length ? line(`Evolves into: ${sp.evolutions.map((e) => esc(EVOLUTIONS[e].name)).join(", ")}`, "gold") : "");
    }
    case "relic": {
      const d = RELICS[id];
      const recipe = d.requires?.length ? line(`Recipe: ${d.requires.map((r) => esc(RELICS[r]?.name ?? r)).join(" + ")}`, "gold") : "";
      return line(`<b style="color:${RARITY_COLOR[d.rarity] ?? "#ccc"}">${cap(d.rarity)}</b> · ${d.category.replace("_", " ")}`, "dim")
        + `<div class="cx-stats">${f.relicLines(d)}</div>` + recipe + (d.tags.length ? line(`Tags: ${d.tags.join(", ")}`, "dim") : "");
    }
    case "enemy": {
      const d = ENEMIES[id];
      return line(d.category === d.behavior ? cap(d.category) : `${cap(d.category)} · ${d.behavior}`, "dim")
        + line(`HP ${d.hp} · Damage ${d.damage} · Speed ${d.speed}`)
        + line(`Defeated: ${(s.defeated[id] ?? 0).toLocaleString("en-US")}`, "gold");
    }
    case "boss": {
      const b = BOSSES[id];
      return line(esc(b.title), "dim") + line(`HP ${b.hp} · Damage ${b.damage} · Speed ${b.speed}`)
        + line(`${b.patterns.length} attack patterns${b.minDifficulty ? " · Hard only" : ""}`, "small")
        + line(`Defeated: ${(s.defeated[id] ?? 0).toLocaleString("en-US")}`, "gold");
    }
    case "upgrade": {
      const u = UPGRADE_BY_ID[id];
      return (u.hero ? line(`${esc(HEROES[u.hero]?.name ?? u.hero)} only`, "gold") : "")
        + `<div class="cx-stats">${f.upgradeLines(u)}</div>` + (u.note ? line(esc(u.note), "small") : "")
        + (u.tags.length ? line(`Tags: ${u.tags.join(", ")}`, "dim") : "");
    }
    case "modifier": {
      const [sid, mid] = id.split(":");
      const m = SPELLS[sid as SpellId].modifiers.find((x) => x.id === mid)!;
      return line(`Modifier of ${esc(SPELLS[sid as SpellId].name)}`, "dim") + line(esc(m.text), "good");
    }
    case "pactevent": {
      if (k.kind === "pact") return line("Risk Pact", "dim") + pactLines(PACT_BY_ID[k.id]).map(([t, good]) => line(esc(t), good ? "good" : "neg")).join("");
      return line("Event", "dim") + eventLines(EVENT_BY_ID[k.id], 1).map(([t, good]) => line(esc(t), good ? "good" : "neg")).join("");
    }
    case "affix": {
      const a = AFFIXES[id as AffixId];
      return line("Champion affix", "dim") + line(esc(a.text)) + line(`On a champion, each affix gives +${Math.round(AFFIX_REWARD_PER * 100)}% gold and XP.`, "gold");
    }
    case "achievement": {
      const a = ACHIEVEMENT_BY_ID[id];
      const done = s.unlocked[id] === true;
      const hidden = a.secret && !done;
      const p = progress(s, a, recordKills);
      const rw = rewardNames(id);
      return line(hidden ? "???" : esc(a.text), done ? "good" : "")
        + (p && !done ? line(`Progress: ${Math.min(p.current, p.goal).toLocaleString("en-US")} / ${p.goal.toLocaleString("en-US")}`, "dim") : "")
        + (rw ? line(`Unlocks: ${hidden ? "???" : esc(rw)}`, "gold") : "") + line(done ? "Unlocked" : "Locked", done ? "good" : "dim");
    }
  }
}

/** Como achar o que ainda não foi visto. */
const HOW: Record<CodexTab, string> = {
  hero: "Play a run with this hero.", spell: "Equip or evolve this spell in a run.", relic: "Find this relic in a run.",
  enemy: "Defeat this enemy.", boss: "Defeat this boss.", upgrade: "Take this upgrade on level up.",
  modifier: "Pick this modifier when the spell levels up.", pactevent: "Accept this pact or choose this event on the map.",
  affix: "", achievement: "",
};

/** A ficha da entrada selecionada (o palco do modelo 3D fica em `.cx-stage`, parte 3). */
export function codexDetailHtml(s: AchievementState, v: CodexView, f: CodexFormat, recordKills: number): string {
  const e = codexEntries(v.tab).find((x) => x.id === v.sel);
  if (!e) return `<div class="cx-detail empty"><p class="cx-line dim">Nothing here.</p></div>`;
  const has3d = v.tab === "hero" || v.tab === "enemy" || v.tab === "boss";
  const lock = lockedKind(s, v.tab, e.id);
  const seen = codexSeen(s, v.tab, e.id);
  const name = shownName(s, v.tab, e);
  const stage = has3d ? `<div class="cx-stage ${seen && !lock ? "" : "dark"}" data-r="cx-stage"></div>` : `<div class="cx-icon">${seen ? entryIcon(v.tab, e.id, 72) : `<i class="cx-q">?</i>`}</div>`;
  let body: string;
  if (lock) {
    const a = unlockCondition(lock.kind, lock.id);
    body = line("Locked", "neg") + line(isSecret(s, lock.kind, lock.id) ? "Unlocked by a secret achievement." : `Unlocked by <b>${esc(a?.name ?? "?")}</b>: ${esc(a?.text ?? "")}`);
  } else if (!seen && v.tab !== "achievement") body = line("Not discovered yet.", "dim") + (HOW[v.tab] ? line(HOW[v.tab], "small") : "");
  else body = detailBody(s, v.tab, e.id, f, recordKills);
  return `<div class="cx-detail">${stage}<h3>${lock && !seen ? "???" : esc(name ?? "???")}</h3>${body}</div>`;
}

/** A tela inteira menos a ficha (que se troca sozinha ao andar pela lista). */
export function codexScreenHtml(s: AchievementState, v: CodexView): string {
  const { seen, total } = codexCompletion(s);
  const tabs = CODEX_TABS.map((t, i) => {
    const list = codexEntries(t.id);
    const got = list.filter((e) => codexSeen(s, t.id, e.id)).length;
    const n = codexNewCount(s, t.id);
    return `<button class="cx-tab ${t.id === v.tab ? "sel" : ""}" data-tab="${t.id}" title="${i === 0 ? "Q / E switch tabs" : ""}">${t.label}`
      + `<small>${t.id === "affix" ? list.length : `${got}/${list.length}`}</small>${n ? `<i class="cx-new">${n}</i>` : ""}</button>`;
  }).join("");
  const rows = codexList(s, v).map((e) => {
    const name = shownName(s, v.tab, e);
    const lock = lockedKind(s, v.tab, e.id);
    const isNew = codexIsNew(s, v.tab, e.id);
    const seenE = codexSeen(s, v.tab, e.id);
    return `<li class="${e.id === v.sel ? "sel" : ""} ${seenE ? "" : "unseen"} ${lock ? "locked" : ""}" data-entry="${esc(e.id)}">`
      + `${seenE ? entryIcon(v.tab, e.id, 22) : `<i class="cx-q sm">${lock ? "🔒" : "?"}</i>`}<span>${esc(name ?? "???")}</span>${isNew ? `<i class="cx-new">NEW</i>` : ""}</li>`;
  }).join("");
  return `<header class="cx-top"><h2>CODEX</h2><p class="cx-done">${seen} / ${total} discovered · ${Math.floor((seen / Math.max(1, total)) * 100)}%</p>
      <input class="cx-search" data-r="cx-search" placeholder="Search (/)" value="${esc(v.query)}" spellcheck="false"></header>
    <nav class="cx-tabs">${tabs}</nav>
    <div class="cx-main"><ul class="cx-list" data-r="cx-list">${rows || `<li class="unseen"><span>No match</span></li>`}</ul><div data-r="cx-detail"></div></div>
    <div class="row end"><span class="cx-keys">Q / E tabs · ↑ ↓ entries · / search</span><button data-act="back">Back (Esc)</button></div>`;
}
