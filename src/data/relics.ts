// Relíquias: bônus permanentes, escolhidos ao derrotar um chefe (1 de 3) ou achados em campeões.
// Nomes e efeitos de dungeon-idle/src/data/relics.lua (núcleo e componentes), adaptados aos atributos do RPG.
import type { StatBlock } from "../core/stats";

export interface RelicDef {
  id: string;
  name: string;
  rarity: "incomum" | "raro" | "epico";
  stats: StatBlock;
  color: number;
}

const list: RelicDef[] = [
  { id: "blood_pact", name: "Blood Pact", rarity: "raro", stats: { damagePct: 0.25, maxHpPct: -0.15 }, color: 0xd9344a },
  { id: "arcane_core", name: "Arcane Core", rarity: "raro", stats: { cdrPct: 0.20 }, color: 0xb07aff },
  { id: "hunters_eye", name: "Hunter's Eye", rarity: "incomum", stats: { rangePct: 0.35 }, color: 0x7ad94a },
  { id: "ember_heart", name: "Ember Heart", rarity: "raro", stats: { statusPct: 0.40 }, color: 0xff7a1a },
  { id: "frost_crown", name: "Frost Crown", rarity: "raro", stats: { statusPct: 0.20, armor: 8 }, color: 0x8fdcff },
  { id: "greedy_soul", name: "Greedy Soul", rarity: "incomum", stats: { magicFind: 0.35, damagePct: -0.10 }, color: 0xffd34d },
  { id: "glass_cannon", name: "Glass Cannon", rarity: "epico", stats: { damagePct: 0.50, maxHpPct: -0.30 }, color: 0xffffff },
  { id: "living_moss", name: "Living Moss", rarity: "raro", stats: { regen: 1.2 }, color: 0x5fbf5f },
  { id: "mirror_veil", name: "Mirror Veil", rarity: "raro", stats: { dodge: 0.15 }, color: 0xc8d9ff },
  { id: "aegis_heart", name: "Aegis Heart", rarity: "incomum", stats: { maxHpPct: 0.12, armor: 10 }, color: 0xffdb73 },
  { id: "bulwark_core", name: "Bulwark Core", rarity: "raro", stats: { armor: 18, regen: 0.8, attackSpeedPct: -0.06 }, color: 0x9aa8b8 },
  { id: "renewing_heart", name: "Renewing Heart", rarity: "raro", stats: { regen: 1.0, maxHpPct: 0.08 }, color: 0xff8fa8 },
  { id: "evasion_circuit", name: "Evasion Circuit", rarity: "incomum", stats: { dodge: 0.07, moveSpeedPct: 0.08 }, color: 0x73ffcc },
  { id: "duelist_seal", name: "Duelist Seal", rarity: "raro", stats: { critChance: 0.07, critDamagePct: 0.10 }, color: 0xffe066 },
  { id: "duelist_gloves", name: "Duelist Gloves", rarity: "raro", stats: { attackSpeedPct: 0.10, critChance: 0.05 }, color: 0xe6b366 },
  { id: "scavenger_badge", name: "Scavenger Badge", rarity: "incomum", stats: { magicFind: 0.12, xpPct: 0.08 }, color: 0xc8a06a },
  { id: "titan_sigil", name: "Titan Sigil", rarity: "epico", stats: { maxHpPct: 0.12, armor: 12, dodge: 0.05 }, color: 0xb9c2cc },
  { id: "duelist_crown", name: "Duelist Crown", rarity: "epico", stats: { damagePct: 0.10, critChance: 0.07, attackSpeedPct: 0.08 }, color: 0xffc83d },
  { id: "storm_vane", name: "Storm Vane", rarity: "raro", stats: { areaPct: 0.20 }, color: 0x6fa8ff },
  { id: "grave_locket", name: "Grave Locket", rarity: "raro", stats: { lifeOnKill: 2, xpPct: 0.10 }, color: 0x9ad1ff },
];

export const RELICS: Record<string, RelicDef> = Object.fromEntries(list.map((r) => [r.id, r]));
export const RELIC_IDS: string[] = list.map((r) => r.id);
