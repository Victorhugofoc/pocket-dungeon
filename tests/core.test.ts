import { describe, expect, it } from "vitest";
import { Rng, hashStr, makeNoise2D } from "../src/core/rng";
import { armorReduction, computeStats } from "../src/core/stats";
import { generateZone, ObstacleGrid, distToPath } from "../src/core/worldgen";
import { HEROES, HERO_ORDER } from "../src/data/heroes";
import { BOSSES, ENEMIES } from "../src/data/enemies";
import { RELICS } from "../src/data/relics";
import { ZONES, ZONE_ORDER } from "../src/data/zones";
import { TUNING } from "../src/data/tuning";

describe("rng", () => {
  it("é determinístico por seed", () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });
  it("streams por rótulo são independentes", () => {
    expect(Rng.of(1, "camps").next()).not.toBe(Rng.of(1, "decor").next());
    expect(hashStr("bosque")).not.toBe(hashStr("cripta"));
  });
  it("fica em [0,1) e int respeita os limites", () => {
    const r = new Rng(7);
    for (let i = 0; i < 2000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const n = r.int(3, 6);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(6);
    }
  });
  it("noise é contínuo e limitado", () => {
    const n = makeNoise2D(9);
    for (let i = 0; i < 200; i++) {
      const v = n(i * 0.37, i * 0.11);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(Math.abs(v - n(i * 0.37 + 0.001, i * 0.11))).toBeLessThan(0.01);
    }
  });
});

describe("dados", () => {
  it("são os 9 heróis do Dungeon Reign", () => {
    expect(HERO_ORDER).toHaveLength(9);
    for (const id of HERO_ORDER) {
      expect(HEROES[id].id).toBe(id);
      expect(HEROES[id].technique.cooldown).toBeGreaterThan(0);
    }
  });
  it("zonas apontam para inimigos e chefes que existem", () => {
    for (const id of ZONE_ORDER) {
      const z = ZONES[id];
      expect(BOSSES[z.boss]).toBeDefined();
      for (const [e] of z.enemies) expect(ENEMIES[e]).toBeDefined();
      expect(z.decor.some((d) => d[2])).toBe(true);
    }
    for (const e of Object.values(ENEMIES)) {
      if (e.summon) expect(ENEMIES[e.summon.id]).toBeDefined();
      if (e.splitInto) expect(ENEMIES[e.splitInto.id]).toBeDefined();
    }
    for (const b of Object.values(BOSSES)) for (const p of b.patterns) if (p.minion) expect(ENEMIES[p.minion]).toBeDefined();
  });
  it("zonas sobem de nível em ordem", () => {
    const levels = ZONE_ORDER.map((id) => ZONES[id].level);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
  });
});

describe("atributos", () => {
  it("herói nível 1 sem nada usa a base + bônus do herói", () => {
    const s = computeStats([HEROES.varok.stats]);
    expect(s.maxHp).toBe(Math.round(TUNING.hero.baseHp * 1.8));
    expect(s.damage).toBeCloseTo(TUNING.hero.baseDamage * 1.95);
  });
  it("relíquias e melhorias mudam o poder; o nível sozinho não", () => {
    const base = computeStats([]);
    const relic = computeStats([RELICS.glass_cannon.stats]);
    const up = computeStats([{ damage: 2, maxHp: 20 }]);
    expect(relic.damage).toBeCloseTo(base.damage * 1.5);
    expect(relic.maxHp).toBeLessThan(base.maxHp);
    expect(up.damage).toBeCloseTo(TUNING.hero.baseDamage + 2);
    expect(up.maxHp).toBe(TUNING.hero.baseHp + 20);
  });
  it("armadura tem retorno decrescente e limites seguros", () => {
    expect(armorReduction(0)).toBe(0);
    expect(armorReduction(100)).toBeCloseTo(0.5);
    expect(armorReduction(1e6)).toBeLessThan(1);
    const s = computeStats([{ dodge: 5, critChance: 5, cdrPct: 5, maxHpPct: -5 }]);
    expect(s.dodge).toBeLessThanOrEqual(0.6);
    expect(s.critChance).toBeLessThanOrEqual(0.75);
    expect(s.cooldownMult).toBeGreaterThanOrEqual(0.4);
    expect(s.maxHp).toBeGreaterThan(0);
  });
});

describe("geração de zona", () => {
  it("é determinística por seed e muda com o seed", () => {
    const a = generateZone(ZONES.bosque, 123);
    const b = generateZone(ZONES.bosque, 123);
    const c = generateZone(ZONES.bosque, 124);
    expect(a).toEqual(b);
    expect(a.segments).not.toEqual(c.segments);
  });
  it("toda zona tem 5 trechos em sequência, sem se tocar, dentro do mapa e longe do início; o último é a arena", () => {
    for (const id of ZONE_ORDER) {
      for (let seed = 1; seed <= 400; seed += 7) {
        const L = generateZone(ZONES[id], seed * 7919);
        const inner = L.size / 2 - TUNING.world.margin;
        expect(L.segments.length).toBe(5);
        expect(L.segments[4]).toMatchObject({ x: L.boss.x, z: L.boss.z, r: L.bossRadius });
        L.segments.forEach((s, i) => {
          expect(Math.abs(s.x) + s.r).toBeLessThan(inner + 8);
          expect(Math.abs(s.z) + s.r).toBeLessThan(inner + 8);
          // o início fica fora do 1º trecho: a onda 1 começa quando o herói entra nele
          expect(Math.hypot(s.x - L.spawn.x, s.z - L.spawn.z)).toBeGreaterThan(s.r + 4);
          // a entrada fica fora da própria clareira
          expect(Math.hypot(s.entry.x - s.x, s.entry.z - s.z)).toBeGreaterThan(s.r);
          for (const t of L.segments.slice(i + 1)) expect(Math.hypot(s.x - t.x, s.z - t.z)).toBeGreaterThan(s.r + t.r + 1);
        });
      }
    }
  });
  it("o caminho, o início, os trechos e a arena ficam livres de obstáculos sólidos", () => {
    const L = generateZone(ZONES.cripta, 77);
    const inner = L.size / 2 - TUNING.world.margin;
    for (const o of L.obstacles) {
      if (!o.solid || Math.abs(o.x) > inner || Math.abs(o.z) > inner) continue;
      expect(distToPath(o.x, o.z, L.path)).toBeGreaterThan(o.r);
      for (const s of L.segments) expect(Math.hypot(o.x - s.x, o.z - s.z)).toBeGreaterThan(s.r);
    }
  });
  it("a grade empurra para fora dos obstáculos", () => {
    const grid = new ObstacleGrid([{ x: 0, z: 0, r: 1, kind: "rock", scale: 1, rot: 0, solid: true }]);
    const p = { x: 0.5, z: 0 };
    grid.resolve(p, 0.5);
    expect(Math.hypot(p.x, p.z)).toBeCloseTo(1.5);
    expect(grid.hits(0.2, 0, 0.1)).toBe(true);
    expect(grid.hits(3, 3, 0.1)).toBe(false);
  });
});
