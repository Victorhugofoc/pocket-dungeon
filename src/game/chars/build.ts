// Montagem: transforma a receita de um personagem (Builder) em ossos, malhas e materiais.
import * as THREE from "three";
import { merge } from "../flora";
import type { Rig } from "../models";
import { newPhys } from "./animate";
import { BOSSES } from "./cast-bosses";
import { ENEMIES } from "./cast-enemies";
import { HEROES } from "./cast-heroes";
import { type Bone, type G, type Spec, Builder, TORSO_Y, at, cone, cyl, sph, torus } from "./kit";

const CAST: Record<string, Spec> = { ...HEROES, ...ENEMIES, ...BOSSES };

export function hasChar(id: string): boolean {
  return id in CAST;
}
/** ids de todos os personagens modelados */
export const castIds = (): string[] => Object.keys(CAST);

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
