// Modelos do cenário gerados por código: árvores, pedras, túmulos, cristais...
// Cada tipo devolve geometrias já coloridas por vértice, separadas por material.
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Rng } from "../core/rng";
import type { DecorKind } from "../data/zones";

export type MatKind = "solid" | "foliage" | "rock" | "glow";
export interface DecorModel {
  parts: Partial<Record<MatKind, THREE.BufferGeometry>>;
}

const C = new THREE.Color();
const C2 = new THREE.Color();

/** deforma por ruído suave (mesmo deslocamento para vértices coincidentes) */
export function displace(geo: THREE.BufferGeometry, seed: number, amount: number, freq: number): THREE.BufferGeometry {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x * freq + seed) * Math.sin(y * freq * 1.3 + seed * 2.1) * Math.sin(z * freq * 0.9 + seed * 3.7)
      + 0.5 * Math.sin(x * freq * 2.3 + seed * 5.1) * Math.sin(z * freq * 2.1 + seed);
    const len = Math.hypot(x, y, z) || 1;
    const k = 1 + (n * amount) / len;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  return geo;
}

/** pinta por vértice com gradiente vertical entre duas cores (y0..y1), com leve variação */
export function paint(geo: THREE.BufferGeometry, bottom: number, top: number, y0: number, y1: number, jitter = 0, rng?: Rng): THREE.BufferGeometry {
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  C.set(bottom);
  C2.set(top);
  const tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const t = Math.max(0, Math.min(1, (p.getY(i) - y0) / (y1 - y0 || 1)));
    tmp.copy(C).lerp(C2, t);
    if (jitter && rng) tmp.multiplyScalar(1 + (rng.next() - 0.5) * jitter);
    col[i * 3] = tmp.r;
    col[i * 3 + 1] = tmp.g;
    col[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return geo;
}

/** pinta o topo (normal para cima) com outra cor: musgo, neve, cinza */
export function paintTop(geo: THREE.BufferGeometry, top: number, from = 0.45): THREE.BufferGeometry {
  const n = geo.attributes.normal;
  const col = geo.attributes.color;
  C.set(top);
  for (let i = 0; i < n.count; i++) {
    const k = Math.max(0, Math.min(1, (n.getY(i) - from) / 0.3));
    if (k <= 0) continue;
    col.setXYZ(i, col.getX(i) + (C.r - col.getX(i)) * k, col.getY(i) + (C.g - col.getY(i)) * k, col.getZ(i) + (C.b - col.getZ(i)) * k);
  }
  return geo;
}

export function prep(geo: THREE.BufferGeometry, smooth: boolean): THREE.BufferGeometry {
  geo.deleteAttribute("uv");
  let g = geo;
  if (smooth) {
    g = mergeVertices(g, 1e-3);
    g.computeVertexNormals();
  }
  g = g.index ? g.toNonIndexed() : g;
  if (!smooth) g.computeVertexNormals();
  return g;
}

export function xf(geo: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx): THREE.BufferGeometry {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  );
  return geo.applyMatrix4(m);
}

export function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(list, false)!;
  for (const l of list) l.dispose();
  return g;
}

function blob(rng: Rng, r: number, bottom: number, top: number, squash = 0.82): THREE.BufferGeometry {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(r, 1);
  g = prep(displace(g, rng.range(0, 50), r * 0.2, 2.4 / r), true);
  g.scale(1, squash, 1);
  return paint(g, bottom, top, -r * 0.7, r * 0.7, 0.06, rng);
}

function trunk(rng: Rng, h: number, r0: number, r1: number, color: number, lean = 0.08): THREE.BufferGeometry {
  let g: THREE.BufferGeometry = new THREE.CylinderGeometry(r1, r0, h, 7, 3);
  g.translate(0, h / 2, 0);
  const p = g.attributes.position;
  const bx = rng.range(-lean, lean), bz = rng.range(-lean, lean);
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / h;
    // raiz mais larga e leve curvatura
    const flare = 1 + Math.max(0, 0.25 - t) * 1.6;
    p.setXYZ(i, p.getX(i) * flare + bx * t * t * h, p.getY(i), p.getZ(i) * flare + bz * t * t * h);
  }
  g = prep(g, true);
  return paint(g, new THREE.Color(color).multiplyScalar(0.7).getHex(), color, 0, h, 0.1, rng);
}

