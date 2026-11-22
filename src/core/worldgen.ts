// Geração procedural de uma zona: caminho, os 5 trechos (um por onda; o 5º é a arena do chefe) e obstáculos.
// Lógica pura (sem three.js): o mesmo seed gera sempre o mesmo mapa.
import { Rng } from "./rng";
import { TUNING } from "../data/tuning";
import { pacedClearing } from "./pace";
import { TERRAIN } from "../data/terrain";
import type { DecorKind, ZoneDef } from "../data/zones";

export interface Vec2 {
  x: number;
  z: number;
}

export interface Obstacle extends Vec2 {
  r: number;
  kind: DecorKind;
  scale: number;
  rot: number;
  solid: boolean;
  /** M21-10: pedra do gargalo dentro da clareira (fica fora da regra "clareira sem nada sólido") */
  choke?: boolean;
}

/** M21-10: fosso na clareira; a beirada dele mata o inimigo comum empurrado. */
export interface Pit extends Vec2 {
  r: number;
}

/** M21-10: o terreno de luta de uma clareira de onda (a arena do chefe não tem). */
export interface ClearingTerrain {
  pit: Pit;
  barrels: Vec2[];
}

/** Trecho da zona: a clareira onde uma onda acontece (D13: cada zona = 5 ondas). */
export interface Segment extends Vec2 {
  r: number;
  /** ponto do caminho logo antes da clareira: onde o herói fica ao continuar a partida nesta onda */
  entry: Vec2;
  /** M21-10: fosso, gargalo (as pedras estão em `obstacles`, com `choke`) e barris; só nas ondas 1 a 4 */
  terrain?: ClearingTerrain;
}

export interface ZoneLayout {
  seed: number;
  size: number;
  spawn: Vec2;
  boss: Vec2;
  bossRadius: number;
  path: Vec2[];
  /** os 5 trechos, do início ao chefe; o último é a arena do chefe */
  segments: Segment[];
  obstacles: Obstacle[];
}

const DECOR_RADIUS: Record<DecorKind, number> = {
  tree: 0.7, pine: 0.6, deadTree: 0.45, rock: 1.0, bush: 0.6, tomb: 0.55, pillar: 0.7, crystal: 0.8, lavaRock: 1.1, mushroom: 0.3,
};

export function distToSegment(px: number, pz: number, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  let t = len2 > 0 ? ((px - a.x) * dx + (pz - a.z) * dz) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (a.x + dx * t), pz - (a.z + dz * t));
}

export function distToPath(px: number, pz: number, path: Vec2[]): number {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) best = Math.min(best, distToSegment(px, pz, path[i], path[i + 1]));
  return best;
}

function pathLength(path: Vec2[]): number {
  let len = 0;
  for (let i = 0; i < path.length - 1; i++) len += Math.hypot(path[i + 1].x - path[i].x, path[i + 1].z - path[i].z);
  return len;
}

/** Ponto do caminho a uma distância d do início, medida ao longo dele. */
export function pointOnPath(path: Vec2[], d: number): Vec2 {
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const seg = Math.hypot(b.x - a.x, b.z - a.z);
    if (d <= seg || i === path.length - 2) {
      const t = seg > 0 ? Math.max(0, Math.min(1, d / seg)) : 0;
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    }
    d -= seg;
  }
  return { ...path[path.length - 1] };
}

