// M21-08: as cartas do mapa da partida. M21-15: ao fim da onda, 2 ou 3 altares em leque na arena (antes portões);
// E perto de um escolhe a carta. Arte por código: pedestal de pedra, laje e gema acesas na cor da carta, o chão
// aceso e a placa com o nome. Parte 2: o sinal de longe de cada sala
// (`GATE_SIGNAL`): coluna de luz, partículas do tipo e raios do céu na emboscada de chefe.
import * as THREE from "three";
import type { GateSpot, MapCard } from "../core/runmap";
import { GATE_SIGNAL, MAP_NODE, type GateMotes } from "../data/map-nodes";
import { ROOM_BY_ID } from "../data/rooms";
import { TUNING } from "../data/tuning";
import type { VfxHandle } from "./vfx";

const G = TUNING.world.gates;
/** altura do topo da laje do altar */
const ALTAR_H = 1.25;

interface Gate {
  root: THREE.Group;
  spot: GateSpot;
  glow: THREE.MeshBasicMaterial[];
  /** a gema que flutua em cima do altar */
  gem: THREE.Mesh;
  card: MapCard;
  color: number;
  beam: VfxHandle;
  /** segundos até a próxima partícula (ou raio) */
  next: number;
}

/** O pedaço do `Fx` que os sinais usam. */
export interface GateFx {
  glow(x: number, y: number, z: number, color: number, size: number, life: number, vx?: number, vy?: number, vz?: number, grav?: number): void;
  spark(x: number, y: number, z: number, color: number, size?: number, life?: number, vy?: number): void;
  flashLight(x: number, y: number, z: number, color: number, power: number, dur?: number): void;
  lib: {
    pillar(x: number, z: number, o: { color: number; radius: number; height: number; dur?: number; power?: number; speed?: number }): VfxHandle;
    lightning(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number,
      o: { color: number; core?: number; dur?: number; width?: number; branches?: number; rate?: number }): unknown;
  };
}

