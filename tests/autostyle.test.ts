import { describe, expect, it } from "vitest";
import { arcHalfAngle, autoPattern, autoReach, forkAngles, patternCounts } from "../src/core/autostyle";
import { computeStats } from "../src/core/stats";
import { AUTO_SHOT } from "../src/data/autostyle";
import { HEROES } from "../src/data/heroes";
import { px } from "../src/core/techniques";

const deg = (d: number) => (d * Math.PI) / 180;

describe("estilo do ataque básico (H8, auto_attack.lua)", () => {
  it("cada herói tem o estilo de characters.lua", () => {
    const got = Object.fromEntries(Object.values(HEROES).map((h) => [h.id, h.style]));
    expect(got).toEqual({
      frostine: "frost", kaelen: "storm", aurelius: "normal", ignis: "firefan", zephyr: "gunslinger",
      varok: "hammer", umbra: "shadowblade", seraph: "shieldthrow", vesper: "venom",
    });
    // as formas do original: Kaelen um raio, Aurelius sem atravessar, Ignis em arco, o escudo não atravessa
    expect(HEROES.kaelen.auto.ricochet ?? 0).toBe(0);
    expect(HEROES.aurelius.auto.pierce ?? 0).toBe(0);
    expect(HEROES.ignis.auto.kind).toBe("melee");
    expect(HEROES.seraph.auto.pierce ?? 0).toBe(0);
  });

  it("Auto.pattern: os tiros somam (1 + Cone + Double), o Double lado a lado no tiro do meio", () => {
    expect(autoPattern(0, 0, 0)).toEqual([{ side: 0, angle: 0, fan: false }]);
    const cone = autoPattern(2, 0, 0);
    expect(cone.map((s) => s.angle)).toEqual([-AUTO_SHOT.coneStep, 0, AUTO_SHOT.coneStep]);
    expect(cone.map((s) => s.fan)).toEqual([true, false, true]);
    const dbl = autoPattern(0, 2, 0);
    expect(dbl.map((s) => s.side)).toEqual([px(-10), 0, px(10)]);
    // fileira de no máximo 24 px: com 4 tiros o espaço cai para 8 px
    const four = autoPattern(0, 4, 0);
    expect(four[4].side - four[0].side).toBeCloseTo(px(24));
    expect(autoPattern(1, 1, 0)).toHaveLength(3);
  });

  it("o Kaelen solta um raio só, o Seraph um escudo só; o Double da Vesper é acúmulo", () => {
    expect(patternCounts("storm", 3, 2)).toEqual({ cone: 0, double: 0 });
    expect(patternCounts("shieldthrow", 3, 2)).toEqual({ cone: 0, double: 0 });
    expect(patternCounts("venom", 3, 2)).toEqual({ cone: 3, double: 0 });
    expect(patternCounts("frost", 3, 2)).toEqual({ cone: 3, double: 2 });
  });

  it("arco: +12% de alcance por Pierce, +12,5° de meio-arco por Cone, entre 20° e 175°; escudo +15% por Cone", () => {
    expect(autoReach("hammer", 10, 2, 0)).toBeCloseTo(12.4);
    expect(autoReach("shieldthrow", 10, 2, 2)).toBeCloseTo(13);
    expect(autoReach("normal", 10, 3, 3)).toBe(10);
    expect(arcHalfAngle("hammer", deg(65), 2)).toBeCloseTo(deg(90));
    expect(arcHalfAngle("hammer", deg(170), 4)).toBeCloseTo(deg(175));
    expect(forkAngles(0, 3, 1)).toEqual([1, -1, 2]);
  });

  it("stats.lua: contagens com teto; Heavy Shot vira -8% de ritmo no arco e Big Iron no Zephyr", () => {
    const heavy = { autoProjectileSpeedPct: -0.15 };
    const many = Array.from({ length: 6 }, () => ({ doubleShot: 1, coneShot: 1, pierce: 1 }));
    const c = computeStats(many);
    expect([c.doubleShot, c.coneShot, c.pierce]).toEqual([4, 4, 3]);
    const normal = computeStats([heavy]);
    expect(normal.projectileSpeed).toBeCloseTo(0.85);
    expect(normal.attackSpeed).toBeCloseTo(1);
    const hammer = computeStats([heavy, heavy], "hammer");
    expect(hammer.projectileSpeed).toBe(1);
    expect(hammer.attackSpeed).toBeCloseTo(0.84);
    const gun = computeStats([heavy], "gunslinger");
    expect(gun.projectileSpeed).toBe(1);
    expect(gun.pointBlank).toBeCloseTo(0.10);
    expect(computeStats([{ fanShots: 2 }]).fanShots).toBe(2);
  });
});
