/// <reference types="node" />
// Paridade com o Dungeon Reign: lê os dados do original (dungeon-idle, em Lua) com o LuaJIT e compara com src/data.
// Se um número mudar de um lado só, este teste quebra. Tabela de regras: docs/paridade.md.
// Pula sozinho se o repo do original ou o luajit não estiverem na máquina (DUNGEON_IDLE e LUAJIT mudam os caminhos).
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { HEROES, HERO_ORDER } from "../src/data/heroes";
import { ACHIEVEMENT_RULES, ACHIEVEMENTS, COSMETIC_NAMES, UNLOCK_REWARDS } from "../src/data/achievements";
import { EVOLUTION_ORDER, EVOLUTIONS, MAX_SPELLS, SPELL_CAST, SPELL_MAX_LEVEL, SPELL_ORDER, SPELL_TUNING, SPELLS } from "../src/data/spells";
import { spellStats } from "../src/core/spells";
import { DR_PX_PER_M } from "../src/data/techniques";
import {
  BOSS, DEPTHS_FROM, DEPTHS_STEP, DIFFICULTIES, DIFFICULTY_ORDER, ENDLESS, ENEMY_WEIGHT, LEVEL_UP_CHOICES,
  LEVELUP_REROLL, RUN_MAP, RUN_START, RUN_TUNING, TOTAL_WAVES, UPGRADE_TIER_WEIGHTS, UPGRADE_TIERS, WAVE_STAGES, WAVES,
  XP_GROWTH,
  ARENA_CROWD, BOSS_MULTS, CHAMPION, CHILD_SCALE, MINION_SCALE, RANDOM_CHAMPION, SPAWN, SURVIVOR_FACTOR,
} from "../src/data/run";
import { ENEMIES } from "../src/data/enemies";
import { UPGRADE_CAPS, UPGRADES } from "../src/data/upgrades";
import { canTier, effectsFor, fitWeight, isAvailable, tierWeights, TIER_ORDER } from "../src/core/levelup";
import { newRun } from "../src/core/run";
import { AMBUSH_DELAY, COMBAT_ROOM_POOL, CURSE_WAVES, CURSES, ENEMY_GROUPS, POOL_TICK, ROOM_BIAS, ROOM_BY_ID, ROOMS, STORM } from "../src/data/rooms";
import { generateMap, type MapRng } from "../src/core/runmap";
import { ambushFor, biasedComposition, bossStats, endlessChampions, enemyStats, hastenBonus, randomChampionChance, startWave, targetCount, waveMods } from "../src/core/wave";
import { Rng } from "../src/core/rng";
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
  "src.progression.level_up", "src.data.enemies", "src.data.affixes", "src.data.upgrades", "src.data.rooms",
  "src.data.achievements", "src.data.unlocks",
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

/** O ciclo da onda de lá (wave_system.lua, enemy.lua, boss.lua), por dificuldade e onda, sem pacto nem sala. */
const WAVE_LIFE = `=(function()
  local E, WS = require("src.run.modifier_engine"), require("src.run.wave_system")
  local Boss, Enemy = require("src.bosses.boss"), require("src.enemies.enemy")
  local DF, A = require("src.data.difficulties"), require("src.data.affixes")
  local out = {}
  for _, did in ipairs(DF.order) do
    local d = DF[did]
    out[did] = {}
    for w = 1, ${WAVE_CHECK} do
      local mods = { enemyHp = E.depthsHp(d, w) * E.lateHp(d, w), enemyDamage = (d.earlyDamage and d.earlyDamage[w]) or d.enemyDamage,
        enemySpeed = d.enemySpeed, projectileSpeed = d.projectileSpeed, bossHp = d.bossHp, bossDamage = d.bossDamage,
        bossSpeed = d.bossSpeed, earlyBossCut = d.earlyBossCut, crownHp = d.crownHp or 1, enemyCount = 1, reward = d.reward }
      local t = WS.targetCount(w, mods)
      if require("src.core.constants").BOSS_WAVES[w] then t = math.max(1, math.floor(t * require("src.data.tuning").BOSS_WAVE_SPAWN + 0.5)) end
      local foes = {}
      for _, id in ipairs({ "goblin", "orc", "berserker" }) do
        local n, c = Enemy.create(id, w, mods, 0, 0), Enemy.create(id, w, mods, 0, 0, { champion = true })
        foes[id] = { hp = n.hp, damage = n.damage, speed = n.speed / n.def.speed, chp = c.hp, cdamage = c.damage, cspeed = c.speed / c.def.speed }
      end
      local bosses = {}
      for _, id in ipairs({ "bloodfang", "gravekeeper", "ember_matriarch", "hollow_king" }) do
        local st = Boss.stats(id, w, mods, { final = w == 20, crowned = w == 20 })
        bosses[id] = { hp = st.hp, damage = st.damage, speed = st.speed / require("src.data.bosses").BASE.speed }
      end
      local ec = {}
      for k in pairs(WS.endlessChampions(w, t) or {}) do ec[#ec + 1] = k end
      table.sort(ec)
      local hb = {}
      for i, el in ipairs({ 6, 25, 30, 38 }) do hb[i] = WS.hastenBonus({ wave = { duration = 40, elapsed = el } }) end
      out[did][w] = { target = t, foes = foes, bosses = bosses, champ = A.randomChance(w), endless = ec, hasten = hb }
    end
  end
  return out
end)()`;

