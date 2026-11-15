// Ciclo de uma onda, puro (wave_system.lua, modifier_engine.lua, enemy.lua, boss.lua, rewards.lua do Dungeon Reign).
// O jogo (game.ts) chama `stepWave` a cada quadro e põe no mapa o que ela pede; aqui não há three.js nem posição.
// Sem pactos, salas, afixos e modificadores de herói por enquanto (M20-05, M9, M13): o que não existe vale 1.
import type { Rng } from "./rng";
import {
  baseDuration, baseEnemyCount, bossTier, compositionFor, damageScale, endlessDamage, endlessHp, hpScale, isBossWave, waveGold, waveXp,
} from "./waves";
import {
  ARENA_CROWD, BOSS, BOSS_MULTS, CHAMPION, DIFFICULTIES, ENDLESS, RANDOM_CHAMPION, RUN_TUNING, SURVIVOR_FACTOR,
  TOTAL_WAVES, WAVES, type Difficulty, type DifficultyId,
} from "../data/run";

/** modifier_engine.lua `compute`, para uma partida sem pacto, sala nem modificador de herói. */
export interface WaveMods {
  enemyHp: number;
  enemyDamage: number;
  enemySpeed: number;
  projectileSpeed: number;
  bossHp: number;
  bossDamage: number;
  bossSpeed: number;
  reward: number;
  earlyBossCut: boolean;
  crownHp: number;
}

function lateHp(d: Difficulty, wave: number): number {
  for (const s of d.lateHp ?? []) if (wave >= s.from) return s.mult;
  return 1;
}

export function waveMods(wave: number, difficultyId: DifficultyId): WaveMods {
  const d = DIFFICULTIES[difficultyId];
  return {
    enemyHp: d.enemyHp * lateHp(d, wave),
    enemyDamage: d.earlyDamage?.[wave - 1] ?? d.enemyDamage,
    enemySpeed: d.enemySpeed,
    projectileSpeed: d.projectileSpeed,
    bossHp: d.bossHp,
    bossDamage: d.bossDamage,
    bossSpeed: d.bossSpeed,
    reward: d.reward,
    earlyBossCut: d.earlyBossCut === true,
    crownHp: d.crownHp ?? 1,
  };
}

/** wave_system.lua `targetCount`, mais o corte da onda de chefe (`BOSS_WAVE_SPAWN`). */
export function targetCount(wave: number, enemyCount = 1): number {
  const n = Math.max(1, Math.floor(baseEnemyCount(wave) * enemyCount * ARENA_CROWD));
  return isBossWave(wave) ? Math.max(1, Math.floor(n * WAVES.bossWaveSpawn + 0.5)) : n;
}

/** affixes.lua `randomChance`: chance de a onda normal promover um inimigo a campeão. */
export function randomChampionChance(wave: number): number {
  const R = RANDOM_CHAMPION;
  return Math.min(1, Math.min(R.cap, R.base + R.perWave * (Math.max(1, wave) - 1)));
}

/** wave_system.lua `endlessChampions`: no modo sem fim, +1 campeão por onda (até 5), espalhados no cronograma. */
export function endlessChampions(wave: number, target: number): Set<number> {
  const set = new Set<number>();
  if (wave <= TOTAL_WAVES) return set;
  const n = Math.min(ENDLESS.maxChampions, (wave - TOTAL_WAVES) * ENDLESS.championsPerWave);
  for (let i = 1; i <= n; i++) set.add(Math.max(1, Math.floor((target * i) / (n + 1))));
  return set;
}

/** Inimigo pedido pela onda: o jogo escolhe o ponto na borda e mostra o aviso. */
export interface WaveSpawn {
  id: string;
  champion: boolean;
}

export interface WaveState {
  number: number;
  duration: number;
  elapsed: number;
  target: number;
  spawned: number;
  interval: number;
  nextSpawn: number;
  /** inimigos sorteáveis, com peso (só os que existem no jogo) */
  composition: [string, number][];
  isBossWave: boolean;
  /** posição no cronograma do campeão sorteado (onda normal) */
  randomChampionAt: number | null;
  extraChampions: number[];
  /** o combate começou (depois do letreiro "Onda N") */
  started: boolean;
  complete: boolean;
  /** a onda de chefe passou do tempo e segue até o chefe cair */
  heldByBoss: boolean;
  bossesDefeated: boolean;
  clearedEarly: boolean;
  timeSaved: number;
  hastened: boolean;
  hastenBonus: number;
  timeMult: number;
  /** orbes de cura deixados nesta onda (até `RUN_TUNING.healOrb.maxPerWave`) */
  healOrbs: number;
}

