// Chefes. Método de modelagem: seção 4 de docs/roadmap.md; conferir em /preview.html com o sprite ao lado.
import * as THREE from "three";
import { paint, prep } from "../flora";
import { type G, type Spec, at, bell, belt, body, bx, cap, cape, cone, cyl, dk, grp, hairLong, headBase, headMask, lathe, muscleArm, muscleLeg, sph, ss, staff, torsoMesh, torus, BONE, GOLD, IRON, LEATHER, STEEL, WOOD } from "./kit";

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
  gravekeeper: (b) => {
    body(b, { skin: 0x0c1010, top: 0x5f645f, sleeve: 0x5f645f, hands: 0xb0b6a8, robe: { color: 0x4f544f, flare: 1.1 }, eyes: 0x73ffcc, eyeGlow: true, bulk: 1.15 });
    b.scale = 2.1; b.style = "swing"; b.poseR = [-0.4, -0.9]; b.poseL = [-0.9, -0.7]; b.glowColor = 0x73ffcc;
    b.add("head", at(sph(0.3, 0x4a4f4a, 1, 1.05, 1.1), 0, 0.22, -0.06), at(cone(0.2, 0.36, 0x4a4f4a, 8), 0, 0.5, -0.2, -0.9), at(sph(0.2, 0x0c1010, 1, 1.05, 0.5), 0, 0.2, 0.14));
    b.add("torso", at(lathe([[0.46, -0.08], [0.4, 0.1], [0.2, 0.2]], 0x5f645f), 0, 0.38, 0));
    b.add("hips", ...belt(LEATHER, 1.15, 0xb9a24a));
    for (let i = 0; i < 7; i++) b.add("skirt", at(cone(0.09, 0.3, 0x3f443f, 4), Math.cos(i * 0.9) * 0.48, -0.92, Math.sin(i * 0.9) * 0.48, Math.PI));
    b.add("foreR", at(cyl(0.03, 0.035, 1.6, WOOD, 6), 0, -0.9, 0), at(bx(0.3, 0.4, 0.04, IRON, STEEL), 0, -1.86, 0), at(cone(0.15, 0.16, IRON, 4), 0, -2.12, 0, Math.PI));
    b.add("foreL", at(cyl(0.012, 0.012, 0.3, IRON, 4), 0, -0.45, 0), at(cyl(0.1, 0.1, 0.05, 0x3a3a3a, 8), 0, -0.6, 0), at(cyl(0.11, 0.11, 0.05, 0x3a3a3a, 8), 0, -0.86, 0));
    b.lit("foreL", at(cyl(0.085, 0.085, 0.22, 0xffd36a, 8), 0, -0.73, 0));
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
