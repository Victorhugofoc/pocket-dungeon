// Atributos derivados do herói: herói + melhorias de nível + relíquias.
import { DR_SPELL_POWER } from "../data/techniques";
import { STACKING, TUNING } from "../data/tuning";
import { ARC_STYLES, AUTO_SHOT, type AutoStyle } from "../data/autostyle";

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
  | "lifeOnKill"
  | "healPct" // cura recebida (lá, `healPct`; Seraph)
  | "bossDamagePct" // dano em chefe (lá, `bossDamagePct`; Smite do Seraph)
  | "burnStacks" // acúmulos extras de queimadura (lá, `burnStacks`; Ignis)
  | "poisonStacks" // acúmulos extras de veneno (lá, `poisonStacks`; Vesper)
  | "techniqueDamagePct" // dano da técnica (lá, `techniqueDamagePct`; Signature)
  | "followThroughPct" // todo o dano por 3 s depois da técnica (lá, `followThroughPct`)
  | "deathHealChance" // chance de curar 10 ao matar (lá, `deathHealChance`; Blood Rite)
  | "championXpPct"
  | "championGoldPct"
  | "survivorRewardPct" // ouro e XP de quem sobra no fim da onda
  | "knockbackPct" // empurrão do ataque básico em inimigo comum (lá, `knockbackPct`)
  // M20-12 parte 2 (H8): tiros extras e a velocidade do tiro, que cada estilo lê do seu jeito
  | "doubleShot"
  | "coneShot"
  | "pierce"
  | "autoProjectileSpeedPct"
  | "fanShots"; // tiros a mais no Fan the Hammer (Quickdraw)

export type StatBlock = Partial<Record<StatKey, number>>;

export const STAT_KEYS: StatKey[] = [
  "damage", "damagePct", "autoDamagePct", "spellPower", "spellDamagePct", "firePct", "icePct", "lightningPct",
  "arcanePct", "burnPct", "slowPct", "slowDurationPct", "poisonPct", "maxHp", "maxHpPct", "attackSpeedPct", "moveSpeedPct", "critChance",
  "critDamagePct", "armor", "regen", "dodge", "cdrPct", "areaPct", "rangePct",
  "xpPct", "goldPct", "lifeOnKill", "healPct", "bossDamagePct", "burnStacks", "poisonStacks",
  "techniqueDamagePct", "followThroughPct", "deathHealChance", "championXpPct", "championGoldPct", "survivorRewardPct",
  "knockbackPct", "doubleShot", "coneShot", "pierce", "autoProjectileSpeedPct", "fanShots",
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
  healPct: "Healing",
  bossDamagePct: "Boss Damage",
  burnStacks: "Burn Stacks",
  poisonStacks: "Poison Stacks",
  techniqueDamagePct: "Technique Damage",
  followThroughPct: "Follow-Through",
  deathHealChance: "Heal on Kill",
  championXpPct: "Champion XP",
  championGoldPct: "Champion Gold",
  survivorRewardPct: "Survivor Reward",
  knockbackPct: "Knockback",
  doubleShot: "Double Shot",
  coneShot: "Cone Shot",
  pierce: "Pierce",
  autoProjectileSpeedPct: "Projectile Speed",
  fanShots: "Fan the Hammer shots",
};

