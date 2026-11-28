// Heróis. Os que têm o comentário "Redesenho" foram refeitos pelo método da seção 4 do roadmap; os outros são a versão antiga, a refazer em M2.
import * as THREE from "three";
import { type G, type Spec, at, beard, bell, belt, body, bx, cape, capeMesh, cone, cowboyHat, cyl, dagger, dk, dome, edge, fist, grp, hairCap, hairLong, hang, headBase, headMask, hood, lathe, limb, muscleArm, plateMesh, restArm, revolver, robeMesh, sculpt, sculptTube, sph, ss, staff, stud, sword, torus, tubeMesh, wizardHat, BLACK, BONE, GOLD, LEATHER, SKIN, WOOD } from "./kit";
import { addModel } from "./baked";

/** casca de pedra do orbe do Aurelius: a esfera é repartida em lascas irregulares (cada triângulo vai para a direção-semente mais
 * próxima) e cada lasca encolhe para a sua semente, abrindo frestas tortas por onde o núcleo aceso aparece. A lasca virada para
 * `hole` sai, abrindo um rombo. Sem contorno (vai em `flat`): o contorno de cada placa virava teia preta. Hash fixo: sai sempre igual. */
function crackedOrb(r: number, stone: number, stoneL: number, hole: THREE.Vector3): G {
  const p = new THREE.IcosahedronGeometry(r, 2).toNonIndexed().attributes.position;
  const hash = (k: number): number => Math.abs(Math.sin(k * 12.9898 + 4.1) * 43758.5453) % 1;
  const seeds: THREE.Vector3[] = [];
  for (let k = 0; k < 11; k++) { // espiral de Fibonacci com ruído: lascas de tamanhos diferentes
    const y = 1 - (2 * (k + 0.5)) / 11, rr = Math.sqrt(1 - y * y), a = k * 2.39996 + hash(k) * 0.9;
    seeds.push(new THREE.Vector3(Math.cos(a) * rr, y + (hash(k + 20) - 0.5) * 0.3, Math.sin(a) * rr).normalize());
  }
  let skip = 0;
  seeds.forEach((q, k) => { if (q.dot(hole) > seeds[skip].dot(hole)) skip = k; });
  const pos: number[] = [], col: number[] = [];
  const cS = new THREE.Color(stone), cL = new THREE.Color(stoneL), c = new THREE.Color();
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], m = new THREE.Vector3(), ax = new THREE.Vector3();
  for (let t = 0; t < p.count; t += 3) {
    for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(p, t + k);
    m.copy(v[0]).add(v[1]).add(v[2]).normalize();
    let s = 0;
    seeds.forEach((q, k) => { if (q.dot(m) > seeds[s].dot(m)) s = k; });
    if (s === skip) continue;
    const h = hash(s + 40);
    ax.copy(seeds[s]).multiplyScalar(r);
    c.copy(cS).lerp(cL, 0.3 + 0.5 * Math.max(0, seeds[s].y) + 0.2 * h);
    for (const q of v) {
      const w = q.clone().lerp(ax, 0.11).setLength(r * (1.02 + 0.06 * h)); // encolhe para a semente: fresta nas bordas
      pos.push(w.x, w.y, w.z);
      col.push(c.r, c.g, c.b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  // normal da esfera (direção do centro): a casca sai lisa e só as frestas são tortas; a normal por face deixava facetas
  const nrm = pos.slice();
  for (let i = 0; i < nrm.length; i += 3) { const l = Math.hypot(nrm[i], nrm[i + 1], nrm[i + 2]) || 1; nrm[i] /= l; nrm[i + 1] /= l; nrm[i + 2] /= l; }
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  return g;
}
const prepFlat = (g: G): G => { g.deleteAttribute("uv"); const f = g.index ? g.toNonIndexed() : g; f.computeVertexNormals(); return f; };
/** degradê vertical de `bot` a `top` entre -h e h */
function paintY(g: G, bot: number, top: number, h: number): G {
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), b = new THREE.Color(bot), t = new THREE.Color(top);
  for (let i = 0; i < p.count; i++) {
    c.copy(b).lerp(t, Math.max(0, Math.min(1, (p.getY(i) + h) / (2 * h))));
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}

export const HEROES: Record<string, Spec> = {
  // ------------------------------------------------ heróis
  // Frostine modelada no Blender (M2-11; tools/blender/frostine.py, brief em docs/briefs/frostine.md): maga do gelo de vestido, sem
  // pernas. Medidas e pose iguais às do script (tests/models.test.ts confere). Por código só o que brilha: o floco de neve no topo
  // do cajado (que é do Blender, no foreR) e o floquinho sobre a mão esquerda.
  frostine: (b) => {
    const ICE = 0x9fe4ff, ICE_G = 0x6fb8e0, WHITE = 0xf2f6fc;
    const HAND = 0.29, TOP = 0.62; // TOP = ponta do cajado acima da mão (STAFF_TOP no script)
    b.form = "robed"; b.bulk = 0.9; b.style = "cast"; b.rough = 0.6; b.glowColor = 0x8fe0ff;
    b.lean = 0.03; b.armOut = 0.2;
    b.poseR = [-0.55, -0.95]; b.poseL = [-0.6, -1.5, 0.25]; // mão esquerda erguida à frente, palma para cima (sprite)
    b.dims = { hipY: 0.92, headY: 0.57, shoulderY: 0.45, shoulderX: 0.22, arm: 0.31, hipX: 0, thigh: 0.42 };
    addModel(b, "frostine");
    // floco de neve de seis braços no topo do cajado, na vertical do mundo
    const R = restArm(b, 1, HAND);
    // dois flocos cruzados em 90° e braços grossos (de lado o floco chapado virava um risco), a 75% e num gelo menos claro: grande e
    // branco, o brilho apagava o corpo na câmera do jogo
    const flake: G[] = [at(stud(0.05, WHITE, WHITE, 1, 1, 1, 0), 0, 0, 0)];
    for (const yaw of [0, Math.PI / 2]) {
      const one: G[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        one.push(at(bx(0.03, 0.24, 0.04, ICE_G, ICE_G), -Math.sin(a) * 0.12, Math.cos(a) * 0.12, 0, 0, 0, a));
        for (const s of [-1, 1]) one.push(at(bx(0.022, 0.09, 0.03, ICE_G, ICE_G), -Math.sin(a) * 0.17 - Math.cos(a) * s * 0.026, Math.cos(a) * 0.17 - Math.sin(a) * s * 0.026, 0, 0, 0, a + s * 0.85));
      }
      flake.push(...grp(one, 0, 0, 0, 0, yaw));
    }
    b.lit("foreR", ...hang(grp(flake, 0, TOP + 0.22, 0, 0, 0, 0, 0.75), R.inv, HAND));
    // floquinho flutuando acima da palma erguida, na vertical do mundo
    const L = restArm(b, -1, HAND);
    const mini: G[] = [];
    // seis braços com espessura, de frente (cruzado em 90° lia como uma cruz)
    for (let i = 0; i < 3; i++) mini.push(at(bx(0.022, 0.16, 0.035, ICE, ICE), 0, 0, 0, 0, 0, (i * Math.PI) / 3));
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      for (const s of [-1, 1]) mini.push(at(bx(0.014, 0.045, 0.025, ICE, ICE), -Math.sin(a) * 0.06 - Math.cos(a) * s * 0.012, Math.cos(a) * 0.06 - Math.sin(a) * s * 0.012, 0, 0, 0, a + s * 0.85));
    }
    b.lit("foreL", ...hang(grp(mini, 0, 0.16, 0), L.inv, HAND));
  },
  // Kaelen modelado no Blender (M2-11; tools/blender/kaelen.py, brief em docs/briefs/kaelen.md): duelista esguio de cabelo branco
  // revolto com uma mecha sobre o olho, casaco azul-marinho com debrum dourado e placas azul-claras, lenço vermelho e capa caída do
  // lado direito com forro vermelho. Sem espada (usuário, 2026-11-26): mão direita aberta à frente, e por código só o raio sobre a
  // palma (núcleo claro e arcos finos em zigue-zague; peça acesa grande vira borrão com o bloom). Medidas e pose iguais às do script.
  kaelen: (b) => {
    const CYAN = new THREE.Color(0x7feaff), CORE = new THREE.Color(0xf2fdff), HAND = 0.31;
    b.bulk = 0.92; b.style = "swing"; b.rough = 0.7; b.glowColor = 0x7feaff;
    b.lean = 0.03; b.crouch = 0.08; b.armOut = 0.13;
    b.poseR = [-0.25, -1.15, 0, -0.15]; b.poseL = [0.08, -0.3];
    b.dims = { hipY: 0.95, headY: 0.58, shoulderY: 0.46, shoulderX: 0.27, arm: 0.33, hipX: 0.12, thigh: 0.44 };
    addModel(b, "kaelen");
    // raio sobre a palma, na vertical do mundo: núcleo pequeno e seis arcos que saem dele para cima e para os lados
    const R = restArm(b, 1, HAND);
    const core = new THREE.Vector3(0, 0.12, 0.02);
    const spark: G[] = [at(stud(0.055, 0xf2fdff, 0xf2fdff), core.x, core.y, core.z)];
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + 0.3;
      const dir = new THREE.Vector3(Math.cos(a) * 0.75, 0.55 + 0.35 * (i % 2), Math.sin(a) * 0.75).normalize();
      const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0.3)).normalize();
      const len = 0.24 + (i % 3) * 0.08;
      spark.push(tubeMesh(4, 8, (t, o) => {
        const zig = (Math.abs(((t * 3.5 + i * 0.37) % 1) - 0.5) - 0.25) * 0.16 * Math.sin(Math.min(1, t) * Math.PI);
        o.copy(core).addScaledVector(dir, t * len).addScaledVector(side, zig);
      }, (t) => 0.019 * (1 - 0.7 * t), (_a, t, c) => c.copy(CORE).lerp(CYAN, ss(0.1, 0.6, t)), new THREE.Vector3(0.2, 0.3, 1)));
    }
    b.lit("foreR", ...hang(spark, R.inv, HAND));
  },
  // Aurelius modelado no Blender (M2-11; tools/blender/aurelius.py, brief em docs/briefs/aurelius.md): mago velho de manto roxo,
  // chapéu pontudo reto, barba até a cintura e grimório no quadril. Medidas e pose iguais às do script (tests/models.test.ts
  // confere). Por código só o orbe arcano (casca de pedra rachada, núcleo aceso e estilhaços) sobre a mão direita erguida.
  aurelius: (b) => {
    const CORE = 0xc050ff, CORE_D = 0x7018e0, SHARD = 0xc070ff, SHARD_D = 0x6a18c8, HAND = 0.31; // brilho pela cor do vértice
    b.form = "robed"; b.bulk = 1; b.style = "cast"; b.rough = 0.8; b.glowColor = 0xc890ff; b.glowByVertex = true;
    b.lean = 0.16; b.armOut = 0.16;
    b.poseR = [-0.85, -1.75]; b.poseL = [0.1, -0.6]; // mão direita aberta na altura do ombro, palma para cima (sprite)
    b.dims = { hipY: 0.92, headY: 0.56, shoulderY: 0.45, shoulderX: 0.27, arm: 0.33, hipX: 0, thigh: 0.42 };
    addModel(b, "aurelius");
    // orbe arcano solto sobre a palma erguida, na vertical do mundo (referência do usuário): esfera de pedra rachada com o núcleo
    // roxo vazando pelas frestas e por um rombo na frente, e estilhaços de cristal aceso soltos em volta
    const R = restArm(b, 1, HAND), Y = 0.24, OR = 0.13;
    b.flat("foreR", ...hang([at(crackedOrb(OR, 0x3e3650, 0x7a7090, new THREE.Vector3(0.35, 0.05, 0.94).normalize()), 0, Y, 0)], R.inv, HAND));
    const shard = (r: number, x: number, y: number, z: number, rx: number, rz: number): G =>
      at(paintY(prepFlat(new THREE.TetrahedronGeometry(r)), SHARD_D, SHARD, r), x, Y + y, z, rx, 0.4, rz, 1, 1.8, 0.8);
    b.lit("foreR", ...hang([
      at(stud(OR * 0.94, CORE, CORE_D, 1, 1, 1, 2), 0, Y, 0),
      shard(0.034, 0.17, 0.12, 0.04, 0.3, -0.6), shard(0.026, -0.16, 0.14, 0.06, -0.4, 0.7), shard(0.03, 0.05, 0.2, -0.1, 0.9, 0.2),
      shard(0.02, -0.19, -0.02, 0.1, 0.2, 1.2), shard(0.022, 0.2, -0.04, -0.06, -0.8, -1.1), shard(0.016, -0.06, 0.24, 0.08, 0.5, -0.3),
    ], R.inv, HAND));
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
  // Zephyr modelado no Blender (M2-11; tools/blender/zephyr.py, brief em docs/briefs/zephyr.md): pistoleiro velho de chapéu de aba
  // larga e barba branca, poncho verde-azulado com faixa ciano e zigue-zague, comprido atrás, e um revólver em cada mão. Os dois
  // atiram (usuário, 2026-11-26): estilo "dual" alterna o braço a cada tiro, e o tiro sai do lado da mão (HeroDef.gunSide).
  // Medidas e pose iguais às do script. O clarão do cano fica para o M5-09 (ponta do cano no antebraço: 0, -0.67, 0.042).
  zephyr: (b) => {
    b.bulk = 1; b.style = "dual"; b.rough = 0.78; b.glowColor = 0xffe9a8;
    b.lean = 0.02; b.crouch = 0.1; b.armOut = 0.12;
    b.poseR = [-1.4, -0.12]; b.poseL = [0.12, -0.7];
    b.dims = { hipY: 0.95, headY: 0.58, shoulderY: 0.46, shoulderX: 0.29, arm: 0.33, hipX: 0.14, thigh: 0.44 };
    addModel(b, "zephyr");
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
  // Seraph modelado no Blender (M2-11; tools/blender/seraph.py, brief em docs/briefs/seraph.md): paladino de placa branca com
  // debrum dourado, elmo fechado com asas, lenço e tabardo azuis, capa azul, espada erguida e escudo grande. Medidas e pose iguais
  // às do script; o escudo também existe sozinho em models/seraph_shield.json (para o arremesso do M5-09).
  seraph: (b) => {
    b.bulk = 1.1; b.style = "throwL"; b.rough = 0.45; b.glowColor = GOLD;
    b.lean = 0.04; b.crouch = 0.1; b.armOut = 0.16;
    b.poseR = [0.2, -1.8]; b.poseL = [-0.45, -1.15];
    b.dims = { hipY: 0.95, headY: 0.6, shoulderY: 0.48, shoulderX: 0.31, arm: 0.34, hipX: 0.14, thigh: 0.44 };
    addModel(b, "seraph");
  },
  // Vesper modelada no Blender (M2-11; tools/blender/vesper.py, brief em docs/briefs/vesper.md): bruxa-vespa curvada de manto escuro,
  // capuz listrado com antenas, asas, abdômen de vespa atrás e cajado com caveira. Medidas e pose iguais às do script
  // (tests/models.test.ts confere). Por código só o brilho verde de veneno nas órbitas da caveira.
  vesper: (b) => {
    const EYE = 0xc8f25a, HAND = 0.3;
    const SKULL_Y = 0.66 + 0.16, SKULL_S = 1.85; // STAFF_TOP + SKULL_UP e SKULL_S no script
    b.form = "robed"; b.bulk = 1; b.style = "cast"; b.rough = 0.8; b.glowColor = EYE;
    b.lean = 0.28; b.armOut = 0.16;
    b.poseR = [-0.75, -0.8]; b.poseL = [-0.35, -0.75];
    b.dims = { hipY: 0.84, headY: 0.55, shoulderY: 0.44, shoulderX: 0.24, arm: 0.31, hipX: 0, thigh: 0.42 };
    addModel(b, "vesper");
    // brasa verde no fundo de cada órbita da caveira (a caveira olha para a frente do mundo, no topo do cajado em pé)
    const R = restArm(b, 1, HAND);
    b.lit("foreR", ...hang([-1, 1].map((s) => at(stud(0.011 * SKULL_S, EYE, EYE, 1.1, 0.9, 0.5, 0), s * 0.026 * SKULL_S, SKULL_Y, 0.074 * SKULL_S)), R.inv, HAND));
  },
  // Abelha da Ninhada (técnica da Vesper), modelada no Blender (tools/blender/bee.py, M2-11): aliada pequena que voa (forma `bat`:
  // corpo no hips e duas asas que batem). Listras do abdômen em gomos de uma cor só, para o corte sair nítido.
  bee: (b) => {
    b.form = "bat"; b.scale = 0.5; b.style = "bite"; b.rough = 0.6; b.glowColor = 0xc8f25a;
    addModel(b, "bee");
  },
};
