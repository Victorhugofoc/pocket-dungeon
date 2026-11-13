# Dungeon Reign RPG — instruções para o Claude

Leia `HANDOFF.md` antes de qualquer coisa: ele tem o estado atual e o próximo passo. O plano de trabalho, tarefa por tarefa, está em `docs/roadmap.md`; siga a rotina da seção 0.1 dele e atualize o registro de progresso (seção 9) a cada sessão.

## Projeto
- RPG de ação para PC (teclado e mouse), no navegador: um herói, mapas abertos procedurais, loot, relíquias e chefes por zona até o chefe final. Referência de formato: Minecraft Dungeons.
- three.js + TypeScript + Vite. **Toda a arte é gerada por código** (decisão do usuário): personagens, cenário, shaders, efeitos e sons. Nada de sprites nem modelos importados. Os sprites do Dungeon Reign servem só de referência de design (`dungeon-idle/assets`).
- O conteúdo (9 heróis, inimigos, chefes, relíquias) vem do Dungeon Reign, repo `Victorhugofoc/dungeon-idle` (LÖVE/Lua), em `src/data/*.lua`.
- Design: `docs/design.md`. O usuário escreve em português; documentos em português. Nomes, ids e código em inglês, iguais aos do Dungeon Reign. Textos do jogo em português até a decisão D1 do roadmap.
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
- Arte por código, onde mexer: `chars/` (personagens articulados: `kit.ts` com primitivas, `body()` e escultura; `cast-heroes.ts`, `cast-enemies.ts`, `cast-bosses.ts` com a receita de cada um; `build.ts` monta; animação em `animate.ts`), `flora.ts` (árvores, pedras, túmulos...), `world.ts` (chão com shader, grama, montagem da zona), `shared.ts` (uniforms de vento e do recorte que revela o herói), `render.ts` (bloom, cor, vinheta).
- Conferir arte sempre por captura de tela, com o sprite ao lado: `npm run dev` e abrir `/preview.html` (`src/preview.ts`; fora do build do jogo). Sem GPU, usar Playwright + Chromium com `--use-angle=swiftshader`: renderiza certo, mas lento; não serve para medir desempenho.
- Geração procedural só via `core/rng.ts` (seed + stream por rótulo). `Math.random()` só para efeito visual e variação de combate.

## Fluxo
- Cada marco: implementar → testes verdes → conferir no navegador → atualizar `HANDOFF.md` → commit.
- Decisões que mudam o `docs/design.md` são confirmadas com o usuário antes.
