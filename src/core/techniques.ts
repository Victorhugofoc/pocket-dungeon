// Números finais de uma técnica (porta de SpellStats.compute/extra do Dungeon Reign, só a parte das técnicas).
// Lógica pura: recebe o nível e os atributos do herói, devolve metros, segundos e multiplicadores de dano.
import { stackMultiplier } from "./stats";
import {
  DR_BASE_DAMAGE, DR_PX_PER_M, DR_SPELL_POWER, TECH_LEVEL_STEP, TECH_MAX_LEVEL, TECHNIQUES,
  type TechDef, type TechMilestoneEffect,
} from "../data/techniques";
import { HERO_UPGRADES } from "../data/tuning";

/** O que a técnica precisa dos atributos do herói (subconjunto de FinalStats, mais o ataque básico dele). */
export interface TechContext {
  cooldownMult: number;
  area: number;
  range: number;
  /** multiplicador do ataque básico do herói (HeroDef.auto.damage) */
  autoDamage: number;
  /** M20-12 parte 3 (spell_stats.lua): exclusivas de herói que mexem na técnica; 0 ou ausente = nenhuma */
  permafrost?: number;
  staticCharge?: number;
  riftDuration?: number;
}

export interface TechStats {
  id: string;
  kind: TechDef["kind"];
  level: number;
  evolved: boolean;
  cooldown: number;
  /** multiplicador sobre o dano do herói (FinalStats.damage) */
  damage: number;
  /** metros */
  range: number;
  minRange?: number;
  maxRange?: number;
  radius?: number;
  width?: number;
  length?: number;
  thickness?: number;
  /** segundos */
  duration?: number;
  invuln?: number;
  freeze?: number;
  stun?: number;
  // por tipo
  trail?: number; trailTick?: number; trailFraction?: number; shockRadius?: number;
  /** STATIC CHARGE: multiplicador do dano do rastro */
  trailMult?: number;
  riftSlow?: number; perEnemy?: number; maxMult?: number;
  shots?: number; spread?: number; bounces?: number; bounceDamage?: number;
  shatter?: boolean;
  maxHpFraction?: number; leapTime?: number;
  dashTime?: number; burnDps?: number; burnDuration?: number; ringMult?: number; fireTrail?: number;
  behind?: number; alwaysCrit?: boolean; echoDelay?: number; echoFraction?: number;
  healFraction?: number; sanctumTime?: number;
  spiders?: number; poisonDuration?: number; poisonStacks?: number; poolTime?: number;
}

/** piso da recarga pelos marcos (constants.lua `COOLDOWN_FLOOR`) */
const COOLDOWN_FLOOR = 0.35;

export const px = (v: number): number => v / DR_PX_PER_M;

export function levelScale(level: number): number {
  return 1 + (clampLevel(level) - 1) * TECH_LEVEL_STEP;
}

function clampLevel(level: number): number {
  return Math.max(1, Math.min(TECH_MAX_LEVEL, Math.floor(level)));
}

/** Multiplicador de uma lista de percentuais como no Dungeon Reign (modifiers.lua §18); mora em `core/stats.ts`. */
export { stackMultiplier };

function milestoneValues(def: TechDef, level: number, k: keyof TechMilestoneEffect): number[] {
  const out: number[] = [];
  for (const ms of def.milestones) {
    const v = ms.effect[k];
    if (ms.level <= level && v !== undefined) out.push(v);
  }
  return out;
}

/** Soma os marcos de nível alcançados (o que é plano; os percentuais usam `stackMultiplier`). */
export function milestoneTotals(def: TechDef, level: number): Required<TechMilestoneEffect> {
  const t = { cooldownPct: 0, rangePct: 0, areaPct: 0, damagePct: 0, durationFlat: 0, projectiles: 0 };
  for (const ms of def.milestones) {
    if (ms.level > level) continue;
    for (const k of Object.keys(t) as (keyof typeof t)[]) t[k] += ms.effect[k] ?? 0;
  }
  return t;
}

const num = (def: TechDef, k: string): number | undefined => {
  const v = def[k];
  return typeof v === "number" ? v : undefined;
};

