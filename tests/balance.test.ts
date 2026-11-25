import { describe, expect, it } from "vitest";
import { balanceSection, mergeBalanceDoc, tally, type BalanceMeta } from "../src/core/balance";
import type { RunLogEntry } from "../src/core/runlog";

const entry = (o: Partial<RunLogEntry>): RunLogEntry => ({
  v: 1, runId: "x", startedAt: "", endedAt: "", build: "b", outcome: "victory", heroId: "ignis", difficultyId: "normal",
  startingSpell: "fireball", seedCode: "s", customSeed: false, devUsed: false, resumes: 0, wave: 20, level: 20, victory: true,
  endless: false, killedBy: null, gold: 0, statistics: { elapsed: 600 } as RunLogEntry["statistics"], spells: [],
  technique: { id: "t", level: 1, modifiers: [] }, relics: [], upgrades: [], mapHistory: [], detours: [], bossHistory: [], waves: [],
  bot: { batch: "B", seed: 1, uses: { technique: 10, dodge: 4 } }, ...o,
} as RunLogEntry);

const meta: BalanceMeta = { difficulty: "normal", batch: "B", date: "2026-11-25", build: "b", command: "npm run sim -- 2 normal", failures: [], heroes: ["ignis", "varok"] };

describe("balance report", () => {
  it("counts wins, death waves and killers per hero, only from its batch", () => {
    const rows = [
      entry({}),
      entry({ outcome: "death", victory: false, wave: 7, killedBy: "Orc", bot: { batch: "B", seed: 2 } }),
      entry({ heroId: "varok", outcome: "death", victory: false, wave: 12, killedBy: "Orc", bot: { batch: "B", seed: 1 } }),
      entry({ heroId: "varok", bot: { batch: "OTHER", seed: 9 } }),
      entry({ heroId: "varok", bot: undefined }),
    ];
    const s = balanceSection(rows, meta);
    expect(s).toContain("| ignis | 2 | 50% | 7.0 | 7 |");
    expect(s).toContain("| varok | 1 | 0% | 12.0 | 12 |");
    expect(s).toContain("Geral: Orc 2");
  });

  it("lists stuck runs and runs without a log line", () => {
    const s = balanceSection([entry({ outcome: "stuck", victory: false, bot: { batch: "B", seed: 3, stuckAt: "5/walk" } })],
      { ...meta, failures: [{ hero: "varok", seed: 4, reason: "page timeout" }] });
    expect(s).toContain("ignis seed 3: stuck em 5/walk");
    expect(s).toContain("varok seed 4: page timeout");
  });

  it("replaces only the section of its difficulty", () => {
    const a = mergeBalanceDoc("", "normal", "## normal\n\nold");
    const b = mergeBalanceDoc(a, "hard", "## hard\n\nH");
    const c = mergeBalanceDoc(b, "normal", "## normal\n\nnew");
    expect(c).toContain("# Balanceamento");
    expect(c).toContain("new");
    expect(c).not.toContain("old");
    expect(c).toContain("## hard\n\nH");
    expect(c.indexOf("## normal")).toBeLessThan(c.indexOf("## hard"));
  });

  it("tally sorts by count, then name", () => {
    expect(tally(["b", "a", "b", "c", "a"])).toEqual([["a", 2], ["b", 2], ["c", 1]]);
  });
});
