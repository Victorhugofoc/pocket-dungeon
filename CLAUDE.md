# Dungeon Reign RPG — instruções para o Claude

Leia `HANDOFF.md` antes de qualquer coisa: ele tem o estado atual e o próximo passo.

## Projeto
- RPG de ação para PC (teclado e mouse), no navegador: um herói, mapas abertos procedurais, loot, relíquias e chefes por zona até o chefe final. Referência de formato: Minecraft Dungeons.
- three.js + TypeScript + Vite. **Toda a arte é gerada por código** (decisão do usuário): personagens, cenário, shaders, efeitos e sons. Nada de sprites nem modelos importados. Os sprites do Dungeon Reign servem só de referência de design (`dungeon-idle/assets`).
- O conteúdo (9 heróis, inimigos, chefes, relíquias) vem do Dungeon Reign, repo `Victorhugofoc/dungeon-idle` (LÖVE/Lua), em `src/data/*.lua`.
- Design: `docs/design.md`. O usuário escreve em português; documentos e textos do jogo em português.

## Comandos
- `npm install` · `npm run dev` (abre em http://localhost:5173) · `npm test` · `npm run build`.
- `SINGLE=1 npx vite build` gera `dist-single/index.html`, o jogo inteiro em um arquivo.
- Rodar `npm test` e `npx tsc --noEmit` depois de qualquer mudança em `src/core/` ou `src/data/`.

## Regras de arquitetura
- `src/core/` é lógica pura (RNG, atributos, itens, geração de zona, save): sem three.js e sem DOM, testável no Node.
- `src/data/` guarda conteúdo e números de balanceamento. Nada de número mágico de balanceamento em `src/game/`.
- `src/game/` é o tempo real (three.js): loop, combate, IA, efeitos. `src/ui/` é a interface em DOM.
- Arte por código, onde mexer: `chars.ts` (personagens articulados: `body()` + peças por personagem em `CAST`, animação em `animateChar`), `flora.ts` (árvores, pedras, túmulos...), `world.ts` (chão com shader, grama, montagem da zona), `shared.ts` (uniforms de vento e do recorte que revela o herói), `render.ts` (bloom, cor, vinheta).
- Conferir arte sempre por captura de tela (Playwright + Chromium com `--use-angle=swiftshader`): renderiza certo, mas lento; não serve para medir desempenho.
- Geração procedural só via `core/rng.ts` (seed + stream por rótulo). `Math.random()` só para efeito visual e variação de combate.

## Fluxo
- Cada marco: implementar → testes verdes → conferir no navegador → atualizar `HANDOFF.md` → commit.
- Decisões que mudam o `docs/design.md` são confirmadas com o usuário antes.
