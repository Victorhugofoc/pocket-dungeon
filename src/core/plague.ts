// M9-03: a poça de peste do Plaguebearer (ai.lua `onKill`, §54, D-069). Pura, sem three.js.
import type { EnemyDef } from "../data/enemies";

/** Dano por segundo da poça na onda `wave`: 5 + 0,45 × onda (a onda da partida, não o nível do inimigo). */
export function plagueDps(p: NonNullable<EnemyDef["plague"]>, wave: number): number {
  return p.dpsBase + p.dpsPerWave * Math.max(1, wave);
}
