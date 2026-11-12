// Constrói o cenário 3D de uma zona a partir do layout gerado em core/worldgen.
import * as THREE from "three";
import { Rng, fbm, makeNoise2D } from "../core/rng";
import { distToPath, type Obstacle, type ZoneLayout } from "../core/worldgen";
import type { DecorKind, ZoneDef } from "../data/zones";

interface Part {
  geo: THREE.BufferGeometry;
  color: number;
  /** posição e escala locais */
  p: [number, number, number];
  s: [number, number, number];
  ry?: number;
  rz?: number;
  glow?: boolean;
  tint?: number; // variação aleatória de cor
}

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cone4: new THREE.ConeGeometry(1, 1, 4),
  rock: new THREE.DodecahedronGeometry(1, 0),
  crystal: new THREE.OctahedronGeometry(1, 0),
};

function partsFor(kind: DecorKind, glow: number): Part[] {
  switch (kind) {
    case "tree":
      return [
        { geo: G.box, color: 0x6b4a2e, p: [0, 0.9, 0], s: [0.4, 1.8, 0.4] },
        { geo: G.box, color: 0x3f8f3a, p: [0, 2.2, 0], s: [2.0, 1.1, 2.0], tint: 0.18 },
        { geo: G.box, color: 0x4aa544, p: [0.1, 3.0, -0.1], s: [1.4, 0.9, 1.4], tint: 0.18 },
        { geo: G.box, color: 0x57b84e, p: [0, 3.65, 0], s: [0.8, 0.6, 0.8], tint: 0.18 },
      ];
    case "pine":
      return [
        { geo: G.box, color: 0x5a3f28, p: [0, 0.6, 0], s: [0.32, 1.2, 0.32] },
        { geo: G.cone4, color: 0x2f6b3a, p: [0, 1.7, 0], s: [1.3, 1.6, 1.3], tint: 0.15 },
        { geo: G.cone4, color: 0x377a42, p: [0, 2.6, 0], s: [1.0, 1.4, 1.0], tint: 0.15 },
        { geo: G.cone4, color: 0x41894b, p: [0, 3.4, 0], s: [0.65, 1.2, 0.65], tint: 0.15 },
      ];
    case "deadTree":
      return [
        { geo: G.box, color: 0x4a4038, p: [0, 1.2, 0], s: [0.3, 2.4, 0.3], tint: 0.1 },
        { geo: G.box, color: 0x4a4038, p: [0.45, 1.9, 0], s: [0.9, 0.16, 0.16], rz: 0.5 },
        { geo: G.box, color: 0x4a4038, p: [-0.4, 1.5, 0.1], s: [0.8, 0.14, 0.14], rz: -0.6 },
      ];
    case "rock":
      return [
        { geo: G.rock, color: 0x7d8088, p: [0, 0.45, 0], s: [1.0, 0.75, 0.9], tint: 0.12 },
        { geo: G.rock, color: 0x6c6f78, p: [0.6, 0.25, 0.4], s: [0.5, 0.4, 0.5], tint: 0.12 },
      ];
    case "bush":
      return [
        { geo: G.box, color: 0x3d8a3a, p: [0, 0.35, 0], s: [1.0, 0.7, 1.0], tint: 0.2 },
        { geo: G.box, color: 0x4a9d44, p: [0.3, 0.7, 0.1], s: [0.55, 0.45, 0.55], tint: 0.2 },
      ];
    case "tomb":
      return [
        { geo: G.box, color: 0x8a8f9a, p: [0, 0.55, 0], s: [0.8, 1.1, 0.22], tint: 0.1 },
        { geo: G.box, color: 0x6f7480, p: [0, 0.08, 0.3], s: [0.9, 0.16, 1.0] },
        { geo: G.box, color: glow, p: [0, 0.75, 0.12], s: [0.12, 0.3, 0.02], glow: true },
      ];
    case "pillar":
      return [
        { geo: G.box, color: 0x8d8a96, p: [0, 1.5, 0], s: [0.9, 3.0, 0.9], tint: 0.08 },
        { geo: G.box, color: 0x9d9aa6, p: [0, 3.1, 0], s: [1.2, 0.25, 1.2] },
        { geo: G.box, color: 0x77747f, p: [0, 0.12, 0], s: [1.25, 0.25, 1.25] },
      ];
    case "crystal":
      return [
        { geo: G.crystal, color: glow, p: [0, 1.1, 0], s: [0.55, 1.5, 0.55], glow: true },
        { geo: G.crystal, color: glow, p: [0.5, 0.5, 0.2], s: [0.3, 0.8, 0.3], rz: -0.4, glow: true },
        { geo: G.rock, color: 0x3a3050, p: [0, 0.15, 0], s: [0.9, 0.3, 0.9] },
      ];
    case "lavaRock":
      return [
        { geo: G.rock, color: 0x2e2422, p: [0, 0.55, 0], s: [1.2, 0.9, 1.1], tint: 0.1 },
        { geo: G.box, color: glow, p: [0, 0.6, 0], s: [0.7, 0.75, 0.7], ry: 0.6, glow: true },
      ];
    case "mushroom":
      return [
        { geo: G.box, color: 0xe8e0d0, p: [0, 0.2, 0], s: [0.14, 0.4, 0.14] },
        { geo: G.box, color: 0xd9443a, p: [0, 0.45, 0], s: [0.45, 0.16, 0.45], tint: 0.2 },
      ];
  }
}

