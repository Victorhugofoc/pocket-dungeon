# Covil — Documento de Design v2

> **Nome provisório:** *Covil*. "Pocket Dungeon" foi descartado por conflito com *Shovel Knight Pocket Dungeon* (Yacht Club Games). Candidatos em inglês para o lançamento: *Lairkeep*, *Heartdelve*, *Den of Dread*, *Deepward*. Antes de decidir, verificar a Google Play, a App Store, o itch.io, a Steam e o registro de marcas (INPI/USPTO).

---

## 0. O que mudou em relação à v1

| Tema | v1 | v2 | Motivo |
|---|---|---|---|
| Estrutura | Campanha linear de 15 andares feitos à mão | **Runs roguelite** de 8 ondas, com meta-progressão entre runs | Andares feitos à mão viram quebra-cabeças resolvidos e não têm replay; runs geram variedade infinita com pouco conteúdo |
| Merge | "2 cópias → nível +1", fora de contexto | **Merge real dentro da run:** bancada limitada, loja com ofertas, monstros, salas e armadilhas fundíveis | Cria tensão de espaço e decisão econômica, que é o apelo real do gênero merge |
| Layout | 5 posições lineares | **Corte lateral com bifurcação:** 6 slots escaváveis + Coração, em dois caminhos | Dá sensação de lugar e cria decisões de rota |
| Objetivo dos invasores | Indefinido | **Chegar ao Coração da Masmorra** e causar dano a ele; o Coração é a "vida" da run | Define vitória, derrota e derrota parcial |
| Tentativas | Indefinidas (risco de repetir até vencer) | Sem repetição dentro da run; a unidade de tentativa é a run inteira | Resolve "testar infinitamente" sem precisar de energia |
| Intervenção | 1 habilidade por invasão | **Barra de mana** com um Poder do Senhor escolhido antes da run (Fechar Porta, Fúria, Desabamento...) | Mais decisão ao vivo, ligada à rota |
| Progressão de poder | Ouro e upgrades permanentes | A meta-progressão desbloqueia **variedade** (espécies, salas, poderes, pactos), não números brutos | Evita que o grind substitua a estratégia |
| Longo prazo | Completar 15 andares | Níveis de **Infâmia** (dificuldade crescente), **Run Diária** com semente fixa, bestiário e cosméticos | Conteúdo de longo prazo barato de produzir |
| Monetização | Rewarded ads + IAPs variados, APK | **Grátis para começar + desbloqueio único da versão completa + cosméticos**; sem anúncios no lançamento | LTV de rewarded é irrisório; roguelites mobile vendem bem como premium/desbloqueio |
| Distribuição | APK próprio | **itch.io (web) para playtests**, Google Play (teste fechado → produção) | APK fora da loja mata a descoberta e adiciona atrito |
| Arte | Não mencionada | **Corte lateral vertical, estilo definido na Fase 5**, níveis de monstro por variação de paleta e acessório | A arte é o maior custo escondido |

---

## 1. Visão

### Frase do jogo

> **"Escave sua masmorra, posicione monstros e armadilhas, e proteja o Coração contra oito ondas de aventureiros, uma run de cada vez."**

### Fantasia

Você é o Senhor do Covil. A masmorra é um **lugar** visto em corte lateral, como um formigueiro: a vila dos aventureiros fica na superfície, no topo da tela, e o Coração pulsa no fundo. A cada onda, você vê um grupo descendo, escolhendo caminhos e caindo (ou não) nas suas armadilhas.

### A decisão central

> **"Com o ouro e o espaço que tenho, como preparo minha masmorra para o próximo grupo, sem sacrificar as ondas seguintes?"**

Toda decisão do jogo é uma variação dessa pergunta:

- comprar um monstro novo, fundir um que já tenho ou guardar ouro (juros);
- escavar um novo slot (que pode abrir um segundo caminho) ou fortalecer o que já existe;
- montar uma defesa contra o grupo da próxima onda ou investir no chefe da onda 8.

### Público

- Jogadores mid-core de celular que gostam de auto-battlers (TFT Mobile, Super Auto Pets), roguelites (Slay the Spire, Legend of Keepers) e tower defense leve.
- Sessões curtas: uma onda dura de 1,5 a 2 minutos e a run é salva entre ondas. Uma sessão típica cobre de 3 a 5 ondas; uma run completa leva de 12 a 16 minutos.
- Android primeiro, retrato, jogável com uma mão.

