// M10-10: fases e mecânicas próprias dos chefes (boss.lua `phaseFor`/`updatePhase`, boss_ai.lua `updateMechanic`). Pura.
import { BOSS_MECHANICS, BOSS_PHASES } from "../data/run";
import type { BossPatternKind } from "../data/enemies";

export type BossPhase = 1 | 2 | 3;

/** boss.lua `phaseFor`: fase pela fração de vida. */
export function phaseFor(frac: number): BossPhase {
  if (frac > BOSS_PHASES[0].above) return 1;
  if (frac > BOSS_PHASES[1].above) return 2;
  return 3;
}

/** Multiplicadores de uma entrada de fase, já traduzidos para o chefe daqui (rotação, golpe e passo). */
export interface PhaseStep {
  phase: BossPhase;
  speed: number;
  /** recarga da rotação de padrões (lá `attackCooldown`) */
  patternCooldown: number;
  /** recarga do golpe corpo a corpo (lá `contactCooldown`) */
  meleeCooldown: number;
  /** recarga do skillshot (lá `skillshotCooldown`, M10-01) */
  skillshotCooldown: number;
  enraged: boolean;
}

/**
 * boss.lua `updatePhase`: as fases que o chefe atravessa de `from` até a fase da vida atual, cada uma uma vez e em
 * ordem (um golpe grande pode pular a fase 2, e ela ainda vale).
 */
export function phaseSteps(from: BossPhase, frac: number): PhaseStep[] {
  const out: PhaseStep[] = [];
  for (let p = from + 1; p <= phaseFor(frac); p++) {
    const P = BOSS_PHASES[p - 1] as { above: number; speed?: number; attackCooldown?: number; contactCooldown?: number;
      skillshotCooldown?: number; enraged?: boolean };
    out.push({ phase: p as BossPhase, speed: P.speed ?? 1, patternCooldown: P.attackCooldown ?? 1, meleeCooldown: P.contactCooldown ?? 1,
      skillshotCooldown: P.skillshotCooldown ?? 1, enraged: P.enraged === true });
  }
  return out;
}

/**
 * boss_ai.lua `unlocked`: lá o ataque i abre na fase i (3 ataques). Aqui a lista de padrões tem de 2 a 5: os últimos
 * dois abrem nas fases 2 e 3, o resto já na 1. O rei coroado (onda 20) tem todos desde o começo.
 */
export function unlockedPatterns(count: number, phase: BossPhase, crowned: boolean): number {
  if (crowned) return count;
  return Math.max(1, Math.min(count, count - 3 + phase));
}

/** boss_ai.lua `updateMechanic` Blood Rush: degraus de 10% de vida perdida e os multiplicadores de passo e dano. */
export function bloodRush(frac: number): { steps: number; speed: number; damage: number } {
  const M = BOSS_MECHANICS.blood_rush;
  const steps = Math.max(0, Math.floor((1 - frac) / M.perStep + 1e-9));
  return { steps, speed: 1 + M.speed * steps, damage: 1 + M.damage * steps };
}

/** Army of the Damned (D-199): lacaios da invocação ao entrar na fase. */
export function armyCount(phase: BossPhase): number {
  const c = BOSS_MECHANICS.army_of_the_damned.perPhase;
  return c[Math.min(phase, c.length) - 1];
}

/** Soul Tether (D-256): Selos de Alma erguidos ao entrar na fase (2, 3, 3). */
export function soulWardCount(phase: BossPhase): number {
  const c = BOSS_MECHANICS.soul_tether.perPhase;
  return c[Math.min(phase, c.length) - 1];
}

/** boss_ai_ext.lua `soul_tether`: com algum selo de pé, o chefe leva só 35% do dano. */
export function tetherMult(wardsAlive: number): number {
  return wardsAlive > 0 ? BOSS_MECHANICS.soul_tether.damageTakenMult : 1;
}

/**
 * boss_ai.lua `rotation` e `hasSkillshot` (M10-01): dos padrões que a fase abriu, o skillshot sai da rotação e corre com
 * recarga própria. Devolve os índices (na lista do chefe) que entram na rotação e se o skillshot já está aberto.
 */
export function bossRotation(kinds: readonly BossPatternKind[], phase: BossPhase, crowned: boolean): { rotation: number[]; skillshot: boolean } {
  const n = unlockedPatterns(kinds.length, phase, crowned);
  const rotation: number[] = [];
  let skillshot = false;
  for (let i = 0; i < n; i++) {
    if (kinds[i] === "skillshot") skillshot = true;
    else rotation.push(i);
  }
  return { rotation, skillshot };
}

/** Marca do Deathstalker no herói: até quando vale, o multiplicador e quem marcou. */
export interface MarkState<T = unknown> {
  until: number;
  total: number;
  mult: number;
  by: T;
}

/** boss_ai.lua `mark`: a marca nova troca a antiga (tempo e dono), sem acumular. */
export function applyMark<T>(now: number, time: number, mult: number, by: T): MarkState<T> {
  return { until: now + time, total: time, mult, by };
}

/** boss_ai.lua `BA.damage`: o dano de quem marcou sai ×mult enquanto a marca vale; o de outros, igual. */
export function markMult<T>(mark: MarkState<T> | null, now: number, from: T): number {
  return mark && mark.by === from && now < mark.until ? mark.mult : 1;
}
