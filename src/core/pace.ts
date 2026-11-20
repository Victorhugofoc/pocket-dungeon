// Aplica a camada de ritmo (src/data/pace.ts, M21-02) sobre as fórmulas do original, que ficam intactas para a paridade.
import { PACE } from "../data/pace";
import { baseDuration } from "./waves";

/** Escala de contagem da onda (1 depois da lista). */
export function countScale(wave: number): number {
  return PACE.countScale[wave - 1] ?? 1;
}

/** Contagem da onda com ritmo, a partir da contagem do original (`targetCount`). Nunca menos de 1. */
export function pacedCount(originalCount: number, wave: number): number {
  return Math.max(1, Math.round(originalCount * countScale(wave)));
}

/** Duração da onda com ritmo. */
export function pacedDuration(wave: number): number {
  return baseDuration(wave) * PACE.durationMult;
}

/** Vida e dano do inimigo comum ou campeão com ritmo, a partir dos números do original (`enemyStats`). */
export function pacedFoe<T extends { hp: number; damage: number }>(st: T): T {
  return { ...st, hp: st.hp * PACE.enemyHpMult, damage: st.damage * PACE.enemyDamageMult };
}

/** Raio de uma clareira de onda com ritmo. */
export function pacedClearing(radius: number): number {
  return radius * PACE.clearingMult;
}

/**
 * Orbe de cura com ritmo (M21-03): chance de um inimigo morto deixar o orbe e se ele conta no teto da onda.
 * Chefe e invocado nunca deixam; o campeão sempre deixa (`chance.champion`) e fica fora do teto.
 * `dropped` = orbes que já contaram nesta onda.
 */
export function pacedHealOrb(
  e: { id: string; category: string; champion: boolean; boss: boolean; summoned: boolean }, dropped: number,
): { chance: number; counts: boolean } {
  const O = PACE.healOrb;
  if (e.boss || e.summoned) return { chance: 0, counts: false };
  if (e.champion) return { chance: O.chance.champion, counts: false };
  if (dropped >= O.maxPerWave) return { chance: 0, counts: true };
  const c = e.id === "swarm" ? O.chance.swarm : e.category === "elite" ? O.chance.elite : O.chance.normal;
  return { chance: c, counts: true };
}
