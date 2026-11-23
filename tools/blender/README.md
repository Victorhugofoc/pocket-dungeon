# Modelos no Blender (D16)

Personagens modelados por script Python no Blender, em segundo plano, sem abrir a janela. Cada script grava:
- `art/<id>.blend`: para abrir e ajustar à mão;
- `src/game/chars/models/<id>.json`: as malhas por osso, que o jogo lê em `src/game/chars/baked.ts`.

## Rodar

```
"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup --python tools/blender/goblin.py -- review
```

Com `review`, também grava capturas do Blender em `.shots/bl-head-*.png` e `.shots/bl-body-*.png` (orc: `bl-orc-*`). Leva uns 10 s.

Modelos prontos: `goblin.py` (+ `goblin_body.py`), `orc.py`, `swarm.py` (asas nos ossos `wingL`/`wingR`), `splitter.py` (só a gosma, sem peças saindo do corpo) (cabeça e corpo num arquivo só; o machado continua por código em `cast-enemies.ts`, porque a pegada de duas mãos vive no osso `weapon`). Bípedes novos (desde o M3-03): `humanoid.py` (pivôs a partir de `b.dims`, cabeça no osso, `finish` com oclusão, exportação e capturas; `o["no_ao"]` tira uma peça da oclusão), usado por `archer.py` e `assassin.py`. De manto (forma `robed`, desde o M3-04): `robed.py` (pano em anéis com pregas, mangas em sino que caem para baixo do mundo na pose da receita, `fore_rot`/`local_dir` para pôr na vertical do mundo o que a mão segura), usado por `spellcaster.py` (cetro no `foreR`) e `summoner.py` (livro no `foreL`). Chefes (M1-06): `bloodfang.py` (tigre; o osso `tail` entra no `Rig` à mão; `stripe` deita listras como fita rente à pele, por raio a partir de um centro, em (yaw, pitch); facão por código), `gravekeeper.py` (bípede de manto: usa `ring_loft` e `bell_sleeve` de `robed.py` sobre as pernas, saia no osso `skirt`; pá e lanterna por código). Bruxa curvada (M9-02): `hexer.py` (de manto, `lean` 0,9 com a cabeça inclinada para cima em `place_head(tilt=...)`; nariz como cápsulas na mesma metaball do rosto, sem contorno no meio da cara; cajado no `foreL` posto em pé no mundo por `local_dir`; lanterna-gaiola acesa no `foreR`). Golem (M9-04): `warden.py` (`rock`: pedra talhada, cubo chanfrado com os vértices sacudidos no espaço do cubo e faces chapadas, um tom por pedra e musgo no alto; `rune` pousa traços acesos na face das pedras por raio). Sapo (M9-05): `leaper.py` (forma `toad` com `ToadRig` próprio: corpo, cabeça e 4 patas rígidas; manchas em anel pintadas pela direção vista do centro (`spotted`), não pela distância à superfície; pálpebras e base dos chifres na mesma metaball da cabeça, para o contorno não cortar a testa; boca pousada na pele por raios). Zumbi (M9-03): `plaguebearer.py` (`band` pousa fitas de pano com espessura na pele por raios a partir de um eixo; `boils` pousa pústulas com a cor pela normal; barril no osso `torso`, deslocado para um ombro para não virar chapéu de frente). Selo de Alma (M10-10): `soul_ward.py` (forma `wisp`: selo no `hips`, alma no `head`; buraco da frente como discos pousados na pele por raio (`BVHTree.ray_cast`), não cavado por metaball negativa, que deixava borda serrilhada; cauda por curva Catmull-Rom). Cavaleiro (M9-01): `shieldbearer.py` (grande elmo com fenda por booleano; escudo e lança modelados na orientação do mundo e levados ao repouso do antebraço por `to_fore`). Anões (desde o M3-05): `dwarf.py` (pivôs baixos, rosto com nariz redondo e barba farta, tronco em barril, braço grosso com punho fechado, perna curta com bota larga; `strip` deita faixas na frente de uma peça, como tatuagens e correias), usado por `bombardier.py` (gorro, óculos, casaco e canhão no tronco) e `berserker.py` (elmo com chifres, tatuagens e manto de pele); bomba e machados por código.

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
