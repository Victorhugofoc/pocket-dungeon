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

/** M14-09 (etapa 4): o aro de cada espaço de spell no HUD, na cor da escola (as mesmas do `SPELL_COLOR` do jogo). */
export const SCHOOL_COLOR: Record<string, string> = {
  fire: "#ff7a1a", ice: "#9fdcff", lightning: "#fff29a", arcane: "#c28cff", healing: "#7dff9a", blade: "#dfe8ff",
  poison: "#7be04a", wind: "#cfe8ff", rune: "#a58cff", light: "#fff6d8", earth: "#ffa040",
};
