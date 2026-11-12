// Escolhe como cada personagem é construído, conforme o modo visual.
import { TUNING } from "../data/tuning";
import { buildLook, hasLook } from "./looks";
import { buildRig, type Rig } from "./models";
import { buildSpriteRig, hasSprite } from "./sprites";
import { visual } from "./visual";

const BOSS_SPRITE_SCALE = 1.35;

export function characterRig(id: string, kind: "hero" | "enemy" | "boss", champion = false): Rig {
  const champ = champion ? TUNING.enemy.champion.scale : 1;
  if (visual.mode === "sprites" && hasSprite(id)) {
    return buildSpriteRig(id, champ * (kind === "boss" ? BOSS_SPRITE_SCALE : 1));
  }
  if (hasLook(id)) return buildLook(id, champ, champion);
  return buildRig({ body: "humanoid", color: 0x888888, accent: 0x555555, scale: champ });
}
