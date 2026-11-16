// Interface em DOM: título, HUD, status da partida, relíquias, melhorias, pausa.
import { canHasten, hastenBonus } from "../core/wave";
import { DIFFICULTIES, DIFFICULTY_ORDER, DIFFICULTY_TEXT, TOTAL_WAVES, type DifficultyId } from "../data/run";
import { clearRun, discardLegacySave, loadRecords, loadRun, safeStorage, writeRecords } from "../core/save";
import { RunRng, addRecord, continueRun, decodeSeed, newRun, summarize, type NewRunOptions, type RunState } from "../core/run";
import { formatStat, STAT_KEYS, type StatBlock } from "../core/stats";
import { SPELL_MAX_LEVEL, SPELL_TEXT, type SpellId } from "../data/spells";
import { effectsFor, rerollCost, rerollsLeft, type UpgradeTier } from "../core/levelup";
import { PCT_STATS, UPGRADE_BY_ID, type UpgradeEffect } from "../data/upgrades";
import { BOSSES } from "../data/enemies";
import { HEROES, HERO_ORDER, type HeroDef } from "../data/heroes";
import { RELICS } from "../data/relics";
import { ROOM_BY_ID, type RoomDef, type RoomMods } from "../data/rooms";
import type { MapCard, MapNodeId } from "../core/runmap";
import { TUNING } from "../data/tuning";
import { ZONES, ZONE_ORDER } from "../data/zones";
import type { Game } from "../game/game";

const hex = (n: number) => "#" + n.toString(16).padStart(6, "0");
const QUALITY = ["baixa", "média", "alta"];
const RELIC_RARITY: Record<string, string> = { incomum: "Incomum", raro: "Rara", epico: "Épica" };
const TIER_LABEL: Record<UpgradeTier, string> = { common: "Comum", rare: "Rara", epic: "Épica" };
const TIER_COLOR: Record<UpgradeTier, string> = { common: "#c9c4b8", rare: "#4fa3ff", epic: "#b36bff" };
/** Nome dos atributos de lá que as melhorias oferecidas usam (o original diz "Auto Damage"; aqui vale para todo o dano). */
const UPGRADE_LABEL: Record<string, string> = {
  damageFlat: "Dano", attackSpeedPct: "Vel. de ataque", autoDamagePct: "Dano", critChance: "Chance de crítico",
  armor: "Armadura", moveSpeedPct: "Vel. de movimento", maxHpFlat: "Vida", maxHpPct: "Vida", rangePct: "Alcance",
  dodge: "Esquiva", regen: "Regeneração/s", xpPct: "XP ganho", goldPct: "Ouro ganho", spellCooldownPct: "Recarga da técnica",
};
/** Nome e texto de cada carta do mapa, como em data/run_map.lua (o nome fica em inglês, igual ao de lá). */
const MAP_NODE: Record<MapNodeId, { name: string; text: string; color: string }> = {
  combat_room: { name: "Combat Room", text: "Sala com modificador na próxima wave", color: "#e0a050" },
  cursed_room: { name: "Cursed Room", text: "Maldição por 2 waves seguidas, sem mapa entre elas; depois da 1ª, uma relic amaldiçoada", color: "#b36bff" },
  pact: { name: "Risk Pact", text: "Pact pelo resto da run + relic de pact (1 a cada 5 waves)", color: "#ff5a5a" },
  event: { name: "Event", text: "Escolha 1 de 3 eventos", color: "#5fd3c8" },
  shop: { name: "Shop", text: "Compre poder permanente", color: "#ffd34d" },
  elite: { name: "Elite", text: "Enfrente um Elite com 2 afixos: relic de risco e loja depois da wave", color: "#ffc83d" },
  relic_shrine: { name: "Relic Shrine", text: "Uma relic sem combate extra", color: "#4fa3ff" },
  boss_ambush: { name: "Boss Ambush", text: "Um boss enfraquecido entra na wave: relic de risco", color: "#ff7a5a" },
};
/** Linhas da sala na carta; na recompensa, mais é bom; no resto, mais é ruim. */
const ROOM_MOD_LABEL: [keyof RoomMods, string][] = [
  ["reward", "recompensa"], ["enemyHp", "vida dos inimigos"], ["enemyDamage", "dano dos inimigos"],
  ["enemyCount", "inimigos"], ["enemySpeed", "velocidade dos inimigos"], ["projectileSpeed", "velocidade dos projéteis"],
];

