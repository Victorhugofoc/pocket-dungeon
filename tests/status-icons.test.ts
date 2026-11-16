import { describe, expect, it } from "vitest";
import { enemyStatuses } from "../src/game/status-icons";
import type { Enemy } from "../src/game/enemy";

const enemy = (over: Partial<Record<string, unknown>> = {}): Enemy => ({
  dots: [], stunUntil: 0, slowUntil: 0, slowPower: 0,
  frost: { frostStacks: 0, brittleUntil: 0 }, ...over,
}) as unknown as Enemy;
const ctx = { now: 10, volatile: 0, brittleChill: 0 };

describe("enemyStatuses (M5-05)", () => {
  it("sem estado, sem ícone", () => {
    expect(enemyStatuses(enemy(), ctx)).toEqual([]);
  });
  it("queimadura do Fireball vira Volátil só quando há chance", () => {
    const e = enemy({ dots: [{ kind: "burn", dps: 1, until: 12, spell: "fireball", slot: 0 }] });
    expect(enemyStatuses(e, ctx)).toEqual([{ kind: "burn" }]);
    expect(enemyStatuses(e, { ...ctx, volatile: 0.15 })).toEqual([{ kind: "volatile" }]);
  });
  it("queimadura de outra fonte não é Volátil", () => {
    const e = enemy({ dots: [{ kind: "burn", dps: 1, until: 12 }] });
    expect(enemyStatuses(e, { ...ctx, volatile: 0.5 })).toEqual([{ kind: "burn" }]);
  });
  it("efeito vencido some", () => {
    const e = enemy({ dots: [{ kind: "burn", dps: 1, until: 9 }], slowUntil: 9, slowPower: 0.3, stunUntil: 9 });
    expect(enemyStatuses(e, ctx)).toEqual([]);
  });
  it("lento vira Brittle Chill com o modificador; veneno mostra os acúmulos", () => {
    const e = enemy({ slowUntil: 11, slowPower: 0.3, dots: [1, 2, 3].map(() => ({ kind: "poison", dps: 1, until: 12 })) });
    expect(enemyStatuses(e, ctx)).toEqual([{ kind: "poison", n: 3 }, { kind: "slow" }]);
    expect(enemyStatuses(e, { ...ctx, brittleChill: 0.15 })).toEqual([{ kind: "poison", n: 3 }, { kind: "brittleChill" }]);
  });
  it("Frostine: acúmulos de gelo, e Quebradiço no lugar deles", () => {
    expect(enemyStatuses(enemy({ frost: { frostStacks: 4, brittleUntil: 0 } }), ctx)).toEqual([{ kind: "frost", n: 4 }]);
    expect(enemyStatuses(enemy({ frost: { frostStacks: 4, brittleUntil: 11 } }), ctx)).toEqual([{ kind: "shatter" }]);
  });
  it("atordoado", () => {
    expect(enemyStatuses(enemy({ stunUntil: 11 }), ctx)).toEqual([{ kind: "stun" }]);
  });
});
