# Dungeon Reign RPG — hando- **Prévia de zona:** `/zone.html?zone=bosque|cripta|vulcao|vazio` (`src/zone-preview.ts`), com a luz e o pós-processamento do jogo, seed fixa e 6 poses de câmera. Também fora do build.
ff

Leia este arquivo antes de qualquer coisa. Ele substitui o histórico das conversas anteriores.

## ESTADO EM 2026-11-13 (ler antes do resto)
- **O plano de trabalho está em `docs/roadmap.md`.** Ele tem os marcos, as tarefas com critério de pronto, o método de modelagem, as fichas de design dos 37 personagens, as decisões pendentes e o registro de progresso. Seguir a rotina da seção 0.1 dele.
- **Bloodfang redesenhado e em uso no jogo** (`bloodfang` em `src/game/chars/cast-bosses.ts`). O usuário aprovou: "o preview nem ficou ruim, seria suficiente". É o modelo de referência para os outros 22 personagens, que continuam na versão antiga.
- **Prévia de personagens:** `npm run dev` e abrir `/preview.html` (`src/preview.ts`). Mostra o personagem, o Varok para escala e o sprite de referência (`docs/ref/<id>.png`). Parâmetros: `?view=close|game&anim=idle|walk|attack&yaw=<graus>&dist=<n>&a=<id>&b=<id>&freeze=<s>&ref=0`. Não entra no build do jogo.
- **Repo do Dungeon Reign local:** `C:\Users\victo\Documents\GitHub\dungeon-idle` (só leitura). Sprites em `assets/characters` e `assets/enemies`; quadro 0 da folha é o parado (heróis e inimigos 96×96, chefes 192×160). Dados em `src/data/*.lua`.
- **O sprite é a fonte do design.** Os painéis de conceito que o usuário gerou por IA batem com os 13 chefes, mas divergem do sprite em alguns.

Como chegamos no Bloodfang (não repetir os erros):
1. Peças coladas em esferas, proporção de boneco: "amigável demais, redondo".
2. Facetas, espinhos e cabeça maior: "pior, desproporcional, nada parecido com o conceito".
3. Funcionou: medir as proporções no sprite e dar esqueleto próprio (`b.dims`), tronco e cabeça esculpidos como malha única (`sculpt`), membros como `lathe` com perfil de músculo, listras no shader (`b.fur`), e conferir sempre com o sprite ao lado.

**Feito depois do Bloodfang (branch `m0-kit-refs`):**
- `M0-01`: `chars.ts` foi dividido em `src/game/chars/`: `kit.ts` (primitivas, `Builder`, `body()`, acessórios e a escultura: `sculpt`, `ss`, `bell`, `grp`, `muscleArm`, `muscleLeg`, `torsoMesh`, `headBase`, `headMask`), `cast-heroes.ts`, `cast-enemies.ts`, `cast-bosses.ts` (uma receita por personagem), `build.ts` (ossos, malhas, materiais, `buildChar`) e `animate.ts` (`animateChar`). Os padrões de `torsoMesh`, `headBase` e `muscle*` são as medidas do Bloodfang; personagem novo passa só o que muda. A geometria de todos os personagens ficou idêntica (hash antes e depois).
- `M0-02`: `npm run refs` regrava `docs/ref/<id>.png` (37 sprites) e `_heroes.png`, `_enemies.png`, `_bosses.png` a partir do repo local do Dungeon Reign. A prévia já mostra a referência de qualquer id.
- `M1-01`: **acabamento do Bloodfang feito e aprovado pelo usuário.** Orelhas, tufos da bochecha, garras nas duas mãos, dedos nos pés, caveira com suturas, estrela na tanga. Caiu de 19,4 mil para cerca de 12 mil triângulos; o kit ganhou `stud` (esfera de 80 triângulos) para peças pequenas.

