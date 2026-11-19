# Brief do berserker (M3-05)

Modelo: `tools/blender/berserker.py` (base dos anões em `tools/blender/dwarf.py`, sobre `humanoid.py`). Os dois machados continuam por código (`berserkerAxe` em `cast-enemies.ts`), um em cada mão, empunhados para cima em guarda.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/berserker.png` | tudo: guerreiro largo e curvado para a frente, elmo de aço com dois chifres claros e protetor de nariz, barba laranja farta, peito e braços nus com tatuagens azuis, manto de pele marrom sobre os ombros e as costas, calça escura e botas, um machado de lâmina larga em cada mão, caídos ao lado das pernas |
| Ficha da seção 7 do roadmap | "Elmo com chifres, barba laranja, peito tatuado, dois machados"; pele, laranja, aço; bípede largo |

## 2. Forma
- Anão musculoso: ombros e peito enormes, barriga, braços grossos, pernas curtas. Postura curvada, cabeça baixa e para a frente.
- Elmo em cúpula com aba, protetor de nariz e dois chifres curvos para cima e para fora.
- Barba laranja larga até o peito, bigode; olhos na sombra do elmo.
- Tatuagens azuis em faixas no peito, na barriga e nos braços.
- Manto de pele marrom cobrindo ombros e costas, com a borda felpuda.
- Braçadeiras de couro; cinto largo com fivela de ferro; calça marrom-escura; botas com borda de pele.

## 3. Cor
Pele `#d8a07a` (sombra `#8a5a3a`). Tatuagem `#3a7ad6`. Barba `#d9641e` (sombra `#8a3010`). Aço `#a8b0bc` (sombra `#4a505c`), chifre `#ece4d2`. Pele do manto `#7a5a3a` (sombra `#3e2c1c`). Calça `#4a3628`, botas `#2e241c`, couro `#6a4028`.

## 4. Animação
Estilo `swing` com as duas mãos juntas (pose igual nos dois braços): os dois machados sobem e descem ao mesmo tempo. É um `charger`: investe.

## 5. Checagem (o crítico recebe esta lista)
1. De cima, lê-se "berserker viking": chifres, barba laranja, peito nu tatuado, dois machados.
2. Proporção de anão largo, curvado.
3. Contorno preto contínuo em todas as bordas.
4. Até cerca de 5 mil triângulos.

## 6. Crítico (2026-11-19, 5 rodadas)
- Rodada 1: corpo ereto e estreito, barba cobrindo o peito, machados somindo no golpe. Rodada 2: rebites com contorno viraram "olhos de desenho"; tatuagens com contorno pareciam fitas. Rodada 3: manto lido como colete. Rodada 4: manto longo parecia um saco de perfil.
- Correções: ombros 0,42, `lean` 0,42, cabeça menor e erguida (`tilt` -0,35), tatuagem sem contorno (`torso@flat`), cinto baixo, olhos claros com pupila, placas de bochecha, manto até o quadril com corcunda, cotovelos dobrados, lâminas grossas.
- Rodada 5: barba curta demais (na rodada 1 era "longa demais, cobre o peito") e ponta clara do cabo aparecendo sobre o punho no golpe (corrigido: o cabo termina dentro da empunhadura).
- Oscilou e ficou no meio: tamanho dos chifres, tamanho das lâminas, comprimento do manto e da barba.
- Médios que restaram: tatuagem do peito em traços soltos (o sprite tem padrão tribal denso), manto ainda liso de costas, silhueta em ferradura marrom na câmera do jogo.
- ~6,3 mil triângulos.

## 7. Revisão do usuário (2026-11-19)
- Bombardier aprovado. Berserker recusado: segurava os machados "invertidos", caídos ao lado das pernas com a lâmina para baixo. Pedido: machados empunhados para cima, em posição de ataque.
- Feito: o cabo sai do punho para cima (pomo embaixo da mão), a lâmina fica no alto com o fio para a frente e para fora, o topo aberto para o lado e um pouco para trás; antebraços erguidos à frente (`poseR`/`poseL` = [-0,35, -1,45]), punhos na altura do peito.