/** Sorteio roteirizado igual nos dois lados: os números vêm de uma lista; `weighted` e `pick` usam o mesmo algoritmo. */
function scripted(u: number[]): MapRng {
  let i = 0;
  const next = () => u[i++ % u.length];
  return {
    weighted<T>(entries: readonly (readonly [T, number])[]): T {
      let r = next() * entries.reduce((a, e) => a + e[1], 0);
      for (const [item, w] of entries) { r -= w; if (r < 0) return item; }
      return entries[entries.length - 1][0];
    },
    pick<T>(arr: readonly T[]): T { return arr[Math.floor(next() * arr.length)]; },
  };
}
/** Cenários do mapa: onda, pacto e santuário disponíveis, e os números do sorteio. */
const MAP_PACTS = ["blood_pact", "glass_oath"];
// gerador de Park-Miller (16807 × x mod 2^31-1): conta exata em double, igual no LuaJIT e aqui
const MAP_SCEN = (() => {
  let x = 12345;
  const rnd = () => { x = (x * 16807) % 2147483647; return x / 2147483647; };
  const out: { wave: number; pact: boolean; shrine: boolean; u: number[] }[] = [];
  for (let wave = 2; wave <= 24; wave++) {
    if (wave % 5 === 0) continue;
    for (let k = 0; k < 6; k++) out.push({ wave, pact: k % 2 === 0, shrine: k !== 3, u: Array.from({ length: 12 }, rnd) });
  }
  return out;
})();
const MAP_LIFE = `=(function()
  local RM = require("src.run.run_map")
  require("src.relics.relic_system").draftPool = function(run) return run._shrine and { 1 } or {} end
  RM.unownedPacts = function(run) return run._pacts end
  local function spy(u)
    local i = 0
    local function nx() i = i + 1 return u[((i - 1) % #u) + 1] end
    return {
      weighted = function(_, e)
        local t = 0 for _, x in ipairs(e) do t = t + x.weight end
        local r = nx() * t
        for _, x in ipairs(e) do r = r - x.weight if r < 0 then return x.item end end
        return e[#e].item
      end,
      pick = function(_, l) return l[math.floor(nx() * #l) + 1] end,
    }
  end
  local scen, x = {}, 12345
  local function rnd() x = (x * 16807) % 2147483647 return x / 2147483647 end
  for wave = 2, 24 do
    if wave % 5 ~= 0 then
      for k = 0, 5 do
        local u = {} for j = 1, 12 do u[j] = rnd() end
        scen[#scen + 1] = { wave = wave, pact = k % 2 == 0, shrine = k ~= 3, u = u }
      end
    end
  end
  local out = {}
  for i, sc in ipairs(scen) do
    local run = { pacts = {}, noPacts = not sc.pact, _shrine = sc.shrine, _pacts = { ${MAP_PACTS.map((p) => JSON.stringify(p)).join(",")} } }
    out[i] = RM.generate(run, spy(sc.u), sc.wave)
  end
  return out
end)()`;
/** A sala na onda: modifier_engine, viés da composição, pesados do Iron Pack e o chefe da emboscada. */
const ROOM_LIFE = `=(function()
  local E, WS, R = require("src.run.modifier_engine"), require("src.run.wave_system"), require("src.data.rooms")
  local DF, W = require("src.data.difficulties"), require("src.data.waves")
  local Boss, Enemy = require("src.bosses.boss"), require("src.enemies.enemy")
  local out = {}
  local ids = {}
  for _, id in ipairs(R.roomOrder) do ids[#ids + 1] = id end
  for _, id in ipairs(R.curseOrder) do ids[#ids + 1] = id end
  for _, id in ipairs(ids) do
    local room = R.rooms[id] or R.curses[id]
    out[id] = {}
    for _, did in ipairs({ "normal", "hard" }) do
      for _, w in ipairs({ 3, 12 }) do
        local m = E.compute({ difficulty = DF[did], wave = w, roomModifier = room, pacts = {} })
        local comp = {}
        for i, e in ipairs(WS.biasedComposition(W.compositionFor(w), room)) do comp[i] = { id = e.item, weight = e.weight } end
        local orc = Enemy.create("orc", w, m, 0, 0)
        local amb = WS.ambushFor(m)
        local b = Boss.stats("gravekeeper", w, m, { ambush = amb })
        out[id][did .. w] = { reward = m.reward, enemyHp = m.enemyHp, enemyDamage = m.enemyDamage, enemySpeed = m.enemySpeed,
          projectileSpeed = m.projectileSpeed, bossHp = m.bossHp, bossDamage = m.bossDamage, bossSpeed = m.bossSpeed,
          enemyCount = m.enemyCount, target = WS.targetCount(w, m), comp = comp, orcHp = orc.hp, orcDamage = orc.damage,
          bossHpStat = b.hp, bossDamageStat = b.damage, champions = m.champions }
      end
    end
  end
  return out
end)()`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Lua = any;

