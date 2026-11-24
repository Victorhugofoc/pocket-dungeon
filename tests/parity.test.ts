/// <reference types="node" />
// Paridade com o Dungeon Reign: lê os dados do original (dungeon-idle, em Lua) com o LuaJIT e compara com src/data.
// Se um número mudar de um lado só, este teste quebra. Tabela de regras: docs/paridade.md.
// Pula sozinho se o repo do original ou o luajit não estiverem na máquina (DUNGEON_IDLE e LUAJIT mudam os caminhos).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { HEROES, HERO_ORDER } from "../src/data/heroes";
import { ACHIEVEMENT_RULES, ACHIEVEMENTS, COSMETIC_NAMES, UNLOCK_REWARDS } from "../src/data/achievements";
import { EVOLUTION_ORDER, EVOLUTIONS, MAX_SPELLS, SPELL_CAST, SPELL_MAX_LEVEL, SPELL_ORDER, SPELL_TUNING, SPELLS } from "../src/data/spells";
import { TUNING } from "../src/data/tuning";
import { spellStats } from "../src/core/spells";
import { techniqueStats } from "../src/core/techniques";
import { DR_PX_PER_M } from "../src/data/techniques";
import {
  BOSS, DEPTHS_FROM, DEPTHS_STEP, DIFFICULTIES, DIFFICULTY_ORDER, ENDLESS, ENEMY_WEIGHT, LEVEL_UP_CHOICES,
  LEVELUP_REROLL, RUN_MAP, RUN_START, RUN_TUNING, TOTAL_WAVES, UPGRADE_TIER_WEIGHTS, UPGRADE_TIERS, WAVE_STAGES, WAVES,
  XP_GROWTH,
  ARENA_CROWD, BURN, BOSS_MULTS, CHAMPION, CHILD_SCALE, MINION_SCALE, RANDOM_CHAMPION, SPAWN, SUMMON_CAP, SURVIVOR_FACTOR,
  BOSS_MECHANIC, BOSS_MECHANICS, BOSS_PHASES, BOSS_PROJECTILE_SPEED, BOSS_SKILLSHOT,
} from "../src/data/run";
import { BOSS_ORDER, BOSSES, CROWN_BORROW, ENEMIES, HELPERS, SHIELD_CYCLE } from "../src/data/enemies";
import { AFFIX_FORBIDDEN, AFFIX_ORDER, AFFIX_REWARD_PER, AFFIX_SECOND, AFFIXES } from "../src/data/affixes";
import { RELIC_ADAPTED, RELIC_IDS, RELIC_MECH, RELICS } from "../src/data/relics";
import { UPGRADE_CAPS, UPGRADE_STAT, UPGRADES } from "../src/data/upgrades";
import { canTier, effectsFor, fitWeight, isAvailable, tierWeights, TIER_ORDER } from "../src/core/levelup";
import { newRun } from "../src/core/run";
import { relicDraft, relicDraftPool, relicDraftWeight } from "../src/core/relics";
import { AMBUSH_DELAY, COMBAT_ROOM_POOL, CURSE_WAVES, CURSES, ENEMY_GROUPS, POOL_TICK, ROOM_BIAS, ROOM_BY_ID, ROOMS, STORM } from "../src/data/rooms";
import { generateMap, type MapRng } from "../src/core/runmap";
import { ambushFor, biasedComposition, bossStats, killReward, endlessChampions, enemyStats, hastenBonus, randomChampionChance, startWave, stepWave, survivorReward, targetCount, waveMods } from "../src/core/wave";
import { Rng } from "../src/core/rng";
import { generalCost, modifierCost, newShopState, rollShop, spellCost } from "../src/core/shop";
import { SHOP_CATEGORIES, SHOP_GENERAL, SHOP_ITEMS, SHOP_MODIFIER, SHOP_OFFERS, SHOP_RELIC, SHOP_REROLL, SHOP_SPELL, shopLevel } from "../src/data/shop";
import {
  baseDuration, baseEnemyCount, bossGold, bossTier, bossXp, compositionFor, damageScale, hasMapBefore, hpScale,
  isBossWave, nextXpToNext, segmentOf, waveGold, waveXp,
} from "../src/core/waves";
import {
  DR_BASE_DAMAGE, DR_BASE_HP, DR_SPELL_POWER, FROST, SHADOW, SHIELD_THROW, TECH_LEVEL_STEP, TECH_MAX_LEVEL,
  TECHNIQUE_ORDER, TECHNIQUES, UNBREAKABLE, VENOM, RICOCHET,
} from "../src/data/techniques";

/**
 * A paridade é com o jogo base do Dungeon Reign como estava quando o porte começou, não com o que ele virar depois
 * (decisão do usuário, 2026-11-22): o balanceamento daqui segue o caminho dele. O teste lê esta versão do repo
 * (`git archive`, extraída uma vez numa pasta temporária); `DUNGEON_BASE=HEAD` lê o repo como está.
 * Último commit antes do passe de balanceamento D-674 do original.
 */
const BASE_REF = process.env.DUNGEON_BASE ?? "e2e8fafc312a380d3567d090adcb5b576c655773";
const REPO = resolve(process.env.DUNGEON_IDLE ?? resolve(import.meta.dirname, "../../GitHub/dungeon-idle"));
const ROOT = baseSnapshot(REPO, BASE_REF);

