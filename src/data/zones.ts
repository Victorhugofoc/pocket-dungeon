// Zonas (biomas). Cada uma é um mapa aberto procedural com acampamentos de monstros e um chefe.

export type DecorKind = "tree" | "pine" | "deadTree" | "rock" | "bush" | "tomb" | "pillar" | "crystal" | "lavaRock" | "mushroom";

export interface ZoneDef {
  id: string;
  name: string;
  subtitle: string;
  level: number;
  boss: string;
  /** [id do inimigo, peso] */
  enemies: [string, number][];
  ground: [number, number, number]; // 3 tons do chão
  path: number;
  fog: number;
  sky: number;
  sun: number;
  sunIntensity: number;
  ambient: number;
  ambientIntensity: number;
  /** [tipo, densidade relativa, colide?] */
  decor: [DecorKind, number, boolean][];
  decorCount: number;
  glowDecor?: number;
  /** grama: cor na raiz e na ponta, densidade 0..1 e altura */
  grass: { root: number; tip: number; density: number; height: number };
  /** cores das flores espalhadas (vazio = sem flores) */
  flowers: number[];
  /** musgo/poeira no topo das pedras */
  rockTop: number;
  /** partículas no ar: cor, se sobem (brasa) ou caem (folha), e quantas por segundo */
  motes: { color: number; rise: number; rate: number };
}

export const ZONE_ORDER = ["bosque", "cripta", "vulcao", "vazio"] as const;

export const ZONES: Record<string, ZoneDef> = {
  bosque: {
    id: "bosque", name: "Bosque Sombrio", subtitle: "Onde os goblins montaram acampamento", level: 1, boss: "bloodfang",
    enemies: [["goblin", 5], ["swarm", 3], ["archer", 2], ["orc", 2], ["splitter", 1]],
    ground: [0x3a7034, 0x4f8a3e, 0x2c5c30], path: 0x9a8257, fog: 0x9fc7a8, sky: 0x9fc7a8,
    sun: 0xfff1d0, sunIntensity: 2.4, ambient: 0xa8d0ff, ambientIntensity: 1.1,
    decor: [["tree", 5, true], ["pine", 3, true], ["rock", 1.2, true], ["bush", 3, false], ["mushroom", 1, false]],
    decorCount: 950,
    grass: { root: 0x2f6330, tip: 0x6fae4c, density: 1, height: 0.44 }, flowers: [0xffe14a, 0xffffff, 0xd98cff, 0xff8fa8], rockTop: 0x5f8f3e,
    motes: { color: 0xfff2a0, rise: 0.25, rate: 9 },
  },
  cripta: {
    id: "cripta", name: "Campos da Cripta", subtitle: "Os mortos não descansam aqui", level: 6, boss: "gravekeeper",
    enemies: [["goblin", 2], ["assassin", 3], ["archer", 2], ["spellcaster", 3], ["summoner", 1.5], ["orc", 2]],
    ground: [0x5a6474, 0x6a7586, 0x4a5364], path: 0x7d8494, fog: 0x55657f, sky: 0x55657f,
    sun: 0xeef2ff, sunIntensity: 2.3, ambient: 0xc4cce0, ambientIntensity: 1.35,
    decor: [["deadTree", 4, true], ["tomb", 4, true], ["pillar", 1.5, true], ["rock", 1.5, true], ["bush", 1, false]],
    decorCount: 800, glowDecor: 0x9ad1ff,
    grass: { root: 0x3d4a52, tip: 0x8a9aa0, density: 0.55, height: 0.5 }, flowers: [0x9ad1ff], rockTop: 0x6a7480,
    motes: { color: 0xbfe0ff, rise: 0.5, rate: 7 },
  },
  vulcao: {
    id: "vulcao", name: "Ermos Vulcânicos", subtitle: "Cinza, brasa e artilharia", level: 11, boss: "ember_matriarch",
    enemies: [["berserker", 3], ["bombardier", 2], ["orc", 3], ["spellcaster", 2], ["splitter", 1.5], ["archer", 2]],
    ground: [0x6a4a40, 0x7e5646, 0x523a34], path: 0x8f6a52, fog: 0x5a2f24, sky: 0x5a2f24,
    sun: 0xffd0a8, sunIntensity: 2.7, ambient: 0xffc0a0, ambientIntensity: 1.25,
    decor: [["lavaRock", 4, true], ["rock", 4, true], ["deadTree", 2, true], ["pillar", 0.8, true]],
    decorCount: 750, glowDecor: 0xff6a1a,
    grass: { root: 0x3a2a22, tip: 0x7a5a3a, density: 0.18, height: 0.4 }, flowers: [], rockTop: 0x3a2e2a,
    motes: { color: 0xff8a2a, rise: 2.2, rate: 22 },
  },
  vazio: {
    id: "vazio", name: "O Vazio", subtitle: "O trono do Rei Oco", level: 16, boss: "hollow_king",
    enemies: [["assassin", 3], ["spellcaster", 3], ["summoner", 2], ["berserker", 2], ["bombardier", 1.5], ["splitter", 1.5]],
    ground: [0x574a80, 0x685a96, 0x463a6a], path: 0x7a68a8, fog: 0x2a1f47, sky: 0x2a1f47,
    sun: 0xe0d0ff, sunIntensity: 2.2, ambient: 0xb09ae6, ambientIntensity: 1.25,
    decor: [["crystal", 5, true], ["pillar", 2, true], ["rock", 2, true], ["deadTree", 1.5, true]],
    decorCount: 750, glowDecor: 0x73ffcc,
    grass: { root: 0x2f2550, tip: 0x73ffcc, density: 0.4, height: 0.45 }, flowers: [0x73ffcc, 0xc8a8ff], rockTop: 0x5a4a80,
    motes: { color: 0x73ffcc, rise: 0.8, rate: 14 },
  },
};
