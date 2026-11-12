// Personagens modelados por código: corpo articulado (quadril, tronco, cabeça, braços e pernas com cotovelo e joelho),
// peças de roupa/arma por personagem e animação procedural. Os designs seguem os sprites do Dungeon Reign.
import * as THREE from "three";
import { merge, paint, prep, xf } from "./flora";
import type { AnimState, Rig } from "./models";

type G = THREE.BufferGeometry;
type Bone =
  | "hips" | "torso" | "head" | "armL" | "armR" | "foreL" | "foreR" | "thighL" | "thighR" | "shinL" | "shinR"
  | "cape" | "tail" | "wingL" | "wingR" | "skirt";
type Style = "swing" | "shoot" | "dual" | "cast" | "thrust" | "throw" | "bite";

export interface CharState {
  bones: Partial<Record<Bone, THREE.Group>>;
  legs: THREE.Group[]; // patas extras (aranha)
  style: Style;
  /** pose de descanso dos braços: [ombro x, cotovelo x] */
  poseR: [number, number];
  poseL: [number, number];
  form: "biped" | "robed" | "bat" | "slime" | "spider";
  shot: number;
}

// ---------------------------------------------------------------- primitivas (já pintadas por vértice)
const dk = (c: number, f = 0.68) => new THREE.Color(c).multiplyScalar(f).getHex();
const lt = (c: number, f = 0.25) => new THREE.Color(c).lerp(new THREE.Color(0xffffff), f).getHex();

function sph(r: number, c: number, sx = 1, sy = 1, sz = 1, c2 = dk(c)): G {
  const g = prep(new THREE.SphereGeometry(r, 12, 9), true);
  g.scale(sx, sy, sz);
  return paint(g, c2, c, -r * sy, r * sy);
}
function cap(r: number, len: number, c: number, c2 = dk(c)): G {
  const g = prep(new THREE.CapsuleGeometry(r, len, 4, 10), true);
  return paint(g, c2, c, -len / 2 - r, len / 2 + r);
}
function cyl(r0: number, r1: number, h: number, c: number, sides = 10, c2 = dk(c)): G {
  const g = prep(new THREE.CylinderGeometry(r1, r0, h, sides), sides > 6);
  return paint(g, c2, c, -h / 2, h / 2);
}
function cone(r: number, h: number, c: number, sides = 10, c2 = dk(c)): G {
  const g = prep(new THREE.ConeGeometry(r, h, sides), sides > 6);
  return paint(g, c2, c, -h / 2, h / 2);
}
function bx(w: number, h: number, d: number, c: number, c2 = dk(c, 0.8)): G {
  const g = prep(new THREE.BoxGeometry(w, h, d), false);
  return paint(g, c2, c, -h / 2, h / 2);
}
/** superfície de revolução: pontos [raio, y] de baixo para cima */
function lathe(pts: [number, number][], c: number, c2 = dk(c), seg = 14): G {
  const g = prep(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), true);
  const ys = pts.map((p) => p[1]);
  return paint(g, c2, c, Math.min(...ys), Math.max(...ys));
}
function torus(r: number, tube: number, c: number): G {
  const g = prep(new THREE.TorusGeometry(r, tube, 6, 14), true);
  g.rotateX(Math.PI / 2);
  return paint(g, dk(c), c, -tube, tube);
}
const at = xf;

// ---------------------------------------------------------------- construtor
class Builder {
  solid = new Map<Bone | string, G[]>();
  glow = new Map<Bone | string, G[]>();
  style: Style = "swing";
  poseR: [number, number] = [0.1, -0.3];
  poseL: [number, number] = [0.1, -0.3];
  form: CharState["form"] = "biped";
  bulk = 1;
  scale = 1;
  glowColor = 0xffffff;
  rough = 0.72;
  extraLegs = 0;

  add(bone: Bone | string, ...g: G[]): this {
    const l = this.solid.get(bone) ?? [];
    l.push(...g);
    this.solid.set(bone, l);
    return this;
  }
  lit(bone: Bone | string, ...g: G[]): this {
    const l = this.glow.get(bone) ?? [];
    l.push(...g);
    this.glow.set(bone, l);
    return this;
  }
}

interface BodyOpts {
  skin: number;
  top: number;
  bottom?: number;
  boots?: number;
  sleeve?: number;
  hands?: number;
  bulk?: number;
  head?: number;
  eyes?: number | null;
  eyeGlow?: boolean;
  /** manto até o chão em vez de pernas */
  robe?: { color: number; hem?: number; flare?: number };
}

// medidas na escala 1 (altura ~2.0)
const HIP_Y = 0.92;
const TORSO_Y = 0.08;
const HEAD_Y = 0.6;
const SHOULDER_Y = 0.46;

function body(b: Builder, o: BodyOpts): void {
  const k = o.bulk ?? 1;
  b.bulk = k;
  const hs = o.head ?? 1;
  const sleeve = o.sleeve ?? o.top;
  const bottom = o.bottom ?? dk(o.top, 0.6);
  // tronco
  b.add("hips", at(sph(0.2 * k, bottom, 1, 0.72, 0.82), 0, 0, 0));
  b.add("torso", at(sph(0.26, o.top, 1.06 * k, 1.18, 0.8 * k), 0, 0.3, 0), at(cyl(0.2 * k, 0.24 * k, 0.24, o.top), 0, 0.1, 0));
  b.add("torso", at(cyl(0.07, 0.075, 0.12, o.skin), 0, 0.57, 0));
  // cabeça
  b.add("head", at(sph(0.215 * hs, o.skin, 1, 1.04, 1), 0, 0.2 * hs, 0));
  if (o.eyes !== null) {
    const ec = o.eyes ?? 0x1c1c22;
    for (const s of [-1, 1]) {
      const e = at(sph(0.034 * hs, ec, 1, 1.2, 0.6, ec), s * 0.082 * hs, 0.21 * hs, 0.195 * hs);
      if (o.eyeGlow) b.lit("head", e);
      else b.add("head", e);
    }
  }
  // braços
  for (const [arm, fore] of [["armL", "foreL"], ["armR", "foreR"]] as const) {
    b.add(arm, at(sph(0.1 * k, sleeve), 0, 0, 0), at(cap(0.078 * k, 0.2, sleeve), 0, -0.17, 0));
    b.add(fore, at(cap(0.066 * k, 0.17, sleeve), 0, -0.14, 0), at(sph(0.078 * Math.sqrt(k), o.hands ?? o.skin), 0, -0.31, 0));
  }
  if (o.robe) {
    b.form = "robed";
    const fl = o.robe.flare ?? 1;
    b.add("skirt", lathe([[0.5 * fl, -0.9], [0.44 * fl, -0.78], [0.3 * fl * k, -0.3], [0.22 * k, 0.05], [0.2 * k, 0.12]], o.robe.color, dk(o.robe.color, 0.55)));
    if (o.robe.hem) b.add("skirt", at(torus(0.49 * fl, 0.035, o.robe.hem), 0, -0.86, 0));
  } else {
    const boots = o.boots ?? dk(bottom, 0.6);
    for (const [th, sh] of [["thighL", "shinL"], ["thighR", "shinR"]] as const) {
      b.add(th, at(cap(0.1 * k, 0.22, bottom), 0, -0.2, 0));
      b.add(sh, at(cap(0.085 * k, 0.2, boots), 0, -0.19, 0), at(sph(0.1, boots, 0.95 * k, 0.72, 1.7), 0, -0.4, 0.06));
    }
  }
}

