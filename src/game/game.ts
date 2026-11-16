// Loop principal: herói, combate, progressão e as ondas da partida (cada zona = 5 ondas, D13).
import * as THREE from "three";
import { computeStats, type FinalStats, type StatBlock } from "../core/stats";
import { addXp, applyUpgrade, draft, draftTiers, rerollCost, rerollsLeft, upgradeStats, type UpgradeTier } from "../core/levelup";
import { generateZone, ObstacleGrid, type Segment, type ZoneLayout } from "../core/worldgen";
import { loadAchievements, loadRecords, loadRun, writeAchievements, writeRun, safeStorage } from "../core/save";
import { AchievementTracker, filterOpen, type KillSource } from "../core/achievements";
import { ACHIEVEMENT_BY_ID, UNLOCK_REWARDS } from "../data/achievements";
import { checkpoint, continueRun, zoneSeed, type RunRng, type RunState } from "../core/run";
import { chooseCard, expireWaveScope, generateMap, roomOf, type MapCard, type MapNodeId } from "../core/runmap";
import {
  canHasten, hasten, healOrbChance, hastenBonus, startWave, stepWave, survivorReward, timeLeft, waveMods, waveReward,
  type WaveMods, type WaveSpawn, type WaveState,
} from "../core/wave";
import { bossGold, hasMapBefore, isBossWave, segmentOf } from "../core/waves";
import { BOSS, RUN_TUNING, SPAWN, TOTAL_WAVES, WAVES_PER_ZONE } from "../data/run";
import { px, techniqueStats, type TechStats } from "../core/techniques";
import { frostModify, IcicleCounter } from "../core/frost";
import { FROST, SHADOW, SHIELD_THROW, TECHNIQUES, VENOM } from "../data/techniques";
import { BOSSES, ENEMIES } from "../data/enemies";
import { HEROES, HERO_ORDER, type AutoAttack, type HeroDef, type StatusSpec } from "../data/heroes";
import { RELICS, RELIC_IDS } from "../data/relics";
import { TUNING } from "../data/tuning";
import { ZONES, ZONE_ORDER, type ZoneDef } from "../data/zones";
import { Audio } from "./audio";
import { Enemy, enemyDef } from "./enemy";
import { Fx } from "./fx";
import { IceWalls, type IceWall } from "./icewall";
import { Rifts, type Rift } from "./rift";
import { RoomHazards } from "./roomhazards";
import { SpellCaster } from "./spells";
import { StatusIcons } from "./status-icons";
import { Input } from "./input";
import { animateRig, disposeRig, flashRig, tintRig, type Rig } from "./models";
import { characterRig } from "./rigs";
import { kickRig, nextShot } from "./chars";
import { Pipeline } from "./render";
import { U } from "./shared";
import { SUN_OFFSET, stepMotes } from "./air";
import { buildWorld, driftSun, fireFlicker, setZoneAtmosphere, type WorldView } from "./world";

export interface GameEvents {
  toast(msg: string, color?: string): void;
  relicChoice(ids: string[], pick: (id: string) => void, title?: string): void;
  /** abriu o mapa da partida; as cartas estão em `Game.mapCards` */
  mapOpen(): void;
  /** abriu (ou mudou) a escolha de melhoria de nível; o estado está em `Game.levelUp` */
  levelUp(): void;
  died(): void;
  zoneChanged(): void;
  /** a ficha da partida mudou (relíquia nova) */
  statusChanged(): void;
  victory(): void;
  /** letreiro grande no meio da tela ("Onda 3", "Onda concluída") */
  banner(title: string, sub?: string): void;
}

/** As 3 cartas de melhoria abertas no fim da onda (run_drafts.lua `checkLevelUp`). */
export interface LevelUpDraft {
  ids: string[];
  tiers: UpgradeTier[];
  /** trocas já feitas neste nível */
  rerolls: number;
  /** "2 de 3" quando vários níveis esperam juntos */
  index: number;
  total: number;
}

/** Em que ponto da onda a partida está. */
export type WavePhase = "walk" | "intro" | "fight" | "cleared" | "portal";

/** aviso no chão antes de um inimigo da onda aparecer (spawner.lua) */
interface SpawnMarker {
  spawn: WaveSpawn;
  boss: boolean;
  x: number; z: number; t: number; dur: number;
  mesh: THREE.Mesh;
}

interface Projectile {
  x: number; z: number; vx: number; vz: number; r: number;
  dmg: number; life: number; friendly: boolean;
  pierce: number; ricochet: number; ricochetDamage: number;
  status?: StatusSpec; mesh: THREE.Mesh; hit: Set<Enemy>; color: number; source: string;
  /** gelo da Frostine; `icicle` = o tiro é pingente */
  ice?: boolean; icicle?: boolean;
  /** empurrão extra no acerto, em fração de TUNING.enemy.knockback (Fan the Hammer) */
  push?: number;
}

/** orbe de cura da onda caído no chão */
interface Drop {
  x: number; z: number; t: number;
  /** some depois de tantos segundos */
  life: number;
  mesh: THREE.Object3D;
}

/** vespa ou abelha aliada da Vesper (Brood e Ninhada) */
interface Bee {
  x: number; z: number; life: number; hitCd: number; rig: Rig; phase: number; sting: number;
  big: boolean; dmg: number; every: number; speed: number; poison: StatusSpec;
}
/** rastro que fere em pulsos ao longo de um segmento (Storm Step) */
interface Trail { x0: number; z0: number; x1: number; z1: number; hw: number; until: number; tick: number; every: number; dmg: number; color: number; mesh: THREE.Mesh }

export interface PlayerState {
  x: number; z: number; facing: number; hp: number;
  rig: Rig | null;
  moveAmt: number; attackAnim: number; attackCd: number;
  techCd: number; techMax: number;
  dashCd: number; dashT: number; dashDx: number; dashDz: number;
  iframes: number; potionCd: number;
  /** Umbra: golpes contam como pelas costas até este instante */
  shadowUntil: number;
  /** Seraph: escudo de luz ativo */
  aegis: { until: number; block: boolean; damage: number; radius: number; heal: number; mesh: THREE.Mesh } | null;
  /** Seraph: arremessos do escudo (cura a cada SHIELD_THROW.healEvery) */
  throws: number;
  /** Vesper: tempo até a próxima abelha da Ninhada */
  nestT: number;
  flash: number; hurtT: number;
  leap: { t: number; dur: number; x0: number; z0: number; x1: number; z1: number } | null;
  rush: { t: number; dur: number; dx: number; dz: number; hit: Set<Enemy>; speed?: number } | null;
}

const UP = new THREE.Vector3(0, 1, 0);
const PROJ_GEO = new THREE.IcosahedronGeometry(1, 0);
const GEM_GEO = new THREE.OctahedronGeometry(1, 0);

const MARKER_GEO = new THREE.RingGeometry(0.35, 0.75, 6);

export class Game {
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  fx: Fx;
  audio = new Audio();
  input: Input;
  events!: GameEvents;

  /** a partida em andamento (core/run.ts) e os fluxos de sorteio dela */
  run!: RunState;
  rng!: RunRng;
  hero!: HeroDef;
  stats!: FinalStats;
  zone!: ZoneDef;
  layout!: ZoneLayout;
  grid!: ObstacleGrid;
  world: WorldView | null = null;

  player: PlayerState = {
    x: 0, z: 0, facing: 0, hp: 1, rig: null, moveAmt: 0, attackAnim: -1, attackCd: 0, techCd: 0, techMax: 1,
    dashCd: 0, dashT: 0, dashDx: 0, dashDz: 0, iframes: 0, potionCd: 0, shadowUntil: 0, aegis: null, throws: 0, nestT: VENOM.broodEvery,
    flash: 0, hurtT: 0, leap: null, rush: null,
  };
  playerAlive = true;
  playerVelX = 0;
  playerVelZ = 0;
  enemies: Enemy[] = [];
  boss: Enemy | null = null;
  bossEngaged = false;
  bossDead = false;
  nearPortal = false;
  /** a onda em andamento (core/wave.ts) e os modificadores dela; null entre as ondas */
  wave: WaveState | null = null;
  mods: WaveMods = waveMods(1, "normal");
  phase: WavePhase = "walk";
  private phaseT = 0;
  /** o trecho (clareira) da onda atual */
  segment!: Segment;
  private markers: SpawnMarker[] = [];
  private ring: THREE.Mesh | null = null;
  private projectiles: Projectile[] = [];
  private drops: Drop[] = [];
  private bees: Bee[] = [];
  private iceWalls = new IceWalls(this.scene);
  private rifts = new Rifts(this.scene);
  /** raios e poças de cura da sala (M20-08) */
  hazards!: RoomHazards;
  private trails: Trail[] = [];
  private icicle = new IcicleCounter();
  /** números da técnica do herói no nível atual (src/core/techniques.ts); null se ainda for a técnica antiga */
  tech: TechStats | null = null;
  /** spells nas teclas 1 e 2 (M6-02) */
  spells = new SpellCaster(this);
  /** ícones de estado sobre os inimigos (M5-05) */
  private statusIcons = new StatusIcons(this.scene);
  private projPool: THREE.Mesh[] = [];
  private projMats = new Map<number, THREE.MeshBasicMaterial>();

  time = 0;
  started = false;
  paused = false;
  private hitstop = 0;
  /** recompensa do chefe, entregue quando o corpo dele some */
  private bossReward: (() => void) | null = null;
  /** escolha de melhoria aberta; o jogo fica pausado pela tela */
  levelUp: LevelUpDraft | null = null;
  private levelUpIndex = 0;
  /** cartas do mapa da partida abertas no fim da onda (run_map.lua); null = fechado */
  mapCards: MapCard[] | null = null;
  /** a carta da próxima onda já foi escolhida (ou não há mapa antes dela) */
  private mapResolved = false;
  /** o santuário de relíquias está com a escolha aberta */
  private shrineOpen = false;
  private aim = new THREE.Vector3();
  private camTarget = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(UP, 0);
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private lastFrame = 0;
  private marker: THREE.Mesh | null = null;
  pipeline!: Pipeline;
  private moteAcc = { v: 0 };
  zoom = 1;
  private proj = new THREE.Vector3();
  private storage = safeStorage();
  /** conquistas e desbloqueios entre partidas (core/achievements.ts) */
  ach = new AchievementTracker(loadAchievements(this.storage),
    { heroes: HERO_ORDER, bosses: Object.keys(BOSSES), enemies: Object.keys(ENEMIES), relics: RELIC_IDS }, loadRecords(this.storage).kills);
  /** de onde veio o golpe em curso (o "ataque básico" de quick_trigger) */
  private hitSource: KillSource = "other";
  fps = 60;

