// M10-08: o Armorbreak do Iron Colossus no herói (boss_ai.lua `armorbreak`, damage.lua `armorBreak`). Pura, sem three.js.
import { armorReduction } from "./stats";

/** Quebra ativa: até `until` (tempo do jogo, s) o herói tem `armor` a mais de armadura (negativa); `total` = a duração do ícone. */
export interface ArmorBreakState {
  until: number;
  armor: number;
  total: number;
}

/** Um Armorbreak que acertou: como lá, troca o que havia (renova o tempo, não acumula). */
export function applyArmorBreak(now: number, time: number, armor: number): ArmorBreakState {
  return { until: now + time, armor, total: time };
}

/**
 * damage.lua: com a quebra ativa, a armadura do golpe é a do herói + a da quebra. Devolve o multiplicador do dano que ele
 * leva (o mesmo `1 - armorReduction` de `stats.damageTaken`).
 */
export function armorTakenMult(armor: number, brk: ArmorBreakState | null, now: number): number {
  return 1 - armorReduction(brk && brk.until > now ? armor + brk.armor : armor);
}
