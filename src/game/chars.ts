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
  /** postura: inclinação do tronco, joelhos dobrados e braços afastados */
  lean: number;
  crouch: number;
  armOut: number;
  weight: number;
  /** altura do quadril em repouso */
  hipY: number;
  phys: ReturnType<typeof newPhys>;
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
  /** pelagem: mesma luz do corpo, com listras desenhadas no shader */
  pelt = new Map<Bone | string, G[]>();
  stripe = 0x140a0c;
  /** proporções do esqueleto; shoulderX e hipX em 0 = calculados pelo `bulk` */
  dims = { hipY: HIP_Y, headY: HEAD_Y, shoulderY: SHOULDER_Y, shoulderX: 0, arm: 0.34, hipX: 0, thigh: 0.42 };
  style: Style = "swing";
  poseR: [number, number] = [0.1, -0.3];
  poseL: [number, number] = [0.1, -0.3];
  form: CharState["form"] = "biped";
  bulk = 1;
  scale = 1;
  glowColor = 0xffffff;
  rough = 0.72;
  extraLegs = 0;
  lean = 0.05;
  crouch = 0.14;
  armOut = 0.14;

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
  fur(bone: Bone | string, ...g: G[]): this {
    const l = this.pelt.get(bone) ?? [];
    l.push(...g);
    this.pelt.set(bone, l);
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

/** membro afunilado com pontas arredondadas, do pivô (y=0) para baixo */
function limb(r0: number, r1: number, len: number, c: number, bulge = 0): G {
  const mid = Math.max(r0, r1) * (1 + bulge);
  return lathe([[0, -len - r1 * 0.9], [r1 * 0.75, -len - r1 * 0.55], [r1, -len], [mid, -len * 0.42], [r0, -len * 0.08], [r0 * 0.8, r0 * 0.55], [0, r0 * 0.95]], c, dk(c, 0.62), 10);
}

function body(b: Builder, o: BodyOpts): void {
  const k = o.bulk ?? 1;
  b.bulk = k;
  const hs = o.head ?? 1;
  const sleeve = o.sleeve ?? o.top;
  const bottom = o.bottom ?? dk(o.top, 0.6);
  // postura: quanto mais pesado, mais curvado e de braços abertos
  b.lean = 0.05 + Math.max(0, k - 1) * 0.42;
  b.crouch = 0.14 + Math.max(0, k - 1) * 0.35;
  b.armOut = 0.14 + Math.max(0, k - 1) * 0.7;
  // quadril e tronco (peito mais largo que a cintura)
  b.add("hips", at(sph(0.2 * k, bottom, 1, 0.74, 0.84), 0, 0, 0));
  const chest = lathe([[0.15, -0.04], [0.19, 0.06], [0.185, 0.18], [0.235, 0.32], [0.265, 0.43], [0.22, 0.52], [0.1, 0.57], [0, 0.58]], o.top, dk(o.top, 0.6), 12);
  chest.scale(1.06 * k, 1, 0.78 * k);
  b.add("torso", chest);
  b.add("torso", at(cyl(0.07, 0.078, 0.1, o.skin), 0, 0.58, 0));
  // cabeça: crânio, queixo, nariz e orelhas
  b.add("head", at(sph(0.215 * hs, o.skin, 1, 1.04, 1), 0, 0.2 * hs, 0), at(sph(0.15 * hs, o.skin, 1, 0.8, 0.95), 0, 0.09 * hs, 0.05 * hs));
  b.add("head", at(sph(0.035 * hs, dk(o.skin, 0.9)), 0, 0.16 * hs, 0.215 * hs));
  for (const s of [-1, 1]) b.add("head", at(sph(0.05 * hs, dk(o.skin, 0.9), 0.5, 1, 0.8), s * 0.21 * hs, 0.19 * hs, 0));
  if (o.eyes !== null) {
    const ec = o.eyes ?? 0x1c1c22;
    for (const s of [-1, 1]) {
      const e = at(sph(0.036 * hs, ec, 1, 1.25, 0.6, ec), s * 0.082 * hs, 0.225 * hs, 0.192 * hs);
      if (o.eyeGlow) b.lit("head", e);
      else b.add("head", e, at(bx(0.085 * hs, 0.02 * hs, 0.03, dk(o.skin, 0.55)), s * 0.085 * hs, 0.275 * hs, 0.19 * hs, 0, 0, -s * 0.15));
    }
  }
  // braços: ombro, braço e antebraço afunilados, mão grande
  for (const [arm, fore] of [["armL", "foreL"], ["armR", "foreR"]] as const) {
    b.add(arm, at(sph(0.105 * k, sleeve), 0, 0, 0), limb(0.09 * k, 0.07 * k, 0.32, sleeve));
    b.add(fore, limb(0.066 * k, 0.078 * k, 0.24, sleeve, 0.08), at(sph(0.09 * Math.sqrt(k), o.hands ?? o.skin, 0.9, 1.15, 1), 0, -0.32, 0.01));
  }
  if (o.robe) {
    b.form = "robed";
    const fl = o.robe.flare ?? 1;
    b.add("skirt", lathe([[0.5 * fl, -0.9], [0.44 * fl, -0.78], [0.3 * fl * k, -0.3], [0.22 * k, 0.05], [0.2 * k, 0.12]], o.robe.color, dk(o.robe.color, 0.55)));
    if (o.robe.hem) b.add("skirt", at(torus(0.49 * fl, 0.035, o.robe.hem), 0, -0.86, 0));
  } else {
    const boots = o.boots ?? dk(bottom, 0.6);
    for (const [th, sh] of [["thighL", "shinL"], ["thighR", "shinR"]] as const) {
      b.add(th, limb(0.125 * k, 0.09 * k, 0.4, bottom, 0.04));
      b.add(sh, limb(0.085 * k, 0.07 * k, 0.36, boots, 0.18), at(sph(0.1, boots, 1.0 * k, 0.7, 1.85), 0, -0.4, 0.075));
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
    b.scale = 0.66; b.poseR = [-0.6, -0.8]; b.lean = 0.32; b.crouch = 0.5; b.armOut = 0.3;
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
  // Redesenho a partir do sprite do Dungeon Reign (docs/ref/bloodfang.png); conferir em preview.html.
  // Anatomia do sprite: tronco e cabeça esculpidos como malha única, membros com perfil de músculo, esqueleto próprio.
  bloodfang: (b) => {
    const RED = 0xd8301e, RED_D = 0x7e1412, RED_L = 0xee5a3c, CREAM = 0xf6ecd8, CREAM_D = 0xbfa888, DARK = 0x160b0d, MOUTH = 0x4e0a12;
    const COWL = 0x5a6884, COWL_D = 0x2a3448, HIDE = 0x5e3a22, CLAW = 0xf0e6d0, EYE = 0xffd23a, FANG = 0xfffaf0, BONE_D = 0x9c8862;
    const grp = (list: G[], x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s = 1) => list.map((g) => at(g, x, y, z, rx, ry, rz, s));
    const ss = (a: number, e: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (e - a))); return t * t * (3 - 2 * t); };
    const bell = (x: number, w: number) => Math.exp(-(x * x) / (w * w));
    const col = (hex: number) => new THREE.Color(hex);
    const cRed = col(RED), cRedD = col(RED_D), cRedL = col(RED_L), cCream = col(CREAM), cCreamD = col(CREAM_D), cDark = col(DARK);
    /** esculpe uma esfera: `shape` leva a direção unitária `n` para a posição, `tint` dá a cor do vértice */
    const sculpt = (w: number, h: number, shape: (n: THREE.Vector3, p: THREE.Vector3) => void, tint: (n: THREE.Vector3, c: THREE.Color) => void): G => {
      const g = new THREE.SphereGeometry(1, w, h);
      const pos = g.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      const n = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        n.fromBufferAttribute(pos, i).normalize();
        shape(n, p);
        tint(n, c);
        pos.setXYZ(i, p.x, p.y, p.z);
        colors.set([c.r, c.g, c.b], i * 3);
      }
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      return prep(g, true);
    };
    b.bulk = 1.6; b.scale = 2.3; b.style = "swing"; b.glowColor = EYE; b.rough = 0.7;
    b.lean = 0.3; b.crouch = 0.34; b.armOut = 0.3;
    b.poseR = [-0.2, -0.95]; b.poseL = [-0.65, -0.7];
    // pernas curtas, tronco longo, ombros largos e braços que chegam ao joelho
    b.dims = { hipY: 0.8, headY: 0.7, shoulderY: 0.56, shoulderX: 0.56, arm: 0.42, hipX: 0.2, thigh: 0.36 };

    // ---- tronco: cintura fina, peito largo com peitorais, trapézio alto
    const torso = sculpt(30, 22, (n, p) => {
      const t = (n.y + 1) / 2;
      const rho = Math.hypot(n.x, n.z) || 1e-6;
      const s = n.x / rho, c = n.z / rho;
      const r = Math.pow(rho, 0.45);
      const W = 0.27 + 0.34 * ss(0.15, 0.72, t) - 0.13 * ss(0.84, 1, t);
      const D = 0.2 + 0.13 * ss(0.2, 0.7, t) - 0.06 * ss(0.85, 1, t);
      const front = Math.max(0, c), back = Math.max(0, -c);
      let z = c * D * r;
      z += 0.09 * bell(t - 0.7, 0.11) * front * (1 - 0.75 * bell(s, 0.13)) * r; // peitorais com sulco no meio
      z -= 0.018 * bell(s, 0.07) * front * (1 - ss(0.25, 0.6, t)); // linha do abdômen
      z += 0.012 * front * bell(s, 0.34) * Math.cos(t * 40) * (1 - ss(0.45, 0.58, t));
      z -= 0.11 * back * bell(t - 0.8, 0.2) * r; // trapézio
      p.set(s * W * r, -0.08 + t * 0.8, z);
    }, (n, c) => {
      const t = (n.y + 1) / 2;
      c.copy(cRedD).lerp(cRed, 0.25 + t * 0.75);
      c.lerp(cRedL, Math.max(0, n.z) * 0.45 * bell(t - 0.68, 0.22));
    });
    b.fur("torso", torso);
    // manto azul-cinza sobre os dois ombros, com colar de ossos
    const cowl = lathe([[0.5, -0.07], [0.52, 0.0], [0.44, 0.08], [0.3, 0.14], [0.2, 0.16], [0.16, 0.15]], COWL, COWL_D, 18);
    cowl.scale(1.12, 1, 0.74);
    b.add("torso", at(cowl, 0, 0.6, -0.03, 0.1));
    for (let i = -3; i <= 3; i++) {
      const a = i * 0.42;
      b.add("torso", at(sph(0.04, BONE, 0.75, 1.9, 0.75, BONE_D), Math.sin(a) * 0.54, 0.52 - Math.abs(i) * 0.006, Math.cos(a) * 0.4, 0.35, 0, Math.sin(a) * 0.5));
    }
    // ---- caveira no ombro do braço da arma, do tamanho da cabeça
    const skull: G[] = [
      sph(0.27, BONE, 1, 0.95, 1.1, BONE_D),
      at(sph(0.17, BONE, 1.05, 0.7, 0.9, BONE_D), 0, -0.2, 0.14),
      at(sph(0.085, DARK, 1, 1.2, 0.5), -0.105, -0.02, 0.26), at(sph(0.085, DARK, 1, 1.2, 0.5), 0.105, -0.02, 0.26),
      at(cone(0.035, 0.09, DARK, 3), 0, -0.13, 0.28),
    ];
    for (let i = -2; i <= 2; i++) skull.push(at(bx(0.04, 0.07, 0.04, CREAM, CREAM_D), i * 0.05, -0.3, 0.24));
    b.add("torso", ...grp(skull, 0.62, 0.8, 0.0, -0.3, 0.3, -0.3, 0.82));

    // ---- cabeça de tigre: malha única com focinho, arcada e bochechas; listras e manchas pintadas
    const hy = -0.1, hz = 0.24, hs = 1.22;
    const H = (g: G, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => at(g, x * hs, y * hs + hy, z * hs + hz, rx, ry, rz, hs);
    const muzzle = (n: THREE.Vector3) => ss(0.25, 0.85, n.z) * bell(n.y + 0.18, 0.36) * bell(n.x, 0.55);
    const socket = (n: THREE.Vector3) => bell(n.y - 0.16, 0.1) * bell(Math.abs(n.x) - 0.42, 0.16) * ss(0.4, 0.8, n.z);
    const cheek = (n: THREE.Vector3) => ss(0.55, 0.95, Math.abs(n.x)) * (1 - ss(-0.5, 0.35, n.y));
    const head = sculpt(48, 34, (n, p) => {
      const m = muzzle(n);
      let x = n.x * 0.2 * (1 - 0.22 * m), y = n.y * 0.185, z = n.z * 0.2 + 0.2 * m;
      y += (Math.max(y, -0.075) - y) * ss(0.2, 0.5, n.z); // céu da boca reto
      z += 0.04 * bell(n.y - 0.38, 0.13) * ss(0.35, 0.8, n.z); // arcada
      z -= 0.03 * socket(n);
      x += Math.sign(n.x) * 0.075 * cheek(n);
      p.set(x, y + 0.02, z);
    }, (n, c) => {
      const m = muzzle(n), ax = Math.abs(n.x);
      c.copy(cRedD).lerp(cRed, Math.min(1, 0.55 + n.y * 0.5));
      let stripe = false;
      if (n.z > 0) {
        const r = Math.hypot(n.x, n.y - 0.1), a = Math.atan2(n.y - 0.1, n.x);
        stripe = r > 0.52 && m < 0.3 && Math.sin(a * 10 + Math.sin(r * 9) * 0.8) > 0.45;
        if (n.y > 0.4 && n.z > 0.15 && ax < 0.4 && Math.sin(n.x * 30) > 0.3) stripe = true; // testa
      } else stripe = Math.sin(n.y * 15 + Math.sin(n.x * 5) * 0.9) > 0.4;
      if ((m > 0.4 && n.y < 0.02) || cheek(n) > 0.3) { c.copy(cCreamD).lerp(cCream, 0.5 + n.y * 0.6 + n.z * 0.3); stripe = stripe && cheek(n) > 0.3 && Math.sin(n.y * 22) > 0.75; }
      if (bell(n.y - 0.44, 0.07) * bell(ax - 0.4, 0.1) * ss(0.5, 0.8, n.z) > 0.45) { c.copy(cCream); stripe = false; } // mancha sobre o olho
      if (stripe || socket(n) > 0.45) c.copy(cDark);
      if (n.z > 0.93 && n.y > -0.14 && n.y < 0.1 && ax < 0.22) c.copy(cDark); // nariz
    });
    b.add("head", H(head, 0, 0, 0));
    b.add("head", H(sph(0.1, MOUTH, 0.9, 0.7, 1.25), 0, -0.07, 0.17));
    b.add("head", H(sph(0.1, CREAM, 0.95, 0.4, 1.55, CREAM_D), 0, -0.15, 0.15, 0.42)); // mandíbula caída
    b.add("head", H(sph(0.05, 0xd8566a, 1, 0.4, 1.7), 0, -0.13, 0.2, 0.4));
    for (let i = -1; i <= 1; i++) b.add("head", H(cone(0.014, 0.04, FANG, 5, CREAM), i * 0.03, -0.075, 0.345, Math.PI));
    for (const s of [-1, 1]) {
      b.add("head", H(cone(0.024, 0.11, FANG, 6, CREAM), s * 0.068, -0.105, 0.31, Math.PI), H(cone(0.019, 0.075, FANG, 6, CREAM), s * 0.052, -0.14, 0.27, 0.35));
      b.lit("head", H(sph(0.026, EYE, 1.5, 0.8, 0.6, EYE), s * 0.084, 0.05, 0.19, 0, 0, s * 0.3));
      b.add("head", H(sph(0.05, RED, 1, 1.15, 0.4, RED_D), s * 0.15, 0.175, -0.05, -0.3, 0, -s * 0.5), H(sph(0.04, DARK, 1, 1.15, 0.3), s * 0.15, 0.175, -0.07, -0.3, 0, -s * 0.5));
      for (const [dy, len, up] of [[0.0, 0.15, 0.15], [-0.07, 0.17, -0.25]] as const) {
        b.add("head", H(cone(0.045, len, CREAM, 6, CREAM_D), s * 0.26, dy, 0.0, 0, s * 0.55, -s * (Math.PI / 2 - up)));
      }
    }

    // ---- braços: deltoide, bíceps, antebraço grosso com braçadeira, mão com garras
    const upper = (): G => lathe([[0, -0.47], [0.125, -0.42], [0.15, -0.32], [0.185, -0.17], [0.18, -0.05], [0.14, 0.07], [0, 0.14]], RED, RED_D, 14);
    const lower = (): G => lathe([[0, -0.43], [0.1, -0.4], [0.115, -0.33], [0.165, -0.19], [0.175, -0.1], [0.125, 0.03], [0, 0.1]], RED, RED_D, 14);
    for (const [arm, fore, s] of [["armL", "foreL", -1], ["armR", "foreR", 1]] as const) {
      b.fur(arm, at(sph(0.23, RED, 1.05, 0.95, 1.05, RED_D), s * 0.02, 0.02, 0), upper());
      b.fur(fore, lower());
      b.add(fore, at(cyl(0.135, 0.158, 0.13, COWL, 12, COWL_D), 0, -0.29, 0));
      for (let i = 0; i < 6; i++) b.add(fore, at(sph(0.022, CREAM_D), Math.cos(i * 1.047) * 0.15, -0.29, Math.sin(i * 1.047) * 0.15));
      b.add(fore, at(sph(0.11, RED, 1.1, 0.95, 0.95, RED_D), 0, -0.48, 0.01));
      for (let i = 0; i < 4; i++) {
        const fx = (i - 1.5) * 0.058;
        b.add(fore, at(cap(0.032, 0.07, RED, RED_D), fx, -0.57, 0.06, -0.7));
        if (s < 0) b.add(fore, at(cone(0.022, 0.1, CLAW, 6, CREAM_D), fx, -0.64, 0.12, Math.PI - 0.75));
      }
    }

    // ---- quadril: cinto com tachas e fivela, tanga
    b.fur("hips", at(sph(0.3, RED, 1.08, 0.72, 0.86, RED_D), 0, 0, 0));
    b.add("hips", at(cyl(0.335, 0.335, 0.1, HIDE, 16), 0, 0.1, 0, 0, 0, 0, 1, 1, 0.8), at(cyl(0.075, 0.075, 0.04, GOLD, 10), 0, 0.1, 0.275, Math.PI / 2));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.31;
      b.add("hips", at(sph(0.03, CREAM_D), Math.sin(a) * 0.34, 0.1, Math.cos(a) * 0.272));
    }
    for (const s of [-1, 1]) {
      const flap = lathe([[0.02, -0.52], [0.16, -0.3], [0.2, 0], [0.2, 0.04]], HIDE, dk(HIDE, 0.5), 4);
      flap.rotateY(Math.PI / 4);
      flap.scale(1, 1, 0.16);
      b.add("hips", at(flap, 0, 0.03, s * 0.25, -s * 0.12));
    }
    // ---- pernas curtas: coxa grossa, canela com faixa, pata com garras
    for (const [th, sh] of [["thighL", "shinL"], ["thighR", "shinR"]] as const) {
      b.fur(th, lathe([[0, -0.4], [0.12, -0.36], [0.16, -0.26], [0.2, -0.1], [0.17, 0.04], [0, 0.12]], RED, RED_D, 14));
      b.fur(sh, lathe([[0, -0.37], [0.08, -0.34], [0.085, -0.26], [0.13, -0.1], [0.11, 0.02], [0, 0.08]], RED, RED_D, 12));
      b.add(sh, at(cyl(0.088, 0.1, 0.1, COWL, 10, COWL_D), 0, -0.26, 0));
      b.add(sh, at(sph(0.095, RED, 1.05, 0.6, 1.8, RED_D), 0, -0.37, 0.08));
      for (let i = -1; i <= 1; i++) b.add(sh, at(cone(0.026, 0.1, CLAW, 6, CREAM_D), i * 0.055, -0.385, 0.25, Math.PI / 2 + 0.3, 0, 0));
    }

    // ---- cauda anelada em S
    const curve = new THREE.CatmullRomCurve3([[0, 0, 0], [0, -0.2, -0.28], [0, -0.46, -0.46], [0, -0.54, -0.76], [0, -0.36, -1.0], [0, -0.1, -1.05]].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const tube = new THREE.TubeGeometry(curve, 30, 0.055, 8, false);
    const uv = tube.attributes.uv;
    const tc = new Float32Array(uv.count * 3);
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i);
      const c = u > 0.9 || Math.floor(u * 30) % 4 === 3 ? cDark : cRed;
      tc.set([c.r, c.g, c.b], i * 3);
    }
    tube.setAttribute("color", new THREE.BufferAttribute(tc, 3));
    b.add("tail", prep(tube, true), at(sph(0.058, DARK), 0, -0.1, -1.05));

    // ---- facão: dorso reto, barriga curva, ponta virada e fio serrilhado
    const L = 1.25;
    const sh = new THREE.Shape();
    sh.moveTo(-0.07, 0);
    sh.lineTo(-0.09, -L * 0.7);
    sh.quadraticCurveTo(-0.1, -L * 0.9, -0.2, -L);
    sh.quadraticCurveTo(0.12, -L * 0.97, 0.24, -L * 0.78);
    const teeth = 9;
    for (let i = 0; i < teeth; i++) {
      const v1 = -L * 0.78 + ((i + 1) / teeth) * L * 0.72;
      const w = 0.24 - (i / teeth) * 0.1;
      sh.lineTo(w - 0.045, v1 - 0.03);
      sh.lineTo(w - 0.01, v1);
    }
    sh.lineTo(0.12, 0);
    sh.closePath();
    const blade = prep(new THREE.ExtrudeGeometry(sh, { depth: 0.045, bevelEnabled: false, curveSegments: 8 }), false);
    blade.translate(0, 0, -0.022);
    blade.rotateY(-Math.PI / 2);
    paint(blade, 0xb9c3d6, 0xf6f8fc, -L, 0);
    const knife = [blade, at(cyl(0.04, 0.04, 0.3, HIDE, 8), 0, 0.14, 0.02), at(bx(0.09, 0.05, 0.3, IRON), 0, 0, 0.03), at(sph(0.05, IRON), 0, 0.31, 0.02)];
    b.add("foreR", ...grp(knife, 0, -0.62, 0.02, -0.35));
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
/** contorno escuro (casca invertida) e luz de recorte: tiram o aspecto de plástico liso */
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x17121c, side: THREE.BackSide });
OUTLINE.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += normalize(normal) * 0.02;");
};
OUTLINE.customProgramCacheKey = () => "outline";

