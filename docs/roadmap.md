# Dungeon Reign RPG — roadmap de implementação

Escrito em 2026-11-13, sobre a versão 0.3 mais o redesenho do Bloodfang. Este documento é o plano de trabalho das próximas conversas: cada tarefa cabe em uma sessão ou menos e pode ser feita, conferida e commitada sozinha.

`HANDOFF.md` diz **onde estamos**. Este arquivo diz **o que falta e como fazer**. `docs/design.md` diz **o que o jogo é**; mudanças nele são confirmadas com o usuário antes.

---

## 0. Como usar este documento

### 0.1 Rotina de cada sessão
1. Ler `HANDOFF.md` e a seção 9 (registro de progresso) deste arquivo.
2. Escolher a próxima tarefa `pendente` cujas dependências estejam `feito`, seguindo a ordem da seção 3. Se o usuário pedir outra coisa, a ordem dele vale.
3. Fazer **uma** tarefa. Se ela crescer além do previsto, dividir e registrar as partes aqui antes de continuar.
4. Conferir: `npx tsc --noEmit`, `npm test`, e no navegador (prévia ou jogo) quando a mudança for visível.
5. Mostrar ao usuário o que ele precisa validar (toda tarefa marcada **[validar]**) antes de seguir para a próxima que dependa dela.
6. Atualizar o status na seção 9, o `HANDOFF.md`, e fazer commit local no branch de trabalho. O usuário faz push, PR e merge.

### 0.2 Formato das tarefas
- **ID:** `M<marco>-<nº>`. Não renumerar; tarefas novas ganham o próximo número do marco.
- **Tamanho:** `P` = parte de uma sessão · `M` = uma sessão · `G` = duas ou mais (dividir antes de começar).
- **Pronto quando:** critério observável. Sem ele a tarefa não está pronta.
- **[validar]:** precisa do olho do usuário (arte, sensação, balanceamento). **[decisão Dn]:** depende de uma decisão da seção 8.

### 0.3 Regras que valem para todas
- Arquitetura do `CLAUDE.md`: `src/core` puro e testado, números em `src/data`, tempo real em `src/game`, interface em `src/ui`.
- Nomes, ids e código em inglês, iguais aos do Dungeon Reign (`dungeon-idle/src/data/*.lua`).
- Toda a arte é gerada por código. O sprite do Dungeon Reign é a fonte do design de cada personagem.
- Nada de número de balanceamento em `src/game`.
- Toda lógica nova em `src/core` entra com teste.

---

## 1. Onde estamos (0.3 + Bloodfang)

Jogável do início ao chefe final: 9 heróis com 1 técnica cada, 4 zonas de 240×240, 10 inimigos com 5 comportamentos, 4 chefes com 7 padrões e fúria, nível até 60, 4 atributos, 3 espaços de equipamento com 5 raridades e 16 afixos, 20 relíquias, save em `localStorage`.

O que mais pesa hoje, em ordem:
1. **Personagens:** só o Bloodfang segue o design do Dungeon Reign. Os outros 22 ainda são a versão "boneco".
2. **Efeitos e leitura de combate:** telegrafias são discos lisos; técnicas e ataques de chefe quase não têm efeito próprio.
3. **Profundidade de jogo:** 1 técnica por herói, sem spells, sem ouro, sem loja, nada depois do chefe final.
4. **Conteúdo:** faltam 5 inimigos, 9 chefes, 74 relíquias, afixos de elite, sinergias, eventos.
5. **Nunca medido:** desempenho em GPU real e balanceamento de ponta a ponta.

Conteúdo disponível no Dungeon Reign para portar: 11 spells, 13 chefes (cada um com mecânica própria) e cerca de 35 padrões de ataque, 15 inimigos, 10 afixos de elite, 94 relíquias, 23 sinergias, 17 eventos, loja, 3 dificuldades, Depths (5 mutações) e 8 pactos.

---

## 2. Aonde chegar (1.0)

Um RPG de ação de 8 a 12 horas na primeira passada, com rejogabilidade por dificuldade:
- 9 heróis reconhecíveis à primeira vista, cada um com ataque, técnica e 2 spells equipáveis.
- 6 biomas com relevo, 13 chefes com mecânica própria, 15 inimigos e elites com afixo.
- Ouro, mercador e ferreiro na fogueira; itens lendários com efeito; cerca de 90 relíquias com sinergias.
- Depois do chefe final: dificuldades e Depths com mutações.
- Roda a 60 fps em placa intermediária, com opções de vídeo, som e teclas, e publicado em uma página.

---

## 3. Ordem dos marcos

| Ordem | Marco | Por quê nesta posição |
|---|---|---|
| 1 | M0 Fundação e ferramentas | Barateia todo o resto (prévia, kit de modelagem, medição) |
| 2 | M1 Chefes atuais | Maior ganho visual; valida o método em corpos difíceis (manto, aranha) |
| 3 | M2 Heróis | O jogador olha para o herói o tempo todo |
| 4 | M18 Atmosfera das zonas | Decidido em 2026-11-14: na câmera alta, o ambiente pesa mais na primeira impressão que o detalhe de cada personagem, e custa bem menos |
| 5 | M3 Inimigos atuais | Fecha o elenco que já está no jogo |
| 6 | M4 Animação e sensação | Corpo novo pede movimento à altura |
| 7 | M5 Efeitos de combate | Leitura das lutas; pré-requisito para spells e chefes novos |
| 8 | M6 Spells | Maior ganho de profundidade por tarefa |
| 9 | M7 Economia | Dá destino ao loot e ao tempo de farm |
| 10 | M8 Itens | Lendários e ícones, em cima da economia |
| 11 | M9 Inimigos novos e elites | Variedade antes de abrir zonas novas |
| 12 | M11 Mundo: relevo e biomas | Casa para os 9 chefes que faltam |
| 13 | M10 Chefes novos | Um por tarefa, cada um com sua mecânica |
| 14 | M12 Relíquias e sinergias | Escala o que já existe |
| 15 | M13 Endgame | Dificuldades, Depths, pactos |
| 16 | M14 Interface · M15 Áudio | Intercalar: uma tarefa destas a cada 3 ou 4 das outras |
| 17 | M16 Técnico · M17 Balanceamento | `M16-01` e `M17-01` cedo; o resto conforme a necessidade |

Marcos de arte (M1 a M3) e de jogo (M6 em diante) não dependem um do outro. Se o usuário cansar de arte, pular para M6 é válido.

---

## 4. Método de modelagem de personagem

Vale para todas as tarefas de M1, M2, M3, M9 e M10. Foi o que funcionou no Bloodfang depois de duas tentativas ruins.

### 4.1 Passos
1. **Referência:** gerar `docs/ref/<id>.png` (quadro 0 da folha do sprite, ampliado 3×) e abrir a folha inteira para ver ataque e morte.
2. **Medir no sprite:** altura total, largura dos ombros, tamanho da cabeça, comprimento de braço e perna, em pixels. Converter para `b.dims` (esqueleto próprio). Cabeça, ombros e arma seguem a proporção medida; **não exagerar**.
3. **Listar de 4 a 6 peças que identificam o personagem** (ver seção 7) e as 5 a 7 cores do sprite.
4. **Massas principais como malha única:** tronco e cabeça com `sculpt` (esfera deformada por função, cor por vértice). Membros com `lathe` de perfil anatômico.
5. **Padrões de superfície no shader ou na cor por vértice** (listras, manchas, runas), nunca com peças coladas.
6. **Acessórios** como geometria simples por cima.
7. **Conferir na prévia** com o sprite ao lado: de frente, três quartos, costas e câmera do jogo; depois Walk e as fases do Attack com `freeze`.
8. **Crítico cego** (`docs/critic.md`): `__preview.criticShots("critic-<id>")` e um subagente que só vê as capturas e o sprite. Corrigir e repetir com um subagente novo até não sobrar nada acima de "menor".
9. **[validar]** com o usuário antes de trocar no jogo, mostrando as capturas e a última lista do crítico.

### 4.2 O que não fazer
- Esferas e caixas coladas: fica "boneco" e "amigável demais".
- Trocar a linguagem de formas do sprite (facetas, espinhos) ou aumentar a cabeça: fica "desproporcional, nada parecido".
- Seguir os painéis de conceito gerados por IA quando divergem do sprite.
- `atan(x, z)` no shader sem desvio: no polo dá NaN e o bloom espalha um bloco preto.
- Peça pequena com contorno no rosto (sobrancelha, boca): o contorno preto a transforma em risco. Usar `b.flat`, que não desenha contorno.
- Sobrancelha inclinada com a ponta de fora mais baixa: o personagem fica triste. Ponta de dentro mais baixa = decidido.
- Mecha de cabelo em cone solto: de frente parece chifre, de costas parece prego. Dar volume e franja na própria malha esculpida.
- Peça acesa grande ou luz pontual junto do corpo: o bloom vira um borrão e tinge o rosto. Brilho em peças finas.
- Normal nula (triângulo degenerado de `ExtrudeGeometry`): normalizar dá NaN no contorno e na luz de recorte, com o mesmo bloco preto, intermitente. `fuse` em `build.ts` conserta ao juntar as peças; malha criada fora dele precisa do mesmo cuidado.

### 4.3 Orçamento por personagem
Até cerca de 12 mil triângulos para chefe, 6 mil para herói, 3 mil para inimigo comum (aparecem dezenas na tela). Medir com `renderer.info` na prévia (`M0-03`).

---

## 5. Marcos e tarefas

### M0 — Fundação e ferramentas

