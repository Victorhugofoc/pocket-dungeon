// Progresso e consultas das Depths: porta de core/depths.lua (D-222, D-225, D-227). O progresso de cada herói (maior
// nível vencido, vitórias por nível, Marcas, vantagens compradas e ligadas) mora no save das conquistas
// (`AchievementState.depths`), que as conquistas das Depths leem. Puro: sem DOM e sem three.js.
import {
  DEPTHS_MAX, DEPTHS_SCORE_PER_LEVEL, MUTATIONS, PERKS, marksFor, type MutationDef, type MutationId,
} from "../data/depths";

export interface DepthsHero {
  /** maior nível vencido (0 = nenhum) */
  best: number;
  /** vitórias por nível ("1" a "5") */
  wins: Record<string, number>;
  marks: number;
  /** vantagens compradas e ligadas (parte 2) */
  owned: Record<string, true>;
  enabled: Record<string, true>;
}

export type DepthsSave = Record<string, DepthsHero>;

export function newDepthsHero(): DepthsHero {
  return { best: 0, wins: {}, marks: 0, owned: {}, enabled: {} };
}

/** Lê o que veio do save, completando o que faltar (heróis com dados quebrados viram vazios). */
export function normalizeDepths(x: unknown): DepthsSave {
  const out: DepthsSave = {};
  if (!x || typeof x !== "object" || Array.isArray(x)) return out;
  const obj = <T>(v: unknown): T => (v && typeof v === "object" && !Array.isArray(v) ? (v as T) : ({} as T));
  for (const [id, raw] of Object.entries(x as Record<string, unknown>)) {
    const h = obj<Partial<DepthsHero>>(raw);
    out[id] = {
      best: typeof h.best === "number" ? h.best : 0, wins: obj(h.wins), marks: typeof h.marks === "number" ? h.marks : 0,
      owned: obj(h.owned), enabled: obj(h.enabled),
    };
  }
  return out;
}

/** `Depths.hero`: o registro do herói, criado no primeiro uso. */
export function depthsHero(save: DepthsSave, heroId: string): DepthsHero {
  return (save[heroId] ??= newDepthsHero());
}

/** `Depths.unlockedLevel` (D-222): o maior nível que o herói pode jogar; 0 = fechado (falta vencer na Hard). */
export function unlockedDepths(save: DepthsSave, heroId: string, hardMedal: boolean): number {
  if (!hardMedal) return 0;
  return Math.min(DEPTHS_MAX, (save[heroId]?.best ?? 0) + 1);
}

/** `Depths.recordWin` (D-227): Marcas da vitória no nível e se foi a primeira. */
export function recordDepthsWin(save: DepthsSave, heroId: string, level: number): { marks: number; first: boolean } {
  const h = depthsHero(save, heroId);
  const k = String(level);
  const first = (h.wins[k] ?? 0) === 0;
  const marks = marksFor(level, first);
  h.wins[k] = (h.wins[k] ?? 0) + 1;
  h.marks += marks;
  if (level > h.best) h.best = level;
  return { marks, first };
}

/** `Depths.mutation`: a mutação quando ela vale no nível (D-223: a N vale da Depths N para cima). */
export function mutation(level: number, id: MutationId): MutationDef | null {
  const i = MUTATIONS.findIndex((m) => m.id === id);
  return i >= 0 && level >= i + 1 ? MUTATIONS[i] : null;
}

/** As mutações que valem no nível, na ordem. */
export function activeMutations(level: number): MutationDef[] {
  return MUTATIONS.slice(0, Math.max(0, Math.min(DEPTHS_MAX, level)));
}

/** `Depths.scoreMult` (D-225) */
export function depthsScoreMult(level: number): number {
  return 1 + DEPTHS_SCORE_PER_LEVEL * level;
}

/** achievements.lua `bestDepths`, `allDepths`, `allPerks` */
export function bestDepths(save: DepthsSave, heroes: readonly string[]): number {
  return heroes.reduce((a, h) => Math.max(a, save[h]?.best ?? 0), 0);
}
export function allDepths(save: DepthsSave, heroes: readonly string[], level: number): boolean {
  return heroes.every((h) => (save[h]?.best ?? 0) >= level);
}
export function allPerks(save: DepthsSave, heroes: readonly string[]): boolean {
  return heroes.some((h) => PERKS.every((p) => save[h]?.owned[p.id] === true));
}

/** O letreiro da onda 1: "Depths N: mutação · mutação". */
export function depthsSummary(level: number): string {
  return level ? `Depths ${level}: ${activeMutations(level).map((m) => m.name).join(" · ")}` : "";
}
