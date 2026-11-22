import { describe, expect, it } from "vitest";
import { levelScale, milestoneTotals, stackMultiplier, techniqueStats, type TechContext } from "../src/core/techniques";
import { frostModify, IcicleCounter, newFrostTarget } from "../src/core/frost";
import { DR_PX_PER_M, FROST, TECHNIQUES, TECHNIQUE_ORDER } from "../src/data/techniques";
import { HEROES } from "../src/data/heroes";

const ctx: TechContext = { cooldownMult: 1, area: 1, range: 1, autoDamage: 1 };

describe("técnicas", () => {
  it("exclusivas de herói como spell_stats.lua: Permafrost, Static Charge e Time Loop", () => {
    const wall = techniqueStats("glacial_wall", 1, ctx);
    const wallP = techniqueStats("glacial_wall", 1, { ...ctx, permafrost: 1 });
    expect(wallP.freeze).toBeCloseTo((wall.freeze ?? 0) + 1);
    expect(wallP.duration).toBeCloseTo((wall.duration ?? 0) + 2);
    const step = techniqueStats("storm_step", 1, ctx);
    const stepS = techniqueStats("storm_step", 1, { ...ctx, staticCharge: 1 });
    expect(stepS.trail).toBeCloseTo((step.trail ?? 0) + 1);
    expect(step.trailMult).toBeUndefined();
    expect(stepS.trailMult).toBe(2);
    expect(techniqueStats("time_rift", 1, { ...ctx, riftDuration: 1 }).duration).toBeCloseTo((techniqueStats("time_rift", 1, ctx).duration ?? 0) + 1);
    // a exclusiva de um não mexe na técnica do outro
    expect(techniqueStats("time_rift", 1, { ...ctx, permafrost: 1 }).duration).toBe(techniqueStats("time_rift", 1, ctx).duration);
  });

  it("há uma técnica por herói e todas têm 4 marcos (níveis 2 a 5)", () => {
    expect(TECHNIQUE_ORDER.length).toBe(9);
    const heroes = new Set(TECHNIQUE_ORDER.map((id) => TECHNIQUES[id].hero));
    for (const h of Object.keys(HEROES)) expect(heroes.has(h)).toBe(true);
    for (const id of TECHNIQUE_ORDER) expect(TECHNIQUES[id].milestones.map((m) => m.level)).toEqual([2, 3, 4, 5]);
  });

  it("escala de nível igual à do Dungeon Reign (nível 5 = ×3,25)", () => {
    expect(levelScale(1)).toBe(1);
    expect(levelScale(5)).toBeCloseTo(3.25);
    expect(levelScale(9)).toBeCloseTo(3.25);
    expect(levelScale(0)).toBe(1);
  });

  it("dano no nível 1: (base + 8 × escala) / 8", () => {
    const expected: Record<string, number> = {
      storm_step: (18 + 8 * 0.45) / 8,
      time_rift: (20 + 8 * 0.6) / 8,
      glacial_wall: (10 + 8 * 0.3) / 8,
      execution_leap: 30 / 8,
      inferno_charge: (18 + 8 * 0.4) / 8,
      aegis: (21 + 8 * 0.585) / 8,
      brood: (9 + 8 * 0.3) / 8,
      fan_the_hammer: 1.0, // dano do ataque básico
      shadow_step: 3.0, // ×3 o ataque básico
    };
    for (const id of TECHNIQUE_ORDER) expect(techniqueStats(id, 1, ctx).damage).toBeCloseTo(expected[id], 6);
  });

  it("dano no nível 5: ×3,25 e +25% do marco do nível 4", () => {
    for (const id of TECHNIQUE_ORDER) {
      const l1 = techniqueStats(id, 1, ctx).damage;
      const l5 = techniqueStats(id, 5, ctx).damage;
      const dmgPct = milestoneTotals(TECHNIQUES[id], 5).damagePct;
      expect(l5).toBeCloseTo(l1 * 3.25 * (1 + dmgPct), 6); // um marco só: o pool é o próprio valor
    }
    expect(milestoneTotals(TECHNIQUES.glacial_wall, 5).damagePct).toBe(0);
    expect(milestoneTotals(TECHNIQUES.storm_step, 5).damagePct).toBeCloseTo(0.25);
  });

  it("técnicas do ataque básico seguem o multiplicador do herói", () => {
    const zephyr = techniqueStats("fan_the_hammer", 1, { ...ctx, autoDamage: HEROES.zephyr.auto.damage });
    expect(zephyr.damage).toBeCloseTo(HEROES.zephyr.auto.damage);
    expect(zephyr.shots).toBe(5);
    expect(techniqueStats("fan_the_hammer", 2, ctx).shots).toBe(6);
    expect(techniqueStats("shadow_step", 1, ctx).alwaysCrit).toBe(true);
  });

  it("converte pixels para metros e aplica área, alcance e recarga", () => {
    const wall = techniqueStats("glacial_wall", 1, ctx);
    expect(wall.length).toBeCloseTo(150 / DR_PX_PER_M);
    expect(wall.minRange).toBeCloseTo(50 / DR_PX_PER_M);
    expect(wall.maxRange).toBeCloseTo(200 / DR_PX_PER_M);
    expect(wall.duration).toBe(5);
    expect(wall.freeze).toBe(1);
    const wall2 = techniqueStats("glacial_wall", 2, { ...ctx, area: 1.1 });
    expect(wall2.length).toBeCloseTo((150 / DR_PX_PER_M) * 1.1 * 1.2);
    const wall3 = techniqueStats("glacial_wall", 3, { ...ctx, cooldownMult: 0.9 });
    expect(wall3.cooldown).toBeCloseTo(8 * 0.9 * 0.9);
    const step = techniqueStats("storm_step", 3, { ...ctx, range: 1.5 });
    expect(step.range).toBeCloseTo((200 / DR_PX_PER_M) * 1.5 * 1.2);
  });

  it("evolução no nível 5", () => {
    const wall = techniqueStats("glacial_wall", 5, ctx);
    expect(wall.evolved).toBe(true);
    expect(wall.duration).toBe(8);
    expect(wall.shatter).toBe(true);
    expect(techniqueStats("glacial_wall", 4, ctx).shatter).toBe(false);
    const leap = techniqueStats("execution_leap", 5, ctx);
    expect(leap.maxHpFraction).toBe(0.12);
    expect(techniqueStats("execution_leap", 1, ctx).maxHpFraction).toBe(0.08);
    expect(leap.cooldown).toBeCloseTo(14 * 0.9 * 0.7); // negativos se multiplicam (pool do Dungeon Reign)
    expect(techniqueStats("storm_step", 5, ctx).trail).toBe(4);
    expect(techniqueStats("storm_step", 5, ctx).shockRadius).toBeCloseTo(70 / DR_PX_PER_M);
    expect(techniqueStats("time_rift", 5, ctx).stun).toBe(1);
    expect(techniqueStats("brood", 5, ctx).spiders).toBe(3);
    expect(techniqueStats("brood", 5, ctx).duration).toBe(8);
    expect(techniqueStats("fan_the_hammer", 5, ctx).bounces).toBe(4);
    expect(techniqueStats("shadow_step", 5, ctx).echoFraction).toBe(0.6);
    expect(techniqueStats("aegis", 5, ctx).sanctumTime).toBe(4);
    expect(techniqueStats("inferno_charge", 5, ctx).fireTrail).toBe(3);
  });

  it("pool de percentuais igual ao do Dungeon Reign", () => {
    expect(stackMultiplier([0.2, 0.2])).toBeCloseTo(1.36);
    expect(stackMultiplier([-0.1, -0.3])).toBeCloseTo(0.63);
    expect(stackMultiplier([0.5, -0.5])).toBeCloseTo(0.75);
    expect(stackMultiplier([])).toBe(1);
  });

  it("recarga nunca cai abaixo de 35% do valor base pelos marcos", () => {
    expect(techniqueStats("execution_leap", 5, ctx).cooldown).toBeGreaterThan(14 * 0.35);
  });
});

