import { describe, expect, it } from "vitest";
import { buildElements, executes, isBehind, primedReactions, reactionFor, tornadoInfusion, type ReactState } from "../src/core/reactions";

const base = (o: Partial<ReactState> = {}): ReactState => ({ chillUntil: 0, burning: false, poisoned: false, reactUntil: 0, ...o });

describe("reações de estado (M21-05)", () => {
  it("Estilhaço: raio em inimigo gelado; outro elemento ou gelo vencido não reage", () => {
    const s = base({ chillUntil: 5 });
    expect(reactionFor(s, { kind: "hit", element: "lightning" }, 4)).toBe("shatter");
    expect(reactionFor(s, { kind: "hit", element: "fire" }, 4)).toBeNull();
    expect(reactionFor(s, { kind: "hit", element: null }, 4)).toBeNull();
    expect(reactionFor(s, { kind: "hit", element: "lightning" }, 6)).toBeNull();
  });

  it("Praga: queimadura em quem tem veneno, ou o contrário; reaplicar o mesmo não reage", () => {
    expect(reactionFor(base({ poisoned: true }), { kind: "apply", status: "burn" }, 1)).toBe("plague");
    expect(reactionFor(base({ burning: true }), { kind: "apply", status: "poison" }, 1)).toBe("plague");
    expect(reactionFor(base({ burning: true }), { kind: "apply", status: "burn" }, 1)).toBeNull();
    expect(reactionFor(base({ burning: true, poisoned: true }), { kind: "apply", status: "poison" }, 1)).toBeNull();
  });

  it("a recarga segura qualquer reação", () => {
    const s = base({ chillUntil: 9, poisoned: true, reactUntil: 3 });
    expect(reactionFor(s, { kind: "hit", element: "lightning" }, 2)).toBeNull();
    expect(reactionFor(s, { kind: "apply", status: "burn" }, 2)).toBeNull();
    expect(reactionFor(s, { kind: "apply", status: "burn" }, 3)).toBe("plague");
  });

  it("pronta só quando a build tem o elemento que fecha", () => {
    const s = base({ chillUntil: 5, burning: true });
    expect(primedReactions(s, 1, new Set(["ice"]))).toEqual([]);
    expect(primedReactions(s, 1, new Set(["lightning", "poison"]))).toEqual(["shatter", "plague"]);
    expect(primedReactions(base({ poisoned: true }), 1, new Set(["fire"]))).toEqual(["plague"]);
    expect(primedReactions(s, 1, new Set(["lightning"]))).toEqual(["shatter"]);
    expect(primedReactions({ ...s, reactUntil: 2 }, 1, new Set(["lightning"]))).toEqual([]);
  });

  it("elementos da build: spells, técnica e ataque básico", () => {
    const e = buildElements(["fire", "lightning"], "lightning", "poison", true);
    expect([...e].sort()).toEqual(["fire", "ice", "lightning", "poison"]);
    expect([...buildElements([], null, "burn", false)]).toEqual(["fire"]);
  });

  it("Execução: atordoado e golpe pelas costas; de frente ou sem atordoar, não", () => {
    const s = base({ stunned: true });
    expect(reactionFor(s, { kind: "hit", element: null, behind: true }, 1)).toBe("execution");
    expect(reactionFor(s, { kind: "hit", element: null, behind: false }, 1)).toBeNull();
    expect(reactionFor(base(), { kind: "hit", element: null, behind: true }, 1)).toBeNull();
  });

  it("costas: cone atrás de quem olha para +z", () => {
    expect(isBehind(0, 0, 0, 0, -3, 70)).toBe(true);
    expect(isBehind(0, 0, 0, 0, 3, 70)).toBe(false);
    expect(isBehind(0, 0, 0, 3, 0, 70)).toBe(false);
    expect(isBehind(0, 0, 0, 1, -3, 70)).toBe(true);
    expect(isBehind(Math.PI, 0, 0, 0, 3, 70)).toBe(true);
  });

  it("Execução mata só o comum abaixo do limiar", () => {
    expect(executes(30, 100, 0.4, false, false)).toBe(true);
    expect(executes(50, 100, 0.4, false, false)).toBe(false);
    expect(executes(10, 100, 0.4, true, false)).toBe(false);
    expect(executes(10, 100, 0.4, false, true)).toBe(false);
  });

  it("tornado: o primeiro elemento absorvível fica", () => {
    expect(tornadoInfusion(null, "fire")).toBe("fire");
    expect(tornadoInfusion(null, "wind")).toBeNull();
    expect(tornadoInfusion(null, null)).toBeNull();
    expect(tornadoInfusion("ice", "fire")).toBe("ice");
  });
});