### Concorrentes a estudar antes de começar

| Jogo | O que aprender | Onde nos diferenciamos |
|---|---|---|
| *Legend of Keepers* | Run de defesa de masmorra, salas fixas em sequência | Merge e loja de auto-battler, bifurcação de rota, sessões mobile curtas |
| *Dungeon Maker* (Android) | Fantasia de vilão, colocação livre de armadilhas | Combate legível, determinístico e com explicação da derrota; run curta |
| *Super Auto Pets* / *TFT* | Loja, bancada, merge, juros | Tema de masmorra com espaço e rota, sem PvP obrigatório |
| *Dungeon Warfare* | Tower defense de armadilhas | Ênfase em composição, não em micro em tempo real |

**Tarefa da Fase 0:** jogar pelo menos dois desses jogos e listar as 10 reclamações mais comuns nas reviews negativas. Essa lista vira requisito.

---

## 2. Pilares de design (revisados)

1. **Legibilidade acima de profundidade.** O jogador precisa entender por que perdeu. Cada efeito tem ícone, cor e som próprios. Ao fim de cada onda, aparece um relatório.
2. **Cada onda é uma pergunta.** O gerador de ondas escolhe um *tema* (blindados, rápidos, dispersos, ladrões...) e o jogador vê o próximo grupo antes de preparar a masmorra.
3. **Escassez gera decisão.** Ouro, slots da bancada e slots escavados são limitados. Sem escassez, o merge vira faxina.
4. **A run é a unidade de tentativa.** Não há "tentar de novo" dentro da run. Perder uma run deve ser rápido, claro e deixar vontade de começar outra.
5. **Meta = variedade, não força.** O que se desbloqueia fora da run aumenta as opções, não os números. Uma conta nova e uma conta antiga, com o mesmo conteúdo, jogam em pé de igualdade.
6. **Monetização sem pressão.** Nunca se vende vantagem dentro da run.

---

## 3. Estrutura de uma run

### 3.1 Visão geral

```text
Hub (escolher Pacto + Poder) → Onda 1 → Loja → Onda 2 → Loja → Onda 3 → Loja
→ Onda 4 (ELITE) → Loja → Onda 5 → Loja → Onda 6 → Loja → Onda 7 → Loja
→ Onda 8 (HERÓI-CHEFE) → Fim da run → Almas → Hub
```

- **8 ondas.** A onda 4 é de elite (todos os invasores com modificadores). A onda 8 traz um Herói-Chefe sorteado entre 3.
- **Coração:** 20 PV. Cada invasor que chega ao Coração e derrota o Guardião causa dano igual à sua **Ameaça**. A run termina com derrota quando o Coração chega a 0.
- **Vitória:** sobreviver à onda 8 com o Coração acima de 0. A pontuação considera as ondas sobrevividas, os PV restantes do Coração e o nível de Infâmia.
- **Semente:** cada run tem uma semente que determina as ondas, as ofertas da loja e a aleatoriedade do combate. Ela é exibida no fim da run e pode ser compartilhada.

### 3.2 Ciclo de uma onda (1,5 a 2 minutos)

1. **Reconhecimento** (sempre visível): o grupo da próxima onda (classes, modificadores, Ameaça) e o tema da onda seguinte.
2. **Preparação** (30 a 60 s): posicionar e mover peças entre a bancada e a masmorra, escavar slots, fundir. Tudo pode ser desfeito livremente até o início da onda.
3. **Invasão** (25 a 45 s em velocidade 1x; há 2x): combate automático; o jogador usa o Poder do Senhor com a mana disponível.
4. **Relatório** (5 s): onde cada invasor parou, quem causou mais dano, que fraquezas foram ativadas, dano ao Coração e uma dica.
5. **Loja** (15 a 30 s): ouro recebido, 4 ofertas, re-sorteio, travar oferta, vender.

### 3.3 Fim de onda

- Monstros mortos **revivem** na onda seguinte. Não há morte permanente; a derrota já é punida pelo dano ao Coração.
- Os invasores sobreviventes vão embora.
- **Limite de tempo:** se a onda passar de 60 s de simulação, os invasores restantes fogem. Eles não causam dano ao Coração, mas também não rendem ouro de abate. Isso evita impasses.

