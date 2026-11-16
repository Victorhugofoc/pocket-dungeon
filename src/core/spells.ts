// Números finais de uma spell e as operações dos espaços de spell. Porta de dungeon-idle src/spells/spell_stats.lua
// (`collect`, `compute`, `extra` sem as evoluções, que entram no M6-06) e src/spells/spell_system.lua (`addSpell`,
// `levelUp`, `addModifier`). Lógica pura: recebe o espaço e os atributos do herói, devolve metros, segundos e
// multiplicadores sobre o dano do herói, como `techniqueStats`.
import {
  MAX_SPELLS, SPELL_FLAT_KEYS, SPELL_LIST_KEYS, SPELL_MAX_LEVEL, SPELL_TUNING, SPELLS, modifierDef,
  type SpellDef, type SpellEffect, type SpellFlatKey, type SpellId, type SpellKind, type SpellListKey,
} from "../data/spells";
import { DR_BASE_DAMAGE, DR_BASE_HP, DR_SPELL_POWER } from "../data/techniques";
import { px, stackMultiplier } from "./techniques";

/** O que a spell precisa dos atributos do herói (subconjunto de FinalStats). */
export interface SpellContext {
  /** multiplicador global de recarga (FinalStats.cooldownMult) */
  cooldownMult: number;
  area: number;
  range: number;
  /** multiplicador de efeitos: queimadura e duração da lentidão (FinalStats.status) */
  status: number;
  /** poder de magia na escala de lá (8 no início). Este jogo ainda não tem o atributo: sem ele, 8. */
  spellPower?: number;
  /** acúmulos extras de veneno do herói (Vesper; stats `poisonStacks` de lá) */
  poisonStacks?: number;
}

/** Um espaço de spell da partida (game_state.lua `newSpellSlot`). */
export interface SpellSlotLike {
  id: string;
  level: number;
  modifiers?: readonly string[];
}

export interface SpellStats {
  id: SpellId;
  kind: SpellKind;
  level: number;
  /** ids dos marcos alcançados */
  milestones: string[];
  levelScale: number;
  /** multiplicador sobre o dano do herói (FinalStats.damage), por golpe, tique ou acúmulo conforme o tipo */
  damage: number;
  /** segundos */
  cooldown: number;
  cooldownMult: number;
  /** metros (comprimento, no raio) */
  range: number;
  areaMult: number;
  /** metros */
  radius: number;
  /** m/s */
  speed?: number;
  projectiles?: number;
  burnDps?: number;
  burnDuration?: number;
  volatile?: number;
  slow?: number;
  slowDuration?: number;
  brittle?: number;
  targets?: number;
  chainRange?: number;
  doubleHit?: number;
  echo?: number;
  /** fração da vida máxima por tique */
  heal?: number;
  duration?: number;
  tick?: number;
  surge?: number;
  extraFields?: number;
  blades?: number;
  hitCooldown?: number;
  stacks?: number;
  /** m/s */
  pull?: number;
  bossPull?: number;
  maxRunes?: number;
  root?: number;
  /** metros */
  trigger?: number;
  arm?: number;
  /** metros */
  width?: number;
  /** metros */
  knockback?: number;
  stun?: number;
}

interface Collected {
  lists: Record<SpellListKey, number[]>;
  flats: Record<SpellFlatKey, number>;
  reached: string[];
}

export function isSpellId(id: string): id is SpellId {
  return Object.prototype.hasOwnProperty.call(SPELLS, id);
}

function spellDef(id: string): SpellDef {
  if (!isSpellId(id)) throw new Error(`spell desconhecida: ${id}`);
  return SPELLS[id];
}

/** spells.lua `levelScale`: nível 1 = ×1, nível 5 = ×3,25. */
export function spellLevelScale(level: number): number {
  return 1 + (level - 1) * SPELL_TUNING.levelStep;
}

/** modifiers.lua `stackChance`: positivos em pool 1 - Π(1 - p), vezes os negativos Π(1 - |p|), com teto. */
export function stackChance(values: readonly number[], cap = 1): number {
  let pos = 1;
  let neg = 1;
  let anyPos = false;
  for (const v of values) {
    if (v > 0) { pos *= 1 - v; anyPos = true; } else if (v < 0) neg *= 1 - Math.abs(v);
  }
  const c = (anyPos ? 1 - pos : 0) * neg;
  return Math.max(0, Math.min(cap, c));
}