**M0-01 · Kit de modelagem compartilhado** · M
- Objetivo: tirar de dentro do `bloodfang` o que os próximos vão reutilizar.
- Arquivos: `src/game/chars/` (dividido em `kit.ts`, `cast-*.ts`, `build.ts`, `animate.ts`).
- Passos: extrair `sculpt`, `ss`, `bell`, `grp`; criar `muscleArm`, `muscleLeg`, `torsoMesh(opts)` e `headBase(opts)` parametrizados; manter o Bloodfang visualmente idêntico.
- Pronto quando: captura do Bloodfang antes e depois é igual; os outros personagens não mudam; tipos e testes passam.

**M0-02 · Folhas de referência no repo** · P
- Objetivo: ter todos os sprites de referência à mão.
- Passos: script `tools/make-refs.mjs` (ou PowerShell) que lê `dungeon-idle/assets` e grava `docs/ref/<id>.png` para os 9 heróis, 15 inimigos e 13 chefes, mais `docs/ref/_heroes.png`, `_enemies.png`, `_bosses.png` (folhas de contato).
- Pronto quando: os 37 arquivos existem e a prévia mostra a referência de qualquer id.

**M0-03 · Prévia: elenco, contagem e captura** · M
- Arquivos: `src/preview.ts`, `preview.html`.
- Passos: seletor de personagem (lista do `CAST`); modo "lineup" com vários ids em fila; painel com triângulos e draw calls; botão de fase do ataque (windup, golpe, retorno) e de morte; fundo com o chão de cada zona (cores de `ZONES`) para testar contraste; tecla que baixa PNG.
- Pronto quando: dá para abrir qualquer personagem, ver cada animação parada e ler a contagem de triângulos.

**M0-04 · Remover o construtor de blocos antigo** · P
- Arquivos: `src/game/models.ts`, `src/game/rigs.ts`.
- Passos: mover `Rig`, `AnimState`, `flashRig` e afins para onde são usados; apagar `buildRig` e o fallback; `characterRig` passa a falhar alto se o id não existir.
- Pronto quando: o jogo roda igual e `models.ts` só tem tipos e utilitários vivos.

**M0-05 · Integração contínua** · P
- Passos: workflow do GitHub Actions com `npm ci`, `npx tsc --noEmit`, `npm test`, `npx vite build`.
- Pronto quando: um PR mostra o resultado dos quatro passos.

**M0-06 · Captura automática do elenco** · M
- Objetivo: detectar regressão visual sem olhar um por um.
- Passos: script Playwright (Chromium com `--use-angle=swiftshader`) que abre a prévia em lineup e salva `reports/cast-<data>.png`. Rodar antes de cada commit de arte.
- Pronto quando: um comando gera a imagem com todo o elenco.

**M0-07 · Crítico cego** · P
- Objetivo: um olhar que não conhece o código, antes do olhar do usuário. Ideia tirada do projeto Abyssal Garden, que iterou contra um crítico que só via as capturas.
- Arquivos: `docs/critic.md` (rotina e texto do subagente), `__preview.criticShots` em `src/preview.ts` (7 poses fixas).
- Pronto quando: o crítico, rodado num herói já aprovado, aponta defeitos concretos que batem com o que o usuário veria.

### M1 — Chefes atuais [validar cada um]

**M1-01 · Bloodfang: acabamento** · P
- Passos: orelhas menores e achatadas; tufos da bochecha como leque curto em vez de cones; dedos e garras nas duas mãos, pés com dedos; costas da caveira com sutura e nuca; estrela na tanga (cor por vértice).
- Pronto quando: usuário aprova de frente e de costas.

**M1-02 · Gravekeeper** · M
- Design: seção 7.3. Corpo `robed`. Capuz como `sculpt` com abertura escura e dois olhos acesos; manto rasgado com barra irregular (vértices da barra deslocados); pá na mão direita, lanterna na esquerda com luz pontual fraca e brilho.
- Pronto quando: lê como coveiro encapuzado na câmera do jogo; lanterna ilumina o chão.

**M1-03 · Ember Matriarch** · G (dividir: abdômen e patas · torso e cabeça)
- Design: aranha com torso de mulher. Abdômen como `sculpt` com rachaduras de lava no shader (ruído celular emissivo); 8 patas de 3 segmentos com cinemática simples (pé preso ao chão em passada alternada); torso esguio com cabelo em espinhos; braços em pose de conjuração.
- Arquivos: `chars.ts` (forma `spider`), animação das patas em `animateChar`.
- Pronto quando: as patas não escorregam ao andar e as rachaduras brilham com o bloom.

**M1-04 · Hollow King** · M
- Design: lich de caveira (não o velho barbudo dos painéis). Crânio com `sculpt` (órbitas fundas, mandíbula), coroa alta de pontas, gola de pelo, manto roxo com barra dourada, costelas à mostra no peito, cajado com crescente e orbe turquesa emissivo, mão esquerda aberta com chama.
- Pronto quando: silhueta de coroa e cajado lê de cima; orbe e olhos brilham.

**M1-05 · Presença de chefe** · M
- Passos: entrada (rugido com tremor de câmera e onda no chão), anel no chão com a cor do chefe, postura diferente na fúria (cor emissiva pulsando, respiração mais rápida), morte própria (cai de joelhos, dissolve em partículas).
- Arquivos: `enemy.ts`, `fx.ts`, `animateChar`.
- Pronto quando: dá para dizer "é um chefe" e "está em fúria" sem ler a barra de vida.

### M2 — Heróis [validar cada um]

Uma tarefa `M` por herói, na ordem abaixo (do mais simples de corpo para o mais difícil). Design na seção 7.1. Todos ganham: rosto com `headBase`, mãos com dedos, arma com forma própria, peça que se mexe sozinha (capa, cachecol, barba, poncho).

| ID | Herói | Ponto de atenção |
|---|---|---|
| M2-01 | varok | Armadura de placas em camadas, elmo com chifres, maça de duas mãos, capa vermelha |
| M2-02 | seraph | Placa branca e dourada, escudo grande, espada erguida, capa azul |
| M2-03 | kaelen | Casaco longo azul-marinho, capa vermelha, lâmina fina; corpo esguio |
| M2-04 | umbra | Preto com filetes magenta, cachecol longo com física, adagas |
| M2-05 | zephyr | Chapéu, poncho verde-azulado com barra, revólver, barba branca |
| M2-06 | ignis | Cabelo de chama (emissivo), gi preto, faixa vermelha, chama na mão |
| M2-07 | aurelius | Chapéu pontudo torto, barba longa, manto roxo com barra dourada, orbe flutuante |
| M2-08 | frostine | Vestido em camadas, coroa de gelo, cajado de floco, anel de gelo no chão |
| M2-09 | vesper | Manto listrado de abelha com capuz e antenas, cajado com caveira; refazer as abelhas da Ninhada |

**M2-10 · Tela de seleção com os heróis novos** · P
- Passos: a tela de título mostra o herói 3D girando (reaproveitar a prévia) em vez de só texto.

### M3 — Inimigos atuais [validar em lote de 2 ou 3]

Uma tarefa `M` para cada par. Design na seção 7.2. Atenção ao orçamento de triângulos: são dezenas na tela.

| ID | Inimigos | Ponto de atenção |
|---|---|---|
| M3-01 | goblin, orc | Mesma família (pele verde); goblin pequeno e curvado, orc largo com ombreira |
| M3-02 | swarm, splitter | Não humanoides: morcego com asas de membrana; gosma translúcida com ossos dentro |
| M3-03 | archer, assassin | Esqueleto com manto; ninja com máscara de raposa |
| M3-04 | spellcaster, summoner | Mantos; coroa de cristal; cabelo longo e livro |
| M3-05 | bombardier, berserker | Anões largos; barril e bomba; machados duplos |
| M3-06 | Campeões e invocados | Campeão com aura e peça dourada em vez da coroa flutuante; invocado com tom espectral |

### M4 — Animação e sensação de jogo

**M4-01 · Reação a dano** · M
- Passos: novo estado `hurt` (0..1) em `AnimState`; tronco recua na direção do golpe, cabeça chicoteia, braços abrem; para chefes só um tranco curto. Ligar em `hurtPlayer` e `damageEnemy`.
- Pronto quando: cada golpe tem resposta visível sem interromper a IA.

**M4-02 · Esquiva com pose** · P
- Passos: rolamento ou deslize conforme o herói (`dashStyle` em `heroes.ts`: `roll`, `slide`, `blink`); rastro em `fx.ts`.

**M4-03 · Animação por técnica** · G (3 heróis por sessão)
- Passos: cada `kind` de técnica ganha preparo e execução próprios em `animateChar` (salto do Varok com queda, giro do Zephyr, égide do Seraph com escudo erguido).
- Pronto quando: dá para reconhecer a técnica pelo corpo, sem o efeito.

**M4-04 · Combos do ataque básico** · M
- Passos: 3 variações de golpe por estilo (`swing`: horizontal, diagonal, estocada final), alternadas por `shot`; o terceiro golpe com mais empurrão. Números em `tuning.ts`.

**M4-05 · Morte por tipo** · P
- Passos: esqueleto desmonta em ossos, gosma derrete, morcego cai girando; os demais mantêm a queda atual.

**M4-06 · Câmera e impacto** · P
- Passos: tremor proporcional ao dano, `hitstop` só em crítico e golpe pesado, leve aproximação na morte de chefe. Opção para reduzir tremor (`M14-05`).

**M4-07 · Detalhes de locomoção** · P
- Passos: poeira nos passos por tipo de chão, pegada na neve e na cinza, grama abrindo ao passar (uniform em `shared.ts`).

### M5 — Efeitos de combate

**M5-01 · Telegrafias com forma e tempo** · M
- Passos: shader próprio em `fx.ts` para círculo, linha, cone e anel: borda nítida, preenchimento que cresce até o impacto, cor por tipo de dano. Substituir os discos lisos em `enemy.ts`.
- Pronto quando: o momento do impacto é previsível só pelo desenho no chão.

