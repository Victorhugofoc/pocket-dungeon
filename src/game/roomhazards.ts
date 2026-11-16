// Perigos de chão das salas na clareira da onda (room_effects.lua): o raio avisa no chão, cai e fica eletrizando o
// círculo por `duration` segundos; a poça de cura brota num ponto da clareira e cura quem estiver dentro a cada tique.
// Os relógios e as contas ficam em core/roomfx.ts; aqui só o lugar, o desenho e o efeito no herói.
import * as THREE from "three";
import { startRoomFx, stepRoomFx, stormDps, tickCount, type RoomFx } from "../core/roomfx";
import type { Segment } from "../core/worldgen";
import { POOL_TICK, STORM, type RoomDef } from "../data/rooms";
import { DR_BASE_HP } from "../data/techniques";
import { TUNING } from "../data/tuning";
import type { Fx } from "./fx";

/** raio do herói para "está dentro" (EA.playerInside soma o raio do herói) */
const HERO_R = 0.4;
const STORM_COLOR = 0x9fd8ff;
const POOL_COLOR = 0x5fe39a;

interface Zone {
  x: number; z: number; r: number;
  time: number; total: number; tick: number; tickLeft: number;
  amount: number;
  disc: THREE.Mesh; edge: THREE.Mesh;
}

export interface HazardHost {
  scene: THREE.Scene;
  fx: Fx;
  player(): { x: number; z: number; alive: boolean };
  /** dano do raio, em vida do Dungeon Reign como o dos inimigos */
  hurt(amount: number): void;
  /** cura (o jogo aplica o corte da cura em combate, como `Damage.healPlayer`) */
  heal(amount: number): void;
  maxHp(): number;
  zap(): void;
}

type Pools = NonNullable<RoomDef["pools"]>;
type Telegraph = ReturnType<Fx["telegraphCircle"]>;

const DISC = new THREE.CircleGeometry(1, 40);
const RING = new THREE.RingGeometry(0.95, 1, 40);
const px = (v: number) => v * TUNING.enemy.pxToUnit;

export class RoomHazards {
  private fx: RoomFx | null = null;
  private pools: Pools | null = null;
  private seg: Segment | null = null;
  private wave = 1;
  private storms: Zone[] = [];
  private heals: Zone[] = [];
  /** raios avisados que ainda não caíram */
  private pending = new Set<Telegraph>();

  constructor(private host: HazardHost) {}

  /** `RE.start` no começo da luta da onda. */
  start(room: RoomDef | null, seg: Segment, wave: number): void {
    this.clear();
    this.fx = startRoomFx(room);
    this.pools = room?.pools ?? null;
    this.seg = seg;
    this.wave = wave;
  }

  /** Fim da onda: não nasce mais nada e os avisos pendentes somem; o que está no chão termina o tempo dele. */
  stop(): void {
    this.fx = null;
    for (const tg of this.pending) this.host.fx.cancelTelegraph(tg);
    this.pending.clear();
  }

  update(dt: number, time: number): void {
    const p = this.host.player();
    if (this.fx && p.alive) {
      const s = stepRoomFx(this.fx, dt);
      if (s.storm) this.spawnStorm();
      if (s.pool) this.spawnPool();
    }
    const inside = (z: Zone) => p.alive && (p.x - z.x) ** 2 + (p.z - z.z) ** 2 <= (z.r + HERO_R) ** 2;
    for (let i = this.storms.length - 1; i >= 0; i--) {
      const z = this.storms[i];
      const n = tickCount(z, dt);
      for (let k = 0; k < n; k++) {
        this.bolt(z, 0.6);
        if (inside(z)) this.host.hurt(z.amount);
      }
      this.drawStorm(z, dt, time);
      if (z.time <= 0) this.remove(this.storms, i);
    }
    for (let i = this.heals.length - 1; i >= 0; i--) {
      const z = this.heals[i];
      const n = tickCount(z, dt);
      for (let k = 0; k < n; k++) if (inside(z)) this.host.heal(z.amount);
      this.drawPool(z, dt, time);
      if (z.time <= 0) this.remove(this.heals, i);
    }
  }

  clear(): void {
    this.stop();
    for (const z of [...this.storms, ...this.heals]) this.dispose(z);
    this.storms.length = 0;
    this.heals.length = 0;
  }

  /** O que há no chão agora (checagem pelo console). */
  snapshot(): { storms: object[]; pools: object[]; pending: number; armed: boolean } {
    const f = (z: Zone) => ({ x: +z.x.toFixed(2), z: +z.z.toFixed(2), r: +z.r.toFixed(2), time: +z.time.toFixed(2), amount: +z.amount.toFixed(2) });
    return { storms: this.storms.map(f), pools: this.heals.map(f), pending: this.pending.size, armed: !!this.fx };
  }

  // ------------------------------------------------------------------ nascer

  /** um ponto da clareira com folga `margin` da borda (`randomPoint`; lá a arena é um retângulo) */
  private randomPoint(margin: number): { x: number; z: number } {
    const sg = this.seg!;
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * Math.max(0, sg.r - margin);
    return { x: sg.x + Math.cos(a) * d, z: sg.z + Math.sin(a) * d };
  }

