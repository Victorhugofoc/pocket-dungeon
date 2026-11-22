// M21-10: terreno na luta. Fossos (a beirada mata o inimigo comum empurrado; chefe e campeão não caem) e barris
// explosivos (qualquer golpe acende o pavio; a explosão fere todos em volta, o herói também, e empurra para fora).
// O lugar vem do worldgen (seed); aqui ficam o desenho, a colisão e os relógios. As pedras do gargalo são obstáculos
// comuns (`ObstacleGrid`).
import * as THREE from "three";
import type { Pit, Vec2, ZoneLayout } from "../core/worldgen";
import { TERRAIN } from "../data/terrain";

interface Barrel extends Vec2 {
  root: THREE.Group;
  top: THREE.MeshStandardMaterial;
  /** -1 apagado; senão segundos de pavio */
  fuse: number;
  gone: boolean;
}

/** O que o terreno precisa do jogo. */
export interface TerrainHost {
  scene: THREE.Scene;
  /** a explosão de um barril (dano, empurrão, efeito, som) */
  blast(x: number, z: number): void;
  fuseTick(x: number, z: number): void;
}

/** Corpo que o fosso pode engolir (o inimigo). */
export interface Faller extends Vec2 {
  radius: number;
  kx: number;
  kz: number;
  isBoss: boolean;
  champion: boolean;
}

const B = TERRAIN.barrel;
const BODY = new THREE.CylinderGeometry(0.42, 0.46, 1.0, 14);
BODY.translate(0, 0.5, 0);
const BAND = new THREE.CylinderGeometry(0.475, 0.475, 0.08, 14);
const LID = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 14);
LID.translate(0, 1.02, 0);
const WOOD = new THREE.MeshStandardMaterial({ color: 0x8a4b22, roughness: 0.9 });
const IRON = new THREE.MeshStandardMaterial({ color: 0x34343a, roughness: 0.6, metalness: 0.5 });
const PIT_PLANE = new THREE.PlaneGeometry(1, 1);
PIT_PLANE.rotateX(-Math.PI / 2);

