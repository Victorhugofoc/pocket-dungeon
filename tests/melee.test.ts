import { describe, expect, it } from "vitest";
import { angleDiff, circleInArc } from "../src/core/melee";

describe("golpe com arco (M21-01)", () => {
  const ahead = Math.atan2(0, 1); // +z
  it("acerta na frente, dentro do alcance", () => {
    expect(circleInArc(0, 0, ahead, 1.6, 2, 0, 1.8, 0.45)).toBe(true);
  });
  it("erra atrás e dos lados fora da abertura", () => {
    expect(circleInArc(0, 0, ahead, 1.6, 2, 0, -1, 0.45)).toBe(false);
    expect(circleInArc(0, 0, ahead, 1.6, 2, 1.8, -0.2, 0.45)).toBe(false);
  });
  it("erra longe demais", () => {
    expect(circleInArc(0, 0, ahead, 1.6, 2, 0, 2.6, 0.45)).toBe(false);
  });
  it("o corpo do herói conta: a borda do arco pega quem está meio dentro", () => {
    // 0,8 rad + um pouco: o centro está fora, o corpo encosta
    const a = 0.8 + 0.15;
    expect(circleInArc(0, 0, ahead, 1.6, 2, Math.sin(a) * 1.5, Math.cos(a) * 1.5, 0.45)).toBe(true);
  });
  it("colado no inimigo sempre leva", () => {
    expect(circleInArc(0, 0, ahead, 1.6, 2, 0, -0.2, 0.45)).toBe(true);
  });
  it("diferença de ângulo dá a volta", () => {
    expect(angleDiff(3.0, -3.0)).toBeCloseTo(6 - Math.PI * 2);
  });
});
