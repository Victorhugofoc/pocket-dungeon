// M9-04: a aura do Warden (damage.lua `wardenNearby`, §54, D-071). Pura, sem three.js.
import type { EnemyDef } from "../data/enemies";

/** O mínimo de um inimigo para a aura: posição no chão, se morreu e a ficha. */
export interface WardFoe {
  x: number;
  z: number;
  dead: boolean;
  def?: Pick<EnemyDef, "support"> | null;
}

/**
 * O Warden que protege `e`: o primeiro vivo (fora o próprio) com `e` dentro do raio da aura. Um Warden não é protegido por outro.
 * Devolve null se ninguém protege.
 */
export function wardenFor<T extends WardFoe>(e: WardFoe, foes: readonly T[]): T | null {
  if (e.def?.support) return null;
  for (const w of foes) {
    const s = w.def?.support;
    if (w === e || w.dead || !s) continue;
    if ((w.x - e.x) ** 2 + (w.z - e.z) ** 2 <= s.radius * s.radius) return w;
  }
  return null;
}
