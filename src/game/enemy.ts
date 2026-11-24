// Inimigos e chefes: estado, IA por comportamento e padrões de ataque telegrafados.
import { PACE } from "../data/pace";
import { newFrostTarget, type FrostTarget } from "../core/frost";
import { bossStats, enemyStats } from "../core/wave";
import { pacedFoe } from "../core/pace";
import { circleInArc } from "../core/melee";
import { reactionFor, type ReactionId, type ReactState } from "../core/reactions";
import { BOSS_MECHANIC, BOSS_MECHANICS, BOSS_PROJECTILE_SPEED, BOSS_SKILLSHOT, BURN, CHILD_SCALE, FIRST_TIMER, MINION_SCALE, RUN_TUNING, SUMMON_CAP, type BossMechanicId } from "../data/run";
import { type BossPhase, armyCount, bloodRush, bossRotation, markMult, phaseSteps, soulWardCount, tetherMult } from "../core/bossphase";
import { distToSegment } from "../core/worldgen";
import { TetherBeam } from "./tether";
import { HAZARD_TICK, HELPERS } from "../data/enemies";
import { SPELL_CAST } from "../data/spells";
import { TUNING } from "../data/tuning";
import { CROWN_TITLE, ENEMIES, SHIELD_CYCLE, type BossDef, type BossPattern, type EnemyDef } from "../data/enemies";
import { guardBlocks, shieldPhase, turnToward } from "../core/guard";
import { type Leap, canLeap, leapHits, startLeap, stepLeap } from "../core/leap";
import { makeGuardBand, type GuardBand } from "./guard";
import type { StatusKind } from "../data/heroes";
import { animateRig, disposeRig, fadeRig, flashRig, tintRig, type Rig } from "./models";
import { characterRig } from "./rigs";
import * as THREE from "three";
import { type BossRing, type ChampionAura, type GroundArc, type Telegraph, makeBossRing, makeChampionAura } from "./fx";
import type { Game } from "./game";
import { AFFIXES, type AffixId } from "../data/affixes";
import { affixReward } from "../core/affixes";
import { makeShieldBubble, type ShieldBubble } from "./affixes";

/** cor do aviso do golpe, a mesma da marca no chão */
const WARN_COLOR = 0xff5a4a;
const WP = new THREE.Vector3();

export interface Dot {
  kind: StatusKind;
  dps: number;
  until: number;
  /** spell que aplicou (Fireball: o Volátil olha isto) e o espaço dela */
  spell?: string;
  slot?: number;
  /** veneno: um efeito só por inimigo com contador de acúmulos (status.lua `applyPoison`); o dano por segundo vale por acúmulo */
  stacks?: number;
  maxStacks?: number;
  /** Plague Bloom: duração de cada aplicação e o contágio na morte (status.lua `po.spread`) */
  duration?: number;
  spread?: { radius: number; stacks: number };
}

/** freio do empurrão (`kx`, `kz`): a velocidade cai por exp(-KNOCK_DECAY·t), então um empurrão de d metros é d·KNOCK_DECAY */
export const KNOCK_DECAY = 9;

export class Enemy {
  x: number;
  z: number;
  homeX: number;
  homeZ: number;
  def: EnemyDef | null;
  boss: BossDef | null;
  name: string;
  /** onda em que nasceu: dá a escala de vida e dano (core/wave.ts) e o nível dos itens que deixa */
  level: number;
  champion: boolean;
  summoned: boolean;
  /** nasceu de uma onda: persegue o herói pela clareira e nunca volta para casa */
  hunter = false;
  /** M21-13: sobra da onda: corre até o herói (`PACE.straggler`) */
  straggler = false;
  maxHp: number;
  hp: number;
  speed: number;
  radius: number;
  /** invocados e filhos da gosma não rendem ouro nem XP (`killReward`) */
  noReward: boolean;
  /** D-637: leva a promessa de um orbe do banco (moeda sob os pés; ao morrer, o orbe sai em dobro) */
  lootBonus = false;
  rig: Rig;
  facing = 0;
  aggro = false;
  /** raio em que acorda, no lugar do `TUNING.enemy.aggroRadius` (M21-09: o guarda do baú só acorda de perto) */
  aggroRange: number | null = null;
  dead = false;
  deadT = 0;
  remove = false;
  cd = 0;
  windupT = -1;
  /** alcance do golpe em preparo (Close Call olha a marca) */
  private swingRange = 0;
  windupDur: number = TUNING.enemy.telegraph.windup;
  /** direção travada do golpe em preparo e a marca dele no chão (M21-01) */
  swingAngle = 0;
  private swingMark: GroundArc | null = null;
  /** mira do tiro comum (M21-01 parte 2): -1 parado; senão segundos de mira */
  aimT = -1;
  attackAnim = -1;
  moveAmt = 0;
  flash = 0;
  /** velocidade de empurrão (decai sozinha) */
  kx = 0;
  kz = 0;
  /** M21-10: caiu no fosso (o corpo afunda no centro dele em vez de deitar) */
  fell: { x: number; z: number } | null = null;
  /** M21-10: lado do desvio quando pedra, fosso ou barril tapa o caminho (1 ou -1; 0 = livre) */
  private steer = 0;
  slowUntil = 0;
  slowPower = 0;
  stunUntil = 0;
  /** velocidade no último quadro (golpe pelas costas da Umbra) */
  vx = 0;
  vz = 0;
  /** estado do gelo da Frostine (src/core/frost.ts) */
  frost: FrostTarget;
  dots: Dot[] = [];
  /** M21-05: lento por fonte de gelo até aqui (Estilhaço), recarga das reações e reação esperando o próximo quadro */
  chillUntil = 0;
  reactUntil = 0;
  pendingReaction: ReactionId | null = null;

  reactState(now: number): ReactState {
    let burning = false;
    let poisoned = false;
    for (const d of this.dots) {
      if (d.until <= now) continue;
      if (d.kind === "burn") burning = true;
      else if (d.kind === "poison") poisoned = true;
    }
    return { chillUntil: this.chillUntil, burning, poisoned, stunned: now < this.stunUntil, reactUntil: this.reactUntil };
  }

  /** Praga: o estado que chega olha o de antes; a reação sai no próximo quadro (`update`), fora da pilha de quem aplicou. */
  private checkApply(now: number, status: "burn" | "poison"): void {
    const r = reactionFor(this.reactState(now), { kind: "apply", status }, now);
    if (r) this.pendingReaction = r;
  }

  /**
   * status.lua `applyPoison`: um veneno só por inimigo, de qualquer fonte (tiro da Vesper, Venom Nova, Ninhada,
   * Plague Bloom); cada aplicação soma um acúmulo (até o maior máximo visto) e renova a duração; fica o maior dano
   * por segundo; o contágio e a fonte ficam os da primeira aplicação que os trouxe.
   */
  /**
   * status.lua `applyBurn`: não acumula como efeito separado; reaplicar renova a duração, fica o maior dano por
   * segundo e conta um acúmulo (até 8); no tique valem até `burnStacks` do herói (1 + extras; Ignis +2), cada extra
   * com +50% do dano. A spell e o espaço lembram quem aplicou (Volátil do Fireball).
   */
  applyBurn(now: number, dps: number, duration: number, spell?: string, slot?: number): void {
    this.checkApply(now, "burn");
    const until = now + duration;
    const cur = this.dots.find((d) => d.kind === "burn");
    if (cur) {
      cur.dps = Math.max(cur.dps, dps);
      cur.until = Math.max(cur.until, until);
      cur.stacks = Math.min(BURN.stackCap, (cur.stacks ?? 1) + 1);
      if (spell) cur.spell = spell;
      if (slot !== undefined) cur.slot = slot;
    } else this.dots.push({ kind: "burn", dps, until, spell, slot, stacks: 1 });
  }

