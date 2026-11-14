// Prévia de zona (só no `npm run dev`, fora do build do jogo): monta a zona com seed fixa, sem inimigos nem interface, com o mesmo
// renderizador, luz, névoa e pós-processamento do jogo, e um herói parado para escala. Serve para o marco M18 (atmosfera) e para o
// crítico cego (docs/critic.md). Abrir em /zone.html. Parâmetros: ?zone=bosque|cripta|vulcao|vazio&seed=<n>&hero=<id>&pose=<nome>&clouds=0
import * as THREE from "three";
import { generateZone, distToPath, type ZoneLayout } from "./core/worldgen";
import { ZONES, ZONE_ORDER } from "./data/zones";
import { Fx } from "./game/fx";
import { animateRig } from "./game/models";
import { Pipeline } from "./game/render";
import { characterRig } from "./game/rigs";
import { U } from "./game/shared";
import { buildWorld, driftSun, setZoneClouds } from "./game/world";

const q = new URLSearchParams(location.search);
const zone = ZONES[q.get("zone") ?? "bosque"] ?? ZONES.bosque;
const seed = Number(q.get("seed") ?? 1) >>> 0;

const canvas = document.getElementById("view") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: false });
renderer.shadowMap.enabled = true;
renderer.info.autoReset = false; // o pós-processamento faz vários renders por quadro: zerar à mão e somar o quadro inteiro
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 1, 400);
const pipeline = new Pipeline(renderer, scene, camera);
const fx = new Fx(scene, document.getElementById("texts")!);

// mesma luz do jogo (game.ts: construtor e enterZone)
const hemi = new THREE.HemisphereLight(zone.ambient, zone.ground[2], zone.ambientIntensity);
const sun = new THREE.DirectionalLight(zone.sun, zone.sunIntensity);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
const sc = sun.shadow.camera;
sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 1; sc.far = 160;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.05;
sun.shadow.radius = 2.5;
scene.add(hemi, sun, sun.target);

const layout: ZoneLayout = generateZone(zone, seed);
const world = buildWorld(scene, zone, layout);
scene.background = new THREE.Color(zone.sky);
scene.fog = new THREE.Fog(zone.fog, 42, 120);
pipeline.setGrade(zone);
setZoneClouds(zone);
if (q.get("clouds") === "0") U.uCloud.value.x = 0;

const hero = characterRig(q.get("hero") ?? "varok", "hero");
scene.add(hero.root);
const boss = characterRig(zone.boss, "boss");
boss.root.position.set(layout.boss.x, 0, layout.boss.z - 4);
scene.add(boss.root);

// ---------------------------------------------------------------- poses fixas
/** ponto livre mais perto de (x, z): nenhum obstáculo a menos de `clear` */
function freeSpot(x: number, z: number, clear = 1.6): { x: number; z: number } {
  for (let r = 0; r < 12; r += 0.75) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (layout.obstacles.every((o) => Math.hypot(o.x - px, o.z - pz) > o.r + clear)) return { x: px, z: pz };
      if (r === 0) break;
    }
  }
  return { x, z };
}
/** centro da mata mais densa: o obstáculo com mais vizinhos num raio de 8, longe do caminho e da arena */
function densest(): { x: number; z: number } {
  let best = layout.obstacles[0], count = -1;
  for (const o of layout.obstacles) {
    if (distToPath(o.x, o.z, layout.path) < 10 || Math.hypot(o.x - layout.boss.x, o.z - layout.boss.z) < layout.bossRadius + 8) continue;
    let n = 0;
    for (const p of layout.obstacles) if (Math.hypot(p.x - o.x, p.z - o.z) < 8) n++;
    if (n > count) { count = n; best = o; }
  }
  return { x: best.x, z: best.z };
}
interface Pose { at: { x: number; z: number }; zoom: number; low?: boolean }
const mid = layout.path[Math.floor(layout.path.length / 2)];
const POSES: Record<string, Pose> = {
  campfire: { at: freeSpot(layout.spawn.x + 4, layout.spawn.z + 3), zoom: 1 },
  middle: { at: freeSpot(mid.x, mid.z), zoom: 1 },
  dense: { at: freeSpot(densest().x, densest().z), zoom: 1 },
  arena: { at: freeSpot(layout.boss.x, layout.boss.z + 3), zoom: 1 },
  low: { at: freeSpot(mid.x, mid.z), zoom: 1, low: true },
  far: { at: freeSpot(layout.spawn.x, layout.spawn.z - 6), zoom: 2 },
};
let pose = POSES[q.get("pose") ?? "campfire"] ?? POSES.campfire;

