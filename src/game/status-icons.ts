// Estados visíveis (M5-05): fileira de ícones sobre a cabeça de cada inimigo, desenhados por código num canvas, e
// partículas no corpo (brasas, bolhas). Pedido do usuário: todo estado que muda o jogo tem indicador.
import * as THREE from "three";
import type { Enemy } from "./enemy";

export type StatusIconKind =
  | "burn" | "volatile" | "poison" | "slow" | "brittleChill" | "stun" | "frost" | "shatter";

/** Um estado de um inimigo, já pronto para desenhar. `n` aparece como número no canto (acúmulos); `until` é quando o estado
 * acaba (o contorno do ícone esvazia até lá). Sem `until` (acúmulos de gelo), o contorno fica cheio. */
export interface StatusBadge { kind: StatusIconKind; n?: number; until?: number }

/** O que vem da build do herói e muda o significado do estado. */
export interface StatusContext {
  now: number;
  /** chance do Volátil do Fireball (0 sem o marco ou o modificador) */
  volatile: number;
  /** dano extra em inimigo lento (Brittle Chill) */
  brittleChill: number;
}

/** Estados ativos de um inimigo, na ordem em que aparecem (o mais perigoso para ele primeiro). */
export function enemyStatuses(e: Enemy, ctx: StatusContext): StatusBadge[] {
  const out: StatusBadge[] = [];
  const now = ctx.now;
  const dots = e.dots.filter((d) => d.until > now);
  const burns = dots.filter((d) => d.kind === "burn");
  const last = (ds: typeof dots) => ds.reduce((m, d) => Math.max(m, d.until), 0);
  if (burns.length) {
    const fire = burns.some((d) => d.spell === "fireball");
    out.push({ kind: fire && ctx.volatile > 0 ? "volatile" : "burn", until: last(burns) });
  }
  const poisons = dots.filter((d) => d.kind === "poison");
  const poison = poisons.reduce((n, d) => n + (d.stacks ?? 1), 0);
  if (poison) out.push({ kind: "poison", n: poison > 1 ? poison : undefined, until: last(poisons) });
  if (now < e.stunUntil) out.push({ kind: "stun", until: e.stunUntil });
  if (now < e.frost.brittleUntil) out.push({ kind: "shatter", until: e.frost.brittleUntil });
  else if (e.frost.frostStacks > 0) out.push({ kind: "frost", n: e.frost.frostStacks });
  if (now < e.slowUntil && e.slowPower > 0) out.push({ kind: ctx.brittleChill > 0 ? "brittleChill" : "slow", until: e.slowUntil });
  return out;
}

/**
 * Quanto falta de cada estado, de 1 (acabou de pegar ou de renovar) a 0. O inimigo só guarda o fim (`until`), então a duração
 * total é medida aqui: quando o fim muda (estado novo ou renovado), o que falta naquele momento vira o 100%.
 */
export class StatusTimers<K extends object> {
  private spans = new WeakMap<K, Map<string, { until: number; span: number }>>();

  left(owner: K, kind: string, until: number, now: number): number {
    let m = this.spans.get(owner);
    if (!m) this.spans.set(owner, (m = new Map()));
    let cur = m.get(kind);
    if (!cur || cur.until !== until) {
      cur = { until, span: Math.max(1e-3, until - now) };
      m.set(kind, cur);
    }
    return Math.max(0, Math.min(1, (until - now) / cur.span));
  }
}

// ---------------------------------------------------------------- desenho dos ícones

const PX = 64;
const ICON_SIZE = 0.9; // metros
const ICON_GAP = 0.08;
const ENDING = 1; // segundos finais em que o ícone pulsa
const RING_W = 6;
const RING_STEPS = 48;