function rockGeo(rng: Rng, r: number, base: number, top: number): THREE.BufferGeometry {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(r, 1);
  displace(g, rng.range(0, 50), r * 0.32, 1.7 / r);
  g.scale(rng.range(0.9, 1.25), rng.range(0.6, 0.85), rng.range(0.85, 1.15));
  g = prep(g, false);
  paint(g, new THREE.Color(base).multiplyScalar(0.72).getHex(), base, -r * 0.5, r * 0.6, 0.12, rng);
  return paintTop(g, top);
}

export interface FloraPalette {
  glow: number;
  rockTop: number;
}

/** `variant` muda a semente: mesma espécie, silhueta diferente. */
export function buildDecor(kind: DecorKind, variant: number, pal: FloraPalette): DecorModel {
  const rng = new Rng(1000 + variant * 7919 + kind.length * 31 + kind.charCodeAt(0) * 131);
  switch (kind) {
    case "tree": {
      const h = rng.range(1.9, 2.5);
      const solid = [trunk(rng, h, 0.3, 0.16, 0x6b4a2e)];
      // um galho
      const br = trunk(rng, 0.9, 0.09, 0.05, 0x6b4a2e, 0);
      solid.push(xf(br, 0, h * 0.62, 0, 0, rng.range(0, 6), rng.range(0.7, 1.0)));
      const fol: THREE.BufferGeometry[] = [];
      const greens: [number, number][] = [[0x2f6f2e, 0x6fbf4a], [0x35782f, 0x86cf55], [0x2a6433, 0x5fae4a]];
      const n = rng.int(5, 7);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rng.range(-0.3, 0.3);
        const d = i === 0 ? 0 : rng.range(0.55, 0.95);
        const [lo, hi] = rng.pick(greens);
        fol.push(xf(blob(rng, rng.range(0.75, 1.1), lo, hi), Math.cos(a) * d, h + rng.range(0.3, 1.1) + (i === 0 ? 0.7 : 0), Math.sin(a) * d));
      }
      return { parts: { solid: merge(solid), foliage: merge(fol) } };
    }
    case "pine": {
      const h = rng.range(1.0, 1.4);
      const solid = [trunk(rng, h + 1.2, 0.24, 0.1, 0x5a3f28, 0.04)];
      const fol: THREE.BufferGeometry[] = [];
      const tiers = 4;
      for (let i = 0; i < tiers; i++) {
        const t = i / (tiers - 1);
        const r = 1.35 - t * 0.85;
        let g: THREE.BufferGeometry = new THREE.ConeGeometry(r, 1.5 - t * 0.3, 9, 2);
        g = prep(displace(g, rng.range(0, 30), 0.12, 2.6), true);
        paint(g, 0x1f4f30, 0x4f9a52, -0.7, 0.7, 0.08, rng);
        fol.push(xf(g, 0, h + 0.6 + i * 0.78, 0, 0, rng.range(0, 3)));
      }
      return { parts: { solid: merge(solid), foliage: merge(fol) } };
    }
    case "deadTree": {
      const h = rng.range(2.2, 3.0);
      const solid = [trunk(rng, h, 0.26, 0.07, 0x4f463f, 0.16)];
      for (let i = 0; i < 4; i++) {
        const b = trunk(rng, rng.range(0.6, 1.2), 0.07, 0.025, 0x4f463f, 0.1);
        solid.push(xf(b, 0, h * rng.range(0.45, 0.9), 0, 0, rng.range(0, 6.28), rng.range(0.6, 1.2)));
      }
      return { parts: { solid: merge(solid) } };
    }
    case "rock": {
      const list = [xf(rockGeo(rng, 1.0, 0x8a8d96, pal.rockTop), 0, 0.42, 0)];
      if (rng.chance(0.75)) list.push(xf(rockGeo(rng, 0.5, 0x7c7f88, pal.rockTop), rng.range(0.6, 0.9), 0.2, rng.range(-0.5, 0.5)));
      if (rng.chance(0.5)) list.push(xf(rockGeo(rng, 0.32, 0x7c7f88, pal.rockTop), rng.range(-0.9, -0.6), 0.13, rng.range(-0.4, 0.6)));
      return { parts: { rock: merge(list) } };
    }
    case "bush": {
      const fol: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 3; i++) fol.push(xf(blob(rng, rng.range(0.4, 0.6), 0x2a6a2c, 0x74c24e, 0.75), rng.range(-0.35, 0.35), rng.range(0.3, 0.45), rng.range(-0.35, 0.35)));
      // frutinhas
      const solid: THREE.BufferGeometry[] = [];
      if (variant % 2 === 0) {
        for (let i = 0; i < 5; i++) {
          const b = prep(new THREE.IcosahedronGeometry(0.06, 0), false);
          paint(b, 0xc8281e, 0xff5a4a, -0.06, 0.06);
          const a = rng.range(0, 6.28);
          solid.push(xf(b, Math.cos(a) * 0.45, rng.range(0.4, 0.7), Math.sin(a) * 0.45));
        }
      }
      return { parts: { foliage: merge(fol), ...(solid.length ? { solid: merge(solid) } : {}) } };
    }
    case "mushroom": {
      const solid: THREE.BufferGeometry[] = [];
      const n = rng.int(1, 3);
      for (let i = 0; i < n; i++) {
        const s = rng.range(0.6, 1.1);
        const x = rng.range(-0.25, 0.25) * i, z = rng.range(-0.25, 0.25) * i;
        const stem = prep(new THREE.CylinderGeometry(0.05 * s, 0.075 * s, 0.34 * s, 7), true);
        paint(stem, 0xd9cfbe, 0xf2ead8, -0.2, 0.2);
        solid.push(xf(stem, x, 0.17 * s, z));
        const cap = prep(new THREE.SphereGeometry(0.24 * s, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), true);
        paint(cap, 0xa82a22, 0xe8483a, 0, 0.24 * s, 0.1, rng);
        solid.push(xf(cap, x, 0.32 * s, z, 0, 0, 0, 1, 0.75, 1));
      }
      return { parts: { solid: merge(solid) } };
    }
    case "tomb": {
      const list: THREE.BufferGeometry[] = [];
      const stone = rng.pick([0x8a8f9a, 0x7d838f, 0x959aa3]);
      if (variant % 3 === 2) {
        // cruz
        list.push(xf(paint(prep(new THREE.BoxGeometry(0.2, 1.3, 0.16), false), 0x666b75, stone, -0.65, 0.65, 0.1, rng), 0, 0.65, 0));
        list.push(xf(paint(prep(new THREE.BoxGeometry(0.72, 0.18, 0.16), false), 0x666b75, stone, -0.1, 0.1, 0.1, rng), 0, 0.92, 0));
      } else {
        const slab = prep(new THREE.BoxGeometry(0.78, 0.8, 0.2, 2, 2, 1), false);
        list.push(xf(paint(slab, 0x666b75, stone, -0.4, 0.4, 0.1, rng), 0, 0.4, 0));
        const arch = prep(new THREE.CylinderGeometry(0.39, 0.39, 0.2, 10, 1, false, 0, Math.PI), false);
        list.push(xf(paint(arch, stone, stone, 0, 1, 0.1, rng), 0, 0.8, 0, Math.PI / 2, Math.PI / 2, 0));
      }
      list.push(xf(paint(prep(new THREE.BoxGeometry(1.0, 0.14, 0.5), false), 0x5a5f69, 0x767b85, -0.07, 0.07, 0.08, rng), 0, 0.07, 0));
      const g = merge(list);
      xf(g, 0, 0, 0, rng.range(-0.08, 0.05), 0, rng.range(-0.1, 0.1));
      paintTop(g, pal.rockTop, 0.7);
      return { parts: { rock: g } };
    }
    case "pillar": {
      const broken = variant % 3 !== 0;
      const h = broken ? rng.range(1.2, 2.4) : 3.4;
      const list: THREE.BufferGeometry[] = [];
      const shaft = prep(new THREE.CylinderGeometry(0.42, 0.48, h, 10, 3), false);
      list.push(xf(paint(shaft, 0x77747f, 0xa3a0ac, -h / 2, h / 2, 0.1, rng), 0, h / 2 + 0.25, 0));
      list.push(xf(paint(prep(new THREE.BoxGeometry(1.25, 0.25, 1.25), false), 0x6c6a75, 0x8d8a96, -0.12, 0.12, 0.08, rng), 0, 0.125, 0));
      if (!broken) list.push(xf(paint(prep(new THREE.BoxGeometry(1.2, 0.26, 1.2), false), 0x8d8a96, 0xb0adb8, -0.13, 0.13, 0.08, rng), 0, h + 0.38, 0));
      else {
        // pedaço caído
        const chunk = prep(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 10), false);
        list.push(xf(paint(chunk, 0x77747f, 0x9d9aa6, -0.45, 0.45, 0.1, rng), rng.range(0.9, 1.3), 0.4, rng.range(-0.5, 0.5), Math.PI / 2, rng.range(0, 3), 0));
      }
      const g = merge(list);
      paintTop(g, pal.rockTop, 0.75);
      return { parts: { rock: g } };
    }
    case "crystal": {
      const glow: THREE.BufferGeometry[] = [];
      const n = rng.int(3, 5);
      for (let i = 0; i < n; i++) {
        const hgt = i === 0 ? rng.range(1.6, 2.4) : rng.range(0.6, 1.3);
        const r = hgt * 0.16;
        const body = new THREE.CylinderGeometry(r, r * 0.8, hgt, 6);
        const tip = new THREE.ConeGeometry(r, r * 2.2, 6);
        tip.translate(0, hgt / 2 + r * 1.1, 0);
        const g = prep(mergeGeometries([body, tip], false)!, false);
        paint(g, new THREE.Color(pal.glow).multiplyScalar(0.35).getHex(), pal.glow, -hgt / 2, hgt / 2 + r);
        const a = rng.range(0, 6.28);
        const d = i === 0 ? 0 : rng.range(0.3, 0.6);
        glow.push(xf(g, Math.cos(a) * d, hgt / 2 - 0.05, Math.sin(a) * d, i === 0 ? 0 : rng.range(-0.5, 0.5), a, i === 0 ? 0 : rng.range(-0.5, 0.5)));
      }
      return { parts: { glow: merge(glow), rock: xf(rockGeo(rng, 0.75, 0x4a3f66, pal.rockTop), 0, 0.12, 0, 0, 0, 0, 1, 0.45, 1) } };
    }
    case "lavaRock": {
      const rock = xf(rockGeo(rng, 1.15, 0x3a2e2c, pal.rockTop), 0, 0.5, 0);
      // veios de lava: lascas incandescentes saindo da pedra
      const glow: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 5; i++) {
        const s = prep(new THREE.OctahedronGeometry(rng.range(0.16, 0.3), 0), false);
        paint(s, 0xff3a0a, 0xffc84a, -0.3, 0.3);
        const a = rng.range(0, 6.28);
        glow.push(xf(s, Math.cos(a) * rng.range(0.5, 0.9), rng.range(0.25, 0.9), Math.sin(a) * rng.range(0.5, 0.9), rng.range(0, 3), rng.range(0, 3), 0, 1, 0.5, 1.6));
      }
      return { parts: { rock, glow: merge(glow) } };
    }
  }
}

/** flor pequena: caule e miolo (sólido). A cor das pétalas vem por instância. */
export function buildFlower(): { stem: THREE.BufferGeometry; petals: THREE.BufferGeometry } {
  const stem = prep(new THREE.CylinderGeometry(0.015, 0.02, 0.36, 4), false);
  stem.translate(0, 0.18, 0);
  paint(stem, 0x2f6b2c, 0x5fae4a, 0, 0.36);
  const petals: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const p = prep(new THREE.SphereGeometry(0.07, 5, 4), true);
    p.scale(1, 0.35, 0.6);
    paint(p, 0xffffff, 0xffffff, 0, 1);
    const a = (i / 5) * Math.PI * 2;
    petals.push(xf(p, Math.cos(a) * 0.075, 0.38, Math.sin(a) * 0.075, 0, -a, 0.35));
  }
  const core = prep(new THREE.SphereGeometry(0.04, 5, 4), true);
  paint(core, 0x8a5a10, 0x8a5a10, 0, 1);
  petals.push(xf(core, 0, 0.39, 0));
  return { stem, petals: merge(petals) };
}
