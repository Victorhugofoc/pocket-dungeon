# Dungeon Reign RPG — instruções para o Claude

Leia `HANDOFF.md` antes de qualquer coisa: ele tem o estado atual e o próximo passo.

## Projeto
- RPG de ação para PC (teclado e mouse), no navegador: um herói, mapas abertos procedurais, loot, relíquias e chefes por zona até o chefe final. Referência de formato: Minecraft Dungeons.
- three.js + TypeScript + Vite. Sem assets: modelos, cenário, efeitos e sons são gerados por código.
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
- Geração procedural só via `core/rng.ts` (seed + stream por rótulo). `Math.random()` só para efeito visual e variação de combate.

## Fluxo
- Cada marco: implementar → testes verdes → conferir no navegador → atualizar `HANDOFF.md` → commit.
- Decisões que mudam o `docs/design.md` são confirmadas com o usuário antes.
