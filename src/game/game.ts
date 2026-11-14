// Loop principal: herói, combate, loot, progressão e troca de zona.
import * as THREE from "three";
import { Rng, hashStr } from "../core/rng";
import { generateItem, itemName, RARITIES, RARITY_COLOR, RARITY_LABEL, type Item, type Slot } from "../core/items";
import { computeStats, xpToNext, type Attributes, type FinalStats, type StatBlock } from "../core/stats";
import { generateZone, ObstacleGrid, type ZoneLayout } from "../core/worldgen";
import { writeSave, safeStorage, type SaveData } from "../core/save";
import { BOSSES } from "../data/enemies";
import { HEROES, type AutoAttack, type HeroDef, type StatusSpec } from "../data/heroes";
import { RELICS, RELIC_IDS } from "../data/relics";
import { TUNING } from "../data/tuning";
import { ZONES, ZONE_ORDER, type ZoneDef } from "../data/zones";
import { Audio } from "./audio";
import { Enemy, enemyDef } from "./enemy";
import { Fx } from "./fx";
import { Input } from "./input";
import { animateRig, disposeRig, flashRig, tintRig, type Rig } from "./models";
import { characterRig } from "./rigs";
import { kickRig, nextShot } from "./chars";
import { Pipeline } from "./render";
import { U } from "./shared";
import { buildWorld, type WorldView } from "./world";

export interface GameEvents {
  toast(msg: string, color?: string): void;
  relicChoice(ids: string[], pick: (id: string) => void): void;
  died(): void;
  zoneChanged(): void;
  bagChanged(): void;
  victory(): void;
  openTravel(): void;
}

interface Projectile {
  x: number; z: number; vx: number; vz: number; r: number;
  dmg: number; life: number; friendly: boolean;
  pierce: number; ricochet: number; ricochetDamage: number;
  status?: StatusSpec; mesh: THREE.Mesh; hit: Set<Enemy>; color: number; source: string;
}

interface Drop {
  kind: "item" | "orb" | "relic";
  item?: Item;
  relicId?: string;
  x: number; z: number; t: number;
  mesh: THREE.Object3D;
}

interface Bee { x: number; z: number; life: number; hitCd: number; rig: Rig; phase: number; sting: number }
interface Field { x: number; z: number; r: number; until: number; tick: number; mesh: THREE.Mesh }

export interface PlayerState {
  x: number; z: number; facing: number; hp: number;
  rig: Rig | null;
  moveAmt: number; attackAnim: number; attackCd: number;
  techCd: number; techMax: number;
  dashCd: number; dashT: number; dashDx: number; dashDz: number;
  iframes: number; potionCd: number;
  critUntil: number; aegisUntil: number;
  flash: number; hurtT: number;
  leap: { t: number; dur: number; x0: number; z0: number; x1: number; z1: number } | null;
  rush: { t: number; dur: number; dx: number; dz: number; hit: Set<Enemy> } | null;
  burst: { left: number; timer: number } | null;
}

const UP = new THREE.Vector3(0, 1, 0);
const PROJ_GEO = new THREE.IcosahedronGeometry(1, 0);
const DROP_GEO = new THREE.BoxGeometry(1, 1, 1);
const GEM_GEO = new THREE.OctahedronGeometry(1, 0);

export class Game {
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  fx: Fx;
  audio = new Audio();
  input: Input;
  events!: GameEvents;

  save!: SaveData;
  hero!: HeroDef;
  stats!: FinalStats;
  zone!: ZoneDef;
  layout!: ZoneLayout;
  grid!: ObstacleGrid;
  world: WorldView | null = null;

  player: PlayerState = {
    x: 0, z: 0, facing: 0, hp: 1, rig: null, moveAmt: 0, attackAnim: -1, attackCd: 0, techCd: 0, techMax: 1,
    dashCd: 0, dashT: 0, dashDx: 0, dashDz: 0, iframes: 0, potionCd: 0, critUntil: 0, aegisUntil: 0,
    flash: 0, hurtT: 0, leap: null, rush: null, burst: null,
  };
  playerAlive = true;
  playerVelX = 0;
  playerVelZ = 0;
  enemies: Enemy[] = [];
  boss: Enemy | null = null;
  bossEngaged = false;
  bossDead = false;
  nearPortal = false;
  private projectiles: Projectile[] = [];
  private drops: Drop[] = [];
  private bees: Bee[] = [];
  private fields: Field[] = [];
  private projPool: THREE.Mesh[] = [];
  private projMats = new Map<number, THREE.MeshBasicMaterial>();

  time = 0;
  started = false;
  paused = false;
  private hitstop = 0;
  /** recompensa do chefe, entregue quando o corpo dele some */
  private bossReward: (() => void) | null = null;
  private saveTimer = 0;
  private bagFullToast = 0;
  private lootRng = new Rng((Date.now() ^ 0x9e3779b9) >>> 0);
  private aim = new THREE.Vector3();
  private camTarget = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(UP, 0);
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private lastFrame = 0;
  private marker: THREE.Mesh | null = null;
  pipeline!: Pipeline;
  private moteAcc = 0;
  zoom = 1;
  private proj = new THREE.Vector3();
  private storage = safeStorage();
  fps = 60;

