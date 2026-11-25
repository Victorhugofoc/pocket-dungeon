// M17-01: as decisões do bot que joga partidas (porta de `tools/sim_bot.lua` do Dungeon Reign).
// Lógica pura: recebe a partida e as opções da tela, devolve o índice escolhido. O laço que chama
// estas funções (e a pilotagem em combate) fica no modo simulação do jogo.

import type { RunState } from "./run";
import type { MapCard } from "./runmap";
import type { ShopOffer } from "./shop";
import { effectsFor, type UpgradeTier } from "./levelup";
import { tagThresholds } from "./synergies";
import { eventAvailable } from "./events";
import { UPGRADE_BY_ID, UPGRADE_STAT } from "../data/upgrades";
import { RELICS, RELIC_EVOLUTIONS } from "../data/relics";
import { ROOM_BY_ID } from "../data/rooms";
import { HEROES } from "../data/heroes";
import {
  BOT_COMMON, BOT_EVENT, BOT_EVENT_PRIORITY, BOT_MAP, BOT_MAP_PRIORITY, BOT_PROFILE, BOT_SCHOOL, BOT_SHOP,
  BOT_START, BOT_TAG, BOT_TYPICAL, BOT_UNKNOWN_WEIGHT,
} from "../data/simbot";

/** O que o bot enxerga da partida: o estado salvo e a vida do herói (que o `RunState` só guarda no checkpoint). */
export interface BotView {
  run: RunState;
  hp: number;
  maxHp: number;
  /** sorteio uniforme em [0, 1) para desempatar */
  rand: () => number;
}

export function botSchool(hero: string): string {
  return BOT_SCHOOL[hero] ?? "auto";
}

/** A spell inicial do simulador, se o herói puder começar com ela; senão a primeira dele. */
export function botStartSpell(hero: string): string {
  const list = HEROES[hero]?.startingSpells ?? [];
  const want = BOT_START[hero];
  return want && (list as readonly string[]).includes(want) ? want : list[0] ?? want;
}

// atributo daqui → nome de lá, para pesar as relíquias com a mesma tabela das melhorias
let ourToLua: Record<string, { stat: string; scale: number }> | null = null;
function luaStat(key: string): { stat: string; scale: number } {
  if (!ourToLua) {
    ourToLua = {};
    for (const [stat, m] of Object.entries(UPGRADE_STAT)) ourToLua[m.key] ??= { stat, scale: m.scale };
  }
  return ourToLua[key] ?? { stat: key, scale: 1 };
}

/** `effectScore`: soma peso × valor normalizado; os efeitos usam os nomes de lá. */
export function effectScore(hero: string, effects: readonly { stat: string; value: number }[]): number {
  const prof = BOT_PROFILE[botSchool(hero)] ?? {};
  let s = 0;
  for (const e of effects) {
    const w = prof[e.stat] ?? BOT_COMMON[e.stat] ?? BOT_UNKNOWN_WEIGHT;
    const typical = BOT_TYPICAL[e.stat];
    s += w * (typical ? e.value / typical : e.value * 10);
  }
  return s;
}

/** Os efeitos de uma relíquia daqui com os nomes e o sinal de lá (recarga negativa = mais rápida). */
export function relicLuaEffects(id: string): { stat: string; value: number }[] {
  return (RELICS[id]?.effects ?? []).map((e) => {
    const m = luaStat(e.stat);
    return { stat: m.stat, value: e.value * m.scale };
  });
}

/** `tagScore`: a escola do herói, "magic" para quem conjura, sobrevivência, e tags que fecham um limiar. */
export function tagScore(hero: string, tags: readonly string[], run: RunState | null): number {
  const sch = botSchool(hero);
  const th = tagThresholds();
  let s = 0;
  for (const t of tags) {
    if (run) {
      const c = run.tags[t] ?? 0;
      const nxt = th[t]?.find((x) => x.n > c);
      // `nxt.evolution` de lá: a evolução de build de 8 pontos não conta
      if (nxt && nxt.id !== null && nxt.n - c <= BOT_TAG.nearThreshold) {
        s += (t === sch ? BOT_TAG.nearOwnSchool : BOT_TAG.nearOther) / (nxt.n - c);
      }
    }
    if (t === sch) s += BOT_TAG.school;
    if (t === "magic" && sch !== "auto") s += BOT_TAG.magic;
    if (t === "survival" || t === "sustain") s += BOT_TAG.survival;
  }
  return s;
}

function argmax<T>(list: readonly T[], score: (x: T, i: number) => number): number {
  let best = 0;
  let bestS = -Infinity;
  list.forEach((x, i) => {
    const s = score(x, i);
    if (s > bestS) {
      best = i;
      bestS = s;
    }
  });
  return best;
}

/** Os pontos de uma carta de nível, sem o desempate; Vitality com a vida baixa vale mais. */
export function upgradeScore(v: BotView, hero: string, id: string, tier: UpgradeTier = "common"): number {
  const u = UPGRADE_BY_ID[id];
  if (!u) return -Infinity;
  let s = effectScore(hero, effectsFor(u, tier)) + tagScore(hero, u.tags, v.run);
  if (u.fullHeal && v.hp / v.maxHp < BOT_TAG.fullHealBelow) s += BOT_TAG.fullHealBonus;
  return s;
}

