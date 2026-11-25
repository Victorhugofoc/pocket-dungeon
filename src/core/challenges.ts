// Desafios da partida: porta de run/challenges.lua (AB-2, D-306). Um desafio novo no começo das ondas 1, 6, 11
// e 16 (até 2 abertos; o que espera entra quando abre vaga), cada um com prazo, pago em ouro que cresce com a
// onda em que completou (pequeno 15 + 6 × onda, médio ×2, grande ×3) ou numa troca grátis. O estado fica em
// `run.challenges` (dados simples, vai no checkpoint); o `ChallengeTracker` recebe os acontecimentos da partida
// e guarda só o que vale dentro de uma onda (golpe levado, hora em que o chefe apareceu).
import {
  CHALLENGES, CHALLENGE_BY_ID, CHALLENGE_GOLD, CHALLENGE_MAX_OPEN, CHALLENGE_OFFER_WAVES, CHALLENGE_PLUS_WAVES,
  CHALLENGE_REFUND, CHALLENGE_SIZE, CHALLENGE_TUNING as T, type ChallengeDef, type ChallengeSize,
} from "../data/challenges";
import { EVOLUTIONS, EVOLUTION_ORDER, MAX_SPELLS, SPELLS, type EvolutionId, type SpellId } from "../data/spells";
import { RELICS } from "../data/relics";
import { PATH_NAMES, SYNERGIES, SYNERGY_BY_ID } from "../data/synergies";
import { isBossWave } from "./waves";
import type { RunState } from "./run";

export interface Challenge {
  id: string;
  /** onda em que entrou */
  wave: number;
  progress: number;
  goal?: number;
  /** última onda para completar ("até a W__") */
  deadline: number;
  done?: boolean;
  failed?: boolean;
  /** Evolution e Spell Master: a spell; Evolution: a evolução */
  spell?: string;
  evo?: string;
  /** Special Order: a relíquia */
  relic?: string;
  /** Synergy: a sinergia */
  synergy?: string;
  /** Daring: a sala amaldiçoada foi escolhida */
  armed?: boolean;
  /** Special Order comprada na loja: o que volta */
  refund?: number;
  /** o ouro pago ao completar */
  paid?: number;
}

/** O que a partida guarda dos desafios (`run.challenges` e vizinhos do Lua). */
export interface ChallengeRunState {
  challenges: Challenge[];
  /** ondas que já ofereceram (`challengeOffered`) */
  challengeOffered: number[];
  /** ofertas esperando vaga (`challengeWaiting`) */
  challengeWaiting: number;
  challengesDone: number;
  challengesOffered: number;
  /** trocas grátis na loja (`freeRerolls`) */
  freeRerolls: number;
  /** C-13: troca grátis na tela de nível: "next" vale na próxima tela; "active" na aberta agora */
  freeLevelUpReroll: "next" | "active" | null;
  /** C-04: a relíquia da Encomenda sai garantida na loja até ser comprada (`forcedShopRelic`) */
  forcedShopRelic: string | null;
  /** registro de partidas: cada desafio oferecido e como acabou (o painel esquece os encerrados) */
  challengeLog: ChallengeLogEntry[];
}

/** Uma linha do registro: os limiares vieram do combate do original, isto mostra se dão para cumprir aqui. */
export interface ChallengeLogEntry {
  id: string;
  wave: number;
  deadline: number;
  result: "open" | "done" | "failed";
  /** onda em que completou ou expirou */
  at?: number;
  progress?: number;
  goal?: number;
  /** Quick Duel: segundos até matar o chefe do prazo */
  bossSeconds?: number;
}

export function newChallengeState(): ChallengeRunState {
  return { challenges: [], challengeOffered: [], challengeWaiting: 0, challengesDone: 0, challengesOffered: 0,
    freeRerolls: 0, freeLevelUpReroll: null, forcedShopRelic: null, challengeLog: [] };
}

