// Conjuração das spells (M6-02, M6-03): teclas 1 e 2 (D12), recarga, mira no cursor. Porta de dungeon-idle
// src/spells/spell_system.lua (`tryCast`, `doCast`, `onKill`), src/spells/behaviors.lua (`Projectile`, `Chain`) e
// src/spells/techniques.lua (`Tech.beam`). Os números saem de core/spells.ts (`spellStats`); aqui só o tempo real:
// projéteis, raio em cadeia, raio contínuo, impacto, queimadura, lentidão, Eco e Volátil.
import * as THREE from "three";
import { isSpellId, spellStats, type SpellStats } from "../core/spells";
import { MAX_SPELLS, SPELL_CAST } from "../data/spells";
import { FROST } from "../data/techniques";
import type { Enemy } from "./enemy";
import type { Game } from "./game";

/** Cor de cada spell no jogo (projétil, impacto e raio). */
export const SPELL_COLOR: Record<string, number> = {
  fireball: 0xff7a1a, iceball: 0x9fdcff, chain_lightning: 0xfff29a, arcane_bolt: 0xc28cff, prism_beam: 0xfff6d8,
};

interface SpellProjectile {
  slot: number;
  id: string;
  st: SpellStats;
  x: number; z: number; dx: number; dz: number;
  remaining: number;
  speed: number;
  mesh: THREE.Mesh;
  color: number;
  /** Chain Lightning: o dardo rápido que começa a cadeia no primeiro inimigo que toca */
  chain?: boolean;
}

/** Prism Beam aceso: sai do herói e gira com a mira (techniques.lua `Tech.beam`). */
interface Beam {
  slot: number;
  st: SpellStats;
  time: number;
  tickLeft: number;
  dx: number; dz: number;
  glow: THREE.Mesh;
  core: THREE.Mesh;
}

/** Eco à espera (spell_system.lua `pendingCasts`). */
interface PendingCast { slot: number; t: number }

const BALL_GEO = new THREE.IcosahedronGeometry(1, 1);
/** faixa deitada no chão, de 0 a 1 no eixo z local */
const BEAM_GEO = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0).rotateX(Math.PI / 2);

export class SpellCaster {
  /** recarga restante de cada espaço (spell_system.lua `cooldownLeft`); não vai para o save, como lá começa zerada */
  cooldown: number[] = [];
  /** números de cada espaço, refeitos a cada `refresh` */
  stats: (SpellStats | null)[] = [];
  /** o espaço pisca quando a tecla foi apertada e a spell não saiu (spell ainda sem efeito no jogo) */
  noTarget: number[] = [];
  private shots: SpellProjectile[] = [];
  private beams: Beam[] = [];
  private pending: PendingCast[] = [];
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

  /** maior chance de Volátil entre os Fireballs equipados (o ícone de queimadura muda quando há) */
  get volatile(): number {
    let v = 0;
    for (const st of this.stats) if (st?.volatile) v = Math.max(v, st.volatile);
    return v;
  }

  update(dt: number, castKeys: boolean[]): void {
    for (let i = 0; i < this.cooldown.length; i++) {
      this.cooldown[i] = Math.max(0, this.cooldown[i] - dt);
      this.noTarget[i] = Math.max(0, (this.noTarget[i] ?? 0) - dt);
      if (castKeys[i]) this.tryCast(i);
    }
    // Eco: relança igual, de graça e sem novo Eco (spell_system.lua `update`)
    for (let k = this.pending.length - 1; k >= 0; k--) {
      const pc = this.pending[k];
      pc.t -= dt;
      if (pc.t > 0) continue;
      this.pending.splice(k, 1);
      const st = this.stats[pc.slot];
      const g = this.game;
      if (st && g.playerAlive && this.cast(pc.slot, st)) g.fx.text(g.player.x, 2.8, g.player.z, "Eco", "frost");
    }
    this.updateShots(dt);
    this.updateBeams(dt);
  }

