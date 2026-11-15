// Geração procedural de uma zona: caminho, os 5 trechos (um por onda; o 5º é a arena do chefe) e obstáculos.
// Lógica pura (sem three.js): o mesmo seed gera sempre o mesmo mapa.
import { Rng } from "./rng";
import { TUNING } from "../data/tuning";
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
}

/** Trecho da zona: a clareira onde uma onda acontece (D13: cada zona = 5 ondas). */
export interface Segment extends Vec2 {
  r: number;
  /** ponto do caminho logo antes da clareira: onde o herói fica ao continuar a partida nesta onda */
  entry: Vec2;
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
    let d = Math.min(at[i], (i + 1 < at.length ? at[i + 1] : len) - W.segmentRadius - nextR - gap);
    let c = pointOnPath(path, d);
    while (d > 0 && Math.hypot(c.x - next.x, c.z - next.z) < W.segmentRadius + nextR + gap) c = pointOnPath(path, (d -= 1));
    at[i] = d;
    centers[i] = c;
    next = c;
    nextR = W.segmentRadius;
  }
  // entrada: o primeiro ponto do caminho, voltando da clareira, que fica 3 unidades fora dela
  const entryOf = (c: Vec2, r: number, d: number): Vec2 => {
    let e = pointOnPath(path, d);
    while (d > 0 && Math.hypot(e.x - c.x, e.z - c.z) < r + 3) e = pointOnPath(path, (d -= 1));
    return e;
  };
  const segments: Segment[] = centers.map((c, i) => ({ ...c, r: W.segmentRadius, entry: entryOf(c, W.segmentRadius, at[i]) }));
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