- `M1-02`: **Gravekeeper refeito a partir do sprite, em uso no jogo e aprovado pelo usuário.** Receita em `cast-bosses.ts`. É bípede com saia de manto por cima das pernas (o osso `skirt` agora existe também em bípedes), para os sapatos pisarem por baixo da barra rasgada. Pá e lanterna são giradas pelo inverso da pose de descanso para ficarem na vertical do mundo (`restArm` e `hang` do kit). Kit novo: `sculptTube`, `robeMesh` (saia com pregas e barra rasgada), `Builder.lights` (luz pontual presa a um osso) e `Builder.glowByVertex` (brilho na cor do vértice, para olhos verdes e lanterna âmbar no mesmo personagem). Conferido só na prévia; a luta na Cripta não foi jogada.
- `M1-04`: **Hollow King refeito a partir do sprite, em uso no jogo e aprovado pelo usuário.** Forma `robed` (flutua). Crânio esculpido, coroa, gola de pelo aberta na frente, costelas, saia com painel e debrum (`robeMesh` com `panel`), cajado com orbe e luz turquesa, chama na mão esquerda. Cerca de 8,5 mil triângulos. Conferido só na prévia.
- `M1-03`: **Ember Matriarch refeita a partir do sprite, em uso no jogo e aprovada pelo usuário.** Casca preta com rachaduras de lava no shader (`b.surface = "lava"`, material `lavaMaterial` em `build.ts`; quem usa `b.fur()` recebe esse material). Patas por cinemática inversa: a receita preenche `b.ikLegs` (encaixe, ponto de repouso, comprimentos, geometria ao longo de +z) e `stepLegs` em `animate.ts` prende o pé ao chão e dá a passada em dois grupos alternados; serve para o escorpião (`M10-01`). O abdômen fica no osso `tail`, o cabelo no osso `cape`. Cerca de 11 mil triângulos e 62 draw calls (cada pata são 4). A morte (patas encolhendo) só foi checada por números, sem olhar; a luta no Vulcão não foi jogada.
- `M1-05`: **presença de chefe feita; falta o usuário validar jogando.** Em `enemy.ts`: rugido (`roarT`, `startRoar`, `updateRoar`) ao entrar na luta e ao enfurecer, anel no chão (`makeBossRing` em `fx.ts`), brasas em fúria e `dissolve` na morte. Em `animate.ts`: `AnimState` ganhou `rage`, `roar` e `bossDeath`. Em `game.ts`: o portal e a escolha de relíquia ficam em `bossReward` e só saem quando o corpo do chefe é removido. Tempos em `TUNING.boss`. A prévia tem os botões Roar, Rage e Boss death. O M1 está completo.
- `M2-01`: **Varok refeito a partir do sprite, em uso no jogo e aprovado pelo usuário.** Receita em `cast-heroes.ts` (os outros 8 heróis seguem na versão antiga). Kit novo: `tubeMesh` (chifres), `capeMesh` (capa e tabardo de duas faces), `fist` (mão com dedos) e `Builder.weapon`: a arma ganha o osso `weapon` na mão direita, é modelada ao longo de -y, fica na rotação `carry` em descanso e alinha com o antebraço no golpe; a mão esquerda segue o cabo por cinemática inversa (bloco "arma de duas mãos" em `animate.ts`). Serve para cajados e outras armas de duas mãos. Cerca de 6,3 mil triângulos. Conferido só na prévia. Pendência para o M4: no jogo o herói ataca sem preparo, então a arma salta para cima no primeiro quadro do golpe.
- `M2-02`: **Seraph refeito a partir do sprite, em uso no jogo e aprovado pelo usuário.** Placa branca com debrum dourado, elmo fechado com asas, capa e tabardo azuis, espada erguida, escudo com cruz. Kit: `edge` e `dome` (lâminas de armadura), `plateMesh` (escudo) e o estilo `throwL` (arremesso com o braço esquerdo). Cerca de 5,8 mil triângulos. Conferido só na prévia.
- `M2-03`: **Kaelen refeito a partir do sprite e em uso no jogo; aprovado.** É o modelo de rosto humano e de cabelo para os próximos heróis, depois de uma primeira versão que o usuário reprovou (rosto triste, mechas parecendo chifres, faísca borrada): rosto com `sculpt` próprio (queixo afinado), olhos, sobrancelhas e boca na camada sem contorno (`b.flat`), cabelo só esculpido (maior que o crânio, encolhido no rosto, franja recortada, gomos nas costas), sem cones. As lições estão na seção 4.2 do roadmap. Casaco com aba (`robeMesh` com `panel`), capa com forro de outra cor, lâmina com fio aceso e faísca de arcos finos na mão esquerda. Cerca de 5,2 mil triângulos. Conferido só na prévia.
- `M2-04`: **Umbra refeita a partir do sprite e em uso no jogo; aprovada.** Trouxe o cachecol com física: `b.ribbons.push({ bone, at, len, seg, width, color, tip })` na receita cria uma fita simulada no mundo (`stepRibbons` em `animate.ts`), que cai, ondula, arrasta com o movimento e não atravessa o tronco nem o chão. Capuz com abertura afundada e a faixa de pele dos olhos como chapa sem contorno. Pano escuro precisa ser cinza-violeta, não preto, para a forma aparecer. Cerca de 5,5 mil triângulos. Conferido só na prévia; a colisão da fita usa um cilindro no tronco, então em poses extremas (morte, golpe muito inclinado) ela pode atravessar um braço.
- `M2-05`: **Zephyr refeito a partir do sprite e em uso no jogo; aprovado.** Poncho como malha única com `sculptTube` (barra em bico na frente e atrás, curta dos lados; padrão pintado por vértice) mais um `capeMesh` comprido atrás; chapéu esculpido; barba e sobrancelhas grisalhas. Atira só com a mão direita (`shoot`), com o segundo revólver no coldre. O coice do tiro foi reduzido para todos os atiradores. Cerca de 7,4 mil triângulos. Conferido só na prévia; com o braço erguido a ponta do ombro ainda aparece um pouco pela lateral do poncho.
- `M2-06`: **Ignis refeito a partir do sprite e em uso no jogo; aprovado.** Modelo para roupa aberta sobre pele: tronco nu esculpido e a roupa como a mesma forma um pouco maior, afundada onde a pele aparece (`trunk` na receita). Cabelo esculpido com pontas laranja e labaredas finas acesas; fogo no punho direito; faixa com uma ponta em fita com física. As chamas são paradas (animação de efeito fica para o M5) e a ponta da faixa na frente é rígida. Cerca de 8 mil triângulos. Conferido só na prévia.
- `M2-07`: **Aurelius refeito a partir do sprite e em uso no jogo; aprovado.** Chapéu pontudo com `tubeMesh` (serve para qualquer chapéu ou capuz em ponta), barba esculpida até a cintura, manto com `robeMesh` e barra dourada, mangas em sino, orbe pequeno com aros. Continua flutuando (`robed`). O orbe e os aros são parados e presos ao antebraço; girar e flutuar fica para o M5. Cerca de 6,2 mil triângulos. Conferido só na prévia.
- `M2-08`: **Frostine refeita a partir do sprite e em uso no jogo; aprovada.** Vestido em camadas com dois `robeMesh` e um `capeMesh` largo como babado atrás; coroa de cristais; cajado vertical com floco aceso. O anel de gelo no chão da ficha não foi feito (efeito de chão, M5). No golpe o braço do cajado sobe e o floco passa na frente do rosto. Cerca de 6,9 mil triângulos. Conferido só na prévia.
- `M2-09`: **Vesper refeita a partir do sprite, e as abelhas da Ninhada também; falta o usuário validar.** Manto em gomos listrados com `sculptTube`, capuz listrado com ponta e antenas, cajado com caveira. As abelhas são a receita `bee` (forma `bat`) e, em `game.ts`, cada uma é um `Rig` animado (`updateAllies`). Conferido só na prévia: **a Ninhada no jogo não foi jogada**, então altura de voo, tamanho e o bote ao ferroar ainda precisam ser vistos em partida.
- A prévia enquadra pela altura do personagem (`rig.height`); `dist` continua valendo.
- **Captura sem tela:** no console da prévia, `await __preview.shot("nome", { yaw: -30, anim: "attack", freeze: 0.6 })` grava `.shots/nome.png` (plugin de `vite.config.ts`, só no `npm run dev`). Usar quando o painel de navegador estiver oculto e a captura de tela falhar; depois abrir o arquivo com a ferramenta de leitura.
- No painel de navegador do Claude o jogo só avança com o painel visível; oculto, dá para avançar chamando `__game.frame(ts)` em laço pelo console.

