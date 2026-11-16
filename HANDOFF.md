# Dungeon Reign RPG — handoff

Leia antes de qualquer coisa. Aqui fica só o estado atual; o histórico de cada tarefa está no registro de progresso (`docs/roadmap.md`, seção 9) e no git. **Mantenha este arquivo curto:** ao fechar uma tarefa, troque o parágrafo "Agora" em vez de acrescentar.

## Agora (2026-11-16)
- **Marco em andamento: M6, spells** (D2, D12: teclas 1 e 2). O M20 (partida como no Dungeon Reign) está completo. Feito no M6: `M6-00` a `M6-05`: `SpellCaster` em `src/game/spells.ts` com as 11 spells, Eco, Volátil e Brittle Chill. Campo, órbita, runas e ícones de estado têm relógio (arco que esvazia e pisca no último segundo).
- **Próxima tarefa:** `M6-06` (obtenção e evolução, decisão D3: confirmar com o usuário antes). Pendência de paridade da `M6-05`: o usuário aceitar a S28 (runa na tecla, parado) e o tiro do herói estourar runa de longe (`Tech.shootRunes`, D-575), que ficou de fora.
- **Pedido do usuário para depois (`M16-08`):** a troca de zona depois do chefe (ondas 5, 10, 15) dá uma travadinha; cobrir com uma transição e montar a zona por trás.
- **Decidido em 2026-11-16 (D15):** spell na tecla sai sempre e gasta a recarga, mesmo sem inimigo no alcance. `M5-05` (ícones de estado sobre os inimigos, `src/game/status-icons.ts`) feita antes do `M6-03`, a pedido dele; cada spell nova do M6 precisa pôr o estado dela em `enemyStatuses`. Efeitos próprios das spells ficam na `M5-08`.
- **Rever com o usuário (D14):** os atributos do herói contra os do original (poder de magia, "efeitos", recarga e área globais). Ele aceitou o S12 assim por enquanto; decidir antes do `M6-08`.
- **Falta o usuário jogar:** `M5-05` (ícones de estado, agora com relógio), `M6-02` a `M6-05` (11 spells nas teclas 1 e 2), `M20-02` a `M20-08`, `M19-02` a `M19-05` (técnicas dos heróis), `M1-05` (presença de chefe), Ninhada da Vesper. Tudo foi conferido só pelo console.
- **Régua de paridade:** `docs/paridade.md` mais `tests/parity.test.ts` (lê os `.lua` do original pelo LuaJIT, `tools/dr-dump.lua`). Toda tarefa do M20 e do M6 confere as linhas dela ali.
- **Modo de teste:** o `testBoost` (dano ×2, velocidade ×4) saiu em 2026-11-16, a pedido do usuário. `TUNING.unlockAll` continua deixando os 9 heróis abertos (desligar ao balancear).
- **Ícones de estado têm relógio** (2026-11-16, pedido do usuário: quer feedback visual de tudo): o contorno esvazia até o estado acabar e o ícone pulsa no último segundo. Estado novo com duração precisa pôr `until` no `StatusBadge`. A vida dos chefes ainda leva o corte antigo de 0,55 (`TUNING.boss.hpMult`) até haver spells.

## Atalhos de teste (console do jogo)
- `__game.prepareWave(n)` pula para a onda n · `__game.gainXp(200)` e terminar a onda abre as melhorias.
- `__game.run.room = "boss_ambush"; __game.prepareWave(7)` testa uma sala; `__game.hazards.snapshot()` mostra raios e poças.
- Conquistas: `__game.ach.state` (liberadas, contadores, medalhas); `TUNING.unlockAll = false` em `data/tuning.ts` mostra os trancados.
- Spells: o mouse manda na mira (`updateAim` a cada quadro); para mirar pelo console, pôr `__game.input.mouseX/Y` na projeção do alvo. `__game.spells.stats` (números de cada espaço), `__game.spells.cooldown`, `__game.spells.snapshot()` (projéteis em voo); `__game.run.spells.push({id:'iceball',level:1,modifiers:[],evolution:null}); __game.recompute()` enche o 2º espaço.
- Morte: `__game.player.iframes = 0; __game.hurtPlayer(99999, "Goblin")`.
- No painel de navegador do Claude o jogo só avança com o painel visível; oculto, chamar `__game.frame(ts)` em laço.
- Conferir pelo console (`get_page_text`, `javascript_tool`) e tirar captura só quando a mudança for visual.

