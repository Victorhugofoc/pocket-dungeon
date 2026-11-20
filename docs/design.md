# Dungeon Reign RPG — design

## Visão
Roguelite de ação para PC, em partidas de 30 a 40 minutos. Cada partida é uma run do Dungeon Reign jogada em mapas abertos 3D: um herói, uma spell inicial, 20 ondas em 4 zonas procedurais, melhorias a cada nível, loja, relíquias e um chefe a cada 5 ondas até o chefe final. O **conteúdo e a estrutura** vêm do Dungeon Reign; as **regras de combate e o ritmo** são de jogo de ação e se ajustam jogando (D17). O que muda está escrito em `docs/paridade.md`, com o motivo.

## Decisões do usuário
- Plataforma: PC (teclado e mouse).
- **Partidas como no Dungeon Reign** (decisão D13, 2026-11-15; substitui "progressão persistente, não runs"). Cada partida tem uma seed gerada no início. O save guarda a partida em andamento, e quem parar no meio continua de onde estava, no mesmo mapa.
- **Sem equipamento** (D13): como no original, o poder vem das melhorias de nível, da loja e das relíquias.
- **Zona = 5 ondas** (D13): cada zona é um mapa aberto em 5 trechos; limpar um trecho é uma onda; o chefe fecha a zona nas ondas 5, 10, 15 e 20.
- Spells como no original, em teclas (D2, D12), divididas em ativas e auras (D17).
- **Paridade de conteúdo, não de regra de combate** (decisão D17, 2026-11-20). Ficam iguais ao original: nomes, identidades dos heróis, spells e técnicas, receitas de evolução, relíquias, salas, pactos, eventos e a estrutura de 20 ondas. Os números de combate e de ritmo (contagem e vida dos inimigos, duração da onda, cura, tamanho das áreas) são "adaptado" por padrão: o original foi calibrado para spells que saem sozinhas, e aqui o jogador mira e esquiva. `tests/parity.test.ts` continua como régua de referência, e o ajuste mora numa camada própria em `src/data`. Antes de seguir com arte e paridade, o loop de jogo é ajustado jogando (marco M21).
- Tecnologia: three.js no navegador. Toda a arte é gerada por código, em 3D estilizado; os sprites do Dungeon Reign são só referência de design.
- **Personagens no Blender** (decisão D16, 2026-11-18): os modelos de personagem passam a ser feitos no Blender por script Python (`tools/blender/`), com o `.blend` em `art/` para ajuste à mão, e exportados por osso para o jogo (`src/game/chars/models/*.json`). Esqueleto, animação, contorno e materiais continuam no código. Motivo: o rosto do goblin por primitivas de código não ficou ameaçador depois de várias rodadas; o do Blender ficou muito melhor. Cenário, efeitos e sons seguem por código.
- Conteúdo: heróis, inimigos, chefes, relíquias, spells, eventos e pactos do Dungeon Reign.

## Loop de uma partida
1. Escolhe o herói, a dificuldade e 1 das 4 spells iniciais dele. O jogo gera a seed.
2. Zona 1, onda 1: o primeiro trecho do mapa aberto. Limpar os inimigos do trecho fecha a onda.
3. Entre as ondas, o caminho se **bifurca no mapa**: cada saída leva a uma sala (combate, amaldiçoada, pacto, evento, loja, elite, santuário de relíquia, emboscada de chefe) e mostra de longe o que vem (céu vermelho na Blood Moon, raios na Storm Floor, luz dourada no santuário). O jogador escolhe andando, não num menu. A loja continua garantida a cada 3 ondas.
4. O caminho entre clareiras tem **desvios opcionais** curtos, cada um uma pergunta de risco: baú guardado por campeão, santuário que troca vida por ouro, atalho que pula a loja e dá recompensa.
5. Subir de nível abre 3 melhorias para escolher (comum, rara ou épica). Comum e rara dão atributo; **a épica muda o comportamento** do herói (ex.: a esquiva deixa uma runa). Ouro dos inimigos vai para a loja: spell nova, nível de spell e da técnica, modificadores, relíquia.
6. A onda 5 é o chefe da zona. Vencer leva à próxima zona (ondas 6 a 10), e assim até o chefe final na onda 20.
7. Morrer encerra a partida. Vencer a onda 20 também, com a opção de seguir no modo sem fim, como no original.
8. Entre partidas ficam registros, conquistas e desbloqueios sem ganho de poder (heróis, relíquias, pactos, eventos), como no original. A maestria de cada herói (jogar com ele) libera alternativas, não poder a mais.

## Combate
- **Esquiva é o centro**: todo golpe de inimigo e de chefe tem telegrafia legível (preparo, área no chão, som), e a esquiva dá invulnerabilidade curta.
- **Cura no risco** (D17; substitui a poção, Q3): não há poção. A cura cai no chão (campeão, reação de estado, poça de sala) e some em poucos segundos; curar exige ir buscar.
- **Reações de estado** (D17): os estados se combinam. Congelado + raio = Estilhaço (dano em área); queimando + veneno = Praga (explosão que espalha os dois); tornado + elemento = tornado daquele elemento; atordoado + golpe pelas costas = execução. As sinergias do original continuam nas relíquias; as reações são a sinergia da mão.
- **Spells ativas e auras** (D17): as ativas (Fireball, Iceball, Lightning, Arcane Bolt, Cyclone, Quake Totem...) saem na tecla, com mira. As auras (Blade Orbit, Healing Field, Rune Traps, Venom Nova) saem sozinhas como no original, e a tecla dá um pico que gasta a recarga (a Orbit lança as lâminas, o Field estoura a cura).
- **Terreno na luta**: gargalos, barris explosivos e beiradas onde o empurrão mata.

## Controles
WASD move · mouse mira · botão esquerdo ataca · botão direito ou Q usa a técnica · 1 e 2 lançam as spells (ou o pico da aura) · Espaço esquiva · Esc pausa.

## Zonas
| Zona | Ondas | Chefe |
|---|---|---|
| Bosque Sombrio | 1–5 | Bloodfang |
| Campos da Cripta | 6–10 | Gravekeeper |
| Ermos Vulcânicos | 11–15 | Ember Matriarch |
| O Vazio | 16–20 | Hollow King (final) |

## Em aberto
- Ordem e sorteio das zonas e dos chefes quando houver mais de 4 (o original sorteia os chefes por onda).
- Quais spells são aura e o que faz o pico de cada uma (`M21-06`).
- Lista das épicas de comportamento (`M21-07`) e das reações além das quatro primeiras (`M21-05`).
