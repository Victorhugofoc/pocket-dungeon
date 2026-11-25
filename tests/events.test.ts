// M11-08 e M13-03: eventos e pactos (core/events.ts). A paridade com o Lua está em parity.test.ts; aqui o que é daqui:
// o texto das cartas, as linhas do HUD, a onda com Swift Bargain, o bônus do chefe e o checkpoint antigo.
import { describe, expect, it } from "vitest";
import {
  activeRows, addPact, applyEvent, ensureEventState, eventLines, newEventState, omenFor, pactLines, pactPreview, pactsForMap,
  takeBossRelicBonus, type EventRun,
} from "../src/core/events";
import { EVENTS, PACTS, PACT_BY_ID, EVENT_BY_ID } from "../src/data/events";
import { Rng } from "../src/core/rng";
import { randomChampionChance, startWave, waveMods } from "../src/core/wave";

const runOf = (gold = 500): EventRun => ({ ...newEventState(), gold, freeRerolls: 0, statistics: { goldEarned: 0, goldSpent: 0 } });

describe("texto das cartas", () => {
  it("todo evento e pacto tem linha boa e ruim, em inglês, sem número solto", () => {
    for (const e of EVENTS) {
      const L = eventLines(e, 4);
      expect(L.length, e.id).toBeGreaterThan(0);
      expect(L.some((l) => l[1]), `${e.id} bom`).toBe(true);
      for (const [t] of L) expect(t, e.id).not.toMatch(/[ãçéêó]|Próxima|ouro|vida/);
    }
    for (const p of PACTS) {
      const L = pactLines(p);
      expect(L.some((l) => l[1]) && L.some((l) => !l[1]), p.id).toBe(true);
    }
  });

  it("as linhas saem dos números", () => {
    expect(eventLines(EVENT_BY_ID.treasure_cache).map((l) => l[0])).toEqual(["+100 gold now", "This wave: +8% Gold earned", "This wave: +10% Enemy HP"]);
    expect(eventLines(EVENT_BY_ID.ominous_omen, 4).map((l) => l[0])).toEqual(["+150 gold now", "Wave 5: +20% Enemies"]);
    expect(eventLines(EVENT_BY_ID.gamblers_den).map((l) => l[0])).toEqual(["50%: +200 gold", "50%: lose 50 gold"]);
    expect(pactLines(PACT_BY_ID.champions_call).map((l) => l[0])).toEqual(["+14% Reward", "+15% Champion chance"]);
  });
});

describe("estado da partida", () => {
  it("Ominous Omen: a camada cai na onda seguinte à do mapa, com aviso no portão dela", () => {
    const run = runOf();
    applyEvent(run, "ominous_omen", 4, { hp: 100, maxHp: 100, chance: () => true });
    expect(omenFor(run, 4)).toBeNull();
    expect(omenFor(run, 5)).toContain("+20% Enemies");
    expect(activeRows(run, 4).find((r) => r.kind === "omen")?.when).toBe("W5");
    expect(activeRows(run, 5).find((r) => r.kind === "omen")?.when).toBe("this wave");
  });

  it("Cursed Chamber: o bônus do chefe para em 1 e o chefe gasta", () => {
    const run = runOf();
    applyEvent(run, "cursed_chamber", 2, { hp: 100, maxHp: 100, chance: () => true });
    applyEvent(run, "cursed_chamber", 3, { hp: 100, maxHp: 100, chance: () => true });
    expect(run.bossRelicBonus).toBe(1);
    expect(takeBossRelicBonus(run)).toBe(1);
    expect(takeBossRelicBonus(run)).toBe(0);
  });

  it("pacto: até 3, um por trecho de 5 ondas, e a prévia soma o novo", () => {
    const run = runOf();
    expect(addPact(run, "blood_oath", 3)).toBe(true);
    expect(pactsForMap(run, 4)).toEqual([]);
    expect(pactsForMap(run, 6)).not.toContain("blood_oath");
    addPact(run, "glass_covenant", 7);
    addPact(run, "iron_bargain", 12);
    expect(pactsForMap(run, 16)).toEqual([]);
    expect(addPact(run, "arcane_bet", 16)).toBe(false);
    const prev = pactPreview(runOf(), "blood_oath").find((r) => r.key === "reward")!;
    expect(prev.before).toBe(1);
    expect(prev.after).toBeCloseTo(1.2, 10);
  });

  it("checkpoint de antes do M11-08 ganha os campos", () => {
    const old: Record<string, unknown> = {};
    ensureEventState(old);
    expect(old).toEqual(newEventState());
  });
});

describe("a onda", () => {
  it("Swift Bargain encurta a onda e acelera os nascimentos; pacto soma na chance de campeão", () => {
    const base = startWave(3, new Rng(1), () => true, waveMods(3, "normal"));
    const m = waveMods(3, "normal", null, {}, { events: [EVENT_BY_ID.swift_bargain.mods!] });
    const fast = startWave(3, new Rng(1), () => true, m);
    expect(fast.duration).toBeCloseTo(base.duration * 0.85, 10);
    expect(fast.interval).toBeCloseTo(base.interval * 0.85 / 1.15, 10);
    expect(m.reward).toBeCloseTo(1.25, 10);
    expect(randomChampionChance(3, 0.15)).toBeCloseTo(randomChampionChance(3) + 0.15, 10);
  });
});
