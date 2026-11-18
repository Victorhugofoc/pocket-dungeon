// Prévia da biblioteca de efeitos (M5-02; só no `npm run dev`, fora do build do jogo). Monta a arena do chefe de uma zona com o
// mesmo renderizador, luz e pós-processamento do jogo, e repete cada primitiva de `game/vfx.ts` em laço, lado a lado, com um herói
// parado para escala. Serve para o crítico cego (docs/critic.md). Abrir em /fx.html. Parâmetros: ?zone=bosque|cripta|vulcao|vazio&focus=<slot>
import * as THREE from "three";
import { generateZone } from "./core/worldgen";
import { ZONES, ZONE_ORDER } from "./data/zones";
import { Fx } from "./game/fx";
import { animateRig } from "./game/models";
import { Pipeline } from "./game/render";
import { characterRig } from "./game/rigs";
import { U } from "./game/shared";
import { SUN_OFFSET } from "./game/air";
import { buildWorld, setZoneAtmosphere } from "./game/world";
import type { BeamHandle, MoveHandle, TrailHandle } from "./game/vfx";

const q = new URLSearchParams(location.search);
const zone = ZONES[q.get("zone") ?? "bosque"] ?? ZONES.bosque;

const canvas = document.getElementById("view") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.info.autoReset = false;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 1, 400);
const pipeline = new Pipeline(renderer, scene, camera);
const fx = new Fx(scene, document.getElementById("texts")!);
const lib = fx.lib;

const hemi = new THREE.HemisphereLight(zone.ambient, zone.ground[2], zone.ambientIntensity);
const sun = new THREE.DirectionalLight(zone.sun, zone.sunIntensity);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 160 });
sun.shadow.bias = -0.0004;
scene.add(hemi, sun, sun.target);

const layout = generateZone(zone, 1);
buildWorld(scene, zone, layout);
pipeline.setGrade(zone);
setZoneAtmosphere(scene, zone);
const C = { x: layout.boss.x, z: layout.boss.z };

const hero = characterRig("varok", "hero");
hero.root.position.set(C.x, 0, C.z);
hero.root.rotation.y = 0.4;
scene.add(hero.root);

// ---------------------------------------------------------------- vitrines: uma por primitiva, repetidas a cada PERIOD s
const PERIOD = 2;
interface Slot { name: string; dx: number; dz: number; start(x: number, z: number): void; tick?(x: number, z: number, t: number, dt: number): void; stop?(): void }
let beam: BeamHandle | null = null, zap: BeamHandle | null = null, trail: TrailHandle | null = null, orb: MoveHandle | null = null;
const SLOTS: Slot[] = [
  { name: "ring", dx: -10, dz: -4, start: (x, z) => lib.ring(x, z, { radius: 4, color: 0xff7a1a, core: 0xfff0b0, dur: 0.6 }) },
  { name: "burst", dx: -3.3, dz: -4, start: (x, z) => lib.burst(x, 1.3, z, { radius: 1.8, color: 0xb04dff, core: 0xf4e0ff, dur: 0.4 }) },
  {
    name: "beam", dx: 3.3, dz: -4,
    start: (x, z) => { beam = lib.beam(x - 3, 1.3, z, x + 3, 1.3, z, { color: 0x6fd8ff, core: 0xdcf8ff, width: 0.45, dur: 1.6 }); },
    tick: (x, z, t) => { const a = -0.6 + t * 0.75; beam?.set(x - 3, 1.3, z + 1, x - 3 + Math.cos(a) * 6.5, 1.0, z + 1 + Math.sin(a) * 6.5); },
  },
  {
    name: "lightning", dx: 10, dz: -4,
    start: (x, z) => { zap = lib.lightning(x - 3, 1.3, z - 1, x + 3, 0.9, z + 1.5, { color: 0xffd23a, core: 0xfff6c8, dur: 0.6, seed: 3 }); },
  },
  {
    name: "trail", dx: -10, dz: 3.5,
    start: () => { trail?.kill(); trail = lib.trail({ color: 0x5fe04a, core: 0xeaffd0, life: 0.35 }); },
    tick: (x, z, t) => {
      if (t > 1.2) { trail?.kill(); return; }
      const a = t * 5.2, px = x + Math.cos(a) * 3, pz = z + Math.sin(a) * 1.8, py = 1.2 + Math.sin(a * 2) * 0.3;
      trail?.push(px, py, pz);
    },
  },
  { name: "pillar", dx: -3.3, dz: 3.5, start: (x, z) => lib.pillar(x, z, { radius: 1.2, height: 7, color: 0xffc23a, core: 0xfffbe6, dur: 0.9 }) },
  { name: "crack", dx: 3.3, dz: 3.5, start: (x, z) => lib.groundCrack(x, z, { radius: 3.5, color: 0xff4a10, core: 0xffe08a, dur: 1.6, seed: 7 }) },
  {
    name: "orbit", dx: 10, dz: 3.5,
    start: (x, z) => { orb = lib.orbit(x, 1.3, z, { radius: 1.6, count: 5, color: 0x7ad8ff, core: 0xf0fbff, speed: 0.7, dur: 1.8 }); },
    tick: (x, z, t) => orb?.move(x + Math.sin(t * 2) * 0.6, 1.3, z),
  },
];
let focus = q.get("focus");

