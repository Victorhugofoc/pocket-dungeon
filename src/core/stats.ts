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
  | "fanShots" // tiros a mais no Fan the Hammer (Quickdraw)
  // M20-12 parte 3: as exclusivas de herói (contagens, menos `riftDurationFlat` em s e `executionerPct`)
  | "permafrost"
  | "staticCharge"
  | "riftDurationFlat"
  | "wildfire"
  | "executionerPct"
  | "nightfall"
  | "judgement"
  | "contagion"
  | "shieldBoomerang"
  | "shieldRicochet"
  // M12-02: mecânicas de relíquia (relic_mechanics.lua), ligadas pelo atributo; o efeito roda em `core/relics.ts`
  | "momentumPct"
  | "levelHealPct"
  | "overhealShield"
  // M12-03: escolas das spells novas, e o que as relíquias de spell somam (nomes de stats.lua)
  | "windPct"
  | "runePct"
  | "lightPct"
  | "earthPct"
  | "lightningTargets" // alvos a mais nas spells com alvos (Chain Lightning)
  | "echoChance" // chance de Echo (Arcane Bolt), no pool da spell
  | "volatileChance" // chance de Volatile (Fireball), no pool da spell
  | "spellCritChance" // as spells só dão crítico com isto (damage.lua `SPELL_SOURCES`)
  | "slowedDamagePct" // dano em inimigo com Slow (damage.lua §37)
  | "chainEscalate" // Conduit Ring: cada salto do raio, +isto de dano
  // M12-04: mecânicas de relíquia do lote 3 (relic_mechanics.lua, D-438 e D-433)
  | "burnSpread" // Cinder Lens: quem morre queimando passa a queimadura ao vizinho
  | "frostbite" // Frost Crown: inimigo com Slow por 3 s congela por isto (s)
  | "untouchedPct" // Glass Throne: dano a mais enquanto não leva golpe
  | "arcaneDominion" // Arcane Dominion: o ataque recebe os bônus de dano de spell e de Arcane
  | "castHealPct" // Mana Battery: cada spell cura isto da vida máxima
  | "prismCycle" // Prism Cycle: dano a mais na escola da vez
  // M12-05: mecânicas das exclusivas (relic_mechanics.lua, D-433) e os custos delas
  | "killStreak" // Kill Streak: velocidade de ataque por abate seguido
  | "lastRites" // Last Rites: o campeão explode ao morrer com isto da vida dele
  | "hoardPct" // Hoarder's Crown: até isto de dano pelo ouro guardado
  | "oathPct" // Berserker's Oath: isto de dano a cada 10% de vida perdida
  | "noCombatHeal" // Berserker's Oath: sem cura durante a onda
  | "championHpPct" // vida dos campeões (custo do Champion's Trophy e do Last Rites)
  | "shopPricePct"; // preços da loja (custo do Hoarder's Crown)

export type StatBlock = Partial<Record<StatKey, number>>;

