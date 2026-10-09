# Covil — Plano de Implementação

> Complementa o [design-v2.md](design-v2.md). As estimativas consideram **1 desenvolvedor solo em tempo integral**. Em meio período (cerca de 20 h/semana), multiplique por 2 a 2,5.

---

## 1. Princípios de execução

1. **Simulação antes de tela.** O combate e a run existem primeiro como código puro, testável e rodável sem gráficos. A apresentação só *assiste* à simulação.
2. **Gate mensurável por fase.** Não se avança sem cumprir o gate. Se o gate falhar, volta-se ao design, não se adiciona conteúdo.
3. **Graybox até o gate da Fase 3.** Nenhuma arte final antes de provar que o loop é divertido com quadrados e círculos.
4. **Playtest externo cedo.** Builds web no itch.io a partir da Fase 3, porque é mais rápido que instalar APK.
5. **Dados fora do código.** Todo número de balanceamento vive numa planilha ou arquivo de dados.

---

## 2. Linha do tempo

| Fase | Nome | Duração (FTE) | Acumulado |
|---|---|---|---|
| 0 | Decisões e protótipo de papel | 1 semana | 1 |
| 1 | Núcleo de simulação headless | 2–3 semanas | 4 |
| 2 | Graybox visual do combate | 2 semanas | 6 |
| 3 | Loop de run completo + playtest web | 3 semanas | 9 |
| 4 | Meta-progressão e profundidade | 3 semanas | 12 |
| 5 | Vertical slice: arte, feel e onboarding | 4 semanas | 16 |
| 6 | Mobile, loja e teste fechado | 3 semanas | 19 |
| 7 | Lançamento e pós-lançamento | contínuo | — |

**Total até o lançamento: cerca de 19 semanas em tempo integral, ou de 9 a 11 meses em meio período.**

---

## 3. Arquitetura técnica

### 3.1 Stack

- **Godot 4.x estável** (fixar a versão no início e só atualizar entre fases).
- **GDScript**, não C#. A exportação web em Godot 4 não suporta C#, e os playtests no itch.io dependem dela.
- **GUT** (Godot Unit Test) para testes.
- **Git** desde o primeiro dia, com repositório privado no GitHub. Usar Git LFS para arte e áudio a partir da Fase 5.
- Planilha (Google Sheets) para o balanceamento, exportada em CSV e importada por script.

### 3.2 Camadas

```text
┌───────────────────────────────────────────────┐
│  game/  (Nodes, cenas, UI, VFX, áudio)        │  ← assiste e envia comandos
├───────────────────────────────────────────────┤
│  services/  (Save, Analytics, Store, Audio)   │  ← autoloads com interfaces e stubs
├───────────────────────────────────────────────┤
│  core/  (RefCounted puro, sem Node, sem float)│  ← regras, simulação, run, meta
├───────────────────────────────────────────────┤
│  data/  (defs .tres / JSON gerados da planilha)│
└───────────────────────────────────────────────┘
```

**Regra de ouro:** `core/` nunca importa nada de `game/` nem de `services/`. Assim ele roda em `--headless` para testes, simulação em massa e bots de balanceamento.

### 3.3 Estrutura de pastas

