# Dungeon Reign RPG — roadmap de implementação

Escrito em 2026-11-13, sobre a versão 0.3 mais o redesenho do Bloodfang. Este documento é o plano de trabalho das próximas conversas: cada tarefa cabe em uma sessão ou menos e pode ser feita, conferida e commitada sozinha.

`HANDOFF.md` diz **onde estamos**. Este arquivo diz **o que falta e como fazer**. `docs/design.md` diz **o que o jogo é**; mudanças nele são confirmadas com o usuário antes.

---

## 0. Como usar este documento

### 0.1 Rotina de cada sessão
1. Ler `HANDOFF.md`. Deste arquivo, **não ler inteiro** (passa de 100 KB): achar a tarefa com `grep -n "M20-07"` (ou o id da vez) e ler só o bloco dela, as linhas de paridade que ela cita em `docs/paridade.md` e, se precisar, a linha dela em `docs/progress.md`.
2. Escolher a próxima tarefa `pendente` cujas dependências estejam `feito`, seguindo a ordem da seção 3. Se o usuário pedir outra coisa, a ordem dele vale.
3. Fazer **uma** tarefa. Se ela crescer além do previsto, dividir e registrar as partes aqui antes de continuar.
4. Conferir: `npx tsc --noEmit`, `npm run test:q`, e no navegador (prévia ou jogo) quando a mudança for visível. Lógica e interface se conferem pelo console (`javascript_tool`, `get_page_text`); captura de tela só para o que é visual, e as 7 capturas do crítico cego só em tarefa de arte.
5. Mostrar ao usuário o que ele precisa validar (toda tarefa marcada **[validar]**) antes de seguir para a próxima que dependa dela.
6. Atualizar o status em `docs/progress.md` (linha curta, formato no topo dele), trocar o parágrafo "Agora" do `HANDOFF.md`, e fazer commit local no branch de trabalho. O usuário faz push, PR e merge.

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

Reescrito em 2026-11-20 (D18): a versão anterior prometia um RPG de 8 a 12 horas com ferreiro e itens, que a D13 já tinha cancelado. Um roguelite de ação em partidas de 30 a 40 minutos, com rejogabilidade por herói, dificuldade e Depths:
- Um loop de combate que é bom de jogar antes de ser bonito: esquiva com telegrafia legível, reações de estado, spells ativas e auras, cura no risco (`M21`).
- 9 heróis reconhecíveis à primeira vista, cada um com ataque, técnica e 2 spells equipáveis, e maestria por herói que libera alternativas.
- Mapa que pesa nas decisões: bifurcações físicas entre as salas, desvios opcionais e terreno usado na luta.
- 6 biomas com relevo, 13 chefes com mecânica própria, 15 inimigos e elites com afixo.
- Ouro e Magic Shop do original; as 94 relíquias com sinergias.
- Depois do chefe final: dificuldades e Depths com mutações.
- Roda a 60 fps em placa intermediária, com opções de vídeo, som e teclas, e publicado em uma página.

---

## 3. Ordem dos marcos

### 3.0 Ordem atual (D17, decidida pelo usuário em 2026-11-19)

> **D18 (2026-11-20): antes da fase 1 vem o marco `M21` (loop de jogo).** O jogo nunca foi jogado de ponta a ponta; o combate e o ritmo se ajustam jogando antes de continuar a paridade. Ordem: `M21-01` a `M21-04` (a `M21-04` é a fatia de sensação que o usuário joga); depois a fase 1 abaixo segue, com as tarefas `M21-05` em diante intercaladas onde fizerem sentido. Pela D18, números de combate e de ritmo do original são "adaptado" por padrão (ver o topo de `docs/paridade.md`); o resto da régua da fase 1 continua igual.

**Primeiro a jogabilidade inteira do Dungeon Reign, depois o acabamento de VFX, SFX e arte.** Toda regra, sistema e conteúdo jogável do original entra antes de fechar efeitos, som e modelos. Nesta fase:
- Inimigos e chefes novos entram com **corpo provisório por código** (simples, legível na câmera, com a silhueta certa); a modelagem no Blender fica para a fase 2.
- Efeito visual e som entram só no mínimo para o jogador ler a mecânica (telegrafia simples, cor do estado, som existente); o efeito próprio fica para a fase 2.
- A régua é o `docs/paridade.md`: a fase acaba quando não sobra linha em "falta" nem "a decidir", e cada "adaptado" está aceito.

**Fase 1 — Paridade de jogo**, nesta ordem:

| Ordem | Tarefa | O quê |
|---|---|---|
| 1 | `M20-10` | Varredura de paridade (feita em 2026-11-19) |
| 2 | `M20-11` | Ajustes que ficaram para trás: corte de vida do chefe, velocidade de projétil e de Apressar |
| 3 | `M20-09` | Saco de chefes, emboscada e rei coroado |
| 4 | `M19-08` | Modo Boss Killer do Varok (`runMods`, H9) (feita em 2026-11-22) |
| 5 | `M20-12` | As melhorias de nível que faltam e as pilhas com retorno decrescente (feita em 2026-11-22) |
| 6 | `M9-08` | Conferir IA, ataques e estados dos 10 inimigos atuais contra o original (feita em 2026-11-22) |
| 7 | `M12-01` a `M12-05`, `M12-10` | Motor de relíquias, as 94 relíquias (de spell, premium, risco, amaldiçoadas), escolha com banir e trocar |
| 8 | `M9-06`, `M9-01` a `M9-05`, `M9-07` | Afixos de elite, os 5 inimigos que faltam (corpo provisório), composição |
| 9 | `M10-10`, depois `M10-01` a `M10-09` | Mecânica e fases dos 4 chefes atuais; depois só a sessão **luta** de cada chefe novo, com corpo provisório; cada um entra no saco |
| 10 | `M12-06`, `M12-09`, `M12-08`, `M12-07` | Sinergias, evoluções de build e identidade, evoluções de relíquia |
| 11 | `M20-13` | Desafios da partida (feita em 2026-11-24) |
| 12 | `M11-08`, `M13-03` | Os 17 eventos e os 8 pactos (ligam as cartas de evento e pacto do mapa, R20) |
| 13 | `M13-01`, `M13-02`, `M13-04` | Dificuldades, Depths, codex e conquistas que faltarem |
| 14 | `M20-14` | Dano por fonte na tela de resultado (feita em 2026-11-25) |
| 15 | `M17-01` | Bot que joga partidas, para medir o balanceamento com o jogo completo (feita em 2026-11-25) |
| 15a | `M21-15` | Uma arena por zona com a escolha nos altares (formato Infernal Hordes) e o tamanho da arena, medido pelo bot (usuário, 2026-11-25) |

**Seed diária (`M13-05`) é a última de todas (usuário, 2026-11-25):** sai da fase 1 e fica depois de toda a fase 2; não puxar antes sem ele pedir.

**Reordenado pelo usuário em 2026-11-22:** inimigos (`M9`) e chefes (`M10`) passam para logo depois da `M12-10`, antes das sinergias e evoluções (`M12-06` a `M12-09`).

A `M20-10` abriu as linhas que faltavam no `docs/paridade.md` (seções E, B, X e P) e as tarefas novas desta tabela. As linhas "adaptado" ainda não aceitas estão no fim da paridade, em "Para o usuário decidir".

**Fase 2 — VFX, SFX e arte**, depois da fase 1: `M1-06` (ember_matriarch e hollow_king no Blender), modelos dos inimigos e chefes novos no Blender (sessão **modelo** do `M10`, modelo do `M9`), `M4` (animação, com `M4-08`), o resto do `M5` (`M5-01`, `M5-04`, `M5-06`, `M5-07`, `M5-09`), `M2-11` (os 9 heróis no Blender), `M15` (áudio), `M11` (relevo, água, biomas, clima), `M14` (interface), `M13-06` (cosméticos), `M16` e `M17-02` em diante. Ordem dentro da fase a combinar com o usuário quando chegar lá.

Validações que o usuário ainda deve (`docs/progress.md`, "falta validar") continuam valendo; não travam a fase 1.

### 3.1 Ordem original (até 2026-11-19, substituída pela 3.0)

| Ordem | Marco | Por quê nesta posição |
|---|---|---|
| 1 | M0 Fundação e ferramentas | Barateia todo o resto (prévia, kit de modelagem, medição) |
| 2 | M1 Chefes atuais | Maior ganho visual; valida o método em corpos difíceis (manto, aranha) |
| 3 | M2 Heróis | O jogador olha para o herói o tempo todo |
| 4 | M18 Atmosfera das zonas | Decidido em 2026-11-14: na câmera alta, o ambiente pesa mais na primeira impressão que o detalhe de cada personagem, e custa bem menos |
| 5 | M19 Kit dos heróis do Dungeon Reign | Decidido em 2026-11-14: técnica, passiva e ataque básico de cada herói como no original, onde o design já foi muito trabalhado |
| 5a | M20 Partida como no Dungeon Reign | Decidido em 2026-11-15 (D13): runs com seed, 20 ondas em 4 zonas, sem equipamento. Vem antes do M6 porque a escolha da spell inicial e a loja vivem dentro da partida |
| 5b | M6 Spells | Decidido em 2026-11-14: logo depois do M19, em teclas (D12). `M6-01` (dados e núcleo) pode correr junto com o M20 |
| 5c | M3 Inimigos atuais | Fecha o elenco que já está no jogo |
| 6 | M4 Animação e sensação | Corpo novo pede movimento à altura |
| 7 | M5 Efeitos de combate | Leitura das lutas; pré-requisito para spells e chefes novos |
| 9 | M7 Economia | Ouro e Magic Shop do original (refeito pela D13) |
| 10 | ~~M8 Itens~~ | Cancelado pela D13: o original não tem equipamento |
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

**Desde a D16 (2026-11-18), a modelagem é no Blender por script Python** (`tools/blender/`, ver o README de lá): metaballs para formas orgânicas (elementos negativos cavam órbitas e boca), redução de triângulos por parte, oclusão assada na cor por vértice e exportação por osso. Os passos abaixo (sprite como fonte, medidas, crítico cego) continuam valendo; as primitivas de `kit.ts` ficam para o que ainda não migrou.

### 4.1 Passos
0. **Brief:** escrever `docs/briefs/<id>.md` antes de modelar (modelo: `docs/briefs/orc.md`): o que cada referência manda, medidas que dá para conferir, recusas do usuário e a checagem que o crítico recebe. Atualizar a cada recusa.
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
- **Contorno falhando na borda** (o usuário não aceita em nenhum modelo): a casca do contorno é empurrada pela normal, e em aresta dura (face plana, chapa fina, membrana de asa) cada face empurra para um lado e o contorno se abre. Desde 2026-11-18, `fuse` em `build.ts` grava `outlineNormal` (média por posição) e o contorno usa essa normal. Conferir as bordas finas de perto em toda captura.
- Normal nula (triângulo degenerado de `ExtrudeGeometry`): normalizar dá NaN no contorno e na luz de recorte, com o mesmo bloco preto, intermitente. `fuse` em `build.ts` conserta ao juntar as peças; malha criada fora dele precisa do mesmo cuidado.

### 4.3 Orçamento por personagem
Até cerca de 12 mil triângulos para chefe, 6 mil para herói, 3 mil para inimigo comum (aparecem dezenas na tela). Medir com `renderer.info` na prévia (`M0-03`).

---

## 5. Marcos e tarefas

### M21 — Loop de jogo [decisão D18]

Registrado em 2026-11-20, depois de uma revisão crítica do loop pedida pelo usuário (ele concordou com todas as propostas). O esqueleto da partida do Dungeon Reign foi feito para um jogo em que as spells saem sozinhas e o jogador só decide a build; aqui o jogador mira, esquiva e aperta teclas. O marco ajusta o combate e o ritmo para esse formato e faz o mapa aberto pesar nas decisões. Regra da D17: conteúdo igual ao original, números de combate e de ritmo adaptados. Ordem: `M21-01`, `M21-02`, `M21-03`, `M21-04` (jogar), antes da fase 1 da seção 3.0; `M21-05` em diante se intercalam com ela. Cada tarefa anota o plano antes de começar; se eu discordar de algo do usuário, explico, proponho alternativa e espero o ok (regra do `CLAUDE.md`).

**M21-00 · Decisões e documentos** · P
- D18 na seção 8, `docs/design.md` reescrito (visão, loop, combate), regra na `docs/paridade.md`, seção 2 e ordem dos marcos (seção 3) deste arquivo.
- Pronto quando: os quatro documentos dizem a mesma coisa.

**M21-01 · Telegrafia dos golpes inimigos** · M [validar]
- Absorve a parte de jogo da `M4-08` (a pose da arma no plano certo continua lá). Todo golpe corpo a corpo de inimigo ganha preparo legível (`windupT` em `enemy.ts`): o corpo recua, brilho na arma e marca no chão do arco que vai acertar; o golpe só acerta quem está dentro da marca quando ela fecha. Tiros inimigos com aviso curto na boca da arma. Durações em `src/data` (`TUNING.enemy.telegraph`), não em `src/game`.
- Pronto quando: em vídeo ou captura, dá para dizer quem vai bater, quando e onde, e esquivar para fora da marca evita o dano.
- Partes: **1** arco no chão e acerto só dentro dele, para corpo a corpo de inimigo e chefe (feita em 2026-11-20); **2** aviso na boca de tiro dos inimigos à distância e brilho na arma durante o preparo (feita em 2026-11-20).

