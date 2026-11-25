// Conquistas e desbloqueios, puro (dungeon-idle/src/core/achievements.lua e src/core/unlocks.lua, D-630).
// O estado fica salvo entre partidas (core/save.ts). O que vem do progresso salvo (medalhas, códex, contadores) é
// conferido em `check`; o resto vem dos eventos da partida, que o jogo chama no AchievementTracker.
import { ACHIEVEMENT_BY_ID, ACHIEVEMENT_RULES as R, ACHIEVEMENTS, LOCKED_BY, UNLOCK_REWARDS, type AchievementDef, type UnlockKind } from "../data/achievements";
import { FULL_TABLE_SYNERGIES } from "../data/synergies";

export type CodexKind = "boss" | "enemy" | "relic";

export interface AchievementState {
  version: 1;
  unlocked: Record<string, true>;
  counters: Record<string, number>;
  /** "NOVO" até o jogador olhar (`kind:id`) */
  fresh: Record<string, true>;
  /** codex.lua `medalRank`: a maior dificuldade vencida com cada herói (1 fácil, 2 normal, 3 difícil) */
  medals: Record<string, number>;
  /** códex: o que já foi derrotado ou achado */
  seen: Record<CodexKind, string[]>;
  /** heróis que já tiveram partida (um save antigo não tranca quem já jogou) */
  played: string[];
}

export const DIFF_RANK: Readonly<Record<string, number>> = { easy: 1, normal: 2, hard: 3 };

export function emptyAchievements(): AchievementState {
  return { version: 1, unlocked: {}, counters: {}, fresh: {}, medals: {}, seen: { boss: [], enemy: [], relic: [] }, played: [] };
}

/** Lê o que veio do save, completando o que faltar; null quando não é um estado de conquistas. */
export function normalizeAchievements(x: unknown): AchievementState | null {
  const d = x as Partial<AchievementState> | null;
  if (!d || typeof d !== "object" || typeof d.unlocked !== "object" || d.unlocked === null) return null;
  const e = emptyAchievements();
  const obj = <T>(v: unknown, def: T): T => (v && typeof v === "object" && !Array.isArray(v) ? (v as T) : def);
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s) => typeof s === "string") : []);
  const seen = obj(d.seen, e.seen);
  return {
    version: 1, unlocked: obj(d.unlocked, {}), counters: obj(d.counters, {}), fresh: obj(d.fresh, {}),
    medals: obj(d.medals, {}), seen: { boss: arr(seen.boss), enemy: arr(seen.enemy), relic: arr(seen.relic) }, played: arr(d.played),
  };
}

export function isUnlocked(s: AchievementState, id: string): boolean {
  return s.unlocked[id] === true;
}

/** Libera uma vez; marca como "NOVO" o que ela libera (menos ao carregar, `quiet`). Devolve true quando liberou agora. */
export function unlockAchievement(s: AchievementState, id: string, quiet = false): boolean {
  if (!ACHIEVEMENT_BY_ID[id] || isUnlocked(s, id)) return false;
  s.unlocked[id] = true;
  if (!quiet) for (const [kind, rid] of UNLOCK_REWARDS[id] ?? []) s.fresh[`${kind}:${rid}`] = true;
  return true;
}

export function counter(s: AchievementState, name: string): number {
  return s.counters[name] ?? 0;
}

export function addCounter(s: AchievementState, name: string, n = 1): void {
  s.counters[name] = counter(s, name) + n;
}

export function markSeen(s: AchievementState, kind: CodexKind, id: string): boolean {
  if (s.seen[kind].includes(id)) return false;
  s.seen[kind].push(id);
  return true;
}

export function achievementCount(s: AchievementState): number {
  return Object.keys(s.unlocked).length;
}

// ---------------------------------------------------------------- desbloqueios (unlocks.lua)

/** A conquista que libera (undefined quando está aberto desde o início). */
export function lockedBy(kind: UnlockKind, id: string): string | undefined {
  return LOCKED_BY[kind][id];
}

/** unlocks.lua `isOpen`; `all` = tudo aberto (Unlocks.ALL, para teste). */
export function isOpen(s: AchievementState, kind: UnlockKind, id: string, all = false): boolean {
  if (all) return true;
  const ach = lockedBy(kind, id);
  if (!ach || isUnlocked(s, ach)) return true;
  return kind === "hero" && s.played.includes(id);
}

