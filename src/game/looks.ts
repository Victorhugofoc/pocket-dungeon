// "Blocos fiéis": cada personagem do Dungeon Reign remodelado em blocos (cores e peças marcantes do sprite original).
import * as THREE from "three";
import { box, buildRig, mat, type Rig, type RigOptions } from "./models";

type Target = "head" | "body" | "inner" | "armL" | "armR" | "legL" | "legR";

interface Part {
  to: Target;
  c: number;
  s: [number, number, number];
  p: [number, number, number];
  rz?: number;
  glow?: boolean;
  /** repete espelhado em X */
  m?: boolean;
}

interface Look {
  base: Omit<RigOptions, "scale">;
  parts: Part[];
  scale?: number;
}

const b = (to: Target, c: number, w: number, h: number, d: number, x: number, y: number, z: number, o: Partial<Part> = {}): Part =>
  ({ to, c, s: [w, h, d], p: [x, y, z], ...o });

// paleta
const STEEL = 0xb9c2cc, BONE = 0xe8dcc0, GOLD = 0xe8b93a, WOOD = 0x6b4a2e, BLACK = 0x1c1c22, SKIN = 0xe8bd98;

const LOOKS: Record<string, Look> = {
  // ------------------------------------------------------------ heróis
  frostine: {
    base: { body: "robed", color: 0x6fa3e0, accent: 0xdff3ff, skin: 0xd9ecf7, glow: 0x9be4ff, weapon: "staff", crown: true },
    parts: [
      b("head", 0xeaf6ff, 0.5, 0.56, 0.14, 0, -0.12, -0.27),
      b("body", 0xeaf6ff, 0.84, 0.14, 0.52, 0, 1.54, 0),
      b("body", 0xbfe0ff, 1.15, 0.14, 1.05, 0, 0.1, -0.12),
      b("body", 0xdff3ff, 0.12, 0.9, 0.04, 0, 0.9, 0.29),
    ],
  },
  kaelen: {
    base: { body: "humanoid", color: 0x2f3f7a, accent: WOOD, skin: SKIN, legs: 0x26305a, weapon: "sword", glow: 0xffe066 },
    parts: [
      b("head", 0xe8e2d0, 0.54, 0.2, 0.54, 0, 0.2, -0.02),
      b("head", 0xe8e2d0, 0.5, 0.3, 0.1, 0, 0, -0.27),
      b("body", 0x3a56a8, 0.74, 1.0, 0.08, 0, 0.95, -0.27),
      b("body", GOLD, 0.73, 0.08, 0.43, 0, 0.82, 0),
      b("body", GOLD, 0.1, 0.5, 0.04, 0, 1.15, 0.21),
    ],
  },
  aurelius: {
    base: { body: "robed", color: 0x6a3fb0, accent: 0x4b2a85, skin: 0xe8c8a8, glow: 0xd08cff, weapon: "none", bare: true },
    parts: [
      b("head", 0x5a2f9a, 0.98, 0.07, 0.98, 0, 0.27, 0),
      b("head", 0x5a2f9a, 0.5, 0.28, 0.5, 0, 0.44, 0),
      b("head", 0x5a2f9a, 0.3, 0.26, 0.3, 0.03, 0.7, -0.05),
      b("head", 0x5a2f9a, 0.16, 0.2, 0.16, 0.1, 0.9, -0.1),
      b("head", GOLD, 0.52, 0.07, 0.52, 0, 0.34, 0),
      b("head", 0xf2f2f2, 0.38, 0.52, 0.12, 0, -0.42, 0.2),
      b("armR", 0xd08cff, 0.32, 0.32, 0.32, 0, -0.9, 0.25, { glow: true }),
      b("body", GOLD, 0.9, 0.08, 0.7, 0, 0.22, 0),
      b("body", GOLD, 0.1, 0.9, 0.04, 0, 0.95, 0.28),
    ],
  },
  ignis: {
    base: { body: "humanoid", color: 0x2b2b30, accent: WOOD, skin: 0xe0a070, legs: 0x2b2b30, glow: 0xff7a1a, weapon: "claws" },
    parts: [
      b("head", 0xe8331a, 0.54, 0.18, 0.54, 0, 0.26, 0),
      b("head", 0xe8331a, 0.14, 0.32, 0.14, -0.16, 0.46, 0, { rz: 0.35 }),
      b("head", 0xff5a2a, 0.14, 0.38, 0.14, 0.04, 0.52, -0.04),
      b("head", 0xe8331a, 0.14, 0.3, 0.14, 0.2, 0.44, 0.05, { rz: -0.35 }),
      b("head", 0xc8281e, 0.14, 0.3, 0.14, 0, 0.42, -0.2),
      b("body", 0xc8281e, 0.74, 0.14, 0.44, 0, 0.78, 0),
      b("body", 0xc8281e, 0.14, 0.5, 0.08, 0.24, 0.5, 0.22),
      b("armL", 0xe0a070, 0.22, 0.34, 0.22, 0, -0.42, 0),
      b("armR", 0xe0a070, 0.22, 0.34, 0.22, 0, -0.42, 0),
    ],
  },
  zephyr: {
    base: { body: "humanoid", color: 0xc8a078, accent: WOOD, skin: 0xe0b088, legs: 0x3a3f5a, weapon: "guns" },
    parts: [
      b("body", 0x2f8f8a, 1.0, 0.5, 0.62, 0, 1.22, 0),
      b("body", 0x7fd9cc, 1.03, 0.08, 0.65, 0, 1.0, 0),
      b("body", 0x256f6c, 0.82, 0.75, 0.08, 0, 0.92, -0.3),
      b("legL", 0x6b3f2a, 0.3, 0.26, 0.32, 0, -0.58, 0.02),
      b("legR", 0x6b3f2a, 0.3, 0.26, 0.32, 0, -0.58, 0.02),
      b("head", 0x9a9488, 0.98, 0.06, 0.98, 0, 0.27, 0),
      b("head", 0x9a9488, 0.5, 0.22, 0.5, 0, 0.4, 0),
      b("head", 0x5a4a3a, 0.52, 0.06, 0.52, 0, 0.32, 0),
      b("head", 0x2f8f8a, 0.52, 0.2, 0.3, 0, -0.15, 0.12),
    ],
  },
  varok: {
    base: { body: "brute", color: 0x9aa3ad, accent: WOOD, skin: 0xe0b090, legs: 0x7d8690, weapon: "mace" },
    parts: [
      b("head", STEEL, 0.5, 0.3, 0.5, 0, 0.12, -0.02),
      b("head", BONE, 0.12, 0.12, 0.1, 0.3, 0.2, 0, { m: true }),
      b("head", BONE, 0.08, 0.24, 0.08, 0.36, 0.34, 0, { m: true }),
      b("head", WOOD, 0.3, 0.16, 0.1, 0, -0.2, 0.2),
      b("body", STEEL, 0.44, 0.26, 0.62, 0.64, 1.5, 0, { m: true }),
      b("body", 0xb8262e, 0.92, 1.15, 0.08, 0, 0.92, -0.34),
      b("body", WOOD, 1.02, 0.12, 0.6, 0, 0.78, 0),
    ],
  },
  umbra: {
    base: { body: "humanoid", color: BLACK, accent: BLACK, skin: BLACK, legs: BLACK, glow: 0xc83cd9, weapon: "daggers", hood: true },
    parts: [
      b("body", 0xc83cd9, 0.5, 0.14, 0.46, 0, 1.47, 0),
      b("body", 0xc83cd9, 0.12, 0.12, 0.75, -0.15, 1.4, -0.52),
      b("body", 0xa02ab8, 0.1, 0.1, 0.55, 0.1, 1.3, -0.45),
      b("body", 0x3a3a44, 0.72, 0.08, 0.42, 0, 0.8, 0),
    ],
  },
  seraph: {
    base: { body: "humanoid", color: 0xe8ecf2, accent: GOLD, skin: 0xe8ecf2, legs: 0xc8ced8, glow: GOLD, weapon: "shield" },
    parts: [
      b("head", GOLD, 0.1, 0.3, 0.5, 0, 0.32, -0.02),
      b("head", 0x2a3040, 0.38, 0.09, 0.04, 0, 0.03, 0.26),
      b("head", GOLD, 0.08, 0.22, 0.22, 0.3, 0.15, 0, { m: true }),
      b("body", 0x4a8fd6, 0.74, 1.05, 0.08, 0, 0.95, -0.27),
      b("body", GOLD, 0.74, 0.1, 0.44, 0, 0.78, 0),
      b("body", GOLD, 0.2, 0.3, 0.04, 0, 1.15, 0.21),
      b("body", 0xe8ecf2, 0.3, 0.2, 0.46, 0.5, 1.48, 0, { m: true }),
    ],
  },
  vesper: {
    base: { body: "robed", color: 0xd9841f, accent: WOOD, skin: 0x3a2a2a, glow: 0x8cf273, weapon: "staff", bare: true },
    parts: [
      b("body", 0x2a1a12, 0.88, 0.1, 0.68, 0, 0.3, 0),
      b("body", 0x2a1a12, 0.76, 0.1, 0.56, 0, 0.82, 0),
      b("body", 0x2a1a12, 0.66, 0.08, 0.46, 0, 1.26, 0),
      b("head", 0xd9841f, 0.92, 0.07, 0.92, 0, 0.27, 0),
      b("head", 0xd9841f, 0.46, 0.26, 0.46, 0, 0.43, 0),
      b("head", 0x2a1a12, 0.28, 0.26, 0.28, 0.05, 0.68, -0.05),
      b("head", 0xd9841f, 0.14, 0.2, 0.14, 0.12, 0.88, -0.1),
      b("armR", BONE, 0.3, 0.3, 0.3, 0, 0.78, 0.22),
    ],
  },
  // ------------------------------------------------------------ inimigos
  goblin: {
    base: { body: "humanoid", color: 0x7a5230, accent: WOOD, skin: 0x6fae4a, legs: 0x5a8a3a, weapon: "club" }, scale: 0.75,
    parts: [
      b("head", 0x6fae4a, 0.3, 0.12, 0.06, 0.38, 0.06, 0, { m: true }),
      b("head", 0x5a9a3c, 0.1, 0.1, 0.14, 0, -0.05, 0.3),
      b("armL", 0x6fae4a, 0.21, 0.4, 0.21, 0, -0.5, 0),
      b("armR", 0x6fae4a, 0.21, 0.4, 0.21, 0, -0.5, 0),
    ],
  },
  orc: {
    base: { body: "brute", color: 0x4d8a3a, accent: WOOD, skin: 0x4d8a3a, legs: 0x3f3026, weapon: "none" }, scale: 1.15,
    parts: [
      b("body", 0x5b4636, 1.04, 0.5, 0.62, 0, 0.98, 0),
      b("body", 0x8a9099, 0.44, 0.26, 0.6, 0.64, 1.5, 0),
      b("head", 0xf0ead0, 0.07, 0.14, 0.07, 0.12, -0.14, 0.24, { m: true }),
      b("armR", WOOD, 0.1, 0.1, 1.4, 0, -0.68, 0.6),
      b("armR", STEEL, 0.08, 0.75, 0.5, 0, -0.68, 1.2),
    ],
  },
  swarm: { base: { body: "bug", color: 0x6a3fb0, accent: 0x4b2a85 }, scale: 0.6, parts: [b("body", 0x6a3fb0, 0.1, 0.2, 0.1, 0.16, 0.26, 0.4, { m: true })] },
  assassin: {
    base: { body: "humanoid", color: 0x8a8f99, accent: WOOD, skin: 0xf2f2f2, legs: 0x6a6f7a, weapon: "daggers" }, scale: 0.9,
    parts: [
      b("head", 0x2a2a30, 0.54, 0.2, 0.54, 0, 0.2, -0.03),
      b("head", 0x2a2a30, 0.1, 0.1, 0.55, 0, 0.16, -0.5),
      b("head", 0xf2f2f2, 0.12, 0.16, 0.06, 0.17, 0.3, 0.2, { m: true }),
      b("head", 0xc8281e, 0.06, 0.14, 0.03, 0.17, -0.1, 0.26, { m: true }),
      b("body", 0xc8281e, 0.74, 0.1, 0.44, 0, 0.78, 0),
    ],
  },
  archer: {
    base: { body: "humanoid", color: 0x5a2a30, accent: WOOD, skin: BONE, legs: BONE, weapon: "bow", hood: true }, scale: 0.9,
    parts: [b("body", 0x4a2228, 0.72, 0.8, 0.08, 0, 1.0, -0.26), b("body", BONE, 0.3, 0.3, 0.04, 0, 1.15, 0.21)],
  },
  spellcaster: {
    base: { body: "robed", color: 0x1f5a66, accent: 0x5a2a6a, skin: 0x4a7ad9, glow: 0xe84ad9, weapon: "staff", bare: true }, scale: 0.9,
    parts: [
      b("head", 0xe84ad9, 0.1, 0.26, 0.1, 0.15, 0.34, 0, { m: true, glow: true }),
      b("head", 0xe84ad9, 0.1, 0.36, 0.1, 0, 0.4, 0, { glow: true }),
      b("body", 0x5a2a6a, 0.84, 0.16, 0.62, 0, 1.56, 0),
    ],
  },
  bombardier: {
    base: { body: "brute", color: 0x7a4a2a, accent: WOOD, skin: 0xd9a070, legs: 0x4a3020, weapon: "none" }, scale: 0.85,
    parts: [
      b("head", 0xc8501e, 0.4, 0.32, 0.14, 0, -0.24, 0.2),
      b("head", 0x5a4a3a, 0.48, 0.2, 0.48, 0, 0.2, 0),
      b("body", 0xc8a06a, 0.3, 0.3, 0.95, -0.5, 1.72, 0.1),
      b("armR", 0x1c1c1c, 0.36, 0.36, 0.36, 0, -0.88, 0.1),
      b("armR", 0xff9a3c, 0.06, 0.16, 0.06, 0, -0.62, 0.1, { glow: true }),
    ],
  },
  summoner: {
    base: { body: "robed", color: 0x3a2a55, accent: 0x7a5230, skin: 0xd9cfe0, glow: 0x7affc8, weapon: "none", bare: true },
    parts: [
      b("head", 0xe8e8f0, 0.52, 0.2, 0.52, 0, 0.2, -0.02),
      b("head", 0xe8e8f0, 0.5, 0.75, 0.1, 0, -0.22, -0.27),
      b("armL", 0x7a5230, 0.3, 0.38, 0.1, 0, -0.82, 0.2),
      b("armL", 0x7affc8, 0.24, 0.3, 0.04, 0, -0.82, 0.27, { glow: true }),
    ],
  },
  berserker: {
    base: { body: "brute", color: 0xc89a7a, accent: WOOD, skin: 0xc89a7a, legs: 0x5a4636, weapon: "none" }, scale: 1.05,
    parts: [
      b("head", 0x9aa3ad, 0.48, 0.22, 0.48, 0, 0.16, 0),
      b("head", BONE, 0.1, 0.3, 0.1, 0.3, 0.3, 0, { m: true }),
      b("head", 0xd9641e, 0.4, 0.36, 0.14, 0, -0.26, 0.2),
      b("body", 0x4a8fd6, 1.02, 0.1, 0.6, 0, 1.26, 0),
      b("body", 0x8a7a66, 1.04, 0.3, 0.62, 0, 0.82, 0),
      b("armR", WOOD, 0.09, 0.09, 0.8, 0, -0.68, 0.4), b("armR", STEEL, 0.07, 0.5, 0.36, 0, -0.68, 0.75),
      b("armL", WOOD, 0.09, 0.09, 0.8, 0, -0.68, 0.4), b("armL", STEEL, 0.07, 0.5, 0.36, 0, -0.68, 0.75),
    ],
  },
  splitter: {
    base: { body: "slime", color: 0xe85aa0, accent: 0xff9ac8, glow: 0xf2e8e0 }, scale: 1.1,
    parts: [b("body", 0x2a1a22, 0.5, 0.1, 0.05, 0, 0.36, 0.66), b("body", BONE, 0.3, 0.08, 0.08, 0.35, 0.3, 0.2, { rz: 0.6 })],
  },
  // ------------------------------------------------------------ chefes
  bloodfang: {
    base: { body: "brute", color: 0xc82a2a, accent: WOOD, skin: 0xd9441e, legs: 0x8a1c1c, glow: 0xffe14a, weapon: "none" }, scale: 2.6,
    parts: [
      b("body", 0x1c1010, 1.03, 0.07, 0.6, 0, 1.32, 0), b("body", 0x1c1010, 1.03, 0.07, 0.6, 0, 1.12, 0), b("body", 0x1c1010, 1.03, 0.07, 0.6, 0, 0.92, 0),
      b("armL", 0x1c1010, 0.32, 0.06, 0.32, 0, -0.25, 0), b("armL", 0x1c1010, 0.32, 0.06, 0.32, 0, -0.5, 0),
      b("armR", 0x1c1010, 0.32, 0.06, 0.32, 0, -0.25, 0), b("armR", 0x1c1010, 0.32, 0.06, 0.32, 0, -0.5, 0),
      b("body", 0x5a3020, 1.05, 0.16, 0.62, 0, 0.74, 0),
      b("body", 0x4a5a7a, 0.95, 0.14, 0.68, 0, 1.5, 0),
      b("body", BONE, 0.5, 0.45, 0.5, -0.68, 1.66, 0),
      b("body", 0x1c1010, 0.1, 0.12, 0.06, -0.78, 1.7, 0.26), b("body", 0x1c1010, 0.1, 0.12, 0.06, -0.58, 1.7, 0.26),
      b("head", 0xf2ead8, 0.38, 0.16, 0.22, 0, -0.16, 0.26),
      b("head", 0xd9441e, 0.14, 0.14, 0.08, 0.2, 0.3, 0, { m: true }),
      b("head", 0x1c1010, 0.46, 0.05, 0.46, 0, 0.14, 0),
      b("armR", 0x5a3020, 0.12, 0.12, 0.5, 0, -0.7, 0.25),
      b("armR", 0xc8d0d8, 0.08, 0.6, 1.5, 0, -0.6, 1.2),
    ],
  },
  gravekeeper: {
    base: { body: "robed", color: 0x5f645f, accent: WOOD, skin: 0x101412, glow: 0x73ffcc, weapon: "none" }, scale: 2.4,
    parts: [
      b("body", 0x4a4f4a, 0.96, 0.2, 0.76, 0, 0.12, 0),
      b("body", 0x6b4a2e, 0.78, 0.1, 0.58, 0, 0.98, 0),
      b("head", 0x4a4f4a, 0.6, 0.2, 0.62, 0, 0.3, -0.04),
      b("armR", 0x7a5a3a, 0.09, 1.9, 0.09, 0, -0.5, 0.25),
      b("armR", 0x8a9099, 0.38, 0.46, 0.06, 0, -1.6, 0.25),
      b("armL", 0x3a3a3a, 0.28, 0.36, 0.28, 0, -0.98, 0.2),
      b("armL", 0xffd36a, 0.18, 0.22, 0.3, 0, -0.98, 0.2, { glow: true }),
    ],
  },
  ember_matriarch: {
    base: { body: "robed", color: 0x2a1a16, accent: 0x1c1210, skin: 0x2a1a16, glow: 0xff6a1a, weapon: "none", bare: true }, scale: 2.2,
    parts: [
      b("inner", 0x1c1210, 1.7, 1.2, 1.9, 0, 0.8, -1.25),
      b("inner", 0xff6a1a, 1.74, 0.07, 1.5, 0, 0.95, -1.25, { glow: true }),
      b("inner", 0xff6a1a, 0.07, 1.0, 1.94, 0.42, 0.8, -1.25, { m: true, glow: true }),
      b("inner", 0xff6a1a, 1.2, 0.07, 1.94, 0, 0.5, -1.25, { glow: true }),
      ...[-0.2, -0.75, -1.3, -1.85].flatMap((z) => [
        b("inner", 0x1c1210, 1.5, 0.12, 0.12, 1.3, 1.0, z, { m: true, rz: -0.45 }),
        b("inner", 0x1c1210, 0.12, 1.3, 0.12, 2.0, 0.65, z, { m: true }),
      ]),
      b("head", 0x1c1210, 0.5, 0.3, 0.5, 0, 0.26, -0.05),
      b("head", 0x1c1210, 0.5, 0.7, 0.14, 0, -0.1, -0.3),
      b("body", 0xff6a1a, 0.66, 0.06, 0.46, 0, 1.2, 0, { glow: true }),
      b("body", 0xff6a1a, 0.76, 0.06, 0.56, 0, 0.8, 0, { glow: true }),
      b("body", 0xff6a1a, 0.06, 0.5, 0.56, 0.2, 0.55, 0, { glow: true }),
    ],
  },
  hollow_king: {
    base: { body: "robed", color: 0x3a2a6a, accent: GOLD, skin: BONE, glow: GOLD, weapon: "none", crown: true }, scale: 2.6,
    parts: [
      b("body", 0xb8a8e0, 0.92, 0.22, 0.68, 0, 1.56, 0),
      b("body", GOLD, 0.9, 0.08, 0.7, 0, 0.22, 0),
      b("body", GOLD, 0.12, 1.2, 0.04, 0, 0.9, 0.29),
      b("body", BONE, 0.3, 0.3, 0.04, 0, 1.3, 0.24),
      b("armR", GOLD, 0.09, 2.3, 0.09, 0, -0.3, 0.25),
      b("armR", GOLD, 0.56, 0.08, 0.08, 0, 0.9, 0.25),
      b("armR", GOLD, 0.08, 0.34, 0.08, 0.26, 1.06, 0.25, { m: true }),
      b("armR", 0x4ad9d0, 0.26, 0.26, 0.26, 0, 1.08, 0.25, { glow: true }),
    ],
  },
};

