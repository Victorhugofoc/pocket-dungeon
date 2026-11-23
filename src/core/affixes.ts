// Sorteio dos afixos de campeão (affix_system.lua `roll`) e o bônus de recompensa. Lógica pura.
import { AFFIX_FORBIDDEN, AFFIX_ORDER, AFFIX_REWARD_PER, AFFIX_SECOND, type AffixId } from "../data/affixes";
import type { Rng } from "./rng";

/**
 * Afixos de um campeão da onda `wave`: 1, ou 2 a partir da onda 12 com 50%; `min` sobe a conta (Toca dos Campeões: 2),
 * `max` corta (Depths: 1 em inimigo comum e chefe); `exclude` tira do sorteio. Depois de cada afixo, sai do pote o que
 * não combina com ele.
 */
export function rollAffixes(rng: Rng, wave: number, min = 1, max?: number, exclude?: readonly AffixId[]): AffixId[] {
  const pool = AFFIX_ORDER.filter((id) => !exclude?.includes(id));
  let n = 1;
  if (wave >= AFFIX_SECOND.fromWave && rng.chance(AFFIX_SECOND.chance)) n = 2;
  n = Math.max(n, min);
  if (max !== undefined) n = Math.min(n, max);
  const out: AffixId[] = [];
  for (let i = 0; i < n && pool.length; i++) {
    const id = pool.splice(rng.int(0, pool.length - 1), 1)[0];
    out.push(id);
    for (const [a, b] of AFFIX_FORBIDDEN) {
      const other = a === id ? b : b === id ? a : null;
      if (!other) continue;
      const j = pool.indexOf(other);
      if (j >= 0) pool.splice(j, 1);
    }
  }
  return out;
}

/** affix_system.lua `apply`: multiplicador de ouro e XP do campeão (+25% por afixo). */
export function affixReward(n: number): number {
  return 1 + AFFIX_REWARD_PER * n;
}
