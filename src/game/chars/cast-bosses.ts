// Chefes. Método de modelagem: seção 4 de docs/roadmap.md; conferir em /preview.html com o sprite ao lado.
import * as THREE from "three";
import { paint, prep } from "../flora";
import { type G, type Spec, at, bell, belt, body, bx, cap, cape, cone, cyl, dk, grp, hairLong, headBase, headMask, lathe, limb, muscleArm, muscleLeg, robeMesh, sculpt, sph, ss, staff, torsoMesh, torus, BONE, GOLD, IRON, LEATHER, TORSO_Y } from "./kit";

export const BOSSES: Record<string, Spec> = {
  // ------------------------------------------------ chefes
  // Redesenho a partir do sprite do Dungeon Reign (docs/ref/bloodfang.png); conferir em preview.html.
  // Anatomia do sprite: tronco e cabeça esculpidos como malha única, membros com perfil de músculo, esqueleto próprio.
  bloodfang: (b) => {
    const RED = 0xd8301e, RED_D = 0x7e1412, RED_L = 0xee5a3c, CREAM = 0xf6ecd8, CREAM_D = 0xbfa888, DARK = 0x160b0d, MOUTH = 0x4e0a12;
    const COWL = 0x5a6884, COWL_D = 0x2a3448, HIDE = 0x5e3a22, CLAW = 0xf0e6d0, EYE = 0xffd23a, FANG = 0xfffaf0, BONE_D = 0x9c8862;
    const col = (hex: number) => new THREE.Color(hex);
    const cRed = col(RED), cRedD = col(RED_D), cCream = col(CREAM), cCreamD = col(CREAM_D), cDark = col(DARK);
    b.bulk = 1.6; b.scale = 2.3; b.style = "swing"; b.glowColor = EYE; b.rough = 0.7;
    b.lean = 0.3; b.crouch = 0.34; b.armOut = 0.3;
    b.poseR = [-0.2, -0.95]; b.poseL = [-0.65, -0.7];
    // pernas curtas, tronco longo, ombros largos e braços que chegam ao joelho
    b.dims = { hipY: 0.8, headY: 0.7, shoulderY: 0.56, shoulderX: 0.56, arm: 0.42, hipX: 0.2, thigh: 0.36 };

    // ---- tronco: cintura fina, peito largo com peitorais, trapézio alto
    const torso = torsoMesh({ color: RED, shade: RED_D, light: RED_L });
    b.fur("torso", torso);
    // manto azul-cinza sobre os dois ombros, com colar de ossos
    const cowl = lathe([[0.5, -0.07], [0.52, 0.0], [0.44, 0.08], [0.3, 0.14], [0.2, 0.16], [0.16, 0.15]], COWL, COWL_D, 18);
    cowl.scale(1.12, 1, 0.74);
    b.add("torso", at(cowl, 0, 0.6, -0.03, 0.1));
    for (let i = -3; i <= 3; i++) {
      const a = i * 0.42;
      b.add("torso", at(sph(0.04, BONE, 0.75, 1.9, 0.75, BONE_D), Math.sin(a) * 0.54, 0.52 - Math.abs(i) * 0.006, Math.cos(a) * 0.4, 0.35, 0, Math.sin(a) * 0.5));
    }
    // ---- caveira no ombro do braço da arma, do tamanho da cabeça
    const skull: G[] = [
      sph(0.27, BONE, 1, 0.95, 1.1, BONE_D),
      at(sph(0.17, BONE, 1.05, 0.7, 0.9, BONE_D), 0, -0.2, 0.14),
      at(sph(0.085, DARK, 1, 1.2, 0.5), -0.105, -0.02, 0.26), at(sph(0.085, DARK, 1, 1.2, 0.5), 0.105, -0.02, 0.26),
      at(cone(0.035, 0.09, DARK, 3), 0, -0.13, 0.28),
    ];
    for (let i = -2; i <= 2; i++) skull.push(at(bx(0.04, 0.07, 0.04, CREAM, CREAM_D), i * 0.05, -0.3, 0.24));
    b.add("torso", ...grp(skull, 0.62, 0.8, 0.0, -0.3, 0.3, -0.3, 0.82));

    // ---- cabeça de tigre: malha única com focinho, arcada e bochechas; listras e manchas pintadas
    const hy = -0.1, hz = 0.24, hs = 1.22;
    const H = (g: G, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => at(g, x * hs, y * hs + hy, z * hs + hz, rx, ry, rz, hs);
    const { muzzle, socket, cheek } = headMask;
    const head = headBase({ tint: (n, c) => {
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
    b.add("head", H(sph(0.1, MOUTH, 0.9, 0.7, 1.25), 0, -0.07, 0.17));
    b.add("head", H(sph(0.1, CREAM, 0.95, 0.4, 1.55, CREAM_D), 0, -0.15, 0.15, 0.42)); // mandíbula caída
    b.add("head", H(sph(0.05, 0xd8566a, 1, 0.4, 1.7), 0, -0.13, 0.2, 0.4));
    for (let i = -1; i <= 1; i++) b.add("head", H(cone(0.014, 0.04, FANG, 5, CREAM), i * 0.03, -0.075, 0.345, Math.PI));
    for (const s of [-1, 1]) {
      b.add("head", H(cone(0.024, 0.11, FANG, 6, CREAM), s * 0.068, -0.105, 0.31, Math.PI), H(cone(0.019, 0.075, FANG, 6, CREAM), s * 0.052, -0.14, 0.27, 0.35));
      b.lit("head", H(sph(0.026, EYE, 1.5, 0.8, 0.6, EYE), s * 0.084, 0.05, 0.19, 0, 0, s * 0.3));
      b.add("head", H(sph(0.05, RED, 1, 1.15, 0.4, RED_D), s * 0.15, 0.175, -0.05, -0.3, 0, -s * 0.5), H(sph(0.04, DARK, 1, 1.15, 0.3), s * 0.15, 0.175, -0.07, -0.3, 0, -s * 0.5));
      for (const [dy, len, up] of [[0.0, 0.15, 0.15], [-0.07, 0.17, -0.25]] as const) {
        b.add("head", H(cone(0.045, len, CREAM, 6, CREAM_D), s * 0.26, dy, 0.0, 0, s * 0.55, -s * (Math.PI / 2 - up)));
      }
    }

    // ---- braços: deltoide, bíceps, antebraço grosso com braçadeira, mão com garras
    const fur = { color: RED, shade: RED_D };
    for (const [arm, fore, s] of [["armL", "foreL", -1], ["armR", "foreR", 1]] as const) {
      b.fur(arm, at(sph(0.23, RED, 1.05, 0.95, 1.05, RED_D), s * 0.02, 0.02, 0), muscleArm(fur).upper);
      b.fur(fore, muscleArm(fur).lower);
      b.add(fore, at(cyl(0.135, 0.158, 0.13, COWL, 12, COWL_D), 0, -0.29, 0));
      for (let i = 0; i < 6; i++) b.add(fore, at(sph(0.022, CREAM_D), Math.cos(i * 1.047) * 0.15, -0.29, Math.sin(i * 1.047) * 0.15));
      b.add(fore, at(sph(0.11, RED, 1.1, 0.95, 0.95, RED_D), 0, -0.48, 0.01));
      for (let i = 0; i < 4; i++) {
        const fx = (i - 1.5) * 0.058;
        b.add(fore, at(cap(0.032, 0.07, RED, RED_D), fx, -0.57, 0.06, -0.7));
        if (s < 0) b.add(fore, at(cone(0.022, 0.1, CLAW, 6, CREAM_D), fx, -0.64, 0.12, Math.PI - 0.75));
      }
    }

    // ---- quadril: cinto com tachas e fivela, tanga
    b.fur("hips", at(sph(0.3, RED, 1.08, 0.72, 0.86, RED_D), 0, 0, 0));
    b.add("hips", at(cyl(0.335, 0.335, 0.1, HIDE, 16), 0, 0.1, 0, 0, 0, 0, 1, 1, 0.8), at(cyl(0.075, 0.075, 0.04, GOLD, 10), 0, 0.1, 0.275, Math.PI / 2));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.31;
      b.add("hips", at(sph(0.03, CREAM_D), Math.sin(a) * 0.34, 0.1, Math.cos(a) * 0.272));
    }
    for (const s of [-1, 1]) {
      const flap = lathe([[0.02, -0.52], [0.16, -0.3], [0.2, 0], [0.2, 0.04]], HIDE, dk(HIDE, 0.5), 4);
      flap.rotateY(Math.PI / 4);
      flap.scale(1, 1, 0.16);
      b.add("hips", at(flap, 0, 0.03, s * 0.25, -s * 0.12));
    }
    // ---- pernas curtas: coxa grossa, canela com faixa, pata com garras
    for (const [th, sh] of [["thighL", "shinL"], ["thighR", "shinR"]] as const) {
      b.fur(th, muscleLeg(fur).thigh);
      b.fur(sh, muscleLeg(fur).shin);
      b.add(sh, at(cyl(0.088, 0.1, 0.1, COWL, 10, COWL_D), 0, -0.26, 0));
      b.add(sh, at(sph(0.095, RED, 1.05, 0.6, 1.8, RED_D), 0, -0.37, 0.08));
      for (let i = -1; i <= 1; i++) b.add(sh, at(cone(0.026, 0.1, CLAW, 6, CREAM_D), i * 0.055, -0.385, 0.25, Math.PI / 2 + 0.3, 0, 0));
    }

    // ---- cauda anelada em S
    const curve = new THREE.CatmullRomCurve3([[0, 0, 0], [0, -0.2, -0.28], [0, -0.46, -0.46], [0, -0.54, -0.76], [0, -0.36, -1.0], [0, -0.1, -1.05]].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const tube = new THREE.TubeGeometry(curve, 30, 0.055, 8, false);
    const uv = tube.attributes.uv;
    const tc = new Float32Array(uv.count * 3);
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i);
      const c = u > 0.9 || Math.floor(u * 30) % 4 === 3 ? cDark : cRed;
      tc.set([c.r, c.g, c.b], i * 3);
    }
    tube.setAttribute("color", new THREE.BufferAttribute(tc, 3));
    b.add("tail", prep(tube, true), at(sph(0.058, DARK), 0, -0.1, -1.05));

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

    // Pá e lanterna ficam na vertical do mundo na pose de descanso: desfaz a rotação de tronco, ombro e cotovelo.
    const rest = (side: number, pose: [number, number]) => {
      const armQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(b.lean, 0, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(pose[0], 0, side * b.armOut)));
      const q = armQ.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(pose[1], 0, 0)));
      const hand = new THREE.Vector3(0, -HAND, 0).applyQuaternion(q).add(new THREE.Vector3(0, -b.dims.arm, 0).applyQuaternion(armQ));
      const y = b.dims.hipY - b.crouch * 0.1 + TORSO_Y + b.dims.shoulderY * Math.cos(b.lean) + hand.y;
      return { inv: q.invert(), y };
    };
    const hang = (list: G[], inv: THREE.Quaternion) => list.map((g) => g.applyQuaternion(inv).translate(0, -HAND, 0));

    const R = rest(1, b.poseR), Lq = rest(-1, b.poseL);

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
    b.add("foreR", ...hang(shovel, R.inv));

    // ---- lanterna pendurada na mão esquerda, com luz âmbar que chega ao chão
    const lantern = [
      at(torus(0.07, 0.012, 0x3a3d42), 0, -0.07, 0, Math.PI / 2),
      at(cone(0.1, 0.09, RUST, 8, RUST_D), 0, -0.175, 0), at(cyl(0.1, 0.1, 0.05, RUST, 8, RUST_D), 0, -0.445, 0),
    ];
    for (let i = 0; i < 4; i++) lantern.push(at(bx(0.022, 0.22, 0.022, RUST, RUST_D), Math.cos(i * 1.571 + 0.785) * 0.085, -0.32, Math.sin(i * 1.571 + 0.785) * 0.085));
    b.add("foreL", ...hang(lantern, Lq.inv));
    b.lit("foreL", ...hang([at(cyl(0.072, 0.072, 0.2, AMBER, 8, AMBER), 0, -0.32, 0)], Lq.inv));
    const lp = new THREE.Vector3(0, -0.32, 0).applyQuaternion(Lq.inv);
    b.lights.push({ bone: "foreL", x: lp.x, y: lp.y - HAND, z: lp.z, color: 0xffa64a, intensity: 9, distance: 12 });
  },
  ember_matriarch: (b) => {
    body(b, { skin: 0x2e1c18, top: 0x2a1a16, sleeve: 0x2a1a16, hands: 0xff6a1a, eyes: 0xffc84a, eyeGlow: true, robe: { color: 0x1c1210, flare: 0.5 } });
    b.form = "spider"; b.scale = 2.0; b.style = "cast"; b.poseR = [-1.2, -0.5]; b.poseL = [-0.3, -0.8]; b.glowColor = 0xff6a1a; b.extraLegs = 8;
    b.add("head", ...hairLong(0x15100e, 0.6));
    for (let i = 0; i < 5; i++) b.add("head", at(cone(0.04, 0.3, 0x15100e, 4), (i - 2) * 0.09, 0.5, -0.05, -0.3, 0, -(i - 2) * 0.25));
    for (const y of [0.16, 0.34]) b.lit("torso", at(torus(0.255, 0.014, 0xff6a1a), 0, y, 0));
    b.lit("torso", at(bx(0.03, 0.4, 0.02, 0xff8a2a), 0, 0.28, 0.21));
    // abdômen de lava
    const ab = sph(0.75, 0x1c1210, 1, 0.85, 1.25, 0x0e0908);
    b.add("hips", at(ab, 0, -0.1, -0.95));
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4;
      b.lit("hips", at(bx(0.035, 0.035, rngLen(i), 0xff6a1a), Math.cos(a) * 0.5, -0.1 + Math.sin(i * 1.7) * 0.5, -0.95 + Math.sin(a) * 0.6, i * 0.9, i * 1.3, 0));
    }
    b.lit("hips", at(sph(0.16, 0xff8a2a, 1, 0.4, 1.6), 0, 0.5, -0.95));
  },
  hollow_king: (b) => {
    body(b, { skin: BONE, top: 0x3a2a6a, sleeve: 0x4a3a80, hands: BONE, robe: { color: 0x33255f, hem: GOLD, flare: 1.1 }, eyes: 0x4ad9d0, eyeGlow: true, bulk: 1.15 });
    b.scale = 2.2; b.style = "cast"; b.poseR = [-0.7, -0.9]; b.poseL = [-0.8, -1.1]; b.glowColor = 0x4ad9d0;
    b.add("head", at(sph(0.13, BONE, 1.1, 0.7, 1), 0, 0.06, 0.08), at(bx(0.16, 0.04, 0.03, 0x2a2420), 0, 0.07, 0.19));
    b.add("head", at(cyl(0.2, 0.22, 0.12, GOLD, 10), 0, 0.42, 0));
    for (let i = 0; i < 7; i++) b.add("head", at(cone(0.04, 0.18, GOLD, 4), Math.cos((i / 7) * 6.283) * 0.2, 0.56, Math.sin((i / 7) * 6.283) * 0.2));
    b.lit("head", at(sph(0.04, 0x4ad9d0), 0, 0.43, 0.21));
    b.add("torso", at(torus(0.32, 0.1, 0xc8b8ee), 0, 0.5, 0), at(bx(0.1, 0.55, 0.03, GOLD), 0, 0.2, 0.2), at(bx(0.22, 0.04, 0.03, BONE), 0, 0.36, 0.215), at(bx(0.22, 0.04, 0.03, BONE), 0, 0.28, 0.215));
    b.add("cape", ...cape(0x241a45, 0.4, 1.3));
    b.add("foreR", ...staff(GOLD, 2.3));
    const cres = prep(new THREE.TorusGeometry(0.22, 0.035, 5, 12, Math.PI * 1.3), true);
    paint(cres, dk(GOLD), GOLD, -0.3, 0.3);
    b.add("foreR", at(cres, 0, -0.31, 1.55, Math.PI / 2, 0, Math.PI * 0.85 + Math.PI));
    b.lit("foreR", at(sph(0.11, 0x7af2ea), 0, -0.31, 1.58));
  },
};

function rngLen(i: number): number {
  return 0.4 + ((i * 37) % 10) * 0.07;
}
