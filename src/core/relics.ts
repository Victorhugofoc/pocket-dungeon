// Motor de relíquias (relic_system.lua `grant`, `devRemove`; relic_mechanics.lua). Lógica pura, sem three.js.
// - Posse: dar e tirar relíquia mexe em `run.relics`, nas tags de build (`run.tags`) e em `run.relicVersion`.
// - Atributos: cada relíquia é uma fonte de `computeStats` (a soma dos `effects`).
// - Spell: o `spellEffect` das relíquias de spell entra nos números da spell equipada (spell_stats.lua `collect`).
// - Ganchos: as relíquias que mudam o jogo (não só somam atributo) são mecânicas ligadas por um atributo próprio,
//   como em relic_mechanics.lua; o jogo chama `RelicHooks` nos pontos de evento (quadro, abate, golpe sofrido,
//   conjuração, nível, dano causado, cura) e elas respondem pelo `RelicWorld`.
import { inNormalPool, RELIC_DRAFT, RELIC_EVOLUTIONS, RELIC_IDS, RELIC_MECH, RELIC_STACK, RELICS, type RelicDef, type RelicPool, type RelicRarity } from "../data/relics";
import { MAX_SPELLS } from "../data/spells";
import { wantedRelics } from "./evolution";
import { elementsOf, hasElement } from "./levelup";
import type { SpellEffect } from "../data/spells";
import type { StatBlock, StatKey } from "./stats";
import type { RunState } from "./run";
import { px } from "./techniques";
import { BUILD_FIT } from "../data/upgrades";
import { perkExtraBans } from "./depths";

export function relicDef(id: string): RelicDef | undefined {
  return Object.prototype.hasOwnProperty.call(RELICS, id) ? RELICS[id] : undefined;
}

function addTags(run: RunState, def: RelicDef, sign: 1 | -1): void {
  for (const t of def.tags) run.tags[t] = Math.max(0, (run.tags[t] ?? 0) + sign);
}

/** Se a relíquia acumula (D7 revista): incomum e fora da lista de exceções. */
export function relicStackable(id: string): boolean {
  const d = relicDef(id);
  return !!d && RELIC_STACK.rarities.includes(d.rarity) && !RELIC_STACK.exclude.includes(id);
}

/** Quantas cópias o herói tem desta relíquia. */
export function relicCopies(relics: readonly string[], id: string): number {
  let n = 0;
  for (const r of relics) if (r === id) n++;
  return n;
}

/** Se o herói pode ganhar (mais uma cópia de) esta relíquia. */
export function canGainRelic(relics: readonly string[], id: string): boolean {
  const n = relicCopies(relics, id);
  return n === 0 || (relicStackable(id) && n < RELIC_STACK.maxCopies);
}

/** As relíquias do herói agrupadas: id e cópias, na ordem da primeira (para a interface). */
export function relicStacks(relics: readonly string[]): { id: string; copies: number }[] {
  const out = new Map<string, number>();
  for (const id of relics) out.set(id, (out.get(id) ?? 0) + 1);
  return [...out].map(([id, copies]) => ({ id, copies }));
}

/**
 * relic_system.lua `grant`: soma as tags e muda `relicVersion`. Devolve se entrou. Lá é única por id; aqui a incomum
 * acumula (D7 revista): a cópia a mais só soma atributos, sem tag e sem mudar `relicVersion` (a coleção é a mesma,
 * então uma evolução recusada não volta por causa dela).
 */
export function grantRelic(run: RunState, id: string): boolean {
  const def = relicDef(id);
  if (!def) throw new Error(`unknown relic ${id}`);
  if (!canGainRelic(run.relics, id)) return false;
  const first = !run.relics.includes(id);
  run.relics.push(id);
  if (first) {
    addTags(run, def, 1);
    run.relicVersion += 1;
  }
  return true;
}

/** relic_system.lua `devRemove` (e o consumo dos componentes na evolução de relíquia, `M12-08`): tira uma cópia. */
export function removeRelic(run: RunState, id: string): boolean {
  const i = run.relics.indexOf(id);
  if (i < 0) return false;
  run.relics.splice(i, 1);
  if (run.relics.includes(id)) return true; // ainda tem cópia: tags e coleção iguais
  const def = relicDef(id);
  if (def) addTags(run, def, -1);
  run.relicVersion += 1;
  return true;
}

