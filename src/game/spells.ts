// Conjuração das spells (M6-02): teclas 1 e 2 (D12), recarga, mira no cursor. Porta de dungeon-idle
// src/spells/spell_system.lua (`tryCast`, `onKill`) e src/spells/behaviors.lua (`Projectile`). Os números saem de
// core/spells.ts (`spellStats`); aqui só o tempo real: projéteis, impacto, queimadura, lentidão e o Volátil.
import * as THREE from "three";
import { isSpellId, spellStats, type SpellStats } from "../core/spells";
import { MAX_SPELLS, SPELL_CAST } from "../data/spells";
import { FROST } from "../data/techniques";
import type { Enemy } from "./enemy";
import type { Game } from "./game";

/** Cor de cada spell no jogo (projétil, impacto e ícone do HUD). */
export const SPELL_COLOR: Record<string, number> = { fireball: 0xff7a1a, iceball: 0x9fdcff };

interface SpellProjectile {
  slot: number;
  id: string;
  st: SpellStats;
  x: number; z: number; dx: number; dz: number;
  remaining: number;
  mesh: THREE.Mesh;
  color: number;
}

const BALL_GEO = new THREE.IcosahedronGeometry(1, 1);

export class SpellCaster {
  /** recarga restante de cada espaço (spell_system.lua `cooldownLeft`); não vai para o save, como lá começa zerada */
  cooldown: number[] = [];
  /** números de cada espaço, refeitos a cada `refresh` */
  stats: (SpellStats | null)[] = [];
  /** o espaço piscou sem alvo (tecla apertada sem inimigo no alcance) */
  noTarget: number[] = [];
  private shots: SpellProjectile[] = [];
  private mats = new Map<number, THREE.MeshBasicMaterial>();

  constructor(private game: Game) {}

  /** Refaz os números das spells com os atributos atuais (chamado por `Game.recompute`). */
  refresh(): void {
    const g = this.game;
    const s = g.stats;
    this.stats = g.run.spells.slice(0, MAX_SPELLS).map((slot) =>
      isSpellId(slot.id)
        ? spellStats(slot, { cooldownMult: s.cooldownMult, area: s.area, range: s.range, status: s.status })
        : null);
    while (this.cooldown.length < this.stats.length) this.cooldown.push(0);
    this.cooldown.length = this.stats.length;
    this.noTarget.length = this.stats.length;
  }

  /** Brittle Chill (spell_stats.lua `brittle`): dano extra em inimigo com Slow, somado entre as Iceballs. */
  get brittle(): number {
    let b = 0;
    for (const st of this.stats) if (st?.brittle) b += st.brittle;
    return b;
  }

  update(dt: number, castKeys: boolean[]): void {
    for (let i = 0; i < this.cooldown.length; i++) {
      this.cooldown[i] = Math.max(0, this.cooldown[i] - dt);
      this.noTarget[i] = Math.max(0, (this.noTarget[i] ?? 0) - dt);
      if (castKeys[i]) this.tryCast(i);
    }
    this.updateShots(dt);
  }

  /** spell_system.lua `tryCast`: a recarga só é gasta se o lançamento der certo (S13). */
  tryCast(i: number): boolean {
    const st = this.stats[i];
    if (!st || this.cooldown[i] > 0 || !this.game.playerAlive) return false;
    if (!this.cast(i, st)) {
      this.noTarget[i] = 0.35;
      return false;
    }
    this.cooldown[i] = st.cooldown;
    return true;
  }

  private cast(i: number, st: SpellStats): boolean {
    switch (st.kind) {
      case "projectile":
        return this.castProjectile(i, st);
      default:
        return false; // as outras spells entram no M6-03 a M6-05
    }
  }

