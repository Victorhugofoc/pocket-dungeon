# Brief do archer (M3-03)

Modelo: `tools/blender/archer.py` (base comum em `tools/blender/humanoid.py`). O arco continua por código (`bow()` em `kit.ts`), na mão esquerda.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/archer.png` | tudo: esqueleto magro de capuz e manto vermelho-escuro, aljava de flechas nas costas, arco longo puxado |
| Ficha da seção 7 do roadmap | "Esqueleto com capuz e manto vermelho, arco longo"; cores osso e vermelho escuro; bípede magro |

## 2. Forma
- **Esqueleto de verdade**: caixa torácica com costelas separadas (vãos entre elas), coluna, bacia, ossos finos dos membros com nós nas juntas (ombro, cotovelo, joelho), mãos e pés de ossinhos. Nada de corpo "cheio" pintado de osso.
- Crânio: caixa craniana redonda, maçãs salientes, órbitas fundas e escuras com uma brasa vermelha pequena no fundo, buraco do nariz, fileira de dentes. Dentro do capuz, mas o rosto aparece de frente e de 3/4.
- **Capuz** vermelho-escuro, oco, com a abertura do rosto e a ponta caindo para trás.
- **Manto** do mesmo vermelho, preso nos ombros e caindo pelas costas até a panturrilha, com a barra rasgada em pontas. Fica no osso `cape`.
- Aljava de couro nas costas, inclinada, com 4 ou 5 flechas de penas claras; correia diagonal no peito.
- Proporção magra: ombros estreitos (≈ 2 larguras de crânio), membros finos.

## 3. Cor
Osso `#d9cdb0` (luz `#efe6cc`, sombra `#8a7a5a`). Manto e capuz `#5a1a20` (sombra `#2e0a10`). Couro `#5a3a22`. Penas `#e8e0d0`. Brasa dos olhos `#ff4a2a`.

## 4. Animação
Estilo `shoot`: braço esquerdo estica o arco, o direito puxa a corda. O manto balança no osso `cape`.

## 5. Checagem (o crítico recebe esta lista)
1. De cima, lê-se "esqueleto arqueiro de manto vermelho": capuz, manto, arco.
2. Dá para ver costelas separadas e membros de osso (não um boneco bege).
3. O rosto de caveira aparece de frente e de 3/4 dentro do capuz.
4. Contorno preto contínuo em todas as bordas, inclusive na barra do manto e nas costelas.
5. Até cerca de 4.200 triângulos (o esqueleto é feito de muitas peças soltas; o arco é à parte).

## 6. Já recusado pelo usuário (revisão 1, 2026-11-18)
- "Muito magrinho": o esqueleto de palitos não tem corpo. Precisa de massa de silhueta (ossos bem mais robustos, tórax mais largo, ombros e bacia maiores, pose em base aberta e curvada como o sprite), sem perder a leitura de esqueleto.
- "A capa parece um capacete": o capuz (esfera oca) fica redondo e rígido sobre a cabeça. Deve cair em pano, com ponta e caimento sobre os ombros, ligado ao manto, como no sprite.
- "O arco parece atravessar o osso": a mão esquerda não fecha em volta do cabo; o arco cruza o antebraço. A mão precisa segurar o punho do arco, com o arco à frente dos dedos.
- No geral, "em relação à referência, não está legal": seguir o sprite de perto (postura de tiro curvada, manto e capuz como uma peça só, aljava visível sobre o ombro).