```text
res://
├── core/
│   ├── rng.gd                  # PCG32 com streams nomeados (combat, shop, waves)
│   ├── fixed.gd                # helpers de aritmética inteira / milésimos
│   ├── defs/                   # classes de definição (MonsterDef, RoomDef, TrapDef...)
│   ├── db.gd                   # carrega e indexa as defs
│   ├── combat/
│   │   ├── combat_sim.gd       # step(), comandos, condição de fim
│   │   ├── combat_state.gd
│   │   ├── unit.gd             # monstro ou invasor em combate
│   │   ├── status.gd           # veneno, lentidão, atordoamento, escudo...
│   │   ├── targeting.gd
│   │   ├── pathing.gd          # grafo da masmorra + preferência de rota
│   │   └── events.gd           # CombatEvent (spawn, move, hit, status, death, trap, heart, flee)
│   ├── run/
│   │   ├── run_state.gd        # ouro, bancada, layout, onda, Coração, semente
│   │   ├── shop.gd
│   │   ├── merge.gd
│   │   ├── economy.gd
│   │   ├── wave_generator.gd
│   │   └── wave_report.gd      # gera relatório e dicas a partir dos eventos
│   └── meta/
│       ├── meta_state.gd       # Almas, desbloqueios, Infâmia, bestiário
│       └── unlocks.gd
├── data/
│   ├── monsters/  rooms/  traps/  adventurers/  modifiers/
│   ├── bosses/  powers/  pacts/  infamy/
│   └── balance.json            # constantes globais (economia, curvas)
├── game/
│   ├── screens/  hub, run_setup, dungeon, shop, run_end, bestiary, settings
│   ├── views/    dungeon_view, room_view, unit_view, bench_view, vfx/
│   ├── presenter/ combat_player.gd  # consome eventos com interpolação, 1x/2x
│   └── ui/
├── services/
│   ├── save_service.gd
│   ├── analytics_service.gd    # interface + NullAnalytics + FileAnalytics
│   ├── store_service.gd        # interface + FakeStore + GooglePlayStore
│   └── audio_service.gd
├── tools/
│   ├── csv_import.gd           # planilha → data/
│   ├── sim_runner.gd           # roda N runs com bots, exporta CSV
│   └── bots/ random_bot.gd, greedy_bot.gd, counter_bot.gd
└── tests/
```

### 3.4 Simulação determinística

- **Só inteiros:** PV, dano e velocidade como inteiros; posição em milésimos de sala; porcentagens em pontos-base (10000 = 100%). Nada de `float` no `core/`.
- **RNG próprio** (PCG32), com streams separados por domínio. Assim, mudar a loja não altera os combates da mesma semente.
- **Iteração estável:** listas ordenadas por ID e nada de iterar `Dictionary` dependendo da ordem de inserção sem ordenar.
- **Entrada da onda** = `layout + grupo + semente + lista de comandos (tick, poder, alvo)`. Isso basta para reproduzir a onda.
- **Saída** = lista de `CombatEvent` + resultado. A apresentação toca os eventos e o relatório é calculado a partir deles.
- **Hash de determinismo:** um teste roda a mesma entrada duas vezes e compara o hash dos eventos. Ele também roda em web e em Android na Fase 6.

### 3.5 Save

- `user://meta.json` (progresso permanente) e `user://run.json` (run em andamento, salvo **ao fim de cada onda e de cada loja**).
- O campo `version` é inteiro, com uma cadeia de migrações `migrate_v1_to_v2()...` e testes para cada uma.
- **Escrita atômica:** grava em `.tmp`, valida e renomeia. Mantém `.bak` da versão anterior.
- A run em andamento guarda a semente e o estado. Ao fechar o app no meio de uma onda, ela recomeça do início dessa onda (determinística, então o jogador não ganha nada com isso).

### 3.6 Pipeline de balanceamento

```text
Google Sheets → CSV → tools/csv_import.gd → data/*.tres
                                       ↓
     godot --headless --script tools/sim_runner.gd -- --runs 20000 --bot counter
                                       ↓
                    reports/*.csv → planilha de análise
```

Métricas que o `sim_runner` deve produzir:

- taxa de vitória por bot e por nível de Infâmia;
- taxa de escolha × taxa de vitória por espécie, sala, armadilha, poder e pacto;
- distribuição da onda de derrota;
- composição das masmorras vencedoras (para detectar builds dominantes);
- matriz "contra-jogo": PV médio do Coração perdido por tema de onda × composição.

---

## 4. Fases detalhadas

### Fase 0 — Decisões e protótipo de papel (1 semana)

**Objetivo:** provar no papel que a decisão central é interessante, antes de qualquer código.

**Tarefas**