function rimLight<T extends THREE.MeshStandardMaterial>(mat: T, strength: number): T {
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `float rim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.6);
      outgoingLight += (diffuseColor.rgb * 0.9 + 0.1) * rim * ${strength.toFixed(2)};
      #include <opaque_fragment>`,
    );
  };
  mat.customProgramCacheKey = () => "rim" + strength;
  return mat;
}

/** listras de tigre no espaço local de cada osso: faixas ao redor do membro, grossas nas costas e sumindo na frente */
function furMaterial(stripe: number, rough: number): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: 0.02 });
  const col = new THREE.Color(stripe);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uStripe = { value: col };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vLp;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLp = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vLp;\nuniform vec3 uStripe;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
      float fAng = atan(vLp.x, vLp.z + 1e-4); // sem o desvio, o polo (x = z = 0) dá NaN e o bloom espalha um bloco preto
      float fW = vLp.y * 8.5 + sin(fAng * 2.0 + vLp.y * 6.0) * 0.34 + sin(fAng * 5.0 + vLp.y * 3.0) * 0.12;
      float fD = abs(fract(fW) - 0.5) * 2.0;
      float fBack = smoothstep(-1.12, -0.25, -cos(fAng));
      // membros (raio pequeno) são listrados em toda a volta; só o peito fica limpo
      fBack = max(fBack, 0.8 * (1.0 - smoothstep(0.17, 0.205, length(vLp.xz))));
      float fThick = 0.34 * fBack * (0.75 + 0.25 * sin(fAng * 3.0 + vLp.y * 11.0));
      float fS = (1.0 - smoothstep(fThick - 0.1, fThick, fD)) * step(0.02, fThick);
      diffuseColor.rgb = mix(diffuseColor.rgb, uStripe, fS);`,
      )
      .replace(
        "#include <opaque_fragment>",
        `float rim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.6);
      outgoingLight += (diffuseColor.rgb * 0.9 + 0.1) * rim * 0.55;
      #include <opaque_fragment>`,
      );
  };
  mat.customProgramCacheKey = () => "fur";
  return mat;
}

