// Constrói o cenário 3D de uma zona a partir do layout gerado em core/worldgen:
// chão com shader procedural, grama com vento, flora instanciada em blocos (para o culling), fogueira, arena e portal.
import * as THREE from "three";
import { Rng } from "../core/rng";
import { distToPath, type Obstacle, type ZoneLayout } from "../core/worldgen";
import type { DecorKind, ZoneDef } from "../data/zones";
import { buildDecor, buildFlower, type MatKind } from "./flora";
import { buildShafts } from "./air";
import { buildScatter } from "./scatter";
import { NOISE_GLSL, STAIN_GLSL, applyAtmosphere, patchMaterial, U } from "./shared";

export interface WorldView {
  group: THREE.Group;
  portal: THREE.Group;
  dispose(): void;
}

const VARIANTS = 3;
const CELL = 40;
const GRASS_TILE = 72;

/** Pilares em anel em volta da arena (decoração, sem colisão), com a entrada ao sul aberta. */
function arenaRing(layout: ZoneLayout): Obstacle[] {
  const out: Obstacle[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.45) continue; // entrada ao sul
    out.push({ x: layout.boss.x + Math.cos(a) * (layout.bossRadius + 0.8), z: layout.boss.z + Math.sin(a) * (layout.bossRadius + 0.8),
      r: 0.7, kind: "pillar", scale: 1.1, rot: a, solid: false });
  }
  return out;
}

/** quanto cada tipo escurece o chão em volta (sombra de contato) e o raio dela em múltiplos do raio do obstáculo */
const CONTACT: Partial<Record<DecorKind, [number, number]>> = {
  tree: [0.7, 1.5], pine: [0.7, 1.4], deadTree: [0.5, 1.25], rock: [0.7, 1.12], lavaRock: [0.6, 1.1], tomb: [0.85, 1.35],
  pillar: [0.8, 1.3], crystal: [0.55, 1.2], bush: [0.5, 1.2], mushroom: [0.35, 1.5],
};

/** Máscara do chão. R: terra batida (caminho, arena, início, acampamentos). G: sombra de contato embaixo de cada obstáculo. */
function buildMask(layout: ZoneLayout): THREE.CanvasTexture {
  const N = 1024;
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const ctx = cv.getContext("2d")!;
  const k = N / layout.size;
  const tx = (v: number) => (v + layout.size / 2) * k;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, N, N);
  ctx.filter = "blur(7px)";
  ctx.strokeStyle = "#f00";
  ctx.fillStyle = "#f00";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 6.2 * k;
  ctx.beginPath();
  layout.path.forEach((p, i) => (i ? ctx.lineTo(tx(p.x), tx(p.z)) : ctx.moveTo(tx(p.x), tx(p.z))));
  ctx.stroke();
  const disc = (x: number, z: number, r: number, alpha: number) => {
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(tx(x), tx(z), r * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };
  disc(layout.boss.x, layout.boss.z, layout.bossRadius - 0.5, 1);
  disc(layout.spawn.x, layout.spawn.z, 6.5, 1);
  for (const c of layout.camps) disc(c.x, c.z, 4.2, 0.62);
  // sombra de contato: discos verdes somados (não mexem no vermelho), com desfoque menor
  ctx.filter = "blur(2.5px)";
  ctx.globalCompositeOperation = "lighter";
  for (const o of [...layout.obstacles, ...arenaRing(layout)]) {
    const c = CONTACT[o.kind];
    if (!c) continue;
    ctx.fillStyle = `rgba(0, ${Math.round(255 * c[0])}, 0, 1)`;
    ctx.beginPath();
    ctx.arc(tx(o.x), tx(o.z), Math.max(1.2, o.r * o.scale * c[1] * k), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  const tex = new THREE.CanvasTexture(cv);
  tex.flipY = false;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function groundMaterial(zone: ZoneDef): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  const uni = {
    uG0: { value: new THREE.Color(zone.ground[0]) },
    uG1: { value: new THREE.Color(zone.ground[1]) },
    uG2: { value: new THREE.Color(zone.ground[2]) },
    uDirt: { value: new THREE.Color(zone.path) },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U, uni);
    shader.vertexShader = "varying vec3 vWPos;\n" + shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;",
    );
    shader.fragmentShader = `varying vec3 vWPos;
      uniform sampler2D uMask; uniform float uMapSize;
      uniform vec3 uG0; uniform vec3 uG1; uniform vec3 uG2; uniform vec3 uDirt;
      ${NOISE_GLSL}
      ${STAIN_GLSL}
      ` + shader.fragmentShader.replace(
      "#include <color_fragment>",
      `vec2 gp = vWPos.xz;
      float big = fbm(gp * 0.035);
      float mid = fbm(gp * 0.21 + 7.0);
      float fine = vnoise(gp * 3.3);
      vec3 gcol = mix(uG2, uG0, smoothstep(0.3, 0.55, big));
      gcol = mix(gcol, uG1, smoothstep(0.5, 0.78, mid) * 0.75);
      gcol *= 0.86 + 0.28 * fine;
      gcol = stains(gp, gcol);
      vec2 mm = texture2D(uMask, gp / uMapSize + 0.5).rg;
      float mk = mm.r;
      float dirtK = smoothstep(0.28, 0.66, mk + (mid - 0.5) * 0.4);
      vec3 dirt = uDirt * (0.78 + 0.4 * fbm(gp * 0.8 + 3.0));
      float pebble = smoothstep(0.80, 0.86, vnoise(gp * 4.7 + 11.0));
      dirt = mix(dirt, dirt * 1.38, pebble * 0.55);
      dirt *= 0.93 + 0.14 * vnoise(gp * 9.0);
      vec3 col = mix(gcol, dirt, dirtK);
      // terra batida também ganha manchas (úmida, pisada), mais fracas
      col = mix(col, stains(gp * 1.4 + 50.0, col), dirtK);
      // borda úmida entre grama e terra
      col *= 1.0 - 0.08 * smoothstep(0.05, 0.4, mk) * (1.0 - dirtK);
      // sombra de contato: o chão escurece embaixo de árvore, pedra, lápide
      col *= 1.0 - 0.45 * smoothstep(0.15, 0.85, mm.g);
      diffuseColor.rgb = col;`,
    );
  };
  mat.customProgramCacheKey = () => "ground";
  return mat;
}

