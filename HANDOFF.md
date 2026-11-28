# Dungeon Reign RPG — handoff

Leia antes de qualquer coisa. Só o estado atual. Histórico: `docs/progress.md` (uma linha por tarefa), `docs/handoff-archive.md` (parágrafos antigos daqui, com o teste rápido de cada tarefa) e o git; nos dois, só `grep`. **Mantenha este arquivo curto (alvo: até 10 KB):** ao fechar uma tarefa, troque o "Agora" e mande o que sair para o fim do `docs/handoff-archive.md`.

## Agora (2026-11-28)
- **`M2-11` em andamento (os 9 heróis no Blender), prioridade do usuário desde 2026-11-25.** Combinado (A a D): `grep -n "Combinado em 2026-11-25" docs/roadmap.md`. Feitos e aprovados: **Frostine**, **Aurelius**, **Vesper**, **Seraph**, **Kaelen** e **Zephyr** (2026-11-28; `docs/briefs/<id>.md`). Próximo: **Umbra** (ler o sprite e propor a base antes de modelar; o usuário aceita sair do design original, mas confirma antes de cada mudança). Até 3 rodadas do crítico por herói; **depois de cada rodada, mostrar capturas e lista ao usuário e esperar ele mandar seguir**. Acabamento: até 8 mil triângulos, 35% na cabeça; ler o `check_finish`; poses `face-close` e `detail` (roadmap 4.2); peça fechada (borda, aro) por `loop_tube`, nunca tubo aberto com o 1º ponto repetido; superfície lisa e curva (rosto, cabelo) por `remesh`, não por `smooth(target=)`, e mecha de cabelo dentro da metaball, não tubo solto. Depois: Ignis; Varok.
- **`M14-09` (pente-fino de UI/UX) parada na etapa 5 de 8** (feitas: base, tela de herói, cartas, HUD, loja; falta o usuário ver). Quando voltar: etapa 6, tela I agrupada; plano em `grep -n "Plano (combinado em 2026-11-25)" docs/roadmap.md`. **`M13-05` é a última do roadmap.**
- **Falta o usuário jogar quase toda a fase 1:** foi conferida pelo console. Lista: `grep -n "falta jogar\|falta o usuário" docs/progress.md`. A `M21-04` (ele joga a fatia) fica para quando ele quiser.
- **Registro de partidas:** cada partida no `npm run dev` vira uma linha em `logs/runs.jsonl` (`core/runlog.ts`), com `waves` e `perf` (fps, picos com causa). Para saber como foram as runs dele ou validar o `M16-01`, ler esse arquivo. Partida com `devUsed` não vale para balanceamento; linha com `bot` é do simulador (`M17-01`), não do usuário.
- **Pedidos anotados sem lugar na ordem:** `M14-09` (pente-fino de UI/UX), `M13-07` (efeito Founder). A `M14-08` (seleção de herói) espera ele ver e jogar.

## Atalhos de teste (console do jogo)
- Teste rápido de cada tarefa: `grep -n "<id>" docs/handoff-archive.md`. Depths: `__game.ach.state.medals.frostine = 3; __game.ach.state.depths.frostine = {best:2, wins:{}, marks:40, owned:{}, enabled:{}}; __ui.selectedHero = "frostine"; __ui.selectedDifficulty = "depths2"; __ui.showTitle()`.
- Relógio pelo console: começar em `Math.max(__game.lastFrame, performance.now())`, conferir `__game.paused` (a tela de nível pausa) e dar poucos quadros por `__game.frame(t)` (cada chamada agenda outro laço).
- **F1 (DEV Grimoire)** marca a partida [DEV] (`TUNING.devTools`, desligar ao publicar). `TUNING.unlockAll` deixa os 9 heróis abertos (desligar ao balancear).
- Registro de partidas: `JSON.parse(localStorage['dungeon-reign-rpg.runlog.v1'])`; `__game.logRunEnd('quit')` grava a partida atual.
- `__game.prepareWave(n)` pula para a onda n · `__game.gainXp(200)` e terminar a onda abre as melhorias.
- `__game.run.room = "boss_ambush"; __game.prepareWave(7)` testa uma sala; `__game.hazards.snapshot()` mostra raios e poças.
- Conquistas: `__game.ach.state` (liberadas, contadores, medalhas); `TUNING.unlockAll = false` em `data/tuning.ts` mostra os trancados.
- **F1 abre o DEV Grimoire** (spells, níveis, relíquias, curar, terminar onda, ir ao chefe). Spells pelo console (mira, evolução, 2º espaço): `grep -n "Spells pelo console (atalhos)" docs/handoff-archive.md`.
- Morte: `__game.player.iframes = 0; __game.hurtPlayer(99999, "Goblin")`.
- Painel do navegador oculto, partida nova pelo console, capturas e loja: `grep -n "Painel oculto (atalhos)" docs/handoff-archive.md`.

