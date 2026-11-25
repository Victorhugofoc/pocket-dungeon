// M13-02 parte 1: Depths (core/depths.ts e o que liga). A paridade dos números está em parity.test.ts.
import { describe, expect, it } from "vitest";
import {
  activeMutations, depthsScoreMult, depthsSummary, mutation, normalizeDepths, recordDepthsWin, unlockedDepths, type DepthsSave,
} from "../src/core/depths";
import { checkSaved, emptyAchievements, normalizeAchievements } from "../src/core/achievements";
import { bossAllowed } from "../src/core/bossbag";
import { addRecord, emptyRecords, type RunSummary } from "../src/core/run";
import { Rng } from "../src/core/rng";
import { startWave, stepWave, waveMods } from "../src/core/wave";
import { DIFFICULTIES, depthsLevel } from "../src/data/run";

describe("progresso", () => {
  it("abre com a medalha da Hard, um nível por vez, até 5", () => {
    const s: DepthsSave = {};
    expect(unlockedDepths(s, "frostine", false)).toBe(0);
    expect(unlockedDepths(s, "frostine", true)).toBe(1);
    expect(recordDepthsWin(s, "frostine", 1)).toEqual({ marks: 6, first: true });
    expect(recordDepthsWin(s, "frostine", 1)).toEqual({ marks: 1, first: false });
    expect(s.frostine.marks).toBe(7);
    expect(unlockedDepths(s, "frostine", true)).toBe(2);
    recordDepthsWin(s, "frostine", 5);
    expect(unlockedDepths(s, "frostine", true)).toBe(5);
    expect(unlockedDepths(s, "kaelen", true)).toBe(1);
  });

  it("o save das conquistas guarda as Depths e libera depths_1 e depths_3", () => {
    const a = emptyAchievements();
    recordDepthsWin(a.depths, "frostine", 3);
    const back = normalizeAchievements(JSON.parse(JSON.stringify(a)))!;
    expect(back.depths.frostine.best).toBe(3);
    const got = checkSaved(back, { heroes: ["frostine", "kaelen"], bosses: [], enemies: [], relics: [] }, { quiet: true });
    expect(got).toContain("depths_1");
    expect(got).toContain("depths_3");
    expect(got).not.toContain("depths_5");
    expect(got).not.toContain("supreme");
    expect(normalizeDepths({ x: "lixo" })).toEqual({ x: { best: 0, wins: {}, marks: 0, owned: {}, enabled: {} } });
  });
});

describe("partida", () => {
  it("mutações acumulam por nível; pontuação e letreiro", () => {
    expect(activeMutations(0)).toEqual([]);
    expect(activeMutations(3).map((m) => m.id)).toEqual(["loose_affixes", "pricey_shop", "wounds"]);
    expect(mutation(2, "wounds")).toBeNull();
    expect(mutation(5, "marked_bosses")?.affixes).toBe(1);
    expect(depthsScoreMult(5)).toBeCloseTo(2, 10);
    expect(depthsSummary(2)).toBe("Depths 2: Loose Affixes · Pricey Shop");
  });

  it("Depths é a Hard para o saco de chefes e para a vida comum até a onda 5", () => {
    expect(bossAllowed("hard", "depths2")).toBe(true);
    expect(bossAllowed("hard", "normal")).toBe(false);
    expect(depthsLevel("depths4")).toBe(4);
    expect(waveMods(5, "depths3").enemyHp).toBeCloseTo(waveMods(5, "hard").enemyHp, 10);
    expect(waveMods(6, "depths3").enemyHp).toBeCloseTo(waveMods(6, "hard").enemyHp * 1.24, 10);
    expect(DIFFICULTIES.depths5.bossHp).toBe(DIFFICULTIES.hard.bossHp);
  });

  it("Loose Affixes: comuns com 1 afixo a partir da onda 5, só nas Depths", () => {
    const affixed = (did: "hard" | "depths1", wave: number) => {
      const w = startWave(wave, new Rng(7), () => true, waveMods(wave, did));
      w.started = true;
      let n = 0, total = 0;
      const sp = new Rng(3), ch = new Rng(9);
      for (let i = 0; i < 400 && !w.complete; i++) {
        for (const s of stepWave(w, 0.25, { alive: 0, bossAlive: false }, sp, ch).spawns) {
          if (s.champion) continue;
          total++;
          if (s.affixes?.length) {
            n++;
            expect(s.affixes.length).toBe(1);
          }
        }
      }
      return { n, total };
    };
    expect(affixed("hard", 7).n).toBe(0);
    expect(affixed("depths1", 4).n).toBe(0);
    const d = affixed("depths1", 7);
    expect(d.n).toBeGreaterThan(0);
    expect(d.n / d.total).toBeLessThan(0.3);
  });

  it("a pontuação do registro leva ×(1 + 0,2 × nível)", () => {
    const base: RunSummary = { heroId: "frostine", difficultyId: "hard", wave: 10, kills: 100, damage: 0, level: 5, relics: 0, elapsed: 0,
      victory: false, endless: false, seedCode: "X", killedBy: null };
    const r = emptyRecords();
    addRecord(r, base, "d");
    addRecord(r, { ...base, difficultyId: "depths2", depths: 2 }, "d");
    expect(r.best["frostine/depths2"].score).toBeCloseTo(r.best["frostine/hard"].score * 1.4, 6);
  });
});