/** Cor do contorno de cada estado: a parte acesa é o relógio (`drawRing`), que esvazia até o estado acabar. */
const RING: Record<StatusIconKind, string> = {
  burn: "#ff7a1a", volatile: "#fff2b0", poison: "#5fd35f", slow: "#8fdcff",
  brittleChill: "#ff6a6a", stun: "#ffd94a", frost: "#8fdcff", shatter: "#ffffff",
};

/** Fundo do ícone. O contorno aqui é só o trilho apagado; a parte acesa vem por cima, do relógio. */
function disc(c: CanvasRenderingContext2D, fill: string, ring: string): void {
  c.beginPath();
  c.arc(32, 32, 27, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  c.lineWidth = RING_W;
  c.strokeStyle = "rgba(0,0,0,0.6)";
  c.stroke();
  c.globalAlpha = 0.25;
  c.strokeStyle = ring;
  c.stroke();
  c.globalAlpha = 1;
}

/** Contorno aceso: arco que sai do topo no sentido horário, com `k` de `RING_STEPS` passos. */
function drawRing(color: string, k: number): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = cv.height = PX;
  if (k <= 0) return cv;
  const c = cv.getContext("2d")!;
  const a0 = -Math.PI / 2;
  c.beginPath();
  c.arc(32, 32, 27, a0, a0 + (k / RING_STEPS) * Math.PI * 2);
  c.lineWidth = RING_W;
  c.lineCap = k < RING_STEPS ? "round" : "butt";
  c.strokeStyle = color;
  c.stroke();
  return cv;
}

function flame(c: CanvasRenderingContext2D, s: number, outer: string, inner: string): void {
  const f = (k: number, col: string) => {
    c.save();
    c.translate(32, 40);
    c.scale(s * k, s * k);
    c.beginPath();
    c.moveTo(0, 12);
    c.bezierCurveTo(-13, 12, -15, -2, -6, -10);
    c.bezierCurveTo(-5, -4, -2, -3, -1, -4);
    c.bezierCurveTo(-3, -12, 2, -20, 5, -24);
    c.bezierCurveTo(5, -14, 15, -8, 13, 2);
    c.bezierCurveTo(12, 9, 6, 12, 0, 12);
    c.fillStyle = col;
    c.fill();
    c.restore();
  };
  f(1, outer);
  f(0.55, inner);
}

function snowflake(c: CanvasRenderingContext2D, col: string): void {
  c.save();
  c.translate(32, 32);
  c.strokeStyle = col;
  c.lineCap = "round";
  c.lineWidth = 4;
  for (let i = 0; i < 6; i++) {
    c.rotate(Math.PI / 3);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -18);
    c.moveTo(0, -11);
    c.lineTo(-6, -16);
    c.moveTo(0, -11);
    c.lineTo(6, -16);
    c.stroke();
  }
  c.restore();
}

function crystal(c: CanvasRenderingContext2D, fill: string, edge: string): void {
  c.beginPath();
  c.moveTo(32, 9);
  c.lineTo(46, 30);
  c.lineTo(32, 55);
  c.lineTo(18, 30);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  c.lineWidth = 3;
  c.strokeStyle = edge;
  c.stroke();
  c.beginPath();
  c.moveTo(32, 9);
  c.lineTo(32, 55);
  c.moveTo(18, 30);
  c.lineTo(46, 30);
  c.lineWidth = 1.5;
  c.stroke();
}

function crack(c: CanvasRenderingContext2D, col: string): void {
  c.beginPath();
  c.moveTo(22, 12);
  c.lineTo(32, 26);
  c.lineTo(26, 34);
  c.lineTo(38, 46);
  c.lineTo(34, 56);
  c.strokeStyle = col;
  c.lineWidth = 3.5;
  c.lineJoin = "round";
  c.stroke();
}

