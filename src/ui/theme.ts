/**
 * M14-09: as cores da interface num lugar só. Iguais às variáveis `--r-*` e `--t-*` do `style.css`;
 * o TypeScript usa estas quando a cor vai num `style="--cc:..."` montado no HTML.
 */
import type { RelicRarity } from "../data/relics";
import type { UpgradeTier } from "../core/levelup";

export const RARITY_COLOR: Record<RelicRarity, string> = {
  uncommon: "#6fd36a", rare: "#4fa3ff", epic: "#b36bff", boss: "#ff8a3d", evolved: "#ffd34d",
};

/** Raridade das melhorias de nível: a comum é a mesma cinza das cartas sem raridade. */
export const TIER_COLOR: Record<UpgradeTier, string> = { common: "#c9c4b8", rare: RARITY_COLOR.rare, epic: RARITY_COLOR.epic };
