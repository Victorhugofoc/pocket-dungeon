// M21-11: maestria por herói. Jogar com um herói dá pontos; os níveis liberam alternativas sem ganho de poder
// (um ataque básico e uma técnica para cada herói). Não vem do Dungeon Reign (D18). A lógica fica em core/mastery.ts.
import type { AutoAttack } from "./heroes";

export const MASTERY = {
  /** pontos por onda vencida (não conta a onda em que o herói morre) */
  waveClear: 1,
  /** pontos a mais por chefe derrotado */
  bossKill: 3,
  /** pontos para chegar a cada nível: o índice é o nível − 1 (nível 1 de saída) */
  levels: [0, 20, 60] as readonly number[],
  /** o nível que libera cada alternativa */
  autoLevel: 2,
  techniqueLevel: 3,
} as const;

export interface AltAuto {
  name: string;
  text: string;
  /** o que muda no ataque básico do herói (o resto fica como o dele) */
  auto: Partial<AutoAttack>;
}

/**
 * Ataques básicos alternativos (a passiva do herói vale igual, então o ricochete do Zephyr e do Seraph e o golpe
 * pelas costas da Umbra ficam): o mesmo estilo de golpe (H8) com outro ritmo, alcance ou alvo. Dano por segundo
 * nunca acima do original (tests/mastery.test.ts); a troca é o que o jogador ganha de forma, não de força.
 */
export const ALT_AUTOS: Record<string, AltAuto> = {
  frostine: { name: "Frost Lance", text: "Slower, heavier ice lances that pierce 2 enemies and reach farther.",
    auto: { rate: 1.05, damage: 1.55, pierce: 2, range: 18, speed: 32, size: 1.2 } },
  kaelen: { name: "Thunderclap", text: "Slower, bigger bolts with more damage per hit and shorter reach.",
    auto: { rate: 1.25, damage: 1.35, range: 11, speed: 28, size: 1.6 } },
  aurelius: { name: "Arcane Pulse", text: "Fast small orbs: more hits per second, less damage each, shorter reach.",
    auto: { rate: 2.4, damage: 0.68, range: 13, speed: 28, size: 0.9 } },
  ignis: { name: "Flame Jab", text: "Quick narrow jabs of fire with longer reach; each burn is weaker.",
    auto: { rate: 2.3, damage: 0.92, arcDeg: 50, range: 4.6, status: { kind: "burn", power: 0.22, duration: 3, maxStacks: 3 } } },
  zephyr: { name: "Hand Cannon", text: "Slower, heavier shots with longer reach (they still ricochet).",
    auto: { rate: 1.35, damage: 1.5, range: 19, speed: 50, size: 1.2 } },
  varok: { name: "Quick Smash", text: "Faster, narrower mace swings with less damage per hit.",
    auto: { rate: 1.6, damage: 1.15, arcDeg: 80, range: 3.2 } },
  umbra: { name: "Rending Arc", text: "Slower, wide slashes that hit more enemies around you.",
    auto: { rate: 1.6, damage: 1.5, arcDeg: 140, range: 3.2 } },
  seraph: { name: "Bulwark Throw", text: "A slow, huge shield that pierces 2 enemies in a line and ricochets once.",
    auto: { rate: 0.95, damage: 1.65, ricochet: 1, pierce: 2, range: 13, speed: 17, size: 2.0 } },
  vesper: { name: "Venom Spit", text: "Slower, heavier spit that pierces 1 enemy, with shorter reach.",
    auto: { rate: 1.15, damage: 1.1, pierce: 1, range: 11 } },
};

/** A técnica alternativa de cada herói (`ALT_TECHNIQUES` em data/techniques.ts). */
export const ALT_TECHNIQUE: Record<string, string> = {
  frostine: "frost_pillar", kaelen: "flicker_step", aurelius: "collapse", ignis: "flame_dash", zephyr: "deadeye",
  varok: "ground_breaker", umbra: "cull", seraph: "flash_of_light", vesper: "swarm",
};
