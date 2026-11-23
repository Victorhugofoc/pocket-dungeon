# Brief do plaguebearer (M9-03)

Modelo: `tools/blender/plaguebearer.py` (bípede de `humanoid.py`, braço e perna no jeito de `dwarf.py`). Barril nas costas no osso `torso`.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/plaguebearer.png` e a folha (`dungeon-idle/assets/enemies/special/plaguebearer_sheet.png`) | tudo: zumbi inchado e curvado, de perfil; barriga enorme e redonda de pele bege-esverdeada doentia, com pústulas amareladas; corpo enfaixado em tiras sujas marrom-avermelhadas (cabeça, peito, braços, pernas), faixas soltas pendendo; cabeça careca baixa, enfiada à frente dos ombros, quase sem pescoço, boca aberta escura; braços compridos caídos à frente da barriga; pernas curtas e grossas, pés enrolados em trapos; barril de madeira com aros de ferro escuros preso nas costas por correias, com gosma verde-amarelada escorrendo da boca do barril. Ao morrer, desaba e vira poça. |
| Ficha da seção 7 do roadmap | "Zumbi inchado com barril nas costas"; cores bege doentio e vermelho; bípede pesado |

## 2. Medidas (quadro 0, ~45 × 60 px)
- Barriga ≈ 1,3 × a largura dos ombros, de perfil sai bem à frente do peito.
- Cabeça pequena (≈ 1/5 da altura), na altura dos ombros, à frente deles.
- Barril ≈ altura do tronco, diâmetro ≈ 0,6 do tronco, um pouco acima dos ombros.
- Pernas ≈ 1/3 da altura.

## 3. Cor
Pele `#c4b27a` / `#e0d098` (sombra `#6e5e34`), pústulas `#d8d860` com miolo `#a4b830`. Faixas `#8a5a3a` / `#a8744a` (sombra `#4a2a1a`), manchas vermelho-escuras `#6a1a14`. Boca `#2a0c08`. Madeira `#6a4428` / `#8e6038`, aros `#3a3a40`. Gosma `#b8d040` (acesa, sem contorno).

## 4. Animação
Estilo `swing` (golpe de braço). `lean` médio (corcunda); a cabeça compensa. Pose de repouso: braços pendendo à frente da barriga, cotovelos pouco dobrados.

## 5. Checagem (o crítico recebe esta lista)
1. De cima, lê-se "zumbi inchado e enfaixado, com barril nas costas".
2. Barriga redonda e grande, legível de perfil.
3. Barril com aros e gosma verde visível na câmera do jogo.
4. Faixas legíveis como tiras de pano, não como listras pintadas.
5. Cabeça baixa e à frente; boca aberta.
6. Contorno contínuo; até cerca de 7 mil triângulos.

## 6. Crítico (2026-11-23)
5 rodadas. Corrigido: barril alto e no meio das costas lido como chapéu de frente (desceu e foi para o ombro esquerdo, depois cresceu ~35%), bastão no centro da tampa lido como canudo (virou cajado grosso com nós amarrado ao lado do barril, do alto até o joelho, gancho no topo), pele verde-oliva de ogro (ocre-pálido com feridas vinho cobrindo ~1/3 do corpo, fracas na cabeça e nas mãos, senão viravam gorro e luvas), pústulas como botões (amarelas com borda vinho pela normal, uma grande na barriga), faixas finas como cordões e anéis iguais de "boneco Michelin" (fitas largas, menos anéis, uma diagonal no braço), cabeça em "pote" com duas faixas horizontais (crânio com calombos, maxilar largo, sem faixa no rosto, dois olhos acesos), tampa verde chapada lida como plástico (madeira com líquido afundado e escorridos verdes), correia cruzando o rosto. Oscilaram e ficaram: tom da pele (ocre → oliva → pálido), cor dos aros (claros ↔ escuros), barril de lado ou no centro, tamanho da área verde da tampa. Médios restantes: barriga pouco à frente de perfil, pernas escuras sem faixas, golpe pouco legível (animação padrão), cachos de pústulas. ~7,5 mil triângulos.
