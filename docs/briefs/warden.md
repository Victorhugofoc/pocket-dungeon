# Brief do warden (M9-04)

Modelo: `tools/blender/warden.py` (bípede de `humanoid.py`). Cada parte é uma pilha de pedras talhadas (bloco chanfrado com os vértices sacudidos, faces chapadas), presas ao osso de cada parte.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/warden.png` e a folha (`dungeon-idle/assets/enemies/elite/warden_sheet.png`) | tudo: golem de pedras empilhadas, cinza-esverdeado com musgo no alto das pedras; ombros enormes, cabeça pequena e quadrada afundada entre eles, levemente curvado; braços longos e grossos, punhos grandes quase no chão; pernas curtas e largas; runas douradas acesas no peito e no antebraço; olhos pequenos. |
| Ficha da seção 7 do roadmap | "Golem de pedras empilhadas com runas"; cinza, musgo, dourado; bípede muito largo |

## 2. Medidas (quadro 0)
- Largura dos ombros ≈ 1,6 × a do quadril; a cabeça ≈ 1/3 da largura dos ombros, com o topo pouco acima deles.
- Punhos ≈ 1,5 × a cabeça, na altura dos joelhos.
- Pernas ≈ 1/3 da altura.

## 3. Cor
Pedra `#6e6e5e` / `#9a9a84` (sombra `#34342c`), musgo `#5a6a2e` / `#7a8a3c` no alto das pedras. Runas `#ffc84a` acesas (sem contorno). Olhos `#ffd870` acesos.

## 4. Animação
Estilo `swing` (golpe do punho). `lean` 0,25, `crouch` baixo. Pose de repouso: braços pendendo à frente do corpo, cotovelos pouco dobrados, punhos na altura do joelho. No chão, a aura azul tracejada de 7 m (`game/ward.ts`).

## 5. Checagem (o crítico recebe esta lista)
1. De cima, lê-se "golem de pedra, largo, com runas douradas".
2. Pedras lidas como blocos separados, com frestas, e não como uma superfície lisa.
3. Cabeça pequena afundada entre os ombros.
4. Punhos grandes, perto do chão.
5. Runas visíveis na câmera do jogo.
6. Até cerca de 7 mil triângulos.

## 6. Crítico (2026-11-23)
5 rodadas. Corrigido: runa do peito que lia "XD" sobre um sorriso (virou rachadura estreita e torta, alta e de lado; depois de outra que formava um sorriso largo sob a cabeça), pedras em lascas de papel amassado (o sacudido era dividido pela menor medida; agora é no espaço do cubo), corpo fino de perfil (pedras mais fundas e corcova nas costas), cabeça em "viseira de robô" (rocha irregular com testa saliente sobreposta, olhos maiores), cabeça afundada atrás da corcova (subiu), braços curtos com punhos pequenos (antebraço que engrossa até o punho, o maior bloco, à frente das coxas com cotovelo dobrado), runas do antebraço como fresta de luz na lateral e depois como "ϟ" (veios ramificados na frente do antebraço e no dorso do punho), peito e faces de baixo pretos (sombra mínima mais clara, oclusão 0,35 e o peito mais claro, porque fica na sombra da cabeça), simetria (ombro esquerdo maior, braço direito mais à frente), musgo saturado. Oscilaram e ficaram: tamanho e altura dos braços (curtos → até o chão), cor das runas (âmbar forte ↔ ocre apagado), tom das pernas (menos azul ↔ mais roxo). Médios restantes: proporção baixa e larga ("bloco de brinquedo"), pernas curtas, peito numa laje só, silhueta de cima pouco vertical. ~2 mil triângulos (faces chapadas).