const FLAT: Partial<Record<StatKey, true>> = { spellPower: true, damage: true, maxHp: true, armor: true, regen: true, lifeOnKill: true, burnStacks: true, poisonStacks: true,
  doubleShot: true, coneShot: true, pierce: true, fanShots: true };

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
  /** os valores globais no formato do pool das spells (negativo = mais rápido), somados ao pool de cada uma */
  cooldownValues: number[];
  areaValues: number[];
  area: number;
  range: number;
  xp: number;
  gold: number;
  lifeOnKill: number;
  /** multiplicador da cura recebida: armadura (modifiers.lua `healingMultiplier`) × `healPct` */
  healing: number;
  /** multiplicador do dano em chefe */
  bossDamage: number;
  /** máximo de acúmulos de queimadura (1 + `burnStacks`) */
  burnStacks: number;
  /** acúmulos de veneno a mais por aplicação de veneno do ataque */
  poisonStacks: number;
  /** multiplicador do dano da técnica (Signature) */
  techniqueDamage: number;
  /** bônus de todo o dano nos 3 s depois da técnica (0 = nenhum) */
  followThrough: number;
  /** chance de curar `DEATH_HEAL` ao matar (pool com retorno decrescente) */
  deathHealChance: number;
  championXp: number;
  championGold: number;
  /** multiplicador da recompensa de quem sobra no fim da onda */
  survivor: number;
  /** empurrão do ataque básico (0 = nenhum; distância = `KNOCKBACK.px` × isto) */
  knockback: number;
  /** H8: contagens com o teto de constants.lua `CAPS`; cada estilo lê do seu jeito (`data/autostyle.ts`) */
  doubleShot: number;
  coneShot: number;
  pierce: number;
  /** multiplicador da velocidade do tiro (Heavy Shot); 1 nos estilos que trocam o malus por outra coisa */
  projectileSpeed: number;
  /** Big Iron (Zephyr): dano a mais em quem está perto (0 = nenhum) */
  pointBlank: number;
  fanShots: number;
}

/** Escolas cujo dano tem bônus próprio (D14). As outras spells (cura, lâmina, veneno, vento...) usam 1. */
export type SpellSchoolMult = "fire" | "ice" | "lightning" | "arcane";

export function armorReduction(armor: number): number {
  const a = Math.max(-80, armor);
  return a / (a + 100);
}

/** modifiers.lua §18.1-18.2: percentuais em pool (1 - Π(1 - p) nos positivos, Π(1 - |p|) nos negativos). */
export function stackMultiplier(values: readonly number[]): number {
  let pos = 1;
  let neg = 1;
  for (const v of values) {
    if (v > 0) pos *= 1 - v;
    else if (v < 0) neg *= 1 - Math.abs(v);
  }
  return (1 + (1 - pos)) * neg;
}

/** modifiers.lua `stackChance`: chances em pool, reduzidas pelos negativos, com teto. */
export function stackChance(values: readonly number[], cap = 1): number {
  let pos = 1;
  let neg = 1;
  for (const v of values) {
    if (v > 0) pos *= 1 - v;
    else if (v < 0) neg *= 1 - Math.abs(v);
  }
  return Math.max(0, Math.min(cap, (1 - pos) * neg));
}

/** modifiers.lua §21: teto suave da regeneração. */
export function effectiveRegen(raw: number): number {
  if (raw <= 0) return 0;
  return STACKING.regenSoftcap * (1 - Math.exp(-raw / STACKING.regenSoftcap));
}

/**
 * Junta todas as fontes e devolve os atributos finais (player/stats.lua `compute`). `sources` = herói, cada relíquia,
 * cada melhoria e a loja: cada fonte entra com um valor por atributo. Planos somam; percentuais vão para o pool com
 * retorno decrescente (`stackMultiplier`); chances (crítico, esquiva, cura ao matar) para `stackChance`.
 */