export const STAT_KEYS: StatKey[] = [
  "damage", "damagePct", "autoDamagePct", "spellPower", "spellDamagePct", "firePct", "icePct", "lightningPct",
  "arcanePct", "burnPct", "slowPct", "slowDurationPct", "poisonPct", "maxHp", "maxHpPct", "attackSpeedPct", "moveSpeedPct", "critChance",
  "critDamagePct", "armor", "regen", "dodge", "cdrPct", "areaPct", "rangePct",
  "xpPct", "goldPct", "lifeOnKill", "healPct", "bossDamagePct", "burnStacks", "poisonStacks",
  "techniqueDamagePct", "followThroughPct", "deathHealChance", "championXpPct", "championGoldPct", "survivorRewardPct",
  "knockbackPct", "doubleShot", "coneShot", "pierce", "autoProjectileSpeedPct", "fanShots",
  "permafrost", "staticCharge", "riftDurationFlat", "wildfire", "executionerPct", "nightfall", "judgement", "contagion",
  "shieldBoomerang", "shieldRicochet", "momentumPct", "levelHealPct", "overhealShield",
  "windPct", "runePct", "lightPct", "earthPct", "lightningTargets", "echoChance", "volatileChance", "spellCritChance",
  "slowedDamagePct", "chainEscalate", "burnSpread", "frostbite", "untouchedPct", "arcaneDominion", "castHealPct", "prismCycle",
  "killStreak", "lastRites", "hoardPct", "oathPct", "noCombatHeal", "championHpPct", "shopPricePct",
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
  permafrost: "Permafrost",
  staticCharge: "Static Charge",
  riftDurationFlat: "Time Rift duration (s)",
  wildfire: "Wildfire",
  executionerPct: "Executioner",
  nightfall: "Nightfall",
  judgement: "Judgement",
  contagion: "Contagion",
  shieldBoomerang: "Boomerang",
  shieldRicochet: "Holy Ricochet",
  momentumPct: "Momentum",
  levelHealPct: "Level-up heal",
  overhealShield: "Overheal shield",
  windPct: "Wind Damage",
  runePct: "Rune Damage",
  lightPct: "Light Damage",
  earthPct: "Earth Damage",
  lightningTargets: "Lightning target(s)",
  echoChance: "Echo chance",
  volatileChance: "Volatile chance",
  spellCritChance: "Spell Crit",
  slowedDamagePct: "damage vs. Slowed targets",
  chainEscalate: "Lightning jump damage",
  burnSpread: "Burn spread",
  frostbite: "Frostbite",
  untouchedPct: "damage while untouched",
  arcaneDominion: "Arcane Dominion",
  castHealPct: "heal per cast",
  prismCycle: "Prism Cycle",
  killStreak: "Kill Streak",
  lastRites: "Last Rites",
  hoardPct: "Hoarder's Crown",
  oathPct: "Berserker's Oath",
  noCombatHeal: "no healing in waves",
  championHpPct: "Champion HP",
  shopPricePct: "Shop prices",
};

/** format.lua `MECH`: as mecânicas de relíquia se leem como uma frase (texto de en.lua). */
const MECH_TEXT: Partial<Record<StatKey, (pct: number, v: number) => string>> = {
  momentumPct: (p) => `Up to +${p}% damage while moving (fills in 10 s, fades when still)`,
  levelHealPct: (p) => `Levelling up heals ${p}% HP`,
  overhealShield: (p) => `Healing past max HP becomes a shield (up to ${p}% HP)`,
  chainEscalate: (p) => `Each Lightning jump: +${p}% damage`,
  burnSpread: () => "An enemy that dies burning passes its Burn on",
  frostbite: (_p, v) => `An enemy Slowed for 3 s freezes for ${v.toFixed(1)} s`,
  untouchedPct: (p) => `+${p}% damage; taking a hit removes the bonus for 5 s`,
  arcaneDominion: () => "Auto Attack gets the Spell Damage and Arcane bonuses",
  castHealPct: (_p, v) => `Each spell cast heals ${(v * 100).toFixed(1)}% HP (min. 1)`,
  prismCycle: (p) => `+${p}% damage to the element of the moment (changes every 5 s)`,
  killStreak: () => "+3% Attack Speed per kill in a row (up to 10; resets when hit)",
  lastRites: (p) => `Champions explode on death: ${p}% of their HP in an area`,
  hoardPct: (p) => `+1% damage per 100 gold held (up to +${p}%)`,
  oathPct: (p) => `+${p}% damage per 10% HP missing`,
  noCombatHeal: () => "No healing during waves",
};

const FLAT: Partial<Record<StatKey, true>> = { spellPower: true, damage: true, maxHp: true, armor: true, regen: true, lifeOnKill: true, burnStacks: true, poisonStacks: true,
  doubleShot: true, coneShot: true, pierce: true, fanShots: true,
  permafrost: true, staticCharge: true, riftDurationFlat: true, wildfire: true, nightfall: true, judgement: true, contagion: true,
  shieldBoomerang: true, shieldRicochet: true, lightningTargets: true };

