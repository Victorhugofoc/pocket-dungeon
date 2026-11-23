# Brief do leaper (M9-05)

Modelo: `tools/blender/leaper.py`, forma nova `toad` (corpo no osso `hips`, cabeça e 4 patas rígidas presas a ele; pivôs em `kit.ts` `Form`). Malhas por metaball.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/leaper.png` | tudo: sapo-chifrudo sentado, dourado-mostarda com manchas marrons em anel no dorso, barriga e papo creme; cabeça larga e chata quase fundida ao corpo, olhos sob pálpebras pesadas, cara emburrada com a boca larga e reta; dois chifres grossos curvos para trás atrás dos olhos; patas da frente grossas com dedos longos abertos, de trás dobradas ao lado do corpo com o pé largo para fora. |
| `enemies.lua` (`drawScale` 0,72, D-491) | desenhado do tamanho do Orc |

## 2. Medidas
- Altura ≈ largura; a frente bem mais alta que o traseiro (sentado).
- Cabeça ≈ 3/4 da largura do corpo; chifres ≈ 1/3 da altura da cabeça acima dela.

## 3. Cor
Dourado `#d8901a` (sombra `#7a3c0a`, luz `#f6c440`); creme `#fce2b8` / `#d8a46c`; manchas `#8a4a10` com borda `#4a2208`; olhos `#ffd84a` acesos, pupila em fenda.

## 4. Animação
Forma `toad` (`animate.ts`): anda aos pulinhos (o corpo sobe, a pata de trás empurra), no preparo do salto se agacha e achata, no voo estica as patas de trás e levanta o focinho; mordida (`bite`) com a cabeça. O arco do salto (até 1,6 m) é a altura do `root`, dada pelo `Enemy.hop`.

## 5. Checagem (o crítico recebe esta lista)
1. De cima, lê-se "sapo dourado de chifres, manchado".
2. Cara emburrada, não de mascote.
3. Chifres grossos, fundidos ao crânio, sem artefato no contorno.
4. Pés de trás visíveis para fora do corpo.
5. Até cerca de 15 mil triângulos.

## 6. Crítico (2026-11-23)
6 rodadas. Corrigido: cara de mascote (pálpebras pesadas caídas para dentro na metaball da cabeça, boca reta caindo nos cantos, pintada na pele com lábio claro; o tubo da boca flutuava e virava barra cinza), chifres em folha com farpas pretas na ponta (cone por metaball, base grossa na crista, curvo para trás e para fora, ponta escura), cristas coladas com contorno cortando a testa (na mesma metaball), manchas borradas e depois serrilhadas (pintura por vértice não dá borda limpa: viraram verrugas em relevo com anel castanho e miolo laranja, `warts`), cor limão (mostarda mais quente), corpo em ovo com garupa alta (tronco erguido na frente, ancas baixas), patas da frente finas (cotovelo para fora), dedos em pérola branca (na cor do corpo), pé traseiro sumido (mais largo e para fora), mordida igual ao repouso (bote: corpo avança, patas de trás empurram, cabeça desce), pele de vinil (`rough` 0,85). Oscilaram e ficaram: altura e posição dos chifres (longos → curtos → longos), dedos (leque comprido ↔ curtos), grossura das patas da frente, contraste das verrugas. Médios restantes: postura menos erguida que a do sprite, cabeça um pouco pequena de lado, barriga esverdeada sob a luz do chão, olhos pequenos sob as pálpebras. ~14 mil triângulos.
