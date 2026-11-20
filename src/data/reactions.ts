// Reações de estado (D18, M21-05): números de cada reação. Não existem no Dungeon Reign; são do formato de ação daqui.
// O dano é um multiplicador sobre o dano do herói (FinalStats.damage), como o das spells.

export const REACTIONS = {
  /** segundos em que um inimigo que reagiu (ou recebeu estado de uma reação) não reage de novo */
  cooldown: 2.5,
  /** chefes levam esta fração do dano da reação */
  bossMult: 0.5,
  /** Gelado + raio: o gelo estoura em volta e o inimigo perde a lentidão de gelo */
  shatter: { damage: 1.6, radius: 3, color: 0xdff6ff },
  /** Queimando + veneno: explosão que passa os dois estados aos vizinhos */
  plague: {
    damage: 1.2,
    radius: 3.5,
    /** queimadura e veneno dados aos vizinhos: dano por segundo sobre o dano do herói e duração */
    burnDps: 0.25,
    burnDuration: 3,
    poisonDps: 0.15,
    poisonDuration: 4,
    color: 0x9fe04a,
  },
  /** Atordoado + golpe pelas costas: comum abaixo de `threshold` da vida morre; senão leva `damage` (sobre o dano do herói) */
  execution: {
    damage: 2,
    threshold: 0.4,
    /** metade do ângulo do cone atrás do inimigo, em graus */
    backCone: 70,
    radius: 0,
    color: 0xff4a6a,
  },
  /** Cyclone + elemento: o tornado leva o elemento até acabar; números de cada tique sobre o dano do herói */
  tornado: {
    fire: { color: 0xff7a1a, burnDps: 0.2, burnDuration: 2 },
    ice: { color: 0x9fdcff, slow: 0.35, slowDuration: 1.2 },
    /** choque: fração do dano do tique, como golpe de raio (pode estilhaçar) */
    lightning: { color: 0xfff29a, shock: 0.5 },
    poison: { color: 0x7be04a, poisonDps: 0.12, poisonDuration: 3, maxStacks: 3 },
  },
} as const;
