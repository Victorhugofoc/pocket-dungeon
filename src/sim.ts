// M17-01: o modo simulação. O bot joga o jogo de verdade (o mesmo `Game`), em passo fixo e sem desenhar:
// responde às telas com as decisões de `core/simbot.ts` e pilota o herói. Fora do build do jogo.
// Uso no console de /sim.html: `await __sim.run({ hero: "ignis", difficulty: "normal", seed: 1 })`.

import { seedRandom } from "./sim-env";
import { Game, type GameEvents } from "./game/game";
import { RunRng, newRun } from "./core/run";
import { HEROES } from "./data/heroes";
import type { RunOutcome } from "./core/runlog";
import type { DifficultyId } from "./data/run";
import {
  botStartSpell, pickEvent, pickMap, pickRelic, pickUpgrade, shopOrder, shouldReroll, type BotView,
} from "./core/simbot";
import { rerollCost } from "./core/shop";
import { BOT_RUN } from "./data/simbot";
import { TUNING } from "./data/tuning";
import { DIRS, dodgeDir, pickTarget, steer, techniqueAim, type TechKindBot } from "./core/simsteer";

export interface SimOptions {
  hero: string;
  difficulty: string;
  seed: number;
  /** tempo máximo de jogo, em s */
  maxTime?: number;
  /** M17-01 parte 4: o lote do `npm run sim` (o relatório lê só as linhas dele) */
  batch?: string;
}

export interface SimResult {
  hero: string;
  difficulty: string;
  seed: number;
  outcome: RunOutcome;
  wave: number;
  level: number;
  victory: boolean;
  killedBy: string | null;
  /** tempo de jogo, em s */
  time: number;
  /** tempo real gasto, em s */
  wall: number;
  /** quantas vezes o bot usou a técnica, a esquiva e cada spell */
  uses: BotUses;
}

interface BotUses { technique: number; dodge: number; spells: number[] }

const canvas = document.getElementById("game") as HTMLCanvasElement;
const texts = document.getElementById("texts") as HTMLElement;
const out = document.getElementById("out") as HTMLElement;
const game = new Game(canvas, texts, { sim: true });

/** a escolha de relíquia aberta (a única tela que chega por callback) */
let relicPending: { ids: string[]; pick: (id: string) => void } | null = null;
/** cartas do mapa recusadas nesta onda (evento sem ouro, pacto que não entrou): não escolher de novo */
let declined = { wave: -1, cards: new Set<number>() };
let died = false;
let won = false;

const noop = () => {};
const events: GameEvents = {
  toast: noop,
  relicChoice: (ids, pick) => {
    relicPending = { ids, pick };
  },
  levelUp: noop,
  evolution: noop,
  relicEvolution: noop,
  shop: noop,
  died: () => {
    died = true;
  },
  zoneChanged: noop,
  statusChanged: noop,
  victory: () => {
    won = true;
  },
  banner: noop,
};
game.events = events;

// o jogo guarda partes do estado como privadas; o bot lê só o que a tela mostraria
type GameInternals = { mapResolved: boolean; warpPending: boolean; shrineOpen: boolean; world: { portal: { position: { x: number; z: number }; visible: boolean } } | null };
const inner = game as unknown as GameInternals;

function view(): BotView {
  return { run: game.run, hp: game.player.hp, maxHp: game.stats.maxHp, rand: Math.random };
}

