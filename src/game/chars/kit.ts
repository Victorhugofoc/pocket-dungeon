// Personagens modelados por código: corpo articulado (quadril, tronco, cabeça, braços e pernas com cotovelo e joelho),
// peças de roupa/arma por personagem e animação procedural. Os designs seguem os sprites do Dungeon Reign.
import * as THREE from "three";
import { merge, paint, prep, xf } from "../flora";

export type G = THREE.BufferGeometry;
export type Bone =
  | "hips" | "torso" | "head" | "armL" | "armR" | "foreL" | "foreR" | "thighL" | "thighR" | "shinL" | "shinR"
  | "cape" | "tail" | "wingL" | "wingR" | "skirt" | "weapon";
/** `throwL` = arremesso com o braço esquerdo (escudo) */
export type Style = "swing" | "shoot" | "dual" | "cast" | "thrust" | "throw" | "throwL" | "bite";
export type Form = "biped" | "robed" | "bat" | "slime" | "spider";

// ---------------------------------------------------------------- primitivas (já pintadas por vértice)
export const dk = (c: number, f = 0.68) => new THREE.Color(c).multiplyScalar(f).getHex();
export const lt = (c: number, f = 0.25) => new THREE.Color(c).lerp(new THREE.Color(0xffffff), f).getHex();

export function sph(r: number, c: number, sx = 1, sy = 1, sz = 1, c2 = dk(c)): G {
  const g = prep(new THREE.SphereGeometry(r, 12, 9), true);
  g.scale(sx, sy, sz);
  return paint(g, c2, c, -r * sy, r * sy);
}
/** esfera de poucos triângulos (80), para tachas, contas e dedos */
export function stud(r: number, c: number, c2 = dk(c), sx = 1, sy = 1, sz = 1, detail = 1): G {
  const g = prep(new THREE.IcosahedronGeometry(r, detail), true);
  g.scale(sx, sy, sz);
  return paint(g, c2, c, -r * sy, r * sy);
}
export function cap(r: number, len: number, c: number, c2 = dk(c)): G {
  const g = prep(new THREE.CapsuleGeometry(r, len, 4, 10), true);
  return paint(g, c2, c, -len / 2 - r, len / 2 + r);
}
export function cyl(r0: number, r1: number, h: number, c: number, sides = 10, c2 = dk(c)): G {
  const g = prep(new THREE.CylinderGeometry(r1, r0, h, sides), sides > 6);
  return paint(g, c2, c, -h / 2, h / 2);
}
export function cone(r: number, h: number, c: number, sides = 10, c2 = dk(c)): G {
  const g = prep(new THREE.ConeGeometry(r, h, sides), sides > 6);
  return paint(g, c2, c, -h / 2, h / 2);
}
export function bx(w: number, h: number, d: number, c: number, c2 = dk(c, 0.8)): G {
  const g = prep(new THREE.BoxGeometry(w, h, d), false);
  return paint(g, c2, c, -h / 2, h / 2);
}
/** superfície de revolução: pontos [raio, y] de baixo para cima */
export function lathe(pts: [number, number][], c: number, c2 = dk(c), seg = 14): G {
  const g = prep(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), true);
  const ys = pts.map((p) => p[1]);
  return paint(g, c2, c, Math.min(...ys), Math.max(...ys));
}
export function torus(r: number, tube: number, c: number): G {
  const g = prep(new THREE.TorusGeometry(r, tube, 6, 14), true);
  g.rotateX(Math.PI / 2);
  return paint(g, dk(c), c, -tube, tube);
}
export const at = xf;

/** Pata de dois ossos. Geometria ao longo de +z a partir da origem de cada osso; usa o material de `pelt` quando houver. */
export interface LegSpec {
  /** encaixe no corpo, em relação ao quadril */
  attach: [number, number, number];
  /** onde o pé pousa em repouso, no chão, em relação ao centro do corpo */
  home: [number, number];
  l1: number;
  l2: number;
  femur: G[];
  tibia: G[];
}

/** Fita solta com física: presa em `at` no osso, cai com a gravidade, arrasta com o movimento e não atravessa o corpo nem o chão.
 * É simulada no mundo como uma corrente de pontos (`animate.ts`); a malha é refeita a cada quadro. */
