import { describe, expect, it } from "vitest";
import { detourGold, detourRng, rollDetours, shrineCost } from "../src/core/detours";
import { Rng } from "../src/core/rng";

describe("M21-09 detours", () => {
  it("M21-15: rolls 0 or 1 kind (the optional 4th altar), and all three show up over many seeds", () => {
    const seen = new Set<string>();
    const counts = new Set<number>();
    for (let s = 1; s < 400; s++) {
      const k = rollDetours(new Rng(s), { shopAhead: true });
      expect(k.length).toBeLessThanOrEqual(1);
      counts.add(k.length);
      k.forEach((x) => seen.add(x));
    }
    expect([...counts].sort()).toEqual([0, 1]);
    expect([...seen].sort()).toEqual(["chest", "shortcut", "shrine"]);
  });

  it("no shortcut without a shop ahead", () => {
    for (let s = 1; s < 300; s++) expect(rollDetours(new Rng(s), { shopAhead: false })).not.toContain("shortcut");
  });

  it("same seed and wave give the same detours", () => {
    const a = rollDetours(detourRng(1234, 3), { shopAhead: true });
    const b = rollDetours(detourRng(1234, 3), { shopAhead: true });
    expect(a).toEqual(b);
  });

  it("gold grows with the wave; the shrine never kills", () => {
    expect(detourGold("chest", 10)).toBeGreaterThan(detourGold("chest", 1));
    expect(shrineCost(100, 100)).toBe(25);
    expect(shrineCost(10, 100)).toBe(9);
    expect(shrineCost(1, 100)).toBe(0);
});
});
