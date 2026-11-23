# Brief do hexer (M9-02)

Modelo: `tools/blender/hexer.py` (base de manto em `tools/blender/robed.py`, ajudas do `summoner.py`). Forma `robed`: flutua; o manto fica no osso `skirt`. O cajado fica na mão esquerda, em pé no mundo (osso `foreL`); a lanterna-gaiola pende da mão direita (osso `foreR`). O sprite é ambíguo nos dois (cajado com correia, amuleto em cordão); o crítico leu o cajado nas costas como peça solta e o cordão de contas como rosário, por isso a troca.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/hexer.png` e a folha (`dungeon-idle/assets/enemies/ranged/hexer_sheet.png`) | tudo: velha bruxa muito curvada, cabeça projetada à frente do peito; nariz enorme em gancho caindo abaixo do queixo, queixo pontudo; cabelo branco-acinzentado arrepiado, em mechas espetadas para cima e para trás; manto roxo escuro esfarrapado até o chão, aberto na frente mostrando o forro e a saia laranja-ferrugem; cajado de madeira torto com a ponta em espiral, atravessado nas costas por uma correia marrom-avermelhada que cruza o peito; mão direita esticada à frente em garra, com um cordão de contas e um amuleto pendurado. No ataque a mão e o amuleto vão à frente. |
| Ficha da seção 7 do roadmap | "Bruxa curvada, nariz longo, cabelo branco, cajado torto"; cores roxo e laranja; manto, muito curvada |

## 2. Medidas (quadro 0, ~42 × 60 px)
- Cabeça grande para o corpo (≈ 1/4 da altura curvada); o nariz sai ≈ 0,6 cabeça à frente do rosto e desce até abaixo do queixo.
- Costas em corcunda; a cabeça fica à frente do peito, quase na linha da mão.
- Cajado ≈ 1,2 vez a altura dela, a espiral acima e atrás da cabeça.
- Barra do manto em farrapos, alargando ≈ 1,5 × ombros.

## 3. Cor
Manto `#3e1336` / `#6c2e55` (sombra `#320829`). Forro e saia `#bc7131` / `#cf8b50` (sombra `#6e2e26`). Pele `#e2b487` / `#d1a571` (sombra `#ab523e`, ponta do nariz `#9a4031`). Cabelo `#cdcfc2` / `#dfe2d8` (sombra `#999a89`). Madeira `#56372d` / `#926741`. Correia `#8b363a`. Olhos: brilho verde pequeno (`#7ad94a`), a cor do tiro de maldição.

## 4. Animação
Estilo `cast`. `lean` alto (corcunda); a cabeça compensa e olha para a frente. Pose de repouso: braço direito à frente com o antebraço quase na horizontal e a mão caída; o esquerdo pendendo dentro da manga. O cordão do amuleto cai para baixo do mundo nessa pose.

## 5. Checagem (o crítico recebe esta lista)
1. De cima, lê-se "bruxa velha curvada de manto roxo, cabelo branco e nariz em gancho".
2. Nariz em gancho legível de perfil e de 3/4.
3. Cajado com espiral visível na câmera do jogo.
4. Forro laranja visível na abertura da frente e na barra.
5. Lanterna pendurada da mão direita, sem atravessar a manga.
6. Contorno contínuo nas mangas e na barra; até cerca de 7 mil triângulos.

## 6. Crítico (2026-11-23)
5 rodadas. Corrigido: cajado preso nas costas (lido como peça solta; foi para a mão esquerda, em pé à frente, espiral virada para fora), colar de contas (lido como rosário; virou lanterna-gaiola de miolo verde aceso), cabelo em coroa de espinhos (virou mechas ralas caídas para trás), pele pálida (laranja-terra), nariz em peça separada que riscava o rosto com contorno (entrou na metaball do rosto, em gancho, à frente do queixo sem tocá-lo), postura ereta (`lean` 0,9 com a cabeça inclinada para cima), tronco saindo do manto como de um tubo (capa modelada já pendendo para o chão do mundo, boca do manto baixa), barra lisa (farrapos com forro laranja). Oscilaram e ficaram: comprimento e espessura do nariz (longo demais → curto demais → tubo), cabelo (caído ↔ espetado), quanto a corcunda aparece de frente. Médios restantes: silhueta pequena na câmera do jogo, mangas com punho laranja liso, manto simétrico. ~6,9 mil triângulos.
