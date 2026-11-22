// Motor de relíquias (core/relics.ts): posse com tags, fontes de atributo, efeitos de spell e despacho dos ganchos.
import { describe, expect, it } from "vitest";
import { grantRelic, LEVEL_HEAL, MOMENTUM, OVERHEAL_SHIELD, relicSources, relicSpellEffects, relicTotals, removeRelic, RelicHooks, type RelicMechanic, type RelicWorld } from "../src/core/relics";
import { newRun } from "../src/core/run";
import { computeStats } from "../src/core/stats";
import { HEROES } from "../src/data/heroes";
import { RELIC_IDS, RELIC_MECH, RELICS, type RelicDef } from "../src/data/relics";

const run = () => newRun({ heroId: "frostine", difficultyId: "normal", startingSpell: HEROES.frostine.startingSpells[0], randomSeed: 7 });

const world = (over: Partial<RelicWorld> = {}): RelicWorld => ({
  time: 0, waveActive: true, hp: 50, maxHp: 100, gold: 0, moving: false, heal: () => {}, emit: () => {}, ...over,
});

describe("relíquias: dados", () => {
  it("cada relíquia tem os atributos iguais à soma dos efeitos e só usa raridade e categoria de lá", () => {
    for (const id of RELIC_IDS) {
      const d = RELICS[id];
      const sum: Record<string, number> = {};
      for (const e of d.effects) sum[e.stat] = (sum[e.stat] ?? 0) + e.value;
      expect(d.stats).toEqual(sum);
      expect(["uncommon", "rare", "epic", "boss", "evolved"]).toContain(d.rarity);
      expect(d.tags.length).toBeGreaterThan(0);
    }
  });
});

describe("relíquias: posse", () => {
  it("dar soma as tags e muda a versão; repetir não entra; tirar desfaz", () => {
    const r = run();
    const tags0 = { ...r.tags };
    expect(grantRelic(r, "ember_heart")).toBe(true);
    expect(r.relics).toEqual(["ember_heart"]);
    expect(r.relicVersion).toBe(1);
    for (const t of RELICS.ember_heart.tags) expect(r.tags[t]).toBe((tags0[t] ?? 0) + 1);
    expect(grantRelic(r, "ember_heart")).toBe(false);
    expect(r.relicVersion).toBe(1);
    expect(grantRelic(r, "blood_pact")).toBe(true);
    expect(r.tags.magic).toBe((tags0.magic ?? 0) + 2);
    expect(removeRelic(r, "ember_heart")).toBe(true);
    expect(r.relics).toEqual(["blood_pact"]);
    expect(r.tags.fire ?? 0).toBe(tags0.fire ?? 0);
    expect(r.tags.magic).toBe((tags0.magic ?? 0) + 1);
    expect(removeRelic(r, "ember_heart")).toBe(false);
    expect(r.relicVersion).toBe(3);
  });

  it("relíquia desconhecida é erro", () => {
    expect(() => grantRelic(run(), "nope")).toThrow();
  });

  it("as fontes de atributo dão o mesmo que somar os atributos de cada relíquia", () => {
    const ids = ["glass_cannon", "duelist_seal", "aegis_heart"];
    const viaEngine = computeStats([HEROES.frostine.stats, ...relicSources(ids)]);
    const direct = computeStats([HEROES.frostine.stats, ...ids.map((id) => RELICS[id].stats)]);
    expect(viaEngine).toEqual(direct);
    expect(relicTotals(ids).maxHpPct).toBeCloseTo(-0.30 + 0.12);
  });

  it("o efeito de spell só vale na spell da relíquia", () => {
    const fake: RelicDef = { ...RELICS.hunters_eye, id: "test_lens", category: "spell", spell: "fireball", spellEffect: { damagePct: 0.18 } };
    RELICS.test_lens = fake;
    try {
      expect(relicSpellEffects(["test_lens", "ember_heart"], "fireball")).toEqual([{ damagePct: 0.18 }]);
      expect(relicSpellEffects(["test_lens"], "iceball")).toEqual([]);
    } finally {
      delete RELICS.test_lens;
    }
  });
});

