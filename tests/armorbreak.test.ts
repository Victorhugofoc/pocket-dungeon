import { describe, expect, it } from "vitest";
import { applyArmorBreak, armorTakenMult } from "../src/core/armorbreak";
import { armorReduction } from "../src/core/stats";

describe("Armorbreak do Iron Colossus (boss_ai.lua `armorbreak`, damage.lua)", () => {
  it("soma a armadura da quebra só enquanto dura", () => {
    const b = applyArmorBreak(10, 6, -15);
    expect(b).toEqual({ until: 16, armor: -15, total: 6 });
    expect(armorTakenMult(30, b, 12)).toBeCloseTo(1 - armorReduction(15));
    expect(armorTakenMult(30, b, 16)).toBeCloseTo(1 - armorReduction(30));
    expect(armorTakenMult(30, null, 12)).toBeCloseTo(1 - armorReduction(30));
  });
  it("sem armadura, a quebra faz o herói levar mais que o golpe cheio", () => {
    expect(armorTakenMult(0, applyArmorBreak(0, 6, -15), 1)).toBeGreaterThan(1);
  });
  it("a nova troca a anterior (renova o tempo, não acumula)", () => {
    const b = applyArmorBreak(14, 6, -15);
    expect(b.until).toBe(20);
    expect(b.armor).toBe(-15);
  });
});
