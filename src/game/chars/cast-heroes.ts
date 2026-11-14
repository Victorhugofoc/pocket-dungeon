// Heróis. Os que têm o comentário "Redesenho" foram refeitos pelo método da seção 4 do roadmap; os outros são a versão antiga, a refazer em M2.
import * as THREE from "three";
import { type G, type Spec, at, beard, bell, belt, body, bx, cape, capeMesh, cone, cowboyHat, cyl, dagger, fist, grp, hairCap, hairLong, hood, lathe, limb, pauldron, restArm, revolver, sculpt, shield, sph, ss, staff, stud, sword, torus, tubeMesh, wizardHat, BLACK, BONE, GOLD, LEATHER, SKIN, WOOD } from "./kit";

export const HEROES: Record<string, Spec> = {
  // ------------------------------------------------ heróis
  frostine: (b) => {
    body(b, { skin: 0xdcefff, top: 0x6fa3e0, sleeve: 0x8fbdf0, robe: { color: 0x5b8fd6, hem: 0xeaf6ff, flare: 1.15 } });
    b.glowColor = 0x9be4ff;
    b.style = "cast"; b.poseR = [-0.5, -1.0];
    b.add("head", ...hairLong(0xeaf6ff, 0.55));
    for (let i = 0; i < 5; i++) b.lit("head", at(cone(0.035, i === 2 ? 0.26 : 0.17, 0xbfeaff, 4), (i - 2) * 0.09, 0.47 - Math.abs(i - 2) * 0.03, 0.08, 0, 0, -(i - 2) * 0.18));
    b.add("torso", at(torus(0.26, 0.06, 0xeaf6ff), 0, 0.5, 0), at(bx(0.08, 0.5, 0.03, 0xeaf6ff), 0, 0.22, 0.2));
    b.add("foreR", ...staff(0xbfd9f2));
    for (let i = 0; i < 6; i++) b.lit("foreR", at(bx(0.035, 0.34, 0.035, 0xbfeaff), 0, -0.31, 1.22, 0, 0, (i / 6) * Math.PI));
    b.lit("foreR", at(sph(0.07, 0xeaffff), 0, -0.31, 1.22));
  },
  kaelen: (b) => {
    body(b, { skin: SKIN, top: 0x2f3f7a, bottom: 0x26305a, boots: 0x1c2444 });
    b.glowColor = 0xffe066;
    b.style = "swing"; b.poseR = [-0.35, -0.7];
    b.add("head", ...hairCap(0xe8e2d0), at(sph(0.1, 0xe8e2d0, 1.2, 0.6, 1), 0.08, 0.36, 0.12));
    b.add("cape", ...cape(0x3a56a8, 0.3, 1.0));
    b.add("hips", ...belt(GOLD));
    b.add("torso", at(bx(0.07, 0.4, 0.03, GOLD), 0, 0.3, 0.205), at(torus(0.2, 0.04, 0x3a56a8), 0, 0.52, 0));
    b.add("foreR", ...sword(0.9, 0xd9e6ff));
  },
  aurelius: (b) => {
    body(b, { skin: 0xe8c8a8, top: 0x6a3fb0, sleeve: 0x7a4fc0, robe: { color: 0x5a2f9a, hem: GOLD } });
    b.glowColor = 0xd08cff;
    b.style = "cast"; b.poseR = [-0.9, -0.9]; b.poseL = [-0.2, -0.6];
    b.add("head", ...wizardHat(0x6a3fb0, GOLD), ...beard(0xf2f2f2, 0.5), at(sph(0.2, 0xf2f2f2, 1, 0.7, 0.6), 0, 0.14, -0.1));
    b.add("torso", at(bx(0.09, 0.5, 0.03, GOLD), 0, 0.22, 0.2));
    b.lit("foreR", at(sph(0.13, 0xe0b0ff), 0, -0.5, 0.05));
    b.add("foreR", at(torus(0.17, 0.018, GOLD), 0, -0.5, 0.05, 0.6));
  },
  ignis: (b) => {
    body(b, { skin: 0xe0a070, top: 0x2b2b30, bottom: 0x2b2b30, boots: 0x3a2a22, sleeve: 0xe0a070 });
    b.glowColor = 0xff7a1a;
    b.style = "thrust"; b.poseR = [-0.7, -1.2]; b.poseL = [-0.5, -1.3];
    b.add("head", ...hairCap(0xe8331a));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      b.add("head", at(cone(0.075, 0.34, i % 2 ? 0xff5a2a : 0xe8331a, 5), Math.cos(a) * 0.1, 0.5, Math.sin(a) * 0.1 - 0.02, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5));
    }
    b.add("hips", ...belt(0xc8281e, 1, 0xc8281e), at(bx(0.07, 0.36, 0.03, 0xc8281e), 0.12, -0.18, 0.18));
    for (const f of ["foreL", "foreR"]) {
      b.add(f, at(cyl(0.075, 0.075, 0.1, 0xc8281e, 8), 0, -0.2, 0));
      b.lit(f, at(sph(0.1, 0xffa040), 0, -0.34, 0), at(cone(0.07, 0.22, 0xffd34d, 6), 0, -0.34, 0.1, 1.2));
    }
  },
  zephyr: (b) => {
    body(b, { skin: 0xe0b088, top: 0x8a6a4a, bottom: 0x3a3f5a, boots: 0x6b3f2a, sleeve: 0xd9b48a });
    b.style = "dual"; b.poseR = [-1.35, -0.15]; b.poseL = [-0.35, -0.9];
    b.add("head", ...cowboyHat(0x9a9488, 0x5a4a3a), at(sph(0.2, 0x2f8f8a, 1.04, 0.6, 1.02), 0, 0.1, 0.03), at(sph(0.19, 0xb8b0a0, 1, 0.5, 0.6), 0, 0.3, -0.12));
    // poncho
    b.add("torso", lathe([[0.4, 0.12], [0.38, 0.19], [0.28, 0.4], [0.16, 0.54], [0.12, 0.57]], 0x2f8f8a, 0x1f6f6a));
    b.add("torso", at(torus(0.39, 0.028, 0x7fd9cc), 0, 0.16, 0));
    b.add("cape", ...cape(0x256f6c, 0.3, 0.7));
    b.add("hips", ...belt(LEATHER));
    b.add("foreR", ...revolver());
    b.add("foreL", ...revolver());
  },
  // Redesenho a partir do sprite (docs/ref/varok.png): guerreiro atarracado de placas, elmo com chifres, maça de duas mãos atravessada no corpo.
  // Medidas do sprite (altura 80 px sem os chifres): elmo 16 px, ombreira a ombreira 34 px, quadril a 37% da altura, maça de 62 px com cabeça de 15 px.
  varok: (b) => {
    const STEEL_L = 0xbcc5d2, STEEL_M = 0x808b9d, STEEL_D = 0x3b4354, TRIM = 0x262c3a, RED = 0xc22a2c, RED_D = 0x6a1218;
    const HORN = 0xeadfbe, HORN_D = 0x9c8258, HIDE = 0x7a4a28, FACE = 0xd9a47c, BEARD = 0x94431f, BEARD_D = 0x4e200f, IRON_V = 0x8d96a6, DARK = 0x1a1c24;
    const col = (hex: number) => new THREE.Color(hex);
    const cS = col(STEEL_M), cSL = col(STEEL_L), cSD = col(STEEL_D), cFace = col(FACE), cDark = col(DARK), cHorn = col(HORN), cHornD = col(HORN_D), cBeard = col(BEARD), cBeardD = col(BEARD_D), cTrim = col(TRIM);
    const HAND = 0.35;
    b.bulk = 1.25; b.style = "swing"; b.rough = 0.55;
    b.lean = 0.16; b.crouch = 0.3; b.armOut = 0.12;
    b.poseR = [0.1, -1.0]; b.poseL = [-0.5, -1.0];
    b.dims = { hipY: 0.86, headY: 0.64, shoulderY: 0.5, shoulderX: 0.36, arm: 0.36, hipX: 0.21, thigh: 0.4 };

    // escurece os vértices nas alturas dadas: a sombra sob a borda de cada lâmina
    const edge = (g: G, ...ys: number[]): G => {
      const pos = g.attributes.position, c = g.attributes.color;
      for (let i = 0; i < pos.count; i++) if (ys.some((y) => Math.abs(pos.getY(i) - y) < 0.004)) c.setXYZ(i, cTrim.r, cTrim.g, cTrim.b);
      return g;
    };

    // ---- elmo: malha única com a abertura do rosto afundada, nasal, faixa de rebites e crista
    const nasal = (n: THREE.Vector3) => ss(0.1, 0.05, Math.abs(n.x)) * ss(-0.3, -0.15, n.y);
    const open = (n: THREE.Vector3) => ss(0.66, 0.52, Math.abs(n.x)) * ss(0.34, 0.24, n.y) * ss(0.2, 0.45, n.z) * (1 - nasal(n));
    b.add("head", at(sculpt(28, 20, (n, p) => {
      const skirt = ss(-0.3, -0.9, n.y);
      p.set(
        n.x * 0.212 * (1 + 0.08 * skirt),
        n.y * 0.235 + 0.018 * bell(n.x, 0.14) * ss(0, 0.7, n.y),
        n.z * 0.222 - 0.035 * open(n) + 0.025 * bell(n.y - 0.36, 0.07) * ss(0.2, 0.7, n.z),
      );
    }, (n, c) => {
      c.copy(cSD).lerp(cS, ss(-0.8, 0.3, n.y)).lerp(cSL, ss(0.3, 0.95, n.y) * 0.7);
      if (Math.abs(n.y - 0.46) < 0.035) c.copy(cSD);
      if (open(n) > 0.5) c.copy(n.y > -0.1 ? cDark : cFace); // olhos na sombra do elmo
    }), 0, 0.2, 0));
    for (const s of [-1, 1]) {
      b.add("head", at(stud(0.018, 0xf2ead8, 0xf2ead8, 1.3, 1, 1, 0), s * 0.075, 0.225, 0.172));
      b.add("head", at(stud(0.04, BEARD, BEARD_D, 1.8, 0.7, 0.8, 0), s * 0.06, 0.1, 0.2, 0, 0, -s * 0.4));
      // chifre curvo: sai do lado do elmo e sobe
      b.add("head", tubeMesh(8, 7, (t, o) => {
        const th = t * 1.75;
        o.set(s * (0.16 + 0.2 * Math.sin(th)), 0.3 + 0.24 * (1 - Math.cos(th)), -0.01 + 0.05 * t);
      }, (t) => 0.062 * Math.pow(Math.max(0, 1 - t), 0.75) + 0.004, (_a, t, c) => {
        c.copy(cHornD).lerp(cHorn, ss(0, 0.35, t)).lerp(cHornD, ss(0.8, 1, t) * 0.5);
      }));
      b.add("head", at(cyl(0.07, 0.07, 0.045, STEEL_D, 8), s * 0.195, 0.3, -0.01, 0, 0, Math.PI / 2));
    }
    // barba ruiva caindo sobre o peito
    b.add("head", at(sculpt(16, 12, (n, p) => {
      const tip = ss(0.2, -1, n.y);
      p.set(n.x * 0.19 * (1 - 0.5 * tip), n.y * 0.15 - 0.035 * Math.abs(Math.sin(n.x * 9)) * tip, n.z * 0.07 + 0.02 * tip);
    }, (n, c) => {
      c.copy(cBeardD).lerp(cBeard, 0.45 + 0.55 * ss(-0.6, 0.8, n.z));
      if (Math.sin(n.x * 20) > 0.55) c.multiplyScalar(0.78);
    }), 0, -0.02, 0.15, 0.1), at(stud(0.03, DARK, DARK, 1.5, 0.8, 0.6, 0), 0, 0.06, 0.205));

    // ---- couraça em lâminas (cada lâmina abre por baixo), lenço vermelho no pescoço
    const cuirass = edge(lathe([[0.2, -0.08], [0.24, -0.05], [0.228, 0.05], [0.252, 0.06], [0.24, 0.16], [0.268, 0.17], [0.3, 0.3], [0.325, 0.43], [0.29, 0.53], [0.19, 0.6], [0.11, 0.64], [0, 0.65]], STEEL_M, STEEL_D, 16), 0.05, 0.16);
    cuirass.scale(1.1, 1, 0.84);
    const scarf = lathe([[0.17, 0.55], [0.225, 0.6], [0.21, 0.67], [0.13, 0.71]], RED, RED_D, 12);
    scarf.scale(1.05, 1, 0.92);
    b.add("torso", cuirass, scarf);

    // ---- ombreiras em três lâminas sobrepostas, braço de malha, cotoveleira, braçal e manopla de couro
    const dome = (r: number) => edge(lathe([[r * 1.07, -0.045], [r * 1.03, -0.005], [r * 0.93, r * 0.4], [r * 0.62, r * 0.78], [0, r * 0.95]], STEEL_L, STEEL_M, 12), -0.045);
    for (const [arm, fore, s] of [["armL", "foreL", -1], ["armR", "foreR", 1]] as const) {
      b.add(arm, at(dome(0.21), s * 0.02, 0.06, 0, 0, 0, -s * 0.3), at(dome(0.18), s * 0.07, -0.06, 0, 0, 0, -s * 0.9), at(dome(0.155), s * 0.09, -0.16, 0, 0, 0, -s * 1.3));
      b.add(arm, limb(0.1, 0.085, 0.34, STEEL_D));
      b.add(fore, at(stud(0.09, STEEL_L, STEEL_D), 0, 0, -0.02));
      b.add(fore, lathe([[0.075, -0.28], [0.088, -0.25], [0.1, -0.1], [0.105, -0.02], [0.07, 0.04], [0, 0.07]], STEEL_M, STEEL_D, 10));
      b.add(fore, ...grp(fist(HIDE, 0.072, s), 0, -HAND, 0.01));
    }

    // ---- quadril: saiote de lâminas, cinto com fivela e tabardo vermelho solto na frente
    const fauld = edge(lathe([[0.315, -0.15], [0.3, -0.07], [0.312, -0.065], [0.285, 0.02], [0.297, 0.025], [0.262, 0.1]], STEEL_L, STEEL_M, 16), -0.07, 0.02);
    fauld.scale(1.06, 1, 0.84);
    b.add("hips", at(sph(0.25, STEEL_D, 1.05, 0.7, 0.84), 0, 0, 0), fauld);
    b.add("hips", at(cyl(0.285, 0.285, 0.075, HIDE, 16), 0, 0.1, 0, 0, 0, 0, 1, 1, 0.84), at(bx(0.09, 0.09, 0.04, GOLD), 0, 0.1, 0.235));
    b.add("skirt", at(capeMesh({ color: RED, shade: RED_D, half: [0.7, 0.5], rTop: 0.27, rHem: 0.33, len: 0.46, folds: 0.04, tatter: 0.07, nu: 8, nt: 4 }), 0, 0.03, 0.235, 0, Math.PI, 0));

    // ---- pernas: coxote, joelheira, greva e sabato
    for (const [th, sh, s] of [["thighL", "shinL", -1], ["thighR", "shinR", 1]] as const) {
      b.add(th, limb(0.14, 0.11, 0.38, STEEL_D, 0.05));
      b.add(th, at(dome(0.15), s * 0.03, -0.2, 0.03, Math.PI - 0.25, 0, 0, 1, 1.5, 0.9));
      b.add(sh, at(stud(0.1, STEEL_L, STEEL_D, 1, 1, 1), 0, 0, 0.04));
      b.add(sh, limb(0.105, 0.085, 0.32, STEEL_M, 0.2), at(sph(0.1, STEEL_M, 1.1, 0.7, 1.9, STEEL_D), 0, -0.38, 0.08));
    }

    // ---- capa vermelha presa nos ombros
    b.add("cape", at(capeMesh({ color: RED, shade: RED_D, half: [1.25, 0.85], rTop: 0.32, rHem: 0.54, len: 1.1, depth: 0.8, folds: 0.07, tatter: 0.08 }), 0, 0.05, -0.04));

    // ---- maça de duas mãos: a mão direita segura o pé do cabo, o cabo atravessa o corpo e a cabeça fica à esquerda, na altura do elmo
    const R = restArm(b, 1, HAND);
    const dir = new THREE.Vector3(-0.72, 0.6, 0.35).normalize();
    const aim = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    const HEAD = 1.3;
    const mace: G[] = [
      at(cyl(0.03, 0.034, 1.36, WOOD, 7), 0, 0.53, 0), at(stud(0.05, IRON_V, STEEL_D, 1, 1, 1, 0), 0, -0.16, 0),
      at(cyl(0.04, 0.04, 0.2, HIDE, 7), 0, 0, 0), at(cyl(0.04, 0.04, 0.2, HIDE, 7), 0, 0.5, 0),
      at(cyl(0.05, 0.062, 0.1, IRON_V, 8, STEEL_D), 0, HEAD - 0.17, 0),
      at(sph(0.15, IRON_V, 1, 1, 1, STEEL_D), 0, HEAD, 0),
    ];
    const ico = new THREE.IcosahedronGeometry(1, 0).attributes.position;
    const seen: THREE.Vector3[] = [];
    for (let i = 0; i < ico.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(ico, i);
      if (seen.some((o) => o.distanceTo(v) < 0.01)) continue;
      seen.push(v);
      const spike = cone(0.055, 0.12, STEEL_L, 5, IRON_V);
      mace.push(spike.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v)).translate(v.x * 0.19, HEAD + v.y * 0.19, v.z * 0.19));
    }
    b.add("weapon", ...mace.map((g) => g.rotateX(Math.PI)));
    b.weapon = { hand: HAND, carry: R.inv.clone().multiply(aim), grip: 0.5 };
  },
  umbra: (b) => {
    body(b, { skin: 0x2a2a34, top: BLACK, bottom: BLACK, boots: 0x15151a, eyes: 0xe07aff, eyeGlow: true });
    b.glowColor = 0xc83cd9;
    b.style = "thrust"; b.poseR = [-0.6, -1.1]; b.poseL = [-0.3, -1.2];
    b.add("head", ...hood(BLACK));
    b.add("torso", at(torus(0.19, 0.06, 0xc83cd9), 0, 0.52, 0));
    b.add("cape", at(bx(0.12, 0.75, 0.03, 0xc83cd9, 0x8a2aa0), -0.1, -0.36, 0.04), at(bx(0.1, 0.55, 0.03, 0xa02ab8, 0x6a1a80), 0.1, -0.28, 0.06));
    b.add("hips", ...belt(0x3a3a44, 1, 0xc83cd9));
    b.add("foreR", ...dagger()).add("foreL", ...dagger());
  },
  seraph: (b) => {
    body(b, { skin: 0xe8ecf2, top: 0xe8ecf2, bottom: 0xc8ced8, boots: 0xd9dee6, bulk: 1.12, hands: 0xe8ecf2, eyes: null });
    b.glowColor = GOLD;
    b.style = "throw"; b.poseR = [-0.4, -0.8]; b.poseL = [-0.5, -1.0];
    b.add("head", at(sph(0.235, 0xe8ecf2, 1, 0.9, 1.02), 0, 0.24, 0), at(bx(0.3, 0.035, 0.04, 0x2a3040), 0, 0.22, 0.215), at(bx(0.035, 0.16, 0.04, 0x2a3040), 0, 0.16, 0.215));
    b.add("head", at(bx(0.04, 0.26, 0.4, GOLD), 0, 0.48, -0.04));
    for (const s of [-1, 1]) b.add("head", at(bx(0.03, 0.2, 0.16, GOLD), s * 0.24, 0.38, -0.04, 0, 0, -s * 0.4));
    b.add("armL", ...pauldron(0xe8ecf2, 0.16)).add("armR", ...pauldron(0xe8ecf2, 0.16));
    b.add("cape", ...cape(0x4a8fd6, 0.33, 1.05));
    b.add("hips", ...belt(GOLD, 1.12));
    b.add("torso", at(bx(0.16, 0.24, 0.03, GOLD), 0, 0.34, 0.215));
    b.add("foreR", ...sword(0.85));
    b.add("foreL", ...shield(0xf2f4f8, GOLD));
  },
  vesper: (b) => {
    body(b, { skin: 0x4a342e, top: 0xd9841f, sleeve: 0xd9841f, robe: { color: 0xd9841f, hem: 0x2a1a12 } });
    b.glowColor = 0x8cf273;
    b.style = "cast"; b.poseR = [-0.5, -1.0];
    b.add("head", ...wizardHat(0xd9841f, 0x2a1a12, -0.12), ...hairLong(0x2a1a12, 0.3));
    for (const y of [-0.62, -0.38, -0.14]) b.add("skirt", at(torus(0.44 + (y + 0.14) * -0.02 + (y < -0.5 ? 0 : -0.09 + (y + 0.38) * -0.35), 0.03, 0x2a1a12), 0, y, 0));
    b.add("torso", at(torus(0.24, 0.035, 0x2a1a12), 0, 0.2, 0));
    b.add("foreR", ...staff(WOOD, 1.8), at(sph(0.13, BONE, 1, 1.1, 1.05), 0, -0.31, 1.2), at(bx(0.12, 0.08, 0.1, BONE), 0, -0.36, 1.12));
    b.lit("foreR", at(sph(0.035, 0x8cf273), -0.05, -0.3, 1.31), at(sph(0.035, 0x8cf273), 0.05, -0.3, 1.31));
  },
};
