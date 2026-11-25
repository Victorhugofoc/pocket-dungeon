// Épicas de comportamento no jogo (M21-07). As regras e os números estão em data/epics.ts; aqui ficam os relógios
// e contadores de cada uma e os ganchos que o Game chama (esquiva, ataque básico, golpe recebido, abate, orbe,
// técnica, spell). Uma épica só age se estiver em `run.upgradesTaken`.
import type { Game } from "./game";
import type { Enemy } from "./enemy";
import { EPIC, type EpicId } from "../data/epics";
import { TUNING } from "../data/tuning";

const RUNE = 0xb98cff;
const ICE = 0x9fdcff;
const BOLT = 0xbfe6ff;
const GOLD = 0xffd36a;

/** O que muda no próximo ataque básico. */
export interface AutoMod {
  mult: number;
  crit: boolean;
  /** força do empurrão extra (Charged Step) */
  knock: number;
}

interface Rune { x: number; z: number; t: number }

export class EpicRuntime {
  private has = new Set<EpicId>();
  private runes: Rune[] = [];
  private dashAt = -1e9;
  private closeCallUsed = true;
  private damageUntil = 0;
  private chargedUntil = 0;
  private streak = 0;
  private lastAttack = -1e9;
  private moved = 0;
  private spark = false;
  private stillT = 0;
  private lastX = 0;
  private lastZ = 0;
  private freeSpellUntil = 0;
  private kills: number[] = [];
  private frenzyUntil = 0;

  constructor(private g: Game) {}

  /** Relê as épicas pegas (a cada `recompute`). */
  refresh(taken: readonly string[]): void {
    this.has = new Set(taken.filter((id): id is EpicId => id in EPIC));
  }

  on(id: EpicId): boolean {
    return this.has.has(id);
  }

  /** Partida ou onda nova: zera os relógios. */
  reset(): void {
    this.runes = [];
    this.damageUntil = this.chargedUntil = this.frenzyUntil = this.freeSpellUntil = 0;
    this.streak = 0;
    this.moved = 0;
    this.spark = false;
    this.stillT = 0;
    this.kills = [];
    this.lastX = this.g.player.x;
    this.lastZ = this.g.player.z;
  }

  /** Elementos que as épicas trazem para a build (o ícone de reação pronta olha isto). */
  elements(): string[] {
    const out: string[] = [];
    if (this.on("rune_step")) out.push("arcane");
    if (this.on("cold_snap")) out.push("ice");
    if (this.on("kinetic")) out.push("lightning");
    return out;
  }