**M5-02 · Biblioteca de efeitos** · M
- Passos: em `fx.ts`, primitivas reutilizáveis: `burst`, `ring`, `beam`, `trail`, `pillar`, `groundCrack`, `orbit`; todas com cor, duração e curva. Sem lógica de jogo.

**M5-03 · Efeito das 9 técnicas** · G (3 por sessão)
- Passos: montar cada técnica com as primitivas de `M5-02` (Nova Glacial: anel de gelo e cristais no chão; Salto de Execução: cratera e onda).

**M5-04 · Efeitos dos padrões de chefe** · G
- Passos: um visual por padrão existente (slam, charge, nova, summon e os demais em `enemy.ts`), com som.

**M5-05 · Estados visíveis** · P
- Passos: queimando (brasas), congelado (casca azul e lentidão visível), envenenado (bolhas verdes), marcado; ícone pequeno sobre a barra de vida.

**M5-06 · Projéteis com identidade** · P
- Passos: flecha, bala, orbe arcano, bomba em arco com sombra; rastro por tipo. Hoje são esferas coloridas.

**M5-07 · Números de dano e textos** · P
- Passos: tamanho por magnitude, crítico com destaque, agrupar acertos rápidos no mesmo alvo, cor por tipo.

### M6 — Spells [decisão D2]

Porta das 11 spells do Dungeon Reign: `fireball`, `iceball`, `chain_lightning`, `arcane_bolt`, `healing_field`, `blade_orbit`, `venom_nova`, `cyclone`, `rune_traps`, `prism_beam`, `quake_totem`. Proposta: 2 espaços de spell por herói (teclas 1 e 2), qualquer herói usa qualquer spell, com nível de 1 a 5.

**M6-01 · Dados e núcleo** · M
- Arquivos: `src/data/spells.ts` (porta de `spells.lua`), `src/core/spells.ts` (dano, recarga, escala por nível e por atributo), testes.
- Pronto quando: `spellStats(id, level, stats)` tem teste para as 11.

**M6-02 · Conjuração no jogo** · M
- Arquivos: `game.ts`, `input.ts`, save (campos `spells`, `spellSlots`; versão do save sobe, com migração).
- Passos: teclas 1 e 2, recarga, mira no cursor; implementar `fireball` e `iceball` completas.

**M6-03 a M6-05 · As outras 9 spells** · M cada (3 por tarefa)
- `M6-03`: `chain_lightning`, `arcane_bolt`, `prism_beam` (projétil e raio).
- `M6-04`: `venom_nova`, `cyclone`, `quake_totem` (área e invocação fixa).
- `M6-05`: `healing_field`, `blade_orbit`, `rune_traps` (campo, órbita, armadilha).

**M6-06 · Obtenção e evolução** · M [decisão D3]
- Proposta: a primeira spell vem do primeiro chefe; as demais como drop raro (tomo) e na loja (`M7`); subir de nível gasta tomo repetido ou ouro.

**M6-07 · Interface de spells** · P
- Passos: barra com 2 espaços, tela de grimório (lista, nível, descrição, equipar).

**M6-08 · Modificadores de spell** · M
- Passos: porta dos modificadores do Dungeon Reign (`shop.lua` §77) como melhorias permanentes por spell.

### M7 — Economia [decisão D4]

**M7-01 · Ouro** · P
- Passos: `gold` no save; drop por inimigo e por chefe (números em `tuning.ts`); coleta com ímã; contador no HUD. Teste do cálculo em `core`.

**M7-02 · Desmontar e vender** · P
- Passos: descartar vira "vender" (ouro por raridade e nível); filtro para vender todos os comuns.

**M7-03 · Mercador na fogueira** · M
- Arquivos: `src/data/shop.ts`, `src/core/shop.ts` (ofertas por seed e visita, preços), `ui.ts`.
- Passos: 3 ofertas por visita à zona (item, tomo, poção melhor), rerrolar por ouro. Personagem do mercador modelado por código.

**M7-04 · Ferreiro: melhorar item** · M
- Passos: subir nível do item, rerrolar um afixo; custo crescente (curvas de `shop.lua` §75 como ponto de partida).

**M7-05 · Poções e consumíveis** · P
- Passos: cargas de poção compradas e melhoráveis em vez de recarga fixa; 2 ou 3 elixires de efeito temporário.

### M8 — Itens

**M8-01 · Ícones por código** · M
- Passos: renderizar cada tipo de item em um canvas pequeno (modelo 3D do item em fundo da raridade) e guardar em cache; substituir os emoji. Vale também para relíquias e spells.

**M8-02 · Lendários com efeito** · M
- Arquivos: `src/data/legendaries.ts`, `core/items.ts`.
- Passos: 12 lendários com efeito único (3 por zona atual), ganchos no combate por evento (`onHit`, `onKill`, `onDash`, `onTechnique`).

**M8-03 · Comparação e tooltip** · P
- Passos: ao passar o mouse, mostrar o item equipado ao lado com diferenças em verde e vermelho.

**M8-04 · Mais espaços de equipamento** · M [decisão D5]
- Proposta: elmo, botas e anel (de 3 para 6). Mexe em geração, interface e balanceamento.

**M8-05 · Equipamento visível no herói** · G
- Passos: a arma equipada muda o modelo da arma (3 visuais por tipo, por raridade); armadura muda um tom. Só depois de M2.

### M9 — Inimigos novos e elites

**M9-01 a M9-05 · Um inimigo por tarefa** · M cada [validar]
- `shieldbearer` (bloqueia de frente; flanquear), `hexer` (maldição que reduz cura ou dano), `plaguebearer` (explode em poça ao morrer), `warden` (golem lento que protege aliados próximos), `leaper` (sapo que salta sobre o herói).
- Cada tarefa: dados em `enemies.ts`, comportamento em `enemy.ts`, modelo pelo método da seção 4, entrada em uma zona.

**M9-06 · Afixos de elite** · M
- Porta dos 10 afixos (`vampiric`, `swift`, `armored`, `explosive`, `frozen`, `regenerating`, `shielded`, `summoner`, `shadow`, `venomous`) para campeões: 1 afixo no começo, 2 em zonas avançadas. Visual e nome por afixo.

**M9-07 · Composição de acampamentos** · P
- Passos: modelos de grupo em `zones.ts` (linha de frente e atiradores, enxame, elite com escolta) em vez de sorteio independente.

### M10 — Chefes novos [validar cada um]

Uma tarefa `G` por chefe, dividida em duas sessões: **modelo** e **luta** (mecânica, padrões, efeitos). Cada chefe traz a mecânica própria do Dungeon Reign.

| ID | Chefe | Mecânica (`bosses.lua`) | Bioma (M11) | Corpo |
|---|---|---|---|---|
| M10-01 | deathstalker | `marked_prey` | Deserto | Escorpião: 8 patas, pinças, cauda com ferrão |
| M10-02 | dune_leviathan | `burrow` | Deserto | Verme segmentado que mergulha na areia |
| M10-03 | mirage_djinn | `mirage` (clones) | Deserto | Torso flutuante com cauda de fumaça |
| M10-04 | venom_hydra | `venom_bloom` | Pântano | Três pescoços com cinemática |
| M10-05 | gorged_ooze | `mitosis` (divide) | Pântano | Gosma com boca; malha deformável |
| M10-06 | rimefang_wyrm | `glacial_wake` | Picos | Dragão quadrúpede com asas |
| M10-07 | storm_tyrant | `storm_field` | Picos | Rei barbudo sobre nuvem |
| M10-08 | iron_colossus | `earthbreaker` | Forja | Golem de placas com fornalha no peito |
| M10-09 | void_reaver | `riftwalk` | Vazio | Espectro de máscara com duas lâminas |

Também revisar os 4 atuais para ganharem sua mecânica: `blood_rush`, `army_of_the_damned`, `meteor_siege`, `soul_tether` (**M10-10**, `M`).

Padrões a portar conforme os chefes pedirem (lista em `bosses.lua`, linhas 143 a 179): `mark`, `crossfire`, `stormfield`, `quake`, `armorbreak`, `venomfield`, `fanvolley`, `graveburst`, `riftcross`, `meteorstorm`, `spiralvolley`, `boulder`, `leap`, `frostbreath`, `iciclerain`, `glacierdive`, `acidlob`, `slimewave`, `engulf`, `sandvolley`, `tailsweep`, `erupt`, `soullance`, `deathring`, `gravehands`, `orbitals`, `prismbeam`, `miragedash`. Distâncias em px convertem por `TUNING.enemy.pxToUnit`.

### M18 — Atmosfera das zonas [validar cada uma]

Decidido com o usuário em 2026-11-14, depois de ver o Abyssal Garden (cena submarina procedural): ali nenhum objeto é bonito sozinho; o conjunto vem de **luz, névoa, densidade e movimento**. Na nossa câmera alta, o chão e o ar ocupam quase toda a tela. Este marco faz isso nas 4 zonas atuais, sem relevo (que continua em `M11-01`). Cada tarefa passa pelo crítico cego (`docs/critic.md`) com as poses de `M18-01`. Orçamento: 60 fps em placa intermediária; medir draw calls e triângulos antes e depois de cada tarefa.

**M18-01 · Prévia de zona e poses fixas** · M
- Arquivos: `zone.html` e `src/zone-preview.ts` (fora do build do jogo, como a prévia de personagens).
- Passos: monta a zona por `buildWorld` com a seed fixa, sem inimigos nem interface, com o herói parado; `?zone=<id>`. `__zone.criticShots(prefix)` grava 6 poses: câmera do jogo na fogueira, no meio do mapa, numa mata densa e na arena do chefe; uma baixa (30°) e uma de longe (zoom 2×) para ver a borda e a névoa.
- Pronto quando: um comando gera as 6 capturas de qualquer zona.

