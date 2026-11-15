// Os 9 heróis do Dungeon Reign (dungeon-idle/src/data/characters.lua), adaptados para o RPG.
// Os efeitos de atributo vêm de lá; elementos viraram `statusPct`/`damagePct`.
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
}

/** Monta a ficha da técnica a partir dos dados portados do Dungeon Reign. */
const tech = (id: string): Technique => {
  const d = TECHNIQUES[id];
  return { id, name: d.name, text: d.text, kind: d.kind, cooldown: d.cooldown };
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
}

export const HERO_ORDER = ["frostine", "kaelen", "aurelius", "ignis", "zephyr", "varok", "umbra", "seraph", "vesper"] as const;

export const HEROES: Record<string, HeroDef> = {
  frostine: {
    id: "frostine", name: "Frostine", title: "Guardiã do Gelo", identity: "Gelo, defesa, controle",
    color: 0x8fdcff, accent: 0xe8f8ff, weapon: "staff", weaponName: "Cajado",
    stats: { maxHpPct: 0.22, armor: 12, statusPct: 0.25 },
    auto: { kind: "projectile", rate: 1.7, damage: 1.0, range: 15, speed: 24, color: 0x9be4ff,
      status: { kind: "slow", power: FROST.autoSlow, duration: FROST.autoSlowTime } },
    // os números da técnica vêm de TECHNIQUES (techniqueStats); aqui só o que a interface mostra
    technique: tech("glacial_wall"),
    startingSpells: ["iceball", "arcane_bolt", "rune_traps", "cyclone"],
    passive: [...FROST.passiveText],
    frost: true,
  },
  kaelen: {
    id: "kaelen", name: "Kaelen", title: "Duelista da Tempestade", identity: "Raio, crítico, mobilidade",
    color: 0xffe066, accent: 0x6fa8ff, weapon: "sword", weaponName: "Lâmina",
    stats: { attackSpeedPct: 0.18, moveSpeedPct: 0.10, critChance: 0.08, critDamagePct: 0.10, maxHpPct: -0.10, armor: -5 },
    auto: { kind: "projectile", rate: 2.1, damage: 0.85, range: 13, speed: 34, color: 0xfff29a,
      ricochet: 2, ricochetDamage: 0.6 },
    technique: tech("storm_step"),
    startingSpells: ["chain_lightning", "fireball", "cyclone", "blade_orbit"],
    passive: ["Cada raio salta para até 2 inimigos próximos."],
  },
  aurelius: {
    id: "aurelius", name: "Aurelius", title: "Sábio Arcano", identity: "Magia, recarga, regeneração",
    color: 0xd08cff, accent: 0xffe9a8, weapon: "staff", weaponName: "Cajado",
    stats: { cdrPct: 0.15, regen: 0.4, maxHpPct: 0.08, areaPct: 0.15, moveSpeedPct: -0.05 },
    auto: { kind: "projectile", rate: 1.5, damage: 1.15, range: 16, speed: 22, color: 0xd9a0ff, pierce: 2, size: 1.3 },
    technique: tech("time_rift"),
    startingSpells: ["arcane_bolt", "iceball", "prism_beam", "rune_traps"],
    passive: ["Projéteis arcanos atravessam até 2 inimigos."],
  },
  ignis: {
    id: "ignis", name: "Ignis", title: "Inferno", identity: "Fogo, queimadura, pressão",
    color: 0xff7a1a, accent: 0xffd34d, weapon: "claws", weaponName: "Manoplas",
    stats: { statusPct: 0.30, armor: 8, maxHpPct: 0.08, moveSpeedPct: -0.08 },
    auto: { kind: "fan", rate: 1.5, damage: 0.5, range: 8.5, speed: 20, count: 5, spreadDeg: 44, color: 0xff8a2a,
      status: { kind: "burn", power: 0.35, duration: 3, maxStacks: 3 } },
    technique: tech("inferno_charge"),
    startingSpells: ["fireball", "chain_lightning", "blade_orbit", "quake_totem"],
    passive: ["Leque de fogo de curto alcance; queimaduras acumulam até 3 vezes."],
  },
  zephyr: {
    id: "zephyr", name: "Zephyr", title: "Pistoleiro", identity: "Tiro, velocidade, crítico",
    color: 0xe6b366, accent: 0x8a5a2b, weapon: "guns", weaponName: "Revólveres",
    stats: { damagePct: 0.20, attackSpeedPct: 0.16, critChance: 0.10, moveSpeedPct: 0.08, maxHpPct: 0.10, armor: 8 },
    auto: { kind: "projectile", rate: 2.6, damage: 0.8, range: 16, speed: 42, color: 0xffe9b0,
      ricochet: 1, ricochetDamage: 0.7, size: 0.8 },
    technique: tech("fan_the_hammer"),
    startingSpells: ["fireball", "chain_lightning", "cyclone", "prism_beam"],
    passive: [...RICOCHET.passiveText],
  },
  varok: {
    id: "varok", name: "Varok", title: "Matador de Chefes", identity: "Maça, golpes pesados, resistência",
    color: 0xf2594a, accent: 0xb9c2cc, weapon: "mace", weaponName: "Maça",
    stats: { damagePct: 0.35, maxHpPct: 0.60, armor: 14 },
    auto: { kind: "melee", rate: 1.05, damage: 2.3, range: 3.4, arcDeg: 130, color: 0xffb3a8 },
    technique: tech("execution_leap"),
    startingSpells: ["quake_totem", "fireball", "iceball", "blade_orbit"],
    passive: [...UNBREAKABLE.passiveText],
    maxHitFraction: UNBREAKABLE.maxHitFraction,
  },
  umbra: {
    id: "umbra", name: "Umbra", title: "Assassina das Sombras", identity: "Esquiva, crítico, golpes pelas costas",
    color: 0xb87aff, accent: 0x2a1a3d, weapon: "daggers", weaponName: "Adagas",
    stats: { dodge: 0.20, critChance: 0.15, critDamagePct: 0.25, moveSpeedPct: 0.12, armor: 6 },
    auto: { kind: "melee", rate: 2.4, damage: 1.05, range: 2.8, arcDeg: 80, color: 0xd9b3ff, backstab: 0.5 },
    technique: tech("shadow_step"),
    startingSpells: ["arcane_bolt", "blade_orbit", "venom_nova", "rune_traps"],
    passive: [...SHADOW.passiveText],
  },
  seraph: {
    id: "seraph", name: "Seraph", title: "Paladino", identity: "Armadura, cura, escudo",
    color: 0xffdb73, accent: 0xffffff, weapon: "shield", weaponName: "Escudo",
    stats: { maxHpPct: 0.35, armor: 18, regen: 0.3, attackSpeedPct: -0.10, moveSpeedPct: -0.08 },
    auto: { kind: "projectile", rate: 1.3, damage: 1.25, range: 12, speed: 20, color: 0xfff0b0, pierce: 1,
      ricochet: 2, ricochetDamage: 0.8, size: 1.6 },
    technique: tech("aegis"),
    startingSpells: ["arcane_bolt", "blade_orbit", "prism_beam", "quake_totem"],
    passive: [...SHIELD_THROW.passiveText],
    shieldHeal: true,
  },
  vesper: {
    id: "vesper", name: "Vesper", title: "Tecelã de Veneno", identity: "Veneno, abelhas, área",
    color: 0x8cf273, accent: 0x3a2a55, weapon: "staff", weaponName: "Cetro",
    stats: { statusPct: 0.30, areaPct: 0.10, maxHpPct: 0.08 },
    auto: { kind: "projectile", rate: 1.9, damage: 0.7, range: 14, speed: 26, color: 0x9dff7a,
      status: { kind: "poison", power: VENOM.autoFraction, duration: VENOM.autoDuration, maxStacks: VENOM.autoStacks } },
    technique: tech("brood"),
    startingSpells: ["venom_nova", "quake_totem", "arcane_bolt", "rune_traps"],
    passive: [...VENOM.passiveText, `Veneno: cada tiro envenena (até ${VENOM.autoStacks} acúmulos).`],
    nest: true,
  },
};