  /** spell_system.lua `tryCast`: a recarga é gasta quando a spell sai; spell sem efeito ainda (M6-04, M6-05) não gasta. */
  tryCast(i: number): boolean {
    const st = this.stats[i];
    if (!st || this.cooldown[i] > 0 || !this.game.playerAlive) return false;
    if (!this.cast(i, st)) {
      this.noTarget[i] = 0.35;
      return false;
    }
    this.cooldown[i] = st.cooldown;
    // Eco (S16): chance de relançar igual e de graça 0,2 s depois
    if (st.echo && Math.random() < st.echo) this.pending.push({ slot: i, t: SPELL_CAST.echoDelay });
    return true;
  }

  private cast(i: number, st: SpellStats): boolean {
    switch (st.kind) {
      case "projectile":
        return this.castProjectile(i, st);
      case "chain":
        return this.castChain(i, st);
      case "beam":
        return this.castBeam(i, st);
      default:
        return false; // as outras spells entram no M6-04 e no M6-05
    }
  }

  /** Direção do herói para o mouse; com o mouse em cima do herói, para onde ele olha. */
  private aimDir(): { dx: number; dz: number } {
    const g = this.game;
    const p = g.player;
    const aim = g.aimPoint(1e6);
    const dx = aim.x - p.x;
    const dz = aim.z - p.z;
    const d = Math.hypot(dx, dz);
    return d < 0.08 ? { dx: Math.sin(p.facing), dz: Math.cos(p.facing) } : { dx: dx / d, dz: dz / d };
  }

  /**
   * behaviors.lua `Projectile.cast`: vai na direção do mouse até o fim do alcance. Lá só saía com inimigo no alcance;
   * aqui sai sempre e gasta a recarga, porque o jogador é quem aperta (S13, D15).
   */
  private castProjectile(i: number, st: SpellStats): boolean {
    const g = this.game;
    const p = g.player;
    const { dx, dz } = this.aimDir();
    const base = Math.atan2(dx, dz);
    const n = st.projectiles ?? 1;
    const color = SPELL_COLOR[st.id] ?? 0xffffff;
    for (let k = 1; k <= n; k++) {
      const a = base + (k - (n + 1) / 2) * SPELL_CAST.projectileSpread;
      const mesh = new THREE.Mesh(BALL_GEO, this.mat(color));
      mesh.scale.setScalar(SPELL_CAST.ballSize);
      mesh.position.set(p.x, SPELL_CAST.height, p.z);
      g.scene.add(mesh);
      this.shots.push({ slot: i, id: st.id, st, x: p.x, z: p.z, dx: Math.sin(a), dz: Math.cos(a), remaining: st.range,
        speed: st.speed ?? 20, mesh, color });
    }
    p.facing = base;
    g.audio.play("tech");
    g.fx.burst(p.x + dx * 0.8, SPELL_CAST.height, p.z + dz * 0.8, color, 12, 4, 0.12, 0.3, 2);
    return true;
  }

  /**
   * behaviors.lua `Chain.cast` (D-213): um dardo rápido vai na direção do mouse; o primeiro inimigo que ele toca começa a
   * cadeia; errando, apaga (e a recarga já foi gasta, como lá).
   */
  private castChain(i: number, st: SpellStats): boolean {
    const g = this.game;
    const p = g.player;
    const { dx, dz } = this.aimDir();
    const color = SPELL_COLOR.chain_lightning;
    const mesh = new THREE.Mesh(BALL_GEO, this.mat(color));
    mesh.scale.set(SPELL_CAST.ballSize * 0.45, SPELL_CAST.ballSize * 0.45, SPELL_CAST.ballSize * 2.2);
    mesh.rotation.y = Math.atan2(dx, dz);
    mesh.position.set(p.x, SPELL_CAST.height, p.z);
    g.scene.add(mesh);
    this.shots.push({ slot: i, id: st.id, st, x: p.x, z: p.z, dx, dz, remaining: st.range, speed: SPELL_CAST.chainBoltSpeed,
      mesh, color, chain: true });
    p.facing = Math.atan2(dx, dz);
    g.audio.play("tech");
    g.fx.burst(p.x + dx * 0.8, SPELL_CAST.height, p.z + dz * 0.8, color, 10, 5, 0.1, 0.25, 0);
    return true;
  }

