import { describe, expect, it } from "vitest";
import { applyHex, hexMult } from "../src/core/hex";

describe("maldição do Hexer (M9-02)", () => {
  it("reduz o dano do herói só enquanto dura", () => {
    const h = applyHex(null, 10, 3, 0.88);
    expect(hexMult(h, 10)).toBe(0.88);
    expect(hexMult(h, 12.9)).toBe(0.88);
    expect(hexMult(h, 13)).toBe(1);
    expect(hexMult(null, 0)).toBe(1);
  });

  it("renova sem acumular: fim mais tarde, multiplicador menor", () => {
    let h = applyHex(null, 0, 3, 0.88);
    h = applyHex(h, 2, 3, 0.88);
    expect(h.until).toBe(5);
    expect(h.mult).toBe(0.88);
    h = applyHex(h, 2.5, 1, 0.75);
    expect(h.until).toBe(5);
    expect(h.mult).toBe(0.75);
  });

  it("vencida, começa de novo", () => {
    const h = applyHex(applyHex(null, 0, 3, 0.5), 4, 3, 0.88);
    expect(h).toEqual({ until: 7, mult: 0.88, total: 3 });
  });
});
