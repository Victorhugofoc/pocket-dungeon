import { describe, expect, it } from "vitest";
import {
  RUN_STREAMS, RunRng, addRecord, checkpoint, continueRun, decodeSeed, emptyRecords, encodeSeed, isCheckpoint, newRun,
  summarize, zoneSeed, type RunState, type StreamId,
} from "../src/core/run";
import { generateZone } from "../src/core/worldgen";
import {
  LEGACY_SAVE_KEY, RECORDS_KEY, RUN_KEY, clearRun, discardLegacySave, loadRecords, loadRun, writeRecords, writeRun,
  type Storage,
} from "../src/core/save";
import { ZONES, ZONE_ORDER } from "../src/data/zones";

const mem = (): Storage & { data: Record<string, string> } => ({
  data: {},
  getItem(k) { return this.data[k] ?? null; },
  setItem(k, v) { this.data[k] = v; },
  removeItem(k) { delete this.data[k]; },
});

const start = (seed?: number) => newRun({ heroId: "frostine", difficultyId: "normal", startingSpell: "iceball", seed, randomSeed: 123456 });

/** Simula uma onda: sorteia em vários fluxos e mexe na partida, como o jogo faria. */
function playWave(run: RunState, rng: RunRng, wave: number): number[] {
  run.wave = wave;
  const draws: number[] = [];
  const pull = (id: StreamId, n: number) => { for (let i = 0; i < n; i++) draws.push(rng.get(id).next()); };
  pull("spawns", 5 + wave);
  pull("combat", 3);
  if (wave % 2 === 0) pull("champions", 1);
  pull("rewards", 2);
  pull("map", 3);
  run.statistics.kills += 4 + wave;
  run.gold += 10 + wave;
  run.xp += 7 * wave;
  if (wave % 3 === 0) run.relics.push("r" + wave);
  run.gold += Math.floor(rng.get("rewards").next() * 10);
  return draws;
}

describe("partida", () => {
  it("começa como no game_state.lua", () => {
    const r = start(42);
    expect(r).toMatchObject({ seed: 42, customSeed: true, heroId: "frostine", wave: 0, level: 1, xp: 0, xpToNext: 50, gold: 0 });
    expect(r.spells).toEqual([{ id: "iceball", level: 1, evolution: null }]);
    expect(r.technique.id).toBe("glacial_wall");
    expect(start().seed).toBe(123456);
    expect(start().customSeed).toBe(false);
  });

  it("recusa herói, dificuldade ou spell inicial que não existe", () => {
    expect(() => newRun({ heroId: "x", difficultyId: "normal", startingSpell: "iceball", randomSeed: 1 })).toThrow();
    expect(() => newRun({ heroId: "frostine", difficultyId: "x" as never, startingSpell: "iceball", randomSeed: 1 })).toThrow();
    // fireball não está entre as 4 da Frostine
    expect(() => newRun({ heroId: "frostine", difficultyId: "normal", startingSpell: "fireball", randomSeed: 1 })).toThrow();
  });

  it("código da seed vai e volta", () => {
    for (const s of [1, 42, 123456, 2147483646]) {
      const code = encodeSeed(s);
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{7}$/);
      expect(decodeSeed(code)).toBe(s);
      expect(decodeSeed(code.toLowerCase())).toBe(s);
    }
    expect(decodeSeed("")).toBeNull();
    expect(decodeSeed("dungeon")).toBe(decodeSeed("DUNGEON"));
  });

  it("os fluxos são independentes: sortear em um não muda os outros", () => {
    const a = new RunRng(7), b = new RunRng(7);
    for (let i = 0; i < 50; i++) a.get("combat").next();
    expect(b.get("relics").next()).toBe(a.get("relics").next());
    expect(new Set(RUN_STREAMS.map((id) => new RunRng(7).get(id).next())).size).toBe(RUN_STREAMS.length);
  });

  it("continuar no meio dá o mesmo mapa e os mesmos sorteios", () => {
    const seed = 987654;
    // partida sem parar: ondas 1 a 8
    const run = start(seed), rng = new RunRng(seed);
    const straight: number[][] = [];
    let cp = checkpoint(run, rng, 1);
    for (let w = 1; w <= 8; w++) {
      if (w === 5) cp = checkpoint(run, rng, 5);
      straight.push(playWave(run, rng, w));
    }
    // a mesma partida, fechada antes da onda 5 e continuada a partir do save (texto, como no localStorage)
    const st = mem();
    expect(writeRun(st, cp)).toBe(true);
    const loaded = loadRun(st)!;
    expect(loaded).not.toBeNull();
    const res = continueRun(loaded);
    expect(res.wave).toBe(5);
    expect(res.run.resumes).toBe(1);
    for (let w = 5; w <= 8; w++) expect(playWave(res.run, res.rng, w)).toEqual(straight[w - 1]);
    // o estado final é o mesmo, menos a contagem de continuações
    const plain = (r: RunState) => ({ ...r, resumes: 0 });
    expect(plain(res.run)).toEqual(plain(run));
    // mapa: a seed de cada zona só depende da seed da partida
    for (const id of ZONE_ORDER) {
      const a = generateZone(ZONES[id], zoneSeed(run.seed, id, 0));
      const b = generateZone(ZONES[id], zoneSeed(res.run.seed, id, 0));
      expect(b).toEqual(a);
    }
  });

  it("o checkpoint é uma cópia: a partida viva continua mudando sem estragar o save", () => {
    const run = start(5), rng = new RunRng(5);
    const cp = checkpoint(run, rng, 1);
    playWave(run, rng, 1);
    expect(cp.run.statistics.kills).toBe(0);
    expect(cp.run.gold).toBe(0);
    expect(continueRun(cp).rng.get("spawns").next()).toBe(new RunRng(5).get("spawns").next());
  });

  it("checkpoint de antes do M20-04 perde mochila e equipamento ao continuar", () => {
    const cp = checkpoint(start(9), new RunRng(9), 3);
    (cp.run.legacy as unknown as Record<string, unknown>).bag = [{ id: "x" }];
    (cp.run.legacy as unknown as Record<string, unknown>).equipped = { weapon: { id: "y" } };
    cp.run.legacy.deaths = 2;
    expect(continueRun(cp).run.legacy).toEqual({ deaths: 2 });
  });

  it("seeds diferentes dão mapas diferentes", () => {
    const a = generateZone(ZONES.bosque, zoneSeed(1, "bosque", 0));
    const b = generateZone(ZONES.bosque, zoneSeed(2, "bosque", 0));
    expect(b).not.toEqual(a);
  });
});