// M13-02 parte 2: as vantagens
import { buyPerk, canUseZonePerk, depthsSources, perkExtraBans, reservePotion, runPerk, runPerks, stockedShopBonus, togglePerk, useZonePerk } from "../src/core/depths";
import { checkpoint, continueRun, newRun, RunRng } from "../src/core/run";
import { relicBansLeft } from "../src/core/relics";
import { HEROES } from "../src/data/heroes";
import { PERKS, PERK_BY_ID, type PerkId } from "../src/data/depths";

const mkRun = (difficultyId: "hard" | "depths1", perks: PerkId[]) => newRun({ heroId: "frostine", difficultyId,
  startingSpell: HEROES.frostine.startingSpells[0], randomSeed: 42, depthsPerks: perks });

describe("vantagens", () => {
  it("comprar paga as Marcas uma vez e já liga; desligar tira da partida", () => {
    const s: DepthsSave = { frostine: { best: 1, wins: { 1: 1 }, marks: 6, owned: {}, enabled: {} } };
    expect(buyPerk(s, "frostine", "reserve_potion")).toBeNull();
    expect(s.frostine.marks).toBe(1);
    expect(buyPerk(s, "frostine", "reserve_potion")).toBe("already bought");
    expect(buyPerk(s, "frostine", "purse")).toBe("not enough Marks");
    expect(runPerks(s, "frostine")).toEqual(["reserve_potion"]);
    expect(togglePerk(s, "frostine", "reserve_potion")).toBe(true);
    expect(runPerks(s, "frostine")).toEqual([]);
    expect(togglePerk(s, "frostine", "purse")).toBe(false);
  });

  it("Well Equipped com as 9 compradas por um herói", () => {
    const a = emptyAchievements();
    a.depths.frostine = { best: 1, wins: {}, marks: 99, owned: {}, enabled: {} };
    for (const p of PERKS) buyPerk(a.depths, "frostine", p.id);
    expect(checkSaved(a, { heroes: ["frostine"], bosses: [], enemies: [], relics: [] }, { quiet: true })).toContain("well_equipped");
  });

  it("só valem nas Depths; ouro, troca grátis, Greed, banimento e relíquia inicial no começo", () => {
    const all = PERKS.map((p) => p.id);
    const hard = mkRun("hard", all);
    expect(hard.depthsPerks).toEqual([]);
    expect(runPerk(hard, "greed")).toBeNull();
    const d = mkRun("depths1", all);
    expect(d.gold).toBe(hard.gold + PERK_BY_ID.purse.gold!);
    expect(d.freeRerolls).toBe(1);
    expect(depthsSources(d)).toEqual([{ goldPct: 0.05 }]);
    expect(perkExtraBans(d)).toBe(1);
    expect(relicBansLeft(d)).toBe(3);
    expect(relicBansLeft(hard)).toBe(2);
    expect(d.pendingStartPick).toBe(true);
  });

  it("Stocked Shop na primeira loja de cada zona; Card Swap e Relic Reroll uma vez por zona", () => {
    const d = mkRun("depths1", ["full_shop", "card_swap", "relic_reroll"]);
    expect(stockedShopBonus(d, 1)).toBe(1);
    expect(stockedShopBonus(d, 1)).toBe(0);
    expect(stockedShopBonus(d, 2)).toBe(1);
    expect(useZonePerk(d, "card_swap", 1)).toBe(true);
    expect(canUseZonePerk(d, "card_swap", 1)).toBe(false);
    expect(canUseZonePerk(d, "relic_reroll", 1)).toBe(true);
    expect(canUseZonePerk(d, "card_swap", 2)).toBe(true);
    expect(canUseZonePerk(mkRun("depths1", []), "card_swap", 1)).toBe(false);
  });

  it("Reserve Potion: uma vez, abaixo de 20% e vivo, cura 30%", () => {
    const d = mkRun("depths1", ["reserve_potion"]);
    expect(reservePotion(d, 25, 100)).toBe(0);
    expect(reservePotion(d, 0, 100)).toBe(0);
    expect(reservePotion(d, 15, 100)).toBe(30);
    expect(reservePotion(d, 5, 100)).toBe(0);
  });

  it("as cargas vão no checkpoint (recarregar não devolve)", () => {
    const d = mkRun("depths1", ["reserve_potion", "card_swap"]);
    reservePotion(d, 10, 100);
    useZonePerk(d, "card_swap", 1);
    const back = continueRun(JSON.parse(JSON.stringify(checkpoint(d, new RunRng(d.seed), 1)))).run;
    expect(back.potionUsed).toBe(true);
    expect(back.cardSwaps).toEqual([1]);
    // checkpoint de antes da parte 2
    const old = JSON.parse(JSON.stringify(checkpoint(d, new RunRng(d.seed), 1)));
    delete old.run.depthsPerks; delete old.run.potionUsed; delete old.run.cardSwaps;
    const o = continueRun(old).run;
    expect(o.depthsPerks).toEqual([]);
    expect(o.cardSwaps).toEqual([]);
  });
});
