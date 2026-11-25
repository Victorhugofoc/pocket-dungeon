# Dungeon Reign RPG — handoff

Leia antes de qualquer coisa. Só o estado atual. Histórico: `docs/progress.md` (uma linha por tarefa), `docs/handoff-archive.md` (parágrafos antigos daqui, com o teste rápido de cada tarefa) e o git; nos dois, só `grep`. **Mantenha este arquivo curto (alvo: até 10 KB):** ao fechar uma tarefa, troque o "Agora" e mande o que sair para o fim do `docs/handoff-archive.md`.

## Agora (2026-11-25)
- **Agora: `M21-15`, partes a a c feitas (2026-11-25), falta a d** (uma arena por zona, altares no lugar dos portões, como o Infernal Hordes do Diablo 4). Feito: `worldgen` com a arena das ondas 1 a 4 (raio 22) e a do chefe (21), sem trilhas nem bifurcações; altares em leque do lado da arena do chefe, E escolhe e a onda começa ali (sem altares, E começa); desvios viram o 4º altar opcional (no máximo 1 por onda); cada onda com o seu fosso e barris (`Terrain.show`), gargalo fixo da arena; luz da arena pela carta (`ARENA_LIGHT` em `data/map-nodes.ts`); `docs/design.md` atualizado. **Parte d:** `SIM_ARENA=<raio> npm run sim -- 2 hard all` mede uma variante (seção própria em `docs/balance.md`, com inimigos fora da tela por zoom). Medido: 22 m, 78% de vitórias, 25% dos inimigos fora da tela no zoom 1 e 15% no 1,15. Falta: rodar 26 m **só com o sim do usuário** (regra dele: confirmar antes de toda rodada do bot), escolher o tamanho, decidir a oval (precisa de arena elíptica em todo o código; o bot não mede o zoom, porque vê tudo) e o usuário jogar. Antes de cada tarefa nova, listar as melhorias e esperar o usuário escolher (regra dele, 2026-11-24). **A `M13-05` (seed diária) é a última de todo o roadmap**, depois da fase 2 (usuário, 2026-11-25).
- **Falta o usuário jogar quase toda a fase 1:** foi conferida pelo console. Lista: `grep -n "falta jogar\|falta o usuário" docs/progress.md`. A `M21-04` (ele joga a fatia) fica para quando ele quiser.
- **Registro de partidas:** cada partida no `npm run dev` vira uma linha em `logs/runs.jsonl` (`core/runlog.ts`), com `waves` e `perf` (fps, picos com causa). Para saber como foram as runs dele ou validar o `M16-01`, ler esse arquivo. Partida com `devUsed` não vale para balanceamento; linha com `bot` é do simulador (`M17-01`), não do usuário.
- **Pedidos anotados sem lugar na ordem:** `M14-09` (pente-fino de UI/UX), `M13-07` (efeito Founder), `M16-08` (transição na troca de zona), ajustar o Kaelen pelo crítico. A `M14-08` (seleção de herói) espera ele ver e jogar.

## Atalhos de teste (console do jogo)
- Teste rápido de cada tarefa: `grep -n "<id>" docs/handoff-archive.md`. Depths: `__game.ach.state.medals.frostine = 3; __game.ach.state.depths.frostine = {best:2, wins:{}, marks:40, owned:{}, enabled:{}}; __ui.selectedHero = "frostine"; __ui.selectedDifficulty = "depths2"; __ui.showTitle()`.
- Relógio pelo console: começar em `Math.max(__game.lastFrame, performance.now())`, conferir `__game.paused` (a tela de nível pausa) e dar poucos quadros por `__game.frame(t)` (cada chamada agenda outro laço).
- **F1 (DEV Grimoire)** marca a partida [DEV] (`TUNING.devTools`, desligar ao publicar). `TUNING.unlockAll` deixa os 9 heróis abertos (desligar ao balancear).
- Registro de partidas: `JSON.parse(localStorage['dungeon-reign-rpg.runlog.v1'])`; `__game.logRunEnd('quit')` grava a partida atual.
- `__game.prepareWave(n)` pula para a onda n · `__game.gainXp(200)` e terminar a onda abre as melhorias.
- `__game.run.room = "boss_ambush"; __game.prepareWave(7)` testa uma sala; `__game.hazards.snapshot()` mostra raios e poças.
- Conquistas: `__game.ach.state` (liberadas, contadores, medalhas); `TUNING.unlockAll = false` em `data/tuning.ts` mostra os trancados.
- **F1 abre o DEV Grimoire** (spells, níveis, modificadores, relíquias, curar, matar todos, terminar onda, ir ao chefe). Spells: o mouse manda na mira (`updateAim` a cada quadro); para mirar pelo console, pôr `__game.input.mouseX/Y` na projeção do alvo. `__game.spells.stats` (números de cada espaço), `__game.spells.cooldown`, `__game.spells.snapshot()` (projéteis em voo); evolução: nível 5, `__game.addRelic('ember_heart')` e fim de onda abrem a oferta (`__game.evolutionOffer`), ou direto `__game.run.spells[0] = {id:'fireball', level:5, modifiers:[], evolution:'firestorm'}; __game.recompute()`; com o painel oculto o `setTimeout` vira 1 s, então dar quadros com `__game.frame(performance.now())` e não misturar com relógio inventado (o tempo do jogo salta); `__game.run.spells.push({id:'iceball',level:1,modifiers:[],evolution:null}); __game.recompute()` enche o 2º espaço.
- Morte: `__game.player.iframes = 0; __game.hurtPlayer(99999, "Goblin")`.
- No painel de navegador do Claude o jogo só avança com o painel visível; oculto, chamar `__game.frame(ts)` em laço e `__ui.updateHud()` para o HUD. Partida nova: clicar nos 3 botões do título, depois `__game.beginWave()`; a tela de nível escolhe com `document.querySelector('[data-i]').click()`. Captura com o painel oculto: `__game.frame(t)` e `fetch('/__shot?name=x', {method:'POST', body: __game.renderer.domElement.toDataURL()})` grava `.shots/x.png`. Orbes: `__game.loot.field.orbs`, banco `__game.run.lootBank`. Loja: `__game.openShop('preboss')` abre uma visita; `__game.shopVisit`, `__game.buyShop(i)`, `__game.rerollShop()`, `__game.closeShop()`.
- Conferir pelo console (`get_page_text`, `javascript_tool`) e tirar captura só quando a mudança for visual.

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
- Arte: os 4 chefes e os 9 heróis foram refeitos e aprovados (os heróis ainda em primitivas de código, sem Blender: `M2-11`; ataque básico sem visual próprio por herói e carregado demais: `M5-09`); inimigos comuns: goblin e orc refeitos (`M3-01`, aprovados); o resto (morcego e gosma são os mais fracos) espera o `M3-02` em diante. Pendências do crítico nas linhas `M18-07` a `M18-10` e no Kaelen (para o usuário decidir se reabre).

## Pendências com o usuário
- Decisões abertas da seção 8 do roadmap (D1 idioma dos textos, e as outras sem resposta).
- Jogar com F3 aberto e dizer se ainda há picos (`M16-01`).
- Nome definitivo do jogo, se o repo `pocket-dungeon` continua sendo a casa dele, e onde hospedar a versão jogável.
