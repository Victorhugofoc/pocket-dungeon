import { describe, expect, it } from "vitest";
import { Rng } from "../src/core/rng";
import { checkpoint, continueRun, newRun, RunRng } from "../src/core/run";
import { chooseCard, expireWaveScope, forkGateSpots, generateMap, needsMap, nodePool, roomOf, type MapNodeId, arcSpots } from "../src/core/runmap";
import { startWave, stepWave, waveMods } from "../src/core/wave";
import { ROOM_BY_ID } from "../src/data/rooms";
import { startRoomFx, stepRoomFx, stormDps, tickCount } from "../src/core/roomfx";

const OFF = new Set<MapNodeId>(["pact", "event", "shop"]);
const run = () => newRun({ heroId: "varok", difficultyId: "normal", startingSpell: "fireball", seed: 7, randomSeed: 7 });

describe("mapa da partida", () => {
  it("3 cartas diferentes, sem as desligadas, e o santuário some sem relíquia para dar", () => {
    const rng = new Rng(3);
    for (let i = 0; i < 300; i++) {
      const wave = 2 + (i % 18);
      const shrine = i % 4 !== 0;
      const cards = generateMap(rng, wave, { disabled: OFF, shrine });
      expect(cards).toHaveLength(3);
      expect(new Set(cards.map((c) => c.node)).size).toBe(3);
      for (const c of cards) {
        expect(OFF.has(c.node)).toBe(false);
        if (!shrine) expect(c.node).not.toBe("relic_shrine");
        if (c.node === "combat_room") expect(ROOM_BY_ID[c.room!].ambushOnly).toBeFalsy();
        if (c.node === "cursed_room") expect(ROOM_BY_ID[c.room!].kind).toBe("curse");
        if (c.node === "elite") expect(c.room).toBe("champions_den");
        if (c.node === "boss_ambush") expect(["boss_ambush", "boss_ambush_plus"]).toContain(c.room);
      }
    }
    expect(nodePool({ disabled: OFF, shrine: true }).map((e) => e[0])).toEqual(["combat_room", "cursed_room", "elite", "relic_shrine", "boss_ambush"]);
  });

  it("com a loja ligada, toda onda múltipla de 3 tem loja", () => {
    const rng = new Rng(9);
    for (let i = 0; i < 100; i++) {
      const cards = generateMap(rng, 6, { shrine: true, pacts: ["blood_pact"] });
      expect(cards.some((c) => c.node === "shop")).toBe(true);
    }
  });

  it("a sala vale uma onda; a maldição, duas, e a segunda fica sem mapa", () => {
    const r = run();
    expect(chooseCard(r, { node: "combat_room", room: "blood_moon" })).toBe("wave");
    expect(roomOf(r)?.id).toBe("blood_moon");
    expect(expireWaveScope(r)).toBe(false);
    expect(r.room).toBeNull();
    chooseCard(r, { node: "cursed_room", room: "glass_crypt" });
    expect(expireWaveScope(r)).toBe(true);
    expect(r.room).toBe("glass_crypt");
    expect(r.curseContinues).toBe(true);
    expect(expireWaveScope(r)).toBe(false);
    expect(r.room).toBeNull();
    expect(r.curseContinues).toBe(false);
    expect(chooseCard(r, { node: "relic_shrine" })).toBe("relic");
    expect(r.mapHistory).toEqual(["combat_room", "cursed_room", "relic_shrine"]);
  });

  it("a sala muda a onda: vida, recompensa, contagem e o campeão da Toca no meio do cronograma", () => {
    const plain = waveMods(8, "normal"), swarm = waveMods(8, "normal", ROOM_BY_ID.swarm);
    expect(swarm.enemyHp).toBeCloseTo(plain.enemyHp * 0.82);
    expect(swarm.reward).toBeCloseTo(plain.reward * 1.43);
    expect(startWave(8, new Rng(1), () => true, swarm).target).toBeGreaterThan(startWave(8, new Rng(1), () => true, plain).target);
    const den = waveMods(8, "normal", ROOM_BY_ID.champions_den);
    const w = startWave(8, new Rng(1), () => true, den);
    expect(w.championAt).toBe(Math.ceil(w.target / 2));
    expect(w.randomChampionAt).toBeNull();
  });

  it("a emboscada chama o chefe depois de 1,5 s e segura a onda enquanto ele vive", () => {
    const m = waveMods(4, "normal", ROOM_BY_ID.boss_ambush);
    const w = startWave(4, new Rng(1), () => true, m);
    expect(w.ambush).toEqual({ hp: 0.75, damage: 0.78 });
    w.started = true;
    const spawns = new Rng(2);
    expect(stepWave(w, 1, { alive: 0, bossAlive: false }, spawns).ambush).toBe(false);
    expect(stepWave(w, 1, { alive: 0, bossAlive: false }, spawns).ambush).toBe(true);
    // o tempo acaba com o chefe vivo: a onda segura
    const late = stepWave(w, w.duration, { alive: 3, bossAlive: true }, spawns);
    expect(late.completed).toBe(false);
    expect(w.heldByBoss).toBe(true);
    expect(stepWave(w, 0.1, { alive: 0, bossAlive: false }, spawns).completed).toBe(true);
    // na Hard, o corte de vida é o da dificuldade
    expect(startWave(4, new Rng(1), () => true, waveMods(4, "hard", ROOM_BY_ID.boss_ambush)).ambush?.hp).toBe(0.9);
  });

  it("perigos de chão: raios e poças nos intervalos de room_effects.lua", () => {
    expect(startRoomFx(null)).toBeNull();
    expect(startRoomFx(ROOM_BY_ID.blood_moon)).toBeNull();
    const count = (id: string, secs: number) => {
      const fx = startRoomFx(ROOM_BY_ID[id])!;
      let storms = 0, pools = 0;
      for (let t = 0; t < secs; t += 0.05) {
        const s = stepRoomFx(fx, 0.05);
        storms += +s.storm;
        pools += +s.pool;
      }
      return { storms, pools };
    };
    expect(count("storm_floor", 30)).toEqual({ storms: 9, pools: 0 }); // a cada 3,25 s
    expect(count("storm_vault", 30)).toEqual({ storms: 9, pools: 0 });
    expect(count("fractured_floor", 30)).toEqual({ storms: 16, pools: 0 }); // 3,25 / 1,8 = 1,8 s
    expect(count("sanctuary_floor", 30)).toEqual({ storms: 0, pools: 5 }); // 5,6 s
    expect(count("blessed_onslaught", 30)).toEqual({ storms: 0, pools: 6 }); // 4,6 s
    expect(stormDps(10)).toBe(9);
    // 4,25 s de raio com tique de 0,5 s: 8 tiques (o 1º aos 0,5 s)
    const z = { time: 4.25, tickLeft: 0.5, tick: 0.5 };
    let n = 0;
    for (let t = 0; t < 6; t += 0.05) n += tickCount(z, 0.05);
    expect(n).toBe(8);
  });
});

