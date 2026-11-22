// Motor de relíquias (relic_system.lua `grant`, `devRemove`; relic_mechanics.lua). Lógica pura, sem three.js.
// - Posse: dar e tirar relíquia mexe em `run.relics`, nas tags de build (`run.tags`) e em `run.relicVersion`.
// - Atributos: cada relíquia é uma fonte de `computeStats` (a soma dos `effects`).
// - Spell: o `spellEffect` das relíquias de spell entra nos números da spell equipada (spell_stats.lua `collect`).
// - Ganchos: as relíquias que mudam o jogo (não só somam atributo) são mecânicas ligadas por um atributo próprio,
//   como em relic_mechanics.lua; o jogo chama `RelicHooks` nos pontos de evento (quadro, abate, golpe sofrido,
//   conjuração, nível, dano causado, cura) e elas respondem pelo `RelicWorld`.
import { RELIC_MECH, RELICS, type RelicDef } from "../data/relics";
import type { SpellEffect } from "../data/spells";
import type { StatBlock, StatKey } from "./stats";
import type { RunState } from "./run";

export function relicDef(id: string): RelicDef | undefined {
  return Object.prototype.hasOwnProperty.call(RELICS, id) ? RELICS[id] : undefined;
}

function addTags(run: RunState, def: RelicDef, sign: 1 | -1): void {
  for (const t of def.tags) run.tags[t] = Math.max(0, (run.tags[t] ?? 0) + sign);
}

/** relic_system.lua `grant`: relíquia única por id; soma as tags e muda `relicVersion`. Devolve se entrou. */
export function grantRelic(run: RunState, id: string): boolean {
  const def = relicDef(id);
  if (!def) throw new Error(`unknown relic ${id}`);
  if (run.relics.includes(id)) return false;
  run.relics.push(id);
  addTags(run, def, 1);
  run.relicVersion += 1;
  return true;
}

/** relic_system.lua `devRemove` (e o consumo dos componentes na evolução de relíquia, `M12-08`). */
export function removeRelic(run: RunState, id: string): boolean {
  const i = run.relics.indexOf(id);
  if (i < 0) return false;
  run.relics.splice(i, 1);
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

/** relic_system.lua `isDraftable` (D-050): relíquia de spell (§43) só entra no sorteio com a spell dela equipada. */
export function relicDraftable(id: string, spells: readonly { id: string }[]): boolean {
  const d = relicDef(id);
  if (!d) return false;
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
  /** aviso para efeito e som (o nome é o do evento de lá, como `burn_spread`) */
  emit(event: string, data?: Record<string, unknown>): void;
}

/** O inimigo como as mecânicas o veem. */
export interface RelicEnemy {
  x: number;
  z: number;
  maxHp: number;
  champion: boolean;
  boss: boolean;
}

/** O golpe que o herói dá (`Damage.toEnemy` `info`). */
export interface RelicHit {
  /** `auto`, `dot`, `other`, ou a spell/escola quando houver */
  source: string;
  boss: boolean;
}

/** Um ícone da fileira de estados do herói (relic_mechanics.lua `statuses`). */
export interface RelicStatus {
  id: string;
  left: number;
  total: number;
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

/** As mecânicas de relíquia ligadas pelo atributo; cada lote do M12 põe as dele aqui. */
export const RELIC_MECHANICS: AnyMechanic[] = [MOMENTUM, LEVEL_HEAL, OVERHEAL_SHIELD];

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
