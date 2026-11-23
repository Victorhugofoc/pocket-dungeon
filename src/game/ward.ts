// M9-04: a aura do Warden no chão (telegraphs.lua `WF.wardenAura`): disco azul fraco, anel tracejado girando e três escudinhos
// de luz dando a volta. Só o visual; a redução de dano fica em Game.damageEnemy (core/ward.ts).
import * as THREE from "three";
import type { Enemy } from "./enemy";

const COLOR = 0x8cd9ff;
const DASHES = 24;

interface Aura {
  root: THREE.Group;
  ring: THREE.Mesh;
  shields: THREE.Mesh[];
  mats: THREE.Material[];
}

const DISC = new THREE.CircleGeometry(1, 40);
/** anel tracejado: 24 arcos curtos, como lá */
const RING = (() => {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < DASHES; i++) {
    const a0 = (i / DASHES) * Math.PI * 2;
    parts.push(new THREE.RingGeometry(0.97, 1.0, 4, 1, a0, 0.13));
  }
  const pos: number[] = [];
  const idx: number[] = [];
  let base = 0;
  for (const g of parts) {
    const p = g.getAttribute("position");
    for (let k = 0; k < p.count; k++) pos.push(p.getX(k), p.getY(k), p.getZ(k));
    const ix = g.getIndex()!;
    for (let k = 0; k < ix.count; k++) idx.push(ix.getX(k) + base);
    base += p.count;
    g.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
})();
/** escudinho: pentágono com ponta para baixo, deitado no chão */
const SHIELD = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.3, 0.36);
  s.lineTo(0.3, 0.36);
  s.lineTo(0.3, 0);
  s.lineTo(0, -0.42);
  s.lineTo(-0.3, 0);
  s.closePath();
  return new THREE.ShapeGeometry(s);
})();

export class WardAuras {
  private auras = new Map<Enemy, Aura>();

  constructor(private scene: THREE.Scene) {}

  update(enemies: readonly Enemy[], t: number): void {
    for (const e of enemies) {
      const r = e.def?.support?.radius;
      if (!r || e.dead) continue;
      let a = this.auras.get(e);
      if (!a) {
        a = this.make(r);
        this.auras.set(e, a);
      }
      a.root.position.set(e.x, 0.05, e.z);
      a.ring.rotation.z = -t * 0.3;
      a.shields.forEach((s, i) => {
        const ang = (i / 3) * Math.PI * 2 + t * 0.8;
        s.position.set(Math.cos(ang) * r * 0.85, 0.02, Math.sin(ang) * r * 0.85);
      });
    }
    for (const [e, a] of this.auras) {
      if (e.dead || !enemies.includes(e)) {
        this.dispose(a);
        this.auras.delete(e);
      }
    }
  }

  clear(): void {
    for (const a of this.auras.values()) this.dispose(a);
    this.auras.clear();
  }

  private make(r: number): Aura {
    const root = new THREE.Group();
    const mk = (opacity: number) => new THREE.MeshBasicMaterial({ color: COLOR, transparent: true, opacity, depthWrite: false, toneMapped: false });
    const discM = mk(0.06), ringM = mk(0.4), shieldM = mk(0.85);
    const disc = new THREE.Mesh(DISC, discM);
    disc.rotation.x = -Math.PI / 2;
    disc.scale.setScalar(r);
    const ring = new THREE.Mesh(RING, ringM);
    ring.rotation.x = -Math.PI / 2;
    ring.scale.setScalar(r);
    root.add(disc, ring);
    const shields: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(SHIELD, shieldM);
      s.rotation.x = -Math.PI / 2;
      shields.push(s);
      root.add(s);
    }
    this.scene.add(root);
    return { root, ring, shields, mats: [discM, ringM, shieldM] };
  }

  private dispose(a: Aura): void {
    a.root.removeFromParent();
    for (const m of a.mats) m.dispose();
  }
}
