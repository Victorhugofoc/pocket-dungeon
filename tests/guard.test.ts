import { describe, expect, it } from "vitest";
import { angleDiff, guardBlocks, shieldPhase, turnToward } from "../src/core/guard";

const C = { up: 6, warn: 1, down: 5 };

describe("escudo de frente (M9-01)", () => {
  it("ciclo: erguido, piscando, abaixado e volta", () => {
    expect(shieldPhase(0, C)).toBe("up");
    expect(shieldPhase(5.99, C)).toBe("up");
    expect(shieldPhase(6.5, C)).toBe("warn");
    expect(shieldPhase(7, C)).toBe("down");
    expect(shieldPhase(11.9, C)).toBe("down");
    expect(shieldPhase(12.1, C)).toBe("up");
  });

  it("gira no máximo o passo, pelo lado mais curto", () => {
    expect(turnToward(0, 1, 0.1)).toBeCloseTo(0.1);
    expect(turnToward(0, -1, 0.1)).toBeCloseTo(-0.1);
    expect(turnToward(0, 0.05, 0.1)).toBeCloseTo(0.05);
    // de 170° para -170°: passa pelos 180°, não volta pelo zero
    expect(turnToward((170 * Math.PI) / 180, (-170 * Math.PI) / 180, 0.1)).toBeGreaterThan((170 * Math.PI) / 180);
    expect(Math.abs(angleDiff(Math.PI * 3, Math.PI))).toBeCloseTo(0);
  });

  it("bloqueia só dentro do arco de 70°", () => {
    // escudo virado para +z
    expect(guardBlocks(0, 70, 0, 0, 1, 0, 5, 0, 5)).toBe(true);
    expect(guardBlocks(0, 70, 0, 0, 1, Math.sin(0.6), Math.cos(0.6), 0, 0)).toBe(true); // 34°
    expect(guardBlocks(0, 70, 0, 0, 1, Math.sin(0.62) * 5, Math.cos(0.62) * 5, 0, 0)).toBe(false); // 35,5°
    expect(guardBlocks(0, 70, 0, 0, 1, 5, 0, 5, 0)).toBe(false); // de lado
    expect(guardBlocks(0, 70, 0, 0, 1, 0, -5, 0, -5)).toBe(false); // pelas costas
  });

  it("origem colada no corpo usa a posição do herói", () => {
    expect(guardBlocks(0, 70, 0, 0, 1, 0.1, -0.1, 0, 5)).toBe(true);
    expect(guardBlocks(0, 70, 0, 0, 1, 0.1, 0.1, 0, -5)).toBe(false);
  });
});
