// Dano por fonte (M20-14): run_stats.lua `dealtRows` e `takenRows`.
import { describe, expect, it } from "vitest";
import { addDealt, addKill, addTaken, dealtRows, newDamageSources, sourceName, takenRows, UNKNOWN_SOURCE } from "../src/core/runstats";
import { checkpoint, continueRun, newRun, RunRng } from "../src/core/run";
import { runLogEntry } from "../src/core/runlog";

describe("dano por fonte (M20-14)", () => {
  it("linhas da maior para a menor; a soma bate com o total", () => {
    const s = newDamageSources();
    addDealt(s, "auto", 120);
    addDealt(s, "fireball", 300);
    addDealt(s, "burn", 80);
    addDealt(s, "auto", 30);
    addKill(s, "fireball");
    addKill(s, "fireball");
    addKill(s, "auto");
    const { rows, total } = dealtRows(s);
    expect(rows.map((r) => r.id)).toEqual(["fireball", "auto", "burn"]);
    expect(total).toBe(530);
    expect(rows.reduce((t, r) => t + r.value, 0)).toBe(total);
    expect(rows.reduce((t, r) => t + r.share, 0)).toBeCloseTo(1);
    expect(rows[0]).toMatchObject({ name: "Fireball", count: 2 });
    expect(rows[1]).toMatchObject({ name: "Auto attack", value: 150, count: 1 });
    expect(rows[2].count).toBe(0);
  });

  it("dano recebido conta golpes; zero não entra", () => {
    const s = newDamageSources();
    addTaken(s, "Orc", 10);
    addTaken(s, "Orc", 15);
    addTaken(s, "Orc (breath)", 40);
    addTaken(s, "Goblin", 0);
    const { rows, total } = takenRows(s);
    expect(total).toBe(65);
    expect(rows).toEqual([
      expect.objectContaining({ id: "Orc (breath)", name: "Orc (breath)", value: 40, count: 1 }),
      expect.objectContaining({ id: "Orc", value: 25, count: 2 }),
    ]);
  });

  it("fonte vazia vira Unknown", () => {
    const s = newDamageSources();
    addDealt(s, "", 5);
    expect(s.dealt[UNKNOWN_SOURCE]).toBe(5);
    expect(dealtRows(s).rows[0].name).toBe("Unknown");
  });

  it("nomes: spell, evolução, técnica, relíquia, melhoria e fixos", () => {
    expect(sourceName("auto")).toBe("Auto attack");
    expect(sourceName("volatile")).toBe("Volatile Core");
    expect(sourceName("fireball")).toBe("Fireball");
    expect(sourceName("plague_bloom")).not.toBe("Plague bloom");
    expect(sourceName("storm_step")).toBe("Storm Step");
    expect(sourceName("brood")).toBe("Brood");
    expect(sourceName("hatchling")).toBe("Hatchlings");
    expect(sourceName("last_rites")).not.toBe("Last rites");
    expect(sourceName("judgement")).toBe("Judgement");
    expect(sourceName("some_thing")).toBe("Some thing");
  });

  it("volta com o checkpoint e vai para o registro de partidas", () => {
    const run = newRun({ heroId: "kaelen", difficultyId: "normal", startingSpell: "fireball", randomSeed: 7 });
    addDealt(run.sources, "auto", 42.4);
    addKill(run.sources, "auto");
    addTaken(run.sources, "Goblin", 7);
    const back = continueRun(checkpoint(run, new RunRng(run.seed), 1)).run;
    expect(back.sources.dealt.auto).toBeCloseTo(42.4);
    const old = checkpoint(run, new RunRng(run.seed), 1);
    delete (old.run as { sources?: unknown }).sources;
    expect(continueRun(old).run.sources).toEqual(newDamageSources());
    const e = runLogEntry(run, "death", "2026-11-25T10:00:00Z", "test", null);
    expect(e.dealtBySource).toEqual([{ source: "auto", damage: 42, kills: 1 }]);
    expect(e.takenBySource).toEqual([{ source: "Goblin", damage: 7, hits: 1 }]);
  });
});
