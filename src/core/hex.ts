// M9-02: a maldição do Hexer no herói (enemy_attacks.lua `applyHex`, D-072). Pura, sem three.js.

/** Maldição ativa: até `until` (tempo do jogo, s), o herói causa `mult` do dano; `total` = a duração que o ícone mostra. */
export interface HexState {
  until: number;
  mult: number;
  total: number;
}

/**
 * Um tiro de maldição que acertou: renova sem acumular. Com maldição ativa, fica o fim mais tarde e o multiplicador menor;
 * sem ela (ou vencida), começa uma nova.
 */
export function applyHex(cur: HexState | null, now: number, duration: number, mult: number): HexState {
  if (cur && cur.until > now) {
    const until = Math.max(cur.until, now + duration);
    return { until, mult: Math.min(cur.mult, mult), total: until === cur.until ? cur.total : duration };
  }
  return { until: now + duration, mult, total: duration };
}

/** Multiplicador do dano do herói agora (1 sem maldição). */
export function hexMult(cur: HexState | null, now: number): number {
  return cur && cur.until > now ? cur.mult : 1;
}
