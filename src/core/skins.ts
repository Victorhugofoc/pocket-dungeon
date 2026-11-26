// Skins dos heróis (core/skins.lua): o que está aberto e o que falta. Lógica pura.
import { SKINS, type SkinDef } from "../data/skins";

const MEDAL_NAME = ["", "Easy", "Normal", "Hard"];

/** `Skins.unlocked`: medalha do herói (0 a 3) e melhor nível das Depths vencido. */
export function skinUnlocked(skin: SkinDef, medal: number, depthsBest: number): boolean {
  if (skin.depths) return depthsBest >= skin.depths;
  if (skin.medal) return medal >= skin.medal;
  return skin.id === "default";
}

/** `Skins.lockText`: o que abre a skin. */
export function skinLockText(skin: SkinDef): string {
  if (skin.depths) return `Win Depths ${skin.depths}`;
  if (skin.medal) return `Win on ${MEDAL_NAME[skin.medal]}`;
  return "";
}

/** As skins de um herói com o estado de cada uma. */
export function heroSkins(medal: number, depthsBest: number): { skin: SkinDef; open: boolean }[] {
  return SKINS.map((skin) => ({ skin, open: skinUnlocked(skin, medal, depthsBest) }));
}