/** Checkpoints de antes do M20-13. */
export function ensureChallengeState(run: Partial<ChallengeRunState>): void {
  const d = newChallengeState();
  run.challenges ??= d.challenges;
  run.challengeOffered ??= d.challengeOffered;
  run.challengeWaiting ??= 0;
  run.challengesDone ??= 0;
  run.challengesOffered ??= 0;
  run.freeRerolls ??= 0;
  run.freeLevelUpReroll ??= null;
  run.forcedShopRelic ??= null;
  run.challengeLog ??= [];
}

/** `Ch.gold` */
export function challengeGold(size: ChallengeSize, wave: number): number {
  return CHALLENGE_SIZE[size] * (CHALLENGE_GOLD.base + CHALLENGE_GOLD.perWave * (wave || 1));
}

/** fim do bloco de 5 ondas */
export function blockEnd(w: number): number {
  return Math.ceil(w / 5) * 5;
}

/** a próxima onda de chefe a partir de `w` (inclusive), ou null */
export function nextBoss(w: number): number | null {
  for (let b = w; b <= w + 10; b++) if (isBossWave(b)) return b;
  return null;
}

/** O sorteio dos desafios (fluxo `challenges`): só inteiros, como `rng:int` do Lua. */
export interface ChallengeRng {
  int(a: number, b: number): number;
}

/** O que a oferta precisa do resto da partida. */
export interface ChallengeWorld {
  rng: ChallengeRng;
  /** relic_system.lua `draft(run, rng, 1)[1]`, no fluxo dos desafios */
  drawRelic(): string | undefined;
}

export type ChallengeNotice = { kind: "new" | "done" | "failed"; challenge: Challenge };

type Run = RunState & ChallengeRunState;

/** A montagem de cada desafio (`def.setup`): false quando não dá para oferecer agora. */
function setup(d: ChallengeDef, run: Run, w: ChallengeWorld, c: Challenge): boolean {
  switch (d.id) {
    case "untouchable_boss":
    case "fast_boss":
      return nextBoss(run.wave) !== null;
    case "evolution": {
      const opts: { spell: string; evo: string }[] = [];
      for (let i = 0; i < MAX_SPELLS; i++) {
        const slot = run.spells[i];
        if (!slot || slot.evolution) continue;
        for (const id of EVOLUTION_ORDER) if (EVOLUTIONS[id].spell === slot.id) opts.push({ spell: slot.id, evo: id });
      }
      if (!opts.length) return false;
      opts.sort((a, b) => (a.evo < b.evo ? -1 : a.evo > b.evo ? 1 : 0));
      const pick = opts[w.rng.int(1, opts.length) - 1];
      c.spell = pick.spell;
      c.evo = pick.evo;
      return true;
    }
    case "relic_order": {
      const id = w.drawRelic();
      if (!id) return false;
      c.relic = id;
      run.forcedShopRelic = id;
      return true;
    }
    case "spell_level": {
      const opts = run.spells.slice(0, MAX_SPELLS).filter((s) => s && s.level <= T.spellLevelMax);
      if (!opts.length) return false;
      const slot = opts[w.rng.int(1, opts.length) - 1];
      c.spell = slot.id;
      c.goal = slot.level + T.spellLevelGain;
      c.progress = slot.level;
      return true;
    }
    case "synergy": {
      const active = new Set(run.activeSynergies);
      const opts = SYNERGIES.filter((s) => !active.has(s.id)).map((s) => s.id);
      if (!opts.length) return false;
      c.synergy = opts[w.rng.int(1, opts.length) - 1];
      return true;
    }
    case "gold_hoard":
      c.goal = T.hoardBase + T.hoardPerWave * run.wave;
      c.progress = Math.min(run.gold, c.goal);
      return true;
  }
  return true;
}

function deadlineOf(d: ChallengeDef, wave: number): number {
  if (d.deadline === "boss") return nextBoss(wave) ?? blockEnd(wave);
  if (d.deadline === "plus8") return wave + CHALLENGE_PLUS_WAVES;
  return blockEnd(wave);
}

