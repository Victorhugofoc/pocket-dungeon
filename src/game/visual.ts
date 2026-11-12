// Modo visual dos personagens (comparação de direção de arte).
// "sprites": folhas de pixel art do Dungeon Reign em pé no cenário 3D, com render em baixa resolução.
// "blocos": modelos de blocos feitos por código, remodelados para lembrar cada personagem.
export type VisualMode = "sprites" | "blocos";

const KEY = "dungeon-reign-rpg.visual";

function load(): VisualMode {
  try {
    return window.localStorage.getItem(KEY) === "blocos" ? "blocos" : "sprites";
  } catch {
    return "sprites";
  }
}

export const visual = { mode: load() };

export function setVisualMode(mode: VisualMode): void {
  visual.mode = mode;
  try {
    window.localStorage.setItem(KEY, mode);
  } catch {
    /* sem armazenamento */
  }
}

export const VISUAL_LABEL: Record<VisualMode, string> = {
  sprites: "Sprites do Dungeon Reign",
  blocos: "Blocos fiéis",
};