class Spring {
  x = 0;
  v = 0;
  step(target: number, stiffness: number, damping: number, dt: number): number {
    this.v += ((target - this.x) * stiffness - this.v * damping) * dt;
    this.x += this.v * dt;
    return this.x;
  }
}

function newPhys() {
  return {
    init: false, t: 0, x: 0, z: 0, yaw: 0, vx: 0, vz: 0, pvf: 0, pvs: 0, stride: Math.random() * 6,
    leanF: new Spring(), leanS: new Spring(), secF: new Spring(), secS: new Spring(), twist: new Spring(),
    kickX: new Spring(), kickZ: new Spring(), bounce: new Spring(), armLag: new Spring(),
    fallX: 0, fallZ: 0, wasAttacking: false,
  };
}

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
  const main = rimLight(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: b.rough, metalness: 0.05 }), 0.55);
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
  const hips = mk("hips", inner, 0, b.form === "bat" ? 1.1 : b.form === "slime" ? 0 : b.dims.hipY, 0);
  if (b.form !== "bat" && b.form !== "slime") {
    const torso = mk("torso", hips, 0, TORSO_Y, 0);
    mk("head", torso, 0, b.dims.headY, 0);
    const sx = b.dims.shoulderX || 0.27 * k + 0.07;
    const hx = b.dims.hipX || 0.13 * k;
    mk("foreL", mk("armL", torso, -sx, b.dims.shoulderY, 0), 0, -b.dims.arm, 0);
    mk("foreR", mk("armR", torso, sx, b.dims.shoulderY, 0), 0, -b.dims.arm, 0);
    mk("cape", torso, 0, 0.52, -0.2 * k);
    mk("tail", hips, 0, 0, -0.16 * k);
    if (b.form === "biped") {
      mk("shinL", mk("thighL", hips, -hx, -0.02, 0), 0, -b.dims.thigh, 0);
      mk("shinR", mk("thighR", hips, hx, -0.02, 0), 0, -b.dims.thigh, 0);
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
      const geo = merge([upper, lower]);
      const mesh = new THREE.Mesh(geo, main);
      mesh.castShadow = true;
      g.add(mesh, new THREE.Mesh(geo, OUTLINE), new THREE.Mesh(joint, glow));
      hips.add(g);
      legs.push(g);
    }
  }
  const mats = [main, glow];
  const layers: [Map<Bone | string, G[]>, THREE.MeshStandardMaterial][] = [[b.solid, main], [b.glow, glow]];
  if (b.pelt.size) {
    const fur = furMaterial(b.stripe, b.rough);
    mats.push(fur);
    layers.push([b.pelt, fur]);
  }
  for (const [map, material] of layers) {
    for (const [name, list] of map) {
      const parent = bones[name as Bone];
      if (!parent) {
        for (const g of list) g.dispose();
        continue;
      }
      const geo = merge(list);
      const mesh = new THREE.Mesh(geo, material);
      mesh.castShadow = material !== glow;
      parent.add(mesh);
      if (material !== glow) parent.add(new THREE.Mesh(geo, OUTLINE));
    }
  }
  const scale = b.scale * scaleMult;
  root.scale.setScalar(scale);
  const height = (b.form === "bat" ? 1.5 : b.form === "slime" ? 1.2 : 2.1) * scale;
  // peso: corpos grandes balançam mais devagar
  const weight = Math.max(0.6, Math.sqrt(scale) * (0.7 + 0.3 * k));
  return {
    root, inner, body: inner, head: inner, armL: null, armR: null, legL: null, legR: null, wings: [],
    mats, baseEmissive: mats.map((m) => m.emissive.clone()), kind: "humanoid", height, phase: Math.random() * 10,
    char: { bones, legs, style: b.style, poseR: b.poseR, poseL: b.poseL, form: b.form, shot: 0,
      lean: b.lean, crouch: b.crouch, armOut: b.armOut, weight, hipY: b.dims.hipY, phys: newPhys() },
  };
}

