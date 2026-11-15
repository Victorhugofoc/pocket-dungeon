# Paridade com o Dungeon Reign

Pedido do usuário em 2026-11-15: a estrutura de jogo dos heróis e das spells é **a mesma do Dungeon Reign**. Esta tabela é a régua. Cada regra do original tem uma linha com a fonte (arquivo em `dungeon-idle`), o equivalente aqui e o estado:

- **igual**: mesma regra e mesmos números. Quando há número, `tests/parity.test.ts` confere contra o `.lua`.
- **adaptado**: muda porque o formato pede (mapa aberto, teclas, save). O motivo fica escrito, e o usuário precisa aceitar.
- **a decidir**: depende de uma resposta do usuário.
- **falta**: ainda não existe aqui. Diz qual tarefa traz.

Uma tarefa do M6 ou do M19 só fica pronta quando as linhas dela estão em "igual" ou em "adaptado" aceito.

## Como a conferência funciona
1. **Dados:** `tests/parity.test.ts` roda `tools/dr-dump.lua` no LuaJIT. Ele carrega os módulos de dados do original (`src.core.constants`, `src.data.spells`, `src.data.characters`) e devolve JSON, que o teste compara com `src/data`. Se um número mudar de um lado só, o `npm test` quebra. O teste pula se o repo (`DUNGEON_IDLE`, padrão `../GitHub/dungeon-idle`) ou o `luajit` (`LUAJIT`) não estiverem na máquina.
2. **Regras:** as funções do núcleo daqui têm o nome e os retornos das de lá (`addSpell`, `levelUp`, `addModifier`, `candidates`), cada uma com teste do mesmo caso. Entra no `M6-01`.
3. **Esta tabela:** para o que não é número (fluxo de telas, quando algo acontece), revisada a cada tarefa.

Primeira rodada (2026-11-15): o teste achou 1 divergência real. O tiro da Vesper acumulava veneno até 4 vezes; lá são 3. Foi corrigido.

## Estrutura de spells

