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

add("first_blood", "Primeiro sangue", "Derrote o primeiro boss (W5) com qualquer herói.");
add("survivor", "Sobrevivente", "Vença uma run (W20) em qualquer dificuldade.");
add("veteran", "Veterano", "Vença no Normal.");
add("relentless", "Implacável", "Vença no Hard.");
add("six_crowns", "Todas as coroas", "Vença com todos os heróis (qualquer dificuldade).");
add("dominion", "Domínio", "Vença no Hard com todos os heróis.");
add("depths_1", "Nas profundezas", "Vença o Depths 1.");
add("depths_3", "Abismo", "Vença o Depths 3.");
add("depths_5", "Ascensão", "Vença o Depths 5.");
add("well_equipped", "Bem equipado", "Compre todas as perks do Depths com um herói.");
add("forge", "Forja", "Evolua uma spell.");
add("alchemy", "Alquimia", "Evolua uma relic.");
add("grimoire", "Grimório completo", "Faça todas as evoluções de spell (somando todas as runs).");
add("full_table", "Mesa cheia", "Tenha 3 sinergias ativas ao mesmo tempo.");
add("identity", "Identidade", "Complete uma evolução de build (8 pontos num caminho).");
add("untouchable", "Intocável", "Vença uma wave de boss sem levar dano.");
add("lightning_duel", "Duelo relâmpago", "Derrote um boss em menos de 20 s.");
add("elite_hunter", "Caçador de Elites", "Derrote 50 Elites (somando todas as runs).", { counter: { name: "elites", goal: 50 } });
add("exterminator", "Exterminador", "10.000 abates (somando todas as runs).", { counter: { name: "kills", goal: 10000 } });
add("bestiary", "Bestiário", "Derrote todos os tipos de inimigo.");
add("kingslayer", "Matador de reis", "Derrote os 13 bosses.");
add("reliquary", "Relicário", "Descubra todas as relics.");
add("wardrobe", "Guarda-roupa", "Libere todas as skins de um herói.");
add("endless", "Sem fim", "Chegue à W30 no modo infinito.");
add("daily", "Semente do dia", "Vença uma semente do dia.");
add("challenger", "Desafiante", "Complete 25 desafios da run.", { counter: { name: "challenges", goal: 25 } });
add("supreme", "O desafio supremo", "Vença o Depths 5 com todos os heróis.");
add("quick_trigger", "Gatilho rápido", "Mate 2.000 inimigos com ataque básico (somando runs).", { counter: { name: "auto_kills", goal: 2000 } });
add("medicine", "Medicina", "Cure 1.000 de vida numa run.");
add("shadow", "Sombra", "Esquive 100 golpes (somando runs).", { counter: { name: "dodges", goal: 100 } });
add("plague", "Peste", "Mate 500 inimigos com dano ao longo do tempo, veneno ou queimadura (somando runs).", { counter: { name: "dot_kills", goal: 500 } });
for (const [hero, name, text] of [
  ["frostine", "Guardiã do gelo", "Vença com a Frostine."], ["kaelen", "Duelista", "Vença com o Kaelen."],
  ["aurelius", "Sábio", "Vença com o Aurelius."], ["ignis", "Inferno", "Vença com o Ignis."],
  ["zephyr", "Pistoleiro", "Vença com o Zephyr."], ["varok", "Matador de bosses", "Vença com o Varok."],
  ["umbra", "Assassina", "Vença com a Umbra."], ["seraph", "Paladino", "Vença com o Seraph."],
  ["vesper", "Tecelã", "Vença com a Vesper."],
]) add(`win_${hero}`, name, text);
for (const [spell, name, label] of [
  ["fireball", "Mestre do fogo", "Fireball"], ["iceball", "Mestre do gelo", "Iceball"],
  ["chain_lightning", "Mestre do raio", "Chain Lightning"], ["arcane_bolt", "Mestre arcano", "Arcane Bolt"],
  ["healing_field", "Mestre da cura", "Healing Field"],
]) add(`max_${spell}`, name, `Leve a ${label} ao nível máximo numa run.`);
add("by_a_thread", "Por um fio", "Vença uma wave de boss com 5% de vida ou menos.", { secret: true });
add("miser", "Avarento", "Tenha 2.500 de ouro guardado até a W10.", { secret: true });
add("glass_cannon_win", "Canhão de vidro", "Vença uma run com a Glass Cannon.", { secret: true });
add("pactmaster", "Pactuário", "Aceite 3 pactos na mesma run.", { secret: true });

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
  frame_bronze: "Moldura de bronze", frame_silver: "Moldura de prata", frame_gold: "Moldura de ouro", animated_portrait: "Retrato animado",
};