**M21-02 · Camada de ritmo (números de ação)** · M
- `src/data/pace.ts`: multiplicadores e trocas sobre os números do original (contagem por onda, vida e dano por onda, duração da onda, raio da clareira, cura durante a onda, alcance das áreas), com o valor do original ao lado em comentário. `core/waves.ts` e `core/wave.ts` leem a camada; o teste de paridade continua comparando o valor do original, e um teste novo confere que a camada é aplicada. Primeiro chute: menos inimigos nas ondas 1 a 3 (o `countMult` 2,8 foi feito para área automática), clareira um pouco maior.
- Pronto quando: trocar um número em `pace.ts` muda o jogo, e `npm test` segue verde.

**M21-03 · Cura no risco (sai a poção)** · P
- Sai a poção (tecla F, `potionCd`, `potionHealPct`, HUD). Entra o orbe de cura no chão: cai do campeão, da reação de estado (`M21-05`) e com chance baixa de inimigo comum; some em 4 s piscando no último. Números em `pace.ts`. Q3 muda: a esquiva fica, a poção sai.
- Pronto quando: não há poção na interface nem no código, e o orbe cura ao ser recolhido e some no tempo.

**M21-04 · Fatia de sensação** · M [validar]
- Um herói de mira (Kaelen ou Zephyr), ondas 1 a 5 e o Bloodfang, com telegrafia, camada de ritmo e cura no risco. O usuário joga 3 vezes e anota onde ficou chato, confuso ou injusto; a sessão seguinte mexe só em números (`pace.ts`) e telegrafia até ele aprovar. F3 aberto para fechar o `M16-01` junto.
- Pronto quando: o usuário diz que as 5 primeiras ondas são boas de jogar.

**M21-05 · Reações de estado** · G (dividir: núcleo e 2 reações; depois as outras 2)
- `src/core/reactions.ts` puro e testado: dado o estado de um inimigo e o golpe que chega, devolve a reação. Primeiras quatro: congelado + raio = Estilhaço (dano em área, consome o congelamento); queimando + veneno = Praga (explosão que espalha queimadura e veneno); Cyclone + elemento = tornado daquele elemento; atordoado + golpe pelas costas = execução. Números em `src/data/reactions.ts`. Texto flutuante e efeito próprio por reação; ícone de estado avisa que a reação está pronta.
- Pronto quando: as quatro reações saem no jogo e têm teste no núcleo.
- Plano da parte 1 (2026-11-20): `core/reactions.ts` puro (`reactionFor`, `primedReactions`, `buildElements`) e números em `data/reactions.ts`. Cada golpe leva um elemento (escola da spell, da técnica, gelo da Frostine). "Gelado" = lento por fonte de gelo (Iceball, Blizzard, ataque e congelamento da Frostine). **Estilhaço:** golpe de raio em inimigo gelado: dano em área e consome o gelo. **Praga:** queimadura chega em quem está envenenado (ou o contrário): explosão em área que passa queimadura e veneno aos vizinhos; quem recebe pela Praga fica em recarga e não reage em cadeia (a cadeia fica para a épica do `M21-07`). Recarga por inimigo; chefe leva metade. Ícone "pronta" só quando a build tem o elemento que fecha a reação. Parte 2: tornado e execução.
- Plano da parte 2 (2026-11-20): **Tornado:** golpe de fogo, gelo, raio ou veneno em inimigo dentro do Cyclone (ou Maelstrom) dá esse elemento ao tornado até ele acabar (o primeiro fica); cada tique passa a queimar, deixar lento e gelado, dar choque extra de raio (que pode estilhaçar) ou envenenar; o funil troca de cor. **Execução:** golpe em inimigo atordoado vindo das costas dele (cone de 70° atrás; o atordoado não se vira): comum abaixo de 40% da vida morre na hora; senão, dano extra (chefe leva metade); o atordoamento acaba. Números em `data/reactions.ts`.

**M21-06 · Spells ativas e auras** · M
- Classificar as 11 spells (`SPELLS` ganha `mode: "active" | "aura"`). As auras (proposta: Blade Orbit, Healing Field, Rune Traps, Venom Nova) saem sozinhas como no original (volta a S14 para elas) e a tecla dá o pico: Orbit lança as lâminas para fora, Field estoura a cura de uma vez, Runes detonam todas, Nova dobra o acúmulo. O pico gasta a recarga e a aura volta depois dela.
- Plano (2026-11-20): `SpellDef.mode`; auras são as quatro da proposta. A aura sai sozinha quando a recarga acaba (Venom Nova só com inimigo no raio; Rune Traps segue saindo ao andar). O pico tem recarga própria igual à da spell: ao usar, as duas recomeçam (a aura só volta depois dela); sem o efeito em campo (lâminas, campo, runas) o pico não sai e não gasta. **Orbit:** cada lâmina voa em linha para fora e fere tudo no caminho (2× o dano do giro), o giro acaba. **Field:** o campo que segue o herói some e cura de uma vez o que faltava curar. **Runes:** todas as runas do espaço explodem. **Nova:** sai já, com o dobro de acúmulos e de teto. Números em `AURA_SPIKE` (`data/spells.ts`); o HUD do espaço de aura mostra a recarga do pico. Evoluções seguem a forma da base (Sanctuary, Blade Storm, Rune Circle, Plague Bloom).
- Pronto quando: cada aura funciona sem tecla, e o pico de cada uma tem efeito e recarga.

**M21-07 · Épicas de comportamento** · M
- 10 a 12 melhorias épicas novas que mudam como o herói joga (ex.: a esquiva deixa uma runa; o 3º ataque básico seguido sai em leque; recolher orbe recarrega 0,5 s da técnica; matar por reação estende o estado aos vizinhos). Entram no sorteio de `upgrades.ts` como épicas, com as regras de disponibilidade de lá; os números ficam em `src/data`.
- Pronto quando: cada épica tem efeito no jogo, texto em inglês e aparece no sorteio.
- Plano (2026-11-20, lista aprovada pelo usuário; a chance foi pedido dele): 11 épicas em `data/epics.ts`, fora de `UPGRADES` (a paridade compara essa lista com o original), mas em `UPGRADE_BY_ID`. Raridade épica fixa, uma vez cada, a partir da onda 3. `draftLevelUp` (core) sorteia as 3 cartas do original e, com chance de 5% + 5% por tela seguida sem épica (`run.epicPity`), a última vira épica; zera quando aparece. Efeitos em `game/epics.ts` (`EpicRuntime`), com ganchos na esquiva, no ataque básico, no golpe recebido, no abate, no orbe, na técnica e na spell da tecla.

**M21-08 · Bifurcações físicas no mapa** · G (dividir: geração das saídas; sinal de cada sala)
- `worldgen` gera, depois de cada clareira, 2 ou 3 saídas, uma por opção do mapa da partida (`runmap`). Andar por uma saída escolhe a sala (o menu do mapa sai, ou fica só como mapa de consulta). Cada tipo de sala tem um sinal visível de longe (céu vermelho, raios, luz dourada, fumaça, som). A seed decide as saídas como hoje decide as opções.
- Pronto quando: a partida inteira se escolhe andando, e continuar a partida dá as mesmas saídas.
- Plano (2026-11-20, forma escolhida pelo usuário: **portões na borda**; as clareiras ficam a 2–11 m uma da outra, sem espaço para caminhos que se dividem; clareiras em leque ficam para depois, se os portões parecerem falsos jogando). **Parte 1:** o mapa sai do menu do fim da onda e vira 2 ou 3 portões em leque na borda da clareira vencida (na zona nova, em volta da fogueira, então o mapa da onda 6 passa para depois do portal); passar por um portão escolhe a carta; a clareira seguinte só começa depois da escolha; as cartas ficam em `run.mapOffer` (checkpoint). **Parte 2:** o sinal de longe de cada tipo de sala (céu, raios, luz dourada, fumaça, som) e os portões no minimapa.

**M21-09 · Desvios opcionais** · M
- Entre clareiras, 0 a 2 desvios por trecho, sorteados pela seed: baú guardado por um campeão; santuário que troca vida por ouro; atalho que pula a próxima loja e dá recompensa. Cada um cabe em 10 a 20 s.
- Pronto quando: os três desvios aparecem, funcionam e contam no registro da partida.
- Plano (2026-11-21): as clareiras ficam a 2–11 m uma da outra, então o desvio fica **ao lado** do trecho: no meio entre a clareira de antes (ou a fogueira) e a próxima, afastado para um dos lados (8 a 14 m), em chão livre (sem obstáculo sólido no corredor até ele). `core/detours.ts` puro e testado: `rollDetours` (0 a 2 tipos diferentes, pesos em `data/detours.ts`) e `detourSpots`, com `Rng.of(seed da zona, "detours:<onda>")`, então continuar a partida dá os mesmos desvios (o checkpoint é do começo da caminhada: continuar desfaz um desvio já usado, como o resto). Aparecem na caminhada (com o mapa por escolher também) e somem quando a onda começa. **Baú guardado** (Guarded Chest): um campeão da zona parado ao lado (acorda ao chegar perto, volta se o herói foge); morto ele, E abre o baú: ouro pela onda. Esse campeão não abre a loja do campeão e, se estiver lutando quando a onda começa, entra nela. **Santuário de sangue** (Blood Shrine): E troca 25% da vida máxima (não mata: fica com 1) por ouro pela onda. **Atalho** (Hidden Path): E pula a próxima loja automática (antes do chefe ou do campeão; a carta de loja do mapa continua valendo) e dá um nível na hora; só aparece quando ainda há loja antes do chefe da zona. Arte por código simples (baú, obelisco, marco com runas), placa com o nome e a dica no HUD. Registro: `run.detours` (onda e tipo de cada desvio usado) vai no `logs/runs.jsonl`. Números são primeiro chute.

**M21-10 · Terreno na luta** · M
- Barris explosivos (arte por código), gargalos entre pedras e beiradas onde o empurrão mata inimigo comum (chefe não). O empurrão das técnicas e do Quake Totem passa a ter onde empurrar.
- Pronto quando: há os três elementos nas clareiras e o empurrão usa as beiradas.
- Plano (2026-11-22): em cada clareira das ondas 1 a 4 (a arena do chefe fica livre), pela seed (`Rng.of(seed, "terrain")`, stream próprio, a decoração não muda): um **fosso** (raio 2 a 2,6 m, a 40–55% do raio da clareira), um **gargalo** no lado oposto (duas fileiras de 3 pedras sólidas com um vão de 2,6 m, tangentes à clareira) e **2 ou 3 barris** longe dos dois. Tudo fica a 4 m ou mais da borda, onde os inimigos nascem. Fosso: herói e inimigo andando contornam (colisão como pedra, mas o tiro passa); inimigo comum empurrado a mais de 2,5 m/s com o centro sobre a beirada cai e morre (o loot fica na beirada); chefe e campeão não caem. O empurrão posicional das técnicas (`areaHit`) vira velocidade, para deslizar até o fosso. Barril: qualquer tiro, corte, técnica de área ou spell de área acende o pavio (0,55 s piscando), a explosão (3,4 m) tira 60% da vida do comum, 25% do campeão e 5% do chefe, 15% da vida do herói, empurra para fora e acende os vizinhos. Inimigos ganham desvio simples (giram para um lado quando pedra, fosso ou barril tapa a frente). Números em `data/terrain.ts`, geração no `worldgen`, o resto em `game/terrain.ts`.

**M21-12 · Bifurcações de verdade** · G (pedido do usuário em 2026-11-22: a escolha pelo portão e depois a ida até a clareira eram dois passos; ele escolheu a opção "trilhas que se bifurcam" num esboço e o zigue-zague quando ficou claro que as clareiras quase se tocavam)
- **Parte 1 (feita em 2026-11-22):** as clareiras em zigue-zague (uma de cada lado do meio, ~30 de distância entre bordas, antes 2 a 10) e 3 trilhas entre uma e a seguinte (`Fork` no `worldgen`, números em `TUNING.world.forks`): a do meio é o caminho; as dos lados saem da borda, abrem até 15 do meio e voltam ao caminho 5 antes da clareira seguinte. O portão de cada carta fica na trava (meio) da trilha (`forkGateSpots`); quem corta pelo mato e chega à clareira sem portão fica com o mais perto. Os desvios ficam do lado de fora das trilhas dos lados. Chão, grama e minimapa desenham as trilhas.
- **Parte 2:** o portão novo por código (arco de pedras de runa flutuando, vórtice na cor da sala, ícone da sala no meio, nome só de perto) e o crítico cego antes de mostrar.
- Pronto quando: o usuário joga e escolhe andando por uma trilha, e o registro de partidas não mostra mais picos que antes (comparar `perf` de uma partida antes e outra depois).

