// Magic Shop (M7-03): porta de dungeon-idle/src/shop/shop_system.lua (§§72-77). Lógica pura: nível da loja,
// sorteio das ofertas (uma vez por visita), preços, ofertas que ficam inválidas depois de outras compras, compra e
// troca de ofertas. A tela só mostra as ofertas e repassa a compra (M7-04). Sorteios no fluxo `shop` da seed.
//
// A técnica (`run.technique`, o `spells[0]` de lá) também sobe de nível na loja (S19, D-252); nível 5 = evolução.
// Ainda não entram (como no roadmap): Hoarder's Crown e Depths
// (`priceMult`, `offerCount`), trocas grátis e a relíquia de encomenda (`M12`, `M13`). A relíquia da 4ª oferta sai
// por igual da lista que o jogo passa; o sorteio por raridade de `relic_system.lua` chega com as relíquias (`M12`).
import type { RunState } from "./run";
import type { StatBlock } from "./stats";
import { addModifier, addSpell, levelUpSpell } from "./spells";
import { newSpellSlot } from "./run";
import { MAX_SPELLS, SPELL_MAX_LEVEL, SPELL_ORDER, SPELLS, modifierDef, type SpellEffect, type SpellId } from "../data/spells";
import { RELICS } from "../data/relics";
import {
  SHOP_CATEGORIES, SHOP_GENERAL, SHOP_ITEMS, SHOP_MODIFIER, SHOP_OFFERS, SHOP_REASONS, SHOP_RELIC, SHOP_REROLL, SHOP_SPELL,
  shopLevel, type GeneralKind, type ShopCategory,
} from "../data/shop";

/** O que a loja guarda na partida (`Shop.state`). */
export interface ShopState {
  purchases: number;
  byType: Record<GeneralKind, number>;
  modifierPurchases: number;
  /** compras de spell (melhoria, spell nova, modificador): só elas sobem o preço das spells (D-172) */
  spellPurchases: number;
  relicPurchases: number;
  visits: number;
  history: { kind: OfferKind; spell?: string; modifier?: string; relic?: string; cost: number; wave: number }[];
}

export function newShopState(): ShopState {
  return {
    purchases: 0, byType: { sharpened_weapon: 0, vitality: 0, arcane_tome: 0 }, modifierPurchases: 0, spellPurchases: 0,
    relicPurchases: 0, visits: 0, history: [],
  };
}

export type OfferKind = ShopCategory | "relic";

export interface ShopOffer {
  kind: OfferKind;
  spell?: string;
  modifier?: string;
  relic?: string;
  bought: boolean;
  /** quanto foi pago, depois de comprada */
  paid?: number;
}

export interface ShopVisit {
  /** nível da loja (`S.level` da onda) */
  level: number;
  wave: number;
  offers: ShopOffer[];
  rerolls: number;
  /** quantas ofertas fora a relíquia (a troca mantém o tamanho da visita) */
  size: number;
}

/** O sorteio da loja: o mesmo formato do fluxo da seed (`Rng`) e do sorteio roteirizado dos testes. */
export interface ShopRng {
  pick<T>(arr: readonly T[]): T;
}

const GENERAL_KINDS: Readonly<Record<string, true>> = { sharpened_weapon: true, vitality: true, arcane_tome: true };
const isGeneral = (k: OfferKind): k is GeneralKind => GENERAL_KINDS[k] === true;

const RARITY_KEY = { incomum: "uncommon", raro: "rare", epico: "epic" } as const;

// ---------------------------------------------------------------- preços

/** `Shop.generalCost`: só o nível da loja e as compras do mesmo item sobem o preço (D-183). */
export function generalCost(shop: ShopState, kind: GeneralKind, level: number): number {
  const G = SHOP_GENERAL;
  return Math.floor(SHOP_ITEMS[kind].baseCost * G.levelGrowth ** (level - 1) * G.sameTypeGrowth ** (shop.byType[kind] ?? 0));
}

