# Brief do storm_tyrant (M10-07)

Modelo: `tools/blender/storm_tyrant.py`. Forma `djinn` em `build.ts`/`animate.ts` (a do Mirage Djinn): tronco, cabeça e braços como os bípedes (pivôs de `Rig`, iguais a `b.dims` da receita em `cast-bosses.ts`), sem pernas e sem cadeia de cauda; a nuvem e a saia do manto ficam no `hips` (flutua junto), a capa no osso `cape`.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/storm_tyrant.png` | tudo. Rei velho e forte de armadura de placas prateada flutuando sobre uma nuvem cinza-azulada escura em gomos redondos com espirais. Ombreiras enormes em lâminas sobrepostas; peitoral liso; gemas ciano em engaste de ouro na gola, uma de cada lado. Barba branca cheia até o peito, bigode e sobrancelhas brancas grossas, cabelo branco dos lados; olhar severo. Coroa de prata alta, de pontas, com gemas ciano. Cinto largo de couro marrom com fivela prateada e gema ciano. Da cintura cai um manto azul-marinho até a nuvem, aberto na frente com duas faixas douradas. Capa azul-marinho comprida atrás, caindo de um lado. Antebraços de aço; mãos nuas: a direita fechada em punho na frente do corpo, a esquerda aberta para cima, para o lado. |
| `bosses.lua` | `storm_tyrant`: Stormcaller, Storm Field, cor `{0.55, 0.6, 1.0}`; mantém 190 px. `techAttacks` com as duas mãos sobre a coroa (Storm Field e Radial). |

## 2. Medidas (antes da escala da receita, 2,5)
- Quadril a 0,95, ombros a 0,46 do centro (as ombreiras passam disso), braço 0,34 + antebraço e mão 0,34; cabeça com coroa até ~2,0.
- Nuvem: de 0 a ~0,7 de altura, ~1,3 de largura, mais larga que os ombros; a saia do manto entra nela.

## 3. Cor
Aço `#d0d6de` / `#8a929e` / `#464c58` / `#16181e`; azul-marinho `#22305e` (sombra `#10183a`, claro `#3c4f8e`); ouro `#e2b04a`; ciano das gemas `#3ad8ff` → `#c8f6ff` (acesas); pele `#e0a07a`; barba e cabelo `#f2f2f4` com sombra `#a8b0bc`; couro `#4a3020`; nuvem `#2a3448` → `#56688a`, espirais `#7a8eae`.

## 4. Animação
Flutua subindo e descendo devagar (forma `djinn`); a capa balança. Estilo `cast` nos braços.

## 5. Checagem
1. Na câmera do jogo lê-se "rei de armadura com coroa sobre uma nuvem", não "cavaleiro em pé" nem "fantasma".
2. Barba branca grande, visível de cima; coroa com pontas e gemas ciano.
3. Ombreiras maiores que a cabeça, armadura prateada contra manto azul escuro.
4. A nuvem é escura, em gomos redondos, e não parece pedra nem espuma branca.

## 6. Crítico (2026-11-24)
6 rodadas, de grave para médio. Corrigido: tronco liso ("collant", depois "peitorais de fisiculturista com mamilos") virou couraça em barril de frente chata, com friso em relevo na borda de baixo (pousado na placa por raios), sombra sob a gola e atrás da barba, duas lâminas da barriga com degrau; gemas da gola subiram para a junção com as ombreiras, maiores; braço musculoso virou tubo de aço com dois anéis de braçadeira; ombreiras moles e facetadas viraram 3 domos lisos com friso escuro na borda, inclinados pelo braço (as bolas do `kit.ball` saem facetadas: `sball` liga o sombreado suave); coroa azul-escura de 9 pontas finas virou prata clara de 5 pontas largas com gema ciano no centro; barba curta enterrada no peitoral vem para a frente, larga como o rosto, até o meio do peito, ponta em mechas; sobrancelhas que cobriam os olhos como óculos viraram sobrancelhas brancas em V, olho claro de pupila escura, nariz menor; bigode em tábua virou duas mechas curvas; nuca de pele virou cabelo branco até os ombros; pele pêssego; nuvem azul saturada virou cinza-ardósia, 35% mais larga, espirais um tom acima, também atrás; capa em prancha que atravessava a nuvem virou trapézio que termina acima dela com barra em pontas, sem abas sob as axilas; mão aberta que virava graveto virou palma em leque, mãos 1,6×; punho à esquerda da tela e mão aberta à direita, como no sprite. Oscilaram e ficaram no meio: tom do aço (claro ↔ escuro), número de gemas na coroa, quanto a capa envolve os lados, comprimento da barba. Médios restantes: capa pouco visível de frente; ombreiras ainda arredondadas ("almofadas"); nuvem regular demais, em anel; pose de ataque é o `cast` comum. ~24 mil triângulos.
