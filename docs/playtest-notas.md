# Notas de playtest

## PT-02 — 2026-10-10 — versão 0.2, desafios (usuário)

**Resultado:** venceu os desafios 1, 3 e 5; não venceu o 2 (A isca, "bastante difícil") nem o 4. O relatório foi "ok, mas pouco detalhado". **Não mudou a montagem por causa do relatório** (pergunta 3 do gate: não). A tela confundiu em "meio que tudo". **Gate da Fase 2 não aprovado.**

| Problema relatado | Causa | Correção (D-020) |
|---|---|---|
| Texto cortado e sobreposto | layout sem regiões fixas; rotas desenhadas por cima do texto | regiões fixas; tabuleiro mais compacto; desenho em camadas (fundo → rotas → texto); rota termina na porta do Coração |
| Mana 10/10 e nada acontecia ao clicar | no desafio 2 o poder é Fechar Porta, sem alvo válido com o ramo C fechado, e nada avisava | com mana suficiente, as salas válidas acendem (forte onde há invasores) e basta tocar; sem alvo, o botão diz "sem alvo" e o log explica |
| Demorou a perceber que a sala vem antes dos monstros | estoque misturado | duas etapas: "1. Escavar e salas" e "2. Monstros e armadilhas"; passa sozinho para a 2 quando as salas acabam |
| Não dava para mexer numa sala já posicionada | só dava para tocar no título (20 px) para devolver | tocar em qualquer peça seleciona; tocar em outro slot move (a sala leva o conteúdo e troca de lugar com outra sala); botões Devolver e Recomeçar |
| Não ficou claro o que a Rede faz; Câmara vs Covil | sem descrições | campo `desc` em monstros, salas, armadilhas e poderes; aparece ao selecionar a peça |
| Limite de monstros por sala | não era mostrado | "monstros 1/2 · armadilhas 0/1" em cada sala; "Guardião 0/1" no Coração |
| O que se perde com o baú saqueado | nada dizia | descrição da Sala de Tesouro + dica neutra no relatório |
| O que é escavar | não explicado | texto da etapa 1 e legenda |
| Relatório pouco detalhado | só o destino final | caminho de cada invasor (salas, segundos parado em cada uma) e golpe final |
| Desafios 2 e 4 difíceis | meta 0 | meta passou para no máximo 2 de dano |
| Desabamento acendia rocha e salas vazias | todo slot era alvo válido | rocha não é alvo; salas sem invasores ficam fracas |

## PT-01 — 2026-10-09 — visualizador de debug (usuário)

**Contexto:** primeira olhada no visualizador, sem explicação prévia: "não entendi nada". Com o roteiro guiado (o que é a tela, o que observar no cenário "Isca do tesouro"), respondeu:

| Pergunta | Resposta |
|---|---|
| Viu os Ladinos indo para o tesouro e os outros para o outro ramo? | Sim |
| Ficou claro quando o invasor está lutando e quando está andando? | Sim |
| Conseguiria dizer por que o Coração perdeu (ou não) vida? | Sim |
| A velocidade 1x é rápida demais? | Não, está ok |
| Percebeu o efeito do poder? | Mais ou menos: tocou antes de ter mana e o único aviso era uma linha no log |

**Conclusões**
- As regras são legíveis **depois de explicadas**. Sem contexto, a tela não se explica: o jogo precisa ensinar a ler a tela (onboarding da Fase 5) e o graybox da Fase 2 precisa contar a história da onda.
- Corrigido no visualizador: barra de mana com marca do custo e estado "PRONTO", aviso "falta mana" na sala tocada, clarão na sala quando o poder é usado.

**Backlog da Fase 2 que saiu daqui**
- Começar a onda pausada, com uma frase descrevendo a montagem e o grupo.
- Nomes por extenso em vez de siglas (`GO2` → "Goblin 2").
- Seta mostrando a rota escolhida por cada invasor na bifurcação.
- Destaque nos momentos decisivos (armadilha, baú, Coração).
- Legenda fixa (formas, cores, letras de status).
- Botão de poder explícito, além do toque na sala.