/** Grama: lâminas num ladrilho que acompanha a câmera; somem onde a máscara marca terra. */
function buildGrass(zone: ZoneDef, rng: Rng): THREE.Mesh | null {
  const count = Math.round(70000 * zone.grass.density);
  if (count <= 0) return null;
  // lâmina: 5 vértices, 3 triângulos
  const bx = [-0.5, 0.5, -0.32, 0.32, 0];
  const by = [0, 0, 0.5, 0.5, 1];
  const tri = [0, 1, 2, 2, 1, 3, 2, 3, 4];
  const pos = new Float32Array(count * 9 * 3);
  const off = new Float32Array(count * 9 * 2);
  const rnd = new Float32Array(count * 9 * 3);
  for (let i = 0; i < count; i++) {
    const ox = rng.next() * GRASS_TILE;
    const oz = rng.next() * GRASS_TILE;
    const r0 = 0.55 + rng.next() * 0.75;
    const r1 = rng.next();
    const r2 = rng.next();
    for (let v = 0; v < 9; v++) {
      const j = i * 9 + v;
      pos[j * 3] = bx[tri[v]];
      pos[j * 3 + 1] = by[tri[v]];
      off[j * 2] = ox;
      off[j * 2 + 1] = oz;
      rnd[j * 3] = r0;
      rnd[j * 3 + 1] = r1;
      rnd[j * 3 + 2] = r2;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aOffset", new THREE.BufferAttribute(off, 2));
  geo.setAttribute("aRand", new THREE.BufferAttribute(rnd, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(count * 9 * 3), 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(count * 9 * 3), 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  const uni = {
    uRoot: { value: new THREE.Color(zone.grass.root) },
    uTip: { value: new THREE.Color(zone.grass.tip) },
    uGrassH: { value: zone.grass.height },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U, uni);
    // as duas faces da lâmina recebem a mesma luz (normal sempre para cima)
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_begin>",
      "vec3 normal = normalize(vNormal);\nvec3 nonPerturbedNormal = normal;",
    );
    shader.vertexShader = `attribute vec2 aOffset; attribute vec3 aRand;
      uniform float uTime; uniform vec2 uCenter; uniform vec3 uHero; uniform sampler2D uMask; uniform float uMapSize;
      uniform vec3 uRoot; uniform vec3 uTip; uniform float uGrassH;
      ${NOISE_GLSL}
      ${STAIN_GLSL}
      ` + shader.vertexShader
      .replace("#include <beginnormal_vertex>", "vec3 objectNormal = vec3(0.0, 1.0, 0.0);")
      .replace(
        "#include <begin_vertex>",
        `float T = ${GRASS_TILE.toFixed(1)};
        vec2 w = mod(aOffset - uCenter + T * 0.5, T) - T * 0.5 + uCenter;
        vec2 mm = texture2D(uMask, w / uMapSize + 0.5).rg;
        float mk = mm.r;
        float gh = uGrassH * aRand.x * (1.0 - smoothstep(0.2, 0.5, mk + (aRand.y - 0.5) * 0.25));
        // touceiras: grama mais alta em manchas
        gh *= 0.7 + 0.6 * smoothstep(0.35, 0.7, sin(w.x * 0.21 + aRand.z) * sin(w.y * 0.17) * 0.5 + 0.5);
        float ang = aRand.y * 6.2832;
        vec2 dir = vec2(cos(ang), sin(ang));
        float t = position.y;
        vec3 transformed = vec3(w.x + dir.x * position.x * 0.11, t * gh, w.y + dir.y * position.x * 0.11);
        float wind = sin(uTime * 1.7 + w.x * 0.33 + w.y * 0.21) * 0.16 + sin(uTime * 3.3 + w.x * 1.1 + aRand.z * 6.0) * 0.05;
        transformed.x += wind * t * t * gh;
        transformed.z += wind * 0.6 * t * t * gh;
        // o herói amassa a grama por onde passa
        vec2 away = w - uHero.xz;
        float pd = length(away);
        float push = 1.0 - smoothstep(0.25, 1.5, pd);
        transformed.xz += (away / max(pd, 0.001)) * push * 0.45 * t;
        transformed.y *= 1.0 - push * 0.55;
        // sem grama aqui: esconde a lâmina abaixo do chão
        if (gh < 0.04) transformed.y = -2.0;
        // manchas: a mesma do chão tinge a lâmina (vColor já foi escrito antes, em color_vertex)
        vColor = stains(w, vColor);
        vColor *= 1.0 - 0.45 * smoothstep(0.0, 0.8, mm.g);`,
      )
      .replace(
        "#include <color_vertex>",
        `vColor = mix(uRoot, uTip, position.y * position.y) * (0.82 + 0.36 * aRand.z);
`,
      );
  };
  mat.customProgramCacheKey = () => "grass";
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  return mesh;
}

export function buildWorld(scene: THREE.Scene, zone: ZoneDef, layout: ZoneLayout): WorldView {
  const group = new THREE.Group();
  scene.add(group);
  const disposables: { dispose(): void }[] = [];
  const glow = zone.glowDecor ?? 0xffe9a8;
  const rng = Rng.of(layout.seed, "visual");

  const mask = buildMask(layout);
  U.uMask.value = mask;
  U.uMapSize.value = layout.size;
  disposables.push(mask);

  // chão
  const extent = layout.size + 160;
  const groundGeo = new THREE.PlaneGeometry(extent, extent);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = groundMaterial(zone);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  group.add(ground);
  disposables.push(groundGeo, groundMat);

  const grass = buildGrass(zone, rng);
  if (grass) {
    group.add(grass);
    disposables.push(grass.geometry, grass.material as THREE.Material);
  }

  // materiais da flora
  const mats: Record<MatKind, THREE.Material> = {
    solid: patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), { fade: true, wind: 0.012, windFrom: 1.2 }),
    foliage: patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), { fade: true, wind: 0.05, windFrom: 0.8 }),
    rock: patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }), { fade: true }),
    glow: patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, flatShading: true, emissive: glow, emissiveIntensity: 1.6 }), { fade: true }),
    lava: lavaRockMaterial(glow),
  };
  disposables.push(...Object.values(mats));

  // obstáculos + anel de pilares da arena, agrupados por tipo, variante e célula (para o culling por frustum)
  const all: Obstacle[] = [...layout.obstacles, ...arenaRing(layout)];
  const buckets = new Map<string, { kind: DecorKind; variant: number; list: Obstacle[] }>();
  all.forEach((o, i) => {
    const variant = i % VARIANTS;
    const key = `${o.kind}:${variant}:${Math.floor(o.x / CELL)}:${Math.floor(o.z / CELL)}`;
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = { kind: o.kind, variant, list: [] }));
    b.list.push(o);
  });
  const models = new Map<string, ReturnType<typeof buildDecor>>();
  const inst = new THREE.Object3D();
  const col = new THREE.Color();
  for (const b of buckets.values()) {
    const mk = `${b.kind}:${b.variant}`;
    let model = models.get(mk);
    if (!model) {
      models.set(mk, (model = buildDecor(b.kind, b.variant, { glow, rockTop: zone.rockTop, foliage: zone.foliage, capGlow: zone.capGlow })));
      occlude(model.parts);
      for (const g of Object.values(model.parts)) disposables.push(g);
    }
    const tints = b.list.map(() => {
      const t = 0.84 + rng.next() * 0.3, w = rng.range(-1, 1);
      return new THREE.Color(t * (1 + 0.1 * w), t, t * (1 - 0.12 * w));
    });
    for (const [matKind, geo] of Object.entries(model.parts) as [MatKind, THREE.BufferGeometry][]) {
      const mesh = new THREE.InstancedMesh(geo, mats[matKind], b.list.length);
      mesh.castShadow = matKind !== "glow" && b.kind !== "mushroom";
      mesh.receiveShadow = true;
      b.list.forEach((o, i) => {
        inst.position.set(o.x, 0, o.z);
        const lean = b.kind === "deadTree" ? 0.16 : b.kind === "tomb" ? 0.1 : 0;
        const h = Math.sin(o.x * 12.9898 + o.z * 78.233) * 43758.5453, r1 = h - Math.floor(h), r2 = (h * 7.13) % 1;
        inst.rotation.set((r1 - 0.5) * lean, o.rot, (r2 - 0.5) * lean);
        inst.scale.set(o.scale, o.scale * (lean ? 0.75 + 0.55 * r2 : 1), o.scale);
        inst.updateMatrix();
        mesh.setMatrixAt(i, inst.matrix);
        mesh.setColorAt(i, tints[i]);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      group.add(mesh);
      disposables.push(mesh);
    }
  }

  // miudezas do chão
  const scatter = buildScatter(zone, layout, glow);
  for (const m of scatter.meshes) group.add(m);
  disposables.push(...scatter.disposables);

  // flores
  if (zone.flowers.length) {
    const fl = buildFlower();
    const n = 900;
    const stemMat = mats.foliage;
    const petalMat = patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, emissive: 0xffffff, emissiveIntensity: zone.flowerGlow ?? 0.06 }), { wind: 0.25, windFrom: 0.1 });
    const stems = new THREE.InstancedMesh(fl.stem, stemMat, n);
    const petals = new THREE.InstancedMesh(fl.petals, petalMat, n);
    const half = layout.size / 2 - 6;
    let placed = 0;
    // em canteiros, fora da terra batida
    const patches = Array.from({ length: 60 }, () => ({ x: rng.range(-half, half), z: rng.range(-half, half), c: rng.pick(zone.flowers) }));
    for (let i = 0; i < n; i++) {
      const p = patches[i % patches.length];
      const a = rng.range(0, 6.28);
      const d = Math.sqrt(rng.next()) * 4.5;
      const fx0 = p.x + Math.cos(a) * d;
      const fz0 = p.z + Math.sin(a) * d;
      // nada de flor na terra batida
      if (distToPath(fx0, fz0, layout.path) < 4.2 || Math.hypot(fx0 - layout.boss.x, fz0 - layout.boss.z) < layout.bossRadius + 1
        || Math.hypot(fx0 - layout.spawn.x, fz0 - layout.spawn.z) < 8 || layout.camps.some((c) => Math.hypot(fx0 - c.x, fz0 - c.z) < 5)) continue;
      inst.position.set(fx0, 0, fz0);
      inst.rotation.set(0, rng.range(0, 6.28), 0);
      inst.scale.setScalar(rng.range(0.8, 1.5));
      inst.updateMatrix();
      stems.setMatrixAt(placed, inst.matrix);
      petals.setMatrixAt(placed, inst.matrix);
      stems.setColorAt(placed, col.setScalar(1));
      petals.setColorAt(placed, col.set(p.c).multiplyScalar(0.85 + rng.next() * 0.3));
      placed++;
    }
    stems.count = petals.count = placed;
    stems.receiveShadow = petals.receiveShadow = true;
    group.add(stems, petals);
    disposables.push(fl.stem, fl.petals, petalMat, stems, petals);
  }

  // fogueira no ponto inicial
  const fx = layout.spawn.x + 2.5;
  const fz = layout.spawn.z + 1.5;
  const fireMat = new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xff6a12, emissiveIntensity: 3.2, flatShading: true });
  const logMat = new THREE.MeshStandardMaterial({ color: 0x4a3324, roughness: 1, flatShading: true });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7d8088, roughness: 1, flatShading: true });
  const fire = new THREE.Group();
  fire.position.set(fx, 0, fz);
  const flameGeo = new THREE.ConeGeometry(0.28, 0.9, 6);
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(flameGeo, fireMat);
    f.position.set(Math.cos(i * 2.1) * 0.14, 0.5 + i * 0.06, Math.sin(i * 2.1) * 0.14);
    f.scale.setScalar(1 - i * 0.2);
    fire.add(f);
  }
  const logGeo = new THREE.CylinderGeometry(0.09, 0.1, 1.0, 6);
  for (let i = 0; i < 4; i++) {
    const l = new THREE.Mesh(logGeo, logMat);
    l.rotation.set(Math.PI / 2 - 0.35, (i / 4) * Math.PI * 2, 0, "YXZ");
    l.position.y = 0.2;
    l.castShadow = true;
    fire.add(l);
  }
  const stoneGeo = new THREE.DodecahedronGeometry(0.2, 0);
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Mesh(stoneGeo, stoneMat);
    const a = (i / 9) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.85, 0.1, Math.sin(a) * 0.85);
    s.rotation.set(i, i * 2, 0);
    s.castShadow = true;
    fire.add(s);
  }
  const fireLight = new THREE.PointLight(0xff8a3a, FIRE_LIGHT, 22, 1.4);
  fireLight.position.y = 1.4;
  fire.add(fireLight);
  fire.userData.light = fireLight;
  group.add(fire);
  group.userData.fire = fire;
  disposables.push(fireMat, logMat, stoneMat, flameGeo, logGeo, stoneGeo);

  // portal (escondido até o chefe cair)
  const portal = new THREE.Group();
  const portalMat = new THREE.MeshStandardMaterial({ color: 0x9be4ff, emissive: 0x4ab8ff, emissiveIntensity: 3, flatShading: true });
  const torusGeo = new THREE.TorusGeometry(1.6, 0.2, 6, 24);
  const torus = new THREE.Mesh(torusGeo, portalMat);
  torus.position.y = 2.0;
  const discMat = new THREE.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, toneMapped: false });
  const discGeo = new THREE.CircleGeometry(1.45, 24);
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.position.y = 2.0;
  const pl = new THREE.PointLight(0x6fc8ff, 50, 20, 1.5);
  pl.position.y = 2.2;
  portal.add(torus, disc, pl);
  portal.position.set(layout.boss.x, 0, layout.boss.z);
  portal.visible = false;
  group.add(portal);
  disposables.push(portalMat, torusGeo, discMat, discGeo);
  applyAtmosphere(group);

  // feixes de luz (material próprio, aditivo: fica fora da sombra de nuvens e da névoa)
  const shafts = buildShafts(zone, layout);
  if (shafts) {
    group.add(shafts);
    disposables.push(shafts.geometry, shafts.material as THREE.Material);
  }

  return {
    group,
    portal,
    dispose() {
      scene.remove(group);
      for (const d of disposables) d.dispose();
    },
  };
}

