# Balanceamento: rodadas do bot

Ferramenta: `.\tools\run_bots.ps1 -Runs 200 -Procs 14` (mesmas sementes para todos os bots; relatório em `reports/<data>/report.txt`).

Bots (D-015):
- **random**: ações válidas aleatórias.
- **generic**: busca por simulação contra grupos padrão (tema "misto").
- **counter**: o mesmo algoritmo, contra o grupo real da próxima onda, o tema da seguinte e o Herói-Chefe revelado.

## Rodada 0 — 2026-10-10 — valores do design

| bot | vitórias (200 runs) | IC 95% |
|---|---|---|
| random | 0,0% | 0–1,9% |
| generic | 23,5% | 18–30% |
| counter | 44,5% | 38–51% |

Pareado: só counter vence 48 sementes, só generic vence 6. Problemas: Golem obrigatório (vitória sem ele ≈ 9%); onda de elite (4) concentra 58 das 111 derrotas do counter.

## Rodada 1 — 2026-10-10

Mudanças: Golem 120→90 PV, 10→8 ATQ; Morcego 25→32 PV, atordoamento a cada 50 ticks (era 60); onda de elite com 80% do orçamento (`elite_budget_bp`).

| bot | vitórias | IC 95% | ondas sobrevividas |
|---|---|---|---|
| random | 0,0% | 0–1,9% | 2,54 |
| generic | 19,5% | 15–26% | 5,36 |
| counter | 37,0% | 31–44% | 6,13 |

- **Gate da Fase 1: PASSOU.** counter − random = +37 pp (meta ≥ 25); counter − generic = +17,5 pp; pareado 48 × 13.
- Derrotas do counter por onda: o4 34, o5 27, o6 12, o7 7, o8 46.
- Chefes (counter): Aurelius 49%, Zephyr 48%, Ignis 42%, Kaelen 39%, Frostine 29%, **Varok 17%**.
- Dominância: Golem ainda é a peça mais importante (vitória sem ele 12% vs 37% de média); Slime em segundo (24% sem ele). Leitura: toda defesa precisa de um tanque e só há duas espécies tanque.
- Escavar importa: 78% das vitórias escavaram, contra 52% de todas as runs.

**Pendências de balanceamento (Fases 2–4):** Varok forte demais; Golem/Slime como únicos tanques (avaliar Esqueleto como terceiro tanque quando a meta desbloquear); Galeria e Rede pouco eficazes; pico na onda 4 ainda alto.
