// M17-01: os números do bot que joga partidas, copiados de `tools/sim_bot.lua` do Dungeon Reign.
// O bot é um jogador razoável, não ótimo: estes pesos dizem o que cada herói quer pegar.
// Os nomes de atributo são os de lá (os das melhorias); as relíquias passam pela tradução de `UPGRADE_STAT`.

/** A spell inicial de cada herói no simulador (lá, `START`). */
export const BOT_START: Readonly<Record<string, string>> = {
  ignis: "fireball", frostine: "iceball", kaelen: "chain_lightning", aurelius: "arcane_bolt",
  zephyr: "fireball", varok: "fireball", umbra: "fireball", seraph: "fireball", vesper: "fireball",
};

/** A escola que guia as escolhas de cada herói (lá, `SCHOOL`). */
export const BOT_SCHOOL: Readonly<Record<string, string>> = {
  ignis: "fire", frostine: "ice", kaelen: "lightning", aurelius: "arcane",
  zephyr: "auto", varok: "auto", umbra: "auto", seraph: "auto", vesper: "poison",
};

/** Peso de atributo que todo herói quer (lá, `COMMON`). */
export const BOT_COMMON: Readonly<Record<string, number>> = {
  maxHpPct: 3, maxHpFlat: 3, armor: 2.5, spellArmor: 1.5, regen: 5, dodge: 3,
  moveSpeedPct: 2, damagePct: 3, rangePct: 1.5, deathHealChance: 3, goldPct: 0.6, xpPct: 0.8,
  critChance: 1.2, critDamagePct: 0.8, damageFlat: 1.5,
};

/** Peso de atributo por escola (lá, `PROFILE`); vence o comum quando os dois têm o atributo. */
export const BOT_PROFILE: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  fire: { firePct: 4, burnPct: 3, spellDamagePct: 3, spellCooldownPct: -3, volatileChance: 2, spellPowerFlat: 1.5 },
  ice: { icePct: 4, slowPct: 2, slowDurationPct: 1.5, spellDamagePct: 3, spellCooldownPct: -3, spellPowerFlat: 1.5 },
  lightning: {
    lightningPct: 4, lightningTargets: 3, spellDamagePct: 3, spellCooldownPct: -3, attackSpeedPct: 1.5,
    critChance: 2, spellPowerFlat: 1.5,
  },
  arcane: { arcanePct: 4, spellDamagePct: 3.5, spellCooldownPct: -3.5, echoChance: 2, spellPowerFlat: 1.5 },
  auto: {
    autoDamagePct: 4, attackSpeedPct: 3.5, critChance: 2.5, critDamagePct: 2, doubleShot: 3, coneShot: 2.5,
    pierce: 2, autoProjectileSpeedPct: 0.5, damageFlat: 3,
  },
  poison: {
    poisonPct: 4, poisonStacks: 3, areaPct: 2, autoDamagePct: 3, attackSpeedPct: 3, damageFlat: 2.5,
    spellDamagePct: 1.5, spellCooldownPct: -2, doubleShot: 2, coneShot: 2,
  },
};

/** Peso de um atributo que nenhuma tabela lista. */
export const BOT_UNKNOWN_WEIGHT = 0.4;

/** O valor típico de um atributo plano; o que não está aqui é fração e vale `valor × 10` (lá, `TYPICAL`). */
export const BOT_TYPICAL: Readonly<Record<string, number>> = {
  armor: 10, spellArmor: 10, maxHpFlat: 12, regen: 0.35, damageFlat: 2, lightningTargets: 1,
  doubleShot: 1, coneShot: 1, pierce: 1, slowPct: 0.1,
};

/** Pontos de tag (lá, `tagScore`). */
export const BOT_TAG = {
  school: 3,
  /** "magic" para quem não é de ataque básico */
  magic: 1,
  survival: 0.5,
  /** a tag fecha um limiar a no máximo tantos pontos */
  nearThreshold: 2,
  nearOwnSchool: 2,
  nearOther: 1,
  /** sorteio para desempatar (0 a isto) */
  jitter: 0.5,
  /** Vitality com a vida abaixo disto */
  fullHealBelow: 0.5,
  fullHealBonus: 4,
  /** relíquia que fecha uma receita de evolução */
  recipeBonus: 3,
} as const;

/** Prioridade de cada carta do mapa (lá, `MAP_PRIORITY`). */
export const BOT_MAP_PRIORITY: Readonly<Record<string, number>> = {
  shop: 60, relic_shrine: 55, event: 40, combat_room: 30, elite: 20, cursed_room: 5, pact: 0, boss_ambush: -10,
};

export const BOT_MAP = {
  /** loja sem ouro para gastar vale menos */
  shopPoorGold: 90,
  shopPoorScore: 25,
  /** (vida × dano × quantidade − 1) da sala custa isto */
  dangerWeight: 40,
  /** (recompensa − 1) vale isto */
  rewardWeight: 10,
  /** sala com poças de cura */
  poolsBonus: 8,
} as const;

/** Prioridade de cada evento (lá, `EVENT_PRIORITY`); o que não está aqui vale 0. */
export const BOT_EVENT_PRIORITY: Readonly<Record<string, number>> = {
  treasure_cache: 5, swift_bargain: 4, infernal_deal: 3, cursed_chamber: 2, blood_altar: 1,
  wandering_merchant: 6, healing_spring: 3, forgotten_library: 4, ominous_omen: 3, ancient_shrine: 4,
  training_grounds: 3, smugglers_cache: 3, blood_moon_rite: 2, quiet_rest: 2, gamblers_den: 2, sealed_door: 3,
};

export const BOT_EVENT = {
  /** Infernal Deal (dano de spell) para quem não é de ataque básico */
  infernalForCasters: 6,
  /** eventos que custam vida, recusados abaixo desta vida */
  costlyHp: 0.7,
  costly: ["blood_altar", "ancient_shrine"] as readonly string[],
  costlyScore: -5,
  /** eventos que curam, preferidos abaixo desta vida */
  healHp: 0.5,
  heals: ["quiet_rest", "healing_spring"] as readonly string[],
  healScore: 7,
  unavailable: -100,
} as const;

/** Pontos de cada oferta da loja (lá, `shop`). */
export const BOT_SHOP = {
  upgradeMain: 10,
  upgradeOther: 7,
  upgradeTechnique: 8.5,
  newSpellFirst: 8,
  newSpellMore: 5,
  /** cura numa partida de 20 ondas */
  healingField: 11,
  modifierMain: 6,
  modifierOther: 4,
  vitalityLow: 9,
  vitalityHp: 0.6,
  vitality: 3,
  sharpenedAuto: 7,
  sharpened: 2,
  relicBase: 7,
  relicMax: 3,
  relicScale: 0.5,
  /** troca a loja enquanto sobrar esta reserva depois de pagar */
  rerollReserve: 250,
  maxRerolls: 3,
} as const;