Recursos opcionais do kit além da escultura: `Builder.dims`, `Builder.fur()` e `furMaterial`, `CharState.hipY`.

**2026-11-14, depois do merge do PR #3:** o usuário mostrou o Abyssal Garden (cena submarina procedural feita por um prompt com um crítico cego) e decidiu duas coisas:
- **Crítico cego (`M0-07`, feito):** subagente que só vê as capturas e o sprite, nunca o código. Rotina e texto em `docs/critic.md`; capturas com `await __preview.criticShots("critic-<id>")` na prévia (7 poses em `.shots/`). Entra no método (seção 4.1, passo 8): o usuário só vê uma versão depois que o crítico não aponta nada acima de "menor". Primeiro teste: no Kaelen (aprovado) e na Vesper (sem validação) ele apontou defeitos graves e concretos que batem com o sprite.
- **Novo marco M18, Atmosfera das zonas, antes do M3:** prévia de zona com poses fixas, sombra de nuvens, névoa baixa, raios de luz, densidade do chão, contato e cor, e uma passada por zona. Detalhes no roadmap.

**Vesper refeita com o crítico** (`M2-09`, 2ª versão, aprovada pelo usuário): seis rodadas, terminando sem nenhum grave. Lições da rodada em `docs/critic.md`: o crítico oscila em gosto, e peça fina precisa de volume.

