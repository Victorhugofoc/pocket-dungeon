// Mapa da partida entre as ondas (run_map.lua §7 e o escopo da onda de §6): 3 cartas sorteadas com peso, a loja
// garantida a cada 3 ondas, a sala ou maldição da carta escolhida e a camada da onda (modifier_engine.lua `waveLayer`).
// Puro: o jogo sorteia no fluxo `map` e mostra as cartas.
import { multiplyLayers, type Layer } from "./events";
import type { LayerMods } from "../data/events";
import { RUN_MAP } from "../data/run";
import { COMBAT_ROOM_POOL, CURSE_WAVES, CURSES, ROOM_BY_ID, type RoomDef } from "../data/rooms";
import type { RunState } from "./run";
import { hasMapBefore } from "./waves";

export type MapNodeId = (typeof RUN_MAP.nodes)[number]["id"];

export interface MapCard {
  node: MapNodeId;
  /** sala, maldição, Toca dos Campeões ou emboscada que a carta já mostra (D-083) */
  room?: string;
  /** pacto sorteado na carta de pacto */
  pact?: string;
  /** M11-08: os 3 eventos da carta, sorteados uma vez (ir e voltar não sorteia de novo, run_map_flow.lua) */
  events?: string[];
}

/** O pedaço do Rng que o mapa usa (o teste de paridade passa um sorteio roteirizado igual ao do Lua). */
export interface MapRng {
  weighted<T>(entries: readonly (readonly [T, number])[]): T;
  pick<T>(arr: readonly T[]): T;
}

export interface MapOptions {
  /** cartas cujo sistema ainda não existe aqui (pacto, evento, loja): saem do sorteio */
  disabled?: ReadonlySet<MapNodeId>;
  /** pactos que ainda podem sair (run_map.lua `unownedPacts`); vazio = sem carta de pacto */
  pacts?: readonly string[];
  /** ainda há relíquia para o santuário oferecer (D-087) */
  shrine: boolean;
}

/** run_map.lua `nodePool`. */
export function nodePool(opts: MapOptions): [MapNodeId, number][] {
  const pool: [MapNodeId, number][] = [];
  for (const n of RUN_MAP.nodes) {
    if (opts.disabled?.has(n.id)) continue;
    if (n.id === "pact" && !(opts.pacts && opts.pacts.length > 0)) continue;
    if (n.id === "relic_shrine" && !opts.shrine) continue;
    pool.push([n.id, n.weight]);
  }
  return pool;
}

/** run_map.lua `rollCard`: o conteúdo da carta já sai sorteado, para o jogador ver antes de escolher. */
export function rollCard(rng: MapRng, node: MapNodeId, opts: MapOptions): MapCard {
  const card: MapCard = { node };
  if (node === "combat_room") card.room = rng.pick(COMBAT_ROOM_POOL);
  else if (node === "cursed_room") card.room = rng.pick(CURSES.map((c) => c.id));
  else if (node === "elite") card.room = "champions_den";
  else if (node === "boss_ambush") card.room = rng.pick(["boss_ambush", "boss_ambush_plus"]);
  else if (node === "pact") card.pact = rng.pick(opts.pacts ?? []);
  return card;
}

/** run_map.lua `generate`: 3 cartas sem repetir; antes de toda onda múltipla de 3, uma delas vira loja. */
export function generateMap(rng: MapRng, nextWave: number, opts: MapOptions): MapCard[] {
  const pool = nodePool(opts);
  const picked: MapNodeId[] = [];
  const n = Math.min(RUN_MAP.choices, pool.length);
  for (let i = 0; i < n; i++) {
    const id = rng.weighted(pool);
    picked.push(id);
    pool.splice(pool.findIndex((e) => e[0] === id), 1);
  }
  // a loja garantida só existe com a loja ligada (M7)
  if (nextWave % RUN_MAP.shopEvery === 0 && !opts.disabled?.has("shop") && !picked.includes("shop")) {
    const replaceable: number[] = [];
    picked.forEach((id, i) => { if ((RUN_MAP.replaceable as readonly string[]).includes(id)) replaceable.push(i + 1); });
    const idx = replaceable.length > 0 ? rng.pick(replaceable) : picked.length; // D-085
    picked[idx - 1] = "shop";
  }
  return picked.map((id) => rollCard(rng, id, opts));
}

