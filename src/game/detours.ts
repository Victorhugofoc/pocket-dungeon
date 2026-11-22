// M21-09: os desvios opcionais ao lado do caminho (baú guardado, santuário de sangue, atalho). Arte por código:
// baú de madeira com cintas douradas, obelisco com a bacia acesa, marco de pedra com runas; anel no chão, placa
// com o nome e partículas da cor. A regra de cada um fica em `game.ts` (`useDetour`).
import * as THREE from "three";
import type { DetourSpot } from "../core/detours";
import { DETOUR, DETOURS } from "../data/detours";
import type { GateFx } from "./gates";

interface Detour {
  spot: DetourSpot;
  root: THREE.Group;
  glow: THREE.MeshBasicMaterial[];
  sign: THREE.Sprite;
  /** tampa do baú (abre ao usar) */
  lid: THREE.Object3D | null;
  used: boolean;
  /** segundos até a próxima partícula */
  next: number;
}

function label(name: string, color: number): THREE.SpriteMaterial {
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 112;
  const c = cv.getContext("2d")!;
  const css = `#${color.toString(16).padStart(6, "0")}`;
  c.fillStyle = "rgba(12,10,14,0.8)";
  c.strokeStyle = css;
  c.lineWidth = 5;
  c.beginPath();
  c.roundRect(6, 6, 500, 100, 16);
  c.fill();
  c.stroke();
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = css;
  c.font = "bold 50px Georgia, serif";
  c.fillText(name, 256, 58, 480);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.SpriteMaterial({ map: tex, depthWrite: false, toneMapped: false, transparent: true });
}

export class DetourField {
  private items: Detour[] = [];
  private stone = new THREE.MeshStandardMaterial({ color: 0x4a4744, roughness: 0.95 });
  private darkStone = new THREE.MeshStandardMaterial({ color: 0x2c2628, roughness: 0.9 });
  private wood = new THREE.MeshStandardMaterial({ color: 0x6b4426, roughness: 0.85 });
  private gold = new THREE.MeshStandardMaterial({ color: 0xd9a63a, roughness: 0.35, metalness: 0.8 });
  private ringGeo = new THREE.RingGeometry(0.82, 1, 40);
  private discGeo = new THREE.CircleGeometry(1, 40);

  constructor(private scene: THREE.Scene, private fx: GateFx) {}

  get list(): readonly { spot: DetourSpot; used: boolean }[] {
    return this.items;
  }

  /** Posição e cor de cada desvio ainda por usar (o minimapa). */
  get marks(): { x: number; z: number; color: string }[] {
    return this.items.filter((d) => !d.used).map((d) => ({ x: d.spot.x, z: d.spot.z, color: `#${DETOURS[d.spot.kind].color.toString(16).padStart(6, "0")}` }));
  }