**`M18-01` feito:** prévia de zona em `/zone.html` (`src/zone-preview.ts`) com 6 poses fixas para o crítico (`__zone.criticShots`), e a contagem de base de draw calls e triângulos por zona registrada no roadmap.

**`M18-02` feito:** sombra de nuvens em todos os materiais com luz (`applyClouds` em `shared.ts`, parâmetros `clouds` em `zones.ts`) e sol que varia devagar (`driftSun` em `world.ts`). **Decisão D11:** o Bosque fica sombrio (vale na passada `M18-07`).

**`M18-03` feito:** névoa de distância exponencial e névoa rasteira animada no shader (`atmosphere()` em `shared.ts`, parâmetros `haze` em `zones.ts`).

**`M18-04` feito:** feixes de luz e partículas no ar em camadas (`src/game/air.ts`, parâmetros `shafts` e `motes` em `zones.ts`).

**`M18-05` feito:** miudezas do chão (`src/game/scatter.ts`), manchas no chão e na grama (`STAIN_GLSL`) e copas mais vivas; parâmetros `scatter` e `stains` em `zones.ts`.

**`M18-06` feito:** sombra de contato no chão (canal G da máscara), oclusão por vértice na flora e correção de cor por zona (`grade` em `zones.ts`).

**`M18-07` feito e aprovado pelo usuário:** Bosque sombrio (D11), paleta de flora por zona, cogumelos acesos, fogueira mais forte. Pendências do crítico registradas no roadmap.

**`M18-08` feito e aprovado pelo usuário:** Cripta ao luar, lápides como decoração principal, árvores mortas e lápides com inclinação variada.

**`M18-09` feito e aprovado pelo usuário:** Vulcão em cinza e fumaça, rochas de basalto com rachaduras de lava no shader.

**`M18-10` feito e aprovado:** Vazio com cristais ciano sem estourar o bloom, paleta violeta, chão mais limpo. **O marco M18 está completo e aprovado**; as pendências de cada zona estão nas linhas `M18-07` a `M18-10` do registro.

**Desempenho (2026-11-14):** MSAA conforme a densidade e resolução adaptativa mirando 60 fps (`TUNING.frame`, F3 mostra o tempo de GPU e a escala). **Modo de teste ligado**: `TUNING.testBoost` dá dano ×2 e velocidade ×4 a todos os heróis, a pedido do usuário; voltar para 1 ao balancear.