/**
 * wave_system.lua `start`. `known` diz quais inimigos o jogo tem: os que faltam (M9) saem do sorteio e o peso dos
 * outros fica como está. O campeão sorteado usa o fluxo `champions`.
 */
export function startWave(wave: number, champions: Rng, known: (id: string) => boolean): WaveState {
  const duration = baseDuration(wave);
  const target = targetCount(wave);
  const boss = isBossWave(wave);
  const composition = compositionFor(wave).filter((c) => known(c.id)).map((c) => [c.id, c.weight] as [string, number]);
  if (!composition.length) composition.push(["goblin", 1]);
  let randomChampionAt: number | null = null;
  if (!boss && champions.chance(randomChampionChance(wave))) {
    randomChampionAt = champions.int(Math.max(1, Math.floor(target * 0.25)), Math.max(1, Math.ceil(target * 0.75)));
  }
  return {
    number: wave, duration, elapsed: 0, target, spawned: 0,
    interval: (duration * WAVES.spawnWindow) / target,
    nextSpawn: WAVES.firstSpawnDelay,
    composition, isBossWave: boss, randomChampionAt,
    extraChampions: [...endlessChampions(wave, target)],
    started: false, complete: false, heldByBoss: false, bossesDefeated: false, clearedEarly: false, timeSaved: 0,
    hastened: false, hastenBonus: 0, timeMult: 1, healOrbs: 0,
  };
}

export interface WaveWorld {
  /** inimigos vivos mais os avisos de nascimento ainda no chão */
  alive: number;
  /** algum chefe vivo (ou o aviso dele) */
  bossAlive: boolean;
}

export interface WaveStep {
  spawns: WaveSpawn[];
  /** a onda acabou neste quadro */
  completed: boolean;
}

/** wave_system.lua `update`: avança o relógio, pede os nascimentos do cronograma e diz quando a onda acaba. */
export function stepWave(w: WaveState, dt: number, world: WaveWorld, spawns: Rng): WaveStep {
  const out: WaveStep = { spawns: [], completed: false };
  if (w.complete || !w.started) return out;
  w.elapsed += dt * w.timeMult;
  while (w.spawned < w.target && w.elapsed >= w.nextSpawn) {
    const id = spawns.weighted(w.composition);
    w.spawned++;
    const champion = w.randomChampionAt === w.spawned || w.extraChampions.includes(w.spawned);
    out.spawns.push({ id, champion });
    w.nextSpawn += w.interval;
  }
  if (w.isBossWave) {
    // a onda de chefe acaba quando ele cai; quem sobra some
    if (!world.bossAlive) {
      w.bossesDefeated = true;
      complete(w, out);
    }
    w.heldByBoss = w.elapsed >= w.duration;
    return out;
  }
  if (w.elapsed >= w.duration) complete(w, out);
  else if (w.spawned >= w.target && out.spawns.length === 0 && world.alive === 0) {
    // nada vivo e nada por nascer: a onda acabou antes do tempo
    w.clearedEarly = true;
    w.timeSaved = w.duration - w.elapsed;
    complete(w, out);
  }
  return out;
}

function complete(w: WaveState, out: WaveStep): void {
  w.complete = true;
  out.completed = true;
}

export function timeLeft(w: WaveState): number {
  return Math.max(0, w.duration - w.elapsed);
}

// ---------------------------------------------------------------- Apressar (wave_system.lua `hasten`)

export function canHasten(w: WaveState | null): boolean {
  if (!w || w.complete || !w.started || w.hastened || w.isBossWave) return false;
  return w.elapsed >= RUN_TUNING.hasten.unlockAfter;
}

/** Quanto mais cedo, maior o bônus de recompensa. */
export function hastenBonus(w: WaveState): number {
  const H = RUN_TUNING.hasten;
  const left = Math.max(0, w.duration - w.elapsed);
  return H.maxBonus * Math.min(1, left / H.fullAt) ** H.exponent;
}

