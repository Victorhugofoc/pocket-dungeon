# Void Reaver (chefe do M10-09: espectro de máscara com duas lâminas) modelado no Blender. Brief: docs/briefs/void_reaver.md.
# Rodar: ver tools/blender/README.md. Grava art/void_reaver.blend e src/game/chars/models/void_reaver.json.
# Forma "djinn" (build.ts): tronco, cabeça e braços como os bípedes (pivôs de Rig, iguais a b.dims da receita); sem pernas.
# Tentáculos no osso skirt (arrastam ao andar), cabelo no cape (balança), lâminas nos antebraços (modeladas na orientação do
# mundo com a origem na mão e levadas ao repouso do osso por to_fore, como o escudo do shieldbearer.py).
# Blender: z para cima, frente em -y.
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from mathutils import Matrix, Vector  # noqa: E402
from humanoid import Rig, finish, merge, place_head, xform3  # noqa: E402
from robed import fore_rot  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
RIG = Rig(hipY=0.95, headY=0.58, shoulderY=0.5, shoulderX=0.46, arm=0.36, hipX=0.0, thigh=0.42, bulk=1.2)
HAND = 0.36
HEAD_LIFT, HEAD_SCALE = 0.17, 1.72
# poses iguais às da receita (cast-bosses.ts): braços cruzados na frente do peito
POSE_L, POSE_R, LEAN, OUT = (-0.55, -1.5, 0.0, -1.0), (-0.55, -1.6, 0.0, -1.15), 0.28, 0.2

BODY_K, BODY_D, BODY, BODY_L = hexc(0x120a1a), hexc(0x301c48), hexc(0x5a3a80), hexc(0x9c7ccc)
STAR, STAR_Y = hexc(0xe8e0ff), hexc(0xfff0c0)
BONE_L, BONE, BONE_M, BONE_D = hexc(0xfff8e8), hexc(0xf6e8cc), hexc(0xd2bc92), hexc(0x6a5440)
HOLLOW = hexc(0x0c0814)
EYE, EYE_L = hexc(0xff1040), hexc(0xc8185a)
HAIR_K, HAIR, HAIR_L = hexc(0x120e1a), hexc(0x2a2238), hexc(0x463c5c)
BLADE_L, BLADE, BLADE_D = hexc(0xfff0c8), hexc(0xe2cc96), hexc(0x9a8058)


def body_col(co, n):
    c = mix(BODY_K, BODY_D, ss(-0.9, -0.3, n.z - 0.3 * n.y))
    c = mix(c, BODY, ss(-0.4, 0.5, n.z - 0.3 * n.y))
    return mix(c, BODY_L, 0.5 * ss(0.55, 1.0, n.z - 0.2 * n.y))


def bone_col(co, n):
    c = mix(BONE_M, BONE, 0.35 + 0.65 * ss(-0.6, 0.5, n.z - 0.5 * n.y))
    return mix(c, BONE_L, 0.4 * ss(0.55, 1.0, n.z - 0.3 * n.y))


def sball(*a, **k):
    o = ball(*a, **k)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def catmull(pts, n):
    P = [Vector(p) for p in pts]
    P = [P[0] * 2 - P[1]] + P + [P[-1] * 2 - P[-2]]
    out = []
    for i in range(1, len(P) - 2):
        for k in range(n):
            t = k / n
            p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(P[-2])
    return out


def stars(obj, count, seed, size=0.008, where=None):
    """pontos claros acesos pousados na pele por raios a partir do centro da peça"""
    import random
    import mathutils.bvhtree as bvt
    rnd = random.Random(seed)
    tree = bvt.BVHTree.FromObject(obj, bpy.context.evaluated_depsgraph_get())
    vs = obj.data.vertices
    out = []
    tries = 0
    while len(out) < count and tries < count * 20:
        tries += 1
        v = vs[rnd.randrange(len(vs))]
        co = obj.matrix_world @ v.co
        if where and not where(co):
            continue
        nrm = v.normal
        hit, hn, _, _ = tree.ray_cast(co + nrm * 0.05, -nrm)
        if not hit:
            continue
        s = size * (0.4 + 0.9 * rnd.random() ** 2)
        b = ball("star", hit + hn * 0.002, (s, s, s * 0.5), rot=hn.to_track_quat("Z", "Y").to_euler(), seg=(6, 3))
        col = mix(hexc(0xc8b0ff), STAR_Y, rnd.random() ** 2) if rnd.random() < 0.7 else mix(BODY_L, STAR, 0.5)
        paint(b, lambda c, n, col=col: col)
        out.append(b)
    return out


