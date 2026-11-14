# Crítico cego

Um subagente que **só vê imagens**: as capturas do trabalho e a referência. Ele nunca lê código, receita, roadmap nem a conversa. Quem escreveu a receita sabe o que queria ver e acaba vendo a intenção, não o resultado; o crítico só tem o resultado.

Vale para personagens (M1, M2, M3, M9, M10) e para zonas (marco M18). O usuário só vê uma versão depois que o crítico não aponta mais nada acima de **menor**.

## Rotina

1. Gerar as capturas fixas.
   - Personagem: `npm run dev`, abrir `/preview.html?a=<id>` e rodar no console `await __preview.criticShots("critic-<id>")`. Grava em `.shots/` as poses `front`, `three-quarter`, `side`, `back`, `face`, `attack` e `game` (câmera do jogo, com o Varok ao lado para escala).
   - Zona: `npm run dev`, abrir `/zone.html?zone=<id>` e rodar no console `await __zone.criticShots("zone-<id>")`. Grava em `.shots/` as poses `campfire`, `middle`, `dense` (mata mais densa), `arena`, `low` (câmera baixa, cerca de 30°) e `far` (zoom 2×), em 1280×720, e devolve draw calls e triângulos de cada uma. Seed fixa (`?seed=`, padrão 1), sem inimigos; o herói fica parado no centro e o chefe na arena.
2. Chamar o subagente (ferramenta Agent) com o texto da seção abaixo, trocando `<...>`. Passar só caminhos de imagem. Não explicar o que mudou nem o que se espera dele.
3. Corrigir o que veio como **grave** e **médio**, gerar as capturas de novo e repetir com um subagente **novo** (o anterior já conhece a versão velha).
4. Parar quando sobrar só **menor**, ou só **médio** de gosto que oscila entre rodadas (ver as lições abaixo). Mostrar ao usuário as capturas e a última lista do crítico.

Decisões já tomadas com o usuário que fogem do sprite (por exemplo, a espada longa do Kaelen vem da ficha da seção 7.1 do roadmap) entram no texto do subagente na linha "Decisões fixas", para ele não apontar de novo. Se ainda assim apontar algo que contraria uma decisão do usuário, a decisão vale: registrar no roadmap e seguir. Se ele errar o que está vendo (achar que a espada é um cajado), é sinal de que a leitura não está clara; tratar como defeito.

Calibração (2026-11-14, primeiro teste): no Kaelen, já aprovado, o crítico apontou o que o sprite tem e o modelo não (lâmina ciano no peito, franja sobre o olho, forro vermelho da capa, calça cinza) e um defeito real que tinha passado: no meio do golpe a espada some e o ombro direito salta. Na Vesper, sem validação, apontou a falta das asas e do abdômen separado atrás, o rosto escuro no lugar do pálido e o laranja dominando um manto que no sprite é escuro. É mais exigente que a validação do usuário até aqui.

Primeira volta completa (Vesper, 2026-11-14, seis críticos): a maior gravidade caiu de grave para médio na quinta rodada. Lições:
- Na primeira rodada ele acha o que importa (peças do sprite que faltam, rosto, cor dominante). Daí em diante as rodadas trazem cada vez mais gosto pessoal.
- **Ele oscila** em medidas de gosto: asas "maiores e âmbar" numa rodada, "menores e claras" na seguinte; abdômen "mais alto" e depois "mais baixo". Quando um ponto inverte entre rodadas, fica onde está e sai da lista.
- Peça fina vista de perfil vira "risco quebrado" para ele. Asa, lâmina e fita precisam de volume (lente achatada com contorno), não de chapa.
- Listra pintada por vértice só sai reta se a borda seguir as linhas da malha (no `sculpt`, a latitude de `n.y`). Faixa diagonal sai serrilhada.
- Parar quando sobrar só "médio" de gosto e mostrar ao usuário. Insistir até zerar os médios gasta rodadas sem ganho claro.

## Texto para o subagente (personagem)

```
Você é um diretor de arte avaliando um modelo 3D de personagem para um RPG de ação visto de cima (câmera alta, estilo Minecraft Dungeons / Diablo). Toda a arte é gerada por código: formas simples, cor por vértice, contorno preto, bloom.

Regras: use a ferramenta Read SÓ nos arquivos de imagem listados. Não abra nenhum outro arquivo, não procure no disco, não leia código.

Referência (o design a seguir; sprite de pixel art, quadro parado): <caminho de docs/ref/<id>.png>
Capturas do modelo 3D: <caminhos de .shots/critic-<id>-*.png>
(front, three-quarter, side, back = corpo inteiro; face = rosto de perto; attack = meio do golpe; game = câmera real do jogo, o personagem é o da esquerda, o da direita é outro herói só para escala)
Decisões fixas (não apontar como defeito): <lista, ou "nenhuma">

Responda em português:
1. Em uma frase: o que você vê (quem é este personagem, o que carrega). Sem olhar a referência de novo.
2. Defeitos, do mais grave para o menos grave. Para cada um: gravidade (grave / médio / menor), onde (pose e parte do corpo), o que está errado e o que mudaria, em termos concretos de forma, proporção, cor ou silhueta.
   - grave: quebra a leitura do personagem, foge do sprite numa peça que o identifica, parece quebrado (peça solta, atravessando, buraco, borrão, artefato preto), ou expressão errada.
   - médio: proporção ou cor visivelmente diferente do sprite, peça que parece colada, silhueta confusa na câmera do jogo, aspecto de boneco de brinquedo.
   - menor: acabamento.
3. Uma linha final: "Maior gravidade: grave|médio|menor|nenhum".
Seja exigente e específico. Não elogie.
```

## Texto para o subagente (zona)

```
Você é um diretor de arte avaliando o cenário de um RPG de ação visto de cima (câmera alta, estilo Minecraft Dungeons / Diablo), renderizado em tempo real no navegador. Toda a arte é gerada por código: formas simples, cor por vértice, contorno preto nos personagens, bloom. O objetivo é atmosfera: luz, névoa, densidade e movimento, como numa cena de jogo bem acabada.

Regras: use a ferramenta Read SÓ nos arquivos de imagem listados. Não abra nenhum outro arquivo, não procure no disco, não leia código.

Zona: <nome> (<uma linha com o clima pretendido, de zones.ts>)
Capturas, todas na mesma zona: <caminhos de .shots/zone-<id>-*.png>
(campfire = ponto de partida com fogueira; middle = meio do caminho; dense = mata mais densa; arena = arena do chefe, com o chefe parado; low = câmera baixa só para avaliar névoa e profundidade, não é a câmera do jogo; far = câmera do jogo afastada)
Decisões fixas (não apontar como defeito): <lista, ou "nenhuma">

Responda em português:
1. Em uma frase: que lugar é este e que clima passa.
2. Defeitos, do mais grave para o menos grave. Para cada um: gravidade (grave / médio / menor), onde (pose e região da imagem), o que está errado e o que mudaria, em termos concretos de luz, cor, névoa, densidade, escala ou movimento.
   - grave: parece quebrado (buraco, faixa, objeto flutuando ou cortado, tremido, bloco preto), ilegível (personagem some no fundo) ou sem atmosfera nenhuma (chão chapado e vazio na maior parte da tela).
   - médio: repetição visível, chão ou ar sem variação, luz chapada, objetos que parecem colados no chão, paleta que não passa o clima da zona.
   - menor: acabamento.
3. Uma linha final: "Maior gravidade: grave|médio|menor|nenhum".
Seja exigente e específico. Não elogie.
```
