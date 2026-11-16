import { describe, expect, it } from "vitest";
import { SPELL_ORDER, SPELLS } from "../src/data/spells";
import { addModifier, addSpell, levelUpSpell, spellStats, spMult, stackChance, type SpellSlotState } from "../src/core/spells";
import { newSpellSlot } from "../src/core/run";

const CTX = { cooldownMult: 1, area: 1, range: 1, status: 1 };
const slot = (id: string, level = 1, modifiers: string[] = []) => ({ id, level, modifiers });

describe("spellStats", () => {
  for (const id of SPELL_ORDER) {
    it(`${id}: nível 1 a 5 com números finitos, dano crescendo e recarga positiva`, () => {
      let last = -1;
      for (let lv = 1; lv <= 5; lv++) {
        const st = spellStats(slot(id, lv), CTX);
        expect(st.level).toBe(lv);
        expect(st.milestones.length).toBe(lv - 1);
        for (const [k, v] of Object.entries(st)) if (typeof v === "number") expect(Number.isFinite(v), `${id}.${k}`).toBe(true);
        expect(st.cooldown).toBeGreaterThan(0);
        if (SPELLS[id].baseDamage !== undefined) {
          expect(st.damage).toBeGreaterThan(last);
          last = st.damage;
        }
      }
    });
  }

  it("fireball no nível 1: (14 + 8 × 0,55) / 8 do dano do herói, 4 m de raio", () => {
    const st = spellStats(slot("fireball"), CTX);
    expect(st.damage).toBeCloseTo((14 + 8 * 0.55) / 8);
    expect(st.radius).toBeCloseTo(4);
    expect(st.range).toBeCloseTo(160 / 12);
    expect(st.burnDps).toBeCloseTo((5 + 8 * 0.06) / 8);
    expect(st.burnDuration).toBe(3);
  });

  it("marcos e modificadores somam como lá (Chain Lightning 5 com CHAIN +1 e QUICK ARC)", () => {
    const st = spellStats(slot("chain_lightning", 5, ["chain_plus_one", "quick_arc"]), CTX);
    expect(st.targets).toBe(3 + 1 + 1 + 1);
    expect(st.cooldown).toBeCloseTo(4.2 * 0.88);
    expect(st.damage).toBeCloseTo(((18 + 8 * 0.45) * 3.25 * 1.25) / 8);
  });

  it("a recarga tem piso de 35%", () => {
    const st = spellStats(slot("arcane_bolt", 1, ["quick_bolt"]), { ...CTX, cooldownMult: 0.3 });
    expect(st.cooldownMult).toBe(0.35);
  });

  it("Healing Field: o nível não escala a cura, os marcos sim", () => {
    expect(spellStats(slot("healing_field", 2), CTX).heal).toBeCloseTo(0.02);
    expect(spellStats(slot("healing_field", 5), CTX).heal).toBeCloseTo(0.04);
  });

  it("o Iceball respeita o teto da lentidão", () => {
    const st = spellStats(slot("iceball", 5, ["chilling_winds", "deep_chill"]), CTX);
    expect(st.slow).toBeCloseTo(0.6);
    const capped = spellStats(slot("iceball", 1), CTX, [{ slowPoints: 2 }]);
    expect(capped.slow).toBe(0.9);
  });

  it("modificador de outra spell é erro", () => {
    expect(() => spellStats(slot("fireball", 1, ["quick_arc"]), CTX)).toThrow();
  });

  it("chance e poder de magia", () => {
    expect(stackChance([])).toBe(0);
    expect(stackChance([0.15, 0.25])).toBeCloseTo(1 - 0.85 * 0.75);
    expect(spMult()).toBe(1);
    expect(spMult(16)).toBe(1.5);
  });
});

describe("espaços de spell", () => {
  const make = (id: string): SpellSlotState => newSpellSlot(id);

  it("addSpell recusa repetida, desconhecida e sem espaço", () => {
    const s: SpellSlotState[] = [make("fireball")];
    expect(addSpell(s, "fireball", make)).toEqual({ ok: false, reason: "owned" });
    expect(addSpell(s, "nope", make)).toEqual({ ok: false, reason: "unknown" });
    expect(addSpell(s, "iceball", make)).toEqual({ ok: true });
    expect(addSpell(s, "cyclone", make)).toEqual({ ok: false, reason: "no_slot" });
    expect(s[1]).toMatchObject({ id: "iceball", level: 1, modifiers: [] });
  });

  it("levelUp para no 5; addModifier só do conjunto da spell", () => {
    const s: SpellSlotState[] = [make("fireball")];
    for (let i = 0; i < 4; i++) expect(levelUpSpell(s, 0).ok).toBe(true);
    expect(levelUpSpell(s, 0)).toEqual({ ok: false, reason: "max_level" });
    expect(levelUpSpell(s, 1)).toEqual({ ok: false, reason: "no_slot" });
    expect(addModifier(s, 0, "quick_arc")).toEqual({ ok: false, reason: "not_in_pool" });
    expect(addModifier(s, 0, "deep_burn")).toEqual({ ok: true });
    expect(spellStats(s[0], CTX).burnDuration).toBe(3 + 0.75 + 1.5);
  });
});
