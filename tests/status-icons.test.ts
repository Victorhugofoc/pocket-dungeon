import { describe, expect, it } from "vitest";
import { enemyStatuses, StatusTimers } from "../src/game/status-icons";
import type { Enemy } from "../src/game/enemy";

const enemy = (over: Partial<Record<string, unknown>> = {}): Enemy => ({
  dots: [], stunUntil: 0, slowUntil: 0, slowPower: 0,
  frost: { frostStacks: 0, brittleUntil: 0 }, ...over,
}) as unknown as Enemy;
const ctx = { now: 10, volatile: 0, brittleChill: 0 };

describe("enemyStatuses (M5-05)", () => {
  it("moeda do banco (D-637) por último", () => {
    expect(enemyStatuses(enemy({ lootBonus: true, stunUntil: 11 }), ctx)).toMatchObject([{ kind: "stun" }, { kind: "loot" }]);
  });
  it("sem estado, sem ícone", () => {
    expect(enemyStatuses(enemy(), ctx)).toEqual([]);
  });
  it("queimadura do Fireball vira Volátil só quando há chance", () => {
    const e = enemy({ dots: [{ kind: "burn", dps: 1, until: 12, spell: "fireball", slot: 0 }] });
    expect(enemyStatuses(e, ctx)).toMatchObject([{ kind: "burn" }]);
    expect(enemyStatuses(e, { ...ctx, volatile: 0.15 })).toMatchObject([{ kind: "volatile" }]);
  });
  it("queimadura de outra fonte não é Volátil", () => {
    const e = enemy({ dots: [{ kind: "burn", dps: 1, until: 12 }] });
    expect(enemyStatuses(e, { ...ctx, volatile: 0.5 })).toMatchObject([{ kind: "burn" }]);
  });
  it("efeito vencido some", () => {
    const e = enemy({ dots: [{ kind: "burn", dps: 1, until: 9 }], slowUntil: 9, slowPower: 0.3, stunUntil: 9 });
    expect(enemyStatuses(e, ctx)).toEqual([]);
  });
  it("lento vira Brittle Chill com o modificador; veneno mostra os acúmulos", () => {
    const e = enemy({ slowUntil: 11, slowPower: 0.3, dots: [1, 2, 3].map(() => ({ kind: "poison", dps: 1, until: 12 })) });
    expect(enemyStatuses(e, ctx)).toMatchObject([{ kind: "poison", n: 3 }, { kind: "slow" }]);
    expect(enemyStatuses(e, { ...ctx, brittleChill: 0.15 })).toMatchObject([{ kind: "poison", n: 3 }, { kind: "brittleChill" }]);
  });
  it("Venom Nova conta os acúmulos do efeito dela junto com os da Vesper", () => {
    const e = enemy({ dots: [{ kind: "poison", dps: 1, until: 12, spell: "venom_nova", stacks: 3 }, { kind: "poison", dps: 1, until: 12 }] });
    expect(enemyStatuses(e, ctx)).toMatchObject([{ kind: "poison", n: 4 }]);
  });
  it("Frostine: acúmulos de gelo, e Quebradiço no lugar deles", () => {
    expect(enemyStatuses(enemy({ frost: { frostStacks: 4, brittleUntil: 0 } }), ctx)).toMatchObject([{ kind: "frost", n: 4 }]);
    expect(enemyStatuses(enemy({ frost: { frostStacks: 4, brittleUntil: 11 } }), ctx)).toMatchObject([{ kind: "shatter" }]);
  });
  it("atordoado", () => {
    expect(enemyStatuses(enemy({ stunUntil: 11 }), ctx)).toMatchObject([{ kind: "stun" }]);
  });
});

describe("relógio dos ícones", () => {
  it("cada estado diz quando acaba", () => {
    const e = enemy({ dots: [{ kind: "poison", dps: 1, until: 12 }, { kind: "poison", dps: 1, until: 13 }], stunUntil: 11 });
    expect(enemyStatuses(e, ctx)).toEqual([{ kind: "poison", n: 2, until: 13 }, { kind: "stun", until: 11 }]);
  });
  it("esvazia com o tempo e enche de novo ao renovar", () => {
    const t = new StatusTimers<object>();
    const o = {};
    expect(t.left(o, "poison", 14, 10)).toBe(1);
    expect(t.left(o, "poison", 14, 12)).toBeCloseTo(0.5);
    expect(t.left(o, "poison", 14, 14)).toBe(0);
    expect(t.left(o, "poison", 16, 13)).toBe(1);
    expect(t.left(o, "poison", 16, 14.5)).toBeCloseTo(0.5);
  });
});
