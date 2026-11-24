# Brief do rimefang_wyrm (M10-06)

Modelo: `tools/blender/rimefang_wyrm.py`. Usa a forma `hydra` de `build.ts`/`animate.ts` (quadrúpede de pescoço em cadeia) com um pescoço só (`neckC` → `neckC2` → `head` → `jaw`) e as asas nos ossos `wingL`/`wingR`, presos ao `hips` no ombro; cauda em cadeia `tail` → `tail5` (malha única no `tail`); 4 patas por cinemática inversa com as malhas `legfemur` e `legtibia`. Pontos em `PIV3` no script, repetidos na receita em `b.joints`.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/rimefang_wyrm.png` e a folha (`dungeon-idle/assets/enemies/bosses/rimefang_wyrm_sheet.png`) | tudo. Dragão de gelo de pé nas 4 patas, peito erguido; corpo azul-ardósia com escamas em pontos escuros e brilho azul-claro em cima; placas de barriga creme-esverdeado em faixas do queixo, pela frente do pescoço, até a barriga e por baixo da cauda; pescoço longo em S que sobe bem acima do corpo; cabeça de dragão de focinho comprido, boca aberta com dentes brancos, dois pares de chifres longos para trás e para cima, espinhos atrás da mandíbula; asas grandes de morcego meio erguidas para cima e para trás, osso escuro e membrana azul mais clara na ponta; fileira de cristais de gelo azul-claro do pescoço ao fim da cauda, cauda longa que faz curva e sobe na ponta com um tufo de cristais; patas grossas com a parte de baixo azul-marinho escura e garras brancas. |
| `bosses.lua` | `rimefang_wyrm`: tipo Wyrm, Glacial Wake, cor `{0.55, 0.85, 1.0}`; mantém 170 px; sopro em cone, chuva de estalactites, mergulho. |

## 2. Medidas (antes da escala da receita)
- Corpo de ~0,9 de comprimento, peito a ~0,55 do chão e mais alto que a anca (~0,45); patas retas, de pé (não abertas como a hidra).
- Pescoço sobe do peito até a cabeça a ~1,2 do chão, um pouco à frente do peito; cabeça de ~0,4 do crânio à ponta do focinho.
- Asas com o ombro no alto das costas, abertas ~35° acima da horizontal e varridas para trás; cada uma com ~0,8 de envergadura (leem de cima sem cobrir o corpo inteiro).
- Cauda de ~1,1 que curva para o lado e levanta a ponta.

## 3. Cor
Corpo `#4f6a8c` (sombra `#1e2a44`, claro `#8fb0cc`); barriga `#d4e0cc` (sombra `#93a89c`); cristais `#c8f0ff` (sombra `#5a8fb0`); osso da asa `#2c3e5c`; membrana `#8fb4d4` na ponta e `#46668e` junto ao corpo; parte de baixo das patas `#1c2440`; garras e dentes `#eef4f4`; boca `#6a1a22`; olhos `#bff4ff` (acesos).

## 4. Animação
Parado: corpo respira, asas batem devagar, cauda e pescoço balançam. Andar: patas pela cinemática inversa. Preparo do sopro: o pescoço recua e a cabeça sobe, asas se abrem. Golpe: a cabeça avança de boca escancarada. Mergulho: sobe batendo as asas (corpo apagado pelo jogo) e cai. Morte: tomba de lado, asas caem.

## 5. Checagem
1. Na câmera do jogo lê-se "dragão de gelo com asas", não "hidra" nem "morcego".
2. Asas visíveis de cima, com volume (não chapa) e borda em arcos.
3. Azul-ardósia domina; creme na barriga e na frente do pescoço; cristais claros no dorso.
4. Patas apoiadas no chão, sem peças soltas.

## 6. Crítico (2026-11-24)
6 rodadas do crítico; a maior gravidade ficou em "grave" até o fim, mas a partir da 3ª quase tudo virava entre rodadas e ficou no meio-termo (regra de `docs/critic.md`): pescoço (curto e grosso → longo → curto), tronco (enxuto → maciço), pernas (finas → grossas → curtas), asas (deitar para ler de cima → erguer como no sprite → deitar), quantidade de chifres. Corrigido de vez: pés (as garras apontavam para trás debaixo da pata: o -y local da tíbia é a frente no jogo; agora dedos deitados no chão com a garra na ponta, pé sob o ombro e um pouco à frente para os dedos olharem para a frente), placas da barriga (o pescoço tinha anéis espaçados demais para a cor por vértice; 64 anéis e ~10 faixas), chifres varridos para trás e facetados em azul-gelo, olho em fenda acesa sob a aresta da sobrancelha, boca entreaberta em repouso com poucas presas (`animate.ts`: `B.wingL` deixa a boca da forma `hydra` em 0,16 em vez de 0,42), asa em leque a partir do punho (o polígono côncavo triangulava cruzado), braço da asa claro e afunilado, cor ardósia mais clara, escala 2,8. Sobrou para o usuário julgar: rosto de frente ainda arredondado, pernas roliças, asas de perfil confusas, chefe pequeno na câmera do jogo. ~12 mil triângulos.

## 7. Usuário (2026-11-24)
"Quase perfeito", mas as garras apontavam para trás e ele parecia flutuar. Causa: os dedos estavam presos na tíbia, que gira com a dobra do joelho e com o giro do encaixe (eu tinha lido uma captura errado e virado os dedos para trás); dedos para a frente afundavam no chão e a pata ficava na ponta. Agora o pé é peça própria (`legfoot`, `LegSpec.foot`): fica na ponta da tíbia e `stepLegs` desfaz as dobras e o giro (`IkLeg.paw`), então pisa deitado e de frente para o corpo em qualquer pose. A hidra e o escorpião não usam.
