import { describe, expect, it } from "vitest";
import { seedRandom } from "../src/sim-env";
import { safeStorage } from "../src/core/save";

describe("sim-env (M17-01)", () => {
  it("a mesma seed repete o Math.random", () => {
    seedRandom(42);
    const a = [Math.random(), Math.random(), Math.random()];
    seedRandom(42);
    expect([Math.random(), Math.random(), Math.random()]).toEqual(a);
    seedRandom(43);
    expect(Math.random()).not.toBe(a[0]);
    for (let i = 0; i < 100; i++) {
      const x = Math.random();
      expect(x >= 0 && x < 1).toBe(true);
    }
  });

  it("o save da simulação fica na memória própria", () => {
    const s = safeStorage()!;
    s.setItem("k", "v");
    expect(s.getItem("k")).toBe("v");
    s.removeItem("k");
    expect(s.getItem("k")).toBeNull();
  });
});
