// Números de balanceamento globais. Primeira passada: ajustar depois de jogar.

export const TUNING = {
  hero: {
    baseHp: 100,
    hpPerLevel: 12,
    baseDamage: 10,
    damagePctPerLevel: 0.08,
    moveSpeed: 6.6,
    dashSpeed: 22,
    dashTime: 0.2,
    dashCooldown: 1.1,
    dashIFrames: 0.28,
    potionHealPct: 0.45,
    potionCooldown: 18,
    pickupRadius: 1.6,
    baseCritChance: 0.05,
    baseCritDamage: 1.5,
  },
  attributes: {
    // por ponto
    forca: { damagePct: 0.03 },
    vigor: { maxHpPct: 0.04, regen: 0.05 },
    agilidade: { attackSpeedPct: 0.015, moveSpeedPct: 0.006 },
    foco: { cdrPct: 0.012, statusPct: 0.03, areaPct: 0.01 },
    pointsPerLevel: 1,
  },
  xp: {
    // xp para subir do nível L para L+1: a * L^exp + b * L
    a: 60,
    exp: 1.6,
    b: 40,
    enemyPerLevel: 0.15,
    maxLevel: 60,
  },
  enemy: {
    hpPerLevel: 1.17,
    damagePerLevel: 1.11,
    aggroRadius: 15,
    leashRadius: 34,
    activeRadius: 70,
    /** velocidade (unidades/s) do empurrão de um golpe de força 1 */
    knockback: 8,
    champion: { hp: 4.2, damage: 1.5, speed: 1.1, scale: 1.35, xp: 4.5 },
    /** distância (px do Dungeon Idle) -> unidades do mundo */
    pxToUnit: 1 / 16,
  },
  boss: {
    /** multiplicador global da vida dos chefes (0.55 depois do 1º playtest: "o boss tem muita vida") */
    hpMult: 0.55,
    enrageAt: 0.3,
    enrageCooldownMult: 0.65,
    /** segundos em que o chefe ruge sem atacar: ao entrar na luta e ao enfurecer */
    roarTime: 1.3,
    enrageRoarTime: 0.9,
    /** segundos entre a morte do chefe e o corpo sumir */
    deathTime: 2.4,
    xpMult: 22,
  },
  loot: {
    dropChance: 0.09,
    championDrops: 1,
    bossDrops: 3,
    healOrbChance: 0.07,
    healOrbPct: 0.15,
    relicChanceChampion: 0.04,
    bagSize: 24,
    /** pesos base por raridade; magicFind desloca peso para as raras */
    rarityWeights: { comum: 60, incomum: 27, raro: 10, epico: 2.6, lendario: 0.4 },
  },
  world: {
    size: 240,
    margin: 14,
    campCount: 24,
    bossArenaRadius: 17,
  },
} as const;