---

## 4. A masmorra

### 4.1 Layout (corte lateral, retrato)

```text
            ☼ Vila (superfície)
                 │
             [Entrada]
                 │
               [A1]
              /    \
          [B1]      [C1]
           │          │
          [B2]      [C2]
              \    /
               [D1]
                 │
           [♥ CORAÇÃO]
```

- **6 slots escaváveis** (A1, B1, B2, C1, C2, D1) mais o **Coração** (fixo).
- Cada slot está em um de três estados: **rocha** (intransponível), **túnel** (passagem sem sala) ou **sala** (aceita uma sala).
- **Início da run:** A1, B1 e D1 são salas; B2 é túnel; C1 e C2 são rocha.
- **Escavar** custa ouro (3 → 5 → 7, pela ordem em que se escava) e transforma um túnel ou uma rocha em sala. São 3 escavações possíveis: B2, C1 e C2.
- Escavar C1 ou C2 **abre o segundo caminho**: o outro slot do ramo vira túnel automaticamente. Isso divide os invasores, mas também dá opções a eles. É uma decisão tática, não um upgrade automático (D-008).
- Um slot de sala sem sala posicionada funciona como túnel: os invasores passam por ele sem obstáculo.

### 4.2 Escolha de rota dos invasores

Quando a bifurcação está aberta, cada invasor escolhe o ramo pela preferência da sua classe, que fica visível no reconhecimento:

| Classe | Preferência de rota |
|---|---|
| Guerreiro | ramo com **mais monstros** (busca glória) |
| Arqueira | ramo com **menos armadilhas** |
| Mago | ramo **mais curto até o Coração** (em empate, segue o líder) |
| Ladino | ramo com **Sala de Tesouro**; sem tesouro, segue o líder |

O grupo pode se dividir. Esse é o principal recurso espacial do jogo: usar a Sala de Tesouro como isca, separar o Mago dos tanques, etc.

### 4.3 Tipos de sala (MVP: 5 tipos + Coração)

| Sala | Capacidade | Soquetes de armadilha | Função | Evolução (merge, níveis 1→3) |
|---|---|---|---|---|
| **Câmara** | 2 monstros | 1 | sala genérica de combate | nível 3: capacidade 3 |
| **Covil** | 1 monstro | 0 | monstro dentro recebe +40% de atributos | +40% / +70% / +100% |
| **Galeria de Armadilhas** | 1 monstro | 2 | armadilhas mais fortes | armadilhas +30% / +60% / +100% |
| **Sala de Tesouro** | 1 monstro | 1 | se o baú sobreviver à onda: +3/+5/+8 de ouro. Isca para Ladinos | aumenta o ouro do baú |
| **Corredor Estreito** | 1 monstro | 1 | invasores passam **um por vez** (só o da frente luta) e ficam 20% mais lentos | lentidão 20% / 30% / 40% |
| **Coração** (fixo) | 1 Guardião | 0 | ponto final; o Guardião luta antes que o Coração sofra dano | sem merge; evolui pela meta |

**Regra da Sala de Tesouro:** se um invasor chega a uma Sala de Tesouro sem monstros vivos, ele **pega o baú e volta para a superfície**. Não causa dano ao Coração, mas você perde o ouro do baú. Ela é isca e risco ao mesmo tempo.

### 4.4 Armadilhas (MVP: 4)

Ocupam soquetes nas salas e também podem ser fundidas (níveis 1→3).

| Armadilha | Efeito (nível 1) | Pergunta que responde |
|---|---|---|
| **Espinhos** | 20 de dano ao primeiro invasor que entra | dano garantido contra unidades frágeis |
| **Rede** | prende o primeiro invasor por 2 s | separa o líder do grupo |
| **Brasa** | área de fogo: 4 de dano/s por 3 s | contra grupos e Ladinos em bando |
| **Alarme** | monstros da sala e das salas vizinhas ganham +30% de velocidade de ataque por 4 s | amplifica salas fortes |

Os Ladinos **desarmam a primeira armadilha** que encontram.

---

## 5. Monstros

### 5.1 Regras gerais

