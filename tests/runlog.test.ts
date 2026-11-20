import { describe, expect, it } from "vitest";
import { checkpoint, continueRun, newRun, RunRng } from "../src/core/run";
import { RUNLOG_MAX, addRunLog, runLogEntry, toJsonl, waveEntry } from "../src/core/runlog";
import { loadRunLog, writeRunLog, type Storage } from "../src/core/save";

const mem = (): Storage & { data: Record<string, string> } => ({
  data: {},
  getItem(k) { return this.data[k] ?? null; },
  setItem(k, v) { this.data[k] = v; },
  removeItem(k) { delete this.data[k]; },
});

const start = () => newRun({ heroId: "frostine", difficultyId: "normal", startingSpell: "iceball", randomSeed: 99, startedAt: "2026-11-20T18:30:05.123Z" });
const W = { isBossWave: false, hastened: false, clearedEarly: true };

describe("registro de partidas", () => {
  it("cada onda guarda o tempo dela e os totais até ali", () => {
    const run = start();
    expect(run.runId).toBe(`${run.seedCode}-20261120183005`);
    run.wave = 1;
    run.statistics.elapsed = 40.26;
    run.statistics.kills = 12;
    run.waveLog.push(waveEntry(run, W, 0.8, true));
    run.wave = 2;
    run.statistics.elapsed = 95;
    const e = waveEntry(run, W, 0.5, true);
    expect(e).toMatchObject({ wave: 2, time: 54.7, elapsed: 95, hp: 0.5, kills: 12, cleared: true, clearedEarly: true });
  });

  it("a partida que acaba no meio da onda leva a onda interrompida no fim", () => {
    const run = start();
    run.wave = 1;
    run.waveLog.push(waveEntry(run, W, 1, true));
    run.wave = 2;
    run.killedBy = "Goblin";
    const last = waveEntry(run, W, 0, false);
    const e = runLogEntry(run, "death", "2026-11-20T19:00:00.000Z", "0.3.0+abc", last);
    expect(e.waves.map((w) => [w.wave, w.cleared])).toEqual([[1, true], [2, false]]);
    expect(e).toMatchObject({ outcome: "death", killedBy: "Goblin", build: "0.3.0+abc", heroId: "frostine" });
    expect(run.waveLog).toHaveLength(1); // a partida não muda
  });

  it("o checkpoint leva a linha do tempo e continuar não perde o id", () => {
    const run = start();
    run.wave = 1;
    run.waveLog.push(waveEntry(run, W, 1, true));
    const c = continueRun(JSON.parse(JSON.stringify(checkpoint(run, new RunRng(run.seed), 2))));
    expect(c.run.runId).toBe(run.runId);
    expect(c.run.waveLog).toHaveLength(1);
  });

  it("checkpoint antigo, sem os campos, continua", () => {
    const run = start() as Partial<ReturnType<typeof start>>;
    delete run.runId; delete run.startedAt; delete run.waveLog;
    const c = continueRun(checkpoint(run as ReturnType<typeof start>, new RunRng(1), 1));
    expect(c.run.waveLog).toEqual([]);
    expect(c.run.runId).toBe("");
  });

  it("a mesma partida (quit e depois morte) troca a entrada; a lista tem teto", () => {
    const run = start();
    run.wave = 3;
    let list = addRunLog([], runLogEntry(run, "quit", "a", "b", null));
    list = addRunLog(list, runLogEntry(run, "death", "c", "b", null));
    expect(list.map((e) => e.outcome)).toEqual(["death"]);
    for (let i = 0; i < RUNLOG_MAX + 5; i++) list = addRunLog(list, { ...list[0], runId: `r${i}` });
    expect(list).toHaveLength(RUNLOG_MAX);
    expect(list.at(-1)!.runId).toBe(`r${RUNLOG_MAX + 4}`);
  });

  it("grava no navegador e exporta uma partida por linha", () => {
    const s = mem();
    const run = start();
    run.wave = 1;
    writeRunLog(s, addRunLog(loadRunLog(s), runLogEntry(run, "victory", "x", "y", null)));
    const back = loadRunLog(s);
    expect(back).toHaveLength(1);
    expect(toJsonl(back).trim().split("\n").map((l) => JSON.parse(l).outcome)).toEqual(["victory"]);
    s.data["dungeon-reign-rpg.runlog.v1"] = "lixo";
    expect(loadRunLog(s)).toEqual([]);
  });
});
