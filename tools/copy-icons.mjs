// Copia os ícones 2D da interface do Dungeon Reign (D19, 2026-11-24, ampliada na M14-10: os ícones da interface vêm do
// original; o mundo 3D continua todo por código). Lê do commit base da paridade (e2e8faf) para não pegar mudanças
// posteriores. Uso: npm run icons [caminho do dungeon-idle]   (padrão: $DUNGEON_IDLE ou ../GitHub/dungeon-idle)
// Saída: src/assets/relics/<id>.png (relíquias), src/assets/ui/<nome>.png (spells, evoluções, técnicas, afixos, mapa,
// moeda...) e src/assets/upgrades/<id>.png (uma por melhoria de nível).
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
const SETS = [["assets/relics/icons", "relics"], ["assets/ui/icons", "ui"], ["assets/ui/upgrades", "upgrades"]];
const tar = spawnSync("git", ["-C", repo, "archive", "--format=tar", BASE_REF, ...SETS.map(([a]) => a)], { maxBuffer: 64 << 20 });
if (tar.status !== 0) throw new Error(tar.stderr.toString());
const x = spawnSync("tar", ["-x", "-f", "-"], { cwd: tmp, input: tar.stdout });
if (x.status !== 0) throw new Error(x.stderr.toString());
for (const [dir, name] of SETS) {
  const from = join(tmp, ...dir.split("/"));
  const out = join(root, "src", "assets", name);
  mkdirSync(out, { recursive: true });
  let n = 0;
  for (const f of readdirSync(from)) {
    if (!f.endsWith(".png")) continue;
    copyFileSync(join(from, f), join(out, f));
    n++;
  }
  console.log(`${n} ícones em ${out}`);
}
rmSync(tmp, { recursive: true, force: true });
