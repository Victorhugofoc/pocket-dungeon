import { describe, expect, it } from "vitest";
import { heroSkins, skinLockText } from "../src/core/skins";
import { SKINS } from "../src/data/skins";

const open = (medal: number, depths: number) => heroSkins(medal, depths).filter((s) => s.open).map((s) => s.skin.id);

describe("skins (core/skins.lua)", () => {
  it("são as 6 do original, na ordem", () => {
    expect(SKINS.map((s) => s.id)).toEqual(["default", "veteran", "champion", "shadow", "abyssal", "ascended"]);
  });
  it("medalha abre as mais fáceis junto; Depths abre as suas", () => {
    expect(open(0, 0)).toEqual(["default"]);
    expect(open(2, 0)).toEqual(["default", "veteran", "champion"]);
    expect(open(3, 4)).toEqual(["default", "veteran", "champion", "shadow", "abyssal"]);
    expect(open(3, 5)).toHaveLength(6);
  });
  it("texto do que falta", () => {
    expect(skinLockText(SKINS[3])).toBe("Win on Hard");
    expect(skinLockText(SKINS[5])).toBe("Win Depths 5");
  });
});
