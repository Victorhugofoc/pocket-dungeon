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
}

export const ZONE_ORDER = ["bosque", "cripta", "vulcao", "vazio"] as const;

export const ZONES: Record<string, ZoneDef> = {
  bosque: {
    id: "bosque", name: "Bosque Sombrio", subtitle: "Onde os goblins montaram acampamento", level: 1, boss: "bloodfang",
    enemies: [["goblin", 5], ["swarm", 3], ["archer", 2], ["orc", 2], ["splitter", 1]],
    ground: [0x3f7a3a, 0x4f8f41, 0x356b35], path: 0x9a8257, fog: 0x9fc7a8, sky: 0x9fc7a8,
    sun: 0xfff1d0, sunIntensity: 2.4, ambient: 0xa8d0ff, ambientIntensity: 1.1,
    decor: [["tree", 5, true], ["pine", 3, true], ["rock", 1.2, true], ["bush", 3, false], ["mushroom", 1, false]],
    decorCount: 950,
  },
  cripta: {
    id: "cripta", name: "Campos da Cripta", subtitle: "Os mortos não descansam aqui", level: 6, boss: "gravekeeper",
    enemies: [["goblin", 2], ["assassin", 3], ["archer", 2], ["spellcaster", 3], ["summoner", 1.5], ["orc", 2]],
    ground: [0x4a5568, 0x566178, 0x3d4658], path: 0x7d8494, fog: 0x55657f, sky: 0x55657f,
    sun: 0xe0e8ff, sunIntensity: 2.0, ambient: 0xb4bedc, ambientIntensity: 1.3,
    decor: [["deadTree", 4, true], ["tomb", 4, true], ["pillar", 1.5, true], ["rock", 1.5, true], ["bush", 1, false]],
    decorCount: 800, glowDecor: 0x9ad1ff,
  },
  vulcao: {
    id: "vulcao", name: "Ermos Vulcânicos", subtitle: "Cinza, brasa e artilharia", level: 11, boss: "ember_matriarch",
    enemies: [["berserker", 3], ["bombardier", 2], ["orc", 3], ["spellcaster", 2], ["splitter", 1.5], ["archer", 2]],
    ground: [0x3a2a26, 0x4a332b, 0x2b2020], path: 0x6b4a3a, fog: 0x5a2f24, sky: 0x5a2f24,
    sun: 0xffb37a, sunIntensity: 2.0, ambient: 0xff8a5a, ambientIntensity: 0.9,
    decor: [["lavaRock", 4, true], ["rock", 4, true], ["deadTree", 2, true], ["pillar", 0.8, true]],
    decorCount: 750, glowDecor: 0xff6a1a,
  },
  vazio: {
    id: "vazio", name: "O Vazio", subtitle: "O trono do Rei Oco", level: 16, boss: "hollow_king",
    enemies: [["assassin", 3], ["spellcaster", 3], ["summoner", 2], ["berserker", 2], ["bombardier", 1.5], ["splitter", 1.5]],
    ground: [0x43366a, 0x52417f, 0x352a55], path: 0x7a68a8, fog: 0x2a1f47, sky: 0x2a1f47,
    sun: 0xe0d0ff, sunIntensity: 2.2, ambient: 0xb09ae6, ambientIntensity: 1.25,
    decor: [["crystal", 5, true], ["pillar", 2, true], ["rock", 2, true], ["deadTree", 1.5, true]],
    decorCount: 750, glowDecor: 0x73ffcc,
  },
};