  /** behaviors.lua `Chain.from`: salta para o inimigo vivo mais perto ainda não atingido, até `targets` alvos. */
  private chainFrom(st: SpellStats, first: Enemy, ox: number, oz: number): void {
    const g = this.game;
    const hit = new Set<Enemy>();
    const targets = st.targets ?? 1;
    const reach = st.chainRange ?? 0;
    let cur: Enemy | null = first;
    let px = ox;
    let pz = oz;
    let count = 0;
    while (cur && count < targets) {
      const e: Enemy = cur;
      count++;
      hit.add(e);
      const cx = e.x;
      const cz = e.z;
      this.arc(px, pz, cx, cz, count);
      g.spellHit(e, st.damage);
      // Static Field: chance de acertar o primeiro alvo duas vezes
      if (count === 1 && st.doubleHit && !e.dead && Math.random() < st.doubleHit) {
        g.spellHit(e, st.damage);
        g.fx.text(cx, 2.6, cz, "x2", "frost");
      }
      let next: Enemy | null = null;
      let nd = Infinity;
      for (const o of g.enemies) {
        if (o.dead || hit.has(o)) continue;
        const d2 = (o.x - cx) ** 2 + (o.z - cz) ** 2;
        const r = reach + o.radius;
        if (d2 <= r * r && d2 < nd) { next = o; nd = d2; }
      }
      px = cx;
      pz = cz;
      cur = next;
    }
    g.fx.addShake(0.1);
  }

  /** Um salto do raio: linha em zigue-zague e clarão no alvo. */
  private arc(x0: number, z0: number, x1: number, z1: number, n: number): void {
    const fx = this.game.fx;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const nx = -(z1 - z0) / (len || 1);
    const nz = (x1 - x0) / (len || 1);
    const parts = Math.max(3, Math.round(len / 1.2));
    let ax = x0;
    let az = z0;
    for (let k = 1; k <= parts; k++) {
      const t = k / parts;
      const j = k === parts ? 0 : (Math.random() - 0.5) * Math.min(1.4, len * 0.25);
      const bx = x0 + (x1 - x0) * t + nx * j;
      const bz = z0 + (z1 - z0) * t + nz * j;
      fx.streak(ax, az, bx, bz, 0.6, 0xffe14a, 0.14 + n * 0.03);
      fx.streak(ax, az, bx, bz, 0.2, 0xfffbe0, 0.22 + n * 0.03);
      ax = bx;
      az = bz;
    }
    fx.burst(x1, 1.1, z1, 0xfff29a, 10, 5, 0.1, 0.3, 0);
    fx.flashLight(x1, 1.4, z1, 0xfff0a0, 1.6, 0.18);
  }

  /** techniques.lua `Tech.beam.cast`: raio que sai do herói e gira com a mira; relançar troca o raio aceso. */
  private castBeam(i: number, st: SpellStats): boolean {
    const g = this.game;
    for (let k = this.beams.length - 1; k >= 0; k--) if (this.beams[k].slot === i) this.freeBeam(k);
    const mk = (color: number, opacity: number) => {
      const m = new THREE.Mesh(BEAM_GEO, new THREE.MeshBasicMaterial({
        color, transparent: true, opacity, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }));
      m.renderOrder = 3;
      g.scene.add(m);
      return m;
    };
    const { dx, dz } = this.aimDir();
    this.beams.push({ slot: i, st, time: st.duration ?? 1, tickLeft: 0, dx, dz,
      glow: mk(0xffc860, 0.4), core: mk(SPELL_COLOR.prism_beam, 0.95) });
    g.audio.play("tech");
    return true;
  }

  private updateBeams(dt: number): void {
    const g = this.game;
    const p = g.player;
    for (let k = this.beams.length - 1; k >= 0; k--) {
      const b = this.beams[k];
      b.time -= dt;
      const d = this.aimDir(); // a cada quadro, para o raio girar com a mira
      b.dx = d.dx;
      b.dz = d.dz;
      p.facing = Math.atan2(b.dx, b.dz);
      b.tickLeft -= dt;
      while (b.tickLeft <= 0 && b.time > -1e-6) {
        b.tickLeft += b.st.tick ?? 0.15;
        this.beamTick(b);
      }
      if (b.time <= 0 || !g.playerAlive) {
        this.freeBeam(k);
        continue;
      }
      const len = b.st.range;
      const w = b.st.width ?? 1;
      const ang = Math.atan2(b.dx, b.dz);
      const fade = Math.min(1, b.time / 0.25);
      const flick = 0.85 + Math.random() * 0.3;
      const parts: [THREE.Mesh, number, number][] = [[b.glow, w * 1.6 * flick, 0.4], [b.core, w * 0.45, 0.95]];
      for (const [m, width, op] of parts) {
        m.position.set(p.x + b.dx * 0.5, SPELL_CAST.height, p.z + b.dz * 0.5);
        m.rotation.set(0, ang, 0);
        m.scale.set(width, 1, len);
        (m.material as THREE.MeshBasicMaterial).opacity = op * fade;
      }
      if (Math.random() < 0.6) {
        const t = Math.random() * len;
        g.fx.glow(p.x + b.dx * t, SPELL_CAST.height, p.z + b.dz * t, 0xfff6d8, 0.5, 0.25, 0, 0.6, 0);
      }
    }
  }