// ---------------------------------------------------------------- acessórios
const STEEL = 0xc2cad3, IRON = 0x8a929c, BONE = 0xe8dcc0, GOLD = 0xe8b93a, WOOD = 0x7a5230, LEATHER = 0x6b4a2e, BLACK = 0x22222a;

const hairCap = (c: number) => [at(sph(0.23, c, 1, 0.8, 1), 0, 0.26, -0.02)];
const hairLong = (c: number, len = 0.5) => [...hairCap(c), at(sph(0.2, c, 1, len / 0.2, 0.55), 0, 0.2 - len * 0.5, -0.13)];
const beard = (c: number, len = 0.3) => [at(cone(0.15, len, c, 8), 0, 0.08 - len / 2, 0.14, Math.PI + 0.25)];
const hood = (c: number) => [at(sph(0.26, c, 1, 1.02, 1.04), 0, 0.22, -0.03), at(cone(0.16, 0.26, c, 8), 0, 0.42, -0.14, -0.9)];
function cowboyHat(c: number, band: number): G[] {
  return [at(cyl(0.36, 0.38, 0.03, c, 16), 0, 0.37, 0), at(cyl(0.2, 0.17, 0.2, c, 12), 0, 0.48, 0), at(cyl(0.205, 0.205, 0.045, band, 12), 0, 0.41, 0)];
}
function wizardHat(c: number, band: number, tipDx = 0.14): G[] {
  return [
    at(lathe([[0.46, 0], [0.44, 0.03], [0.22, 0.06], [0.16, 0.3], [0.07, 0.55], [0.02, 0.72]], c), 0, 0.33, 0, -0.12),
    at(sph(0.05, c), tipDx, 1.03, -0.16),
    at(cyl(0.225, 0.2, 0.06, band, 12), 0, 0.41, -0.01),
  ];
}
function hornHelm(metal: number, horn: number): G[] {
  const out = [at(sph(0.235, metal, 1, 0.82, 1.02), 0, 0.27, -0.01), at(bx(0.05, 0.16, 0.05, metal), 0, 0.2, 0.22)];
  for (const s of [-1, 1]) out.push(at(cone(0.06, 0.3, horn, 7), s * 0.27, 0.42, 0, 0, 0, -s * 0.7));
  return out;
}
function cape(c: number, w = 0.3, len = 0.95): G[] {
  // meia casca cilíndrica pendurada nos ombros
  const g = prep(new THREE.CylinderGeometry(w, w * 1.35, len, 10, 3, true, Math.PI * 0.5, Math.PI), true);
  paint(g, dk(c, 0.55), c, -len / 2, len / 2);
  return [at(g, 0, -len / 2, 0.02)];
}
const pauldron = (c: number, r = 0.15) => [at(sph(r, c, 1, 0.8, 1.05), 0, 0.04, 0)];
const belt = (c: number, k = 1, buckle = GOLD) => [at(cyl(0.215 * k, 0.215 * k, 0.07, c, 12), 0, 0.06, 0), at(bx(0.08, 0.08, 0.04, buckle), 0, 0.06, 0.2 * k)];

// armas: presas ao antebraço; o cabo sai da mão (y = -0.31). `along` = aponta na direção do braço.
function staff(wood: number, len = 1.9): G[] {
  return [at(cyl(0.028, 0.034, len, wood, 6), 0, -0.31, 0.25, Math.PI / 2)];
}
function sword(len = 0.95, blade = STEEL, hilt = GOLD): G[] {
  return [
    at(bx(0.035, len, 0.1, blade, lt(blade)), 0, -0.4 - len / 2, 0),
    at(cone(0.05, 0.14, blade, 4), 0, -0.4 - len - 0.06, 0, Math.PI),
    at(bx(0.07, 0.05, 0.32, hilt), 0, -0.4, 0),
    at(cyl(0.03, 0.03, 0.16, LEATHER, 6), 0, -0.32, 0),
  ];
}
function revolver(): G[] {
  return [at(cyl(0.03, 0.026, 0.4, 0x9aa3ad, 8), 0, -0.56, 0.03), at(bx(0.07, 0.14, 0.09, 0x6b727c), 0, -0.4, 0.02), at(bx(0.05, 0.1, 0.14, LEATHER), 0, -0.33, -0.05)];
}
function mace(): G[] {
  const head = [at(sph(0.17, IRON), 0, -1.25, 0)];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    head.push(at(cone(0.045, 0.14, STEEL, 5), Math.cos(a) * 0.19, -1.25, Math.sin(a) * 0.19, 0, 0, 0).applyMatrix4(new THREE.Matrix4()));
  }
  return [at(cyl(0.035, 0.04, 0.95, WOOD, 7), 0, -0.72, 0), at(cyl(0.05, 0.05, 0.1, GOLD, 7), 0, -1.12, 0), ...head];
}
const dagger = (c = STEEL) => [at(bx(0.025, 0.42, 0.07, c, lt(c)), 0, -0.6, 0), at(bx(0.05, 0.035, 0.16, BLACK), 0, -0.39, 0)];
function axe(len = 1.0, double = false): G[] {
  const out = [at(cyl(0.032, 0.036, len, WOOD, 7), 0, -0.3 - len / 2, 0)];
  for (const s of double ? [-1, 1] : [1]) {
    const blade = prep(new THREE.CylinderGeometry(0.3, 0.3, 0.045, 10, 1, false, -0.9, 1.8), false);
    paint(blade, IRON, STEEL, -0.3, 0.3);
    out.push(at(blade, 0, -0.18 - len, s * 0.06, 0, s > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI / 2));
  }
  return out;
}
function club(): G[] {
  return [at(cyl(0.035, 0.11, 0.85, WOOD, 7), 0, -0.72, 0), at(sph(0.115, WOOD), 0, -1.14, 0)];
}
function bow(): G[] {
  const arc = prep(new THREE.TorusGeometry(0.5, 0.025, 5, 14, Math.PI * 0.9), true);
  paint(arc, dk(WOOD), WOOD, -0.5, 0.5);
  return [at(arc, 0, -0.31, 0.02, 0, Math.PI / 2, Math.PI * 0.55), at(cyl(0.006, 0.006, 0.95, 0xe8e0d0, 4), 0, -0.31, -0.06, Math.PI / 2)];
}
function shield(face: number, rim: number): G[] {
  const s = prep(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 5), false);
  paint(s, dk(face), face, -0.4, 0.4);
  return [at(s, -0.11, -0.2, 0.02, 0, 0, Math.PI / 2, 1, 1, 1.25), at(sph(0.1, rim, 0.5, 1, 1), -0.16, -0.2, 0.02)];
}

// ---------------------------------------------------------------- elenco
const SKIN = 0xe8bd98;
type Spec = (b: Builder) => void;

