import { describe, expect, it } from "vitest";
import { newRun } from "../src/core/run";
import { HEROES } from "../src/data/heroes";
import {
  botStartSpell, effectScore, pickEvent, pickMap, pickRelic, pickUpgrade, relicLuaEffects, relicPickScore, upgradeScore, shopOrder, shouldReroll,
  tagScore, type BotView,
} from "../src/core/simbot";
import type { ShopOffer } from "../src/core/shop";

function view(heroId: string, hp = 100, maxHp = 100): BotView {
  const run = newRun({ heroId, difficultyId: "normal", startingSpell: HEROES[heroId].startingSpells[0], seed: 1, randomSeed: 1 });
  return { run, hp, maxHp, rand: () => 0 };
}

describe("simbot: pesos (sim_bot.lua)", () => {
  it("effectScore pesa pela escola, pelo comum e pelo valor típico", () => {
    // fogo: firePct 4 × 0,2 × 10; icePct não está em fogo nem no comum: 0,4 × −0,15 × 10
    expect(effectScore("ignis", [{ stat: "firePct", value: 0.2 }, { stat: "icePct", value: -0.15 }])).toBeCloseTo(7.4);
    // armadura é plana: 2,5 × 15 / 10, negativa
    expect(effectScore("varok", [{ stat: "armor", value: -15 }])).toBeCloseTo(-3.75);
  });

  it("relíquia passa para os nomes de lá: recarga daqui vira spellCooldownPct negativa", () => {
    const fx = relicLuaEffects("ember_heart");
    expect(fx).toEqual([{ stat: "burnPct", value: 1 }]);
    expect(effectScore("aurelius", [{ stat: "spellCooldownPct", value: -0.2 }])).toBeCloseTo(7);
  });

  it("tagScore: escola, magic para quem conjura, e o limiar perto", () => {
    expect(tagScore("ignis", ["fire"], null)).toBe(3);
    expect(tagScore("ignis", ["magic"], null)).toBe(1);
    expect(tagScore("zephyr", ["magic"], null)).toBe(0);
    const v = view("ignis");
    const far = tagScore("ignis", ["fire"], v.run);
    v.run.tags.fire = 2;
    expect(tagScore("ignis", ["fire"], v.run)).toBeGreaterThan(far);
  });

  it("spell inicial do simulador, dentro das que o herói pode pegar", () => {
    expect(botStartSpell("ignis")).toBe("fireball");
    for (const id of Object.keys(HEROES)) {
      expect(HEROES[id].startingSpells as readonly string[]).toContain(botStartSpell(id));
    }
  });
});

describe("simbot: escolhas", () => {
  it("melhoria da escola do herói", () => {
    const ids = ["frost_affinity", "infernal_affinity"];
    expect(pickUpgrade(view("ignis"), "ignis", ids)).toBe(1);
    expect(pickUpgrade(view("frostine"), "frostine", ids)).toBe(0);
  });

  it("Vitality com a vida baixa", () => {
    expect(upgradeScore(view("ignis", 30), "ignis", "vitality") - upgradeScore(view("ignis", 90), "ignis", "vitality")).toBeCloseTo(4);
    expect(pickUpgrade(view("ignis", 30), "ignis", ["glass_cannon", "vitality"])).toBe(1);
  });

  it("relíquia da escola; fechar a receita pesa", () => {
    expect(pickRelic(view("ignis"), "ignis", ["frost_crown", "ember_heart"])).toBe(1);
    expect(pickRelic(view("frostine"), "frostine", ["ember_heart", "frost_crown"])).toBe(1);
    const v = view("frostine");
    v.run.relics.push("infernal_crown");
    // Ember Heart + Infernal Crown fecham o Inferno Heart
    expect(relicPickScore(v, "frostine", "ember_heart") - relicPickScore(view("frostine"), "frostine", "ember_heart")).toBeCloseTo(3);
  });

  it("mapa: loja primeiro, mas não sem ouro; sala perigosa perde para a comum", () => {
    const v = view("ignis");
    v.run.gold = 200;
    expect(pickMap(v, [{ node: "combat_room" }, { node: "shop" }, { node: "event" }])).toBe(1);
    v.run.gold = 10;
    expect(pickMap(v, [{ node: "combat_room" }, { node: "shop" }, { node: "event" }])).toBe(2);
    expect(pickMap(v, [{ node: "boss_ambush" }, { node: "pact" }])).toBe(1);
  });

  it("evento: sem ouro não paga o mercador; vida baixa escolhe a cura", () => {
    const v = view("ignis", 90);
    v.run.gold = 0;
    expect(pickEvent(v, "ignis", ["wandering_merchant", "treasure_cache"])).toBe(1);
    v.run.gold = 500;
    expect(pickEvent(v, "ignis", ["wandering_merchant", "treasure_cache"])).toBe(0);
    expect(pickEvent(view("ignis", 30), "ignis", ["treasure_cache", "quiet_rest"])).toBe(1);
    expect(pickEvent(view("ignis", 50), "ignis", ["blood_altar", "cursed_chamber"])).toBe(1);
  });

  it("loja: nível da spell principal antes do resto; pulada a comprada", () => {
    const v = view("ignis");
    const main = v.run.spells[0].id;
    const offers: ShopOffer[] = [
      { kind: "vitality", bought: false },
      { kind: "spell_upgrade", spell: main, bought: false },
      { kind: "sharpened_weapon", bought: false },
      { kind: "new_spell", spell: "healing_field", bought: true },
    ];
    expect(shopOrder(v, "ignis", offers)).toEqual([1, 0, 2]);
  });

  it("troca a loja só com a reserva e até 3 vezes", () => {
    expect(shouldReroll(300, 40, 0)).toBe(true);
    expect(shouldReroll(280, 40, 0)).toBe(false);
    expect(shouldReroll(1000, 40, 3)).toBe(false);
  });
});
