// Desafios da partida (M20-13): regras de challenges.lua que valem sem o Lua na máquina.
import { describe, expect, it } from "vitest";
import { blockEnd, challengeGold, ChallengeTracker, challengeRows, nextBoss } from "../src/core/challenges";
import { continueRun, checkpoint, newRun, RunRng } from "../src/core/run";
import { runLogEntry } from "../src/core/runlog";

const mkRun = () => newRun({ heroId: "kaelen", difficultyId: "normal", startingSpell: "fireball", randomSeed: 7 });
/** sorteio que sempre tira o primeiro da lista */
const first = { rng: { int: (a: number) => a }, drawRelic: () => "ember_heart" };

describe("desafios da partida (M20-13)", () => {
  it("prazos e ouro como em challenges.lua", () => {
    expect(blockEnd(1)).toBe(5);
    expect(blockEnd(6)).toBe(10);
    expect(nextBoss(6)).toBe(10);
    expect(nextBoss(20)).toBe(20);
    expect(nextBoss(21)).toBe(25);
    expect(challengeGold("small", 4)).toBe(39);
    expect(challengeGold("large", 10)).toBe(225);
  });

  it("um novo nas ondas 1, 6, 11 e 16, até 2 abertos; o que espera entra quando abre vaga", () => {
    const run = mkRun();
    const tr = new ChallengeTracker(run);
    for (let w = 1; w <= 16; w++) {
      run.wave = w;
      tr.waveStart(w, first);
    }
    expect(run.challengesOffered).toBeLessThanOrEqual(4);
    expect(run.challenges.filter((c) => !c.done && !c.failed).length).toBeLessThanOrEqual(2);
    expect(run.challengeOffered).toEqual([1, 6, 11, 16]);
  });

  it("Untouchable paga na onda de chefe sem golpe; um golpe nela falha", () => {
    const run = mkRun();
    const tr = new ChallengeTracker(run);
    run.wave = 1;
    tr.waveStart(1, first); // o primeiro da lista: untouchable_boss
    expect(run.challenges[0]).toMatchObject({ id: "untouchable_boss", deadline: 5 });
    const gold0 = run.gold;
    for (let w = 2; w <= 5; w++) {
      run.wave = w;
      tr.waveStart(w, first);
      if (w < 5) tr.hit(10); // golpe fora da onda do prazo não conta
      tr.waveComplete(w, { hastened: false, hpFrac: 1 });
    }
    expect(run.challenges[0].done).toBe(true);
    expect(run.gold - gold0).toBe(challengeGold("large", 5));
    expect(tr.take().map((n) => n.kind)).toEqual(["new", "done"]);
  });

  it("checkpoint leva os desafios; checkpoint antigo ganha os campos vazios", () => {
    const run = mkRun();
    const tr = new ChallengeTracker(run);
    run.wave = 1;
    tr.waveStart(1, first);
    const back = continueRun(checkpoint(run, new RunRng(run.seed), 1)).run;
    expect(back.challenges).toEqual(run.challenges);
    const old = JSON.parse(JSON.stringify(checkpoint(run, new RunRng(run.seed), 1)));
    for (const k of ["challenges", "challengeOffered", "challengeWaiting", "challengesDone", "challengesOffered", "freeRerolls", "freeLevelUpReroll", "forcedShopRelic", "challengeLog"]) delete old.run[k];
    const r2 = continueRun(old).run;
    expect(r2.challenges).toEqual([]);
    expect(r2.freeRerolls).toBe(0);
    expect(r2.challengeLog).toEqual([]);
  });

  it("o registro de partidas leva cada desafio e como acabou", () => {
    const run = mkRun();
    const tr = new ChallengeTracker(run);
    run.wave = 1;
    tr.waveStart(1, first);
    run.wave = 5;
    tr.waveComplete(5, { hastened: false, hpFrac: 1 });
    const e = runLogEntry(run, "quit", "2026-11-24T00:00:00Z", "test", null);
    expect(e.challenges).toEqual({ offered: 1, done: 1, list: [{ id: "untouchable_boss", wave: 1, deadline: 5, result: "done", at: 5 }] });
  });

  it("linhas da tela: nome, texto e prazo em inglês", () => {
    const run = mkRun();
    const tr = new ChallengeTracker(run);
    run.wave = 1;
    tr.waveStart(1, first);
    expect(challengeRows(run)[0]).toMatchObject({ name: "UNTOUCHABLE", text: "Clear the next boss wave without taking damage.", deadline: "by W5", reward: "+63 gold" });
  });
});
