# Dungeon Reign RPG — handoff

Leia antes de qualquer coisa. Aqui fica só o estado atual; o histórico de cada tarefa está no registro de progresso (`docs/roadmap.md`, seção 9) e no git. **Mantenha este arquivo curto:** ao fechar uma tarefa, troque o parágrafo "Agora" em vez de acrescentar.

## Agora (2026-11-18)
- **D16 (2026-11-18): personagens passam a ser modelados no Blender.** Goblin (`tools/blender/goblin.py`, aprovado) e orc (`tools/blender/orc.py`, feito em 2026-11-18, falta o usuário validar por `/preview.html?a=orc&b=orc_v1` ou `.shots/critic-orc-*`; o machado continua por código). Crítico do orc em 3 rodadas, notas na linha do `M3-01` (seção 9). **Próximo passo:** `M3-02` (swarm e splitter) já no Blender. Pendências do goblin: corpo ainda simples (braços lisos, bola do ombro esquerdo aparecendo sobre a ombreira), crítico cego não rodado nessa versão. Os dois modelos passam do orçamento de 3 mil triângulos (goblin ~5,2 mil, orc ~6,3 mil).
- **`M3-01` feita em 2026-11-18** (goblin e orc refeitos, `cast-enemies.ts`; rosto do goblin refeito na mesma data a pedido do usuário, que o achou com cara de amigo; agora rosna, com olhos acesos em fenda): falta o usuário validar pelas capturas `.shots/critic-goblin-*` e `.shots/critic-orc-*` (ou `/preview.html?a=goblin&b=orc`). Crítico em 5 rodadas; o que oscilou entre rodadas ficou anotado na linha da `M3-01` (seção 9) para ele decidir. Os dois passam do orçamento de 3 mil triângulos (goblin ~4,0 mil, orc ~4,7 mil). Próximo: `M3-02` (swarm e splitter). **`M16-01` parte 1** (stuttering) continua esperando o usuário jogar com F3 aberto: `__game.probe.report()` lista os picos com o que aconteceu no quadro (`shader+N`, `geo+N`, `resize`). Técnicas e spells (`M5-03`, `M5-08`) completas; cena de teste das técnicas: afastar o herói da borda do mapa (`player.z -= 10`), `player.techCd = 0; __game.useTechnique()`. Cena de teste das spells: título, "Continue ›", "Start the run", `beginWave()` e `wave.duration = 1e6`, `spells.cooldown[0] = 0; spells.tryCast(0)`, `__game.frame` em passos de 16,7 ms com `player.hp` cheio e `iframes` a cada passo. A biblioteca de efeitos está em `src/game/vfx.ts` (prévia `/fx.html`).
- **Pedido do usuário (2026-11-17, no `M4-03`):** o ataque básico precisa ter cara de ataque básico, com efeito simples saindo da arma ou da mão; escala visual ataque < técnica < spell.
- **Pedidos do usuário em 2026-11-17:** tiro do ataque, da técnica e das spells sai do corpo, sem animação de uso (anotado no `M4-03`, repensar junto com o `M4-04`). Rótulos das melhorias de nível corrigidos ("spellDamagePct" aparecia na carta).
- O **F1 (DEV Grimoire)** continua para testes e marca a partida [DEV] (`TUNING.devTools`, desligar ao publicar); 15 das 23 relíquias de receita só chegam no `M12`. O Earthen Ward desvia os inimigos em `Enemy.meleeStep` (`game.spells.wardFor`).
- **Pedido do usuário para depois (`M16-08`):** a troca de zona depois do chefe (ondas 5, 10, 15) dá uma travadinha; cobrir com uma transição e montar a zona por trás.
- **Decidido em 2026-11-16 (D15):** spell na tecla sai sempre e gasta a recarga, mesmo sem inimigo no alcance. `M5-05` (ícones de estado sobre os inimigos, `src/game/status-icons.ts`) feita antes do `M6-03`, a pedido dele; cada spell nova do M6 precisa pôr o estado dela em `enemyStatuses`. Efeitos próprios das spells ficam na `M5-08`.
- **Decidido em 2026-11-16 (D14):** poder de magia entra, recarga global entra, "efeitos" se separa como no original (dano por escola `firePct`, `icePct`, `lightningPct`, `arcanePct`; `burnPct`; `slowPct`, `slowDurationPct`; `poisonMult`; lista confirmada). Isso libera o `M6-08`. **D6:** chefes sorteados, como o saco de chefes do original (`boss_bag.lua`); bioma em ordem fixa (confirmado). **D7:** as 94 relíquias, sem limite. **D8** sim. **D9** GitHub Pages. **Regra geral dele: o jogo inteiro vem do Dungeon Reign, só a engine muda.**
- **Pedido dele (`M17-01`, reescrita):** bot que joga partidas inteiras para medir balanceamento, porta do `balance_sim.lua` e `sim_bot.lua` do original.
- **Depois:** ajustar o Kaelen pelos pontos do crítico (não reabrir agora).
- **Falta o usuário ver ou jogar:** `M3-01` (goblin e orc, capturas), `M16-01` (F3 aberto), `M5-08` partes 1 a 3 (as 11 spells; pelo F1), `M5-03` partes 1 a 3 (as 9 técnicas), `M5-02` (só na prévia `/fx.html`, o jogo ainda não usa), `M7-05` (a técnica aparece na loja como "Technique upgrade" e evolui no Lv 5), `M19-07` (Lv 5 pela loja ou F1; o Trick Shot ricocheteia no fim do alcance, adaptação S30 para aceitar), `M7-04` (a loja: comprar, trocar, sair; loja antes do chefe, depois do campeão e pela carta do mapa), `M7-01` e `M7-02` (ouro por inimigo e orbes no chão; a economia mudou: mais ouro, e o XP só entra ao recolher), `M6-08` (I: modificadores e dica da spell), `M6-12` (a Frostine perdeu o +25% de força da lentidão do ataque, que lá é fixa; a Fireball dela sai com metade do dano), `M6-07` (F1, DEV Grimoire), `M6-11` (Blade Storm, Plague Bloom, Maelstrom, Rune Circle, Spectrum, Earthen Ward), `M6-09` (oferta de evolução), `M6-10` (6 formas evoluídas), `M5-05` (ícones de estado, agora com relógio), `M6-02` a `M6-05` (11 spells nas teclas 1 e 2), `M20-02` a `M20-08`, `M19-02` a `M19-05` (técnicas dos heróis), `M1-05` (presença de chefe), Ninhada da Vesper. Tudo foi conferido só pelo console.
- **Régua de paridade:** `docs/paridade.md` mais `tests/parity.test.ts` (lê os `.lua` do original pelo LuaJIT, `tools/dr-dump.lua`). Toda tarefa do M20 e do M6 confere as linhas dela ali.
- **Modo de teste:** o `testBoost` (dano ×2, velocidade ×4) saiu em 2026-11-16, a pedido do usuário. `TUNING.unlockAll` continua deixando os 9 heróis abertos (desligar ao balancear).
- **Ícones de estado têm relógio** (2026-11-16, pedido do usuário: quer feedback visual de tudo): o contorno esvazia até o estado acabar e o ícone pulsa no último segundo. Estado novo com duração precisa pôr `until` no `StatusBadge`. A vida dos chefes ainda leva o corte antigo de 0,55 (`TUNING.boss.hpMult`) até haver spells.

