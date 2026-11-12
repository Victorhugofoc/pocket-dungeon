import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// SINGLE=1 gera um único index.html (para compartilhar o protótipo como um arquivo só).
export default defineConfig({
  base: "./",
  plugins: process.env.SINGLE ? [viteSingleFile()] : [],
  build: { outDir: process.env.SINGLE ? "dist-single" : "dist", chunkSizeWarningLimit: 2000 },
});