describe("gelo da Frostine", () => {
  it("Estilhaçar: gelo em congelado dá o dobro e descongela; chefe não estilhaça", () => {
    const e = newFrostTarget(false, false);
    e.frozenUntil = 5;
    const r = frostModify(e, 10, { ice: true }, 1);
    expect(r.shatter).toBe(true);
    expect(r.amount).toBe(20);
    expect(e.frozenUntil).toBe(0);
    const again = frostModify(e, 10, { ice: true }, 1.1);
    expect(again.shatter).toBe(false);
    const boss = newFrostTarget(true, false);
    boss.frozenUntil = 5;
    expect(frostModify(boss, 10, { ice: true }, 1).shatter).toBe(false);
    const notIce = newFrostTarget(false, false);
    notIce.frozenUntil = 5;
    expect(frostModify(notIce, 10, { ice: false }, 1).amount).toBe(10);
  });

  it("Frio profundo: 3 acertos em 3 s congelam inimigo comum", () => {
    const e = newFrostTarget(false, false);
    expect(frostModify(e, 1, { ice: true }, 0).deepChill).toBe(false);
    expect(frostModify(e, 1, { ice: true }, 1).deepChill).toBe(false);
    expect(frostModify(e, 1, { ice: true }, 2).deepChill).toBe(true);
    // janela expirada recomeça a contagem
    const f = newFrostTarget(false, false);
    frostModify(f, 1, { ice: true }, 0);
    frostModify(f, 1, { ice: true }, 1);
    expect(frostModify(f, 1, { ice: true }, 4.5).deepChill).toBe(false);
    // chefes e campeões não congelam por acúmulo
    const c = newFrostTarget(false, true);
    for (let i = 0; i < 5; i++) expect(frostModify(c, 1, { ice: true }, i * 0.5).deepChill).toBe(false);
  });

  it("Quebradiço: 8 acúmulos em chefe ou campeão dão +30% por 4 s, a qualquer dano", () => {
    const b = newFrostTarget(true, false);
    let became = false;
    for (let i = 0; i < FROST.stacks; i++) became = frostModify(b, 10, { ice: true }, i * 0.25).brittle;
    expect(became).toBe(true);
    const now = FROST.stacks * 0.25;
    expect(frostModify(b, 10, { ice: false }, now).amount).toBeCloseTo(13);
    expect(frostModify(b, 10, { ice: false }, now + FROST.brittleTime + 0.1).amount).toBe(10);
  });

  it("acúmulos respeitam o intervalo de 0,2 s; o pingente soma 2 sem esperar", () => {
    const b = newFrostTarget(true, false);
    frostModify(b, 1, { ice: true }, 0);
    frostModify(b, 1, { ice: true }, 0.1);
    expect(b.frostStacks).toBe(1);
    frostModify(b, 1, { ice: true, stacks: FROST.icicleStacks }, 0.15);
    expect(b.frostStacks).toBe(3);
  });

  it("Pingente: o 4º tiro seguido no mesmo alvo", () => {
    const ic = new IcicleCounter();
    const a = {};
    const b = {};
    const shots: boolean[] = [];
    for (let i = 0; i < 8; i++) {
      const icicle = ic.take();
      shots.push(icicle);
      ic.onHit(a, icicle);
    }
    expect(shots).toEqual([false, false, false, true, false, false, false, true]);
    // trocar de alvo zera
    ic.onHit(a, false);
    ic.onHit(a, false);
    ic.onHit(b, false);
    expect(ic.take()).toBe(false);
  });
});
