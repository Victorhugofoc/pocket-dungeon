# Dungeon Reign RPG — design

## Visão
RPG de ação para PC em que cada partida é uma run do Dungeon Reign jogada em mapas abertos 3D: um herói, uma spell inicial, 20 ondas em 4 zonas procedurais, melhorias a cada nível, loja, relíquias e um chefe a cada 5 ondas até o chefe final. A estrutura de jogo é **a mesma do Dungeon Reign**; o que muda está escrito em `docs/paridade.md`, com o motivo.

## Decisões do usuário
- Plataforma: PC (teclado e mouse).
- **Partidas como no Dungeon Reign** (decisão D13, 2026-11-15; substitui "progressão persistente, não runs"). Cada partida tem uma seed gerada no início. O save guarda a partida em andamento, e quem parar no meio continua de onde estava, no mesmo mapa.
- **Sem equipamento** (D13): como no original, o poder vem das melhorias de nível, da loja e das relíquias.
- **Zona = 5 ondas** (D13): cada zona é um mapa aberto em 5 trechos; limpar um trecho é uma onda; o chefe fecha a zona nas ondas 5, 10, 15 e 20.
- Spells como no original, em teclas (D2, D12).
- Tecnologia: three.js no navegador. Toda a arte é gerada por código, em 3D estilizado; os sprites do Dungeon Reign são só referência de design.
- **Personagens no Blender** (decisão D16, 2026-11-18): os modelos de personagem passam a ser feitos no Blender por script Python (`tools/blender/`), com o `.blend` em `art/` para ajuste à mão, e exportados por osso para o jogo (`src/game/chars/models/*.json`). Esqueleto, animação, contorno e materiais continuam no código. Motivo: o rosto do goblin por primitivas de código não ficou ameaçador depois de várias rodadas; o do Blender ficou muito melhor. Cenário, efeitos e sons seguem por código.
- Conteúdo: heróis, inimigos, chefes, relíquias, spells, eventos e pactos do Dungeon Reign.

## Loop de uma partida
1. Escolhe o herói, a dificuldade e 1 das 4 spells iniciais dele. O jogo gera a seed.
2. Zona 1, onda 1: o primeiro trecho do mapa aberto. Limpar os inimigos do trecho fecha a onda.
3. Entre as ondas, o mapa da partida oferece 3 caminhos (sala de combate, sala amaldiçoada, pacto, evento, loja, elite, santuário de relíquia, emboscada de chefe); a loja aparece garantida a cada 3 ondas.
4. Subir de nível abre 3 melhorias para escolher (comum, rara ou épica). Ouro dos inimigos vai para a loja: spell nova, nível de spell e da técnica, modificadores, relíquia.
5. A onda 5 é o chefe da zona. Vencer leva à próxima zona (ondas 6 a 10), e assim até o chefe final na onda 20.
6. Morrer encerra a partida. Vencer a onda 20 também, com a opção de seguir no modo sem fim, como no original.
7. Entre partidas ficam só registros, conquistas e desbloqueios sem ganho de poder (heróis, relíquias, pactos, eventos), como no original.

## Controles
WASD move · mouse mira · botão esquerdo ataca · botão direito ou Q usa a técnica · 1 e 2 lançam as spells · Espaço esquiva · F poção · Esc pausa.

## Zonas
| Zona | Ondas | Chefe |
|---|---|---|
| Bosque Sombrio | 1–5 | Bloodfang |
| Campos da Cripta | 6–10 | Gravekeeper |
| Ermos Vulcânicos | 11–15 | Ember Matriarch |
| O Vazio | 16–20 | Hollow King (final) |

## Em aberto
- Ordem e sorteio das zonas e dos chefes quando houver mais de 4 (o original sorteia os chefes por onda).
- Poção: o original não tem; fica até a paridade da partida (`M20-00`) decidir.
