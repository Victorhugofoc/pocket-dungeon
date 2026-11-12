// Os 9 heróis do Dungeon Reign (dungeon-idle/src/data/characters.lua), adaptados para o RPG.
// Os efeitos de atributo vêm de lá; elementos viraram `statusPct`/`damagePct`.
import type { StatBlock } from "../core/stats";

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

export type TechniqueKind =
  | "nova" | "blink" | "field" | "dash" | "burst" | "leap" | "shadow" | "aegis" | "brood";

export interface Technique {
  id: string;
  name: string;
  text: string;
  kind: TechniqueKind;
  cooldown: number;
  damage: number;
  radius?: number;
  range?: number;
  duration?: number;
  count?: number;
  status?: StatusSpec;
}

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
  passive: string;
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
      status: { kind: "slow", power: 0.35, duration: 2.0 } },
    technique: { id: "glacial_nova", name: "Nova Glacial", kind: "nova", cooldown: 11, damage: 2.4, radius: 7,
      text: "Explosão de gelo ao redor: dano em área e congela os inimigos por 2 s.",
      status: { kind: "stun", power: 1, duration: 2.0 } },
    passive: "Seus tiros deixam os inimigos lentos.",
  },
  kaelen: {
    id: "kaelen", name: "Kaelen", title: "Duelista da Tempestade", identity: "Raio, crítico, mobilidade",
    color: 0xffe066, accent: 0x6fa8ff, weapon: "sword", weaponName: "Lâmina",
    stats: { attackSpeedPct: 0.18, moveSpeedPct: 0.10, critChance: 0.08, critDamagePct: 0.10, maxHpPct: -0.10, armor: -5 },
    auto: { kind: "projectile", rate: 2.1, damage: 0.85, range: 13, speed: 34, color: 0xfff29a,
      ricochet: 2, ricochetDamage: 0.6 },
    technique: { id: "storm_step", name: "Passo da Tempestade", kind: "blink", cooldown: 7, damage: 2.6, range: 10,
      text: "Teleporta na direção do cursor e eletrocuta tudo no caminho." },
    passive: "Cada raio salta para até 2 inimigos próximos.",
  },
  aurelius: {
    id: "aurelius", name: "Aurelius", title: "Sábio Arcano", identity: "Magia, recarga, regeneração",
    color: 0xd08cff, accent: 0xffe9a8, weapon: "staff", weaponName: "Cajado",
    stats: { cdrPct: 0.15, regen: 0.4, maxHpPct: 0.08, areaPct: 0.15, moveSpeedPct: -0.05 },
    auto: { kind: "projectile", rate: 1.5, damage: 1.15, range: 16, speed: 22, color: 0xd9a0ff, pierce: 2, size: 1.3 },
    technique: { id: "time_rift", name: "Fenda Temporal", kind: "field", cooldown: 12, damage: 0.9, radius: 6, duration: 5,
      text: "Abre uma fenda no cursor por 5 s: inimigos dentro ficam 70% mais lentos e sofrem dano contínuo.",
      status: { kind: "slow", power: 0.7, duration: 0.6 } },
    passive: "Projéteis arcanos atravessam até 2 inimigos.",
  },
  ignis: {
    id: "ignis", name: "Ignis", title: "Inferno", identity: "Fogo, queimadura, pressão",
    color: 0xff7a1a, accent: 0xffd34d, weapon: "claws", weaponName: "Manoplas",
    stats: { statusPct: 0.30, armor: 8, maxHpPct: 0.08, moveSpeedPct: -0.08 },
    auto: { kind: "fan", rate: 1.5, damage: 0.5, range: 8.5, speed: 20, count: 5, spreadDeg: 44, color: 0xff8a2a,
      status: { kind: "burn", power: 0.35, duration: 3, maxStacks: 3 } },
    technique: { id: "inferno_charge", name: "Investida Infernal", kind: "dash", cooldown: 8, damage: 2.4, range: 11,
      text: "Avança em chamas na direção do cursor, queimando quem estiver no caminho.",
      status: { kind: "burn", power: 0.5, duration: 4, maxStacks: 3 } },
    passive: "Leque de fogo de curto alcance; queimaduras acumulam até 3 vezes.",
  },
  zephyr: {
    id: "zephyr", name: "Zephyr", title: "Pistoleiro", identity: "Tiro, velocidade, crítico",
    color: 0xe6b366, accent: 0x8a5a2b, weapon: "guns", weaponName: "Revólveres",
    stats: { damagePct: 0.20, attackSpeedPct: 0.16, critChance: 0.10, moveSpeedPct: 0.08, maxHpPct: 0.10, armor: 8 },
    auto: { kind: "projectile", rate: 2.6, damage: 0.8, range: 16, speed: 42, color: 0xffe9b0,
      ricochet: 1, ricochetDamage: 0.7, size: 0.8 },
    technique: { id: "fan_the_hammer", name: "Leque de Balas", kind: "burst", cooldown: 8, damage: 0.9, count: 10,
      text: "Descarrega 10 tiros rápidos em leque na direção do cursor." },
    passive: "Todo tiro ricocheteia 1 vez (70% do dano).",
  },
  varok: {
    id: "varok", name: "Varok", title: "Matador de Chefes", identity: "Maça, golpes pesados, resistência",
    color: 0xf2594a, accent: 0xb9c2cc, weapon: "mace", weaponName: "Maça",
    stats: { damagePct: 0.35, maxHpPct: 0.60, armor: 14 },
    auto: { kind: "melee", rate: 1.05, damage: 2.3, range: 3.4, arcDeg: 130, color: 0xffb3a8 },
    technique: { id: "execution_leap", name: "Salto de Execução", kind: "leap", cooldown: 9, damage: 4.0, radius: 4.5, range: 11,
      text: "Salta até o cursor e esmaga o chão: dano em área e atordoa por 1 s.",
      status: { kind: "stun", power: 1, duration: 1.0 } },
    passive: "Inquebrável: um golpe tira no máximo 50% da vida.",
    maxHitFraction: 0.5,
  },
  umbra: {
    id: "umbra", name: "Umbra", title: "Assassina das Sombras", identity: "Esquiva, crítico, golpes pelas costas",
    color: 0xb87aff, accent: 0x2a1a3d, weapon: "daggers", weaponName: "Adagas",
    stats: { dodge: 0.20, critChance: 0.15, critDamagePct: 0.25, moveSpeedPct: 0.12, armor: 6 },
    auto: { kind: "melee", rate: 2.4, damage: 1.05, range: 2.8, arcDeg: 80, color: 0xd9b3ff, backstab: 0.5 },
    technique: { id: "shadow_step", name: "Passo Sombrio", kind: "shadow", cooldown: 6, damage: 2.0, range: 10, duration: 2.5,
      text: "Teleporta até o cursor, fere quem estiver ao redor e garante críticos por 2,5 s." },
    passive: "+50% de dano em inimigos atordoados ou lentos.",
  },
  seraph: {
    id: "seraph", name: "Seraph", title: "Paladino", identity: "Armadura, cura, escudo",
    color: 0xffdb73, accent: 0xffffff, weapon: "shield", weaponName: "Escudo",
    stats: { maxHpPct: 0.35, armor: 18, regen: 0.3, attackSpeedPct: -0.10, moveSpeedPct: -0.08 },
    auto: { kind: "projectile", rate: 1.3, damage: 1.25, range: 12, speed: 20, color: 0xfff0b0, pierce: 1,
      ricochet: 2, ricochetDamage: 0.8, size: 1.6 },
    technique: { id: "aegis", name: "Égide", kind: "aegis", cooldown: 14, damage: 1.6, radius: 5.5, duration: 4,
      text: "Cura 25% da vida, reduz o dano recebido em 60% por 4 s e empurra os inimigos próximos." },
    passive: "Arremessa o escudo, que atravessa e ricocheteia entre inimigos.",
  },
  vesper: {
    id: "vesper", name: "Vesper", title: "Tecelã de Veneno", identity: "Veneno, abelhas, área",
    color: 0x8cf273, accent: 0x3a2a55, weapon: "staff", weaponName: "Cetro",
    stats: { statusPct: 0.30, areaPct: 0.10, maxHpPct: 0.08 },
    auto: { kind: "projectile", rate: 1.9, damage: 0.7, range: 14, speed: 26, color: 0x9dff7a,
      status: { kind: "poison", power: 0.35, duration: 3, maxStacks: 4 } },
    technique: { id: "brood", name: "Ninhada", kind: "brood", cooldown: 13, damage: 0.55, count: 4, duration: 10,
      text: "Invoca 4 abelhas por 10 s que perseguem, ferroam e envenenam os inimigos.",
      status: { kind: "poison", power: 0.3, duration: 3, maxStacks: 4 } },
    passive: "Cada tiro envenena; o veneno acumula até 4 vezes.",
  },
};
