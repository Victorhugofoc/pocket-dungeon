// Conjuração das spells (M6-02 a M6-05): teclas 1 e 2 (D12), recarga, mira no cursor. Porta de dungeon-idle
// src/spells/spell_system.lua (`tryCast`, `doCast`, `onKill`), src/spells/behaviors.lua (`Projectile`, `Chain`, `Field`) e
// src/spells/techniques.lua (`Tech.beam`, `Tech.nova`, `Tech.vortex`, `Tech.totem`, `Tech.orbit`, `Tech.rune`). Os números
// saem de core/spells.ts (`spellStats`); aqui só o tempo real: projéteis, raio em cadeia, raio contínuo, onda de veneno,
// tornado, totem, campo de cura, lâminas em órbita, runas, impacto, queimadura, lentidão, veneno, empurrão, atordoamento,
// Eco e Volátil.
import * as THREE from "three";
import { isAura, isSpellId, remainingTicks, spellContext, spellStats, type SpellStats } from "../core/spells";
import { AURA_SPIKE, MAX_SPELLS, SPELL_CAST, SPELL_SCHOOL } from "../data/spells";
import { REACTIONS } from "../data/reactions";
import { tornadoInfusion, type TornadoElement } from "../core/reactions";
import { DR_BASE_HP, FROST, TECH_EVO } from "../data/techniques";
import { KNOCK_DECAY, type Dot, type Enemy } from "./enemy";
import type { Game } from "./game";
import { ease, type BeamHandle, type MoveHandle, type TrailHandle, type VfxHandle } from "./vfx";

/** Cor de cada spell no jogo (projétil, impacto e raio). */
export const SPELL_COLOR: Record<string, number> = {
  fireball: 0xff7a1a, iceball: 0x9fdcff, chain_lightning: 0xfff29a, arcane_bolt: 0xc28cff, prism_beam: 0xfff6d8,
  venom_nova: 0x7be04a, cyclone: 0xcfe8ff, quake_totem: 0xffa040, healing_field: 0x7dff9a, blade_orbit: 0xdfe8ff,
  rune_traps: 0xa58cff,
};

/** Cores das formas evoluídas (M6-10). */
const EVO_COLOR = { firestorm: 0xff6a1a, firewave: 0xff7a1a, blizzard: 0xbfe6ff, lightning_strike: 0xffe14a,
  arcane_strike: 0xc28cff, sanctuary: 0xffd45a, blade_storm: 0xbfe0ff, plague_bloom: 0xb070ff, maelstrom: 0x8fb0ff,
  rune_circle: 0xd8b0ff, earthen_ward: 0x8fe0a0 } as const;
/** Spectrum: as 3 cores do raio dividido, com o lado de cada uma (techniques.lua `SPECTRUM_RAYS`) */
const SPECTRUM_RAYS = [["red", -1, 0xff5a3a], ["yellow", 0, 0xffe14a], ["blue", 1, 0x7fc8ff]] as const;
/** Arcane Bolt: miolo quase branco e violeta escuro das fagulhas e do selo (M5-08) */
const ARCANE_CORE = 0xf4e6ff;
const ARCANE_DEEP = 0x8a4dff;
/** orbe do Arcane Bolt: lilás claro, não branco, para o violeta mandar */
const ARCANE_ORB = 0xd6b0ff;
/** Chain Lightning: corpo amarelo do raio e miolo branco-quente */
const BOLT_BODY = 0xffd84a;
const BOLT_CORE = 0xfffbe6;
/** s entre um salto e o próximo no desenho da cadeia */
const CHAIN_STEP = 0.045;
/** altura do raio: acima do meio do corpo, para os inimigos não o cobrirem vistos de cima */
const ARC_Y = 1.7;
/** Prism Beam: halo dourado e corpo do raio */
const PRISM_HALO = 0xffd890;
const PRISM_GOLD = 0xfff0b8;
const PRISM_HALO_POWER = 1;
const PRISM_CORE_POWER = 0.7;
const PRISM_FRINGE = [0xff5ad0, 0x4ae0ff];
/** Fireball: chama vermelho-laranja, miolo amarelo, fumaça escura com brasa por dentro */
const FIRE_DEEP = 0xff4a0a;
const FIRE_CORE = 0xffd070;
const FIRE_SMOKE = 0x221c19;
const FIRE_SMOKE_HOT = 0x7a3414;
/** Iceball: cristal azul-gelo com brilho próprio, rastro e névoa */
const ICE_DEEP = 0x4aa0ff;
const ICE_CORE = 0xf2fbff;
const ICE_MIST = 0xcfe8ff;
const ICE_MAT = new THREE.MeshStandardMaterial({ color: 0xcdeeff, emissive: 0x3d8fe0, emissiveIntensity: 0.9, roughness: 0.15,
  metalness: 0.1, flatShading: true });
/** cristal da Iceball: octaedro esticado no eixo do voo */
const CRYSTAL_GEO = new THREE.OctahedronGeometry(1, 0).scale(0.42, 1, 0.42);
const UP = new THREE.Vector3(0, 1, 0);
const SPIN_Q = new THREE.Quaternion();
/** Venom Nova: verde tóxico, nuvem escura e o miolo ácido */
const VENOM_DARK = 0x2f6b1f;
const VENOM_CORE = 0xe4ff9a;
const VENOM_CLOUD = 0x9ad63a;
/** Cyclone: miolo branco do vento */
const WIND_CORE = 0xffffff;
/** Quake Totem: pedra, poeira e as fendas em brasa da batida */
const QUAKE_STONE = 0x8b8072;
const QUAKE_DUST = 0x8a7a62;
const QUAKE_DEEP = 0xc8501a;
const QUAKE_CORE = 0xffe0a0;
/** Healing Field: miolo claro da cura */
const HEAL_CORE = 0xeaffef;
/** Blade Orbit: aço frio e o brilho do fio */
const BLADE_STEEL = 0xa8c0e8;
const BLADE_CORE = 0xffffff;
/** Rune Traps: miolo da runa */
const RUNE_CORE = 0xf0e8ff;

/** tiro do ataque básico com o Arcane Strike pronto (D-215: roxo e maior) */
export const ARCANE_CHARGED = { color: EVO_COLOR.arcane_strike, size: 1.35 };

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
  /** efeitos do voo (M5-08): rastro e pontos em órbita, encerrados no `free` */
  trail?: TrailHandle;
  motes?: MoveHandle;
  /** Fireball: tempo até a próxima baforada de fumaça; Iceball: giro do cristal */
  puff?: number;
  spin?: number;
  align?: THREE.Quaternion;
  /** Chain Lightning: relâmpago da mão até o dardo */
  zap?: BeamHandle;
}

/** Prism Beam aceso: sai do herói e gira com a mira (techniques.lua `Tech.beam`). */
interface Beam {
  slot: number;
  st: SpellStats;
  time: number;
  tickLeft: number;
  dx: number; dz: number;
  /** halo largo e quente, raio branco por cima e o prisma girando na mão (M5-08) */
  halo: BeamHandle;
  core: BeamHandle;
  fringe: BeamHandle[];
  prism: MoveHandle;
  /** Spectrum: distância do herói até onde o raio se divide (o primeiro inimigo), ou null sem inimigo na linha */
  split: number | null;
  rays: BeamHandle[];
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
  /** correntes de vento em volta (pé e meio do funil) e a área no chão */
  winds: MoveHandle[];
  area?: VfxHandle;
  /** M21-05: elemento que o tornado absorveu (o primeiro fica até ele acabar) */
  element: TornadoElement | null;
}

/** M21-06: lâmina do Blade Orbit voando para fora (pico da aura). */
interface BladeFlight {
  obj: THREE.Object3D;
  x: number; z: number; dx: number; dz: number;
  left: number;
  speed: number;
  st: SpellStats;
  hit: Set<Enemy>;
  trail: TrailHandle;
  /** grupo do giro de onde a lâmina saiu: os materiais são liberados quando a última lâmina dele cai */
  from: THREE.Group;
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
  /** Earthen Ward: golpes que o ídolo ainda aguenta e o anel do raio de atração */
  hits?: number;
  lure?: GroundRing;
  /** a área da batida marcada no chão enquanto o totem está de pé (M5-08) */
  area?: VfxHandle;
  /** tremor do golpe levado, de 1 a 0 */
  shake: number;
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
  /** luzes de cura girando devagar dentro do anel (M5-08) */
  motes: MoveHandle;
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
  /** rastro de cada lâmina no giro (M5-08) */
  trails: TrailHandle[];
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
  /** já armou (o clarão de armar sai uma vez) */
  armed?: boolean;
  /** clarão ao armar, de 1 a 0 */
  flash: number;
}

/** Firestorm (behaviors.lua `world.fireAuras`): aura de fogo que segue o herói e fere a cada tique. */
interface Aura {
  slot: number;
  st: SpellStats;
  time: number;
  duration: number;
  tickLeft: number;
  /** cada lançamento queima uma vez por inimigo (a queimadura não se empilha a cada tique) */
  burned: Set<Enemy>;
  pulse: number;
  ring: GroundRing;
}

/** Firewave (behaviors.lua `world.walls`): muralha de fogo que varre para a frente e fica queimando um pouco. */
interface Wall {
  slot: number;
  st: SpellStats;
  x: number; z: number; dx: number; dz: number;
  t: number;
  done: number;
  hit: Set<Enemy>;
  mesh: THREE.Mesh;
}

/** Blizzard (behaviors.lua `world.storms`): tempestade parada na mira; fere e deixa lento a cada tique. */
/** escola da spell do golpe: o elemento que as reações olham (M21-05) */
const schoolOf = (st: SpellStats): string => SPELL_SCHOOL[st.id];

interface Storm {
  slot: number;
  st: SpellStats;
  x: number; z: number;
  time: number;
  duration: number;
  tickLeft: number;
  pulse: number;
  ring: GroundRing;
}

