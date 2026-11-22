// Os 9 heróis do Dungeon Reign (dungeon-idle/src/data/characters.lua), adaptados para o RPG.
// Os efeitos de atributo vêm de lá; os de efeito seguem a separação da D14 (escola, queimadura, lentidão, veneno).
import type { StatBlock } from "../core/stats";
import type { SpellId } from "./spells";
import { FROST, RICOCHET, SHADOW, SHIELD_THROW, TECHNIQUES, UNBREAKABLE, VENOM, type TechKind } from "./techniques";

export type StatusKind = "slow" | "burn" | "poison" | "stun";

export interface StatusSpec {
  kind: StatusKind;
  /** slow: fração de redução; burn/poison: fração do dano do golpe por segundo; stun: ignorado */
  power: number;
  duration: number;
  chance?: number;
  maxStacks?: number;
}

export interface AutoAttack {
  kind: "projectile" | "melee" | "fan";
  /** ataques por segundo */
  rate: number;
  damage: number; // multiplicador do dano do herói
  range: number;
  speed?: number;
  count?: number;
  spreadDeg?: number;
  pierce?: number;
  /** saltos para outro inimigo depois do acerto */
  ricochet?: number;
  ricochetDamage?: number;
  arcDeg?: number;
  status?: StatusSpec;
  color: number;
  size?: number;
  /** bônus de dano em inimigos atordoados/lentos (Umbra) */
  backstab?: number;
}

export type TechniqueKind = TechKind;

/** O que a interface mostra da técnica; os números de jogo vêm de TECHNIQUES via techniqueStats (src/core/techniques.ts). */
export interface Technique {
  id: string;
  name: string;
  text: string;
  kind: TechniqueKind;
  cooldown: number;
  /** escola da técnica (elemento das reações, M21-05) */
  school: string;
}

/** Monta a ficha da técnica a partir dos dados portados do Dungeon Reign. */
const tech = (id: string): Technique => {
  const d = TECHNIQUES[id];
  return { id, name: d.name, text: d.text, kind: d.kind, cooldown: d.cooldown, school: d.school };
};

export type WeaponKind = "staff" | "sword" | "guns" | "mace" | "daggers" | "shield" | "claws";

export interface HeroDef {
  id: string;
  name: string;
  title: string;
  identity: string;
  color: number;
  accent: number;
  weapon: WeaponKind;
  weaponName: string;
  stats: StatBlock;
  auto: AutoAttack;
  technique: Technique;
  /** as 4 spells que o herói pode escolher para começar (characters.lua `startingSpells`, mesma ordem) */
  startingSpells: readonly SpellId[];
  /** linhas da passiva, uma por regra (textos do passiveText do Dungeon Reign) */
  passive: string[];
  /** passiva de gelo da Frostine (src/core/frost.ts, números em FROST) */
  frost?: boolean;
  /** Seraph: a cada SHIELD_THROW.healEvery arremessos, cura */
  shieldHeal?: boolean;
  /** Vesper: Ninhada, abelhas pequenas que nascem sozinhas (VENOM) */
  nest?: boolean;
  /** dano máximo de um golpe, em fração da vida (Varok) */
  maxHitFraction?: number;
  /** characters.lua `runMods` (D-207, Boss Killer do Varok): agem na partida como uma camada de sala ou pacto */
  runMods?: HeroRunMods;
  /** characters.lua `runModText` ("Run rules" na escolha do herói) */
  runModText?: string[];
}

/** characters.lua `runMods`, lido por `modifier_engine.lua` `heroMods`. O que falta vale 1 (ou não age). */
export interface HeroRunMods {
  enemyCount?: number;
  bossHp?: number;
  bossDamage?: number;
  /** recompensa de inimigo comum e campeão (`killReward`), e do chefe (`bossReward`) */
  killReward?: number;
  bossReward?: number;
  /** parte da onda comum que vem como campeão, pela onda (1 a 5) e depois (`default`) */
  championShare?: { byWave: readonly number[]; default: number };
  /** vida dos inimigos ×(1+x)^(onda−1) e dano ×(1 + x·(onda−1)) (D-216) */
  enemyHpGrowth?: number;
  enemyDamagePerWave?: number;
  /** chefe até a onda `upTo` com a vida ×`mult` (D-217) */
  earlyBoss?: { upTo: number; mult: number };
  /** o rei coroado da onda 20 não leva a vida extra da dificuldade (D-644) */
  noCrownHp?: boolean;
}

