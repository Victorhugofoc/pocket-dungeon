import { execSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

/** Só no `npm run dev`: a prévia de personagens manda capturas (`__preview.shot(nome)`) e este endpoint grava em `.shots/<nome>.png`.
 * Serve para conferir arte quando o navegador não está visível e não dá para capturar a tela. */
const shots = (): Plugin => ({
  name: "preview-shots",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use("/__shot", (req, res) => {
      const name = (new URL(req.url ?? "", "http://x").searchParams.get("name") ?? "shot").replace(/[^\w-]/g, "_");
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        const data = Buffer.concat(chunks).toString().replace(/^data:image\/png;base64,/, "");
        mkdirSync(".shots", { recursive: true });
        writeFileSync(`.shots/${name}.png`, Buffer.from(data, "base64"));
        res.end("ok");
      });
    });
  },
});

/** Só no `npm run dev`: o registro de partidas (src/game/runlog.ts) manda cada partida encerrada,
 * e este endpoint acrescenta uma linha em `logs/runs.jsonl` (o Claude lê esse arquivo para acompanhar as runs). */
const runlog = (): Plugin => ({
  name: "run-log",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use("/__runlog", (req, res) => {
      if (req.method !== "POST") return void res.writeHead(405).end();
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        try {
          const line = JSON.stringify(JSON.parse(Buffer.concat(chunks).toString()));
          mkdirSync("logs", { recursive: true });
          appendFileSync("logs/runs.jsonl", line + "\n");
          res.end("ok");
        } catch {
          res.writeHead(400).end("bad json");
        }
      });
    });
  },
});

/** versão e commit gravados em cada partida do registro */
function buildId(): string {
  const v = (JSON.parse(readFileSync("package.json", "utf8")) as { version: string }).version;
  try {
    return `${v}+${execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim()}`;
  } catch {
    return v;
  }
}

// SINGLE=1 gera um único index.html (para compartilhar o protótipo como um arquivo só).
export default defineConfig({
  base: "./",
  define: { __BUILD__: JSON.stringify(buildId()) },
  plugins: process.env.SINGLE ? [viteSingleFile()] : [shots(), runlog()],
  build: { outDir: process.env.SINGLE ? "dist-single" : "dist", chunkSizeWarningLimit: 2000 },
});
