import { describe, expect, it } from "vitest";
import {
  AchievementTracker, checkSaved, emptyAchievements, filterOpen, isNew, isOpen, isSecret, markFreshSeen, normalizeAchievements,
  progress, unlockAchievement,
} from "../src/core/achievements";
import { ACHIEVEMENT_BY_ID, ACHIEVEMENTS, LOCKED_BY, UNLOCK_REWARDS } from "../src/data/achievements";
import { HERO_ORDER } from "../src/data/heroes";
import { loadAchievements, writeAchievements, type Storage } from "../src/core/save";

const CONTENT = { heroes: HERO_ORDER, bosses: ["b1", "b2"], enemies: ["goblin", "bat"], relics: ["r1"] };
const tracker = () => new AchievementTracker(emptyAchievements(), CONTENT);

describe("desbloqueios (unlocks.lua)", () => {
  it("abertos desde o início: Frostine, Kaelen, Aurelius e Ignis; os outros 5 trancados", () => {
    const s = emptyAchievements();
    expect(filterOpen(s, "hero", HERO_ORDER)).toEqual(["frostine", "kaelen", "aurelius", "ignis"]);
    expect(filterOpen(s, "hero", HERO_ORDER, true)).toEqual([...HERO_ORDER]);
  });

  it("a conquista libera o herói e marca NOVO; olhar tira o NOVO", () => {
    const s = emptyAchievements();
    expect(isOpen(s, "hero", "varok")).toBe(false);
    expect(unlockAchievement(s, "first_blood")).toBe(true);
    expect(unlockAchievement(s, "first_blood")).toBe(false);
    expect(isOpen(s, "hero", "varok")).toBe(true);
    expect(isNew(s, "hero", "varok")).toBe(true);
    expect(markFreshSeen(s, "hero", "varok")).toBe(true);
    expect(isNew(s, "hero", "varok")).toBe(false);
  });

  it("liberar ao carregar (quiet) não marca NOVO", () => {
    const s = emptyAchievements();
    unlockAchievement(s, "plague", true);
    expect(isOpen(s, "hero", "vesper")).toBe(true);
    expect(isNew(s, "hero", "vesper")).toBe(false);
  });

  it("herói que já teve partida fica aberto (save antigo)", () => {
    const s = emptyAchievements();
    s.played.push("umbra");
    expect(isOpen(s, "hero", "umbra")).toBe(true);
    expect(isOpen(s, "relic", "glass_throne")).toBe(false);
  });

  it("secreta mostra ??? até liberar; contador mostra o progresso", () => {
    const s = emptyAchievements();
    expect(isSecret(s, "relic", "glass_throne")).toBe(true);
    expect(isSecret(s, "hero", "zephyr")).toBe(false);
    s.counters.auto_kills = 120;
    expect(progress(s, ACHIEVEMENT_BY_ID.quick_trigger)).toEqual({ current: 120, goal: 2000 });
    expect(progress(s, ACHIEVEMENT_BY_ID.exterminator, 5000)).toEqual({ current: 5000, goal: 10000 });
    expect(progress(s, ACHIEVEMENT_BY_ID.medicine)).toBeUndefined();
  });

  it("toda recompensa aponta para uma conquista que existe", () => {
    for (const id of Object.keys(UNLOCK_REWARDS)) expect(ACHIEVEMENT_BY_ID[id], id).toBeDefined();
    expect(LOCKED_BY.hero).toEqual({ varok: "first_blood", zephyr: "quick_trigger", seraph: "medicine", umbra: "shadow", vesper: "plague" });
  });
});

