// Conquistas e desbloqueios (dungeon-idle/src/data/achievements.lua e src/data/unlocks.lua, D-630).
// Desbloqueio nunca dá poder: só alarga o sorteio (herói, relíquia, pacto, evento) ou é cosmético.
// O que nenhuma conquista libera está aberto desde o início (Frostine, Kaelen, Aurelius e Ignis, por exemplo).

export interface AchievementDef {
  id: string;
  name: string;
  text: string;
  /** "???" até liberar */
  secret?: boolean;
  /** conquista de contador (somando partidas): o progresso aparece enquanto está trancada */
  counter?: { name: string; goal: number };
}

const list: AchievementDef[] = [];
const add = (id: string, name: string, text: string, opts: Partial<AchievementDef> = {}) => list.push({ id, name, text, ...opts });

add("first_blood", "First Blood", "Defeat the first boss (W5) with any hero.");
add("survivor", "Survivor", "Win a run (W20) on any difficulty.");
add("veteran", "Veteran", "Win on Normal.");
add("relentless", "Relentless", "Win on Hard.");
add("six_crowns", "All Crowns", "Win with every hero (any difficulty).");
add("dominion", "Dominion", "Win on Hard with every hero.");
add("depths_1", "Into the Depths", "Win Depths 1.");
add("depths_3", "Abyss", "Win Depths 3.");
add("depths_5", "Ascension", "Win Depths 5.");
add("well_equipped", "Well Equipped", "Buy every Depths perk with one hero.");
add("forge", "Forge", "Evolve a spell.");
add("alchemy", "Alchemy", "Evolve a relic.");
add("grimoire", "Complete Grimoire", "Make every spell evolution (across all runs).");
add("full_table", "Full Table", "Have 3 synergies active at the same time.");
add("identity", "Identity", "Complete a build evolution (8 points in one path).");
add("untouchable", "Untouchable", "Clear a boss wave without taking damage.");
add("lightning_duel", "Lightning Duel", "Defeat a boss in under 20 s.");
add("elite_hunter", "Champion Hunter", "Defeat 50 Champions (across all runs).", { counter: { name: "elites", goal: 50 } });
add("exterminator", "Exterminator", "10,000 kills (across all runs).", { counter: { name: "kills", goal: 10000 } });
add("bestiary", "Bestiary", "Defeat every kind of enemy.");
add("kingslayer", "Kingslayer", "Defeat all 13 bosses.");
add("reliquary", "Reliquary", "Discover every relic.");
add("wardrobe", "Wardrobe", "Unlock every skin of one hero.");
add("endless", "Endless", "Reach W30 in endless mode.");
add("daily", "Daily Seed", "Win a daily seed.");
add("challenger", "Challenger", "Complete 25 run challenges.", { counter: { name: "challenges", goal: 25 } });
add("supreme", "The Supreme Challenge", "Win Depths 5 with every hero.");
add("quick_trigger", "Quick Trigger", "Kill 2,000 enemies with the basic attack (across runs).", { counter: { name: "auto_kills", goal: 2000 } });
add("medicine", "Medicine", "Heal 1,000 HP in one run.");
add("shadow", "Shadow", "Dodge 100 hits (across runs).", { counter: { name: "dodges", goal: 100 } });
add("plague", "Plague", "Kill 500 enemies with damage over time, poison or burn (across runs).", { counter: { name: "dot_kills", goal: 500 } });
for (const [hero, name, text] of [
  ["frostine", "Ice Warden", "Win with Frostine."], ["kaelen", "Duelist", "Win with Kaelen."],
  ["aurelius", "Sage", "Win with Aurelius."], ["ignis", "Inferno", "Win with Ignis."],
  ["zephyr", "Gunslinger", "Win with Zephyr."], ["varok", "Boss Slayer", "Win with Varok."],
  ["umbra", "Assassin", "Win with Umbra."], ["seraph", "Paladin", "Win with Seraph."],
  ["vesper", "Weaver", "Win with Vesper."],
]) add(`win_${hero}`, name, text);
for (const [spell, name, label] of [
  ["fireball", "Fire Master", "Fireball"], ["iceball", "Ice Master", "Iceball"],
  ["chain_lightning", "Lightning Master", "Chain Lightning"], ["arcane_bolt", "Arcane Master", "Arcane Bolt"],
  ["healing_field", "Healing Master", "Healing Field"],
]) add(`max_${spell}`, name, `Take ${label} to its max level in one run.`);
add("by_a_thread", "By a Thread", "Win a boss wave at 5% HP or less.", { secret: true });
add("miser", "Miser", "Hold 2,500 gold by W10.", { secret: true });
add("glass_cannon_win", "Glass Cannon", "Win a run with Glass Cannon.", { secret: true });
add("pactmaster", "Pact Keeper", "Accept 3 pacts in the same run.", { secret: true });