  applyPoison(now: number, dps: number, duration: number, maxStacks: number, spread?: Dot["spread"], source?: string): void {
    this.checkApply(now, "poison");
    const until = now + duration;
    const cur = this.dots.find((d) => d.kind === "poison");
    if (cur) {
      cur.dps = Math.max(cur.dps, dps);
      cur.until = Math.max(cur.until, until);
      cur.duration = Math.max(cur.duration ?? 0, duration);
      cur.maxStacks = Math.max(cur.maxStacks ?? 1, maxStacks);
      cur.stacks = Math.min(cur.maxStacks, (cur.stacks ?? 1) + 1);
      cur.spread ??= spread;
      cur.spell ??= source;
    } else this.dots.push({ kind: "poison", dps, until, duration, spell: source, stacks: 1, maxStacks, spread });
  }
  dotTick = 0;
  strafe = Math.random() < 0.5 ? -1 : 1;
  summonCd = 3;
  chargeCd = 2.5;
  mortarCd = 2;
  /** M9-05 (ai.lua `behaviors.leaper`): recarga do salto, o salto em curso, a marca no chão e a altura do arco */
  leapCd = 0;
  leap: Leap | null = null;
  private leapMark: Telegraph | null = null;
  hop = 0;
  /** no ar: sem separação, sem empurrão e sem obstáculo (ai.lua `airborne`) */
  airborne = false;
  /** ai.lua `berserker`: furioso (vida na metade ou menos), mais rápido e mais forte até morrer */
  berserk = false;
  /** cria do splitter (enemy.lua `splitChild`): sem recompensa, como o invocado, mas fora do teto de invocados */
  child = false;
  /** chefe: os padrões que ele usa (os dele e, no rei coroado, o emprestado) */
  patterns: readonly BossPattern[] = [];
  crowned = false;
  title = "";
  /** velocidade dos projéteis: dificuldade, sala e, no chefe, o dele */
  projK = 1;
  charging: { t: number; dur: number; dx: number; dz: number; speed: number; dmg: number; hit: boolean } | null = null;
  casting = 0;
  patternCd = 3;
  lastPattern = -1;
  enraged = false;
  /** M10-10 (boss.lua `updatePhase`): fase pela vida e o que ela já deu, aplicado uma vez ao entrar */
  phase: BossPhase = 1;
  phaseSpeed = 1;
  phasePatternK = 1;
  phaseMeleeK = 1;
  /** M10-01: skillshot com recarga própria (bosses.lua `skillshotCooldown`, ×fase) */
  skillshotCd: number = BOSS_SKILLSHOT.cooldown;
  phaseSkillshotK = 1;
  /** Marked Prey: ×1,25 do dano enquanto o herói estiver marcado por este chefe (atualizado a cada quadro) */
  markK = 1;
  /** M10-02 Burrow: recarga, tempo desde o mergulho (ou -1) e tempo desde a emersão (ou -1) */
  burrowCd: number = BOSS_MECHANICS.burrow.first;
  burrowT = -1;
  emergeT = -1;
  /** M10-03 Mirage: cópias vivas, a fase em que nasceram e o tempo sumido no Mirage Dash (ou -1) */
  illusions: Enemy[] = [];
  miragePhase = 0;
  dashBlinkT = -1;
  /** ataques em fila (boss_ai_ext.lua: o `erupt` põe cada erupção na fila com atraso) */
  private queued: { at: number; fn: () => void }[] = [];
  /** retícula do Mark seguindo o herói: `left` s até travar */
  private reticle: { tg: Telegraph; left: number } | null = null;
  /** mecânica própria do chefe (bosses.lua `mechanic`) */
  mechanic: BossMechanicId | null = null;
  /** Blood Rush: degraus de 10% de vida perdida (passo e dano sobem a cada um) */
  rushSteps = 0;
  rushSpeed = 1;
  rushDamage = 1;
  /** Army of the Damned: última fase em que o chefe já ergueu o exército */
  armyPhase = 0;
  /** Soul Tether: última fase em que ergueu selos, os selos e as linhas de luz até ele */
  wardPhase = 0;
  wards: Enemy[] = [];
  private tethers: TetherBeam[] = [];
  spiral: { left: number; timer: number; angle: number; p: BossPattern } | null = null;
  /** rugido em curso (0..1) ou -1; o chefe não ataca enquanto ruge */
  roarT = -1;
  roarDur = 1;
  /** fúria suavizada para a postura e o anel */
  rage = 0;
  /** chefe da emboscada (Boss Ambush): entra numa onda normal, sem relíquia de chefe */
  ambush = false;
  private emberT = 0;
  private ring: BossRing | null = null;
  private aura: ChampionAura | null = null;
  /** M9-06: afixos do campeão (affix_system.lua `apply`) e o estado deles */
  affixes: AffixId[] = [];
  /** Swift: recargas de ataque, investida, bomba, invocação e padrões de chefe multiplicadas por isto */
  cdMult = 1;
  /** Armored: dano recebido multiplicado por isto */
  dmgTakenMult = 1;
  /** Arcane Shield: bolha que come o dano antes da vida */
  shield = 0;
  shieldMax = 0;
  /** segundos desde o último dano (Regenerating e Arcane Shield esperam uma pausa) */
  idle = 0;
  regenOn = false;
  summonT = 0;
  blinkT = 0;
  trailT = 0;
  /** multiplicador de ouro e XP do campeão (+25% por afixo) */
  affixK = 1;
  bubble: ShieldBubble | null = null;
  /** M9-01 (ai.lua `behaviors.shield`): guinada do escudo de frente, relógio do ciclo e a fase dele */
  shieldYaw = 0;
  shieldT = 0;
  shieldState: "up" | "warn" | "down" = "up";
  private guardBand: GuardBand | null = null;

  constructor(game: Game, def: EnemyDef | BossDef, wave: number, x: number, z: number,
    opts: { champion?: boolean; summoned?: boolean; child?: boolean; final?: boolean; ambush?: { hp: number; damage: number } | null;
      crownAttack?: BossPattern | null; affixes?: readonly AffixId[] } = {}) {
    this.x = this.homeX = x;
    this.z = this.homeZ = z;
    this.level = wave;
    this.champion = opts.champion === true;
    this.summoned = opts.summoned === true;
    this.child = opts.child === true;
    const isBoss = "patterns" in def;
    this.frost = newFrostTarget(isBoss, this.champion);
    this.boss = isBoss ? (def as BossDef) : null;
    this.def = isBoss ? null : (def as EnemyDef);
    this.name = def.name;
    // onda 20: o rei coroado leva o título de lá e um ataque emprestado de outro chefe (wave_system.lua, D-640)
    this.crowned = isBoss && opts.final === true;
    this.title = this.crowned ? CROWN_TITLE : isBoss ? (def as BossDef).title : "";
    if (isBoss) this.patterns = opts.crownAttack ? [...(def as BossDef).patterns, opts.crownAttack] : (def as BossDef).patterns;
    // vida, dano e velocidade como no Dungeon Reign (enemy.lua, boss.lua): pela onda e pela dificuldade
    this.ambush = isBoss && !!opts.ambush;
    const st = isBoss ? bossStats(def.id, wave, game.mods, opts.final, opts.ambush ?? null) : pacedFoe(enemyStats(def, wave, game.mods, this.champion));
    const derived = opts.child ? CHILD_SCALE : this.summoned ? MINION_SCALE : null;
    this.maxHp = this.hp = Math.round(st.hp * (derived ? derived.hp : 1));
    this.projK = st.projectileSpeed;
    this.baseDmg = st.damage * (derived ? derived.damage : 1);
    this.speed = def.speed * st.speed * (derived ? derived.speed : 1);
    this.radius = def.radius * (this.champion ? 1.2 : 1);
    this.noReward = this.summoned || opts.child === true || (!isBoss && (def as EnemyDef).helper === true);
    if (isBoss) {
      this.windupDur = TUNING.enemy.telegraph.bossWindup;
      this.mechanic = BOSS_MECHANIC[def.id]?.id ?? null;
    }
    else {
      const d = def as EnemyDef;
      if (d.summon) this.summonCd = d.summon.cooldown * FIRST_TIMER.summon;
      if (d.charge) this.chargeCd = d.charge.cooldown * FIRST_TIMER.charge;
      if (d.mortar) this.mortarCd = d.mortar.cooldown * FIRST_TIMER.mortar;
      if (d.leap) this.leapCd = d.leap.cooldown * FIRST_TIMER.leap;
    }

    if (opts.affixes?.length) this.applyAffixes(game, opts.affixes);

    this.rig = this.makeRig();
    this.rig.root.position.set(x, 0, z);
    game.scene.add(this.rig.root);
    if (this.boss) {
      this.ring = makeBossRing(game.scene, this.boss.glow);
      this.ring.update(x, z, this.radius * 1.9, 0, 0, 0.45);
    }
    if (this.def?.shield) {
      this.shieldYaw = this.facing = Math.atan2(game.player.x - x, game.player.z - z);
      this.guardBand = makeGuardBand(game.scene, this.def.shield.arcDeg, 0x9ad1ff);
    }
    if (this.champion && !this.boss) {
      this.aura = makeChampionAura(game.scene);
      this.aura.update(x, z, this.radius, 0, 1);
    }
  }

  /** affix_system.lua `apply`, depois dos multiplicadores do campeão. */
  private applyAffixes(game: Game, ids: readonly AffixId[]): void {
    this.affixes = [...ids];
    for (const id of ids) {
      const a = AFFIXES[id];
      if (id === "swift") {
        this.speed *= a.speedMult!;
        this.cdMult *= a.cooldownMult!;
        this.summonCd *= a.cooldownMult!;
        this.chargeCd *= a.cooldownMult!;
        this.mortarCd *= a.cooldownMult!;
      } else if (id === "armored") this.dmgTakenMult *= a.damageTakenMult!;
      else if (id === "shielded") {
        this.shieldMax = this.shield = this.maxHp * a.shieldPct!;
        this.bubble = makeShieldBubble(game.scene, a.color);
      } else if (id === "summoner") this.summonT = a.interval! * 0.5;
      else if (id === "shadow") this.blinkT = a.interval!;
    }
    this.affixK = affixReward(ids.length);
  }

  /**
   * damage.lua `shieldBlocks`: o escudo erguido (ou piscando) segura o dano que vem de (fx, fz)? Devolve o multiplicador
   * (1 sem escudo). (px, pz) é o herói, a origem quando a do golpe está colada no corpo.
   */
  guardMult(fx: number, fz: number, px: number, pz: number): number {
    const sh = this.def?.shield;
    if (!sh || this.dead || this.shieldState === "down") return 1;
    if (!guardBlocks(this.shieldYaw, sh.arcDeg, this.x, this.z, this.radius, fx, fz, px, pz)) return 1;
    this.guardBand?.flash();
    return sh.damageMult;
  }

  hasAffix(id: AffixId): boolean {
    return this.affixes.includes(id);
  }

