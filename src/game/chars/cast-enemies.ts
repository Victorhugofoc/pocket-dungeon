// Inimigos comuns. Goblin e orc refeitos no M3-01 pelo método da seção 4 do roadmap; os outros ainda na versão antiga.
import * as THREE from "three";
import { paint, prep } from "../flora";
import { modelParts } from "./baked";
import { type Builder, type G, type Spec, at, axe, beard, bell, belt, body, bow, bx, cape, capeMesh, club, cone, cyl, dagger, dk, dome, fist, grp, hairCap, hairLong, headBase, headMask, hood, hornHelm, lathe, limb, pauldron, restArm, sculpt, sph, ss, staff, stud, torsoMesh, torus, tubeMesh, BONE, IRON, LEATHER } from "./kit";

export const ENEMIES: Record<string, Spec> = {
  // ------------------------------------------------ inimigos
  // Modelado no Blender (tools/blender/goblin.py, arquivo art/goblin.blend): teste do pipeline na revisão 2 do M3-01, depois que o
  // rosto por código não convenceu. As malhas vêm por osso de chars/models/goblin.json; aqui ficam só esqueleto e postura, que
  // têm de bater com os pivôs de tools/blender/goblin_body.py. A versão por código continua como goblin_v1, para comparar.
  goblin: (b) => {
    b.scale = 0.7; b.style = "swing"; b.rough = 0.7; b.glowColor = 0xffd23a;
    b.lean = 0.62; b.crouch = 0.95; b.armOut = 0.22;
    b.poseR = [-0.9, -0.75]; b.poseL = [-0.3, -0.75];
    b.dims = { hipY: 0.66, headY: 0.48, shoulderY: 0.4, shoulderX: 0.24, arm: 0.3, hipX: 0.16, thigh: 0.27 };
    for (const [key, g] of modelParts("goblin")) {
      const [bone, layer] = key.split("@");
      if (layer === "lit") b.lit(bone, g);
      else if (layer === "flat") b.flat(bone, g);
      else b.add(bone, g);
    }
  },
  // Redesenho a partir do sprite (docs/ref/goblin.png): baixinho, muito curvado e agachado, cabeça grande projetada para a frente com
  // orelhas longas para trás, nariz adunco, arcada pesada e boca de dentes; colete de couro com ombreira, calça escura, pés grandes
  // e descalços, clava nodosa de ponta clara apontada para a frente. Medidas do sprite (altura 40 px): cabeça 13 px (um terço),
  // orelha 9 px, braço fino até o joelho, pernas curtas.
  goblin_v1: (b) => {
    const SKIN = 0x768e36, SKIN_D = 0x3a4a18, SKIN_L = 0x9cae52, VEST = 0x7a4a2a, VEST_D = 0x40240f, PAD = 0x94603a;
    const PANTS = 0x46523e, PANTS_D = 0x2f3b33, CLUB = 0x7a4426, CLUB_L = 0xa86e40, EYE = 0xffd23a, DARK = 0x1c120e, TOOTH = 0xeee2b8;
    const col = (h: number) => new THREE.Color(h);
    const cSkin = col(SKIN), cSkinD = col(SKIN_D), cSkinL = col(SKIN_L);
    const HAND = 0.29;
    b.scale = 0.7; b.style = "swing"; b.rough = 0.7; b.glowColor = EYE;
    b.lean = 0.62; b.crouch = 0.95; b.armOut = 0.22;
    b.poseR = [-0.9, -0.75]; b.poseL = [-0.3, -0.75];
    b.dims = { hipY: 0.66, headY: 0.48, shoulderY: 0.4, shoulderX: 0.24, arm: 0.3, hipX: 0.16, thigh: 0.27 };

    // ---- cabeça: escultura própria (a cabeça base redonda dava cara de bonzinho). Crânio comprido para trás, arcada pesada em V que
    // desce para o meio, órbitas fundas com olhos estreitos, maçãs salientes e bochechas fundas, mandíbula larga projetada (dentes de
    // baixo para fora), boca rasgada de canto caído, testa com rugas. Rosnado, não sorriso.
    const cDark = col(DARK);
    const browY = (x: number) => 0.2 + 0.4 * Math.abs(x); // linha da arcada: ponta de dentro mais baixa
    const head = sculpt(26, 20, (n, p) => {
      const ax = Math.abs(n.x), front = ss(0.25, 0.85, n.z), low = ss(-0.15, -0.65, n.y);
      let x = n.x * 0.17, y = n.y * (n.y > 0 ? 0.14 : 0.165), z = n.z * 0.17; // crânio baixo
      if (n.z < 0) z *= 1.3 + 0.25 * ss(0, 0.8, n.y); // crânio comprido para trás
      z -= 0.05 * ss(0.3, 1, n.y) * ss(-0.2, 0.6, n.z); // testa baixa, inclinada para trás
      z += 0.085 * bell(n.y - browY(n.x), 0.09) * front * bell(n.x, 0.7); // arcada
      z -= 0.05 * bell(n.y - browY(n.x) + 0.2, 0.11) * bell(ax - 0.36, 0.17) * front; // órbita
      x += Math.sign(n.x) * 0.02 * bell(n.y + 0.02, 0.12) * ss(0.45, 0.85, ax); // maçã do rosto
      x -= Math.sign(n.x) * 0.038 * bell(n.y + 0.28, 0.15) * ss(0.35, 0.8, ax) * ss(-0.1, 0.5, n.z); // bochecha funda
      z += 0.14 * low * ss(-0.1, 0.7, n.z); // mandíbula para a frente (queixo à frente do lábio de cima)
      x *= 1 + 0.2 * low; // e larga
      y -= 0.04 * low * front; // queixo comprido
      z -= 0.018 * bell(n.y + 0.5, 0.05) * front * bell(n.x, 0.5); // fenda da boca
      x *= 1 - 0.16 * ss(-0.1, 0.8, n.y) * ss(-0.6, 0.4, n.z); // têmporas estreitas: a cabeça não fica bola
      p.set(x, y, z);
    }, (n, c) => {
      const ax = Math.abs(n.x), front = ss(0.3, 0.8, n.z);
      c.copy(cSkinD).lerp(cSkin, 0.7 + 0.3 * ss(-0.9, 0.0, n.y)).lerp(cSkinL, ss(0.4, 0.95, n.y) * 0.4);
      c.lerp(cDark, 0.8 * bell(n.y - browY(n.x) + 0.2, 0.2) * bell(ax - 0.36, 0.28) * front); // sombra funda da órbita: os olhos acesos saem do escuro
      c.lerp(cSkinD, 0.35 * ss(-0.45, -0.9, n.y)); // embaixo da mandíbula
    });
    const HX = 0, HY = 0.12, HZ = 0.1, HR = -0.5, HS = 1.3; // a curva do tronco inclina a cabeça; ela volta a olhar para a frente
    const H = (g: G, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => at(at(g, x, y, z, rx, ry, rz), HX, HY, HZ, HR, 0, 0, HS);
    b.add("head", H(head, 0, 0, 0));
    // nariz adunco, comprido e pontudo, caindo sobre a boca; narinas escuras
    b.add("head", H(tubeMesh(8, 8, (k, o) => { o.set(0, 0.005 - 0.06 * k * k, 0.15 + 0.12 * Math.sin(k * 1.4)); }, (k) => 0.06 * (1 - k) * (1 - 0.3 * k) + 0.007, (_a, k, c) => { c.copy(cSkin).lerp(cSkinD, k * 0.4); }), 0, 0, 0));
    // boca: esgar largo e aberto, cantos puxados para cima e para trás, fundo vermelho escuro, dentes cerrados de cima e de baixo
    const mouthY = (x: number) => -0.115 - 1.0 * x * x, mouthZ = (x: number) => 0.235 - 2.4 * x * x;
    b.flat("head", H(sculpt(12, 8, (n, p) => { const x = n.x * 0.1; p.set(x, mouthY(x) + n.y * 0.03 * (1 - 0.6 * n.x * n.x), mouthZ(x) + n.z * 0.012 - 0.008); }, (n, c) => { c.set(0x2a0808).lerp(new THREE.Color(0x0e0303), ss(0.2, -0.6, n.z)); }), 0, 0, 0));
    const FANG = 0xd6c896, jag = [0.8, 1.15, 0.9, 1.2, 0.85];
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 0.03, z = mouthZ(x) + 0.004, len = 0.024 * jag[i];
      b.flat("head", H(cone(0.011, len, FANG, 4, dk(FANG, 0.7)), x, mouthY(x) + 0.028 - len / 2, z, Math.PI, 0, (i - 2) * 0.12)); // dentes de cima, tortos
      if (i % 2 === 1) b.flat("head", H(cone(0.01, 0.018, FANG, 4, dk(FANG, 0.7)), x, mouthY(x) - 0.024, z - 0.002)); // de baixo
    }
    // narinas
    for (const s of [-1, 1]) b.flat("head", H(stud(0.012, DARK, DARK, 1.2, 0.7, 0.6, 0), s * 0.02, -0.048, 0.245));
    for (const s of [-1, 1]) {
      // presa de baixo grande, subindo por fora do lábio de cima
      b.flat("head", H(cone(0.018, s < 0 ? 0.075 : 0.06, TOOTH, 5, dk(TOOTH, 0.7)), s * 0.075, mouthY(0.075) - 0.01, mouthZ(0.075) + 0.012, 0.25, 0, -s * 0.25)); // presa de baixo subindo por cima do lábio; uma lascada
      // olho estreito e amarelo, fundo na órbita, pálpebra de cima cortando em diagonal (raiva); pupila em fenda
      const ey = 0.035, ex = s * 0.066;
      b.lit("head", H(stud(0.03, EYE, EYE, 1.35, 0.42, 0.45, 0), ex, ey, 0.165, 0, 0, -s * 0.3));
      b.flat("head", H(stud(0.011, DARK, DARK, 0.6, 1.4, 0.5, 0), ex - s * 0.004, ey, 0.177));
      b.add("head", H(stud(0.042, SKIN, 0x1a240a, 1.65, 0.5, 0.65), ex + s * 0.008, ey + 0.024, 0.165, 0.3, 0, s * 0.42)); // arcada grossa em V, sombreando o olho
      // orelha longa em folha, para fora e para trás, com a ponta subindo
      const ear = sculpt(10, 6, (n, p) => {
        const t = (n.x + 1) / 2;
        p.set(t * 0.37, n.y * 0.095 * (1 - 0.85 * t) + 0.05 * t * t, n.z * (0.035 - 0.022 * t));
      }, (n, c) => {
        const t = (n.x + 1) / 2;
        c.copy(cSkinD).lerp(cSkin, 0.6 + 0.4 * n.y);
        if (Math.abs(n.y) < 0.55 && t > 0.08 && t < 0.8) c.lerp(cSkinD, 0.6);
      });
      if (s < 0) ear.rotateY(Math.PI);
      b.add("head", H(ear, s * 0.14, 0.05, -0.07, 0, s * 1.25, s * 0.22));
    }

    // ---- tronco: colete de couro, magro, ombros caídos; ombreira de couro só de um lado
    b.add("torso", torsoMesh({ color: VEST, shade: VEST_D, light: PAD, waistW: 0.15, chestW: 0.06, neckW: 0.08, waistD: 0.12, chestD: 0.04, neckD: 0.05, pecs: 0.015, abs: 0, ribs: 0, traps: 0.03, y0: -0.06, height: 0.52, seg: [14, 10] }));
    b.add("torso", at(cyl(0.065, 0.075, 0.08, SKIN, 8), 0, 0.45, 0.01));
    b.add("torso", at(cyl(0.013, 0.013, 0.42, VEST_D, 4), 0.02, 0.22, 0.135, 0, 0, 0.75)); // correia diagonal
    b.add("armL", at(dome(0.115, PAD, VEST_D, VEST_D), -0.01, 0.03, 0, 0, 0, 0.35, 1, 0.45, 1), at(dome(0.1, PAD, VEST_D, VEST_D), -0.04, -0.04, 0, 0, 0, 0.9, 1, 0.45, 1));

    // ---- braços finos e compridos, mãos grandes com punho enfaixado
    for (const [arm, fore, s] of [["armL", "foreL", -1], ["armR", "foreR", 1]] as const) {
      b.add(arm, at(stud(0.055, SKIN), 0, 0, 0), limb(0.05, 0.04, 0.3, SKIN));
      b.add(fore, limb(0.056, 0.07, 0.25, SKIN, 0.18), at(cyl(0.055, 0.058, 0.06, VEST_D, 8), 0, -0.22, 0));
      b.add(fore, ...grp(fist(SKIN, 0.072, s), 0, -HAND, 0.01));
    }

    // ---- quadril: calça escura, cinto e tanga de couro
    b.add("hips", at(sph(0.15, PANTS, 1.05, 0.72, 0.88, PANTS_D), 0, 0, 0));
    b.add("hips", at(cyl(0.155, 0.155, 0.05, VEST_D, 12), 0, 0.07, 0, 0, 0, 0, 1, 1, 0.86));
    b.add("hips", at(capeMesh({ color: VEST, shade: VEST_D, half: [0.6, 0.45], rTop: 0.15, rHem: 0.18, len: 0.26, folds: 0.05, tatter: 0.05, nu: 6, nt: 3 }), 0, 0.06, 0.13, 0, Math.PI, 0));

    // ---- pernas curtas, panos enrolados na canela, pé grande descalço com unhas
    for (const [th, sh] of [["thighL", "shinL"], ["thighR", "shinR"]] as const) {
      b.add(th, limb(0.075, 0.06, 0.27, PANTS));
      b.add(sh, limb(0.058, 0.048, 0.24, PANTS_D, 0.15), at(cyl(0.062, 0.062, 0.04, VEST, 7), 0, -0.09, 0), at(cyl(0.056, 0.056, 0.04, VEST, 7), 0, -0.17, 0));
      b.add(sh, at(stud(0.09, SKIN, SKIN_D, 1.0, 0.5, 1.8), 0, -0.27, 0.07));
      for (let i = -1; i <= 1; i++) b.add(sh, at(cone(0.018, 0.045, TOOTH, 4), i * 0.045, -0.28, 0.23, Math.PI / 2));
    }

    // ---- clava nodosa: cabo fino que engrossa até a ponta clara, com nós; apontada para a frente e para cima
    const club: G[] = [
      lathe([[0, -0.76], [0.08, -0.74], [0.095, -0.66], [0.075, -0.55], [0.045, -0.35], [0.03, -0.1], [0.032, 0.04], [0, 0.05]], CLUB_L, CLUB, 9),
    ];
    for (const [y, a] of [[-0.42, 0.3], [-0.55, 2.4], [-0.63, 4.4], [-0.3, 3.7]]) club.push(at(stud(0.035, CLUB, dk(CLUB), 1, 1, 1, 0), Math.sin(a) * (0.03 - y * 0.08), y, Math.cos(a) * (0.03 - y * 0.08)));
    b.add("foreR", ...grp(club, 0, -HAND, 0.02, -0.65, 0, 0.3, 1.3));
  },
  // Redesenho a partir do sprite (docs/ref/orc.png): brutamontes verde-oliva corcunda, ombros e braços enormes, cabeça careca baixa e
  // projetada, arcada pesada, presas subindo da mandíbula; ombreira de placas de ferro sobrepostas num ombro, correias de couro
  // cruzadas no peito nu, cinto de fivela redonda, tanga de couro, calça escura e pés descalços; machado de duas lâminas segurado
  // baixo, atravessado na frente do corpo com as duas mãos. Medidas do sprite (altura 60 px): cabeça 12 px, ombros 34 px, braço
  // até a coxa, pernas curtas e grossas.
  // Modelado no Blender (tools/blender/orc.py, arquivo art/orc.blend; D16). As malhas vêm por osso de chars/models/orc.json; aqui
  // ficam esqueleto, postura e o machado (osso "weapon", pegada de duas mãos), que continua por código. A versão inteira por código
  // fica como orc_v1, para comparar.
  orc: (b) => {
    b.bulk = 1.45; b.scale = 1.08; b.style = "swing"; b.rough = 0.65; b.glowColor = 0xe8442a;
    b.lean = 0.3; b.crouch = 0.36; b.armOut = 0.14;
    b.poseR = [-0.6, -0.8]; b.poseL = [-0.55, -0.8];
    b.dims = { hipY: 0.84, headY: 0.6, shoulderY: 0.52, shoulderX: 0.41, arm: 0.4, hipX: 0.2, thigh: 0.38 };
    for (const [key, g] of modelParts("orc")) {
      const [bone, layer] = key.split("@");
      if (layer === "lit") b.lit(bone, g);
      else if (layer === "flat") b.flat(bone, g);
      else b.add(bone, g);
    }
    orcAxe(b);
  },
  orc_v1: (b) => {
    const SKIN = 0x5e7a2a, SKIN_D = 0x2c3a14, SKIN_L = 0x8aa244, IRON_D = 0x34363a, IRON_M = 0x63666c, IRON_L = 0xb4b8be;
    const HIDE = 0x6e3c1e, HIDE_D = 0x3a1d0e, PANTS = 0x5e3a26, PANTS_D = 0x341f14, TUSK = 0xeee4c6, EYE = 0xe8442a, DARK = 0x160e0c;
    const col = (h: number) => new THREE.Color(h);
    const cSkin = col(SKIN), cSkinD = col(SKIN_D), cSkinL = col(SKIN_L), cDark = col(DARK);
    const HAND = 0.38;
    b.bulk = 1.45; b.scale = 1.08; b.style = "swing"; b.rough = 0.65; b.glowColor = EYE;
    b.lean = 0.3; b.crouch = 0.36; b.armOut = 0.14;
    b.poseR = [-0.6, -0.8]; b.poseL = [-0.55, -0.8];
    b.dims = { hipY: 0.84, headY: 0.6, shoulderY: 0.52, shoulderX: 0.41, arm: 0.4, hipX: 0.2, thigh: 0.38 };

    // ---- tronco nu: peito largo, barriga, trapézio alto que esconde o pescoço (corcunda)
    b.add("torso", torsoMesh({ color: SKIN, shade: SKIN_D, light: SKIN_L, waistW: 0.27, chestW: 0.13, neckW: 0.16, waistD: 0.22, chestD: 0.07, neckD: 0.1, pecs: 0.06, abs: 0.014, ribs: 0, traps: 0.04, y0: -0.08, height: 0.74, seg: [16, 12] }));
    b.add("torso", at(stud(0.22, SKIN, SKIN_D, 1.6, 0.7, 1.0), 0, 0.58, -0.08)); // massa do trapézio
    // correias cruzadas de couro só na frente, de um lado ao outro, sumindo sob os braços (atrás o trapézio as engolia aos pedaços)
    for (const s of [-1, 1]) {
      b.add("torso", tubeMesh(4, 14, (t, o) => {
        const a = (t - 0.5) * Math.PI * 1.1;
        o.set(Math.sin(a) * 0.38, 0.33 + s * 0.2 * Math.sin(a), Math.cos(a) * 0.33 + 0.01);
      }, () => 0.032, (_a, _t, c) => { c.set(HIDE); }));
    }
    b.add("torso", at(cyl(0.05, 0.05, 0.03, IRON_L, 10, IRON_M), 0, 0.33, 0.345, Math.PI / 2));

    // ---- cabeça careca, baixa e para a frente: mandíbula larga, arcada pesada, presas, orelhas pontudas pequenas
    const { muzzle, socket } = headMask;
    const head = headBase({ w: 0.18, h: 0.165, d: 0.19, muzzle: 0.07, muzzleNarrow: -0.12, palate: null, brow: 0.05, socket: 0.035, cheek: 0.04, seg: [18, 13], tint: (n, c) => {
      c.copy(cSkinD).lerp(cSkin, ss(-0.9, 0.1, n.y)).lerp(cSkinL, ss(0.4, 0.95, n.y) * 0.45);
      if (socket(n) > 0.45) c.copy(cSkinD).multiplyScalar(0.6);
      if (muzzle(n) > 0.35 && Math.abs(n.y + 0.4) < 0.05) c.copy(cDark);
    } });
    const H = (g: G, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => at(at(g, x, y, z, rx, ry, rz), 0, 0.06, 0.19, -0.2);
    b.add("head", H(head, 0, 0, 0));
    b.add("head", H(stud(0.12, SKIN, SKIN_D, 1.35, 0.5, 1.15), 0, -0.13, 0.08)); // mandíbula de baixo, mais larga
    b.add("head", H(stud(0.045, SKIN, SKIN_D, 1.6, 0.7, 0.8), 0, 0.0, 0.2)); // nariz largo
    for (const s of [-1, 1]) {
      b.lit("head", H(stud(0.03, EYE, EYE, 1.5, 0.75, 0.5, 0), s * 0.062, 0.052, 0.176, 0, 0, s * 0.25));
      b.flat("head", H(stud(0.045, SKIN_D, 0x1e2a0e, 1.6, 0.45, 0.8), s * 0.06, 0.098, 0.16, 0, 0, s * 0.35)); // arcada pesada, sem contorno (com ele vira pálpebra fechada)
      b.add("head", H(cone(0.026, 0.1, TUSK, 6, dk(TUSK, 0.8)), s * 0.085, -0.04, 0.18, -0.15, 0, -s * 0.2));
      const ear = sculpt(10, 6, (n, p) => {
        const t = (n.x + 1) / 2;
        p.set(t * 0.2, n.y * 0.06 * (1 - 0.8 * t) + 0.05 * t * t, n.z * 0.022);
      }, (n, c) => { c.copy(cSkinD).lerp(cSkin, 0.55 + 0.45 * n.y); });
      if (s < 0) ear.rotateY(Math.PI);
      b.add("head", H(ear, s * 0.15, 0.03, -0.02, 0, s * 0.45, s * 0.15));
    }

    // ---- braços enormes: deltoide, bíceps e antebraço grosso, braçadeira de couro; ombreira de placas no ombro esquerdo
    for (const [arm, fore, s] of [["armL", "foreL", -1], ["armR", "foreR", 1]] as const) {
      b.add(arm, at(stud(0.17, SKIN, SKIN_D, 1.05, 0.95, 1.05), s * 0.02, 0.0, 0), limb(0.15, 0.12, 0.38, SKIN, 0.18));
      b.add(fore, limb(0.12, 0.125, 0.3, SKIN, 0.22), at(cyl(0.13, 0.14, 0.2, HIDE, 10, HIDE_D), 0, -0.2, 0));
      b.add(fore, ...grp(fist(SKIN, 0.085, s), 0, -HAND, 0.01));
    }
    // ombreira: quatro lâminas em degraus, cada uma mais baixa e menor, presas ao tronco (no braço, girariam quando a mão vai ao cabo)
    for (let i = 0; i < 4; i++) {
      const r = 0.2 - i * 0.025;
      const lam = dome(r, 0x7c7c7a, 0x46474a, DARK);
      lam.scale(1.1, 0.4, 1.05);
      b.add("torso", at(lam, -0.43 - i * 0.045, 0.68 - i * 0.08, -0.05, 0, 0, 0.3 + i * 0.28));
    }

    // ---- quadril: calça escura, cinto largo com fivela redonda, tanga de couro na frente e atrás
    b.add("hips", at(sph(0.26, PANTS, 1.05, 0.72, 0.86, PANTS_D), 0, 0, 0));
    b.add("hips", at(cyl(0.29, 0.29, 0.09, HIDE, 14, HIDE_D), 0, 0.09, 0, 0, 0, 0, 1, 1, 0.84), at(cyl(0.06, 0.06, 0.04, IRON_L, 10, IRON_M), 0, 0.09, 0.245, Math.PI / 2));
    b.add("hips", at(capeMesh({ color: HIDE, shade: HIDE_D, half: [0.6, 0.45], rTop: 0.26, rHem: 0.3, len: 0.4, folds: 0.05, tatter: 0.07, nu: 6, nt: 3 }), 0, 0.05, 0.22, 0, Math.PI, 0));
    b.add("hips", at(capeMesh({ color: HIDE, shade: HIDE_D, half: [0.7, 0.55], rTop: 0.27, rHem: 0.31, len: 0.34, folds: 0.05, tatter: 0.06, nu: 6, nt: 3 }), 0, 0.05, -0.22));

    // ---- pernas grossas e curtas, faixas na canela, pé descalço largo
    for (const [th, sh] of [["thighL", "shinL"], ["thighR", "shinR"]] as const) {
      b.add(th, limb(0.18, 0.145, 0.38, PANTS, 0.06));
      b.add(sh, limb(0.14, 0.11, 0.34, PANTS, 0.15), at(cyl(0.112, 0.108, 0.05, 0x8a6a48, 8), 0, -0.16, 0), at(cyl(0.104, 0.1, 0.05, 0x8a6a48, 8), 0, -0.25, 0));
      b.add(sh, at(stud(0.14, SKIN, SKIN_D, 1.0, 0.5, 1.6), 0, -0.37, 0.09));
      for (let i = -1; i <= 1; i++) b.add(sh, at(cone(0.026, 0.06, TUSK, 4), i * 0.06, -0.38, 0.31, Math.PI / 2));
    }

    orcAxe(b);
  },
  swarm: (b) => {
    b.form = "bat"; b.scale = 0.75; b.style = "bite";
    b.add("hips", sph(0.22, 0x6a3fb0, 1, 0.95, 1.1), at(sph(0.2, 0x7a4fc0), 0, 0.02, 0.2));
    for (const s of [-1, 1]) {
      b.add("hips", at(cone(0.07, 0.22, 0x6a3fb0, 5), s * 0.12, 0.22, 0.2, 0, 0, -s * 0.3));
      b.lit("hips", at(sph(0.04, 0xffd34d), s * 0.08, 0.06, 0.38));
      b.add("hips", at(cone(0.02, 0.07, 0xffffff, 4), s * 0.05, -0.06, 0.38, Math.PI));
      const w = prep(new THREE.CircleGeometry(0.55, 5, 0, Math.PI * 0.75), false);
      paint(w, 0x3a1f66, 0x5a3f9a, -0.5, 0.5);
      b.add(s < 0 ? "wingL" : "wingR", at(w, 0, 0, 0, -Math.PI / 2, 0, s < 0 ? Math.PI * 0.62 : -Math.PI * 0.38 + Math.PI * 0.75 - Math.PI * 0.75));
    }
  },
  assassin: (b) => {
    body(b, { skin: 0xf2f2f2, top: 0x8a8f99, bottom: 0x6a6f7a, boots: 0x2a2a30, eyes: 0x1c1c22 });
    b.scale = 0.92; b.style = "thrust"; b.poseR = [-0.6, -1.1]; b.poseL = [-0.3, -1.2];
    b.add("head", ...hairCap(0x2a2a30), at(cyl(0.035, 0.02, 0.5, 0x2a2a30, 6), 0, 0.3, -0.34, 1.9));
    for (const s of [-1, 1]) {
      b.add("head", at(cone(0.06, 0.16, 0xf2f2f2, 4), s * 0.12, 0.44, 0.08));
      b.add("head", at(bx(0.03, 0.09, 0.02, 0xc8281e), s * 0.11, 0.14, 0.2));
    }
    b.add("hips", ...belt(0xc8281e, 1, 0xc8281e)).add("torso", at(torus(0.18, 0.05, 0xc8281e), 0, 0.52, 0));
    b.add("foreR", ...dagger()).add("foreL", ...dagger());
  },
  archer: (b) => {
    body(b, { skin: BONE, top: 0x5a2a30, bottom: 0xd9cdb0, boots: BONE, sleeve: BONE, bulk: 0.8, eyes: 0x1c1c22 });
    b.scale = 0.95; b.style = "shoot"; b.poseL = [-1.35, -0.1]; b.poseR = [-0.6, -1.3];
    b.add("head", ...hood(0x4a2228));
    b.add("cape", ...cape(0x4a2228, 0.26, 0.8));
    b.add("torso", at(bx(0.2, 0.05, 0.03, BONE), 0, 0.36, 0.2), at(bx(0.2, 0.05, 0.03, BONE), 0, 0.27, 0.2), at(bx(0.2, 0.05, 0.03, BONE), 0, 0.18, 0.2));
    b.add("foreL", ...bow());
  },
  spellcaster: (b) => {
    body(b, { skin: 0x4a7ad9, top: 0x1f5a66, sleeve: 0x1f5a66, robe: { color: 0x1a4a55, hem: 0x5a2a6a }, eyes: 0xffe14a, eyeGlow: true });
    b.glowColor = 0xe84ad9; b.scale = 0.95;
    b.style = "cast"; b.poseR = [-0.6, -1.0];
    for (let i = 0; i < 3; i++) b.lit("head", at(cone(0.05, i === 1 ? 0.34 : 0.24, 0xe84ad9, 5), (i - 1) * 0.11, 0.5 - Math.abs(i - 1) * 0.04, 0, 0, 0, -(i - 1) * 0.3));
    b.add("torso", at(lathe([[0.36, 0], [0.3, 0.1], [0.14, 0.14]], 0x5a2a6a), 0, 0.46, 0));
    b.add("foreR", ...staff(0x3a2a4a, 1.6));
    b.lit("foreR", at(cone(0.08, 0.3, 0xe84ad9, 5), 0, -0.31, 1.15, Math.PI / 2));
  },
  bombardier: (b) => {
    body(b, { skin: 0xd9a070, top: 0x7a4a2a, bottom: 0x4a3020, boots: 0x2e1e14, bulk: 1.4 });
    b.scale = 0.8; b.style = "throw"; b.poseR = [-0.9, -0.9];
    b.add("head", at(sph(0.24, 0x5a4a3a, 1, 0.7, 1), 0, 0.3, 0), ...beard(0xc8501e, 0.4), at(sph(0.16, 0xc8501e, 1.3, 0.6, 0.8), 0, 0.1, 0.1));
    b.add("torso", at(cone(0.13, 0.7, 0xd9b27a, 9), -0.26, 0.62, -0.12, -1.2, 0, 0.3));
    b.add("hips", ...belt(LEATHER, 1.4));
    b.add("foreR", at(sph(0.17, 0x1c1c1c), 0, -0.44, 0));
    b.lit("foreR", at(cyl(0.015, 0.015, 0.12, 0xff9a3c, 4), 0.03, -0.28, 0), at(sph(0.035, 0xffe14a), 0.04, -0.21, 0));
  },
  summoner: (b) => {
    body(b, { skin: 0xd9cfe0, top: 0x3a2a55, sleeve: 0x3a2a55, robe: { color: 0x2f2248, hem: 0x7affc8 }, eyes: 0x7affc8, eyeGlow: true });
    b.glowColor = 0x7affc8;
    b.style = "cast"; b.poseL = [-0.9, -1.0]; b.poseR = [-0.4, -0.9];
    b.add("head", ...hairLong(0xe8e8f0, 0.7));
    b.add("torso", at(lathe([[0.34, 0], [0.26, 0.12], [0.13, 0.16]], 0x4a3a6a), 0, 0.44, 0));
    b.add("foreL", at(bx(0.3, 0.05, 0.22, 0x7a5230), 0, -0.36, 0.06));
    b.lit("foreL", at(bx(0.26, 0.02, 0.18, 0xbfffe6), 0, -0.325, 0.06));
  },
  berserker: (b) => {
    body(b, { skin: 0xc89a7a, top: 0xc89a7a, bottom: 0x5a4636, boots: 0x3a2e24, bulk: 1.4 });
    b.scale = 1.02; b.style = "swing"; b.poseR = [-0.5, -0.9]; b.poseL = [-0.5, -0.9];
    b.add("head", ...hornHelm(IRON, BONE), ...beard(0xd9641e, 0.42));
    b.add("torso", at(bx(0.5, 0.06, 0.03, 0x4a8fd6), 0, 0.42, 0.2), at(bx(0.06, 0.3, 0.03, 0x4a8fd6), 0.12, 0.28, 0.21, 0, 0, 0.4));
    b.add("hips", at(lathe([[0.36, -0.3], [0.3, 0], [0.26, 0.08]], 0x8a7a66), 0, 0, 0), ...belt(LEATHER, 1.4, IRON));
    b.add("foreR", ...axe(0.7)).add("foreL", ...axe(0.7));
  },
  splitter: (b) => {
    b.form = "slime"; b.style = "bite"; b.rough = 0.25; b.glowColor = 0xfff2f8;
    const blob = prep(new THREE.SphereGeometry(0.75, 16, 10), true);
    const p = blob.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const flat = y < 0 ? 1 + -y * 0.5 : 1;
      p.setXYZ(i, p.getX(i) * flat * (1 + 0.08 * Math.sin(p.getZ(i) * 9)), Math.max(y, -0.38) * (y > 0 ? 0.95 : 1), p.getZ(i) * flat);
    }
    blob.computeVertexNormals();
    b.add("hips", at(paint(blob, 0xc83a8a, 0xff8ac8, -0.4, 0.75), 0, 0.4, 0));
    for (const s of [-1, 1]) b.add("hips", at(sph(0.1, 0x3a1228, 0.9, 1.2, 0.5), s * 0.22, 0.68, 0.62));
    b.add("hips", at(sph(0.2, 0x3a1228, 1.3, 0.45, 0.5), 0, 0.4, 0.7));
    b.add("hips", at(bx(0.3, 0.06, 0.06, BONE), -0.3, 0.5, 0.3, 0.5, 0.7, 0.4), at(sph(0.07, BONE), 0.36, 0.3, 0.25), at(bx(0.2, 0.05, 0.05, BONE), 0.2, 0.75, -0.2, 0.2, 0.3, 1.0));
  },
};