**Marco M19 criado (2026-11-14), na frente do M3:** o usuário quer as técnicas, passivas e ataques básicos de cada herói iguais aos do Dungeon Reign (ex.: Glacial Wall e Estilhaçar da Frostine). Tarefas e fontes no roadmap, seção 5, M19. **D12 decidida:** spells em teclas (1 e 2), não automáticas; M6 vem logo depois do M19. **`M19-01` feito:** dados das técnicas e passivas em `src/data/techniques.ts`, núcleo em `src/core/techniques.ts` e `src/core/frost.ts`, com testes; o jogo ainda não usa. **`M19-02` feito, falta o usuário jogar:** Frostine com Glacial Wall (`src/game/icewall.ts`) e a passiva de gelo em `hitEnemy`. `Game.tech` tem os números da técnica do herói (`techniqueStats`); o padrão para os próximos heróis é: `kind` novo em `TechniqueKind`, texto e recarga vindos de `TECHNIQUES`, `case` em `useTechnique`. **`M19-03` feito, falta jogar:** Kaelen (Storm Step com rastro elétrico) e Aurelius (Time Rift em `src/game/rift.ts`). Rastros e fendas são atualizados em `updateZonesOfTech` (`game.ts`). **`M19-04` feito, falta jogar:** Zephyr (Fan the Hammer), Varok (Execution Leap com 8% da vida máxima) e Ignis (Inferno Charge com anel de fogo). **`M19-05` feito, falta jogar:** Umbra (Shadow Step e golpe pelas costas do original), Seraph (Aegis que bloqueia e cura no fim; cura a cada 4 arremessos) e Vesper (vespas do Brood e a Ninhada passiva). As técnicas antigas saíram de `game.ts`; os 9 heróis usam `techniqueStats`. **`M19-06` feito:** passiva e técnica de cada herói (textos do original) num bloco único na escolha de herói e na pausa; nome da técnica no HUD, embaixo do botão, com brilho quando pronta. **D2 decidida (2026-11-15): spells como no Dungeon Reign** (4 iniciais por herói, escolhe 1; o resto vem da loja). **`M6-00` feito:** a régua de paridade é `docs/paridade.md` mais `tests/parity.test.ts`, que lê os `.lua` do original pelo LuaJIT (`tools/dr-dump.lua`). Toda tarefa do M6 confere as linhas dela ali. **Pergunta aberta Q1** (em `docs/paridade.md`): save contínuo ou partidas com seed como no original; muda o fluxo da escolha de spell e da loja. **D13 decidida (2026-11-15): partidas como no Dungeon Reign.** Seed por partida, continuar no meio, morte encerra, sem equipamento, cada zona = 5 ondas (chefes nas ondas 5, 10, 15 e 20). `docs/design.md` foi reescrito; o marco **M20** (roadmap) faz a mudança e vem antes do M6; M8 cancelado; M7 vira a Magic Shop. **`M20-00` feito:** 29 linhas `R` na paridade; números em `src/data/run.ts`, fórmulas em `src/core/waves.ts`, conferidas contra o Lua onda a onda. **Q2 decidida:** a onda é como no original (cronometrada, inimigos chegando pelas bordas do trecho, Apressar); o ritmo se ajusta depois. **Q3 decidida:** esquiva e poção ficam por enquanto. **`M20-01` feito:** a partida existe em `src/core/run.ts` (`RunState`, `RunRng` com os 12 fluxos, `checkpoint`, `continueRun`, registros) e o save é v2 (`core/save.ts`: partida e registros; o save antigo é apagado com aviso). O jogo roda sobre a partida; o checkpoint é a entrada na zona até haver ondas. O que ainda é do jogo antigo (itens, atributos, zonas abertas, mortes) mora em `run.legacy` e sai no `M20-02` a `M20-04`. **`M20-02` feito, falta o usuário jogar:** cada zona = 5 ondas como no original. `worldgen` faz 5 clareiras no caminho (`ZoneLayout.segments`; a 5ª é a arena do chefe) e os acampamentos saíram. O ciclo da onda é puro em `src/core/wave.ts` (paridade com o Lua nas 3 dificuldades); em `game.ts`, `prepareWave` grava o checkpoint e as fases `walk` → `intro` → `fight` → `cleared` → `portal` (`updateWave`). Tecla H apressa a onda. Morrer recomeça a onda do checkpoint até o `M20-06`. A vida dos chefes ainda leva o corte antigo de 0,55 (`TUNING.boss.hpMult`) sobre a fórmula de lá, até haver melhorias e spells. Para testar sem jogar: no console, `__game.prepareWave(n)` pula para a onda n. **`M20-03` feito, falta jogar:** XP e melhorias como no original (`src/core/levelup.ts`, `src/data/upgrades.ts`). O nível fica pendente e as 3 cartas (com raridade e troca paga) abrem no fim da onda; saíram atributos, pontos, nível 60 e o crescimento por nível. Só saem as 16 melhorias que já têm efeito aqui; as outras ligam com spells (M6) e sinergias (M17). Para testar: `__game.gainXp(200)` no console e terminar a onda. **`M20-04` feito:** sem equipamento (itens, drops, mochila, `magicFind` e a relíquia do campeão saíram); a tela I é o status da partida (ficha, spells, melhorias, relíquias). O usuário disse que o equipamento pode voltar um dia, se encaixar com as relíquias. Próxima tarefa: `M20-05` (mapa da partida entre ondas). `M19-07` (evolução) espera a decisão D3.

