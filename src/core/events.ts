// Eventos e pactos da partida: porta de run/run_map.lua (`eventDraft`, `eventAvailable`, `applyEvent`,
// `expireWaveScope`, `unownedPacts`, `addPact`, `pactTakenInSegment`) e das camadas de modifier_engine.lua
// (`waveLayer` com o evento e o atraso do Ominous Omen, `pactLayer`, `championChance`). Lógica pura: o estado fica
// na partida (vai no checkpoint); o jogo aplica a vida, o nível e a escolha de relíquia que `applyEvent` devolve.
//
// Hora do mapa: lá o mapa sai entre as ondas, com `run.wave` = a onda vencida; aqui a carta é escolhida na caminhada
// da própria onda, com `run.wave` já nela. Por isso as funções recebem `wave` = a onda que a carta leva, e o atraso
// do Omen cai em `wave - 1 + delayed.waves`, a mesma onda de lá.
import {
  EVENT_BY_ID, EVENT_CHOICES, EVENT_IDS, LAYER_KEYS, LAYER_LABEL, PACT_BY_ID, PACT_IDS, PACT_MAX_ACTIVE,
  type EventDef, type LayerKey, type LayerMods, type PactDef, type StatEffect,
} from "../data/events";
import { STAT_LABEL, type StatBlock } from "./stats";
import { segmentOf } from "./waves";

export type Layer = Record<LayerKey, number>;

export interface EventLogEntry {
  wave: number;
  id: string;
  /** Gambler's Den */
  gamble?: "win" | "lose";
}

/** O que a partida guarda de eventos e pactos (campos de `run` no Lua). */
export interface EventRunState {
  /** evento valendo na onda atual (`run.event`, só os que têm `mods` ou `effects`) */
  event: string | null;
  /** Ominous Omen: a onda em que a camada cai (`run.delayedMods`) */
  delayedMods: { wave: number; id: string }[];
  /** Blood Altar (`run.eventGold`) */
  eventGold: { id: string; pct: number; waves: number } | null;
  /** Cursed Chamber: +1 escolha no próximo chefe, no máximo 1 */
  bossRelicBonus: number;
  /** pactos ativos, na ordem em que entraram */
  pacts: string[];
  /** D-150: trechos de 5 ondas que já deram pacto */
  pactSegments: number[];
  /** registro de partidas: cada evento escolhido (`run.eventsTaken`, com a onda) */
  eventLog: EventLogEntry[];
  /** registro de partidas: a onda de cada pacto */
  pactLog: { wave: number; id: string }[];
}

export function newEventState(): EventRunState {
  return { event: null, delayedMods: [], eventGold: null, bossRelicBonus: 0, pacts: [], pactSegments: [], eventLog: [], pactLog: [] };
}

/** Checkpoints de antes do M11-08. */
export function ensureEventState(run: Partial<EventRunState>): void {
  const d = newEventState();
  run.event ??= null;
  run.delayedMods ??= d.delayedMods;
  run.eventGold ??= null;
  run.bossRelicBonus ??= 0;
  run.pacts ??= d.pacts;
  run.pactSegments ??= d.pactSegments;
  run.eventLog ??= d.eventLog;
  run.pactLog ??= d.pactLog;
}

/** A parte da partida que estas funções leem e mudam. */
export type EventRun = EventRunState & {
  gold: number;
  freeRerolls: number;
  statistics: { goldEarned: number; goldSpent: number };
  /** sem pactos para escolher (seed diária, D-229) */
  noPacts?: boolean;
};

// ---------------------------------------------------------------- camadas (modifier_engine.lua)

export function identityLayer(): Layer {
  return Object.fromEntries(LAYER_KEYS.map((k) => [k, 1])) as Layer;
}

/** Multiplica as camadas, chave a chave (as que faltam valem 1). */
export function multiplyLayers(...mods: (LayerMods | null | undefined)[]): Layer {
  const out = identityLayer();
  for (const m of mods) {
    if (!m) continue;
    for (const k of LAYER_KEYS) if (m[k] !== undefined) out[k] *= m[k]!;
  }
  return out;
}

/** O que o evento põe na camada da onda `wave`: o evento da onda e o atraso que cai nela. */
export function eventMods(run: EventRunState, wave: number): LayerMods[] {
  const out: LayerMods[] = [];
  const ev = run.event ? EVENT_BY_ID[run.event] : undefined;
  if (ev?.mods) out.push(ev.mods);
  for (const dm of run.delayedMods) {
    const def = EVENT_BY_ID[dm.id];
    if (dm.wave === wave && def?.delayed) out.push(def.delayed.mods);
  }
  return out;
}