function loadOriginal(): Record<string, Lua> | null {
  if (!existsSync(resolve(ROOT, "src/data/spells.lua"))) return null;
  // expressões longas vão por arquivo (`@caminho`): a linha de comando do Windows tem limite
  const dir = mkdtempSync(join(tmpdir(), "dr-dump-"));
  const args = [WAVE_TABLE, WAVE_LIFE, UPGRADE_LIFE, MAP_LIFE, ROOM_LIFE, SPELL_LIFE].map((code, i) => {
    if (code.length < 2000) return code;
    const f = join(dir, `arg${i}.lua`);
    writeFileSync(f, code);
    return "@" + f;
  });
  const r = spawnSync(LUAJIT, [resolve(import.meta.dirname, "../tools/dr-dump.lua"), ROOT, ...MODULES, ...args], {
    encoding: "utf8", maxBuffer: 64 << 20,
  });
  rmSync(dir, { recursive: true, force: true });
  if (r.error || r.status !== 0) { if (process.env.PARITY_DEBUG) console.error(r.error ?? r.stderr); return null; }
  return JSON.parse(r.stdout);
}

/** Cenários de build para o sorteio (peso por elemento e disponibilidade), montados aqui e avaliados lá e cá. */
const FIT_RUNS = HERO_ORDER.flatMap((h) => [
  { heroId: h, wave: 1, taken: [] as string[], tags: {} as Record<string, number> },
  { heroId: h, wave: 6, taken: ["cone_shot", "piercing_round", "piercing_round", "piercing_round"], tags: { fire: 1, ice: 0 } },
  { heroId: h, wave: 9, taken: ["double_shot", "double_shot", "double_shot", "double_shot", "boomerang"].filter((id) => h === "seraph" || id !== "boomerang"),
    tags: { lightning: 2, arcane: 1 } },
]);
const luaStr = (x: string) => JSON.stringify(x);
const FIT_LUA = `{${FIT_RUNS.map((r) => `{ characterId = ${luaStr(r.heroId)}, wave = ${r.wave},
  upgradesTaken = {${r.taken.map(luaStr).join(",")}}, tags = {${Object.entries(r.tags).map(([k, v]) => `${k} = ${v}`).join(",")}},
  spells = { [0] = { id = ${luaStr(HEROES[r.heroId].technique.id)} }, [1] = { id = ${luaStr(HEROES[r.heroId].startingSpells[0])} } } }`).join(",")}}`;
/** level_up.lua e build_fit.lua: efeitos por raridade, pesos da raridade por nível, peso no sorteio e disponibilidade. */
const UPGRADE_LIFE = `=(function()
  local LU, U, Fit = require("src.progression.level_up"), require("src.data.upgrades"), require("src.build.build_fit")
  local spy = { weighted = function(_, e) local w = {} for i, x in ipairs(e) do w[i] = { x.item, x.weight } end return w end }
  local out = { effects = {}, canTier = {}, tiers = {}, fit = {}, avail = {} }
  for _, u in ipairs(U.list) do
    out.effects[u.id] = { common = LU.effectsFor(u, "common"), rare = LU.effectsFor(u, "rare"), epic = LU.effectsFor(u, "epic") }
    out.canTier[u.id] = LU.canTier(u)
    local t = {}
    for i, lvl in ipairs({ 1, 5, 6, 11, 26, 60 }) do t[i] = LU.rollTier({ level = lvl }, spy, u) end
    out.tiers[u.id] = t
  end
  for i, run in ipairs(${FIT_LUA}) do
    local counts = {}
    for _, id in ipairs(run.upgradesTaken) do
      for _, e in ipairs(U.byId[id].effects) do counts[e.stat] = (counts[e.stat] or 0) + e.value end
    end
    run.stats = { rawCount = function(_, k) return counts[k] or 0 end }
    local f, a = {}, {}
    for _, u in ipairs(U.list) do f[u.id] = Fit.weight(run, u); a[u.id] = LU.isAvailable(run, u) end
    out.fit[i], out.avail[i] = f, a
  end
  return out
end)()`;

