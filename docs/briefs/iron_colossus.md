# Brief do iron_colossus (M10-08)

Modelo: `tools/blender/iron_colossus.py` (bípede de `humanoid.py`). Golem de ferro em placas: cada parte é uma casca de ferro (`loft`, fileiras de pontos com espessura), com faixas, rebites e ferrugem pintada por ruído na cor por vértice.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/iron_colossus.png` | tudo. Colosso de ferro curvado, muito largo, de pernas curtas e arqueadas. Ombreiras enormes e redondas, maiores que a cabeça, com rebites e faixas; a cabeça é um elmo pequeno e quadrado, afundado entre os ombros, com uma fenda escura de viseira e um aro de latão em volta da gola. No peito, uma fornalha: caixa de ferro com grade de barras verticais e fogo laranja aceso atrás. Braços de anéis de placa empilhados, cada vez mais grossos até manoplas enormes, punhos na altura dos joelhos (o direito mais à frente). Barriga com uma faixa de placa e uma fivela. Coxas em placas, joelheiras redondas, canelas largas e botas pesadas de bico arredondado cor de latão sujo. Ferro cinza-chumbo coberto de ferrugem laranja-marrom em manchas, mais nas partes de cima das placas; brilho claro nas arestas. |
| `bosses.lua` | `iron_colossus`: Juggernaut, Earthbreaker, cor `{0.7, 0.72, 0.78}`; `techAttacks` com o soco de dois punhos no chão (Quake e Armorbreak). |
| Ficha da seção 7 do roadmap | "Golem de placas com fornalha no peito". |

## 2. Medidas (quadro 0, ~330 px de altura)
- Largura total (ombreiras) ≈ 0,8 × a altura; largura dos quadris ≈ 0,55 × a dos ombros.
- Cabeça ≈ 70 px de largura (≈ 1/4 dos ombros), o topo da cabeça na altura do topo das ombreiras.
- Pernas ≈ 1/3 da altura; os punhos descem até o joelho.
- Fornalha ≈ 70 × 70 px, no centro do peito, logo abaixo da cabeça.

## 3. Cor
Ferro `#2e2f34` (sombra) / `#55575e` / `#8a8c94` / `#c4c6cc` (aresta); ferrugem `#6e2c16` / `#9a4320` / `#c06a34`; latão sujo `#6a6338` / `#8c8448`; fogo `#ff6a1a` → `#ffb040` → `#ffe08a` (aceso, sem contorno); fundo da fornalha `#140a06`.

## 4. Animação
Estilo `swing` (soco). `lean` alto e `crouch` (curvado, pesado), braços pendendo à frente, punhos na altura do joelho.

## 5. Checagem (o crítico recebe esta lista)
1. De cima, lê-se "colosso de ferro enferrujado com fornalha acesa no peito", não "robô liso" nem "cavaleiro".
2. Ombreiras enormes e redondas, cabeça pequena afundada entre elas.
3. Fornalha com grade e fogo laranja visível de frente e na câmera do jogo.
4. Braços de anéis de placa e punhos enormes perto do chão; pernas curtas e largas.
5. Ferrugem em manchas, não um tom marrom chapado; ferro escuro com arestas claras.
6. Até cerca de 12 mil triângulos.

## 6. Crítico (2026-11-24)
9 rodadas, de grave para médio. Corrigido: tudo em esferas e cúpulas lisas ("boneco inflado") virou placas facetadas (`loft` com faces chapadas e poucos segmentos, subdivisão simples só para a cor); cabeça em ovo com dois olhinhos virou elmo em caixa de topo chato, aba na testa, fenda larga com brasa fraca e aro de latão grosso na base, 1,25× e à frente das ombreiras; mancha preta entre a cabeça e a ombreira (núcleo escuro) pintada de ferro; buraco no alto do tronco (casca aberta) e estrela preta (polo degenerado) viraram tampa chapada; fornalha pequena e "colada" virou caixa funda de moldura grossa embutida no peito, inteira no osso do tronco (abaixo dele descolava como tábua quando o tronco se curva), fundo laranja aceso e uniforme (as chamas em ponta liam como dentes); barras sem contorno (`@flat`), porque o contorno preto comia o fogo entre elas; ombreiras em 2 chapas como telhas com 3 rebites grandes no alto (a 3ª chapa fazia "orelhas"); costas em 2 placas no corte da couraça, com rebites; braços e pernas mais longos, pernas mais afastadas e grossas, joelheira e biqueira de latão; manopla em bloco 1,5× com 4 nós dos dedos arredondados e polegar; pose assimétrica (punho direito à frente), inclinação menor para a fornalha aparecer na câmera do jogo; brilho claro só na aresta das placas, não no tampo chato nem por cima da ferrugem (lia como "mármore rosado"). Oscilaram e ficaram no meio: tom do ferro (quase branco ↔ quase preto), quantidade e tamanho da ferrugem (respingos ↔ manchas grandes), tamanho da cabeça (dobrar ↔ 60%), tamanho dos punhos, tamanho da fornalha, cor das botas. Médios restantes: fornalha pequena na câmera do jogo, ferro escuro, pernas finas, punho de lado sem dedos, braço atravessando a ombreira no golpe (pose `swing` comum), aspecto liso de brinquedo. ~23,5 mil triângulos (como o Storm Tyrant).

## 7. Pedido do usuário (2026-11-24)
Recusado como estava: no golpe o braço erguido atravessava a ombreira (presa ao tronco). Corrigido com ossos próprios para as ombreiras, `shoulderL`/`shoulderR` no tronco, no pivô do ombro (`Builder.shoulderFollow` = 0,65): elas seguem 65% do giro do braço além da pose de descanso, então sobem junto no golpe e ficam paradas no idle. Conferido em 4 quadros do golpe de perto (preparo, braço no alto, descida).
