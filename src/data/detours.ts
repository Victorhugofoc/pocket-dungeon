// M21-09: desvios opcionais (D18); desde a M21-15, um 4º altar opcional na arena. Cada um é uma pergunta de risco curta:
// baú guardado por um campeão, santuário que troca vida por ouro, atalho que pula a próxima loja e dá um nível.
// Números de primeiro chute (ritmo do RPG, sem par no Dungeon Reign).

export type DetourKind = "chest" | "shrine" | "shortcut";

export interface DetourDef {
  id: DetourKind;
  /** nome na placa e no HUD */
  name: string;
  /** dica ao chegar perto (E) */
  hint: string;
  /** cor da placa, do brilho e do minimapa */
  color: number;
  /** peso no sorteio */
  weight: number;
}

export const DETOURS: Record<DetourKind, DetourDef> = {
  chest: { id: "chest", name: "Guarded Chest", hint: "E — open the chest", color: 0xffc83d, weight: 1 },
  shrine: { id: "shrine", name: "Blood Shrine", hint: "E — trade 25% of your max HP for gold", color: 0xe0303a, weight: 1 },
  shortcut: { id: "shortcut", name: "Hidden Path", hint: "E — skip the next shop and gain a level", color: 0x6ad8ff, weight: 0.8 },
};

export const DETOUR = {
  /** quantos desvios por onda: [quantidade, peso]. M21-15: no máximo 1 (o 4º altar opcional; o peso do 2 foi para o 1) */
  count: [[0, 0.3], [1, 0.7]] as const,
  /** distância do desvio que conta como perto (E) */
  useRadius: 2.6,
  chest: {
    /** ouro do baú: base + por onda */
    gold: 45,
    goldPerWave: 14,
    /** onde o campeão fica, do lado do baú (metros) */
    guardDistance: 2.6,
    /** o guarda só acorda com o herói a esta distância (o padrão, 15 m, alcança o caminho) */
    guardAggro: 6,
  },
  shrine: {
    /** fração da vida máxima que o santuário cobra (não mata: deixa 1) */
    hpCostPct: 0.25,
    gold: 35,
    goldPerWave: 11,
  },
  shortcut: {
    /** níveis que o atalho dá */
    levels: 1,
  },
} as const;
