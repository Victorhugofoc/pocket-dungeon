# Brief do Seraph (M2-11)

Modelo: `tools/blender/seraph.py` (bípede de placa sobre `humanoid.py`, no molde do `shieldbearer.py`; não usa `robed.py`: tem pernas, e a forma `robed` cortaria as pernas e o andar). Espada no `foreR`, escudo no `foreL`, os dois modelados na orientação do mundo a partir da mão e levados ao antebraço por `to_fore`. Capa no osso `cape`, tabardo no `skirt`. Por código, só o brilho (se houver). O escudo também sai sozinho em `models/seraph_shield.json` (centro na origem, face para a frente), para o arremesso do ataque básico no `M5-09`.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/seraph.png` | tudo: paladino ereto de placa branca com debrum dourado; elmo fechado em bico, com fenda escura dos olhos e asinha dourada do lado; lenço azul no pescoço caindo sobre o peito; couraça abaulada; ombreiras grandes de duas lâminas; tabardo azul do cinto ao joelho; capa azul-clara até a panturrilha, aberta para trás; espada comprida erguida atrás do ombro na mão direita; escudo grande de cavaleiro (pipa curta) branco com borda e cruz douradas na mão esquerda, à frente do corpo; grevas e sabatões brancos com joelheira dourada. |
| Usuário (2026-11-26) | base de cavaleiro (`shieldbearer.py`) e as melhorias 1 a 5: orçamento da cabeça no elmo, capa em dois azuis com pregas, escudo reaproveitável, espada com sulco, regiões azul / branco / dourado. |

## 2. Medidas (sprite, 65 px de altura)
Elmo 13 px; ombros 25 px; quadril a 43% da altura; espada 36 px; escudo 22 por 32 px. Esqueleto igual ao da receita antiga: `hipY 0.95, headY 0.6, shoulderY 0.48, shoulderX 0.31, arm 0.34, hipX 0.14, thigh 0.44`, `bulk 1.1`. Pose: `lean 0.04`, `crouch 0.1`, `armOut 0.16`, `poseR [0.2, -1.8]` (espada erguida), `poseL [-0.45, -1.15]` (escudo à frente).

## 3. Cor e regiões (skins, M13-06)
Paleta: branco `#f1f4f9` (meio `#c2c9d6`, sombra `#8790a4`), dourado `#e8b93a` (escuro `#a87a1e`), azul `#4f8fdc` (escuro `#24488a`, claro da capa `#7ab0ec`), fenda `#1a2030`, lâmina `#e3eaf4`.
primary = azul (capa, tabardo, lenço); secondary = placa branca; accent = dourado (debruns, cruz e borda do escudo, guarda da espada, asas do elmo). Fixos: lâmina, fenda, couro do punho.

## 4. Checagem (o crítico recebe)
1. De cima, lê-se "paladino de placa branca e dourada, capa azul, espada erguida e escudo grande".
2. Elmo fechado com fenda nítida (sem rosto); asas do elmo leem como asas, não chifres.
3. O dourado marca bordas, sem virar armadura dourada; o branco domina.
4. Capa com volume e pregas, dois tons (fora claro, dentro escuro).
5. Até 8 mil triângulos, ao menos 35% na cabeça (no elmo).

## 5. Rodadas (crítico cego e usuário)
- **Rodada 1:** elmo redondo demais, asas pequenas, escudo com defeitos de acabamento (ponta rasgada, borda torcida). Usuário: elmo menos redondo, asas maiores.
- **Rodada 2:** elmo em tambor de laterais retas, asas de 3 penas maiores, escudo em anéis concêntricos. Usuário: ainda faltavam pixels na borda do escudo (tubo trocava de referência nas laterais em pé; `ref=(0, 1, 0)`).
- **Rodada 3 (pior item: médio):** bico mole trocado por quilha reta; lâmina inferior da ombreira dourada; capa celeste de barra irregular.
- **Acerto final com o usuário (2026-11-26):** a quina de cima à esquerda do escudo abriu em três voltas seguidas. Causa: borda como tubo aberto com o 1º ponto repetido (emenda com tangentes diferentes e ponta oca). Agora a borda é um anel fechado (`loop_tube` em `kit.py`, com meia-esquadria nas quinas) e o script confere que toda aresta da borda tem duas faces (`assert`). A borda vai sem contorno (o contorno dela vazava um risco preto na face vista de lado); a face entra por baixo da borda até perto da beira de fora e desenha o contorno do escudo, pintada de dourado fora do campo para nada creme espiar. Cruz cheia até a beira de dentro da borda, pontas afundadas sob ela. Quilha da viseira para acima do debrum. Capa com pregas mais fundas e vales em azul escuro.
- **Ficou de fora (consciente):** mais dourado no escudo e no peito (o crítico pede toda rodada, mas o sprite é dominado pelo branco); placas novas em braços e pernas (orçamento); vão entre o debrum e o elmo; escudo cobrindo o corpo na câmera do jogo (é a pose).
- Final: 7.992 triângulos, 37% na cabeça.
