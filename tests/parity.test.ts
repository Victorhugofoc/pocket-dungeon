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
  BOSS, DEPTHS_FROM, DEPTHS_STEP, DIFFICULTIES, DIFFICULTY_ORDER, ENDLESS, ENEMY_WEIGHT, LEVEL_UP_CHOICES,
  LEVELUP_REROLL, RUN_MAP, RUN_START, RUN_TUNING, TOTAL_WAVES, UPGRADE_TIER_WEIGHTS, UPGRADE_TIERS, WAVE_STAGES, WAVES,
  XP_GROWTH,
} from "../src/data/run";
import {
  baseDuration, baseEnemyCount, bossGold, bossTier, bossXp, compositionFor, damageScale, hasMapBefore, hpScale,
  isBossWave, nextXpToNext, segmentOf, waveGold, waveXp,
} from "../src/core/waves";
import {
  DR_BASE_DAMAGE, DR_BASE_HP, DR_SPELL_POWER, FROST, SHADOW, SHIELD_THROW, TECH_LEVEL_STEP, TECH_MAX_LEVEL,
  TECHNIQUE_ORDER, TECHNIQUES, UNBREAKABLE, VENOM, RICOCHET,
} from "../src/data/techniques";

const ROOT = resolve(process.env.DUNGEON_IDLE ?? resolve(import.meta.dirname, "../../GitHub/dungeon-idle"));
const LUAJIT = process.env.LUAJIT ?? "luajit";
const MODULES = [
  "src.core.constants", "src.data.spells", "src.data.characters",
  "src.data.waves", "src.data.tuning", "src.data.run_map", "src.data.difficulties", "src.data.bosses",
  "src.progression.level_up",
];
/** Até que onda as fórmulas são comparadas (passa da 20 para cobrir o modo sem fim). */
const WAVE_CHECK = 40;
/** As fórmulas de lá, calculadas onda a onda pelo próprio Lua. */
const WAVE_TABLE = `=(function()
  local W, C, B = require("src.data.waves"), require("src.core.constants"), require("src.data.bosses")
  local M = require("src.run.run_map")
  local t = {}
  for w = 1, ${WAVE_CHECK} do
    local comp = {}
    for i, e in ipairs(W.compositionFor(w)) do comp[i] = { id = e.item, weight = e.weight } end
    t[w] = { duration = W.baseDuration(w), count = W.baseEnemyCount(w), hp = W.hpScale(w), damage = W.damageScale(w),
      gold = W.baseGold(w), xp = W.baseXp(w), boss = C.BOSS_WAVES[w] == true, map = M.hasMapBefore(w),
      segment = M.segmentOf(w), tier = B.tier(w), bossGold = B.gold(w), bossXp = B.xp(w), comp = comp }
  end
  return t
end)()`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Lua = any;

function loadOriginal(): Record<string, Lua> | null {
  if (!existsSync(resolve(ROOT, "src/data/spells.lua"))) return null;
  const r = spawnSync(LUAJIT, [resolve(import.meta.dirname, "../tools/dr-dump.lua"), ROOT, ...MODULES, WAVE_TABLE], {
    encoding: "utf8", maxBuffer: 64 << 20,
  });
  if (r.error || r.status !== 0) return null;
  return JSON.parse(r.stdout);
}

const dr = loadOriginal();
const C: Lua = dr?.["src.core.constants"];
const S: Lua = dr?.["src.data.spells"];
const CH: Lua = dr?.["src.data.characters"];
const WV: Lua = dr?.["src.data.waves"];
const TU: Lua = dr?.["src.data.tuning"];
const RM: Lua = dr?.["src.data.run_map"];
const DF: Lua = dr?.["src.data.difficulties"];
const BS: Lua = dr?.["src.data.bosses"];
const PER_WAVE: Lua[] = dr?.[WAVE_TABLE];

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