Antes do M19, a sugestão era: o roadmap volta ao M3 (inimigos atuais), agora com o crítico cego e a prévia de zona para conferir os inimigos no cenário. Antes, vale jogar uma volta completa para sentir as quatro zonas novas em movimento (nada do M18 foi conferido em vídeo nem jogando). Cada passada tem as pendências do crítico nas linhas `M18-03` a `M18-06` do registro. Os defeitos que o crítico achou no Kaelen (lâmina ciano no peito, franja, forro da capa, espada sumindo no golpe) ficam para o usuário decidir se reabre. Continuam pendentes: retorno sobre a presença de chefe (`M1-05`), `M2-10` e `M0-03`.

Decisões desta conversa:
- **Base em inglês:** nomes, ids e código seguem o Dungeon Reign. Se os textos do jogo também passam a inglês é a decisão D1 do roadmap, ainda sem resposta.
- **Modelos gerados por IA (Meshy, Hunyuan3D) foram considerados e descartados**; a arte segue por código.
- Placa do usuário: Radeon RX 9060 XT. O fps real ainda não foi medido (`M16-01`).
- As decisões D1 a D10 do roadmap estão sem resposta; as tarefas que dependem delas não começam antes.

## Pedido original (parcialmente superado pelo bloco acima)
O usuário pediu, nesta ordem:

1. **Montar um plano detalhado de todas as melhorias do jogo** (documento em `docs/`, aprovado por ele antes de implementar).
2. **A primeira etapa do plano é arte: personagens mais legíveis.** Usar os sprites do Dungeon Reign como referência e escrever um **design de modelo 3D por personagem**, para depois gerar por código. O design vem antes do código.

Como fazer a etapa 2 (sugestão, confirmar com o usuário):
- Anexar o repo `Victorhugofoc/dungeon-idle` em modo leitura. As referências estão em `assets/characters/<herói>/<herói>_sheet.png`, `assets/enemies/{basic,ranged,elite,special,bosses}/*_sheet.png` (quadros de 96×96; chefes 192×160; linha 0 = parado). Montar uma folha de contato com o primeiro quadro de cada um é barato e basta para ler os designs.
- Para cada personagem, uma ficha curta: silhueta (o que o identifica de longe e de cima), 3 a 5 peças marcantes, paleta (3 a 5 cores do sprite), proporções, arma e como segura, estilo de ataque, o que se mexe sozinho (capa, cauda, cabelo).
- **Legibilidade é o critério.** A câmera é alta e os personagens ocupam ~60 a 90 px de altura na tela. O que conta: silhueta distinta, cabeça/chapéu/ombros/arma exagerados, contraste com o chão de cada bioma, cor de time (herói x inimigo x campeão x chefe). Detalhe fino de rosto não aparece.
- Só depois refazer `src/game/chars.ts` seguindo as fichas, conferindo cada personagem por captura (ver "Como conferir arte").

