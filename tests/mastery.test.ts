import { describe, expect, it } from "vitest";
import {
  allowedLoadout, autoDpsProxy, loadoutHero, loadoutTechnique, masteryInfo, masteryLevel, masteryOpen, wavePoints,
} from "../src/core/mastery";
import { techniqueStats, type TechStats } from "../src/core/techniques";
import { AchievementTracker, emptyAchievements, normalizeAchievements } from "../src/core/achievements";
import { newRun } from "../src/core/run";
import { HEROES, HERO_ORDER } from "../src/data/heroes";
import { ALT_AUTOS, ALT_TECHNIQUE, MASTERY } from "../src/data/mastery";
import { ALT_TECHNIQUES, TECHNIQUES } from "../src/data/techniques";

/** Dano por recarga de uma técnica (indicador só para comparar a alternativa com a original). */
function techProxy(t: TechStats): number[] {
  const per = (v: number) => v / t.cooldown;
  switch (t.kind) {
    case "fan": return [per(t.damage * (t.shots ?? 1))];
    case "brood": return [per(t.damage * (t.spiders ?? 1) * (t.duration ?? 1))];
    case "leap": return [per(t.damage), per(t.maxHpFraction ?? 0)];
    case "aegis": return [per(t.damage), per(t.healFraction ?? 0)];
    case "blink": return [per(t.damage * (1 + ((t.trail ?? 0) * (t.trailFraction ?? 0)) / (t.trailTick ?? 1)))];
    case "charge": return [per(t.damage * (1 + (t.ringMult ?? 1)) + (t.burnDps ?? 0) * (t.burnDuration ?? 0))];
    default: return [per(t.damage)];
  }
}

const ctx = (hero: string) => ({ cooldownMult: 1, area: 1, range: 1, autoDamage: HEROES[hero].auto.damage });

describe("M21-11 mastery", () => {
  it("every hero has one alternate attack and one alternate technique of the same kind", () => {
    for (const h of HERO_ORDER) {
      expect(ALT_AUTOS[h], h).toBeTruthy();
      const alt = TECHNIQUES[ALT_TECHNIQUE[h]];
      expect(alt, h).toBeTruthy();
      expect(alt.base).toBe(HEROES[h].technique.id);
      expect(alt.kind).toBe(HEROES[h].technique.kind);
      expect(alt.hero).toBe(h);
      expect(alt.milestones.map((m) => m.level)).toEqual([2, 3, 4, 5]);
    }
    expect(Object.keys(ALT_TECHNIQUES)).toHaveLength(HERO_ORDER.length);
  });

  it("no alternate basic attack is stronger than the original (and none is useless)", () => {
    for (const h of HERO_ORDER) {
      const base = autoDpsProxy(HEROES[h].auto);
      const alt = autoDpsProxy(loadoutHero(h, { auto: true }).auto);
      expect(alt, h).toBeLessThanOrEqual(base);
      expect(alt, h).toBeGreaterThan(base * 0.7);
    }
  });

  it("no alternate technique is stronger than the original at any level", () => {
    for (const h of HERO_ORDER) {
      for (let lv = 1; lv <= 5; lv++) {
        const base = techProxy(techniqueStats(HEROES[h].technique.id, lv, ctx(h)));
        const alt = techProxy(techniqueStats(ALT_TECHNIQUE[h], lv, ctx(h)));
        alt.forEach((v, i) => {
          expect(v, `${h} lv${lv} #${i}`).toBeLessThanOrEqual(base[i] * 1.05);
          if (i === 0) expect(v, `${h} lv${lv}`).toBeGreaterThan(base[i] * 0.6);
        });
      }
    }
  });

  it("levels, points and what each level opens", () => {
    expect(masteryLevel(0)).toBe(1);
    expect(masteryLevel(MASTERY.levels[1])).toBe(2);
    expect(masteryLevel(MASTERY.levels[2] + 500)).toBe(3);
    expect(masteryInfo(25)).toMatchObject({ level: 2, from: 20, next: 60 });
    expect(masteryInfo(99)).toMatchObject({ level: 3, from: 60, next: 60, maxLevel: 3 });
    expect(wavePoints(0)).toBe(MASTERY.waveClear);
    expect(wavePoints(1)).toBe(MASTERY.waveClear + MASTERY.bossKill);
    expect(masteryOpen(0)).toEqual({ auto: false, technique: false });
    expect(masteryOpen(20)).toEqual({ auto: true, technique: false });
    expect(masteryOpen(0, true)).toEqual({ auto: true, technique: true });
    expect(allowedLoadout("frostine", { auto: true, technique: true }, 20)).toEqual({ auto: true });
  });

  it("the run uses the alternates; the hero keeps the rest", () => {
    const run = newRun({ heroId: "zephyr", difficultyId: "normal", startingSpell: "fireball", randomSeed: 1, loadout: { auto: true, technique: true } });
    expect(run.technique.id).toBe("deadeye");
    expect(run.loadout).toEqual({ auto: true, technique: true });
    const h = loadoutHero("zephyr", run.loadout);
    expect(h.technique.id).toBe("deadeye");
    expect(h.auto.rate).toBe(ALT_AUTOS.zephyr.auto.rate);
    expect(h.auto.ricochet).toBe(HEROES.zephyr.auto.ricochet);
    expect(h.auto.color).toBe(HEROES.zephyr.auto.color);
    expect(h.style).toBe(HEROES.zephyr.style);
    expect(loadoutHero("zephyr", undefined)).toBe(HEROES.zephyr);
    expect(loadoutTechnique("zephyr", {})).toBe("fan_the_hammer");
    expect(newRun({ heroId: "zephyr", difficultyId: "normal", startingSpell: "fireball", randomSeed: 1 }).loadout).toBeUndefined();
  });

  it("won waves give mastery points; lost or dev runs do not", () => {
    const s = emptyAchievements();
    const t = new AchievementTracker(s, { heroes: HERO_ORDER, bosses: ["goblin_king"], enemies: ["goblin"], relics: ["r1"] });
    t.runStart("varok");
    t.waveStart(5);
    t.enemyKilled({ key: {}, id: "goblin_king", boss: true, champion: false, source: "auto", elapsed: 0 });
    t.waveComplete({ wave: 5, bossWave: true, gameOver: false, gold: 0 });
    expect(s.mastery.varok).toBe(wavePoints(1));
    t.waveStart(6);
    t.waveComplete({ wave: 6, bossWave: false, gameOver: true, gold: 0 });
    expect(s.mastery.varok).toBe(wavePoints(1));
    t.devUsed = true;
    t.waveStart(7);
    t.waveComplete({ wave: 7, bossWave: false, gameOver: false, gold: 0 });
    expect(s.mastery.varok).toBe(wavePoints(1));
    const back = normalizeAchievements(JSON.parse(JSON.stringify({ ...s, mastery: { varok: 4, bad: "x" }, loadouts: { varok: { auto: true } } })))!;
    expect(back.mastery).toEqual({ varok: 4 });
    expect(back.loadouts).toEqual({ varok: { auto: true } });
  });
});
