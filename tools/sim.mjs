// M17-01 parte 4: `npm run sim -- <partidas> <dificuldade> [herói|all] [seed]`
// Sobe o servidor do Vite (o mesmo do `npm run dev`, com o registro de partidas), abre o Chromium sem tela
// (Playwright) e joga `partidas` por herói em várias páginas ao mesmo tempo, uma partida por página (`/sim.html`).
// Cada partida vira uma linha `bot` em `logs/runs.jsonl`; no fim, o relatório do lote troca a seção da
// dificuldade em `docs/balance.md`. Paralelo: SIM_JOBS (padrão: metade dos núcleos, até 6).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { execSync } from "node:child_process";
import { createServer } from "vite";
import { chromium } from "playwright";

const [runsArg, diffArg, heroArg, seedArg] = process.argv.slice(2);
const N = Number(runsArg) || 5;
const DIFF = diffArg || "normal";
const SEED0 = Number(seedArg) || 1;
const JOBS = Math.max(1, Number(process.env.SIM_JOBS) || Math.min(6, Math.floor(cpus().length / 2)));
/** tempo real máximo de uma página antes de desistir dela, ms (o jogo já para sozinho em `BOT_RUN.maxTime`) */
const PAGE_TIMEOUT = Number(process.env.SIM_PAGE_TIMEOUT) || 10 * 60 * 1000;

const server = await createServer({ server: { port: 5190, strictPort: false }, logLevel: "error", clearScreen: false });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, "");
const { HERO_ORDER } = await server.ssrLoadModule("/src/data/heroes.ts");
const { DIFFICULTY_ORDER } = await server.ssrLoadModule("/src/data/run.ts");
const { balanceSection, mergeBalanceDoc } = await server.ssrLoadModule("/src/core/balance.ts");

const heroes = !heroArg || heroArg === "all" ? [...HERO_ORDER] : [heroArg];
for (const h of heroes) if (!HERO_ORDER.includes(h)) fail(`unknown hero "${h}" (${HERO_ORDER.join(", ")})`);
if (!DIFFICULTY_ORDER.includes(DIFF) && !/^depths\d+$/.test(DIFF)) fail(`unknown difficulty "${DIFF}" (${DIFFICULTY_ORDER.join(", ")}, depthsN)`);

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const batch = `sim-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${DIFF}`;
const jobs = heroes.flatMap((hero) => Array.from({ length: N }, (_, i) => ({ hero, seed: SEED0 + i })));
const failures = [];
const t0 = Date.now();
let done = 0;

const browser = await chromium.launch();

async function play(job) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(`${base}/sim.html`);
    await page.waitForFunction(() => !!window.__sim, null, { timeout: 60000 });
    const r = await Promise.race([
      page.evaluate((o) => window.__sim.run(o), { hero: job.hero, difficulty: DIFF, seed: job.seed, batch }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("page timeout")), PAGE_TIMEOUT)),
    ]);
    // a linha do registro sai por fetch; dar um instante para ela chegar ao servidor
    await page.waitForTimeout(300);
    return `${r.outcome} w${r.wave} ${r.time}s${r.killedBy ? ` (${r.killedBy})` : ""} [${r.wall}s]`;
  } catch (e) {
    const reason = `${e.message.split("\n")[0]}${errors.length ? `; page error: ${errors[0]}` : ""}`;
    failures.push({ hero: job.hero, seed: job.seed, reason });
    return `FAILED: ${reason}`;
  } finally {
    await page.close().catch(() => {});
  }
}

console.log(`sim: ${jobs.length} runs (${heroes.length} heroes x ${N}), ${DIFF}, seeds ${SEED0}-${SEED0 + N - 1}, ${JOBS} pages in parallel, batch ${batch}`);
const queue = [...jobs];
await Promise.all(Array.from({ length: Math.min(JOBS, jobs.length) }, async () => {
  for (let job = queue.shift(); job; job = queue.shift()) {
    const line = await play(job);
    done++;
    console.log(`[${done}/${jobs.length}] ${job.hero} seed ${job.seed}: ${line}`);
  }
}));
await browser.close();
await server.close();

const entries = existsSync("logs/runs.jsonl")
  ? readFileSync("logs/runs.jsonl", "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
  : [];
let build = "?";
try { build = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { /* sem git */ }
const section = balanceSection(entries, {
  difficulty: DIFF, batch, date: new Date().toISOString().slice(0, 10), build, failures, heroes,
  command: `npm run sim -- ${process.argv.slice(2).join(" ")}`.trim(),
});
const doc = existsSync("docs/balance.md") ? readFileSync("docs/balance.md", "utf8") : "";
writeFileSync("docs/balance.md", mergeBalanceDoc(doc, DIFF, section));
console.log(`\n${section}\nwritten to docs/balance.md (${Math.round((Date.now() - t0) / 1000)} s)`);
