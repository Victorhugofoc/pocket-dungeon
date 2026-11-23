// Inimigos comuns. Goblin e orc refeitos no M3-01 pelo método da seção 4 do roadmap; os outros ainda na versão antiga.
import * as THREE from "three";
import { paint, prep } from "../flora";
import { addModel } from "./baked";
import { type Builder, type G, type Spec, at, axe, beard, bell, belt, body, bow, bx, cape, capeMesh, club, cone, cyl, dagger, dk, dome, fist, grp, hairCap, hairLong, hang, headBase, headMask, hood, hornHelm, lathe, limb, pauldron, restArm, restHand, sculpt, sph, ss, staff, stud, torsoMesh, torus, tubeMesh, BONE, IRON, LEATHER, WOOD } from "./kit";

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
    addModel(b, "goblin");
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
    // bruto ereto, peito em V e braços enormes caídos ao lado (referências 3D do usuário, 2026-11-18)
    b.bulk = 1.45; b.scale = 1.3; b.style = "swing"; b.rough = 0.65; b.glowColor = 0xe8442a;
    b.lean = 0.1; b.crouch = 0.16; b.armOut = 0.2;
    b.poseR = [-0.2, -0.45]; b.poseL = [-0.05, -0.25];
    b.dims = { hipY: 0.84, headY: 0.6, shoulderY: 0.52, shoulderX: 0.45, arm: 0.4, hipX: 0.2, thigh: 0.38 };
    addModel(b, "orc");
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
    // diabinho-morcego roxo modelado no Blender (tools/blender/swarm.py, brief em docs/briefs/swarm.md)
    b.form = "bat"; b.scale = 1.35; b.style = "bite"; b.glowColor = 0xffb52a;
    addModel(b, "swarm");
  },
  assassin: (b) => {
    // ninja de máscara de raposa modelado no Blender (tools/blender/assassin.py, brief em docs/briefs/assassin.md); adagas por código.
    // Base de luta do sprite: baixa e larga, pé esquerdo à frente, quadril girado; a mão da frente estende a adaga, a de trás guarda
    // o peito com a outra
    b.scale = 1.02; b.style = "thrust"; b.rough = 0.75;
    b.lean = 0.26; b.crouch = 1.05; b.armOut = 0.2;
    b.stance = { spread: 0.6, stagger: 0.38, turn: 0.55 };
    b.poseL = [-1.55, -0.35, 0.05, 0.25]; b.poseR = [-0.35, -1.25, 0.3, -0.25];
    b.dims = { hipY: 0.92, headY: 0.58, shoulderY: 0.46, shoulderX: 0.3, arm: 0.32, hipX: 0.14, thigh: 0.42 };
    addModel(b, "assassin");
    // cachecol preto comprido, solto para trás pela física de fita
    b.ribbons.push({ bone: "torso", at: [0.03, 0.56, -0.08], len: 1.0, seg: 10, width: [0.11, 0.07], color: 0x1e1e24, tip: 0x34343e });
    fighterDagger(b, -1, false);
    fighterDagger(b, 1, false);
  },

  archer: (b) => {
    // esqueleto arqueiro modelado no Blender (tools/blender/archer.py, brief em docs/briefs/archer.md); o arco fica por código
    b.scale = 0.95; b.style = "shoot"; b.rough = 0.7; b.glowColor = 0xff4a2a;
    // postura de tiro do sprite: de lado para o alvo, base aberta com o pé esquerdo à frente, tronco curvado; braço do arco esticado
    // à frente e o da corda aberto, com a mão junto ao rosto
    b.lean = 0.22; b.crouch = 0.4; b.armOut = 0.14;
    b.stance = { spread: 0.24, stagger: 0.36, turn: 1.2 };
    b.poseL = [-1.55, -0.05, 0, -0.6]; b.poseR = [-0.1, -2.1, 1.5, -0.4];
    b.dims = { hipY: 0.92, headY: 0.6, shoulderY: 0.46, shoulderX: 0.27, arm: 0.34, hipX: 0.12, thigh: 0.42 };
    addModel(b, "archer");
    archerBow(b);
  },

  spellcaster: (b) => {
    // feiticeiro de coroa de cristais modelado no Blender (tools/blender/spellcaster.py, brief em docs/briefs/spellcaster.md); flutua
    // de manto, sem pernas. Pose do sprite: braço do cetro aberto com o antebraço em pé, o outro pendendo (a mesma de POSE_R/POSE_L)
    b.form = "robed"; b.scale = 0.95; b.style = "cast"; b.rough = 0.75; b.glowColor = 0xe84ad9;
    b.lean = 0.2; b.armOut = 0.05;
    b.poseR = [-0.75, -2.15, 0.1, 0.9]; b.poseL = [0.1, -0.55];
    b.dims = { hipY: 0.86, headY: 0.6, shoulderY: 0.46, shoulderX: 0.25, arm: 0.32, hipX: 0.12, thigh: 0.42 };
    addModel(b, "spellcaster");
  },
  bombardier: (b) => {
    // anão de óculos com canhão no ombro, modelado no Blender (tools/blender/bombardier.py, brief em docs/briefs/bombardier.md); a bomba
    // fica por código, erguida na mão esquerda: o arremesso é com a esquerda, como no sprite
    b.scale = 1.0; b.style = "throwL"; b.rough = 0.7; b.glowColor = 0xffb02a;
    b.lean = 0.12; b.crouch = 0.2; b.armOut = 0.22;
    b.poseL = [-0.45, -1.55, 0.95, 0]; b.poseR = [-0.15, -0.45]; // bomba aberta para o lado, na altura do ombro
    b.dims = DWARF;
    addModel(b, "bombardier");
    bombardierBomb(b);
  },
  summoner: (b) => {
    // bruxa de cabelo branco com livro modelada no Blender (tools/blender/summoner.py, brief em docs/briefs/summoner.md); flutua de
    // vestido, sem pernas. Pose do sprite: mão direita erguida em garra, livro aberto sobre o antebraço esquerdo (POSE_R/POSE_L)
    b.form = "robed"; b.scale = 1; b.style = "cast"; b.rough = 0.75; b.glowColor = 0x7affc8;
    b.lean = 0.06; b.armOut = 0.14;
    b.poseR = [-0.7, -2.2, 0.1, 0.9]; b.poseL = [-0.05, -0.95];
    b.dims = { hipY: 0.88, headY: 0.58, shoulderY: 0.45, shoulderX: 0.22, arm: 0.32, hipX: 0.12, thigh: 0.42 };
    addModel(b, "summoner");
  },
  berserker: (b) => {
    // anão de elmo com chifres, peito nu tatuado e manto de pele, modelado no Blender (tools/blender/berserker.py, brief em
    // docs/briefs/berserker.md); os dois machados ficam por código, empunhados para cima em guarda, e sobem juntos no golpe (poses iguais)
    b.scale = 1.12; b.style = "swing"; b.rough = 0.7;
    b.lean = 0.42; b.crouch = 0.35; b.armOut = 0.42;
    b.poseR = [-0.35, -1.45]; b.poseL = [-0.35, -1.45]; // antebraços erguidos à frente, punhos na altura do peito
    b.dims = { ...DWARF, shoulderX: 0.42 };
    addModel(b, "berserker");
    berserkerAxe(b, -1);
    berserkerAxe(b, 1);
  },
  splitter: (b) => {
    // gosma rosa com ossos dentro, modelada no Blender (tools/blender/splitter.py, brief em docs/briefs/splitter.md)
    b.form = "slime"; b.style = "bite"; b.rough = 0.2; b.glowColor = 0xfff2f8;
    addModel(b, "splitter");
  },
  shieldbearer: (b) => {
    // cavaleiro de escudo e lança modelado no Blender (tools/blender/shieldbearer.py, brief em docs/briefs/shieldbearer.md); escudo e
    // lança também vêm de lá, presos aos antebraços. Pose do sprite: antebraço do escudo atravessado à frente do peito, lança baixa
    // junto ao quadril apontando para a frente. As poses têm de bater com POSE_L, POSE_R, LEAN e OUT do script
    b.scale = 1.0; b.style = "spear"; b.rough = 0.4; b.glowColor = 0xffd27a;
    b.lean = 0.12; b.crouch = 0.18; b.armOut = 0.15;
    b.poseL = [-0.65, -1.05, 0, -0.7]; b.poseR = [0.05, -0.95, 0, -0.6];
    b.dims = { hipY: 0.98, headY: 0.56, shoulderY: 0.48, shoulderX: 0.36, arm: 0.34, hipX: 0.15, thigh: 0.47 };
    addModel(b, "shieldbearer");
  },
  hexer: (b) => {
    // velha bruxa curvada modelada no Blender (tools/blender/hexer.py, brief em docs/briefs/hexer.md); flutua de manto, sem pernas.
    // Cajado de espiral em pé na mão esquerda (foreL) e lanterna-gaiola pendurada na direita (foreR). Poses iguais a POSE_R/POSE_L,
    // LEAN e OUT do script: braço direito esticado à frente com a mão caída, o esquerdo com o cajado à frente; corcunda pelo lean
    b.form = "robed"; b.scale = 1.1; b.style = "cast"; b.rough = 0.75; b.glowColor = 0x9cff6a;
    b.lean = 0.55; b.armOut = 0.1;
    b.poseR = [-1.2, -1.0]; b.poseL = [-0.9, -0.7];
    b.dims = { hipY: 0.84, headY: 0.42, shoulderY: 0.4, shoulderX: 0.19, arm: 0.3, hipX: 0.12, thigh: 0.42 };
    addModel(b, "hexer");
  },
  plaguebearer: (b) => {
    // zumbi inchado e enfaixado com barril de peste nas costas, modelado no Blender (tools/blender/plaguebearer.py, brief em
    // docs/briefs/plaguebearer.md); barril, correias e gosma no osso do tronco. Dims iguais ao RIG do script
    b.scale = 1.25; b.style = "swing"; b.rough = 0.7; b.glowColor = 0xc8e050;
    b.lean = 0.42; b.crouch = 0.3; b.armOut = 0.2;
    b.poseR = [-0.35, -0.45]; b.poseL = [-0.3, -0.4];
    b.dims = { hipY: 0.66, headY: 0.46, shoulderY: 0.44, shoulderX: 0.36, arm: 0.3, hipX: 0.17, thigh: 0.3 };
    addModel(b, "plaguebearer");
  },


};

