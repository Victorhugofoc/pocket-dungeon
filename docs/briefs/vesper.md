# Brief da Vesper (M2-11)

Modelo: `tools/blender/vesper.py` (base de manto `robed.py` sobre `humanoid.py`, no molde da Aurelius). Forma `robed`: sem pernas; o manto e o abdômen de vespa ficam no osso `skirt`, as asas no `cape`. Cajado com caveira no `foreR`, em pé no mundo. Por código só o brilho verde de veneno nas órbitas da caveira (`cast-heroes.ts`).

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/vesper.png` | tudo: bruxa-vespa curvada para a frente; capuz pontudo listrado de laranja e cinza-escuro com a ponta caída para trás; antenas escuras enroladas para a frente saindo do alto do capuz; rosto pálido meio escondido por cabelo escuro; asa comprida e fina, laranja na borda e creme no meio, saindo das costas para trás na altura do ombro; manto escuro até o chão com faixas laranja na frente e barra esfarrapada; abdômen de vespa grande, listrado de laranja e cinza, atrás do quadril e caindo até perto do chão; mangas escuras com faixas laranja; cajado comprido e fino de madeira, com uma caveira grande cor de osso no topo, na mão da frente. |
| Usuário (2026-11-26) | brilho verde de veneno nas órbitas da caveira (por código); rosto sereno e sinistro; asas no modelo; abelhas da Ninhada refeitas no Blender na mesma tarefa, depois da Vesper aprovada. |

## 2. Medidas (sprite, 62 px de altura)
Capuz 17 px (com a ponta); asa 30 px; abdômen 26 px; cajado 60 px; caveira 9 px. Esqueleto igual ao da receita antiga (as animações dependem dele): `hipY 0.84, headY 0.55, shoulderY 0.44, shoulderX 0.24, arm 0.31, hipX 0, thigh 0.42`. Pose: `lean 0.28` (curvada), `armOut 0.16`, `poseR [-0.75, -0.8]` (cajado à frente), `poseL [-0.35, -0.75]`.

## 3. Cor e regiões (skins, M13-06)
Paleta do sprite: laranja `#d26d00` (claro `#f08a20`, escuro `#8f3801`), cinza-escuro das listras `#3a3339`, manto `#260903`/`#322b32`, osso `#f3c772`, madeira `#794d41`, pele `#f0d0b0`.
primary = laranja (listras do capuz e do abdômen, faixas do manto e das mangas, faixa da cintura); secondary = manto e mangas escuros; accent = asas (creme e âmbar). Fixos: pele, cabelo, caveira, madeira, antenas, cinza das listras.

## 4. Checagem (o crítico recebe)
1. De cima, lê-se "bruxa-vespa de capuz listrado com antenas, asas, abdômen listrado atrás e cajado com caveira".
2. Rosto pálido, sereno e sinistro: pálpebra meio fechada, sobrancelha reta com a ponta de fora levantada (nunca caída, que lê triste), canto da boca levemente para cima.
3. O manto é escuro; o laranja fica nas listras e faixas, sem dominar.
4. Asas e abdômen com volume (de perfil não viram risco).
5. Até 8 mil triângulos, ao menos 35% na cabeça.

## 5. Crítico e usuário (2026-11-26, aprovada)
- R1 (grave) → capuz refeito (abertura inclinada, ponta contínua), rosto com nariz pequeno no tom da pele e lábios em volume, mechas em ponta, faixas laranja largas no manto e barra laranja, mangas em sino com forro laranja, asas âmbar sem contorno, ombro redondo, caveira cor de osso com dentes. Usuário: a ponta do capuz parecia solta → era o anel do `ring_loft` virando onde a curva desce; o capuz passou a usar `sweep` (transporte paralelo, em `vesper.py`).
- R2 (grave) → pálpebra, sobrancelha e boca afinando nas pontas, pescoço escuro (gola), franja em mechas, mãos em faixas escuras, cajado 1,5× e caveira 25% maior, boca da manga como anel próprio (corte nítido), asas mais abertas.
- R3 (grave) → acerto final sem nova rodada, com o usuário: pálpebras no tom da pele, franja acima das sobrancelhas, abertura do capuz mais oval e inclinada com borda fina e forro quase preto, cajado marrom médio, pelerine larga cobrindo o topo das mangas. ~8 mil triângulos, 44% na cabeça.
- Ficaram (gosto que oscilou ou pede outra forma): asas (abrir / não abrir entre R2 e R3), abdômen maior, abertura do capuz ainda redonda de frente, listras do abdômen e do capuz com borda de cor por vértice.
- Abelhas da Ninhada: `tools/blender/bee.py` (~2 mil triângulos; gomos do abdômen como peças de uma cor só), receita `bee` só com `addModel`.

Lições: `ring_loft` escolhe o lado de cima do anel pelo sinal da normal, então curva que desce vira o anel e torce a malha (usar `sweep`); asa fina com contorno vaza manchas pretas (asa sem contorno, borda escura pintada); metaball fina demais (sobrancelha) sai picotada, usar tubo que afina; mecha cortada por metaball negativa sai reta.
