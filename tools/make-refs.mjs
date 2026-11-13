// Gera as referências de design em docs/ref a partir dos sprites do Dungeon Reign (repo dungeon-idle, só leitura).
// Uso: node tools/make-refs.mjs [caminho do dungeon-idle]   (padrão: $DUNGEON_IDLE ou ../GitHub/dungeon-idle)
// Saída: docs/ref/<id>.png (quadro 0 da folha, ampliado 3×) e as folhas de contato _heroes.png, _enemies.png, _bosses.png
// (quadro 0 de cada um, 2×, em ordem alfabética de id, da esquerda para a direita e de cima para baixo).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(process.argv[2] ?? process.env.DUNGEON_IDLE ?? join(root, "..", "GitHub", "dungeon-idle"));
const out = join(root, "docs", "ref");
if (!existsSync(join(src, "assets"))) {
  console.error(`dungeon-idle não encontrado em ${src}. Passe o caminho como argumento ou em DUNGEON_IDLE.`);
  process.exit(1);
}

const HEROES = ["aurelius", "frostine", "ignis", "kaelen", "seraph", "umbra", "varok", "vesper", "zephyr"];
const ENEMIES = {
  archer: "ranged", assassin: "basic", berserker: "elite", bombardier: "ranged", goblin: "basic", hexer: "ranged", leaper: "special",
  orc: "basic", plaguebearer: "special", shieldbearer: "elite", spellcaster: "ranged", splitter: "special", summoner: "special",
  swarm: "basic", warden: "elite",
};
const BOSSES = [
  "bloodfang", "deathstalker", "dune_leviathan", "ember_matriarch", "gorged_ooze", "gravekeeper", "hollow_king", "iron_colossus",
  "mirage_djinn", "rimefang_wyrm", "storm_tyrant", "venom_hydra", "void_reaver",
];

/** grupos: ids, tamanho do quadro e caminho da folha */
const GROUPS = [
  { name: "_heroes", fw: 96, fh: 96, cols: 5, items: HEROES.map((id) => [id, `assets/characters/${id}/${id}_sheet.png`]) },
  { name: "_enemies", fw: 96, fh: 96, cols: 5, items: Object.entries(ENEMIES).map(([id, dir]) => [id, `assets/enemies/${dir}/${id}_sheet.png`]) },
  { name: "_bosses", fw: 192, fh: 160, cols: 5, items: BOSSES.map((id) => [id, `assets/enemies/bosses/${id}_sheet.png`]) },
];

/** copia o quadro 0 de `sheet` para `dst` em (dx, dy), ampliado `k` vezes sem suavizar */
function blit(sheet, fw, fh, dst, dx, dy, k) {
  for (let y = 0; y < fh * k; y++) {
    for (let x = 0; x < fw * k; x++) {
      const s = (Math.floor(y / k) * sheet.width + Math.floor(x / k)) * 4;
      const d = ((dy + y) * dst.width + dx + x) * 4;
      sheet.data.copy(dst.data, d, s, s + 4);
    }
  }
}

mkdirSync(out, { recursive: true });
let count = 0;
for (const g of GROUPS) {
  const rows = Math.ceil(g.items.length / g.cols);
  const contact = new PNG({ width: g.cols * g.fw * 2, height: rows * g.fh * 2 });
  g.items.forEach(([id, path], i) => {
    const sheet = PNG.sync.read(readFileSync(join(src, path)));
    const one = new PNG({ width: g.fw * 3, height: g.fh * 3 });
    blit(sheet, g.fw, g.fh, one, 0, 0, 3);
    writeFileSync(join(out, `${id}.png`), PNG.sync.write(one));
    blit(sheet, g.fw, g.fh, contact, (i % g.cols) * g.fw * 2, Math.floor(i / g.cols) * g.fh * 2, 2);
    count++;
  });
  writeFileSync(join(out, `${g.name}.png`), PNG.sync.write(contact));
}
console.log(`${count} referências e ${GROUPS.length} folhas de contato em docs/ref`);
