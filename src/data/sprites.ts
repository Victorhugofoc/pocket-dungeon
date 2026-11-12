// Gerado a partir de dungeon-idle (assets/*_sheet.png + src/data/sprite_meta.lua). Não editar à mão.
// Linhas da folha: 0 parado, 1 andando, 2 atacando, 3 levando dano, 4 morrendo.
export interface SpriteMeta {
  w: number; h: number; ox: number; oy: number; cols: number;
  /** quadros por linha */
  frames: number[];
  /** altura visível (px) acima dos pés e meia largura (px) */
  top: number; half: number;
}

export const SPRITES: Record<string, SpriteMeta> = {
  "frostine": {
    "w": 96,
    "h": 96,
    "ox": 40,
    "oy": 88,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 69,
    "half": 39
  },
  "kaelen": {
    "w": 96,
    "h": 96,
    "ox": 42,
    "oy": 88,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 69,
    "half": 18
  },
  "aurelius": {
    "w": 96,
    "h": 96,
    "ox": 42,
    "oy": 88,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 73,
    "half": 28
  },
  "ignis": {
    "w": 96,
    "h": 96,
    "ox": 50,
    "oy": 88,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 79,
    "half": 37
  },
  "zephyr": {
    "w": 96,
    "h": 96,
    "ox": 42,
    "oy": 88,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 74,
    "half": 45
  },
  "varok": {
    "w": 96,
    "h": 96,
    "ox": 40,
    "oy": 88,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 81,
    "half": 45
  },
  "umbra": {
    "w": 96,
    "h": 96,
    "ox": 39,
    "oy": 88,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 66,
    "half": 30
  },
  "seraph": {
    "w": 96,
    "h": 96,
    "ox": 38,
    "oy": 88,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 74,
    "half": 32
  },
  "vesper": {
    "w": 96,
    "h": 96,
    "ox": 40,
    "oy": 88,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 65,
    "half": 37
  },
  "goblin": {
    "w": 96,
    "h": 96,
    "ox": 41,
    "oy": 88,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 39,
    "half": 23
  },
  "orc": {
    "w": 96,
    "h": 96,
    "ox": 44,
    "oy": 88,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 60,
    "half": 40
  },
  "swarm": {
    "w": 96,
    "h": 96,
    "ox": 44,
    "oy": 88,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 29,
    "half": 15
  },
  "assassin": {
    "w": 96,
    "h": 96,
    "ox": 44,
    "oy": 88,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 56,
    "half": 29
  },
  "archer": {
    "w": 96,
    "h": 96,
    "ox": 34,
    "oy": 88,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 58,
    "half": 37
  },
  "spellcaster": {
    "w": 96,
    "h": 96,
    "ox": 43,
    "oy": 88,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 57,
    "half": 22
  },
  "bombardier": {
    "w": 96,
    "h": 96,
    "ox": 38,
    "oy": 88,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 52,
    "half": 32
  },
  "summoner": {
    "w": 96,
    "h": 96,
    "ox": 44,
    "oy": 88,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 59,
    "half": 20
  },
  "berserker": {
    "w": 96,
    "h": 96,
    "ox": 43,
    "oy": 88,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 55,
    "half": 32
  },
  "splitter": {
    "w": 96,
    "h": 96,
    "ox": 44,
    "oy": 88,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 54,
    "half": 30
  },
  "bloodfang": {
    "w": 192,
    "h": 160,
    "ox": 78,
    "oy": 152,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 120,
    "half": 73
  },
  "gravekeeper": {
    "w": 192,
    "h": 160,
    "ox": 106,
    "oy": 152,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 114,
    "half": 49
  },
  "ember_matriarch": {
    "w": 192,
    "h": 160,
    "ox": 94,
    "oy": 152,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 121,
    "half": 56
  },
  "hollow_king": {
    "w": 192,
    "h": 160,
    "ox": 88,
    "oy": 152,
    "cols": 8,
    "frames": [
      8,
      8,
      6,
      2,
      6
    ],
    "top": 124,
    "half": 58
  }
};