/** O `src` do original na versão `ref`; sem git ou sem o commit, o repo como está. */
function baseSnapshot(repo: string, ref: string): string {
  if (ref === "HEAD" || !existsSync(resolve(repo, ".git"))) return repo;
  const dir = join(tmpdir(), `dr-base-${ref.slice(0, 12)}`);
  if (existsSync(resolve(dir, "src/data/spells.lua"))) return dir;
  const tar = spawnSync("git", ["-C", repo, "archive", "--format=tar", ref, "src"], { maxBuffer: 256 << 20 });
  if (tar.status !== 0) return repo;
  mkdirSync(dir, { recursive: true });
  const x = spawnSync("tar", ["-x", "-f", "-"], { cwd: dir, input: tar.stdout });
  return x.status === 0 && existsSync(resolve(dir, "src/data/spells.lua")) ? dir : repo;
}
const LUAJIT = process.env.LUAJIT ?? "luajit";
const MODULES = [
  "src.core.constants", "src.data.spells", "src.data.characters",
  "src.data.waves", "src.data.tuning", "src.data.run_map", "src.data.difficulties", "src.data.bosses",
  "src.progression.level_up", "src.data.enemies", "src.data.affixes", "src.data.upgrades", "src.data.rooms",
  "src.data.achievements", "src.data.unlocks", "src.data.shop", "src.data.relics",
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
      for _, id in ipairs({ "bloodfang", "deathstalker", "gravekeeper", "ember_matriarch", "dune_leviathan", "hollow_king" }) do
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
        local Rw, B = require("src.progression.rewards"), require("src.data.bosses")
        local run = { stats = { compute = function() return { goldMult = 1.2, championGoldMult = 1, championXpMult = 1 } end } }
        local champ = Enemy.create("orc", w, m, 0, 0, { champion = true })
        champ.isChampion, champ.affixReward = true, nil
        local boss = { isBoss = true, build = true, tier = B.tier(w), wave = w, def = { gold = 0, xp = 0 } }
        local og, ox = Rw.enemyKill(run, orc, m)
        local cg, cx = Rw.enemyKill(run, champ, m)
        local bg, bx = Rw.enemyKill(run, boss, m)
        out[id][did .. w] = { kill = { orc = { og, ox }, champion = { cg, cx }, boss = { bg, bx } }, reward = m.reward, enemyHp = m.enemyHp, enemyDamage = m.enemyDamage, enemySpeed = m.enemySpeed,
          projectileSpeed = m.projectileSpeed, bossHp = m.bossHp, bossDamage = m.bossDamage, bossSpeed = m.bossSpeed,
          enemyCount = m.enemyCount, target = WS.targetCount(w, m), comp = comp, orcHp = orc.hp, orcDamage = orc.damage,
          bossHpStat = b.hp, bossDamageStat = b.damage, champions = m.champions }
      end
    end
  end
  return out
end)()`;

/** M19-08: o Boss Killer do Varok (`runMods`) pela modifier_engine, nos inimigos, chefes e recompensas. */
const HERO_WAVES = [1, 3, 5, 7, 10, 12, 20, 24];
const HERO_LIFE = `=(function()
  local E, WS, DF = require("src.run.modifier_engine"), require("src.run.wave_system"), require("src.data.difficulties")
  local Boss, Enemy = require("src.bosses.boss"), require("src.enemies.enemy")
  local Rw, B = require("src.progression.rewards"), require("src.data.bosses")
  local run = { stats = { compute = function() return { goldMult = 1.2, championGoldMult = 1, championXpMult = 1, survivorMult = 1 } end } }
  local out = {}
  for _, hero in ipairs({ "varok", "kaelen" }) do
    out[hero] = {}
    for _, did in ipairs({ "normal", "hard" }) do
      for _, w in ipairs({ ${HERO_WAVES.join(", ")} }) do
        local m = E.compute({ difficulty = DF[did], wave = w, pacts = {}, characterId = hero })
        local orc = Enemy.create("orc", w, m, 0, 0)
        local champ = Enemy.create("orc", w, m, 0, 0, { champion = true })
        champ.isChampion, champ.affixReward = true, nil
        local b = Boss.stats("gravekeeper", w, m, {})
        local king = Boss.stats("hollow_king", w, m, { final = true, crowned = true })
        local boss = { isBoss = true, build = true, tier = B.tier(w), wave = w, def = { gold = 0, xp = 0 } }
        local og, ox = Rw.enemyKill(run, orc, m)
        local cg, cx = Rw.enemyKill(run, champ, m)
        local bg, bx = Rw.enemyKill(run, boss, m)
        local sg, sx = Rw.survivor(run, orc, m)
        out[hero][did .. w] = { target = WS.targetCount(w, m), enemyCount = m.enemyCount, bossHp = m.bossHp, bossDamage = m.bossDamage,
          share = m.heroChampionShare or false, orcHp = orc.hp, orcDamage = orc.damage, champHp = champ.hp, champDamage = champ.damage,
          bossHpStat = b.hp, bossDamageStat = b.damage, kingHp = king.hp,
          kill = { orc = { og, ox }, champion = { cg, cx }, boss = { bg, bx }, survivor = { sg, sx } } }
      end
    end
  end
  return out
end)()`;

/** M19-07: o que a evolução muda em cada técnica, nos níveis 4 e 5 (spell_stats.lua `extra`). */
const TECH_EVO_FIELDS = ["evolved", "bounces", "maxHpFraction", "trail", "shock", "stun", "fireTrail", "eclipse", "sanctum", "spiders", "pools", "shatter"];
const TECH_LIFE = `=(function()
  local SS = require("src.spells.spell_stats")
  local out = {}
  for _, id in ipairs({${TECHNIQUE_ORDER.map((x) => JSON.stringify(x)).join(",")}}) do
    for _, lv in ipairs({4, 5}) do
      local d = { spellPower = 8, schoolMult = setmetatable({}, { __index = function() return 1 end }), damageMult = 1,
        spellDamageMult = 1, cooldownValues = {}, areaValues = {}, rangeMult = 1, burnMult = 1, volatileValues = {},
        slowPoints = 0, slowDurationMult = 1, lightningTargets = 0, chainRangeMult = 1, echoValues = {}, healFieldHeal = 0,
        healFieldDuration = 0, poisonStacks = 0, fanShots = 0, staticCharge = 0, riftDuration = 0, permafrost = 0, autoDamage = 8,
        critChance = 0, critMult = 1, range = 160 }
      local run = { relics = {}, stats = { compute = function() return d end } }
      local st = SS.compute(run, { id = id, level = lv, modifiers = {} })
      local o = {}
      for _, k in ipairs({${TECH_EVO_FIELDS.map((x) => JSON.stringify(x)).join(",")}}) do
        local v = st[k]
        if v == true then o[k] = 1 elseif type(v) == "number" then o[k] = v end
      end
      out[id .. "@" .. lv] = o
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
  const args = [WAVE_TABLE, WAVE_LIFE, UPGRADE_LIFE, MAP_LIFE, ROOM_LIFE, SPELL_LIFE, SHOP_LIFE, TECH_LIFE, HERO_LIFE, RELIC_LIFE].map((code, i) => {
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

/** Cenários do sorteio de relíquia (M12-10): herói, spells, relíquias que tem e banidas, tags e os números do sorteio. */
const RELIC_SCEN = (() => {
  let x = 4242;
  const rnd = () => { x = (x * 16807) % 2147483647; return x / 2147483647; };
  const normal = RELIC_IDS.filter((id) => ["core", "component", "spell", "keystone"].includes(RELICS[id].category));
  const some = (list: readonly string[], p: number) => list.filter(() => rnd() < p);
  const els = ["fire", "ice", "lightning", "arcane", "auto", "dodge"];
  return Array.from({ length: 60 }, (_, k) => {
    const hero = HERO_ORDER[k % HERO_ORDER.length];
    const a = SPELL_ORDER[Math.floor(rnd() * SPELL_ORDER.length)], b = SPELL_ORDER[Math.floor(rnd() * SPELL_ORDER.length)];
    const spells = (k % 3 === 0 ? [a] : a === b ? [a] : [a, b]).map((id) => ({ id,
      evolution: k % 5 === 4 ? (SPELLS[id].evolutions[0] ?? null) : null }));
    const owned = some(normal, k % 4 === 3 ? 0.6 : 0.15);
    const banned = some(normal.filter((id) => !owned.includes(id)), 0.03);
    const tags = Object.fromEntries(some(els, 0.3).map((t) => [t, 1 + Math.floor(rnd() * 3)]));
    return { hero, spells, owned, banned, tags, n: k % 6 === 5 ? 8 : 3, u: Array.from({ length: 24 }, rnd) };
  });
})();
const RELIC_LIFE = `=(function()
  package.loaded["src.relics.relic_system"] = nil -- o cenário da loja troca o \`draft\` por um vazio
  local RS, R = require("src.relics.relic_system"), require("src.core.rng")
  require("src.core.unlocks").ALL = true
  local out = { order = {}, draws = {} }
  for i, d in ipairs(require("src.data.relics").list) do out.order[i] = d.id end
  for i, sc in ipairs({${RELIC_SCEN.map((c) => `{ hero = ${luaStr(c.hero)}, n = ${c.n}, u = {${c.u.join(",")}},
    tech = ${luaStr(HEROES[c.hero].technique.id)},
    spells = {${c.spells.map((sp) => `{ id = ${luaStr(sp.id)}${sp.evolution ? `, evolution = ${luaStr(sp.evolution)}` : ""} }`).join(",")}},
    relics = {${c.owned.map(luaStr).join(",")}}, banned = {${c.banned.map(luaStr).join(",")}},
    tags = {${Object.entries(c.tags).map(([t, v]) => `${t} = ${v}`).join(",")}} }`).join(",")}}) do
    local j = 0
    local rng = setmetatable({ random = function() j = j + 1 return sc.u[((j - 1) % #sc.u) + 1] end }, { __index = R })
    local banned = {}
    for _, id in ipairs(sc.banned) do banned[id] = true end
    local spells = { [0] = { id = sc.tech } }
    for k, sp in ipairs(sc.spells) do spells[k] = sp end
    local run = { characterId = sc.hero, relics = sc.relics, bannedRelics = banned, spells = spells, tags = sc.tags }
    out.draws[i] = RS.draft(run, rng, sc.n)
  end
  return out
end)()`;

/** Cenários da loja (M7-03): spells equipadas e os números do sorteio, avaliados lá e cá. */
const SHOP_SCEN = (() => {
  let x = 777;
  const rnd = () => { x = (x * 16807) % 2147483647; return x / 2147483647; };
  const builds: { id: string; level: number; mods: string[] }[][] = [
    [{ id: "fireball", level: 1, mods: [] }],
    [{ id: "iceball", level: 3, mods: ["frost_wave"] }],
    [{ id: "fireball", level: 5, mods: [] }],
    [{ id: "chain_lightning", level: 2, mods: [] }, { id: "venom_nova", level: 4, mods: [] }],
    [{ id: "arcane_bolt", level: 5, mods: [] }, { id: "prism_beam", level: 5, mods: [] }],
    [],
  ];
  // M7-05 (S19): a técnica (`spells[0]` de lá) nos níveis 1, 3 e 5 (no 5 não entra mais)
  const techLevels = [1, 3, 5];
  return builds.flatMap((spells, b) => Array.from({ length: 8 }, (_, k) => ({ spells, size: k % 4 === 3 ? 4 : 3,
    tech: techLevels[(b + k) % 3], u: Array.from({ length: 16 }, rnd) })));
})();
const SHOP_LIFE = `=(function()
  local S = require("src.shop.shop_system")
  require("src.relics.relic_system").draft = function() return {} end
  local out = { rolls = {}, general = {}, spell = {}, modifier = {} }
  for i, sc in ipairs({${SHOP_SCEN.map((c) => `{ size = ${c.size}, u = {${c.u.join(",")}}, spells = {${c.spells.map((s) =>
    `{ id = ${luaStr(s.id)}, level = ${s.level}, modifiers = {${s.mods.map(luaStr).join(",")}} }`).join(",")}}, tech = ${c.tech} }`).join(",")}}) do
    local j = 0
    local rng = { pick = function(_, l) j = j + 1 return l[math.floor(sc.u[((j - 1) % #sc.u) + 1] * #l) + 1] end }
    local run = { spells = sc.spells, relics = {}, statistics = {} }
    run.spells[0] = { id = ${luaStr(HEROES[HERO_ORDER[0]].technique.id)}, level = sc.tech, modifiers = {} }
    local v = S.roll(run, rng, 7, sc.size)
    local o = {}
    for k, x in ipairs(v.offers) do o[k] = { kind = x.kind, spell = x.spell, modifier = x.modifier } end
    out.rolls[i] = o
  end
  for _, kind in ipairs({ "sharpened_weapon", "arcane_tome", "vitality" }) do
    local t = {}
    for lvl = 1, 5 do for n = 0, 3 do
      local run = {}
      S.state(run).byType[kind] = n
      t[#t + 1] = S.generalCost(run, kind, lvl)
    end end
    out.general[kind] = t
  end
  for lvl = 1, 5 do for n = 0, 3 do for _, sl in ipairs({ false, 1, 2, 3, 4 }) do
    local run = {}
    S.state(run).spellPurchases = n
    out.spell[#out.spell + 1] = S.spellCost(run, sl or nil, lvl)
  end end end
  local Spells = require("src.data.spells")
  for _, id in ipairs(Spells.order) do
    for _, m in ipairs(Spells[id].modifiers or {}) do
      local t = {}
      for lvl = 1, 3 do for sl = 1, 5 do for n = 0, 2 do
        local run = {}
        S.state(run).modifierPurchases = n
        t[#t + 1] = S.modifierCost(run, sl, m, lvl)
      end end end
      out.modifier[id .. ":" .. m.id] = t
    end
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
const TECH_CALC: Lua = dr?.[TECH_LIFE];

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

  it("evolução das técnicas no nível 5, e nada dela no 4 (M19-07, S19)", () => {
    const ctx = { cooldownMult: 1, area: 1, range: 1, autoDamage: 1 };
    for (const tid of TECHNIQUE_ORDER) {
      for (const lv of [4, 5]) {
        const t = TECH_CALC[`${tid}@${lv}`];
        const o = techniqueStats(tid, lv, ctx);
        const tag = `${tid} nv${lv}`;
        expect(o.evolved, `${tag}.evolved`).toBe(t.evolved === 1);
        expect(o.shatter === true, `${tag}.shatter`).toBe(t.shatter === 1);
        expect(o.echoDelay !== undefined, `${tag}.eclipse`).toBe(t.eclipse === 1);
        expect(o.sanctumTime !== undefined, `${tag}.sanctum`).toBe(t.sanctum === 1);
        expect(o.poolTime !== undefined, `${tag}.pools`).toBe(t.pools === 1);
        expect(o.fireTrail, `${tag}.fireTrail`).toBe(t.fireTrail);
        if (t.bounces !== undefined) expect(o.bounces ?? 0, `${tag}.bounces`).toBe(t.bounces);
        if (t.maxHpFraction !== undefined) expect(o.maxHpFraction, `${tag}.maxHpFraction`).toBe(t.maxHpFraction);
        if (t.trail !== undefined) expect(o.trail, `${tag}.trail`).toBe(t.trail);
        expect((o.shockRadius ?? 0) * DR_PX_PER_M, `${tag}.shock`).toBeCloseTo(t.shock ?? 0, 9);
        if (o.kind === "rift") expect(o.stun, `${tag}.stun`).toBe(t.stun);
        if (t.spiders !== undefined) expect(o.spiders, `${tag}.spiders`).toBe(t.spiders);
      }
    }
  });

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

  it("orbes de ouro e XP no chão (tuning.lua LOOT, constants.lua PLAYER.radius)", () => {
    const { pickup, settle, pullSpeed, pullAccel, maxOnFloor } = RUN_TUNING.loot;
    expect({ pickup, settle, pullSpeed, pullAccel, maxOnFloor }).toEqual(TU.LOOT);
    expect(RUN_TUNING.loot.heroRadius).toBe(C.PLAYER.radius);
  });

  it("atributos dos heróis iguais aos de lá (H7, characters.lua `effects`)", () => {
    // `spellCooldownPct` de lá é negativo (mais rápido) e aqui é `cdrPct` positivo; `bossSlowCap` vive em FROST
    const rename: Record<string, [string, number]> = { spellCooldownPct: ["cdrPct", -1] };
    for (const id of HERO_ORDER) {
      const theirs: Record<string, number> = {};
      for (const e of CH[id].effects as { stat: string; value: number }[]) {
        if (e.stat === "bossSlowCap") continue;
        const [k, m] = rename[e.stat] ?? [e.stat, 1];
        theirs[k] = e.value * m;
      }
      expect({ ...HEROES[id].stats }, id).toEqual(theirs);
    }
    expect(FROST.bossSlowCap).toBe(CH.frostine.effects.find((e: { stat: string }) => e.stat === "bossSlowCap").value);
  });

  it("queimadura num efeito só, com acúmulos (status.lua `applyBurn`)", () => {
    expect(BURN.tick).toBe(0.5); // status.lua `BURN_TICK` (D-015)
    expect(BURN.stackBonus).toBe(TU.BURN_STACK_BONUS);
  });

  it("Boss Killer do Varok (M19-08, H9): `runMods` iguais e o efeito na onda, nos inimigos, chefes e recompensas", () => {
    const r = CH.varok.runMods, h = HEROES.varok.runMods!;
    expect({ ...h, championShare: undefined }).toEqual({ ...r, championShare: undefined });
    const share = r.championShare as Record<string, number> & { default: number };
    expect(h.championShare!.default).toBe(share.default);
    expect(h.championShare!.byWave).toEqual(Object.keys(share).filter((k) => k !== "default").sort((a, b) => +a - +b).map((k) => share[k]));
    expect(HEROES.varok.runModText!.length).toBe(CH.varok.runModText.length);
    const L = dr![HERO_LIFE];
    for (const hero of ["varok", "kaelen"] as const) {
      for (const did of ["normal", "hard"] as const) {
        for (const w of HERO_WAVES) {
          const o = L[hero][did + w], m = waveMods(w, did, null, HEROES[hero].runMods), ctx = `${hero} ${did} ${w}`;
          expect(m.enemyCount, ctx).toBeCloseTo(o.enemyCount, 10);
          expect(m.bossHp, ctx).toBeCloseTo(o.bossHp, 10);
          expect(m.bossDamage, ctx).toBeCloseTo(o.bossDamage, 10);
          expect(m.heroChampionShare ?? false, ctx).toBe(o.share);
          // targetCount de lá não tem o corte da onda de chefe (vem depois, no `start`)
          if (!(w % 5 === 0)) expect(targetCount(w, m.enemyCount), ctx).toBe(o.target);
          const orc = enemyStats(ENEMIES.orc, w, m), champ = enemyStats(ENEMIES.orc, w, m, true);
          expect(orc.hp, ctx).toBeCloseTo(o.orcHp, 8);
          expect(orc.damage, ctx).toBeCloseTo(o.orcDamage, 8);
          expect(champ.hp, ctx).toBeCloseTo(o.champHp, 8);
          expect(champ.damage, ctx).toBeCloseTo(o.champDamage, 8);
          const b = bossStats("gravekeeper", w, m, false);
          expect(b.hp, ctx).toBeCloseTo(o.bossHpStat, 6);
          expect(b.damage, ctx).toBeCloseTo(o.bossDamageStat, 8);
          expect(bossStats("hollow_king", w, m, true).hp, ctx).toBeCloseTo(o.kingHp, 4);
          const kill = (t: { champion?: boolean; boss?: boolean }) => {
            const k = killReward({ gold: ENEMIES.orc.gold, xp: ENEMIES.orc.xp, champion: !!t.champion, bossWave: t.boss ? w : null, noReward: false }, m, 1.2);
            return [k.gold, k.xp];
          };
          expect(kill({}), `${ctx} orc`).toEqual(o.kill.orc);
          expect(kill({ champion: true }), `${ctx} campeão`).toEqual(o.kill.champion);
          expect(kill({ boss: true }), `${ctx} chefe`).toEqual(o.kill.boss);
          const sv = survivorReward(ENEMIES.orc, false, m, 1.2);
          expect([sv.gold, sv.xp], `${ctx} sobrevivente`).toEqual(o.kill.survivor);
        }
      }
    }
  });

  it("Varok: parte da onda comum vem como campeão; a onda de chefe não", () => {
    const m = waveMods(4, "normal", null, HEROES.varok.runMods);
    const w = startWave(4, new Rng(3), () => true, m);
    w.started = true;
    const spawns = new Rng(5), champs = new Rng(7);
    let n = 0, c = 0;
    for (let i = 0; i < 400 && !w.complete; i++) {
      for (const sp of stepWave(w, 0.25, { alive: 1, bossAlive: false }, spawns, champs, m.heroChampionShare).spawns) { n++; if (sp.champion) c++; }
    }
    expect(n).toBe(w.target);
    expect(c).toBeGreaterThan(0);
    const bw = startWave(5, new Rng(3), () => true, waveMods(5, "normal", null, HEROES.varok.runMods));
    bw.started = true;
    let bc = 0;
    for (let i = 0; i < 400; i++) for (const sp of stepWave(bw, 0.25, { alive: 1, bossAlive: true }, spawns, champs, 0.5).spawns) if (sp.champion) bc++;
    expect(bc).toBe(0);
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
          // rewards.lua `enemyKill` (M7-01), com +20% de ouro do herói
          const kill = (t: { champion?: boolean; boss?: boolean }) => {
            const r = killReward({ gold: ENEMIES.orc.gold, xp: ENEMIES.orc.xp, champion: !!t.champion, bossWave: t.boss ? w : null,
              noReward: false }, m, 1.2);
            return [r.gold, r.xp];
          };
          expect(kill({}), `${ctx} orc`).toEqual(o.kill.orc);
          expect(kill({ champion: true }), `${ctx} campeão`).toEqual(o.kill.champion);
          expect(kill({ boss: true }), `${ctx} chefe`).toEqual(o.kill.boss);
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

  it("inimigos: tempos, contagens e multiplicadores do comportamento iguais aos de lá (M9-08)", () => {
    // as distâncias (alcance, raio, velocidade) são adaptadas à escala daqui (docs/paridade.md, E2)
    for (const [id, d] of Object.entries(ENEMIES)) {
      const o = EN[id];
      if (d.summon) expect({ id: d.summon.id, count: d.summon.count, cooldown: d.summon.cooldown }, id)
        .toEqual({ id: o.summonType, count: o.summonCount, cooldown: o.summonCooldown });
      else expect(o.summonType, id).toBeUndefined();
      if (d.mortar) expect({ cooldown: d.mortar.cooldown, warning: d.mortar.warning }, id)
        .toEqual({ cooldown: o.mortarCooldown, warning: o.mortarWarning });
      else expect(o.mortarCooldown, id).toBeUndefined();
      if (d.charge) expect({ cooldown: d.charge.cooldown, windup: d.charge.windup, damage: d.charge.damage }, id)
        .toEqual({ cooldown: o.chargeCooldown, windup: o.chargeWindup, damage: o.chargeDamage });
      else expect(o.chargeCooldown, id).toBeUndefined();
      if (d.berserk) expect(d.berserk, id).toEqual({ threshold: o.berserkThreshold, speed: o.berserkSpeed, damage: o.berserkDamage });
      else expect(o.berserkThreshold, id).toBeUndefined();
      if (d.splitInto) expect(d.splitInto, id).toEqual({ id: o.splitInto, count: o.splitCount });
      else expect(o.splitInto, id).toBeUndefined();
      // M9-01: escudo de frente e armadura do Shieldbearer
      if (d.shield) expect(d.shield, id).toEqual({ arcDeg: o.shieldArcDeg, damageMult: o.shieldDamageMult, turnRate: o.shieldTurnRate });
      else expect(o.shieldArcDeg, id).toBeUndefined();
      expect(d.armor, id).toBe(o.armor);
      // M9-02: maldição do Hexer
      if (d.hex) expect(d.hex, id).toEqual({ duration: o.hexDuration, damageMult: o.hexDamageMult });
      else expect(o.hexDuration, id).toBeUndefined();
      // M9-03: poça de peste do Plaguebearer (raio em px de lá)
      if (d.plague) expect({ radius: d.plague.radius / TUNING.enemy.pxToUnit, duration: d.plague.duration }, id)
        .toEqual({ radius: o.hazardRadius, duration: o.hazardDuration });
      else expect(o.hazardRadius, id).toBeUndefined();
      // M9-04: aura do Warden (raio em px de lá)
      if (d.support) expect({ radius: d.support.radius / TUNING.enemy.pxToUnit, damageMult: d.support.damageMult }, id)
        .toEqual({ radius: o.supportRadius, damageMult: o.supportDamageMult });
      else expect(o.supportRadius, id).toBeUndefined();
      // M9-05: salto do Leaper (distâncias em px de lá; mínimo de 70 px e altura de 26 px do ai.lua)
      if (d.leap) {
        const u = TUNING.enemy.pxToUnit, L = d.leap;
        expect({ cooldown: L.cooldown, range: L.range / u, radius: L.radius / u, damage: L.damage, windup: L.windup, airTime: L.airTime }, id)
          .toEqual({ cooldown: o.leapCooldown, range: o.leapRange, radius: o.leapRadius, damage: o.leapDamage, windup: o.leapWindup, airTime: o.leapAirTime });
        expect({ minDist: L.minDist / u, height: L.height / u }).toEqual({ minDist: 70, height: 26 });
      } else expect(o.leapCooldown, id).toBeUndefined();
    }
    expect({ ...SHIELD_CYCLE }).toEqual(TU.SHIELD_CYCLE);
  });

  it("afixos de campeão: os 10, números, pares proibidos, segundo afixo e recompensa iguais aos de lá (M9-06)", () => {
    expect([...AFFIX_ORDER]).toEqual(AF.order);
    for (const id of AFFIX_ORDER) {
      const { id: _id, name: _n, text: _t, ...mine } = AFFIXES[id];
      const { id: _i, name: _m, text: _x, icon: _c, fx: _f, back: _b, ...theirs } = AF.list[id];
      void _id; void _n; void _t; void _i; void _m; void _x; void _c; void _f; void _b;
      expect({ ...mine, color: [...mine.color] }, id).toEqual(theirs);
    }
    expect(AFFIX_FORBIDDEN.map((p) => [...p])).toEqual(AF.FORBIDDEN);
    expect(AFFIX_SECOND).toEqual(AF.SECOND);
    expect(AFFIX_REWARD_PER).toBe(AF.REWARD_PER_AFFIX);
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
    expect(SUMMON_CAP).toBe(EN.SUMMON_CAP);
    expect(CHILD_SCALE).toEqual(EN.CHILD_SCALE);
    expect(RANDOM_CHAMPION).toEqual(AF.RANDOM);
    expect(SURVIVOR_FACTOR).toBe(C.SURVIVOR_FACTOR);
    expect(ARENA_CROWD).toBeCloseTo(TU.ARENA_CROWD, 12);
    expect(SPAWN).toEqual({ telegraph: C.SPAWN_TELEGRAPH, bossTelegraph: TU.BOSS_TELEGRAPH, minDistancePx: C.SPAWN_MIN_DISTANCE });
    expect([...BOSS_ORDER]).toEqual(BS.order); // saco de chefes (M20-09)
    for (const [id, m] of Object.entries(BOSS_MULTS)) {
      const b = BS.builds[id].mults;
      expect(m, id).toEqual({ hp: b.hp, damage: b.damage, speed: b.speed, projectileSpeed: b.projectileSpeed });
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

describe.skipIf(!dr)("paridade da Magic Shop com o Dungeon Reign (M7-03)", () => {
  it("números de data/shop.lua", () => {
    const S = dr!["src.data.shop"];
    expect(SHOP_OFFERS).toBe(S.OFFERS);
    expect(SHOP_GENERAL).toEqual(S.GENERAL);
    for (const k of ["sharpened_weapon", "arcane_tome", "vitality"] as const) expect(SHOP_ITEMS[k], k).toEqual(S[k]);
    expect(SHOP_SPELL).toEqual(S.SPELL);
    expect(SHOP_MODIFIER).toEqual(S.MODIFIER);
    expect(SHOP_RELIC).toEqual(S.RELIC);
    expect(SHOP_REROLL).toEqual(S.REROLL);
    expect([...SHOP_CATEGORIES]).toEqual(S.CATEGORIES);
    for (let w = 1; w <= 30; w++) expect(shopLevel(w), `onda ${w}`).toBe(1 + Math.floor((w - 1) / 5));
  });

  it("preços: itens gerais, spell nova e melhoria, modificadores", () => {
    const L = dr![SHOP_LIFE];
    for (const kind of ["sharpened_weapon", "arcane_tome", "vitality"] as const) {
      const t: number[] = [];
      for (let lvl = 1; lvl <= 5; lvl++) for (let n = 0; n <= 3; n++) {
        const st = newShopState();
        st.byType[kind] = n;
        t.push(generalCost(st, kind, lvl));
      }
      expect(t, kind).toEqual(L.general[kind]);
    }
    const sp: number[] = [];
    for (let lvl = 1; lvl <= 5; lvl++) for (let n = 0; n <= 3; n++) for (const sl of [null, 1, 2, 3, 4]) {
      const st = newShopState();
      st.spellPurchases = n;
      sp.push(spellCost(st, sl, lvl));
    }
    expect(sp).toEqual(L.spell);
    for (const id of SPELL_ORDER) for (const m of SPELLS[id].modifiers) {
      const t: number[] = [];
      for (let lvl = 1; lvl <= 3; lvl++) for (let sl = 1; sl <= 5; sl++) for (let n = 0; n <= 2; n++) {
        const st = newShopState();
        st.modifierPurchases = n;
        t.push(modifierCost(st, sl, m.effect, lvl));
      }
      expect(t, `${id}:${m.id}`).toEqual(L.modifier[`${id}:${m.id}`]);
    }
  });

  it(`ofertas sorteadas iguais às de shop_system.lua em ${SHOP_SCEN.length} visitas`, () => {
    const L = dr![SHOP_LIFE];
    SHOP_SCEN.forEach((sc, i) => {
      const run = newRun({ heroId: HERO_ORDER[0], difficultyId: "normal", startingSpell: HEROES[HERO_ORDER[0]].startingSpells[0], randomSeed: 1 });
      run.spells = sc.spells.map((s) => ({ id: s.id, level: s.level, modifiers: [...s.mods], evolution: null }));
      run.technique.level = sc.tech;
      const v = rollShop(run, scripted(sc.u), 7, () => undefined, sc.size);
      const got = v.offers.map((o) => Object.fromEntries(Object.entries({ kind: o.kind, spell: o.spell, modifier: o.modifier })
        .filter(([, x]) => x !== undefined)));
      expect(got, `#${i}`).toEqual(L.rolls[i] ?? []);
    });
  });
});

