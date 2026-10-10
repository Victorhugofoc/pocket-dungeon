# Covil — handoff

Leia este arquivo antes de qualquer coisa. Ele substitui o histórico das conversas anteriores.

## Estado atual
- **Fase 1 (núcleo de simulação headless) CONCLUÍDA, gate aprovado (D-016)** — versão 0.1.
  - `core/rng.gd`: RNG determinístico (xoshiro128** 32 bits), validado contra `tools/rng_ref.py`.
  - `core/db.gd` + `core/traits.gd` + `data/*.json`: conteúdo do MVP com validação rigorosa (D-007).
  - `core/dungeon.gd` (escavação D-008, posicionamento) e `core/combat/pathing.gd` (rotas por classe).
  - `core/combat/combat_sim.gd` + `unit.gd`: combate determinístico completo (regras D-011), ~12 ms por onda.
  - `core/run/`: `RunState` (loja, bancada, merge, escavação, ondas, Almas, save), `wave_generator.gd`, `wave_report.gd`, `pieces.gd` (regras D-013).
  - Heróis-Chefe = os 6 heróis de Dungeon Reign (D-009).
  - Bots (`tools/bots/`): random, generic, counter (D-015). Rodar: `.\tools\run_bots.ps1 -Runs 200 -Procs 14` (~4 min; 16 núcleos no PC do usuário). Histórico em `docs/balanceamento.md`.
  - Visualizador de debug: `game/debug/combat_viewer.tscn` (cena principal provisória). `.\tools\viewer.ps1 [cenário]`. Captura: `godot --path . --quit-after 900 res://game/debug/combat_viewer.tscn -- --shot <png> --scenario N --tick T` (sempre com `--quit-after`).
  - 94 testes (`.\tools\test.ps1`; qualquer `SCRIPT ERROR` conta como falha).
- GitHub: `https://github.com/Victorhugofoc/pocket-dungeon`. **O push é feito pelo usuário no GitHub Desktop**; eu só faço commit.
- MCP do Godot não carrega nas sessões do Code (erro de protocolo). Não é necessário.

## Próximo: Fase 2 — graybox jogável (versão 0.2, primeiro protótipo jogável)
Objetivo: montar a masmorra e assistir à onda, no navegador. Backlog da Fase 2 que saiu do PT-01 (`docs/playtest-notas.md`):
- onda começa pausada com uma frase descrevendo a montagem e o grupo; nomes por extenso; seta da rota de cada invasor; legenda fixa; destaque nos momentos decisivos; botão de poder explícito.
- preparação mínima: arrastar peças para os slots, escavar.
- relatório de onda na tela (já existe em `core/run/wave_report.gd`) e replay da última onda.
- exportar para web (precisa dos export templates 4.7.2 da Godot: pedir ao usuário para instalar pelo editor, Editor → Manage Export Templates).
Gate: 4 de 5 pessoas dizem em uma frase por que perderam a onda (plano, Fase 2).

## Pendências de balanceamento (não bloqueiam a Fase 2)
Varok forte demais (17% no counter); Golem/Slime únicos tanques; Galeria e Rede fracas; onda 4 ainda pesada. Ver `docs/balanceamento.md`.

## Pendências com o usuário
- Nome definitivo (candidatos no design).
- Pesquisa de concorrentes (Legend of Keepers, Dungeon Maker).
- Assets do Dungeon Reign (`C:\Users\victo\Documents\GitHub\dungeon-idle\assets`) foram gerados pelo Claude: podem ser reaproveitados (pixel art; avaliar na Fase 5).

## Versões jogáveis previstas
- **0.1** (Fase 1, feita): simulador + bots.
- **0.2** (fim da Fase 2): primeiro protótipo jogável no navegador, em graybox.
- **0.3** (fim da Fase 3): run completa no itch para playtest externo.