**M21-13 · Menos caminhada, luta que vem até o herói** · G (pedido do usuário em 2026-11-22, urgente: "too much time walking around in a not linear way, this is not supposed to be an rpg"; ele escolheu A + B)
- Medida antes: no registro, a onda 1 (20 s de relógio) levou 34 s e a 2 (25 s) 37 s: um terço do começo da partida é caminhada ou espera.
- **A · Corrente de arenas:** a zona vira uma linha reta subindo a tela (fogueira embaixo, chefe em cima); as clareiras ficam uma na frente da outra com um vão curto (`TUNING.world.chain`); as 3 trilhas da bifurcação ficam curtas (~2 s andando) e o portão de cada sala fica logo na saída da clareira vencida. Os desvios ficam colados nas trilhas dos lados, como bolsões vistos da clareira. Substitui o zigue-zague da `M21-12`.
- **B · A luta vem até o herói** (camada de ritmo, `PACE`): os inimigos nascem em grupos (`pack`) a poucos metros do herói, dentro da clareira, e todos chegam na primeira metade da onda (`spawnWindow`), então limpar cedo fecha a onda; quando sobram poucos, eles correm para o herói e setas na borda da tela apontam os que estão fora dela.
- Registro: cada onda ganha `travel` (s andando da onda anterior até entrar na clareira) para comparar antes e depois.
- Pronto quando: a caminhada entre ondas fica em ~3 s no registro e o usuário joga e aprova o ritmo.

**M21-14 · Portão com E e viagem até a onda** · M (pedido do usuário em 2026-11-22, depois de jogar a M21-13: "still too much time wandering around between waves, its just boring"; a ideia é dele)
- Os portões ficam dentro da clareira vencida (ou em volta da fogueira), em arco virado para a seguinte; E perto de um escolhe a carta e leva o herói até dentro da clareira da onda, com clarão nos dois lados. Sem cartas (onda 1, onda de chefe), E em qualquer lugar leva. Os desvios ficam do lado de trás da clareira vencida. As trilhas entre clareiras ficam só como cenário.
- Pronto quando: entre uma onda e a seguinte não há caminhada além dos poucos passos até o portão, e o usuário aprova jogando.

**M21-15 · Uma arena por zona, escolha no lugar (formato Infernal Hordes)** · G (pedido do usuário em 2026-11-25; formato combinado no mesmo dia; vem logo depois da `M17-01`)
- Ideia do usuário, com o Infernal Hordes do Diablo 4 de referência: as ondas 1 a 4 de cada zona na mesma arena; ao vencer, a próxima carta é escolhida ali mesmo e a luta segue no lugar. Aproxima do original, onde todas as ondas são na mesma arena e a carta é escolhida ali.
- Combinado (2026-11-25): 3 altares surgem na arena depois da onda, cada um com uma carta; andar até um e E escolhe (reaproveita os portões). As cartas são as do original (sem par bônus + penalidade). Loja e santuário aparecem na arena, sem viagem. O chefe continua numa arena própria (portal), depois a zona seguinte.
- O tamanho da arena entra aqui (pedido do usuário no mesmo dia: "the map for the wave is too small"). Hoje a clareira tem raio de cerca de 18 m e a arena do chefe 17 m: cerca de 1.000 m², contra uns 5.000 m² do original na escala de 12 px por m. A câmera padrão mostra uns 31 × 24 m, então a clareira já passa da tela. Variantes a medir com o bot: raio 22 m; raio 26 m com zoom padrão 1,15; só a câmera mais afastada; arena oval, mais larga que funda. Melhorias propostas: mesmo número de inimigos por onda, arena do chefe na mesma proporção, seta na borda para inimigo fora da tela (se houver luta fora dela).
- Saem ou mudam: trilhas, bifurcações, desvios (talvez um 4º altar opcional) e os 5 trechos do `worldgen`; a caminhada do bot some. Para não ficar monótono, a arena muda um pouco a cada onda conforme a carta (poças, pedras, luz).
- **Pendências para confirmar com o usuário ao começar:** o texto novo do `docs/design.md`; o destino dos desvios; o que muda na arena a cada carta; a variante de tamanho (depois da medição).
- Pronto quando: as 4 ondas de cada zona correm na mesma arena com a escolha nos altares, o bot mede as variantes de tamanho e o usuário joga e aprova.
- **Feito em 2026-11-25 (falta o usuário jogar):** partes a a d. Pendências respondidas: texto do `design.md` (itens 2 a 4 do loop), desvios viram o 4º altar opcional (no máximo 1 por onda), cada onda com o seu fosso e barris e a luz pela carta, tamanho 22 m (escolha do usuário depois da medição: 78% no difícil, 25% dos inimigos fora da tela no zoom 1; a de 26 m e a oval não foram medidas). Seta na borda para todo inimigo fora da tela (as 8 mais perto; campeão e chefe em dourado).

**M21-11 · Maestria por herói** · M (depois do M13)
- Jogar com um herói libera alternativas sem ganho de poder (ex.: técnica alternativa, ataque básico alternativo), no espírito dos desbloqueios do original.
- Pronto quando: cada herói tem ao menos uma alternativa desbloqueável e ela não é mais forte que a original.

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

**M1-06 · Chefes atuais no Blender** · G (um chefe por sessão) [validar cada um]
- Registrado em 2026-11-19, a pedido do usuário. Os 4 chefes do M1 foram feitos por código antes da D16. Refazer cada um no Blender por script (`tools/blender/<id>.py`, com brief em `docs/briefs/`), no mesmo padrão dos inimigos do M3: bloodfang, gravekeeper, ember_matriarch (patas com cinemática, rachaduras de lava acesas) e hollow_king. Manter a versão por código como `<id>_v1` para comparar na prévia.
- Pronto quando: o usuário aprova cada um ao lado do sprite e da versão antiga.

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

**M2-11 · Os 9 heróis no Blender** · G (um herói por sessão) [pedido do usuário, 2026-11-25]
- Os heróis nunca passaram pelo Blender: ainda são primitivas de `kit.ts` em `cast-heroes.ts`; só inimigos e chefes têm `tools/blender/<id>.py`. Refazer cada um pelo método da seção 4 (D16): brief, sprite como fonte, medidas, script em `tools/blender/<id>.py`, `models/<id>.json`, receita só com esqueleto e postura, crítico cego antes de mostrar.
- Cuidado: o herói é visto o tempo todo e tem animação de técnica e de spells; manter os pivôs e os ossos que `animate.ts` usa, para não quebrar as animações.
- Pronto quando: os 9 vêm do Blender e o usuário aprova cada um.

**M2-10 · Tela de seleção com os heróis novos** · P
- Passos: a tela de título mostra o herói 3D girando (reaproveitar a prévia) em vez de só texto.

### M19 — Kit dos heróis do Dungeon Reign [validar cada herói]

Pedido do usuário em 2026-11-14, na frente do M3: cada herói joga como no Dungeon Reign. Hoje as técnicas são aproximações (a Frostine tem uma nova de gelo no lugar da Glacial Wall; o Varok atordoa em vez de tirar 8% da vida máxima) e as passivas quase não existem (a Frostine só deixa lento). A fonte é `dungeon-idle`: `src/data/characters.lua` (efeitos, `frost`, `autoPoison`, `brood`, `maxHitFraction`, `passiveText`), `src/data/spells.lua` (`tech({...})`, seção das técnicas), `src/spells/techniques.lua` (comportamento), `src/combat/frost.lua`, `src/combat/auto_attack.lua` (`autoStyle`) e `src/combat/shield_throw.lua`.

Regras do marco:
- Mecânica igual à do original; só muda o que o formato pede (tela fixa virou mapa aberto, ondas viraram acampamentos). Cada diferença fica escrita na linha do registro.
- Unidades: o Dungeon Reign mede em pixels. `M19-01` fixa um fator de conversão único (proposta: 16 px = 1 m, conferido pelo alcance do ataque básico) e todo número passa por ele, em `src/data`.
- Cada técnica entra com efeito mínimo legível (a parede de gelo é uma parede que se vê); o acabamento fica para o `M5-03`.
- Níveis 1 a 5 e evolução das técnicas entram nos dados agora, mas o jogo usa o nível 1 até existir como subir (`M6-06`/`M7`).

**M19-01 · Dados e núcleo das técnicas e passivas** · M
- Arquivos: `src/data/heroes.ts` (números de `characters.lua` e das 9 `tech`), `src/core/techniques.ts` (dano por nível e atributo, marcos de nível, evolução), `src/core/frost.ts` (estado de Estilhaçar, Quebradiço, Pingente e Frio profundo, sem three.js), testes.
- Pronto quando: há teste para o dano de cada técnica no nível 1 e 5 e para as regras da `frost.lua` (congelado + gelo = ×2 e descongela; 8 acúmulos em chefe ou campeão = Quebradiço +30% por 4 s; 4º tiro seguido no mesmo alvo = pingente ×3; 3 acertos em 3 s congelam inimigo comum).

**M19-02 · Frostine** · M
- Glacial Wall: parede de gelo no cursor (alcance mínimo e máximo), na direção da mira, por 5 s; inimigos não atravessam (colisão no `enemy.ts`) e quem bate congela 1 s.
- Passiva Frost inteira (`M19-01`), com sinal visível: congelado, acúmulos, Quebradiço, pingente, estilhaço. Chefes ficam lentos até 20% (`bossSlowCap`).
- Pronto quando: dá para segurar um grupo atrás da parede e estilhaçar quem congelou, e um chefe fica Quebradiço numa luta normal.

**M19-03 · Kaelen e Aurelius** · M
- Storm Step: 0,3 s invulnerável e rastro elétrico de 2 s que fere em pulsos. Ataque `storm`: com Double salta para outro inimigo, com Cone bifurca no primeiro acerto.
- Time Rift: inimigos 60% mais lentos e projéteis inimigos parados dentro; implode em 3 s com mais dano por inimigo preso (até ×3).

**M19-04 · Zephyr, Varok e Ignis** · M
- Fan the Hammer: 5 tiros em cone com o dano do ataque básico. Ricochete já existe; conferir os números.
- Execution Leap: o inimigo com mais vida na área perde 8% da vida máxima; todos ficam atordoados 0,5 s. Inquebrável já existe.
- Inferno Charge: atravessa os inimigos e termina com soco que abre anel de fogo; 0,22 s invulnerável. Ataque `firefan` a 65% do alcance.

**M19-05 · Umbra, Seraph e Vesper** · M
- Shadow Step: some 0,6 s (invulnerável) e reaparece atrás do inimigo mais forte por perto com golpe ×3 sempre crítico. Passiva: +50% em quem se afasta, está atordoado ou nos 2 s depois do passo; matar assim cura 4.
- Aegis: escudo de 3 s que bloqueia o próximo golpe; ao acabar explode em volta e cura 10% da vida. Passiva: a cada 4 arremessos do escudo, cura 2.
- Brood: 2 vespas grandes por 6 s que ferroam e envenenam (3 acúmulos). Passiva Ninhada: uma abelha pequena a cada 8 s (até 3, vive 15 s). Ataque `venom` com 1 acúmulo por acerto, até 3.

**M19-06 · Textos e interface** · P
- Passos: descrição da técnica e da passiva de cada herói na escolha de herói e na pausa, com os textos do original; contador de recarga com o nome da técnica.

**M19-07 · Evolução das técnicas** · M [decisão D3]
- Passos: os marcos de nível 2 a 5 e a evolução (Permafrost Bastion, Tempest Step, Stasis Field, Trick Shot, Kingslayer, Phoenix Rush, Eclipse, Sanctum, Broodmother). Depende de como se sobe de nível (`M6-06`/`M7`).

**M19-08 · Modo Boss Killer do Varok** · P
- Registrado em 2026-11-19 (paridade H9). Porta de `characters.lua` `runMods` (D-207): menos inimigos (`enemyCount`), chefes mais fortes (`bossHp`), recompensa por inimigo menor e por chefe maior (`killReward`, `bossReward`) e o que mais a linha trouxer. Agem na partida como sala ou pacto.
- Pronto quando: os números batem com o `.lua` no `tests/parity.test.ts` e a partida do Varok mostra menos inimigos e chefes mais fortes.

### M20 — Partida como no Dungeon Reign [decisão D13]

Pedido do usuário em 2026-11-15: a estrutura de jogo é a do Dungeon Reign. Uma partida tem seed própria, herói, dificuldade e spell inicial; 20 ondas em 4 zonas de mapa aberto (cada zona = 5 ondas, chefe nas ondas 5, 10, 15 e 20); melhorias de nível com 3 escolhas; mapa da partida entre ondas; loja; relíquias; morte encerra. Sem equipamento. O save guarda a partida em andamento (checkpoint antes de cada onda, como no original). Fontes em `dungeon-idle`: `src/run/` (`run_controller.lua`, `run_save.lua`, `wave_system.lua`, `run_map*.lua`, `run_intermission.lua`), `src/data/waves.lua`, `run_map.lua`, `upgrades.lua`, `difficulties.lua`, `src/progression/`, `src/core/game_state.lua`, `save.lua`, `unlocks.lua`.

**M20-00 · Paridade da partida** · P
- Linhas `R` em `docs/paridade.md` (ciclo da partida, ondas, mapa, nível, ouro, morte, vitória, checkpoint, dificuldades, desbloqueios) e o teste de paridade lendo `waves.lua`, `run_map.lua`, `upgrades.lua`, `difficulties.lua` e as constantes de XP e de ondas.
- Pronto quando: toda regra da partida tem linha e os números entram em `src/data` conferidos pelo teste.

**M20-01 · Núcleo da partida e save** · M
- `src/core/run.ts`: estado da partida puro (seed, fluxos de RNG por rótulo, onda, ouro, XP, nível, melhorias, relíquias, spells, técnica), `newRun`, checkpoint antes de cada onda e `continueRun`. O save passa a guardar a partida em andamento e os registros; a versão do save sobe e o save contínuo antigo é descartado com aviso.
- Pronto quando: há teste de que continuar uma partida no meio dá o mesmo mapa e os mesmos sorteios.

