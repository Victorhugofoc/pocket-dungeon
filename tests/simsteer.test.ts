import { describe, expect, it } from "vitest";
import { DIRS, danger, dodgeDir, pickTarget, steer, techniqueAim, type BotEnemy, type BotWorld } from "../src/core/simsteer";

const world = (o: Partial<BotWorld> = {}): BotWorld => ({
  hero: { x: 0, z: 0, speed: 6.6, hpFrac: 1, reach: 15, keep: 0.75 },
  telegraphs: [], storms: [], healPools: [], healOrbs: [], loot: [], enemies: [], shots: [],
  arena: { x: 0, z: 0, r: 30 }, blocked: () => false, ...o,
});
const enemy = (x: number, z: number, o: Partial<BotEnemy> = {}): BotEnemy => ({ x, z, radius: 0.6, reach: 1.4, boss: false, champion: false, ...o });
const at = (i: number) => DIRS[i];

describe("danger", () => {
  it("counts a circle that fires soon, not one that fires late, and not the safe middle of a ring", () => {
    const soon = world({ telegraphs: [{ kind: "circle", x: 0, z: 0, r: 3, inner: 0, left: 0.5 }] });
    const late = world({ telegraphs: [{ kind: "circle", x: 0, z: 0, r: 3, inner: 0, left: 2 }] });
    const ring = world({ telegraphs: [{ kind: "circle", x: 0, z: 0, r: 6, inner: 4, left: 0.5 }] });
    expect(danger(soon, 1, 0, 0.5, 0.35)).toBeGreaterThanOrEqual(60);
    expect(danger(late, 1, 0, 0.5, 0.35)).toBe(0);
    expect(danger(ring, 0, 0, 0.5, 0.35)).toBe(0);
    expect(danger(ring, 5, 0, 0.5, 0.35)).toBeGreaterThanOrEqual(60);
  });

  it("reads rect and cone along their angle (sin a, cos a)", () => {
    const rect = world({ telegraphs: [{ kind: "rect", x: 0, z: 0, angle: 0, length: 10, width: 2, left: 0.3 }] });
    expect(danger(rect, 0, 5, 0.5, 0.35)).toBeGreaterThan(0);
    expect(danger(rect, 5, 5, 0.5, 0.35)).toBe(0);
    const cone = world({ telegraphs: [{ kind: "cone", x: 0, z: 0, angle: Math.PI / 2, length: 8, half: 0.4, left: 0.3 }] });
    expect(danger(cone, 5, 0, 0.5, 0.35)).toBeGreaterThan(0);
    expect(danger(cone, -5, 0, 0.5, 0.35)).toBe(0);
  });

  it("sees a projectile on its way, the clearing edge and obstacles", () => {
    const shot = world({ shots: [{ x: -5, z: 0, vx: 20, vz: 0, r: 0.3 }] });
    expect(danger(shot, 0, 0, 0.5, 0.35)).toBeGreaterThan(0);
    expect(danger(shot, 0, 3, 0.5, 0.35)).toBe(0);
    expect(danger(world(), 29.8, 0, 0.5, 0.35)).toBeGreaterThanOrEqual(200);
    expect(danger(world({ blocked: (x) => x > 2 }), 3, 0, 0.5, 0.35)).toBeGreaterThan(0);
  });
});

describe("steer", () => {
  it("walks out of a circle about to fire", () => {
    const w = world({ telegraphs: [{ kind: "circle", x: 0, z: 0, r: 2, inner: 0, left: 0.4 }] });
    const d = at(steer(w, -1));
    expect(Math.hypot(d.x, d.z)).toBeCloseTo(1);
  });

  it("keeps about 75% of its reach from the target", () => {
    const close = at(steer(world({ enemies: [enemy(3, 0)] }), -1));
    expect(close.x).toBeLessThan(0); // perto demais: recua
    const far = at(steer(world({ enemies: [enemy(25, 0)] }), -1));
    expect(far.x).toBeGreaterThan(0); // longe: avança
  });

  it("focuses the boss over a nearer enemy", () => {
    const boss = enemy(10, 0, { boss: true, radius: 2 });
    expect(pickTarget(world({ enemies: [enemy(2, 0), boss] }))).toBe(boss);
  });

  it("walks toward a heal orb only when hurt", () => {
    const orb = { x: 0, z: 10, left: 10 };
    expect(at(steer(world({ hero: { ...world().hero, hpFrac: 0.4 }, healOrbs: [orb] }), -1)).z).toBeGreaterThan(0);
    const s = steer(world({ healOrbs: [orb] }), -1);
    expect(s).toBe(DIRS.length - 1);
  });
});

describe("dodge and technique", () => {
  it("dodges out of a telegraph to a safe spot, but not away from plain melee bodies", () => {
    const tg = world({ telegraphs: [{ kind: "circle", x: 0, z: 0, r: 2.5, inner: 0, left: 0.3 }] });
    expect(dodgeDir(tg, 4.4)).not.toBeNull();
    const crowd = world({ enemies: [enemy(1, 0), enemy(-1, 0), enemy(0, 1), enemy(0, -1)] });
    expect(dodgeDir(crowd, 4.4)).toBeNull();
  });

  it("blinks to escape danger or to cut a line of 3, never into danger", () => {
    const line = world({ enemies: [enemy(3, 0), enemy(5, 0), enemy(7, 0)] });
    const aim = techniqueAim(line, "blink", { range: 10, width: 2 });
    expect(aim && aim.x).toBeCloseTo(10);
    expect(techniqueAim(world({ enemies: [enemy(5, 0)] }), "blink", { range: 10 })).toBeNull();
  });

  it("rift and fan wait for a group or the boss", () => {
    const one = world({ enemies: [enemy(5, 0)] });
    expect(techniqueAim(one, "rift", { range: 12, radius: 6 })).toBeNull();
    const three = world({ enemies: [enemy(5, 0), enemy(6, 1), enemy(5, -1)] });
    expect(techniqueAim(three, "rift", { range: 12, radius: 6 })).not.toBeNull();
    expect(techniqueAim(world({ enemies: [enemy(5, 0, { boss: true })] }), "fan", { range: 10 })).not.toBeNull();
  });

  it("leaps on the boss only when the landing is safe", () => {
    const boss = enemy(6, 0, { boss: true, radius: 2 });
    expect(techniqueAim(world({ enemies: [boss] }), "leap", { range: 10, radius: 3 })).toEqual({ x: 6, z: 0 });
    const hot = world({ enemies: [boss], telegraphs: [{ kind: "circle", x: 6, z: 0, r: 3, inner: 0, left: 0.3 }] });
    expect(techniqueAim(hot, "leap", { range: 10, radius: 3 })).toBeNull();
  });
});