export function generateZone(zone: ZoneDef, seed: number): ZoneLayout {
  /** raio das clareiras das ondas, com a camada de ritmo (M21-02) */
  const SEG_R = pacedClearing(TUNING.world.segmentRadius);
  const W = TUNING.world;
  const half = W.size / 2;
  const inner = half - W.margin;
  const rLayout = Rng.of(seed, "layout");
  const rDecor = Rng.of(seed, "decor");

  const spawn: Vec2 = { x: rLayout.range(-30, 30), z: inner - 8 };
  const boss: Vec2 = { x: rLayout.range(-55, 55), z: -inner + W.bossArenaRadius + 4 };

  // caminho sinuoso do início ao chefe
  const path: Vec2[] = [spawn];
  const steps = 6;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    path.push({
      x: spawn.x + (boss.x - spawn.x) * t + rLayout.range(-34, 34),
      z: spawn.z + (boss.z - spawn.z) * t + rLayout.range(-8, 8),
    });
  }
  path.push(boss);
  for (const p of path) p.x = Math.max(-inner + 6, Math.min(inner - 6, p.x));

  // os trechos: clareiras ao longo do caminho; o último é a arena do chefe
  const len = pathLength(path);
  // o caminho é sinuoso: do chefe para trás, cada clareira recua pelo caminho até não tocar a seguinte
  const gap = 2;
  const at = W.segmentAt.map((f) => len * f);
  const centers: Vec2[] = [];
  let next: Vec2 = boss;
  let nextR: number = W.bossArenaRadius;
  for (let i = at.length - 1; i >= 0; i--) {
    let d = Math.min(at[i], (i + 1 < at.length ? at[i + 1] : len) - SEG_R - nextR - gap);
    let c = pointOnPath(path, d);
    while (d > 0 && Math.hypot(c.x - next.x, c.z - next.z) < SEG_R + nextR + gap) c = pointOnPath(path, (d -= 1));
    at[i] = d;
    centers[i] = c;
    next = c;
    nextR = SEG_R;
  }
  // entrada: o primeiro ponto do caminho, voltando da clareira, que fica 3 unidades fora dela
  const entryOf = (c: Vec2, r: number, d: number): Vec2 => {
    let e = pointOnPath(path, d);
    while (d > 0 && Math.hypot(e.x - c.x, e.z - c.z) < r + 3) e = pointOnPath(path, (d -= 1));
    return e;
  };
  const segments: Segment[] = centers.map((c, i) => ({ ...c, r: SEG_R, entry: entryOf(c, SEG_R, at[i]) }));
  segments.push({ ...boss, r: W.bossArenaRadius, entry: entryOf(boss, W.bossArenaRadius, len) });

  // obstáculos e decoração
  const obstacles: Obstacle[] = [];
  const blocked = (x: number, z: number, r: number): boolean => {
    if (Math.hypot(x - spawn.x, z - spawn.z) < 9 + r) return true;
    if (Math.hypot(x - boss.x, z - boss.z) < W.bossArenaRadius + 1 + r) return true;
    if (distToPath(x, z, path) < 3.2 + r) return true;
    // clareira das ondas: sem nada sólido; decoração baixa só na beirada
    for (const sg of segments.slice(0, -1)) if (Math.hypot(x - sg.x, z - sg.z) < (r > 0 ? sg.r + 1 + r : sg.r * 0.6)) return true;
    return false;
  };
  for (let i = 0; i < zone.decorCount; i++) {
    const [kind, , solid] = rDecor.weighted(zone.decor.map((d) => [d, d[1]] as const));
    const scale = rDecor.range(0.8, 1.45);
    const r = DECOR_RADIUS[kind] * scale;
    const x = rDecor.range(-half + 2, half - 2);
    const z = rDecor.range(-half + 2, half - 2);
    const rot = rDecor.range(0, Math.PI * 2);
    if (blocked(x, z, solid ? r : 0)) continue;
    obstacles.push({ x, z, r, kind, scale, rot, solid });
  }
  // M21-10: terreno de luta nas clareiras das ondas (stream próprio: a decoração de antes não muda)
  const rTerrain = Rng.of(seed, "terrain");
  for (const sg of segments.slice(0, -1)) {
    const rocks: Obstacle[] = [];
    sg.terrain = clearingTerrain(sg, rTerrain, rocks);
    obstacles.push(...rocks);
  }
  // decoração baixa em cima do fosso sai
  const pits = segments.flatMap((sg) => (sg.terrain ? [sg.terrain.pit] : []));
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    if (!o.solid && pits.some((pt) => Math.hypot(o.x - pt.x, o.z - pt.z) < pt.r + 0.6 + o.r)) obstacles.splice(i, 1);
  }

  // borda: muralha de obstáculos sólidos
  const borderKind = zone.decor.find((d) => d[2])![0];
  const rBorder = Rng.of(seed, "border");
  for (let row = 0; row < 3; row++) {
    const d = inner + 2 + row * 3.2;
    for (let t = -d; t <= d; t += 2.6) {
      for (const [x, z] of [[t, -d], [t, d], [-d, t], [d, t]] as const) {
        // a borda sul fica entre a câmera e o herói: mantém baixa para não tapar a tela
        const scale = rBorder.range(1.3, 1.9) * (z > inner ? 0.4 : 1);
        obstacles.push({
          x: x + rBorder.range(-0.8, 0.8), z: z + rBorder.range(-0.8, 0.8),
          r: DECOR_RADIUS[borderKind] * scale, kind: borderKind, scale, rot: rBorder.range(0, 6.28), solid: true,
        });
      }
    }
  }

  return { seed, size: W.size, spawn, boss, bossRadius: W.bossArenaRadius, path, segments, obstacles };
}

/**
 * M21-10: fosso de um lado da clareira, gargalo (duas fileiras de pedras com um vão) do lado oposto e barris
 * espalhados longe dos dois. As pedras vão para `rocks`.
 */