const CAST: Record<string, Spec> = {
  // ------------------------------------------------ heróis
  frostine: (b) => {
    body(b, { skin: 0xdcefff, top: 0x6fa3e0, sleeve: 0x8fbdf0, robe: { color: 0x5b8fd6, hem: 0xeaf6ff, flare: 1.15 } });
    b.glowColor = 0x9be4ff;
    b.style = "cast"; b.poseR = [-0.5, -1.0];
    b.add("head", ...hairLong(0xeaf6ff, 0.55));
    for (let i = 0; i < 5; i++) b.lit("head", at(cone(0.035, i === 2 ? 0.26 : 0.17, 0xbfeaff, 4), (i - 2) * 0.09, 0.47 - Math.abs(i - 2) * 0.03, 0.08, 0, 0, -(i - 2) * 0.18));
    b.add("torso", at(torus(0.26, 0.06, 0xeaf6ff), 0, 0.5, 0), at(bx(0.08, 0.5, 0.03, 0xeaf6ff), 0, 0.22, 0.2));
    b.add("foreR", ...staff(0xbfd9f2));
    for (let i = 0; i < 6; i++) b.lit("foreR", at(bx(0.035, 0.34, 0.035, 0xbfeaff), 0, -0.31, 1.22, 0, 0, (i / 6) * Math.PI));
    b.lit("foreR", at(sph(0.07, 0xeaffff), 0, -0.31, 1.22));
  },
  kaelen: (b) => {
    body(b, { skin: SKIN, top: 0x2f3f7a, bottom: 0x26305a, boots: 0x1c2444 });
    b.glowColor = 0xffe066;
    b.style = "swing"; b.poseR = [-0.35, -0.7];
    b.add("head", ...hairCap(0xe8e2d0), at(sph(0.1, 0xe8e2d0, 1.2, 0.6, 1), 0.08, 0.36, 0.12));
    b.add("cape", ...cape(0x3a56a8, 0.3, 1.0));
    b.add("hips", ...belt(GOLD));
    b.add("torso", at(bx(0.07, 0.4, 0.03, GOLD), 0, 0.3, 0.205), at(torus(0.2, 0.04, 0x3a56a8), 0, 0.52, 0));
    b.add("foreR", ...sword(0.9, 0xd9e6ff));
  },
  aurelius: (b) => {
    body(b, { skin: 0xe8c8a8, top: 0x6a3fb0, sleeve: 0x7a4fc0, robe: { color: 0x5a2f9a, hem: GOLD } });
    b.glowColor = 0xd08cff;
    b.style = "cast"; b.poseR = [-0.9, -0.9]; b.poseL = [-0.2, -0.6];
    b.add("head", ...wizardHat(0x6a3fb0, GOLD), ...beard(0xf2f2f2, 0.5), at(sph(0.2, 0xf2f2f2, 1, 0.7, 0.6), 0, 0.14, -0.1));
    b.add("torso", at(bx(0.09, 0.5, 0.03, GOLD), 0, 0.22, 0.2));
    b.lit("foreR", at(sph(0.13, 0xe0b0ff), 0, -0.5, 0.05));
    b.add("foreR", at(torus(0.17, 0.018, GOLD), 0, -0.5, 0.05, 0.6));
  },
  ignis: (b) => {
    body(b, { skin: 0xe0a070, top: 0x2b2b30, bottom: 0x2b2b30, boots: 0x3a2a22, sleeve: 0xe0a070 });
    b.glowColor = 0xff7a1a;
    b.style = "thrust"; b.poseR = [-0.7, -1.2]; b.poseL = [-0.5, -1.3];
    b.add("head", ...hairCap(0xe8331a));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      b.add("head", at(cone(0.075, 0.34, i % 2 ? 0xff5a2a : 0xe8331a, 5), Math.cos(a) * 0.1, 0.5, Math.sin(a) * 0.1 - 0.02, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5));
    }
    b.add("hips", ...belt(0xc8281e, 1, 0xc8281e), at(bx(0.07, 0.36, 0.03, 0xc8281e), 0.12, -0.18, 0.18));
    for (const f of ["foreL", "foreR"]) {
      b.add(f, at(cyl(0.075, 0.075, 0.1, 0xc8281e, 8), 0, -0.2, 0));
      b.lit(f, at(sph(0.1, 0xffa040), 0, -0.34, 0), at(cone(0.07, 0.22, 0xffd34d, 6), 0, -0.34, 0.1, 1.2));
    }
  },
  zephyr: (b) => {
    body(b, { skin: 0xe0b088, top: 0x8a6a4a, bottom: 0x3a3f5a, boots: 0x6b3f2a, sleeve: 0xd9b48a });
    b.style = "dual"; b.poseR = [-1.35, -0.15]; b.poseL = [-0.35, -0.9];
    b.add("head", ...cowboyHat(0x9a9488, 0x5a4a3a), at(sph(0.2, 0x2f8f8a, 1.04, 0.6, 1.02), 0, 0.1, 0.03), at(sph(0.19, 0xb8b0a0, 1, 0.5, 0.6), 0, 0.3, -0.12));
    // poncho
    b.add("torso", lathe([[0.4, 0.12], [0.38, 0.19], [0.28, 0.4], [0.16, 0.54], [0.12, 0.57]], 0x2f8f8a, 0x1f6f6a));
    b.add("torso", at(torus(0.39, 0.028, 0x7fd9cc), 0, 0.16, 0));
    b.add("cape", ...cape(0x256f6c, 0.3, 0.7));
    b.add("hips", ...belt(LEATHER));
    b.add("foreR", ...revolver());
    b.add("foreL", ...revolver());
  },
  varok: (b) => {
    body(b, { skin: 0xe0b090, top: 0xa3acb6, bottom: 0x8a929c, boots: 0x6f7780, bulk: 1.28, hands: 0x8a929c });
    b.style = "swing"; b.poseR = [-0.5, -0.9];
    b.add("head", ...hornHelm(STEEL, BONE), ...beard(0x7a5230, 0.2));
    b.add("armL", ...pauldron(STEEL, 0.19)).add("armR", ...pauldron(STEEL, 0.19));
    b.add("cape", ...cape(0xb8262e, 0.38, 1.1));
    b.add("hips", ...belt(LEATHER, 1.28));
    b.add("torso", at(sph(0.2, STEEL, 1.3, 1.0, 0.75), 0, 0.34, 0.07));
    b.add("foreR", ...mace());
  },
  umbra: (b) => {
    body(b, { skin: 0x2a2a34, top: BLACK, bottom: BLACK, boots: 0x15151a, eyes: 0xe07aff, eyeGlow: true });
    b.glowColor = 0xc83cd9;
    b.style = "thrust"; b.poseR = [-0.6, -1.1]; b.poseL = [-0.3, -1.2];
    b.add("head", ...hood(BLACK));
    b.add("torso", at(torus(0.19, 0.06, 0xc83cd9), 0, 0.52, 0));
    b.add("cape", at(bx(0.12, 0.75, 0.03, 0xc83cd9, 0x8a2aa0), -0.1, -0.36, 0.04), at(bx(0.1, 0.55, 0.03, 0xa02ab8, 0x6a1a80), 0.1, -0.28, 0.06));
    b.add("hips", ...belt(0x3a3a44, 1, 0xc83cd9));
    b.add("foreR", ...dagger()).add("foreL", ...dagger());
  },
  seraph: (b) => {
    body(b, { skin: 0xe8ecf2, top: 0xe8ecf2, bottom: 0xc8ced8, boots: 0xd9dee6, bulk: 1.12, hands: 0xe8ecf2, eyes: null });
    b.glowColor = GOLD;
    b.style = "throw"; b.poseR = [-0.4, -0.8]; b.poseL = [-0.5, -1.0];
    b.add("head", at(sph(0.235, 0xe8ecf2, 1, 0.9, 1.02), 0, 0.24, 0), at(bx(0.3, 0.035, 0.04, 0x2a3040), 0, 0.22, 0.215), at(bx(0.035, 0.16, 0.04, 0x2a3040), 0, 0.16, 0.215));
    b.add("head", at(bx(0.04, 0.26, 0.4, GOLD), 0, 0.48, -0.04));
    for (const s of [-1, 1]) b.add("head", at(bx(0.03, 0.2, 0.16, GOLD), s * 0.24, 0.38, -0.04, 0, 0, -s * 0.4));
    b.add("armL", ...pauldron(0xe8ecf2, 0.16)).add("armR", ...pauldron(0xe8ecf2, 0.16));
    b.add("cape", ...cape(0x4a8fd6, 0.33, 1.05));
    b.add("hips", ...belt(GOLD, 1.12));
    b.add("torso", at(bx(0.16, 0.24, 0.03, GOLD), 0, 0.34, 0.215));
    b.add("foreR", ...sword(0.85));
    b.add("foreL", ...shield(0xf2f4f8, GOLD));
  },
  vesper: (b) => {
    body(b, { skin: 0x4a342e, top: 0xd9841f, sleeve: 0xd9841f, robe: { color: 0xd9841f, hem: 0x2a1a12 } });
    b.glowColor = 0x8cf273;
    b.style = "cast"; b.poseR = [-0.5, -1.0];
    b.add("head", ...wizardHat(0xd9841f, 0x2a1a12, -0.12), ...hairLong(0x2a1a12, 0.3));
    for (const y of [-0.62, -0.38, -0.14]) b.add("skirt", at(torus(0.44 + (y + 0.14) * -0.02 + (y < -0.5 ? 0 : -0.09 + (y + 0.38) * -0.35), 0.03, 0x2a1a12), 0, y, 0));
    b.add("torso", at(torus(0.24, 0.035, 0x2a1a12), 0, 0.2, 0));
    b.add("foreR", ...staff(WOOD, 1.8), at(sph(0.13, BONE, 1, 1.1, 1.05), 0, -0.31, 1.2), at(bx(0.12, 0.08, 0.1, BONE), 0, -0.36, 1.12));
    b.lit("foreR", at(sph(0.035, 0x8cf273), -0.05, -0.3, 1.31), at(sph(0.035, 0x8cf273), 0.05, -0.3, 1.31));
  },
  // ------------------------------------------------ inimigos
  goblin: (b) => {
    body(b, { skin: 0x6fae4a, top: 0x7a5230, bottom: 0x5a3c22, boots: 0x6fae4a, sleeve: 0x6fae4a, head: 1.25, eyes: 0xffe14a });
    b.scale = 0.66; b.poseR = [-0.6, -0.8];
    for (const s of [-1, 1]) b.add("head", at(cone(0.09, 0.36, 0x6fae4a, 5), s * 0.34, 0.27, -0.02, 0, 0, -s * 1.35));
    b.add("head", at(cone(0.05, 0.16, 0x5a9a3c, 6), 0, 0.18, 0.29, Math.PI / 2));
    b.add("foreR", ...club());
  },
  orc: (b) => {
    body(b, { skin: 0x4d8a3a, top: 0x5b4636, bottom: 0x3f3026, boots: 0x2e241c, sleeve: 0x4d8a3a, bulk: 1.45, eyes: 0xffd34d });
    b.scale = 1.08; b.poseR = [-0.5, -0.7];
    for (const s of [-1, 1]) b.add("head", at(cone(0.035, 0.13, 0xf0ead0, 5), s * 0.09, 0.12, 0.2));
    b.add("head", at(sph(0.2, 0x3f7a30, 1.1, 0.5, 1), 0, 0.09, 0.03));
    b.add("armL", ...pauldron(IRON, 0.2)).add("hips", ...belt(LEATHER, 1.45, IRON));
    b.add("torso", at(bx(0.12, 0.7, 0.04, LEATHER), 0.1, 0.3, 0.2, 0, 0, 0.6));
    b.add("foreR", ...axe(1.05, true));
  },
  swarm: (b) => {
    b.form = "bat"; b.scale = 0.75; b.style = "bite";
    b.add("hips", sph(0.22, 0x6a3fb0, 1, 0.95, 1.1), at(sph(0.2, 0x7a4fc0), 0, 0.02, 0.2));
    for (const s of [-1, 1]) {
      b.add("hips", at(cone(0.07, 0.22, 0x6a3fb0, 5), s * 0.12, 0.22, 0.2, 0, 0, -s * 0.3));
      b.lit("hips", at(sph(0.04, 0xffd34d), s * 0.08, 0.06, 0.38));
      b.add("hips", at(cone(0.02, 0.07, 0xffffff, 4), s * 0.05, -0.06, 0.38, Math.PI));
      const w = prep(new THREE.CircleGeometry(0.55, 5, 0, Math.PI * 0.75), false);
      paint(w, 0x3a1f66, 0x5a3f9a, -0.5, 0.5);
      b.add(s < 0 ? "wingL" : "wingR", at(w, 0, 0, 0, -Math.PI / 2, 0, s < 0 ? Math.PI * 0.62 : -Math.PI * 0.38 + Math.PI * 0.75 - Math.PI * 0.75));
    }
  },
  assassin: (b) => {
    body(b, { skin: 0xf2f2f2, top: 0x8a8f99, bottom: 0x6a6f7a, boots: 0x2a2a30, eyes: 0x1c1c22 });
    b.scale = 0.92; b.style = "thrust"; b.poseR = [-0.6, -1.1]; b.poseL = [-0.3, -1.2];
    b.add("head", ...hairCap(0x2a2a30), at(cyl(0.035, 0.02, 0.5, 0x2a2a30, 6), 0, 0.3, -0.34, 1.9));
    for (const s of [-1, 1]) {
      b.add("head", at(cone(0.06, 0.16, 0xf2f2f2, 4), s * 0.12, 0.44, 0.08));
      b.add("head", at(bx(0.03, 0.09, 0.02, 0xc8281e), s * 0.11, 0.14, 0.2));
    }
    b.add("hips", ...belt(0xc8281e, 1, 0xc8281e)).add("torso", at(torus(0.18, 0.05, 0xc8281e), 0, 0.52, 0));
    b.add("foreR", ...dagger()).add("foreL", ...dagger());
  },
  archer: (b) => {
    body(b, { skin: BONE, top: 0x5a2a30, bottom: 0xd9cdb0, boots: BONE, sleeve: BONE, bulk: 0.8, eyes: 0x1c1c22 });
    b.scale = 0.95; b.style = "shoot"; b.poseL = [-1.35, -0.1]; b.poseR = [-0.6, -1.3];
    b.add("head", ...hood(0x4a2228));
    b.add("cape", ...cape(0x4a2228, 0.26, 0.8));
    b.add("torso", at(bx(0.2, 0.05, 0.03, BONE), 0, 0.36, 0.2), at(bx(0.2, 0.05, 0.03, BONE), 0, 0.27, 0.2), at(bx(0.2, 0.05, 0.03, BONE), 0, 0.18, 0.2));
    b.add("foreL", ...bow());
  },
  spellcaster: (b) => {
    body(b, { skin: 0x4a7ad9, top: 0x1f5a66, sleeve: 0x1f5a66, robe: { color: 0x1a4a55, hem: 0x5a2a6a }, eyes: 0xffe14a, eyeGlow: true });
    b.glowColor = 0xe84ad9; b.scale = 0.95;
    b.style = "cast"; b.poseR = [-0.6, -1.0];
    for (let i = 0; i < 3; i++) b.lit("head", at(cone(0.05, i === 1 ? 0.34 : 0.24, 0xe84ad9, 5), (i - 1) * 0.11, 0.5 - Math.abs(i - 1) * 0.04, 0, 0, 0, -(i - 1) * 0.3));
    b.add("torso", at(lathe([[0.36, 0], [0.3, 0.1], [0.14, 0.14]], 0x5a2a6a), 0, 0.46, 0));
    b.add("foreR", ...staff(0x3a2a4a, 1.6));
    b.lit("foreR", at(cone(0.08, 0.3, 0xe84ad9, 5), 0, -0.31, 1.15, Math.PI / 2));
  },
  bombardier: (b) => {
    body(b, { skin: 0xd9a070, top: 0x7a4a2a, bottom: 0x4a3020, boots: 0x2e1e14, bulk: 1.4 });
    b.scale = 0.8; b.style = "throw"; b.poseR = [-0.9, -0.9];
    b.add("head", at(sph(0.24, 0x5a4a3a, 1, 0.7, 1), 0, 0.3, 0), ...beard(0xc8501e, 0.4), at(sph(0.16, 0xc8501e, 1.3, 0.6, 0.8), 0, 0.1, 0.1));
    b.add("torso", at(cone(0.13, 0.7, 0xd9b27a, 9), -0.26, 0.62, -0.12, -1.2, 0, 0.3));
    b.add("hips", ...belt(LEATHER, 1.4));
    b.add("foreR", at(sph(0.17, 0x1c1c1c), 0, -0.44, 0));
    b.lit("foreR", at(cyl(0.015, 0.015, 0.12, 0xff9a3c, 4), 0.03, -0.28, 0), at(sph(0.035, 0xffe14a), 0.04, -0.21, 0));
  },
  summoner: (b) => {
    body(b, { skin: 0xd9cfe0, top: 0x3a2a55, sleeve: 0x3a2a55, robe: { color: 0x2f2248, hem: 0x7affc8 }, eyes: 0x7affc8, eyeGlow: true });
    b.glowColor = 0x7affc8;
    b.style = "cast"; b.poseL = [-0.9, -1.0]; b.poseR = [-0.4, -0.9];
    b.add("head", ...hairLong(0xe8e8f0, 0.7));
    b.add("torso", at(lathe([[0.34, 0], [0.26, 0.12], [0.13, 0.16]], 0x4a3a6a), 0, 0.44, 0));
    b.add("foreL", at(bx(0.3, 0.05, 0.22, 0x7a5230), 0, -0.36, 0.06));
    b.lit("foreL", at(bx(0.26, 0.02, 0.18, 0xbfffe6), 0, -0.325, 0.06));
  },
  berserker: (b) => {
    body(b, { skin: 0xc89a7a, top: 0xc89a7a, bottom: 0x5a4636, boots: 0x3a2e24, bulk: 1.4 });
    b.scale = 1.02; b.style = "swing"; b.poseR = [-0.5, -0.9]; b.poseL = [-0.5, -0.9];
    b.add("head", ...hornHelm(IRON, BONE), ...beard(0xd9641e, 0.42));
    b.add("torso", at(bx(0.5, 0.06, 0.03, 0x4a8fd6), 0, 0.42, 0.2), at(bx(0.06, 0.3, 0.03, 0x4a8fd6), 0.12, 0.28, 0.21, 0, 0, 0.4));
    b.add("hips", at(lathe([[0.36, -0.3], [0.3, 0], [0.26, 0.08]], 0x8a7a66), 0, 0, 0), ...belt(LEATHER, 1.4, IRON));
    b.add("foreR", ...axe(0.7)).add("foreL", ...axe(0.7));
  },
  splitter: (b) => {
    b.form = "slime"; b.style = "bite"; b.rough = 0.25; b.glowColor = 0xfff2f8;
    const blob = prep(new THREE.SphereGeometry(0.75, 16, 10), true);
    const p = blob.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const flat = y < 0 ? 1 + -y * 0.5 : 1;
      p.setXYZ(i, p.getX(i) * flat * (1 + 0.08 * Math.sin(p.getZ(i) * 9)), Math.max(y, -0.38) * (y > 0 ? 0.95 : 1), p.getZ(i) * flat);
    }
    blob.computeVertexNormals();
    b.add("hips", at(paint(blob, 0xc83a8a, 0xff8ac8, -0.4, 0.75), 0, 0.4, 0));
    for (const s of [-1, 1]) b.add("hips", at(sph(0.1, 0x3a1228, 0.9, 1.2, 0.5), s * 0.22, 0.68, 0.62));
    b.add("hips", at(sph(0.2, 0x3a1228, 1.3, 0.45, 0.5), 0, 0.4, 0.7));
    b.add("hips", at(bx(0.3, 0.06, 0.06, BONE), -0.3, 0.5, 0.3, 0.5, 0.7, 0.4), at(sph(0.07, BONE), 0.36, 0.3, 0.25), at(bx(0.2, 0.05, 0.05, BONE), 0.2, 0.75, -0.2, 0.2, 0.3, 1.0));
  },
  // ------------------------------------------------ chefes
  bloodfang: (b) => {
    body(b, { skin: 0xd9441e, top: 0xc82a2a, bottom: 0x5a3020, boots: 0xc82a2a, sleeve: 0xc82a2a, hands: 0xc82a2a, bulk: 1.6, head: 1.15, eyes: 0xffe14a, eyeGlow: true });
    b.scale = 2.3; b.style = "swing"; b.poseR = [-0.5, -0.8]; b.poseL = [-0.3, -0.9]; b.glowColor = 0xffe14a;
    // cabeça de tigre
    b.add("head", at(sph(0.17, 0xf2ead8, 1.1, 0.8, 1.2), 0, 0.12, 0.17), at(sph(0.05, 0x2a1210), 0, 0.2, 0.39));
    for (const s of [-1, 1]) {
      b.add("head", at(cone(0.08, 0.16, 0xd9441e, 6), s * 0.16, 0.44, -0.02), at(cone(0.03, 0.12, 0xffffff, 5), s * 0.07, 0.03, 0.31, Math.PI));
      b.add("head", at(bx(0.03, 0.12, 0.2, 0x1c1010), s * 0.2, 0.3, 0.02, 0, 0, s * 0.3), at(bx(0.03, 0.1, 0.16, 0x1c1010), s * 0.22, 0.17, 0.0));
    }
    // listras
    for (const y of [0.16, 0.3, 0.44]) for (const s of [-1, 1]) b.add("torso", at(bx(0.2, 0.045, 0.3, 0x1c1010), s * 0.34, y, 0, 0, 0, s * 0.35));
    for (const f of ["armL", "armR", "foreL", "foreR", "thighL", "thighR"]) b.add(f, at(torus(f.startsWith("thigh") ? 0.165 : 0.13, 0.022, 0x1c1010), 0, -0.14, 0), at(torus(f.startsWith("thigh") ? 0.16 : 0.125, 0.022, 0x1c1010), 0, -0.26, 0));
    // caveira no ombro, gola e cinto
    b.add("armL", at(sph(0.21, BONE, 1, 0.95, 1.05), 0, 0.12, 0), at(sph(0.05, 0x1c1010), -0.08, 0.13, 0.19), at(sph(0.05, 0x1c1010), 0.08, 0.13, 0.19), at(bx(0.16, 0.08, 0.1, BONE), 0, 0.0, 0.14));
    b.add("torso", at(torus(0.3, 0.07, 0x4a5a7a), 0, 0.52, 0)).add("hips", ...belt(0x3a2018, 1.6, GOLD), at(lathe([[0.42, -0.34], [0.36, 0], [0.32, 0.06]], 0x5a3020), 0, 0, 0));
    b.add("tail", at(cyl(0.05, 0.03, 0.9, 0xc82a2a, 6), 0, -0.4, -0.1, 0.5), at(sph(0.05, 0x1c1010), 0, -0.82, -0.32));
    // cutelo
    const blade = bx(0.05, 1.25, 0.42, 0xd9e0e8, 0xf2f6fa);
    b.add("foreR", at(blade, 0, -1.1, 0.1), at(cyl(0.045, 0.045, 0.3, LEATHER, 6), 0, -0.36, 0), at(bx(0.1, 0.06, 0.5, IRON), 0, -0.5, 0.06));
  },
  gravekeeper: (b) => {
    body(b, { skin: 0x0c1010, top: 0x5f645f, sleeve: 0x5f645f, hands: 0xb0b6a8, robe: { color: 0x4f544f, flare: 1.1 }, eyes: 0x73ffcc, eyeGlow: true, bulk: 1.15 });
    b.scale = 2.1; b.style = "swing"; b.poseR = [-0.4, -0.9]; b.poseL = [-0.9, -0.7]; b.glowColor = 0x73ffcc;
    b.add("head", at(sph(0.3, 0x4a4f4a, 1, 1.05, 1.1), 0, 0.22, -0.06), at(cone(0.2, 0.36, 0x4a4f4a, 8), 0, 0.5, -0.2, -0.9), at(sph(0.2, 0x0c1010, 1, 1.05, 0.5), 0, 0.2, 0.14));
    b.add("torso", at(lathe([[0.46, -0.08], [0.4, 0.1], [0.2, 0.2]], 0x5f645f), 0, 0.38, 0));
    b.add("hips", ...belt(LEATHER, 1.15, 0xb9a24a));
    for (let i = 0; i < 7; i++) b.add("skirt", at(cone(0.09, 0.3, 0x3f443f, 4), Math.cos(i * 0.9) * 0.48, -0.92, Math.sin(i * 0.9) * 0.48, Math.PI));
    b.add("foreR", at(cyl(0.03, 0.035, 1.6, WOOD, 6), 0, -0.9, 0), at(bx(0.3, 0.4, 0.04, IRON, STEEL), 0, -1.86, 0), at(cone(0.15, 0.16, IRON, 4), 0, -2.12, 0, Math.PI));
    b.add("foreL", at(cyl(0.012, 0.012, 0.3, IRON, 4), 0, -0.45, 0), at(cyl(0.1, 0.1, 0.05, 0x3a3a3a, 8), 0, -0.6, 0), at(cyl(0.11, 0.11, 0.05, 0x3a3a3a, 8), 0, -0.86, 0));
    b.lit("foreL", at(cyl(0.085, 0.085, 0.22, 0xffd36a, 8), 0, -0.73, 0));
  },
  ember_matriarch: (b) => {
    body(b, { skin: 0x2e1c18, top: 0x2a1a16, sleeve: 0x2a1a16, hands: 0xff6a1a, eyes: 0xffc84a, eyeGlow: true, robe: { color: 0x1c1210, flare: 0.5 } });
    b.form = "spider"; b.scale = 2.0; b.style = "cast"; b.poseR = [-1.2, -0.5]; b.poseL = [-0.3, -0.8]; b.glowColor = 0xff6a1a; b.extraLegs = 8;
    b.add("head", ...hairLong(0x15100e, 0.6));
    for (let i = 0; i < 5; i++) b.add("head", at(cone(0.04, 0.3, 0x15100e, 4), (i - 2) * 0.09, 0.5, -0.05, -0.3, 0, -(i - 2) * 0.25));
    for (const y of [0.16, 0.34]) b.lit("torso", at(torus(0.255, 0.014, 0xff6a1a), 0, y, 0));
    b.lit("torso", at(bx(0.03, 0.4, 0.02, 0xff8a2a), 0, 0.28, 0.21));
    // abdômen de lava
    const ab = sph(0.75, 0x1c1210, 1, 0.85, 1.25, 0x0e0908);
    b.add("hips", at(ab, 0, -0.1, -0.95));
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4;
      b.lit("hips", at(bx(0.035, 0.035, rngLen(i), 0xff6a1a), Math.cos(a) * 0.5, -0.1 + Math.sin(i * 1.7) * 0.5, -0.95 + Math.sin(a) * 0.6, i * 0.9, i * 1.3, 0));
    }
    b.lit("hips", at(sph(0.16, 0xff8a2a, 1, 0.4, 1.6), 0, 0.5, -0.95));
  },
  hollow_king: (b) => {
    body(b, { skin: BONE, top: 0x3a2a6a, sleeve: 0x4a3a80, hands: BONE, robe: { color: 0x33255f, hem: GOLD, flare: 1.1 }, eyes: 0x4ad9d0, eyeGlow: true, bulk: 1.15 });
    b.scale = 2.2; b.style = "cast"; b.poseR = [-0.7, -0.9]; b.poseL = [-0.8, -1.1]; b.glowColor = 0x4ad9d0;
    b.add("head", at(sph(0.13, BONE, 1.1, 0.7, 1), 0, 0.06, 0.08), at(bx(0.16, 0.04, 0.03, 0x2a2420), 0, 0.07, 0.19));
    b.add("head", at(cyl(0.2, 0.22, 0.12, GOLD, 10), 0, 0.42, 0));
    for (let i = 0; i < 7; i++) b.add("head", at(cone(0.04, 0.18, GOLD, 4), Math.cos((i / 7) * 6.283) * 0.2, 0.56, Math.sin((i / 7) * 6.283) * 0.2));
    b.lit("head", at(sph(0.04, 0x4ad9d0), 0, 0.43, 0.21));
    b.add("torso", at(torus(0.32, 0.1, 0xc8b8ee), 0, 0.5, 0), at(bx(0.1, 0.55, 0.03, GOLD), 0, 0.2, 0.2), at(bx(0.22, 0.04, 0.03, BONE), 0, 0.36, 0.215), at(bx(0.22, 0.04, 0.03, BONE), 0, 0.28, 0.215));
    b.add("cape", ...cape(0x241a45, 0.4, 1.3));
    b.add("foreR", ...staff(GOLD, 2.3));
    const cres = prep(new THREE.TorusGeometry(0.22, 0.035, 5, 12, Math.PI * 1.3), true);
    paint(cres, dk(GOLD), GOLD, -0.3, 0.3);
    b.add("foreR", at(cres, 0, -0.31, 1.55, Math.PI / 2, 0, Math.PI * 0.85 + Math.PI));
    b.lit("foreR", at(sph(0.11, 0x7af2ea), 0, -0.31, 1.58));
  },
};