/** machado de duas lâminas do orc: atravessado baixo na frente do corpo, cabeça à frente; a mão esquerda segura mais adiante no cabo */
function orcAxe(b: Builder): void {
  const IRON_D = 0x34363a, IRON_M = 0x63666c, HIDE_D = 0x3a1d0e, DARK = 0x160e0c, HAND = 0.38;
  const R = restArm(b, 1, HAND);
  // em guarda: cabo na diagonal diante do corpo, da mão direita no quadril até a cabeça do machado acima do ombro esquerdo; o cabo
  // passa perto do ombro esquerdo, ao alcance da mão (o braço alcança 0,84)
  const dir = new THREE.Vector3(-0.78, 0.66, 0.08).normalize();
  const aim = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  const HEAD = 0.95, BLADE = 1.1 + Math.PI / 4;
  const axeG: G[] = [
    at(cyl(0.032, 0.036, 1.5, 0x6a4024, 7), 0, 0.4, 0),
    at(stud(0.05, IRON_M, IRON_D, 1, 1, 1, 0), 0, -0.36, 0),
    at(cyl(0.04, 0.04, 0.18, HIDE_D, 7), 0, 0.42, 0),
    at(cyl(0.065, 0.065, 0.28, IRON_D, 8), 0, HEAD, 0),
    at(cone(0.05, 0.12, IRON_M, 6, IRON_D), 0, HEAD + 0.2, 0),
    // miolo escuro ligando as duas lâminas, girado junto com elas
    cyl(0.06, 0.06, 0.22, DARK, 8).rotateZ(Math.PI / 2).rotateY(Math.PI / 2 + BLADE).translate(0, HEAD, 0),
  ];
  // lâmina em meia-lua: na forma, x ao longo do cabo e y para fora; o gume (fora) é claro
  const moon = new THREE.Shape();
  moon.moveTo(-0.07, 0.03);
  moon.quadraticCurveTo(-0.2, 0.14, -0.27, 0.32);
  moon.quadraticCurveTo(0, 0.4, 0.27, 0.32);
  moon.quadraticCurveTo(0.2, 0.14, 0.07, 0.03);
  moon.closePath();
  for (const s of [-1, 1]) {
    const g = prep(new THREE.ExtrudeGeometry(moon, { depth: 0.035, bevelEnabled: false, curveSegments: 6 }), false);
    g.translate(0, 0, -0.0175);
    paint(g, IRON_M, 0xd8dce2, 0.28, 0.4);
    g.scale(1.05, 1.05, 1);
    g.rotateZ(Math.PI / 2); // x da forma -> y do cabo; y da forma -> -x
    g.rotateY(s > 0 ? Math.PI / 2 + BLADE : -Math.PI / 2 + BLADE); // lâminas em pé: para cima e para baixo do cabo
    axeG.push(at(g, 0, HEAD, 0));
  }
  // a mão direita segura perto do pomo e a esquerda no meio do cabo, longe da lâmina
  b.add("weapon", ...axeG.map((g) => g.rotateX(Math.PI).translate(0, -0.3, 0)));
  b.weapon = { hand: HAND, carry: R.inv.clone().multiply(aim), grip: 0.6 };
}