**M20-02 · Zona = 5 ondas** · M
- `worldgen` divide o mapa de cada zona em 5 trechos pela seed da partida. Como no original (Q2): entrar no trecho começa a onda; os inimigos chegam pelas bordas do trecho ao longo da duração, na contagem e composição de `waves.lua` (curva `COUNT_MULT`, campeões); a onda acaba no tempo ou quando não sobra ninguém; Apressar como lá; a onda 5 de cada zona é a arena do chefe. As 4 zonas em sequência na mesma partida.
- Pronto quando: dá para jogar as 20 ondas em sequência e o checkpoint de cada onda volta ao começo dela.

**M20-03 · Subir de nível como no original** · M
- XP e curva de `constants.lua` (`XP_GROWTH`), 3 melhorias de `upgrades.lua` com raridade (comum, rara, épica), troca paga com ouro. Saem os pontos de atributo e o nível até 60.
- Pronto quando: as melhorias e as chances batem com o teste de paridade.

**M20-04 · Remover o equipamento** · P · feito
- Saem itens, afixos, inventário, drops de item e a tela de inventário; a ficha do herói vira a tela de status da partida (atributos calculados, melhorias, relíquias, spells).

**M20-05 · Mapa da partida entre ondas** · M · feito
- 3 cartas por intervalo, com os 8 tipos de nó e os pesos de `run_map.lua`; loja garantida a cada 3 ondas. Os nós que dependem de sistema que ainda não existe (evento, pacto) entram desligados e ficam "falta" na paridade.

**M20-06 · Início, morte e vitória** · P · feito
- Telas: herói, dificuldade, spell inicial (`M6-02` faz o lançamento). Morte encerra com tela de resultado; vencer a onda 20 dá vitória e a escolha de seguir no modo sem fim. Registros entre partidas.

**M20-08 · Perigos de chão das salas** · P · feito
- Raios persistentes (Storm Floor, Fractured Floor, Storm Vault) e poças de cura (Sanctuary Floor, Blessed Onslaught), como em `room_effects.lua` (números `STORM` e `POOL_TICK` de `rooms.lua`, provisórios lá também). Os dados já estão em `src/data/rooms.ts`; a carta mostra "(em breve)".
- Pronto quando: as 5 salas têm o efeito no chão da clareira e a carta deixa de dizer "em breve".

**M20-07 · Desbloqueios** · P
- Heróis e relíquias liberados por conquista, como em `unlocks.lua` (Frostine, Kaelen, Aurelius e Ignis abertos desde o início). Junto com o `M13-04`.

**M20-09 · Saco de chefes** · M [D6, 2026-11-16]
- Porta de `bosses/boss_bag.lua`: os chefes num saco embaralhado pela seed (fluxo próprio no `RunRng`), sem repetir até esvaziar; o chefe das ondas 5, 10, 15 e 20 e o da emboscada saem do saco. O bioma segue em ordem fixa (Bosque, Cripta, Vulcão, Vazio) e não precisa combinar com o chefe. Onda 20: o "Crowned King" (`B.CROWN`), com todos os ataques desde a fase 1 e um emprestado de outro chefe (`WaveSystem.crownAttack`).
- Até o `M10`, o saco tem só os chefes modelados (hoje 4). Teste em `core`: mesma seed, mesma ordem; sem repetição dentro do saco; checkpoint guarda o saco.
- Pronto quando: `zones.ts` não amarra mais o chefe ao bioma, e duas seeds diferentes dão chefes em ordens diferentes.

**M20-10 · Varredura de paridade** · M [D17, 2026-11-19]
- Primeira tarefa da fase 1 (seção 3.0). Passar por todos os sistemas do original (`dungeon-idle/src/`: `run/`, `combat/`, `player/`, `enemies/`, `bosses/`, `spells/`, `shop/`, `progression/`, `data/*.lua`) e conferir contra o `docs/paridade.md`. Corrigir as linhas velhas (S8, S10, S22, S24 a S27 ainda dizem "falta" do que já foi feito); abrir linha para cada regra do original que ainda não tem; cada "falta" aponta para uma tarefa, criando a tarefa quando não houver (por exemplo, as melhorias de nível que o R18 deixa de fora, o veneno da Vesper no S23, o ataque emprestado do rei coroado no R11, o dano por fonte do R23). Listar à parte o que é "adaptado" e ainda não foi aceito, para o usuário decidir.
- Pronto quando: toda regra jogável do original tem linha na paridade, toda linha "falta" tem tarefa, e a tabela da seção 3.0 está atualizada.

**M20-11 · Ajustes que ficaram para trás** · P [paridade R8, R12, R15, R20]
- Tirar o corte `TUNING.boss.hpMult` (0,55) da vida do chefe, que esperava as melhorias de nível e as spells (já feitas); aplicar a velocidade de projétil da dificuldade e da sala (`mods.projectileSpeed`) nos tiros dos inimigos; aplicar o `HASTEN.enemySpeed` (+20% de movimento e de ritmo de ataque) ao Apressar.
- Pronto quando: as linhas R8, R12, R15 e R20 não citam mais estes pontos, e uma luta de chefe na onda 5 em Normal foi conferida no console (vida igual à do `bossStats`).

**M20-12 · Melhorias de nível que faltam** · G (dividir: ataque e recompensa · exclusivas de herói) [paridade R18]
- Ligar os 21 atributos de `upgrades.lua` que ainda prendem melhorias fora do sorteio: `doubleShot`, `coneShot`, `pierce`, `fanShots`, `autoProjectileSpeedPct`, `knockbackPct`, `techniqueDamagePct`, `followThroughPct`, `executionerPct`, `deathHealChance`, `championXpPct`, `survivorRewardPct`; e as exclusivas de herói `permafrost`, `staticCharge`, `riftDurationFlat`, `wildfire`, `nightfall`, `judgement`, `contagion`, `shieldBoomerang`, `shieldRicochet`. Portar as pilhas com retorno decrescente de `core/modifiers.lua` e o teto suave da regeneração. **H8 (decidido em 2026-11-19: como o original):** o ataque básico de cada herói segue o `autoStyle` de lá (`auto_attack.lua`: dano, ritmo, alcance e forma de cada estilo; Kaelen um raio só, Aurelius tiro normal sem atravessar, Ignis leque de fogo a 65% do alcance) e o Cone Shot, o Double Shot e o Pierce mudam por estilo (D-590).
- Pronto quando: `UPGRADE_STAT` cobre todos os atributos de `upgrades.lua`, o teste de paridade compara o sorteio com a lista inteira, e a linha R18 deixa de ser "adaptado".
- **Dividida em 2026-11-22:** **parte 1 (feita em 2026-11-22):** pilhas com retorno decrescente (`stackMultiplier`, `stackChance`, `effectiveRegen` em `core/stats.ts`; uma fonte por melhoria, `upgradeSources`; recarga com piso de 0,35; números em `STACKING`) e os atributos `techniqueDamagePct`, `followThroughPct`, `deathHealChance`, `championXpPct`, `championGoldPct`, `survivorRewardPct`, `knockbackPct` (números em `UPGRADE_FX`). **Parte 2 (feita em 2026-11-22):** H8 (`autoStyle` de cada herói, `HeroDef.style`) com `doubleShot`, `coneShot`, `pierce`, `fanShots` e `autoProjectileSpeedPct` (Heavy Shot); as formas são as do original, os números de ritmo, dano e alcance continuam os daqui (D18). **Parte 3 (feita em 2026-11-22):** as exclusivas de herói (`permafrost`, `staticCharge`, `riftDurationFlat`, `wildfire`, `executionerPct`, `nightfall`, `judgement`, `contagion`, `shieldBoomerang`, `shieldRicochet`); números em `HERO_UPGRADES`.

**M20-13 · Desafios da partida** · M [paridade P1]
- Porta de `run/challenges.lua` (AB-2, D-306): um desafio novo nas ondas 1, 6, 11 e 16, até 2 abertos, com prazo (fim do bloco, próximo chefe, +8 ondas), pago em ouro (15 + 6 × onda, × tamanho) ou em troca grátis (C-13 das melhorias). Estado em `run.challenges`, no checkpoint. Lógica em `core`, com teste; painel na tela I e aviso no HUD.
- Pronto quando: os desafios saem nas mesmas ondas e com os mesmos prazos e pagamentos do Lua, para a mesma seed.

**M20-14 · Dano por fonte** · P [paridade P8, R23]
- Porta de `run/run_stats.lua` (`dealtRows`, `takenRows`): dano causado por ataque, técnica, cada spell e relíquia; dano recebido por inimigo e chefe. Mostrar na tela de resultado.
- Pronto quando: a tela de resultado lista as fontes, e a soma bate com o total.

### M3 — Inimigos atuais [validar em lote de 2 ou 3]

Uma tarefa `M` para cada par. Design na seção 7.2. Atenção ao orçamento de triângulos: são dezenas na tela.

| ID | Inimigos | Ponto de atenção |
|---|---|---|
| M3-01 | goblin, orc | Mesma família (pele verde); goblin pequeno e curvado, orc largo com ombreira Revisão 6 (usuário achou a 5 pior: "bundudo", nada medonho; mandou duas referências 3D): corpo refeito em pé, tronco em V fundo, coxas verdes sem calça e quadril estreito, pele verde-lima, braçadeiras e faixas nas canelas, cinto largo com fivela redonda, tanga em tiras, coque com rabo, ombreira de quatro placas cor de osso com miolo vermelho, forro de couro e chifres curvos; machado de duas lâminas numa mão só, caído ao lado (sem pegada de duas mãos), `scale` 1,3. Um crítico: ombreira grande demais, faixas enterradas na pele, verde escuro, machado de perfil (tudo corrigido). ~8,8 mil triângulos. |
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
- Pedido do usuário em 2026-11-17 (repensar junto com o `M4-04`): hoje o tiro do ataque básico e o das técnicas e spells sai do meio do corpo, sem animação de uso. Cada herói precisa de pose de disparo, e o projétil nasce da mão, da arma ou do cajado (ponto de saída por herói no rig), sincronizado com o quadro do golpe.
- Pedido do usuário em 2026-11-17 (de novo, durante o `M5-08`): o **ataque básico** precisa ter cara de ataque básico. Efeito mais simples e discreto que o das spells e técnicas (traço curto, faísca pequena, sem clarão grande), saindo certo da arma ou da mão de cada herói. Ao fazer, separar a escala visual: ataque básico < técnica < spell.

**M4-04 · Combos do ataque básico** · M
- Passos: 3 variações de golpe por estilo (`swing`: horizontal, diagonal, estocada final), alternadas por `shot`; o terceiro golpe com mais empurrão. Números em `tuning.ts`.

**M4-05 · Morte por tipo** · P
- Passos: esqueleto desmonta em ossos, gosma derrete, morcego cai girando; os demais mantêm a queda atual.

**M4-06 · Câmera e impacto** · P
- Passos: tremor proporcional ao dano, `hitstop` só em crítico e golpe pesado, leve aproximação na morte de chefe. Opção para reduzir tremor (`M14-05`).

**M4-07 · Detalhes de locomoção** · P
- Passos: poeira nos passos por tipo de chão, pegada na neve e na cinza, grama abrindo ao passar (uniform em `shared.ts`).

**M4-08 · Golpes dos inimigos e chefes** · M [validar]
- 2026-11-20: a telegrafia (preparo legível e marca no chão) passou para a `M21-01`; aqui fica a pose da arma e dos padrões.
- Registrado em 2026-11-19, a pedido do usuário. Cada ataque de inimigo e de chefe ganha preparo, golpe e retorno legíveis, com a arma no plano certo: no `swing` a clava e o machado hoje ficam de lado ou para trás no meio do golpe; o arremesso do bombardier (`throwL`) lê como soco; o archer solta a flecha do arco; spellcaster e summoner erguem cetro e livro. Os padrões dos chefes (slam, charge, nova, summon e os demais em `enemy.ts`) com pose própria. Casa com `M5-01` (telegrafias), `M5-04` (efeitos dos padrões) e `M5-06` (projéteis).
- Pronto quando: dá para dizer qual inimigo vai atacar e quando, só pelo corpo.

### M5 — Efeitos de combate

**M5-01 · Telegrafias com forma e tempo** · M
- Passos: shader próprio em `fx.ts` para círculo, linha, cone e anel: borda nítida, preenchimento que cresce até o impacto, cor por tipo de dano. Substituir os discos lisos em `enemy.ts`.
- Pronto quando: o momento do impacto é previsível só pelo desenho no chão.

**M5-02 · Biblioteca de efeitos** · M
- Passos: em `fx.ts`, primitivas reutilizáveis: `burst`, `ring`, `beam`, `trail`, `pillar`, `groundCrack`, `orbit`; todas com cor, duração e curva. Sem lógica de jogo.

**M5-03 · Efeito das 9 técnicas** · G (3 por sessão)
- Passos: montar cada técnica com as primitivas de `M5-02` (Nova Glacial: anel de gelo e cristais no chão; Salto de Execução: cratera e onda).
- Partes (2026-11-17): **1** as de deslocamento, Kaelen (Storm Step), Ignis (Inferno Charge) e Umbra (Shadow Step); **2** Varok (salto), Frostine (muro de gelo) e Aurelius (fenda); **3** Zephyr (leque), Seraph (Aegis) e Vesper (Broodmother). Escala visual pedida pelo usuário: ataque básico < técnica < spell.