function label(card: MapCard): THREE.SpriteMaterial {
  const n = MAP_NODE[card.node];
  const room = card.room ? ROOM_BY_ID[card.room]?.name : undefined;
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 160;
  const c = cv.getContext("2d")!;
  c.fillStyle = "rgba(12,10,14,0.82)";
  c.strokeStyle = n.color;
  c.lineWidth = 6;
  c.beginPath();
  c.roundRect(6, 6, 500, 148, 18);
  c.fill();
  c.stroke();
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = n.color;
  c.font = "bold 52px Georgia, serif";
  c.fillText(n.name, 256, room ? 56 : 80, 480);
  if (room) {
    c.fillStyle = "#f2e8d8";
    c.font = "36px Georgia, serif";
    c.fillText(room, 256, 112, 480);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.SpriteMaterial({ map: tex, depthWrite: false, toneMapped: false, transparent: true });
}

export class MapGates {
  private gates: Gate[] = [];
  private stone = new THREE.MeshStandardMaterial({ color: 0x5d5a55, roughness: 0.95 });
  private baseGeo = new THREE.CylinderGeometry(1.05, 1.2, 0.3, 8);
  private columnGeo = new THREE.CylinderGeometry(0.55, 0.7, ALTAR_H - 0.5, 8);
  private slabGeo = new THREE.CylinderGeometry(0.9, 0.8, 0.2, 8);
  private gemGeo = new THREE.OctahedronGeometry(0.42, 0);
  private ringGeo = new THREE.RingGeometry(0.72, 1, 40);
  private discGeo = new THREE.CircleGeometry(1, 40);

  constructor(private scene: THREE.Scene, private fx: GateFx) {}

  /** Posição e cor de cada portão (o minimapa). */
  get marks(): { x: number; z: number; color: string }[] {
    return this.gates.map((g) => ({ x: g.spot.x, z: g.spot.z, color: MAP_NODE[g.card.node].color }));
  }

  get count(): number {
    return this.gates.length;
  }

  show(spots: readonly GateSpot[], cards: readonly MapCard[]): void {
    this.hide();
    spots.forEach((spot, i) => {
      const card = cards[i];
      const color = new THREE.Color(MAP_NODE[card.node].color);
      const root = new THREE.Group();
      root.position.set(spot.x, 0, spot.z);
      root.rotation.y = -spot.angle + Math.PI / 2;
      const glow: THREE.MeshBasicMaterial[] = [];
      // pedestal: base larga, coluna e a laje acesa em cima
      const base = new THREE.Mesh(this.baseGeo, this.stone);
      base.position.y = 0.15;
      const column = new THREE.Mesh(this.columnGeo, this.stone);
      column.position.y = 0.3 + (ALTAR_H - 0.5) / 2;
      for (const m of [base, column]) {
        m.castShadow = true;
        root.add(m);
      }
      const slabMat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
      glow.push(slabMat);
      const slab = new THREE.Mesh(this.slabGeo, slabMat);
      slab.position.y = ALTAR_H - 0.1;
      root.add(slab);
      const gem = new THREE.Mesh(this.gemGeo, slabMat);
      gem.position.y = ALTAR_H + 0.8;
      root.add(gem);
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
      const discMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
      glow.push(ringMat, discMat);
      for (const [geo, mat] of [[this.ringGeo, ringMat], [this.discGeo, discMat]] as const) {
        const m = new THREE.Mesh(geo, mat);
        m.rotation.x = -Math.PI / 2;
        m.position.y = 0.07;
        m.scale.setScalar(G.width / 2);
        m.renderOrder = 8;
        root.add(m);
      }
      const sign = new THREE.Sprite(label(card));
      sign.scale.set(4.6, 1.44, 1);
      sign.position.y = ALTAR_H + 2.4;
      sign.renderOrder = 15;
      root.add(sign);
      this.scene.add(root);
      const sig = GATE_SIGNAL[card.node];
      const beam = this.fx.lib.pillar(spot.x, spot.z, { color: color.getHex(), radius: G.width * 0.42, height: sig.beam, dur: Infinity, power: 0.6, speed: 3 });
      this.gates.push({ root, spot, glow, gem, card, color: color.getHex(), beam, next: Math.random() * sig.every });
    });
  }

  /** Índice do portão mais perto dentro de `reach` (a dica da carta no HUD), ou -1. */
  nearest(x: number, z: number, reach: number, allow?: (i: number) => boolean): number {
    let best = -1;
    let bd = reach;
    this.gates.forEach((g, i) => {
      if (allow && !allow(i)) return;
      const d = Math.hypot(x - g.spot.x, z - g.spot.z);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  }

  update(time: number, dt: number): void {
    const k = 0.5 + 0.5 * Math.sin(time * 3);
    for (const g of this.gates) {
      g.glow[1].opacity = 0.55 + 0.35 * k;
      g.glow[2].opacity = 0.14 + 0.14 * k;
      g.gem.rotation.y = time * 1.4;
      g.gem.position.y = ALTAR_H + 0.8 + Math.sin(time * 2 + g.spot.angle) * 0.15;
      const sig = GATE_SIGNAL[g.card.node];
      g.next -= dt;
      while (g.next <= 0) {
        g.next += sig.every * (0.6 + Math.random() * 0.8);
        this.mote(g, sig.motes, sig.beam);
      }
    }
  }

  /** Uma partícula do sinal (ou um raio do céu). */
  private mote(g: Gate, kind: GateMotes, h: number): void {
    const fx = this.fx;
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * G.width * 0.45;
    const x = g.spot.x + Math.cos(a) * r;
    const z = g.spot.z + Math.sin(a) * r;
    const jit = () => (Math.random() - 0.5) * 0.8;
    switch (kind) {
      case "embers":
        fx.glow(x, 0.3, z, Math.random() < 0.5 ? 0xff7a2a : 0xffb347, 0.22, 1.6, jit(), 3 + Math.random() * 3, jit(), -0.4);
        break;
      case "smoke":
        fx.glow(x, 0.4, z, Math.random() < 0.5 ? 0x5b2a86 : 0x8c4fd0, 0.7 + Math.random() * 0.5, 2.4, jit(), 1.4 + Math.random(), jit(), 0);
        break;
      case "sparks":
        fx.spark(x, 0.5 + Math.random() * h * 0.6, z, Math.random() < 0.5 ? 0xffe27a : 0xffc83d, 0.16, 0.6, 2.5);
        break;
      case "coins":
        fx.glow(x, h * (0.5 + Math.random() * 0.4), z, 0xffd34d, 0.2, 1.6, 0, -0.5, 0, 4);
        break;
      case "motes":
        fx.glow(x, 0.3 + Math.random(), z, g.color, 0.18, 2.2, 0, 2 + Math.random() * 2, 0, 0);
        break;
      case "lightning":
        fx.lib.lightning(x + (Math.random() - 0.5) * 3, h + 4, z + (Math.random() - 0.5) * 3, g.spot.x, 0.2, g.spot.z,
          { color: g.color, core: 0xffffff, width: 0.22, branches: 3, rate: 0.05, dur: 0.28 });
        fx.flashLight(g.spot.x, 3, g.spot.z, g.color, 1.6, 0.3);
        fx.glow(x, 0.4, z, 0xff4a3a, 0.5, 1.2, 0, 2, 0, 0);
        break;
    }
  }

  hide(): void {
    for (const g of this.gates) {
      g.beam.kill(0.3);
      g.root.removeFromParent();
      for (const m of g.glow) m.dispose();
      for (const o of g.root.children) if (o instanceof THREE.Sprite) {
        o.material.map?.dispose();
        o.material.dispose();
      }
    }
    this.gates = [];
  }
}