/** Pivôs dos anões, iguais ao RIG de tools/blender/dwarf.py */
const DWARF = { hipY: 0.6, headY: 0.5, shoulderY: 0.4, shoulderX: 0.34, arm: 0.27, hipX: 0.15, thigh: 0.28 };
const DWARF_HAND = 0.24;

/** Bomba preta do bombardier, pousada na mão esquerda erguida, com o pavio aceso para cima */
function bombardierBomb(b: Builder): void {
  const L = restArm(b, -1, DWARF_HAND);
  b.add("foreL", ...hang([at(sph(0.155, 0x3a3c44, 1, 1, 1, 0x0c0c0e), 0, 0.17, 0.03), at(cyl(0.04, 0.045, 0.05, 0x5a5048, 8), 0, 0.32, 0.03)], L.inv, DWARF_HAND));
  b.lit("foreL", ...hang([at(cyl(0.012, 0.012, 0.08, 0xff9a3c, 4), 0.015, 0.37, 0.03, 0, 0, -0.4), at(sph(0.022, 0xfff0a0), 0.035, 0.415, 0.03),
    ...[0, 1, 2, 3, 4, 5].map((i) => at(cone(0.011, 0.05 + 0.03 * (i % 2), i % 2 ? 0xff8a1e : 0xffd23a, 3), 0.035, 0.415, 0.03, 0, i * 0.5, (i * Math.PI) / 3 + 0.3))], L.inv, DWARF_HAND)); // faísca em estrela
}

