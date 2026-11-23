// Afixos de campeão (M9-06), como `src/data/affixes.lua` do Dungeon Reign. Nome e texto em inglês (`en.lua`).
// Distâncias em px do original; o jogo converte por `TUNING.enemy.pxToUnit`. Cores em 0..1 como lá.

export type AffixId =
  | "vampiric" | "swift" | "armored" | "explosive" | "frozen"
  | "regenerating" | "shielded" | "summoner" | "shadow" | "venomous";

export interface AffixDef {
  id: AffixId;
  name: string;
  text: string;
  color: readonly [number, number, number];
  /** vampiric: cada golpe no herói cura esta fração da vida máxima */
  healPct?: number;
  /** swift */
  speedMult?: number;
  cooldownMult?: number;
  /** armored */
  damageTakenMult?: number;
  /** explosive: raio (px), aviso (s) e dano (× o dano dele) */
  radius?: number;
  warning?: number;
  damageMult?: number;
  /** frozen: o herói anda a `chillMult` da velocidade por `chillTime` s */
  chillMult?: number;
  chillTime?: number;
  /** regenerating: fração da vida por segundo depois de `regenDelay` s sem dano */
  regenPct?: number;
  regenDelay?: number;
  /** shielded: bolha de `shieldPct` da vida; volta inteira depois de `shieldDelay` s sem dano */
  shieldPct?: number;
  shieldDelay?: number;
  /** summoner, shadow, venomous: intervalo (s) */
  interval?: number;
  /** summoner */
  count?: number;
  minion?: string;
  /** shadow: distância do herói (px) */
  distance?: number;
  /** venomous: poça de `radius` px por `time` s com `dpsMult` × o dano dele por segundo */
  time?: number;
  dpsMult?: number;
}

const list: AffixDef[] = [
  { id: "vampiric", name: "Vampiric", color: [0.95, 0.2, 0.3], healPct: 0.06,
    text: "Each hit on the hero heals the Champion for 6% of its max HP." },
  { id: "swift", name: "Swift", color: [0.55, 0.95, 0.85], speedMult: 1.35, cooldownMult: 0.75,
    text: "+35% speed and 25% faster attacks." },
  { id: "armored", name: "Armored", color: [0.75, 0.8, 0.9], damageTakenMult: 0.65,
    text: "Takes 35% less damage." },
  { id: "explosive", name: "Explosive", color: [1.0, 0.55, 0.15], radius: 84, warning: 0.9, damageMult: 1.6,
    text: "On death it explodes after 0.9 s (radius 84, 160% of its damage)." },
  { id: "frozen", name: "Frozen", color: [0.6, 0.9, 1], chillMult: 0.75, chillTime: 1.5,
    text: "Its hits slow the hero by 25% for 1.5 s." },
  { id: "regenerating", name: "Regenerating", color: [0.45, 1, 0.55], regenPct: 0.03, regenDelay: 2.0,
    text: "Regains 3% HP per second after 2 s without taking damage." },
  { id: "shielded", name: "Arcane Shield", color: [0.75, 0.55, 1], shieldPct: 0.30, shieldDelay: 4.0,
    text: "A bubble that absorbs 30% of its HP; fully restored after 4 s without taking damage." },
  { id: "summoner", name: "Summoner", color: [0.7, 0.45, 0.9], interval: 7.0, count: 2, minion: "goblin",
    text: "Calls 2 goblins (no reward) every 7 s." },
  { id: "shadow", name: "Shadow", color: [0.55, 0.4, 0.75], interval: 6.0, distance: 110,
    text: "Teleports next to the hero every 6 s." },
  { id: "venomous", name: "Venomous", color: [0.5, 0.95, 0.35], interval: 0.6, radius: 22, time: 2.5, dpsMult: 0.25,
    text: "Leaves a poison trail behind." },
];

export const AFFIXES: Record<AffixId, AffixDef> = Object.fromEntries(list.map((a) => [a.id, a])) as Record<AffixId, AffixDef>;
/** ordem do sorteio (a de lá) */
export const AFFIX_ORDER: readonly AffixId[] = list.map((a) => a.id);
/** pares que nunca saem juntos */
export const AFFIX_FORBIDDEN: readonly (readonly [AffixId, AffixId])[] = [["armored", "shielded"], ["regenerating", "shielded"]];
/** a partir da onda 12, um segundo afixo com esta chance */
export const AFFIX_SECOND = { fromWave: 12, chance: 0.5 } as const;
/** cada afixo soma isto ao multiplicador de ouro e XP do campeão */
export const AFFIX_REWARD_PER = 0.25;
/** poça do Venomous: tique de dano (enemy_attacks.lua `hazard`, 0,5 s por padrão) */
export const AFFIX_VENOM_TICK = 0.5;
/** Summoner: os goblins nascem a esta distância (px) em volta dele */
export const AFFIX_SUMMON_RING = 30;
