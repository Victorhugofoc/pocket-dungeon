// Heróis (versão antiga, a refazer em M2 pelo método da seção 4 do roadmap).
import { type Spec, at, beard, belt, body, bx, cape, cone, cowboyHat, cyl, dagger, hairCap, hairLong, hood, hornHelm, lathe, mace, pauldron, revolver, shield, sph, staff, sword, torus, wizardHat, BLACK, BONE, GOLD, LEATHER, SKIN, STEEL, WOOD } from "./kit";

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
  varok: (b) => {
    body(b, { skin: 0xe0b090, top: 0xa3acb6, bottom: 0x8a929c, boots: 0x6f7780, bulk: 1.28, hands: 0x8a929c });
    b.style = "swing"; b.poseR = [-0.5, -0.9];
    b.add("head", ...hornHelm(STEEL, BONE), ...beard(0x7a5230, 0.2));
    b.add("armL", ...pauldron(STEEL, 0.19)).add("armR", ...pauldron(STEEL, 0.19));
    b.add("cape", ...cape(0xb8262e, 0.38, 1.1));
    b.add("hips", ...belt(LEATHER, 1.28));
    b.add("torso", at(sph(0.2, STEEL, 1.3, 1.0, 0.75), 0, 0.34, 0.07));
    b.add("foreR", ...mace());
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