describe("M21-08: portões do mapa", () => {
  it("M21-12: forkGateSpots põe um portão na trava de cada trilha (2 cartas: as dos lados; 1: a do meio)", () => {
    const lock = (x: number) => ({ lock: { x, z: 0, angle: 1 } });
    const fork = { trails: [lock(-10), lock(0), lock(10)] };
    expect(forkGateSpots(fork, 3).map((s) => s.x)).toEqual([-10, 0, 10]);
    expect(forkGateSpots(fork, 2).map((s) => s.x)).toEqual([-10, 10]);
    expect(forkGateSpots(fork, 1).map((s) => s.x)).toEqual([0]);
    expect(forkGateSpots(fork, 3)[0].angle).toBe(1);
  });

  it("needsMap: sem mapa na 1ª onda, na de chefe, depois da maldição e quando já sorteado", () => {
    const r = run();
    expect(needsMap(r, 1)).toBe(false);
    expect(needsMap(r, 2)).toBe(true);
    expect(needsMap(r, 5)).toBe(false);
    r.mapOffer = { wave: 2, cards: null };
    expect(needsMap(r, 2)).toBe(false);
    expect(needsMap(r, 3)).toBe(true);
    r.curseContinues = true;
    expect(needsMap(r, 3)).toBe(false);
  });

  it("o mapa sorteado vai no checkpoint", () => {
    const r = run();
    r.wave = 2;
    r.mapOffer = { wave: 2, cards: [{ node: "shop" }, { node: "combat_room", room: "x" }] };
    const back = continueRun(JSON.parse(JSON.stringify(checkpoint(r, new RunRng(7), 2))));
    expect(back.run.mapOffer).toEqual(r.mapOffer);
  });
});

describe("M21-14: portões e desvios em arco dentro da clareira", () => {
  it("arco virado para a seguinte, dentro do raio, espaçado; offset π vai para trás", () => {
    const from = { x: 10, z: 20, r: 18 }, to = { x: -30, z: -20 };
    const ahead = Math.atan2(to.z - from.z, to.x - from.x);
    const g = arcSpots(from, to, 3, 0.55, (36 * Math.PI) / 180);
    expect(g).toHaveLength(3);
    for (const s of g) expect(Math.hypot(s.x - from.x, s.z - from.z)).toBeCloseTo(18 * 0.55, 6);
    expect(g[1].angle).toBeCloseTo(ahead, 9);
    expect(Math.hypot(g[0].x - g[1].x, g[0].z - g[1].z)).toBeGreaterThan(5);
    const back = arcSpots(from, to, 1, 0.6, 1, Math.PI)[0];
    expect(Math.hypot(back.x - to.x, back.z - to.z)).toBeGreaterThan(Math.hypot(from.x - to.x, from.z - to.z));
  });
});