export interface RibbonSpec {
  bone: Bone;
  at: [number, number, number];
  len: number;
  /** número de gomos da corrente */
  seg?: number;
  /** meia largura na raiz e na ponta */
  width: [number, number];
  thick?: number;
  color: number;
  /** cor da ponta */
  tip: number;
}

// ---------------------------------------------------------------- construtor
export class Builder {
  solid = new Map<Bone | string, G[]>();
  glow = new Map<Bone | string, G[]>();
  /** superfície com padrão no shader: pelagem listrada (`fur`) ou casca rachada de lava (`lava`) */
  pelt = new Map<Bone | string, G[]>();
  surface: "fur" | "lava" = "fur";
  stripe = 0x140a0c;
  lava = 0xff6a1a;
  /** proporções do esqueleto; shoulderX e hipX em 0 = calculados pelo `bulk` */
  dims = { hipY: HIP_Y, headY: HEAD_Y, shoulderY: SHOULDER_Y, shoulderX: 0, arm: 0.34, hipX: 0, thigh: 0.42 };
  style: Style = "swing";
  poseR: [number, number] = [0.1, -0.3];
  poseL: [number, number] = [0.1, -0.3];
  form: Form = "biped";
  bulk = 1;
  scale = 1;
  glowColor = 0xffffff;
  rough = 0.72;
  /** patas com cinemática inversa: o pé fica preso ao chão e dá passadas (aranha, escorpião) */
  ikLegs: LegSpec[] = [];
  lean = 0.05;
  crouch = 0.14;
  armOut = 0.14;
  /** luzes pontuais presas a um osso (lanterna, orbe) */
  lights: { bone: Bone; x: number; y: number; z: number; color: number; intensity: number; distance: number }[] = [];
  /** peças de `lit` brilham na própria cor do vértice em vez de `glowColor` (para dois brilhos de cores diferentes) */
  glowByVertex = false;
  /** Arma de duas mãos com osso próprio (`weapon`, na mão direita, a `hand` do cotovelo). A arma é modelada ao longo de -y a partir da mão;
   * `carry` é a rotação de descanso, no golpe ela alinha com o antebraço. A mão esquerda segura a `grip` da mão direita, ao longo do cabo. */
  weapon: { hand: number; carry: THREE.Quaternion; grip: number } | null = null;

  /** fitas soltas com física (cachecol, faixa): ver `RibbonSpec` */
  ribbons: RibbonSpec[] = [];

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
  /** peças sem contorno preto (olhos, sobrancelhas, boca): pequenas demais para o contorno, que as transforma em riscos */
  detail = new Map<Bone | string, G[]>();
  flat(bone: Bone | string, ...g: G[]): this {
    const l = this.detail.get(bone) ?? [];
    l.push(...g);
    this.detail.set(bone, l);
    return this;
  }
  fur(bone: Bone | string, ...g: G[]): this {
    const l = this.pelt.get(bone) ?? [];
    l.push(...g);
    this.pelt.set(bone, l);
    return this;
  }
}

