// Nome, texto e cor de cada carta do mapa da partida (run_map.lua); a carta no menu e o portão no chão (M21-08).
import type { MapNodeId } from "../core/runmap";

export const MAP_NODE: Record<MapNodeId, { name: string; text: string; color: string }> = {
  combat_room: { name: "Combat Room", text: "A room with a modifier on the next wave", color: "#e0a050" },
  cursed_room: { name: "Cursed Room", text: "A curse for 2 waves in a row, no map between them; after the 1st, a cursed relic", color: "#b36bff" },
  pact: { name: "Risk Pact", text: "A pact for the rest of the run + a pact relic (1 every 5 waves)", color: "#ff5a5a" },
  event: { name: "Event", text: "Choose 1 of 3 events", color: "#5fd3c8" },
  shop: { name: "Shop", text: "Buy permanent power", color: "#ffd34d" },
  elite: { name: "Champion", text: "Face a Champion with 2 affixes: risk relic and shop after the wave", color: "#ffc83d" },
  relic_shrine: { name: "Relic Shrine", text: "A relic with no extra fight", color: "#4fa3ff" },
  boss_ambush: { name: "Boss Ambush", text: "A weakened boss joins the wave: a risk relic", color: "#ff7a5a" },
};


/**
 * M21-08 parte 2: o sinal de cada sala, visto de longe. Coluna de luz na cor da carta (`beam` m de altura) e
 * partículas próprias (`every` s entre uma e outra): brasas, fumaça, faíscas, moedas, poeira de luz; raios do céu
 * na emboscada de chefe. `sound`: o som ao chegar perto do portão.
 */
export type GateMotes = "embers" | "smoke" | "sparks" | "coins" | "motes" | "lightning";
export type GateSound = "swing" | "zap" | "rare" | "coin" | "level" | "boss" | "pickup";
export const GATE_SIGNAL: Record<MapNodeId, { beam: number; motes: GateMotes; every: number; sound: GateSound }> = {
  combat_room: { beam: 9, motes: "embers", every: 0.08, sound: "swing" },
  cursed_room: { beam: 8, motes: "smoke", every: 0.1, sound: "zap" },
  pact: { beam: 9, motes: "smoke", every: 0.1, sound: "zap" },
  event: { beam: 9, motes: "motes", every: 0.12, sound: "pickup" },
  shop: { beam: 10, motes: "coins", every: 0.14, sound: "coin" },
  elite: { beam: 11, motes: "sparks", every: 0.07, sound: "rare" },
  relic_shrine: { beam: 12, motes: "motes", every: 0.1, sound: "level" },
  boss_ambush: { beam: 14, motes: "lightning", every: 1.4, sound: "boss" },
};

/**
 * M21-15: a luz da arena durante a onda, pela carta escolhida (as ondas correm no mesmo lugar; a luz diz que sala é
 * esta). `mix` = quanto a luz do céu vai para `color` (o sol vai 0,6 disso). Primeiro chute, sem par no original.
 */
export const ARENA_LIGHT: Record<MapNodeId, { color: number; mix: number }> = {
  combat_room: { color: 0xffb070, mix: 0.16 },
  cursed_room: { color: 0x9a5cff, mix: 0.32 },
  pact: { color: 0xff4a4a, mix: 0.26 },
  event: { color: 0x7fe0d4, mix: 0.12 },
  shop: { color: 0xffe08a, mix: 0.1 },
  elite: { color: 0xff5030, mix: 0.26 },
  relic_shrine: { color: 0xffd27a, mix: 0.16 },
  boss_ambush: { color: 0xff3a2a, mix: 0.32 },
};
