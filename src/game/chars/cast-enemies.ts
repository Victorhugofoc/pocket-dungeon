// Inimigos comuns (versão antiga, a refazer em M3 pelo método da seção 4 do roadmap).
import * as THREE from "three";
import { paint, prep } from "../flora";
import { type Spec, at, axe, beard, belt, body, bow, bx, cape, club, cone, cyl, dagger, hairCap, hairLong, hood, hornHelm, lathe, pauldron, sph, staff, torus, BONE, IRON, LEATHER } from "./kit";

export const ENEMIES: Record<string, Spec> = {
  // ------------------------------------------------ inimigos
  goblin: (b) => {
    body(b, { skin: 0x6fae4a, top: 0x7a5230, bottom: 0x5a3c22, boots: 0x6fae4a, sleeve: 0x6fae4a, head: 1.25, eyes: 0xffe14a });
    b.scale = 0.66; b.poseR = [-0.6, -0.8]; b.lean = 0.32; b.crouch = 0.5; b.armOut = 0.3;
    for (const s of [-1, 1]) b.add("head", at(cone(0.09, 0.36, 0x6fae4a, 5), s * 0.34, 0.27, -0.02, 0, 0, -s * 1.35));
    b.add("head", at(cone(0.05, 0.16, 0x5a9a3c, 6), 0, 0.18, 0.29, Math.PI / 2));
    b.add("foreR", ...club());
  },
  orc: (b) => {
    body(b, { skin: 0x4d8a3a, top: 0x5b4636, bottom: 0x3f3026, boots: 0x2e241c, sleeve: 0x4d8a3a, bulk: 1.45, eyes: 0xffd34d });
    b.scale = 1.08; b.poseR = [-0.5, -0.7];
    for (const s of [-1, 1]) b.add("head", at(cone(0.035, 0.13, 0xf0ead0, 5), s * 0.09, 0.12, 0.2));
    b.add("head", at(sph(0.2, 0x3f7a30, 1.1, 0.5, 1), 0, 0.09, 0.03));
    b.add("armL", ...pauldron(IRON, 0.2)).add("hips", ...belt(LEATHER, 1.45, IRON));
    b.add("torso", at(bx(0.12, 0.7, 0.04, LEATHER), 0.1, 0.3, 0.2, 0, 0, 0.6));
    b.add("foreR", ...axe(1.05, true));
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
