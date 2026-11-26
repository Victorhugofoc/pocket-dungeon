// M2-11: o modelo do Blender tem de bater com a receita. Se as medidas do esqueleto (b.dims) ou a forma mudarem só de um lado, as
// peças ficam presas a pivôs errados e as animações (técnicas, spells) quebram sem erro. Vale para todo JSON com "meta" (heróis).
import { describe, expect, it } from "vitest";
import { Builder, type Spec } from "../src/game/chars/kit";
import { HEROES } from "../src/game/chars/cast-heroes";
import { ENEMIES } from "../src/game/chars/cast-enemies";
import { BOSSES } from "../src/game/chars/cast-bosses";
import { modelKeys, modelMeta } from "../src/game/chars/baked";

const SPECS: Record<string, Spec> = { ...HEROES, ...ENEMIES, ...BOSSES };
const ids = Object.keys(SPECS).filter((id) => modelMeta(id));
// ossos do bípede e do manto em build.ts (pivôs de humanoid.py)
const BONES = new Set(["hips", "torso", "head", "armL", "armR", "foreL", "foreR", "thighL", "thighR", "shinL", "shinR", "cape", "skirt", "shoulderL", "shoulderR"]);

describe("modelos do Blender batem com a receita", () => {
  it("há pelo menos um modelo com meta", () => expect(ids.length).toBeGreaterThan(0));
  for (const id of ids) {
    it(id, () => {
      const b = new Builder();
      SPECS[id](b);
      const meta = modelMeta(id)!;
      expect(b.dims).toEqual(meta.dims);
      expect(b.form).toBe(meta.form);
      for (const k of modelKeys(id)) expect(BONES.has(k.split("@")[0]), `osso ${k}`).toBe(true);
    });
  }
});
