// M9-05: o salto do Leaper (ai.lua `behaviors.leaper`, §54). Puro, sem three.js.
// Com a recarga pronta e o herói entre `minDist` e `range`, o sapo marca o lugar do herói, se prepara `windup` s e voa
// `airTime` s em linha reta até lá; ao pousar, acerta quem estiver a até `radius` (+ o raio do herói) do ponto.

export interface LeapSpec {
  cooldown: number;
  range: number;
  minDist: number;
  radius: number;
  damage: number;
  windup: number;
  airTime: number;
  /** altura máxima do arco (ai.lua `hop`), só visual */
  height: number;
}

export interface Leap {
  x0: number;
  z0: number;
  tx: number;
  tz: number;
  /** preparo que falta (s); no fim começa o voo */
  windup: number;
  /** tempo de voo (s) */
  t: number;
}

/** ai.lua: salta com a recarga pronta e o herói longe o bastante, mas dentro do alcance */
export function canLeap(timer: number, dist: number, s: Pick<LeapSpec, "range" | "minDist">): boolean {
  return timer <= 0 && dist <= s.range && dist > s.minDist;
}

export function startLeap(x: number, z: number, tx: number, tz: number, windup: number): Leap {
  return { x0: x, z0: z, tx, tz, windup, t: 0 };
}

export interface LeapStep {
  x: number;
  z: number;
  /** altura do arco agora */
  hop: number;
  /** 0..1 do voo (0 no preparo) */
  k: number;
  airborne: boolean;
  /** pousou neste passo */
  landed: boolean;
}

/** avança o salto em dt; muda `L` (preparo e tempo de voo) */
export function stepLeap(L: Leap, dt: number, s: Pick<LeapSpec, "airTime" | "height">): LeapStep {
  if (L.windup > 0) {
    L.windup -= dt;
    if (L.windup <= 0) L.t = 0;
    return { x: L.x0, z: L.z0, hop: 0, k: 0, airborne: false, landed: false };
  }
  L.t += dt;
  const k = Math.min(1, L.t / s.airTime);
  return {
    x: L.x0 + (L.tx - L.x0) * k,
    z: L.z0 + (L.tz - L.z0) * k,
    hop: Math.sin(k * Math.PI) * s.height,
    k,
    airborne: k < 1,
    landed: k >= 1,
  };
}

/** enemy_attacks.lua `playerInside`: o herói (raio `pr`) está dentro do círculo do pouso? */
export function leapHits(x: number, z: number, radius: number, px: number, pz: number, pr: number): boolean {
  const rr = radius + pr;
  return (px - x) ** 2 + (pz - z) ** 2 <= rr * rr;
}
