import "./ui/style.css";
import { Game } from "./game/game";
import { Ui } from "./ui/ui";
import { characterRig } from "./game/rigs";
import { animateRig } from "./game/models";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const texts = document.getElementById("texts") as HTMLElement;
const root = document.getElementById("ui") as HTMLElement;

const game = new Game(canvas, texts);
const ui = new Ui(game, root);

// acesso pelo console para depurar e testar (ex.: __game.gainXp(5000))
Object.assign(window, { __game: game, __ui: ui, __rig: characterRig, __anim: animateRig });
