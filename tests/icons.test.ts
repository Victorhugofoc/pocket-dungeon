import { describe, expect, it } from "vitest";
import { evolutionIconUrl, relicIconUrl, slotIconUrl, spellIconUrl, techniqueIconUrl, uiIconUrl, upgradeIconUrl } from "../src/ui/icons";
import { EVOLUTIONS, SPELL_ORDER } from "../src/data/spells";
import { TECHNIQUES } from "../src/data/techniques";
import { UPGRADES } from "../src/data/upgrades";
import { RELIC_IDS } from "../src/data/relics";

// M14-10 (D19): todo o conteúdo que aparece na interface tem o ícone do original
describe("ícones da interface (M14-10)", () => {
  it("toda spell, forma evoluída e técnica", () => {
    for (const id of SPELL_ORDER) expect(spellIconUrl(id), id).toBeTruthy();
    for (const id of Object.keys(EVOLUTIONS)) expect(evolutionIconUrl(id), id).toBeTruthy();
    for (const id of Object.keys(TECHNIQUES)) expect(techniqueIconUrl(id), id).toBeTruthy();
  });

  it("toda melhoria de nível e toda relíquia", () => {
    expect(UPGRADES.filter((u) => !upgradeIconUrl(u.id)).map((u) => u.id)).toEqual([]);
    expect(RELIC_IDS.filter((id) => !relicIconUrl(id))).toEqual([]);
  });

  it("o espaço de spell mostra a forma evoluída quando houver", () => {
    expect(slotIconUrl("fireball", "firestorm")).toBe(evolutionIconUrl("firestorm"));
    expect(slotIconUrl("fireball", null)).toBe(spellIconUrl("fireball"));
    expect(slotIconUrl("storm_step")).toBe(techniqueIconUrl("storm_step"));
    for (const n of ["coin", "heart", "xp", "sword", "skull"]) expect(uiIconUrl(n), n).toBeTruthy();
  });
});
