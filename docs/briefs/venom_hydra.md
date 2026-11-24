# Brief da venom_hydra (M10-04)

Modelo: `tools/blender/venom_hydra.py`. Forma nova `hydra` em `build.ts`/`animate.ts`: corpo no `hips`; cauda em cadeia `tail` → `tail2` … `tail5`; três pescoços em cadeia, cada um com dois gomos e a cabeça (`neckL` → `neckL2` → `headL`, `neckC` → `neckC2` → `head`, `neckR` → `neckR2` → `headR`); 4 patas por cinemática inversa com as malhas `legfemur` e `legtibia` (como o Deathstalker). Pontos em `PIV3` no script, repetidos na receita em `b.joints`.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/venom_hydra.png` e a folha inteira (`dungeon-idle/assets/enemies/bosses/venom_hydra_sheet.png`) | tudo. Corpo de crocodilo deitado, verde, barriga creme em faixas; fileiras de espinhos creme do dorso até a ponta da cauda; cauda longa que faz curva para o lado; 4 patas curtas abertas para o lado, com garras creme. Do peito saem 3 pescoços longos, verdes com a frente creme, em S; cabeças de réptil de focinho comprido, dentes à mostra, olhos laranja acesos, crista de espinhos creme atrás da cabeça. Linha 3 (ataque): os pescoços recuam e as cabeças dão o bote para a frente de boca aberta. Linha 6 (morte): tomba de costas. |
| `bosses.lua` | `venom_hydra`: Broodmother, Venom Bloom, cor `{0.55, 0.9, 0.3}`; mantém 170 px. |

## 2. Medidas (antes da escala da receita)
- Corpo de ~0,8 de comprimento e ~0,45 de largura, dorso a ~0,48 do chão; cauda de ~0,9 que curva para o lado; pescoço do meio com a cabeça a ~1,05 do chão, os dos lados a ~0,8, abertos para os lados para lerem de cima; cabeça de ~0,32 do crânio à ponta do focinho.

## 3. Cor
Verde `#3f7a2a` (sombra `#173a14`, claro `#8cc04a`); creme `#e0d690` (sombra `#a89a54`); espinhos e garras `#ecd88a`; boca `#6a1414`; dentes `#f6f0d8`; olhos `#ff8a1a` (acesos).

## 4. Animação
Parado: corpo respira, cauda e pescoços balançam com atraso entre eles. Andar: patas pela cinemática inversa, o corpo ondula de lado. Preparo: os pescoços recuam e as cabeças sobem. Golpe: bote das 3 cabeças para a frente, uma depois da outra. Morte: vira de costas, pescoços caem.

## 5. Checagem
1. Na câmera do jogo lê-se "hidra de três cabeças", não "dragão" nem "crocodilo com canos".
2. Três cabeças separadas e visíveis de cima.
3. Verde domina; creme na barriga, na frente dos pescoços e nos espinhos.
4. Patas apoiadas no chão, sem peças soltas.

## 6. Crítico e usuário (2026-11-23 e 24)
2 rodadas do crítico. Corrigido: patas de mesa viraram patas abertas de crocodilo com pé de garras e corpo rente ao chão; bocas fechadas no golpe viraram mandíbulas articuladas (`jaw`, `jawL`, `jawR`); anéis pretos nas emendas dos pescoços e da cauda (o contorno de 0,02 passava da pele nas juntas) sumiram com pescoço e cauda em malha única (dobram na base e na cabeça); cauda longa que enrola para o lado. Depois o usuário achou a cabeça "crocodilo com dinossauro" e mandou referências: refeita como serpente-dragão (crânio chato em cunha, chifres para trás, sobrancelha em V, olhos grandes saltados e acesos com órbita escura, calombos pontudos no alto, boca aberta em repouso com presas curvas e língua bifurcada) e espinhos das costas maiores. Cores do sprite mantidas. Aprovada pelo usuário em 2026-11-24. ~18 mil triângulos.
