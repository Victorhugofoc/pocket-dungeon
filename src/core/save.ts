// Save persistente (localStorage). Um personagem por save; progresso contínuo.
import type { Item, Slot } from "./items";
import type { Attributes } from "./stats";

export const SAVE_KEY = "dungeon-reign-rpg.save.v1";

export interface SaveData {
  v: 1;
  seed: number;
  heroId: string;
  level: number;
  xp: number;
  attrs: Attributes;
  attrPoints: number;
  bag: Item[];
  equipped: Partial<Record<Slot, Item>>;
  relics: string[];
  zonesUnlocked: string[];
  bossesKilled: string[];
  zone: string;
  visits: number;
  kills: number;
  deaths: number;
  playSeconds: number;
}

export function newSave(heroId: string, seed: number): SaveData {
  return {
    v: 1,
    seed,
    heroId,
    level: 1,
    xp: 0,
    attrs: { forca: 0, vigor: 0, agilidade: 0, foco: 0 },
    attrPoints: 0,
    bag: [],
    equipped: {},
    relics: [],
    zonesUnlocked: ["bosque"],
    bossesKilled: [],
    zone: "bosque",
    visits: 0,
    kills: 0,
    deaths: 0,
    playSeconds: 0,
  };
}

export interface Storage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export function loadSave(storage: Storage | undefined): SaveData | null {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (data.v !== 1 || typeof data.heroId !== "string" || typeof data.level !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(storage: Storage | undefined, data: SaveData): boolean {
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function deleteSave(storage: Storage | undefined): void {
  try {
    storage?.removeItem(SAVE_KEY);
  } catch {
    /* sem armazenamento disponível */
  }
}

export function safeStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
