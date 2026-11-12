// Personagens como sprites animados (folhas do Dungeon Reign) em pé no mundo 3D.
import * as THREE from "three";
import { SPRITES, type SpriteMeta } from "../data/sprites";
import type { AnimState, Rig } from "./models";

const urls = import.meta.glob("../assets/sprites/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

/** unidades do mundo por pixel do sprite (herói de ~70 px fica com ~1,9 de altura) */
export const SPRITE_PX = 0.028;
/** inclinação do sprite para trás, na direção da câmera */
export const SPRITE_TILT = 0.5;

export interface SpriteState {
  meta: SpriteMeta;
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  left: boolean;
  tint: THREE.Color;
}

const textures = new Map<string, THREE.Texture>();
const loader = new THREE.TextureLoader();

function texture(key: string): THREE.Texture {
  let t = textures.get(key);
  if (!t) {
    const url = urls[`../assets/sprites/${key}.png`];
    t = loader.load(url);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    textures.set(key, t);
  }
  return t;
}

export function hasSprite(key: string): boolean {
  return key in SPRITES;
}

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FRAG = `
uniform sampler2D map;
uniform vec4 uvRect;
uniform vec3 tint;
uniform float tintK;
varying vec2 vUv;
void main() {
  vec4 tex = texture2D(map, uvRect.xy + vUv * uvRect.zw);
  if (tex.a < 0.5) discard;
  gl_FragColor = vec4(mix(tex.rgb, tint, tintK), 1.0);
  #include <colorspace_fragment>
}`;

const SHADOW_GEO = new THREE.CircleGeometry(1, 20);
const SHADOW_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false });

export function buildSpriteRig(key: string, scale: number): Rig {
  const meta = SPRITES[key];
  const root = new THREE.Group();
  const inner = new THREE.Group();
  const tilt = new THREE.Group();
  tilt.rotation.x = -SPRITE_TILT;
  root.add(inner);
  inner.add(tilt);
  const px = SPRITE_PX * scale;
  const geo = new THREE.PlaneGeometry(meta.w * px, meta.h * px);
  // pés do personagem na origem
  geo.translate((meta.w / 2 - meta.ox) * px, (meta.oy - meta.h / 2) * px, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: texture(key) },
      uvRect: { value: new THREE.Vector4(0, 0.8, 1 / meta.cols, 0.2) },
      tint: { value: new THREE.Color(0xffffff) },
      tintK: { value: 0 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  tilt.add(mesh);
  const shadow = new THREE.Mesh(SHADOW_GEO, SHADOW_MAT);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.04;
  shadow.scale.set(meta.half * px * 0.75, meta.half * px * 0.45, 1);
  root.add(shadow);
  return {
    root, inner, body: inner, head: inner, armL: null, armR: null, legL: null, legR: null, wings: [], mats: [], baseEmissive: [],
    kind: "humanoid", height: meta.top * px * Math.cos(SPRITE_TILT), phase: Math.random() * 10,
    sprite: { meta, mesh, mat, left: false, tint: mat.uniforms.tint.value as THREE.Color },
  };
}

const ROW = { idle: 0, walk: 1, attack: 2, hit: 3, death: 4 };

export function animateSprite(rig: Rig, a: AnimState): void {
  const s = rig.sprite!;
  const m = s.meta;
  // o sprite sempre encara a câmera; a direção só decide para que lado ele olha
  const yaw = rig.root.rotation.y;
  rig.inner.rotation.y = -yaw;
  const sx = Math.sin(yaw);
  if (sx < -0.12) s.left = true;
  else if (sx > 0.12) s.left = false;
  s.mesh.scale.x = s.left ? -1 : 1;

  let row = ROW.idle;
  let frame = 0;
  const t = a.t + rig.phase;
  if (a.dead > 0) {
    row = ROW.death;
    frame = Math.min(m.frames[row] - 1, Math.floor(Math.min(1, a.dead) * m.frames[row]));
  } else if (a.windup > 0) {
    row = ROW.attack;
    frame = Math.min(1, Math.floor(a.windup * 2));
  } else if (a.attack >= 0) {
    row = ROW.attack;
    frame = Math.min(m.frames[row] - 1, Math.floor(a.attack * m.frames[row]));
  } else if (a.move > 0.5) {
    row = ROW.walk;
    frame = Math.floor(t / 0.075) % m.frames[row];
  } else {
    frame = Math.floor(t / 0.16) % m.frames[row];
  }
  (s.mat.uniforms.uvRect.value as THREE.Vector4).set(frame / m.cols, 1 - (row + 1) / 5, 1 / m.cols, 1 / 5);
}

export function tintSprite(rig: Rig, color: number, k: number): void {
  const s = rig.sprite!;
  s.tint.set(color);
  s.mat.uniforms.tintK.value = k;
}

export function disposeSprite(rig: Rig): void {
  const s = rig.sprite!;
  s.mesh.geometry.dispose();
  s.mat.dispose();
}
