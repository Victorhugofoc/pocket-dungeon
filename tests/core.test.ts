import { describe, expect, it } from "vitest";
import { Rng, hashStr, makeNoise2D } from "../src/core/rng";
import { killReward, survivorReward, waveMods } from "../src/core/wave";
import { armorReduction, computeStats, effectiveRegen, stackChance, stackMultiplier } from "../src/core/stats";
import { generateZone, ObstacleGrid, distToPath } from "../src/core/worldgen";
import { HEROES, HERO_ORDER } from "../src/data/heroes";
import { BOSSES, ENEMIES } from "../src/data/enemies";
import { RELICS } from "../src/data/relics";
import { ZONES, ZONE_ORDER } from "../src/data/zones";
import { TUNING } from "../src/data/tuning";
import { TERRAIN } from "../src/data/terrain";

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
  it("zonas apontam para inimigos que existem", () => {
    for (const id of ZONE_ORDER) {
      const z = ZONES[id];
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

describe("M21-15: uma arena por zona", () => {
  it("as ondas 1 a 4 na mesma arena, o herói começa no meio, a do chefe acima com vão curto e trilha livre", () => {
    for (const zid of ZONE_ORDER) {
      for (let seed = 1; seed <= 40; seed++) {
        const L = generateZone(ZONES[zid], seed);
        const [arena] = L.segments;
        for (const sg of L.segments.slice(1, 4)) expect(sg).toMatchObject({ x: arena.x, z: arena.z, r: arena.r });
        expect(arena.r).toBeCloseTo(TUNING.world.arenaRadius, 9);
        expect(L.spawn).toEqual({ x: arena.x, z: arena.z });
        const boss = L.segments[4];
        const gap = Math.hypot(boss.x - arena.x, boss.z - arena.z) - arena.r - boss.r;
        const [g0, g1] = TUNING.world.arena.gap;
        expect(gap, `${zid} ${seed}`).toBeGreaterThan(g0 - 0.01);
        expect(gap, `${zid} ${seed}`).toBeLessThan(g1 + 0.01);
        expect(boss.z, `${zid} ${seed}`).toBeLessThan(arena.z);
        // a trilha liga as duas bordas, sem pedra no caminho
        expect(Math.hypot(L.path[0].x - arena.x, L.path[0].z - arena.z)).toBeCloseTo(arena.r, 3);
        const end = L.path[L.path.length - 1];
        expect(Math.hypot(end.x - boss.x, end.z - boss.z)).toBeCloseTo(boss.r, 3);
        const grid = new ObstacleGrid(L.obstacles);
        for (let d = 0; d < 1; d += 0.05) {
          const a = L.path[0], c = end;
          expect(grid.hits(a.x + (c.x - a.x) * d, a.z + (c.z - a.z) * d, 1), `${zid} ${seed} ${d}`).toBe(false);
        }
      }
    }
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
    expect(s.cooldownMult).toBeGreaterThanOrEqual(0.35);
    expect(s.maxHp).toBeGreaterThan(0);
  });
  it("pilhas com retorno decrescente como modifiers.lua (M20-12)", () => {
    // positivos em pool: +20% e +20% = +36%; negativo multiplica: × 0,9
    expect(stackMultiplier([0.2, 0.2])).toBeCloseTo(1.36);
    expect(stackMultiplier([0.2, -0.1])).toBeCloseTo(1.08);
    const two = computeStats([{ damagePct: 0.2 }, { damagePct: 0.2 }]);
    expect(two.damage).toBeCloseTo(TUNING.hero.baseDamage * 1.36);
    // a mesma fonte soma antes do pool (uma melhoria = uma fonte)
    expect(computeStats([{ damagePct: 0.4 }]).damage).toBeCloseTo(TUNING.hero.baseDamage * 1.4);
    // chances: 1 - Π(1 - p); a esquiva para em 60%
    expect(stackChance([0.05, 0.05])).toBeCloseTo(0.0975);
    expect(computeStats([{ dodge: 0.5 }, { dodge: 0.5 }]).dodge).toBeCloseTo(0.6);
    expect(computeStats([{ deathHealChance: 0.05 }, { deathHealChance: 0.08 }]).deathHealChance).toBeCloseTo(1 - 0.95 * 0.92);
    // crítico: a base de 5% entra no pool
    expect(computeStats([{ critChance: 0.1 }]).critChance).toBeCloseTo(1 - 0.95 * 0.9);
    // regeneração com teto suave em 2/s: 2 × (1 - e^(-raw/2))
    expect(computeStats([{ regen: 1 }]).regen).toBeCloseTo(2 * (1 - Math.exp(-0.5)));
    expect(effectiveRegen(100)).toBeLessThanOrEqual(2);
    expect(effectiveRegen(4)).toBeLessThan(2);
    // recarga: −10% e −10% = × 0,81; piso de 35%
    expect(computeStats([{ cdrPct: 0.1 }, { cdrPct: 0.1 }]).cooldownMult).toBeCloseTo(0.81);
    expect(computeStats([{ cdrPct: 0.1 }, { cdrPct: 0.1 }]).cooldownValues).toEqual([-0.1, -0.1]);
    // atributos novos: bônus acima de 1
    const n = computeStats([{ techniqueDamagePct: 0.2, followThroughPct: 0.15, knockbackPct: 0.25, survivorRewardPct: 0.15 }]);
    expect(n.techniqueDamage).toBeCloseTo(1.2);
    expect(n.followThrough).toBeCloseTo(0.15);
    expect(n.knockback).toBeCloseTo(0.25);
    expect(n.survivor).toBeCloseTo(1.15);
    expect(computeStats([]).knockback).toBe(0);
  });
  it("Champion's Bounty e Survivor's Grace mexem na recompensa (rewards.lua)", () => {
    const m = waveMods(3, "normal", null);
    const t = { gold: ENEMIES.orc.gold, xp: ENEMIES.orc.xp, champion: true, bossWave: null, noReward: false };
    const base = killReward(t, m, 1);
    const up = killReward(t, m, 1, { gold: 2, xp: 2 });
    expect(up.gold).toBeGreaterThanOrEqual(base.gold * 2 - 1);
    expect(up.xp).toBeGreaterThanOrEqual(base.xp * 2 - 1);
    expect(killReward({ ...t, champion: false }, m, 1, { gold: 2, xp: 2 })).toEqual(killReward({ ...t, champion: false }, m, 1));
    const sv = survivorReward({ gold: 100, xp: 100 }, false, m, 1);
    const sv2 = survivorReward({ gold: 100, xp: 100 }, false, m, 1, { gold: 1, xp: 1 }, 2);
    expect(sv2.gold).toBeGreaterThanOrEqual(sv.gold * 2 - 1);
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
  it("toda zona tem 5 trechos dentro do mapa: 4 na arena das ondas e a arena do chefe, sem se tocar", () => {
    for (const id of ZONE_ORDER) {
      for (let seed = 1; seed <= 400; seed += 7) {
        const L = generateZone(ZONES[id], seed * 7919);
        const inner = L.size / 2 - TUNING.world.margin;
        expect(L.segments.length).toBe(5);
        expect(L.segments[4]).toMatchObject({ x: L.boss.x, z: L.boss.z, r: L.bossRadius });
        for (const s of L.segments) {
          expect(Math.abs(s.x) + s.r).toBeLessThan(inner);
          expect(Math.abs(s.z) + s.r).toBeLessThan(inner);
        }
        const [a, , , , b] = L.segments;
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(a.r + b.r + 1);
        // continuar na onda do chefe: a entrada fica fora da arena dele
        expect(Math.hypot(b.entry.x - b.x, b.entry.z - b.z)).toBeGreaterThan(b.r);
      }
    }
  });
  it("o caminho, o início, os trechos e a arena ficam livres de obstáculos sólidos", () => {
    const L = generateZone(ZONES.cripta, 77);
    const inner = L.size / 2 - TUNING.world.margin;
    for (const o of L.obstacles) {
      if (!o.solid || o.choke || Math.abs(o.x) > inner || Math.abs(o.z) > inner) continue;
      expect(distToPath(o.x, o.z, L.path)).toBeGreaterThan(o.r);
      for (const s of L.segments) expect(Math.hypot(o.x - s.x, o.z - s.z)).toBeGreaterThan(s.r);
    }
  });
  it("M21-10/M21-15: cada onda da arena tem fosso e barris, a arena tem um gargalo; a do chefe nada; sem se tocar", () => {
    for (const id of ZONE_ORDER) {
      for (let seed = 1; seed <= 200; seed += 13) {
        const L = generateZone(ZONES[id], seed * 104729);
        expect(L.segments[4].terrain).toBeUndefined();
        for (const sg of L.segments.slice(0, -1)) {
          const t = sg.terrain!;
          expect(t).toBeDefined();
          const { pit, barrels } = t;
          // fosso dentro da clareira, longe da borda onde os inimigos nascem
          expect(Math.hypot(pit.x - sg.x, pit.z - sg.z) + pit.r).toBeLessThan(sg.r - 4);
          // o centro fica livre para o herói
          expect(Math.hypot(pit.x - sg.x, pit.z - sg.z)).toBeGreaterThan(pit.r + 2);
          const rocks = L.obstacles.filter((o) => o.choke && Math.hypot(o.x - sg.x, o.z - sg.z) < sg.r);
          expect(rocks.length).toBe(TERRAIN.choke.rocksPerSide * 2);
          for (const o of rocks) {
            expect(o.solid).toBe(true);
            expect(Math.hypot(o.x - sg.x, o.z - sg.z) + o.r).toBeLessThan(sg.r - 4);
            expect(Math.hypot(o.x - pit.x, o.z - pit.z)).toBeGreaterThan(o.r + pit.r + 1);
          }
          expect(barrels.length).toBeGreaterThanOrEqual(2);
          for (const b of barrels) {
            expect(Math.hypot(b.x - sg.x, b.z - sg.z)).toBeLessThan(sg.r - 2);
            expect(Math.hypot(b.x - pit.x, b.z - pit.z)).toBeGreaterThan(pit.r + TERRAIN.barrel.radius);
            for (const o of rocks) expect(Math.hypot(b.x - o.x, b.z - o.z)).toBeGreaterThan(o.r + TERRAIN.barrel.radius);
          }
          // o vão do gargalo passa: um herói (raio 0,5) cabe entre as duas fileiras
          const grid = new ObstacleGrid(rocks);
          const mid = { x: (rocks[0].x + rocks[TERRAIN.choke.rocksPerSide].x) / 2, z: (rocks[0].z + rocks[TERRAIN.choke.rocksPerSide].z) / 2 };
          expect(grid.hits(mid.x, mid.z, 0.5)).toBe(false);
        }
      }
    }
  });
  it("a decoração do terreno não muda a decoração de antes (stream próprio)", () => {
    const L = generateZone(ZONES.bosque, 99);
    expect(L.obstacles.filter((o) => o.choke).length).toBe(TERRAIN.choke.rocksPerSide * 2);
    // M21-15: cada onda com o seu fosso
    const pits = L.segments.slice(0, 4).map((sg) => sg.terrain!.pit);
    expect(new Set(pits.map((p) => `${p.x},${p.z}`)).size).toBe(4);
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
