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
    pickupRadius: 1.6,
    baseCritChance: 0.05,
    baseCritDamage: 1.5,
  },
  enemy: {
    /** barra de vida sobre o inimigo ferido (entity_renderer.lua: largura max(18 px, raio × 1,6); chefe usa a do HUD).
     * Unidades em metros; `lift` é a altura acima da cabeça, abaixo da fileira de ícones de estado. */
    hpBar: { minWidth: 1.1, radiusMult: 1.6, height: 0.12, border: 0.04, lift: 0.22, fill: 0xd9293a, back: 0x000000, backOpacity: 0.7 },
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
    /**
     * M21-01 (D18): telegrafia do golpe corpo a corpo. No preparo a direção trava e o arco aparece no chão;
     * o golpe só acerta quem está dentro dele quando fecha. Antes acertava em volta toda, até alcance + 1,1.
     */
    telegraph: {
      /** s de preparo (os 0,4 e 0,55 de antes; ajustar jogando na M21-04) */
      windup: 0.4, bossWindup: 0.55,
      /** abertura do arco em rad (1,6 ≈ 92°) */
      arc: 1.6, bossArc: 2.2,
      /** folga além do alcance de ataque, em unidades */
      reachPad: 0.7,
      /** raio do herói para o teste de ângulo */
      playerRadius: 0.45,
      /** atordoar no preparo cancela o golpe */
      stunInterrupts: true,
      /** s de mira dos tiros comuns (M21-01 parte 2): a boca brilha e o tiro sai na direção do herói no fim */
      shotWindup: 0.3,
      /** tamanho do brilho na arma (preparo) e na boca do tiro (mira), do começo ao fim */
      glowSize: [0.35, 1.1] as [number, number],
      /** distância da boca do tiro além do raio do corpo */
      muzzleReach: 0.35,
    },
  },
  boss: {
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
    /** raio das clareiras das ondas 1 a 4 de cada zona */
    segmentRadius: 16,
    /**
     * M21-12: as 3 trilhas entre uma clareira e a seguinte: a do meio e duas que se abrem `bulge` para os lados
     * (encolhe até `minBulge` se chegar perto de outra clareira), saindo da borda a `departDeg` graus e voltando a se
     * juntar `junction` antes da clareira seguinte. Curtas desde a M21-13.
     */
    forks: { bulge: 7, minBulge: 4, departDeg: 38, junction: 2, samples: 10, clearance: 2 },
    /**
     * M21-13: a zona é uma corrente de arenas em linha reta (substitui o zigue-zague da M21-12): `gap` = vão entre a
     * borda de uma clareira e a da seguinte (as trilhas da bifurcação cabem nele, ~2 s andando), `xJitter` = quanto o
     * centro sai do meio, `bend` = curva do caminho do meio entre duas paradas.
     */
    chain: { gap: [9, 11] as const, xJitter: 4, bend: 1.5 },
    /** M21-08: portões do mapa da partida, na trava de cada trilha (M21-12) */
    gates: {
      /** distância do centro do portão que conta como passar por ele (a trilha tem ~6 de largura) */
      triggerRadius: 3.4,
      /** vão entre as colunas (metros): da largura da trilha */
      width: 4.6,
      /** M21-12: sem portão escolhido, chegar a esta distância da borda da clareira escolhe o portão mais perto */
      fallbackReach: 2,
    },
  },
} as const;

/**
 * Pilhas com retorno decrescente (core/modifiers.lua, constants.lua): teto suave da regeneração (`REGEN_SOFTCAP`),
 * esquiva até 60% (`DODGE_CAP`), recarga com piso de 35% (`COOLDOWN_FLOOR`). O crítico fica com o teto de 75% daqui
 * (lá vai até 100%).
 */
export const STACKING = { regenSoftcap: 2.0, dodgeCap: 0.6, cooldownFloor: 0.35, critCap: 0.75 };

/**
 * Melhorias de ataque e recompensa (M20-12): `damage.lua` DEATH_HEAL (vida curada pela chance ao matar) e
 * FOLLOW_THROUGH_TIME (segundos depois da técnica); `tuning.lua` KNOCKBACK_PX (px empurrados a +100% de Knockback).
 */
export const UPGRADE_FX = { deathHeal: 10, followThroughTime: 3, knockbackPx: 48 };

/**
 * M20-12 parte 3: as exclusivas de herói, com os números do original (`techniques.lua`, `damage.lua`,
 * `spell_stats.lua`, `shield_throw.lua`). Raios e alcances em px de lá (12 px = 1 m).
 */
export const HERO_UPGRADES = {
  /** PERMAFROST: +1 s de congelamento e +2 s de parede por acúmulo */
  permafrostFreeze: 1, permafrostDuration: 2,
  /** STATIC CHARGE: +1 s de rastro por acúmulo e o dano do rastro ×2 */
  staticTrail: 1, staticTrailMult: 2,
  /** EXECUTIONER: vale em chefe abaixo de 30% da vida */
  executionerBelow: 0.30,
  /** NIGHTFALL: s tirados da recarga da técnica a cada esquiva, por acúmulo */
  nightfallCdr: 0.5,
  /** JUDGEMENT: o Aegis devolve 200% do golpe bloqueado, por acúmulo */
  judgementMult: 2,
  /** WILDFIRE: raio do contágio da queimadura e a duração mínima dela */
  wildfireRadiusPx: 80, wildfireMinTime: 1.5,
  /** CONTAGION: alcance até o mais perto; passa metade dos acúmulos (no mínimo 1) */
  contagionRangePx: 120,
  /** HOLY RICOCHET: +2 ricochetes que guardam 90% do dano (lá, 70% sem ela) */
  holyBounces: 2, holyMult: 0.9,
};
