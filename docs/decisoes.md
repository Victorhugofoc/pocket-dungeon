# Registro de decisões

Formato: **D-###** — data — decisão. *Motivo.*

- **D-001** — 2026-10-08 — Estrutura de runs roguelite de 8 ondas, merge com bancada e loja, masmorra em corte lateral com bifurcação, Coração com 20 PV. Detalhes em `design-v2.md`. *Crítica da v1: andares feitos à mão viram quebra-cabeças resolvidos, merge sem tensão, layout linear sem sensação de lugar.*
- **D-002** — 2026-10-08 — Nome provisório "Covil"; "Pocket Dungeon" descartado. *Conflito com Shovel Knight Pocket Dungeon.*
- **D-003** — 2026-10-09 — Godot 4.7.2, GDScript, renderer GL Compatibility, viewport base 540×960 retrato. *Exportação web para playtest no itch e compatibilidade com Android intermediário.*
- **D-004** — 2026-10-09 — RNG próprio xoshiro128** em aritmética de 32 bits, validado contra referência em Python (`tools/rng_ref.py`). *Determinismo idêntico entre plataformas; habilita replay, Run Diária e "Invada o Covil do amigo".*
- **D-005** — 2026-10-09 — Executor de testes próprio (`tools/run_tests.gd`) em vez do GUT. *Sem dependência externa e roda headless em poucos ms.*
- **D-007** — 2026-10-09 — Conteúdo em JSON (`data/`), carregado como Dictionaries por `core/db.gd` com validação rigorosa: campos, tipos, enums, vocabulário de traits e efeitos (`core/traits.gd`), referências cruzadas, tamanho dos arrays por nível e alcançabilidade do Coração. Números sempre inteiros. *JSON é fácil de gerar a partir de planilha e de ler em Python; a validação compensa a falta de tipos.*
- **D-008** — 2026-10-09 — Escavação: slots têm estados rocha/túnel/sala. Início: A1, B1 e D1 são salas, B2 é túnel, C1 e C2 são rocha. 3 escavações (3/5/7 de ouro, pela ordem); abrir C1 ou C2 transforma o outro em túnel. *O design original tinha 3 preços para só 2 slots de rocha, e escavar só C1 deixava um beco sem saída.*
- **D-006** — 2026-10-09 — O protótipo de papel da Fase 0 foi trocado pelo simulador com bots da Fase 1. *Valida as regras mais rápido; o teste de papel com pessoas fica opcional.*
