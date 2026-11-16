// Subir de nível como no Dungeon Reign (marco M20-03): progression/xp.lua, progression/level_up.lua e
// build/build_fit.lua. Lógica pura sobre a partida; o jogo chama `addXp` ao ganhar XP e, no fim da onda, sorteia as
// cartas com `draft` e `draftTiers` no fluxo `levelup` e aplica a escolhida com `applyUpgrade`.
import type { Rng } from "./rng";
import type { RunState } from "./run";
import type { StatBlock } from "./stats";
import { LEVEL_UP_CHOICES, LEVELUP_REROLL, UPGRADE_TIER_WEIGHTS, UPGRADE_TIERS, XP_GROWTH } from "../data/run";
import {
  BUILD_FIT, COUNT_STATS, PCT_STATS, UPGRADE_BY_ID, UPGRADE_CAPS, UPGRADE_STAT, UPGRADES,
  type UpgradeDef, type UpgradeEffect,
} from "../data/upgrades";
import { SPELL_SCHOOL } from "../data/spells";
import { TECHNIQUES } from "../data/techniques";

export type UpgradeTier = keyof typeof UPGRADE_TIERS;
export const TIER_ORDER: readonly UpgradeTier[] = ["common", "rare", "epic"];

/**
 * xp.lua `addXp`: aplica o multiplicador de XP uma vez e faz no máximo UMA passagem de nível por chamada (o resto
 * passa na próxima). Devolve true se subiu.
 */
export function addXp(run: RunState, amount: number, xpMult: number): boolean {
  const gained = Math.floor(amount * xpMult);
  run.xp += gained;
  run.statistics.xpEarned += gained;
  if (run.xp >= run.xpToNext) {
    run.xp -= run.xpToNext;
    run.level++;
    run.xpToNext = Math.floor(run.xpToNext * XP_GROWTH);
    run.pendingLevelUps++;
    return true;
  }
  return false;
}

/** Soma de um atributo de lá entre as melhorias pegas (`Stats:rawCount`; contagens nunca mudam com a raridade). */
export function rawCount(run: RunState, stat: string): number {
  let s = 0;
  run.upgradesTaken.forEach((id, i) => {
    const u = UPGRADE_BY_ID[id];
    if (!u) return;
    for (const e of effectsFor(u, run.upgradeTiers[i])) if (e.stat === stat) s += e.value;
  });
  return s;
}

/** A melhoria só tem efeito aqui se todos os atributos dela já existem no jogo (`UPGRADE_STAT`). */
export function upgradeLive(u: UpgradeDef): boolean {
  return u.effects.every((e) => UPGRADE_STAT[e.stat] !== undefined);
}

/** build_fit.lua `offered`: a exclusiva de outro herói, ou uma fechada a este, nunca sai. */
export function offered(run: RunState, u: UpgradeDef): boolean {
  if (u.hero && u.hero !== run.heroId) return false;
  if (u.notFor?.[run.heroId]) return false;
  return true;
}

/** level_up.lua `isAvailable` (§17): tetos, Cone Shot exigido, herói, onda mínima, caminhos exclusivos e únicas. */
export function isAvailable(run: RunState, u: UpgradeDef): boolean {
  for (const e of u.effects) {
    const cap = UPGRADE_CAPS[e.stat];
    if (e.value > 0 && cap !== undefined && rawCount(run, e.stat) >= cap) return false;
  }
  if (u.requiresConeShot && rawCount(run, "coneShot") < u.requiresConeShot) return false;
  if (!offered(run, u)) return false;
  if (u.minWave && (run.wave || 1) < u.minWave) return false;
  if (u.excludes && run.upgradesTaken.includes(u.excludes)) return false;
  if (u.unique && run.upgradesTaken.includes(u.id)) return false;
  return true;
}

/** As melhorias que podem sair agora. `liveOnly` tira as que ainda não têm efeito no jogo. */
export function availablePool(run: RunState, liveOnly = true): UpgradeDef[] {
  return UPGRADES.filter((u) => isAvailable(run, u) && (!liveOnly || upgradeLive(u)));
}

/** build_fit.lua `hasElement`: a build usa o elemento (spell ou técnica dessa escola, ou pontos de tag nele). */
export function hasElement(run: RunState, el: string): boolean {
  if ((run.tags[el] ?? 0) > 0) return true;
  if (TECHNIQUES[run.technique.id as keyof typeof TECHNIQUES]?.school === el) return true;
  return run.spells.some((s) => SPELL_SCHOOL[s.id as keyof typeof SPELL_SCHOOL] === el);
}

/** build_fit.lua `elementsOf`: elementos que a melhoria empurra (efeito positivo de elemento, ou tag de elemento). */
export function elementsOf(u: UpgradeDef): string[] {
  const out: string[] = [];
  for (const e of u.effects) {
    for (const [el, stat] of Object.entries(BUILD_FIT.elements)) if (e.stat === stat && e.value > 0) out.push(el);
  }
  if (out.length === 0) for (const t of u.tags) if (BUILD_FIT.elements[t]) out.push(t);
  return out;
}

