import { describe, expect, it } from "vitest";
import { SYNERGIES } from "../src/data/synergies";
import { refreshSynergies, synergiesFor, synergyPreview, synergyProgress, synergySources, tagThresholds } from "../src/core/synergies";
import { computeStats, STAT_KEYS } from "../src/core/stats";
import { spellStats, spellContext } from "../src/core/spells";
import { HEROES } from "../src/data/heroes";

const state = (tags: Record<string, number> = {}) => ({ tags, activeSynergies: [] as string[], synergiesEver: [] as string[] });

describe("sinergias (M12-06)", () => {
  it("as 17 de synergies.lua, com ids únicos e atributos que o jogo conhece", () => {
    expect(SYNERGIES.length).toBe(17);
    expect(new Set(SYNERGIES.map((s) => s.id)).size).toBe(17);
    for (const s of SYNERGIES) for (const e of s.effects) expect(STAT_KEYS, `${s.id}.${e.stat}`).toContain(e.stat);
  });

  it("liga no limiar e desliga quando as tags caem (§50)", () => {
    const run = state({ fire: 2 });
    expect(refreshSynergies(run)).toEqual({ gained: [], lost: [] });
    run.tags.fire = 3;
    expect(refreshSynergies(run)).toEqual({ gained: ["pyromancer"], lost: [] });
    expect(refreshSynergies(run)).toEqual({ gained: [], lost: [] });
    run.tags.fire = 5;
    expect(refreshSynergies(run).gained).toEqual(["inferno"]);
    expect(run.activeSynergies).toEqual(["pyromancer", "inferno"]);
    run.tags.fire = 2;
    expect(refreshSynergies(run)).toEqual({ gained: [], lost: ["pyromancer", "inferno"] });
    expect(run.synergiesEver).toEqual(["pyromancer", "inferno"]);
  });

  it("as de mais de uma tag pedem todas", () => {
    expect(synergiesFor({ fire: 2, ice: 2, lightning: 1 })).not.toContain("elemental_triad");
    expect(synergiesFor({ fire: 2, ice: 2, lightning: 2 })).toContain("elemental_triad");
    expect(synergiesFor({ auto: 3, magic: 3 })).toEqual(["armsmaster", "spellblade"]);
    expect(synergiesFor({ healing: 3, survival: 2 })).toEqual(["sanctuary_syn", "wardens_oath"]);
  });

  it("os atributos entram no herói", () => {
    const hero = HEROES.ignis.stats;
    const base = computeStats([hero]);
    const withSyn = computeStats([hero, ...synergySources(["shadowstep", "evasive", "wardens_oath"])]);
    expect(withSyn.dodge - base.dodge).toBeGreaterThan(0.09);
    expect(withSyn.maxHp).toBeGreaterThan(base.maxHp);
  });

  it("Sanctuary e Lifewell somam cura por pulso e duração no Healing Field", () => {
    const slot = { id: "healing_field", level: 1, modifiers: [] };
    const plain = spellStats(slot, spellContext(computeStats([HEROES.seraph.stats])));
    const s = computeStats([HEROES.seraph.stats, ...synergySources(["sanctuary_syn", "lifewell"])]);
    expect(s.healFieldHeal).toBe(2);
    expect(s.healFieldDuration).toBe(0.5);
    const st = spellStats(slot, spellContext(s));
    expect(st.heal! / plain.heal!).toBeCloseTo(2); // 2 de base + 2 das sinergias
    expect(st.duration! - plain.duration!).toBeCloseTo(0.5);
  });

  it("prévia de uma escolha: o que liga e o que desliga", () => {
    expect(synergyPreview({ ice: 2 }, ["ice", "magic"])).toEqual({ gained: ["cryomancer"], lost: [] });
    expect(synergyPreview({ dodge: 2 }, [], ["dodge"])).toEqual({ gained: [], lost: ["evasive"] });
  });

  it("progresso de tag: o próximo limiar, e a evolução de build depois do último", () => {
    expect(tagThresholds().fire.map((t) => t.n)).toEqual([3, 5, 8]);
    expect(tagThresholds().magic).toBeUndefined(); // só aparece em sinergia de duas tags
    const [p] = synergyProgress({ fire: 2 }, ["fire", "magic"]);
    expect(p).toMatchObject({ tag: "fire", now: 2, hit: true, next: { n: 3, id: "pyromancer" } });
    expect(synergyProgress({ fire: 6 }, ["fire"])[0].next).toMatchObject({ n: 8, id: null });
    expect(synergyProgress({ fire: 9 }, ["fire"])).toEqual([]);
  });
});

describe("painel da build (M12-06 parte 2)", () => {
  it("as sinergias mais perto de cada tag, contando todas as tags que pedem", async () => {
    const { nearestSynergies, synergyMissing } = await import("../src/core/synergies");
    const { SYNERGY_BY_ID } = await import("../src/data/synergies");
    const tags = { healing: 2, survival: 2, dodge: 2 };
    expect(synergyMissing(SYNERGY_BY_ID.wardens_oath, tags)).toBe(1);
    expect(nearestSynergies(tags, "healing")).toEqual({ missing: 1, ids: ["sanctuary_syn", "wardens_oath"] });
    expect(nearestSynergies(tags, "survival")).toEqual({ missing: 1, ids: ["wardens_oath"] });
    expect(nearestSynergies(tags, "dodge")).toEqual({ missing: 2, ids: ["shadowstep"] }); // Evasive já ligada
    expect(nearestSynergies({ dodge: 4 }, "dodge")).toBeNull();
  });
});
