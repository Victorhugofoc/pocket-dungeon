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
  /** arma de duas mãos com osso próprio: ver `Builder.weapon` */
  weapon: { hand: number; carry: THREE.Quaternion; grip: number } | null;
  ribbons: Ribbon[];
  phys: ReturnType<typeof newPhys>;
}

/** fita com física (cachecol): corrente de pontos no mundo, presa em `at` no osso; ver `RibbonSpec` */
export interface Ribbon {
  bone: THREE.Group;
  at: THREE.Vector3;
  /** comprimento de cada gomo, na escala do personagem */
  seg: number;
  width: [number, number];
  thick: number;
  geo: THREE.BufferGeometry;
  pts: THREE.Vector3[];
  prev: THREE.Vector3[];
  init: boolean;
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
    fallX: 0, fallZ: 0, wasAttacking: false, snap: false,
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
    P.snap = Math.abs(dy) > 0.5; // giro instantâneo: as fitas recomeçam penduradas
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
  const rage = a.rage ?? 0;
  const breathe = Math.sin(t * (2.1 + 3.6 * rage)); // em fúria respira mais rápido e mais fundo
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
  torso.rotation.set(c.lean + 0.1 * rage + (0.1 + 0.16 * run) * move * fN + breathe * (0.014 + 0.03 * rage), -sw * 0.24 * fN + twist, -sway * 0.03 - 0.1 * move * sN - Math.cos(ph) * 0.04 * move);
  const heave = 1 + 2.6 * rage;
  torso.scale.set(1 + breathe * 0.008 * heave, 1 + breathe * 0.014 * heave, 1 + breathe * 0.02 * heave);
  // cabeça: olha em volta parado, estabiliza andando e atrasa no giro
  head.rotation.set(-c.lean * 0.8 - 0.07 * move + Math.sin(t * 0.7) * 0.03 * (1 - move), Math.sin(t * 0.43) * 0.16 * (1 - move) + sw * 0.1 - twist * 0.9, sway * 0.03);

  // braços: balanço oposto às pernas, com o antebraço atrasado (mola)
  const armLag = P.armLag.step(sw, 90, 9, dt);
  const freeR = c.poseR[0] > -0.8 && !c.weapon ? 1 : 0.18;
  const freeL = c.poseL[0] > -0.8 ? 1 : 0.18;
  const out = c.armOut + rage * (0.1 + breathe * 0.04);
  armR.rotation.set(c.poseR[0] - sw * 0.55 * amp * freeR * fN - secF * 0.12 * freeR, 0, out + Math.abs(sw) * 0.06);
  armL.rotation.set(c.poseL[0] + sw * 0.55 * amp * freeL * fN - secF * 0.12 * freeL, 0, -out - Math.abs(sw) * 0.06);
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
  // peças soltas arrastam com a velocidade e oscilam como mola
  if (B.cape) B.cape.rotation.set(0.1 + secF + Math.sin(t * 3.1) * 0.04 * (1 + move), 0, -secS + leanS);
  if (B.tail && c.form !== "spider") B.tail.rotation.set(0.2 + secF * 0.6 + Math.sin(t * 2.6) * 0.12, Math.sin(t * 2.1) * 0.5 + twist * 2 - secS, 0);

  // ---- rugido de chefe: encolhe puxando o ar, depois peito para fora, cabeça para trás e braços abertos, tremendo
  const roar = a.roar ?? -1;
  if (alive && roar >= 0) {
    const inh = roar < 0.3 ? ease(roar / 0.3) : 1 - ease(Math.min(1, (roar - 0.3) / 0.12));
    const ro = roar < 0.3 ? 0 : roar < 0.42 ? ease((roar - 0.3) / 0.12) : roar < 0.85 ? 1 : 1 - ease((roar - 0.85) / 0.15);
    const tremor = ro * Math.sin(t * 55) * 0.022;
    torso.rotation.x += 0.34 * inh - 0.4 * ro + tremor;
    head.rotation.x += 0.25 * inh - 0.55 * ro + tremor;
    hips.position.y += (-0.09 * inh + 0.03 * ro) * c.hipY;
    armR.rotation.x += (0.4 - armR.rotation.x) * ro * 0.75 - 0.25 * inh;
    armL.rotation.x += (0.4 - armL.rotation.x) * ro * 0.75 - 0.25 * inh;
    armR.rotation.z += 0.7 * ro - 0.1 * inh;
    armL.rotation.z -= 0.7 * ro - 0.1 * inh;
    foreR.rotation.x += (-0.55 - foreR.rotation.x) * ro * 0.7;
    foreL.rotation.x += (-0.55 - foreL.rotation.x) * ro * 0.7;
  }

