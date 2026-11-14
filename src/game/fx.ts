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

interface Glow {
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  life: number; max: number; size: number; grav: number; r: number; g: number; b: number;
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

/** Anel no chão que marca o chefe: aro com a cor dele, marcas girando e brilho para dentro; em fúria fica vermelho e pulsa rápido. */
export interface BossRing {
  mesh: THREE.Mesh;
  /** `fade` 1 = visível, 0 = sumiu */
  update(x: number, z: number, radius: number, time: number, rage: number, fade: number): void;
  dispose(): void;
}

export function makeBossRing(scene: THREE.Scene, color: number): BossRing {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uRage: { value: 0 }, uFade: { value: 1 } },
    vertexShader: "varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `varying vec2 vP; uniform vec3 uColor; uniform float uTime, uRage, uFade;
      void main() {
        float r = length(vP);
        float a = atan(vP.y, vP.x + 1e-5); // sem o desvio, o centro dá NaN
        float pulse = 0.5 + 0.5 * sin(uTime * (2.2 + 6.0 * uRage));
        float rim = smoothstep(0.86, 0.92, r) * (1.0 - smoothstep(0.96, 1.0, r));
        float marks = step(0.35, sin(a * 12.0 + uTime * (0.6 + 1.6 * uRage))) * smoothstep(0.7, 0.76, r) * (1.0 - smoothstep(0.8, 0.84, r));
        float inner = smoothstep(0.25, 0.92, r) * (1.0 - smoothstep(0.92, 0.95, r)) * 0.22;
        float k = (rim * (0.75 + 0.25 * pulse) + marks * 0.5 + inner * (0.6 + 0.4 * pulse)) * uFade;
        vec3 col = mix(uColor, vec3(1.0, 0.16, 0.1), uRage * (0.55 + 0.25 * pulse));
        gl_FragColor = vec4(col * k * (1.1 + 0.9 * uRage), k);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 48), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 1;
  scene.add(mesh);
  return {
    mesh,
    update(x, z, radius, time, rage, fade) {
      mesh.position.set(x, 0.07, z);
      mesh.scale.setScalar(radius);
      mat.uniforms.uTime.value = time;
      mat.uniforms.uRage.value = rage;
      mat.uniforms.uFade.value = fade;
    },
    dispose() {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      mat.dispose();
    },
  };
}

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
  // pontos de luz macios (aditivos): faíscas, rastros, brilho de impacto
  private glows: Glow[] = [];
  private readonly glowCap = 1400;
  private gPos = new Float32Array(1400 * 3);
  private gCol = new Float32Array(1400 * 3);
  private gSize = new Float32Array(1400);
  private gPoints: THREE.Points;
  private gMat: THREE.ShaderMaterial;
  private lights: { light: THREE.PointLight; t: number; dur: number; power: number }[] = [];

  constructor(private scene: THREE.Scene, private textLayer: HTMLElement) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
    this.pMesh = new THREE.InstancedMesh(geo, mat, this.cap);
    this.pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pMesh.frustumCulled = false;
    this.pMesh.count = 0;
    this.pMesh.setColorAt(0, tmpColor.set(0xffffff));
    scene.add(this.pMesh);

    const gg = new THREE.BufferGeometry();
    gg.setAttribute("position", new THREE.BufferAttribute(this.gPos, 3).setUsage(THREE.DynamicDrawUsage));
    gg.setAttribute("aColor", new THREE.BufferAttribute(this.gCol, 3).setUsage(THREE.DynamicDrawUsage));
    gg.setAttribute("aSize", new THREE.BufferAttribute(this.gSize, 1).setUsage(THREE.DynamicDrawUsage));
    this.gMat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 } },
      vertexShader: `attribute float aSize; attribute vec3 aColor; uniform float uScale; varying vec3 vC;
        void main() { vC = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vC;
        void main() { float d = length(gl_PointCoord - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - d), 1.7); gl_FragColor = vec4(vC * a * 1.8, a); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    });
    this.gPoints = new THREE.Points(gg, this.gMat);
    this.gPoints.frustumCulled = false;
    this.gPoints.renderOrder = 5;
    gg.setDrawRange(0, 0);
    scene.add(this.gPoints);
    for (let i = 0; i < 3; i++) {
      const light = new THREE.PointLight(0xffffff, 0, 16, 1.6);
      scene.add(light);
      this.lights.push({ light, t: 1, dur: 1, power: 0 });
    }
  }

  /** tamanho dos pontos em pixels: altura do buffer / (2 tan(fov/2)) */
  setPointScale(v: number): void {
    this.gMat.uniforms.uScale.value = v;
  }

  glow(x: number, y: number, z: number, color: number, size: number, life: number, vx = 0, vy = 0, vz = 0, grav = 0): void {
    if (this.glows.length >= this.glowCap) return;
    tmpColor.set(color);
    this.glows.push({ x, y, z, vx, vy, vz, life, max: life, size, grav, r: tmpColor.r, g: tmpColor.g, b: tmpColor.b });
  }

  /** clarão + faíscas de um acerto */
  impact(x: number, y: number, z: number, color: number, power = 1): void {
    this.glow(x, y, z, color, 2.2 * power, 0.12);
    this.glow(x, y, z, 0xffffff, 1.0 * power, 0.08);
    const n = Math.round(6 * power);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (4 + Math.random() * 6) * power;
      this.glow(x, y, z, color, 0.32, 0.18 + Math.random() * 0.16, Math.cos(a) * s, Math.random() * 4, Math.sin(a) * s, 12);
    }
  }

  /** luz pontual que acende e apaga (explosões, técnicas) */
  flashLight(x: number, y: number, z: number, color: number, power: number, dur = 0.35): void {
    let slot = this.lights[0];
    for (const l of this.lights) if (l.t / l.dur > slot.t / slot.dur) slot = l;
    slot.light.color.set(color);
    slot.light.position.set(x, y, z);
    slot.t = 0;
    slot.dur = dur;
    slot.power = power;
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
    // metade em pontos de luz, para o estouro brilhar
    const n = Math.ceil(count * 0.5);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.9);
      this.glow(x, y, z, color, size * 2.6, life * (0.5 + Math.random() * 0.6), Math.cos(a) * s, Math.random() * s * 0.8 + 0.5, Math.sin(a) * s, gravity * 0.5);
    }
  }

  /** partícula única, lenta (rastro, brasa) */
  spark(x: number, y: number, z: number, color: number, size = 0.12, life = 0.35, vy = 0.5): void {
    this.glow(x, y, z, color, size * 3.4, life, (Math.random() - 0.5) * 0.8, vy, (Math.random() - 0.5) * 0.8);
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
    // meia-lua que varre o arco: borda externa brilhante, cauda que some
    const start = Math.PI / 2 - angle - arc / 2;
    const m = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uColor: { value: new THREE.Color(color) }, uInner: { value: range * 0.45 }, uOuter: { value: range }, uStart: { value: start }, uArc: { value: arc } },
      vertexShader: `varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uT; uniform vec3 uColor; uniform float uInner; uniform float uOuter; uniform float uStart; uniform float uArc; varying vec2 vP;
        void main() {
          float r = clamp((length(vP) - uInner) / (uOuter - uInner), 0.0, 1.0);
          float a = mod(atan(vP.y, vP.x) - uStart + 12.566, 6.2832) / uArc;
          float head = uT * 1.9;
          float sweep = smoothstep(head - 0.85, head, a) * step(a, head + 0.02);
          float edge = pow(r, 2.4) * (1.0 - smoothstep(0.92, 1.0, r) * 0.5);
          float i = sweep * edge * (1.0 - smoothstep(0.55, 1.0, uT));
          gl_FragColor = vec4(mix(uColor, vec3(1.0), i * 0.6) * i * 2.4, i);
        }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 1.0, z);
    // RingGeometry está no plano XY; após girar -90° em X, +Y vira -Z. Espelha Z para casar com atan2(dx,dz).
    mesh.scale.set(1, -1, 1);
    this.scene.add(mesh);
    this.transients.push({ mesh, t: 0, dur: 0.22, grow: 1.06, base: 1, ownGeometry: true });
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
      const tm = tr.mesh.material as THREE.MeshBasicMaterial & { uniforms?: { uT?: { value: number } } };
      if (tm.uniforms?.uT) tm.uniforms.uT.value = k;
      else tm.opacity = 0.85 * (1 - k);
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

    // pontos de luz
    const gs = this.glows;
    for (let i = gs.length - 1; i >= 0; i--) {
      const g = gs[i];
      g.life -= dt;
      if (g.life <= 0) {
        gs[i] = gs[gs.length - 1];
        gs.pop();
        continue;
      }
      g.vy -= g.grav * dt;
      const drag = Math.exp(-dt * 2.2);
      g.vx *= drag;
      g.vz *= drag;
      g.x += g.vx * dt;
      g.y = Math.max(0.05, g.y + g.vy * dt);
      g.z += g.vz * dt;
    }
    for (let i = 0; i < gs.length; i++) {
      const g = gs[i];
      const k = Math.min(1, (g.life / g.max) * 1.6);
      this.gPos[i * 3] = g.x;
      this.gPos[i * 3 + 1] = g.y;
      this.gPos[i * 3 + 2] = g.z;
      this.gCol[i * 3] = g.r * k;
      this.gCol[i * 3 + 1] = g.g * k;
      this.gCol[i * 3 + 2] = g.b * k;
      this.gSize[i] = g.size * (0.6 + 0.4 * k);
    }
    const geo = this.gPoints.geometry;
    geo.setDrawRange(0, gs.length);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aColor.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
    for (const l of this.lights) {
      l.t += dt;
      const k = Math.max(0, 1 - l.t / l.dur);
      l.light.intensity = l.power * k * k;
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
    this.glows.length = 0;
  }
}