export interface BodyOpts {
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
export const HIP_Y = 0.92;
export const TORSO_Y = 0.08;
export const HEAD_Y = 0.6;
export const SHOULDER_Y = 0.46;

/** membro afunilado com pontas arredondadas, do pivô (y=0) para baixo */
export function limb(r0: number, r1: number, len: number, c: number, bulge = 0): G {
  const mid = Math.max(r0, r1) * (1 + bulge);
  return lathe([[0, -len - r1 * 0.9], [r1 * 0.75, -len - r1 * 0.55], [r1, -len], [mid, -len * 0.42], [r0, -len * 0.08], [r0 * 0.8, r0 * 0.55], [0, r0 * 0.95]], c, dk(c, 0.62), 10);
}

export function body(b: Builder, o: BodyOpts): void {
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
export const STEEL = 0xc2cad3, IRON = 0x8a929c, BONE = 0xe8dcc0, GOLD = 0xe8b93a, WOOD = 0x7a5230, LEATHER = 0x6b4a2e, BLACK = 0x22222a;

export const hairCap = (c: number) => [at(sph(0.23, c, 1, 0.8, 1), 0, 0.26, -0.02)];
export const hairLong = (c: number, len = 0.5) => [...hairCap(c), at(sph(0.2, c, 1, len / 0.2, 0.55), 0, 0.2 - len * 0.5, -0.13)];
export const beard = (c: number, len = 0.3) => [at(cone(0.15, len, c, 8), 0, 0.08 - len / 2, 0.14, Math.PI + 0.25)];
export const hood = (c: number) => [at(sph(0.26, c, 1, 1.02, 1.04), 0, 0.22, -0.03), at(cone(0.16, 0.26, c, 8), 0, 0.42, -0.14, -0.9)];
export function cowboyHat(c: number, band: number): G[] {
  return [at(cyl(0.36, 0.38, 0.03, c, 16), 0, 0.37, 0), at(cyl(0.2, 0.17, 0.2, c, 12), 0, 0.48, 0), at(cyl(0.205, 0.205, 0.045, band, 12), 0, 0.41, 0)];
}
export function wizardHat(c: number, band: number, tipDx = 0.14): G[] {
  return [
    at(lathe([[0.46, 0], [0.44, 0.03], [0.22, 0.06], [0.16, 0.3], [0.07, 0.55], [0.02, 0.72]], c), 0, 0.33, 0, -0.12),
    at(sph(0.05, c), tipDx, 1.03, -0.16),
    at(cyl(0.225, 0.2, 0.06, band, 12), 0, 0.41, -0.01),
  ];
}
export function hornHelm(metal: number, horn: number): G[] {
  const out = [at(sph(0.235, metal, 1, 0.82, 1.02), 0, 0.27, -0.01), at(bx(0.05, 0.16, 0.05, metal), 0, 0.2, 0.22)];
  for (const s of [-1, 1]) out.push(at(cone(0.06, 0.3, horn, 7), s * 0.27, 0.42, 0, 0, 0, -s * 0.7));
  return out;
}
export function cape(c: number, w = 0.3, len = 0.95): G[] {
  // meia casca cilíndrica pendurada nos ombros
  const g = prep(new THREE.CylinderGeometry(w, w * 1.35, len, 10, 3, true, Math.PI * 0.5, Math.PI), true);
  paint(g, dk(c, 0.55), c, -len / 2, len / 2);
  return [at(g, 0, -len / 2, 0.02)];
}
export const pauldron = (c: number, r = 0.15) => [at(sph(r, c, 1, 0.8, 1.05), 0, 0.04, 0)];
export const belt = (c: number, k = 1, buckle = GOLD) => [at(cyl(0.215 * k, 0.215 * k, 0.07, c, 12), 0, 0.06, 0), at(bx(0.08, 0.08, 0.04, buckle), 0, 0.06, 0.2 * k)];

// armas: presas ao antebraço; o cabo sai da mão (y = -0.31). `along` = aponta na direção do braço.
export function staff(wood: number, len = 1.9): G[] {
  return [at(cyl(0.028, 0.034, len, wood, 6), 0, -0.31, 0.25, Math.PI / 2)];
}
export function sword(len = 0.95, blade = STEEL, hilt = GOLD): G[] {
  return [
    at(bx(0.035, len, 0.1, blade, lt(blade)), 0, -0.4 - len / 2, 0),
    at(cone(0.05, 0.14, blade, 4), 0, -0.4 - len - 0.06, 0, Math.PI),
    at(bx(0.07, 0.05, 0.32, hilt), 0, -0.4, 0),
    at(cyl(0.03, 0.03, 0.16, LEATHER, 6), 0, -0.32, 0),
  ];
}
export function revolver(): G[] {
  return [at(cyl(0.03, 0.026, 0.4, 0x9aa3ad, 8), 0, -0.56, 0.03), at(bx(0.07, 0.14, 0.09, 0x6b727c), 0, -0.4, 0.02), at(bx(0.05, 0.1, 0.14, LEATHER), 0, -0.33, -0.05)];
}
export function mace(): G[] {
  const head = [at(sph(0.17, IRON), 0, -1.25, 0)];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    head.push(at(cone(0.045, 0.14, STEEL, 5), Math.cos(a) * 0.19, -1.25, Math.sin(a) * 0.19, 0, 0, 0).applyMatrix4(new THREE.Matrix4()));
  }
  return [at(cyl(0.035, 0.04, 0.95, WOOD, 7), 0, -0.72, 0), at(cyl(0.05, 0.05, 0.1, GOLD, 7), 0, -1.12, 0), ...head];
}
export const dagger = (c = STEEL) => [at(bx(0.025, 0.42, 0.07, c, lt(c)), 0, -0.6, 0), at(bx(0.05, 0.035, 0.16, BLACK), 0, -0.39, 0)];
export function axe(len = 1.0, double = false): G[] {
  const out = [at(cyl(0.032, 0.036, len, WOOD, 7), 0, -0.3 - len / 2, 0)];
  for (const s of double ? [-1, 1] : [1]) {
    const blade = prep(new THREE.CylinderGeometry(0.3, 0.3, 0.045, 10, 1, false, -0.9, 1.8), false);
    paint(blade, IRON, STEEL, -0.3, 0.3);
    out.push(at(blade, 0, -0.18 - len, s * 0.06, 0, s > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI / 2));
  }
  return out;
}
export function club(): G[] {
  return [at(cyl(0.035, 0.11, 0.85, WOOD, 7), 0, -0.72, 0), at(sph(0.115, WOOD), 0, -1.14, 0)];
}
export function bow(): G[] {
  const arc = prep(new THREE.TorusGeometry(0.5, 0.025, 5, 14, Math.PI * 0.9), true);
  paint(arc, dk(WOOD), WOOD, -0.5, 0.5);
  return [at(arc, 0, -0.31, 0.02, 0, Math.PI / 2, Math.PI * 0.55), at(cyl(0.006, 0.006, 0.95, 0xe8e0d0, 4), 0, -0.31, -0.06, Math.PI / 2)];
}
export function shield(face: number, rim: number): G[] {
  const s = prep(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 5), false);
  paint(s, dk(face), face, -0.4, 0.4);
  return [at(s, -0.11, -0.2, 0.02, 0, 0, Math.PI / 2, 1, 1, 1.25), at(sph(0.1, rim, 0.5, 1, 1), -0.16, -0.2, 0.02)];
}