/** Machado de barba do berserker, empunhado para cima em guarda (pedido do usuário em 2026-11-19: nada de machado caído com a lâmina
 * para baixo): o cabo sai do punho para cima, a lâmina fica no alto com o fio para a frente e para fora, o topo um pouco aberto e para
 * trás. Modelado na vertical do mundo com a origem na mão e pendurado no antebraço com `hang`. */
function berserkerAxe(b: Builder, side: number): void {
  const L = restArm(b, side, DWARF_HAND);
  const sh = new THREE.Shape();
  const X = (x: number) => side * x; // espelhada na forma (escala negativa viraria as faces para dentro)
  sh.moveTo(0, 0.3);
  sh.quadraticCurveTo(X(0.1), 0.28, X(0.2), 0.17);     // barba, a ponta de baixo
  sh.quadraticCurveTo(X(0.31), 0.4, X(0.21), 0.63);    // fio curvo, largo
  sh.quadraticCurveTo(X(0.1), 0.5, 0, 0.5);            // ponta de cima
  sh.closePath();
  const blade = prep(new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.008, bevelSegments: 1, curveSegments: 6 }), true);
  blade.translate(0, 0, -0.025);
  paint(blade, 0x4a505c, 0xe8eef6, 0.2, 0.6);
  const g: G[] = [
    blade,
    at(cyl(0.04, 0.044, 0.72, 0xa8743e, 7, 0x5a3a1e), 0, 0.24, 0),                         // cabo
    at(cyl(0.048, 0.048, 0.22, 0x6a7280, 8, 0x3a404a), 0, 0.4, 0),                          // alvado de ferro
    at(cone(0.035, 0.09, 0x8a929e, 4), -side * 0.065, 0.42, 0, 0, 0, side * Math.PI / 2),   // esporão de trás
    at(cyl(0.05, 0.05, 0.1, 0x4a2e18, 6, 0x2a180c), 0, 0.0, 0),                            // empunhadura enfaixada, no punho
    at(sph(0.055, 0x6a7280, 1, 0.8, 1, 0x3a404a), 0, -0.12, 0),                             // pomo
  ];
  // fio para a frente e para fora; topo aberto para o lado e um pouco para trás
  for (const x of g) x.rotateY(-side * 1.0).rotateZ(-side * 0.3).rotateX(-0.25);
  b.add(side > 0 ? "foreR" : "foreL", ...hang(g, L.inv, DWARF_HAND));
}