  // ------------------------------------------------------------ relógios
  update(dt: number): void {
    const g = this.g;
    const p = g.player;
    const now = g.time;
    const step = Math.hypot(p.x - this.lastX, p.z - this.lastZ);
    this.lastX = p.x;
    this.lastZ = p.z;
    // Kinetic: anda e carrega a faísca
    if (this.on("kinetic") && !this.spark && step < 3) {
      this.moved += step;
      if (this.moved >= EPIC.kinetic.distance) {
        this.spark = true;
        this.moved = 0;
        g.fx.text(p.x, 2.8, p.z, "Spark", "react");
        g.fx.burst(p.x, 1.2, p.z, BOLT, 14, 5, 0.12, 0.4, 2);
      }
    }
    if (this.spark && Math.random() < dt * 10) g.fx.spark(p.x + (Math.random() - 0.5) * 0.8, 1 + Math.random() * 0.8, p.z + (Math.random() - 0.5) * 0.8, BOLT, 0.12, 0.25, 1);
    // Anchor: parado (sem andar nem esquivar) arma a guarda
    if (this.on("anchor")) {
      const was = this.stillT >= EPIC.anchor.still;
      this.stillT = step < 0.002 && p.dashT <= 0 ? this.stillT + dt : 0;
      if (!was && this.stillT >= EPIC.anchor.still) g.fx.lib.ring(p.x, p.z, { radius: 1.3, color: GOLD, core: 0xffffff, width: 0.16, from: 0.6, dust: 6, dur: 0.35 });
      if (this.stillT >= EPIC.anchor.still && Math.random() < dt * 4) g.fx.spark(p.x + (Math.random() - 0.5) * 1.4, 0.2, p.z + (Math.random() - 0.5) * 1.4, GOLD, 0.1, 0.4, 1.2);
    }
    // Rune Step: as runas explodem no tempo
    for (let i = this.runes.length - 1; i >= 0; i--) {
      const r = this.runes[i];
      r.t += dt;
      if (Math.random() < dt * 12) g.fx.spark(r.x + (Math.random() - 0.5), 0.15, r.z + (Math.random() - 0.5), RUNE, 0.12, 0.3, 0.6);
      if (r.t < EPIC.rune_step.delay) continue;
      this.runes.splice(i, 1);
      const R = EPIC.rune_step;
      g.withElement("arcane", () => {
        for (const e of g.enemies) {
          if (e.dead || Math.hypot(e.x - r.x, e.z - r.z) > R.radius + e.radius) continue;
          g.hitEnemy(e, g.hero.auto.damage * R.atk, undefined, { source: "rune_step" });
        }
      });
      g.fx.lib.burst(r.x, 0.6, r.z, { radius: R.radius * 0.7, color: RUNE, core: 0xffffff, rays: 6, sparks: 14, light: 1.6, dur: 0.3 });
      g.fx.lib.ring(r.x, r.z, { radius: R.radius, color: RUNE, core: 0xffffff, width: 0.3, from: 0.2, dust: 8, dur: 0.3 });
      g.fx.addShake(0.08);
    }
    // Frenzy: abates velhos saem da janela
    if (this.kills.length) this.kills = this.kills.filter((t) => now - t <= EPIC.frenzy.window);
  }

  // ------------------------------------------------------------ ganchos
  /** Começou uma esquiva em (x, z). */
  onDash(x: number, z: number): void {
    const g = this.g;
    const now = g.time;
    this.dashAt = now;
    this.closeCallUsed = false;
    if (this.on("rune_step")) {
      this.runes.push({ x, z, t: 0 });
      g.fx.lib.ring(x, z, { radius: 0.9, color: RUNE, core: 0xffffff, width: 0.14, from: 0.9, dust: 4, dur: EPIC.rune_step.delay });
    }
    if (this.on("cold_snap")) {
      const C = EPIC.cold_snap;
      for (const e of g.enemies) {
        if (e.dead || Math.hypot(e.x - x, e.z - z) > C.radius + e.radius) continue;
        g.applyStatus(e, { kind: "slow", power: C.slow, duration: C.duration }, 0);
        e.chillUntil = Math.max(e.chillUntil, now + C.duration);
        g.fx.burst(e.x, 1, e.z, ICE, 8, 4, 0.12, 0.4, 2);
      }
      g.fx.lib.ring(x, z, { radius: C.radius, color: ICE, core: 0xffffff, width: 0.35, from: 0.2, dust: 10, dur: 0.35 });
    }
    if (this.on("charged_step")) this.chargedUntil = now + EPIC.charged_step.window;
    // Close Call: esquiva dentro de um golpe que fecha em menos de `window` s
    if (this.on("close_call")) {
      for (const e of g.enemies) {
        if (!e.dead && e.swingThreat(g.player.x, g.player.z) <= EPIC.close_call.window) {
          this.closeCall();
          break;
        }
      }
    }
  }

  /** Um golpe pegou o herói durante a invulnerabilidade da esquiva. */
  onAvoided(): void {
    if (this.on("close_call") && this.g.time - this.dashAt <= EPIC.close_call.window) this.closeCall();
  }

