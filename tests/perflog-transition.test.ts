import { describe, expect, it } from "vitest";
import { PerfLog } from "../src/game/perf";

const env = { gpu: "test", width: 1, height: 1, dpr: 1, quality: 2 };

describe("PerfLog (M16-08)", () => {
  it("ignora quadros de tempo negativo (relógio fora de ordem)", () => {
    const log = new PerfLog();
    log.reset();
    for (let i = 0; i < 60; i++) log.add(16, 2, -1, 1, [], 1, i);
    log.add(-38088, 2, -1, 1, [], 1, 61);
    const r = log.run(env);
    expect(r.spikes.length).toBe(0);
    expect(r.total.worst).toBeGreaterThan(0);
  });

  it("guarda as trocas de zona à parte, fora dos picos", () => {
    const log = new PerfLog();
    log.reset();
    expect(log.run(env).transitions).toBeUndefined();
    log.transition(6, 1612.4, 283.27);
    const r = log.run(env);
    expect(r.transitions).toEqual([{ wave: 6, ms: 1612, worst: 283.3 }]);
    expect(r.spikes.length).toBe(0);
  });
});
