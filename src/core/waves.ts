// Fórmulas da partida do Dungeon Reign (waves.lua, constants.lua, run_map.lua, xp.lua, bosses.lua), puras.
// Os números estão em src/data/run.ts; tests/parity.test.ts compara cada função com a de lá, onda a onda.
import { BOSS, BOSS_EVERY, ENDLESS, ENEMY_WEIGHT, TOTAL_WAVES, WAVE_STAGES, WAVES, XP_GROWTH } from "../data/run";

/** constants.lua `BOSS_WAVES`: 5, 10, 15, 20 e, no modo sem fim, toda onda múltipla de 5. */
export function isBossWave(wave: number): boolean {
  return wave >= BOSS_EVERY && wave % BOSS_EVERY === 0;
}

/** run_map.lua `segmentOf`: o trecho de 5 ondas (aqui, a zona) de uma onda, a partir de 1. */
export function segmentOf(wave: number): number {
  return Math.floor((wave - 1) / 5) + 1;
}

/** run_map.lua `hasMapBefore`: há mapa da partida antes de toda onda a partir da 2, menos as de chefe. */
export function hasMapBefore(wave: number): boolean {
  return wave >= 2 && !isBossWave(wave);
}

/** wave_system.lua: a loja abre sozinha antes de toda onda de chefe. */
export function shopBeforeWave(wave: number): boolean {
  return isBossWave(wave);
}

/** waves.lua `baseDuration`. */
export function baseDuration(wave: number): number {
  return WAVES.duration[wave - 1] ?? WAVES.durationLater;
}

/** waves.lua `baseEnemyCount`: contagem base de inimigos da onda (antes de dificuldade, sala e tamanho da arena). */
export function baseEnemyCount(wave: number): number {
  if (wave > TOTAL_WAVES) wave = ENDLESS.countWave;
  let base = WAVES.baseCount[Math.min(wave, 5) - 1];
  if (wave > 5) base += (wave - 5) * WAVES.countStep;
  let n = base * (1 + Math.max(0, wave - 1) * WAVES.countGrowth) * WAVES.countFactor;
  const k = WAVES.countMult[wave - 1];
  if (k !== undefined) n = n * k + 0.5;
  return Math.floor(n);
}

function endless(wave: number, key: "hpPerWave" | "damagePerWave"): number {
  if (wave <= TOTAL_WAVES) return 1;
  const s2 = ENDLESS.step2;
  const first = Math.min(wave, s2.from - 1) - TOTAL_WAVES;
  const second = Math.max(0, wave - s2.from + 1);
  return (1 + ENDLESS[key]) ** first * (1 + s2[key]) ** second;
}

/** waves.lua `hpScale`: vida dos inimigos por onda. */
export function hpScale(wave: number): number {
  return (1 + Math.max(0, wave - 1) * WAVES.hpPerWave) * endless(wave, "hpPerWave");
}

/** waves.lua `damageScale`: dano dos inimigos por onda. */
export function damageScale(wave: number): number {
  return (1 + Math.max(0, wave - 1) * WAVES.damagePerWave) * endless(wave, "damagePerWave");
}

/** waves.lua `baseGold`, `baseXp`: recompensa por fechar a onda. */
export function waveGold(wave: number): number {
  return WAVES.gold.base + wave * WAVES.gold.perWave;
}
export function waveXp(wave: number): number {
  return WAVES.xp.base + wave * WAVES.xp.perWave;
}

/** waves.lua `compositionFor`: inimigos sorteáveis na onda, com peso. */
export function compositionFor(wave: number): { id: string; weight: number }[] {
  let stage = WAVE_STAGES[0];
  for (const st of WAVE_STAGES) if (st.from <= wave && st.from > stage.from) stage = st;
  return stage.pool.map((id) => ({ id, weight: stage.weights?.[id] ?? ENEMY_WEIGHT[id] }));
}

/** xp.lua: XP para o próximo nível depois de subir (arredonda para baixo, como lá). */
export function nextXpToNext(xpToNext: number): number {
  return Math.floor(xpToNext * XP_GROWTH);
}

/** bosses.lua: tier do chefe, vida e dano base, ouro e XP. */
export function bossTier(wave: number): number {
  return Math.max(1, Math.floor(wave / 5));
}
export function bossBaseHp(wave: number): number {
  return BOSS.base.hpBase + wave * BOSS.base.hpPerWave;
}
export function bossBaseDamage(wave: number): number {
  return BOSS.base.damageBase + wave * BOSS.base.damagePerWave;
}
export function bossGold(wave: number): number {
  return BOSS.gold.base + (wave - 1) * BOSS.gold.perWave;
}
export function bossXp(wave: number): number {
  return BOSS.xp.base + (wave - 1) * BOSS.xp.perWave;
}