  private closeCall(): void {
    if (this.closeCallUsed) return;
    this.closeCallUsed = true;
    const g = this.g;
    const p = g.player;
    p.dashCd = 0;
    this.damageUntil = g.time + EPIC.close_call.duration;
    g.fx.text(p.x, 2.8, p.z, "Close Call", "crit react");
    g.fx.lib.ring(p.x, p.z, { radius: 1.8, color: GOLD, core: 0xffffff, width: 0.3, from: 0.3, dust: 10, dur: 0.3 });
    g.hitstopFor(0.05);
  }

  /** Multiplicador de todo o dano do herói agora (Close Call). */
  damageMult(): number {
    return this.g.time < this.damageUntil ? 1 + EPIC.close_call.damagePct : 1;
  }

  /** Multiplicador da velocidade de ataque agora (Frenzy). */
  attackSpeedMult(): number {
    return this.g.time < this.frenzyUntil ? 1 + EPIC.frenzy.attackSpeedPct : 1;
  }

  /** Um ataque básico vai sair: Third Strike e Charged Step mexem nele. */
  onAutoAttack(): AutoMod {
    const now = this.g.time;
    const mod: AutoMod = { mult: 1, crit: false, knock: 0 };
    if (this.on("third_strike")) {
      const T = EPIC.third_strike;
      this.streak = now - this.lastAttack <= T.gap ? this.streak + 1 : 1;
      if (this.streak >= T.every) {
        this.streak = 0;
        mod.mult *= T.mult;
        mod.crit = true;
      }
    }
    this.lastAttack = now;
    if (this.on("charged_step") && now < this.chargedUntil) {
      this.chargedUntil = 0;
      mod.mult *= 1 + EPIC.charged_step.bonus;
      mod.knock = EPIC.charged_step.knock;
      const p = this.g.player;
      this.g.fx.burst(p.x, 1.2, p.z, this.g.hero.color, 12, 6, 0.14, 0.35, 2);
    }
    return mod;
  }

  /** Depois do ataque básico: Kinetic solta o raio em cadeia. */
  afterAutoAttack(): void {
    if (!this.spark) return;
    const g = this.g;
    const K = EPIC.kinetic;
    const p = g.player;
    const hit = new Set<Enemy>();
    let x = p.x, z = p.z;
    for (let i = 0; i < K.targets; i++) {
      let best: Enemy | null = null;
      let bd = K.range * K.range;
      for (const e of g.enemies) {
        if (e.dead || hit.has(e)) continue;
        const d = (e.x - x) ** 2 + (e.z - z) ** 2;
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) break;
      hit.add(best);
      g.fx.lib.lightning(x, 1.2, z, best.x, 1.1, best.z, { color: BOLT, core: 0xffffff, width: 0.18, branches: 2, rate: 0.05, dur: 0.22 });
      const t = best;
      g.withElement("lightning", () => g.hitEnemy(t, g.hero.auto.damage * K.atk, undefined, { source: "kinetic" }));
      x = best.x;
      z = best.z;
    }
    if (hit.size === 0) return; // ninguém no alcance: a faísca fica
    this.spark = false;
  }