export const SKIN = 0xe8bd98;
export type Spec = (b: Builder) => void;

// ---------------------------------------------------------------- escultura (método da seção 4 do roadmap)
/** aplica a mesma transformação a uma lista de peças */
export const grp = (list: G[], x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s = 1): G[] => list.map((g) => at(g, x, y, z, rx, ry, rz, s));
/** smoothstep entre `a` e `e` */
export const ss = (a: number, e: number, x: number): number => { const t = Math.max(0, Math.min(1, (x - a) / (e - a))); return t * t * (3 - 2 * t); };
/** sino de largura `w` centrado em 0 */
export const bell = (x: number, w: number): number => Math.exp(-(x * x) / (w * w));

export type Shape = (n: THREE.Vector3, p: THREE.Vector3) => void;
export type Tint = (n: THREE.Vector3, c: THREE.Color) => void;

/** esculpe uma esfera: `shape` leva a direção unitária `n` para a posição, `tint` dá a cor do vértice */
export function sculpt(w: number, h: number, shape: Shape, tint: Tint): G {
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
}

export interface MuscleOpts {
  color: number;
  shade?: number;
  /** multiplica os raios do perfil */
  girth?: number;
  /** multiplica o comprimento; o osso (`b.dims.arm` / `b.dims.thigh`) deve acompanhar */
  len?: number;
}
type Profile = [number, number][];
const profile = (pts: Profile, o: MuscleOpts, seg: number): G =>
  lathe(pts.map(([r, y]) => [r * (o.girth ?? 1), y * (o.len ?? 1)]), o.color, o.shade ?? dk(o.color), seg);

const ARM_UPPER: Profile = [[0, -0.47], [0.125, -0.42], [0.15, -0.32], [0.185, -0.17], [0.18, -0.05], [0.14, 0.07], [0, 0.14]];
const ARM_LOWER: Profile = [[0, -0.43], [0.1, -0.4], [0.115, -0.33], [0.165, -0.19], [0.175, -0.1], [0.125, 0.03], [0, 0.1]];
const LEG_THIGH: Profile = [[0, -0.4], [0.12, -0.36], [0.16, -0.26], [0.2, -0.1], [0.17, 0.04], [0, 0.12]];
const LEG_SHIN: Profile = [[0, -0.37], [0.08, -0.34], [0.085, -0.26], [0.13, -0.1], [0.11, 0.02], [0, 0.08]];