// ---------------------------------------------------------------- câmera e tempo
function placeCamera(): void {
  const s = SLOTS.find((s) => s.name === focus);
  const x = C.x + (s?.dx ?? 0), z = C.z + (s?.dz ?? 0), zoom = s ? 0.55 : 1.1;
  camera.position.set(x, 19.5 * zoom, z + 16 * zoom);
  camera.lookAt(x, 0.8, z);
  sun.position.set(x + SUN_OFFSET.x, SUN_OFFSET.y, z + SUN_OFFSET.z);
  sun.target.position.set(x, 0, z - 4);
  camera.updateMatrixWorld();
  U.uCenter.value.set(x, z - 8);
  U.uHero.value.set(C.x, 0, C.z);
}

const proj = new THREE.Vector3();
let time = 0, loopT = PERIOD; // começa no fim do laço para disparar já no 1º quadro
function tick(dt: number): void {
  time += dt;
  U.uTime.value = time;
  loopT += dt;
  if (loopT >= PERIOD) {
    loopT -= PERIOD;
    for (const s of SLOTS) s.start(C.x + s.dx, C.z + s.dz);
  }
  for (const s of SLOTS) s.tick?.(C.x + s.dx, C.z + s.dz, loopT, dt);
  // recorte que revela o herói atrás das árvores, como em game.ts (sem isso os uniforms ficam zerados e a tela some)
  const size = pipeline.bufferSize;
  proj.set(C.x, 1.1, C.z).project(camera);
  U.uFadePos.value.set((proj.x * 0.5 + 0.5) * size.x, (proj.y * 0.5 + 0.5) * size.y);
  U.uFadeRadius.value = size.y * 0.085;
  U.uFadeDepth.value = proj.z * 0.5 + 0.5 - 0.0004;
  animateRig(hero, { t: time, move: 0, attack: -1, windup: 0, dead: 0, roar: -1, rage: 0 });
  fx.update(dt, camera, window.innerWidth, window.innerHeight);
}

function resize(w = window.innerWidth, h = window.innerHeight, ratio = Math.min(window.devicePixelRatio, 1.5)): void {
  renderer.setPixelRatio(ratio);
  renderer.setSize(w, h, false);
  pipeline.setSize(w, h, ratio);
  fx.setPointScale(pipeline.bufferSize.y / (2 * Math.tan((camera.fov * Math.PI) / 360)));
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", () => resize());

const bar = document.getElementById("bar")!, hint = document.getElementById("hint")!;
function refresh(): void {
  bar.innerHTML = "";
  for (const name of ["all", ...SLOTS.map((s) => s.name)]) {
    const el = document.createElement("button");
    el.textContent = name;
    if ((focus ?? "all") === name) el.className = "on";
    el.onclick = () => { focus = name === "all" ? null : name; placeCamera(); refresh(); };
    bar.appendChild(el);
  }
  for (const id of ZONE_ORDER) {
    const el = document.createElement("button");
    el.textContent = ZONES[id].name;
    if (id === zone.id) el.className = "on";
    el.onclick = () => { q.set("zone", id); location.search = q.toString(); };
    bar.appendChild(el);
  }
}

let last = performance.now();
function frame(now: number): void {
  const real = (now - last) / 1000 || 0.016;
  last = now;
  tick(Math.min(0.05, real));
  renderer.info.reset();
  pipeline.render();
  hint.textContent = `${zone.name} · ${focus ?? "all"} · loop ${loopT.toFixed(2)} s · ${renderer.info.render.calls} draw calls`;
  requestAnimationFrame(frame);
}
resize();
placeCamera();
refresh();
requestAnimationFrame(frame);

/** Grava `.shots/<name>.png` com o laço parado em `at` segundos (0..PERIOD), em `focus` (nome da vitrine ou null = todas). */
async function shot(name: string, at = 0.3, f: string | null = focus, w = 1280, h = 720): Promise<string> {
  resize(w, h, 1);
  focus = f;
  placeCamera();
  fx.clear();
  trail = null;
  loopT = PERIOD;
  // um laço inteiro antes, para as partículas e o rastro estarem em regime, e então até `at`
  const steps = Math.round((PERIOD + at) * 60);
  for (let i = 0; i < steps; i++) tick(1 / 60);
  pipeline.render();
  await fetch(`/__shot?name=${encodeURIComponent(name)}`, { method: "POST", body: canvas.toDataURL("image/png") });
  resize();
  refresh();
  return name;
}

/** Capturas do crítico: a vitrine inteira em 3 momentos e cada primitiva de perto no momento mais cheio. */
async function criticShots(prefix = "critic-fx"): Promise<string[]> {
  const out = [];
  for (const [tag, at] of [["early", 0.08], ["mid", 0.3], ["late", 0.9]] as const) out.push(await shot(`${prefix}-all-${tag}`, at, null));
  const peak: Record<string, number> = { ring: 0.2, burst: 0.06, beam: 0.8, lightning: 0.08, trail: 0.7, pillar: 0.2, crack: 0.45, orbit: 0.9 };
  for (const s of SLOTS) out.push(await shot(`${prefix}-${s.name}`, peak[s.name] ?? 0.3, s.name));
  focus = q.get("focus");
  placeCamera();
  return out;
}

Object.assign(window, { __fx: { fx, lib, SLOTS, shot, criticShots, camera, scene, renderer } });