const isOpen = (c: Challenge) => !c.done && !c.failed;

export function openChallenges(run: ChallengeRunState): number {
  return run.challenges.filter(isOpen).length;
}

/**
 * Ouve a partida (challenges.lua `Ch.new`). Cada método é um evento do Lua; os avisos (novo, completo, expirado)
 * saem em `take()`. O que dura só uma onda (golpe levado, hora do chefe) fica aqui, fora do checkpoint, como lá.
 */
export class ChallengeTracker {
  private waveHit = false;
  private bossAt = new Map<object, number>();
  private notices: ChallengeNotice[] = [];

  constructor(readonly run: Run) {
    ensureChallengeState(run);
  }

  take(): ChallengeNotice[] {
    const n = this.notices;
    this.notices = [];
    return n;
  }

  private each(id: string, fn: (c: Challenge) => void): void {
    for (const c of this.run.challenges) if (c.id === id && isOpen(c)) fn(c);
  }

  /** `Ch:offer`: tira desafios do saco (sem repetir os que estão no painel) até um aceitar a montagem. */
  offer(wave: number, w: ChallengeWorld): Challenge | null {
    const run = this.run;
    const taken = new Set(run.challenges.map((c) => c.id));
    const pool = CHALLENGES.filter((d) => !taken.has(d.id));
    while (pool.length) {
      const d = pool.splice(w.rng.int(1, pool.length) - 1, 1)[0];
      const c: Challenge = { id: d.id, wave, progress: 0, deadline: 0 };
      if (d.goal !== undefined) c.goal = d.goal;
      if (setup(d, run, w, c)) {
        c.deadline = deadlineOf(d, wave);
        run.challenges.push(c);
        run.challengesOffered++;
        run.challengeLog.push({ id: c.id, wave, deadline: c.deadline, result: "open" });
        this.notices.push({ kind: "new", challenge: c });
        return c;
      }
    }
    return null;
  }

  /** `Ch:waveStart`: os completos e expirados saem do painel; as ondas de oferta trazem um novo. */
  waveStart(wave: number, w: ChallengeWorld): void {
    const run = this.run;
    run.challenges = run.challenges.filter(isOpen);
    this.waveHit = false;
    if (CHALLENGE_OFFER_WAVES.includes(wave) && !run.challengeOffered.includes(wave)) {
      run.challengeOffered.push(wave);
      run.challengeWaiting++;
    }
    while (run.challengeWaiting > 0 && openChallenges(run) < CHALLENGE_MAX_OPEN) {
      run.challengeWaiting--;
      this.offer(wave, w);
    }
  }

  /** `player_hit` com dano > 0 */
  hit(amount: number): void {
    if (amount <= 0) return;
    this.waveHit = true;
    const wave = this.run.wave;
    this.each("untouchable_boss", (c) => {
      if (wave === c.deadline) this.fail(c);
    });
  }

  bossSpawned(key: object, elapsed: number): void {
    this.bossAt.set(key, elapsed);
  }

  /** `enemy_killed`. `technique`: o golpe final foi da técnica; `noReward`: invocado que não conta. */
  killed(k: { key: object; boss: boolean; champion: boolean; technique: boolean; noReward: boolean; elapsed: number }): void {
    const run = this.run;
    if (k.technique && !k.noReward) this.each("technique_kills", (c) => this.progress(c, c.progress + 1));
    if (k.champion) this.each("elites", (c) => this.progress(c, c.progress + 1));
    const t0 = k.boss ? this.bossAt.get(k.key) : undefined;
    if (t0 !== undefined) {
      const took = k.elapsed - t0;
      this.bossAt.delete(k.key);
      this.each("fast_boss", (c) => {
        if (run.wave !== c.deadline) return;
        const log = this.logOf(c);
        if (log) log.bossSeconds = Math.round(took * 10) / 10;
        if (took < T.fastBossSeconds) this.complete(c);
      });
    }
    this.gold();
  }