/** unlocks.lua `filter`: os ids abertos, na mesma ordem. */
export function filterOpen(s: AchievementState, kind: UnlockKind, ids: readonly string[], all = false): string[] {
  return ids.filter((id) => isOpen(s, kind, id, all));
}

/** A conquista que libera, com nome e texto (undefined quando aberto desde o início). */
export function unlockCondition(kind: UnlockKind, id: string): AchievementDef | undefined {
  const ach = lockedBy(kind, id);
  return ach ? ACHIEVEMENT_BY_ID[ach] : undefined;
}

/** unlocks.lua `secret`: trancado por uma conquista secreta ainda não feita ("???"). */
export function isSecret(s: AchievementState, kind: UnlockKind, id: string): boolean {
  const a = unlockCondition(kind, id);
  return !!a?.secret && !isUnlocked(s, a.id);
}

/** Progresso de uma conquista de contador: atual e meta (undefined nas outras). */
export function progress(s: AchievementState, a: AchievementDef, recordKills = 0): { current: number; goal: number } | undefined {
  if (!a.counter) return undefined;
  const current = a.counter.name === "kills" ? Math.max(counter(s, "kills"), recordKills) : counter(s, a.counter.name);
  return { current, goal: a.counter.goal };
}

export function isNew(s: AchievementState, kind: UnlockKind, id: string): boolean {
  return s.fresh[`${kind}:${id}`] === true;
}

/** Tira o "NOVO"; devolve true quando havia (para salvar). */
export function markFreshSeen(s: AchievementState, kind: UnlockKind, id: string): boolean {
  const key = `${kind}:${id}`;
  if (!s.fresh[key]) return false;
  delete s.fresh[key];
  return true;
}

// ---------------------------------------------------------------- conferência pelo progresso salvo

/** As listas do conteúdo daqui que as conquistas de "todos" percorrem. */
export interface AchievementContent {
  heroes: readonly string[];
  bosses: readonly string[];
  enemies: readonly string[];
  relics: readonly string[];
}

/** achievements.lua `check`: libera o que o progresso salvo já cumpre; devolve as liberadas agora. */
export function checkSaved(s: AchievementState, c: AchievementContent, opts: { recordKills?: number; quiet?: boolean; all?: boolean } = {}): string[] {
  const medal = (h: string) => s.medals[h] ?? 0;
  const anyMedal = (r: number) => c.heroes.some((h) => medal(h) >= r);
  const allMedals = (r: number) => c.heroes.every((h) => medal(h) >= r);
  // D-630: "todas" conta só o que está aberto (o trancado não dá para achar)
  const codexAll = (kind: CodexKind, ids: readonly string[]) =>
    ids.every((id) => s.seen[kind].includes(id) || (kind === "relic" && !isOpen(s, "relic", id, opts.all)));
  const checks: Record<string, () => boolean> = {
    first_blood: () => s.seen.boss.length >= 1,
    survivor: () => anyMedal(1),
    veteran: () => anyMedal(2),
    relentless: () => anyMedal(3),
    six_crowns: () => allMedals(1),
    dominion: () => allMedals(3),
    bestiary: () => codexAll("enemy", c.enemies),
    kingslayer: () => codexAll("boss", c.bosses),
    reliquary: () => codexAll("relic", c.relics),
  };
  for (const h of c.heroes) checks[`win_${h}`] = () => medal(h) >= 1;
  const out: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (isUnlocked(s, a.id)) continue;
    const p = progress(s, a, opts.recordKills);
    const ok = p ? p.current >= p.goal : checks[a.id]?.() === true;
    if (ok && unlockAchievement(s, a.id, opts.quiet)) out.push(a.id);
  }
  return out;
}

// ---------------------------------------------------------------- eventos da partida (achievements.lua `attach`)

export type KillSource = "auto" | "dot" | "other";

/** O que a partida conta para as conquistas. Cada método devolve nada; as liberadas saem em `take()`. */
export class AchievementTracker {
  /** liberadas desde o último `take()` */
  private news: string[] = [];
  private wave = { hit: false, lowest: 1, number: 0 };
  private bosses = new Map<object, number>();
  /** quem já deu a medalha nesta partida (a vitória conta uma vez) */
  private won = false;
  /** a partida teve atalho de teste: não libera nada pela vitória (achievements.lua `devUsed`) */
  devUsed = false;