export interface WorldView {
  group: THREE.Group;
  portal: THREE.Group;
  dispose(): void;
}

export function buildWorld(scene: THREE.Scene, zone: ZoneDef, layout: ZoneLayout): WorldView {
  const group = new THREE.Group();
  scene.add(group);
  const disposables: { dispose(): void }[] = [];
  const glow = zone.glowDecor ?? 0xffe9a8;
  const rng = Rng.of(layout.seed, "visual");
  const noise = makeNoise2D(layout.seed);

  // chão com cores por vértice
  const extent = layout.size + 90;
  const seg = 170;
  const geo = new THREE.PlaneGeometry(extent, extent, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c0 = new THREE.Color(zone.ground[0]);
  const c1 = new THREE.Color(zone.ground[1]);
  const c2 = new THREE.Color(zone.ground[2]);
  const cPath = new THREE.Color(zone.path);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const n = fbm(noise, x * 0.045, z * 0.045, 3);
    const n2 = noise(x * 0.4 + 31, z * 0.4 + 17);
    c.copy(c0).lerp(n > 0.5 ? c1 : c2, Math.min(1, Math.abs(n - 0.5) * 3.2));
    c.multiplyScalar(0.93 + n2 * 0.14);
    const dp = distToPath(x, z, layout.path) + (n2 - 0.5) * 1.6;
    if (dp < 3.4) c.lerp(cPath, Math.min(1, (3.4 - dp) / 1.4) * 0.85);
    const db = Math.hypot(x - layout.boss.x, z - layout.boss.z);
    if (db < layout.bossRadius) c.lerp(cPath, 0.55).multiplyScalar(0.8);
    const ds = Math.hypot(x - layout.spawn.x, z - layout.spawn.z);
    if (ds < 7) c.lerp(cPath, 0.7);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  const ground = new THREE.Mesh(geo, groundMat);
  ground.receiveShadow = true;
  group.add(ground);
  disposables.push(geo, groundMat);

  // decoração instanciada, uma InstancedMesh por parte de cada tipo
  const byKind = new Map<DecorKind, Obstacle[]>();
  for (const o of layout.obstacles) {
    let list = byKind.get(o.kind);
    if (!list) byKind.set(o.kind, (list = []));
    list.push(o);
  }
  // anel de pilares na arena do chefe (visual)
  const arena: Obstacle[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.5) continue; // entrada ao sul
    arena.push({ x: layout.boss.x + Math.cos(a) * (layout.bossRadius + 0.6), z: layout.boss.z + Math.sin(a) * (layout.bossRadius + 0.6),
      r: 0.7, kind: "pillar", scale: 1.1, rot: a, solid: false });
  }
  byKind.set("pillar", [...(byKind.get("pillar") ?? []), ...arena]);

  const inst = new THREE.Object3D();
  const local = new THREE.Object3D();
  const m4 = new THREE.Matrix4();
  const col = new THREE.Color();
  for (const [kind, list] of byKind) {
    for (const part of partsFor(kind, glow)) {
      const mat = part.glow
        ? new THREE.MeshStandardMaterial({ color: part.color, emissive: part.color, emissiveIntensity: 0.75, roughness: 0.4, flatShading: true })
        : new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
      const mesh = new THREE.InstancedMesh(part.geo, mat, list.length);
      mesh.castShadow = !part.glow && kind !== "bush" && kind !== "mushroom";
      mesh.receiveShadow = true;
      local.position.set(...part.p);
      local.scale.set(...part.s);
      local.rotation.set(0, part.ry ?? (part.geo === G.cone4 ? Math.PI / 4 : 0), part.rz ?? 0);
      local.updateMatrix();
      for (let i = 0; i < list.length; i++) {
        const o = list[i];
        inst.position.set(o.x, 0, o.z);
        inst.rotation.set(0, o.rot, 0);
        inst.scale.setScalar(o.scale);
        inst.updateMatrix();
        m4.multiplyMatrices(inst.matrix, local.matrix);
        mesh.setMatrixAt(i, m4);
        col.set(part.color);
        if (part.tint) col.offsetHSL((rng.next() - 0.5) * 0.04, 0, (rng.next() - 0.5) * part.tint);
        mesh.setColorAt(i, col);
      }
      mesh.instanceMatrix.needsUpdate = true;
      group.add(mesh);
      disposables.push(mat, mesh);
    }
  }

  // tufos de grama/pedrinhas (só visual)
  const tuftCount = 7000;
  const tuftMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
  const tufts = new THREE.InstancedMesh(G.box, tuftMat, tuftCount);
  tufts.receiveShadow = true;
  const half = layout.size / 2 + 20;
  for (let i = 0; i < tuftCount; i++) {
    const x = rng.range(-half, half);
    const z = rng.range(-half, half);
    const h = rng.range(0.08, 0.26);
    inst.position.set(x, h / 2, z);
    inst.rotation.set(0, rng.range(0, 3.14), 0);
    inst.scale.set(rng.range(0.06, 0.16), h, rng.range(0.06, 0.16));
    inst.updateMatrix();
    tufts.setMatrixAt(i, inst.matrix);
    col.set(zone.ground[1]).offsetHSL(0, 0, rng.range(0.01, 0.07));
    tufts.setColorAt(i, col);
  }
  group.add(tufts);
  disposables.push(tuftMat, tufts);

  // fogueira no ponto inicial
  const fireMat = new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xff7a1a, emissiveIntensity: 2.5 });
  const fire = new THREE.Mesh(G.crystal, fireMat);
  fire.scale.set(0.45, 0.9, 0.45);
  fire.position.set(layout.spawn.x + 2.5, 0.7, layout.spawn.z + 1.5);
  const fireLight = new THREE.PointLight(0xff8a3a, 30, 16, 1.6);
  fireLight.position.copy(fire.position).setY(1.6);
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6f7480, flatShading: true });
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Mesh(G.rock, stoneMat);
    const a = (i / 7) * Math.PI * 2;
    s.scale.setScalar(0.28);
    s.position.set(fire.position.x + Math.cos(a) * 0.8, 0.15, fire.position.z + Math.sin(a) * 0.8);
    group.add(s);
  }
  group.add(fire, fireLight);
  disposables.push(fireMat, stoneMat);

  // portal (escondido até o chefe cair)
  const portal = new THREE.Group();
  const portalMat = new THREE.MeshStandardMaterial({ color: 0x9be4ff, emissive: 0x4ab8ff, emissiveIntensity: 2.4, flatShading: true });
  const torusGeo = new THREE.TorusGeometry(1.6, 0.22, 6, 20);
  const torus = new THREE.Mesh(torusGeo, portalMat);
  torus.position.y = 2.0;
  const discMat = new THREE.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, toneMapped: false });
  const discGeo = new THREE.CircleGeometry(1.45, 24);
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.position.y = 2.0;
  const pl = new THREE.PointLight(0x6fc8ff, 40, 18, 1.5);
  pl.position.y = 2.2;
  portal.add(torus, disc, pl);
  portal.position.set(layout.boss.x, 0, layout.boss.z);
  portal.visible = false;
  group.add(portal);
  disposables.push(portalMat, torusGeo, discMat, discGeo);

  return {
    group,
    portal,
    dispose() {
      scene.remove(group);
      for (const d of disposables) d.dispose();
    },
  };
}
