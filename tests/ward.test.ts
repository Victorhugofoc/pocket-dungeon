import { describe, expect, it } from "vitest";
import { ENEMIES } from "../src/data/enemies";
import { wardenFor } from "../src/core/ward";

const W = ENEMIES.warden;
const foe = (x: number, z: number, def: object = ENEMIES.goblin, dead = false) => ({ x, z, dead, def });

describe("aura do Warden (M9-04)", () => {
  it("protege o aliado dentro do raio", () => {
    const w = foe(0, 0, W), g = foe(6.9, 0);
    expect(wardenFor(g, [w, g])).toBe(w);
  });
  it("não protege fora do raio nem com o Warden morto", () => {
    const g = foe(7.2, 0);
    expect(wardenFor(g, [foe(0, 0, W), g])).toBeNull();
    expect(wardenFor(foe(1, 0), [foe(0, 0, W, true)])).toBeNull();
  });
  it("um Warden não protege outro nem a si mesmo", () => {
    const a = foe(0, 0, W), b = foe(1, 0, W);
    expect(wardenFor(a, [a, b])).toBeNull();
  });
  it("raio de 112 px e ×0,65 de lá", () => {
    expect(W.support!.radius * 16).toBe(112);
    expect(W.support!.damageMult).toBe(0.65);
  });
});
