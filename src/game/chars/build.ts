// Montagem: transforma a receita de um personagem (Builder) em ossos, malhas e materiais.
import * as THREE from "three";
import { TUNING } from "../../data/tuning";
import { merge } from "../flora";
import type { Rig } from "../models";
import { applyAtmosphere, U } from "../shared";
import { addLamp } from "../lamps";
import { type IkLeg, type Ribbon, newPhys } from "./animate";
import { BOSSES } from "./cast-bosses";
import { ENEMIES } from "./cast-enemies";
import { HEROES } from "./cast-heroes";
import { type Bone, type G, type Spec, Builder, TORSO_Y } from "./kit";

const CAST: Record<string, Spec> = { ...HEROES, ...ENEMIES, ...BOSSES };

/** Junta as peças de um osso e conserta normais nulas (triângulos degenerados de extrusões): normalizar uma normal nula
 * dá NaN no contorno e na luz de recorte, e o bloom espalha isso como um bloco preto intermitente. */
function fuse(list: G[]): G {
  const geo = merge(list);
  const n = geo.attributes.normal;
  for (let i = 0; i < n.count; i++) {
    if (Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) < 1e-6) n.setXYZ(i, 0, 1, 0);
  }
  geo.setAttribute("outlineNormal", outlineNormals(geo));
  return geo;
}

/** Normal só do contorno: média das normais de todos os vértices na mesma posição. Em aresta dura (face plana, chapa fina,
 * borda de asa) cada face tem a sua normal, e a casca empurrada por ela se abre na aresta: o contorno some na borda. */
function outlineNormals(geo: G): THREE.BufferAttribute {
  const p = geo.attributes.position, n = geo.attributes.normal;
  const sum = new Map<string, [number, number, number]>();
  const key = (i: number) => `${Math.round(p.getX(i) * 1e4)},${Math.round(p.getY(i) * 1e4)},${Math.round(p.getZ(i) * 1e4)}`;
  for (let i = 0; i < p.count; i++) {
    const k = key(i), s = sum.get(k);
    if (s) { s[0] += n.getX(i); s[1] += n.getY(i); s[2] += n.getZ(i); } else sum.set(k, [n.getX(i), n.getY(i), n.getZ(i)]);
  }
  const out = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = sum.get(key(i))!, l = Math.hypot(x, y, z);
    if (l > 1e-4) out.set([x / l, y / l, z / l], i * 3);
    else out.set([n.getX(i), n.getY(i), n.getZ(i)], i * 3); // faces opostas se anulam (chapa sem espessura): fica a normal da face
  }
  return new THREE.BufferAttribute(out, 3);
}

export function hasChar(id: string): boolean {
  return id in CAST;
}
/** ids de todos os personagens modelados */
export const castIds = (): string[] => Object.keys(CAST);

// ---------------------------------------------------------------- montagem
/** Contorno escuro por casca invertida (com a luz de recorte, tira o aspecto de plástico liso). O campeão usa um dourado mais grosso (Dungeon Reign: contorno dourado em volta do
 * sprite); o invocado, um roxo escuro meio transparente, junto com o corpo. */
function outlineMaterial(color: number, width: number, opacity = 1, lit = false): THREE.MeshBasicMaterial {
  // `lit`: fora do tone mapping, para o dourado brilhar um pouco no bloom
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, transparent: opacity < 1, opacity, toneMapped: !lit });
  m.onBeforeCompile = (shader) => {
    // empurra pela normal do contorno (fuse); malha sem ela (fitas refeitas a cada quadro) lê zero e usa a normal comum
    shader.vertexShader = "attribute vec3 outlineNormal;\n" + shader.vertexShader.replace("#include <begin_vertex>",
      `#include <begin_vertex>
      vec3 on = dot(outlineNormal, outlineNormal) > 1e-6 ? outlineNormal : normal;
      transformed += normalize(on) * ${width.toFixed(3)};`);
  };
  m.customProgramCacheKey = () => "outline" + width;
  return m;
}
const OUTLINE = outlineMaterial(0x17121c, 0.02);
const OUTLINE_CHAMPION = outlineMaterial(TUNING.enemy.champion.outline, 0.03, 1, true);
const OUTLINE_SUMMONED = outlineMaterial(0x1e1638, 0.02, TUNING.enemy.summoned.opacity);

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

