// M17-01 parte 3: a pilotagem do bot em combate (porta de `danger`, `steer` e `useTechnique` de
// `tools/balance_sim.lua` do Dungeon Reign). Lógica pura sobre uma foto do mundo (`BotWorld`), em metros;
// quem monta a foto e aperta as teclas é o modo simulação (`src/sim.ts`, `Game.botView`).

import { BOT_PILOT as P, BOT_TECH as T } from "../data/simbot";

export interface Pt { x: number; z: number }

/** Aviso no chão; `left` = segundos até disparar. Ângulos como no jogo: direção (sin a, cos a). */
export type BotTelegraph =
  | { kind: "circle"; x: number; z: number; r: number; inner: number; left: number }
  | { kind: "rect"; x: number; z: number; angle: number; length: number; width: number; left: number }
  | { kind: "cone"; x: number; z: number; angle: number; length: number; half: number; left: number };

export interface BotEnemy { x: number; z: number; radius: number; reach: number; boss: boolean; champion: boolean }
export interface BotShot { x: number; z: number; vx: number; vz: number; r: number }
export interface BotZone { x: number; z: number; r: number }
export interface BotOrb { x: number; z: number; left: number }

export interface BotWorld {
  hero: { x: number; z: number; speed: number; hpFrac: number; reach: number; keep: number };
  telegraphs: BotTelegraph[];
  /** poças que ferem (tempestade de raios da sala) */
  storms: BotZone[];
  /** poças de cura da sala */
  healPools: BotZone[];
  healOrbs: BotOrb[];
  loot: Pt[];
  enemies: BotEnemy[];
  shots: BotShot[];
  /** clareira da luta; fora da luta, null (sem borda) */
  arena: { x: number; z: number; r: number } | null;
  /** obstáculo sólido no ponto (pedra, tronco, fosso) */
  blocked: (x: number, z: number, r: number) => boolean;
}

/** As 16 direções e o parado, como lá. */
export const DIRS: readonly Pt[] = [
  ...Array.from({ length: 16 }, (_, k) => ({ x: Math.cos((k / 16) * Math.PI * 2), z: Math.sin((k / 16) * Math.PI * 2) })),
  { x: 0, z: 0 },
];
const STILL = DIRS.length - 1;

export function segmentDistance(x: number, z: number, x0: number, z0: number, x1: number, z1: number): number {
  const dx = x1 - x0, dz = z1 - z0;
  const l2 = dx * dx + dz * dz;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / l2)) : 0;
  return Math.hypot(x - (x0 + dx * t), z - (z0 + dz * t));
}

function inTelegraph(tg: BotTelegraph, x: number, z: number, pr: number): boolean {
  const pad = pr + P.pad;
  if (tg.kind === "circle") {
    const d = Math.hypot(x - tg.x, z - tg.z);
    if (d >= tg.r + pad) return false;
    return !(tg.inner > 0 && d < tg.inner - pr - P.pad * 0.6);
  }
  const ax = Math.sin(tg.angle), az = Math.cos(tg.angle);
  if (tg.kind === "rect") {
    const d = segmentDistance(x, z, tg.x, tg.z, tg.x + ax * tg.length, tg.z + az * tg.length);
    return d < tg.width / 2 + pad;
  }
  const ox = x - tg.x, oz = z - tg.z;
  const d = Math.hypot(ox, oz);
  if (d >= tg.length + pad) return false;
  if (d < pad) return true;
  const off = Math.acos(Math.max(-1, Math.min(1, (ox * ax + oz * az) / d)));
  // a borda do setor também tem folga: o arco que `pad` cobre àquela distância
  return off < tg.half + Math.asin(Math.min(1, pad / d));
}

/** O perigo do ponto (x, z) para um corpo de raio `pr` daqui a `look` s (`danger` de lá); `bodies` = false deixa
 * de fora o encosto nos inimigos (só o que vai disparar: avisos, poças, projéteis). */