/** braço com perfil de músculo, do pivô para baixo: bíceps e antebraço grosso (medidas do Bloodfang em girth = len = 1) */
export function muscleArm(o: MuscleOpts): { upper: G; lower: G } {
  return { upper: profile(ARM_UPPER, o, 14), lower: profile(ARM_LOWER, o, 14) };
}
/** perna com perfil de músculo: coxa grossa e panturrilha */
export function muscleLeg(o: MuscleOpts): { thigh: G; shin: G } {
  return { thigh: profile(LEG_THIGH, o, 14), shin: profile(LEG_SHIN, o, 12) };
}

export interface TorsoOpts {
  /** cor de base, sombra (embaixo) e realce (peito) */
  color: number;
  shade: number;
  light: number;
  /** meia largura na cintura, ganho até o peito e recuo no pescoço */
  waistW?: number;
  chestW?: number;
  neckW?: number;
  /** o mesmo para a profundidade */
  waistD?: number;
  chestD?: number;
  neckD?: number;
  /** relevo: peitorais, linha e gomos do abdômen, trapézio */
  pecs?: number;
  abs?: number;
  ribs?: number;
  traps?: number;
  /** base e altura em relação ao osso do tronco */
  y0?: number;
  height?: number;
  seg?: [number, number];
}
/** tronco como malha única: cintura fina, peito largo com peitorais e trapézio. Padrões = Bloodfang. */
export function torsoMesh(o: TorsoOpts): G {
  const { waistW = 0.27, chestW = 0.34, neckW = 0.13, waistD = 0.2, chestD = 0.13, neckD = 0.06, pecs = 0.09, abs = 0.018, ribs = 0.012, traps = 0.11, y0 = -0.08, height = 0.8, seg = [30, 22] } = o;
  const base = new THREE.Color(o.color), shade = new THREE.Color(o.shade), light = new THREE.Color(o.light);
  return sculpt(seg[0], seg[1], (n, p) => {
    const t = (n.y + 1) / 2;
    const rho = Math.hypot(n.x, n.z) || 1e-6;
    const s = n.x / rho, c = n.z / rho;
    const r = Math.pow(rho, 0.45);
    const W = waistW + chestW * ss(0.15, 0.72, t) - neckW * ss(0.84, 1, t);
    const D = waistD + chestD * ss(0.2, 0.7, t) - neckD * ss(0.85, 1, t);
    const front = Math.max(0, c), back = Math.max(0, -c);
    let z = c * D * r;
    z += pecs * bell(t - 0.7, 0.11) * front * (1 - 0.75 * bell(s, 0.13)) * r; // peitorais com sulco no meio
    z -= abs * bell(s, 0.07) * front * (1 - ss(0.25, 0.6, t)); // linha do abdômen
    z += ribs * front * bell(s, 0.34) * Math.cos(t * 40) * (1 - ss(0.45, 0.58, t));
    z -= traps * back * bell(t - 0.8, 0.2) * r; // trapézio
    p.set(s * W * r, y0 + t * height, z);
  }, (n, c) => {
    const t = (n.y + 1) / 2;
    c.copy(shade).lerp(base, 0.25 + t * 0.75);
    c.lerp(light, Math.max(0, n.z) * 0.45 * bell(t - 0.68, 0.22));
  });
}

/** regiões da cabeça em função da direção `n`, para esculpir e para pintar (0..1) */
export const headMask = {
  muzzle: (n: THREE.Vector3): number => ss(0.25, 0.85, n.z) * bell(n.y + 0.18, 0.36) * bell(n.x, 0.55),
  socket: (n: THREE.Vector3): number => bell(n.y - 0.16, 0.1) * bell(Math.abs(n.x) - 0.42, 0.16) * ss(0.4, 0.8, n.z),
  cheek: (n: THREE.Vector3): number => ss(0.55, 0.95, Math.abs(n.x)) * (1 - ss(-0.5, 0.35, n.y)),
};

