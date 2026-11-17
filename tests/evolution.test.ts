import { describe, expect, it } from "vitest";
import {
  applyEvolution, availableEvolutions, declineEvolutions, pendingEvolutionOffer, recipeMet, wantedRelics,
} from "../src/core/evolution";
import { Rng } from "../src/core/rng";
import { newRun, newSpellSlot, type RunState } from "../src/core/run";
import { spellStats, spMult } from "../src/core/spells";
import { DR_BASE_DAMAGE, DR_SPELL_POWER } from "../src/data/techniques";

const start = (): RunState => newRun({ heroId: "ignis", difficultyId: "normal", startingSpell: "fireball", randomSeed: 7 });
const ctx = { cooldownMult: 1, area: 1, range: 1, status: 1 };

describe("evolução das spells (M6-06, S18)", () => {
  it("precisa do nível 5 e de UMA relíquia da receita", () => {
    const run = start();
    expect(availableEvolutions(run)).toEqual([]);
    run.relics.push("ember_heart");
    expect(recipeMet(run, "firestorm")).toBe(false); // nível 1
    run.spells[0].level = 5;
    // ember_heart está nas duas receitas do Fireball
    expect(availableEvolutions(run)).toEqual([{ slotIndex: 0, evoId: "firestorm" }, { slotIndex: 0, evoId: "firewave" }]);
  });

  it("relíquias que interessam às spells sem evolução", () => {
    const run = start();
    expect(wantedRelics(run)).toMatchObject({ ember_heart: "fireball", infernal_crown: "fireball", ember_spurs: "fireball" });
    run.spells[0].evolution = "firewave";
    expect(wantedRelics(run)).toEqual({});
  });

  it("evoluir não gasta a relíquia e só vale uma vez", () => {
    const run = start();
    run.spells[0].level = 5;
    run.relics.push("infernal_crown");
    applyEvolution(run, 0, "firestorm");
    expect(run.spells[0].evolution).toBe("firestorm");
    expect(run.relics).toEqual(["infernal_crown"]);
    expect(run.evolutionsDone).toBe(1);
    expect(() => applyEvolution(run, 0, "firestorm")).toThrow();
    expect(availableEvolutions(run)).toEqual([]);
  });

  it("recusada, a oferta só volta quando as relíquias mudam", () => {
    const run = start();
    run.spells[0].level = 5;
    run.relics.push("ember_heart");
    const rng = new Rng(1);
    const offer = pendingEvolutionOffer(run, rng)!;
    expect(offer).toHaveLength(2);
    declineEvolutions(run, offer);
    expect(pendingEvolutionOffer(run, rng)).toBeNull();
    run.relics.push("frost_crown");
    run.relicVersion += 1;
    expect(pendingEvolutionOffer(run, rng)).toHaveLength(2);
  });

  it("no máximo 3 opções, sorteadas", () => {
    const run = start();
    run.spells = [{ ...newSpellSlot("fireball"), level: 5 }, { ...newSpellSlot("iceball"), level: 5 }];
    run.relics.push("ember_heart", "frost_crown");
    expect(availableEvolutions(run)).toHaveLength(3);
    run.spells.push({ ...newSpellSlot("blade_orbit"), level: 5 });
    run.relics.push("windblade");
    expect(availableEvolutions(run)).toHaveLength(4);
    expect(pendingEvolutionOffer(run, new Rng(3))).toHaveLength(3);
  });

  it("os números mudam com a evolução", () => {
    const base = spellStats({ id: "blade_orbit", level: 5 }, ctx);
    const evo = spellStats({ id: "blade_orbit", level: 5, evolution: "blade_storm" }, ctx);
    expect(evo.evolution).toBe("blade_storm");
    expect(evo.blades).toBe((base.blades ?? 0) + 2);
    expect(evo.damage).toBeCloseTo(base.damage * 1.15);
    // evolução de outra spell é ignorada
    expect(spellStats({ id: "blade_orbit", level: 5, evolution: "firestorm" }, ctx)).toEqual(base);
  });

  it("Sanctuary fere quem está dentro: (5 + poder de magia × 0,30) por pulso, D-318", () => {
    const st = spellStats({ id: "healing_field", level: 5, evolution: "sanctuary" }, ctx);
    expect(st.fieldDamage).toBeCloseTo(((5 + DR_SPELL_POWER * 0.3) * spMult()) / DR_BASE_DAMAGE);
    expect(spellStats({ id: "healing_field", level: 5 }, ctx).fieldDamage).toBeUndefined();
  });
});
