// Números finais de uma spell e as operações dos espaços de spell. Porta de dungeon-idle src/spells/spell_stats.lua
// (`collect`, `compute`, `extra` sem as evoluções, que entram no M6-06) e src/spells/spell_system.lua (`addSpell`,
// `levelUp`, `addModifier`). Lógica pura: recebe o espaço e os atributos do herói, devolve metros, segundos e
// multiplicadores sobre o dano do herói, como `techniqueStats`.
import {
  EVOLUTIONS, MAX_SPELLS, SPELL_FLAT_KEYS, SPELL_LIST_KEYS, SPELL_MAX_LEVEL, SPELL_TUNING, SPELLS, modifierDef,
  type EvolutionDef, type EvolutionId, type SpellDef, type SpellEffect, type SpellFlatKey, type SpellId, type SpellKind, type SpellListKey,
} from "../data/spells";
import { DR_BASE_DAMAGE, DR_BASE_HP, DR_SPELL_POWER } from "../data/techniques";
import type { FinalStats } from "./stats";
import { px, stackMultiplier } from "./techniques";
import { PACE } from "../data/pace";

/** O que a spell precisa dos atributos do herói (subconjunto de FinalStats). */
export interface SpellContext {
  /** recarga global no formato do pool (FinalStats.cooldownValue; negativo = mais rápida), somada ao pool da spell */
  cooldownValue?: number;
  /** área global (FinalStats.areaValue), somada ao pool de área da spell */
  areaValue?: number;
  range: number;
  /** poder de magia na escala de lá (8 no início; FinalStats.spellPower) */
  spellPower?: number;
  /** dano de spell (FinalStats.spellDamage) */
  spellDamage?: number;
  /** dano por escola (FinalStats.school); escola sem bônus próprio vale 1 */
  school?: Partial<Record<string, number>>;
  /** queimadura (FinalStats.burn) */
  burn?: number;
  /** pontos de lentidão do herói (FinalStats.slowPoints) */
  slowPoints?: number;
  /** duração da lentidão (FinalStats.slowDuration) */
  slowDuration?: number;
  /** dano de veneno (FinalStats.poison) */
  poison?: number;
  /** acúmulos extras de veneno do herói (Vesper; stats `poisonStacks` de lá) */
  poisonStacks?: number;
}

/** O que as spells leem dos atributos finais do herói (D14). */
export function spellContext(s: FinalStats): SpellContext {
  return {
    cooldownValue: s.cooldownValue, areaValue: s.areaValue, range: s.range, spellPower: s.spellPower,
    spellDamage: s.spellDamage, school: s.school, burn: s.burn, slowPoints: s.slowPoints,
    slowDuration: s.slowDuration, poison: s.poison,
  };
}

/** Um espaço de spell da partida (game_state.lua `newSpellSlot`). */
export interface SpellSlotLike {
  id: string;
  level: number;
  modifiers?: readonly string[];
  /** evolução da spell (`EVOLUTIONS`); null ou ausente = sem */
  evolution?: string | null;
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
  // ---- evolução (M6-06): só com `evolution`
  evolution?: EvolutionId;
  /** metros (Firewave, Lightning Strike) */
  length?: number;
  /** Blizzard e Firestorm: dano de cada tique, sobre o dano do herói */
  tickDamage?: number;
  /** Sanctuary: dano de cada pulso a quem está no anel (lá sai de behaviors.lua, não de spell_stats.lua) */
  fieldDamage?: number;
  /** Blade Storm: o raio abre até aqui durante o giro (metros) */
  maxRadius?: number;
  /** Plague Bloom: quem morre envenenado passa `spreadStacks` acúmulos a quem está a até `spreadRadius` m */
  spreadRadius?: number;
  spreadStacks?: number;
  /** Maelstrom: m/s atrás da mira; arremesso (m), raio do choque (m) e fração do dano do choque */
  followSpeed?: number;
  flingDistance?: number;
  flingRadius?: number;
  flingFraction?: number;
  /** Rune Circle: alcance da ligação e largura da linha (m), tique e dano da linha */
  linkRange?: number;
  lineWidth?: number;
  lineTick?: number;
  lineDamage?: number;
  /** Spectrum: ângulo e comprimento (m) dos 3 raios, dano deles, saltos do amarelo */
  splitAngle?: number;
  splitLength?: number;
  rayDamage?: number;
  jumps?: number;
  jumpRange?: number;
  jumpDamage?: number;
  /** Earthen Ward: raio que atrai (m) e golpes até quebrar */
  lureRadius?: number;
  wardHits?: number;
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
  if (!isSpellId(id)) throw new Error(`unknown spell: ${id}`);
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
      else throw new Error(`unknown spell effect: ${k}`);
    }
  };
  const reached: string[] = [];
  for (const m of def.milestones) {
    if (slot.level >= m.level) { add(m.effect); reached.push(m.id); }
  }
  for (const modId of slot.modifiers ?? []) {
    const m = modifierDef(def.id, modId);
    if (!m) throw new Error(`modifier ${modId} is not in the set of ${def.id}`);
    add(m.effect);
  }
  for (const e of relicEffects) add(e);
  return { lists, flats, reached };
}

