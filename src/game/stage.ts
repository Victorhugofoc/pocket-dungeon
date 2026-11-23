// Palco 3D da tela de seleção de herói (M14-08 parte 2): o herói escolhido em pé, com o modelo do Blender,
// animação de espera, luz e chão próprios, girar arrastando o mouse e troca animada ao mudar de herói.
// Usa o renderer do jogo numa cena própria (sem segundo contexto WebGL): desenha num canto do canvas do jogo,
// que está tapado pela tela de título, e copia para um canvas 2D dentro do palco. Só roda com a tela aberta.
import * as THREE from "three";
import { HEROES, HERO_ORDER } from "../data/heroes";
import { animateRig, type Rig } from "./models";
import { characterRig } from "./rigs";

/** quanto dura a entrada de um herói novo (s) e quando ele mostra o golpe depois de chegar */
const ARRIVE = 0.5;
const SHOW_ATTACK_AT = 0.75;
const ATTACK_LEN = 0.55;
/** ângulo de descanso (3/4 de frente) e quanto tempo depois de soltar o mouse ele volta */
const HOME_YAW = -0.38;
const RETURN_AFTER = 2.2;

function floorTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.55, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class HeroStage {
  readonly canvas = document.createElement("canvas");
  private ctx = this.canvas.getContext("2d")!;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.3, 80);
  private rigs = new Map<string, Rig>();
  private heroId = "";
  private locked = false;
  private host: HTMLElement | null = null;
  private open = false;
  private t = 0;
  /** tempo desde que o herói atual entrou */
  private since = 0;
  private yaw = HOME_YAW;
  private yawVel = 0;
  private drag: { x: number; last: number } | null = null;
  private idle = RETURN_AFTER;
  private rim: THREE.DirectionalLight;
  private glow: THREE.Mesh;
  private ring: THREE.Mesh;
  private silhouette = new THREE.MeshBasicMaterial({ color: 0x05050a });
  private viewport = new THREE.Vector4();

  constructor(private renderer: THREE.WebGLRenderer) {
    const s = this.scene;
    s.background = new THREE.Color(0x0d0e15);
    s.fog = new THREE.Fog(0x0d0e15, 9, 22);
    s.add(new THREE.HemisphereLight(0xc8c4e8, 0x2a2430, 1.1));
    const key = new THREE.DirectionalLight(0xfff0dc, 2.6);
    key.position.set(-3.5, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const sc = key.shadow.camera;
    sc.left = sc.bottom = -3;
    sc.right = sc.top = 3;
    sc.near = 1;
    sc.far = 20;
    key.shadow.bias = -0.0008;
    key.shadow.normalBias = 0.02;
    s.add(key);
    this.rim = new THREE.DirectionalLight(0xffffff, 2.2);
    this.rim.position.set(2.5, 4, -5);
    s.add(this.rim);
    const tex = floorTexture();
    // chão: disco escuro que recebe a sombra, brilho da cor do herói por baixo e um anel que pisca na troca
    const floor = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48), new THREE.MeshStandardMaterial({ color: 0x1b1a26, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    s.add(floor);
    this.glow = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.32, depthWrite: false, toneMapped: false }));
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.position.y = 0.01;
    s.add(this.glow);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.05, 48),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.02;
    s.add(this.ring);
    this.canvas.className = "hs-canvas";
    this.canvas.onpointerdown = (e) => {
      this.canvas.setPointerCapture(e.pointerId);
      this.drag = { x: e.clientX, last: performance.now() };
    };
    this.canvas.onpointermove = (e) => {
      if (!this.drag) return;
      const dx = e.clientX - this.drag.x;
      const now = performance.now();
      this.drag.x = e.clientX;
      this.yaw += dx * 0.012;
      this.yawVel = (dx * 0.012) / Math.max(0.008, (now - this.drag.last) / 1000);
      this.drag.last = now;
      this.idle = 0;
    };
    this.canvas.onpointerup = this.canvas.onpointercancel = () => (this.drag = null);
  }

  /** monta os 9 heróis e compila os shaders de uma vez, para a troca não travar */
  private warm(): void {
    if (this.rigs.size) return;
    for (const id of HERO_ORDER) {
      const rig = characterRig(id, "hero");
      rig.root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.castShadow = true;
      });
      this.scene.add(rig.root);
      this.rigs.set(id, rig);
      animateRig(rig, { t: 0, move: 0, attack: -1, windup: 0, dead: 0 });
    }
    // a silhueta (herói trancado) entra num plano minúsculo, para o programa dela já existir
    const probe = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), this.silhouette);
    probe.castShadow = true;
    this.scene.add(probe);
    this.renderer.compile(this.scene, this.camera);
    probe.removeFromParent();
    probe.geometry.dispose();
  }

  /** Mostra (ou atualiza) o palco dentro de `host`; chamado a cada redesenho da tela. */
  show(host: HTMLElement, heroId: string, locked: boolean): void {
    this.warm();
    this.open = true;
    if (this.host !== host) {
      this.host = host;
      host.appendChild(this.canvas);
    }
    if (heroId !== this.heroId) {
      this.heroId = heroId;
      this.since = 0;
      const c = new THREE.Color(HEROES[heroId].color);
      this.rim.color.copy(c).lerp(new THREE.Color(0xffffff), 0.35);
      (this.glow.material as THREE.MeshBasicMaterial).color.copy(c);
      (this.ring.material as THREE.MeshBasicMaterial).color.copy(c);
      for (const [id, rig] of this.rigs) rig.root.visible = id === heroId;
    }
    if (locked !== this.locked || heroId !== this.shaded) this.shade(locked);
  }

  /** herói trancado vira silhueta preta (só o corpo; chão e luz continuam) */
  private shaded = "";
  private shade(locked: boolean): void {
    for (const [id, rig] of this.rigs) {
      const on = locked && id === this.heroId;
      rig.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        if (on && m.material !== this.silhouette) {
          m.userData.stageMat = m.material;
          m.material = this.silhouette;
        } else if (!on && m.userData.stageMat) {
          m.material = m.userData.stageMat;
          delete m.userData.stageMat;
        }
      });
    }
    this.locked = locked;
    this.shaded = this.heroId;
  }

  hide(): void {
    this.open = false;
    this.host = null;
    this.drag = null;
    this.canvas.remove();
  }

  get active(): boolean {
    return this.open;
  }

  /** Um quadro do palco; o jogo chama enquanto a partida não começou. */
  frame(dt: number): void {
    if (!this.open || !this.host || !this.host.isConnected) return;
    const rect = this.host.getBoundingClientRect();
    const w = Math.floor(Math.min(rect.width, window.innerWidth));
    const h = Math.floor(Math.min(rect.height, window.innerHeight));
    if (w < 8 || h < 8) return;
    this.t += dt;
    this.since += dt;
    const rig = this.rigs.get(this.heroId);
    if (!rig) return;

    // girar: arrasto com inércia; parado, volta devagar para o 3/4 de frente
    if (!this.drag) {
      this.yaw += this.yawVel * dt;
      this.yawVel *= Math.exp(-dt * 4);
      this.idle += dt;
      if (this.idle > RETURN_AFTER) {
        const home = HOME_YAW + Math.round((this.yaw - HOME_YAW) / (Math.PI * 2)) * Math.PI * 2;
        this.yaw += (home - this.yaw) * Math.min(1, dt * 2);
      }
    }
    // entrada: cai do alto com um leve passar do ponto, e o anel no chão se abre
    const u = Math.min(1, this.since / ARRIVE);
    const back = 1 + 2.4 * Math.pow(u - 1, 3) + 1.4 * Math.pow(u - 1, 2);
    rig.root.position.set(0, (1 - back) * 1.2, 0);
    rig.root.rotation.y = this.yaw;
    rig.inner.scale.setScalar(0.85 + 0.15 * back);
    const ringK = Math.min(1, this.since / 0.7);
    this.ring.scale.setScalar(0.6 + ringK * 1.6);
    (this.ring.material as THREE.MeshBasicMaterial).opacity = this.since < ARRIVE * 0.6 ? 0 : (1 - ringK) * 0.9;
    const a = this.since - SHOW_ATTACK_AT;
    const attack = !this.locked && a >= 0 && a < ATTACK_LEN ? a / ATTACK_LEN : -1;
    animateRig(rig, { t: this.t, move: 0, attack, windup: 0, dead: 0 });

    // enquadra pela altura do herói, com a cabeça abaixo do nome
    const ht = rig.height;
    // palco estreito (tela pequena) afasta a câmera para o herói caber na largura
    const dist = ht * Math.max(3.9, 2.6 / Math.min(1, w / h));
    this.camera.aspect = w / h;
    this.camera.position.set(0, ht * 0.75, dist);
    this.camera.lookAt(0, ht * 0.66, 0);
    this.camera.updateProjectionMatrix();

    const r = this.renderer;
    const pr = r.getPixelRatio();
    r.getViewport(this.viewport);
    r.setViewport(0, 0, w, h);
    r.render(this.scene, this.camera);
    const cw = Math.floor(w * pr), ch = Math.floor(h * pr);
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
    // a cópia sai do mesmo quadro (antes de o navegador compor), então não precisa de preserveDrawingBuffer
    const src = r.domElement;
    this.ctx.drawImage(src, 0, src.height - ch, cw, ch, 0, 0, cw, ch);
    r.setViewport(this.viewport);
  }
}
