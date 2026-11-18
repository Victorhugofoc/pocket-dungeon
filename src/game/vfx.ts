// Biblioteca de efeitos (M5-02): primitivas visuais reutilizáveis para spells, técnicas e padrões de chefe. Sem lógica de jogo:
// cada uma recebe posição, cor, duração e curva, e devolve um controle (`VfxHandle`) para mover, mudar ou encerrar.
// Todas são aditivas (somam luz, combinam com o bloom de render.ts), com um miolo quente (`core`) e a cor do corpo (`color`).
// O miolo fica estreito de propósito: a cor do efeito tem de aparecer no corpo, não só no halo (crítico cego, 2026-11-17).
// `Fx` cria uma `Vfx` em `fx.lib` e chama `update` a cada quadro. Peças: ring, burst, beam, lightning, trail, pillar, groundCrack, orbit.
import * as THREE from "three";
import type { Fx } from "./fx";

// ---------------------------------------------------------------- curvas

/** Curva de intensidade no tempo: recebe a fração da vida (0..1) e devolve a intensidade (0..1). */
export type Curve = "linear" | "in" | "out" | "inOut" | "pulse" | "flash" | "fade" | "hold" | ((t: number) => number);

/**
 * `out` começa forte e desacelera; `flash` sobe em 8% da vida e cai; `fade` nasce cheio e apaga devagar;
 * `pulse` sobe e desce; `hold` fica cheio e some no fim.
 */
export function ease(c: Curve, t: number): number {
  t = Math.min(1, Math.max(0, t));
  if (typeof c === "function") return c(t);
  switch (c) {
    case "linear": return t;
    case "in": return t * t * t;
    case "out": return 1 - (1 - t) ** 3;
    case "inOut": return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    case "pulse": return Math.sin(Math.PI * t);
    case "flash": return t < 0.08 ? t / 0.08 : (1 - (t - 0.08) / 0.92) ** 2;
    case "fade": return t < 0.04 ? t / 0.04 : (1 - (t - 0.04) / 0.96) ** 1.5;
    case "hold": return t < 0.1 ? t / 0.1 : t > 0.8 ? (1 - t) / 0.2 : 1;
  }
}

/** Sorteio com semente (mulberry32), para uma peça sair igual quando se quer (capturas). Sem semente, `Math.random`. */
function rng(seed?: number): () => number {
  if (seed === undefined) return Math.random;
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- opções e controles

interface Base {
  /** cor do corpo e do brilho */
  color: number;
  /** miolo quente; padrão: a cor clareada até perto do branco */
  core?: number;
  /** segundos; `Infinity` = até `kill()` */
  dur?: number;
  /** intensidade no tempo */
  curve?: Curve;
  /** multiplica o brilho (1 = normal) */
  power?: number;
}

export interface VfxHandle {
  /** some (em `fade` s, ou no próximo quadro); o rastro para de crescer e apaga sozinho */
  kill(fade?: number): void;
  readonly done: boolean;
  /** multiplica o brilho a partir de agora */
  power: number;
}
export interface BeamHandle extends VfxHandle {
  set(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): void;
  width: number;
}
export interface TrailHandle extends VfxHandle {
  /** ponto novo do rastro (chamar a cada quadro com a posição do projétil) */
  push(x: number, y: number, z: number): void;
}
export interface MoveHandle extends VfxHandle {
  move(x: number, y: number, z: number): void;
}

interface Live {
  t: number;
  dur: number;
  curve: Curve;
  power: number;
  killed: number; // tempo do pedido de fim (-1 = vivo)
  fade: number;
  step(dt: number, k: number, i: number): boolean; // false = acabou
  dispose(): void;
}

// ---------------------------------------------------------------- shaders

const NOISE = `
  float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { return vnoise(p) * 0.55 + vnoise(p * 2.03 + 7.1) * 0.3 + vnoise(p * 4.1 + 3.3) * 0.15; }
`;

function coreOf(color: number, core?: number): THREE.Color {
  return core !== undefined ? new THREE.Color(core) : new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.6);
}

function additive(uniforms: Record<string, THREE.IUniform>, vertexShader: string, fragmentShader: string, side: THREE.Side = THREE.FrontSide): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader: NOISE + fragmentShader, side,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
}

const FLAT_VS = "varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";

const DISC = new THREE.CircleGeometry(1, 64);
const QUAD = new THREE.PlaneGeometry(2, 2);
const PILLAR = new THREE.CylinderGeometry(1, 1, 1, 32, 8, true).translate(0, 0.5, 0);