/** Arco longo do archer, puxado: em pé no plano do tiro, com o punho dentro da mão esquerda fechada e a corda em V até a mão direita,
 * junto ao rosto, com uma flecha armada. O plano do arco passa pelas duas mãos, então o antebraço do arco fica de fora da corda. */
function archerBow(b: Builder): void {
  const HAND = 0.3, R = 0.62, ARC = Math.PI * 0.7, WOOD = 0x8a5228, WOOD_L = 0xd09a58, CORD = 0xe8e0d0, CANT = 0.3;
  const L = restArm(b, -1, HAND);
  const d = restHand(b, 1, HAND).sub(restHand(b, -1, HAND)); // da mão do arco até a mão da corda, no espaço do personagem
  const back = Math.hypot(d.x, d.z); // a corda puxada recua isto atrás do punho
  // modelado com o tiro em +z e a origem no punho; depois gira para a direção do tiro (da mão da corda para a do arco)
  const arc = prep(new THREE.TorusGeometry(R, 0.046, 6, 20, ARC), true);
  paint(arc, WOOD, WOOD_L, -0.5, 0.5);
  arc.rotateZ(-ARC / 2).translate(-R, 0, 0).rotateY(-Math.PI / 2); // meio do arco no punho, barriga para +z, pontas para trás
  const tipZ = -(R - R * Math.cos(ARC / 2)), tipY = R * Math.sin(ARC / 2);
  const g: G[] = [arc, at(cyl(0.055, 0.055, 0.16, 0x2e1a0e, 7), 0, 0, 0)];
  const nock = new THREE.Vector3(0, d.y, -back);
  // haste reta entre dois pontos (cilindro deitado ao longo de a→b)
  const rod = (a: THREE.Vector3, c: THREE.Vector3, r: number, color: number): G => {
    const m = cyl(r, r, a.distanceTo(c), color, 4).rotateX(Math.PI / 2);
    m.lookAt(new THREE.Vector3().subVectors(c, a));
    return m.translate((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2);
  };
  for (const s of [1, -1]) g.push(rod(new THREE.Vector3(0, s * tipY, tipZ), nock, 0.007, CORD));
  // flecha armada: da corda até passar o punho, apoiada sobre a mão
  const rest = new THREE.Vector3(0, 0.045, 0.06), head = new THREE.Vector3(0, 0.05, 0.2);
  g.push(rod(nock, head, 0.012, 0x8a6038));
  g.push(at(cone(0.028, 0.08, 0x9aa0a8, 4), 0, head.y, head.z + 0.03, Math.PI / 2));
  const fl = nock.clone().lerp(rest, 0.12);
  for (const s of [1, -1]) g.push(at(bx(0.006, 0.045, 0.1, CORD), s * 0.014, fl.y, fl.z, 0, 0, s * 0.5));
  // arco inclinado para fora (a ponta de cima longe do capuz, e o arco aparece visto de cima), depois na direção do tiro
  const yaw = Math.atan2(-d.x, -d.z);
  for (const x of g) x.rotateZ(-CANT).rotateY(yaw);
  b.add("foreL", ...hang(g, L.inv, HAND));
}

/** Adaga do assassin presa ao antebraço: lâmina chata e larga (a face larga para cima com o braço esticado, para ler vista de cima),
 * guarda vermelha e cabo preto enfaixado. `reverse`: pegada invertida, a lâmina deitada por fora do antebraço, apontando para o
 * cotovelo. */
function fighterDagger(b: Builder, side: number, reverse: boolean): void {
  const HAND = 0.3, L = 0.27, W = 0.06;
  const blade = new THREE.Shape();
  blade.moveTo(-W, 0);
  blade.lineTo(W, 0);
  blade.quadraticCurveTo(W * 1.25, L * 0.55, 0, L); // folha: alarga no meio e fecha na ponta
  blade.quadraticCurveTo(-W * 1.25, L * 0.55, -W, 0);
  const geo = prep(new THREE.ExtrudeGeometry(blade, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 5 }), true);
  geo.translate(0, 0, -0.009);
  paint(geo, 0x7a808c, 0xe8ecf2, -W, W); // fio claro de um lado, aço escuro do outro
  // modelada com a lâmina em +y a partir da guarda; vira para -y (continua o antebraço) ou +y (invertida)
  const g: G[] = [
    geo.translate(0, 0.07, 0),
    at(bx(0.13, 0.03, 0.04, 0xc8281e, 0x6a1010), 0, 0.06, 0),
    at(cyl(0.022, 0.022, 0.1, 0x1e1e24, 6), 0, 0.0, 0),
    at(cyl(0.025, 0.025, 0.025, 0xc8281e, 6), 0, 0.02, 0),
  ];
  for (const x of g) {
    if (reverse) x.translate(0, -0.03, 0).applyMatrix4(new THREE.Matrix4().makeTranslation(side * 0.055, -HAND + 0.02, 0.02));
    else x.rotateZ(Math.PI).translate(0, -HAND - 0.02, 0).rotateX(-0.3);
  }
  b.add(side > 0 ? "foreR" : "foreL", ...g);
}