function placeCamera(p: Pose): void {
  const { x, z } = p.at;
  hero.root.position.set(x, 0, z);
  hero.root.rotation.y = 0.5;
  if (p.low) {
    // câmera baixa (cerca de 30°) atrás do herói, para ver névoa, céu e a altura da flora
    camera.position.set(x, 7, z + 12);
    camera.lookAt(x, 1.6, z - 2);
  } else {
    // a mesma conta de game.ts: updateCamera
    camera.position.set(x, 19.5 * p.zoom, z + 16 * p.zoom);
    camera.lookAt(x, 0.8, z);
  }
  sun.position.set(x + 30, 50, z + 14);
  sun.target.position.set(x, 0, z - 4);
  camera.updateMatrixWorld();
  U.uCenter.value.set(x, z - 8);
  U.uHero.value.set(x, 0, z);
}

// ---------------------------------------------------------------- tempo
let time = 0, moteAcc = 0;
const proj = new THREE.Vector3();
function tick(dt: number): void {
  time += dt;
  U.uTime.value = time;
  driftSun(sun, zone, time);
  const { x, z } = pose.at;
  const size = pipeline.bufferSize;
  proj.set(x, 1.1, z).project(camera);
  U.uFadePos.value.set((proj.x * 0.5 + 0.5) * size.x, (proj.y * 0.5 + 0.5) * size.y);
  U.uFadeRadius.value = size.y * 0.085;
  U.uFadeDepth.value = proj.z * 0.5 + 0.5 - 0.0004;
  // partículas de ambiente e fogueira, como em game.ts
  moteAcc += dt * zone.motes.rate;
  while (moteAcc >= 1) {
    moteAcc--;
    fx.spark(x + (Math.random() - 0.5) * 44, 0.3 + Math.random() * 3.5, z - 6 + (Math.random() - 0.5) * 34,
      zone.motes.color, 0.05 + Math.random() * 0.05, 2 + Math.random() * 2, zone.motes.rise * (0.5 + Math.random()));
  }
  const fire = world.group.userData.fire as THREE.Group | undefined;
  if (fire) {
    (fire.userData.light as THREE.PointLight).intensity = 40 + Math.sin(time * 11) * 6 + Math.sin(time * 23) * 4;
    for (let i = 0; i < 3; i++) fire.children[i].scale.y = (1 - i * 0.2) * (1 + Math.sin(time * (9 + i * 3) + i) * 0.18);
    if (Math.random() < dt * 14) fx.spark(fire.position.x + (Math.random() - 0.5) * 0.4, 0.9, fire.position.z + (Math.random() - 0.5) * 0.4, 0xffa040, 0.07, 0.9, 1.8);
  }
  const still = { move: 0, attack: -1, windup: 0, dead: 0, roar: -1, rage: 0 };
  animateRig(hero, { t: time, ...still });
  animateRig(boss, { t: time, ...still });
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

// ---------------------------------------------------------------- interface
const hint = document.getElementById("hint")!;
const bar = document.getElementById("bar")!;
let current = q.get("pose") ?? "campfire";
function refresh(): void {
  bar.innerHTML = "";
  for (const name of Object.keys(POSES)) {
    const el = document.createElement("button");
    el.textContent = name;
    if (name === current) el.className = "on";
    el.onclick = () => setPose(name);
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
function setPose(name: string): void {
  current = name;
  pose = POSES[name];
  placeCamera(pose);
  refresh();
}

let last = performance.now(), fps = 60;
function frame(now: number): void {
  const real = (now - last) / 1000 || 0.016;
  last = now;
  fps += (1 / Math.max(real, 0.001) - fps) * 0.05;
  tick(Math.min(0.05, real));
  renderer.info.reset();
  pipeline.render();
  const i = renderer.info.render;
  hint.textContent = `${zone.name} · seed ${seed} · ${current} · ${fps.toFixed(0)} fps · ${i.calls} draw calls · ${(i.triangles / 1000).toFixed(0)} mil triângulos`;
  requestAnimationFrame(frame);
}

resize();
setPose(current);
requestAnimationFrame(frame);

/** Grava `.shots/<name>.png` pelo servidor de desenvolvimento (ver vite.config.ts) na pose dada. Avança o tempo por conta própria
 * (funciona com a aba oculta) e devolve draw calls e triângulos do último quadro. */
async function shot(name: string, poseName = current, w = 1280, h = 720): Promise<{ name: string; calls: number; triangles: number }> {
  resize(w, h, 1);
  setPose(poseName);
  for (let i = 0; i < 120; i++) {
    tick(1 / 60);
    if (i % 10 === 9) pipeline.render();
  }
  renderer.info.reset();
  pipeline.render();
  const { calls, triangles } = renderer.info.render;
  const data = canvas.toDataURL("image/png");
  await fetch(`/__shot?name=${encodeURIComponent(name)}`, { method: "POST", body: data });
  resize();
  return { name, calls, triangles };
}

/** As 6 poses fixas que o crítico cego recebe para uma zona: `.shots/<prefix>-<pose>.png`. */
async function criticShots(prefix: string): Promise<{ name: string; calls: number; triangles: number }[]> {
  const out = [];
  for (const name of Object.keys(POSES)) out.push(await shot(`${prefix}-${name}`, name));
  return out;
}

Object.assign(window, { __zone: { zone, layout, camera, scene, renderer, POSES, setPose, shot, criticShots } });