export function computeStats(sources: StatBlock[], style: AutoStyle = "normal"): FinalStats {
  const t = TUNING.hero;
  const lists: Partial<Record<StatKey, number[]>> = {};
  for (const s of sources) {
    for (const k of STAT_KEYS) {
      const v = s[k];
      if (v !== undefined && v !== 0) (lists[k] ??= []).push(v);
    }
  }
  const L = (k: StatKey): number[] => lists[k] ?? [];
  const g = (k: StatKey) => L(k).reduce((a, b) => a + b, 0);
  const m = (k: StatKey) => stackMultiplier(L(k));

  // como no Dungeon Reign, o nível não dá atributo: só as melhorias escolhidas
  const baseHp = t.baseHp + g("maxHp");
  const baseDmg = t.baseDamage + g("damage");
  const armor = g("armor");
  // `cdrPct` positivo = mais rápido; lá `spellCooldownPct` negativo = mais rápido
  const cooldownValues = L("cdrPct").map((v) => -v);
  const areaValues = L("areaPct");
  const count = (k: "doubleShot" | "coneShot" | "pierce") => Math.max(0, Math.min(AUTO_SHOT.caps[k], g(k)));
  // stats.lua (G-06, P-04): o tiro lento do Heavy Shot vira -8% de ritmo nos arcos e no escudo, e Big Iron no Zephyr
  const slow = L("autoProjectileSpeedPct").reduce((a, v) => (v < 0 ? a - v : a), 0);
  const arcLike = ARC_STYLES[style] !== undefined || style === "shieldthrow";
  const gun = style === "gunslinger" && slow > 0;
  const speedMalus = arcLike && slow > 0 ? Math.max(0.3, 1 - slow * AUTO_SHOT.arcSpeedPerSlow) : 1;
  return {
    maxHp: Math.max(1, Math.round(baseHp * Math.max(0.2, m("maxHpPct")))),
    damage: baseDmg * Math.max(0.1, m("damagePct")),
    attackSpeed: Math.max(0.3, m("attackSpeedPct")) * speedMalus,
    moveSpeed: t.moveSpeed * Math.max(0.4, Math.min(1.8, m("moveSpeedPct"))),
    critChance: stackChance([t.baseCritChance, ...L("critChance")], STACKING.critCap),
    critDamage: t.baseCritDamage * m("critDamagePct"),
    armor,
    damageTaken: 1 - armorReduction(armor),
    regen: effectiveRegen(g("regen")),
    dodge: stackChance(L("dodge"), STACKING.dodgeCap),
    cooldownMult: Math.max(STACKING.cooldownFloor, stackMultiplier(cooldownValues)),
    autoDamage: Math.max(0.1, m("autoDamagePct")),
    spellPower: Math.max(1, DR_SPELL_POWER + g("spellPower")),
    spellDamage: Math.max(0.1, m("spellDamagePct")),
    school: {
      fire: Math.max(0.1, m("firePct")),
      ice: Math.max(0.1, m("icePct")),
      lightning: Math.max(0.1, m("lightningPct")),
      arcane: Math.max(0.1, m("arcanePct")),
    },
    burn: Math.max(0.1, m("burnPct")),
    slowPoints: g("slowPct"),
    slowDuration: Math.max(0.2, m("slowDurationPct")),
    poison: Math.max(0.1, m("poisonPct")),
    cooldownValues,
    areaValues,
    area: Math.max(0.5, stackMultiplier(areaValues)),
    range: Math.max(0.5, m("rangePct")),
    xp: Math.max(0.1, m("xpPct")),
    gold: Math.max(0.1, m("goldPct")),
    lifeOnKill: g("lifeOnKill"),
    healing: (armor > 0 ? 1 + armor / (armor + 60) : 1) * Math.max(0.1, m("healPct")),
    bossDamage: Math.max(0.1, m("bossDamagePct")),
    burnStacks: 1 + Math.max(0, g("burnStacks")),
    poisonStacks: Math.max(0, g("poisonStacks")),
    techniqueDamage: Math.max(0.1, m("techniqueDamagePct")),
    followThrough: Math.max(0, m("followThroughPct") - 1),
    deathHealChance: stackChance(L("deathHealChance")),
    championXp: Math.max(0.1, m("championXpPct")),
    championGold: Math.max(0.1, m("championGoldPct")),
    survivor: Math.max(0.1, m("survivorRewardPct")),
    knockback: Math.max(0, m("knockbackPct") - 1),
    doubleShot: count("doubleShot"),
    coneShot: count("coneShot"),
    pierce: count("pierce"),
    projectileSpeed: arcLike || gun ? 1 : Math.max(0.3, m("autoProjectileSpeedPct")),
    pointBlank: gun ? slow * AUTO_SHOT.pointBlankPerSlow : 0,
    fanShots: Math.max(0, g("fanShots")),
  };
}
