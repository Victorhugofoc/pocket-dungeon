// Passiva da Frostine (porta de dungeon-idle src/combat/frost.lua e da contagem do pingente em auto_attack.lua).
// Lógica pura sobre um alvo qualquer; o jogo guarda o estado no inimigo e chama estas funções a cada acerto de gelo.
import { FROST } from "../data/techniques";

export interface FrostTarget {
  isBoss: boolean;
  isChampion: boolean;
  /** congelado (atordoado) até este instante, em segundos de jogo */
  frozenUntil: number;
  frostStacks: number;
  /** instante a partir do qual o próximo acúmulo conta */
  frostNext: number;
  brittleUntil: number;
  chillN: number;
  chillT: number;
}

export function newFrostTarget(isBoss: boolean, isChampion: boolean): FrostTarget {
  return { isBoss, isChampion, frozenUntil: 0, frostStacks: 0, frostNext: 0, brittleUntil: 0, chillN: 0, chillT: -1e9 };
}

export interface FrostHit {
  /** o acerto é gelo da Frostine (tiro, técnica, spell de gelo) */
  ice: boolean;
  /** acúmulos fixos deste acerto (pingente); sem isso soma 1 respeitando o intervalo */
  stacks?: number;
}

export interface FrostResult {
  amount: number;
  /** estilhaçou: o alvo estava congelado e perdeu o gelo */
  shatter: boolean;
  /** frio profundo: congelar o alvo por `FROST.chillFreeze` depois deste acerto (se ele sobreviver) */
  deepChill: boolean;
  /** o alvo acabou de ficar Quebradiço */
  brittle: boolean;
}

const canStack = (t: FrostTarget): boolean => t.isBoss || t.isChampion;

/** Ajusta o dano de um acerto e o estado de gelo do alvo. Chamar antes da armadura, como no original. */
export function frostModify(t: FrostTarget, amount: number, hit: FrostHit, now: number): FrostResult {
  const F = FROST;
  const r: FrostResult = { amount, shatter: false, deepChill: false, brittle: false };
  if (hit.ice) {
    if (now < t.frozenUntil && !t.isBoss) {
      r.amount *= 1 + F.shatterMult;
      t.frozenUntil = 0;
      r.shatter = true;
    }
    if (!canStack(t) && !r.shatter) {
      if (now - t.chillT > F.chillWindow) {
        t.chillN = 0;
        t.chillT = now;
      }
      t.chillN++;
      if (t.chillN >= F.chillHits) {
        t.chillN = 0;
        t.chillT = -1e9;
        r.deepChill = true;
      }
    }
    if (canStack(t) && !(now < t.brittleUntil)) {
      if (hit.stacks !== undefined || now >= t.frostNext) {
        t.frostStacks += hit.stacks ?? 1;
        if (hit.stacks === undefined) t.frostNext = now + F.stackGap;
        if (t.frostStacks >= F.stacks) {
          t.frostStacks = 0;
          t.brittleUntil = now + F.brittleTime;
          r.brittle = true;
        }
      }
    }
  }
  // Quebradiço vale para qualquer dano, não só gelo
  if (now < t.brittleUntil) r.amount *= 1 + F.brittleMult;
  return r;
}

/** Contagem do pingente: tiros seguidos no mesmo alvo. */
export class IcicleCounter {
  private target: unknown = null;
  private hits = 0;
  /** o próximo tiro sai como pingente */
  ready = false;

  /** Chamar quando um tiro da Frostine acerta o primeiro alvo. `icicle` = esse tiro era pingente.
   * `sooner` = tiros a menos para o pingente (o Double Shot do original), com mínimo de 2. */
  onHit(target: unknown, icicle: boolean, sooner = 0): void {
    if (icicle) {
      this.target = target;
      this.hits = 0;
      return;
    }
    if (this.target === target) this.hits++;
    else {
      this.target = target;
      this.hits = 1;
      this.ready = false;
    }
    const every = Math.max(2, FROST.icicleEvery - sooner);
    if (this.hits >= every - 1) this.ready = true;
  }

  /** Disparar: devolve se este tiro é pingente e consome a carga. */
  take(): boolean {
    const r = this.ready;
    this.ready = false;
    return r;
  }
}
