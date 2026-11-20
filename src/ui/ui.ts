// Interface em DOM: título, HUD, status da partida, relíquias, melhorias, pausa.
import { MAP_NODE } from "../data/map-nodes";
import { canHasten, hastenBonus } from "../core/wave";
import { DIFFICULTIES, DIFFICULTY_ORDER, DIFFICULTY_TEXT, TOTAL_WAVES, type DifficultyId } from "../data/run";
import { clearRun, discardLegacySave, loadRecords, loadRun, safeStorage, writeRecords } from "../core/save";
import { RunRng, addRecord, continueRun, decodeSeed, newRun, newSpellSlot, recordsRun, summarize, type NewRunOptions, type RunState } from "../core/run";
import { addModifier, addSpell, levelUpSpell, type SlotResult } from "../core/spells";
import { achievementCount, isNew, isOpen, isSecret, markFreshSeen, progress, unlockCondition } from "../core/achievements";
import { ACHIEVEMENTS } from "../data/achievements";
import { formatStat, STAT_KEYS, type FinalStats, type StatBlock } from "../core/stats";
import {
  AURA_SPIKE_TEXT, EVOLUTIONS, MAX_SPELLS, SPELL_MAX_LEVEL, SPELL_ORDER, SPELL_TEXT, SPELLS, modifierCounts, modifierText, type EvolutionDef, type SpellId,
} from "../data/spells";
import { wantedRelics } from "../core/evolution";
import { effectsFor, rerollCost as levelRerollCost, rerollsLeft, type UpgradeTier } from "../core/levelup";
import { evaluateOffer, rerollCost, shopSlotOf, type ShopOffer } from "../core/shop";
import { SHOP_ITEMS } from "../data/shop";
import { PCT_STATS, UPGRADE_BY_ID, type UpgradeEffect } from "../data/upgrades";
import { BOSSES } from "../data/enemies";
import { HEROES, HERO_ORDER, type HeroDef } from "../data/heroes";
import { TECHNIQUES, TECH_MAX_LEVEL } from "../data/techniques";
import { RELICS, RELIC_IDS } from "../data/relics";
import { ROOM_BY_ID, type RoomDef, type RoomMods } from "../data/rooms";
import type { MapCard } from "../core/runmap";
import { TUNING } from "../data/tuning";
import { ZONES, ZONE_ORDER } from "../data/zones";
import type { Game } from "../game/game";

const hex = (n: number) => "#" + n.toString(16).padStart(6, "0");
const QUALITY = ["low", "medium", "high"];
const RELIC_RARITY: Record<string, string> = { incomum: "Uncommon", raro: "Rare", epico: "Epic" };
const TIER_LABEL: Record<UpgradeTier, string> = { common: "Common", rare: "Rare", epic: "Epic" };
const TIER_COLOR: Record<UpgradeTier, string> = { common: "#c9c4b8", rare: "#4fa3ff", epic: "#b36bff" };
/** Nome dos atributos de lá que as melhorias oferecidas usam (o original diz "Auto Damage"; aqui vale para todo o dano). */
const UPGRADE_LABEL: Record<string, string> = {
  damageFlat: "Damage", attackSpeedPct: "Attack Speed", autoDamagePct: "Damage", critChance: "Crit Chance",
  armor: "Armor", moveSpeedPct: "Move Speed", maxHpFlat: "HP", maxHpPct: "HP", rangePct: "Range",
  dodge: "Dodge", regen: "Regeneration/s", xpPct: "XP earned", goldPct: "Gold earned", spellCooldownPct: "Technique Cooldown",
  // D14 e o resto de upgrades.ts, com as palavras do en.lua de lá
  damagePct: "Damage", spellPowerFlat: "Spell Power", spellDamagePct: "Spell Damage", spellCritChance: "Spell Crit",
  firePct: "Fire Damage", icePct: "Ice Damage", lightningPct: "Lightning Damage", arcanePct: "Arcane Damage", earthPct: "Earth Damage",
  windPct: "Wind Damage", lightPct: "Light Damage", runePct: "Rune Damage", poisonPct: "Poison Damage", burnPct: "Burn Damage",
  slowPct: "Slow", slowDurationPct: "Slow Duration", slowedDamagePct: "damage vs. Slowed targets", areaPct: "Area", cdrPct: "Cooldown",
  critDamagePct: "Crit Damage", echoChance: "Echo chance", volatileChance: "Volatile chance", chainRangePct: "Lightning jump",
  knockbackPct: "Knockback", autoProjectileSpeedPct: "Projectile Speed", bossDamagePct: "Boss damage", executionerPct: "damage to bosses below 30% HP",
  techniqueDamagePct: "Technique damage", followThroughPct: "damage for 3 s after the technique", deathHealChance: "chance to heal on kill",
  healPct: "Healing Received", championGoldPct: "Champion gold", championXpPct: "Champion XP", championHpPct: "Champion HP",
  survivorRewardPct: "Survivor reward", shopPricePct: "Shop prices", riftDurationFlat: "s Time Rift duration",
  doubleShot: "shot in a row", coneShot: "projectile in a cone", pierce: "Pierce",
};
/** Nome e texto de cada carta do mapa, como em data/run_map.lua (o nome fica em inglês, igual ao de lá). */
/** Linhas da sala na carta; na recompensa, mais é bom; no resto, mais é ruim. */
const ROOM_MOD_LABEL: [keyof RoomMods, string][] = [
  ["reward", "reward"], ["enemyHp", "enemy HP"], ["enemyDamage", "enemy damage"],
  ["enemyCount", "enemies"], ["enemySpeed", "enemy speed"], ["projectileSpeed", "projectile speed"],
];

/** Na recarga, negativo é bom (format.lua `INVERTED`). */
const INVERTED: Record<string, true> = { spellCooldownPct: true, cdrPct: true, shopPricePct: true };