/** As fontes de atributo das relíquias do herói, na ordem em que vieram (para `computeStats`). */
export function relicSources(relics: readonly string[]): StatBlock[] {
  const out: StatBlock[] = [];
  for (const id of relics) {
    const d = relicDef(id);
    if (d && d.effects.length) out.push(d.stats);
  }
  return out;
}

/** A soma crua dos atributos das relíquias (o que liga as mecânicas). */
export function relicTotals(relics: readonly string[]): StatBlock {
  const sum: StatBlock = {};
  for (const b of relicSources(relics)) for (const [k, v] of Object.entries(b)) sum[k as StatKey] = (sum[k as StatKey] ?? 0) + v;
  return sum;
}

/**
 * relic_system.lua `isDraftable`: só as categorias do sorteio normal (sem as de chefe e as evoluções), e a de spell
 * (§43, D-050) só com a spell dela equipada.
 */
export function relicDraftable(id: string, spells: readonly { id: string }[]): boolean {
  const d = relicDef(id);
  if (!d || !inNormalPool(d)) return false;
  return d.category !== "spell" || spells.some((s) => s.id === d.spell);
}

/** spell_stats.lua `collect`: os `spellEffect` das relíquias feitas para esta spell. */
export function relicSpellEffects(relics: readonly string[], spellId: string): SpellEffect[] {
  const out: SpellEffect[] = [];
  for (const id of relics) {
    const d = relicDef(id);
    if (d?.spellEffect && d.spell === spellId) out.push(d.spellEffect);
  }
  return out;
}

// ---------------------------------------------------------------- ganchos (relic_mechanics.lua)

/** O que o jogo mostra às mecânicas. Implementado por `Game`; nos testes, por um objeto simples. */
export interface RelicWorld {
  /** relógio do jogo, em s */
  time: number;
  /** há onda em andamento (relic_mechanics.lua `waveActive`) */
  waveActive: boolean;
  hp: number;
  maxHp: number;
  gold: number;
  /** o herói andou neste quadro */
  moving: boolean;
  /** cura que passa pelas regras de cura do jogo (`Game.heal`) */
  heal(amount: number): void;
  /** os inimigos vivos */
  foes(): readonly RelicFoe[];
  /** atordoa (o congelado daqui); chefe não é atordoado: devolve se pegou */
  stun(foe: RelicFoe, seconds: number): boolean;
  /** aplica queimadura pelas regras de status (uma só por inimigo) */
  burn(foe: RelicFoe, dps: number, seconds: number): void;
  /** dano em área do herói (behaviors.lua `areaHit` + `Damage.toEnemy`), menos em `except`; `source` é a fonte do golpe */
  areaHit(x: number, z: number, radius: number, damage: number, except: object, source: string): void;
  /** aviso para efeito e som (o nome é o do evento de lá, como `burn_spread`) */
  emit(event: string, data?: Record<string, unknown>): void;
}

/** Um inimigo vivo como as mecânicas o veem. `key` é o objeto do jogo (identidade entre quadros). */
export interface RelicFoe {
  key: object;
  x: number;
  z: number;
  boss: boolean;
  slowed: boolean;
  /** a queimadura dele agora, ou null */
  burn: { dps: number; left: number } | null;
}

/** O inimigo que morreu. */
export interface RelicEnemy extends RelicFoe {
  maxHp: number;
  champion: boolean;
}

/** O golpe que o herói dá (`Damage.toEnemy` `info`). */
export interface RelicHit {
  /** `auto`, `dot`, `other`, ou a spell/escola quando houver */
  source: string;
  /** escola do golpe (spell, queimadura = fire), ou nada */
  school?: string;
  boss: boolean;
}

/** Um ícone da fileira de estados do herói (relic_mechanics.lua `statuses`). */
export interface RelicStatus {
  id: string;
  left: number;
  total: number;
  /** contagem mostrada no ícone (Kill Streak) */
  count?: number;
}

/**
 * Uma mecânica de relíquia: liga com `stat` > 0 na soma das relíquias e recebe o valor (`v`) em cada gancho.
 * `state` é dela (criado por `init`) e zera ao ligar de novo.
 */
