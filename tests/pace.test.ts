import { afterEach, describe, expect, it } from "vitest";
import { Rng } from "../src/core/rng";
import { pacedCount, pacedFoe, pacedHealOrb } from "../src/core/pace";
import { enemyStats, startWave, targetCount, waveMods } from "../src/core/wave";
import { baseDuration } from "../src/core/waves";
import { generateZone } from "../src/core/worldgen";
import { ENEMIES } from "../src/data/enemies";
import { PACE } from "../src/data/pace";
import { TUNING } from "../src/data/tuning";
import { ZONES } from "../src/data/zones";

const known = () => true;
const saved = { ...PACE, countScale: [...PACE.countScale] };
afterEach(() => Object.assign(PACE, { ...saved, countScale: [...saved.countScale] }));

describe("camada de ritmo (M21-02)", () => {
  it("a onda usa a contagem e a duração com ritmo; as fórmulas do original não mudam", () => {
    for (const w of [1, 2, 3, 4, 7, 12]) {
      const wave = startWave(w, new Rng(w), known);
      expect(wave.target).toBe(pacedCount(targetCount(w), w));
      expect(wave.duration).toBeCloseTo(baseDuration(w) * PACE.durationMult, 12);
    }
    // as primeiras ondas têm menos inimigos que no original; da 5 em diante, igual
    expect(startWave(1, new Rng(1), known).target).toBeLessThan(targetCount(1));
    expect(startWave(7, new Rng(1), known).target).toBe(targetCount(7));
  });

  it("trocar um número em PACE muda o jogo", () => {
    PACE.countScale = [2];
    PACE.durationMult = 1.5;
    const w = startWave(1, new Rng(1), known);
    expect(w.target).toBe(Math.round(targetCount(1) * 2));
    expect(w.duration).toBeCloseTo(baseDuration(1) * 1.5, 12);
    PACE.enemyHpMult = 2;
    PACE.enemyDamageMult = 0.5;
    const mods = waveMods(3, "normal");
    const o = enemyStats(ENEMIES.orc, 3, mods), p = pacedFoe(o);
    expect(p.hp).toBeCloseTo(o.hp * 2, 12);
    expect(p.damage).toBeCloseTo(o.damage * 0.5, 12);
    expect(p.speed).toBe(o.speed);
  });

  it("a arena das ondas usa o raio com ritmo; a do chefe não", () => {
    const z = generateZone(ZONES.bosque, 7);
    const segs = z.segments.slice(0, -1);
    for (const s of segs) expect(s.r).toBeCloseTo(TUNING.world.arenaRadius * PACE.clearingMult, 12);
    expect(z.segments[z.segments.length - 1].r).toBe(TUNING.world.bossArenaRadius);
  });

  it("orbe de cura (M21-03): campeão sempre deixa e fica fora do teto; chefe e invocado nunca; comuns até o teto", () => {
    const foe = (o: Partial<{ id: string; category: string; champion: boolean; boss: boolean; summoned: boolean }>) =>
      ({ id: "goblin", category: "basic", champion: false, boss: false, summoned: false, ...o });
    expect(pacedHealOrb(foe({ champion: true }), 99)).toEqual({ chance: PACE.healOrb.chance.champion, counts: false });
    expect(PACE.healOrb.chance.champion).toBe(1);
    expect(pacedHealOrb(foe({ boss: true }), 0).chance).toBe(0);
    expect(pacedHealOrb(foe({ summoned: true }), 0).chance).toBe(0);
    expect(pacedHealOrb(foe({}), 0)).toEqual({ chance: PACE.healOrb.chance.normal, counts: true });
    expect(pacedHealOrb(foe({ category: "elite" }), 0).chance).toBe(PACE.healOrb.chance.elite);
    expect(pacedHealOrb(foe({ id: "swarm" }), 0).chance).toBe(PACE.healOrb.chance.swarm);
    expect(pacedHealOrb(foe({}), PACE.healOrb.maxPerWave).chance).toBe(0);
  });
});