- Cada espécie tem **família**, **função**, ataque básico, uma passiva e uma **bifurcação no nível 3** (versão A ou B).
- **Níveis 1→4, por merge:** 2 peças idênticas (mesma espécie e mesmo nível) viram 1 peça de nível +1. Cada nível multiplica PV e ATQ por cerca de 1,7.
- No nível 3, o jogador escolhe a variante A ou B. A escolha vale para essa peça nessa run, então é um risco barato.
- **Posição na sala:** tanques ficam à frente e provocam; dano e suporte ficam atrás.

### 5.2 Espécies do MVP (6 iniciais + 2 desbloqueáveis)

Valores iniciais são um chute para calibrar no simulador.

| Espécie | Família | Função | PV / ATQ / ataques por s | Passiva | Nível 3: A / B |
|---|---|---|---|---|---|
| **Slime** | Gosma | Tanque | 60 / 6 / 1,0 | −25% de dano físico recebido | **Rei Slime** (divide-se em 2 ao morrer) / **Slime Ácido** (corrói armadura) |
| **Golem** | Gosma | Tanque pesado | 120 / 10 / 0,5 | Provocação; imune a empurrão | **Runa** (reflete 20%) / **Cerco** (ataque em área) |
| **Morcego** | Besta | Controle | 25 / 4 / 1,5 | Guincho: atordoa 1 s a cada 6 s | **Enxame** (atinge 3 alvos) / **Vampiro** (rouba vida) |
| **Aranha** | Besta | Controle | 35 / 5 / 1,0 | Veneno 3/s por 4 s; teia deixa 15% mais lento | **Viúva** (veneno acumula) / **Tecelã** (prende 1,5 s) |
| **Goblin** | Goblinoide | Dano | 30 / 9 / 1,4 | +50% de dano em alvos atordoados ou lentos | **Saqueador** (+1 ouro por abate) / **Berserker** (fica mais rápido com pouca vida) |
| **Bruxo** | Goblinoide | Suporte/dano | 30 / 7 / 0,8 (projétil) | Aura: +15% de dano para os aliados na sala | **Necromante** (ergue esqueleto) / **Piromante** (projétil em área) |
| *Esqueleto* (meta) | Morto-vivo | Tanque/dano | 45 / 7 / 1,0 | Revive uma vez com 30% de PV | definir na Fase 4 |
| *Espectro* (meta) | Morto-vivo | Controle | 30 / 6 / 1,0 | Atravessa a linha de frente e ataca a retaguarda | definir na Fase 4 |

### 5.3 Sinergia de família (MVP)

Com **2 ou mais monstros da mesma família na mesma sala**:

| Família | Bônus |
|---|---|
| Gosma | escudo de 20% do PV no início da onda |
| Besta | +25% de velocidade de ataque |
| Goblinoide | +1 ouro por abate nessa sala |
| Morto-vivo | +15% de roubo de vida |

Isso dá valor à Câmara (capacidade 2/3) e cria tensão com o Covil (capacidade 1, mas com bônus forte). Sinergias por salas adjacentes ficam para depois do MVP.

---

## 6. Aventureiros

### 6.1 Classes (MVP: 4)

| Classe | Custo no gerador | Ameaça | PV / ATQ | Comportamento | Contra-jogo |
|---|---|---|---|---|---|
| **Guerreiro** | 3 | 2 | 100 / 8, armadura 3 | linha de frente, lento | veneno, Slime Ácido, ataques em sequência |
| **Arqueira** | 3 | 2 | 50 / 10 | à distância; prioriza o monstro com menos PV | Rede, Corredor Estreito, Golem provocando |
| **Mago** | 4 | 3 | 40 / 14, área | dano em área em toda a sala | atordoamento (Morcego), Espinhos, separação de rota |
| **Ladino** | 2 | 1 | 45 / 7, rápido | desarma a 1ª armadilha; procura o tesouro | Brasa, Sala de Tesouro como isca, Corredor Estreito |

### 6.2 Modificadores (aplicados pelo gerador)

Cada modificador muda uma decisão, não só os números:

- **Blindado:** +5 de armadura → pede veneno ou dano fixo.
- **Apressado:** +50% de velocidade → pede Rede e Corredor Estreito.
- **Resistente a fogo / veneno:** desativa uma estratégia específica.
- **Abastado:** dá +3 de ouro ao morrer, mas tem Ameaça +1 → vale arriscar?
- **Devoto:** cura 3 PV/s os aliados próximos → pede foco ou dano em área.