/** spell_stats.lua `spMult`: o poder de magia escala as spells em proporção, com o peso `SP_WEIGHT`. */
export function spMult(spellPower = DR_SPELL_POWER): number {
  return 1 + (spellPower / DR_SPELL_POWER - 1) * SPELL_TUNING.spWeight;
}

/** spell_stats.lua `collect`: marcos alcançados (cumulativos), modificadores do espaço e efeitos de relíquia. */
export function collectSpellEffects(slot: SpellSlotLike, relicEffects: readonly SpellEffect[] = []): Collected {
  const def = spellDef(slot.id);
  const lists = Object.fromEntries(SPELL_LIST_KEYS.map((k) => [k, [] as number[]])) as Collected["lists"];
  const flats = Object.fromEntries(SPELL_FLAT_KEYS.map((k) => [k, 0])) as Collected["flats"];
  const add = (e: SpellEffect) => {
    for (const [k, v] of Object.entries(e)) {
      if (v === undefined) continue;
      if (k in lists) lists[k as SpellListKey].push(v);
      else if (k in flats) flats[k as SpellFlatKey] += v;
      else throw new Error(`efeito de spell desconhecido: ${k}`);
    }
  };
  const reached: string[] = [];
  for (const m of def.milestones) {
    if (slot.level >= m.level) { add(m.effect); reached.push(m.id); }
  }
  for (const modId of slot.modifiers ?? []) {
    const m = modifierDef(def.id, modId);
    if (!m) throw new Error(`modificador ${modId} não é do conjunto de ${def.id}`);
    add(m.effect);
  }
  for (const e of relicEffects) add(e);
  return { lists, flats, reached };
}

/**
 * spell_stats.lua `compute` (sem evolução). O dano de lá é dividido pelo dano base do herói de lá (8) e vira
 * multiplicador sobre o dano do herói daqui, que já leva o dano percentual global; distâncias passam a metros.
 */