/** A evolução do espaço, se é desta spell (a de outra spell é ignorada). */
export function slotEvolution(slot: SpellSlotLike): EvolutionDef | undefined {
  const id = slot.evolution;
  if (!id || !Object.prototype.hasOwnProperty.call(EVOLUTIONS, id)) return undefined;
  const evo = EVOLUTIONS[id as EvolutionId];
  return evo.spell === slot.id ? evo : undefined;
}

/**
 * spell_stats.lua `compute`. O dano de lá é dividido pelo dano base do herói de lá (8) e vira multiplicador sobre o
 * dano do herói daqui, que já leva o dano percentual global; distâncias passam a metros. Com evolução, os números da
 * forma nova (`EVOLUTIONS`) e a conversão dos modificadores que ela não usa (D-437).
 */
export function spellStats(
  slot: SpellSlotLike, ctx: SpellContext, relicEffects: readonly SpellEffect[] = [],
): SpellStats {
  const def = spellDef(slot.id);
  const level = Math.max(1, Math.min(SPELL_MAX_LEVEL, Math.floor(slot.level)));
  const { lists: L, flats: F, reached } = collectSpellEffects({ ...slot, level }, relicEffects);
  const sp = spMult(ctx.spellPower);
  const levelScale = spellLevelScale(level);
  const evo = slotEvolution(slot);
  // §34: a recarga e a área globais entram no mesmo pool que as da spell (D14)
  const areaMult = stackMultiplier([...(ctx.areaValue ? [ctx.areaValue] : []), ...L.areaPct]) * PACE.spellAreaMult;
  const cooldownMult = Math.max(SPELL_TUNING.cooldownFloor,
    stackMultiplier([...(ctx.cooldownValue ? [ctx.cooldownValue] : []), ...L.cooldownPct]) * (evo?.cooldownMult ?? 1));
  const school = ctx.school?.[def.school] ?? 1;
  const burnMult = (ctx.burn ?? 1) * (ctx.school?.fire ?? 1);
  const slowDurMult = ctx.slowDuration ?? 1;
  const st: SpellStats = {
    id: def.id, kind: def.kind, level, milestones: reached, levelScale,
    damage: def.baseDamage !== undefined
      ? ((def.baseDamage + DR_SPELL_POWER * (def.damageScale ?? 0)) * sp * levelScale * stackMultiplier(L.damagePct)
        * (ctx.spellDamage ?? 1) * school * (evo?.damageMult ?? 1)) / DR_BASE_DAMAGE
      : 0,
    cooldown: def.cooldown * cooldownMult,
    cooldownMult,
    range: px(def.range) * ctx.range * stackMultiplier(L.rangePct),
    areaMult,
    radius: px(evo?.radius ?? def.radius ?? 0) * areaMult,
  };
  if (evo) st.evolution = evo.id;
  if (def.projectileSpeed !== undefined) st.speed = px(def.projectileSpeed);

  if (def.burnDps !== undefined) {
    const burnBase = (def.burnDps + DR_SPELL_POWER * SPELL_TUNING.burnSpScale) * sp * (1 + SPELL_TUNING.burnLevelStep * (level - 1));
    st.burnDps = (burnBase / DR_BASE_DAMAGE) * burnMult * (evo?.burnDpsMult ?? 1);
    st.burnDuration = (evo?.burnDuration ?? def.burnDuration ?? 0) + F.burnDurationFlat;
    st.volatile = stackChance(L.volatileChance);
  }
  if (def.slow !== undefined) {
    st.slow = Math.max(0, Math.min(SPELL_TUNING.slowMax, def.slow + (ctx.slowPoints ?? 0) + F.slowPoints));
    st.slowDuration = ((def.slowDuration ?? 0) + F.slowDurationFlat) * slowDurMult * stackMultiplier(L.slowDurationPct);
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
    st.heal = ((def.heal + F.healFlat) * (evo?.healMult ?? 1)) / DR_BASE_HP;
    st.duration = (evo?.duration ?? def.duration ?? 0) + F.durationFlat;
    st.tick = evo?.tick ?? def.tick;
    st.surge = stackChance(L.surgeChance);
    st.extraFields = F.extraFields;
  }

  switch (def.kind) {
    case "orbit":
      st.blades = (def.blades ?? 0) + F.targets + (evo?.extraBlades ?? 0);
      st.duration = (def.duration ?? 0) + F.durationFlat;
      st.hitCooldown = def.hitCooldown;
      if (evo?.maxRadius !== undefined) st.maxRadius = px(evo.maxRadius);
      break;
    case "nova":
      // o dano de veneno do herói (status.lua: `poisonMult` em cada tique de veneno)
      st.damage *= ctx.poison ?? 1;
      st.stacks = (def.stacks ?? 0) + F.targets + (ctx.poisonStacks ?? 0);
      st.duration = (def.duration ?? 0) + F.durationFlat;
      if (evo) {
        st.spreadRadius = px(evo.spreadRadius ?? 0);
        st.spreadStacks = evo.spreadStacks;
      }
      break;
    case "vortex":
      st.duration = (def.duration ?? 0) + F.durationFlat;
      st.tick = def.tick;
      st.pull = px(def.pull ?? 0) * stackMultiplier(L.pullPct);
      st.bossPull = def.bossPull;
      if (evo) {
        st.followSpeed = px(evo.followSpeed ?? 0);
        st.flingDistance = px(evo.flingDistance ?? 0);
        st.flingRadius = px(evo.flingRadius ?? 0);
        st.flingFraction = evo.flingFraction;
      }
      break;
    case "rune":
      st.duration = (def.duration ?? 0) + F.durationFlat;
      st.maxRunes = (def.maxRunes ?? 0) + F.runes;
      st.root = (def.root ?? 0) + F.rootFlat;
      st.trigger = px(def.trigger ?? 0);
      st.arm = def.arm;
      st.doubleHit = stackChance(L.doubleHitChance);
      if (evo) {
        st.linkRange = px(evo.linkRange ?? 0);
        st.lineWidth = px(evo.lineWidth ?? 0);
        st.lineTick = evo.lineTick;
        st.lineDamage = st.damage * (evo.lineFraction ?? 0);
      }
      break;
    case "beam":
      st.duration = (def.duration ?? 0) + F.durationFlat;
      st.tick = def.tick;
      st.width = px(def.width ?? 0) * stackMultiplier(L.widthPct) * areaMult;
      if (evo) {
        // Spectrum: os 3 raios coloridos a partir do primeiro inimigo
        st.splitAngle = evo.splitAngle;
        st.splitLength = px(evo.splitLength ?? 0);
        st.rayDamage = st.damage * (evo.rayFraction ?? 0);
        st.burnDps = st.damage * (evo.burnFraction ?? 0) * burnMult;
        st.burnDuration = evo.burnDuration;
        st.slow = evo.slow;
        st.slowDuration = (evo.slowDuration ?? 0) * slowDurMult;
        st.jumps = evo.jumps;
        st.jumpRange = px(evo.jumpRange ?? 0);
        st.jumpDamage = st.damage * (evo.jumpFraction ?? 0);
      }
      break;
    case "totem":
      st.duration = (def.duration ?? 0) + F.durationFlat;
      st.tick = def.tick;
      st.knockback = px(def.knockback ?? 0) * stackMultiplier(L.knockbackPct);
      if (F.rootFlat > 0) st.stun = F.rootFlat;
      st.doubleHit = stackChance(L.doubleHitChance);
      if (evo) {
        // Earthen Ward: o ídolo, e um piso de recarga para não ficar de pé o tempo todo (D-511)
        st.lureRadius = px(evo.lureRadius ?? 0);
        st.wardHits = evo.wardHits;
        st.cooldown = Math.max(st.cooldown, evo.minCooldown ?? 0);
      }
      break;
  }
  // as evoluções das spells de projétil, corrente e campo trocam a forma (muralha, linha, tempestade, aura)
  if (evo && ["projectile", "chain", "field"].includes(def.kind)) {
    if (evo.width !== undefined) st.width = px(evo.width);
    if (evo.length !== undefined) st.length = px(evo.length);
    if (evo.kind === "storm") {
      st.duration = evo.duration;
      st.tick = evo.tick;
      st.tickDamage = st.damage * (evo.tickDamageFraction ?? 0);
    } else if (evo.kind === "aura") {
      // Firestorm (D-396): o tique segue a recarga, então reduzir a recarga mantém o dano por segundo
      st.tick = st.cooldown / (evo.ticks ?? 1);
      st.duration = st.cooldown + (evo.durationPad ?? 0);
      st.tickDamage = st.damage * (evo.tickDamageFraction ?? 0);
    } else if (evo.id === "sanctuary") {
      // Sanctuary (D-318, D-354): o anel dourado fere quem está dentro a cada pulso, proporcional ao poder de magia
      st.fieldDamage = ((SPELL_TUNING.sanctuaryDamage + DR_SPELL_POWER * SPELL_TUNING.sanctuaryScale) * sp) / DR_BASE_DAMAGE;
    }
    convertForEvolution(st, slot, evo);
  }
  return st;
}