/** Liga o céu, a sombra de nuvens e a névoa da zona (uniforms compartilhados por todos os materiais; ver `applyAtmosphere`).
 * A `scene.fog` do three acompanha a névoa de distância só para os materiais sem luz (contorno dos personagens). */
export function setZoneAtmosphere(scene: THREE.Scene, zone: ZoneDef): void {
  const c = zone.clouds, h = zone.haze;
  U.uCloud.value.set(c.strength, 1 / c.size, c.speed, c.cover);
  U.uFog.value.set(h.start, h.density, h.mist, h.mistHeight);
  U.uFogColor.value.set(zone.fog);
  U.uMistColor.value.set(h.mistColor);
  U.uMistNoise.value.set(1 / h.mistSize, h.mistSpeed);
  for (let i = 0; i < 3; i++) {
    const s = zone.stains[i];
    const c = new THREE.Color(s ? s[0] : 0);
    U.uStain.value[i].set(c.r, c.g, c.b, s ? s[2] : -9);
    U.uStainSize.value.setComponent(i, s ? s[1] : 10);
  }
  scene.background = new THREE.Color(zone.sky);
  scene.fog = new THREE.Fog(zone.fog, h.start + 0.5 / h.density, h.start + 2.2 / h.density);
}

const sunWarm = new THREE.Color(), sunCool = new THREE.Color();
/** Luz viva: a força e a cor do sol variam devagar (ciclo de alguns minutos), mais quente quando forte e mais fria quando fraca. */
export function driftSun(sun: THREE.DirectionalLight, zone: ZoneDef, time: number): void {
  const d = zone.clouds.drift;
  const w = 0.6 * Math.sin(time * 0.045) + 0.4 * Math.sin(time * 0.11 + 1.3);
  sun.intensity = zone.sunIntensity * (1 + d * w);
  sunWarm.set(zone.sun).lerp(sunCool.setRGB(1, 0.78, 0.55), 0.5 * d * Math.max(0, w));
  sun.color.copy(sunWarm).lerp(sunCool.setRGB(0.7, 0.8, 1), 0.5 * d * Math.max(0, -w));
}