export interface HeadOpts {
  /** raios do crânio */
  w?: number;
  h?: number;
  d?: number;
  /** focinho: quanto avança e quanto afina. 0 = rosto chato (humano) */
  muzzle?: number;
  muzzleNarrow?: number;
  /** altura do céu da boca (corta o focinho reto por baixo); null = sem corte */
  palate?: number | null;
  /** arcada sobre os olhos, fundo das órbitas, bochechas para os lados */
  brow?: number;
  socket?: number;
  cheek?: number;
  seg?: [number, number];
  /** cor por vértice; usar `headMask` para as regiões */
  tint: Tint;
}
/** cabeça como malha única com focinho, arcada, órbitas e bochechas. Padrões = cabeça de tigre do Bloodfang. */
export function headBase(o: HeadOpts): G {
  const { w = 0.2, h = 0.185, d = 0.2, muzzle = 0.2, muzzleNarrow = 0.22, palate = -0.075, brow = 0.04, socket = 0.03, cheek = 0.075, seg = [48, 34] } = o;
  return sculpt(seg[0], seg[1], (n, p) => {
    const m = headMask.muzzle(n);
    let x = n.x * w * (1 - muzzleNarrow * m), y = n.y * h, z = n.z * d + muzzle * m;
    if (palate !== null) y += (Math.max(y, palate) - y) * ss(0.2, 0.5, n.z); // céu da boca reto
    z += brow * bell(n.y - 0.38, 0.13) * ss(0.35, 0.8, n.z); // arcada
    z -= socket * headMask.socket(n);
    x += Math.sign(n.x) * cheek * headMask.cheek(n);
    p.set(x, y + 0.02, z);
  }, o.tint);
}

/** esculpe um tubo aberto: `a` = ângulo em volta do eixo y (0 = frente), `t` = 0 no topo e 1 na barra */
export function sculptTube(seg: number, rings: number, shape: (a: number, t: number, p: THREE.Vector3) => void, tint: (a: number, t: number, c: THREE.Color) => void): G {
  const g = new THREE.CylinderGeometry(1, 1, 1, seg, rings, true);
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const p = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const a = Math.atan2(pos.getX(i), pos.getZ(i));
    const t = 0.5 - pos.getY(i);
    shape(a, t, p);
    tint(a, t, c);
    pos.setXYZ(i, p.x, p.y, p.z);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return prep(g, true);
}

export interface RobeOpts {
  color: number;
  shade: number;
  /** raio e altura na cintura e na barra, em relação ao osso */
  rTop: number;
  rHem: number;
  yTop: number;
  yHem: number;
  /** achata na profundidade */
  zScale?: number;
  /** pregas verticais (fração do raio) e rasgos da barra (altura máxima do recorte; 0 = barra reta) */
  folds?: number;
  tatter?: number;
  /** painel da frente em outra cor (manto aberto), com debrum nas bordas: meia largura em radianos */
  panel?: { half: number; color: number; trim: number };
  seg?: number;
  rings?: number;
}
/** saia de manto como malha única: abre até a barra, com pregas e barra irregular */
export function robeMesh(o: RobeOpts): G {
  const { zScale = 0.85, folds = 0.06, tatter = 0, seg = 40, rings = 9 } = o;
  const base = new THREE.Color(o.color), shade = new THREE.Color(o.shade);
  const hash = (i: number) => { const s = Math.sin(i * 127.1 + 3.3) * 43758.5453; return s - Math.floor(s); };
  const fold = (a: number) => Math.sin(a * 7 + Math.sin(a * 3) * 1.3);
  return sculptTube(seg, rings, (a, t, p) => {
    const col = Math.round(((a < 0 ? a + Math.PI * 2 : a) / (Math.PI * 2)) * seg) % seg;
    const r = (o.rTop + (o.rHem - o.rTop) * Math.pow(t, 0.85)) * (1 + folds * t * fold(a));
    const h = hash(col);
    const y = o.yTop + (o.yHem - o.yTop) * t + tatter * (h > 0.45 ? h : h * 0.25) * ss(1 - 1.5 / rings, 1, t);
    p.set(Math.sin(a) * r, y, Math.cos(a) * r * zScale);
  }, (a, t, c) => {
    c.copy(base).lerp(shade, Math.pow(t, 1.4) * 0.85);
    if (o.panel) {
      const d = Math.abs(a) - o.panel.half * (0.55 + 0.45 * t); // abre da cintura para a barra
      if (d < 0) c.set(o.panel.color).multiplyScalar(1 - 0.45 * t);
      else if (d < (Math.PI * 2) / seg * 1.01) c.set(o.panel.trim);
    }
    c.multiplyScalar(1 - 0.22 * t * (0.5 - 0.5 * fold(a))); // fundo das pregas mais escuro
  });
}

