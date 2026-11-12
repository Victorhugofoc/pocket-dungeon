# Dungeon Reign RPG — handoff

Leia este arquivo antes de qualquer coisa.

## O que é
O projeto anterior deste repo (Covil, Godot) foi descartado por decisão do usuário; o histórico continua no git até o commit `47749e3`.
Agora o repo é um RPG de ação em three.js para PC, com o conteúdo do Dungeon Reign (`Victorhugofoc/dungeon-idle`).

## Estado atual — protótipo 0.1 (jogável do início ao chefe final)
- **Heróis:** os 9 do Dungeon Reign, cada um com ataque e técnica próprios (`src/data/heroes.ts`).
- **Zonas:** 4 mapas abertos procedurais de 240x240 (Bosque, Cripta, Vulcão, Vazio), cada um com ~24 acampamentos, caminho até a arena e um chefe (Bloodfang, Gravekeeper, Ember Matriarch, Hollow King). Viajar gera um mapa novo.
- **Inimigos:** 10 tipos com 5 comportamentos (corpo a corpo, à distância, investida, invocador, morteiro), mais campeões.
- **Chefes:** 7 padrões telegrafados (pancada, investida, nova, leque, invocação, meteoros, espiral) e fúria aos 30% de vida.
- **Progressão persistente:** nível (até 60), 4 atributos, equipamentos em 3 espaços com 5 raridades e 16 afixos, 20 relíquias (1 de 3 por chefe; chance pequena em campeões). Save em `localStorage`.
- **Sem assets:** personagens de blocos animados por código, cenário instanciado, partículas, sons sintetizados.
- 21 testes do núcleo (`npm test`).

## Comparação de visual em andamento (decisão pendente do usuário)
O usuário achou que os bonecos de blocos não lembram a arte do Dungeon Reign. Há dois modos no jogo, trocados com a tecla **V** ou na tela de título (`src/game/visual.ts`):
- **sprites** (`src/game/sprites.ts`): as folhas de pixel art do Dungeon Reign como sprites em pé no cenário 3D, câmera mais baixa e render em ~540 linhas ampliado sem suavizar. As folhas foram copiadas para `src/assets/sprites/` e o manifesto `src/data/sprites.ts` é gerado a partir de `dungeon-idle` (5 linhas: parado, andando, atacando, dano, morrendo).
- **blocos** (`src/game/looks.ts`): cada personagem remodelado em blocos à mão (cores e peças marcantes).
Quando o usuário escolher, remover o modo descartado e atualizar `CLAUDE.md` (hoje diz "sem assets") e `docs/design.md`.

## O que NÃO foi validado
- Só foi testado em navegador headless com renderização por software (roda sem erros, mas a ~2–25 fps, o que não diz nada sobre desempenho real). **Falta jogar numa máquina com GPU.**
- Balanceamento é primeira passada, nunca jogado de ponta a ponta por uma pessoa: curva de XP, vida/dano por nível e chefes em `src/data/tuning.ts` e `src/data/enemies.ts`.

## Limitações conhecidas
- Árvores entre a câmera e o herói tapam a visão (há só um anel no chão visível através delas). Falta esmaecer o que oclui.
- Sem gamepad, sem tela de opções (volume, teclas), sem música.
- Não dá para vender ou desmontar item (só descartar); não há ouro nem loja.
- Os heróis têm 1 técnica cada; as spells do Dungeon Reign (Fireball, Blade Orbit...) não foram portadas.
- Inimigos do original ainda não portados: shieldbearer, hexer, plaguebearer, warden, leaper. Chefes: faltam 9 dos 13.

## Próximos passos sugeridos (confirmar com o usuário)
1. Usuário joga e diz se andar e bater é divertido (é a pergunta que decide o projeto).
2. Ajustar sensação de combate e balanceamento com base nisso.
3. Depois: mais habilidades por herói (spells), loja/ouro, mais chefes e zonas, dificuldade pós-final.

## Pendências com o usuário
- Nome definitivo do jogo ("Dungeon Reign RPG" é provisório).
- Onde hospedar a versão jogável (GitHub Pages, itch.io).
