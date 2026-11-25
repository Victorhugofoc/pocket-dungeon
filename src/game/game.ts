// Loop principal: herói, combate, progressão e as ondas da partida (cada zona = 5 ondas, D13).
import { CAMP_RANK_OFFSET } from "../data/camps";
import * as THREE from "three";
import { armorReduction, computeStats, type FinalStats, type StatBlock } from "../core/stats";
import { arcHalfAngle, autoPattern, autoReach, forkAngles, patternCounts } from "../core/autostyle";
import { ARC_STYLES, AUTO_SHOT, STYLE_GUN, STYLE_SHIELD, STYLE_STORM, STYLE_VENOM } from "../data/autostyle";
import { applyEvolution, declineEvolutions, pendingEvolutionOffer, type EvolutionOption } from "../core/evolution";
import { addXp, applyUpgrade, draftLevelUp, draftTiers, rerollCost, rerollsLeft, upgradeSources, type UpgradeTier } from "../core/levelup";
import { generateZone, ObstacleGrid, SPAWN_R, type Segment, type ZoneLayout } from "../core/worldgen";
import { runLogEntry, waveEntry, type RunOutcome } from "../core/runlog";
import { BUILD, storeRunLog } from "./runlog";
import { loadAchievements, loadRecords, loadRun, loadRunLog, writeAchievements, writeRun, safeStorage } from "../core/save";
import { codexEntries, codexSeed, codexSyncRun, type CodexKind } from "../core/codex";
import { refreshSynergies, synergySources } from "../core/synergies";
import { BUILD_EVOLUTION_BY_ID, SYNERGY_BY_ID } from "../data/synergies";
import { AchievementTracker, filterOpen, type KillSource } from "../core/achievements";
import { ACHIEVEMENT_BY_ID, UNLOCK_REWARDS } from "../data/achievements";
import { checkpoint, continueRun, zoneSeed, type RunRng, type RunState } from "../core/run";
import { ChallengeTracker, challengeName, challengeReward, challengeText, type ChallengeWorld } from "../core/challenges";
import { arcSpots, chooseCard, shrineFallbackGold, expireWaveScope, generateMap, needsMap, roomOf, type MapCard, type MapNodeId } from "../core/runmap";
import {
  canHasten, hasten, hastenBonus, startWave, stepWave, killReward, survivorReward, timeLeft, waveMods, waveReward,
  type WaveMods, type WaveSpawn, type WaveState,
} from "../core/wave";
import { pacedHealOrb } from "../core/pace";
import {
  addPact, applyEvent, eventAvailable, eventDraft, eventMods, eventSources, expireEvents, pactChampionChance, pactLayer,
  pactsForMap, takeBossRelicBonus,
} from "../core/events";
import { EVENT_IDS, PACT_BY_ID, PACT_IDS } from "../data/events";
import { isBossWave, segmentOf } from "../core/waves";
import { BOSS, RUN_TUNING, SPAWN, TOTAL_WAVES, WAVES_PER_ZONE, depthsLevel } from "../data/run";
import { SHOP_OFFERS } from "../data/shop";
import { canUseZonePerk, depthsSources, depthsSummary, mutation, recordDepthsWin, reservePotion, runPerk, stockedShopBonus, useZonePerk } from "../core/depths";
import { PERK_BY_ID } from "../data/depths";
import { px, techniqueStats, type TechStats } from "../core/techniques";
import { frostModify, IcicleCounter } from "../core/frost";
import { buildElements, executes, isBehind, primedReactions, reactionFor, type ReactionId } from "../core/reactions";
import { REACTIONS } from "../data/reactions";
import { EVOLUTIONS, SPELL_CAST, SPELL_SCHOOL, type SpellId } from "../data/spells";
import { FROST, SHADOW, SHIELD_THROW, TECH_EVO, TECHNIQUES, VENOM } from "../data/techniques";
import { BOSSES, BOSS_ORDER, CROWN_BORROW, CROWN_TITLE, ENEMIES, HAZARD_TICK, type BossPattern, type EnemyDef } from "../data/enemies";
import { applyHex, hexMult, type HexState } from "../core/hex";
import { applyArmorBreak, armorTakenMult, type ArmorBreakState } from "../core/armorbreak";
import { applyMark, type MarkState } from "../core/bossphase";
import { plagueDps } from "../core/plague";
import { wardenFor } from "../core/ward";
import { WardAuras } from "./ward";
import { bossAllowed, crownAttack, drawBoss } from "../core/bossbag";
import { HEROES, HERO_ORDER, type AutoAttack, type HeroDef, type StatusSpec } from "../data/heroes";
import { buyOffer, rerollShop, rollShop, shopStats, type ShopVisit } from "../core/shop";
import { POOL_RELIC_CHOICES, POOL_TITLE, RELICS, RELIC_EVOLUTIONS, RELIC_IDS, type RelicPool } from "../data/relics";
import { banRelicChoice, banRelic, bossRelicOffer, declineRelicEvolutions, evolveRelic, pendingRelicEvolutionOffer, poolRelicDraft, grantRelic, relicCopies, relicDraft, relicDraftPool, relicSources, relicTotals, removeRelic, RelicHooks, type RelicFoe, type RelicWorld } from "../core/relics";
import { HERO_UPGRADES, TUNING, UPGRADE_FX } from "../data/tuning";
import { PACE } from "../data/pace";
import { ZONES, ZONE_ORDER, type ZoneDef } from "../data/zones";
import { Audio } from "./audio";
import { Enemy, enemyDef, KNOCK_DECAY } from "./enemy";
import { Fx } from "./fx";
import { IceWalls, type IceWall } from "./icewall";
import { Rifts, type Rift } from "./rift";
import { AffixField } from "./affixes";
import { rollAffixes } from "../core/affixes";
import type { AffixId } from "../data/affixes";
import { RoomHazards } from "./roomhazards";
import { Terrain } from "./terrain";
import { TERRAIN } from "../data/terrain";
import { ARCANE_CHARGED, SpellCaster } from "./spells";
import { StatusIcons } from "./status-icons";
import { EnemyBars } from "./hpbars";
import { MapGates } from "./gates";
import { DetourField } from "./detours";
import { detourGold, detourRng, rollDetours, shrineCost } from "../core/detours";
import { DETOUR, DETOURS } from "../data/detours";
import { GATE_SIGNAL } from "../data/map-nodes";
import type { MoveHandle, TrailHandle } from "./vfx";
import { LootView } from "./loot";
import { promisesBank } from "../core/loot";
import { Input } from "./input";
import { animateRig, disposeRig, flashRig, tintRig, type Rig } from "./models";
import { HeroStage } from "./stage";
import { characterRig } from "./rigs";
import { kickRig, nextShot } from "./chars";
import { Pipeline } from "./render";
import { U } from "./shared";
import { SUN_OFFSET, stepMotes } from "./air";
import { buildWorld, driftSun, fireFlicker, setZoneAtmosphere, type WorldView } from "./world";
import { FrameProbe, PerfLog, gpuName } from "./perf";
import { perfLine } from "../core/perflog";
import { EpicRuntime, type AutoMod } from "./epics";
import { initLamps, updateLamps } from "./lamps";

/** Cores dos efeitos das técnicas (M5-03): só visual, sem número de jogo */
const TECH_FX = {
  /** Kaelen: corpo e miolo do relâmpago */
  boltBody: 0xffd84a, boltCore: 0xfffbe6,
  /** Umbra: fumaça escura, brilho roxo da borda */
  shadow: 0x4a2a6e, shadowCore: 0x9a5ad0, shadowGlow: 0xa06cf0,
  /** Ignis: chama funda, miolo e fumaça */
  fireDeep: 0xff4a0a, fireCore: 0xffd070, fireSmoke: 0x2a1d17,
  /** Varok: golpe de execução, pedra e poeira */
  execRed: 0xf2594a, execCore: 0xffd8b0, rock: 0x7a6a58, rockCore: 0x3a2a1a, dust: 0x8a7a64,
  /** Frostine: gelo, miolo e névoa */
  ice: 0x8fdcff, iceCore: 0xf0fbff, mist: 0xd8f2ff,
  /** Aurelius: arcano e miolo */
  arcane: 0xb07cff, arcaneCore: 0xf2e6ff,
  /** Zephyr: clarão do cano, miolo e fumaça da pólvora */
  gun: 0xffb84a, gunCore: 0xfff4d8, gunSmoke: 0x8a8274,
  /** Seraph: luz sagrada e miolo */
  holy: 0xffd770, holyCore: 0xfffbea, heal: 0x9cf58a,
  /** Vesper: veneno, miolo, nuvem e o amarelo das vespas */
  venom: 0x7be04a, venomCore: 0xeaffb8, venomSmoke: 0x3c5a22, wasp: 0xffc83a,
} as const;

/** banir uma oferta da escolha de relíquia (run_drafts.lua `banRelic`) */
export type RelicBan = (index: number, current: readonly string[]) => string[] | null;
/** M13-02 Relic Reroll (run_drafts.lua `rerollRelics`): sorteia a escolha de novo, uma vez por zona */
export interface RelicReroll {
  can(): boolean;
  roll(current: readonly string[]): string[] | null;
}

export interface GameEvents {
  toast(msg: string, color?: string): void;
  /**
   * abriu uma escolha de relíquia; `ban(i, atual)` bane a oferta `i` e devolve a escolha nova (null se não deu),
   * quando a fonte deixa banir
   */
  relicChoice(ids: string[], pick: (id: string) => void, title?: string, ban?: RelicBan, reroll?: RelicReroll): void;
  /** abriu (ou mudou) a escolha de melhoria de nível; o estado está em `Game.levelUp` */
  levelUp(): void;
  /** abriu a oferta de evolução de spell; as opções estão em `Game.evolutionOffer` */
  evolution(): void;
  /** abriu a oferta de evolução de relíquia; as opções estão em `Game.relicEvoOffer` */
  relicEvolution(): void;
  /** abriu a Magic Shop, ou ela mudou (compra, troca); a visita está em `Game.shopVisit` */
  shop(): void;
  died(): void;
  zoneChanged(): void;
  /** a ficha da partida mudou (relíquia nova) */
  statusChanged(): void;
  victory(): void;
  /** letreiro grande no meio da tela ("Onda 3", "Onda concluída") */
  banner(title: string, sub?: string): void;
  /** M20-13: um desafio entrou, completou ou expirou (o painel do HUD redesenha) */
  challenges?(): void;
  /** M11-08: abriu a escolha da carta de evento; as opções estão em `Game.eventOffer` */
  eventDraft?(): void;
  /** M13-03: abriu a confirmação da carta de pacto; o pacto está em `Game.pactOffer` */
  pactOffer?(): void;
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

/** Por que a loja abriu sozinha (run.pendingShop): antes de uma onda de chefe, ou depois de matar um campeão. */
export type ShopReason = "preboss" | "champion";

/** Em que ponto da onda a partida está. */
export type WavePhase = "walk" | "intro" | "fight" | "cleared" | "portal";

/** aviso no chão antes de um inimigo da onda aparecer (spawner.lua) */
interface SpawnMarker {
  spawn: WaveSpawn;
  boss: boolean;
  x: number; z: number; t: number; dur: number;
  mesh: THREE.Mesh;
}

/** De onde vem o golpe (damage.lua `fromX`/`fromY`, para o escudo de frente); sem = o herói; "none" = sem direção (`noDirection`). */
export type HitFrom = { x: number; z: number } | "none";

interface Projectile {
  x: number; z: number; vx: number; vz: number; r: number;
  dmg: number; life: number; friendly: boolean;
  pierce: number; ricochet: number; ricochetDamage: number;
  status?: StatusSpec; mesh: THREE.Mesh; hit: Set<Enemy>; color: number; source: string;
  /** gelo da Frostine; `icicle` = o tiro é pingente */
  ice?: boolean; icicle?: boolean;
  /** M21-07: crítico garantido (Third Strike) e empurrão extra (Charged Step) */
  crit?: boolean; knock?: number;
  /** empurrão extra no acerto, em fração de TUNING.enemy.knockback (Fan the Hammer) */
  push?: number;
  /** Trick Shot: ricochetes que restam na borda da clareira da onda, ganho de dano em cada um e o alcance (s) */
  bounces?: number; bounceGain?: number; span?: number;
  /** M5-03: rastro do tiro (Fan the Hammer) */
  fx?: TrailHandle;
  /** H8: tiro do ataque básico com as regras do estilo (o 2º alvo em diante fere menos) */
  styled?: boolean;
  /** já ricocheteou; `flatRicochet` = o ricochete fere `ricochetDamage` da base em vez de multiplicar a cada salto (Zephyr) */
  bounced?: boolean; flatRicochet?: boolean;
  /** Kaelen: saltos do Double e ramos do Cone; `chained` = já saltou (fere 70%) */
  chainLeft?: number; chained?: boolean; forks?: number;
  /** Vesper: aplicações de veneno por acerto (Double) e o respingo dos laterais do Cone, em m */
  poisonHits?: number; splash?: number;
  /** Frostine: o Double traz o pingente tantos acertos antes */
  icicleSooner?: number;
  /** Big Iron: dano a mais em quem está perto do Zephyr */
  pointBlank?: number;
  /** tiro inimigo: quem atirou (JUDGEMENT) */
  owner?: Enemy;
  /** M9-02: tiro de maldição do Hexer (`EnemyDef.hex`) */
  hex?: { duration: number; damageMult: number };
  /** enemy_attacks.lua `pr.curve` (D-208): o tiro inimigo curva nesta taxa, em rad/s */
  curve?: number;
  /** enemy_attacks.lua `pr.onEnd`: chamado onde o tiro inimigo acaba (acerto, parede ou alcance; Venom Bloom) */
  onEnd?: (x: number, z: number) => void;
  /** BOOMERANG (Seraph): o escudo vai até o alcance e volta, acertando todos nos dois sentidos; `back` = voltando */
  boomerang?: { back: boolean };
}

/** Golpe extra do Double Shot num estilo de arco, ou o escudo de luz do Seraph (H8). */
interface ExtraSwing { at: number; angle: number; mult: number; shield: boolean }

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
  /** Broodmother: ao acabar, deixa uma poça de veneno por tantos segundos */
  pool?: number;
  /** M5-03: rastro amarelo da vespa grande */
  fx?: TrailHandle;
}
/** Broodmother: poça de veneno onde a vespa grande sumiu (techniques.lua `updatePool`) */
interface VenomPool { x: number; z: number; r: number; born: number; until: number; tick: number; dmg: number; poison: StatusSpec; mesh: THREE.Mesh }
/** rastro que fere em pulsos ao longo de um segmento (Storm Step) */
interface Trail { x0: number; z0: number; x1: number; z1: number; hw: number; until: number; tick: number; every: number; dmg: number; color: number; mesh: THREE.Mesh;
  /** Phoenix Rush: rastro de fogo (queima em vez de raio) */
  burn?: StatusSpec }
/** Eclipse: a sombra repete o golpe do Shadow Step depois de um tempo */
interface Echo { x: number; z: number; target: Enemy; at: number; dmg: number }

export interface PlayerState {
  x: number; z: number; facing: number; hp: number;
  rig: Rig | null;
  moveAmt: number; attackAnim: number; attackCd: number;
  techCd: number; techMax: number;
  /** FOLLOW-THROUGH: até quando o dano leva o bônus (tempo do jogo) */
  followUntil: number;
  dashCd: number; dashT: number; dashDx: number; dashDz: number;
  iframes: number;
  /** Umbra: golpes contam como pelas costas até este instante */
  shadowUntil: number;
  /** Seraph: escudo de luz ativo */
  aegis: { until: number; block: boolean; damage: number; radius: number; heal: number; mesh: THREE.Mesh; sanctum: number; fx: MoveHandle } | null;
  /** Seraph: arremessos do escudo (cura a cada SHIELD_THROW.healEvery) */
  throws: number;
  /** Vesper: tempo até a próxima abelha da Ninhada */
  nestT: number;
  flash: number; hurtT: number;
  leap: { t: number; dur: number; x0: number; z0: number; x1: number; z1: number; fx?: TrailHandle } | null;
  /** M9-06: golpe do campeão Frozen deixa o herói a `chillMult` da velocidade até `chillUntil` */
  chillUntil: number;
  chillMult: number;
  /** M9-02: maldição do Hexer (`core/hex.ts`): o herói causa menos dano até ela acabar */
  hex: HexState | null;
  /** M10-01: Marked Prey do Deathstalker (`core/bossphase.ts`): o dano de quem marcou sai ×mult até a marca acabar */
  mark: MarkState<Enemy> | null;
  /** M10-08: Armorbreak do Iron Colossus (`core/armorbreak.ts`): armadura a menos até acabar */
  armorBreak: ArmorBreakState | null;
  rush: { t: number; dur: number; dx: number; dz: number; hit: Set<Enemy>; speed?: number; x0: number; z0: number; fire?: TrailHandle } | null;
}