/** casca escura rachada: bordas de células (Voronoi 3D no espaço local do osso) acesas como lava */
function lavaMaterial(lava: number, rough: number): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: 0.1 });
  const col = new THREE.Color(lava);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uLava = { value: col };
    shader.uniforms.uTime = U.uTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vLp;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLp = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
      varying vec3 vLp;
      uniform vec3 uLava;
      uniform float uTime;
      vec3 lvHash(vec3 p) {
        p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
        return fract(sin(p) * 43758.5453);
      }
      float lvEdge(vec3 x) {
        vec3 p = floor(x), f = fract(x);
        float d1 = 8.0, d2 = 8.0;
        for (int k = -1; k <= 1; k++) for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
          vec3 g = vec3(float(i), float(j), float(k));
          vec3 r = g + lvHash(p + g) - f;
          float d = dot(r, r);
          if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
        }
        return sqrt(d2) - sqrt(d1);
      }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
      float lvC = 1.0 - smoothstep(0.015, 0.075, lvEdge(vLp * 4.2));
      diffuseColor.rgb = mix(diffuseColor.rgb, uLava * 0.35, lvC);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
      totalEmissiveRadiance += uLava * lvC * (1.5 + 0.45 * sin(uTime * 1.7 + vLp.y * 3.0 + vLp.z * 2.0));`,
      )
      .replace(
        "#include <opaque_fragment>",
        `float rim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.6);
      outgoingLight += (diffuseColor.rgb * 0.9 + 0.1) * rim * 0.45;
      #include <opaque_fragment>`,
      );
  };
  mat.customProgramCacheKey = () => "lava";
  return mat;
}

/** Receita esculpida e geometrias já fundidas, por personagem (e coroa de campeão). */
interface Prepared {
  b: Builder;
  /** camadas sólida, detalhe, brilho e pelagem: geometria fundida por osso */
  solid: Map<Bone | string, G>;
  detail: Map<Bone | string, G>;
  glow: Map<Bone | string, G>;
  pelt: Map<Bone | string, G>;
  legs: { femur: G; tibia: G }[];
}

/** M16-01: esculpir e fundir um personagem leva de 5 a 15 ms; cada inimigo que nascia refazia tudo (e o descarte não
 * soltava as geometrias). Agora cada receita é esculpida uma vez e as geometrias são compartilhadas; por instância só
 * se montam ossos, malhas e materiais. As geometrias do cache nunca são descartadas. */
const PREPARED = new Map<string, Prepared>();

function prepare(id: string): Prepared {
  const hit = PREPARED.get(id);
  if (hit) return hit;
  const b = new Builder();
  CAST[id](b);
  const fuseAll = (m: Map<Bone | string, G[]>) => new Map([...m].map(([k, list]) => [k, fuse(list)] as const));
  const p: Prepared = {
    b, solid: fuseAll(b.solid), detail: fuseAll(b.detail), glow: fuseAll(b.glow), pelt: fuseAll(b.pelt),
    legs: b.ikLegs.map((spec) => ({ femur: fuse(spec.femur), tibia: fuse(spec.tibia) })),
  };
  PREPARED.set(id, p);
  return p;
}

/** `variant`: o campeão ganha contorno dourado (a coroa no chão fica em `fx.ts`); o invocado (e o filho do splitter)
 * sai em tom espectral, como no Dungeon Reign: cor × (0,8; 0,75; 0,95) e opacidade 0,85. */
