# Brief do Aurelius (M2-11)

Modelo: `tools/blender/aurelius.py` (base de manto `robed.py` sobre `humanoid.py`, no molde da Frostine). Forma `robed`: sem pernas; o manto fica no osso `skirt`. Grimório no osso `hips`. O orbe arcano (casca de pedra rachada, núcleo aceso e estilhaços) fica por código (`cast-heroes.ts`, `crackedOrb`), sobre a mão direita erguida.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/aurelius.png` | tudo: mago velho de barba e cabelo brancos até a cintura, chapéu pontudo roxo de aba larga com fita dourada e broche do lado, manto roxo até o chão com painel claro e barras douradas, mangas em sino com punho dourado, livro marrom no quadril, orbe roxo aceso na mão direita. O rastro roxo do sprite é efeito visual, para depois. |
| Referência do usuário (2026-11-26) | orbe: esfera de pedra rachada com luz roxa vazando pelas frestas e estilhaços flutuando em volta. |

## 2. Medidas
Esqueleto: `hipY 0.92, headY 0.56, shoulderY 0.45, shoulderX 0.27, arm 0.33, hipX 0, thigh 0.42`. Cabeça na escala 1,9 (`HEAD_LIFT 0.19`). Pose: `poseR [-0.85, -1.75]` (mão direita aberta na altura do ombro, palma para cima; aprovada pelo usuário na R1, fugindo da receita antiga), `poseL [0.1, -0.6]`, `lean 0.16`, `armOut 0.16`.

## 3. Cor e regiões (skins, M13-06)
primary = roxo `#7c3cb0` (manto, chapéu, mangas); secondary = lilás `#ac78e0` (painel da frente); accent = dourado `#e0aa3a` (barra, debrum, fita, cinto, punhos, broche, cantos do livro). Fixos: pele `#f0c8ae`, barba `#eeecee`, couro do livro `#7a3e2c`, botas marrom-escuro.

## 4. Checagem (o crítico recebe)
1. De cima, lê-se "mago velho de chapéu pontudo, barba branca, manto roxo, orbe na mão e livro no quadril".
2. Rosto bravo: sobrancelhas fartas franzidas (ponta de dentro mais baixa), pálpebra em diagonal, cantos da boca para baixo.
3. De perfil, corpo cheio (peito, costas curvadas, barriga), não chapado.
4. Até 8 mil triângulos, ao menos 35% na cabeça (7,9 mil; 52% na cabeça).

## 5. Crítico e usuário (2026-11-25 a 26, aprovado)
- R1 (grave) → pose da mão aberta sob o orbe, punhos finos, mãos maiores, ombros redondos, fio dourado no lugar das manchas de bordado, cabelo mais longo, ponta do chapéu fina, sobrancelhas fartas, nariz maior, botas, livro de frente, mais pregas.
- R2 (grave: buraco preto na boca da manga erguida) → manga curta virada para o chão com forro roxo e anel dourado próprio, cinto alto com fivela, roxo puxado ao magenta, barba em leque, cabeça 20% maior, punho fechado escuro.
- R3 (médio) → faixa dourada do meio (lia como cajado) trocada por debrum nas bordas do painel e losango; cinto saliente com fivela de lado; livro maior; broche do lado. Oscilaram e ficaram: largura da barra, punho, cabelo.
- Usuário: chapéu quebrado no meio → cone reto. Orbe "riscos de paint" → pedra rachada da referência. Corpo magro de perfil → tronco e manto mais fundos. Rosto "depressivo" → bravo (a sobrancelha serena da R3 era a ponta de fora caída, que a seção 4.2 do roadmap já dizia deixar triste).
- Usuário: falta de acabamento de perto (riscos, facetas, sobreposição) → `check_finish` no Blender, poses `face-close` e `detail` no crítico, orçamento de herói em 8 mil, `soften`/`sball`, nariz em `@flat`, sobrancelha e bigode como metaball, broche de peça única. Contorno por pós-processamento ficou para `M16-09`.

Lições: tubo e bola sem sombreado suave saem facetados (`soften(parts)`); dobra funda numa peça de contorno vira risco preto; peça pequena cruzando outra dá pixel preto de perto. Ler a saída do `check_finish` a cada rodada.
