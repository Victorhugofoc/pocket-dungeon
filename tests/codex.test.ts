import { describe, expect, it } from "vitest";
import { AchievementTracker, checkSaved, emptyAchievements, normalizeAchievements } from "../src/core/achievements";
import {
  CODEX_TABS, codexCompletion, codexDefeat, codexEntries, codexIsNew, codexNewCount, codexOpened, codexSeed, codexSeen,
  codexSplit, codexSyncRun,
} from "../src/core/codex";
import { BOSS_ORDER, ENEMIES } from "../src/data/enemies";
import { EVENTS, PACTS } from "../src/data/events";
import { EVOLUTIONS, SPELL_ORDER } from "../src/data/spells";
import { RELIC_IDS } from "../src/data/relics";

describe("M13-04: códex", () => {
  it("as 10 abas têm entradas com id único, na ordem do jogo", () => {
    expect(CODEX_TABS.map((t) => t.id)).toEqual(["hero", "spell", "relic", "enemy", "boss", "upgrade", "modifier", "pactevent", "affix", "achievement"]);
    for (const t of CODEX_TABS) {
      const ids = codexEntries(t.id).map((e) => e.id);
      expect(ids.length).toBeGreaterThan(0);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(codexEntries("hero")[0].id).toBe("frostine");
    expect(codexEntries("spell").length).toBe(SPELL_ORDER.length + Object.keys(EVOLUTIONS).length);
    expect(codexEntries("relic").length).toBe(RELIC_IDS.length);
    expect(codexEntries("enemy").length).toBe(Object.keys(ENEMIES).length);
    expect(codexEntries("boss").length).toBe(BOSS_ORDER.length);
    expect(codexEntries("pactevent").length).toBe(PACTS.length + EVENTS.length);
  });

  it("split da aba de pactos e eventos", () => {
    expect(codexSplit("pactevent", "pact:blood_oath")).toEqual({ kind: "pact", id: "blood_oath" });
    expect(codexSplit("relic", "glass_cannon")).toEqual({ kind: "relic", id: "glass_cannon" });
  });

  it("a partida marca herói, spells, evolução, modificadores, relíquias, melhorias, pactos e eventos, com NOVO", () => {
    const s = emptyAchievements();
    const pact = PACTS[0].id, ev = EVENTS[0].id;
    const got = codexSyncRun(s, {
      heroId: "frostine", spells: [{ id: "fireball", evolution: "firestorm", modifiers: ["m1"] }], relics: ["glass_cannon"],
      upgradesTaken: ["double_shot"], pacts: [pact], eventLog: [{ id: ev }],
    });
    expect(got.length).toBe(8);
    expect(codexSeen(s, "hero", "frostine")).toBe(true);
    expect(codexSeen(s, "spell", "firestorm")).toBe(true);
    expect(codexSeen(s, "modifier", "fireball:m1")).toBe(true);
    expect(codexSeen(s, "pactevent", `pact:${pact}`)).toBe(true);
    expect(codexSeen(s, "pactevent", `event:${ev}`)).toBe(true);
    expect(codexIsNew(s, "relic", "glass_cannon")).toBe(true);
    expect(codexNewCount(s, "pactevent")).toBe(2);
    expect(codexOpened(s, "relic", "glass_cannon")).toBe(true);
    expect(codexOpened(s, "relic", "glass_cannon")).toBe(false);
    expect(codexSyncRun(s, { heroId: "frostine" })).toEqual([]);
  });

  it("afixos abertos desde o início; conquista vista quando liberada", () => {
    const s = emptyAchievements();
    expect(codexSeen(s, "affix", codexEntries("affix")[0].id)).toBe(true);
    expect(codexSeen(s, "achievement", "first_blood")).toBe(false);
    s.unlocked.first_blood = true;
    expect(codexSeen(s, "achievement", "first_blood")).toBe(true);
  });

  it("derrotar conta por id e entra uma vez; o rastreador usa o mesmo caminho", () => {
    const s = emptyAchievements();
    expect(codexDefeat(s, false, "goblin")).toBe(true);
    expect(codexDefeat(s, false, "goblin")).toBe(false);
    expect(s.defeated.goblin).toBe(2);
    const t = new AchievementTracker(s, { heroes: [], bosses: [], enemies: [], relics: [] });
    t.enemyKilled({ key: {}, id: "bloodfang", boss: true, champion: false, source: "other", elapsed: 0 });
    expect(codexSeen(s, "boss", "bloodfang")).toBe(true);
    expect(s.defeated.bloodfang).toBe(1);
    expect(t.take()).toContain("first_blood");
  });

  it("Forge conta só evolução de spell (a spell comum agora também vai para o códex)", () => {
    const s = emptyAchievements();
    const c = { heroes: [], bosses: [], enemies: [], relics: [], spellEvolutions: Object.keys(EVOLUTIONS) };
    codexSyncRun(s, { heroId: "frostine", spells: [{ id: "fireball" }] });
    expect(checkSaved(s, c)).not.toContain("forge");
    codexSyncRun(s, { heroId: "frostine", spells: [{ id: "fireball", evolution: "firestorm" }] });
    expect(checkSaved(s, c)).toContain("forge");
  });

  it("semeia uma vez pelo save e pelo registro, sem NOVO", () => {
    const s = emptyAchievements();
    s.played.push("kaelen");
    s.medals.ignis = 2;
    expect(codexSeed(s, [{ heroId: "umbra", relics: ["glass_cannon"], upgrades: [{ id: "double_shot" }], pacts: [{ id: PACTS[0].id }] }])).toBe(true);
    for (const h of ["kaelen", "ignis", "umbra"]) expect(codexSeen(s, "hero", h)).toBe(true);
    expect(codexSeen(s, "upgrade", "double_shot")).toBe(true);
    expect(Object.keys(s.codexNew)).toEqual([]);
    expect(codexSeed(s, [{ heroId: "vesper" }])).toBe(false);
    expect(codexSeen(s, "hero", "vesper")).toBe(false);
  });

  it("save antigo (só 4 tipos) carrega com os tipos novos vazios", () => {
    const old = { unlocked: {}, seen: { boss: ["bloodfang"], enemy: [], relic: [], spell: ["firestorm"] } };
    const s = normalizeAchievements(old)!;
    expect(s.seen.boss).toEqual(["bloodfang"]);
    expect(s.seen.upgrade).toEqual([]);
    expect(s.defeated).toEqual({});
    expect(s.codexSeeded).toBe(false);
    const { seen, total } = codexCompletion(s);
    expect(seen).toBe(2);
    expect(total).toBeGreaterThan(300);
  });
});
