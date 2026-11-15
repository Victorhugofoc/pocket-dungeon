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

## Perguntas respondidas

- **Q1. Save contínuo ou partidas com seed?** Respondida em 2026-11-15 (D13): **partidas como no Dungeon Reign**, sem equipamento, cada zona = 5 ondas. S4 (escolha da spell inicial a cada partida), S20 (loja no mapa da partida) e S22 (melhorias de nível com 3 escolhas) passam a seguir o original; as regras da partida entram como linhas `R` no `M20-00`.
