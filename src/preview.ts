// Character preview (dev only, not part of the game build): one or two characters, a hero for scale and the reference sprite.
// Open with `npm run dev` at /preview.html. URL params: ?view=close|game&anim=idle|walk|attack&yaw=<deg>&dist=<n>&a=<id>&b=<id to compare>&freeze=<s>&ref=0
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TUNING } from "./data/tuning";
import { ZONES } from "./data/zones";
import { hasChar } from "./game/chars";
import { animateRig, type Rig } from "./game/models";
import { Pipeline } from "./game/render";
import { characterRig } from "./game/rigs";

const q = new URLSearchParams(location.search);
const state = {
  view: q.get("view") ?? "close",
  anim: q.get("anim") ?? "idle",
  yaw: (Number(q.get("yaw") ?? 0) * Math.PI) / 180,
};
const ids = [q.get("a") ?? "bloodfang", q.get("b") ?? ""].filter(hasChar);
const zone = ZONES.bosque;

const canvas = document.getElementById("view") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(zone.fog).multiplyScalar(0.55);
const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 400);
const pipeline = new Pipeline(renderer, scene, camera);
pipeline.setGrade(zone);

const hemi = new THREE.HemisphereLight(zone.ambient, 0x334433, zone.ambientIntensity);
const sun = new THREE.DirectionalLight(zone.sun, zone.sunIntensity);
sun.position.set(-14, 26, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera;
sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 80;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.05;
scene.add(hemi, sun);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(40, 48).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: zone.ground[1], roughness: 1 }),
);
ground.receiveShadow = true;
scene.add(ground);

interface Actor { rig: Rig; home: number; label: string }
const spacing = 6;
const actors: Actor[] = ids.map((id, i) => {
  const rig = characterRig(id, "boss");
  const home = (i - (ids.length - 1) / 2) * spacing;
  scene.add(rig.root);
  return { rig, home, label: id };
});
// a hero for scale
if (hasChar("varok")) {
  const rig = characterRig("varok", "hero");
  scene.add(rig.root);
  actors.push({ rig, home: (ids.length / 2) * spacing + 1, label: "varok" });
}

// the Dungeon Reign sprite the redesign is measured against
const refs = import.meta.glob("../docs/ref/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const refUrl = refs[`../docs/ref/${ids[0].replace(/_v\d+$/, "")}.png`];
if (refUrl && q.get("ref") !== "0") {
  const img = document.createElement("img");
  img.src = refUrl;
  img.style.cssText = "position:fixed;right:12px;top:12px;height:42vh;image-rendering:pixelated;background:#3a3e46;border:1px solid #47505c;border-radius:6px";
  document.body.appendChild(img);
}

const controls = new OrbitControls(camera, canvas);
function setView(v: string): void {
  state.view = v;
  if (v === "game") {
    const z = Number(q.get("zoom") ?? 1);
    camera.position.set(0, 19.5 * z, 16 * z);
    controls.target.set(0, 0.8, 0);
  } else {
    const d = Number(q.get("dist") ?? 22);
    camera.position.set(0, d * 0.42, d);
    controls.target.set(0, 2.2, 0);
  }
  controls.update();
  refresh();
}

const bar = document.getElementById("bar")!;
const buttons: [string, string, string][] = [
  ["anim", "idle", "Idle"], ["anim", "walk", "Walk"], ["anim", "attack", "Attack"],
  ["anim", "roar", "Roar"], ["anim", "rage", "Rage"], ["anim", "death", "Boss death"],
  ["view", "close", "Close-up"], ["view", "game", "Game camera"],
];
function refresh(): void {
  bar.innerHTML = "";
  for (const [key, value, text] of buttons) {
    const el = document.createElement("button");
    el.textContent = text;
    if (state[key as "anim" | "view"] === value) el.className = "on";
    el.onclick = () => (key === "view" ? setView(value) : ((state.anim = value), refresh()));
    bar.appendChild(el);
  }
  document.getElementById("hint")!.textContent = `${actors.map((a) => a.label).join("  ·  ")}  —  drag to orbit, wheel to zoom`;
}

function resize(): void {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h, false);
  pipeline.setSize(w, h, renderer.getPixelRatio());
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();
setView(state.view);

const t0 = performance.now();
function frame(now: number): void {
  const t = (now - t0) / 1000;
  for (const a of actors) {
    const r = a.rig.root;
    let attack = -1, windup = 0, roar = -1, dead = 0;
    // ?freeze=<seconds into the cycle> holds one instant of the attack, roar or death for screenshots
    const hold = q.has("freeze") ? Number(q.get("freeze")) : null;
    const lead = a === actors[0];
    if (state.anim === "walk") {
      // walk a small circle so the gait comes from real displacement
      const ang = t * 0.9;
      r.position.set(a.home + Math.sin(ang) * 1.6, 0, Math.cos(ang) * 1.6);
      r.rotation.y = ang + Math.PI / 2;
    } else {
      r.position.set(a.home, 0, 0);
      r.rotation.y = state.yaw;
      if (state.anim === "attack") {
        // ?freeze=<seconds into the cycle> holds one instant of the attack for screenshots
        const c = q.has("freeze") ? Number(q.get("freeze")) : t % 2.2;
        if (c < 0.7) windup = c / 0.7;
        else if (c < 1.25) attack = (c - 0.7) / 0.55;
      }
    }
    if (lead && state.anim === "roar") roar = Math.min(1, (hold ?? t % 2.6) / TUNING.boss.roarTime);
    if (lead && state.anim === "death") dead = Math.min(1.25, ((hold ?? t % 4) / TUNING.boss.deathTime) * 1.25);
    if (roar >= 1) roar = -1;
    animateRig(a.rig, { t, move: state.anim === "walk" ? 1 : 0, attack, windup, dead, roar, rage: lead && state.anim === "rage" ? 1 : 0, bossDeath: true });
  }
  controls.update();
  pipeline.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

Object.assign(window, { __preview: { state, actors, camera, controls, setView } });
