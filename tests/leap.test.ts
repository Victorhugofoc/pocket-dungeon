import { describe, expect, it } from "vitest";
import { ENEMIES } from "../src/data/enemies";
import { FIRST_TIMER } from "../src/data/run";
import { canLeap, leapHits, startLeap, stepLeap } from "../src/core/leap";

const L = ENEMIES.leaper.leap!;

describe("salto do Leaper (M9-05)", () => {
  it("salta só com a recarga pronta e o herói entre o mínimo e o alcance", () => {
    expect(canLeap(0, 8, L)).toBe(true);
    expect(canLeap(0.1, 8, L)).toBe(false);
    expect(canLeap(0, L.minDist, L)).toBe(false); // perto demais: corpo a corpo
    expect(canLeap(0, L.range, L)).toBe(true);
    expect(canLeap(0, L.range + 0.01, L)).toBe(false);
    expect(FIRST_TIMER.leap).toBe(0.5); // enemy.lua: o primeiro salto sai com metade da recarga
  });

  it("prepara parado, voa em linha reta até o alvo e pousa no fim do tempo de voo", () => {
    const leap = startLeap(0, 0, 10, 0, L.windup);
    let s = stepLeap(leap, L.windup / 2, L);
    expect(s).toMatchObject({ x: 0, z: 0, hop: 0, airborne: false, landed: false });
    stepLeap(leap, L.windup / 2, L);
    s = stepLeap(leap, L.airTime / 2, L);
    expect(s.x).toBeCloseTo(5);
    expect(s.hop).toBeCloseTo(L.height);
    expect(s.airborne).toBe(true);
    s = stepLeap(leap, L.airTime / 2 + 0.01, L);
    expect(s).toMatchObject({ x: 10, z: 0, hop: expect.any(Number), airborne: false, landed: true });
    expect(s.hop).toBeCloseTo(0);
  });

  it("o pouso acerta quem estiver no círculo, contando o raio do herói", () => {
    expect(leapHits(0, 0, L.radius, L.radius + 0.4, 0, 0.45)).toBe(true);
    expect(leapHits(0, 0, L.radius, L.radius + 0.5, 0, 0.45)).toBe(false);
  });
});
