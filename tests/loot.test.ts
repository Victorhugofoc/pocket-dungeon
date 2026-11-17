import { describe, expect, it } from "vitest";
import { LootField, promisesBank } from "../src/core/loot";
import { RUN_TUNING } from "../src/data/run";

const L = RUN_TUNING.loot;
const NO_HOP = { a: 0, r: 0 };

describe("orbes de ouro e XP (loot.lua)", () => {
  it("nada cai quando o inimigo não vale nada", () => {
    const f = new LootField();
    expect(f.drop(0, 0, 0, 0, [], NO_HOP)).toBeNull();
    expect(f.orbs).toHaveLength(0);
  });

  it("o orbe pula para fora do corpo (px de lá ÷ 12)", () => {
    const f = new LootField();
    const o = f.drop(1, 2, 4, 20, null, { a: 0, r: 12 })!;
    expect(o.x).toBeCloseTo(2, 9);
    expect(o.z).toBeCloseTo(2, 9);
  });

  it("o prometido leva o primeiro orbe do banco e sai em dobro", () => {
    const f = new LootField();
    const bank: [number, number][] = [[3, 10], [5, 7]];
    const o = f.drop(0, 0, 4, 20, bank, NO_HOP)!;
    expect([o.gold, o.xp, o.double]).toEqual([7, 30, true]);
    expect(bank).toEqual([[5, 7]]);
  });

  it("chão cheio: o orbe mais velho absorve o novo", () => {
    const f = new LootField();
    for (let i = 0; i < L.maxOnFloor; i++) f.drop(0, 0, 1, 1, null, NO_HOP);
    expect(f.drop(0, 0, 5, 6, [[1, 1]], NO_HOP)).toBeNull();
    expect(f.orbs).toHaveLength(L.maxOnFloor);
    expect([f.orbs[0].gold, f.orbs[0].xp, f.orbs[0].double]).toEqual([7, 8, true]);
  });

  it("assenta antes de ser puxado, puxa no alcance e coleta ao chegar", () => {
    const f = new LootField();
    f.drop(0, 0, 4, 20, null, NO_HOP);
    const hero = { x: 3.5, z: 0 }; // alcance = (36 + 12) / 12 = 4 m
    expect(f.update(0.24, hero, true)).toHaveLength(0);
    expect(f.orbs[0].pulled).toBe(false);
    f.update(0.01, hero, true);
    expect(f.orbs[0].pulled).toBe(true);
    // 160 px/s mais 900 px/s² × dt, em m
    expect(f.orbs[0].x).toBeCloseTo(((160 + 900 * 0.01) / 12) * 0.01, 9);
    let got = 0;
    for (let i = 0; i < 60 && !got; i++) got = f.update(1 / 60, hero, true).length;
    expect(got).toBe(1);
    expect(f.orbs).toHaveLength(0);
  });

  it("longe do herói, ou herói morto, o orbe fica", () => {
    const f = new LootField();
    f.drop(0, 0, 4, 20, null, NO_HOP);
    expect(f.update(1, { x: 4.1, z: 0 }, true)).toHaveLength(0);
    expect(f.update(1, { x: 0.1, z: 0 }, false)).toHaveLength(0);
    expect(f.orbs[0].pulled).toBe(false);
  });

  it("o fim da onda guarda o que ficou no chão", () => {
    const f = new LootField();
    f.drop(0, 0, 4, 20, null, NO_HOP);
    f.drop(0, 0, 0, 9, null, NO_HOP);
    const bank: [number, number][] = [[1, 1]];
    expect(f.bankLeftovers(bank)).toHaveLength(2);
    expect(bank).toEqual([[1, 1], [4, 20], [0, 9]]);
    expect(f.orbs).toHaveLength(0);
  });

  it("promessa só enquanto o banco tem orbe sem dono", () => {
    expect(promisesBank([[1, 1], [1, 1]], 1)).toBe(true);
    expect(promisesBank([[1, 1]], 1)).toBe(false);
    expect(promisesBank([], 0)).toBe(false);
  });
});
