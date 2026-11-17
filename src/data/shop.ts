// Magic Shop (M7-03): números de dungeon-idle/src/data/shop.lua (§§72-77), textos do en.lua de lá (D1).

/** Até 3 ofertas por visita, sorteadas uma vez (§72); a relíquia é a 4ª. */
export const SHOP_OFFERS = 3;

/** `S.level`: o nível da loja sobe a cada 5 ondas. */
export function shopLevel(wave: number): number {
  return 1 + Math.floor((wave - 1) / 5);
}

/** §75: só o nível da loja e as compras do mesmo item sobem o preço (D-183; `totalGrowth` não entra mais). */
export const SHOP_GENERAL = { levelGrowth: 1.45, sameTypeGrowth: 1.32, totalGrowth: 1.22 } as const;

export type GeneralKind = "sharpened_weapon" | "arcane_tome" | "vitality";

export interface GeneralItem {
  id: GeneralKind;
  name: string;
  baseCost: number;
  text: string;
  damageFlat?: number;
  spellPowerFlat?: number;
  maxHpFlat?: number;
}

export const SHOP_ITEMS: Readonly<Record<GeneralKind, GeneralItem>> = {
  sharpened_weapon: { id: "sharpened_weapon", name: "SHARPENED WEAPON", baseCost: 35, damageFlat: 2, text: "+2 Base Damage (auto attack)" },
  arcane_tome: { id: "arcane_tome", name: "ARCANE TOME", baseCost: 35, spellPowerFlat: 2, text: "+2 Spell Power (spell base damage)" },
  vitality: { id: "vitality", name: "VITALITY", baseCost: 40, maxHpFlat: 12, text: "+12 Max HP and full heal" },
};

/** §76: spell nova e melhoria (`perLevel` 44: cada nível comprimido vale dois do canônico, D-117). */
export const SHOP_SPELL = { acquireBase: 50, upgradeBase: 50, perLevel: 44, levelGrowth: 1.25, totalGrowth: 1.12 } as const;
/** §77: modificador de spell. */
export const SHOP_MODIFIER = { base: 65, perLevel: 18, valueFactor: 45, levelGrowth: 1.18, purchaseGrowth: 1.08 } as const;
/** D-145: a relíquia da 4ª oferta (preços provisórios lá também). */
export const SHOP_RELIC = { cost: { uncommon: 120, rare: 200, epic: 320 }, perLevel: 0.25, perPurchase: 1.15 } as const;
/** D-146: trocar as ofertas custa base × nível da loja, dobrando a cada troca na mesma visita. */
export const SHOP_REROLL = { base: 25, growth: 2 } as const;

/** D-111: categoria sorteada por igual, depois um item dentro dela. */
export const SHOP_CATEGORIES = [
  "spell_upgrade", "spell_modifier", "new_spell", "sharpened_weapon", "vitality", "arcane_tome",
] as const;
export type ShopCategory = (typeof SHOP_CATEGORIES)[number];

/** Motivos de oferta inválida ou compra recusada, no inglês de lá. */
export const SHOP_REASONS = {
  bought: "bought",
  alreadyBought: "already bought",
  alreadyEquipped: "already equipped",
  noSlot: "no free slot",
  maxLevel: "max level",
  notEquipped: "spell not equipped",
  noGold: "not enough gold",
  noOffer: "no offer",
} as const;