describe.skipIf(!dr)("paridade da partida com o Dungeon Reign", () => {
  it("constantes de onda, XP e início", () => {
    expect(TOTAL_WAVES).toBe(C.TOTAL_WAVES);
    expect(XP_GROWTH).toBe(C.XP_GROWTH);
    expect(LEVEL_UP_CHOICES).toBe(C.LEVEL_UP_CHOICES);
    expect(RUN_START).toEqual({ level: C.PLAYER.level, xp: C.PLAYER.xp, xpToNext: C.PLAYER.xpToNext, gold: C.PLAYER.gold });
    expect(ENDLESS).toEqual(C.ENDLESS);
  });

  it("dados das ondas", () => {
    expect([...WAVES.countMult]).toEqual(WV.COUNT_MULT);
    expect(WAVES.spawnWindow).toBe(WV.SPAWN_WINDOW);
    expect(WAVES.firstSpawnDelay).toBe(WV.FIRST_SPAWN_DELAY);
    expect(WAVES.bossWaveSpawn).toBe(TU.BOSS_WAVE_SPAWN);
    expect(ENEMY_WEIGHT).toEqual(WV.WEIGHT);
    expect(WAVE_STAGES).toEqual(WV.STAGES);
  });

  it(`fórmulas das ondas iguais às de lá, da onda 1 à ${WAVE_CHECK}`, () => {
    for (let w = 1; w <= WAVE_CHECK; w++) {
      const o = PER_WAVE[w - 1];
      const at = `onda ${w}`;
      expect(baseDuration(w), at).toBe(o.duration);
      expect(baseEnemyCount(w), at).toBe(o.count);
      expect(hpScale(w), at).toBeCloseTo(o.hp, 12);
      expect(damageScale(w), at).toBeCloseTo(o.damage, 12);
      expect(waveGold(w), at).toBe(o.gold);
      expect(waveXp(w), at).toBe(o.xp);
      expect(isBossWave(w), at).toBe(o.boss);
      expect(hasMapBefore(w), at).toBe(o.map);
      expect(segmentOf(w), at).toBe(o.segment);
      expect(bossTier(w), at).toBe(o.tier);
      expect(bossGold(w), at).toBe(o.bossGold);
      expect(bossXp(w), at).toBe(o.bossXp);
      expect(compositionFor(w), at).toEqual(o.comp);
    }
  });

  it("curva de XP (xp.lua)", () => {
    let ours: number = RUN_START.xpToNext, theirs: number = C.PLAYER.xpToNext;
    for (let lvl = 1; lvl < 40; lvl++) {
      ours = nextXpToNext(ours);
      theirs = Math.floor(theirs * C.XP_GROWTH);
      expect(ours, `nível ${lvl + 1}`).toBe(theirs);
    }
  });

  it("raridade e troca das melhorias de nível", () => {
    const LU = dr!["src.progression.level_up"];
    expect(UPGRADE_TIERS).toEqual(LU.TIERS);
    expect(UPGRADE_TIER_WEIGHTS).toEqual(LU.TIER_WEIGHTS);
    expect(LEVELUP_REROLL).toEqual(TU.LEVELUP_REROLL);
  });

  it("mapa da partida: cartas, pesos, loja garantida", () => {
    expect(RUN_MAP.nodes.map((n) => ({ ...n }))).toEqual(RM.nodes.map((n: Lua) => ({ id: n.id, weight: n.weight })));
    expect(RUN_MAP.choices).toBe(RM.CHOICES);
    expect(RUN_MAP.shopEvery).toBe(RM.SHOP_EVERY);
    expect([...RUN_MAP.replaceable].sort()).toEqual(Object.keys(RM.REPLACEABLE).sort());
  });

  it("dificuldades", () => {
    expect(DIFFICULTY_ORDER).toEqual(DF.order);
    for (const id of DIFFICULTY_ORDER) expect(DIFFICULTIES[id], id).toEqual(DF[id]);
    expect(DEPTHS_STEP).toBe(DF.DEPTHS_STEP);
    expect(DEPTHS_FROM).toBe(DF.DEPTHS_FROM);
  });

  it("chefes: base, tier, recompensa, onda final, vida extra e cura", () => {
    const b = BS.BASE;
    expect(BOSS.base).toEqual({ hpBase: b.hpBase, hpPerWave: b.hpPerWave, damageBase: b.damageBase,
      damagePerWave: b.damagePerWave, enrageAt: b.enrageAt });
    expect(BOSS.tier).toEqual(BS.TIER);
    expect(BOSS.relicChoices).toBe(BS.RELIC_CHOICES);
    expect(BOSS.premiumChance).toBe(BS.PREMIUM_CHANCE);
    expect(BOSS.final).toEqual({ wave: BS.FINAL.wave, hp: BS.FINAL.hp, damage: BS.FINAL.damage, telegraph: BS.FINAL.telegraph });
    expect(BOSS.hpMult).toBe(TU.BOSS_HP_MULT);
    expect(BOSS.hpPerWaveAfter5).toBe(TU.BOSS_HP_PER_WAVE);
    expect(BOSS.hpEarly).toEqual(TU.BOSS_HP_EARLY);
    expect(BOSS.healPct).toBe(TU.BOSS_HEAL_PCT);
  });

  it("regras gerais de combate da partida", () => {
    expect(RUN_TUNING.introTime).toBe(TU.INTRO_TIME);
    expect(RUN_TUNING.clearedTime).toBe(TU.CLEARED_TIME);
    expect(RUN_TUNING.combatHealMult).toBe(TU.COMBAT_HEAL_MULT);
    expect(RUN_TUNING.enemyDamageMult).toBe(TU.ENEMY_DAMAGE_MULT);
    expect(RUN_TUNING.healOrb).toEqual(TU.HEAL_ORB);
    expect(RUN_TUNING.hasten).toEqual(TU.HASTEN);
  });
});
