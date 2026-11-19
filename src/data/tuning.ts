// Números de balanceamento globais. Primeira passada: ajustar depois de jogar.

export const TUNING = {
  /** Resolução adaptativa (game.ts): mira 60 fps. A escala da resolução interna desce quando o tempo de GPU passa de `gpuHigh` ms e
   * sobe quando fica abaixo de `gpuLow`, entre `minScale` e 1 (1 = densidade máxima da qualidade escolhida). */
  frame: { gpuHigh: 12.5, gpuLow: 8.5, minScale: 0.6, step: 0.08, every: 0.75, maxRatio: 1.5 },
  /** SÓ PARA TESTE (2026-11-16): tudo desbloqueado (Unlocks.ALL do original), para seguir testando os 9 heróis. Desligar ao balancear. */
  unlockAll: true,
  /** DEV Grimoire no F1 (constants.lua `C.DEV_TOOLS`, lá ligado por `--dev`). Ligado enquanto não há loja (M7). Desligar ao publicar. */
  devTools: true,
  hero: {
    baseHp: 100,
    baseDamage: 10,
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
  enemy: {
    hpPerLevel: 1.17,
    damagePerLevel: 1.11,
    aggroRadius: 15,
    leashRadius: 34,
    activeRadius: 70,
    /** velocidade (unidades/s) do empurrão de um golpe de força 1 */
    knockback: 8,
    champion: { hp: 4.2, damage: 1.5, speed: 1.1, scale: 1.35, xp: 4.5,
      /** M3-06, visual do Dungeon Reign (affix_auras.lua, entity_renderer.lua): contorno dourado e coroa de espetos no chão */
      outline: 0xf2b21c, aura: { radius: 1.75, spikes: 8, spin: 0.6, motes: 4 } },
    /** invocados e filhos do splitter: tom espectral do Dungeon Reign (cor × tint, alfa 0,85) */
    summoned: { tint: [0.8, 0.75, 0.95] as const, opacity: 0.85, emissive: 0x30265e },
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
  world: {
    size: 240,
    margin: 14,
    bossArenaRadius: 17,
    /** raio das clareiras das ondas 1 a 4 de cada zona e onde ficam no caminho (fração do comprimento) */
    segmentRadius: 16,
    segmentAt: [0.17, 0.37, 0.57, 0.77],
  },
} as const;