  /** Empurrão extra do Charged Step. */
  knock(e: Enemy, power: number): void {
    if (power <= 0 || e.isBoss || e.champion || e.dead) return;
    const p = this.g.player;
    const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) || 1;
    e.kx += (dx / d) * power * TUNING.enemy.knockback;
    e.kz += (dz / d) * power * TUNING.enemy.knockback;
  }

  /** O herói vai levar `amount`: Anchor corta pela metade e gasta a guarda. */
  incoming(amount: number): number {
    if (!this.on("anchor") || this.stillT < EPIC.anchor.still) return amount;
    this.stillT = 0;
    const p = this.g.player;
    this.g.fx.text(p.x, 2.8, p.z, "Anchor", "frost");
    this.g.fx.lib.ring(p.x, p.z, { radius: 1.5, color: GOLD, core: 0xffffff, width: 0.3, from: 0.4, dust: 8, dur: 0.3 });
    return amount * (1 - EPIC.anchor.reduce);
  }

  /** Recolheu `n` orbes (ouro, XP ou cura). */
  onOrbs(n: number): void {
    if (!this.on("orb_rush") || n <= 0) return;
    const p = this.g.player;
    p.techCd = Math.max(0, p.techCd - EPIC.orb_rush.techRefund * n);
  }

  /** Abate de qualquer fonte. */
  onKill(): void {
    if (!this.on("frenzy")) return;
    const g = this.g;
    this.kills.push(g.time);
    if (this.kills.length >= EPIC.frenzy.kills) {
      this.kills = [];
      const fresh = g.time >= this.frenzyUntil;
      this.frenzyUntil = g.time + EPIC.frenzy.duration;
      if (fresh) {
        g.fx.text(g.player.x, 2.8, g.player.z, "Frenzy", "crit react");
        g.fx.burst(g.player.x, 1.3, g.player.z, 0xff5a4a, 20, 6, 0.14, 0.5, 3);
      }
    }
  }

  /** Chain Reaction: o inimigo morto por reação passa queimadura, veneno e gelo aos vizinhos. */
  onReactionKill(e: Enemy, reaction: string): void {
    if (!this.on("chain_reaction")) return;
    const g = this.g;
    const now = g.time;
    const C = EPIC.chain_reaction;
    const burn = e.dots.find((d) => d.kind === "burn" && d.until > now);
    const poison = e.dots.find((d) => d.kind === "poison" && d.until > now);
    const chill = reaction === "shatter" || now < e.chillUntil;
    if (!burn && !poison && !chill) return;
    let n = 0;
    for (const o of g.enemies) {
      if (o.dead || o === e || Math.hypot(o.x - e.x, o.z - e.z) > C.radius + o.radius) continue;
      if (burn) o.applyBurn(now, burn.dps, burn.until - now);
      if (poison) o.applyPoison(now, poison.dps, poison.until - now, 1, undefined, "plague");
      if (chill) {
        const dur = Math.max(EPIC.cold_snap.duration, e.chillUntil - now);
        g.applyStatus(o, { kind: "slow", power: EPIC.cold_snap.slow, duration: dur }, 0);
        o.chillUntil = Math.max(o.chillUntil, now + dur);
      }
      g.fx.lib.lightning(e.x, 0.8, e.z, o.x, 0.8, o.z, { color: burn ? 0xff8a3a : poison ? 0x8fe36a : ICE, core: 0xffffff, width: 0.1, branches: 0, rate: 0.06, dur: 0.2 });
      n++;
    }
    if (n) g.fx.text(e.x, e.rig.height + 1.3, e.z, "Chain", "react");
  }

  /** A Praga pode reagir em cadeia (os vizinhos não ficam em recarga). */
  plagueChains(): boolean {
    return this.on("chain_reaction");
  }

  /** Usou a técnica: Overcharge deixa a próxima spell de graça. */
  onTechnique(): void {
    if (!this.on("overcharge")) return;
    this.freeSpellUntil = this.g.time + EPIC.overcharge.window;
    const p = this.g.player;
    this.g.fx.text(p.x, 3, p.z, "Overcharge", "react");
  }

  /** Uma spell saiu: devolve true se ela não gasta a recarga (e gasta o Overcharge). */
  takeFreeSpell(): boolean {
    if (this.g.time >= this.freeSpellUntil) return false;
    this.freeSpellUntil = 0;
    return true;
  }

  /** Para o HUD e para testes. */
  snapshot(): Record<string, unknown> {
    const now = this.g.time;
    return {
      has: [...this.has], runes: this.runes.length, spark: this.spark, moved: +this.moved.toFixed(2), anchored: this.stillT >= EPIC.anchor.still,
      closeCall: Math.max(0, this.damageUntil - now), charged: Math.max(0, this.chargedUntil - now), streak: this.streak,
      frenzy: Math.max(0, this.frenzyUntil - now), freeSpell: Math.max(0, this.freeSpellUntil - now),
    };
  }
}
