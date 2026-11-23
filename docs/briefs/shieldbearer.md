# Brief do shieldbearer (M9-01)

Modelo: `tools/blender/shieldbearer.py` (base `tools/blender/humanoid.py`). Escudo e lança também no Blender, cada um no osso do antebraço que os segura (`foreL`, `foreR`), modelados na orientação do mundo e levados ao repouso do osso pela pose da receita (`POSE_L`, `POSE_R`, `LEAN`, `OUT` iguais a `cast-enemies.ts`).

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/shieldbearer.png` | tudo: cavaleiro de armadura de placas, elmo fechado com pluma vermelha, escudo pipa branco com faixa vermelha em V, lança baixa e longa |
| `shieldbearer_guard_sheet.png` (dungeon-idle) | o escudo erguido cobre o corpo do ombro ao joelho, de frente; a lança passa por trás/baixo |
| Ficha da seção 7 do roadmap | elite pesado, lento; bloqueia de frente, flanquear |

## 2. Forma
- **Elmo fechado** (armet): domo liso com crista baixa no meio, viseira que avança em cunha suave, **fenda dos olhos escavada** (sulco horizontal fundo, escuro, com contorno da própria viseira, não uma barra preta colada) e furos de respiro em fileira. Gorjal em anéis descendo para os ombros.
- **Pluma vermelha** saindo do topo e caindo em arco para trás, em várias mechas afiladas.
- **Peito de placas** abaulado com quilha no meio, faixa da cintura, **ombreiras em lâminas** sobrepostas (3), braço com cotoveleira em leque, manopla.
- **Saia de cota de malha** escura (cor em trama) sob placas de coxa (escarcelas) na frente; joelheiras com asa, grevas, sapatos de placas (sabatões) em lâminas.
- **Escudo pipa**: topo levemente curvo, laterais que afinam até a ponta embaixo; superfície curva (abaulada para fora), borda de aço em relevo, campo branco-acinzentado com **faixa vermelha em V invertido (chevron)**, como no sprite. Altura ≈ do ombro ao meio da coxa (~0,85 do modelo), largura ≈ 0,5. Preso no antebraço esquerdo, que fica atravessado na horizontal à frente do peito, com a face do escudo para a frente.
- **Lança**: haste de madeira escura reta, ~2,1 de comprimento, empunhada na mão direita junto ao quadril, apontando para a frente e um pouco para cima; ponta em folha de aço com alvado e anel; ~0,7 da haste para trás da mão.
- Proporção do sprite: atarracado e largo, cabeça (elmo) ~1/5 da altura, ombros largos pelas ombreiras.

## 3. Cor
Aço claro `#cfd4dc`, médio `#8e95a2`, escuro `#4a505c`, quase preto `#24272e` (fenda, juntas). Cota de malha `#5c616c`. Pluma e faixa `#a8222a` (sombra `#5a1014`). Campo do escudo `#dcdad4` (sombra `#9c9a94`). Madeira `#5a3a22`. Couro (cinto, alças) `#4a2e1c`.

## 4. Animação
Estilo `spear`: só o braço direito estoca (recua e avança ao longo da lança); o braço do escudo fica firme na frente. Corpo e passos pelo `animate.ts` de sempre.

## 5. Checagem (o crítico recebe esta lista)
1. De cima, lê-se "cavaleiro com escudo e lança": o escudo pipa com o chevron vermelho é a maior peça de frente.
2. O elmo é um elmo: fenda dos olhos como sulco no metal e pluma vermelha para trás; nada de "venda" ou "óculos".
3. O escudo é segurado de verdade: braço por trás, face para a frente, cobrindo o tronco; não flutua nem atravessa o corpo.
4. A lança é longa, reta, com ponta de aço visível, segurada firme na mão; não fica mole nem em pé.
5. Armadura de placas com volume (ombreiras, joelheiras), não boneco liso.
6. Contorno preto contínuo nas bordas (escudo, lâminas, pluma).
7. Até cerca de 6 mil triângulos.

## 6. Já recusado pelo usuário (versão por código, 2026-11-23)
- "Stickman com uma venda": corpo genérico do `body()` e a fenda da viseira como barra preta sobre esfera lisa.
- "O escudo mal parece escudo, o jeito que segura não faz sentido": escudo colado no peito, sem braço segurando.
- "A lança parece de fazer carinho": lança fina em pé, mole na mão.

## 7. Revisão Blender (2026-11-23), aprovada pelo usuário
- Modelo em `tools/blender/shieldbearer.py` (~7,7 mil triângulos; o escudo, com 1,8 mil, é a peça mais pesada). Escudo e lança modelados na orientação do mundo a partir da mão e levados ao repouso do antebraço por `to_fore` (a mesma conta de `hang` em `kit.ts`: ponto = pivô + (0, −mão, 0) + Fᵀ·d). Poses achadas por busca numérica: `POSE_L = (-0.65, -1.05, 0, -0.7)` deixa o antebraço atravessado à frente do peito; `POSE_R = (0.05, -0.95, 0, -0.6)` deixa a mão da lança junto ao quadril. Ao mudar pose, `lean` ou `armOut`, refazer a busca e conferir que a lança passa por fora da borda do escudo.
- Elmo: grande elmo (tambor de laterais retas, tampa reta, frente plana); a fenda dos olhos é um corte booleano de verdade com o miolo escuro atrás, não uma barra pintada; nervura só abaixo da fenda; duas fileiras de furos redondos de respiro (fendas verticais liam como dentes).
- Escudo facetado como no sprite: metade direita mais escura, quina clara no meio, aro escuro, chevron vermelho (o sprite tem chevron; um crítico leu "banda diagonal", e a ampliação da referência mostra o V).
- Estilo novo `spear` em `animate.ts`: braços firmes ao andar, só o direito estoca, ombro e cotovelo juntos para a lança não mergulhar.
- Crítico em 4 rodadas: graves resolvidos (lança atravessando o escudo, ombreiras de "luva de boxe", elmo de mascote ou sem viseira). Ficaram médios que oscilam entre rodadas (tom do aço, mais claro numa e mais escuro noutra; tamanho das ombreiras; ponta da lança) e médios de acabamento: saia de malha pouco visível atrás do escudo, costas lisas.
