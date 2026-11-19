# Bloodfang (chefe: tigre-homem vermelho com caveira no ombro) modelado no Blender (M1-06). Brief: docs/briefs/bloodfang.md.
# Rodar: ver tools/blender/README.md. O facão fica por código (bloodfangKnife em cast-bosses.ts).
# Pivôs iguais a b.dims da receita "bloodfang"; o osso tail sai do quadril, atrás (build.ts: (0, 0, -0.16 * bulk)).
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from mathutils import Euler, Matrix, Vector  # noqa: E402
import bmesh  # noqa: E402
from humanoid import Rig, finish, merge, place_head  # noqa: E402

BULK = 1.6
RIG = Rig(hipY=0.8, headY=0.7, shoulderY=0.56, shoulderX=0.56, arm=0.42, hipX=0.2, thigh=0.36, bulk=BULK)
RIG.p3["tail"] = (0, 0.8, -0.16 * BULK)
RIG.piv["tail"] = B(RIG.p3["tail"])

FOOT_TILT, FOOT_LIFT = 0.2, 0.06
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

RED, RED_D, RED_L = hexc(0xd8301e), hexc(0x7e1412), hexc(0xee5a3c)
CREAM, CREAM_D = hexc(0xf6ecd8), hexc(0xbfa888)
DARK, MOUTH, TONGUE = hexc(0x160b0d), hexc(0x4e0a12), hexc(0xd8566a)
COWL, COWL_D, COWL_L = hexc(0x5a6884), hexc(0x2a3448), hexc(0x8494b0)
HIDE, HIDE_D = hexc(0x5e3a22), hexc(0x2e1a0e)
BONE, BONE_D = hexc(0xe6d8b8), hexc(0x9c8862)
CLAW, EYE, GOLD = hexc(0xf0e6d0), hexc(0xffd23a), hexc(0xd8a838)


def red(co, n):
    c = mix(RED_D, RED, 0.3 + 0.7 * ss(-0.8, 0.4, n.z))
    return mix(c, RED_L, 0.35 * ss(0.4, 1.0, n.z))


def shade(base, dark, lo=-0.7, hi=0.5):
    return lambda co, n: mix(dark, base, 0.35 + 0.65 * ss(lo, hi, n.z))


