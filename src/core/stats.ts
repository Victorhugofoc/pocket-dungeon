// Atributos derivados do herói: nível + pontos + equipamentos + relíquias.
import { TUNING } from "../data/tuning";

export type StatKey =
  | "damage" // dano plano somado à base
  | "damagePct"
  | "maxHp" // vida plana
  | "maxHpPct"
  | "attackSpeedPct"
  | "moveSpeedPct"
  | "critChance"
  | "critDamagePct"
  | "armor"
  | "regen"
  | "dodge"
  | "cdrPct"
  | "statusPct"
  | "areaPct"
  | "rangePct"
  | "xpPct"
  | "magicFind"
  | "lifeOnKill";

export type StatBlock = Partial<Record<StatKey, number>>;

export const STAT_KEYS: StatKey[] = [
  "damage", "damagePct", "maxHp", "maxHpPct", "attackSpeedPct", "moveSpeedPct", "critChance",
  "critDamagePct", "armor", "regen", "dodge", "cdrPct", "statusPct", "areaPct", "rangePct",
  "xpPct", "magicFind", "lifeOnKill",
];

export const STAT_LABEL: Record<StatKey, string> = {
  damage: "Dano",
  damagePct: "Dano",
  maxHp: "Vida",
  maxHpPct: "Vida",
  attackSpeedPct: "Vel. de ataque",
  moveSpeedPct: "Vel. de movimento",
  critChance: "Chance de crítico",
  critDamagePct: "Dano crítico",
  armor: "Armadura",
  regen: "Regeneração/s",
  dodge: "Esquiva",
  cdrPct: "Recarga da técnica",
  statusPct: "Efeitos (queimar, veneno, gelo)",
  areaPct: "Área",
  rangePct: "Alcance",
  xpPct: "XP ganho",
  magicFind: "Sorte de loot",
  lifeOnKill: "Vida por abate",
};

const FLAT: Partial<Record<StatKey, true>> = { damage: true, maxHp: true, armor: true, regen: true, lifeOnKill: true };

export function isFlat(k: StatKey): boolean {
  return FLAT[k] === true;
}

export function formatStat(k: StatKey, v: number): string {
  const sign = v >= 0 ? "+" : "";
  if (isFlat(k)) return `${sign}${Math.round(v * 10) / 10} ${STAT_LABEL[k]}`;
  return `${sign}${Math.round(v * 1000) / 10}% ${STAT_LABEL[k]}`;
}

export function addStats(into: StatBlock, from: StatBlock | undefined, mult = 1): void {
  if (!from) return;
  for (const k of STAT_KEYS) {
    const v = from[k];
    if (v !== undefined) into[k] = (into[k] ?? 0) + v * mult;
  }
}

export interface Attributes {
  forca: number;
  vigor: number;
  agilidade: number;
  foco: number;
}

export const ATTR_KEYS: (keyof Attributes)[] = ["forca", "vigor", "agilidade", "foco"];

export const ATTR_INFO: Record<keyof Attributes, { name: string; text: string }> = {
  forca: { name: "Força", text: "+3% dano" },
  vigor: { name: "Vigor", text: "+4% vida, +0,05 regeneração" },
  agilidade: { name: "Agilidade", text: "+1,5% vel. de ataque, +0,6% movimento" },
  foco: { name: "Foco", text: "-1,2% recarga, +3% efeitos, +1% área" },
};

export interface FinalStats {
  maxHp: number;
  damage: number;
  attackSpeed: number; // multiplicador
  moveSpeed: number; // unidades/s
  critChance: number;
  critDamage: number; // multiplicador
  armor: number;
  damageTaken: number; // multiplicador após armadura
  regen: number;
  dodge: number;
  cooldownMult: number;
  status: number; // multiplicador
  area: number;
  range: number;
  xp: number;
  magicFind: number;
  lifeOnKill: number;
}

export function armorReduction(armor: number): number {
  const a = Math.max(-80, armor);
  return a / (a + 100);
}

/** Soma todas as fontes e devolve os atributos finais. `sources` = herói, itens e relíquias. */
export function computeStats(level: number, attrs: Attributes, sources: StatBlock[]): FinalStats {
  const t = TUNING.hero;
  const sum: StatBlock = {};
  for (const s of sources) addStats(sum, s);
  addStats(sum, TUNING.attributes.forca, attrs.forca);
  addStats(sum, TUNING.attributes.vigor, attrs.vigor);
  addStats(sum, TUNING.attributes.agilidade, attrs.agilidade);
  addStats(sum, TUNING.attributes.foco, attrs.foco);
  const g = (k: StatKey) => sum[k] ?? 0;

  const baseHp = t.baseHp + t.hpPerLevel * (level - 1) + g("maxHp");
  const baseDmg = (t.baseDamage + g("damage")) * (1 + t.damagePctPerLevel * (level - 1));
  const armor = g("armor");
  return {
    maxHp: Math.max(1, Math.round(baseHp * Math.max(0.2, 1 + g("maxHpPct")))),
    damage: baseDmg * Math.max(0.1, 1 + g("damagePct")),
    attackSpeed: Math.max(0.3, 1 + g("attackSpeedPct")),
    moveSpeed: t.moveSpeed * Math.max(0.4, Math.min(1.8, 1 + g("moveSpeedPct"))),
    critChance: Math.min(0.75, t.baseCritChance + g("critChance")),
    critDamage: t.baseCritDamage + g("critDamagePct"),
    armor,
    damageTaken: 1 - armorReduction(armor),
    regen: g("regen"),
    dodge: Math.min(0.6, Math.max(0, g("dodge"))),
    cooldownMult: Math.max(0.4, 1 - g("cdrPct")),
    status: Math.max(0.2, 1 + g("statusPct")),
    area: Math.max(0.5, 1 + g("areaPct")),
    range: Math.max(0.5, 1 + g("rangePct")),
    xp: Math.max(0.1, 1 + g("xpPct")),
    magicFind: g("magicFind"),
    lifeOnKill: g("lifeOnKill"),
  };
}

export function xpToNext(level: number): number {
  const x = TUNING.xp;
  return Math.round(x.a * Math.pow(level, x.exp) + x.b * level);
}