**M5-04 · Efeitos dos padrões de chefe** · G
- Passos: um visual por padrão existente (slam, charge, nova, summon e os demais em `enemy.ts`), com som.

**M5-05 · Estados visíveis** · P
- Passos: queimando (brasas), congelado (casca azul e lentidão visível), envenenado (bolhas verdes), marcado; ícone pequeno sobre a barra de vida.
- Pedido do usuário em 2026-11-16: **todo estado que muda o jogo tem indicador sobre o inimigo**, desenhado por código. Inclui os das spells: queimando pelo Fireball (pode explodir: Volátil), lento pela Iceball (leva dano extra com Brittle Chill), e os que vierem no `M6-03` a `M6-05` (veneno acumulado, preso pela runa, atordoado). Hoje só há a tinta no corpo do inimigo.
- Pronto quando: numa luta cheia, o jogador diz o estado de cada inimigo sem ler número.

**M5-08 · Efeitos das 11 spells** · G (3 ou 4 por sessão) [validar]
- Pedido do usuário em 2026-11-16. Hoje as spells usam bola colorida, faíscas e anel (`src/game/spells.ts`). Passos: lançamento, voo e impacto de cada spell com as primitivas do `M5-02` e o som do `M15-02` (Fireball: bola de fogo com chama e rastro de fumaça, explosão com brasas no chão; Iceball: cristal girando, impacto com espinhos de gelo, como os `fire_burst` e `ice_spikes` do original). Captura e crítico cego antes de mostrar.
- Pronto quando: cada spell é reconhecível só pelo efeito, sem o ícone do HUD.

**M5-09 · Ataque básico com identidade e mais contido** · G (3 heróis por sessão) [pedido do usuário, 2026-11-25: muito "spam visual" para um simples ataque básico; e cada herói com o seu, "como a Seraph, que joga o escudo"]
- Hoje a mecânica já é de cada herói (`style` em `data/autostyle.ts`), mas o visual não: todo projétil é a mesma forma alongada (`PROJ_GEO` em `game.ts`), só muda a cor; o escudo da Seraph sai como uma bolinha amarela. E o efeito em volta (partículas, brilho, rastro, flash no acerto) está carregado demais para algo que sai o tempo todo.
- Identidade por herói, tirada do sprite e das animações do Dungeon Reign: Seraph, o escudo dourado girando (e voltando no bumerangue); Zephyr, bala com rastro fino; Frostine, pingente de gelo; Kaelen, faísca elétrica; Aurelius, orbe arcano; Vesper, glóbulo de veneno; Ignis, leque de fogo; Varok, o golpe do martelo no chão; Umbra, o corte das adagas. O modelo do escudo e o de cada projétil seguem a D16 quando forem malha (Blender por script); brilho e rastro são por código.
- Mais contido: menos partículas e luz, sem bloom forte, impacto curto. A técnica e as spells mantêm o peso que têm, para a escala ataque básico < técnica < spell ficar clara. Conferir com captura de tela, antes e depois, em luta cheia.
- Os projéteis dos inimigos ficam na `M5-06`.
- Pronto quando: o usuário vê os 9 e aprova.

**M5-06 · Projéteis com identidade** · P
- Passos: flecha, bala, orbe arcano, bomba em arco com sombra; rastro por tipo. Hoje são esferas coloridas.

**M5-07 · Números de dano e textos** · P
- Passos: tamanho por magnitude, crítico com destaque, agrupar acertos rápidos no mesmo alvo, cor por tipo.

### M6 — Spells [decisão D2]

Porta das 11 spells do Dungeon Reign: `fireball`, `iceball`, `chain_lightning`, `arcane_bolt`, `healing_field`, `blade_orbit`, `venom_nova`, `cyclone`, `rune_traps`, `prism_beam`, `quake_totem`. **D12 decidida:** não são lançadas sozinhas como lá; 2 espaços nas teclas 1 e 2, mira no cursor, técnica e esquiva sem mudança. Proposta para D2: qualquer herói usa qualquer spell, começando pelas 4 iniciais dele (`startingSpells`), nível de 1 a 5.

**M6-00 · Tabela de paridade com o Dungeon Reign** · P
- Arquivo: `docs/paridade.md`. Uma linha por regra do sistema de spells do original (escolha inicial em `ui/screens/spell_select.lua`, espaços e níveis em `core/constants.lua` e `spells/spell_system.lua`, ofertas da loja em `shop/shop_system.lua`, evolução em `spells/evolution.lua`, números em `data/spells.lua`), com arquivo e linha de lá, o equivalente daqui e o estado: igual, adaptado (com o motivo) ou falta.
- Pronto quando: toda regra tem linha, e cada "adaptado" foi aceito pelo usuário. Nas tarefas seguintes do M6, o código só fica pronto quando a linha dele está "igual" ou "adaptado".
- Garantia por teste: `tests/parity.test.ts` lê os `.lua` do repo local (`DUNGEON_IDLE`) com um leitor de Lua em Node e compara com `src/data`: as 4 spells iniciais de cada herói, os números das 11 spells, marcos, modificadores, evoluções, `MAX_SPELLS` e `SPELL_MAX_LEVEL`. Pula sozinho se o repo não estiver na máquina.
- Funções do núcleo com o nome e o retorno das de lá (`addSpell` com `no_slot`/`owned`, `levelUp` com `max_level`, `addModifier` com `not_in_pool`), cada uma com teste do mesmo caso.

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

**M6-06 · Evolução: dados, números e regras** · M [D3 respondida: spell nova, nível e modificador vêm da loja, `M7`]
- Reescrita em 2026-11-16: com a D3, obter e subir spell é a loja (`M7`); aqui fica a evolução (S18). As 12 evoluções em `data/spells.ts` (`EVOLUTIONS`), os números da forma evoluída em `spellStats` e as regras em `core/evolution.ts` (receita, oferta de até 3, recusa, aplicar), conferidos contra o original.

**M6-09 · Evolução: oferta no intervalo** · P
- Passos: no intervalo, depois das melhorias de nível, a tela com até 3 evoluções (`pendingEvolutionOffer`), escolher ou recusar; marcar as relíquias que ajudam a evoluir (`wantedRelics`) na recompensa de relíquia. Só aparece em jogo quando o nível 5 der para alcançar (loja, `M7`).

**M6-10 · Evolução: as formas novas, 1** · M
- `firestorm` (aura que segue o herói), `firewave` (muralha), `blizzard` (tempestade), `lightning_strike` (raio em linha), `arcane_strike` (ataque básico carregado), `sanctuary` (campo dourado que queima). Efeitos próprios de cada uma.

**M6-11 · Evolução: as formas novas, 2** · M
- `blade_storm` (círculo que abre até 160), `plague_bloom` (veneno que espalha na morte), `maelstrom` (tornado que segue a mira e arremessa), `rune_circle` (linhas entre runas), `spectrum` (raio que divide em 3 cores), `earthen_ward` (ídolo que atrai e apanha).

**M6-07 · Interface de spells** · P
- Passos: barra com 2 espaços, tela de grimório (lista, nível, descrição, equipar).
- Feito em 2026-11-16: a barra já existia (M6-02); o grimório é o DEV Grimoire do original (`grimoire.lua`, F1), paridade S29.

**M6-12 · Atributos de spell do herói (D14)** · M
- Separado do `M6-08` em 2026-11-17: poder de magia, dano de spell, dano por escola (fogo, gelo, raio, arcano), queimadura, lentidão (pontos e duração) e veneno em `core/stats.ts`; dano do ataque (`autoDamagePct`) à parte do dano global; recarga e área globais no pool de cada spell (`spellContext`). Heróis, relíquias e melhorias de nível com os atributos de lá.

**M6-08 · Modificadores de spell** · M
- Passos: porta dos modificadores do Dungeon Reign (`shop.lua` §77) como melhorias permanentes por spell.
- Feito em 2026-11-17: o efeito já estava no núcleo (`addModifier`, `collectSpellEffects`, conversão da evolução) e todo campo que um modificador mexe já é lido pelo `SpellCaster`. Ficou a parte de mostrar: lista na tela de status e dica da spell. A compra é da loja (`M7`); até lá, F1.

### M7 — Economia [decisão D4]

**Refeito em 2026-11-15 (D13):** o M7 vira o ouro e a Magic Shop do original (`shop/shop_system.lua`, `data/shop.lua`): ofertas por visita, preços, troca de ofertas, relíquia na 4ª oferta. Desmontar, vender e ferreiro saem (não há itens). Tarefas reescritas em 2026-11-17 (o usuário escolheu o M7 antes do M3). Paridade: linhas S8, S10, S19 a S21, R14, R19, R21 de `docs/paridade.md`.

**M7-01 · Ouro e XP por inimigo morto** · P · feito
- Arquivos: `core/wave.ts` (`killReward`), `game.ts`, `enemy.ts`.
- Passos: `Rewards.enemyKill` do original (`progression/rewards.lua`): ouro e XP do inimigo × recompensa da sala e da dificuldade; campeão ×4,5; chefe com o bônus de tier (`boss.lua` `rewards`); 20% a menos de ouro no chefe ou campeão de sala de risco no Hard (`riskGold`); invocados e filhos não rendem. Hoje o inimigo não dá ouro, o XP dele ignora a sala e a dificuldade, e o chefe não leva o tier. Teste contra o Lua.

**M7-02 · Orbes de ouro e XP no chão** · M · feito
- Arquivos: `game/loot.ts`, `core/wave.ts` (banco), `ui.ts`.
- Passos: `combat/loot.lua` (D-618, D-637): o que o inimigo vale cai como orbe e é puxado quando o herói passa perto (`LOOT` de `tuning.lua`: alcance, assentar, velocidade, teto no chão); o que sobra no fim da onda vai para o banco, e cada inimigo que nasce depois carrega um orbe do banco ("2x", moeda sob os pés) até ele esvaziar; contador "2x" ao lado do ouro.

**M7-03 · Núcleo da Magic Shop** · M · feito
- Arquivos: `src/data/shop.ts`, `src/core/shop.ts`, testes.
- Passos: porta de `data/shop.lua` e `shop/shop_system.lua`: nível da loja pela onda, as 6 categorias por igual, melhoria de spell garantida, 4ª oferta de relíquia (sorteio normal), preços (`generalCost`, `spellCost`, `modifierCost`, `relicCost`), validação depois de outras compras, compra (Sharpened Weapon, Arcane Tome, Vitality com cura total, spell nova, nível, modificador, relíquia) e troca de ofertas (25 × nível, dobrando na visita). Stream `shop` da seed. Teste de preços e sorteio contra o Lua.

**M7-04 · Tela da loja e entrada no mapa** · M · feito, falta validar
- Arquivos: `ui.ts`, `game.ts`.
- Passos: ligar a carta "Shop" do mapa (`MAP_DISABLED`), a loja automática antes de toda onda de chefe (`pendingShop = "preboss"`) e depois da sala de campeão; tela com 3 ofertas + relíquia, preço, motivo de oferta inválida, comprar, trocar, sair (nunca trava a onda). Ofertas de spell com a dica da `M6-08`.

**M7-05 · Técnica na loja** · P · feito, falta validar
- Passos: a técnica (`spells[0]`) entra como melhoria de spell (S19, D-252), nível 5 = evolução dela. Depende do `M19-07`.

Fica para outros marcos: Hoarder's Crown (`shopPriceMult`), trocas grátis, relíquia de encomenda e Depths (`M12`, `M13`).

### M8 — Itens

**Cancelado em 2026-11-15 (D13):** o Dungeon Reign não tem equipamento. As tarefas abaixo ficam só como registro.

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

**M9-08 · Conferir os 10 inimigos atuais** · M [paridade E2, E3]
- O `Enemy` (`game/enemy.ts`) foi escrito antes da régua de paridade. Conferir número a número contra `enemies/ai.lua`, `combat/enemy_attacks.lua` e `combat/status.lua`: alcance, preparo, ritmo de ataque, passo, projéteis, bombas, invocação, berserker; queimadura, lentidão com teto em chefe, atordoamento e veneno. Números para `data/enemies.ts` e `data/run.ts`, com teste contra o Lua onde der.
- Pronto quando: as linhas E2 e E3 do `docs/paridade.md` ficam em "igual" ou em "adaptado" com motivo.

**M9-07 · Composição de acampamentos** · P
- Passos: modelos de grupo em `zones.ts` (linha de frente e atiradores, enxame, elite com escolta) em vez de sorteio independente.

### M10 — Chefes novos [validar cada um]