### 6.3 Gerador de ondas

- **Orçamento** = `6 + 3 × onda + bônus de Infâmia`.
- A cada onda, sorteia-se um **tema** (blindados, rápidos, enxame, ladrões, arcanos, misto). O tema define os pesos das classes e dos modificadores.
- **Regra de variedade:** o mesmo tema não pode aparecer em duas ondas seguidas.
- **Onda 4 (Elite):** todos os invasores recebem 1 modificador.
- **Onda 8 (Herói-Chefe):** um entre os **6 heróis de Dungeon Reign**, o outro jogo do estúdio (D-009). Lá eles são os heróis jogáveis; aqui vêm invadir o seu Covil. Cada um é uma pergunta de design:

| Herói-Chefe | Escolta | Mecânica | Pergunta |
|---|---|---|---|
| **Frostine**, Guardiã do Gelo | Guerreiro + Arqueira | muita armadura; aura que deixa os monstros da sala 30% mais lentos para atacar | Você tem dano sustentado que fura armadura? |
| **Kaelen**, Duelista da Tempestade | 2 Ladinos | rápido; a cada 8 s atravessa uma sala sem lutar (Passo da Tempestade); críticos | Sua defesa tem profundidade e controle? |
| **Aurelius**, Sábio Arcano | Mago + Guerreiro | dano em área; escudo que anula o 1º efeito de cada sala; regeneração | Você tem burst e efeitos em sequência? |
| **Ignis**, o Inferno | 2 Guerreiros | fogo em área com queimadura acumulável; imune a fogo (Brasa e Piromante não funcionam) | Seus monstros sobrevivem a fogo em área? |
| **Zephyr**, o Pistoleiro | bando de 6 Ladinos frágeis | à distância, mira primeiro na retaguarda (suportes); críticos | Você protege seus suportes e aguenta um bando? |
| **Varok**, Matador de Chefes | sozinho | vida enorme; dano dobrado contra o monstro mais forte | Sua defesa depende de um único monstro forte? |

O herói da onda 8 é **revelado na onda 5**, para dar tempo de planejar.

---

## 7. Merge, bancada e loja

### 7.1 Bancada

- **6 slots.** Peças compradas vão para a bancada. Monstros, salas e armadilhas ocupam slots.
- Duas peças idênticas se fundem automaticamente ao se encontrarem (na bancada ou arrastando uma sobre a outra na masmorra).
- **Bancada cheia** impede compras. É aqui que está a tensão do merge.

### 7.2 Loja (Mercado das Trevas)

- **4 ofertas** depois de cada onda. A raridade e o nível das ofertas sobem com a onda (nível 2 pode aparecer a partir da onda 5).
- **Re-sortear:** 1 de ouro. **Travar oferta:** grátis, uma por loja.
- **Vender** uma peça devolve metade do valor investido.
- O pool contém apenas o que está desbloqueado na meta.

### 7.3 Economia da run (valores iniciais)

| Fonte / gasto | Valor |
|---|---|
| Ouro inicial | 10 |
| Renda base por onda | 5 |
| Abate | +1 (elite +2) |
| Juros | +1 a cada 5 de ouro guardado (máx. +2) |
| Baú intacto | +3 / +5 / +8 |
| Monstro nível 1 | 3 |
| Armadilha nível 1 | 3 |
| Sala nível 1 | 4 |
| Escavar | 3 → 5 → 7 |
| Re-sortear | 1 |

---

## 8. Poder do Senhor (intervenção ao vivo)

- A **mana** começa em 0 em cada onda, ganha +1 por segundo e vai até 10.
- O jogador escolhe **1 poder** antes da run (a partir dos desbloqueados).
- Usar um poder é um *comando com tick registrado*, o que permite reproduzir a onda exatamente.

