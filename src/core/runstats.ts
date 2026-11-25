// M20-14: dano por fonte (run_stats.lua `dealt`, `kills`, `taken`, `takenHits`, `dealtRows`, `takenRows`).
// Dano causado por fonte (ataque básico, técnica, cada spell ou evolução, queimadura, Volatile Core, relíquia...) e dano
// recebido por fonte (o nome de quem bateu, como chega em `hurtPlayer`). Fica na partida, então volta com o checkpoint.
import { SPELLS, EVOLUTIONS } from "../data/spells";
import { TECHNIQUES } from "../data/techniques";
import { RELICS } from "../data/relics";
import { UPGRADE_BY_ID } from "../data/upgrades";

/** fonte que nenhum ponto de dano marcou: aparece como "Unknown" (sinal de ponto esquecido) */
export const UNKNOWN_SOURCE = "?";

export interface DamageSources {
  /** dano causado por fonte, sem o excesso além da vida do inimigo (como `statistics.damage`) */
  dealt: Record<string, number>;
  /** abates pelo golpe final de cada fonte */
  kills: Record<string, number>;
  /** dano recebido por fonte */
  taken: Record<string, number>;
  /** golpes recebidos por fonte */
  hits: Record<string, number>;
}

export function newDamageSources(): DamageSources {
  return { dealt: {}, kills: {}, taken: {}, hits: {} };
}

const add = (t: Record<string, number>, k: string, v: number): void => {
  t[k] = (t[k] ?? 0) + v;
};

export function addDealt(s: DamageSources, source: string, amount: number): void {
  if (amount > 0) add(s.dealt, source || UNKNOWN_SOURCE, amount);
}

export function addKill(s: DamageSources, source: string): void {
  add(s.kills, source || UNKNOWN_SOURCE, 1);
}

export function addTaken(s: DamageSources, source: string, amount: number): void {
  if (amount <= 0) return;
  const k = source || UNKNOWN_SOURCE;
  add(s.taken, k, amount);
  add(s.hits, k, 1);
}

/** fontes fixas que não estão em nenhuma tabela (run_stats.lua `nameOf`) */
const FIXED: Readonly<Record<string, string>> = {
  auto: "Auto attack",
  burn: "Burn",
  volatile: "Volatile Core",
  [UNKNOWN_SOURCE]: "Unknown",
  // reações (M21-05)
  shatter: "Shatter",
  plague: "Plague",
  execution: "Execution",
  // golpes que não são do herói, mas contam no dano causado
  explosive_barrel: "Explosive Barrel",
  boss_death: "Boss death",
  // abelhas pequenas da Ninhada (passiva da Vesper); a técnica dela também se chama `brood`
  hatchling: "Hatchlings",
};

/** "JUDGEMENT" → "Judgement" (os nomes das melhorias são em maiúsculas) */
const titleCase = (s: string): string => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/** run_stats.lua `nameOf`: o nome do jogo para o id de uma fonte de dano causado. */
export function sourceName(id: string): string {
  if (FIXED[id]) return FIXED[id];
  const spell = (SPELLS as Record<string, { name: string }>)[id];
  if (spell) return spell.name;
  const evo = (EVOLUTIONS as Record<string, { name: string }>)[id];
  if (evo) return evo.name;
  if (TECHNIQUES[id]) return TECHNIQUES[id].name;
  if (RELICS[id]) return RELICS[id].name;
  const up = UPGRADE_BY_ID[id];
  if (up) return titleCase(up.name);
  return id.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export interface SourceRow {
  id: string;
  name: string;
  value: number;
  /** fração do total */
  share: number;
  /** abates (causado) ou golpes (recebido) */
  count: number;
}

function rows(values: Record<string, number>, counts: Record<string, number>, name: (id: string) => string): { rows: SourceRow[]; total: number } {
  const list = Object.entries(values).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = list.reduce((t, [, v]) => t + v, 0);
  return {
    total,
    rows: list.map(([id, value]) => ({ id, name: name(id), value, share: total > 0 ? value / total : 0, count: counts[id] ?? 0 })),
  };
}

/** run_stats.lua `dealtRows`: fontes do dano causado, da maior para a menor, com os abates de cada uma. */
export function dealtRows(s: DamageSources): { rows: SourceRow[]; total: number } {
  return rows(s.dealt, s.kills, sourceName);
}

/** run_stats.lua `takenRows`: fontes do dano recebido (o nome já é o do inimigo), com os golpes de cada uma. */
export function takenRows(s: DamageSources): { rows: SourceRow[]; total: number } {
  return rows(s.taken, s.hits, (id) => (id === UNKNOWN_SOURCE ? "Unknown" : id));
}
