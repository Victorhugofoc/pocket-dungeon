import { describe, expect, it } from "vitest";
import { Rng, hashStr, makeNoise2D } from "../src/core/rng";
import { generateItem, itemScore, RARITIES, rollRarity } from "../src/core/items";
import { armorReduction, computeStats, xpToNext } from "../src/core/stats";
import { generateZone, ObstacleGrid, distToPath } from "../src/core/worldgen";
import { loadSave, newSave, writeSave, SAVE_KEY, type Storage } from "../src/core/save";
import { HEROES, HERO_ORDER } from "../src/data/heroes";
import { BOSSES, ENEMIES } from "../src/data/enemies";
import { RELICS } from "../src/data/relics";
import { ZONES, ZONE_ORDER } from "../src/data/zones";
import { TUNING } from "../src/data/tuning";

const noAttrs = { forca: 0, vigor: 0, agilidade: 0, foco: 0 };

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
    const s = computeStats(1, noAttrs, [HEROES.varok.stats]);
    expect(s.maxHp).toBe(Math.round(TUNING.hero.baseHp * 1.6));
    expect(s.damage).toBeCloseTo(TUNING.hero.baseDamage * 1.35);
  });
  it("nível, atributos e relíquias aumentam o poder", () => {
    const base = computeStats(1, noAttrs, []);
    const lvl = computeStats(10, noAttrs, []);
    const str = computeStats(10, { ...noAttrs, forca: 10 }, []);
    const relic = computeStats(10, noAttrs, [RELICS.glass_cannon.stats]);
    expect(lvl.damage).toBeGreaterThan(base.damage);
    expect(lvl.maxHp).toBeGreaterThan(base.maxHp);
    expect(str.damage).toBeCloseTo(lvl.damage * 1.3);
    expect(relic.damage).toBeCloseTo(lvl.damage * 1.5);
    expect(relic.maxHp).toBeLessThan(lvl.maxHp);
  });
  it("armadura tem retorno decrescente e limites seguros", () => {
    expect(armorReduction(0)).toBe(0);
    expect(armorReduction(100)).toBeCloseTo(0.5);
    expect(armorReduction(1e6)).toBeLessThan(1);
    const s = computeStats(1, noAttrs, [{ dodge: 5, critChance: 5, cdrPct: 5, maxHpPct: -5 }]);
    expect(s.dodge).toBeLessThanOrEqual(0.6);
    expect(s.critChance).toBeLessThanOrEqual(0.75);
    expect(s.cooldownMult).toBeGreaterThanOrEqual(0.4);
    expect(s.maxHp).toBeGreaterThan(0);
  });
  it("a curva de XP é crescente", () => {
    for (let l = 1; l < 59; l++) expect(xpToNext(l + 1)).toBeGreaterThan(xpToNext(l));
    expect(xpToNext(1)).toBe(100);
  });
});

describe("itens", () => {
  it("o mesmo seed gera os mesmos atributos", () => {
    const a = generateItem(new Rng(5), 8, 0);
    const b = generateItem(new Rng(5), 8, 0);
    expect(a.stats).toEqual(b.stats);
    expect(a.rarity).toBe(b.rarity);
    expect(a.id).not.toBe(b.id);
  });
  it("raridade define a quantidade de afixos e respeita o mínimo", () => {
    const r = new Rng(11);
    for (let i = 0; i < 300; i++) {
      const it = generateItem(r, 5, 0, { slot: "weapon", minRarity: "raro" });
      expect(RARITIES.indexOf(it.rarity)).toBeGreaterThanOrEqual(2);
      expect(Object.keys(it.stats).length).toBeGreaterThanOrEqual(2);
      expect(it.stats.damage).toBeGreaterThan(0);
    }
  });
  it("nível de item mais alto vale mais, na média", () => {
    const avg = (ilvl: number) => {
      const r = new Rng(3);
      let s = 0;
      for (let i = 0; i < 400; i++) s += itemScore(generateItem(r, ilvl, 0));
      return s / 400;
    };
    expect(avg(10)).toBeGreaterThan(avg(1) * 1.5);
  });
  it("sorte de loot aumenta as raridades altas", () => {
    const count = (mf: number) => {
      const r = new Rng(21);
      let n = 0;
      for (let i = 0; i < 4000; i++) if (rollRarity(r, mf) !== "comum") n++;
      return n;
    };
    expect(count(1)).toBeGreaterThan(count(0));
  });
});

describe("geração de zona", () => {
  it("é determinística por seed e muda com o seed", () => {
    const a = generateZone(ZONES.bosque, 123);
    const b = generateZone(ZONES.bosque, 123);
    const c = generateZone(ZONES.bosque, 124);
    expect(a).toEqual(b);
    expect(a.camps).not.toEqual(c.camps);
  });
  it("todas as zonas têm acampamentos suficientes, dentro do mapa e longe do início", () => {
    for (const id of ZONE_ORDER) {
      for (const seed of [1, 99, 123456]) {
        const L = generateZone(ZONES[id], seed);
        const half = L.size / 2;
        expect(L.camps.length).toBeGreaterThanOrEqual(16);
        for (const c of L.camps) {
          expect(Math.abs(c.x)).toBeLessThan(half);
          expect(Math.abs(c.z)).toBeLessThan(half);
          expect(Math.hypot(c.x - L.spawn.x, c.z - L.spawn.z)).toBeGreaterThanOrEqual(26);
          expect(c.level).toBeGreaterThanOrEqual(ZONES[id].level);
          expect(c.level).toBeLessThanOrEqual(ZONES[id].level + 4);
          expect(c.spawns.length).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });
  it("o caminho, o início e a arena ficam livres de obstáculos sólidos", () => {
    const L = generateZone(ZONES.cripta, 77);
    const inner = L.size / 2 - TUNING.world.margin;
    for (const o of L.obstacles) {
      if (!o.solid || Math.abs(o.x) > inner || Math.abs(o.z) > inner) continue;
      expect(distToPath(o.x, o.z, L.path)).toBeGreaterThan(o.r);
      expect(Math.hypot(o.x - L.boss.x, o.z - L.boss.z)).toBeGreaterThan(L.bossRadius);
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

describe("save", () => {
  const mem = (): Storage & { data: Record<string, string> } => ({
    data: {},
    getItem(k) { return this.data[k] ?? null; },
    setItem(k, v) { this.data[k] = v; },
    removeItem(k) { delete this.data[k]; },
  });
  it("grava e lê de volta", () => {
    const st = mem();
    const s = newSave("zephyr", 9);
    s.level = 7;
    s.bag.push(generateItem(new Rng(1), 3, 0));
    expect(writeSave(st, s)).toBe(true);
    expect(loadSave(st)).toEqual(s);
  });
  it("ignora save corrompido ou ausente", () => {
    const st = mem();
    expect(loadSave(st)).toBeNull();
    st.data[SAVE_KEY] = "{nao é json";
    expect(loadSave(st)).toBeNull();
    st.data[SAVE_KEY] = JSON.stringify({ v: 99 });
    expect(loadSave(st)).toBeNull();
    expect(loadSave(undefined)).toBeNull();
  });
});
