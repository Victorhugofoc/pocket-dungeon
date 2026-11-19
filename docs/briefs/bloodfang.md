# Brief do Bloodfang (M1-06)

Modelo: `tools/blender/bloodfang.py` (sobre `humanoid.py`, com o osso `tail` a mais). O facão continua por código (`bloodfangKnife` em `cast-bosses.ts`), na mão direita. A versão por código fica como `bloodfang_v1` (`/preview.html?a=bloodfang&b=bloodfang_v1`).

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/bloodfang.png` | tudo: tigre-homem vermelho, curvado para a frente, cabeça de tigre rugindo com a boca aberta e presas, listras pretas no corpo, caveira enorme sobre o ombro direito com uma gola azul-acinzentada em volta do pescoço e ossos pendurados, braços enormes que chegam ao joelho com braçadeiras azul-acinzentadas, cinto de couro com tachas e fivela redonda, tanga com estrela, pernas curtas com patas de garras claras, cauda listrada, facão serrilhado na mão direita |
| `bloodfang_v1` (receita antiga) | medidas do esqueleto (`b.dims`, pivôs), pose, tamanho e posição do facão |

## 2. Forma
- Tronco em V: cintura fina, peito e costas enormes, trapézio alto; a cabeça sai baixa e à frente do peito.
- Cabeça de tigre: crânio largo, focinho curto, mandíbula caída (rugido), presas de cima e de baixo, língua, nariz escuro, olhos amarelos acesos sob a arcada franzida, orelhas redondas para trás, suíças creme em pontas nas bochechas.
- Braços longos e grossos: deltoide redondo, bíceps, antebraço largo com braçadeira; mão esquerda aberta em garra, direita fechada no cabo.
- Pernas curtas e grossas; pata com três dedos e garras.
- Caveira do tamanho da cabeça no ombro direito (o do facão), virada para fora.

## 3. Cor
Vermelho `#d8301e` (sombra `#7e1412`, realce `#ee5a3c`). Listras `#160b0d`. Creme `#f6ecd8` (sombra `#bfa888`). Gola e braçadeiras `#5a6884` (sombra `#2a3448`). Couro `#5e3a22`. Osso `#e6d8b8`. Olho `#ffd23a`. Boca `#4e0a12`.

## 4. Animação
Igual à v1: `swing`, `lean` 0,3, agachado (`crouch` 0,34), cauda no osso `tail`.

## 5. Checagem (o crítico recebe esta lista)
1. De cima, lê-se "tigre-guerreiro vermelho com caveira no ombro e facão".
2. Listras pretas visíveis no corpo, braços, pernas e cauda.
3. Boca aberta com presas, olhos amarelos.
4. Contorno preto contínuo nas bordas.
5. Até cerca de 10 mil triângulos (chefe).

## 6. Crítico (2026-11-19, 2 rodadas)
- Rodada 1 (grave): caveira flutuando acima do ombro; gola em boia engolindo o pescoço; listras em blocos; pernas e pés finos. Facão apontado como "vareta" de frente (é o mesmo da v1, aprovada: entrou em "Decisões fixas").
- Correções: caveira assentada num ninho da gola sobre o ombro direito, gola mais fina, listras como fita rente à pele, finas e longas; coxas, canelas, pés e cauda mais grossos; braçadeiras mais altas.
- Rodada 2 (médio): testa branca "de palhaço", orelhas como argolas, cabeça pequena. Corrigido depois: testa vermelha (creme só no focinho, bochechas e queixo), orelhas em triângulo arredondado, cabeça 15% maior e mais à frente, caveira bege.
- Médios que restaram (gosto, para o usuário decidir): antebraços lisos, sem botas escuras nas pernas (o sprite tem faixa cinza no tornozelo, que ficou), estrela na tanga (vem da v1).
- ~14,1 mil triângulos (acima dos 10 mil do brief; listras são ~2,4 mil).