function badge(c: CanvasRenderingContext2D, text: string, fill: string): void {
  c.beginPath();
  c.arc(49, 49, 15, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  c.lineWidth = 2.5;
  c.strokeStyle = "#10121c";
  c.stroke();
  c.fillStyle = "#fff";
  c.font = `900 ${text.length > 1 ? 17 : 21}px system-ui, sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(text, 49, 50);
}

function drawIcon(kind: StatusIconKind, n: number | undefined): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = cv.height = PX;
  const c = cv.getContext("2d")!;
  switch (kind) {
    case "burn":
      disc(c, "#3a1408", "#ff7a1a");
      flame(c, 1.05, "#ff7a1a", "#ffd166");
      break;
    case "volatile": {
      // chama dentro de uma estrela de explosão: pode explodir ao morrer
      disc(c, "#ffd94a", "#fff2b0");
      c.save();
      c.translate(32, 32);
      c.beginPath();
      for (let i = 0; i < 16; i++) {
        const r = i % 2 ? 16 : 27;
        const a = (i / 16) * Math.PI * 2;
        c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath();
      c.fillStyle = "#d1300c";
      c.fill();
      c.restore();
      flame(c, 0.8, "#ffd94a", "#ffffff");
      break;
    }
    case "poison":
      disc(c, "#0f2a12", "#5fd35f");
      c.beginPath();
      c.moveTo(32, 12);
      c.bezierCurveTo(44, 28, 46, 36, 44, 42);
      c.bezierCurveTo(41, 52, 23, 52, 20, 42);
      c.bezierCurveTo(18, 36, 20, 28, 32, 12);
      c.fillStyle = "#5fd35f";
      c.fill();
      c.beginPath();
      c.arc(27, 40, 4, 0, Math.PI * 2);
      c.fillStyle = "#c8f7c8";
      c.fill();
      break;
    case "slow":
      disc(c, "#0e2236", "#8fdcff");
      snowflake(c, "#cdeeff");
      break;
    case "brittleChill":
      disc(c, "#0e2236", "#ff6a6a");
      snowflake(c, "#cdeeff");
      crack(c, "#ff6a6a");
      break;
    case "stun": {
      disc(c, "#2e2608", "#ffd94a");
      c.fillStyle = "#ffe98a";
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 - Math.PI / 2;
        const x = 32 + Math.cos(a) * 12;
        const y = 32 + Math.sin(a) * 12;
        c.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? 3.2 : 8;
          const b = (i / 10) * Math.PI * 2 - Math.PI / 2;
          c.lineTo(x + Math.cos(b) * r, y + Math.sin(b) * r);
        }
        c.closePath();
        c.fill();
      }
      break;
    }
    case "frost":
      disc(c, "#0e2236", "#8fdcff");
      crystal(c, "#8fdcff", "#e6f8ff");
      break;
    case "shatter":
      disc(c, "#1a2a3a", "#ffffff");
      crystal(c, "#e6f8ff", "#ffffff");
      crack(c, "#1a5a8a");
      break;
  }
  if (n !== undefined) badge(c, String(Math.min(99, n)), kind === "poison" ? "#2f8f2f" : "#2f6f9f");
  return cv;
}

// ---------------------------------------------------------------- sprites sobre os inimigos

export class StatusIcons {
  private mats = new Map<string, THREE.SpriteMaterial>();
  private timers = new StatusTimers<Enemy>();
  private pool: THREE.Sprite[] = [];
  private used = 0;
  private right = new THREE.Vector3();
  private emberT = new WeakMap<Enemy, number>();

  constructor(private scene: THREE.Scene) {}

  private cached(key: string, draw: () => HTMLCanvasElement): THREE.SpriteMaterial {
    let m = this.mats.get(key);
    if (!m) {
      const tex = new THREE.CanvasTexture(draw());
      tex.colorSpace = THREE.SRGBColorSpace;
      m = new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, toneMapped: false, transparent: true });
      this.mats.set(key, m);
    }
    return m;
  }

  private material(b: StatusBadge): THREE.SpriteMaterial {
    return this.cached(`${b.kind}:${b.n ?? ""}`, () => drawIcon(b.kind, b.n));
  }

  /** O relógio do ícone, em `RING_STEPS` passos (uma textura por passo e por cor, feitas sob demanda). */
  private ring(kind: StatusIconKind, left: number): THREE.SpriteMaterial {
    const k = Math.ceil(left * RING_STEPS);
    return this.cached(`ring:${kind}:${k}`, () => drawRing(RING[kind], k));
  }

  private sprite(order: number): THREE.Sprite {
    let s = this.pool[this.used];
    if (!s) {
      s = new THREE.Sprite();
      this.pool.push(s);
      this.scene.add(s);
    }
    s.renderOrder = order;
    s.visible = true;
    this.used++;
    return s;
  }

  /** Refaz a fileira de ícones de cada inimigo vivo e solta as partículas dos estados. */
  update(enemies: readonly Enemy[], ctx: StatusContext, camera: THREE.Camera, fx: Fx, dt: number): void {
    this.used = 0;
    this.right.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
    for (const e of enemies) {
      if (e.dead) continue;
      const list = enemyStatuses(e, ctx);
      if (!list.length) continue;
      const y = e.rig.root.position.y + e.rig.height + 0.55;
      const w = list.length * ICON_SIZE + (list.length - 1) * ICON_GAP;
      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        const off = -w / 2 + ICON_SIZE / 2 + i * (ICON_SIZE + ICON_GAP);
        const x = e.x + this.right.x * off;
        const z = e.z + this.right.z * off;
        const left = b.until === undefined ? 1 : this.timers.left(e, b.kind, b.until, ctx.now);
        // no último segundo o ícone pulsa: o estado está para acabar
        const ending = b.until !== undefined && b.until - ctx.now < ENDING;
        const size = ICON_SIZE * (ending ? 1 + 0.14 * Math.abs(Math.sin(ctx.now * 9)) : 1);
        for (const [order, mat] of [[20, this.material(b)], [21, this.ring(b.kind, left)]] as const) {
          const s = this.sprite(order);
          s.material = mat;
          s.scale.setScalar(size);
          s.position.set(x, y, z);
        }
      }
      this.particles(e, list, fx, dt);
    }
    for (let i = this.used; i < this.pool.length; i++) this.pool[i].visible = false;
  }

  /** Brasas de quem queima, bolhas de quem está envenenado, cristais caindo de quem está lento. */
  private particles(e: Enemy, list: StatusBadge[], fx: Fx, dt: number): void {
    let t = (this.emberT.get(e) ?? 0) - dt;
    if (t > 0) {
      this.emberT.set(e, t);
      return;
    }
    t += 0.12;
    this.emberT.set(e, Math.max(0, t));
    const h = e.rig.height;
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * e.radius * 0.8;
    const x = e.x + Math.cos(a) * r;
    const z = e.z + Math.sin(a) * r;
    for (const b of list) {
      if (b.kind === "burn" || b.kind === "volatile") {
        fx.glow(x, 0.3 + Math.random() * h * 0.7, z, b.kind === "volatile" ? 0xffb02e : 0xff6a1a, 0.28, 0.6, 0, 2 + Math.random() * 1.5, 0, -1);
      } else if (b.kind === "poison") {
        fx.glow(x, 0.3 + Math.random() * h * 0.5, z, 0x6fe36f, 0.22, 0.7, 0, 1 + Math.random(), 0, 0);
      } else if (b.kind === "slow" || b.kind === "brittleChill") {
        fx.glow(x, h * (0.6 + Math.random() * 0.4), z, 0xcdeeff, 0.16, 0.6, 0, -0.6, 0, 0);
      }
    }
  }

  clear(): void {
    for (const s of this.pool) s.visible = false;
  }
}

type Fx = { glow(x: number, y: number, z: number, color: number, size: number, life: number, vx?: number, vy?: number, vz?: number, grav?: number): void };
