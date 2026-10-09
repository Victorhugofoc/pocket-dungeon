# Covil — instruções para o Claude

Leia `HANDOFF.md` antes de qualquer coisa: ele tem o estado atual e o próximo passo.

## Projeto
- Roguelite de defesa de masmorra com merge, mobile retrato. Godot 4.7.2 + GDScript (sem C#: precisa exportar para web).
- Design: `docs/design-v2.md`. Plano por fases com gates: `docs/plano-implementacao.md`. Decisões: `docs/decisoes.md` (D-###).
- O usuário escreve em português; documentos e textos do jogo em português.

## Ferramentas
- Godot: `C:\Users\victo\Documents\Godot_v4.7.2-stable_win64.exe` (fora do PATH).
- Git: vem com o GitHub Desktop, fora do PATH: `C:\Users\victo\AppData\Local\GitHubDesktop\app-*\resources\app\git\cmd\git.exe`.
- Testes: `.\tools\test.ps1 [filtro]`. Rodar depois de qualquer mudança em `core/`.

## Regras de arquitetura
- `core/` é lógica pura: `RefCounted`, sem `Node`, sem `float`, sem acessar `game/` ou `services/`. Precisa rodar em `--headless`.
- Aleatoriedade só via `core/rng.gd`, com stream por domínio (`combat`, `shop`, `waves`). Nunca `randi()`/`randf()` no `core/`.
- Porcentagens em pontos-base (10000 = 100%). Iterar dicionários sempre em ordem de chave ordenada.
- Números de balanceamento ficam em `data/`, não no código.
- Nos testes, carregar scripts com `preload("res://...")` em vez de depender do `class_name`.

## Fluxo
- Cada marco: implementar → testes verdes → atualizar `HANDOFF.md` (e `docs/decisoes.md` se houve decisão) → commit.
- Decisões de design que mudam o `design-v2.md` são confirmadas com o usuário antes.
