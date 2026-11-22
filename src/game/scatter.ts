// Miudezas do chão: milhares de peças pequenas (seixos, folhas caídas, tufos, gravetos, samambaias, lascas de cristal) instanciadas
// em blocos grandes (poucos draw calls, ainda com culling) e agrupadas em manchas, para nenhum pedaço da câmera do jogo ficar liso.
import * as THREE from "three";
import { Rng } from "../core/rng";
import { distToTrails, ObstacleGrid, type ZoneLayout } from "../core/worldgen";
import type { ScatterKind, ZoneDef } from "../data/zones";
import { patchMaterial } from "./shared";

const CELL = 60;
/** peças que nascem embaixo de árvore (folha, samambaia, graveto); as outras se espalham em manchas pelo mapa */
const UNDER_TREES: ReadonlySet<ScatterKind> = new Set(["leaf", "fern", "twig"]);
/** peças que não crescem na terra batida (caminho, arena, acampamentos) */
const NO_DIRT: ReadonlySet<ScatterKind> = new Set(["tuft", "fern"]);
/** peças que também se espalham na terra batida: trilha, clareiras e arena */
const ON_DIRT: ReadonlySet<ScatterKind> = new Set(["pebble", "leaf", "twig", "shard"]);
/** escala sorteada por tipo: seixos e lascas em três tamanhos bem diferentes */
const SCALE: Record<ScatterKind, [number, number]> = { pebble: [0.5, 2.3], leaf: [0.9, 1.5], tuft: [0.9, 1.7], twig: [1, 1.6], fern: [0.9, 1.6], shard: [0.5, 1.8] };
const TREE_KINDS = new Set(["tree", "pine", "deadTree", "crystal"]);

/** cor por vértice de baixo (escuro) para cima (claro): a cor de cada peça vem da instância */
function shade(geo: THREE.BufferGeometry, y0: number, y1: number, dark = 0.55): THREE.BufferGeometry {
  const pos = geo.attributes.position;
  const c = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) - y0) / Math.max(1e-4, y1 - y0)));
    c.fill(dark + (1 - dark) * t, i * 3, i * 3 + 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(c, 3));
  return geo;
}

/** lâmina fina (dois triângulos de cada lado) de largura `w` e altura `h`, inclinada `lean` para fora */
function blade(w: number, h: number, lean: number, ang: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const tip = [Math.sin(lean) * h, Math.cos(lean) * h, 0];
  const v = [-w / 2, 0, 0, w / 2, 0, 0, tip[0], tip[1], tip[2]];
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([...v, v[3], v[4], v[5], v[0], v[1], v[2], v[6], v[7], v[8]]), 3));
  g.rotateY(ang);
  return g;
}

function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const parts = list.map((g) => (g.index ? g.toNonIndexed() : g));
  const total = parts.reduce((n, g) => n + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3);
  let o = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array as Float32Array, o);
    o += g.attributes.position.count * 3;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.computeVertexNormals();
  return out;
}

function buildPiece(kind: ScatterKind): THREE.BufferGeometry {
  const rng = new Rng(4242 + kind.length * 97 + kind.charCodeAt(0));
  switch (kind) {
    case "pebble": {
      const g = new THREE.IcosahedronGeometry(0.13, 0).toNonIndexed();
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (1 + rng.range(-0.15, 0.15)), Math.max(-0.02, p.getY(i) * 0.5), p.getZ(i) * 0.8);
      g.computeVertexNormals();
      // topo claro: lê como pedra de cima, não como mancha
      return shade(g, -0.02, 0.06, 0.45);
    }
    case "leaf": {
      // folha deitada, um pouco curvada, as duas faces
      const v = [0, 0.02, -0.11, 0.06, 0.035, 0, 0, 0.02, 0.11, -0.06, 0.035, 0];
      const tri = [0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2];
      const pos = new Float32Array(tri.length * 3);
      tri.forEach((k, i) => pos.set(v.slice(k * 3, k * 3 + 3), i * 3));
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.computeVertexNormals();
      return shade(g, 0, 0.04, 0.8);
    }
    case "tuft": {
      const list: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 7; i++) list.push(blade(0.05, rng.range(0.38, 0.62), rng.range(0.15, 0.45), (i / 7) * Math.PI * 2 + rng.range(-0.3, 0.3)));
      return shade(merge(list), 0, 0.55, 0.45);
    }
    case "twig": {
      const a = new THREE.BoxGeometry(0.42, 0.03, 0.03).translate(0.1, 0.02, 0);
      const b = new THREE.BoxGeometry(0.18, 0.022, 0.022).translate(0.09, 0.02, 0).rotateY(0.7).translate(0.12, 0, 0);
      return shade(merge([a, b]), 0, 0.04, 0.75);
    }
    case "fern": {
      // folhas arqueadas saindo do centro, cada uma uma tira de três gomos que afina
      const list: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * Math.PI * 2 + rng.range(-0.25, 0.25), len = rng.range(0.42, 0.62);
        const pts: number[] = [];
        for (let s = 0; s < 3; s++) {
          const t0 = s / 3, t1 = (s + 1) / 3;
          const y = (t: number) => Math.sin(t * Math.PI * 0.8) * len * 0.55;
          const w = (t: number) => 0.07 * (1 - t);
          pts.push(t0 * len, y(t0), -w(t0), t1 * len, y(t1), -w(t1), t0 * len, y(t0), w(t0));
          pts.push(t0 * len, y(t0), w(t0), t1 * len, y(t1), -w(t1), t1 * len, y(t1), w(t1));
        }
        const both = [...pts];
        for (let k = 0; k < pts.length; k += 9) both.push(pts[k], pts[k + 1], pts[k + 2], pts[k + 6], pts[k + 7], pts[k + 8], pts[k + 3], pts[k + 4], pts[k + 5]);
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(both), 3));
        g.rotateY(ang);
        list.push(g);
      }
      return shade(merge(list), 0, 0.3, 0.5);
    }
    case "shard": {
      const g = new THREE.ConeGeometry(0.045, 0.22, 4).translate(0, 0.09, 0).rotateZ(0.25).toNonIndexed();
      g.computeVertexNormals();
      return shade(g, 0, 0.2, 0.7);
    }
  }
}

