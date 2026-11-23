// Afixos de campeão (M9-06): sorteio de affix_system.lua `roll` e o bônus de recompensa.
import { describe, expect, it } from "vitest";
import { affixReward, rollAffixes } from "../src/core/affixes";
import { AFFIX_FORBIDDEN, AFFIX_ORDER } from "../src/data/affixes";
import { Rng } from "../src/core/rng";
import { killReward, survivorReward, startWave, stepWave, waveMods } from "../src/core/wave";
import { ROOM_BY_ID } from "../src/data/rooms";

describe("sorteio de afixos", () => {
  it("1 afixo antes da onda 12; 1 ou 2 depois, com os dois aparecendo", () => {
    const rng = new Rng(7);
    for (let i = 0; i < 300; i++) expect(rollAffixes(rng, 11)).toHaveLength(1);
    const n = new Set<number>();
    for (let i = 0; i < 300; i++) n.add(rollAffixes(rng, 12).length);
    expect([...n].sort()).toEqual([1, 2]);
  });

  it("nunca repete nem junta par proibido; mínimo e máximo valem", () => {
    const rng = new Rng(3);
    for (let i = 0; i < 2000; i++) {
      const a = rollAffixes(rng, 15, 2);
      expect(a).toHaveLength(2);
      expect(new Set(a).size).toBe(2);
      for (const [x, y] of AFFIX_FORBIDDEN) expect(a.includes(x) && a.includes(y)).toBe(false);
      for (const id of a) expect(AFFIX_ORDER).toContain(id);
    }
    expect(rollAffixes(rng, 20, 1, 1)).toHaveLength(1);
    for (let i = 0; i < 200; i++) expect(rollAffixes(rng, 20, 1, 1, ["swift"])).not.toContain("swift");
  });

  it("todos os 10 saem com o tempo", () => {
    const rng = new Rng(11);
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) for (const id of rollAffixes(rng, 1)) seen.add(id);
    expect(seen.size).toBe(AFFIX_ORDER.length);
  });

  it("+25% de ouro e XP por afixo, na morte e no sobrevivente", () => {
    expect(affixReward(0)).toBe(1);
    expect(affixReward(2)).toBe(1.5);
    const mods = waveMods(5, "normal");
    const t = { gold: 10, xp: 10, champion: true, bossWave: null, noReward: false };
    const one = killReward({ ...t, affixReward: affixReward(1) }, mods);
    const base = killReward(t, mods);
    expect(one.gold).toBeGreaterThan(base.gold);
    expect(one.xp).toBeGreaterThan(base.xp);
    const s1 = survivorReward({ gold: 100, xp: 100 }, true, mods, 1, undefined, 1, 1.5);
    const s0 = survivorReward({ gold: 100, xp: 100 }, true, mods);
    expect(s1.gold).toBeGreaterThan(s0.gold);
  });

  it("campeão do cronograma sai com afixos; o da Toca dos Campeões com 2", () => {
    const den = { ...waveMods(3, "normal"), room: ROOM_BY_ID.champions_den };
    const w = startWave(3, new Rng(1), () => true, den);
    w.started = true;
    const spawns = new Rng(2), champs = new Rng(5);
    const out = [];
    for (let i = 0; i < 400 && !w.complete; i++) out.push(...stepWave(w, 0.25, { alive: 0, bossAlive: false }, spawns, champs).spawns);
    const champ = out.filter((s) => s.champion);
    expect(champ).toHaveLength(1);
    expect(champ[0].affixes).toHaveLength(2);
    for (const s of out) if (!s.champion) expect(s.affixes).toBeUndefined();
  });
});
