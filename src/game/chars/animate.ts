// Animação procedural por molas: locomoção, ataque por estilo, reação a empurrão e morte.
import * as THREE from "three";
import type { AnimState, Rig } from "../models";
import type { Bone, Form, Style } from "./kit";

export interface CharState {
  bones: Partial<Record<Bone, THREE.Group>>;
  /** patas com cinemática inversa (aranha) */
  legs: IkLeg[];
  style: Style;
  /** pose de descanso dos braços: [ombro x, cotovelo x] */
  poseR: [number, number];
  poseL: [number, number];
  form: Form;
  shot: number;
  /** postura: inclinação do tronco, joelhos dobrados e braços afastados */
  lean: number;
  crouch: number;
  armOut: number;
  weight: number;
  /** altura do quadril em repouso */
  hipY: number;
  phys: ReturnType<typeof newPhys>;
}

export interface IkLeg {
  root: THREE.Group;
  femur: THREE.Group;
  tibia: THREE.Group;
  l1: number;
  l2: number;
  attach: THREE.Vector3;
  home: THREE.Vector2;
  /** pé no mundo; durante a passada vai de `from` ao alvo com `u` de 0 a 1 (-1 = apoiado) */
  foot: THREE.Vector3;
  from: THREE.Vector3;
  u: number;
  /** patas do mesmo grupo pisam juntas; os dois grupos se alternam */
  group: number;
}

class Spring {
  x = 0;
  v = 0;
  step(target: number, stiffness: number, damping: number, dt: number): number {
    this.v += ((target - this.x) * stiffness - this.v * damping) * dt;
    this.x += this.v * dt;
    return this.x;
  }
}

export function newPhys() {
  return {
    init: false, t: 0, x: 0, z: 0, yaw: 0, vx: 0, vz: 0, pvf: 0, pvs: 0, stride: Math.random() * 6,
    leanF: new Spring(), leanS: new Spring(), secF: new Spring(), secS: new Spring(), twist: new Spring(),
    kickX: new Spring(), kickZ: new Spring(), bounce: new Spring(), armLag: new Spring(),
    fallX: 0, fallZ: 0, wasAttacking: false,
  };
}

// ---------------------------------------------------------------- animação
const ease = (t: number) => t * t * (3 - 2 * t);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** passa do alvo e volta (golpe com peso) */
const overshoot = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

