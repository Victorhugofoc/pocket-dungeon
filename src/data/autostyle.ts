// H8 (M20-12 parte 2): o estilo do ataque básico de cada herói (characters.lua `autoStyle`, combat/auto_attack.lua e
// combat/shield_throw.lua). O estilo decide a forma do ataque e como Double Shot, Cone Shot, Piercing Round e Heavy
// Shot viram coisa daquele herói (D-590). Distâncias em px de lá (12 px = 1 m, `px()`); ângulos em radianos.
// Ritmo, dano e alcance base de cada herói continuam em `HEROES[id].auto` (D18: números de combate adaptados).

/** nil de lá = o tiro normal (Aurelius) */
export type AutoStyle = "normal" | "frost" | "storm" | "firefan" | "gunslinger" | "hammer" | "shadowblade" | "shieldthrow" | "venom";

/** Estilos de arco: o herói fere tudo num arco à frente em vez de atirar. */
export const ARC_STYLES: Readonly<Partial<Record<AutoStyle, ArcStyle>>> = {
  hammer: { perCone: rad(12.5), reachPerPierce: 0.12, extraDelay: 0.15, extraMult: 0.6 },
  firefan: { perCone: rad(12.5), reachPerPierce: 0.12, extraDelay: 0.15, extraMult: 0.6 },
  shadowblade: { perCone: rad(12.5), reachPerPierce: 0.12, extraDelay: 0.12, extraMult: 0.6 },
};

export interface ArcStyle {
  /** cada Cone Shot abre o meio-arco nisto */
  perCone: number;
  /** cada Piercing Round soma isto ao alcance */
  reachPerPierce: number;
  /** cada Double Shot é um golpe a mais, `extraDelay` × k s depois, com `extraMult` do dano */
  extraDelay: number;
  extraMult: number;
}

/** Limites do meio-arco (Auto.arcHalfAngle). */
export const ARC_HALF = { min: rad(20), max: rad(175) };

export const AUTO_SHOT = {
  /** rad entre os tiros do Cone Shot (tuning.lua AUTO_CONE_STEP) */
  coneStep: 0.17,
  /** px entre os tiros lado a lado do Double Shot, e a largura máxima da fileira */
  doubleSpacing: 10,
  doubleWidth: 24,
  /** constants.lua PIERCE_DAMAGE_FRACTION: do segundo alvo em diante o tiro que atravessa fere 50% */
  pierceFraction: 0.5,
  /** constants.lua CAPS */
  caps: { pierce: 3, doubleShot: 4, coneShot: 4 },
  /** Heavy Shot (-15% de velocidade do tiro) vira -8% de ritmo nos estilos de arco e no escudo (stats.lua) */
  arcSpeedPerSlow: 0.08 / 0.15,
  /** e Big Iron do Zephyr: +10% de dano perto dele por cópia */
  pointBlankPerSlow: 0.10 / 0.15,
};

/** Frostine: os tiros laterais do Cone deixam lento; cada Double traz o pingente um acerto antes (mínimo 2). */
export const STYLE_FROST = { slow: 0.30, slowTime: 1.5, minIcicle: 2 };
/** Kaelen: um raio só; Double = salta para o inimigo mais perto não atingido, Cone = ramifica no 1º acerto. */
export const STYLE_STORM = { chainMult: 0.7, chainRange: 160, forkMult: 0.6, forkReach: 110, forkSpread: rad(35) };
/** Vesper: Double = um acúmulo de veneno a mais por acerto; os laterais do Cone respingam o veneno. */
export const STYLE_VENOM = { splash: 32 };
/** Zephyr: todo tiro ricocheteia uma vez; Pierce = mais um ricochete; Heavy Shot = Big Iron (dano perto). */
export const STYLE_GUN = { ricochetMult: 0.7, ricochetRange: 220, pointBlankRange: 80, baseRicochet: 1 };
/** Seraph: Double = escudo de luz logo depois (60%), Pierce = +1 ricochete, Cone = +15% de alcance. */
export const STYLE_SHIELD = { reachPerCone: 0.15, extraDelay: 0.12, extraMult: 0.6 };

/** format.lua STYLE_NAMES: o nome da carta muda no estilo do herói. */
export const STYLE_NAMES: Readonly<Partial<Record<AutoStyle, Readonly<Record<string, string>>>>> = {
  gunslinger: { piercing_round: "RICOCHET", heavy_shot: "BIG IRON", double_shot: "TWIN GUNS" },
  frost: { cone_shot: "FROST FAN", double_shot: "TWIN ICICLE" },
  storm: { cone_shot: "FORKED BOLT", double_shot: "ARC JUMP" },
  venom: { cone_shot: "VENOM SPRAY", double_shot: "DOUBLE DOSE" },
};

const signed = (n: number) => `${n >= 0 ? "+" : ""}${n}`;
const speedText = (v: number) => `${signed(Math.round(v * 100 * AUTO_SHOT.arcSpeedPerSlow))}% Attack Speed`;
type Line = (v: number) => string;
const arcText = (extra: string, arc: string, reach: string): Record<string, Line> => ({
  doubleShot: (n) => `${signed(n)} extra ${extra} (60% damage)`,
  coneShot: (n) => `${signed(25 * n)} degrees of ${arc}`,
  pierce: (n) => `${signed(12 * n)}% ${reach}`,
  autoProjectileSpeedPct: speedText,
});

/** format.lua ARC_TEXT, com as palavras do en.lua: a linha da carta no estilo do herói. */
export const STYLE_TEXT: Readonly<Partial<Record<AutoStyle, Readonly<Record<string, Line>>>>> = {
  hammer: arcText("swing", "swing arc", "swing reach"),
  firefan: { ...arcText("fire fan", "fan width", "fan reach"), doubleShot: (n) => `${signed(n)} extra fire fan (60% damage)` },
  shadowblade: arcText("thrust", "blade arc", "blade reach"),
  shieldthrow: {
    doubleShot: (n) => `${signed(n)} extra shield of light (60% damage)`,
    coneShot: (n) => `${signed(15 * n)}% throw reach`,
    pierce: (n) => `${signed(n)} shield ricochet`,
    autoProjectileSpeedPct: speedText,
  },
  frost: {
    doubleShot: (n) => `${signed(n)} parallel shot; Icicle ${n} hit sooner`,
    coneShot: (n) => `${signed(n)} fan shot (the side shots Slow)`,
  },
  storm: {
    doubleShot: (n) => `${signed(n)} bolt jump to another enemy (70% damage)`,
    coneShot: (n) => `${signed(n)} bolt fork on the first hit (60% damage)`,
  },
  venom: {
    doubleShot: (n) => `${signed(n)} Poison stack per hit (and max)`,
    coneShot: (n) => `${signed(n)} fan shot (the side shots' Poison splashes)`,
  },
  gunslinger: {
    pierce: (n) => `${signed(n)} ricochet (70% damage)`,
    doubleShot: (n) => `${signed(n)} shot from the other gun (same damage)`,
    autoProjectileSpeedPct: (v) => `${signed(Math.round(-v * 100 * AUTO_SHOT.pointBlankPerSlow))}% damage within ${Math.round(STYLE_GUN.pointBlankRange / 12)} m`,
  },
};

/** Estilos cujo Heavy Shot vira bônus (a linha fica verde mesmo com valor negativo). */
export const STYLE_GOOD: Readonly<Partial<Record<AutoStyle, Readonly<Record<string, true>>>>> = {
  gunslinger: { autoProjectileSpeedPct: true },
};

function rad(d: number): number {
  return (d * Math.PI) / 180;
}