def stripe(name, obj, center, pts, r, color=DARK):
    """listra deitada na superfície de obj: cada ponto é (yaw, pitch) visto de center (yaw 0 = frente, -y; + para +x);
    o raio vem de fora para dentro. Fita em losango achatado, rente à pele, afinando nas pontas."""
    c = Vector(center)
    hits = []
    for yaw, pitch in pts:
        d = Vector((math.sin(yaw) * math.cos(pitch), -math.cos(yaw) * math.cos(pitch), math.sin(pitch)))
        ok, hit, n, _ = obj.ray_cast(c + d * 3.0, -d)
        if ok:
            hits.append((hit, n.normalized()))
    if len(hits) < 2:
        return None
    k = len(hits)
    bm = bmesh.new()
    rings = []
    for i, (p, n) in enumerate(hits):
        t = (hits[min(i + 1, k - 1)][0] - hits[max(i - 1, 0)][0]).normalized()
        w = t.cross(n).normalized()
        rr = r * (0.2 + 0.8 * math.sin(math.pi * (0.08 + 0.84 * i / (k - 1))))
        base = p + n * 0.004
        rings.append([bm.verts.new(base + w * rr), bm.verts.new(base + n * 0.006), bm.verts.new(base - w * rr), bm.verts.new(base - n * 0.006)])
    for i in range(k - 1):
        for j in range(4):
            bm.faces.new((rings[i][j], rings[i][(j + 1) % 4], rings[i + 1][(j + 1) % 4], rings[i + 1][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_mesh(name, bm)
    paint(o, lambda co, nn: color)
    return o


def arc(a0, a1, p0, p1, n=6):
    return [(a0 + (a1 - a0) * i / (n - 1), p0 + (p1 - p0) * i / (n - 1)) for i in range(n)]


def ring_band(name, c, rx, ry, z0, z1, color, seg=20):
    """faixa cilíndrica elíptica deitada (cinto, braçadeira)"""
    t = tube(name, [(c[0], c[1], z0), (c[0], c[1], z1)], [1.0, 1.0], seg=seg)
    t.data.transform(Matrix.Translation((c[0], c[1], 0)) @ Matrix.Diagonal((rx, ry, 1, 1)) @ Matrix.Translation((-c[0], -c[1], 0)))
    paint(t, color)
    return t


def bone_piece(name, a, b, r):
    """osso pequeno: haste com dois nós em cada ponta"""
    a, b = Vector(a), Vector(b)
    d = (b - a).normalized()
    side = d.cross(Vector((0, 0, 1)))
    if side.length < 0.1:
        side = d.cross(Vector((0, 1, 0)))
    side = side.normalized() * r * 0.8
    o = meta(name, [CAP(a, b, r * 0.55), EL(a + side, (r, r, r)), EL(a - side, (r, r, r)),
                    EL(b + side, (r, r, r)), EL(b - side, (r, r, r))], res=0.006)
    smooth(o, iters=1, target=120)
    paint(o, shade(BONE, BONE_D))
    return o


# ------------------------------------------------------------------ cabeça de tigre (centro na origem, frente em -y)
def head():
    parts = {"solid": [], "flat": [], "lit": []}
    h = meta("head", [
        # cabeça estreita e comprida, em cunha (a 1ª versão, redonda e de bochechas grandes, parecia um lobinho amigável)
        EL((0, 0.03, 0.03), (0.18, 0.2, 0.17)),                     # crânio
        EL((0, -0.1, 0.09), (0.14, 0.13, 0.08)),                    # testa baixa
        EL((0, -0.25, -0.02), (0.105, 0.16, 0.08)),                 # focinho longo
        EL((0, -0.36, 0.0), (0.065, 0.06, 0.055)),                  # ponte do nariz
        EL((-0.13, -0.1, -0.06), (0.075, 0.09, 0.085)),             # maçãs magras
        EL((0.13, -0.1, -0.06), (0.075, 0.09, 0.085)),
        CAP((-0.16, -0.15, 0.11), (-0.02, -0.27, 0.045), 0.045, stiff=1.6),   # arcada pesada em V, baixa sobre os olhos
        CAP((0.16, -0.15, 0.11), (0.02, -0.27, 0.045), 0.045, stiff=1.6),
        CAP((-0.035, -0.3, 0.06), (-0.03, -0.38, 0.03), 0.02, stiff=1.6),     # rugas do rosnado no focinho
        CAP((0.035, -0.3, 0.06), (0.03, -0.38, 0.03), 0.02, stiff=1.6),
        EL((-0.085, -0.22, 0.03), (0.05, 0.04, 0.03), neg=True),           # órbitas fundas
        EL((0.085, -0.22, 0.03), (0.05, 0.04, 0.03), neg=True),
        EL((0, -0.24, -0.12), (0.11, 0.12, 0.05), neg=True),               # boca aberta: céu da boca reto
    ], res=0.0075)
    smooth(h, iters=2, factor=0.5, target=1100)

    def tint(co, n):
        ax = abs(co.x)
        c = mix(RED_D, RED, 0.45 + 0.55 * ss(-0.6, 0.5, n.z))
        cream = (co.y < -0.22 and co.z < -0.04) or (ax > 0.12 and co.z < -0.06 and co.y < 0.0) or (co.z < -0.11 and co.y < 0.0)
        if cream:
            c = mix(CREAM_D, CREAM, 0.5 + 0.5 * ss(-0.6, 0.6, n.z))
        if co.y < -0.38 and co.z > -0.03 and ax < 0.045 - 0.4 * max(0.0, 0.02 - co.z) and n.y < -0.2:
            c = DARK   # nariz em triângulo
        if co.y < -0.2 and -0.09 < co.z < -0.02 and 0.035 < ax < 0.1:
            c = mix(CREAM, CREAM_D, 0.25)   # almofada dos bigodes
        # máscara escura em volta dos olhos, puxada para trás em ponta: olhar de predador
        dx, dz = ax - 0.09, co.z - 0.035
        if co.y < -0.12 and (dx / 0.075) ** 2 + (dz / 0.04) ** 2 < 1.0 and n.y < -0.1:
            c = DARK
        if co.y < -0.08 and 0.1 < ax < 0.19 and abs(co.z - 0.05 - (ax - 0.1) * 0.6) < 0.018:
            c = DARK
        return c
    paint(h, tint)
    parts["solid"].append(h)
    # mandíbula caída, creme por baixo
    jaw = meta("jaw", [EL((0, -0.16, -0.17), (0.11, 0.15, 0.045)), EL((0, -0.05, -0.14), (0.12, 0.08, 0.06))], res=0.007)
    jaw.data.transform(Matrix.Translation((0, -0.02, -0.12)) @ Matrix.Rotation(0.32, 4, "X") @ Matrix.Translation((0, 0.02, 0.12)))
    smooth(jaw, iters=1, target=300)
    paint(jaw, lambda co, n: mix(CREAM_D, CREAM, 0.4 + 0.6 * ss(-0.6, 0.8, n.z)) if n.z < 0.3 else mix(RED_D, RED, 0.6))
    parts["solid"].append(jaw)
    mouth = ball("mouth", (0, -0.19, -0.135), (0.095, 0.13, 0.045), rot=(0.15, 0, 0), seg=(14, 8))
    paint(mouth, lambda co, n: MOUTH)
    parts["flat"].append(mouth)
    tongue = ball("tongue", (0, -0.2, -0.165), (0.06, 0.1, 0.02), rot=(0.32, 0, 0), seg=(10, 6))
    paint(tongue, lambda co, n: mix(hexc(0x8a2a3a), TONGUE, ss(-0.2, 0.8, n.z)))
    parts["flat"].append(tongue)
    for s in (-1, 1):
        # presas: as de cima grandes, as de baixo subindo da mandíbula
        f = cone("fang", (s * 0.07, -0.3, -0.09), (s * 0.065, -0.31, -0.2), 0.022, seg=6)
        smooth(f)
        paint(f, lambda co, n: mix(CREAM_D, CREAM, ss(-0.2, -0.1, co.z)))
        parts["solid"].append(f)
        f2 = cone("fang", (s * 0.06, -0.27, -0.22), (s * 0.058, -0.285, -0.15), 0.017, seg=6)
        paint(f2, lambda co, n: CREAM)
        parts["solid"].append(f2)
        for x in (0.02, 0.04):
            t = cone("tooth", (s * x, -0.33, -0.1), (s * x, -0.33, -0.135), 0.009, seg=4)
            paint(t, lambda co, n: CREAM)
            parts["flat"].append(t)
        # olho amarelo aceso, fendido e inclinado (carranca)
        # olho aceso em fenda, sem pupila, inclinado para dentro e para baixo, fundo sob a arcada
        e = ball("eye", (s * 0.085, -0.25, 0.032), (0.046, 0.012, 0.016), rot=(0, -s * 0.4, 0), seg=(10, 6))
        paint(e, lambda co, n: EYE)
        parts["lit"].append(e)
        # orelha redonda, para trás
        ear = meta("ear", [EL((s * 0.15, 0.07, 0.18), (0.055, 0.024, 0.045), rot=(0.5, 0, -s * 0.55)),
                           EL((s * 0.165, 0.08, 0.225), (0.032, 0.02, 0.035), rot=(0.5, 0, -s * 0.55))], res=0.006)
        smooth(ear, target=90)
        paint(ear, lambda co, n: DARK if n.y > 0.3 else mix(RED_D, RED, 0.7))
        parts["solid"].append(ear)
        inner = ball("ear_in", (s * 0.148, 0.048, 0.19), (0.028, 0.008, 0.034), rot=(0.4, 0, -s * 0.5), seg=(8, 5))
        paint(inner, lambda co, n: CREAM)
        parts["flat"].append(inner)
        # suíças creme em pontas nas bochechas
        for k in range(4):
            a = -0.5 + 0.38 * k
            base = (s * 0.2, -0.08 + 0.02 * k, -0.04 + 0.06 * math.sin(a))
            tip = (s * (0.33 - 0.02 * abs(k - 1.5)), -0.02 + 0.03 * k, -0.04 + 0.16 * math.sin(a) - 0.05)
            tuft = cone("tuft", base, tip, 0.045, seg=5)
            smooth(tuft)
            paint(tuft, lambda co, n: mix(CREAM_D, CREAM, 0.5 + 0.5 * n.z))
            parts["solid"].append(tuft)
    # listras pretas: testa, lados do rosto, em volta dos olhos
    C = (0, 0.0, 0.02)
    # testa: listras em leque descendo para o meio dos olhos; lados: listras grossas saindo dos olhos para trás
    lines = [arc(0.0, 0.0, 1.2, 0.55, 6), arc(-0.12, -0.06, 1.1, 0.55, 5), arc(0.12, 0.06, 1.1, 0.55, 5),
             arc(-0.26, -0.18, 1.0, 0.6, 5), arc(0.26, 0.18, 1.0, 0.6, 5)]
    for s in (-1, 1):
        lines += [arc(s * 0.75, s * 1.25, 0.35, 0.3, 5), arc(s * 0.85, s * 1.45, 0.2, 0.05, 5), arc(s * 1.05, s * 1.7, 0.05, -0.15, 5),
                  arc(s * 1.5, s * 2.0, 0.55, 0.25, 5), arc(s * 2.0, s * 2.4, 0.75, 0.3, 5), arc(s * 0.5, s * 0.75, 0.8, 0.5, 4)]
    for pts in lines:
        st = stripe("hstripe", h, C, pts, 0.026)
        if st:
            parts["flat"].append(st)
    for s in (-1, 1):   # traços nas bochechas creme
        st = stripe("hstripe", h, (0, -0.08, -0.04), arc(s * 1.05, s * 1.35, -0.1, -0.3, 4), 0.016)
        if st:
            parts["flat"].append(st)
    return parts


# ------------------------------------------------------------------ caveira (centro na origem, frente em -y)
def skull():
    s = meta("skull", [
        EL((0, 0.03, 0.04), (0.17, 0.19, 0.16)),
        EL((0, -0.12, -0.07), (0.12, 0.09, 0.08)),
        EL((-0.1, -0.12, -0.04), (0.05, 0.05, 0.04)), EL((0.1, -0.12, -0.04), (0.05, 0.05, 0.04)),
        EL((-0.068, -0.18, -0.0), (0.055, 0.06, 0.05), neg=True), EL((0.068, -0.18, -0.0), (0.055, 0.06, 0.05), neg=True),
        EL((0, -0.21, -0.085), (0.022, 0.04, 0.035), neg=True),
    ], res=0.006)
    smooth(s, iters=1, target=450)
    paint(s, lambda co, n: mix(BONE_D, hexc(0xdcc8a0), 0.3 + 0.7 * ss(-0.7, 0.6, n.z)))
    out = {"solid": [s], "flat": []}
    for x in (-0.068, 0.068):
        d = ball("socket", (x, -0.15, 0.0), (0.045, 0.02, 0.042), seg=(10, 6))
        paint(d, lambda co, n: DARK)
        out["flat"].append(d)
    nz = ball("nasal", (0, -0.19, -0.085), (0.02, 0.01, 0.03), seg=(6, 4))
    paint(nz, lambda co, n: DARK)
    out["flat"].append(nz)
    for i in range(-2, 3):
        t = ball("tooth", (i * 0.032, -0.19, -0.145), (0.016, 0.014, 0.024), seg=(6, 4))
        paint(t, lambda co, n: mix(BONE_D, CREAM, 0.6 + 0.4 * n.z))
        out["solid"].append(t)
    return out


# ------------------------------------------------------------------ tronco, gola e caveira
def torso():
    z0 = RIG.P("torso")[2]
    t = meta("torso", [
        EL((0, 0.0, z0 + 0.04), (0.25, 0.19, 0.12)),                # cintura fina
        EL((0, -0.03, z0 + 0.2), (0.29, 0.21, 0.16)),               # abdômen
        EL((-0.3, 0.04, z0 + 0.33), (0.14, 0.16, 0.2)),             # dorsais: V
        EL((0.3, 0.04, z0 + 0.33), (0.14, 0.16, 0.2)),
        EL((0, 0.0, z0 + 0.45), (0.44, 0.27, 0.2)),                 # peito enorme
        EL((-0.17, -0.2, z0 + 0.47), (0.17, 0.1, 0.11), stiff=3.0),  # peitorais
        EL((0.17, -0.2, z0 + 0.47), (0.17, 0.1, 0.11), stiff=3.0),
        EL((-0.08, -0.19, z0 + 0.24), (0.075, 0.06, 0.06), stiff=3.0),  # gomos do abdômen
        EL((0.08, -0.19, z0 + 0.24), (0.075, 0.06, 0.06), stiff=3.0),
        EL((-0.08, -0.18, z0 + 0.13), (0.07, 0.055, 0.05), stiff=3.0),
        EL((0.08, -0.18, z0 + 0.13), (0.07, 0.055, 0.05), stiff=3.0),
        EL((0, 0.12, z0 + 0.52), (0.36, 0.16, 0.18)),               # costas
        EL((0, 0.06, z0 + 0.62), (0.3, 0.17, 0.12)),                # trapézio alto
        CAP((0, -0.04, z0 + 0.6), (0, -0.15, z0 + 0.72), 0.14),     # pescoço grosso para a frente
    ], res=0.014)
    smooth(t, iters=1, target=1100)

    def tint(co, n):
        c = red(co, n)
        if n.y < -0.4 and co.z < z0 + 0.32 and abs(co.x) < 0.16:
            c = mix(c, RED_L, 0.25)
        return c
    paint(t, tint)
    solid, flat = [t], []
    # listras: lados (das costas para a frente), costas em V, abdômen
    C = (0, 0.03, z0 + 0.3)
    for s in (-1, 1):
        for k, (p0, p1) in enumerate(((0.55, 0.35), (0.3, 0.1), (0.05, -0.15), (-0.2, -0.4))):
            st = stripe("tstripe", t, C, arc(s * (2.7 - 0.05 * k), s * (1.1 + 0.08 * k), p0, p1 - 0.08, 9), 0.034)
            if st:
                flat.append(st)
        for k, z in enumerate((z0 + 0.5, z0 + 0.36)):
            st = stripe("tstripe", t, (0, 0.0, z), arc(s * 2.95, s * 2.0, 0.14, -0.18, 7), 0.032)
            if st:
                flat.append(st)
        for a0, p0, p1 in ((1.05, 0.62, 0.42), (1.1, 0.25, 0.08), (1.15, -0.05, -0.22)):
            st = stripe("tstripe", t, (0, 0.0, z0 + 0.3), arc(s * a0, s * (a0 - 0.5), p0, p1, 6), 0.03)
            if st:
                flat.append(st)
    # gola azul-acinzentada em volta do pescoço, caída na frente
    els = []
    for i in range(16):
        a = 2 * math.pi * i / 16
        front = max(0.0, -math.cos(a))
        els.append(EL((math.sin(a) * 0.36, math.cos(a) * 0.27 + 0.03, z0 + 0.62 - 0.08 * front), (0.085, 0.085, 0.06)))
    els += [EL((0.44, 0.02, z0 + 0.6), (0.17, 0.2, 0.1)), EL((0.52, 0.1, z0 + 0.66), (0.1, 0.12, 0.12))]   # ninho da caveira
    cowl = meta("cowl", els, res=0.012)
    smooth(cowl, iters=1, target=320)
    paint(cowl, lambda co, n: mix(COWL_D, mix(COWL, COWL_L, 0.3 * ss(0.5, 1.0, n.z)), 0.3 + 0.7 * ss(-0.6, 0.6, n.z)))
    solid.append(cowl)
    # ossos pendurados na frente da gola
    for i in range(-2, 3):
        a = i * 0.42
        x, y, z = math.sin(a) * 0.4, -math.cos(a) * 0.3 + 0.03, z0 + 0.52 - abs(i) * 0.01
        solid.append(bone_piece("collarbone", (x, y, z + 0.06), (x * 1.04, y * 1.04 - 0.02, z - 0.08), 0.026))
    solid.append(bone_piece("chestbone", (-0.16, -0.31, z0 + 0.43), (0.12, -0.32, z0 + 0.5), 0.03))   # osso atravessado no peito
    # caveira enorme no ombro direito, virada para fora
    sk = skull()
    m = Matrix.Translation((0.5, -0.02, z0 + 0.7)) @ Euler((-0.05, 0.2, 0.4)).to_matrix().to_4x4() @ Matrix.Diagonal((1.08, 1.08, 1.08, 1))
    for o in sk["solid"] + sk["flat"]:
        o.data.transform(m)
        o.data.update()
    solid += sk["solid"]
    flat += sk["flat"]
    return {"torso": solid, "torso@flat": flat}


# ------------------------------------------------------------------ quadril: pelo, cinto, tanga com estrela
def star(name, c, r0, r1, depth=0.012, n=5, rot=0.0):
    bm = bmesh.new()
    vs = []
    for i in range(n * 2):
        r = r0 if i % 2 == 0 else r1
        a = math.pi * i / n + rot
        vs.append(bm.verts.new((c[0] + math.sin(a) * r, c[1], c[2] + math.cos(a) * r)))
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, vec=(0, -depth, 0), verts=[v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_mesh(name, bm)
    paint(o, lambda co, n: mix(CREAM_D, CREAM, 0.5 + 0.5 * ss(-0.5, 0.5, n.z)))
    return o


def hips():
    z = RIG.P("hips")[2]
    p = meta("hips", [EL((0, 0.0, z - 0.0), (0.3, 0.24, 0.17)), EL((0, 0.06, z - 0.08), (0.26, 0.2, 0.12))], res=0.012)
    smooth(p, iters=1, target=200)
    paint(p, red)
    belt = ring_band("belt", (0, 0.0), 0.315, 0.245, z + 0.06, z + 0.15, lambda co, n: mix(HIDE_D, HIDE, 0.35 + 0.55 * ss(-0.6, 0.6, n.z)))
    parts = [p, belt]
    for i in range(12):
        a = 2 * math.pi * i / 12 + 0.26
        st = ball("stud", (math.sin(a) * 0.32, -math.cos(a) * 0.25, z + 0.105), (0.022, 0.022, 0.022), seg=(6, 4))
        paint(st, shade(CREAM, CREAM_D))
        parts.append(st)
    buckle = tube("buckle", [(0, -0.24, z + 0.105), (0, -0.28, z + 0.105)], [0.07, 0.065], seg=16)
    smooth(buckle)
    paint(buckle, lambda co, n: mix(COWL_D, COWL_L, 0.3 + 0.6 * ss(-0.6, 0.6, n.z)))
    knob = ball("knob", (0, -0.285, z + 0.105), (0.035, 0.015, 0.035), seg=(10, 6))
    paint(knob, shade(GOLD, hexc(0x7a5a18)))
    parts += [buckle, knob]
    flat = []
    for y, sgn in ((-0.21, -1), (0.21, 1)):
        flap = meta("flap", [EL((0, y, z - 0.1), (0.14, 0.03, 0.14)), EL((0, y + sgn * 0.01, z - 0.26), (0.11, 0.03, 0.08))], res=0.008)
        smooth(flap, target=160)
        paint(flap, lambda co, n: mix(HIDE_D, HIDE, 0.35 + 0.5 * ss(-0.6, 0.6, n.z)))
        parts.append(flap)
    flat.append(star("star", (0, -0.245, z - 0.14), 0.06, 0.027))
    return {"hips": parts, "hips@flat": flat}


# ------------------------------------------------------------------ braços: deltoide, bíceps, antebraço com braçadeira, mãos
def limbs():
    out = {}
    for side in ("L", "R"):
        s = -1 if side == "L" else 1
        ax, _, az = RIG.P("arm" + side)
        up = meta("arm" + side, [EL((ax + s * 0.02, 0.0, az - 0.02), (0.2, 0.19, 0.18)),          # deltoide
                                 CAP((ax, 0, az - 0.05), (ax, 0, az - RIG.arm + 0.02), 0.12),
                                 EL((ax, -0.05, az - 0.2), (0.14, 0.13, 0.13)),                       # bíceps
                                 EL((ax + s * 0.02, 0.05, az - 0.18), (0.13, 0.13, 0.15))], res=0.012)  # tríceps
        smooth(up, iters=1, target=380)
        paint(up, red)
        aflat = []
        for zc, a0 in ((az - 0.1, 0.0), (az - 0.22, 0.15), (az - 0.33, 0.3)):
            st = stripe("astripe", up, (ax, 0.0, zc), arc(s * (0.1 + a0), s * (2.6 - a0), 0.3, -0.25, 9), 0.034)
            if st:
                aflat.append(st)
        fx, _, fz = RIG.P("fore" + side)
        fore = meta("fore" + side, [CAP((fx, 0, fz), (fx, -0.01, fz - 0.42), 0.09),
                                    EL((fx + s * 0.02, -0.01, fz - 0.13), (0.16, 0.15, 0.17)),            # antebraço largo
                                    EL((fx, -0.02, fz - 0.53), (0.13, 0.12, 0.11))], res=0.012)           # pata larga
        smooth(fore, iters=1, target=380)
        paint(fore, red)
        fsolid, fflat = [fore], []
        for zc, a0 in ((fz - 0.06, 0.0), (fz - 0.18, 0.2)):
            st = stripe("fstripe", fore, (fx, 0.0, zc), arc(s * (0.1 + a0), s * (2.7 - a0), 0.35, -0.15, 9), 0.036)
            if st:
                fflat.append(st)
        bracer = ring_band("bracer", (fx, -0.01), 0.155, 0.155, fz - 0.4, fz - 0.24,
                           lambda co, n: mix(COWL_D, COWL, 0.35 + 0.6 * ss(-0.6, 0.6, n.z)), seg=16)
        fsolid.append(bracer)
        for i in range(6):
            a = 2 * math.pi * i / 6
            st = ball("stud", (fx + math.sin(a) * 0.152, -0.01 - math.cos(a) * 0.152, fz - 0.31), (0.022, 0.022, 0.022), seg=(6, 4))
            paint(st, shade(CREAM, CREAM_D))
            fsolid.append(st)
        hz = fz - 0.52
        if side == "L":
            # mão aberta em garra: quatro dedos curvos para a frente e para baixo, polegar por dentro
            for i in range(4):
                x = fx + (i - 1.5) * 0.065
                pts = [(x, -0.07, hz - 0.03), (x, -0.13, hz - 0.08), (x, -0.16, hz - 0.15)]
                f = tube("finger", pts, [0.042, 0.037, 0.03], seg=8)
                smooth(f)
                paint(f, red)
                c = cone("claw", (x, -0.155, hz - 0.15), (x, -0.13, hz - 0.23), 0.02, seg=5)
                paint(c, lambda co, n: mix(CREAM_D, CLAW, 0.5 + 0.5 * n.z))
                fsolid += [f, c]
            th = tube("thumb", [(fx + 0.09, -0.05, hz), (fx + 0.12, -0.11, hz - 0.04)], [0.036, 0.03], seg=8)
            paint(th, red)
            c = cone("claw", (fx + 0.12, -0.115, hz - 0.04), (fx + 0.12, -0.17, hz - 0.1), 0.019, seg=5)
            paint(c, lambda co, n: CLAW)
            fsolid += [th, c]
        else:
            # punho fechado no cabo vertical: nós dos dedos empilhados na frente, garras curtas viradas para dentro
            for i in range(4):
                zz = hz + 0.07 - i * 0.05
                k = ball("knuckle", (fx + 0.02, -0.11, zz), (0.055, 0.05, 0.032), seg=(8, 6))
                paint(k, red)
                c = cone("claw", (fx - 0.01, -0.12, zz - 0.005), (fx - 0.05, -0.085, zz - 0.02), 0.014, seg=5)
                paint(c, lambda co, n: CLAW)
                fsolid += [k, c]
            th = tube("thumb", [(fx - 0.08, -0.05, hz + 0.04), (fx - 0.04, -0.11, hz + 0.08)], [0.036, 0.03], seg=8)
            paint(th, red)
            fsolid.append(th)
        out = merge(out, {"arm" + side: [up], "arm" + side + "@flat": aflat, "fore" + side: fsolid, "fore" + side + "@flat": fflat})
        # pernas: coxa grossa, canela, faixa no tornozelo, pata com três dedos e garras
        hx, _, hz0 = RIG.P("thigh" + side)
        th = meta("thigh" + side, [CAP((hx, 0, hz0), (hx, 0, hz0 - RIG.thigh + 0.02), 0.16),
                                   EL((hx + s * 0.02, -0.03, hz0 - 0.14), (0.2, 0.2, 0.21))], res=0.012)
        smooth(th, iters=1, target=300)
        paint(th, red)
        tflat = []
        for zc in (hz0 - 0.1, hz0 - 0.24):
            st = stripe("lstripe", th, (hx, 0.0, zc), arc(s * 0.2, s * 2.7, 0.25, -0.2, 9), 0.036)
            if st:
                tflat.append(st)
        kx, _, kz = RIG.P("shin" + side)
        sh = meta("shin" + side, [CAP((kx, 0, kz), (kx, 0.01, 0.2), 0.12),
                                  EL((kx, 0.04, kz - 0.12), (0.15, 0.15, 0.15))], res=0.01)
        smooth(sh, iters=1, target=240)
        paint(sh, red)
        paw = meta("paw", [EL((kx, -0.08, 0.06), (0.14, 0.19, 0.07)), EL((kx, 0.0, 0.11), (0.11, 0.1, 0.06))], res=0.01)
        smooth(paw, iters=1, target=120)
        paint(paw, red)
        ssolid, sflat = [sh], []
        foot = [paw]
        st = stripe("lstripe", sh, (kx, 0.0, kz - 0.1), arc(s * 0.4, s * 2.7, 0.2, -0.2, 9), 0.03)
        if st:
            sflat.append(st)
        wrap = ring_band("wrap", (kx, 0.0), 0.135, 0.135, 0.12, 0.22, lambda co, n: mix(COWL_D, COWL, 0.35 + 0.6 * ss(-0.6, 0.6, n.z)), seg=14)
        ssolid.append(wrap)
        for i in (-1, 0, 1):
            x = kx + i * 0.08
            toe = ball("toe", (x, -0.25, 0.045), (0.05, 0.065, 0.045), seg=(8, 6))
            paint(toe, red)
            c = cone("claw", (x, -0.305, 0.045), (x, -0.38, 0.0), 0.026, seg=5)
            paint(c, lambda co, n: mix(CREAM_D, CLAW, 0.5 + 0.5 * n.z))
            foot += [toe, c]
        # pata com a ponta erguida e a sola acima do chão: o agachamento (crouch) inclina a canela e baixaria os dedos para
        # dentro do terreno (M1-06, revisão do usuário)
        m = Matrix.Translation((0, 0, FOOT_LIFT)) @ Matrix.Translation((kx, 0, 0.1)) @ Matrix.Rotation(-FOOT_TILT, 4, "X") @ Matrix.Translation((-kx, 0, -0.1))
        for o in foot:
            o.data.transform(m)
            o.data.update()
        ssolid += foot
        out = merge(out, {"thigh" + side: [th], "thigh" + side + "@flat": tflat, "shin" + side: ssolid, "shin" + side + "@flat": sflat})
    return out


# ------------------------------------------------------------------ cauda anelada em S
def tail():
    px, py, pz = RIG.P("tail")
    rel = [(0, 0, 0), (0, 0.28, -0.2), (0, 0.46, -0.46), (0, 0.76, -0.54), (0, 1.0, -0.36), (0, 1.05, -0.1)]
    pts = [Vector((px + x, py + y, pz + z)) for x, y, z in rel]
    # amostra a curva para pintar anéis pelo comprimento
    dense = []
    for i in range(len(pts) - 1):
        for k in range(4):
            dense.append(pts[i].lerp(pts[i + 1], k / 4))
    dense.append(pts[-1])
    radii = [0.095 - 0.035 * i / (len(dense) - 1) for i in range(len(dense))]
    t = tube("tail", dense, radii, seg=10)
    smooth(t, iters=2)

    def tint(co, n):
        i = min(range(len(dense)), key=lambda j: (dense[j] - co).length)
        u = i / (len(dense) - 1)
        if u > 0.9 or (u > 0.2 and int(u * 12) % 2 == 1):
            return DARK
        return red(co, n)
    paint(t, tint)
    return {"tail": [t]}


if __name__ == "__main__":
    reset()
    parts = merge(place_head(RIG, head(), lift=-0.1, fwd=0.26, tilt=0.12, scale=1.15), torso(), hips(), limbs(), tail())
    finish("bloodfang", RIG, parts, ARGS, body_center=(0, 0, 0.9), body_dist=4.6, head_dist=1.6)
