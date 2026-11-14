// Heróis. Os que têm o comentário "Redesenho" foram refeitos pelo método da seção 4 do roadmap; os outros são a versão antiga, a refazer em M2.
import * as THREE from "three";
import { type G, type Spec, at, beard, bell, belt, body, bx, cape, capeMesh, cone, cowboyHat, cyl, dagger, dk, dome, edge, fist, grp, hairCap, hairLong, hang, headBase, headMask, hood, lathe, limb, muscleArm, plateMesh, restArm, revolver, robeMesh, sculpt, sculptTube, sph, ss, staff, stud, sword, torus, tubeMesh, wizardHat, BLACK, BONE, GOLD, LEATHER, SKIN, WOOD } from "./kit";

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
    const FACE = 0xe6b48c, FACE_D = 0xb88460, PANTS = 0x20253a, CYAN = 0x7feaff, BLADE = 0xdfe8f2, IRIS = 0x27407e;
    const col = (hex: number) => new THREE.Color(hex);
    const cFace = col(FACE), cFaceD = col(FACE_D), cBlush = col(0xe89a80), cHair = col(HAIR), cHairD = col(HAIR_D), cCyan = col(CYAN), cCore = col(0xf2fdff);
    const HAND = 0.31;
    b.bulk = 0.92; b.style = "swing"; b.rough = 0.7; b.glowColor = CYAN;
    b.lean = 0.03; b.crouch = 0.08; b.armOut = 0.13;
    b.poseR = [0.15, -0.7]; b.poseL = [-0.45, -1.75];
    b.dims = { hipY: 0.95, headY: 0.58, shoulderY: 0.46, shoulderX: 0.27, arm: 0.33, hipX: 0.12, thigh: 0.44 };

    // ---- rosto: malha única com queixo afinado, nariz e órbitas rasas. Olhos, sobrancelhas e boca vão na camada sem contorno
    // (`flat`): com o contorno preto, peça pequena no rosto vira risco. Sobrancelha com a ponta de dentro mais baixa = decidido.
    b.add("head", at(sculpt(32, 24, (n, p) => {
      const front = ss(0.3, 0.9, n.z);
      const jaw = ss(0.05, -0.95, n.y);
      p.set(
        n.x * 0.15 * (1 - 0.34 * jaw),
        n.y * 0.19 - 0.012 * jaw * front,
        n.z * 0.16 * (1 - 0.1 * jaw) + 0.02 * bell(n.x, 0.11) * bell(n.y + 0.12, 0.13) * front - 0.012 * headMask.socket(n) + 0.012 * bell(n.x, 0.3) * ss(-0.55, -0.9, n.y) * front,
      );
    }, (n, c) => {
      c.copy(cFaceD).lerp(cFace, ss(-1, -0.1, n.y) * (0.8 + 0.2 * Math.max(0, n.z)));
      c.lerp(cBlush, 0.35 * bell(Math.abs(n.x) - 0.5, 0.2) * bell(n.y + 0.2, 0.2) * ss(0.4, 0.8, n.z));
    }), 0, 0.2, 0));
    for (const s of [-1, 1]) {
      b.flat("head", at(stud(0.027, 0xf6f3ec, 0xd9d3c6, 1.25, 1, 0.3, 0), s * 0.056, 0.228, 0.138, 0, s * 0.3, 0));
      b.flat("head", at(stud(0.018, IRIS, IRIS, 1, 1.25, 0.3, 0), s * 0.056, 0.228, 0.146, 0, s * 0.3, 0));
      b.flat("head", at(stud(0.006, 0xffffff, 0xffffff, 1, 1, 0.5, 0), s * 0.056 + 0.007, 0.238, 0.153));
      b.flat("head", at(bx(0.062, 0.014, 0.014, HAIR_D, HAIR_D), s * 0.058, 0.268, 0.147, 0, s * 0.3, s * 0.24));
    }
    b.flat("head", at(bx(0.04, 0.007, 0.01, 0x8a4a3c, 0x8a4a3c), 0.004, 0.118, 0.152, 0, 0, 0.12));
    // ---- cabelo revolto: massa esculpida com a franja recortada sobre a testa e o volume jogado para trás, com gomos nas costas (mecha em cone fica parecendo chifre ou prego)
    b.add("head", sculpt(32, 24, (n, p) => {
      const hairline = 0.36 + 0.13 * Math.sin(n.x * 9 + 0.8) - 0.1 * ss(0.5, 0.9, Math.abs(n.x));
      const face = ss(0.05, 0.35, n.z) * ss(hairline + 0.1, hairline - 0.06, n.y);
      const nape = ss(-0.45, -0.8, n.y) * (n.z > -0.2 ? 1 : 0.3);
      const top = ss(0.1, 0.9, n.y);
      const tuft = Math.max(0, Math.sin(n.x * 5.5 + 0.9) * Math.sin(n.y * 6.5 + 0.4)) * ss(0.2, -0.5, n.z);
      const k = (1.28 + 0.1 * Math.sin(n.x * 6 + n.y * 4) * Math.sin(n.z * 5 + 1) + 0.1 * top + 0.2 * tuft) * (1 - 0.36 * face) * (1 - 0.4 * nape);
      p.set(n.x * 0.155 * k, n.y * 0.185 * k + 0.225, n.z * 0.165 * k - 0.012 - 0.035 * top);
    }, (n, c) => {
      c.copy(cHairD).lerp(cHair, ss(-0.7, 0.5, n.y));
      if (Math.sin(n.x * 14 + n.z * 9) > 0.6) c.multiplyScalar(0.88);
    }));

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
    // ---- faísca na mão esquerda: núcleo pequeno e três arcos finos em zigue-zague (peça grande acesa vira um borrão com o bloom)
    const core = new THREE.Vector3(0, -HAND - 0.03, 0.1);
    b.lit("foreL", at(stud(0.022, 0xf2fdff, 0xf2fdff), core.x, core.y, core.z));
    for (let i = 0; i < 5; i++) {
      const a = i * 1.26 + 0.4;
      const dir = new THREE.Vector3(Math.cos(a) * 0.8, Math.sin(a) * 0.8, 0.3 - (i % 3) * 0.3).normalize();
      const side = new THREE.Vector3(-dir.y, dir.x, 0).normalize();
      b.lit("foreL", tubeMesh(4, 7, (t, o) => {
        const zig = (Math.abs(((t * 3.5 + i * 0.37) % 1) - 0.5) - 0.25) * 0.2 * Math.sin(Math.min(1, t) * Math.PI);
        o.copy(core).addScaledVector(dir, t * (0.1 + (i % 3) * 0.035)).addScaledVector(side, zig);
      }, (t) => 0.009 * (1 - 0.7 * t), (_a, t, c) => c.copy(cCore).lerp(cCyan, ss(0.1, 0.6, t)), new THREE.Vector3(0.2, 0.3, 1)));
    }
  },
  // Redesenho a partir do sprite (docs/ref/aurelius.png): mago velho e curvado, chapéu pontudo com a ponta caída para trás e fita dourada,
  // nariz grande, sobrancelhas e barba brancas até a cintura, manto roxo até o chão com debrum dourado, faixa dourada, bolsa de couro
  // e orbe arcano flutuando sobre a mão erguida. Medidas do sprite (altura 74 px): chapéu 22 px, barba 22 px, ombros 24 px, manto 40% mais largo na barra.
  aurelius: (b) => {
    const PURPLE = 0x6a3fb0, PURPLE_D = 0x2e1a5a, PURPLE_L = 0x9068d8, GOLD_D = 0x9a6a1e, FACE = 0xdcae94, FACE_D = 0x9a6a5c;
    const BEARD = 0xf4f4f8, BEARD_D = 0x9a9aac, HIDE = 0x6a3428, HIDE_D = 0x3a1a18, ORB = 0xc49aff;
    const col = (hex: number) => new THREE.Color(hex);
    const cFace = col(FACE), cFaceD = col(FACE_D), cBeard = col(BEARD), cBeardD = col(BEARD_D), cP = col(PURPLE), cPD = col(PURPLE_D), cPL = col(PURPLE_L), cGold = col(GOLD);
    const HAND = 0.31;
    b.form = "robed"; b.bulk = 1; b.style = "cast"; b.rough = 0.8; b.glowColor = 0xc890ff;
    b.lean = 0.16; b.armOut = 0.16;
    b.poseR = [-1.0, -1.0]; b.poseL = [0.1, -0.6];
    b.dims = { hipY: 0.92, headY: 0.56, shoulderY: 0.45, shoulderX: 0.27, arm: 0.33, hipX: 0, thigh: 0.42 };

    // ---- rosto velho: nariz grande, olhos pequenos sob sobrancelhas brancas e fartas (camada sem contorno)
    b.add("head", at(sculpt(26, 20, (n, p) => {
      const front = ss(0.3, 0.9, n.z);
      const jaw = ss(0.05, -0.95, n.y);
      p.set(
        n.x * 0.152 * (1 - 0.22 * jaw),
        n.y * 0.185,
        n.z * 0.16 + 0.055 * bell(n.x, 0.13) * bell(n.y + 0.1, 0.17) * front - 0.012 * headMask.socket(n),
      );
    }, (n, c) => {
      c.copy(cFaceD).lerp(cFace, ss(-0.9, 0.0, n.y) * ss(0.7, 0.2, n.y) * (0.75 + 0.25 * Math.max(0, n.z)));
    }), 0, 0.2, 0));
    for (const s of [-1, 1]) {
      b.flat("head", at(stud(0.017, 0xf0ece4, 0xd0c8bc, 1.2, 0.6, 0.3), s * 0.058, 0.224, 0.143, 0, s * 0.3, 0));
      b.flat("head", at(stud(0.01, 0x3a2a5a, 0x3a2a5a, 1, 1, 0.3), s * 0.058, 0.224, 0.149, 0, s * 0.3, 0));
      b.flat("head", at(stud(0.03, BEARD, 0xc8c8d4, 1.5, 0.55, 0.5, 0), s * 0.064, 0.25, 0.15, 0, s * 0.3, s * 0.2));
      b.flat("head", at(cone(0.036, 0.15, BEARD, 5, BEARD), s * 0.055, 0.118, 0.17, 0.25, 0, Math.PI + s * 0.95, 1, 1, 0.7));
    }
    // barba até a cintura, larga no queixo e em ponta, com mechas; cabelo branco caindo dos lados e atrás
    b.add("head", at(sculpt(20, 16, (n, p) => {
      const tip = ss(0.5, -1, n.y);
      p.set(n.x * 0.165 * (1 - 0.7 * tip), n.y * 0.34 - 0.06 * Math.abs(Math.sin(n.x * 7)) * tip, n.z * 0.06 * (1 - 0.3 * tip) + 0.05 * tip * (1 - tip) * 2);
    }, (n, c) => {
      c.copy(cBeardD).lerp(cBeard, 0.3 + 0.7 * ss(-0.6, 0.6, n.z) * ss(-1, -0.3, n.y));
      if (Math.sin(n.x * 16) > 0.5) c.multiplyScalar(0.82);
    }), 0, -0.2, 0.125, 0.1));
    b.add("head", at(sph(0.172, 0xd8d8e2, 1.05, 1.3, 0.95, BEARD_D), 0, 0.13, -0.04));

    // ---- chapéu: aba mole, cone que sobe e cai para trás (tubo com raio que afina), fita dourada com fivela
    b.add("head", sculpt(26, 8, (n, p) => {
      const a = Math.atan2(n.x, n.z);
      p.set(n.x * 0.35, 0.33 + n.y * 0.016 - 0.05 * n.x * n.x + 0.022 * Math.sin(a * 3 + 0.6) * Math.hypot(n.x, n.z), n.z * 0.35 + 0.01);
    }, (n, c) => {
      c.copy(n.y < -0.2 ? cPD : cP).lerp(cPL, n.y > 0 ? 0.45 * ss(0.5, 1, Math.hypot(n.x, n.z)) : 0);
    }));
    b.add("head", tubeMesh(14, 11, (t, o) => {
      o.set(0.07 * t * t, 0.33 + 0.56 * t - 0.26 * t * t * t, -0.01 - 0.04 * t - 0.34 * t * t * t);
    }, (t) => 0.19 * Math.pow(Math.max(0, 1 - t), 0.85) + 0.012, (a, t, c) => {
      c.copy(cPD).lerp(cP, 0.4 + 0.6 * ss(0, 0.6, t)).lerp(cPL, 0.45 * Math.max(0, Math.sin(a)) * ss(0.1, 0.5, t));
      if (Math.sin(t * 26) > 0.86) c.multiplyScalar(0.8); // rugas do feltro
      if (t > 0.03 && t < 0.13) c.copy(cGold);
    }));
    b.add("head", at(bx(0.075, 0.07, 0.03, GOLD, GOLD_D), 0, 0.395, 0.185, -0.12), at(stud(0.02, PURPLE_L, PURPLE, 1, 1, 0.6, 0), 0, 0.395, 0.204));

    // ---- tronco do manto com faixa dourada na frente e gola
    const chest = lathe([[0.2, -0.08], [0.205, 0.0], [0.19, 0.12], [0.21, 0.3], [0.225, 0.42], [0.2, 0.5], [0.12, 0.56], [0.07, 0.6], [0, 0.61]], PURPLE, PURPLE_D, 14);
    chest.scale(1.08, 1, 0.82);
    const collar = edge(lathe([[0.1, 0.5], [0.14, 0.58], [0.13, 0.63]], PURPLE, PURPLE_D, 12), GOLD, 0.63);
    b.add("torso", chest, collar, at(cyl(0.05, 0.055, 0.1, FACE_D, 8), 0, 0.6, 0));
    b.add("torso", at(bx(0.085, 0.5, 0.02, GOLD, GOLD_D), 0, 0.16, 0.168, -0.07), at(bx(0.045, 0.5, 0.022, PURPLE_L, PURPLE), 0, 0.16, 0.172, -0.07));

    // ---- mangas largas em sino com punho dourado, mãos
    for (const [arm, fore, s] of [["armL", "foreL", -1], ["armR", "foreR", 1]] as const) {
      b.add(arm, stud(0.088, PURPLE, PURPLE_D), limb(0.085, 0.078, 0.31, PURPLE));
      b.add(fore, edge(lathe([[0.135, -0.27], [0.13, -0.24], [0.1, -0.1], [0.08, 0.0], [0, 0.06]], PURPLE, PURPLE_D, 12), GOLD, -0.27));
      b.add(fore, at(cyl(0.05, 0.055, 0.1, FACE, 8, FACE_D), 0, -0.24, 0));
      b.add(fore, ...grp(fist(FACE, 0.055, s), 0, -HAND, 0.01));
    }

    // ---- faixa dourada na cintura, bolsa de couro com alça do lado esquerdo
    const sash = lathe([[0.215, 0.02], [0.228, 0.06], [0.228, 0.13], [0.215, 0.17]], GOLD, GOLD_D, 14);
    sash.scale(1.06, 1, 0.84);
    b.add("hips", sash, at(bx(0.07, 0.09, 0.03, 0xf6dc7a, GOLD), 0.03, 0.095, 0.19));
    b.add("hips", ...grp([
      at(bx(0.16, 0.2, 0.08, HIDE, HIDE_D), 0, 0, 0), at(bx(0.17, 0.08, 0.085, 0x8a4a34, HIDE), 0, 0.07, 0.003), at(stud(0.018, GOLD, GOLD_D, 1, 1, 1, 0), 0, 0.03, 0.045),
    ], -0.2, -0.14, 0.1, 0, -0.5, 0.08));
    b.add("torso", at(bx(0.035, 0.62, 0.018, HIDE, HIDE_D), 0.0, 0.2, 0.175, -0.07, 0, -0.62));

    // ---- saia do manto até o chão: pregas, painel mais claro na frente com debrum, barra dourada; sapatos aparecendo
    b.add("skirt", edge(robeMesh({ color: PURPLE, shade: PURPLE_D, rTop: 0.21, rHem: 0.45, yTop: 0.12, yHem: -0.9, folds: 0.07, panel: { half: 0.24, color: PURPLE_L, trim: GOLD }, seg: 44, rings: 9 }), GOLD, -0.9));
    b.add("skirt", at(torus(0.44, 0.022, GOLD), 0, -0.88, 0, 0, 0, 0, 1, 1, 0.85));
    for (const s of [-1, 1]) b.add("skirt", at(sph(0.08, HIDE, 1, 0.6, 1.7, HIDE_D), s * 0.11, -0.9, 0.3));

    // ---- orbe arcano flutuando sobre a mão direita: núcleo pequeno aceso dentro de dois aros finos
    const orb: [number, number, number] = [0, -HAND - 0.2, 0.07];
    b.lit("foreR", at(stud(0.062, ORB, ORB, 1, 1, 1, 2), ...orb));
    b.lit("foreR", at(torus(0.12, 0.008, ORB), ...orb, 0.5, 0, 0.3), at(torus(0.135, 0.006, ORB), ...orb, -0.7, 0, 1.1));
  },
  // Redesenho a partir do sprite (docs/ref/ignis.png): lutador de base baixa, cabelo vermelho espetado com pontas em chama, gi preto sem
  // mangas aberto no peito, braços nus e fortes, faixa vermelha com pontas compridas, calça larga cinza e punho direito em chamas.
  // Medidas do sprite (altura 80 px com o cabelo): cabeça 14 px, ombros 28 px, quadril a 45% da altura, pontas da faixa com 25 px.
  ignis: (b) => {
    const FACE = 0xf0b888, FACE_D = 0xb06e48, FACE_L = 0xffd8a8, GI = 0x3d3c4a, GI_D = 0x1b1a23, GI_L = 0x6e6d82, RED = 0xd41c1c, RED_D = 0x6e0c10;
    const HAIR = 0xe01a18, HAIR_D = 0x6a0a10, PANTS = 0x62626e, PANTS_D = 0x2e2e3a, BOOT = 0x5a2420, BOOT_D = 0x2c100e, BROW = 0x3a1410;
    const FLAME = 0xff8a20, FLAME_Y = 0xffd860, FLAME_R = 0xe83010;
    const col = (hex: number) => new THREE.Color(hex);
    const cFace = col(FACE), cFaceD = col(FACE_D), cFaceL = col(FACE_L), cGi = col(GI), cGiD = col(GI_D), cGiL = col(GI_L);
    const cHair = col(HAIR), cHairD = col(HAIR_D), cFlame = col(FLAME), cFlameY = col(FLAME_Y), cFlameR = col(FLAME_R);
    const HAND = 0.3;
    b.bulk = 1.05; b.style = "thrust"; b.rough = 0.74; b.glowByVertex = true; b.glowColor = FLAME;
    b.lean = 0.14; b.crouch = 0.42; b.armOut = 0.2;
    b.poseR = [-0.95, -1.15]; b.poseL = [-0.05, -1.7];
    b.dims = { hipY: 0.93, headY: 0.58, shoulderY: 0.46, shoulderX: 0.3, arm: 0.33, hipX: 0.17, thigh: 0.44 };

    // ---- rosto jovem e bravo: malha única de queixo afinado; olhos, sobrancelhas grossas e boca na camada sem contorno
    b.add("head", at(sculpt(26, 20, (n, p) => {
      const front = ss(0.3, 0.9, n.z);
      const jaw = ss(0.05, -0.95, n.y);
      p.set(
        n.x * 0.152 * (1 - 0.3 * jaw),
        n.y * 0.19 - 0.012 * jaw * front,
        n.z * 0.162 * (1 - 0.1 * jaw) + 0.022 * bell(n.x, 0.11) * bell(n.y + 0.12, 0.13) * front - 0.012 * headMask.socket(n) + 0.012 * bell(n.x, 0.3) * ss(-0.55, -0.9, n.y) * front,
      );
    }, (n, c) => {
      c.copy(cFaceD).lerp(cFace, ss(-1, -0.1, n.y) * (0.8 + 0.2 * Math.max(0, n.z)));
    }), 0, 0.2, 0));
    for (const s of [-1, 1]) {
      b.flat("head", at(stud(0.025, 0xf6f3ec, 0xd9d3c6, 1.25, 0.8, 0.3), s * 0.056, 0.226, 0.14, 0, s * 0.3, 0));
      b.flat("head", at(stud(0.015, 0x5a2a12, 0x5a2a12, 1, 1.1, 0.3), s * 0.056, 0.226, 0.147, 0, s * 0.3, 0));
      b.flat("head", at(bx(0.07, 0.02, 0.016, BROW, BROW), s * 0.058, 0.258, 0.148, 0, s * 0.3, s * 0.3));
    }
    b.flat("head", at(bx(0.045, 0.008, 0.01, 0x7a3a2c, 0x7a3a2c), 0, 0.116, 0.154));
    // ---- cabelo: massa esculpida com pontas largas subindo como labaredas (vermelho escuro na raiz, laranja nas pontas) e mecha caída do lado
    const spike = (n: THREE.Vector3) => Math.pow(Math.max(0, Math.sin(n.x * 6.5 + 0.9) * Math.sin(n.z * 6 + 0.4)), 0.7) * ss(-0.1, 0.6, n.y);
    b.add("head", sculpt(32, 22, (n, p) => {
      const hairline = 0.34 + 0.12 * Math.sin(n.x * 8 + 0.5) - 0.12 * ss(0.5, 0.9, Math.abs(n.x));
      const face = ss(0.05, 0.35, n.z) * ss(hairline + 0.1, hairline - 0.06, n.y);
      const nape = ss(-0.4, -0.8, n.y) * (n.z > -0.2 ? 1 : 0.3);
      const sp = spike(n);
      const k = (1.24 + 0.34 * sp) * (1 - 0.34 * face) * (1 - 0.4 * nape);
      p.set(n.x * 0.158 * k, n.y * 0.185 * k + 0.225 + 0.1 * sp, n.z * 0.168 * k - 0.014 - 0.03 * sp);
    }, (n, c) => {
      const sp = spike(n);
      c.copy(cHairD).lerp(cHair, ss(-0.5, 0.4, n.y)).lerp(cFlame, ss(0.45, 0.95, sp));
    }));
    // labaredas pequenas acesas saindo das pontas
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + 0.3, r = 0.07 + (i % 2) * 0.04;
      const base = new THREE.Vector3(Math.cos(a) * r, 0.5 + (i % 3) * 0.02, Math.sin(a) * r - 0.03);
      b.lit("head", tubeMesh(5, 6, (t, o) => {
        o.copy(base);
        o.x += Math.cos(a) * 0.05 * t + 0.03 * Math.sin(t * 4 + i);
        o.y += 0.17 * t;
        o.z += Math.sin(a) * 0.05 * t - 0.04 * t * t;
      }, (t) => 0.028 * Math.pow(Math.max(0, 1 - t), 0.8) + 0.002, (_a, t, c) => c.copy(cFlameY).lerp(cFlame, ss(0, 0.3, t)).lerp(cFlameR, ss(0.45, 1, t)), new THREE.Vector3(1, 0, 0.3)));
    }

    // ---- tronco nu e, por cima, o gi sem mangas: a mesma forma um pouco maior, afundada no V do peito e no pescoço para a pele aparecer
    const trunk = (grow: (t: number, s: number, front: number) => number, tint: (t: number, s: number, front: number, c: THREE.Color) => void): G => sculpt(24, 18, (n, p) => {
      const t = (n.y + 1) / 2, rho = Math.hypot(n.x, n.z) || 1e-6, s = n.x / rho, cz = n.z / rho, r = Math.pow(rho, 0.45), front = Math.max(0, cz);
      const W = 0.165 + 0.085 * ss(0.15, 0.72, t) - 0.15 * ss(0.84, 1, t);
      const D = 0.118 + 0.04 * ss(0.2, 0.7, t) - 0.06 * ss(0.85, 1, t);
      const z = cz * D * r + 0.032 * bell(t - 0.7, 0.11) * front * (1 - 0.75 * bell(s, 0.13)) * r - 0.008 * bell(s, 0.07) * front * (1 - ss(0.25, 0.6, t));
      const k = grow(t, s, front);
      p.set(s * W * r * k, -0.08 + t * 0.72, z * k);
    }, (n, c) => {
      const t = (n.y + 1) / 2, rho = Math.hypot(n.x, n.z) || 1e-6;
      tint(t, n.x / rho, Math.max(0, n.z / rho), c);
    });
    const vee = (t: number, s: number, front: number) => (front > 0 ? Math.abs(s) - (0.03 + 0.5 * ss(0.3, 0.92, t)) : 1); // < 0 dentro do V
    b.add("torso", trunk(() => 1, (t, _s, front, c) => c.copy(cFaceD).lerp(cFace, 0.3 + 0.7 * t).lerp(cFaceL, front * 0.4 * bell(t - 0.68, 0.2))));
    b.add("torso", trunk((t, s, front) => (t > 0.88 ? 0.88 : 0.88 + 0.19 * ss(-0.05, 0.04, vee(t, s, front))), (t, s, front, c) => {
      c.copy(cGiD).lerp(cGi, 0.3 + 0.7 * t);
      const v = vee(t, s, front);
      if (v < 0.13) c.copy(cGiL); // gola
    }));
    b.add("torso", at(cyl(0.055, 0.062, 0.12, FACE, 8, FACE_D), 0, 0.61, 0));

    // ---- braços nus com perfil de músculo; ombro do gi desfiado, atadura cinza e fita vermelha no pulso
    const arm = muscleArm({ color: FACE, shade: FACE_D, girth: 0.52, len: 0.72 });
    for (const [up, fore, s] of [["armL", "foreL", -1], ["armR", "foreR", 1]] as const) {
      b.add(up, arm.upper.clone(), at(edge(lathe([[0.105, -0.04], [0.1, 0.01], [0.075, 0.07], [0, 0.095]], GI, GI_D, 10), GI_L, -0.06), s * 0.01, 0.02, 0, 0, 0, -s * 0.3));
      b.add(fore, arm.lower.clone());
      b.add(fore, edge(lathe([[0.062, -0.27], [0.068, -0.22], [0.08, -0.12], [0.078, -0.1]], 0x8a8a98, 0x565664, 10), RED, -0.27, -0.22));
      b.add(fore, ...grp(fist(FACE, 0.06, s), 0, -HAND, 0.01));
    }

    // ---- quadril: calça larga, faixa vermelha grossa com nó, duas pontas caídas na frente e uma solta atrás (fita com física)
    b.add("hips", at(sph(0.2, PANTS, 1.08, 0.78, 0.86, PANTS_D), 0, -0.02, 0));
    const sash = lathe([[0.2, 0.02], [0.215, 0.06], [0.215, 0.12], [0.2, 0.16]], RED, RED_D, 14);
    sash.scale(1.05, 1, 0.82);
    b.add("hips", sash, at(stud(0.05, RED, RED_D, 1.2, 0.9, 0.8, 0), -0.06, 0.09, 0.175));
    b.add("skirt", at(capeMesh({ color: RED, shade: RED_D, half: [0.22, 0.2], rTop: 0.2, rHem: 0.23, len: 0.5, folds: 0.05, tatter: 0.03, nu: 3, nt: 4 }), -0.07, 0.06, 0.19, 0, Math.PI + 0.25, 0));
    b.add("skirt", at(capeMesh({ color: 0xb01416, shade: RED_D, half: [0.2, 0.17], rTop: 0.2, rHem: 0.22, len: 0.38, folds: 0.05, tatter: 0.03, nu: 3, nt: 3 }), 0.02, 0.06, 0.19, 0, Math.PI - 0.15, 0));
    b.ribbons.push({ bone: "hips", at: [-0.14, 0.09, -0.16], len: 0.7, seg: 8, width: [0.05, 0.035], color: RED, tip: RED_D });

    // ---- pernas: calça larga presa na canela por faixas, sapato escuro
    for (const [th, sh] of [["thighL", "shinL"], ["thighR", "shinR"]] as const) {
      b.add(th, limb(0.13, 0.11, 0.42, PANTS, 0.08));
      b.add(sh, limb(0.115, 0.085, 0.24, PANTS, 0.2));
      b.add(sh, edge(lathe([[0.066, -0.37], [0.07, -0.33], [0.08, -0.22], [0.076, -0.2]], BOOT, BOOT_D, 10), RED_D, -0.2));
      b.add(sh, at(sph(0.082, BOOT, 1, 0.68, 1.9, BOOT_D), 0, -0.42, 0.07));
    }

    // ---- punho direito em chamas: línguas finas acesas, amarelas na base e vermelhas na ponta, puxadas para trás e para cima
    const fistAt = new THREE.Vector3(0, -HAND, 0.01);
    b.lit("foreR", at(stud(0.03, FLAME_Y, FLAME_Y), 0, -HAND - 0.03, 0.05));
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9;
      const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      b.lit("foreR", tubeMesh(5, 7, (t, o) => {
        o.copy(fistAt).addScaledVector(out, 0.065 + 0.03 * Math.sin(t * 5 + i * 2) * t);
        o.y += -0.06 + (0.2 + (i % 3) * 0.05) * t;
        o.z += -0.05 * t * t;
      }, (t) => 0.026 * Math.pow(Math.max(0, 1 - t), 0.8) + 0.002, (_a, t, c) => c.copy(cFlameY).lerp(cFlame, ss(0, 0.3, t)).lerp(cFlameR, ss(0.45, 1, t)), new THREE.Vector3(0.3, 0.2, 1)));
    }
  },
  // Redesenho a partir do sprite (docs/ref/zephyr.png): pistoleiro velho de chapéu de aba larga e barba branca, poncho verde-azulado com faixa
  // ciano em zigue-zague caindo em bico na frente e comprido atrás, colete de couro, revólver de cano longo apontado e o segundo no coldre.
  // Medidas do sprite (altura 75 px): chapéu 12 px de altura e 20 px de aba, poncho de ombro a ombro 28 px, quadril a 50% da altura, revólver de 15 px.
  zephyr: (b) => {
    const TEAL = 0x4f9d8c, TEAL_D = 0x2b6a6c, DEEP = 0x1f4456, DEEP_D = 0x12283a, CYAN = 0x49cde6, CREAM = 0xf2efdc;
    const HAT = 0x6a586c, HAT_D = 0x3a2a3c, HAT_L = 0x9a8a98, HIDE = 0x7a3f24, HIDE_D = 0x45201a, PANTS = 0x4d5470, PANTS_D = 0x2a2d44;
    const FACE = 0xd9a680, FACE_D = 0x9a6648, BEARD = 0xf0efe6, BEARD_D = 0xa9adb8, GUN = 0x9aa3b4, GUN_D = 0x3a3f58;
    const col = (hex: number) => new THREE.Color(hex);
    const cFace = col(FACE), cFaceD = col(FACE_D), cBeard = col(BEARD), cBeardD = col(BEARD_D), cHat = col(HAT), cHatD = col(HAT_D), cHatL = col(HAT_L);
    const cTeal = col(TEAL), cTealD = col(TEAL_D), cDeep = col(DEEP), cCyan = col(CYAN), cCream = col(CREAM);
    const HAND = 0.31;
    b.bulk = 1; b.style = "shoot"; b.rough = 0.78; b.glowColor = 0xffe9a8;
    b.lean = 0.02; b.crouch = 0.1; b.armOut = 0.12;
    b.poseR = [-1.4, -0.12]; b.poseL = [0.12, -0.7];
    b.dims = { hipY: 0.95, headY: 0.58, shoulderY: 0.46, shoulderX: 0.29, arm: 0.33, hipX: 0.14, thigh: 0.44 };

    // ---- rosto curtido na sombra do chapéu: malha única com nariz forte; olhos e sobrancelhas brancas na camada sem contorno
    b.add("head", at(sculpt(28, 20, (n, p) => {
      const front = ss(0.3, 0.9, n.z);
      const jaw = ss(0.05, -0.95, n.y);
      p.set(
        n.x * 0.155 * (1 - 0.2 * jaw),
        n.y * 0.19,
        n.z * 0.165 + 0.035 * bell(n.x, 0.12) * bell(n.y + 0.08, 0.16) * front - 0.012 * headMask.socket(n),
      );
    }, (n, c) => {
      c.copy(cFaceD).lerp(cFace, ss(-0.9, 0.0, n.y) * ss(0.6, 0.15, n.y) * (0.75 + 0.25 * Math.max(0, n.z)));
      c.lerp(cFaceD, 0.5 * bell(Math.abs(n.x) - 0.55, 0.2) * bell(n.y + 0.15, 0.25) * ss(0.3, 0.7, n.z)); // maçãs do rosto fundas
    }), 0, 0.2, 0));
    for (const s of [-1, 1]) {
      // olhos apertados sob sobrancelhas grossas e grisalhas
      b.flat("head", at(stud(0.02, 0xf0ece4, 0xd0c8bc, 1.3, 0.45, 0.3), s * 0.058, 0.228, 0.146, 0, s * 0.3, 0));
      b.flat("head", at(stud(0.011, 0x22303e, 0x22303e, 1.1, 0.8, 0.3), s * 0.058, 0.228, 0.152, 0, s * 0.3, 0));
      b.flat("head", at(bx(0.075, 0.022, 0.02, 0xc9ccd4, BEARD_D), s * 0.06, 0.247, 0.152, 0, s * 0.3, s * 0.22));
      // bigode caído em duas pontas
      b.flat("head", at(cone(0.034, 0.13, BEARD, 5, BEARD), s * 0.05, 0.122, 0.172, 0.25, 0, Math.PI + s * 1.05, 1, 1, 0.7));
    }
    // barba branca comprida em mechas, até o peito; costeletas e cabelo grisalho na nuca
    b.add("head", at(sculpt(18, 14, (n, p) => {
      const tip = ss(0.4, -1, n.y);
      p.set(n.x * 0.15 * (1 - 0.82 * tip), n.y * 0.26 - 0.07 * Math.abs(Math.sin(n.x * 7)) * tip, n.z * 0.055 * (1 - 0.3 * tip) + 0.03 * tip);
    }, (n, c) => {
      c.copy(cBeardD).lerp(cBeard, 0.3 + 0.7 * ss(-0.6, 0.6, n.z) * ss(-1, -0.2, n.y + 0.9));
      if (Math.sin(n.x * 16) > 0.5) c.multiplyScalar(0.8);
    }), 0, -0.1, 0.125, 0.14));
    b.add("head", at(sph(0.172, 0xc4c6ce, 1, 0.92, 0.95, 0x8a8c9a), 0, 0.2, -0.03));

    // ---- chapéu: aba larga virada para cima dos lados e caída na frente, copa com vinco, fita ciano
    b.add("head", sculpt(28, 8, (n, p) => {
      p.set(n.x * 0.41, 0.335 + n.y * 0.016 + 0.1 * Math.pow(Math.abs(n.x), 2.4) - 0.035 * ss(0.3, 1, n.z) - 0.02 * ss(-0.3, -1, n.z), n.z * 0.38 + 0.02);
    }, (n, c) => {
      c.copy(n.y < -0.2 ? cHatD : cHat).lerp(cHatL, n.y > 0 ? 0.5 * ss(0.5, 1, Math.hypot(n.x, n.z)) : 0);
    }));
    b.add("head", sculpt(24, 14, (n, p) => {
      const up = Math.max(0, n.y);
      const top = ss(0.55, 1, n.y);
      p.set(n.x * 0.185 * (1 - 0.14 * up), 0.335 + up * 0.27 - 0.06 * top * bell(n.x, 0.35) + 0.025 * top * ss(0, 1, n.z), n.z * 0.2 * (1 - 0.1 * up) + 0.01);
    }, (n, c) => {
      c.copy(cHatD).lerp(cHat, ss(0, 0.5, n.y)).lerp(cHatL, 0.6 * ss(0.5, 1, n.y));
    }));
    const band = lathe([[0.192, 0.345], [0.186, 0.4]], CYAN, 0x2a8ab0, 16);
    band.scale(1, 1, 1.07);
    b.add("head", at(band, 0, 0, 0.01), at(stud(0.022, GOLD, dk(GOLD), 1, 1, 0.6, 0), 0.19, 0.372, 0.03));

    // ---- tronco: camisa creme e colete de couro, quase todo sob o poncho
    const chest = lathe([[0.16, -0.08], [0.185, -0.04], [0.18, 0.1], [0.205, 0.3], [0.225, 0.42], [0.2, 0.5], [0.12, 0.56], [0.07, 0.6], [0, 0.61]], HIDE, HIDE_D, 14);
    chest.scale(1.1, 1, 0.8);
    b.add("torso", chest, at(cyl(0.05, 0.055, 0.12, FACE_D, 8), 0, 0.6, 0));
    b.add("torso", at(bx(0.07, 0.4, 0.02, CREAM, 0xc9c4ae), 0, 0.14, 0.152, -0.06));

    // ---- poncho: malha única do pescoço à barra, em bico na frente e atrás e curto dos lados para soltar os braços;
    // faixa ciano com zigue-zague creme e barra escura, pintadas por vértice
    const hem = (a: number) => 0.28 - 0.27 * Math.pow(Math.abs(Math.cos(a)), 1.6);
    b.add("torso", sculptTube(48, 12, (a, t, p) => {
      const fold = Math.sin(a * 9 + Math.sin(a * 4) * 1.2);
      const r = (0.1 + 0.32 * Math.pow(t, 0.7) + 0.05 * t * Math.abs(Math.cos(a))) * (1 + 0.035 * t * fold);
      p.set(Math.sin(a) * r * 1.17, 0.635 + (hem(a) - 0.635) * Math.pow(t, 1.25), Math.cos(a) * r * 0.72);
    }, (a, t, c) => {
      const zig = Math.abs(((a * 16) / Math.PI) % 2 + (a < 0 ? 2 : 0) - 1) - 0.5;
      c.copy(cTeal).lerp(cTealD, 0.6 * ss(0, 0.45, t) * (0.5 - 0.5 * Math.sin(a * 9)));
      if (t > 0.52 && t < 0.86) c.copy(Math.abs(t - 0.69 - zig * 0.12) < 0.045 ? cCream : cCyan);
      if (t >= 0.86) c.copy(cDeep);
      if (t < 0.1) c.copy(cTealD);
    }));

    // ---- braços: manga de couro, punho creme e mão
    for (const [arm, fore, s] of [["armL", "foreL", -1], ["armR", "foreR", 1]] as const) {
      b.add(arm, limb(0.078, 0.066, 0.31, HIDE));
      b.add(fore, limb(0.066, 0.056, 0.25, HIDE, 0.06));
      b.add(fore, edge(lathe([[0.066, -0.26], [0.07, -0.22], [0.064, -0.16]], CREAM, 0xc9c4ae, 10), 0xc9c4ae, -0.16));
      b.add(fore, ...grp(fist(FACE, 0.056, s), 0, -HAND, 0.01));
    }

    // ---- quadril: cinturão com fivela e balas, coldre com o segundo revólver do lado esquerdo
    b.add("hips", at(sph(0.185, PANTS, 1.05, 0.75, 0.84, PANTS_D), 0, 0, 0));
    b.add("hips", at(cyl(0.21, 0.205, 0.07, HIDE, 14, HIDE_D), 0, 0.09, 0, 0, 0, 0.06, 1, 1, 0.82), at(bx(0.07, 0.07, 0.03, GOLD, dk(GOLD)), 0, 0.09, 0.168));
    for (let i = 0; i < 4; i++) b.add("hips", at(cyl(0.012, 0.012, 0.05, GOLD, 5, dk(GOLD)), 0.07 + i * 0.03, 0.09, 0.168 - i * i * 0.006));
    b.add("hips", ...grp([
      at(bx(0.07, 0.24, 0.1, HIDE, HIDE_D), 0, -0.1, 0), at(bx(0.04, 0.1, 0.05, 0x3a2a22, 0x3a2a22), 0, 0.07, -0.04, 0.5),
      at(cyl(0.03, 0.03, 0.06, GUN, 8, GUN_D), 0, 0.03, 0.01),
    ], -0.225, 0, 0.02, 0.15, 0, -0.1));

    // ---- pernas: calça cinza-azulada e bota de cano alto com dobra e espora
    for (const [th, sh] of [["thighL", "shinL"], ["thighR", "shinR"]] as const) {
      b.add(th, limb(0.108, 0.086, 0.42, PANTS, 0.04));
      b.add(sh, limb(0.092, 0.072, 0.36, HIDE, 0.15), at(cyl(0.095, 0.108, 0.08, HIDE, 10, HIDE_D), 0, -0.04, 0));
      b.add(sh, at(sph(0.088, HIDE, 1, 0.7, 1.95, HIDE_D), 0, -0.42, 0.075), at(cyl(0.03, 0.03, 0.012, GOLD, 8, dk(GOLD)), 0, -0.4, -0.1, 0, 0, Math.PI / 2));
    }

    // ---- parte de trás do poncho: comprida até o joelho, azul-petróleo, solta
    b.add("cape", at(capeMesh({ color: DEEP, shade: 0x2f6f7a, lining: DEEP_D, half: [1.35, 1.05], rTop: 0.27, rHem: 0.5, len: 1.0, depth: 0.8, folds: 0.07, tatter: 0.05 }), 0, -0.2, 0.0));

    // ---- revólver de cano longo, ao longo do antebraço: cano, tambor, cão e coronha de madeira
    b.add("foreR", ...grp([
      at(bx(0.045, 0.13, 0.06, WOOD, dk(WOOD)), 0, 0.01, -0.035, -0.35),
      at(bx(0.05, 0.16, 0.07, GUN_D, GUN_D), 0, -0.12, 0.02),
      at(cyl(0.042, 0.042, 0.1, GUN, 8, 0x6a7286), 0, -0.13, 0.03),
      at(cyl(0.02, 0.02, 0.36, GUN, 8, GUN_D), 0, -0.37, 0.045), at(bx(0.016, 0.3, 0.02, GUN_D, GUN_D), 0, -0.34, 0.015),
      at(bx(0.012, 0.03, 0.03, GUN_D, GUN_D), 0, -0.53, 0.07), at(bx(0.014, 0.04, 0.03, GUN_D, GUN_D), 0, -0.03, 0.06, 0.5),
    ], 0, -HAND, 0.02));
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
  // Redesenho a partir do sprite (docs/ref/umbra.png): assassina esguia e agachada, de capuz e máscara, toda de preto com placas cinza e filetes
  // magenta, cachecol magenta com duas pontas longas soltas (fitas com física) e uma adaga em cada mão.
  // Medidas do sprite (altura 67 px): capuz 15 px, ombros 22 px, quadril a 45% da altura, pontas do cachecol com 40% da altura.
  umbra: (b) => {
    const CLOTH = 0x4b4962, CLOTH_D = 0x24232f, CLOTH_L = 0x6a6884, PLATE = 0x8890aa, PLATE_D = 0x4c5268, MAG = 0xe45cf0, MAG_D = 0x7c2090, FACE = 0xd4b0bd, BLADE = 0xdfe6f0;
    const col = (hex: number) => new THREE.Color(hex);
    const cCloth = col(CLOTH), cClothD = col(CLOTH_D), cClothL = col(CLOTH_L), cFace = col(FACE), cFaceD = col(0x9a7888), cMask = col(0x7c7a96), cMaskD = col(0x45435a), cMagD = col(MAG_D);
    const HAND = 0.3;
    b.bulk = 0.88; b.style = "thrust"; b.rough = 0.78; b.glowColor = MAG;
    b.lean = 0.2; b.crouch = 0.34; b.armOut = 0.17;
    b.poseR = [-0.6, -1.1]; b.poseL = [0.15, -0.8];
    b.dims = { hipY: 0.93, headY: 0.57, shoulderY: 0.45, shoulderX: 0.25, arm: 0.32, hipX: 0.145, thigh: 0.44 };

    // ---- capuz: malha única com a abertura do rosto afundada (faixa de pele nos olhos, máscara embaixo), forro magenta na borda,
    // bico caído para trás e barra que abre sobre os ombros
    const open = (n: THREE.Vector3) => ss(0.62, 0.46, Math.abs(n.x)) * ss(0.36, 0.26, n.y) * ss(-0.5, -0.38, n.y) * ss(0.25, 0.5, n.z);
    b.add("head", at(sculpt(32, 24, (n, p) => {
      const skirt = ss(-0.35, -0.95, n.y);
      const peak = ss(0.35, 1, n.y) * ss(0.3, -0.6, n.z);
      const nose = bell(n.x, 0.14) * bell(n.y + 0.08, 0.14) * ss(0.5, 0.9, n.z);
      p.set(
        n.x * 0.2 * (1 + 0.14 * skirt),
        n.y * 0.235 + 0.03 * peak,
        n.z * 0.21 * (1 + 0.1 * skirt) - 0.04 * open(n) + 0.022 * nose - 0.07 * peak + 0.022 * bell(open(n) - 0.2, 0.2) * ss(0.2, 0.5, n.z),
      );
    }, (n, c) => {
      const o = open(n);
      c.copy(cClothD).lerp(cCloth, ss(-0.9, 0.2, n.y)).lerp(cClothL, ss(0.3, 0.95, n.y) * 0.6);
      if (Math.sin(n.x * 7 + n.y * 3) * Math.sin(n.z * 6) > 0.55) c.multiplyScalar(0.85); // dobras do pano
      if (o > 0.12) c.copy(cMagD);
      if (o > 0.6) c.copy(cMaskD).lerp(cMask, ss(-0.45, 0.0, n.y) * (0.6 + 0.4 * bell(n.x, 0.3)));
    }), 0, 0.2, 0));
    // faixa de pele dos olhos: chapa própria sem contorno sobre o fundo da abertura (pintada na malha do capuz a borda fica borrada)
    b.flat("head", plateMesh(10, 3, (u, v, p) => {
      const nx = Math.sin(u * 0.52), ny = 0.31 - 0.3 * v - 0.03 * u * u;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      p.set(nx * 0.2, ny * 0.235 + 0.2, nz * 0.21 - 0.033);
    }, (u, v, c) => {
      c.copy(cFaceD).lerp(cFace, ss(0, 0.5, v)).lerp(cFaceD, 0.5 * ss(0.6, 1, Math.abs(u)));
    }, 0x9a7888, 0.004));
    for (const s of [-1, 1]) {
      b.flat("head", at(stud(0.024, 0xf4eef2, 0xd8ccd6, 1.35, 0.62, 0.3), s * 0.06, 0.236, 0.166, 0, s * 0.3, 0));
      b.flat("head", at(stud(0.016, MAG_D, MAG_D, 1, 1.05, 0.3), s * 0.058, 0.236, 0.172, 0, s * 0.3, 0));
      b.lit("head", at(stud(0.009, MAG, MAG, 1, 1, 0.4, 0), s * 0.058, 0.236, 0.178, 0, s * 0.3, 0));
      b.flat("head", at(bx(0.066, 0.012, 0.014, CLOTH_D, CLOTH_D), s * 0.06, 0.259, 0.17, 0, s * 0.3, s * 0.26));
    }

    // ---- tronco esguio com arnês cinza cruzado, placa no peito e bainha atravessada nas costas
    const chest = lathe([[0.135, -0.08], [0.155, -0.04], [0.15, 0.1], [0.175, 0.3], [0.2, 0.42], [0.18, 0.5], [0.11, 0.56], [0.065, 0.6], [0, 0.61]], CLOTH, CLOTH_D, 14);
    chest.scale(1.08, 1, 0.78);
    b.add("torso", chest, at(cyl(0.05, 0.055, 0.12, CLOTH_D, 8), 0, 0.6, 0));
    b.add("torso", at(bx(0.05, 0.5, 0.018, PLATE_D, PLATE_D), 0.02, 0.26, 0.135, -0.1, 0, 0.62), at(bx(0.05, 0.5, 0.018, PLATE_D, PLATE_D), 0, 0.26, -0.14, 0.06, 0, -0.62));
    b.add("torso", at(edge(lathe([[0.075, -0.06], [0.08, 0], [0.05, 0.05], [0, 0.065]], PLATE, PLATE_D, 8), MAG, -0.06), -0.085, 0.35, 0.115, 1.35, 0, 0.1, 1, 1, 0.8));
    b.add("torso", at(stud(0.02, GOLD, dk(GOLD), 1, 1, 1, 0), 0.05, 0.3, 0.15));
    b.add("torso", ...grp([at(bx(0.07, 0.42, 0.035, PLATE_D, CLOTH_D), 0, 0, 0), at(bx(0.075, 0.03, 0.04, MAG, MAG_D), 0, 0.2, 0), at(cyl(0.016, 0.016, 0.12, LEATHER, 6), 0, 0.28, 0), at(stud(0.022, GOLD, dk(GOLD), 1, 1, 1, 0), 0, 0.35, 0)], 0.02, 0.1, -0.165, 0, 0, 1.15));

    // ---- cachecol: volta larga no pescoço caindo sobre o peito, nó atrás e duas pontas soltas
    const wrap = edge(lathe([[0.11, 0.49], [0.175, 0.52], [0.165, 0.555], [0.185, 0.59], [0.165, 0.625], [0.175, 0.655], [0.11, 0.69]], MAG, 0xb23cc2, 14), MAG_D, 0.555, 0.625);
    wrap.scale(1.05, 1, 0.9);
    b.add("torso", at(wrap, 0, 0, 0.01, 0.1), at(stud(0.05, MAG, MAG_D, 1.1, 0.9, 0.9, 0), -0.05, 0.6, -0.175));
    b.ribbons.push({ bone: "torso", at: [-0.09, 0.6, -0.18], len: 1.05, seg: 11, width: [0.045, 0.03], color: MAG, tip: 0xf08af5 });
    b.ribbons.push({ bone: "torso", at: [0.03, 0.59, -0.19], len: 0.82, seg: 9, width: [0.042, 0.028], color: 0xa832b8, tip: MAG_D });

    // ---- braços: ombreira pequena, manga justa, braçal com filete magenta e mão descoberta
    for (const [arm, fore, s] of [["armL", "foreL", -1], ["armR", "foreR", 1]] as const) {
      b.add(arm, at(dome(0.095, PLATE, PLATE_D, MAG), s * 0.02, 0.03, 0, 0, 0, -s * 0.5));
      b.add(arm, limb(0.07, 0.058, 0.3, CLOTH));
      b.add(fore, limb(0.058, 0.05, 0.24, CLOTH, 0.05));
      b.add(fore, edge(lathe([[0.058, -0.24], [0.064, -0.21], [0.07, -0.09], [0.066, -0.07]], PLATE, PLATE_D, 10), MAG, -0.24, -0.07));
      b.add(fore, ...grp(fist(FACE, 0.05, s), 0, -HAND, 0.01));
    }

    // ---- quadril: cinto com fivela dourada e bolsa de lado
    b.add("hips", at(sph(0.16, CLOTH, 1.05, 0.78, 0.84, CLOTH_D), 0, 0, 0));
    b.add("hips", at(edge(cyl(0.178, 0.178, 0.06, PLATE_D, 14, PLATE_D), MAG, 0.03), 0, 0.1, 0, 0, 0, 0, 1, 1, 0.82), at(bx(0.055, 0.055, 0.03, GOLD, dk(GOLD)), 0, 0.1, 0.143));
    b.add("hips", at(bx(0.07, 0.1, 0.06, PLATE, PLATE_D), -0.17, 0.03, 0.02), at(bx(0.075, 0.03, 0.065, PLATE_D, PLATE_D), -0.17, 0.085, 0.02));

    // ---- pernas: calça justa, tira com tacha na coxa, joelheira, caneleira com filete e sapatilha de biqueira cinza
    for (const [th, sh, s] of [["thighL", "shinL", -1], ["thighR", "shinR", 1]] as const) {
      b.add(th, limb(0.104, 0.076, 0.42, CLOTH, 0.05));
      b.add(th, at(cyl(0.094, 0.099, 0.035, PLATE_D, 10, PLATE_D), 0, -0.17, 0), at(stud(0.016, GOLD, dk(GOLD), 1, 1, 1, 0), s * 0.06, -0.17, 0.07));
      b.add(sh, at(stud(0.062, PLATE, PLATE_D, 1, 1.1, 0.8), 0, 0, 0.04));
      b.add(sh, limb(0.07, 0.056, 0.36, CLOTH, 0.14));
      b.add(sh, edge(lathe([[0.062, -0.34], [0.07, -0.3], [0.08, -0.14], [0.076, -0.1]], CLOTH_L, CLOTH, 10), MAG, -0.1));
      b.add(sh, at(sph(0.075, CLOTH_D, 1, 0.68, 1.85, CLOTH_D), 0, -0.42, 0.065), at(stud(0.05, PLATE, PLATE_D, 1.2, 0.75, 1.1), 0, -0.425, 0.15));
    }

    // ---- adagas: lâmina larga de um gume, guarda magenta e pomo dourado; a direita em guarda à frente, a esquerda baixa
    const knife = (): G[] => {
      const tip = cone(0.035, 0.12, BLADE, 4, BLADE);
      tip.rotateY(Math.PI / 4).scale(1, 1, 0.3);
      return [
        at(cyl(0.017, 0.017, 0.13, CLOTH_D, 6), 0, 0, 0), at(stud(0.024, GOLD, dk(GOLD), 1, 1, 1, 0), 0, 0.08, 0),
        at(bx(0.1, 0.022, 0.034, MAG_D, dk(MAG_D)), 0, -0.07, 0),
        at(bx(0.05, 0.3, 0.012, BLADE, 0xa6b0c2), 0, -0.23, 0), at(bx(0.012, 0.28, 0.018, 0x8a94a8, 0x8a94a8), 0.012, -0.22, 0),
        at(tip, 0, -0.44, 0, Math.PI),
      ];
    };
    b.add("foreR", ...grp(knife(), 0, -HAND, 0.01, -0.35));
    b.add("foreL", ...grp(knife(), 0, -HAND, 0.01, -0.5, 0, 0));
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
