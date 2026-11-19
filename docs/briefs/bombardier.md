# Brief do bombardier (M3-05)

Modelo: `tools/blender/bombardier.py` (base dos anões em `tools/blender/dwarf.py`, sobre `humanoid.py`). A bomba continua por código (`bombardierBomb` em `cast-enemies.ts`), na mão esquerda, com o pavio aceso.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/bombardier.png` | tudo: anão baixo e largo, gorro de aviador de couro com óculos de lente redonda na testa, barba e bigode laranja fartos, casaco azul-marinho, colete e luvas de couro marrom, cinto com bolsas, calça marrom e botas; um canhão de boca larga (cor de madeira clara) apoiado no ombro, apontando para cima e para trás; bomba preta de pavio aceso erguida na outra mão |
| Ficha da seção 7 do roadmap | "Anão de óculos, barba laranja, barril nas costas, bomba na mão"; marrom, laranja, preto; bípede baixo e largo |

## 2. Forma
- Anão: cabeça grande, tronco em barril, braços grossos e curtos, pernas curtas. Altura perto de 1,5 (antes da escala).
- Rosto: nariz grande e redondo, olhos pequenos sob a sobrancelha, barba laranja do queixo até o meio do peito, bigode caído.
- Gorro de couro com abas nas orelhas; óculos de aro de latão empurrados para a testa, com tira.
- Casaco azul-marinho com mangas até o punho; colete de couro marrom na frente; bandoleira do canhão cruzando o peito.
- Canhão nas costas sobre o ombro direito: tubo de madeira clara com cintas escuras e boca em sino.
- Bomba na mão esquerda, erguida na altura do ombro (o arremesso é com a esquerda, estilo `throwL`).

## 3. Cor
Pele `#d9905a` (sombra `#8a4a2a`). Barba `#d8641e` (sombra `#8a3010`). Couro do gorro `#7a4a2a`, latão `#c89a4a`, lente `#e8d8a0`. Casaco `#2e3448` (sombra `#161a26`). Couro `#6a4028` (sombra `#3a2216`). Calça `#5a3a24`, botas `#3a2418`. Canhão `#d9b27a` com cintas `#6a4a2a`. Bomba `#1c1c1c`, chama `#ffb02a`.

## 4. Animação
Estilo `throwL`: o braço esquerdo, com a bomba, sobe atrás e lança.

## 5. Checagem (o crítico recebe esta lista)
1. De cima, lê-se "anão bombardeiro": barba laranja, canhão no ombro, bomba preta acesa na mão.
2. Proporção de anão: largo e baixo, cabeça grande.
3. Contorno preto contínuo em todas as bordas.
4. Até cerca de 5 mil triângulos.

## 6. Crítico (2026-11-19, 4 rodadas)
- Rodada 1: canhão quase em pé (auréola na câmera do jogo), óculos sobre os olhos. Rodada 2: borda do gorro com contorno virou faixa preta sobre os olhos; canhão "chapéu". Rodada 3: canhão escuro sumia; bomba na frente do rosto. Rodada 4: só médios.
- Oscilou e ficou no meio: cor do canhão (creme, depois "trompa", depois latão) e o ângulo (diagonal lida como chapéu; em pé, como garrafa).
- Médios que restaram: pernas compridas para um anão, falta o avental de couro abaixo do cinto e a bolsa grande no quadril, barba estreita no alto. O arremesso (`throwL`) lê como soco; é animação comum, ficou de fora.
- ~5,7 mil triângulos.
