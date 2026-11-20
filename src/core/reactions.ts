// Reações de estado (D18, M21-05): dado o estado de um inimigo e o que chega nele, diz qual reação sai.
// Lógica pura; o jogo guarda o estado no inimigo e faz o efeito (src/game/game.ts `react`).

export type ReactionId = "shatter" | "plague";

/** O que importa do inimigo para reagir. */
export interface ReactState {
  /** lento por fonte de gelo até este instante */
  chillUntil: number;
  burning: boolean;
  poisoned: boolean;
  /** não reage antes deste instante (recarga, ou recebeu o estado de uma reação) */
  reactUntil: number;
}

/** Um golpe com elemento (escola da spell ou da técnica; "ice" no gelo da Frostine), ou um estado que está sendo aplicado. */
export type ReactTrigger =
  | { kind: "hit"; element: string | null }
  | { kind: "apply"; status: "burn" | "poison" };

/** Reação que o gatilho dispara agora, olhando o estado de antes dele. */
export function reactionFor(s: ReactState, t: ReactTrigger, now: number): ReactionId | null {
  if (now < s.reactUntil) return null;
  if (t.kind === "hit") return t.element === "lightning" && now < s.chillUntil ? "shatter" : null;
  if (t.status === "burn" && s.poisoned && !s.burning) return "plague";
  if (t.status === "poison" && s.burning && !s.poisoned) return "plague";
  return null;
}

/** Reações prontas no inimigo que a build consegue fechar (para o ícone): o estado está lá e o herói tem o outro elemento. */
export function primedReactions(s: ReactState, now: number, elements: ReadonlySet<string>): ReactionId[] {
  if (now < s.reactUntil) return [];
  const out: ReactionId[] = [];
  if (now < s.chillUntil && elements.has("lightning")) out.push("shatter");
  if ((s.burning && !s.poisoned && elements.has("poison")) || (s.poisoned && !s.burning && elements.has("fire"))) out.push("plague");
  return out;
}

/**
 * Elementos que a build aplica: escolas das spells, escola da técnica e o estado do ataque básico
 * (queimadura conta como fogo, veneno como veneno, lentidão da Frostine como gelo).
 */
export function buildElements(spellSchools: readonly string[], techniqueSchool: string | null, autoStatus: string | null, frost: boolean): Set<string> {
  const out = new Set<string>(spellSchools);
  if (techniqueSchool) out.add(techniqueSchool);
  if (autoStatus === "burn") out.add("fire");
  if (autoStatus === "poison") out.add("poison");
  if (frost) out.add("ice");
  return out;
}