  /** techniques.lua `beamTick`: cada tique fere todos os inimigos na linha (largura `width`). */
  private beamTick(b: Beam): void {
    const g = this.game;
    const p = g.player;
    const hw = (b.st.width ?? 1) / 2;
    const len = b.st.range;
    for (const e of g.enemies) {
      if (e.dead) continue;
      const ex = e.x - p.x;
      const ez = e.z - p.z;
      const t = ex * b.dx + ez * b.dz;
      if (t < -e.radius || t > len + e.radius) continue;
      if (Math.abs(ex * b.dz - ez * b.dx) > hw + e.radius) continue;
      g.spellHit(e, b.st.damage);
      if (!e.dead && Math.random() < 0.35) g.fx.spark(e.x, 1.2, e.z, 0xfff6d8, 0.12, 0.3, 1);
    }
  }

  private freeBeam(k: number): void {
    const b = this.beams[k];
    for (const m of [b.glow, b.core]) {
      m.removeFromParent();
      (m.material as THREE.Material).dispose();
    }
    this.beams.splice(k, 1);
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
      let move = Math.min(pr.speed * dt, pr.remaining);
      let done = false;
      let target: Enemy | null = null;
      // em passos curtos, para o dardo rápido do Chain Lightning não atravessar ninguém
      while (move > 1e-6 && !done) {
        const step = Math.min(move, SPELL_CAST.maxStep);
        move -= step;
        pr.x += pr.dx * step;
        pr.z += pr.dz * step;
        pr.remaining -= step;
        if (pr.remaining <= 1e-6) done = true;
        for (const e of g.enemies) {
          if (e.dead) continue;
          const rr = SPELL_CAST.hitRadius + e.radius;
          if ((e.x - pr.x) ** 2 + (e.z - pr.z) ** 2 <= rr * rr) { done = true; target = e; break; }
        }
        if (!done && g.grid.hits(pr.x, pr.z, SPELL_CAST.hitRadius * 0.5)) done = true;
      }
      if (done) {
        if (pr.chain) {
          if (target) this.chainFrom(pr.st, target, pr.x - pr.dx * 0.6, pr.z - pr.dz * 0.6);
          else g.fx.burst(pr.x, SPELL_CAST.height, pr.z, pr.color, 8, 3, 0.1, 0.25, 0); // errou: apaga
        } else this.impact(pr);
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

  /** Limpa projéteis, raios e Ecos (troca de zona, fim de partida). A recarga continua, como lá. */
  clear(): void {
    for (const pr of this.shots) this.free(pr);
    this.shots.length = 0;
    while (this.beams.length) this.freeBeam(this.beams.length - 1);
    this.pending.length = 0;
  }

  /** Partida nova: sem projéteis e recargas zeradas (game_state.lua `newSpellSlot`). */
  reset(): void {
    this.clear();
    this.cooldown.fill(0);
  }

  /** Para os testes de console: projéteis e raios em voo. */
  snapshot(): { id: string; x: number; z: number; remaining: number }[] {
    return [
      ...this.shots.map((s) => ({ id: s.id, x: +s.x.toFixed(2), z: +s.z.toFixed(2), remaining: +s.remaining.toFixed(2) })),
      ...this.beams.map((b) => ({ id: b.st.id, x: +b.dx.toFixed(2), z: +b.dz.toFixed(2), remaining: +b.time.toFixed(2) })),
    ];
  }
}