  /** tira da cena tudo o que é deste inimigo */
  dispose(): void {
    for (const t of this.tethers) t.dispose();
    this.tethers.length = 0;
    this.bubble?.dispose();
    this.bubble = null;
    this.guardBand?.dispose();
    this.guardBand = null;
    this.endSwing();
    disposeRig(this.rig);
    this.ring?.dispose();
    this.ring = null;
    this.aura?.dispose();
    this.aura = null;
  }

  private makeRig(): Rig {
    const variant = this.champion ? "champion" : this.summoned ? "summoned" : null;
    // enemies.lua `sprite`/`alpha`: a cópia do Mirage Djinn usa o corpo dele, meio transparente
    const look = this.def?.look;
    if (look) {
      const rig = characterRig(look.model, "boss", null);
      fadeRig(rig, look.opacity);
      return rig;
    }
    return characterRig(this.boss ? this.boss.id : this.def!.id, this.boss ? "boss" : "enemy", variant);
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

  /** dano base pela onda; o do chefe sobe com o Blood Rush (boss_ai.lua `hit`: `e.damage × rushDamage`) */
  baseDmg = 0;
  get dmg(): number {
    return this.baseDmg * this.rushDamage * this.markK;
  }

  /** dano do golpe e da investida: no berserker furioso, multiplicado (ai.lua `damageOf`) */
  get hitDmg(): number {
    const bz = this.def?.berserk;
    return this.berserk && bz ? this.dmg * bz.damage : this.dmg;
  }

  get isBoss(): boolean {
    return this.boss !== null;
  }

  private moveToward(game: Game, tx: number, tz: number, speed: number, dt: number): void {
    const dx = tx - this.x;
    const dz = tz - this.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.01) return;
    let ux = dx / d, uz = dz / d;
    // M21-10: com pedra do gargalo, fosso ou barril na frente, gira para um lado (o mesmo enquanto tapado)
    const look = this.radius + 0.9;
    const blocked = (x: number, z: number) => game.grid.hits(x, z, this.radius) || game.terrain.blocks(x, z, this.radius * 0.8);
    if (d > look && blocked(this.x + ux * look, this.z + uz * look)) {
      if (this.steer === 0) this.steer = Math.random() < 0.5 ? 1 : -1;
      // o lado de antes primeiro; tapado dos dois lados até 120°, segue reto (a colisão faz deslizar)
      search: for (const side of [this.steer, -this.steer]) {
        for (const deg of [35, 70, 105, 140]) {
          const a = ((deg * Math.PI) / 180) * side;
          const c = Math.cos(a), s = Math.sin(a);
          const rx = ux * c - uz * s, rz = ux * s + uz * c;
          if (!blocked(this.x + rx * look, this.z + rz * look)) {
            ux = rx;
            uz = rz;
            this.steer = side;
            break search;
          }
        }
      }
    } else this.steer = 0;
    this.x += ux * speed * dt;
    this.z += uz * speed * dt;
    this.moveAmt = 1;
  }

  private face(tx: number, tz: number): void {
    this.facing = Math.atan2(tx - this.x, tz - this.z);
  }

