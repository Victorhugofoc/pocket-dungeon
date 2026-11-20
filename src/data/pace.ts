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
  /** escala da duração da onda (original: 1; durações de lá 20, 25, 30, 35 e 40 s) */
  durationMult: 1,
  /** escala da vida e do dano dos inimigos comuns e campeões (original: 1) */
  enemyHpMult: 1,
  enemyDamageMult: 1,
  /** escala do raio das clareiras das ondas 1 a 4 (`TUNING.world.segmentRadius`, 16; a arena do chefe não muda) */
  clearingMult: 1.12,
  /** escala do raio das áreas das spells (original: 1) */
  spellAreaMult: 1,
  /** cura e regeneração durante a onda (original: 0,35, `RUN_TUNING.combatHealMult`) */
  combatHealMult: RUN_TUNING.combatHealMult as number,
};