function upgradeLine(e: UpgradeEffect): string {
  const good = INVERTED[e.stat] ? e.value < 0 : e.value > 0;
  const n = PCT_STATS[e.stat] ? `${Math.round(e.value * 1000) / 10}%` : String(Math.round(e.value * 100) / 100);
  const txt = `${e.value >= 0 ? "+" : ""}${n} ${UPGRADE_LABEL[e.stat] ?? e.stat}`;
  return `<div class="stat ${good ? "" : "neg"}">${txt}</div>`;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", html = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

/** Passiva e técnica do herói (escolha de herói e pausa); `cooldown` em s, já com os bônus quando houver. */
type RunSetup = Pick<NewRunOptions, "heroId" | "difficultyId" | "startingSpell">;

/** Cor da carta de cada dificuldade. */
const DIFF_COLOR: Record<DifficultyId, string> = { easy: "#7ee08a", normal: "#9be4ff", hard: "#ff7a6a" };

function heroKit(h: HeroDef, cooldown: number): string {
  const cd = cooldown.toFixed(cooldown % 1 ? 1 : 0);
  return `<div class="kit">
    <div class="kit-row"><b>Passive</b><ul>${h.passive.map((t) => `<li>${t}</li>`).join("")}</ul></div>
    <div class="kit-row"><b>Technique</b><div><span class="kit-name">${h.technique.name}</span>
      <span class="kit-meta">right click or Q · cooldown ${cd} s</span><p>${h.technique.text}</p></div></div>
  </div>`;
}

/** Linhas da tela de status para os atributos de spell da D14, só os que fogem do neutro. */
function spellBonusLines(s: FinalStats): string {
  const signed = (v: number) => `${v >= 0 ? "+" : ""}${Math.round(v * 100)}%`;
  const rows: [string, number][] = [
    ["Spell Damage", s.spellDamage - 1], ["Fire Damage", s.school.fire - 1], ["Ice Damage", s.school.ice - 1],
    ["Lightning Damage", s.school.lightning - 1], ["Arcane Damage", s.school.arcane - 1], ["Burn Damage", s.burn - 1],
    ["Slow", s.slowPoints], ["Slow Duration", s.slowDuration - 1], ["Poison Damage", s.poison - 1],
  ];
  return rows.filter(([, v]) => Math.abs(v) > 1e-9).map(([k, v]) => `<span>${k}</span><b>${signed(v)}</b>`).join("");
}

function statLines(stats: StatBlock): string {
  return STAT_KEYS.filter((k) => stats[k]).map((k) => `<div class="st">${formatStat(k, stats[k]!)}</div>`).join("");
}

export class Ui {
  private hud = el("div", "hidden");
  private overlay: HTMLElement | null = null;
  private overlayKind = "";
  private tip = el("div", "hidden");
  private toasts!: HTMLElement;
  private mapCtx!: CanvasRenderingContext2D;
  private frameN = 0;
  private selectedHero: string = HERO_ORDER[0];
  private confirmNew = "";
  private selectedDifficulty: DifficultyId = "normal";
  private selectedSpell = "";
  private seedText = "";
  private storage = safeStorage();
  private r: Record<string, HTMLElement> = {};

  constructor(private game: Game, private root: HTMLElement) {
    this.hud.id = "hud";
    this.tip.id = "tip";
    root.append(this.hud, this.tip);
    this.buildHud();
    game.events = {
      toast: (m, c) => this.toast(m, c),
      relicChoice: (ids, pick, title) => this.showRelicChoice(ids, pick, title),
      levelUp: () => this.showLevelUp(),
      evolution: () => this.showEvolution(),
      shop: () => this.showShop(),
      died: () => setTimeout(() => this.showDeath(), 900),
      zoneChanged: () => this.onZoneChanged(),
      statusChanged: () => {
        if (this.overlayKind === "status") this.showStatus();
      },
      victory: () => this.showVictory(),
      banner: (t, sub) => this.banner(t, sub),
    };
    window.addEventListener("keydown", (e) => this.onKey(e));
    this.showTitle();
    const loop = () => {
      requestAnimationFrame(loop);
      this.updateHud();
    };
    loop();
  }

  // ---------------------------------------------------------------- base
  private open(kind: string, id: string): HTMLElement {
    this.close();
    const ov = el("div", "overlay");
    ov.id = id;
    const panel = el("div", "panel");
    ov.append(panel);
    this.root.append(ov);
    this.overlay = ov;
    this.overlayKind = kind;
    this.game.paused = true;
    this.game.input.reset();
    return panel;
  }

  private close(): void {
    this.overlay?.remove();
    this.overlay = null;
    this.overlayKind = "";
    this.tip.classList.add("hidden");
    this.game.paused = false;
    this.game.input.reset();
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.game.started || e.repeat) return;
    const k = e.code;
    // a loja: Esc sai, R troca as ofertas (shop.lua); o resto fica preso como nas outras escolhas
    if (this.overlayKind === "shop") {
      if (k === "Escape") this.leaveShop();
      else if (k === "KeyR") this.game.rerollShop();
      return;
    }
    const locked = ["title", "relic", "levelup", "evolution", "map", "death", "victory", "results"].includes(this.overlayKind);
    if (locked) return;
    if (k === "Escape") {
      if (this.overlay) this.close();
      else this.showPause();
    } else if (k === "KeyI" || k === "Tab") {
      e.preventDefault();
      if (this.overlayKind === "status") this.close();
      else this.showStatus();
    } else if (k === "F3") {
      e.preventDefault();
      this.r.perf.classList.toggle("hidden");
    } else if (k === "F1" && TUNING.devTools) {
      e.preventDefault();
      if (this.overlayKind === "grimoire") this.close();
      else this.showGrimoire();
    }
  }

  /** Letreiro grande no meio da tela, some sozinho. */
  banner(title: string, sub = ""): void {
    const b = this.r.banner;
    b.innerHTML = `<h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}`;
    b.classList.remove("show");
    void b.offsetWidth;
    b.classList.add("show");
  }

  toast(msg: string, color = "#e8eaf2"): void {
    const t = el("div", "toast");
    t.textContent = msg;
    t.style.color = color;
    this.toasts.append(t);
    while (this.toasts.children.length > 6) this.toasts.firstChild!.remove();
    setTimeout(() => t.remove(), 4300);
  }

  // ---------------------------------------------------------------- título e início da partida (run_setup.lua)
  /** Passo 1 de 3: herói (e continuar a partida salva). */
  private showTitle(): void {
    this.game.stop();
    this.hud.classList.add("hidden");
    const panel = this.open("title", "title");
    this.game.paused = true;
    if (discardLegacySave(this.storage)) {
      this.toast("The old save (persistent hero with items) was discarded: the game is now played in runs, like Dungeon Reign", "#ffc83d");
    }
    const save = loadRun(this.storage);
    const rec = loadRecords(this.storage);
    const ach = this.game.ach.state;
    const open = (id: string) => isOpen(ach, "hero", id, TUNING.unlockAll);
    if (!open(this.selectedHero)) this.selectedHero = HERO_ORDER.find(open) ?? HERO_ORDER[0];
    /** unlocks.lua `condition`: o que falta para liberar ("???" se a conquista é secreta) */
    const lockText = (id: string) => {
      const a = unlockCondition("hero", id);
      if (!a) return "";
      if (isSecret(ach, "hero", id)) return "Locked · ???";
      const p = progress(ach, a, rec.kills);
      return `Locked · ${a.text}${p ? ` (${Math.min(p.current, p.goal).toLocaleString("en-US")} / ${p.goal.toLocaleString("en-US")})` : ""}`;
    };
    const render = () => {
      const h = HEROES[this.selectedHero];
      const best = DIFFICULTY_ORDER.flatMap((d) => {
        const b = rec.best[`${h.id}/${d}`];
        return b ? [`${DIFFICULTIES[d].name}: wave ${b.wave}${b.victory ? " (victory)" : ""}`] : [];
      });
      panel.innerHTML = `
        <h1>DUNGEON REIGN</h1>
        <p class="tag">Action RPG · prototype 0.3 · procedural maps, one hero, waves and bosses</p>
        ${save ? `<div class="continue"><button class="primary" data-act="continue" style="padding:12px 30px;font-size:16px">
          Continue — ${HEROES[save.run.heroId]?.name ?? "?"} · ${DIFFICULTIES[save.run.difficultyId].name} · wave ${save.wave} · level ${save.run.level} · seed ${save.run.seedCode}</button></div>` : ""}
        ${rec.runs ? `<p class="tag" style="margin:-8px 0 14px">${rec.runs} runs · ${rec.wins} wins · best wave ${rec.highestWave}${rec.bestEndless ? ` · endless to wave ${rec.bestEndless}` : ""} · ${rec.kills} kills · ${achievementCount(ach)} of ${ACHIEVEMENTS.length} achievements</p>` : ""}
        <div class="section">Step 1 of 3 · ${save ? "choose the hero for a new run (ends the current one)" : "choose your hero"}</div>
        <div class="heroes">${HERO_ORDER.map((id) => {
          const d = HEROES[id];
          const locked = !open(id);
          return `<div class="hero-card ${id === this.selectedHero ? "sel" : ""} ${locked ? "locked" : ""}" data-hero="${id}" style="--hc:${hex(d.color)}">
            <div class="swatch"></div><b>${d.name}${isNew(ach, "hero", id) ? ` <em class="new">NEW</em>` : ""}</b><i>${d.title}</i>
            <span>${locked ? lockText(id) : d.identity}</span></div>`;
        }).join("")}</div>
        <div class="hero-detail" style="--hc:${hex(h.color)}">
          <h3 style="color:${hex(h.color)}">${h.name} — ${h.title}</h3>
          ${heroKit(h, h.technique.cooldown)}
          <p style="color:var(--muted)">${statLines(h.stats).replace(/<div class="st">/g, "").replace(/<\/div>/g, " · ").replace(/ · $/, "")}</p>
          ${best.length ? `<p style="color:var(--gold)">Best: ${best.join(" · ")}</p>` : ""}
        </div>
        <div class="title-actions"><button class="primary" data-act="next">Continue with ${h.name} ›</button></div>`;
    };
    render();
    panel.onclick = (ev) => {
      const t = ev.target as HTMLElement;
      const card = t.closest<HTMLElement>("[data-hero]");
      if (card) {
        const id = card.dataset.hero!;
        if (!open(id)) return;
        this.selectedHero = id;
        if (markFreshSeen(ach, "hero", id)) this.game.saveAchievements();
        this.confirmNew = "";
        render();
        return;
      }
      const act = t.closest<HTMLElement>("[data-act]")?.dataset.act;
      if (act === "continue" && save) {
        const c = continueRun(save);
        this.begin(c.run, c.rng);
      } else if (act === "next") {
        // confirmação em dois cliques (sem confirm(): alguns ambientes bloqueiam diálogos)
        if (save && this.confirmNew !== this.selectedHero) {
          this.confirmNew = this.selectedHero;
          const b = t.closest<HTMLElement>("[data-act]")!;
          b.textContent = "This ends the current run. Click again to confirm";
          b.classList.add("danger");
          return;
        }
        this.confirmNew = "";
        this.seedText = "";
        this.showDifficulty();
      }
    };
  }

  /** Passo 2 de 3: dificuldade e seed (vazia = aleatória). */
  private showDifficulty(): void {
    const panel = this.open("title", "title");
    const h = HEROES[this.selectedHero];
    const x = (v: number) => `x${v.toFixed(2)}`;
    const render = (err = "") => {
      panel.innerHTML = `
        <div class="section">Step 2 of 3 · difficulty · hero: ${h.name}</div>
        <div class="cards">${DIFFICULTY_ORDER.map((id) => {
          const d = DIFFICULTIES[id];
          const sel = id === this.selectedDifficulty;
          return `<div class="card" data-diff="${id}" style="--cc:${DIFF_COLOR[id]};${sel ? "border-color:var(--cc)" : ""}">
            <h3>${d.name}</h3><p>${DIFFICULTY_TEXT[id]}</p>
            <p class="note">Enemy HP ${x(d.enemyHp)} · enemy damage ${x(d.enemyDamage)} · enemy speed ${x(d.enemySpeed)}</p>
            <p class="note">Boss HP ${x(d.bossHp)} · reward ${x(d.reward)}</p>
            ${sel ? `<div class="meta" style="margin-top:6px">[ selected ]</div>` : ""}</div>`;
        }).join("")}</div>
        <div class="section">Seed</div>
        <p class="note" style="color:var(--muted)">Same seed = same map, rooms, relics and bosses. Paste the 7-letter code of a run (pause or results) or type any word. Empty = random.</p>
        <input class="seed" data-r="seed" maxlength="24" placeholder="Random" value="${this.seedText}" spellcheck="false">
        ${err ? `<p style="color:var(--bad)">${err}</p>` : ""}
        <div class="title-actions"><button data-act="back">‹ Back</button><button class="primary" data-act="next">Continue ›</button></div>`;
      const input = panel.querySelector<HTMLInputElement>("[data-r=seed]")!;
      input.oninput = () => (this.seedText = input.value.toUpperCase());
      input.onkeydown = (e) => {
        e.stopPropagation();
        if (e.key === "Enter") next();
      };
    };
    const next = () => {
      const code = this.seedText.trim();
      if (code && decodeSeed(code) === null) {
        render("Invalid seed: use letters and numbers.");
        return;
      }
      this.showStartingSpell();
    };
    render();
    panel.onclick = (ev) => {
      const t = ev.target as HTMLElement;
      const card = t.closest<HTMLElement>("[data-diff]");
      if (card) {
        this.selectedDifficulty = card.dataset.diff as DifficultyId;
        render();
        return;
      }
      const act = t.closest<HTMLElement>("[data-act]")?.dataset.act;
      if (act === "back") this.showTitle();
      else if (act === "next") next();
    };
  }

  /** Passo 3 de 3: spell inicial, 1 das 4 do herói (spell_select.lua). */
  private showStartingSpell(): void {
    const panel = this.open("title", "title");
    const h = HEROES[this.selectedHero];
    if (!h.startingSpells.includes(this.selectedSpell as SpellId)) this.selectedSpell = h.startingSpells[0];
    const render = () => {
      panel.innerHTML = `
        <div class="section">Step 3 of 3 · starting spell · ${h.name} · ${DIFFICULTIES[this.selectedDifficulty].name}</div>
        <p class="note" style="color:var(--muted)">Other spells come from the shop and from upgrades.</p>
        <div class="cards">${h.startingSpells.map((id) => {
          const sel = id === this.selectedSpell;
          return `<div class="card" data-spell="${id}" style="--cc:${hex(h.color)};${sel ? "border-color:var(--cc)" : ""}">
            <h3>${spellName(id)}</h3><p>${SPELL_TEXT[id]}</p>
            ${sel ? `<div class="meta" style="margin-top:6px">[ selected ]</div>` : ""}</div>`;
        }).join("")}</div>
        <div class="title-actions"><button data-act="back">‹ Back</button><button class="primary" data-act="go">Start the run</button></div>`;
    };
    render();
    panel.onclick = (ev) => {
      const t = ev.target as HTMLElement;
      const card = t.closest<HTMLElement>("[data-spell]");
      if (card) {
        this.selectedSpell = card.dataset.spell!;
        render();
        return;
      }
      const act = t.closest<HTMLElement>("[data-act]")?.dataset.act;
      if (act === "back") this.showDifficulty();
      else if (act === "go") {
        const code = this.seedText.trim();
        this.newRunWith({ heroId: h.id, difficultyId: this.selectedDifficulty, startingSpell: this.selectedSpell },
          code ? decodeSeed(code)! : undefined);
      }
    };
  }

  /** Partida nova: apaga o checkpoint anterior; com `seed`, repete aquela seed. */
  private newRunWith(setup: RunSetup, seed?: number): void {
    clearRun(this.storage);
    const run = newRun({ ...setup, seed, randomSeed: (Math.random() * 0x7fffffff) >>> 0 });
    this.begin(run, new RunRng(run.seed));
  }

  /** Começa a partida; o jogo grava o checkpoint ao entrar na zona. */
  private begin(run: RunState, rng: RunRng): void {
    this.game.audio.unlock();
    this.close();
    this.hud.classList.remove("hidden");
    this.game.start(run, rng);
    if (run.statistics.kills === 0) this.toast("WASD to move · mouse to aim · hold left click to attack", "#9be4ff");
  }

  // ---------------------------------------------------------------- HUD
  private buildHud(): void {
    this.hud.innerHTML = `
      <div id="vignette"></div>
      <div class="hud-top-left"><h2 data-r="zone"></h2><p data-r="zoneSub"></p><p class="gold"><span data-r="gold"></span><span class="bank hidden" data-r="bank" title="BANKED LOOT: orbs left on the floor were banked. Enemies with the coin under them drop double until it runs out."></span></p><div class="points hidden" data-r="points"></div></div>
      <div id="wavebar" data-r="waveBar"><b data-r="waveN"></b><span data-r="waveT"></span><span class="hasten hidden" data-r="hasten"></span></div>
      <div id="banner" data-r="banner"></div>
      <canvas id="minimap" width="176" height="176"></canvas>
      <div class="hud-help">1 and 2 spells · H hasten the wave · I status · Esc pause<br>F3 performance${TUNING.devTools ? " · F1 DEV grimoire" : ""}</div>
      <div id="bossbar" class="hidden" data-r="boss"><h3 data-r="bossName"></h3><div class="bar"><i data-r="bossFill"></i><span data-r="bossText"></span></div></div>
      <div id="hint" class="hidden" data-r="hint"></div>
      <div id="gatecard" class="hidden" data-r="gateCard"></div>
      <div id="perf" class="hidden" data-r="perf"></div>
      <div id="toasts"></div>
      <div class="hud-bottom">
        <div class="skills">
          <div class="level-badge"><div><small>LEVEL</small><span data-r="level"></span></div></div>
          <div class="skill"><kbd>LMB</kbd>⚔️</div>
          <div class="skill-wrap"><div class="skill big" data-r="techBox"><kbd>RMB</kbd>✨<div class="cd" data-r="techCd"></div><div class="cdn" data-r="techN"></div></div>
            <small class="skill-name" data-r="techName"></small></div>
          ${[0, 1].map((i) => `<div class="skill-wrap"><div class="skill spell" data-r="spBox${i}"><kbd>${i + 1}</kbd><span data-r="spIcon${i}"></span><div class="cd" data-r="spCd${i}"></div><div class="cdn" data-r="spN${i}"></div></div>
            <small class="skill-name" data-r="spName${i}"></small></div>`).join("")}
          <div class="skill"><kbd>SPACE</kbd>💨<div class="cd" data-r="dashCd"></div></div>
        </div>
        <div class="bar"><i data-r="hpFill"></i><span data-r="hpText"></span></div>
        <div class="bar xp"><i data-r="xpFill"></i></div>
      </div>`;
    this.hud.querySelectorAll<HTMLElement>("[data-r]").forEach((e) => (this.r[e.dataset.r!] = e));
    this.toasts = this.hud.querySelector("#toasts")!;
    this.mapCtx = this.hud.querySelector<HTMLCanvasElement>("#minimap")!.getContext("2d")!;
  }

  /** Espaços de spell nas teclas 1 e 2: ícone, nível, recarga e o aviso de spell que não saiu. */
  private updateSpellHud(): void {
    const g = this.game;
    const r = this.r;
    for (let i = 0; i < 2; i++) {
      const slot = g.run.spells[i];
      const st = g.spells.stats[i];
      const box = r[`spBox${i}`];
      box.classList.toggle("empty", !slot);
      const name = slot ? `${spellName(slot.id)} ${slot.level}` : "";
      if (r[`spName${i}`].textContent !== name) {
        r[`spName${i}`].textContent = name;
        r[`spIcon${i}`].textContent = slot ? (SPELL_ICON[slot.id] ?? "✦") : "";
        box.title = slot && isSpellKey(slot.id)
          ? `${spellName(slot.id)} — ${SPELL_TEXT[slot.id]}${AURA_SPIKE_TEXT[slot.id] ? ` Aura: casts itself. ${AURA_SPIKE_TEXT[slot.id]}` : ""}`
          : "Empty spell slot";
        box.classList.toggle("aura", !!slot && !!AURA_SPIKE_TEXT[slot.id]);
      }
      const cd = g.spells.keyCooldown(i);
      const max = st?.cooldown ?? 1;
      r[`spCd${i}`].style.height = `${Math.min(1, cd / max) * 100}%`;
      r[`spN${i}`].textContent = cd > 0 ? cd.toFixed(cd < 3 ? 1 : 0) : "";
      box.classList.toggle("ready", !!slot && cd <= 0);
      box.classList.toggle("no-target", (g.spells.noTarget[i] ?? 0) > 0);
    }
  }

  private onZoneChanged(): void {
    const z = this.game.zone;
    this.r.zone.textContent = z.name;
    const w = this.game.run.wave;
    const first = w - ((w - 1) % 5);
    this.r.zoneSub.textContent = `${z.subtitle} · waves ${first}–${first + 4}`;
  }

  private updateHud(): void {
    const g = this.game;
    if (!g.started) return;
    const p = g.player;
    const s = g.stats;
    const r = this.r;
    r.hpFill.style.width = `${(p.hp / s.maxHp) * 100}%`;
    r.hpText.textContent = `${Math.ceil(p.hp)} / ${s.maxHp}`;
    r.xpFill.style.width = `${Math.min(100, (g.run.xp / g.run.xpToNext) * 100)}%`;
    r.level.textContent = String(g.run.level);
    const tc = Math.max(0, p.techCd);
    r.techCd.style.height = `${(tc / p.techMax) * 100}%`;
    r.techN.textContent = tc > 0 ? tc.toFixed(tc < 3 ? 1 : 0) : "";
    r.techBox.classList.toggle("ready", tc <= 0);
    // nível 5: a técnica evoluída passa a mostrar o nome e o texto da evolução
    const evo = g.tech?.evolved ? TECHNIQUES[g.hero.technique.id]?.evolution : undefined;
    const tn = evo?.name ?? g.hero.technique.name;
    if (r.techName.textContent !== tn) {
      r.techName.textContent = tn;
      r.techBox.title = `${tn} — ${evo?.text ?? g.hero.technique.text}`;
    }
    this.updateSpellHud();
    r.dashCd.style.height = `${(Math.max(0, p.dashCd) / TUNING.hero.dashCooldown) * 100}%`;
    const pend = g.run.pendingLevelUps;
    r.points.classList.toggle("hidden", pend <= 0);
    r.points.textContent = `+${pend} upgrade${pend > 1 ? "s" : ""} at the end of the wave`;
    (this.hud.querySelector("#vignette") as HTMLElement).style.opacity = String(Math.max(p.hurtT * 0.6, p.hp / s.maxHp < 0.25 ? 0.35 : 0));
    const boss = g.boss;
    const showBoss = !!boss && g.bossEngaged && !boss.dead;
    r.boss.classList.toggle("hidden", !showBoss);
    if (showBoss && boss) {
      r.bossName.textContent = `${boss.ambush ? "Ambush: " : ""}${boss.boss!.name} — ${boss.title}${boss.enraged ? " (enraged)" : ""}`;
      r.bossFill.style.width = `${(boss.hp / boss.maxHp) * 100}%`;
      r.bossText.textContent = `${Math.ceil(boss.hp)} / ${boss.maxHp}`;
    }
    // onda: número, relógio, Apressar
    const n = g.run.wave;
    const total = n <= TOTAL_WAVES ? ` / ${TOTAL_WAVES}` : " · endless";
    r.waveN.textContent = `Wave ${n}${total}`;
    const w = g.wave;
    let t = "";
    if (g.phase === "walk") t = g.mapCards ? "choose a gate" : "go to the circle";
    else if (g.phase === "intro") t = "get ready";
    else if (g.phase === "fight" && w) {
      const left = Math.ceil(g.waveTimeLeft);
      t = w.isBossWave ? (w.heldByBoss ? "defeat the boss" : `${fmtTime(left)} · boss`) : fmtTime(left);
      if (w.hastened) t += " · hastened";
    } else if (g.phase === "cleared") t = "cleared";
    else if (g.phase === "portal") t = "portal open";
    r.waveT.textContent = t;
    const can = canHasten(w);
    r.hasten.classList.toggle("hidden", !can);
    if (can && w) r.hasten.textContent = `H hasten +${Math.round(hastenBonus(w) * 100)}%`;
    r.gold.textContent = `${g.run.gold} gold`;
    // D-637: os orbes guardados no banco, ao lado do ouro
    const banked = g.run.lootBank.length;
    r.bank.classList.toggle("hidden", banked <= 0);
    if (banked > 0) r.bank.textContent = `2x ×${banked}`;
    r.boss.style.top = "64px";
    const cards = g.mapCards;
    const hint = g.nearPortal ? "E — go on to the next zone"
      : g.phase === "walk" && g.playerAlive ? (cards ? `Walk through a gate to choose wave ${n}` : `Step into the circle to start wave ${n}`) : "";
    if (r.hint.textContent !== hint) r.hint.textContent = hint;
    r.hint.classList.toggle("hidden", !hint || !!this.overlay);
    // M21-08: a carta do portão mais perto (o mapa de consulta)
    const gi = cards && g.phase === "walk" ? g.nearGate : -1;
    const key = gi >= 0 ? `${g.run.wave}:${gi}` : "";
    if (r.gateCard.dataset.key !== key) {
      r.gateCard.dataset.key = key;
      r.gateCard.innerHTML = gi >= 0 ? mapCardHtml(cards![gi], gi) : "";
    }
    r.gateCard.classList.toggle("hidden", !key || !!this.overlay);
    if (this.frameN % 15 === 0 && !r.perf.classList.contains("hidden")) {
      r.perf.textContent = `${Math.round(g.fps)} fps · GPU ${g.pipeline.gpuMs < 0 ? "?" : g.pipeline.gpuMs.toFixed(1) + " ms"} · quality ${QUALITY[g.quality]} · ${g.pipeline.bufferSize.x}×${g.pipeline.bufferSize.y} (${Math.round(g.resScale * 100)}%)`;
      const rep = g.probe.report();
      r.perf.textContent += ` · frame ${rep.median} ms, worst ${rep.worst} ms, spikes ${rep.over2x}/${rep.frames}`;
    }
    if (this.frameN++ % 5 === 0) this.drawMinimap();
  }

  private drawMinimap(): void {
    const g = this.game;
    const ctx = this.mapCtx;
    const L = g.layout;
    if (!L) return;
    const S = 176;
    const k = S / (L.size + 8);
    const tx = (x: number) => S / 2 + x * k;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = hex(g.zone.ground[2]);
    ctx.globalAlpha = 0.85;
    ctx.fillRect(0, 0, S, S);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = hex(g.zone.path);
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.beginPath();
    L.path.forEach((pt, i) => (i ? ctx.lineTo(tx(pt.x), tx(pt.z)) : ctx.moveTo(tx(pt.x), tx(pt.z))));
    ctx.stroke();
    for (const e of g.enemies) {
      if (e.dead || e.summoned || e.isBoss) continue;
      ctx.fillStyle = e.champion ? "#ffc83d" : "#e0453f";
      const sz = e.champion ? 4 : 2;
      ctx.fillRect(tx(e.x) - sz / 2, tx(e.z) - sz / 2, sz, sz);
    }
    // trechos das ondas: o atual em destaque, os já passados apagados
    const cur = (g.run.wave - 1) % 5;
    L.segments.forEach((sg, i) => {
      ctx.strokeStyle = i === cur ? "#ffd27a" : i < cur ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.45)";
      ctx.lineWidth = i === cur ? 2 : 1;
      ctx.beginPath();
      ctx.arc(tx(sg.x), tx(sg.z), sg.r * k, 0, 7);
      ctx.stroke();
    });
    // M21-08: os portões do mapa, na cor da carta
    for (const m of g.gateMarks) {
      ctx.fillStyle = m.color;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(tx(m.x), tx(m.z), 3.5, 0, 7);
      ctx.fill();
      ctx.stroke();
    }
    // chefe / portal
    ctx.font = "14px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(g.phase === "portal" ? "🌀" : "💀", tx(L.boss.x), tx(L.boss.z));
    ctx.fillStyle = "#ffa040";
    ctx.beginPath();
    ctx.arc(tx(L.spawn.x), tx(L.spawn.z), 3, 0, 7);
    ctx.fill();
    // herói
    const p = g.player;
    ctx.save();
    ctx.translate(tx(p.x), tx(p.z));
    ctx.rotate(-p.facing + Math.PI);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.5, 5);
    ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------- DEV Grimoire (grimoire.lua, F1)
  private grimoireSpell: SpellId | "" = "";
  private grimoireMsg = "";

  /**
   * Painel de teste de grimoire.lua, fora do jogo canônico: dá spells, níveis, modificadores e relíquias
   * pelas mesmas funções que a loja vai usar (`addSpell`, `levelUpSpell`, `addModifier`). Marca a partida [DEV].
   */
  private showGrimoire(): void {
    const g = this.game;
    const run = g.run;
    g.markDev();
    const panel = this.overlayKind === "grimoire" ? (this.overlay!.firstChild as HTMLElement) : this.open("grimoire", "grimoire");
    const slotOf = (id: string) => run.spells.findIndex((sp) => sp.id === id);
    const sel = this.grimoireSpell;
    const spellRows = SPELL_ORDER.map((id) => {
      const i = slotOf(id);
      const slot = run.spells[i];
      const evo = slot?.evolution ? EVOLUTIONS[slot.evolution as keyof typeof EVOLUTIONS]?.name ?? slot.evolution : "";
      const status = slot ? `slot ${i + 1} · Lv ${slot.level}${evo ? ` · ${evo}` : ""}` : "not equipped";
      const btns = slot
        ? `<button data-g="lv" data-id="${id}">Lv +</button><button data-g="lv5" data-id="${id}">Lv ${SPELL_MAX_LEVEL}</button>`
        : `<button data-g="equip" data-id="${id}">Equip</button>`;
      return `<div class="g-spell${sel === id ? " on" : ""}${slot ? " owned" : ""}">
        <button class="g-name" data-g="pick" data-id="${id}" title="${SPELL_TEXT[id]}">${SPELL_ICON[id] ?? "✦"} ${SPELLS[id].name} <small>(${status})</small></button>${btns}</div>`;
    }).join("");
    const tslot = run.technique;
    const tdef = TECHNIQUES[g.hero.technique.id];
    const tevo = tslot.level >= TECH_MAX_LEVEL && tdef ? ` · ${tdef.evolution.name}` : "";
    const techRow = `<div class="g-spell owned"><span class="g-name" title="${tdef?.evolution.text ?? ""}">★ ${g.hero.technique.name}
      <small>(technique · Lv ${tslot.level}${tevo})</small></span><button data-g="tlv">Lv +</button><button data-g="tlv5">Lv ${TECH_MAX_LEVEL}</button></div>`;
    let mods = "";
    if (sel) {
      const slot = run.spells[slotOf(sel)];
      mods = `<div class="section">Shop modifiers — ${SPELLS[sel].name}</div><p class="g-desc">${SPELL_TEXT[sel]}</p>
        <div class="g-grid">${SPELLS[sel].modifiers.map((m) => {
          const n = slot ? slot.modifiers.filter((x) => x === m.id).length : 0;
          return `<button data-g="mod" data-id="${m.id}" title="${m.text}" ${slot ? "" : "disabled"} class="${n ? "on" : ""}">+ ${m.name}${n ? ` x${n}` : ""}</button>`;
        }).join("")}</div>`;
    }
    const relics = RELIC_IDS.map((id) => {
      const d = RELICS[id];
      const own = run.relics.includes(id);
      return `<button data-g="relic" data-id="${id}" class="${own ? "on" : ""}" style="${own ? `border-color:${hex(d.color)}` : ""}">${d.name}</button>`;
    }).join("");
    const nextBoss = Math.min(TOTAL_WAVES, (Math.floor(Math.max(1, run.wave) / 5) + 1) * 5);
    panel.innerHTML = `
      <div>
        <h2>DEV GRIMOIRE</h2>
        <p class="sub" style="color:var(--bad)">Test tool, outside the canonical game. This run is marked [DEV] and does not count for records.</p>
        <div class="section">Spells (click a name to see modifiers)</div>
        <div class="g-spells">${techRow}${spellRows}</div>
        ${mods}
      </div>
      <div>
        <div class="section" style="margin-top:0">Relics — full catalog (click to add/remove)</div>
        <div class="g-grid">${relics}</div>
        <div class="section">Utilities</div>
        <div class="g-grid">
          <button data-g="heal">Full heal</button><button data-g="cd">Reset cooldowns</button>
          <button data-g="kill">Kill all enemies</button><button data-g="end">End wave</button>
          <button data-g="boss">Go to W${nextBoss}</button>
        </div>
        <p class="g-msg" data-r="gmsg">${this.grimoireMsg}</p>
        <p class="note" style="color:var(--muted)">Evolutions show up at the end of the wave when a recipe is complete.</p>
        <div class="row end"><button data-act="close">Close (F1 / Esc)</button></div>
      </div>`;
    const say = (r: SlotResult, ok: string, why: Partial<Record<string, string>> = {}) => {
      this.grimoireMsg = r.ok ? ok : `Refused: ${why[r.reason] ?? r.reason}`;
    };
    panel.onclick = (ev) => {
      const t = ev.target as HTMLElement;
      if (t.closest("[data-act=close]")) return this.close();
      const b = t.closest<HTMLButtonElement>("[data-g]");
      if (!b || b.disabled) return;
      const id = b.dataset.id ?? "";
      switch (b.dataset.g) {
        case "pick": this.grimoireSpell = id as SpellId; break;
        case "equip":
          say(addSpell(run.spells, id, newSpellSlot), `${spellName(id)} equipped (Lv1)`, { no_slot: `no free slot (max ${MAX_SPELLS})` });
          this.grimoireSpell = id as SpellId;
          break;
        case "lv": {
          const r = levelUpSpell(run.spells, slotOf(id));
          say(r, `${spellName(id)} Lv${run.spells[slotOf(id)]?.level}`, { max_level: `max level ${SPELL_MAX_LEVEL}` });
          break;
        }
        case "lv5":
          while (levelUpSpell(run.spells, slotOf(id)).ok);
          this.grimoireMsg = `${spellName(id)} Lv${SPELL_MAX_LEVEL}`;
          break;
        case "tlv":
        case "tlv5":
          run.technique.level = b.dataset.g === "tlv5" ? TECH_MAX_LEVEL : Math.min(TECH_MAX_LEVEL, run.technique.level + 1);
          this.grimoireMsg = `${g.hero.technique.name} Lv${run.technique.level}`;
          break;
        case "mod": {
          const m = sel ? SPELLS[sel].modifiers.find((x) => x.id === id) : undefined;
          say(addModifier(run.spells, sel ? slotOf(sel) : -1, id), `${m?.name ?? id} applied`, { no_slot: "equip the spell first" });
          break;
        }
        case "relic":
          if (run.relics.includes(id)) { g.devRemoveRelic(id); this.grimoireMsg = `${RELICS[id].name} removed (DEV)`; }
          else { g.addRelic(id); this.grimoireMsg = `${RELICS[id].name} obtained`; }
          break;
        case "heal": g.devHealFull(); this.grimoireMsg = "HP full"; break;
        case "cd": g.devResetCooldowns(); this.grimoireMsg = "cooldowns reset"; break;
        case "kill": this.grimoireMsg = `${g.devKillAll()} enemies killed`; break;
        case "end": this.grimoireMsg = g.devEndWave() ? "wave ended" : "Refused: no wave in progress"; break;
        case "boss":
          this.grimoireMsg = `next wave: ${nextBoss}`;
          this.close();
          g.prepareWave(nextBoss);
          return;
      }
      g.recompute();
      this.showGrimoire();
    };
  }

  // ---------------------------------------------------------------- status da partida
  /** Ficha da partida (I): atributos calculados, spells, melhorias e relíquias. Não há equipamento (D13). */
  private showStatus(): void {
    const g = this.game;
    const run = g.run;
    const s = g.stats;
    const h = g.hero;
    const panel = this.overlayKind === "status" ? (this.overlay!.firstChild as HTMLElement) : this.open("status", "status");
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const spellLine = (name: string, level: number, note: string, mods = "", idx = -1) =>
      `<div class="relic spell-row"${idx >= 0 ? ` data-spell-slot="${idx}"` : ""}>${name} <small>Lv ${level}/${SPELL_MAX_LEVEL}${note ? " · " + note : ""}</small>${mods}</div>`;
    // hud/panel.lua: cada spell com os modificadores comprados ("NOME x2"), ou "no modifiers"
    const modLine = (id: string, mods: readonly string[]) => {
      if (!isSpellKey(id)) return "";
      const parts = modifierCounts(id, mods).map((m) => m.name + (m.count > 1 ? ` x${m.count}` : ""));
      return `<div class="mods${parts.length ? "" : " none"}">${parts.length ? parts.join(", ") : "no modifiers"}</div>`;
    };
    const spells = [
      spellLine(run.technique.level >= TECH_MAX_LEVEL ? TECHNIQUES[h.technique.id]?.evolution.name ?? h.technique.name : h.technique.name,
        run.technique.level, run.technique.level >= TECH_MAX_LEVEL ? "technique · evolved" : "technique"),
      ...run.spells.map((sp, i) => spellLine(
        sp.evolution ? EVOLUTIONS[sp.evolution as keyof typeof EVOLUTIONS]?.name ?? spellName(sp.id) : spellName(sp.id),
        sp.level, sp.evolution ? "evolved" : "", modLine(sp.id, sp.modifiers), i)),
    ];
    panel.innerHTML = `
      <div>
        <h2 style="color:${hex(h.color)}">${h.name}</h2>
        <p class="sub">${h.title} · level ${run.level} · ${run.xp}/${run.xpToNext} XP</p>
        <p class="sub">wave ${run.wave} of ${TOTAL_WAVES}${run.endless ? " · endless" : ""} · ${run.gold} gold · seed ${run.seedCode}${run.devUsed ? ` · <b style="color:var(--bad)">[DEV]</b>` : ""}</p>
        <div class="section">Attributes</div>
        <div class="statlist">
          <span>HP</span><b>${s.maxHp}</b>
          <span>Damage per hit</span><b>${Math.round(s.damage * s.autoDamage * h.auto.damage)}</b>
          <span>Attacks per second</span><b>${(h.auto.rate * s.attackSpeed).toFixed(2)}</b>
          <span>Crit</span><b>${pct(s.critChance)} · x${s.critDamage.toFixed(2)}</b>
          <span>Armor</span><b>${Math.round(s.armor)} (-${pct(1 - s.damageTaken)} damage)</b>
          <span>Dodge</span><b>${pct(s.dodge)}</b>
          <span>Regeneration</span><b>${s.regen.toFixed(1)}/s</b>
          <span>Move Speed</span><b>${s.moveSpeed.toFixed(1)}</b>
          <span>Range</span><b>+${pct(s.range - 1)}</b>
          <span>Spell Power</span><b>${Math.round(s.spellPower * 10) / 10}</b>
          ${spellBonusLines(s)}
          <span>Technique Cooldown</span><b>${(g.tech?.cooldown ?? h.technique.cooldown * s.cooldownMult).toFixed(1)} s</b>
          <span>XP earned</span><b>+${pct(s.xp - 1)}</b>
          <span>Gold earned</span><b>+${pct(s.gold - 1)}</b>
        </div>
      </div>
      <div>
        <div class="section" style="margin-top:0">Spells</div>
        <div class="relics">${spells.join("")}</div>
        <div class="section">Upgrades (${run.upgradesTaken.length})</div>
        <div class="relics">${run.upgradesTaken.length ? run.upgradesTaken.map((id, i) => {
          const t = run.upgradeTiers[i] ?? "common";
          return `<div class="relic" style="border-color:${TIER_COLOR[t]}" title="${TIER_LABEL[t]}">${UPGRADE_BY_ID[id]?.name ?? id}</div>`;
        }).join("") : `<span style="color:var(--muted)">Level up and choose at the end of the wave.</span>`}</div>
        <div class="section">Relics (${run.relics.length})</div>
        <div class="relics">${run.relics.length ? run.relics.map((id) => `<div class="relic" data-relic="${id}" style="border-color:${hex(RELICS[id].color)}">${RELICS[id].name}</div>`).join("")
          : `<span style="color:var(--muted)">Defeat a boss to pick the first one.</span>`}</div>
        <div class="row end"><button data-act="close">Close (I)</button></div>
      </div>`;
    panel.onclick = (ev) => {
      if ((ev.target as HTMLElement).closest("[data-act=close]")) this.close();
    };
    panel.onmousemove = (ev) => {
      const sp = (ev.target as HTMLElement).closest<HTMLElement>("[data-spell-slot]");
      if (sp) {
        const html = spellTipHtml(g, Number(sp.dataset.spellSlot));
        if (html) return this.showTip(html, ev);
      }
      const rel = (ev.target as HTMLElement).closest<HTMLElement>("[data-relic]");
      if (rel) {
        const d = RELICS[rel.dataset.relic!];
        return this.showTip(`<h4 style="color:${hex(d.color)}">${d.name}</h4><div class="meta">${RELIC_RARITY[d.rarity]} relic</div>${statLines(d.stats)}`, ev);
      }
      this.tip.classList.add("hidden");
    };
  }

  private showTip(html: string, ev: MouseEvent): void {
    this.tip.innerHTML = html;
    this.tip.classList.remove("hidden");
    const w = 262;
    const hgt = this.tip.offsetHeight;
    this.tip.style.left = `${Math.min(window.innerWidth - w, ev.clientX + 16)}px`;
    this.tip.style.top = `${Math.max(4, Math.min(window.innerHeight - hgt - 4, ev.clientY + 12))}px`;
  }

  // ---------------------------------------------------------------- relíquia / pausa / morte
  private showRelicChoice(ids: string[], pick: (id: string) => void, title = "Boss defeated!"): void {
    const panel = this.open("relic", "relic");
    panel.style.width = "min(820px, 96vw)";
    // D-197: a relíquia que evolui uma spell equipada (com a spell no nível 5)
    const wanted = wantedRelics(this.game.run);
    panel.innerHTML = `<h2>${title}</h2><p class="sub">Choose a relic. The bonus is permanent.</p>
      <div class="cards">${ids.map((id) => {
        const d = RELICS[id];
        const evo = wanted[id] ? `<p class="evo">EVOLVES ${spellName(wanted[id])} (spell at Lv ${SPELL_MAX_LEVEL})</p>` : "";
        return `<div class="card" data-relic="${id}" style="--cc:${hex(d.color)}"><div class="meta">${RELIC_RARITY[d.rarity]} relic</div>
          <h3>${d.name}</h3>${statLines(d.stats)}${evo}</div>`;
      }).join("")}</div>`;
    panel.onclick = (ev) => {
      const id = (ev.target as HTMLElement).closest<HTMLElement>("[data-relic]")?.dataset.relic;
      if (!id) return;
      this.close();
      pick(id);
    };
  }

  /** Magic Shop (shop.lua): 3 ofertas mais a relíquia, preço, motivo da oferta inválida, comprar, trocar, sair. */
  private showShop(): void {
    const g = this.game;
    const v = g.shopVisit;
    if (!v) return;
    const panel = this.overlayKind === "shop" ? (this.overlay!.firstChild as HTMLElement) : this.open("shop", "shop");
    panel.style.width = "min(980px, 96vw)";
    const run = g.run;
    const title = v.auto === "preboss" ? "Pre-boss shop: get ready for the next wave"
      : v.auto === "champion" ? "Champion shop: opens before the map" : "Magic Shop";
    const reroll = rerollCost(v);
    panel.innerHTML = `<h2>Magic Shop <small>Lv ${v.level}</small></h2>
      <p class="sub">${title} · <b class="gold">${run.gold} gold</b></p>
      <div class="cards shop">${v.offers.map((o, i) => shopOfferHtml(g, o, i)).join("")}</div>
      <div class="row end">
        <button data-act="reroll" ${run.gold >= reroll ? "" : "disabled"}>Reroll (R) — ${reroll} gold</button>
        <button data-act="leave">Leave shop (Esc)</button>
      </div>`;
    panel.onclick = (ev) => {
      const t = ev.target as HTMLElement;
      if (t.closest("[data-act=leave]")) return this.leaveShop();
      if (t.closest("[data-act=reroll]")) {
        g.rerollShop();
        return;
      }
      const i = t.closest<HTMLElement>("[data-offer]")?.dataset.offer;
      if (i === undefined) return;
      const reason = g.buyShop(Number(i));
      if (reason) this.toast(reason, "#ff7a6a");
    };
    panel.onmousemove = (ev) => {
      const card = (ev.target as HTMLElement).closest<HTMLElement>("[data-offer]");
      const o = card ? v.offers[Number(card.dataset.offer)] : undefined;
      const html = o ? shopOfferTip(g, o) : "";
      if (html) return this.showTip(html, ev);
      this.tip.classList.add("hidden");
    };
  }

  private leaveShop(): void {
    this.close();
    this.game.closeShop();
  }

  /** As 3 cartas de melhoria (level_up.lua): raridade, efeitos e a troca paga com ouro. */
  private showLevelUp(): void {
    const g = this.game;
    const L = g.levelUp;
    if (!L) return;
    const panel = this.open("levelup", "levelup");
    panel.style.width = "min(820px, 96vw)";
    const cost = levelRerollCost(g.run);
    const left = rerollsLeft(L.rerolls);
    const can = left > 0 && g.run.gold >= cost;
    panel.innerHTML = `<h2>Level ${g.run.level - g.run.pendingLevelUps + 1}${L.total > 1 ? ` <small>(${L.index} of ${L.total})</small>` : ""}</h2>
      <p class="sub">Choose an upgrade. It lasts until the end of the run.</p>
      <div class="cards">${L.ids.map((id, i) => {
        const u = UPGRADE_BY_ID[id];
        const t = L.tiers[i];
        const body = u.hideEffects ? "" : effectsFor(u, t).map(upgradeLine).join("");
        return `<div class="card" data-up="${i}" style="--cc:${TIER_COLOR[t]}"><div class="meta">${TIER_LABEL[t]}</div>
          <h3>${u.name}</h3>${body}${u.note ? `<p class="note">${u.note}</p>` : ""}</div>`;
      }).join("")}</div>
      <div class="row end"><button data-act="reroll" ${can ? "" : "disabled"}>Reroll all 3 — ${cost} gold${left > 0 ? "" : " (already rerolled)"}</button></div>`;
    panel.onclick = (ev) => {
      const t = ev.target as HTMLElement;
      if (t.closest("[data-act=reroll]")) {
        g.rerollLevelUp();
        return;
      }
      const i = t.closest<HTMLElement>("[data-up]")?.dataset.up;
      if (i === undefined) return;
      this.close();
      g.chooseUpgrade(Number(i));
    };
  }

  /** spell_evolution.lua (S18): até 3 evoluções, e o jogador pode pular; as relíquias da receita não são gastas. */
  private showEvolution(): void {
    const g = this.game;
    const offer = g.evolutionOffer;
    if (!offer) return;
    const panel = this.open("evolution", "evolution");
    panel.style.width = "min(820px, 96vw)";
    panel.innerHTML = `<h2>Spell evolution</h2><p class="sub">Evolve a spell.</p>
      <div class="cards">${offer.map((o, i) => {
        const evo = EVOLUTIONS[o.evoId];
        const recipe = evo.requires.map((r) => RELICS[r]?.name ?? prettyId(r)).join(" or ");
        return `<div class="card" data-evo="${i}" style="--cc:#c77dff"><div class="meta">${spellName(evo.spell)} (slot ${o.slotIndex + 1})</div>
          <h3>${evo.name}</h3><p>${evo.text}</p><p class="evo">${evoStatLine(evo)}</p>
          <p class="note">Recipe: ${recipe}</p><p class="note">(relics are NOT consumed)</p></div>`;
      }).join("")}</div>
      <div class="row end"><button data-act="skip">Skip evolution</button></div>`;
    panel.onclick = (ev) => {
      const t = ev.target as HTMLElement;
      if (t.closest("[data-act=skip]")) {
        this.close();
        g.skipEvolution();
        return;
      }
      const i = t.closest<HTMLElement>("[data-evo]")?.dataset.evo;
      if (i === undefined) return;
      this.close();
      g.chooseEvolution(Number(i));
    };
  }

  private showPause(): void {
    const g = this.game;
    const panel = this.open("pause", "pause");
    const mins = Math.floor(g.run.statistics.elapsed / 60);
    panel.innerHTML = `<h2>Paused</h2><p class="sub">wave ${g.run.wave} · ${g.run.gold} gold · ${g.run.statistics.kills} kills · ${mins} min played · seed ${g.run.seedCode}</p>
      <div class="section" style="color:${hex(g.hero.color)}">${g.hero.name} — ${g.hero.title}</div>
      ${heroKit(g.hero, g.tech?.cooldown ?? g.hero.technique.cooldown * g.stats.cooldownMult)}
      <div class="controls">
        <kbd>W A S D</kbd><span>Move</span>
        <kbd>Mouse</kbd><span>Aim</span>
        <kbd>Left click</kbd><span>Attack (hold)</span>
        <kbd>Right click / Q</kbd><span>Hero technique: ${g.hero.technique.name}</span>
        <kbd>Space</kbd><span>Dodge (invulnerable for an instant)</span>
        <kbd>H</kbd><span>Hasten the wave (after 5 s; more reward, faster enemies)</span>
        <kbd>E</kbd><span>Enter the portal (after the zone boss)</span>
        <kbd>I / Tab</kbd><span>Run status</span>
        <kbd>Mouse wheel</kbd><span>Zoom the camera in or out</span>
        <kbd>F3</kbd><span>Show frames per second</span>
      </div>
      <div class="row end"><button data-act="quality">Quality: ${QUALITY[g.quality]}</button><button data-act="mute">${g.audio.muted ? "Sound on" : "Sound off"}</button>
        <button data-act="title">Quit to title</button><button class="primary" data-act="close">Resume</button></div>`;
    panel.onclick = (ev) => {
      const act = (ev.target as HTMLElement).closest<HTMLElement>("[data-act]")?.dataset.act;
      if (act === "close") this.close();
      else if (act === "quality") {
        g.setQuality((g.quality + 2) % 3);
        this.showPause();
      } else if (act === "mute") {
        g.audio.muted = !g.audio.muted;
        this.showPause();
      } else if (act === "title") this.showTitle();
    };
  }

  // ---------------------------------------------------------------- fim da partida (results.lua, victory_choice.lua)
  /** Morrer encerra a partida (R23). */
  private showDeath(): void {
    if (this.game.playerAlive || this.overlayKind === "results") return;
    this.showResults("death");
  }

  /** Vencer a onda 20: a partida já conta como vencida; seguir leva ao modo sem fim (R24). */
  private showVictory(): void {
    const panel = this.open("victory", "victory");
    panel.innerHTML = `<h2 style="color:var(--gold)">Victory!</h2>
      <p>You beat wave 20: this run already counts as a win.</p>
      <p class="sub">Continuing leads to endless mode: stronger waves each round, a boss every 5 waves, and the map goes on. Dying later does not take the win away; your best wave becomes a separate record.</p>
      <div class="row end"><button data-act="end">End with the win</button><button class="primary" data-act="endless">Continue (endless)</button></div>`;
    panel.onclick = (ev) => {
      const act = (ev.target as HTMLElement).closest<HTMLElement>("[data-act]")?.dataset.act;
      if (act === "endless") this.close();
      else if (act === "end") this.showResults("victory");
    };
  }

  /** Tela de resultado: encerra a partida, apaga o checkpoint e soma os registros. */
  private showResults(kind: "death" | "victory"): void {
    const g = this.game, run = g.run;
    clearRun(this.storage);
    const rec = loadRecords(this.storage);
    // results.lua: partida com o DEV Grimoire não entra nos registros
    const isBest = recordsRun(run) && addRecord(rec, summarize(run), new Date().toISOString().slice(0, 10));
    if (recordsRun(run)) writeRecords(this.storage, rec);
    g.ach.recordKills = rec.kills;
    g.saveAchievements();
    const best = rec.best[`${run.heroId}/${run.difficultyId}`];
    const setup: RunSetup = { heroId: run.heroId, difficultyId: run.difficultyId, startingSpell: run.startingSpell };
    const s = run.statistics;
    const n = (v: number) => Math.round(v).toLocaleString("en-US");
    const diff = DIFFICULTIES[run.difficultyId].name;
    const sub = kind === "death"
      ? `The run ended on wave ${run.wave}${run.killedBy ? ` — final blow: ${run.killedBy}` : ""}.${run.victory ? " The wave 20 win still counts." : ""}`
      : `You cleared all 20 waves (${diff}).`;
    const panel = this.open("results", "results");
    panel.innerHTML = `<h2 style="color:${kind === "death" ? "var(--bad)" : "var(--gold)"}">${kind === "death" ? "You fell" : "Victory!"}</h2>
      <p class="sub">${sub}</p>
      <div class="results-cols">
        <div>
          <div class="kv"><span>Hero</span><b>${g.hero.name} · ${diff}</b></div>
          <div class="kv"><span>Wave / level</span><b>${run.wave} / ${run.level}</b></div>
          <div class="kv"><span>Kills</span><b>${n(s.kills)}</b></div>
          <div class="kv"><span>Damage dealt</span><b>${n(s.damage)}</b></div>
          <div class="kv"><span>Damage taken</span><b>${n(s.damageTaken)}</b></div>
          <div class="kv"><span>Healing</span><b>${n(s.healed)}</b></div>
          <div class="kv"><span>Gold earned / spent</span><b>${n(s.goldEarned)} / ${n(s.goldSpent)}</b></div>
          <div class="kv"><span>Combat time</span><b>${fmtTime(Math.floor(s.elapsed))}</b></div>
          <div class="kv"><span>Upgrades / relics</span><b>${run.upgradesTaken.length} / ${run.relics.length}</b></div>
        </div>
        <div>
          <div class="section">Relics (${run.relics.length})</div>
          <div class="relics">${run.relics.length ? run.relics.map((id) => `<div class="relic" style="border-color:${hex(RELICS[id].color)}">${RELICS[id].name}</div>`).join("") : `<p class="note">No relics this run.</p>`}</div>
          <div class="section">Seed</div><p><b style="letter-spacing:2px">${run.seedCode}</b></p>
          <div class="section">Score</div>
          <p style="color:${isBest ? "var(--gold)" : "inherit"}">${isBest ? `New record! (${g.hero.name} · ${diff})` : `Record (${g.hero.name} · ${diff}): wave ${best.wave}, ${n(best.kills)} kills`}</p>
        </div>
      </div>
      <div class="row end"><button data-act="menu">Main menu</button><button data-act="seed">Replay this seed</button><button class="primary" data-act="again">Play again</button></div>`;
    panel.onclick = (ev) => {
      const act = (ev.target as HTMLElement).closest<HTMLElement>("[data-act]")?.dataset.act;
      if (act === "again") this.newRunWith(setup);
      else if (act === "seed") this.newRunWith(setup, run.seed);
      else if (act === "menu") this.showTitle();
    };
  }
}

