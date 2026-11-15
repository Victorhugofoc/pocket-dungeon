/// <reference types="node" />
// Paridade com o Dungeon Reign: lê os dados do original (dungeon-idle, em Lua) com o LuaJIT e compara com src/data.
// Se um número mudar de um lado só, este teste quebra. Tabela de regras: docs/paridade.md.
// Pula sozinho se o repo do original ou o luajit não estiverem na máquina (DUNGEON_IDLE e LUAJIT mudam os caminhos).
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { HEROES, HERO_ORDER } from "../src/data/heroes";
import { MAX_SPELLS, SPELL_MAX_LEVEL, SPELL_ORDER } from "../src/data/spells";
import {
  DR_BASE_DAMAGE, DR_BASE_HP, DR_SPELL_POWER, FROST, SHADOW, SHIELD_THROW, TECH_LEVEL_STEP, TECH_MAX_LEVEL,
  TECHNIQUE_ORDER, TECHNIQUES, UNBREAKABLE, VENOM, RICOCHET,
} from "../src/data/techniques";

const ROOT = resolve(process.env.DUNGEON_IDLE ?? resolve(import.meta.dirname, "../../GitHub/dungeon-idle"));
const LUAJIT = process.env.LUAJIT ?? "luajit";
const MODULES = ["src.core.constants", "src.data.spells", "src.data.characters"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Lua = any;

function loadOriginal(): Record<string, Lua> | null {
  if (!existsSync(resolve(ROOT, "src/data/spells.lua"))) return null;
  const r = spawnSync(LUAJIT, [resolve(import.meta.dirname, "../tools/dr-dump.lua"), ROOT, ...MODULES], {
    encoding: "utf8", maxBuffer: 64 << 20,
  });
  if (r.error || r.status !== 0) return null;
  return JSON.parse(r.stdout);
}

const dr = loadOriginal();
const C: Lua = dr?.["src.core.constants"];
const S: Lua = dr?.["src.data.spells"];
const CH: Lua = dr?.["src.data.characters"];

/** Campos numéricos de lá que não têm equivalente aqui, com o motivo (vira linha "adaptado" em docs/paridade.md). */
const TECH_NOT_PORTED: Record<string, string[]> = {};

describe.skipIf(!dr)("paridade com o Dungeon Reign", () => {
  it("constantes de spell e de escala", () => {
    expect(MAX_SPELLS).toBe(C.MAX_SPELLS);
    expect(SPELL_MAX_LEVEL).toBe(C.SPELL_MAX_LEVEL);
    expect(TECH_MAX_LEVEL).toBe(C.SPELL_MAX_LEVEL);
    expect(TECH_LEVEL_STEP).toBe(S.LEVEL_STEP);
    expect(DR_BASE_DAMAGE).toBe(C.PLAYER.baseDamage);
    expect(DR_SPELL_POWER).toBe(C.PLAYER.spellPower);
    expect(DR_BASE_HP).toBe(C.PLAYER.maxHp);
  });

  it("as 11 spells, na mesma ordem", () => {
    expect([...SPELL_ORDER]).toEqual(S.order);
  });

  it("os 9 heróis, na mesma ordem", () => {
    expect([...HERO_ORDER]).toEqual(CH.order);
  });

  it("4 spells iniciais de cada herói, iguais e na mesma ordem", () => {
    for (const id of HERO_ORDER) expect([...HEROES[id].startingSpells], id).toEqual(CH[id].startingSpells);
  });

  it("Healing Field não é spell inicial de ninguém", () => {
    for (const id of HERO_ORDER) expect(HEROES[id].startingSpells).not.toContain("healing_field");
  });

  it("técnica de cada herói", () => {
    for (const id of HERO_ORDER) expect(HEROES[id].technique.id, id).toBe(CH[id].technique);
    expect([...TECHNIQUE_ORDER]).toEqual(S.techniqueOrder);
  });

  for (const tid of TECHNIQUE_ORDER) {
    it(`técnica ${tid}: identidade, números, marcos e evolução`, () => {
      const ours = TECHNIQUES[tid] as Record<string, unknown>;
      const theirs = S[tid];
      for (const k of ["id", "hero", "name", "school", "kind", "cooldown"]) expect(ours[k], `${tid}.${k}`).toEqual(theirs[k]);
      const skip = new Set(TECH_NOT_PORTED[tid] ?? []);
      for (const [k, v] of Object.entries(theirs)) {
        if (typeof v !== "number" || skip.has(k)) continue;
        expect(ours[k], `${tid}.${k}`).toBe(v);
      }
      expect(TECHNIQUES[tid].milestones.map((m) => ({ level: m.level, id: m.id, effect: m.effect })), `${tid} marcos`)
        .toEqual(theirs.milestones.map((m: Lua) => ({ level: m.level, id: m.id, effect: Array.isArray(m.effect) ? {} : m.effect })));
      expect(TECHNIQUES[tid].evolution.name).toBe(theirs.evolution.name);
    });
  }

  it("passiva de gelo da Frostine", () => {
    const f = CH.frostine.frost;
    for (const k of Object.keys(f)) expect((FROST as Record<string, unknown>)[k], `frost.${k}`).toBe(f[k]);
  });

  it("veneno e Ninhada da Vesper", () => {
    const p = CH.vesper.autoPoison, b = CH.vesper.brood;
    expect(VENOM.autoFraction).toBe(p.fraction);
    expect(VENOM.autoDuration).toBe(p.duration);
    expect(VENOM.autoStacks).toBe(p.stacks);
    expect(HEROES.vesper.auto.status?.maxStacks, "acúmulos do tiro da Vesper").toBe(p.stacks);
    expect(VENOM.broodEvery).toBe(b.every);
    expect(VENOM.broodMax).toBe(b.max);
    expect(VENOM.broodLife).toBe(b.life);
  });

  it("Inquebrável do Varok", () => {
    expect(UNBREAKABLE.maxHitFraction).toBe(CH.varok.maxHitFraction);
    expect(HEROES.varok.maxHitFraction).toBe(CH.varok.maxHitFraction);
  });

  it("curas fixas viram fração da vida (÷ vida inicial de lá)", () => {
    // passiveText de lá: "cura 4 de vida" (Umbra) e "cura 2 de vida" (Seraph)
    expect(SHADOW.backstabKillHeal * DR_BASE_HP).toBeCloseTo(4);
    expect(SHIELD_THROW.heal * DR_BASE_HP).toBeCloseTo(2);
    expect(RICOCHET.bounces).toBe(1);
  });
});
