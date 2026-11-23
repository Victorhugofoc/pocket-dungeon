import { describe, expect, it } from "vitest";
import { armyCount, bloodRush, phaseFor, phaseSteps, soulWardCount, tetherMult, unlockedPatterns } from "../src/core/bossphase";

describe("fases do chefe (M10-10)", () => {
  it("fase pela vida: acima de 60% = 1, acima de 30% = 2, senão 3", () => {
    expect(phaseFor(1)).toBe(1);
    expect(phaseFor(0.61)).toBe(1);
    expect(phaseFor(0.6)).toBe(2);
    expect(phaseFor(0.31)).toBe(2);
    expect(phaseFor(0.3)).toBe(3);
    expect(phaseFor(0)).toBe(3);
  });
  it("cada fase entra uma vez e em ordem, mesmo pulando", () => {
    expect(phaseSteps(1, 0.9)).toEqual([]);
    const s = phaseSteps(1, 0.1);
    expect(s.map((x) => x.phase)).toEqual([2, 3]);
    expect(s[0]).toMatchObject({ speed: 1.1, patternCooldown: 0.9, meleeCooldown: 1, enraged: false });
    expect(s[1]).toMatchObject({ speed: 1.12, patternCooldown: 0.82, meleeCooldown: 0.78, enraged: true });
    expect(phaseSteps(2, 0.1).map((x) => x.phase)).toEqual([3]);
    expect(phaseSteps(3, 0)).toEqual([]);
  });
  it("padrões abrem por fase; o rei coroado tem todos", () => {
    expect([1, 2, 3].map((p) => unlockedPatterns(3, p as 1 | 2 | 3, false))).toEqual([1, 2, 3]);
    expect([1, 2, 3].map((p) => unlockedPatterns(5, p as 1 | 2 | 3, false))).toEqual([3, 4, 5]);
    expect([1, 2, 3].map((p) => unlockedPatterns(2, p as 1 | 2 | 3, false))).toEqual([1, 1, 2]);
    expect(unlockedPatterns(4, 1, true)).toBe(4);
  });
  it("Blood Rush: +6% de passo e +5% de dano a cada 10% perdido", () => {
    expect(bloodRush(1)).toEqual({ steps: 0, speed: 1, damage: 1 });
    expect(bloodRush(0.9).steps).toBe(1);
    expect(bloodRush(0.91).steps).toBe(0);
    const r = bloodRush(0.45);
    expect(r.steps).toBe(5);
    expect(r.speed).toBeCloseTo(1.3);
    expect(r.damage).toBeCloseTo(1.25);
  });
  it("Army of the Damned: 4, 6 e 8 lacaios por fase", () => {
    expect([1, 2, 3].map((p) => armyCount(p as 1 | 2 | 3))).toEqual([4, 6, 8]);
  });
  it("Soul Tether: 2, 3 e 3 selos por fase; com selo de pé o chefe leva 35%", () => {
    expect([1, 2, 3].map((p) => soulWardCount(p as 1 | 2 | 3))).toEqual([2, 3, 3]);
    expect(tetherMult(0)).toBe(1);
    expect(tetherMult(1)).toBe(0.35);
    expect(tetherMult(3)).toBe(0.35);
  });
});
