# Brief do deathstalker (M10-01)

Modelo: `tools/blender/deathstalker.py`. Forma nova `scorpion` em `build.ts`/`animate.ts`: corpo no `hips`, 8 patas por cinemática inversa (malhas de pata do Blender, chaves `legfemur`/`legtibia`), pinças em `armL/R` → `foreL/R` → `clawL/R` (dedo móvel), cauda em cadeia `tail` → `tail2` … `tail5` (o ferrão vai no `tail5`).

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/deathstalker.png` e a folha inteira (`dungeon-idle/assets/enemies/bosses/deathstalker_sheet.png`) | tudo. Escorpião blindado de metal escuro com brilho cromado forte no alto de cada placa; faixas douradas entre as placas do corpo, da cauda e nas juntas das patas; olhos vermelhos na frente da carapaça; enfeite dourado no alto da carapaça; pinças grandes pretas de pontas douradas; cauda de 5 gomos que sobe e se curva para a frente, ferrão em gancho dourado com ponta ciano acesa. Linha 3 (ataque): o ferrão estoca para a frente com rastro ciano. Linha 5 (morte): vira de costas. Linha 6 (especial): empina e mira. |
| `bosses.lua` | `deathstalker`: Hunter, Marked Prey, cor `{0.45, 0.85, 0.45}`; luta de longe. |

## 2. Medidas (antes da escala da receita)
- Corpo baixo: quadril a 0,34; carapaça 0,34 de largura e 0,4 de comprimento; 6 placas no abdômen afinando para trás.
- Cauda: 5 gomos de ~0,2, do fim do corpo até ~1,0 de altura, curvada para a frente; o ferrão fica sobre o meio do corpo.
- Pinças: mão quase tão larga quanto meia carapaça, dedos de ~0,2; da ponta da pinça ao fim do corpo ~1,6.
- Patas: 4 de cada lado, joelho acima do corpo, pé fino de ponta dourada.

## 3. Cor
Metal escuro `#2b2e35`, claro `#8d939e`, brilho `#dfe4ea` no alto das placas. Dourado `#c8902a` / `#f0c060`, sombra `#7a5418`. Olhos `#ff3a22` acesos. Ponta do ferrão `#7ff3ff` acesa.

## 4. Animação
Patas por cinemática inversa. Parado: a cauda balança devagar, gomo a gomo. Preparo: empina, cauda armada para trás, pinças abertas. Golpe: o ferrão estoca para a frente e as pinças fecham. Morte: vira de costas, patas encolhidas.

## 5. Checagem (o crítico recebe esta lista)
1. De cima (câmera do jogo), lê-se "escorpião" de longe: pinças, cauda curvada com ferrão, 8 patas.
2. Metal escuro com brilho, não plástico preto; faixas douradas visíveis entre os gomos.
3. Olhos vermelhos e ferrão ciano visíveis.
4. A cauda não esconde o corpo de cima; o ferrão fica sobre o corpo, não atrás.
5. Até cerca de 8 mil triângulos (chefe).

## 6. Crítico (2026-11-23)
3 rodadas. Corrigido: pinça de "luva de boxe" com dedos curtos virou mão em cunha larga com dedos dourados longos e curvos abertos em V, braço mais curto, pinças erguidas em repouso; patas longas e abertas (lia "aranha com cauda") ficaram mais curtas, espalhadas ao longo do corpo e com o corpo 0,07 mais baixo (`DROP` na receita); ferrão de cone reto virou bulbo liso, colar dourado e lâmina ciano em foice acesa; cauda mais grossa na ponta e arco que chega à cabeça vista de cima; no golpe a base da cauda tomba e a ponta se abre, levando o ferrão à frente das pinças; 5 placas largas no abdômen; arabesco dourado no dorso; olhos num cachinho pequeno carmim; quelíceras escuras; barriga marrom-avermelhada; escala 2,6. Oscilou e ficou no meio: cor (rodada 1 "preto demais", rodada 2 "claro demais"; ficou grafite com reflexo claro por placa). Médios restantes da 3ª rodada: pinças ainda menores que no sprite, tronco "de cano" de lado, cauda um pouco mais escura que o corpo (a luz de lado), escala na câmera do jogo.