/** build_fit.lua `weight`: peso no sorteio; um elemento que ninguém na build usa sai com 25%. */
export function fitWeight(run: RunState, u: UpgradeDef): number {
  if (!offered(run, u)) return 0;
  const els = elementsOf(u);
  const w = u.weight ?? 1;
  if (els.length === 0) return w;
  return els.some((el) => hasElement(run, el)) ? w : w * BUILD_FIT.offBuild;
}

/** level_up.lua `draft`: n melhorias distintas, sorteadas pelo peso, sem repetir. */
export function draft(run: RunState, rng: Rng, n: number = LEVEL_UP_CHOICES, liveOnly = true): string[] {
  const entries = availablePool(run, liveOnly).map((u) => ({ u, w: fitWeight(run, u) }));
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const total = entries.reduce((s, e) => s + e.w, 0);
    if (total <= 0) break;
    const pick = rng.weighted(entries.map((e) => [e, e.w] as const));
    ids.push(pick.u.id);
    entries.splice(entries.indexOf(pick), 1);
  }
  return ids;
}

/** level_up.lua `canTier`: muda de raridade se tiver uma parte positiva que não seja contagem. */
export function canTier(u: UpgradeDef): boolean {
  if (u.noTier) return false;
  return u.effects.some((e) => e.value > 0 && !COUNT_STATS[e.stat]);
}

/** Pesos da raridade no nível: +1 ponto de épica, tirado da comum, a cada 5 níveis (`rollTier`). */
export function tierWeights(level: number, minTier?: "rare"): [UpgradeTier, number][] {
  const bonus = Math.floor(((level || 1) - 1) / 5);
  const w = UPGRADE_TIER_WEIGHTS;
  if (minTier === "rare") return [["rare", w.rare + w.common - bonus], ["epic", w.epic + bonus]];
  return [["common", w.common - bonus], ["rare", w.rare], ["epic", w.epic + bonus]];
}

/** level_up.lua `rollTier`. */
export function rollTier(run: RunState, rng: Rng, u: UpgradeDef): UpgradeTier {
  if (!canTier(u)) return "common";
  return rng.weighted(tierWeights(run.level, u.minTier));
}

export function draftTiers(run: RunState, rng: Rng, ids: string[]): UpgradeTier[] {
  return ids.map((id) => rollTier(run, rng, UPGRADE_BY_ID[id]));
}

function roundFor(stat: string, v: number): number {
  if (PCT_STATS[stat]) return Math.floor(v * 1000 + 0.5) / 1000;
  return Math.floor(v * 10 + 0.5) / 10;
}

/** level_up.lua `effectsFor`: só as partes positivas que não são contagem crescem com a raridade (o custo fica). */
export function effectsFor(u: UpgradeDef, tier: UpgradeTier = "common"): UpgradeEffect[] {
  const m = UPGRADE_TIERS[tier] ?? 1;
  if (m === 1) return u.effects;
  return u.effects.map((e) => (e.value > 0 && !COUNT_STATS[e.stat] ? { stat: e.stat, value: roundFor(e.stat, e.value * m) } : e));
}

/** level_up.lua `rerollCost`: trocar as 3 cartas custa 20 + 5 × nível. */
export function rerollCost(run: RunState): number {
  return Math.floor(LEVELUP_REROLL.base + LEVELUP_REROLL.perLevel * (run.level || 1));
}

/** level_up.lua `rerollsLeft`: trocas que sobram neste nível. */
export function rerollsLeft(uses: number): number {
  return Math.max(0, LEVELUP_REROLL.limit - (uses || 0));
}

/** level_up.lua `apply`: grava a melhoria, a raridade e as tags, e gasta um nível pendente. */
export function applyUpgrade(run: RunState, id: string, tier: UpgradeTier): UpgradeDef {
  const u = UPGRADE_BY_ID[id];
  if (!u) throw new Error(`unknown upgrade: ${id}`);
  if (!isAvailable(run, u)) throw new Error(`unavailable upgrade: ${id}`);
  const t = canTier(u) ? tier : "common";
  run.upgradesTaken.push(id);
  run.upgradeTiers.push(t);
  for (const tag of u.tags) run.tags[tag] = (run.tags[tag] ?? 0) + 1;
  if (run.pendingLevelUps > 0) run.pendingLevelUps--;
  return u;
}

/** As melhorias pegas como atributos daqui (soma; os de lá sem equivalente ficam de fora). */
export function upgradeStats(run: RunState): StatBlock {
  const out: StatBlock = {};
  run.upgradesTaken.forEach((id, i) => {
    const u = UPGRADE_BY_ID[id];
    if (!u) return;
    for (const e of effectsFor(u, run.upgradeTiers[i])) {
      const m = UPGRADE_STAT[e.stat];
      if (m) out[m.key] = (out[m.key] ?? 0) + e.value * m.scale;
    }
  });
  return out;
}