/** Na recarga, negativo é bom (format.lua `INVERTED`). */
const INVERTED: Record<string, true> = { spellCooldownPct: true };

function upgradeLine(e: UpgradeEffect): string {
  const good = INVERTED[e.stat] ? e.value < 0 : e.value > 0;
  const n = PCT_STATS[e.stat] ? `${Math.round(e.value * 1000) / 10}%` : String(Math.round(e.value * 100) / 100);
  const txt = `${e.value >= 0 ? "+" : ""}${n.replace(".", ",")} ${UPGRADE_LABEL[e.stat] ?? e.stat}`;
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
  const cd = cooldown.toFixed(cooldown % 1 ? 1 : 0).replace(".", ",");
  return `<div class="kit">
    <div class="kit-row"><b>Passiva</b><ul>${h.passive.map((t) => `<li>${t}</li>`).join("")}</ul></div>
    <div class="kit-row"><b>Técnica</b><div><span class="kit-name">${h.technique.name}</span>
      <span class="kit-meta">botão direito ou Q · recarga ${cd} s</span><p>${h.technique.text}</p></div></div>
  </div>`;
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
      mapOpen: () => this.showMap(),
      levelUp: () => this.showLevelUp(),
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
    const locked = ["title", "relic", "levelup", "map", "death", "victory", "results"].includes(this.overlayKind);
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
      this.toast("O save antigo (herói contínuo, com itens) foi descartado: o jogo agora é por partidas, como no Dungeon Reign", "#ffc83d");
    }
    const save = loadRun(this.storage);
    const rec = loadRecords(this.storage);
    const render = () => {
      const h = HEROES[this.selectedHero];
      const best = DIFFICULTY_ORDER.flatMap((d) => {
        const b = rec.best[`${h.id}/${d}`];
        return b ? [`${DIFFICULTIES[d].name}: onda ${b.wave}${b.victory ? " (vitória)" : ""}`] : [];
      });
      panel.innerHTML = `
        <h1>DUNGEON REIGN</h1>
        <p class="tag">RPG de ação · protótipo 0.3 · mapas procedurais, um herói, ondas e chefes</p>
        ${save ? `<div class="continue"><button class="primary" data-act="continue" style="padding:12px 30px;font-size:16px">
          Continuar — ${HEROES[save.run.heroId]?.name ?? "?"} · ${DIFFICULTIES[save.run.difficultyId].name} · onda ${save.wave} · nível ${save.run.level} · seed ${save.run.seedCode}</button></div>` : ""}
        ${rec.runs ? `<p class="tag" style="margin:-8px 0 14px">${rec.runs} partidas · ${rec.wins} vitórias · maior onda ${rec.highestWave}${rec.bestEndless ? ` · sem fim até a onda ${rec.bestEndless}` : ""} · ${rec.kills} abates</p>` : ""}
        <div class="section">Passo 1 de 3 · ${save ? "escolha o herói de uma partida nova (encerra a atual)" : "escolha seu herói"}</div>
        <div class="heroes">${HERO_ORDER.map((id) => {
          const d = HEROES[id];
          return `<div class="hero-card ${id === this.selectedHero ? "sel" : ""}" data-hero="${id}" style="--hc:${hex(d.color)}">
            <div class="swatch"></div><b>${d.name}</b><i>${d.title}</i><span>${d.identity}</span></div>`;
        }).join("")}</div>
        <div class="hero-detail" style="--hc:${hex(h.color)}">
          <h3 style="color:${hex(h.color)}">${h.name} — ${h.title}</h3>
          ${heroKit(h, h.technique.cooldown)}
          <p style="color:var(--muted)">${statLines(h.stats).replace(/<div class="st">/g, "").replace(/<\/div>/g, " · ").replace(/ · $/, "")}</p>
          ${best.length ? `<p style="color:var(--gold)">Recorde: ${best.join(" · ")}</p>` : ""}
        </div>
        <div class="title-actions"><button class="primary" data-act="next">Continuar com ${h.name} ›</button></div>`;
    };
    render();
    panel.onclick = (ev) => {
      const t = ev.target as HTMLElement;
      const card = t.closest<HTMLElement>("[data-hero]");
      if (card) {
        this.selectedHero = card.dataset.hero!;
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
          b.textContent = "Isso encerra a partida atual. Clique de novo para confirmar";
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
        <div class="section">Passo 2 de 3 · dificuldade · herói: ${h.name}</div>
        <div class="cards">${DIFFICULTY_ORDER.map((id) => {
          const d = DIFFICULTIES[id];
          const sel = id === this.selectedDifficulty;
          return `<div class="card" data-diff="${id}" style="--cc:${DIFF_COLOR[id]};${sel ? "border-color:var(--cc)" : ""}">
            <h3>${d.name}</h3><p>${DIFFICULTY_TEXT[id]}</p>
            <p class="note">Vida do inimigo ${x(d.enemyHp)} · dano inimigo ${x(d.enemyDamage)} · vel. inimigo ${x(d.enemySpeed)}</p>
            <p class="note">Vida do boss ${x(d.bossHp)} · recompensa ${x(d.reward)}</p>
            ${sel ? `<div class="meta" style="margin-top:6px">[ selecionada ]</div>` : ""}</div>`;
        }).join("")}</div>
        <div class="section">Seed</div>
        <p class="note" style="color:var(--muted)">Mesma seed = mesmo mapa, salas, relíquias e chefes. Cole o código de 7 letras de uma partida (pausa ou fim) ou digite qualquer palavra. Vazio = aleatória.</p>
        <input class="seed" data-r="seed" maxlength="24" placeholder="Aleatória" value="${this.seedText}" spellcheck="false">
        ${err ? `<p style="color:var(--bad)">${err}</p>` : ""}
        <div class="title-actions"><button data-act="back">‹ Voltar</button><button class="primary" data-act="next">Continuar ›</button></div>`;
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
        render("Seed inválida: use letras e números.");
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
        <div class="section">Passo 3 de 3 · spell inicial · ${h.name} · ${DIFFICULTIES[this.selectedDifficulty].name}</div>
        <p class="note" style="color:var(--muted)">As outras spells vêm da loja e das melhorias. As spells ainda não disparam no jogo (M6).</p>
        <div class="cards">${h.startingSpells.map((id) => {
          const sel = id === this.selectedSpell;
          return `<div class="card" data-spell="${id}" style="--cc:${hex(h.color)};${sel ? "border-color:var(--cc)" : ""}">
            <h3>${spellName(id)}</h3><p>${SPELL_TEXT[id]}</p>
            ${sel ? `<div class="meta" style="margin-top:6px">[ selecionada ]</div>` : ""}</div>`;
        }).join("")}</div>
        <div class="title-actions"><button data-act="back">‹ Voltar</button><button class="primary" data-act="go">Começar a partida</button></div>`;
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
    if (run.statistics.kills === 0) this.toast("WASD move · mouse mira · segure o botão esquerdo para atacar", "#9be4ff");
  }

  // ---------------------------------------------------------------- HUD
  private buildHud(): void {
    this.hud.innerHTML = `
      <div id="vignette"></div>
      <div class="hud-top-left"><h2 data-r="zone"></h2><p data-r="zoneSub"></p><p class="gold" data-r="gold"></p><div class="points hidden" data-r="points"></div></div>
      <div id="wavebar" data-r="waveBar"><b data-r="waveN"></b><span data-r="waveT"></span><span class="hasten hidden" data-r="hasten"></span></div>
      <div id="banner" data-r="banner"></div>
      <canvas id="minimap" width="176" height="176"></canvas>
      <div class="hud-help">H apressar a onda · I status · Esc pausa<br>F3 desempenho</div>
      <div id="bossbar" class="hidden" data-r="boss"><h3 data-r="bossName"></h3><div class="bar"><i data-r="bossFill"></i><span data-r="bossText"></span></div></div>
      <div id="hint" class="hidden" data-r="hint"></div>
      <div id="perf" class="hidden" data-r="perf"></div>
      <div id="toasts"></div>
      <div class="hud-bottom">
        <div class="skills">
          <div class="level-badge"><div><small>NÍVEL</small><span data-r="level"></span></div></div>
          <div class="skill"><kbd>ESQ</kbd>⚔️</div>
          <div class="skill-wrap"><div class="skill big" data-r="techBox"><kbd>DIR</kbd>✨<div class="cd" data-r="techCd"></div><div class="cdn" data-r="techN"></div></div>
            <small class="skill-name" data-r="techName"></small></div>
          <div class="skill"><kbd>ESPAÇO</kbd>💨<div class="cd" data-r="dashCd"></div></div>
          <div class="skill"><kbd>F</kbd>🧪<div class="cd" data-r="potCd"></div><div class="cdn" data-r="potN"></div></div>
        </div>
        <div class="bar"><i data-r="hpFill"></i><span data-r="hpText"></span></div>
        <div class="bar xp"><i data-r="xpFill"></i></div>
      </div>`;
    this.hud.querySelectorAll<HTMLElement>("[data-r]").forEach((e) => (this.r[e.dataset.r!] = e));
    this.toasts = this.hud.querySelector("#toasts")!;
    this.mapCtx = this.hud.querySelector<HTMLCanvasElement>("#minimap")!.getContext("2d")!;
  }

  private onZoneChanged(): void {
    const z = this.game.zone;
    this.r.zone.textContent = z.name;
    const w = this.game.run.wave;
    const first = w - ((w - 1) % 5);
    this.r.zoneSub.textContent = `${z.subtitle} · ondas ${first}–${first + 4}`;
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
    const tn = g.hero.technique.name;
    if (r.techName.textContent !== tn) {
      r.techName.textContent = tn;
      r.techBox.title = `${tn} — ${g.hero.technique.text}`;
    }
    r.dashCd.style.height = `${(Math.max(0, p.dashCd) / TUNING.hero.dashCooldown) * 100}%`;
    const pc = Math.max(0, p.potionCd);
    r.potCd.style.height = `${(pc / TUNING.hero.potionCooldown) * 100}%`;
    r.potN.textContent = pc > 0 ? String(Math.ceil(pc)) : "";
    const pend = g.run.pendingLevelUps;
    r.points.classList.toggle("hidden", pend <= 0);
    r.points.textContent = `+${pend} melhoria${pend > 1 ? "s" : ""} no fim da onda`;
    (this.hud.querySelector("#vignette") as HTMLElement).style.opacity = String(Math.max(p.hurtT * 0.6, p.hp / s.maxHp < 0.25 ? 0.35 : 0));
    const boss = g.boss;
    const showBoss = !!boss && g.bossEngaged && !boss.dead;
    r.boss.classList.toggle("hidden", !showBoss);
    if (showBoss && boss) {
      r.bossName.textContent = `${boss.ambush ? "Ambush: " : ""}${boss.boss!.name} — ${boss.boss!.title}${boss.enraged ? " (enfurecido)" : ""}`;
      r.bossFill.style.width = `${(boss.hp / boss.maxHp) * 100}%`;
      r.bossText.textContent = `${Math.ceil(boss.hp)} / ${boss.maxHp}`;
    }
    // onda: número, relógio, Apressar
    const n = g.run.wave;
    const total = n <= TOTAL_WAVES ? ` / ${TOTAL_WAVES}` : " · sem fim";
    r.waveN.textContent = `Onda ${n}${total}`;
    const w = g.wave;
    let t = "";
    if (g.phase === "walk") t = "vá até o círculo";
    else if (g.phase === "intro") t = "prepare-se";
    else if (g.phase === "fight" && w) {
      const left = Math.ceil(g.waveTimeLeft);
      t = w.isBossWave ? (w.heldByBoss ? "derrote o chefe" : `${fmtTime(left)} · chefe`) : fmtTime(left);
      if (w.hastened) t += " · apressada";
    } else if (g.phase === "cleared") t = "concluída";
    else if (g.phase === "portal") t = "portal aberto";
    r.waveT.textContent = t;
    const can = canHasten(w);
    r.hasten.classList.toggle("hidden", !can);
    if (can && w) r.hasten.textContent = `H apressar +${Math.round(hastenBonus(w) * 100)}%`;
    r.gold.textContent = `${g.run.gold} ouro`;
    r.boss.style.top = "64px";
    const hint = g.nearPortal ? "E — seguir para a próxima zona" : g.phase === "walk" && g.playerAlive ? `Entre no círculo para começar a onda ${n}` : "";
    if (r.hint.textContent !== hint) r.hint.textContent = hint;
    r.hint.classList.toggle("hidden", !hint || !!this.overlay);
    if (this.frameN % 15 === 0 && !r.perf.classList.contains("hidden")) {
      r.perf.textContent = `${Math.round(g.fps)} fps · GPU ${g.pipeline.gpuMs < 0 ? "?" : g.pipeline.gpuMs.toFixed(1) + " ms"} · qualidade ${QUALITY[g.quality]} · ${g.pipeline.bufferSize.x}×${g.pipeline.bufferSize.y} (${Math.round(g.resScale * 100)}%)`;
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

  // ---------------------------------------------------------------- status da partida
  /** Ficha da partida (I): atributos calculados, spells, melhorias e relíquias. Não há equipamento (D13). */
  private showStatus(): void {
    const g = this.game;
    const run = g.run;
    const s = g.stats;
    const h = g.hero;
    const panel = this.overlayKind === "status" ? (this.overlay!.firstChild as HTMLElement) : this.open("status", "status");
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const spellLine = (name: string, level: number, note: string) =>
      `<div class="relic">${name} <small>nv ${level}/${SPELL_MAX_LEVEL}${note ? " · " + note : ""}</small></div>`;
    const spells = [
      spellLine(h.technique.name, run.technique.level, "técnica"),
      ...run.spells.map((sp) => spellLine(spellName(sp.id), sp.level, sp.evolution ? "evoluída" : "")),
    ];
    panel.innerHTML = `
      <div>
        <h2 style="color:${hex(h.color)}">${h.name}</h2>
        <p class="sub">${h.title} · nível ${run.level} · ${run.xp}/${run.xpToNext} XP</p>
        <p class="sub">onda ${run.wave} de ${TOTAL_WAVES}${run.endless ? " · sem fim" : ""} · ${run.gold} ouro · seed ${run.seedCode}</p>
        <div class="section">Ficha</div>
        <div class="statlist">
          <span>Vida</span><b>${s.maxHp}</b>
          <span>Dano por golpe</span><b>${Math.round(s.damage * h.auto.damage)}</b>
          <span>Ataques por segundo</span><b>${(h.auto.rate * s.attackSpeed).toFixed(2)}</b>
          <span>Crítico</span><b>${pct(s.critChance)} · x${s.critDamage.toFixed(2)}</b>
          <span>Armadura</span><b>${Math.round(s.armor)} (-${pct(1 - s.damageTaken)} dano)</b>
          <span>Esquiva</span><b>${pct(s.dodge)}</b>
          <span>Regeneração</span><b>${s.regen.toFixed(1)}/s</b>
          <span>Movimento</span><b>${s.moveSpeed.toFixed(1)}</b>
          <span>Alcance</span><b>+${pct(s.range - 1)}</b>
          <span>Recarga da técnica</span><b>${(g.tech?.cooldown ?? h.technique.cooldown * s.cooldownMult).toFixed(1)} s</b>
          <span>XP ganho</span><b>+${pct(s.xp - 1)}</b>
          <span>Ouro ganho</span><b>+${pct(s.gold - 1)}</b>
        </div>
      </div>
      <div>
        <div class="section" style="margin-top:0">Spells</div>
        <div class="relics">${spells.join("")}</div>
        <div class="section">Melhorias (${run.upgradesTaken.length})</div>
        <div class="relics">${run.upgradesTaken.length ? run.upgradesTaken.map((id, i) => {
          const t = run.upgradeTiers[i] ?? "common";
          return `<div class="relic" style="border-color:${TIER_COLOR[t]}" title="${TIER_LABEL[t]}">${UPGRADE_BY_ID[id]?.name ?? id}</div>`;
        }).join("") : `<span style="color:var(--muted)">Suba de nível e escolha no fim da onda.</span>`}</div>
        <div class="section">Relíquias (${run.relics.length})</div>
        <div class="relics">${run.relics.length ? run.relics.map((id) => `<div class="relic" data-relic="${id}" style="border-color:${hex(RELICS[id].color)}">${RELICS[id].name}</div>`).join("")
          : `<span style="color:var(--muted)">Derrote um chefe para escolher a primeira.</span>`}</div>
        <div class="row end"><button data-act="close">Fechar (I)</button></div>
      </div>`;
    panel.onclick = (ev) => {
      if ((ev.target as HTMLElement).closest("[data-act=close]")) this.close();
    };
    panel.onmousemove = (ev) => {
      const rel = (ev.target as HTMLElement).closest<HTMLElement>("[data-relic]");
      if (rel) {
        const d = RELICS[rel.dataset.relic!];
        return this.showTip(`<h4 style="color:${hex(d.color)}">${d.name}</h4><div class="meta">Relíquia ${RELIC_RARITY[d.rarity]}</div>${statLines(d.stats)}`, ev);
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
  private showRelicChoice(ids: string[], pick: (id: string) => void, title = "Chefe derrotado!"): void {
    const panel = this.open("relic", "relic");
    panel.style.width = "min(820px, 96vw)";
    panel.innerHTML = `<h2>${title}</h2><p class="sub">Escolha uma relíquia. O bônus é permanente.</p>
      <div class="cards">${ids.map((id) => {
        const d = RELICS[id];
        return `<div class="card" data-relic="${id}" style="--cc:${hex(d.color)}"><div class="meta">Relíquia ${RELIC_RARITY[d.rarity]}</div>
          <h3>${d.name}</h3>${statLines(d.stats)}</div>`;
      }).join("")}</div>`;
    panel.onclick = (ev) => {
      const id = (ev.target as HTMLElement).closest<HTMLElement>("[data-relic]")?.dataset.relic;
      if (!id) return;
      this.close();
      pick(id);
    };
  }

  /** O mapa da partida (run_map.lua): 3 cartas para a próxima onda, com a sala já sorteada à mostra (D-083). */
  private showMap(): void {
    const g = this.game;
    const cards = g.mapCards;
    if (!cards) return;
    const panel = this.open("map", "map");
    panel.style.width = "min(860px, 96vw)";
    const next = g.run.wave + 1;
    panel.innerHTML = `<h2>Mapa da partida</h2><p class="sub">Escolha o caminho da onda ${next}.</p>
      <div class="cards">${cards.map((c, i) => mapCardHtml(c, i)).join("")}</div>`;
    panel.onclick = (ev) => {
      const el = (ev.target as HTMLElement).closest<HTMLElement>("[data-card]");
      if (!el) return;
      this.close();
      g.chooseMapCard(Number(el.dataset.card));
    };
  }

  /** As 3 cartas de melhoria (level_up.lua): raridade, efeitos e a troca paga com ouro. */
  private showLevelUp(): void {
    const g = this.game;
    const L = g.levelUp;
    if (!L) return;
    const panel = this.open("levelup", "levelup");
    panel.style.width = "min(820px, 96vw)";
    const cost = rerollCost(g.run);
    const left = rerollsLeft(L.rerolls);
    const can = left > 0 && g.run.gold >= cost;
    panel.innerHTML = `<h2>Nível ${g.run.level - g.run.pendingLevelUps + 1}${L.total > 1 ? ` <small>(${L.index} de ${L.total})</small>` : ""}</h2>
      <p class="sub">Escolha uma melhoria. Ela vale até o fim da partida.</p>
      <div class="cards">${L.ids.map((id, i) => {
        const u = UPGRADE_BY_ID[id];
        const t = L.tiers[i];
        const body = u.hideEffects ? "" : effectsFor(u, t).map(upgradeLine).join("");
        return `<div class="card" data-up="${i}" style="--cc:${TIER_COLOR[t]}"><div class="meta">${TIER_LABEL[t]}</div>
          <h3>${u.name}</h3>${body}${u.note ? `<p class="note">${u.note}</p>` : ""}</div>`;
      }).join("")}</div>
      <div class="row end"><button data-act="reroll" ${can ? "" : "disabled"}>Trocar as 3 — ${cost} ouro${left > 0 ? "" : " (já trocou)"}</button></div>`;
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

  private showPause(): void {
    const g = this.game;
    const panel = this.open("pause", "pause");
    const mins = Math.floor(g.run.statistics.elapsed / 60);
    panel.innerHTML = `<h2>Pausa</h2><p class="sub">onda ${g.run.wave} · ${g.run.gold} ouro · ${g.run.statistics.kills} abates · ${mins} min de jogo · seed ${g.run.seedCode}</p>
      <div class="section" style="color:${hex(g.hero.color)}">${g.hero.name} — ${g.hero.title}</div>
      ${heroKit(g.hero, g.tech?.cooldown ?? g.hero.technique.cooldown * g.stats.cooldownMult)}
      <div class="controls">
        <kbd>W A S D</kbd><span>Mover</span>
        <kbd>Mouse</kbd><span>Mirar</span>
        <kbd>Botão esquerdo</kbd><span>Atacar (segure)</span>
        <kbd>Botão direito / Q</kbd><span>Técnica do herói: ${g.hero.technique.name}</span>
        <kbd>Espaço</kbd><span>Esquiva (invulnerável por um instante)</span>
        <kbd>F</kbd><span>Poção de cura</span>
        <kbd>H</kbd><span>Apressar a onda (depois de 5 s; mais recompensa, inimigos mais rápidos)</span>
        <kbd>E</kbd><span>Entrar no portal (depois do chefe da zona)</span>
        <kbd>I / Tab</kbd><span>Status da partida</span>
        <kbd>Roda do mouse</kbd><span>Aproximar ou afastar a câmera</span>
        <kbd>F3</kbd><span>Mostrar quadros por segundo</span>
      </div>
      <div class="row end"><button data-act="quality">Qualidade: ${QUALITY[g.quality]}</button><button data-act="mute">${g.audio.muted ? "Ligar som" : "Desligar som"}</button>
        <button data-act="title">Sair para o título</button><button class="primary" data-act="close">Continuar</button></div>`;
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
    panel.innerHTML = `<h2 style="color:var(--gold)">Vitória!</h2>
      <p>Você venceu a onda 20: esta partida já conta como vencida.</p>
      <p class="sub">Continuar leva ao modo sem fim: ondas mais fortes a cada rodada, chefe a cada 5 ondas, o mapa segue. Morrer depois não tira a vitória; a maior onda vira um recorde separado.</p>
      <div class="row end"><button data-act="end">Encerrar com a vitória</button><button class="primary" data-act="endless">Continuar (sem fim)</button></div>`;
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
    const isBest = addRecord(rec, summarize(run), new Date().toISOString().slice(0, 10));
    writeRecords(this.storage, rec);
    const best = rec.best[`${run.heroId}/${run.difficultyId}`];
    const setup: RunSetup = { heroId: run.heroId, difficultyId: run.difficultyId, startingSpell: run.startingSpell };
    const s = run.statistics;
    const n = (v: number) => Math.round(v).toLocaleString("pt-BR");
    const diff = DIFFICULTIES[run.difficultyId].name;
    const sub = kind === "death"
      ? `A partida terminou na onda ${run.wave}${run.killedBy ? ` — golpe final: ${run.killedBy}` : ""}.${run.victory ? " A vitória da onda 20 continua valendo." : ""}`
      : `Você completou as 20 ondas (${diff}).`;
    const panel = this.open("results", "results");
    panel.innerHTML = `<h2 style="color:${kind === "death" ? "var(--bad)" : "var(--gold)"}">${kind === "death" ? "Você caiu" : "Vitória!"}</h2>
      <p class="sub">${sub}</p>
      <div class="results-cols">
        <div>
          <div class="kv"><span>Herói</span><b>${g.hero.name} · ${diff}</b></div>
          <div class="kv"><span>Onda / nível</span><b>${run.wave} / ${run.level}</b></div>
          <div class="kv"><span>Abates</span><b>${n(s.kills)}</b></div>
          <div class="kv"><span>Dano causado</span><b>${n(s.damage)}</b></div>
          <div class="kv"><span>Dano recebido</span><b>${n(s.damageTaken)}</b></div>
          <div class="kv"><span>Cura</span><b>${n(s.healed)}</b></div>
          <div class="kv"><span>Ouro ganho / gasto</span><b>${n(s.goldEarned)} / ${n(s.goldSpent)}</b></div>
          <div class="kv"><span>Tempo de combate</span><b>${fmtTime(Math.floor(s.elapsed))}</b></div>
          <div class="kv"><span>Melhorias / relíquias</span><b>${run.upgradesTaken.length} / ${run.relics.length}</b></div>
        </div>
        <div>
          <div class="section">Relíquias (${run.relics.length})</div>
          <div class="relics">${run.relics.length ? run.relics.map((id) => `<div class="relic" style="border-color:${hex(RELICS[id].color)}">${RELICS[id].name}</div>`).join("") : `<p class="note">Nenhuma relíquia nesta partida.</p>`}</div>
          <div class="section">Seed</div><p><b style="letter-spacing:2px">${run.seedCode}</b></p>
          <div class="section">Pontuação</div>
          <p style="color:${isBest ? "var(--gold)" : "inherit"}">${isBest ? `Novo recorde! (${g.hero.name} · ${diff})` : `Recorde (${g.hero.name} · ${diff}): onda ${best.wave}, ${n(best.kills)} abates`}</p>
        </div>
      </div>
      <div class="row end"><button data-act="menu">Menu principal</button><button data-act="seed">Repetir esta seed</button><button class="primary" data-act="again">Jogar de novo</button></div>`;
    panel.onclick = (ev) => {
      const act = (ev.target as HTMLElement).closest<HTMLElement>("[data-act]")?.dataset.act;
      if (act === "again") this.newRunWith(setup);
      else if (act === "seed") this.newRunWith(setup, run.seed);
      else if (act === "menu") this.showTitle();
    };
  }
}

/** Nome da spell até o M6-01 trazer as definições: o id com espaços ("arcane_bolt" → "Arcane Bolt"), como em spells.lua. */
function spellName(id: string): string {
  return id.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
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
      lines.push(`<div class="stat neg">Chefe com ${Math.round(room.ambush.hp * 100)}% da vida e ${Math.round(room.ambush.damage * 100)}% do dano</div>`);
    }
    // perigos de chão e poças de cura ainda não existem aqui (M20-08)
    const later = room.hazards || room.pools;
    const notes = (room.notes ?? []).map((t) => `<p class="note">${t}${later && (t.includes("raio") || t.includes("Raios") || t.includes("Poças")) ? " (em breve)" : ""}</p>`);
    body = `<h3 style="margin-top:6px">${room.name}</h3>${lines.join("")}${notes.join("")}<p class="note">${n.text}</p>`;
  }
  return `<div class="card" data-card="${i}" style="--cc:${n.color}"><div class="meta">${n.name}</div>${body}</div>`;
}

function fmtTime(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}