/** Responde à tela aberta, se houver. Devolve se respondeu a alguma (o passo seguinte espera a próxima). */
function answer(hero: string): boolean {
  const v = view();
  if (relicPending) {
    const r = relicPending;
    relicPending = null;
    r.pick(r.ids[pickRelic(v, hero, r.ids)]);
    return true;
  }
  if (game.levelUp) {
    game.chooseUpgrade(pickUpgrade(v, hero, game.levelUp.ids, game.levelUp.tiers));
    return true;
  }
  if (game.evolutionOffer) {
    game.chooseEvolution(0);
    return true;
  }
  if (game.relicEvoOffer) {
    game.chooseRelicEvolution(0);
    return true;
  }
  if (game.eventOffer) {
    const ids = game.eventOffer.ids;
    const idx = game.eventOffer.index;
    if (game.chooseEvent(ids[pickEvent(v, hero, ids)]) !== null) decline(idx);
    return true;
  }
  if (game.pactOffer) {
    const idx = game.pactOffer.index;
    if (!game.acceptPact()) decline(idx);
    return true;
  }
  if (game.shopVisit) {
    shop(hero);
    return true;
  }
  if (game.phase === "walk" && game.mapCards && !inner.mapResolved) {
    if (declined.wave !== game.run.wave) declined = { wave: game.run.wave, cards: new Set() };
    const open = game.mapCards.map((c, i) => ({ c, i })).filter((x) => !declined.cards.has(x.i));
    // tudo recusado: anda até a clareira, que fica com o portão mais perto
    if (!open.length) return false;
    inner.warpPending = true;
    game.chooseMapCard(open[pickMap(v, open.map((x) => x.c))].i);
    return true;
  }
  return false;
}

function decline(index: number): void {
  game.declineMapOffer();
  inner.warpPending = false;
  if (declined.wave !== game.run.wave) declined = { wave: game.run.wave, cards: new Set() };
  declined.cards.add(index);
}

/** `shop` de lá: compra na ordem de valor, troca enquanto sobra a reserva, compra de novo e sai. */
function shop(hero: string): void {
  const visit = game.shopVisit!;
  const buyAll = () => {
    for (const i of shopOrder(view(), hero, visit.offers)) game.buyShop(i);
  };
  buyAll();
  for (let n = 0; shouldReroll(game.run.gold, rerollCost(visit, game.run.freeRerolls ?? 0), n); n++) {
    if (game.rerollShop() !== null) break;
    buyAll();
  }
  game.closeShop();
}

let prevDir = -1;
const DODGE_DIST = TUNING.hero.dashSpeed * TUNING.hero.dashTime;

/**
 * Pilotagem (M17-01 parte 3, `steer` e `useTechnique` de `balance_sim.lua`): na luta, a direção de menos perigo
 * entre 16 e o parado, a técnica em grupo, no chefe ou para fugir, a esquiva quando o lugar vai explodir, e as
 * spells assim que recarregam, todas no alvo (o chefe, senão o mais perto). Fora da luta vai ao destino.
 */
function pilot(): void {
  const p = game.player;
  const inp = game.input;
  if (game.phase === "intro" || game.phase === "fight") {
    const w = game.botView();
    const target = pickTarget(w);
    if (!target) {
      prevDir = -1;
      game.aimOverride = null;
      inp.lmb = false;
      inp.simAxis = { x: game.segment.x - p.x, z: game.segment.z - p.z };
      return;
    }
    prevDir = steer(w, prevDir);
    const dir = DIRS[prevDir];
    inp.simAxis = { x: dir.x, z: dir.z };
    inp.lmb = true;
    game.aimOverride = { x: target.x, z: target.z };
    // esquiva antes da técnica: quem está para ser atingido foge primeiro
    if (p.dashCd <= 0 && p.dashT <= 0) {
      const d = dodgeDir(w, DODGE_DIST);
      if (d !== null) {
        inp.simAxis = { x: DIRS[d].x, z: DIRS[d].z };
        inp.simTap("Space");
        return;
      }
    }
    if (p.techCd <= 0 && game.tech) {
      const aim = techniqueAim(w, HEROES[game.run.heroId].technique.kind as TechKindBot, game.tech);
      if (aim) {
        game.aimOverride = aim;
        inp.simTap("KeyQ");
        return;
      }
    }
    for (let i = 0; i < game.spells.cooldown.length; i++) if (game.spells.cooldown[i] <= 0) inp.simTap(i === 0 ? "Digit1" : "Digit2");
    return;
  }
  prevDir = -1;
  inp.lmb = false;
  game.aimOverride = null;
  // portal da zona: chegar e apertar E
  const portal = inner.world?.portal;
  if (game.phase === "portal" && portal?.visible) {
    inp.simAxis = { x: portal.position.x - p.x, z: portal.position.z - p.z };
    if (Math.hypot(portal.position.x - p.x, portal.position.z - p.z) < 2) inp.simTap("KeyE");
    return;
  }
  // caminhada: com a carta resolvida, E leva até a clareira (a viagem do portão, como o jogador faz); andar em
  // linha reta até lá encalha nas pedras. Os desvios do caminho ficam de fora.
  if (game.phase === "walk") {
    inp.simAxis = { x: game.segment.x - p.x, z: game.segment.z - p.z };
    if (inner.mapResolved && game.nearDetour < 0) inp.simTap("KeyE");
  }
  else inp.simAxis = { x: 0, z: 0 };
}

