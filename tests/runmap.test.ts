import { describe, expect, it } from "vitest";
import { Rng } from "../src/core/rng";
import { newRun } from "../src/core/run";
import { chooseCard, expireWaveScope, generateMap, nodePool, roomOf, type MapNodeId } from "../src/core/runmap";
import { startWave, stepWave, waveMods } from "../src/core/wave";
import { ROOM_BY_ID } from "../src/data/rooms";

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
});
