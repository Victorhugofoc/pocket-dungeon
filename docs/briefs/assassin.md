# Brief do assassin (M3-03)

Modelo: `tools/blender/assassin.py` (base comum em `tools/blender/humanoid.py`). As adagas continuam por código (`dagger()` em `kit.ts`), uma em cada mão; o cachecol é uma fita com física (`b.ribbons`).

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/assassin.png` | tudo: ninja ágil em base baixa, máscara branca de raposa com marcas vermelhas, cabelo preto preso, cachecol preto longo esvoaçando, roupa cinza com faixa vermelha, luvas e calça larga presa nas canelas |
| Ficha da seção 7 do roadmap | "Máscara branca de raposa, cachecol preto"; cinza, vermelho, preto; bípede ágil, base baixa |

## 2. Forma
- Corpo enxuto e atlético: ombros médios, cintura fina, nada de músculo exagerado.
- **Máscara de raposa** cobrindo o rosto inteiro: focinho comprido e fino para a frente, orelhas pontudas em cima, olhos em fenda escura, marcas vermelhas nas bochechas, na testa e nas orelhas.
- Cabelo preto preso no alto de trás (coque), com o cachecol preto saindo do pescoço e caindo comprido para trás.
- Quimono cinza curto, gola transpassada, bordas e faixa da cintura vermelhas; braçadeiras vermelhas; luvas pretas.
- Calça cinza larga, bufante no joelho, presa nas canelas com faixas claras; sapatilhas pretas com tornozeleira vermelha.

## 3. Cor
Cinza `#8a8f99` (sombra `#4a4e58`), cinza escuro `#5a5e68`. Vermelho `#c8281e` (sombra `#6a1010`). Preto `#1e1e24`. Máscara `#f2f2f2` com marcas `#c8281e`. Faixas claras `#d8d4cc`.

## 4. Animação
Estilo `thrust`, base baixa (`crouch` alto). O cachecol balança sozinho pela física de fita.

## 5. Checagem (o crítico recebe esta lista)
1. De cima, lê-se "ninja de máscara de raposa": máscara branca com orelhas, cachecol preto, faixa vermelha.
2. A máscara é de raposa (focinho e orelhas), não um rosto humano branco.
3. Contorno preto contínuo em todas as bordas.
4. Até cerca de 3.800 triângulos.

## 6. Já recusado pelo usuário (revisão 1, 2026-11-18)
- Aprovado: o conceito, a máscara e o cabelo de trás.
- "Pose bem feia" e "corpo genérico": corpo de manequim (tubos lisos e iguais) e postura de pé em A. Precisa de corpo de lutador: ombros e peito mais fortes, braços e coxas com volume (antebraço, panturrilha), cintura marcada, roupa com caimento (mangas, calça).
- "Corpo muito fino" e "pose não é de lutador": base de luta, baixa e larga, joelhos dobrados, um pé à frente, tronco inclinado, braços armados com as adagas (uma à frente, outra recuada), como no sprite. Avaliar se a postura de repouso precisa de ajuste no `animate.ts` (estilo `thrust`) e não só no modelo.
