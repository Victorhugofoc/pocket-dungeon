// M21-08: os portões do mapa da partida. Ao fim da onda, 2 ou 3 portões em leque na borda da clareira vencida
// (ou em volta da fogueira, na zona nova); passar por um escolhe a carta. Arte por código: duas colunas de pedra,
// a verga e o chão acesos na cor da carta, e a placa com o nome. Os sinais de longe de cada sala ficam na parte 2.
import * as THREE from "three";
import type { GateSpot, MapCard } from "../core/runmap";
import { MAP_NODE } from "../data/map-nodes";
import { ROOM_BY_ID } from "../data/rooms";
import { TUNING } from "../data/tuning";

const G = TUNING.world.gates;
const PILLAR_H = 3.4;

interface Gate {
  root: THREE.Group;
  spot: GateSpot;
  glow: THREE.MeshBasicMaterial[];
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
  private pillarGeo = new THREE.CylinderGeometry(0.32, 0.42, PILLAR_H, 7);
  private capGeo = new THREE.BoxGeometry(1, 0.34, 0.6);
  private ringGeo = new THREE.RingGeometry(0.72, 1, 40);
  private discGeo = new THREE.CircleGeometry(1, 40);

  constructor(private scene: THREE.Scene) {}

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
      // o vão do portão fica de frente para fora do leque: as colunas, na tangente do círculo
      root.rotation.y = -spot.angle + Math.PI / 2;
      const glow: THREE.MeshBasicMaterial[] = [];
      for (const side of [-1, 1]) {
        const p = new THREE.Mesh(this.pillarGeo, this.stone);
        p.position.set((side * G.width) / 2, PILLAR_H / 2, 0);
        p.castShadow = true;
        root.add(p);
      }
      const lintelMat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
      glow.push(lintelMat);
      const lintel = new THREE.Mesh(this.capGeo, lintelMat);
      lintel.scale.x = G.width + 1;
      lintel.position.y = PILLAR_H + 0.1;
      root.add(lintel);
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
      sign.position.y = PILLAR_H + 1.5;
      sign.renderOrder = 15;
      root.add(sign);
      this.scene.add(root);
      this.gates.push({ root, spot, glow });
    });
  }

  /** Índice do portão por onde o herói passa agora, ou -1. */
  hit(x: number, z: number): number {
    return this.gates.findIndex((g) => Math.hypot(x - g.spot.x, z - g.spot.z) < G.triggerRadius);
  }

  /** Índice do portão mais perto dentro de `reach` (a dica da carta no HUD), ou -1. */
  nearest(x: number, z: number, reach: number): number {
    let best = -1;
    let bd = reach;
    this.gates.forEach((g, i) => {
      const d = Math.hypot(x - g.spot.x, z - g.spot.z);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  }

  update(time: number): void {
    const k = 0.5 + 0.5 * Math.sin(time * 3);
    for (const g of this.gates) {
      g.glow[1].opacity = 0.55 + 0.35 * k;
      g.glow[2].opacity = 0.14 + 0.14 * k;
    }
  }

  hide(): void {
    for (const g of this.gates) {
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
