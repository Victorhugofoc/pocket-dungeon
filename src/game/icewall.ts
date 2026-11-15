// Glacial Wall da Frostine (M19-02): parede de cristais de gelo atravessada na mira, que segura os inimigos e para os
// tiros deles. Porta de dungeon-idle src/spells/techniques.lua (Tech.icewall, collideWalls, blocksShot).
// Aqui fica a geometria, a colisão e o tempo; o dano e o congelamento são do game.ts (callbacks).
import * as THREE from "three";

export interface IceWall {
  x0: number; z0: number; x1: number; z1: number;
  /** direção da mira (sin, cos) e meia espessura */
  ax: number; az: number; hw: number;
  age: number; dur: number;
  damage: number; freeze: number; shatter: boolean;
  touched: Set<object>;
  ended: boolean;
  group: THREE.Group;
  crystals: { mesh: THREE.Mesh; delay: number; h: number }[];
}

interface Pusher { x: number; z: number; radius: number }

const GROW = 0.18;
const MELT = 0.35;

/** Cristal de 5 faces com ponta, base no chão, altura 1. */
function crystalGeometry(): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.0, 1, 1, 5, 1, false);
  g.translate(0, 0.5, 0);
  const body = new THREE.CylinderGeometry(1, 0.85, 0.55, 5, 1, false);
  body.translate(0, -0.2, 0);
  // junta corpo e ponta numa malha só
  const merged = new THREE.BufferGeometry();
  const a = g.toNonIndexed();
  const b = body.toNonIndexed();
  const pa = a.getAttribute("position").array as Float32Array;
  const pb = b.getAttribute("position").array as Float32Array;
  const pos = new Float32Array(pa.length + pb.length);
  pos.set(pa, 0);
  pos.set(pb, pa.length);
  merged.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  merged.translate(0, 0.2, 0);
  merged.computeVertexNormals();
  g.dispose(); body.dispose(); a.dispose(); b.dispose();
  return merged;
}