/** Fita com 2 vértices por segmento: `aAlong` 0..1 ao longo, `aSide` -1/1 de lado. A posição real sai no shader. */
function stripGeometry(segments: number): THREE.BufferGeometry {
  const n = (segments + 1) * 2;
  const along = new Float32Array(n), side = new Float32Array(n), pos = new Float32Array(n * 3);
  const idx: number[] = [];
  for (let i = 0; i <= segments; i++) {
    along[i * 2] = along[i * 2 + 1] = i / segments;
    side[i * 2] = -1;
    side[i * 2 + 1] = 1;
    if (i < segments) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aAlong", new THREE.BufferAttribute(along, 1));
  g.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
  g.setIndex(idx);
  return g;
}
const BEAM_STRIP = stripGeometry(32);

/**
 * Fitas de frente para a câmera montadas a cada quadro, várias por malha (relâmpago com ramos, rastros).
 * Cada ponto leva largura (`w`) e brilho (`f`, 0..1); o shader acha o lado pelo cruzamento da direção com a visão.
 */
class Ribbons {
  readonly geo = new THREE.BufferGeometry();
  private pos: Float32Array; private dir: Float32Array; private side: Float32Array; private w: Float32Array; private f: Float32Array;
  private idx: Uint16Array;
  private nv = 0; private ni = 0;

  constructor(private maxPts: number) {
    const n = maxPts * 2;
    this.pos = new Float32Array(n * 3); this.dir = new Float32Array(n * 3);
    this.side = new Float32Array(n); this.w = new Float32Array(n); this.f = new Float32Array(n);
    this.idx = new Uint16Array(maxPts * 6);
    for (let i = 0; i < maxPts; i++) { this.side[i * 2] = -1; this.side[i * 2 + 1] = 1; }
    const dyn = (a: Float32Array, s: number) => new THREE.BufferAttribute(a, s).setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute("position", dyn(this.pos, 3));
    this.geo.setAttribute("aDir", dyn(this.dir, 3));
    this.geo.setAttribute("aSide", new THREE.BufferAttribute(this.side, 1));
    this.geo.setAttribute("aW", dyn(this.w, 1));
    this.geo.setAttribute("aF", dyn(this.f, 1));
    this.geo.setIndex(new THREE.BufferAttribute(this.idx, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setDrawRange(0, 0);
  }

  begin(): void { this.nv = 0; this.ni = 0; }

  /** `p` em trios xyz; `w` e `f` um por ponto */
  strip(p: ArrayLike<number>, w: ArrayLike<number>, f: ArrayLike<number>): void {
    const m = Math.min(p.length / 3, this.maxPts - this.nv / 2);
    if (m < 2) return;
    const v0 = this.nv;
    for (let i = 0; i < m; i++) {
      const a = Math.max(0, i - 1), b = Math.min(m - 1, i + 1);
      const dx = p[b * 3] - p[a * 3], dy = p[b * 3 + 1] - p[a * 3 + 1], dz = p[b * 3 + 2] - p[a * 3 + 2];
      for (let s = 0; s < 2; s++) {
        const v = v0 + i * 2 + s;
        this.pos[v * 3] = p[i * 3]; this.pos[v * 3 + 1] = p[i * 3 + 1]; this.pos[v * 3 + 2] = p[i * 3 + 2];
        this.dir[v * 3] = dx; this.dir[v * 3 + 1] = dy; this.dir[v * 3 + 2] = dz;
        this.w[v] = w[i]; this.f[v] = f[i];
      }
      if (i < m - 1) {
        const v = v0 + i * 2;
        this.idx.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], this.ni);
        this.ni += 6;
      }
    }
    this.nv += m * 2;
  }

  commit(): void {
    const g = this.geo;
    g.setDrawRange(0, this.ni);
    for (const k of ["position", "aDir", "aW", "aF"]) g.attributes[k].needsUpdate = true;
    g.index!.needsUpdate = true;
  }
}

const RIBBON_VS = `attribute vec3 aDir; attribute float aSide; attribute float aW; attribute float aF;
  varying float vSide; varying float vF;
  void main() {
    vec3 side = normalize(cross(aDir, cameraPosition - position) + vec3(1e-5, 0.0, 0.0));
    vSide = aSide; vF = aF;
    gl_Position = projectionMatrix * viewMatrix * vec4(position + side * aSide * aW, 1.0);
  }`;

// ---------------------------------------------------------------- biblioteca

export class Vfx {
  private live: Live[] = [];
  time = 0;

  constructor(private scene: THREE.Scene, private fx: Fx) {}

  private add(obj: THREE.Object3D, o: Base, defCurve: Curve, defDur: number, step: Live["step"], dispose?: () => void): VfxHandle {
    this.scene.add(obj);
    const l: Live = {
      t: 0, dur: o.dur ?? defDur, curve: o.curve ?? defCurve, power: o.power ?? 1, killed: -1, fade: 0, step,
      dispose: () => {
        obj.removeFromParent();
        obj.traverse((m) => {
          const mesh = m as THREE.Mesh;
          if (mesh.material) (mesh.material as THREE.Material).dispose();
        });
        dispose?.();
      },
    };
    this.live.push(l);
    return {
      kill(fade = 0) { if (l.killed < 0) { l.killed = l.t; l.fade = fade; } },
      get done() { return l.t < 0; },
      get power() { return l.power; },
      set power(v: number) { l.power = v; },
    };
  }

  /**
   * Onda de choque no chão: frente nítida e quente por fora, cauda larga que esfria para dentro, espessura quebrada por ruído.
   * Nasce grossa e clara, afina e esfria ao abrir (ease-out). `radius` final; `width` da frente no começo; `from` raio inicial
   * (fração); `fill` brilho do disco por dentro; `dust` faíscas levantando na borda (0 = nenhuma).
   */
  ring(x: number, z: number, o: Base & { radius: number; width?: number; from?: number; fill?: number; y?: number; dust?: number }): VfxHandle {
    const mat = additive({
      uColor: { value: new THREE.Color(o.color) }, uCore: { value: coreOf(o.color, o.core) },
      uR: { value: 0 }, uW: { value: 0.1 }, uA: { value: 0 }, uHeat: { value: 1 }, uFill: { value: o.fill ?? 0 },
      uTime: { value: 0 }, uSeed: { value: Math.random() * 50 },
    }, FLAT_VS, `varying vec2 vP; uniform vec3 uColor, uCore; uniform float uR, uW, uA, uHeat, uFill, uTime, uSeed;
      void main() {
        float d = length(vP);
        vec2 dirn = vP / max(d, 1e-3); // ruído pela direção, sem a costura do atan
        float n = fbm(dirn * 2.6 + uSeed + vec2(d * 3.0 - uTime * 2.0, -d * 2.0));
        float w = uW * (0.6 + 0.8 * n);
        float x = (d - uR) / w;
        float front = x > 0.0 ? exp(-x * x * 6.0) : exp(x * 2.2) * 0.8; // nítida por fora, cauda curta por dentro
        front *= step(0.0, d);
        float hot = exp(-x * x * 10.0) * step(-0.6, x);
        float inner = clamp(d / max(uR, 1e-3), 0.0, 1.0) * step(d, uR) * uFill * (0.4 + 0.6 * n);
        float k = (front * (0.45 + 0.75 * n) + inner) * uA;
        vec3 col = mix(uColor, uCore, hot * uHeat);
        gl_FragColor = vec4(col * k * 1.5, k);
      }`);
    const mesh = new THREE.Mesh(DISC, mat);
    mesh.rotation.x = -Math.PI / 2;
    const R = o.radius, width = o.width ?? Math.max(0.3, R * 0.16), from = o.from ?? 0.15;
    const S = R + width * 3;
    mesh.scale.setScalar(S);
    mesh.position.set(x, o.y ?? 0.1, z);
    mesh.renderOrder = 3;
    const u = mat.uniforms;
    const dust = o.dust ?? Math.round(R * 4);
    let emitted = 0;
    return this.add(mesh, o, "fade", 0.5, (dt, k, i) => {
      const grow = ease("out", Math.min(1, k * 1.25));
      const r = (from + (1 - from) * grow) * R;
      u.uR.value = r / S;
      u.uW.value = (width * (1.5 - 1.1 * grow)) / S;
      u.uA.value = i;
      u.uHeat.value = 1 - 0.75 * k;
      u.uTime.value = this.time;
      while (emitted < dust * Math.min(1, k * 2)) {
        emitted++;
        const a = Math.random() * Math.PI * 2;
        this.fx.glow(x + Math.cos(a) * r, 0.2, z + Math.sin(a) * r, o.color, 0.25 + Math.random() * 0.2, 0.35 + Math.random() * 0.25,
          Math.cos(a) * 2.5, 1.5 + Math.random() * 2, Math.sin(a) * 2.5, 6);
      }
      return true;
    });
  }

  /**
   * Clarão de impacto voltado para a câmera: miolo pequeno, anel saturado da cor, raios finos que encolhem e apagam juntos,
   * faíscas rápidas e luz pontual. `radius` do clarão; `rays` (0 = só o brilho); `sparks`; `light` força da luz (0 = sem);
   * `wave` raio de uma onda curta no chão (0 = sem).
   */
  burst(x: number, y: number, z: number, o: Base & { radius: number; rays?: number; sparks?: number; light?: number; wave?: number }): VfxHandle {
    const mat = additive({
      uColor: { value: new THREE.Color(o.color) }, uCore: { value: coreOf(o.color, o.core) },
      uSize: { value: 0 }, uA: { value: 0 }, uRays: { value: o.rays ?? 8 }, uRot: { value: Math.random() * 6.28 }, uK: { value: 0 },
    }, `varying vec2 vP; uniform float uSize;
      void main() {
        vP = position.xy;
        vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        mv.xy += position.xy * uSize;
        gl_Position = projectionMatrix * mv;
      }`, `varying vec2 vP; uniform vec3 uColor, uCore; uniform float uA, uRays, uRot, uK;
      void main() {
        float d = length(vP);
        float a = atan(vP.y, vP.x + 1e-5) + uRot;
        float ringR = 0.16 + 0.3 * uK;
        float core = exp(-d * d * 90.0) * (1.0 - uK * 0.6);
        float ring = exp(-(d - ringR) * (d - ringR) * 140.0) * 0.9 * (1.0 - uK);
        float halo = exp(-d * d * 6.0) * 0.45;
        float rays = 0.0;
        if (uRays > 0.5) {
          float len = 1.0 - uK * 0.7; // os raios encolhem
          float r1 = pow(abs(cos(a * uRays * 0.5)), 30.0);
          float r2 = pow(abs(cos(a * uRays * 0.5 + 0.9)), 70.0) * 0.55;
          rays = (r1 + r2) * (1.0 - smoothstep(0.05, len, d)) * (1.0 - uK) * (1.0 - uK);
        }
        float k = (core + ring + halo + rays * 0.9) * uA * (1.0 - smoothstep(0.75, 1.0, d));
        vec3 col = mix(uColor, uCore, clamp(core * 1.2, 0.0, 1.0));
        gl_FragColor = vec4(col * k * 1.6, k);
      }`);
    const mesh = new THREE.Mesh(QUAD, mat);
    mesh.position.set(x, y, z);
    mesh.frustumCulled = false;
    mesh.renderOrder = 6;
    const sparks = o.sparks ?? 12;
    const speed = 7 + o.radius * 6;
    for (let n = 0; n < sparks; n++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.6 + Math.random() * 0.7);
      this.fx.glow(x, y, z, n % 4 ? o.color : coreOf(o.color, o.core).getHex(), 0.3 + Math.random() * 0.25, 0.3 + Math.random() * 0.3,
        Math.cos(a) * s, (Math.random() * 0.9 + 0.1) * s * 0.6, Math.sin(a) * s, 6);
    }
    if ((o.light ?? 1.5) > 0) this.fx.flashLight(x, y + 0.6, z, o.color, o.light ?? 1.5, (o.dur ?? 0.3) * 1.2);
    if ((o.wave ?? o.radius * 1.2) > 0) this.ring(x, z, { radius: o.wave ?? o.radius * 1.2, color: o.color, core: o.core, dur: (o.dur ?? 0.3) * 0.8, fill: 0, dust: 0, power: 0.9, from: 0.05 });
    const u = mat.uniforms, R = o.radius;
    return this.add(mesh, o, "flash", 0.3, (dt, k, i) => {
      u.uSize.value = R * (0.6 + 0.4 * ease("out", Math.min(1, k * 3)));
      u.uA.value = i;
      u.uK.value = k;
      u.uRot.value += dt * 0.8;
      return true;
    });
  }

  /**
   * Raio contínuo entre dois pontos, sempre de frente para a câmera: miolo branco fino, corpo saturado da cor, halo largo,
   * ruído correndo de `from` para `to` e espessura que pulsa. Brilho de emissão na origem e faíscas na ponta.
   * `width` meia-largura em unidades; `flow` velocidade do ruído (u/s); `flare` liga origem e ponta (padrão sim). Mover com `set`.
   */
  beam(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number,
    o: Base & { width?: number; flow?: number; flare?: boolean }): BeamHandle {
    const mat = additive({
      uColor: { value: new THREE.Color(o.color) }, uCore: { value: coreOf(o.color, o.core) },
      uA: { value: new THREE.Vector3(x0, y0, z0) }, uB: { value: new THREE.Vector3(x1, y1, z1) },
      uW: { value: o.width ?? 0.5 }, uI: { value: 0 }, uTime: { value: 0 }, uFlow: { value: o.flow ?? 12 },
    }, `attribute float aAlong; attribute float aSide; uniform vec3 uA, uB; uniform float uW, uTime;
      varying float vAlong; varying float vSide; varying float vLen;
      void main() {
        vec3 p = mix(uA, uB, aAlong);
        vec3 dir = uB - uA;
        vec3 side = normalize(cross(dir, cameraPosition - p) + vec3(1e-5, 0.0, 0.0));
        float pulse = 1.0 + 0.1 * sin(uTime * 26.0 - aAlong * 9.0);
        p += side * aSide * uW * pulse;
        vAlong = aAlong; vSide = aSide; vLen = length(dir);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`, `varying float vAlong; varying float vSide; varying float vLen; uniform vec3 uColor, uCore; uniform float uI, uTime, uFlow, uW;
      void main() {
        float L = vAlong * vLen;
        float x = vSide;
        float core = exp(-x * x * 70.0);
        float body = exp(-x * x * 9.0);
        float glow = exp(-x * x * 2.2) * (1.0 - x * x);
        float n = fbm(vec2(L * 1.1 - uTime * uFlow * 0.35, x * 2.0 + uTime * 0.7));
        float flow = 0.55 + 0.9 * n;
        float e = max(0.01, min(0.5, uW * 0.6 / max(vLen, 0.01)));
        float cap = smoothstep(0.0, e, vAlong) * (1.0 - smoothstep(1.0 - e, 1.0, vAlong));
        float k = (core * 0.55 + body * 0.5 * flow + glow * 0.32 * flow) * cap * uI;
        vec3 sat = uColor * uColor * 1.3; // corpo mais saturado que a cor dada
        vec3 col = mix(mix(sat, uColor, body), uCore, clamp(core * 1.1, 0.0, 1.0));
        gl_FragColor = vec4(col * k * 1.1, min(1.0, k));
      }`, THREE.DoubleSide);
    const mesh = new THREE.Mesh(BEAM_STRIP, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 6;
    const u = mat.uniforms;
    const flare = o.flare ?? true;
    const coreHex = coreOf(o.color, o.core).getHex();
    const h = this.add(mesh, o, "hold", 0.4, (dt, k, i) => {
      u.uI.value = i;
      u.uTime.value = this.time;
      if (flare && i > 0.05) {
        const a = u.uA.value as THREE.Vector3, b = u.uB.value as THREE.Vector3, w = u.uW.value as number;
        this.fx.glow(a.x, a.y, a.z, o.color, w * 2.6 * i, 0.05);
        this.fx.glow(b.x, b.y, b.z, o.color, w * 5 * i, 0.05);
        this.fx.glow(b.x, b.y, b.z, coreHex, w * 1.6 * i, 0.04);
        if (Math.random() < dt * 45 * i) {
          const s = 3 + Math.random() * 4, ang = Math.random() * Math.PI * 2;
          this.fx.glow(b.x, b.y, b.z, Math.random() < 0.5 ? coreHex : o.color, 0.25, 0.25, Math.cos(ang) * s, Math.random() * 3, Math.sin(ang) * s, 8);
        }
      }
      return true;
    }) as BeamHandle;
    Object.defineProperty(h, "width", { get: () => u.uW.value, set: (v: number) => { u.uW.value = v; } });
    h.set = (a, b, c, d, e, f) => { u.uA.value.set(a, b, c); u.uB.value.set(d, e, f); };
    return h;
  }

  /**
   * Relâmpago entre dois pontos: zigue-zague de segmentos retos com dobras fortes, 2 a 4 ramos que afinam até sumir,
   * caminho sorteado de novo a cada `rate` s com piscada de brilho, clarão na origem e no alvo.
   * `width` meia-largura do tronco; `branches` máximo de ramos; `jag` amplitude do zigue-zague (fração do comprimento).
   */
  lightning(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number,
    o: Base & { width?: number; branches?: number; rate?: number; jag?: number; seed?: number }): BeamHandle {
    const rib = new Ribbons(64);
    const mat = additive({ uColor: { value: new THREE.Color(o.color) }, uCore: { value: coreOf(o.color, o.core) }, uI: { value: 0 } },
      RIBBON_VS, `varying float vSide; varying float vF; uniform vec3 uColor, uCore; uniform float uI;
      void main() {
        float core = exp(-vSide * vSide * 70.0);
        float glow = exp(-vSide * vSide * 2.4) * (1.0 - vSide * vSide);
        float k = (core * 0.9 + glow * 0.75) * vF * uI;
        gl_FragColor = vec4(mix(uColor, uCore, clamp(core * 1.2, 0.0, 1.0)) * k * 1.4, k);
      }`, THREE.DoubleSide);
    const mesh = new THREE.Mesh(rib.geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 6;
    const A = new THREE.Vector3(x0, y0, z0), B = new THREE.Vector3(x1, y1, z1);
    const W = o.width ?? 0.28, rate = o.rate ?? 0.065, jag = o.jag ?? 0.12, maxBranches = o.branches ?? 4;
    const rand = rng(o.seed);
    const coreHex = coreOf(o.color, o.core).getHex();
    let next = 0, flick = 1;
    const build = () => {
      rib.begin();
      const dx = B.x - A.x, dy = B.y - A.y, dz = B.z - A.z, len = Math.hypot(dx, dy, dz) || 1;
      // perpendicular no chão (a câmera é alta: o desvio lateral é o que se vê) e um pouco na altura
      const hx = -dz / len, hz = dx / len;
      const N = Math.max(8, Math.min(20, Math.round(len * 2.2)));
      const p: number[] = [], w: number[] = [], f: number[] = [];
      let off = 0;
      for (let i = 0; i <= N; i++) {
        const t = i / N, taper = Math.sin(Math.PI * t);
        if (i > 0 && i < N) off = (rand() - 0.5) * 2 * jag * len * (0.35 + 0.65 * taper); // cada nó salta: dobras de 30 a 60°
        else off = 0;
        p.push(A.x + dx * t + hx * off, A.y + dy * t + taper * len * 0.1 + (rand() - 0.5) * jag * len * 0.3 * taper, A.z + dz * t + hz * off);
        w.push(W * (0.75 + 0.25 * taper));
        f.push(1);
      }
      rib.strip(p, w, f);
      const nb = 2 + Math.floor(rand() * (maxBranches - 1));
      for (let b = 0; b < nb; b++) {
        const at = 1 + Math.floor(rand() * (N - 2));
        let bx = p[at * 3], by = p[at * 3 + 1], bz = p[at * 3 + 2];
        const side = rand() < 0.5 ? -1 : 1;
        const ang = side * (0.45 + rand() * 0.5);
        const cs = Math.cos(ang), sn = Math.sin(ang);
        let ux = (dx * cs - dz * sn) / len, uz = (dx * sn + dz * cs) / len;
        const bl = len * (0.14 + rand() * 0.16), M = 4;
        const q: number[] = [bx, by, bz], qw: number[] = [W * 0.45], qf: number[] = [0.85];
        for (let s = 1; s <= M; s++) {
          const turn = (rand() - 0.5) * 1.1;
          const c2 = Math.cos(turn), s2 = Math.sin(turn);
          [ux, uz] = [ux * c2 - uz * s2, ux * s2 + uz * c2];
          bx += ux * bl / M; bz += uz * bl / M; by -= (bl / M) * 0.15;
          q.push(bx, by, bz);
          qw.push(W * 0.45 * (1 - s / M) + 0.02);
          qf.push(0.9 * (1 - s / M));
        }
        rib.strip(q, qw, qf);
      }
      rib.commit();
      flick = rand() < 0.3 ? 0.25 : 1; // piscada: cheio, quase zero, cheio
    };
    const h = this.add(mesh, o, "flash", 0.45, (dt, k, i) => {
      if (this.time >= next) { next = this.time + rate; build(); }
      mat.uniforms.uI.value = i * flick;
      // clarão das pontas acompanha o traço (some e pisca junto)
      const e = i * flick;
      if (e > 0.05) {
        this.fx.glow(A.x, A.y, A.z, o.color, W * 5 * e, 0.04);
        this.fx.glow(B.x, B.y, B.z, o.color, W * 7 * e, 0.04);
        this.fx.glow(B.x, B.y, B.z, coreHex, W * 2.5 * e, 0.035);
      }
      return true;
    }, () => rib.geo.dispose()) as BeamHandle;
    Object.defineProperty(h, "width", { get: () => W, set: () => {} });
    h.set = (a, b, c, d, e, f) => { A.set(a, b, c); B.set(d, e, f); };
    return h;
  }

  /**
   * Rastro de fita atrás de algo que se move (projétil, lâmina). Chamar `push` a cada quadro; cada ponto vive `life` s,
   * afina e escurece até sumir. `head` desenha a cabeça (miolo e anel da cor; 0 = sem); `sheds` faíscas que se soltam por segundo.
   * `kill()` deixa o rastro terminar de apagar sozinho.
   */
  trail(o: Base & { width?: number; life?: number; points?: number; head?: number; sheds?: number }): TrailHandle {
    const N = o.points ?? 32, life = o.life ?? 0.3;
    const pts: { x: number; y: number; z: number; t: number }[] = [];
    const rib = new Ribbons(N);
    const mat = additive({ uColor: { value: new THREE.Color(o.color) }, uCore: { value: coreOf(o.color, o.core) }, uI: { value: 1 } },
      RIBBON_VS, `varying float vSide; varying float vF; uniform vec3 uColor, uCore; uniform float uI;
      void main() {
        float core = exp(-vSide * vSide * 40.0) * vF;
        float glow = exp(-vSide * vSide * 3.0) * (1.0 - vSide * vSide);
        float k = (core * 0.8 + glow * 0.7) * vF * uI;
        vec3 body = mix(uColor * 0.45, uColor, vF); // escurece para trás
        gl_FragColor = vec4(mix(body, uCore, clamp(core, 0.0, 1.0)) * k * 1.4, k);
      }`, THREE.DoubleSide);
    const mesh = new THREE.Mesh(rib.geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    const W = o.width ?? 0.65, head = o.head ?? W * 0.9, sheds = o.sheds ?? 20;
    const coreHex = coreOf(o.color, o.core).getHex();
    let killed = false;
    const p: number[] = [], w: number[] = [], f: number[] = [];
    const h = this.add(mesh, { ...o, dur: Infinity }, "linear", Infinity, (dt, _k, i) => {
      const now = this.time;
      while (pts.length && now - pts[pts.length - 1].t > life) pts.pop();
      if (killed && pts.length < 2) return false;
      mat.uniforms.uI.value = i;
      p.length = w.length = f.length = 0;
      for (let n = 0; n < pts.length; n++) {
        const a = pts[n];
        const g = Math.min(1, (now - a.t) / life);
        p.push(a.x, a.y, a.z);
        w.push(W * (1 - g * 0.85));
        // a frente apaga em vez de afinar (afinar dobrava a fita num "N"); a cabeça redonda cobre a ponta
        f.push(Math.max(0, 1 - g) ** 1.4 * (n === 0 ? 0 : n === 1 ? 0.6 : 1));
      }
      rib.begin();
      rib.strip(p, w, f);
      rib.commit();
      const top = pts[0];
      if (top && !killed && head > 0) {
        this.fx.glow(top.x, top.y, top.z, o.color, head * 2.4 * i, 0.04);
        this.fx.glow(top.x, top.y, top.z, coreHex, head * 0.6 * i, 0.035);
      }
      if (top && !killed && Math.random() < dt * sheds) {
        this.fx.glow(top.x, top.y, top.z, o.color, 0.22, 0.4, (Math.random() - 0.5) * 2, Math.random() * 1.5, (Math.random() - 0.5) * 2, 2);
      }
      return true;
    }, () => rib.geo.dispose()) as TrailHandle;
    // o rastro não some de uma vez: para de crescer e acaba quando o último ponto vence
    h.kill = () => { killed = true; };
    h.push = (x, y, z) => {
      if (killed) return;
      const top = pts[0];
      if (top && Math.hypot(top.x - x, top.y - y, top.z - z) < 0.02) { top.t = this.time; return; }
      pts.unshift({ x, y, z, t: this.time });
      if (pts.length > N) pts.length = N;
    };
    return h;
  }

  /**
   * Coluna de luz subindo do chão: volume que acende no meio e some nas bordas (sem aresta), miolo vertical estreito,
   * faixas correndo para cima, topo que se desfaz em ruído e brilho radial no chão. `radius` e `height` em unidades; `speed` das faixas.
   */
  pillar(x: number, z: number, o: Base & { radius: number; height: number; speed?: number }): VfxHandle {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const mat = additive({
      uColor: { value: new THREE.Color(o.color) }, uCore: { value: coreOf(o.color, o.core) }, uI: { value: 0 }, uTime: { value: 0 },
      uSpeed: { value: o.speed ?? 6 }, uH: { value: o.height }, uSeed: { value: Math.random() * 40 },
    }, `varying vec3 vN; varying vec3 vW; varying float vY; varying float vA;
      void main() {
        vY = position.y; vA = uv.x * 6.2832;
        vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`, `varying vec3 vN; varying vec3 vW; varying float vY; varying float vA; uniform vec3 uColor, uCore; uniform float uI, uTime, uSpeed, uH, uSeed;
      void main() {
        vec3 v = normalize(cameraPosition - vW);
        float facing = abs(dot(normalize(vec3(vN.x, 0.0, vN.z)), normalize(vec3(v.x, 0.0, v.z))));
        float body = pow(facing, 1.8);           // some nas bordas: sem aresta de objeto sólido
        float spine = pow(facing, 14.0);         // miolo vertical estreito
        float flow = vY * uH * 0.3 - uTime * uSpeed * 0.3;
        float streaks = smoothstep(0.4, 0.85, fbm(vec2(cos(vA), sin(vA)) * 2.2 + uSeed + vec2(flow * 0.15, flow)));
        float top = clamp((1.0 - vY) * 1.6 - 0.6 * fbm(vec2(cos(vA), sin(vA)) * 1.4 + uSeed + vec2(0.0, vY * 4.0 - uTime * 2.0)), 0.0, 1.0);
        top *= top;
        float foot = smoothstep(0.0, 0.18, vY); // o pé some no chão: sem a boca do cilindro desenhada
        float k = (body * (0.3 + 0.8 * streaks) + spine * 0.7) * top * foot * uI;
        vec3 col = mix(uColor, uCore, clamp(spine * 0.6, 0.0, 1.0));
        gl_FragColor = vec4(col * k * 1.5, k);
      }`, THREE.DoubleSide);
    const wall = new THREE.Mesh(PILLAR, mat);
    wall.renderOrder = 6;
    group.add(wall);
    const discMat = additive({ uColor: { value: new THREE.Color(o.color) }, uCore: { value: coreOf(o.color, o.core) }, uI: { value: 0 } }, FLAT_VS,
      `varying vec2 vP; uniform vec3 uColor, uCore; uniform float uI;
      void main() { float d = length(vP);
        float k = (exp(-d * d * 4.0) * 0.7 + exp(-d * d * 18.0) * 0.8) * (1.0 - smoothstep(0.6, 1.0, d)) * uI;
        gl_FragColor = vec4(mix(uColor, uCore, exp(-d * d * 30.0) * 0.6) * k * 1.5, k); }`);
    const disc = new THREE.Mesh(DISC, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.09;
    disc.scale.setScalar(o.radius * 2.2);
    disc.renderOrder = 3;
    group.add(disc);
    const R = o.radius, H = o.height;
    this.ring(x, z, { radius: R * 2.2, color: o.color, core: o.core, dur: (o.dur ?? 0.6) * 0.8, width: R * 0.5, dust: 6, power: 0.9 });
    this.fx.flashLight(x, 1.2, z, o.color, 2.5, (o.dur ?? 0.6) * 1.2);
    return this.add(group, o, "flash", 0.6, (dt, k, i) => {
      const grow = ease("out", Math.min(1, k * 3));
      wall.scale.set(R * (0.6 + 0.4 * grow), H * (0.3 + 0.7 * grow), R * (0.6 + 0.4 * grow));
      mat.uniforms.uI.value = i;
      mat.uniforms.uTime.value = this.time;
      discMat.uniforms.uI.value = i;
      if (i > 0.2 && Math.random() < dt * 40 * i) {
        const a = Math.random() * Math.PI * 2, r = R * 0.4 * Math.sqrt(Math.random());
        this.fx.glow(x + Math.cos(a) * r, 0.2, z + Math.sin(a) * r, Math.random() < 0.4 ? coreOf(o.color, o.core).getHex() : o.color, 0.3, 0.5, 0, H * 1.4, 0, 0);
      }
      return true;
    });
  }

  /**
   * Fendas no chão saindo do centro: segmentos retos com quinas, grossas no meio e finas na ponta, abrindo do centro para fora
   * sem mudar de forma; esfriam de amarelo a vermelho até apagar, com brilho difuso por baixo e borda queimada escura.
   * `radius` alcance; `count` fendas principais (cada uma pode ramificar); `width` meia-largura no centro; `scorch` escurece o chão (0..1);
   * `seed` repete o mesmo desenho.
   */
  groundCrack(x: number, z: number, o: Base & { radius: number; count?: number; width?: number; scorch?: number; seed?: number }): VfxHandle {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const rand = rng(o.seed);
    const R = o.radius, W = o.width ?? Math.max(0.12, R * 0.055), minW = 0.015;
    const verts: number[] = [], dist: number[] = [], across: number[] = [], idx: number[] = [];
    const segment = (ax: number, az: number, bx: number, bz: number, da: number, db: number, wa: number, wb: number) => {
      const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      const b = verts.length / 3;
      // ponta um pouco além do fim, para as quinas não abrirem buraco entre segmentos
      const ex = (dx / l) * wb * 0.6, ez = (dz / l) * wb * 0.6;
      verts.push(ax + nx * wa, 0, az + nz * wa, ax - nx * wa, 0, az - nz * wa, bx + ex + nx * wb, 0, bz + ez + nz * wb, bx + ex - nx * wb, 0, bz + ez - nz * wb);
      dist.push(da, da, db, db);
      across.push(1, -1, 1, -1);
      idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    };
    const crack = (sx: number, sz: number, ang: number, len: number, d0: number, w0: number, depth: number) => {
      const steps = 3 + Math.floor(rand() * 3);
      let px = sx, pz = sz, d = d0, w = w0;
      for (let s = 0; s < steps; s++) {
        if (s > 0) ang += (rand() < 0.5 ? -1 : 1) * (0.25 + rand() * 0.45); // quina, não curva
        const step = (len / steps) * (0.75 + rand() * 0.5);
        const nx = px + Math.sin(ang) * step, nz = pz + Math.cos(ang) * step;
        const last = s === steps - 1;
        const nd = Math.min(1, Math.hypot(nx, nz) / R), nw = last ? minW : Math.max(minW, w * 0.62); // a ponta acaba em zero
        segment(px, pz, nx, nz, d, nd, w, nw);
        if (depth > 0 && !last && rand() < 0.55) {
          crack(nx, nz, ang + (rand() < 0.5 ? 1 : -1) * (0.5 + rand() * 0.5), len * (0.25 + rand() * 0.25), nd, Math.max(minW, nw * 0.7), depth - 1);
        }
        px = nx; pz = nz; d = nd; w = nw;
      }
    };
    const count = o.count ?? 6;
    const turn = rand() * Math.PI * 2;
    // fendas desiguais: ângulos e comprimentos bem diferentes, para não virar uma estrela simétrica
    for (let c = 0; c < count; c++) {
      crack(0, 0, turn + (c / count) * Math.PI * 2 + (rand() - 0.5) * 1.1, R * (0.35 + rand() * 0.65), 0, W * (0.6 + rand() * 0.5), 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute("aDist", new THREE.Float32BufferAttribute(dist, 1));
    geo.setAttribute("aAcross", new THREE.Float32BufferAttribute(across, 1));
    geo.setIndex(idx);
    const vs = `attribute float aDist; attribute float aAcross; varying float vD; varying float vX;
      void main() { vD = aDist; vX = aAcross; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
    // borda queimada: a mesma fenda, mais larga e escura, com mistura normal por baixo
    const scorch = o.scorch ?? 0.6;
    const burnMat = new THREE.ShaderMaterial({
      uniforms: { uOpen: { value: 0 }, uA: { value: 0 } }, vertexShader: vs,
      fragmentShader: `varying float vD; varying float vX; uniform float uOpen, uA;
        void main() { float open = 1.0 - smoothstep(uOpen - 0.1, uOpen, vD);
          float k = (1.0 - abs(vX)) * open * uA; gl_FragColor = vec4(vec3(0.03, 0.02, 0.015), k); }`,
      transparent: true, depthWrite: false,
    });
    const burnGeo = geo.clone();
    {
      // alarga a cópia: cada par de vértices se afasta do seu par
      const pa = burnGeo.attributes.position.array as Float32Array;
      for (let v = 0; v < pa.length / 3; v += 2) {
        const mx = (pa[v * 3] + pa[v * 3 + 3]) / 2, mz = (pa[v * 3 + 2] + pa[v * 3 + 5]) / 2;
        for (const s of [0, 1]) {
          const j = (v + s) * 3;
          pa[j] = mx + (pa[j] - mx) * 2.6;
          pa[j + 2] = mz + (pa[j + 2] - mz) * 2.6;
        }
      }
    }
    const burn = new THREE.Mesh(burnGeo, burnMat);
    burn.position.y = 0.085;
    burn.renderOrder = 2;
    group.add(burn);
    const mat = additive({
      uColor: { value: new THREE.Color(o.color) }, uCore: { value: coreOf(o.color, o.core) }, uOpen: { value: 0 }, uI: { value: 0 }, uHeat: { value: 1 }, uTime: { value: 0 },
    }, vs, `varying float vD; varying float vX; uniform vec3 uColor, uCore; uniform float uOpen, uI, uHeat, uTime;
      void main() {
        float open = 1.0 - smoothstep(uOpen - 0.06, uOpen, vD);
        float tip = exp(-(vD - uOpen) * (vD - uOpen) * 220.0) * step(vD, uOpen + 0.03);
        float x2 = vX * vX * (1.0 + 1.5 * vD);
        float core = exp(-x2 * 5.0) * (1.0 - 0.5 * vD); // miolo só nos troncos
        float body = exp(-x2 * 1.6);
        float pulse = 0.8 + 0.2 * sin(vD * 22.0 - uTime * 7.0);
        float k = (core * 0.9 * pulse + body * 0.55 * (1.0 - 0.5 * vD) + tip) * open * uI;
        vec3 cool = mix(uColor * vec3(0.9, 0.35, 0.25), uColor, smoothstep(0.0, 0.5, uHeat));
        vec3 col = mix(cool, uCore, clamp(core * uHeat * 1.2 + tip, 0.0, 1.0));
        gl_FragColor = vec4(col * k * 1.6, k);
      }`);
    const lines = new THREE.Mesh(geo, mat);
    lines.position.y = 0.1;
    lines.renderOrder = 4;
    group.add(lines);
    // brilho difuso por baixo das fendas
    const under = additive({ uColor: { value: new THREE.Color(o.color) }, uI: { value: 0 } }, FLAT_VS,
      `varying vec2 vP; uniform vec3 uColor; uniform float uI;
      void main() { float d = length(vP); float k = exp(-d * d * 3.5) * 0.4 * uI; gl_FragColor = vec4(uColor * vec3(1.0, 0.55, 0.35) * k, k); }`);
    const glow = new THREE.Mesh(DISC, under);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.09;
    glow.scale.setScalar(R);
    glow.renderOrder = 3;
    group.add(glow);
    this.fx.flashLight(x, 0.8, z, o.color, 2.2, (o.dur ?? 1.4) * 0.7);
    return this.add(group, o, "hold", 1.4, (dt, k, i) => {
      const open = ease("out", Math.min(1, k * 5)) * 1.1;
      mat.uniforms.uOpen.value = open;
      mat.uniforms.uI.value = i;
      mat.uniforms.uHeat.value = 1 - k;
      mat.uniforms.uTime.value = this.time;
      under.uniforms.uI.value = i * (1 - k * 0.5) * Math.min(1, k * 6);
      burnMat.uniforms.uOpen.value = open;
      burnMat.uniforms.uA.value = scorch * Math.min(1, k * 6) * (k > 0.75 ? (1 - k) / 0.25 : 1);
      return true;
    }, () => { geo.dispose(); burnGeo.dispose(); });
  }

  /**
   * Pontos de luz girando em volta de um centro, cada um com rastro contínuo e halo (escudo, carga, aura).
   * `radius` da órbita; `count` pontos; `speed` em voltas por segundo; `tilt` inclinação do plano (rad, 0 = deitado);
   * `size` da cabeça; `bob` sobe e desce, cada ponto no seu tempo. Mover o centro com `move`.
   */
  orbit(x: number, y: number, z: number, o: Base & { radius: number; count?: number; speed?: number; tilt?: number; size?: number; bob?: number }): MoveHandle {
    const c = new THREE.Vector3(x, y, z);
    const count = o.count ?? 6, speed = (o.speed ?? 0.8) * Math.PI * 2, tilt = o.tilt ?? 0.25, size = o.size ?? 0.6, bob = o.bob ?? 0.3;
    const phase = Math.random() * 6.28;
    const coreHex = coreOf(o.color, o.core).getHex();
    const tails: TrailHandle[] = [];
    for (let n = 0; n < count; n++) {
      tails.push(this.trail({ color: o.color, core: o.core, width: size * 0.32, life: Math.min(0.35, 0.9 / Math.max(0.3, o.speed ?? 0.8) / count), head: 0, sheds: 3, points: 24 }));
    }
    const anchor = new THREE.Object3D();
    let spin = 0;
    const enter = (t: number) => (t < 0.02 ? t / 0.02 : t > 0.85 ? (1 - t) / 0.15 : 1);
    const h = this.add(anchor, { ...o, curve: o.curve ?? enter }, "hold", 2, (dt, k, i) => {
      spin += dt * speed;
      const r = o.radius * (0.8 + 0.2 * ease("out", Math.min(1, k * 12)));
      for (let n = 0; n < count; n++) {
        const a = phase + spin + (n / count) * Math.PI * 2;
        const px = Math.cos(a) * r, pz = Math.sin(a) * r;
        const py = pz * Math.sin(tilt) + Math.sin(this.time * 4 + n * 2.1) * bob;
        const wx = c.x + px, wy = c.y + py, wz = c.z + pz * Math.cos(tilt);
        tails[n].power = i;
        tails[n].push(wx, wy, wz);
        this.fx.glow(wx, wy, wz, o.color, size * 2.2 * i, 0.04);
        this.fx.glow(wx, wy, wz, coreHex, size * 0.9 * i, 0.035);
      }
      return true;
    }, () => { for (const t of tails) t.kill(); }) as MoveHandle;
    h.move = (a, b, d) => c.set(a, b, d);
    return h;
  }

  update(dt: number): void {
    this.time += dt;
    for (let n = this.live.length - 1; n >= 0; n--) {
      const l = this.live[n];
      l.t += dt;
      const finite = Number.isFinite(l.dur);
      const k = finite ? Math.min(1, l.t / l.dur) : 0.5;
      let i = (finite ? ease(l.curve, k) : 1) * l.power;
      const since = l.killed >= 0 ? l.t - l.killed : -1;
      if (since >= 0) i *= l.fade > 0 ? Math.max(0, 1 - since / l.fade) : 0;
      const alive = l.step(dt, k, i);
      if (!alive || (finite && l.t >= l.dur) || (since >= 0 && since >= l.fade)) {
        l.dispose();
        l.t = -1;
        this.live[n] = this.live[this.live.length - 1];
        this.live.pop();
      }
    }
  }

  clear(): void {
    for (const l of this.live) { l.dispose(); l.t = -1; }
    this.live.length = 0;
  }
}
