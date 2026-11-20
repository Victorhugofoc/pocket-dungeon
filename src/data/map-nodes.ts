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