/** `Shop.spellCost`: `slotLevel` null = spell nova; com nível, a melhoria a partir dele. */
export function spellCost(shop: ShopState, slotLevel: number | null, level: number): number {
  const P = SHOP_SPELL;
  const base = slotLevel !== null ? P.upgradeBase + slotLevel * P.perLevel : P.acquireBase;
  return Math.floor(base * P.levelGrowth ** (level - 1) * P.totalGrowth ** shop.spellPurchases);
}

/** `Shop.modifierValue` (D-112): o valor principal do modificador, o de maior módulo. */
export function modifierValue(effect: SpellEffect): number {
  let best = 0;
  for (const v of Object.values(effect)) if (typeof v === "number" && Math.abs(v) > Math.abs(best)) best = v;
  return best;
}

/** `Shop.modifierCost`. */
export function modifierCost(shop: ShopState, spellLevel: number, effect: SpellEffect, level: number): number {
  const P = SHOP_MODIFIER;
  const base = P.base + spellLevel * P.perLevel + Math.floor(Math.abs(modifierValue(effect)) * P.valueFactor);
  return Math.floor(base * P.levelGrowth ** (level - 1) * P.purchaseGrowth ** shop.modifierPurchases);
}

/** `Shop.relicCost` (D-145). */
export function relicCost(shop: ShopState, relicId: string, level: number): number {
  const R = SHOP_RELIC;
  const r = RELICS[relicId]?.rarity;
  const base = r ? R.cost[RARITY_KEY[r]] : R.cost.rare;
  return Math.floor(base * (1 + R.perLevel * (level - 1)) * R.perPurchase ** shop.relicPurchases);
}

/** `Shop.rerollCost` (D-146): base × nível, dobrando a cada troca na visita. */
export function rerollCost(visit: ShopVisit): number {
  return Math.floor(SHOP_REROLL.base * visit.level * SHOP_REROLL.growth ** visit.rerolls);
}

// ---------------------------------------------------------------- ofertas possíveis

const slotIndex = (run: RunState, id: string | undefined) => run.spells.findIndex((s) => s.id === id);

/** `SpellSystem.slotOf`: o espaço da spell, ou a técnica (`spells[0]` de lá, D-252). */
export function shopSlotOf(run: RunState, id: string | undefined): RunState["technique"] | undefined {
  const i = slotIndex(run, id);
  if (i >= 0) return run.spells[i];
  return run.technique && run.technique.id === id ? run.technique : undefined;
}

/** `Shop.candidates`: toda oferta válida agora de uma categoria (um modificador uma vez por spell, D-042). */
export function candidates(run: RunState, category: ShopCategory): Omit<ShopOffer, "bought">[] {
  const list: Omit<ShopOffer, "bought">[] = [];
  if (category === "spell_upgrade") {
    for (const s of run.spells) if (s.level < SPELL_MAX_LEVEL) list.push({ kind: "spell_upgrade", spell: s.id });
    // 1.9 D-252: a técnica sobe de nível na loja também (Lv5 = a evolução dela)
    const t = run.technique;
    if (t && t.level < SPELL_MAX_LEVEL) list.push({ kind: "spell_upgrade", spell: t.id });
  } else if (category === "spell_modifier") {
    for (const s of run.spells) {
      const def = SPELLS[s.id as SpellId];
      for (const m of def?.modifiers ?? []) {
        if (!s.modifiers.includes(m.id)) list.push({ kind: "spell_modifier", spell: s.id, modifier: m.id });
      }
    }
  } else if (category === "new_spell") {
    if (run.spells.length < MAX_SPELLS) {
      for (const id of SPELL_ORDER) if (slotIndex(run, id) < 0) list.push({ kind: "new_spell", spell: id });
    }
  } else {
    list.push({ kind: category });
  }
  return list;
}

const same = (a: Omit<ShopOffer, "bought">, b: Omit<ShopOffer, "bought">) =>
  a.kind === b.kind && a.spell === b.spell && a.modifier === b.modifier && a.relic === b.relic;

