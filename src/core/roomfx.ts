// Perigos de chão das salas durante a onda (room_effects.lua): raios persistentes (Storm Floor, Fractured Floor,
// Storm Vault) e poças de cura (Sanctuary Floor, Blessed Onslaught). Puro: só os relógios; o jogo põe no chão.
import { STORM, type RoomDef } from "../data/rooms";

export interface RoomFx {
  stormInterval: number;
  stormTimer: number;
  stormDuration: number;
  poolInterval: number;
  poolTimer: number;
}

/** `RE.start`: null quando a sala não tem raio nem poça. */
export function startRoomFx(room: RoomDef | null): RoomFx | null {
  if (!room || (!room.hazards && !room.pools)) return null;
  const fx: RoomFx = { stormInterval: 0, stormTimer: Infinity, stormDuration: 0, poolInterval: 0, poolTimer: Infinity };
  if (room.hazards) {
    const h = room.hazards;
    fx.stormInterval = h.interval / (h.rate ?? 1);
    fx.stormTimer = fx.stormInterval;
    fx.stormDuration = h.duration;
  }
  if (room.pools) {
    fx.poolInterval = room.pools.interval;
    fx.poolTimer = room.pools.interval;
  }
  return fx;
}

/** `RE.update`: quantos raios e poças nascem neste passo (no máximo um de cada, como lá). */
export function stepRoomFx(fx: RoomFx, dt: number): { storm: boolean; pool: boolean } {
  let storm = false, pool = false;
  fx.stormTimer -= dt;
  if (fx.stormTimer <= 0) {
    fx.stormTimer += fx.stormInterval;
    storm = true;
  }
  fx.poolTimer -= dt;
  if (fx.poolTimer <= 0) {
    fx.poolTimer += fx.poolInterval;
    pool = true;
  }
  return { storm, pool };
}

/** Dano por segundo do raio na onda (`dpsBase + wave × dpsPerWave`), em vida do Dungeon Reign como o dos inimigos. */
export function stormDps(wave: number): number {
  return STORM.dpsBase + wave * STORM.dpsPerWave;
}

/** Tiques de um efeito de chão (`EA.updateHazards` e as poças): quantos tiques caem neste passo. */
export function tickCount(z: { time: number; tickLeft: number; tick: number }, dt: number): number {
  z.time -= dt;
  z.tickLeft -= dt;
  let n = 0;
  while (z.tickLeft <= 0 && z.time > -1e-9) {
    z.tickLeft += z.tick;
    n++;
  }
  return n;
}