Uma tarefa `G` por chefe, dividida em duas sessões: **modelo** e **luta** (mecânica, padrões, efeitos). Cada chefe traz a mecânica própria do Dungeon Reign. **Pela D17 (2026-11-19), a sessão luta vem primeiro, na fase 1, com corpo provisório por código; a sessão modelo fica para a fase 2.**

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
- **M10-01, plano (2026-11-23).** Luta igual a `bosses.lua`: mantém 230 px do herói (anda de lado na faixa, chega ou recua fora dela), skillshot com recarga própria (2,15 s, ×0,88 e ×0,82 nas fases; linha fina 0,45 s e tiro a 300 px/s), e na rotação (4 s) `mark` (fase 2: retícula que segue o herói 1 s, trava 0,55 s, 42 px, ×1,25; quem leva fica Marked 4 s e recebe ×1,25 de todo dano dele) e `crossfire` (fase 3: duas linhas de 840 × 26 px em cruz sobre o herói, 0,8 s, ×1,2). Golpe de pinça se o herói encostar. Sem o tiro comum (B2 segue adaptado). Corpo no Blender (escorpião cromado de faixas douradas, olhos vermelhos, ferrão aceso, pinças de ponta dourada): forma nova `scorpion` com as 8 patas por cinemática inversa (malhas de pata do Blender), pinças nos braços e cauda em cadeia de ossos; crítico cego. O `crossfire` entra no empréstimo do rei coroado.
- **M10-02, plano (2026-11-23).** Luta igual a `boss_ai_ext.lua`: mantém 150 px; `sandvolley` (fase 1: parede de 15 tiros de areia perpendicular à mira, 30 px entre eles, vão de 3 sorteado, 0,8 da velocidade), `tailsweep` (fase 2: 3 linhas de 300 × 30 px em leque de 70°, 0,2 s entre elas), `erupt` (fase 3: 3 círculos de 52 px, cada um trava onde o herói está quando entra na fila, 0,45 s entre eles). Burrow: a cada 8 s (o primeiro aos 3 s), fora de ataque, mergulha 1,2 s sem golpe de contato e emerge onde o herói estava, círculo de 70 px ×1,4. Corpo no Blender: verme de placas marrons nas costas e barriga rosa em gomos, boca redonda de dentes na frente, saindo de um monte de areia; forma nova `worm` (cadeia de gomos pelos ossos da cauda, `head` na ponta), mergulho e emersão na animação.
- **M10-03, plano (2026-11-23).** Luta igual a `boss_ai_ext.lua`: mantém 190 px; `orbitals` (fase 1: brilho 0,5 s em volta dele e 8 orbes em roda que curvam a 1,6 rad/s, sentido sorteado, 0,75 da velocidade, alcance 900 px), `prismbeam` (fase 2: 6 linhas de 600 × 22 px a partir dele, 22° entre elas, varrendo de um lado sorteado, 0,16 s uma depois da outra), `miragedash` (fase 3: some 0,45 s e reaparece a 140 px do herói num ângulo sorteado, linha de 700 × 26 px até o herói com 0,7 s de aviso e nova de 8 tiros a 0,7 da velocidade, ×0,6). Mirage: a cada fase que entra, as cópias da fase anterior somem e nascem 2 a 110 px dele (`mirage_illusion` de `enemies.lua`: atiradora, 7% da vida do chefe, 35% do dano dele, 40 px/s, alcance 260 px, recarga 2,4 s, tiro a 190 px/s; sem recompensa), desenhadas com o corpo do chefe a 55% de opacidade. `minDifficulty = "hard"` de `boss_bag.lua`: o Djinn e o Hollow King só saem do saco na Hard (aqui o Hollow King saía em qualquer uma). Corpo no Blender: torso musculoso turquesa, colete roxo de barra rosa, faixa dourada, turbante creme com rubi e pena, barba preta, orelhas pontudas, braceletes de ouro e cauda de fumaça turquesa → roxo → coral; forma nova `djinn` (tronco, cabeça e braços do manto; cauda em cadeia `tail` → `tail4`, que ondula).
- **M10-04, plano (2026-11-23).** Luta igual a `boss_ai.lua`: mantém 170 px; `venomfield` (fase 1: 3 círculos de 52 px com 0,8 s de aviso, o 1º no herói e os outros a 90 px dele em ângulos espalhados, presos na clareira; cada um vira poça de veneno de 5 s, 0,7 × dano por s), `skillshot` (fase 2, recarga própria como no Deathstalker), `fanvolley` (fase 3: brilho 0,4 s e leque de 50°, 5 tiros, 7 enfurecido). Venom Bloom: todo tiro dele (skillshot e leque) vira poça de 30 px, 2,5 s, 0,45 × dano por s onde acaba (acerto, parede ou alcance). O `fan` daqui ganha `enragedCount`. Corpo no Blender (sprite: corpo de crocodilo verde, barriga creme, espinhos creme no dorso e na cauda, 4 patas com garras, 3 pescoços longos com cabeças de dentes e olhos laranja): forma nova `hydra` (tronco quadrúpede, cauda em cadeia, 3 pescoços em cadeia de ossos que ondulam e se erguem no ataque); crítico cego.
- **M10-04, pedido do usuário (2026-11-24).** A cabeça parecia crocodilo com dinossauro: refazer como cabeça de serpente/dragão assustadora (imagem de referência dele: crânio chato em cunha que alarga nas bochechas, sobrancelha pesada em V sobre olhos acesos em fenda, chifres para trás, boca escancarada já em repouso com presas longas curvas em cima e embaixo). Espinhos das costas maiores. Cores do sprite mantidas.
- **M10-05, plano (2026-11-24).** Duas partes. **Parte 1 (luta), igual a `boss_ai_ext.lua`:** sem `preferred` (vai atrás); `acidlob` (fase 1: 3 círculos de 44 px, o 1º no herói e os outros a 75 px em ângulo sorteado, aviso de 1 s + 0,15 s a cada um, ×0,9; cada um vira poça com 0,85 do raio, 4 s, 0,35 × dano/s), `slimewave` (fase 2: aviso em anel de 130 px com miolo seguro de 0,35; depois um anel de 22 px de grossura cresce a 220 px/s e acerta uma vez, ×1,1), `engulf` (fase 3: o `charge` daqui, 320 × 48 px a 300 px/s, ×1,5). Mitosis: ao entrar nas fases 2 e 3 solta 3 splitters invocados (MINION_SCALE, sem recompensa) a 40 px dele. **Parte 2 (corpo no Blender):** gosma verde com boca enorme e olhos bravos (sprite em `docs/ref/`), forma nova com malha que pulsa; crítico cego.
- **M10-06, plano (2026-11-24).** Duas partes. **Parte 1 (luta), igual a `boss_ai_ext.lua`:** mantém 170 px; `frostbreath` (fase 1: cone de 240 px e 28° de meia abertura a partir dele, aviso de 1 s, ×1,0; quem leva fica Chilled 2 s a ×0,65 da velocidade), `iciclerain` (fase 2: 7 círculos de 30 px na reta até o herói, 58 px entre eles, começando em max(40, d − 58 × 4), aviso de 0,7 s + 0,12 s a cada um, ×0,9), `glacierdive` (fase 3: alça voo, corpo apagado e sem golpe nem Glacial Wake; círculo de 88 px no herói com 1 s de aviso, ×1,5; pousa ali e deixa gelo com 0,8 do raio). Glacial Wake: a cada 1,6 s (o primeiro aos 3 s, `mechanicTimer`), fora do voo, deixa gelo de 30 px onde está, 5 s, 0,15 × dano/s, e pisar nele deixa o herói Chilled 1 s a ×0,65. Poça de gelo nova em `addPool` (opção de chill). Aviso em cone novo em `fx` (`telegraphCone`). Corpo provisório até a parte 2. **Parte 2 (corpo no Blender):** dragão quadrúpede de gelo com asas (sprite em `docs/ref/`), forma nova; crítico cego.
- **M10-07, plano (2026-11-24).** Duas partes. **Parte 1 (luta), igual a `boss_ai.lua`:** mantém 190 px; `skillshot` (fase 1, recarga própria), `stormfield` (fase 2: 3 círculos de 50 px com 0,8 s de aviso, o 1º no herói e os outros a 80 px dele em ângulo sorteado, presos na clareira; cada um cai como raio e vira zona elétrica de 4 s, 0,55 × dano/s), `radial` (fase 3: brilho de 0,5 s em volta dele e 18 tiros em roda, ângulo inicial sorteado, 0,8 da velocidade, ×0,7). Storm Field (mecânica): a cada 5 s (o primeiro aos 3 s), um círculo de 44 px no herói com 0,9 s de aviso vira raio e zona de 3,5 s, 0,45 × dano/s. Mults de `bosses.lua` (vida 0,98, dano 1,08, passo 1,00, tiro 0,82), relíquias `stormcaller`. `radial` e `stormfield` entram no empréstimo do rei coroado. Corpo provisório até a parte 2. **Parte 2 (corpo no Blender):** rei barbudo sobre nuvem (sprite em `docs/ref/`), crítico cego.
- **M10-08, plano (2026-11-24).** Duas partes. **Parte 1 (luta), igual a `boss_ai.lua`:** sem `preferred` (vai atrás); `quake` (fase 1: anel de 145 px, o `slamRadius`, com miolo seguro de 0,45, cresce a 260 px/s, grossura 20, ×1,1), `armorbreak` (fase 2: círculo de 64 px no herói, 0,9 s, ×1,2; quem leva fica com −15 de armadura por 6 s), `leap` (fase 3: no ar, círculo de 92 px no herói com 1 s de aviso, ×1,4, pousa ali). Earthbreaker: os três deixam chão rachado de 60 px por 3 s, 0,35 × dano/s. Do `build`: guarda de frente (§65, 78°, ×0,15, 2,5 s erguida a cada 9 s, a primeira aos 4,5 s, gira 0,6 rad/s), pedra no lugar do tiro comum (58 px no herói, 1,1 s, ×1,0, recarga de 4 s × fase), passo por fase (×1,15 na 2, ×1,35 no total na 3). Mults de `bosses.lua` (vida 1,30, dano 1,14, passo 0,86, tiro 0,78), relíquias `iron_colossus`. `quake` entra no empréstimo do rei coroado. Corpo provisório até a parte 2. **Parte 2 (corpo no Blender):** golem de placas com fornalha no peito (sprite em `docs/ref/`), crítico cego.
- **M10-09, plano (2026-11-24).** Duas partes. **Parte 1 (luta), igual a `boss_ai.lua`:** mantém 130 px; os três ataques são `riftcross` (Riftwalk, §62): some 0,5 s e reaparece a 120 px do herói num ângulo sorteado (preso na arena, sem golpe nesse tempo, corpo apagado), e corta fase + 1 linhas de 840 × 24 px centradas no herói, espalhadas por meia volta a partir de um ângulo sorteado, 1 s de aviso, ×1,3. Mults de `bosses.lua` (vida 0,96, dano 1,10, passo 0,92, tiro 1,02), sem relíquias de build. Corpo provisório até a parte 2. **Parte 2 (corpo no Blender):** espectro de máscara com duas lâminas (sprite em `docs/ref/`), crítico cego.
- **M10-10 dividida em 2 partes (2026-11-23).** Parte 1: fases por vida (B2) e as mecânicas `blood_rush`, `army_of_the_damned`, `meteor_siege`. Parte 2: `soul_tether` com o Selo de Alma (`soul_ward`, E6), corpo no Blender.

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
- Porta dos 17 eventos (`data/events.lua`, `core/events.lua`) na carta de evento do mapa da partida, como lá (R20, P2). Revisto pela D7 e pela D17: entram todos, não só parte; a ideia antiga de encontros espalhados no mundo fica para a fase 2, se o usuário quiser. **Feita em 2026-11-25**, junto com a `M13-03`.

**M11-09 · Ciclo de luz e clima por zona** · P
- Passos: variação lenta da cor do sol, chuva no Bosque, cinza no Vulcão; só visual.

### M12 — Relíquias e sinergias

**M12-01 · Motor de efeitos de relíquia** · M
- Passos: relíquias como lista de modificadores e ganchos de evento em `core` (hoje são bônus diretos); migrar as 20 atuais sem mudar o comportamento; testes.

**M12-02 a M12-05 · Portar relíquias em lotes** · M cada
- Cerca de 18 por lote, das 94 de `relics.lua`, priorizando as que usam ganchos já existentes. Todas vêm (D7); o jogo agora é em ondas como lá, então nenhuma fica de fora.
- Divisão (2026-11-22, ao fazer o lote 1): `relics.lua` tem 134 relíquias. As evoluções (tier2 e tier3) ficam no `M12-08`; as de chefe (boss e boss_build), as exclusivas (risco, maldição, evento, pacto) e as de spell vão nos lotes abaixo.
  - `M12-02` (feito): 27 do sorteio normal que só somam atributo que o jogo já tem, mais Momentum, Vital Spark e Blood Engine (mecânicas e fileira de estados no HUD).
  - `M12-03` (feito): as 5 de spell (§43), os componentes de spell (Gale Feather, Binding Chalk, Scribe's Quill, Cut Crystal, Sunstone, Geode Heart, Tremor Boots; pedem `windPct`, `runePct`, `lightPct`, `earthPct`), Storm Prism e as outras com `lightningTargets`, `echoChance`, `volatileChance`, `spellCritChance`, `slowedDamagePct`, `chainEscalate` (Rime Charm, Conduit Ring, Pyre/Thunder/Arcanum Sigil, Echo Stone, Stormglass, Seer's Monocle, Prismatic Core).
  - `M12-04` (feito): as mecânicas que faltam no sorteio normal (Cinder Lens, Frost Crown com Frostbite, Glass Throne, Arcane Dominion, Mana Battery, Prism Cycle) e as 20 de chefe (premium na recompensa do chefe, B4 e R13).
  - `M12-05` (feito): as 20 exclusivas (lá são 20, não 22: 4 de evento, 6 de risco, 6 de maldição, 4 de pacto) com Kill Streak, Last Rites, Hoarder's Crown, Berserker's Oath, `championHpPct` e `shopPricePct`; a relíquia de risco no intervalo (R19).