export function isFlat(k: StatKey): boolean {
  return FLAT[k] === true;
}

export function formatStat(k: StatKey, v: number): string {
  const sign = v >= 0 ? "+" : "";
  const mech = MECH_TEXT[k];
  if (mech) return mech(Math.round(v * 100), v);
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
  /** M20-12 parte 3 (stats.lua `sum`): as exclusivas de herói, somadas sem retorno decrescente */
  permafrost: number;
  staticCharge: number;
  riftDuration: number;
  wildfire: number;
  /** dano a mais em chefe abaixo de `HERO_UPGRADES.executionerBelow` da vida */
  executioner: number;
  nightfall: number;
  judgement: number;
  contagion: number;
  shieldBoomerang: number;
  shieldRicochet: number;
  /** M12-03 (stats.lua): alvos a mais nas spells com alvos */
  lightningTargets: number;
  /** chances de Echo e Volatile no formato do pool, somadas ao pool da spell (stats.lua `echoValues`, `volatileValues`) */
  echoValues: number[];
  volatileValues: number[];
  /** chance de crítico das spells (a arma não conta) */
  spellCritChance: number;
  /** multiplicador do dano em inimigo com Slow */
  slowedDamage: number;
  /** Conduit Ring: dano a mais por salto do raio */
  chainEscalate: number;
  /** M12-05 (stats.lua `championHpMult`, `shopPriceMult`): vida dos campeões e preços da loja */
  championHp: number;
  shopPrice: number;
}

/** Escolas cujo dano tem bônus próprio (D14; vento, runa, luz e terra no M12-03). As outras (cura, lâmina, veneno) usam 1. */
export type SpellSchoolMult = "fire" | "ice" | "lightning" | "arcane" | "wind" | "rune" | "light" | "earth";

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
    // stats.lua: ARCANE DOMINION põe os bônus de dano de spell e de Arcane no ataque
    autoDamage: Math.max(0.1, m("autoDamagePct")) * (g("arcaneDominion") > 0 ? Math.max(0.1, m("spellDamagePct")) * Math.max(0.1, m("arcanePct")) : 1),
    spellPower: Math.max(1, DR_SPELL_POWER + g("spellPower")),
    spellDamage: Math.max(0.1, m("spellDamagePct")),
    school: {
      fire: Math.max(0.1, m("firePct")),
      ice: Math.max(0.1, m("icePct")),
      lightning: Math.max(0.1, m("lightningPct")),
      arcane: Math.max(0.1, m("arcanePct")),
      wind: Math.max(0.1, m("windPct")),
      rune: Math.max(0.1, m("runePct")),
      light: Math.max(0.1, m("lightPct")),
      earth: Math.max(0.1, m("earthPct")),
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
    permafrost: Math.max(0, g("permafrost")),
    staticCharge: Math.max(0, g("staticCharge")),
    riftDuration: Math.max(0, g("riftDurationFlat")),
    wildfire: Math.max(0, g("wildfire")),
    executioner: Math.max(0, g("executionerPct")),
    nightfall: Math.max(0, g("nightfall")),
    judgement: Math.max(0, g("judgement")),
    contagion: Math.max(0, g("contagion")),
    shieldBoomerang: Math.max(0, g("shieldBoomerang")),
    shieldRicochet: Math.max(0, g("shieldRicochet")),
    lightningTargets: Math.max(0, g("lightningTargets")),
    echoValues: L("echoChance"),
    volatileValues: L("volatileChance"),
    spellCritChance: stackChance(L("spellCritChance")),
    slowedDamage: Math.max(0.1, m("slowedDamagePct")),
    chainEscalate: g("chainEscalate"),
    championHp: Math.max(0.1, m("championHpPct")),
    shopPrice: Math.max(0.1, m("shopPricePct")),
  };
}