export interface RelicMechanic<S = Record<string, number>> {
  id: string;
  stat: StatKey;
  init(): S;
  tick?(s: S, v: number, w: RelicWorld, dt: number): void;
  onKill?(s: S, v: number, w: RelicWorld, e: RelicEnemy): void;
  /** `dealt` é o dano que de fato entrou (depois de esquiva, escudo e armadura) */
  onPlayerHit?(s: S, v: number, w: RelicWorld, dealt: number): void;
  onCast?(s: S, v: number, w: RelicWorld): void;
  onLevelUp?(s: S, v: number, w: RelicWorld, levels: number): void;
  /** multiplicador do golpe que o herói dá (todos se multiplicam) */
  damageMult?(s: S, v: number, w: RelicWorld, hit: RelicHit): number;
  /** a recarga do ataque básico é dividida por este número */
  attackSpeedMult?(s: S, v: number, w: RelicWorld): number;
  /** recusa uma cura (Berserker's Oath) */
  blocksHeal?(s: S, v: number, w: RelicWorld): boolean;
  /** come parte do golpe antes da vida; devolve o que sobra */
  absorb?(s: S, v: number, w: RelicWorld, dealt: number): number;
  /** cura que passou da vida máxima */
  overheal?(s: S, v: number, w: RelicWorld, extra: number): void;
  status?(s: S, v: number, w: RelicWorld): RelicStatus | null;
}

type AnyMechanic = RelicMechanic<any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** relic_mechanics.lua MOMENTUM: o bônus enche andando (`momentumRamp` s) e esvazia parado (`momentumFade` s). */
export const MOMENTUM: RelicMechanic<{ m: number }> = {
  id: "momentum", stat: "momentumPct", init: () => ({ m: 0 }),
  tick: (s, v, w, dt) => {
    const m = s.m + (w.moving ? v / RELIC_MECH.momentumRamp : -v / RELIC_MECH.momentumFade) * dt;
    s.m = Math.max(0, Math.min(v, m));
  },
  damageMult: (s) => 1 + s.m,
  status: (s, v) => (s.m > 0.005 ? { id: "momentum", left: s.m, total: v } : null),
};

/** relic_mechanics.lua VITAL SPARK (D-438): cada nível ganho cura uma parte da vida máxima. */
export const LEVEL_HEAL: RelicMechanic<Record<string, never>> = {
  id: "level_heal", stat: "levelHealPct", init: () => ({}),
  onLevelUp: (_s, v, w, levels) => w.heal(w.maxHp * v * levels),
};

/** relic_mechanics.lua BLOOD ENGINE (D-438): cura acima do máximo enche um escudo (até `v` × vida máxima), que come o golpe primeiro. */
export const OVERHEAL_SHIELD: RelicMechanic<{ hp: number }> = {
  id: "overshield", stat: "overhealShield", init: () => ({ hp: 0 }),
  overheal: (s, v, w, extra) => { s.hp = Math.min(w.maxHp * v, s.hp + extra); },
  absorb: (s, _v, _w, dealt) => {
    const a = Math.min(s.hp, dealt);
    s.hp -= a;
    return dealt - a;
  },
  status: (s, v, w) => (s.hp > 0 ? { id: "overshield", left: s.hp, total: w.maxHp * v } : null),
};

/** relic_mechanics.lua CINDER LENS (D-438): quem morre queimando passa a queimadura ao inimigo mais perto. */
export const BURN_SPREAD: RelicMechanic<Record<string, never>> = {
  id: "burn_spread", stat: "burnSpread", init: () => ({}),
  onKill: (_s, _v, w, e) => {
    if (!e.burn || e.burn.left <= 0) return;
    let best: RelicFoe | null = null;
    let bd = px(RELIC_MECH.spreadRadiusPx) ** 2;
    for (const o of w.foes()) {
      if (o.key === e.key) continue;
      const d = (o.x - e.x) ** 2 + (o.z - e.z) ** 2;
      if (d <= bd) {
        best = o;
        bd = d;
      }
    }
    if (!best) return;
    w.burn(best, e.burn.dps, Math.min(RELIC_MECH.spreadMaxTime, e.burn.left));
    w.emit("burn_spread", { x0: e.x, z0: e.z, x: best.x, z: best.z });
  },
};

