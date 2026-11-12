// Inimigos e chefes: estado, IA por comportamento e padrões de ataque telegrafados.
import { TUNING } from "../data/tuning";
import { ENEMIES, type BossDef, type BossPattern, type EnemyDef } from "../data/enemies";
import type { StatusKind } from "../data/heroes";
import { animateRig, disposeRig, flashRig, tintRig, type Rig } from "./models";
import { characterRig } from "./rigs";
import type { Game } from "./game";

export interface Dot {
  kind: StatusKind;
  dps: number;
  until: number;
}

export class Enemy {
  x: number;
  z: number;
  homeX: number;
  homeZ: number;
  def: EnemyDef | null;
  boss: BossDef | null;
  name: string;
  level: number;
  champion: boolean;
  summoned: boolean;
  maxHp: number;
  hp: number;
  dmg: number;
  speed: number;
  radius: number;
  xp: number;
  rig: Rig;
  facing = 0;
  aggro = false;
  dead = false;
  deadT = 0;
  remove = false;
  cd = 0;
  windupT = -1;
  windupDur = 0.4;
  attackAnim = -1;
  moveAmt = 0;
  flash = 0;
  slowUntil = 0;
  slowPower = 0;
  stunUntil = 0;
  dots: Dot[] = [];
  dotTick = 0;
  strafe = Math.random() < 0.5 ? -1 : 1;
  summonCd = 3;
  chargeCd = 2.5;
  charging: { t: number; dur: number; dx: number; dz: number; speed: number; dmg: number; hit: boolean } | null = null;
  casting = 0;
  patternCd = 3;
  lastPattern = -1;
  enraged = false;
  spiral: { left: number; timer: number; angle: number; p: BossPattern } | null = null;

  constructor(game: Game, def: EnemyDef | BossDef, level: number, x: number, z: number, opts: { champion?: boolean; summoned?: boolean } = {}) {
    const T = TUNING.enemy;
    this.x = this.homeX = x;
    this.z = this.homeZ = z;
    this.level = level;
    this.champion = opts.champion === true;
    this.summoned = opts.summoned === true;
    const isBoss = "patterns" in def;
    this.boss = isBoss ? (def as BossDef) : null;
    this.def = isBoss ? null : (def as EnemyDef);
    this.name = def.name;
    const hpScale = Math.pow(T.hpPerLevel, level - 1);
    const dmgScale = Math.pow(T.damagePerLevel, level - 1);
    const champ = this.champion ? T.champion : null;
    this.maxHp = this.hp = Math.round(def.hp * hpScale * (champ ? champ.hp : 1) * (this.summoned ? 0.75 : 1) * (isBoss ? TUNING.boss.hpMult : 1));
    this.dmg = def.damage * dmgScale * (champ ? champ.damage : 1);
    this.speed = def.speed * (champ ? champ.speed : 1);
    this.radius = def.radius * (champ ? 1.2 : 1);
    const xpLevel = 1 + TUNING.xp.enemyPerLevel * (level - 1);
    this.xp = this.summoned ? 0 : Math.round(def.xp * xpLevel * (isBoss ? TUNING.boss.xpMult : champ ? champ.xp : 1));
    if (isBoss) this.windupDur = 0.55;

    this.rig = this.makeRig();
    this.rig.root.position.set(x, 0, z);
    game.scene.add(this.rig.root);
  }

  private makeRig(): Rig {
    return characterRig(this.boss ? this.boss.id : this.def!.id, this.boss ? "boss" : "enemy", this.champion);
  }

  /** troca o modelo quando o modo visual muda */
  rebuildRig(game: Game): void {
    const visible = this.rig.root.visible;
    disposeRig(this.rig);
    this.rig = this.makeRig();
    this.rig.root.position.set(this.x, 0, this.z);
    this.rig.root.rotation.y = this.facing;
    this.rig.root.visible = visible;
    game.scene.add(this.rig.root);
  }

  get isBoss(): boolean {
    return this.boss !== null;
  }