/** Conta os usos pelo salto da recarga (de pronta a carregando) em volta de um passo. */
function countUses(uses: BotUses, before: { tech: number; dash: number; spells: number[] }): void {
  const p = game.player;
  if (before.tech <= 0 && p.techCd > 0) uses.technique++;
  if (before.dash <= 0 && p.dashCd > 0) uses.dodge++;
  game.spells.cooldown.forEach((cd, i) => {
    if ((before.spells[i] ?? 1) <= 0 && cd > 0) uses.spells[i] = (uses.spells[i] ?? 0) + 1;
  });
}

const yieldToBrowser = () => new Promise<void>((r) => setTimeout(r, 0));

let used = false;

/** Joga uma partida inteira e grava a linha do registro, marcada como do bot. Uma por página: só a página nova
 * repete a partida da mesma seed (o jogo guarda estado entre partidas), então recarregar entre uma e outra. */
async function run(o: SimOptions): Promise<SimResult> {
  if (used) throw new Error("one run per page: reload /sim.html before the next run");
  used = true;
  const t0 = performance.now();
  seedRandom(o.seed * 2654435761);
  relicPending = null;
  died = won = false;
  const setup = { heroId: o.hero, difficultyId: o.difficulty as DifficultyId, startingSpell: botStartSpell(o.hero) };
  const r = newRun({ ...setup, seed: o.seed, randomSeed: o.seed, startedAt: new Date().toISOString() });
  game.start(r, new RunRng(r.seed));
  const maxTime = o.maxTime ?? BOT_RUN.maxTime;
  let outcome: RunOutcome | null = null;
  let lastKey = "", lastChange = 0;
  const uses: BotUses = { technique: 0, dodge: 0, spells: [] };
  while (!outcome) {
    for (let s = 0; s < BOT_RUN.stepsPerSlice && !outcome; s++) {
      while (answer(o.hero)) { /* uma tela pode abrir outra */ }
      pilot();
      const before = { tech: game.player.techCd, dash: game.player.dashCd, spells: [...game.spells.cooldown] };
      game.simStep(BOT_RUN.dt);
      countUses(uses, before);
      const t = game.run.statistics.elapsed;
      const key = `${game.run.wave}/${game.phase}`;
      if (key !== lastKey) {
        lastKey = key;
        lastChange = t;
      }
      if (died || !game.playerAlive) outcome = "death";
      else if (won || game.run.victory) outcome = "victory";
      else if (t > maxTime) outcome = "timeout";
      else if (t - lastChange > BOT_RUN.stuckTime) outcome = "stuck";
    }
    out.textContent = `${o.hero} · ${o.difficulty} · seed ${o.seed} · wave ${game.run.wave} · ${game.phase} · ${Math.round(game.run.statistics.elapsed)} s`;
    await yieldToBrowser();
  }
  const res: SimResult = {
    hero: o.hero, difficulty: o.difficulty, seed: o.seed, outcome, wave: game.run.wave, level: game.run.level,
    victory: game.run.victory, killedBy: game.run.killedBy ?? null, time: Math.round(game.run.statistics.elapsed),
    wall: Math.round((performance.now() - t0) / 100) / 10, uses,
  };
  game.botMeta = { batch: o.batch, seed: o.seed, outcome, stuckAt: outcome === "stuck" ? lastKey : undefined, wall: res.wall, uses };
  game.logRunEnd(outcome);
  game.botMeta = null;
  out.textContent = JSON.stringify(res);
  return res;
}

Object.assign(window, { __sim: { run }, __game: game });
