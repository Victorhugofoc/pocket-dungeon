// Personagens modelados por código. `kit` = primitivas e escultura; `cast-*` = receita de cada personagem;
// `build` = montagem do esqueleto e das malhas; `animate` = animação procedural.
export { animateChar, nextShot, type CharState } from "./animate";
export { buildChar, castIds, hasChar, kickRig } from "./build";