1. Jogar *Legend of Keepers* e *Dungeon Maker* (ou outros dois concorrentes) por pelo menos 2 horas cada. Ler as 50 piores reviews e registrar as 10 reclamações mais frequentes em `docs/concorrencia.md`.
2. Pesquisar nomes (lojas, itch.io, Steam, INPI/USPTO) e escolher um nome provisório definitivo.
3. **Escrever 3 ondas-exemplo completas:** grupo, duas configurações de masmorra, o que acontece em cada uma e por que uma vence. Pelo menos uma deve ter uma solução *não óbvia* (por exemplo, a Sala de Tesouro como isca).
4. **Protótipo de papel:** cartas para monstros, salas e armadilhas; tabuleiro com o grafo da masmorra; d6 para resolver o combate de forma simplificada; loja com baralho. Jogar 3 runs sozinho e 3 com outras pessoas.
5. Montar a planilha de balanceamento v0 com todos os valores do design.
6. Criar o repositório Git, o projeto Godot vazio e a estrutura de pastas.

**Entregáveis:** `docs/concorrencia.md`, `docs/ondas-exemplo.md`, planilha v0, nome escolhido, repositório.

**Gate**

- [ ] Pelo menos 2 de 3 jogadores do protótipo de papel pedem para jogar outra run.
- [ ] Existe pelo menos uma situação documentada em que a escolha de rota ou de isca muda o resultado.
- [ ] A decisão central cabe em uma frase que um estranho entende.

**Se falhar:** revisar o design (layout, economia, preferência de rota) e repetir o teste de papel. Não abrir a Godot.

---

### Fase 1 — Núcleo de simulação headless (2–3 semanas)

**Objetivo:** ter o combate e a run funcionando como código puro, testável e balanceável por bots.

**Tarefas**

*Semana 1: fundações e combate*

1. `rng.gd` (PCG32 + streams) e `fixed.gd`, com testes.
2. Classes de definição (`MonsterDef`, `RoomDef`, `TrapDef`, `AdventurerDef`, `ModifierDef`, `PowerDef`) e `csv_import.gd`.
3. `pathing.gd`: grafo dos 6 slots + Coração, slots escavados/rocha, preferência de rota por classe.
4. `combat_sim.gd`: tick de 10/s, movimento, entrada em sala, armadilhas, alvo, ataques, morte, chegada ao Coração, Guardião, limite de tempo e fuga.
5. Status: veneno, lentidão, atordoamento, preso, escudo, provocação, armadura.
6. Emissão de `CombatEvent` e teste de hash de determinismo.

*Semana 2: run e economia*

7. `run_state.gd`, `economy.gd` (renda, juros, abates, baú), `shop.gd` (ofertas, re-sortear, travar, vender), `merge.gd` (monstros 1→4 com bifurcação no nível 3; salas e armadilhas 1→3).
8. `wave_generator.gd`: orçamento, temas, regra de variedade, onda de elite, 3 Heróis-Chefe.
9. Comandos de poder (Fechar Porta, Fúria, Desabamento) com tick.
10. `wave_report.gd`: causas de dano ao Coração e dicas por regras.

*Semana 3 (pode se sobrepor): bots e balanceamento*

11. Bots `random`, `greedy` (compra pelo maior valor de atributos) e `counter` (lê o tema da próxima onda e compra o contra-jogo).
12. `sim_runner.gd` com exportação CSV; primeira rodada de balanceamento.

**Entregáveis:** `core/` completo para o conteúdo do MVP (6 espécies, 5 salas, 4 armadilhas, 4 classes, 5 modificadores, 3 chefes, 3 poderes); suíte de testes; relatórios do simulador.

**Gate**

- [ ] 100% dos testes de determinismo passam (mesma entrada → mesmo hash, 1000 sementes).
- [ ] O bot `counter` tem taxa de vitória pelo menos **25 pontos percentuais** maior que o `random`. Isso prova que decisão importa.
- [ ] O bot `greedy` vence **menos** que o `counter`. Isso prova que ler a onda importa mais que só pegar números altos.
- [ ] Nenhuma espécie aparece em mais de 60% das masmorras vencedoras do bot `counter`.
- [ ] Cada classe de aventureiro tem pelo menos 2 respostas eficazes na matriz de contra-jogo.
- [ ] A Sala de Tesouro e a bifurcação aparecem nas builds vencedoras (não são ignoradas pelos bots).

