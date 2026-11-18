// Time Rift do Aurelius (M19-03): disco arcano no chão com anéis girando que se fecham até a implosão.
// Porta de dungeon-idle src/spells/techniques.lua (Tech.rift). Aqui só o visual e o tempo; dano e lentidão no game.ts.
import * as THREE from "three";

export interface Rift {
  x: number; z: number; r: number;
  age: number; dur: number;
  slow: number; damage: number; perEnemy: number; maxMult: number; stun: number;
  group: THREE.Group;
  disk: THREE.Mesh; rings: THREE.Mesh[];
  /** efeito que acompanha a fenda (game.ts), encerrado junto */
  fx?: { kill(): void };
}

const COLOR = 0xc28cff;

export class Rifts {
  list: Rift[] = [];
  private diskGeo = new THREE.CircleGeometry(1, 48);
  private ringGeo = new THREE.RingGeometry(0.975, 1, 64, 1);
  /** anel tracejado: 12 arcos */
  private dashGeo: THREE.BufferGeometry;

  constructor(private scene: THREE.Scene) {
    const parts: number[] = [];
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2) / n * 0.55;
      const seg = 6;
      for (let k = 0; k < seg; k++) {
        const t0 = a0 + ((a1 - a0) * k) / seg;
        const t1 = a0 + ((a1 - a0) * (k + 1)) / seg;
        const r0 = 0.82;
        const r1 = 0.845;
        const p = (r: number, t: number) => [Math.cos(t) * r, Math.sin(t) * r, 0];
        parts.push(...p(r0, t0), ...p(r1, t0), ...p(r1, t1), ...p(r0, t0), ...p(r1, t1), ...p(r0, t1));
      }
    }
    this.dashGeo = new THREE.BufferGeometry();
    this.dashGeo.setAttribute("position", new THREE.Float32BufferAttribute(parts, 3));
  }

  private mat(opacity: number): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({ color: COLOR, transparent: true, opacity, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  }

  add(o: Omit<Rift, "age" | "group" | "disk" | "rings">): Rift {
    const group = new THREE.Group();
    group.position.set(o.x, 0.08, o.z);
    const disk = new THREE.Mesh(this.diskGeo, this.mat(0.06));
    disk.rotation.x = -Math.PI / 2;
    group.add(disk);
    const rings = [new THREE.Mesh(this.ringGeo, this.mat(0.7)), new THREE.Mesh(this.dashGeo, this.mat(0.35)), new THREE.Mesh(this.dashGeo, this.mat(0.25))];
    rings.forEach((m, i) => {
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.01 * (i + 1);
      group.add(m);
    });
    group.scale.setScalar(0.001);
    this.scene.add(group);
    const r: Rift = { ...o, age: 0, group, disk, rings };
    this.list.push(r);
    return r;
  }

  /** Ponto dentro de alguma fenda (para parar os tiros inimigos). */
  inside(x: number, z: number): boolean {
    for (const r of this.list) if ((x - r.x) ** 2 + (z - r.z) ** 2 <= r.r * r.r) return true;
    return false;
  }

  /** Avança o tempo; `onImplode` quando a fenda acaba. */
  update(dt: number, onImplode: (r: Rift) => void): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const r = this.list[i];
      r.age += dt;
      const k = r.age / r.dur;
      // abre rápido, fica, e nos últimos 25% os anéis se fecham para o centro
      const open = Math.min(1, r.age / 0.2);
      const close = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
      r.group.scale.setScalar(r.r * open);
      r.rings[0].scale.setScalar(Math.max(0.05, close));
      r.rings[1].scale.setScalar(Math.max(0.05, close * 0.95));
      r.rings[2].scale.setScalar(Math.max(0.05, close * 0.62));
      r.rings[1].rotation.z += dt * 1.4;
      r.rings[2].rotation.z -= dt * 2.3;
      // o disco se apaga enquanto os anéis se fecham: tudo é puxado para o centro (com bloom, clarear virava placa)
      (r.disk.material as THREE.MeshBasicMaterial).opacity = (0.05 + Math.sin(r.age * 7) * 0.02) * close;
      if (r.age >= r.dur) {
        onImplode(r);
        this.dispose(r);
        this.list.splice(i, 1);
      }
    }
  }

  private dispose(r: Rift): void {
    r.fx?.kill();
    this.scene.remove(r.group);
    (r.disk.material as THREE.Material).dispose();
    for (const m of r.rings) (m.material as THREE.Material).dispose();
  }

  clear(): void {
    for (const r of this.list) this.dispose(r);
    this.list.length = 0;
  }
}
