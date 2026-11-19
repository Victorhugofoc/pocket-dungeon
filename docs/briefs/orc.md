# Brief do orc (M3-01)

O "prompt" de modelagem do orc. Antes de cada rodada, ler; antes de mostrar ao usuário, conferir a checagem da seção 6. O que está aqui vale mais que o gosto do crítico cego.

## 1. Fontes e o que cada uma manda

| Fonte | Manda em | Não manda em |
|---|---|---|
| `docs/ref/orc-3d-a.webp` (orc 3D, sem arma) | proporção do corpo (V, peito enorme, cintura fina, braços gigantes), postura ereta, ombreira de placas de osso com miolo vermelho e fila de chifres, coque | arma, cor da pele |
| `docs/ref/orc-3d-b.png` (orc verde-lima) | cor da pele, cinto largo com fivela redonda, tanga marrom, braçadeiras, faixas na canela, tiracolo | pose das lâminas |
| `docs/ref/orc.png` (sprite do Dungeon Reign) | identidade: machado de duas lâminas na mão direita, ombreira só no ombro esquerdo, tiracolo cruzado, botas/pés escuros | proporção (pixel art achata) |
| `docs/ref/orc-v1-feedback.png` (1ª versão, à esquerda) | **o rosto**: o usuário gostou mais deste rosto que dos seguintes | corpo, ombreira e calça (recusados) |

## 2. Silhueta e proporção (medidas no modelo, unidade = altura da cabeça, ~0,32)
- Altura total: cerca de 6,5 cabeças. A cabeça é **pequena** para o corpo; não aumentar.
- Ombros (de deltoide a deltoide): 3,2 cabeças. Cintura: 1,5. Ombro ÷ cintura ≥ 2.
- Braço caído chega ao meio da coxa; antebraço e punho mais grossos que a canela.
- Postura ereta: inclinação do tronco ≤ 0,15 rad, sem empinar o quadril. De lado, a nádega não passa da linha das costas.
- Na câmera do jogo, maior que o herói: escala 1,3.

## 3. Rosto (manter o da 1ª versão; só estes ajustes)
- Massa: crânio baixo e estreito, mandíbula mais larga que o crânio, queixo prognata, arcada pesada em V fechado (ponta de dentro mais baixa = carranca), nariz largo e chato.
- Olhos: fendas laranja acesas, fundas sob a arcada, inclinadas para dentro. **Nenhuma peça pode cobrir os olhos de frente nem de 3/4.**
- Presas: duas, grossas e retas, subindo da mandíbula por fora do lábio. A ponta fica abaixo da linha dos olhos e por fora deles (x da ponta ≥ x do olho + 0,03).
- Boca: fenda larga e reta com fileira de dentes de baixo; nada de "sorriso" nem de cantos que pareçam lábio humano.
- Sem vinco pintado ou cavado entre as sobrancelhas (deixou o rosto sujo); orelhas pequenas e pontudas para trás.
- Coque: tufo pequeno no alto da nuca; visto de frente, não pode parecer gorro nem chifre.

## 4. Equipamento
- **Ombreira** (aprovada na revisão 6): quatro placas grossas cor de osso, miolo vermelho, rebites, forro de couro e fila de chifres curvos. Só no ombro esquerdo; acompanha o deltoide, não flutua.
- Tiracolo do ombro esquerdo à cintura direita, com argola. Cinto largo, fivela redonda de ferro. Tanga em tiras de couro marrom. Braçadeiras e faixas nas canelas. Pés descalços e escuros.
- **Machado**, uma mão (a direita), duas lâminas em meia-lua:
  - Parado e andando, o cabo aponta para a frente e para baixo (30° a 40° abaixo da horizontal), com a cabeça à frente da perna e as lâminas abertas para os lados, visíveis de cima.
  - **A peça mais baixa do machado fica sempre ≥ 0,08 acima do chão**, em Idle, Walk e em todas as fases do Attack. O chão não pode cortar a lâmina.
  - No golpe, o machado sobe acima da cabeça e desce na frente.

## 5. Cor
Pele verde-lima `#76a234`, sombra `#3c4c16`, luz `#a6c85c`. Osso `#eadcb8`. Vermelho da ombreira `#a82a1c`. Couro marrom `#5a3418`. Ferro `#63666c`. Olhos laranja acesos.

## 6. Checagem antes de mostrar (o crítico recebe esta lista)
1. De frente e de 3/4, os dois olhos aparecem inteiros.
2. Em todas as capturas, o machado não toca o chão.
3. De lado, ombro ÷ cintura ≥ 2, e o quadril não fica empinado.
4. O rosto é reconhecível como o da 1ª versão: presas retas, arcada em V, mandíbula larga.
5. Na câmera do jogo, dá para ler: pele verde, ombreira de osso, machado de duas lâminas.
6. Até 9 mil triângulos (o orc é um inimigo forte; os inimigos comuns ficam em 3 mil).

## 7. Já recusado pelo usuário (não repetir)
- Presa cobrindo o olho (rev. 3/4). Rosto de esgar com cantos caídos (rev. 4 a 6): "até o primeiro era melhor".
- Machado em guarda diagonal com as duas mãos: "posição muito estranha" (rev. 4/5). Machado caído na vertical relando no chão (rev. 6).
- Ombreira de lâminas lisas cinza: "amigável" (rev. 1 a 4).
- Corpo curvado com quadril para trás: "bundudo, zero medonho" (rev. 5).