  private moveToward(game: Game, tx: number, tz: number, speed: number, dt: number): void {
    const dx = tx - this.x;
    const dz = tz - this.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.01) return;
    this.x += (dx / d) * speed * dt;
    this.z += (dz / d) * speed * dt;
    this.moveAmt = 1;
    void game;
  }

  private face(tx: number, tz: number): void {
    this.facing = Math.atan2(tx - this.x, tz - this.z);
  }

  update(game: Game, dt: number): void {
    const now = game.time;
    const p = game.player;
    const rig = this.rig;

    if (this.dead) {
      this.deadT += dt * 2.6;
      animateRig(rig, { t: now, move: 0, attack: -1, windup: 0, dead: this.deadT });
      if (this.deadT >= 1.25) this.remove = true;
      return;
    }

    // efeitos contínuos
    if (this.dots.length) {
      this.dotTick -= dt;
      if (this.dotTick <= 0) {
        this.dotTick = 0.5;
        let total = 0;
        let kind: StatusKind = "burn";
        this.dots = this.dots.filter((d) => d.until > now);
        for (const d of this.dots) {
          total += d.dps * 0.5;
          kind = d.kind;
        }
        if (total > 0) game.damageEnemy(this, total, { dot: kind });
        if (this.dead) return;
      }
    }

    this.moveAmt = 0;
    this.cd -= dt;
    const stunned = now < this.stunUntil;
    const slow = now < this.slowUntil ? 1 - this.slowPower : 1;
    const speed = this.speed * slow * (this.enraged ? 1.15 : 1);
    const dxp = p.x - this.x;
    const dzp = p.z - this.z;
    const dist = Math.hypot(dxp, dzp);
    const alive = game.playerAlive;

    if (!stunned) {
      if (!this.aggro) {
        const r = this.isBoss ? game.layout.bossRadius : TUNING.enemy.aggroRadius;
        const ref = this.isBoss ? Math.hypot(p.x - this.homeX, p.z - this.homeZ) : dist;
        if (alive && ref < r) this.setAggro(game);
        else if (Math.hypot(this.homeX - this.x, this.homeZ - this.z) > 1) {
          this.face(this.homeX, this.homeZ);
          this.moveToward(game, this.homeX, this.homeZ, speed * 1.5, dt);
        }
      } else {
        const fromHome = Math.hypot(this.x - this.homeX, this.z - this.homeZ);
        const leash = this.isBoss
          ? Math.hypot(p.x - this.homeX, p.z - this.homeZ) > game.layout.bossRadius + 16
          : fromHome > TUNING.enemy.leashRadius && dist > TUNING.enemy.aggroRadius;
        if (!alive || leash) this.reset(game);
        else if (this.boss) this.updateBoss(game, dt, dist, speed);
        else this.updateBehavior(game, dt, dist, speed);
      }
    }

    // investida em andamento
    if (this.charging && !stunned) {
      const c = this.charging;
      c.t += dt;
      this.x += c.dx * c.speed * dt;
      this.z += c.dz * c.speed * dt;
      this.moveAmt = 1;
      if (!c.hit && Math.hypot(p.x - this.x, p.z - this.z) < this.radius + 0.9) {
        c.hit = true;
        game.hurtPlayer(c.dmg, this.name);
      }
      if (c.t >= c.dur) this.charging = null;
    }

    game.grid.resolve(this, this.radius);
    const lim = game.layout.size / 2 - 6;
    this.x = Math.max(-lim, Math.min(lim, this.x));
    this.z = Math.max(-lim, Math.min(lim, this.z));

    // visual
    rig.root.position.set(this.x, 0, this.z);
    let da = this.facing - rig.root.rotation.y;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    rig.root.rotation.y += da * Math.min(1, dt * 12);
    if (this.attackAnim >= 0) {
      this.attackAnim += dt * 3.5;
      if (this.attackAnim >= 1) this.attackAnim = -1;
    }
    animateRig(rig, {
      t: now, move: stunned ? 0 : this.moveAmt, attack: this.attackAnim,
      windup: this.windupT >= 0 ? this.windupT / this.windupDur : this.casting > 0 ? 0.6 + Math.sin(now * 20) * 0.1 : 0, dead: 0,
    });
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 7);
      flashRig(rig, this.flash);
    } else if (stunned) tintRig(rig, 0x8fdcff, 0.55);
    else if (this.dots.length) tintRig(rig, this.dots[0].kind === "poison" ? 0x5fd35f : 0xff7a1a, 0.35);
    else if (now < this.slowUntil) tintRig(rig, 0x8fdcff, 0.25);
    else if (this.enraged) tintRig(rig, 0xff2a1a, 0.3 + Math.sin(now * 8) * 0.12);
    else flashRig(rig, 0);
  }

  setAggro(game: Game): void {
    if (this.aggro || this.dead) return;
    this.aggro = true;
    this.cd = Math.max(this.cd, 0.4 + Math.random() * 0.5);
    if (this.isBoss) game.onBossAggro(this);
    else {
      // alerta o grupo
      for (const e of game.enemies) {
        if (!e.aggro && !e.dead && !e.isBoss && Math.hypot(e.x - this.x, e.z - this.z) < 11) {
          e.aggro = true;
          e.cd = 0.3 + Math.random() * 0.8;
        }
      }
    }
  }

  private reset(game: Game): void {
    this.aggro = false;
    this.windupT = -1;
    this.casting = 0;
    this.charging = null;
    this.spiral = null;
    this.hp = this.maxHp;
    this.enraged = false;
    this.dots.length = 0;
    if (this.isBoss) game.onBossReset(this);
    if (this.summoned) {
      this.dead = true;
      this.deadT = 1;
    }
  }

  private meleeStep(game: Game, dt: number, dist: number, speed: number, range: number): void {
    const p = game.player;
    if (this.windupT >= 0) {
      this.windupT += dt;
      if (this.windupT >= this.windupDur) {
        this.windupT = -1;
        this.attackAnim = 0;
        const d = Math.hypot(p.x - this.x, p.z - this.z);
        if (d <= range + 1.1) game.hurtPlayer(this.dmg, this.name);
        this.cd = this.boss ? this.boss.attackCooldown : this.def!.cooldown;
      }
      return;
    }
    this.face(p.x, p.z);
    if (dist > range) this.moveToward(game, p.x, p.z, speed, dt);
    else if (this.cd <= 0) this.windupT = 0;
  }

  private shoot(game: Game, color: number, speedP: number, spreadErr = 0.06): void {
    const p = game.player;
    const a = Math.atan2(p.x - this.x, p.z - this.z) + (Math.random() - 0.5) * spreadErr;
    game.spawnEnemyProjectile(this.x + Math.sin(a) * this.radius, this.z + Math.cos(a) * this.radius, a, speedP, this.dmg, color, 0.26);
    this.attackAnim = 0;
  }

  private updateBehavior(game: Game, dt: number, dist: number, speed: number): void {
    const d = this.def!;
    const p = game.player;
    if (this.charging) return;
    switch (d.behavior) {
      case "melee":
        this.meleeStep(game, dt, dist, speed, (d.attackRange ?? 1.5) + 0.3);
        break;
      case "charger": {
        const c = d.charge!;
        this.chargeCd -= dt;
        if (this.casting > 0) {
          this.casting -= dt;
          return;
        }
        if (this.chargeCd <= 0 && dist > 5 && dist < c.range && this.windupT < 0) {
          this.chargeCd = c.cooldown;
          this.face(p.x, p.z);
          const a = this.facing;
          this.casting = c.windup;
          const len = Math.min(c.range, dist + 5);
          game.fx.telegraphRect(this.x, this.z, a, len, this.radius * 2 + 0.8, c.windup, () => {
            if (this.dead || game.time < this.stunUntil) return;
            this.charging = { t: 0, dur: len / c.speed, dx: Math.sin(a), dz: Math.cos(a), speed: c.speed, dmg: this.dmg * c.damage, hit: false };
          });
          return;
        }
        this.meleeStep(game, dt, dist, speed, (d.attackRange ?? 1.5) + 0.3);
        break;
      }
      case "ranged":
      case "summoner":
      case "bombardier": {
        const range = d.range ?? 12;
        this.face(p.x, p.z);
        if (dist > range * 0.9) this.moveToward(game, p.x, p.z, speed, dt);
        else if (dist < range * 0.4) this.moveToward(game, this.x - (p.x - this.x), this.z - (p.z - this.z), speed * 0.8, dt);
        else {
          // anda de lado para não ficar parado
          const nx = -(p.z - this.z) / dist;
          const nz = (p.x - this.x) / dist;
          this.moveToward(game, this.x + nx * this.strafe, this.z + nz * this.strafe, speed * 0.45, dt);
          if (Math.random() < dt * 0.3) this.strafe *= -1;
        }
        if (d.summon) {
          this.summonCd -= dt;
          if (this.summonCd <= 0) {
            this.summonCd = d.summon.cooldown;
            if (game.countSummons() < 10) {
              for (let i = 0; i < d.summon.count; i++) {
                const a = Math.random() * Math.PI * 2;
                game.spawnEnemy(d.summon.id, this.level, this.x + Math.cos(a) * 1.6, this.z + Math.sin(a) * 1.6, { summoned: true, aggro: true });
              }
              game.fx.shockwave(this.x, this.z, 2.5, d.accent);
            }
          }
        }
        if (this.cd <= 0 && dist <= range) {
          this.cd = d.cooldown * (0.9 + Math.random() * 0.2);
          if (d.mortar) {
            const tx = p.x + game.playerVelX * 0.5;
            const tz = p.z + game.playerVelZ * 0.5;
            const r = d.mortar.radius;
            const dmg = this.dmg;
            this.attackAnim = 0;
            game.fx.telegraphCircle(tx, tz, r, d.mortar.warning, () => game.explode(tx, tz, r, dmg, d.projectileColor ?? 0xff9a3c, this.name));
          } else this.shoot(game, d.projectileColor ?? 0xffffff, d.projectileSpeed ?? 12);
        }
        break;
      }
    }
  }

  // ---------------------------------------------------------------- chefe
  private updateBoss(game: Game, dt: number, dist: number, speed: number): void {
    const b = this.boss!;
    const p = game.player;
    if (!this.enraged && this.hp < this.maxHp * TUNING.boss.enrageAt) {
      this.enraged = true;
      game.fx.shockwave(this.x, this.z, 8, 0xff2a1a, 0.6);
      game.fx.text(this.x, this.rig.height + 1, this.z, "ENFURECIDO!", "crit");
      game.audio.play("boss");
    }
    if (this.spiral) {
      const s = this.spiral;
      s.timer -= dt;
      while (s.timer <= 0 && s.left > 0) {
        s.timer += 0.055;
        s.left--;
        s.angle += 0.52;
        for (let arm = 0; arm < 3; arm++) {
          game.spawnEnemyProjectile(this.x, this.z, s.angle + (arm * Math.PI * 2) / 3, s.p.speed ?? 10, this.dmg * s.p.damage, b.projectileColor, 0.3);
        }
      }
      if (s.left <= 0) this.spiral = null;
      return;
    }
    if (this.casting > 0) {
      this.casting -= dt;
      return;
    }
    if (this.charging) return;
    this.patternCd -= dt;
    if (this.patternCd <= 0 && this.windupT < 0) {
      this.patternCd = b.patternCooldown * (this.enraged ? TUNING.boss.enrageCooldownMult : 1);
      let idx = Math.floor(Math.random() * b.patterns.length);
      if (idx === this.lastPattern) idx = (idx + 1) % b.patterns.length;
      this.lastPattern = idx;
      this.startPattern(game, b.patterns[idx], dist);
      return;
    }
    this.meleeStep(game, dt, dist, speed, b.attackRange);
    void p;
  }

  private startPattern(game: Game, pt: BossPattern, dist: number): void {
    const b = this.boss!;
    const p = game.player;
    const fx = game.fx;
    this.face(p.x, p.z);
    this.casting = pt.warning + 0.15;
    game.audio.play("warn");
    const ok = () => !this.dead && this.aggro;
    switch (pt.kind) {
      case "slam": {
        const r = pt.radius ?? 6;
        const x = this.x;
        const z = this.z;
        fx.telegraphCircle(x, z, r, pt.warning, () => {
          if (!ok()) return;
          this.attackAnim = 0;
          game.explode(x, z, r, this.dmg * pt.damage, b.glow, this.name);
          fx.addShake(0.5);
        });
        break;
      }
      case "charge": {
        const a = this.facing;
        const len = Math.min(pt.length ?? 20, dist + 8);
        fx.telegraphRect(this.x, this.z, a, len, pt.width ?? 3, pt.warning, () => {
          if (!ok()) return;
          this.charging = { t: 0, dur: len / (pt.speed ?? 24), dx: Math.sin(a), dz: Math.cos(a), speed: pt.speed ?? 24, dmg: this.dmg * pt.damage, hit: false };
        });
        break;
      }
      case "nova": {
        const n = pt.count ?? 14;
        fx.telegraphCircle(this.x, this.z, this.radius + 1.2, pt.warning, () => {
          if (!ok()) return;
          const off = Math.random() * Math.PI;
          for (let i = 0; i < n; i++) {
            game.spawnEnemyProjectile(this.x, this.z, off + (i / n) * Math.PI * 2, pt.speed ?? 10, this.dmg * pt.damage, b.projectileColor, 0.32);
          }
          fx.shockwave(this.x, this.z, 4, b.glow);
        });
        break;
      }
      case "fan": {
        const n = pt.count ?? 5;
        const spread = ((pt.spreadDeg ?? 50) * Math.PI) / 180;
        fx.telegraphCircle(this.x, this.z, this.radius + 0.8, pt.warning, () => {
          if (!ok()) return;
          const a = Math.atan2(p.x - this.x, p.z - this.z);
          this.attackAnim = 0;
          for (let i = 0; i < n; i++) {
            game.spawnEnemyProjectile(this.x, this.z, a - spread / 2 + (spread * i) / (n - 1), pt.speed ?? 13, this.dmg * pt.damage, b.projectileColor, 0.34);
          }
        });
        break;
      }
      case "summon": {
        fx.telegraphCircle(this.x, this.z, 4, pt.warning, () => {
          if (!ok() || game.countSummons() >= 8) return;
          for (let i = 0; i < (pt.count ?? 3); i++) {
            const a = (i / (pt.count ?? 3)) * Math.PI * 2;
            game.spawnEnemy(pt.minion ?? "goblin", Math.max(1, this.level - 2), this.x + Math.cos(a) * 3.5, this.z + Math.sin(a) * 3.5, { summoned: true, aggro: true });
          }
          fx.shockwave(this.x, this.z, 5, b.glow);
        });
        break;
      }
      case "meteors": {
        const n = pt.count ?? 5;
        const r = pt.radius ?? 3;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = i === 0 ? 0 : 2 + Math.random() * 8;
          const x = p.x + Math.cos(a) * d;
          const z = p.z + Math.sin(a) * d;
          fx.telegraphCircle(x, z, r, pt.warning + i * 0.18, () => {
            if (!ok()) return;
            game.explode(x, z, r, this.dmg * pt.damage, b.glow, this.name);
          });
        }
        break;
      }
      case "spiral":
        fx.telegraphCircle(this.x, this.z, this.radius + 1.2, pt.warning, () => {
          if (!ok()) return;
          this.spiral = { left: Math.ceil((pt.count ?? 24) / 3), timer: 0, angle: Math.random() * 6.28, p: pt };
        });
        break;
    }
  }
}

export function enemyDef(id: string): EnemyDef {
  const d = ENEMIES[id];
  if (!d) throw new Error("inimigo desconhecido: " + id);
  return d;
}