  // ---- golpe: preparo, ataque que passa do ponto e volta, corpo avança
  const wind = a.windup;
  const p = a.attack >= 0 ? a.attack : -1;
  let align = 0; // 0 = arma na pose de descanso, 1 = alinhada com o antebraço
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
        if (c.weapon) {
          // duas mãos: ergue a arma acima da cabeça e desce na frente, dobrando o tronco
          align = p >= 0 ? 1 - back : clamp(wind * 2.5, 0, 1);
          armR.rotation.x = c.poseR[0] * back - 2.5 * prep01 - 1.1 * hit;
          armR.rotation.z = c.armOut - 0.8 * align; // as mãos se juntam na frente do corpo
          foreR.rotation.x = c.poseR[1] * back - 0.6 * prep01 - 0.6 * hit;
          torso.rotation.x += -0.25 * prep01 + 0.45 * hit;
          torso.rotation.y += 0.25 * prep01 - 0.2 * hit;
          break;
        }
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
        arm.rotation.x = -1.45 - kick * 0.3;
        fore.rotation.x = -0.1 - kick * 0.45;
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
      case "throwL": {
        const left = c.style === "throwL";
        const pose = left ? c.poseL : c.poseR;
        (left ? armL : armR).rotation.x = -3.0 * prep01 - 1.3 * hit + pose[0] * back;
        (left ? foreL : foreR).rotation.x = -1.3 * prep01 + pose[1] * back;
        torso.rotation.y += (left ? -1 : 1) * (0.7 * prep01 - 0.7 * hit);
        torso.rotation.x += 0.3 * hit;
        break;
      }
      case "bite":
        break;
    }
  }
  P.wasAttacking = p >= 0;

  // ---- arma de duas mãos: a mão esquerda vai até o ponto da arma (dois ossos, cotovelo dobrando para a frente)
  if (c.weapon && B.weapon) {
    if (align > 0) {
      // alinhada com o antebraço, desfazendo a abertura lateral do braço para a arma descer reta à frente
      GQ.copy(foreR.quaternion).invert().multiply(GZ.setFromAxisAngle(AXIS_Z, -armR.rotation.z)).multiply(foreR.quaternion);
      B.weapon.quaternion.copy(c.weapon.carry).slerp(GQ, ease(align));
    }
    else B.weapon.quaternion.copy(c.weapon.carry);
  }
  if (alive && c.weapon && B.weapon) {
    const l1 = -foreL.position.y, l2 = c.weapon.hand;
    // mão direita e direção do cabo no espaço do tronco, em relação ao ombro esquerdo
    const toTorso = (v: THREE.Vector3) => v.applyQuaternion(foreR.quaternion).add(foreR.position).applyQuaternion(armR.quaternion).add(armR.position).sub(armL.position);
    toTorso(GV.copy(B.weapon.position));
    toTorso(GD.set(0, -1, 0).applyQuaternion(B.weapon.quaternion).add(B.weapon.position)).sub(GV);
    // no golpe a mão esquerda escorrega pelo cabo até o ponto mais perto do ombro
    const near = clamp(-GV.dot(GD), 0.14, 0.75);
    GV.addScaledVector(GD, c.weapon.grip + (near - c.weapon.grip) * ease(align));
    const d = clamp(GV.length(), Math.abs(l1 - l2) + 0.02, l1 + l2 - 0.005);
    const bend = Math.acos(clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1)) - Math.PI;
    GH.set(0, -l1 - l2 * Math.cos(bend), -l2 * Math.sin(bend)).normalize();
    armL.quaternion.setFromUnitVectors(GH, GV.normalize());
    foreL.rotation.set(bend, 0, 0);
  }

  // ---- morte de chefe: cambaleia, cai de joelhos, tomba para a frente e achata enquanto se desfaz
  if (!alive && a.bossDeath) {
    const k = a.dead;
    const stag = ease(clamp(k / 0.22, 0, 1));
    const kneel = ease(clamp((k - 0.18) / 0.3, 0, 1));
    const slump = ease(clamp((k - 0.45) / 0.3, 0, 1));
    const fade = ease(clamp((k - 0.8) / 0.45, 0, 1));
    inner.rotation.set(0, 0, 0);
    inner.position.set(0, 0, 0);
    inner.scale.set(1 - fade * 0.35, 1 - fade * 0.9, 1 - fade * 0.35);
    if (B.thighL && B.shinL) {
      const thigh = -B.shinL.position.y;
      hips.position.y += (thigh * 0.83 + 0.08 - hips.position.y) * kneel;
      B.thighL.rotation.set(-0.6 * kneel, 0, -0.12 * kneel);
      B.thighR!.rotation.set(-0.6 * kneel, 0, 0.12 * kneel);
      B.shinL.rotation.x = 2.05 * kneel;
      B.shinR!.rotation.x = 2.05 * kneel;
    } else hips.position.y = c.hipY * (1 - (c.form === "spider" ? 0.6 : 0.42) * kneel);
    torso.rotation.set(c.lean - 0.3 * stag * (1 - slump) + 0.8 * slump, 0.12 * stag * (1 - slump), 0);
    head.rotation.set(-0.45 * stag * (1 - slump) + 0.55 * slump, 0, 0.1 * slump);
    armR.rotation.set(c.poseR[0] * (1 - kneel) + 0.25 * slump, 0, c.armOut * (1 - slump) + 0.18 * slump);
    armL.rotation.set(c.poseL[0] * (1 - kneel) + 0.25 * slump, 0, -c.armOut * (1 - slump) - 0.18 * slump);
    foreR.rotation.x = c.poseR[1] * (1 - kneel) - 0.2 * kneel;
    foreL.rotation.x = c.poseL[1] * (1 - kneel) - 0.2 * kneel;
  } else if (!alive) {
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
  // por último: as patas seguem a altura final do corpo (rugido, morte)
  if (c.legs.length) stepLegs(c, rig, hips.position, dt, vf, vs, a.dead);
  if (c.ribbons.length) stepRibbons(c, rig, dt, t);
}