describe.skipIf(!dr)("paridade das relíquias com o Dungeon Reign (M12-01)", () => {
  const RL: Lua = dr?.["src.data.relics"];

  it("a ordem das relíquias é a de relics.lua (o sorteio percorre a lista nessa ordem)", () => {
    expect(RELIC_IDS).toEqual((dr![RELIC_LIFE].order as string[]).filter((id) => RELICS[id]));
  });

  it(`sorteio de relíquia igual ao de relic_system.lua draft em ${RELIC_SCEN.length} cenários (M12-10)`, () => {
    const L = dr![RELIC_LIFE];
    const seen = new Set<number>();
    RELIC_SCEN.forEach((sc, i) => {
      const run = newRun({ heroId: sc.hero, difficultyId: "normal", startingSpell: HEROES[sc.hero].startingSpells[0], randomSeed: 1 });
      run.spells = sc.spells.map((sp) => ({ id: sp.id, level: 1, modifiers: [], evolution: sp.evolution }));
      run.relics = [...sc.owned];
      run.bannedRelics = [...sc.banned];
      run.tags = { ...sc.tags };
      let j = 0;
      const got = relicDraft(run, () => true, () => sc.u[j++ % sc.u.length], sc.n);
      const lua = L.draws[i];
      expect(got, `#${i}`).toEqual(Array.isArray(lua) ? lua : []);
      for (const id of relicDraftPool(run, () => true)) seen.add(relicDraftWeight(run, id));
    });
    // os cenários passam pelos pesos: receita (3), fora da build (0,25), peça sem a spell (1/3 e 0)
    for (const w of [3, 0.25, 1 / 3, 0]) expect(seen.has(w), String(w)).toBe(true);
  });

  it("nome, categoria, raridade, tags e spell de cada relíquia iguais aos de relics.lua", () => {
    for (const id of RELIC_IDS) {
      const d = RELICS[id], L = RL[id];
      expect(L, id).toBeTruthy();
      expect(d.name.toUpperCase(), id).toBe(L.name.toUpperCase());
      expect(d.category, id).toBe(L.category);
      expect(d.rarity, id).toBe(L.rarity);
      expect([...d.tags].sort(), id).toEqual([...(L.tags ?? [])].sort());
      expect(d.spell, id).toBe(L.spell ?? undefined);
      expect(d.needs, id).toBe(L.needs ?? undefined);
      expect(d.spellEffect, id).toEqual(L.spellEffect ?? undefined);
    }
  });

  it("efeitos iguais aos de relics.lua, menos as adaptadas (RELIC_ADAPTED)", () => {
    for (const id of RELIC_IDS) {
      // tabela vazia de lá (relíquia de spell) chega como objeto
      const raw = Array.isArray(RL[id].effects) ? RL[id].effects : [];
      const lua = raw.map((e: { stat: string; value: number }) => {
        // o mesmo mapa das melhorias (lá `spellCooldownPct` negativo, aqui `cdrPct` positivo); mecânicas com o nome de lá
        const m = UPGRADE_STAT[e.stat];
        return m ? { stat: m.key, value: e.value * m.scale } : e;
      });
      if (RELIC_ADAPTED.includes(id)) expect(RELICS[id].effects, `${id} já igual: tirar de RELIC_ADAPTED`).not.toEqual(lua);
      else expect(RELICS[id].effects, id).toEqual(lua);
    }
  });

  it("números das mecânicas iguais aos de relic_mechanics.lua", () => {
    const src = readFileSync(resolve(ROOT, "src/relics/relic_mechanics.lua"), "utf8");
    const num = (k: string) => Number(src.match(new RegExp(String.raw`RM\.${k}\s*=\s*([\d.]+)`))![1]);
    expect(RELIC_MECH.momentumRamp).toBe(num("MOMENTUM_RAMP"));
    expect(RELIC_MECH.momentumFade).toBe(num("MOMENTUM_FADE"));
    expect(RELIC_MECH.spreadRadiusPx).toBe(num("SPREAD_RADIUS"));
    expect(RELIC_MECH.spreadMaxTime).toBe(num("SPREAD_MAX_TIME"));
    expect(RELIC_MECH.frostbiteAfter).toBe(num("FROSTBITE_AFTER"));
    expect(RELIC_MECH.frostbiteCooldown).toBe(num("FROSTBITE_COOLDOWN"));
    expect(RELIC_MECH.throneBreak).toBe(num("THRONE_BREAK"));
    expect(RELIC_MECH.prismTime).toBe(num("PRISM_TIME"));
    expect(RELIC_MECH.castHealMin).toBe(num("CAST_HEAL_MIN"));
    expect(RELIC_MECH.streakWindow).toBe(num("STREAK_WINDOW"));
    expect(RELIC_MECH.streakMax).toBe(num("STREAK_MAX"));
    expect(RELIC_MECH.streakStep).toBe(num("STREAK_STEP"));
    expect(RELIC_MECH.ritesRadiusPx).toBe(num("RITES_RADIUS"));
    expect(RELIC_MECH.hoardStep).toBe(num("HOARD_STEP"));
    expect(src).toContain(`RM.PRISM_ORDER = { ${RELIC_MECH.prismOrder.map((x) => `"${x}"`).join(", ")} }`);
  });

  it("recompensa do chefe e build de relíquia de cada chefe iguais às de lá", () => {
    const BS: Lua = dr!["src.data.bosses"];
    expect(BOSS.premiumChance).toBe(BS.PREMIUM_CHANCE);
    for (const id of Object.keys(BOSSES)) expect(BOSSES[id].relicBuild, id).toBe(BS.builds[id]?.relicBuild ?? undefined);
    for (const id of RELIC_IDS) expect(RELICS[id].bossBuild, id).toBe(RL[id].bossBuild ?? undefined);
  });
  it("Selo de Alma (soul_ward) igual ao de enemies.lua: parado, sem dano, sem recompensa, ajudante (M10-10)", () => {
    const o: Lua = dr!["src.data.enemies"].soul_ward;
    const d = HELPERS.soul_ward;
    expect({ hp: d.hp, speed: d.speed, damage: d.damage, behavior: d.behavior, xp: d.xp, gold: d.gold, category: d.category,
      cooldown: d.cooldown, helper: d.helper, radiusPx: d.radius * 16 })
      .toEqual({ hp: o.hp, speed: o.speed, damage: o.damage, behavior: o.behavior, xp: o.xp, gold: o.gold, category: o.category,
        cooldown: o.cooldown, helper: o.helper, radiusPx: o.radius });
  });

  it("fases e mecânicas dos chefes iguais às de bosses.lua (M10-10)", () => {
    const BS: Lua = dr!["src.data.bosses"];
    expect(BOSS_PHASES.map((x) => ({ ...x }))).toEqual(BS.PHASES);
    for (const id of Object.keys(BOSSES)) expect(BOSS_MECHANIC[id]?.id, id).toBe(BS.builds[id].mechanic);
    for (const id of Object.keys(BOSSES)) expect(BOSS_MECHANIC[id]?.name, id).toBe(BS.builds[id].mechanicName);
    const M = BS.MECHANICS, A = BS.ATTACKS;
    expect(BOSS_MECHANICS.blood_rush).toEqual(M.blood_rush);
    expect([...BOSS_MECHANICS.army_of_the_damned.perPhase]).toEqual(M.army_of_the_damned.perPhase);
    expect(BOSS_MECHANICS.army_of_the_damned.minion).toBe(A.summon.minion);
    expect(BOSS_MECHANICS.army_of_the_damned.warning).toBe(A.summon.warning);
    expect(BOSS_MECHANICS.meteor_siege.fireTime).toBe(A.meteorstorm.fireTime);
    expect(BOSS_MECHANICS.meteor_siege.fireDps).toBe(A.meteorstorm.fireDps);
    expect([...BOSS_MECHANICS.soul_tether.perPhase]).toEqual(M.soul_tether.perPhase);
    expect(BOSS_MECHANICS.soul_tether.damageTakenMult).toBe(M.soul_tether.damageTakenMult);
    expect(BOSS_MECHANICS.soul_tether.wardHp).toBe(M.soul_tether.wardHp);
  });
  it("Deathstalker igual ao de bosses.lua: distância, skillshot, Mark, Crossfire e Marked Prey (M10-01)", () => {
    const BS: Lua = dr!["src.data.bosses"];
    const A = BS.ATTACKS, build = BS.builds.deathstalker, d = BOSSES.deathstalker;
    const px = (m: number | undefined) => Math.round((m ?? NaN) * 16 * 1e6) / 1e6;
    expect(d.patterns.map((p) => p.kind)).toEqual(["skillshot", "mark", "crossfire"]);
    expect(build.attacks).toEqual(["skillshot", "mark", "crossfire"]);
    expect(px(d.preferred)).toBe(build.preferred);
    expect(d.relicBuild).toBe(build.relicBuild);
    expect(BOSS_SKILLSHOT.cooldown).toBe(BS.BASE.skillshotCooldown);
    expect(BOSS_SKILLSHOT.speed).toBe(BS.BASE.skillshotSpeed);
    const [ss, mk, cf] = d.patterns;
    expect([ss.warning, ss.damage, px(ss.width)]).toEqual([A.skillshot.warning, A.skillshot.dmg, A.skillshot.width]);
    expect([mk.warning, mk.lock, mk.damage, px(mk.radius), mk.markTime, mk.markMult])
      .toEqual([A.mark.warning, A.mark.lock, A.mark.dmg, A.mark.radius, A.mark.markTime, A.mark.markMult]);
    expect(mk.markMult).toBe(BS.MECHANICS.marked_prey.mult);
    expect(BOSS_MECHANICS.marked_prey.mult).toBe(BS.MECHANICS.marked_prey.mult);
    expect([cf.warning, cf.damage, px(cf.width), px(cf.length)]).toEqual([A.crossfire.warning, A.crossfire.dmg, A.crossfire.width, 840]);
    // o empréstimo do rei coroado: só os de `CROWN.borrow` que já existem aqui, na ordem de lá
    const map: Record<string, string> = { nova: "nova", crossfire: "crossfire", fan: "fanvolley", spiral: "spiralvolley" };
    expect(CROWN_BORROW.map((k) => map[k])).toEqual(BS.CROWN.borrow.filter((k: string) => Object.values(map).includes(k)));
  });
  it("Dune Leviathan igual ao de bosses.lua: distância, parede de areia, varrida, erupção e Burrow (M10-02)", () => {
    const BS: Lua = dr!["src.data.bosses"];
    const A = BS.ATTACKS, build = BS.builds.dune_leviathan, d = BOSSES.dune_leviathan;
    const px = (m: number | undefined) => Math.round((m ?? NaN) * 16 * 1e6) / 1e6;
    expect(d.patterns.map((p) => p.kind)).toEqual(build.attacks);
    expect(px(d.preferred)).toBe(build.preferred);
    expect(BOSS_PROJECTILE_SPEED).toBe(BS.BASE.projectileSpeed);
    const [sv, ts, er] = d.patterns;
    expect([sv.warning, sv.damage, sv.count, sv.gap, px(sv.spacing)]).toEqual([A.sandvolley.warning, A.sandvolley.dmg, A.sandvolley.count, A.sandvolley.gap, A.sandvolley.spacing]);
    expect([ts.warning, ts.damage, px(ts.width), px(ts.length), ts.lines, ts.spreadDeg, ts.stagger])
      .toEqual([A.tailsweep.warning, A.tailsweep.dmg, A.tailsweep.width, A.tailsweep.length, A.tailsweep.lines, A.tailsweep.spreadDeg, A.tailsweep.stagger]);
    expect([er.warning, er.damage, px(er.radius), er.count, er.stagger]).toEqual([A.erupt.warning, A.erupt.dmg, A.erupt.radius, A.erupt.count, A.erupt.stagger]);
    const M = BS.MECHANICS.burrow, B = BOSS_MECHANICS.burrow;
    expect([B.interval, B.under, B.radius, B.dmg]).toEqual([M.interval, M.under, M.radius, M.dmg]);
  });
});