**Crítica de base do Bosque (2026-11-14, antes de qualquer mudança):** "parece um parque ou campo de golfe ensolarado", sem nada de sombrio. Graves: arena com cerca de 85% de terra chapada e o mesmo carimbo de rabiscos repetido; um polígono preto no canto inferior direito da arena (provável sombra de objeto fora do quadro, conferir em `M18-06`); paleta contrária ao nome (verde saturado, sol branco de meio-dia). Médios: recorte que revela o herói sob as copas aparece como pontilhado quadrado; árvores clonadas (mesmo tamanho e cor); distribuição uniforme "de parque", sem maciços nem clareiras; fogueira fraca e acampamento sem barraca; borda da clareira de terra como tinta derramada; névoa clara de dia; pinheiros idênticos. Essas notas guiam as tarefas abaixo. **Decisão D11: o Bosque fica sombrio** (fim de tarde, verdes fechados, luz fria, fogueira e cogumelos como contraste quente), decidido pelo usuário em 2026-11-14.

**M18-02 · Sombra de nuvens e luz viva** · P
- Passos: ruído animado projetado de cima, escurecendo chão, grama e flora (uniform em `shared.ts`, lido por todos os materiais do cenário); intensidade e escala por zona em `zones.ts`. Variação lenta da cor do sol (parte visual de `M11-09`).
- Pronto quando: manchas de sombra passam devagar pelo chão e pelos personagens, sem costura nem tremido.

**M18-03 · Névoa baixa e de distância** · M
- Passos: névoa exponencial com cor por altura em vez de `THREE.Fog` linear; camadas de névoa rasteira animada (planos com ruído, mais densa em depressões, matas e na arena), cor e densidade por zona.
- Pronto quando: a névoa se mexe, não corta objetos com linha reta e não tem faixas de banding.

**M18-04 · Raios de luz e ar** · M
- Passos: feixes inclinados de luz em clareiras e bordas de mata (malha aditiva com ruído que desaparece nas pontas e de perto); partículas no ar revistas (`motes`): tamanhos variados, algumas acesas, profundidade em camadas.
- Pronto quando: o ar tem volume; nenhum feixe vira um bloco chapado nem estoura o bloom.

**M18-05 · Densidade do chão** · M
- Passos: milhares de peças pequenas instanciadas por bloco (tufos altos, folhas caídas, pedregulhos, raízes, cogumelos), manchas no chão (terra, musgo, cinza) na máscara do `groundMaterial`, copas de árvore balançando com o vento.
- Pronto quando: nenhuma área da câmera do jogo mostra chão liso, e o desempenho continua no orçamento.

**M18-06 · Contato e cor** · M
- Passos: sombra de contato pintada no chão em volta de pedras, árvores e lápides; oclusão por vértice na base da flora; correção de cor por zona revista (sombras frias ou quentes, curva por zona em `zones.ts`).
- Pronto quando: nada parece "colado" no chão.

**M18-07 a M18-10 · Passada por zona** · M cada
- Bosque, Cripta, Vulcão e Vazio, um por tarefa: aplicar tudo acima com a assinatura de cada uma (Bosque: luz filtrada e folhas caindo; Cripta: névoa azul rasteira entre as lápides; Vulcão: cinza caindo, brilho de lava no chão e fumaça; Vazio: cristais acesos e partículas flutuando para cima), e iterar com o crítico.
- Pronto quando: o crítico não aponta nada acima de "menor" e o usuário aprova.

### M11 — Mundo

**M11-01 · Relevo** · G
- Passos: mapa de altura em `core/worldgen.ts` (ruído por seed, plano nos acampamentos, no caminho e na arena), chão deformado em `world.ts`, altura do herói, inimigos, projéteis e efeitos amostrada do mapa. Teste: altura contínua e arena plana.
- Pronto quando: colinas suaves sem personagem flutuando nem enterrado.

**M11-02 · Bordas do mapa** · M
- Passos: penhasco ou mata fechada na margem em vez de parede invisível; névoa de distância.

**M11-03 · Água** · M
- Passos: lagos e riachos em cotas baixas, shader de água (ondas, espuma na margem), lentidão ao atravessar.

**M11-04 · Pontos de interesse** · M
- Passos: ruínas, altar, baú trancado, acampamento abandonado; gerados por seed; base para os eventos de `M11-08`.

**M11-05 a M11-07 · Biomas novos** · G cada [decisão D6]
- `M11-05` Deserto (dunas, ossadas, cactos, tempestade de areia leve), `M11-06` Pântano (água rasa, árvores tortas, névoa verde), `M11-07` Picos gelados (neve, pinheiros, gelo escorregadio). A Forja pode ser uma variação do Vulcão.
- Cada bioma: entrada em `zones.ts`, flora nova em `flora.ts`, paleta, partículas, lista de inimigos.

**M11-08 · Eventos de mapa** · G
- Porta de parte dos 17 eventos (`events.lua`) como encontros no mundo: `treasure_cache`, `blood_altar`, `healing_spring`, `wandering_merchant`, `ancient_shrine`, `call_of_the_horde`, `gamblers_den`, `sealed_door`. 2 ou 3 por zona, escolhidos por seed.

**M11-09 · Ciclo de luz e clima por zona** · P
- Passos: variação lenta da cor do sol, chuva no Bosque, cinza no Vulcão; só visual.

### M12 — Relíquias e sinergias

**M12-01 · Motor de efeitos de relíquia** · M
- Passos: relíquias como lista de modificadores e ganchos de evento em `core` (hoje são bônus diretos); migrar as 20 atuais sem mudar o comportamento; testes.

**M12-02 a M12-05 · Portar relíquias em lotes** · M cada
- Cerca de 18 por lote, das 94 de `relics.lua`, priorizando as que usam ganchos já existentes. Descartar as que só fazem sentido no formato de ondas do Dungeon Reign.

**M12-06 · Sinergias** · M
- Porta das 23 sinergias (`synergies.lua`): bônus ao juntar relíquias ou spells do mesmo tema. Indicador no inventário.

**M12-07 · Limite e escolha** · P [decisão D7]
- Hoje as relíquias são ilimitadas. Proposta: 12 ativas, o resto no baú da fogueira, para a escolha importar.

### M13 — Endgame [decisão D8]

**M13-01 · Dificuldades** · M
- `easy`, `normal`, `hard` (`difficulties.lua`): multiplicadores de vida, dano e loot; liberar `hard` ao vencer o chefe final. Save guarda o progresso por dificuldade.

**M13-02 · Depths** · M
- 5 níveis acima do `hard`, cada um soma uma mutação (`depths.lua`): afixos soltos, loja cara, feridas, fúria precoce, chefes marcados. Marcas como moeda de vantagens.

**M13-03 · Pactos** · P
- Os 8 pactos (`pacts.lua`) como desafios opcionais ao entrar na zona: mais risco, mais recompensa.

**M13-04 · Conquistas e registro** · P
- Porta de `achievements.lua`; bestiário com os modelos 3D dos inimigos derrotados.

### M14 — Interface

**M14-01 · Localização** · M [decisão D1]
- Passos: tirar todos os textos de `ui.ts` e `data/*` para `src/data/lang/en.ts` e `pt.ts`; função `t(key)`; idioma nas opções.

**M14-02 · HUD** · M
- Passos: barras com moldura desenhada por código, recargas radiais, lista de efeitos ativos, barra de chefe com marcas de fase.

**M14-03 · Inventário e personagem** · M
- Passos: herói 3D girando, estatísticas detalhadas, ordenar e filtrar a mochila.

**M14-04 · Mapa** · P
- Passos: névoa de exploração, ícones de acampamento limpo, evento e mercador.

**M14-05 · Opções** · M
- Passos: vídeo (qualidade, sombras, grama, bloom, contorno), som (geral, música, efeitos), teclas remapeáveis, tremor de câmera, idioma. Salvo separado do save do herói.

**M14-06 · Primeiros minutos** · P
- Passos: dicas contextuais na primeira zona (mover, atacar, esquivar, técnica, poção) que somem depois de usadas.

**M14-07 · Vários saves** · P
- Passos: 3 espaços, um herói por espaço, apagar com confirmação.

### M15 — Áudio

**M15-01 · Motor de som** · M
- Arquivos: `src/game/audio.ts` (hoje 74 linhas).
- Passos: barramentos (geral, música, efeitos), limite de vozes, variação de tom por disparo, som posicional simples.

**M15-02 · Efeitos sintetizados** · M
- Passos: golpe por tipo de arma, impacto por tipo de alvo (carne, osso, pedra, metal), passos, coleta, interface. Tudo por WebAudio.

**M15-03 · Música por zona** · G
- Passos: gerador por seed com camadas (base, harmonia, melodia) e intensidade ligada ao combate; tema de chefe. Uma zona por sessão.

### M16 — Técnico

**M16-01 · Medir desempenho em GPU real** · P [validar]
- Passos: usuário abre o jogo e a prévia, aperta F3 e reporta fps em cada zona e no chefe (placa: Radeon RX 9060 XT). Registrar aqui. Meta: 60 fps em qualidade alta.

**M16-02 · Orçamento de render** · M
- Passos: painel F3 com draw calls, triângulos e tempo de quadro; juntar as malhas por osso; contorno por pós-processamento ou casca única por personagem (hoje cada personagem é desenhado duas vezes).

**M16-03 · Inimigos distantes baratos** · M
- Passos: fora de `activeRadius` não anima; a meia distância anima em metade dos quadros; sombra só perto.

**M16-04 · Save com versão e migração** · P
- Passos: `version` no save, cadeia de migrações em `core/save.ts` com teste por versão; exportar e importar save como texto.

