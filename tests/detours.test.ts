import { describe, expect, it } from "vitest";
import { detourGold, detourRng, detourSpots, rollDetours, shrineCost } from "../src/core/detours";
import { Rng } from "../src/core/rng";
import { DETOUR } from "../src/data/detours";
import { generateZone, ObstacleGrid } from "../src/core/worldgen";
import { ZONES } from "../src/data/zones";

describe("M21-09 detours", () => {
  it("rolls 0 to 2 distinct kinds, and all three show up over many seeds", () => {
    const seen = new Set<string>();
    const counts = new Set<number>();
    for (let s = 1; s < 400; s++) {
      const k = rollDetours(new Rng(s), { shopAhead: true });
      expect(k.length).toBeLessThanOrEqual(2);
      expect(new Set(k).size).toBe(k.length);
      counts.add(k.length);
      k.forEach((x) => seen.add(x));
    }
    expect([...counts].sort()).toEqual([0, 1, 2]);
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

  it("spots sit outside every clearing, on free ground, in bounds", () => {
    let placed = 0, asked = 0;
    for (let s = 1; s < 40; s++) {
      const layout = generateZone(ZONES.bosque, s);
      const grid = new ObstacleGrid(layout.obstacles);
      const bound = layout.size / 2 - 14;
      for (let i = 0; i < 5; i++) {
        const from = i === 0 ? layout.spawn : layout.segments[i - 1];
        const area = { from, to: layout.segments[i], clearings: layout.segments, bound, blocked: (x: number, z: number, r: number) => grid.hits(x, z, r) };
        const spots = detourSpots(new Rng(s * 10 + i), ["chest", "shrine"], area);
        asked += 2;
        placed += spots.length;
        for (const sp of spots) {
          for (const c of layout.segments) expect(Math.hypot(sp.x - c.x, sp.z - c.z)).toBeGreaterThanOrEqual(c.r + DETOUR.clearingGap);
          expect(grid.hits(sp.x, sp.z, DETOUR.clearRadius)).toBe(false);
          expect(Math.abs(sp.x)).toBeLessThanOrEqual(bound);
        }
      }
    }
    // quase sempre há lugar
    expect(placed / asked).toBeGreaterThan(0.8);
  });

  it("gold grows with the wave; the shrine never kills", () => {
    expect(detourGold("chest", 10)).toBeGreaterThan(detourGold("chest", 1));
    expect(shrineCost(100, 100)).toBe(25);
    expect(shrineCost(10, 100)).toBe(9);
    expect(shrineCost(1, 100)).toBe(0);
  });
});