**Se falhar:** ajustar números na planilha e reexecutar. Se nenhum ajuste de números resolver, o problema é de regra: voltar ao design.

---

### Fase 2 — Graybox visual do combate (2 semanas)

**Objetivo:** ver e entender o combate, e descobrir se é interessante assistir.

**Tarefas**

1. `dungeon_view` em retrato: slots como retângulos, ramos, Coração; superfície no topo.
2. `unit_view`: formas coloridas por família/classe, barra de PV, ícones de status.
3. `combat_player.gd`: toca os eventos com interpolação, velocidade 1x/2x, pausa.
4. Preparação mínima: arrastar peças de uma lista fixa para os slots; escavar.
5. Barra de mana e botão do poder, que enviam comando com tick para a simulação.
6. Tela de relatório de onda (versão simples) e replay da última onda.
7. Cena de debug: escolher layout, grupo e semente manualmente e rodar.

**Entregáveis:** build desktop/web jogável de "monte a masmorra e assista a uma onda".

**Gate (teste com 5 pessoas fora do projeto)**

- [ ] Pelo menos 4 de 5 conseguem dizer em uma frase por que a onda foi perdida.
- [ ] Pelo menos 4 de 5 pedem para tentar outra configuração contra o mesmo grupo.
- [ ] Ninguém precisa de explicação verbal sobre a preferência de rota depois de ver uma onda com bifurcação.

**Se falhar:** investir em legibilidade (relatório, ícones, câmera lenta nos momentos decisivos) antes de seguir.

---

### Fase 3 — Loop de run completo + playtest web (3 semanas)

**Objetivo:** a run inteira jogável em graybox, testada por desconhecidos.

**Tarefas**

1. Bancada (6 slots) com arrastar, soltar e merge automático; venda.
2. Tela de loja: ofertas, re-sortear, travar, ouro, juros visíveis.
3. Escolha da bifurcação no nível 3 (pop-up A/B).
4. Fluxo de run: preparação → onda → relatório → loja → ... → fim de run.
5. Coração com PV, derrota e vitória, tela de fim de run com semente.
6. Save da run entre ondas (`run.json`) e retomada.
7. Hub mínimo: "Nova run" e escolha de poder (sem meta ainda).
8. `FileAnalytics` local: `run_started`, `wave_result`, `shop_action`, `merge`, `power_used`, `run_ended` (com causa).
9. Exportação web, página privada no itch.io e formulário de feedback (Google Forms).
10. Recrutar de 8 a 15 testadores (Discord, Reddit r/roguelites e r/godot, amigos de amigos).

**Entregáveis:** build web jogável de ponta a ponta; analytics coletados; pesquisa de feedback.

**Gate**

- [ ] Pelo menos 60% dos testadores começam uma 2ª run espontaneamente.
- [ ] A duração mediana de uma run completa fica entre 12 e 18 minutos.
- [ ] No máximo 20% das derrotas são marcadas como "não sei por que perdi" na pesquisa.
- [ ] Pelo menos metade dos testadores menciona merge ou loja como algo positivo.
- [ ] O balanceamento real se aproxima do simulado (taxa de vitória de runs humanas entre 15% e 40% na primeira semana).

**Se falhar:** ainda não há arte cara para jogar fora. Iterar nesta fase até passar. Esse é o ponto mais barato para pivotar.

---

### Fase 4 — Meta-progressão e profundidade (3 semanas)

**Objetivo:** motivo para voltar amanhã.

**Tarefas**

1. `meta_state.gd`: Almas, lista de desbloqueios, Infâmia, bestiário, conquistas; `meta.json` com versão e migração.
2. Conteúdo de meta: Esqueleto e Espectro (com bifurcações), poderes Ressurgir, Tremor e Medo, 6 pactos, 10 níveis de Infâmia.
3. Tela de preparação de run: pacto, poder, Infâmia.
4. Tela de desbloqueios e bestiário (graybox).
5. Run Diária: semente derivada da data UTC, uma tentativa, pontuação local.
6. Atualizar os bots para usar pactos e Infâmia; rebalancear com o simulador.
7. Nova build web e convite para os mesmos testadores por 7 dias.

