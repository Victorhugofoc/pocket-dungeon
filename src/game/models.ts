// Personagens procedurais feitos de blocos, animados por código (sem assets).
import * as THREE from "three";
import type { BodyKind } from "../data/enemies";

const BOX = new THREE.BoxGeometry(1, 1, 1);
const ORB = new THREE.OctahedronGeometry(0.5, 1);

export type WeaponModel =
  | "staff" | "sword" | "guns" | "mace" | "daggers" | "shield" | "claws" | "bow" | "club" | "none";

export interface RigOptions {
  body: BodyKind;
  color: number;
  accent: number;
  scale: number;
  glow?: number;
  weapon?: WeaponModel;
  crown?: boolean;
  horns?: boolean;
  hat?: boolean;
  hood?: boolean;
  skin?: number;
}

export interface Rig {
  root: THREE.Group;
  inner: THREE.Group;
  body: THREE.Object3D;
  head: THREE.Object3D;
  armL: THREE.Group | null;
  armR: THREE.Group | null;
  legL: THREE.Group | null;
  legR: THREE.Group | null;
  wings: THREE.Object3D[];
  mats: THREE.MeshStandardMaterial[];
  baseEmissive: THREE.Color[];
  kind: BodyKind;
  height: number;
  phase: number;
}

function mat(color: number, emissive = 0x000000, emissiveIntensity = 1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, flatShading: true, emissive, emissiveIntensity });
}

function box(m: THREE.Material, w: number, h: number, d: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(BOX, m);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function limb(m: THREE.Material, w: number, h: number, x: number, y: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, 0);
  g.add(box(m, w, h, w, 0, -h / 2, 0));
  return g;
}

function darken(c: number, f: number): number {
  return new THREE.Color(c).multiplyScalar(f).getHex();
}

function addWeapon(rig: Rig, weapon: WeaponModel, accent: THREE.Material, glow: THREE.MeshStandardMaterial, metal: THREE.Material): void {
  const R = rig.armR;
  const L = rig.armL;
  if (!R || !L) return;
  const wood = accent;
  switch (weapon) {
    case "staff": {
      R.add(box(wood, 0.09, 1.9, 0.09, 0, -0.45, 0.22));
      const orb = new THREE.Mesh(ORB, glow);
      orb.scale.setScalar(0.42);
      orb.position.set(0, 0.6, 0.22);
      R.add(orb);
      break;
    }
    case "sword":
      R.add(box(metal, 0.1, 0.1, 1.25, 0, -0.68, 0.7), box(wood, 0.36, 0.1, 0.08, 0, -0.68, 0.12));
      break;
    case "guns":
      R.add(box(metal, 0.12, 0.16, 0.5, 0, -0.72, 0.28));
      L.add(box(metal, 0.12, 0.16, 0.5, 0, -0.72, 0.28));
      break;
    case "mace":
      R.add(box(wood, 0.1, 0.1, 1.2, 0, -0.68, 0.6), box(metal, 0.42, 0.42, 0.42, 0, -0.68, 1.25));
      break;
    case "club":
      R.add(box(wood, 0.16, 0.16, 1.0, 0, -0.68, 0.5), box(wood, 0.28, 0.28, 0.4, 0, -0.68, 0.95));
      break;
    case "daggers":
      R.add(box(metal, 0.07, 0.07, 0.6, 0, -0.7, 0.36));
      L.add(box(metal, 0.07, 0.07, 0.6, 0, -0.7, 0.36));
      break;
    case "shield":
      L.add(box(metal, 0.12, 0.85, 0.75, -0.16, -0.45, 0.1), box(glow, 0.14, 0.3, 0.3, -0.18, -0.45, 0.1));
      R.add(box(metal, 0.1, 0.1, 0.9, 0, -0.68, 0.5));
      break;
    case "claws":
      R.add(box(glow, 0.3, 0.32, 0.36, 0, -0.74, 0.04));
      L.add(box(glow, 0.3, 0.32, 0.36, 0, -0.74, 0.04));
      break;
    case "bow":
      L.add(box(wood, 0.07, 1.3, 0.07, 0, -0.6, 0.3), box(metal, 0.03, 1.2, 0.03, 0, -0.6, 0.18));
      break;
    case "none":
      break;
  }
}