/** `pactLayer` */
export function pactLayer(pacts: readonly string[]): Layer {
  return multiplyLayers(...pacts.map((id) => PACT_BY_ID[id]?.mods));
}

/** `championChance`: pontos somados à chance de campeão sorteado */
export function pactChampionChance(pacts: readonly string[]): number {
  return pacts.reduce((a, id) => a + (PACT_BY_ID[id]?.championChance ?? 0), 0);
}

function statBlock(effects: readonly StatEffect[] | undefined): StatBlock | null {
  if (!effects?.length) return null;
  const b: StatBlock = {};
  for (const e of effects) b[e.stat] = (b[e.stat] ?? 0) + e.value;
  return b;
}

/** As fontes de atributo de eventos e pactos (`event:<id>`, `event_gold`, `pact:<id>`). */
export function eventSources(run: EventRunState): StatBlock[] {
  const out: StatBlock[] = [];
  const ev = run.event ? statBlock(EVENT_BY_ID[run.event]?.effects) : null;
  if (ev) out.push(ev);
  if (run.eventGold) out.push({ goldPct: run.eventGold.pct });
  for (const id of run.pacts) {
    const b = statBlock(PACT_BY_ID[id]?.effects);
    if (b) out.push(b);
  }
  return out;
}

// ---------------------------------------------------------------- pactos (run_map.lua)

/** `unownedPacts`: os abertos no codex que o herói ainda não tem, na ordem de lá */
export function unownedPacts(run: EventRunState, isOpen: (id: string) => boolean = () => true): string[] {
  return PACT_IDS.filter((id) => !run.pacts.includes(id) && isOpen(id));
}

export function pactTakenInSegment(run: EventRunState, wave: number): boolean {
  return run.pactSegments.includes(segmentOf(wave));
}

/** Os pactos que a carta de pacto pode sortear antes da onda `wave` (`nodePool`); vazio = sem carta de pacto. */
export function pactsForMap(run: EventRun, wave: number, isOpen?: (id: string) => boolean): string[] {
  if (run.noPacts || run.pacts.length >= PACT_MAX_ACTIVE || pactTakenInSegment(run, wave)) return [];
  return unownedPacts(run, isOpen);
}

/** `addPact` mais o registro do trecho (`acceptPact`, D-150). Devolve se entrou. */
export function addPact(run: EventRunState, id: string, wave: number): boolean {
  if (!PACT_BY_ID[id] || run.pacts.length >= PACT_MAX_ACTIVE || run.pacts.includes(id)) return false;
  run.pacts.push(id);
  const seg = segmentOf(wave);
  if (!run.pactSegments.includes(seg)) run.pactSegments.push(seg);
  run.pactLog.push({ wave, id });
  return true;
}

// ---------------------------------------------------------------- eventos (run_map.lua)