/** Empurrão de um golpe: direção no mundo e força 0..1. O corpo cede e volta como mola; define para onde cai ao morrer. */
export function kickRig(rig: Rig, dx: number, dz: number, power: number): void {
  const c = rig.char;
  if (!c) return;
  const p = c.phys;
  const w = 1 / c.weight;
  p.kickX.v += dx * power * 9 * w;
  p.kickZ.v += dz * power * 9 * w;
  p.bounce.v -= power * 3.5 * w;
  p.fallX = dx;
  p.fallZ = dz;
}

// ---------------------------------------------------------------- animação
const ease = (t: number) => t * t * (3 - 2 * t);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** passa do alvo e volta (golpe com peso) */
const overshoot = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

export function animateChar(rig: Rig, a: AnimState): void {
  const c = rig.char!;
  const B = c.bones;
  const P = c.phys;
  const root = rig.root;
  const S = root.scale.x;
  const inner = rig.inner;
  const t = a.t + rig.phase;
  const W = c.weight;

  // ---- movimento real do corpo (posição e giro entre quadros)
  const dt = clamp(a.t - P.t, 0, 0.05);
  P.t = a.t;
  const yaw = root.rotation.y;
  let wvx = 0, wvz = 0, yawVel = 0;
  if (P.init && dt > 0) {
    wvx = (root.position.x - P.x) / dt;
    wvz = (root.position.z - P.z) / dt;
    if (Math.hypot(wvx, wvz) > 45) wvx = wvz = 0; // teleporte
    let dy = yaw - P.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    yawVel = dy / dt;
  }
  P.init = true;
  P.x = root.position.x;
  P.z = root.position.z;
  P.yaw = yaw;
  const sm = 1 - Math.exp(-dt * 16);
  P.vx += (wvx - P.vx) * sm;
  P.vz += (wvz - P.vz) * sm;
  const sn = Math.sin(yaw), cs = Math.cos(yaw);
  // velocidade no referencial do corpo, em "alturas de corpo" por segundo
  const vf = (P.vx * sn + P.vz * cs) / S;
  const vs = (P.vx * cs - P.vz * sn) / S;
  const speed = Math.hypot(vf, vs);
  const af = dt > 0 ? clamp((vf - P.pvf) / dt, -60, 60) : 0;
  const as = dt > 0 ? clamp((vs - P.pvs) / dt, -60, 60) : 0;
  P.pvf = vf;
  P.pvs = vs;
  const alive = a.dead <= 0;
  const move = alive ? clamp(speed / 2.4, 0, 1) : 0;
  const run = alive ? clamp((speed - 2.4) / 4, 0, 1) : 0;
  const fN = speed > 0.05 ? vf / speed : 1;
  const sN = speed > 0.05 ? vs / speed : 0;
  // a passada avança com a distância percorrida: o pé não escorrega
  P.stride += speed * dt * 2.5;

  // ---- molas: inclinação por aceleração, peças soltas, tranco de golpe
  const stiff = 70 / W, damp = 9 / Math.sqrt(W);
  const leanF = P.leanF.step(clamp(af * 0.008, -0.2, 0.2), stiff, damp, dt);
  const leanS = P.leanS.step(clamp(as * 0.008, -0.18, 0.18), stiff, damp, dt);
  const secF = P.secF.step(clamp(vf * 0.11, -0.35, 1.15), 34 / W, 4.2, dt);
  const secS = P.secS.step(clamp(vs * 0.11, -0.6, 0.6), 34 / W, 4.2, dt);
  const twist = P.twist.step(clamp(-yawVel * 0.035, -0.5, 0.5), 60 / W, 8, dt);
  const kx = P.kickX.step(0, 110 / W, 11, dt);
  const kz = P.kickZ.step(0, 110 / W, 11, dt);
  const kf = kx * sn + kz * cs;
  const ks = kx * cs - kz * sn;
  const bounce = P.bounce.step(0, 220 / W, 13, dt);

  inner.rotation.set(kf * 0.5 + leanF, 0, -ks * 0.5 - leanS);
  inner.position.set(ks * 0.45, 0, kf * 0.45);
  inner.scale.set(1 - bounce * 0.35, 1 + bounce * 0.7, 1 - bounce * 0.35);

  if (c.form === "bat") {
    const flap = Math.sin(t * 26) * 0.9;
    B.wingL!.rotation.z = flap;
    B.wingR!.rotation.z = -flap;
    const h = B.hips!;
    h.position.y = 1.1 + Math.sin(t * 5) * 0.14 + (a.attack >= 0 ? -Math.sin(a.attack * Math.PI) * 0.4 : 0);
    h.rotation.set(0.3 * move + (a.attack >= 0 ? Math.sin(a.attack * Math.PI) * 0.6 : 0) - a.windup * 0.4, 0, twist * 1.6 - vs * 0.12);
    if (!alive) {
      const k = Math.min(1, a.dead);
      h.position.y = 1.1 * (1 - k * k) + 0.15;
      h.rotation.z = k * 2.4;
      inner.scale.setScalar(1 - k * 0.3);
    }
    return;
  }
  if (c.form === "slime") {
    const h = B.hips!;
    const hop = Math.abs(Math.sin(P.stride * 0.9)) * move;
    let sy = 1 + Math.sin(t * 3.2) * 0.05 + hop * 0.22 + bounce * 1.4;
    if (a.windup > 0) sy -= a.windup * 0.3;
    else if (a.attack >= 0) sy += Math.sin(a.attack * Math.PI) * 0.35;
    if (!alive) sy = Math.max(0.08, 1 - Math.min(1, a.dead) * 0.92);
    sy = clamp(sy, 0.08, 1.7);
    const sxz = 1 / Math.sqrt(sy);
    h.scale.set(sxz, sy, sxz);
    h.position.set(0, hop * 0.18, a.attack >= 0 ? Math.sin(a.attack * Math.PI) * 0.3 : 0);
    inner.scale.setScalar(1);
    // gelatina: o topo fica para trás quando acelera
    h.rotation.set(-secF * 0.25 + kf * 0.8, 0, secS * 0.25 - ks * 0.8);
    return;
  }

  const hips = B.hips!, torso = B.torso!, head = B.head!;
  const armL = B.armL!, armR = B.armR!, foreL = B.foreL!, foreR = B.foreR!;
  const ph = P.stride;
  const sw = Math.sin(ph) * move;
  const cw = Math.cos(ph);
  const breathe = Math.sin(t * 2.1);
  const sway = Math.sin(t * 0.9) * (1 - move); // troca de apoio parado
  const amp = 0.62 + 0.3 * run;

  // quadril: sobe e desce duas vezes por passada, gira e balança
  const crouch = c.crouch + 0.1 * run;
  let hipY = c.hipY - crouch * 0.1;
  if (c.form === "robed") hipY = c.hipY + 0.06 + Math.sin(t * 2.4) * 0.05 + Math.abs(cw) * 0.02 * move;
  else if (c.form === "spider") hipY = c.hipY + 0.25 + Math.sin(ph * 2) * 0.03 * move;
  else hipY -= (0.5 - Math.abs(cw) * 0.5) * 0.1 * move * (1 + run * 0.6) * W;
  hips.position.set(sway * 0.025 + sw * 0.02 * sN, hipY, 0);
  hips.rotation.set(0, sw * 0.16 * fN + twist * 0.4, sway * 0.04 + Math.cos(ph) * 0.05 * move);
  // tronco: inclina na direção do movimento, contragira os ombros, respira
  torso.rotation.set(c.lean + (0.1 + 0.16 * run) * move * fN + breathe * 0.014, -sw * 0.24 * fN + twist, -sway * 0.03 - 0.1 * move * sN - Math.cos(ph) * 0.04 * move);
  torso.scale.set(1 + breathe * 0.008, 1 + breathe * 0.014, 1 + breathe * 0.02);
  // cabeça: olha em volta parado, estabiliza andando e atrasa no giro
  head.rotation.set(-c.lean * 0.8 - 0.07 * move + Math.sin(t * 0.7) * 0.03 * (1 - move), Math.sin(t * 0.43) * 0.16 * (1 - move) + sw * 0.1 - twist * 0.9, sway * 0.03);

  // braços: balanço oposto às pernas, com o antebraço atrasado (mola)
  const armLag = P.armLag.step(sw, 90, 9, dt);
  const freeR = c.poseR[0] > -0.8 ? 1 : 0.18;
  const freeL = c.poseL[0] > -0.8 ? 1 : 0.18;
  armR.rotation.set(c.poseR[0] - sw * 0.55 * amp * freeR * fN - secF * 0.12 * freeR, 0, c.armOut + Math.abs(sw) * 0.06);
  armL.rotation.set(c.poseL[0] + sw * 0.55 * amp * freeL * fN - secF * 0.12 * freeL, 0, -c.armOut - Math.abs(sw) * 0.06);
  foreR.rotation.set(c.poseR[1] - (0.25 * move + Math.max(0, -armLag) * 0.45) * freeR - run * 0.4 * freeR, 0, 0);
  foreL.rotation.set(c.poseL[1] - (0.25 * move + Math.max(0, armLag) * 0.45) * freeL - run * 0.4 * freeL, 0, 0);

  if (c.form === "biped") {
    // perna: balanço na direção em que o corpo anda; joelho dobra quando o pé sai do chão
    const tl = sw * amp, tr = -sw * amp;
    const kneeL = Math.max(0, -cw) * (0.9 + 0.5 * run) * move;
    const kneeR = Math.max(0, cw) * (0.9 + 0.5 * run) * move;
    B.thighL!.rotation.set(-crouch * 0.6 + tl * fN - kneeL * 0.25, 0, -0.06 - tl * sN * 0.7);
    B.thighR!.rotation.set(-crouch * 0.6 + tr * fN - kneeR * 0.25, 0, 0.06 - tr * sN * 0.7);
    B.shinL!.rotation.x = crouch * 1.1 + kneeL;
    B.shinR!.rotation.x = crouch * 1.1 + kneeR;
  } else if (B.skirt) {
    B.skirt.rotation.set(-secF * 0.22 + kf * 0.3, 0, secS * 0.22);
  }
  c.legs.forEach((g, i) => {
    const lp = ph * 1.4 + (i % 2 ? Math.PI : 0) + Math.floor(i / 2) * 1.6;
    g.rotation.z = Math.max(0, Math.sin(lp)) * 0.24 * (i % 2 ? -1 : 1) * (0.2 + move);
    g.rotation.x = Math.cos(lp) * 0.18 * (0.15 + move);
  });
  // peças soltas arrastam com a velocidade e oscilam como mola
  if (B.cape) B.cape.rotation.set(0.1 + secF + Math.sin(t * 3.1) * 0.04 * (1 + move), 0, -secS + leanS);
  if (B.tail) B.tail.rotation.set(0.2 + secF * 0.6 + Math.sin(t * 2.6) * 0.12, Math.sin(t * 2.1) * 0.5 + twist * 2 - secS, 0);

  // ---- golpe: preparo, ataque que passa do ponto e volta, corpo avança
  const wind = a.windup;
  const p = a.attack >= 0 ? a.attack : -1;
  if (alive && (wind > 0 || p >= 0)) {
    if (p >= 0 && !P.wasAttacking) P.bounce.v += 1.2 / W; // impulso no início do golpe
    const strike = p >= 0 ? (p < 0.3 ? overshoot(p / 0.3) : 1) : 0;
    const back = p >= 0.3 ? ease((p - 0.3) / 0.7) : 0;
    const prep01 = p >= 0 ? Math.max(0, 1 - strike) : wind;
    const hit = strike * (1 - back);
    inner.position.z += hit * 0.22 - prep01 * 0.1;
    hips.position.y -= hit * 0.06;
    switch (c.style) {
      case "swing":
        armR.rotation.x = c.poseR[0] * back - 2.8 * prep01 + 0.55 * hit;
        armR.rotation.z = c.armOut + 0.55 * prep01 - 0.35 * hit;
        foreR.rotation.x = c.poseR[1] * back - 0.7 * prep01 - 0.05 * hit;
        torso.rotation.y += 0.7 * prep01 - 0.85 * hit;
        torso.rotation.x += -0.2 * prep01 + 0.38 * hit;
        hips.rotation.y += 0.25 * prep01 - 0.3 * hit;
        if (c.poseL[0] === c.poseR[0]) {
          armL.rotation.x = armR.rotation.x;
          foreL.rotation.x = foreR.rotation.x;
        } else armL.rotation.x += 0.5 * hit;
        break;
      case "thrust": {
        const right = c.shot % 2 === 0;
        const arm = right ? armR : armL, fore = right ? foreR : foreL;
        arm.rotation.x = -0.4 * prep01 - 1.6 * hit + (right ? c.poseR[0] : c.poseL[0]) * back;
        fore.rotation.x = -1.7 * prep01 - 0.05 * hit + (right ? c.poseR[1] : c.poseL[1]) * back;
        torso.rotation.y += (right ? -1 : 1) * (0.6 * hit - 0.35 * prep01);
        torso.rotation.x += 0.26 * hit;
        break;
      }
      case "shoot":
      case "dual": {
        const right = c.style === "shoot" ? c.poseR[0] < -1 : c.shot % 2 === 0;
        const arm = right ? armR : armL, fore = right ? foreR : foreL;
        const kick = p >= 0 ? Math.max(0, 1 - p * 3.2) : 0;
        arm.rotation.x = -1.45 - kick * 0.5;
        fore.rotation.x = -0.1 - kick * 0.6;
        torso.rotation.x -= 0.1 * kick;
        torso.rotation.y += (right ? 1 : -1) * 0.12 * kick;
        inner.position.z -= kick * 0.12 + hit * 0.22;
        if (c.style === "shoot" && !right) {
          armR.rotation.x = -1.2;
          foreR.rotation.x = -1.4 * (prep01 + back * 0.5);
        }
        break;
      }
      case "cast":
        armR.rotation.x = -2.4 * prep01 - 1.5 * hit + c.poseR[0] * back;
        foreR.rotation.x = -0.9 * prep01 - 0.15 * hit + c.poseR[1] * back;
        armL.rotation.x = -1.2 * prep01 - 1.35 * hit + c.poseL[0] * back;
        foreL.rotation.x = -1.0 * prep01 - 0.15 * hit + c.poseL[1] * back;
        torso.rotation.x += -0.22 * prep01 + 0.24 * hit;
        break;
      case "throw":
        armR.rotation.x = -3.0 * prep01 - 1.3 * hit + c.poseR[0] * back;
        foreR.rotation.x = -1.3 * prep01 + c.poseR[1] * back;
        torso.rotation.y += 0.7 * prep01 - 0.7 * hit;
        torso.rotation.x += 0.3 * hit;
        break;
      case "bite":
        break;
    }
  }
  P.wasAttacking = p >= 0;

  // ---- queda: tomba para onde o golpe empurrou, quica e fica no chão
  if (!alive) {
    const k = Math.min(1, a.dead);
    const fall = k < 0.55 ? Math.pow(k / 0.55, 2) : 1 - 0.07 * Math.sin(((k - 0.55) / 0.45) * Math.PI);
    let ff = P.fallX * sn + P.fallZ * cs;
    let fs = P.fallX * cs - P.fallZ * sn;
    if (Math.hypot(ff, fs) < 0.1) {
      ff = -1;
      fs = 0;
    }
    const A = 1.5 * fall;
    inner.rotation.set(A * ff, 0, -A * fs);
    inner.position.set(fs * fall * 0.6, fall * 0.14, ff * fall * 0.6);
    inner.scale.setScalar(a.dead > 0.85 ? 1 - Math.min(1, (a.dead - 0.85) / 0.4) * 0.5 : 1);
    const limp = ease(k);
    armL.rotation.set(-0.6 * limp, 0, -c.armOut - 1.2 * limp);
    armR.rotation.set(-0.6 * limp, 0, c.armOut + 1.2 * limp);
    foreL.rotation.x = -0.5 * limp;
    foreR.rotation.x = -0.5 * limp;
    head.rotation.x = -0.5 * limp * Math.sign(ff || -1);
    if (B.thighL) {
      B.thighL.rotation.set(-0.5 * limp, 0, -0.25 * limp);
      B.thighR!.rotation.set(0.2 * limp, 0, 0.25 * limp);
      B.shinL!.rotation.x = 0.9 * limp;
      B.shinR!.rotation.x = 0.3 * limp;
    }
  }
}

/** alterna o braço do próximo tiro/estocada */
export function nextShot(rig: Rig): void {
  if (rig.char) rig.char.shot++;
}
