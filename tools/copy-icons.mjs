// Copia os ícones de relíquia do Dungeon Reign (D19, 2026-11-24: ícones 2D da interface vêm do original; o mundo 3D
// continua todo por código). Lê do commit base da paridade (e2e8faf) para não pegar mudanças posteriores.
// Uso: npm run icons [caminho do dungeon-idle]   (padrão: $DUNGEON_IDLE ou ../GitHub/dungeon-idle)
// Saída: src/assets/relics/<id>.png (32 px, como lá).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_REF = process.env.DUNGEON_BASE ?? "e2e8fafc312a380d3567d090adcb5b576c655773";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(process.argv[2] ?? process.env.DUNGEON_IDLE ?? join(root, "..", "GitHub", "dungeon-idle"));
if (!existsSync(join(repo, "assets"))) {
  console.error(`dungeon-idle não encontrado em ${repo}. Passe o caminho como argumento ou em DUNGEON_IDLE.`);
  process.exit(1);
}
const tmp = mkdtempSync(join(tmpdir(), "dr-icons-"));
const tar = spawnSync("git", ["-C", repo, "archive", "--format=tar", BASE_REF, "assets/relics/icons"], { maxBuffer: 64 << 20 });
if (tar.status !== 0) throw new Error(tar.stderr.toString());
const x = spawnSync("tar", ["-x", "-f", "-"], { cwd: tmp, input: tar.stdout });
if (x.status !== 0) throw new Error(x.stderr.toString());
const from = join(tmp, "assets", "relics", "icons");
const out = join(root, "src", "assets", "relics");
mkdirSync(out, { recursive: true });
let n = 0;
for (const f of readdirSync(from)) {
  if (!f.endsWith(".png")) continue;
  copyFileSync(join(from, f), join(out, f));
  n++;
}
rmSync(tmp, { recursive: true, force: true });
console.log(`${n} ícones em ${out}`);
