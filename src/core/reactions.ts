// Reações de estado (D18, M21-05): dado o estado de um inimigo e o que chega nele, diz qual reação sai.
// Lógica pura; o jogo guarda o estado no inimigo e faz o efeito (src/game/game.ts `react`).

export type ReactionId = "shatter" | "plague" | "execution";

/** Elementos que um tornado (Cyclone) absorve. */
export const TORNADO_ELEMENTS = ["fire", "ice", "lightning", "poison"] as const;
export type TornadoElement = (typeof TORNADO_ELEMENTS)[number];

/** O que importa do inimigo para reagir. */
export interface ReactState {
  /** lento por fonte de gelo até este instante */
  chillUntil: number;
  burning: boolean;
  poisoned: boolean;
  /** atordoado agora (Execução) */
  stunned?: boolean;
  /** não reage antes deste instante (recarga, ou recebeu o estado de uma reação) */
  reactUntil: number;
}

/** Um golpe com elemento (escola da spell ou da técnica; "ice" no gelo da Frostine), ou um estado que está sendo aplicado. */
export type ReactTrigger =
  | { kind: "hit"; element: string | null; behind?: boolean }
  | { kind: "apply"; status: "burn" | "poison" };

/** Reação que o gatilho dispara agora, olhando o estado de antes dele. */
export function reactionFor(s: ReactState, t: ReactTrigger, now: number): ReactionId | null {
  if (now < s.reactUntil) return null;
  if (t.kind === "hit") {
    if (t.element === "lightning" && now < s.chillUntil) return "shatter";
    if (t.behind && s.stunned) return "execution";
    return null;
  }
  if (t.status === "burn" && s.poisoned && !s.burning) return "plague";
  if (t.status === "poison" && s.burning && !s.poisoned) return "plague";
  return null;
}

/** Reações prontas no inimigo que a build consegue fechar (para o ícone): o estado está lá e o herói tem o outro elemento. */
export function primedReactions(s: ReactState, now: number, elements: ReadonlySet<string>): ReactionId[] {
  if (now < s.reactUntil) return [];
  const out: ReactionId[] = [];
  if (now < s.chillUntil && elements.has("lightning")) out.push("shatter");
  if (s.stunned) out.push("execution");
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

/** O golpe vem das costas do inimigo: o atacante está no cone de `coneDeg` graus (metade) atrás de quem olha para `facing`. */
export function isBehind(facing: number, ex: number, ez: number, ax: number, az: number, coneDeg: number): boolean {
  const dx = ax - ex;
  const dz = az - ez;
  const d = Math.hypot(dx, dz);
  if (d < 1e-6) return false;
  // facing é atan2(x, z): a frente é (sin, cos)
  const front = (Math.sin(facing) * dx + Math.cos(facing) * dz) / d;
  return front <= -Math.cos((coneDeg * Math.PI) / 180);
}

/** Execução: mata o comum que fica abaixo do limiar depois do golpe; chefe e campeão só levam o dano. */
export function executes(hp: number, maxHp: number, threshold: number, boss: boolean, champion: boolean): boolean {
  return !boss && !champion && hp <= maxHp * threshold;
}

/** Elemento que o tornado passa a ter: o primeiro elemento absorvível fica até ele acabar. */
export function tornadoInfusion(current: TornadoElement | null, element: string | null): TornadoElement | null {
  if (current) return current;
  return (TORNADO_ELEMENTS as readonly string[]).includes(element ?? "") ? (element as TornadoElement) : null;
}