export function buildChar(id: string, scaleMult: number, variant: "champion" | "summoned" | null = null): Rig {
  const P = prepare(id);
  const b = P.b;
  const root = new THREE.Group();
  const inner = new THREE.Group();
  root.add(inner);
  const main = rimLight(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: b.rough, metalness: 0.05 }), 0.55);
  const glow = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, emissive: b.glowByVertex ? 0xffffff : b.glowColor, emissiveIntensity: 1.5 });
  if (b.glowByVertex) {
    glow.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vColor.rgb;");
    };
    glow.customProgramCacheKey = () => "glowVertex";
  }
  const outline = variant === "champion" ? OUTLINE_CHAMPION : variant === "summoned" ? OUTLINE_SUMMONED : OUTLINE;
  const spectral = (m: THREE.MeshStandardMaterial): void => {
    if (variant !== "summoned") return;
    const t = TUNING.enemy.summoned;
    m.color.setRGB(t.tint[0], t.tint[1], t.tint[2]);
    m.transparent = true;
    m.opacity = t.opacity;
    if (m !== glow) m.emissive.set(t.emissive);
  };
  spectral(main);
  spectral(glow);
  const k = b.bulk;
  const bones: Partial<Record<Bone, THREE.Group>> = {};
  const mk = (name: Bone, parent: THREE.Object3D, x: number, y: number, z: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    bones[name] = g;
    return g;
  };
  const hips = mk("hips", inner, 0, b.form === "bat" ? 1.1 : b.form === "slime" || b.form === "wisp" ? 0 : b.dims.hipY, 0);
  if (b.form === "toad") {
    const d = b.dims;
    mk("head", hips, 0, d.headY, d.arm);
    mk("armL", hips, -d.shoulderX, d.shoulderY, d.arm);
    mk("armR", hips, d.shoulderX, d.shoulderY, d.arm);
    mk("thighL", hips, -d.hipX, 0, -d.thigh);
    mk("thighR", hips, d.hipX, 0, -d.thigh);
  } else if (b.form !== "bat" && b.form !== "slime" && b.form !== "wisp") {
    const torso = mk("torso", hips, 0, TORSO_Y, 0);
    mk("head", torso, 0, b.dims.headY, 0);
    const sx = b.dims.shoulderX || 0.27 * k + 0.07;
    const hx = b.dims.hipX || 0.13 * k;
    mk("foreL", mk("armL", torso, -sx, b.dims.shoulderY, 0), 0, -b.dims.arm, 0);
    mk("foreR", mk("armR", torso, sx, b.dims.shoulderY, 0), 0, -b.dims.arm, 0);
    bones.armL!.rotation.order = bones.armR!.rotation.order = "YXZ"; // o giro do ombro (y) vem por último: mira o braço no chão
    if (b.weapon) mk("weapon", bones.foreR!, 0, -b.weapon.hand, 0);
    mk("cape", torso, 0, 0.52, -0.2 * k);
    mk("tail", hips, 0, 0, -0.16 * k);
    if (b.form === "biped") {
      mk("shinL", mk("thighL", hips, -hx, -0.02, 0), 0, -b.dims.thigh, 0);
      mk("shinR", mk("thighR", hips, hx, -0.02, 0), 0, -b.dims.thigh, 0);
    }
    mk("skirt", hips, 0, 0, 0); // bípedes também podem vestir saia de manto por cima das pernas
  } else if (b.form === "wisp") {
    mk("head", hips, 0, 0, 0); // a alma; o selo fica no hips, parado no chão
  } else if (b.form === "bat") {
    mk("wingL", hips, -0.16, 0.05, 0);
    mk("wingR", hips, 0.16, 0.05, 0);
  }
  const mats = [main, glow];
  const layers: [Map<Bone | string, G>, THREE.MeshStandardMaterial][] = [[P.solid, main], [P.detail, main], [P.glow, glow]];
  let legMat = main;
  if (P.pelt.size) {
    const fur = b.surface === "lava" ? lavaMaterial(b.lava, b.rough) : furMaterial(b.stripe, b.rough);
    spectral(fur);
    mats.push(fur);
    layers.push([P.pelt, fur]);
    legMat = fur;
  }
  // patas com cinemática inversa: presas a `inner`, resolvidas em animate
  const legs: IkLeg[] = b.ikLegs.map((spec, i) => {
    const root = new THREE.Group(), femur = new THREE.Group(), tibia = new THREE.Group();
    tibia.position.z = spec.l1;
    femur.add(tibia);
    root.add(femur);
    inner.add(root);
    for (const [bone, geo] of [[femur, P.legs[i].femur], [tibia, P.legs[i].tibia]] as const) {
      const mesh = new THREE.Mesh(geo, legMat);
      mesh.castShadow = true;
      bone.add(mesh, new THREE.Mesh(geo, outline));
    }
    const side = spec.attach[0] < 0 ? 0 : 1;
    return {
      root, femur, tibia, l1: spec.l1, l2: spec.l2, attach: new THREE.Vector3(...spec.attach), home: new THREE.Vector2(...spec.home),
      foot: new THREE.Vector3(), from: new THREE.Vector3(), u: -1, group: (Math.floor(i / 2) + side) % 2,
    };
  });
  for (const [map, material] of layers) {
    for (const [name, geo] of map) {
      const parent = bones[name as Bone];
      if (!parent) continue;
      const mesh = new THREE.Mesh(geo, material);
      mesh.castShadow = material !== glow;
      parent.add(mesh);
      if (material !== glow && map !== P.detail) parent.add(new THREE.Mesh(geo, outline));
    }
  }
  // fitas com física: malha em anel de 4 vértices por gomo (esquerda, cima, direita, baixo), no espaço de `root`, refeita em animate
  const ribbons: Ribbon[] = [];
  for (const r of b.ribbons) {
    const bone = bones[r.bone];
    if (!bone) continue;
    const seg = r.seg ?? 10, rings = seg + 1;
    const col = new Float32Array(rings * 12), index: number[] = [];
    const c0 = new THREE.Color(r.color), c1 = new THREE.Color(r.tip), c = new THREE.Color();
    for (let i = 0; i < rings; i++) {
      for (let k = 0; k < 4; k++) {
        c.copy(c0).lerp(c1, i / seg).multiplyScalar(k % 2 === 0 ? 0.72 : k === 1 ? 1 : 0.6);
        col.set([c.r, c.g, c.b], (i * 4 + k) * 3);
        if (i < seg) {
          const a = i * 4 + k, d = i * 4 + ((k + 1) % 4);
          index.push(a, a + 4, d, d, a + 4, d + 4);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(rings * 12), 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(rings * 12), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.setIndex(index);
    const mesh = new THREE.Mesh(geo, main), line = new THREE.Mesh(geo, outline);
    mesh.castShadow = true;
    mesh.frustumCulled = line.frustumCulled = false;
    root.add(mesh, line);
    ribbons.push({
      bone, at: new THREE.Vector3(...r.at), seg: r.len / seg, width: r.width, thick: r.thick ?? 0.012, geo, init: false,
      pts: Array.from({ length: rings }, () => new THREE.Vector3()), prev: Array.from({ length: rings }, () => new THREE.Vector3()),
    });
  }
  for (const l of b.lights) {
    const bone = bones[l.bone];
    if (bone) addLamp(bone, l.x, l.y, l.z, l.color, l.intensity, l.distance);
  }
  applyAtmosphere(root);
  const scale = b.scale * scaleMult;
  root.scale.setScalar(scale);
  const height = (b.form === "bat" ? 1.5 : b.form === "slime" ? 1.2 : b.form === "wisp" ? 1.3 : b.form === "toad" ? 1.15 : 2.1) * scale;
  // peso: corpos grandes balançam mais devagar
  const weight = Math.max(0.6, Math.sqrt(scale) * (0.7 + 0.3 * k));
  return {
    root, inner, body: inner, head: inner, armL: null, armR: null, legL: null, legR: null, wings: [],
    mats, baseEmissive: mats.map((m) => m.emissive.clone()), kind: "humanoid", height, phase: Math.random() * 10,
    char: { bones, legs, style: b.style, poseR: b.poseR, poseL: b.poseL, form: b.form, shot: 0,
      lean: b.lean, crouch: b.crouch, stance: b.stance, swingHit: b.swingHit, armOut: b.armOut, weight, hipY: b.dims.hipY, weapon: b.weapon, ribbons, phys: newPhys() },
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
