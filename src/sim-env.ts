// M17-01: o ambiente do modo simulação, carregado antes de tudo pelo `sim.ts`.
// Guarda o save numa memória própria (nunca no do jogador) e troca o `Math.random` por um sorteio com seed,
// para a mesma seed repetir a mesma partida.

import type { Storage } from "./core/save";

class MemoryStorage implements Storage {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
}

(globalThis as { __simStorage?: Storage }).__simStorage = new MemoryStorage();

/** mulberry32: o mesmo gerador simples para o `Math.random` da partida */
export function seedRandom(seed: number): void {
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

seedRandom(1);