/** rng.lua `sample`: embaralha a cópia (Fisher-Yates de lá) e pega as `n` primeiras. */
export function sample<T>(list: readonly T[], n: number, next: () => number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

/** `eventDraft`: 3 eventos sem repetir, dos abertos no codex. */
export function eventDraft(next: () => number, isOpen: (id: string) => boolean = () => true): string[] {
  return sample(EVENT_IDS.filter(isOpen), EVENT_CHOICES, next);
}

/** `eventAvailable`: o evento com custo só sai com o ouro na mão. */
export function eventAvailable(run: { gold: number }, id: string): boolean {
  const c = EVENT_BY_ID[id]?.cost?.gold;
  return !(c && run.gold < c);
}

export interface EventOutcome {
  /** a vida depois do evento */
  hp: number;
  /** níveis a ganhar agora (o jogo enche o XP que falta) */
  levelUps: number;
  /** abrir a escolha de 1 de 2 deste pool */
  poolRelic: "event" | null;
  gamble: "win" | "lose" | null;
  /** ouro ganho (positivo) ou perdido, somando custo, prêmio e aposta */
  gold: number;
}

/**
 * `applyEvent` na carta da onda `wave` (a onda que o evento leva). Muda ouro, trocas grátis, a camada da onda, o
 * ouro do Blood Altar, o bônus do chefe e o registro; devolve a vida nova e o que o jogo ainda faz.
 */
export function applyEvent(run: EventRun, id: string, wave: number, io: { hp: number; maxHp: number; chance: (p: number) => boolean }): EventOutcome {
  const def = EVENT_BY_ID[id];
  if (!def) throw new Error(`unknown event ${id}`);
  const gold0 = run.gold;
  let hp = io.hp;
  if (def.cost) {
    run.gold -= def.cost.gold;
    run.statistics.goldSpent += def.cost.gold;
  }
  const im = def.immediate;
  if (im?.healPct) hp = Math.min(io.maxHp, hp + io.maxHp * im.healPct);
  if (im?.freeRerolls) run.freeRerolls += im.freeRerolls;
  let gamble: EventOutcome["gamble"] = null;
  if (def.gamble) {
    const g = def.gamble;
    if (io.chance(g.chance)) {
      run.gold += g.win;
      run.statistics.goldEarned += g.win;
      gamble = "win";
    } else {
      run.gold = Math.max(0, run.gold - g.lose);
      gamble = "lose";
    }
  }
  if (def.delayed) run.delayedMods.push({ wave: wave - 1 + def.delayed.waves, id });
  if (im?.gold) {
    run.gold += im.gold;
    run.statistics.goldEarned += im.gold;
  }
  // D-088: perde a parte da vida máxima como vida, nunca abaixo de 1
  if (im?.maxHpLossPct) hp = Math.max(1, hp - io.maxHp * im.maxHpLossPct);
  if (def.mods || def.effects) run.event = id;
  // contado à parte (§12); pegar de novo renova (D-089)
  if (def.goldWaves) run.eventGold = { id, pct: def.goldWaves.pct, waves: def.goldWaves.waves };
  if (def.bossRelicBonus) run.bossRelicBonus = Math.min(1, run.bossRelicBonus + def.bossRelicBonus);
  run.eventLog.push(gamble ? { wave, id, gamble } : { wave, id });
  return { hp, levelUps: im?.levelUps ?? 0, poolRelic: def.poolRelic ?? null, gamble, gold: run.gold - gold0 };
}

/** `expireWaveScope`, no fim da onda `wave`: o evento sai; o ouro do Blood Altar conta uma onda; o atraso que já caiu sai. */
export function expireEvents(run: EventRunState, wave: number): void {
  run.event = null;
  run.delayedMods = run.delayedMods.filter((d) => d.wave > wave);
  if (run.eventGold) {
    run.eventGold.waves--;
    if (run.eventGold.waves <= 0) run.eventGold = null;
  }
}

/** boss_rewards.lua `draft`: o bônus pendente do Cursed Chamber, gasto por este chefe. */
export function takeBossRelicBonus(run: EventRunState): number {
  const b = Math.min(1, run.bossRelicBonus);
  run.bossRelicBonus = 0;
  return b;
}

// ---------------------------------------------------------------- texto (a partir dos números)

export type Line = [text: string, good: boolean];

const pct = (x: number) => `${Math.round(x * 100)}%`;
const signed = (x: number) => `${x >= 0 ? "+" : "−"}${pct(Math.abs(x))}`;

/** Bom para o herói? Recompensa alta é boa; duração curta e o resto alto, ruins. */
function layerGood(k: LayerKey, v: number): boolean {
  if (k === "reward") return v > 1;
  if (k === "duration") return v > 1;
  return v < 1;
}

function layerLines(mods: LayerMods | undefined, prefix: string): Line[] {
  const out: Line[] = [];
  for (const k of LAYER_KEYS) {
    const v = mods?.[k];
    if (v === undefined || v === 1) continue;
    out.push([`${prefix}${signed(v - 1)} ${LAYER_LABEL[k]}`, layerGood(k, v)]);
  }
  return out;
}

function effectLines(effects: readonly StatEffect[] | undefined, prefix: string): Line[] {
  return (effects ?? []).map((e) => [`${prefix}${signed(e.value)} ${STAT_LABEL[e.stat]}`, e.value > 0] as Line);
}

/**
 * As linhas da carta do evento (o `lines` de events.lua, escrito a partir dos números). `wave` = a onda que a
 * carta leva: com ela o atraso do Omen diz a onda em que cai.
 */
export function eventLines(def: EventDef, wave?: number): Line[] {
  const L: Line[] = [];
  const im = def.immediate;
  if (def.cost) L.push([`Pay ${def.cost.gold} gold`, false]);
  if (im?.gold) L.push([`+${im.gold} gold now`, true]);
  if (im?.healPct) L.push([im.healPct >= 1 ? "Heal to full HP" : `Heal ${pct(im.healPct)} of your HP now`, true]);
  if (im?.levelUps) L.push([`Gain ${im.levelUps} level${im.levelUps > 1 ? "s" : ""} now`, true]);
  if (im?.freeRerolls) L.push([`Next shop: ${im.freeRerolls} free reroll${im.freeRerolls > 1 ? "s" : ""}`, true]);
  if (def.poolRelic) L.push(["Choose 1 of 2 event relics", true]);
  if (def.goldWaves) L.push([`+${pct(def.goldWaves.pct)} Gold for ${def.goldWaves.waves} waves`, true]);
  if (def.bossRelicBonus) L.push([`Next boss: +${def.bossRelicBonus} relic choice (max 1 pending)`, true]);
  if (def.gamble) {
    const g = def.gamble;
    L.push([`${pct(g.chance)}: +${g.win} gold`, true]);
    L.push([`${pct(1 - g.chance)}: lose ${g.lose} gold`, false]);
  }
  L.push(...effectLines(def.effects, "This wave: "));
  L.push(...layerLines(def.mods, "This wave: "));
  if (def.delayed) {
    const at = wave !== undefined ? `Wave ${wave - 1 + def.delayed.waves}: ` : `In ${def.delayed.waves - 1} wave${def.delayed.waves - 1 === 1 ? "" : "s"} after this one: `;
    L.push(...layerLines(def.delayed.mods, at));
  }
  if (im?.maxHpLossPct) L.push([`Lose ${pct(im.maxHpLossPct)} of Max HP now (never below 1 HP)`, false]);
  // o bom primeiro, como nas cartas de lá
  return [...L.filter((l) => l[1]), ...L.filter((l) => !l[1])];
}

/** As linhas do pacto: para o resto da partida. */
export function pactLines(def: PactDef): Line[] {
  const L: Line[] = [...layerLines(def.mods, ""), ...effectLines(def.effects, "")];
  if (def.championChance) L.push([`+${pct(def.championChance)} Champion chance`, false]);
  return [...L.filter((l) => l[1]), ...L.filter((l) => !l[1])];
}

/** O que a confirmação do pacto mostra: a camada de pactos antes e depois de aceitar (pact.lua `ROWS`). */
export function pactPreview(run: EventRunState, id: string): { key: LayerKey; label: string; before: number; after: number }[] {
  const before = pactLayer(run.pacts), after = pactLayer([...run.pacts, id]);
  const keys: LayerKey[] = ["reward", "enemyHp", "enemyDamage", "enemySpeed", "enemyCount"];
  return keys.map((key) => ({ key, label: LAYER_LABEL[key], before: before[key], after: after[key] }));
}

// ---------------------------------------------------------------- HUD

export interface ActiveRow {
  kind: "event" | "pact" | "omen" | "gold" | "boss";
  name: string;
  text: string;
  /** quanto falta: "this wave", "2 waves", "W7" */
  when: string;
}

/** O que está valendo agora (ou vai valer): o HUD e a tela I. `wave` = a onda atual. */
export function activeRows(run: EventRunState, wave: number): ActiveRow[] {
  const out: ActiveRow[] = [];
  const join = (L: Line[]) => L.map((l) => l[0]).join(" · ");
  for (const id of run.pacts) {
    const p = PACT_BY_ID[id];
    if (p) out.push({ kind: "pact", name: p.name, text: join(pactLines(p)), when: "run" });
  }
  const ev = run.event ? EVENT_BY_ID[run.event] : undefined;
  if (ev) {
    const L = [...effectLines(ev.effects, ""), ...layerLines(ev.mods, "")];
    out.push({ kind: "event", name: ev.name, text: join(L), when: "this wave" });
  }
  if (run.eventGold) {
    const ev2 = EVENT_BY_ID[run.eventGold.id];
    out.push({ kind: "gold", name: ev2?.name ?? "Gold", text: `+${pct(run.eventGold.pct)} Gold`, when: `${run.eventGold.waves} wave${run.eventGold.waves > 1 ? "s" : ""}` });
  }
  for (const dm of run.delayedMods) {
    const def = EVENT_BY_ID[dm.id];
    if (!def?.delayed || dm.wave < wave) continue;
    out.push({ kind: "omen", name: def.name, text: join(layerLines(def.delayed.mods, "")), when: dm.wave === wave ? "this wave" : `W${dm.wave}` });
  }
  if (run.bossRelicBonus > 0) out.push({ kind: "boss", name: "Cursed Chamber", text: `+${run.bossRelicBonus} relic choice`, when: "next boss" });
  return out;
}

/** O atraso do Omen que cai na onda `wave` (o aviso no portão). */
export function omenFor(run: EventRunState, wave: number): string | null {
  const dm = run.delayedMods.find((d) => d.wave === wave);
  const def = dm ? EVENT_BY_ID[dm.id] : undefined;
  return def?.delayed ? `${def.name}: ${layerLines(def.delayed.mods, "").map((l) => l[0]).join(", ")}` : null;
}
