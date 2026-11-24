// M10-10: a linha de luz que liga cada Selo de Alma ao Hollow King enquanto o selo estiver de pé (Soul Tether).
import * as THREE from "three";

const GEO = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
const UP = new THREE.Vector3(0, 1, 0);
const A = new THREE.Vector3();
const B = new THREE.Vector3();
const D = new THREE.Vector3();

export class TetherBeam {
  private readonly core: THREE.Mesh;
  private readonly halo: THREE.Mesh;
  private readonly mats: THREE.MeshBasicMaterial[];

  constructor(private readonly scene: THREE.Scene, color: number) {
    const mk = (opacity: number) =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
    this.mats = [mk(0.85), mk(0.22)];
    this.core = new THREE.Mesh(GEO, this.mats[0]);
    this.halo = new THREE.Mesh(GEO, this.mats[1]);
    this.core.renderOrder = this.halo.renderOrder = 5;
    scene.add(this.core, this.halo);
  }

  /** do ponto a ao b; `t` em s faz a luz pulsar correndo do selo ao chefe */
  update(ax: number, ay: number, az: number, bx: number, by: number, bz: number, t: number): void {
    A.set(ax, ay, az);
    B.set(bx, by, bz);
    D.subVectors(B, A);
    const len = D.length();
    const pulse = 0.5 + 0.5 * Math.sin(t * 7);
    for (const [m, r] of [[this.core, 0.035 + pulse * 0.015], [this.halo, 0.12 + pulse * 0.04]] as const) {
      m.position.copy(A).addScaledVector(D, 0.5);
      m.quaternion.setFromUnitVectors(UP, D.normalize());
      D.multiplyScalar(len);
      m.scale.set(r, len, r);
    }
    this.mats[0].opacity = 0.6 + pulse * 0.35;
  }

  dispose(): void {
    this.scene.remove(this.core, this.halo);
    for (const m of this.mats) m.dispose();
  }
}
