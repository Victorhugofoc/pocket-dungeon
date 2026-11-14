# Dungeon Reign RPG — handoff

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
- `M2-01`: **Varok refeito a partir do sprite e em uso no jogo; falta o usuário validar.** Receita em `cast-heroes.ts` (os outros 8 heróis seguem na versão antiga). Kit novo: `tubeMesh` (chifres), `capeMesh` (capa e tabardo de duas faces), `fist` (mão com dedos) e `Builder.weapon`: a arma ganha o osso `weapon` na mão direita, é modelada ao longo de -y, fica na rotação `carry` em descanso e alinha com o antebraço no golpe; a mão esquerda segue o cabo por cinemática inversa (bloco "arma de duas mãos" em `animate.ts`). Serve para cajados e outras armas de duas mãos. Cerca de 6,3 mil triângulos. Conferido só na prévia. Pendência para o M4: no jogo o herói ataca sem preparo, então a arma salta para cima no primeiro quadro do golpe.
- A prévia enquadra pela altura do personagem (`rig.height`); `dist` continua valendo.
- No painel de navegador do Claude o jogo só avança com o painel visível; oculto, dá para avançar chamando `__game.frame(ts)` em laço pelo console.

Recursos opcionais do kit além da escultura: `Builder.dims`, `Builder.fur()` e `furMaterial`, `CharState.hipY`.

Próxima sessão (sugestão do roadmap): retorno do usuário sobre a presença de chefe e sobre o Varok, depois `M2-02` (Seraph); `M0-03` ainda pendente.

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
- Progressão persistente (um save contínuo), não runs.
- **Toda a arte é gerada por código, em 3D.** Sem sprites nem modelos importados. Ele testou sprites do Dungeon Reign no cenário 3D e blocos; descartou os dois. Referência de ambição dele: um simulador de voo procedural em three.js com terreno e nuvens volumétricas.
- Ele faz o push, o PR e o merge; eu só faço commit local no branch de trabalho (nunca `git push`).
- Conversa longa gasta muito contexto: preferir sessões curtas com handoff atualizado.

## Estado do jogo — versão 0.3 mais o Bloodfang novo (jogável do início ao chefe final)
- **Heróis:** os 9 do Dungeon Reign, um por save, cada um com ataque e técnica próprios (`src/data/heroes.ts`).
- **Zonas:** 4 mapas de 240×240 gerados por seed (Bosque, Cripta, Vulcão, Vazio), ~24 acampamentos, caminho até a arena, chefe (Bloodfang, Gravekeeper, Ember Matriarch, Hollow King). Viajar gera mapa novo.
- **Inimigos:** 10 tipos, 5 comportamentos (corpo a corpo, à distância, investida, invocador, morteiro), campeões.
- **Chefes:** 7 padrões telegrafados e fúria aos 30% de vida. Vida já reduzida em 45% a pedido (`TUNING.boss.hpMult`).
- **Progressão:** nível até 60, 4 atributos, equipamento em 3 espaços com 5 raridades e 16 afixos, 20 relíquias (1 de 3 por chefe). Save em `localStorage`.
- **Arte por código:** personagens articulados com contorno e luz de recorte, animação por molas, chão com shader, grama com vento, flora em 3 variantes, bloom e correção de cor por zona, partículas de luz.
- 21 testes do núcleo (`npm test`).

Retorno do usuário sobre jogabilidade (jogou a 0.1): "a gameplay aparentemente está legal, mas o boss tem muita vida" (corrigido).

## Mapa do código
| Onde | O quê |
|---|---|
| `src/core/` | Lógica pura, testada: `rng`, `stats`, `items`, `worldgen`, `save` |
| `src/data/` | Conteúdo e balanceamento: `heroes`, `enemies` (inclui chefes), `zones`, `relics`, `tuning` |
| `src/game/game.ts` | Loop, herói, combate, loot, progressão, troca de zona |
| `src/game/enemy.ts` | IA dos inimigos e padrões dos chefes |
| `src/game/chars/` | **Personagens**: `kit.ts` (primitivas, `body()`, escultura), `cast-*.ts` (receita de cada um), `build.ts` (`buildChar`, `kickRig`), `animate.ts` (`animateChar`, molas) |
| `src/game/flora.ts`, `world.ts` | Flora por código; chão, grama, montagem da zona |
| `src/game/fx.ts` | Partículas, pontos de luz, telegrafias, meia-lua do golpe, números de dano |
| `src/game/render.ts`, `shared.ts` | Pós-processamento; uniforms de vento e do recorte que revela o herói |
| `src/game/models.ts` | Interface `Rig` e o construtor antigo de blocos (só serve de fallback; pode ser removido) |
| `src/ui/` | Interface em DOM: título, HUD, inventário, mapa, pausa |

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