/** malhas do Blender (chars/models/<id>.json) nos ossos: "osso" com contorno, "osso@flat" sem contorno, "osso@lit" acesas */
/** machado de duas lâminas do orc: atravessado baixo na frente do corpo, cabeça à frente; a mão esquerda segura mais adiante no cabo */
function orcAxe(b: Builder): void {
  const IRON_D = 0x34363a, IRON_M = 0x63666c, HIDE_D = 0x3a1d0e, DARK = 0x160e0c, HAND = 0.38;
  const R = restArm(b, 1, HAND);
  // machado de duas lâminas numa mão só, cabo apontando para a frente e para baixo, cabeça à frente da perna e longe do chão
  // (docs/briefs/orc.md, seção 4); modelado na vertical do mundo com a origem na mão
  const HEAD = 0.56, TILT = 1.0;
  const axeG: G[] = [
    at(cyl(0.03, 0.034, 0.88, 0x6a4024, 7), 0, 0.26, 0),
    at(stud(0.048, IRON_M, IRON_D, 1, 1, 1, 0), 0, -0.2, 0),
    at(cyl(0.038, 0.038, 0.16, HIDE_D, 7), 0, 0.0, 0),
    at(cyl(0.062, 0.062, 0.26, IRON_D, 8), 0, HEAD, 0),
    at(cone(0.045, 0.11, IRON_M, 6, IRON_D), 0, HEAD + 0.19, 0),
    cyl(0.058, 0.058, 0.2, DARK, 8).rotateZ(Math.PI / 2).translate(0, HEAD, 0),
  ];
  // lâmina em meia-lua: na forma, x ao longo do cabo e y para fora; o gume (fora) é claro. As lâminas abrem para os lados, de
  // frente para a câmera alta; o cabo pende para fora para a lâmina de dentro não entrar na perna
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
    g.scale(0.85, 0.85, 1);
    g.rotateZ(Math.PI / 2);
    if (s < 0) g.rotateY(Math.PI);
    axeG.push(at(g, 0, HEAD, 0));
  }
  // cabeça para baixo e girada uns 57° para a frente: o cabo fica a ~33° abaixo da horizontal
  for (const g of axeG) g.rotateX(Math.PI).rotateX(-TILT).rotateZ(0.15);
  b.add("foreR", ...hang(axeG, R.inv, HAND));
}