const RA = new THREE.Vector3(), RT = new THREE.Vector3(), RW = new THREE.Vector3(), RN = new THREE.Vector3(), RX = new THREE.Vector3(), RP = new THREE.Vector3();

/** Fitas soltas: integração de Verlet no mundo (gravidade, arrasto do ar, brisa para trás e tremulação), gomos de comprimento fixo
 * a partir da ponta presa, sem atravessar o chão nem o corpo. A malha é escrita no espaço de `root`. */
function stepRibbons(c: CharState, rig: Rig, dt: number, t: number): void {
  const root = rig.root;
  const S = root.scale.x;
  root.updateMatrixWorld(true);
  const sn = Math.sin(root.rotation.y), cs = Math.cos(root.rotation.y);
  const h = Math.min(dt, 0.034);
  const keep = Math.exp(-h * 2.4);
  for (let ri = 0; ri < c.ribbons.length; ri++) {
    const r = c.ribbons[ri];
    const n = r.pts.length, L = r.seg * S;
    r.bone.localToWorld(RA.copy(r.at));
    if (!r.init || c.phys.snap || RA.distanceTo(r.pts[0]) > 2.5 * S) {
      // primeira vez ou teleporte: pendurada atrás do corpo
      for (let i = 0; i < n; i++) {
        r.pts[i].set(RA.x - sn * L * i * 0.35, RA.y - L * i * 0.93, RA.z - cs * L * i * 0.35);
        r.prev[i].copy(r.pts[i]);
      }
      r.init = true;
    }
    r.pts[0].copy(RA);
    if (h > 0) {
      for (let i = 1; i < n; i++) {
        const p = r.pts[i], q = r.prev[i];
        const k = i / (n - 1);
        const wave = (Math.sin(t * 5.1 - i * 0.9 + ri * 2.1) + 0.5 * Math.sin(t * 8.3 - i * 1.7 + ri)) * 5.5 * k;
        const gust = 4.2 * (0.75 + 0.35 * Math.sin(t * 1.3 + ri * 0.8));
        const ax = (-sn * gust + cs * wave) * S, az = (-cs * gust - sn * wave) * S;
        const ay = (-7.5 + Math.sin(t * 4.1 - i * 0.8 + ri) * 3.2 * k) * S;
        const vx = (p.x - q.x) * keep, vy = (p.y - q.y) * keep, vz = (p.z - q.z) * keep;
        q.copy(p);
        p.x += vx + ax * h * h;
        p.y += vy + ay * h * h;
        p.z += vz + az * h * h;
      }
    }
    for (let it = 0; it < 5; it++) {
      for (let i = 1; i < n; i++) {
        // gomo de comprimento fixo: os dois pontos cedem meio a meio (só o primeiro é preso); puxar só o de baixo faz a ponta chicotear
        const p = r.pts[i], o = r.pts[i - 1];
        RT.subVectors(p, o);
        const len = RT.length() || 1;
        const fix = (len - L) / len;
        if (i === 1) p.addScaledVector(RT, -fix);
        else {
          p.addScaledVector(RT, -fix * 0.5);
          o.addScaledVector(RT, fix * 0.5);
        }
        if (p.y < 0.03 * S) p.y = 0.03 * S;
        // corpo: cilindro achatado em volta do eixo do osso (acompanha a inclinação do tronco); quem entra por trás sai por trás
        r.bone.worldToLocal(RP.copy(p));
        const d = Math.hypot(RP.x, RP.z / 0.75);
        if (d < 0.21 && RP.y < 1.1) {
          RP.z = -0.75 * Math.sqrt(0.21 * 0.21 - Math.min(0.2, Math.abs(RP.x)) ** 2);
          p.copy(r.bone.localToWorld(RP));
        }
      }
    }
    // malha: largura ao longo do eixo lateral do osso (ou da vertical, se a fita estiver estendida de lado), com leve torção
    RX.setFromMatrixColumn(r.bone.matrixWorld, 0).normalize();
    const pos = r.geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < n; i++) {
      RT.subVectors(r.pts[Math.min(n - 1, i + 1)], r.pts[Math.max(0, i - 1)]).normalize();
      RW.copy(RX).addScaledVector(RT, -RX.dot(RT));
      if (RW.lengthSq() < 0.12) RW.set(0, 1, 0).addScaledVector(RT, -RT.y);
      RW.normalize();
      RN.crossVectors(RT, RW);
      const tw = Math.sin(t * 2.3 + i * 0.7 + ri * 1.7) * 0.35 * (i / (n - 1));
      const cw = Math.cos(tw), sw = Math.sin(tw);
      const k = i / (n - 1);
      const w = (r.width[0] + (r.width[1] - r.width[0]) * k) * S, th = r.thick * S;
      for (let j = 0; j < 4; j++) {
        const a = j % 2 === 0 ? (j === 0 ? -w : w) : 0, b = j % 2 === 1 ? (j === 1 ? th : -th) : 0;
        RP.copy(r.pts[i]).addScaledVector(RW, a * cw - b * sw).addScaledVector(RN, a * sw + b * cw);
        root.worldToLocal(RP);
        pos.setXYZ(i * 4 + j, RP.x, RP.y, RP.z);
      }
    }
    pos.needsUpdate = true;
    r.geo.computeVertexNormals();
  }
}

const V = new THREE.Vector3(), GV = new THREE.Vector3(), GH = new THREE.Vector3(), GD = new THREE.Vector3(), GQ = new THREE.Quaternion(), GZ = new THREE.Quaternion(), AXIS_Z = new THREE.Vector3(0, 0, 1);

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