/** Nome da spell (spells.lua `name`); técnica sem definição aqui cai no id com espaços ("storm_step" → "Storm Step"). */
/** Ícone provisório de cada spell no HUD (até haver ícones desenhados por código). */
const SPELL_ICON: Record<string, string> = {
  fireball: "🔥", iceball: "❄️", chain_lightning: "⚡", arcane_bolt: "🔮", healing_field: "✚", blade_orbit: "🗡️",
  venom_nova: "☠️", cyclone: "🌪️", rune_traps: "ᚱ", prism_beam: "🔆", quake_totem: "🗿",
};

function isSpellKey(id: string): id is SpellId {
  return id in SPELLS;
}

/** spell_evolution.lua `statLine`: os números da forma evoluída, na ordem de lá. */
function evoStatLine(e: EvolutionDef): string {
  const t: string[] = [];
  if (e.damageMult) t.push(`Damage x${e.damageMult.toFixed(2)}`);
  if (e.healMult) t.push(`Heal x${e.healMult.toFixed(2)}`);
  if (e.radius) t.push(`Radius ${e.radius}`);
  if (e.width) t.push(`Width ${e.width} x ${e.length}`);
  if (e.duration) t.push(`Duration ${e.duration.toFixed(1)}s`);
  if (e.tick) t.push(`Tick ${e.tick.toFixed(2)}s`);
  if (e.burnDuration && e.burnDpsMult) t.push(`Burn ${e.burnDuration.toFixed(1)}s x${e.burnDpsMult.toFixed(2)}`);
  else if (e.burnDuration) t.push(`Burn ${e.burnDuration.toFixed(1)}s`);
  if (e.cooldownMult) t.push(`Cooldown x${e.cooldownMult.toFixed(2)}`);
  return t.join("  •  ");
}

