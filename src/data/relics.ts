// Relíquias (dungeon-idle/src/data/relics.lua): cada uma é uma lista de efeitos por atributo (`effects`), tags de build,
// categoria e raridade como lá; as de spell levam `spell` e `spellEffect` (só valem com a spell equipada). Mecânicas
// que não são soma de atributo (relic_mechanics.lua) ligam por um atributo próprio e rodam pelos ganchos de
// `core/relics.ts`. Números: as 20 primeiras foram adaptadas à escala daqui antes do M12 (lista em `RELIC_ADAPTED`).
import type { StatBlock, StatKey } from "../core/stats";
import type { SpellEffect } from "./spells";

/** relics.lua `category`: core (§41), component (§42), spell (§43), keystone (§44), tier2, tier3, boss, boss_build */
export type RelicCategory = "core" | "component" | "spell" | "keystone" | "tier2" | "tier3" | "boss" | "boss_build";
/** relics.lua `rarity` (o sorteio normal usa as três primeiras, pesos 65/30/5) */
export type RelicRarity = "uncommon" | "rare" | "epic" | "boss" | "evolved";

export interface RelicEffect {
  stat: StatKey;
  value: number;
}

export interface RelicDef {
  id: string;
  name: string;
  category: RelicCategory;
  rarity: RelicRarity;
  effects: RelicEffect[];
  /** a soma de `effects` (o que entra em `computeStats` e o que a interface mostra) */
  stats: StatBlock;
  /** pontos de tag de build (build_system.lua): cada tag vale 1 enquanto a relíquia é do herói */
  tags: string[];
  /** relíquia de spell: só sai no sorteio com esta spell equipada, e `spellEffect` só vale nela */
  spell?: string;
  spellEffect?: SpellEffect;
  /** componente feito para esta spell (D-570): sai menos no sorteio sem ela */
  needs?: string;
  color: number;
}

type RelicInput = Omit<RelicDef, "stats" | "effects" | "tags"> & { effects?: RelicEffect[]; tags?: string[] };

const e = (stat: StatKey, value: number): RelicEffect => ({ stat, value });

function relic(t: RelicInput): RelicDef {
  const effects = t.effects ?? [];
  const stats: StatBlock = {};
  for (const x of effects) stats[x.stat] = (stats[x.stat] ?? 0) + x.value;
  return { ...t, effects, tags: t.tags ?? [], stats };
}