/** Oclusão por vértice: tronco, pedra e lápide escurecem perto do chão; a copa escurece embaixo (o miolo que não pega luz). */
function occlude(parts: Partial<Record<MatKind, THREE.BufferGeometry>>): void {
  for (const [kind, geo] of Object.entries(parts) as [MatKind, THREE.BufferGeometry][]) {
    if (kind === "glow") continue;
    const rocky = kind === "rock" || kind === "lava";
    const pos = geo.attributes.position, col = geo.attributes.color;
    if (!col) continue;
    geo.computeBoundingBox();
    const y0 = geo.boundingBox!.min.y, y1 = geo.boundingBox!.max.y;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      // pedra e lápide: pela altura da própria peça (são baixas; pela altura do chão ficavam pretas inteiras)
      const k = kind === "foliage" ? 0.62 + 0.38 * smooth(y0, y0 + (y1 - y0) * 0.6, y)
        : rocky ? 0.6 + 0.4 * smooth(y0, y0 + (y1 - y0) * 0.45, y)
        : 0.5 + 0.5 * smooth(0, 0.7, y);
      col.setXYZ(i, col.getX(i) * k, col.getY(i) * k, col.getZ(i) * k);
    }
    col.needsUpdate = true;
  }
}
const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** força média da luz da fogueira; `fireFlicker` faz ela oscilar */
const FIRE_LIGHT = 70;
export const fireFlicker = (time: number): number => FIRE_LIGHT * (1 + Math.sin(time * 11) * 0.12 + Math.sin(time * 23) * 0.08);

