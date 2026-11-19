# Modelos no Blender (D16)

Personagens modelados por script Python no Blender, em segundo plano, sem abrir a janela. Cada script grava:
- `art/<id>.blend`: para abrir e ajustar à mão;
- `src/game/chars/models/<id>.json`: as malhas por osso, que o jogo lê em `src/game/chars/baked.ts`.

## Rodar

```
"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup --python tools/blender/goblin.py -- review
```

Com `review`, também grava capturas do Blender em `.shots/bl-head-*.png` e `.shots/bl-body-*.png` (orc: `bl-orc-*`). Leva uns 10 s.

Modelos prontos: `goblin.py` (+ `goblin_body.py`), `orc.py`, `swarm.py` (asas nos ossos `wingL`/`wingR`), `splitter.py` (ossos colocados por raio na malha da gosma) (cabeça e corpo num arquivo só; o machado continua por código em `cast-enemies.ts`, porque a pegada de duas mãos vive no osso `weapon`).

## Como funciona

- `kit.py`:
  - formas: metaballs (`meta`, `EL`, `CAP`; elementos negativos cavam órbitas e boca), tubos, bolas e cones;
  - acabamento: suavização e redução de triângulos (`smooth(target=...)`), cor por vértice (`paint`);
  - oclusão assada nas cavidades (`bake_ao`, Cycles na CPU);
  - exportação compactada (`export_parts`).
- No Blender, z fica para cima e a frente em -y. Na exportação vira o espaço do three: (x, z, -y).
- O corpo é modelado ereto, com cada parte presa ao pivô do osso do jogo. A curva e o agachamento vêm da animação.
- Os pivôs (`goblin_body.py`) precisam bater com `b.dims` da receita em `cast-enemies.ts`.
- Chaves de exportação:
  - `osso`: sólido, com contorno;
  - `osso@flat`: sem contorno (pupila, boca, dentes);
  - `osso@lit`: brilho (olhos).