**M16-05 · Gamepad** · M
- Passos: analógico esquerdo move, direito mira, botões mapeados; dicas de botão na interface.

**M16-06 · Publicação** · P [decisão D9]
- Passos: GitHub Pages pelo Actions a cada merge na `main`; manter o `SINGLE=1` enquanto o jogo couber em um arquivo.

**M16-07 · Dividir arquivos grandes** · M
- `game.ts` (1.245 linhas) em `combat.ts`, `player.ts`, `loot.ts`, `progression.ts`; `chars.ts` conforme `M0-01`. Sem mudar comportamento.

### M17 — Balanceamento

**M17-01 · Simulador** · M
- Arquivos: `tools/balance-sim.ts` usando só `src/core` e `src/data` (ideia do `tools/balance_sim.lua`).
- Passos: simular herói de nível N com equipamento médio contra cada zona; saída: tempo para matar, dano recebido por minuto, horas até o nível 60.
- Pronto quando: um comando gera a tabela para os 9 heróis.

**M17-02 · Curva da primeira passada** · M [validar]
- Passos: ajustar `tuning.ts` e `enemies.ts` para de 20 a 30 minutos por zona e chefe vencível em 2 ou 3 tentativas; usuário joga uma zona e reporta.

**M17-03 · Paridade entre heróis** · P
- Passos: com o simulador, nenhum herói mais de 20% acima ou abaixo da média em tempo para matar.

**M17-04 · Revisão a cada marco de jogo** · P
- Rodar o simulador depois de M6, M7, M8, M12 e M13 e registrar os desvios.

---

## 6. Riscos

| Risco | Sinal | Resposta |
|---|---|---|
| Arte por código não alcança o sprite em algum personagem | Duas tentativas reprovadas | Simplificar o alvo daquele personagem com o usuário; não insistir em detalhe fino |
| Corpos não humanoides (hidra, verme, dragão) custam muito | Tarefa passa de 2 sessões | Fazer primeiro os humanoides; dividir modelo e animação |
| Desempenho cai com o elenco novo | Menos de 60 fps em `M16-01` | Antecipar `M16-02` e `M16-03`; baixar o orçamento da seção 4.3 |
| Escopo: são mais de 120 tarefas | Meses sem versão jogável nova | Fechar uma versão a cada marco e publicar |
| Balanceamento se perde ao somar sistemas | Simulador diverge do jogo | `M17-04` é obrigatória depois de cada marco de jogo |
| Save antigo quebra | Erro ao carregar | `M16-04` antes de qualquer tarefa que mude o save (M6 em diante) |

---

## 7. Fichas de design dos personagens

Tiradas do quadro parado de cada sprite. "Peças" são o que identifica o personagem de longe e de cima; a paleta é a do sprite.

### 7.1 Heróis
| id | Silhueta e peças | Paleta | Arma e pose |
|---|---|---|---|
| aurelius | Chapéu pontudo torto, barba branca até a cintura, manto longo | Roxo, dourado, branco | Mão erguida com orbe arcano flutuando |
| frostine | Coroa de gelo, vestido em camadas até o chão, gola de pelo | Azul, branco, ciano | Cajado com floco de neve; anel de gelo no chão |
| ignis | Cabelo vermelho em chamas, gi preto aberto, faixa vermelha | Preto, vermelho, laranja | Punhos; chama na mão; base baixa de luta |
| kaelen | Cabelo loiro claro, casaco azul-marinho, capa vermelha | Azul-marinho, vermelho, loiro | Lâmina fina na mão; postura ereta |
| seraph | Armadura de placas completa, elmo fechado, capa azul | Branco, dourado, azul | Espada erguida e escudo dourado grande |
| umbra | Capuz e máscara, corpo esguio, cachecol longo | Preto, magenta | Adaga em cada mão; inclinada para a frente |
| varok | Elmo com chifres, ombreiras largas, capa e tabardo vermelhos | Aço, vermelho, osso | Maça de espinhos de duas mãos; base larga |
| vesper | Capuz com antenas, manto listrado de abelha | Laranja, preto, osso | Cajado com caveira; curvada |
| zephyr | Chapéu de aba larga, poncho com barra clara, barba branca | Verde-azulado, marrom, creme | Revólver apontado; segunda arma na cintura |

### 7.2 Inimigos
| id | Silhueta e peças | Paleta | Corpo |
|---|---|---|---|
| goblin | Pequeno, curvado, orelhas grandes, clava | Verde, marrom | Bípede baixo |
| orc | Largo, ombreira de placa, machado duplo | Verde escuro, ferro, couro | Bípede pesado |
| swarm | Morcego de orelhas grandes, cauda fina | Roxo, vermelho | Voador |
| assassin | Máscara branca de raposa, cachecol preto | Cinza, vermelho, preto | Bípede ágil, base baixa |
| archer | Esqueleto com capuz e manto vermelho, arco longo | Osso, vermelho escuro | Bípede magro |
| spellcaster | Pele azul, coroa de cristais magenta, manto verde-azulado | Azul, magenta, verde-azulado | Manto |
| bombardier | Anão de óculos, barba laranja, barril nas costas, bomba na mão | Marrom, laranja, preto | Bípede baixo e largo |
| summoner | Mulher pálida, cabelo branco longo, vestido roxo, livro | Roxo escuro, branco | Manto |
| berserker | Elmo com chifres, barba laranja, peito tatuado, dois machados | Pele, laranja, aço | Bípede largo |
| splitter | Gosma rosa sorrindo, ossos dentro | Rosa, osso | Gosma |
| shieldbearer | Cavaleiro com pluma vermelha, lança, escudo com divisa | Aço, vermelho | Bípede |
| hexer | Bruxa curvada, nariz longo, cabelo branco, cajado torto | Roxo, laranja | Manto, muito curvada |
| warden | Golem de pedras empilhadas com runas | Cinza, musgo, dourado | Bípede muito largo |
| leaper | Sapo gigante com chifres | Amarelo, creme | Quadrúpede |
| plaguebearer | Zumbi inchado com barril nas costas | Bege doentio, vermelho | Bípede pesado |

### 7.3 Chefes
| id | Silhueta e peças | Paleta | Corpo |
|---|---|---|---|
| bloodfang | Homem-tigre curvado, caveira no ombro, manto azul-cinza, facão | Vermelho, preto, creme, azul-cinza | Feito |
| gravekeeper | Encapuzado sem rosto, olhos acesos, pá e lanterna, manto rasgado | Cinza, couro, luz âmbar | Manto |
| ember_matriarch | Torso de mulher sobre abdômen de aranha rachado de lava | Preto, laranja | Aranha |
| hollow_king | Esqueleto coroado, gola de pelo, manto roxo, cajado com orbe | Roxo, dourado, osso, turquesa | Manto |
| deathstalker | Escorpião preto com filetes dourados, ferrão turquesa | Preto, dourado, turquesa | 8 patas, pinças, cauda |
| dune_leviathan | Verme anelado saindo da areia, boca circular de dentes | Areia, rosa | Segmentado |
| mirage_djinn | Gênio de turbante, torso largo, cauda de fumaça colorida | Verde-azulado, roxo, dourado, rosa | Flutuante |
| venom_hydra | Três cabeças, corpo de lagarto com espinhos | Verde, amarelo | Quadrúpede, 3 pescoços |
| gorged_ooze | Gosma verde com boca enorme e olhos bravos | Verde | Gosma |
| rimefang_wyrm | Dragão azul de asas abertas, espinhos de gelo | Azul, branco, ciano | Quadrúpede com asas |
| storm_tyrant | Rei barbudo de armadura sobre nuvem escura | Aço, azul-marinho, branco | Torso sobre nuvem |
| iron_colossus | Golem de placas enferrujadas, grade de fornalha no peito | Ferro, ferrugem, laranja | Bípede muito largo |
| void_reaver | Máscara branca, cabelo preto longo, duas lâminas curvas, corpo em farrapos | Roxo escuro, branco, magenta | Flutuante |

---

## 8. Decisões pendentes com o usuário

Cada uma traz a proposta. Sem resposta, a tarefa que depende dela não começa.

| ID | Decisão | Proposta | Trava |
|---|---|---|---|
| D1 | Textos do jogo em inglês com português como tradução, ou só código em inglês? | Inglês como base e português como tradução, com troca nas opções | M14-01 |
| D2 | Spells: quantos espaços e quem usa o quê? | 2 espaços; qualquer herói usa qualquer spell | M6 |
| D3 | Como se ganha spell? | Primeira no primeiro chefe; depois tomo raro e loja | M6-06 |
| D4 | Entra ouro, mercador e ferreiro? | Sim, na fogueira de cada zona | M7 |
| D5 | Mais espaços de equipamento? | De 3 para 6 (elmo, botas, anel) | M8-04 |
| D6 | Quantas zonas no total e em que ordem? | 6 biomas, 2 ou 3 chefes por bioma, o jogador escolhe a ordem dentro do bioma | M11-05+ |
| D7 | Relíquias com limite? | 12 ativas, resto no baú | M12-07 |
| D8 | Endgame: dificuldades e Depths como no Dungeon Reign? | Sim | M13 |
| D9 | Onde publicar? | GitHub Pages | M16-06 |
| D10 | Nome definitivo do jogo | Em aberto | Nenhuma |
| D11 | Bosque Sombrio: deixar sombrio (fim de tarde, verdes fechados, luz fria, fogueira e cogumelos como contraste quente) ou manter ensolarado? | **Decidido em 2026-11-14: sombrio** | M18-07 |

---

## 9. Registro de progresso

Atualizar a cada sessão. Estados: `pendente`, `em curso`, `feito`, `adiado`.

