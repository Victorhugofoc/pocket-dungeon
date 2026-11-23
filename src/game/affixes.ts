// Afixos de campeão no tempo real (M9-06, affix_system.lua `update`, `explode` e os ganchos de damage.lua): regeneração,
// escudo arcano, invocação, teleporte, rastro de veneno, explosão na morte, gelo e vampirismo no golpe. Os números ficam em
// data/affixes.ts e o sorteio em core/affixes.ts. Efeito visual só o mínimo para ler a mecânica (fase 1, D17).
import * as THREE from "three";
import { AFFIXES, AFFIX_SUMMON_RING, AFFIX_VENOM_TICK, type AffixDef } from "../data/affixes";
import { TUNING } from "../data/tuning";
import type { Enemy } from "./enemy";
import type { Game } from "./game";

const px = (v: number) => v * TUNING.enemy.pxToUnit;
const hex = (c: AffixDef["color"]) => new THREE.Color(c[0], c[1], c[2]).getHex();
/** raio do herói para "está dentro" (EA.insideHazard soma o raio do herói) */
const HERO_R = 0.4;

const DISC = new THREE.CircleGeometry(1, 28);
const SPHERE = new THREE.SphereGeometry(1, 24, 16);

interface VenomPool {
  x: number; z: number; r: number;
  time: number; total: number; tickLeft: number;
  /** dano por tique */
  amount: number;
  source: string;
  mesh: THREE.Mesh;
}

/** Bolha do Arcane Shield: esfera translúcida que some quando o escudo quebra e volta quando ele enche. */
export interface ShieldBubble {
  update(x: number, z: number, radius: number, height: number, frac: number, t: number): void;
  dispose(): void;
}

export function makeShieldBubble(scene: THREE.Scene, color: AffixDef["color"]): ShieldBubble {
  const mat = new THREE.MeshBasicMaterial({ color: hex(color), transparent: true, opacity: 0, depthWrite: false,
    toneMapped: false, blending: THREE.AdditiveBlending });
  const mesh = new THREE.Mesh(SPHERE, mat);
  mesh.renderOrder = 12;
  scene.add(mesh);
  let shown = 0;
  return {
    update(x, z, radius, height, frac, t) {
      shown += ((frac > 0 ? 1 : 0) - shown) * 0.2;
      mesh.visible = shown > 0.02;
      if (!mesh.visible) return;
      const r = Math.max(radius * 1.25, height * 0.45);
      mesh.position.set(x, height * 0.5, z);
      mesh.scale.set(r, height * 0.58, r);
      mat.opacity = shown * (0.07 + 0.1 * frac + Math.sin(t * 5) * 0.02);
    },
    dispose() {
      mesh.removeFromParent();
      mat.dispose();
    },
  };
}

export class AffixField {
  private pools: VenomPool[] = [];

  constructor(private game: Game) {}

  /** affix_system.lua `update`: os afixos de cada quadro (`idle` = tempo desde o último dano). */
  update(e: Enemy, dt: number): void {
    const g = this.game;
    e.idle += dt;
    for (const id of e.affixes) {
      const a = AFFIXES[id];
      if (id === "regenerating") {
        if (e.idle >= a.regenDelay! && e.hp < e.maxHp) {
          if (!e.regenOn) {
            e.regenOn = true;
            g.fx.text(e.x, e.rig.height + 0.3, e.z, "Regenerating", "heal");
          }
          e.hp = Math.min(e.maxHp, e.hp + e.maxHp * a.regenPct! * dt);
          if (Math.random() < dt * 6) g.fx.spark(e.x + (Math.random() - 0.5) * e.radius * 2, 0.3, e.z + (Math.random() - 0.5) * e.radius * 2, hex(a.color), 0.12, 0.6, 1.6);
        } else e.regenOn = false;
      } else if (id === "shielded") {
        if (e.idle >= a.shieldDelay! && e.shield < e.shieldMax) {
          e.shield = e.shieldMax;
          g.fx.shockwave(e.x, e.z, e.radius * 2.2, hex(a.color), 0.3);
        }
      } else if (id === "summoner") {
        e.summonT -= dt;
        if (e.summonT <= 0) {
          e.summonT = a.interval!;
          const r = px(AFFIX_SUMMON_RING) + e.radius;
          for (let k = 1; k <= a.count!; k++) {
            const ang = (k / a.count!) * Math.PI * 2;
            const m = g.spawnEnemy(a.minion!, e.level, e.x + Math.cos(ang) * r, e.z + Math.sin(ang) * r, { summoned: true, aggro: true });
            g.keepInArena(m);
          }
          g.fx.shockwave(e.x, e.z, r + 0.6, hex(a.color), 0.35);
        }
      } else if (id === "shadow") {
        e.blinkT -= dt;
        if (e.blinkT <= 0) {
          e.blinkT = a.interval!;
          const p = g.player;
          const ang = Math.random() * Math.PI * 2;
          const c = hex(a.color);
          g.fx.burst(e.x, e.rig.height * 0.5, e.z, c, 12, 4, 0.16, 0.4);
          e.x = p.x + Math.cos(ang) * px(a.distance!);
          e.z = p.z + Math.sin(ang) * px(a.distance!);
          g.keepInArena(e);
          e.kx = e.kz = 0;
          e.facing = Math.atan2(p.x - e.x, p.z - e.z);
          e.rig.root.position.set(e.x, 0, e.z);
          g.fx.burst(e.x, e.rig.height * 0.5, e.z, c, 12, 4, 0.16, 0.4);
          g.fx.shockwave(e.x, e.z, e.radius * 2, c, 0.25);
        }
      } else if (id === "venomous") {
        e.trailT -= dt;
        const moving = Math.hypot(e.vx, e.vz) > 0.3;
        if (e.trailT <= 0 && moving) {
          e.trailT = a.interval!;
          this.addPool(e.x, e.z, px(a.radius!), a.time!, e.dmg * a.dpsMult! * AFFIX_VENOM_TICK, e.name, hex(a.color));
        }
      }
    }
  }

