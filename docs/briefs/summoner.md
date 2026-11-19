# Brief do summoner (M3-04)

Modelo: `tools/blender/summoner.py` (base comum de manto em `tools/blender/robed.py`). Forma `robed`: flutua; o vestido fica no osso `skirt`. O livro é modelado no Blender, no osso `foreL`.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/summoner.png` e a folha (`dungeon-idle/assets/enemies/special/summoner_sheet.png`) | tudo: mulher alta e pálida, cabelo branco-acinzentado longo até a cintura, solto e jogado para um lado; vestido roxo escuro até o chão com mangas em sino muito largas; corpete com costelas de osso na frente (uma coluna e costelas claras) e tiras de couro marrom; abertura na frente da saia com saia de baixo marrom e botas; livro aberto grande na altura do quadril; a outra mão erguida com dedos em garra. |
| Ficha da seção 7 do roadmap | "Mulher pálida, cabelo branco longo, vestido roxo, livro"; cores roxo escuro e branco |

## 2. Medidas (quadro 0, 38 × 60 px)
- Cabeça: 9 px (rosto 7 px), estreita; o cabelo dobra a largura da cabeça e desce até a cintura (≈ 25 px).
- Ombros estreitos (≈ 2 cabeças); mangas em sino de ≈ 10 px de boca.
- Livro: ≈ 12 × 8 px aberto, capa marrom, páginas creme com linhas.
- Saia longa, alarga pouco (barra ≈ 1,4 × ombros).

## 3. Cor
Vestido `#3e2d48` / `#543c5c` (sombra `#251730`). Pele `#d2bba4` (sombra `#9a7266`). Cabelo `#ece6d6` / `#b0a39a` (sombra `#7c7683`). Couro `#4f2b2d` / `#341b1f`. Osso do corpete `#d8c8a8`. Páginas `#e8dcc0`, capa `#6a3a22`, cantos dourados `#b18c71`. Olhos com brilho verde-água (`#7affc8`) pequeno, que é a cor de magia dela no jogo.

## 4. Animação
Estilo `cast`. Pose de repouso: braço direito erguido com a mão em garra na altura do ombro; o esquerdo com o antebraço à frente, livro aberto deitado sobre a mão. As mangas caem para baixo do mundo nessa pose.

## 5. Checagem (o crítico recebe esta lista)
1. De cima, lê-se "bruxa pálida de cabelo branco e vestido roxo com um livro".
2. Cabelo branco longo e solto, visível de costas.
3. Livro aberto legível (capa, páginas claras) na câmera do jogo.
4. Corpete de costelas de osso visível de frente.
5. Contorno contínuo nas mangas e na barra; até cerca de 5 mil triângulos.

## 6. Crítico (2026-11-18)
6 rodadas. Corrigido: livro grosso, entreaberto e inclinado (era fino e preto pela oclusão), rosto sereno de boca fechada (lia como zumbi), dedos sem contorno e maiores, mecha que atravessava a manga, decote manchado (o vestido fechou até o pescoço), cortinas de cabelo da cabeça curtas (saíam do corpo no ataque). Oscilaram e ficaram: tom do roxo, tamanho e abertura do livro, cabelo em mechas ou em massa, fundo do corpete (o último crítico leu as costelas como caixa torácica; as costelas vêm do sprite). Médios restantes: botas, ombros, cabelo pouco volumoso de frente. ~5,9 mil triângulos.
