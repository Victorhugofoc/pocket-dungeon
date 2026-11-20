import { describe, expect, it } from "vitest";
import { SPELL_ORDER, SPELLS, modifierCounts, modifierText } from "../src/data/spells";
import { addModifier, addSpell, levelUpSpell, spellContext, spellStats, spMult, stackChance, type SpellSlotState } from "../src/core/spells";
import { newSpellSlot } from "../src/core/run";
import { computeStats } from "../src/core/stats";
import { HEROES } from "../src/data/heroes";

const CTX = { range: 1 };
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
    const st = spellStats(slot("arcane_bolt", 1, ["quick_bolt"]), { ...CTX, cooldownValue: -0.9 });
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

describe("atributos de spell do herói (D14)", () => {
  const base = spellContext(computeStats([]));
  it("sem bônus, os números são os mesmos de sem atributos", () => {
    for (const id of ["fireball", "iceball", "venom_nova", "arcane_bolt"]) {
      expect(spellStats(slot(id, 3), base)).toEqual(spellStats(slot(id, 3), CTX));
    }
  });
  it("poder de magia, dano de spell e escola multiplicam o dano da spell da escola certa", () => {
    const f0 = spellStats(slot("fireball"), base);
    const ctx = spellContext(computeStats([{ spellDamagePct: 0.10, firePct: 0.25, icePct: -0.5 }]));
    expect(spellStats(slot("fireball"), ctx).damage).toBeCloseTo(f0.damage * 1.1 * 1.25);
    const i0 = spellStats(slot("iceball"), base);
    expect(spellStats(slot("iceball"), ctx).damage).toBeCloseTo(i0.damage * 1.1 * 0.5);
    const sp = spellStats(slot("fireball"), spellContext(computeStats([{ spellPower: 4 }])));
    expect(sp.damage).toBeGreaterThan(f0.damage);
  });
  it("queimadura leva o bônus de queimadura e o de fogo; lentidão, os pontos e a duração", () => {
    const f0 = spellStats(slot("fireball"), base);
    const f = spellStats(slot("fireball"), spellContext(computeStats([HEROES.ignis.stats])));
    expect(f.burnDps!).toBeCloseTo(f0.burnDps! * 1.30 * 1.25);
    const i0 = spellStats(slot("iceball"), base);
    const i = spellStats(slot("iceball"), spellContext(computeStats([{ slowPct: 0.10, slowDurationPct: 0.20 }])));
    expect(i.slow!).toBeCloseTo(i0.slow! + 0.10);
    expect(i.slowDuration!).toBeCloseTo(i0.slowDuration! * 1.2);
  });
  it("veneno do herói sobe o dano da Venom Nova", () => {
    const v0 = spellStats(slot("venom_nova"), base);
    const v = spellStats(slot("venom_nova"), spellContext(computeStats([HEROES.vesper.stats])));
    expect(v.damage).toBeCloseTo(v0.damage * 1.3);
  });
  it("recarga e área globais entram no mesmo pool da spell (piso de 35%)", () => {
    const quick = spellStats(slot("arcane_bolt", 1, ["quick_bolt"]), base);
    const ctx = spellContext(computeStats([{ cdrPct: 0.10, areaPct: 0.10 }]));
    const both = spellStats(slot("arcane_bolt", 1, ["quick_bolt"]), ctx);
    expect(both.cooldownMult).toBeLessThan(quick.cooldownMult);
    expect(both.cooldownMult).toBeGreaterThanOrEqual(0.35);
    expect(spellStats(slot("fireball"), ctx).areaMult).toBeCloseTo(1.1);
  });
});

describe("texto e contagem dos modificadores (M6-08)", () => {
  it("modifierText: o texto da spell, ou o da forma evoluída que converte o modificador (D-437)", () => {
    expect(modifierText("chain_lightning", "chain_plus_one")).toBe("+1 target");
    expect(modifierText("chain_lightning", "chain_plus_one", "lightning_strike")).toBe("+8% Lightning Strike damage");
    expect(modifierText("chain_lightning", "quick_arc", "lightning_strike")).toBe("-12% cooldown");
    expect(modifierText("fireball", "long_fuse", "firewave")).toBe("+25% wall length");
  });
  it("modifierCounts agrupa repetidos na ordem em que vieram, como o painel de lá", () => {
    expect(modifierCounts("fireball", ["deep_burn", "hotter_core", "deep_burn"])).toEqual([
      { id: "deep_burn", name: "DEEP BURN", count: 2 }, { id: "hotter_core", name: "HOTTER CORE", count: 1 },
    ]);
  });
});

describe("auras e ativas (M21-06)", () => {
  it("as quatro auras da proposta; as outras sete são ativas", async () => {
    const { SPELLS, SPELL_ORDER } = await import("../src/data/spells");
    const { isAura } = await import("../src/core/spells");
    const auras = SPELL_ORDER.filter((id) => SPELLS[id].mode === "aura");
    expect([...auras].sort()).toEqual(["blade_orbit", "healing_field", "rune_traps", "venom_nova"]);
    expect(SPELL_ORDER.filter((id) => SPELLS[id].mode === "active")).toHaveLength(7);
    expect(isAura("venom_nova")).toBe(true);
    expect(isAura("fireball")).toBe(false);
    expect(isAura("nope")).toBe(false);
  });

  it("tiques que faltam no campo (o do fim conta)", async () => {
    const { remainingTicks } = await import("../src/core/spells");
    expect(remainingTicks(8, 0.75, 0.75)).toBe(10);
    expect(remainingTicks(0.75, 0.75, 0.75)).toBe(1);
    expect(remainingTicks(0.5, 0.75, 0.75)).toBe(0);
    expect(remainingTicks(2, 0.2, 0.75)).toBe(3);
  });
});