/** hud/tooltips.lua `spellTooltip`: os números da spell, os marcos, os modificadores e a evolução. */
function spellTipHtml(g: Game, i: number): string {
  const slot = g.run.spells[i];
  const st = g.spells.stats[i];
  if (!slot || !st || !isSpellKey(slot.id)) return "";
  const def = SPELLS[slot.id];
  const evo = slot.evolution ? EVOLUTIONS[slot.evolution as keyof typeof EVOLUTIONS] : undefined;
  const dmg = g.stats.damage;
  const L: string[] = [];
  const line = (t: string, cls = "") => L.push(`<div${cls ? ` class="${cls}"` : ""}>${t}</div>`);
  if (st.damage) line(`Damage ${(st.damage * dmg).toFixed(1)}   (level x${st.levelScale.toFixed(2)})`);
  if (st.heal) line(`Heals ${(st.heal * g.stats.maxHp).toFixed(1)} HP every ${(st.tick ?? 0).toFixed(2)}s for ${(st.duration ?? 0).toFixed(1)}s`, "good");
  line(`Cooldown ${st.cooldown.toFixed(2)}s   Range ${(st.length ?? st.range).toFixed(1)} m`);
  if (st.radius > 0) line(`Radius ${st.radius.toFixed(1)} m`);
  if (st.burnDps) line(`Burn ${(st.burnDps * dmg).toFixed(1)}/s for ${(st.burnDuration ?? 0).toFixed(2)}s   Volatile ${Math.round((st.volatile ?? 0) * 100)}%`, "fire");
  if (st.slow) line(`Slow ${Math.round(st.slow * 100)}% for ${(st.slowDuration ?? 0).toFixed(2)}s`, "ice");
  if (st.targets && !evo) line(`${st.targets} targets, jump ${(st.chainRange ?? 0).toFixed(1)} m, Static ${Math.round((st.doubleHit ?? 0) * 100)}%`);
  if (st.projectiles && st.projectiles > 1) line(`${st.projectiles} projectiles`);
  if (st.echo) line(`Echo ${Math.round(st.echo * 100)}%`);
  for (const m of def.milestones) if (slot.level >= m.level) line(`Lv${m.level} ${m.id}: ${m.text}`, "good");
  for (const m of slot.modifiers) line(`+ ${SPELLS[slot.id].modifiers.find((x) => x.id === m)?.name ?? m}: ${modifierText(slot.id, m, slot.evolution)}`, "gold");
  if (evo) line(`EVOLUTION ${evo.name}: ${evo.text}`, "title");
  return `<h4>${def.name}  Lv ${slot.level}</h4><div class="spell-tip">${L.join("")}</div>`;
}