# ------------------------------------------------------------------ cabeça: máscara de caveira comprida, olhos acesos
def head():
    parts = {"solid": [], "flat": [], "lit": []}
    h = meta("skull", [
        EL((0, 0.03, 0.02), (0.095, 0.11, 0.1)),                    # crânio
        EL((0, -0.05, -0.06), (0.078, 0.07, 0.14)),                 # máscara oval e alta
        EL((-0.055, -0.07, -0.04), (0.03, 0.03, 0.03)),             # maçãs
        EL((0.055, -0.07, -0.04), (0.03, 0.03, 0.03)),
        CAP((-0.05, -0.06, -0.17), (0.05, -0.06, -0.17), 0.03),      # maxilar
        CAP((0, -0.065, -0.18), (0, -0.09, -0.23), 0.028),          # queixo: focinho estreito embaixo
        EL((0, -0.1, 0.015), (0.045, 0.035, 0.042), neg=True),      # uma órbita grande no meio
        EL((-0.07, -0.06, -0.09), (0.02, 0.04, 0.03), neg=True),    # bochechas cavadas sob as maçãs
        EL((0.07, -0.06, -0.09), (0.02, 0.04, 0.03), neg=True),
        CAP((-0.06, -0.08, 0.06), (0.06, -0.08, 0.06), 0.018),       # arcada
    ], res=0.005)
    smooth(h, iters=2, factor=0.5, target=1400)

    def tint(co, n):
        c = bone_col(co, n)
        d = math.hypot(co.x, co.z - 0.015)
        c = mix(c, BONE_D, 0.6 * (1 - ss(0.04, 0.065, d)) * (co.y < -0.06))   # sombra em volta da órbita
        c = mix(c, BONE_D, 0.35 * ss(-0.08, -0.2, co.z))                      # queixo mais escuro embaixo
        # têmporas e bochechas cavadas: sombra dos lados da máscara e sob as maçãs
        c = mix(c, BONE_D, 0.55 * ss(0.55, 0.9, abs(n.x)) * ss(-0.12, 0.05, co.z))
        c = mix(c, BONE_D, 0.5 * (1 - ss(0.0, 0.018, abs(co.z + 0.085 + 0.25 * abs(co.x)))) * ss(0.03, 0.06, abs(co.x)) * (co.y < -0.04))
        # rachadura fina da testa até a órbita
        cx = 0.012 + 0.25 * (co.z - 0.06) ** 2 * 10
        c = mix(c, BONE_D, 0.8 * (1 - ss(0.0, 0.004, abs(co.x - cx))) * ss(0.045, 0.06, co.z) * (co.y < -0.05))
        return c
    paint(h, tint)
    parts["solid"].append(h)
    sock = sball("socket", (0, -0.1, 0.015), (0.05, 0.012, 0.046), seg=(14, 8))
    paint(sock, lambda co, n: HOLLOW)
    ring = sball("eyering", (0, -0.108, 0.015), (0.022, 0.007, 0.022), seg=(12, 8))
    paint(ring, lambda co, n: EYE_L)
    eye = sball("eye", (0, -0.113, 0.015), (0.016, 0.005, 0.016), seg=(10, 6))

    paint(eye, lambda co, n: EYE)
    parts["flat"].append(sock)
    parts["lit"] += [ring, eye]
    # boca: fenda fina e larga com dentes compridos em cima e embaixo
    mouth = tube("mouth", [(-0.052, -0.1, -0.12), (-0.026, -0.116, -0.124), (0, -0.121, -0.125), (0.026, -0.116, -0.124), (0.052, -0.1, -0.12)],
                 [0.008, 0.013, 0.014, 0.013, 0.008], seg=8, squash=(1.0, 0.45), ref=(0, 1, 0))
    paint(mouth, lambda co, n: HOLLOW)
    parts["flat"].append(mouth)
    for k in range(9):
        x = -0.044 + 0.011 * k
        y = -0.121 + 0.019 * (x / 0.05) ** 2
        for zz, d in ((-0.106, -1), (-0.142, 1)):
            t = cone("tooth", (x, y, zz), (x, y - 0.002, zz + d * 0.02), 0.0055, seg=5)
            paint(t, lambda co, n: BONE)
            parts["solid"].append(t)
    # couro cabeludo preto no alto e atrás (as mechas longas ficam no cape)
    sc = meta("scalp", [EL((0, 0.07, 0.03), (0.1, 0.08, 0.12)), EL((0, 0.09, -0.06), (0.09, 0.07, 0.09))], res=0.006)
    smooth(sc, iters=1, target=500)
    paint(sc, lambda co, n: mix(HAIR_K, HAIR_L, 0.6 * ss(0.4, 1.0, n.z - 0.2 * n.y)))
    parts["solid"].append(sc)
    neck = meta("neck", [CAP((0, 0.05, -0.14), (0, 0.07, -0.3), 0.05)], res=0.006)
    smooth(neck, target=200)
    paint(neck, body_col)
    parts["solid"].append(neck)
    return parts


