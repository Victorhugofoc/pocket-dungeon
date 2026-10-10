# Covil — handoff

Leia este arquivo antes de qualquer coisa. Ele substitui o histórico das conversas anteriores.

## Estado atual
- **Fase 1 (núcleo de simulação headless), marcos 1.1 a 1.4 concluídos:**
  - 1.1: esqueleto do projeto Godot, RNG determinístico (`core/rng.gd`) validado contra Python, executor de testes headless.
  - 1.2: todo o conteúdo do MVP em `data/*.json` (valores do design, ainda não calibrados); `core/db.gd` carrega, converte para int e valida; vocabulário de traits/efeitos em `core/traits.gd` (cada id precisa ser implementado no combate, marco 1.4). `Db.monster_at(id, nível, variante)` dá os atributos escalados.
  - 1.3: `core/dungeon.gd` (estados rocha/túnel/sala, escavação D-008, posicionamento de sala/monstro/armadilha com capacidade e soquetes, Guardião no Coração, `route_info()`); `core/combat/pathing.gd` (todos os caminhos até o Coração, escolha por preferência de classe, desempate pelo líder e depois ordem estável, pacto do tesouro, ramo bloqueado, voltar atrás).
  - Heróis-Chefe = os 6 heróis de Dungeon Reign (D-009), em `data/bosses.json`.
  - 1.4: `core/combat/combat_sim.gd` + `unit.gd`: simulação determinística completa (todos os traits/efeitos de `core/traits.gd`, poderes, sinergias de `data/families.json`, Coração, tesouro, Corredor, timeout), eventos + `result` + `events_hash()`. Regras na D-011.
  - Visualizador de debug: `game/debug/combat_viewer.tscn` (cena principal provisória), 6 cenários em `scenarios.gd`. Abrir: `.\tools\viewer.ps1 [cenário]`. Print sem abrir janela visível por muito tempo: `godot --path . --quit-after 900 res://game/debug/combat_viewer.tscn -- --shot <arquivo.png> --scenario N --tick T` (sempre com `--quit-after`, senão um erro de script deixa a janela aberta).
  - 70 testes verdes (`.\tools\test.ps1`). O script conta qualquer `SCRIPT ERROR` na saída como falha: em GDScript um erro de execução não para o teste.
- GitHub: `https://github.com/Victorhugofoc/pocket-dungeon` (remoto `origin`). **O push é feito pelo usuário no GitHub Desktop**: esta sessão não tem credencial. Eu só faço commit.
- MCP do Godot não carrega nas sessões do Code (erro de protocolo no log `mcp-server-Godot Editor MCP.log`). Não é necessário: trabalhamos com arquivos + Godot headless + build web no navegador embutido.

## Próximos marcos (Fase 1)
1. ~~1.1 Esqueleto + RNG + testes~~
2. ~~1.2 Dados do MVP + carregador validado~~
3. ~~1.3 Grafo da masmorra, escavação e escolha de rota~~
4. ~~1.4 Simulação de combate + visualizador de debug~~ (aguardando o usuário avaliar a legibilidade)
5. **1.5 Run:** estado, economia, loja, bancada, merge, gerador de ondas, poderes, relatório.
6. 1.6 Bots (random, greedy, counter) + `sim_runner.gd` + primeira rodada de balanceamento. Gate da Fase 1.

## Pendências com o usuário
- Escolher o nome definitivo (candidatos no design).
- Pesquisa de concorrentes (Legend of Keepers, Dungeon Maker).
- Assets do Dungeon Reign (`C:\Users\victo\Documents\GitHub\dungeon-idle\assets`) foram gerados pelo Claude: podem ser reaproveitados. São pixel art; avaliar tamanho e paleta na Fase 5.
- Avaliação do usuário sobre a legibilidade do combate no visualizador.

## Versões jogáveis previstas
- **0.1** (fim da Fase 1): nada para jogar; só simulador + relatório dos bots.
- **0.2** (fim da Fase 2): **primeiro protótipo jogável** no navegador: montar a masmorra e assistir a uma onda, em graybox.
- **0.3** (fim da Fase 3): run completa (loja, merge, 8 ondas) no itch, para playtest externo.
