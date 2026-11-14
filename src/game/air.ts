// O ar da zona: feixes de luz inclinados na direção do sol (uma malha só, aditiva) e partículas no ar em camadas.
import * as THREE from "three";
import { Rng } from "../core/rng";
import type { ZoneLayout } from "../core/worldgen";
import type { ZoneDef } from "../data/zones";
import type { Fx } from "./fx";
import { U } from "./shared";

/** Posição do sol em relação ao ponto que a câmera olha (game.ts e a prévia de zona usam a mesma). */
export const SUN_OFFSET = new THREE.Vector3(30, 50, 14);

const SHAFT_KINDS = new Set(["tree", "pine", "deadTree", "crystal", "pillar", "tomb", "rock", "lavaRock"]);
const SEG = 10, RINGS = 6, LEN = 15;

/** Feixes de luz que descem inclinados do céu até o chão, perto de árvores e bordas de mata, numa malha única (1 draw call).
 * Brilham no centro e somem na borda, no alto, rente ao chão e perto da câmera; listras e intensidade andam devagar. */
export function buildShafts(zone: ZoneDef, layout: ZoneLayout): THREE.Mesh | null {
  const cfg = zone.shafts;
  if (cfg.count <= 0) return null;
  const rng = Rng.of(layout.seed, "shafts");
  // âncora na borda de mata: obstáculo com pelo menos 3 vizinhos a 7 m (um sozinho no campo não faz feixe)
  const near = (x: number, z: number, r: number) => layout.obstacles.reduce((n, o) => n + (Math.hypot(o.x - x, o.z - z) < r ? 1 : 0), 0);
  const anchors = layout.obstacles.filter((o) => SHAFT_KINDS.has(o.kind) && near(o.x, o.z, 7) >= 4);
  if (!anchors.length) return null;
  const half = layout.size / 2 - 6;
  const spots: { x: number; z: number; r: number; k: number; tilt: number }[] = [];
  for (let tries = 0; spots.length < cfg.count && tries < cfg.count * 20; tries++) {
    const o = rng.pick(anchors);
    const a = rng.range(0, Math.PI * 2), d = o.r + rng.range(1.2, 4);
    const x = o.x + Math.cos(a) * d, z = o.z + Math.sin(a) * d;
    if (Math.abs(x) > half || Math.abs(z) > half) continue;
    if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < 7)) continue;
    if (layout.obstacles.some((p) => p.solid && Math.hypot(p.x - x, p.z - z) < p.r + 0.8)) continue;
    // na clareira: no máximo um obstáculo a 2,5 m
    if (near(x, z, 2.5) > 1) continue;
    // largura e força variam (2 a 3 vezes), e a direção muda alguns graus
    spots.push({ x, z, r: rng.range(0.9, 2.2), k: rng.range(0.45, 1), tilt: rng.range(-0.12, 0.12) });
  }
  // mais em pé que o sol de verdade: inclinado como o sol, de cima o feixe vira um tubo deitado no chão
  const up = SUN_OFFSET.clone().normalize().lerp(new THREE.Vector3(0, 1, 0), 0.45).normalize();
  const q = new THREE.Quaternion(), dir = new THREE.Vector3();
  const verts = (SEG + 1) * (RINGS + 1);
  const pos = new Float32Array(spots.length * verts * 3);
  const nor = new Float32Array(spots.length * verts * 3);
  const info = new Float32Array(spots.length * verts * 3); // altura 0..1, ângulo, semente
  const index: number[] = [];
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  spots.forEach((s, k) => {
    const base = k * verts, seed = rng.next();
    dir.copy(up).applyAxisAngle(new THREE.Vector3(0, 1, 0), s.tilt * 3).add(new THREE.Vector3(s.tilt, 0, -s.tilt)).normalize();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    for (let j = 0; j <= RINGS; j++) {
      const h = j / RINGS, r = s.r * (1 + 0.6 * h);
      for (let i = 0; i <= SEG; i++) {
        const a = (i / SEG) * Math.PI * 2, v = base + j * (SEG + 1) + i;
        p.set(Math.cos(a) * r, h * LEN, Math.sin(a) * r).applyQuaternion(q).add(new THREE.Vector3(s.x, -0.2, s.z));
        n.set(Math.cos(a), 0, Math.sin(a)).applyQuaternion(q);
        pos.set([p.x, p.y, p.z], v * 3);
        nor.set([n.x, n.y, n.z], v * 3);
        info.set([h, a, seed + Math.floor(s.k * 100)], v * 3);
      }
    }
    for (let j = 0; j < RINGS; j++) {
      for (let i = 0; i < SEG; i++) {
        const a0 = base + j * (SEG + 1) + i, b0 = a0 + SEG + 1;
        index.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1);
      }
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.setAttribute("aInfo", new THREE.BufferAttribute(info, 3));
  geo.setIndex(index);
  geo.computeBoundingSphere();
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uColor: { value: new THREE.Color(cfg.color) }, uIntensity: { value: cfg.intensity } },
    vertexShader: `
      attribute vec3 aInfo;
      varying vec3 vInfo; varying vec3 vN; varying vec3 vW;
      void main() {
        vInfo = aInfo; vN = normal;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uColor; uniform float uIntensity;
      varying vec3 vInfo; varying vec3 vN; varying vec3 vW;
      float h1(float x) { return fract(sin(x * 91.7) * 43758.5453); }
      float n1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), f); }
      void main() {
        vec3 V = normalize(cameraPosition - vW);
        float edge = pow(abs(dot(normalize(vN), V)), 3.0);
        float h = vInfo.x;
        float along = smoothstep(0.0, 0.35, h) * (1.0 - smoothstep(0.4, 0.95, h));
        float streak = 0.55 + 0.45 * n1(vInfo.y * 2.6 + fract(vInfo.z) * 40.0 + uTime * 0.12 - h * 1.5);
        float pulse = 0.6 + 0.4 * sin(uTime * 0.23 + fract(vInfo.z) * 6.283);
        float near = smoothstep(12.0, 24.0, distance(cameraPosition, vW));
        float power = floor(vInfo.z) / 100.0;
        float dth = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
        // perfil em sino na largura e teto de brilho: nunca passa perto do limiar do bloom, nem somando sobre uma copa clara
        float k = min(uIntensity * power * edge * along * streak * pulse * near, 0.16);
        gl_FragColor = vec4(uColor * max(k + dth, 0.0), 1.0);
      }`,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 4;
  return mesh;
}

