// Chefes. Método de modelagem: seção 4 de docs/roadmap.md; conferir em /preview.html com o sprite ao lado.
import * as THREE from "three";
import { displace, paint, prep } from "../flora";
import { type G, type Spec, at, bell, belt, body, bx, cap, cape, cone, cyl, dk, grp, hairLong, headBase, headMask, lathe, limb, muscleArm, muscleLeg, hang, restArm, robeMesh, sculpt, sph, ss, staff, stud, torsoMesh, torus, BONE, GOLD, IRON, LEATHER } from "./kit";

export const BOSSES: Record<string, Spec> = {
  // ------------------------------------------------ chefes
  // Redesenho a partir do sprite do Dungeon Reign (docs/ref/bloodfang.png); conferir em preview.html.
  // Anatomia do sprite: tronco e cabeça esculpidos como malha única, membros com perfil de músculo, esqueleto próprio.
  bloodfang: (b) => {
    const RED = 0xd8301e, RED_D = 0x7e1412, RED_L = 0xee5a3c, CREAM = 0xf6ecd8, CREAM_D = 0xbfa888, DARK = 0x160b0d, MOUTH = 0x4e0a12;
    const COWL = 0x5a6884, COWL_D = 0x2a3448, HIDE = 0x5e3a22, CLAW = 0xf0e6d0, EYE = 0xffd23a, FANG = 0xfffaf0, BONE_D = 0x9c8862;
    const col = (hex: number) => new THREE.Color(hex);
    const cRed = col(RED), cRedD = col(RED_D), cCream = col(CREAM), cCreamD = col(CREAM_D), cDark = col(DARK), cBone = col(BONE);
    b.bulk = 1.6; b.scale = 2.3; b.style = "swing"; b.glowColor = EYE; b.rough = 0.7;
    b.lean = 0.3; b.crouch = 0.34; b.armOut = 0.3;
    b.poseR = [-0.2, -0.95]; b.poseL = [-0.65, -0.7];
    // pernas curtas, tronco longo, ombros largos e braços que chegam ao joelho
    b.dims = { hipY: 0.8, headY: 0.7, shoulderY: 0.56, shoulderX: 0.56, arm: 0.42, hipX: 0.2, thigh: 0.36 };

    // ---- tronco: cintura fina, peito largo com peitorais, trapézio alto
    const torso = torsoMesh({ color: RED, shade: RED_D, light: RED_L, seg: [22, 16] });
    b.fur("torso", torso);
    // manto azul-cinza sobre os dois ombros, com colar de ossos
    const cowl = lathe([[0.5, -0.07], [0.52, 0.0], [0.44, 0.08], [0.3, 0.14], [0.2, 0.16], [0.16, 0.15]], COWL, COWL_D, 14);
    cowl.scale(1.12, 1, 0.74);
    b.add("torso", at(cowl, 0, 0.6, -0.03, 0.1));
    for (let i = -3; i <= 3; i++) {
      const a = i * 0.42;
      b.add("torso", at(stud(0.04, BONE, BONE_D, 0.75, 1.9, 0.75), Math.sin(a) * 0.54, 0.52 - Math.abs(i) * 0.006, Math.cos(a) * 0.4, 0.35, 0, Math.sin(a) * 0.5));
    }
    // ---- caveira no ombro do braço da arma, do tamanho da cabeça
    const skull: G[] = [
      sculpt(20, 14, (n, p) => {
        const nape = ss(0, -0.9, n.z) * ss(-0.1, -0.9, n.y); // a nuca afina por baixo, com a saliência do occipital
        p.set(n.x * 0.27 * (1 - 0.3 * nape), n.y * 0.2565 * (1 - 0.15 * nape), n.z * 0.297 - 0.03 * bell(n.y + 0.15, 0.25) * ss(-0.3, -1, n.z));
      }, (n, c) => {
        c.set(BONE_D).lerp(cBone, ss(-0.9, 0.5, n.y));
        const sagittal = n.y > 0.15 && n.z < 0.45 && Math.abs(n.x + 0.05 * Math.sin(n.z * 24)) < 0.05;
        const lambdoid = n.z < -0.2 && n.y > -0.5 && Math.abs(n.y - 0.25 + Math.abs(n.x) * 0.9 + 0.04 * Math.sin(n.x * 26)) < 0.05;
        if (sagittal || lambdoid) c.set(0x6e5e42);
        if (n.z < -0.3 && n.y < -0.72) c.set(DARK); // forame na base da nuca
      }),
      at(sph(0.17, BONE, 1.05, 0.7, 0.9, BONE_D), 0, -0.2, 0.14),
      at(stud(0.085, DARK, DARK, 1, 1.2, 0.5), -0.105, -0.02, 0.26), at(stud(0.085, DARK, DARK, 1, 1.2, 0.5), 0.105, -0.02, 0.26),
      at(cone(0.035, 0.09, DARK, 3), 0, -0.13, 0.28),
    ];
    for (let i = -2; i <= 2; i++) skull.push(at(bx(0.04, 0.07, 0.04, CREAM, CREAM_D), i * 0.05, -0.3, 0.24));
    b.add("torso", ...grp(skull, 0.62, 0.8, 0.0, -0.3, 0.3, -0.3, 0.82));

    // ---- cabeça de tigre: malha única com focinho, arcada e bochechas; listras e manchas pintadas
    const hy = -0.1, hz = 0.24, hs = 1.22;
    const H = (g: G, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => at(g, x * hs, y * hs + hy, z * hs + hz, rx, ry, rz, hs);
    const { muzzle, socket, cheek } = headMask;
    const head = headBase({ seg: [36, 26], tint: (n, c) => {
      const m = muzzle(n), ax = Math.abs(n.x);
      c.copy(cRedD).lerp(cRed, Math.min(1, 0.55 + n.y * 0.5));
      let stripe = false;
      if (n.z > 0) {
        const r = Math.hypot(n.x, n.y - 0.1), a = Math.atan2(n.y - 0.1, n.x);
        stripe = r > 0.52 && m < 0.3 && Math.sin(a * 10 + Math.sin(r * 9) * 0.8) > 0.45;
        if (n.y > 0.4 && n.z > 0.15 && ax < 0.4 && Math.sin(n.x * 30) > 0.3) stripe = true; // testa
      } else stripe = Math.sin(n.y * 15 + Math.sin(n.x * 5) * 0.9) > 0.4;
      if ((m > 0.4 && n.y < 0.02) || cheek(n) > 0.3) { c.copy(cCreamD).lerp(cCream, 0.5 + n.y * 0.6 + n.z * 0.3); stripe = stripe && cheek(n) > 0.3 && Math.sin(n.y * 22) > 0.75; }
      if (bell(n.y - 0.44, 0.07) * bell(ax - 0.4, 0.1) * ss(0.5, 0.8, n.z) > 0.45) { c.copy(cCream); stripe = false; } // mancha sobre o olho
      if (stripe || socket(n) > 0.45) c.copy(cDark);
      if (n.z > 0.93 && n.y > -0.14 && n.y < 0.1 && ax < 0.22) c.copy(cDark); // nariz
    } });
    b.add("head", H(head, 0, 0, 0));
    b.add("head", H(stud(0.1, MOUTH, dk(MOUTH), 0.9, 0.7, 1.25), 0, -0.07, 0.17));
    b.add("head", H(sph(0.1, CREAM, 0.95, 0.4, 1.55, CREAM_D), 0, -0.15, 0.15, 0.42)); // mandíbula caída
    b.add("head", H(stud(0.05, 0xd8566a, dk(0xd8566a), 1, 0.4, 1.7), 0, -0.13, 0.2, 0.4));
    for (let i = -1; i <= 1; i++) b.add("head", H(cone(0.014, 0.04, FANG, 5, CREAM), i * 0.03, -0.075, 0.345, Math.PI));
    for (const s of [-1, 1]) {
      b.add("head", H(cone(0.024, 0.11, FANG, 6, CREAM), s * 0.068, -0.105, 0.31, Math.PI), H(cone(0.019, 0.075, FANG, 6, CREAM), s * 0.052, -0.14, 0.27, 0.35));
      b.lit("head", H(sph(0.026, EYE, 1.5, 0.8, 0.6, EYE), s * 0.084, 0.05, 0.19, 0, 0, s * 0.3));
      b.add("head", H(stud(0.04, RED, RED_D, 1.1, 0.8, 0.4), s * 0.155, 0.16, -0.05, -0.5, 0, -s * 0.7), H(stud(0.028, DARK, DARK, 1.1, 0.8, 0.3), s * 0.155, 0.158, -0.036, -0.5, 0, -s * 0.7));
      for (let k = 0; k < 4; k++) {
        const tuft = cone(0.032, 0.075 + (k % 2) * 0.02, CREAM, 5, CREAM_D);
        tuft.scale(1, 1, 0.5);
        b.add("head", H(tuft, s * (0.225 - k * 0.012), 0.03 - k * 0.04, 0.02, 0, s * 0.45, -s * (Math.PI / 2 + (k - 0.8) * 0.36)));
      }
    }

    // ---- braços: deltoide, bíceps, antebraço grosso com braçadeira, mão com garras
    const fur = { color: RED, shade: RED_D };
    for (const [arm, fore, s] of [["armL", "foreL", -1], ["armR", "foreR", 1]] as const) {
      b.fur(arm, at(sph(0.23, RED, 1.05, 0.95, 1.05, RED_D), s * 0.02, 0.02, 0), muscleArm(fur).upper);
      b.fur(fore, muscleArm(fur).lower);
      b.add(fore, at(cyl(0.135, 0.158, 0.13, COWL, 12, COWL_D), 0, -0.29, 0));
      for (let i = 0; i < 6; i++) b.add(fore, at(stud(0.022, CREAM_D), Math.cos(i * 1.047) * 0.15, -0.29, Math.sin(i * 1.047) * 0.15));
      b.add(fore, at(sph(0.11, RED, 1.1, 0.95, 0.95, RED_D), 0, -0.48, 0.01));
      for (let i = 0; i < 4; i++) {
        const fx = (i - 1.5) * 0.058;
        b.add(fore, at(stud(0.034, RED, RED_D, 1, 1.9, 1), fx, -0.57, 0.06, -0.7));
        // a mão do facão fecha no cabo: garras mais curtas e viradas para dentro
        b.add(fore, s < 0 ? at(cone(0.022, 0.1, CLAW, 5, CREAM_D), fx, -0.64, 0.12, Math.PI - 0.75) : at(cone(0.02, 0.06, CLAW, 5, CREAM_D), fx, -0.625, 0.115, Math.PI - 1.3));
      }
      b.add(fore, at(stud(0.036, RED, RED_D, 1, 1.7, 1), -s * 0.105, -0.5, 0.05, -0.5, 0, -s * 0.7), at(cone(0.02, 0.07, CLAW, 5, CREAM_D), -s * 0.15, -0.55, 0.085, Math.PI - 0.6, 0, -s * 0.7));
    }

    // ---- quadril: cinto com tachas e fivela, tanga
    b.fur("hips", at(sph(0.3, RED, 1.08, 0.72, 0.86, RED_D), 0, 0, 0));
    b.add("hips", at(cyl(0.335, 0.335, 0.1, HIDE, 16), 0, 0.1, 0, 0, 0, 0, 1, 1, 0.8), at(cyl(0.075, 0.075, 0.04, GOLD, 10), 0, 0.1, 0.275, Math.PI / 2));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.31;
      b.add("hips", at(stud(0.03, CREAM_D), Math.sin(a) * 0.34, 0.1, Math.cos(a) * 0.272));
    }
    for (const s of [-1, 1]) {
      const flap = lathe([[0.02, -0.52], [0.16, -0.3], [0.2, 0], [0.2, 0.04]], HIDE, dk(HIDE, 0.5), 4);
      flap.rotateY(Math.PI / 4);
      flap.scale(1, 1, 0.16);
      b.add("hips", at(flap, 0, 0.03, s * 0.25, -s * 0.12));
    }
    const star = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.026 : 0.062, a = (i / 10) * Math.PI * 2;
      if (i) star.lineTo(Math.sin(a) * r, Math.cos(a) * r);
      else star.moveTo(Math.sin(a) * r, Math.cos(a) * r);
    }
    star.closePath();
    const starG = prep(new THREE.ExtrudeGeometry(star, { depth: 0.012, bevelEnabled: false }), false);
    b.add("hips", at(paint(starG, CREAM_D, CREAM, -0.06, 0.06), 0, -0.13, 0.283, 0.1));
    // ---- pernas curtas: coxa grossa, canela com faixa, pata com dedos e garras
    for (const [th, sh] of [["thighL", "shinL"], ["thighR", "shinR"]] as const) {
      b.fur(th, muscleLeg(fur).thigh);
      b.fur(sh, muscleLeg(fur).shin);
      b.add(sh, at(cyl(0.088, 0.1, 0.1, COWL, 10, COWL_D), 0, -0.26, 0));
      b.add(sh, at(sph(0.095, RED, 1.05, 0.6, 1.8, RED_D), 0, -0.37, 0.08));
      for (let i = -1; i <= 1; i++) {
        b.add(sh, at(stud(0.04, RED, RED_D, 1, 0.8, 1.5), i * 0.062, -0.385, 0.21, 0, i * 0.25, 0));
        b.add(sh, at(cone(0.022, 0.085, CLAW, 5, CREAM_D), i * 0.075, -0.395, 0.29, Math.PI / 2 + 0.3, 0, -i * 0.25));
      }
    }

    // ---- cauda anelada em S
    const curve = new THREE.CatmullRomCurve3([[0, 0, 0], [0, -0.2, -0.28], [0, -0.46, -0.46], [0, -0.54, -0.76], [0, -0.36, -1.0], [0, -0.1, -1.05]].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const tube = new THREE.TubeGeometry(curve, 24, 0.055, 6, false);
    const uv = tube.attributes.uv;
    const tc = new Float32Array(uv.count * 3);
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i);
      const c = u > 0.9 || Math.floor(u * 24) % 4 === 3 ? cDark : cRed;
      tc.set([c.r, c.g, c.b], i * 3);
    }
    tube.setAttribute("color", new THREE.BufferAttribute(tc, 3));
    b.add("tail", prep(tube, true), at(stud(0.058, DARK), 0, -0.1, -1.05));

    // ---- facão: dorso reto, barriga curva, ponta virada e fio serrilhado
    const L = 1.25;
    const sh = new THREE.Shape();
    sh.moveTo(-0.07, 0);
    sh.lineTo(-0.09, -L * 0.7);
    sh.quadraticCurveTo(-0.1, -L * 0.9, -0.2, -L);
    sh.quadraticCurveTo(0.12, -L * 0.97, 0.24, -L * 0.78);
    const teeth = 9;
    for (let i = 0; i < teeth; i++) {
      const v1 = -L * 0.78 + ((i + 1) / teeth) * L * 0.72;
      const w = 0.24 - (i / teeth) * 0.1;
      sh.lineTo(w - 0.045, v1 - 0.03);
      sh.lineTo(w - 0.01, v1);
    }
    sh.lineTo(0.12, 0);
    sh.closePath();
    const blade = prep(new THREE.ExtrudeGeometry(sh, { depth: 0.045, bevelEnabled: false, curveSegments: 8 }), false);
    blade.translate(0, 0, -0.022);
    blade.rotateY(-Math.PI / 2);
    paint(blade, 0xb9c3d6, 0xf6f8fc, -L, 0);
    const knife = [blade, at(cyl(0.04, 0.04, 0.3, HIDE, 8), 0, 0.14, 0.02), at(bx(0.09, 0.05, 0.3, IRON), 0, 0, 0.03), at(sph(0.05, IRON), 0, 0.31, 0.02)];
    b.add("foreR", ...grp(knife, 0, -0.62, 0.02, -0.35));
  },
  // Redesenho a partir do sprite (docs/ref/gravekeeper.png): coveiro encapuzado sem rosto, pá apoiada no chão e lanterna erguida.
  // Medidas do sprite (altura 115 px): capuz 28 px, ombros com a pelerine 55 px, cinto a 53% da altura, barra a 11% do chão.
  gravekeeper: (b) => {
    const ROBE = 0x4c514e, ROBE_D = 0x262a29, MANTLE = 0x62675f, MANTLE_D = 0x3a3e3a, TRIM = 0x83846f, VOID = 0x070909;
    const EYE = 0x7dffc0, PALE = 0xd9c9a6, PALE_D = 0x9c8c6c, HIDE = 0x7a4a26, RUST = 0x9a5426, RUST_D = 0x5e3216, BLADE = 0x9aa1a8, AMBER = 0xffb347, SHOE = 0x17181a;
    const HAND = 0.41;
    b.bulk = 1.15; b.scale = 2.1; b.style = "swing"; b.rough = 0.86; b.glowByVertex = true;
    b.lean = 0.12; b.crouch = 0.1; b.armOut = 0.5;
    b.poseR = [-0.5, -1.0]; b.poseL = [-0.35, -1.9];
    b.dims = { hipY: 1.0, headY: 0.5, shoulderY: 0.5, shoulderX: 0.36, arm: 0.36, hipX: 0.17, thigh: 0.46 };

    // ---- capuz: malha única com a abertura afundada e preta; só os olhos aparecem
    const cMantle = new THREE.Color(MANTLE), cMantleD = new THREE.Color(MANTLE_D), cTrim = new THREE.Color(TRIM), cVoid = new THREE.Color(VOID);
    const face = (n: THREE.Vector3) => (n.z > 0 ? Math.hypot(n.x / 0.7, (n.y + 0.12) / 0.8) : 9);
    b.add("head", at(sculpt(36, 26, (n, p) => {
      const q = face(n);
      const open = 1 - ss(0.78, 1, q);
      const drape = ss(-0.25, -1, n.y); // a base abre sobre os ombros
      p.set(
        n.x * 0.225 * (1 + 0.3 * drape) * (1 - 0.3 * ss(0.3, 1, n.y)),
        n.y * 0.27 + 0.1 * ss(0.4, 1, n.y), // ponta do capuz
        n.z * 0.245 * (1 + 0.15 * drape) - 0.2 * open + 0.04 * bell(q - 1.02, 0.14) - 0.07 * ss(0.5, 1, n.y),
      );
    }, (n, c) => {
      const q = face(n);
      c.copy(cMantleD).lerp(cMantle, 0.35 + 0.65 * ss(-0.6, 0.7, n.y));
      c.lerp(cTrim, 0.7 * bell(q - 1.05, 0.12));
      if (q < 0.9) c.copy(cVoid);
    }), 0, 0.2, 0.02));
    for (const s of [-1, 1]) b.lit("head", at(sph(0.03, EYE, 1.3, 0.85, 0.6, EYE), s * 0.068, 0.21, 0.15, 0, 0, s * 0.2));

    // ---- tronco e pelerine larga sobre os ombros, com barra mais clara
    const chest = lathe([[0.2, -0.06], [0.22, 0.1], [0.26, 0.3], [0.3, 0.44], [0.2, 0.54], [0.1, 0.6], [0, 0.61]], ROBE, ROBE_D, 14);
    chest.scale(1.1, 1, 0.8);
    b.add("torso", chest, at(bx(0.035, 0.16, 0.03, PALE, PALE_D), 0, 0.27, 0.215));
    const mantle = lathe([[0.5, -0.17], [0.52, -0.08], [0.45, 0.04], [0.3, 0.12], [0.2, 0.16], [0.16, 0.2]], MANTLE, MANTLE_D, 20);
    const trim = lathe([[0.512, -0.185], [0.54, -0.1], [0.522, -0.07]], TRIM, dk(TRIM), 20);
    for (const g of [mantle, trim]) g.scale(0.98, 1, 0.74);
    b.add("torso", ...grp([mantle, trim], 0, 0.52, -0.02, 0.08));

    // ---- cinto de couro com fivela, bolsa e cordões; saia rasgada com forro escuro aparecendo nos rasgos
    b.add("hips", at(cyl(0.24, 0.235, 0.09, HIDE, 16), 0, 0.08, 0, 0, 0, 0, 1, 1, 0.84), at(bx(0.09, 0.1, 0.04, GOLD), 0, 0.08, 0.2));
    b.add("hips", at(sph(0.07, HIDE, 1, 1.1, 0.7), -0.16, -0.02, 0.15));
    b.add("skirt", robeMesh({ color: ROBE, shade: ROBE_D, rTop: 0.21, rHem: 0.47, yTop: 0.12, yHem: -0.76, tatter: 0.15, folds: 0.07 }));
    const lining = lathe([[0.4, -0.6], [0.3, -0.3], [0.19, 0.1]], VOID, VOID, 16);
    lining.scale(1, 1, 0.85);
    b.add("skirt", lining);
    for (const s of [-1, 1]) b.add("skirt", at(bx(0.028, 0.3, 0.02, PALE, PALE_D), s * 0.045, -0.13, 0.245, -0.2));

    // ---- pernas escuras: só as canelas e os sapatos saem por baixo da barra
    for (const [th, sh] of [["thighL", "shinL"], ["thighR", "shinR"]] as const) {
      b.add(th, limb(0.11, 0.085, 0.44, ROBE_D));
      b.add(sh, limb(0.08, 0.065, 0.38, ROBE_D), at(sph(0.1, SHOE, 1.05, 0.65, 1.9), 0, -0.43, 0.08));
    }

    // Pá e lanterna ficam na vertical do mundo na pose de descanso.
    const R = restArm(b, 1, HAND), Lq = restArm(b, -1, HAND);

    // ---- braços: manga larga com a sobra de pano caída, boca da manga escura e mão pálida
    for (const [arm, fore, inv] of [["armL", "foreL", Lq.inv], ["armR", "foreR", R.inv]] as const) {
      b.add(arm, sph(0.13, ROBE, 1, 1, 1, ROBE_D), lathe([[0, -0.42], [0.1, -0.4], [0.12, -0.25], [0.125, -0.05], [0.09, 0.06], [0, 0.1]], ROBE, ROBE_D, 12));
      b.add(fore, lathe([[0.13, -0.34], [0.135, -0.3], [0.11, -0.12], [0.095, 0], [0, 0.07]], ROBE, ROBE_D, 14));
      b.add(fore, at(sph(0.125, VOID, 1, 0.1, 1, VOID), 0, -0.325, 0), at(sph(0.07, PALE, 0.95, 1.1, 1.05, PALE_D), 0, -HAND, 0));
      const drape = lathe([[0.015, -0.36], [0.09, -0.22], [0.125, -0.04], [0.09, 0.05], [0, 0.07]], ROBE, ROBE_D, 10);
      drape.scale(1, 1, 0.5);
      b.add(fore, drape.applyQuaternion(inv).translate(0, -0.26, 0));
    }

    // ---- pá: punho em D, cabo cor de ferrugem, lâmina com ponta apoiada no chão
    const L = R.y + 0.04;
    const tip = cone(0.212, 0.16, BLADE, 4, 0x7a5a48);
    tip.rotateY(Math.PI / 4).scale(1, 1, 0.12);
    const shovel = [
      at(cyl(0.03, 0.03, 0.17, RUST, 7, RUST_D), 0, 0, 0, 0, 0, Math.PI / 2),
      at(cyl(0.018, 0.018, 0.16, RUST, 5, RUST_D), -0.045, -0.07, 0, 0, 0, -0.52), at(cyl(0.018, 0.018, 0.16, RUST, 5, RUST_D), 0.045, -0.07, 0, 0, 0, 0.52),
      at(cyl(0.028, 0.028, L - 0.58, RUST, 7, RUST_D), 0, -0.14 - (L - 0.58) / 2, 0),
      at(cyl(0.042, 0.042, 0.09, 0x3a3d42, 8), 0, -(L - 0.46), 0),
      at(bx(0.3, 0.3, 0.036, BLADE, 0x7a5a48), 0, -(L - 0.3), 0), at(tip, 0, -(L - 0.07), 0, Math.PI),
    ];
    b.add("foreR", ...hang(shovel, R.inv, HAND));

    // ---- lanterna pendurada na mão esquerda, com luz âmbar que chega ao chão
    const lantern = [
      at(torus(0.07, 0.012, 0x3a3d42), 0, -0.07, 0, Math.PI / 2),
      at(cone(0.1, 0.09, RUST, 8, RUST_D), 0, -0.175, 0), at(cyl(0.1, 0.1, 0.05, RUST, 8, RUST_D), 0, -0.445, 0),
    ];
    for (let i = 0; i < 4; i++) lantern.push(at(bx(0.022, 0.22, 0.022, RUST, RUST_D), Math.cos(i * 1.571 + 0.785) * 0.085, -0.32, Math.sin(i * 1.571 + 0.785) * 0.085));
    b.add("foreL", ...hang(lantern, Lq.inv, HAND));
    b.lit("foreL", ...hang([at(cyl(0.072, 0.072, 0.2, AMBER, 8, AMBER), 0, -0.32, 0)], Lq.inv, HAND));
    const lp = new THREE.Vector3(0, -0.32, 0).applyQuaternion(Lq.inv);
    b.lights.push({ bone: "foreL", x: lp.x, y: lp.y - HAND, z: lp.z, color: 0xffa64a, intensity: 9, distance: 12 });
  },
  // Redesenho a partir do sprite (docs/ref/ember_matriarch.png): torso esguio de mulher sobre corpo de aranha, casca preta rachada de lava.
  // Medidas do sprite (altura 120 px): abdômen 60 px de diâmetro atrás do corpo, cefalotórax 25 px, cintura a 35% e ombros a 67% da altura,
  // patas longas com o joelho acima do corpo. As rachaduras vêm do shader (`surface = "lava"`); as patas usam cinemática inversa.
  ember_matriarch: (b) => {
    const SHELL = 0x1c1513, SHELL_D = 0x0b0807, SHELL_L = 0x4a4442, HAIR = 0x0d0a0a, EMBER = 0xff7a1f, EYE = 0xffd24a;
    b.form = "spider"; b.surface = "lava"; b.lava = 0xff5a12; b.bulk = 1; b.scale = 2.0; b.rough = 0.5;
    b.style = "cast"; b.glowColor = EMBER; b.lean = -0.04; b.armOut = 0.12;
    b.poseR = [-2.5, -0.9]; b.poseL = [-1.4, -0.12];
    b.dims = { hipY: 0.53, headY: 0.98, shoulderY: 0.84, shoulderX: 0.2, arm: 0.32, hipX: 0, thigh: 0.42 };
    const cShell = new THREE.Color(SHELL), cShellD = new THREE.Color(SHELL_D), cShellL = new THREE.Color(SHELL_L);
    const shell = (n: THREE.Vector3, c: THREE.Color) => { c.copy(cShellD).lerp(cShell, ss(-0.6, 0.3, n.y)).lerp(cShellL, 0.55 * ss(0.45, 1, n.y)); };

    // ---- abdômen: ovo grande atrás do corpo, mais largo no meio e afinando para trás
    b.fur("tail", at(sculpt(30, 22, (n, p) => {
      const back = ss(0.2, -1, n.z);
      p.set(n.x * 0.54 * (1 - 0.12 * back), n.y * 0.5 * (1 - 0.1 * back) + 0.03 * bell(n.z, 0.6), n.z * 0.64);
    }, shell), 0, 0.2, -0.62));
    // ---- cefalotórax com olhos e quelíceras; pedúnculo até o abdômen
    b.fur("hips", at(sculpt(22, 16, (n, p) => p.set(n.x * 0.25 * (1 - 0.25 * ss(0.2, 1, n.z)), n.y * 0.19, n.z * 0.33), shell), 0, 0, 0.14));
    b.add("hips", at(sph(0.14, SHELL, 1, 0.9, 1.2, SHELL_D), 0, 0.02, -0.2));
    for (const s of [-1, 1]) {
      b.lit("hips", at(sph(0.035, EYE, 1, 1, 0.7, EYE), s * 0.065, 0.06, 0.42), at(sph(0.022, EYE, 1, 1, 0.7, EYE), s * 0.14, 0.085, 0.36));
      b.add("hips", at(cone(0.035, 0.14, SHELL, 5, SHELL_D), s * 0.055, -0.1, 0.4, Math.PI - 0.25));
    }

    // ---- patas: 4 de cada lado, fêmur para cima e tíbia longa até o chão, ponta fina
    const L1 = 0.8, A = 0.6, B2 = 0.56, BEND = 0.38;
    const tipY = -Math.sin(BEND) * B2, tipZ = A + Math.cos(BEND) * B2;
    const L2 = Math.hypot(tipY, tipZ), fix = -Math.atan2(-tipY, tipZ);
    const seg = (r0: number, r1: number, len: number) => at(cyl(r0, r1, len, SHELL, 6, SHELL_D), 0, 0, len / 2, Math.PI / 2);
    const rows: [number, number, number][] = [[0.3, 0.72, 1.02], [0.14, 1.14, 0.42], [-0.02, 1.18, -0.32], [-0.16, 0.92, -1.08]];
    for (const [az, hx, hz] of rows) {
      for (const s of [-1, 1]) {
        const tibia = [seg(0.04, 0.03, A), at(sph(0.04, SHELL, 1, 1, 1, SHELL_D), 0, 0, A), at(at(cyl(0.03, 0.006, B2, SHELL, 6, SHELL_D), 0, 0, B2 / 2, Math.PI / 2), 0, 0, A, BEND)];
        b.ikLegs.push({
          attach: [s * 0.2, -0.02, az], home: [s * hx, hz], l1: L1, l2: L2,
          femur: [at(sph(0.065, SHELL, 1, 1, 1, SHELL_D), 0, 0, 0), seg(0.055, 0.04, L1), at(sph(0.05, SHELL, 1, 1, 1, SHELL_D), 0, 0, L1)],
          tibia: tibia.map((g) => g.rotateX(fix)),
        });
      }
    }

    // ---- torso de mulher saindo do cefalotórax: cintura fina, busto, ombros estreitos
    b.fur("torso", lathe([[0.2, -0.02], [0.15, 0.06], [0.1, 0.16], [0.085, 0.26]], SHELL, SHELL_D, 12));
    b.fur("torso", torsoMesh({ color: 0x2c2321, shade: SHELL_D, light: 0x6e625c, waistW: 0.098, chestW: 0.088, neckW: 0.12, waistD: 0.08, chestD: 0.058, neckD: 0.062, pecs: 0.046, abs: 0.007, ribs: 0, traps: 0.02, y0: 0.2, height: 0.8, seg: [22, 18] }));
    b.add("torso", at(cyl(0.04, 0.036, 0.1, SHELL, 8, SHELL_D), 0, 0.975, 0.005));

    // ---- cabeça pequena: rosto escuro com olhos em brasa, coroa de espinhos e cabelo longo que arrasta (osso `cape`)
    b.add("head", at(headBase({ w: 0.098, h: 0.12, d: 0.11, muzzle: 0.014, muzzleNarrow: 0.3, palate: null, brow: 0.008, socket: 0.014, cheek: 0, seg: [20, 16], tint: (n, c) => {
      c.copy(cShellD).lerp(cShell, ss(-0.5, 0.5, n.y)).lerp(cShellL, 0.5 * ss(0.2, 0.9, n.z) * ss(-0.6, 0.2, n.y));
    } }), 0, 0.05, 0.01));
    for (const s of [-1, 1]) b.lit("head", at(sph(0.014, EYE, 1.4, 0.7, 0.6, EYE), s * 0.042, 0.092, 0.104, 0, 0, s * 0.25));
    b.lit("head", at(sph(0.012, EMBER, 1.6, 0.5, 0.6, EMBER), 0, 0.008, 0.112));
    b.add("head", at(sph(0.115, HAIR, 1, 0.95, 1.05, HAIR), 0, 0.09, -0.025));
    for (let i = 0; i < 7; i++) {
      const a = (i - 3) * 0.5;
      b.add("head", at(cone(0.022, i % 2 ? 0.2 : 0.28, HAIR, 4, SHELL_L), Math.sin(a) * 0.098, 0.26 - Math.abs(i - 3) * 0.012, Math.cos(a) * 0.07 - 0.02, -0.15, 0, -Math.sin(a) * 0.55));
    }
    for (let i = 0; i < 6; i++) {
      const f = i - 2.5;
      const lock = lathe([[0.004, -0.62 - (i % 2) * 0.12], [0.03, -0.4], [0.05, -0.12], [0.035, 0.02], [0, 0.05]], HAIR, HAIR, 6);
      lock.scale(1, 1, 0.6);
      b.add("cape", at(lock, f * 0.04, 0.56, 0.06, 0.85 + Math.abs(f) * 0.05, 0, f * 0.16));
    }

    // ---- braços finos; um erguido e outro apontando, com brasa nas mãos
    for (const [arm, fore] of [["armL", "foreL"], ["armR", "foreR"]] as const) {
      b.fur(arm, sph(0.058, SHELL, 1, 1, 1, SHELL_D), lathe([[0, -0.35], [0.038, -0.32], [0.047, -0.16], [0.05, -0.03], [0, 0.04]], SHELL, SHELL_D, 8));
      b.fur(fore, lathe([[0, -0.3], [0.03, -0.27], [0.042, -0.1], [0.04, 0], [0, 0.04]], SHELL, SHELL_D, 8));
      b.add(fore, at(sph(0.036, SHELL, 0.9, 1.2, 0.6, SHELL_D), 0, -0.31, 0));
      for (let i = 0; i < 3; i++) b.lit(fore, at(cone(0.01, 0.07, EMBER, 4, EMBER), (i - 1) * 0.022, -0.38, 0.005, Math.PI, 0, (i - 1) * 0.25));
    }
  },
  // Redesenho a partir do sprite (docs/ref/hollow_king.png): lich de caveira coroado, gola de pelo, manto roxo aberto na frente
  // com as costelas à mostra, cajado de crescente com orbe e mão esquerda em garra. Flutua (forma `robed`).
  // Medidas do sprite (altura 113 px com a coroa): crânio 20 px, coroa 18 px, gola 52 px de largura, cinto a 43% da altura, cajado 122 px.
  hollow_king: (b) => {
    const ROBE = 0x4a2472, ROBE_D = 0x1d0f33, INNER = 0x2e2e74, GOLD_D = 0x9a6a1a, SKULL = 0xe4d5a2, SKULL_D = 0x8f7c50, FUR = 0x9a8ad0, FUR_D = 0x4e3e88;
    const SOUL = 0x1fa8a0, VOID = 0x120a1c, SHAFT = 0x2c1a3c;
    const HAND = 0.41;
    b.form = "robed"; b.bulk = 1.15; b.scale = 2.2; b.style = "cast"; b.glowColor = 0x4ad9d0; b.rough = 0.8;
    b.lean = 0.16; b.armOut = 0.45;
    b.poseR = [-0.45, -0.9]; b.poseL = [-0.5, -1.7];
    b.dims = { hipY: 0.9, headY: 0.56, shoulderY: 0.46, shoulderX: 0.33, arm: 0.36, hipX: 0, thigh: 0.42 };

    // ---- crânio: malha única com órbitas fundas, cavidade do nariz e dentes pintados; mandíbula solta
    const cSkull = new THREE.Color(SKULL), cSkullD = new THREE.Color(SKULL_D), cVoid = new THREE.Color(VOID);
    const socket = (n: THREE.Vector3) => bell(n.y - 0.05, 0.2) * bell(Math.abs(n.x) - 0.4, 0.19) * ss(0.3, 0.7, n.z);
    const nose = (n: THREE.Vector3) => bell(n.y + 0.34, 0.11) * bell(n.x, 0.11) * ss(0.5, 0.9, n.z);
    b.add("head", at(sculpt(34, 26, (n, p) => {
      const low = ss(-0.05, -0.9, n.y); // o rosto afina do meio para baixo
      p.set(
        n.x * 0.16 * (1 - 0.32 * low) + Math.sign(n.x) * 0.014 * bell(n.y + 0.22, 0.14) * ss(0.2, 0.7, n.z),
        n.y * (n.y < 0 ? 0.15 : 0.18),
        n.z * 0.18 * (1 - 0.18 * low) - 0.05 * socket(n) - 0.03 * nose(n) + 0.012 * bell(n.y - 0.3, 0.12) * ss(0.3, 0.8, n.z),
      );
    }, (n, c) => {
      c.copy(cSkullD).lerp(cSkull, 0.4 + 0.6 * ss(-0.8, 0.6, n.y));
      if (socket(n) > 0.42 || nose(n) > 0.45) c.copy(cVoid);
      if (n.z > 0.25 && n.y < -0.56 && n.y > -0.8) c.copy(Math.sin(n.x * 42) > 0.55 ? cVoid : cSkull); // dentes de cima
    }), 0, 0.12, 0.08));
    b.add("head", at(sph(0.1, VOID, 0.85, 0.3, 1), 0, -0.035, 0.1), at(sph(0.105, SKULL, 0.95, 0.42, 1.1, SKULL_D), 0, -0.075, 0.1, 0.18));
    for (let i = -2; i <= 2; i++) b.add("head", at(bx(0.02, 0.03, 0.02, SKULL, SKULL_D), i * 0.03, -0.045, 0.2 - Math.abs(i) * 0.012));
    for (const s of [-1, 1]) b.lit("head", at(sph(0.015, SOUL, 1, 1, 0.6, SOUL), s * 0.064, 0.133, 0.2));
    // coroa alta: aro e pontas, as da frente maiores, pedra turquesa
    b.add("head", at(cyl(0.158, 0.17, 0.09, GOLD, 12, GOLD_D), 0, 0.27, 0.06));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const h = i === 0 ? 0.3 : i % 2 ? 0.22 : 0.26;
      b.add("head", at(cone(0.05, h, GOLD, 4, GOLD_D), Math.sin(a) * 0.165, 0.31 + h / 2, 0.06 + Math.cos(a) * 0.165, 0, a, 0, 1, 1, 0.45));
    }
    b.add("head", at(sph(0.03, 0x38d8cc, 1, 1, 0.6), 0, 0.275, 0.228));

    // ---- tronco: manto aberto no peito, fundo escuro, esterno e costelas, debrum dourado e broches
    const chest = lathe([[0.2, -0.06], [0.22, 0.1], [0.26, 0.28], [0.29, 0.4], [0.2, 0.5], [0.1, 0.56], [0, 0.57]], ROBE, ROBE_D, 14);
    chest.scale(1.1, 1, 0.8);
    b.add("torso", chest, at(sph(0.2, VOID, 0.72, 1.15, 0.3, VOID), 0, 0.23, 0.165), at(bx(0.04, 0.3, 0.03, SKULL, SKULL_D), 0, 0.26, 0.225));
    b.add("torso", at(cyl(0.035, 0.04, 0.2, SKULL, 6, SKULL_D), 0, 0.52, 0.05));
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) b.add("torso", at(bx(0.13 - i * 0.012, 0.03, 0.03, SKULL, SKULL_D), s * 0.075, 0.37 - i * 0.068, 0.215, 0, -s * 0.4, -s * 0.22));
      b.add("torso", at(bx(0.035, 0.46, 0.03, GOLD, GOLD_D), s * 0.165, 0.2, 0.205, 0, -s * 0.3, s * 0.1));
      b.add("torso", at(sph(0.05, GOLD, 1, 1, 0.6, GOLD_D), s * 0.15, 0.43, 0.2));
      b.lit("torso", at(sph(0.026, SOUL, 1, 1, 0.6, SOUL), s * 0.15, 0.43, 0.235));
    }
    // gola de pelo: anel grosso e irregular, mais alto atrás
    const gap = 0.62; // aberta na frente, deixando o peito à mostra
    const fur = prep(displace(new THREE.TorusGeometry(0.31, 0.1, 8, 26, Math.PI * 2 - gap * 2).rotateZ(Math.PI / 2 + gap).rotateX(Math.PI / 2), 7, 0.05, 14), true);
    paint(fur, FUR_D, FUR, -0.09, 0.1);
    const collar = [fur, at(sph(0.1, FUR, 1, 1, 1, FUR_D), -Math.sin(gap) * 0.31, 0, Math.cos(gap) * 0.31), at(sph(0.1, FUR, 1, 1, 1, FUR_D), Math.sin(gap) * 0.31, 0, Math.cos(gap) * 0.31)];
    b.add("torso", ...grp(collar.map((g) => g.scale(1.3, 0.9, 0.95)), 0, 0.44, -0.07, 0.22));

    // ---- cinto com fivela dourada e saia aberta na frente: painel azul-escuro com debrum, barra em farrapos
    b.add("hips", at(cyl(0.245, 0.24, 0.09, ROBE_D, 16), 0, 0.08, 0, 0, 0, 0, 1, 1, 0.84), at(bx(0.11, 0.1, 0.04, GOLD, GOLD_D), 0, 0.08, 0.2), at(bx(0.06, 0.05, 0.045, ROBE_D), 0, 0.08, 0.2));
    b.add("skirt", robeMesh({ color: ROBE, shade: ROBE_D, rTop: 0.22, rHem: 0.5, yTop: 0.12, yHem: -0.9, tatter: 0.2, folds: 0.08, seg: 56, panel: { half: 0.5, color: INNER, trim: GOLD } }));
    const lining = lathe([[0.4, -0.68], [0.3, -0.3], [0.2, 0.1]], VOID, VOID, 16);
    lining.scale(1, 1, 0.85);
    b.add("skirt", lining);

    // ---- braços: manga em sino com punho dourado e pano caído; mãos de osso
    const R = restArm(b, 1, HAND), Lq = restArm(b, -1, HAND);
    for (const [arm, fore, inv, open] of [["armL", "foreL", Lq.inv, true], ["armR", "foreR", R.inv, false]] as const) {
      b.add(arm, sph(0.11, ROBE, 1, 1, 1, ROBE_D), lathe([[0, -0.42], [0.1, -0.4], [0.115, -0.25], [0.11, -0.05], [0.08, 0.06], [0, 0.1]], ROBE, ROBE_D, 12));
      b.add(fore, lathe([[0.14, -0.34], [0.145, -0.3], [0.11, -0.12], [0.095, 0], [0, 0.07]], ROBE, ROBE_D, 14));
      b.add(fore, at(torus(0.142, 0.02, GOLD), 0, -0.325, 0), at(sph(0.13, VOID, 1, 0.1, 1, VOID), 0, -0.325, 0));
      const drape = lathe([[0.015, -0.52], [0.1, -0.3], [0.135, -0.05], [0.09, 0.05], [0, 0.07]], ROBE, ROBE_D, 10);
      drape.scale(1, 1, 0.5);
      b.add(fore, drape.applyQuaternion(inv).translate(0, -0.26, 0));
      // mão: palma chata e dedos finos; aberta em garra ou fechada no cajado
      b.add(fore, at(cyl(0.022, 0.03, 0.1, SKULL, 5, SKULL_D), 0, -0.35, 0), at(sph(0.055, SKULL, 1, 1.05, 0.5, SKULL_D), 0, -HAND, 0));
      for (let i = 0; i < 4; i++) {
        const f = i - 1.5;
        b.add(fore, at(cyl(0.011, 0.014, 0.125, SKULL, 5, SKULL_D), f * (open ? 0.05 : 0.03), -HAND - (open ? 0.1 : 0.07), open ? 0.035 : 0.05, open ? -0.6 : -1.3, 0, open ? f * 0.3 : 0));
      }
      b.add(fore, at(cyl(0.011, 0.014, 0.095, SKULL, 5, SKULL_D), open ? 0.085 : 0.05, -HAND - 0.01, 0.03, -0.5, 0, 1.0));
    }

    // ---- cajado na vertical: haste escura, crescente dourado com espigão e orbe turquesa que ilumina
    const top = 0.47, len = R.y - 0.04;
    const cres = prep(new THREE.TorusGeometry(0.2, 0.028, 6, 16, Math.PI).rotateZ(Math.PI), true);
    paint(cres, GOLD_D, GOLD, -0.2, 0);
    const staffG = [
      at(cyl(0.035, 0.028, len + top, SHAFT, 6), 0, (top - len) / 2, 0),
      at(cyl(0.05, 0.05, 0.07, GOLD, 8, GOLD_D), 0, top, 0), at(cyl(0.045, 0.045, 0.05, GOLD, 8, GOLD_D), 0, 0.02 - len, 0),
      at(cres, 0, top + 0.27, 0), at(cone(0.032, 0.52, GOLD, 5, GOLD_D), 0, top + 0.32, 0),
    ];
    for (const s of [-1, 1]) staffG.push(at(cone(0.032, 0.24, GOLD, 5, GOLD_D), s * 0.235, top + 0.37, 0, 0, 0, -s * 0.32));
    b.add("foreR", ...hang(staffG, R.inv, HAND));
    b.lit("foreR", ...hang([at(sph(0.095, SOUL, 1, 1, 1, SOUL), 0, top + 0.3, 0)], R.inv, HAND));
    const orb = new THREE.Vector3(0, top + 0.3, 0).applyQuaternion(R.inv);
    b.lights.push({ bone: "foreR", x: orb.x, y: orb.y - HAND, z: orb.z, color: 0x4ad9d0, intensity: 8, distance: 12 });
    // chama de alma sobre a mão esquerda
    b.lit("foreL", ...hang([at(sph(0.055, SOUL, 1, 1.2, 1, SOUL), 0, 0.16, 0.04), at(cone(0.04, 0.16, SOUL, 6, SOUL), 0, 0.28, 0.04)], Lq.inv, HAND));
  },
};