export function animateChar(rig: Rig, a: AnimState): void {
  const c = rig.char!;
  const B = c.bones;
  const P = c.phys;
  const root = rig.root;
  const S = root.scale.x;
  const inner = rig.inner;
  const t = a.t + rig.phase;
  const W = c.weight;

  // ---- movimento real do corpo (posição e giro entre quadros)
  const dt = clamp(a.t - P.t, 0, 0.05);
  P.t = a.t;
  const yaw = root.rotation.y;
  let wvx = 0, wvz = 0, yawVel = 0;
  if (P.init && dt > 0) {
    wvx = (root.position.x - P.x) / dt;
    wvz = (root.position.z - P.z) / dt;
    if (Math.hypot(wvx, wvz) > 45) wvx = wvz = 0; // teleporte
    let dy = yaw - P.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    yawVel = dy / dt;
  }
  P.init = true;
  P.x = root.position.x;
  P.z = root.position.z;
  P.yaw = yaw;
  const sm = 1 - Math.exp(-dt * 16);
  P.vx += (wvx - P.vx) * sm;
  P.vz += (wvz - P.vz) * sm;
  const sn = Math.sin(yaw), cs = Math.cos(yaw);
  // velocidade no referencial do corpo, em "alturas de corpo" por segundo
  const vf = (P.vx * sn + P.vz * cs) / S;
  const vs = (P.vx * cs - P.vz * sn) / S;
  const speed = Math.hypot(vf, vs);
  const af = dt > 0 ? clamp((vf - P.pvf) / dt, -60, 60) : 0;
  const as = dt > 0 ? clamp((vs - P.pvs) / dt, -60, 60) : 0;
  P.pvf = vf;
  P.pvs = vs;
  const alive = a.dead <= 0;
  const move = alive ? clamp(speed / 2.4, 0, 1) : 0;
  const run = alive ? clamp((speed - 2.4) / 4, 0, 1) : 0;
  const fN = speed > 0.05 ? vf / speed : 1;
  const sN = speed > 0.05 ? vs / speed : 0;
  // a passada avança com a distância percorrida: o pé não escorrega
  P.stride += speed * dt * 2.5;

  // ---- molas: inclinação por aceleração, peças soltas, tranco de golpe
  const stiff = 70 / W, damp = 9 / Math.sqrt(W);
  const leanF = P.leanF.step(clamp(af * 0.008, -0.2, 0.2), stiff, damp, dt);
  const leanS = P.leanS.step(clamp(as * 0.008, -0.18, 0.18), stiff, damp, dt);
  const secF = P.secF.step(clamp(vf * 0.11, -0.35, 1.15), 34 / W, 4.2, dt);
  const secS = P.secS.step(clamp(vs * 0.11, -0.6, 0.6), 34 / W, 4.2, dt);
  const twist = P.twist.step(clamp(-yawVel * 0.035, -0.5, 0.5), 60 / W, 8, dt);
  const kx = P.kickX.step(0, 110 / W, 11, dt);
  const kz = P.kickZ.step(0, 110 / W, 11, dt);
  const kf = kx * sn + kz * cs;
  const ks = kx * cs - kz * sn;
  const bounce = P.bounce.step(0, 220 / W, 13, dt);

  inner.rotation.set(kf * 0.5 + leanF, 0, -ks * 0.5 - leanS);
  inner.position.set(ks * 0.45, 0, kf * 0.45);
  inner.scale.set(1 - bounce * 0.35, 1 + bounce * 0.7, 1 - bounce * 0.35);

  if (c.form === "bat") {
    const flap = Math.sin(t * 26) * 0.9;
    B.wingL!.rotation.z = flap;
    B.wingR!.rotation.z = -flap;
    const h = B.hips!;
    h.position.y = 1.1 + Math.sin(t * 5) * 0.14 + (a.attack >= 0 ? -Math.sin(a.attack * Math.PI) * 0.4 : 0);
    h.rotation.set(0.3 * move + (a.attack >= 0 ? Math.sin(a.attack * Math.PI) * 0.6 : 0) - a.windup * 0.4, 0, twist * 1.6 - vs * 0.12);
    if (!alive) {
      const k = Math.min(1, a.dead);
      h.position.y = 1.1 * (1 - k * k) + 0.15;
      h.rotation.z = k * 2.4;
      inner.scale.setScalar(1 - k * 0.3);
    }
    return;
  }
  if (c.form === "slime") {
    const h = B.hips!;
    const hop = Math.abs(Math.sin(P.stride * 0.9)) * move;
    let sy = 1 + Math.sin(t * 3.2) * 0.05 + hop * 0.22 + bounce * 1.4;
    if (a.windup > 0) sy -= a.windup * 0.3;
    else if (a.attack >= 0) sy += Math.sin(a.attack * Math.PI) * 0.35;
    if (!alive) sy = Math.max(0.08, 1 - Math.min(1, a.dead) * 0.92);
    sy = clamp(sy, 0.08, 1.7);
    const sxz = 1 / Math.sqrt(sy);
    h.scale.set(sxz, sy, sxz);
    h.position.set(0, hop * 0.18, a.attack >= 0 ? Math.sin(a.attack * Math.PI) * 0.3 : 0);
    inner.scale.setScalar(1);
    // gelatina: o topo fica para trás quando acelera
    h.rotation.set(-secF * 0.25 + kf * 0.8, 0, secS * 0.25 - ks * 0.8);
    return;
  }

  const hips = B.hips!, torso = B.torso!, head = B.head!;
  const armL = B.armL!, armR = B.armR!, foreL = B.foreL!, foreR = B.foreR!;
  const ph = P.stride;
  const sw = Math.sin(ph) * move;
  const cw = Math.cos(ph);
  const breathe = Math.sin(t * 2.1);
  const sway = Math.sin(t * 0.9) * (1 - move); // troca de apoio parado
  const amp = 0.62 + 0.3 * run;

  // quadril: sobe e desce duas vezes por passada, gira e balança
  const crouch = c.crouch + 0.1 * run;
  let hipY = c.hipY - crouch * 0.1;
  if (c.form === "robed") hipY = c.hipY + 0.06 + Math.sin(t * 2.4) * 0.05 + Math.abs(cw) * 0.02 * move;
  else if (c.form === "spider") hipY = c.hipY + Math.sin(t * 1.8) * 0.012 + Math.abs(cw) * 0.015 * move;
  else hipY -= (0.5 - Math.abs(cw) * 0.5) * 0.1 * move * (1 + run * 0.6) * W;
  hips.position.set(sway * 0.025 + sw * 0.02 * sN, hipY, 0);
  hips.rotation.set(0, sw * 0.16 * fN + twist * 0.4, sway * 0.04 + Math.cos(ph) * 0.05 * move);
  // tronco: inclina na direção do movimento, contragira os ombros, respira
  torso.rotation.set(c.lean + (0.1 + 0.16 * run) * move * fN + breathe * 0.014, -sw * 0.24 * fN + twist, -sway * 0.03 - 0.1 * move * sN - Math.cos(ph) * 0.04 * move);
  torso.scale.set(1 + breathe * 0.008, 1 + breathe * 0.014, 1 + breathe * 0.02);
  // cabeça: olha em volta parado, estabiliza andando e atrasa no giro
  head.rotation.set(-c.lean * 0.8 - 0.07 * move + Math.sin(t * 0.7) * 0.03 * (1 - move), Math.sin(t * 0.43) * 0.16 * (1 - move) + sw * 0.1 - twist * 0.9, sway * 0.03);

  // braços: balanço oposto às pernas, com o antebraço atrasado (mola)
  const armLag = P.armLag.step(sw, 90, 9, dt);
  const freeR = c.poseR[0] > -0.8 ? 1 : 0.18;
  const freeL = c.poseL[0] > -0.8 ? 1 : 0.18;
  armR.rotation.set(c.poseR[0] - sw * 0.55 * amp * freeR * fN - secF * 0.12 * freeR, 0, c.armOut + Math.abs(sw) * 0.06);
  armL.rotation.set(c.poseL[0] + sw * 0.55 * amp * freeL * fN - secF * 0.12 * freeL, 0, -c.armOut - Math.abs(sw) * 0.06);
  foreR.rotation.set(c.poseR[1] - (0.25 * move + Math.max(0, -armLag) * 0.45) * freeR - run * 0.4 * freeR, 0, 0);
  foreL.rotation.set(c.poseL[1] - (0.25 * move + Math.max(0, armLag) * 0.45) * freeL - run * 0.4 * freeL, 0, 0);

  if (c.form === "biped") {
    // perna: balanço na direção em que o corpo anda; joelho dobra quando o pé sai do chão
    const tl = sw * amp, tr = -sw * amp;
    const kneeL = Math.max(0, -cw) * (0.9 + 0.5 * run) * move;
    const kneeR = Math.max(0, cw) * (0.9 + 0.5 * run) * move;
    B.thighL!.rotation.set(-crouch * 0.6 + tl * fN - kneeL * 0.25, 0, -0.06 - tl * sN * 0.7);
    B.thighR!.rotation.set(-crouch * 0.6 + tr * fN - kneeR * 0.25, 0, 0.06 - tr * sN * 0.7);
    B.shinL!.rotation.x = crouch * 1.1 + kneeL;
    B.shinR!.rotation.x = crouch * 1.1 + kneeR;
  }
  if (B.skirt) B.skirt.rotation.set(-secF * 0.22 + kf * 0.3, 0, secS * 0.22);
  if (c.form === "spider") {
    // corpo de aranha não rebola; o abdômen só pesa um pouco atrás
    hips.position.x = 0;
    hips.rotation.set(0, twist * 0.25, 0);
    if (B.tail) B.tail.rotation.set(Math.sin(t * 1.3) * 0.025 + secF * 0.06, Math.sin(t * 0.9) * 0.03 + twist * 0.5, 0);
  }
  if (c.legs.length) stepLegs(c, rig, hips.position, dt, vf, vs, a.dead);
  // peças soltas arrastam com a velocidade e oscilam como mola
  if (B.cape) B.cape.rotation.set(0.1 + secF + Math.sin(t * 3.1) * 0.04 * (1 + move), 0, -secS + leanS);
  if (B.tail && c.form !== "spider") B.tail.rotation.set(0.2 + secF * 0.6 + Math.sin(t * 2.6) * 0.12, Math.sin(t * 2.1) * 0.5 + twist * 2 - secS, 0);

  // ---- golpe: preparo, ataque que passa do ponto e volta, corpo avança
  const wind = a.windup;
  const p = a.attack >= 0 ? a.attack : -1;
  if (alive && (wind > 0 || p >= 0)) {
    if (p >= 0 && !P.wasAttacking) P.bounce.v += 1.2 / W; // impulso no início do golpe
    const strike = p >= 0 ? (p < 0.3 ? overshoot(p / 0.3) : 1) : 0;
    const back = p >= 0.3 ? ease((p - 0.3) / 0.7) : 0;
    const prep01 = p >= 0 ? Math.max(0, 1 - strike) : wind;
    const hit = strike * (1 - back);
    inner.position.z += hit * 0.22 - prep01 * 0.1;
    hips.position.y -= hit * 0.06;
    switch (c.style) {
      case "swing":
        armR.rotation.x = c.poseR[0] * back - 2.8 * prep01 + 0.55 * hit;
        armR.rotation.z = c.armOut + 0.55 * prep01 - 0.35 * hit;
        foreR.rotation.x = c.poseR[1] * back - 0.7 * prep01 - 0.05 * hit;
        torso.rotation.y += 0.7 * prep01 - 0.85 * hit;
        torso.rotation.x += -0.2 * prep01 + 0.38 * hit;
        hips.rotation.y += 0.25 * prep01 - 0.3 * hit;
        if (c.poseL[0] === c.poseR[0]) {
          armL.rotation.x = armR.rotation.x;
          foreL.rotation.x = foreR.rotation.x;
        } else armL.rotation.x += 0.5 * hit;
        break;
      case "thrust": {
        const right = c.shot % 2 === 0;
        const arm = right ? armR : armL, fore = right ? foreR : foreL;
        arm.rotation.x = -0.4 * prep01 - 1.6 * hit + (right ? c.poseR[0] : c.poseL[0]) * back;
        fore.rotation.x = -1.7 * prep01 - 0.05 * hit + (right ? c.poseR[1] : c.poseL[1]) * back;
        torso.rotation.y += (right ? -1 : 1) * (0.6 * hit - 0.35 * prep01);
        torso.rotation.x += 0.26 * hit;
        break;
      }
      case "shoot":
      case "dual": {
        const right = c.style === "shoot" ? c.poseR[0] < -1 : c.shot % 2 === 0;
        const arm = right ? armR : armL, fore = right ? foreR : foreL;
        const kick = p >= 0 ? Math.max(0, 1 - p * 3.2) : 0;
        arm.rotation.x = -1.45 - kick * 0.5;
        fore.rotation.x = -0.1 - kick * 0.6;
        torso.rotation.x -= 0.1 * kick;
        torso.rotation.y += (right ? 1 : -1) * 0.12 * kick;
        inner.position.z -= kick * 0.12 + hit * 0.22;
        if (c.style === "shoot" && !right) {
          armR.rotation.x = -1.2;
          foreR.rotation.x = -1.4 * (prep01 + back * 0.5);
        }
        break;
      }
      case "cast":
        armR.rotation.x = -2.4 * prep01 - 1.5 * hit + c.poseR[0] * back;
        foreR.rotation.x = -0.9 * prep01 - 0.15 * hit + c.poseR[1] * back;
        armL.rotation.x = -1.2 * prep01 - 1.35 * hit + c.poseL[0] * back;
        foreL.rotation.x = -1.0 * prep01 - 0.15 * hit + c.poseL[1] * back;
        torso.rotation.x += -0.22 * prep01 + 0.24 * hit;
        break;
      case "throw":
        armR.rotation.x = -3.0 * prep01 - 1.3 * hit + c.poseR[0] * back;
        foreR.rotation.x = -1.3 * prep01 + c.poseR[1] * back;
        torso.rotation.y += 0.7 * prep01 - 0.7 * hit;
        torso.rotation.x += 0.3 * hit;
        break;
      case "bite":
        break;
    }
  }
  P.wasAttacking = p >= 0;

  // ---- queda: tomba para onde o golpe empurrou, quica e fica no chão
  if (!alive) {
    const k = Math.min(1, a.dead);
    const fall = k < 0.55 ? Math.pow(k / 0.55, 2) : 1 - 0.07 * Math.sin(((k - 0.55) / 0.45) * Math.PI);
    let ff = P.fallX * sn + P.fallZ * cs;
    let fs = P.fallX * cs - P.fallZ * sn;
    if (Math.hypot(ff, fs) < 0.1) {
      ff = -1;
      fs = 0;
    }
    const A = 1.5 * fall;
    inner.rotation.set(A * ff, 0, -A * fs);
    inner.position.set(fs * fall * 0.6, fall * 0.14, ff * fall * 0.6);
    inner.scale.setScalar(a.dead > 0.85 ? 1 - Math.min(1, (a.dead - 0.85) / 0.4) * 0.5 : 1);
    const limp = ease(k);
    armL.rotation.set(-0.6 * limp, 0, -c.armOut - 1.2 * limp);
    armR.rotation.set(-0.6 * limp, 0, c.armOut + 1.2 * limp);
    foreL.rotation.x = -0.5 * limp;
    foreR.rotation.x = -0.5 * limp;
    head.rotation.x = -0.5 * limp * Math.sign(ff || -1);
    if (B.thighL) {
      B.thighL.rotation.set(-0.5 * limp, 0, -0.25 * limp);
      B.thighR!.rotation.set(0.2 * limp, 0, 0.25 * limp);
      B.shinL!.rotation.x = 0.9 * limp;
      B.shinR!.rotation.x = 0.3 * limp;
    }
  }
}

