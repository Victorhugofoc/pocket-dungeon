// As Depths (data/depths.lua do Dungeon Reign, D-221 a D-228): 5 níveis acima da Hard, por herói. Cada nível soma
// uma mutação, sobe a pontuação e, na primeira vitória, paga Marcas (gastas nas vantagens da parte 2 do M13-02).
// Números e textos iguais aos de lá (teste de paridade); a lógica está em core/depths.ts.
import type { AffixId } from "./affixes";

export const DEPTHS_MAX = 5;
/** D-225: pontuação ×(1 + 0,2 × nível); sem ouro a mais */
export const DEPTHS_SCORE_PER_LEVEL = 0.2;

export type MutationId = "loose_affixes" | "pricey_shop" | "wounds" | "early_fury" | "marked_bosses";

export interface MutationDef {
  id: MutationId;
  name: string;
  text: string;
  /** Loose Affixes: a partir da onda, a chance de um inimigo comum vir com 1 afixo */
  fromWave?: number;
  chance?: number;
  /** Pricey Shop */
  priceMult?: number;
  fewerOffers?: number;
  /** Wounds: a cura recebida */
  healMult?: number;
  /** Early Fury: o limiar da fúria sobe tanto (30% → 50%) e o chefe furioso fica mais rápido */
  enrageBonus?: number;
  enragedSpeed?: number;
  /** Marked Bosses: afixos de cada chefe, sem os que deixariam a luta sem fim (D-250) */
  affixes?: number;
  exclude?: Partial<Record<AffixId, boolean>>;
}

/** D-223: a mutação N vale da Depths N para cima. */
export const MUTATIONS: MutationDef[] = [
  { id: "loose_affixes", name: "Loose Affixes", fromWave: 5, chance: 0.10,
    text: "From Wave 5, common enemies have a 10% chance to come with 1 affix." },
  { id: "pricey_shop", name: "Pricey Shop", priceMult: 1.25, fewerOffers: 1,
    text: "Shop prices +25% and 1 item less." },
  { id: "wounds", name: "Wounds", healMult: 0.70,
    text: "Healing received -30%." },
  { id: "early_fury", name: "Early Fury", enrageBonus: 0.20, enragedSpeed: 1.10,
    text: "Bosses enrage at 50% HP (instead of 30%) and get 10% faster." },
  { id: "marked_bosses", name: "Marked Bosses", affixes: 1, exclude: { regenerating: true, shielded: true },
    text: "Every boss comes with 1 random affix." },
];

/** D-227 e D-294: a primeira vitória de um nível paga 4 + 2 × nível; repetir paga 1. */
export const FIRST_WIN_BONUS = 4;
export function marksFor(level: number, firstWin: boolean): number {
  return firstWin ? FIRST_WIN_BONUS + 2 * level : 1;
}

export type PerkId = "reroll" | "purse" | "greed" | "relic_pick" | "card_swap" | "full_shop" | "reserve_potion" | "relic_reroll" | "ban";

/** D-228: compras de uma vez, ligadas e desligadas no preparo (parte 2 do M13-02). */
export interface PerkDef {
  id: PerkId;
  name: string;
  cost: number;
  text: string;
  freeRerolls?: number;
  gold?: number;
  goldPct?: number;
  count?: number;
  rarity?: string;
  extraOffers?: number;
  below?: number;
  heal?: number;
  extraBans?: number;
}

export const PERKS: PerkDef[] = [
  { id: "reroll", name: "Extra Reroll", cost: 3, freeRerolls: 1, text: "Start the run with 1 free shop reroll." },
  { id: "purse", name: "Full Purse", cost: 3, gold: 50, text: "Start the run with 50 gold." },
  { id: "greed", name: "Greed", cost: 4, goldPct: 0.05, text: "+5% gold." },
  { id: "relic_pick", name: "Starting Relic", cost: 5, count: 3, rarity: "uncommon", text: "At the start of the run, pick 1 of 3 common relics." },
  { id: "card_swap", name: "Card Swap", cost: 3, text: "Once every 5 waves (W1-5, W6-10...), you can reroll the map cards." },
  { id: "full_shop", name: "Stocked Shop", cost: 4, extraOffers: 1, text: "The first shop of every 5-wave block has +1 item." },
  { id: "reserve_potion", name: "Reserve Potion", cost: 5, below: 0.20, heal: 0.30, text: "Once per run, dropping below 20% HP heals 30%." },
  { id: "relic_reroll", name: "Relic Reroll", cost: 4, text: "Once every 5 waves (W1-5, W6-10...), you can reroll the relics of one choice." },
  { id: "ban", name: "Extra Ban", cost: 4, extraBans: 1, text: "+1 Ban during the run (3 instead of 2), used on the relic choice." },
];

/** D-226: skins do herói ganhas nas Depths (cosméticos, fase 2) */
export const DEPTHS_SKINS = { abyssal: 3, ascended: 5 } as const;