/** Monta as miudezas da zona e devolve as malhas (já com material) para o grupo do mundo. */
export function buildScatter(zone: ZoneDef, layout: ZoneLayout, glow: number): { meshes: THREE.InstancedMesh[]; disposables: { dispose(): void }[] } {
  const rng = Rng.of(layout.seed, "scatter");
  const half = layout.size / 2 - 4;
  const area = layout.size * layout.size;
  const trees = layout.obstacles.filter((o) => TREE_KINDS.has(o.kind));
  const dirt = (x: number, z: number) => distToTrails(x, z, layout) < 3.4 || Math.hypot(x - layout.boss.x, z - layout.boss.z) < layout.bossRadius
    || Math.hypot(x - layout.spawn.x, z - layout.spawn.z) < 7 || layout.segments.some((c) => Math.hypot(x - c.x, z - c.z) < c.r * 0.5);
  const grid = new ObstacleGrid(layout.obstacles);
  const inSolid = (x: number, z: number) => grid.hits(x, z, 0.05);

  const mat = patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }), { wind: 0.22, windFrom: 0.05 });
  const glowMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, emissive: glow, emissiveIntensity: 1.1, flatShading: true });
  const disposables: { dispose(): void }[] = [mat, glowMat];
  const meshes: THREE.InstancedMesh[] = [];
  const inst = new THREE.Object3D();
  const col = new THREE.Color();

  for (const [kind, density, colors] of zone.scatter) {
    const n = Math.round((density * area) / 100);
    if (n <= 0) continue;
    const geo = buildPiece(kind);
    disposables.push(geo);
    // manchas: centros sorteados (embaixo de árvore para folha, samambaia e graveto), peças em volta com queda gaussiana
    const centers = Array.from({ length: Math.max(8, Math.round(n / 14)) }, () => {
      // terra batida: algumas manchas na arena e outras ao longo da trilha (mais nas bordas dela), para não ficar lisa
      if (ON_DIRT.has(kind)) {
        const roll = rng.next();
        if (roll < 0.06) {
          const a = rng.range(0, Math.PI * 2), d = Math.sqrt(rng.next()) * layout.bossRadius * 0.9;
          return { x: layout.boss.x + Math.cos(a) * d, z: layout.boss.z + Math.sin(a) * d, r: 2.4 };
        }
        if (roll < 0.2 && layout.path.length > 1) {
          const k = rng.int(0, layout.path.length - 2), t = rng.next(), side = rng.range(-1, 1);
          const p0 = layout.path[k], p1 = layout.path[k + 1];
          const dx = p1.x - p0.x, dz = p1.z - p0.z, len = Math.hypot(dx, dz) || 1;
          return { x: p0.x + dx * t - (dz / len) * side * 2.6, z: p0.z + dz * t + (dx / len) * side * 2.6, r: 1.8 };
        }
      }
      if (UNDER_TREES.has(kind) && trees.length) {
        const t = rng.pick(trees);
        return { x: t.x, z: t.z, r: 2.6 };
      }
      return { x: rng.range(-half, half), z: rng.range(-half, half), r: 3.5 };
    });
    const buckets = new Map<string, { m: THREE.Matrix4; c: THREE.Color }[]>();
    for (let i = 0; i < n; i++) {
      const c = centers[i % centers.length];
      const a = rng.range(0, Math.PI * 2), d = c.r * Math.sqrt(-2 * Math.log(Math.max(1e-4, rng.next()))) * 0.6;
      const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
      if (Math.abs(x) > half || Math.abs(z) > half) continue;
      if (NO_DIRT.has(kind) && dirt(x, z)) continue;
      if (inSolid(x, z)) continue;
      inst.position.set(x, 0, z);
      const tilt = kind === "shard" ? 0.5 : 0;
      inst.rotation.set(rng.range(-tilt, tilt), rng.range(0, Math.PI * 2), rng.range(-tilt, tilt));
      inst.scale.setScalar(rng.range(SCALE[kind][0], SCALE[kind][1]));
      inst.updateMatrix();
      const key = `${Math.floor(x / CELL)}:${Math.floor(z / CELL)}`;
      let b = buckets.get(key);
      if (!b) buckets.set(key, (b = []));
      b.push({ m: inst.matrix.clone(), c: col.set(rng.pick(colors)).multiplyScalar(rng.range(0.85, 1.12)).clone() });
    }
    for (const list of buckets.values()) {
      const mesh = new THREE.InstancedMesh(geo, kind === "shard" ? glowMat : mat, list.length);
      list.forEach((p, i) => {
        mesh.setMatrixAt(i, p.m);
        mesh.setColorAt(i, p.c);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      meshes.push(mesh);
      disposables.push(mesh);
    }
  }
  return { meshes, disposables };
}
