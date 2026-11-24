# Brief do soul_ward (M10-10 parte 2)

Modelo: `tools/blender/soul_ward.py`. Um osso só (`hips`, pivô no chão), forma nova `wisp` em `build.ts`/`animate.ts`: a alma flutua sobre o selo, sobe e desce devagar e balança as caudas.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/soul_ward.png` e a folha (`dungeon-idle/assets/enemies/special/soul_ward_sheet.png`) | tudo: bolha de alma verde-água clara, topo redondo, mais larga em cima que embaixo; um buraco escuro grande na frente (o núcleo), meio de lado; base que se enrola numa voluta. |
| Genoma (`tools/creaturegen/genomes/game/soul_ward.json`) | família amorfa, 1 olho, núcleo 0,94 (grande), 2 tentáculos, anda aos pulos (aqui fica parada: `speed = 0`); pele h 0,45 s 0,45 v 0,75 (`#69bfa6`), destaque h 0,48 saturado. |
| `enemies.lua` | `soul_ward`: ajudante do Hollow King, parado, sem dano, raio 15 px (≈ 0,94 m); vida = 6% da do chefe. |
| `docs/ref/hollow_king.png` | o selo tem de parecer do mesmo dono: o brilho verde-água do cajado (`0x73ffcc`) e o dourado da coroa. |

## 2. Medidas
- Altura total ≈ 1,25 m (pouco mais da metade de um goblin), bolha ≈ 0,8 m de largura.
- Flutua: a base da bolha a ≈ 0,3 m do chão; as duas caudas descem e se enrolam até quase o chão.
- Núcleo ≈ 45% da largura da bolha, na frente, um pouco abaixo do meio e para a esquerda.

## 3. Cor
Alma `#69bfa6` / claro `#b9f0dc` no alto (sombra `#2e6f62`). Buraco verde-escuro `#1f4a40` clareando até a sombra do corpo na borda, sem brilho (como no sprite). Corpo final em verde-menta `#6fd39a` / `#a6eec4`, sombra `#3f9a6e`. No chão, um selo: anel fino dourado (`#e8d27a`) com 4 marcas e um anel de runas verde-água aceso, sem contorno, para ler "selo" de cima.

## 4. Animação
Forma `wisp`: sobe e desce 0,08 m num ciclo de ~3 s, balança devagar, respira na escala; ao apanhar dá um tranco; ao morrer encolhe e afunda no selo. No jogo, uma linha de luz verde-água liga cada selo ao Hollow King enquanto ele estiver de pé (`game`, efeito por código).

## 5. Checagem (o crítico recebe esta lista)
1. De cima, lê-se "alma/fantasma verde-água pequeno sobre um selo no chão", e não "gosma" nem "ovo".
2. Olho preto com brilho branco na frente-direita, visível na câmera do jogo; núcleo verde-escuro macio por dentro do corpo, à esquerda.
3. Flutua: vê-se o vão entre a bolha e o chão.
4. Uma voluta só, saindo do corpo na frente-baixo (mudou na 1ª rodada do crítico: o genoma tem 2 tentáculos, o sprite mostra uma).
5. Combina com o Hollow King (verde-água e dourado).
6. Até cerca de 4 mil triângulos.

## 6. Crítico (2026-11-23)
6 rodadas. Corrigido: olho de "câmera" (anel em relevo com pupila acesa) virou um buraco verde-escuro chapado, sem brilho, como no sprite; o buraco cavado por metaball negativa tinha borda serrilhada e a pintura pela distância escurecia também as costas (virou disco pousado na pele por raio, `decal`, que não sai do perfil); duas caudas enroladas como chifres de carneiro viraram uma voluta só, primeiro um tubo pendurado (lia como tromba ou cano cinza) e por fim parte da própria malha do corpo, na frente-baixo, embaixo do buraco; ponta de chama no topo (lia como caule de fruta) saiu; vinco entre cúpula e base; cor fria e plástica puxada para verde-menta, mais fosca (`rough` 0,65); 25% maior para ler na câmera do jogo. Oscilaram e ficaram: corpo largo e baixo com base reta ↔ gota alta afinando (ficou o largo, como o quadro 0 do sprite); cauda grossa ↔ fina; brilho no olho sim ↔ não (ficou sem, como no sprite). Médios restantes: a voluta ainda lê como um nó de massa de perto, leitura de "crânio" de frente para um crítico, falta brilho próprio de alma (pede emissivo, fica para a fase 2 de VFX). ~4,3 mil triângulos (3 mil na alma).

## 7. Usuário (2026-11-23)
Recusou o buraco escuro: "o olho não parece olho". A folha inteira do sprite mostra que a mancha verde-escura grande é o **núcleo**, visto através do corpo translúcido, e que o olho é um pontinho preto com brilho branco na frente-direita (a boca vermelha só aparece ao apanhar). Agora: núcleo pintado na pele da frente com borda que se perde no corpo, e olho oval preto (0,058 × 0,08) com ponto de brilho, pousados na pele (`decal`). Lição: ler a folha inteira, não só o quadro 0, antes de decidir o que cada mancha é.
