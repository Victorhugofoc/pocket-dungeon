// M21-09: desvios opcionais (sorteio e lugar). Lógica pura: a seed da zona e a onda decidem tudo, então
// continuar a partida dá os mesmos desvios.
import { Rng } from "./rng";
import { DETOUR, DETOURS, type DetourKind } from "../data/detours";
import type { Vec2 } from "./worldgen";

export interface DetourSpot extends Vec2 {
  kind: DetourKind;
  /** lado em que o guarda do baú fica (radianos, no plano xz) */
  facing: number;
}

export interface DetourContext {
  /** ainda há loja automática antes do chefe desta zona (o atalho só aparece com loja para pular) */
  shopAhead: boolean;
}

/** Os tipos de desvio do trecho: 0 a 2, sem repetir. */
export function rollDetours(rng: Rng, ctx: DetourContext): DetourKind[] {
  const n = rng.weighted(DETOUR.count.map(([c, w]) => [c, w] as const));
  const pool = (Object.keys(DETOURS) as DetourKind[]).filter((k) => k !== "shortcut" || ctx.shopAhead);
  const out: DetourKind[] = [];
  for (let i = 0; i < n && pool.length; i++) {
    const k = rng.weighted(pool.map((id) => [id, DETOURS[id].weight] as const));
    out.push(k);
    pool.splice(pool.indexOf(k), 1);
  }
  return out;
}

export interface DetourArea {
  /** de onde o herói sai (clareira vencida ou fogueira) e para onde vai */
  from: Vec2;
  to: Vec2;
  /** clareiras da zona (nenhum desvio dentro delas) */
  clearings: { x: number; z: number; r: number }[];
  /** limite do chão jogável: |x| e |z| até aqui */
  bound: number;
  /** chão bloqueado por obstáculo sólido */
  blocked(x: number, z: number, r: number): boolean;
}

/**
 * Lugar de cada desvio: ao lado do meio do trecho, um de cada lado, em chão livre e com corredor livre desde o meio.
 * Desvio sem lugar fica de fora.
 */
export function detourSpots(rng: Rng, kinds: DetourKind[], area: DetourArea): DetourSpot[] {
  const { from, to } = area;
  const mx = (from.x + to.x) / 2, mz = (from.z + to.z) / 2;
  const len = Math.hypot(to.x - from.x, to.z - from.z) || 1;
  const dx = (to.x - from.x) / len, dz = (to.z - from.z) / len;
  // perpendicular ao trecho
  const nx = -dz, nz = dx;
  const firstSide = rng.chance(0.5) ? 1 : -1;
  const out: DetourSpot[] = [];
  kinds.forEach((kind, i) => {
    const side = i % 2 === 0 ? firstSide : -firstSide;
    for (let tries = 0; tries < 24; tries++) {
      const off = rng.range(DETOUR.offset[0], DETOUR.offset[1]);
      const along = rng.range(-4, 4);
      const x = mx + nx * side * off + dx * along;
      const z = mz + nz * side * off + dz * along;
      if (!free(x, z, mx, mz, area) || out.some((o) => Math.hypot(o.x - x, o.z - z) < 6)) continue;
      out.push({ x, z, kind, facing: Math.atan2(mz - z, mx - x) });
      break;
    }
  });
  return out;
}

function free(x: number, z: number, mx: number, mz: number, a: DetourArea): boolean {
  if (Math.abs(x) > a.bound || Math.abs(z) > a.bound) return false;
  for (const c of a.clearings) if (Math.hypot(x - c.x, z - c.z) < c.r + DETOUR.clearingGap) return false;
  if (a.blocked(x, z, DETOUR.clearRadius)) return false;
  // corredor do meio do trecho até o desvio
  const d = Math.hypot(x - mx, z - mz);
  for (let s = 1.5; s < d; s += 1.5) {
    const t = s / d;
    if (a.blocked(mx + (x - mx) * t, mz + (z - mz) * t, DETOUR.corridor)) return false;
  }
  return true;
}

/** Ouro do baú ou do santuário numa onda. */
export function detourGold(kind: "chest" | "shrine", wave: number): number {
  const d = DETOUR[kind];
  return Math.round(d.gold + d.goldPerWave * wave);
}

/** Vida que o santuário cobra: a fração da máxima, sem matar (fica com 1). */
export function shrineCost(hp: number, maxHp: number): number {
  return Math.max(0, Math.min(Math.round(maxHp * DETOUR.shrine.hpCostPct), Math.floor(hp) - 1));
}

/** Rng dos desvios de uma onda, pela seed da zona. */
export function detourRng(zoneSeed: number, wave: number): Rng {
  return Rng.of(zoneSeed, `detours:${wave}`);
}