/** O que o jogo faz depois da carta: começar a onda, abrir a escolha de relíquia, a loja, o evento ou o pacto. */
export type MapStep = "wave" | "relic" | "shop" | "event" | "pact";

/** run_map.lua `choose`: a sala vale para a onda seguinte; a maldição, para as 2 seguintes. */
/** Ouro do santuário que não tem relíquia para oferecer (todas as abertas já são do herói). */
export function shrineFallbackGold(wave: number): number {
  const g = RUN_MAP.shrineFallbackGold;
  return g.base + g.perWave * Math.max(1, wave);
}

export function chooseCard(run: RunState, card: MapCard): MapStep {
  if (card.node !== "event") run.mapHistory.push(card.node);
  if (card.room) {
    run.room = card.room;
    run.curseWavesLeft = ROOM_BY_ID[card.room]?.kind === "curse" ? CURSE_WAVES : 0;
    return "wave";
  }
  if (card.node === "pact") return "pact";
  if (card.node === "event") return "event";
  if (card.node === "relic_shrine") return "relic";
  if (card.node === "shop") return "shop";
  return "wave";
}

/**
 * run_map.lua `expireWaveScope`, no fim da onda: a sala some; a maldição segue para a onda seguinte, que então
 * não tem mapa (D-150). Devolve true quando a maldição continua.
 */
export function expireWaveScope(run: RunState): boolean {
  const def = run.room ? ROOM_BY_ID[run.room] : undefined;
  run.room = null;
  if (def?.kind === "curse" && run.curseWavesLeft > 1) {
    run.curseWavesLeft--;
    run.room = def.id;
    run.curseContinues = true;
    return true;
  }
  run.curseWavesLeft = 0;
  run.curseContinues = false;
  return false;
}

export function roomOf(run: RunState): RoomDef | null {
  return (run.room && ROOM_BY_ID[run.room]) || null;
}

/** modifier_engine.lua `waveLayer`: a sala vezes o evento da onda (e o atraso do Ominous Omen que cai nela). */
export type WaveLayer = Layer;

export function waveLayer(room: RoomDef | null, events: readonly LayerMods[] = []): WaveLayer {
  return multiplyLayers(room?.mods, ...events);
}

// ---------------------------------------------------------------- M21-08: o mapa escolhido andando

/** As cartas do mapa da onda `wave`, gravadas na partida: continuar do checkpoint mostra os mesmos portões. */
export interface MapOffer {
  wave: number;
  /** null depois da escolha */
  cards: MapCard[] | null;
}

/** A onda tem mapa ainda não sorteado (sem mapa na 1ª, na de chefe e na que segue uma maldição, D-150). */
export function needsMap(run: RunState, wave: number): boolean {
  return hasMapBefore(wave) && !run.curseContinues && run.mapOffer?.wave !== wave;
}

export interface GateSpot {
  x: number;
  z: number;
  /** direção (radianos, no plano xz) do centro para o portão: o portão fica de frente para ela */
  angle: number;
}

/**
 * M21-14: `n` pontos em arco em volta de `from`, a `radius` do centro, centrados na direção de `to` girada de
 * `offset` radianos. O passo entre vizinhos é `spread` radianos, ou mais, para que fiquem a pelo menos `minGap`
 * um do outro. `angle` = do centro para o ponto. Para os portões (de frente para a clareira seguinte) e os desvios.
 */
export function arcSpots(from: { x: number; z: number }, to: { x: number; z: number }, n: number,
  radius: number, spread: number, offset = 0, minGap = 0): GateSpot[] {
  const step = Math.max(spread, 2 * Math.asin(Math.min(1, minGap / (2 * radius))));
  const base = Math.atan2(to.z - from.z, to.x - from.x) + offset;
  const out: GateSpot[] = [];
  for (let i = 0; i < n; i++) {
    const a = base + (i - (n - 1) / 2) * step;
    out.push({ x: from.x + Math.cos(a) * radius, z: from.z + Math.sin(a) * radius, angle: a });
  }
  return out;
}