/** Geada do chão: retângulo de bordas suaves com manchas, gerado uma vez num canvas. */
function frostTexture(): THREE.Texture {
  const W = 256;
  const H = 64;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  for (let i = 0; i < 90; i++) {
    const x = W * (0.08 + Math.random() * 0.84);
    const y = H * (0.3 + Math.random() * 0.4);
    const r = 6 + Math.random() * 16;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class IceWalls {
  list: IceWall[] = [];
  private geo = crystalGeometry();
  private mat = new THREE.MeshStandardMaterial({
    color: 0xcdeeff, emissive: 0x3a9bd0, emissiveIntensity: 0.55, roughness: 0.12, metalness: 0.0,
    flatShading: true, transparent: true, opacity: 0.9,
  });
  private frostMat = new THREE.MeshBasicMaterial({ color: 0xbfe8ff, map: frostTexture(), transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false });
  private ghost: THREE.Mesh;

  constructor(private scene: THREE.Scene) {
    const gm = new THREE.MeshBasicMaterial({ color: 0x9fe6ff, transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false });
    this.ghost = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), gm);
    this.ghost.rotation.order = "YXZ";
    this.ghost.rotation.x = -Math.PI / 2;
    this.ghost.visible = false;
    scene.add(this.ghost);
  }

  /** Ponto e direção da parede: na mira, entre `minRange` e `maxRange` do herói (Tech.icewall.place). */
  static place(px: number, pz: number, aimX: number, aimZ: number, minRange: number, maxRange: number) {
    const dx = aimX - px;
    const dz = aimZ - pz;
    const d0 = Math.hypot(dx, dz);
    const ax = d0 > 1e-3 ? dx / d0 : 0;
    const az = d0 > 1e-3 ? dz / d0 : 1;
    const d = Math.max(minRange, Math.min(maxRange, d0));
    return { x: px + ax * d, z: pz + az * d, ax, az };
  }

  /** Mostra onde a parede vai subir (a prévia do original enquanto a técnica está pronta). */
  showGhost(on: boolean, x = 0, z = 0, ax = 0, az = 1, length = 1, thickness = 1): void {
    this.ghost.visible = on;
    if (!on) return;
    this.ghost.position.set(x, 0.06, z);
    this.ghost.rotation.y = Math.atan2(ax, az);
    this.ghost.scale.set(length, thickness, 1);
  }

  add(o: { x: number; z: number; ax: number; az: number; length: number; thickness: number; dur: number; damage: number; freeze: number; shatter: boolean }): IceWall {
    // a parede corre atravessada na mira: tangente = (az, -ax)
    const tx = o.az;
    const tz = -o.ax;
    const half = o.length / 2;
    const group = new THREE.Group();
    const crystals: IceWall["crystals"] = [];
    const n = Math.max(6, Math.round(o.length / 0.55));
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n;
      const s = (k - 0.5) * o.length;
      // mais altos no meio, menores nas pontas
      const mid = 1 - Math.pow(Math.abs(k - 0.5) * 2, 2.2);
      const h = (0.9 + mid * 1.5) * (0.75 + Math.random() * 0.5);
      const r = (0.32 + mid * 0.22) * (0.8 + Math.random() * 0.4);
      for (const off of [-1, 1]) {
        if (off === 1 && Math.random() < 0.45) continue;
        const mesh = new THREE.Mesh(this.geo, this.mat);
        const side = (off * o.thickness * 0.22) * (0.5 + Math.random());
        mesh.position.set(o.x + tx * s + o.ax * side, 0, o.z + tz * s + o.az * side);
        mesh.rotation.set((Math.random() - 0.5) * 0.35 + off * o.ax * 0.15, Math.random() * Math.PI, (Math.random() - 0.5) * 0.35 - off * o.az * 0.15);
        const hh = off === 1 ? h * 0.6 : h;
        mesh.scale.set(r, 0.001, r);
        mesh.castShadow = true;
        group.add(mesh);
        crystals.push({ mesh, delay: Math.abs(k - 0.5) * 0.12 + Math.random() * 0.04, h: hh });
      }
    }
    // geada no chão
    const frost = new THREE.Mesh(new THREE.PlaneGeometry(o.length + 2, o.thickness * 3), this.frostMat);
    frost.rotation.order = "YXZ";
    frost.rotation.set(-Math.PI / 2, Math.atan2(o.ax, o.az), 0);
    frost.position.set(o.x, 0.05, o.z);
    group.add(frost);
    this.scene.add(group);
    const w: IceWall = {
      x0: o.x - tx * half, z0: o.z - tz * half, x1: o.x + tx * half, z1: o.z + tz * half,
      ax: o.ax, az: o.az, hw: o.thickness / 2, age: 0, dur: o.dur,
      damage: o.damage, freeze: o.freeze, shatter: o.shatter, touched: new Set(), ended: false, group, crystals,
    };
    this.list.push(w);
    return w;
  }

  /** Distância do ponto ao segmento da parede e o vetor do ponto mais próximo até ele. */
  private seg(w: IceWall, x: number, z: number) {
    const sx = w.x1 - w.x0;
    const sz = w.z1 - w.z0;
    const l2 = sx * sx + sz * sz;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - w.x0) * sx + (z - w.z0) * sz) / l2)) : 0;
    const dx = x - (w.x0 + sx * t);
    const dz = z - (w.z0 + sz * t);
    return { d: Math.hypot(dx, dz), dx, dz };
  }

  /** Empurra para fora de todas as paredes; `onTouch` no primeiro contato com cada uma. */
  collide(e: Pusher, onTouch: (w: IceWall) => void): void {
    for (const w of this.list) {
      if (w.age > w.dur) continue;
      const r = e.radius + w.hw;
      let { d, dx, dz } = this.seg(w, e.x, e.z);
      if (d >= r) continue;
      if (d < 1e-3) {
        // em cima da linha: sai para o lado da parede de onde veio (para trás da mira)
        dx = -w.ax;
        dz = -w.az;
        d = 1;
      }
      e.x += (dx / d) * (r - d);
      e.z += (dz / d) * (r - d);
      if (!w.touched.has(e)) {
        w.touched.add(e);
        onTouch(w);
      }
    }
  }

  /** Um tiro inimigo bate na parede e quebra. */
  blocks(x: number, z: number, r: number): boolean {
    for (const w of this.list) if (w.age <= w.dur && this.seg(w, x, z).d < w.hw + r) return true;
    return false;
  }

  /** Avança o tempo; `onEnd` quando uma parede some (para o estilhaço da evolução). */
  update(dt: number, onEnd: (w: IceWall) => void): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const w = this.list[i];
      w.age += dt;
      const melt = w.age > w.dur ? Math.min(1, (w.age - w.dur) / MELT) : 0;
      for (const c of w.crystals) {
        const g = Math.min(1, Math.max(0, (w.age - c.delay) / GROW));
        // sobe com um leve passo além do tamanho e assenta
        const grow = g < 1 ? g * (1.12 - 0.12 * g) * (1 + 0.12 * Math.sin(g * Math.PI)) : 1;
        c.mesh.scale.y = Math.max(0.001, c.h * grow * (1 - melt));
      }
      if (w.age > w.dur && !w.ended) {
        w.ended = true;
        onEnd(w);
      }
      if (melt >= 1) {
        this.scene.remove(w.group);
        (w.group.children[w.group.children.length - 1] as THREE.Mesh).geometry.dispose();
        this.list.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const w of this.list) {
      this.scene.remove(w.group);
      (w.group.children[w.group.children.length - 1] as THREE.Mesh).geometry.dispose();
    }
    this.list.length = 0;
    this.ghost.visible = false;
  }
}