  constructor(public state: AchievementState, private content: AchievementContent, public recordKills = 0) {}

  private unlock(id: string): void {
    if (unlockAchievement(this.state, id)) this.news.push(id);
  }

  /** As conquistas liberadas desde a última chamada. */
  take(): string[] {
    const n = this.news;
    this.news = [];
    return n;
  }

  check(): void {
    this.news.push(...checkSaved(this.state, this.content, { recordKills: this.recordKills }));
  }

  runStart(heroId: string): void {
    if (!this.state.played.includes(heroId)) this.state.played.push(heroId);
    this.won = false;
    this.devUsed = false;
    this.bosses.clear();
  }

  waveStart(wave: number, spells: ReadonlyArray<{ id: string; level: number }> = [], maxLevel = Infinity): void {
    this.wave = { hit: false, lowest: 1, number: wave };
    this.maxSpells(spells, maxLevel);
  }

  /** a lente de spell: uma spell no nível máximo nesta partida */
  maxSpells(spells: ReadonlyArray<{ id: string; level: number }>, maxLevel: number): void {
    for (const sp of spells) if (sp.level >= maxLevel && ACHIEVEMENT_BY_ID[`max_${sp.id}`]) this.unlock(`max_${sp.id}`);
  }

  playerHit(amount: number, hpFrac: number): void {
    if (amount > 0) this.wave.hit = true;
    this.wave.lowest = Math.min(this.wave.lowest, hpFrac);
  }

  dodge(): void {
    addCounter(this.state, "dodges");
  }

  /** `healed`: vida curada na partida até agora */
  healed(healed: number): void {
    if (healed >= R.medicineHeal) this.unlock("medicine");
  }

  bossSpawned(key: object, elapsed: number): void {
    this.bosses.set(key, elapsed);
  }

  /** `noReward`: invocado que não conta (enemy.lua `noReward`) */
  enemyKilled(k: { key: object; id: string; boss: boolean; champion: boolean; source: KillSource; elapsed: number; noReward?: boolean }): void {
    if (k.noReward) return;
    addCounter(this.state, "kills");
    if (k.champion) addCounter(this.state, "elites");
    if (k.source === "auto") addCounter(this.state, "auto_kills");
    if (k.source === "dot") addCounter(this.state, "dot_kills");
    if (k.boss) {
      // first_blood e kingslayer leem o códex
      if (markSeen(this.state, "boss", k.id)) this.check();
      const t0 = this.bosses.get(k.key);
      if (t0 !== undefined && k.elapsed - t0 < R.lightningDuel) this.unlock("lightning_duel");
      this.bosses.delete(k.key);
    } else if (markSeen(this.state, "enemy", k.id)) this.check();
  }

  /** achievements.lua `synergy_activated`: Full Table com 3 sinergias ativas ao mesmo tempo. */
  synergiesActive(n: number): void {
    if (n >= FULL_TABLE_SYNERGIES) this.unlock("full_table");
  }

  relicFound(id: string): void {
    if (markSeen(this.state, "relic", id)) this.check();
  }

  waveComplete(w: { wave: number; bossWave: boolean; gameOver: boolean; gold: number }): void {
    if (w.bossWave && !this.wave.hit) this.unlock("untouchable");
    if (w.wave >= R.endlessWave) this.unlock("endless");
    if (!w.gameOver) {
      if (w.bossWave && this.wave.lowest <= R.byAThread) this.unlock("by_a_thread");
      if (w.wave <= R.miserWave && w.gold >= R.miserGold) this.unlock("miser");
    }
    this.check();
  }

  /** Vencer a onda 20: a medalha do herói na dificuldade (codex.lua `medal`), mais as conquistas de vitória. */
  victory(run: { heroId: string; difficultyId: string; relics: readonly string[] }): void {
    if (this.won || this.devUsed) return;
    this.won = true;
    const rank = DIFF_RANK[run.difficultyId] ?? 0;
    this.state.medals[run.heroId] = Math.max(this.state.medals[run.heroId] ?? 0, rank);
    if (run.relics.includes("glass_cannon")) this.unlock("glass_cannon_win");
    this.check();
  }
}
