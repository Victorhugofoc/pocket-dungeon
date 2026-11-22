import { describe, expect, it } from "vitest";
import { frameStats, keepSpike, type PerfSpike } from "../src/core/perflog";

describe("desempenho no registro de partidas", () => {
  it("resume fps, percentis e travadinhas", () => {
    // 1000 quadros de 6 ms (≈166 fps), 10 de 20 ms, 2 de 50 ms e 1 de 150 ms
    const t = [...Array(1000).fill(6), ...Array(10).fill(20), 50, 50, 150];
    const s = frameStats(t, t.map(() => 2), 3000, 1000);
    expect(s.frames).toBe(1013);
    expect(s.median).toBe(6);
    expect(s.worst).toBe(150);
    expect(s.hitches).toBe(13);
    expect(s.long).toBe(3);
    expect(s.freezes).toBe(1);
    expect(s.fps).toBeCloseTo(1013 / 6.45, 0);
    expect(s.hitchesPerMin).toBeCloseTo(13 / (6.45 / 60), 0);
    expect(s.gpuMs).toBe(3);
    expect(s.cpuMedian).toBe(2);
  });

  it("sem quadros não quebra", () => {
    expect(frameStats([], [])).toMatchObject({ frames: 0, fps: 0, worst: 0, gpuMs: -1 });
  });

  it("guarda só os piores picos, do pior para o menor", () => {
    const list: PerfSpike[] = [];
    for (const ms of [20, 90, 15, 40, 60, 10]) keepSpike(list, { wave: 1, at: 0, ms, cpu: 1, tags: [] }, 3);
    expect(list.map((x) => x.ms)).toEqual([90, 60, 40]);
  });
});