export function spellStats(
  slot: SpellSlotLike, ctx: SpellContext, relicEffects: readonly SpellEffect[] = [],
): SpellStats {
  const def = spellDef(slot.id);
  const level = Math.max(1, Math.min(SPELL_MAX_LEVEL, Math.floor(slot.level)));
  const { lists: L, flats: F, reached } = collectSpellEffects({ ...slot, level }, relicEffects);
  const sp = spMult(ctx.spellPower);
  const levelScale = spellLevelScale(level);
  const areaMult = ctx.area * stackMultiplier(L.areaPct);
  const cooldownMult = Math.max(SPELL_TUNING.cooldownFloor, ctx.cooldownMult * stackMultiplier(L.cooldownPct));
  const st: SpellStats = {
    id: def.id, kind: def.kind, level, milestones: reached, levelScale,
    damage: def.baseDamage !== undefined
      ? ((def.baseDamage + DR_SPELL_POWER * (def.damageScale ?? 0)) * sp * levelScale * stackMultiplier(L.damagePct)) / DR_BASE_DAMAGE
      : 0,
    cooldown: def.cooldown * cooldownMult,
    cooldownMult,
    range: px(def.range) * ctx.range * stackMultiplier(L.rangePct),
    areaMult,
    radius: px(def.radius ?? 0) * areaMult,
  };
  if (def.projectileSpeed !== undefined) st.speed = px(def.projectileSpeed);

  if (def.burnDps !== undefined) {
    const burnBase = (def.burnDps + DR_SPELL_POWER * SPELL_TUNING.burnSpScale) * sp * (1 + SPELL_TUNING.burnLevelStep * (level - 1));
    st.burnDps = (burnBase / DR_BASE_DAMAGE) * ctx.status;
    st.burnDuration = (def.burnDuration ?? 0) + F.burnDurationFlat;
    st.volatile = stackChance(L.volatileChance);
  }
  if (def.slow !== undefined) {
    st.slow = Math.max(0, Math.min(SPELL_TUNING.slowMax, def.slow + F.slowPoints));
    st.slowDuration = ((def.slowDuration ?? 0) + F.slowDurationFlat) * ctx.status * stackMultiplier(L.slowDurationPct);
    st.brittle = F.brittle;
  }
  if (def.targets !== undefined) {
    st.targets = def.targets + F.targets;
    st.chainRange = px(def.chainRange ?? 0) * stackMultiplier(L.chainRangePct);
    st.doubleHit = stackChance(L.doubleHitChance);
  }
  if (def.kind === "projectile") st.projectiles = (def.projectiles ?? 1) + F.projectiles;
  if (def.id === "arcane_bolt") st.echo = stackChance(L.echoChance);
  if (def.heal !== undefined) {
    // como lá, o nível não escala a cura; só os marcos (D-029)
    st.heal = (def.heal + F.healFlat) / DR_BASE_HP;
    st.duration = (def.duration ?? 0) + F.durationFlat;
    st.tick = def.tick;
    st.surge = stackChance(L.surgeChance);
    st.extraFields = F.extraFields;
  }

  switch (def.kind) {
    case "orbit":
      st.blades = (def.blades ?? 0) + F.targets;
      st.duration = (def.duration ?? 0) + F.durationFlat;
      st.hitCooldown = def.hitCooldown;
      break;
    case "nova":
      st.stacks = (def.stacks ?? 0) + F.targets + (ctx.poisonStacks ?? 0);
      st.duration = (def.duration ?? 0) + F.durationFlat;
      break;
    case "vortex":
      st.duration = (def.duration ?? 0) + F.durationFlat;
      st.tick = def.tick;
      st.pull = px(def.pull ?? 0) * stackMultiplier(L.pullPct);
      st.bossPull = def.bossPull;
      break;
    case "rune":
      st.duration = (def.duration ?? 0) + F.durationFlat;
      st.maxRunes = (def.maxRunes ?? 0) + F.runes;
      st.root = (def.root ?? 0) + F.rootFlat;
      st.trigger = px(def.trigger ?? 0);
      st.arm = def.arm;
      st.doubleHit = stackChance(L.doubleHitChance);
      break;
    case "beam":
      st.duration = (def.duration ?? 0) + F.durationFlat;
      st.tick = def.tick;
      st.width = px(def.width ?? 0) * stackMultiplier(L.widthPct) * areaMult;
      break;
    case "totem":
      st.duration = (def.duration ?? 0) + F.durationFlat;
      st.tick = def.tick;
      st.knockback = px(def.knockback ?? 0) * stackMultiplier(L.knockbackPct);
      if (F.rootFlat > 0) st.stun = F.rootFlat;
      st.doubleHit = stackChance(L.doubleHitChance);
      break;
  }
  return st;
}

// ---------------------------------------------------------------- espaços (spell_system.lua)

export interface SpellSlotState { id: string; level: number; modifiers: string[] }
export type SlotResult = { ok: true } | { ok: false; reason: "unknown" | "owned" | "no_slot" | "max_level" | "not_in_pool" };

/** `addSpell`: spell nova só com espaço livre; começa no nível 1 e fica até o fim da partida. */
export function addSpell(spells: SpellSlotState[], id: string, newSlot: (id: string) => SpellSlotState): SlotResult {
  if (!isSpellId(id)) return { ok: false, reason: "unknown" };
  if (spells.some((s) => s.id === id)) return { ok: false, reason: "owned" };
  if (spells.length >= MAX_SPELLS) return { ok: false, reason: "no_slot" };
  spells.push(newSlot(id));
  return { ok: true };
}

/** `levelUp`: +1 nível até o máximo (5). */
export function levelUpSpell(spells: SpellSlotState[], index: number): SlotResult {
  const slot = spells[index];
  if (!slot) return { ok: false, reason: "no_slot" };
  if (slot.level >= SPELL_MAX_LEVEL) return { ok: false, reason: "max_level" };
  slot.level++;
  return { ok: true };
}

/** `addModifier`: só modificadores do conjunto da própria spell. Como lá, não recusa repetido (a loja não oferece). */
export function addModifier(spells: SpellSlotState[], index: number, modId: string): SlotResult {
  const slot = spells[index];
  if (!slot) return { ok: false, reason: "no_slot" };
  if (!isSpellId(slot.id) || !modifierDef(slot.id, modId)) return { ok: false, reason: "not_in_pool" };
  slot.modifiers.push(modId);
  return { ok: true };
}
