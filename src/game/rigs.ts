// Constrói o modelo de cada personagem.
import { TUNING } from "../data/tuning";
import { buildChar, hasChar } from "./chars";
import { buildRig, type Rig } from "./models";

export function characterRig(id: string, _kind: "hero" | "enemy" | "boss", champion = false): Rig {
  const champ = champion ? TUNING.enemy.champion.scale : 1;
  if (hasChar(id)) return buildChar(id, champ, champion);
  return buildRig({ body: "humanoid", color: 0x888888, accent: 0x555555, scale: champ });
}