## Decisões do usuário (não reabrir sem ele pedir)
- PC, teclado e mouse. Partidas como no Dungeon Reign (D13), sem equipamento por enquanto (pode voltar se encaixar com as relíquias).
- **Toda a arte é gerada por código, em 3D.** Sem sprites nem modelos importados; modelos por IA (Meshy, Hunyuan3D) foram descartados. O sprite do Dungeon Reign é a fonte do design; método na seção 4 do roadmap.
- **Tudo do jogo em inglês** (D1, decidido em 2026-11-16): nomes, ids, código e também os textos que o jogador lê (interface, mecânicas como Echo e Volatile, textos flutuantes, descrições), com a palavra do Dungeon Reign (`en.lua`) quando existir. Português só como tradução no `M14-01`. Documentos e conversa seguem em português.
- Esquiva e poção ficam por enquanto (Q3). Onda cronometrada como no original (Q2).
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
| `src/game/` (resto) | `spells.ts` (conjuração das spells), `world.ts`, `flora.ts`, `scatter.ts`, `air.ts`, `fx.ts`, `icewall.ts`, `rift.ts`, `render.ts`, `shared.ts` |
| `src/ui/ui.ts` | Interface em DOM: título e início, HUD, status (I), melhorias, mapa, relíquias, pausa, resultado |

## Como rodar e conferir
- `npm install` · `npm run dev` (5173; o `launch.json` tem `dev-5174` para uma segunda sessão) · `npm test` · `npx tsc --noEmit`.
- `SINGLE=1 npx vite build` gera `dist-single/index.html`. Versão publicada para o usuário: artifact `https://claude.ai/artifact/TtNw79t7ckCEh5csU4T8cc` (republicar com essa URL; o arquivo é o `dist-single/index.html` sem as tags `html/head/body`).
- Prévia de personagens: `/preview.html?view=close|game&anim=idle|walk|attack&yaw=<graus>&a=<id>` (`src/preview.ts`). Captura sem tela: `await __preview.shot("nome", {...})` grava `.shots/nome.png`; `__preview.criticShots("critic-<id>")` para o crítico.
- Prévia de zona: `/zone.html?zone=bosque|cripta|vulcao|vazio` (`src/zone-preview.ts`), `__zone.criticShots`.
- Sem GPU: Playwright + Chromium com `--use-angle=swiftshader`; renderiza certo, mas lento.
- Repo do Dungeon Reign local (só leitura): `C:\Users\victo\Documents\GitHub\dungeon-idle`. `npm run refs` regrava os sprites de referência em `docs/ref/`.

## Não validado
- Movimento e sensação jogando; desempenho numa GPU real (placa do usuário: Radeon RX 9060 XT; `M16-01`, F3 mostra o tempo de GPU).
- Balanceamento: nunca jogado de ponta a ponta.
- Arte: os 4 chefes e os 9 heróis foram refeitos e aprovados; inimigos comuns (morcego e gosma são os mais fracos) esperam o `M3`. Pendências do crítico nas linhas `M18-07` a `M18-10` e no Kaelen (para o usuário decidir se reabre).

## Pendências com o usuário
- Decisões abertas da seção 8 do roadmap (D1 idioma dos textos, e as outras sem resposta).
- Medir o fps com F3 (`M16-01`).
- Nome definitivo do jogo, se o repo `pocket-dungeon` continua sendo a casa dele, e onde hospedar a versão jogável.
