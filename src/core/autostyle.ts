// H8: a forma do ataque básico por estilo (auto_attack.lua `Auto.pattern`, `Auto.reach`, `Auto.arcHalfAngle`).
// Ângulos no plano do jogo: 0 = +z, direção (sin a, cos a). Distâncias em metros.
import { ARC_HALF, ARC_STYLES, AUTO_SHOT, STYLE_SHIELD, type AutoStyle } from "../data/autostyle";
import { px } from "./techniques";

export interface ShotSpec {
  /** deslocamento lateral da saída, em metros (Double Shot lado a lado) */
  side: number;
  angle: number;
  /** tiro do leque fora da mira (D-590: os laterais do Cone da Frostine e da Vesper) */
  fan: boolean;
}

/**
 * Auto.pattern (D-170, M-02): os tiros somam, 1 + Cone + Double. O Cone abre 1 + cone tiros em leque em volta da mira;
 * o Double põe tiros paralelos lado a lado no tiro do meio, numa fileira de no máximo `doubleWidth`.
 */
export function autoPattern(cone: number, double: number, angle: number): ShotSpec[] {
  const out: ShotSpec[] = [];
  const nCone = 1 + Math.max(0, cone);
  const center = Math.floor((nCone + 1) / 2);
  for (let c = 1; c <= nCone; c++) {
    const a = angle + (c - (nCone + 1) / 2) * AUTO_SHOT.coneStep;
    const nLine = c === center ? 1 + Math.max(0, double) : 1;
    const gap = nLine > 1 ? Math.min(AUTO_SHOT.doubleSpacing, AUTO_SHOT.doubleWidth / (nLine - 1)) : 0;
    for (let k = 1; k <= nLine; k++) out.push({ side: px((k - (nLine + 1) / 2) * gap), angle: a, fan: c !== center });
  }
  return out;
}

/**
 * Quantos tiros o estilo põe no padrão: o Kaelen solta um raio só; o Double da Vesper é acúmulo, não tiro; o Seraph
 * joga um escudo só (o Double dele é o escudo de luz logo depois, e o Cone vira alcance).
 */
export function patternCounts(style: AutoStyle, cone: number, double: number): { cone: number; double: number } {
  if (style === "storm" || style === "shieldthrow") return { cone: 0, double: 0 };
  if (style === "venom") return { cone, double: 0 };
  return { cone, double };
}

/** Auto.reach: o arco cresce 12% por Pierce; o escudo, 15% por Cone. `base` = alcance do herói com os bônus. */
export function autoReach(style: AutoStyle, base: number, pierce: number, cone: number): number {
  const A = ARC_STYLES[style];
  if (A) return base * (1 + A.reachPerPierce * pierce);
  if (style === "shieldthrow") return base * (1 + STYLE_SHIELD.reachPerCone * cone);
  return base;
}

/** Auto.arcHalfAngle: o meio-arco do herói mais 12,5° por Cone, entre 20° e 175°. */
export function arcHalfAngle(style: AutoStyle, baseHalf: number, cone: number): number {
  const A = ARC_STYLES[style];
  const per = A ? A.perCone : 0;
  return Math.max(ARC_HALF.min, Math.min(ARC_HALF.max, baseHalf + per * cone));
}

/** Os ângulos dos ramos do raio do Kaelen (alternando os lados, abrindo a cada par). */
export function forkAngles(angle: number, forks: number, spread: number): number[] {
  const out: number[] = [];
  for (let k = 1; k <= forks; k++) out.push(angle + (k % 2 === 1 ? 1 : -1) * spread * Math.ceil(k / 2));
  return out;
}
