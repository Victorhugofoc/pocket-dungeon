# Covil — handoff

Leia este arquivo antes de qualquer coisa. Ele substitui o histórico das conversas anteriores.

## Estado atual
- **Fase 1 (núcleo de simulação headless), marco 1.1 concluído:** esqueleto do projeto Godot, RNG determinístico (`core/rng.gd`) validado contra Python, executor de testes headless. 7 testes verdes.
- Repositório Git local criado, ainda **sem remoto** no GitHub (o usuário decide quando criar).
- MCP do Godot não carrega nas sessões do Code (erro de protocolo no log `mcp-server-Godot Editor MCP.log`). Não é necessário: trabalhamos com arquivos + Godot headless + build web no navegador embutido.

## Próximos marcos (Fase 1)
1. ~~1.1 Esqueleto + RNG + testes~~
2. **1.2 Definições de dados:** classes `MonsterDef`, `RoomDef`, `TrapDef`, `AdventurerDef`, `ModifierDef`, `PowerDef`, `BossDef`; carregador `core/db.gd`; dados do MVP em `data/` (JSON exportável de planilha) com os valores do design.
3. 1.3 Grafo da masmorra e escolha de rota (`core/combat/pathing.gd`).
4. 1.4 Simulação de combate: tick 10/s, movimento, salas, armadilhas, alvo, status, Coração, Guardião, limite de tempo, eventos, hash de determinismo.
5. 1.5 Run: estado, economia, loja, bancada, merge, gerador de ondas, poderes, relatório.
6. 1.6 Bots (random, greedy, counter) + `sim_runner.gd` + primeira rodada de balanceamento. Gate da Fase 1.

## Pendências com o usuário
- Escolher o nome definitivo (candidatos no design).
- Pesquisa de concorrentes (Legend of Keepers, Dungeon Maker).
- Ver o que reaproveitar do `dungeon-idle` / Dungeon Reign (`C:\Users\victo\Documents\GitHub\dungeon-idle`, LÖVE/Lua): heróis (Aurelius, Frostine, Ignis, Kaelen, Varok, Zephyr) poderiam virar Heróis-Chefe invasores; ícones e efeitos dependem da licença/origem dos assets.
