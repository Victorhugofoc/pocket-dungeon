import { describe, expect, it } from "vitest";
import { Rng } from "../src/core/rng";
import { campsFor, startWave, stepWave, waveMods, type WaveSpawn } from "../src/core/wave";
import { CAMP_ROLES, CAMPS } from "../src/data/camps";
import { ENEMIES } from "../src/data/enemies";
import { ROOMS } from "../src/data/rooms";

const known = (id: string) => id in ENEMIES;

function spawnsOf(wave: number, seed: number, mods = waveMods(wave, "normal")): WaveSpawn[] {
  const w = startWave(wave, new Rng(seed), known, mods);
  w.started = true;
  const rng = new Rng(seed + 100), champs = new Rng(seed + 200);
  const out: WaveSpawn[] = [];
  for (let i = 0; i < 4000 && !w.complete; i++) out.push(...stepWave(w, 1 / 30, { alive: 5, bossAlive: false }, rng, champs).spawns);
  return out;
}

describe("composição dos grupos (M9-07)", () => {
  it("todo id dos papéis existe e as formas têm vagas", () => {
    for (const ids of Object.values(CAMP_ROLES)) for (const id of ids) expect(ENEMIES[id], id).toBeDefined();
    for (const c of CAMPS) expect(c.slots.length).toBeGreaterThan(0);
  });

  it("onda 1 (só goblin) cai no grupo misto; a onda 2 já monta escolta com o orc", () => {
    expect(campsFor([["goblin", 1]]).map((c) => c.id)).toEqual(["mixed"]);
    expect(campsFor([["goblin", 3], ["orc", 1]]).map((c) => c.id).sort()).toEqual(["escort", "mixed"]);
  });

  it("cada vaga respeita o papel da forma e a contagem da onda não muda", () => {
    for (const wave of [3, 6, 9, 12]) {
      const sp = spawnsOf(wave, wave);
      const w = startWave(wave, new Rng(wave), known, waveMods(wave, "normal"));
      expect(sp.length).toBe(w.target);
      for (const s of sp) {
        expect(s.camp).toBeDefined();
        const camp = CAMPS.find((c) => c.id === s.camp)!;
        // o papel daquela vaga: alguma vaga da forma com o mesmo rank aceita o id
        const ok = camp.slots.some((sl) => sl.rank === s.rank && (sl.role === "any" || CAMP_ROLES[sl.role].includes(s.id)));
        expect(ok, `${s.camp} ${s.rank} ${s.id}`).toBe(true);
      }
    }
  });

  it("atiradores nascem atrás e a linha de frente na frente, nas ondas com os dois", () => {
    const sp = Array.from({ length: 6 }, (_, i) => spawnsOf(12, i + 1)).flat();
    const back = sp.filter((s) => s.rank === "back");
    expect(back.length).toBeGreaterThan(0);
    expect(back.every((s) => CAMP_ROLES.back.includes(s.id))).toBe(true);
    expect(new Set(sp.map((s) => s.camp)).size).toBeGreaterThanOrEqual(4);
  });

  it("o campeão da Toca nasce na 1ª vaga da escolta", () => {
    const den = ROOMS.find((r) => (r.champions ?? 0) > 0)!;
    let seen = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const sp = spawnsOf(8, seed, waveMods(8, "normal", den));
      for (const s of sp.filter((x) => x.champion)) {
        seen++;
        expect(s.camp).toBe("escort");
        expect(s.rank).toBe("mid");
        expect(CAMP_ROLES.elite.includes(s.id)).toBe(true);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});
