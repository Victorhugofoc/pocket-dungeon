// Melhorias de nível do Dungeon Reign (marco M20-03). Fonte em dungeon-idle: src/data/upgrades.lua (a lista, na
// mesma ordem), src/core/constants.lua (`CAPS`), src/build/build_fit.lua (peso no sorteio) e src/ui/format.lua (quais
// atributos são porcentagem, para o arredondamento das raridades). Conferido em tests/parity.test.ts.
//
// Os efeitos usam os atributos de lá (`DrStat`). `UPGRADE_STAT` diz como cada um vira atributo daqui; uma melhoria
// só é oferecida quando todos os efeitos dela já existem no jogo (`upgradeLive` em core/levelup.ts).
import type { StatKey } from "../core/stats";
import { BEHAVIOR_EPICS } from "./epics";

export interface UpgradeEffect {
  stat: string;
  value: number;
}

export interface UpgradeDef {
  id: string;
  name: string;
  effects: UpgradeEffect[];
  tags: string[];
  /** texto da carta (o original escreve em português) */
  note?: string;
  /** conteúdo da extensão do original (no jogo de lá vem ligado) */
  extension?: boolean;
  /** só sai se a build já tiver este tanto de Cone Shot */
  requiresConeShot?: number;
  /** melhoria exclusiva de um herói */
  hero?: string;
  /** heróis que nunca a recebem */
  notFor?: Record<string, true>;
  minWave?: number;
  unique?: boolean;
  /** peso no sorteio (1 se faltar) */
  weight?: number;
  /** nunca muda de raridade */
  noTier?: boolean;
  /** a carta mostra só o texto, sem os números */
  hideEffects?: boolean;
  /** nunca sai como comum */
  minTier?: "rare";
  /** pegar esta fecha a outra */
  excludes?: string;
  /** cura a vida toda ao pegar */
  fullHeal?: boolean;
  /** épica de comportamento (M21-07, data/epics.ts): sem atributo, raridade épica fixa */
  behavior?: boolean;
}

const U: UpgradeDef[] = [];

function up(id: string, name: string, effects: [string, number][], tags: string[] = [], extra: Partial<UpgradeDef> = {}): UpgradeDef {
  const u: UpgradeDef = { id, name, effects: effects.map(([stat, value]) => ({ stat, value })), tags, ...extra };
  U.push(u);
  return u;
}

// Ataque
up("spellweave", "SPELLWEAVE", [["spellPowerFlat", 2]], ["magic"], { extension: true });
up("brutality", "BRUTALITY", [["damageFlat", 2]], ["auto", "damage"]);
up("rapid_strike", "RAPID STRIKE", [["attackSpeedPct", 0.14]], ["auto", "speed"]);
up("deadly_edge", "DEADLY EDGE", [["autoDamagePct", 0.10]], ["auto", "damage"]);
up("critical_edge", "CRITICAL EDGE", [["critChance", 0.12]], ["auto", "crit"]);
up("double_shot", "DOUBLE SHOT", [["doubleShot", 1]], ["auto", "projectile"]);
up("cone_shot", "CONE SHOT", [["coneShot", 1]], ["auto", "projectile", "spread"]);
up("piercing_round", "PIERCING ROUND", [["pierce", 1]], ["auto", "projectile", "pierce"]);
up("glass_cannon", "GLASS CANNON", [["autoDamagePct", 0.20], ["armor", -15]], ["auto", "damage", "risk"]);
up("heavy_shot", "HEAVY SHOT", [["autoDamagePct", 0.18], ["knockbackPct", 0.15], ["autoProjectileSpeedPct", -0.15]],
  ["auto", "damage", "projectile", "tradeoff"], { note: "Pushes the enemy you hit backwards (bosses and Champions are immune)." });
up("concussive_rounds", "CONCUSSIVE ROUNDS", [["knockbackPct", 0.25]], ["auto", "control"],
  { note: "Pushes the enemy you hit backwards (bosses and Champions are immune).", extension: true });
