# Dungeon Reign RPG — handoff

Leia antes de qualquer coisa. Aqui fica só o estado atual; o histórico de cada tarefa está no registro de progresso (`docs/roadmap.md`, seção 9) e no git. **Mantenha este arquivo curto:** ao fechar uma tarefa, troque o parágrafo "Agora" em vez de acrescentar.

## Agora (2026-11-16)
- **Marco em andamento: M6, spells** (D2, D12: teclas 1 e 2). O M20 (partida como no Dungeon Reign) está completo. Feito no M6: `M6-00` (paridade) e `M6-01` (as 11 spells em `data/spells.ts` e `spellStats` em `core/spells.ts`, igual ao `compute` do original em 165 cenários). As spells ainda não disparam no jogo.
- **Próxima tarefa:** `M6-02` (conjuração: teclas 1 e 2, recarga, mira no cursor; `fireball` e `iceball` completas, com o Volátil, S17). A spell inicial já é escolhida no início da partida e fica em `run.spells`.
- **Para o usuário aceitar:** S12 em `docs/paridade.md` (dano como multiplicador do herói, metros, bônus globais de recarga e área multiplicando o pool da spell, sem atributo de poder de magia por enquanto).
- **Falta o usuário jogar:** `M20-02` a `M20-08`, `M19-02` a `M19-05` (técnicas dos heróis), `M1-05` (presença de chefe), Ninhada da Vesper. Tudo foi conferido só pelo console.
- **Régua de paridade:** `docs/paridade.md` mais `tests/parity.test.ts` (lê os `.lua` do original pelo LuaJIT, `tools/dr-dump.lua`). Toda tarefa do M20 e do M6 confere as linhas dela ali.
- **Modo de teste ligado:** `TUNING.testBoost` dá dano ×2 e velocidade ×4 aos heróis, a pedido do usuário; voltar para 1 ao balancear. `TUNING.unlockAll` deixa os 9 heróis abertos (desligar junto). A vida dos chefes ainda leva o corte antigo de 0,55 (`TUNING.boss.hpMult`) até haver spells.

## Atalhos de teste (console do jogo)
- `__game.prepareWave(n)` pula para a onda n · `__game.gainXp(200)` e terminar a onda abre as melhorias.
- `__game.run.room = "boss_ambush"; __game.prepareWave(7)` testa uma sala; `__game.hazards.snapshot()` mostra raios e poças.
- Conquistas: `__game.ach.state` (liberadas, contadores, medalhas); `TUNING.unlockAll = false` em `data/tuning.ts` mostra os trancados.
- Morte: `__game.player.iframes = 0; __game.hurtPlayer(99999, "Goblin")`.
- No painel de navegador do Claude o jogo só avança com o painel visível; oculto, chamar `__game.frame(ts)` em laço.
- Conferir pelo console (`get_page_text`, `javascript_tool`) e tirar captura só quando a mudança for visual.

## Decisões do usuário (não reabrir sem ele pedir)
- PC, teclado e mouse. Partidas como no Dungeon Reign (D13), sem equipamento por enquanto (pode voltar se encaixar com as relíquias).
- **Toda a arte é gerada por código, em 3D.** Sem sprites nem modelos importados; modelos por IA (Meshy, Hunyuan3D) foram descartados. O sprite do Dungeon Reign é a fonte do design; método na seção 4 do roadmap.
- **Nomes, ids e código em inglês**, iguais aos do Dungeon Reign (cartas, salas, spells). Textos do jogo em português até a decisão D1.
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
| `src/game/` (resto) | `world.ts`, `flora.ts`, `scatter.ts`, `air.ts`, `fx.ts`, `icewall.ts`, `rift.ts`, `render.ts`, `shared.ts` |
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