export function techniqueStats(id: string, level: number, ctx: TechContext): TechStats {
  const def = TECHNIQUES[id];
  if (!def) throw new Error(`unknown technique: ${id}`);
  const lv = clampLevel(level);
  const evolved = lv >= TECH_MAX_LEVEL;
  const M = milestoneTotals(def, lv);
  const mult = (k: keyof TechMilestoneEffect) => stackMultiplier(milestoneValues(def, lv, k));
  const scale = levelScale(lv) * mult("damagePct");
  const area = ctx.area * mult("areaPct");
  const rangeMult = ctx.range * mult("rangePct");

  const base = def.baseDamage !== undefined ? (def.baseDamage + DR_SPELL_POWER * (def.damageScale ?? 0)) / DR_BASE_DAMAGE : 0;
  const st: TechStats = {
    id, kind: def.kind, level: lv, evolved,
    cooldown: def.cooldown * ctx.cooldownMult * Math.max(COOLDOWN_FLOOR, mult("cooldownPct")),
    damage: base * scale,
    range: px(def.range ?? 0) * rangeMult,
    radius: def.radius !== undefined ? px(def.radius) * area : undefined,
    width: def.width !== undefined ? px(def.width) : undefined,
    length: def.length !== undefined ? px(def.length) * area : undefined,
    thickness: def.thickness !== undefined ? px(def.thickness) : undefined,
    duration: def.duration !== undefined ? def.duration + M.durationFlat : undefined,
    invuln: def.invuln,
    freeze: def.freeze,
    stun: def.stun,
  };
  if (def.minRange !== undefined) st.minRange = px(def.minRange);
  if (def.maxRange !== undefined) st.maxRange = px(def.maxRange) * rangeMult;

  switch (def.kind) {
    case "blink":
      st.trail = evolved ? num(def, "evoTrail") : num(def, "trail");
      st.trailTick = num(def, "trailTick");
      st.trailFraction = num(def, "trailFraction");
      if (evolved) st.shockRadius = px(num(def, "evoShockRadius") ?? 0) * ctx.area;
      break;
    case "rift":
      st.riftSlow = num(def, "riftSlow");
      st.perEnemy = num(def, "perEnemy");
      st.maxMult = num(def, "maxMult");
      if (evolved) st.stun = num(def, "evoStun");
      break;
    case "fan":
      st.damage = ctx.autoDamage * (def.autoFraction ?? 1) * scale;
      st.shots = (num(def, "shots") ?? 5) + M.projectiles;
      st.spread = num(def, "spread");
      st.bounces = evolved ? num(def, "evoBounces") : 0;
      st.bounceDamage = evolved ? num(def, "evoBounceDamage") : 0;
      break;
    case "icewall":
      st.shatter = evolved;
      break;
    case "leap":
      st.maxHpFraction = evolved ? num(def, "evoMaxHpFraction") : num(def, "maxHpFraction");
      st.leapTime = num(def, "leapTime");
      break;
    case "charge":
      st.dashTime = num(def, "dashTime");
      st.burnDps = ((num(def, "burnDps") ?? 0) / DR_BASE_DAMAGE) * levelScale(lv);
      st.burnDuration = num(def, "burnDuration");
      st.ringMult = num(def, "ringMult");
      if (evolved) st.fireTrail = num(def, "evoFireTrail");
      break;
    case "shadowstep":
      st.damage = ctx.autoDamage * (def.autoMult ?? 1) * scale;
      st.alwaysCrit = true;
      st.behind = px(num(def, "behind") ?? 0);
      if (evolved) {
        st.echoDelay = num(def, "evoEchoDelay");
        st.echoFraction = num(def, "evoEchoFraction");
      }
      break;
    case "aegis":
      st.healFraction = num(def, "healFraction");
      if (evolved) st.sanctumTime = num(def, "evoSanctumTime");
      break;
    case "brood":
      st.spiders = (num(def, "spiders") ?? 2) + (evolved ? 1 : 0);
      st.poisonDuration = num(def, "poisonDuration");
      st.poisonStacks = num(def, "poisonStacks");
      if (evolved) st.poolTime = num(def, "evoPoolTime");
      break;
  }
  // spell_stats.lua: as exclusivas de herói (1.9.9 D-310 AF-5)
  const H = HERO_UPGRADES;
  if (def.kind === "blink" && (ctx.staticCharge ?? 0) > 0) {
    st.trail = (st.trail ?? 0) + H.staticTrail * ctx.staticCharge!;
    st.trailMult = H.staticTrailMult;
  }
  if (def.kind === "rift" && (ctx.riftDuration ?? 0) > 0) st.duration = (st.duration ?? 0) + ctx.riftDuration!;
  if (def.kind === "icewall" && (ctx.permafrost ?? 0) > 0) {
    st.freeze = (st.freeze ?? 0) + H.permafrostFreeze * ctx.permafrost!;
    st.duration = (st.duration ?? 0) + H.permafrostDuration * ctx.permafrost!;
  }
  return st;
}