/** relic_mechanics.lua FROST CROWN (D-438): inimigo com Slow por 3 s seguidos congela por `v` s; espera 4 s para de novo. */
export const FROSTBITE: RelicMechanic<{ t: WeakMap<object, number> }> = {
  id: "frostbite", stat: "frostbite", init: () => ({ t: new WeakMap() }),
  tick: (s, v, w, dt) => {
    for (const e of w.foes()) {
      const cur = s.t.get(e.key);
      if (e.slowed) {
        const t = (cur ?? 0) + dt;
        if (t >= RELIC_MECH.frostbiteAfter && w.stun(e, v)) {
          s.t.set(e.key, -RELIC_MECH.frostbiteCooldown);
          w.emit("frost_deep_chill", { x: e.x, z: e.z });
        } else s.t.set(e.key, t);
      } else if (cur !== undefined) {
        // fora do Slow: zera a contagem, mas a espera depois de congelar continua correndo
        s.t.set(e.key, cur > 0 ? 0 : Math.min(0, cur + dt));
      }
    }
  },
};

/** relic_mechanics.lua GLASS THRONE (D-438): +`v` de dano enquanto o herói não levou golpe nos últimos 5 s. */
export const GLASS_THRONE: RelicMechanic<{ broken: number }> = {
  id: "glass_throne", stat: "untouchedPct", init: () => ({ broken: -1e9 }),
  damageMult: (s, v, w) => (s.broken <= w.time ? 1 + v : 1),
  onPlayerHit: (s, _v, w, dealt) => {
    if (dealt > 0) s.broken = w.time + RELIC_MECH.throneBreak;
  },
  status: (s, _v, w) => {
    const T = RELIC_MECH.throneBreak;
    return { id: "glass_throne", left: s.broken <= w.time ? T : T - (s.broken - w.time), total: T };
  },
};

/** relic_mechanics.lua MANA BATTERY (D-438, D-589): cada spell lançada cura `v` da vida máxima, no mínimo 1. */
export const CAST_HEAL: RelicMechanic<Record<string, never>> = {
  id: "cast_heal", stat: "castHealPct", init: () => ({}),
  onCast: (_s, v, w) => w.heal(Math.max(RELIC_MECH.castHealMin, w.maxHp * v)),
};

/** relic_mechanics.lua `prismSchool`: a escola da vez e quanto falta para trocar. */
export function prismSchool(time: number): { school: string; left: number } {
  const T = RELIC_MECH.prismTime;
  const order = RELIC_MECH.prismOrder;
  const i = ((Math.floor(time / T) % order.length) + order.length) % order.length;
  return { school: order[i], left: T - (((time % T) + T) % T) };
}

/** relic_mechanics.lua PRISM CYCLE (D-433): +`v` de dano na escola da vez (fogo, gelo, raio, arcano; 5 s cada). */
export const PRISM_CYCLE: RelicMechanic<Record<string, never>> = {
  id: "prism_cycle", stat: "prismCycle", init: () => ({}),
  damageMult: (_s, v, w, hit) => (hit.school !== undefined && hit.school === prismSchool(w.time).school ? 1 + v : 1),
  status: (_s, _v, w) => {
    const p = prismSchool(w.time);
    return { id: `prism_${p.school}`, left: p.left, total: RELIC_MECH.prismTime };
  },
};

/**
 * relic_mechanics.lua KILL STREAK (D-433): cada abate soma um (até 10) e dá +3% de velocidade de ataque por acúmulo;
 * a sequência cai sem abate em 2,5 s ou ao levar um golpe.
 */
export const KILL_STREAK: RelicMechanic<{ n: number; left: number }> = {
  id: "kill_streak", stat: "killStreak", init: () => ({ n: 0, left: 0 }),
  tick: (s, _v, _w, dt) => {
    if (s.n <= 0) return;
    s.left -= dt;
    if (s.left <= 0) s.n = 0;
  },
  onKill: (s) => {
    s.n = Math.min(RELIC_MECH.streakMax, s.n + 1);
    s.left = RELIC_MECH.streakWindow;
  },
  onPlayerHit: (s, _v, _w, dealt) => {
    if (dealt > 0) s.n = 0;
  },
  attackSpeedMult: (s) => 1 + RELIC_MECH.streakStep * s.n,
  status: (s) => (s.n > 0 ? { id: "streak", left: s.left, total: RELIC_MECH.streakWindow, count: s.n } : null),
};

/** relic_mechanics.lua LAST RITES (D-433): o campeão que morre explode com `v` da vida máxima dele em volta (90 px). */
export const LAST_RITES: RelicMechanic<Record<string, never>> = {
  id: "last_rites", stat: "lastRites", init: () => ({}),
  onKill: (_s, v, w, e) => {
    if (!e.champion) return;
    const r = px(RELIC_MECH.ritesRadiusPx);
    w.emit("last_rites", { x: e.x, z: e.z, radius: r });
    w.areaHit(e.x, e.z, r, e.maxHp * v, e.key, "last_rites");
  },
};