const UP = new THREE.Vector3(0, 1, 0);
const PROJ_GEO = new THREE.IcosahedronGeometry(1, 0);
/** cor da poça de peste do Plaguebearer (verde-amarelado doentio) */
const PLAGUE_COLOR = 0x9fbf3a;
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
    x: 0, z: 0, facing: 0, hp: 1, rig: null, moveAmt: 0, attackAnim: -1, attackCd: 0, techCd: 0, techMax: 1, followUntil: 0,
    dashCd: 0, dashT: 0, dashDx: 0, dashDz: 0, iframes: 0, shadowUntil: 0, aegis: null, throws: 0, nestT: VENOM.broodEvery,
    flash: 0, hurtT: 0, leap: null, rush: null, chillUntil: 0, chillMult: 1, hex: null, mark: null, armorBreak: null,
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
  /** chefe da onda de chefe atual (saco de chefes) e o ataque emprestado do rei coroado */
  waveBoss: string | null = null;
  crown: BossPattern | null = null;
  mods: WaveMods = waveMods(1, "normal");
  phase: WavePhase = "walk";
  private phaseT = 0;
  /** o trecho (clareira) da onda atual */
  segment!: Segment;
  /** M21-13: s andando até a clareira (fase "walk"), e o da onda atual, para o registro */
  private travelT = 0;
  /** M21-14: o portão foi escolhido com E; a viagem sai quando a carta estiver resolvida */
  private warpPending = false;
  /** s até a resolução adaptativa voltar a agir (`TUNING.frame.settle`) */
  private settleT = 0;
  private waveTravel = 0;
  private markers: SpawnMarker[] = [];
  private ring: THREE.Mesh | null = null;
  private projectiles: Projectile[] = [];
  private drops: Drop[] = [];
  private bees: Bee[] = [];
  private iceWalls = new IceWalls(this.scene);
  private rifts = new Rifts(this.scene);
  /** raios e poças de cura da sala (M20-08) */
  hazards!: RoomHazards;
  /** M9-06: afixos de campeão (poças do rastro, explosão, ganchos do golpe) */
  affixes = new AffixField(this);
  terrain!: Terrain;
  private trails: Trail[] = [];
  private echoes: Echo[] = [];
  private pools: VenomPool[] = [];
  /** M9-04: as auras dos Wardens no chão */
  private wardAuras!: WardAuras;
  private icicle = new IcicleCounter();
  private extraSwings: ExtraSwing[] = [];
  /** números da técnica do herói no nível atual (src/core/techniques.ts); null se ainda for a técnica antiga */
  tech: TechStats | null = null;
  /** spells nas teclas 1 e 2 (M6-02) */
  spells = new SpellCaster(this);
  /** ícones de estado sobre os inimigos (M5-05) */
  private statusIcons = new StatusIcons(this.scene);
  private hpBars = new EnemyBars(this.scene);
  /** orbes de ouro e XP no chão (M7-02) */
  readonly loot = new LootView(this.scene);
  private projPool: THREE.Mesh[] = [];
  private projMats = new Map<number, THREE.MeshBasicMaterial>();

  time = 0;
  started = false;
  paused = false;
  private hitstop = 0;
  /** épicas de comportamento (M21-07) */
  readonly epics = new EpicRuntime(this);
  /** ganchos das relíquias que mudam o jogo (core/relics.ts) */
  readonly relicHooks = new RelicHooks();
  /** o mundo como as mecânicas de relíquia o veem (core/relics.ts `RelicWorld`) */
  readonly relicWorld: RelicWorld = (() => {
    const g = this; // eslint-disable-line @typescript-eslint/no-this-alias
    return {
      get time() { return g.time; },
      get waveActive() { return g.inCombat; },
      get hp() { return g.player.hp; },
      get maxHp() { return g.stats.maxHp; },
      get gold() { return g.run.gold; },
      get moving() { return g.player.moveAmt > 0; },
      heal: (amount: number) => g.heal(amount, true),
      emit: (ev: string, d?: Record<string, unknown>) => g.onRelicEvent(ev, d ?? {}),
      foes: () => g.enemies.filter((e) => !e.dead).map((e) => g.relicFoe(e)),
      stun: (f: RelicFoe, seconds: number) => {
        const e = f.key as Enemy;
        if (e.dead || e.isBoss) return false;
        g.applyStatus(e, { kind: "stun", power: 1, duration: seconds }, 0);
        return true;
      },
      burn: (f: RelicFoe, dps: number, seconds: number) => {
        const e = f.key as Enemy;
        if (!e.dead) e.applyBurn(g.time, dps, seconds);
      },
      areaHit: (x: number, z: number, r: number, damage: number, except: object) => {
        const prev = g.hitSource;
        g.hitSource = "other";
        for (const e of [...g.enemies]) {
          if (e.dead || e === except || Math.hypot(e.x - x, e.z - z) > r + e.radius) continue;
          g.damageEnemy(e, damage, { noKnock: true });
        }
        g.hitSource = prev;
      },
    };
  })();
  /** recompensa do chefe, entregue quando o corpo dele some */
  private bossReward: (() => void) | null = null;
  /** escolha de melhoria aberta; o jogo fica pausado pela tela */
  levelUp: LevelUpDraft | null = null;
  /** até 3 evoluções oferecidas no intervalo (evolution.lua `pendingOffer`, S18) */
  evolutionOffer: EvolutionOption[] | null = null;
  /** até 3 evoluções de relíquia oferecidas no intervalo (run_drafts.lua `relicEvoChoices`, M12-08) */
  relicEvoOffer: string[] | null = null;
  private levelUpIndex = 0;
  /** M21-08: a carta da onda já foi escolhida (ou não há mapa antes dela); até lá a clareira não começa */
  private mapResolved = false;
  /** os portões do mapa no chão e o mais perto do herói (a carta aparece no HUD), ou -1 */
  private gates!: MapGates;
  nearGate = -1;
  /** M21-09: o desvio mais perto (a dica no HUD), ou -1 */
  nearDetour = -1;
  private detours!: DetourField;
  /** o campeão que guarda o baú do desvio desta caminhada */
  private detourGuard: Enemy | null = null;
  /** o santuário de relíquias está com a escolha aberta */
  private shrineOpen = false;
  /** M11-08: a escolha da carta de evento aberta (o portão `index`); voltar devolve o mapa */
  eventOffer: { index: number; ids: string[] } | null = null;
  /** M13-03: a confirmação da carta de pacto aberta (run_map_flow.lua `pactOffer`) */
  pactOffer: { index: number; id: string } | null = null;
  /** Magic Shop aberta (shop_system.lua); null = fechada */
  shopVisit: (ShopVisit & { auto: ShopReason | null }) | null = null;
  /** loja automática depois desta onda (run.pendingShop): antes de onda de chefe, ou depois de matar um campeão */
  private pendingShop: ShopReason | null = null;
  /** relíquia exclusiva depois desta onda (run.pendingPoolRelic): risco (campeão, emboscada) ou maldição */
  private pendingPoolRelic: RelicPool | null = null;
  /** a escolha da relíquia exclusiva está aberta */
  private poolOpen = false;
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
    { heroes: HERO_ORDER, bosses: Object.keys(BOSSES), enemies: Object.keys(ENEMIES), relics: RELIC_IDS,
      spellEvolutions: Object.keys(EVOLUTIONS), relicEvolutions: RELIC_EVOLUTIONS.map((d) => d.id) }, loadRecords(this.storage).kills);
  /** de onde veio o golpe em curso (o "ataque básico" de quick_trigger) */
  private hitSource: KillSource = "other";
  /** > 0 enquanto o golpe é da técnica (`asTechnique`) */
  private techDepth = 0;
  /** M20-13: os desafios da partida (core/challenges.ts); criado em `start` */
  challenges!: ChallengeTracker;
  /** a compra da loja dá a relíquia: o desafio ouve a compra, não o `relic_acquired` (como no Lua) */
  private shopBuying = false;
  /** o ataque básico que está saindo agora (M21-07) */
  private autoMod: AutoMod | null = null;
  /** elemento do golpe em andamento quando quem bate não passa um (técnica: a escola dela), para as reações (M21-05) */
  private hitElement: string | null = null;
  /** elementos da build (refeito no `recompute`) */
  elements = new Set<string>();
  fps = 60;
  /** registro de tempo por quadro (F3, M16-01) */
  probe: FrameProbe;
  /** fps e travadinhas por onda para o registro de partidas (core/perflog.ts) */
  perfLog = new PerfLog();
  /** palco 3D da tela de seleção de herói (M14-08) */
  stage: HeroStage;

  constructor(private canvas: HTMLCanvasElement, textLayer: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(38, 1, 1, 400);
    this.pipeline = new Pipeline(this.renderer, this.scene, this.camera);
    this.probe = new FrameProbe(this.renderer);
    this.stage = new HeroStage(this.renderer);
    this.fx = new Fx(this.scene, textLayer);
    this.gates = new MapGates(this.scene, this.fx);
    this.detours = new DetourField(this.scene, this.fx);
    this.wardAuras = new WardAuras(this.scene);
    this.hazards = new RoomHazards({
      scene: this.scene,
      fx: this.fx,
      player: () => ({ x: this.player.x, z: this.player.z, alive: this.playerAlive }),
      hurt: (n) => this.hurtPlayer(n, "Lightning"),
      heal: (n) => this.heal(n, true),
      maxHp: () => this.stats.maxHp,
      zap: () => this.audio.play("zap"),
    });
    this.terrain = new Terrain({
      scene: this.scene,
      blast: (x, z) => this.barrelBlast(x, z),
      fuseTick: () => this.audio.play("fuse"),
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
    initLamps(this.scene);

    window.addEventListener("resize", () => this.resize());
    this.resize();
    requestAnimationFrame((t) => this.frame(t));
  }

  private resize(): void {
    this.probe?.tag("resize");
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
    this.stage.hide();
    this.run = run;
    this.perfLog.reset();
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
    this.runLogged = false;
    this.ach.runStart(run.heroId);
    this.ach.devUsed = run.devUsed;
    this.codexReady();
    this.codexSync();
    this.challenges = new ChallengeTracker(run);
    this.saveAchievements();
    this.prepareWave(Math.max(1, run.wave), true);
    this.openStartPick();
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
    // começo da partida ou zona nova: os picos são de carregamento, não de carga; não mexe na resolução
    if (this.settleT > 0) {
      this.settleT -= dt;
      this.gpuAvg = gpu;
      return;
    }
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

  /** build_system.lua `refresh`: as tags mudaram (nível, relíquia, loja); liga e desliga as sinergias e avisa. */
  private refreshSynergies(): void {
    const { gained, lost, evolved } = refreshSynergies(this.run);
    for (const id of gained) this.events?.toast(`Synergy: ${SYNERGY_BY_ID[id].name} · ${SYNERGY_BY_ID[id].text}`, "#ffd34d");
    if (gained.length && this.challenges) {
      for (const id of gained) this.challenges.synergyActivated(id);
      this.flushChallenges();
    }
    for (const id of lost) this.events?.toast(`Synergy lost: ${SYNERGY_BY_ID[id].name} · tags below the threshold`, "#ff7a6a");
    for (const id of evolved) {
      const b = BUILD_EVOLUTION_BY_ID[id];
      this.events?.toast(`Build evolution: ${b.name} · ${b.text}`, "#c77dff");
      this.events?.banner(b.name, `Build evolution · ${b.text}`);
    }
    if (gained.length || evolved.length) {
      this.audio?.play("rare");
      if (gained.length) this.ach.synergiesActive(this.run.activeSynergies.length);
      if (evolved.length) this.ach.buildEvolution();
      this.flushAchievements();
    }
  }

  recompute(): void {
    const sources: StatBlock[] = [this.hero.stats];
    sources.push(...relicSources(this.run.relics));
    sources.push(...upgradeSources(this.run));
    sources.push(shopStats(this.run.shop));
    // M11-08 e M13-03: o evento da onda, o ouro do Blood Altar e os pactos
    sources.push(...eventSources(this.run));
    // M13-02 Greed (`depths:greed`)
    sources.push(...depthsSources(this.run));
    this.refreshSynergies();
    sources.push(...synergySources(this.run.activeSynergies, this.run.buildEvolutions));
    this.stats = computeStats(sources, this.hero.style);
    this.epics.refresh(this.run.upgradesTaken);
    this.relicHooks.refresh(relicTotals(this.run.relics));
    if (this.mods) this.mods.championHp = this.stats.championHp;
    this.elements = this.buildElements();
    const tid = this.hero.technique.id;
    this.tech = TECHNIQUES[tid]
      ? techniqueStats(tid, this.run.technique.level, { cooldownMult: this.stats.cooldownMult, area: this.stats.area, range: this.stats.range, autoDamage: this.hero.auto.damage,
        permafrost: this.stats.permafrost, staticCharge: this.stats.staticCharge, riftDuration: this.stats.riftDuration })
      : null;
    this.spells.refresh();
    this.player.hp = Math.min(this.player.hp, this.stats.maxHp);
  }

  /**
   * Checkpoint da partida (run_save.lua): a partida inteira e os fluxos de sorteio, gravados antes de cada onda;
   * continuar recomeça aquela onda, na entrada do trecho dela.
   */
  saveCheckpoint(): void {
    if (!this.run || this.run.devUsed) return; // run_save.lua: partida DEV nunca é gravada
    this.run.hp = this.playerAlive ? this.player.hp : null;
    writeRun(this.storage, checkpoint(this.run, this.rng, Math.max(1, this.run.wave)));
  }

  /** a partida atual já entrou no registro (uma vez por partida; `start` zera) */
  private runLogged = false;

  /** Registro de partidas (core/runlog.ts): o resumo da partida, com a onda interrompida quando acabou no meio. */
  logRunEnd(outcome: RunOutcome, beacon = false): void {
    if (!this.run || this.runLogged || this.run.wave < 1) return;
    this.runLogged = true;
    const w = this.wave, run = this.run;
    const midWave = !!w && w.started && !(run.waveLog.at(-1)?.wave === run.wave);
    const last = midWave ? waveEntry(run, w, this.playerAlive ? this.player.hp / this.stats.maxHp : 0, false) : null;
    if (last) {
      last.perf = this.perfLog.takeWave();
      last.travel = Math.round(this.waveTravel * 10) / 10;
    }
    const env = { gpu: gpuName(this.renderer), width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio, quality: this.quality };
    storeRunLog(this.storage, runLogEntry(run, outcome, new Date().toISOString(), BUILD, last, this.perfLog.run(env)), beacon);
  }

  saveAchievements(): void {
    writeAchievements(this.storage, this.ach.state);
  }

  /** M13-04: semeia o códex uma vez (save de antes dele e registro de partidas). */
  codexReady(): void {
    if (codexSeed(this.ach.state, loadRunLog(this.storage))) this.saveAchievements();
  }

  /** M13-04 (codex.lua `syncRun` + toasts.lua `codex_unlocked`): marca o que a partida mostra e avisa o que entrou. */
  codexSync(): void {
    if (!this.started) return;
    const got = [...this.ach.codexNews, ...codexSyncRun(this.ach.state, this.run)];
    this.ach.codexNews = [];
    if (!got.length) return;
    const name = (k: CodexKind, id: string) => {
      const tab = k === "pact" || k === "event" ? "pactevent" : k;
      const key = tab === "pactevent" ? `${k}:${id}` : id;
      return codexEntries(tab).find((e) => e.id === key)?.name ?? id;
    };
    const names = got.map((g) => name(g.kind, g.id));
    this.events.toast(got.length === 1 ? `Codex: ${names[0]}` : `Codex: +${got.length} entries · ${names.slice(0, 3).join(", ")}${got.length > 3 ? "…" : ""}`, "#b9a7ff");
    this.audio.play("pickup");
    this.saveAchievements();
  }

  /** O inimigo como as mecânicas de relíquia o veem (`RelicFoe`). */
  relicFoe(e: Enemy): RelicFoe {
    const now = this.time;
    const b = e.dots.find((d) => d.kind === "burn" && d.until > now);
    return { key: e, x: e.x, z: e.z, boss: e.isBoss, slowed: now < e.slowUntil, burn: b ? { dps: b.dps, left: b.until - now } : null };
  }

  /** Efeito mínimo dos avisos das mecânicas de relíquia (o efeito próprio fica para a fase 2). */
  private onRelicEvent(ev: string, d: Record<string, unknown>): void {
    const n = (k: string) => Number(d[k] ?? 0);
    if (ev === "burn_spread") {
      this.fx.burst(n("x"), 1, n("z"), 0xff7a2a, 12, 4, 0.12, 0.45, 2);
    } else if (ev === "frost_deep_chill") {
      this.fx.burst(n("x"), 1, n("z"), 0x9fdcff, 14, 4, 0.12, 0.5, 2);
      this.fx.text(n("x"), 2.6, n("z"), "Frostbite", "frost");
    } else if (ev === "last_rites") {
      this.fx.burst(n("x"), 1, n("z"), 0xb05aff, 26, 7, 0.16, 0.6, 2);
      this.fx.shockwave(n("x"), n("z"), n("radius"), 0xb05aff, 0.4);
      this.fx.addShake(0.35);
    }
  }

  /**
   * run_drafts.lua `openPoolDraft` (D-150/D-151): 1 de 2 exclusivas do pool, das abertas que o herói não tem;
   * sem elas, raras e épicas do sorteio normal. Devolve se abriu.
   */
  openPoolDraft(pool: RelicPool, count: number = POOL_RELIC_CHOICES): boolean {
    const offer = this.drawPoolRelics(pool, count);
    if (!offer.length) return false;
    this.poolOpen = true;
    this.events.relicChoice(offer, (id) => {
      this.addRelic(id);
      this.poolOpen = false;
    }, POOL_TITLE[pool], this.relicBan((k) => this.drawPoolRelics(pool, k)), this.relicReroll((k) => this.drawPoolRelics(pool, k)));
    return true;
  }

  /** As relíquias abertas no codex (unlocks.lua `isOpen`). */
  private relicOpen(): (id: string) => boolean {
    const open = new Set(filterOpen(this.ach.state, "relic", RELIC_IDS, TUNING.unlockAll));
    return (id) => open.has(id);
  }

  /** relic_system.lua `draft`: `k` relíquias do sorteio normal, no fluxo `stream` (relíquias; a loja usa o dela). */
  drawRelics(k: number, stream: "relics" | "shop" = "relics"): string[] {
    const rr = this.rng.get(stream);
    return relicDraft(this.run, this.relicOpen(), () => rr.next(), k);
  }

  /** relic_system.lua `poolDraft`: `k` exclusivas do pool. */
  private drawPoolRelics(pool: RelicPool, k: number): string[] {
    const rr = this.rng.get("relics");
    return poolRelicDraft(this.run, pool, this.relicOpen(), k, () => rr.next());
  }

  /** O banir da escolha (D-148): a reposição vem de um sorteio novo da mesma fonte (`draw`). */
  private relicBan(draw: (k: number) => string[]): RelicBan {
    return (i, current) => {
      const next = banRelicChoice(this.run, current, i, draw);
      if (next) this.audio.play("warn");
      return next;
    };
  }

  /**
   * M13-02 Relic Reroll (run_drafts.lua `rerollRelics`, D-302): só com a vantagem ligada; uma vez por zona, a escolha
   * aberta sai de novo da mesma fonte (`draw(n)`), diferente da atual quando der (até 5 tentativas).
   */
  private relicReroll(draw: (k: number) => string[]): RelicReroll | undefined {
    if (!runPerk(this.run, "relic_reroll")) return undefined;
    const seg = () => segmentOf(Math.max(1, this.run.wave));
    return {
      can: () => canUseZonePerk(this.run, "relic_reroll", seg()),
      roll: (current) => {
        if (!useZonePerk(this.run, "relic_reroll", seg())) return null;
        const old = [...current].sort().join();
        let next = draw(current.length);
        for (let i = 0; i < 4 && next.length && [...next].sort().join() === old; i++) next = draw(current.length);
        this.audio.play("pickup");
        return next.length ? next : null;
      },
    };
  }

  /**
   * M13-02 Starting Relic (run_map_flow.lua `openStartPick`, D-228): 1 de 3 incomuns do sorteio normal. Fica pendente
   * no checkpoint até ser escolhida, então continuar a partida na onda 1 oferece de novo.
   */
  private openStartPick(): void {
    const run = this.run;
    if (!run.pendingStartPick) return;
    const rr = this.rng.get("relics");
    const list = this.relicPool().filter((id) => RELICS[id].rarity === "uncommon");
    const choices: string[] = [];
    while (list.length && choices.length < (PERK_BY_ID.relic_pick.count ?? 3)) choices.push(list.splice(Math.floor(rr.next() * list.length), 1)[0]);
    if (!choices.length) {
      run.pendingStartPick = false;
      return;
    }
    this.events.relicChoice(choices, (id) => {
      run.pendingStartPick = false;
      this.addRelic(id);
      if (this.phase === "walk") this.saveCheckpoint();
    }, "Starting Relic");
  }

  /** Relíquias que podem entrar no sorteio normal agora (abertas, que o herói não tem nem baniu, as de spell com a spell). */
  private relicPool(): string[] {
    return relicDraftPool(this.run, this.relicOpen());
  }

  /** Avisa as conquistas liberadas e grava. */
  /** Confere as conquistas guardadas (ex.: Well Equipped depois de comprar uma vantagem fora da partida) e avisa. */
  checkAchievements(): void {
    this.ach.check();
    this.flushAchievements();
  }

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

  /** O que a oferta de desafio usa da partida: o fluxo `challenges` (não mexe nos outros sorteios da seed). */
  private challengeWorld(): ChallengeWorld {
    const rr = this.rng.get("challenges");
    return { rng: rr, drawRelic: () => relicDraft(this.run, this.relicOpen(), () => rr.next(), 1)[0] };
  }

  /** Avisos dos desafios (challenges.lua `challenge_new/done/failed`): toast, som, conquista. */
  flushChallenges(): void {
    const news = this.challenges?.take();
    if (!news?.length) return;
    const run = this.run;
    for (const n of news) {
      const c = n.challenge;
      if (n.kind === "new") {
        this.events.toast(`NEW CHALLENGE: ${challengeName(c)} · ${challengeText(c, run)} By W${c.deadline} (${challengeReward(c, run.wave)})`, "#7fd4ff");
        this.audio.play("pickup");
      } else if (n.kind === "done") {
        this.events.toast(`CHALLENGE DONE: ${challengeName(c)} · ${challengeReward(c, run.wave)}`, "#9dff7a");
        const p = this.player;
        if (c.paid) this.fx.text(p.x, 2.8, p.z, `+${c.paid}g`, "gold");
        this.audio.play("rare");
        this.ach.challengeDone();
      } else {
        this.events.toast(`CHALLENGE EXPIRED: ${challengeName(c)}`, "#ff7a6a");
        this.audio.play("warn");
      }
    }
    this.flushAchievements();
    this.events.challenges?.();
  }

  /** shop_system.lua `roll` (C-04): a relíquia da Encomenda ocupa a vaga de relíquia até ser comprada. */
  private shopRelic(): string | undefined {
    const f = this.run.forcedShopRelic;
    if (f && !this.run.relics.includes(f) && !this.run.bannedRelics.includes(f)) return f;
    return this.drawRelics(1, "shop")[0];
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
    if (fresh) this.travelT = 0;
    this.warpPending = false;
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
    this.computeMods();
    this.shrineOpen = false;
    this.eventOffer = null;
    this.pactOffer = null;
    this.shopVisit = null;
    this.pendingShop = null;
    this.pendingPoolRelic = null;
    this.poolOpen = false;
    this.phase = "walk";
    this.phaseT = 0;
    this.bossEngaged = false;
    this.bossDead = false;
    this.nearPortal = false;
    if (this.world) this.world.portal.visible = false;
    const p = this.player;
    // na primeira onda da zona o herói começa na fogueira; nas outras, na entrada do trecho
    const gates = this.offerMap(z.index);
    this.offerDetours(z.index);
    if (zoneChanged) {
      // continuar com o mapa por escolher: o herói volta para a clareira de antes, onde estão os portões
      const at = z.index === 0 ? this.layout.spawn : gates ? this.layout.segments[z.index - 1] : this.segment.entry;
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
    this.probe.tag("zone");
    this.layout = generateZone(zone, seed);
    this.grid = new ObstacleGrid(this.layout.obstacles);
    this.world = buildWorld(this.scene, zone, this.layout);
    this.terrain.build(this.layout);
    this.pipeline.setGrade(zone);
    this.hemi.color.set(zone.ambient);
    this.hemi.groundColor.set(zone.ground[2]);
    this.hemi.intensity = zone.ambientIntensity;
    this.sun.color.set(zone.sun);
    this.sun.intensity = zone.sunIntensity;
    setZoneAtmosphere(this.scene, zone);
    // M16-01: compila os shaders da zona e dos efeitos agora, no carregamento, e não no primeiro golpe
    // (e os modelos dos inimigos da zona e dos chefes: esculpidos uma vez, ver `chars/build.ts`)
    this.settleT = TUNING.frame.settle;
    this.fx.lib.warm(this.layout.spawn.x, this.layout.spawn.z);
    const warmRigs = [...zone.enemies.map(([id]) => characterRig(id, "enemy")), characterRig(zone.enemies[0][0], "enemy", "champion"), characterRig(zone.enemies[0][0], "enemy", "summoned"),
      ...Object.keys(BOSSES).map((id) => characterRig(id, "boss"))];
    for (const r of warmRigs) {
      r.root.position.set(this.layout.spawn.x, 0, this.layout.spawn.z);
      this.scene.add(r.root);
    }
    this.pipeline.compile(this.scene, this.camera);
    // compilar não sobe a geometria: um desenho num alvo minúsculo, sem recorte, sobe os buffers agora e não no
    // primeiro inimigo (picos "geo" no começo da onda 1, registro de 2026-11-22)
    for (const r of warmRigs) r.root.traverse((o) => (o.frustumCulled = false));
    const prevTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(Game.warmTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(prevTarget);
    for (const r of warmRigs) disposeRig(r);
    this.fx.lib.clear();

    this.boss = null;
    this.bossEngaged = false;
    this.bossDead = false;
    this.bossReward = null;

    const p = this.player;
    p.x = this.layout.spawn.x;
    p.z = this.layout.spawn.z;
    p.rush?.fire?.kill();
    p.leap?.fx?.kill();
    p.leap = p.rush = null;
    this.endAegis(false);
    p.shadowUntil = 0;
    p.chillUntil = 0;
    p.hex = null;
    p.mark = null;
    p.armorBreak = null;
    p.dashT = 0;
    this.playerAlive = true;
    this.epics.reset();
    this.relicHooks.reset();
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
    this.hpBars.clear();
    this.gates.hide();
    this.detours.hide();
    this.detourGuard = null;
    for (const d of this.drops) d.mesh.removeFromParent();
    this.drops.length = 0;
    this.loot.clear();
    for (const b of this.bees) {
      b.fx?.kill();
      disposeRig(b.rig);
    }
    this.bees.length = 0;
    this.iceWalls.clear();
    this.rifts.clear();
    this.hazards.clear();
    this.affixes.clear();
    this.wardAuras.clear();
    for (const t of this.trails) this.disposeTrail(t);
    this.trails.length = 0;
    this.echoes.length = 0;
    for (const v of this.pools) this.disposePool(v);
    this.pools.length = 0;
    this.fx.clear();
    this.terrain.clear();
    this.world?.dispose();
    this.world = null;
    this.boss = null;
  }

  spawnEnemy(id: string, wave: number, x: number, z: number,
    opts: { champion?: boolean; summoned?: boolean; child?: boolean; aggro?: boolean; affixes?: readonly AffixId[] } = {}): Enemy {
    // M9-06: todo campeão tem afixo; o da onda já vem sorteado, os outros (guarda do baú) sorteiam aqui
    const affixes = opts.champion ? opts.affixes ?? rollAffixes(this.rng.get("champions"), wave) : opts.affixes;
    const e = new Enemy(this, enemyDef(id), wave, x, z, { ...opts, affixes });
    // D-637: o banco promete seus orbes aos inimigos que nascem (moeda sob os pés)
    if (!e.noReward && promisesBank(this.run.lootBank, this.lootReserved())) e.lootBonus = true;
    if (opts.aggro) {
      e.aggro = true;
      e.hunter = true;
    }
    this.enemies.push(e);
    return e;
  }

  /** loot.lua `reserved`: inimigos vivos com a promessa de um orbe do banco. */
  lootReserved(): number {
    let n = 0;
    for (const e of this.enemies) if (e.lootBonus && !e.dead) n++;
    return n;
  }

  /** Os orbes que chegaram ao herói: ouro, XP e o texto do ouro. */
  private collectLoot(dt: number): void {
    const got = this.loot.update(dt, this.player, this.playerAlive);
    for (const o of got) {
      if (o.gold > 0) {
        this.run.gold += o.gold;
        this.run.statistics.goldEarned += o.gold;
        this.fx.text(o.x, 1.8, o.z, `+${o.gold}g`, "gold");
      }
      if (o.xp > 0) this.gainXp(o.xp);
    }
    if (got.length) {
      this.challenges.gold();
      this.flushChallenges();
      this.audio.play("coin");
      this.epics.onOrbs(got.length);
    }
  }

  countSummons(): number {
    let n = 0;
    for (const e of this.enemies) if (e.summoned && !e.child && !e.dead) n++;
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
    pr.fx?.kill();
    pr.fx = undefined;
  }

  /**
   * `opt.curve`: o tiro gira a velocidade nessa taxa (rad/s; orbes do Mirage Djinn); `opt.reach`: alcance em m (padrão 26);
   * `opt.onEnd`: chamado onde o tiro acaba, pelo motivo que for (poça do Venom Bloom)
   */
  spawnEnemyProjectile(x: number, z: number, angle: number, speed: number, dmg: number, color: number, r: number, owner?: Enemy,
    opt: { curve?: number; reach?: number; onEnd?: (x: number, z: number) => void } = {}): void {
    this.addProjectile({ x, z, vx: Math.sin(angle) * speed, vz: Math.cos(angle) * speed, r, dmg, life: (opt.reach ?? 26) / speed, friendly: false,
      pierce: 0, ricochet: 0, ricochetDamage: 1, color, source: "projectile", owner, hex: owner?.def?.hex, curve: opt.curve, onEnd: opt.onEnd });
  }

  /**
   * Um tiro do herói. `opt.styled` = tiro do ataque básico, com as regras do estilo (H8): Heavy Shot na velocidade,
   * Pierce que atravessa (ou ricocheteia, no Zephyr e no Seraph), saltos e ramos do Kaelen, veneno da Vesper.
   */
  private firePlayer(angle: number, auto: AutoAttack, mult: number, rangeMult = 1,
    opt: { styled?: boolean; side?: number; fan?: boolean; icicle?: boolean } = {}): void {
    const p = this.player;
    const s = this.stats;
    const st = this.hero.style;
    const styled = opt.styled === true;
    const speed = (auto.speed ?? 24) * (styled ? s.projectileSpeed : 1);
    const base = auto.range * s.range * rangeMult;
    const range = styled ? autoReach(st, base, s.pierce, s.coneShot) : base;
    const ice = this.hero.frost === true;
    // Pingente (Frostine): o tiro depois de 3 acertos seguidos no mesmo alvo sai maior e x3
    const icicle = opt.icicle === true;
    // Arcane Strike pronto: o tiro sai carregado, roxo e maior (D-215)
    const charged = this.spells.arcaneReady;
    const bounce = styled && (st === "gunslinger" || st === "shieldthrow");
    // Seraph (shield_throw.lua): BOOMERANG troca os ricochetes por ida e volta; HOLY RICOCHET dá +2 que ferem mais
    const shield = styled && st === "shieldthrow";
    const boomerang = shield && s.shieldBoomerang > 0;
    const holy = shield && !boomerang && s.shieldRicochet > 0;
    let status = auto.status;
    if (styled && st === "venom" && status && s.doubleShot > 0) status = { ...status, maxStacks: (status.maxStacks ?? 1) + s.doubleShot };
    const side = opt.side ?? 0;
    const sx = Math.cos(angle) * side, sz = -Math.sin(angle) * side;
    this.addProjectile({
      x: p.x + Math.sin(angle) * 0.7 + sx, z: p.z + Math.cos(angle) * 0.7 + sz, vx: Math.sin(angle) * speed, vz: Math.cos(angle) * speed,
      r: 0.24 * (auto.size ?? 1) * (icicle ? 1.9 : 1) * (charged ? ARCANE_CHARGED.size : 1), dmg: mult * (icicle ? FROST.icicleMult : 1), life: range / speed, friendly: true,
      pierce: boomerang ? 1e9 : (auto.pierce ?? 0) + (styled && !bounce ? s.pierce : 0),
      ricochet: boomerang ? 0 : (auto.ricochet ?? 0) + (bounce ? s.pierce : 0) + (holy ? HERO_UPGRADES.holyBounces : 0),
      ricochetDamage: holy ? HERO_UPGRADES.holyMult : auto.ricochetDamage ?? 1,
      boomerang: boomerang ? { back: false } : undefined,
      status, color: icicle ? 0xf2fbff : charged ? ARCANE_CHARGED.color : auto.color, source: "auto", ice, icicle,
      crit: this.autoMod?.crit || undefined, knock: this.autoMod?.knock || undefined,
      styled: styled || undefined,
      flatRicochet: (styled && st === "gunslinger") || undefined,
      chainLeft: styled && st === "storm" && s.doubleShot > 0 ? s.doubleShot : undefined,
      forks: styled && st === "storm" && s.coneShot > 0 ? s.coneShot : undefined,
      poisonHits: styled && st === "venom" && s.doubleShot > 0 ? 1 + s.doubleShot : undefined,
      splash: styled && st === "venom" && opt.fan ? px(STYLE_VENOM.splash) : undefined,
      icicleSooner: styled && st === "frost" && s.doubleShot > 0 ? s.doubleShot : undefined,
      pointBlank: styled && s.pointBlank > 0 ? s.pointBlank : undefined,
    });
  }

  /** A rajada do ataque básico (Auto.fire): Cone em leque, Double lado a lado, o pingente só no primeiro tiro. */
  private volley(a: AutoAttack, dmg: number, angle: number): void {
    const s = this.stats;
    const n = patternCounts(this.hero.style, s.coneShot, s.doubleShot);
    const icicle = this.hero.frost === true && this.icicle.take();
    autoPattern(n.cone, n.double, angle).forEach((sh, i) =>
      this.firePlayer(sh.angle, a, dmg, 1, { styled: true, side: sh.side, fan: sh.fan, icicle: icicle && i === 0 }));
  }

  /**
   * Trick Shot (auto_attack.lua): a bala bate na borda da arena e volta, +20% de dano, com a lista de acertos e o
   * alcance zerados. Aqui a borda é a da clareira da onda (o herói não sai dela durante a luta, S30); a bala reflete
   * no círculo como lá reflete na parede. Fora da luta não há borda, e a bala some no fim do alcance como as outras.
   */
  private trickShot(pr: Projectile): void {
    if (this.phase !== "intro" && this.phase !== "fight") return;
    const sg = this.segment;
    const dx = pr.x - sg.x, dz = pr.z - sg.z, d = Math.hypot(dx, dz);
    if (d <= sg.r || d === 0) return;
    const nx = dx / d, nz = dz / d;
    const dot = pr.vx * nx + pr.vz * nz;
    if (dot <= 0) return;
    pr.vx -= 2 * dot * nx;
    pr.vz -= 2 * dot * nz;
    pr.x = sg.x + nx * sg.r;
    pr.z = sg.z + nz * sg.r;
    pr.bounces = (pr.bounces ?? 1) - 1;
    pr.dmg *= 1 + (pr.bounceGain ?? 0.2);
    pr.hit.clear();
    pr.life = pr.span ?? 1;
    if (pr.fx) {
      this.fx.lib.burst(pr.x, 1.15, pr.z, { radius: 0.8, color: TECH_FX.gun, core: TECH_FX.gunCore, rays: 4, sparks: 8, light: 0, dur: 0.16, wave: 0 });
    } else this.fx.burst(pr.x, 1.15, pr.z, 0xffe9b0, 10, 5, 0.1, 0.25, 2);
  }

  /**
   * shield_throw.lua `step` no modo "line" (BOOMERANG): no fim da ida (alcance ou parede) o escudo vira para o herói
   * e esquece quem acertou; na volta segue o herói. `turn` = chegou ao fim da ida (devolve true se virou); senão
   * devolve true quando o escudo voltou à mão.
   */
  private boomerangStep(pr: Projectile, turn: boolean): boolean {
    const b = pr.boomerang!;
    const p = this.player;
    const sp = Math.hypot(pr.vx, pr.vz) || 1;
    const dx = p.x - pr.x, dz = p.z - pr.z;
    const d = Math.hypot(dx, dz) || 1;
    if (turn) {
      if (b.back) return false;
      b.back = true;
      pr.hit.clear();
      pr.life = 4;
    } else if (d <= sp * 0.05 + 0.6) return true;
    pr.vx = (dx / d) * sp;
    pr.vz = (dz / d) * sp;
    return turn;
  }

  private updateProjectiles(dt: number): void {
    const p = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      // Time Rift: tiro inimigo dentro da fenda fica parado no ar (e não envelhece)
      const held = !pr.friendly && this.rifts.list.length > 0 && this.rifts.inside(pr.x, pr.z);
      if (!held) {
        pr.life -= dt;
        if (pr.curve) {
          const c = Math.cos(pr.curve * dt), sn = Math.sin(pr.curve * dt);
          const vx = pr.vx * c - pr.vz * sn;
          pr.vz = pr.vx * sn + pr.vz * c;
          pr.vx = vx;
          pr.mesh.rotation.y = Math.atan2(pr.vx, pr.vz);
        }
        pr.x += pr.vx * dt;
        pr.z += pr.vz * dt;
      }
      if (pr.friendly && pr.bounces && pr.bounces > 0) this.trickShot(pr);
      // o escudo do BOOMERANG volta à mão sem bater em parede
      let dead = pr.life <= 0 || (!pr.boomerang?.back && (this.grid.hits(pr.x, pr.z, pr.r * 0.5) || this.terrain.shot(pr.x, pr.z, pr.r)));
      if (dead && pr.boomerang && this.boomerangStep(pr, true)) dead = false;
      else if (!dead && pr.boomerang?.back && this.boomerangStep(pr, false)) dead = true;
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
            this.icicle.onHit(e, pr.icicle === true, pr.icicleSooner ?? 0);
            if (pr.icicle) {
              this.fx.burst(e.x, 1.2, e.z, 0xe8f8ff, 18, 7, 0.14, 0.45, 6);
              this.fx.text(e.x, 2.4, e.z, "Icicle", "frost");
            }
          }
          // H8 (§26): do 2º alvo em diante o tiro que atravessa fere 50%; o salto do Kaelen e o ricochete do Zephyr, 70%
          let dmg = pr.dmg;
          if (pr.styled && !first && !pr.boomerang) {
            dmg *= pr.chained ? STYLE_STORM.chainMult : pr.bounced ? (pr.flatRicochet ? pr.ricochetDamage : 1) : AUTO_SHOT.pierceFraction;
          }
          if (pr.pointBlank && (e.x - p.x) ** 2 + (e.z - p.z) ** 2 <= px(STYLE_GUN.pointBlankRange) ** 2) dmg *= 1 + pr.pointBlank;
          this.hitSource = pr.source === "auto" ? "auto" : "other";
          const sp = Math.hypot(pr.vx, pr.vz) || 1;
          const from = { x: pr.x - (pr.vx / sp) * 1.2, z: pr.z - (pr.vz / sp) * 1.2 };
          this.hitEnemy(e, dmg, pr.status, { ice: pr.ice, frostStacks: pr.icicle && first ? FROST.icicleStacks : undefined, crit: pr.crit && first ? true : undefined, from });
          if (pr.status && (pr.poisonHits || pr.splash)) this.venomExtras(e, pr, dmg);
          if (pr.forks && first) this.forkBolt(e, pr);
          if (pr.knock && first) this.epics.knock(e, pr.knock);
          this.hitSource = "other";
          if (pr.source === "auto") {
            this.spells.onAutoHit(e);
            if (first) this.autoKnock(e, pr.vx, pr.vz);
          }
          if (pr.push && !e.isBoss && !e.dead) {
            const sp = Math.hypot(pr.vx, pr.vz) || 1;
            e.kx += (pr.vx / sp) * pr.push * TUNING.enemy.knockback;
            e.kz += (pr.vz / sp) * pr.push * TUNING.enemy.knockback;
          }
          // Kaelen (D-590): o Double faz o raio saltar para o mais perto não atingido, sem gastar o Pierce
          if (pr.chainLeft && pr.chainLeft > 0) {
            const reach = px(STYLE_STORM.chainRange);
            const next = this.nearestEnemy(e.x, e.z, reach, pr.hit);
            if (next) {
              const sp = Math.hypot(pr.vx, pr.vz);
              const a = Math.atan2(next.x - pr.x, next.z - pr.z);
              pr.vx = Math.sin(a) * sp;
              pr.vz = Math.cos(a) * sp;
              pr.chainLeft--;
              pr.chained = true;
              pr.life = reach / sp;
              break;
            }
          }
          if (pr.ricochet > 0) {
            const next = this.nearestEnemy(e.x, e.z, 9, pr.hit);
            if (next) {
              const sp = Math.hypot(pr.vx, pr.vz);
              const a = Math.atan2(next.x - pr.x, next.z - pr.z);
              pr.vx = Math.sin(a) * sp;
              pr.vz = Math.cos(a) * sp;
              if (!pr.flatRicochet) pr.dmg *= pr.ricochetDamage;
              pr.bounced = true;
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
          // enemy_attacks.lua: a maldição só pega se o tiro não foi esquivado
          if (this.hurtPlayer(pr.dmg, pr.source, pr.owner) && pr.hex) this.hexPlayer(pr.hex.duration, pr.hex.damageMult);
          dead = true;
        }
      }
      if (dead) {
        this.fx.impact(pr.x, 1.15, pr.z, pr.color, 0.7);
        this.freeProjectile(pr);
        this.projectiles.splice(i, 1);
        pr.onEnd?.(pr.x, pr.z);
      } else {
        pr.mesh.position.set(pr.x, 1.15, pr.z);
        pr.fx?.push(pr.x, 1.15, pr.z);
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
  hitEnemy(e: Enemy, mult: number, status?: StatusSpec, hit?: { ice?: boolean; frostStacks?: number; crit?: boolean; noKnock?: boolean; element?: string; spell?: boolean; from?: HitFrom }): void {
    if (e.dead) return;
    const s = this.stats;
    const now = this.time;
    // M21-05: a reação olha o estado de antes do golpe
    const element = hit?.element ?? this.hitElement ?? (hit?.ice ? "ice" : null);
    const behind = isBehind(e.facing, e.x, e.z, this.player.x, this.player.z, REACTIONS.execution.backCone);
    const reaction = reactionFor(e.reactState(now), { kind: "hit", element, behind }, now);
    if (element) this.spells.infuse(e, element);
    // as spells só dão crítico com o Spell Crit (damage.lua `SPELL_SOURCES`, D-209); o ataque e as técnicas, com o da arma
    const spell = hit?.spell === true;
    const crit = hit?.crit === true || Math.random() < (spell ? s.spellCritChance : s.critChance);
    // ataque básico e técnicas levam o dano do ataque (autoDamagePct); as spells, não (D14)
    let amount = s.damage * (spell ? 1 : s.autoDamage) * mult * (0.9 + Math.random() * 0.2);
    if (this.techDepth > 0) amount *= s.techniqueDamage; // SIGNATURE (D-309)
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
    // Brittle Chill (Iceball, somado) e o dano em lento das relíquias (pool): inimigo com Slow recebe dano extra (damage.lua §37)
    if (now < e.slowUntil) amount *= (1 + this.spells.brittle) * s.slowedDamage;
    this.damageEnemy(e, amount, { crit, noKnock: hit?.noKnock, school: spell ? hit?.element : undefined, from: hit?.from });
    if (status && !e.dead && (status.chance === undefined || Math.random() < status.chance)) this.applyStatus(e, status, amount);
    if (back && e.dead) this.heal(s.maxHp * SHADOW.backstabKillHeal, true); // Umbra: matar pelas costas cura
    if (reaction) this.react(e, reaction);
    if (deepChill && !e.dead) {
      this.applyStatus(e, { kind: "stun", power: 1, duration: FROST.chillFreeze }, amount);
      e.chillUntil = Math.max(e.chillUntil, e.stunUntil);
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
    // D14: a queimadura e o veneno do ataque têm atributo próprio; a lentidão do ataque é fixa, como lá
    const potency = st.kind === "burn" ? this.stats.burn : st.kind === "poison" ? this.stats.poison : 1;
    if (st.kind === "slow") {
      // status.lua `applySlow`: não acumula (fica a mais forte); chefes levam 20%, ou até o teto da Frostine
      const v = st.power;
      const weak = v * SPELL_CAST.bossSlowEffect;
      const amount = e.isBoss ? (this.hero.frost ? Math.max(weak, Math.min(v, FROST.bossSlowCap)) : weak) : v;
      e.slowPower = now < e.slowUntil ? Math.max(e.slowPower, amount) : amount;
      e.slowUntil = Math.max(e.slowUntil, now + st.duration);
      if (this.hero.frost) e.chillUntil = Math.max(e.chillUntil, now + st.duration);
    } else if (st.kind === "stun") {
      // status.lua `applyStun`: chefes não são atordoados; renova, não acumula
      if (e.isBoss) return;
      e.stunUntil = Math.max(e.stunUntil, now + st.duration);
      e.windupT = -1;
    } else if (st.kind === "poison") {
      // S23: um veneno só por inimigo, dividido com a Venom Nova (status.lua `applyPoison`)
      // auto_attack.lua: máximo = o do tiro + `poisonStacks` do herói (Vesper +1)
      e.applyPoison(now, hitDamage * st.power * potency, st.duration, (st.maxStacks ?? 1) + this.stats.poisonStacks, undefined, "auto");
    } else {
      // S23/status.lua: uma queimadura só por inimigo, dividida com o Fireball
      e.applyBurn(now, hitDamage * st.power * potency, st.duration);
    }
  }

  damageEnemy(e: Enemy, amount: number, opts: { crit?: boolean; dot?: string; noKnock?: boolean; reaction?: ReactionId; school?: string; from?: HitFrom } = {}): void {
    if (e.dead) return;
    if (e.isBoss) amount *= this.stats.bossDamage; // damage.lua: Smite do Seraph (D-317)
    // EXECUTIONER (Varok): chefe abaixo de 30% da vida leva mais
    if (e.isBoss && this.stats.executioner > 0 && e.hp < e.maxHp * HERO_UPGRADES.executionerBelow) amount *= 1 + this.stats.executioner;
    if (this.stats.followThrough > 0 && this.time < this.player.followUntil) amount *= 1 + this.stats.followThrough;
    amount *= this.epics.damageMult();
    // M9-02 (damage.lua): herói amaldiçoado pelo Hexer causa menos dano, também por tempo
    amount *= hexMult(this.player.hex, this.time);
    // relic_mechanics.lua `schoolOf`: a escola da spell; a queimadura conta como fogo
    const school = opts.school ?? (opts.dot === "burn" ? "fire" : undefined);
    amount *= this.relicHooks.damageMult(this.relicWorld, { source: opts.dot ?? this.hitSource, school, boss: e.isBoss });
    // M9-01 (damage.lua): armadura do inimigo (Shieldbearer 20) e o escudo de frente; o dano por tempo não tem direção
    const armor = e.def?.armor ?? 0;
    if (armor) amount *= 1 - armorReduction(armor);
    let guarded = false;
    if ((e.def?.shield || e.boss?.guard) && !opts.dot && opts.from !== "none") {
      const p = this.player;
      const f = opts.from ?? p;
      const k = e.guardMult(f.x, f.z, p.x, p.z);
      guarded = k < 1;
      amount *= k;
    }
    // M9-04 (damage.lua §54): aliado dentro da aura de um Warden leva menos (depois da armadura e do escudo, como lá)
    const warden = wardenFor(e, this.enemies);
    if (warden) amount *= warden.def!.support!.damageMult;
    // M9-06 (damage.lua): Armored corta, o Arcane Shield come primeiro; qualquer dano zera a pausa do Regenerating
    amount *= e.dmgTakenMult * e.tetherK;
    amount = Math.max(1, Math.round(amount));
    e.idle = 0;
    if (e.shield > 0) {
      const absorbed = Math.min(e.shield, amount);
      e.shield -= absorbed;
      amount -= absorbed;
      if (e.shield <= 0) {
        this.fx.shockwave(e.x, e.z, e.radius * 2.4, 0xbf8cff, 0.3);
        this.fx.burst(e.x, e.rig.height * 0.5, e.z, 0xbf8cff, 14, 6, 0.16, 0.4);
        this.audio.play("crit");
      }
      if (amount <= 0) {
        e.flash = 0.5;
        if (!e.aggro) e.setAggro(this);
        if (!opts.dot) this.fx.text(e.x, e.rig.height + 0.3, e.z, String(absorbed), "frost");
        return;
      }
    }
    this.run.statistics.damage += Math.min(amount, Math.max(0, e.hp));
    e.hp -= amount;
    if (!e.aggro) e.setAggro(this);
    const top = e.rig.height + 0.3;
    if (opts.reaction) {
      e.flash = 1;
      this.fx.text(e.x, top, e.z, String(amount), opts.reaction === "shatter" ? "frost" : opts.reaction === "plague" ? "poison" : "crit");
    } else if (opts.dot) {
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
      this.fx.text(e.x, top, e.z, String(amount) + (opts.crit ? "!" : ""), guarded || warden ? "frost" : opts.crit ? "crit" : "dmg");
      this.fx.burst(e.x, e.rig.height * 0.6, e.z, guarded ? 0x9ad1ff : opts.crit ? 0xffe066 : 0xffffff, opts.crit ? 9 : 4, 5, 0.13, 0.3);
      this.audio.play(guarded ? "block" : opts.crit ? "crit" : "hit");
      if (opts.crit) {
        this.hitstop = Math.max(this.hitstop, 0.035);
        this.fx.addShake(0.12);
      }
    }
    if (e.hp <= 0) {
      if (opts.reaction) this.epics.onReactionKill(e, opts.reaction);
      this.killEnemy(e, opts.dot ? "dot" : this.hitSource);
    }
  }

  private killEnemy(e: Enemy, source: KillSource = "other"): void {
    e.dead = true;
    e.hp = 0;
    this.spreadOnKill(e);
    this.spells.onKill(e);
    this.epics.onKill();
    this.relicHooks.onKill(this.relicWorld, { ...this.relicFoe(e), maxHp: e.maxHp, champion: e.champion });
    this.ach.enemyKilled({ key: e, id: e.boss?.id ?? e.def!.id, boss: e.isBoss, champion: e.champion, source,
      elapsed: this.run.statistics.elapsed, noReward: e.summoned });
    this.challenges.killed({ key: e, boss: e.isBoss, champion: e.champion, technique: this.techDepth > 0 && source !== "dot",
      noReward: e.summoned, elapsed: this.run.statistics.elapsed });
    this.flushChallenges();
    if (this.ach.codexNews.length) this.codexSync();
    const color = e.boss?.color ?? e.def!.color;
    this.fx.burst(e.x, e.rig.height * 0.5, e.z, color, e.isBoss ? 80 : 14, e.isBoss ? 12 : 6, e.isBoss ? 0.3 : 0.18, e.isBoss ? 1.2 : 0.6);
    this.audio.play(e.isBoss ? "boss" : "kill");
    this.run.statistics.kills++;
    // D-147/D-150: matar um campeão abre a loja depois da onda e dá uma relíquia de risco (1 de 2)
    if (e.champion && !e.isBoss && !e.summoned && e !== this.detourGuard) {
      this.pendingShop = "champion";
      this.pendingPoolRelic ??= "risk";
    }
    if (this.stats.lifeOnKill > 0 && this.playerAlive) this.heal(this.stats.lifeOnKill, false);
    // BLOOD RITE e relíquias de cura ao matar: uma rolagem por morte na chance combinada (damage.lua §16)
    if (this.stats.deathHealChance > 0 && this.playerAlive && Math.random() < this.stats.deathHealChance) this.heal(UPGRADE_FX.deathHeal, false);
    // rewards.lua `enemyKill`: ouro e XP pela sala e dificuldade, campeão ×4,5, chefe com o tier (M7-01)
    // loot.lua (M7-02): cai como orbe no chão; o prometido leva também um orbe do banco
    const r = killReward({ gold: e.def?.gold ?? 0, xp: e.def?.xp ?? 0, champion: e.champion, bossWave: e.isBoss ? e.level : null,
      noReward: e.noReward, affixReward: e.affixK }, this.mods, this.stats.gold, { gold: this.stats.championGold, xp: this.stats.championXp });
    this.loot.drop(e.x, e.z, r.gold, r.xp, e.lootBonus ? this.run.lootBank : null);
    const split = e.def?.splitInto;
    if (split) {
      // ai.lua `onKill`: as crias saem em volta, em ângulos iguais
      for (let i = 0; i < split.count; i++) {
        const a = ((i + 1) / split.count) * Math.PI * 2;
        this.spawnEnemy(split.id, e.level, e.x + Math.cos(a) * 0.8, e.z + Math.sin(a) * 0.8, { summoned: true, child: true, aggro: true });
      }
    }
    if (!e.noReward) this.rollHealOrb(e);
    if (e.hasAffix("explosive")) this.affixes.explode(e);
    if (e.def?.plague) this.plagueBurst(e, e.def.plague);
    if (e.isBoss) this.onBossKilled(e);
  }

  /** ai.lua `onKill` (§54, D-069): o Plaguebearer estoura numa poça de peste que fere o herói por segundo, mais forte nas ondas altas. */
  private plagueBurst(e: Enemy, p: NonNullable<EnemyDef["plague"]>): void {
    const color = PLAGUE_COLOR;
    this.affixes.addPool(e.x, e.z, p.radius, p.duration, plagueDps(p, this.run.wave) * HAZARD_TICK, `${e.name} (plague)`, color);
    this.fx.burst(e.x, 0.5, e.z, color, 22, 5, 0.2, 0.7);
    this.fx.shockwave(e.x, e.z, p.radius, color, 0.4);
    this.audio.play("plague");
  }

  /**
   * techniques.lua `Tech.wildfire` e `Tech.contagion` (M20-12 parte 3): quem morre queimando passa a queimadura
   * para quem está perto (Ignis); quem morre envenenado passa metade dos acúmulos para o mais perto (Vesper).
   */
  private spreadOnKill(e: Enemy): void {
    const H = HERO_UPGRADES;
    const now = this.time;
    const burn = this.stats.wildfire > 0 ? e.dots.find((d) => d.kind === "burn" && d.until > now) : undefined;
    if (burn) {
      const r = px(H.wildfireRadiusPx);
      const dur = Math.max(H.wildfireMinTime, burn.until - now);
      for (const o of this.enemies) {
        if (o === e || o.dead || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > (r + o.radius) ** 2) continue;
        o.applyBurn(now, burn.dps, dur, burn.spell, burn.slot);
      }
      this.fx.lib.ring(e.x, e.z, { radius: r, color: 0xff6a1a, core: 0xffd27a, width: 0.35, from: 0.3, dust: 8, dur: 0.4 });
    }
    const po = this.stats.contagion > 0 ? e.dots.find((d) => d.kind === "poison" && d.until > now) : undefined;
    if (po) {
      const o = this.nearestEnemy(e.x, e.z, px(H.contagionRangePx), new Set([e]));
      if (o) {
        const n = Math.max(1, Math.ceil((po.stacks ?? 1) / 2));
        for (let k = 0; k < n; k++) o.applyPoison(now, po.dps, po.duration ?? Math.max(1, po.until - now), po.maxStacks ?? 1, undefined, po.spell);
        this.fx.burst(o.x, 1, o.z, 0x9dff7a, 10, 4, 0.1, 0.4, 2);
      }
    }
  }

  /** Orbe de cura (M21-03, cura no risco): chance por tipo de inimigo com ritmo (`PACE.healOrb`), teto por onda; o campeão sempre deixa. */
  private rollHealOrb(e: Enemy): void {
    const w = this.wave;
    if (!w || w.complete || !e.def) return;
    const o = pacedHealOrb({ id: e.def.id, category: e.def.category, champion: e.champion, boss: e.isBoss, summoned: e.summoned }, w.healOrbs);
    if (o.chance <= 0 || Math.random() >= o.chance) return;
    if (o.counts) w.healOrbs++;
    this.addDrop({ x: e.x, z: e.z, t: 0, life: PACE.healOrb.life });
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
      // pisca no fim da vida (M21-03)
      const left = d.life - d.t;
      core.visible = left > PACE.healOrb.blink || Math.sin(left * Math.PI * 2 * PACE.healOrb.blinkHz) > -0.2;
      core.rotation.y += dt * 2.2;
      core.position.y = Math.sin(d.t * 3) * 0.12 + Math.max(0, 1 - d.t * 3) * 1.2;
      if (d.t < 0.35 || !this.playerAlive) continue;
      const dist = Math.hypot(p.x - d.x, p.z - d.z);
      if (dist < PACE.healOrb.magnet && p.hp < this.stats.maxHp) {
        // orbes de cura são atraídos
        d.x += ((p.x - d.x) / dist) * PACE.healOrb.pullSpeed * dt;
        d.z += ((p.z - d.z) / dist) * PACE.healOrb.pullSpeed * dt;
        d.mesh.position.set(d.x, 0.6, d.z);
      }
      if (dist > TUNING.hero.pickupRadius) continue;
      if (p.hp >= this.stats.maxHp) continue;
      this.heal(this.stats.maxHp * PACE.healOrb.heal, true, true);
      this.audio.play("heal");
      this.epics.onOrbs(1);
      d.mesh.removeFromParent();
      this.drops.splice(i, 1);
    }
  }

  addRelic(id: string): void {
    if (!RELICS[id] || !grantRelic(this.run, id)) return;
    this.ach.relicFound(id);
    if (!this.shopBuying) {
      this.challenges.relicAcquired(id);
      this.flushChallenges();
    }
    const n = relicCopies(this.run.relics, id);
    this.events.toast(`Relic: ${RELICS[id].name}${n > 1 ? ` x${n}` : ""}`, "#ffc83d");
    this.codexSync();
    this.recompute();
    this.audio.play("rare");
    this.events.statusChanged();
  }

  /** O combate da onda está correndo: cura e regeneração valem `PACE.combatHealMult` (damage.lua). */
  get inCombat(): boolean {
    return !!this.wave && this.wave.started && !this.wave.complete;
  }

  // ---------------------------------------------------------------- DEV Grimoire (grimoire.lua, F1)

  /** Abrir o grimório marca a partida: sem checkpoint, sem registros e sem medalha (run.lua `devUsed`). */
  markDev(): void {
    this.run.devUsed = true;
    this.ach.devUsed = true;
  }

  /** relic_system.lua `devRemove` */
  devRemoveRelic(id: string): void {
    if (!removeRelic(this.run, id)) return;
    this.recompute();
    this.events.statusChanged();
  }

  devHealFull(): void {
    this.heal(this.stats.maxHp, true, true);
  }

  devResetCooldowns(): void {
    this.spells.cooldown.fill(0);
    this.player.techCd = 0;
  }

  /** Damage.killEnemy em todos: conta abate e dá XP, como lá. */
  devKillAll(): number {
    const alive = this.enemies.filter((e) => !e.dead);
    for (const e of alive) {
      e.hp = 0;
      this.killEnemy(e, "other");
    }
    return alive.length;
  }

  /** WaveSystem.complete na onda em curso; false se não há luta. */
  devEndWave(): boolean {
    if (this.phase !== "fight" || !this.wave || this.wave.complete) return false;
    this.completeWave();
    return true;
  }

  /** M13-02 Depths 3 (Wounds, damage.lua `healPlayer`): a cura recebida, regeneração junto */
  private get woundsMult(): number {
    return mutation(depthsLevel(this.run.difficultyId), "wounds")?.healMult ?? 1;
  }

  /** `full`: o orbe de cura não sofre o corte do combate. */
  heal(amount: number, show: boolean, full = false): void {
    const p = this.player;
    const before = p.hp;
    // Berserker's Oath e afins: a cura é recusada durante a onda (relic_mechanics.lua `blocksHeal`)
    if (!full && this.relicHooks.blocksHeal(this.relicWorld)) return;
    if (!full) amount *= this.stats.healing; // damage.lua `healPlayer`: armadura e `healPct`
    amount *= this.woundsMult;
    if (this.inCombat && !full) amount *= PACE.combatHealMult;
    this.relicHooks.overheal(this.relicWorld, p.hp + amount - this.stats.maxHp);
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
    const level0 = s.level;
    if (addXp(s, amount, this.stats.xp)) {
      this.relicHooks.onLevelUp(this.relicWorld, s.level - level0);
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
    const ids = draftLevelUp(run, rng);
    if (ids.length === 0) {
      run.pendingLevelUps = 0;
      return;
    }
    this.levelUpIndex++;
    this.levelUp = {
      ids, tiers: draftTiers(run, rng, ids), rerolls: 0,
      index: this.levelUpIndex, total: this.levelUpIndex - 1 + run.pendingLevelUps,
    };
    // C-13: a troca grátis ganha num desafio vale só para esta tela de nível
    if (run.freeLevelUpReroll === "next") run.freeLevelUpReroll = "active";
    this.events.levelUp();
  }

  /** run_drafts.lua `rerollLevelUp`: paga ouro e sorteia as 3 de novo (raridades também). */
  rerollLevelUp(): boolean {
    const L = this.levelUp;
    if (!L || rerollsLeft(L.rerolls) <= 0) return false;
    const cost = this.levelRerollCost();
    if (this.run.gold < cost) return false;
    this.run.gold -= cost;
    this.run.statistics.goldSpent += cost;
    if (this.run.freeLevelUpReroll === "active") this.run.freeLevelUpReroll = null;
    const rng = this.rng.get("levelup");
    L.ids = draftLevelUp(this.run, rng);
    L.tiers = draftTiers(this.run, rng, L.ids);
    L.rerolls++;
    this.audio.play("pickup");
    this.events.levelUp();
    return true;
  }

  /** level_up.lua `rerollCost`: grátis com a troca do desafio (C-13) */
  levelRerollCost(): number {
    return this.run.freeLevelUpReroll === "active" ? 0 : rerollCost(this.run);
  }

  /** run_drafts.lua `chooseUpgrade`; a vida máxima sobe junto (`refreshMaxHp`), Vitality cura tudo. */
  chooseUpgrade(index: number): void {
    const L = this.levelUp;
    const id = L?.ids[index];
    if (!L || !id) return;
    const before = this.stats.maxHp;
    const u = applyUpgrade(this.run, id, L.tiers[index]);
    this.levelUp = null;
    // C-13: a troca grátis não usada se perde
    if (this.run.freeLevelUpReroll === "active") this.run.freeLevelUpReroll = null;
    this.recompute();
    this.challenges.checkLevels();
    this.flushChallenges();
    const p = this.player;
    if (u.fullHeal) p.hp = this.stats.maxHp;
    else if (this.stats.maxHp > before) p.hp += this.stats.maxHp - before;
    p.hp = Math.min(p.hp, this.stats.maxHp);
    this.fx.burst(p.x, 1.5, p.z, 0xffe066, 24, 6, 0.14, 0.7, 4);
    this.codexSync();
    if (this.run.pendingLevelUps > 0) this.openLevelUp();
    else this.levelUpIndex = 0;
  }

  /** run_drafts.lua `chooseEvolution`: a spell evolui; as outras spells são oferecidas de novo no quadro seguinte. */
  chooseEvolution(index: number): void {
    const o = this.evolutionOffer?.[index];
    if (!o) return;
    applyEvolution(this.run, o.slotIndex, o.evoId);
    this.evolutionOffer = null;
    this.ach.spellEvolved(o.evoId);
    this.flushAchievements();
    this.codexSync();
    this.challenges.spellEvolved(o.evoId);
    this.flushChallenges();
    this.recompute();
    const p = this.player;
    this.fx.burst(p.x, 1.5, p.z, 0xc77dff, 32, 7, 0.16, 0.9, 5);
    this.audio.play("level");
    this.events.statusChanged();
  }

  /** run_drafts.lua `chooseRelicEvolution`: as peças somem e entra a evoluída (A + B → C). */
  chooseRelicEvolution(index: number): void {
    const id = this.relicEvoOffer?.[index];
    if (!id) return;
    const parts = RELICS[id].requires!.map((c) => RELICS[c].name).join(" + ");
    evolveRelic(this.run, id);
    this.relicEvoOffer = null;
    this.ach.relicFound(id);
    this.flushAchievements();
    this.codexSync();
    this.recompute();
    const p = this.player;
    this.fx.burst(p.x, 1.5, p.z, 0xffc83d, 32, 7, 0.16, 0.9, 5);
    this.audio.play("level");
    this.events.toast(`Relic evolved: ${parts} → ${RELICS[id].name}`, "#ffc83d");
    this.events.statusChanged();
  }

  /** run_drafts.lua `skipRelicEvolution`: recusa até a coleção de relíquias mudar. */
  skipRelicEvolution(): void {
    if (!this.relicEvoOffer) return;
    declineRelicEvolutions(this.run, this.relicEvoOffer);
    this.relicEvoOffer = null;
  }

  /** run_drafts.lua `skipEvolution`: recusa até a coleção de relíquias mudar. */
  skipEvolution(): void {
    if (!this.evolutionOffer) return;
    declineEvolutions(this.run, this.evolutionOffer);
    this.evolutionOffer = null;
  }

  /** `attacker`: quem bateu (JUDGEMENT devolve o golpe bloqueado pelo Aegis). */
  /** Devolve se o golpe pegou (não esquivado, não bloqueado pelo Aegis). */
  /** enemy_attacks.lua `p.chill`: o herói anda a `mult` da velocidade por `time` s (o novo substitui o anterior) */
  chillPlayer(mult: number, time: number): void {
    const p = this.player;
    if (this.time >= p.chillUntil) this.fx.text(p.x, 2.2, p.z, "Chilled", "frost");
    p.chillUntil = this.time + time;
    p.chillMult = mult;
  }

  hurtPlayer(amount: number, source: string, attacker?: Enemy): boolean {
    void source;
    const p = this.player;
    if (!this.playerAlive) return false;
    if (p.iframes > 0) {
      if (p.dashT > 0) this.epics.onAvoided();
      return false;
    }
    if (Math.random() < this.stats.dodge) {
      this.fx.text(p.x, 2.6, p.z, "Dodge", "dodge");
      p.iframes = 0.15;
      this.ach.dodge();
      // NIGHTFALL (Umbra): cada esquiva tira 0,5 s da recarga da técnica
      if (this.stats.nightfall > 0 && p.techCd > 0) p.techCd = Math.max(0, p.techCd - HERO_UPGRADES.nightfallCdr * this.stats.nightfall);
      return false;
    }
    if (p.aegis?.block) {
      // Aegis: o escudo come o golpe inteiro
      p.aegis.block = false;
      p.iframes = 0.2;
      this.fx.text(p.x, 2.6, p.z, "Blocked", "frost");
      // M5-03: o escudo brilha forte no golpe e as luzes em órbita perdem força (não bloqueia mais)
      this.fx.lib.burst(p.x, 1.6, p.z, { radius: 2.4, color: TECH_FX.holy, core: 0xffffff, rays: 9, sparks: 28, light: 2.6, dur: 0.2, wave: 0, curve: "flash" });
      this.fx.lib.ring(p.x, p.z, { radius: 2.6, color: TECH_FX.holy, core: TECH_FX.holyCore, width: 0.4, from: 0.45, dust: 12, dur: 0.3 });
      // estilhaços de luz voando para fora: o escudo se gastou
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
        this.fx.glow(p.x + Math.sin(a) * 1.2, 1.2 + Math.random() * 0.6, p.z + Math.cos(a) * 1.2, TECH_FX.holyCore, 0.35, 0.4,
          Math.sin(a) * 7, 2 + Math.random() * 2, Math.cos(a) * 7, 8);
      }
      this.fx.addShake(0.18);
      p.aegis.fx.power = 0.45;
      this.audio.play("crit");
      // JUDGEMENT (Seraph): o golpe bloqueado volta para quem bateu, ×2
      if (this.stats.judgement > 0 && attacker && !attacker.dead) {
        this.damageEnemy(attacker, amount * HERO_UPGRADES.judgementMult * this.stats.judgement);
        this.fx.lib.burst(attacker.x, 1.4, attacker.z, { radius: 1.4, color: TECH_FX.holy, core: TECH_FX.holyCore, rays: 6, sparks: 12, light: 1.4, dur: 0.18, wave: 0 });
      }
      return false;
    }
    // damage.lua: a armadura do golpe já conta o Armorbreak do Iron Colossus (sem ele, igual a `stats.damageTaken`)
    amount *= armorTakenMult(this.stats.armor, p.armorBreak, this.time);
    amount = this.epics.incoming(amount);
    if (this.hero.maxHitFraction) amount = Math.min(amount, this.stats.maxHp * this.hero.maxHitFraction);
    amount = Math.max(1, Math.round(amount));
    // escudo de relíquia come primeiro (relic_mechanics.lua `absorb`)
    amount = Math.round(this.relicHooks.absorb(this.relicWorld, amount));
    if (amount <= 0) return true;
    this.run.statistics.damageTaken += Math.min(amount, p.hp);
    p.hp -= amount;
    // M13-02 Reserve Potion (damage.lua, D-228): uma vez por partida, abaixo de 20% cura 30% (sem o corte da Wounds)
    const potion = reservePotion(this.run, p.hp, this.stats.maxHp);
    if (potion > 0) {
      p.hp += potion;
      this.run.statistics.healed += potion;
      this.fx.text(p.x, 3.2, p.z, "Reserve Potion", "heal");
      this.fx.text(p.x, 2.6, p.z, "+" + Math.round(potion), "heal");
      this.fx.burst(p.x, 1.2, p.z, 0x5fd35f, 18, 4, 0.14, 0.6, 2);
      this.audio.play("pickup");
    }
    this.challenges.hit(amount);
    this.flushChallenges();
    this.relicHooks.onPlayerHit(this.relicWorld, amount);
    if (attacker?.affixes.length) this.affixes.onHit(attacker, (mult, time) => this.chillPlayer(mult, time));
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
      p.rush?.fire?.kill();
      p.leap?.fx?.kill();
      p.leap = p.rush = null;
      this.endAegis(false);
      this.run.killedBy = source;
      this.events.died();
    }
    return true;
  }

  /** M9-02 (enemy_attacks.lua `applyHex`): o herói amaldiçoado causa `mult` do dano por `duration` s; renova sem acumular. */
  hexPlayer(duration: number, mult: number): void {
    const p = this.player;
    if (!this.playerAlive) return;
    const fresh = !p.hex || p.hex.until <= this.time;
    p.hex = applyHex(p.hex, this.time, duration, mult);
    if (fresh) this.fx.text(p.x, 2.2, p.z, "Hexed", "poison");
    this.fx.burst(p.x, 1.6, p.z, ENEMIES.hexer.accent, 10, 3, 0.12, 0.5);
    this.audio.play("hex");
  }

  /** M10-08 (boss_ai.lua `armorbreak`): o herói perde `armor` de armadura (negativa) por `time` s; troca a quebra anterior. */
  armorBreakPlayer(time: number, armor: number): void {
    const p = this.player;
    if (!this.playerAlive) return;
    p.armorBreak = applyArmorBreak(this.time, time, armor);
    this.fx.text(p.x, 2.2, p.z, "Armorbreak", "crit");
    this.fx.burst(p.x, 1.4, p.z, 0xb3b8c7, 12, 4, 0.12, 0.5);
  }

  /** M10-01 (boss_ai.lua `mark`): o chefe marca o herói por `time` s; o dano dele sai ×`mult` (troca a marca anterior). */
  markPlayer(by: Enemy, time: number, mult: number): void {
    const p = this.player;
    if (!this.playerAlive) return;
    p.mark = applyMark(this.time, time, mult, by);
    this.fx.text(p.x, 2.2, p.z, "MARKED", "crit");
    this.fx.burst(p.x, 1.6, p.z, by.boss?.glow ?? 0xff5a4a, 12, 3, 0.12, 0.5);
    this.audio.play("hex");
  }

  /**
   * M21-10: barril explodindo. Fere todos no raio por fração da vida máxima (inimigo comum, campeão, chefe), o herói
   * também, empurra para fora do centro (pode jogar no fosso) e acende os barris vizinhos.
   */
  private barrelBlast(x: number, z: number): void {
    const B = TERRAIN.barrel;
    const r = B.blastRadius;
    this.fx.shockwave(x, z, r, 0xff7a2a, 0.4);
    this.fx.burst(x, 0.7, z, 0xffa040, 34, 10, 0.2, 0.6, 8);
    this.fx.burst(x, 0.5, z, 0x5a3a22, 14, 6, 0.16, 0.7, 14);
    this.fx.flashLight(x, 1.5, z, 0xff8a3a, 90, 0.45);
    this.fx.addShake(0.35);
    this.audio.play("boom");
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - x, dz = e.z - z, d = Math.hypot(dx, dz);
      if (d > r + e.radius) continue;
      const frac = e.isBoss ? B.bossDamage : e.champion ? B.championDamage : B.damage;
      this.hitSource = "other";
      this.damageEnemy(e, e.maxHp * frac, { noKnock: true });
      if (e.isBoss) continue;
      const nx = d > 0.05 ? dx / d : Math.random() - 0.5, nz = d > 0.05 ? dz / d : Math.random() - 0.5;
      const nl = Math.hypot(nx, nz) || 1;
      e.kx += (nx / nl) * B.knock * TUNING.enemy.knockback;
      e.kz += (nz / nl) * B.knock * TUNING.enemy.knockback;
    }
    const p = this.player;
    if (Math.hypot(p.x - x, p.z - z) < r + 0.3) this.hurtPlayer(this.stats.maxHp * B.playerDamage, "Explosive Barrel");
    this.terrain.strike(x, z, r);
  }

  /** M21-10: o inimigo empurrado passou da beirada do fosso: cai e morre (o loot fica na beirada). */
  fallEnemy(e: Enemy, pit: { x: number; z: number; r: number }): void {
    const dx = e.x - pit.x, dz = e.z - pit.z, d = Math.hypot(dx, dz) || 1;
    const x = e.x, z = e.z;
    e.x = pit.x + (dx / d) * (pit.r + 0.8);
    e.z = pit.z + (dz / d) * (pit.r + 0.8);
    this.fx.text(e.x, e.rig.height + 0.3, e.z, "Fell!", "crit");
    this.killEnemy(e, "other");
    e.x = x;
    e.z = z;
    e.fell = { x: pit.x, z: pit.z };
    e.kx = e.kz = 0;
    this.fx.burst(x, 0.2, z, 0x3a2c20, 10, 3, 0.14, 0.5, 6);
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
    for (const m of this.enemies) if ((m.summoned || m.def?.helper) && !m.dead) this.damageEnemy(m, m.hp + 1, { dot: "burn" });
    // D-150: a emboscada é um nó de risco: dá a relíquia de risco (1 de 2), não a escolha de chefe
    if (e.ambush) {
      this.pendingPoolRelic = "risk";
      return;
    }
    const rr = this.rng.get("relics");
    // boss_rewards.lua: até uma premium (35%), a da build do chefe antes (relíquias abertas que o herói não tem)
    const open = this.relicOpen();
    const owned = RELIC_IDS.filter((id) => this.run.relics.includes(id) || !open(id));
    const { offer } = bossRelicOffer(owned, e.boss?.relicBuild, (k) => this.drawRelics(k),
      BOSS.relicChoices + takeBossRelicBonus(this.run), () => rr.next(), BOSS.premiumChance);
    // a escolha de relíquia só depois que o corpo do chefe se desfaz (a escolha pausa o jogo)
    this.bossReward = () => {
      if (offer.length) this.events.relicChoice(offer, (id) => {
        this.addRelic(id);
        // escolhida já na onda seguinte (entrou no portal antes): o checkpoint dela precisa da relíquia
        if (this.phase === "walk") this.saveCheckpoint();
      }, undefined, this.relicBan((k) => this.drawRelics(k)), this.relicReroll((k) => bossRelicOffer(owned, e.boss?.relicBuild,
        (j) => this.drawRelics(j), k, () => rr.next(), BOSS.premiumChance).offer));
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
      this.travelT += raw;
      this.walkDetours(dt);
      if (!this.mapResolved) {
        this.walkGates(dt);
        return;
      }
      // M21-14: com a carta resolvida (depois do santuário ou da loja do portão) a viagem sai; sem portões, E leva
      if (this.playerAlive && !this.shrineOpen && !this.shopVisit) {
        if (this.warpPending || (this.nearDetour < 0 && this.input.wasPressed("KeyE"))) this.warp();
      }
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
      const step = stepWave(w, dt, { alive, bossAlive }, this.rng.get("spawns"), this.rng.get("champions"), this.mods.heroChampionShare);
      // M21-13: quem nasce no mesmo passo é um grupo, perto do herói
      const pack = step.spawns.length ? this.packPoint() : null;
      for (const sp of step.spawns) this.queueSpawn(sp, false, pack);
      if (w.spawned >= w.target && !this.markers.length && alive <= PACE.straggler.count) this.rushStragglers();
      if (step.ambush) this.queueAmbush();
      if (step.completed) this.completeWave();
      return;
    }
    // depois do chefe, o portal (e a vitória) só abrem com a relíquia já entregue: as telas não se atropelam
    if (this.phase === "cleared" && this.phaseT >= RUN_TUNING.clearedTime && !this.bossReward) {
      // R19: depois da relíquia do chefe, a relíquia exclusiva (risco ou maldição)
      if (this.poolOpen) return;
      if (this.pendingPoolRelic && this.playerAlive) {
        const pool = this.pendingPoolRelic;
        this.pendingPoolRelic = null;
        if (this.openPoolDraft(pool)) return;
      }
      // R17: os níveis ganhos na onda viram escolhas agora, um de cada vez
      if (this.levelUp) return;
      if (this.run.pendingLevelUps > 0 && this.playerAlive) {
        this.openLevelUp();
        if (this.levelUp) return;
      }
      // S18: depois do nível, a evolução de spell (também volta aqui depois da relíquia do santuário)
      if (this.evolutionOffer) return;
      if (this.playerAlive) {
        this.evolutionOffer = pendingEvolutionOffer(this.run, this.rng.get("evolution"));
        if (this.evolutionOffer) {
          this.events.evolution();
          return;
        }
      }
      // M12-08: depois da evolução de spell, a de relíquia (run_drafts.lua `refreshIntermission`)
      if (this.relicEvoOffer) return;
      if (this.playerAlive) {
        this.relicEvoOffer = pendingRelicEvolutionOffer(this.run, (a) => this.rng.get("evolution").shuffle(a));
        if (this.relicEvoOffer) {
          this.events.relicEvolution();
          return;
        }
      }
      // R19: a loja automática antes do mapa; ela nunca trava a onda (sair é sempre possível)
      if (this.shopVisit) return;
      // M21-09: o atalho pula a próxima loja automática
      if (this.pendingShop && this.run.skipShop && this.run.wave !== TOTAL_WAVES) {
        this.run.skipShop = false;
        this.pendingShop = null;
        this.events.banner("Shop skipped", "You took the hidden path");
      }
      if (this.pendingShop && this.playerAlive && this.run.wave !== TOTAL_WAVES) {
        this.openShop(this.pendingShop);
        this.pendingShop = null;
        return;
      }
      this.pendingShop = null;
      // M21-08: o mapa da onda seguinte sai em portões, na caminhada (`prepareWave`)
      if (isBossWave(this.run.wave)) this.openPortal();
      else this.prepareWave(this.run.wave + 1);
    }
  }

  /** O herói entrou na clareira: letreiro "Onda N" e a clareira fecha. */
  private beginWave(): void {
    const n = this.run.wave;
    this.waveTravel = this.travelT;
    this.travelT = 0;
    this.endDetours();
    this.wave = startWave(n, this.rng.get("champions"), (id) => id in ENEMIES, this.mods);
    this.ach.waveStart(n);
    this.challenges.waveStart(n, this.challengeWorld());
    this.flushChallenges();
    this.phase = "intro";
    this.phaseT = 0;
    this.showRing(true);
    const boss = this.wave.isBossWave;
    // D6/M20-09: o chefe sai do saco (boss_bag.lua) ao começar a onda; continuar do checkpoint tira o mesmo
    this.waveBoss = boss ? drawBoss(this.run, this.rng.get("bosses"), this.bossPool()) : null;
    this.crown = boss && n === BOSS.final.wave ? this.crownPattern(this.waveBoss!) : null;
    const room = this.mods.room;
    const sub = this.waveBoss ? `${n === BOSS.final.wave ? CROWN_TITLE : BOSSES[this.waveBoss].name} approaches` : room ? `${room.name}` : this.zone.name;
    // M13-02: a onda 1 das Depths lembra as mutações da partida
    const dl = depthsLevel(this.run.difficultyId);
    this.events.banner(`Wave ${n}${n <= TOTAL_WAVES ? ` / ${TOTAL_WAVES}` : ""}`, n === 1 && dl ? `${sub} · ${depthsSummary(dl)}` : sub);
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

  /**
   * M21-13: o centro de um grupo: a `PACE.packDistance` m do herói, dentro da clareira (16 tentativas; sem lugar,
   * o ponto da borda longe do herói, como antes).
   */
  private packPoint(): { x: number; z: number } {
    const sg = this.segment, p = this.player;
    const [d0, d1] = PACE.packDistance;
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = d0 + Math.random() * (d1 - d0);
      const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      if (Math.hypot(x - sg.x, z - sg.z) < sg.r - 1.5 && !this.grid.hits(x, z, 0.8)) return { x, z };
    }
    return this.edgePoint();
  }

  /**
   * M21-13: setas na borda da tela para as sobras da onda fora dela: posição em px (já presa à borda, `pad` px para
   * dentro) e ângulo da seta. Vazio fora da luta ou sem sobras.
   */
  stragglerArrows(w: number, h: number, pad: number): { x: number; y: number; angle: number }[] {
    if (this.phase !== "fight") return [];
    const out: { x: number; y: number; angle: number }[] = [];
    const v = Game.arrowV;
    for (const e of this.enemies) {
      if (e.dead || !e.straggler) continue;
      v.set(e.x, 1, e.z).project(this.camera);
      const behind = v.z > 1;
      let sx = v.x, sy = -v.y;
      if (behind) { sx = -sx; sy = -sy; }
      if (!behind && Math.abs(sx) < 0.95 && Math.abs(sy) < 0.95) continue;
      // da tela ao centro: prende na borda
      const k = 1 / Math.max(Math.abs(sx), Math.abs(sy), 1e-6);
      const ex = sx * k, ey = sy * k;
      out.push({
        x: Math.max(pad, Math.min(w - pad, ((ex + 1) / 2) * w)),
        y: Math.max(pad, Math.min(h - pad, ((ey + 1) / 2) * h)),
        angle: Math.atan2(sy * h, sx * w),
      });
    }
    return out;
  }
  private static arrowV = new THREE.Vector3();
  private static warmTarget = new THREE.WebGLRenderTarget(4, 4);

  /**
   * Quanto um inimigo pode avançar de (x, z) na direção (dx, dz) sem sair da clareira da luta (o raio dele fora);
   * fora da luta, ou de fora da clareira, sem limite. Para as investidas.
   */
  arenaReach(x: number, z: number, dx: number, dz: number, radius: number): number {
    const sg = this.segment;
    if (!sg || (this.phase !== "fight" && this.phase !== "intro")) return Infinity;
    const R = sg.r - radius - 0.3;
    const ox = x - sg.x, oz = z - sg.z;
    const c = ox * ox + oz * oz - R * R;
    if (c > 0) return Infinity;
    const b = ox * dx + oz * dz;
    return Math.max(0, -b + Math.sqrt(b * b - c));
  }

  /** Devolve o inimigo para dentro da clareira da luta se ele passou da borda; true se precisou. */
  keepInArena(e: { x: number; z: number; radius: number }): boolean {
    const sg = this.segment;
    if (!sg || this.phase !== "fight") return false;
    const R = sg.r - e.radius - 0.3;
    const ox = e.x - sg.x, oz = e.z - sg.z, d = Math.hypot(ox, oz);
    if (d <= R || d > sg.r + 6) return false;
    e.x = sg.x + (ox / d) * R;
    e.z = sg.z + (oz / d) * R;
    return true;
  }

  /** M21-13: os últimos vivos correm até o herói, sem voltar para casa. */
  private rushStragglers(): void {
    for (const e of this.enemies) {
      if (e.dead || e.isBoss || e.straggler) continue;
      e.straggler = true;
      e.hunter = true;
      if (!e.aggro) e.setAggro(this);
    }
  }

  private queueSpawn(spawn: WaveSpawn, boss = false, pack: { x: number; z: number } | null = null): void {
    const S = PACE.packSpread;
    let at = boss ? this.bossPoint()
      : pack ? { x: pack.x + (Math.random() - 0.5) * 2 * S, z: pack.z + (Math.random() - 0.5) * 2 * S }
      : this.edgePoint();
    if (pack && !boss && spawn.rank) {
      // M9-07: frente mais perto do herói, atiradores atrás da linha (sem sair da clareira)
      const dx = pack.x - this.player.x, dz = pack.z - this.player.z, d = Math.hypot(dx, dz) || 1;
      const k = CAMP_RANK_OFFSET[spawn.rank];
      const x = at.x + (dx / d) * k, z = at.z + (dz / d) * k, sg = this.segment;
      if (!sg || (Math.hypot(x - sg.x, z - sg.z) < sg.r - 1.2 && !this.grid.hits(x, z, 0.6))) at = { x, z };
    }
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

  /** Chefes que podem sair do saco: os de `bosses.lua` que já têm luta aqui (hoje os 4; os do `M10` entram depois). */
  static readonly BOSS_POOL: readonly string[] = BOSS_ORDER.filter((id) => id in BOSSES);

  /** boss_bag.lua `rebuild`: os chefes do saco nesta dificuldade (`minDifficulty`, M10-03). */
  private bossPool(): readonly string[] {
    return Game.BOSS_POOL.filter((id) => bossAllowed(BOSSES[id].minDifficulty, this.run.difficultyId));
  }

  /** `WaveSystem.crownAttack`: o padrão de outro chefe, de um tipo que o rei não tem (D-640). */
  private crownPattern(id: string): BossPattern | null {
    const own = BOSSES[id].patterns.map((p) => p.kind);
    const kind = crownAttack(own, CROWN_BORROW, this.rng.get("bosses"));
    if (!kind) return null;
    for (const other of Game.BOSS_POOL) {
      const pt = BOSSES[other].patterns.find((p) => p.kind === kind);
      if (pt) return pt;
    }
    return null;
  }

  private queueBoss(): void {
    this.queueSpawn({ id: this.waveBoss ?? Game.BOSS_POOL[0], champion: false }, true);
  }

  /** §7.9/§70 Emboscada: um chefe enfraquecido entra na onda normal; sai do mesmo saco das ondas de chefe. */
  private queueAmbush(): void {
    const id = drawBoss(this.run, this.rng.get("bosses"), this.bossPool());
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
        // M13-02 Depths 4 e 5 (boss.lua, spawner.lua `queueBoss`): fúria antes e 1 afixo em todo chefe
        const lvl = this.mods.depths;
        const fury = mutation(lvl, "early_fury");
        const marked = mutation(lvl, "marked_bosses");
        const affixes = marked ? rollAffixes(this.rng.get("champions"), this.run.wave, marked.affixes!, marked.affixes!,
          Object.keys(marked.exclude ?? {}) as AffixId[]) : undefined;
        const e = new Enemy(this, BOSSES[m.spawn.id], this.run.wave, m.x, m.z, { final, ambush, crownAttack: final ? this.crown : null,
          affixes, fury: fury ? { enrageBonus: fury.enrageBonus!, enragedSpeed: fury.enragedSpeed! } : null });
        this.ach.bossSpawned(e, this.run.statistics.elapsed);
        this.challenges.bossSpawned(e, this.run.statistics.elapsed);
        e.hunter = true;
        this.boss = e;
        this.enemies.push(e);
        e.setAggro(this);
      } else {
        const e = this.spawnEnemy(m.spawn.id, this.run.wave, m.x, m.z, { champion: m.spawn.champion, affixes: m.spawn.affixes, aggro: true });
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
        const r = survivorReward(e.def, e.champion, this.mods, this.stats.gold,
          { gold: this.stats.championGold, xp: this.stats.championXp }, this.stats.survivor, e.affixK);
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
    // D-618: o ouro e o XP que ficaram no chão vão para o banco e voltam como orbe "2x" nas próximas ondas
    if (this.loot.bank(run.lootBank) > 0) this.audio.play("bank");
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
    if (this.playerAlive) {
      this.challenges.waveComplete(run.wave, { hastened: w.hastened, hpFrac: this.player.hp / this.stats.maxHp });
      this.flushChallenges();
    }
    if (w.isBossWave && w.bossesDefeated && run.wave === TOTAL_WAVES) {
      run.victory = true;
      // M13-02 (core/depths.lua `award`, D-227): as Marcas da vitória nas Depths, uma vez por partida
      const lvl = depthsLevel(run.difficultyId);
      if (lvl > 0 && !run.devUsed && !run.depthsReward) {
        const r = recordDepthsWin(this.ach.state.depths, run.heroId, lvl);
        run.depthsReward = { level: lvl, marks: r.marks, first: r.first, total: this.ach.state.depths[run.heroId].marks };
      }
      const medal = this.ach.state.medals[run.heroId] ?? 0;
      this.ach.victory(run);
      if ((this.ach.state.medals[run.heroId] ?? 0) > medal) {
        const diff = ["", "Easy", "Normal", "Hard"][this.ach.state.medals[run.heroId]];
        this.events.toast(`Codex medal: ${HEROES[run.heroId].name} won on ${diff}`, "#ffd34d");
      }
    }
    if (this.playerAlive) {
      const entry = waveEntry(run, w, this.player.hp / this.stats.maxHp, true);
      entry.travel = Math.round(this.waveTravel * 10) / 10;
      // a onda leva os quadros desde o fim da anterior (o caminho até ela, as telas sem pausa e o combate)
      entry.perf = this.perfLog.takeWave();
      run.waveLog.push(entry);
      console.info(`[perf] wave ${run.wave} · ${perfLine(entry.perf)}`);
    }
    this.ach.waveComplete({ wave: run.wave, bossWave: w.isBossWave, gameOver: !this.playerAlive, gold: run.gold });
    this.codexSync();
    this.saveAchievements();
    // §6: a sala vale só para esta onda; a maldição segue para a próxima, que fica sem mapa
    // D-150: a maldição que segue dá uma relíquia amaldiçoada (1 de 2)
    if (expireWaveScope(run)) this.pendingPoolRelic = "curse";
    // o evento vale só para esta onda; o ouro do Blood Altar conta uma onda
    expireEvents(run, run.wave);
    this.recompute();
    // wave_system.lua `complete`: a loja automática antes de toda onda de chefe
    if (isBossWave(run.wave + 1)) this.pendingShop ??= "preboss";
    this.phase = "cleared";
    this.phaseT = 0;
    this.showRing(false);
    const extra = w.clearedEarly ? ` · ${Math.ceil(w.timeSaved)} s early` : "";
    this.events.banner("Wave cleared", `+${gold} gold · +${Math.round((xp + r.xp) * this.stats.xp)} XP${survivors ? ` · ${survivors} fled` : ""}${extra}`);
    this.audio.play("pickup");
  }

  // ---------------------------------------------------------------- mapa da partida (run_map.lua)

  /** As cartas do mapa da onda atual ainda por escolher (M21-08: uma por portão), ou null. */
  /** Os portões no minimapa: posição e cor. */
  get gateMarks(): { x: number; z: number; color: string }[] {
    return this.mapCards ? this.gates.marks : [];
  }

  get mapCards(): MapCard[] | null {
    const o = this.run?.mapOffer;
    return o && o.wave === this.run.wave ? o.cards : null;
  }

  /**
   * M21-08: sorteia o mapa da onda (uma vez: fica na partida e vai no checkpoint) e põe os portões em leque na
   * borda da clareira de antes, ou em volta da fogueira na primeira onda da zona. Devolve se há portões.
   */
  private offerMap(index: number): boolean {
    const run = this.run;
    this.gateIndex = index;
    this.gates.hide();
    this.nearGate = -1;
    if (needsMap(run, run.wave)) {
      const shrine = this.relicPool().length > 0;
      run.mapOffer = { wave: run.wave, cards: generateMap(this.rng.get("map"), run.wave, { pacts: pactsForMap(run, run.wave, this.unlockOpen("pact", PACT_IDS)), shrine }) };
    }
    const cards = this.mapCards;
    this.mapResolved = !cards;
    if (!cards) return false;
    // M21-14: os portões dentro da clareira vencida (ou em volta da fogueira), virados para a seguinte
    const G = TUNING.world.gates;
    const from = this.fromCircle(index);
    const spots = arcSpots(from, this.layout.segments[index], Math.min(3, cards.length), Math.max(G.minRing, from.r * G.ring),
      (G.spread * Math.PI) / 180, 0, G.minGap);
    this.gates.show(spots, cards.slice(0, spots.length));
    return true;
  }

  /** o trecho dos portões abertos agora (Card Swap os refaz no mesmo lugar) */
  private gateIndex = 0;

  /** M13-02 Card Swap (run_map_flow.lua `canSwapMap`): portões abertos e a vantagem ainda não usada nesta zona. */
  get canSwapGates(): boolean {
    return !!this.mapCards && !this.mapResolved && this.phase === "walk" && !this.shrineOpen && !this.shopVisit
      && !this.eventOffer && !this.pactOffer && canUseZonePerk(this.run, "card_swap", segmentOf(this.run.wave));
  }

  /** `swapMap` (D-228): uma vez por zona, sorteia os portões de novo, no mesmo lugar. Devolve se trocou. */
  swapGates(): boolean {
    if (!this.canSwapGates || !useZonePerk(this.run, "card_swap", segmentOf(this.run.wave))) return false;
    this.run.mapOffer = null;
    this.offerMap(this.gateIndex);
    const p = this.player;
    this.fx.text(p.x, 2.8, p.z, "Card Swap", "gold");
    this.audio.play("pickup");
    this.saveCheckpoint();
    return true;
  }

  /** De onde se parte para o trecho `index`: a clareira de antes ou a fogueira. */
  private fromCircle(index: number): { x: number; z: number; r: number } {
    const L = this.layout;
    return index > 0 ? L.segments[index - 1] : { ...L.spawn, r: SPAWN_R };
  }

  /**
   * M21-14: leva o herói até dentro da clareira da onda (do lado de onde ele veio), com um clarão nos dois lados;
   * a onda começa no quadro seguinte, porque ele já está dentro.
   */
  private warp(): void {
    const p = this.player, sg = this.segment;
    this.warpPending = false;
    const from = this.fromCircle(this.layout.segments.indexOf(sg));
    const dx = from.x - sg.x, dz = from.z - sg.z, d = Math.hypot(dx, dz) || 1;
    const k = sg.r * TUNING.world.gates.arrive;
    this.fx.burst(p.x, 1, p.z, 0x9be4ff, 24, 6, 0.16, 0.5);
    this.fx.flashLight(p.x, 2, p.z, 0x9be4ff, 2, 0.35);
    p.x = sg.x + (dx / d) * k;
    p.z = sg.z + (dz / d) * k;
    p.rush?.fire?.kill();
    p.leap = p.rush = null;
    this.camTarget.set(p.x, 0, p.z);
    this.fx.burst(p.x, 1, p.z, 0x9be4ff, 30, 7, 0.18, 0.6);
    this.fx.flashLight(p.x, 2, p.z, 0x9be4ff, 2.4, 0.4);
    this.fx.shockwave(p.x, p.z, 3, 0x9be4ff);
    this.audio.play("dash");
  }

  /** Caminhada com o mapa por escolher: passar por um portão escolhe a carta dele. */
  private walkGates(dt: number): void {
    const p = this.player;
    this.gates.update(this.time, dt);
    const near = this.gates.nearest(p.x, p.z, TUNING.world.gates.useRadius);
    // o som da sala ao chegar perto do portão (parte do sinal, M21-08)
    const cards = this.mapCards;
    if (near >= 0 && near !== this.nearGate && cards) this.audio.play(GATE_SIGNAL[cards[near].node].sound);
    this.nearGate = near;
    if (!this.playerAlive || this.shrineOpen || this.shopVisit || this.eventOffer || this.pactOffer || !this.mapCards) return;
    // M21-14: E perto de um portão escolhe a carta e leva até a clareira da onda
    if (near >= 0 && this.input.wasPressed("KeyE")) {
      this.warpPending = true;
      this.chooseMapCard(near);
      return;
    }
    // quem foi andando até a clareira sem escolher fica com o portão mais perto
    const sg = this.segment;
    // o pacto e o evento pedem confirmação: no atalho, só quando não há outra carta
    if (sg && Math.hypot(p.x - sg.x, p.z - sg.z) < sg.r + TUNING.world.gates.fallbackReach) {
      const plain = (i: number) => cards![i].node !== "pact" && cards![i].node !== "event";
      const i = this.gates.nearest(p.x, p.z, Infinity, plain);
      this.chooseMapCard(i >= 0 ? i : this.gates.nearest(p.x, p.z, Infinity));
    }
  }

  /** Os desvios no minimapa: posição e cor. */
  get detourMarks(): { x: number; z: number; color: string }[] {
    return this.phase === "walk" ? this.detours.marks : [];
  }

  /** A dica do desvio mais perto (HUD), ou "". */
  get detourHint(): string {
    const d = this.nearDetour >= 0 ? this.detours.list[this.nearDetour] : null;
    if (!d) return "";
    if (d.spot.kind === "chest" && this.detourGuard && !this.detourGuard.dead) return "Defeat the guardian to open the chest";
    return DETOURS[d.spot.kind].hint;
  }

  /**
   * M21-09: os desvios da caminhada até o trecho `index`, ao lado do meio do caminho. A seed da zona e a onda
   * decidem tudo (continuar dá os mesmos). O baú ganha o guarda: um campeão da zona, parado até o herói chegar.
   */
  private offerDetours(index: number): void {
    this.detours.hide();
    this.nearDetour = -1;
    if (this.detourGuard && !this.detourGuard.dead) this.detourGuard.remove = true;
    this.detourGuard = null;
    const run = this.run;
    const rng = detourRng(this.layout.seed, run.wave);
    const kinds = rollDetours(rng, { shopAhead: index < WAVES_PER_ZONE - 1 && !run.skipShop && run.wave < TOTAL_WAVES });
    if (!kinds.length) return;
    // M21-14: do lado de trás da clareira vencida (ou da fogueira), longe dos portões, virados para o meio
    const G = TUNING.world.gates;
    const from = this.fromCircle(index);
    const spots = arcSpots(from, this.layout.segments[index], kinds.length, Math.max(G.minRing * 0.8, from.r * G.detourRing),
      (G.detourSpread * Math.PI) / 180, Math.PI, G.minGap * 0.7)
      .map((a, i) => ({ x: a.x, z: a.z, kind: kinds[i], facing: a.angle + Math.PI }));
    this.detours.show(spots);
    const chest = spots.find((s) => s.kind === "chest");
    if (chest) {
      const pool = this.zone.enemies.filter(([id]) => id in ENEMIES);
      const id = rng.weighted(pool.map(([e, w]) => [e, w] as const));
      const d = DETOUR.chest.guardDistance;
      const a = chest.facing + Math.PI / 2;
      this.detourGuard = this.spawnEnemy(id, run.wave, chest.x + Math.cos(a) * d, chest.z + Math.sin(a) * d, { champion: true });
      this.detourGuard.aggroRange = DETOUR.chest.guardAggro;
    }
  }

  /** A onda começou: os desvios somem; o guarda que já luta entra na onda, o parado vai embora. */
  private endDetours(): void {
    this.detours.hide();
    this.nearDetour = -1;
    const g = this.detourGuard;
    if (g && !g.dead && !g.aggro) {
      g.dead = true;
      g.remove = true;
    }
    this.detourGuard = null;
  }

  /** Caminhada: o desvio mais perto e o E que o usa. */
  private walkDetours(dt: number): void {
    const p = this.player;
    this.detours.update(this.time, dt);
    this.nearDetour = this.playerAlive ? this.detours.nearest(p.x, p.z, DETOUR.useRadius) : -1;
    if (this.nearDetour >= 0 && this.input.wasPressed("KeyE") && !this.shrineOpen && !this.shopVisit) this.useDetour(this.nearDetour);
  }

  /** Usa o desvio `i`: baú (com o guarda morto), santuário de sangue ou atalho. */
  useDetour(i: number): boolean {
    const d = this.detours.list[i];
    if (!d || d.used) return false;
    const run = this.run;
    const p = this.player;
    const kind = d.spot.kind;
    if (kind === "chest") {
      if (this.detourGuard && !this.detourGuard.dead) return false;
      const gold = detourGold("chest", run.wave);
      this.loot.drop(d.spot.x, d.spot.z, gold, 0, null);
      this.audio.play("rare");
    } else if (kind === "shrine") {
      const cost = shrineCost(p.hp, this.stats.maxHp);
      p.hp -= cost;
      run.statistics.damageTaken += cost;
      this.fx.text(p.x, 2.4, p.z, `-${cost}`, "hurt");
      p.flash = 1;
      const gold = detourGold("shrine", run.wave);
      run.gold += gold;
      run.statistics.goldEarned += gold;
      this.fx.text(d.spot.x, 2.8, d.spot.z, `+${gold}g`, "gold");
      this.audio.play("coin");
    } else {
      run.skipShop = true;
      for (let n = 0; n < DETOUR.shortcut.levels; n++) this.gainXp(Math.ceil((run.xpToNext - run.xp) / Math.max(1e-6, this.stats.xp)) + 1);
      this.audio.play("tech");
    }
    this.detours.markUsed(i);
    run.detours.push({ wave: run.wave, kind });
    this.events.zoneChanged();
    return true;
  }

  /** run_map_flow.lua `chooseMapCard`: a sala vale para esta onda; o santuário abre 1 de 3 relíquias. */
  chooseMapCard(index: number): void {
    const run = this.run;
    const card = this.mapCards?.[index];
    if (!card) return;
    // §11: o pacto é um compromisso: confirmação antes, e voltar ao mapa pode (run_map_flow.lua `chooseMapCard`)
    if (card.node === "pact" && card.pact) {
      this.warpPending = false;
      this.pactOffer = { index, id: card.pact };
      this.audio.play("warn");
      this.events.pactOffer?.();
      return;
    }
    // §12: os 3 eventos saem uma vez por carta (ir e voltar não sorteia de novo)
    if (card.node === "event") {
      this.warpPending = false;
      const rr = this.rng.get("events");
      card.events ??= eventDraft(() => rr.next(), this.unlockOpen("event", EVENT_IDS));
      this.eventOffer = { index, ids: card.events };
      this.audio.play("pickup");
      this.events.eventDraft?.();
      return;
    }
    const step = this.takeMapCard(card);
    if (step === "relic") {
      const offer = this.drawRelics(BOSS.relicChoices);
      if (!offer.length) {
        // nenhuma relíquia aberta sobrou: ouro no lugar, e o mapa segue (sem isso a escolha vazia travava a partida)
        const gold = shrineFallbackGold(run.wave);
        run.gold += gold;
        run.statistics.goldEarned += gold;
        const p = this.player;
        this.fx.text(p.x, 2.8, p.z, "No relics left", "gold");
        this.fx.text(p.x, 2.2, p.z, `+${gold}g`, "gold");
        this.audio.play("coin");
        this.resolveMap();
        return;
      }
      this.shrineOpen = true;
      this.events.relicChoice(offer, (id) => {
        this.addRelic(id);
        this.shrineOpen = false;
        this.resolveMap();
      }, "Relic Shrine", this.relicBan((k) => this.drawRelics(k)), this.relicReroll((k) => this.drawRelics(k)));
      return;
    }
    if (step === "shop") {
      this.openShop(null);
      return;
    }
    this.resolveMap();
  }

  /** Gasta a carta: o mapa some, a carta vale (sala, histórico, desafio Daring) e os números da onda mudam. */
  private takeMapCard(card: MapCard): ReturnType<typeof chooseCard> {
    const run = this.run;
    run.mapOffer = { wave: run.wave, cards: null };
    this.gates.hide();
    this.nearGate = -1;
    const step = chooseCard(run, card);
    this.challenges.mapChoice(card.node);
    this.flushChallenges();
    // a sala escolhida muda os números desta onda
    this.computeMods();
    this.audio.play("pickup");
    this.events.zoneChanged();
    return step;
  }

  /** modifier_engine.lua `compute` para a onda atual: sala e evento, pactos, dificuldade e o herói. */
  private computeMods(): void {
    const run = this.run;
    this.mods = waveMods(run.wave, run.difficultyId, roomOf(run), this.hero.runMods,
      { events: eventMods(run, run.wave), pact: pactLayer(run.pacts), championChance: pactChampionChance(run.pacts) });
    this.mods.championHp = this.stats.championHp;
  }

  /** As abertas no codex (unlocks.lua `isOpen`) de um tipo: pactos e eventos trancados por conquista não saem. */
  private unlockOpen(kind: "pact" | "event", ids: readonly string[]): (id: string) => boolean {
    const open = new Set(filterOpen(this.ach.state, kind, [...ids], TUNING.unlockAll));
    return (id) => open.has(id);
  }

  /** Voltar ao mapa da escolha de evento ou da confirmação do pacto (`declinePact`, `cancelEvent`). */
  declineMapOffer(): void {
    this.eventOffer = null;
    this.pactOffer = null;
  }

  /** `acceptPact`: o pacto entra para o resto da partida e abre a escolha de 1 de 2 relíquias de pacto. */
  acceptPact(): boolean {
    const o = this.pactOffer;
    const card = o ? this.mapCards?.[o.index] : undefined;
    this.pactOffer = null;
    if (!o || !card) return false;
    const run = this.run;
    this.takeMapCard(card);
    if (!addPact(run, o.id, run.wave)) return false;
    this.recompute();
    this.computeMods();
    const p = this.player;
    this.fx.text(p.x, 2.8, p.z, PACT_BY_ID[o.id].name, "hurt");
    this.audio.play("boss");
    this.warpPending = true;
    this.codexSync();
    this.openPoolDraft("pact");
    this.resolveMap();
    return true;
  }

  /** `applyEvent`: o evento escolhido; devolve o motivo da recusa (ouro), ou null. */
  chooseEvent(id: string): string | null {
    const o = this.eventOffer;
    const run = this.run;
    if (!o || !o.ids.includes(id)) return "No event";
    if (!eventAvailable(run, id)) return "Not enough gold";
    const card = this.mapCards?.[o.index];
    this.eventOffer = null;
    if (!card) return "No event";
    this.takeMapCard(card);
    const p = this.player, max = this.stats.maxHp, before = p.hp;
    const rr = this.rng.get("events");
    const out = applyEvent(run, id, run.wave, { hp: p.hp, maxHp: max, chance: (c) => rr.chance(c) });
    p.hp = out.hp;
    if (p.hp > before) {
      run.statistics.healed += p.hp - before;
      this.fx.text(p.x, 2.4, p.z, `+${Math.round(p.hp - before)}`, "heal");
    } else if (p.hp < before) {
      run.statistics.damageTaken += before - p.hp;
      this.fx.text(p.x, 2.4, p.z, `-${Math.round(before - p.hp)}`, "hurt");
      p.flash = 1;
    }
    // o nível de graça enche exatamente o XP que falta (o multiplicador de XP desfeito)
    for (let n = 0; n < out.levelUps; n++) this.gainXp(Math.ceil((run.xpToNext - run.xp) / Math.max(0.01, this.stats.xp)) + 1);
    // Gambler's Den: o resultado da aposta na tela (lá só fica em `run.lastGamble`)
    if (out.gamble) this.fx.text(p.x, 3.4, p.z, out.gamble === "win" ? "Jackpot!" : "Lost the bet", out.gamble === "win" ? "gold" : "hurt");
    if (out.gold) this.fx.text(p.x, 2.9, p.z, `${out.gold > 0 ? "+" : ""}${out.gold}g`, "gold");
    this.audio.play(out.gamble === "lose" ? "warn" : out.gold > 0 ? "coin" : "level");
    this.recompute();
    this.computeMods();
    this.challenges.gold();
    this.flushChallenges();
    this.warpPending = true;
    this.codexSync();
    if (out.poolRelic) this.openPoolDraft(out.poolRelic);
    this.resolveMap();
    return null;
  }

  /** A carta da onda está resolvida: a clareira pode começar, e o checkpoint guarda a escolha. */
  private resolveMap(): void {
    this.mapResolved = true;
    if (this.phase === "walk") this.saveCheckpoint();
  }

  // ---------------------------------------------------------------- Magic Shop (run_map_flow.lua)

  /** `openAutoShop` (reason) ou a carta "Shop" do mapa (null): uma visita nova, sorteada no fluxo `shop`. */
  private openShop(auto: ShopReason | null): void {
    // a automática abre no fim da onda (vale para a seguinte); a do portão, na caminhada da própria onda
    // M13-02 Depths 2 (Pricey Shop, shop_system.lua `offerCount`, `priceMult`): 1 oferta a menos e +25%
    const pricey = mutation(depthsLevel(this.run.difficultyId), "pricey_shop");
    const wave = auto ? this.run.wave + 1 : this.run.wave;
    // Stocked Shop (D-228): +1 oferta na primeira loja de cada zona
    const v = rollShop(this.run, this.rng.get("shop"), wave, () => this.shopRelic(),
      SHOP_OFFERS - (pricey?.fewerOffers ?? 0) + stockedShopBonus(this.run, segmentOf(wave)));
    this.shopVisit = { ...v, auto, priceMult: this.stats.shopPrice * (pricey?.priceMult ?? 1) };
    this.audio.play("pickup");
    this.events.shop();
  }

  /** `buyShop`: compra a oferta; devolve o motivo da recusa, ou null. */
  buyShop(index: number): string | null {
    const v = this.shopVisit;
    if (!v) return "no shop";
    this.shopBuying = true;
    let r: ReturnType<typeof buyOffer>;
    try {
      r = buyOffer(this.run, v, index, { grantRelic: (id) => this.addRelic(id) });
    } finally {
      this.shopBuying = false;
    }
    if (!r.ok) {
      this.audio.play("warn");
      this.events.shop();
      return r.reason;
    }
    this.recompute();
    if (r.offer.kind === "relic" && r.offer.relic) this.challenges.relicPurchased(r.offer.relic, r.cost);
    else this.challenges.checkLevels();
    this.flushChallenges();
    if (r.fullHeal) this.player.hp = this.stats.maxHp;
    const p = this.player;
    this.fx.burst(p.x, 1.5, p.z, 0xffd34d, 18, 5, 0.12, 0.6, 3);
    this.audio.play("coin");
    this.events.statusChanged();
    this.events.shop();
    return null;
  }

  /** `rerollShop` (D-146): troca as ofertas; devolve o motivo da recusa, ou null. */
  rerollShop(): string | null {
    const v = this.shopVisit;
    if (!v) return "no shop";
    const r = rerollShop(this.run, v, this.rng.get("shop"), () => this.shopRelic());
    this.audio.play(r.ok ? "pickup" : "warn");
    this.events.shop();
    return r.ok ? null : r.reason;
  }

  /** run_map_flow.lua `banShopRelic` (D-148): bane a relíquia da loja e sorteia outra; sem outra, a oferta some. */
  banShopRelic(index: number): boolean {
    const o = this.shopVisit?.offers[index];
    if (!o || o.kind !== "relic" || o.bought || !o.relic || !banRelic(this.run, o.relic)) return false;
    const repl = this.drawRelics(1, "shop")[0];
    if (repl) o.relic = repl;
    else o.bought = true;
    this.audio.play("warn");
    this.events.shop();
    return true;
  }

  /** `closeShop`: a automática vem antes do mapa; a da carta resolve o mapa. */
  closeShop(): void {
    const v = this.shopVisit;
    if (!v) return;
    this.shopVisit = null;
    this.challenges.checkLevels();
    this.flushChallenges();
    if (!v.auto) this.resolveMap();
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
    this.evolutionOffer = null;
    this.relicEvoOffer = null;
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
  spellHit(e: Enemy, mult: number, noKnock = false, element?: string, from?: HitFrom): void {
    this.hitSource = "other";
    this.hitEnemy(e, mult, undefined, { noKnock, element, spell: true, from });
  }

  /** Elementos que a build aplica agora (ícone de reação pronta). */
  buildElements(): Set<string> {
    const schools = this.run.spells.map((sp) => SPELL_SCHOOL[sp.id as SpellId]).filter(Boolean);
    const t = this.hero.technique.school;
    const els = buildElements(schools, t === "auto" ? null : t, this.hero.auto.status?.kind ?? null, this.hero.frost === true);
    for (const el of this.epics.elements()) els.add(el);
    return els;
  }

  /** Reações prontas de um inimigo para a build atual. */
  primed(e: Enemy): ReactionId[] {
    return primedReactions(e.reactState(this.time), this.time, this.elements);
  }

  /**
   * M21-05: efeito de uma reação em volta do inimigo. Estilhaço consome o gelo; Praga passa queimadura e veneno aos
   * vizinhos, que ficam em recarga (não reagem em cadeia). O dano vai direto (`damageEnemy`), sem nova reação.
   */
  react(e: Enemy, id: ReactionId): void {
    const R = REACTIONS;
    const now = this.time;
    const s = this.stats;
    e.reactUntil = now + R.cooldown;
    if (id === "execution") {
      // Execução: o atordoamento acaba; comum abaixo do limiar morre, o resto leva o dano extra
      const X = R.execution;
      e.stunUntil = 0;
      e.windupT = -1;
      this.damageEnemy(e, s.damage * X.damage * (e.isBoss ? R.bossMult : 1), { reaction: id });
      if (!e.dead && executes(e.hp, e.maxHp, X.threshold, e.isBoss, e.champion)) this.damageEnemy(e, e.hp + 1, { reaction: id });
      this.fx.text(e.x, e.rig.height + 0.9, e.z, "Execute", "crit react");
      this.fx.burst(e.x, 1, e.z, X.color, 30, 9, 0.16, 0.55, 2);
      this.fx.addShake(0.2);
      this.hitstop = Math.max(this.hitstop, 0.06);
      this.audio.play("crit");
      return;
    }
    const def = R[id];
    if (id === "shatter") {
      e.chillUntil = 0;
      e.slowUntil = 0;
      if (this.hero.frost) e.stunUntil = 0;
    }
    const P = R.plague;
    const label = id === "shatter" ? "Shatter" : "Plague";
    for (const o of this.enemies) {
      if (o.dead || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > (def.radius + o.radius) ** 2) continue;
      if (id === "plague" && o !== e) {
        // Chain Reaction (M21-07): sem a recarga, o vizinho pode reagir de novo
        if (!this.epics.plagueChains()) o.reactUntil = Math.max(o.reactUntil, now + R.cooldown);
        o.applyBurn(now, s.damage * P.burnDps * s.burn, P.burnDuration);
        o.applyPoison(now, s.damage * P.poisonDps * s.poison, P.poisonDuration, 1, undefined, "plague");
      }
      this.damageEnemy(o, s.damage * def.damage * (o.isBoss ? R.bossMult : 1), { reaction: id });
    }
    const top = e.rig.height + 0.9;
    this.fx.text(e.x, top, e.z, label, id === "shatter" ? "frost react" : "poison react");
    this.fx.burst(e.x, 1, e.z, def.color, 34, 10, 0.17, 0.6, id === "shatter" ? 10 : 3);
    this.fx.lib.ring(e.x, e.z, { radius: def.radius, color: def.color, core: 0xffffff, width: 0.4, from: 0.15, dust: 8, dur: 0.35 });
    this.fx.addShake(0.16);
    this.hitstop = Math.max(this.hitstop, 0.04);
    this.audio.play("crit");
  }

  /** Roda `fn` com os golpes levando o elemento (reações, M21-05). */
  withElement(element: string, fn: () => void): void {
    const prev = this.hitElement;
    this.hitElement = element;
    try {
      fn();
    } finally {
      this.hitElement = prev;
    }
  }

  hitstopFor(t: number): void {
    this.hitstop = Math.max(this.hitstop, t);
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
    this.terrain.strike(x, z, r);
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.z - z);
      if (d > r + e.radius) continue;
      this.hitEnemy(e, mult, status);
      n++;
      // M21-10: o empurrão vira velocidade (desliza `knock` metros), para poder levar o inimigo ao fosso
      if (knock > 0 && !e.isBoss && d > 0.01) {
        e.kx += ((e.x - x) / d) * knock * KNOCK_DECAY;
        e.kz += ((e.z - z) / d) * knock * KNOCK_DECAY;
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
    p.attackCd = 1 / (a.rate * this.stats.attackSpeed * this.epics.attackSpeedMult() * this.relicHooks.attackSpeedMult(this.relicWorld));
    p.attackAnim = 0;
    if (p.rig) nextShot(p.rig);
    // M21-07: Third Strike e Charged Step mudam este golpe; Kinetic solta o raio depois
    this.autoMod = this.epics.onAutoAttack();
    try {
      this.swingAuto(a, a.damage * this.autoMod.mult);
    } finally {
      this.autoMod = null;
    }
    this.epics.afterAutoAttack();
  }

  /** O ataque básico em si (tiro ou arco, no estilo do herói, H8); `dmg` já leva as épicas. */
  private swingAuto(a: AutoAttack, dmg: number): void {
    const p = this.player;
    const st = this.hero.style;
    const n = this.stats.doubleShot;
    if (a.kind === "melee") {
      this.autoArc(a, dmg, p.facing);
      // Double Shot num arco: um golpe a mais por cópia, um pouco depois, com 60% do dano
      const A = ARC_STYLES[st];
      if (A) for (let k = 1; k <= n; k++) this.extraSwings.push({ at: this.time + A.extraDelay * k, angle: p.facing, mult: dmg * A.extraMult, shield: false });
      return;
    }
    this.volley(a, dmg, p.facing);
    this.audio.play("shoot");
    if (st === "shieldthrow") {
      if (this.hero.shieldHeal && ++p.throws % SHIELD_THROW.healEvery === 0) this.heal(this.stats.maxHp * SHIELD_THROW.heal, true);
      // Double Shot do Seraph: um escudo de luz logo depois, com 60% do dano (não conta para a cura)
      for (let k = 1; k <= n; k++) this.extraSwings.push({ at: this.time + STYLE_SHIELD.extraDelay * k, angle: p.facing, mult: dmg * STYLE_SHIELD.extraMult, shield: true });
    }
  }

  /** Os golpes do Double Shot que esperam a vez (H8). */
  private updateExtraSwings(): void {
    for (let i = this.extraSwings.length - 1; i >= 0; i--) {
      const x = this.extraSwings[i];
      if (this.time < x.at) continue;
      this.extraSwings.splice(i, 1);
      if (!this.playerAlive) continue;
      const a = this.hero.auto;
      if (x.shield) {
        this.volley(a, x.mult, x.angle);
        this.audio.play("shoot");
      } else this.autoArc(a, x.mult, x.angle);
    }
  }

  /** Um golpe em arco (Auto.swing): Cone abre o arco, Pierce estica o alcance (H8). */
  private autoArc(a: AutoAttack, dmg: number, angle: number): void {
    const p = this.player;
    const s = this.stats;
    const st = this.hero.style;
    const base = a.range * (1 + (s.range - 1) * 0.5) * (1 + (s.area - 1) * 0.5);
    const range = autoReach(st, base, s.pierce, s.coneShot);
    const arc = arcHalfAngle(st, (((a.arcDeg ?? 100) * Math.PI) / 180) / 2, s.coneShot);
    const arcDeg = (arc * 2 * 180) / Math.PI;
    this.fx.slash(p.x, p.z, angle, range, arcDeg, this.spells.arcaneReady ? ARCANE_CHARGED.color : a.color);
    this.terrain.strikeArc(p.x, p.z, angle, range, arc);
    this.audio.play("swing");
    let hits = 0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      if (d > range + e.radius) continue;
      let da = Math.atan2(e.x - p.x, e.z - p.z) - angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) > arc && d > e.radius + 0.8) continue;
      this.hitSource = "auto";
      this.hitEnemy(e, dmg, a.status, this.autoMod?.crit ? { crit: true } : undefined);
      this.hitSource = "other";
      if (this.autoMod?.knock) this.epics.knock(e, this.autoMod.knock);
      this.spells.onAutoHit(e);
      this.autoKnock(e, e.x - p.x, e.z - p.z);
      hits++;
    }
    if (hits) this.fx.addShake(0.08);
    // Rune Traps (D-575): o golpe que passa por uma runa armada estoura a runa
    if (this.spells.hasRunes) {
      this.spells.shootRunes((x, z, trig) => {
        const d = Math.hypot(x - p.x, z - p.z);
        let da = Math.atan2(x - p.x, z - p.z) - angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        return d <= range + trig && Math.abs(da) <= arc;
      });
    }
  }

  /** Vesper (D-590): o Double põe mais acúmulos por acerto; o lateral do Cone respinga o veneno em quem está perto. */
  private venomExtras(e: Enemy, pr: Projectile, mult: number): void {
    const st = pr.status!;
    const base = this.stats.damage * this.stats.autoDamage * mult;
    for (let k = 1; k < (pr.poisonHits ?? 1); k++) if (!e.dead) this.applyStatus(e, st, base);
    if (!pr.splash) return;
    const r2 = pr.splash ** 2;
    for (const o of this.enemies) {
      if (o === e || o.dead || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > r2) continue;
      this.applyStatus(o, st, base);
    }
  }

  /** Kaelen (D-590): o Cone ramifica o raio no primeiro acerto, um ramo curto por cópia, com 60% do dano. */
  private forkBolt(e: Enemy, pr: Projectile): void {
    const sp = Math.hypot(pr.vx, pr.vz) || 1;
    const ang = Math.atan2(pr.vx, pr.vz);
    for (const a of forkAngles(ang, pr.forks ?? 0, STYLE_STORM.forkSpread)) {
      this.addProjectile({
        x: pr.x, z: pr.z, vx: Math.sin(a) * sp, vz: Math.cos(a) * sp, r: pr.r * 0.8, dmg: pr.dmg * STYLE_STORM.forkMult,
        life: px(STYLE_STORM.forkReach) / sp, friendly: true, pierce: 0, ricochet: 0, ricochetDamage: 1,
        status: pr.status, color: pr.color, source: "auto",
      });
      this.projectiles[this.projectiles.length - 1].hit.add(e);
    }
  }

  private useTechnique(): void {
    const school = this.hero.technique.school;
    this.hitElement = school === "auto" ? null : school;
    try {
      this.asTechnique(() => this.castTechnique());
    } finally {
      this.hitElement = null;
    }
    if (this.player.techCd > 0) {
      this.epics.onTechnique();
      // FOLLOW-THROUGH (D-309): todo o dano sobe por alguns segundos depois de usar a técnica
      if (this.stats.followThrough > 0) this.player.followUntil = this.time + UPGRADE_FX.followThroughTime;
    }
  }

  /**
   * Knockback (auto_attack.lua `Auto.knockback`, D-160): o ataque básico empurra o inimigo comum ao longo do golpe,
   * `KNOCKBACK_PX` × o bônus; chefe e campeão não se movem.
   */
  private autoKnock(e: Enemy, dx: number, dz: number): void {
    const k = this.stats.knockback;
    if (k <= 0 || e.dead || e.isBoss || e.champion) return;
    const l = Math.hypot(dx, dz) || 1;
    const dist = px(UPGRADE_FX.knockbackPx) * k;
    e.kx += (dx / l) * dist * KNOCK_DECAY;
    e.kz += (dz / l) * dist * KNOCK_DECAY;
  }

  /** O que acontece dentro de `fn` é golpe da técnica (SIGNATURE, `techniqueDamagePct`). */
  private asTechnique<T>(fn: () => T): T {
    this.techDepth++;
    try {
      return fn();
    } finally {
      this.techDepth--;
    }
  }

  private castTechnique(): void {
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
        this.terrain.resolve(p, 0.5);
        p.iframes = Math.max(p.iframes, T.invuln ?? 0.3);
        this.addTrail(x0, z0, p.x, p.z, hw, T.trail ?? 2, T.trailTick ?? 0.4, T.damage * (T.trailFraction ?? 0.35) * (T.trailMult ?? 1), color);
        // M5-03: o herói vira raio; relâmpago do ponto de saída ao de chegada, estalo na saída e descarga na chegada
        const lib = this.fx.lib;
        lib.lightning(x0, 1.1, z0, p.x, 1.1, p.z, { color: TECH_FX.boltBody, core: TECH_FX.boltCore, width: 0.28, branches: 3, rate: 0.05, dur: 0.3 });
        lib.burst(x0, 1, z0, { radius: 0.9, color: TECH_FX.boltBody, core: TECH_FX.boltCore, rays: 4, sparks: 8, light: 0, dur: 0.2, wave: 0 });
        lib.burst(p.x, 1, p.z, { radius: 1.1, color: TECH_FX.boltBody, core: TECH_FX.boltCore, rays: 5, sparks: 12, light: 1.2, dur: 0.24, wave: 0, power: 0.85 });
        const shock = T.shockRadius ?? 34 / 12;
        if (T.shockRadius) this.areaHit(p.x, p.z, T.shockRadius, T.damage);
        lib.ring(p.x, p.z, { radius: shock, color: TECH_FX.boltBody, core: TECH_FX.boltCore, width: 0.35, from: 0.2, dust: 6, dur: 0.3 });
        // ramos curtos descendo da chegada até o chão em volta
        for (let k = 0; k < 3; k++) {
          const a = Math.random() * Math.PI * 2;
          const d = shock * (0.5 + 0.4 * Math.random());
          lib.lightning(p.x, 1.4, p.z, p.x + Math.cos(a) * d, 0.1, p.z + Math.sin(a) * d,
            { color: TECH_FX.boltBody, core: TECH_FX.boltCore, width: 0.14, branches: 1, rate: 0.06, dur: 0.16 });
        }
        this.fx.addShake(0.18);
        break;
      }
      case "rift": {
        // Aurelius: fenda no mouse que deixa lento, segura os tiros inimigos e implode
        const T = this.tech!;
        const dest = this.aimPoint(T.range);
        const rr = T.radius ?? 6.7;
        const rift = this.rifts.add({ x: dest.x, z: dest.z, r: rr, dur: T.duration ?? 3, slow: T.riftSlow ?? 0.6,
          damage: T.damage, perEnemy: T.perEnemy ?? 0.15, maxMult: T.maxMult ?? 3, stun: T.stun ?? 0 });
        // M5-03: a fenda abre com um anel arcano e um clarão; pontos de luz giram devagar na borda até a implosão
        const lib = this.fx.lib;
        lib.ring(dest.x, dest.z, { radius: rr, color: TECH_FX.arcane, core: TECH_FX.arcaneCore, width: 0.4, from: 0.1, fill: 0.2, dust: 10, dur: 0.35 });
        lib.burst(dest.x, 0.9, dest.z, { radius: 1.4, color: TECH_FX.arcane, core: TECH_FX.arcaneCore, rays: 6, sparks: 12, light: 1.4, dur: 0.26, wave: 0 });
        lib.burst(p.x + Math.sin(p.facing) * 0.8, 1.6, p.z + Math.cos(p.facing) * 0.8, { radius: 0.7, color: TECH_FX.arcane, core: TECH_FX.arcaneCore,
          rays: 4, sparks: 6, light: 0, dur: 0.18, wave: 0, power: 0.8 });
        rift.fx = lib.orbit(dest.x, 0.5, dest.z, { radius: rr * 0.92, count: 5, speed: 0.22, tilt: 0, size: 0.5, bob: 0.15,
          color: TECH_FX.arcane, core: TECH_FX.arcaneCore, dur: Infinity, power: 0.8 });
        break;
      }
      case "fan": {
        // Zephyr: 5 tiros em cone de uma vez, com o dano e o crítico do ataque básico, empurrando
        const T = this.tech!;
        const a = this.hero.auto;
        const n = (T.shots ?? 5) + s.fanShots; // QUICKDRAW: +2 tiros
        const spread = T.spread ?? 0.16;
        const rangeMult = Math.max(T.range, a.range * s.range) / (a.range * s.range);
        const fanAuto = { ...a, speed: (a.speed ?? 24) * 1.15 };
        const lib = this.fx.lib;
        const mx = p.x + Math.sin(p.facing) * 0.9;
        const mz = p.z + Math.cos(p.facing) * 0.9;
        for (let k = 1; k <= n; k++) {
          const ang = p.facing + (k - (n + 1) / 2) * spread;
          this.firePlayer(ang, fanAuto, T.damage, rangeMult);
          const pr = this.projectiles[this.projectiles.length - 1];
          pr.push = 0.85;
          // M5-03: cada bala deixa um risco dourado; um traço curto de clarão sai do cano na direção dela
          pr.fx = lib.trail({ color: TECH_FX.gun, core: TECH_FX.gunCore, width: 0.32, life: 0.1, head: 0.35, sheds: 2 });
          lib.beam(mx, 1.2, mz, mx + Math.sin(ang) * 2.6, 1.2, mz + Math.cos(ang) * 2.6, { color: TECH_FX.gun, core: TECH_FX.gunCore, width: 0.22, dur: 0.09 });
          if (T.bounces) {
            pr.bounces = T.bounces;
            pr.bounceGain = T.bounceDamage ?? 0.2;
            pr.span = pr.life;
          }
        }
        p.attackAnim = 0;
        if (p.rig) nextShot(p.rig);
        this.audio.play("shoot");
        lib.burst(mx, 1.2, mz, { radius: 1.3, color: TECH_FX.gun, core: TECH_FX.gunCore, rays: 6, sparks: 16, light: 1.8, dur: 0.16, wave: 0, power: 0.9 });
        for (let i = 0; i < 3; i++) {
          const q = 0.6 + i * 0.7;
          lib.smoke(mx + Math.sin(p.facing) * q, 1.15, mz + Math.cos(p.facing) * q, { radius: 0.6 + i * 0.25, color: TECH_FX.gunSmoke, alpha: 0.32,
            rise: 0.5, drift: [Math.sin(p.facing) * 1.2, Math.cos(p.facing) * 1.2], dur: 0.6 + i * 0.15 });
        }
        lib.ring(p.x, p.z, { radius: 1.6, color: TECH_FX.gun, core: TECH_FX.gunCore, width: 0.25, from: 0.3, dust: 4, dur: 0.22, power: 0.6 });
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
        // M5-03: fita de fogo atrás do herói durante o avanço
        const fire = this.fx.lib.trail({ color: TECH_FX.fireDeep, core: TECH_FX.fireCore, width: 2.4, life: 0.35, head: 1.2, sheds: 40 });
        p.rush = { t: 0, dur, dx: (dest.x - p.x) / d, dz: (dest.z - p.z) / d, hit: new Set(), speed: d / dur, x0: p.x, z0: p.z, fire };
        this.fx.lib.burst(p.x, 1, p.z, { radius: 1.6, color: TECH_FX.fireDeep, core: TECH_FX.fireCore, rays: 5, sparks: 14, light: 1.6, dur: 0.24, wave: 0 });
        this.fx.lib.ring(p.x, p.z, { radius: 1.8, color: 0xff8a2a, core: TECH_FX.fireCore, width: 0.4, from: 0.2, dust: 6, dur: 0.3 });
        p.iframes = Math.max(p.iframes, T.invuln ?? 0.22);
        break;
      }
      case "icewall": {
        const T = this.tech!;
        const pl = IceWalls.place(p.x, p.z, this.aim.x, this.aim.z, T.minRange ?? 4, T.maxRange ?? 16);
        this.iceWalls.add({ ...pl, length: T.length ?? 12, thickness: T.thickness ?? 1.2, dur: T.duration ?? 5,
          damage: T.damage, freeze: T.freeze ?? 1, shatter: T.shatter === true });
        // M5-03: a parede sobe com estalos de gelo ao longo dela e névoa fria rolando no pé
        const lib = this.fx.lib;
        const len = T.length ?? 12;
        const n = 5;
        lib.beam(p.x, 0.25, p.z, pl.x, 0.25, pl.z, { color: TECH_FX.ice, core: TECH_FX.iceCore, width: 0.35, dur: 0.25 });
        for (let i = 0; i < n; i++) {
          const s0 = ((i + 0.5) / n - 0.5) * len;
          const x = pl.x + pl.az * s0;
          const z = pl.z - pl.ax * s0;
          lib.burst(x, 0.5, z, { radius: 1.1, color: TECH_FX.ice, core: TECH_FX.iceCore, rays: 4, sparks: 8, light: i === 2 ? 1.8 : 0, dur: 0.22, wave: 0, power: 0.8 });
          lib.smoke(x, 0.2, z, { radius: 1.1 + Math.random() * 0.4, color: TECH_FX.mist, alpha: 0.22, rise: 0.1,
            drift: [-pl.ax * 0.8, -pl.az * 0.8], dur: 1.1 + Math.random() * 0.4 });
        }
        lib.burst(p.x + Math.sin(p.facing) * 0.8, 1.6, p.z + Math.cos(p.facing) * 0.8, { radius: 0.7, color: TECH_FX.ice, core: TECH_FX.iceCore,
          rays: 4, sparks: 6, light: 0, dur: 0.18, wave: 0, power: 0.8 });
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
        this.terrain.resolve(p, 0.5);
        p.facing = Math.atan2(target.x - p.x, target.z - p.z);
        p.iframes = Math.max(p.iframes, T.invuln ?? 0.6);
        p.shadowUntil = this.time + SHADOW.afterStep;
        p.attackAnim = 0;
        // M5-03: some numa nuvem de sombra e sai de outra atrás do alvo; fita escura liga os dois pontos; golpe com clarão de crítico
        const lib = this.fx.lib;
        for (const [x, z, big] of [[x0, z0, 1], [p.x, p.z, 1.25]]) {
          for (let k = 0; k < 3; k++) {
            const a = Math.random() * Math.PI * 2;
            lib.smoke(x + Math.cos(a) * 0.4, 0.7 + k * 0.35, z + Math.sin(a) * 0.4, { radius: (1 + Math.random() * 0.4) * big, color: TECH_FX.shadow,
              core: TECH_FX.shadowCore, alpha: 0.7, rise: 0.6, dur: 0.55 + Math.random() * 0.2 });
          }
          lib.ring(x, z, { radius: 1.6 * big, color: TECH_FX.shadowGlow, core: color, width: 0.25, from: 0.3, dust: 0, dur: 0.3, power: 0.7 });
        }
        // borrão do dash: fita larga que afina, curvada para o lado como o arco de um corte
        const rib = lib.trail({ color: TECH_FX.shadowGlow, core: color, width: 1.2, life: 0.2, head: 0, sheds: 0 });
        const sx = -(p.z - z0), sz = p.x - x0;
        const sl = Math.hypot(sx, sz) || 1;
        for (let k = 0; k <= 10; k++) {
          const u = k / 10;
          const bend = Math.sin(u * Math.PI) * 0.18 * sl;
          rib.push(x0 + (p.x - x0) * u + (sx / sl) * bend, 1, z0 + (p.z - z0) * u + (sz / sl) * bend);
        }
        rib.kill();
        this.hitEnemy(target, T.damage, undefined, { crit: true });
        this.fx.slash(p.x, p.z, p.facing, 3.4, 100, color);
        lib.burst(target.x, 1.1, target.z, { radius: 1.3, color: TECH_FX.shadowGlow, core: 0xffffff, rays: 6, sparks: 10, light: 1.4, dur: 0.24, wave: 0 });
        // Eclipse: uma sombra fica e repete o golpe 1 s depois, com 60% do dano
        if (T.echoDelay) {
          this.echoes.push({ x: p.x, z: p.z, target, at: this.time + T.echoDelay, dmg: T.damage * (T.echoFraction ?? 0.6) });
          lib.smoke(p.x, 1, p.z, { radius: 1.2, color: TECH_FX.shadow, core: TECH_FX.shadowCore, alpha: 0.45, rise: 0.1, dur: T.echoDelay });
        }
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
        // M5-03: coluna de luz ao erguer o escudo; três luzes giram em volta dele enquanto dura
        const lib = this.fx.lib;
        const dur = T.duration ?? 3;
        const orbit = lib.orbit(p.x, 1.1, p.z, { radius: 1.45, count: 3, speed: 0.75, tilt: 0.4, size: 0.45, bob: 0.2, color: TECH_FX.holy,
          core: TECH_FX.holyCore, dur: dur + 0.5 });
        p.aegis = { until: this.time + dur, block: true, damage: T.damage, radius: T.radius ?? 7.5, heal: T.healFraction ?? 0.1, mesh,
          sanctum: T.sanctumTime ?? 0, fx: orbit };
        lib.pillar(p.x, p.z, { radius: 1.2, height: 6, color: TECH_FX.holy, core: TECH_FX.holyCore, dur: 0.5, power: 0.55 });
        lib.ring(p.x, p.z, { radius: 2.2, color: TECH_FX.holy, core: TECH_FX.holyCore, width: 0.35, from: 0.4, dust: 8, dur: 0.35 });
        lib.burst(p.x, 2.6, p.z, { radius: 1.2, color: TECH_FX.holy, core: TECH_FX.holyCore, rays: 6, sparks: 14, light: 1.2, dur: 0.26, wave: 0, power: 0.6 });
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
        // M5-03: o herói sai do chão levantando poeira e deixa um rastro vermelho no arco do salto
        const lib = this.fx.lib;
        lib.ring(p.x, p.z, { radius: 2.4, color: TECH_FX.execRed, core: TECH_FX.execCore, width: 0.5, from: 0.3, dust: 8, dur: 0.3 });
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 + Math.random();
          lib.smoke(p.x + Math.sin(a) * 0.9, 0.4, p.z + Math.cos(a) * 0.9, { radius: 0.7 + Math.random() * 0.3, color: 0xb8a888, alpha: 0.3, rise: 0.5, dur: 0.5 });
        }
        const trail = lib.trail({ color: TECH_FX.execRed, core: TECH_FX.execCore, width: 1.7, life: 0.25, head: 0.8, sheds: 14 });
        p.leap = { t: 0, dur, x0: p.x, z0: p.z, x1: dest.x, z1: dest.z, fx: trail };
        p.iframes = Math.max(p.iframes, dur);
        break;
      }
      case "brood": {
        // Vesper: 2 vespas grandes por 6 s
        const T = this.tech!;
        // M5-03: nuvem de veneno no chão de onde as vespas saem zumbindo
        const lib = this.fx.lib;
        lib.ring(p.x, p.z, { radius: 3.4, color: TECH_FX.venom, core: TECH_FX.venomCore, width: 0.3, from: 0.3, dust: 10, dur: 0.4, power: 0.7 });
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.random();
          lib.smoke(p.x + Math.sin(a) * 1.1, 0.4, p.z + Math.cos(a) * 1.1, { radius: 1 + Math.random() * 0.4, color: TECH_FX.venomSmoke,
            core: TECH_FX.venom, alpha: 0.45, rise: 0.5, dur: 0.8 + Math.random() * 0.3 });
        }
        for (let i = 0; i < (T.spiders ?? 2); i++) this.spawnBee(true, T.duration ?? 6, i * 2.1);
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
    a.fx.kill(burst ? 0 : 0.2);
    a.mesh.removeFromParent();
    a.mesh.geometry.dispose();
    (a.mesh.material as THREE.Material).dispose();
    if (!burst || !this.playerAlive) return;
    this.areaHit(p.x, p.z, a.radius, a.damage);
    this.heal(this.stats.maxHp * a.heal, true);
    // M5-03: onda de luz até o raio do dano, coluna e clarão no herói
    const lib = this.fx.lib;
    lib.ring(p.x, p.z, { radius: a.radius, color: TECH_FX.holy, core: TECH_FX.holyCore, width: 0.6, from: 0.15, fill: 0.25, dust: 18, dur: 0.45 });
    lib.pillar(p.x, p.z, { radius: 1.5, height: 7, color: TECH_FX.holy, core: TECH_FX.holyCore, dur: 0.55, power: 0.5 });
    lib.burst(p.x, 2.8, p.z, { radius: 1.6, color: TECH_FX.holy, core: TECH_FX.holyCore, rays: 8, sparks: 22, light: 1.8, dur: 0.3, power: 0.6 });
    // cura: faíscas verde-douradas subindo do herói
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const q = 0.3 + Math.random() * 0.7;
      this.fx.glow(p.x + Math.sin(a) * q, 0.4 + Math.random() * 0.8, p.z + Math.cos(a) * q, i % 2 ? TECH_FX.heal : TECH_FX.holy, 0.3, 0.8 + Math.random() * 0.4,
        0, 2.5 + Math.random() * 1.5, 0);
    }
    this.fx.addShake(0.3);
    // Sanctum: círculo de cura parado no chão (o Healing Field de lá: tique de 0,75 s, cura 2 = 2% da vida)
    if (a.sanctum > 0) this.spells.sanctumField(p.x, p.z, a.radius, a.sanctum);
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
    const x = p.x + Math.cos(a) * 1.5;
    const z = p.z + Math.sin(a) * 1.5;
    let fx: TrailHandle | undefined;
    if (big) {
      fx = this.fx.lib.trail({ color: TECH_FX.wasp, core: TECH_FX.venomCore, width: 0.22, life: 0.22, head: 0, sheds: 1 });
      this.fx.lib.burst(x, 1.1, z, { radius: 0.9, color: TECH_FX.wasp, core: TECH_FX.venomCore, rays: 4, sparks: 8, light: 0, dur: 0.2, wave: 0, power: 0.8 });
    }
    this.bees.push({
      x, z, life, hitCd: 0, rig, phase, sting: -1,
      big, dmg, every: big ? 0.7 : 0.9, speed: big ? 175 / 12 : 150 / 12,
      poison: { kind: "poison", power: poisonDps / dmg, duration: T?.poisonDuration ?? 3, maxStacks: (T?.poisonStacks ?? 3) + 1 },
      pool: big ? T?.poolTime : undefined, fx,
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
    p.iframes -= dt;
    if (this.playerAlive) {
      this.epics.update(dt);
      this.relicHooks.tick(this.relicWorld, dt);
    }
    p.hurtT = Math.max(0, p.hurtT - dt * 2.5);
    p.moveAmt = 0;

    if (!this.playerAlive) {
      animateRig(rig, { t: this.time, move: 0, attack: -1, windup: 0, dead: 1 });
      return;
    }
    if (s.regen > 0 && p.hp < s.maxHp && !this.relicHooks.blocksHeal(this.relicWorld)) {
      const before = p.hp;
      const add = s.regen * dt * (this.inCombat ? PACE.combatHealMult : 1) * this.woundsMult;
      this.relicHooks.overheal(this.relicWorld, p.hp + add - s.maxHp);
      p.hp = Math.min(s.maxHp, p.hp + add);
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
      l.fx?.push(p.x, lift + 1.3, p.z);
      if (k >= 1) {
        l.fx?.kill();
        p.leap = null;
        const T = this.tech!;
        this.grid.resolve(p, 0.5);
        this.terrain.resolve(p, 0.5);
        this.asTechnique(() => this.executionLanding(T.radius ?? 5.8, T));
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
      if (T) this.asTechnique(() => this.lineHit(p.x, p.z, nx, nz, (T.width ?? 2.5) / 2, T.damage, this.chargeBurn(T), r.hit));
      // labareda ao longo do caminho
      for (let k = 0; k < 4; k++) {
        const q = Math.random();
        this.fx.glow(p.x + (nx - p.x) * q, 0.6 + Math.random() * 0.6, p.z + (nz - p.z) * q, Math.random() < 0.5 ? 0xff8a2a : 0xffd34d, 0.5, 0.45, 0, 1.5, 0);
      }
      p.x = nx;
      p.z = nz;
      p.moveAmt = 1;
      r.fire?.push(p.x, 1, p.z);
      if (Math.random() < 0.35) {
        this.fx.lib.smoke(p.x - r.dx * 0.8, 0.9, p.z - r.dz * 0.8, { radius: 0.9 + Math.random() * 0.4, color: TECH_FX.fireSmoke, core: 0x7a3414,
          alpha: 0.35, rise: 0.8, dur: 0.6 });
      }
      if (r.t >= r.dur) {
        r.fire?.kill();
        p.rush = null;
        if (T) {
          this.asTechnique(() => this.infernoRing(T));
          // Phoenix Rush: o caminho fica em chamas (a cada 0,5 s, 25% do dano e queimadura)
          if (T.fireTrail) this.addTrail(r.x0, r.z0, p.x, p.z, (T.width ?? 2.5) / 2, T.fireTrail, TECH_EVO.fireTrailEvery, T.damage * TECH_EVO.fireTrailFraction, 0xff7a2a, this.chargeBurn(T));
        }
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
        const slow = (p.attackAnim >= 0 && this.hero.auto.kind === "melee" ? 0.55 : 1) * (this.time < p.chillUntil ? p.chillMult : 1);
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
          this.epics.onDash(p.x, p.z);
        }
      }
      if (this.hero.technique.kind === "icewall" && this.tech) {
        const T = this.tech;
        const pl = IceWalls.place(p.x, p.z, this.aim.x, this.aim.z, T.minRange ?? 4, T.maxRange ?? 16);
        this.iceWalls.showGhost(p.techCd <= 0, pl.x, pl.z, pl.ax, pl.az, T.length ?? 12, T.thickness ?? 1.2);
      }
      if (this.extraSwings.length) this.updateExtraSwings();
      if ((input.rmbPressed || input.wasPressed("KeyQ")) && p.techCd <= 0) this.useTechnique();
      else if (input.lmb && p.attackCd <= 0) this.autoAttack();
    }


    if (!p.leap) {
      this.grid.resolve(p, 0.5);
      this.terrain.resolve(p, 0.5);
    }
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
      a.fx.move(p.x, 1.1, p.z);
      a.mesh.rotation.y += dt * 0.8;
      (a.mesh.material as THREE.MeshBasicMaterial).opacity = (a.block ? 0.2 : 0.1) + Math.sin(this.time * 9) * 0.04;
      if (this.time >= a.until) this.asTechnique(() => this.endAegis(true));
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
        if (b.pool) this.addPool(b);
        else if (b.big) this.fx.lib.smoke(b.x, 1, b.z, { radius: 0.8, color: TECH_FX.venomSmoke, core: TECH_FX.venom, alpha: 0.4, rise: 0.4, dur: 0.5 });
        b.fx?.kill();
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
        // a abelha grande é a técnica (Swarm); as pequenas da Ninhada, não
        if (b.big) this.asTechnique(() => this.hitEnemy(target, b.dmg, b.poison));
        else this.hitEnemy(target, b.dmg, b.poison);
        if (b.big) this.fx.lib.burst(target.x, 1, target.z, { radius: 0.7, color: TECH_FX.venom, core: TECH_FX.venomCore, rays: 3, sparks: 6, light: 0, dur: 0.16, wave: 0, power: 0.7 });
      }
      if (b.sting >= 0) {
        b.sting += dt / 0.3;
        if (b.sting >= 1) b.sting = -1;
      }
      // a forma `bat` já voa a meia altura do corpo; aqui só a altura do voo e para onde olha
      b.rig.root.position.set(b.x, (b.big ? 1.1 : 0.8) + Math.sin(this.time * 5 + b.phase) * 0.15, b.z);
      b.fx?.push(b.x, b.rig.root.position.y, b.z);
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
      // M5-03: a execução no mais forte: clarão vermelho e coluna de luz que cai sobre ele
      this.fx.lib.burst(target.x, 1.2, target.z, { radius: 1.2, color: TECH_FX.execRed, core: 0xffa070, rays: 7, sparks: 14, light: 1.2, dur: 0.24, wave: 0, power: 0.7 });
      this.fx.lib.pillar(target.x, target.z, { radius: 0.9, height: 5, color: TECH_FX.execRed, core: TECH_FX.execCore, dur: 0.35 });
    }
    for (const e of inside) {
      if (e !== target) this.hitEnemy(e, T.damage * 0.5);
      if (!e.dead) this.applyStatus(e, { kind: "stun", power: 1, duration: T.stun ?? 0.5 }, 0);
    }
    // M5-03: cratera; onda até o raio, fendas e lascas de pedra saltando do chão, poeira na borda
    const lib = this.fx.lib;
    lib.ring(p.x, p.z, { radius: r, color: TECH_FX.execRed, core: TECH_FX.execCore, width: 0.7, from: 0.15, fill: 0.25, dust: 16, dur: 0.4 });
    lib.groundCrack(p.x, p.z, { radius: r * 0.7, count: 7, width: 0.45, scorch: 0.7, color: TECH_FX.execRed, core: TECH_FX.execCore, dur: 1.1 });
    lib.spikes(p.x, p.z, { radius: r * 0.55, count: 12, height: 1.6, color: TECH_FX.rock, core: TECH_FX.rockCore, dur: 0.9 });
    lib.burst(p.x, 0.6, p.z, { radius: 1.4, color: TECH_FX.execRed, core: 0xffa070, rays: 6, sparks: 18, light: 1.8, dur: 0.26, power: 0.7 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
      lib.smoke(p.x + Math.sin(a) * r * 0.8, 0.5, p.z + Math.cos(a) * r * 0.8, { radius: 0.9 + Math.random() * 0.4, color: 0xa89878,
        alpha: 0.3, rise: 0.8, drift: [Math.sin(a) * 1.2, Math.cos(a) * 1.2], dur: 0.9 });
    }
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
    // M5-03: soco no chão; anel de fogo até o raio, fendas em brasa, clarão e fumaça subindo da borda
    const lib = this.fx.lib;
    lib.ring(p.x, p.z, { radius: r, color: 0xff8a2a, core: TECH_FX.fireCore, width: 0.8, fill: 0.35, dust: 14, dur: 0.4 });
    lib.groundCrack(p.x, p.z, { radius: r * 0.45, count: 6, width: 0.24, scorch: 0.6, color: TECH_FX.fireDeep, core: TECH_FX.fireCore, dur: 0.7 });
    lib.burst(p.x, 0.8, p.z, { radius: 1.6, color: TECH_FX.fireDeep, core: TECH_FX.fireCore, rays: 7, sparks: 16, light: 2.6, dur: 0.32 });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      this.fx.glow(p.x + Math.sin(a) * r * 0.9, 0.4, p.z + Math.cos(a) * r * 0.9, i % 2 ? 0xff8a2a : 0xffd34d, 0.7, 0.5, Math.sin(a) * 2, 2.2, Math.cos(a) * 2);
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.random();
      lib.smoke(p.x + Math.sin(a) * r * 0.7, 0.8, p.z + Math.cos(a) * r * 0.7, { radius: 1.2 + Math.random() * 0.5, color: TECH_FX.fireSmoke,
        alpha: 0.35, rise: 0.9, dur: 0.8 });
    }
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
        this.fx.lib.burst(e.x, 0.8, e.z, { radius: 0.9, color: TECH_FX.ice, core: TECH_FX.iceCore, rays: 4, sparks: 8, light: 0, dur: 0.2, wave: 0 });
      });
    }
    W.update(dt, (w: IceWall) => {
      const mx = (w.x0 + w.x1) / 2;
      const mz = (w.z0 + w.z1) / 2;
      // M5-03: o gelo se parte; lascas e névoa ao longo da parede
      const lib = this.fx.lib;
      const half = Math.hypot(w.x1 - w.x0, w.z1 - w.z0) / 2;
      for (let i = 0; i < 4; i++) {
        const k = (i + 0.5) / 4;
        const x = w.x0 + (w.x1 - w.x0) * k;
        const z = w.z0 + (w.z1 - w.z0) * k;
        lib.burst(x, 0.9, z, { radius: 1, color: TECH_FX.ice, core: TECH_FX.iceCore, rays: 3, sparks: 10, light: 0, dur: 0.24, wave: 0, power: 0.7 });
        lib.smoke(x, 0.3, z, { radius: 0.9, color: TECH_FX.mist, alpha: 0.18, rise: 0.4, dur: 0.6 });
      }
      if (!w.shatter) return;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - mx, e.z - mz) < half + px(20) + e.radius) this.hitEnemy(e, w.damage * 3, undefined, { ice: true });
      }
      lib.ring(mx, mz, { radius: half * 0.6, color: TECH_FX.ice, core: TECH_FX.iceCore, width: 0.5, from: 0.3, dust: 14, dur: 0.3, power: 0.8 });
      lib.spikes(mx, mz, { radius: half * 0.7, count: 12, height: 1.6, color: 0xcdeeff, core: 0x3a9bd0, opacity: 0.85, dur: 0.8 });
      lib.burst(mx, 1, mz, { radius: 2, color: TECH_FX.ice, core: TECH_FX.iceCore, rays: 7, sparks: 20, light: 2.2, dur: 0.3 });
      this.fx.addShake(0.35);
    });
  }

  private addTrail(x0: number, z0: number, x1: number, z1: number, hw: number, dur: number, every: number, dmg: number, color: number, burn?: StatusSpec): void {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
    mesh.rotation.order = "YXZ";
    mesh.rotation.set(-Math.PI / 2, Math.atan2(x1 - x0, z1 - z0), 0);
    mesh.position.set((x0 + x1) / 2, 0.07, (z0 + z1) / 2);
    mesh.scale.set(hw * 0.7, len, 1);
    this.scene.add(mesh);
    this.trails.push({ x0, z0, x1, z1, hw, until: this.time + dur, tick: every, every, dmg, color, mesh, burn });
  }

  /** Broodmother (techniques.lua): poça de 50 px de raio por 3 s; a cada 0,5 s envenena quem está dentro. */
  private addPool(b: Bee): void {
    const r = TECH_EVO.poolRadius;
    // M5-03: veneno escuro e translúcido, borda que ondula e brilha fino, bolhas que estouram
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uA: { value: 0 }, uT: { value: 0 }, uSeed: { value: Math.random() * 20 },
        uDeep: { value: new THREE.Color(TECH_FX.venomSmoke) }, uRim: { value: new THREE.Color(TECH_FX.venom) } },
      vertexShader: `varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec2 vP; uniform float uA, uT, uSeed; uniform vec3 uDeep, uRim;
        float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main() {
          float a = atan(vP.y, vP.x);
          float d = length(vP) / (0.9 + 0.05 * sin(a * 5.0 + uSeed + uT * 1.3) + 0.04 * sin(a * 9.0 - uT * 2.1));
          if (d > 1.0) discard;
          float rim = smoothstep(0.86, 0.97, d) * (1.0 - smoothstep(0.97, 1.0, d));
          vec2 c = floor(vP * 5.0 + uSeed);
          vec2 f = fract(vP * 5.0 + uSeed) - 0.5;
          float ph = fract(uT * 0.7 + h(c));
          float bub = h(c + 3.1) > 0.75 ? smoothstep(0.08, 0.0, abs(length(f) - 0.1 - ph * 0.22)) * (1.0 - ph) : 0.0;
          float body = 0.42 * (1.0 - smoothstep(0.55, 1.0, d) * 0.45);
          vec3 col = mix(uDeep, uRim, rim * 0.8 + bub * 0.6);
          gl_FragColor = vec4(col, (body + rim * 0.25 + bub * 0.25) * uA);
        }`,
    });
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 40), m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(b.x, 0.06, b.z);
    mesh.scale.setScalar(r * 0.2);
    this.scene.add(mesh);
    this.pools.push({ x: b.x, z: b.z, r, born: this.time, until: this.time + (b.pool ?? 3), tick: 0, dmg: b.dmg, poison: b.poison, mesh });
    // M5-03: a vespa estoura numa nuvem verde que assenta e vira a poça
    const lib = this.fx.lib;
    lib.burst(b.x, 1, b.z, { radius: 1, color: TECH_FX.venom, core: TECH_FX.venomCore, rays: 4, sparks: 10, light: 0, dur: 0.22, wave: 0, power: 0.8 });
    lib.ring(b.x, b.z, { radius: r, color: TECH_FX.venom, core: TECH_FX.venomCore, width: 0.3, from: 0.1, dust: 6, dur: 0.4, power: 0.6 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.random();
      lib.smoke(b.x + Math.sin(a) * r * 0.4, 0.3, b.z + Math.cos(a) * r * 0.4, { radius: 0.9 + Math.random() * 0.3, color: TECH_FX.venomSmoke,
        core: TECH_FX.venom, alpha: 0.4, rise: 0.25, dur: 0.9 + Math.random() * 0.3 });
    }
  }

  private disposePool(v: VenomPool): void {
    v.mesh.removeFromParent();
    v.mesh.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    });
  }

  /** Eclipse (sombra que repete o golpe) e Broodmother (poças). */
  private updateEvolvedTech(dt: number): void {
    for (let i = this.echoes.length - 1; i >= 0; i--) {
      const s = this.echoes[i];
      if (this.time < s.at) continue;
      this.echoes.splice(i, 1);
      const t = s.target;
      if (t.dead) continue;
      this.hitEnemy(t, s.dmg, undefined, { crit: true });
      this.fx.streak(s.x, s.z, t.x, t.z, 0.3, 0x6a4a9a, 0.3);
      this.fx.slash(t.x, t.z, Math.atan2(t.x - s.x, t.z - s.z), 2.4, 80, 0x8a5ad0);
      this.fx.burst(t.x, 1, t.z, 0x2a1a3d, 18, 4, 0.2, 0.5, -1);
    }
    const base = this.stats.damage * this.stats.autoDamage;
    for (let i = this.pools.length - 1; i >= 0; i--) {
      const v = this.pools[i];
      const left = v.until - this.time;
      v.tick -= dt;
      if (v.tick <= 0 && left > 0) {
        v.tick = TECH_EVO.poolEvery;
        for (const e of this.enemies) {
          if (e.dead || (e.x - v.x) ** 2 + (e.z - v.z) ** 2 > (v.r + e.radius) ** 2) continue;
          this.applyStatus(e, v.poison, base * v.dmg);
        }
      }
      const fade = Math.min(1, left / 0.5);
      const u = (v.mesh.material as THREE.ShaderMaterial).uniforms;
      u.uA.value = fade;
      u.uT.value = this.time;
      // cresce do respingo até o raio do dano em 0,3 s
      const grow = Math.min(1, (this.time - v.born) / 0.3);
      v.mesh.scale.setScalar(v.r * (0.2 + 0.8 * (1 - (1 - grow) ** 3)));
      if (Math.random() < dt * 6) this.fx.glow(v.x + (Math.random() - 0.5) * v.r, 0.15, v.z + (Math.random() - 0.5) * v.r, 0x9cff5a, 0.3, 0.6, 0, 1.2, 0);
      if (left <= 0) {
        this.disposePool(v);
        this.pools.splice(i, 1);
      }
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
      if (t.burn) {
        // Phoenix Rush: brasa no chão e labaredas ao longo do caminho
        (t.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(1, left / 0.4) * (0.22 + Math.random() * 0.08);
        for (let k = 0; k < 3; k++) {
          const q = Math.random();
          this.fx.glow(t.x0 + (t.x1 - t.x0) * q + (Math.random() - 0.5) * t.hw, 0.3 + Math.random() * 0.5,
            t.z0 + (t.z1 - t.z0) * q + (Math.random() - 0.5) * t.hw, Math.random() < 0.5 ? 0xff7a2a : 0xffc04d, 0.45, 0.5, 0, 2.2, 0);
        }
        if (t.tick <= 0 && left > 0) {
          t.tick = t.every;
          this.lineHit(t.x0, t.z0, t.x1, t.z1, t.hw, t.dmg, t.burn);
        }
        if (left <= 0) {
          this.disposeTrail(t);
          this.trails.splice(i, 1);
        }
        continue;
      }
      // M5-03: sem a faixa no chão (lia como decalque); o rastro é feito de faíscas e do relâmpago de cada pulso
      (t.mesh.material as THREE.MeshBasicMaterial).opacity = 0;
      // faíscas correndo pelo rastro
      if (Math.random() < 0.6) {
        const k = Math.random();
        this.fx.spark(t.x0 + (t.x1 - t.x0) * k + (Math.random() - 0.5) * t.hw, 0.2 + Math.random() * 0.6, t.z0 + (t.z1 - t.z0) * k + (Math.random() - 0.5) * t.hw, 0xfff29a, 0.1, 0.25, 1.5);
      }
      if (t.tick <= 0 && left > 0) {
        t.tick = t.every;
        this.lineHit(t.x0, t.z0, t.x1, t.z1, t.hw, t.dmg);
        // M5-03: cada pulso do rastro é um relâmpago rente ao chão de ponta a ponta
        this.fx.lib.lightning(t.x0, 0.35, t.z0, t.x1, 0.35, t.z1, { color: TECH_FX.boltBody, core: TECH_FX.boltCore, width: 0.18, branches: 2,
          rate: 0.05, dur: 0.18 });
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
      // M5-03: implosão; raios arcanos correm da borda para o centro, coluna de luz e clarão crescendo com os presos
      const lib = this.fx.lib;
      const big = 1 + Math.min(1, inside.length * 0.1);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + Math.random() * 0.4;
        lib.lightning(r.x + Math.cos(a) * r.r * 0.75, 0.4, r.z + Math.sin(a) * r.r * 0.75, r.x, 0.9, r.z,
          { color: TECH_FX.arcane, core: TECH_FX.arcaneCore, width: 0.26, branches: 1, rate: 0.05, dur: 0.22 });
      }
      lib.pillar(r.x, r.z, { radius: 1.2 * big, height: 6, color: TECH_FX.arcane, core: TECH_FX.arcaneCore, dur: 0.5 });
      lib.burst(r.x, 1, r.z, { radius: 2.2 * big, color: TECH_FX.arcane, core: TECH_FX.arcaneCore, rays: 7, sparks: 16 + inside.length * 3,
        light: 2 + inside.length * 0.3, dur: 0.3, power: 0.75 });
      lib.ring(r.x, r.z, { radius: r.r, color: TECH_FX.arcane, core: TECH_FX.arcaneCore, width: 0.6, from: 0.15, fill: 0.3, dust: 14, dur: 0.35 });
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
    // (ai.lua: quem está no ar não separa nem é separado; o Leaper no salto segue a linha dele)
    for (let i = 0; i < active.length; i++) {
      const a = active[i];
      if (a.airborne) continue;
      for (let j = i + 1; j < active.length; j++) {
        const b = active[j];
        if (b.airborne) continue;
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
      if (d2 < min * min && d2 > 1e-6 && !a.charging && !a.leap) {
        const d = Math.sqrt(d2);
        a.x = p.x + (dx / d) * min;
        a.z = p.z + (dz / d) * min;
      }
    }
    this.asTechnique(() => {
      this.updateIceWalls(dt, active);
      this.updateZonesOfTech(dt);
      this.updateEvolvedTech(dt);
    });
    this.hazards.update(dt, this.time);
    this.affixes.updateWorld(dt);
    this.wardAuras.update(this.enemies, this.time);
    this.terrain.update(dt, this.time);
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
    // relógio fora de ordem (quadros dados pelo console junto com os do navegador) não anda para trás
    const raw = Math.max(0, Math.min(0.05, real));
    this.lastFrame = t;
    this.fps += (1 / Math.max(real, 0.001) - this.fps) * 0.05;
    this.probe.begin();
    if (!this.started) {
      this.stage.frame(raw);
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
      this.hpBars.update(this.enemies, this.camera);
      this.statusIcons.update(this.enemies, { now: this.time, volatile: this.spells.volatile, brittleChill: this.spells.brittle, primed: (e) => this.primed(e) }, this.camera, this.fx, dt);
      this.updateProjectiles(dt);
      const inp = this.input;
      this.spells.update(dt, [inp.wasPressed("Digit1") || inp.wasPressed("Numpad1"), inp.wasPressed("Digit2") || inp.wasPressed("Numpad2")]);
      this.updateAllies(dt);
      this.updateDrops(dt);
      this.collectLoot(dt);
      this.fx.update(dt, this.camera, window.innerWidth, window.innerHeight);
      this.updateCamera(dt);
    }
    this.input.endFrame();
    updateLamps();
    this.pipeline.render();
    this.adaptResolution(raw);
    this.probe.end(real * 1000, this.time);
    if (!this.paused && this.run.wave >= 1) {
      this.perfLog.add(real * 1000, this.probe.lastCpu, this.pipeline.gpuMs, this.resScale, this.probe.lastTags, this.run.wave, this.run.statistics.elapsed);
    }
  }
}