# ------------------------------------------------------------------ tronco: magro, ombros largos, cintura fina, estrelas
def torso():
    z0 = RIG.P("torso")[2]
    sx = RIG.shoulderX
    els = [
        EL((0, 0.0, z0 + 0.0), (0.16, 0.12, 0.13)),                 # cintura fina
        EL((0, -0.02, z0 + 0.14), (0.18, 0.12, 0.13)),             # abdome
        EL((0, 0.0, z0 + 0.35), (0.33, 0.18, 0.17)),               # peito largo
        EL((-0.13, -0.13, z0 + 0.38), (0.12, 0.05, 0.08)),         # peitorais
        EL((0.13, -0.13, z0 + 0.38), (0.12, 0.05, 0.08)),
        EL((0, 0.1, z0 + 0.42), (0.27, 0.13, 0.16)),               # costas curvadas
        EL((0, 0.05, z0 + 0.53), (0.28, 0.13, 0.09)),              # trapézio
        EL((-sx + 0.08, 0.01, z0 + 0.48), (0.15, 0.11, 0.09)),       # ombros ossudos
        EL((sx - 0.08, 0.01, z0 + 0.48), (0.15, 0.11, 0.09)),
        EL((-0.1, -0.08, z0 + 0.2), (0.06, 0.05, 0.1)),            # costelas em relevo
        EL((0.1, -0.08, z0 + 0.2), (0.06, 0.05, 0.1)),
    ]
    t = meta("torso", els, res=0.009)
    smooth(t, iters=2, target=1600)

    def tint(co, n):
        c = body_col(co, n)
        if co.y < -0.08:   # sulcos entre as costelas e no meio do peito
            g = 0.5 * (1 - ss(0.0, 0.02, abs(co.x))) * ss(z0 + 0.05, z0 + 0.4, co.z)
            for zz in (z0 + 0.16, z0 + 0.21, z0 + 0.26):
                g = max(g, 0.45 * (1 - ss(0.0, 0.01, abs(co.z - zz - 0.05 * abs(co.x)))) * ss(0.04, 0.07, abs(co.x)) * (1 - ss(0.14, 0.18, abs(co.x))))
            c = mix(c, BODY_K, g)
        return c
    paint(t, tint)
    return {"torso": [t], "torso@lit": stars(t, 60, 11)}