| # | Regra no Dungeon Reign | Fonte | Aqui | Estado |
|---|---|---|---|---|
| S1 | 2 espaços de spell, mais a técnica num espaço próprio (o 0) | `core/constants.lua` `MAX_SPELLS`; `core/game_state.lua` `newRun` | `MAX_SPELLS` em `src/data/spells.ts` (testado) | igual (dado); falta no jogo (`M6-02`) |
| S2 | 11 spells, na ordem de `S.order` | `data/spells.lua` | `SPELL_ORDER` (testado) | igual (lista); definições faltam (`M6-01`) |
| S3 | Cada herói tem 4 spells iniciais próprias | `data/characters.lua` `startingSpells` | `HeroDef.startingSpells` (testado) | igual |
| S4 | No início o jogador escolhe **1** das 4 (tela "Spell inicial", passo 3 de 3) | `ui/screens/spell_select.lua` | não existe | falta (`M6-02`, `M20-06`): a cada partida, como lá |
| S5 | Healing Field nunca é spell inicial | `spell_select.lua` (texto) e `startingSpells` | testado | igual |
| S6 | Começa no nível 1, com a recarga zerada | `game_state.lua` `newSpellSlot` | — | falta (`M6-01`) |
| S7 | Spell nova só entra com espaço livre; recusa com `no_slot` ou `owned` | `spells/spell_system.lua` `addSpell` | — | falta (`M6-01`) |
| S8 | Nível de 1 a 5, e só a loja sobe nível de spell | `spell_system.lua` `levelUp`; `SPELL_MAX_LEVEL` | `SPELL_MAX_LEVEL` (testado) | igual (dado); compra falta (`M7`) |
| S9 | Marcos nos níveis 2 a 5, cumulativos | `spells/spell_stats.lua` `collect` | — | falta (`M6-01`) |
| S10 | Modificadores comprados na loja, cada um do conjunto da própria spell, uma vez por spell | `spell_system.lua` `addModifier`; `shop/shop_system.lua` `candidates` | — | falta (`M6-08`, `M7`) |
| S11 | Relíquias específicas de spell somam efeito | `spell_stats.lua` (`r.spell`, `r.spellEffect`) | — | falta (`M6-01`, ao portar as relíquias) |
| S12 | Dano = base + poder de magia × escala, mais os percentuais globais (dano de spell, área, recarga) | `spell_stats.lua`; `player/stats.lua` `spellPower` | a fórmula das técnicas já segue isso (`src/core/techniques.ts`) | falta para spells (`M6-01`) |
| S13 | A recarga só é gasta se o lançamento der certo; sem alvo, não gasta | `spell_system.lua` `tryCast` | técnicas: já é assim (Shadow Step, Storm Step) | falta para spells (`M6-02`) |
| S14 | As spells saem sozinhas quando prontas, na direção do mouse | `spell_system.lua` `update` (D-139) | teclas 1 e 2 (decisão D12) | **adaptado**, aceito em 2026-11-14 |
| S15 | A técnica é ativada pelo jogador | `spell_system.lua` `useTechnique` | botão direito ou Q | igual |
| S16 | Eco: chance de relançar de graça 0,2 s depois | `spell_system.lua` `doCast` | — | falta (`M6-08`) |
| S17 | Volátil: inimigo queimando pelo Fireball pode explodir ao morrer | `spell_system.lua` `onKill` | — | falta (`M6-02`) |
| S18 | Evolução de spell: nível 5 mais **uma** relíquia da receita; até 3 opções, pode recusar; não gasta a relíquia | `spells/evolution.lua` | — | falta (`M6-06`) |
| S19 | A técnica também sobe de nível na loja; o nível 5 é a evolução dela | `shop_system.lua` `candidates` (`spells[0]`) | dados prontos (`M19-01`), sem como subir | falta (`M19-07`, `M7`) |
| S20 | Loja: até 3 ofertas por visita mais 1 relíquia; uma melhoria de spell é garantida se houver; categorias sorteadas por igual (melhoria, modificador, spell nova, arma afiada, vitalidade, tomo arcano) | `shop_system.lua` `roll`; `data/shop.lua` | — | falta (`M7`, `M20-05`) |
| S21 | Preços: spell nova 50, melhoria 50 + 44 × nível, crescendo com o nível da loja e com cada compra de spell | `data/shop.lua` `SPELL`, `MODIFIER` | — | falta (`M7`) |
| S22 | Subir de nível não dá spell: dá melhorias de atributo, escolhidas entre 3 | `progression/level_up.lua` | aqui subir de nível dá pontos de atributo | falta (`M20-03`) |

## Heróis (M19)

| # | Regra no Dungeon Reign | Fonte | Aqui | Estado |
|---|---|---|---|---|
| H1 | 9 heróis, na mesma ordem | `characters.lua` `order` | testado | igual |
| H2 | Técnica de cada herói, números, marcos e evolução | `data/spells.lua` (as 9 `tech`) | `src/data/techniques.ts` (testado campo a campo) | igual |
| H3 | Frostine: Estilhaçar, Quebradiço, Pingente, Frio profundo | `characters.lua` `frost`; `combat/frost.lua` | `FROST` (testado) | igual |
| H4 | Vesper: veneno do tiro (3 acúmulos) e Ninhada | `characters.lua` `autoPoison`, `brood` | `VENOM` (testado) | igual (corrigido de 4 para 3 acúmulos) |
| H5 | Varok: Inquebrável (no máximo 50% da vida por golpe) | `characters.lua` `maxHitFraction` | testado | igual |
| H6 | Umbra e Seraph: curas fixas (4 e 2 de vida) | `passiveText` | 4% e 2% da vida máxima | **adaptado**: a vida daqui cresce até o nível 60, e 4 de vida fixa sumiria |
| H7 | Atributos do herói (`effects`: gelo %, fogo %, dano de spell %...) | `characters.lua` `effects` | `HeroDef.stats`, com os elementos juntados em `statusPct` e `damagePct` | **adaptado** (vem da 0.1); rever no `M6-01`, quando dano de spell e escolas existirem |
| H8 | Estilo do ataque básico (`autoStyle`) | `combat/auto_attack.lua` | Kaelen salta para 2, Aurelius atravessa 2, Ignis atira leque de projéteis | **a decidir** (pendência do `M19-03` e do `M19-04`) |
| H9 | Varok: modo Matador de Chefes (menos inimigos, chefes mais fortes, recompensa maior) | `characters.lua` `runMods` | — | falta; não estava no M19 |
| H10 | Textos das passivas | `passiveText` | os mesmos; os da Frostine estão por extenso | igual |

