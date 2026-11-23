// Faixa do escudo de frente (M9-01): uma parede curva e translúcida no arco que o escudo cobre, para o jogador ler de onde não
// adianta bater. Erguido = firme; piscando = vai cair; abaixado = some. Efeito mínimo da fase 1 (D17); o de verdade é da fase 2.
import * as THREE from "three";

export interface GuardBand {
  /** `yaw`: direção do escudo; `state`: 1 erguido, 0.5 piscando, 0 abaixado; `t`: relógio para o pisca */
  update(x: number, z: number, yaw: number, radius: number, height: number, state: number, t: number): void;
  /** o escudo segurou um golpe: brilha um instante */
  flash(): void;
  dispose(): void;
}

const geos = new Map<number, THREE.BufferGeometry>();

function bandGeo(arcDeg: number): THREE.BufferGeometry {
  let g = geos.get(arcDeg);
  if (!g) {
    const arc = (arcDeg * Math.PI) / 180;
    // cilindro aberto de raio 1 e altura 1, com o meio do arco em +z (a guinada 0)
    g = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true, -arc / 2, arc);
    g.translate(0, 0.5, 0);
    geos.set(arcDeg, g);
  }
  return g;
}

export function makeGuardBand(scene: THREE.Scene, arcDeg: number, color: number): GuardBand {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
    toneMapped: false, blending: THREE.AdditiveBlending });
  const mesh = new THREE.Mesh(bandGeo(arcDeg), mat);
  mesh.renderOrder = 12;
  scene.add(mesh);
  let shown = 0;
  let hit = 0;
  return {
    update(x, z, yaw, radius, height, state, t) {
      shown += (state - shown) * 0.25;
      hit = Math.max(0, hit - 0.06);
      mesh.visible = shown > 0.02;
      if (!mesh.visible) return;
      mesh.position.set(x, 0.05, z);
      mesh.rotation.y = yaw;
      const r = radius + 0.45;
      mesh.scale.set(r, height * 0.7, r);
      const blink = state > 0 && state < 1 ? (Math.sin(t * 22) > 0 ? 1 : 0.25) : 1;
      mat.opacity = Math.min(1, shown * (0.16 + Math.sin(t * 4) * 0.03) * blink + hit * 0.5);
    },
    flash() {
      hit = 1;
    },
    dispose() {
      mesh.removeFromParent();
      mat.dispose();
    },
  };
}