# ------------------------------------------------------------------ braços longos e magros, garras fechadas nos cabos
def claw_hand(x, y, z, s):
    els = [EL((x, y, z), (0.034, 0.045, 0.05))]
    for dy in (-0.033, -0.011, 0.011, 0.033):   # dedos longos em garra em volta da base da lâmina
        els += [CAP((x, y + dy, z - 0.03), (x - s * 0.02, y + dy * 1.2, z - 0.08), 0.011, stiff=3.0),
                CAP((x - s * 0.02, y + dy * 1.2, z - 0.08), (x - s * 0.05, y + dy * 1.2, z - 0.1), 0.009, stiff=3.0)]
    els += [CAP((x - s * 0.01, y - 0.04, z), (x - s * 0.04, y - 0.06, z - 0.05), 0.011, stiff=3.0)]
    f = meta("hand", els, res=0.005)
    smooth(f, iters=1, target=380)
    paint(f, body_col)
    out = [f]
    for dy in (-0.033, -0.011, 0.011, 0.033):   # unhas de osso
        cl = cone("claw", (x - s * 0.05, y + dy * 1.2, z - 0.1), (x - s * 0.06, y + dy * 1.2 - 0.01, z - 0.135), 0.008, seg=5)
        paint(cl, bone_col)
        out.append(cl)
    return out


def arms():
    out = {}
    for side, s in (("L", -1), ("R", 1)):
        ax, ay, az = RIG.P("arm" + side)
        a = meta("arm" + side, [EL((ax - s * 0.01, ay, az + 0.0), (0.11, 0.1, 0.08)),
                                EL((ax + s * 0.01, ay, az - 0.08), (0.095, 0.09, 0.1)),
                                CAP((ax, ay, az - 0.03), (ax, ay, az - RIG.arm + 0.02), 0.058),
                                EL((ax, ay - 0.02, az - 0.18), (0.068, 0.07, 0.1))], res=0.006)
        smooth(a, iters=1, target=600)
        paint(a, body_col)
        fx, fy, fz = RIG.P("fore" + side)
        f = meta("fore" + side, [CAP((fx, fy, fz), (fx, fy, fz - HAND + 0.06), 0.054),
                                 EL((fx, fy, fz - 0.11), (0.078, 0.074, 0.12)),
                                 EL((fx, fy, fz - HAND + 0.08), (0.036, 0.04, 0.04))], res=0.006)
        smooth(f, iters=1, target=500)
        paint(f, body_col)
        hand = claw_hand(fx, fy, fz - HAND, s)
        blades = to_fore(blade(s), side, POSE_L if side == "L" else POSE_R)
        out["arm" + side] = [a] + stars(a, 8, 20 + s)
        out["fore" + side] = [f] + hand + blades
        out["fore" + side + "@lit"] = stars(f, 8, 30 + s)
    return out


def to_fore(objs, side, pose):
    """peças modeladas na orientação do mundo com a origem na mão vão para o repouso do osso do antebraço"""
    sgn = -1 if side == "L" else 1
    fr, _ = fore_rot(pose, sgn, LEAN, OUT)
    f3 = RIG.p3["fore" + side]
    m3 = Matrix.Translation((f3[0], f3[1] - HAND, f3[2])) @ fr.transposed().to_4x4()
    xform3(objs, m3)
    return objs