describe("save", () => {
  it("ignora partida ausente, estragada ou de outra versão", () => {
    const st = mem();
    expect(loadRun(st)).toBeNull();
    st.data[RUN_KEY] = "{nao é json";
    expect(loadRun(st)).toBeNull();
    const cp = checkpoint(start(3), new RunRng(3), 1);
    st.data[RUN_KEY] = JSON.stringify({ ...cp, v: 1 });
    expect(loadRun(st)).toBeNull();
    st.data[RUN_KEY] = JSON.stringify({ ...cp, run: { ...cp.run, heroId: "ninguem" } });
    expect(loadRun(st)).toBeNull();
    const { combat: _, ...rng } = cp.rng;
    expect(isCheckpoint({ ...cp, rng })).toBe(false);
    expect(loadRun(undefined)).toBeNull();
  });

  it("apaga a partida quando ela acaba", () => {
    const st = mem();
    writeRun(st, checkpoint(start(3), new RunRng(3), 2));
    expect(loadRun(st)?.wave).toBe(2);
    clearRun(st);
    expect(loadRun(st)).toBeNull();
  });

  it("descarta o save contínuo antigo uma vez", () => {
    const st = mem();
    expect(discardLegacySave(st)).toBe(false);
    st.data[LEGACY_SAVE_KEY] = JSON.stringify({ v: 1, heroId: "zephyr", level: 30 });
    expect(discardLegacySave(st)).toBe(true);
    expect(st.data[LEGACY_SAVE_KEY]).toBeUndefined();
    expect(discardLegacySave(st)).toBe(false);
  });

  it("registros somam as partidas e guardam a melhor por herói e dificuldade", () => {
    const st = mem();
    const rec = loadRecords(st);
    expect(rec).toEqual(emptyRecords());
    const r = start(9);
    r.wave = 7;
    r.statistics.kills = 80;
    expect(addRecord(rec, summarize(r), "2026-11-15")).toBe(true);
    r.wave = 4;
    r.statistics.kills = 300;
    expect(addRecord(rec, summarize(r), "2026-11-15")).toBe(false); // a onda pesa mais que os abates
    r.wave = 20;
    r.victory = true;
    expect(addRecord(rec, summarize(r), "2026-11-16")).toBe(true);
    expect(rec).toMatchObject({ runs: 3, wins: 1, kills: 680, highestWave: 20 });
    expect(rec.best["frostine/normal"].wave).toBe(20);
    expect(rec.history.map((h) => h.wave)).toEqual([20, 4, 7]);
    for (let i = 0; i < 30; i++) addRecord(rec, summarize(r), "2026-11-16");
    expect(rec.history).toHaveLength(20);
    writeRecords(st, rec);
    expect(loadRecords(st)).toEqual(rec);
    st.data[RECORDS_KEY] = "[]";
    expect(loadRecords(st)).toEqual(emptyRecords());
  });
});