| Tarefa | Estado | Data | Observação |
|---|---|---|---|
| Bloodfang redesenhado e no jogo | feito | 2026-11-13 | Método da seção 4 validado pelo usuário |
| Prévia de personagens (`/preview.html`) | feito | 2026-11-13 | Base de `M0-03` |
| M0-01 | feito | 2026-11-13 | `chars.ts` virou `src/game/chars/` (`kit`, `cast-heroes`, `cast-enemies`, `cast-bosses`, `build`, `animate`). Kit: `sculpt`, `ss`, `bell`, `grp`, `muscleArm`, `muscleLeg`, `torsoMesh`, `headBase`, `headMask`. Geometria dos 23 personagens idêntica bit a bit (hash antes e depois) |
| M0-02 | feito | 2026-11-13 | `npm run refs` (`tools/make-refs.mjs`, usa `pngjs`): 37 sprites em `docs/ref/<id>.png` e 3 folhas de contato em ordem alfabética de id |
| M0-03 | pendente | | |
| M1-01 | feito | 2026-11-13 | Aprovado pelo usuário. | Bloodfang: orelhas menores e achatadas, tufos da bochecha em leque curto, polegar e garras nas duas mãos, dedos nos pés, caveira esculpida com suturas e nuca, estrela na tanga (geometria fina, não cor por vértice: a tanga tem poucos vértices). De 19,4 mil para cerca de 12 mil triângulos (cabeça 36×26, tronco 22×16, `stud` de 80 triângulos para tachas e dedos). Conferido só na prévia |
| M1-02 | feito | 2026-11-13 | Aprovado pelo usuário. | Gravekeeper refeito do sprite e já no jogo: capuz esculpido com abertura preta e olhos acesos, pelerine, saia rasgada (`robeMesh`), pernas por baixo da saia, pá apoiada no chão, lanterna com luz pontual. Cerca de 6,6 mil triângulos. Conferido só na prévia (parado, andando, ataque, câmera do jogo); a luta na Cripta não foi jogada. Kit novo: `sculptTube`, `robeMesh`, `Builder.lights`, `Builder.glowByVertex`; bípedes ganharam o osso `skirt` |
| M1-04 | feito | 2026-11-13 | Aprovado pelo usuário. | Hollow King refeito do sprite e já no jogo: crânio esculpido com órbitas, nariz e dentes, coroa alta, gola de pelo aberta na frente, costelas à mostra, saia com painel azul e debrum dourado (`robeMesh` com `panel`), mãos de osso, cajado de crescente com orbe e luz turquesa, chama na mão esquerda. Cerca de 8,5 mil triângulos. Conferido só na prévia; a luta no Vazio não foi jogada. Kit: `restArm` e `hang` (objeto na vertical do mundo na pose de descanso) |
| M1-05 | feito, falta validar | 2026-11-14 | Presença de chefe. Entrada: rugido de 1,3 s (`TUNING.boss.roarTime`) em que o chefe não ataca, com pose própria, duas ondas no chão, clarão e tremor; repete mais curto ao enfurecer. Anel no chão com a cor do chefe (`makeBossRing` em `fx.ts`), que fica vermelho e pulsa rápido em fúria. Fúria: respiração mais rápida e funda, tronco curvado, braços abertos, brasas subindo; o tom vermelho do corpo foi reduzido para não lavar o modelo. Morte: cambaleia, cai de joelhos, tomba, acende na cor do chefe soltando partículas e some num clarão em 2,4 s (`deathTime`). O portal e a escolha de relíquia agora esperam o corpo sumir (antes abriam em 1,4 s e pausavam o jogo em cima da morte). Prévia ganhou os botões Roar, Rage e Boss death. Conferido no jogo com o Bloodfang (rugido, fúria e anel por captura; morte e recompensa avançando o loop por script, porque o painel estava oculto) |
| M1-03 | feito | 2026-11-13 | Aprovada pelo usuário. | Ember Matriarch refeita do sprite, as duas partes na mesma sessão. Parte 1: abdômen e cefalotórax esculpidos, material de lava (`Builder.surface = "lava"`: bordas de Voronoi 3D emissivas, pulsando com `U.uTime`), 8 patas com cinemática inversa (`Builder.ikLegs`, `stepLegs` em `animate.ts`: pé preso ao chão, dois grupos alternados). Parte 2: torso de mulher com `torsoMesh`, cabeça com `headBase`, coroa de espinhos, cabelo no osso `cape`, braços com brasa nas mãos. Cerca de 11 mil triângulos e 62 draw calls. Conferida só na prévia; morte (patas encolhendo) e luta no Vulcão não foram vistas |
| M2-01 | feito | 2026-11-14 | Aprovado pelo usuário. | Varok refeito do sprite e já no jogo: elmo esculpido com abertura do rosto, nasal e chifres curvos, barba ruiva, couraça e saiote em lâminas (sombra pintada sob cada borda), ombreiras de três lâminas, manoplas com dedos, tabardo no osso `skirt`, capa de duas faces, maça de duas mãos. Cerca de 6,3 mil triângulos, 28 draw calls. Kit novo: `tubeMesh` (tubo em curva com raio variável), `capeMesh` (pano de duas faces), `fist`, `stud` com nível de detalhe, e `Builder.weapon`: arma com osso próprio (`weapon`), pose de descanso atravessada no corpo, mão esquerda presa ao cabo por cinemática inversa e golpe de cima para baixo no estilo `swing` (`animate.ts`). A prévia agora enquadra pela altura do personagem. Conferido só na prévia (parado, costas, câmera do jogo, fases do ataque); no golpe a mão esquerda fica a até 2 cm do cabo (medido), com até 12 cm nas transições. No jogo o herói ataca sem preparo (`windup: 0`), então a arma salta para cima no primeiro quadro, como já acontecia com os braços: fica para o M4 |
| M2-02 | feito | 2026-11-14 | Aprovado pelo usuário. | Seraph refeito do sprite e já no jogo: elmo fechado com viseira em bico, fenda dos olhos, respiros, crista dourada e asas; placa branca com debrum dourado (couraça, saiote, ombreiras, braçais), lenço e tabardo azuis, capa azul, espada erguida na vertical e escudo de cavaleiro com cruz dourada. Cerca de 5,8 mil triângulos, 26 draw calls. Kit: `edge` e `dome` (lâminas de armadura, agora usadas também pelo Varok), `plateMesh` (chapa de duas faces sobre grade) e o estilo `throwL`: o arremesso sai do braço do escudo em vez do braço da espada. O escudo não sai da mão durante o voo do projétil (fica para o M5). Conferido só na prévia, por captura em arquivo |
| Captura da prévia em arquivo | feito | 2026-11-14 | `__preview.shot(nome, {anim, yaw, view, freeze, dist, w, h})` no console da prévia grava `.shots/<nome>.png` pelo servidor de desenvolvimento (plugin em `vite.config.ts`, só no `npm run dev`; pasta fora do git). Avança a animação por conta própria, então funciona com a aba oculta |
| M2-03 | feito, aprovado | 2026-11-14 | Kaelen refeito do sprite e já no jogo. Primeiro rosto humano pelo método: `headBase` com focinho quase zero (nariz e órbitas rasas), olhos por cima; cabelo claro revolto como massa esculpida aberta no rosto, com mechas soltas. Casaco azul-marinho com debrum e botões dourados, gola alta, pelerine curta, aba do casaco aberta na frente (`robeMesh` com `panel`), calça escura, bota alta, capa com forro vermelho (`capeMesh` com `lining`). Lâmina fina com o fio aceso em guarda baixa na mão direita e faísca ciano com luz na esquerda (o sprite parado só mostra a faísca; a lâmina vem da ficha da seção 7.1). Cerca de 5,2 mil triângulos, 28 draw calls. `__preview.shot` ganhou `lookY` para mirar o rosto. Conferido só na prévia, por captura em arquivo. **Refeito no mesmo dia a pedido do usuário** ("rosto bem feio, parece triste", "3 chifres na testa", "efeito de luz na mão é ruim"): rosto esculpido próprio com queixo afinado, olhos com esclera, íris e brilho, sobrancelhas com a ponta de dentro mais baixa, boca fina; essas peças vão na camada nova sem contorno (`Builder.flat`). Cabelo só esculpido, com franja recortada e gomos nas costas, sem mechas em cone. Faísca: núcleo pequeno e cinco arcos finos em zigue-zague (`tubeMesh`), sem luz pontual |
| M2-04 | feito, aprovado | 2026-11-14 | Umbra refeita do sprite e já no jogo. Capuz como malha única com a abertura do rosto afundada e borda saliente; a faixa de pele dos olhos é uma chapa própria sem contorno (`plateMesh` em `b.flat`), porque pintada na malha a borda ficava borrada. Olhos com íris magenta e um ponto aceso. Corpo esguio e agachado, pano cinza-violeta escuro (preto puro vira um borrão sem forma), arnês cruzado, ombreiras, braçais e caneleiras com filete magenta, bainha nas costas, adaga em cada mão (estocada alternada). **Cachecol com física**: `Builder.ribbons` (`RibbonSpec` no kit) cria fitas simuladas no mundo em `stepRibbons` (`animate.ts`): Verlet com gravidade, arrasto, brisa para trás com rajadas e ondulação; gomos de comprimento fixo corrigidos meio a meio (puxar só o ponto de baixo fazia a ponta chicotear para cima); colisão com o chão e com o tronco, saindo sempre pelas costas; recomeça pendurada em teleporte ou giro instantâneo. Serve para qualquer personagem (faixas, fitas, rabo de cavalo). Cerca de 5,5 mil triângulos. Conferido só na prévia, por captura em arquivo |
| M2-05 | feito, aprovado | 2026-11-14 | Zephyr refeito do sprite e já no jogo. Chapéu de aba larga esculpido (aba virada dos lados, copa com vinco, fita ciano), rosto curtido de olhos apertados com sobrancelhas e bigode grisalhos na camada sem contorno, barba branca comprida. Poncho como malha única (`sculptTube`) do pescoço à barra, em bico na frente e atrás e curto dos lados para soltar os braços, com a faixa ciano em zigue-zague creme pintada por vértice; a parte comprida de trás é um `capeMesh` no osso `cape`, começando por baixo da barra. Colete e mangas de couro, cinturão com balas, coldre com o segundo revólver, calça cinza-azulada, bota com dobra e espora. Estilo `shoot`: só o braço direito atira (o sprite e a ficha pedem a segunda arma na cintura). O coice do tiro em `animate.ts` foi reduzido (o cano subia até a frente do rosto); vale para todos os atiradores. Cerca de 7,4 mil triângulos, o mais pesado até aqui. Conferido só na prévia, por captura em arquivo |
| M2-06 | feito, aprovado | 2026-11-14 | Ignis refeito do sprite e já no jogo. Cabelo como massa esculpida com pontas largas subindo (vermelho escuro na raiz, laranja nas pontas) e seis labaredas finas acesas por cima (`tubeMesh` em `lit`, com `glowByVertex` para ir do amarelo ao vermelho); nada de peça grande emissiva. Rosto jovem de sobrancelha grossa. Tronco nu esculpido e o gi por cima como a mesma forma um pouco maior, afundada no V do peito e no pescoço para a pele aparecer (função local `trunk`). Braços nus com `muscleArm`, atadura cinza com fita vermelha no pulso. Faixa vermelha com nó, duas pontas na frente (`capeMesh` no osso `skirt`) e uma solta atrás (fita com física no quadril). Calça larga presa na canela. Punho direito com sete línguas de fogo. Estocada alternada vira soco. Cerca de 8 mil triângulos. Conferido só na prévia, por captura em arquivo |
| M2-07 | feito, aprovado | 2026-11-14 | Aurelius refeito do sprite e já no jogo. Chapéu pontudo como tubo de raio que afina (`tubeMesh`), subindo e caindo para trás, com aba mole esculpida, fita dourada e fivela. Rosto velho de nariz grande, sobrancelhas fartas e bigode brancos na camada sem contorno, barba esculpida até a cintura, cabelo branco atrás. Manto roxo: tronco com faixa dourada na frente e gola, mangas em sino com punho dourado, saia até o chão (`robeMesh` com painel claro, debrum e barra dourada), faixa dourada na cintura, bolsa de couro com alça. Continua na forma `robed` (flutua, sem pernas; sapatos aparecem na barra). Orbe: núcleo pequeno aceso com dois aros finos sobre a mão direita, sem luz pontual. Cerca de 6,2 mil triângulos. Conferido só na prévia, por captura em arquivo |
| M2-08 | feito, aprovado | 2026-11-14 | Frostine refeita do sprite e já no jogo. Rosto pálido e fino, cabelo branco esculpido com queda comprida pelas costas, coroa de sete cristais de quatro faces (sólidos, não acesos). Gola de pelo branco em gomos (`sculpt`), corpete azul com gema ciano acesa, mangas com punho de pelo. Vestido em camadas: saia longa (`robeMesh` com painel e barra branca), sobressaia curta mais clara e babado atrás que abre até o chão e clareia na barra (`capeMesh` largo no osso `skirt`). Cajado na vertical do mundo (`restArm` + `hang`) com floco de neve de seis braços aceso; floquinho sobre a mão estendida. Continua na forma `robed`. **O anel de gelo no chão ficou de fora**: cristais presos à saia balançavam com ela e pareciam pendurados; é efeito de chão, fica para o M5. Cerca de 6,9 mil triângulos. Conferido só na prévia, por captura em arquivo |
| M2-09 | feito, falta validar | 2026-11-14 | Vesper refeita do sprite e já no jogo. Capuz listrado como malha única com a abertura do rosto afundada (rosto escuro, olhos pequenos acesos), ponta que sobe e cai para trás (`tubeMesh`) e duas antenas com bolinha (haste na camada sem contorno: tubo fino com contorno fica serrilhado). Tronco e manto em gomos listrados de laranja e cinza-escuro (`sculptTube`, função local `stripe`), o manto como um abdômen de abelha até o chão; pelerine e mangas largas. Cajado torto na vertical do mundo com caveira esculpida e órbitas acesas. Continua na forma `robed`. **Abelhas da Ninhada refeitas**: receita `bee` (forma `bat`, cerca de mil triângulos) com abdômen listrado, ferrão, olhos grandes, antenas e asas que batem; em `game.ts` cada abelha passou de um cubo amarelo a um `Rig` animado, com um bote curto quando ferroa. A abelha fica junto das receitas dos heróis por ser aliada da Vesper. Vesper com cerca de 6 mil triângulos. Conferido só na prévia; a Ninhada no jogo não foi jogada |
| M2-09 (2ª versão) | feito, aprovado | 2026-11-14 | Vesper refeita com o crítico cego, em seis rodadas (graves na 1ª a 4ª, só médios na 5ª). Agora segue o sprite: manto marrom-escuro com painel largo laranja-queimado; capuz largo com a frente afundada, rosto pálido na sombra e mechas escuras; listras presas às linhas da malha; ponta caída para trás e para o lado; antenas finas em espiral; asas âmbar como lentes achatadas com contorno (nas costas, osso `cape`); abdômen de vespa como volume próprio preso atrás do quadril (osso `skirt`); gola em cone; mangas escuras com punho laranja; cajado mais grosso com amarração e caveira grande cor de osso velho. Cerca de 9 mil triângulos, acima dos 6 mil do orçamento (o abdômen e as asas são volume novo). Abelhas da Ninhada sem mudança |
| M0-07 | feito | 2026-11-14 | Crítico cego: `docs/critic.md` e `__preview.criticShots` (7 poses). Testado no Kaelen (aprovado) e na Vesper (falta validar) |
| Marco M18 | feito, falta validar o Vazio | 2026-11-14 | Criado com o usuário: atmosfera das zonas antes do M3. Todas as tarefas `M18-01` a `M18-10` feitas; Bosque, Cripta e Vulcão aprovados |
| M18-01 | feito | 2026-11-14 | Prévia de zona: `/zone.html?zone=<id>&seed=<n>&hero=<id>&pose=<nome>` (`src/zone-preview.ts`, fora do build). Mesmo renderizador, luz, névoa, partículas e pós-processamento do jogo; seed fixa; herói parado e chefe na arena, sem inimigos. Botões de pose e de zona; rodapé com fps, draw calls e triângulos do quadro inteiro (o pós-processamento zera `renderer.info` a cada passada, então a contagem é somada à mão). `await __zone.criticShots("zone-<id>")` grava 6 poses (`campfire`, `middle`, `dense`, `arena`, `low`, `far`) em 1280×720 e devolve a contagem. Texto do crítico para zona em `docs/critic.md`. **Base antes do M18** (seed 1, por pose): Bosque 159 a 366 draw calls e 481 a 733 mil triângulos; Cripta 106 a 245 e 325 a 440 mil; Vulcão 109 a 280 e 82 a 155 mil; Vazio 114 a 237 e 292 a 390 mil. A pose `low` é a mais cara em todas |
| M18-02 | feito | 2026-11-14 | Sombra de nuvens: `applyClouds` (`shared.ts`) embrulha o shader de todo `MeshStandardMaterial` do cenário e dos personagens (chamado no fim de `buildWorld` e de `buildChar`) e escurece só a luz do sol com ruído animado em coordenada de mundo (tirada de `vViewPosition`, vale para malha instanciada). Sombra fria (o sol perde mais vermelho que azul), borda curta. Parâmetros por zona em `zones.ts` (`clouds`: força, tamanho, velocidade, cobertura, `drift`). Luz viva: `driftSun` varia devagar a força e a cor do sol (mais quente quando forte, mais fria quando fraco). Prévia: `?clouds=0` desliga, para comparar. Sem draw call nem triângulo a mais. O crítico disse que copas e personagens não recebiam a sombra; medido nos pixels, recebem (copa 170→131 no verde, herói 125→102). Ele lia a borda larga como mancha no chão: a borda foi encurtada, as nuvens cresceram e a sombra ficou fria. A pose `campfire` saiu de cima da fogueira. Movimento conferido só no jogo rodando, sem vídeo |
| M18-03 | feito | 2026-11-14 | Névoa: o mesmo embrulho de shader das nuvens (renomeado `applyAtmosphere`) troca o `fog_fragment` dos materiais com luz por `atmosphere()` em `shared.ts`. Névoa de distância exponencial ao quadrado (começa suave, sem linha reta), mais rala no alto. Névoa rasteira em manchas que andam com o vento, caindo com a altura (cobre a base de lápide, tronco e grama, deixa o topo limpo) e com a espessura atravessada (forte rente ao chão, leve vista de cima: sem isso lavava a cena na câmera do jogo). Pontilhado de 1/255 contra banding. `scene.fog` do three fica só para o contorno dos personagens, acompanhando a distância. Parâmetros por zona em `zones.ts` (`haze`); `setZoneAtmosphere` liga céu, nuvens e névoa da zona; prévia com `?haze=0`. Sem draw call a mais. Crítico: o véu ciano do Vazio na pose `dense` já existia antes da névoa (bloom dos cristais), fica para `M18-10`; os médios foram ajustados por zona (Cripta azul médio baixo em manchas pequenas, Vulcão fumaça cinza-marrom, Vazio roxo escuro, Bosque mais leve e começando mais longe). Fora daqui: a arena da Cripta clareia demais (máscara pela arena, `M18-08`) |
| M18-04 | feito | 2026-11-14 | Ar da zona em `src/game/air.ts`. **Feixes de luz**: cones abertos inclinados entre a direção do sol (`SUN_OFFSET`, agora compartilhado por `game.ts` e a prévia) e a vertical, todos numa malha só (1 draw call a mais por zona), aditivos, com perfil em sino na largura, sumindo rente ao chão, no alto e perto da câmera, listras que andam e pulso lento, e um teto de brilho (0,16) para nunca chegar no limiar do bloom. Cada feixe nasce numa clareira (no máximo um obstáculo a 2,5 m) junto de uma borda de mata (obstáculo com 4 ou mais vizinhos a 7 m), com largura, força e direção variando por feixe. **Partículas** (`stepMotes`, usada pelo jogo e pela prévia): três camadas, a maioria pequena e apagada, algumas médias e 5% acesas, baixas; taxa 3 a 4 vezes maior. Parâmetros por zona em `zones.ts` (`shafts`, `motes.lit`). Crítico em duas rodadas: a primeira apontou tubo de vidro, risco de laser, cortina repetida e feixe no meio do nada (corrigidos); na segunda sobraram o véu que o feixe faz sobre um pinheiro na frente dele (é o que luz no ar faz; evitar pede partícula suave com textura de profundidade, fica para depois se incomodar) e feixes pouco visíveis na câmera alta em zona clara, que devem ganhar força quando o Bosque escurecer (D11, `M18-07`). O estouro ciano do Vazio é o bloom dos cristais (`M18-10`) |
| M18-05 | feito | 2026-11-14 | Densidade do chão. **Miudezas** (`src/game/scatter.ts`): seixos (três tamanhos, topo claro), folhas caídas, tufos altos, gravetos, samambaias e lascas de cristal ou obsidiana acesas, instanciadas em blocos de 60 m (poucos draw calls, ainda com culling), em manchas com queda gaussiana. Folha, samambaia e graveto nascem embaixo de árvore; seixo, folha, graveto e lasca também na trilha (mais nas bordas) e um pouco na arena. Lista por zona em `zones.ts` (`scatter`). **Manchas** (`STAIN_GLSL` em `shared.ts`, `stains` por zona): três camadas de ruído que tingem o chão, a terra batida e as lâminas de grama (na grama, depois do `begin_vertex`: em `color_vertex` a posição ainda não existe e o shader quebra em silêncio, a grama some). **Copas** balançam mais (vento 0,03 → 0,05) e cada árvore ganha leve variação de matiz. Custo na câmera do jogo: Bosque de 217 para 241 draw calls e de 481 para 591 mil triângulos (pose `middle`); as outras zonas sobem de 10 a 20 draw calls. Crítico em duas rodadas: a primeira achou trilha, clareiras, Vulcão e arena do Vazio lisos e algumas peças lendo como sujeira (corrigidos); ficam para as passadas por zona as árvores pequenas "em carimbo" do Bosque, os tocos repetidos e os arbustos verde-limão da Cripta, e os cristais grandes repetidos do Vazio (decoração, não miudeza) |
| M18-06 | feito | 2026-11-14 | Contato e cor. **Sombra de contato**: o canal G da máscara do chão (`buildMask`) recebe um disco desfocado embaixo de cada obstáculo, com força e raio por tipo (`CONTACT` em `world.ts`); o chão e as lâminas de grama escurecem ali. O anel de pilares da arena virou `arenaRing`, usado pela máscara e pela decoração. **Oclusão por vértice** (`occlude`, uma vez por modelo): tronco escurece perto do chão, copa embaixo, pedra e lápide pela altura da própria peça (pela altura do chão ficavam pretas inteiras). **Correção de cor por zona** (`grade` em `zones.ts`, `setGrade` em `render.ts`): tom de sombra e de luz (puxados 55% para o branco e normalizados, só mudam a cor), saturação e contraste; Cripta fria e menos saturada, Vulcão menos vermelho, Vazio menos saturado. Sem draw call a mais. Crítico: o estouro dos cristais do Vazio e o pilar de sombra preta ficam para `M18-10`; rochas de lava quase pretas (é a cor delas, não a oclusão) para `M18-09`; copas verde-limão, chão oliva-amarelado, base do pinheiro clareada pela névoa e a pedra "fantasma" no recorte do herói para `M18-07`; arbustos verde-limão e lápides claras da Cripta para `M18-08`. O polígono preto no canto da arena do Bosque é o pilar do anel visto de cima, na sombra |
| M18-07 | feito, aprovado | 2026-11-14 | Bosque sombrio (D11). Fim de tarde: sol frio e mais fraco, ambiente azulado, chão, grama, miudezas e manchas em verdes e marrons fechados, névoa verde-azulada, feixes frios. Flora com paleta por zona (`foliage` em `zones.ts`, `FloraPalette` em `flora.ts`): copas e pinheiros verde-azulados escuros; tronco das árvores redondas de laranja para marrom acinzentado (em todas as zonas). Contraste quente: cogumelos com o chapéu aceso (`capGlow`, cor `glowDecor` âmbar), vaga-lumes âmbar, fogueira mais forte e mais larga (`fireFlicker` em `world.ts`, usada pelo jogo e pela prévia). Flores apagadas. Feixes: o teto de brilho agora acompanha a força da zona (em zona escura o teto fixo virava faixa branca). Crítico em duas rodadas: a primeira deu grave nos feixes e médios em copas claras, fogueira fraca e clareira clara (corrigidos); a segunda só médios. **Pendente para uma volta futura do Bosque**: variedade de árvores (escala, altura, massas sobrepostas, troncos caídos; hoje parecem pomar), cogumelos acesos em grupos com poça de luz, composição da arena (centro gasto, borda escura, luz no chefe, braseiros), sombras mais difusas, pedras claras demais sob a névoa, luz da fogueira que clareia em vez de aquecer o chão |
| M18-08 | feito, aprovado | 2026-11-14 | Cripta ao luar. Chão e grama em verde-acinzentado escuro (o azul fica para a névoa baixa e o céu), terra batida escura, luz fria mais fraca e ambiente neutro, mais contraste. Lápides mais escuras com base escura e agora a decoração mais comum (peso 8, árvores mortas 2,2, 950 peças). Árvores mortas e lápides com inclinação e altura sorteadas por instância (pela posição, sem rng). Copas e arbustos frios (`foliage`), flores apagadas (`flowerGlow` por zona; antes o brilho vinha de `glowDecor` e acendia as flores da Cripta). Borda úmida entre grama e terra bem mais fraca em todas as zonas (com a fogueira virava um anel escuro, uma "cratera"). Sombras de nuvem e feixes mais fracos (de noite liam como sujeira e faixa). Crítico em duas rodadas e uma correção depois da segunda, sem terceira rodada. O "bloco preto" na borda da arena, apontado desde o primeiro crítico do Bosque, foi medido: nenhum objeto ali (raio da câmera), é a sombra de um pilar do anel que fica fora do quadro. **Pendente**: lanterna do chefe sem poça de luz no chão, grama em riscos na mesma direção, pedras facetadas claras, objetos que às vezes se atravessam no espalhamento da decoração, mausoléus e cercas (outro marco) |
| M18-09 | feito, aprovado | 2026-11-14 | Vulcão: ermo de cinza sob fumaça. **Rochas de lava** com material próprio (`lavaRockMaterial` em `world.ts`, `MatKind` "lava"): basalto cinza-frio com rachaduras acesas (bordas de Voronoi 3D na posição do objeto, só parte das células abertas), mais fortes perto do chão e pulsando devagar; no lugar das lascas laranja soltas. Paleta: chão cinza-acastanhado, névoa e céu cinza-fumaça, ambiente neutro, menos saturação; o laranja fica na lava, nas brasas e na fogueira. Sem feixes de luz (céu de fumaça) e sombras de nuvem mais fracas. **Mudança global**: borda da terra batida mais suave e sem o ruído fino (a luz da fogueira desenhava um disco serrilhado) e borda da sombra de nuvem um pouco mais larga (meio-termo entre dois críticos que pediram o contrário). Crítico em duas rodadas e uma correção depois da segunda. **Pendente**: brasas em forma de cone parecem espinhos fincados (o `Fx` desenha a faísca como cubo instanciado ou ponto; trocar a forma é do M5), poças de lava e brilho no chão ao pé das rochas, pedras comuns claras demais, rochas repetidas em fileira na borda do mapa, árvores secas sem carvão nem brasa |
| M18-10 | feito, falta validar | 2026-11-14 | Vazio. **Cristais**: o núcleo vinha da cor por vértice clara somada ao emissivo 1,6 e estourava em branco no bloom; agora a cor por vértice é escura e o brilho do material é por zona (`glowStrength`, 1,0 no Vazio), em ciano saturado (`glowDecor` 0x40e0ff); inclinação e altura por instância também nos cristais. Paleta: chão e ambiente mais violeta e menos saturados, grama ciano escura, sombras menos pretas (ambiente mais forte). Lascas no chão a um terço e escuras (pareciam confete e competiriam com efeitos de golpe), partículas no ar dobradas em ciano e lilás, feixes mais fracos, flores menos acesas. Crítico em uma rodada, só médios; ajuste depois dela (brilho dos cristais no meio do caminho entre estourado e apagado). **Pendente**: poça de luz ciano no chão sob os cristais, foco de luz ou anel rúnico na arena do Rei Oco, árvores secas e flores de bosque destoando do plano místico, mais variedade de forma nos cristais |
| M16-01 | pendente | | Depende do usuário |

O M1 está completo, faltando só a validação da `M1-05`. No M2, os nove heróis estão refeitos: oito aprovados e Vesper (com as abelhas) esperando validação. Próxima sessão, sugestão: `M2-10`. `M0-03` (prévia com seletor, lineup e contagem) continua pendente.