export function buildRig(o: RigOptions): Rig {
  const root = new THREE.Group();
  const inner = new THREE.Group();
  root.add(inner);
  const main = mat(o.color);
  const dark = mat(darken(o.color, 0.6));
  const accent = mat(o.accent);
  const skin = mat(o.skin ?? o.color);
  const metal = mat(0xb9c2cc);
  metal.metalness = 0.4;
  metal.roughness = 0.5;
  const glowColor = o.glow ?? o.accent;
  const glow = mat(glowColor, glowColor, o.glow ? 1.6 : 0.7);
  const eye = mat(0xffffff, o.glow ?? 0xffffff, 1.2);
  const mats = [main, dark, accent, skin, metal, glow, eye];

  const rig: Rig = {
    root, inner, body: inner, head: inner, armL: null, armR: null, legL: null, legR: null, wings: [],
    mats, baseEmissive: mats.map((m) => m.emissive.clone()), kind: o.body, height: 1.9, phase: Math.random() * 10,
  };

  if (o.body === "humanoid" || o.body === "brute") {
    const brute = o.body === "brute";
    const tw = brute ? 1.0 : 0.7;
    const td = brute ? 0.58 : 0.4;
    const aw = brute ? 0.3 : 0.2;
    const body = new THREE.Group();
    body.add(box(main, tw, 0.75, td, 0, 1.08, 0), box(dark, tw * 0.96, 0.14, td * 1.04, 0, 0.72, 0));
    const head = new THREE.Group();
    head.position.set(0, brute ? 1.62 : 1.72, brute ? 0.06 : 0);
    const hs = brute ? 0.44 : 0.5;
    head.add(box(skin, hs, hs, hs));
    head.add(box(eye, 0.09, 0.09, 0.04, -0.12, 0.03, hs / 2), box(eye, 0.09, 0.09, 0.04, 0.12, 0.03, hs / 2));
    if (o.horns) head.add(box(accent, 0.1, 0.34, 0.1, -0.24, 0.3, 0), box(accent, 0.1, 0.34, 0.1, 0.24, 0.3, 0));
    if (o.hood) head.add(box(dark, hs * 1.12, hs * 0.6, hs * 1.12, 0, 0.16, -0.03));
    if (o.hat) head.add(box(accent, 0.74, 0.07, 0.74, 0, 0.27, 0), box(accent, 0.42, 0.24, 0.42, 0, 0.4, 0));
    if (o.crown) head.add(box(glow, hs * 1.05, 0.14, hs * 1.05, 0, hs / 2 + 0.07, 0));
    body.add(head);
    rig.armL = limb(main, aw, 0.72, -(tw / 2 + aw / 2 + 0.02), 1.42);
    rig.armR = limb(main, aw, 0.72, tw / 2 + aw / 2 + 0.02, 1.42);
    body.add(rig.armL, rig.armR);
    rig.legL = limb(dark, 0.26, 0.7, -0.18, 0.7);
    rig.legR = limb(dark, 0.26, 0.7, 0.18, 0.7);
    inner.add(body, rig.legL, rig.legR);
    rig.body = body;
    rig.head = head;
    addWeapon(rig, o.weapon ?? "none", accent, glow, metal);
  } else if (o.body === "robed") {
    const body = new THREE.Group();
    body.add(box(dark, 0.86, 0.5, 0.66, 0, 0.42, 0), box(main, 0.74, 0.6, 0.54, 0, 0.92, 0), box(main, 0.64, 0.4, 0.44, 0, 1.36, 0));
    const head = new THREE.Group();
    head.position.set(0, 1.8, 0);
    head.add(box(skin, 0.46, 0.46, 0.46));
    head.add(box(eye, 0.09, 0.09, 0.04, -0.11, 0.02, 0.23), box(eye, 0.09, 0.09, 0.04, 0.11, 0.02, 0.23));
    if (o.crown) head.add(box(glow, 0.5, 0.16, 0.5, 0, 0.31, 0), box(glow, 0.1, 0.2, 0.1, 0, 0.46, 0));
    else head.add(box(dark, 0.56, 0.3, 0.56, 0, 0.2, -0.04));
    if (o.hat) head.add(box(accent, 0.34, 0.34, 0.34, 0, 0.48, -0.04), box(accent, 0.18, 0.26, 0.18, 0, 0.74, -0.06));
    body.add(head);
    rig.armL = limb(main, 0.2, 0.7, -0.47, 1.5);
    rig.armR = limb(main, 0.2, 0.7, 0.47, 1.5);
    body.add(rig.armL, rig.armR);
    inner.add(body);
    rig.body = body;
    rig.head = head;
    addWeapon(rig, o.weapon ?? "staff", accent, glow, metal);
    rig.height = 2.1;
  } else if (o.body === "bug") {
    const body = new THREE.Group();
    body.position.y = 1.0;
    body.add(box(main, 0.55, 0.42, 0.8), box(dark, 0.4, 0.34, 0.36, 0, 0.02, 0.5));
    body.add(box(eye, 0.1, 0.1, 0.05, -0.12, 0.06, 0.69), box(eye, 0.1, 0.1, 0.05, 0.12, 0.06, 0.69));
    for (const s of [-1, 1]) {
      const w = new THREE.Group();
      w.position.set(s * 0.26, 0.2, 0);
      w.add(box(accent, 0.75, 0.04, 0.45, s * 0.38, 0, 0));
      body.add(w);
      rig.wings.push(w);
    }
    inner.add(body);
    rig.body = body;
    rig.head = body;
    rig.height = 1.4;
  } else {
    // slime
    main.transparent = true;
    main.opacity = 0.82;
    const body = new THREE.Group();
    body.add(box(main, 1.3, 0.95, 1.3, 0, 0.48, 0), box(glow, 0.45, 0.4, 0.45, 0, 0.5, 0));
    body.add(box(eye, 0.14, 0.16, 0.05, -0.22, 0.62, 0.66), box(eye, 0.14, 0.16, 0.05, 0.22, 0.62, 0.66));
    inner.add(body);
    rig.body = body;
    rig.head = body;
    rig.height = 1.1;
  }

  root.scale.setScalar(o.scale);
  rig.height *= o.scale;
  return rig;
}

