import { describe, expect, it } from "vitest";
import { bossAllowed, crownAttack, drawBoss, type BossBagState } from "../src/core/bossbag";
import { RunRng, checkpoint, continueRun, newRun } from "../src/core/run";
import { Rng } from "../src/core/rng";
import { BOSSES, BOSS_ORDER, CROWN_BORROW } from "../src/data/enemies";

const POOL = BOSS_ORDER.filter((id) => id in BOSSES);
const empty = (): BossBagState => ({ bossBag: [], lastBoss: null, bossHistory: [] });

function draws(seed: number, n: number): string[] {
  const rng = new RunRng(seed).get("bosses");
  const run = empty();
  return Array.from({ length: n }, () => drawBoss(run, rng, POOL));
}

describe("saco de chefes (boss_bag.lua)", () => {
  it("o saco tem os chefes que já lutam aqui, na ordem de bosses.lua", () => {
    expect(POOL).toEqual(["bloodfang", "deathstalker", "storm_tyrant", "venom_hydra", "gravekeeper", "ember_matriarch", "rimefang_wyrm", "gorged_ooze", "dune_leviathan", "hollow_king", "mirage_djinn"]);
  });

  it("chefe só da Hard (minDifficulty) fica fora do saco na Easy e na Normal (boss_bag.lua `allowed`)", () => {
    expect(bossAllowed("hard", "normal")).toBe(false);
    expect(bossAllowed("hard", "easy")).toBe(false);
    expect(bossAllowed("hard", "hard")).toBe(true);
    expect(bossAllowed(undefined, "easy")).toBe(true);
    const normal = POOL.filter((id) => bossAllowed(BOSSES[id].minDifficulty, "normal"));
    expect(normal).not.toContain("hollow_king");
    expect(normal).not.toContain("mirage_djinn");
  });

  it("mesma seed, mesma ordem; seeds diferentes, ordens diferentes", () => {
    expect(draws(7, 12)).toEqual(draws(7, 12));
    const orders = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => draws(s, 4).join(",")));
    expect(orders.size).toBeGreaterThan(1);
  });

  it("sem repetir dentro do saco, e o saco novo não começa pelo último que saiu", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const n = POOL.length, d = draws(seed, n * 3);
      for (let i = 0; i < n * 3; i += n) expect(new Set(d.slice(i, i + n)).size, `seed ${seed}`).toBe(n);
      for (let i = 1; i < d.length; i++) expect(d[i], `seed ${seed} #${i}`).not.toBe(d[i - 1]);
    }
  });

  it("avoid deixa o chefe no saco e tira o próximo", () => {
    const rng = new Rng(3);
    const run = empty();
    const first = drawBoss(run, rng, POOL);
    const next = run.bossBag[run.bossBag.length - 1];
    const got = drawBoss(run, rng, POOL, next);
    expect(got).not.toBe(next);
    expect(got).not.toBe(first);
    expect(run.bossBag).toContain(next);
    expect(run.bossHistory).toEqual([first, got]);
  });

  it("o checkpoint guarda o saco: continuar tira o mesmo chefe", () => {
    const run = newRun({ heroId: "frostine", difficultyId: "normal", startingSpell: "iceball", randomSeed: 11 });
    const rng = new RunRng(run.seed);
    drawBoss(run, rng.get("bosses"), POOL);
    const cp = checkpoint(run, rng, 5);
    const next = drawBoss(run, rng.get("bosses"), POOL);
    const back = continueRun(cp);
    expect(drawBoss(back.run, back.rng.get("bosses"), POOL)).toBe(next);
  });

  it("rei coroado pega um ataque que não tem (wave_system.lua `crownAttack`)", () => {
    const rng = new Rng(5);
    for (const id of POOL) {
      const own = BOSSES[id].patterns.map((p) => p.kind);
      for (let i = 0; i < 20; i++) {
        const k = crownAttack(own, CROWN_BORROW, rng);
        if (k) expect(own).not.toContain(k);
      }
    }
    expect(crownAttack(["nova", "crossfire", "radial", "fan", "spiral", "stormfield", "venomfield"], CROWN_BORROW, rng)).toBeNull();
  });
});