/** Pose de descanso de um braço (`side`: 1 = direito, -1 = esquerdo): rotação que desfaz tronco, ombro e cotovelo, e altura da mão
 * (a `hand` do cotovelo). Serve para deixar na vertical do mundo o que a mão segura. Chamar depois de definir pose, `dims` e `form`. */
export function restArm(b: Builder, side: number, hand: number): { inv: THREE.Quaternion; y: number } {
  const pose = side > 0 ? b.poseR : b.poseL;
  const armQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(b.lean, 0, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(pose[0], 0, side * b.armOut)));
  const q = armQ.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(pose[1], 0, 0)));
  const p = new THREE.Vector3(0, -hand, 0).applyQuaternion(q).add(new THREE.Vector3(0, -b.dims.arm, 0).applyQuaternion(armQ));
  const hip = b.form === "robed" ? b.dims.hipY + 0.06 : b.dims.hipY - b.crouch * 0.1;
  return { inv: q.invert(), y: hip + TORSO_Y + b.dims.shoulderY * Math.cos(b.lean) + p.y };
}
/** pendura na mão peças modeladas na vertical do mundo, com a origem na mão */
export const hang = (list: G[], inv: THREE.Quaternion, hand: number): G[] => list.map((g) => g.applyQuaternion(inv).translate(0, -hand, 0));

/** tubo ao longo de uma curva com raio variável (chifres, presas, tentáculos). `ref` não pode ser paralelo à curva. */
export function tubeMesh(seg: number, rings: number, path: (t: number, out: THREE.Vector3) => void, radius: (t: number) => number, tint: (a: number, t: number, c: THREE.Color) => void, ref = new THREE.Vector3(0, 0, 1)): G {
  const c0 = new THREE.Vector3(), c1 = new THREE.Vector3(), T = new THREE.Vector3(), N = new THREE.Vector3(), Bn = new THREE.Vector3();
  return sculptTube(seg, rings, (a, t, p) => {
    path(t, c0);
    path(t + 0.01, c1);
    T.subVectors(c1, c0).normalize();
    N.crossVectors(ref, T).normalize();
    Bn.crossVectors(T, N);
    const r = radius(t);
    p.copy(c0).addScaledVector(N, Math.cos(a) * r).addScaledVector(Bn, -Math.sin(a) * r);
  }, tint);
}

export interface CapeOpts {
  color: number;
  shade: number;
  /** cor do avesso */
  lining?: number;
  /** meia abertura do arco em radianos, no topo e na barra */
  half: [number, number];
  rTop: number;
  rHem: number;
  len: number;
  /** achata o arco na profundidade */
  depth?: number;
  folds?: number;
  /** recorte irregular da barra (altura máxima) */
  tatter?: number;
  nu?: number;
  nt?: number;
}
/** Pano pendurado (capa, tabardo) como malha única de duas faces: arco em volta do corpo que abre até a barra, com pregas.
 * A origem é o meio do topo; o pano cai para -y e fica atrás (-z). Para a frente, girar meia volta em y. */