export function hasten(w: WaveState): boolean {
  if (!canHasten(w)) return false;
  const H = RUN_TUNING.hasten;
  w.hastenBonus = hastenBonus(w);
  w.hastened = true;
  w.timeMult = H.timeMult;
  // nasce spawnMult vezes mais rápido em tempo real: o relógio já corre timeMult vezes mais rápido
  const k = H.timeMult / H.spawnMult;
  w.interval *= k;
  w.nextSpawn = w.elapsed + Math.max(0, w.nextSpawn - w.elapsed) * k;
  return true;
}

// ---------------------------------------------------------------- atributos dos inimigos e chefes

export interface FoeStats {
  hp: number;
  damage: number;
  /** multiplicador da velocidade do dado */
  speed: number;
}

/** enemy.lua `create`, com `makeChampion` quando é campeão. */
export function enemyStats(def: { hp: number; damage: number }, wave: number, mods: WaveMods, champion = false): FoeStats {
  let hp = def.hp * hpScale(wave) * mods.enemyHp;
  let damage = def.damage * damageScale(wave) * mods.enemyDamage * RUN_TUNING.enemyDamageMult;
  let speed = mods.enemySpeed;
  if (champion) {
    hp = Math.max(hp, CHAMPION.hpBase + wave * CHAMPION.hpPerWave) * CHAMPION.hpMult;
    damage *= CHAMPION.damageMult;
    speed *= CHAMPION.speedMult;
  }
  return { hp, damage, speed };
}

/** boss.lua `stats`. `final` = a onda 20, o rei coroado. */
export function bossStats(bossId: string, wave: number, mods: WaveMods, final = wave === BOSS.final.wave): FoeStats {
  const m = BOSS_MULTS[bossId] ?? { hp: 1, damage: 1, speed: 1 };
  const up = bossTier(wave) - 1;
  const b = BOSS.base;
  let hp = (b.hpBase + wave * b.hpPerWave) * m.hp * (1 + BOSS.tier.hp * up) * mods.bossHp;
  let damage = (b.damageBase + wave * b.damagePerWave) * m.damage * (1 + BOSS.tier.damage * up) * mods.bossDamage * RUN_TUNING.enemyDamageMult;
  const speed = m.speed * (1 + BOSS.tier.speed * up) * mods.bossSpeed;
  hp *= BOSS.hpMult;
  hp *= 1 + BOSS.hpPerWaveAfter5 * Math.max(0, wave - 5);
  if (mods.earlyBossCut) {
    const band = BOSS.hpEarly.find((x) => wave <= x.upTo);
    if (band) hp *= band.mult;
  }
  hp *= endlessHp(wave);
  damage *= endlessDamage(wave);
  if (final) {
    hp *= BOSS.final.hp * mods.crownHp;
    damage *= BOSS.final.damage;
  }
  return { hp, damage, speed };
}

// ---------------------------------------------------------------- recompensas (rewards.lua)

/** `Rewards.wave`, com o bônus do Apressar (fixado no momento em que o jogador apressou). */
export function waveReward(w: WaveState, mods: WaveMods, goldMult = 1): { gold: number; xp: number } {
  let gold = Math.floor(waveGold(w.number) * mods.reward * goldMult);
  let xp = Math.floor(waveXp(w.number) * mods.reward);
  if (w.hastened) {
    const k = 1 + w.hastenBonus;
    gold = Math.floor(gold * k + 0.5);
    xp = Math.floor(xp * k + 0.5);
  }
  return { gold, xp };
}

/** `Rewards.survivor`: quem sobra no fim rende uma parte (invocados e filhos da gosma não rendem). */
export function survivorReward(def: { gold: number; xp: number }, champion: boolean, mods: WaveMods, goldMult = 1): { gold: number; xp: number } {
  let g = def.gold;
  let x = def.xp;
  if (champion) {
    g *= CHAMPION.rewardMult;
    x *= CHAMPION.rewardMult;
  }
  return { gold: Math.floor(g * SURVIVOR_FACTOR * mods.reward * goldMult), xp: Math.floor(x * SURVIVOR_FACTOR * mods.reward) };
}

/** heal_orbs.lua `chance`. */
export function healOrbChance(e: { id: string; category: string; champion: boolean; boss: boolean; summoned: boolean }): number {
  const C = RUN_TUNING.healOrb.chance;
  if (e.boss || e.summoned) return 0;
  if (e.champion) return C.champion;
  if (e.id === "swarm") return C.swarm;
  return e.category === "elite" ? C.elite : C.normal;
}