  constructor(private canvas: HTMLCanvasElement, textLayer: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(38, 1, 1, 400);
    this.pipeline = new Pipeline(this.renderer, this.scene, this.camera);
    this.fx = new Fx(this.scene, textLayer);
    this.hazards = new RoomHazards({
      scene: this.scene,
      fx: this.fx,
      player: () => ({ x: this.player.x, z: this.player.z, alive: this.playerAlive }),
      hurt: (n) => this.hurtPlayer(n, "Lightning"),
      heal: (n) => this.heal(n, true),
      maxHp: () => this.stats.maxHp,
      zap: () => this.audio.play("zap"),
    });
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
    this.renderer.setPixelRatio(this.pixelRatio());
    this.renderer.setSize(w, h, false);
    this.pipeline.setSize(w, h, this.renderer.getPixelRatio());
    this.fx.setPointScale(this.pipeline.bufferSize.y / (2 * Math.tan((this.camera.fov * Math.PI) / 360)));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- início / zona
  start(run: RunState, rng: RunRng): void {
    this.run = run;
    this.rng = rng;
    this.hero = HEROES[run.heroId];
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
    this.spells.reset();
    this.player.hp = Math.min(this.stats.maxHp, run.hp ?? this.stats.maxHp);
    this.started = true;
    this.ach.runStart(run.heroId);
    this.saveAchievements();
    this.prepareWave(Math.max(1, run.wave), true);
  }

  /** 0 baixo, 1 médio, 2 alto: sombras, bloom e resolução */
  quality = 2;
  /** escala da resolução interna (resolução adaptativa, ver `adaptResolution`) */
  resScale = 1;
  private resTimer = 0;
  private gpuAvg = 0;

  /** densidade de pixels: a da tela (até o teto da qualidade) vezes a escala adaptativa */
  private pixelRatio(): number {
    const max = Math.min(window.devicePixelRatio, this.quality === 0 ? 1 : TUNING.frame.maxRatio);
    return Math.max(0.5, max * this.resScale);
  }

  /** Mira 60 fps: média do tempo de GPU; acima do teto baixa a resolução interna um degrau, abaixo do piso sobe um degrau. */
  private adaptResolution(dt: number): void {
    const f = TUNING.frame, gpu = this.pipeline.gpuMs;
    if (gpu < 0) return;
    this.gpuAvg += (gpu - this.gpuAvg) * Math.min(1, dt * 4);
    this.resTimer += dt;
    if (this.resTimer < f.every) return;
    this.resTimer = 0;
    const next = this.gpuAvg > f.gpuHigh ? this.resScale - f.step : this.gpuAvg < f.gpuLow ? this.resScale + f.step / 2 : this.resScale;
    const clamped = Math.min(1, Math.max(f.minScale, next));
    if (Math.abs(clamped - this.resScale) > 1e-3) {
      this.resScale = clamped;
      this.resize();
    }
  }

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
  }

  recompute(): void {
    const sources: StatBlock[] = [this.hero.stats];
    for (const id of this.run.relics) if (RELICS[id]) sources.push(RELICS[id].stats);
    sources.push(upgradeStats(this.run));
    this.stats = computeStats(sources);
    const tid = this.hero.technique.id;
    this.tech = TECHNIQUES[tid]
      ? techniqueStats(tid, 1, { cooldownMult: this.stats.cooldownMult, area: this.stats.area, range: this.stats.range, autoDamage: this.hero.auto.damage })
      : null;
    this.spells.refresh();
    this.player.hp = Math.min(this.player.hp, this.stats.maxHp);
  }

  /**
   * Checkpoint da partida (run_save.lua): a partida inteira e os fluxos de sorteio, gravados antes de cada onda;
   * continuar recomeça aquela onda, na entrada do trecho dela.
   */
  saveCheckpoint(): void {
    if (!this.run) return;
    this.run.hp = this.playerAlive ? this.player.hp : null;
    writeRun(this.storage, checkpoint(this.run, this.rng, Math.max(1, this.run.wave)));
  }

  saveAchievements(): void {
    writeAchievements(this.storage, this.ach.state);
  }

  /** Relíquias que podem entrar no sorteio: as abertas (unlocks.lua `filter`) e que o herói ainda não tem. */
  private relicPool(): string[] {
    return filterOpen(this.ach.state, "relic", RELIC_IDS, TUNING.unlockAll).filter((id) => !this.run.relics.includes(id));
  }

  /** Avisa as conquistas liberadas e grava. */
  private flushAchievements(): void {
    const news = this.ach.take();
    if (!news.length) return;
    for (const id of news) {
      const a = ACHIEVEMENT_BY_ID[id];
      const reward = (UNLOCK_REWARDS[id] ?? []).filter(([k]) => k === "hero").map(([, h]) => HEROES[h]?.name).filter(Boolean);
      this.events.toast(`Achievement: ${a.name}${reward.length ? ` · unlocks ${reward.join(", ")}` : ""}`, "#ffd34d");
    }
    this.audio.play("rare");
    this.saveAchievements();
  }

  /** A zona de uma onda: 5 ondas por zona, na ordem do reino; o modo sem fim recomeça o ciclo com mapas novos. */
  static zoneOfWave(wave: number): { zoneId: string; visit: number; index: number } {
    const seg = segmentOf(wave) - 1;
    return { zoneId: ZONE_ORDER[seg % ZONE_ORDER.length], visit: Math.floor(seg / ZONE_ORDER.length), index: (wave - 1) % WAVES_PER_ZONE };
  }

  /**
   * Antes de cada onda: monta a zona se ela mudou, põe o herói no começo do trecho e grava o checkpoint.
   * A onda começa quando o herói entra na clareira (Q2: como no Dungeon Reign, mas no mapa aberto).
   */
  prepareWave(wave: number, fresh = false): void {
    // a relíquia do chefe nunca se perde: se o corpo ainda não sumiu, a escolha abre agora
    const reward = this.bossReward;
    this.bossReward = null;
    reward?.();
    this.hazards.clear();
    const run = this.run;
    run.wave = wave;
    if (wave > TOTAL_WAVES) run.endless = true;
    const z = Game.zoneOfWave(wave);
    const zoneChanged = fresh || !this.world || this.zone.id !== z.zoneId || this.layout.seed !== zoneSeed(run.seed, z.zoneId, z.visit);
    if (zoneChanged) this.enterZone(z.zoneId, z.visit);
    this.clearWave();
    this.segment = this.layout.segments[z.index];
    this.wave = null;
    this.mods = waveMods(wave, run.difficultyId, roomOf(run));
    this.mapCards = null;
    this.mapResolved = false;
    this.shrineOpen = false;
    this.phase = "walk";
    this.phaseT = 0;
    this.bossEngaged = false;
    this.bossDead = false;
    this.nearPortal = false;
    if (this.world) this.world.portal.visible = false;
    const p = this.player;
    // na primeira onda da zona o herói começa na fogueira; nas outras, na entrada do trecho
    if (zoneChanged) {
      const at = z.index === 0 ? this.layout.spawn : this.segment.entry;
      p.x = at.x;
      p.z = at.z;
      this.camTarget.set(p.x, 0, p.z);
    }
    this.showRing(false);
    this.saveCheckpoint();
    this.events.zoneChanged();
  }

  private enterZone(zoneId: string, visit: number): void {
    const zone = ZONES[zoneId] ?? ZONES.bosque;
    this.zone = zone;
    this.clearZone();
    const seed = zoneSeed(this.run.seed, zone.id, visit);
    this.layout = generateZone(zone, seed);
    this.grid = new ObstacleGrid(this.layout.obstacles);
    this.world = buildWorld(this.scene, zone, this.layout);
    this.pipeline.setGrade(zone);
    this.hemi.color.set(zone.ambient);
    this.hemi.groundColor.set(zone.ground[2]);
    this.hemi.intensity = zone.ambientIntensity;
    this.sun.color.set(zone.sun);
    this.sun.intensity = zone.sunIntensity;
    setZoneAtmosphere(this.scene, zone);

    this.boss = null;
    this.bossEngaged = false;
    this.bossDead = false;
    this.bossReward = null;

    const p = this.player;
    p.x = this.layout.spawn.x;
    p.z = this.layout.spawn.z;
    p.leap = p.rush = null;
    this.endAegis(false);
    p.shadowUntil = 0;
    p.dashT = 0;
    this.playerAlive = true;
    this.camTarget.set(p.x, 0, p.z);
  }

  private clearZone(): void {
    this.clearWave();
    this.ring?.removeFromParent();
    this.ring = null;
    for (const e of this.enemies) e.dispose();
    this.enemies.length = 0;
    for (const pr of this.projectiles) this.freeProjectile(pr);
    this.projectiles.length = 0;
    this.spells.clear();
    this.statusIcons.clear();
    for (const d of this.drops) d.mesh.removeFromParent();
    this.drops.length = 0;
    for (const b of this.bees) disposeRig(b.rig);
    this.bees.length = 0;
    this.iceWalls.clear();
    this.rifts.clear();
    this.hazards.clear();
    for (const t of this.trails) this.disposeTrail(t);
    this.trails.length = 0;
    this.fx.clear();
    this.world?.dispose();
    this.world = null;
    this.boss = null;
  }