export function danger(w: BotWorld, x: number, z: number, pr: number, look: number, bodies = true): number {
  let s = 0;
  for (const tg of w.telegraphs) if (tg.left < P.soon && inTelegraph(tg, x, z, pr)) s += P.telegraph;
  for (const h of w.storms) if (Math.hypot(x - h.x, z - h.z) < h.r + pr + 0.3) s += P.storm;
  if (bodies) for (const e of w.enemies) {
    const d = Math.hypot(x - e.x, z - e.z) - e.radius - pr;
    const reach = e.boss ? P.bossReach : e.reach + P.enemyPad;
    if (d < reach) s += ((reach - d) / reach) * (e.boss ? P.bossWeight : P.enemyWeight);
  }
  for (const b of w.shots) {
    const d = segmentDistance(x, z, b.x, b.z, b.x + b.vx * look, b.z + b.vz * look);
    if (d < pr + b.r + P.shotPad) s += P.shot;
  }
  if (w.arena) {
    const d = Math.hypot(x - w.arena.x, z - w.arena.z);
    if (d > w.arena.r - P.edgeBand) s += P.edge;
    if (d > w.arena.r - pr) s += P.outside;
  }
  if (w.blocked(x, z, pr)) s += P.blocked;
  return s;
}

/** O alvo do bot: o chefe vivo, senão o inimigo mais perto. */
export function pickTarget(w: BotWorld): BotEnemy | null {
  let best: BotEnemy | null = null, bd = Infinity;
  for (const e of w.enemies) {
    if (e.boss) return e;
    const d = Math.hypot(e.x - w.hero.x, e.z - w.hero.z);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

/** A direção de andar (índice em `DIRS`; o último é ficar parado), dada a anterior para a histerese (`steer` de lá). */
export function steer(w: BotWorld, prev: number): number {
  const h = w.hero, pr = T.heroRadius;
  const target = pickTarget(w);
  const step = h.speed * P.look, far = h.speed * P.far;
  let lo: Pt | null = null, lod = P.lootRange;
  for (const o of w.loot) {
    const d = Math.hypot(h.x - o.x, h.z - o.z);
    if (d < lod) { lo = o; lod = d; }
  }
  let best = STILL, bestS = Infinity;
  DIRS.forEach((dir, i) => {
    const x = h.x + dir.x * step, z = h.z + dir.z * step;
    let s = danger(w, x, z, pr, P.look)
      + danger(w, h.x + dir.x * step * 0.5, h.z + dir.z * step * 0.5, pr, P.look * 0.5) * P.halfWeight
      + danger(w, h.x + dir.x * far, h.z + dir.z * far, pr, P.far) * P.farWeight;
    if (target) {
      const want = h.reach * h.keep + target.radius * P.targetRadius;
      s += Math.abs(Math.hypot(x - target.x, z - target.z) - want) * P.distance;
    }
    if (h.hpFrac < P.healPoolHp) for (const hp of w.healPools) if (Math.hypot(x - hp.x, z - hp.z) < hp.r) s -= P.healPool;
    if (h.hpFrac < P.healOrbHp) {
      for (const o of w.healOrbs) {
        const od = Math.hypot(h.x - o.x, h.z - o.z);
        if (od < P.healOrbRange && o.left > od / Math.max(1, h.speed)) s += Math.hypot(x - o.x, z - o.z) * P.healOrb;
      }
    }
    if (lo) s += Math.hypot(x - lo.x, z - lo.z) * P.loot;
    if (w.arena) s += Math.hypot(x - w.arena.x, z - w.arena.z) * P.center;
    if (i === prev) s -= P.hysteresis;
    if (s < bestS) { best = i; bestS = s; }
  });
  return best;
}

function countNear(w: BotWorld, x: number, z: number, r: number): { n: number; boss: boolean } {
  let n = 0, boss = false;
  for (const e of w.enemies) {
    if (Math.hypot(e.x - x, e.z - z) <= r + e.radius) {
      n++;
      if (e.boss) boss = true;
    }
  }
  return { n, boss };
}

export type TechKindBot = "blink" | "rift" | "fan" | "icewall" | "leap" | "charge" | "shadowstep" | "aegis" | "brood";

/** Números da técnica do herói agora, em m (`Game.tech`). */
export interface BotTech { range: number; radius?: number; width?: number }

/**
 * Usar a técnica agora? Devolve o ponto de mira, ou null (`useTechnique` de lá): as de movimento só para um pouso
 * seguro (fugir do perigo ou cortar um grupo); as outras em grupos e no chefe.
 */
export function techniqueAim(w: BotWorld, kind: TechKindBot, t: BotTech): Pt | null {
  const h = w.hero, pr = T.heroRadius;
  const target = pickTarget(w);
  if (!target) return null;
  switch (kind) {
    case "blink":
    case "charge": {
      const here = danger(w, h.x, h.z, pr, P.look);
      let best: Pt | null = null, bestS = Infinity;
      for (let i = 0; i < STILL; i++) {
        const dir = DIRS[i];
        const x = h.x + dir.x * t.range, z = h.z + dir.z * t.range;
        const dz = danger(w, x, z, pr, 0.5);
        let hits = 0;
        for (const e of w.enemies) {
          const ex = e.x - h.x, ez = e.z - h.z;
          const along = ex * dir.x + ez * dir.z;
          if (along > 0 && along < t.range && Math.abs(ex * dir.z - ez * dir.x) < (t.width ?? T.lineWidth) / 2 + e.radius) hits++;
        }
        const sc = dz - hits * T.lineBonus;
        if (dz < T.safeLanding && (here > T.flee || hits >= T.lineHits) && sc < bestS) { best = { x, z }; bestS = sc; }
      }
      return best;
    }
    case "rift": {
      const c = countNear(w, target.x, target.z, t.radius ?? 0);
      return c.n < T.group && !c.boss ? null : { x: target.x, z: target.z };
    }
    case "fan": {
      const c = countNear(w, h.x, h.z, t.range);
      return c.n < T.group && !c.boss ? null : { x: target.x, z: target.z };
    }
    case "icewall": {
      const c = countNear(w, h.x, h.z, T.wallNear);
      return c.n < T.group && danger(w, h.x, h.z, pr, P.look) < T.flee ? null : { x: target.x, z: target.z };
    }
    case "leap": {
      const c = countNear(w, target.x, target.z, t.radius ?? 0);
      if (!c.boss && c.n < T.leapGroup) return null;
      if (Math.hypot(target.x - h.x, target.z - h.z) > t.range) return null;
      // pouso seguro: o perigo no ponto da queda sem contar o corpo do próprio alvo
      const rest = { ...w, enemies: w.enemies.filter((e) => e !== target) };
      return danger(rest, target.x, target.z, pr, 0.5) < T.safeLanding ? { x: target.x, z: target.z } : null;
    }
    case "shadowstep": {
      let strong: BotEnemy | null = null;
      for (const e of w.enemies) {
        if (Math.hypot(e.x - h.x, e.z - h.z) > t.range) continue;
        if (!strong || (e.boss && !strong.boss) || (e.champion && !strong.boss && !strong.champion)) strong = e;
      }
      if (!strong) return null;
      if (!(strong.boss || strong.champion || danger(w, h.x, h.z, pr, P.look) > T.flee)) return null;
      return { x: strong.x, z: strong.z };
    }
    case "aegis": {
      const c = countNear(w, h.x, h.z, T.aegisNear);
      return c.n < T.aegisGroup && !c.boss ? null : { x: target.x, z: target.z };
    }
    case "brood": {
      const c = countNear(w, h.x, h.z, t.range + T.broodPad);
      return c.n < T.broodGroup && !c.boss ? null : { x: target.x, z: target.z };
    }
  }
}

/**
 * Esquiva (a do jogo daqui, o original não tem): com perigo alto no lugar (avisos, poças e projéteis; o encosto
 * nos inimigos não conta, senão o herói de perto fugiria de toda luta), a direção (índice em `DIRS`) cujo pouso,
 * a `dist` m, é o mais seguro, desde que seguro; senão null.
 */
export function dodgeDir(w: BotWorld, dist: number): number | null {
  const h = w.hero, pr = T.heroRadius;
  if (danger(w, h.x, h.z, pr, P.look, false) < T.flee) return null;
  let best: number | null = null, bestS = Infinity;
  for (let i = 0; i < STILL; i++) {
    const d = DIRS[i];
    // só o pouso conta: a esquiva passa invulnerável pelo caminho
    const s = danger(w, h.x + d.x * dist, h.z + d.z * dist, pr, 0.5);
    if (s < T.safeLanding && s < bestS) { best = i; bestS = s; }
  }
  return best;
}
