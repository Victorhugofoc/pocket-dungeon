# Brief do void_reaver (M10-09)

Modelo: `tools/blender/void_reaver.py` (forma `djinn`: tronco, cabeça e braços como os bípedes, sem pernas). Espectro do vazio: corpo roxo-escuro magro e musculoso salpicado de estrelas, máscara de caveira de osso, cabelo preto longo esvoaçando, duas lâminas de osso em crescente nas mãos, cruzadas na frente do peito; da cintura para baixo, um feixe de tentáculos que se abre até o chão.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/void_reaver.png` | tudo. Espectro curvado para a frente, de ombros largos e cintura fina. Cabeça: máscara de caveira cor de osso, comprida, testa alta, órbitas fundas e escuras com um olho vermelho aceso (aro rosa), maçãs salientes, maxilar com dentes à mostra. Cabelo preto longo que sai do alto e de trás da cabeça e voa para trás em mechas pontudas. Braços longos e magros, cruzados na frente do peito, mãos de garras fechadas no cabo; cada mão segura uma lâmina de osso em crescente, longa (passa da cabeça), que sobe da mão para fora em X. Corpo roxo-azulado escuro com pontos claros (estrelas). Da cintura para baixo, tentáculos roxos que descem e se abrem em leque até o chão, mais largos que os ombros, pontas finas e enroladas. |
| `bosses.lua` | `void_reaver`: Riftwalker, Riftwalk, cor `{0.7, 0.35, 1.0}`; ataque `riftcross` (some e corta em cruz). |
| Ficha da seção 7 do roadmap | "Espectro de máscara com duas lâminas". |

## 2. Medidas (quadro 0, ~330 px de altura)
- Altura até o alto da cabeça ≈ 0,8 da altura total com as lâminas; as lâminas passam da cabeça.
- Ombros ≈ 0,45 da altura; cintura ≈ 1/3 dos ombros.
- Cabeça ≈ 1/6 da altura, à frente dos ombros (corpo curvado).
- Tentáculos ≈ 0,4 da altura, abertos até ≈ 1,3 × a largura dos ombros no chão.
- Lâminas ≈ 0,55 da altura cada, largura máxima ≈ 1/8 do comprimento.

## 3. Cor
Corpo `#1c1438` (sombra) / `#3a2c6a` / `#5c4a9a` (luz); estrelas `#e8e0ff` (acesas, pequenas); máscara `#f2ead8` / `#c4b498` / `#6a5a48` (fundo das órbitas `#0c0814`); olho `#ff2050` com aro `#ff7ab0` (aceso); cabelo `#120e1a` / `#2a2238` / `#463c5c` (brilho); lâminas `#f2e8c8` / `#c8b88e` / `#8a7a58`.

## 4. Animação
Forma `djinn` (flutua, sem passada); cabelo no osso `cape` (balança e arrasta), tentáculos no osso `skirt` (arrastam ao andar). Estilo `cast` com `castOpen` 0,5: no golpe os braços cruzados descruzam e abrem para fora como tesoura. Repouso com os braços cruzados na frente do peito, como no sprite.

## 5. Checagem (o crítico recebe esta lista)
1. De cima, lê-se "espectro com máscara de caveira e duas foices de osso", não "esqueleto" nem "mago".
2. Máscara cor de osso com órbitas escuras e olho vermelho aceso, visível na câmera do jogo.
3. Duas lâminas em crescente, grossas o bastante para não virarem risco, saindo das mãos cruzadas em X.
4. Cabelo preto longo voando para trás em mechas.
5. Corpo roxo-escuro com estrelas claras, sem pernas; tentáculos abrindo até o chão.
6. Até cerca de 24 mil triângulos.

## 6. Crítico (2026-11-24)
6 rodadas, de grave para médio. Corrigido: dois olhos rosa e boca em "O" (cara de boneca) viraram um olho só, grande, vermelho, no meio da máscara, numa órbita escura funda; touca preta sobre a testa saiu (o couro cabeludo fica só atrás); os tentáculos de polvo cilíndricos até o chão viraram tiras achatadas de ponta fina, em três camadas, que descem e abrem em leque rente ao chão, escurecendo até quase preto, sem tocar o chão; azul royal virou violeta mais escuro e fosco (`rough` 0,9); lâminas com cabo e guarda viraram lâminas que nascem do punho, com um calo de osso na base, sem oclusão (as manchas pretas no meio eram a oclusão), em osso bege diferente do branco da máscara, mais longas (passam da cabeça) e com a ponta em gancho; o X cruzava no rosto: antebraços mais erguidos e giro maior no ombro, para os braços cruzarem de fato no peito; máscara em ovo ganhou bochechas cavadas, rachadura, maxilar e queixo em focinho; os dentes ficavam abaixo da máscara como gola e o triângulo do nariz lia como segunda boca: dentes e fenda subiram para a borda de baixo da máscara e o nariz saiu; no golpe a lâmina passava pela cabeça (estilo `cast` com os braços abaixados) e depois dava a volta na cintura: `Builder.castOpen` descruza os braços no golpe. Oscilaram e ficaram no meio: tronco magro ↔ musculoso, cintura fina ↔ larga, tentáculos abertos ↔ caídos, lâminas finas ↔ grossas, olho no meio ↔ de lado (ficou no meio), cabelo para um lado ↔ para os dois (ficou nos dois), saturação. Médios restantes: tronco curto para a saia, brilho de plástico, cabelo ralo, máscara redonda, cabeça ereta sem pescoço, juntas do braço à mostra, braço esquerdo baixo no golpe, mancha roxa única na câmera do jogo. ~26 mil triângulos.