export function hasLook(id: string): boolean {
  return id in LOOKS;
}

export function lookScale(id: string): number {
  return LOOKS[id]?.scale ?? 1;
}

export function buildLook(id: string, scaleMult: number, champion = false): Rig {
  const look = LOOKS[id];
  const rig = buildRig({ ...look.base, scale: (look.scale ?? 1) * scaleMult });
  const cache = new Map<string, THREE.MeshStandardMaterial>();
  const material = (c: number, glow: boolean) => {
    const k = c + (glow ? "g" : "");
    let m = cache.get(k);
    if (!m) {
      m = mat(c, glow ? c : 0x000000, glow ? 1.4 : 1);
      cache.set(k, m);
      rig.mats.push(m);
      rig.baseEmissive.push(m.emissive.clone());
    }
    return m;
  };
  const target = (t: Target): THREE.Object3D | null =>
    t === "inner" ? rig.inner : t === "head" ? rig.head : t === "body" ? rig.body : rig[t];
  const parts = champion ? [...look.parts, b("head", 0xffc83d, 0.5, 0.08, 0.5, 0, 0.44, 0, { glow: true })] : look.parts;
  for (const p of parts) {
    const parent = target(p.to);
    if (!parent) continue;
    for (const sign of p.m ? [1, -1] : [1]) {
      const mesh = box(material(p.c, p.glow === true), p.s[0], p.s[1], p.s[2], p.p[0] * sign, p.p[1], p.p[2]);
      if (p.rz) mesh.rotation.z = p.rz * sign;
      parent.add(mesh);
    }
  }
  return rig;
}
