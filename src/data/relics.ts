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

/** Atributos daqui com outro nome lá (relics.lua): o valor de lá é multiplicado pelo sinal (`spellCooldownPct` negativo é recarga menor). */
export const RELIC_STAT_FROM_LUA: Readonly<Record<string, { stat: StatKey; sign: number }>> = {
  spellCooldownPct: { stat: "cdrPct", sign: -1 },
};
