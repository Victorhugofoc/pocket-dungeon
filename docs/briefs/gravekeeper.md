# Brief do Gravekeeper (M1-06)

Modelo: `tools/blender/gravekeeper.py` (sobre `humanoid.py`, com as mangas em sino e o pano em anéis de `robed.py`). Bípede de manto: pernas escuras sob a saia (osso `skirt`). Pá e lanterna continuam por código (`gravekeeperShovel` e `gravekeeperLantern` em `cast-bosses.ts`, também usadas pela `gravekeeper_v1`). Prévia: `/preview.html?a=gravekeeper&b=gravekeeper_v1`.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/gravekeeper.png` | tudo: coveiro de capuz pontudo sem rosto (só o escuro e dois olhos verdes), pelerine cinza mais clara sobre os ombros com barra clara, manto cinza-escuro até o tornozelo com a barra rasgada e manchas escuras, cinto de couro com fivela, cordões claros pendurados na frente, fecho claro descendo pelo peito, mangas largas rasgadas, mãos pálidas, sapatos escuros, pá na mão direita apoiada no chão, lanterna na esquerda |
| `gravekeeper_v1` (receita antiga) | medidas do esqueleto (`b.dims`), pose, pá e lanterna |

## 2. Forma
- Capuz grande e pontudo, a ponta caída para trás; abertura funda com um vazio preto e os olhos acesos.
- Pelerine: a frente desce em V sob a abertura do capuz, os lados cobrem os ombros, a barra é rasgada e mais clara.
- Saia em sino, larga na barra, pontas rasgadas desiguais, forro escuro por dentro.
- Mangas em sino do cotovelo até além do pulso, a boca pendendo para o chão; punho fechado em volta do cabo da pá e da argola da lanterna.

## 3. Cor
Manto `#4c514e` (sombra `#222625`). Pelerine `#62675f` (sombra `#33372f`), barra `#8a8b74`. Vazio `#050707`. Olho `#7dffc0`. Pele `#d9c9a6`. Couro `#7a4a26`, fivela latão `#b08a4a`. Pernas `#2a2d2c`, sapato `#17181a`.

## 4. Animação
Como a v1 (`swing`, `crouch` 0,1, `armOut` 0,5, `poseL` [-0,35; -1,9]), com `lean` 0,18 e `poseR` [-0,3; -0,6] (mão da pá mais baixa; ver seção 6).

## 5. Checagem (o crítico recebe esta lista)
1. De cima, lê-se "coveiro encapuzado sem rosto, com pá e lanterna".
2. Olhos verdes visíveis dentro do capuz na câmera do jogo.
3. Barra do manto e das mangas rasgada.
4. Contorno preto contínuo.
5. Até cerca de 10 mil triângulos (chefe). Saiu com ~6,4 mil.

## 6. Crítico (2026-11-19, 4 rodadas)
- Rodada 1 (grave): ombros e mangas em bolas (silhueta de gorila); vazio do capuz cinza e facetado com um rolo de "queixo" embaixo; cinto fino; manto quase preto; mãos como pedrinhas. Corrigido: braço fino sem a bola do ombro, manga em sino mais longa, borda da pelerine lisa, abertura do capuz até a base, cinto mais alto, manto e pelerine mais claros, punho maior e pálido, barra mais rasgada com remendos claros.
- Rodada 2 (grave): de perfil, a manga da lanterna saía como um tubo com "focinho" além da mão; pé de trás como tábua. Corrigido: manga da lanterna mais curta e caída; sapato curto; mão da pá mais baixa que na v1 (`poseR` [-0,3; -0,6]) e tronco mais inclinado (`lean` 0,18); capuz e pelerine mais escuros; ponta do capuz mais baixa; dedos em volta do cabo; cordões trocados por tiras de couro.
- Rodada 3 (grave): manchas pretas de borda reta no alto dos braços (oclusão assada sob a pelerine que aparece quando o braço abre). Corrigido: braço e manga fora da oclusão (`no_ao`). Também: cinto mais escuro (o bloom da lanterna estourava), fivela de metal, capuz 10% menor, barra clara da pelerine mais forte.
- Rodada 4 (médio): corpo atarracado, capuz e pelerine fundidos, mãos, tiras do cinto claras demais. Ajustado depois: tiras mais finas e escuras, olhos menores, manga da pá mais curta. A ponta do capuz oscilou entre rodadas ("baixar" na 2, "mais alta" na 4): ficou como está.
- Decisões fixas dadas ao crítico: pá e lanterna da v1 (forma, tamanho, lado); cena noturna; golpe é do `M4-08`.
- Médios que restaram (para o usuário decidir): proporção mais atarracada que o sprite (o esqueleto é o da v1), pelerine volumosa, mão da lanterna arredondada.
- ~6,4 mil triângulos.

## 7. Revisão do usuário (2026-11-19)
- "Quase perfeito": as mãos atravessavam a pá (pior) e a lanterna. A travessa do punho em D passava pelo meio da palma. Corrigido em `gravekeeperShovel`: a pá desce 0,1 e a mão fica apoiada por cima do punho, com a ponta ainda no chão. Em `gravekeeperLantern`, a argola deitada virou alça em pé presa nos dedos, e o corpo da lanterna desceu 0,05. Vale também para a v1.