  /** `wave_complete`. `hastened`: a onda foi apressada; `hpFrac`: vida no fim. */
  waveComplete(wave: number, o: { hastened: boolean; hpFrac: number }): void {
    const run = this.run;
    this.each("untouchable_boss", (c) => {
      if (wave === c.deadline && !this.waveHit) this.complete(c);
    });
    this.each("clean_wave", (c) => {
      if (!this.waveHit) this.complete(c);
    });
    this.each("hasten_streak", (c) => this.progress(c, o.hastened ? c.progress + 1 : 0));
    this.each("healthy_streak", (c) => this.progress(c, o.hpFrac > T.healthyFrac ? c.progress + 1 : 0));
    this.each("cursed", (c) => {
      if (c.armed) this.progress(c, c.progress + 1);
    });
    this.gold();
    this.checkLevels();
    // prazos (a maldição já em curso pode terminar a segunda onda)
    for (const c of run.challenges) {
      if (isOpen(c) && wave >= c.deadline && !(c.id === "cursed" && c.armed)) this.fail(c);
    }
  }

  spellEvolved(evoId: string): void {
    this.each("evolution", (c) => {
      if (c.evo === evoId) this.complete(c);
    });
  }

  synergyActivated(id: string): void {
    this.each("synergy", (c) => {
      if (c.synergy === id) this.complete(c);
    });
  }

  /** `shop_purchase` de uma relíquia: a Encomenda devolve 80% do preço */
  relicPurchased(id: string, cost: number): void {
    this.each("relic_order", (c) => {
      if (c.relic === id) {
        c.refund = Math.floor(cost * CHALLENGE_REFUND);
        this.complete(c);
      }
    });
    this.checkLevels();
  }

  /** `relic_acquired` (fora da loja: santuário, chefe, intervalo) */
  relicAcquired(id: string): void {
    this.each("relic_order", (c) => {
      if (c.relic === id) this.complete(c);
    });
  }

  /** `map_choice` */
  mapChoice(node: string): void {
    if (node === "cursed_room") this.each("cursed", (c) => (c.armed = true));
  }

  /** `shop_closed`, `upgrade_chosen`, `shop_purchase`: o nível das spells e o ouro guardado */
  checkLevels(): void {
    const run = this.run;
    this.each("spell_level", (c) => {
      for (let i = 0; i < MAX_SPELLS; i++) {
        const s = run.spells[i];
        if (s && s.id === c.spell) this.progress(c, Math.min(c.goal ?? 0, s.level));
      }
    });
    this.gold();
  }

  /** Thrift olha o ouro guardado agora */
  gold(): void {
    this.each("gold_hoard", (c) => this.progress(c, Math.min(this.run.gold, c.goal ?? 0)));
  }

  /** a linha do registro deste desafio (o último oferecido com o mesmo id) */
  private logOf(c: Challenge): ChallengeLogEntry | undefined {
    for (let i = this.run.challengeLog.length - 1; i >= 0; i--) {
      const e = this.run.challengeLog[i];
      if (e.id === c.id && e.wave === c.wave) return e;
    }
    return undefined;
  }

  private close(c: Challenge, result: "done" | "failed"): void {
    const log = this.logOf(c);
    if (!log) return;
    log.result = result;
    log.at = this.run.wave;
    if (c.goal !== undefined) {
      log.progress = c.progress;
      log.goal = c.goal;
    }
  }

  private progress(c: Challenge, n: number): void {
    c.progress = n;
    if (c.goal !== undefined && n >= c.goal) this.complete(c);
  }

  private complete(c: Challenge): void {
    if (!isOpen(c)) return;
    const run = this.run;
    c.done = true;
    const d = CHALLENGE_BY_ID[c.id];
    if (d.reward === "shop_reroll") run.freeRerolls++;
    else if (d.reward === "levelup_reroll") run.freeLevelUpReroll = "next";
    else {
      const gold = (d.reward === "refund" && c.refund) || challengeGold(d.size, run.wave);
      run.gold += gold;
      run.statistics.goldEarned += gold;
      c.paid = gold;
    }
    if (c.id === "relic_order") run.forcedShopRelic = null;
    run.challengesDone++;
    this.close(c, "done");
    this.notices.push({ kind: "done", challenge: c });
  }

