// M21-11: maestria por herói (lógica pura). Os pontos ficam no estado de conquistas (`mastery`); a escolha da
// alternativa fica lá também (`loadouts`), e a partida guarda a dela em `RunState.loadout`.
import { HEROES, type HeroDef } from "../data/heroes";
import { ALT_AUTOS, ALT_TECHNIQUE, MASTERY } from "../data/mastery";
import { TECHNIQUES } from "../data/techniques";

/** O que o jogador escolheu para o herói: `true` = a alternativa da maestria. */
export interface Loadout {
  auto?: boolean;
  technique?: boolean;
}

export interface MasteryInfo {
  level: number;
  maxLevel: number;
  points: number;
  /** pontos do nível atual e do próximo (iguais no nível máximo) */
  from: number;
  next: number;
}

export function masteryLevel(points: number): number {
  let lv = 1;
  MASTERY.levels.forEach((need, i) => { if (points >= need) lv = i + 1; });
  return lv;
}

export function masteryInfo(points: number): MasteryInfo {
  const level = masteryLevel(points);
  const maxLevel = MASTERY.levels.length;
  const from = MASTERY.levels[level - 1];
  return { level, maxLevel, points, from, next: level < maxLevel ? MASTERY.levels[level] : from };
}

/** Pontos de uma onda vencida (os chefes derrotados nela somam à parte). */
export function wavePoints(bossesKilled: number): number {
  return MASTERY.waveClear + MASTERY.bossKill * bossesKilled;
}

/** O que o nível deixa usar; `all` (TUNING.unlockAll) abre tudo. */
export function masteryOpen(points: number, all = false): { auto: boolean; technique: boolean } {
  const lv = masteryLevel(points);
  return { auto: all || lv >= MASTERY.autoLevel, technique: all || lv >= MASTERY.techniqueLevel };
}

/** Tira da escolha o que ainda está trancado (ou não existe para o herói). */
export function allowedLoadout(heroId: string, pick: Loadout | undefined, points: number, all = false): Loadout {
  const open = masteryOpen(points, all);
  const out: Loadout = {};
  if (pick?.auto && open.auto && ALT_AUTOS[heroId]) out.auto = true;
  if (pick?.technique && open.technique && TECHNIQUES[ALT_TECHNIQUE[heroId]]) out.technique = true;
  return out;
}

/** A id da técnica que a partida usa. */
export function loadoutTechnique(heroId: string, loadout: Loadout | undefined): string {
  const alt = ALT_TECHNIQUE[heroId];
  return loadout?.technique && alt && TECHNIQUES[alt] ? alt : HEROES[heroId].technique.id;
}

const cache = new Map<string, HeroDef>();

/**
 * O herói com as alternativas escolhidas: o ataque básico e a técnica trocados; o resto (atributos, estilo,
 * passivas) igual. Sem alternativa devolve o próprio `HEROES[id]`.
 */
export function loadoutHero(heroId: string, loadout: Loadout | undefined): HeroDef {
  const base = HEROES[heroId];
  const auto = loadout?.auto === true && !!ALT_AUTOS[heroId];
  const tech = loadoutTechnique(heroId, loadout);
  if (!auto && tech === base.technique.id) return base;
  const key = `${heroId}/${auto ? 1 : 0}/${tech}`;
  let h = cache.get(key);
  if (!h) {
    const t = TECHNIQUES[tech];
    h = {
      ...base,
      auto: auto ? { ...base.auto, ...ALT_AUTOS[heroId].auto } : base.auto,
      technique: { id: t.id, name: t.name, text: t.text, kind: t.kind, cooldown: t.cooldown, school: t.school },
    };
    cache.set(key, h);
  }
  return h;
}

/**
 * Indicador de dano por segundo do ataque básico num alvo, com o veneno ou a queimadura de um acúmulo. Só para
 * comparar a alternativa com o original (não é o dano real, que depende de estilo, melhorias e alvos).
 */
export function autoDpsProxy(a: { rate: number; damage: number; status?: { kind: string; power: number; duration: number } }): number {
  const dot = a.status && (a.status.kind === "burn" || a.status.kind === "poison") ? a.status.power * a.status.duration : 0;
  return a.rate * a.damage * (1 + dot);
}
