# Brief do swarm (M3-02)

Modelo: `tools/blender/swarm.py`. Inimigo comum que vem em bando (dezenas na tela) e nasce do splitter.

## 1. Fontes
| Fonte | Manda em |
|---|---|
| `docs/ref/swarm.png` | tudo: diabinho-morcego roxo, corpo e cabeça numa bola só, dois chifres curtos, olhos amarelos zangados, presas, asas de membrana vermelho-escura com ossos roxos, rabo fino enrolado, pezinhos |

## 2. Forma
- **Bola única** (cabeça e corpo fundidos), um pouco mais larga que alta. Nada de pescoço.
- Rosto ocupa a metade da frente: arcada em V sobre os olhos (carranca), olhos amarelos acesos em fenda inclinada para dentro, boca larga com duas presas brancas de cima.
- Dois chifres curtos cor de couro (`#7a5a3a`), saindo do alto e abrindo para fora, com orelhas pontudas logo atrás.
- **Asas** maiores que o corpo (envergadura ≈ 4× a largura da bola): três dedos ósseos roxos a partir do "punho" no alto da asa, membrana vermelho-escura entre eles com borda recortada em arcos. A membrana precisa de volume (não pode virar risco visto de lado).
- Rabo fino que desce e enrola, terminando em ponta. Dois pezinhos com garras sob a bola.

## 3. Cor
Roxo `#865489` (luz), `#50295a` (meio), `#2c1236` (sombra). Membrana `#79202c`, sombra `#400b22`. Chifre `#7a5a3a`. Olho amarelo aceso `#ffd34d`. Presas `#f0e8dc`.

## 4. Animação e escala
- Ossos: `hips` (a bola, voa a 1,1 do chão), `wingL`/`wingR` (bate em torno do eixo da frente). As asas partem do pivô do osso, colado à lateral da bola.
- Escala 1,1 (com 0,75 virava um cisco na câmera do jogo). Menor que o herói, mas com as asas abertas legíveis.

## 5. Checagem (o crítico recebe esta lista)
1. Vista de cima, lê-se "morcego-diabinho roxo": bola, dois chifres, asas vermelhas.
2. Os olhos amarelos aparecem de frente e de 3/4.
3. As asas não somem de lado nem de costas.
4. Até cerca de 1.600 triângulos (aparece em bando).