/** Rocha de lava: material de pedra com rachaduras acesas (bordas de Voronoi em 3D na posição do objeto), que pulsam devagar e
 * ficam mais fortes perto do chão. Sem o recorte do herói (`fade`): as rochas de lava são baixas. */
function lavaRockMaterial(glow: number): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
  const uni = { uLava: { value: new THREE.Color(glow) } };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U, uni);
    shader.vertexShader = "varying vec3 vObj;\n" + shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = position;");
    shader.fragmentShader = `varying vec3 vObj; uniform vec3 uLava; uniform float uTime;
      vec3 lavaHash(vec3 p) { p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6))); return fract(sin(p) * 43758.5453); }
      float lavaCrack(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        float d1 = 8.0, d2 = 8.0;
        for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
          vec3 g = vec3(float(x), float(y), float(z));
          float d = length(g + lavaHash(i + g) - f);
          if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
        }
        // só parte das bordas acende: as células com hash baixo ficam fechadas
        float open = step(0.45, lavaHash(i + 7.0).x);
        return (1.0 - smoothstep(0.01, 0.05, d2 - d1)) * open;
      }
      ` + shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
      float crack = lavaCrack(vObj * 1.5);
      float low = 1.0 - smoothstep(-0.3, 0.35, vObj.y);
      crack *= 0.25 + 0.75 * low;
      float pulse = 0.75 + 0.25 * sin(uTime * 1.3 + vObj.x * 3.0 + vObj.z * 2.0);
      totalEmissiveRadiance += uLava * crack * (0.5 + 1.6 * low) * pulse * 2.6;
      diffuseColor.rgb *= 1.0 - 0.5 * crack;`,
    );
  };
  mat.customProgramCacheKey = () => "lavaRock";
  return mat;
}