export function capeMesh(o: CapeOpts): G {
  const { depth = 1, folds = 0.05, tatter = 0, nu = 12, nt = 7 } = o;
  const base = new THREE.Color(o.color), shade = new THREE.Color(o.shade), lining = new THREE.Color(o.lining ?? dk(o.shade, 0.7));
  const cols = nu + 1, n = cols * (nt + 1);
  const pos = new Float32Array(n * 6), col = new Float32Array(n * 6);
  const hash = (i: number) => { const s = Math.sin(i * 91.7 + 1.3) * 43758.5453; return s - Math.floor(s); };
  const c = new THREE.Color();
  for (let j = 0; j <= nt; j++) {
    for (let i = 0; i <= nu; i++) {
      const u = (i / nu) * 2 - 1, t = j / nt;
      const a = u * (o.half[0] + (o.half[1] - o.half[0]) * t);
      const fold = Math.sin(u * 9 + Math.sin(u * 4) * 1.2);
      const r = (o.rTop + (o.rHem - o.rTop) * t) * (1 + folds * t * fold);
      const h = hash(i);
      const y = -o.len * t + (j === nt ? tatter * (h > 0.5 ? h : h * 0.2) : 0);
      const k = j * cols + i;
      pos.set([Math.sin(a) * r, y, (o.rTop - Math.cos(a) * r) * depth], k * 3);
      pos.set([Math.sin(a) * (r - 0.014), y, (o.rTop - Math.cos(a) * (r - 0.014)) * depth], (k + n) * 3);
      c.copy(base).lerp(shade, Math.pow(t, 1.3) * 0.8).multiplyScalar(1 - 0.22 * t * (0.5 - 0.5 * fold));
      col.set([c.r, c.g, c.b], k * 3);
      col.set([lining.r, lining.g, lining.b], (k + n) * 3);
    }
  }
  const index: number[] = [];
  for (let j = 0; j < nt; j++) {
    for (let i = 0; i < nu; i++) {
      const p = j * cols + i, q = p + 1, r = p + cols, s = r + 1;
      index.push(p, q, r, q, s, r, p + n, r + n, q + n, q + n, r + n, s + n);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g.toNonIndexed();
}

/** mão fechada com quatro dedos e polegar, centrada na origem; `side`: 1 = direita, -1 = esquerda */
export function fist(c: number, r = 0.07, side = 1): G[] {
  const out = [stud(r, c, dk(c), 0.95, 1.05, 0.9)];
  for (let i = 0; i < 4; i++) out.push(at(stud(r * 0.4, c, dk(c), 1, 1.3, 1.1, 0), (i - 1.5) * r * 0.48, -r * 0.45, r * 0.75));
  out.push(at(stud(r * 0.42, c, dk(c), 1, 1.3, 1, 0), -side * r * 0.85, -r * 0.1, r * 0.55, 0, 0, -side * 0.5));
  return out;
}

/** pinta os vértices nas alturas dadas: sombra ou debrum na borda de cada lâmina de armadura */
export function edge(g: G, color: number, ...ys: number[]): G {
  const pos = g.attributes.position, c = g.attributes.color, k = new THREE.Color(color);
  for (let i = 0; i < pos.count; i++) if (ys.some((y) => Math.abs(pos.getY(i) - y) < 0.004)) c.setXYZ(i, k.r, k.g, k.b);
  return g;
}
/** lâmina em cúpula (ombreira, coxote) com a borda de baixo na cor `rim` */
export const dome = (r: number, c: number, c2: number, rim: number): G =>
  edge(lathe([[r * 1.07, -0.045], [r * 1.03, -0.005], [r * 0.93, r * 0.4], [r * 0.62, r * 0.78], [0, r * 0.95]], c, c2, 12), rim, -0.045);

/** Chapa de duas faces sobre uma grade (escudo, asa, estandarte): `u` de -1 a 1, `v` de 0 a 1. A frente olha para +z quando
 * `u` cresce em +x e `v` desce em -y; o verso fica a `thick` para trás, na cor `back`. */
export function plateMesh(nu: number, nv: number, shape: (u: number, v: number, p: THREE.Vector3) => void, tint: (u: number, v: number, c: THREE.Color) => void, back: number, thick = 0.03): G {
  const cols = nu + 1, n = cols * (nv + 1);
  const pos = new Float32Array(n * 6), col = new Float32Array(n * 6);
  const p = new THREE.Vector3(), c = new THREE.Color(), cb = new THREE.Color(back);
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      const u = (i / nu) * 2 - 1, v = j / nv, k = j * cols + i;
      shape(u, v, p);
      tint(u, v, c);
      pos.set([p.x, p.y, p.z], k * 3);
      pos.set([p.x, p.y, p.z - thick], (k + n) * 3);
      col.set([c.r, c.g, c.b], k * 3);
      col.set([cb.r, cb.g, cb.b], (k + n) * 3);
    }
  }
  const index: number[] = [];
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * cols + i, q = a + 1, r = a + cols, t = r + 1;
      index.push(a, r, q, q, r, t, a + n, q + n, r + n, q + n, t + n, r + n);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g.toNonIndexed();
}