  constructor(private canvas: HTMLCanvasElement, textLayer: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(38, 1, 1, 400);
    this.pipeline = new Pipeline(this.renderer, this.scene, this.camera);
    this.fx = new Fx(this.scene, textLayer);
    this.input = new Input(canvas);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x334433, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    const sc = this.sun.shadow.camera;
    sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 1; sc.far = 160;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.05;
    this.sun.shadow.radius = 2.5;
    this.scene.add(this.hemi, this.sun, this.sun.target);

    window.addEventListener("resize", () => this.resize());
    this.resize();
    requestAnimationFrame((t) => this.frame(t));
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality === 0 ? 1 : 1.5));
    this.renderer.setSize(w, h, false);
    this.pipeline.setSize(w, h, this.renderer.getPixelRatio());
    this.fx.setPointScale(this.pipeline.bufferSize.y / (2 * Math.tan((this.camera.fov * Math.PI) / 360)));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- início / zona
  start(save: SaveData): void {
    this.save = save;
    this.hero = HEROES[save.heroId];
    if (this.player.rig) disposeRig(this.player.rig);
    const h = this.hero;
    this.player.rig = characterRig(h.id, "hero");
    this.scene.add(this.player.rig.root);
    this.marker?.removeFromParent();
    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.78, 28),
      new THREE.MeshBasicMaterial({ color: h.color, transparent: true, opacity: 0.55, depthTest: false, toneMapped: false }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.renderOrder = 10;
    this.scene.add(this.marker);
    this.recompute();
    this.player.hp = this.stats.maxHp;
    this.started = true;
    this.enterZone(save.zone, false);
  }

  /** 0 baixo, 1 médio, 2 alto: sombras, bloom e resolução */
  quality = 2;

  setQuality(q: number): void {
    this.quality = q;
    this.sun.castShadow = q > 0;
    this.sun.shadow.mapSize.set(q === 2 ? 4096 : 2048, q === 2 ? 4096 : 2048);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
    this.pipeline.bloom.enabled = q > 0;
    this.resize();
  }

  stop(): void {
    this.started = false;
    this.persist();
  }

  recompute(): void {
    const sources: StatBlock[] = [this.hero.stats];
    for (const slot of ["weapon", "armor", "trinket"] as Slot[]) {
      const it = this.save.equipped[slot];
      if (it) sources.push(it.stats);
    }
    for (const id of this.save.relics) if (RELICS[id]) sources.push(RELICS[id].stats);
    this.stats = computeStats(this.save.level, this.save.attrs, sources);
    this.player.hp = Math.min(this.player.hp, this.stats.maxHp);
  }

  persist(): void {
    if (this.save) writeSave(this.storage, this.save);
  }

  enterZone(zoneId: string, countVisit = true): void {
    const zone = ZONES[zoneId] ?? ZONES.bosque;
    this.zone = zone;
    this.save.zone = zone.id;
    if (countVisit) this.save.visits++;
    this.clearZone();
    const seed = ((this.save.seed ^ hashStr(zone.id)) + this.save.visits * 7919) >>> 0;
    this.layout = generateZone(zone, seed);
    this.grid = new ObstacleGrid(this.layout.obstacles);
    this.world = buildWorld(this.scene, zone, this.layout);
    this.scene.background = new THREE.Color(zone.sky);
    this.scene.fog = new THREE.Fog(zone.fog, 42, 120);
    this.pipeline.setGrade(zone);
    this.hemi.color.set(zone.ambient);
    this.hemi.groundColor.set(zone.ground[2]);
    this.hemi.intensity = zone.ambientIntensity;
    this.sun.color.set(zone.sun);
    this.sun.intensity = zone.sunIntensity;

    for (const camp of this.layout.camps) {
      camp.spawns.forEach((s, i) => {
        const a = (i / camp.spawns.length) * Math.PI * 2;
        const r = 1.5 + (i % 3);
        this.spawnEnemy(s.id, camp.level, camp.x + Math.cos(a) * r, camp.z + Math.sin(a) * r, { champion: s.champion });
      });
    }
    const bossDef = BOSSES[zone.boss];
    this.boss = new Enemy(this, bossDef, zone.level + 4, this.layout.boss.x, this.layout.boss.z - 4);
    this.enemies.push(this.boss);
    this.bossEngaged = false;
    this.bossDead = false;
    this.bossReward = null;

    const p = this.player;
    p.x = this.layout.spawn.x;
    p.z = this.layout.spawn.z;
    p.hp = this.stats.maxHp;
    p.leap = p.rush = p.burst = null;
    p.dashT = 0;
    this.playerAlive = true;
    this.camTarget.set(p.x, 0, p.z);
    this.persist();
    this.events.zoneChanged();
  }

  private clearZone(): void {
    for (const e of this.enemies) e.dispose();
    this.enemies.length = 0;
    for (const pr of this.projectiles) this.freeProjectile(pr);
    this.projectiles.length = 0;
    for (const d of this.drops) d.mesh.removeFromParent();
    this.drops.length = 0;
    for (const b of this.bees) disposeRig(b.rig);
    this.bees.length = 0;
    for (const f of this.fields) f.mesh.removeFromParent();
    this.fields.length = 0;
    this.fx.clear();
    this.world?.dispose();
    this.world = null;
    this.boss = null;
  }

  spawnEnemy(id: string, level: number, x: number, z: number, opts: { champion?: boolean; summoned?: boolean; aggro?: boolean } = {}): Enemy {
    const e = new Enemy(this, enemyDef(id), level, x, z, opts);
    if (opts.aggro) e.aggro = true;
    this.enemies.push(e);
    return e;
  }

  countSummons(): number {
    let n = 0;
    for (const e of this.enemies) if (e.summoned && !e.dead) n++;
    return n;
  }

  // ---------------------------------------------------------------- projéteis
  private projMat(color: number): THREE.MeshBasicMaterial {
    let m = this.projMats.get(color);
    if (!m) this.projMats.set(color, (m = new THREE.MeshBasicMaterial({ color, toneMapped: false })));
    return m;
  }

  private addProjectile(pr: Omit<Projectile, "mesh" | "hit">): void {
    const mesh = this.projPool.pop() ?? new THREE.Mesh(PROJ_GEO);
    mesh.material = this.projMat(pr.color);
    // projétil alongado na direção do voo
    mesh.scale.set(pr.r * 0.75, pr.r * 0.75, pr.r * 2.4);
    mesh.rotation.y = Math.atan2(pr.vx, pr.vz);
    mesh.position.set(pr.x, 1.15, pr.z);
    this.scene.add(mesh);
    this.projectiles.push({ ...pr, mesh, hit: new Set() });
  }

  private freeProjectile(pr: Projectile): void {
    pr.mesh.removeFromParent();
    this.projPool.push(pr.mesh);
  }

  spawnEnemyProjectile(x: number, z: number, angle: number, speed: number, dmg: number, color: number, r: number): void {
    this.addProjectile({ x, z, vx: Math.sin(angle) * speed, vz: Math.cos(angle) * speed, r, dmg, life: 26 / speed, friendly: false,
      pierce: 0, ricochet: 0, ricochetDamage: 1, color, source: "projétil" });
  }

  private firePlayer(angle: number, auto: AutoAttack, mult: number, rangeMult = 1): void {
    const p = this.player;
    const speed = auto.speed ?? 24;
    const range = auto.range * this.stats.range * rangeMult;
    this.addProjectile({
      x: p.x + Math.sin(angle) * 0.7, z: p.z + Math.cos(angle) * 0.7, vx: Math.sin(angle) * speed, vz: Math.cos(angle) * speed,
      r: 0.24 * (auto.size ?? 1), dmg: mult, life: range / speed, friendly: true,
      pierce: auto.pierce ?? 0, ricochet: auto.ricochet ?? 0, ricochetDamage: auto.ricochetDamage ?? 1,
      status: auto.status, color: auto.color, source: "auto",
    });
  }

  private updateProjectiles(dt: number): void {
    const p = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      pr.x += pr.vx * dt;
      pr.z += pr.vz * dt;
      let dead = pr.life <= 0 || this.grid.hits(pr.x, pr.z, pr.r * 0.5);
      if (!dead && pr.friendly) {
        for (const e of this.enemies) {
          if (e.dead || pr.hit.has(e)) continue;
          const rr = e.radius + pr.r + 0.25;
          if ((e.x - pr.x) ** 2 + (e.z - pr.z) ** 2 > rr * rr) continue;
          pr.hit.add(e);
          this.hitEnemy(e, pr.dmg, pr.status);
          if (pr.ricochet > 0) {
            const next = this.nearestEnemy(e.x, e.z, 9, pr.hit);
            if (next) {
              const sp = Math.hypot(pr.vx, pr.vz);
              const a = Math.atan2(next.x - pr.x, next.z - pr.z);
              pr.vx = Math.sin(a) * sp;
              pr.vz = Math.cos(a) * sp;
              pr.dmg *= pr.ricochetDamage;
              pr.ricochet--;
              pr.life = Math.max(pr.life, 9 / sp + 0.1);
              break;
            }
          }
          if (pr.pierce > 0) pr.pierce--;
          else dead = true;
          break;
        }
      } else if (!dead && this.playerAlive) {
        const rr = 0.55 + pr.r;
        if ((p.x - pr.x) ** 2 + (p.z - pr.z) ** 2 < rr * rr && p.iframes <= 0) {
          this.hurtPlayer(pr.dmg, pr.source);
          dead = true;
        }
      }
      if (dead) {
        this.fx.impact(pr.x, 1.15, pr.z, pr.color, 0.7);
        this.freeProjectile(pr);
        this.projectiles.splice(i, 1);
      } else {
        pr.mesh.position.set(pr.x, 1.15, pr.z);
        // rastro de cometa
        this.fx.glow(pr.x, 1.15, pr.z, pr.color, pr.r * (pr.friendly ? 5 : 6.5), 0.2, -pr.vx * 0.06, 0, -pr.vz * 0.06);
      }
    }
  }

  private nearestEnemy(x: number, z: number, maxDist: number, exclude?: Set<Enemy>): Enemy | null {
    let best: Enemy | null = null;
    let bd = maxDist * maxDist;
    for (const e of this.enemies) {
      if (e.dead || exclude?.has(e)) continue;
      const d = (e.x - x) ** 2 + (e.z - z) ** 2;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  // ---------------------------------------------------------------- dano
  hitEnemy(e: Enemy, mult: number, status?: StatusSpec): void {
    if (e.dead) return;
    const s = this.stats;
    const now = this.time;
    const crit = Math.random() < s.critChance || now < this.player.critUntil;
    let amount = s.damage * mult * (0.9 + Math.random() * 0.2);
    const bs = this.hero.auto.backstab;
    if (bs && (now < e.stunUntil || now < e.slowUntil)) amount *= 1 + bs;
    if (crit) amount *= s.critDamage;
    this.damageEnemy(e, amount, { crit });
    if (status && !e.dead && (status.chance === undefined || Math.random() < status.chance)) this.applyStatus(e, status, amount);
  }

  applyStatus(e: Enemy, st: StatusSpec, hitDamage: number): void {
    const now = this.time;
    const potency = this.stats.status;
    if (st.kind === "slow") {
      e.slowUntil = Math.max(e.slowUntil, now + st.duration);
      e.slowPower = Math.min(0.85, st.power * Math.min(1.6, potency)) * (e.isBoss ? 0.4 : 1);
    } else if (st.kind === "stun") {
      e.stunUntil = Math.max(e.stunUntil, now + st.duration * (e.isBoss ? 0.3 : 1));
      e.windupT = -1;
    } else {
      const max = st.maxStacks ?? 1;
      const dot = { kind: st.kind, dps: hitDamage * st.power * potency, until: now + st.duration };
      const same = e.dots.filter((d) => d.kind === st.kind);
      if (same.length >= max) {
        same.sort((a, b) => a.until - b.until);
        Object.assign(same[0], dot);
      } else e.dots.push(dot);
    }
  }

  damageEnemy(e: Enemy, amount: number, opts: { crit?: boolean; dot?: string } = {}): void {
    if (e.dead) return;
    amount = Math.max(1, Math.round(amount));
    e.hp -= amount;
    if (!e.aggro) e.setAggro(this);
    const top = e.rig.height + 0.3;
    if (opts.dot) {
      this.fx.text(e.x, top, e.z, String(amount), opts.dot === "poison" ? "poison" : "burn");
    } else {
      e.flash = 1;
      // empurrão: o corpo cede como mola e é jogado para trás
      const hp0 = this.player;
      let kdx = e.x - hp0.x, kdz = e.z - hp0.z;
      const kd = Math.hypot(kdx, kdz) || 1;
      kdx /= kd;
      kdz /= kd;
      const power = Math.min(1, 0.22 + (amount / e.maxHp) * 2.2) * (opts.crit ? 1.35 : 1) * (this.hero.auto.kind === "melee" ? 1.5 : 1);
      kickRig(e.rig, kdx, kdz, e.isBoss ? power * 0.5 : power);
      if (!e.isBoss) {
        e.kx += kdx * power * TUNING.enemy.knockback;
        e.kz += kdz * power * TUNING.enemy.knockback;
      }
      this.fx.impact(e.x - kdx * e.radius, e.rig.height * 0.55, e.z - kdz * e.radius, opts.crit ? 0xffe066 : this.hero.auto.color, opts.crit ? 1.5 : 1);
      this.fx.text(e.x, top, e.z, String(amount) + (opts.crit ? "!" : ""), opts.crit ? "crit" : "dmg");
      this.fx.burst(e.x, e.rig.height * 0.6, e.z, opts.crit ? 0xffe066 : 0xffffff, opts.crit ? 9 : 4, 5, 0.13, 0.3);
      this.audio.play(opts.crit ? "crit" : "hit");
      if (opts.crit) {
        this.hitstop = Math.max(this.hitstop, 0.035);
        this.fx.addShake(0.12);
      }
    }
    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Enemy): void {
    e.dead = true;
    e.hp = 0;
    const color = e.boss?.color ?? e.def!.color;
    this.fx.burst(e.x, e.rig.height * 0.5, e.z, color, e.isBoss ? 80 : 14, e.isBoss ? 12 : 6, e.isBoss ? 0.3 : 0.18, e.isBoss ? 1.2 : 0.6);
    this.audio.play(e.isBoss ? "boss" : "kill");
    this.save.kills++;
    if (this.stats.lifeOnKill > 0 && this.playerAlive) this.heal(this.stats.lifeOnKill, false);
    if (e.xp > 0) this.gainXp(e.xp);
    const split = e.def?.splitInto;
    if (split) {
      for (let i = 0; i < split.count; i++) {
        const a = Math.random() * Math.PI * 2;
        this.spawnEnemy(split.id, e.level, e.x + Math.cos(a) * 0.8, e.z + Math.sin(a) * 0.8, { summoned: true, aggro: true });
      }
    }
    if (!e.summoned) this.rollLoot(e);
    if (e.isBoss) this.onBossKilled(e);
  }

  private rollLoot(e: Enemy): void {
    const L = TUNING.loot;
    const mf = this.stats.magicFind;
    const rng = this.lootRng;
    if (e.isBoss) {
      for (let i = 0; i < L.bossDrops; i++) this.dropItem(generateItem(rng, e.level, mf, { minRarity: i === 0 ? "raro" : "incomum" }), e.x, e.z, 3);
      return;
    }
    if (e.champion) {
      this.dropItem(generateItem(rng, e.level, mf, { minRarity: "incomum" }), e.x, e.z, 1);
      if (rng.chance(L.relicChanceChampion)) {
        const pool = RELIC_IDS.filter((id) => !this.save.relics.includes(id));
        if (pool.length) this.addDrop({ kind: "relic", relicId: rng.pick(pool), x: e.x + 1, z: e.z, t: 0 }, 0xffc83d, true);
      }
    } else if (rng.chance(L.dropChance)) this.dropItem(generateItem(rng, e.level, mf), e.x, e.z, 0.5);
    if (rng.chance(L.healOrbChance)) this.addDrop({ kind: "orb", x: e.x + rng.range(-0.6, 0.6), z: e.z + rng.range(-0.6, 0.6), t: 0 }, 0xff4a5a, false);
  }

  private dropItem(item: Item, x: number, z: number, spread: number): void {
    const a = Math.random() * Math.PI * 2;
    const color = new THREE.Color(RARITY_COLOR[item.rarity]).getHex();
    this.addDrop({ kind: "item", item, x: x + Math.cos(a) * spread, z: z + Math.sin(a) * spread, t: 0 }, color, RARITIES.indexOf(item.rarity) >= 2);
    if (RARITIES.indexOf(item.rarity) >= 3) this.audio.play("rare");
  }

  private addDrop(d: Omit<Drop, "mesh">, color: number, beam: boolean): void {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.1, flatShading: true });
    const core = new THREE.Mesh(d.kind === "item" ? DROP_GEO : GEM_GEO, mat);
    core.scale.setScalar(d.kind === "orb" ? 0.22 : d.kind === "relic" ? 0.4 : 0.36);
    core.castShadow = true;
    g.add(core);
    if (beam) {
      const bm = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false });
      const b = new THREE.Mesh(DROP_GEO, bm);
      b.scale.set(0.12, 9, 0.12);
      b.position.y = 4.2;
      g.add(b);
    }
    g.position.set(d.x, 0.6, d.z);
    this.scene.add(g);
    this.drops.push({ ...d, mesh: g });
  }

  private updateDrops(dt: number): void {
    const p = this.player;
    this.bagFullToast -= dt;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.t += dt;
      const core = d.mesh.children[0];
      core.rotation.y += dt * 2.2;
      core.position.y = Math.sin(d.t * 3) * 0.12 + Math.max(0, 1 - d.t * 3) * 1.2;
      if (d.t < 0.35 || !this.playerAlive) continue;
      const dist = Math.hypot(p.x - d.x, p.z - d.z);
      if (d.kind === "orb" && dist < 5 && p.hp < this.stats.maxHp) {
        // orbes de cura são atraídos
        d.x += ((p.x - d.x) / dist) * 12 * dt;
        d.z += ((p.z - d.z) / dist) * 12 * dt;
        d.mesh.position.set(d.x, 0.6, d.z);
      }
      if (dist > TUNING.hero.pickupRadius) continue;
      if (d.kind === "orb") {
        if (p.hp >= this.stats.maxHp) continue;
        this.heal(this.stats.maxHp * TUNING.loot.healOrbPct, true);
      } else if (d.kind === "relic") {
        this.addRelic(d.relicId!);
      } else {
        if (this.save.bag.length >= TUNING.loot.bagSize) {
          if (this.bagFullToast <= 0) {
            this.bagFullToast = 3;
            this.events.toast("Mochila cheia (abra com I e descarte com o botão direito)", "#ff8a7a");
          }
          continue;
        }
        const it = d.item!;
        this.save.bag.push(it);
        this.events.toast(`${itemName(it, this.hero.weaponName)} · ${RARITY_LABEL[it.rarity]} nv ${it.ilvl}`, RARITY_COLOR[it.rarity]);
        this.audio.play("pickup");
        this.events.bagChanged();
      }
      d.mesh.removeFromParent();
      this.drops.splice(i, 1);
    }
  }

  addRelic(id: string): void {
    if (this.save.relics.includes(id) || !RELICS[id]) return;
    this.save.relics.push(id);
    this.recompute();
    this.events.toast(`Relíquia: ${RELICS[id].name}`, "#ffc83d");
    this.audio.play("rare");
    this.events.bagChanged();
    this.persist();
  }

  heal(amount: number, show: boolean): void {
    const p = this.player;
    const before = p.hp;
    p.hp = Math.min(this.stats.maxHp, p.hp + amount);
    if (show && p.hp - before >= 1) {
      this.fx.text(p.x, 2.6, p.z, "+" + Math.round(p.hp - before), "heal");
      this.fx.burst(p.x, 1.2, p.z, 0x5fd35f, 8, 3, 0.12, 0.5, 2);
    }
  }

  gainXp(amount: number): void {
    const s = this.save;
    if (s.level >= TUNING.xp.maxLevel) return;
    s.xp += Math.round(amount * this.stats.xp);
    let leveled = false;
    while (s.level < TUNING.xp.maxLevel && s.xp >= xpToNext(s.level)) {
      s.xp -= xpToNext(s.level);
      s.level++;
      s.attrPoints += TUNING.attributes.pointsPerLevel;
      leveled = true;
    }
    if (leveled) {
      this.recompute();
      this.player.hp = this.stats.maxHp;
      const p = this.player;
      this.fx.shockwave(p.x, p.z, 6, 0xffe066, 0.6);
      this.fx.burst(p.x, 1.5, p.z, 0xffe066, 40, 8, 0.16, 0.9, 6);
      this.fx.text(p.x, 3.2, p.z, `NÍVEL ${s.level}`, "level");
      this.audio.play("level");
      this.events.toast(`Nível ${s.level}! +1 ponto de atributo (I)`, "#ffe066");
      this.events.bagChanged();
      this.persist();
    }
  }

  hurtPlayer(amount: number, source: string): void {
    void source;
    const p = this.player;
    if (!this.playerAlive || p.iframes > 0) return;
    if (Math.random() < this.stats.dodge) {
      this.fx.text(p.x, 2.6, p.z, "Esquiva", "dodge");
      p.iframes = 0.15;
      return;
    }
    amount *= this.stats.damageTaken * (this.time < p.aegisUntil ? 0.4 : 1);
    if (this.hero.maxHitFraction) amount = Math.min(amount, this.stats.maxHp * this.hero.maxHitFraction);
    amount = Math.max(1, Math.round(amount));
    p.hp -= amount;
    p.flash = 1;
    if (p.rig) kickRig(p.rig, -Math.sin(p.facing), -Math.cos(p.facing), 0.7);
    p.hurtT = 1;
    p.iframes = 0.12;
    this.fx.text(p.x, 2.6, p.z, "-" + amount, "hurt");
    this.fx.burst(p.x, 1.2, p.z, 0xff4a4a, 8, 5, 0.14, 0.4);
    this.fx.addShake(Math.min(0.6, 0.15 + (amount / this.stats.maxHp) * 1.5));
    this.audio.play("hurt");
    if (p.hp <= 0) {
      p.hp = 0;
      this.playerAlive = false;
      p.leap = p.rush = p.burst = null;
      this.save.deaths++;
      this.persist();
      this.events.died();
    }
  }

  explode(x: number, z: number, r: number, dmg: number, color: number, source: string): void {
    this.fx.shockwave(x, z, r, color);
    this.fx.burst(x, 0.4, z, color, 16, 7, 0.18, 0.5);
    this.fx.flashLight(x, 1.5, z, color, 60, 0.4);
    this.fx.addShake(0.15);
    const p = this.player;
    if (Math.hypot(p.x - x, p.z - z) < r + 0.3) this.hurtPlayer(dmg, source);
  }

  respawn(): void {
    const p = this.player;
    p.x = this.layout.spawn.x;
    p.z = this.layout.spawn.z;
    p.hp = this.stats.maxHp;
    p.iframes = 1.5;
    this.playerAlive = true;
    for (const pr of this.projectiles) this.freeProjectile(pr);
    this.projectiles.length = 0;
    this.fx.clear();
    this.camTarget.set(p.x, 0, p.z);
  }

  // ---------------------------------------------------------------- chefe
  onBossAggro(e: Enemy): void {
    this.bossEngaged = true;
    this.audio.play("boss");
    this.fx.addShake(0.4);
    this.events.toast(`${e.boss!.name}, ${e.boss!.title}`, "#ff6a5a");
  }

  onBossReset(_e: Enemy): void {
    this.bossEngaged = false;
  }

  private onBossKilled(e: Enemy): void {
    this.bossEngaged = false;
    this.bossDead = true;
    this.hitstop = 0.25;
    this.fx.addShake(1);
    for (const m of this.enemies) if (m.summoned && !m.dead) this.damageEnemy(m, m.hp + 1, { dot: "burn" });
    const s = this.save;
    const first = !s.bossesKilled.includes(e.boss!.id);
    if (first) s.bossesKilled.push(e.boss!.id);
    const idx = ZONE_ORDER.indexOf(this.zone.id as (typeof ZONE_ORDER)[number]);
    const next = ZONE_ORDER[idx + 1];
    if (next && !s.zonesUnlocked.includes(next)) {
      s.zonesUnlocked.push(next);
      this.events.toast(`Nova zona liberada: ${ZONES[next].name}`, "#9be4ff");
    }
    this.persist();
    const pool = RELIC_IDS.filter((id) => !s.relics.includes(id));
    this.lootRng.shuffle(pool);
    const offer = pool.slice(0, 3);
    const final = !next && first;
    const after = () => {
      if (final) this.events.victory();
    };
    // portal e escolha de relíquia só depois que o corpo do chefe se desfaz (a escolha pausa o jogo)
    this.bossReward = () => {
      if (this.world) {
        this.world.portal.visible = true;
        this.world.portal.position.set(this.layout.boss.x, 0, this.layout.boss.z);
      }
      if (offer.length) {
        this.events.relicChoice(offer, (id) => {
          this.addRelic(id);
          after();
        });
      } else after();
    };
  }

  // ---------------------------------------------------------------- inventário
  equip(item: Item): void {
    const s = this.save;
    const i = s.bag.indexOf(item);
    if (i < 0) return;
    const prev = s.equipped[item.slot];
    s.bag.splice(i, 1);
    if (prev) s.bag.push(prev);
    s.equipped[item.slot] = item;
    const ratio = this.player.hp / this.stats.maxHp;
    this.recompute();
    this.player.hp = Math.max(1, Math.round(this.stats.maxHp * ratio));
    this.audio.play("pickup");
    this.persist();
    this.events.bagChanged();
  }

  discard(item: Item): void {
    const i = this.save.bag.indexOf(item);
    if (i < 0) return;
    this.save.bag.splice(i, 1);
    this.persist();
    this.events.bagChanged();
  }

  spendPoint(attr: keyof Attributes): void {
    if (this.save.attrPoints <= 0) return;
    this.save.attrPoints--;
    this.save.attrs[attr]++;
    const ratio = this.player.hp / this.stats.maxHp;
    this.recompute();
    this.player.hp = Math.max(1, Math.round(this.stats.maxHp * ratio));
    this.persist();
    this.events.bagChanged();
  }

  // ---------------------------------------------------------------- herói
  private updateAim(): void {
    const ndc = new THREE.Vector2((this.input.mouseX / window.innerWidth) * 2 - 1, -(this.input.mouseY / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    this.raycaster.ray.intersectPlane(this.groundPlane, this.aim);
  }

  private aimPoint(maxRange: number): { x: number; z: number } {
    const p = this.player;
    const dx = this.aim.x - p.x;
    const dz = this.aim.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d <= maxRange || d < 0.001) return { x: this.aim.x, z: this.aim.z };
    return { x: p.x + (dx / d) * maxRange, z: p.z + (dz / d) * maxRange };
  }

  private areaHit(x: number, z: number, r: number, mult: number, status?: StatusSpec, knock = 0): number {
    let n = 0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.z - z);
      if (d > r + e.radius) continue;
      this.hitEnemy(e, mult, status);
      n++;
      if (knock > 0 && !e.isBoss && d > 0.01) {
        e.x += ((e.x - x) / d) * knock;
        e.z += ((e.z - z) / d) * knock;
      }
    }
    return n;
  }

  private lineHit(x0: number, z0: number, x1: number, z1: number, width: number, mult: number, status?: StatusSpec, hit?: Set<Enemy>): void {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len2 = dx * dx + dz * dz || 1;
    for (const e of this.enemies) {
      if (e.dead || hit?.has(e)) continue;
      const t = Math.max(0, Math.min(1, ((e.x - x0) * dx + (e.z - z0) * dz) / len2));
      if (Math.hypot(e.x - (x0 + dx * t), e.z - (z0 + dz * t)) > width + e.radius) continue;
      hit?.add(e);
      this.hitEnemy(e, mult, status);
    }
  }

  private autoAttack(): void {
    const p = this.player;
    const a = this.hero.auto;
    p.attackCd = 1 / (a.rate * this.stats.attackSpeed);
    p.attackAnim = 0;
    if (p.rig) nextShot(p.rig);
    if (a.kind === "projectile") {
      this.firePlayer(p.facing, a, a.damage);
      this.audio.play("shoot");
    } else if (a.kind === "fan") {
      const n = a.count ?? 5;
      const spread = ((a.spreadDeg ?? 40) * Math.PI) / 180;
      for (let i = 0; i < n; i++) this.firePlayer(p.facing - spread / 2 + (spread * i) / (n - 1), a, a.damage);
      this.audio.play("swing");
    } else {
      const range = a.range * (1 + (this.stats.range - 1) * 0.5) * (1 + (this.stats.area - 1) * 0.5);
      const arc = (((a.arcDeg ?? 100) * Math.PI) / 180) / 2;
      this.fx.slash(p.x, p.z, p.facing, range, a.arcDeg ?? 100, a.color);
      this.audio.play("swing");
      let hits = 0;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - p.x, e.z - p.z);
        if (d > range + e.radius) continue;
        let da = Math.atan2(e.x - p.x, e.z - p.z) - p.facing;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) > arc && d > e.radius + 0.8) continue;
        this.hitEnemy(e, a.damage, a.status);
        hits++;
      }
      if (hits) this.fx.addShake(0.08);
    }
  }

  private useTechnique(): void {
    const p = this.player;
    const t = this.hero.technique;
    const s = this.stats;
    p.techMax = t.cooldown * s.cooldownMult;
    p.techCd = p.techMax;
    this.audio.play("tech");
    const color = this.hero.color;
    switch (t.kind) {
      case "nova": {
        const r = (t.radius ?? 6) * s.area;
        this.areaHit(p.x, p.z, r, t.damage, t.status);
        this.fx.shockwave(p.x, p.z, r, color, 0.45);
        this.fx.burst(p.x, 0.6, p.z, color, 50, 12, 0.18, 0.7, 4);
        this.fx.addShake(0.3);
        break;
      }
      case "blink":
      case "shadow": {
        const dest = this.aimPoint(t.range ?? 10);
        const x0 = p.x;
        const z0 = p.z;
        p.x = dest.x;
        p.z = dest.z;
        this.grid.resolve(p, 0.5);
        p.iframes = Math.max(p.iframes, 0.35);
        this.fx.streak(x0, z0, p.x, p.z, t.kind === "blink" ? 1.2 : 0.5, color);
        this.fx.burst(x0, 1, z0, color, 14, 5, 0.14, 0.4);
        if (t.kind === "blink") this.lineHit(x0, z0, p.x, p.z, 1.6, t.damage);
        else {
          this.areaHit(p.x, p.z, 3.2 * s.area, t.damage);
          this.fx.shockwave(p.x, p.z, 3.2 * s.area, color);
          p.critUntil = this.time + (t.duration ?? 2.5);
        }
        this.fx.burst(p.x, 1, p.z, color, 20, 6, 0.14, 0.4);
        break;
      }
      case "field": {
        const dest = this.aimPoint(14);
        const r = (t.radius ?? 6) * s.area;
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false, toneMapped: false });
        const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 40), mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(dest.x, 0.1, dest.z);
        mesh.scale.setScalar(r);
        this.scene.add(mesh);
        this.fields.push({ x: dest.x, z: dest.z, r, until: this.time + (t.duration ?? 5), tick: 0, mesh });
        this.fx.shockwave(dest.x, dest.z, r, color, 0.4);
        break;
      }
      case "dash": {
        const dest = this.aimPoint(t.range ?? 11);
        const d = Math.hypot(dest.x - p.x, dest.z - p.z) || 1;
        p.rush = { t: 0, dur: Math.max(0.12, d / 30), dx: (dest.x - p.x) / d, dz: (dest.z - p.z) / d, hit: new Set() };
        p.iframes = Math.max(p.iframes, d / 30 + 0.15);
        break;
      }
      case "burst":
        p.burst = { left: t.count ?? 8, timer: 0 };
        break;
      case "leap": {
        const dest = this.aimPoint(t.range ?? 10);
        p.leap = { t: 0, dur: 0.42, x0: p.x, z0: p.z, x1: dest.x, z1: dest.z };
        p.iframes = Math.max(p.iframes, 0.55);
        break;
      }
      case "aegis": {
        const r = (t.radius ?? 5) * s.area;
        this.heal(s.maxHp * 0.25, true);
        p.aegisUntil = this.time + (t.duration ?? 4);
        this.areaHit(p.x, p.z, r, t.damage, undefined, 3);
        this.fx.shockwave(p.x, p.z, r, color, 0.45);
        this.fx.burst(p.x, 1, p.z, color, 40, 9, 0.16, 0.7, 3);
        break;
      }
      case "brood": {
        for (let i = 0; i < (t.count ?? 3); i++) {
          const rig = characterRig("bee", "hero");
          this.scene.add(rig.root);
          this.bees.push({ x: p.x, z: p.z, life: t.duration ?? 10, hitCd: 0, rig, phase: i * 1.7, sting: -1 });
        }
        this.fx.burst(p.x, 1.2, p.z, 0xffe14a, 20, 5, 0.12, 0.5, 2);
        break;
      }
    }
  }

  private updatePlayer(dt: number): void {
    const p = this.player;
    const s = this.stats;
    const T = TUNING.hero;
    const input = this.input;
    const rig = p.rig!;
    const x0 = p.x;
    const z0 = p.z;
    p.attackCd -= dt;
    p.techCd -= dt;
    p.dashCd -= dt;
    p.potionCd -= dt;
    p.iframes -= dt;
    p.hurtT = Math.max(0, p.hurtT - dt * 2.5);
    p.moveAmt = 0;

    if (!this.playerAlive) {
      animateRig(rig, { t: this.time, move: 0, attack: -1, windup: 0, dead: 1 });
      return;
    }
    if (s.regen > 0) p.hp = Math.min(s.maxHp, p.hp + s.regen * dt);
    this.updateAim();
    p.facing = Math.atan2(this.aim.x - p.x, this.aim.z - p.z);
    let lift = 0;

    if (p.leap) {
      const l = p.leap;
      l.t += dt;
      const k = Math.min(1, l.t / l.dur);
      p.x = l.x0 + (l.x1 - l.x0) * k;
      p.z = l.z0 + (l.z1 - l.z0) * k;
      lift = Math.sin(k * Math.PI) * 4.5;
      if (k >= 1) {
        p.leap = null;
        const t = this.hero.technique;
        const r = (t.radius ?? 4) * s.area;
        this.grid.resolve(p, 0.5);
        this.areaHit(p.x, p.z, r, t.damage, t.status, 1.5);
        this.fx.shockwave(p.x, p.z, r, this.hero.color, 0.4);
        this.fx.burst(p.x, 0.3, p.z, 0xc8b89a, 40, 10, 0.2, 0.7);
        this.fx.addShake(0.6);
        this.audio.play("kill");
      }
    } else if (p.rush) {
      const r = p.rush;
      r.t += dt;
      const nx = p.x + r.dx * 30 * dt;
      const nz = p.z + r.dz * 30 * dt;
      this.lineHit(p.x, p.z, nx, nz, 1.7, this.hero.technique.damage, this.hero.technique.status, r.hit);
      p.x = nx;
      p.z = nz;
      p.moveAmt = 1;
      this.fx.burst(p.x, 0.8, p.z, 0xff8a2a, 3, 3, 0.2, 0.5, 2);
      if (r.t >= r.dur) p.rush = null;
    } else {
      if (p.dashT > 0) {
        p.dashT -= dt;
        p.x += p.dashDx * T.dashSpeed * dt;
        p.z += p.dashDz * T.dashSpeed * dt;
        p.moveAmt = 1;
        this.fx.spark(p.x, 0.9, p.z, this.hero.color, 0.22, 0.3, 0.2);
      } else {
        const ax = input.axis();
        // atacar corpo a corpo ou atirar reduz um pouco a velocidade
        const slow = p.attackAnim >= 0 && this.hero.auto.kind === "melee" ? 0.55 : 1;
        p.x += ax.x * s.moveSpeed * slow * dt;
        p.z += ax.z * s.moveSpeed * slow * dt;
        if (ax.x || ax.z) p.moveAmt = 1;
        if (input.wasPressed("Space") && p.dashCd <= 0) {
          const hasDir = ax.x !== 0 || ax.z !== 0;
          p.dashDx = hasDir ? ax.x : Math.sin(p.facing);
          p.dashDz = hasDir ? ax.z : Math.cos(p.facing);
          p.dashT = T.dashTime;
          p.dashCd = T.dashCooldown;
          p.iframes = Math.max(p.iframes, T.dashIFrames);
          this.audio.play("dash");
        }
      }
      if ((input.rmbPressed || input.wasPressed("KeyQ")) && p.techCd <= 0) this.useTechnique();
      else if (input.lmb && p.attackCd <= 0 && !p.burst) this.autoAttack();
      if (input.wasPressed("KeyF") && p.potionCd <= 0 && p.hp < s.maxHp) {
        p.potionCd = T.potionCooldown;
        this.heal(s.maxHp * T.potionHealPct, true);
        this.audio.play("potion");
      }
    }

    if (p.burst) {
      const b = p.burst;
      b.timer -= dt;
      while (b.timer <= 0 && b.left > 0) {
        b.timer += 0.055;
        b.left--;
        this.firePlayer(p.facing + (Math.random() - 0.5) * 0.42, this.hero.auto, this.hero.technique.damage);
        this.audio.play("shoot");
        p.attackAnim = 0;
      }
      if (b.left <= 0) p.burst = null;
    }

    if (!p.leap) this.grid.resolve(p, 0.5);
    const lim = this.layout.size / 2 - TUNING.world.margin + 1;
    p.x = Math.max(-lim, Math.min(lim, p.x));
    p.z = Math.max(-lim, Math.min(lim, p.z));
    if (dt > 0) {
      this.playerVelX = (p.x - x0) / dt;
      this.playerVelZ = (p.z - z0) / dt;
    }

    // portal
    this.nearPortal = this.bossDead && this.world !== null && this.world.portal.visible && Math.hypot(p.x - this.layout.boss.x, p.z - this.layout.boss.z) < 2.6;
    if (this.nearPortal && input.wasPressed("KeyE")) this.events.openTravel();

    // visual
    this.marker?.position.set(p.x, 0.07, p.z);
    rig.root.position.set(p.x, lift, p.z);
    rig.root.rotation.y = p.facing;
    if (p.attackAnim >= 0) {
      p.attackAnim += dt * Math.max(4, this.hero.auto.rate * s.attackSpeed * 1.6);
      if (p.attackAnim >= 1) p.attackAnim = -1;
    }
    animateRig(rig, { t: this.time, move: p.moveAmt, attack: p.attackAnim, windup: 0, dead: 0 });
    if (p.dashT > 0 || p.rush) rig.inner.rotation.x = 0.5;
    if (p.flash > 0) {
      p.flash = Math.max(0, p.flash - dt * 6);
      flashRig(rig, p.flash);
    } else if (this.time < p.aegisUntil) tintRig(rig, 0xffe9a8, 0.6);
    else if (this.time < p.critUntil) tintRig(rig, 0xb87aff, 0.5);
    else flashRig(rig, 0);
    rig.root.visible = p.iframes <= 0.3 || Math.floor(this.time * 24) % 2 === 0 || p.dashT > 0 || !!p.leap || !!p.rush;
  }

  private updateAllies(dt: number): void {
    const p = this.player;
    const t = this.hero.technique;
    for (let i = this.bees.length - 1; i >= 0; i--) {
      const b = this.bees[i];
      b.life -= dt;
      b.hitCd -= dt;
      if (b.life <= 0) {
        disposeRig(b.rig);
        this.bees.splice(i, 1);
        continue;
      }
      let target: Enemy | null = null;
      let bd = 15 * 15;
      for (const e of this.enemies) {
        if (e.dead || (!e.aggro && Math.hypot(e.x - p.x, e.z - p.z) > 12)) continue;
        const d = (e.x - b.x) ** 2 + (e.z - b.z) ** 2;
        if (d < bd && Math.hypot(e.x - p.x, e.z - p.z) < 18) {
          bd = d;
          target = e;
        }
      }
      const tx = target ? target.x : p.x + Math.cos(this.time * 2 + b.phase) * 1.8;
      const tz = target ? target.z : p.z + Math.sin(this.time * 2 + b.phase) * 1.8;
      const d = Math.hypot(tx - b.x, tz - b.z);
      if (d > 0.3) {
        b.x += ((tx - b.x) / d) * 12 * dt;
        b.z += ((tz - b.z) / d) * 12 * dt;
      }
      if (target && d < target.radius + 0.9 && b.hitCd <= 0) {
        b.hitCd = 0.6;
        b.sting = 0;
        this.hitEnemy(target, t.damage, t.status);
      }
      if (b.sting >= 0) {
        b.sting += dt / 0.3;
        if (b.sting >= 1) b.sting = -1;
      }
      // a forma `bat` já voa a meia altura do corpo; aqui só a altura do voo e para onde olha
      b.rig.root.position.set(b.x, 0.9 + Math.sin(this.time * 5 + b.phase) * 0.15, b.z);
      if (d > 0.05) b.rig.root.rotation.y = Math.atan2(tx - b.x, tz - b.z);
      animateRig(b.rig, { t: this.time, move: 1, attack: b.sting, windup: 0, dead: 0 });
    }
    for (let i = this.fields.length - 1; i >= 0; i--) {
      const f = this.fields[i];
      f.tick -= dt;
      if (this.time >= f.until) {
        f.mesh.removeFromParent();
        f.mesh.geometry.dispose();
        (f.mesh.material as THREE.Material).dispose();
        this.fields.splice(i, 1);
        continue;
      }
      (f.mesh.material as THREE.MeshBasicMaterial).opacity = 0.22 + Math.sin(this.time * 6) * 0.06;
      if (f.tick <= 0) {
        f.tick = 0.5;
        this.areaHit(f.x, f.z, f.r, t.damage * 0.5, t.status);
        this.fx.burst(f.x + (Math.random() - 0.5) * f.r, 0.2, f.z + (Math.random() - 0.5) * f.r, this.hero.color, 5, 2, 0.12, 0.6, -2);
      }
    }
  }

  private updateEnemies(dt: number): void {
    const p = this.player;
    const active: Enemy[] = [];
    const R = TUNING.enemy.activeRadius;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.remove) {
        e.dispose();
        this.enemies.splice(i, 1);
        if (e === this.boss) {
          this.boss = null;
          const reward = this.bossReward;
          this.bossReward = null;
          if (reward) setTimeout(reward, 600);
        }
        continue;
      }
      const near = Math.abs(e.x - p.x) < R && Math.abs(e.z - p.z) < R;
      e.rig.root.visible = near;
      if (!near && !e.aggro) continue;
      e.update(this, dt);
      if (!e.dead) active.push(e);
    }
    // separação simples entre inimigos próximos
    for (let i = 0; i < active.length; i++) {
      const a = active[i];
      for (let j = i + 1; j < active.length; j++) {
        const b = active[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const min = a.radius + b.radius;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const push = (min - d) / 2;
        const wa = a.isBoss ? 0 : b.isBoss ? 2 : 1;
        const wb = b.isBoss ? 0 : a.isBoss ? 2 : 1;
        a.x -= (dx / d) * push * wa;
        a.z -= (dz / d) * push * wa;
        b.x += (dx / d) * push * wb;
        b.z += (dz / d) * push * wb;
      }
      // não atravessa o herói
      const dx = a.x - p.x;
      const dz = a.z - p.z;
      const min = a.radius + 0.45;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min && d2 > 1e-6 && !a.charging) {
        const d = Math.sqrt(d2);
        a.x = p.x + (dx / d) * min;
        a.z = p.z + (dz / d) * min;
      }
    }
  }

  private updateCamera(dt: number): void {
    const p = this.player;
    const lead = 0.14;
    const tx = p.x + (this.aim.x - p.x) * lead;
    const tz = p.z + (this.aim.z - p.z) * lead;
    const k = Math.min(1, dt * 7);
    this.camTarget.x += (tx - this.camTarget.x) * k;
    this.camTarget.z += (tz - this.camTarget.z) * k;
    const sh = this.fx.shake * this.fx.shake * 0.9;
    const sx = (Math.random() - 0.5) * sh;
    const sz = (Math.random() - 0.5) * sh;
    // roda do mouse aproxima/afasta
    this.zoom = Math.max(0.55, Math.min(1.25, this.zoom + this.input.takeWheel() * 0.0009));
    this.camera.position.set(this.camTarget.x + sx, 19.5 * this.zoom, this.camTarget.z + 16 * this.zoom + sz);
    this.camera.lookAt(this.camTarget.x + sx, 0.8, this.camTarget.z + sz);
    this.sun.position.set(this.camTarget.x + 30, 50, this.camTarget.z + 14);
    this.sun.target.position.set(this.camTarget.x, 0, this.camTarget.z - 4);
    this.camera.updateMatrixWorld();

    // uniforms do cenário: vento, grama e o "buraco" no que tapa o herói
    U.uTime.value = this.time;
    U.uCenter.value.set(this.camTarget.x, this.camTarget.z - 8);
    U.uHero.value.set(p.x, 0, p.z);
    const size = this.pipeline.bufferSize;
    this.proj.set(p.x, 1.1, p.z).project(this.camera);
    U.uFadePos.value.set((this.proj.x * 0.5 + 0.5) * size.x, (this.proj.y * 0.5 + 0.5) * size.y);
    U.uFadeRadius.value = size.y * 0.085;
    U.uFadeDepth.value = this.proj.z * 0.5 + 0.5 - 0.0004;

    // partículas de ambiente (pólen, brasas, centelhas) e fogueira
    const motes = this.zone.motes;
    this.moteAcc += dt * motes.rate;
    while (this.moteAcc >= 1) {
      this.moteAcc--;
      this.fx.spark(this.camTarget.x + (Math.random() - 0.5) * 44, 0.3 + Math.random() * 3.5, this.camTarget.z - 6 + (Math.random() - 0.5) * 34,
        motes.color, 0.05 + Math.random() * 0.05, 2 + Math.random() * 2, motes.rise * (0.5 + Math.random()));
    }
    const fire = this.world?.group.userData.fire as THREE.Group | undefined;
    if (fire) {
      (fire.userData.light as THREE.PointLight).intensity = 40 + Math.sin(this.time * 11) * 6 + Math.sin(this.time * 23) * 4;
      for (let i = 0; i < 3; i++) fire.children[i].scale.y = (1 - i * 0.2) * (1 + Math.sin(this.time * (9 + i * 3) + i) * 0.18);
      if (Math.random() < dt * 14) this.fx.spark(fire.position.x + (Math.random() - 0.5) * 0.4, 0.9, fire.position.z + (Math.random() - 0.5) * 0.4, 0xffa040, 0.07, 0.9, 1.8);
    }
    if (this.world?.portal.visible) {
      const portal = this.world.portal;
      portal.children[0].rotation.z += dt * 0.8;
      if (Math.random() < 0.3) this.fx.spark(portal.position.x + (Math.random() - 0.5) * 2.4, 0.4 + Math.random() * 3.2, portal.position.z, 0x9be4ff, 0.12, 0.6, 1.4);
    }
  }

  private frame(t: number): void {
    requestAnimationFrame((n) => this.frame(n));
    const real = (t - this.lastFrame) / 1000 || 0.016;
    const raw = Math.min(0.05, real);
    this.lastFrame = t;
    this.fps += (1 / Math.max(real, 0.001) - this.fps) * 0.05;
    if (!this.started) {
      this.input.endFrame();
      return;
    }
    if (!this.paused) {
      let dt = raw;
      if (this.hitstop > 0) {
        this.hitstop -= raw;
        dt *= 0.06;
      }
      this.time += dt;
      this.save.playSeconds += raw;
      this.updatePlayer(dt);
      this.updateEnemies(dt);
      this.updateProjectiles(dt);
      this.updateAllies(dt);
      this.updateDrops(dt);
      this.fx.update(dt, this.camera, window.innerWidth, window.innerHeight);
      this.updateCamera(dt);
      this.saveTimer += raw;
      if (this.saveTimer > 12) {
        this.saveTimer = 0;
        this.persist();
      }
    }
    this.input.endFrame();
    this.pipeline.render();
  }
}
