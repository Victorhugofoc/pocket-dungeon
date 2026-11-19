# Brief do spellcaster (M3-04)

Modelo: `tools/blender/spellcaster.py` (base comum de manto em `tools/blender/robed.py`, sobre `humanoid.py`). Forma `robed`: flutua, sem pernas; o manto fica no osso `skirt`. O cetro é modelado no Blender, no osso `foreR`.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/spellcaster.png` e a folha (`dungeon-idle/assets/enemies/ranged/spellcaster_sheet.png`) | tudo: feiticeiro magro de pele azul-clara, coroa de cristais magenta, gola alta de vampiro vinho com forro carmim, manto verde-azulado até o chão com mangas largas, cetro curto com cristal magenta erguido na mão, a outra mão pálida pendendo na altura do quadril. No ataque, aponta o cetro à frente. |
| Ficha da seção 7 do roadmap | "Pele azul, coroa de cristais magenta, manto verde-azulado"; cores azul, magenta, verde-azulado |

## 2. Medidas (quadro 0, 44 × 58 px)
- Coroa: 10 px acima do crânio, 5 pontas, a do meio a mais alta, cristais facetados (não cones lisos).
- Cabeça: 11 px do topo do crânio ao queixo, rosto comprido e chupado, queixo fino, maçãs altas, órbitas fundas, orelhas pontudas pequenas.
- Gola: sobe atrás da cabeça até a altura dos olhos, abre em V na frente, larga como os ombros (≈ 2,5 cabeças).
- Manto: alarga do peito à barra (barra ≈ 1,6 × ombros), com abertura escura no meio da frente e barra roxa escura.
- Cetro: ≈ 0,55 da altura; cristal de ≈ 7 px no topo, segurado logo abaixo do cristal.

## 3. Cor
Pele `#99bcc9` (sombra `#4f7484`). Manto `#1f5a66` / `#2f6874` (sombra `#113945`, barra `#2d152c`). Gola `#421f37` por fora, forro `#5f1652` / carmim, sombra `#2a051e`. Cristais `#e84ad9` (luz `#ffb0f4`, base `#6a1052`). Cetro `#3a2a4a`.

## 4. Animação
Estilo `cast`. Pose de repouso: braço do cetro (direito) aberto com o antebraço para cima, cetro em pé; o esquerdo pende com a mão perto do quadril. As mangas caem para baixo do mundo na pose de repouso.

## 5. Checagem (o crítico recebe esta lista)
1. De cima, lê-se "feiticeiro de manto verde-azulado com coroa de cristais e cetro".
2. Gola alta vinho atrás da cabeça, aberta na frente.
3. Rosto azul, chupado e malvado (não simpático).
4. Contorno preto contínuo nas bordas do manto, da gola e das mangas.
5. Até cerca de 5 mil triângulos.

## 6. Crítico (2026-11-18)
4 rodadas, de grave para médio. Corrigido: cetro longo com cacho de cristais numa garra (era um toco, depois uma lança), gola contínua em funil baixo atrás (eram duas abas soltas e, de costas, um balde que escondia a cabeça), manto verde-azulado mais claro, mão livre maior com nós. Oscilaram entre rodadas e ficaram: brilho e forma da coroa (acesa estourava em branco; sólida lê como espinhos), cor da gola, postura curvada. ~4,2 mil triângulos.
