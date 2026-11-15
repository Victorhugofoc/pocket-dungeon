// Zonas (biomas). Cada uma é um mapa aberto procedural com acampamentos de monstros e um chefe.

export type ScatterKind = "pebble" | "leaf" | "tuft" | "twig" | "fern" | "shard";

/** verdes da flora: base escura e topo claro de cada copa, pinheiro e arbusto */
export interface Foliage { tree: [number, number][]; pine: [number, number]; bush: [number, number] }

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
  /** partículas no ar: cor, cor das poucas acesas, se sobem (brasa) ou caem (folha), e quantas por segundo */
  motes: { color: number; lit: number; rise: number; rate: number };
  /** feixes de luz inclinados do sol até o chão, perto de árvores e bordas de mata: quantos no mapa, cor e brilho (aditivo) */
  shafts: { count: number; color: number; intensity: number };
  /** miudezas do chão (scatter.ts): [tipo, peças por 100 m², cores sorteadas por peça] */
  scatter: [ScatterKind, number, number[]][];
  /** manchas no chão e na grama (até 3): [cor, tamanho da mancha em m, quanto cobre 0..1] */
  stains: [number, number, number][];
  /** correção de cor (render.ts): tom das sombras e das luzes (perto de branco), saturação e contraste */
  grade: { shadow: number; light: number; saturation: number; contrast: number };
  /** verdes da flora (árvore, pinheiro, arbusto); sem isso, os verdes padrão */
  foliage?: Foliage;
  /** chapéu do cogumelo aceso, na cor de `glowDecor` (ou âmbar) */
  capGlow?: boolean;
  /** brilho próprio das pétalas (padrão 0,06) */
  flowerGlow?: number;
  /** brilho do material aceso da decoração (cristal, lascas; padrão 1,6) */
  glowStrength?: number;
  /** sombra de nuvens passando pelo chão e pelos personagens: quanto escurece o sol (0..1), tamanho das nuvens (m), velocidade (m/s)
   * e cobertura (0..1, fração do chão na sombra); `drift`: quanto a força e a cor do sol variam devagar (0..1) */
  clouds: { strength: number; size: number; speed: number; cover: number; drift: number };
  /** névoa de distância (começa em `start` m e engrossa com `density`, na cor `fog`) e névoa rasteira: força (0..1), altura em que
   * cai pela metade (m), cor, tamanho das manchas (m) e velocidade (m/s) */
  haze: { start: number; density: number; mist: number; mistHeight: number; mistColor: number; mistSize: number; mistSpeed: number };
}

export const ZONE_ORDER = ["bosque", "cripta", "vulcao", "vazio"] as const;

