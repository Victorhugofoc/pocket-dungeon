# Brief do mirage_djinn (M10-03)

Modelo: `tools/blender/mirage_djinn.py`. Forma nova `djinn` em `build.ts`/`animate.ts`: tronco, cabeça e braços como os bípedes (pivôs de `Rig`, iguais a `b.dims` da receita em `cast-bosses.ts`), sem pernas; a cauda de fumaça é a cadeia `tail` → `tail4` com os pontos de `TAIL` (repetidos na receita em `b.joints`), um tubo só cortado nos anéis das juntas. As cópias do Mirage (`mirage_illusion`) usam este mesmo corpo a 55% de opacidade (`EnemyDef.look`, `fadeRig`).

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/mirage_djinn.png` | tudo. Gênio musculoso de pele turquesa flutuando sobre uma cauda de fumaça em S que passa de turquesa (na cintura) a roxo, magenta e coral na ponta, em fiapos. Colete roxo aberto de borda rosa, peito nu; faixa dourada larga na cintura; braceletes de ouro grossos; mãos abertas em gesto teatral, uma erguida. Turbante creme com rubi em aro de ouro e pena vermelho-laranja; barba preta pontuda, bigode, sobrancelhas franzidas, orelhas pontudas com argola dourada. |
| `bosses.lua` | `mirage_djinn`: Illusionist, Mirage, cor `{1.0, 0.55, 0.9}`; mantém 190 px; só na Hard. |

## 2. Medidas (antes da escala da receita, 2,3)
- Quadril a 0,95, ombros a 0,45 do centro, braço 0,34 + antebraço e mão 0,34; cabeça com turbante até ~1,95.
- Cauda de ~1,3 de comprimento, larga (raio 0,24) na cintura e fina na ponta, abrindo para o lado e para trás; a ponta fica no ar.

## 3. Cor
Pele `#34b8b4` (sombra `#16686e`, claro `#86eedd`); colete `#55276e`, borda `#e8508a`; ouro `#e2a63a`; turbante `#f0d49a`; rubi `#8a0a1e`–`#e0283c`; barba `#16121c`; fumaça `#34b8b4` → `#6a3aa0` → `#d03a78` → `#ff6a4a` → `#ffb070`.

## 4. Animação
Flutua subindo e descendo devagar; a cauda ondula gomo a gomo (a onda desce da cintura à ponta) e arrasta para trás ao andar. Estilo `cast` nos braços. Mirage Dash: some (opacidade 0,15) e reaparece.

## 5. Checagem
1. Na câmera do jogo lê-se "gênio de turbante flutuando numa cauda de fumaça", não "homem de calça chutando".
2. Rosto visível sob o turbante: nariz, barba abaixo da boca, sobrancelhas.
3. Colete aberto, peito nu; braceletes no antebraço, nunca na mão.
4. A cauda é a maior massa da silhueta e termina em fiapos, não em bola nem garra.

## 6. Crítico (2026-11-23)
6 rodadas. Corrigido: cauda curta e grossa terminando em bulbo ("homem ajoelhado de calça") virou funil largo na cintura, em S longo que desce, varre para o lado e sobe atrás do corpo até a altura do cinto, com quatro línguas de chama acesas na ponta; emendas da cauda (pedaços sobrepostos brigando) viraram um tubo só cortado nos anéis; colete pintado na pele (borrado, "regata fechada") virou casca cortada com borda limpa, sem contorno, cordão rosa pousado na borda, caindo quase plano do ombro; barba que cobria a boca ("máscara de ladrão") começa abaixo da boca, em cunha; rosto com nariz adunco, sobrancelha erguida, sorriso torto, olhos claros sem bloom, orelhas pontudas para fora do turbante; braceletes escondidos no antebraço viraram punhos largos de ouro vivo, perto do cotovelo (antes passavam da mão); turbante cinza em cone virou voltas baixas creme-douradas com cúpula de ouro, cabeça 20% maior; rubi vermelho escuro em aro de ouro; faixa dourada larga com fivela turquesa, sem pendente; pano roxo só na frente (o anel em volta lia como fralda); pose do sprite (um braço acima do turbante, o outro baixo). Oscilaram e ficaram no meio: abertura do colete (largo ↔ estreito), cor e brilho da ponta da cauda (laranja aceso ↔ magenta sem amarelo), largura da pena, forma do turbante (espiral ↔ dobras cruzadas). Médios restantes: a pena ainda lê como lâmina reta; pose de ataque pouco expressiva (estilo `cast` genérico); falta o gesto de mudra numa das mãos; o colete visto de trás não tem a borda rosa. ~17 mil triângulos.
