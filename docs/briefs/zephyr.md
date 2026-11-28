# Brief do Zephyr (M2-11)

Modelo: `tools/blender/zephyr.py` (bípede sobre `humanoid.py`, no molde do `kaelen.py`; rosto pelo método da Frostine, em escala 1,75). **Dois revólveres na mão** (usuário, 2026-11-26: os dois têm que ser usados nas animações): o ataque básico usa o estilo `dual` (`animate.ts`), que alterna o braço a cada tiro, e o tiro sai do lado da mão que disparou (`HeroDef.gunSide` em `data/heroes.ts`). Poncho no `torso` (painel da frente e de trás, aberto dos lados para os braços), parte de trás comprida no `cape`. Lenço de bandido no rosto (não barba) e paleta A (terracota e turquesa), as duas pelo usuário em 2026-11-27.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/zephyr.png` | tudo: pistoleiro velho; chapéu de aba larga malva com fita ciano; barba branca comprida até o peito e bigode caído; rosto curtido na sombra da aba; poncho verde-azulado em bico na frente, com faixa ciano e zigue-zague creme, comprido atrás (até a canela); mangas de couro avermelhado; cinturão; calça azul-chumbo; bota marrom de cano alto; revólver cinza de cano longo na direita, esticada à frente; **segundo revólver na esquerda, apontado para baixo**. |
| Usuário (2026-11-26 a 28) | base bípede (`kaelen.py`) e as melhorias 1 a 5: revólver na esquerda (e os dois usados na animação), cabeça gasta em rosto e chapéu, poncho com a faixa pintada, regiões para skins. Depois: o branco do sprite é **lenço tampando a boca**, não barba; o design pode sair do original, mas com confirmação dele antes; paleta A e lenço curto e colorido (2026-11-27); poncho aberto para os braços e caindo como pano (2026-11-28). |

## 2. Medidas e pose
Esqueleto igual ao da receita: `hipY 0.95, headY 0.58, shoulderY 0.46, shoulderX 0.29, arm 0.33, hipX 0.14, thigh 0.44`, `bulk 1`. Pose: `lean 0.02`, `crouch 0.1`, `armOut 0.12`, `poseR [-1.4, -0.12]` (braço direito esticado à frente), `poseL [0.12, -0.7]` (esquerda baixa, cano para a frente e para baixo). Revólveres modelados no repouso do antebraço: cano ao longo do antebraço, além da mão; coronha para o lado de trás (fica para baixo com o braço erguido).

## 3. Cor e regiões (skins, M13-06)
Paleta A (usuário, 2026-11-27; a do sprite, verde-azulada, sumia no chão verde e não tinha cor quente): poncho terracota `#b4542e` (escuro `#6e2c18`, claro `#d47a4a`), faixa dourada `#f6d47a`, zigue-zague turquesa, barra `#5a2414`; lenço e fita do chapéu turquesa `#3aa6a0` (escuro `#1d6664`, barra `#8ad8cc`); chapéu marrom-escuro `#5a4030`; mangas de couro caramelo `#a8703e` (o couro claro lia como braço nu); luvas `#4a2e1c`; colete `#6e3c24`; calça `#3c4a6e`; botas `#5a3420`; pele `#d9a680`; cabelo e sobrancelha grisalhos `#cfcfcc` (o branco puro na nuca lia como caveira); metal `#b8c2d0`; dourado `#e3a83a`.
primary = poncho (frente e trás); secondary = chapéu; accent = fita do chapéu, lenço e fivela. Fixos: pele, cabelo, couro, calça, botas, revólveres.

## 4. Checagem (o crítico recebe)
1. De cima, lê-se "pistoleiro de chapéu largo, lenço de bandido, poncho terracota com faixa e dois revólveres".
2. Lenço liso sobre nariz e boca, sem vinco duro; olhos visíveis sob a aba; uma sobrancelha só.
3. Aba do chapéu fechada (borda por `loop_tube`), sem buraco nem emenda; copa com vinco.
4. Os dois revólveres legíveis de cima, cano para fora da silhueta na mão direita.
5. Até 8 mil triângulos, ao menos 35% na cabeça.

## 5. Rodadas (crítico cego e usuário)
- **Rodada 1:** grave: chapéu lilás (lia roxo), poncho inflado como boia, parte de trás como prancha, olhos escondidos pela aba. Corrigido: chapéu taupe, poncho caindo, aba erguida na frente.
- **Rodada 2:** grave: riscos pretos no bigode e cunha na bochecha. O usuário apontou que o branco do sprite é **lenço**, não barba: barba e bigode viraram lenço de bandido (casca cortada por `bisect_plane`, bainha por `loop_tube` na borda do corte), poncho de uma peça só (A).
- **Rodada 3 (última):** grave: faixa de pele com um "^" entre a copa e a aba, sobrancelha dupla; médio: nuca de caveira, copa escura, ponta do zigue-zague, pano de trás solto no quadril, vinco no lenço, concho solto.
- **Acabamento com o usuário (sem nova rodada):** itens 1 a 5 (copa desce até dentro da aba, sem ruga nem pálpebra, nó menor e nuca de cabelo, copa sem sombra assada e sem concho, zigue-zague rente, pano de trás rente e mais grosso); o usuário não gostou do lenço branco nem da paleta: **lenço curto turquesa e paleta A**. Depois: o braço atravessava o poncho e a frente lia como barriga, então o poncho ganhou **aberturas para os braços** (`p_open`: painel em bico na frente e atrás, curto sobre o ombro), queda reta a partir do ombro, frente achatada, dobras que fundam para baixo e barra ondulada; colete mais raso. A faixa do pano de trás vazava em manchas: o `tint` usava o ângulo geométrico numa elipse (rx ≠ ry), agora usa o do parâmetro.
- Final: 7.906 triângulos, 45% na cabeça. Fica para o `M5-09`: recuo do tiro e clarão na boca do cano (os dois revólveres já alternam no estilo `dual`).
