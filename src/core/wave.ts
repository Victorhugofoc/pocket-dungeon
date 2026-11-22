// Ciclo de uma onda, puro (wave_system.lua, modifier_engine.lua, enemy.lua, boss.lua, rewards.lua do Dungeon Reign).
// O jogo (game.ts) chama `stepWave` a cada quadro e põe no mapa o que ela pede; aqui não há three.js nem posição.
// A sala do mapa da partida entra pela camada da onda (runmap.ts). Sem pactos, eventos e afixos
// por enquanto (M9, M13 e o resto do M20-05; os `runMods` do herói entraram na M19-08): o que não existe vale 1.
import type { Rng } from "./rng";
import { pacedCount, pacedDuration } from "./pace";
import { waveLayer } from "./runmap";
import { AMBUSH_DELAY, ENEMY_GROUPS, type RoomDef } from "../data/rooms";
import type { HeroRunMods } from "../data/heroes";
import {
  baseDuration, baseEnemyCount, bossGold, bossTier, bossXp, compositionFor, damageScale, endlessDamage, endlessHp, hpScale, isBossWave, waveGold, waveXp,
} from "./waves";
import {
  ARENA_CROWD, BOSS, BOSS_MULTS, CHAMPION, DIFFICULTIES, ENDLESS, RANDOM_CHAMPION, RUN_TUNING, SURVIVOR_FACTOR,
  TOTAL_WAVES, WAVES, type Difficulty, type DifficultyId,
} from "../data/run";

/** modifier_engine.lua `compute`, com a sala e os `runMods` do herói (sem pacto ainda). */
export interface WaveMods {
  /** sala ou maldição da onda (viés, campeão da Toca, emboscada, pesados do Iron Pack) */
  room: RoomDef | null;
  enemyCount: number;
  /** corte de vida da emboscada por sala, da dificuldade (Hard) */
  ambushHp: Record<string, number>;
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
  /** ouro do chefe ou campeão numa sala de risco (emboscada, Toca do Campeão), da dificuldade (Hard) */
  riskGold: number;
  /** D-207 (Boss Killer, `runMods` do herói): recompensa por inimigo comum/campeão e por chefe */
  killReward: number;
  bossReward: number;
  /** D-216: crescimento por onda dos poucos inimigos do herói */
  heroEnemyHpGrowth: number | null;
  heroEnemyDamagePerWave: number | null;
  /** D-217: chefe mais leve no começo */
  heroEarlyBoss: { upTo: number; mult: number } | null;
  /** P-02: parte da onda comum que vem como campeão */
  heroChampionShare: number | null;
}

function lateHp(d: Difficulty, wave: number): number {
  for (const s of d.lateHp ?? []) if (wave >= s.from) return s.mult;
  return 1;
}

