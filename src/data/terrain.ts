// M21-10: terreno na luta (D18). Cada clareira das ondas 1 a 4 da zona ganha um fosso (beirada onde o empurrão
// mata inimigo comum), um gargalo entre pedras e barris explosivos. A arena do chefe fica livre.
// Números de primeiro chute (ritmo do RPG, sem par no Dungeon Reign).

export const TERRAIN = {
  pit: {
    /** raio do fosso (metros) */
    radius: [2.0, 2.6] as const,
    /** distância do centro da clareira, em fração do raio dela */
    dist: [0.4, 0.55] as const,
    /** empurrão mínimo (m/s) para o inimigo passar da beirada em vez de contornar o fosso */
    fallSpeed: 2.5,
    /** o inimigo cai quando o centro dele passa este tanto da beirada (metros; 0 = o centro sobre a beirada) */
    fallDepth: 0,
  },
  choke: {
    /** vão entre as duas fileiras de pedras (metros) */
    gap: 2.6,
    /** pedras de cada lado do vão, e o espaço entre elas */
    rocksPerSide: 3,
    spacing: 1.55,
    /** escala da pedra (o raio da pedra é 1,0 × escala) */
    scale: [0.85, 1.05] as const,
    /** distância do centro da clareira, em fração do raio dela (do lado oposto ao fosso) */
    dist: [0.45, 0.58] as const,
  },
  barrel: {
    /** barris por clareira: [quantidade, peso] */
    count: [[2, 0.55], [3, 0.45]] as const,
    /** distância do centro da clareira, em fração do raio dela */
    dist: [0.18, 0.78] as const,
    /** folga entre barris, e de pedras e do fosso (metros) */
    spacing: 3.2,
    clear: 1.6,
    /** raio do corpo do barril (colisão e acerto) */
    radius: 0.5,
    /** segundos entre o acerto e a explosão (pisca) */
    fuse: 0.55,
    /** raio da explosão */
    blastRadius: 3.4,
    /** dano em fração da vida máxima: inimigo comum, campeão e chefe */
    damage: 0.6,
    championDamage: 0.25,
    bossDamage: 0.05,
    /** dano no herói, em fração da vida máxima dele */
    playerDamage: 0.15,
    /** empurrão para fora do centro, em fração de TUNING.enemy.knockback (joga no fosso) */
    knock: 1.6,
  },
};