function rngLen(i: number): number {
  return 0.4 + ((i * 37) % 10) * 0.07;
}

export function hasChar(id: string): boolean {
  return id in CAST;
}

// ---------------------------------------------------------------- montagem
export function buildChar(id: string, scaleMult: number, champion: boolean): Rig {
  const b = new Builder();
  CAST[id](b);
  if (champion) {
    // coroa dourada flutuando sobre a cabeça
    const target = b.form === "bat" || b.form === "slime" ? "hips" : "head";
    const y = b.form === "slime" ? 1.35 : b.form === "bat" ? 0.5 : 0.8;
    b.lit(target, at(torus(0.17, 0.03, 0xffc83d), 0, y, 0));
    for (let i = 0; i < 5; i++) b.lit(target, at(cone(0.035, 0.12, 0xffc83d, 4), Math.cos(i * 1.257) * 0.17, y + 0.08, Math.sin(i * 1.257) * 0.17));
  }
  const root = new THREE.Group();
  const inner = new THREE.Group();
  root.add(inner);
  const main = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: b.rough, metalness: 0.05 });
  const glow = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, emissive: b.glowColor, emissiveIntensity: 1.5 });
  const k = b.bulk;
  const bones: Partial<Record<Bone, THREE.Group>> = {};
  const mk = (name: Bone, parent: THREE.Object3D, x: number, y: number, z: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    bones[name] = g;
    return g;
  };
  const hips = mk("hips", inner, 0, b.form === "bat" ? 1.1 : b.form === "slime" ? 0 : HIP_Y, 0);
  if (b.form !== "bat" && b.form !== "slime") {
    const torso = mk("torso", hips, 0, TORSO_Y, 0);
    mk("head", torso, 0, HEAD_Y, 0);
    const sx = 0.27 * k + 0.07;
    mk("foreL", mk("armL", torso, -sx, SHOULDER_Y, 0), 0, -0.34, 0);
    mk("foreR", mk("armR", torso, sx, SHOULDER_Y, 0), 0, -0.34, 0);
    mk("cape", torso, 0, 0.52, -0.2 * k);
    mk("tail", hips, 0, 0, -0.16 * k);
    if (b.form === "biped") {
      mk("shinL", mk("thighL", hips, -0.13 * k, -0.02, 0), 0, -0.42, 0);
      mk("shinR", mk("thighR", hips, 0.13 * k, -0.02, 0), 0, -0.42, 0);
    } else mk("skirt", hips, 0, 0, 0);
  } else if (b.form === "bat") {
    mk("wingL", hips, -0.16, 0.05, 0);
    mk("wingR", hips, 0.16, 0.05, 0);
  }
  const legs: THREE.Group[] = [];
  if (b.extraLegs) {
    // patas de aranha: 4 de cada lado, saindo do abdômen
    for (let i = 0; i < b.extraLegs; i++) {
      const side = i % 2 ? 1 : -1;
      const row = Math.floor(i / 2);
      const g = new THREE.Group();
      g.position.set(side * 0.35, -0.1, -0.45 - row * 0.32);
      g.rotation.y = side * (0.5 - row * 0.32);
      const upper = at(cyl(0.075, 0.05, 1.0, 0x15100e, 6), side * 0.42, 0.26, 0, 0, 0, -side * 1.05);
      const lower = at(cyl(0.05, 0.016, 1.25, 0x15100e, 6), side * 1.06, -0.1, 0, 0, 0, side * 0.42);
      const joint = at(sph(0.06, 0xff6a1a), side * 0.86, 0.5, 0);
      const mesh = new THREE.Mesh(merge([upper, lower]), main);
      mesh.castShadow = true;
      g.add(mesh, new THREE.Mesh(joint, glow));
      hips.add(g);
      legs.push(g);
    }
  }
  for (const [map, material] of [[b.solid, main], [b.glow, glow]] as const) {
    for (const [name, list] of map) {
      const parent = bones[name as Bone];
      if (!parent) {
        for (const g of list) g.dispose();
        continue;
      }
      const mesh = new THREE.Mesh(merge(list), material);
      mesh.castShadow = material === main;
      parent.add(mesh);
    }
  }
  const scale = b.scale * scaleMult;
  root.scale.setScalar(scale);
  const height = (b.form === "bat" ? 1.5 : b.form === "slime" ? 1.2 : 2.1) * scale;
  return {
    root, inner, body: inner, head: inner, armL: null, armR: null, legL: null, legR: null, wings: [],
    mats: [main, glow], baseEmissive: [main.emissive.clone(), glow.emissive.clone()], kind: "humanoid", height, phase: Math.random() * 10,
    char: { bones, legs, style: b.style, poseR: b.poseR, poseL: b.poseL, form: b.form, shot: 0 },
  };
}

