// Escudo de frente (ai.lua `behaviors.shield`, damage.lua `guardArc` e `shieldBlocks`). Ângulos em guinada: a direção
// (sin a, cos a) no plano xz, a mesma do `facing` dos inimigos.

export interface ShieldCycle {
  up: number;
  warn: number;
  down: number;
}

/** Fase do ciclo do escudo no tempo `t` (s desde que nasceu, erguido): erguido, piscando ou abaixado. */
export function shieldPhase(t: number, c: ShieldCycle): "up" | "warn" | "down" {
  const period = c.up + c.warn + c.down;
  const k = ((t % period) + period) % period;
  if (k < c.up) return "up";
  return k < c.up + c.warn ? "warn" : "down";
}

/** Diferença de ângulo em (-π, π]. */
export function angleDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** Gira `angle` para `target` no máximo `maxTurn` rad. */
export function turnToward(angle: number, target: number, maxTurn: number): number {
  const d = angleDiff(target, angle);
  return angle + Math.max(-maxTurn, Math.min(maxTurn, d));
}

/**
 * damage.lua `shieldBlocks`: o dano vem de (fx, fz) e cai dentro do arco de `arcDeg` em volta de `guard`? Origem colada no
 * corpo (menos de meio raio) não dá direção: vale a posição do herói (px, pz), como lá.
 */
export function guardBlocks(guard: number, arcDeg: number, ex: number, ez: number, radius: number,
  fx: number, fz: number, px: number, pz: number): boolean {
  let dx = fx - ex, dz = fz - ez;
  if (dx * dx + dz * dz < (radius * 0.5) ** 2) {
    dx = px - ex;
    dz = pz - ez;
  }
  return Math.abs(angleDiff(Math.atan2(dx, dz), guard)) <= (arcDeg * Math.PI) / 360;
}