  update(game: Game, dt: number): void {
    const now = game.time;
    const p = game.player;
    const rig = this.rig;
    if (this.tethers.length) this.updateTethers(now);
    if (this.boss) {
      this.markK = markMult(p.mark, now, this as Enemy);
      if (this.reticle) this.followReticle(game, dt);
      if (this.burrowT >= 0) this.burrowT += dt;
      if (this.mechanic === "mirage") fadeRig(this.rig, this.dashBlinkT >= 0 ? TUNING.boss.blinkFade : 1);
      if (this.emergeT >= 0 && (this.emergeT += dt) > TUNING.boss.burrowAnim) this.emergeT = -1;
      if (this.queued.length && !this.dead) {
        const due = this.queued.filter((q) => q.at <= now);
        this.queued = this.queued.filter((q) => q.at > now);
        for (const q of due) q.fn();
      }
    }

    if (this.dead) {
      if (this.windupT >= 0) this.endSwing();
      if (this.leap) this.endLeap(game);
      this.aimT = -1;
      this.deadT += this.boss ? (dt * 1.25) / TUNING.boss.deathTime : dt * 2.0;
      // o corpo ainda desliza com o último empurrão
      this.x += this.kx * dt;
      this.z += this.kz * dt;
      const kd = Math.exp(-dt * 6);
      this.kx *= kd;
      this.kz *= kd;
      if (this.fell) {
        // afunda e encolhe indo para o meio do fosso
        const k = Math.min(1, dt * 5);
        this.x += (this.fell.x - this.x) * k;
        this.z += (this.fell.z - this.z) * k;
        rig.root.position.set(this.x, -this.deadT * this.deadT * 3, this.z);
        rig.root.scale.setScalar(Math.max(0.05, 1 - this.deadT * 0.6));
        animateRig(rig, { t: now, move: 0, attack: -1, windup: 0, dead: 0 });
        if (this.deadT >= 1.25) this.remove = true;
        return;
      }
      rig.root.position.set(this.x, 0, this.z);
      animateRig(rig, { t: now, move: 0, attack: -1, windup: 0, dead: this.deadT, bossDeath: this.isBoss });
      if (this.boss) this.dissolve(game, dt);
      this.aura?.update(this.x, this.z, this.radius, now, Math.max(0, 1 - this.deadT * 1.6));
      this.bubble?.update(this.x, this.z, this.radius, this.rig.height, 0, now);
      this.guardBand?.update(this.x, this.z, this.shieldYaw, this.radius, this.rig.height, 0, now);
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
          const n = d.stacks ?? 1;
          // veneno: dano por acúmulo; queimadura: +50% do maior dano por acúmulo extra, até o máximo do herói
          total += d.kind === "burn" ? d.dps * (1 + BURN.stackBonus * (Math.min(n, game.stats.burnStacks) - 1)) * BURN.tick : d.dps * n * 0.5;
          kind = d.kind;
        }
        if (total > 0) game.damageEnemy(this, total, { dot: kind });
        if (this.dead) return;
      }
    }
    if (this.pendingReaction) {
      const r = this.pendingReaction;
      this.pendingReaction = null;
      if (now >= this.reactUntil) game.react(this, r);
      if (this.dead) return;
    }

    if (this.affixes.length && this.aggro) {
      game.affixes.update(this, dt);
      if (this.dead) return;
    }

    const vx0 = this.x;
    const vz0 = this.z;
    this.moveAmt = 0;
    // ai.lua D-196: onda apressada acelera movimento e ritmo de ataque dos inimigos, menos os chefes
    const haste = !this.boss && game.wave?.hastened ? RUN_TUNING.hasten.enemySpeed : 1;
    this.cd -= dt * haste;
    const stunned = now < this.stunUntil;
    if (stunned && TUNING.enemy.telegraph.stunInterrupts) {
      if (this.windupT >= 0) this.endSwing();
      this.aimT = -1;
    }
    const bz = this.def?.berserk;
    if (bz && !this.berserk && this.hp <= this.maxHp * bz.threshold) {
      this.berserk = true;
      game.fx.shockwave(this.x, this.z, 2.2, 0xff3b2a);
      game.fx.text(this.x, this.rig.height + 0.3, this.z, "Berserk!", "crit");
    }
    const slow = now < this.slowUntil ? 1 - this.slowPower : 1;
    const speed = this.speed * slow * haste * this.phaseSpeed * this.rushSpeed * (this.berserk && bz ? bz.speed : 1) * (this.straggler ? PACE.straggler.speed : 1);
    const dxp = p.x - this.x;
    const dzp = p.z - this.z;
    const dist = Math.hypot(dxp, dzp);
    const alive = game.playerAlive;

    if (!stunned) {
      if (!this.aggro) {
        const r = this.isBoss ? game.layout.bossRadius : this.aggroRange ?? TUNING.enemy.aggroRadius;
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
          : !this.hunter && fromHome > TUNING.enemy.leashRadius && dist > TUNING.enemy.aggroRadius;
        if (!alive || leash) this.reset(game);
        else if (this.boss && this.roarT >= 0) this.updateRoar(game, dt);
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
      // a investida para na borda da clareira da luta (não sai da arena)
      if (game.keepInArena(this)) c.t = c.dur;
      if (!c.hit && Math.hypot(p.x - this.x, p.z - this.z) < this.radius + 0.9) {
        c.hit = true;
        game.hurtPlayer(c.dmg, this.name, this);
      }
      if (c.t >= c.dur) this.charging = null;
    }

    // M9-05: salto em curso (preparo parado, voo em linha reta, pouso que acerta quem estiver no círculo)
    if (this.leap) this.stepLeap(game, dt, stunned);

    if (this.airborne || this.def?.behavior === "static") this.kx = this.kz = 0;
    this.x += this.kx * dt;
    this.z += this.kz * dt;
    const kdec = Math.exp(-dt * KNOCK_DECAY);
    this.kx *= kdec;
    this.kz *= kdec;
    if (!this.airborne) game.grid.resolve(this, this.radius);
    // M21-10: fosso e barris; empurrado com força para dentro do fosso, cai
    const pit = game.terrain.step(this);
    if (pit) {
      game.fallEnemy(this, pit);
      return;
    }
    if (dt > 0) {
      this.vx = (this.x - vx0) / dt;
      this.vz = (this.z - vz0) / dt;
    }
    const lim = game.layout.size / 2 - 6;
    this.x = Math.max(-lim, Math.min(lim, this.x));
    this.z = Math.max(-lim, Math.min(lim, this.z));

    // visual
    rig.root.position.set(this.x, this.hop, this.z);
    let da = this.facing - rig.root.rotation.y;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    rig.root.rotation.y += da * Math.min(1, dt * 12);
    if (this.attackAnim >= 0) {
      this.attackAnim += dt * 3.5;
      if (this.attackAnim >= 1) this.attackAnim = -1;
    }
    const lp = this.leap ? this.leapPose : null;
    animateRig(rig, {
      t: now, move: stunned ? 0 : this.moveAmt, attack: this.attackAnim, air: lp?.air,
      windup: lp ? lp.crouch : this.windupT >= 0 ? this.windupT / this.windupDur : this.aimT >= 0 ? this.aimT / TUNING.enemy.telegraph.shotWindup : this.casting > 0 ? 0.6 + Math.sin(now * 20) * 0.1 : 0, dead: 0,
      rage: this.rage, roar: this.roarT, burrow: this.boss ? this.burrowK : 0,
    });
    this.aura?.update(this.x, this.z, this.radius, now + this.rig.phase, 1);
    this.bubble?.update(this.x, this.z, this.radius, this.rig.height, this.shieldMax > 0 ? this.shield / this.shieldMax : 0, now);
    this.guardBand?.update(this.x, this.z, this.shieldYaw, this.radius, this.rig.height,
      this.shieldState === "up" ? 1 : this.shieldState === "warn" ? 0.5 : 0, now);
    if (this.boss) {
      this.rage += ((this.enraged ? 1 : 0) - this.rage) * Math.min(1, dt * 3);
      this.ring?.update(this.x, this.z, this.radius * 1.9, now, this.rage, this.aggro ? 1 : 0.45);
      if (this.enraged) {
        // brasas subindo do corpo
        this.emberT -= dt;
        while (this.emberT <= 0) {
          this.emberT += 0.07;
          const a = Math.random() * Math.PI * 2, r = Math.random() * this.radius;
          game.fx.glow(this.x + Math.cos(a) * r, 0.4 + Math.random() * rig.height * 0.8, this.z + Math.sin(a) * r, 0xff4a1a, 0.3, 0.7, 0, 2.2 + Math.random() * 1.5, 0, -1);
        }
      }
    }
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 7);
      flashRig(rig, this.flash);
    } else if (now < this.frost.brittleUntil) tintRig(rig, 0xe6f8ff, 0.5 + Math.sin(now * 10) * 0.12);
    else if (stunned) tintRig(rig, 0x8fdcff, 0.55);
    else if (this.dots.length) tintRig(rig, this.dots[0].kind === "poison" ? 0x5fd35f : 0xff7a1a, 0.35);
    else if (now < this.slowUntil || this.frost.frostStacks > 0) tintRig(rig, 0x8fdcff, 0.2 + this.frost.frostStacks * 0.035);
    else if (this.enraged) tintRig(rig, 0xff2a1a, 0.13 + Math.sin(now * 8) * 0.09);
    else flashRig(rig, 0);
  }

  setAggro(game: Game): void {
    if (this.aggro || this.dead) return;
    this.aggro = true;
    this.cd = Math.max(this.cd, this.def ? this.def.cooldown * FIRST_TIMER.attack * this.cdMult : 0.4 + Math.random() * 0.5);
    if (this.isBoss) {
      game.onBossAggro(this);
      this.startRoar(TUNING.boss.roarTime);
    } else {
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
    this.endSwing();
    this.aimT = -1;
    this.casting = 0;
    this.charging = null;
    this.endLeap(game);
    this.spiral = null;
    this.hp = this.maxHp;
    this.enraged = false;
    this.phase = 1;
    this.phaseSpeed = this.phasePatternK = this.phaseMeleeK = this.phaseSkillshotK = 1;
    this.skillshotCd = BOSS_SKILLSHOT.cooldown;
    this.burrowCd = BOSS_MECHANICS.burrow.first;
    this.burrowT = this.emergeT = -1;
    this.dashBlinkT = -1;
    this.queued.length = 0;
    this.dropIllusions();
    if (this.reticle) this.reticle.tg.cancelled = true;
    this.reticle = null;
    this.rushSteps = 0;
    this.rushSpeed = this.rushDamage = 1;
    this.armyPhase = 0;
    this.dropWards(game);
    this.roarT = -1;
    this.dots.length = 0;
    if (this.isBoss) game.onBossReset(this);
    if (this.summoned) {
      this.dead = true;
      this.deadT = 1;
    }
  }

  private startRoar(dur: number): void {
    this.roarT = 0;
    this.roarDur = dur;
    this.endSwing();
  }

  /** Rugido: o chefe encara o herói e, no auge, solta uma onda no chão com tremor de câmera. */
  private updateRoar(game: Game, dt: number): void {
    const b = this.boss!;
    this.face(game.player.x, game.player.z);
    const before = this.roarT;
    this.roarT += dt / this.roarDur;
    if (before < 0.34 && this.roarT >= 0.34) {
      game.fx.shockwave(this.x, this.z, 16, b.glow, 0.9);
      game.fx.shockwave(this.x, this.z, 9, 0xffffff, 0.5);
      game.fx.flashLight(this.x, this.rig.height * 0.7, this.z, b.glow, 60, 0.6);
      game.fx.burst(this.x, this.rig.height * 0.8, this.z, b.glow, 26, 9, 0.2, 0.7);
      game.fx.addShake(0.8);
    }
    if (this.roarT >= 1) this.roarT = -1;
  }

  /** Morte de chefe: o corpo acende na cor dele e solta partículas até sumir num clarão. */
  private dissolve(game: Game, dt: number): void {
    const b = this.boss!;
    const k = Math.min(1, this.deadT / 1.25);
    tintRig(this.rig, b.glow, 0.12 + 0.88 * k * k);
    this.ring?.update(this.x, this.z, this.radius * 1.9 * (1 + k * 0.6), game.time, this.rage, 1 - k);
    this.emberT -= dt;
    while (this.emberT <= 0) {
      this.emberT += 0.05 - 0.035 * k;
      const a = Math.random() * Math.PI * 2, r = Math.random() * this.radius * 1.1;
      game.fx.glow(this.x + Math.cos(a) * r, 0.2 + Math.random() * this.rig.height * (0.9 - 0.6 * k), this.z + Math.sin(a) * r, b.glow, 0.34, 0.9, Math.cos(a) * 0.6, 2.4 + Math.random() * 2, Math.sin(a) * 0.6, -1.5);
    }
    if (this.deadT >= 1.25) {
      game.fx.burst(this.x, 1, this.z, b.glow, 60, 10, 0.24, 1);
      game.fx.shockwave(this.x, this.z, 9, b.glow, 0.6);
      game.fx.flashLight(this.x, 1.5, this.z, b.glow, 70, 0.5);
    }
  }

  /** Começa o golpe: trava a direção e desenha o arco no chão (M21-01). */
  private startSwing(game: Game, tx: number, tz: number, range: number): void {
    const T = TUNING.enemy.telegraph;
    this.windupT = 0;
    this.swingAngle = Math.atan2(tx - this.x, tz - this.z);
    this.swingRange = range;
    this.facing = this.swingAngle;
    this.swingMark?.dispose();
    this.swingMark = game.fx.groundArc(this.x, this.z, this.swingAngle, this.boss ? T.bossArc : T.arc, range + T.reachPad);
  }

  /** Cancela ou fecha o golpe em preparo e tira a marca. */
  private endSwing(): void {
    this.windupT = -1;
    this.swingMark?.dispose();
    this.swingMark = null;
  }

  /** Close Call (M21-07): segundos até o golpe em preparo fechar, se ele acertaria o herói em (px, pz); senão Infinity. */
  swingThreat(px: number, pz: number): number {
    if (this.windupT < 0 || !this.swingHits(px, pz, this.swingRange)) return Infinity;
    return Math.max(0, this.windupDur - this.windupT);
  }

  /** O herói (círculo de raio `playerRadius`) toca o arco do golpe? */
  private swingHits(px: number, pz: number, range: number): boolean {
    const T = TUNING.enemy.telegraph;
    return circleInArc(this.x, this.z, this.swingAngle, this.boss ? T.bossArc : T.arc, range + T.reachPad, px, pz, T.playerRadius);
  }

  private meleeStep(game: Game, dt: number, dist: number, speed: number, range: number): void {
    const p = game.player;
    if (this.windupT >= 0) {
      this.windupT += dt;
      this.swingMark?.set(this.x, this.z, this.windupT / this.windupDur);
      this.glowWeapon(game, this.windupT / this.windupDur, WARN_COLOR);
      if (this.windupT >= this.windupDur) {
        this.endSwing();
        this.attackAnim = 0;
        const ward = this.boss ? null : game.spells.wardFor(this);
        if (ward) game.spells.hitWard(ward);
        else if (this.swingHits(p.x, p.z, range)) game.hurtPlayer(this.hitDmg, this.name, this);
        this.cd = (this.boss ? this.boss.attackCooldown * this.phaseMeleeK : this.def!.cooldown) * this.cdMult;
      }
      return;
    }
    // Earthen Ward (ai.lua `melee`, D-539): o ídolo no raio de atração puxa o inimigo, que bate nele no lugar do herói
    const ward = this.boss ? null : game.spells.wardFor(this);
    if (ward) {
      this.face(ward.x, ward.z);
      const wd = Math.hypot(ward.x - this.x, ward.z - this.z);
      const reach = range - 0.3 + SPELL_CAST.wardHitRadius;
      if (wd > reach * 0.85) this.moveToward(game, ward.x, ward.z, speed, dt);
      else if (this.cd <= 0) this.startSwing(game, ward.x, ward.z, range);
      return;
    }
    this.face(p.x, p.z);
    if (dist > range) this.moveToward(game, p.x, p.z, speed, dt);
    else if (this.cd <= 0) this.startSwing(game, p.x, p.z, range);
  }

  /** Ponto da arma (osso `weapon`, senão a mão direita; sem braço, a frente do corpo), no mundo. */
  private weaponPoint(): THREE.Vector3 {
    const B = this.rig.char?.bones;
    const bone = B?.weapon ?? B?.foreR;
    if (bone) return WP.set(0, B?.weapon ? -0.35 : -0.3, 0).applyMatrix4(bone.matrixWorld);
    return WP.set(this.x + Math.sin(this.facing) * this.radius, this.rig.height * 0.55, this.z + Math.cos(this.facing) * this.radius);
  }

  /** Boca do tiro: à frente do corpo, na altura do peito, onde o projétil nasce. */
  private muzzlePoint(): THREE.Vector3 {
    const r = this.radius + TUNING.enemy.telegraph.muzzleReach;
    return WP.set(this.x + Math.sin(this.facing) * r, this.rig.height * 0.5, this.z + Math.cos(this.facing) * r);
  }

  /** Brilho que cresce na arma durante o preparo ou a mira (k de 0 a 1). Um ponto por quadro, de vida curta. */
  private glowWeapon(game: Game, k: number, color: number, muzzle = false): void {
    const [s0, s1] = TUNING.enemy.telegraph.glowSize;
    const w = muzzle ? this.muzzlePoint() : this.weaponPoint();
    const kk = Math.min(1, Math.max(0, k));
    game.fx.glow(w.x, w.y, w.z, color, (s0 + (s1 - s0) * kk * kk) * (0.9 + Math.random() * 0.2), 0.06);
  }

  /** enemy_attacks.lua `fire`: mira exata no herói; a bomba do bombardier é maior (7 px contra 5). */
  private stepLeap(game: Game, dt: number, stunned: boolean): void {
    const L = this.def!.leap!;
    const leap = this.leap!;
    // atordoar no preparo cancela o salto (como o golpe, M21-01); no ar ele termina o voo
    if (leap.windup > 0 && stunned && TUNING.enemy.telegraph.stunInterrupts) {
      this.endLeap(game);
      return;
    }
    const s = stepLeap(leap, dt, L);
    this.x = s.x;
    this.z = s.z;
    this.hop = s.hop;
    this.airborne = s.airborne;
    if (s.k > 0) this.moveAmt = 0;
    if (!s.landed) return;
    this.endLeap(game, false);
    game.fx.shockwave(this.x, this.z, L.radius, 0xd8b048);
    game.fx.burst(this.x, 0.15, this.z, 0x9a8458, 14, 5, 0.18, 0.45, 10);
    game.audio.play("land");
    const p = game.player;
    if (game.playerAlive && leapHits(this.x, this.z, L.radius, p.x, p.z, TUNING.enemy.telegraph.playerRadius))
      game.hurtPlayer(this.hitDmg * L.damage, this.name, this);
  }

  /** acaba o salto (morte, reinício, atordoado no preparo ou pouso) */
  private endLeap(game: Game, cancelMark = true): void {
    if (cancelMark && this.leapMark) game.fx.cancelTelegraph(this.leapMark);
    this.leapMark = null;
    this.leap = null;
    this.hop = 0;
    this.airborne = false;
  }

  /** 0..1 do preparo do salto ou do voo, para a animação */
  get leapPose(): { crouch: number; air: number } {
    const L = this.leap;
    if (!L || !this.def?.leap) return { crouch: 0, air: 0 };
    if (L.windup > 0) return { crouch: 1 - L.windup / this.def.leap.windup, air: 0 };
    return { crouch: 0, air: Math.min(1, L.t / this.def.leap.airTime) };
  }

  private shoot(game: Game, color: number, speedP: number, size = 1): void {
    const p = game.player;
    const a = Math.atan2(p.x - this.x, p.z - this.z);
    game.spawnEnemyProjectile(this.x + Math.sin(a) * this.radius, this.z + Math.cos(a) * this.radius, a, speedP * this.projK, this.dmg, color, 0.26 * size, this);
    this.attackAnim = 0;
  }

  private updateBehavior(game: Game, dt: number, dist: number, speed: number): void {
    const d = this.def!;
    const p = game.player;
    if (this.charging || this.leap) return;
    switch (d.behavior) {
      case "melee":
        this.meleeStep(game, dt, dist, speed, (d.attackRange ?? 1.5) + 0.3);
        break;
      case "shield": {
        // ai.lua `behaviors.shield`: o ciclo corre sempre (nasce erguido); o escudo gira devagar para o herói, e o corpo com ele
        const sh = d.shield!;
        this.shieldT += dt;
        this.shieldState = shieldPhase(this.shieldT, SHIELD_CYCLE);
        this.shieldYaw = turnToward(this.shieldYaw, Math.atan2(p.x - this.x, p.z - this.z), sh.turnRate * dt);
        this.meleeStep(game, dt, dist, speed, (d.attackRange ?? 1.5) + 0.3);
        this.facing = this.shieldYaw;
        break;
      }
      case "charger": {
        const c = d.charge!;
        this.chargeCd -= dt;
        if (this.casting > 0) {
          this.casting -= dt;
          return;
        }
        if (this.chargeCd <= 0 && dist > 5 && dist < c.range && this.windupT < 0) {
          this.chargeCd = c.cooldown * this.cdMult;
          this.face(p.x, p.z);
          const a = this.facing;
          this.casting = c.windup;
          const len = Math.min(c.range, dist + 5, game.arenaReach(this.x, this.z, Math.sin(a), Math.cos(a), this.radius));
          game.fx.telegraphRect(this.x, this.z, a, len, this.radius * 2 + 0.8, c.windup, () => {
            if (this.dead || game.time < this.stunUntil) return;
            this.charging = { t: 0, dur: len / c.speed, dx: Math.sin(a), dz: Math.cos(a), speed: c.speed, dmg: this.hitDmg * c.damage, hit: false };
          });
          return;
        }
        this.meleeStep(game, dt, dist, speed, (d.attackRange ?? 1.5) + 0.3);
        break;
      }
      case "leaper": {
        // ai.lua `behaviors.leaper`: com a recarga pronta e o herói entre o mínimo e o alcance, marca o lugar dele e salta;
        // fora disso, corpo a corpo
        const L = d.leap!;
        this.leapCd -= dt;
        if (this.windupT < 0 && canLeap(this.leapCd, dist, L)) {
          this.leapCd = L.cooldown * this.cdMult;
          this.face(p.x, p.z);
          this.leap = startLeap(this.x, this.z, p.x, p.z, L.windup);
          this.leapMark = game.fx.telegraphCircle(p.x, p.z, L.radius, L.windup + L.airTime, () => {});
          return;
        }
        this.meleeStep(game, dt, dist, speed, (d.attackRange ?? 1.5) + 0.3);
        break;
      }
      case "ranged":
      case "summoner":
      case "bombardier": {
        // ai.lua `ranged`: parado enquanto mira; longe, chega até 0,85 do alcance; perto (metade), recua a 0,8
        const range = d.range ?? 12;
        this.face(p.x, p.z);
        if (this.aimT >= 0) {
          // M21-01 parte 2: a boca brilha e o tiro vai onde o herói estiver no fim da mira
          this.aimT += dt;
          const k = this.aimT / TUNING.enemy.telegraph.shotWindup;
          this.glowWeapon(game, k, d.projectileColor ?? 0xffffff, true);
          if (k >= 1) {
            this.aimT = -1;
            this.shoot(game, d.projectileColor ?? 0xffffff, d.projectileSpeed ?? 12, d.mortar ? 1.4 : 1);
          }
        } else if (dist > range * 0.85) this.moveToward(game, p.x, p.z, speed, dt);
        else if (dist < range * 0.5) this.moveToward(game, this.x - (p.x - this.x), this.z - (p.z - this.z), speed * 0.8, dt);
        else {
          // adaptado: anda de lado em vez de ficar parado (lá fica parado na faixa de tiro)
          const nx = -(p.z - this.z) / dist;
          const nz = (p.x - this.x) / dist;
          this.moveToward(game, this.x + nx * this.strafe, this.z + nz * this.strafe, speed * 0.45, dt);
          if (Math.random() < dt * 0.3) this.strafe *= -1;
        }
        if (d.summon) {
          // ai.lua `summoner`: a recarga corre sempre; invoca até o teto global de invocados vivos
          this.summonCd -= dt;
          if (this.summonCd <= 0) {
            this.summonCd = d.summon.cooldown * this.cdMult;
            const n = Math.min(d.summon.count, SUMMON_CAP - game.countSummons());
            for (let i = 0; i < n; i++) {
              const a = Math.random() * Math.PI * 2;
              const r = this.radius + 0.9;
              game.spawnEnemy(d.summon.id, this.level, this.x + Math.cos(a) * r, this.z + Math.sin(a) * r, { summoned: true, aggro: true });
            }
            if (n > 0) game.fx.shockwave(this.x, this.z, 2.5, d.accent);
          }
        }
        if (d.mortar) {
          // ai.lua `bombardier`: além da bomba direta, a bomba no chão onde o herói está, com recarga própria
          this.mortarCd -= dt;
          if (this.mortarCd <= 0 && dist <= range * 1.2) {
            this.mortarCd = d.mortar.cooldown * this.cdMult;
            const tx = p.x;
            const tz = p.z;
            const r = d.mortar.radius;
            const dmg = this.dmg;
            game.fx.telegraphCircle(tx, tz, r, d.mortar.warning, () => game.explode(tx, tz, r, dmg, d.projectileColor ?? 0xff9a3c, this.name));
          }
        }
        if (this.cd <= 0 && dist <= range && this.aimT < 0) {
          this.cd = d.cooldown * this.cdMult;
          this.aimT = 0;
        }
        break;
      }
    }
  }

  // ---------------------------------------------------------------- chefe
  private updateBoss(game: Game, dt: number, dist: number, speed: number): void {
    const b = this.boss!;
    const p = game.player;
    if (this.updatePhase(game)) return;
    this.updateMechanic(game, dt);
    if (this.spiral) {
      const s = this.spiral;
      s.timer -= dt;
      while (s.timer <= 0 && s.left > 0) {
        s.timer += 0.055;
        s.left--;
        s.angle += 0.52;
        for (let arm = 0; arm < 3; arm++) {
          game.spawnEnemyProjectile(this.x, this.z, s.angle + (arm * Math.PI * 2) / 3, (s.p.speed ?? 10) * this.projK, this.dmg * s.p.damage, b.projectileColor, 0.3, this);
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
    // boss_ai.lua `rotation` e `hasSkillshot`: só os padrões que a fase já abriu (o emprestado do rei coroado vem no fim
    // e ele tem todos); o skillshot corre com recarga própria, fora da rotação
    const { rotation, skillshot } = bossRotation(this.patterns.map((pt) => pt.kind), this.phase, this.crowned);
    if (skillshot && this.windupT < 0) {
      this.skillshotCd -= dt;
      if (this.skillshotCd <= 0) {
        this.skillshotCd = BOSS_SKILLSHOT.cooldown * this.phaseSkillshotK * this.cdMult;
        this.startPattern(game, this.patterns.find((pt) => pt.kind === "skillshot")!, dist);
        return;
      }
    }
    this.patternCd -= dt;
    if (this.patternCd <= 0 && this.windupT < 0) {
      this.patternCd = b.patternCooldown * this.phasePatternK * this.cdMult;
      if (rotation.length) {
        let k = Math.floor(Math.random() * rotation.length);
        if (rotation[k] === this.lastPattern) k = (k + 1) % rotation.length;
        this.lastPattern = rotation[k];
        this.startPattern(game, this.patterns[rotation[k]], dist);
        return;
      }
    }
    // bosses.lua `preferred`: o caçador mantém a distância; só vai ao golpe se o herói encostar
    if (b.preferred && this.windupT < 0 && dist > b.attackRange + TUNING.boss.closeIn) this.keepDistance(game, dt, dist, speed, b.preferred);
    else this.meleeStep(game, dt, dist, speed, b.attackRange);
    void p;
  }

  /**
   * boss_ai.lua `BA.update` (movimento com `preferred`): longe da faixa chega, perto recua, na faixa anda de lado e às
   * vezes troca o lado. Parede da arena no recuo: anda de lado.
   */
  private keepDistance(game: Game, dt: number, dist: number, speed: number, pref: number): void {
    const p = game.player;
    const px = TUNING.enemy.pxToUnit;
    this.face(p.x, p.z);
    const nx = (p.x - this.x) / dist, nz = (p.z - this.z) / dist;
    const strafe = () => {
      this.moveToward(game, this.x - nz * this.strafe, this.z + nx * this.strafe, speed * 0.6, dt);
      if (Math.random() < dt * 0.3) this.strafe *= -1;
    };
    if (dist > pref + 30 * px) this.moveToward(game, p.x, p.z, speed, dt);
    else if (dist < pref - 50 * px) {
      this.moveToward(game, this.x - nx, this.z - nz, speed, dt);
      if (game.keepInArena(this)) strafe();
    } else strafe();
    game.keepInArena(this);
  }

  /** boss_ai.lua `mark` (`followPlayer`): a retícula vai com o herói até travar */
  private followReticle(game: Game, dt: number): void {
    const r = this.reticle!;
    if (r.tg.cancelled || this.dead) {
      r.tg.cancelled = true;
      this.reticle = null;
      return;
    }
    r.left -= dt;
    if (r.left <= 0) return;
    const p = game.player;
    r.tg.x = p.x;
    r.tg.z = p.z;
    r.tg.outline.position.x = r.tg.fill.position.x = p.x;
    r.tg.outline.position.z = r.tg.fill.position.z = p.z;
  }

  /**
   * boss.lua `updatePhase`: cada fase que a vida atravessou entra uma vez e em ordem, com os multiplicadores dela. A
   * fase 2 dá um aviso curto; a 3 é a fúria, com rugido. Devolve true se o chefe parou para rugir.
   */
  private updatePhase(game: Game): boolean {
    let roared = false;
    for (const st of phaseSteps(this.phase, this.hp / this.maxHp)) {
      this.phase = st.phase;
      this.phaseSpeed *= st.speed;
      this.phasePatternK *= st.patternCooldown;
      this.phaseMeleeK *= st.meleeCooldown;
      this.phaseSkillshotK *= st.skillshotCooldown;
      if (st.enraged) {
        this.enraged = true;
        game.fx.shockwave(this.x, this.z, 8, 0xff2a1a, 0.6);
        game.fx.text(this.x, this.rig.height + 1, this.z, "ENRAGED!", "crit");
        game.audio.play("boss");
        this.startRoar(TUNING.boss.enrageRoarTime);
        roared = true;
      } else {
        game.fx.shockwave(this.x, this.z, 5, this.boss!.glow, 0.45);
        game.fx.text(this.x, this.rig.height + 1, this.z, `PHASE ${st.phase}`, "crit");
        game.audio.play("warn");
      }
    }
    return roared;
  }

  /** boss_ai.lua `updateMechanic` e o exército do Gravekeeper (`BA.update`, D-199). */
  private updateMechanic(game: Game, dt: number): void {
    if (this.mechanic === "burrow") {
      // boss_ai_ext.lua `burrow`: o relógio corre sempre; mergulha quando não está atacando
      this.burrowCd -= dt;
      if (this.burrowCd <= 0 && this.burrowT < 0 && this.casting <= 0 && !this.charging && !this.spiral && this.windupT < 0) {
        this.burrowCd = BOSS_MECHANICS.burrow.interval;
        this.startBurrow(game);
      }
    } else if (this.mechanic === "blood_rush") {
      const r = bloodRush(this.hp / this.maxHp);
      if (r.steps > this.rushSteps) {
        game.fx.shockwave(this.x, this.z, 3.2, 0xff2a2a, 0.35);
        game.fx.text(this.x, this.rig.height + 0.6, this.z, `Blood Rush ${r.steps}`, "crit");
      }
      this.rushSteps = r.steps;
      this.rushSpeed = r.speed;
      this.rushDamage = r.damage;
    } else if (this.mechanic === "army_of_the_damned" && this.armyPhase < this.phase) {
      this.armyPhase = this.phase;
      this.raiseArmy(game, armyCount(this.phase));
    } else if (this.mechanic === "mirage" && this.miragePhase < this.phase) {
      this.miragePhase = this.phase;
      this.raiseIllusions(game);
    } else if (this.mechanic === "soul_tether" && this.wardPhase < this.phase) {
      this.wardPhase = this.phase;
      this.raiseWards(game, soulWardCount(this.phase));
    }
  }

  /** boss_ai_ext.lua `line`: faixa avisada a partir de (x0, z0); quem estiver nela quando fecha leva o golpe */
  private beam(game: Game, x0: number, z0: number, a: number, L: number, w: number, warn: number, dmg: number): void {
    const b = this.boss!;
    const s1 = { x: x0 + Math.sin(a) * L, z: z0 + Math.cos(a) * L };
    game.fx.telegraphRect(x0, z0, a, L, w, warn, () => {
      if (this.dead || !this.aggro) return;
      this.attackAnim = 0;
      for (let i = 0; i <= 20; i++) game.fx.spark(x0 + (s1.x - x0) * (i / 20), 0.6, z0 + (s1.z - z0) * (i / 20), b.glow, 0.22, 0.35, 1.4);
      const hp = game.player;
      if (distToSegment(hp.x, hp.z, { x: x0, z: z0 }, s1) <= w / 2 + TUNING.enemy.telegraph.playerRadius) game.hurtPlayer(dmg, this.name, this);
    });
  }

  /** 0 = fora da areia, 1 = embaixo (animação do mergulho e da emersão) */
  get burrowK(): number {
    const A = TUNING.boss.burrowAnim;
    if (this.burrowT >= 0) return Math.min(1, this.burrowT / A);
    if (this.emergeT >= 0) return 1 - this.emergeT / A;
    return 0;
  }

  /**
   * boss_ai_ext.lua `burrow`: some na areia (sem golpe nem contato) e, depois de `under` s, emerge onde o herói estava
   * quando mergulhou (dentro da arena), num círculo que acerta quem estiver nele.
   */
  private startBurrow(game: Game): void {
    const M = BOSS_MECHANICS.burrow;
    const px = TUNING.enemy.pxToUnit;
    const p = game.player;
    const r = M.radius * px;
    let tx = p.x, tz = p.z;
    const dx = tx - this.homeX, dz = tz - this.homeZ, d = Math.hypot(dx, dz), lim = game.layout.bossRadius - this.radius;
    if (d > lim) { tx = this.homeX + (dx / d) * lim; tz = this.homeZ + (dz / d) * lim; }
    this.casting = M.under + 0.2;
    this.burrowT = 0;
    this.endSwing();
    game.fx.burst(this.x, 0.3, this.z, this.boss!.glow, 18, 5, 0.18, 0.6);
    game.audio.play("warn");
    game.fx.telegraphCircle(tx, tz, r, M.under, () => {
      this.burrowT = -1;
      if (this.dead || !this.aggro) return;
      this.x = tx;
      this.z = tz;
      this.emergeT = 0;
      game.explode(tx, tz, r, this.dmg * M.dmg, this.boss!.glow, this.name);
      game.fx.burst(tx, 0.4, tz, this.boss!.projectileColor, 24, 7, 0.2, 0.7);
      game.fx.addShake(0.4);
    });
  }

  /**
   * boss_ai_ext.lua `mirage` (`spawnHelpers`): as cópias da fase anterior somem e nascem `perPhase` novas em roda a 110 px
   * dele, com um giro sorteado de até 0,6 rad, dentro da arena; 7% da vida e 35% do dano dele; sem recompensa.
   */
  private raiseIllusions(game: Game): void {
    const M = BOSS_MECHANICS.mirage;
    const px = TUNING.enemy.pxToUnit;
    const phase = this.phase;
    this.dropIllusions();
    this.miragePhase = phase;
    const n = M.perPhase[phase - 1] ?? 0;
    const lim = game.layout.bossRadius - 20 * px;
    for (let k = 1; k <= n; k++) {
      const a = (k / Math.max(1, n)) * Math.PI * 2 + Math.random() * 0.6;
      let x = this.x + Math.cos(a) * M.ring * px;
      let z = this.z + Math.sin(a) * M.ring * px;
      const dx = x - this.homeX, dz = z - this.homeZ, d = Math.hypot(dx, dz);
      if (d > lim) { x = this.homeX + (dx / d) * lim; z = this.homeZ + (dz / d) * lim; }
      const il = game.spawnEnemy("mirage_illusion", this.level, x, z, { aggro: true });
      il.maxHp = il.hp = Math.round(this.maxHp * M.illusionHp);
      il.baseDmg = this.baseDmg * M.damage;
      il.lootBonus = false;
      this.illusions.push(il);
      game.fx.burst(x, 1.4, z, this.boss!.glow, 16, 4, 0.16, 0.5);
    }
    game.fx.shockwave(this.x, this.z, 3, this.boss!.glow, 0.4);
    game.audio.play("warn");
    game.fx.text(this.x, this.rig.height + 1, this.z, "Mirage", "crit");
  }

  /** as cópias somem sem recompensa (troca de fase, chefe voltou ao começo) */
  private dropIllusions(): void {
    for (const il of this.illusions) if (!il.dead) { il.dead = true; il.deadT = 1; }
    this.illusions.length = 0;
    this.miragePhase = 0;
  }

  /** Soul Tether: dano que o chefe leva (×0,35 com algum selo de pé). */
  get tetherK(): number {
    return this.mechanic === "soul_tether" ? tetherMult(this.wards.filter((w) => !w.dead).length) : 1;
  }

  /**
   * boss_ai_ext.lua `spawnHelpers` (soul_tether): n selos em roda a 150 px do chefe, com um giro sorteado de até 0,6 rad,
   * dentro da arena; vida = 6% da vida máxima do chefe; sem recompensa. Os selos das fases anteriores continuam de pé.
   */
  private raiseWards(game: Game, n: number): void {
    const M = BOSS_MECHANICS.soul_tether;
    const px = TUNING.enemy.pxToUnit;
    const lim = game.layout.bossRadius - 20 * px;
    for (let k = 1; k <= n; k++) {
      const a = (k / n) * Math.PI * 2 + Math.random() * 0.6;
      let x = this.x + Math.cos(a) * 150 * px;
      let z = this.z + Math.sin(a) * 150 * px;
      const dx = x - this.homeX, dz = z - this.homeZ, d = Math.hypot(dx, dz);
      if (d > lim) { x = this.homeX + (dx / d) * lim; z = this.homeZ + (dz / d) * lim; }
      const w = game.spawnEnemy("soul_ward", this.level, x, z, { aggro: true });
      w.maxHp = w.hp = Math.round(this.maxHp * M.wardHp);
      w.lootBonus = false;
      this.wards.push(w);
      this.tethers.push(new TetherBeam(game.scene, this.boss!.glow));
      game.fx.shockwave(x, z, 2, this.boss!.glow, 0.4);
    }
    game.audio.play("warn");
    game.fx.text(this.x, this.rig.height + 1, this.z, "Soul Tether", "crit");
  }

  /** linhas de luz dos selos vivos até o chefe; a do selo que caiu some */
  private updateTethers(now: number): void {
    for (let i = this.wards.length - 1; i >= 0; i--) {
      const w = this.wards[i];
      if (w.dead || this.dead) {
        this.tethers[i].dispose();
        this.tethers.splice(i, 1);
        this.wards.splice(i, 1);
        continue;
      }
      this.tethers[i].update(w.x, 0.85 + Math.sin(now * 2.1) * 0.06, w.z, this.x, this.rig.height * 0.55, this.z, now);
    }
  }

  /** o chefe voltou ao começo (perdeu o herói): os selos somem com ele */
  private dropWards(game: Game): void {
    for (const w of this.wards) if (!w.dead) { w.dead = true; w.deadT = 1; }
    this.updateTethers(0);
    this.wardPhase = 0;
    void game;
  }

  /** boss_ai.lua `phaseSummon`: aviso em volta do chefe e n lacaios em roda (sem recompensa, fora do teto de invocados). */
  private raiseArmy(game: Game, n: number): void {
    const M = BOSS_MECHANICS.army_of_the_damned;
    const px = TUNING.enemy.pxToUnit;
    game.audio.play("warn");
    game.fx.telegraphCircle(this.x, this.z, this.radius + 24 * px, M.warning, () => {
      if (this.dead || !this.aggro) return;
      for (let k = 1; k <= n; k++) {
        const a = (k / n) * Math.PI * 2;
        let x = this.x + Math.cos(a) * 52 * px;
        let z = this.z + Math.sin(a) * 52 * px;
        // wd:clampToArena: dentro da arena do chefe
        const dx = x - this.homeX, dz = z - this.homeZ, d = Math.hypot(dx, dz), lim = game.layout.bossRadius - 1;
        if (d > lim) { x = this.homeX + (dx / d) * lim; z = this.homeZ + (dz / d) * lim; }
        game.spawnEnemy(M.minion, this.level, x, z, { summoned: true, aggro: true });
      }
      game.fx.shockwave(this.x, this.z, 5, this.boss!.glow);
      game.fx.text(this.x, this.rig.height + 1, this.z, "Army of the Damned", "crit");
    });
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
        const len = Math.min(pt.length ?? 20, dist + 8, game.arenaReach(this.x, this.z, Math.sin(a), Math.cos(a), this.radius));
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
            game.spawnEnemyProjectile(this.x, this.z, off + (i / n) * Math.PI * 2, (pt.speed ?? 10) * this.projK, this.dmg * pt.damage, b.projectileColor, 0.32, this);
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
            game.spawnEnemyProjectile(this.x, this.z, a - spread / 2 + (spread * i) / (n - 1), (pt.speed ?? 13) * this.projK, this.dmg * pt.damage, b.projectileColor, 0.34, this);
          }
        });
        break;
      }
      case "summon": {
        fx.telegraphCircle(this.x, this.z, 4, pt.warning, () => {
          if (!ok() || game.countSummons() >= 8) return;
          for (let i = 0; i < (pt.count ?? 3); i++) {
            const a = (i / (pt.count ?? 3)) * Math.PI * 2;
            game.spawnEnemy(pt.minion ?? "goblin", this.level, this.x + Math.cos(a) * 3.5, this.z + Math.sin(a) * 3.5, { summoned: true, aggro: true });
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
            // Meteor Siege (boss_ai.lua `meteorstorm` `after`): a cratera queima por um tempo
            if (this.mechanic === "meteor_siege") {
              const M = BOSS_MECHANICS.meteor_siege;
              game.affixes.addPool(x, z, r * M.radiusMult, M.fireTime, this.dmg * M.fireDps * HAZARD_TICK, `${this.name} (fire)`, 0xff6a1a);
            }
          });
        }
        break;
      }
      case "skillshot": {
        // boss_ai.lua `skillshot`: linha fina até onde o herói está, e um tiro rápido nela
        const a = Math.atan2(p.x - this.x, p.z - this.z);
        fx.telegraphRect(this.x, this.z, a, pt.length ?? 32, pt.width ?? 0.6, pt.warning, () => {
          if (!ok()) return;
          this.attackAnim = 0;
          const speed = BOSS_SKILLSHOT.speed * TUNING.enemy.pxToUnit * this.projK;
          game.spawnEnemyProjectile(this.x, this.z, a, speed, this.dmg * pt.damage, b.projectileColor, pt.radius ?? 0.375, this);
        });
        break;
      }
      case "mark": {
        // boss_ai.lua `mark`: retícula no herói que o segue e trava; quem estiver dentro leva o golpe e fica marcado
        this.casting = 0.4;
        const r = pt.radius ?? 2.6;
        const tg = fx.telegraphCircle(p.x, p.z, r, pt.warning + (pt.lock ?? 0.55), () => {
          this.reticle = null;
          if (!ok()) return;
          fx.shockwave(tg.x, tg.z, r, b.glow, 0.35);
          const hp = game.player;
          if (Math.hypot(hp.x - tg.x, hp.z - tg.z) > r + TUNING.enemy.telegraph.playerRadius) return;
          if (game.hurtPlayer(this.dmg * pt.damage, this.name, this)) game.markPlayer(this, pt.markTime ?? 4, pt.markMult ?? 1.25);
        });
        this.reticle = { tg, left: pt.warning };
        break;
      }
      case "crossfire": {
        // boss_ai.lua `crossfire`: duas linhas em cruz passando pelo herói, num ângulo sorteado
        const base = Math.random() * Math.PI;
        const L = pt.length ?? 52, w = pt.width ?? 1.6;
        const cx = p.x, cz = p.z;
        for (const k of [0, 1]) {
          const a = base + (k * Math.PI) / 2;
          const s0 = { x: cx - (Math.sin(a) * L) / 2, z: cz - (Math.cos(a) * L) / 2 };
          const s1 = { x: cx + (Math.sin(a) * L) / 2, z: cz + (Math.cos(a) * L) / 2 };
          fx.telegraphRect(s0.x, s0.z, a, L, w, pt.warning, () => {
            if (!ok()) return;
            for (let i = 0; i <= 24; i++) {
              const f = i / 24;
              fx.spark(s0.x + (s1.x - s0.x) * f, 0.4, s0.z + (s1.z - s0.z) * f, b.glow, 0.2, 0.4, 1.5);
            }
            const hp = game.player;
            if (distToSegment(hp.x, hp.z, s0, s1) <= w / 2 + TUNING.enemy.telegraph.playerRadius) game.hurtPlayer(this.dmg * pt.damage, this.name, this);
          });
        }
        break;
      }
      case "sandvolley": {
        // boss_ai_ext.lua `sandvolley`: parede de areia perpendicular à mira, com um vão sorteado para passar
        const a = Math.atan2(p.x - this.x, p.z - this.z);
        const px = TUNING.enemy.pxToUnit;
        fx.telegraphCircle(this.x, this.z, this.radius + 14 * px, pt.warning, () => {
          if (!ok()) return;
          const n = pt.count ?? 15, gap = pt.gap ?? 3, sp = pt.spacing ?? 1.9;
          const gapAt = 2 + Math.floor(Math.random() * (n - gap - 2));
          const fwx = Math.sin(a), fwz = Math.cos(a), sx = Math.cos(a), sz = -Math.sin(a);
          const speed = BOSS_PROJECTILE_SPEED * px * 0.8 * this.projK;
          this.attackAnim = 0;
          for (let k = 0; k < n; k++) {
            if (k >= gapAt && k < gapAt + gap) continue;
            const off = (k - (n - 1) / 2) * sp;
            game.spawnEnemyProjectile(this.x + sx * off - fwx * 30 * px, this.z + sz * off - fwz * 30 * px, a, speed,
              this.dmg * pt.damage, b.projectileColor, 7 * px, this);
          }
        });
        break;
      }
      case "tailsweep": {
        // boss_ai_ext.lua `tailsweep`: linhas em leque até o herói, uma depois da outra
        const a0 = Math.atan2(p.x - this.x, p.z - this.z);
        const n = pt.lines ?? 3, st = pt.stagger ?? 0.2, L = pt.length ?? 18, w = pt.width ?? 1.9;
        const spread = ((pt.spreadDeg ?? 70) * Math.PI) / 180;
        const x0 = this.x, z0 = this.z;
        this.casting = pt.warning + st * n;
        for (let k = 0; k < n; k++) {
          const a = a0 - spread / 2 + (k / Math.max(1, n - 1)) * spread;
          const s1 = { x: x0 + Math.sin(a) * L, z: z0 + Math.cos(a) * L };
          fx.telegraphRect(x0, z0, a, L, w, pt.warning + k * st, () => {
            if (!ok()) return;
            this.attackAnim = 0;
            for (let i = 0; i <= 16; i++) fx.spark(x0 + (s1.x - x0) * (i / 16), 0.4, z0 + (s1.z - z0) * (i / 16), b.projectileColor, 0.22, 0.4, 1.2);
            const hp = game.player;
            if (distToSegment(hp.x, hp.z, { x: x0, z: z0 }, s1) <= w / 2 + TUNING.enemy.telegraph.playerRadius) game.hurtPlayer(this.dmg * pt.damage, this.name, this);
          });
        }
        break;
      }
      case "erupt": {
        // boss_ai_ext.lua `erupt`: cada erupção entra na fila e trava onde o herói está nesse momento
        this.casting = 0.4;
        const r = pt.radius ?? 3.2;
        for (let k = 0; k < (pt.count ?? 3); k++) {
          this.queued.push({ at: game.time + k * (pt.stagger ?? 0.45), fn: () => {
            const x = game.player.x, z = game.player.z;
            fx.telegraphCircle(x, z, r, pt.warning, () => {
              if (!ok()) return;
              game.explode(x, z, r, this.dmg * pt.damage, b.projectileColor, this.name);
            });
          } });
        }
        break;
      }
      case "orbitals": {
        // boss_ai_ext.lua `orbitals`: brilho em volta dele e orbes em roda que curvam, todos no mesmo sentido sorteado
        const px = TUNING.enemy.pxToUnit;
        fx.telegraphCircle(this.x, this.z, this.radius + 18 * px, pt.warning, () => {
          if (!ok()) return;
          this.attackAnim = 0;
          const n = pt.count ?? 8, off = Math.random() * Math.PI * 2, dir = Math.random() < 0.5 ? 1 : -1;
          const speed = BOSS_PROJECTILE_SPEED * px * (pt.speedMult ?? 1) * this.projK;
          for (let k = 1; k <= n; k++) {
            game.spawnEnemyProjectile(this.x, this.z, off + (k / n) * Math.PI * 2, speed, this.dmg * pt.damage, b.projectileColor, 7 * px, this,
              { curve: (pt.curve ?? 1.6) * dir, reach: pt.reach });
          }
          fx.shockwave(this.x, this.z, 3, b.glow, 0.35);
        });
        break;
      }
      case "prismbeam": {
        // boss_ai_ext.lua `prismbeam`: leque de feixes a partir dele, varrendo de um lado sorteado, um depois do outro
        const a0 = Math.atan2(p.x - this.x, p.z - this.z);
        const n = pt.lines ?? 6, st = pt.stagger ?? 0.16, L = pt.length ?? 37.5, w = pt.width ?? 1.4;
        const step = ((pt.stepDeg ?? 22) * Math.PI) / 180;
        const dir = Math.random() < 0.5 ? 1 : -1;
        const start = a0 - (dir * step * (n - 1)) / 2;
        const x0 = this.x, z0 = this.z;
        this.casting = pt.warning + st * n;
        for (let k = 0; k < n; k++) this.beam(game, x0, z0, start + dir * step * k, L, w, pt.warning + k * st, this.dmg * pt.damage);
        break;
      }
      case "miragedash": {
        // boss_ai_ext.lua `miragedash`: some e reaparece a 140 px do herói, num ângulo sorteado; dali uma linha até o herói
        // e uma nova de tiros
        const px = TUNING.enemy.pxToUnit;
        const blink = pt.blink ?? 0.45;
        const a = Math.random() * Math.PI * 2;
        let tx = p.x + Math.cos(a) * (pt.away ?? 8.75), tz = p.z + Math.sin(a) * (pt.away ?? 8.75);
        const dx = tx - this.homeX, dz = tz - this.homeZ, d = Math.hypot(dx, dz), lim = game.layout.bossRadius - this.radius;
        if (d > lim) { tx = this.homeX + (dx / d) * lim; tz = this.homeZ + (dz / d) * lim; }
        this.casting = blink + pt.warning;
        this.dashBlinkT = 0;
        this.endSwing();
        fx.burst(this.x, this.rig.height * 0.5, this.z, b.glow, 20, 5, 0.18, 0.5);
        fx.telegraphCircle(tx, tz, this.radius + 6 * px, blink, () => {
          this.dashBlinkT = -1;
          if (!ok()) return;
          this.x = tx;
          this.z = tz;
          this.rig.root.position.set(tx, 0, tz);
          fx.burst(tx, this.rig.height * 0.5, tz, b.glow, 24, 6, 0.2, 0.6);
          const hp = game.player;
          const ang = Math.atan2(hp.x - tx, hp.z - tz);
          this.face(hp.x, hp.z);
          this.beam(game, tx, tz, ang, pt.length ?? 43.75, pt.width ?? 1.6, pt.warning, this.dmg * pt.damage);
          const n = pt.nova ?? 8, off = Math.random() * Math.PI * 2;
          const speed = BOSS_PROJECTILE_SPEED * px * (pt.speedMult ?? 0.7) * this.projK;
          for (let k = 1; k <= n; k++) {
            game.spawnEnemyProjectile(tx, tz, off + (k / n) * Math.PI * 2, speed, this.dmg * (pt.novaDamage ?? 0.6), b.projectileColor, 7 * px, this);
          }
        });
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
  const d = ENEMIES[id] ?? HELPERS[id];
  if (!d) throw new Error("unknown enemy: " + id);
  return d;
}