## Atalhos de teste (console do jogo)
- `__game.prepareWave(n)` pula para a onda n · `__game.gainXp(200)` e terminar a onda abre as melhorias.
- `__game.run.room = "boss_ambush"; __game.prepareWave(7)` testa uma sala; `__game.hazards.snapshot()` mostra raios e poças.
- Conquistas: `__game.ach.state` (liberadas, contadores, medalhas); `TUNING.unlockAll = false` em `data/tuning.ts` mostra os trancados.
- **F1 abre o DEV Grimoire** (spells, níveis, modificadores, relíquias, curar, matar todos, terminar onda, ir ao chefe). Spells: o mouse manda na mira (`updateAim` a cada quadro); para mirar pelo console, pôr `__game.input.mouseX/Y` na projeção do alvo. `__game.spells.stats` (números de cada espaço), `__game.spells.cooldown`, `__game.spells.snapshot()` (projéteis em voo); evolução: nível 5, `__game.addRelic('ember_heart')` e fim de onda abrem a oferta (`__game.evolutionOffer`), ou direto `__game.run.spells[0] = {id:'fireball', level:5, modifiers:[], evolution:'firestorm'}; __game.recompute()`; com o painel oculto o `setTimeout` vira 1 s, então dar quadros com `__game.frame(performance.now())` e não misturar com relógio inventado (o tempo do jogo salta); `__game.run.spells.push({id:'iceball',level:1,modifiers:[],evolution:null}); __game.recompute()` enche o 2º espaço.
- Morte: `__game.player.iframes = 0; __game.hurtPlayer(99999, "Goblin")`.
- No painel de navegador do Claude o jogo só avança com o painel visível; oculto, chamar `__game.frame(ts)` em laço e `__ui.updateHud()` para o HUD. Partida nova: clicar nos 3 botões do título, depois `__game.beginWave()`; a tela de nível escolhe com `document.querySelector('[data-i]').click()`. Captura com o painel oculto: `__game.frame(t)` e `fetch('/__shot?name=x', {method:'POST', body: __game.renderer.domElement.toDataURL()})` grava `.shots/x.png`. Orbes: `__game.loot.field.orbs`, banco `__game.run.lootBank`. Loja: `__game.openShop('preboss')` abre uma visita; `__game.shopVisit`, `__game.buyShop(i)`, `__game.rerollShop()`, `__game.closeShop()`.
- Conferir pelo console (`get_page_text`, `javascript_tool`) e tirar captura só quando a mudança for visual.

## Decisões do usuário (não reabrir sem ele pedir)
- PC, teclado e mouse. Partidas como no Dungeon Reign (D13), sem equipamento por enquanto (pode voltar se encaixar com as relíquias).
- **Personagens modelados no Blender por script** (D16, 2026-11-18): `tools/blender/<id>.py` gera `art/<id>.blend` e `src/game/chars/models/<id>.json` (malha por osso, lida por `chars/baked.ts`); a receita em `cast-*.ts` fica só com esqueleto e postura. Ver `tools/blender/README.md`. O resto da arte é por código. Sem sprites nem modelos prontos de fora; modelos por IA (Meshy, Hunyuan3D) foram descartados. O sprite do Dungeon Reign é a fonte do design; método na seção 4 do roadmap.
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
- Arte: os 4 chefes e os 9 heróis foram refeitos e aprovados; inimigos comuns: goblin e orc refeitos (`M3-01`, falta validar); o resto (morcego e gosma são os mais fracos) espera o `M3-02` em diante. Pendências do crítico nas linhas `M18-07` a `M18-10` e no Kaelen (para o usuário decidir se reabre).

## Pendências com o usuário
- Decisões abertas da seção 8 do roadmap (D1 idioma dos textos, e as outras sem resposta).
- Jogar com F3 aberto e dizer se ainda há picos (`M16-01`).
- Nome definitivo do jogo, se o repo `pocket-dungeon` continua sendo a casa dele, e onde hospedar a versão jogável.
