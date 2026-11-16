// Conjuração das spells (M6-02 a M6-05): teclas 1 e 2 (D12), recarga, mira no cursor. Porta de dungeon-idle
// src/spells/spell_system.lua (`tryCast`, `doCast`, `onKill`), src/spells/behaviors.lua (`Projectile`, `Chain`, `Field`) e
// src/spells/techniques.lua (`Tech.beam`, `Tech.nova`, `Tech.vortex`, `Tech.totem`, `Tech.orbit`, `Tech.rune`). Os números
// saem de core/spells.ts (`spellStats`); aqui só o tempo real: projéteis, raio em cadeia, raio contínuo, onda de veneno,
// tornado, totem, campo de cura, lâminas em órbita, runas, impacto, queimadura, lentidão, veneno, empurrão, atordoamento,
// Eco e Volátil.
import * as THREE from "three";
import { isSpellId, spellStats, type SpellStats } from "../core/spells";
import { MAX_SPELLS, SPELL_CAST } from "../data/spells";
import { DR_BASE_HP, FROST } from "../data/techniques";
import { KNOCK_DECAY, type Enemy } from "./enemy";
import type { Game } from "./game";

/** Cor de cada spell no jogo (projétil, impacto e raio). */
export const SPELL_COLOR: Record<string, number> = {
  fireball: 0xff7a1a, iceball: 0x9fdcff, chain_lightning: 0xfff29a, arcane_bolt: 0xc28cff, prism_beam: 0xfff6d8,
  venom_nova: 0x7be04a, cyclone: 0xcfe8ff, quake_totem: 0xffa040, healing_field: 0x7dff9a, blade_orbit: 0xdfe8ff,
  rune_traps: 0xa58cff,
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

/** Cyclone em pé (techniques.lua `world.vortexes`): parado na mira, puxa e fere a cada tique. */
interface Vortex {
  slot: number;
  st: SpellStats;
  x: number; z: number;
  time: number;
  tickLeft: number;
  group: THREE.Group;
  cones: THREE.Mesh[];
}

/** Quake Totem em pé (techniques.lua `world.totems`): bate no chão a cada tique. */
interface Totem {
  slot: number;
  st: SpellStats;
  x: number; z: number;
  time: number;
  tickLeft: number;
  /** tempo desde que surgiu (o totem sobe do chão) */
  age: number;
  /** tranco da batida, de 1 a 0 */
  bob: number;
  group: THREE.Group;
  runes: THREE.MeshBasicMaterial;
}

/** Healing Field (behaviors.lua `Field`): anel que segue o herói, ou um dos campos extras parados do Blooming Sanctuary. */
interface Field {
  slot: number;
  st: SpellStats;
  x: number; z: number;
  follow: boolean;
  time: number;
  duration: number;
  tickLeft: number;
  /** clarão do pulso de cura, de 1 a 0 */
  pulse: number;
  group: THREE.Group;
  disc: THREE.MeshBasicMaterial;
  edge: THREE.MeshBasicMaterial;
  clock: THREE.Mesh;
  spin: THREE.Object3D;
}

/** Blade Orbit (techniques.lua `world.orbits`): lâminas girando em volta do herói. */
interface Orbit {
  slot: number;
  st: SpellStats;
  time: number;
  duration: number;
  angle: number;
  /** giro extra quando a recarga é menor que a duração (D-354) */
  spin: number;
  hitCooldown: number;
  lastHit: WeakMap<Enemy, number>;
  group: THREE.Group;
  blades: THREE.Object3D[];
  clock: THREE.Mesh;
}

/** Rune Traps (techniques.lua `world.runes`): runa no chão; arma depois de `arm` s e estoura no primeiro inimigo. */
interface Rune {
  slot: number;
  st: SpellStats;
  x: number; z: number;
  time: number;
  duration: number;
  group: THREE.Group;
  glyph: THREE.MeshBasicMaterial;
  clock: THREE.Mesh;
  /** sumindo (trocada pela mais nova ou vencida): segundos que faltam para sumir */
  fade?: number;
}

/** Eco à espera (spell_system.lua `pendingCasts`). */
interface PendingCast { slot: number; t: number }

const BALL_GEO = new THREE.IcosahedronGeometry(1, 1);
/** faixa deitada no chão, de 0 a 1 no eixo z local */
const BEAM_GEO = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0).rotateX(Math.PI / 2);

/** Funil do tornado: cone aberto, torcido em espiral, com faixas claras e escuras (somadas, o escuro some). */
function funnelGeometry(): THREE.BufferGeometry {
  const radial = 15;
  const rows = 8;
  const geo = new THREE.CylinderGeometry(1, 0.14, 1, radial, rows, true);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = i % (radial + 1);
    const y = Math.floor(i / (radial + 1));
    const h = 1 - y / rows; // 0 embaixo, 1 em cima
    const a = h * 2.4; // torção
    const px = pos.getX(i);
    const pz = pos.getZ(i);
    pos.setXYZ(i, px * Math.cos(a) - pz * Math.sin(a), pos.getY(i), px * Math.sin(a) + pz * Math.cos(a));
    const stripe = x % 3 === 0 ? 1 : x % 3 === 1 ? 0.45 : 0.15;
    const fade = Math.min(1, h * 4) * Math.min(1, (1 - h) * 3 + 0.25);
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = stripe * fade;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return geo.translate(0, 0.5, 0);
}
const FUNNEL_GEO = funnelGeometry();
/** altura e raio (em raios da spell) de cada funil, de fora para dentro, e a opacidade */
const FUNNELS: readonly [number, number, number][] = [[0.5, 4.2, 0.16], [0.34, 3.4, 0.22], [0.2, 3.8, 0.2]];

