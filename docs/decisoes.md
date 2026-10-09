# Registro de decisões

Formato: **D-###** — data — decisão. *Motivo.*

- **D-001** — 2026-10-08 — Estrutura de runs roguelite de 8 ondas, merge com bancada e loja, masmorra em corte lateral com bifurcação, Coração com 20 PV. Detalhes em `design-v2.md`. *Crítica da v1: andares feitos à mão viram quebra-cabeças resolvidos, merge sem tensão, layout linear sem sensação de lugar.*
- **D-002** — 2026-10-08 — Nome provisório "Covil"; "Pocket Dungeon" descartado. *Conflito com Shovel Knight Pocket Dungeon.*
- **D-003** — 2026-10-09 — Godot 4.7.2, GDScript, renderer GL Compatibility, viewport base 540×960 retrato. *Exportação web para playtest no itch e compatibilidade com Android intermediário.*
- **D-004** — 2026-10-09 — RNG próprio xoshiro128** em aritmética de 32 bits, validado contra referência em Python (`tools/rng_ref.py`). *Determinismo idêntico entre plataformas; habilita replay, Run Diária e "Invada o Covil do amigo".*
- **D-005** — 2026-10-09 — Executor de testes próprio (`tools/run_tests.gd`) em vez do GUT. *Sem dependência externa e roda headless em poucos ms.*
- **D-006** — 2026-10-09 — O protótipo de papel da Fase 0 foi trocado pelo simulador com bots da Fase 1. *Valida as regras mais rápido; o teste de papel com pessoas fica opcional.*