/**
 * `Shop.roll` (§72): uma visita nova. Uma melhoria de spell é garantida quando alguma spell pode subir; o resto sai
 * por categoria sorteada por igual entre as que ainda têm oferta livre, depois o item dentro dela. A 4ª oferta é
 * uma relíquia de `relicPool` (as abertas que o herói ainda não tem).
 */
export function rollShop(run: RunState, rng: ShopRng, wave: number, relicPool: readonly string[], size: number = SHOP_OFFERS): ShopVisit {
  run.shop.visits++;
  const offers: Omit<ShopOffer, "bought">[] = [];
  const add = (o: Omit<ShopOffer, "bought">) => {
    if (!offers.some((x) => same(x, o))) offers.push(o);
  };
  const ups = candidates(run, "spell_upgrade");
  if (ups.length > 0 && size > 0) add(rng.pick(ups));
  for (let guard = 0; offers.length < size && guard < 60; guard++) {
    const cats: Omit<ShopOffer, "bought">[][] = [];
    for (const c of SHOP_CATEGORIES) {
      const free = candidates(run, c).filter((o) => !offers.some((x) => same(x, o)));
      if (free.length > 0) cats.push(free);
    }
    if (cats.length === 0) break;
    add(rng.pick(rng.pick(cats)));
  }
  const pool = relicPool.filter((id) => !run.relics.includes(id));
  if (pool.length > 0) offers.push({ kind: "relic", relic: rng.pick(pool) });
  return { level: shopLevel(wave), wave, offers: offers.map((o) => ({ ...o, bought: false })), rerolls: 0, size };
}

/**
 * `Shop.reroll` (D-146, D-182): troca as 4 ofertas, compradas também, por um sorteio novo do mesmo tamanho. Não
 * conta como visita nova. Devolve o custo pago, ou o motivo da recusa.
 */
export function rerollShop(run: RunState, visit: ShopVisit, rng: ShopRng, relicPool: readonly string[]):
  { ok: true; cost: number } | { ok: false; reason: string } {
  const cost = rerollCost(visit);
  if (run.gold < cost) return { ok: false, reason: SHOP_REASONS.noGold };
  const fresh = rollShop(run, rng, visit.wave, relicPool, visit.size);
  run.shop.visits--;
  visit.offers = fresh.offers;
  run.gold -= cost;
  run.statistics.goldSpent += cost;
  visit.rerolls++;
  return { ok: true, cost };
}

// ---------------------------------------------------------------- avaliação e compra

export interface OfferEval {
  /** preço; null quando não há preço (comprada, ou a spell saiu do espaço) */
  cost: number | null;
  valid: boolean;
  reason?: string;
}

/** `Shop.evaluate`: preço e validade agora (outras compras podem invalidar uma oferta). */
export function evaluateOffer(run: RunState, visit: ShopVisit, o: ShopOffer): OfferEval {
  const R = SHOP_REASONS;
  if (o.bought) return { cost: null, valid: false, reason: R.bought };
  const L = visit.level;
  const shop = run.shop;
  if (isGeneral(o.kind)) return { cost: generalCost(shop, o.kind, L), valid: true };
  if (o.kind === "new_spell") {
    const cost = spellCost(shop, null, L);
    if (slotIndex(run, o.spell) >= 0) return { cost, valid: false, reason: R.alreadyEquipped };
    if (run.spells.length >= MAX_SPELLS) return { cost, valid: false, reason: R.noSlot };
    return { cost, valid: true };
  }
  if (o.kind === "spell_upgrade") {
    const slot = shopSlotOf(run, o.spell);
    if (!slot) return { cost: null, valid: false, reason: R.notEquipped };
    const cost = spellCost(shop, slot.level, L);
    if (slot.level >= SPELL_MAX_LEVEL) return { cost, valid: false, reason: R.maxLevel };
    return { cost, valid: true };
  }
  if (o.kind === "relic") {
    const cost = relicCost(shop, o.relic!, L);
    if (run.relics.includes(o.relic!)) return { cost, valid: false, reason: R.alreadyBought };
    return { cost, valid: true };
  }
  // spell_modifier
  const slot = run.spells[slotIndex(run, o.spell)];
  if (!slot) return { cost: null, valid: false, reason: R.notEquipped };
  const mod = modifierDef(slot.id as SpellId, o.modifier!);
  const cost = modifierCost(shop, slot.level, mod?.effect ?? {}, L);
  if (slot.modifiers.includes(o.modifier!)) return { cost, valid: false, reason: R.alreadyBought };
  return { cost, valid: true };
}