describe("conquistas (achievements.lua)", () => {
  it("contadores somando partidas liberam ao chegar na meta", () => {
    const t = tracker();
    for (let i = 0; i < 99; i++) t.dodge();
    t.check();
    expect(t.take()).toEqual([]);
    t.dodge();
    t.check();
    expect(t.take()).toEqual(["shadow"]);
    expect(isOpen(t.state, "hero", "umbra")).toBe(true);
  });

  it("abates: ataque básico, dano ao longo do tempo, elites; invocado não conta", () => {
    const t = tracker();
    t.enemyKilled({ key: {}, id: "goblin", boss: false, champion: true, source: "auto", elapsed: 0 });
    t.enemyKilled({ key: {}, id: "goblin", boss: false, champion: false, source: "dot", elapsed: 0 });
    t.enemyKilled({ key: {}, id: "goblin", boss: false, champion: false, source: "auto", elapsed: 0, noReward: true });
    expect(t.state.counters).toEqual({ kills: 2, elites: 1, auto_kills: 1, dot_kills: 1 });
  });

  it("primeiro chefe derrotado: first_blood (libera Varok); em menos de 20 s: lightning_duel", () => {
    const t = tracker();
    const boss = {};
    t.bossSpawned(boss, 100);
    t.enemyKilled({ key: boss, id: "b1", boss: true, champion: false, source: "other", elapsed: 115 });
    expect(t.take()).toEqual(["first_blood", "lightning_duel"]);
    const slow = {};
    t.bossSpawned(slow, 200);
    t.enemyKilled({ key: slow, id: "b2", boss: true, champion: false, source: "other", elapsed: 230 });
    expect(t.take()).toEqual(["kingslayer"]);
  });

  it("todos os inimigos: bestiary", () => {
    const t = tracker();
    t.enemyKilled({ key: {}, id: "goblin", boss: false, champion: false, source: "other", elapsed: 0 });
    expect(t.take()).toEqual([]);
    t.enemyKilled({ key: {}, id: "bat", boss: false, champion: false, source: "other", elapsed: 0 });
    expect(t.take()).toEqual(["bestiary"]);
  });

  it("onda de chefe sem dano: untouchable; com 5% de vida ou menos: by_a_thread; morto não conta", () => {
    const t = tracker();
    t.waveStart(5);
    t.waveComplete({ wave: 5, bossWave: true, gameOver: false, gold: 0 });
    expect(t.take()).toEqual(["untouchable"]);
    t.waveStart(10);
    t.playerHit(50, 0.04);
    t.waveComplete({ wave: 10, bossWave: true, gameOver: true, gold: 0 });
    expect(t.take()).toEqual([]);
    t.waveStart(15);
    t.playerHit(50, 0.05);
    t.waveComplete({ wave: 15, bossWave: true, gameOver: false, gold: 0 });
    expect(t.take()).toEqual(["by_a_thread"]);
  });

  it("miser até a onda 10, endless na 30", () => {
    const t = tracker();
    t.waveComplete({ wave: 11, bossWave: false, gameOver: false, gold: 3000 });
    expect(t.take()).toEqual([]);
    t.waveComplete({ wave: 10, bossWave: true, gameOver: false, gold: 2500 });
    expect(t.take()).toContain("miser");
    t.waveComplete({ wave: 30, bossWave: true, gameOver: false, gold: 0 });
    expect(t.take()).toContain("endless");
  });

  it("medicine: 1.000 de vida curada numa partida (libera Seraph)", () => {
    const t = tracker();
    t.healed(999);
    expect(t.take()).toEqual([]);
    t.healed(1000);
    expect(t.take()).toEqual(["medicine"]);
  });

  it("vitória: medalha por dificuldade e as conquistas de vitória, uma vez por partida", () => {
    const t = tracker();
    t.runStart("ignis");
    t.victory({ heroId: "ignis", difficultyId: "normal", relics: ["glass_cannon"] });
    expect(t.take().sort()).toEqual(["glass_cannon_win", "survivor", "veteran", "win_ignis"]);
    expect(t.state.medals.ignis).toBe(2);
    t.victory({ heroId: "ignis", difficultyId: "hard", relics: [] });
    expect(t.state.medals.ignis).toBe(2);
    expect(t.state.played).toEqual(["ignis"]);
  });

  it("todas as coroas com os 9 heróis", () => {
    const s = emptyAchievements();
    for (const h of HERO_ORDER) s.medals[h] = 3;
    const got = checkSaved(s, CONTENT);
    expect(got).toEqual(expect.arrayContaining(["six_crowns", "dominion", "relentless", ...HERO_ORDER.map((h) => `win_${h}`)]));
  });

  it("spell no nível máximo: a lente", () => {
    const t = tracker();
    t.waveStart(3, [{ id: "fireball", level: 5 }, { id: "cyclone", level: 5 }, { id: "iceball", level: 4 }], 5);
    expect(t.take()).toEqual(["max_fireball"]);
  });

  it(`a lista tem ${ACHIEVEMENTS.length} conquistas, sem id repetido`, () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});

describe("conquistas de evolução (M12-08)", () => {
  it("Forge e Complete Grimoire pelas evoluções de spell vistas; Alchemy pela relíquia evoluída achada", () => {
    const t = new AchievementTracker(emptyAchievements(), { ...CONTENT, spellEvolutions: ["firestorm", "glacier"], relicEvolutions: ["inferno_heart"] });
    t.relicFound("ember_heart");
    expect(t.take()).not.toContain("alchemy");
    t.spellEvolved("firestorm");
    expect(t.take()).toContain("forge");
    t.spellEvolved("glacier");
    expect(t.take()).toContain("grimoire");
    t.relicFound("inferno_heart");
    expect(t.take()).toContain("alchemy");
    // save antigo sem `seen.spell`
    expect(normalizeAchievements({ unlocked: {}, seen: { boss: [], enemy: [], relic: [] } })!.seen.spell).toEqual([]);
  });
});

describe("save das conquistas", () => {
  const mem = (): Storage & { data: Record<string, string> } => {
    const data: Record<string, string> = {};
    return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; }, removeItem: (k) => { delete data[k]; } };
  };
  it("grava e lê de volta; lixo vira estado vazio", () => {
    const st = mem();
    const s = emptyAchievements();
    unlockAchievement(s, "shadow");
    s.counters.dodges = 100;
    writeAchievements(st, s);
    expect(loadAchievements(st)).toEqual(s);
    expect(normalizeAchievements({ unlocked: {} })?.seen.boss).toEqual([]);
    expect(normalizeAchievements(42)).toBeNull();
    st.data["dungeon-reign-rpg.achievements.v1"] = "{oops";
    expect(loadAchievements(st)).toEqual(emptyAchievements());
  });
});
