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
