// Ícones 2D da interface, vindos do Dungeon Reign (D19; M14-10 ampliou para tudo além das relíquias). Os arquivos são
// copiados por `npm run icons` para `src/assets/{relics,ui,upgrades}` e entram no build (PNG pequeno vira base64).
// Nomes como em asset_manifest.lua: `spell_*` (três com nome curto), `evo_<evolução>`, `tech_<técnica>`, `up_<melhoria>`
// (pasta `upgrades`) e os gerais (`coin`, `heart`, `xp`, `sword`, `skull`, `relic`...).
import { TECHNIQUES } from "../data/techniques";
const load = (files: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(files).map(([path, url]) => [path.slice(path.lastIndexOf("/") + 1, -4), url]));

const RELIC = load(import.meta.glob("../assets/relics/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>);
const UI = load(import.meta.glob("../assets/ui/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>);
const UPGRADE = load(import.meta.glob("../assets/upgrades/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>);

/** asset_manifest.lua: as spells com nome de arquivo diferente do id. */
const SPELL_FILE: Record<string, string> = {
  arcane_bolt: "spell_arcane", chain_lightning: "spell_lightning", healing_field: "spell_healing",
};

export const relicIconUrl = (id: string): string | undefined => RELIC[id];
export const spellIconUrl = (id: string): string | undefined => UI[SPELL_FILE[id] ?? `spell_${id}`];
export const evolutionIconUrl = (id: string): string | undefined => UI[`evo_${id}`];
/** a alternativa da maestria (M21-11) usa o ícone da técnica original */
export const techniqueIconUrl = (id: string): string | undefined => UI[`tech_${TECHNIQUES[id]?.base ?? id}`];
export const upgradeIconUrl = (id: string): string | undefined => UPGRADE[id];
export const uiIconUrl = (name: string): string | undefined => UI[name];

/** `<img>` em pixel art ampliado; vazio se não houver o ícone. */
export function iconHtml(url: string | undefined, size: number, cls = "ricon"): string {
  return url ? `<img class="${cls}" src="${url}" width="${size}" height="${size}" alt="" draggable="false">` : "";
}

/** O ícone de um espaço de spell: a forma evoluída quando houver, senão a spell (ou a técnica). */
export function slotIconUrl(id: string, evolution?: string | null): string | undefined {
  return (evolution && evolutionIconUrl(evolution)) || spellIconUrl(id) || techniqueIconUrl(id);
}

/**
 * Modificador de spell (o original não tem ícone próprio): o ícone da spell com o selo de modificador no canto
 * (`.mod-badge` no CSS), para ler "isto mexe na Arcane Bolt".
 */
export function modifierIconHtml(spellId: string, size: number): string {
  const img = iconHtml(spellIconUrl(spellId) ?? techniqueIconUrl(spellId), size, "ricon big");
  return img ? `<span class="mod-icon" style="--s:${size}px">${img}<i class="mod-badge">+</i></span>` : "";
}