  /** damage.lua `toPlayer`: o golpe que acertou o herói (Frozen gela, Vampiric cura o campeão). */
  onHit(e: Enemy, chill: (mult: number, time: number) => void): void {
    if (e.dead) return;
    if (e.hasAffix("frozen")) {
      const a = AFFIXES.frozen;
      chill(a.chillMult!, a.chillTime!);
    }
    if (e.hasAffix("vampiric")) {
      const heal = Math.min(e.maxHp - e.hp, e.maxHp * AFFIXES.vampiric.healPct!);
      if (heal > 0) {
        e.hp += heal;
        this.game.fx.text(e.x, e.rig.height + 0.3, e.z, "+" + Math.round(heal), "heal");
        this.game.fx.burst(e.x, e.rig.height * 0.6, e.z, hex(AFFIXES.vampiric.color), 6, 3, 0.14, 0.4);
      }
    }
  }

  /** affix_system.lua `explode`: aviso no chão onde o Explosive morreu, depois a explosão (160% do dano dele). */
  explode(e: Enemy): void {
    const a = AFFIXES.explosive;
    const g = this.game;
    const x = e.x, z = e.z, r = px(a.radius!), dmg = e.dmg * a.damageMult!, name = e.name;
    g.fx.telegraphCircle(x, z, r, a.warning!, () => {
      g.explode(x, z, r, dmg, hex(a.color), `${name} (explosion)`);
      g.audio.play("boom");
    });
  }

  /** enemy_attacks.lua `updateHazards`: as poças do rastro ferem o herói a cada tique. */
  updateWorld(dt: number): void {
    const g = this.game;
    const p = g.player;
    for (let i = this.pools.length - 1; i >= 0; i--) {
      const v = this.pools[i];
      v.time -= dt;
      v.tickLeft -= dt;
      while (v.tickLeft <= 0 && v.time > -1e-9) {
        v.tickLeft += AFFIX_VENOM_TICK;
        if (g.playerAlive && (p.x - v.x) ** 2 + (p.z - v.z) ** 2 <= (v.r + HERO_R) ** 2) g.hurtPlayer(v.amount, v.source);
      }
      const k = v.time / v.total;
      (v.mesh.material as THREE.MeshBasicMaterial).opacity = 0.42 * Math.min(1, k * 3) * Math.min(1, (1 - k) * 8);
      if (v.time <= 0) {
        this.disposePool(v);
        this.pools.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const v of this.pools) this.disposePool(v);
    this.pools.length = 0;
  }

  /** O que está no chão (checagem pelo console). */
  snapshot(): { pools: object[] } {
    return { pools: this.pools.map((v) => ({ x: +v.x.toFixed(2), z: +v.z.toFixed(2), r: +v.r.toFixed(2), time: +v.time.toFixed(2), amount: +v.amount.toFixed(2) })) };
  }

  /** Poça no chão que fere o herói em `amount` a cada tique de 0,5 s (enemy_attacks.lua `EA.hazard`); também a peste do Plaguebearer. */
  addPool(x: number, z: number, r: number, time: number, amount: number, source: string, color: number): void {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(DISC, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.04 + Math.random() * 0.01, z);
    mesh.scale.setScalar(r);
    this.game.scene.add(mesh);
    this.pools.push({ x, z, r, time, total: time, tickLeft: AFFIX_VENOM_TICK, amount, source, mesh });
  }

  private disposePool(v: VenomPool): void {
    v.mesh.removeFromParent();
    (v.mesh.material as THREE.Material).dispose();
  }
}