export interface BuyHooks {
  /** dá a relíquia (o jogo registra a conquista e recalcula); sem gancho, entra direto na partida */
  grantRelic?: (id: string) => void;
}

export type BuyResult = { ok: true; offer: ShopOffer; cost: number; fullHeal: boolean } | { ok: false; reason: string };

/**
 * `Shop.buy`: cobra e aplica. Os itens gerais entram pelos atributos (`shopStats`); a Vitality pede cura total
 * (`fullHeal`), que o jogo aplica depois de recalcular a vida máxima.
 */
export function buyOffer(run: RunState, visit: ShopVisit, index: number, hooks: BuyHooks = {}): BuyResult {
  const o = visit.offers[index];
  if (!o) return { ok: false, reason: SHOP_REASONS.noOffer };
  const ev = evaluateOffer(run, visit, o);
  if (!ev.valid || ev.cost === null) return { ok: false, reason: ev.reason ?? SHOP_REASONS.noOffer };
  const cost = ev.cost;
  if (run.gold < cost) return { ok: false, reason: SHOP_REASONS.noGold };
  const shop = run.shop;
  run.gold -= cost;
  if (isGeneral(o.kind)) {
    shop.byType[o.kind] = (shop.byType[o.kind] ?? 0) + 1;
  } else if (o.kind === "new_spell") {
    addSpell(run.spells, o.spell!, newSpellSlot);
  } else if (o.kind === "spell_upgrade") {
    const i = slotIndex(run, o.spell);
    if (i >= 0) levelUpSpell(run.spells, i);
    else run.technique.level++; // evaluateOffer já garantiu que é a técnica, abaixo do máximo
  } else if (o.kind === "spell_modifier") {
    addModifier(run.spells, slotIndex(run, o.spell), o.modifier!);
    shop.modifierPurchases++;
  } else {
    if (hooks.grantRelic) hooks.grantRelic(o.relic!);
    else if (!run.relics.includes(o.relic!)) { run.relics.push(o.relic!); run.relicVersion++; }
    shop.relicPurchases++;
  }
  shop.purchases++;
  if (o.kind === "spell_upgrade" || o.kind === "new_spell" || o.kind === "spell_modifier") shop.spellPurchases++;
  shop.history.push({ kind: o.kind, spell: o.spell, modifier: o.modifier, relic: o.relic, cost, wave: visit.wave });
  o.bought = true;
  o.paid = cost;
  run.statistics.goldSpent += cost;
  return { ok: true, offer: o, cost, fullHeal: o.kind === "vitality" };
}

/** `applyShopStats`: o que os itens gerais comprados somam aos atributos (uma fonte a mais no `recompute`). */
export function shopStats(shop: ShopState): StatBlock {
  const out: StatBlock = {};
  const n = shop.byType;
  if (n.sharpened_weapon > 0) out.damage = SHOP_ITEMS.sharpened_weapon.damageFlat! * n.sharpened_weapon;
  if (n.arcane_tome > 0) out.spellPower = SHOP_ITEMS.arcane_tome.spellPowerFlat! * n.arcane_tome;
  if (n.vitality > 0) out.maxHp = SHOP_ITEMS.vitality.maxHpFlat! * n.vitality;
  return out;
}