def blade(s):
    """lâmina de osso em crescente, na orientação do mundo, origem na mão: sobe para fora (para o lado de -s, onde a mão fica com
    os braços cruzados), curva por fora e a ponta volta para dentro; seção em lente grossa (não vira risco de perfil)"""
    L = 1.22
    up = Vector((-s * 1.0, -0.05, 1.0)).normalized()
    side = Vector((-s, 0, 0))
    side = (side - up * side.dot(up)).normalized()           # para fora, no plano da lâmina
    nrm = up.cross(side).normalized()                        # espessura
    rows = []
    N, M = 26, 14
    for i in range(N + 1):
        t = 1.0 * i / N
        bow = 0.16 * math.sin(math.pi * max(0.0, t)) - 0.13 * max(0.0, t) ** 4   # barriga para fora, ponta volta
        c = up * (L * t) + side * (bow * L * 0.55)
        w = max(0.004, 0.028 + 0.066 * math.sin(math.pi * min(1.0, t * 1.15) ** 0.8) * (1 - t ** 4))
        th = max(0.006, 0.3 * w)
        # largura cresce para dentro (gume côncavo do lado da cabeça), o dorso fica na curva de fora
        ring = []
        for j in range(M):
            a = 2 * math.pi * j / M
            u = math.cos(a)
            off = side * (u * w * (0.55 if u > 0 else 1.0) - w * 0.2) + nrm * (math.sin(a) * th * (1 - 0.6 * max(0.0, -u)))
            ring.append(tuple(c + off))
        rows.append(ring)
    bm = bmesh.new()
    grid = [[bm.verts.new(p) for p in row] for row in rows]
    for i in range(N):
        for j in range(M):
            k = (j + 1) % M
            bm.faces.new((grid[i][j], grid[i][k], grid[i + 1][k], grid[i + 1][j]))
    for row, p in ((grid[0], up * (L * -0.02)), (grid[-1], up * L + side * (-0.13 * L * 0.55))):
        cv = bm.verts.new(tuple(p))
        for j in range(M):
            bm.faces.new((row[j], row[(j + 1) % M], cv))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_mesh("blade", bm)
    for p in o.data.polygons:
        p.use_smooth = True

    def tint(co, n):
        v = Vector(co)
        t = v.dot(up) / L
        across = (v - up * v.dot(up)).dot(side)
        c = mix(BLADE_D, BLADE, 0.35 + 0.65 * ss(-0.6, 0.6, n.z - 0.4 * n.y))
        c = mix(c, BLADE_L, 0.6 * ss(0.4, 1.0, n.z - 0.2 * n.y))
        # gume de dentro mais claro, veio escuro junto ao cabo
        c = mix(c, BLADE_L, 0.5 * ss(0.0, -0.04, across) * ss(0.05, 0.2, t))
        c = mix(c, BLADE_D, 0.6 * (1 - ss(0.0, 0.25, t)))                     # só a base escurece
        return mix(c, BLADE_L, 0.35 * ss(0.6, 1.0, t))
    paint(o, tint)
    o["no_ao"] = True
    knob = sball("bladeroot", tuple(up * 0.03), (0.045, 0.045, 0.05), seg=(10, 7))
    paint(knob, lambda co, n: mix(BLADE_D, BLADE, 0.3 + 0.5 * ss(-0.5, 0.8, n.z)))
    return [o, knob]


# ------------------------------------------------------------------ tentáculos: da cintura até o chão, abrindo em leque
def ribbon(name, ctrl, r0, out_dir, flat=0.32, tip=0.9):
    pts = catmull(ctrl, 3)
    radii = [r0 * (1 - j / (len(pts) - 1)) ** tip + 0.003 for j in range(len(pts))]
    tb = tube(name, pts, radii, seg=6, squash=(1.0, flat), ref=tuple(out_dir))
    for p_ in tb.data.polygons:
        p_.use_smooth = True
    return tb


