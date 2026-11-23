// Tela de seleção de herói (M14-08): as peças da tela única (herói, dificuldade, seed e spell inicial numa tela).
// Aqui ficam o que não depende do estado da interface: as barras comparáveis dos 9 heróis e o texto do ataque.
// O que é mostrado vem dos dados dos heróis; nenhum número de balanceamento novo.
import { computeStats, type FinalStats } from "../core/stats";
import { HEROES, HERO_ORDER, type HeroDef } from "../data/heroes";

/** Uma barra: o valor do herói e a fração do maior dos 9 (0 a 1). */
export interface HeroBar {
  label: string;
  value: number;
  frac: number;
  tip: string;
}

type BarDef = { label: string; tip: string; of: (h: HeroDef, s: FinalStats) => number; fmt: (v: number) => string };

const BARS: readonly BarDef[] = [
  { label: "Life", tip: "Max HP", of: (_h, s) => s.maxHp, fmt: (v) => `${Math.round(v)} HP` },
  {
    label: "Defense", tip: "Damage taken after armor and dodge (lower is better)",
    of: (_h, s) => 1 / (s.damageTaken * (1 - s.dodge)), fmt: (v) => `${Math.round(100 / v)}% damage taken`,
  },
  {
    label: "Attack", tip: "Basic attack damage per second (crits averaged in)",
    of: (h, s) => s.damage * s.autoDamage * h.auto.damage * h.auto.rate * s.attackSpeed * (1 + s.critChance * (s.critDamage - 1)),
    fmt: (v) => `${v.toFixed(1)} per second`,
  },
  {
    label: "Magic", tip: "Spell damage of the hero's best school, per cooldown",
    of: (_h, s) => (s.spellDamage * Math.max(1, ...Object.values(s.school))) / s.cooldownMult,
    fmt: (v) => `x${v.toFixed(2)}`,
  },
  { label: "Speed", tip: "Move speed", of: (_h, s) => s.moveSpeed, fmt: (v) => `${v.toFixed(1)} m/s` },
  { label: "Range", tip: "Basic attack reach", of: (h, s) => h.auto.range * s.range, fmt: (v) => `${v.toFixed(1)} m` },
];

let cache: Record<string, HeroBar[]> | null = null;

/** As barras de cada herói, com a escala pelo maior dos 9 em cada atributo. */
export function heroBars(id: string): HeroBar[] {
  if (!cache) {
    const raw = HERO_ORDER.map((h) => {
      const d = HEROES[h];
      const s = computeStats([d.stats], d.style);
      return BARS.map((b) => b.of(d, s));
    });
    const max = BARS.map((_, i) => Math.max(...raw.map((r) => r[i])));
    cache = Object.fromEntries(HERO_ORDER.map((h, k) => [h, BARS.map((b, i) => ({
      label: b.label, value: raw[k][i], frac: raw[k][i] / max[i], tip: `${b.tip}: ${b.fmt(raw[k][i])}`,
    }))]));
  }
  return cache[id] ?? [];
}

export function barsHtml(id: string): string {
  return `<div class="hs-bars">${heroBars(id).map((b) => `<div class="hs-bar" title="${b.tip}"><span>${b.label}</span>
    <i><b style="width:${Math.max(6, Math.round(b.frac * 100))}%"></b></i></div>`).join("")}</div>`;
}

/** O ataque básico em uma linha: arma, forma, ritmo e alcance. */
export function attackLine(h: HeroDef): string {
  const a = h.auto;
  const kind = a.kind === "melee" ? `melee, ${a.arcDeg ?? 90}° arc` : "ranged";
  const extra: string[] = [];
  if (a.ricochet) extra.push(`ricochets ${a.ricochet}x`);
  if (a.pierce) extra.push(`pierces ${a.pierce}`);
  if (a.status) extra.push(`applies ${a.status.kind}`);
  if (a.backstab) extra.push("bonus from behind");
  return `${h.weaponName} · ${kind} · ${a.rate.toFixed(1)} attacks/s · ${a.range} m${extra.length ? ` · ${extra.join(" · ")}` : ""}`;
}
