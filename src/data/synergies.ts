// Sinergias (dungeon-idle/src/data/synergies.lua §49): bônus ao juntar tags de build (`run.tags`). Cada uma pede
// um mínimo por tag (`requires`) e soma os `effects` enquanto vale; várias valem juntas (§50) e uma some se as tags
// caírem abaixo do limiar. Lá são 17 (o roadmap dizia 23). Os textos são os de `lang/en.lua`. As evoluções de
// build de 8 tags e a identidade (§51, §52) ficam na `M12-09`.
import type { StatKey } from "../core/stats";

export interface SynergyEffect {
  stat: StatKey;
  value: number;
}

export interface SynergyDef {
  id: string;
  name: string;
  /** tag → pontos mínimos */
  requires: Record<string, number>;
  effects: SynergyEffect[];
  text: string;
}

/** synergies.lua `PATHS`: os caminhos principais da build (evolução de 8 tags e identidade). */
export const BUILD_PATHS = ["auto", "fire", "ice", "lightning", "arcane", "healing", "dodge"] as const;

/** synergies.lua `PATH_NAMES` */
export const PATH_NAMES: Record<string, string> = {
  auto: "Auto", fire: "Fire", ice: "Ice", lightning: "Lightning", arcane: "Arcane",
  healing: "Healing", dodge: "Dodge", survival: "Survival", magic: "Magic",
};

/** §52: a evolução de build sai com 8 pontos num caminho (synergy_view.lua `EVOLUTION_AT`). */
export const BUILD_EVOLUTION_THRESHOLD = 8;

/** achievements.lua `full_table`: sinergias ativas ao mesmo tempo. */
export const FULL_TABLE_SYNERGIES = 3;

const e = (stat: StatKey, value: number): SynergyEffect => ({ stat, value });
const syn = (id: string, name: string, requires: Record<string, number>, effects: SynergyEffect[], text: string): SynergyDef =>
  ({ id, name, requires, effects, text });

/** synergies.lua `D.synergies`, na mesma ordem. */
export const SYNERGIES: readonly SynergyDef[] = [
  syn("armsmaster", "ARMSMASTER", { auto: 3 }, [e("autoDamagePct", 0.10)], "+10% Auto Damage"),
  syn("battle_frenzy", "BATTLE FRENZY", { auto: 5 }, [e("attackSpeedPct", 0.15)], "+15% Attack Speed"),
  syn("pyromancer", "PYROMANCER", { fire: 3 }, [e("firePct", 0.08)], "+8% Fire Damage"),
  syn("inferno", "INFERNO", { fire: 5 }, [e("firePct", 0.12), e("volatileChance", 0.15)], "+12% Fire Damage, +15% Volatile"),
  syn("cryomancer", "CRYOMANCER", { ice: 3 }, [e("icePct", 0.08)], "+8% Ice Damage"),
  syn("shattermaster", "SHATTERMASTER", { ice: 5 }, [e("slowedDamagePct", 0.15)], "+15% damage vs. Slowed targets"),
  syn("stormcaller", "STORMCALLER", { lightning: 3 }, [e("lightningPct", 0.08)], "+8% Lightning Damage"),
  syn("stormborn", "STORMBORN", { lightning: 5 }, [e("lightningTargets", 1)], "+1 Lightning target"),
  syn("arcanist", "ARCANIST", { arcane: 3 }, [e("arcanePct", 0.08), e("echoChance", 0.10)], "+8% Arcane Damage, +10% Echo"),
  syn("aetherborn", "AETHERBORN", { arcane: 5 }, [e("spellDamagePct", 0.10)], "+10% Spell Damage"),
  syn("sanctuary_syn", "SANCTUARY", { healing: 3 }, [e("healFieldDurationFlat", 0.5), e("healFieldHealFlat", 1)],
    "Healing Field: +0.5s duration, +1 heal per pulse"),
  syn("lifewell", "LIFEWELL", { healing: 5 }, [e("healFieldHealFlat", 1)], "Healing Field: +1 heal per pulse"),
  syn("evasive", "EVASIVE", { dodge: 2 }, [e("dodge", 0.05)], "+5% Dodge"),
  syn("shadowstep", "SHADOWSTEP", { dodge: 4 }, [e("dodge", 0.06)], "+6% Dodge"),
  syn("elemental_triad", "ELEMENTAL TRIAD", { fire: 2, ice: 2, lightning: 2 }, [e("spellDamagePct", 0.08)], "+8% Spell Damage"),
  syn("spellblade", "SPELLBLADE", { auto: 3, magic: 3 }, [e("autoDamagePct", 0.06), e("spellDamagePct", 0.06)],
    "+6% Auto Damage, +6% Spell Damage"),
  syn("wardens_oath", "WARDEN'S OATH", { healing: 3, survival: 2 }, [e("maxHpPct", 0.08)], "+8% Max HP"),
];