Retorno do usuário que motiva isso (em ordem):
- Blocos iniciais: "não parecem em nada com o Dungeon Reign".
- 0.2 (modelos articulados): "melhorou, mas os mobs ainda não têm um visual bacana, parece tudo meio Roblox demais, não tem física nos movimentos, parecem stick man".
- 0.3 (anatomia + molas): **ainda não avaliada por ele.** Perguntar o que achou antes de planejar em cima.

## O que é
RPG de ação para PC no navegador (three.js + TypeScript + Vite). Um herói, mapas abertos procedurais, loot, relíquias, um chefe por zona até o chefe final. Formato de referência: Minecraft Dungeons. Conteúdo vem do Dungeon Reign (`dungeon-idle`, LÖVE/Lua).

O projeto anterior deste repo (Covil, Godot) foi descartado; o histórico está no git até `47749e3`.

## Decisões do usuário (não reabrir sem ele pedir)
- Plataforma: PC, teclado e mouse.
- ~~Progressão persistente (um save contínuo), não runs.~~ Substituída em 2026-11-15 pela D13: partidas como no Dungeon Reign, sem equipamento.
- **Toda a arte é gerada por código, em 3D.** Sem sprites nem modelos importados. Ele testou sprites do Dungeon Reign no cenário 3D e blocos; descartou os dois. Referência de ambição dele: um simulador de voo procedural em three.js com terreno e nuvens volumétricas.
- Ele faz o push, o PR e o merge; eu só faço commit local no branch de trabalho (nunca `git push`).
- Conversa longa gasta muito contexto: preferir sessões curtas com handoff atualizado.

## Estado do jogo — versão 0.3 mais o Bloodfang novo (jogável do início ao chefe final)
- **Heróis:** os 9 do Dungeon Reign, um por save, cada um com ataque e técnica próprios (`src/data/heroes.ts`).
- **Zonas:** 4 mapas de 240×240 gerados por seed (Bosque, Cripta, Vulcão, Vazio), ~24 acampamentos, caminho até a arena, chefe (Bloodfang, Gravekeeper, Ember Matriarch, Hollow King). Viajar gera mapa novo.
- **Inimigos:** 10 tipos, 5 comportamentos (corpo a corpo, à distância, investida, invocador, morteiro), campeões.
- **Chefes:** 7 padrões telegrafados e fúria aos 30% de vida. Vida já reduzida em 45% a pedido (`TUNING.boss.hpMult`).
- **Progressão (D13):** partida com seed, 20 ondas, nível com 3 melhorias por nível, 20 relíquias (1 de 3 por chefe), sem equipamento. Checkpoint em `localStorage`.
- **Arte por código:** personagens articulados com contorno e luz de recorte, animação por molas, chão com shader, grama com vento, flora em 3 variantes, bloom e correção de cor por zona, partículas de luz.
- 21 testes do núcleo (`npm test`).

Retorno do usuário sobre jogabilidade (jogou a 0.1): "a gameplay aparentemente está legal, mas o boss tem muita vida" (corrigido).

