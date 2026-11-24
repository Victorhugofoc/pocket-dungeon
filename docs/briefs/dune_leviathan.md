# Brief do dune_leviathan (M10-02)

Modelo: `tools/blender/dune_leviathan.py`. Forma nova `worm` em `build.ts`/`animate.ts`: o monte de areia no `hips` (no chão), o corpo em cadeia `tail` → `tail2` … `tail5` e a cabeça no `head` (pontos em `SPINE`, repetidos na receita em `b.joints`). Mergulho e emersão pela animação (`AnimState.burrow`).

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/dune_leviathan.png` e a folha inteira (`dungeon-idle/assets/enemies/bosses/dune_leviathan_sheet.png`) | tudo. Verme grosso saindo de um monte de areia com respingos, em C: sobe, arqueia e a cabeça vem para a frente. Placas marrons em faixas cobrindo costas e lados, barriga rosa em gomos só na parte de dentro da curva. Boca redonda enorme na frente, gengiva rosa e anéis de dentes brancos, fundo vermelho-escuro. Linha 3 (ataque): bote para a frente e para baixo. Linha 6 (morte): tomba de lado. |
| `bosses.lua` | `dune_leviathan`: Burrower, Burrow, cor `{0.95, 0.75, 0.4}`; mantém 150 px. |

## 2. Medidas (antes da escala da receita)
- Altura ~1,25; corpo com raio ~0,26; cabeça um pouco mais larga que o corpo; monte de areia com raio ~0,6.

## 3. Cor
Placas `#8a6a3a` (sombra `#3e2c16`, claro `#c8a46a`); barriga `#f0a8a0`; areia `#d9a85a`; boca `#4a0a12`, gengiva `#d8606a`, dentes `#fff4e0`.

## 4. Animação
Parado: balança gomo a gomo. Preparo: encolhe para trás. Golpe: bote para a frente. Burrow: desce pelo monte, que afunda junto, e sobe no ponto novo. Morte: tomba de lado.

## 5. Checagem
1. Na câmera do jogo lê-se "verme da areia com bocarra", não "cano" nem "minhoca rosa".
2. Placas marrons dominam; rosa só na curva de dentro.
3. Boca com dentes visível de frente e de cima.
4. Monte de areia no chão, sem peças soltas.

## 6. Crítico (2026-11-23)
4 rodadas. Corrigido: tubo quase reto ("cano com boca") virou C de gancho com a coluna mais alta; boca de anel rosa com dentes finos e cinza virou cabeça oval (1,3 : 1) com borda de casca, gengiva fina sem contorno, duas fileiras de presas cor de marfim com as dos cantos maiores e garganta vinho que escurece para o fundo (a bola da nuca e o último gomo entravam na boca e apareciam por dentro); barriga rosa do lado errado e escura virou faixa salmão larga na parte de dentro da curva, com sulcos, num tom que não depende da luz; placas pequenas viraram couraça em telhas com a borda de baixo escura; monte virou duna assimétrica com cratera, sem contorno, com lascas largas; no bote só o terço de cima enrola. Oscilaram e ficaram no meio: ângulo da boca (para baixo ↔ para cima; ficou na horizontal, para aparecer de cima), aro da boca marrom ↔ rosa, cor das placas (mais escura ↔ mais quente), tamanho dos dentes (2–3× maiores ↔ 25–30% do raio), grossura do corpo (igual à cabeça ↔ 15–20% mais fino). Médios restantes: placas lisas demais ("almofadas"), sem salpicado nem quina; pose de ataque ainda esconde parte da boca; monte grande de cima. ~8,7 mil triângulos.
