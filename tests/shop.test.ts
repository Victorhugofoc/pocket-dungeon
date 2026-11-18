import { describe, expect, it } from "vitest";
import { newRun, RunRng } from "../src/core/run";
import { buyOffer, candidates, evaluateOffer, rerollCost, rerollShop, rollShop, shopStats, type ShopVisit } from "../src/core/shop";
import { HEROES, HERO_ORDER } from "../src/data/heroes";
import { SHOP_REASONS } from "../src/data/shop";

const hero = HERO_ORDER[0];
const run0 = () => {
  const r = newRun({ heroId: hero, difficultyId: "normal", startingSpell: HEROES[hero].startingSpells[0], randomSeed: 42 });
  r.gold = 10000;
  return r;
};
const visit = (wave: number, offers: ShopVisit["offers"]): ShopVisit => ({ level: 1 + Math.floor((wave - 1) / 5), wave, offers, rerolls: 0, size: 3 });

describe("Magic Shop (M7-03)", () => {
  it("visita: 3 ofertas mais a relíquia, uma melhoria de spell garantida, sem repetir", () => {
    const run = run0();
    const rng = new RunRng(run.seed).get("shop");
    for (let i = 0; i < 50; i++) {
      const v = rollShop(run, rng, 6, ["blood_pact", "arcane_core"]);
      expect(v.level).toBe(2);
      expect(v.offers.length).toBe(4);
      expect(v.offers[0].kind).toBe("spell_upgrade");
      expect(v.offers[3].kind).toBe("relic");
      const keys = v.offers.map((o) => `${o.kind}:${o.spell}:${o.modifier}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
    expect(run.shop.visits).toBe(50);
  });

  it("mesma seed, mesmas ofertas", () => {
    const a = run0(), b = run0();
    const va = rollShop(a, new RunRng(a.seed).get("shop"), 3, ["blood_pact"]);
    const vb = rollShop(b, new RunRng(b.seed).get("shop"), 3, ["blood_pact"]);
    expect(va.offers).toEqual(vb.offers);
  });

  it("compra: cobra, aplica, marca comprada; outra compra invalida a oferta", () => {
    const run = run0();
    const sp = run.spells[0].id;
    const v = visit(1, [
      { kind: "spell_upgrade", spell: sp, bought: false },
      { kind: "new_spell", spell: "iceball", bought: false },
      { kind: "new_spell", spell: "venom_nova", bought: false },
      { kind: "vitality", bought: false },
    ]);
    if (sp === "iceball") v.offers[1].spell = "fireball";
    const up = buyOffer(run, v, 0);
    expect(up.ok && up.cost).toBe(94); // 50 + 1 × 44
    expect(run.spells[0].level).toBe(2);
    expect(run.gold).toBe(10000 - 94);
    expect(evaluateOffer(run, v, v.offers[0])).toEqual({ cost: null, valid: false, reason: SHOP_REASONS.bought });
    // a compra de spell sobe o preço das próximas (×1,12)
    expect(evaluateOffer(run, v, v.offers[1]).cost).toBe(Math.floor(50 * 1.12));
    expect(buyOffer(run, v, 1).ok).toBe(true);
    expect(run.spells.length).toBe(2);
    // espaços cheios: a outra spell nova fica inválida
    expect(evaluateOffer(run, v, v.offers[2])).toMatchObject({ valid: false, reason: SHOP_REASONS.noSlot });
    expect(buyOffer(run, v, 2)).toEqual({ ok: false, reason: SHOP_REASONS.noSlot });
    const vit = buyOffer(run, v, 3);
    expect(vit.ok && vit.fullHeal).toBe(true);
    expect(run.shop.spellPurchases).toBe(2);
    expect(run.shop.purchases).toBe(3);
    expect(run.statistics.goldSpent).toBe(10000 - run.gold);
    expect(run.shop.history.map((h) => h.kind)).toEqual(["spell_upgrade", "new_spell", "vitality"]);
  });

  it("sem ouro não compra; nível máximo e modificador repetido ficam inválidos", () => {
    const run = run0();
    const sp = run.spells[0];
    const v = visit(1, [{ kind: "sharpened_weapon", bought: false }, { kind: "spell_upgrade", spell: sp.id, bought: false }]);
    run.gold = 10;
    expect(buyOffer(run, v, 0)).toEqual({ ok: false, reason: SHOP_REASONS.noGold });
    expect(run.gold).toBe(10);
    sp.level = 5;
    expect(evaluateOffer(run, v, v.offers[1])).toMatchObject({ valid: false, reason: SHOP_REASONS.maxLevel });
  });

  it("modificador: entra na spell e só uma vez", () => {
    const run = run0();
    run.spells = [{ id: "fireball", level: 2, modifiers: [], evolution: null }];
    const v = visit(1, [{ kind: "spell_modifier", spell: "fireball", modifier: "hotter_core", bought: false },
      { kind: "spell_modifier", spell: "fireball", modifier: "hotter_core", bought: false }]);
    expect(buyOffer(run, v, 0).ok).toBe(true);
    expect(run.spells[0].modifiers).toEqual(["hotter_core"]);
    expect(run.shop.modifierPurchases).toBe(1);
    expect(evaluateOffer(run, v, v.offers[1])).toMatchObject({ valid: false, reason: SHOP_REASONS.alreadyBought });
  });

  it("relíquia: preço pela raridade e nível, cresce a cada compra; o gancho dá a relíquia", () => {
    const run = run0();
    const v = visit(6, [{ kind: "relic", relic: "glass_cannon", bought: false }, { kind: "relic", relic: "hunters_eye", bought: false }]);
    expect(evaluateOffer(run, v, v.offers[0]).cost).toBe(Math.floor(320 * 1.25));
    const got: string[] = [];
    expect(buyOffer(run, v, 0, { grantRelic: (id) => got.push(id) }).ok).toBe(true);
    expect(got).toEqual(["glass_cannon"]);
    expect(evaluateOffer(run, v, v.offers[1]).cost).toBe(Math.floor(120 * 1.25 * 1.15));
    expect(buyOffer(run, v, 1).ok).toBe(true);
    expect(run.relics).toContain("hunters_eye");
  });

  it("itens gerais somam aos atributos; preço sobe com o mesmo item", () => {
    const run = run0();
    const v = visit(1, [{ kind: "sharpened_weapon", bought: false }, { kind: "sharpened_weapon", bought: false },
      { kind: "arcane_tome", bought: false }]);
    expect(buyOffer(run, v, 0)).toMatchObject({ ok: true, cost: 35 });
    expect(buyOffer(run, v, 1)).toMatchObject({ ok: true, cost: Math.floor(35 * 1.32) });
    expect(buyOffer(run, v, 2)).toMatchObject({ ok: true, cost: 35 });
    expect(shopStats(run.shop)).toEqual({ damage: 4, spellPower: 2 });
  });

  it("troca: 25 × nível, dobrando na visita; troca tudo e não conta visita", () => {
    const run = run0();
    const rng = new RunRng(run.seed).get("shop");
    const v = rollShop(run, rng, 11, ["blood_pact"]);
    expect(rerollCost(v)).toBe(75);
    v.offers[0].bought = true;
    expect(rerollShop(run, v, rng, ["blood_pact"])).toEqual({ ok: true, cost: 75 });
    expect(v.offers.every((o) => !o.bought)).toBe(true);
    expect(rerollCost(v)).toBe(150);
    expect(run.shop.visits).toBe(1);
    run.gold = 100;
    expect(rerollShop(run, v, rng, ["blood_pact"])).toEqual({ ok: false, reason: SHOP_REASONS.noGold });
  });

  it("técnica (M7-05, S19): entra como melhoria, sobe até o 5 (evolução) e sai das ofertas", () => {
    const run = run0();
    const tid = run.technique.id;
    expect(candidates(run, "spell_upgrade").some((o) => o.spell === tid)).toBe(true);
    const v = visit(1, [{ kind: "spell_upgrade", spell: tid, bought: false }]);
    const before = evaluateOffer(run, v, v.offers[0]);
    expect(before.valid).toBe(true);
    expect(before.cost).toBeGreaterThan(0);
    for (let lv = 1; lv < 5; lv++) {
      v.offers[0].bought = false;
      const r = buyOffer(run, v, 0);
      expect(r.ok).toBe(true);
      expect(run.technique.level).toBe(lv + 1);
    }
    expect(run.shop.spellPurchases).toBe(4);
    expect(run.spells[0].level).toBe(1);
    v.offers[0].bought = false;
    expect(evaluateOffer(run, v, v.offers[0])).toMatchObject({ valid: false, reason: SHOP_REASONS.maxLevel });
    expect(candidates(run, "spell_upgrade").some((o) => o.spell === tid)).toBe(false);
    // nunca vira oferta de modificador (lá o laço é ipairs, que pula o spells[0])
    expect(candidates(run, "spell_modifier").some((o) => o.spell === tid)).toBe(false);
  });
});
