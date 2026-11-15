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
  ARENA_CROWD, BOSS_MULTS, CHAMPION, CHILD_SCALE, MINION_SCALE, RANDOM_CHAMPION, SPAWN, SURVIVOR_FACTOR,
} from "../src/data/run";
import { ENEMIES } from "../src/data/enemies";
import { UPGRADE_CAPS, UPGRADES } from "../src/data/upgrades";
import { canTier, effectsFor, fitWeight, isAvailable, tierWeights, TIER_ORDER } from "../src/core/levelup";
import { newRun } from "../src/core/run";
import { bossStats, endlessChampions, enemyStats, hastenBonus, randomChampionChance, startWave, targetCount, waveMods } from "../src/core/wave";
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
  "src.progression.level_up", "src.data.enemies", "src.data.affixes", "src.data.upgrades",
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Lua = any;

function loadOriginal(): Record<string, Lua> | null {
  if (!existsSync(resolve(ROOT, "src/data/spells.lua"))) return null;
  const r = spawnSync(LUAJIT, [resolve(import.meta.dirname, "../tools/dr-dump.lua"), ROOT, ...MODULES, WAVE_TABLE, WAVE_LIFE, UPGRADE_LIFE], {
    encoding: "utf8", maxBuffer: 64 << 20,
  });
  if (r.error || r.status !== 0) return null;
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
const LIFE: Lua = dr?.[WAVE_LIFE];
const EN: Lua = dr?.["src.data.enemies"];
const AF: Lua = dr?.["src.data.affixes"];

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
