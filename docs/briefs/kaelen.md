# Brief do Kaelen (M2-11)

Modelo: `tools/blender/kaelen.py` (bípede sobre `humanoid.py`, no molde do `seraph.py`; rosto pelo método da Frostine, em escala 1,75). **Sem espada** (usuário, 2026-11-26: é mago do raio; a espada nunca seria usada, já que o ataque é um raio à distância): mão direita aberta à frente e ao lado, palma para cima, e por código só o raio sobre a palma (núcleo claro e seis arcos finos em zigue-zague, em `cast-heroes.ts`), para piscar, crescer no preparo e soltar o disparo no `M5-09`. Capa no osso `cape`, abas do casaco no `skirt`.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/kaelen.png` | tudo: duelista esguio; cabelo branco revolto com uma mecha caindo sobre o olho direito; lenço vermelho-vinho no pescoço com a ponta no peito; casaco azul-marinho com debrum laranja-dourado e placas azul-claras nos ombros e no peito; capa azul-marinho de forro vermelho e borda dourada, caída do lado direito até a canela; calça cinza-chumbo, joelheira azul, bota alta azul-marinho; **lâmina ciano em pé diante do peito na mão direita**, mão esquerda solta ao lado do quadril. |
| Usuário (2026-11-26) | base bípede (`seraph.py`) e as melhorias 1 a 5: orçamento da cabeça no cabelo (sem "chifres"), placas azul-claras, lenço vermelho, lâmina reaproveitável (caiu junto com a espada), capa assimétrica. Depois da rodada 1: sem espada, raio na mão direita. |

A receita antiga (M2-03) tinha a lâmina para baixo na direita e uma faísca na esquerda. A primeira versão daqui seguiu o sprite (lâmina ciano em pé diante do peito), mas lia como "segurando uma vela" e sumia dentro do corpo na câmera do jogo; o usuário tirou a espada.

## 2. Medidas e pose
Esqueleto igual ao da receita: `hipY 0.95, headY 0.58, shoulderY 0.46, shoulderX 0.27, arm 0.33, hipX 0.12, thigh 0.44`, `bulk 0.92`. Pose: `lean 0.03`, `crouch 0.08`, `armOut 0.13`, `poseR [-0.25, -1.15, 0, -0.15]` (antebraço quase deitado, à frente e ao lado: a palma fica na altura da cintura, fora da silhueta do corpo), `poseL [0.08, -0.3]`.

## 3. Cor e regiões (skins, M13-06)
Paleta: azul-marinho `#2f4a8c` (escuro `#16214a`, claro `#4a6ab4`; mais claro que o sprite, `#263a70`, por causa da câmera do jogo), capa `#1c2a55`, placa azul-clara `#4f88c8` / `#8cc0ec`, dourado `#e39a34` (escuro `#9c5a1a`), vermelho `#8a2232` (escuro `#40101a`), calça `#5a5a66`, cabelo `#e6e0d6` (sombra lilás `#a49cb4`), pele `#f7c69c`, raio ciano `#7feaff` com núcleo `#f2fdff`.
primary = azul-marinho e placas azuis (casaco, capa por fora, botas); secondary = vermelho (lenço); accent = dourado. Fixos: pele, cabelo, calça, couro, raio.

## 4. Checagem (o crítico recebe)
1. De cima, lê-se "duelista de cabelo branco, casaco azul, capa de um lado e lâmina de raio".
2. Cabelo revolto em gomos macios, sem pontas espetadas para fora (os "chifres" do M2-03); a mecha cobre parte do olho direito, o outro olho aparece.
3. Lenço vermelho visível de cima; forro vermelho da capa visível de frente.
4. Raio na palma direita, fora da silhueta do corpo, visível de cima sem virar borrão.
5. Até 8 mil triângulos, ao menos 35% na cabeça.

## 5. Rodadas (crítico cego e usuário)
- **Antes do crítico:** mechas da nuca em cone espetadas para fora viraram chifres; trocadas por gomos alongados dentro da metaball do cabelo (a borda sai em ondas) e mechas chatas deitadas na calota, que só soltam a ponta. Franja em fileira regular virou "dentes"; ficou com três mechas largas de comprimentos diferentes. Placa do peito como bola achatada lia como emblema em "C"; virou casca pousada no casaco por raios, com debrum em anel fechado.
- **Rodada 1 (pior item: grave):** riscos pretos e faixa escura entre franja e testa; rosto facetado, nariz em "V" e boca sorrindo; lado de dentro da aba do casaco preto; ombreira entrando no rosto no golpe; ombreiras e joelheiras em bola; botas saturadas, calça lendo azul; pomo no meio do cabo; lenço grosso; capa curta; mão esquerda em toco. Corrigido: franja e mecha do olho sem contorno (`head@flat`); rosto com mais triângulos, nariz só sombra, boca reta, sobrancelha de ponta fina; aba por dentro em azul; ombreiras a 70% e achatadas; joelheira chata, bota mais escura, calça cinza; lenço fino com a gola aparecendo; capa até a panturrilha e mais aberta; punho com nós e polegar. Usuário: tirar a espada; raio na mão (acima).
- **Rodada 2 (pior item: grave):** riscos pretos na bochecha; manchas azuis na coxa; mecha cruzando o queixo; faixa dourada da frente da capa lendo como cajado; joelheiras em bola. Corrigido: costeletas recuadas e maçãs mais suaves (o corte maior do rosto piorou e voltou); abas do casaco mais largas (atravessavam a coxa); mecha do olho mais curta; borda da frente da capa sem dourado e capa mais escura nas dobras; sem joelheira, coxa `no_ao`; dedos abertos; mechas na nuca.
- **Rodada 3 (pior item: grave):** rosto e cabelo facetados ("papel amassado"), riscos pretos entre as mechas na têmpora, cabelo de costas como bola branca, placa do peito como remendo, mãos de boneco, corpo sumindo na câmera do jogo. O crítico também pediu a capa do outro lado; ela segue o sprite (lado direito, o da mão do raio) e ficou. Usuário: os três primeiros graves; capa e placa ok.
- **Acabamento final (sem nova rodada):** rosto e cabelo refeitos por `remesh` (novo em `kit.py`: malha por voxel de tamanho uniforme, com o voxel ajustado pela contagem até o alvo de triângulos), no lugar da redução por colapso, que deixava triângulos compridos lendo como planos; mechas dos lados e da nuca passaram para dentro da metaball do cabelo (`mlock`: base larga e ponta fina achatadas contra a calota) em vez de tubos soltos com contorno próprio, e a massa de base encolheu para os gomos fazerem a superfície; franja e mecha do olho com 8 gomos, seção mais redonda e ponta fina. Casaco mais claro que o sprite (`#2f4a8c`) para não sumir no chão escuro; raio maior. Mãos ficaram (custariam triângulos do cabelo). Aprovado pelo usuário.
- Final: 7.982 triângulos, 43% na cabeça. O raio pisca, cresce no preparo e sai no disparo no `M5-09`.
