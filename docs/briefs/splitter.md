# Brief do splitter (M3-02)

Modelo: `tools/blender/splitter.py`. Gosma grande que, ao morrer, se divide em dois swarm.

**Decisão do usuário (2026-11-18):** sem ossos, caveira nem outra peça saindo do corpo ("ficaram muito irregulares"). A forma fica só na gosma: topo liso e bordas irregulares escorrendo, que também combinam com o achatar e esticar da animação.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/splitter.png` | gosma rosa brilhante em forma de pudim, mais larga embaixo e escorrendo, rosto zangado, poça e gotas no chão (os ossos do sprite ficam de fora, ver a decisão acima) |

## 2. Forma
- Pudim: topo arredondado, levemente inclinado para a frente; base mais larga que o topo, que **escorre** em línguas e babados até o chão, com uma poça e duas ou três gotas soltas ao redor.
- Rosto na frente, alto: arcada pesada em V (carranca), olhos escuros fundos com um brilho, boca grande aberta com dentes brancos em cima e embaixo.
- Brilho úmido: realces claros no alto, uma linha de reflexo na curva da frente.

## 3. Cor
Rosa `#cc3879` (meio), `#fa74b8` (luz), `#ffdcf6` (reflexo), `#691340` (sombra), `#440624` (fundo e boca). Olho com brilho `#fff2f8`.

## 4. Animação e escala
- Um osso só, `hips`, com pivô no chão; a animação achata e estica a gosma inteira. O modelo fica apoiado em y = 0.
- Raio no chão ≈ 0,8 (o raio de colisão em `enemies.ts`); altura ≈ 1,1.

## 5. Checagem (o crítico recebe esta lista)
1. Vista de cima, lê-se "gosma rosa zangada", com a borda escorrendo; nada sai do corpo.
2. O rosto zangado se lê de frente e de 3/4: carranca, boca aberta com dentes.
3. A base escorre (babados irregulares e poça), não termina numa borda reta.
4. Até cerca de 3.000 triângulos.
