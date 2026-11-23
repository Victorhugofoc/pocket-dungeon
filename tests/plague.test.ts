import { describe, expect, it } from "vitest";
import { ENEMIES } from "../src/data/enemies";
import { plagueDps } from "../src/core/plague";

describe("poça de peste do Plaguebearer (M9-03)", () => {
  const p = ENEMIES.plaguebearer.plague!;
  it("dano por segundo = 5 + 0,45 × onda", () => {
    expect(plagueDps(p, 1)).toBeCloseTo(5.45);
    expect(plagueDps(p, 10)).toBeCloseTo(9.5);
  });
  it("onda 0 conta como 1", () => {
    expect(plagueDps(p, 0)).toBeCloseTo(5.45);
  });
  it("raio de 48 px de lá", () => {
    expect(p.radius * 16).toBe(48);
  });
});