up("wide_bore", "WIDE BORE", [["coneShot", 1], ["autoDamagePct", -0.08]], ["auto", "spread", "tradeoff"]);
up("focused_volley", "FOCUSED VOLLEY", [["autoDamagePct", 0.12], ["coneShot", -1]], ["auto", "damage", "projectile", "tradeoff"],
  { requiresConeShot: 1 });

// A técnica
up("signature", "SIGNATURE", [["techniqueDamagePct", 0.20]], ["damage", "technique"]);
up("follow_through", "FOLLOW-THROUGH", [["followThroughPct", 0.15]], ["damage", "technique"],
  { note: "After using the technique, all your damage is higher for 3 s." });
up("kindling", "KINDLING", [["burnPct", 0.20]], ["fire", "burn"], { notFor: { frostine: true } });

// Uma exclusiva por herói: mais rara, a partir da onda 5, uma vez por partida
function heroUp(id: string, name: string, hero: string, effects: [string, number][], tags: string[], note: string): UpgradeDef {
  return up(id, name, effects, tags, { hero, minWave: 5, unique: true, weight: 0.6, noTier: true, hideEffects: true, note });
}
heroUp("quickdraw", "QUICKDRAW", "zephyr", [["fanShots", 2]], ["auto", "technique"], "Fan the Hammer fires +2 shots.");
heroUp("permafrost", "PERMAFROST", "frostine", [["permafrost", 1]], ["ice", "technique"],
  "Glacial Wall: enemies that touch it stay frozen +1 s, and the wall lasts +2 s.");
heroUp("static_charge", "STATIC CHARGE", "kaelen", [["staticCharge", 1]], ["lightning", "technique"],
  "Storm Step: the electric trail deals double damage and lasts +1 s.");
heroUp("time_loop", "TIME LOOP", "aurelius", [["riftDurationFlat", 1]], ["arcane", "technique"], "Time Rift lasts +1 s.");
heroUp("wildfire", "WILDFIRE", "ignis", [["wildfire", 1]], ["fire", "burn"],
  "An enemy that dies while Burning spreads the Burn to those nearby.");
heroUp("executioner", "EXECUTIONER", "varok", [["executionerPct", 0.25]], ["damage"],
  "+25% damage to bosses below 30% HP.");
heroUp("nightfall", "NIGHTFALL", "umbra", [["nightfall", 1]], ["dodge", "technique"],
  "Every dodge takes 0.5 s off Shadow Step's cooldown.");
heroUp("judgement", "JUDGEMENT", "seraph", [["judgement", 1]], ["survival", "technique"],
  "When Aegis blocks a hit, 200% of it goes back to the attacker.");
heroUp("contagion", "CONTAGION", "vesper", [["contagion", 1]], ["technique"],
  "A poisoned enemy that dies passes half its Poison to the nearest enemy.");
heroUp("boomerang", "BOOMERANG", "seraph", [["shieldBoomerang", 1]], ["auto"],
  "The shield flies straight out to full reach and back, hitting everyone on the way, both ways.").excludes = "holy_ricochet";
heroUp("holy_ricochet", "HOLY RICOCHET", "seraph", [["shieldRicochet", 1]], ["auto"],
  "+2 shield ricochets, and each ricochet keeps more damage (90% instead of 70%).").excludes = "boomerang";

// Defesa e utilidade
up("fleetfoot", "FLEETFOOT", [["moveSpeedPct", 0.12]], ["speed", "survival"]);
up("vitality", "VITALITY", [["maxHpFlat", 20]], ["survival"], { fullHeal: true });
up("long_reach", "LONG REACH", [["rangePct", 0.10]], ["range"]);
up("evasive_footwork", "EVASIVE FOOTWORK", [["dodge", 0.08]], ["survival", "dodge"]);
up("phantom_step", "PHANTOM STEP", [["dodge", 0.12], ["maxHpPct", -0.05]], ["survival", "dodge", "risk"]);
up("blood_rite", "BLOOD RITE", [["deathHealChance", 0.05]], ["auto", "magic", "sustain"], { note: "(on enemy kill)" });
up("second_wind", "SECOND WIND", [["regen", 0.35]], ["survival", "healing", "sustain"]);
up("iron_skin", "IRON SKIN", [["armor", 20], ["spellDamagePct", -0.08]], ["survival", "armor"]);
up("runic_ward", "RUNIC WARD", [["armor", 10], ["spellDamagePct", 0.10], ["autoDamagePct", -0.10]], ["magic", "survival", "risk"]);

