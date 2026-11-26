// Tela de seleção de herói (M14-08): as peças da tela única (herói, dificuldade, seed e spell inicial numa tela).
// Aqui ficam o que não depende do estado da interface: as barras comparáveis dos 9 heróis e o texto do ataque.
// O que é mostrado vem dos dados dos heróis; nenhum número de balanceamento novo.
import { computeStats, type FinalStats } from "../core/stats";
import { HEROES, HERO_ORDER, type HeroDef } from "../data/heroes";
import { masteryInfo, masteryOpen, type Loadout } from "../core/mastery";
import { ALT_AUTOS, ALT_TECHNIQUE, MASTERY } from "../data/mastery";
import { TECHNIQUES } from "../data/techniques";
import { heroSkins, skinLockText } from "../core/skins";

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

/**
 * M21-11: o bloco de maestria da tela de seleção. Nível e barra de pontos, e duas escolhas (ataque e técnica):
 * a original ou a alternativa, trancada até o nível. `pick` já vem sem o que está trancado (`allowedLoadout`).
 */
export function masteryHtml(id: string, points: number, pick: Loadout, all: boolean): string {
  const m = masteryInfo(points);
  const open = masteryOpen(points, all);
  const frac = m.next > m.from ? (points - m.from) / (m.next - m.from) : 1;
  const h = HEROES[id];
  const alt = ALT_AUTOS[id];
  const tech = TECHNIQUES[ALT_TECHNIQUE[id]];
  const row = (kind: "auto" | "technique", label: string, base: string, baseTip: string, altName: string, altTip: string, need: number) => {
    const ok = open[kind];
    const on = pick[kind] === true;
    return `<div class="hs-mrow"><span>${label}</span>
      <button class="${on ? "" : "sel"}" data-mastery="${kind}" data-on="0" title="${baseTip}">${base}</button>
      <button class="${on ? "sel" : ""}" data-mastery="${kind}" data-on="1" ${ok ? "" : "disabled"} title="${ok ? altTip : `Reach Mastery ${need} with ${h.name} to unlock. ${altTip}`}">${ok ? "" : "🔒 "}${altName}</button></div>`;
  };
  return `<div class="section">Mastery <small>· alternatives, not more power</small></div>
    <div class="hs-mastery" title="Every wave won with ${h.name} gives ${MASTERY.waveClear} point; every boss defeated, ${MASTERY.bossKill} more">
      <div class="hs-mlv"><b>Lv ${m.level}</b><i><b style="width:${Math.round(frac * 100)}%"></b></i>
        <small>${m.level < m.maxLevel ? `${points} / ${m.next}` : `${points} · max`}</small></div>
      ${row("auto", "Attack", "Default", h.weaponName, alt.name, alt.text, MASTERY.autoLevel)}
      ${row("technique", "Technique", h.technique.name, h.technique.text, tech.name, tech.text, MASTERY.techniqueLevel)}
    </div>`;
}

// ---------------------------------------------------------------- M14-09 etapa 2: aparência, retratos e abas

/** Abas da ficha do herói (Q e E trocam). */
export const HERO_TABS = [
  { id: "overview", name: "Overview" },
  { id: "kit", name: "Kit" },
  { id: "mastery", name: "Mastery" },
  { id: "records", name: "Records" },
] as const;
export type HeroTab = (typeof HERO_TABS)[number]["id"];

const MEDAL_COLOR = ["", "#7ee08a", "#9be4ff", "#ff7a6a"];
const MEDAL_NAME = ["", "Easy", "Normal", "Hard"];

/** Selo do retrato: medalhas (3 pontos, Easy a Hard) e o nível de maestria. */
export function portraitBadgesHtml(medal: number, points: number): string {
  const lv = masteryInfo(points).level;
  const pips = [1, 2, 3].map((m) => `<i class="${medal >= m ? "on" : ""}" style="--mc:${MEDAL_COLOR[m]}"></i>`).join("");
  const tip = `${medal ? `Won on ${MEDAL_NAME[medal]}` : "No win yet"} · Mastery ${lv}`;
  return `<span class="hs-badges" title="${tip}"><span class="hs-medals">${pips}</span><b>M${lv}</b></span>`;
}

/**
 * A fileira de aparência no pé do palco: as 6 skins (o rosto do herói com o anel da skin) e o Founder.
 * Só a Default se veste por enquanto: a arte de cada skin é o `M13-06` e o Founder o `M13-07` (fase 2).
 */
export function appearanceHtml(face: string, medal: number, depthsBest: number): string {
  const tiles = heroSkins(medal, depthsBest).map(({ skin, open }) => {
    const sel = skin.id === "default";
    const state = sel ? "Equipped" : open ? "Unlocked · look comes later" : skinLockText(skin);
    return `<button class="hs-skin ${sel ? "sel" : ""} ${open ? "" : "locked"}" style="--sc:${skin.color}" ${sel ? "" : "disabled"}
      title="${skin.name} · ${state}"><span class="th"><img src="${face}" alt="">${open ? "" : `<i class="lock">🔒</i>`}</span>
      <b>${skin.name}</b><small>${sel ? "Equipped" : open ? "Soon" : skinLockText(skin)}</small></button>`;
  }).join("");
  return `<div class="hs-look"><div class="section">Appearance</div><div class="hs-skins">${tiles}
    <button class="hs-skin founder" disabled title="Founder effect: wings, cloaks and auras on top of any skin · comes later">
      <span class="th">✦</span><b>Founder</b><small>Soon</small></button></div></div>`;
}
