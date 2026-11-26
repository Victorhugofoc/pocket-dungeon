# Brief da Frostine (M2-11)

Modelo: `tools/blender/frostine.py` (base de manto `robed.py` sobre `humanoid.py`, derivado do `summoner.py`). Forma `robed`: flutua, sem pernas; o vestido fica no osso `skirt`. Cajado modelado no Blender, no `foreR`; o floco de neve aceso do topo e o floquinho sobre a mão esquerda ficam por código (`cast-heroes.ts`).

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/frostine.png` | tudo: maga do gelo esguia, coroa de cristais (o do meio mais alto), cabelo branco longo e liso, rosto pálido de olhos azuis, gola de pelo branco nos ombros, corpete azul com gema ciano, vestido azul escuro em camadas até o chão com painel claro e barra branca, cauda atrás, mangas em sino com punho de pelo, cajado alto com floco de neve na mão direita, mão esquerda estendida com flocos flutuando. |
| Ficha M2-08 do roadmap | "Vestido em camadas, coroa de gelo, cajado de floco, anel de gelo no chão" |

## 2. Medidas (sprite, 67 px sem o cajado)
Coroa 8 px; ombros com a gola 18 px; saia 20 px na barra e cauda de mais 14 px; cajado 62 px. Esqueleto igual ao da receita antiga (mantido para não quebrar as animações): `hipY 0.92, headY 0.57, shoulderY 0.45, shoulderX 0.22, arm 0.31`.

## 3. Cor e regiões (skins, M13-06)
primary = azul-marinho `#1e2c74` (manto, corpete, mangas); secondary = azul-gelo `#9cc6f4` (painel, saia de baixo, antebraço); accent = pelo branco (gola, cinto, barras, punhos). Fixos: pele `#fdece4`, cabelo `#e4ecf8`, gelo `#9fe4ff`.

## 4. Checagem (o crítico recebe)
1. De cima, lê-se "maga do gelo de vestido azul com coroa de cristais e cajado de floco".
2. Rosto pálido e decidido, olhos azuis.
3. Gola de pelo branco nos ombros; barra branca no vestido.
4. Até 6 mil triângulos (5,9 mil na primeira versão).

## 5. Crítico (2026-11-25, aprovada pelo usuário)
Até 3 rodadas; depois de cada uma, o usuário vê as capturas e a lista e decide se segue. R1 (grave: saia aberta lia como calça) → saia fechada com V só embaixo, marinho com faixa azul-gelo, gola alta, coroa 30% mais alta, mão esquerda erguida, cauda. Usuário: rosto fino demais (caveira) → rosto cheio. R2 (médio) → cabelo em mechas finas, mangas, mãos abertas, floco a 75%. Usuário: queixo pontudo → maxilar redondo. R3 (grave, regressões da R2: mangas longas soltas do braço erguido, gola em V cruzando o peito) → sino preso ao antebraço, gola em anel justo; usuário: sem boca e nariz → olhos, boca e nariz pousados na pele por raio (`on()` em `head()`; com o rosto mais cheio tinham ficado dentro). ~5,97 mil triângulos.
Pendentes de propósito (esperam o usuário jogar): cajado do lado oposto ao do sprite (receita antiga igual; trocar mexe na animação), floco da mão pequeno na câmera do jogo, coroa com o cristal do meio alto, pouca variação de tom no manto.
Lição: oclusão assada deixa rosto, mão e peça fina cinza ou azul-marinho; marcar `no_ao`.