/** Cenários de spell (nível, modificadores, poder de magia), calculados lá por spell_stats.lua `compute` e cá por `spellStats`. */
const SPELL_SCEN: { id: string; level: number; mods: string[]; sp: number; evo?: string }[] = [
  ...SPELL_ORDER.flatMap((id) => [1, 2, 3, 4, 5].flatMap((level) => [
    { id, level, mods: [] as string[], sp: 8 },
    { id, level, mods: SPELLS[id].modifiers.map((m) => m.id), sp: 8 },
    { id, level, mods: SPELLS[id].modifiers.slice(0, 2).map((m) => m.id), sp: 16 },
  ])),
  // M6-06: cada evolução no nível 5, sem e com todos os modificadores
  ...EVOLUTION_ORDER.flatMap((evo) => {
    const id = EVOLUTIONS[evo].spell;
    return [
      { id, level: 5, mods: [] as string[], sp: 8, evo },
      { id, level: 5, mods: SPELLS[id].modifiers.map((m) => m.id), sp: 12, evo },
    ];
  }),
];
/** Campos de spell_stats.lua comparados, com a conversão de unidade daqui (px → m, vida de lá → multiplicador ou fração). */
const SPELL_FIELDS: Record<string, "px" | "dmg" | "hp" | 1> = {
  damage: "dmg", cooldown: 1, cooldownMult: 1, range: "px", areaMult: 1, radius: "px", speed: "px", levelScale: 1,
  burnDps: "dmg", burnDuration: 1, volatile: 1, slow: 1, slowDuration: 1, brittle: 1, targets: 1, chainRange: "px",
  doubleHit: 1, projectiles: 1, echo: 1, heal: "hp", duration: 1, tick: 1, surge: 1, extraFields: 1, blades: 1,
  stacks: 1, pull: "px", bossPull: 1, maxRunes: 1, root: 1, trigger: "px", arm: 1, width: "px", knockback: "px", stun: 1,
  length: "px", tickDamage: "dmg", maxRadius: "px", followSpeed: "px", flingDistance: "px", flingRadius: "px",
  flingFraction: 1, linkRange: "px", lineWidth: "px", lineTick: 1, lineDamage: "dmg", splitAngle: 1, splitLength: "px",
  rayDamage: "dmg", jumps: 1, jumpRange: "px", jumpDamage: "dmg", lureRadius: "px", wardHits: 1,
};
const SPELL_LIFE = `=(function()
  local SS = require("src.spells.spell_stats")
  local fields = {${Object.keys(SPELL_FIELDS).map(luaStr).join(",")}}
  local out = {}
  for i, sc in ipairs({${SPELL_SCEN.map((c) => `{ id = ${luaStr(c.id)}, level = ${c.level}, sp = ${c.sp}, evo = ${c.evo ? luaStr(c.evo) : "nil"}, mods = {${c.mods.map(luaStr).join(",")}} }`).join(",")}}) do
    local d = { spellPower = sc.sp, schoolMult = setmetatable({}, { __index = function() return 1 end }), damageMult = 1,
      spellDamageMult = 1, cooldownValues = {}, areaValues = {}, rangeMult = 1, burnMult = 1, volatileValues = {},
      slowPoints = 0, slowDurationMult = 1, lightningTargets = 0, chainRangeMult = 1, echoValues = {}, healFieldHeal = 0,
      healFieldDuration = 0, poisonStacks = 0, fanShots = 0, staticCharge = 0, riftDuration = 0, permafrost = 0, autoDamage = 8,
      critChance = 0, critMult = 1 }
    local run = { relics = {}, stats = { compute = function() return d end } }
    local st = SS.compute(run, { id = sc.id, level = sc.level, modifiers = sc.mods, evolution = sc.evo })
    local o = {}
    for _, k in ipairs(fields) do if type(st[k]) == "number" then o[k] = st[k] end end
    if st.spread then o.spreadRadius, o.spreadStacks = st.spread.radius, st.spread.stacks end
    out[i] = o
  end
  return out
end)()`;