export interface AnimState {
  t: number;
  /** 0 parado .. 1 andando */
  move: number;
  /** progresso do golpe 0..1, ou -1 */
  attack: number;
  /** 0..1 carregando um golpe (telegrafia) */
  windup: number;
  dead: number;
}

export function animateRig(rig: Rig, a: AnimState): void {
  const t = a.t + rig.phase;
  const inner = rig.inner;
  if (a.dead > 0) {
    const k = Math.min(1, a.dead);
    inner.rotation.x = -k * 1.45;
    inner.position.y = -k * 0.25;
    inner.scale.setScalar(1 - k * k * 0.5);
    return;
  }
  inner.rotation.x = 0;
  inner.scale.setScalar(1);
  const swing = Math.sin(t * 10) * 0.8 * a.move;
  if (rig.kind === "humanoid" || rig.kind === "brute") {
    inner.position.y = Math.abs(Math.sin(t * 10)) * 0.06 * a.move;
    rig.legL!.rotation.x = swing;
    rig.legR!.rotation.x = -swing;
    rig.armL!.rotation.x = -swing * 0.7;
    rig.armR!.rotation.x = swing * 0.7;
    rig.body.rotation.x = 0.08 * a.move + Math.sin(t * 2) * 0.015;
    rig.body.rotation.y = 0;
  } else if (rig.kind === "robed") {
    inner.position.y = 0.18 + Math.sin(t * 2.4) * 0.09;
    rig.body.rotation.x = 0.1 * a.move;
    rig.armL!.rotation.x = Math.sin(t * 2) * 0.1;
    rig.armR!.rotation.x = -0.5 + Math.sin(t * 2.2) * 0.08;
  } else if (rig.kind === "bug") {
    inner.position.y = Math.sin(t * 5) * 0.12;
    const flap = Math.sin(t * 38) * 0.7;
    rig.wings[0].rotation.z = flap;
    rig.wings[1].rotation.z = -flap;
    rig.body.rotation.x = 0.15 * a.move;
  } else {
    const s = Math.sin(t * (4 + 5 * a.move));
    rig.body.scale.set(1 + s * 0.08, 1 - s * 0.1, 1 + s * 0.08);
  }

  if (a.windup > 0) {
    const w = a.windup;
    if (rig.armR) {
      rig.armR.rotation.x = -2.4 * w;
      if (rig.armL && rig.kind === "brute") rig.armL.rotation.x = -2.4 * w;
    }
    rig.body.rotation.x -= 0.2 * w;
    if (rig.kind === "slime" || rig.kind === "bug") rig.body.scale.setScalar(1 + 0.2 * w);
  } else if (a.attack >= 0) {
    // golpe: braço desce rápido e volta
    const p = a.attack;
    const k = p < 0.35 ? p / 0.35 : 1 - (p - 0.35) / 0.65;
    if (rig.armR) {
      rig.armR.rotation.x = -2.2 + 3.3 * (p < 0.35 ? p / 0.35 : 1) * (p < 0.35 ? 1 : 1 - (p - 0.35) * 0.9);
      if (rig.armL && rig.kind === "brute") rig.armL.rotation.x = rig.armR.rotation.x;
    }
    rig.body.rotation.x += 0.22 * k;
    rig.body.rotation.y = -0.35 * k;
    if (rig.kind === "slime" || rig.kind === "bug") rig.body.scale.setScalar(1 + 0.15 * k);
  } else if (rig.kind === "bug" || rig.kind === "slime") {
    if (rig.kind === "bug") rig.body.scale.setScalar(1);
  }
}

const WHITE = new THREE.Color(0xffffff);

/** k = 1 branco total, 0 normal. */
export function flashRig(rig: Rig, k: number): void {
  for (let i = 0; i < rig.mats.length; i++) {
    rig.mats[i].emissive.copy(rig.baseEmissive[i]).lerp(WHITE, k * 0.85);
  }
}

export function tintRig(rig: Rig, color: number, k: number): void {
  const c = new THREE.Color(color);
  for (let i = 0; i < rig.mats.length; i++) {
    rig.mats[i].emissive.copy(rig.baseEmissive[i]).lerp(c, k);
  }
}

export function disposeRig(rig: Rig): void {
  rig.root.removeFromParent();
  for (const m of rig.mats) m.dispose();
}