/** relic_mechanics.lua `hoardBonus`: +1% de dano a cada 100 de ouro guardado, até `v`. */
export function hoardBonus(v: number, gold: number): number {
  return v > 0 ? Math.min(v, Math.floor(Math.max(0, gold) / RELIC_MECH.hoardStep) * 0.01) : 0;
}

/** relic_mechanics.lua HOARDER'S CROWN (D-433): dano pelo ouro guardado (o custo é a loja mais cara, `shopPricePct`). */
export const HOARD: RelicMechanic<Record<string, never>> = {
  id: "hoard", stat: "hoardPct", init: () => ({}),
  damageMult: (_s, v, w) => 1 + hoardBonus(v, w.gold),
  status: (_s, v, w) => {
    const h = hoardBonus(v, w.gold);
    return h > 0 ? { id: "hoard", left: h, total: v } : null;
  },
};

/** relic_mechanics.lua `oathBonus`: `v` de dano a cada 10% de vida perdida (inteiros). */
export function oathBonus(v: number, hp: number, maxHp: number): number {
  if (v <= 0) return 0;
  const missing = 1 - hp / Math.max(1, maxHp);
  return v * Math.floor(Math.max(0, missing) * 10 + 1e-9);
}

/** relic_mechanics.lua BERSERKER'S OATH (D-433): dano pela vida perdida. */
export const OATH: RelicMechanic<Record<string, never>> = {
  id: "oath", stat: "oathPct", init: () => ({}),
  damageMult: (_s, v, w) => 1 + oathBonus(v, w.hp, w.maxHp),
  status: (_s, v, w) => {
    const o = oathBonus(v, w.hp, w.maxHp);
    return o > 0 ? { id: "oath", left: o, total: v * 10 } : null;
  },
};

/** relic_mechanics.lua `blocksHeal` (Berserker's Oath): a cura é recusada enquanto há onda. */
export const NO_COMBAT_HEAL: RelicMechanic<Record<string, never>> = {
  id: "no_combat_heal", stat: "noCombatHeal", init: () => ({}),
  blocksHeal: (_s, _v, w) => w.waveActive,
};

/** As mecânicas de relíquia ligadas pelo atributo; cada lote do M12 põe as dele aqui. */
export const RELIC_MECHANICS: AnyMechanic[] = [MOMENTUM, LEVEL_HEAL, OVERHEAL_SHIELD, BURN_SPREAD, FROSTBITE, GLASS_THRONE,
  CAST_HEAL, PRISM_CYCLE, KILL_STREAK, LAST_RITES, HOARD, OATH, NO_COMBAT_HEAL];

// ---------------------------------------------------------------- escolha de relíquia (relic_system.lua, run_drafts.lua)

/**
 * O sorteio de lá: `u()` é o `rng:random()` (de 0 a 1) e os dois sorteios abaixo são os de `core/rng.lua`, para que
 * a mesma sequência de números dê as mesmas ofertas daqui e de lá.
 */
export type Uniform = () => number;
const luaInt = (u: Uniform, k: number) => Math.floor(u() * k); // `rng:int(1, k)` − 1
function luaWeighted(u: Uniform, w: readonly number[]): number {
  let total = 0;
  for (const x of w) total += x;
  if (total <= 0) return -1;
  let r = u() * total;
  for (let i = 0; i < w.length; i++) {
    r -= w[i];
    if (r < 0) return i;
  }
  return w.length - 1;
}

/** `isDraftable` com o herói: das categorias do sorteio, aberta, que ele não tem nem baniu. */
export function relicDraftPool(run: RunState, open: (id: string) => boolean, stack = true): string[] {
  return RELIC_IDS.filter((id) => (stack ? canGainRelic(run.relics, id) : !run.relics.includes(id)) && !run.bannedRelics.includes(id) && open(id)
    && relicDraftable(id, run.spells));
}

/** `missingSpell` (D-570): a spell para a qual a peça foi feita, quando o herói não tem ela. */
export function relicMissingSpell(run: RunState, d: RelicDef): string | null {
  const need = d.category === "component" ? (d.needs ?? d.spell) : undefined;
  if (!need || run.spells.some((s) => s.id === need)) return null;
  return need;
}

