// Equipamentos: 3 espaços, 5 raridades, afixos aleatórios escalados pelo nível do item.
import { Rng } from "./rng";
import { TUNING } from "../data/tuning";
import type { StatBlock, StatKey } from "./stats";

export type Slot = "weapon" | "armor" | "trinket";
export type Rarity = "comum" | "incomum" | "raro" | "epico" | "lendario";

export const SLOTS: Slot[] = ["weapon", "armor", "trinket"];
export const RARITIES: Rarity[] = ["comum", "incomum", "raro", "epico", "lendario"];

export const SLOT_LABEL: Record<Slot, string> = { weapon: "Arma", armor: "Armadura", trinket: "Amuleto" };
export const RARITY_LABEL: Record<Rarity, string> = {
  comum: "Comum", incomum: "Incomum", raro: "Raro", epico: "Épico", lendario: "Lendário",
};
export const RARITY_COLOR: Record<Rarity, string> = {
  comum: "#c9ccd3", incomum: "#5fd35f", raro: "#4aa3ff", epico: "#c86bff", lendario: "#ffb02e",
};

const RARITY_AFFIXES: Record<Rarity, number> = { comum: 0, incomum: 1, raro: 2, epico: 3, lendario: 4 };
const RARITY_POWER: Record<Rarity, number> = { comum: 1, incomum: 1.12, raro: 1.26, epico: 1.42, lendario: 1.65 };

export interface Item {
  id: string;
  slot: Slot;
  rarity: Rarity;
  ilvl: number;
  /** nome sem a base; a base da arma depende do herói (Maça, Revólveres...) */
  suffix: string;
  stats: StatBlock;
}

interface AffixDef {
  key: StatKey;
  min: number;
  max: number;
  /** crescimento por nível de item (fração do valor) */
  growth: number;
  suffix: string;
  slots?: Slot[];
}

const AFFIXES: AffixDef[] = [
  { key: "damagePct", min: 0.04, max: 0.09, growth: 0.02, suffix: "da Fúria" },
  { key: "maxHpPct", min: 0.04, max: 0.09, growth: 0.02, suffix: "do Urso" },
  { key: "attackSpeedPct", min: 0.03, max: 0.07, growth: 0.015, suffix: "do Vento" },
  { key: "critChance", min: 0.02, max: 0.045, growth: 0.012, suffix: "do Falcão" },
  { key: "critDamagePct", min: 0.08, max: 0.18, growth: 0.02, suffix: "do Carrasco" },
  { key: "moveSpeedPct", min: 0.02, max: 0.05, growth: 0.008, suffix: "da Lebre", slots: ["armor", "trinket"] },
  { key: "armor", min: 3, max: 7, growth: 0.07, suffix: "da Muralha", slots: ["armor", "trinket"] },
  { key: "regen", min: 0.2, max: 0.5, growth: 0.08, suffix: "da Hera" },
  { key: "dodge", min: 0.02, max: 0.04, growth: 0.008, suffix: "da Névoa", slots: ["armor", "trinket"] },
  { key: "cdrPct", min: 0.03, max: 0.06, growth: 0.01, suffix: "do Relógio" },
  { key: "statusPct", min: 0.06, max: 0.14, growth: 0.02, suffix: "da Peste" },
  { key: "areaPct", min: 0.04, max: 0.09, growth: 0.012, suffix: "do Trovão" },
  { key: "rangePct", min: 0.04, max: 0.09, growth: 0.008, suffix: "do Horizonte", slots: ["weapon", "trinket"] },
  { key: "xpPct", min: 0.03, max: 0.07, growth: 0.006, suffix: "do Aprendiz", slots: ["trinket"] },
  { key: "magicFind", min: 0.05, max: 0.12, growth: 0.01, suffix: "da Fortuna", slots: ["trinket", "armor"] },
  { key: "lifeOnKill", min: 0.6, max: 1.4, growth: 0.07, suffix: "do Vampiro", slots: ["weapon", "trinket"] },
];

function round(key: StatKey, v: number): number {
  return key === "armor" ? Math.round(v) : Math.round(v * 1000) / 1000;
}

export function rollRarity(rng: Rng, magicFind: number, min: Rarity = "comum"): Rarity {
  const w = TUNING.loot.rarityWeights;
  const mf = 1 + Math.max(0, magicFind);
  const entries: [Rarity, number][] = [
    ["comum", w.comum],
    ["incomum", w.incomum * mf],
    ["raro", w.raro * mf * mf],
    ["epico", w.epico * mf * mf],
    ["lendario", w.lendario * mf * mf],
  ];
  const minIdx = RARITIES.indexOf(min);
  return rng.weighted(entries.filter(([r]) => RARITIES.indexOf(r) >= minIdx));
}

let counter = 0;

export function generateItem(rng: Rng, ilvl: number, magicFind = 0, opts: { slot?: Slot; minRarity?: Rarity } = {}): Item {
  const slot = opts.slot ?? rng.pick(SLOTS);
  const rarity = rollRarity(rng, magicFind, opts.minRarity);
  const power = RARITY_POWER[rarity];
  const stats: StatBlock = {};

  // atributo implícito do espaço
  if (slot === "weapon") {
    stats.damage = Math.round((2 + 1.1 * ilvl) * power * rng.range(0.92, 1.08) * 10) / 10;
  } else if (slot === "armor") {
    stats.maxHp = Math.round((12 + 7 * ilvl) * power * rng.range(0.92, 1.08));
    stats.armor = Math.round((2 + 0.8 * ilvl) * power);
  } else {
    stats.damage = Math.round((0.6 + 0.3 * ilvl) * power * 10) / 10;
    stats.maxHp = Math.round((5 + 2.5 * ilvl) * power);
  }

  const pool = AFFIXES.filter((a) => !a.slots || a.slots.includes(slot));
  rng.shuffle(pool);
  const chosen = pool.slice(0, RARITY_AFFIXES[rarity]);
  for (const a of chosen) {
    const v = rng.range(a.min, a.max) * (1 + a.growth * (ilvl - 1)) * (rarity === "lendario" ? 1.2 : 1);
    stats[a.key] = round(a.key, (stats[a.key] ?? 0) + v);
  }

  counter++;
  return {
    id: `i${Date.now().toString(36)}${counter.toString(36)}${Math.floor(rng.next() * 1e6).toString(36)}`,
    slot,
    rarity,
    ilvl,
    suffix: chosen.length ? chosen[0].suffix : "",
    stats,
  };
}

/** Nota única para comparar itens do mesmo espaço (maior = melhor, aproximação). */
export function itemScore(item: Item): number {
  const s = item.stats;
  const g = (k: StatKey) => s[k] ?? 0;
  return (
    g("damage") * 6 + g("maxHp") * 0.5 + g("armor") * 2 + g("regen") * 20 + g("lifeOnKill") * 10 +
    (g("damagePct") + g("maxHpPct") * 0.8 + g("attackSpeedPct") + g("critChance") * 1.6 + g("critDamagePct") * 0.5 +
      g("moveSpeedPct") * 0.8 + g("dodge") * 1.5 + g("cdrPct") * 0.8 + g("statusPct") * 0.5 + g("areaPct") * 0.5 +
      g("rangePct") * 0.5 + g("xpPct") * 0.4 + g("magicFind") * 0.4) * 400
  );
}

export function itemName(item: Item, weaponName: string): string {
  const base = item.slot === "weapon" ? weaponName : item.slot === "armor" ? "Armadura" : "Amuleto";
  return item.suffix ? `${base} ${item.suffix}` : base;
}
