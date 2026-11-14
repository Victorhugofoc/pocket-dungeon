import { mkdirSync, writeFileSync } from "node:fs";
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

// SINGLE=1 gera um único index.html (para compartilhar o protótipo como um arquivo só).
export default defineConfig({
  base: "./",
  plugins: process.env.SINGLE ? [viteSingleFile()] : [shots()],
  build: { outDir: process.env.SINGLE ? "dist-single" : "dist", chunkSizeWarningLimit: 2000 },
});
