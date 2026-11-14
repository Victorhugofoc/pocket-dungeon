// Heróis. Os que têm o comentário "Redesenho" foram refeitos pelo método da seção 4 do roadmap; os outros são a versão antiga, a refazer em M2.
import * as THREE from "three";
import { type G, type Spec, at, beard, bell, belt, body, bx, cape, capeMesh, cone, cowboyHat, cyl, dagger, dk, dome, edge, fist, grp, hairCap, hairLong, hang, headBase, headMask, hood, lathe, limb, plateMesh, restArm, revolver, robeMesh, sculpt, sph, ss, staff, stud, sword, torus, tubeMesh, wizardHat, BLACK, BONE, GOLD, LEATHER, SKIN, WOOD } from "./kit";

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
  // Redesenho a partir do sprite (docs/ref/kaelen.png): duelista esguio de cabelo claro revolto, casaco azul-marinho com debrum dourado,
  // capa de forro vermelho e faísca ciano na mão. Medidas do sprite (altura 69 px): cabeça com cabelo 16 px, ombros com a capa 25 px, quadril a 41%.
  kaelen: (b) => {
    const NAVY = 0x2c3f78, NAVY_D = 0x141c3c, NAVY_L = 0x4a66b0, TRIM = 0xe0a030, LINING = 0x7a1f2c, HAIR = 0xf0ead8, HAIR_D = 0xa39678;
    const FACE = 0xe6b48c, FACE_D = 0xb88460, PANTS = 0x20253a, CYAN = 0x7feaff, BLADE = 0xdfe8f2, DARK = 0x1a1c26;
    const col = (hex: number) => new THREE.Color(hex);
    const cFace = col(FACE), cFaceD = col(FACE_D), cHair = col(HAIR), cHairD = col(HAIR_D);
    const HAND = 0.31;
    b.bulk = 0.92; b.style = "swing"; b.rough = 0.7; b.glowColor = CYAN;
    b.lean = 0.03; b.crouch = 0.08; b.armOut = 0.13;
    b.poseR = [0.15, -0.7]; b.poseL = [-0.45, -1.75];
    b.dims = { hipY: 0.95, headY: 0.58, shoulderY: 0.46, shoulderX: 0.27, arm: 0.33, hipX: 0.12, thigh: 0.44 };

    // ---- rosto: malha única com nariz e órbitas rasas; olhos por cima
    b.add("head", at(headBase({ w: 0.155, h: 0.185, d: 0.165, muzzle: 0.03, muzzleNarrow: 0.3, palate: null, brow: 0.012, socket: 0.02, cheek: 0, seg: [24, 18], tint: (n, c) => {
      c.copy(cFaceD).lerp(cFace, ss(-0.9, 0.2, n.y) * (0.75 + 0.25 * Math.max(0, n.z)));
      c.lerp(cFaceD, 0.5 * headMask.socket(n));
    } }), 0, 0.2, 0));
    b.add("head", at(stud(0.022, FACE, FACE_D, 0.8, 1.2, 1, 0), 0, 0.19, 0.185), at(bx(0.05, 0.012, 0.02, FACE_D, FACE_D), 0, 0.13, 0.175));
    for (const s of [-1, 1]) {
      b.add("head", at(stud(0.02, DARK, DARK, 1.1, 1.25, 0.5, 0), s * 0.058, 0.235, 0.148));
    }
    // ---- cabelo revolto: massa esculpida aberta no rosto e mechas soltas
    b.add("head", sculpt(24, 18, (n, p) => {
      const face = ss(0.1, 0.45, n.z) * ss(0.42, 0.18, n.y);
      const nape = ss(-0.45, -0.8, n.y) * (n.z > -0.2 ? 1 : 0.3);
      const k = (1.3 + 0.13 * Math.sin(n.x * 7 + n.y * 5) * Math.sin(n.z * 6 + 1) + 0.1 * ss(0.2, 0.9, n.y)) * (1 - 0.36 * face) * (1 - 0.4 * nape);
      p.set(n.x * 0.155 * k, n.y * 0.185 * k + 0.225, n.z * 0.165 * k - 0.012);
    }, (n, c) => {
      c.copy(cHairD).lerp(cHair, ss(-0.7, 0.5, n.y));
      if (Math.sin(n.x * 14 + n.z * 9) > 0.6) c.multiplyScalar(0.86);
    }));
    const lock = (x: number, y: number, z: number, dx: number, dy: number, dz: number, len: number) => {
      const g = cone(0.085, len, HAIR, 6, HAIR_D);
      g.scale(1, 1, 0.75);
      return g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize())).translate(x, y, z);
    };
    for (let i = 0; i < 8; i++) {
      const a = i * 0.785 + 0.3, r = 0.13 + (i % 2) * 0.03;
      b.add("head", lock(Math.sin(a) * r, 0.37 - (i % 3) * 0.03, Math.cos(a) * r - 0.03, Math.sin(a) * 0.8, 0.5, Math.cos(a) * 0.8 - 0.25, 0.2 + (i % 3) * 0.05));
    }
    for (const [x, dx] of [[-0.1, -0.2], [-0.02, 0.15], [0.08, 0.3]] as const) b.add("head", lock(x, 0.34, 0.17, dx, -0.8, 0.4, 0.15));

    // ---- casaco: tronco esguio com debrum e botões, gola alta e pelerine curta sobre os ombros
    const chest = lathe([[0.14, -0.08], [0.165, -0.04], [0.16, 0.1], [0.19, 0.3], [0.215, 0.42], [0.19, 0.5], [0.12, 0.56], [0.07, 0.6], [0, 0.61]], NAVY, NAVY_D, 14);
    chest.scale(1.1, 1, 0.78);
    const collar = edge(lathe([[0.095, 0.5], [0.125, 0.6], [0.135, 0.69]], NAVY, NAVY_D, 12), TRIM, 0.69);
    collar.scale(1, 1, 0.9);
    const capelet = edge(lathe([[0.33, -0.09], [0.335, -0.03], [0.28, 0.06], [0.2, 0.12], [0.14, 0.16]], NAVY, NAVY_D, 16), TRIM, -0.09);
    capelet.scale(1, 1, 0.74);
    b.add("torso", chest, collar, at(capelet, 0, 0.46, -0.01, 0.05), at(cyl(0.05, 0.055, 0.12, FACE, 8, FACE_D), 0, 0.6, 0));
    b.add("torso", at(bx(0.028, 0.42, 0.02, TRIM, dk(TRIM)), 0.035, 0.15, 0.142, -0.07));
    for (let i = 0; i < 3; i++) b.add("torso", at(stud(0.016, TRIM, dk(TRIM), 1, 1, 1, 0), -0.03, 0.04 + i * 0.11, 0.135 + i * 0.006));

    // ---- braços: manga com punho dourado e mão
    for (const [arm, fore, s] of [["armL", "foreL", -1], ["armR", "foreR", 1]] as const) {
      b.add(arm, stud(0.085, NAVY, NAVY_D), limb(0.075, 0.062, 0.31, NAVY));
      b.add(fore, edge(lathe([[0.07, -0.25], [0.072, -0.2], [0.06, -0.05], [0.062, 0.02], [0, 0.06]], NAVY, NAVY_D, 10), TRIM, -0.25));
      b.add(fore, ...grp(fist(FACE, 0.055, s), 0, -HAND, 0.01));
    }

    // ---- quadril: cinto, aba do casaco aberta na frente com debrum
    b.add("hips", at(sph(0.17, PANTS, 1.05, 0.75, 0.84), 0, 0, 0));
    b.add("hips", at(cyl(0.188, 0.188, 0.06, LEATHER, 14), 0, 0.1, 0, 0, 0, 0, 1, 1, 0.82), at(bx(0.06, 0.06, 0.03, TRIM), 0, 0.1, 0.152));
    b.add("skirt", robeMesh({ color: NAVY, shade: NAVY_D, rTop: 0.19, rHem: 0.275, yTop: 0.12, yHem: -0.34, folds: 0.03, panel: { half: 0.4, color: PANTS, trim: TRIM }, seg: 28, rings: 4 }));

    // ---- pernas: calça escura e bota alta com dobra
    for (const [th, sh] of [["thighL", "shinL"], ["thighR", "shinR"]] as const) {
      b.add(th, limb(0.1, 0.078, 0.42, PANTS, 0.04));
      b.add(sh, limb(0.085, 0.068, 0.36, NAVY, 0.15), at(cyl(0.088, 0.1, 0.07, NAVY_L, 10, NAVY), 0, -0.03, 0), at(sph(0.085, NAVY, 1, 0.7, 1.9, NAVY_D), 0, -0.42, 0.07));
    }

    // ---- capa azul-marinho com forro vermelho
    b.add("cape", at(capeMesh({ color: NAVY, shade: NAVY_D, lining: LINING, half: [1.35, 1.15], rTop: 0.25, rHem: 0.5, len: 1.2, depth: 0.8, folds: 0.07, tatter: 0.03 }), 0, 0.02, -0.03));

    // ---- lâmina fina em guarda baixa, com o fio aceso
    const tip = cone(0.02, 0.1, BLADE, 4, BLADE);
    tip.scale(1, 1, 0.45);
    b.add("foreR", ...grp([
      at(cyl(0.018, 0.018, 0.16, LEATHER, 6), 0, 0, 0), at(stud(0.03, TRIM, dk(TRIM), 1, 1, 1, 0), 0, 0.1, 0),
      at(bx(0.17, 0.024, 0.04, TRIM, dk(TRIM)), 0, -0.08, 0), at(bx(0.03, 0.95, 0.012, BLADE, 0xaab6c8), 0, -0.565, 0), at(tip, 0, -1.09, 0, Math.PI),
    ], 0, -HAND, 0, -0.5));
    b.lit("foreR", ...grp([at(bx(0.009, 0.92, 0.018, CYAN, CYAN), 0, -0.56, 0)], 0, -HAND, 0, -0.5));
    // ---- faísca na mão esquerda, na altura do peito
    b.lit("foreL", at(stud(0.045, CYAN, CYAN), 0, -HAND - 0.02, 0.07));
    for (let i = 0; i < 4; i++) b.lit("foreL", at(cone(0.016, 0.13, CYAN, 4, CYAN), 0, -HAND - 0.02, 0.07, i * 1.3 + 0.4, 0, i * 1.9));
    b.lights.push({ bone: "foreL", x: 0, y: -HAND, z: 0.1, color: 0x6fd8ff, intensity: 0.9, distance: 3 });
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
    const cS = col(STEEL_M), cSL = col(STEEL_L), cSD = col(STEEL_D), cFace = col(FACE), cDark = col(DARK), cHorn = col(HORN), cHornD = col(HORN_D), cBeard = col(BEARD), cBeardD = col(BEARD_D);
    const HAND = 0.35;
    b.bulk = 1.25; b.style = "swing"; b.rough = 0.55;
    b.lean = 0.16; b.crouch = 0.3; b.armOut = 0.12;
    b.poseR = [0.1, -1.0]; b.poseL = [-0.5, -1.0];
    b.dims = { hipY: 0.86, headY: 0.64, shoulderY: 0.5, shoulderX: 0.36, arm: 0.36, hipX: 0.21, thigh: 0.4 };

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
    const cuirass = edge(lathe([[0.2, -0.08], [0.24, -0.05], [0.228, 0.05], [0.252, 0.06], [0.24, 0.16], [0.268, 0.17], [0.3, 0.3], [0.325, 0.43], [0.29, 0.53], [0.19, 0.6], [0.11, 0.64], [0, 0.65]], STEEL_M, STEEL_D, 16), TRIM, 0.05, 0.16);
    cuirass.scale(1.1, 1, 0.84);
    const scarf = lathe([[0.17, 0.55], [0.225, 0.6], [0.21, 0.67], [0.13, 0.71]], RED, RED_D, 12);
    scarf.scale(1.05, 1, 0.92);
    b.add("torso", cuirass, scarf);

    // ---- ombreiras em três lâminas sobrepostas, braço de malha, cotoveleira, braçal e manopla de couro
    const plate = (r: number) => dome(r, STEEL_L, STEEL_M, TRIM);
    for (const [arm, fore, s] of [["armL", "foreL", -1], ["armR", "foreR", 1]] as const) {
      b.add(arm, at(plate(0.21), s * 0.02, 0.06, 0, 0, 0, -s * 0.3), at(plate(0.18), s * 0.07, -0.06, 0, 0, 0, -s * 0.9), at(plate(0.155), s * 0.09, -0.16, 0, 0, 0, -s * 1.3));
      b.add(arm, limb(0.1, 0.085, 0.34, STEEL_D));
      b.add(fore, at(stud(0.09, STEEL_L, STEEL_D), 0, 0, -0.02));
      b.add(fore, lathe([[0.075, -0.28], [0.088, -0.25], [0.1, -0.1], [0.105, -0.02], [0.07, 0.04], [0, 0.07]], STEEL_M, STEEL_D, 10));
      b.add(fore, ...grp(fist(HIDE, 0.072, s), 0, -HAND, 0.01));
    }

    // ---- quadril: saiote de lâminas, cinto com fivela e tabardo vermelho solto na frente
    const fauld = edge(lathe([[0.315, -0.15], [0.3, -0.07], [0.312, -0.065], [0.285, 0.02], [0.297, 0.025], [0.262, 0.1]], STEEL_L, STEEL_M, 16), TRIM, -0.07, 0.02);
    fauld.scale(1.06, 1, 0.84);
    b.add("hips", at(sph(0.25, STEEL_D, 1.05, 0.7, 0.84), 0, 0, 0), fauld);
    b.add("hips", at(cyl(0.285, 0.285, 0.075, HIDE, 16), 0, 0.1, 0, 0, 0, 0, 1, 1, 0.84), at(bx(0.09, 0.09, 0.04, GOLD), 0, 0.1, 0.235));
    b.add("skirt", at(capeMesh({ color: RED, shade: RED_D, half: [0.7, 0.5], rTop: 0.27, rHem: 0.33, len: 0.46, folds: 0.04, tatter: 0.07, nu: 8, nt: 4 }), 0, 0.03, 0.235, 0, Math.PI, 0));

    // ---- pernas: coxote, joelheira, greva e sabato
    for (const [th, sh, s] of [["thighL", "shinL", -1], ["thighR", "shinR", 1]] as const) {
      b.add(th, limb(0.14, 0.11, 0.38, STEEL_D, 0.05));
      b.add(th, at(plate(0.15), s * 0.03, -0.2, 0.03, Math.PI - 0.25, 0, 0, 1, 1.5, 0.9));
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
  // Redesenho a partir do sprite (docs/ref/seraph.png): paladino ereto de placa branca com debrum dourado, elmo fechado, espada erguida e escudo grande.
  // Medidas do sprite (altura 65 px): elmo 13 px, ombros 25 px, quadril a 43% da altura, espada de 36 px, escudo de 22 por 32 px.
  seraph: (b) => {
    const WHITE = 0xf1f4f9, WHITE_M = 0xc2c9d6, WHITE_D = 0x8790a4, GOLD_D = 0xa87a1e, BLUE = 0x4f8fdc, BLUE_D = 0x24488a, DARK = 0x1a2030, BLADE = 0xe3eaf4;
    const col = (hex: number) => new THREE.Color(hex);
    const cW = col(WHITE), cWM = col(WHITE_M), cWD = col(WHITE_D), cGold = col(GOLD), cGoldD = col(GOLD_D);
    const HAND = 0.33;
    b.bulk = 1.1; b.style = "throwL"; b.rough = 0.45; b.glowColor = GOLD;
    b.lean = 0.04; b.crouch = 0.1; b.armOut = 0.16;
    b.poseR = [0.2, -1.8]; b.poseL = [-0.45, -1.15];
    b.dims = { hipY: 0.95, headY: 0.6, shoulderY: 0.48, shoulderX: 0.31, arm: 0.34, hipX: 0.14, thigh: 0.44 };
    const plate = (r: number) => dome(r, WHITE, WHITE_M, GOLD);

    // ---- elmo fechado: viseira em bico com fenda dos olhos e respiros, crista e gola douradas, asas para trás
    b.add("head", at(sculpt(28, 20, (n, p) => {
      const beak = ss(0.3, 0.95, n.z) * bell(n.y + 0.1, 0.45) * bell(n.x, 0.5);
      p.set(n.x * 0.2 * (1 - 0.25 * beak), n.y * 0.235 + 0.015 * bell(n.x, 0.12) * ss(0, 0.7, n.y), n.z * 0.215 + 0.07 * beak);
    }, (n, c) => {
      c.copy(cWD).lerp(cWM, ss(-0.9, -0.1, n.y)).lerp(cW, ss(-0.2, 0.6, n.y));
      if (Math.abs(n.y + 0.62) < 0.09 || (Math.abs(n.x) < 0.09 && n.y > 0.2)) c.copy(cGold);
    }), 0, 0.2, 0));
    for (const s of [-1, 1]) {
      // fenda dos olhos e respiros da viseira, como peças escuras encaixadas na malha
      b.add("head", at(bx(0.11, 0.034, 0.05, DARK, DARK), s * 0.075, 0.235, 0.185, 0, s * 0.6, 0));
      for (let i = 0; i < 3; i++) b.add("head", at(bx(0.016, 0.07, 0.04, DARK, DARK), s * (0.035 + i * 0.035), 0.13, 0.245 - i * 0.022, 0, s * 0.5, 0));
      for (const [len, y, tilt] of [[0.36, 0.36, -0.75], [0.26, 0.28, -1.05]] as const) {
        const wing = cone(0.075, len, WHITE, 6, GOLD);
        wing.scale(0.3, 1, 1);
        b.add("head", at(wing, s * 0.2, y, -0.1, tilt, 0, -s * 0.3));
      }
    }

    // ---- couraça em lâminas com debrum dourado, lenço azul e emblema
    const cuirass = edge(lathe([[0.17, -0.08], [0.2, -0.05], [0.19, 0.06], [0.21, 0.07], [0.2, 0.17], [0.225, 0.18], [0.26, 0.32], [0.275, 0.43], [0.245, 0.52], [0.16, 0.59], [0.1, 0.63], [0, 0.64]], WHITE, WHITE_D, 16), GOLD, 0.07, 0.18);
    cuirass.scale(1.08, 1, 0.82);
    const scarf = lathe([[0.15, 0.53], [0.2, 0.58], [0.185, 0.65], [0.12, 0.69]], BLUE, BLUE_D, 12);
    scarf.scale(1.05, 1, 0.92);
    b.add("torso", cuirass, scarf, at(stud(0.05, GOLD, GOLD_D, 1, 1.3, 0.5, 0), 0, 0.37, 0.215));

    // ---- ombreiras de duas lâminas, cotoveleira dourada, braçal e manopla
    for (const [arm, fore, s] of [["armL", "foreL", -1], ["armR", "foreR", 1]] as const) {
      b.add(arm, at(plate(0.17), s * 0.02, 0.05, 0, 0, 0, -s * 0.35), at(plate(0.145), s * 0.06, -0.05, 0, 0, 0, -s * 1.0));
      b.add(arm, limb(0.085, 0.072, 0.32, WHITE_M));
      b.add(fore, at(stud(0.072, GOLD, GOLD_D), 0, 0, -0.02));
      b.add(fore, edge(lathe([[0.065, -0.27], [0.076, -0.24], [0.088, -0.1], [0.09, -0.02], [0.06, 0.04], [0, 0.07]], WHITE, WHITE_M, 10), GOLD, -0.27));
      b.add(fore, ...grp(fist(WHITE_M, 0.062, s), 0, -HAND, 0.01));
    }

    // ---- quadril: saiote de lâminas, cinto dourado e tabardo azul até o joelho
    const fauld = edge(lathe([[0.27, -0.15], [0.257, -0.07], [0.267, -0.065], [0.245, 0.02], [0.255, 0.025], [0.225, 0.1]], WHITE, WHITE_M, 16), GOLD, -0.15, -0.065, 0.025);
    fauld.scale(1.06, 1, 0.84);
    b.add("hips", at(sph(0.21, WHITE_D, 1.05, 0.7, 0.84), 0, 0, 0), fauld);
    b.add("hips", at(cyl(0.243, 0.243, 0.07, GOLD, 16, GOLD_D), 0, 0.1, 0, 0, 0, 0, 1, 1, 0.84));
    b.add("skirt", at(capeMesh({ color: BLUE, shade: BLUE_D, half: [0.8, 0.62], rTop: 0.23, rHem: 0.28, len: 0.6, folds: 0.04, tatter: 0.03, nu: 8, nt: 5 }), 0, 0.04, 0.2, 0, Math.PI, 0));

    // ---- pernas: coxote, joelheira dourada, greva e sabato
    for (const [th, sh, s] of [["thighL", "shinL", -1], ["thighR", "shinR", 1]] as const) {
      b.add(th, limb(0.115, 0.09, 0.42, WHITE_M, 0.05));
      b.add(th, at(plate(0.125), s * 0.02, -0.2, 0.03, Math.PI - 0.25, 0, 0, 1, 1.5, 0.9));
      b.add(sh, at(stud(0.085, GOLD, GOLD_D), 0, 0, 0.035));
      b.add(sh, limb(0.09, 0.072, 0.36, WHITE, 0.18), at(sph(0.09, WHITE, 1.05, 0.7, 1.9, WHITE_D), 0, -0.42, 0.075));
    }

    // ---- capa azul até a panturrilha
    b.add("cape", at(capeMesh({ color: BLUE, shade: BLUE_D, half: [1.2, 0.8], rTop: 0.28, rHem: 0.5, len: 1.25, depth: 0.8, folds: 0.07, tatter: 0.04 }), 0, 0.04, -0.02));

    // ---- espada erguida na vertical do mundo
    const R = restArm(b, 1, HAND), L = restArm(b, -1, HAND);
    const tip = cone(0.06, 0.14, BLADE, 4, BLADE);
    tip.rotateY(Math.PI / 4).scale(1, 1, 0.37);
    const sword: G[] = [
      at(cyl(0.022, 0.022, 0.2, LEATHER, 6), 0, 0, 0), at(stud(0.04, GOLD, GOLD_D, 1, 1, 1, 0), 0, -0.13, 0),
      at(bx(0.3, 0.045, 0.06, GOLD, GOLD_D), 0, 0.12, 0),
      at(bx(0.085, 1.05, 0.022, BLADE, 0xaab6c8), 0, 0.665, 0), at(bx(0.02, 1.0, 0.03, 0xaab6c8, 0x8794a8), 0, 0.64, 0),
      at(tip, 0, 1.26, 0),
    ];
    b.add("foreR", ...hang(grp(sword, 0, 0, 0, -0.12, 0, -0.22), R.inv, HAND));

    // ---- escudo de cavaleiro: campo branco, borda e cruz douradas, levemente curvo
    const half = (v: number) => 0.3 * (v < 0.3 ? 1 : Math.sqrt(Math.max(0, 1 - Math.pow((v - 0.3) / 0.7, 2.2))));
    const shield = plateMesh(10, 12, (u, v, p) => {
      const x = u * half(v);
      p.set(x, 0.36 - v * 0.8, -1.6 * x * x);
    }, (u, v, c) => {
      const x = u * half(v);
      const rim = Math.abs(u) > 0.8 || v < 0.07 || v > 0.9;
      const cross = Math.abs(x) < 0.04 || Math.abs(v - 0.3) < 0.045;
      c.copy(rim ? cGoldD : cross ? cGold : cW);
    }, WHITE_D, 0.03);
    b.add("foreL", ...hang([at(shield, 0.04, 0.02, 0.1, 0, -0.12, 0), at(stud(0.06, GOLD, GOLD_D, 1, 1, 0.5), 0.03, 0.14, 0.125)], L.inv, HAND));
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
