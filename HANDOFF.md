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

## Direção de arte decidida: tudo por código, em 3D
O usuário testou sprites x blocos e decidiu: arte **gerada por código**, num nível bem acima dos blocos iniciais (referência dele: um simulador de voo procedural em three.js). Os modos de sprites e de blocos foram removidos.
Primeira passada feita (0.2):
- **Render** (`render.ts`): HDR + MSAA, bloom, correção de cor por zona, vinheta. Qualidade baixa/média/alta na pausa; F3 mostra fps.
- **Cenário** (`world.ts`, `flora.ts`): chão com shader procedural e máscara de terra batida, ~70 mil lâminas de grama com vento que o herói amassa, árvores/pinheiros/pedras/túmulos/pilares/cristais modelados por código em 3 variantes, flores, fogueira, partículas de ambiente por zona.
- **Recorte**: o que fica entre a câmera e o herói some num círculo pontilhado (`shared.ts`).
- **Personagens** (`chars.ts`): os 9 heróis, 10 inimigos e 4 chefes modelados a partir dos sprites do Dungeon Reign, com esqueleto (cotovelo, joelho, capa, cauda) e animação por estilo (golpe, tiro, magia, estocada, arremesso).
- Roda do mouse dá zoom.

Segunda passada (0.3), depois do retorno "parece Roblox, movimento de boneco de palito, sem física":
- **Anatomia e acabamento** (`chars.ts`): membros afunilados, peito mais largo que a cintura, queixo/nariz/orelhas, mãos e pés maiores, postura por peso (pesados andam curvados), contorno escuro e luz de recorte.
- **Movimento com física** (`animateChar`): passada ligada à distância real percorrida, pernas na direção em que o corpo anda, molas para inclinação na aceleração, capa/cauda/saia, atraso da cabeça e do antebraço; golpe com antecipação e passagem do ponto; `kickRig` faz o corpo ceder ao apanhar e define para onde cai ao morrer.
- **Empurrão real**: inimigos ganham velocidade de recuo ao apanhar (`TUNING.enemy.knockback`).
- **Efeitos** (`fx.ts`): pontos de luz aditivos (faíscas, rastro de projétil, clarão de impacto), meia-lua do golpe por shader, luz pontual em explosões.
Nada disso foi visto em movimento por mim (só quadros parados); o usuário precisa confirmar.

Próximas passadas de arte, em ordem de retorno:
1. Efeitos das técnicas dos heróis e dos ataques de chefe (telegrafias ainda são discos vermelhos lisos).
2. Relevo: o chão é plano. Colinas, penhascos na borda, água.
3. Polimento dos personagens (rostos, mãos, Ember Matriarch e Bloodfang) e animações de dano/esquiva.
4. Interface: ícones desenhados por código no lugar de emoji.

## O que NÃO foi validado
- Eu só testo em navegador headless com renderização por software: confirma que renderiza certo, não o desempenho. O usuário jogou a 0.1 e achou a jogabilidade boa; **a 0.2 (visual novo) ainda não foi medida numa GPU real** (pedir o fps do F3).
- Balanceamento é primeira passada, nunca jogado de ponta a ponta por uma pessoa: curva de XP, vida/dano por nível e chefes em `src/data/tuning.ts` e `src/data/enemies.ts`.

## Limitações conhecidas
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
