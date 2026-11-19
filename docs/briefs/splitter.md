# Brief do splitter (M3-02)

Modelo: `tools/blender/splitter.py`. Gosma grande que, ao morrer, se divide em dois swarm.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/splitter.png` | tudo: gosma rosa brilhante em forma de pudim, mais larga embaixo e escorrendo, rosto zangado, ossos e uma caveira dentro do corpo, poça e gotas no chão |

## 2. Forma
- Pudim: topo arredondado, levemente inclinado para a frente; base mais larga que o topo, que **escorre** em línguas e babados até o chão, com uma poça e duas ou três gotas soltas ao redor.
- Rosto na frente, alto: arcada pesada em V (carranca), olhos escuros fundos com um brilho, boca grande aberta com dentes brancos em cima e embaixo.
- **Ossos dentro**: uma caveira pequena e três ou quatro ossos (fêmur com as duas pontas em bola), meio afundados na gosma. Só a parte de cima sai da superfície, e o resto aparece como mancha escura no rosa (a gosma "translúcida" é sugerida pela cor, sem transparência real).
- Brilho úmido: realces claros no alto, uma linha de reflexo na curva da frente.

## 3. Cor
Rosa `#cc3879` (meio), `#fa74b8` (luz), `#ffdcf6` (reflexo), `#691340` (sombra), `#440624` (fundo e boca). Osso `#f1adba` (osso tingido de rosa). Olho com brilho `#fff2f8`.

## 4. Animação e escala
- Um osso só, `hips`, com pivô no chão; a animação achata e estica a gosma inteira. O modelo fica apoiado em y = 0.
- Raio no chão ≈ 0,8 (o raio de colisão em `enemies.ts`); altura ≈ 1,1.

## 5. Checagem (o crítico recebe esta lista)
1. Vista de cima, lê-se "gosma rosa com ossos dentro", não "bola rosa lisa".
2. O rosto zangado se lê de frente e de 3/4: carranca, boca aberta com dentes.
3. A base escorre (babados irregulares e poça), não termina numa borda reta.
4. Até cerca de 3.000 triângulos.