// Afinidade de elemento
up("infernal_affinity", "INFERNAL AFFINITY", [["firePct", 0.20], ["icePct", -0.15]], ["fire"]);
up("frost_affinity", "FROST AFFINITY", [["icePct", 0.20], ["firePct", -0.15]], ["ice"]);
up("storm_affinity", "STORM AFFINITY", [["lightningPct", 0.20], ["firePct", -0.15]], ["lightning"]);
up("arcane_affinity", "ARCANE AFFINITY", [["arcanePct", 0.20], ["firePct", -0.15]], ["arcane"]);
up("elemental_attunement", "ELEMENTAL ATTUNEMENT",
  [["firePct", 0.10], ["icePct", 0.10], ["lightningPct", 0.10], ["arcanePct", -0.08]], ["fire", "ice", "lightning"]);
up("arcane_conversion", "ARCANE CONVERSION", [["arcanePct", 0.18], ["firePct", -0.10]], ["arcane"]);
up("cold_precision", "COLD PRECISION", [["icePct", 0.12], ["slowPct", 0.10], ["firePct", -0.08]], ["ice"]);

// Ataque básico contra spell
up("martial_focus", "MARTIAL FOCUS", [["autoDamagePct", 0.18], ["spellDamagePct", -0.12]], ["auto"]);
up("arcane_focus", "ARCANE FOCUS", [["spellDamagePct", 0.18], ["autoDamagePct", -0.12]], ["magic"]);
up("arcane_power", "ARCANE POWER", [["spellDamagePct", 0.12]], ["magic"]);
up("arcane_haste", "ARCANE HASTE", [["spellCooldownPct", -0.10]], ["magic"]);
up("spell_surge", "SPELL SURGE", [["spellDamagePct", 0.15], ["attackSpeedPct", -0.10]], ["magic"], { extension: true });
up("quickened_mind", "QUICKENED MIND", [["spellCooldownPct", -0.12], ["autoDamagePct", -0.10]], ["magic"], { extension: true });
up("spellsworn", "SPELLSWORN", [["spellPowerFlat", 4], ["damageFlat", -3]], ["magic"], { extension: true });
up("overchannel", "OVERCHANNEL", [["spellDamagePct", 0.25], ["attackSpeedPct", -0.08]], ["magic"], { extension: true, minTier: "rare" });
up("blade_discipline", "BLADE DISCIPLINE", [["autoDamagePct", 0.15], ["spellCooldownPct", 0.10]], ["auto"], { extension: true });

// Economia
up("wisdom", "WISDOM", [["xpPct", 0.12]]);
up("golden_instinct", "GOLDEN INSTINCT", [["goldPct", 0.10]]);
up("champions_bounty", "CHAMPION'S BOUNTY", [["championXpPct", 0.25], ["championGoldPct", 0.25]]);
up("survivors_grace", "SURVIVOR'S GRACE", [["survivorRewardPct", 0.15]]);

export const UPGRADES: readonly UpgradeDef[] = U;
/** As melhorias do original e as épicas de comportamento (M21-07), por id. */
export const UPGRADE_BY_ID: Readonly<Record<string, UpgradeDef>> = Object.fromEntries([...U, ...BEHAVIOR_EPICS].map((u) => [u.id, u]));

/** constants.lua `CAPS`: teto das contagens; uma melhoria que passaria do teto não é oferecida. */
export const UPGRADE_CAPS: Readonly<Record<string, number>> = { pierce: 3, doubleShot: 4, coneShot: 4, healingFields: 4 };