describe("relíquias: ganchos", () => {
  // mecânicas de teste no formato de relic_mechanics.lua: Kill Streak e um escudo de sobrecura
  const streak: RelicMechanic<{ n: number; left: number }> = {
    id: "streak", stat: "lifeOnKill", init: () => ({ n: 0, left: 0 }),
    onKill: (s) => { s.n = Math.min(10, s.n + 1); s.left = 2.5; },
    tick: (s, _v, _w, dt) => { s.left -= dt; if (s.left <= 0) s.n = 0; },
    onPlayerHit: (s) => { s.n = 0; },
    attackSpeedMult: (s) => 1 + 0.03 * s.n,
    damageMult: (_s, v, _w, hit) => (hit.boss ? 1 + v : 1),
  };
  const shield: RelicMechanic<{ hp: number }> = {
    id: "shield", stat: "regen", init: () => ({ hp: 0 }),
    overheal: (s, v, w, extra) => { s.hp = Math.min(w.maxHp * v, s.hp + extra); },
    absorb: (s, _v, _w, dealt) => { const a = Math.min(s.hp, dealt); s.hp -= a; return dealt - a; },
    blocksHeal: (_s, _v, w) => w.waveActive,
    status: (s) => (s.hp > 0 ? { id: "overshield", left: s.hp, total: 10 } : null),
  };

  it("liga pelo atributo, guarda o estado enquanto ligada e zera ao religar", () => {
    const h = new RelicHooks([streak, shield]);
    const w = world();
    h.refresh({ lifeOnKill: 0.5 });
    expect(h.ids).toEqual(["streak"]);
    const e = { x: 0, z: 0, maxHp: 10, champion: false, boss: false };
    h.onKill(w, e);
    h.onKill(w, e);
    expect(h.attackSpeedMult(w)).toBeCloseTo(1.06);
    h.refresh({ lifeOnKill: 0.5, regen: 0.1 });
    expect(h.attackSpeedMult(w)).toBeCloseTo(1.06);
    expect(h.damageMult(w, { source: "auto", boss: true })).toBeCloseTo(1.5);
    expect(h.damageMult(w, { source: "auto", boss: false })).toBe(1);
    h.tick(w, 3);
    expect(h.attackSpeedMult(w)).toBe(1);
    h.onKill(w, e);
    h.onPlayerHit(w, 5);
    expect(h.attackSpeedMult(w)).toBe(1);
    h.onKill(w, e);
    h.refresh({});
    h.refresh({ lifeOnKill: 1 });
    expect(h.attackSpeedMult(w)).toBe(1);
  });

  it("escudo, recusa de cura e fileira de estados", () => {
    const h = new RelicHooks([shield]);
    const w = world();
    expect(h.absorb(w, 7)).toBe(7);
    h.refresh({ regen: 0.1 });
    h.overheal(w, 25);
    expect(h.statuses(w)).toEqual([{ id: "overshield", left: 10, total: 10 }]);
    expect(h.absorb(w, 7)).toBe(0);
    expect(h.absorb(w, 7)).toBe(4);
    expect(h.statuses(w)).toEqual([]);
    expect(h.blocksHeal(w)).toBe(true);
    expect(h.blocksHeal(world({ waveActive: false }))).toBe(false);
    h.overheal(w, -3);
    expect(h.absorb(w, 1)).toBe(1);
  });

  it("sem mecânica, os ganchos não mudam nada", () => {
    const h = new RelicHooks([]);
    h.refresh(relicTotals(RELIC_IDS));
    const w = world();
    expect(h.damageMult(w, { source: "auto", boss: false })).toBe(1);
    expect(h.attackSpeedMult(w)).toBe(1);
    expect(h.absorb(w, 9)).toBe(9);
    expect(h.blocksHeal(w)).toBe(false);
  });
});

describe("relíquias: mecânicas do lote 1 (M12-02)", () => {
  it("Momentum enche em 10 s andando, esvazia em 2 s parado e multiplica o dano", () => {
    const h = new RelicHooks([MOMENTUM]);
    h.refresh(relicTotals(["momentum"]));
    const run = world({ moving: true });
    for (let i = 0; i < 50; i++) h.tick(run, 0.1);
    expect(h.damageMult(run, { source: "auto", boss: false })).toBeCloseTo(1.1);
    for (let i = 0; i < 60; i++) h.tick(run, 0.1);
    expect(h.damageMult(run, { source: "auto", boss: false })).toBeCloseTo(1.2);
    expect(h.statuses(run)).toEqual([{ id: "momentum", left: expect.closeTo(0.2), total: 0.2 }]);
    const still = world({ moving: false });
    for (let i = 0; i < 10; i++) h.tick(still, 0.1);
    expect(h.damageMult(still, { source: "auto", boss: false })).toBeCloseTo(1.1);
    for (let i = 0; i < 10; i++) h.tick(still, 0.1);
    expect(h.damageMult(still, { source: "auto", boss: false })).toBe(1);
    expect(h.statuses(still)).toEqual([]);
    expect(RELIC_MECH.momentumRamp / RELIC_MECH.momentumFade).toBe(5);
  });

  it("Vital Spark cura 15% da vida máxima por nível ganho", () => {
    const healed: number[] = [];
    const h = new RelicHooks([LEVEL_HEAL]);
    h.refresh(relicTotals(["vital_spark"]));
    const w = world({ maxHp: 200, heal: (n) => healed.push(n) });
    h.onLevelUp(w, 1);
    h.onLevelUp(w, 2);
    h.onLevelUp(w, 0);
    expect(healed).toEqual([30, 60]);
  });

  it("Blood Engine: a sobrecura vira escudo até 20% da vida e come o golpe", () => {
    const h = new RelicHooks([OVERHEAL_SHIELD]);
    h.refresh(relicTotals(["blood_engine"]));
    const w = world({ maxHp: 100 });
    h.overheal(w, 12);
    h.overheal(w, 12);
    expect(h.statuses(w)).toEqual([{ id: "overshield", left: 20, total: 20 }]);
    expect(h.absorb(w, 15)).toBe(0);
    expect(h.absorb(w, 15)).toBe(10);
    expect(h.statuses(w)).toEqual([]);
  });

  it("as mecânicas padrão ligam pelas relíquias certas", () => {
    const h = new RelicHooks();
    h.refresh(relicTotals(["momentum", "vital_spark", "blood_engine", "glass_cannon"]));
    expect(h.ids.sort()).toEqual(["level_heal", "momentum", "overshield"]);
  });
});