export const HERO_ORDER = ["frostine", "kaelen", "aurelius", "ignis", "zephyr", "varok", "umbra", "seraph", "vesper"] as const;

export const HEROES: Record<string, HeroDef> = {
  frostine: {
    id: "frostine", name: "Frostine", title: "Ice Warden", identity: "Ice, defense, control",
    color: 0x8fdcff, accent: 0xe8f8ff, weapon: "staff", weaponName: "Staff",
    stats: { maxHpPct: 0.22, icePct: 0.35, slowDurationPct: 0.12, armor: 12, firePct: -0.50 },
    auto: { kind: "projectile", rate: 1.7, damage: 1.0, range: 15, speed: 24, color: 0x9be4ff,
      status: { kind: "slow", power: FROST.autoSlow, duration: FROST.autoSlowTime } },
    // os números da técnica vêm de TECHNIQUES (techniqueStats); aqui só o que a interface mostra
    technique: tech("glacial_wall"),
    startingSpells: ["iceball", "arcane_bolt", "rune_traps", "cyclone"],
    passive: [...FROST.passiveText],
    frost: true,
  },
  kaelen: {
    id: "kaelen", name: "Kaelen", title: "Storm Duelist", identity: "Lightning, crit, mobility",
    color: 0xffe066, accent: 0x6fa8ff, weapon: "sword", weaponName: "Blade",
    stats: { attackSpeedPct: 0.18, lightningPct: 0.10, moveSpeedPct: 0.10, critChance: 0.08, critDamagePct: 0.10, maxHpPct: -0.10, armor: -5 },
    auto: { kind: "projectile", rate: 2.1, damage: 0.85, range: 13, speed: 34, color: 0xfff29a,
      ricochet: 2, ricochetDamage: 0.6 },
    technique: tech("storm_step"),
    startingSpells: ["chain_lightning", "fireball", "cyclone", "blade_orbit"],
    passive: ["Every bolt jumps to up to 2 nearby enemies."],
  },
  aurelius: {
    id: "aurelius", name: "Aurelius", title: "Arcane Sage", identity: "Magic, cooldown, regeneration",
    color: 0xd08cff, accent: 0xffe9a8, weapon: "staff", weaponName: "Staff",
    stats: { spellDamagePct: 0.10, cdrPct: 0.04, regen: 0.4, maxHpPct: 0.08, autoDamagePct: -0.12, moveSpeedPct: -0.05 },
    auto: { kind: "projectile", rate: 1.5, damage: 1.15, range: 16, speed: 22, color: 0xd9a0ff, pierce: 2, size: 1.3 },
    technique: tech("time_rift"),
    startingSpells: ["arcane_bolt", "iceball", "prism_beam", "rune_traps"],
    passive: ["Arcane projectiles pierce up to 2 enemies."],
  },
  ignis: {
    id: "ignis", name: "Ignis", title: "Inferno", identity: "Fire, burn, pressure",
    color: 0xff7a1a, accent: 0xffd34d, weapon: "claws", weaponName: "Gauntlets",
    stats: { firePct: 0.25, burnPct: 0.30, burnStacks: 2, armor: 8, maxHpPct: 0.08, icePct: -0.10, moveSpeedPct: -0.08 },
    auto: { kind: "fan", rate: 1.5, damage: 0.5, range: 8.5, speed: 20, count: 5, spreadDeg: 44, color: 0xff8a2a,
      status: { kind: "burn", power: 0.35, duration: 3, maxStacks: 3 } },
    technique: tech("inferno_charge"),
    startingSpells: ["fireball", "chain_lightning", "blade_orbit", "quake_totem"],
    passive: ["Short-range fire fan; burns stack up to 3 times."],
  },
  zephyr: {
    id: "zephyr", name: "Zephyr", title: "Gunslinger", identity: "Shooting, speed, crit",
    color: 0xe6b366, accent: 0x8a5a2b, weapon: "guns", weaponName: "Revolvers",
    stats: { autoDamagePct: 0.38, attackSpeedPct: 0.16, critChance: 0.10, moveSpeedPct: 0.08, spellDamagePct: -0.05, maxHpPct: 0.20, armor: 16 },
    auto: { kind: "projectile", rate: 2.6, damage: 0.8, range: 16, speed: 42, color: 0xffe9b0,
      ricochet: 1, ricochetDamage: 0.7, size: 0.8 },
    technique: tech("fan_the_hammer"),
    startingSpells: ["fireball", "chain_lightning", "cyclone", "prism_beam"],
    passive: [...RICOCHET.passiveText],
  },
  varok: {
    id: "varok", name: "Varok", title: "Boss Slayer", identity: "Mace, few enemies, giant bosses",
    color: 0xf2594a, accent: 0xb9c2cc, weapon: "mace", weaponName: "Mace",
    stats: { damagePct: 0.95, maxHpPct: 0.80, armor: 8 },
    auto: { kind: "melee", rate: 1.05, damage: 1.8, range: 3.4, arcDeg: 130, color: 0xffb3a8 },
    technique: tech("execution_leap"),
    startingSpells: ["quake_totem", "fireball", "iceball", "blade_orbit"],
    passive: [...UNBREAKABLE.passiveText],
    maxHitFraction: UNBREAKABLE.maxHitFraction,
    runMods: {
      enemyCount: 0.30, bossHp: 4.3, killReward: 0.6, bossReward: 2.0,
      championShare: { byWave: [0, 0.10, 0.20, 0.30, 0.40], default: 0.50 },
      enemyHpGrowth: 0.03, enemyDamagePerWave: 0.03,
      bossDamage: 2.1, earlyBoss: { upTo: 5, mult: 0.6 },
      noCrownHp: true,
    },
    runModText: ["-70% enemies, half Champions", "Bosses: +330% HP, x2.1 damage", "Enemies +3% per wave", "Bosses: x2 gold and XP"],
  },
  umbra: {
    id: "umbra", name: "Umbra", title: "Shadow Assassin", identity: "Dodge, crit, back hits",
    color: 0xb87aff, accent: 0x2a1a3d, weapon: "daggers", weaponName: "Daggers",
    stats: { dodge: 0.20, critChance: 0.15, critDamagePct: 0.25, moveSpeedPct: 0.12, armor: 6 },
    auto: { kind: "melee", rate: 2.4, damage: 1.05, range: 2.8, arcDeg: 80, color: 0xd9b3ff, backstab: 0.5 },
    technique: tech("shadow_step"),
    startingSpells: ["arcane_bolt", "blade_orbit", "venom_nova", "rune_traps"],
    passive: [...SHADOW.passiveText],
  },
  seraph: {
    id: "seraph", name: "Seraph", title: "Paladin", identity: "Armor, healing, shield",
    color: 0xffdb73, accent: 0xffffff, weapon: "shield", weaponName: "Shield",
    stats: { maxHpPct: 0.35, armor: 18, regen: 0.3, healPct: 0.15, bossDamagePct: 0.25, attackSpeedPct: -0.10, moveSpeedPct: -0.08 },
    auto: { kind: "projectile", rate: 1.3, damage: 1.25, range: 12, speed: 20, color: 0xfff0b0, pierce: 1,
      ricochet: 2, ricochetDamage: 0.8, size: 1.6 },
    technique: tech("aegis"),
    startingSpells: ["arcane_bolt", "blade_orbit", "prism_beam", "quake_totem"],
    passive: [...SHIELD_THROW.passiveText],
    shieldHeal: true,
  },
  vesper: {
    id: "vesper", name: "Vesper", title: "Venom Weaver", identity: "Poison, bees, area",
    color: 0x8cf273, accent: 0x3a2a55, weapon: "staff", weaponName: "Scepter",
    stats: { poisonPct: 0.30, poisonStacks: 1, areaPct: 0.10, maxHpPct: 0.08 },
    auto: { kind: "projectile", rate: 1.9, damage: 0.7, range: 14, speed: 26, color: 0x9dff7a,
      status: { kind: "poison", power: VENOM.autoFraction, duration: VENOM.autoDuration, maxStacks: VENOM.autoStacks } },
    technique: tech("brood"),
    startingSpells: ["venom_nova", "quake_totem", "arcane_bolt", "rune_traps"],
    passive: [...VENOM.passiveText, `Poison: every shot poisons (up to ${VENOM.autoStacks + 1} stacks).`],
    nest: true,
  },
};