/** build_fit.lua `weight` para relíquia: um elemento que ninguém da build usa sai com 25%. */
function relicFit(run: RunState, d: RelicDef): number {
  const els = elementsOf(d);
  if (els.length === 0) return 1;
  return els.some((el) => hasElement(run, el)) ? 1 : BUILD_FIT.offBuild;
}

/** O peso de uma relíquia dentro da raridade dela (receita × build × peça de spell faltando). */
export function relicDraftWeight(run: RunState, id: string, wanted: Readonly<Record<string, string>> = wantedRelics(run)): number {
  const d = RELICS[id];
  const miss = relicMissingSpell(run, d) ? (run.spells.length >= MAX_SPELLS ? 0 : RELIC_DRAFT.missingSpellWeight) : 1;
  // a cópia de uma que já tem (D7 revista) pesa menos, e não ganha o peso da receita (a receita já está feita)
  const owned = relicCopies(run.relics, id);
  const recipe = wanted[id] && owned === 0 ? RELIC_DRAFT.recipeWeight : 1;
  return recipe * relicFit(run, d) * miss * RELIC_STACK.copyWeight ** owned;
}

/**
 * relic_system.lua `draft` (§40, D-053, D-197, D-309, D-570): `n` relíquias sem repetir na oferta. `stack` falso é o
 * sorteio de lá, sem cópia das que o herói tem (a paridade testa assim). A cada uma, a raridade por
 * 65/30/5 entre as que ainda têm candidata, e dentro dela a relíquia pelo peso (por igual quando todas pesam 1).
 */
export function relicDraft(run: RunState, open: (id: string) => boolean, u: Uniform, n: number = 3, stack = true): string[] {
  const byRarity = new Map<RelicRarity, string[]>();
  for (const id of relicDraftPool(run, open, stack)) {
    const r = RELICS[id].rarity;
    if (!byRarity.has(r)) byRarity.set(r, []);
    byRarity.get(r)!.push(id);
  }
  const wanted = wantedRelics(run);
  // a ordem de lá: as raridades por nome
  const rarities = (Object.keys(RELIC_DRAFT.rarityWeights) as RelicRarity[]).sort();
  const out: string[] = [];
  for (let k = 0; k < n; k++) {
    const live = rarities.filter((r) => (byRarity.get(r)?.length ?? 0) > 0);
    if (!live.length) break;
    const list = byRarity.get(live[luaWeighted(u, live.map((r) => RELIC_DRAFT.rarityWeights[r]!))])!;
    const w = list.map((id) => relicDraftWeight(run, id, wanted));
    const idx = w.some((x) => x !== 1) ? luaWeighted(u, w) : luaInt(u, list.length);
    if (idx < 0) break; // todas pesam 0
    out.push(list.splice(idx, 1)[0]);
  }
  return out;
}

/**
 * relic_system.lua `poolDraft` (D-150/D-151, D-179): `n` exclusivas do pool, por igual, das abertas que o herói não
 * tem nem baniu; se o pool acabar, completa com raras e épicas do sorteio normal.
 */
export function poolRelicDraft(run: RunState, pool: RelicPool, open: (id: string) => boolean, n: number, u: Uniform): string[] {
  const list = RELIC_IDS.filter((id) => RELICS[id].pool === pool && !run.relics.includes(id) && !run.bannedRelics.includes(id) && open(id));
  const out: string[] = [];
  for (let i = 0, k = Math.min(n, list.length); i < k; i++) out.push(list.splice(luaInt(u, list.length), 1)[0]);
  if (out.length < n) {
    const extra = relicDraftPool(run, open).filter((id) => RELICS[id].rarity === "rare" || RELICS[id].rarity === "epic");
    while (out.length < n && extra.length) out.push(extra.splice(luaInt(u, extra.length), 1)[0]);
  }
  return out;
}

/**
 * bosses/boss_rewards.lua `draft` (§67, B4): no máximo UMA premium (chance `premiumChance`), a da build do chefe
 * antes, senão uma universal; o resto vem do sorteio normal (`draw(k)`, depois da premium, como lá).
 */
