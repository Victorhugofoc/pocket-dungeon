# Brief da Gorged Ooze (M10-05)

Modelo: `tools/blender/gorged_ooze.py`. Chefe "The Devourer": gosma gigante que cospe ácido, solta ondas de lodo, dá o bote (Engulf) e se divide em splitters a cada fase.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/gorged_ooze.png` | gosma verde em forma de cúpula alta, inclinada para a frente; boca enorme aberta que ocupa a metade de baixo da frente; lábio de cima grosso pendurando fios de baba; lábio de baixo em rolo grosso com dentinhos; olhos claros e bravos sob sobrancelha pesada em V; bolhas na pele; poça escorrendo na base |

## 2. Forma
- Cúpula alta e lisa, mais alta que larga no topo e mais larga na base; o alto pende um pouco para a frente, por cima da boca.
- **Boca enorme**: abre na frente, da altura da base até perto dos olhos, quase da largura do corpo. Por dentro, escura e funda, com língua verde-escura no fundo.
- Lábio de cima: saliência grossa por cima da boca, com 5 a 7 fios de baba de comprimentos diferentes pendurados (alguns com gota na ponta).
- Lábio de baixo: borda grossa em U na frente da boca, que nasce do próprio corpo (parte da malha da gosma; como peça de outro osso parecia uma boia colada, rodada 3 do crítico), com dentinhos claros na borda de dentro e baba escorrendo até a poça.
- Olhos: dois, claros (verde-água pálido) com pupila escura pequena, metidos sob uma sobrancelha pesada em V (cara de bravo), logo acima do lábio de cima.
- Pele: bolhas pequenas espalhadas (calombos mais claros); brilho úmido no alto.
- Base: escorre numa poça de borda irregular, com gotas soltas.

## 3. Cor
Verde `#4fa832` (meio), `#8fd85a` (luz), `#dcffb4` (reflexo), `#2a6a1e` (sombra), `#0f2a10` (fundo da boca). Língua `#2f6a24`, dentes `#e8f0c0`, olho `#cfeee4` com pupila `#0c1a0c` e brilho `#ffffff`.

## 4. Animação e escala
- Forma `slime`: um osso só, `hips`, com pivô no chão; a animação achata e estica a gosma inteira (sem mandíbula móvel).
- No modelo: raio da base ≈ 0,95, altura ≈ 1,45; no jogo, escala 2,0 (raio de colisão 1,8).

## 5. Checagem (o crítico recebe esta lista)
1. Vista de cima (câmera do jogo), lê-se "gosma verde gigante de boca aberta", com a boca virada para a frente.
2. A boca é a peça dominante da frente: funda, escura, lábio de baixo em rolo com dentes, fios de baba pendurados no de cima.
3. Os olhos bravos se leem de frente e de 3/4 (sobrancelha em V sobre olhos claros).
4. A base escorre numa poça irregular, não termina em borda reta.
5. Parece um chefe (maior e mais elaborado que o splitter), mas da mesma família de gosma.