  spawnEnemy(id: string, wave: number, x: number, z: number,
    opts: { champion?: boolean; summoned?: boolean; child?: boolean; aggro?: boolean } = {}): Enemy {
    const e = new Enemy(this, enemyDef(id), wave, x, z, opts);
    if (opts.aggro) {
      e.aggro = true;
      e.hunter = true;
    }
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
      pierce: 0, ricochet: 0, ricochetDamage: 1, color, source: "projectile" });
  }

  private firePlayer(angle: number, auto: AutoAttack, mult: number, rangeMult = 1): void {
    const p = this.player;
    const speed = auto.speed ?? 24;
    const range = auto.range * this.stats.range * rangeMult;
    const ice = this.hero.frost === true;
    // Pingente (Frostine): o tiro depois de 3 acertos seguidos no mesmo alvo sai maior e x3
    const icicle = ice && this.icicle.take();
    this.addProjectile({
      x: p.x + Math.sin(angle) * 0.7, z: p.z + Math.cos(angle) * 0.7, vx: Math.sin(angle) * speed, vz: Math.cos(angle) * speed,
      r: 0.24 * (auto.size ?? 1) * (icicle ? 1.9 : 1), dmg: mult * (icicle ? FROST.icicleMult : 1), life: range / speed, friendly: true,
      pierce: auto.pierce ?? 0, ricochet: auto.ricochet ?? 0, ricochetDamage: auto.ricochetDamage ?? 1,
      status: auto.status, color: icicle ? 0xf2fbff : auto.color, source: "auto", ice, icicle,
    });
  }

  private updateProjectiles(dt: number): void {
    const p = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      // Time Rift: tiro inimigo dentro da fenda fica parado no ar (e não envelhece)
      const held = !pr.friendly && this.rifts.list.length > 0 && this.rifts.inside(pr.x, pr.z);
      if (!held) {
        pr.life -= dt;
        pr.x += pr.vx * dt;
        pr.z += pr.vz * dt;
      }
      let dead = pr.life <= 0 || this.grid.hits(pr.x, pr.z, pr.r * 0.5);
      // Rune Traps (D-575): o tiro do ataque básico estoura a runa armada que cruza
      if (!dead && pr.friendly && pr.source === "auto" && this.spells.hasRunes) {
        this.spells.shootRunes((x, z, trig) => (x - pr.x) ** 2 + (z - pr.z) ** 2 <= (pr.r + trig) ** 2);
      }
      if (!dead && pr.friendly) {
        for (const e of this.enemies) {
          if (e.dead || pr.hit.has(e)) continue;
          const rr = e.radius + pr.r + 0.25;
          if ((e.x - pr.x) ** 2 + (e.z - pr.z) ** 2 > rr * rr) continue;
          const first = pr.hit.size === 0;
          pr.hit.add(e);
          if (pr.ice && first) {
            this.icicle.onHit(e, pr.icicle === true);
            if (pr.icicle) {
              this.fx.burst(e.x, 1.2, e.z, 0xe8f8ff, 18, 7, 0.14, 0.45, 6);
              this.fx.text(e.x, 2.4, e.z, "Icicle", "frost");
            }
          }
          this.hitSource = pr.source === "auto" ? "auto" : "other";
          this.hitEnemy(e, pr.dmg, pr.status, { ice: pr.ice, frostStacks: pr.icicle && first ? FROST.icicleStacks : undefined });
          this.hitSource = "other";
          if (pr.push && !e.isBoss && !e.dead) {
            const sp = Math.hypot(pr.vx, pr.vz) || 1;
            e.kx += (pr.vx / sp) * pr.push * TUNING.enemy.knockback;
            e.kz += (pr.vz / sp) * pr.push * TUNING.enemy.knockback;
          }
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
      } else if (!dead && this.iceWalls.list.length && this.iceWalls.blocks(pr.x, pr.z, pr.r)) {
        dead = true; // tiro inimigo quebra na parede de gelo
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
  hitEnemy(e: Enemy, mult: number, status?: StatusSpec, hit?: { ice?: boolean; frostStacks?: number; crit?: boolean; noKnock?: boolean }): void {
    if (e.dead) return;
    const s = this.stats;
    const now = this.time;
    const crit = hit?.crit === true || Math.random() < s.critChance;
    let amount = s.damage * mult * (0.9 + Math.random() * 0.2);
    const back = this.hero.auto.backstab !== undefined && this.isBackstab(e);
    if (back) amount *= 1 + this.hero.auto.backstab!;
    let deepChill = false;
    if (this.hero.frost) {
      // Frostine: Estilhaçar, Frio profundo e Quebradiço (src/core/frost.ts); o congelado daqui é o atordoamento
      e.frost.frozenUntil = e.stunUntil;
      const r = frostModify(e.frost, amount, { ice: hit?.ice === true, stacks: hit?.frostStacks }, now);
      amount = r.amount;
      deepChill = r.deepChill;
      if (r.shatter) {
        e.stunUntil = 0;
        this.fx.burst(e.x, 1, e.z, 0xdff6ff, 26, 9, 0.16, 0.55, 10);
        this.fx.text(e.x, 2.6, e.z, "Shattered", "frost");
        this.fx.addShake(0.12);
      }
      if (r.brittle) {
        this.fx.burst(e.x, 1.4, e.z, 0xe6f8ff, 30, 6, 0.14, 0.7, 2);
        this.fx.text(e.x, 3, e.z, "Brittle", "frost");
      }
    }
    if (crit) amount *= s.critDamage;
    // Brittle Chill (Iceball): inimigo com Slow recebe dano extra (damage.lua §37)
    if (now < e.slowUntil) amount *= 1 + this.spells.brittle;
    this.damageEnemy(e, amount, { crit, noKnock: hit?.noKnock });
    if (status && !e.dead && (status.chance === undefined || Math.random() < status.chance)) this.applyStatus(e, status, amount);
    if (back && e.dead) this.heal(s.maxHp * SHADOW.backstabKillHeal, true); // Umbra: matar pelas costas cura
    if (deepChill && !e.dead) {
      this.applyStatus(e, { kind: "stun", power: 1, duration: FROST.chillFreeze }, amount);
      this.fx.burst(e.x, 1, e.z, 0x9fdcff, 12, 4, 0.12, 0.5, 2);
    }
  }

  /** Umbra: o inimigo está atordoado, se afastando dela, ou ela saiu do Shadow Step há menos de 2 s (Auto.isBackstab). */
  private isBackstab(e: Enemy): boolean {
    const p = this.player;
    if (this.time < e.stunUntil || this.time < p.shadowUntil) return true;
    if (e.vx * e.vx + e.vz * e.vz < 0.5) return false;
    return e.vx * (e.x - p.x) + e.vz * (e.z - p.z) > 0;
  }

  applyStatus(e: Enemy, st: StatusSpec, hitDamage: number): void {
    const now = this.time;
    const potency = this.stats.status;
    if (st.kind === "slow") {
      e.slowUntil = Math.max(e.slowUntil, now + st.duration);
      const v = Math.min(0.85, st.power * Math.min(1.6, potency));
      // chefes: o gelo da Frostine deixa lento até FROST.bossSlowCap; o resto vale 40%
      e.slowPower = e.isBoss ? (this.hero.frost ? Math.min(FROST.bossSlowCap, v) : v * 0.4) : v;
    } else if (st.kind === "stun") {
      e.stunUntil = Math.max(e.stunUntil, now + st.duration * (e.isBoss ? 0.3 : 1));
      e.windupT = -1;
    } else {
      const max = st.maxStacks ?? 1;
      const dot = { kind: st.kind, dps: hitDamage * st.power * potency, until: now + st.duration };
      const same = e.dots.filter((d) => d.kind === st.kind && !d.spell);
      if (same.length >= max) {
        same.sort((a, b) => a.until - b.until);
        Object.assign(same[0], dot);
      } else e.dots.push(dot);
    }
  }

  damageEnemy(e: Enemy, amount: number, opts: { crit?: boolean; dot?: string; noKnock?: boolean } = {}): void {
    if (e.dead) return;
    amount = Math.max(1, Math.round(amount));
    this.run.statistics.damage += Math.min(amount, Math.max(0, e.hp));
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
      if (!e.isBoss && !opts.noKnock) {
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
    if (e.hp <= 0) this.killEnemy(e, opts.dot ? "dot" : this.hitSource);
  }

  private killEnemy(e: Enemy, source: KillSource = "other"): void {
    e.dead = true;
    e.hp = 0;
    this.spells.onKill(e);
    this.ach.enemyKilled({ key: e, id: e.boss?.id ?? e.def!.id, boss: e.isBoss, champion: e.champion, source,
      elapsed: this.run.statistics.elapsed, noReward: e.summoned });
    const color = e.boss?.color ?? e.def!.color;
    this.fx.burst(e.x, e.rig.height * 0.5, e.z, color, e.isBoss ? 80 : 14, e.isBoss ? 12 : 6, e.isBoss ? 0.3 : 0.18, e.isBoss ? 1.2 : 0.6);
    this.audio.play(e.isBoss ? "boss" : "kill");
    this.run.statistics.kills++;
    if (this.stats.lifeOnKill > 0 && this.playerAlive) this.heal(this.stats.lifeOnKill, false);
    if (e.xp > 0) this.gainXp(e.xp);
    const split = e.def?.splitInto;
    if (split) {
      for (let i = 0; i < split.count; i++) {
        const a = Math.random() * Math.PI * 2;
        this.spawnEnemy(split.id, e.level, e.x + Math.cos(a) * 0.8, e.z + Math.sin(a) * 0.8, { summoned: true, child: true, aggro: true });
      }
    }
    if (!e.summoned) this.rollHealOrb(e);
    if (e.isBoss) this.onBossKilled(e);
  }

  /** Orbe de cura da onda (wave_system.lua): chance por tipo de inimigo, com teto por onda. */
  private rollHealOrb(e: Enemy): void {
    const w = this.wave;
    const O = RUN_TUNING.healOrb;
    if (w && !w.complete && w.healOrbs < O.maxPerWave && e.def) {
      const c = healOrbChance({ id: e.def.id, category: e.def.category, champion: e.champion, boss: e.isBoss, summoned: e.summoned });
      if (c > 0 && Math.random() < c) {
        w.healOrbs++;
        this.addDrop({ x: e.x, z: e.z, t: 0, life: O.life });
      }
    }
  }

  private addDrop(d: Omit<Drop, "mesh">): void {
    const g = new THREE.Group();
    const color = 0xff4a5a;
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.1, flatShading: true });
    const core = new THREE.Mesh(GEM_GEO, mat);
    core.scale.setScalar(0.22);
    core.castShadow = true;
    g.add(core);
    g.position.set(d.x, 0.6, d.z);
    this.scene.add(g);
    this.drops.push({ ...d, mesh: g });
  }

  private updateDrops(dt: number): void {
    const p = this.player;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.t += dt;
      if (d.t >= d.life) {
        d.mesh.removeFromParent();
        this.drops.splice(i, 1);
        continue;
      }
      const core = d.mesh.children[0];
      core.rotation.y += dt * 2.2;
      core.position.y = Math.sin(d.t * 3) * 0.12 + Math.max(0, 1 - d.t * 3) * 1.2;
      if (d.t < 0.35 || !this.playerAlive) continue;
      const dist = Math.hypot(p.x - d.x, p.z - d.z);
      if (dist < 5 && p.hp < this.stats.maxHp) {
        // orbes de cura são atraídos
        d.x += ((p.x - d.x) / dist) * 12 * dt;
        d.z += ((p.z - d.z) / dist) * 12 * dt;
        d.mesh.position.set(d.x, 0.6, d.z);
      }
      if (dist > TUNING.hero.pickupRadius) continue;
      if (p.hp >= this.stats.maxHp) continue;
      this.heal(this.stats.maxHp * RUN_TUNING.healOrb.heal, true, true);
      d.mesh.removeFromParent();
      this.drops.splice(i, 1);
    }
  }

  addRelic(id: string): void {
    if (this.run.relics.includes(id) || !RELICS[id]) return;
    this.run.relics.push(id);
    this.run.relicVersion += 1;
    this.ach.relicFound(id);
    this.recompute();
    this.events.toast(`Relic: ${RELICS[id].name}`, "#ffc83d");
    this.audio.play("rare");
    this.events.statusChanged();
  }

  /** O combate da onda está correndo: cura e regeneração valem `RUN_TUNING.combatHealMult` (damage.lua). */
  get inCombat(): boolean {
    return !!this.wave && this.wave.started && !this.wave.complete;
  }

  /** `full`: o orbe de cura não sofre o corte do combate. */
  heal(amount: number, show: boolean, full = false): void {
    const p = this.player;
    const before = p.hp;
    if (this.inCombat && !full) amount *= RUN_TUNING.combatHealMult;
    p.hp = Math.min(this.stats.maxHp, p.hp + amount);
    this.run.statistics.healed += p.hp - before;
    this.ach.healed(this.run.statistics.healed);
    if (show && p.hp - before >= 1) {
      this.fx.text(p.x, 2.6, p.z, "+" + Math.round(p.hp - before), "heal");
      this.fx.burst(p.x, 1.2, p.z, 0x5fd35f, 8, 3, 0.12, 0.5, 2);
    }
  }

  /** xp.lua `addXp`: uma passagem de nível por ganho; a melhoria espera o fim da onda (R17). */
  gainXp(amount: number): void {
    const s = this.run;
    if (addXp(s, amount, this.stats.xp)) {
      const p = this.player;
      this.fx.shockwave(p.x, p.z, 6, 0xffe066, 0.6);
      this.fx.burst(p.x, 1.5, p.z, 0xffe066, 40, 8, 0.16, 0.9, 6);
      this.fx.text(p.x, 3.2, p.z, `LEVEL ${s.level}`, "level");
      this.audio.play("level");
      this.events.toast(`Level ${s.level}! Pick your upgrade at the end of the wave`, "#ffe066");
    }
  }

  /** Sorteia as 3 cartas no fluxo `levelup`, com a raridade de cada uma. */
  private openLevelUp(): void {
    const run = this.run;
    const rng = this.rng.get("levelup");
    const ids = draft(run, rng);
    if (ids.length === 0) {
      run.pendingLevelUps = 0;
      return;
    }
    this.levelUpIndex++;
    this.levelUp = {
      ids, tiers: draftTiers(run, rng, ids), rerolls: 0,
      index: this.levelUpIndex, total: this.levelUpIndex - 1 + run.pendingLevelUps,
    };
    this.events.levelUp();
  }

  /** run_drafts.lua `rerollLevelUp`: paga ouro e sorteia as 3 de novo (raridades também). */
  rerollLevelUp(): boolean {
    const L = this.levelUp;
    if (!L || rerollsLeft(L.rerolls) <= 0) return false;
    const cost = rerollCost(this.run);
    if (this.run.gold < cost) return false;
    this.run.gold -= cost;
    this.run.statistics.goldSpent += cost;
    const rng = this.rng.get("levelup");
    L.ids = draft(this.run, rng);
    L.tiers = draftTiers(this.run, rng, L.ids);
    L.rerolls++;
    this.audio.play("pickup");
    this.events.levelUp();
    return true;
  }

  /** run_drafts.lua `chooseUpgrade`; a vida máxima sobe junto (`refreshMaxHp`), Vitality cura tudo. */
  chooseUpgrade(index: number): void {
    const L = this.levelUp;
    const id = L?.ids[index];
    if (!L || !id) return;
    const before = this.stats.maxHp;
    const u = applyUpgrade(this.run, id, L.tiers[index]);
    this.levelUp = null;
    this.recompute();
    const p = this.player;
    if (u.fullHeal) p.hp = this.stats.maxHp;
    else if (this.stats.maxHp > before) p.hp += this.stats.maxHp - before;
    p.hp = Math.min(p.hp, this.stats.maxHp);
    this.fx.burst(p.x, 1.5, p.z, 0xffe066, 24, 6, 0.14, 0.7, 4);
    if (this.run.pendingLevelUps > 0) this.openLevelUp();
    else this.levelUpIndex = 0;
  }

  hurtPlayer(amount: number, source: string): void {
    void source;
    const p = this.player;
    if (!this.playerAlive || p.iframes > 0) return;
    if (Math.random() < this.stats.dodge) {
      this.fx.text(p.x, 2.6, p.z, "Dodge", "dodge");
      p.iframes = 0.15;
      this.ach.dodge();
      return;
    }
    if (p.aegis?.block) {
      // Aegis: o escudo come o golpe inteiro
      p.aegis.block = false;
      p.iframes = 0.2;
      this.fx.text(p.x, 2.6, p.z, "Blocked", "frost");
      this.fx.burst(p.x, 1.2, p.z, 0xffe9a8, 24, 7, 0.14, 0.4, 2);
      this.fx.flashLight(p.x, 1.5, p.z, 0xffe9a8, 1.8, 0.2);
      this.audio.play("crit");
      return;
    }
    amount *= this.stats.damageTaken;
    if (this.hero.maxHitFraction) amount = Math.min(amount, this.stats.maxHp * this.hero.maxHitFraction);
    amount = Math.max(1, Math.round(amount));
    this.run.statistics.damageTaken += Math.min(amount, p.hp);
    p.hp -= amount;
    this.ach.playerHit(amount, Math.max(0, p.hp) / this.stats.maxHp);
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
      p.leap = p.rush = null;
      this.endAegis(false);
      this.run.killedBy = source;
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
    const s = this.run;
    const gold = Math.floor(bossGold(s.wave) * this.mods.reward * this.stats.gold);
    s.gold += gold;
    s.statistics.goldEarned += gold;
    // a emboscada dá a relíquia de risco (falta, M12), não a escolha de chefe
    if (e.ambush) return;
    const pool = this.relicPool();
    this.rng.get("relics").shuffle(pool);
    const offer = pool.slice(0, BOSS.relicChoices);
    // a escolha de relíquia só depois que o corpo do chefe se desfaz (a escolha pausa o jogo)
    this.bossReward = () => {
      if (offer.length) this.events.relicChoice(offer, (id) => {
        this.addRelic(id);
        // escolhida já na onda seguinte (entrou no portal antes): o checkpoint dela precisa da relíquia
        if (this.phase === "walk") this.saveCheckpoint();
      });
    };
  }

  // ---------------------------------------------------------------- ondas (wave_system.lua, run_controller.lua)

  /** Avança a fase da onda: caminhar até a clareira, letreiro, luta, onda concluída, portal. */
  private updateWave(dt: number, raw: number): void {
    const p = this.player;
    const sg = this.segment;
    if (!sg) return;
    this.phaseT += raw;
    if (this.ring) {
      const m = this.ring.material as THREE.MeshBasicMaterial;
      m.opacity = this.phase === "walk" ? 0.28 + Math.sin(this.time * 3) * 0.12 : this.phase === "intro" || this.phase === "fight" ? 0.7 : 0;
      this.ring.visible = m.opacity > 0;
    }
    if (this.phase === "walk") {
      if (this.playerAlive && Math.hypot(p.x - sg.x, p.z - sg.z) < sg.r - 1.5) this.beginWave();
      return;
    }
    if (this.phase === "intro") {
      if (this.phaseT >= RUN_TUNING.introTime) {
        this.phase = "fight";
        this.phaseT = 0;
        this.wave!.started = true;
        this.hazards.start(this.mods.room, this.segment, this.run.wave);
        if (this.wave!.isBossWave) this.queueBoss();
      }
      return;
    }
    if (this.phase === "fight") {
      const w = this.wave!;
      this.updateMarkers(dt);
      if (!this.playerAlive) return;
      let alive = this.markers.length;
      for (const e of this.enemies) if (!e.dead) alive++;
      const bossAlive = this.markers.some((m) => m.boss) || (!!this.boss && !this.boss.dead);
      const step = stepWave(w, dt, { alive, bossAlive }, this.rng.get("spawns"));
      for (const sp of step.spawns) this.queueSpawn(sp);
      if (step.ambush) this.queueAmbush();
      if (step.completed) this.completeWave();
      return;
    }
    // depois do chefe, o portal (e a vitória) só abrem com a relíquia já entregue: as telas não se atropelam
    if (this.phase === "cleared" && this.phaseT >= RUN_TUNING.clearedTime && !this.bossReward) {
      // R17: os níveis ganhos na onda viram escolhas agora, um de cada vez
      if (this.levelUp) return;
      if (this.run.pendingLevelUps > 0 && this.playerAlive) {
        this.openLevelUp();
        if (this.levelUp) return;
      }
      // R19/R20: depois do nível, o mapa da onda seguinte (a maldição que continua pula o mapa)
      if (!this.mapResolved && this.playerAlive) {
        if (this.mapCards || this.shrineOpen) return;
        if (this.openMap()) return;
      }
      if (isBossWave(this.run.wave)) this.openPortal();
      else this.prepareWave(this.run.wave + 1);
    }
  }

  /** O herói entrou na clareira: letreiro "Onda N" e a clareira fecha. */
  private beginWave(): void {
    const n = this.run.wave;
    this.wave = startWave(n, this.rng.get("champions"), (id) => id in ENEMIES, this.mods);
    this.ach.waveStart(n);
    this.phase = "intro";
    this.phaseT = 0;
    this.showRing(true);
    const boss = this.wave.isBossWave;
    const room = this.mods.room;
    const sub = boss ? `${BOSSES[this.zone.boss].name} approaches` : room ? `${room.name}` : this.zone.name;
    this.events.banner(`Wave ${n}${n <= TOTAL_WAVES ? ` / ${TOTAL_WAVES}` : ""}`, sub);
    this.audio.play(boss ? "boss" : "level");
  }

  private hastenWave(): void {
    const w = this.wave!;
    const bonus = hastenBonus(w);
    if (!hasten(w)) return;
    this.events.toast(`Rushed wave: +${Math.round(bonus * 100)}% reward`, "#ffc83d");
    this.audio.play("dash");
  }

  /** spawner.lua `edgePoint`: um ponto na borda da clareira, longe do herói (16 tentativas, fica o mais longe). */
  private edgePoint(): { x: number; z: number } {
    const sg = this.segment, p = this.player;
    const min = SPAWN.minDistancePx * TUNING.enemy.pxToUnit;
    let best = { x: sg.x, z: sg.z }, bestD = -1;
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = sg.r - 1.2 - Math.random() * 1.5;
      const x = sg.x + Math.cos(a) * r, z = sg.z + Math.sin(a) * r;
      const d = Math.hypot(x - p.x, z - p.z);
      if (d >= min) return { x, z };
      if (d > bestD) {
        best = { x, z };
        bestD = d;
      }
    }
    return best;
  }

  private queueSpawn(spawn: WaveSpawn, boss = false): void {
    const at = boss ? this.bossPoint() : this.edgePoint();
    const mesh = new THREE.Mesh(MARKER_GEO, new THREE.MeshBasicMaterial({
      color: boss ? 0xff5a3a : spawn.champion ? 0xffc83d : 0xb06aff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false,
    }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(at.x, 0.06, at.z);
    mesh.scale.setScalar(boss ? 3 : spawn.champion ? 1.4 : 1);
    this.scene.add(mesh);
    this.markers.push({ spawn, boss, x: at.x, z: at.z, t: 0, dur: boss ? SPAWN.bossTelegraph : SPAWN.telegraph, mesh });
  }

  /** spawner.lua `queueBoss`: o chefe entra do lado oposto ao herói na arena. */
  private bossPoint(): { x: number; z: number } {
    const sg = this.segment, p = this.player;
    const dx = sg.x - p.x, dz = sg.z - p.z, d = Math.hypot(dx, dz) || 1;
    const r = sg.r * 0.55;
    return { x: sg.x + (dx / d) * r, z: sg.z + (dz / d) * r };
  }

  private queueBoss(): void {
    this.queueSpawn({ id: this.zone.boss, champion: false }, true);
  }

  /**
   * §7.9 Emboscada: um chefe enfraquecido entra na onda normal. Lá ele sai do saco dos 13; aqui, de um dos 4 chefes
   * que não é o da zona (o da zona fica para a arena), no fluxo `bosses`.
   */
  private queueAmbush(): void {
    const pool = ZONE_ORDER.map((z) => ZONES[z].boss).filter((b) => b !== this.zone.boss && BOSSES[b]);
    const id = this.rng.get("bosses").pick(pool);
    this.queueSpawn({ id, champion: false }, true);
    this.events.toast(`Boss Ambush: ${BOSSES[id].name}!`, "#ff7a5a");
  }

  private updateMarkers(dt: number): void {
    for (let i = this.markers.length - 1; i >= 0; i--) {
      const m = this.markers[i];
      m.t += dt;
      const k = Math.min(1, m.t / m.dur);
      const mat = m.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.25 + k * 0.6;
      m.mesh.rotation.z += dt * 3;
      if (Math.random() < dt * 20) this.fx.spark(m.x + (Math.random() - 0.5), 0.2, m.z + (Math.random() - 0.5), mat.color.getHex(), 0.1, 0.4, 2);
      if (m.t < m.dur) continue;
      m.mesh.removeFromParent();
      mat.dispose();
      this.markers.splice(i, 1);
      if (m.boss) {
        const ambush = this.wave?.ambush ?? null;
        const final = !ambush && this.run.wave === BOSS.final.wave;
        const e = new Enemy(this, BOSSES[m.spawn.id], this.run.wave, m.x, m.z, { final, ambush });
        this.ach.bossSpawned(e, this.run.statistics.elapsed);
        e.hunter = true;
        this.boss = e;
        this.enemies.push(e);
        e.setAggro(this);
      } else {
        const e = this.spawnEnemy(m.spawn.id, this.run.wave, m.x, m.z, { champion: m.spawn.champion, aggro: true });
        e.cd = Math.max(e.cd, 0.5);
      }
      this.fx.burst(m.x, 0.6, m.z, mat.color.getHex(), m.boss ? 40 : 10, m.boss ? 8 : 4, 0.14, 0.4);
    }
  }

  /** wave_system.lua `complete`: recompensa dos sobreviventes e da onda, quem sobra some, cura do chefe. */
  private completeWave(): void {
    const w = this.wave!;
    this.hazards.stop();
    const run = this.run;
    let gold = 0, xp = 0, survivors = 0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.def && !e.summoned) {
        const r = survivorReward(e.def, e.champion, this.mods, this.stats.gold);
        gold += r.gold;
        xp += r.xp;
        survivors++;
      }
      e.dead = true;
      e.remove = true;
      this.fx.burst(e.x, 0.8, e.z, 0x6a5a8a, 8, 3, 0.14, 0.5);
    }
    for (const m of this.markers) m.mesh.removeFromParent();
    this.markers.length = 0;
    for (const pr of this.projectiles) if (!pr.friendly) pr.life = 0;
    for (const d of this.drops) d.mesh.removeFromParent();
    this.drops.length = 0;
    // D-159: vencer um chefe (da arena ou da emboscada) cura 20%
    if (((w.isBossWave && w.bossesDefeated) || w.ambushSpawned) && this.playerAlive) {
      const amount = Math.min(this.stats.maxHp - this.player.hp, this.stats.maxHp * BOSS.healPct);
      this.heal(amount, true, true);
    }
    const r = waveReward(w, this.mods, this.stats.gold);
    gold += r.gold;
    run.gold += gold;
    run.statistics.goldEarned += gold;
    this.gainXp(xp + r.xp);
    if (w.isBossWave && w.bossesDefeated && run.wave === TOTAL_WAVES) {
      run.victory = true;
      this.ach.victory(run);
    }
    this.ach.waveComplete({ wave: run.wave, bossWave: w.isBossWave, gameOver: !this.playerAlive, gold: run.gold });
    this.saveAchievements();
    // §6: a sala vale só para esta onda; a maldição segue para a próxima, que fica sem mapa
    if (expireWaveScope(run)) this.mapResolved = true;
    this.phase = "cleared";
    this.phaseT = 0;
    this.showRing(false);
    const extra = w.clearedEarly ? ` · ${Math.ceil(w.timeSaved)} s early` : "";
    this.events.banner("Wave cleared", `+${gold} gold · +${Math.round((xp + r.xp) * this.stats.xp)} XP${survivors ? ` · ${survivors} fled` : ""}${extra}`);
    this.audio.play("pickup");
  }

  // ---------------------------------------------------------------- mapa da partida (run_map.lua)

  /** Cartas que dependem de sistema que ainda não existe aqui: pacto (M12), evento (M12) e loja (M7). */
  static readonly MAP_DISABLED: ReadonlySet<MapNodeId> = new Set<MapNodeId>(["pact", "event", "shop"]);

  /** Abre o mapa da onda seguinte, se houver; devolve false quando não há mapa (a onda segue direto). */
  private openMap(): boolean {
    const run = this.run;
    const next = run.wave + 1;
    if (run.curseContinues || !hasMapBefore(next)) {
      this.mapResolved = true;
      return false;
    }
    const shrine = this.relicPool().length > 0;
    this.mapCards = generateMap(this.rng.get("map"), next, { disabled: Game.MAP_DISABLED, shrine });
    this.events.mapOpen();
    return true;
  }

  /** run_map_flow.lua `chooseMapCard`: a sala vale para a onda seguinte; o santuário abre 1 de 3 relíquias. */
  chooseMapCard(index: number): void {
    const card = this.mapCards?.[index];
    if (!card) return;
    this.mapCards = null;
    const step = chooseCard(this.run, card);
    this.audio.play("pickup");
    if (step === "relic") {
      const pool = this.relicPool();
      this.rng.get("relics").shuffle(pool);
      const offer = pool.slice(0, BOSS.relicChoices);
      this.shrineOpen = true;
      this.events.relicChoice(offer, (id) => {
        this.addRelic(id);
        this.shrineOpen = false;
        this.mapResolved = true;
      }, "Relic Shrine");
      return;
    }
    this.mapResolved = true;
  }

  /** Depois do chefe da zona: o portal abre no meio da arena e leva à próxima zona (onda seguinte). */
  private openPortal(): void {
    this.phase = "portal";
    if (this.world) {
      this.world.portal.visible = true;
      this.world.portal.position.set(this.segment.x, 0, this.segment.z);
    }
    if (this.run.victory && this.run.wave === TOTAL_WAVES) this.events.victory();
    else this.events.toast("The portal opened: E to go on to the next zone", "#9be4ff");
  }

  /** Tira da cena o que é da onda (avisos de nascimento); os inimigos saem com a zona ou no fim da onda. */
  private clearWave(): void {
    this.levelUp = null;
    this.levelUpIndex = 0;
    for (const m of this.markers) m.mesh.removeFromParent();
    this.markers.length = 0;
  }

  /** O círculo da clareira: pulsa enquanto espera o herói, fica firme durante a onda. */
  private showRing(_closed: boolean): void {
    if (!this.ring) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
      this.ring = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 96), mat);
      this.ring.rotation.x = -Math.PI / 2;
      this.ring.renderOrder = 9;
      this.scene.add(this.ring);
    }
    const sg = this.segment;
    if (!sg) return;
    this.ring.position.set(sg.x, 0.08, sg.z);
    this.ring.scale.setScalar(sg.r);
  }

  /** Tempo que falta da onda, em s (0 fora da luta). */
  get waveTimeLeft(): number {
    return this.wave && this.phase === "fight" ? timeLeft(this.wave) : 0;
  }

  // ---------------------------------------------------------------- herói
  private updateAim(): void {
    const ndc = new THREE.Vector2((this.input.mouseX / window.innerWidth) * 2 - 1, -(this.input.mouseY / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    this.raycaster.ray.intersectPlane(this.groundPlane, this.aim);
  }

  /**
   * Golpe de spell: mesmo caminho do dano do herói (crítico, Frostine), contado como "other" nas conquistas. `noKnock`:
   * sem o empurrão para longe do herói (Cyclone puxa para o centro; o Quake Totem empurra a partir dele).
   */
  spellHit(e: Enemy, mult: number, noKnock = false): void {
    this.hitSource = "other";
    this.hitEnemy(e, mult, undefined, noKnock ? { noKnock } : undefined);
  }

  aimPoint(maxRange: number): { x: number; z: number } {
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
      if (this.hero.shieldHeal && ++p.throws % SHIELD_THROW.healEvery === 0) this.heal(this.stats.maxHp * SHIELD_THROW.heal, true);
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
        this.hitSource = "auto";
        this.hitEnemy(e, a.damage, a.status);
        this.hitSource = "other";
        hits++;
      }
      if (hits) this.fx.addShake(0.08);
      // Rune Traps (D-575): o golpe que passa por uma runa armada estoura a runa
      if (this.spells.hasRunes) {
        this.spells.shootRunes((x, z, trig) => {
          const d = Math.hypot(x - p.x, z - p.z);
          let da = Math.atan2(x - p.x, z - p.z) - p.facing;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          return d <= range + trig && Math.abs(da) <= arc;
        });
      }
    }
  }

  private useTechnique(): void {
    const p = this.player;
    const t = this.hero.technique;
    const s = this.stats;
    p.techMax = this.tech ? this.tech.cooldown : t.cooldown * s.cooldownMult;
    if (!this.tech) return;
    p.techCd = p.techMax;
    this.audio.play("tech");
    const color = this.hero.color;
    switch (t.kind) {
      case "blink": {
        // Kaelen: teleporta até o mouse ferindo o caminho; 0,3 s invulnerável e rastro elétrico que fere em pulsos
        const T = this.tech!;
        const dest = this.aimPoint(T.range);
        const x0 = p.x;
        const z0 = p.z;
        const len = Math.hypot(dest.x - x0, dest.z - z0);
        if (len < 20 / 12) {
          p.techCd = 0; // perto demais: não gasta (como no original)
          return;
        }
        const hw = (T.width ?? 2) / 2;
        this.lineHit(x0, z0, dest.x, dest.z, hw, T.damage);
        p.x = dest.x;
        p.z = dest.z;
        this.grid.resolve(p, 0.5);
        p.iframes = Math.max(p.iframes, T.invuln ?? 0.3);
        this.addTrail(x0, z0, p.x, p.z, hw, T.trail ?? 2, T.trailTick ?? 0.4, T.damage * (T.trailFraction ?? 0.35), color);
        this.fx.streak(x0, z0, p.x, p.z, 1.4, 0xfff6c0, 0.3);
        this.fx.burst(x0, 1, z0, color, 14, 5, 0.14, 0.4);
        this.fx.burst(p.x, 1, p.z, 0xfff29a, 24, 7, 0.14, 0.4);
        this.fx.flashLight(p.x, 1.6, p.z, 0xfff0a0, 2.4, 0.3);
        if (T.shockRadius) {
          this.areaHit(p.x, p.z, T.shockRadius, T.damage);
          this.fx.shockwave(p.x, p.z, T.shockRadius, 0xfff29a, 0.45);
        } else this.fx.shockwave(p.x, p.z, 34 / 12, 0xfff29a, 0.3);
        this.fx.addShake(0.18);
        break;
      }
      case "rift": {
        // Aurelius: fenda no mouse que deixa lento, segura os tiros inimigos e implode
        const T = this.tech!;
        const dest = this.aimPoint(T.range);
        this.rifts.add({ x: dest.x, z: dest.z, r: T.radius ?? 6.7, dur: T.duration ?? 3, slow: T.riftSlow ?? 0.6,
          damage: T.damage, perEnemy: T.perEnemy ?? 0.15, maxMult: T.maxMult ?? 3, stun: T.stun ?? 0 });
        this.fx.burst(dest.x, 0.5, dest.z, 0xc28cff, 30, 5, 0.14, 0.6, -2);
        break;
      }
      case "fan": {
        // Zephyr: 5 tiros em cone de uma vez, com o dano e o crítico do ataque básico, empurrando
        const T = this.tech!;
        const a = this.hero.auto;
        const n = T.shots ?? 5;
        const spread = T.spread ?? 0.16;
        const rangeMult = Math.max(T.range, a.range * s.range) / (a.range * s.range);
        const fanAuto = { ...a, speed: (a.speed ?? 24) * 1.15 };
        for (let k = 1; k <= n; k++) {
          this.firePlayer(p.facing + (k - (n + 1) / 2) * spread, fanAuto, T.damage, rangeMult);
          this.projectiles[this.projectiles.length - 1].push = 0.85;
        }
        p.attackAnim = 0;
        if (p.rig) nextShot(p.rig);
        this.audio.play("shoot");
        this.fx.burst(p.x + Math.sin(p.facing) * 0.9, 1.2, p.z + Math.cos(p.facing) * 0.9, 0xffe9b0, 18, 8, 0.12, 0.3, 4);
        this.fx.flashLight(p.x + Math.sin(p.facing), 1.4, p.z + Math.cos(p.facing), 0xffd080, 1.8, 0.15);
        this.fx.addShake(0.22);
        break;
      }
      case "charge": {
        // Ignis: avança em chamas atravessando os inimigos e termina com um soco que abre um anel de fogo
        const T = this.tech!;
        const dest = this.aimPoint(T.range);
        const d = Math.hypot(dest.x - p.x, dest.z - p.z);
        if (d < 20 / 12) {
          p.techCd = 0;
          return;
        }
        const dur = T.dashTime ?? 0.22;
        p.rush = { t: 0, dur, dx: (dest.x - p.x) / d, dz: (dest.z - p.z) / d, hit: new Set(), speed: d / dur };
        p.iframes = Math.max(p.iframes, T.invuln ?? 0.22);
        break;
      }
      case "icewall": {
        const T = this.tech!;
        const pl = IceWalls.place(p.x, p.z, this.aim.x, this.aim.z, T.minRange ?? 4, T.maxRange ?? 16);
        this.iceWalls.add({ ...pl, length: T.length ?? 12, thickness: T.thickness ?? 1.2, dur: T.duration ?? 5,
          damage: T.damage, freeze: T.freeze ?? 1, shatter: T.shatter === true });
        this.fx.burst(pl.x, 0.4, pl.z, 0xcdeeff, 40, 6, 0.16, 0.6, 6);
        this.fx.flashLight(pl.x, 1.5, pl.z, 0x9fdcff, 2.2, 0.4);
        this.fx.addShake(0.2);
        break;
      }
      case "shadowstep": {
        // Umbra: some e reaparece atrás do inimigo mais forte por perto, com um golpe que sempre é crítico
        const T = this.tech!;
        let target: Enemy | null = null;
        let best = -1;
        for (const e of this.enemies) {
          if (e.dead || Math.hypot(e.x - p.x, e.z - p.z) > T.range) continue;
          const score = (e.isBoss ? 1e9 : 0) + (e.champion ? 1e6 : 0) + e.hp;
          if (score > best) {
            best = score;
            target = e;
          }
        }
        if (!target) {
          p.techCd = 0; // ninguém por perto: não gasta
          return;
        }
        const x0 = p.x;
        const z0 = p.z;
        const dx = target.x - p.x;
        const dz = target.z - p.z;
        const len = Math.max(0.1, Math.hypot(dx, dz));
        const back = target.radius + (T.behind ?? 2.2);
        p.x = target.x + (dx / len) * back;
        p.z = target.z + (dz / len) * back;
        this.grid.resolve(p, 0.5);
        p.facing = Math.atan2(target.x - p.x, target.z - p.z);
        p.iframes = Math.max(p.iframes, T.invuln ?? 0.6);
        p.shadowUntil = this.time + SHADOW.afterStep;
        p.attackAnim = 0;
        for (const [x, z] of [[x0, z0], [p.x, p.z]]) {
          this.fx.burst(x, 1, z, 0x2a1a3d, 26, 4, 0.22, 0.6, -1);
          this.fx.burst(x, 1, z, color, 12, 5, 0.12, 0.4);
        }
        this.fx.streak(x0, z0, p.x, p.z, 0.35, 0x6a4a9a, 0.35);
        this.hitEnemy(target, T.damage, undefined, { crit: true });
        this.fx.slash(p.x, p.z, p.facing, 2.6, 80, color);
        this.fx.addShake(0.25);
        this.hitstop = Math.max(this.hitstop, 0.05);
        break;
      }
      case "aegis": {
        // Seraph: escudo de luz por 3 s que bloqueia o próximo golpe; ao acabar explode e cura
        const T = this.tech!;
        this.endAegis(false);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false });
        const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), mat);
        mesh.scale.setScalar(1.25);
        this.scene.add(mesh);
        p.aegis = { until: this.time + (T.duration ?? 3), block: true, damage: T.damage, radius: T.radius ?? 7.5, heal: T.healFraction ?? 0.1, mesh };
        this.fx.burst(p.x, 1.2, p.z, 0xffe9a8, 30, 6, 0.14, 0.5, 2);
        this.fx.flashLight(p.x, 1.5, p.z, 0xffe9a8, 1.6, 0.3);
        break;
      }
      case "leap": {
        const T = this.tech!;
        const dest = this.aimPoint(T.range);
        if (Math.hypot(dest.x - p.x, dest.z - p.z) < 20 / 12) {
          p.techCd = 0;
          return;
        }
        const dur = T.leapTime ?? 0.45;
        p.leap = { t: 0, dur, x0: p.x, z0: p.z, x1: dest.x, z1: dest.z };
        p.iframes = Math.max(p.iframes, dur);
        break;
      }
      case "brood": {
        // Vesper: 2 vespas grandes por 6 s
        const T = this.tech!;
        for (let i = 0; i < (T.spiders ?? 2); i++) this.spawnBee(true, T.duration ?? 6, i * 2.1);
        this.fx.burst(p.x, 1.2, p.z, 0xffe14a, 20, 5, 0.12, 0.5, 2);
        break;
      }
    }
  }

  /** Aegis: fim do escudo; `burst` = explode em volta e cura (fim natural). */
  private endAegis(burst: boolean): void {
    const p = this.player;
    const a = p.aegis;
    if (!a) return;
    p.aegis = null;
    a.mesh.removeFromParent();
    a.mesh.geometry.dispose();
    (a.mesh.material as THREE.Material).dispose();
    if (!burst || !this.playerAlive) return;
    this.areaHit(p.x, p.z, a.radius, a.damage);
    this.heal(this.stats.maxHp * a.heal, true);
    this.fx.shockwave(p.x, p.z, a.radius, 0xffe9a8, 0.5);
    this.fx.burst(p.x, 1, p.z, 0xffe9a8, 40, 9, 0.16, 0.7, 3);
    this.fx.flashLight(p.x, 1.5, p.z, 0xffe9a8, 2.4, 0.35);
    this.fx.addShake(0.3);
  }

  /** Vespa grande (Brood) ou abelha pequena (Ninhada), como as aranhas de Tech.spawnSpider. */
  private spawnBee(big: boolean, life: number, phase: number): void {
    const T = this.tech;
    const p = this.player;
    const dmg = (T?.damage ?? 1.4) * (big ? 1 : 0.5) * 0.75; // BITE_MULT do original
    // veneno: dps = metade do dano da técnica (pela metade na pequena), em fração da picada
    const poisonDps = (T?.damage ?? 1.4) * 0.5 * (big ? 1 : 0.5);
    const rig = characterRig("bee", "hero");
    rig.root.scale.setScalar(big ? 1.35 : 0.8);
    this.scene.add(rig.root);
    const a = Math.random() * Math.PI * 2;
    this.bees.push({
      x: p.x + Math.cos(a) * 1.5, z: p.z + Math.sin(a) * 1.5, life, hitCd: 0, rig, phase, sting: -1,
      big, dmg, every: big ? 0.7 : 0.9, speed: big ? 175 / 12 : 150 / 12,
      poison: { kind: "poison", power: poisonDps / dmg, duration: T?.poisonDuration ?? 3, maxStacks: (T?.poisonStacks ?? 3) + 1 },
    });
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
    if (s.regen > 0 && p.hp < s.maxHp) {
      const before = p.hp;
      p.hp = Math.min(s.maxHp, p.hp + s.regen * dt * (this.inCombat ? RUN_TUNING.combatHealMult : 1));
      this.run.statistics.healed += p.hp - before;
      this.ach.healed(this.run.statistics.healed);
    }
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
        const T = this.tech!;
        this.grid.resolve(p, 0.5);
        this.executionLanding(T.radius ?? 5.8, T);
        this.audio.play("kill");
      }
    } else if (p.rush) {
      const r = p.rush;
      const step = Math.min(dt, r.dur - r.t);
      r.t += dt;
      const T = this.tech;
      const sp = r.speed ?? 30;
      const nx = p.x + r.dx * sp * step;
      const nz = p.z + r.dz * sp * step;
      if (T) this.lineHit(p.x, p.z, nx, nz, (T.width ?? 2.5) / 2, T.damage, this.chargeBurn(T), r.hit);
      // labareda ao longo do caminho
      for (let k = 0; k < 4; k++) {
        const q = Math.random();
        this.fx.glow(p.x + (nx - p.x) * q, 0.6 + Math.random() * 0.6, p.z + (nz - p.z) * q, Math.random() < 0.5 ? 0xff8a2a : 0xffd34d, 0.5, 0.45, 0, 1.5, 0);
      }
      p.x = nx;
      p.z = nz;
      p.moveAmt = 1;
      if (r.t >= r.dur) {
        p.rush = null;
        if (T) this.infernoRing(T);
      }
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
      if (this.hero.technique.kind === "icewall" && this.tech) {
        const T = this.tech;
        const pl = IceWalls.place(p.x, p.z, this.aim.x, this.aim.z, T.minRange ?? 4, T.maxRange ?? 16);
        this.iceWalls.showGhost(p.techCd <= 0, pl.x, pl.z, pl.ax, pl.az, T.length ?? 12, T.thickness ?? 1.2);
      }
      if ((input.rmbPressed || input.wasPressed("KeyQ")) && p.techCd <= 0) this.useTechnique();
      else if (input.lmb && p.attackCd <= 0) this.autoAttack();
      if (input.wasPressed("KeyF") && p.potionCd <= 0 && p.hp < s.maxHp) {
        p.potionCd = T.potionCooldown;
        this.heal(s.maxHp * T.potionHealPct, true);
        this.audio.play("potion");
      }
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
    this.nearPortal = this.phase === "portal" && this.world !== null && this.world.portal.visible
      && Math.hypot(p.x - this.world.portal.position.x, p.z - this.world.portal.position.z) < 2.6;
    if (this.nearPortal && input.wasPressed("KeyE")) this.prepareWave(this.run.wave + 1);
    if (input.wasPressed("KeyH") && canHasten(this.wave)) this.hastenWave();
    // durante a onda a clareira fecha: o herói não sai dela
    if (this.phase === "intro" || this.phase === "fight") {
      const sg = this.segment;
      const dx = p.x - sg.x, dz = p.z - sg.z, d = Math.hypot(dx, dz), max = sg.r - 0.6;
      if (d > max) {
        p.x = sg.x + (dx / d) * max;
        p.z = sg.z + (dz / d) * max;
      }
    }

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
    } else if (p.aegis) tintRig(rig, 0xffe9a8, 0.35);
    else if (this.time < p.shadowUntil) tintRig(rig, 0x6a4a9a, 0.4);
    else flashRig(rig, 0);
    rig.root.visible = p.iframes <= 0.3 || Math.floor(this.time * 24) % 2 === 0 || p.dashT > 0 || !!p.leap || !!p.rush;
  }

  private updateAllies(dt: number): void {
    const p = this.player;
    // Seraph: o escudo de luz acompanha o herói e explode no fim
    if (p.aegis) {
      const a = p.aegis;
      a.mesh.position.set(p.x, 1.05, p.z);
      a.mesh.rotation.y += dt * 0.8;
      (a.mesh.material as THREE.MeshBasicMaterial).opacity = (a.block ? 0.2 : 0.1) + Math.sin(this.time * 9) * 0.04;
      if (this.time >= a.until) this.endAegis(true);
    }
    // Vesper, Ninhada: uma abelha pequena a cada VENOM.broodEvery s, até VENOM.broodMax, com inimigo por perto
    if (this.hero.nest && this.playerAlive) {
      p.nestT -= dt;
      if (p.nestT <= 0) {
        p.nestT = VENOM.broodEvery;
        const small = this.bees.filter((b) => !b.big).length;
        const near = this.enemies.some((e) => !e.dead && Math.hypot(e.x - p.x, e.z - p.z) < 400 / 12);
        if (small < VENOM.broodMax && near) {
          this.spawnBee(false, VENOM.broodLife, Math.random() * 6);
          this.fx.burst(p.x, 1.2, p.z, 0xffe14a, 8, 3, 0.1, 0.4, 2);
        }
      }
    }
    for (let i = this.bees.length - 1; i >= 0; i--) {
      const b = this.bees[i];
      b.life -= dt;
      b.hitCd -= dt;
      if (b.life <= 0) {
        disposeRig(b.rig);
        this.bees.splice(i, 1);
        continue;
      }
      // alvo: o inimigo mais próximo dela que está brigando (ou perto do herói)
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
      const reach = target ? target.radius + 0.9 : 0.3;
      if (d > reach) {
        const step = Math.min(d - reach, b.speed * dt);
        b.x += ((tx - b.x) / d) * step;
        b.z += ((tz - b.z) / d) * step;
      }
      if (target && d < target.radius + 1.1 && b.hitCd <= 0) {
        b.hitCd = b.every;
        b.sting = 0;
        this.hitEnemy(target, b.dmg, b.poison);
      }
      if (b.sting >= 0) {
        b.sting += dt / 0.3;
        if (b.sting >= 1) b.sting = -1;
      }
      // a forma `bat` já voa a meia altura do corpo; aqui só a altura do voo e para onde olha
      b.rig.root.position.set(b.x, (b.big ? 1.1 : 0.8) + Math.sin(this.time * 5 + b.phase) * 0.15, b.z);
      if (d > 0.05) b.rig.root.rotation.y = Math.atan2(tx - b.x, tz - b.z);
      animateRig(b.rig, { t: this.time, move: 1, attack: b.sting, windup: 0, dead: 0 });
    }
  }

  /** Execution Leap: o inimigo com mais vida na área perde 8% da vida máxima (ou o dano, se for maior); os outros levam
   * metade; todos ficam atordoados. */
  private executionLanding(r: number, T: TechStats): void {
    const p = this.player;
    const inside = this.enemies.filter((e) => !e.dead && Math.hypot(e.x - p.x, e.z - p.z) <= r + e.radius);
    let target: Enemy | null = null;
    for (const e of inside) if (!target || e.hp > target.hp) target = e;
    if (target) {
      const pct = (target.maxHp * (T.maxHpFraction ?? 0.08)) / Math.max(1, this.stats.damage);
      this.hitEnemy(target, Math.max(T.damage, pct));
      this.fx.burst(target.x, 1.2, target.z, 0xff5040, 26, 8, 0.16, 0.5, 8);
    }
    for (const e of inside) {
      if (e !== target) this.hitEnemy(e, T.damage * 0.5);
      if (!e.dead) this.applyStatus(e, { kind: "stun", power: 1, duration: T.stun ?? 0.5 }, 0);
    }
    this.fx.shockwave(p.x, p.z, r, this.hero.color, 0.45);
    this.fx.shockwave(p.x, p.z, r * 0.55, 0xffd0a0, 0.3);
    this.fx.burst(p.x, 0.3, p.z, 0xc8b89a, 50, 11, 0.22, 0.8);
    this.fx.flashLight(p.x, 1.2, p.z, 0xffb070, 2.5, 0.3);
    this.fx.addShake(0.7);
    this.hitstop = Math.max(this.hitstop, 0.06);
  }

  /** Queimadura do Inferno Charge como StatusSpec: dano por segundo em fração do golpe. */
  private chargeBurn(T: TechStats): StatusSpec {
    return { kind: "burn", power: (T.burnDps ?? 0.5) / Math.max(0.01, T.damage), duration: T.burnDuration ?? 2.5, maxStacks: 3 };
  }

  /** Fim do Inferno Charge: soco que abre um anel de fogo em volta. */
  private infernoRing(T: TechStats): void {
    const p = this.player;
    const r = T.radius ?? 6.25;
    this.areaHit(p.x, p.z, r, T.damage * (T.ringMult ?? 1.3), this.chargeBurn(T));
    this.fx.shockwave(p.x, p.z, r, 0xff8a2a, 0.45);
    this.fx.shockwave(p.x, p.z, r * 0.6, 0xffd34d, 0.3);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      this.fx.glow(p.x + Math.sin(a) * r * 0.9, 0.4, p.z + Math.cos(a) * r * 0.9, i % 2 ? 0xff8a2a : 0xffd34d, 0.7, 0.5, Math.sin(a) * 2, 2.2, Math.cos(a) * 2);
    }
    this.fx.flashLight(p.x, 1.3, p.z, 0xff8a2a, 2.6, 0.3);
    this.fx.addShake(0.4);
    this.hitstop = Math.max(this.hitstop, 0.04);
    this.audio.play("kill");
  }

  /** Glacial Wall: tempo, empurrão e congelamento no primeiro contato, estilhaço da evolução no fim. */
  private updateIceWalls(dt: number, active: Enemy[]): void {
    const W = this.iceWalls;
    if (!W.list.length) return;
    for (const e of active) {
      if (e.dead) continue;
      W.collide(e, (w: IceWall) => {
        this.hitEnemy(e, w.damage, undefined, { ice: true });
        if (!e.dead && !e.isBoss) this.applyStatus(e, { kind: "stun", power: 1, duration: w.freeze }, 0);
        this.fx.burst(e.x, 0.8, e.z, 0xcdeeff, 10, 4, 0.12, 0.4, 4);
      });
    }
    W.update(dt, (w: IceWall) => {
      const mx = (w.x0 + w.x1) / 2;
      const mz = (w.z0 + w.z1) / 2;
      this.fx.burst(mx, 0.8, mz, 0xcdeeff, 30, 5, 0.14, 0.6, 8);
      if (!w.shatter) return;
      const half = Math.hypot(w.x1 - w.x0, w.z1 - w.z0) / 2;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - mx, e.z - mz) < half + px(20) + e.radius) this.hitEnemy(e, w.damage * 3, undefined, { ice: true });
      }
      this.fx.shockwave(mx, mz, half, 0xcdeeff, 0.5);
      this.fx.addShake(0.35);
    });
  }

  private addTrail(x0: number, z0: number, x1: number, z1: number, hw: number, dur: number, every: number, dmg: number, color: number): void {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
    mesh.rotation.order = "YXZ";
    mesh.rotation.set(-Math.PI / 2, Math.atan2(x1 - x0, z1 - z0), 0);
    mesh.position.set((x0 + x1) / 2, 0.07, (z0 + z1) / 2);
    mesh.scale.set(hw * 0.7, len, 1);
    this.scene.add(mesh);
    this.trails.push({ x0, z0, x1, z1, hw, until: this.time + dur, tick: every, every, dmg, color, mesh });
  }

  /** Raio em zigue-zague ao longo do rastro (traços finos com desvio lateral aleatório). */
  private boltAlong(t: Trail, width: number, dur: number): void {
    const len = Math.hypot(t.x1 - t.x0, t.z1 - t.z0);
    const n = Math.max(4, Math.round(len / 1.3));
    const nx = -(t.z1 - t.z0) / (len || 1);
    const nz = (t.x1 - t.x0) / (len || 1);
    let px = t.x0;
    let pz = t.z0;
    for (let i = 1; i <= n; i++) {
      const k = i / n;
      const off = i === n ? 0 : (Math.random() - 0.5) * t.hw * 1.4;
      const qx = t.x0 + (t.x1 - t.x0) * k + nx * off;
      const qz = t.z0 + (t.z1 - t.z0) * k + nz * off;
      this.fx.streak(px, pz, qx, qz, width, 0xfff6c0, dur);
      px = qx;
      pz = qz;
    }
  }

  private disposeTrail(t: Trail): void {
    t.mesh.removeFromParent();
    t.mesh.geometry.dispose();
    (t.mesh.material as THREE.Material).dispose();
  }

  /** Storm Step (rastro) e Time Rift (lentidão e implosão). */
  private updateZonesOfTech(dt: number): void {
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      t.tick -= dt;
      const left = t.until - this.time;
      (t.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(1, left / 0.4) * (0.04 + Math.random() * 0.06);
      if (Math.random() < dt * 9) this.boltAlong(t, 0.08, 0.1);
      // faíscas correndo pelo rastro
      if (Math.random() < 0.6) {
        const k = Math.random();
        this.fx.spark(t.x0 + (t.x1 - t.x0) * k + (Math.random() - 0.5) * t.hw, 0.2 + Math.random() * 0.6, t.z0 + (t.z1 - t.z0) * k + (Math.random() - 0.5) * t.hw, 0xfff29a, 0.1, 0.25, 1.5);
      }
      if (t.tick <= 0 && left > 0) {
        t.tick = t.every;
        this.lineHit(t.x0, t.z0, t.x1, t.z1, t.hw, t.dmg);
        this.boltAlong(t, 0.16, 0.16);
        this.boltAlong(t, 0.1, 0.12);
      }
      if (left <= 0) {
        this.disposeTrail(t);
        this.trails.splice(i, 1);
      }
    }
    if (!this.rifts.list.length) return;
    for (const r of this.rifts.list) {
      for (const e of this.enemies) {
        if (e.dead || (e.x - r.x) ** 2 + (e.z - r.z) ** 2 > (r.r + e.radius) ** 2) continue;
        this.applyStatus(e, { kind: "slow", power: r.slow, duration: 0.25 }, 0);
      }
      if (Math.random() < 0.5) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.sqrt(Math.random()) * r.r;
        // partículas sobem devagar: o tempo lá dentro anda devagar
        this.fx.glow(r.x + Math.cos(a) * d, 0.2, r.z + Math.sin(a) * d, 0xc28cff, 0.25, 1.2, 0, 0.5, 0);
      }
    }
    this.rifts.update(dt, (r: Rift) => {
      const inside = this.enemies.filter((e) => !e.dead && (e.x - r.x) ** 2 + (e.z - r.z) ** 2 <= (r.r + e.radius) ** 2);
      const mult = Math.min(r.maxMult, 1 + r.perEnemy * inside.length);
      for (const e of inside) {
        this.hitEnemy(e, r.damage * mult);
        if (r.stun > 0 && !e.dead) this.applyStatus(e, { kind: "stun", power: 1, duration: r.stun }, 0);
      }
      this.fx.shockwave(r.x, r.z, r.r, 0xe0c0ff, 0.35);
      this.fx.burst(r.x, 0.8, r.z, 0xc28cff, 30 + inside.length * 6, 9, 0.16, 0.5, 4);
      this.fx.flashLight(r.x, 1.5, r.z, 0xc28cff, 2 + inside.length * 0.3, 0.35);
      this.fx.addShake(0.2 + Math.min(0.3, inside.length * 0.04));
    });
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
          reward?.();
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
    this.updateIceWalls(dt, active);
    this.updateZonesOfTech(dt);
    this.hazards.update(dt, this.time);
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
    this.sun.position.set(this.camTarget.x + SUN_OFFSET.x, SUN_OFFSET.y, this.camTarget.z + SUN_OFFSET.z);
    this.sun.target.position.set(this.camTarget.x, 0, this.camTarget.z - 4);
    this.camera.updateMatrixWorld();

    // uniforms do cenário: vento, grama e o "buraco" no que tapa o herói
    U.uTime.value = this.time;
    driftSun(this.sun, this.zone, this.time);
    U.uCenter.value.set(this.camTarget.x, this.camTarget.z - 8);
    U.uHero.value.set(p.x, 0, p.z);
    const size = this.pipeline.bufferSize;
    this.proj.set(p.x, 1.1, p.z).project(this.camera);
    U.uFadePos.value.set((this.proj.x * 0.5 + 0.5) * size.x, (this.proj.y * 0.5 + 0.5) * size.y);
    U.uFadeRadius.value = size.y * 0.085;
    U.uFadeDepth.value = this.proj.z * 0.5 + 0.5 - 0.0004;

    // partículas de ambiente (pólen, brasas, centelhas) e fogueira
    stepMotes(this.fx, this.zone, this.camTarget.x, this.camTarget.z, dt, this.moteAcc);
    const fire = this.world?.group.userData.fire as THREE.Group | undefined;
    if (fire) {
      (fire.userData.light as THREE.PointLight).intensity = fireFlicker(this.time);
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
      this.run.statistics.elapsed += raw;
      this.updatePlayer(dt);
      this.updateWave(dt, raw);
      this.flushAchievements();
      this.updateEnemies(dt);
      this.statusIcons.update(this.enemies, { now: this.time, volatile: this.spells.volatile, brittleChill: this.spells.brittle }, this.camera, this.fx, dt);
      this.updateProjectiles(dt);
      const inp = this.input;
      this.spells.update(dt, [inp.wasPressed("Digit1") || inp.wasPressed("Numpad1"), inp.wasPressed("Digit2") || inp.wasPressed("Numpad2")]);
      this.updateAllies(dt);
      this.updateDrops(dt);
      this.fx.update(dt, this.camera, window.innerWidth, window.innerHeight);
      this.updateCamera(dt);
    }
    this.input.endFrame();
    this.pipeline.render();
    this.adaptResolution(raw);
  }
}