const V = new THREE.Vector3();

/** Patas com o pé preso ao chão: cada uma dá a passada quando o corpo se afasta do ponto de apoio; os dois grupos se alternam. */
function stepLegs(c: CharState, rig: Rig, hip: THREE.Vector3, dt: number, vf: number, vs: number, dead: number): void {
  const root = rig.root;
  const S = root.scale.x;
  const sn = Math.sin(root.rotation.y), cs = Math.cos(root.rotation.y);
  const speed = Math.hypot(vf, vs);
  const lead = Math.min(0.3, speed * 0.1) / (speed || 1);
  const stepping = [false, false];
  for (const l of c.legs) if (l.u >= 0) stepping[l.group] = true;
  const fresh = !c.phys.init || dt <= 0;
  const dur = clamp(0.2 - speed * 0.02, 0.09, 0.2);
  const curl = dead > 0 ? ease(Math.min(1, dead * 2)) : 0;
  for (const l of c.legs) {
    // alvo no mundo: ponto de repouso adiantado na direção do movimento
    const hx = l.home.x + vs * lead, hz = l.home.y + vf * lead;
    V.set(root.position.x + (hx * cs + hz * sn) * S, 0, root.position.z + (-hx * sn + hz * cs) * S);
    const err = Math.hypot(l.foot.x - V.x, l.foot.z - V.z) / S;
    if (fresh || err > 3) {
      l.foot.copy(V);
      l.u = -1;
    } else if (l.u < 0 && dead <= 0 && ((err > (speed > 0.05 ? 0.3 : 0.1) && !stepping[1 - l.group]) || err > 0.75)) {
      l.u = 0;
      l.from.copy(l.foot);
      stepping[l.group] = true;
    }
    let lift = 0;
    if (l.u >= 0) {
      l.u += dt / dur;
      if (l.u >= 1) {
        l.u = -1;
        l.foot.copy(V);
      } else {
        l.foot.lerpVectors(l.from, V, ease(l.u));
        lift = Math.sin(l.u * Math.PI) * 0.22;
      }
    }
    // pé no espaço do corpo; morta, as patas encolhem para junto do corpo
    const dx = l.foot.x - root.position.x, dz = l.foot.z - root.position.z;
    let fx = (dx * cs - dz * sn) / S, fy = lift, fz = (dx * sn + dz * cs) / S;
    if (curl > 0) {
      fx += (l.attach.x * 2.4 - fx) * curl;
      fy += (0.2 - fy) * curl;
      fz += (l.attach.z + l.home.y * 0.25 - fz) * curl;
    }
    l.root.position.copy(hip).add(l.attach);
    const ox = fx - l.root.position.x, oy = fy - l.root.position.y, oz = fz - l.root.position.z;
    const h = Math.hypot(ox, oz);
    const d = clamp(Math.hypot(h, oy), Math.abs(l.l1 - l.l2) + 0.02, l.l1 + l.l2 - 0.02);
    // joelho para cima: lei dos cossenos no plano vertical que contém o encaixe e o pé
    const up = Math.atan2(oy, h) + Math.acos(clamp((l.l1 * l.l1 + d * d - l.l2 * l.l2) / (2 * l.l1 * d), -1, 1));
    const knee = Math.acos(clamp((l.l1 * l.l1 + l.l2 * l.l2 - d * d) / (2 * l.l1 * l.l2), -1, 1));
    l.root.rotation.y = Math.atan2(ox, oz);
    l.femur.rotation.x = -up;
    l.tibia.rotation.x = Math.PI - knee;
  }
}

/** alterna o braço do próximo tiro/estocada */
export function nextShot(rig: Rig): void {
  if (rig.char) rig.char.shot++;
}