// ---------------------------------------------------------------- relógio no chão
// Mesma ideia do contorno dos ícones de estado: um arco que sai do topo da tela e esvazia no sentido horário até a coisa
// acabar. Raio 1 (escala pelo dono); uma geometria por passo, feitas sob demanda.
const CLOCK_STEPS = 64;
const clockGeos: THREE.BufferGeometry[] = [];
function clockGeo(left: number): THREE.BufferGeometry {
  const k = Math.max(0, Math.min(CLOCK_STEPS, Math.ceil(left * CLOCK_STEPS)));
  let g = clockGeos[k];
  if (!g) {
    const len = (k / CLOCK_STEPS) * Math.PI * 2;
    g = clockGeos[k] = new THREE.RingGeometry(0.93, 1, Math.max(1, k), 1, Math.PI / 2 - len, len).rotateX(-Math.PI / 2);
  }
  return g;
}
function groundMat(color: number, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
}
const DISC_GEO = new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2);
const EDGE_GEO = new THREE.RingGeometry(0.97, 1.03, 64).rotateX(-Math.PI / 2);
const LEAF_GEO = new THREE.CircleGeometry(0.035, 6).scale(1, 2.2, 1).rotateX(-Math.PI / 2);
/** lâmina: losango comprido e achatado, com a guarda; deitada no eixo x local */
const BLADE_GEO = new THREE.OctahedronGeometry(1, 0).scale(0.55, 0.035, 0.09);
const GUARD_GEO = new THREE.BoxGeometry(0.06, 0.06, 0.34);

/** Glifo da runa desenhado por código num canvas: círculo duplo, estrela de 6 pontas e traços nas bordas. */
let runeTex: THREE.CanvasTexture | null = null;
function runeTexture(): THREE.CanvasTexture {
  if (runeTex) return runeTex;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const c = cv.getContext("2d")!;
  c.translate(64, 64);
  c.strokeStyle = "#ffffff";
  c.lineCap = "round";
  c.lineWidth = 5;
  c.beginPath();
  c.arc(0, 0, 58, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = 3;
  c.beginPath();
  c.arc(0, 0, 47, 0, Math.PI * 2);
  c.stroke();
  for (const off of [0, Math.PI / 3]) {
    c.beginPath();
    for (let i = 0; i <= 3; i++) {
      const a = off + (i / 3) * Math.PI * 2 - Math.PI / 2;
      c.lineTo(Math.cos(a) * 44, Math.sin(a) * 44);
    }
    c.lineWidth = 4;
    c.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    c.beginPath();
    c.moveTo(Math.cos(a) * 49, Math.sin(a) * 49);
    c.lineTo(Math.cos(a) * 56, Math.sin(a) * 56);
    c.lineWidth = 3;
    c.stroke();
  }
  c.beginPath();
  c.arc(0, 0, 9, 0, Math.PI * 2);
  c.fillStyle = "#ffffff";
  c.fill();
  runeTex = new THREE.CanvasTexture(cv);
  return runeTex;
}
const RUNE_GEO = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);

/** Totem de pedra: laje, coluna, cabeça e duas faixas de runas (a cor da escola da terra). */
const TOTEM_BASE = new THREE.CylinderGeometry(0.62, 0.7, 0.26, 7).translate(0, 0.13, 0);
const TOTEM_PILLAR = new THREE.CylinderGeometry(0.34, 0.44, 1.35, 6).translate(0, 0.9, 0);
const TOTEM_HEAD = new THREE.BoxGeometry(0.66, 0.5, 0.56).translate(0, 1.82, 0);
const TOTEM_BAND = new THREE.CylinderGeometry(0.42, 0.45, 0.1, 6, 1, true);
const TOTEM_EYE = new THREE.BoxGeometry(0.14, 0.06, 0.04);