/**
 * spell_stats.lua `convert` (D-437): a forma evoluída fica com o valor dos modificadores que não usa mais. A parte das
 * relíquias (`relicConvert`) espera as relíquias de spell (`M12`).
 */
function convertForEvolution(st: SpellStats, slot: SpellSlotLike, evo: EvolutionDef): void {
  let dmg = 0;
  let len = 0;
  let wid = 0;
  for (const modId of slot.modifiers ?? []) {
    const c = evo.convert?.[modId];
    if (!c) continue;
    dmg += c.damagePct ?? 0;
    len += c.lengthPct ?? 0;
    wid += c.widthPct ?? 0;
  }
  st.damage *= 1 + dmg;
  if (st.length !== undefined) st.length *= 1 + len;
  if (st.width !== undefined) st.width *= 1 + wid;
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

/** M21-06: aura sai sozinha e a tecla dá o pico (`SpellDef.mode`). */
export function isAura(id: string): boolean {
  return isSpellId(id) && SPELLS[id].mode === "aura";
}

/**
 * Tiques que um efeito por tique ainda daria: o próximo sai em `tickLeft` e depois a cada `tick`, enquanto sobrar
 * `time` (o Healing Field cura no tique em que o tempo chega a zero, então ele conta).
 */
export function remainingTicks(time: number, tickLeft: number, tick: number): number {
  if (time < tickLeft - 1e-9 || tick <= 0) return 0;
  return 1 + Math.floor((time - tickLeft) / tick + 1e-9);
}