export function bossRelicOffer(owned: readonly string[], relicBuild: string | undefined, draw: (k: number) => string[],
  choices: number, u: Uniform, premiumChance: number): { offer: string[]; premium: string | null } {
  let premium: string | null = null;
  if (u() < premiumChance) {
    const specific: string[] = [];
    const universal: string[] = [];
    for (const id of RELIC_IDS) {
      if (owned.includes(id)) continue;
      const d = RELICS[id];
      if (d.category === "boss_build" && relicBuild && d.bossBuild === relicBuild) specific.push(id);
      else if (d.category === "boss") universal.push(id);
    }
    const pool = specific.length ? specific : universal;
    if (pool.length) premium = pool[luaInt(u, pool.length)];
  }
  const normal = draw(premium ? choices - 1 : choices);
  return { offer: premium ? [premium, ...normal] : normal, premium };
}

/** relic_system.lua `bansLeft` (D-148): quantas relíquias ainda se bane nesta partida (a vantagem das Depths soma). */
export function relicBansLeft(run: RunState, extraBans = perkExtraBans(run)): number {
  return RELIC_DRAFT.banLimit + extraBans - run.bannedRelics.length;
}

/** relic_system.lua `ban`: tira a relíquia de todo sorteio futuro. Devolve se baniu. */
export function banRelic(run: RunState, id: string, extraBans = perkExtraBans(run)): boolean {
  if (relicBansLeft(run, extraBans) <= 0 || run.bannedRelics.includes(id)) return false;
  run.bannedRelics.push(id);
  return true;
}

/**
 * run_drafts.lua `banRelic` (D-148): bane a oferta `index` e põe no lugar a primeira de um sorteio novo da mesma
 * fonte (`draw(8)`) que ainda não está na escolha; sem nenhuma, a oferta sai. Devolve a escolha nova, ou null.
 */
export function banRelicChoice(run: RunState, choices: readonly string[], index: number, draw: (k: number) => string[],
  extraBans = perkExtraBans(run)): string[] | null {
  const id = choices[index];
  if (!id || !banRelic(run, id, extraBans)) return null;
  const repl = draw(RELIC_DRAFT.replaceDraw).find((c) => !choices.includes(c));
  const out = [...choices];
  if (repl) out[index] = repl;
  else out.splice(index, 1);
  return out;
}

/** O despacho dos ganchos: o jogo chama `refresh` ao recalcular os atributos e os métodos nos pontos de evento. */
export class RelicHooks {
  private active: { m: AnyMechanic; v: number; s: unknown }[] = [];

  constructor(private readonly mechanics: readonly AnyMechanic[] = RELIC_MECHANICS) {}

  /** Liga e desliga as mecânicas pela soma dos atributos; a que segue ligada mantém o estado. */
  refresh(totals: StatBlock): void {
    const prev = new Map(this.active.map((a) => [a.m.id, a]));
    this.active = [];
    for (const m of this.mechanics) {
      const v = totals[m.stat] ?? 0;
      if (v <= 0) continue;
      const old = prev.get(m.id);
      this.active.push({ m, v, s: old ? old.s : m.init() });
    }
  }

  /** zera o estado de todas (partida nova) */
  reset(): void {
    for (const a of this.active) a.s = a.m.init();
  }

  get ids(): string[] {
    return this.active.map((a) => a.m.id);
  }

  tick(w: RelicWorld, dt: number): void {
    for (const a of this.active) a.m.tick?.(a.s, a.v, w, dt);
  }

  onKill(w: RelicWorld, e: RelicEnemy): void {
    for (const a of this.active) a.m.onKill?.(a.s, a.v, w, e);
  }

  onPlayerHit(w: RelicWorld, dealt: number): void {
    for (const a of this.active) a.m.onPlayerHit?.(a.s, a.v, w, dealt);
  }

  onCast(w: RelicWorld): void {
    for (const a of this.active) a.m.onCast?.(a.s, a.v, w);
  }

  onLevelUp(w: RelicWorld, levels: number): void {
    if (levels <= 0) return;
    for (const a of this.active) a.m.onLevelUp?.(a.s, a.v, w, levels);
  }

  damageMult(w: RelicWorld, hit: RelicHit): number {
    let m = 1;
    for (const a of this.active) if (a.m.damageMult) m *= a.m.damageMult(a.s, a.v, w, hit);
    return m;
  }

  attackSpeedMult(w: RelicWorld): number {
    let m = 1;
    for (const a of this.active) if (a.m.attackSpeedMult) m *= a.m.attackSpeedMult(a.s, a.v, w);
    return m;
  }