export const ZONES: Record<string, ZoneDef> = {
  bosque: {
    id: "bosque", name: "Bosque Sombrio", subtitle: "Onde os goblins montaram acampamento", level: 1, boss: "bloodfang",
    enemies: [["goblin", 5], ["swarm", 3], ["archer", 2], ["orc", 2], ["splitter", 1]],
    ground: [0x2f4e2c, 0x3a5a32, 0x243f27], path: 0x5e5242, fog: 0x31463f, sky: 0x31463f,
    sun: 0xd2dcea, sunIntensity: 2.6, ambient: 0x82a2b0, ambientIntensity: 1.25,
    decor: [["tree", 10, true], ["pine", 6, true], ["rock", 2.4, true], ["bush", 6, false], ["mushroom", 2, false]],
    decorCount: 950, glowDecor: 0xffa04a,
    grass: { root: 0x203c24, tip: 0x557e40, density: 1, height: 0.44 }, flowers: [0xb8a040, 0xa8aca0, 0x8a68b0, 0xa86878], rockTop: 0x3f5a30,
    motes: { color: 0xc8d890, lit: 0xffc860, rise: 0.25, rate: 60 },
    shafts: { count: 130, color: 0xbfe2dc, intensity: 0.26 },
    scatter: [["tuft", 10, [0x2a4e2a, 0x3a5e32, 0x56603a]], ["leaf", 14, [0x6a4a26, 0x7a5a2a, 0x4a5224, 0x5a3a20]], ["fern", 4.4, [0x22482a, 0x2c5830]],
      ["pebble", 3, [0x5a5850, 0x66645a, 0x4c4a44]], ["twig", 2.4, [0x4a3424, 0x3a2a1e]]],
    grade: { shadow: 0x98b4c8, light: 0xf4f0e4, saturation: 0.92, contrast: 1.06 },
    foliage: { tree: [[0x15301f, 0x335e3c], [0x183622, 0x3a6640], [0x132e24, 0x305a40]], pine: [0x13322a, 0x2f5c44], bush: [0x183a24, 0x3c6438] },
    capGlow: true,
    stains: [[0x18281a, 16, 0.42], [0x4e5a30, 11, 0.24], [0x22381e, 30, 0.45]],
    clouds: { strength: 0.6, size: 58, speed: 1.8, cover: 0.5, drift: 0.1 },
    haze: { start: 30, density: 0.015, mist: 0.36, mistHeight: 0.8, mistColor: 0x5c766c, mistSize: 10, mistSpeed: 0.7 },
  },
  cripta: {
    id: "cripta", name: "Campos da Cripta", subtitle: "Os mortos não descansam aqui", level: 6, boss: "gravekeeper",
    enemies: [["goblin", 2], ["assassin", 3], ["archer", 2], ["spellcaster", 3], ["summoner", 1.5], ["orc", 2]],
    ground: [0x3c4644, 0x48524e, 0x30383a], path: 0x4a4c50, fog: 0x3e4c64, sky: 0x3e4c64,
    sun: 0xd8e2ff, sunIntensity: 2.1, ambient: 0x9aa4ac, ambientIntensity: 1.15,
    decor: [["deadTree", 2.2, true], ["tomb", 8, true], ["pillar", 1.5, true], ["rock", 1.5, true], ["bush", 1, false]],
    decorCount: 950, glowDecor: 0x9ad1ff,
    grass: { root: 0x343e3c, tip: 0x5c6a66, density: 0.55, height: 0.5 }, flowers: [0x6a7a90], rockTop: 0x4a5a58,
    motes: { color: 0xbfe0ff, lit: 0xd8f0ff, rise: 0.5, rate: 45 },
    shafts: { count: 70, color: 0xc4d4ff, intensity: 0.12 },
    scatter: [["tuft", 8, [0x5a6a6a, 0x6a786e, 0x6a7468]], ["leaf", 6, [0x4a4040, 0x5a5048, 0x3e3a3a]], ["pebble", 4, [0x5a6070, 0x4a5060, 0x6a7080]], ["twig", 1.6, [0x6a625a, 0x5a544e]]],
    grade: { shadow: 0xa8b8ff, light: 0xeef2f0, saturation: 0.85, contrast: 1.22 },
    foliage: { tree: [[0x2a3634, 0x4e5e58]], pine: [0x223230, 0x3e504c], bush: [0x2c3a38, 0x52645c] },
    stains: [[0x323a48, 14, 0.45], [0x50586a, 10, 0.32], [0x2a3038, 26, 0.4]],
    clouds: { strength: 0.28, size: 64, speed: 1.2, cover: 0.45, drift: 0.08 },
    haze: { start: 22, density: 0.017, mist: 0.5, mistHeight: 0.5, mistColor: 0x7084b0, mistSize: 8, mistSpeed: 0.5 },
  },
  vulcao: {
    id: "vulcao", name: "Ermos Vulcânicos", subtitle: "Cinza, brasa e artilharia", level: 11, boss: "ember_matriarch",
    enemies: [["berserker", 3], ["bombardier", 2], ["orc", 3], ["spellcaster", 2], ["splitter", 1.5], ["archer", 2]],
    ground: [0x4c4440, 0x5a504a, 0x3c3532], path: 0x645850, fog: 0x3c3836, sky: 0x3c3836,
    sun: 0xffc8a0, sunIntensity: 2.4, ambient: 0xaaa4a8, ambientIntensity: 1.15,
    decor: [["lavaRock", 4, true], ["rock", 4, true], ["deadTree", 2, true], ["pillar", 0.8, true]],
    decorCount: 750, glowDecor: 0xff6a1a,
    grass: { root: 0x3a2a22, tip: 0x7a5a3a, density: 0.18, height: 0.4 }, flowers: [], rockTop: 0x4a4646,
    motes: { color: 0xff8a2a, lit: 0xffc060, rise: 2.2, rate: 70 },
    shafts: { count: 0, color: 0xffb890, intensity: 0 },
    scatter: [["pebble", 10, [0x4a3a34, 0x5a4a44, 0x6a5650, 0x3a2e2a]], ["twig", 1.2, [0x3a302a, 0x2a2220]], ["tuft", 6, [0x5a4a30, 0x6a5434, 0x4a3a28]], ["shard", 1.6, [0x2a2020, 0x3a2a26]]],
    grade: { shadow: 0x9890a8, light: 0xffe4cc, saturation: 0.72, contrast: 1.12 },
    stains: [[0x2a2422, 12, 0.45], [0x7a726c, 18, 0.42], [0x34282a, 26, 0.35]],
    clouds: { strength: 0.32, size: 44, speed: 2.6, cover: 0.5, drift: 0.12 },
    haze: { start: 14, density: 0.026, mist: 0.4, mistHeight: 2.2, mistColor: 0x6a6462, mistSize: 12, mistSpeed: 1.4 },
  },
  vazio: {
    id: "vazio", name: "O Vazio", subtitle: "O trono do Rei Oco", level: 16, boss: "hollow_king",
    enemies: [["assassin", 3], ["spellcaster", 3], ["summoner", 2], ["berserker", 2], ["bombardier", 1.5], ["splitter", 1.5]],
    ground: [0x463e62, 0x524872, 0x383052], path: 0x5c527c, fog: 0x221a3c, sky: 0x221a3c,
    sun: 0xd8ccff, sunIntensity: 2.0, ambient: 0xa888d0, ambientIntensity: 1.45,
    decor: [["crystal", 5, true], ["pillar", 2, true], ["rock", 2, true], ["deadTree", 1.5, true]],
    decorCount: 750, glowDecor: 0x40e0ff,
    grass: { root: 0x2a2248, tip: 0x3e9a8a, density: 0.4, height: 0.45 }, flowers: [0x73ffcc, 0xc8a8ff], rockTop: 0x4a3e6c,
    motes: { color: 0x60d8ff, lit: 0xe0b0ff, rise: 0.8, rate: 110 },
    shafts: { count: 60, color: 0xa8ffe4, intensity: 0.14 },
    scatter: [["pebble", 5, [0x4a3a70, 0x5a4a8a, 0x6a5aa0]], ["tuft", 4, [0x2f2550, 0x3a7a6a]], ["shard", 1, [0x3a90b0, 0x7a68b0, 0x3a8090]]],
    grade: { shadow: 0x9890e8, light: 0xe8f4f0, saturation: 0.82, contrast: 1.12 },
    glowStrength: 1.0,
    stains: [[0x2a2048, 14, 0.45], [0x3a6a70, 9, 0.3], [0x5a4a8e, 28, 0.42]],
    flowerGlow: 0.3,
    clouds: { strength: 0.45, size: 70, speed: 0.9, cover: 0.5, drift: 0.06 },
    haze: { start: 20, density: 0.022, mist: 0.3, mistHeight: 0.8, mistColor: 0x463a80, mistSize: 10, mistSpeed: 0.4 },
  },
};