const list: RelicDef[] = [
  // §41 core
  relic({ id: "blood_pact", name: "Blood Pact", category: "core", rarity: "rare",
    effects: [e("damagePct", 0.25), e("maxHpPct", -0.15)], tags: ["auto", "magic", "damage"], color: 0xd9344a }),
  relic({ id: "arcane_core", name: "Arcane Core", category: "core", rarity: "rare",
    effects: [e("cdrPct", 0.20)], tags: ["magic", "spell_haste"], color: 0xb07aff }),
  relic({ id: "hunters_eye", name: "Hunter's Eye", category: "core", rarity: "uncommon",
    effects: [e("rangePct", 0.35)], tags: ["range"], color: 0x7ad94a }),
  relic({ id: "ember_heart", name: "Ember Heart", category: "core", rarity: "rare",
    effects: [e("burnPct", 1.00)], tags: ["magic", "fire", "burn"], color: 0xff7a1a }),
  relic({ id: "frost_crown", name: "Frost Crown", category: "core", rarity: "rare",
    effects: [e("slowDurationPct", 0.20), e("armor", 8)], tags: ["magic", "ice", "slow"], color: 0x8fdcff }),
  relic({ id: "greedy_soul", name: "Greedy Soul", category: "core", rarity: "uncommon",
    effects: [e("goldPct", 0.35), e("damagePct", -0.10)], tags: ["economy", "damage"], color: 0xffd34d }),
  relic({ id: "glass_cannon", name: "Glass Cannon", category: "core", rarity: "epic",
    effects: [e("damagePct", 0.50), e("maxHpPct", -0.30)], tags: ["auto", "magic", "damage"], color: 0xffffff }),
  relic({ id: "living_moss", name: "Living Moss", category: "core", rarity: "rare",
    effects: [e("regen", 1.2)], tags: ["survival", "healing", "sustain"], color: 0x5fbf5f }),
  relic({ id: "mirror_veil", name: "Mirror Veil", category: "core", rarity: "rare",
    effects: [e("dodge", 0.15)], tags: ["survival", "dodge"], color: 0xc8d9ff }),
  relic({ id: "aegis_heart", name: "Aegis Heart", category: "core", rarity: "uncommon",
    effects: [e("maxHpPct", 0.12), e("armor", 10)], tags: ["survival", "armor"], color: 0xffdb73 }),
  relic({ id: "bulwark_core", name: "Bulwark Core", category: "core", rarity: "rare",
    effects: [e("armor", 18), e("regen", 0.8), e("attackSpeedPct", -0.06)], tags: ["survival", "armor", "healing", "tradeoff"], color: 0x9aa8b8 }),
  relic({ id: "renewing_heart", name: "Renewing Heart", category: "core", rarity: "rare",
    effects: [e("regen", 1.0), e("maxHpPct", 0.08)], tags: ["survival", "healing", "sustain"], color: 0xff8fa8 }),
  relic({ id: "evasion_circuit", name: "Evasion Circuit", category: "core", rarity: "uncommon",
    effects: [e("dodge", 0.07), e("moveSpeedPct", 0.08)], tags: ["survival", "dodge", "speed"], color: 0x73ffcc }),
  // §42 componentes
  relic({ id: "duelist_seal", name: "Duelist Seal", category: "component", rarity: "rare",
    effects: [e("critChance", 0.07), e("critDamagePct", 0.10)], tags: ["auto", "crit", "damage"], color: 0xffe066 }),
  relic({ id: "duelist_gloves", name: "Duelist Gloves", category: "component", rarity: "rare",
    effects: [e("attackSpeedPct", 0.10), e("critChance", 0.05)], tags: ["auto", "speed", "crit"], color: 0xe6b366 }),
  relic({ id: "scavenger_badge", name: "Scavenger Badge", category: "component", rarity: "uncommon",
    effects: [e("goldPct", 0.12), e("xpPct", 0.08)], tags: ["economy", "survival"], color: 0xc8a06a }),
  relic({ id: "titan_sigil", name: "Titan Sigil", category: "component", rarity: "epic",
    effects: [e("maxHpPct", 0.12), e("armor", 12), e("dodge", 0.05)], tags: ["survival", "armor", "dodge"], color: 0xb9c2cc }),
  relic({ id: "duelist_crown", name: "Duelist Crown", category: "component", rarity: "epic",
    effects: [e("damagePct", 0.10), e("critChance", 0.07), e("attackSpeedPct", 0.08)], tags: ["auto", "crit", "speed"], color: 0xffc83d }),
  relic({ id: "storm_vane", name: "Storm Vane", category: "component", rarity: "rare",
    effects: [e("areaPct", 0.20)], tags: ["magic", "area"], color: 0x6fa8ff }),
  relic({ id: "grave_locket", name: "Grave Locket", category: "component", rarity: "rare",
    effects: [e("lifeOnKill", 2), e("xpPct", 0.10)], tags: ["survival", "healing", "economy"], color: 0x9ad1ff }),
  // M12-02, lote 1: as do sorteio normal que só somam atributo que o jogo já tem, mais Momentum, Vital Spark e Blood Engine
  relic({ id: "veiled_step", name: "Veiled Step", category: "core", rarity: "rare",
    effects: [e("dodge", 0.09)], tags: ["survival", "dodge"], color: 0xa9b8d9 }),
  relic({ id: "phantom_ward", name: "Phantom Ward", category: "core", rarity: "rare",
    effects: [e("dodge", 0.11), e("armor", 5)], tags: ["survival", "dodge", "magic"], color: 0xb8a9ff }),
  relic({ id: "ember_spurs", name: "Ember Spurs", category: "component", rarity: "uncommon",
    effects: [e("firePct", 0.08), e("moveSpeedPct", 0.06)], tags: ["fire", "speed"], color: 0xff9a4a }),
  relic({ id: "glacial_shell", name: "Glacial Shell", category: "component", rarity: "uncommon",
    effects: [e("armor", 10), e("maxHpPct", 0.08), e("slowDurationPct", 0.15)], tags: ["ice", "survival", "armor"], color: 0x9fd8f0 }),
  relic({ id: "storm_step", name: "Storm Step", category: "component", rarity: "uncommon",
    effects: [e("lightningPct", 0.08), e("moveSpeedPct", 0.07)], tags: ["lightning", "speed"], color: 0x8fb8ff }),
  relic({ id: "aether_thread", name: "Aether Thread", category: "component", rarity: "uncommon",
    effects: [e("spellDamagePct", 0.08), e("regen", 0.20)], tags: ["arcane", "magic", "healing"], color: 0xc59aff }),
  relic({ id: "evasion_cloak", name: "Evasion Cloak", category: "component", rarity: "uncommon",
    effects: [e("dodge", 0.08), e("moveSpeedPct", 0.05)], tags: ["survival", "dodge", "speed"], color: 0x7fd9b3 }),
  relic({ id: "frost_heart", name: "Frost Heart", category: "component", rarity: "uncommon",
    effects: [e("maxHpPct", 0.08), e("slowDurationPct", 0.15)], tags: ["ice", "slow", "survival"], color: 0x7fc8ff }),
  relic({ id: "storm_coil", name: "Storm Coil", category: "component", rarity: "uncommon",
    effects: [e("lightningPct", 0.08), e("cdrPct", 0.06)], tags: ["lightning", "spell_haste"], color: 0x5f9aff }),
  relic({ id: "aether_focus", name: "Aether Focus", category: "component", rarity: "uncommon",
    effects: [e("spellDamagePct", 0.08), e("rangePct", 0.12)], tags: ["arcane", "magic", "range"], color: 0xa98aff }),
  relic({ id: "vital_spark", name: "Vital Spark", category: "component", rarity: "uncommon",
    effects: [e("regen", 0.20), e("levelHealPct", 0.15)], tags: ["healing", "survival"], color: 0x9fff8f }),
  relic({ id: "warding_mirror", name: "Warding Mirror", category: "component", rarity: "rare",
    effects: [e("armor", 4), e("dodge", 0.06)], tags: ["survival", "dodge", "magic"], color: 0xd0dcff }),
  relic({ id: "astral_prism", name: "Astral Prism", category: "component", rarity: "epic",
    effects: [e("spellDamagePct", 0.12), e("rangePct", 0.08), e("cdrPct", 0.05)], tags: ["magic", "arcane", "range"], color: 0xe0a8ff }),
  // §44 keystones
  relic({ id: "war_machine_core", name: "War Machine Core", category: "keystone", rarity: "epic",
    effects: [e("autoDamagePct", 0.25), e("spellDamagePct", -0.18)], tags: ["auto", "damage", "tradeoff"], color: 0xc87a4a }),
  relic({ id: "blood_engine", name: "Blood Engine", category: "keystone", rarity: "epic",
    effects: [e("regen", 0.80), e("damagePct", -0.10), e("overhealShield", 0.20)], tags: ["healing", "sustain", "tradeoff"], color: 0xc8283a }),
  relic({ id: "elemental_convergence", name: "Elemental Convergence", category: "keystone", rarity: "epic",
    effects: [e("firePct", 0.22), e("icePct", 0.22), e("lightningPct", 0.22), e("arcanePct", -0.15)], tags: ["fire", "ice", "lightning", "tradeoff"], color: 0xffb35f }),
  // extensões de lá (core)
  relic({ id: "smoldering_brand", name: "Smoldering Brand", category: "core", rarity: "uncommon",
    effects: [e("firePct", 0.08), e("burnPct", 0.06)], tags: ["fire", "burn"], color: 0xe8642a }),
  relic({ id: "glacier_sigil", name: "Glacier Sigil", category: "core", rarity: "rare",
    effects: [e("icePct", 0.12), e("armor", 4)], tags: ["ice", "survival"], color: 0x6fc0e8 }),
  relic({ id: "rune_charm", name: "Rune Charm", category: "core", rarity: "uncommon",
    effects: [e("arcanePct", 0.08), e("armor", 3)], tags: ["arcane", "magic"], color: 0x9a6fe8 }),
  relic({ id: "spellblade_sigil", name: "Spellblade Sigil", category: "core", rarity: "rare",
    effects: [e("autoDamagePct", 0.10), e("spellDamagePct", 0.10)], tags: ["auto", "magic", "damage"], color: 0xd98aff }),
  relic({ id: "runic_gauntlet", name: "Runic Gauntlet", category: "core", rarity: "rare",
    effects: [e("spellPower", 3), e("attackSpeedPct", 0.08)], tags: ["auto", "magic", "speed"], color: 0x8a7ad9 }),
  relic({ id: "arcane_conductor", name: "Arcane Conductor", category: "core", rarity: "uncommon",
    effects: [e("cdrPct", 0.08), e("rangePct", 0.08)], tags: ["magic", "spell_haste", "range"], color: 0xb89aff }),
  relic({ id: "kindling_charm", name: "Kindling Charm", category: "core", rarity: "uncommon",
    effects: [e("firePct", 0.06), e("icePct", 0.06)], tags: ["fire", "ice", "magic"], color: 0xffc89a }),
  relic({ id: "focus_crystal", name: "Focus Crystal", category: "core", rarity: "epic",
    effects: [e("spellDamagePct", 0.20), e("cdrPct", 0.10), e("autoDamagePct", -0.15)], tags: ["magic", "spell_haste", "tradeoff"], color: 0xf0c8ff }),
  relic({ id: "battlemage_plate", name: "Battlemage Plate", category: "core", rarity: "rare",
    effects: [e("armor", 8), e("spellDamagePct", 0.08)], tags: ["survival", "armor", "magic"], color: 0x8a96b8 }),
  relic({ id: "spellthief_ring", name: "Spellthief Ring", category: "core", rarity: "uncommon",
    effects: [e("spellDamagePct", 0.06), e("goldPct", 0.10)], tags: ["magic", "economy"], color: 0xe8c86f }),
  relic({ id: "momentum", name: "Momentum", category: "core", rarity: "rare",
    effects: [e("momentumPct", 0.20)], tags: ["speed", "damage"], color: 0x73e0ff }),
  // M12-03, lote 2: relíquias de spell (§43; só no sorteio com a spell equipada), componentes das spells novas e as
  // de escola, Echo, Volatile, Spell Crit, dano em lento e alvos de raio
  relic({ id: "storm_prism", name: "Storm Prism", category: "core", rarity: "rare",
    effects: [e("lightningTargets", 1)], tags: ["magic", "lightning", "chain"], color: 0x9fc8ff }),
  relic({ id: "gale_feather", name: "Gale Feather", category: "component", rarity: "uncommon", needs: "cyclone",
    effects: [e("windPct", 0.08), e("moveSpeedPct", 0.06)], tags: ["magic", "speed"], color: 0xbfe8d0 }),
  relic({ id: "binding_chalk", name: "Binding Chalk", category: "component", rarity: "uncommon", spell: "rune_traps",
    effects: [e("runePct", 0.08)], spellEffect: { rootFlat: 0.2 }, tags: ["magic", "control"], color: 0xe8e0c8 }),
  relic({ id: "scribes_quill", name: "Scribe's Quill", category: "component", rarity: "rare", spell: "rune_traps",
    effects: [e("moveSpeedPct", 0.06)], spellEffect: { runes: 1 }, tags: ["magic", "speed"], color: 0xc8b48a }),
  relic({ id: "cut_crystal", name: "Cut Crystal", category: "component", rarity: "uncommon", needs: "prism_beam",
    effects: [e("lightPct", 0.08), e("critChance", 0.05)], tags: ["magic", "crit"], color: 0xf0f8ff }),
  relic({ id: "sunstone", name: "Sunstone", category: "component", rarity: "rare", spell: "prism_beam",
    effects: [e("spellDamagePct", 0.05)], spellEffect: { durationFlat: 0.3 }, tags: ["magic"], color: 0xffd060 }),
  relic({ id: "geode_heart", name: "Geode Heart", category: "component", rarity: "uncommon", needs: "quake_totem",
    effects: [e("earthPct", 0.08), e("armor", 8)], tags: ["magic", "armor"], color: 0xb08a5a }),
  relic({ id: "tremor_boots", name: "Tremor Boots", category: "component", rarity: "rare", spell: "quake_totem",
    effects: [e("areaPct", 0.06)], spellEffect: { knockbackPct: 0.30 }, tags: ["magic", "area"], color: 0x8a6a4a }),
  relic({ id: "pyro_lens", name: "Pyro Lens", category: "spell", rarity: "rare", spell: "fireball",
    spellEffect: { damagePct: 0.18, burnDurationFlat: 0.8 }, tags: ["fire", "magic"], color: 0xff6a2a }),
  relic({ id: "frost_lens", name: "Frost Lens", category: "spell", rarity: "rare", spell: "iceball",
    spellEffect: { areaPct: 0.18, slowDurationFlat: 0.5 }, tags: ["ice", "magic"], color: 0x9fe0ff }),
  relic({ id: "storm_lens", name: "Storm Lens", category: "spell", rarity: "rare", spell: "chain_lightning",
    spellEffect: { targets: 1, cooldownPct: -0.08 }, tags: ["lightning", "magic"], color: 0x7fb0ff }),
  relic({ id: "aether_lens", name: "Aether Lens", category: "spell", rarity: "rare", spell: "arcane_bolt",
    spellEffect: { damagePct: 0.18, echoChance: 0.08 }, tags: ["arcane", "magic"], color: 0xc08aff }),
  relic({ id: "sanctuary_lens", name: "Sanctuary Lens", category: "spell", rarity: "rare", spell: "healing_field",
    spellEffect: { healFlat: 1, areaPct: 0.15 }, tags: ["healing", "survival"], color: 0x9fffb0 }),
  relic({ id: "pyre_sigil", name: "Pyre Sigil", category: "core", rarity: "rare",
    effects: [e("firePct", 0.20), e("icePct", -0.10), e("lightningPct", -0.10), e("arcanePct", -0.10)],
    tags: ["fire", "magic", "risk"], color: 0xff4a1a }),
  relic({ id: "rime_charm", name: "Rime Charm", category: "core", rarity: "uncommon",
    effects: [e("icePct", 0.08), e("slowedDamagePct", 0.10)], tags: ["ice", "slow"], color: 0xb0e8ff }),
  relic({ id: "conduit_ring", name: "Conduit Ring", category: "core", rarity: "uncommon",
    effects: [e("lightningPct", 0.08), e("chainEscalate", 0.12)], tags: ["lightning", "chain"], color: 0x6f9aff }),
  relic({ id: "thunder_sigil", name: "Thunder Sigil", category: "core", rarity: "rare",
    effects: [e("lightningPct", 0.20), e("firePct", -0.10), e("icePct", -0.10), e("arcanePct", -0.10)],
    tags: ["lightning", "magic", "risk"], color: 0x4a7aff }),
  relic({ id: "arcanum_sigil", name: "Arcanum Sigil", category: "core", rarity: "rare",
    effects: [e("arcanePct", 0.20), e("echoChance", 0.06), e("firePct", -0.10), e("icePct", -0.10), e("lightningPct", -0.10)],
    tags: ["arcane", "magic", "risk"], color: 0x8a4aff }),
  relic({ id: "echo_stone", name: "Echo Stone", category: "core", rarity: "rare",
    effects: [e("arcanePct", 0.08), e("echoChance", 0.08)], tags: ["arcane", "magic"], color: 0xa88ad9 }),
  relic({ id: "stormglass", name: "Stormglass", category: "core", rarity: "uncommon",
    effects: [e("lightningPct", 0.08), e("critChance", 0.04)], tags: ["lightning", "crit"], color: 0xa8c8ff }),
  relic({ id: "seers_monocle", name: "Seer's Monocle", category: "core", rarity: "rare",
    effects: [e("spellCritChance", 0.12)], tags: ["magic", "crit"], color: 0xe8d8a0 }),
  relic({ id: "prismatic_core", name: "Prismatic Core", category: "core", rarity: "epic",
    effects: [e("firePct", 0.08), e("icePct", 0.08), e("lightningPct", 0.08), e("arcanePct", 0.08), e("spellCritChance", 0.05)],
    tags: ["magic", "fire", "ice", "lightning", "arcane"], color: 0xffe0f8 }),
];

export const RELICS: Record<string, RelicDef> = Object.fromEntries(list.map((r) => [r.id, r]));
export const RELIC_IDS: string[] = list.map((r) => r.id);

/**
 * Relíquias cujos efeitos ainda são os adaptados antes do M12 (não os de `relics.lua`); o teste de paridade compara as
 * outras efeito a efeito. Cada lote do M12-02 a M12-05 tira daqui as que passar a portar como lá.
 */
export const RELIC_ADAPTED: readonly string[] = [
  "frost_crown", "living_moss", "bulwark_core", "renewing_heart", "duelist_crown", "storm_vane", "grave_locket",
];

/** relic_mechanics.lua: os números das mecânicas de relíquia (iguais aos de lá). */
export const RELIC_MECH = {
  /** Momentum: segundos andando até o bônus cheio, e parado até perder tudo */
  momentumRamp: 10,
  momentumFade: 2,
};
