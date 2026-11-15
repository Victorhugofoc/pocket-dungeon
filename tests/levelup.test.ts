import { describe, expect, it } from "vitest";
import {
  addXp, applyUpgrade, availablePool, draft, draftTiers, rerollCost, rerollsLeft, upgradeLive, upgradeStats,
} from "../src/core/levelup";
import { RunRng, checkpoint, continueRun, newRun, type RunState } from "../src/core/run";
import { computeStats } from "../src/core/stats";
import { UPGRADE_BY_ID, UPGRADES } from "../src/data/upgrades";
import { HEROES } from "../src/data/heroes";
import { TUNING } from "../src/data/tuning";

function run(heroId = "varok", seed = 7): RunState {
  return newRun({ heroId, difficultyId: "normal", startingSpell: HEROES[heroId].startingSpells[0], seed, randomSeed: 1 });
}

describe("XP (xp.lua)", () => {
  it("50 para o nível 2, ×1,35 depois, e uma passagem de nível por ganho", () => {
    const r = run();
    expect(addXp(r, 49, 1)).toBe(false);
    expect(addXp(r, 1, 1)).toBe(true);
    expect(r.level).toBe(2);
    expect(r.xpToNext).toBe(67);
    expect(r.pendingLevelUps).toBe(1);
    // um ganho enorme sobe um nível só; o resto passa no próximo ganho
    expect(addXp(r, 1000, 1)).toBe(true);
    expect(r.level).toBe(3);
    expect(r.xp).toBe(1000 - 67);
    expect(addXp(r, 0, 1)).toBe(true);
    expect(r.level).toBe(4);
  });
  it("o multiplicador de XP entra uma vez, arredondado para baixo", () => {
    const r = run();
    addXp(r, 10, 1.12);
    expect(r.xp).toBe(11);
    expect(r.statistics.xpEarned).toBe(11);
  });
});

describe("melhorias de nível (level_up.lua)", () => {
  it("o sorteio dá 3 distintas, só das que já têm efeito no jogo, e repete com a mesma seed", () => {
    const a = draft(run(), new RunRng(3).get("levelup"));
    const b = draft(run(), new RunRng(3).get("levelup"));
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    expect(new Set(a).size).toBe(3);
    for (const id of a) expect(upgradeLive(UPGRADE_BY_ID[id])).toBe(true);
  });
  it("as ligadas: as de ataque, defesa e economia cujos atributos existem aqui", () => {
    const live = UPGRADES.filter(upgradeLive).map((u) => u.id);
    expect(live).toEqual([
      "brutality", "rapid_strike", "deadly_edge", "critical_edge", "glass_cannon", "fleetfoot", "vitality", "long_reach",
      "evasive_footwork", "phantom_step", "second_wind", "arcane_haste", "quickened_mind", "blade_discipline", "wisdom", "golden_instinct",
    ]);
  });
  it("aplicar grava a raridade e as tags e gasta um nível; a única não volta", () => {
    const r = run();
    r.pendingLevelUps = 2;
    applyUpgrade(r, "glass_cannon", "epic");
    expect(r.upgradesTaken).toEqual(["glass_cannon"]);
    expect(r.upgradeTiers).toEqual(["epic"]);
    expect(r.tags).toEqual({ auto: 1, damage: 1, risk: 1 });
    expect(r.pendingLevelUps).toBe(1);
    // contagem e exclusiva de herói nunca mudam de raridade
    applyUpgrade(r, "double_shot", "epic");
    expect(r.upgradeTiers[1]).toBe("common");
    r.wave = 5;
    applyUpgrade(r, "executioner", "rare");
    expect(r.upgradeTiers[2]).toBe("common");
    expect(availablePool(r, false).some((u) => u.id === "executioner")).toBe(false);
  });
  it("as melhorias viram atributos daqui: só o lado positivo cresce com a raridade, e a recarga troca de sinal", () => {
    const r = run();
    r.upgradesTaken = ["glass_cannon", "arcane_haste", "vitality", "brutality"];
    r.upgradeTiers = ["epic", "rare", "common", "common"];
    const s = upgradeStats(r);
    expect(s.damagePct).toBeCloseTo(0.5);
    expect(s.armor).toBe(-15);
    // a parte negativa nunca cresce: Arcane Haste (-10% de recarga) é sempre comum, como lá
    expect(s.cdrPct).toBeCloseTo(0.1);
    expect(s.maxHp).toBe(20);
    expect(s.damage).toBe(2);
    const f = computeStats([s]);
    expect(f.maxHp).toBe(TUNING.hero.baseHp + 20);
    expect(f.cooldownMult).toBeCloseTo(0.9);
  });
  it("trocar custa 20 + 5 × nível, uma vez por nível", () => {
    const r = run();
    r.level = 4;
    expect(rerollCost(r)).toBe(40);
    expect(rerollsLeft(0)).toBe(1);
    expect(rerollsLeft(1)).toBe(0);
  });
  it("continuar do checkpoint sorteia as mesmas cartas e raridades", () => {
    const r = run("frostine", 99);
    const rng = new RunRng(r.seed);
    rng.get("levelup").next();
    const cp = checkpoint(r, rng, 3);
    const go = (x: { run: RunState; rng: RunRng }) => {
      const ids = draft(x.run, x.rng.get("levelup"));
      return { ids, tiers: draftTiers(x.run, x.rng.get("levelup"), ids) };
    };
    expect(go(continueRun(cp))).toEqual(go(continueRun(cp)));
  });
});