// ---------------------------------------------------------------- animação
const ease = (t: number) => t * t * (3 - 2 * t);

export function animateChar(rig: Rig, a: AnimState): void {
  const c = rig.char!;
  const B = c.bones;
  const t = a.t + rig.phase;
  const inner = rig.inner;
  inner.rotation.set(0, 0, 0);
  inner.position.set(0, 0, 0);
  inner.scale.setScalar(1);

  if (c.form === "bat") {
    const flap = Math.sin(t * 26) * 0.9;
    B.wingL!.rotation.z = flap;
    B.wingR!.rotation.z = -flap;
    B.hips!.position.y = 1.1 + Math.sin(t * 5) * 0.14 + (a.attack >= 0 ? -Math.sin(a.attack * Math.PI) * 0.4 : 0);
    B.hips!.rotation.x = 0.25 * a.move + (a.attack >= 0 ? Math.sin(a.attack * Math.PI) * 0.6 : 0) - a.windup * 0.4;
    if (a.dead > 0) {
      const k = Math.min(1, a.dead);
      B.hips!.position.y = 1.1 * (1 - k * k) + 0.15;
      B.hips!.rotation.z = k * 2.4;
      inner.scale.setScalar(1 - k * 0.3);
    } else B.hips!.rotation.z = 0;
    return;
  }
  if (c.form === "slime") {
    const s = Math.sin(t * (3.5 + 5 * a.move));
    let sy = 1 - s * 0.09;
    if (a.windup > 0) sy = 1 - a.windup * 0.3;
    else if (a.attack >= 0) sy = 1 + Math.sin(a.attack * Math.PI) * 0.35;
    if (a.dead > 0) sy = Math.max(0.08, 1 - Math.min(1, a.dead) * 0.92);
    const sxz = 1 / Math.sqrt(sy);
    B.hips!.scale.set(sxz, sy, sxz);
    B.hips!.position.z = a.attack >= 0 ? Math.sin(a.attack * Math.PI) * 0.3 : 0;
    return;
  }

  const walk = t * (c.form === "spider" ? 7 : 9.5);
  const sw = Math.sin(walk) * a.move;
  const hips = B.hips!, torso = B.torso!, head = B.head!;
  const armL = B.armL!, armR = B.armR!, foreL = B.foreL!, foreR = B.foreR!;
  const breathe = Math.sin(t * 2.2);

  // base: parado/andando
  const baseY = c.form === "robed" ? HIP_Y + 0.06 + Math.sin(t * 2.4) * 0.05 : c.form === "spider" ? HIP_Y + 0.25 + Math.sin(walk * 2) * 0.03 * a.move : HIP_Y - Math.abs(Math.cos(walk)) * 0.05 * a.move;
  hips.position.y = baseY;
  hips.rotation.set(0, sw * 0.12, 0);
  torso.rotation.set(0.1 * a.move + breathe * 0.012, -sw * 0.2, 0);
  torso.scale.set(1, 1 + breathe * 0.012, 1);
  head.rotation.set(-0.06 * a.move, sw * 0.1, 0);
  armR.rotation.set(c.poseR[0] - sw * 0.45 * (c.poseR[0] > -0.8 ? 1 : 0.15), 0, 0.12);
  armL.rotation.set(c.poseL[0] + sw * 0.45 * (c.poseL[0] > -0.8 ? 1 : 0.15), 0, -0.12);
  foreR.rotation.set(c.poseR[1], 0, 0);
  foreL.rotation.set(c.poseL[1], 0, 0);
  if (c.form === "biped") {
    B.thighL!.rotation.x = sw * 0.75;
    B.thighR!.rotation.x = -sw * 0.75;
    B.shinL!.rotation.x = Math.max(0, -Math.cos(walk)) * 1.0 * a.move + 0.05;
    B.shinR!.rotation.x = Math.max(0, Math.cos(walk)) * 1.0 * a.move + 0.05;
  } else if (B.skirt) {
    B.skirt.rotation.set(-0.1 * a.move + Math.sin(t * 2.4 + 1) * 0.03, 0, Math.sin(t * 1.9) * 0.03);
  }
  if (c.legs.length) {
    c.legs.forEach((g, i) => {
      const ph = walk + (i % 2 ? Math.PI : 0) + Math.floor(i / 2) * 1.6;
      g.rotation.z = Math.max(0, Math.sin(ph)) * 0.22 * (i % 2 ? -1 : 1) * (0.25 + a.move);
      g.rotation.x = Math.cos(ph) * 0.16 * (0.2 + a.move);
    });
  }
  if (B.cape) B.cape.rotation.x = 0.1 + 0.42 * a.move + Math.sin(t * 3.1) * 0.05 * (1 + a.move * 2);
  if (B.tail) B.tail.rotation.set(0.2 + Math.sin(t * 2.6) * 0.12, Math.sin(t * 2.1) * 0.5, 0);

  // golpe (ou a preparação dele)
  const wind = a.windup;
  const p = a.attack >= 0 ? a.attack : -1;
  if (wind > 0 || p >= 0) {
    // k: 0 pose de preparo -> 1 golpe dado -> volta
    const strike = p >= 0 ? (p < 0.35 ? ease(p / 0.35) : 1) : 0;
    const back = p >= 0.35 ? ease((p - 0.35) / 0.65) : 0;
    const prep01 = p >= 0 ? 1 - strike : wind;
    const hit = strike * (1 - back);
    switch (c.style) {
      case "swing":
        armR.rotation.x = c.poseR[0] * back + (-2.7 * prep01 + 0.5 * hit);
        armR.rotation.z = 0.12 + 0.5 * prep01 - 0.3 * hit;
        foreR.rotation.x = c.poseR[1] * back - 0.5 * prep01 - 0.1 * hit;
        torso.rotation.y += 0.55 * prep01 - 0.7 * hit;
        torso.rotation.x += -0.15 * prep01 + 0.3 * hit;
        if (c.poseL[0] === c.poseR[0]) {
          armL.rotation.x = armR.rotation.x;
          foreL.rotation.x = foreR.rotation.x;
        }
        break;
      case "thrust": {
        const right = c.shot % 2 === 0;
        const arm = right ? armR : armL, fore = right ? foreR : foreL;
        arm.rotation.x = -0.4 * prep01 - 1.55 * hit + (right ? c.poseR[0] : c.poseL[0]) * back;
        fore.rotation.x = -1.6 * prep01 - 0.1 * hit + (right ? c.poseR[1] : c.poseL[1]) * back;
        torso.rotation.y += (right ? -1 : 1) * (0.5 * hit - 0.3 * prep01);
        torso.rotation.x += 0.22 * hit;
        break;
      }
      case "shoot":
      case "dual": {
        const right = c.style === "shoot" ? c.poseR[0] < -1 : c.shot % 2 === 0;
        const arm = right ? armR : armL, fore = right ? foreR : foreL;
        const kick = p >= 0 ? Math.max(0, 1 - p * 3) : 0;
        arm.rotation.x = -1.45 + kick * -0.45;
        fore.rotation.x = -0.1 - kick * 0.5;
        torso.rotation.x += -0.06 * kick;
        if (c.style === "shoot" && !right) {
          // arco: a outra mão puxa a corda
          armR.rotation.x = -1.2;
          foreR.rotation.x = -1.4 * (prep01 + back * 0.5);
        }
        break;
      }
      case "cast":
        armR.rotation.x = -2.3 * prep01 - 1.5 * hit + c.poseR[0] * back;
        foreR.rotation.x = -0.9 * prep01 - 0.2 * hit + c.poseR[1] * back;
        armL.rotation.x = -1.2 * prep01 - 1.3 * hit + c.poseL[0] * back;
        foreL.rotation.x = -1.0 * prep01 - 0.2 * hit + c.poseL[1] * back;
        torso.rotation.x += -0.18 * prep01 + 0.2 * hit;
        break;
      case "throw":
        armR.rotation.x = -2.9 * prep01 - 1.3 * hit + c.poseR[0] * back;
        foreR.rotation.x = -1.2 * prep01 + c.poseR[1] * back;
        torso.rotation.y += 0.6 * prep01 - 0.6 * hit;
        torso.rotation.x += 0.25 * hit;
        break;
      case "bite":
        break;
    }
  }

  if (a.dead > 0) {
    const k = ease(Math.min(1, a.dead));
    inner.rotation.x = -k * 1.5;
    inner.position.y = k * 0.16;
    inner.position.z = -k * 0.5;
    armL.rotation.z = -0.12 - k * 1.2;
    armR.rotation.z = 0.12 + k * 1.2;
    head.rotation.x = -k * 0.4;
    if (a.dead > 0.8) inner.scale.setScalar(1 - Math.min(1, (a.dead - 0.8) / 0.45) * 0.4);
  }
}

/** alterna o braço do próximo tiro/estocada */
export function nextShot(rig: Rig): void {
  if (rig.char) rig.char.shot++;
}
