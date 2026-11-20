// Épicas de comportamento (M21-07, D18): cartas que mudam como o herói joga, em vez de dar atributo. Não existem no
// Dungeon Reign; ficam fora de `UPGRADES` (que a paridade compara com o original) e entram no sorteio por
// `draftLevelUp` (core/levelup.ts). Raridade épica fixa, uma vez cada por partida. Lista aprovada pelo usuário em
// 2026-11-20; a chance começa baixa e sobe a cada tela de nível sem épica (pedido dele), zerando quando uma aparece.
import type { UpgradeDef } from "./upgrades";

/** Chance de uma das 3 cartas virar épica: base + step × telas seguidas sem épica (teto 1). */
export const EPIC_ODDS = { base: 0.05, step: 0.05, minWave: 3 } as const;

/** Números de cada épica. `atk` = múltiplo do dano do ataque básico do herói. */
export const EPIC = {
  rune_step: { delay: 0.6, radius: 2.6, atk: 1.6 },
  cold_snap: { radius: 3.2, slow: 0.4, duration: 2.5 },
  /** golpe que a esquiva evitou até `window` s depois de começar conta como no último instante */
  close_call: { window: 0.25, damagePct: 0.3, duration: 2 },
  charged_step: { bonus: 1.5, window: 2.5, knock: 3 },
  third_strike: { every: 3, mult: 2, gap: 1.6 },
  kinetic: { distance: 12, targets: 3, range: 9, atk: 1.2 },
  anchor: { still: 1, reduce: 0.5 },
  orb_rush: { techRefund: 0.3 },
  chain_reaction: { radius: 3.2 },
  overcharge: { window: 6 },
  frenzy: { kills: 5, window: 3, attackSpeedPct: 0.4, duration: 3 },
} as const;

export type EpicId = keyof typeof EPIC;

function epic(id: EpicId, name: string, tags: string[], note: string): UpgradeDef {
  return { id, name, effects: [], tags, note, behavior: true, unique: true, minWave: EPIC_ODDS.minWave, hideEffects: true };
}

export const BEHAVIOR_EPICS: readonly UpgradeDef[] = [
  epic("rune_step", "RUNE STEP", ["dodge", "arcane"], "Dashing leaves a rune that explodes after 0.6 s (Arcane)."),
  epic("cold_snap", "COLD SNAP", ["dodge", "ice"], "Dashing chills nearby enemies (they can Shatter)."),
  epic("close_call", "CLOSE CALL", ["dodge"], "Dashing through a hit at the last moment resets the dash and gives +30% damage for 2 s."),
  epic("charged_step", "CHARGED STEP", ["dodge", "auto"], "After a dash, your next basic attack deals +150% damage and knocks back."),
  epic("third_strike", "THIRD STRIKE", ["auto", "crit"], "Every 3rd basic attack in a row deals double damage and always crits."),
  epic("kinetic", "KINETIC", ["lightning", "auto"], "Moving 12 m charges a spark: your next basic attack chains lightning to 3 enemies."),
  epic("anchor", "ANCHOR", ["survival"], "Standing still for 1 s halves the next hit you take."),
  epic("orb_rush", "ORB RUSH", ["technique"], "Every orb you collect takes 0.3 s off your technique's cooldown."),
  epic("chain_reaction", "CHAIN REACTION", ["magic"],
    "An enemy killed by a reaction passes its Burn, Poison and Chill to those nearby, and Plague can chain."),
  epic("overcharge", "OVERCHARGE", ["technique", "magic"], "Using your technique makes your next spell free (no cooldown)."),
  epic("frenzy", "FRENZY", ["auto", "speed"], "5 kills within 3 s give +40% attack speed for 3 s."),
];