  blocksHeal(w: RelicWorld): boolean {
    return this.active.some((a) => a.m.blocksHeal?.(a.s, a.v, w) === true);
  }

  absorb(w: RelicWorld, dealt: number): number {
    for (const a of this.active) {
      if (dealt <= 0) break;
      if (a.m.absorb) dealt = a.m.absorb(a.s, a.v, w, dealt);
    }
    return dealt;
  }

  overheal(w: RelicWorld, extra: number): void {
    if (extra <= 0) return;
    for (const a of this.active) a.m.overheal?.(a.s, a.v, w, extra);
  }

  statuses(w: RelicWorld): RelicStatus[] {
    const out: RelicStatus[] = [];
    for (const a of this.active) {
      const st = a.m.status?.(a.s, a.v, w);
      if (st) out.push(st);
    }
    return out;
  }
}

// ---------------------------------------------------------------- evolução de relíquia (relic_system.lua §§45-47, M12-08)

/** relic_system.lua `ownedGroups`: os grupos exclusivos já tomados por uma relíquia de nível 3 do herói (grupo → id). */
export function ownedRelicGroups(relics: readonly string[]): Record<string, string> {
  const g: Record<string, string> = {};
  for (const id of relics) {
    const d = relicDef(id);
    if (d?.exclusiveGroup) g[d.exclusiveGroup] = id;
  }
  return g;
}

export type RelicEvolveBlock = "owned" | "missing" | "exclusive";

/** relic_system.lua `canEvolve`: null quando pode, ou o motivo ("owned", "missing", "exclusive"). */
export function relicEvolveBlock(relics: readonly string[], evoId: string): RelicEvolveBlock | null {
  const d = relicDef(evoId);
  if (!d?.requires) throw new Error(`not a relic evolution: ${evoId}`);
  if (relics.includes(evoId)) return "owned";
  if (d.requires.some((c) => !relics.includes(c))) return "missing";
  if (d.exclusiveGroup && ownedRelicGroups(relics)[d.exclusiveGroup]) return "exclusive";
  return null;
}

/** relic_system.lua `availableEvolutions`: as evoluções que a coleção de agora fecha, na ordem de relics.lua. */
export function availableRelicEvolutions(relics: readonly string[]): string[] {
  return RELIC_EVOLUTIONS.filter((d) => relicEvolveBlock(relics, d.id) === null).map((d) => d.id);
}

/**
 * run_drafts.lua `offerRelicEvolution`: até 3 evoluções prontas que não foram recusadas com esta mesma coleção
 * (`relicVersion`); mais de 3 sorteia como `RNG:sample` de lá (embaralha uma cópia e pega as 3 primeiras).
 */
export function pendingRelicEvolutionOffer(run: RunState, shuffle: (a: string[]) => string[]): string[] | null {
  const list = availableRelicEvolutions(run.relics).filter((id) => run.relicEvoDeclined[id] !== run.relicVersion);
  if (!list.length) return null;
  return list.length > 3 ? shuffle([...list]).slice(0, 3) : list;
}

/** relic_system.lua `evolve`: as peças são consumidas (A + B → C), as tags delas saem e entram as da evoluída (§45). */
export function evolveRelic(run: RunState, evoId: string): void {
  const why = relicEvolveBlock(run.relics, evoId);
  if (why) throw new Error(`cannot evolve ${evoId}: ${why}`);
  for (const c of RELICS[evoId].requires!) removeRelic(run, c);
  grantRelic(run, evoId);
  run.relicEvolutionsDone += 1;
}

/** run_drafts.lua `skipRelicEvolution`: recusa as opções até a coleção de relíquias mudar. */
export function declineRelicEvolutions(run: RunState, ids: readonly string[]): void {
  for (const id of ids) run.relicEvoDeclined[id] = run.relicVersion;
}

/** As evoluções que usam esta relíquia como peça (para mostrar a receita na carta e na tela I). */
export function relicEvolutionsUsing(id: string): RelicDef[] {
  return RELIC_EVOLUTIONS.filter((d) => d.requires!.includes(id));
}

/** As outras relíquias do mesmo grupo exclusivo, que esta de nível 3 bloqueia (§47). */
export function relicGroupRivals(evoId: string): RelicDef[] {
  const g = relicDef(evoId)?.exclusiveGroup;
  return g ? RELIC_EVOLUTIONS.filter((d) => d.exclusiveGroup === g && d.id !== evoId) : [];
}