**Gate**

- [ ] Pelo menos 40% dos testadores jogam em 3 dias diferentes sem lembrete.
- [ ] Média de pelo menos 5 runs por testador na semana.
- [ ] Nenhum pacto aparece em mais de 40% ou em menos de 5% das runs.
- [ ] O simulador mostra Infâmia 10 vencível pelo bot `counter` (pelo menos 5%) e Infâmia 0 vencível pelo `greedy` (pelo menos 30%).

---

### Fase 5 — Vertical slice: arte, feel e onboarding (4 semanas)

**Objetivo:** transformar o graybox validado em um jogo que parece um produto.

**Tarefas**

*Arte (contratar ou produzir):*

1. **Semana 1:** 3 provas de estilo (pixel 24 px, pixel 32 px, vetor) para 1 sala + 1 monstro + 1 aventureiro. Testar a legibilidade num celular real e escolher.
2. Guia de estilo de uma página (paleta, contorno, escala, regra de níveis por paleta e acessório).
3. Sprites: 8 espécies (base + acessórios de nível + variantes A/B), 4 classes + Heróis-Chefe, 5 salas + Coração + rocha/escavação, 4 armadilhas, ícones de status, UI.
4. Fundo da superfície e da terra; tema cosmético 1 (para a Versão Completa).

*Feel e áudio:*

5. Juice: tremor de tela no Desabamento, flashes de acerto, partículas de merge, números de dano, Coração pulsando conforme a vida.
6. Áudio: 2 faixas (preparação e combate), cerca de 30 SFX. Usar banco licenciado (verificar licenças) ou freelancer.
7. Háptico leve no Android (merge, dano ao Coração).

*Onboarding:*

8. Run guiada de 4 ondas (semente fixa, roteiro da seção 11 do design).
9. Dicas contextuais na primeira vez que cada sistema aparece.

**Gate**

- [ ] 80% dos testadores novos completam a run guiada.
- [ ] Teste de 5 segundos: mostrando um print do combate, 4 de 5 pessoas identificam o Coração, os monstros e os invasores.
- [ ] 60 FPS estáveis num Android intermediário de referência (definir o aparelho; por exemplo, um com 4 GB de RAM de 2022).

**Orçamento estimado de arte e áudio terceirizados:** registrar aqui depois das provas de estilo. É o maior custo variável do projeto.

---

### Fase 6 — Mobile, loja e teste fechado (3 semanas)

**Objetivo:** um build Android confiável, com compra funcionando, em teste fechado na Google Play.

**Tarefas**

1. Exportação Android: ícone, splash, retrato travado, safe areas, botão voltar, pausa e retomada.
2. Otimização: atlas de texturas, pooling de VFX, limite de FPS opcional para economizar bateria.
3. `store_service.gd`: plugin Google Play Billing para Godot 4, produto "Versão Completa" + 2 cosméticos, **restaurar compras**, tratamento de pagamento pendente e reembolso.
4. Validação de save, backup `.bak` e tela de "save corrompido, restaurar backup".
5. Acessibilidade: tamanho de fonte, modo daltônico (status com forma além de cor), opção de reduzir tremor de tela.
6. Analytics opt-in (Firebase ou GameAnalytics), aviso de privacidade e política publicada.
7. Crash reporting.
8. Conta de desenvolvedor na Google Play, ficha da loja (prints, vídeo curto, descrição em PT e EN), classificação etária e formulário de segurança de dados.
9. **Teste fechado na Google Play:** contas pessoais novas precisam de um teste fechado com número mínimo de testadores por um período mínimo (na última regra conhecida, cerca de 12 testadores por 14 dias; **confirmar a regra atual**) antes de liberar a produção.
10. Rodar o teste de hash de determinismo no Android e comparar com o desktop.

**Gate**

