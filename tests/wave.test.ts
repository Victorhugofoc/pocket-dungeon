import { describe, expect, it } from "vitest";
import { Rng } from "../src/core/rng";
import { canHasten, hasten, startWave, stepWave, survivorReward, targetCount, waveMods, waveReward, type WaveState } from "../src/core/wave";
import { WAVES } from "../src/data/run";
import { ENEMIES } from "../src/data/enemies";

const known = (id: string) => id in ENEMIES;

/** Roda a onda em passos de `dt`, com `alive` inimigos vivos, até acabar ou passar de `maxT`. */
function run(w: WaveState, opts: { dt?: number; alive?: (spawned: number) => number; bossAlive?: () => boolean; maxT?: number } = {}) {
  const dt = opts.dt ?? 1 / 60;
  const rng = new Rng(9);
  const spawns: { id: string; champion: boolean; t: number }[] = [];
  let t = 0;
  w.started = true;
  while (!w.complete && t < (opts.maxT ?? 200)) {
    const step = stepWave(w, dt, { alive: opts.alive?.(spawns.length) ?? 5, bossAlive: opts.bossAlive?.() ?? false }, rng);
    t += dt;
    for (const s of step.spawns) spawns.push({ ...s, t: w.elapsed });
  }
  return { spawns, t };
}

describe("ciclo da onda", () => {
  it("só começa depois do letreiro (started)", () => {
    const w = startWave(1, new Rng(1), known);
    expect(stepWave(w, 5, { alive: 0, bossAlive: false }, new Rng(1)).spawns).toEqual([]);
    expect(w.elapsed).toBe(0);
  });

  it("todo o cronograma nasce dentro de 90% da duração e a onda acaba no tempo", () => {
    for (const wave of [1, 4, 7, 13]) {
      const w = startWave(wave, new Rng(wave), known);
      const { spawns } = run(w);
      expect(spawns.length).toBe(targetCount(wave));
      expect(spawns[0].t).toBeGreaterThanOrEqual(WAVES.firstSpawnDelay);
      expect(spawns[spawns.length - 1].t).toBeLessThanOrEqual(w.duration * WAVES.spawnWindow + WAVES.firstSpawnDelay + 0.05);
      expect(w.complete).toBe(true);
      expect(w.clearedEarly).toBe(false);
      expect(w.elapsed).toBeGreaterThanOrEqual(w.duration);
    }
  });

  it("só sorteia inimigos que existem no jogo (os 5 que faltam saem)", () => {
    const w = startWave(12, new Rng(3), known);
    expect(w.composition.every(([id]) => id in ENEMIES)).toBe(true);
    expect(w.composition.map(([id]) => id)).not.toContain("shieldbearer");
    const { spawns } = run(w);
    expect(spawns.every((s) => s.id in ENEMIES)).toBe(true);
  });

  it("acaba antes do tempo quando nada sobra e nada falta nascer", () => {
    const w = startWave(2, new Rng(1), known);
    const target = w.target;
    run(w, { alive: (n) => (n < target ? 3 : 0) });
    expect(w.complete).toBe(true);
    expect(w.clearedEarly).toBe(true);
    expect(w.timeSaved).toBeGreaterThan(0);
  });

  it("a onda de chefe segue depois do tempo e acaba quando o chefe cai", () => {
    const w = startWave(5, new Rng(1), known);
    expect(w.isBossWave).toBe(true);
    expect(w.randomChampionAt).toBeNull();
    let boss = true;
    run(w, { bossAlive: () => boss, maxT: w.duration + 10 });
    expect(w.complete).toBe(false);
    expect(w.heldByBoss).toBe(true);
    boss = false;
    run(w, { bossAlive: () => boss });
    expect(w.complete).toBe(true);
    expect(w.bossesDefeated).toBe(true);
  });

  it("os mesmos fluxos dão o mesmo cronograma (continuar no meio repete a onda)", () => {
    const a = run(startWave(9, new Rng(77), known)).spawns;
    const b = run(startWave(9, new Rng(77), known)).spawns;
    expect(a).toEqual(b);
  });

  it("Apressar: só depois de 5 s, fora da onda de chefe, uma vez; o resto nasce mais rápido e rende mais", () => {
    const w = startWave(3, new Rng(1), known);
    w.started = true;
    expect(canHasten(w)).toBe(false);
    stepWave(w, 6, { alive: 9, bossAlive: false }, new Rng(1));
    expect(canHasten(w)).toBe(true);
    const interval = w.interval;
    expect(hasten(w)).toBe(true);
    expect(hasten(w)).toBe(false);
    expect(w.interval).toBeCloseTo(interval * 0.75, 9);
    const mods = waveMods(3, "normal");
    const plain = waveReward({ ...w, hastened: false }, mods);
    const fast = waveReward(w, mods);
    expect(fast.gold).toBeGreaterThan(plain.gold);
    expect(canHasten(startWave(10, new Rng(1), known))).toBe(false);
  });

  it("sobrevivente rende 35%, campeão 4,5 vezes isso", () => {
    const mods = waveMods(1, "normal");
    expect(survivorReward({ gold: 10, xp: 20 }, false, mods)).toEqual({ gold: 3, xp: 7 });
    expect(survivorReward({ gold: 10, xp: 20 }, true, mods)).toEqual({ gold: 15, xp: 31 });
  });
});