/** Partículas no ar em camadas: a maioria pequena e apagada, algumas médias, poucas grandes e acesas; espalhadas na altura
 * (mais perto do chão) e numa área que cobre a tela da câmera do jogo. `acc` acumula a fração de partícula entre quadros. */
const dimColor = new THREE.Color();
const dim = (c: number) => dimColor.set(c).multiplyScalar(0.55).getHex();

export function stepMotes(fx: Fx, zone: ZoneDef, x: number, z: number, dt: number, acc: { v: number }): void {
  const m = zone.motes;
  acc.v += dt * m.rate;
  while (acc.v >= 1) {
    acc.v--;
    const px = x + (Math.random() - 0.5) * 48, pz = z - 6 + (Math.random() - 0.5) * 38;
    const py = 0.2 + Math.pow(Math.random(), 1.6) * 5;
    const roll = Math.random();
    if (roll < 0.05) {
      // acesa: um pouco maior, vive mais e brilha (bloom); baixa, longe da câmera
      fx.spark(px, Math.min(py, 3), pz, m.lit, 0.07 + Math.random() * 0.03, 3.5 + Math.random() * 2.5, m.rise * (0.3 + Math.random() * 0.5));
    } else if (roll < 0.2) {
      fx.spark(px, py, pz, m.color, 0.06 + Math.random() * 0.04, 2.5 + Math.random() * 2, m.rise * (0.5 + Math.random()));
    } else {
      // a maioria: pequena e apagada (cor escurecida), fazendo a camada de ar
      fx.spark(px, py, pz, dim(m.color), 0.02 + Math.random() * 0.02, 1.8 + Math.random() * 1.8, m.rise * (0.6 + Math.random()));
    }
  }
}