def skirt():
    """manto esfarrapado que se desfaz em tiras achatadas de ponta fina, abrindo para fora já na cintura; flutua (as pontas
    não chegam ao chão); dois ganchos curtos de cada lado do quadril"""
    zt = RIG.P("torso")[2]
    zh = RIG.P("hips")[2]
    core = meta("core", [EL((0, 0.0, zt - 0.02), (0.16, 0.12, 0.1)), EL((0, 0.0, zh - 0.08), (0.22, 0.19, 0.17)),
                         EL((0, 0.02, zh - 0.28), (0.28, 0.25, 0.14))], res=0.01)
    smooth(core, iters=1, target=700)
    paint(core, body_col)
    out = [core]
    import random
    rnd = random.Random(7)

    def rag(co, n):
        return mix(body_col(co, n), BODY_K, 0.7 * ss(zh - 0.25, 0.15, co.z))   # escurece até quase preto nas pontas

    for layer, (n, z0, reach0, drop0, r0) in enumerate(((20, zh - 0.28, 0.5, 0.42, 0.11), (16, zh - 0.12, 0.44, 0.38, 0.095),
                                                         (10, zh - 0.38, 0.34, 0.32, 0.1))):
        for k in range(n):
            a = 2 * math.pi * (k + 0.5 * layer + 0.35 * rnd.random()) / n
            d = Vector((math.sin(a), -math.cos(a), 0))
            perp = Vector((-d.y, d.x, 0))
            back = 1.0 + 0.5 * max(0.0, d.y)
            reach = reach0 * (0.7 + 0.6 * rnd.random()) * back
            drop = drop0 * (0.7 + 0.5 * rnd.random()) * back
            curl = (1 if rnd.random() < 0.5 else -1) * (0.05 + 0.07 * rnd.random())
            ctrl = []
            for i in range(5):
                u = i / 4
                rad = 0.2 + reach * u ** 1.3                  # desce e abre em leque rente ao chão no fim
                z = z0 - drop * (1 - (1 - u) ** 2.2) + 0.03 * u ** 4
                wob = curl * math.sin(u * math.pi * 1.2) + 0.03 * math.sin(u * 7 + k)
                p = d * rad + perp * wob
                ctrl.append((p.x, p.y, z))
            tb = ribbon("rag", ctrl, r0 * (0.8 + 0.4 * rnd.random()), d, tip=1.3)
            paint(tb, rag)
            out.append(tb)
    lit = stars(core, 24, 41)
    for tb in out[1:30]:
        lit += stars(tb, 2, 50 + len(lit), size=0.007)
    return {"skirt": out, "skirt@lit": lit}


# ------------------------------------------------------------------ cabelo (osso cape): mechas pretas longas voando para trás
def hair():
    """mechas que nascem atrás da máscara e abrem em leque para trás e para os dois lados (mais volume de um lado), pontudas"""
    hz = RIG.P("head")[2] + HEAD_LIFT
    out = []
    import random
    rnd = random.Random(3)
    for k in range(26):
        f = -1 + 2 * k / 25
        q = f * 1.9                                          # da lateral da máscara, pela nuca, à outra lateral
        root = Vector((0.13 * math.sin(q), 0.04 + 0.1 * math.cos(q) * 0.9, hz + 0.0 + 0.09 * math.cos(q) - 0.12 * rnd.random()))
        L = 0.65 + 0.4 * rnd.random() * (1 - 0.3 * abs(f)) + 0.15 * max(0.0, -f)
        side = f * 0.85 - 0.12                               # abre para os dois lados, um pouco mais para um
        ctrl = []
        for i in range(6):
            u = i / 5
            p = root + Vector((side * u ** 1.2 * L, L * (0.12 + 0.7 * u), -L * 0.55 * u ** 1.2 + 0.06 * u * (1 - u)))
            p.z += 0.04 * math.sin(u * 6 + k)
            p.x += 0.03 * math.sin(u * 5 + 2 * k)
            ctrl.append(tuple(p))
        pts = catmull(ctrl, 3)
        w = 0.06 + 0.035 * rnd.random()
        radii = [w * (1 - j / (len(pts) - 1)) ** 1.3 + 0.002 for j in range(len(pts))]
        tb = tube("lock", pts, radii, seg=6, squash=(1.0, 0.3), ref=(0, 0, 1))
        for p_ in tb.data.polygons:
            p_.use_smooth = True
        paint(tb, lambda co, n: mix(mix(HAIR_K, HAIR, 0.4 + 0.6 * ss(-0.4, 0.6, n.z)), HAIR_L, 0.45 * ss(0.6, 1.0, n.z)))
        out.append(tb)
    return {"cape": out}


if __name__ == "__main__":
    import bmesh  # noqa: F401
    reset()
    parts = merge(place_head(RIG, head(), lift=HEAD_LIFT, scale=HEAD_SCALE, fwd=-0.06), torso(), skirt(), arms(), hair())
    finish("void_reaver", RIG, parts, ARGS, body_center=(0, 0, 1.0), body_dist=5.0, head_dist=1.4)
