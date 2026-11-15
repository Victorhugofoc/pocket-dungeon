// Interface em DOM: título, HUD, inventário, viagem, relíquias, pausa.
import { canHasten, hastenBonus } from "../core/wave";
import { TOTAL_WAVES } from "../data/run";
import { itemName, itemScore, RARITY_COLOR, RARITY_LABEL, SLOT_LABEL, SLOTS, type Item, type Slot } from "../core/items";
import { clearRun, discardLegacySave, loadRun, safeStorage } from "../core/save";
import { RunRng, continueRun, newRun, type RunState } from "../core/run";
import { formatStat, STAT_KEYS, type StatBlock } from "../core/stats";
import { effectsFor, rerollCost, rerollsLeft, type UpgradeTier } from "../core/levelup";
import { PCT_STATS, UPGRADE_BY_ID, type UpgradeEffect } from "../data/upgrades";
import { BOSSES } from "../data/enemies";
import { HEROES, HERO_ORDER, type HeroDef } from "../data/heroes";
import { RELICS } from "../data/relics";
import { TUNING } from "../data/tuning";
import { ZONES, ZONE_ORDER } from "../data/zones";
import type { Game } from "../game/game";

const ICON: Record<Slot, string> = { weapon: "⚔️", armor: "🛡️", trinket: "📿" };
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
  private storage = safeStorage();
  private r: Record<string, HTMLElement> = {};

  constructor(private game: Game, private root: HTMLElement) {
    this.hud.id = "hud";
    this.tip.id = "tip";
    root.append(this.hud, this.tip);
    this.buildHud();
    game.events = {
      toast: (m, c) => this.toast(m, c),
      relicChoice: (ids, pick) => this.showRelicChoice(ids, pick),
      levelUp: () => this.showLevelUp(),
      died: () => setTimeout(() => this.showDeath(), 900),
      zoneChanged: () => this.onZoneChanged(),
      bagChanged: () => {
        if (this.overlayKind === "inv") this.showInventory();
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
    const locked = ["title", "relic", "levelup", "death", "victory"].includes(this.overlayKind);
    if (locked) return;
    if (k === "Escape") {
      if (this.overlay) this.close();
      else this.showPause();
    } else if (k === "KeyI" || k === "Tab") {
      e.preventDefault();
      if (this.overlayKind === "inv") this.close();
      else this.showInventory();
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

  // ---------------------------------------------------------------- título
  private showTitle(): void {
    this.game.stop();
    this.hud.classList.add("hidden");
    const panel = this.open("title", "title");
    this.game.paused = true;
    if (discardLegacySave(this.storage)) {
      this.toast("O save antigo (herói contínuo, com itens) foi descartado: o jogo agora é por partidas, como no Dungeon Reign", "#ffc83d");
    }
    const save = loadRun(this.storage);
    const render = () => {
      const h = HEROES[this.selectedHero];
      panel.innerHTML = `
        <h1>DUNGEON REIGN</h1>
        <p class="tag">RPG de ação · protótipo 0.3 · mapas procedurais, um herói, loot e chefes</p>
        ${save ? `<div class="continue"><button class="primary" data-act="continue" style="padding:12px 30px;font-size:16px">
          Continuar — ${HEROES[save.run.heroId]?.name ?? "?"} · onda ${save.wave} · nível ${save.run.level} · seed ${save.run.seedCode}</button></div>` : ""}
        <div class="section">${save ? "Ou comece uma partida nova (encerra a atual)" : "Escolha seu herói"}</div>
        <div class="heroes">${HERO_ORDER.map((id) => {
          const d = HEROES[id];
          return `<div class="hero-card ${id === this.selectedHero ? "sel" : ""}" data-hero="${id}" style="--hc:${hex(d.color)}">
            <div class="swatch"></div><b>${d.name}</b><i>${d.title}</i><span>${d.identity}</span></div>`;
        }).join("")}</div>
        <div class="hero-detail" style="--hc:${hex(h.color)}">
          <h3 style="color:${hex(h.color)}">${h.name} — ${h.title}</h3>
          ${heroKit(h, h.technique.cooldown)}
          <p style="color:var(--muted)">${statLines(h.stats).replace(/<div class="st">/g, "").replace(/<\/div>/g, " · ").replace(/ · $/, "")}</p>
        </div>
        <div class="title-actions"><button class="primary" data-act="new">Começar com ${h.name}</button></div>`;
    };
    render();
    panel.onclick = (ev) => {
      const t = ev.target as HTMLElement;
      const card = t.closest<HTMLElement>("[data-hero]");
      if (card) {
        this.selectedHero = card.dataset.hero!;
        render();
        return;
      }
      const act = t.closest<HTMLElement>("[data-act]")?.dataset.act;
      if (act === "continue" && save) {
        const c = continueRun(save);
        this.begin(c.run, c.rng);
      }
      else if (act === "new") {
        // confirmação em dois cliques (sem confirm(): alguns ambientes bloqueiam diálogos)
        if (save && this.confirmNew !== this.selectedHero) {
          this.confirmNew = this.selectedHero;
          const b = t.closest<HTMLElement>("[data-act]")!;
          b.textContent = "Isso encerra a partida atual. Clique de novo para confirmar";
          b.classList.add("danger");
          return;
        }
        clearRun(this.storage);
        // dificuldade e spell inicial ainda sem tela (M20-06): Normal e a primeira das 4 do herói
        const h = HEROES[this.selectedHero];
        const run = newRun({ heroId: h.id, difficultyId: "normal", startingSpell: h.startingSpells[0], randomSeed: (Math.random() * 0x7fffffff) >>> 0 });
        this.begin(run, new RunRng(run.seed));
      }
    };
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
      <div class="hud-help">H apressar a onda · I inventário · Esc pausa<br>F3 desempenho</div>
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
    const sv = legacyView(g);
    r.hpFill.style.width = `${(p.hp / s.maxHp) * 100}%`;
    r.hpText.textContent = `${Math.ceil(p.hp)} / ${s.maxHp}`;
    r.xpFill.style.width = `${Math.min(100, (sv.xp / g.run.xpToNext) * 100)}%`;
    r.level.textContent = String(sv.level);
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
      r.bossName.textContent = `${boss.boss!.name} — ${boss.boss!.title}${boss.enraged ? " (enfurecido)" : ""}`;
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

  // ---------------------------------------------------------------- inventário
  private showInventory(): void {
    const g = this.game;
    const sv = legacyView(g);
    const s = g.stats;
    const h = g.hero;
    const panel = this.overlayKind === "inv" ? (this.overlay!.firstChild as HTMLElement) : this.open("inv", "inv");
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const cell = (it: Item | undefined, where: string, idx: number) => {
      if (!it) return `<div class="cell empty"></div>`;
      const eq = sv.equipped[it.slot];
      const cmp = where === "bag" && eq ? itemScore(it) - itemScore(eq) : where === "bag" ? 1 : 0;
      const arrow = cmp > 0.5 ? `<span class="up">▲</span>` : cmp < -0.5 ? `<span class="down">▼</span>` : "";
      return `<div class="cell" data-where="${where}" data-idx="${idx}" style="border-color:${RARITY_COLOR[it.rarity]}">${ICON[it.slot]}${arrow}<small>${it.ilvl}</small></div>`;
    };
    const bag: string[] = [];
    for (let i = 0; i < TUNING.loot.bagSize; i++) bag.push(cell(sv.bag[i], "bag", i));
    panel.innerHTML = `
      <div>
        <h2 style="color:${hex(h.color)}">${h.name}</h2>
        <p class="sub">${h.title} · nível ${sv.level} · ${sv.xp}/${g.run.xpToNext} XP</p>
        <div class="section">Melhorias (${g.run.upgradesTaken.length})</div>
        <div class="relics">${g.run.upgradesTaken.length ? g.run.upgradesTaken.map((id, i) => {
          const t = g.run.upgradeTiers[i] ?? "common";
          return `<div class="relic" style="border-color:${TIER_COLOR[t]}" title="${TIER_LABEL[t]}">${UPGRADE_BY_ID[id]?.name ?? id}</div>`;
        }).join("") : `<span style="color:var(--muted)">Suba de nível e escolha no fim da onda.</span>`}</div>
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
          <span>Recarga da técnica</span><b>${(g.tech?.cooldown ?? h.technique.cooldown * s.cooldownMult).toFixed(1)} s</b>
          <span>Sorte de loot</span><b>+${pct(s.magicFind)}</b>
        </div>
      </div>
      <div>
        <div class="section" style="margin-top:0">Equipado</div>
        <div class="slots">${SLOTS.map((sl) => `<div>${sv.equipped[sl] ? cell(sv.equipped[sl], "eq", SLOTS.indexOf(sl)) : `<div class="cell empty">${ICON[sl]}</div>`}
          <div class="slot-label">${sl === "weapon" ? h.weaponName : SLOT_LABEL[sl]}</div></div>`).join("")}</div>
        <div class="section">Mochila (${sv.bag.length}/${TUNING.loot.bagSize}) — clique equipa · botão direito descarta</div>
        <div class="grid">${bag.join("")}</div>
        <div class="section">Relíquias (${sv.relics.length})</div>
        <div class="relics">${sv.relics.length ? sv.relics.map((id) => `<div class="relic" data-relic="${id}" style="border-color:${hex(RELICS[id].color)}">${RELICS[id].name}</div>`).join("")
          : `<span style="color:var(--muted)">Derrote um chefe para escolher a primeira.</span>`}</div>
        <div class="row end"><button data-act="close">Fechar (I)</button></div>
      </div>`;
    const itemAt = (c: HTMLElement): Item | undefined =>
      c.dataset.where === "bag" ? sv.bag[Number(c.dataset.idx)] : sv.equipped[SLOTS[Number(c.dataset.idx)]];
    panel.onclick = (ev) => {
      const t = ev.target as HTMLElement;
      if (t.closest("[data-act=close]")) return this.close();
      const c = t.closest<HTMLElement>(".cell[data-where=bag]");
      const it = c && itemAt(c);
      if (it) g.equip(it);
    };
    panel.oncontextmenu = (ev) => {
      ev.preventDefault();
      const c = (ev.target as HTMLElement).closest<HTMLElement>(".cell[data-where=bag]");
      const it = c && itemAt(c);
      if (it) g.discard(it);
    };
    panel.onmousemove = (ev) => {
      const t = ev.target as HTMLElement;
      const c = t.closest<HTMLElement>(".cell[data-where]");
      const rel = t.closest<HTMLElement>("[data-relic]");
      if (c) {
        const it = itemAt(c);
        if (it) return this.showTip(this.itemTip(it, c.dataset.where === "bag"), ev);
      } else if (rel) {
        const d = RELICS[rel.dataset.relic!];
        return this.showTip(`<h4 style="color:${hex(d.color)}">${d.name}</h4><div class="meta">Relíquia ${RELIC_RARITY[d.rarity]}</div>${statLines(d.stats)}`, ev);
      }
      this.tip.classList.add("hidden");
    };
  }

  private itemTip(it: Item, inBag: boolean): string {
    const g = this.game;
    const eq = g.run.legacy.equipped[it.slot];
    let cmp = "";
    if (inBag) {
      const lines: string[] = [];
      for (const k of STAT_KEYS) {
        const d = (it.stats[k] ?? 0) - (eq?.stats[k] ?? 0);
        if (Math.abs(d) < 1e-6) continue;
        lines.push(`<div class="${d > 0 ? "g" : "b"}">${formatStat(k, d)}</div>`);
      }
      cmp = `<div class="cmp"><div style="color:var(--muted)">${eq ? "Em relação ao equipado:" : "Espaço vazio:"}</div>${lines.join("")}</div>
        <div class="how">Clique: equipar · Botão direito: descartar</div>`;
    }
    return `<h4 style="color:${RARITY_COLOR[it.rarity]}">${itemName(it, g.hero.weaponName)}</h4>
      <div class="meta">${RARITY_LABEL[it.rarity]} · ${SLOT_LABEL[it.slot]} · nível ${it.ilvl}</div>${statLines(it.stats)}${cmp}`;
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
  private showRelicChoice(ids: string[], pick: (id: string) => void): void {
    const panel = this.open("relic", "relic");
    panel.style.width = "min(820px, 96vw)";
    panel.innerHTML = `<h2>Chefe derrotado!</h2><p class="sub">Escolha uma relíquia. O bônus é permanente.</p>
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
    panel.innerHTML = `<h2>Pausa</h2><p class="sub">onda ${g.run.wave} · ${g.run.gold} ouro · ${g.run.statistics.kills} abates · ${g.run.legacy.deaths} mortes · ${mins} min de jogo · seed ${g.run.seedCode}</p>
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
        <kbd>I / Tab</kbd><span>Inventário e atributos</span>
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

  private showDeath(): void {
    if (this.game.playerAlive) return;
    const panel = this.open("death", "death");
    panel.innerHTML = `<h2 style="color:var(--bad)">Você caiu</h2>
      <p class="sub">A onda ${this.game.run.wave} recomeça do começo, com o que você tinha ao entrar nela.</p>
      <div class="row end"><button class="primary" data-act="respawn">Recomeçar a onda</button></div>`;
    panel.onclick = (ev) => {
      if (!(ev.target as HTMLElement).closest("[data-act=respawn]")) return;
      this.close();
      this.game.respawn();
    };
  }

  private showVictory(): void {
    const g = this.game;
    const panel = this.open("victory", "victory");
    panel.innerHTML = `<h2 style="color:var(--gold)">O Rei Oco caiu</h2>
      <p class="sub">${g.hero.name} chegou ao fim do reino no nível ${g.run.level}, com ${g.run.statistics.kills} abates e ${g.run.legacy.deaths} mortes.</p>
      <p>As 20 ondas acabaram. O portal leva ao modo sem fim: as zonas voltam com mapas novos e inimigos mais fortes.</p>
      <div class="row end"><button class="primary" data-act="close">Seguir no modo sem fim</button></div>`;
    panel.onclick = (ev) => {
      if ((ev.target as HTMLElement).closest("[data-act=close]")) this.close();
    };
  }
}

/** Os campos que as telas antigas (HUD, inventário) liam do save contínuo; saem com o M20-03 e o M20-04. */
function legacyView(g: Game) {
  const r = g.run;
  return { ...r.legacy, level: r.level, xp: r.xp, relics: r.relics };
}

function fmtTime(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}