  private fail(c: Challenge): void {
    if (!isOpen(c)) return;
    c.failed = true;
    if (c.id === "relic_order") this.run.forcedShopRelic = null;
    this.close(c, "failed");
    this.notices.push({ kind: "failed", challenge: c });
  }
}

// ---------------------------------------------------------------- apresentação (`Ch.text`, `Ch.rewardText`, `Ch.view`)

export function challengeName(c: Challenge): string {
  return CHALLENGE_BY_ID[c.id]?.name ?? c.id;
}

export function challengeText(c: Challenge, run: Pick<RunState, "tags">): string {
  switch (c.id) {
    case "untouchable_boss": return "Clear the next boss wave without taking damage.";
    case "clean_wave": return "Clear a wave without taking damage.";
    case "evolution": {
      const e = EVOLUTIONS[c.evo as EvolutionId];
      const s = SPELLS[c.spell as SpellId].name;
      const req = e.requires.map((r) => RELICS[r]?.name ?? r).join(" or ");
      return `Evolve ${s} into ${e.name} (recipe: ${s} Lv 5 + ${req}).`;
    }
    case "relic_order": return `Get the relic ${RELICS[c.relic!]?.name ?? c.relic}. It is guaranteed in the next shop.`;
    case "technique_kills": return `Kill ${c.goal} enemies with the technique.`;
    case "elites": return `Defeat ${c.goal} Champions.`;
    case "fast_boss": return `Defeat the next boss in under ${T.fastBossSeconds} s.`;
    case "hasten_streak": return `Hasten ${c.goal} waves in a row.`;
    case "spell_level": return `Bring ${SPELLS[c.spell as SpellId].name} to Lv ${c.goal}.`;
    case "synergy": {
      const s = SYNERGY_BY_ID[c.synergy!];
      const need = Object.entries(s.requires)
        .map(([tag, n]) => `${PATH_NAMES[tag] ?? tag} ${Math.min(n, run.tags[tag] ?? 0)}/${n}`)
        .sort();
      return `Activate the synergy ${s.name} (${need.join(", ")}).`;
    }
    case "cursed": return `Pick a Cursed Room and survive both waves.`;
    case "healthy_streak": return `Clear ${c.goal} waves in a row with more than ${Math.round(T.healthyFrac * 100)}% HP.`;
    case "gold_hoard": return `Hold ${c.goal} gold.`;
  }
  return "";
}

export function challengeReward(c: Challenge, wave: number): string {
  const d = CHALLENGE_BY_ID[c.id];
  if (d.reward === "shop_reroll") return "free reroll (shop)";
  if (d.reward === "levelup_reroll") return "free reroll (level-up)";
  if (d.reward === "refund") return c.paid ? `+${c.paid} gold` : `${Math.round(CHALLENGE_REFUND * 100)}% of the price back`;
  return `+${c.paid ?? challengeGold(d.size, wave)} gold`;
}

export interface ChallengeRow {
  id: string;
  name: string;
  text: string;
  reward: string;
  progress?: number;
  goal?: number;
  done: boolean;
  failed: boolean;
  /** "by W8" ou "EXPIRED" */
  deadline: string;
}

/** As linhas que o HUD e a tela I mostram (`Ch.view`). */
export function challengeRows(run: RunState & Partial<ChallengeRunState>): ChallengeRow[] {
  return (run.challenges ?? []).map((c) => ({
    id: c.id, name: challengeName(c), text: challengeText(c, run), reward: challengeReward(c, run.wave),
    progress: c.goal !== undefined ? c.progress : undefined, goal: c.goal,
    done: !!c.done, failed: !!c.failed, deadline: c.failed ? "EXPIRED" : `by W${c.deadline}`,
  }));
}