| Poder | Custo | Efeito | Uso tático |
|---|---|---|---|
| **Fechar Porta** | 4 | bloqueia um ramo da bifurcação por 6 s | redireciona invasores para o ramo forte |
| **Fúria** | 5 | monstros de uma sala ganham +50% de velocidade de ataque por 5 s | vencer o confronto decisivo |
| **Desabamento** | 7 | 30 de dano em área numa sala; atordoa 1 s | punir grupos e o Mago |
| *Ressurgir* (meta) | 6 | revive o monstro mais forte de uma sala com 50% de PV | |
| *Tremor* (meta) | 3 | empurra os invasores de uma sala de volta para a sala anterior | |
| *Medo* (meta) | 5 | um invasor foge por 3 s | |

---

## 9. Combate

### 9.1 Simulação

- **Tick fixo de 10 por segundo**, com aritmética inteira, para ser determinística em todas as plataformas.
- Os invasores avançam pelo caminho. Ao entrar numa sala, as armadilhas disparam e eles precisam derrotar os monstros dali para seguir em frente (exceto em efeitos especiais).
- **Alvo:** corpo a corpo ataca a frente (ou quem provoca); à distância segue a regra da classe; área atinge todos na sala.
- **Coração:** o invasor enfrenta o Guardião. Se vencer, causa dano igual à sua Ameaça e sai.

### 9.2 Legibilidade (obrigatória já no MVP)

- Números de dano discretos e agrupados; ícones de status acima das unidades.
- **Relatório de onda:**
  - mapa com o ponto onde cada invasor morreu ou chegou;
  - top 3 monstros por dano;
  - invasor que causou mais dano ao Coração e por quê ("Mago: o dano em área matou sua Câmara B1");
  - **dica gerada por regras** ("2 Guerreiros blindados passaram: veneno ou Slime Ácido ajudam").
- **Replay:** botão para rever a última onda. Custa pouco, porque a simulação é determinística.

---

## 10. Meta-progressão

### 10.1 Almas

Fim da run: `Almas = 2 × ondas sobrevividas + 5 se vencer + bônus de Infâmia`.

### 10.2 O que se desbloqueia (lista linear, sem árvore de talentos)

| Categoria | Exemplos | Efeito |
|---|---|---|
| Espécies | Esqueleto, Espectro | entram no pool da loja |
| Salas | (pós-MVP: Cripta, Ponte) | entram no pool |
| Armadilhas | (pós-MVP: Gás, Pêndulo) | entram no pool |
| Poderes | Ressurgir, Tremor, Medo | escolhíveis antes da run |
| Pactos | ver abaixo | modificadores com trade-off |
| Guardião | aparências e uma habilidade passiva escolhível | identidade |
| Cosméticos | temas de masmorra, molduras | só visual |

### 10.3 Pactos (escolha 1 antes da run; trade-off obrigatório)

- **Ganância:** +5 de ouro inicial, Coração com −3 PV.
- **Escavadores:** primeira escavação grátis, renda base −1.
- **Ninhada:** a bancada tem +1 slot, a loja tem −1 oferta.
- **Sangue Frio:** mana começa em 3, poder custa +1.
- **Fortaleza:** Coração com +5 PV, sem juros.
- **Caçador de Tesouros:** baús rendem o dobro e atraem todos os invasores, não só Ladinos.

### 10.4 Longo prazo

- **Infâmia 1→10:** cada nível adiciona um modificador permanente às runs (por exemplo, "invasores com +10% PV", "a loja tem 3 ofertas", "o chefe vem com um modificador"). Vencer no nível N desbloqueia N+1.
- **Run Diária:** mesma semente para todos, uma tentativa por dia, pontuação local (ranking online depois do MVP).
- **Bestiário:** registra espécies, variantes vistas e vitórias com cada uma. Recompensas cosméticas por completar.
- **Conquistas:** "vença com apenas Bestas", "vença sem escavar o ramo C", etc. São desafios autoimpostos que custam quase nada de conteúdo.

---

## 11. Onboarding

A **primeira run é guiada**: 4 ondas, semente fixa, com conteúdo reduzido.

| Momento | Ensina |
|---|---|
| Onda 1 | posicionar um Slime numa Câmara; ver o combate; o Coração e os PV |
| Loja 1 | comprar; a bancada |
| Onda 2 | duas peças iguais → **merge** automático; armadilha Espinhos |
| Loja 2 | escavar o ramo C; a bifurcação e a preferência de rota |
| Onda 3 | Poder do Senhor (Fechar Porta) |
| Onda 4 | mini-chefe simples; relatório de onda e dica |

