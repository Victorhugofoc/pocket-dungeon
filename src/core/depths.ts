// Progresso e consultas das Depths: porta de core/depths.lua (D-222, D-225, D-227). O progresso de cada herói (maior
// nível vencido, vitórias por nível, Marcas, vantagens compradas e ligadas) mora no save das conquistas
// (`AchievementState.depths`), que as conquistas das Depths leem. Puro: sem DOM e sem three.js.
import {
  DEPTHS_MAX, DEPTHS_SCORE_PER_LEVEL, MUTATIONS, PERKS, PERK_BY_ID, marksFor, type MutationDef, type MutationId, type PerkDef,
  type PerkId,
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

// ---------------------------------------------------------------- vantagens (D-228, M13-02 parte 2)

/** `Depths.buy`: paga as Marcas, compra e já liga. Devolve o motivo da recusa, ou null. */
export function buyPerk(save: DepthsSave, heroId: string, id: PerkId): string | null {
  const p = PERK_BY_ID[id];
  if (!p) return "unknown perk";
  const h = depthsHero(save, heroId);
  if (h.owned[id]) return "already bought";
  if (h.marks < p.cost) return "not enough Marks";
  h.marks -= p.cost;
  h.owned[id] = true;
  h.enabled[id] = true;
  return null;
}

/** `Depths.toggle`: liga ou desliga uma vantagem comprada. Devolve se mudou. */
export function togglePerk(save: DepthsSave, heroId: string, id: PerkId): boolean {
  const h = depthsHero(save, heroId);
  if (!h.owned[id]) return false;
  if (h.enabled[id]) delete h.enabled[id];
  else h.enabled[id] = true;
  return true;
}

export function perkEnabled(save: DepthsSave, heroId: string, id: PerkId): boolean {
  const h = save[heroId];
  return !!h && h.owned[id] === true && h.enabled[id] === true;
}

/** `Depths.runPerks`: o que uma partida nova recebe (compradas e ligadas), na ordem dos dados. */
export function runPerks(save: DepthsSave, heroId: string): PerkId[] {
  return PERKS.filter((p) => perkEnabled(save, heroId, p.id)).map((p) => p.id);
}

/** O que a partida guarda das vantagens: as ligadas no início e as cargas gastas (vão no checkpoint). */
export interface DepthsRunState {
  difficultyId: string;
  depthsPerks: PerkId[];
  /** Reserve Potion já usada (`potionUsed`) */
  potionUsed: boolean;
  /** zonas (`segmentOf`) em que o Card Swap, o Relic Reroll e a Stocked Shop já valeram */
  cardSwaps: number[];
  relicRerolls: number[];
  shopFloors: number[];
  /** Starting Relic ainda por escolher (`pendingStartPick`) */
  pendingStartPick: boolean;
}

export function newDepthsRunState(): Omit<DepthsRunState, "difficultyId"> {
  return { depthsPerks: [], potionUsed: false, cardSwaps: [], relicRerolls: [], shopFloors: [], pendingStartPick: false };
}

/** checkpoints de antes da parte 2 */
export function ensureDepthsRunState(run: Partial<DepthsRunState>): void {
  const d = newDepthsRunState();
  run.depthsPerks ??= d.depthsPerks;
  run.potionUsed ??= d.potionUsed;
  run.cardSwaps ??= d.cardSwaps;
  run.relicRerolls ??= d.relicRerolls;
  run.shopFloors ??= d.shopFloors;
  run.pendingStartPick ??= d.pendingStartPick;
}

const levelOf = (difficultyId: string): number => {
  const m = /^depths(\d)$/.exec(difficultyId);
  return m ? Number(m[1]) : 0;
};

type PerkRun = Pick<DepthsRunState, "difficultyId" | "depthsPerks">;

/** `Depths.perk`: a vantagem quando vale nesta partida (só nas Depths), ou null. */
export function runPerk(run: PerkRun, id: PerkId): PerkDef | null {
  return levelOf(run.difficultyId) > 0 && run.depthsPerks?.includes(id) ? PERK_BY_ID[id] : null;
}

/**
 * `Depths.startRun`: põe as vantagens numa partida nova das Depths (fora delas, nada). Full Purse e Extra Reroll
 * entram aqui; Greed é fonte de atributo (`depthsSources`); a Starting Relic fica pendente até ser escolhida.
 */
export function startDepthsRun(run: DepthsRunState & { gold: number; freeRerolls: number }, perks: readonly PerkId[]): void {
  if (levelOf(run.difficultyId) === 0) return;
  run.depthsPerks = PERKS.filter((p) => perks.includes(p.id)).map((p) => p.id);
  if (runPerk(run, "purse")) run.gold += PERK_BY_ID.purse.gold ?? 0;
  if (runPerk(run, "reroll")) run.freeRerolls += PERK_BY_ID.reroll.freeRerolls ?? 0;
  if (runPerk(run, "relic_pick")) run.pendingStartPick = true;
}

/** Fonte de atributo das vantagens (`depths:greed`). */
export function depthsSources(run: PerkRun): { goldPct: number }[] {
  const g = runPerk(run, "greed");
  return g ? [{ goldPct: g.goldPct ?? 0 }] : [];
}

/** `Depths.perk(run, "ban")`: banimentos a mais na partida. */
export function perkExtraBans(run: PerkRun): number {
  return runPerk(run, "ban")?.extraBans ?? 0;
}

/** shop_system.lua `offerCount` (Stocked Shop): +1 oferta na primeira loja da zona; marca a zona. */
export function stockedShopBonus(run: DepthsRunState, segment: number): number {
  const p = runPerk(run, "full_shop");
  if (!p || run.shopFloors.includes(segment)) return 0;
  run.shopFloors.push(segment);
  return p.extraOffers ?? 0;
}

/** damage.lua (Reserve Potion): a cura de uma vez quando a vida fica abaixo do limiar (e acima de 0), ou 0. Marca o uso. */
export function reservePotion(run: DepthsRunState, hp: number, maxHp: number): number {
  const p = runPerk(run, "reserve_potion");
  if (!p || run.potionUsed || hp <= 0 || hp >= maxHp * (p.below ?? 0)) return 0;
  run.potionUsed = true;
  return Math.min(maxHp - hp, maxHp * (p.heal ?? 0));
}

export type ZonePerk = "card_swap" | "relic_reroll";

/** Card Swap e Relic Reroll: uma vez por zona (`segment`). */
export function canUseZonePerk(run: DepthsRunState, id: ZonePerk, segment: number): boolean {
  if (!runPerk(run, id)) return false;
  return !(id === "card_swap" ? run.cardSwaps : run.relicRerolls).includes(segment);
}
export function useZonePerk(run: DepthsRunState, id: ZonePerk, segment: number): boolean {
  if (!canUseZonePerk(run, id, segment)) return false;
  (id === "card_swap" ? run.cardSwaps : run.relicRerolls).push(segment);
  return true;
}
