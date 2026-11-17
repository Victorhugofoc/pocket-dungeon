// Orbes de ouro e XP no chão (combat/loot.lua, pickups.lua `lootOrb` e `bankFly` do Dungeon Reign), desenhados por código.
// A lógica (cair, puxar, coletar, guardar no banco) é do núcleo (`core/loot.ts`); aqui ficam a moeda, a faísca de XP e o voo
// dos orbes guardados no fim da onda.
import * as THREE from "three";
import { LootField, type LootOrb } from "../core/loot";

const COIN_GEO = new THREE.CylinderGeometry(0.17, 0.17, 0.05, 14);
const SPARK_GEO = new THREE.IcosahedronGeometry(1, 0);
const GLOW_GEO = new THREE.CircleGeometry(0.42, 18);
const COIN_MAT = new THREE.MeshStandardMaterial({ color: 0xffc83d, emissive: 0xb07a10, emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.35, flatShading: true });
const SPARK_MAT = new THREE.MeshBasicMaterial({ color: 0xd8f2ff, toneMapped: false });
const XP_MAT = new THREE.MeshBasicMaterial({ color: 0x73bfff, transparent: true, opacity: 0.55, toneMapped: false });
const GLOW_MAT = new THREE.MeshBasicMaterial({ color: 0xffd966, transparent: true, opacity: 0.25, depthWrite: false, toneMapped: false });

interface View {
  orb: LootOrb;
  g: THREE.Group;
  spin: THREE.Object3D[];
  glow: THREE.Mesh | null;
  phase: number;
}

interface Flyer {
  g: THREE.Group;
  from: THREE.Vector3;
  t: number;
  delay: number;
  side: number;
}

const FLY_TIME = 1.0;

export class LootView {
  readonly field = new LootField();
  private views = new Map<LootOrb, View>();
  private flyers: Flyer[] = [];
  private time = 0;

  constructor(private scene: THREE.Scene) {}

  /** Um inimigo morreu: o orbe cai (null quando nada caiu ou o chão estava cheio). */
  drop(x: number, z: number, gold: number, xp: number, bank: [number, number][] | null): LootOrb | null {
    const o = this.field.drop(x, z, gold, xp, bank, { a: Math.random() * Math.PI * 2, r: 4 + Math.random() * 10 });
    if (o) this.views.set(o, this.build(o));
    return o;
  }

  private build(o: LootOrb): View {
    const g = new THREE.Group();
    const spin: THREE.Object3D[] = [];
    let glow: THREE.Mesh | null = null;
    if (o.gold <= 0) {
      // só XP: uma faísca azul num halo
      const halo = new THREE.Mesh(SPARK_GEO, XP_MAT);
      halo.scale.setScalar(0.2);
      const core = new THREE.Mesh(SPARK_GEO, SPARK_MAT);
      core.scale.setScalar(0.09);
      g.add(halo, core);
    } else {
      const coins = o.double ? [[-0.13, 0.05], [0.13, -0.03]] : [[0, 0]];
      for (const [dx, dy] of coins) {
        const c = new THREE.Mesh(COIN_GEO, COIN_MAT);
        c.rotation.x = Math.PI / 2;
        const pivot = new THREE.Group();
        pivot.position.set(dx, dy, 0);
        pivot.add(c);
        g.add(pivot);
        spin.push(pivot);
      }
      if (o.double) {
        glow = new THREE.Mesh(GLOW_GEO, GLOW_MAT);
        glow.rotation.x = -Math.PI / 2;
        g.add(glow);
      }
      if (o.xp > 0) {
        // a faísca de XP que vai junto com a moeda
        const s = new THREE.Mesh(SPARK_GEO, SPARK_MAT);
        s.scale.setScalar(0.06);
        s.position.set(0.2, 0.22, 0);
        g.add(s);
      }
    }
    g.position.set(o.x, 0.3, o.z);
    this.scene.add(g);
    return { orb: o, g, spin, glow, phase: Math.random() * Math.PI * 2 };
  }

  /** Assenta, puxa e coleta; devolve os orbes que chegaram ao herói. */
  update(dt: number, hero: { x: number; z: number }, alive: boolean): LootOrb[] {
    this.time += dt;
    const got = this.field.update(dt, hero, alive);
    for (const o of got) this.dispose(o);
    for (const v of this.views.values()) {
      const o = v.orb;
      // pulo para fora do corpo, depois flutua; puxado, vai baixo e reto
      const hop = Math.min(1, o.t / 0.25);
      const lift = o.pulled ? 0.5 : Math.sin(hop * Math.PI) * 0.85 + 0.3 + Math.sin(this.time * 3 + v.phase) * 0.08;
      v.g.position.set(o.x, lift, o.z);
      for (const s of v.spin) s.rotation.y = this.time * 4 + v.phase;
      if (v.glow) {
        v.glow.position.y = 0.05 - lift;
        (v.glow.material as THREE.MeshBasicMaterial).opacity = 0.22 + 0.1 * Math.sin(this.time * 5 + v.phase);
      }
    }
    this.updateFlyers(dt);
    return got;
  }

  /** Fim da onda: o que ficou no chão vai para o banco e sobe voando (D-637). Devolve quantos orbes foram guardados. */
  bank(bank: [number, number][]): number {
    const left = this.field.bankLeftovers(bank);
    const n = Math.min(left.length, 24);
    left.forEach((o, i) => {
      const v = this.views.get(o)!;
      this.views.delete(o);
      if (i >= 24) {
        v.g.removeFromParent();
        return;
      }
      this.flyers.push({ g: v.g, from: v.g.position.clone(), t: 0, delay: Math.min(0.45, (i * 0.45) / Math.max(1, n - 1)), side: i % 2 ? 1 : -1 });
    });
    return left.length;
  }

  private updateFlyers(dt: number): void {
    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const f = this.flyers[i];
      f.t += dt;
      const q = Math.max(0, Math.min(1, (f.t / FLY_TIME - f.delay) / (1 - f.delay)));
      // sobe em arco para o lado e some no alto, rumo ao contador do HUD
      const e = q * q * (3 - 2 * q);
      f.g.position.set(f.from.x + Math.sin(q * Math.PI) * 0.8 * f.side, f.from.y + e * 7, f.from.z - e * 2);
      f.g.scale.setScalar(1 - e * 0.6);
      if (f.t >= FLY_TIME) {
        f.g.removeFromParent();
        this.flyers.splice(i, 1);
      }
    }
  }

  private dispose(o: LootOrb): void {
    const v = this.views.get(o);
    if (!v) return;
    v.g.removeFromParent();
    this.views.delete(o);
  }

  /** Troca de zona ou fim de partida: tira tudo do chão sem guardar. */
  clear(): void {
    for (const v of this.views.values()) v.g.removeFromParent();
    this.views.clear();
    for (const f of this.flyers) f.g.removeFromParent();
    this.flyers.length = 0;
    this.field.orbs = [];
  }
}
