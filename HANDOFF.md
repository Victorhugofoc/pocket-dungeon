# Covil — handoff

Leia este arquivo antes de qualquer coisa. Ele substitui o histórico das conversas anteriores.

## Estado atual
- **Fase 1 (núcleo de simulação headless), marcos 1.1 e 1.2 concluídos:**
  - 1.1: esqueleto do projeto Godot, RNG determinístico (`core/rng.gd`) validado contra Python, executor de testes headless.
  - 1.2: todo o conteúdo do MVP em `data/*.json` (valores do design, ainda não calibrados); `core/db.gd` carrega, converte para int e valida; vocabulário de traits/efeitos em `core/traits.gd` (cada id precisa ser implementado no combate, marco 1.4). `Db.monster_at(id, nível, variante)` dá os atributos escalados.
  - 22 testes verdes (`.\tools\test.ps1`).
- GitHub: `https://github.com/Victorhugofoc/pocket-dungeon` (remoto `origin`). **O push é feito pelo usuário no GitHub Desktop**: esta sessão não tem credencial. Eu só faço commit.
- MCP do Godot não carrega nas sessões do Code (erro de protocolo no log `mcp-server-Godot Editor MCP.log`). Não é necessário: trabalhamos com arquivos + Godot headless + build web no navegador embutido.

## Próximos marcos (Fase 1)
1. ~~1.1 Esqueleto + RNG + testes~~
2. ~~1.2 Dados do MVP + carregador validado~~
3. **1.3 Grafo da masmorra, escavação e escolha de rota** (`core/dungeon.gd`, `core/combat/pathing.gd`), regras da D-008.
4. 1.4 Simulação de combate: tick 10/s, movimento, salas, armadilhas, alvo, status, Coração, Guardião, limite de tempo, eventos, hash de determinismo.
5. 1.5 Run: estado, economia, loja, bancada, merge, gerador de ondas, poderes, relatório.
6. 1.6 Bots (random, greedy, counter) + `sim_runner.gd` + primeira rodada de balanceamento. Gate da Fase 1.

## Pendências com o usuário
- Escolher o nome definitivo (candidatos no design).
- Pesquisa de concorrentes (Legend of Keepers, Dungeon Maker).
- Ver o que reaproveitar do `dungeon-idle` / Dungeon Reign (`C:\Users\victo\Documents\GitHub\dungeon-idle`, LÖVE/Lua): heróis (Aurelius, Frostine, Ignis, Kaelen, Varok, Zephyr) poderiam virar Heróis-Chefe invasores; ícones e efeitos dependem da licença/origem dos assets.
