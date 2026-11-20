// Golpe corpo a corpo com direção (M21-01, D17): o arco travado no preparo decide quem leva o golpe.
// Ângulos no padrão do jogo: atan2(dx, dz).

/** Diferença de ângulo em [-π, π]. */
export function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Um círculo de raio `pr` em (px, pz) toca o setor que sai de (ex, ez) na direção `angle`, com abertura `arc` (rad)
 * e raio `reach`? Aproximação: distância até reach + pr e ângulo até arc/2 + o ângulo que o círculo ocupa.
 */
export function circleInArc(ex: number, ez: number, angle: number, arc: number, reach: number, px: number, pz: number, pr: number): boolean {
  const d = Math.hypot(px - ex, pz - ez);
  if (d > reach + pr) return false;
  if (d <= pr) return true;
  return Math.abs(angleDiff(Math.atan2(px - ex, pz - ez), angle)) <= arc / 2 + Math.asin(Math.min(1, pr / d));
}