function clearingTerrain(sg: Segment, rng: Rng, rocks: Obstacle[]): ClearingTerrain {
  const T = TERRAIN;
  const a = rng.range(0, Math.PI * 2);
  const pd = sg.r * rng.range(T.pit.dist[0], T.pit.dist[1]);
  const pit: Pit = { x: sg.x + Math.cos(a) * pd, z: sg.z + Math.sin(a) * pd, r: rng.range(T.pit.radius[0], T.pit.radius[1]) };
  // gargalo: no lado oposto, as fileiras seguem a direção radial; o vão fica de frente para o centro
  const b = a + Math.PI + rng.range(-0.6, 0.6);
  const cd = sg.r * rng.range(T.choke.dist[0], T.choke.dist[1]);
  const cx = sg.x + Math.cos(b) * cd, cz = sg.z + Math.sin(b) * cd;
  // fileiras perpendiculares ao raio: o vão abre caminho entre a beira e o meio da clareira
  const tx = -Math.sin(b), tz = Math.cos(b);
  for (const side of [-1, 1]) {
    for (let i = 0; i < T.choke.rocksPerSide; i++) {
      const scale = rng.range(T.choke.scale[0], T.choke.scale[1]);
      const r = DECOR_RADIUS.rock * scale;
      const off = T.choke.gap / 2 + DECOR_RADIUS.rock * T.choke.scale[1] + i * T.choke.spacing;
      rocks.push({ x: cx + tx * off * side, z: cz + tz * off * side, r, kind: "rock", scale, rot: rng.range(0, Math.PI * 2), solid: true, choke: true });
    }
  }
  const barrels: Vec2[] = [];
  const want = rng.weighted(T.barrel.count.map(([n, w]) => [n, w] as const));
  for (let tries = 0; tries < 60 && barrels.length < want; tries++) {
    const ang = rng.range(0, Math.PI * 2);
    const d = sg.r * rng.range(T.barrel.dist[0], T.barrel.dist[1]);
    const x = sg.x + Math.cos(ang) * d, z = sg.z + Math.sin(ang) * d;
    if (Math.hypot(x - pit.x, z - pit.z) < pit.r + T.barrel.clear + T.barrel.radius) continue;
    if (rocks.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + T.barrel.clear)) continue;
    if (barrels.some((q) => Math.hypot(x - q.x, z - q.z) < T.barrel.spacing)) continue;
    barrels.push({ x, z });
  }
  return { pit, barrels };
}

/** Grade espacial para colisão com obstáculos sólidos. */
export class ObstacleGrid {
  private cells = new Map<number, Obstacle[]>();
  private readonly cell = 4;

  constructor(obstacles: Obstacle[]) {
    for (const o of obstacles) {
      if (!o.solid) continue;
      const x0 = Math.floor((o.x - o.r) / this.cell);
      const x1 = Math.floor((o.x + o.r) / this.cell);
      const z0 = Math.floor((o.z - o.r) / this.cell);
      const z1 = Math.floor((o.z + o.r) / this.cell);
      for (let cx = x0; cx <= x1; cx++) {
        for (let cz = z0; cz <= z1; cz++) {
          const k = cx * 4096 + cz;
          let list = this.cells.get(k);
          if (!list) this.cells.set(k, (list = []));
          list.push(o);
        }
      }
    }
  }

  /** Empurra o círculo (pos, r) para fora dos obstáculos. Altera `pos`. */
  resolve(pos: Vec2, r: number): void {
    const cx = Math.floor(pos.x / this.cell);
    const cz = Math.floor(pos.z / this.cell);
    for (let ix = cx - 1; ix <= cx + 1; ix++) {
      for (let iz = cz - 1; iz <= cz + 1; iz++) {
        const list = this.cells.get(ix * 4096 + iz);
        if (!list) continue;
        for (const o of list) {
          const dx = pos.x - o.x;
          const dz = pos.z - o.z;
          const min = r + o.r;
          const d2 = dx * dx + dz * dz;
          if (d2 < min * min && d2 > 1e-6) {
            const d = Math.sqrt(d2);
            pos.x = o.x + (dx / d) * min;
            pos.z = o.z + (dz / d) * min;
          }
        }
      }
    }
  }

  hits(x: number, z: number, r: number): boolean {
    const list = this.cells.get(Math.floor(x / this.cell) * 4096 + Math.floor(z / this.cell));
    if (!list) return false;
    for (const o of list) {
      const min = r + o.r * 0.8;
      if ((x - o.x) ** 2 + (z - o.z) ** 2 < min * min) return true;
    }
    return false;
  }
}