## Mapa do código
| Onde | O quê |
|---|---|
| `src/core/` | Lógica pura, testada: `rng`, `stats`, `run`, `wave`, `waves`, `levelup`, `worldgen`, `save` |
| `src/data/` | Conteúdo e balanceamento: `heroes`, `enemies` (inclui chefes), `zones`, `relics`, `tuning` |
| `src/game/game.ts` | Loop, herói, combate, loot, progressão, troca de zona |
| `src/game/enemy.ts` | IA dos inimigos e padrões dos chefes |
| `src/game/chars/` | **Personagens**: `kit.ts` (primitivas, `body()`, escultura), `cast-*.ts` (receita de cada um), `build.ts` (`buildChar`, `kickRig`), `animate.ts` (`animateChar`, molas) |
| `src/game/flora.ts`, `world.ts` | Flora por código; chão, grama, montagem da zona |
| `src/game/fx.ts` | Partículas, pontos de luz, telegrafias, meia-lua do golpe, números de dano |
| `src/game/render.ts`, `shared.ts` | Pós-processamento; uniforms de vento e do recorte que revela o herói |
| `src/game/models.ts` | Interface `Rig` e o construtor antigo de blocos (só serve de fallback; pode ser removido) |
| `src/ui/` | Interface em DOM: título, HUD, status da partida (I), melhorias, relíquias, pausa |

## Como rodar e conferir
- `npm install` · `npm run dev` · `npm test` · `npx tsc --noEmit`.
- `SINGLE=1 npx vite build` gera `dist-single/index.html` (jogo inteiro em um arquivo).
- **Como conferir arte:** `npx vite build && npx vite preview --port 4173`, depois Playwright com Chromium e `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`. No console há `__game`, `__rig(id, kind, champion)` e `__anim(rig, estado)` para montar um elenco parado e capturar; `__game.zoom` aproxima a câmera. Renderiza certo, mas a poucos quadros por segundo: **não serve para medir desempenho nem para ver movimento**.
- Versão jogável publicada para o usuário: artifact `https://claude.ai/artifact/TtNw79t7ckCEh5csU4T8cc` (republicar passando essa URL; o arquivo publicado é o `dist-single/index.html` sem as tags `html/head/body`, só `<title>`, `<style>`, o corpo e o `<script>`).

## O que NÃO foi validado
- **Movimento e sensação da 0.3:** só vi quadros parados. O usuário precisa dizer se a animação ainda parece de boneco.
- **Desempenho numa GPU real:** nunca medido. Pedir o fps (F3) e a placa. O contorno desenha cada personagem duas vezes; a grama são ~70 mil lâminas; a pausa tem qualidade baixa/média/alta.
- **Balanceamento:** primeira passada, nunca jogado de ponta a ponta. Números em `src/data/tuning.ts` e `enemies.ts`. O empurrão dos golpes (`TUNING.enemy.knockback`) é chute.

## Insumos para o plano de melhorias
Arte (o usuário quer começar por aqui):
- Personagens mais legíveis, a partir de fichas de design (ver topo). Os mais fracos hoje: morcego e gosma (os 4 chefes já foram refeitos).
- Efeitos das técnicas dos heróis e dos ataques de chefe; as telegrafias ainda são discos vermelhos lisos.
- Relevo: o chão é plano. Colinas, penhascos na borda do mapa, água.
- Interface: ícones são emoji; itens e relíquias não têm ícone próprio.
- Animações que faltam: levar dano com pose própria, esquiva, técnica de cada herói.

Jogo:
- Heróis têm 1 técnica cada; as spells do Dungeon Reign (Fireball, Blade Orbit...) não foram portadas.
- Sem ouro, loja, nem desmontar item (só descartar).
- Faltam 5 inimigos do original (shieldbearer, hexer, plaguebearer, warden, leaper) e 9 dos 13 chefes.
- Nada depois do chefe final (dificuldades, zonas novas).
- Sem gamepad, sem música, sem tela de opções de som e teclas.

Técnico:
- Sem CI e sem hospedagem (GitHub Pages ou itch.io a decidir).
- `models.ts` ainda carrega o construtor de blocos antigo.
- O `CLAUDE.md` antigo citava ferramentas do Windows do usuário; o atual só tem comandos `npm`.

## Pendências com o usuário
- As decisões D1 a D10 de `docs/roadmap.md` (seção 8).
- Medir o fps no jogo com F3 (`M16-01`).
- Nome definitivo do jogo ("Dungeon Reign RPG" é provisório) e se o repo `pocket-dungeon` continua sendo a casa dele.
- Onde hospedar a versão jogável.
