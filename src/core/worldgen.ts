// Geração procedural de uma zona: caminho, acampamentos, arena do chefe e obstáculos.
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

export interface CampSpawn {
  id: string;
  champion: boolean;
}

export interface Camp extends Vec2 {
  level: number;
  spawns: CampSpawn[];
}

export interface ZoneLayout {
  seed: number;
  size: number;
  spawn: Vec2;
  boss: Vec2;
  bossRadius: number;
  path: Vec2[];
  camps: Camp[];
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

export function generateZone(zone: ZoneDef, seed: number): ZoneLayout {
  const W = TUNING.world;
  const half = W.size / 2;
  const inner = half - W.margin;
  const rLayout = Rng.of(seed, "layout");
  const rCamps = Rng.of(seed, "camps");
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

  // acampamentos
  const camps: Camp[] = [];
  const totalWeight = zone.enemies.reduce((s, [, w]) => s + w, 0);
  void totalWeight;
  let tries = 0;
  while (camps.length < W.campCount && tries < 4000) {
    tries++;
    const x = rCamps.range(-inner + 8, inner - 8);
    const z = rCamps.range(-inner + 8, inner - 8);
    if (Math.hypot(x - spawn.x, z - spawn.z) < 26) continue;
    if (Math.hypot(x - boss.x, z - boss.z) < W.bossArenaRadius + 12) continue;
    let ok = true;
    for (const c of camps) {
      if (Math.hypot(x - c.x, z - c.z) < 27) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    // progresso 0..1 do início até o chefe define nível e tamanho do grupo
    const progress = Math.max(0, Math.min(1, (spawn.z - z) / (spawn.z - boss.z)));
    const level = zone.level + Math.floor(progress * 4.99);
    const count = rCamps.int(3, 5) + Math.round(progress * 2);
    const spawns: CampSpawn[] = [];
    for (let i = 0; i < count; i++) spawns.push({ id: rCamps.weighted(zone.enemies), champion: false });
    if (rCamps.chance(0.25)) spawns[0].champion = true;
    camps.push({ x, z, level, spawns });
  }

  // obstáculos e decoração
  const obstacles: Obstacle[] = [];
  const blocked = (x: number, z: number, r: number): boolean => {
    if (Math.hypot(x - spawn.x, z - spawn.z) < 9 + r) return true;
    if (Math.hypot(x - boss.x, z - boss.z) < W.bossArenaRadius + 1 + r) return true;
    if (distToPath(x, z, path) < 3.2 + r) return true;
    for (const c of camps) if (Math.hypot(x - c.x, z - c.z) < 4.5 + r) return true;
    return false;
  };
  for (let i = 0; i < zone.decorCount; i++) {
    const [kind, , solid] = rDecor.weighted(zone.decor.map((d) => [d, d[1]] as const));
    const scale = rDecor.range(0.8, 1.45);
    const r = DECOR_RADIUS[kind] * scale;
    const x = rDecor.range(-half + 2, half - 2);
    const z = rDecor.range(-half + 2, half - 2);
    const rot = rDecor.range(0, Math.PI * 2);
    if (solid && blocked(x, z, r)) continue;
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

  return { seed, size: W.size, spawn, boss, bossRadius: W.bossArenaRadius, path, camps, obstacles };
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