  show(spots: readonly DetourSpot[]): void {
    this.hide();
    for (const spot of spots) {
      const def = DETOURS[spot.kind];
      const color = def.color;
      const root = new THREE.Group();
      root.position.set(spot.x, 0, spot.z);
      // de frente para o caminho
      root.rotation.y = -spot.facing + Math.PI / 2;
      const glow: THREE.MeshBasicMaterial[] = [];
      const lit = () => {
        const m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
        glow.push(m);
        return m;
      };
      const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = root) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.castShadow = !(mat instanceof THREE.MeshBasicMaterial);
        parent.add(m);
        return m;
      };
      let lid: THREE.Object3D | null = null;
      if (spot.kind === "chest") {
        add(new THREE.BoxGeometry(1.5, 0.8, 0.95), this.wood, 0, 0.4, 0);
        for (const x of [-0.55, 0.55]) add(new THREE.BoxGeometry(0.12, 0.84, 1), this.gold, x, 0.42, 0);
        // a tampa gira na dobradiça de trás
        const hinge = new THREE.Group();
        hinge.position.set(0, 0.8, -0.47);
        root.add(hinge);
        const top = add(new THREE.CylinderGeometry(0.47, 0.47, 1.5, 10, 1, false, 0, Math.PI), this.wood, 0, 0, 0.47, hinge);
        top.rotation.z = Math.PI / 2;
        top.rotation.y = Math.PI / 2;
        for (const x of [-0.55, 0.55]) {
          const band = add(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 10, 1, false, 0, Math.PI), this.gold, x, 0, 0.47, hinge);
          band.rotation.z = Math.PI / 2;
          band.rotation.y = Math.PI / 2;
        }
        add(new THREE.BoxGeometry(0.22, 0.26, 0.06), lit(), 0, 0.72, 0.5);
        lid = hinge;
      } else if (spot.kind === "shrine") {
        add(new THREE.CylinderGeometry(1.1, 1.3, 0.35, 6), this.darkStone, 0, 0.17, 0);
        const ob = add(new THREE.CylinderGeometry(0.22, 0.42, 2.6, 4), this.darkStone, 0, 1.65, -0.35);
        ob.rotation.y = Math.PI / 4;
        add(new THREE.CylinderGeometry(0.55, 0.3, 0.32, 12), this.stone, 0, 0.9, 0.45);
        add(new THREE.CylinderGeometry(0.46, 0.46, 0.05, 12), lit(), 0, 1.05, 0.45);
        add(new THREE.BoxGeometry(0.1, 0.7, 0.05), lit(), 0, 2.0, -0.12);
      } else {
        for (const [x, h] of [[-1.1, 1.7], [1.1, 1.3]] as const) {
          const st = add(new THREE.BoxGeometry(0.55, h, 0.4), this.stone, x, h / 2, 0);
          st.rotation.z = x * -0.06;
          add(new THREE.BoxGeometry(0.08, h * 0.55, 0.02), lit(), x, h * 0.55, 0.21);
        }
        // pedras de passo para fora do caminho
        for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(0.32, 0.36, 0.08, 7), this.stone, (i % 2 ? 0.25 : -0.25), 0.04, -1 - i * 0.9);
      }
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
      const discMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
      glow.push(ringMat, discMat);
      for (const [geo, mat] of [[this.ringGeo, ringMat], [this.discGeo, discMat]] as const) {
        const m = new THREE.Mesh(geo, mat);
        m.rotation.x = -Math.PI / 2;
        m.position.y = 0.06;
        m.scale.setScalar(DETOUR.useRadius);
        m.renderOrder = 8;
        root.add(m);
      }
      const sign = new THREE.Sprite(label(def.name, color));
      sign.scale.set(3.6, 0.8, 1);
      sign.position.y = 3.4;
      sign.renderOrder = 15;
      root.add(sign);
      this.scene.add(root);
      this.items.push({ spot, root, glow, sign, lid, used: false, next: Math.random() });
    }
  }

  /** Índice do desvio por usar mais perto dentro de `reach`, ou -1. */
  nearest(x: number, z: number, reach: number): number {
    let best = -1;
    let bd = reach;
    this.items.forEach((d, i) => {
      if (d.used) return;
      const dd = Math.hypot(x - d.spot.x, z - d.spot.z);
      if (dd < bd) {
        bd = dd;
        best = i;
      }
    });
    return best;
  }

  /** Usado: apaga o brilho, tira a placa e abre o baú. */
  markUsed(i: number): void {
    const d = this.items[i];
    if (!d || d.used) return;
    d.used = true;
    d.sign.visible = false;
    for (const m of d.glow) m.color.multiplyScalar(0.25);
    const color = DETOURS[d.spot.kind].color;
    this.fx.flashLight(d.spot.x, 2, d.spot.z, color, 1.4, 0.4);
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2;
      this.fx.glow(d.spot.x, 0.8, d.spot.z, color, 0.24, 0.9, Math.cos(a) * 3, 2.5, Math.sin(a) * 3, 3);
    }
  }

  update(time: number, dt: number): void {
    const k = 0.5 + 0.5 * Math.sin(time * 2.4);
    for (const d of this.items) {
      if (d.lid && d.used) d.lid.rotation.x = Math.max(d.lid.rotation.x - dt * 4, -1.9);
      if (d.used) continue;
      const n = d.glow.length;
      d.glow[n - 2].opacity = 0.45 + 0.35 * k;
      d.glow[n - 1].opacity = 0.1 + 0.1 * k;
      d.next -= dt;
      if (d.next > 0) continue;
      d.next = 0.25 + Math.random() * 0.3;
      const color = DETOURS[d.spot.kind].color;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * DETOUR.useRadius * 0.8;
      this.fx.glow(d.spot.x + Math.cos(a) * r, 0.3, d.spot.z + Math.sin(a) * r, color, 0.16, 1.8, 0, 1.6 + Math.random(), 0, 0);
    }
  }

  hide(): void {
    for (const d of this.items) {
      d.root.removeFromParent();
      d.root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry !== this.ringGeo && o.geometry !== this.discGeo && o.geometry.dispose();
      });
      for (const m of d.glow) m.dispose();
      d.sign.material.map?.dispose();
      d.sign.material.dispose();
    }
    this.items = [];
  }
}