export const ACHIEVEMENTS: readonly AchievementDef[] = list;
export const ACHIEVEMENT_BY_ID: Readonly<Record<string, AchievementDef>> = Object.fromEntries(list.map((a) => [a.id, a]));

/** Números das conquistas de evento (achievements.lua `attach`). */
export const ACHIEVEMENT_RULES = {
  /** medicine: vida curada numa partida */
  medicineHeal: 1000,
  /** lightning_duel: segundos entre o chefe nascer e morrer */
  lightningDuel: 20,
  /** by_a_thread: fração da vida mais baixa numa onda de chefe vencida */
  byAThread: 0.05,
  /** endless: onda do modo sem fim */
  endlessWave: 30,
  /** miser (D-632): ouro guardado até a onda */
  miserGold: 2500, miserWave: 10,
  /** pactmaster: pactos na mesma partida */
  pactmaster: 3,
} as const;

export type UnlockKind = "hero" | "relic" | "pact" | "event" | "cosmetic";

/** unlocks.lua `REWARDS`: conquista -> o que ela libera. */
export const UNLOCK_REWARDS: Readonly<Record<string, ReadonlyArray<readonly [UnlockKind, string]>>> = {
  // heróis (abertos desde o início: Frostine, Kaelen, Aurelius, Ignis)
  first_blood: [["hero", "varok"]],
  quick_trigger: [["hero", "zephyr"]],
  medicine: [["hero", "seraph"]],
  shadow: [["hero", "umbra"]],
  plague: [["hero", "vesper"]],
  // uma vitória com cada herói
  win_frostine: [["relic", "glacier_sigil"]],
  win_kaelen: [["relic", "thunder_sigil"]],
  win_aurelius: [["relic", "arcanum_sigil"]],
  win_ignis: [["relic", "pyre_sigil"]],
  win_zephyr: [["relic", "momentum"]],
  win_varok: [["relic", "warlords_plate"]],
  win_umbra: [["relic", "ambushers_fang"]],
  win_seraph: [["relic", "pilgrims_charm"]],
  win_vesper: [["relic", "echo_stone"]],
  // lentes de spell
  max_fireball: [["relic", "pyro_lens"]],
  max_iceball: [["relic", "frost_lens"]],
  max_chain_lightning: [["relic", "storm_lens"]],
  max_arcane_bolt: [["relic", "aether_lens"]],
  max_healing_field: [["relic", "sanctuary_lens"]],
  // as conquistas antigas ganham recompensa
  depths_1: [["pact", "champions_call"]],
  forge: [["relic", "seers_monocle"]],
  alchemy: [["relic", "prismatic_core"]],
  grimoire: [["relic", "arcane_dominion"]],
  full_table: [["relic", "elemental_convergence"]],
  identity: [["relic", "war_machine_core"]],
  exterminator: [["relic", "blood_engine"]],
  well_equipped: [["relic", "battlemage_plate"]],
  elite_hunter: [["relic", "champions_trophy"]],
  lightning_duel: [["relic", "kill_streak"]],
  untouchable: [["relic", "glass_aegis"]],
  challenger: [["relic", "hoarders_crown"]],
  bestiary: [["event", "call_of_the_horde"]],
  endless: [["event", "blood_moon_rite"]],
  daily: [["event", "gamblers_den"]],
  six_crowns: [["cosmetic", "frame_bronze"]],
  dominion: [["cosmetic", "frame_silver"]],
  supreme: [["cosmetic", "frame_gold"]],
  kingslayer: [["pact", "glass_covenant"]],
  reliquary: [["pact", "swarm_covenant"]],
  wardrobe: [["cosmetic", "animated_portrait"]],
  // secretas
  by_a_thread: [["relic", "glass_throne"]],
  miser: [["relic", "merchants_ledger"]],
  glass_cannon_win: [["relic", "bleeding_crown"]],
  pactmaster: [["relic", "void_covenant"], ["pact", "arcane_bet"]],
};

/** unlocks.lua `LOCKED_BY`: tipo -> id -> a conquista que libera. */
export const LOCKED_BY: Readonly<Record<UnlockKind, Readonly<Record<string, string>>>> = (() => {
  const out: Record<UnlockKind, Record<string, string>> = { hero: {}, relic: {}, pact: {}, event: {}, cosmetic: {} };
  for (const [ach, rewards] of Object.entries(UNLOCK_REWARDS)) for (const [kind, id] of rewards) out[kind][id] = ach;
  return out;
})();

/** unlocks.lua `COSMETIC_NAMES` */
export const COSMETIC_NAMES: Readonly<Record<string, string>> = {
  frame_bronze: "Bronze frame", frame_silver: "Silver frame", frame_gold: "Gold frame", animated_portrait: "Animated portrait",
};