  /** `RE.spawnStorm`: 60% perto do herói (até 110 px), senão em qualquer ponto da clareira. */
  private spawnStorm(): void {
    const sg = this.seg!;
    const r = px(STORM.radius);
    const p = this.host.player();
    let at: { x: number; z: number };
    if (Math.random() < STORM.nearPlayerChance) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * px(STORM.nearPlayerPx);
      at = { x: p.x + Math.cos(a) * d, z: p.z + Math.sin(a) * d };
      // dentro da clareira, como o `clamp` na arena de lá
      const dx = at.x - sg.x, dz = at.z - sg.z, dd = Math.hypot(dx, dz), max = sg.r - r;
      if (dd > max) at = { x: sg.x + (dx / dd) * max, z: sg.z + (dz / dd) * max };
    } else at = this.randomPoint(r);
    const dur = this.fx!.stormDuration;
    const amount = stormDps(this.wave) * STORM.tick;
    const tg = this.host.fx.telegraphCircle(at.x, at.z, r, STORM.warning, () => {
      this.pending.delete(tg);
      this.strike(at.x, at.z, r);
      this.storms.push(this.zone(at.x, at.z, r, dur, STORM.tick, amount, STORM_COLOR));
    });
    this.pending.add(tg);
  }

  /** `RE.spawnPool`: cura `heal` de 100 de vida de lá por tique = fração da vida máxima daqui. */
  private spawnPool(): void {
    const cfg = this.pools!;
    const r = px(cfg.radius);
    const at = this.randomPoint(r + px(10));
    this.heals.push(this.zone(at.x, at.z, r, cfg.duration, POOL_TICK, this.host.maxHp() * (cfg.heal / DR_BASE_HP), POOL_COLOR));
    this.host.fx.burst(at.x, 0.3, at.z, POOL_COLOR, 18, 3, 0.14, 0.7, -2);
  }

  private zone(x: number, z: number, r: number, time: number, tick: number, amount: number, color: number): Zone {
    const mk = (geo: THREE.BufferGeometry, y: number) => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending,
      }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, y, z);
      m.scale.setScalar(r);
      this.host.scene.add(m);
      return m;
    };
    return { x, z, r, time, total: time, tick, tickLeft: tick, amount, disc: mk(DISC, 0.05), edge: mk(RING, 0.06) };
  }

  private remove(list: Zone[], i: number): void {
    this.dispose(list[i]);
    list.splice(i, 1);
  }

  private dispose(z: Zone): void {
    for (const m of [z.disc, z.edge]) {
      m.removeFromParent();
      (m.material as THREE.Material).dispose();
    }
  }

  // ------------------------------------------------------------------ desenho

  /** O raio cai do céu: coluna de luz em zigue-zague, clarão e onda no chão. */
  private strike(x: number, z: number, r: number): void {
    const fx = this.host.fx;
    let bx = x, bz = z;
    for (let y = 0; y < 9; y += 0.35) {
      bx += (Math.random() - 0.5) * 0.5;
      bz += (Math.random() - 0.5) * 0.5;
      fx.glow(bx, y, bz, y < 0.5 ? 0xffffff : STORM_COLOR, 0.9 - y * 0.05, 0.18);
    }
    fx.impact(x, 0.4, z, STORM_COLOR, 1.6);
    fx.flashLight(x, 2.5, z, STORM_COLOR, 90, 0.3);
    fx.shockwave(x, z, r, STORM_COLOR, 0.3);
    fx.addShake(0.12);
    this.host.zap();
  }

  /** Raios curtos correndo pelo chão do círculo (no tique, mais fortes). */
  private bolt(z: Zone, power: number): void {
    const fx = this.host.fx;
    const a = Math.random() * Math.PI * 2;
    let x0 = z.x, z0 = z.z;
    const steps = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < steps; i++) {
      const d = (z.r / steps) * (0.8 + Math.random() * 0.4);
      const aa = a + (Math.random() - 0.5) * 1.4;
      const x1 = x0 + Math.cos(aa) * d, z1 = z0 + Math.sin(aa) * d;
      fx.streak(x0, z0, x1, z1, 0.06 + power * 0.08, 0xeaf6ff, 0.08 + power * 0.08);
      x0 = x1;
      z0 = z1;
    }
    if (power >= 0.5) fx.glow(x0, 0.3, z0, STORM_COLOR, 0.8, 0.15);
  }

  private drawStorm(z: Zone, dt: number, time: number): void {
    const fade = Math.min(1, z.time / 0.35);
    (z.disc.material as THREE.MeshBasicMaterial).opacity = fade * (0.04 + Math.random() * 0.05);
    (z.edge.material as THREE.MeshBasicMaterial).opacity = fade * (0.28 + Math.sin(time * 18) * 0.1);
    if (Math.random() < dt * 14) this.bolt(z, 0.2);
    if (Math.random() < dt * 14) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * z.r;
      this.host.fx.spark(z.x + Math.cos(a) * d, 0.15, z.z + Math.sin(a) * d, 0xfff6c0, 0.1, 0.25, 2.5);
    }
  }

  private drawPool(z: Zone, dt: number, time: number): void {
    const fade = Math.max(0, Math.min(1, z.time / 0.8, (z.total - z.time) / 0.5));
    (z.disc.material as THREE.MeshBasicMaterial).opacity = fade * (0.1 + Math.sin(time * 2.5) * 0.03);
    (z.edge.material as THREE.MeshBasicMaterial).opacity = fade * 0.35;
    if (Math.random() < dt * 12 * fade) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * z.r;
      this.host.fx.glow(z.x + Math.cos(a) * d, 0.1, z.z + Math.sin(a) * d, POOL_COLOR, 0.35, 1.2, 0, 1.2, 0);
    }
  }
}