## Partida (M20)

Números em `src/data/run.ts`, fórmulas em `src/core/waves.ts` e o ciclo da onda em `src/core/wave.ts`, conferidos por `tests/parity.test.ts`: as fórmulas onda a onda até a 40, e o ciclo (contagem com `ARENA_CROWD`, vida e dano de inimigo e campeão, vida e dano dos 4 chefes, chance de campeão, campeões do modo sem fim, Apressar) nas 3 dificuldades, calculados pelas próprias funções do Lua (`wave_system.lua`, `enemy.lua`, `boss.lua`).

| # | Regra no Dungeon Reign | Fonte | Aqui | Estado |
|---|---|---|---|---|
| R1 | Cada partida tem uma seed, com um fluxo de sorteio por finalidade (inimigos, campeões, chefes, recompensas, relíquias...) | `run/run_controller.lua` `RNG.streams` | `RUN_STREAMS` e `RunRng` em `core/run.ts`, mesmos 12 fluxos; código de seed de 7 letras (`encodeSeed`, `decodeSeed`); a onda sorteia nos fluxos `spawns` e `champions` | igual (testado em `tests/run.test.ts` e `tests/wave.test.ts`); o ponto de nascimento e o orbe de cura usam `Math.random` (lá, o fluxo `combat`) |
| R2 | Início em 3 passos: herói, dificuldade, spell inicial | `ui/screens/run_setup.lua`, `spell_select.lua` | escolha de herói só | falta (`M20-06`) |
| R3 | 20 ondas; chefes nas ondas 5, 10, 15 e 20; no modo sem fim, a cada 5 | `core/constants.lua` `TOTAL_WAVES`, `BOSS_WAVES` | `TOTAL_WAVES`, `isBossWave`; no jogo, a zona da onda vem de `Game.zoneOfWave` (5 por zona; depois da 20 as zonas voltam com mapa novo) | igual (testado; as 20 ondas jogadas em sequência no navegador, com piloto) |
| R4 | Cada 5 ondas formam um trecho (`segmentOf`) | `run/run_map.lua` | zona = 5 ondas (D13); `worldgen` divide o mapa em 5 clareiras ao longo do caminho (`ZoneLayout.segments`), a 5ª é a arena do chefe | igual |
| R5 | A onda tem duração (20 a 40 s) e os inimigos **nascem ao longo dela** (90% do tempo); acaba quando o tempo passa ou quando não sobra ninguém | `run/wave_system.lua` `start`, `update`; `waves.lua` | `startWave` e `stepWave` em `core/wave.ts`; o herói entra na clareira, o letreiro dura `INTRO_TIME`, a clareira fecha (o herói não sai) e os inimigos nascem na borda dela, longe do herói, depois de 0,6 s de aviso no chão | igual (Q2); só existem os 10 inimigos daqui: os 5 que faltam saem do sorteio, e o peso dos outros não muda |
| R6 | Contagem de inimigos por onda: base, curva de ritmo e fator da área da arena (`ARENA_CROWD`) | `waves.lua` `baseEnemyCount`; `tuning.lua`; `wave_system.lua` `targetCount` | `targetCount` com `ARENA_CROWD` (testado nas 3 dificuldades) | igual; a clareira (raio 16) tem área parecida com a da arena de lá, o ritmo se confere jogando (Q2) |
| R7 | Inimigos entram no sorteio por estágios (onda 1 só goblin, onda 2 goblin e orc...), com peso | `waves.lua` `STAGES`, `WEIGHT` | `compositionFor` testado | igual (dado); faltam 5 inimigos (shieldbearer, hexer, plaguebearer, leaper, warden; `M9`) |
| R8 | Vida e dano dos inimigos sobem por onda (+3,5% e +2%), mais a dificuldade | `waves.lua` `hpScale`, `damageScale`; `difficulties.lua`; `enemy.lua` `create` | `enemyStats` e `waveMods` em `core/wave.ts`; o `Enemy` usa a onda em vez do nível antigo | igual (testado); a velocidade dos projéteis da dificuldade ainda não é aplicada |
| R9 | Campeão: 1 sorteado por onda normal (2% + 2% por onda, até 30%), no meio do cronograma; mais 1 por onda no modo sem fim | `wave_system.lua`; `affix_system.lua` `randomChampionAt`; `enemy.lua` `makeChampion` | `randomChampionChance`, `endlessChampions`, campeão com a vida de lá (`CHAMPION`) | igual (testado); os afixos do campeão faltam (`M9`); a Toca dos Campeões vem com o mapa da partida (`M20-05`) |
| R10 | Onda de chefe: o chefe mais 60% da onda normal; acaba quando o chefe morre, e o resto some | `wave_system.lua`; `tuning.lua` `BOSS_WAVE_SPAWN` | a 5ª clareira; o chefe entra do lado oposto ao herói depois de 1,4 s de aviso | igual |
| R11 | Chefe sorteado de um "saco" com os 13, sem repetir até esvaziar | `bosses/boss_bag.lua` | cada zona tem o seu chefe fixo (4 chefes) | **adaptado**: a zona dá identidade ao chefe e só existem 4. Rever quando houver os 13 (`M10`). O rei coroado da onda 20 não pega o ataque emprestado de outro chefe |
| R12 | Vida do chefe: 260 + 55 × onda, ×2,2, +10% por onda depois da 5, mais leve nas ondas 5 e 10; tier a cada 5 ondas; a onda 20 é o rei coroado | `bosses.lua`; `tuning.lua`; `boss.lua` `stats` | `bossStats` em `core/wave.ts` (testado nas 3 dificuldades) | **adaptado por enquanto**: no jogo a vida ainda leva o corte antigo `TUNING.boss.hpMult` (0,55), porque o herói não tem melhorias de nível nem spells (906, 2264, 4233 e 9243 de vida em Normal). Tirar quando o `M20-03` e o `M6` chegarem |
| R13 | Vencer o chefe cura 20% e abre 1 de 3 relíquias (35% de chance de uma premium) | `wave_system.lua` `complete`; `bosses.lua` | cura 20% e 1 de 3 relíquias; o portal só abre depois da escolha | igual na cura; a relíquia premium falta (`M12`) |
| R14 | Fechar a onda dá ouro e XP da onda, mais um resto pelos sobreviventes; ouro e XP dos inimigos caem como orbes no chão | `wave_system.lua` `complete`; `progression/rewards.lua`; `combat/loot.lua` | `waveReward` e `survivorReward` (35%, campeão ×4,5); o chefe dá o ouro e o XP de chefe | igual no fim da onda; o XP do inimigo ainda vem direto ao matar e não há orbe de ouro (`M20-03`, `M7`) |
| R15 | Apressar: depois de 5 s, acelerar o resto de uma onda normal por até +30% de recompensa | `wave_system.lua` `hasten`; `tuning.lua` `HASTEN` | tecla H, com o bônus na barra da onda (`hasten` em `core/wave.ts`) | igual (testado); a velocidade extra dos inimigos (`enemySpeed`) ainda não é aplicada |
| R16 | XP: 50 para o nível 2, ×1,35 a cada nível; não há teto de nível | `progression/xp.lua`; `constants.lua` | curva testada; o jogo ainda usa a curva antiga, até o 60 | igual (dado); falta no jogo (`M20-03`) |
| R17 | Subir de nível só acumula; as 3 melhorias são escolhidas **no intervalo entre as ondas** | `run/run_intermission.lua` `missing` | pontos de atributo na hora | falta (`M20-03`) |
| R18 | 3 melhorias de `upgrades.lua`, com raridade (comum, rara, épica; +1 ponto de épica a cada 5 níveis) e troca por 20 + 5 × nível, uma vez | `progression/level_up.lua`; `data/upgrades.lua` | raridade e troca testadas; a lista de melhorias falta | falta (`M20-03`) |
| R19 | Intervalo entre ondas, nesta ordem: relíquia do chefe, relíquia de risco, loja automática, mapa; nível e evolução no meio; a loja nunca trava o início da onda | `run_intermission.lua` | — | falta (`M20-05`) |
| R20 | Mapa: 3 cartas sorteadas entre 8 tipos com peso; não há mapa antes da onda 1 nem das ondas de chefe | `run_map.lua` `generate`, `hasMapBefore`; `data/run_map.lua` | `RUN_MAP`, `hasMapBefore` testados | igual (dado); falta no jogo (`M20-05`) |
| R21 | Loja garantida antes de toda onda múltipla de 3, no lugar de uma carta de combate, maldição ou evento; loja automática antes de toda onda de chefe | `run_map.lua` `generate`; `wave_system.lua` | `RUN_MAP.shopEvery`, `shopBeforeWave` | igual (dado); falta no jogo (`M20-05`, `M7`) |
| R22 | Checkpoint antes de cada onda (a partida inteira mais o estado dos sorteios); continuar recomeça aquela onda | `run/run_save.lua`; `run_controller.lua` `restore` | gravado ao preparar cada onda; continuar põe o herói na entrada do trecho daquela onda | igual (testado; conferido no navegador na onda 22) |
| R23 | Morrer encerra a partida, com tela de resultado e registros | `ui/screens/death.lua`, `results.lua`; `core/records.lua` | morrer recomeça a onda do checkpoint e conta a morte | falta (`M20-06`) |
| R24 | Vencer a onda 20 dá vitória e a escolha de seguir no modo sem fim | `ui/screens/victory_choice.lua` | vencer a onda 20 marca a vitória; o portal leva ao modo sem fim | falta a escolha e o registro (`M20-06`) |
| R25 | Dificuldades Easy, Normal e Hard (Depths 1 a 5 em cima da Hard) | `data/difficulties.lua` | `DIFFICULTIES` testado; Depths no `M13` | igual (dado); falta no jogo (`M20-06`) |
| R26 | Cura e regeneração durante a onda valem 35%; todo dano de inimigo ×1,5; orbes de cura raros (até 2 por onda) | `tuning.lua`; `heal_orbs.lua`; `damage.lua` | `combatHealMult` em `heal` e na regeneração, ×1,5 em `enemyStats` e `bossStats`, orbe de cura de lá (8%, 8 s, chance por categoria) | igual; a poção (Q3) também vale 35% durante a onda |
| R27 | Começam abertos Frostine, Kaelen, Aurelius e Ignis; os outros 5 por conquista; desbloqueio nunca dá poder | `core/unlocks.lua`; `data/unlocks.lua` | os 9 abertos | falta (`M20-07`) |
| R28 | Sem equipamento | — | itens, afixos e inventário | falta remover (`M20-04`) |
| R29 | O herói não tem esquiva nem poção | `player/player_system.lua` | esquiva (Espaço) e poção (F) | **adaptado**, aceito em 2026-11-15 por enquanto (Q3); a poção pode sair depois |

## Perguntas respondidas

- **Q2. Como a onda acontece no mapa aberto?** Respondida em 2026-11-15: **como no Dungeon Reign.** Ao entrar no trecho, a onda começa; os inimigos chegam pelas bordas do trecho ao longo da duração, com relógio e Apressar; a onda acaba no tempo ou quando não sobra ninguém. O ritmo (contagem, duração, fator de área) só se mexe depois, jogando.
- **Q3. Esquiva e poção ficam?** Respondida em 2026-11-15: **ficam as duas por enquanto.** A poção pode sair depois; decidir jogando.

- **Q1. Save contínuo ou partidas com seed?** Respondida em 2026-11-15 (D13): **partidas como no Dungeon Reign**, sem equipamento, cada zona = 5 ondas. S4 (escolha da spell inicial a cada partida), S20 (loja no mapa da partida) e S22 (melhorias de nível com 3 escolhas) passam a seguir o original; as regras da partida entram como linhas `R` no `M20-00`.
