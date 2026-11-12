// Interface em DOM: título, HUD, inventário, viagem, relíquias, pausa.
import { itemName, itemScore, RARITY_COLOR, RARITY_LABEL, SLOT_LABEL, SLOTS, type Item, type Slot } from "../core/items";
import { deleteSave, loadSave, newSave, safeStorage } from "../core/save";
import { ATTR_INFO, ATTR_KEYS, formatStat, STAT_KEYS, xpToNext, type StatBlock } from "../core/stats";
import { BOSSES } from "../data/enemies";
import { HEROES, HERO_ORDER } from "../data/heroes";
import { RELICS } from "../data/relics";
import { TUNING } from "../data/tuning";
import { ZONES, ZONE_ORDER } from "../data/zones";
import type { Game } from "../game/game";

const ICON: Record<Slot, string> = { weapon: "⚔️", armor: "🛡️", trinket: "📿" };
const hex = (n: number) => "#" + n.toString(16).padStart(6, "0");
const QUALITY = ["baixa", "média", "alta"];
const RELIC_RARITY: Record<string, string> = { incomum: "Incomum", raro: "Rara", epico: "Épica" };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", html = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
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
      died: () => setTimeout(() => this.showDeath(), 900),
      zoneChanged: () => this.onZoneChanged(),
      bagChanged: () => {
        if (this.overlayKind === "inv") this.showInventory();
      },
      victory: () => this.showVictory(),
      openTravel: () => this.showTravel(),
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
    const locked = ["title", "relic", "death", "victory"].includes(this.overlayKind);
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
    } else if (k === "KeyM") {
      if (this.overlayKind === "travel") this.close();
      else this.showTravel();
    }
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
    const save = loadSave(this.storage);
    const render = () => {
      const h = HEROES[this.selectedHero];
      panel.innerHTML = `
        <h1>DUNGEON REIGN</h1>
        <p class="tag">RPG de ação · protótipo 0.2 · mapas procedurais, um herói, loot e chefes</p>
        ${save ? `<div class="continue"><button class="primary" data-act="continue" style="padding:12px 30px;font-size:16px">
          Continuar — ${HEROES[save.heroId]?.name ?? "?"} nível ${save.level}</button></div>` : ""}
        <div class="section">${save ? "Ou comece um novo herói (apaga o save atual)" : "Escolha seu herói"}</div>
        <div class="heroes">${HERO_ORDER.map((id) => {
          const d = HEROES[id];
          return `<div class="hero-card ${id === this.selectedHero ? "sel" : ""}" data-hero="${id}" style="--hc:${hex(d.color)}">
            <div class="swatch"></div><b>${d.name}</b><i>${d.title}</i><span>${d.identity}</span></div>`;
        }).join("")}</div>
        <div class="hero-detail" style="--hc:${hex(h.color)}">
          <h3 style="color:${hex(h.color)}">${h.name} — ${h.title}</h3>
          <p><b>Ataque:</b> ${h.passive}</p>
          <p><b>Técnica (botão direito) — ${h.technique.name}:</b> ${h.technique.text}</p>
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
      if (act === "continue" && save) this.begin(save);
      else if (act === "new") {
        // confirmação em dois cliques (sem confirm(): alguns ambientes bloqueiam diálogos)
        if (save && this.confirmNew !== this.selectedHero) {
          this.confirmNew = this.selectedHero;
          const b = t.closest<HTMLElement>("[data-act]")!;
          b.textContent = "Isso apaga o save atual. Clique de novo para confirmar";
          b.classList.add("danger");
          return;
        }
        deleteSave(this.storage);
        this.begin(newSave(this.selectedHero, (Math.random() * 0xffffffff) >>> 0));
      }
    };
  }

  private begin(save: ReturnType<typeof newSave>): void {
    this.game.audio.unlock();
    this.close();
    this.hud.classList.remove("hidden");
    this.game.start(save);
    if (save.kills === 0) this.toast("WASD move · mouse mira · segure o botão esquerdo para atacar", "#9be4ff");
  }

  // ---------------------------------------------------------------- HUD
  private buildHud(): void {
    this.hud.innerHTML = `
      <div id="vignette"></div>
      <div class="hud-top-left"><h2 data-r="zone"></h2><p data-r="zoneSub"></p><div class="points hidden" data-r="points"></div></div>
      <canvas id="minimap" width="176" height="176"></canvas>
      <div class="hud-help">I inventário · M mapa · Esc pausa<br>F3 desempenho</div>
      <div id="bossbar" class="hidden" data-r="boss"><h3 data-r="bossName"></h3><div class="bar"><i data-r="bossFill"></i><span data-r="bossText"></span></div></div>
      <div id="hint" class="hidden" data-r="hint">E — entrar no portal</div>
      <div id="perf" class="hidden" data-r="perf"></div>
      <div id="toasts"></div>
      <div class="hud-bottom">
        <div class="skills">
          <div class="level-badge"><div><small>NÍVEL</small><span data-r="level"></span></div></div>
          <div class="skill"><kbd>ESQ</kbd>⚔️</div>
          <div class="skill big"><kbd>DIR</kbd>✨<div class="cd" data-r="techCd"></div><div class="cdn" data-r="techN"></div></div>
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
    this.r.zoneSub.textContent = `${z.subtitle} · nível ${z.level}–${z.level + 4}`;
  }

  private updateHud(): void {
    const g = this.game;
    if (!g.started) return;
    const p = g.player;
    const s = g.stats;
    const r = this.r;
    const sv = g.save;
    r.hpFill.style.width = `${(p.hp / s.maxHp) * 100}%`;
    r.hpText.textContent = `${Math.ceil(p.hp)} / ${s.maxHp}`;
    r.xpFill.style.width = `${Math.min(100, (sv.xp / xpToNext(sv.level)) * 100)}%`;
    r.level.textContent = String(sv.level);
    const tc = Math.max(0, p.techCd);
    r.techCd.style.height = `${(tc / p.techMax) * 100}%`;
    r.techN.textContent = tc > 0 ? tc.toFixed(tc < 3 ? 1 : 0) : "";
    r.dashCd.style.height = `${(Math.max(0, p.dashCd) / TUNING.hero.dashCooldown) * 100}%`;
    const pc = Math.max(0, p.potionCd);
    r.potCd.style.height = `${(pc / TUNING.hero.potionCooldown) * 100}%`;
    r.potN.textContent = pc > 0 ? String(Math.ceil(pc)) : "";
    r.points.classList.toggle("hidden", sv.attrPoints <= 0);
    r.points.textContent = `+${sv.attrPoints} ponto${sv.attrPoints > 1 ? "s" : ""} de atributo (I)`;
    (this.hud.querySelector("#vignette") as HTMLElement).style.opacity = String(Math.max(p.hurtT * 0.6, p.hp / s.maxHp < 0.25 ? 0.35 : 0));
    const boss = g.boss;
    const showBoss = !!boss && g.bossEngaged && !boss.dead;
    r.boss.classList.toggle("hidden", !showBoss);
    if (showBoss && boss) {
      r.bossName.textContent = `${boss.boss!.name} — ${boss.boss!.title}${boss.enraged ? " (enfurecido)" : ""}`;
      r.bossFill.style.width = `${(boss.hp / boss.maxHp) * 100}%`;
      r.bossText.textContent = `${Math.ceil(boss.hp)} / ${boss.maxHp}`;
    }
    r.hint.classList.toggle("hidden", !g.nearPortal || !!this.overlay);
    if (this.frameN % 15 === 0 && !r.perf.classList.contains("hidden")) {
      r.perf.textContent = `${Math.round(g.fps)} fps · qualidade ${QUALITY[g.quality]} · ${g.pipeline.bufferSize.x}×${g.pipeline.bufferSize.y}`;
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
    // chefe / portal
    ctx.font = "14px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(g.bossDead ? "🌀" : "💀", tx(L.boss.x), tx(L.boss.z));
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
    const sv = g.save;
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
        <p class="sub">${h.title} · nível ${sv.level} · ${sv.xp}/${xpToNext(sv.level)} XP</p>
        <div class="section">Atributos ${sv.attrPoints > 0 ? `<b style="color:var(--gold)">(${sv.attrPoints} para gastar)</b>` : ""}</div>
        ${ATTR_KEYS.map((k) => `<div class="attr"><div>${ATTR_INFO[k].name}<small>${ATTR_INFO[k].text}</small></div><b>${sv.attrs[k]}</b>
          <button data-attr="${k}" ${sv.attrPoints > 0 ? "" : "disabled"}>+</button></div>`).join("")}
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
          <span>Recarga da técnica</span><b>${(h.technique.cooldown * s.cooldownMult).toFixed(1)} s</b>
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
      const attr = t.closest<HTMLElement>("[data-attr]")?.dataset.attr;
      if (attr) return g.spendPoint(attr as (typeof ATTR_KEYS)[number]);
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
    const eq = g.save.equipped[it.slot];
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

  // ---------------------------------------------------------------- viagem / relíquia / pausa / morte
  private showTravel(): void {
    const g = this.game;
    const panel = this.open("travel", "travel");
    panel.style.width = "min(980px, 96vw)";
    panel.innerHTML = `<h2>Mapa do reino</h2><p class="sub">Viajar gera um mapa novo da zona, com todos os monstros e o chefe de volta.</p>
      <div class="cards">${ZONE_ORDER.map((id) => {
        const z = ZONES[id];
        const open = g.save.zonesUnlocked.includes(id);
        const killed = g.save.bossesKilled.includes(z.boss);
        return `<div class="card ${open ? "" : "locked"}" data-zone="${id}" style="--cc:${hex(z.path)}">
          <div class="meta">Nível ${z.level}–${z.level + 4}${id === g.zone.id ? " · você está aqui" : ""}</div>
          <h3>${open ? z.name : "???"}</h3><p>${open ? z.subtitle : "Derrote o chefe da zona anterior."}</p>
          <p>Chefe: <b>${open ? BOSSES[z.boss].name : "???"}</b> ${killed ? "✔ derrotado" : ""}</p></div>`;
      }).join("")}</div>
      <div class="row end"><button data-act="close">Ficar aqui (M)</button></div>`;
    panel.onclick = (ev) => {
      const t = ev.target as HTMLElement;
      if (t.closest("[data-act=close]")) return this.close();
      const id = t.closest<HTMLElement>("[data-zone]")?.dataset.zone;
      if (id && g.save.zonesUnlocked.includes(id)) {
        this.close();
        g.enterZone(id);
      }
    };
  }

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

  private showPause(): void {
    const g = this.game;
    const panel = this.open("pause", "pause");
    const mins = Math.floor(g.save.playSeconds / 60);
    panel.innerHTML = `<h2>Pausa</h2><p class="sub">${g.save.kills} abates · ${g.save.deaths} mortes · ${mins} min de jogo</p>
      <div class="controls">
        <kbd>W A S D</kbd><span>Mover</span>
        <kbd>Mouse</kbd><span>Mirar</span>
        <kbd>Botão esquerdo</kbd><span>Atacar (segure)</span>
        <kbd>Botão direito / Q</kbd><span>Técnica do herói: ${g.hero.technique.name}</span>
        <kbd>Espaço</kbd><span>Esquiva (invulnerável por um instante)</span>
        <kbd>F</kbd><span>Poção de cura</span>
        <kbd>E</kbd><span>Entrar no portal (depois do chefe)</span>
        <kbd>I / Tab</kbd><span>Inventário e atributos</span>
        <kbd>M</kbd><span>Mapa do reino (viajar entre zonas)</span>
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
      <p class="sub">Nada se perde: você volta à fogueira com a vida cheia. Os monstros vivos se recuperam.</p>
      <div class="row end"><button class="primary" data-act="respawn">Renascer</button></div>`;
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
      <p class="sub">${g.hero.name} chegou ao fim do reino no nível ${g.save.level}, com ${g.save.kills} abates e ${g.save.deaths} mortes.</p>
      <p>Este é o fim do protótipo. Você pode continuar explorando e farmando em qualquer zona.</p>
      <div class="row end"><button class="primary" data-act="close">Continuar jogando</button></div>`;
    panel.onclick = (ev) => {
      if ((ev.target as HTMLElement).closest("[data-act=close]")) this.close();
    };
  }
}