**M12-06 · Sinergias** · M
- Porta das sinergias (`synergies.lua`; lá são 17, não 23): bônus ao juntar relíquias ou spells do mesmo tema. Indicador no inventário. **Feita em 2026-11-24.**

**M12-07 · Limite e escolha** · P [decisão D7]
- D7 decidida (2026-11-16): sem limite, como no original. Esta tarefa vira só conferir que nada daqui limita as relíquias.
- **D7 revista e feita em 2026-11-24:** conferido que nada limita; o usuário pediu, no lugar, que as incomuns acumulem (até 3 cópias, tags uma vez, peso ½ por cópia, 3 exceções de mecânica). Conserto junto: santuário sem relíquia dava escolha vazia e travava o mapa; agora dá ouro.

**M12-08 · Evoluções de relíquia** · M [paridade X5]
- Porta das relíquias de nível 2 e 3 (`data/relics.lua` §42 e §45, `R.evolutions`): componentes que, juntos, viram relíquia evoluída; oferta no intervalo (`run_drafts.lua` `checkRelicEvolutions`, `offerRelicEvolution`, recusa).
- Pronto quando: as receitas batem com o Lua no teste e a oferta aparece no intervalo. **Feita em 2026-11-24.**

**M12-09 · Evoluções de build e identidade** · M [paridade X4]
- Porta do resto de `build/build_system.lua` e `data/synergies.lua`: caminhos (`PATHS`), evolução da build com 8 tags num caminho, identidade da build (`identity`) e prévia (`preview`). Mostrar na tela I.
- Pronto quando: os limiares e efeitos batem com o Lua no teste. **Feita em 2026-11-24.**

**M12-10 · Escolha de relíquia como no original** · M [paridade X6, S18]
- Porta de `relic_system.lua` `draft`, `poolDraft`, `ban`, `bansLeft` e de `run_drafts.lua` `rerollRelics`, `banRelic`: banir, trocar as ofertas, escolha do pool, e o peso 3x das relíquias da receita da spell equipada (D-197).
- Pronto quando: o sorteio de relíquia, para a mesma seed, dá as mesmas ofertas que o Lua.

### M13 — Endgame [decisão D8]

**M13-01 · Dificuldades** · M
- `easy`, `normal`, `hard` (`difficulties.lua`): multiplicadores de vida, dano e loot; liberar `hard` ao vencer o chefe final. Save guarda o progresso por dificuldade.
- **Fechada em 2026-11-25 sem mudança** (usuário de acordo): as 3 dificuldades já estavam portadas e iguais (R25) e as medalhas por herói já existiam. O original nunca tranca a Hard; o que a vitória na Hard abre são as Depths daquele herói (`M13-02`). Por isso a trava da Hard não entra.

**M13-02 · Depths e Marcas** · G [paridade P4; lembrado pelo usuário em 2026-11-22]
- 5 níveis acima do `hard`, cada um soma uma mutação (`data/depths.lua`, `core/depths.lua`): afixos soltos, loja cara, feridas, fúria precoce, chefes marcados. A primeira vitória de cada nível paga Marcas (4 + 2 × nível, `marksFor`), gastas nas 9 vantagens das Depths (reroll extra, bolsa cheia, ganância, relíquia inicial, trocar uma carta, loja farta, poção de reserva, rerrolar relíquia, banimento extra). Tela de preparo das Depths (`depths_setup.lua`), aberta depois de vencer na Hard.
- **Parte 1** (M): níveis, mutações, Marcas no save e a escolha do nível no início. **Parte 2** (M): as vantagens, a tela de preparo e o que elas ligam (`rerollRelics` da `M12-10`, `extraBans` em `relicBansLeft`, ofertas e trocas da loja, relíquia inicial).
- **Decidido com o usuário (2026-11-25) para a parte 2:** "Reserve Potion" fica como cura automática de uma vez (abaixo de 20% da vida, cura 30%): não é item carregado, então não briga com a D18. "Card Swap" vira trocar os portões do mapa, uma vez a cada 5 ondas.
- **Parte 1 feita em 2026-11-25**: Depths 1 a 5 (montadas da Hard, passo de 8% da onda 6), as 5 mutações, Marcas no save das conquistas, escolha no card de dificuldade, pontuação ×(1 + 0,2 × nível), conquistas `depths_1`, `depths_3`, `depths_5`, `supreme`, `well_equipped`.
- **Parte 2 feita em 2026-11-25** (tarefa fechada): as 9 vantagens como no original (`Depths.buy`, `toggle`, `runPerks`, `startRun`, `perk`), com as 7 melhorias escolhidas pelo usuário: painel na tela de herói, compra em dois cliques, Card Swap na tecla G, botão de Relic Reroll na escolha, cargas no HUD, cargas no checkpoint e no registro, texto da Starting Relic dizendo "uncommon".

**M13-03 · Pactos** · P
- Os 8 pactos (`pacts.lua`) como desafios opcionais ao entrar na zona: mais risco, mais recompensa. **Feita em 2026-11-25** como lá: na carta de pacto do mapa, com confirmação (junto com a `M11-08`).

**M13-04 · Conquistas e registro** · P
- Porta de `achievements.lua`; bestiário com os modelos 3D dos inimigos derrotados.
- **Feita em 2026-11-25** em 3 partes, com as melhorias escolhidas pelo usuário (todas menos os links entre fichas): parte 1, núcleo (`core/codex.ts`: os 9 tipos e as 10 abas de `codex.lua`, NOVO por entrada, derrotados por id, semeadura pelo save e pelo registro de partidas, avisos); parte 2, tela (`ui/codex-view.ts`, título e pausa, busca, Q/E e setas); parte 3, modelo 3D de herói, inimigo e chefe na ficha (`HeroStage` com `StageKind`), silhueta para o não visto.

**M13-05 · Seed diária** · P [paridade P5] · **última prioridade de todo o roadmap** (usuário, 2026-11-25)
- Porta de `core/daily.lua`: a data escolhe seed, herói, dificuldade e um pacto; só a primeira tentativa do dia conta; histórico e sequência de dias no save. Depende do `M13-03` (pactos).
- Pronto quando: a mesma data dá a mesma partida, e a segunda tentativa do dia fica marcada como treino.

**M13-06 · Cosméticos** · M [paridade P7, fase 2]
- Porta de `core/skins.lua`: skins e efeitos como recompensa de conquista, sem poder. É arte, então fica na fase 2 (D17).
- Pronto quando: as recompensas cosméticas das conquistas existem e podem ser escolhidas.

**M13-07 · Efeito Founder** · M [pedido do usuário, 2026-11-22; paridade P7, fase 2]
- No original (`core/skins.lua`, D-461; `rendering/founder/<herói>.lua`) o Founder não é skin: é uma camada liga/desliga por herói, por cima de qualquer skin, salva em `founderFx` ("hero,hero,..."). Lá ficou aberto para todos os heróis "até o Founders Pack existir". Um por herói: Seraph asas douradas dobradas, Frostine asas de fada de gelo (Rainha do Inverno), Kaelen Storm Mantle, Aurelius asas arcanas de chama violeta (Astral), Ignis asas de fênix, Zephyr sobretudo espectral (Pistoleiro Fantasma), Varok manto de asa de dragão (Matador de Reis), Umbra asa de corvo de sombra (Eclipse), Vesper asas de abelha âmbar.
- Passos: peça extra no Blender por herói (`tools/blender/<id>_founder.py` ou opção no script do herói), presa ao osso certo; brilho e partículas por código (`vfx.ts`); interruptor por herói na tela de herói (`M14-08`) e salvo nas opções; como desbloquear (pacote, conquista ou aberto) a decidir com o usuário.
- Pronto quando: os 9 heróis têm o efeito, ele liga e desliga por herói e aparece na seleção e na partida.

### M14 — Interface

**M14-00 · Pente-fino: tudo em inglês** · M [pedido do usuário, 2026-11-16; vem antes do `M6-04`]
- Passos: listar todo texto que o jogador lê e está em português (`src/ui/ui.ts`, `src/data/*` como `SPELL_TEXT`, marcos e modificadores, cartas, salas, relíquias, conquistas, heróis e técnicas; textos flutuantes em `src/game/*`, como Estilhaçou, Quebradiço e Pingente da Frostine) e trocar pelo texto de `dungeon-idle/src/data/lang/en.lua` (ou pelo original em inglês do `.lua` de dados); o que não existir lá, escrever em inglês no mesmo tom. Ajustar testes de paridade que comparem texto.
- Pronto quando: `grep` por acentos e palavras comuns em português em `src/` só acha comentários; o jogo inteiro aparece em inglês.

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

**M14-08 · Tela de seleção de herói** · G [pedido do usuário, 2026-11-22: "WAY better"]
- Hoje: cartões com uma faixa de cor e texto, um painel de detalhe só em texto, e 3 passos (herói, dificuldade e seed, spell inicial) em telas separadas.
- Passos: palco 3D com o herói escolhido em pé (modelo do Blender, animação de espera, luz e chão próprios, girar com o mouse) e troca animada ao mudar de herói; retratos dos 9 heróis renderizados do próprio modelo (sem sprite); papel, dificuldade de jogar e atributos em barras comparáveis; técnica, ataque e as 4 spells com ícone e dica; recordes e medalhas por herói; trancado com silhueta e a condição; dificuldade, seed e spell inicial na mesma tela (ou em painéis laterais), sem perder o atalho de continuar; teclado (setas, Enter, Esc) além do mouse; espaço para skins (`M13-06`) e Founder (`M13-07`). Conferir a do Dungeon Reign (`dungeon-idle/src/ui`) para o conteúdo, não para a forma.
- Pronto quando: a escolha de herói até o início da partida cabe numa tela clara, o herói aparece em 3D, e o usuário aprova por captura e jogando.
- **Dividida em 4 partes (2026-11-22):**
  - **Parte 1 · Tela única** (M): os 3 passos viram uma tela. Esquerda: os 9 heróis em grade de retratos (provisório: a cor do herói), trancado com silhueta e a condição. Centro: o palco (vazio nesta parte), com nome e título por cima. Direita: `identity` como papel, atributos em barras comparáveis (escala pelo maior dos 9), técnica, ataque e as 4 spells com ícone e dica, recordes e medalhas do herói. Rodapé: dificuldade (3 botões), spell inicial (4 ícones), seed e "Start the run"; "Continue" no topo, com a confirmação de dois cliques. Teclado: setas trocam herói, 1 a 4 a spell, Enter começa, Esc volta. Lógica de escolha em `src/ui`, sem número de balanceamento novo.
  - **Parte 2 · Palco 3D** (M): o herói escolhido em pé no centro, com o modelo do Blender (`chars/build.ts`), animação de espera, luz e chão próprios, girar com o mouse; troca animada ao mudar de herói. Usa o renderer do jogo numa cena própria (sem segundo contexto WebGL); os 9 modelos montados e os shaders aquecidos ao abrir a tela, para a troca não travar. Desligar o palco quando a partida começa.
  - **Parte 3 · Retratos** (P): os 9 retratos renderizados do próprio modelo uma vez (`renderTarget` → imagem), em pose de espera e enquadramento igual; trancado vira silhueta preta do mesmo retrato. Sem sprite.
  - **Parte 4 · Acabamento e validação** (P) [validar]: transições, capturas a 1080p e 1440p, espaço reservado para aparência (`M13-06`, `M13-07`), crítico cego e aprovação do usuário por captura e jogando.
- **Decidido pelo usuário (2026-11-22):** o papel do herói é o `identity`, sem dificuldade de jogar (o original não tem).

**M14-09 · Pente-fino de UI/UX** · G [pedido do usuário, 2026-11-22: "everything there can be improved"]
- Passos: varrer cada tela (título, seleção, HUD, melhorias de nível, portões, loja, relíquias, status (I), pausa, resultado, conquistas, DEV Grimoire fora) com captura e listar os problemas: hierarquia, legibilidade a 1080p e 1440p, consistência (botões, molduras, cores de raridade, fontes), resposta ao clique e ao teclado, transições, tempo para entender cada escolha. Propor um sistema visual só (tokens de cor, tipografia, moldura desenhada por código) e passar as telas para ele, uma por vez. Absorve as partes de forma do `M14-02` a `M14-04`.
- Pronto quando: a lista de problemas está resolvida e o usuário aprova as telas.
- **Levantamento (2026-11-25, 1920×1080, painel do navegador + contagem de fontes pelo console):**
  1. Sem escala de interface: tudo em px fixo; a 1080p domina texto de 10–12 px (status I: 86 de 125 linhas ≤ 12 px; relíquia: 22 de 32) e a 1440p encolhe mais.
  2. Escolhas sem teclado: nível, relíquia e evolução não aceitam 1/2/3 (o evento aceita); a loja não compra por número; nenhuma carta mostra a tecla.
  3. Painéis pequenos para a tela (nível 820 px de 1920) e cartas com o corpo em 12 px; muito espaço vazio.
  4. O HUD inteiro continua aceso atrás de todo painel (nível, loja, resultado), disputando a atenção.
  5. HUD pequeno: barra de vida 22 px, espaços de 54 px, teclas em 10 px, ajuda sob o minimapa em 11 px, texto do canto em 12 px.
  6. Inconsistência: títulos de carta ora em caixa alta (ARCANE TOME), ora não (Iceball); raridade só por um rótulo pequeno e pela borda; 36 estilos soltos no `ui.ts`; cores por tela.
  7. Status (I): 20 atributos numa lista só, sem grupos nem destaque do que mudou; sinergias em 10 px.
  8. Painéis abrem sem transição (só o título anima); botão e preço sem estado de "não dá" além da cor.
  9. Fonte do sistema em tudo, inclusive títulos: sem identidade de jogo.
