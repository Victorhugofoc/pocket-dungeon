// Evolução das spells (M6-06, S18): porta de dungeon-idle src/spells/evolution.lua (§38). A spell no nível máximo mais
// UMA relíquia da receita (D-197) abre a evolução; a relíquia não é gasta; uma evolução por spell; até 3 opções, e o
// jogador pode recusar. Recusada, a opção só volta quando a coleção de relíquias muda (`relicVersion`).
import { EVOLUTIONS, SPELL_MAX_LEVEL, SPELLS, type EvolutionId } from "../data/spells";
import { isSpellId } from "./spells";
import type { Rng } from "./rng";
import type { RunState, SpellSlot } from "./run";

export interface EvolutionOption {
  /** índice em `run.spells` (lá começa em 1; aqui em 0) */
  slotIndex: number;
  evoId: EvolutionId;
}

/** `recipeMet`: com `slot`, só aquele espaço; sem, qualquer spell igual no nível máximo. */
export function recipeMet(run: RunState, evoId: EvolutionId, slot?: SpellSlot): boolean {
  const evo = EVOLUTIONS[evoId];
  if (slot) {
    if (slot.id !== evo.spell || (slot.level ?? 1) < SPELL_MAX_LEVEL) return false;
  } else if (!run.spells.some((s) => s.id === evo.spell && (s.level ?? 1) >= SPELL_MAX_LEVEL)) return false;
  return evo.requires.some((rid) => run.relics.includes(rid));
}

/** `wantedRelics`: relíquia → spell equipada (sem evolução) que ela ajudaria a evoluir. */
export function wantedRelics(run: RunState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const slot of run.spells) {
    if (slot.evolution || !isSpellId(slot.id)) continue;
    for (const evoId of SPELLS[slot.id].evolutions) for (const rid of EVOLUTIONS[evoId].requires) out[rid] = slot.id;
  }
  return out;
}

/** `available`: todas as evoluções possíveis agora. */
export function availableEvolutions(run: RunState): EvolutionOption[] {
  const out: EvolutionOption[] = [];
  run.spells.forEach((slot, slotIndex) => {
    if (slot.evolution || !isSpellId(slot.id)) return;
    for (const evoId of SPELLS[slot.id].evolutions) if (recipeMet(run, evoId, slot)) out.push({ slotIndex, evoId });
  });
  return out;
}

const key = (o: EvolutionOption) => `${o.slotIndex}:${o.evoId}`;

/** `pendingOffer`: as possíveis que não foram recusadas desde a última mudança nas relíquias; até 3, sorteadas. */
export function pendingEvolutionOffer(run: RunState, rng: Rng): EvolutionOption[] | null {
  const list = availableEvolutions(run).filter((o) => run.evolutionDeclined[key(o)] !== run.relicVersion);
  if (!list.length) return null;
  // RNG:sample de lá: embaralha uma cópia e pega as 3 primeiras
  return list.length > 3 ? rng.shuffle([...list]).slice(0, 3) : list;
}

/** `apply`: a spell evolui; as relíquias da receita ficam (regra do §38). */
export function applyEvolution(run: RunState, slotIndex: number, evoId: EvolutionId): void {
  const slot = run.spells[slotIndex];
  const evo = EVOLUTIONS[evoId];
  if (!slot || !evo || evo.spell !== slot.id) throw new Error("invalid evolution");
  if (slot.evolution) throw new Error("spell already evolved");
  if (!recipeMet(run, evoId, slot)) throw new Error("recipe not satisfied");
  slot.evolution = evoId;
  run.evolutionsDone += 1;
}

/** `decline`: recusa as opções até a coleção de relíquias mudar. */
export function declineEvolutions(run: RunState, options: readonly EvolutionOption[]): void {
  for (const o of options) run.evolutionDeclined[key(o)] = run.relicVersion;
}