/**
 * D1: nosso texto é o inglês do Dungeon Reign. As chaves do `lang/en.lua` dele são o texto em português
 * dos `.lua`; aqui trocamos cada texto do original pela tradução dele antes de comparar.
 */
function loadEnglish(): Record<string, string> {
  const file = resolve(ROOT, "src/data/lang/en.lua");
  if (!existsSync(file)) return {};
  const un = (s: string) => s.replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
  const map: Record<string, string> = {};
  for (const m of readFileSync(file, "utf8").matchAll(/\[\s*"((?:[^"\\]|\\.)*)"\s*\]\s*=\s*"((?:[^"\\]|\\.)*)"/g)) map[un(m[1])] = un(m[2]);
  return map;
}
const EN_TEXT = loadEnglish();
const english = (s: string): string => EN_TEXT[s] ?? s;
function toEnglish(v: Lua): Lua {
  if (typeof v === "string") return english(v);
  if (Array.isArray(v)) return v.map(toEnglish);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toEnglish(x)]));
  return v;
}

const dr = ((o) => (o ? toEnglish(o) : null))(loadOriginal());
const C: Lua = dr?.["src.core.constants"];
const S: Lua = dr?.["src.data.spells"];
const CH: Lua = dr?.["src.data.characters"];
const WV: Lua = dr?.["src.data.waves"];
const TU: Lua = dr?.["src.data.tuning"];
const RM: Lua = dr?.["src.data.run_map"];
const DF: Lua = dr?.["src.data.difficulties"];
const BS: Lua = dr?.["src.data.bosses"];
const PER_WAVE: Lua[] = dr?.[WAVE_TABLE];
const LIFE: Lua = dr?.[WAVE_LIFE];
const EN: Lua = dr?.["src.data.enemies"];
const AF: Lua = dr?.["src.data.affixes"];
const ACH: Lua = dr?.["src.data.achievements"];
const UNL: Lua = dr?.["src.data.unlocks"];
const SPELL_CALC: Lua[] = dr?.[SPELL_LIFE];

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

  it("números gerais das spells (escala de nível, piso de recarga, teto de lentidão, queimadura, poder de magia)", () => {
    expect(SPELL_TUNING.levelStep).toBe(S.LEVEL_STEP);
    expect(SPELL_TUNING.cooldownFloor).toBe(C.COOLDOWN_FLOOR);
    // M6-05: campos extras do Blooming Sanctuary (S26)
    expect(SPELL_CAST.fieldExtraDistance * DR_PX_PER_M).toBeCloseTo(TU.SPELL_FIELD_EXTRA_DISTANCE);
    expect(SPELL_CAST.fieldExtraCap).toBe(C.CAPS.healingFields);
    expect(SPELL_TUNING.slowMax).toBe(TU.SLOW_MAX);
    expect(SPELL_TUNING.burnSpScale).toBe(TU.BURN_SP_SCALE);
    expect(SPELL_TUNING.burnLevelStep).toBe(TU.BURN_LEVEL_STEP);
    expect(SPELL_TUNING.spWeight).toBe(TU.SP_WEIGHT);
  });

  for (const sid of SPELL_ORDER) {
    it(`spell ${sid}: identidade, números, marcos, modificadores e evoluções`, () => {
      const ours = SPELLS[sid] as unknown as Record<string, unknown>;
      const theirs = S[sid];
      for (const k of ["id", "name", "school", "kind"]) expect(ours[k], `${sid}.${k}`).toEqual(theirs[k]);
      for (const [k, v] of Object.entries(theirs)) {
        if (typeof v === "number") expect(ours[k], `${sid}.${k}`).toBe(v);
      }
      for (const [k, v] of Object.entries(ours)) if (typeof v === "number") expect(theirs[k], `${sid}.${k} (só aqui)`).toBe(v);
      expect(ours.startable ?? true, `${sid}.startable`).toBe(theirs.startable ?? true);
      expect(SPELLS[sid].milestones, `${sid} marcos`).toEqual(theirs.milestones);
      expect(SPELLS[sid].modifiers, `${sid} modificadores`).toEqual(theirs.modifiers);
      expect(SPELLS[sid].evolutions).toEqual(theirs.evolutions);
    });
  }

  it("as 12 evoluções: mesma ordem de id, receita, tipo, texto, tags e números (M6-06)", () => {
    const defs = S.evolutionDefs as Record<string, Lua>;
    expect([...EVOLUTION_ORDER].sort()).toEqual(Object.keys(defs).sort());
    for (const id of EVOLUTION_ORDER) {
      const ours = EVOLUTIONS[id] as unknown as Record<string, unknown>;
      const theirs = defs[id];
      for (const [k, v] of Object.entries(theirs)) {
        if (k === "icon") continue;
        expect(ours[k], `${id}.${k}`).toEqual(v);
      }
      for (const k of Object.keys(ours)) expect(theirs[k], `${id}.${k} (só aqui)`).toBeDefined();
      for (const e of SPELLS[EVOLUTIONS[id].spell].evolutions) expect(defs[e]).toBeDefined();
    }
  });

  it(`spellStats igual a spell_stats.lua compute em ${SPELL_SCEN.length} cenários (nível, modificadores, poder de magia)`, () => {
    const conv = { px: DR_PX_PER_M, dmg: DR_BASE_DAMAGE, hp: DR_BASE_HP, 1: 1 } as const;
    SPELL_SCEN.forEach((c, i) => {
      const ours = spellStats({ id: c.id, level: c.level, modifiers: c.mods, evolution: c.evo },
        { range: 1, spellPower: c.sp }) as unknown as Record<string, number | undefined>;
      const theirs = SPELL_CALC[i];
      const tag = `${c.id} nv${c.level} [${c.mods.join(",")}] sp${c.sp}${c.evo ? " " + c.evo : ""}`;
      for (const [k, unit] of Object.entries({ ...SPELL_FIELDS, spreadRadius: "px", spreadStacks: 1 } as const)) {
        const t = theirs[k];
        const o = ours[k];
        // sem dano lá (Healing Field) é dano 0 aqui
        if (t === undefined) { expect(o, `${tag}.${k} (só aqui)`).toBe(k === "damage" ? 0 : undefined); continue; }
        expect(o, `${tag}.${k}`).toBeDefined();
        expect((o as number) * conv[unit], `${tag}.${k}`).toBeCloseTo(t, 9);
      }
    });
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
    expect(LEVEL_UP_CHOICES).toBe(C.LEVEL_UP_CHOICES);
    expect(UPGRADE_CAPS).toEqual(C.CAPS);
  });

  it("as melhorias de nível: a lista inteira, na mesma ordem e com os mesmos campos", () => {
    const theirs = dr!["src.data.upgrades"].list;
    expect(UPGRADES.map((u) => u.id)).toEqual(theirs.map((u: Lua) => u.id));
    // o dump escreve tabela vazia como objeto
    for (const [i, u] of UPGRADES.entries()) {
      const t = theirs[i];
      expect(JSON.parse(JSON.stringify(u)), u.id).toEqual({ ...t, tags: Array.isArray(t.tags) ? t.tags : [] });
    }
  });

  it("melhorias: efeitos por raridade, quem muda de raridade e os pesos da raridade por nível", () => {
    const L = dr![UPGRADE_LIFE];
    const levels = [1, 5, 6, 11, 26, 60];
    for (const u of UPGRADES) {
      for (const t of TIER_ORDER) expect(effectsFor(u, t), `${u.id} ${t}`).toEqual(L.effects[u.id][t]);
      expect(canTier(u), u.id).toBe(L.canTier[u.id]);
      levels.forEach((lvl, i) => {
        const theirs = L.tiers[u.id][i];
        expect(canTier(u) ? tierWeights(lvl, u.minTier) : "common", `${u.id} nível ${lvl}`).toEqual(theirs);
      });
    }
  });

  it("melhorias: peso no sorteio pela build e disponibilidade (tetos, herói, onda, caminhos exclusivos)", () => {
    const L = dr![UPGRADE_LIFE];
    FIT_RUNS.forEach((r, i) => {
      const run = newRun({ heroId: r.heroId, difficultyId: "normal", startingSpell: HEROES[r.heroId].startingSpells[0], randomSeed: 1 });
      run.wave = r.wave;
      run.upgradesTaken = [...r.taken];
      run.upgradeTiers = r.taken.map(() => "common");
      run.tags = { ...r.tags };
      for (const u of UPGRADES) {
        expect(fitWeight(run, u), `${r.heroId} #${i} ${u.id} peso`).toBeCloseTo(L.fit[i][u.id], 12);
        expect(isAvailable(run, u), `${r.heroId} #${i} ${u.id}`).toBe(L.avail[i][u.id]);
      }
    });
  });

  it("mapa da partida: cartas, pesos, loja garantida", () => {
    expect(RUN_MAP.nodes.map((n) => ({ ...n }))).toEqual(RM.nodes.map((n: Lua) => ({ id: n.id, weight: n.weight })));
    expect(RUN_MAP.choices).toBe(RM.CHOICES);
    expect(RUN_MAP.shopEvery).toBe(RM.SHOP_EVERY);
    expect([...RUN_MAP.replaceable].sort()).toEqual(Object.keys(RM.REPLACEABLE).sort());
  });

  it("salas e maldições: modificadores, viés, grupos, emboscada, campeão e perigos iguais aos de rooms.lua", () => {
    const R = dr!["src.data.rooms"];
    expect(ROOMS.map((r) => r.id)).toEqual(R.roomOrder);
    expect(CURSES.map((r) => r.id)).toEqual(R.curseOrder);
    const strip = (r: Record<string, unknown>) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== "kind"));
    for (const r of [...ROOMS, ...CURSES]) {
      const lua = r.kind === "room" ? R.rooms[r.id] : R.curses[r.id];
      expect(strip(r as unknown as Record<string, unknown>), r.id).toEqual(strip(lua));
    }
    for (const [g, ids] of Object.entries(ENEMY_GROUPS)) expect([...ids].sort(), g).toEqual(Object.keys(R.GROUPS[g]).sort());
    expect(ROOM_BIAS).toEqual(R.BIAS);
    expect(COMBAT_ROOM_POOL).toEqual(ROOMS.filter((r) => !r.ambushOnly).map((r) => r.id));
    expect(AMBUSH_DELAY).toBe(TU.AMBUSH_DELAY);
    expect(CURSE_WAVES).toBe(2);
    const { nearPlayerPx, ...storm } = STORM;
    expect(storm).toEqual(R.STORM);
    expect(nearPlayerPx).toBe(110); // fixo em room_effects.lua `spawnStorm`
    expect(POOL_TICK).toBe(R.POOL_TICK);
  });

  it(`mapa da partida: as cartas sorteadas iguais às de run_map.lua em ${MAP_SCEN.length} sorteios`, () => {
    const L = dr![MAP_LIFE];
    MAP_SCEN.forEach((sc, i) => {
      const cards = generateMap(scripted(sc.u), sc.wave, { pacts: sc.pact ? MAP_PACTS : [], shrine: sc.shrine });
      expect(cards, `onda ${sc.wave} #${i}`).toEqual(L[i + 1 - 1]);
    });
  });

  it("a sala na onda: modificadores, contagem, viés, pesados e chefe da emboscada iguais aos de lá", () => {
    const L = dr![ROOM_LIFE];
    for (const id of Object.keys(ROOM_BY_ID)) {
      const room = ROOM_BY_ID[id];
      for (const did of ["normal", "hard"] as const) {
        for (const w of [3, 12]) {
          const o = L[id][did + w], m = waveMods(w, did, room), ctx = `${id} ${did} ${w}`;
          for (const k of ["reward", "enemyHp", "enemyDamage", "enemySpeed", "projectileSpeed", "bossHp", "bossDamage", "bossSpeed", "enemyCount"] as const) {
            expect(m[k], `${ctx} ${k}`).toBeCloseTo(o[k], 10);
          }
          expect(targetCount(w, m.enemyCount), ctx).toBe(o.target);
          expect(biasedComposition(compositionFor(w), room), ctx).toEqual(o.comp);
          const orc = enemyStats(ENEMIES.orc, w, m);
          expect(orc.hp, ctx).toBeCloseTo(o.orcHp, 8);
          expect(orc.damage, ctx).toBeCloseTo(o.orcDamage, 8);
          const b = bossStats("gravekeeper", w, m, false, ambushFor(m));
          expect(b.hp, ctx).toBeCloseTo(o.bossHpStat, 6);
          expect(b.damage, ctx).toBeCloseTo(o.bossDamageStat, 8);
          expect(room.champions ?? 0, ctx).toBe(o.champions);
        }
      }
    }
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

  it("inimigos que existem aqui: vida, dano, XP, ouro e categoria iguais aos de lá", () => {
    for (const [id, d] of Object.entries(ENEMIES)) {
      const o = EN[id];
      expect(o, id).toBeTruthy();
      expect({ hp: d.hp, damage: d.damage, xp: d.xp, gold: d.gold, category: d.category, cooldown: d.cooldown }, id)
        .toEqual({ hp: o.hp, damage: o.damage, xp: o.xp, gold: o.gold, category: o.category, cooldown: o.cooldown });
    }
    expect(CHAMPION).toEqual({ hpBase: EN.CHAMPION.hpBase, hpPerWave: EN.CHAMPION.hpPerWave, hpMult: EN.CHAMPION.hpMult,
      damageMult: EN.CHAMPION.damageMult, speedMult: EN.CHAMPION.speedMult, rewardMult: EN.CHAMPION.rewardMult });
    expect(MINION_SCALE).toEqual(EN.MINION_SCALE);
    expect(CHILD_SCALE).toEqual(EN.CHILD_SCALE);
    expect(RANDOM_CHAMPION).toEqual(AF.RANDOM);
    expect(SURVIVOR_FACTOR).toBe(C.SURVIVOR_FACTOR);
    expect(ARENA_CROWD).toBeCloseTo(TU.ARENA_CROWD, 12);
    expect(SPAWN).toEqual({ telegraph: C.SPAWN_TELEGRAPH, bossTelegraph: TU.BOSS_TELEGRAPH, minDistancePx: C.SPAWN_MIN_DISTANCE });
    for (const [id, m] of Object.entries(BOSS_MULTS)) {
      const b = BS.builds[id].mults;
      expect(m, id).toEqual({ hp: b.hp, damage: b.damage, speed: b.speed });
    }
  });

  it(`ciclo da onda igual ao de lá em cada dificuldade, da onda 1 à ${WAVE_CHECK}`, () => {
    for (const did of DIFFICULTY_ORDER) {
      for (let w = 1; w <= WAVE_CHECK; w++) {
        const o = LIFE[did][w - 1];
        const at = `${did} onda ${w}`;
        const mods = waveMods(w, did);
        expect(targetCount(w), at).toBe(o.target);
        expect(randomChampionChance(w), at).toBeCloseTo(o.champ, 12);
        expect([...endlessChampions(w, o.target)].sort((a, b) => a - b), at).toEqual(Array.isArray(o.endless) ? o.endless : []);
        for (const id of ["goblin", "orc", "berserker"]) {
          const n = enemyStats(ENEMIES[id], w, mods), c = enemyStats(ENEMIES[id], w, mods, true), f = o.foes[id];
          expect(n.hp, at + " " + id).toBeCloseTo(f.hp, 9);
          expect(n.damage, at + " " + id).toBeCloseTo(f.damage, 9);
          expect(n.speed, at + " " + id).toBeCloseTo(f.speed, 9);
          expect(c.hp, at + " campeão " + id).toBeCloseTo(f.chp, 9);
          expect(c.damage, at + " campeão " + id).toBeCloseTo(f.cdamage, 9);
          expect(c.speed, at + " campeão " + id).toBeCloseTo(f.cspeed, 9);
        }
        for (const id of Object.keys(BOSS_MULTS)) {
          const b = bossStats(id, w, mods), f = o.bosses[id];
          expect(b.hp / f.hp, at + " " + id).toBeCloseTo(1, 12);
          expect(b.damage / f.damage, at + " " + id).toBeCloseTo(1, 12);
          expect(b.speed, at + " " + id).toBeCloseTo(f.speed, 12);
        }
        const wave = startWave(Math.min(w, 4), new Rng(1), () => true);
        [6, 25, 30, 38].forEach((el, i) => {
          wave.duration = 40;
          wave.elapsed = el;
          expect(hastenBonus(wave), at + " apressar em " + el).toBeCloseTo(o.hasten[i], 12);
        });
      }
    }
  });
});