- **Plano (combinado em 2026-11-25):** fonte do sistema (títulos em caixa alta espaçada, sem fonte de fora). Etapas, uma por vez com captura: 1 base (escala em rem, tokens, moldura, carta, botão, tecla, HUD apagado atrás dos painéis; **feita em 2026-11-25**), 2 tela de herói e aparência (pedido do usuário no mesmo dia: refazer a escolha de campeão e de skin; ele escolheu A aparência, B abas, C retratos, D rodapé; **feita em 2026-11-25**), 3 cartas de nível, relíquia e evolução com 1/2/3, 4 HUD, 5 loja com compra por número, 6 tela I agrupada, 7 pausa e resultado, 8 códex e Depths.


**M14-10 · Ícones do original em toda a interface** · M [proposta, pedido do usuário em 2026-11-24; amplia a D19]
- Pedido do usuário: ícones padronizados para melhorias, spells e modificadores. O original tem `assets/ui/icons` (11 `spell_*`, 12 `evo_*`, 9 `tech_*`, afixos, nós do mapa, moeda, coração, XP) e `assets/ui/upgrades` (56, um por melhoria). Trocar os emoji das spells na barra, na seleção de herói, na loja e na tela I; ícone em cada carta de melhoria; modificador sem ícone lá: ícone da spell com um selo de modificador em CSS.
- Confirmado pelo usuário em 2026-11-24 (D19 ampliada), feita no mesmo dia, logo depois da `M12-09`.
- Pronto quando: nenhum emoji na interface de spell, toda carta da loja e de nível tem ícone.
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
- **Parte 1 feita em 2026-11-18** (registro no F3, modelos esculpidos uma vez, shaders que não se apagam, luzes fixas, aquecimento na zona; ver `docs/progress.md`). **Parte 2, se o usuário ainda sentir picos:** aquecer também os materiais próprios das spells e técnicas do herói da partida (`spells.ts`, `game.ts`), e olhar o que o F3 marcar nos picos dele.
- **Prioridade (pedido do usuário, 2026-11-17, repetido):** o jogo tem muito stuttering mesmo a 170–180 fps, então o problema é de picos de quadro, não de média. Vem logo depois do `M5-03` (o usuário escolheu as técnicas primeiro). Suspeitas a medir antes de mexer: compilação de shader no primeiro uso de cada efeito (as peças do `fx.lib` criam `ShaderMaterial` e `MeshStandardMaterial` novos a cada chamada; aquecer com `renderer.compile` ou reusar materiais), lixo para o coletor (geometria e material por efeito, `clockGeo` refeita todo quadro nos anéis de tempo), `setTimeout` de efeitos fora do relógio do jogo, e o passo de tempo do loop. Medir com um registro de tempo por quadro (pior quadro e quantos passam de 2× a média) no F3.

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

**M16-08 · Troca de zona sem travada** · M [pedido do usuário, 2026-11-16] (feita em 2026-11-25)
- Problema: ao matar o chefe da zona (ondas 5, 10, 15) e entrar no portal, o jogo para um instante montando a zona nova e parece que travou.
- Passos: medir onde vai o tempo (geração, montagem da cena, compilação de shaders); cobrir a troca com uma transição (escurecer a tela com o nome da zona nova, por exemplo) e montar a zona por trás dela; se der, pré-compilar os materiais (`renderer.compileAsync`) e espalhar a montagem em vários quadros.
- Pronto quando: a troca não congela a imagem; o jogador vê a transição em vez da tela parada.

### M17 — Balanceamento

**M17-01 · Bot que joga partidas** · G (dividir antes de começar) [pedido do usuário, 2026-11-16]
- Reescrita em 2026-11-16 (o texto antigo era do jogo com equipamento e nível 60). Porta do `tools/balance_sim.lua` e do `tools/sim_bot.lua` do original: um bot "competente", não ótimo, que joga partidas inteiras e diz quantas chegam à onda 20.
- Bot: desvia de avisos, poças e projéteis; mantém distância de uns 75% do alcance; foca o chefe; usa técnica, esquiva e as spells; escolhe melhorias e relíquias que combinam com o herói; prefere salas seguras no mapa; compra nível de spell na loja (quando houver `M7`).
- Como rodar: o combate daqui está em `src/game` (three.js), então o bot joga o jogo de verdade, numa página sem desenhar (laço de `Game.frame` sem render), no Node ou no Chromium sem tela, em tempo acelerado. Comando: `npm run sim -- <partidas> <dificuldade> [herói] [seed]`.
- Saída (como o `BALANCE_REPORT.md` de lá): por herói e dificuldade, % de vitória, onda média de morte, quem deu o golpe final, dano causado e recebido por fonte, melhorias e relíquias escolhidas.
- Pronto quando: um comando roda N partidas dos 9 heróis e grava a tabela em `docs/balance.md`.
- **Divisão (combinada com o usuário em 2026-11-25), em 4 partes:** (1) decisões do bot em `core/simbot.ts`, números em `data/simbot.ts` (feita em 2026-11-25); (2) modo simulação do jogo: `sim.html`, passo fixo de 1/60 s, sem desenhar, sem efeitos nem HUD, as telas respondidas pelo bot (feita em 2026-11-25); (3) pilotagem em combate (16 direções e parado, pesadas pelo perigo; 75% do alcance; foco no chefe; técnica, esquiva e spells) (feita em 2026-11-25, melhorias A a F da parte: `Game.botView`, `core/simsteer.ts` com testes, esquiva, orbes, obstáculos, contagem de usos); (4) `npm run sim` e `docs/balance.md` (feita em 2026-11-25: `tools/sim.mjs`, relatório em `core/balance.ts`). **Fechada em 2026-11-25.**
- **Melhorias escolhidas pelo usuário (2026-11-25):** A, Playwright + Chromium sem tela como executor (dependência de desenvolvimento); B, o relatório lê as linhas do `logs/runs.jsonl` marcadas `bot` (mesma régua das partidas dele); C, `Math.random` com seed por partida no modo simulação; D, várias páginas em paralelo; E, limite de tempo e detecção de partida presa, com o motivo no relatório. A comparação com o `BALANCE_REPORT.md` do original (F) ficou para a `M17-03`.

**M17-02 · Curva da primeira passada** · M [validar]
- Passos: ajustar `tuning.ts` e `enemies.ts` para de 20 a 30 minutos por zona e chefe vencível em 2 ou 3 tentativas; usuário joga uma zona e reporta.

**M17-03 · Paridade entre heróis** · P
- Passos: com o bot (`M17-01`), nenhum herói mais de 20% acima ou abaixo da média em % de vitória e onda média.

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
| D1 | Textos do jogo em inglês com português como tradução, ou só código em inglês? | **Decidido em 2026-11-16: tudo em inglês.** Todo texto do jogo é em inglês, com a palavra do Dungeon Reign (`en.lua`) quando existir; português só como tradução depois. Vale para todo código novo a partir de agora | M14-00, M14-01 |
| D2 | Spells: quantos espaços e quem usa o quê? | **Decidido em 2026-11-15: igual ao Dungeon Reign.** 2 espaços mais a técnica; cada herói escolhe 1 spell inicial entre as 4 dele (`startingSpells`, Healing Field nunca é inicial); a segunda spell, os níveis (até 5), os modificadores e o nível da técnica vêm da loja (Magic Shop), que vende qualquer spell. Estrutura conferida pela tabela de paridade (`M6-00`) | M6 |
| D3 | Como se ganha spell? | **Decidido em 2026-11-15 (D2 e D13): como no original.** A inicial é escolhida no começo da partida entre as 4 do herói; as outras, os níveis e os modificadores vêm da loja | M6-06 |
| D4 | Entra ouro, mercador e ferreiro? | **Decidido em 2026-11-15 (D13):** ouro e Magic Shop do original; sem ferreiro (não há itens) | M7 |
| D5 | Mais espaços de equipamento? | **Caiu em 2026-11-15 (D13):** não há equipamento | — |
| D6 | Quantas zonas no total e em que ordem? Qual chefe aparece em cada onda de chefe? | **Respondido em 2026-11-16: chefes sorteados**, que é como o original faz (`bosses/boss_bag.lua`: saco com os 13 chefes, embaralhado pela seed, sem repetir até esvaziar; a onda 20 é o "Crowned King", com todos os ataques e um emprestado de outro chefe; a emboscada também tira do saco). Até o `M10`, o saco tem só os 4 chefes modelados. **Confirmado pelo usuário em 2026-11-16:** o bioma segue na ordem fixa (Bosque, Cripta, Vulcão, Vazio) e o chefe não precisa combinar com ele | M11-05+, M20-09 |
| D7 | Relíquias com limite? | **Revisto em 2026-11-24: sem limite, e as incomuns acumulam até 3 cópias** (design.md, decisões). Antes, em 2026-11-16: como no original. Todas as 94 relíquias do `relics.lua` vêm para cá, sem limite (o original não tem). O "baú" era uma ideia minha e caiu. Regra geral do usuário: o jogo inteiro vem do Dungeon Reign, só a engine muda | M12 |
| D8 | Endgame: dificuldades e Depths como no Dungeon Reign? | **Decidido em 2026-11-16: sim** | M13 |
| D9 | Onde publicar? | **Decidido em 2026-11-16: GitHub Pages.** O `npm run build` já gera o jogo jogável em `dist/` (HTML, JS e assets estáticos), que é o que o Pages serve; o usuário pesquisa como subir | M16-06 |
| D10 | Nome definitivo do jogo | Em aberto (o usuário ainda não sabe, 2026-11-16) | Nenhuma |
| D12 | Spells como no Dungeon Reign: lançadas sozinhas (como lá) ou em teclas? | **Decidido em 2026-11-14: em teclas.** As mesmas spells do Dungeon Reign, sem lançamento automático: teclas 1 e 2 para as 2 spells; técnica e esquiva ficam onde estão. M6 vem logo depois do M19 | M6 |
| D13 | Save contínuo ou partidas? | **Decidido em 2026-11-15: partidas como no Dungeon Reign.** Seed por partida, continuar no meio, morte encerra; sem equipamento; cada zona = 5 ondas, chefe nas ondas 5, 10, 15 e 20 | M20 |
| D19 | Ícones da interface podem vir do original? | **Decidido pelo usuário em 2026-11-24: sim.** Exceção à arte por código só para ícones 2D da interface, todos do Dungeon Reign (ampliada no mesmo dia na `M14-10`): relíquias em `src/assets/relics/`, spells, evoluções, técnicas e gerais em `src/assets/ui/`, melhorias em `src/assets/upgrades/`, copiados do commit base por `npm run icons`. Modificador de spell (sem ícone lá) usa o ícone da spell com um selo. O mundo 3D continua todo por código | `M12-06` parte 2, `M14-10` |
| D18 | O loop vem antes da paridade? | **Decidido em 2026-11-20: sim.** Paridade de conteúdo, não de regra de combate: números de combate e de ritmo viram "adaptado" por padrão, numa camada própria (`src/data/pace.ts`). Sai a poção (cura no risco); spells divididas em ativas e auras; reações de estado; bifurcações físicas no mapa; desvios opcionais; terreno na luta; épicas de comportamento; maestria por herói. A fase 1 da D17 (paridade de jogo) espera a `M21-04`; a arte continua na fase 2 | M21 |
| D11 | Bosque Sombrio: deixar sombrio (fim de tarde, verdes fechados, luz fria, fogueira e cogumelos como contraste quente) ou manter ensolarado? | **Decidido em 2026-11-14: sombrio** | M18-07 |
| D15 | Spell na tecla sai sem inimigo no alcance? | **Decidido em 2026-11-16: sai sempre e gasta a recarga**, acerte ou não (no original não saía sem alvo). Paridade S13 adaptada | M6 |
| D17 | Ordem do trabalho daqui em diante | **Decidido pelo usuário em 2026-11-19:** toda a jogabilidade do Dungeon Reign antes de terminar VFX, SFX e arte (seção 3.0). Inimigos e chefes novos com corpo provisório por código até a fase 2. O `M1-06` pausa com bloodfang e gravekeeper aprovados | Seção 3 |
| D14 | Atributos do herói contra os do Dungeon Reign: entra o poder de magia? "Efeitos" continua um atributo só (queimadura, veneno, lentidão)? Recarga e área globais entram no mesmo pool das spells, como lá? | **Decidido em 2026-11-16:** poder de magia **entra**; recarga global **entra**, no mesmo pool das spells; "efeitos" **se separa**. Proposta para a separação, como no original: dano por escola (`firePct`, `icePct`, `lightningPct`, `arcanePct`), queimadura (`burnPct`), lentidão (`slowPct`, `slowDurationPct`) e veneno (`poisonMult`). Lista confirmada pelo usuário em 2026-11-16 | M6-08, `core/stats.ts` |

---

## 9. Registro de progresso

Mudou para `docs/progress.md` (2026-11-25). Não ler inteiro; achar a linha com `grep -n "<id>" docs/progress.md`.