- [ ] Taxa sem crash de pelo menos 99,5% das sessões.
- [ ] Compra, restauração e reinstalação funcionam em pelo menos 3 aparelhos.
- [ ] Hash de determinismo idêntico entre desktop, web e Android.
- [ ] Sinais do teste fechado (amostra pequena, então são indicativos): D1 de pelo menos 35%, D7 de pelo menos 12%.
- [ ] Requisitos de teste fechado da Google Play cumpridos.

---

### Fase 7 — Lançamento e pós-lançamento

**Lançamento**

1. Lançamento em produção (opcionalmente começando por poucos países).
2. Divulgação: devlog no itch.io e no Reddit, vídeos curtos de "masmorra vs. chefe" (o replay determinístico facilita gravar), Discord próprio.
3. **Durante as primeiras 4 semanas, não adicionar conteúdo grande.** Só correções, balanceamento e qualidade de vida.

**Métricas a acompanhar**

- funil: instalação → tutorial → 1ª run completa → 2ª run → D1/D7/D30;
- runs por dia por usuário ativo; duração das sessões;
- onda de derrota, causa e Infâmia máxima;
- conversão para a Versão Completa e em que momento ela acontece;
- taxa de escolha × vitória do conteúdo (dados reais versus simulador).

**Roadmap pós-lançamento (sugerido, guiado pelos dados)**

| Atualização | Conteúdo | Por quê |
|---|---|---|
| 1.1 | Ranking online da Run Diária | competição barata, aproveita o determinismo |
| 1.2 | "Invada o Covil do amigo" (código de masmorra) | viralidade sem PvP em tempo real |
| 1.3 | Segundo bioma (2 famílias, 2 salas, 3 chefes) | conteúdo novo para a meta |
| 1.4 | Sinergias por salas adjacentes, novas classes | profundidade |
| Avaliar | Versão PC na Steam | roguelites vendem bem no PC; Godot exporta fácil |

---

## 5. Riscos e mitigação

| Risco | Sinal | Mitigação | Fase em que é detectado |
|---|---|---|---|
| A decisão central não é interessante | Teste de papel morno; `counter` ≈ `random` | Revisar regras antes de qualquer arte | 0, 1 |
| Build dominante | Uma espécie ou pacto em mais de 60% das vitórias | Simulador + nerf/buff via planilha | 1, 4 |
| Combate ilegível | "Não sei por que perdi" acima de 20% | Relatório, replay, câmera lenta, ícones | 2, 3 |
| Merge vira faxina | Bancada nunca enche ou enche sempre | Ajustar tamanho da bancada e custos | 3 |
| Run longa demais para o celular | Mediana acima de 18 min, abandono no meio | Reduzir para 7 ondas, encurtar a preparação | 3 |
| Meta não segura | Pouco retorno no D3 | Mais desbloqueios de variedade, Run Diária, conquistas | 4 |
| Arte estoura prazo e orçamento | Provas de estilo lentas | Sistema de paleta e acessório, packs licenciados, escopo de 8 espécies | 5 |
| Determinismo quebra entre plataformas | Hash diferente no Android | Só inteiros no `core/`, teste de hash em CI | 1, 6 |
| Aquisição de usuários | Poucos downloads orgânicos | Devlog desde a Fase 3, comunidade de testadores, vídeos de replay | 3 → 7 |
| Escopo explode | Novas features antes do gate | Critério de corte + gates obrigatórios | todas |

---

## 6. Checklist da primeira semana (para começar amanhã)

- [ ] Instalar a Godot 4 estável e fixar a versão em `docs/versoes.md`
- [ ] Criar o repositório Git e a estrutura de pastas da seção 3.3
- [ ] Comprar e jogar *Legend of Keepers*; baixar *Dungeon Maker*
- [ ] Escrever `docs/ondas-exemplo.md` (3 ondas, 2 configurações cada)
- [ ] Imprimir ou recortar as cartas do protótipo de papel e jogar 3 runs
- [ ] Montar a planilha v0 a partir das tabelas do design
- [ ] Pesquisar 5 nomes e escolher 1
- [ ] Marcar 2 sessões de teste de papel com outras pessoas