## Decisões do usuário (não reabrir sem ele pedir)
- **Regra geral: o jogo inteiro vem do Dungeon Reign, só a engine muda.** Paridade presa ao commit `e2e8faf` do original (`docs/paridade.md` + `tests/parity.test.ts`); balanceamento de lá depois disso não entra.
- D14: poder de magia, recarga global e efeitos por escola como no original. D15: spell na tecla sai sempre e gasta a recarga. D6: chefes pelo saco de chefes, bioma em ordem fixa. D7: as 94 relíquias. D17: fase 1 jogabilidade, fase 2 VFX, SFX e arte.
- Feedback visual de tudo: estado novo com duração põe `until` no `StatusBadge`; spell nova põe o estado em `enemyStatuses`. Ataque básico < técnica < spell em escala visual; o tiro sai do corpo.
- PC, teclado e mouse. Partidas como no Dungeon Reign (D13), sem equipamento por enquanto (pode voltar se encaixar com as relíquias).
- **Personagens modelados no Blender por script** (D16, 2026-11-18): `tools/blender/<id>.py` gera `art/<id>.blend` e `src/game/chars/models/<id>.json` (malha por osso, lida por `chars/baked.ts`); a receita em `cast-*.ts` fica só com esqueleto e postura. Ver `tools/blender/README.md`. O resto da arte é por código. Sem sprites nem modelos prontos de fora; modelos por IA (Meshy, Hunyuan3D) foram descartados. O sprite do Dungeon Reign é a fonte do design; método na seção 4 do roadmap.
- **Ícones da interface do original** (D19, 2026-11-24, ampliada na `M14-10`): exceção à arte por código para todos os ícones 2D da interface (`src/ui/icons.ts`). O mundo 3D continua por código.
- **Tudo do jogo em inglês** (D1, decidido em 2026-11-16): nomes, ids, código e também os textos que o jogador lê (interface, mecânicas como Echo e Volatile, textos flutuantes, descrições), com a palavra do Dungeon Reign (`en.lua`) quando existir. Português só como tradução no `M14-01`. Documentos e conversa seguem em português.
- Esquiva fica; **a poção saiu** pela D18 (cura no risco, feita na `M21-03`; antes Q3). Onda cronometrada como no original (Q2).
- **D18 (2026-11-20):** paridade de conteúdo, não de regra de combate; o loop (M21) vem antes da arte e da paridade.
- Crítico cego (`docs/critic.md`) antes de mostrar arte ao usuário.
- Ele faz push, PR e merge; eu só faço commit local no branch de trabalho.
- Sessões curtas, uma tarefa por sessão, para gastar menos tokens.

## Mapa do código
| Onde | O quê |
|---|---|
| `src/core/` | Lógica pura e testada: `rng`, `stats`, `run` (partida, checkpoint, registros), `achievements` (conquistas e desbloqueios), `wave`, `waves`, `runmap`, `levelup`, `techniques`, `frost`, `worldgen`, `save` |
| `src/data/` | Conteúdo e balanceamento: `achievements`, `heroes`, `enemies`, `zones`, `relics`, `run`, `rooms`, `upgrades`, `spells`, `techniques`, `tuning` |
| `src/game/game.ts` | Loop, herói, combate, ondas (`prepareWave`, `updateWave`), técnicas |
| `src/game/enemy.ts` | IA dos inimigos e padrões dos chefes |
| `src/game/chars/` | Personagens: `kit.ts` (primitivas e escultura), `cast-*.ts` (receitas), `build.ts`, `animate.ts` |
| `src/game/` (resto) | `spells.ts` (conjuração das spells), `perf.ts` (registro de quadros, F3), `lamps.ts` (luzes fixas dos personagens), `world.ts`, `flora.ts`, `scatter.ts`, `air.ts`, `fx.ts`, `icewall.ts`, `rift.ts`, `render.ts`, `shared.ts` |
| `src/ui/ui.ts` | Interface em DOM: título e início, HUD, status (I), melhorias, mapa, relíquias, pausa, resultado |

## Como rodar e conferir
- `npm install` · `npm run dev` (5173; o `launch.json` tem `dev-5174` para uma segunda sessão) · `npm test` · `npx tsc --noEmit`.
- `SINGLE=1 npx vite build` gera `dist-single/index.html`. Versão publicada para o usuário: artifact `https://claude.ai/artifact/TtNw79t7ckCEh5csU4T8cc` (republicar com essa URL; o arquivo é o `dist-single/index.html` sem as tags `html/head/body`).
- Prévia de personagens: `/preview.html?view=close|game&anim=idle|walk|attack&yaw=<graus>&a=<id>` (`src/preview.ts`). Captura sem tela: `await __preview.shot("nome", {...})` grava `.shots/nome.png`; `__preview.criticShots("critic-<id>")` para o crítico.
- Prévia de zona: `/zone.html?zone=bosque|cripta|vulcao|vazio` (`src/zone-preview.ts`), `__zone.criticShots`.
- Prévia de efeitos: `/fx.html?zone=...&focus=<peça>` (`src/fx-preview.ts`), `__fx.criticShots()` grava `.shots/critic-fx-*`.
- Sem GPU: Playwright + Chromium com `--use-angle=swiftshader`; renderiza certo, mas lento.
- Repo do Dungeon Reign local (só leitura): `C:\Users\victo\Documents\GitHub\dungeon-idle`. `npm run refs` regrava os sprites de referência em `docs/ref/`.

## Não validado
- Movimento e sensação jogando; desempenho numa GPU real (placa do usuário: Radeon RX 9060 XT; `M16-01`, F3 mostra o tempo de GPU).
- Balanceamento: nunca jogado de ponta a ponta.
- Arte: os 4 chefes e os 9 heróis foram refeitos e aprovados (os heróis ainda em primitivas de código, menos Frostine, Aurelius, Vesper, Seraph, Kaelen e Zephyr, já no Blender: `M2-11`; ataque básico sem visual próprio por herói e carregado demais: `M5-09`); inimigos comuns: goblin e orc refeitos (`M3-01`, aprovados); o resto (morcego e gosma são os mais fracos) espera o `M3-02` em diante. Pendências do crítico nas linhas `M18-07` a `M18-10`.

## Pendências com o usuário
- Decisões abertas da seção 8 do roadmap (D1 idioma dos textos, e as outras sem resposta).
- Jogar com F3 aberto e dizer se ainda há picos (`M16-01`).
- Nome definitivo do jogo, se o repo `pocket-dungeon` continua sendo a casa dele, e onde hospedar a versão jogável.
