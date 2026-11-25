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

/** O laço da partida simulada (M17-01 parte 2). */
export const BOT_RUN = {
  /** passo fixo do jogo, em s */
  dt: 1 / 60,
  /** passos por fatia antes de devolver o controle ao navegador */
  stepsPerSlice: 600,
  /** tempo máximo de jogo de uma partida, em s (lá, `MAX_TIME` = 1500 só de luta) */
  maxTime: 3600,
  /** sem trocar de onda nem de fase por tanto tempo de jogo, a partida está presa */
  stuckTime: 300,
} as const;

/**
 * A pilotagem em combate (M17-01 parte 3, porta do `steer`/`danger` de `tools/balance_sim.lua`). Lá as unidades
 * são px; aqui m (12 px = 1 m, `DR_PX_PER_M`). Pesos de perigo e de preferência como lá.
 */
export const BOT_PILOT = {
  /** distância ideal ao alvo, em fração do alcance do ataque; o martelo (Varok) luta mais perto */
  keep: 0.75,
  keepHammer: 0.6,
  /** soma da distância ideal: fração do raio do alvo */
  targetRadius: 0.4,
  /** horizontes do olhar à frente, em s de passo: curto (e a metade dele) e longo */
  look: 0.35,
  far: 0.8,
  /** peso de cada horizonte na nota */
  halfWeight: 0.5,
  farWeight: 0.7,
  /** aviso que dispara em menos que isso conta como perigo, s */
  soon: 1.3,
  /** folga em volta do aviso, m (10 px) */
  pad: 10 / 12,
  /** perigo por aviso, poça e projétil */
  telegraph: 60,
  storm: 25,
  shot: 20,
  /** folga do projétil, m (6 px) */
  shotPad: 0.5,
  /** corpo de inimigo: alcance do golpe + folga (30 px); chefe: 50 px da borda; peso no encosto */
  enemyPad: 2.5,
  defaultReach: 1.5,
  bossReach: 50 / 12,
  enemyWeight: 12,
  bossWeight: 30,
  /** borda da clareira da luta: faixa (34 px) e fora dela */
  edgeBand: 34 / 12,
  edge: 15,
  outside: 200,
  /** obstáculo (pedra, tronco, fosso) no ponto do passo */
  blocked: 60,
  /** peso por m de erro na distância ideal (0,04 por px) */
  distance: 0.04 * 12,
  /** poça de cura: abaixo dessa vida, cada ponto dentro dela vale isso a menos */
  healPoolHp: 0.6,
  healPool: 6,
  /** orbe de cura: abaixo dessa vida, atrai até essa distância (240 px), peso por m (0,08 por px) */
  healOrbHp: 0.85,
  healOrbRange: 240 / 12,
  healOrb: 0.08 * 12,
  /** orbe de ouro e XP mais perto (até 200 px), peso por m (0,03 por px) */
  lootRange: 200 / 12,
  loot: 0.03 * 12,
  /** leve preferência pelo centro da clareira (0,01 por px) */
  center: 0.01 * 12,
  /** manter a direção anterior se não houver outra claramente melhor */
  hysteresis: 4,
} as const;

/** Uso da técnica e da esquiva pelo bot (`useTechnique` de lá; a esquiva é daqui, o original não tem). */
export const BOT_TECH = {
  /** perigo aqui que pede fuga (técnica de movimento ou esquiva) */
  flee: 30,
  /** perigo máximo no ponto de chegada */
  safeLanding: 12,
  /** blink e charge: inimigos no caminho para cortar um grupo, e o bônus de nota por inimigo */
  lineHits: 3,
  lineBonus: 6,
  /** largura do caminho quando a técnica não diz, m (26 px) */
  lineWidth: 26 / 12,
  /** rift e fan: inimigos no raio (ou o chefe) */
  group: 3,
  /** icewall: inimigos perto (170 px) */
  wallNear: 170 / 12,
  /** leap: inimigos no raio da queda (ou o chefe) */
  leapGroup: 2,
  /** aegis: inimigos a 110 px (ou o chefe) */
  aegisNear: 110 / 12,
  aegisGroup: 2,
  /** brood: inimigos no alcance + 60 px (ou o chefe) */
  broodPad: 60 / 12,
  broodGroup: 2,
  /** raio do corpo do herói, m */
  heroRadius: 0.5,
} as const;