describe.skipIf(!dr)("paridade das conquistas e desbloqueios com o Dungeon Reign", () => {
  it("as conquistas: mesma lista, mesma ordem, mesmos textos, secretas e contadores", () => {
    const theirs = (ACH.list as Lua[]).map((a) => ({ id: a.id, name: a.name, text: a.text, secret: a.secret === true }));
    expect(ACHIEVEMENTS.map((a) => ({ id: a.id, name: a.name, text: a.text, secret: a.secret === true }))).toEqual(theirs);
    expect(ACHIEVEMENTS.length).toBe(ACH.COUNT);
    expect(ACHIEVEMENT_RULES.miserGold).toBe(ACH.MISER_GOLD);
    expect(ACHIEVEMENT_RULES.miserWave).toBe(ACH.MISER_WAVE);
  });

  it("o que cada conquista libera (unlocks.lua REWARDS)", () => {
    expect(UNLOCK_REWARDS).toEqual(UNL.REWARDS);
  });

  it("nomes dos cosméticos", () => {
    const lua = readFileSync(resolve(ROOT, "src/core/unlocks.lua"), "utf8");
    for (const [id, name] of Object.entries(COSMETIC_NAMES)) {
      const pt = lua.match(new RegExp(`${id} = "([^"]+)"`))?.[1];
      expect(pt && english(pt), id).toBe(name);
    }
  });
});