/** Gradiente do fosso: preto no meio, beirada de terra escura que some no chão. */
let pitTex: THREE.CanvasTexture | null = null;
function pitTexture(): THREE.CanvasTexture {
  if (pitTex) return pitTex;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(0.62, "rgba(2,2,4,1)");
  g.addColorStop(0.74, "rgba(22,16,12,0.95)");
  g.addColorStop(0.84, "rgba(48,36,26,0.7)");
  g.addColorStop(1, "rgba(48,36,26,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  pitTex = new THREE.CanvasTexture(cv);
  pitTex.colorSpace = THREE.SRGBColorSpace;
  return pitTex;
}
/** o fosso desenhado vai até a beirada de terra: o raio de colisão é 0,74 do plano / 2 */
const PIT_DRAW = 1 / 0.74;

export class Terrain {
  pits: Pit[] = [];
  barrels: Barrel[] = [];
  private meshes: THREE.Object3D[] = [];
  private pitMat: THREE.MeshBasicMaterial | null = null;

  constructor(private host: TerrainHost) {}

  build(layout: ZoneLayout): void {
    this.clear();
    this.pitMat = new THREE.MeshBasicMaterial({ map: pitTexture(), transparent: true, depthWrite: false, toneMapped: false });
    for (const sg of layout.segments) {
      const t = sg.terrain;
      if (!t) continue;
      this.pits.push(t.pit);
      const m = new THREE.Mesh(PIT_PLANE, this.pitMat);
      m.position.set(t.pit.x, 0.035, t.pit.z);
      m.scale.setScalar(t.pit.r * 2 * PIT_DRAW);
      m.renderOrder = 1;
      this.host.scene.add(m);
      this.meshes.push(m);
      for (const b of t.barrels) this.addBarrel(b.x, b.z);
    }
  }

  private addBarrel(x: number, z: number): void {
    const root = new THREE.Group();
    const top = new THREE.MeshStandardMaterial({ color: 0xc8321e, roughness: 0.7, emissive: 0xff3a10, emissiveIntensity: 0.15 });
    const body = new THREE.Mesh(BODY, WOOD);
    const lid = new THREE.Mesh(LID, top);
    root.add(body, lid);
    for (const y of [0.22, 0.78]) {
      const band = new THREE.Mesh(BAND, IRON);
      band.position.y = y;
      root.add(band);
    }
    // faixa vermelha no meio: lê como "perigo" de longe
    const stripe = new THREE.Mesh(BAND, top);
    stripe.position.y = 0.5;
    stripe.scale.set(1.01, 1.6, 1.01);
    root.add(stripe);
    for (const c of root.children) c.castShadow = true;
    root.position.set(x, 0, z);
    root.rotation.y = Math.random() * Math.PI * 2;
    this.host.scene.add(root);
    this.barrels.push({ x, z, root, top, fuse: -1, gone: false });
  }

  /** Acende o pavio dos barris que o círculo toca. Devolve quantos acendeu agora. */
  strike(x: number, z: number, r: number): number {
    let n = 0;
    for (const b of this.barrels) {
      if (b.gone || b.fuse >= 0) continue;
      if ((b.x - x) ** 2 + (b.z - z) ** 2 > (r + B.radius) ** 2) continue;
      b.fuse = 0;
      n++;
    }
    return n;
  }

  /** Corte em arco (ataque corpo a corpo): acende os barris no alcance e dentro do ângulo. */
  strikeArc(x: number, z: number, facing: number, range: number, halfArc: number): void {
    for (const b of this.barrels) {
      if (b.gone || b.fuse >= 0) continue;
      const d = Math.hypot(b.x - x, b.z - z);
      if (d > range + B.radius) continue;
      let da = Math.atan2(b.x - x, b.z - z) - facing;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) <= halfArc || d < B.radius + 0.8) b.fuse = 0;
    }
  }

  /** Tiro que bate num barril: acende e o tiro para. */
  shot(x: number, z: number, r: number): boolean {
    for (const b of this.barrels) {
      if (b.gone) continue;
      if ((b.x - x) ** 2 + (b.z - z) ** 2 > (r + B.radius) ** 2) continue;
      if (b.fuse < 0) b.fuse = 0;
      return true;
    }
    return false;
  }

  /** Empurra o círculo para fora dos fossos e dos barris (herói e inimigo que anda). */
  resolve(pos: Vec2, r: number): void {
    for (const pt of this.pits) pushOut(pos, pt.x, pt.z, pt.r + r);
    for (const b of this.barrels) if (!b.gone) pushOut(pos, b.x, b.z, B.radius + r);
  }

  /** O ponto fica dentro de fosso ou barril (desvio dos inimigos). */
  blocks(x: number, z: number, r: number): boolean {
    for (const pt of this.pits) if ((x - pt.x) ** 2 + (z - pt.z) ** 2 < (pt.r + r) ** 2) return true;
    for (const b of this.barrels) if (!b.gone && (x - b.x) ** 2 + (z - b.z) ** 2 < (B.radius + r) ** 2) return true;
    return false;
  }

  /**
   * Inimigo na beirada: empurrado com força, passa da beirada e cai (devolve o fosso); andando, ou chefe e campeão,
   * é empurrado para fora como de uma pedra. Os barris também empurram para fora.
   */
  step(e: Faller): Pit | null {
    const fast = Math.hypot(e.kx, e.kz) > TERRAIN.pit.fallSpeed && !e.isBoss && !e.champion;
    for (const pt of this.pits) {
      const d = Math.hypot(e.x - pt.x, e.z - pt.z);
      if (d >= pt.r + e.radius) continue;
      if (fast) {
        if (d < pt.r - TERRAIN.pit.fallDepth) return pt;
        continue;
      }
      pushOut(e, pt.x, pt.z, pt.r + e.radius);
    }
    for (const b of this.barrels) if (!b.gone) pushOut(e, b.x, b.z, B.radius + e.radius);
    return null;
  }

  update(dt: number, now: number): void {
    for (const b of this.barrels) {
      if (b.gone || b.fuse < 0) continue;
      const before = b.fuse;
      b.fuse += dt;
      // pisca cada vez mais rápido e incha um pouco
      const k = Math.min(1, b.fuse / B.fuse);
      b.top.emissiveIntensity = 0.4 + (Math.sin(now * (18 + k * 40)) * 0.5 + 0.5) * (1.5 + k * 3);
      b.root.scale.setScalar(1 + k * 0.12);
      if (Math.floor(before * 10) !== Math.floor(b.fuse * 10)) this.host.fuseTick(b.x, b.z);
      if (b.fuse < B.fuse) continue;
      b.gone = true;
      b.root.removeFromParent();
      b.top.dispose();
      this.host.blast(b.x, b.z);
    }
  }

  /** Para o console: o que está na zona. */
  snapshot(): { pits: Pit[]; barrels: { x: number; z: number; fuse: number; gone: boolean }[] } {
    return { pits: this.pits, barrels: this.barrels.map((b) => ({ x: b.x, z: b.z, fuse: b.fuse, gone: b.gone })) };
  }

  clear(): void {
    for (const m of this.meshes) m.removeFromParent();
    this.meshes.length = 0;
    for (const b of this.barrels) {
      b.root.removeFromParent();
      b.top.dispose();
    }
    this.barrels.length = 0;
    this.pits.length = 0;
    this.pitMat?.dispose();
    this.pitMat = null;
  }
}

function pushOut(pos: Vec2, cx: number, cz: number, min: number): void {
  const dx = pos.x - cx, dz = pos.z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= min * min || d2 < 1e-6) return;
  const d = Math.sqrt(d2);
  pos.x = cx + (dx / d) * min;
  pos.z = cz + (dz / d) * min;
}
