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
} as const;
