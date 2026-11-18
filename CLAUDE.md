# Dungeon Reign RPG — instruções para o Claude

Leia `HANDOFF.md` antes de qualquer coisa: ele tem o estado atual e o próximo passo. O plano de trabalho, tarefa por tarefa, está em `docs/roadmap.md`; siga a rotina da seção 0.1 dele e atualize o registro de progresso (seção 9) a cada sessão.

**Economia de tokens:** não ler `docs/roadmap.md` nem `docs/paridade.md` inteiros; usar `grep` pelo id da tarefa e ler só o trecho. Conferir lógica e interface pelo console do navegador; captura de tela só para mudança visual.

## Projeto
- RPG de ação para PC (teclado e mouse), no navegador: um herói, mapas abertos procedurais, loot, relíquias e chefes por zona até o chefe final. Referência de formato: Minecraft Dungeons.
- three.js + TypeScript + Vite. **Toda a arte é gerada por código** (decisão do usuário): cenário, shaders, efeitos e sons. Nada de sprites nem modelos prontos de fora. **Personagens: modelados no Blender por script Python** (D16, 2026-11-18; `tools/blender/README.md`), sem abrir a janela: `blender.exe -b --factory-startup --python tools/blender/<id>.py -- review`, com o Blender 5.2 em `C:/Program Files/Blender Foundation/Blender 5.2/`. O MCP do Blender só responde com o Blender aberto e o servidor do add-on ligado; o modo em segundo plano não precisa dele. Os sprites do Dungeon Reign servem só de referência de design (`dungeon-idle/assets`).
- O conteúdo (9 heróis, inimigos, chefes, relíquias) vem do Dungeon Reign, repo `Victorhugofoc/dungeon-idle` (LÖVE/Lua), em `src/data/*.lua`.
- Design: `docs/design.md`. O usuário escreve em português; documentos em português. Nomes, ids e código em inglês, iguais aos do Dungeon Reign. **Todo texto do jogo é em inglês** (decisão D1, 2026-11-16): interface, mecânicas, textos flutuantes, descrições; usar a palavra do Dungeon Reign (`src/data/lang/en.lua`) quando existir. Português só entra depois, como tradução (`M14-01`). Texto novo em português no jogo é erro.
- O sprite do Dungeon Reign é a fonte do design de cada personagem (cópias em `docs/ref/`). Método de modelagem: seção 4 do roadmap.

## Comandos
- `npm install` · `npm run dev` (abre em http://localhost:5173) · `npm test` · `npm run build`.
- `SINGLE=1 npx vite build` gera `dist-single/index.html`, o jogo inteiro em um arquivo.
- `npm run refs` regrava os sprites de referência em `docs/ref` a partir do repo `dungeon-idle` (caminho em `DUNGEON_IDLE` ou `../GitHub/dungeon-idle`).
- Rodar `npm test` e `npx tsc --noEmit` depois de qualquer mudança em `src/core/` ou `src/data/`.

## Regras de arquitetura
- `src/core/` é lógica pura (RNG, atributos, itens, geração de zona, save): sem three.js e sem DOM, testável no Node.
- `src/data/` guarda conteúdo e números de balanceamento. Nada de número mágico de balanceamento em `src/game/`.
- `src/game/` é o tempo real (three.js): loop, combate, IA, efeitos. `src/ui/` é a interface em DOM.
- Personagens do Blender: `tools/blender/<id>.py` (forma) → `src/game/chars/models/<id>.json` → `chars/baked.ts` (`modelParts`) → receita em `cast-*.ts` só com esqueleto e postura (pivôs iguais aos do script).
- Arte por código, onde mexer: `chars/` (personagens articulados: `kit.ts` com primitivas, `body()` e escultura; `cast-heroes.ts`, `cast-enemies.ts`, `cast-bosses.ts` com a receita de cada um; `build.ts` monta; animação em `animate.ts`), `flora.ts` (árvores, pedras, túmulos...), `world.ts` (chão com shader, grama, montagem da zona), `shared.ts` (uniforms de vento e do recorte que revela o herói), `render.ts` (bloom, cor, vinheta).
- Conferir arte sempre por captura de tela, com o sprite ao lado: `npm run dev` e abrir `/preview.html` (`src/preview.ts`; fora do build do jogo). Com o navegador oculto, `__preview.shot(nome, opções)` no console da prévia grava `.shots/<nome>.png`. Sem GPU, usar Playwright + Chromium com `--use-angle=swiftshader`: renderiza certo, mas lento; não serve para medir desempenho.
- Geração procedural só via `core/rng.ts` (seed + stream por rótulo). `Math.random()` só para efeito visual e variação de combate.

## Fluxo
- Cada marco: implementar → testes verdes → conferir no navegador → atualizar `HANDOFF.md` → commit.
- Decisões que mudam o `docs/design.md` são confirmadas com o usuário antes.
