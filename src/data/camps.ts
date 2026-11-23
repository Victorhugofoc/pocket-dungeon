// M9-07: composição dos grupos (camada de ritmo, decisão D18). O original sorteia um inimigo por vez, cada um
// independente (waves.lua `WEIGHT`); aqui, desde a M21-13, eles nascem em grupos, e cada grupo tem uma forma.
// Cada vaga do grupo é sorteada com os pesos de lá (estágio da onda e viés da sala), só entre os inimigos do papel dela.
// Uma forma só sai quando todos os papéis dela têm alguém no sorteio da onda; o `mixed` (o sorteio de antes) sempre sai.

export type CampRole = "front" | "back" | "elite" | "escort" | "swarm" | "any";
/** onde a vaga nasce dentro do grupo: `front` mais perto do herói, `back` atrás da linha */
export type CampRank = "front" | "mid" | "back";

/** quem pode ocupar cada papel (`any` = qualquer um da onda) */
export const CAMP_ROLES: Readonly<Record<Exclude<CampRole, "any">, readonly string[]>> = {
  front: ["goblin", "orc", "shieldbearer", "plaguebearer", "splitter", "warden", "berserker"],
  back: ["archer", "spellcaster", "hexer", "bombardier", "summoner"],
  elite: ["orc", "shieldbearer", "berserker", "warden", "summoner", "splitter"],
  escort: ["goblin", "swarm", "assassin", "leaper"],
  swarm: ["swarm"],
};

export interface CampSlot { role: CampRole; rank: CampRank }
export interface CampDef {
  id: string;
  weight: number;
  slots: readonly CampSlot[];
}

const s = (role: CampRole, rank: CampRank = "mid"): CampSlot => ({ role, rank });

export const CAMPS: readonly CampDef[] = [
  /** linha de frente segurando, atirador atrás */
  { id: "line", weight: 3, slots: [s("front", "front"), s("front", "front"), s("back", "back")] },
  /** elite no meio, escolta rápida à frente; o campeão da onda puxa esta forma */
  { id: "escort", weight: 2, slots: [s("elite"), s("escort", "front"), s("escort", "front")] },
  /** ninho de atiradores com um guarda */
  { id: "nest", weight: 1, slots: [s("front", "front"), s("back", "back"), s("back", "back")] },
  /** enxame: muitos e frágeis */
  { id: "swarm", weight: 1.2, slots: [s("swarm", "front"), s("swarm", "front"), s("swarm"), s("swarm")] },
  /** o sorteio independente de antes, para não ficar previsível */
  { id: "mixed", weight: 1.5, slots: [s("any"), s("any"), s("any")] },
];

/** forma usada quando o grupo traz o campeão da onda (ele vai na 1ª vaga) */
export const CHAMPION_CAMP = "escort";

/** m do centro do grupo: `front` mais perto do herói, `back` mais longe */
export const CAMP_RANK_OFFSET: Readonly<Record<CampRank, number>> = { front: -1, mid: 0, back: 2.5 };
