// Atributos derivados do herói: herói + melhorias de nível + relíquias.
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
  | "goldPct"
  | "lifeOnKill";

export type StatBlock = Partial<Record<StatKey, number>>;

export const STAT_KEYS: StatKey[] = [
  "damage", "damagePct", "maxHp", "maxHpPct", "attackSpeedPct", "moveSpeedPct", "critChance",
  "critDamagePct", "armor", "regen", "dodge", "cdrPct", "statusPct", "areaPct", "rangePct",
  "xpPct", "goldPct", "lifeOnKill",
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
  goldPct: "Ouro ganho",
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
  gold: number;
  lifeOnKill: number;
}

export function armorReduction(armor: number): number {
  const a = Math.max(-80, armor);
  return a / (a + 100);
}

/** Soma todas as fontes e devolve os atributos finais. `sources` = herói, melhorias e relíquias. */
export function computeStats(sources: StatBlock[]): FinalStats {
  const t = TUNING.hero;
  const sum: StatBlock = {};
  for (const s of sources) addStats(sum, s);
  const g = (k: StatKey) => sum[k] ?? 0;

  // como no Dungeon Reign, o nível não dá atributo: só as melhorias escolhidas
  const baseHp = t.baseHp + g("maxHp");
  const baseDmg = t.baseDamage + g("damage");
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
    gold: Math.max(0.1, 1 + g("goldPct")),
    lifeOnKill: g("lifeOnKill"),
  };
}
