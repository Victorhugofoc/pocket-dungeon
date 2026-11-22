// Motor de relíquias (core/relics.ts): posse com tags, fontes de atributo, efeitos de spell e despacho dos ganchos.
import { describe, expect, it } from "vitest";
import { bossRelicOffer, BURN_SPREAD, CAST_HEAL, FROSTBITE, GLASS_THRONE, grantRelic, prismSchool, PRISM_CYCLE, relicDraftable, LEVEL_HEAL, MOMENTUM, OVERHEAL_SHIELD, type RelicFoe, relicSources, relicSpellEffects, relicTotals, removeRelic, RelicHooks, type RelicMechanic, type RelicWorld } from "../src/core/relics";
import { newRun } from "../src/core/run";
import { computeStats } from "../src/core/stats";
import { spellContext, spellStats } from "../src/core/spells";
import { HEROES } from "../src/data/heroes";
import { RELIC_IDS, RELIC_MECH, RELICS, type RelicDef } from "../src/data/relics";

const run = () => newRun({ heroId: "frostine", difficultyId: "normal", startingSpell: HEROES.frostine.startingSpells[0], randomSeed: 7 });

const world = (over: Partial<RelicWorld> = {}): RelicWorld => ({
  time: 0, waveActive: true, hp: 50, maxHp: 100, gold: 0, moving: false, heal: () => {}, emit: () => {},
  foes: () => [], stun: () => true, burn: () => {}, ...over,
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
    const e = { key: {}, x: 0, z: 0, maxHp: 10, champion: false, boss: false, slowed: false, burn: null };
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

describe("relíquias: lote 2 (M12-03)", () => {
  const stats = (ids: string[]) => computeStats([HEROES.frostine.stats, ...relicSources(ids)]);
  const ctx = (ids: string[]) => spellContext(stats(ids), ids);
  const slot = (id: string, level = 1) => ({ id, level, modifiers: [] as string[] });

  it("relíquia de spell só entra no sorteio com a spell equipada; componente e núcleo entram sempre", () => {
    expect(relicDraftable("pyro_lens", [{ id: "iceball" }])).toBe(false);
    expect(relicDraftable("pyro_lens", [{ id: "fireball" }])).toBe(true);
    expect(relicDraftable("binding_chalk", [])).toBe(true);
    expect(relicDraftable("storm_prism", [])).toBe(true);
    expect(relicDraftable("nope", [])).toBe(false);
  });

  it("escolas novas multiplicam o dano das spells delas", () => {
    for (const [rid, sid] of [["gale_feather", "cyclone"], ["binding_chalk", "rune_traps"], ["cut_crystal", "prism_beam"], ["geode_heart", "quake_totem"]] as const) {
      const base = spellStats(slot(sid), ctx([]));
      const up = spellStats(slot(sid), ctx([rid]), relicSpellEffects([rid], sid));
      expect(up.damage / base.damage, rid).toBeCloseTo(1.08, 6);
    }
  });

  it("Storm Prism e Storm Lens somam alvos; Conduit Ring escala; Echo e Volatile entram no pool da spell", () => {
    const base = spellStats(slot("chain_lightning"), ctx([]));
    const st = spellStats(slot("chain_lightning"), ctx(["storm_prism", "storm_lens", "conduit_ring"]),
      relicSpellEffects(["storm_lens"], "chain_lightning"));
    expect(st.targets).toBe((base.targets ?? 0) + 2);
    expect(st.chainEscalate).toBeCloseTo(0.12, 9);
    expect(st.cooldown).toBeCloseTo(base.cooldown * 0.92, 6);
    const echo = spellStats(slot("arcane_bolt"), ctx(["echo_stone"]), relicSpellEffects(["aether_lens"], "arcane_bolt"));
    expect(echo.echo).toBeCloseTo(1 - 0.92 * 0.92, 9);
    const s = stats(["arcanum_sigil", "echo_stone"]);
    expect(s.echoValues).toEqual([0.06, 0.08]);
  });

  it("forma evoluída converte as relíquias de fora da receita em dano (relicConvert)", () => {
    const evo = { id: "chain_lightning", level: 5, modifiers: [] as string[], evolution: "lightning_strike" };
    const plain = spellStats(evo, ctx(["storm_prism"]));
    // Storm Prism está na receita: não conta; a Storm Lens (+1 alvo da spell) dá +8%
    const lens = spellStats(evo, ctx(["storm_prism", "storm_lens"]), relicSpellEffects(["storm_lens"], "chain_lightning"));
    expect(lens.damage / plain.damage).toBeCloseTo(1.08, 6);
    const arc = { id: "arcane_bolt", level: 5, modifiers: [] as string[], evolution: "arcane_strike" };
    const a0 = spellStats(arc, ctx([]));
    const a1 = spellStats(arc, ctx(["echo_stone"]));
    expect(a1.damage / a0.damage).toBeCloseTo(1.08 * 1.08, 6); // +8% arcano e +8% pelo Echo convertido
  });

  it("Spell Crit, dano em lento e risco das sigilas", () => {
    expect(stats([]).spellCritChance).toBe(0);
    expect(stats(["seers_monocle", "prismatic_core"]).spellCritChance).toBeCloseTo(1 - 0.88 * 0.95, 9);
    expect(stats(["rime_charm"]).slowedDamage).toBeCloseTo(1.10, 9);
    const p = stats(["pyre_sigil"]);
    expect(p.school.fire / stats([]).school.fire).toBeCloseTo(1.2, 6); // o pool positivo multiplica o -50% da Frostine
    expect(p.school.ice).toBeLessThan(stats([]).school.ice);
  });
});

describe("relíquias: lote 3 (M12-04)", () => {
  const stats = (ids: string[]) => computeStats([HEROES.frostine.stats, ...relicSources(ids)]);
  const foe = (over: Partial<RelicFoe> = {}): RelicFoe => ({ key: {}, x: 0, z: 0, boss: false, slowed: false, burn: null, ...over });

  it("Cinder Lens passa a queimadura de quem morre ao vizinho mais perto, no máximo 2,5 s", () => {
    const near = foe({ x: 1 }), far = foe({ x: 2 }), out = foe({ x: 50 });
    const got: { f: RelicFoe; dps: number; t: number }[] = [];
    const w = world({ foes: () => [far, near, out], burn: (f, dps, t) => { got.push({ f, dps, t }); } });
    const h = new RelicHooks([BURN_SPREAD]);
    h.refresh({ burnSpread: 1 });
    h.onKill(w, { ...foe({ burn: { dps: 4, left: 6 } }), maxHp: 10, champion: false });
    expect(got).toEqual([{ f: near, dps: 4, t: RELIC_MECH.spreadMaxTime }]);
    h.onKill(w, { ...foe(), maxHp: 10, champion: false });
    expect(got.length).toBe(1);
  });

  it("Frost Crown congela depois de 3 s de Slow seguido e espera 4 s; chefe não congela", () => {
    const e = foe({ slowed: true }), b = foe({ slowed: true, boss: true });
    const stunned: RelicFoe[] = [];
    const w = world({ foes: () => [e, b], stun: (f) => { if (f.boss) return false; stunned.push(f); return true; } });
    const h = new RelicHooks([FROSTBITE]);
    h.refresh({ frostbite: 0.6 });
    for (let i = 0; i < 29; i++) h.tick(w, 0.1);
    expect(stunned).toEqual([]);
    h.tick(w, 0.15);
    expect(stunned).toEqual([e]);
    for (let i = 0; i < 60; i++) h.tick(w, 0.1); // 4 s de espera + 2 s de Slow: ainda não
    expect(stunned.length).toBe(1);
    for (let i = 0; i < 11; i++) h.tick(w, 0.1);
    expect(stunned.length).toBe(2);
  });

  it("Glass Throne dá o bônus até levar golpe, e volta 5 s depois", () => {
    const w = world({ time: 10 });
    const h = new RelicHooks([GLASS_THRONE]);
    h.refresh({ untouchedPct: 0.6 });
    expect(h.damageMult(w, { source: "auto", boss: false })).toBeCloseTo(1.6);
    h.onPlayerHit(w, 0);
    expect(h.damageMult(w, { source: "auto", boss: false })).toBeCloseTo(1.6);
    h.onPlayerHit(w, 3);
    expect(h.damageMult(w, { source: "auto", boss: false })).toBe(1);
    expect(h.statuses({ ...w, time: 12 })[0].left).toBeCloseTo(2);
    expect(h.damageMult({ ...w, time: 15 }, { source: "auto", boss: false })).toBeCloseTo(1.6);
  });

  it("Mana Battery cura por spell, no mínimo 1", () => {
    let healed = 0;
    const h = new RelicHooks([CAST_HEAL]);
    h.refresh({ castHealPct: 0.005 });
    h.onCast(world({ maxHp: 100, heal: (a) => { healed += a; } }));
    expect(healed).toBe(1);
    h.onCast(world({ maxHp: 1000, heal: (a) => { healed += a; } }));
    expect(healed).toBe(6);
  });

  it("Prism Cycle troca de escola a cada 5 s, na ordem de lá, e só vale nela", () => {
    expect([0, 5, 10, 15, 20].map((t) => prismSchool(t).school)).toEqual(["fire", "ice", "lightning", "arcane", "fire"]);
    const h = new RelicHooks([PRISM_CYCLE]);
    h.refresh({ prismCycle: 0.4 });
    const w = world({ time: 6 });
    expect(h.damageMult(w, { source: "other", school: "ice", boss: false })).toBeCloseTo(1.4);
    expect(h.damageMult(w, { source: "other", school: "fire", boss: false })).toBe(1);
    expect(h.damageMult(w, { source: "auto", boss: false })).toBe(1);
    expect(h.statuses(w)[0].id).toBe("prism_ice");
  });

  it("Arcane Dominion põe o dano de spell e de Arcane no ataque", () => {
    const base = stats([]);
    const s = stats(["arcane_dominion", "rune_charm"]);
    expect(s.autoDamage / base.autoDamage).toBeCloseTo(s.spellDamage * s.school.arcane / (base.spellDamage * base.school.arcane), 6);
    expect(s.autoDamage).toBeGreaterThan(base.autoDamage);
  });

  it("relíquias de chefe ficam fora do sorteio normal", () => {
    for (const id of RELIC_IDS) {
      const c = RELICS[id].category;
      if (c === "boss" || c === "boss_build") expect(relicDraftable(id, []), id).toBe(false);
    }
    expect(RELIC_IDS.filter((id) => RELICS[id].rarity === "boss").length).toBe(20);
  });

  it("recompensa do chefe: premium só com o sorteio, a da build do chefe antes, senão universal", () => {
    const normal = ["blood_pact", "arcane_core", "hunters_eye"];
    const none = bossRelicOffer([], "berserker", normal, 3, 0.9, 0.35, () => 0);
    expect(none).toEqual({ offer: normal, premium: null });
    const b = bossRelicOffer([], "berserker", normal, 3, 0.1, 0.35, () => 0);
    expect(RELICS[b.premium!].bossBuild).toBe("berserker");
    expect(b.offer).toEqual([b.premium, "blood_pact", "arcane_core"]);
    const owned = ["berserkers_brand", "bloodrush_medallion"];
    const u = bossRelicOffer(owned, "berserker", normal, 3, 0.1, 0.35, () => 0);
    expect(RELICS[u.premium!].category).toBe("boss");
    expect(RELICS[bossRelicOffer([], undefined, normal, 3, 0.1, 0.35, () => 0).premium!].category).toBe("boss");
  });
});