function prettyId(id: string): string {
  return id.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

function spellName(id: string): string {
  return id in SPELLS ? SPELLS[id as SpellId].name : prettyId(id);
}

/** Uma oferta da loja: tipo, nome, o que faz, preço e, se inválida, o motivo (shop.lua). */
function shopOfferHtml(g: Game, o: ShopOffer, i: number): string {
  const ev = evaluateOffer(g.run, g.shopVisit!, o);
  const slot = g.run.spells.find((s) => s.id === o.spell);
  let meta = "", name = "", body = "", color = "#ffd34d";
  const tech = o.kind === "spell_upgrade" && o.spell === g.run.technique.id ? TECHNIQUES[o.spell] : undefined;
  if (tech) {
    // S19 (D-252): a técnica sobe de nível na loja; no nível 5 vira a evolução
    const lv = g.run.technique.level;
    meta = "Technique upgrade";
    name = tech.name;
    body = `<p>Lv ${lv} → ${Math.min(lv + 1, TECH_MAX_LEVEL)}</p>`;
    const ms = tech.milestones.find((m) => m.level === lv + 1);
    if (lv + 1 === TECH_MAX_LEVEL) body += `<p class="evo">EVOLVES ${tech.evolution.name}: ${tech.evolution.text}</p>`;
    else if (ms) body += `<p class="evo">Lv${ms.level} ${ms.id}: ${ms.text}</p>`;
    color = "#7ad94a";
  } else if (o.kind === "spell_upgrade") {
    meta = "Spell upgrade";
    name = spellName(o.spell!);
    body = slot ? `<p>Lv ${slot.level} → ${Math.min(slot.level + 1, SPELL_MAX_LEVEL)}</p>` : "";
    const ms = isSpellKey(o.spell!) && slot ? SPELLS[o.spell!].milestones.find((m) => m.level === slot.level + 1) : undefined;
    if (ms) body += `<p class="evo">Lv${ms.level} ${ms.id}: ${ms.text}</p>`;
    color = "#7ad94a";
  } else if (o.kind === "spell_modifier") {
    const m = isSpellKey(o.spell!) ? SPELLS[o.spell!].modifiers.find((x) => x.id === o.modifier) : undefined;
    meta = `${spellName(o.spell!)} modifier (shop)`;
    name = m?.name ?? prettyId(o.modifier!);
    body = `<p>${isSpellKey(o.spell!) ? modifierText(o.spell!, o.modifier!, slot?.evolution ?? null) : ""}</p>`;
    color = "#4fa3ff";
  } else if (o.kind === "new_spell") {
    meta = "New spell";
    name = spellName(o.spell!);
    body = `<p class="note">Takes a free spell slot, starts at Lv 1.</p>`;
    color = "#b36bff";
  } else if (o.kind === "relic") {
    const d = RELICS[o.relic!];
    meta = `${RELIC_RARITY[d.rarity]} relic`;
    name = d.name;
    body = statLines(d.stats);
    const evo = wantedRelics(g.run)[o.relic!];
    if (evo) body += `<p class="evo">EVOLVES ${spellName(evo)} (spell at Lv ${SPELL_MAX_LEVEL})</p>`;
    color = hex(d.color);
  } else {
    const item = SHOP_ITEMS[o.kind];
    meta = "Item";
    name = item.name;
    body = `<p>${item.text}</p>`;
  }
  const afford = ev.cost !== null && g.run.gold >= ev.cost;
  const price = o.bought ? `<div class="price done">Bought${o.paid ? ` · ${o.paid} gold` : ""}</div>`
    : !ev.valid ? `<div class="price bad">${ev.reason}${ev.cost !== null ? ` · ${ev.cost} gold` : ""}</div>`
    : `<div class="price${afford ? "" : " bad"}">${ev.cost} gold</div>`;
  const off = o.bought || !ev.valid ? " off" : "";
  return `<div class="card${off}" data-offer="${i}" style="--cc:${color}"><div class="meta">${meta}</div><h3>${name}</h3>${body}${price}</div>`;
}

/** Dica da oferta: a ficha da spell equipada (M6-08), ou os números da spell nova no nível 1. */
function shopOfferTip(g: Game, o: ShopOffer): string {
  if (!o.spell) return "";
  const t = TECHNIQUES[o.spell];
  if (t && shopSlotOf(g.run, o.spell) === g.run.technique) {
    const lv = g.run.technique.level;
    const L = [`<div>${t.text}</div>`, `<div>Cooldown ${t.cooldown.toFixed(2)}s · School ${t.school}</div>`];
    for (const m of t.milestones) L.push(`<div class="${lv >= m.level ? "good" : ""}">Lv${m.level} ${m.id}: ${m.text}</div>`);
    return `<h4>${t.name}  Lv ${lv}</h4><div class="spell-tip">${L.join("")}</div>`;
  }
  const i = g.run.spells.findIndex((s) => s.id === o.spell);
  if (i >= 0) return spellTipHtml(g, i);
  if (!isSpellKey(o.spell)) return "";
  const def = SPELLS[o.spell];
  const L = [`Cooldown ${def.cooldown.toFixed(2)}s`, `School ${def.school}`];
  for (const m of def.milestones) L.push(`Lv${m.level} ${m.id}: ${m.text}`);
  return `<h4>${def.name}  Lv 1</h4><div class="spell-tip">${L.map((t) => `<div>${t}</div>`).join("")}</div>`;
}

/** Uma carta do mapa: o tipo, a sala sorteada e o que ela muda na onda. */
function mapCardHtml(c: MapCard, i: number): string {
  const n = MAP_NODE[c.node];
  const room: RoomDef | undefined = c.room ? ROOM_BY_ID[c.room] : undefined;
  let body = `<p class="note">${n.text}</p>`;
  if (room) {
    const lines = ROOM_MOD_LABEL.flatMap(([k, label]) => {
      const v = room.mods[k];
      if (v === undefined || v === 1) return [];
      const pct = Math.round((v - 1) * 100);
      const good = k === "reward" ? pct > 0 : pct < 0;
      return [`<div class="stat${good ? "" : " neg"}">${pct > 0 ? "+" : ""}${pct}% ${label}</div>`];
    });
    if (room.ambush) {
      lines.push(`<div class="stat neg">Boss with ${Math.round(room.ambush.hp * 100)}% HP and ${Math.round(room.ambush.damage * 100)}% damage</div>`);
    }
    // perigos de chão e poças de cura ainda não existem aqui (M20-08)
    const notes = (room.notes ?? []).map((t) => `<p class="note">${t}</p>`);
    body = `<h3 style="margin-top:6px">${room.name}</h3>${lines.join("")}${notes.join("")}<p class="note">${n.text}</p>`;
  }
  return `<div class="card" data-card="${i}" style="--cc:${n.color}"><div class="meta">${n.name}</div>${body}</div>`;
}

function fmtTime(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}