export class SpellCaster {
  /** recarga restante de cada espaço (spell_system.lua `cooldownLeft`); não vai para o save, como lá começa zerada */
  cooldown: number[] = [];
  /** números de cada espaço, refeitos a cada `refresh` */
  stats: (SpellStats | null)[] = [];
  /** o espaço pisca quando a tecla foi apertada e a spell não saiu (spell ainda sem efeito no jogo) */
  noTarget: number[] = [];
  private shots: SpellProjectile[] = [];
  private beams: Beam[] = [];
  private vortices: Vortex[] = [];
  private totems: Totem[] = [];
  private fields: Field[] = [];
  private orbits: Orbit[] = [];
  private runes: Rune[] = [];
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
    const g = this.game;
    const walking = Math.hypot(g.playerVelX, g.playerVelZ) > SPELL_CAST.runeWalkSpeed;
    for (let i = 0; i < this.cooldown.length; i++) {
      this.cooldown[i] = Math.max(0, this.cooldown[i] - dt);
      this.noTarget[i] = Math.max(0, (this.noTarget[i] ?? 0) - dt);
      // Rune Traps: como lá, deixa uma runa a cada intervalo enquanto o herói anda; a tecla deixa uma parado (D15)
      if (castKeys[i] || (walking && this.stats[i]?.kind === "rune" && this.cooldown[i] <= 0)) this.tryCast(i);
    }
    // Eco: relança igual, de graça e sem novo Eco (spell_system.lua `update`)
    for (let k = this.pending.length - 1; k >= 0; k--) {
      const pc = this.pending[k];
      pc.t -= dt;
      if (pc.t > 0) continue;
      this.pending.splice(k, 1);
      const st = this.stats[pc.slot];
      const g = this.game;
      if (st && g.playerAlive && this.cast(pc.slot, st)) g.fx.text(g.player.x, 2.8, g.player.z, "Echo", "frost");
    }
    this.updateShots(dt);
    this.updateBeams(dt);
    this.updateVortices(dt);
    this.updateTotems(dt);
    this.updateFields(dt);
    this.updateOrbits(dt);
    this.updateRunes(dt);
  }

  /** spell_system.lua `tryCast`: a recarga é gasta quando a spell sai; spell sem efeito ainda (M6-05) não gasta. */
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
      case "nova":
        return this.castNova(st);
      case "vortex":
        return this.castVortex(i, st);
      case "totem":
        return this.castTotem(i, st);
      case "field":
        return this.castField(i, st);
      case "orbit":
        return this.castOrbit(i, st);
      case "rune":
        return this.layRune(i, st);
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

  // ---------------------------------------------------------------- Venom Nova
  /**
   * techniques.lua `Tech.nova.cast`: onda de veneno em volta do herói; cada inimigo dentro ganha um acúmulo. Lá só saía
   * com inimigo no raio; aqui sai sempre (D15).
   */
  private castNova(st: SpellStats): boolean {
    const g = this.game;
    const p = g.player;
    const r = st.radius;
    const color = SPELL_COLOR.venom_nova;
    const dps = g.stats.damage * st.damage;
    for (const e of g.enemies) {
      if (e.dead) continue;
      if ((e.x - p.x) ** 2 + (e.z - p.z) ** 2 > (r + e.radius) ** 2) continue;
      this.applyPoison(e, dps, st.duration ?? 0, st.stacks ?? 1);
      if (!e.aggro) e.setAggro(g);
      g.fx.burst(e.x, 0.4, e.z, color, 10, 3, 0.15, 0.5, -1); // respingo aos pés de cada um (D-417)
    }
    g.fx.shockwave(p.x, p.z, r, color, 0.45);
    g.fx.shockwave(p.x, p.z, r * 0.8, 0x3f8f2a, 0.75);
    for (let k = 0; k < 26; k++) {
      const a = Math.random() * Math.PI * 2;
      const d = r * (0.25 + 0.75 * Math.random());
      const out = 1.2 + Math.random() * 1.5;
      g.fx.glow(p.x + Math.sin(a) * d, 0.35, p.z + Math.cos(a) * d, k % 3 ? color : 0x2f6b1f, 0.9 + Math.random() * 0.6,
        0.6 + Math.random() * 0.4, Math.sin(a) * out, 0.7, Math.cos(a) * out);
    }
    g.fx.flashLight(p.x, 1, p.z, color, 2, 0.35);
    g.audio.play("tech");
    return true;
  }

  /**
   * status.lua `applyPoison`: um efeito só por inimigo; cada aplicação soma um acúmulo (até o máximo) e renova a duração;
   * fica o maior dano por segundo. Vive à parte do veneno do tiro da Vesper (que aqui é um efeito por acúmulo).
   */
  private applyPoison(e: Enemy, dps: number, duration: number, maxStacks: number): void {
    const until = this.game.time + duration;
    const cur = e.dots.find((d) => d.kind === "poison" && d.spell === "venom_nova");
    if (cur) {
      cur.dps = Math.max(cur.dps, dps);
      cur.until = Math.max(cur.until, until);
      cur.maxStacks = Math.max(cur.maxStacks ?? 1, maxStacks);
      cur.stacks = Math.min(cur.maxStacks, (cur.stacks ?? 1) + 1);
    } else e.dots.push({ kind: "poison", dps, until, spell: "venom_nova", stacks: 1, maxStacks });
  }

  // ---------------------------------------------------------------- Cyclone
  /** techniques.lua `Tech.vortex.cast`: tornado na mira (até o alcance); relançar troca o tornado do mesmo espaço. */
  private castVortex(i: number, st: SpellStats): boolean {
    const g = this.game;
    for (let k = this.vortices.length - 1; k >= 0; k--) if (this.vortices[k].slot === i) this.freeVortex(k);
    const a = g.aimPoint(st.range);
    const group = new THREE.Group();
    const cones: THREE.Mesh[] = [];
    for (const [rad, h, op] of FUNNELS) {
      const m = new THREE.Mesh(FUNNEL_GEO, new THREE.MeshBasicMaterial({
        color: SPELL_COLOR.cyclone, vertexColors: true, transparent: true, opacity: op, depthWrite: false,
        toneMapped: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      }));
      m.scale.set(st.radius * rad, h, st.radius * rad);
      m.renderOrder = 3;
      group.add(m);
      cones.push(m);
    }
    group.position.set(a.x, 0, a.z);
    g.scene.add(group);
    this.vortices.push({ slot: i, st, x: a.x, z: a.z, time: st.duration ?? 1, tickLeft: st.tick ?? 0.5, group, cones });
    g.fx.shockwave(a.x, a.z, st.radius, SPELL_COLOR.cyclone, 0.4);
    g.audio.play("tech");
    return true;
  }

  /** techniques.lua `updateVortex`: puxa todos no alcance do funil para o olho (chefes, `bossPull`) e fere os de dentro. */
  private updateVortices(dt: number): void {
    const g = this.game;
    for (let k = this.vortices.length - 1; k >= 0; k--) {
      const v = this.vortices[k];
      const st = v.st;
      v.time -= dt;
      const reach = st.radius * SPELL_CAST.vortexReach;
      const pull = st.pull ?? 0;
      const eye = SPELL_CAST.vortexEye;
      for (const e of g.enemies) {
        if (e.dead) continue;
        const dx = v.x - e.x;
        const dz = v.z - e.z;
        const d = Math.hypot(dx, dz);
        if (d > reach + e.radius || d < eye) continue;
        const step = Math.min(d - eye * 0.5, pull * (e.isBoss ? st.bossPull ?? 0 : 1) * dt);
        e.x += (dx / d) * step;
        e.z += (dz / d) * step;
      }
      v.tickLeft -= dt;
      while (v.tickLeft <= 0 && v.time > -1e-6) {
        v.tickLeft += st.tick ?? 0.5;
        for (const e of g.enemies) {
          if (e.dead) continue;
          if ((e.x - v.x) ** 2 + (e.z - v.z) ** 2 > (st.radius + e.radius) ** 2) continue;
          g.spellHit(e, st.damage, true);
        }
      }
      if (v.time <= 0) {
        g.fx.burst(v.x, 1.2, v.z, 0xdfeeff, 18, 5, 0.18, 0.5, 2);
        this.freeVortex(k);
        continue;
      }
      // visual: os funis giram, crescem no começo e somem no fim
      const fade = Math.min(1, ((st.duration ?? 1) - v.time) / 0.25, v.time / 0.35);
      v.cones.forEach((m, n) => {
        const [, h, op] = FUNNELS[n];
        m.rotation.y += dt * (7 + n * 3) * (n % 2 ? -1 : 1);
        (m.material as THREE.MeshBasicMaterial).opacity = op * fade;
        m.scale.y = h * (0.6 + 0.4 * fade);
      });
      v.group.rotation.z = Math.sin(g.time * 3.1 + v.x) * 0.05;
      v.group.rotation.x = Math.cos(g.time * 2.7 + v.z) * 0.05;
      // poeira girando em volta do pé do funil
      for (let n = 0; n < 3; n++) {
        const a = Math.random() * Math.PI * 2;
        const d = reach * (0.4 + 0.6 * Math.random());
        const sx = Math.sin(a);
        const sz = Math.cos(a);
        g.fx.glow(v.x + sx * d, 0.25 + Math.random() * 0.4, v.z + sz * d, n ? 0xb9a98a : 0xe8f4ff, 0.5 + Math.random() * 0.4,
          0.45, sz * 6 - sx * 3, 1.8 + Math.random() * 2, -sx * 6 - sz * 3);
      }
    }
  }

  private freeVortex(k: number): void {
    const v = this.vortices[k];
    v.group.removeFromParent();
    for (const m of v.cones) (m.material as THREE.Material).dispose();
    this.vortices.splice(k, 1);
  }

  // ---------------------------------------------------------------- Quake Totem
  /** techniques.lua `Tech.totem.cast`: totem na mira (até o alcance); relançar troca o totem do mesmo espaço. */
  private castTotem(i: number, st: SpellStats): boolean {
    const g = this.game;
    for (let k = this.totems.length - 1; k >= 0; k--) if (this.totems[k].slot === i) this.freeTotem(k);
    const a = g.aimPoint(st.range);
    const group = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: 0x8b8072, roughness: 1, flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: 0x5f564c, roughness: 1, flatShading: true });
    const runes = new THREE.MeshBasicMaterial({ color: SPELL_COLOR.quake_totem, toneMapped: false });
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, y = 0, shadow = true) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.y = y;
      m.castShadow = shadow;
      group.add(m);
      return m;
    };
    add(TOTEM_BASE, dark);
    add(TOTEM_PILLAR, stone);
    add(TOTEM_HEAD, stone).rotation.y = Math.PI / 6;
    add(TOTEM_BAND, runes, 0.6, false);
    add(TOTEM_BAND, runes, 1.25, false).scale.set(0.9, 1, 0.9);
    // olhos em fenda na cabeça, virados para o herói
    const p = g.player;
    const face = Math.atan2(p.x - a.x, p.z - a.z);
    const fx = Math.sin(face);
    const fz = Math.cos(face);
    for (const side of [-0.15, 0.15]) {
      const eye = add(TOTEM_EYE, runes, 1.88, false);
      eye.position.x = fz * side + fx * 0.3;
      eye.position.z = -fx * side + fz * 0.3;
      eye.rotation.y = face;
    }
    group.position.set(a.x, 0, a.z);
    g.scene.add(group);
    this.totems.push({ slot: i, st, x: a.x, z: a.z, time: st.duration ?? 1, tickLeft: st.tick ?? 1, age: 0, bob: 0, group, runes });
    g.fx.burst(a.x, 0.3, a.z, 0x9a8a72, 22, 5, 0.18, 0.5, 10);
    g.fx.addShake(0.08);
    g.audio.play("tech");
    return true;
  }

  /** techniques.lua `updateTotem`: bate a cada tique enquanto dura; com o Aftershock, chance de bater de novo. */
  private updateTotems(dt: number): void {
    const g = this.game;
    for (let k = this.totems.length - 1; k >= 0; k--) {
      const t = this.totems[k];
      t.time -= dt;
      t.age += dt;
      t.tickLeft -= dt;
      while (t.tickLeft <= 0 && t.time > -1e-6) {
        t.tickLeft += t.st.tick ?? 1;
        this.slam(t);
        if (t.st.doubleHit && Math.random() < t.st.doubleHit) this.slam(t);
      }
      if (t.time <= 0) {
        g.fx.burst(t.x, 0.6, t.z, 0x8b8072, 26, 5, 0.2, 0.6, 12);
        this.freeTotem(k);
        continue;
      }
      // sobe do chão, dá o tranco da batida e afunda no fim
      t.bob = Math.max(0, t.bob - dt * 5);
      const rise = Math.min(1, t.age / 0.22) * Math.min(1, t.time / 0.25);
      const b = t.bob;
      t.group.position.y = -2.2 * (1 - rise) + 0.25 * Math.sin(b * Math.PI);
      t.group.scale.set(1 + 0.1 * b, 1 - 0.12 * b, 1 + 0.1 * b);
      t.runes.color.setHex(SPELL_COLOR.quake_totem).multiplyScalar(0.45 + 0.55 * b + 0.1 * Math.sin(g.time * 6));
    }
  }

  /**
   * techniques.lua `slam`: dano no raio; quem não é chefe nem Campeão é empurrado para fora (`knockback`) e, do nível 4,
   * atordoado (`stun`).
   */
  private slam(t: Totem): void {
    const g = this.game;
    const st = t.st;
    const r = st.radius;
    const kb = (st.knockback ?? 0) * KNOCK_DECAY;
    for (const e of g.enemies) {
      if (e.dead) continue;
      const dx = e.x - t.x;
      const dz = e.z - t.z;
      if (dx * dx + dz * dz > (r + e.radius) ** 2) continue;
      g.spellHit(e, st.damage, true);
      if (e.dead || e.isBoss || e.champion) continue;
      const d = Math.hypot(dx, dz);
      e.kx += (d < 0.08 ? 1 : dx / d) * kb;
      e.kz += (d < 0.08 ? 0 : dz / d) * kb;
      if (st.stun) g.applyStatus(e, { kind: "stun", power: 1, duration: st.stun }, 0);
    }
    t.bob = 1;
    g.fx.shockwave(t.x, t.z, r, SPELL_COLOR.quake_totem, 0.4);
    g.fx.shockwave(t.x, t.z, r * 0.6, 0x9a8a72, 0.3);
    g.fx.burst(t.x, 0.3, t.z, 0x9a8a72, 30, 6, 0.2, 0.55, 12);
    g.fx.burst(t.x, 0.2, t.z, 0xffc070, 12, 4, 0.12, 0.35, 6);
    g.fx.flashLight(t.x, 1, t.z, SPELL_COLOR.quake_totem, 1.8, 0.25);
    g.fx.addShake(0.1);
    g.audio.play("hit");
  }

  private freeTotem(k: number): void {
    const t = this.totems[k];
    t.group.removeFromParent();
    const mats = new Set<THREE.Material>();
    t.group.traverse((o) => { if (o instanceof THREE.Mesh) mats.add(o.material as THREE.Material); });
    for (const m of mats) m.dispose();
    this.totems.splice(k, 1);
  }


  // ---------------------------------------------------------------- Healing Field
  /**
   * behaviors.lua `Field.cast`: anel em volta do herói, que anda com ele; relançar troca o do mesmo espaço. Blooming
   * Sanctuary: mais campos parados por perto (no máximo `fieldExtraCap` ao mesmo tempo).
   */
  private castField(i: number, st: SpellStats): boolean {
    const g = this.game;
    const p = g.player;
    for (let k = this.fields.length - 1; k >= 0; k--) if (this.fields[k].follow && this.fields[k].slot === i) this.freeField(k);
    this.fields.push(this.makeField(i, st, p.x, p.z, true));
    const extra = Math.min(st.extraFields ?? 0, SPELL_CAST.fieldExtraCap - this.fields.filter((f) => !f.follow).length);
    for (let n = 0; n < extra; n++) {
      const a = Math.random() * Math.PI * 2;
      const d = SPELL_CAST.fieldExtraDistance;
      this.fields.push(this.makeField(i, st, p.x + Math.cos(a) * d, p.z + Math.sin(a) * d, false));
    }
    g.fx.shockwave(p.x, p.z, st.radius, SPELL_COLOR.healing_field, 0.45);
    g.audio.play("tech");
    return true;
  }

  private makeField(slot: number, st: SpellStats, x: number, z: number, follow: boolean): Field {
    const g = this.game;
    const color = SPELL_COLOR.healing_field;
    const group = new THREE.Group();
    const disc = groundMat(color, 0.1);
    const edge = groundMat(color, 0.55);
    const d = new THREE.Mesh(DISC_GEO, disc);
    d.position.y = 0.03;
    const e = new THREE.Mesh(EDGE_GEO, edge);
    e.position.y = 0.04;
    const clock = new THREE.Mesh(clockGeo(1), groundMat(0xeaffef, 0.85));
    clock.position.y = 0.05;
    clock.scale.setScalar(0.9);
    // folhas girando devagar dentro do anel
    const spin = new THREE.Group();
    const leaf = groundMat(color, 0.5);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const m = new THREE.Mesh(LEAF_GEO, leaf);
      m.position.set(Math.cos(a) * 0.72, 0.045, Math.sin(a) * 0.72);
      m.rotation.y = -a;
      spin.add(m);
    }
    group.add(d, e, clock, spin);
    group.scale.setScalar(st.radius);
    group.position.set(x, 0, z);
    g.scene.add(group);
    const dur = st.duration ?? 1;
    return { slot, st, x, z, follow, time: dur, duration: dur, tickLeft: st.tick ?? 1, pulse: 0, group, disc, edge, clock, spin };
  }

  /** behaviors.lua `Field.update`: a cada tique, cura o herói se ele está dentro (o que segue o herói sempre está). */
  private updateFields(dt: number): void {
    const g = this.game;
    const p = g.player;
    for (let k = this.fields.length - 1; k >= 0; k--) {
      const f = this.fields[k];
      if (f.follow) {
        f.x = p.x;
        f.z = p.z;
      }
      f.time -= dt;
      f.tickLeft -= dt;
      while (f.tickLeft <= 0 && f.time > -1e-9) {
        f.tickLeft += f.st.tick ?? 1;
        if (!g.playerAlive || (p.x - f.x) ** 2 + (p.z - f.z) ** 2 > f.st.radius ** 2) continue;
        let amount = f.st.heal ?? 0;
        if (f.st.surge && Math.random() < f.st.surge) amount += 1 / DR_BASE_HP;
        g.heal(g.stats.maxHp * amount, true);
        f.pulse = 1;
        g.fx.burst(p.x, 0.4, p.z, SPELL_COLOR.healing_field, 6, 2.5, 0.12, 0.6, -2);
      }
      if (f.time <= 0) {
        this.freeField(k);
        continue;
      }
      f.pulse = Math.max(0, f.pulse - dt * 3);
      const born = Math.min(1, (f.duration - f.time) / 0.3);
      const ending = f.time < 1 ? 0.55 + 0.45 * Math.abs(Math.cos(g.time * 9)) : 1;
      f.group.position.set(f.x, 0, f.z);
      f.group.scale.setScalar(f.st.radius * (0.6 + 0.4 * born) * (1 + 0.04 * f.pulse));
      f.disc.opacity = (0.08 + 0.14 * f.pulse) * born * ending;
      f.edge.opacity = (0.45 + 0.4 * f.pulse) * born * ending;
      f.clock.geometry = clockGeo(f.time / f.duration);
      f.spin.rotation.y = g.time * 0.6;
    }
  }

  private freeField(k: number): void {
    const f = this.fields[k];
    freeGroup(f.group);
    this.fields.splice(k, 1);
  }

  // ---------------------------------------------------------------- Blade Orbit
  /**
   * techniques.lua `Tech.orbit.cast`: lâminas girando em volta do herói; relançar troca as do mesmo espaço. Com recarga
   * menor que a duração, a sobra vira giro mais rápido (mais golpes por segundo), como lá (D-354).
   */
  private castOrbit(i: number, st: SpellStats): boolean {
    const g = this.game;
    for (let k = this.orbits.length - 1; k >= 0; k--) if (this.orbits[k].slot === i) this.freeOrbit(k);
    const dur = st.duration ?? 1;
    const spin = Math.max(1, dur / Math.max(0.1, st.cooldown || dur));
    const group = new THREE.Group();
    const steel = new THREE.MeshBasicMaterial({ color: 0xe8eef8, toneMapped: false });
    const gold = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.5, metalness: 0.6 });
    const blades: THREE.Object3D[] = [];
    for (let b = 0; b < (st.blades ?? 1); b++) {
      const blade = new THREE.Group();
      const edge = new THREE.Mesh(BLADE_GEO, steel);
      edge.position.x = 0.3;
      const guard = new THREE.Mesh(GUARD_GEO, gold);
      guard.position.x = -0.24;
      blade.add(edge, guard);
      group.add(blade);
      blades.push(blade);
    }
    const clock = new THREE.Mesh(clockGeo(1), groundMat(SPELL_COLOR.blade_orbit, 0.16));
    clock.position.y = 0.04;
    group.add(clock);
    g.scene.add(group);
    this.orbits.push({ slot: i, st, time: dur, duration: dur, angle: 0, spin, hitCooldown: (st.hitCooldown ?? 0.5) / spin,
      lastHit: new WeakMap(), group, blades, clock });
    g.audio.play("tech");
    return true;
  }

  /** techniques.lua `updateOrbit`: cada lâmina fere quem toca, no máximo uma vez a cada `hitCooldown` por inimigo. */
  private updateOrbits(dt: number): void {
    const g = this.game;
    const p = g.player;
    for (let k = this.orbits.length - 1; k >= 0; k--) {
      const o = this.orbits[k];
      o.time -= dt;
      if (o.time <= 0) {
        g.fx.burst(p.x, 1, p.z, SPELL_COLOR.blade_orbit, 14, 5, 0.1, 0.35, 4);
        this.freeOrbit(k);
        continue;
      }
      o.angle += dt * SPELL_CAST.orbitSpin * o.spin;
      const r = o.st.radius;
      const n = o.blades.length;
      const hit = SPELL_CAST.bladeHit;
      // entram crescendo e somem encolhendo nos últimos 0,3 s
      const grow = Math.min(1, (o.duration - o.time) / 0.2) * Math.min(1, o.time / 0.3);
      o.group.position.set(p.x, 0, p.z);
      for (let b = 0; b < n; b++) {
        const a = o.angle + (b / n) * Math.PI * 2;
        const bx = Math.cos(a) * r;
        const bz = Math.sin(a) * r;
        const blade = o.blades[b];
        blade.position.set(bx, 1 + 0.1 * Math.sin(g.time * 4 + b), bz);
        // a ponta vai na frente do giro
        blade.rotation.set(0, -a - Math.PI / 2, 0.25);
        blade.scale.setScalar(2.2 * grow);
        for (const e of g.enemies) {
          if (e.dead) continue;
          if ((e.x - p.x - bx) ** 2 + (e.z - p.z - bz) ** 2 > (hit + e.radius) ** 2) continue;
          const last = o.lastHit.get(e);
          if (last !== undefined && g.time - last < o.hitCooldown) continue;
          o.lastHit.set(e, g.time);
          g.spellHit(e, o.st.damage);
          g.fx.burst(p.x + bx, 1, p.z + bz, 0xffffff, 5, 4, 0.08, 0.2, 6);
        }
      }
      o.clock.scale.setScalar(r);
      o.clock.geometry = clockGeo(o.time / o.duration);
    }
  }

  private freeOrbit(k: number): void {
    freeGroup(this.orbits[k].group);
    this.orbits.splice(k, 1);
  }

  // ---------------------------------------------------------------- Rune Traps
  /**
   * techniques.lua `Tech.rune.cast`: runa nos pés do herói; passando de `maxRunes`, a mais velha do espaço some. Lá só
   * saía andando (a spell era automática); aqui a tecla também deixa uma parado (D15).
   */
  private layRune(i: number, st: SpellStats): boolean {
    const g = this.game;
    const p = g.player;
    const mine = this.runes.filter((r) => r.slot === i && r.fade === undefined);
    if (mine.length >= (st.maxRunes ?? 1)) mine[0].fade = 0.35;
    const group = new THREE.Group();
    const glyph = new THREE.MeshBasicMaterial({ map: runeTexture(), color: SPELL_COLOR.rune_traps, transparent: true,
      opacity: 0.3, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
    const plate = new THREE.Mesh(RUNE_GEO, glyph);
    plate.position.y = 0.04;
    const clock = new THREE.Mesh(clockGeo(1), groundMat(SPELL_COLOR.rune_traps, 0.7));
    clock.position.y = 0.05;
    clock.scale.setScalar(1.12);
    group.add(plate, clock);
    // o desenho tem o tamanho do gatilho mais a margem do inimigo; a explosão (o raio) aparece no estouro
    group.scale.setScalar((st.trigger ?? 1) + 0.45);
    group.rotation.y = Math.random() * Math.PI * 2;
    group.position.set(p.x, 0, p.z);
    g.scene.add(group);
    const dur = st.duration ?? 1;
    this.runes.push({ slot: i, st, x: p.x, z: p.z, time: dur, duration: dur, group, glyph, clock });
    return true;
  }

  /** techniques.lua `updateRune`: armada depois de `arm` s, estoura no primeiro inimigo que pisa no gatilho. */
  private updateRunes(dt: number): void {
    const g = this.game;
    for (let k = this.runes.length - 1; k >= 0; k--) {
      const r = this.runes[k];
      if (r.fade !== undefined) {
        r.fade -= dt;
        r.glyph.opacity = Math.max(0, r.fade / 0.35) * 0.6;
        r.group.position.y = -0.3 * (1 - r.fade / 0.35);
        if (r.fade <= 0) this.freeRune(k);
        continue;
      }
      r.time -= dt;
      if (r.time <= 0) {
        r.fade = 0.35;
        continue;
      }
      const age = r.duration - r.time;
      const armed = age >= (r.st.arm ?? 0);
      if (armed) {
        const hit = g.enemies.find((e) => !e.dead && (e.x - r.x) ** 2 + (e.z - r.z) ** 2 <= ((r.st.trigger ?? 1) + e.radius) ** 2);
        if (hit) {
          this.detonate(r);
          this.freeRune(k);
          continue;
        }
      }
      // armada: acende e respira; no último segundo pisca
      const ending = r.time < 1 ? 0.45 + 0.55 * Math.abs(Math.cos(g.time * 9)) : 1;
      r.glyph.opacity = (armed ? 0.7 + 0.15 * Math.sin(g.time * 3 + r.x) : 0.3) * ending;
      r.clock.geometry = clockGeo(r.time / r.duration);
    }
  }

  /** techniques.lua `detonate`: dano no raio e prende no lugar quem não é chefe; Twin Glyph: chance de bater de novo. */
  private detonate(r: Rune): void {
    const g = this.game;
    const st = r.st;
    const blast = () => {
      for (const e of g.enemies) {
        if (e.dead || (e.x - r.x) ** 2 + (e.z - r.z) ** 2 > (st.radius + e.radius) ** 2) continue;
        g.spellHit(e, st.damage, true);
        if (!e.dead && !e.isBoss && st.root) g.applyStatus(e, { kind: "stun", power: 1, duration: st.root }, 0);
      }
    };
    blast();
    const twice = !!st.doubleHit && Math.random() < st.doubleHit;
    if (twice) blast();
    const c = SPELL_COLOR.rune_traps;
    g.fx.shockwave(r.x, r.z, st.radius, c, 0.4);
    if (twice) g.fx.shockwave(r.x, r.z, st.radius * 0.7, 0xffffff, 0.5);
    g.fx.burst(r.x, 0.3, r.z, c, 24, 6, 0.14, 0.45, 4);
    g.fx.flashLight(r.x, 0.8, r.z, c, 2, 0.25);
    g.audio.play("hit");
  }

  private freeRune(k: number): void {
    freeGroup(this.runes[k].group);
    this.runes.splice(k, 1);
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
    g.fx.text(x, 2.4, z, "Volatile", "burn");
  }

  private free(pr: SpellProjectile): void {
    pr.mesh.removeFromParent();
  }

  /** Limpa projéteis, raios e Ecos (troca de zona, fim de partida). A recarga continua, como lá. */
  clear(): void {
    for (const pr of this.shots) this.free(pr);
    this.shots.length = 0;
    while (this.beams.length) this.freeBeam(this.beams.length - 1);
    while (this.vortices.length) this.freeVortex(this.vortices.length - 1);
    while (this.totems.length) this.freeTotem(this.totems.length - 1);
    while (this.fields.length) this.freeField(this.fields.length - 1);
    while (this.orbits.length) this.freeOrbit(this.orbits.length - 1);
    while (this.runes.length) this.freeRune(this.runes.length - 1);
    this.pending.length = 0;
  }

  /** Partida nova: sem projéteis e recargas zeradas (game_state.lua `newSpellSlot`). */
  reset(): void {
    this.clear();
    this.cooldown.fill(0);
  }

  /** Para os testes de console: projéteis, raios, tornados e totens em jogo. */
  snapshot(): { id: string; x: number; z: number; remaining: number }[] {
    return [
      ...this.shots.map((s) => ({ id: s.id, x: +s.x.toFixed(2), z: +s.z.toFixed(2), remaining: +s.remaining.toFixed(2) })),
      ...this.beams.map((b) => ({ id: b.st.id, x: +b.dx.toFixed(2), z: +b.dz.toFixed(2), remaining: +b.time.toFixed(2) })),
      ...[...this.vortices, ...this.totems, ...this.fields, ...this.runes].map((o) => ({ id: o.st.id, x: +o.x.toFixed(2),
        z: +o.z.toFixed(2), remaining: +o.time.toFixed(2) })),
      ...this.orbits.map((o) => ({ id: o.st.id, x: 0, z: 0, remaining: +o.time.toFixed(2) })),
    ];
  }
}

/** Tira o grupo da cena e libera os materiais dele (as geometrias são compartilhadas). */
function freeGroup(group: THREE.Group): void {
  group.removeFromParent();
  const mats = new Set<THREE.Material>();
  group.traverse((o) => { if (o instanceof THREE.Mesh) mats.add(o.material as THREE.Material); });
  for (const m of mats) m.dispose();
}