/** Anel no chão com relógio (aura, tempestade). */
interface GroundRing {
  group: THREE.Group;
  disc: THREE.MeshBasicMaterial;
  edge: THREE.MeshBasicMaterial;
  clock: THREE.Mesh;
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
const FUNNELS: readonly [number, number, number][] = [[0.36, 5.2, 0.12], [0.25, 4.4, 0.17], [0.15, 4.8, 0.16]];

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
/** Firewave: brasa no chão, com as bordas suaves e a frente (v = 1) mais acesa; o ruído quebra a faixa em línguas */
let wallTex: THREE.CanvasTexture | null = null;
function firewaveTexture(): THREE.CanvasTexture {
  if (wallTex) return wallTex;
  const W = 64;
  const H = 128;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const v = 1 - y / (H - 1); // a linha de cima do canvas é v = 1
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      const side = Math.min(1, Math.sin(Math.PI * u) * 1.6);
      const n = 0.75 + 0.25 * Math.sin(x * 0.9 + y * 0.35) * Math.sin(x * 0.37 - y * 0.6);
      const a = side * n * (0.35 + 0.65 * v ** 1.5);
      const k = (y * W + x) * 4;
      img.data[k] = 255;
      img.data[k + 1] = Math.round(90 + 140 * v * side);
      img.data[k + 2] = Math.round(30 + 60 * v * v * side);
      img.data[k + 3] = Math.round(255 * Math.max(0, Math.min(1, a)));
    }
  }
  ctx.putImageData(img, 0, 0);
  wallTex = new THREE.CanvasTexture(c);
  wallTex.colorSpace = THREE.SRGBColorSpace;
  return wallTex;
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
  /** M21-06: recarga do pico de cada espaço de aura (a tecla) */
  spikeCd: number[] = [];
  private flights: BladeFlight[] = [];
  private shots: SpellProjectile[] = [];
  private beams: Beam[] = [];
  private vortices: Vortex[] = [];
  private totems: Totem[] = [];
  private fields: Field[] = [];
  private orbits: Orbit[] = [];
  private runes: Rune[] = [];
  private auras: Aura[] = [];
  private walls: Wall[] = [];
  private storms: Storm[] = [];
  private pending: PendingCast[] = [];
  /** efeitos atrasados (`later`) */
  private delayed: { t: number; fn: () => void }[] = [];
  /** Rune Circle: as linhas desenhadas (reaproveitadas a cada quadro) e o tique das linhas de cada espaço */
  private lines: THREE.Mesh[] = [];
  private runeTicks = new Map<number, number>();
  private mats = new Map<number, THREE.MeshBasicMaterial>();

  constructor(private game: Game) {}

  /** Refaz os números das spells com os atributos atuais (chamado por `Game.recompute`). */
  refresh(): void {
    const g = this.game;
    const s = g.stats;
    this.stats = g.run.spells.slice(0, MAX_SPELLS).map((slot) =>
      isSpellId(slot.id)
        ? spellStats(slot, spellContext(s))
        : null);
    while (this.cooldown.length < this.stats.length) this.cooldown.push(0);
    this.cooldown.length = this.stats.length;
    while (this.spikeCd.length < this.stats.length) this.spikeCd.push(0);
    this.spikeCd.length = this.stats.length;
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
      this.spikeCd[i] = Math.max(0, (this.spikeCd[i] ?? 0) - dt);
      const st = this.stats[i];
      if (st && isAura(st.id)) {
        // M21-06 (D18): a aura sai sozinha como lá (S14); a tecla dá o pico
        if (castKeys[i]) this.trySpike(i);
        if (this.cooldown[i] <= 0 && this.autoReady(st, walking)) this.tryCast(i);
      } else if (castKeys[i]) this.tryCast(i, true);
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
    for (let k = this.delayed.length - 1; k >= 0; k--) {
      const d = this.delayed[k];
      d.t -= dt;
      if (d.t > 0) continue;
      this.delayed.splice(k, 1);
      d.fn();
    }
    this.updateShots(dt);
    this.updateBeams(dt);
    this.updateVortices(dt);
    this.updateTotems(dt);
    this.updateFields(dt);
    this.updateOrbits(dt);
    this.updateRunes(dt);
    this.updateAuras(dt);
    this.updateWalls(dt);
    this.updateStorms(dt);
    this.updateFlights(dt);
  }

  /** Quando a aura sai sozinha: Rune Traps só andando (como lá), Venom Nova só com inimigo no raio, o resto sempre. */
  private autoReady(st: SpellStats, walking: boolean): boolean {
    if (st.kind === "rune") return walking;
    if (st.kind === "nova") return this.inArea(this.game.player.x, this.game.player.z, st.radius).length > 0;
    return true;
  }

  /** Recarga que o HUD mostra na tecla: a do pico nas auras, a da spell nas outras. */
  keyCooldown(i: number): number {
    const st = this.stats[i];
    return st && isAura(st.id) ? this.spikeCd[i] ?? 0 : this.cooldown[i] ?? 0;
  }

  /**
   * M21-06: o pico da aura na tecla. Precisa do efeito em campo (lâminas, campo, runas; a Nova não precisa); ao sair,
   * a recarga do pico e a da aura recomeçam juntas, então a aura só volta depois dela.
   */
  trySpike(i: number): boolean {
    const st = this.stats[i];
    const g = this.game;
    if (!st || this.spikeCd[i] > 0 || !g.playerAlive) return false;
    let ok = false;
    if (st.kind === "orbit") ok = this.spikeOrbit(i);
    else if (st.kind === "field") ok = this.spikeField(i);
    else if (st.kind === "rune") ok = this.spikeRunes(i);
    else if (st.kind === "nova") ok = this.castNova(st, AURA_SPIKE.novaStacks);
    if (!ok) {
      this.noTarget[i] = 0.35;
      return false;
    }
    this.cooldown[i] = st.cooldown;
    this.spikeCd[i] = st.cooldown;
    return true;
  }

  /** Blade Orbit: cada lâmina sai voando em linha, para fora, a partir de onde está; o giro acaba. */
  private spikeOrbit(i: number): boolean {
    const g = this.game;
    const p = g.player;
    const k = this.orbits.findIndex((o) => o.slot === i);
    if (k < 0) return false;
    const o = this.orbits[k];
    const tint = o.st.evolution === "blade_storm" ? EVO_COLOR.blade_storm : BLADE_STEEL;
    for (const b of o.blades) {
      const bx = b.position.x;
      const bz = b.position.z;
      const d = Math.hypot(bx, bz) || 1;
      const x = p.x + bx;
      const z = p.z + bz;
      b.removeFromParent();
      g.scene.add(b);
      b.position.set(x, 1, z);
      this.flights.push({ obj: b, x, z, dx: bx / d, dz: bz / d, left: AURA_SPIKE.orbitReach,
        speed: AURA_SPIKE.orbitReach / AURA_SPIKE.orbitFlight, st: o.st, hit: new Set(), from: o.group,
        trail: g.fx.lib.trail({ color: tint, core: BLADE_CORE, width: 1.1, life: 0.25, head: 0, sheds: 8 }) });
    }
    // o resto do giro some; o grupo (com os materiais) fica até a última lâmina cair
    for (const t of o.trails) t.kill(0.12);
    o.group.removeFromParent();
    this.orbits.splice(k, 1);
    g.fx.lib.ring(p.x, p.z, { radius: o.st.radius * 1.4, color: tint, core: BLADE_CORE, width: 0.35, from: 0.6, dust: 6, dur: 0.3 });
    g.fx.text(p.x, 2.8, p.z, "Blade Burst", "react");
    g.audio.play("tech");
    return true;
  }

  private updateFlights(dt: number): void {
    const g = this.game;
    for (let k = this.flights.length - 1; k >= 0; k--) {
      const f = this.flights[k];
      const step = Math.min(f.left, f.speed * dt);
      const x0 = f.x;
      const z0 = f.z;
      f.x += f.dx * step;
      f.z += f.dz * step;
      f.left -= step;
      // fere quem está no trecho andado neste quadro (segmento, para não pular ninguém)
      for (const e of this.inSegment(x0, z0, f.dx, f.dz, 0, step, AURA_SPIKE.orbitWidth, f.hit)) {
        f.hit.add(e);
        g.spellHit(e, f.st.damage * AURA_SPIKE.orbitDamage, false, schoolOf(f.st));
        g.fx.lib.burst(e.x, 1, e.z, { radius: 0.8, color: BLADE_STEEL, core: BLADE_CORE, rays: 3, sparks: 7, light: 0, dur: 0.16, wave: 0 });
      }
      f.obj.position.set(f.x, 1, f.z);
      f.obj.rotation.set(0, -Math.atan2(f.dz, f.dx), 0.25);
      f.obj.scale.setScalar(3);
      f.trail.push(f.x, 1, f.z);
      if (f.left > 1e-6) continue;
      g.fx.lib.burst(f.x, 1, f.z, { radius: 0.6, color: BLADE_STEEL, core: BLADE_CORE, rays: 0, sparks: 6, light: 0, dur: 0.18, wave: 0 });
      f.trail.kill(0.15);
      // a lâmina volta ao grupo dela, para os materiais saírem junto quando o grupo for liberado
      f.from.add(f.obj);
      this.flights.splice(k, 1);
      if (!this.flights.some((o) => o.from === f.from)) freeGroup(f.from);
    }
  }

  /** Healing Field: o campo que segue o herói some e dá de uma vez a cura dos tiques que faltavam. */
  private spikeField(i: number): boolean {
    const g = this.game;
    const p = g.player;
    const k = this.fields.findIndex((f) => f.slot === i && f.follow);
    if (k < 0) return false;
    const f = this.fields[k];
    const n = remainingTicks(f.time, f.tickLeft, f.st.tick ?? 1);
    if (n <= 0) return false;
    g.heal(g.stats.maxHp * (f.st.heal ?? 0) * n * AURA_SPIKE.fieldHeal, true);
    if (f.st.fieldDamage) this.sanctuaryBurn(f);
    const c = f.st.evolution === "sanctuary" ? EVO_COLOR.sanctuary : SPELL_COLOR.healing_field;
    g.fx.lib.pillar(p.x, p.z, { radius: 1.4, height: 6, color: c, core: HEAL_CORE, speed: 6, dur: 0.7 });
    g.fx.lib.ring(p.x, p.z, { radius: f.st.radius, color: c, core: HEAL_CORE, width: 0.5, from: 1, fill: 0.2, dust: 10, dur: 0.45 });
    g.fx.text(p.x, 2.8, p.z, "Healing Burst", "heal react");
    this.freeField(k);
    g.audio.play("tech");
    return true;
  }

  /** Rune Traps: todas as runas do espaço explodem já, armadas ou não. */
  private spikeRunes(i: number): boolean {
    const g = this.game;
    let n = 0;
    for (let k = this.runes.length - 1; k >= 0; k--) {
      const r = this.runes[k];
      if (r.slot !== i || r.fade !== undefined) continue;
      this.detonate(r);
      this.freeRune(k);
      n++;
    }
    if (n) g.fx.text(g.player.x, 2.8, g.player.z, "Detonate", "react");
    return n > 0;
  }

  /** spell_system.lua `tryCast`: a recarga é gasta quando a spell sai; spell sem efeito ainda (M6-05) não gasta. */
  tryCast(i: number, manual = false): boolean {
    const st = this.stats[i];
    if (!st || this.cooldown[i] > 0 || !this.game.playerAlive) return false;
    // Arcane Strike não se lança: a recarga carrega o próximo ataque básico (`onAutoHit`)
    if (st.evolution === "arcane_strike") return false;
    if (!this.cast(i, st)) {
      this.noTarget[i] = 0.35;
      return false;
    }
    this.cooldown[i] = st.cooldown;
    // Overcharge (M21-07): depois da técnica, a spell da tecla sai sem gastar a recarga
    if (manual && this.game.epics.takeFreeSpell()) this.cooldown[i] = 0;
    // Eco (S16): chance de relançar igual e de graça 0,2 s depois
    if (st.echo && !st.evolution && Math.random() < st.echo) this.pending.push({ slot: i, t: SPELL_CAST.echoDelay });
    return true;
  }

  private cast(i: number, st: SpellStats): boolean {
    // as evoluções que trocam a forma (behaviors.lua `Evo`); as outras seguem o tipo da spell
    switch (st.evolution) {
      case "firestorm":
        return this.castFirestorm(i, st);
      case "firewave":
        return this.castFirewave(i, st);
      case "blizzard":
        return this.castBlizzard(i, st);
      case "lightning_strike":
        return this.castStrike(st);
      case "arcane_strike":
        return false;
    }
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
      const shot: SpellProjectile = { slot: i, id: st.id, st, x: p.x, z: p.z, dx: Math.sin(a), dz: Math.cos(a), remaining: st.range,
        speed: st.speed ?? 20, mesh, color };
      if (st.id === "arcane_bolt") this.arcaneFlight(shot);
      else if (st.id === "fireball") this.fireFlight(shot);
      else if (st.id === "iceball") this.iceFlight(shot);
      this.shots.push(shot);
    }
    p.facing = base;
    g.audio.play("tech");
    if (st.id === "arcane_bolt") this.arcaneCast(p.x + dx * 0.9, p.z + dz * 0.9);
    else if (st.id === "fireball") this.fireCast(p.x + dx * 0.9, p.z + dz * 0.9);
    else if (st.id === "iceball") this.iceCast(p.x + dx * 0.9, p.z + dz * 0.9);
    else g.fx.burst(p.x + dx * 0.8, SPELL_CAST.height, p.z + dz * 0.8, color, 12, 4, 0.12, 0.3, 2);
    return true;
  }

  // ---------------------------------------------------------------- Fireball (M5-08)
  /** Bola de chama: miolo amarelo pequeno, rastro largo vermelho-laranja soltando brasas e fumaça escura atrás. */
  private fireFlight(pr: SpellProjectile): void {
    const lib = this.game.fx.lib;
    pr.mesh.material = this.mat(FIRE_CORE);
    pr.mesh.scale.setScalar(SPELL_CAST.ballSize * 0.75);
    pr.trail = lib.trail({ color: FIRE_DEEP, core: FIRE_CORE, width: 1.1, life: 0.2, head: 1.4, sheds: 34 });
    pr.puff = 0;
  }

  private fireCast(x: number, z: number): void {
    const lib = this.game.fx.lib;
    lib.burst(x, SPELL_CAST.height, z, { radius: 1, color: FIRE_DEEP, core: FIRE_CORE, rays: 0, sparks: 9, light: 1.4, dur: 0.22, wave: 0 });
    lib.smoke(x, SPELL_CAST.height, z, { radius: 0.8, color: FIRE_SMOKE, core: FIRE_SMOKE_HOT, alpha: 0.4, rise: 0.8, dur: 0.6 });
  }

  /** Explosão: clarão com raios, onda que enche o raio da área, chão rachado em brasa, brasas caindo e fumaça subindo. */
  private fireImpact(x: number, z: number, r: number): void {
    const g = this.game;
    const lib = g.fx.lib;
    lib.burst(x, 1, z, { radius: Math.max(1.7, r * 0.95), color: FIRE_DEEP, core: 0xffe8a0, rays: 8, sparks: 18, light: 3.2, dur: 0.4 });
    lib.ring(x, z, { radius: r, color: SPELL_COLOR.fireball, core: FIRE_CORE, width: 0.65, fill: 0.5, dust: 8, dur: 0.35 });
    lib.groundCrack(x, z, { radius: r * 0.5, count: 7, width: 0.26, scorch: 0.7, color: FIRE_DEEP, core: FIRE_CORE, dur: 0.8 });
    for (let n = 0; n < 16; n++) {
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 4;
      g.fx.glow(x, 0.8, z, n % 3 ? SPELL_COLOR.fireball : FIRE_CORE, 0.3 + Math.random() * 0.2, 0.7 + Math.random() * 0.6,
        Math.cos(a) * s, 4 + Math.random() * 4, Math.sin(a) * s, 12);
    }
    for (let n = 0; n < 5; n++) {
      const a = Math.random() * Math.PI * 2;
      const d = r * 0.45 * Math.random();
      lib.smoke(x + Math.cos(a) * d, 0.9 + Math.random() * 0.6, z + Math.sin(a) * d, { radius: 1.1 + Math.random() * 0.6, color: FIRE_SMOKE,
        core: FIRE_SMOKE_HOT, alpha: 0.5, rise: 1.3, drift: [Math.cos(a) * 0.6, Math.sin(a) * 0.6], dur: 1 + Math.random() * 0.4 });
    }
    g.fx.addShake(0.14);
  }

  // ---------------------------------------------------------------- Iceball (M5-08)
  /** Cristal de gelo girando no eixo do voo, rastro fino, duas fagulhas de geada em volta e flocos caindo. */
  private iceFlight(pr: SpellProjectile): void {
    const lib = this.game.fx.lib;
    pr.mesh.geometry = CRYSTAL_GEO;
    pr.mesh.material = ICE_MAT;
    pr.mesh.scale.setScalar(SPELL_CAST.ballSize * 1.6);
    pr.align = new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(pr.dx, 0, pr.dz));
    pr.spin = 0;
    pr.trail = lib.trail({ color: ICE_DEEP, core: 0x8fe8ff, width: 0.65, life: 0.16, head: 0.75, sheds: 18 });
  }

  private iceCast(x: number, z: number): void {
    const lib = this.game.fx.lib;
    lib.burst(x, SPELL_CAST.height, z, { radius: 0.9, color: ICE_DEEP, core: ICE_CORE, rays: 6, sparks: 8, light: 1, dur: 0.22, wave: 0 });
    lib.smoke(x, SPELL_CAST.height, z, { radius: 0.7, color: ICE_MIST, alpha: 0.3, rise: 0.2, dur: 0.5 });
  }

  /** Impacto: espinhos de gelo brotando no raio, geada no chão, clarão frio, flocos e névoa baixa. */
  private iceImpact(x: number, z: number, r: number): void {
    const g = this.game;
    const lib = g.fx.lib;
    lib.spikes(x, z, { radius: r * 0.85, count: 16, height: 2.4, color: 0xcdeeff, core: 0x3d8fe0, opacity: 0.88, dur: 0.95 });
    lib.burst(x, 0.9, z, { radius: Math.max(1.3, r * 0.7), color: ICE_DEEP, core: ICE_CORE, rays: 6, sparks: 14, light: 2.2, dur: 0.32 });
    lib.ring(x, z, { radius: r, color: SPELL_COLOR.iceball, core: ICE_CORE, width: 0.4, fill: 0.3, dust: 0, dur: 0.5, curve: "fade", power: 0.8 });
    for (let n = 0; n < 18; n++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 3;
      g.fx.glow(x, 0.6 + Math.random(), z, n % 3 ? ICE_CORE : SPELL_COLOR.iceball, 0.2 + Math.random() * 0.15, 0.8 + Math.random() * 0.5,
        Math.cos(a) * s, 2.5 + Math.random() * 2.5, Math.sin(a) * s, 5);
    }
    for (let n = 0; n < 4; n++) {
      const a = (n / 4) * Math.PI * 2 + Math.random();
      const d = r * (0.3 + 0.4 * Math.random());
      lib.smoke(x + Math.cos(a) * d, 0.35, z + Math.sin(a) * d, { radius: 1 + Math.random() * 0.5, color: 0x9fe0ff, core: 0xeaf8ff, alpha: 0.12, rise: 0.15,
        drift: [Math.cos(a) * 0.8, Math.sin(a) * 0.8], dur: 0.55 });
    }
    g.fx.addShake(0.1);
  }

  /** a cada quadro de voo: fumaça e chama da Fireball, giro e flocos da Iceball */
  private flightFx(pr: SpellProjectile, dt: number): void {
    const g = this.game;
    const y = SPELL_CAST.height;
    if (pr.id === "fireball") {
      g.fx.glow(pr.x, y, pr.z, SPELL_COLOR.fireball, 2.2 + Math.random() * 1, 0.05);
      pr.puff = (pr.puff ?? 0) - dt;
      if (pr.puff <= 0) {
        pr.puff += 0.045;
        g.fx.lib.smoke(pr.x - pr.dx * 0.5, y + 0.1, pr.z - pr.dz * 0.5, { radius: 0.5 + Math.random() * 0.3, color: FIRE_SMOKE,
          core: FIRE_SMOKE_HOT, alpha: 0.42, rise: 0.7, dur: 0.55 });
      }
    } else if (pr.id === "iceball" && pr.align) {
      pr.spin = (pr.spin ?? 0) + dt * 9;
      pr.mesh.quaternion.copy(pr.align).multiply(SPIN_Q.setFromAxisAngle(UP, pr.spin));
      if (Math.random() < 0.35) g.fx.glow(pr.x, y, pr.z, ICE_CORE, 0.22, 0.6, (Math.random() - 0.5) * 1.2, -1.2, (Math.random() - 0.5) * 1.2);
    }
  }

  // ---------------------------------------------------------------- Arcane Bolt (M5-08)
  /** Orbe violeta de miolo branco, rastro curto e três fagulhas girando em volta, de pé como um giroscópio. */
  private arcaneFlight(pr: SpellProjectile): void {
    const lib = this.game.fx.lib;
    const color = SPELL_COLOR.arcane_bolt;
    pr.mesh.material = this.mat(ARCANE_ORB);
    pr.mesh.scale.setScalar(SPELL_CAST.ballSize * 0.45);
    pr.trail = lib.trail({ color: ARCANE_DEEP, core: color, width: 0.5, life: 0.08, head: 0.7, sheds: 14 });
    pr.motes = lib.orbit(pr.x, SPELL_CAST.height, pr.z, { radius: 0.45, count: 3, color: ARCANE_DEEP, core: ARCANE_CORE,
      speed: 2.6, tilt: 0.6, size: 0.36, bob: 0, dur: Infinity });
  }

  /** Lançamento: clarão violeta na mão e um anel pequeno que se abre no chão. */
  private arcaneCast(x: number, z: number): void {
    const lib = this.game.fx.lib;
    lib.burst(x, SPELL_CAST.height, z, { radius: 0.9, color: SPELL_COLOR.arcane_bolt, core: ARCANE_CORE, rays: 5, sparks: 6, light: 1, dur: 0.22 });
    lib.ring(x, z, { radius: 1.1, color: ARCANE_DEEP, core: ARCANE_CORE, width: 0.18, dur: 0.3, power: 0.7 });
  }

  /** Impacto: implosão (anel que fecha), depois clarão com raios, onda no raio da área e um selo rúnico que gira e apaga. */
  private arcaneImpact(x: number, z: number, r: number): void {
    const g = this.game;
    const lib = g.fx.lib;
    const color = SPELL_COLOR.arcane_bolt;
    lib.burst(x, 1, z, { radius: Math.max(1.4, r * 0.75), color: ARCANE_DEEP, core: color, rays: 7, sparks: 14, light: 2.6, dur: 0.38 });
    lib.ring(x, z, { radius: r, color, core: ARCANE_CORE, width: 0.7, from: 0.15, fill: 0.3, dust: 4, dur: 0.3 });
    lib.ring(x, z, { radius: r * 0.55, color: ARCANE_DEEP, core: color, width: 0.2, from: 0.9, dur: 0.3, curve: "fade", power: 0.8 });
    lib.orbit(x, 0.35, z, { radius: r * 0.5, count: 5, color: ARCANE_DEEP, core: ARCANE_CORE, speed: -1.4, tilt: 0, size: 0.32, bob: 0.05, dur: 0.32 });
    g.fx.addShake(0.1);
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
    const mesh = new THREE.Mesh(BALL_GEO, this.mat(BOLT_CORE));
    mesh.scale.set(SPELL_CAST.ballSize * 0.35, SPELL_CAST.ballSize * 0.35, SPELL_CAST.ballSize * 2.4);
    mesh.rotation.y = Math.atan2(dx, dz);
    mesh.position.set(p.x, SPELL_CAST.height, p.z);
    g.scene.add(mesh);
    // o dardo leva um ou dois quadros: em vez de um fuso, um relâmpago esticado da mão até ele
    mesh.visible = false;
    const hx = p.x + dx * 0.6, hz = p.z + dz * 0.6;
    const zap = g.fx.lib.lightning(hx, ARC_Y, hz, hx, ARC_Y, hz, { color: BOLT_BODY, core: BOLT_CORE, width: 0.3, branches: 2,
      jag: 0.12, dur: Infinity, curve: "hold", power: 1.4 });
    this.shots.push({ slot: i, id: st.id, st, x: p.x, z: p.z, dx, dz, remaining: st.range, speed: SPELL_CAST.chainBoltSpeed,
      mesh, color, chain: true, zap });
    p.facing = Math.atan2(dx, dz);
    g.audio.play("tech");
    g.fx.lib.burst(p.x + dx * 0.8, SPELL_CAST.height, p.z + dz * 0.8, { radius: 0.8, color: BOLT_BODY, core: BOLT_CORE, rays: 6, sparks: 6, light: 1.2, dur: 0.16 });
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
      this.arc(px, pz, cx, cz, count, (count - 1) * CHAIN_STEP);
      g.spellHit(e, st.damage, false, schoolOf(st));
      // Static Field: chance de acertar o primeiro alvo duas vezes
      if (count === 1 && st.doubleHit && !e.dead && Math.random() < st.doubleHit) {
        g.spellHit(e, st.damage, false, schoolOf(st));
        g.fx.text(cx, 2.6, cz, "x2", "frost");
        g.fx.lib.burst(cx, 1.1, cz, { radius: 1.6, color: BOLT_BODY, core: BOLT_CORE, rays: 9, sparks: 14, light: 2.2, dur: 0.3 });
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

  /**
   * Um salto do raio (M5-08): relâmpago da biblioteca, que se redesenha e pisca, com clarão e faíscas no alvo. `delay`
   * atrasa só o desenho (o dano já entrou), para a cadeia se ler como um raio correndo de alvo em alvo.
   */
  private arc(x0: number, z0: number, x1: number, z1: number, n: number, delay = 0): void {
    const g = this.game;
    const lib = g.fx.lib;
    const life = 0.26 + Math.min(n, 4) * 0.02;
    const dur = life + delay;
    const len = Math.hypot(x1 - x0, z1 - z0);
    lib.lightning(x0, ARC_Y, z0, x1, ARC_Y, z1, {
      color: BOLT_BODY, core: BOLT_CORE, dur, width: 0.3, branches: len > 3 ? 4 : 2, jag: 0.16, power: 1.2,
      curve: (t) => { const s = t * dur - delay; return s < 0 ? 0 : ease("flash", s / life); },
    });
    this.later(delay, () => {
      lib.burst(x1, ARC_Y, z1, { radius: 1.1, color: BOLT_BODY, core: BOLT_CORE, rays: 6, sparks: 10, light: 1.8, dur: 0.24 });
      lib.ring(x1, z1, { radius: 1.3, color: BOLT_BODY, core: BOLT_CORE, width: 0.24, dur: 0.22, power: 0.8 });
    });
  }

  /** Efeito marcado para daqui a `t` s (tempo do jogo). */
  private later(t: number, fn: () => void): void {
    if (t <= 0) fn();
    else this.delayed.push({ t, fn });
  }

  /**
   * techniques.lua `Tech.beam.cast`: raio que sai do herói e gira com a mira; relançar troca o raio aceso. Visual (M5-08):
   * halo largo e dourado, raio branco-quente por cima com ruído correndo para a ponta, prisma de três pontos girando na mão
   * e clarão onde o raio sai; Spectrum abre em três raios de cor no primeiro inimigo.
   */
  private castBeam(i: number, st: SpellStats): boolean {
    const g = this.game;
    const lib = g.fx.lib;
    const p = g.player;
    for (let k = this.beams.length - 1; k >= 0; k--) if (this.beams[k].slot === i) this.freeBeam(k);
    const { dx, dz } = this.aimDir();
    const w = st.width ?? 1;
    const y = SPELL_CAST.height;
    const x0 = p.x + dx * 0.6, z0 = p.z + dz * 0.6, x1 = p.x + dx * st.range, z1 = p.z + dz * st.range;
    const halo = lib.beam(x0, y, z0, x1, y, z1, { color: PRISM_HALO, core: PRISM_GOLD, width: w * 1.1, flow: 7, flare: false,
      dur: Infinity, power: PRISM_HALO_POWER });
    const core = lib.beam(x0, y, z0, x1, y, z1, { color: PRISM_GOLD, core: 0xffffff, width: w * 0.42, flow: 16, dur: Infinity,
      power: PRISM_CORE_POWER });
    // franjas de prisma: vermelho de um lado e azul do outro, finas, coladas ao raio
    const fringe = PRISM_FRINGE.map((c) => lib.beam(x0, y, z0, x1, y, z1, { color: c, width: w * 0.2, flow: 10, flare: false,
      dur: Infinity, power: 0 }));
    const prism = lib.orbit(x0, y, z0, { radius: 0.38, count: 3, color: PRISM_GOLD, core: 0xffffff, speed: 1.6, tilt: 1.4, size: 0.22,
      bob: 0, dur: Infinity });
    const rays = st.evolution === "spectrum"
      ? SPECTRUM_RAYS.map(([, , c]) => lib.beam(x0, y, z0, x0, y, z0, { color: c, width: w * 0.22, flow: 14, dur: Infinity, power: 0 }))
      : [];
    lib.burst(x0, y, z0, { radius: 1.4, color: PRISM_HALO, core: 0xffffff, rays: 8, sparks: 10, light: 2.2, dur: 0.3 });
    lib.ring(p.x, p.z, { radius: 1.8, color: PRISM_HALO, core: PRISM_GOLD, width: 0.3, from: 0.3, dur: 0.35 });
    this.beams.push({ slot: i, st, time: st.duration ?? 1, tickLeft: 0, dx, dz, halo, core, fringe, prism, split: null, rays });
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
      // Spectrum: o raio para no primeiro inimigo e se abre em 3 cores dali
      const len = b.split ?? b.st.range;
      const ang = Math.atan2(b.dx, b.dz);
      // acende em 0,08 s e apaga nos últimos 0,25 s
      const total = b.st.duration ?? 1;
      const fade = Math.min(1, b.time / 0.25, (total - b.time) / 0.08 + 0.3);
      const y = SPELL_CAST.height;
      const x0 = p.x + b.dx * 0.6, z0 = p.z + b.dz * 0.6;
      const x1 = p.x + b.dx * len, z1 = p.z + b.dz * len;
      b.halo.set(x0, y, z0, x1, y, z1);
      b.core.set(x0, y, z0, x1, y, z1);
      b.halo.power = PRISM_HALO_POWER * fade;
      b.core.power = PRISM_CORE_POWER * fade;
      // franjas deslocadas de lado, na perpendicular do raio no chão
      b.fringe.forEach((f, n) => {
        const o = (n === 0 ? -1 : 1) * (b.st.width ?? 1) * 0.26;
        f.set(x0 - b.dz * o, y, z0 + b.dx * o, x1 - b.dz * o, y, z1 + b.dx * o);
        f.power = 0.9 * fade;
      });
      b.prism.move(x0, y, z0);
      b.prism.power = fade;
      // a ponta queima o chão por onde passa; centelhas correm pelo raio para fora
      if (Math.random() < dt * 30) g.fx.glow(x1, 0.15, z1, PRISM_HALO, 0.9, 0.35, 0, 0.2, 0);
      for (let n = Math.floor(dt * 40 + Math.random()); n > 0; n--) {
        const t = Math.random() * len * 0.5, sp = 22 + Math.random() * 10, off = (Math.random() - 0.5) * (b.st.width ?? 1) * 0.5;
        g.fx.glow(x0 + b.dx * t - b.dz * off, y, z0 + b.dz * t + b.dx * off, Math.random() < 0.5 ? 0xffffff : PRISM_GOLD, 0.35 * fade,
          Math.min(0.3, (len - t) / sp), b.dx * sp, 0, b.dz * sp);
      }
      b.rays.forEach((ray, n) => {
        if (b.split === null) { ray.power = 0; return; }
        const ra = ang - SPECTRUM_RAYS[n][1] * (b.st.splitAngle ?? 0);
        const sl = b.st.splitLength ?? 1;
        ray.set(x1, y, z1, x1 + Math.sin(ra) * sl, y, z1 + Math.cos(ra) * sl);
        ray.power = fade;
      });
    }
  }

  /** techniques.lua `beamTick`: cada tique fere todos os inimigos na linha (largura `width`). */
  private beamTick(b: Beam): void {
    const g = this.game;
    const p = g.player;
    const hw = (b.st.width ?? 1) / 2;
    const len = b.st.range;
    if (b.st.evolution === "spectrum") {
      this.spectrumTick(b);
      return;
    }
    for (const e of g.enemies) {
      if (e.dead) continue;
      const ex = e.x - p.x;
      const ez = e.z - p.z;
      const t = ex * b.dx + ez * b.dz;
      if (t < -e.radius || t > len + e.radius) continue;
      if (Math.abs(ex * b.dz - ez * b.dx) > hw + e.radius) continue;
      g.spellHit(e, b.st.damage, false, schoolOf(b.st));
      if (!e.dead && Math.random() < 0.35) g.fx.spark(e.x, 1.2, e.z, 0xfff6d8, 0.12, 0.3, 1);
    }
  }

  /**
   * techniques.lua `beamTick` (Spectrum): o raio para no primeiro inimigo da linha (dano cheio) e se divide ali em 3:
   * vermelho queima, amarelo segue reto e o primeiro que ele pega salta para `jumps` vizinhos, azul dá Slow.
   */
  private spectrumTick(b: Beam): void {
    const g = this.game;
    const p = g.player;
    const st = b.st;
    const hw = (st.width ?? 1) / 2;
    const first = this.inSegment(p.x, p.z, b.dx, b.dz, 0, st.range, hw)
      .map((e) => ({ e, t: (e.x - p.x) * b.dx + (e.z - p.z) * b.dz }))
      .sort((u, v) => u.t - v.t)[0];
    b.split = first ? Math.max(0, first.t) : null;
    if (!first) return;
    const hit = new Set<Enemy>([first.e]);
    g.spellHit(first.e, st.damage, false, schoolOf(st));
    const sx = p.x + b.dx * b.split!;
    const sz = p.z + b.dz * b.split!;
    const a = Math.atan2(b.dx, b.dz);
    for (const [color, side, c] of SPECTRUM_RAYS) {
      const ra = a - side * (st.splitAngle ?? 0);
      const dx = Math.sin(ra);
      const dz = Math.cos(ra);
      const hits = this.inSegment(sx, sz, dx, dz, 0, st.splitLength ?? 0, hw, hit)
        .map((e) => ({ e, t: (e.x - sx) * dx + (e.z - sz) * dz }))
        .sort((u, v) => u.t - v.t);
      hits.forEach(({ e }, n) => {
        g.spellHit(e, st.rayDamage ?? 0, false, schoolOf(st));
        if (e.dead) return;
        if (color === "red") this.applyBurn(e, st, b.slot);
        else if (color === "blue") this.applySlow(e, st.slow ?? 0, st.slowDuration ?? 0);
        else if (n === 0) this.spectrumJump(st, e, hit);
        if (Math.random() < 0.4) g.fx.spark(e.x, 1.2, e.z, c, 0.12, 0.3, 1);
      });
    }
  }

  /** techniques.lua `spectrumJump`: o amarelo salta do primeiro inimigo dele para os `jumps` vizinhos mais perto. */
  private spectrumJump(st: SpellStats, from: Enemy, hit: Set<Enemy>): void {
    const g = this.game;
    const range2 = (st.jumpRange ?? 0) ** 2;
    const near = g.enemies
      .filter((e) => !e.dead && e !== from && !hit.has(e) && (e.x - from.x) ** 2 + (e.z - from.z) ** 2 <= range2)
      .sort((u, v) => ((u.x - from.x) ** 2 + (u.z - from.z) ** 2) - ((v.x - from.x) ** 2 + (v.z - from.z) ** 2))
      .slice(0, st.jumps ?? 0);
    for (const e of near) {
      g.spellHit(e, st.jumpDamage ?? 0, false, schoolOf(st));
      this.arc(from.x, from.z, e.x, e.z, 1);
    }
  }

  private freeBeam(k: number): void {
    const b = this.beams[k];
    for (const h of [b.halo, b.core, ...b.fringe, ...b.rays]) h.kill(0.2);
    b.prism.kill(0.2);
    this.beams.splice(k, 1);
  }

  // ---------------------------------------------------------------- Venom Nova
  /**
   * techniques.lua `Tech.nova.cast`: onda de veneno em volta do herói; cada inimigo dentro ganha um acúmulo. Lá só saía
   * com inimigo no raio; aqui sai sempre (D15).
   */
  /** `stackMult` (pico da aura, M21-06): cada inimigo leva tantos acúmulos de uma vez, com o teto multiplicado junto. */
  private castNova(st: SpellStats, stackMult = 1): boolean {
    const g = this.game;
    const p = g.player;
    const r = st.radius;
    const color = SPELL_COLOR.venom_nova;
    const lib = g.fx.lib;
    const dps = g.stats.damage * st.damage;
    // Plague Bloom: o veneno leva o contágio (spell_stats.lua `st.spread`)
    const spread = st.spreadRadius ? { radius: st.spreadRadius, stacks: st.spreadStacks ?? 1 } : undefined;
    for (const e of g.enemies) {
      if (e.dead) continue;
      if ((e.x - p.x) ** 2 + (e.z - p.z) ** 2 > (r + e.radius) ** 2) continue;
      for (let n = 0; n < stackMult; n++) this.applyPoison(e, dps, st.duration ?? 0, (st.stacks ?? 1) * stackMult, spread);
      if (!e.aggro) e.setAggro(g);
      // respingo aos pés de cada um (D-417)
      lib.burst(e.x, 0.5, e.z, { radius: 0.8, color, core: VENOM_CORE, rays: 0, sparks: 6, light: 0, wave: 0, dur: 0.25 });
    }
    this.novaFx(p.x, p.z, r, spread ? EVO_COLOR.plague_bloom : VENOM_DARK);
    if (stackMult > 1) g.fx.text(p.x, 2.8, p.z, "Venom Surge", "poison react");
    g.audio.play("tech");
    return true;
  }

  /**
   * Onda de veneno (M5-08): frente verde-ácida que abre até o raio, segunda onda escura atrás, nuvem tóxica rolando para
   * fora pela borda e bolhas subindo do chão. `deep` é o verde escuro (violeta no Plague Bloom).
   */
  private novaFx(x: number, z: number, r: number, deep: number): void {
    const g = this.game;
    const lib = g.fx.lib;
    const color = SPELL_COLOR.venom_nova;
    lib.burst(x, 1, z, { radius: 1.3, color, core: VENOM_CORE, rays: 0, sparks: 10, light: 2, dur: 0.3, wave: 0 });
    lib.ring(x, z, { radius: r, color, core: VENOM_CORE, width: 0.9, fill: 0.25, dust: 10, dur: 0.45 });
    lib.ring(x, z, { radius: r * 0.85, color: deep, core: color, width: 0.55, from: 0.05, fill: 0.2, dust: 0, dur: 0.65, curve: "fade", power: 0.9 });
    for (let n = 0; n < 20; n++) {
      const a = (n / 20) * Math.PI * 2 + Math.random() * 0.3;
      const d = r * (0.3 + 0.3 * Math.random());
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      lib.smoke(x + ca * d * 0.6, 0.6, z + sa * d * 0.6, { radius: 1.4 + Math.random() * 0.6, color: VENOM_CLOUD, core: VENOM_CORE, alpha: 0.24,
        rise: 0.5, drift: [ca * d * 0.5, sa * d * 0.5], dur: 0.6 + Math.random() * 0.2 });
    }
    for (let n = 0; n < 22; n++) {
      const a = Math.random() * Math.PI * 2;
      const d = r * (0.2 + 0.8 * Math.random());
      g.fx.glow(x + Math.cos(a) * d, 0.2, z + Math.sin(a) * d, n % 3 ? color : VENOM_CORE, 0.3 + Math.random() * 0.25,
        0.6 + Math.random() * 0.6, Math.cos(a) * 0.6, 1 + Math.random() * 1.5, Math.sin(a) * 0.6);
    }
  }

  /**
   * status.lua `applyPoison`: o mesmo veneno do tiro da Vesper (S23, um efeito só por inimigo; `Enemy.applyPoison`).
   */
  private applyPoison(e: Enemy, dps: number, duration: number, maxStacks: number, spread?: Dot["spread"]): void {
    e.applyPoison(this.game.time, dps, duration, maxStacks, spread, "venom_nova");
  }

  /**
   * techniques.lua `Tech.onKill` (Plague Bloom): quem morre envenenado passa `stacks` acúmulos do mesmo veneno, com o
   * mesmo contágio, a quem está no raio; veias violetas do morto até os vizinhos (D-418).
   */
  private plagueSpread(e: Enemy): void {
    const g = this.game;
    const po = e.dots.find((d) => d.kind === "poison" && d.spread && d.until > g.time);
    if (!po?.spread) return;
    const { radius, stacks } = po.spread;
    const targets = this.inArea(e.x, e.z, radius).filter((o) => o !== e);
    for (const o of targets) {
      for (let n = 0; n < stacks; n++) this.applyPoison(o, po.dps, po.duration ?? 0, po.maxStacks ?? 1, po.spread);
      if (!o.aggro) o.setAggro(g);
    }
    const c = EVO_COLOR.plague_bloom;
    for (const o of targets.slice(0, SPELL_CAST.plagueVeins)) {
      const d = Math.hypot(o.x - e.x, o.z - e.z);
      const n = Math.max(3, Math.round(d / 0.35));
      for (let k = 1; k <= n; k++) {
        const t = k / n;
        const w = Math.sin(t * Math.PI) * 0.25 * Math.sin(k * 2.3 + e.x);
        g.fx.glow(e.x + (o.x - e.x) * t + w, 0.3, e.z + (o.z - e.z) * t - w, k % 2 ? c : SPELL_COLOR.venom_nova, 0.45, 0.35 + t * 0.25);
      }
      g.fx.burst(o.x, 0.5, o.z, c, 6, 2.5, 0.1, 0.4, -1);
    }
    g.fx.shockwave(e.x, e.z, radius, c, 0.35);
    g.fx.burst(e.x, 0.6, e.z, c, 16, 4, 0.14, 0.5, -1);
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
        color: st.followSpeed ? EVO_COLOR.maelstrom : SPELL_COLOR.cyclone, vertexColors: true, transparent: true, opacity: op, depthWrite: false,
        toneMapped: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      }));
      m.scale.set(st.radius * rad, h, st.radius * rad);
      m.renderOrder = 3;
      group.add(m);
      cones.push(m);
    }
    group.position.set(a.x, 0, a.z);
    g.scene.add(group);
    // correntes de vento: uma rente ao chão no alcance do puxão, outra no meio do funil (M5-08)
    const lib = g.fx.lib;
    const tint = st.followSpeed ? EVO_COLOR.maelstrom : SPELL_COLOR.cyclone;
    const reach = st.radius * SPELL_CAST.vortexReach;
    const winds = [
      lib.orbit(a.x, 0.45, a.z, { radius: reach * 0.6, count: 4, color: tint, core: WIND_CORE, speed: 1.3, tilt: 0.08, size: 0.34, bob: 0.12, dur: Infinity }),
      lib.orbit(a.x, 2.1, a.z, { radius: st.radius * 0.42, count: 3, color: tint, core: WIND_CORE, speed: 2.1, tilt: 0.15, size: 0.28, bob: 0.25, dur: Infinity }),
    ];
    // a área que fere, parada no chão (o Maelstrom anda, então fica sem)
    const area = st.followSpeed ? undefined
      : lib.ring(a.x, a.z, { radius: st.radius, color: tint, core: WIND_CORE, width: 0.22, from: 1, fill: 0.12, dust: 0, dur: Infinity, power: 0.45 });
    this.vortices.push({ slot: i, st, x: a.x, z: a.z, time: st.duration ?? 1, tickLeft: st.tick ?? 0.5, group, cones, winds, area, element: null });
    lib.ring(a.x, a.z, { radius: reach, color: tint, core: WIND_CORE, width: 0.35, from: 0.2, dust: 10, dur: 0.4 });
    lib.burst(a.x, 0.8, a.z, { radius: 1.2, color: tint, core: WIND_CORE, rays: 0, sparks: 8, light: 0.8, dur: 0.25, wave: 0 });
    g.audio.play("tech");
    return true;
  }

  /** M21-05: golpe de fogo, gelo, raio ou veneno em quem está no funil dá o elemento ao tornado. */
  infuse(e: Enemy, element: string): void {
    const g = this.game;
    for (const v of this.vortices) {
      if (v.element) continue;
      const reach = v.st.radius * SPELL_CAST.vortexReach;
      if ((e.x - v.x) ** 2 + (e.z - v.z) ** 2 > (reach + e.radius) ** 2) continue;
      const el = tornadoInfusion(null, element);
      if (!el) return;
      v.element = el;
      const color = REACTIONS.tornado[el].color;
      for (const m of v.cones) (m.material as THREE.MeshBasicMaterial).color.setHex(color);
      const name = el === "fire" ? "Fire" : el === "ice" ? "Ice" : el === "lightning" ? "Storm" : "Venom";
      g.fx.text(v.x, 3.6, v.z, `${name} Tornado`, "react");
      g.fx.lib.ring(v.x, v.z, { radius: reach, color, core: 0xffffff, width: 0.4, from: 0.2, dust: 10, dur: 0.4 });
      g.fx.lib.burst(v.x, 1.4, v.z, { radius: 1.6, color, core: 0xffffff, rays: 4, sparks: 16, light: 1, dur: 0.3, wave: 0 });
      g.audio.play("tech");
    }
  }

  /** Tique de um tornado com elemento em quem está dentro: queima, gela, dá choque de raio ou envenena. */
  private tornadoTick(v: Vortex, e: Enemy): void {
    const g = this.game;
    const T = REACTIONS.tornado;
    const now = g.time;
    const s = g.stats;
    if (v.element === "fire") e.applyBurn(now, s.damage * T.fire.burnDps * s.burn, T.fire.burnDuration);
    else if (v.element === "ice") this.applySlow(e, T.ice.slow, T.ice.slowDuration, true);
    else if (v.element === "lightning") {
      g.spellHit(e, v.st.damage * T.lightning.shock, true, "lightning");
      if (Math.random() < 0.5) g.fx.spark(e.x, 1.2, e.z, T.lightning.color, 0.14, 0.3, 1);
    } else if (v.element === "poison") e.applyPoison(now, s.damage * T.poison.poisonDps * s.poison, T.poison.poisonDuration, T.poison.maxStacks, undefined, "tornado");
  }

  /** techniques.lua `updateVortex`: puxa todos no alcance do funil para o olho (chefes, `bossPull`) e fere os de dentro. */
  private updateVortices(dt: number): void {
    const g = this.game;
    for (let k = this.vortices.length - 1; k >= 0; k--) {
      const v = this.vortices[k];
      const st = v.st;
      v.time -= dt;
      if (st.followSpeed) {
        // Maelstrom: o olho anda atrás da mira (o alcance do herói ainda limita)
        const a = g.aimPoint(st.range);
        const dx = a.x - v.x;
        const dz = a.z - v.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.05) {
          const step = Math.min(d, st.followSpeed * dt);
          v.x += (dx / d) * step;
          v.z += (dz / d) * step;
          v.group.position.set(v.x, 0, v.z);
          v.winds[0].move(v.x, 0.45, v.z);
          v.winds[1].move(v.x, 2.1, v.z);
        }
      }
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
          g.spellHit(e, st.damage, true, schoolOf(st));
          if (v.element && !e.dead) this.tornadoTick(v, e);
        }
      }
      if (v.time <= 0) {
        const tint = st.followSpeed ? EVO_COLOR.maelstrom : SPELL_COLOR.cyclone;
        g.fx.lib.burst(v.x, 1.4, v.z, { radius: 1.4, color: tint, core: WIND_CORE, rays: 0, sparks: 14, light: 0.8, dur: 0.3, wave: 0 });
        g.fx.lib.ring(v.x, v.z, { radius: reach, color: tint, core: WIND_CORE, width: 0.3, from: 0.3, dust: 6, dur: 0.35, power: 0.7 });
        if (st.followSpeed) this.flingOut(v);
        this.freeVortex(k);
        continue;
      }
      // visual: os funis giram, crescem no começo e somem no fim
      const fade = Math.min(1, ((st.duration ?? 1) - v.time) / 0.25, v.time / 0.35);
      v.cones.forEach((m, n) => {
        const [rad, h, op] = FUNNELS[n];
        m.rotation.y += dt * (7 + n * 3) * (n % 2 ? -1 : 1);
        (m.material as THREE.MeshBasicMaterial).opacity = op * fade;
        m.scale.y = h * (0.6 + 0.4 * fade);
        // no fim o funil afina antes de sumir
        const w = st.radius * rad * (0.35 + 0.65 * fade);
        m.scale.x = m.scale.z = w;
      });
      v.group.rotation.z = Math.sin(g.time * 3.1 + v.x) * 0.05;
      v.group.rotation.x = Math.cos(g.time * 2.7 + v.z) * 0.05;
      for (const w of v.winds) w.power = fade;
      if (v.area) v.area.power = 0.45 * fade;
      // folhas e cisco claros girando no vento
      for (let n = 0; n < 2; n++) {
        const a = Math.random() * Math.PI * 2;
        const d = reach * (0.3 + 0.6 * Math.random());
        const sx = Math.sin(a);
        const sz = Math.cos(a);
        g.fx.glow(v.x + sx * d, 0.3 + Math.random() * 1.5, v.z + sz * d, n ? 0xd8c8a4 : 0xe8f4ff, 0.3 + Math.random() * 0.2,
          0.45, sz * 6 - sx * 3, 2 + Math.random() * 2.5, -sx * 6 - sz * 3);
      }
    }
  }

  /**
   * techniques.lua `flingOut` (Maelstrom): no fim, quem está no alcance do funil (menos chefe) é arremessado para fora
   * `flingDistance`; quem cai em cima de outro inimigo leva `flingFraction` do dano de um tique, e o outro também.
   */
  private flingOut(v: Vortex): void {
    const g = this.game;
    const st = v.st;
    const dist = st.flingDistance ?? 0;
    const landed: { e: Enemy; x: number; z: number }[] = [];
    for (const e of this.inArea(v.x, v.z, st.radius * SPELL_CAST.vortexReach)) {
      if (e.isBoss) continue;
      let dx = e.x - v.x;
      let dz = e.z - v.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) [dx, dz] = [1, 0];
      else [dx, dz] = [dx / d, dz / d];
      e.kx += dx * dist * KNOCK_DECAY;
      e.kz += dz * dist * KNOCK_DECAY;
      landed.push({ e, x: e.x + dx * dist, z: e.z + dz * dist });
      // rastro de poeira na direção do arremesso (D-526)
      for (let n = 0; n < 5; n++) {
        const t = Math.random();
        g.fx.glow(e.x + dx * dist * t, 0.3 + Math.random() * 0.5, e.z + dz * dist * t, n % 2 ? 0xb9a98a : EVO_COLOR.maelstrom,
          0.6, 0.5, dx * 2, 0.8, dz * 2);
      }
    }
    const bump = st.damage * (st.flingFraction ?? 0);
    for (const l of landed) {
      for (const o of g.enemies) {
        if (o === l.e || o.dead || l.e.dead) continue;
        if ((o.x - l.x) ** 2 + (o.z - l.z) ** 2 > ((st.flingRadius ?? 0) + o.radius) ** 2) continue;
        g.spellHit(l.e, bump, true);
        g.spellHit(o, bump, true);
        g.fx.burst((o.x + l.x) / 2, 0.8, (o.z + l.z) / 2, 0xffffff, 8, 4, 0.1, 0.3, 4);
        break;
      }
    }
    g.fx.shockwave(v.x, v.z, st.radius * SPELL_CAST.vortexReach, EVO_COLOR.maelstrom, 0.4);
    g.fx.addShake(0.15);
    g.audio.play("hit");
  }

  private freeVortex(k: number): void {
    const v = this.vortices[k];
    v.group.removeFromParent();
    for (const m of v.cones) (m.material as THREE.Material).dispose();
    for (const w of v.winds) w.kill(0.15);
    v.area?.kill(0.2);
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
    const ward = !!st.lureRadius;
    const runes = new THREE.MeshBasicMaterial({ color: ward ? EVO_COLOR.earthen_ward : SPELL_COLOR.quake_totem, toneMapped: false });
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
    // Earthen Ward: anel do raio de atração e os golpes que aguenta
    const lure = ward ? this.groundRing(EVO_COLOR.earthen_ward, st.lureRadius!, a.x, a.z) : undefined;
    this.totems.push({ slot: i, st, x: a.x, z: a.z, time: st.duration ?? 1, tickLeft: st.tick ?? 1, age: 0, bob: 0, group, runes,
      hits: ward ? st.wardHits : undefined, lure, shake: 0,
      area: g.fx.lib.ring(a.x, a.z, { radius: st.radius, color: ward ? EVO_COLOR.earthen_ward : SPELL_COLOR.quake_totem, core: QUAKE_CORE, width: 0.22,
        from: 1, fill: 0.1, dust: 0, dur: Infinity, power: 0.4 }) });
    // M5-08: o totem rompe o chão, com pedras brotando em volta e poeira
    const lib = g.fx.lib;
    const tint = ward ? EVO_COLOR.earthen_ward : SPELL_COLOR.quake_totem;
    lib.spikes(a.x, a.z, { radius: 1.5, count: 8, height: 1, color: QUAKE_STONE, core: 0x2a160a, dur: 0.75 });
    lib.ring(a.x, a.z, { radius: 2.4, color: tint, core: QUAKE_CORE, width: 0.4, from: 0.2, dust: 8, dur: 0.35 });
    this.dustPuffs(a.x, a.z, 1.3, 4);
    g.fx.addShake(0.08);
    g.audio.play("tech");
    return true;
  }

  /** Poeira de pedra em volta de um ponto (Quake Totem). */
  private dustPuffs(x: number, z: number, r: number, n: number): void {
    const lib = this.game.fx.lib;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + Math.random() * 0.8;
      const d = r * (0.7 + 0.3 * Math.random());
      lib.smoke(x + Math.cos(a) * d, 0.35, z + Math.sin(a) * d, { radius: 0.9 + Math.random() * 0.5, color: QUAKE_DUST, alpha: 0.32,
        rise: 0.45, drift: [Math.cos(a) * 0.8, Math.sin(a) * 0.8], dur: 0.7 + Math.random() * 0.3 });
    }
  }

  /** techniques.lua `updateTotem`: bate a cada tique enquanto dura; com o Aftershock, chance de bater de novo. */
  private updateTotems(dt: number): void {
    const g = this.game;
    for (let k = this.totems.length - 1; k >= 0; k--) {
      const t = this.totems[k];
      t.time -= dt;
      t.age += dt;
      if (t.hits !== undefined && t.hits <= 0) {
        // Earthen Ward: o ídolo quebrou
        g.fx.burst(t.x, 1.2, t.z, QUAKE_STONE, 40, 7, 0.22, 0.7, 12);
        g.fx.lib.burst(t.x, 1.4, t.z, { radius: 1.4, color: EVO_COLOR.earthen_ward, core: QUAKE_CORE, rays: 0, sparks: 12, light: 1.6, dur: 0.3, wave: 0 });
        g.fx.lib.ring(t.x, t.z, { radius: 2, color: EVO_COLOR.earthen_ward, core: QUAKE_CORE, width: 0.4, dust: 8, dur: 0.35 });
        this.dustPuffs(t.x, t.z, 0.8, 5);
        g.fx.addShake(0.12);
        g.audio.play("hit");
        this.freeTotem(k);
        continue;
      }
      t.tickLeft -= dt;
      while (t.tickLeft <= 0 && t.time > -1e-6) {
        t.tickLeft += t.st.tick ?? 1;
        this.slam(t);
        if (t.st.doubleHit && Math.random() < t.st.doubleHit) this.slam(t);
      }
      if (t.time <= 0) {
        // afunda no chão levantando poeira
        this.dustPuffs(t.x, t.z, 0.7, 4);
        g.fx.burst(t.x, 0.6, t.z, QUAKE_STONE, 14, 4, 0.18, 0.5, 12);
        this.freeTotem(k);
        continue;
      }
      // sobe do chão, dá o tranco da batida e afunda no fim
      t.bob = Math.max(0, t.bob - dt * 5);
      const rise = Math.min(1, t.age / 0.22) * Math.min(1, t.time / 0.25);
      const b = t.bob;
      t.group.position.y = -2.2 * (1 - rise) + 0.25 * Math.sin(b * Math.PI);
      t.group.scale.set(1 + 0.1 * b, 1 - 0.12 * b, 1 + 0.1 * b);
      const color = t.hits !== undefined ? EVO_COLOR.earthen_ward : SPELL_COLOR.quake_totem;
      t.runes.color.setHex(color).multiplyScalar(0.45 + 0.55 * b + 0.1 * Math.sin(g.time * 6));
      if (t.lure) {
        // o ídolo treme quando apanha; o anel pulsa e marca quanto falta (golpes) no relógio
        t.shake = Math.max(0, t.shake - dt * 6);
        t.group.rotation.z = Math.sin(g.time * 60) * 0.06 * t.shake;
        this.drawRing(t.lure, t.x, t.z, t.st.lureRadius!, t.time, t.st.duration ?? 1, 0.5 + 0.5 * Math.sin(g.time * 5));
        t.lure.clock.geometry = clockGeo(t.hits! / (t.st.wardHits ?? 1));
        // o anel é grande (cobre boa parte da tela): só a borda aparece, o fundo quase some
        t.lure.disc.opacity *= 0.15;
        t.lure.edge.opacity *= 0.5;
        (t.lure.clock.material as THREE.MeshBasicMaterial).opacity = 0.3;
        // fios de atração até os inimigos puxados
        for (const e of g.enemies) {
          if (e.dead || this.wardFor(e) !== t || Math.random() > 0.25) continue;
          const u = Math.random();
          g.fx.glow(e.x + (t.x - e.x) * u, 0.5, e.z + (t.z - e.z) * u, EVO_COLOR.earthen_ward, 0.3, 0.3);
        }
      }
    }
  }

  /** techniques.lua `Tech.wardFor`: o ídolo de pé mais perto que atrai este inimigo (nunca chefe), ou null. */
  wardFor(e: Enemy): Totem | null {
    if (e.isBoss) return null;
    let best: Totem | null = null;
    let bestD2 = Infinity;
    for (const t of this.totems) {
      if (t.hits === undefined || t.hits <= 0) continue;
      const d2 = (e.x - t.x) ** 2 + (e.z - t.z) ** 2;
      if (d2 <= (t.st.lureRadius ?? 0) ** 2 && d2 < bestD2) [best, bestD2] = [t, d2];
    }
    return best;
  }

  /** ai.lua `melee`: o golpe que o inimigo dá no ídolo tira um dos `wardHits`. */
  hitWard(t: Totem): void {
    const g = this.game;
    if (t.hits === undefined) return;
    t.hits--;
    t.shake = 1;
    g.fx.burst(t.x, 1.2, t.z, QUAKE_STONE, 10, 4, 0.12, 0.35, 8);
    g.audio.play("hit");
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
    g.terrain.strike(t.x, t.z, r);
    for (const e of g.enemies) {
      if (e.dead) continue;
      const dx = e.x - t.x;
      const dz = e.z - t.z;
      if (dx * dx + dz * dz > (r + e.radius) ** 2) continue;
      g.spellHit(e, st.damage, true, schoolOf(st));
      if (e.dead || e.isBoss || e.champion) continue;
      const d = Math.hypot(dx, dz);
      e.kx += (d < 0.08 ? 1 : dx / d) * kb;
      e.kz += (d < 0.08 ? 0 : dz / d) * kb;
      if (st.stun) g.applyStatus(e, { kind: "stun", power: 1, duration: st.stun }, 0);
    }
    t.bob = 1;
    // M5-08: onda de terra até o raio, fendas em brasa, pedras que saltam do chão na área e poeira na borda
    const lib = g.fx.lib;
    const tint = t.hits !== undefined ? EVO_COLOR.earthen_ward : SPELL_COLOR.quake_totem;
    lib.ring(t.x, t.z, { radius: r, color: tint, core: QUAKE_CORE, width: 0.75, fill: 0.22, dust: 12, dur: 0.4 });
    lib.groundCrack(t.x, t.z, { radius: r * 0.8, count: 5, width: 0.34, scorch: 0.6, color: QUAKE_DEEP, core: tint, dur: 0.75 });
    lib.spikes(t.x, t.z, { radius: r * 0.9, count: 11, height: 1.35, color: QUAKE_STONE, core: 0x2a160a, dur: 0.5 });
    lib.burst(t.x, 0.3, t.z, { radius: 1.3, color: tint, core: QUAKE_CORE, rays: 0, sparks: 10, light: 1.8, dur: 0.25, wave: 0 });
    this.dustPuffs(t.x, t.z, r * 0.85, 5);
    g.fx.addShake(0.1);
    g.audio.play("hit");
  }

  private freeTotem(k: number): void {
    const t = this.totems[k];
    if (t.lure) freeGroup(t.lure.group);
    t.area?.kill(0.2);
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
    // Sanctuary (behaviors.lua `Evo.sanctuary`): só o anel que segue o herói, dourado e maior
    if (st.evolution === "sanctuary") {
      g.fx.shockwave(p.x, p.z, st.radius, EVO_COLOR.sanctuary, 0.5);
      g.fx.flashLight(p.x, 1.5, p.z, EVO_COLOR.sanctuary, 2, 0.35);
      g.audio.play("tech");
      return true;
    }
    const extra = Math.min(st.extraFields ?? 0, SPELL_CAST.fieldExtraCap - this.fields.filter((f) => !f.follow && f.slot >= 0).length);
    for (let n = 0; n < extra; n++) {
      const a = Math.random() * Math.PI * 2;
      const d = SPELL_CAST.fieldExtraDistance;
      this.fields.push(this.makeField(i, st, p.x + Math.cos(a) * d, p.z + Math.sin(a) * d, false));
    }
    g.audio.play("tech");
    return true;
  }

  /**
   * Sanctum (evolução do Aegis, techniques.lua `aegisBurst`): um Healing Field parado onde o escudo explodiu, com o
   * raio da explosão. Fica fora dos espaços de spell (`slot` -1), então relançar a spell não o apaga.
   */
  sanctumField(x: number, z: number, radius: number, duration: number): void {
    const st = {
      id: "healing_field", kind: "field", level: 1, milestones: [], levelScale: 1, damage: 0, cooldown: 0, cooldownMult: 1,
      range: 0, areaMult: 1, radius, duration, tick: TECH_EVO.sanctumTick, heal: TECH_EVO.sanctumHeal, surge: 0,
    } as unknown as SpellStats;
    this.fields.push(this.makeField(-1, st, x, z, false));
    this.game.fx.shockwave(x, z, radius, SPELL_COLOR.healing_field, 0.45);
  }

  private makeField(slot: number, st: SpellStats, x: number, z: number, follow: boolean): Field {
    const g = this.game;
    const color = st.evolution === "sanctuary" ? EVO_COLOR.sanctuary : SPELL_COLOR.healing_field;
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
    const lib = g.fx.lib;
    const motes = lib.orbit(x, 0.6, z, { radius: st.radius * 0.72, count: 4, color, core: HEAL_CORE, speed: 0.3, tilt: 0.06, size: 0.24,
      bob: 0.35, dur: Infinity, power: 0.75 });
    lib.ring(x, z, { radius: st.radius, color, core: HEAL_CORE, width: 0.45, from: 0.3, fill: 0.15, dust: 0, dur: 0.45 });
    lib.burst(x, 0.6, z, { radius: 1.1, color, core: HEAL_CORE, rays: 0, sparks: 8, light: 1.2, dur: 0.3, wave: 0 });
    return { slot, st, x, z, follow, time: dur, duration: dur, tickLeft: st.tick ?? 1, pulse: 0, group, disc, edge, clock, spin, motes };
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
        if (f.st.fieldDamage) this.sanctuaryBurn(f);
        if (!g.playerAlive || (p.x - f.x) ** 2 + (p.z - f.z) ** 2 > f.st.radius ** 2) continue;
        let amount = f.st.heal ?? 0;
        if (f.st.surge && Math.random() < f.st.surge) amount += 1 / DR_BASE_HP;
        g.heal(g.stats.maxHp * amount, true);
        f.pulse = 1;
        // M5-08: coluna de luz suave subindo pelo herói a cada cura
        const c = f.st.evolution === "sanctuary" ? EVO_COLOR.sanctuary : SPELL_COLOR.healing_field;
        g.fx.lib.pillar(p.x, p.z, { radius: 0.6, height: 3, color: c, core: HEAL_CORE, speed: 3, dur: 0.6, power: 0.9 });
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
      f.motes.move(f.x, 0.6, f.z);
      f.motes.power = 0.75 * born * ending;
      // pétalas de luz subindo devagar dentro do anel
      if (Math.random() < dt * 16 * born) {
        const a = Math.random() * Math.PI * 2;
        const d = f.st.radius * 0.9 * Math.sqrt(Math.random());
        g.fx.glow(f.x + Math.cos(a) * d, 0.1, f.z + Math.sin(a) * d, Math.random() < 0.35 ? HEAL_CORE : f.edge.color.getHex(),
          0.22, 1.1, 0, 1.1, 0, 0);
      }
    }
  }

  /** Sanctuary (D-318, D-414): o anel dourado fere quem está dentro, e um pilar de luz cai em cada um, um pouco depois. */
  private sanctuaryBurn(f: Field): void {
    const g = this.game;
    let n = 0;
    for (const e of this.inArea(f.x, f.z, f.st.radius)) {
      if (e.dead) continue;
      g.spellHit(e, f.st.fieldDamage ?? 0, true, schoolOf(f.st));
      const x = e.x;
      const z = e.z;
      const delay = (n++ % 5) * 40;
      setTimeout(() => {
        for (let h = 0; h < 5; h++) g.fx.glow(x, 0.3 + h * 0.6, z, h < 2 ? EVO_COLOR.sanctuary : 0xfff2c0, 0.9 - h * 0.1, 0.35, 0, 2, 0);
        g.fx.burst(x, 0.3, z, EVO_COLOR.sanctuary, 6, 2.5, 0.1, 0.4, -4);
      }, delay);
    }
  }

  private freeField(k: number): void {
    const f = this.fields[k];
    f.motes.kill(0.2);
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
    const storm = st.evolution === "blade_storm";
    const steel = new THREE.MeshBasicMaterial({ color: storm ? EVO_COLOR.blade_storm : 0xe8eef8, toneMapped: false });
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
    const clock = new THREE.Mesh(clockGeo(1), groundMat(storm ? EVO_COLOR.blade_storm : SPELL_COLOR.blade_orbit, storm ? 0.22 : 0.08));
    clock.position.y = 0.04;
    group.add(clock);
    g.scene.add(group);
    if (storm) g.fx.shockwave(g.player.x, g.player.z, st.radius, EVO_COLOR.blade_storm, 0.35);
    // M5-08: fio de luz atrás de cada lâmina e um corte em anel ao lançar
    const lib = g.fx.lib;
    const tint = storm ? EVO_COLOR.blade_storm : BLADE_STEEL;
    const trails = blades.map(() => lib.trail({ color: tint, core: BLADE_CORE, width: 0.85, life: 0.3, head: 0, sheds: 6 }));
    const p = g.player;
    lib.ring(p.x, p.z, { radius: st.radius, color: tint, core: BLADE_CORE, width: 0.22, from: 0.35, dust: 0, dur: 0.28, power: 0.8 });
    lib.burst(p.x, 1, p.z, { radius: 0.9, color: tint, core: BLADE_CORE, rays: 4, sparks: 8, light: 0.8, dur: 0.2, wave: 0 });
    this.orbits.push({ slot: i, st, time: dur, duration: dur, angle: 0, spin, hitCooldown: (st.hitCooldown ?? 0.5) / spin,
      lastHit: new WeakMap(), group, blades, clock, trails });
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
        // cada lâmina se desfaz em faíscas onde está
        for (const b of o.blades) {
          g.fx.lib.burst(p.x + b.position.x, b.position.y, p.z + b.position.z, { radius: 0.5, color: BLADE_STEEL, core: BLADE_CORE, rays: 0,
            sparks: 5, light: 0, dur: 0.18, wave: 0 });
        }
        this.freeOrbit(k);
        continue;
      }
      o.angle += dt * SPELL_CAST.orbitSpin * o.spin;
      // Blade Storm: o círculo abre do raio até `maxRadius` durante o giro (techniques.lua `curRadius`)
      const opened = 1 - o.time / o.duration;
      const r = o.st.maxRadius !== undefined ? o.st.radius + (o.st.maxRadius - o.st.radius) * opened : o.st.radius;
      if (o.st.maxRadius !== undefined && Math.random() < 0.7) {
        // rastro de vento no círculo, girando junto
        const a = Math.random() * Math.PI * 2;
        const t = Math.cos(a) * r;
        const u = Math.sin(a) * r;
        const v = SPELL_CAST.orbitSpin * o.spin * r * 0.5;
        g.fx.glow(p.x + t, 0.9 + Math.random() * 0.4, p.z + u, EVO_COLOR.blade_storm, 0.45, 0.3, -Math.sin(a) * v, 0, Math.cos(a) * v);
      }
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
        blade.scale.setScalar(3 * grow);
        // o rastro segue a ponta da lâmina, um pouco além do centro do giro
        const tip = 1 + 0.35 / Math.max(0.5, r);
        o.trails[b].power = grow;
        o.trails[b].push(p.x + bx * tip, blade.position.y, p.z + bz * tip);
        for (const e of g.enemies) {
          if (e.dead) continue;
          if ((e.x - p.x - bx) ** 2 + (e.z - p.z - bz) ** 2 > (hit + e.radius) ** 2) continue;
          const last = o.lastHit.get(e);
          if (last !== undefined && g.time - last < o.hitCooldown) continue;
          o.lastHit.set(e, g.time);
          g.spellHit(e, o.st.damage, false, schoolOf(o.st));
          g.fx.lib.burst(e.x, 1, e.z, { radius: 0.7, color: BLADE_STEEL, core: BLADE_CORE, rays: 3, sparks: 6, light: 0, dur: 0.14, wave: 0 });
        }
      }
      o.clock.scale.setScalar(r);
      o.clock.geometry = clockGeo(o.time / o.duration);
    }
  }

  private freeOrbit(k: number): void {
    for (const t of this.orbits[k].trails) t.kill(0.12);
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
    const glyph = new THREE.MeshBasicMaterial({ map: runeTexture(), color: st.linkRange ? EVO_COLOR.rune_circle : SPELL_COLOR.rune_traps, transparent: true,
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
    this.runes.push({ slot: i, st, x: p.x, z: p.z, time: dur, duration: dur, group, glyph, clock, flash: 0 });
    // M5-08: a runa é gravada no chão com um anel que fecha e poucas fagulhas
    const lib = g.fx.lib;
    const tint = st.linkRange ? EVO_COLOR.rune_circle : SPELL_COLOR.rune_traps;
    lib.ring(p.x, p.z, { radius: (st.trigger ?? 1) + 0.45, color: tint, core: RUNE_CORE, width: 0.16, from: 0.3, dust: 0, dur: 0.28, power: 0.7 });
    lib.burst(p.x, 0.2, p.z, { radius: 0.6, color: tint, core: RUNE_CORE, rays: 0, sparks: 4, light: 0, dur: 0.18, wave: 0 });
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
      if (armed && !r.armed) {
        // armou: o desenho acende de uma vez e solta um anel curto
        r.armed = true;
        r.flash = 1;
        const tint = r.st.linkRange ? EVO_COLOR.rune_circle : SPELL_COLOR.rune_traps;
        g.fx.lib.ring(r.x, r.z, { radius: (r.st.trigger ?? 1) + 0.9, color: tint, core: RUNE_CORE, width: 0.14, from: 0.6, dust: 0, dur: 0.3, power: 0.6 });
      }
      r.flash = Math.max(0, r.flash - dt * 4);
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
      r.glyph.opacity = Math.min(1, (armed ? 0.7 + 0.15 * Math.sin(g.time * 3 + r.x) : 0.3) * ending + 0.5 * r.flash);
      r.clock.geometry = clockGeo(r.time / r.duration);
    }
    this.updateRuneLines(dt);
  }

  /** techniques.lua `runeLinks` (Rune Circle): cada runa do espaço às duas mais perto até `linkRange`, cada par uma vez. */
  private runeLinks(slot: number): [Rune, Rune][] {
    const mine = this.runes.filter((r) => r.slot === slot && r.fade === undefined && r.st.linkRange);
    const links: [Rune, Rune][] = [];
    const seen = new Set<number>();
    mine.forEach((a, i) => {
      const range2 = (a.st.linkRange ?? 0) ** 2;
      const near = mine
        .map((b, j) => ({ j, d2: (a.x - b.x) ** 2 + (a.z - b.z) ** 2 }))
        .filter((n) => n.j !== i && n.d2 <= range2)
        .sort((u, v) => u.d2 - v.d2)
        .slice(0, 2);
      for (const { j } of near) {
        const key = Math.min(i, j) * 1000 + Math.max(i, j);
        if (seen.has(key)) continue;
        seen.add(key);
        links.push([a, mine[j]]);
      }
    });
    return links;
  }

  /**
   * techniques.lua `updateRuneLines`: a cada `lineTick` as linhas do espaço ferem quem está nelas (uma vez por inimigo
   * por tique, mesmo em cima de várias). As linhas são faixas de luz no chão, refeitas a cada quadro.
   */
  private updateRuneLines(dt: number): void {
    const g = this.game;
    let used = 0;
    const slots = new Map<number, SpellStats>();
    for (const r of this.runes) if (r.st.linkRange && r.fade === undefined) slots.set(r.slot, r.st);
    for (const slot of [...this.runeTicks.keys()]) if (!slots.has(slot)) this.runeTicks.delete(slot);
    for (const [slot, st] of slots) {
      const links = this.runeLinks(slot);
      let left = (this.runeTicks.get(slot) ?? st.lineTick ?? 0.4) - dt;
      const tick = left <= 0;
      if (tick) left += st.lineTick ?? 0.4;
      this.runeTicks.set(slot, left);
      const hit = new Set<Enemy>();
      const hw = (st.lineWidth ?? 0.2) / 2;
      for (const [a, b] of links) {
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len = Math.hypot(dx, dz);
        if (len < 0.05) continue;
        if (tick) {
          for (const e of this.inSegment(a.x, a.z, dx / len, dz / len, 0, len, hw, hit)) {
            g.spellHit(e, st.lineDamage ?? 0, true, schoolOf(st));
            g.fx.spark(e.x, 0.8, e.z, EVO_COLOR.rune_circle, 0.1, 0.25, 1);
          }
        }
        // desenho: faixa de luz que pulsa, mais forte no tique
        let m = this.lines[used];
        if (!m) {
          m = new THREE.Mesh(BEAM_GEO, new THREE.MeshBasicMaterial({ color: EVO_COLOR.rune_circle, transparent: true,
            depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
          m.renderOrder = 2;
          this.lines.push(m);
        }
        used++;
        if (!m.parent) g.scene.add(m);
        m.position.set(a.x, 0.07, a.z);
        m.rotation.set(0, Math.atan2(dx, dz), 0);
        m.scale.set(Math.max(0.12, hw * 2) * (0.8 + 0.2 * Math.sin(g.time * 7 + a.x)), 1, len);
        (m.material as THREE.MeshBasicMaterial).opacity = tick ? 1 : 0.55 + 0.15 * Math.sin(g.time * 4 + a.z);
        if (Math.random() < 0.15) {
          const t = Math.random();
          g.fx.glow(a.x + dx * t, 0.15, a.z + dz * t, EVO_COLOR.rune_circle, 0.35, 0.4, 0, 0.8, 0);
        }
      }
    }
    for (let k = used; k < this.lines.length; k++) this.lines[k].removeFromParent();
  }

  /** há runa no chão (o ataque básico só procura runa quando há) */
  get hasRunes(): boolean {
    return this.runes.length > 0;
  }

  /**
   * techniques.lua `shootRunes` (D-575): o ataque básico que passa por uma runa armada estoura a runa de longe. `hits`
   * diz se o golpe ou o tiro cobre a runa (recebe o centro e o raio do gatilho). As runas nos pés do herói ficam.
   */
  shootRunes(hits: (x: number, z: number, trigger: number) => boolean): void {
    const p = this.game.player;
    for (let k = this.runes.length - 1; k >= 0; k--) {
      const r = this.runes[k];
      if (r.fade !== undefined || r.duration - r.time < (r.st.arm ?? 0)) continue;
      const trigger = r.st.trigger ?? 1;
      const clear = trigger + SPELL_CAST.runeShotClear;
      if ((r.x - p.x) ** 2 + (r.z - p.z) ** 2 <= clear * clear || !hits(r.x, r.z, trigger)) continue;
      this.detonate(r);
      this.freeRune(k);
    }
  }

  /** techniques.lua `detonate`: dano no raio e prende no lugar quem não é chefe; Twin Glyph: chance de bater de novo. */
  private detonate(r: Rune): void {
    const g = this.game;
    const st = r.st;
    const blast = () => {
      g.terrain.strike(r.x, r.z, st.radius);
      for (const e of g.enemies) {
        if (e.dead || (e.x - r.x) ** 2 + (e.z - r.z) ** 2 > (st.radius + e.radius) ** 2) continue;
        g.spellHit(e, st.damage, true, schoolOf(st));
        if (!e.dead && !e.isBoss && st.root) g.applyStatus(e, { kind: "stun", power: 1, duration: st.root }, 0);
      }
    };
    blast();
    const twice = !!st.doubleHit && Math.random() < st.doubleHit;
    if (twice) blast();
    // M5-08: coluna de luz violeta sobe da runa, a onda vai até o raio e um selo gira no chão; Twin Glyph bate de novo em branco
    const lib = g.fx.lib;
    const c = st.linkRange ? EVO_COLOR.rune_circle : SPELL_COLOR.rune_traps;
    lib.pillar(r.x, r.z, { radius: 1.1, height: 5, color: c, core: RUNE_CORE, speed: 7, dur: 0.6 });
    lib.ring(r.x, r.z, { radius: st.radius, color: c, core: RUNE_CORE, width: 0.45, from: 0.1, fill: 0.12, dust: 8, dur: 0.4 });
    lib.burst(r.x, 0.6, r.z, { radius: 1.3, color: c, core: RUNE_CORE, rays: 6, sparks: 12, light: 0, dur: 0.3 });
    lib.orbit(r.x, 0.3, r.z, { radius: st.radius * 0.5, count: 4, color: c, core: RUNE_CORE, speed: -1.4, tilt: 0, size: 0.3, bob: 0.05, dur: 0.4 });
    if (twice) {
      this.later(0.14, () => lib.ring(r.x, r.z, { radius: st.radius * 0.8, color: RUNE_CORE, core: 0xffffff, width: 0.4, from: 0.1, dust: 0, dur: 0.3 }));
    }
    g.audio.play("hit");
  }

  private freeRune(k: number): void {
    freeGroup(this.runes[k].group);
    this.runes.splice(k, 1);
  }

  // ---------------------------------------------------------------- evoluções (M6-10)
  /** behaviors.lua `B.areaHit`: quem está no raio, contando o tamanho do inimigo; a lista é tirada antes de ferir. */
  private inArea(x: number, z: number, r: number): Enemy[] {
    return this.game.enemies.filter((e) => !e.dead && (e.x - x) ** 2 + (e.z - z) ** 2 <= (r + e.radius) ** 2);
  }

  /** behaviors.lua `B.segmentHit`: quem cruza o trecho [from, to] da reta, com meia largura `hw`. */
  private inSegment(x0: number, z0: number, dx: number, dz: number, from: number, to: number, hw: number, already?: Set<Enemy>): Enemy[] {
    const out: Enemy[] = [];
    for (const e of this.game.enemies) {
      if (e.dead || already?.has(e)) continue;
      const ex = e.x - x0;
      const ez = e.z - z0;
      const t = ex * dx + ez * dz;
      if (t < from - e.radius || t > to + e.radius) continue;
      if (Math.hypot(ex - dx * t, ez - dz * t) > hw + e.radius) continue;
      out.push(e);
    }
    for (const e of out) already?.add(e);
    return out;
  }

  private groundRing(color: number, radius: number, x: number, z: number): GroundRing {
    const group = new THREE.Group();
    const disc = groundMat(color, 0.1);
    const edge = groundMat(color, 0.6);
    const d = new THREE.Mesh(DISC_GEO, disc);
    d.position.y = 0.03;
    const e = new THREE.Mesh(EDGE_GEO, edge);
    e.position.y = 0.04;
    const clock = new THREE.Mesh(clockGeo(1), groundMat(0xffffff, 0.8));
    clock.position.y = 0.05;
    clock.scale.setScalar(0.9);
    group.add(d, e, clock);
    group.scale.setScalar(radius);
    group.position.set(x, 0, z);
    this.game.scene.add(group);
    return { group, disc, edge, clock };
  }

  /** Relógio, pulso e piscar do último segundo de um anel no chão. */
  private drawRing(r: GroundRing, x: number, z: number, radius: number, time: number, duration: number, pulse: number): void {
    const g = this.game;
    const born = Math.min(1, (duration - time) / 0.25);
    const ending = time < 1 ? 0.55 + 0.45 * Math.abs(Math.cos(g.time * 9)) : 1;
    r.group.position.set(x, 0, z);
    r.group.scale.setScalar(radius * (0.6 + 0.4 * born) * (1 + 0.05 * pulse));
    r.disc.opacity = (0.1 + 0.16 * pulse) * born * ending;
    r.edge.opacity = (0.5 + 0.4 * pulse) * born * ending;
    r.clock.geometry = clockGeo(Math.max(0, time / duration));
  }

  /**
   * behaviors.lua `Evo.firestorm` (D-396): aura de fogo que segue o herói; relançar renova a que está acesa. O primeiro
   * tique sai com o lançamento; cada lançamento queima uma vez por inimigo. Lá só saía com inimigo perto; aqui sai sempre (D15).
   */
  private castFirestorm(i: number, st: SpellStats): boolean {
    const g = this.game;
    const p = g.player;
    const dur = st.duration ?? 1;
    const cur = this.auras.find((a) => a.slot === i);
    if (cur) Object.assign(cur, { st, time: dur, duration: dur, burned: new Set<Enemy>(), pulse: 1 });
    else this.auras.push({ slot: i, st, time: dur, duration: dur, tickLeft: 0, burned: new Set(), pulse: 1,
      ring: this.groundRing(EVO_COLOR.firestorm, st.radius, p.x, p.z) });
    g.fx.shockwave(p.x, p.z, st.radius, EVO_COLOR.firestorm, 0.4);
    g.fx.flashLight(p.x, 1.4, p.z, EVO_COLOR.firestorm, 2.4, 0.3);
    g.audio.play("tech");
    return true;
  }

  private updateAuras(dt: number): void {
    const g = this.game;
    const p = g.player;
    for (let k = this.auras.length - 1; k >= 0; k--) {
      const a = this.auras[k];
      a.time -= dt;
      a.tickLeft -= dt;
      while (a.tickLeft <= 0 && a.time > 0) {
        a.tickLeft += a.st.tick ?? 1;
        a.pulse = 1;
        for (const e of this.inArea(p.x, p.z, a.st.radius)) {
          if (!a.burned.has(e)) {
            a.burned.add(e);
            this.applyBurn(e, a.st, a.slot);
          }
          g.spellHit(e, a.st.tickDamage ?? 0, false, schoolOf(a.st));
          if (!e.dead) g.fx.burst(e.x, 0.6, e.z, EVO_COLOR.firestorm, 5, 3, 0.1, 0.35, -3);
        }
      }
      if (a.time <= 0 || !g.playerAlive) {
        freeGroup(a.ring.group);
        this.auras.splice(k, 1);
        continue;
      }
      a.pulse = Math.max(0, a.pulse - dt * 3);
      this.drawRing(a.ring, p.x, p.z, a.st.radius, a.time, a.duration, a.pulse);
      // brasas subindo dentro da aura
      for (let f = 0; f < 3; f++) {
        const ang = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * a.st.radius;
        g.fx.spark(p.x + Math.cos(ang) * r, 0.15, p.z + Math.sin(ang) * r, Math.random() < 0.5 ? 0xffb347 : EVO_COLOR.firestorm, 0.12, 0.7, 1.6);
      }
      // anel de chamas na borda (D-408), mais forte no pulso
      const n = 3 + Math.round(a.pulse * 6);
      for (let f = 0; f < n; f++) {
        const ang = Math.random() * Math.PI * 2;
        const r = a.st.radius * (0.8 + Math.random() * 0.2);
        g.fx.glow(p.x + Math.cos(ang) * r, 0.25, p.z + Math.sin(ang) * r, Math.random() < 0.3 ? 0xffd27a : EVO_COLOR.firestorm,
          0.7 + Math.random() * 0.5, 0.45, 0, 2.2 + Math.random() * 1.5, 0);
      }
    }
  }

  /** behaviors.lua `Evo.firewave`: muralha de fogo na direção do mouse, varre o comprimento em 0,3 s. */
  private castFirewave(i: number, st: SpellStats): boolean {
    const g = this.game;
    const p = g.player;
    const { dx, dz } = this.aimDir();
    const mat = new THREE.MeshBasicMaterial({ map: firewaveTexture(), transparent: true, opacity: 0.9, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(BEAM_GEO, mat);
    mesh.position.set(p.x, 0.06, p.z);
    mesh.rotation.y = Math.atan2(dx, dz);
    mesh.scale.set(st.width ?? 1, 1, 0.001);
    mesh.renderOrder = 3;
    g.scene.add(mesh);
    this.walls.push({ slot: i, st, x: p.x, z: p.z, dx, dz, t: 0, done: 0, hit: new Set(), mesh });
    p.facing = Math.atan2(dx, dz);
    g.audio.play("tech");
    g.fx.flashLight(p.x + dx, 1.2, p.z + dz, EVO_COLOR.firewave, 2.2, 0.3);
    return true;
  }

  private updateWalls(dt: number): void {
    const g = this.game;
    const sweep = SPELL_CAST.wallSweepTime;
    const life = sweep + SPELL_CAST.firewaveLinger;
    for (let k = this.walls.length - 1; k >= 0; k--) {
      const w = this.walls[k];
      w.t += dt;
      const len = w.st.length ?? 0;
      const hw = (w.st.width ?? 0) / 2;
      const reach = Math.min(len, (w.t / sweep) * len);
      if (reach > w.done) {
        for (const e of this.inSegment(w.x, w.z, w.dx, w.dz, 0, reach, hw, w.hit)) {
          this.applyBurn(e, w.st, w.slot);
          g.spellHit(e, w.st.damage, false, schoolOf(w.st));
        }
        // a frente da muralha: colunas de fogo ao longo da largura
        for (let c = 0; c < 6; c++) {
          const s = (Math.random() - 0.5) * 2 * hw;
          g.fx.glow(w.x + w.dx * reach - w.dz * s, 0.4, w.z + w.dz * reach + w.dx * s,
            Math.random() < 0.35 ? 0xffd27a : EVO_COLOR.firewave, 1 + Math.random() * 0.6, 0.5, 0, 3 + Math.random() * 2, 0);
        }
        w.done = reach;
      } else if (Math.random() < 0.7) {
        // depois da varredura, as últimas chamas se apagam ao longo da faixa
        const s = (Math.random() - 0.5) * 2 * hw;
        const t = Math.random() * len;
        g.fx.glow(w.x + w.dx * t - w.dz * s, 0.3, w.z + w.dz * t + w.dx * s, EVO_COLOR.firewave, 0.6, 0.4, 0, 1.6, 0);
      }
      const m = w.mesh.material as THREE.MeshBasicMaterial;
      w.mesh.scale.z = Math.max(0.001, reach);
      m.opacity = 0.9 * (w.t < sweep ? 1 : Math.max(0, 1 - (w.t - sweep) / SPELL_CAST.firewaveLinger));
      if (w.t >= life) {
        w.mesh.removeFromParent();
        m.dispose();
        this.walls.splice(k, 1);
      }
    }
  }

  /** behaviors.lua `Evo.blizzard`: tempestade parada na mira (até o alcance); fere e deixa lento a cada tique. */
  private castBlizzard(i: number, st: SpellStats): boolean {
    const g = this.game;
    const at = g.aimPoint(st.range);
    const dur = st.duration ?? 1;
    this.storms.push({ slot: i, st, x: at.x, z: at.z, time: dur, duration: dur, tickLeft: 0, pulse: 1,
      ring: this.groundRing(EVO_COLOR.blizzard, st.radius, at.x, at.z) });
    g.fx.shockwave(at.x, at.z, st.radius, EVO_COLOR.blizzard, 0.45);
    g.audio.play("tech");
    return true;
  }

  private updateStorms(dt: number): void {
    const g = this.game;
    for (let k = this.storms.length - 1; k >= 0; k--) {
      const s = this.storms[k];
      s.time -= dt;
      s.tickLeft -= dt;
      while (s.tickLeft <= 0 && s.time > 0) {
        s.tickLeft += s.st.tick ?? 1;
        s.pulse = 1;
        for (const e of this.inArea(s.x, s.z, s.st.radius)) {
          g.spellHit(e, s.st.tickDamage ?? 0, true, schoolOf(s.st));
          if (!e.dead) {
            this.applySlow(e, s.st.slow ?? 0, s.st.slowDuration ?? 0, true);
            g.fx.burst(e.x, 0.8, e.z, 0xeaf8ff, 5, 3, 0.1, 0.35, 4);
          }
        }
      }
      if (s.time <= 0) {
        freeGroup(s.ring.group);
        this.storms.splice(k, 1);
        continue;
      }
      s.pulse = Math.max(0, s.pulse - dt * 3);
      this.drawRing(s.ring, s.x, s.z, s.st.radius, s.time, s.duration, s.pulse);
      // neve caindo em diagonal dentro do círculo, e rajadas no chão
      for (let f = 0; f < 4; f++) {
        const ang = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * s.st.radius;
        g.fx.glow(s.x + Math.cos(ang) * r - 1, 3.5 + Math.random(), s.z + Math.sin(ang) * r,
          Math.random() < 0.5 ? 0xffffff : EVO_COLOR.blizzard, 0.35, 0.7, 1.4, -5, 0);
      }
      if (Math.random() < 0.4) {
        const ang = Math.random() * Math.PI * 2;
        const r = Math.random() * s.st.radius;
        g.fx.spark(s.x + Math.cos(ang) * r, 0.2, s.z + Math.sin(ang) * r, 0xe6f6ff, 0.14, 0.5, 0.4);
      }
    }
  }

  /** behaviors.lua `Evo.lightning_strike`: raio reto na mira; Static Field pode ferir cada alvo duas vezes (D-437). */
  private castStrike(st: SpellStats): boolean {
    const g = this.game;
    const p = g.player;
    const { dx, dz } = this.aimDir();
    const len = st.length ?? 0;
    const hits = this.inSegment(p.x, p.z, dx, dz, 0, len, (st.width ?? 0) / 2);
    for (const e of hits) {
      g.spellHit(e, st.damage, false, schoolOf(st));
      if (st.doubleHit && !e.dead && Math.random() < st.doubleHit) g.spellHit(e, st.damage, false, schoolOf(st));
    }
    p.facing = Math.atan2(dx, dz);
    const x1 = p.x + dx * len;
    const z1 = p.z + dz * len;
    this.arc(p.x + dx * 0.6, p.z + dz * 0.6, x1, z1, 2);
    this.arc(p.x + dx * 0.6, p.z + dz * 0.6, x1, z1, 0);
    g.fx.streak(p.x, p.z, x1, z1, st.width ?? 0.5, 0xfff6c0, 0.18);
    for (const e of hits) g.fx.burst(e.x, 0.3, e.z, EVO_COLOR.lightning_strike, 10, 5, 0.1, 0.35, 6);
    g.fx.flashLight((p.x + x1) / 2, 2, (p.z + z1) / 2, 0xfff0a0, 3, 0.25);
    g.fx.addShake(0.16);
    g.audio.play("tech");
    return true;
  }

  /** algum Arcane Strike pronto: o próximo ataque básico sai carregado (auto_attack.lua, D-215) */
  get arcaneReady(): boolean {
    return this.stats.some((st, i) => st?.evolution === "arcane_strike" && this.cooldown[i] <= 0);
  }

  /** behaviors.lua `Evo.arcane_strike.onAutoHit`: com a recarga pronta, o golpe do ataque básico explode e gasta a recarga. */
  onAutoHit(target: Enemy): void {
    const g = this.game;
    this.stats.forEach((st, i) => {
      if (st?.evolution !== "arcane_strike" || this.cooldown[i] > 0) return;
      const x = target.x;
      const z = target.z;
      this.cooldown[i] = st.cooldown;
      g.terrain.strike(x, z, st.radius);
      for (const e of this.inArea(x, z, st.radius)) g.spellHit(e, st.damage, false, schoolOf(st));
      g.fx.shockwave(x, z, st.radius, EVO_COLOR.arcane_strike, 0.4);
      g.fx.streak(x - st.radius * 0.7, z, x + st.radius * 0.7, z, 0.18, 0xe6d2ff, 0.3);
      g.fx.streak(x, z - st.radius * 0.7, x, z + st.radius * 0.7, 0.18, 0xe6d2ff, 0.3);
      g.fx.burst(x, 0.9, z, EVO_COLOR.arcane_strike, 26, 7, 0.14, 0.5, 2);
      g.fx.flashLight(x, 1.3, z, EVO_COLOR.arcane_strike, 2.4, 0.25);
      g.fx.addShake(0.1);
    });
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
          // o primeiro salto sai da mão do herói: o dardo leva um ou dois quadros e o que se lê é o raio saindo dele
          if (target) this.chainFrom(pr.st, target, g.player.x + pr.dx * 0.6, g.player.z + pr.dz * 0.6);
          else g.fx.lib.burst(pr.x, SPELL_CAST.height, pr.z, { radius: 0.6, color: BOLT_BODY, core: BOLT_CORE, rays: 4, sparks: 5, dur: 0.18 }); // errou: apaga
        } else this.impact(pr);
        this.free(pr);
        this.shots.splice(k, 1);
      } else {
        pr.mesh.position.set(pr.x, SPELL_CAST.height, pr.z);
        if (pr.zap) {
          const p = g.player;
          pr.zap.set(p.x + pr.dx * 0.6, ARC_Y, p.z + pr.dz * 0.6, pr.x, ARC_Y, pr.z);
          continue;
        }
        if (pr.trail) {
          pr.trail.push(pr.x, SPELL_CAST.height, pr.z);
          pr.motes?.move(pr.x, SPELL_CAST.height, pr.z);
          this.flightFx(pr, dt);
          continue;
        }
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
    g.terrain.strike(pr.x, pr.z, r);
    for (const e of g.enemies) {
      if (e.dead) continue;
      if ((e.x - pr.x) ** 2 + (e.z - pr.z) ** 2 > (r + e.radius) ** 2) continue;
      if (st.id === "fireball") this.applyBurn(e, st, pr.slot);
      g.spellHit(e, st.damage, false, schoolOf(st));
      if (st.id === "iceball" && !e.dead) this.applySlow(e, st.slow ?? 0, st.slowDuration ?? 0, true);
    }
    if (st.id === "arcane_bolt") {
      this.arcaneImpact(pr.x, pr.z, r);
      return;
    }
    if (st.id === "fireball") {
      this.fireImpact(pr.x, pr.z, r);
      return;
    }
    if (st.id === "iceball") this.iceImpact(pr.x, pr.z, r);
  }

  /** status.lua `applyBurn`: não acumula; fica o maior dano por segundo e a maior duração; lembra o espaço (Volátil). */
  private applyBurn(e: Enemy, st: SpellStats, slot: number): void {
    const g = this.game;
    const dps = g.stats.damage * (st.burnDps ?? 0);
    e.applyBurn(g.time, dps, st.burnDuration ?? 0, "fireball", slot);
  }

  /** status.lua `applySlow`: não acumula; chefes levam 20% (ou até o teto da Frostine). */
  private applySlow(e: Enemy, amount: number, duration: number, ice = false): void {
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
    if (ice) e.chillUntil = Math.max(e.chillUntil, now + duration); // M21-05: gelado (Estilhaço)
  }

  /** spell_system.lua `onKill` (S17, Volátil): inimigo queimando pelo Fireball pode explodir ao morrer. */
  onKill(e: Enemy): void {
    const g = this.game;
    this.plagueSpread(e);
    const burn = e.dots.find((d) => d.spell === "fireball" && d.until > g.time);
    if (!burn || burn.slot === undefined) return;
    const st = this.stats[burn.slot];
    if (!st || st.id !== "fireball" || !st.volatile || Math.random() >= st.volatile) return;
    const r = SPELL_CAST.volatileRadius;
    const x = e.x;
    const z = e.z;
    for (const o of g.enemies) {
      if (o.dead || o === e) continue;
      if ((o.x - x) ** 2 + (o.z - z) ** 2 <= (r + o.radius) ** 2) g.spellHit(o, st.damage * SPELL_CAST.volatileFraction, false, schoolOf(st));
    }
    g.fx.shockwave(x, z, r, 0xff5a1a, 0.35);
    g.fx.burst(x, 0.8, z, 0xff8a2a, 26, 7, 0.15, 0.5, -2);
    g.fx.text(x, 2.4, z, "Volatile", "burn");
  }

  private free(pr: SpellProjectile): void {
    pr.mesh.removeFromParent();
    pr.trail?.kill();
    pr.motes?.kill(0.08);
    pr.zap?.kill(0.06);
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
    for (const f of this.flights) {
      f.trail.kill(0);
      f.from.add(f.obj);
    }
    for (const grp of new Set(this.flights.map((f) => f.from))) freeGroup(grp);
    this.flights.length = 0;
    this.spikeCd.fill(0);
    for (const m of this.lines) m.removeFromParent();
    this.runeTicks.clear();
    for (const a of this.auras) freeGroup(a.ring.group);
    this.auras.length = 0;
    for (const s of this.storms) freeGroup(s.ring.group);
    this.storms.length = 0;
    for (const w of this.walls) {
      w.mesh.removeFromParent();
      (w.mesh.material as THREE.Material).dispose();
    }
    this.walls.length = 0;
    this.pending.length = 0;
    this.delayed.length = 0;
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
      ...[...this.vortices, ...this.totems, ...this.fields, ...this.runes, ...this.storms].map((o) => ({ id: o.st.id, x: +o.x.toFixed(2),
        z: +o.z.toFixed(2), remaining: +o.time.toFixed(2) })),
      ...this.orbits.map((o) => ({ id: o.st.id, x: 0, z: 0, remaining: +o.time.toFixed(2) })),
      ...this.auras.map((a) => ({ id: a.st.evolution ?? a.st.id, x: 0, z: 0, remaining: +a.time.toFixed(2) })),
      ...this.walls.map((w) => ({ id: w.st.evolution ?? w.st.id, x: +w.x.toFixed(2), z: +w.z.toFixed(2), remaining: +w.done.toFixed(2) })),
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