Depois disso: hub, pactos, Almas e desbloqueios. A loja de dinheiro real só aparece depois da 2ª run completa.

---

## 12. Telas

1. **Hub do Covil:** jogar, Run Diária, desbloqueios, bestiário, cosméticos, configurações.
2. **Preparação de run:** escolher Pacto, Poder e nível de Infâmia.
3. **Masmorra (preparação):** corte lateral, bancada embaixo, reconhecimento no topo, ouro, botão "Iniciar onda".
4. **Invasão:** mesma vista, barra de mana, botão do poder, velocidade 1x/2x.
5. **Relatório + Loja:** relatório resumido, 4 ofertas, re-sortear, travar, vender.
6. **Fim de run:** resultado, Almas, semente, replay da última onda, "Nova run".
7. **Bestiário / Desbloqueios.**

A vista em retrato é **vertical**: superfície no topo e Coração embaixo, o que encaixa naturalmente na tela do celular.

---

## 13. Direção de arte (decidir na Fase 5, com restrições definidas agora)

- **Corte lateral 2D**, câmera fixa, toda a masmorra visível sem rolagem num celular de 6".
- Estilo candidato: **pixel art de 24 a 32 px** (barato, legível, combina com o gênero) ou vetor plano com silhuetas fortes.
- **Custo controlado:** os níveis dos monstros usam o mesmo sprite base com variação de paleta, tamanho e um acessório. As variantes A e B ganham um acessório único cada.
- **Prototipar com placeholders** (Kenney, packs do itch.io com licença verificada). Nenhuma arte final antes do gate da Fase 3.
- **Animações mínimas por unidade:** idle, andar, atacar, morrer (4 a 6 frames cada).

---

## 14. Monetização (revisada)

### Modelo recomendado: grátis para começar + desbloqueio único

| Item | Grátis | Versão Completa (compra única, ~US$ 3,99–4,99, preço regional) |
|---|---|---|
| Runs normais | ✓ | ✓ |
| Espécies, salas e poderes desbloqueáveis com Almas | primeiros 50% da lista | tudo |
| Infâmia | até 3 | até 10 |
| Run Diária | — | ✓ |
| Temas cosméticos extras | — | 1 incluso |

- **Cosméticos avulsos:** temas de masmorra, aparências do Guardião.
- **Sem anúncios** no lançamento. Se os dados pedirem depois, a única opção aceitável é um rewarded que **dobra as Almas** no fim da run, no máximo 1 por dia, e nunca afetando a run em si.
- **Nunca vender:** ouro da run, re-sorteios, PV do Coração, peças.

### Meta honesta

O objetivo do primeiro lançamento é **validação e portfólio**. A receita é um sinal de que o jogo funciona, não a meta principal.

---

## 15. Escopo do MVP (lançamento 1.0)

### Incluído

- 1 bioma; runs de 8 ondas; 6 Heróis-Chefe (heróis de Dungeon Reign);
- 6 slots escaváveis + Coração, com bifurcação;
- 5 salas, 4 armadilhas, 8 espécies (6 + 2 da meta), 4 classes, 5 modificadores;
- bancada, loja, merge (monstros 1→4, salas e armadilhas 1→3), bifurcação no nível 3;
- 3 poderes iniciais + 3 desbloqueáveis; 6 pactos;
- Almas, desbloqueios, Infâmia 1→10, Run Diária local, bestiário;
- relatório de onda, replay da última onda;
- tutorial guiado; save local versionado;
- desbloqueio da Versão Completa + 2 temas cosméticos;
- analytics básicos (opt-in).

### Fora do MVP (ordem sugerida para depois)

1. Ranking online da Run Diária
2. **"Invada o Covil do amigo":** compartilhar o código de uma masmorra (layout + semente) para outro jogador tentar vencer com o grupo de heróis. Barato, porque a simulação é determinística.
3. Segundo bioma (novas espécies, salas e chefes)
4. Sinergias por salas adjacentes
5. Novas classes (Clérigo, Bárbaro)
6. Híbridos entre famílias
7. Eventos semanais com regras especiais

### Critério de corte (mantido da v1)

> Se um sistema não melhora a decisão "como preparo minha masmorra para esta onda sem sacrificar as próximas?", ele é adiado.