  /** behaviors.lua `Projectile.cast`: sem inimigo no alcance não sai; vai na direção do mouse até o fim do alcance. */
  private castProjectile(i: number, st: SpellStats): boolean {
    const g = this.game;
    const p = g.player;
    if (!g.enemyWithin(p.x, p.z, st.range)) return false;
    const aim = g.aimPoint(st.range);
    let dx = aim.x - p.x;
    let dz = aim.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.001) { dx = Math.sin(p.facing); dz = Math.cos(p.facing); } else { dx /= d; dz /= d; }
    const base = Math.atan2(dx, dz);
    const n = st.projectiles ?? 1;
    const color = SPELL_COLOR[st.id] ?? 0xffffff;
    for (let k = 1; k <= n; k++) {
      const a = base + (k - (n + 1) / 2) * SPELL_CAST.projectileSpread;
      const mesh = new THREE.Mesh(BALL_GEO, this.mat(color));
      mesh.scale.setScalar(SPELL_CAST.ballSize);
      mesh.position.set(p.x, SPELL_CAST.height, p.z);
      g.scene.add(mesh);
      this.shots.push({ slot: i, id: st.id, st, x: p.x, z: p.z, dx: Math.sin(a), dz: Math.cos(a), remaining: st.range, mesh, color });
    }
    p.facing = base;
    g.audio.play("tech");
    g.fx.burst(p.x + dx * 0.8, SPELL_CAST.height, p.z + dz * 0.8, color, 12, 4, 0.12, 0.3, 2);
    return true;
  }

  private mat(color: number): THREE.MeshBasicMaterial {
    let m = this.mats.get(color);
    if (!m) this.mats.set(color, (m = new THREE.MeshBasicMaterial({ color, toneMapped: false })));
    return m;
  }

  /** behaviors.lua `Projectile.update`: explode no primeiro inimigo, no fim do alcance ou numa parede. */
  private updateShots(dt: number): void {
    const g = this.game;
    for (let k = this.shots.length - 1; k >= 0; k--) {
      const pr = this.shots[k];
      const step = (pr.st.speed ?? 20) * dt;
      let done = false;
      if (step >= pr.remaining) {
        pr.x += pr.dx * pr.remaining;
        pr.z += pr.dz * pr.remaining;
        done = true;
      } else {
        pr.x += pr.dx * step;
        pr.z += pr.dz * step;
        pr.remaining -= step;
        if (g.grid.hits(pr.x, pr.z, SPELL_CAST.hitRadius * 0.5)) done = true;
        else for (const e of g.enemies) {
          if (e.dead) continue;
          const rr = SPELL_CAST.hitRadius + e.radius;
          if ((e.x - pr.x) ** 2 + (e.z - pr.z) ** 2 <= rr * rr) { done = true; break; }
        }
      }
      if (done) {
        this.impact(pr);
        this.free(pr);
        this.shots.splice(k, 1);
      } else {
        pr.mesh.position.set(pr.x, SPELL_CAST.height, pr.z);
        g.fx.glow(pr.x, SPELL_CAST.height, pr.z, pr.color, SPELL_CAST.ballSize * 5, 0.25, -pr.dx * 1.5, 0.3, -pr.dz * 1.5);
        if (Math.random() < 0.5) g.fx.spark(pr.x, SPELL_CAST.height, pr.z, pr.color, 0.1, 0.3, 0.8);
      }
    }
  }

  /** behaviors.lua `Projectile.impact`: área com dano; Fireball queima (antes do dano), Iceball deixa lento (depois). */
  private impact(pr: SpellProjectile): void {
    const g = this.game;
    const st = pr.st;
    const r = st.radius;
    for (const e of g.enemies) {
      if (e.dead) continue;
      if ((e.x - pr.x) ** 2 + (e.z - pr.z) ** 2 > (r + e.radius) ** 2) continue;
      if (st.id === "fireball") this.applyBurn(e, st, pr.slot);
      g.spellHit(e, st.damage);
      if (st.id === "iceball" && !e.dead) this.applySlow(e, st.slow ?? 0, st.slowDuration ?? 0);
    }
    const fire = st.id === "fireball";
    g.fx.shockwave(pr.x, pr.z, r, pr.color, 0.4);
    g.fx.burst(pr.x, 0.8, pr.z, pr.color, fire ? 36 : 28, fire ? 8 : 6, 0.16, 0.55, fire ? -2 : 8);
    g.fx.burst(pr.x, 0.6, pr.z, fire ? 0xffe08a : 0xf2fbff, 14, 4, 0.12, 0.4, 4);
    g.fx.flashLight(pr.x, 1.2, pr.z, pr.color, fire ? 3 : 2.2, 0.3);
    g.fx.addShake(fire ? 0.14 : 0.1);
  }

  /** status.lua `applyBurn`: não acumula; fica o maior dano por segundo e a maior duração; lembra o espaço (Volátil). */
  private applyBurn(e: Enemy, st: SpellStats, slot: number): void {
    const g = this.game;
    const dps = g.stats.damage * (st.burnDps ?? 0);
    const until = g.time + (st.burnDuration ?? 0);
    const cur = e.dots.find((d) => d.kind === "burn" && d.spell === "fireball");
    if (cur) {
      cur.dps = Math.max(cur.dps, dps);
      cur.until = Math.max(cur.until, until);
      cur.slot = slot;
    } else e.dots.push({ kind: "burn", dps, until, spell: "fireball", slot });
  }

  /** status.lua `applySlow`: não acumula; chefes levam 20% (ou até o teto da Frostine). */
  private applySlow(e: Enemy, amount: number, duration: number): void {
    const g = this.game;
    if (e.isBoss) {
      const weak = amount * SPELL_CAST.bossSlowEffect;
      amount = g.hero.frost ? Math.max(weak, Math.min(amount, FROST.bossSlowCap)) : weak;
    }
    if (amount <= 0 || duration <= 0) return;
    const now = g.time;
    const active = now < e.slowUntil;
    e.slowPower = active ? Math.max(e.slowPower, amount) : amount;
    e.slowUntil = Math.max(e.slowUntil, now + duration);
  }

  /** spell_system.lua `onKill` (S17, Volátil): inimigo queimando pelo Fireball pode explodir ao morrer. */
  onKill(e: Enemy): void {
    const g = this.game;
    const burn = e.dots.find((d) => d.spell === "fireball" && d.until > g.time);
    if (!burn || burn.slot === undefined) return;
    const st = this.stats[burn.slot];
    if (!st || st.id !== "fireball" || !st.volatile || Math.random() >= st.volatile) return;
    const r = SPELL_CAST.volatileRadius;
    const x = e.x;
    const z = e.z;
    for (const o of g.enemies) {
      if (o.dead || o === e) continue;
      if ((o.x - x) ** 2 + (o.z - z) ** 2 <= (r + o.radius) ** 2) g.spellHit(o, st.damage * SPELL_CAST.volatileFraction);
    }
    g.fx.shockwave(x, z, r, 0xff5a1a, 0.35);
    g.fx.burst(x, 0.8, z, 0xff8a2a, 26, 7, 0.15, 0.5, -2);
    g.fx.text(x, 2.4, z, "Volátil", "burn");
  }

  private free(pr: SpellProjectile): void {
    pr.mesh.removeFromParent();
  }

  /** Limpa os projéteis (troca de zona, fim de partida). A recarga continua, como lá. */
  clear(): void {
    for (const pr of this.shots) this.free(pr);
    this.shots.length = 0;
  }

  /** Partida nova: sem projéteis e recargas zeradas (game_state.lua `newSpellSlot`). */
  reset(): void {
    this.clear();
    this.cooldown.fill(0);
  }

  /** Para os testes de console: projéteis em voo. */
  snapshot(): { id: string; x: number; z: number; remaining: number }[] {
    return this.shots.map((s) => ({ id: s.id, x: +s.x.toFixed(2), z: +s.z.toFixed(2), remaining: +s.remaining.toFixed(2) }));
  }
}