/** A camada da onda (a sala) vezes a dificuldade; o chefe leva a mesma pressão da sala com a coluna de chefe. */
export function waveMods(wave: number, difficultyId: DifficultyId, room: RoomDef | null = null, hero: HeroRunMods = {}): WaveMods {
  const d = DIFFICULTIES[difficultyId];
  const w = waveLayer(room);
  const h = hero;
  return {
    room,
    enemyCount: w.enemyCount * (h.enemyCount ?? 1),
    ambushHp: d.ambushHp ?? {},
    enemyHp: w.enemyHp * d.enemyHp * lateHp(d, wave),
    enemyDamage: w.enemyDamage * (d.earlyDamage?.[wave - 1] ?? d.enemyDamage),
    enemySpeed: w.enemySpeed * d.enemySpeed,
    projectileSpeed: w.projectileSpeed * d.projectileSpeed,
    bossHp: w.enemyHp * d.bossHp * (h.bossHp ?? 1),
    bossDamage: w.enemyDamage * d.bossDamage * (h.bossDamage ?? 1),
    bossSpeed: w.enemySpeed * d.bossSpeed,
    reward: w.reward * d.reward,
    earlyBossCut: d.earlyBossCut === true,
    crownHp: h.noCrownHp ? 1 : d.crownHp ?? 1,
    riskGold: d.riskGold ?? 1,
    killReward: h.killReward ?? 1,
    bossReward: h.bossReward ?? 1,
    heroEnemyHpGrowth: h.enemyHpGrowth ?? null,
    heroEnemyDamagePerWave: h.enemyDamagePerWave ?? null,
    heroEarlyBoss: h.earlyBoss ?? null,
    heroChampionShare: h.championShare ? h.championShare.byWave[wave - 1] ?? h.championShare.default : null,
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
  /** Toca dos Campeões: posição no cronograma do campeão da sala */
  championAt: number | null;
  /** Emboscada: corte de vida e dano do chefe que entra na onda normal */
  ambush: { hp: number; damage: number } | null;
  ambushAt: number;
  ambushSpawned: boolean;
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

/** wave_system.lua `ambushFor`: o corte do chefe da emboscada; a dificuldade pode ter o seu corte de vida (D-303). */
export function ambushFor(mods: WaveMods): { hp: number; damage: number } | null {
  const a = mods.room?.ambush;
  if (!a || !mods.room) return null;
  return { hp: mods.ambushHp[mods.room.id] ?? a.hp, damage: a.damage };
}

/** wave_system.lua `biasedComposition`: a sala multiplica o peso do grupo dela dentro do sorteio normal. */
export function biasedComposition(list: readonly { id: string; weight: number }[], room: RoomDef | null): { id: string; weight: number }[] {
  const bias = room?.bias;
  if (!bias) return list.map((c) => ({ ...c }));
  const group = ENEMY_GROUPS[bias.group];
  return list.map((c) => ({ id: c.id, weight: c.weight * (group.includes(c.id) ? bias.mult : 1) }));
}

/**
 * wave_system.lua `start`. `known` diz quais inimigos o jogo tem: os que faltam (M9) saem do sorteio e o peso dos
 * outros fica como está. O campeão sorteado usa o fluxo `champions`; não há sorteado em onda de chefe, de emboscada
 * nem na Toca dos Campeões.
 */
export function startWave(wave: number, champions: Rng, known: (id: string) => boolean, mods?: WaveMods): WaveState {
  const room = mods?.room ?? null;
  // camada de ritmo (M21-02): contagem e duração adaptadas; targetCount e baseDuration continuam iguais aos de lá
  const duration = pacedDuration(wave);
  const target = pacedCount(targetCount(wave, mods?.enemyCount ?? 1), wave);
  const boss = isBossWave(wave);
  const composition = biasedComposition(compositionFor(wave), room).filter((c) => known(c.id)).map((c) => [c.id, c.weight] as [string, number]);
  if (!composition.length) composition.push(["goblin", 1]);
  const championAt = (room?.champions ?? 0) > 0 ? Math.max(1, Math.ceil(target / 2)) : null;
  const ambush = room && mods ? ambushFor(mods) : null;
  let randomChampionAt: number | null = null;
  if (!boss && !ambush && championAt === null && champions.chance(randomChampionChance(wave))) {
    randomChampionAt = champions.int(Math.max(1, Math.floor(target * 0.25)), Math.max(1, Math.ceil(target * 0.75)));
  }
  return {
    number: wave, duration, elapsed: 0, target, spawned: 0,
    interval: (duration * WAVES.spawnWindow) / target,
    nextSpawn: WAVES.firstSpawnDelay,
    composition, isBossWave: boss, randomChampionAt, championAt,
    ambush, ambushAt: AMBUSH_DELAY, ambushSpawned: false,
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
  /** a emboscada chegou: o jogo sorteia o chefe (fluxo `bosses`) e põe o aviso */
  ambush: boolean;
  /** a onda acabou neste quadro */
  completed: boolean;
}

/** wave_system.lua `update`: avança o relógio, pede os nascimentos do cronograma e diz quando a onda acaba. */
export function stepWave(w: WaveState, dt: number, world: WaveWorld, spawns: Rng, champions?: Rng, championShare: number | null = null): WaveStep {
  const out: WaveStep = { spawns: [], ambush: false, completed: false };
  if (w.complete || !w.started) return out;
  w.elapsed += dt * w.timeMult;
  if (w.ambush && !w.ambushSpawned && w.elapsed >= w.ambushAt) {
    w.ambushSpawned = true;
    out.ambush = true;
  }
  while (w.spawned < w.target && w.elapsed >= w.nextSpawn) {
    const id = spawns.weighted(w.composition);
    w.spawned++;
    let champion = w.championAt === w.spawned || w.randomChampionAt === w.spawned || w.extraChampions.includes(w.spawned);
    // P-02 (Varok): parte de toda onda comum vem como campeão (não na onda de chefe: o duelo fica limpo)
    if (!champion && championShare && championShare > 0 && !w.isBossWave) champion = (champions ?? spawns).chance(championShare);
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
  // §7.9: o chefe da emboscada precisa cair; o relógio para no zero enquanto ele vive (D-091)
  const held = !!w.ambush && (!w.ambushSpawned || out.ambush || world.bossAlive);
  w.heldByBoss = held && w.elapsed >= w.duration;
  if (w.elapsed >= w.duration && !held) complete(w, out);
  else if (w.spawned >= w.target && out.spawns.length === 0 && world.alive === 0 && !held) {
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
  /** multiplicador da velocidade dos projéteis (enemy.lua e boss.lua `projectileSpeedMult`) */
  projectileSpeed: number;
}

/** enemy.lua `create` (com os pesados do Iron Pack), e `makeChampion` quando é campeão. */
export function enemyStats(def: { id?: string; hp: number; damage: number }, wave: number, mods: WaveMods, champion = false): FoeStats {
  let hp = def.hp * hpScale(wave) * mods.enemyHp;
  let damage = def.damage * damageScale(wave) * mods.enemyDamage * RUN_TUNING.enemyDamageMult;
  let speed = mods.enemySpeed;
  const heavy = mods.room?.heavyScaling;
  if (heavy && def.id && ENEMY_GROUPS.heavy.includes(def.id)) {
    hp *= heavy.hp;
    damage *= heavy.damage;
  }
  // D-216 (Boss Killer): cada onda deixa os poucos inimigos mais fortes (antes do campeão, como lá)
  const heroHpK = mods.heroEnemyHpGrowth ? (1 + mods.heroEnemyHpGrowth) ** Math.max(0, wave - 1) : 1;
  hp *= heroHpK;
  if (mods.heroEnemyDamagePerWave) damage *= 1 + mods.heroEnemyDamagePerWave * Math.max(0, wave - 1);
  if (champion) {
    hp = Math.max(hp, (CHAMPION.hpBase + wave * CHAMPION.hpPerWave) * heroHpK) * CHAMPION.hpMult;
    damage *= CHAMPION.damageMult;
    speed *= CHAMPION.speedMult;
  }
  return { hp, damage, speed, projectileSpeed: mods.projectileSpeed };
}

/** boss.lua `stats`. `final` = a onda 20, o rei coroado; `ambush` = o corte do chefe da emboscada. */
export function bossStats(bossId: string, wave: number, mods: WaveMods, final = wave === BOSS.final.wave,
  ambush: { hp: number; damage: number } | null = null): FoeStats {
  const m = BOSS_MULTS[bossId] ?? { hp: 1, damage: 1, speed: 1, projectileSpeed: 1 };
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
  if (mods.heroEarlyBoss && wave <= mods.heroEarlyBoss.upTo) hp *= mods.heroEarlyBoss.mult; // D-217
  hp *= endlessHp(wave);
  damage *= endlessDamage(wave);
  if (final) {
    hp *= BOSS.final.hp * mods.crownHp;
    damage *= BOSS.final.damage;
  }
  if (ambush) {
    hp *= ambush.hp;
    damage *= ambush.damage;
  }
  return { hp, damage, speed, projectileSpeed: mods.projectileSpeed * m.projectileSpeed };
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

/** O que `killReward` precisa saber do inimigo morto. */
export interface KillTarget {
  gold: number;
  xp: number;
  champion: boolean;
  /** onda do chefe (o tier sai dela), ou null */
  bossWave: number | null;
  /** invocados e filhos da gosma */
  noReward: boolean;
  /** afixos do campeão (D-205: +25% por afixo); 1 sem afixos */
  affixReward?: number;
}

/** `Rewards.enemyKill` (§13.4): ouro e XP de um inimigo morto. O XP sai antes do multiplicador de XP do herói. */
export function killReward(t: KillTarget, mods: WaveMods, goldMult = 1): { gold: number; xp: number } {
  if (t.noReward) return { gold: 0, xp: 0 };
  let g = t.gold;
  let x = t.xp;
  if (t.bossWave !== null) {
    // boss.lua `rewards`: ouro e XP do chefe da onda com o bônus do tier
    const k = 1 + BOSS.tier.reward * (bossTier(t.bossWave) - 1);
    g = bossGold(t.bossWave) * k;
    x = bossXp(t.bossWave) * k;
  }
  if (t.champion) {
    const k = CHAMPION.rewardMult * (t.affixReward ?? 1);
    g *= k;
    x *= k;
  }
  const room = mods.room;
  const risky = !!room && (t.bossWave !== null || t.champion) && (!!room.ambush || (room.champions ?? 0) > 0);
  // D-207 Boss Killer: a recompensa por morte acompanha as ondas menores
  const k = t.bossWave !== null ? mods.bossReward : mods.killReward;
  return {
    gold: Math.floor(g * mods.reward * goldMult * k * (risky ? mods.riskGold : 1)),
    xp: Math.floor(x * mods.reward * k),
  };
}

/** `Rewards.survivor`: quem sobra no fim rende uma parte (invocados e filhos da gosma não rendem). */
export function survivorReward(def: { gold: number; xp: number }, champion: boolean, mods: WaveMods, goldMult = 1): { gold: number; xp: number } {
  let g = def.gold;
  let x = def.xp;
  if (champion) {
    g *= CHAMPION.rewardMult;
    x *= CHAMPION.rewardMult;
  }
  const k = mods.killReward; // D-207
  return { gold: Math.floor(g * SURVIVOR_FACTOR * mods.reward * goldMult * k), xp: Math.floor(x * SURVIVOR_FACTOR * mods.reward * k) };
}
