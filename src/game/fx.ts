// Efeitos: partículas instanciadas, telegrafias no chão, ondas de choque, arcos de golpe e números flutuantes.
import * as THREE from "three";

interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number; max: number; size: number; gravity: number;
  r: number; g: number; b: number;
}

export interface Telegraph {
  kind: "circle" | "rect";
  t: number;
  dur: number;
  outline: THREE.Mesh;
  fill: THREE.Mesh;
  onDone: () => void;
  cancelled?: boolean;
  r: number;
  x: number;
  z: number;
  angle: number;
  length: number;
  width: number;
}

interface Transient {
  mesh: THREE.Mesh;
  t: number;
  dur: number;
  grow: number;
  base: number;
  ownGeometry: boolean;
}

interface FloatText {
  el: HTMLDivElement;
  pos: THREE.Vector3;
  t: number;
  dur: number;
}

const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();
const tmpV = new THREE.Vector3();

export class Fx {
  private particles: Particle[] = [];
  private pMesh: THREE.InstancedMesh;
  private readonly cap = 1800;
  telegraphs: Telegraph[] = [];
  private transients: Transient[] = [];
  private texts: FloatText[] = [];
  private textPool: HTMLDivElement[] = [];
  private circleGeo = new THREE.CircleGeometry(1, 48);
  private ringGeo = new THREE.RingGeometry(0.93, 1, 48);
  private waveGeo = new THREE.RingGeometry(0.8, 1, 48);
  private planeGeo = new THREE.PlaneGeometry(1, 1);
  private matOutline = new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.22, depthWrite: false });
  private matEdge = new THREE.MeshBasicMaterial({ color: 0xff5a4a, transparent: true, opacity: 0.9, depthWrite: false });
  private matFill = new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.42, depthWrite: false });
  shake = 0;

  constructor(private scene: THREE.Scene, private textLayer: HTMLElement) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
    this.pMesh = new THREE.InstancedMesh(geo, mat, this.cap);
    this.pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pMesh.frustumCulled = false;
    this.pMesh.count = 0;
    this.pMesh.setColorAt(0, tmpColor.set(0xffffff));
    scene.add(this.pMesh);
  }

  burst(x: number, y: number, z: number, color: number, count: number, speed = 6, size = 0.16, life = 0.5, gravity = 14): void {
    tmpColor.set(color);
    for (let i = 0; i < count && this.particles.length < this.cap; i++) {
      const a = Math.random() * Math.PI * 2;
      const up = Math.random();
      const s = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x, y, z,
        vx: Math.cos(a) * s * (1 - up * 0.5), vy: up * s * 0.9 + 1, vz: Math.sin(a) * s * (1 - up * 0.5),
        life: life * (0.6 + Math.random() * 0.7), max: life, size: size * (0.6 + Math.random() * 0.8), gravity,
        r: tmpColor.r, g: tmpColor.g, b: tmpColor.b,
      });
    }
  }

  /** partícula única, lenta (rastro, brasa) */
  spark(x: number, y: number, z: number, color: number, size = 0.12, life = 0.35, vy = 0.5): void {
    if (this.particles.length >= this.cap) return;
    tmpColor.set(color);
    this.particles.push({
      x, y, z, vx: (Math.random() - 0.5) * 0.8, vy, vz: (Math.random() - 0.5) * 0.8,
      life, max: life, size, gravity: 0, r: tmpColor.r, g: tmpColor.g, b: tmpColor.b,
    });
  }

  private ground(mesh: THREE.Mesh, x: number, z: number, y: number): void {
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.renderOrder = 2;
    this.scene.add(mesh);
  }

  telegraphCircle(x: number, z: number, r: number, dur: number, onDone: () => void): Telegraph {
    const outline = new THREE.Mesh(this.circleGeo, this.matOutline);
    outline.scale.setScalar(r);
    this.ground(outline, x, z, 0.06);
    const edge = new THREE.Mesh(this.ringGeo, this.matEdge);
    outline.add(edge);
    edge.position.z = 0.01;
    const fill = new THREE.Mesh(this.circleGeo, this.matFill);
    fill.scale.setScalar(0.01);
    this.ground(fill, x, z, 0.08);
    const tg: Telegraph = { kind: "circle", t: 0, dur, outline, fill, onDone, r, x, z, angle: 0, length: 0, width: 0 };
    this.telegraphs.push(tg);
    return tg;
  }

  /** retângulo que parte de (x,z) na direção `angle` (rad, atan2(dx,dz)) */
  telegraphRect(x: number, z: number, angle: number, length: number, width: number, dur: number, onDone: () => void): Telegraph {
    const mk = (m: THREE.Material, y: number) => {
      const pivot = new THREE.Mesh(this.planeGeo, m);
      pivot.rotation.order = "YXZ";
      pivot.rotation.set(-Math.PI / 2, angle, 0);
      pivot.position.set(x + Math.sin(angle) * length / 2, y, z + Math.cos(angle) * length / 2);
      pivot.scale.set(width, length, 1);
      pivot.renderOrder = 2;
      this.scene.add(pivot);
      return pivot;
    };
    const outline = mk(this.matOutline, 0.06);
    const fill = mk(this.matFill, 0.08);
    const tg: Telegraph = { kind: "rect", t: 0, dur, outline, fill, onDone, r: 0, x, z, angle, length, width };
    fill.scale.set(width, 0.01, 1);
    this.telegraphs.push(tg);
    return tg;
  }

  cancelTelegraph(tg: Telegraph): void {
    tg.cancelled = true;
  }

  /** anel que se expande e some */
  shockwave(x: number, z: number, r: number, color: number, dur = 0.35): void {
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(this.waveGeo, m);
    this.ground(mesh, x, z, 0.12);
    mesh.scale.setScalar(0.2);
    this.transients.push({ mesh, t: 0, dur, grow: r, base: 0.2, ownGeometry: false });
  }

  /** arco de golpe corpo a corpo */
  slash(x: number, z: number, angle: number, range: number, arcDeg: number, color: number): void {
    const arc = (arcDeg * Math.PI) / 180;
    const geo = new THREE.RingGeometry(range * 0.45, range, 20, 1, Math.PI / 2 - angle - arc / 2, arc);
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const mesh = new THREE.Mesh(geo, m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 1.0, z);
    // RingGeometry está no plano XY; após girar -90° em X, +Y vira -Z. Espelha Z para casar com atan2(dx,dz).
    mesh.scale.set(1, -1, 1);
    this.scene.add(mesh);
    this.transients.push({ mesh, t: 0, dur: 0.16, grow: 1.08, base: 1, ownGeometry: true });
  }

  /** feixe/linha no chão que some (teleporte, investida) */
  streak(x0: number, z0: number, x1: number, z1: number, width: number, color: number, dur = 0.3): void {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const angle = Math.atan2(x1 - x0, z1 - z0);
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(this.planeGeo, m);
    mesh.rotation.order = "YXZ";
    mesh.rotation.set(-Math.PI / 2, angle, 0);
    mesh.position.set((x0 + x1) / 2, 0.5, (z0 + z1) / 2);
    mesh.scale.set(width, len, 1);
    this.scene.add(mesh);
    this.transients.push({ mesh, t: 0, dur, grow: 0, base: 0, ownGeometry: false });
  }

  text(x: number, y: number, z: number, str: string, cls = ""): void {
    if (this.texts.length > 60) return;
    const el = this.textPool.pop() ?? document.createElement("div");
    el.className = "float-text " + cls;
    el.textContent = str;
    this.textLayer.appendChild(el);
    this.texts.push({ el, pos: new THREE.Vector3(x + (Math.random() - 0.5) * 0.8, y, z), t: 0, dur: 0.8 });
  }

  update(dt: number, camera: THREE.Camera, w: number, h: number): void {
    // partículas
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) {
        ps[i] = ps[ps.length - 1];
        ps.pop();
        continue;
      }
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < 0.05) {
        p.y = 0.05;
        p.vy *= -0.4;
        p.vx *= 0.6;
        p.vz *= 0.6;
      }
    }
    this.pMesh.count = ps.length;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const s = p.size * Math.min(1, (p.life / p.max) * 2);
      tmpObj.position.set(p.x, p.y, p.z);
      tmpObj.scale.setScalar(s);
      tmpObj.rotation.set(p.life * 5, p.life * 3, 0);
      tmpObj.updateMatrix();
      this.pMesh.setMatrixAt(i, tmpObj.matrix);
      this.pMesh.setColorAt(i, tmpColor.setRGB(p.r, p.g, p.b));
    }
    this.pMesh.instanceMatrix.needsUpdate = true;
    if (this.pMesh.instanceColor) this.pMesh.instanceColor.needsUpdate = true;

    // telegrafias
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const tg = this.telegraphs[i];
      tg.t += dt;
      const k = Math.min(1, tg.t / tg.dur);
      if (tg.kind === "circle") {
        tg.fill.scale.setScalar(Math.max(0.01, tg.r * k));
      } else {
        const len = Math.max(0.01, tg.length * k);
        tg.fill.scale.set(tg.width, len, 1);
        tg.fill.position.set(tg.x + Math.sin(tg.angle) * len / 2, 0.08, tg.z + Math.cos(tg.angle) * len / 2);
      }
      if (k >= 1 || tg.cancelled) {
        tg.outline.removeFromParent();
        tg.fill.removeFromParent();
        this.telegraphs.splice(i, 1);
        if (!tg.cancelled) tg.onDone();
      }
    }

    // transitórios
    for (let i = this.transients.length - 1; i >= 0; i--) {
      const tr = this.transients[i];
      tr.t += dt;
      const k = Math.min(1, tr.t / tr.dur);
      if (tr.grow > 0) {
        const s = tr.base + (tr.grow - tr.base) * k;
        tr.mesh.scale.set(s, tr.mesh.scale.y < 0 ? -s : s, 1);
      }
      (tr.mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - k);
      if (k >= 1) {
        tr.mesh.removeFromParent();
        (tr.mesh.material as THREE.Material).dispose();
        if (tr.ownGeometry) tr.mesh.geometry.dispose();
        this.transients.splice(i, 1);
      }
    }

    // textos
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const ft = this.texts[i];
      ft.t += dt;
      const k = ft.t / ft.dur;
      if (k >= 1) {
        ft.el.remove();
        this.textPool.push(ft.el);
        this.texts.splice(i, 1);
        continue;
      }
      tmpV.copy(ft.pos);
      tmpV.y += k * 1.6;
      tmpV.project(camera);
      ft.el.style.transform = `translate(-50%,-50%) translate(${((tmpV.x + 1) / 2) * w}px, ${((1 - tmpV.y) / 2) * h}px) scale(${1 + Math.max(0, 0.25 - k) * 1.6})`;
      ft.el.style.opacity = String(k > 0.6 ? (1 - k) / 0.4 : 1);
    }

    this.shake = Math.max(0, this.shake - dt * 3.2);
  }

  addShake(v: number): void {
    this.shake = Math.min(1, this.shake + v);
  }

  clear(): void {
    for (const tg of this.telegraphs) {
      tg.outline.removeFromParent();
      tg.fill.removeFromParent();
    }
    this.telegraphs.length = 0;
    for (const tr of this.transients) tr.mesh.removeFromParent();
    this.transients.length = 0;
    for (const ft of this.texts) ft.el.remove();
    this.texts.length = 0;
    this.particles.length = 0;
  }
}
