// Atributos derivados do herói: herói + melhorias de nível + relíquias.
import { DR_SPELL_POWER } from "../data/techniques";
import { TUNING } from "../data/tuning";

export type StatKey =
  | "damage" // dano plano somado à base
  | "damagePct"
  | "autoDamagePct" // só o ataque básico e as técnicas (lá, `autoDamagePct`)
  | "spellPower" // poder de magia plano (lá, `spellPowerFlat`; base 8)
  | "spellDamagePct"
  | "firePct"
  | "icePct"
  | "lightningPct"
  | "arcanePct"
  | "burnPct"
  | "slowPct" // pontos de lentidão somados às spells de gelo (lá, plano em pontos)
  | "slowDurationPct"
  | "poisonPct"
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
  | "areaPct"
  | "rangePct"
  | "xpPct"
  | "goldPct"
  | "lifeOnKill";

export type StatBlock = Partial<Record<StatKey, number>>;

export const STAT_KEYS: StatKey[] = [
  "damage", "damagePct", "autoDamagePct", "spellPower", "spellDamagePct", "firePct", "icePct", "lightningPct",
  "arcanePct", "burnPct", "slowPct", "slowDurationPct", "poisonPct", "maxHp", "maxHpPct", "attackSpeedPct", "moveSpeedPct", "critChance",
  "critDamagePct", "armor", "regen", "dodge", "cdrPct", "areaPct", "rangePct",
  "xpPct", "goldPct", "lifeOnKill",
];

export const STAT_LABEL: Record<StatKey, string> = {
  damage: "Damage",
  damagePct: "Damage",
  autoDamagePct: "Auto Damage",
  spellPower: "Spell Power",
  spellDamagePct: "Spell Damage",
  firePct: "Fire Damage",
  icePct: "Ice Damage",
  lightningPct: "Lightning Damage",
  arcanePct: "Arcane Damage",
  burnPct: "Burn Damage",
  slowPct: "Slow",
  slowDurationPct: "Slow Duration",
  poisonPct: "Poison Damage",
  maxHp: "HP",
  maxHpPct: "HP",
  attackSpeedPct: "Attack Speed",
  moveSpeedPct: "Move Speed",
  critChance: "Crit Chance",
  critDamagePct: "Crit Damage",
  armor: "Armor",
  regen: "Regeneration/s",
  dodge: "Dodge",
  cdrPct: "Cooldown",
  areaPct: "Area",
  rangePct: "Range",
  xpPct: "XP earned",
  goldPct: "Gold earned",
  lifeOnKill: "HP per kill",
};

const FLAT: Partial<Record<StatKey, true>> = { spellPower: true, damage: true, maxHp: true, armor: true, regen: true, lifeOnKill: true };

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
  /** só o ataque básico e as técnicas (`hitEnemy`) */
  autoDamage: number;
  /** poder de magia na escala do Dungeon Reign (8 no início) */
  spellPower: number;
  spellDamage: number;
  school: Record<SpellSchoolMult, number>;
  /** queimadura (ataque, técnica e spells de fogo) */
  burn: number;
  /** pontos de lentidão somados às spells de gelo */
  slowPoints: number;
  slowDuration: number;
  poison: number;
  /** o valor global no formato do pool das spells (negativo = mais rápido), somado ao pool de cada uma */
  cooldownValue: number;
  areaValue: number;
  area: number;
  range: number;
  xp: number;
  gold: number;
  lifeOnKill: number;
}

/** Escolas cujo dano tem bônus próprio (D14). As outras spells (cura, lâmina, veneno, vento...) usam 1. */
export type SpellSchoolMult = "fire" | "ice" | "lightning" | "arcane";

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
    autoDamage: Math.max(0.1, 1 + g("autoDamagePct")),
    spellPower: Math.max(1, DR_SPELL_POWER + g("spellPower")),
    spellDamage: Math.max(0.1, 1 + g("spellDamagePct")),
    school: {
      fire: Math.max(0.1, 1 + g("firePct")),
      ice: Math.max(0.1, 1 + g("icePct")),
      lightning: Math.max(0.1, 1 + g("lightningPct")),
      arcane: Math.max(0.1, 1 + g("arcanePct")),
    },
    burn: Math.max(0.1, 1 + g("burnPct")),
    slowPoints: g("slowPct"),
    slowDuration: Math.max(0.2, 1 + g("slowDurationPct")),
    poison: Math.max(0.1, 1 + g("poisonPct")),
    cooldownValue: -g("cdrPct"),
    areaValue: g("areaPct"),
    area: Math.max(0.5, 1 + g("areaPct")),
    range: Math.max(0.5, 1 + g("rangePct")),
    xp: Math.max(0.1, 1 + g("xpPct")),
    gold: Math.max(0.1, 1 + g("goldPct")),
    lifeOnKill: g("lifeOnKill"),
  };
}