/** level_up.lua `COUNT`: contagens nunca mudam com a raridade (essas melhorias são sempre comuns). */
export const COUNT_STATS: Readonly<Record<string, true>> = { doubleShot: true, coneShot: true, pierce: true, lightningTargets: true };

/** format.lua `PCT`: atributos em porcentagem (arredondados a 0,001 na raridade; os outros a 0,1). */
export const PCT_STATS: Readonly<Record<string, true>> = Object.fromEntries([
  "maxHpPct", "damagePct", "autoDamagePct", "spellDamagePct", "firePct", "icePct", "lightningPct", "arcanePct", "burnPct",
  "slowPct", "slowDurationPct", "attackSpeedPct", "moveSpeedPct", "rangePct", "autoProjectileSpeedPct", "spellCooldownPct",
  "critDamagePct", "critChance", "dodge", "deathHealChance", "goldPct", "xpPct", "championXpPct", "championGoldPct",
  "survivorRewardPct", "echoChance", "volatileChance", "slowedDamagePct", "chainRangePct", "knockbackPct", "spellCritChance",
  "techniqueDamagePct", "followThroughPct", "bossSlowCap", "healPct", "poisonPct", "areaPct", "bossDamagePct", "windPct",
  "runePct", "lightPct", "earthPct", "championHpPct", "shopPricePct",
].map((k) => [k, true as const]));

/** build_fit.lua: um elemento que a build não usa sai com 25% do peso. */
export const BUILD_FIT = {
  elements: { fire: "firePct", ice: "icePct", lightning: "lightningPct", arcane: "arcanePct" } as Readonly<Record<string, string>>,
  offBuild: 0.25,
};

/**
 * Como um atributo de lá vira atributo daqui (`scale` multiplica o valor). Os que faltam ainda não têm sistema no
 * jogo (spells, elementos, tiros extras, empurrão, ouro dos campeões...) e prendem a melhoria fora do sorteio.
 * Diferenças: o dano do ataque básico (`autoDamagePct`) vale para o ataque e para as técnicas; a recarga de spell
 * (`spellCooldownPct`, negativa = mais rápida) vale para a técnica, como lá, e entra no pool de cada spell (D14).
 */
export const UPGRADE_STAT: Readonly<Record<string, { key: StatKey; scale: number }>> = {
  damageFlat: { key: "damage", scale: 1 },
  attackSpeedPct: { key: "attackSpeedPct", scale: 1 },
  autoDamagePct: { key: "autoDamagePct", scale: 1 },
  // D14: poder de magia, dano de spell e de escola, queimadura, lentidão e veneno
  spellPowerFlat: { key: "spellPower", scale: 1 },
  spellDamagePct: { key: "spellDamagePct", scale: 1 },
  firePct: { key: "firePct", scale: 1 },
  icePct: { key: "icePct", scale: 1 },
  lightningPct: { key: "lightningPct", scale: 1 },
  arcanePct: { key: "arcanePct", scale: 1 },
  burnPct: { key: "burnPct", scale: 1 },
  slowPct: { key: "slowPct", scale: 1 },
  slowDurationPct: { key: "slowDurationPct", scale: 1 },
  poisonPct: { key: "poisonPct", scale: 1 },
  areaPct: { key: "areaPct", scale: 1 },
  critChance: { key: "critChance", scale: 1 },
  armor: { key: "armor", scale: 1 },
  moveSpeedPct: { key: "moveSpeedPct", scale: 1 },
  maxHpFlat: { key: "maxHp", scale: 1 },
  maxHpPct: { key: "maxHpPct", scale: 1 },
  rangePct: { key: "rangePct", scale: 1 },
  dodge: { key: "dodge", scale: 1 },
  regen: { key: "regen", scale: 1 },
  xpPct: { key: "xpPct", scale: 1 },
  goldPct: { key: "goldPct", scale: 1 },
  spellCooldownPct: { key: "cdrPct", scale: -1 },
};
