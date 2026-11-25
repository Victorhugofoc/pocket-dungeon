// Camada de ritmo (M21-02, decisão D18): os números de ação adaptados ao jogo com mira e esquiva.
// Os números do original continuam em src/data/run.ts e o teste de paridade compara só eles; esta camada multiplica ou
// troca o resultado das fórmulas de lá. Mexer aqui para ajustar o ritmo jogando (M21-04). Cada linha diz o valor do original.
// As funções que aplicam a camada estão em src/core/pace.ts.
import { RUN_TUNING } from "./run";

export const PACE = {
  /**
   * Escala da contagem de inimigos por onda (índice = onda − 1; depois da lista, 1). Original: 1 em todas.
   * O `countMult` de lá (2,8 na onda 1) foi feito para spells de área automáticas; aqui o herói mira.
   * Primeiro chute: onda 1 com 11 inimigos (lá 18), 2 com 16 (23), 3 com 22 (28), 4 com 27 (30).
   */
  countScale: [0.6, 0.7, 0.8, 0.9] as readonly number[],
  /**
   * M21-13: a luta vem até o herói. Os inimigos nascem em grupos de `pack` (original: 1, um por vez) e todos chegam
   * dentro de `spawnWindow` da duração (original: 0,9), para limpar cedo fechar a onda e não sobrar tempo morto.
   * O grupo nasce a `packDistance` m do herói (dentro da clareira), espalhado em `packSpread` m (original: na borda,
   * longe do herói). Quando restam até `straggler.count` vivos e nada por nascer, eles correm (`speed`) até o herói
   * e setas na borda da tela apontam os que estão fora dela.
   */
  pack: 3,
  spawnWindow: 0.5,
  packDistance: [7, 11] as const,
  packSpread: 1.8,
  straggler: { count: 3, speed: 1.35 },
  /** escala da duração da onda (original: 1; durações de lá 20, 25, 30, 35 e 40 s) */
  durationMult: 1,
  /** escala da vida e do dano dos inimigos comuns e campeões (original: 1) */
  enemyHpMult: 1,
  enemyDamageMult: 1,
  /** escala do raio da arena das ondas 1 a 4 (`TUNING.world.arenaRadius`; a arena do chefe não muda). M21-15: 1, o raio já é o medido */
  clearingMult: 1,
  /** escala do raio das áreas das spells (original: 1) */
  spellAreaMult: 1,
  /** cura e regeneração durante a onda (original: 0,35, `RUN_TUNING.combatHealMult`) */
  combatHealMult: RUN_TUNING.combatHealMult as number,
  /**
   * Orbe de cura (M21-03, cura no risco; a poção saiu). O original fica em `RUN_TUNING.healOrb` para a paridade:
   * cura 8%, 8 s, até 2 por onda, chance 2% comum, 4% elite, 10% campeão, 0 swarm; atração fixa de 5 u a 12 u/s.
   */
  healOrb: {
    /** fração da vida máxima, sem o corte de cura do combate */
    heal: 0.15,
    /** s até sumir; pisca nos últimos `blink` s, `blinkHz` vezes por segundo */
    life: 4, blink: 1, blinkHz: 5,
    /** teto por onda dos orbes de inimigos comuns (o do campeão fica fora) */
    maxPerWave: 3,
    chance: { normal: 0.04, elite: 0.06, champion: 1, swarm: 0.01 },
    /** raio em que o orbe vem até o herói ferido, e a velocidade dele */
    magnet: 5, pullSpeed: 12,
  },
};