/** `pickUpgrade`: a carta de nível que mais combina. */
export function pickUpgrade(v: BotView, hero: string, ids: readonly string[], tiers: readonly UpgradeTier[] = []): number {
  return argmax(ids, (id, i) => upgradeScore(v, hero, id, tiers[i]) + v.rand() * BOT_TAG.jitter);
}

/** Quantas receitas de evolução de relíquia esta relíquia fecharia. */
function recipesClosed(owned: readonly string[], id: string): number {
  let n = 0;
  for (const evo of RELIC_EVOLUTIONS) {
    const req = evo.requires ?? [];
    if (req.every((r) => r === id || owned.includes(r))) n++;
  }
  return n;
}

export function relicScore(v: BotView, hero: string, id: string): number {
  const def = RELICS[id];
  if (!def) return -Infinity;
  return effectScore(hero, relicLuaEffects(id)) + tagScore(hero, def.tags, v.run);
}

/** Os pontos de uma relíquia na escolha, sem o desempate: fechar uma receita de evolução vale mais. */
export function relicPickScore(v: BotView, hero: string, id: string): number {
  return relicScore(v, hero, id) + recipesClosed(v.run.relics, id) * BOT_TAG.recipeBonus;
}

/** `pickRelic`: a relíquia que mais combina. */
export function pickRelic(v: BotView, hero: string, ids: readonly string[]): number {
  return argmax(ids, (id) => relicPickScore(v, hero, id) + v.rand() * BOT_TAG.jitter);
}

/** `pickMap`: loja, santuário e eventos primeiro; sala perigosa perde pontos, recompensa e poças ganham. */
export function pickMap(v: BotView, cards: readonly MapCard[]): number {
  return argmax(cards, (c) => {
    let s = BOT_MAP_PRIORITY[c.node] ?? 0;
    if (c.node === "shop" && v.run.gold < BOT_MAP.shopPoorGold) s = BOT_MAP.shopPoorScore;
    const def = c.room ? ROOM_BY_ID[c.room] : undefined;
    if (def) {
      const m = def.mods;
      s -= ((m.enemyHp ?? 1) * (m.enemyDamage ?? 1) * (m.enemyCount ?? 1) - 1) * BOT_MAP.dangerWeight;
      s += ((m.reward ?? 1) - 1) * BOT_MAP.rewardWeight;
      if (def.pools) s += BOT_MAP.poolsBonus;
    }
    return s;
  });
}

/** `pickEvent`: pela prioridade, recusa o que custa vida quando ela está baixa e cura quando precisa. */
export function pickEvent(v: BotView, hero: string, ids: readonly string[]): number {
  const hpPct = v.hp / v.maxHp;
  return argmax(ids, (id) => {
    let s = BOT_EVENT_PRIORITY[id] ?? 0;
    if (id === "infernal_deal" && botSchool(hero) !== "auto") s = BOT_EVENT.infernalForCasters;
    if (BOT_EVENT.costly.includes(id) && hpPct < BOT_EVENT.costlyHp) s = BOT_EVENT.costlyScore;
    if (BOT_EVENT.heals.includes(id) && hpPct < BOT_EVENT.healHp) s = BOT_EVENT.healScore;
    if (!eventAvailable(v.run, id)) s = BOT_EVENT.unavailable;
    return s;
  });
}

/** Os pontos de uma oferta da loja (`shop` de lá). */
export function shopOfferScore(v: BotView, hero: string, o: ShopOffer): number {
  const main = v.run.spells[0]?.id;
  switch (o.kind) {
    case "spell_upgrade":
      if (o.spell && v.run.technique?.id === o.spell) return BOT_SHOP.upgradeTechnique;
      return o.spell === main ? BOT_SHOP.upgradeMain : BOT_SHOP.upgradeOther;
    case "new_spell":
      if (o.spell === "healing_field") return BOT_SHOP.healingField;
      return v.run.spells.length < 2 ? BOT_SHOP.newSpellFirst : BOT_SHOP.newSpellMore;
    case "spell_modifier":
      return o.spell === main ? BOT_SHOP.modifierMain : BOT_SHOP.modifierOther;
    case "vitality":
      return v.hp / v.maxHp < BOT_SHOP.vitalityHp ? BOT_SHOP.vitalityLow : BOT_SHOP.vitality;
    case "sharpened_weapon":
      return botSchool(hero) === "auto" ? BOT_SHOP.sharpenedAuto : BOT_SHOP.sharpened;
    case "relic":
      return BOT_SHOP.relicBase + Math.min(BOT_SHOP.relicMax, relicScore(v, hero, o.relic ?? "") * BOT_SHOP.relicScale);
    default:
      return 0;
  }
}

/** A ordem de compra: todas as ofertas, da mais valiosa para a menos (a compra sem ouro só falha). */
export function shopOrder(v: BotView, hero: string, offers: readonly ShopOffer[]): number[] {
  return offers
    .map((o, i) => ({ i, s: o.bought ? -Infinity : shopOfferScore(v, hero, o) }))
    .filter((x) => x.s > -Infinity)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.i);
}

/** Troca a loja enquanto o ouro cobre a troca e ainda sobra a reserva, até `maxRerolls` por visita. */
export function shouldReroll(gold: number, cost: number, rerollsDone: number): boolean {
  return rerollsDone < BOT_SHOP.maxRerolls && gold >= cost + BOT_SHOP.rerollReserve;
}
