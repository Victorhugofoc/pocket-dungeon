# Dungeon Reign RPG — design (protótipo 0.1)

## Visão
RPG de ação para PC em que você joga com um herói só, explora mapas abertos procedurais, mata monstros, sobe de nível devagar e farma equipamentos e relíquias, enfrentando um chefe por zona até o chefe final.

## Decisões do usuário
- Plataforma: PC (teclado e mouse).
- Progressão persistente (um save contínuo), não runs.
- Tecnologia: three.js no navegador, tudo procedural, sem assets.
- Conteúdo: heróis, inimigos, chefes e relíquias do Dungeon Reign.

## Loop
1. Escolhe um dos 9 heróis (um por save).
2. Entra numa zona: mapa novo a cada visita, com caminho da fogueira até a arena do chefe.
3. Limpa acampamentos: XP, itens (9% por monstro; campeão sempre dropa), orbes de cura.
4. Derrota o chefe: 3 itens, escolhe 1 de 3 relíquias, abre o portal e libera a próxima zona.
5. Volta a zonas anteriores para farmar quando a próxima estiver difícil.

## Controles
WASD move · mouse mira · botão esquerdo ataca · botão direito ou Q usa a técnica · Espaço esquiva · F poção · E portal · I inventário · M mapa · Esc pausa.

## Sistemas
- **Atributos** (1 ponto por nível): Força, Vigor, Agilidade, Foco.
- **Equipamento:** arma, armadura, amuleto. Raridades comum, incomum, raro, épico, lendário (0 a 4 afixos).
- **Relíquias:** bônus permanentes, sem limite de quantidade.
- **Morte:** volta à fogueira da zona sem perder nada; monstros vivos recuperam a vida.

## Zonas
| Zona | Nível | Chefe |
|---|---|---|
| Bosque Sombrio | 1–5 | Bloodfang |
| Campos da Cripta | 6–10 | Gravekeeper |
| Ermos Vulcânicos | 11–15 | Ember Matriarch |
| O Vazio | 16–20 | Hollow King (final) |

## Em aberto
- Segundo e terceiro botão de habilidade (spells do Dungeon Reign como habilidades equipáveis?).
- Economia: ouro, loja, desmontar itens.
- O que acontece depois do chefe final (dificuldades, zonas mais fundas).