export const SYNERGY_BY_ID: Record<string, SynergyDef> = Object.fromEntries(SYNERGIES.map((s) => [s.id, s]));

export interface BuildEvolutionDef {
  id: string;
  name: string;
  /** o caminho que precisa de `BUILD_EVOLUTION_THRESHOLD` pontos */
  path: string;
  effects: SynergyEffect[];
  text: string;
}

/** synergies.lua `D.buildEvolutions` (§52): uma por caminho; ligada, vale até o fim da partida (D-059). */
export const BUILD_EVOLUTIONS: readonly BuildEvolutionDef[] = [
  { id: "apocalypse", name: "APOCALYPSE", path: "fire", effects: [e("volatileChance", 0.20)], text: "+20% Volatile" },
  { id: "absolute_zero", name: "ABSOLUTE ZERO", path: "ice", effects: [e("slowedDamagePct", 0.25), e("slowDurationPct", 0.20)],
    text: "+25% damage vs. Slow, +20% Slow duration" },
  { id: "thunderlord", name: "THUNDERLORD", path: "lightning", effects: [e("spellDamagePct", 0.20), e("chainRangePct", 0.25)],
    text: "+20% Spell Damage, +25% Lightning jump" },
  { id: "war_machine", name: "WAR MACHINE", path: "auto", effects: [e("autoDamagePct", 0.20), e("critChance", 0.05)],
    text: "+20% Auto Damage, +5% Crit" },
  { id: "void_savant", name: "VOID SAVANT", path: "arcane", effects: [e("arcanePct", 0.15), e("rangePct", 0.12)],
    text: "+15% Arcane Damage, +12% Range" },
  { id: "eternal_well", name: "ETERNAL WELL", path: "healing", effects: [e("maxHpPct", 0.12), e("regen", 0.35)],
    text: "+12% Max HP, +0.35 HP/s" },
];

export const BUILD_EVOLUTION_BY_ID: Record<string, BuildEvolutionDef> = Object.fromEntries(BUILD_EVOLUTIONS.map((b) => [b.id, b]));
export const BUILD_EVOLUTION_BY_PATH: Record<string, BuildEvolutionDef> = Object.fromEntries(BUILD_EVOLUTIONS.map((b) => [b.path, b]));

/** synergies.lua `D.identities` (§51): só descrição; a regra está em `core/synergies.ts` `buildIdentity` (D-058). */
export const IDENTITIES: Record<string, string> = {
  UNDEFINED: "No dominant path yet.",
  WARDEN: "Healing and survival.", SHADOW: "Dodge and mobility.",
  "BATTLE MAGE": "Auto Attack and magic in balance.", GUNSLINGER: "Auto Attack.",
  PYROMANCER: "Fire and Burn.", CRYOMANCER: "Ice and Slow.", STORMCALLER: "Lightning.", SPELLWEAVER: "Arcane and spells.",
};

/** synergies.lua `IDENTITY_BY_PATH` */
export const IDENTITY_BY_PATH: Record<string, string> = {
  auto: "GUNSLINGER", fire: "PYROMANCER", ice: "CRYOMANCER", lightning: "STORMCALLER",
  arcane: "SPELLWEAVER", healing: "WARDEN", dodge: "SHADOW",
};
