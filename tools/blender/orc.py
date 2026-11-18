# Orc modelado no Blender (D16). Rodar: ver tools/blender/README.md (trocar goblin.py por orc.py).
# Grava art/orc.blend e src/game/chars/models/orc.json (malhas por osso). O machado de duas lâminas continua por código na
# receita (numa mão só, preso ao antebraço direito). Sprite de referência: docs/ref/orc.png.
# Blender: z para cima, frente em -y. Pivôs iguais a b.dims da receita "orc" em src/game/chars/cast-enemies.ts.
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from mathutils import Euler, Matrix, Vector  # noqa: E402
import bmesh  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

HIP_Y, TORSO_Y, HEAD_Y, SH_Y, SH_X, ARM, HIP_X, THIGH, HAND = 0.84, 0.08, 0.6, 0.52, 0.45, 0.4, 0.2, 0.38, 0.38
T = HIP_Y + TORSO_Y
PIV3 = {
    "hips": (0, HIP_Y, 0), "torso": (0, T, 0), "head": (0, T + HEAD_Y, 0),
    "armL": (-SH_X, T + SH_Y, 0), "armR": (SH_X, T + SH_Y, 0), "foreL": (-SH_X, T + SH_Y - ARM, 0), "foreR": (SH_X, T + SH_Y - ARM, 0),
    "thighL": (-HIP_X, HIP_Y - 0.02, 0), "thighR": (HIP_X, HIP_Y - 0.02, 0),
    "shinL": (-HIP_X, HIP_Y - 0.02 - THIGH, 0), "shinR": (HIP_X, HIP_Y - 0.02 - THIGH, 0),
}
PIV = {k: B(v) for k, v in PIV3.items()}
C3 = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))  # three -> Blender

SKIN, SKIN_D, SKIN_L = hexc(0x76a234), hexc(0x3c4c16), hexc(0xa6c85c)
IRON_D, IRON_M, IRON_L = hexc(0x34363a), hexc(0x6a6d72), hexc(0xb4b8be)
HIDE, HIDE_D, PANTS, PANTS_D = hexc(0x7a4422), hexc(0x3a1d0e), hexc(0x46464a), hexc(0x242428)
WRAP, TUSK, EYE, DARK, MOUTH = hexc(0x8a6a48), hexc(0xeee4c6), hexc(0xe8442a), hexc(0x160e0c), hexc(0x1a0606)
BONE, BONE_M, BONE_D, RED, RED_D, HAIR = hexc(0xeadcb8), hexc(0xa89a80), hexc(0x6e5e44), hexc(0xa82a1c), hexc(0x4a0e08), hexc(0x3a2618)


def skin(co, n):
    c = mix(SKIN_D, SKIN, 0.5 + 0.5 * ss(-0.9, 0.2, n.z))
    return mix(c, SKIN_L, 0.4 * ss(0.35, 1.0, n.z))


def xform3(objs, m3):
    mb = C3 @ m3 @ C3.inverted()
    for o in objs:
        o.data.transform(mb)
        o.data.update()


# ------------------------------------------------------------------ cabeça (centro na origem)
def head():
    parts = {"solid": [], "flat": [], "lit": []}
    h = meta("head", [
        EL((0, 0.04, 0.04), (0.12, 0.14, 0.11)),                  # crânio careca, baixo e estreito
        EL((0, 0.03, 0.12), (0.075, 0.1, 0.05)),                  # topo afunilado
        EL((0, -0.06, -0.01), (0.135, 0.12, 0.11)),               # massa do rosto
        CAP((-0.135, -0.12, 0.085), (-0.02, -0.19, 0.012), 0.042, stiff=1.6),  # arcada pesada em V fechado, carrancuda no meio
        CAP((0.135, -0.12, 0.085), (0.02, -0.19, 0.012), 0.042, stiff=1.6),
        EL((-0.11, -0.13, -0.03), (0.05, 0.045, 0.04)),           # maçãs
        EL((0.11, -0.13, -0.03), (0.05, 0.045, 0.04)),
        EL((0, -0.08, -0.1), (0.17, 0.13, 0.08)),                 # mandíbula mais larga que o crânio
        EL((0, -0.2, -0.115), (0.12, 0.07, 0.055)),               # queixo e lábio de baixo projetados (prognata)
        EL((0, -0.2, -0.015), (0.05, 0.045, 0.035)),              # nariz largo e chato
        EL((-0.066, -0.2, -0.004), (0.04, 0.045, 0.022), neg=True),  # órbitas fundas sob a arcada
        EL((0.066, -0.2, -0.004), (0.04, 0.045, 0.022), neg=True),
        EL((0, -0.235, -0.068), (0.06, 0.05, 0.018), neg=True),   # boca em esgar: meio alto, cantos caídos
        EL((-0.06, -0.225, -0.085), (0.04, 0.05, 0.016), neg=True),
        EL((0.06, -0.225, -0.085), (0.04, 0.05, 0.016), neg=True),
        EL((0, -0.215, 0.045), (0.022, 0.02, 0.03), neg=True),    # vinco de carranca entre as sobrancelhas
    ])
    smooth(h, iters=4, factor=0.5, target=950)
    paint(h, skin)
    parts["solid"].append(h)
    for s in (-1, 1):
        # olho em fenda, inclinado para dentro e para baixo (carranca), fundo na órbita
        eye = ball("eye", (s * 0.064, -0.192, -0.01), (0.025, 0.01, 0.007), rot=(0, -s * 0.55, 0), seg=(8, 5))
        paint(eye, lambda co, n: EYE)
        parts["lit"].append(eye)
        # orelha pequena e pontuda, para o lado e um pouco para trás
        ear = tube("ear", [(s * 0.11, 0.0, -0.01), (s * 0.17, 0.04, 0.0), (s * 0.23, 0.09, 0.02), (s * 0.3, 0.15, 0.04)],
                   [0.04, 0.036, 0.02, 0.003], seg=8, squash=(0.18, 1.0), ref=(0, 0, 1))
        smooth(ear)
        paint(ear, lambda co, n: mix(SKIN_D, SKIN, 0.55 + 0.45 * n.z))
        parts["solid"].append(ear)
        # presa cônica subindo do lábio de baixo, rente à boca e aberta para fora; a ponta fica abaixo e por fora do olho
        tusk = tube("tusk", [(s * 0.082, -0.238, -0.11), (s * 0.095, -0.25, -0.085), (s * 0.11, -0.254, -0.06), (s * 0.125, -0.25, -0.04)],
                    [0.027, 0.021, 0.012, 0.002], seg=8)
        smooth(tusk)
        paint(tusk, lambda co, n: mix(hexc(0x9a8a62), TUSK, ss(-0.1, -0.06, co.z)))
        parts["solid"].append(tusk)
        nost = ball("nostril", (s * 0.022, -0.238, -0.03), (0.012, 0.008, 0.008), seg=(6, 4))
        paint(nost, lambda co, n: DARK)
        parts["flat"].append(nost)
    # coque: tufo de cabelo preto no alto e atrás do crânio, preso por uma faixa de couro, caindo num rabo para trás
    knot = tube("knot", [(0, 0.06, 0.15), (0, 0.08, 0.2), (0, 0.13, 0.23), (0, 0.2, 0.2), (0, 0.25, 0.1), (0, 0.27, -0.02)],
                [0.03, 0.034, 0.036, 0.03, 0.02, 0.003], seg=8)
    smooth(knot)
    paint(knot, lambda co, n: mix(HAIR, hexc(0x6a4a30), 0.2 + 0.6 * ss(-0.3, 0.9, n.z)))
    parts["solid"].append(knot)
    band = tube("band", [(0, 0.07, 0.175), (0, 0.085, 0.205)], [0.04, 0.04], seg=10)
    paint(band, lambda co, n: mix(BONE_D, BONE, 0.5 + 0.5 * n.z))
    parts["solid"].append(band)
    m = ball("mouth", (0, -0.212, -0.076), (0.085, 0.03, 0.016), seg=(12, 6))
    paint(m, lambda co, n: MOUTH)
    parts["flat"].append(m)
    # poucos dentes de baixo, tortos e amarelados, de tamanhos diferentes (nada de fileira certinha)
    for x, ln, lean in ((-0.035, 0.022, 0.15), (0.0, 0.016, -0.1), (0.032, 0.026, -0.2)):
        t = cone("tooth", (x, -0.245, -0.092), (x + lean * 0.05, -0.25, -0.092 + ln), 0.012, seg=4)
        paint(t, lambda co, n: mix(hexc(0x9a8a62), TUSK, 0.6))
        parts["flat"].append(t)
    return parts


# ------------------------------------------------------------------ corpo
def block(name, size, m, fn):
    """caixa de cantos chanfrados (placa da ombreira); m = matriz local -> mundo, caixa centrada na origem"""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.transform(bm, matrix=Matrix.Diagonal((*size, 1)), verts=bm.verts)
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(size) * 0.3, segments=2, affect="EDGES")
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
    o = new_mesh(name, bm)
    paint(o, fn)
    return o


def horn(name, base, d, ln, r):
    """chifre de osso curvo: sai de base na direção d e curva para cima"""
    b, d = Vector(base), Vector(d).normalized()
    pts = [b + d * ln * u + Vector((0, 0, 0.35 * ln * u * u)) for u in (0, 0.33, 0.66, 1.0)]
    h = tube(name, pts, [r, r * 0.75, r * 0.42, 0.002], seg=7)
    smooth(h)
    z0, z1 = b.z, pts[-1].z
    paint(h, lambda co, n: mix(BONE_D, BONE, 0.35 + 0.65 * ss(z0, z1, co.z)))
    return h


def torso():
    _, _, z0 = PIV["torso"]
    t = meta("torso", [
        EL((0, 0.0, z0 + 0.0), (0.2, 0.14, 0.1)),                 # cintura fina
        EL((0, -0.07, z0 + 0.12), (0.22, 0.19, 0.14)),            # barriga caindo sobre o cinto
        EL((-0.22, 0.02, z0 + 0.22), (0.12, 0.12, 0.16)),         # dorsais: tronco em V
        EL((0.22, 0.02, z0 + 0.22), (0.12, 0.12, 0.16)),
        EL((0, -0.02, z0 + 0.36), (0.37, 0.25, 0.2)),              # peito largo e fundo
        EL((-0.15, -0.2, z0 + 0.37), (0.15, 0.08, 0.1)),          # peitorais
        EL((0.15, -0.2, z0 + 0.37), (0.15, 0.08, 0.1)),
        EL((0, 0.11, z0 + 0.42), (0.28, 0.14, 0.17)),             # costas largas
        EL((0, 0.05, z0 + 0.57), (0.31, 0.14, 0.1)),              # trapézio alto, esconde o pescoço
        EL((-SH_X + 0.08, 0.0, z0 + 0.5), (0.13, 0.14, 0.11)),     # ombros
        EL((SH_X - 0.08, 0.0, z0 + 0.5), (0.13, 0.14, 0.11)),
    ], res=0.012)
    smooth(t, iters=2, target=820)

    def tint(co, n):
        c = skin(co, n)
        if co.y < -0.14:  # linha do esterno, sulcos do abdome e sombra sob os peitorais
            g = (1 - ss(0.0, 0.025, abs(co.x))) * ss(z0 + 0.05, z0 + 0.3, co.z) * 0.5
            for zz in (z0 + 0.09, z0 + 0.17):
                g = max(g, 0.4 * (1 - ss(0.0, 0.014, abs(co.z - zz))) * (1 - ss(0.1, 0.16, abs(co.x))))
            g = max(g, 0.5 * (1 - ss(0.0, 0.03, abs(co.z - (z0 + 0.275)))) * ss(0.03, 0.08, abs(co.x)) * (1 - ss(0.22, 0.3, abs(co.x))))
            c = mix(c, SKIN_D, g)
        if co.y > 0.05:  # sulco da coluna
            c = mix(c, SKIN_D, 0.5 * (1 - ss(0.0, 0.05, abs(co.x))))
        return c
    paint(t, tint)
    # tiracolo de couro do ombro esquerdo (sob a ombreira) até o lado direito da cintura, na frente e nas costas, com argola de ferro
    straps = []
    for back in (False, True):
        pts = []
        for i in range(9):
            u = i / 8
            x = -(0.36 - 0.62 * u)
            zz = z0 + 0.56 - 0.48 * u
            d = (0.25 + 0.04 * (1 - (2 * u - 1) ** 2)) * (0.62 if back else 1.0)
            depth = (1 - min(1, (x / 0.4) ** 2)) ** 0.5
            yy = 0.01 + d * max(0.3, depth) + 0.012
            pts.append((x, yy if back else -yy, zz))
        st = tube("strap", pts, [0.042] * 9, seg=6, squash=(1.0, 0.3), ref=(0, 1, 0))
        paint(st, lambda co, n: mix(HIDE_D, HIDE, 0.5 + 0.5 * n.z))
        straps.append(st)
    rc = (-0.04, -0.315, z0 + 0.32)
    ring = tube("ring", [(rc[0] + 0.045 * math.cos(a), rc[1], rc[2] + 0.045 * math.sin(a)) for a in [k * 2 * math.pi / 12 for k in range(13)]],
                [0.013] * 13, seg=6, cap=False)
    paint(ring, lambda co, n: mix(IRON_M, IRON_L, ss(-0.3, 0.8, n.z)))
    straps.append(ring)
    return {"torso": [t] + straps + pauldron()}


def pauldron():
    """ombreira do ombro esquerdo, como na referência 3D: casca de placas grossas de osso/pedra com miolo vermelho, chifres de osso
    curvos em fila no alto e rebites de ferro; presa ao tronco (no braço giraria com o golpe)"""
    sx, sz = -SH_X, T + SH_Y
    out = []
    frame = lambda co, n: mix(BONE_D, BONE_M, 0.3 + 0.7 * ss(-0.4, 0.9, n.z))
    red = lambda co, n: mix(RED_D, RED, 0.4 + 0.6 * ss(-0.5, 0.9, n.z))
    # três placas grossas em arco abraçando o deltoide (centro do arco no ombro): em cima, na quina e descendo pelo lado de fora
    cx, cz = sx - 0.02, sz - 0.05
    # forro de couro grosso sob as placas: enche o vão entre elas e o deltoide (de frente a ombreira não fica oca)
    pad = ball("padding", (cx - 0.01, 0.0, cz + 0.0), (0.2, 0.2, 0.17), seg=(14, 8))
    paint(pad, lambda co, n: mix(HIDE_D, HIDE, 0.5 + 0.4 * ss(-0.5, 0.9, n.z)))
    out.append(pad)
    top = None
    for i, (ang, w) in enumerate(((0.15, 0.38), (0.75, 0.36), (1.35, 0.33), (1.9, 0.3))):
        k = 1 + 0.06 * i  # arco em elipse rente ao deltoide, cada placa por fora da anterior
        c = Vector((cx - 0.2 * k * math.sin(ang), 0.0, cz + 0.16 * k * math.cos(ang)))
        m = Matrix.Translation(c) @ Euler((0, -ang, 0)).to_matrix().to_4x4()
        top = top or m
        out.append(block("plate", (0.19, w, 0.08), m, frame))
        out.append(block("panel", (0.11, w - 0.11, 0.03), m @ Matrix.Translation((0, 0, 0.042)), red))
        for yy in (-w / 2 + 0.045, w / 2 - 0.045):  # rebites nos cantos
            rv = ball("rivet", (m @ Vector((0.06, yy, 0.044))), (0.017, 0.017, 0.017), seg=(6, 4))
            paint(rv, lambda co, n: IRON_L)
            out.append(rv)
    # chifres em fila no alto da placa de cima, abrindo para fora e para cima, o do meio maior
    for yy, ln in ((-0.13, 0.12), (-0.065, 0.16), (0.0, 0.2), (0.065, 0.15), (0.13, 0.11)):
        out.append(horn("horn", top @ Vector((-0.02, yy, 0.03)), (-0.55, yy * 0.8, 0.75), ln, 0.05))
    return out


def fist(x, y, z, s):
    """mão fechada numa superfície só (contorno limpo): dorso, quatro dedos dobrados em fila com os nós para a frente e o polegar
    cruzando por cima; sulcos escuros pintados entre os dedos"""
    els = [EL((x, y + 0.01, z + 0.015), (0.075, 0.066, 0.066))]
    for dx in (-0.05, -0.017, 0.017, 0.05):
        els += [CAP((x + dx, y - 0.038, z + 0.032), (x + dx, y - 0.071, z - 0.022), 0.027, stiff=3.0),
                CAP((x + dx, y - 0.071, z - 0.022), (x + dx, y - 0.033, z - 0.06), 0.024, stiff=3.0)]
    els += [CAP((x - s * 0.066, y - 0.0, z + 0.022), (x - s * 0.06, y - 0.055, z - 0.0), 0.028, stiff=3.0),
            CAP((x - s * 0.06, y - 0.055, z - 0.0), (x - s * 0.022, y - 0.088, z - 0.005), 0.022, stiff=3.0)]
    f = meta("fist", els, res=0.006)
    smooth(f, iters=1, target=360)

    def tint(co, n):
        c = skin(co, n)
        if co.y < y - 0.03 and abs(co.x - x) < 0.066:
            if min(abs(co.x - (x + m)) for m in (-0.033, 0.0, 0.033)) < 0.006:
                c = mix(c, SKIN_D, 0.7)
        return c
    paint(f, tint)
    return [f]


def wraps(x, y, z, zs, r, name):
    """faixas de couro enroladas (anéis), um pouco inclinadas, com sombra nas bordas"""
    out = []
    for i, zz in enumerate(zs):
        tilt = 0.02 * (1 if i % 2 else -1)
        w = tube(name, [(x, y, z - zz + 0.022 + tilt), (x, y, z - zz - 0.022 - tilt)], [r(zz), r(zz) * 0.99], seg=12)
        paint(w, lambda co, n: mix(HIDE, WRAP, 0.35 + 0.65 * n.z))
        out.append(w)
    return out


def limbs():
    out = {}
    for side, s in (("L", -1), ("R", 1)):
        ax, ay, az = PIV["arm" + side]
        a = meta("arm" + side, [EL((ax + s * 0.02, ay, az - 0.02), (0.17, 0.16, 0.14)),       # deltoide enorme
                                 CAP((ax, ay, az - 0.05), (ax, ay, az - ARM), 0.11),
                                 EL((ax, ay - 0.04, az - 0.21), (0.13, 0.13, 0.13)),           # bíceps
                                 EL((ax, ay + 0.04, az - 0.2), (0.11, 0.11, 0.13))], res=0.014)  # tríceps
        smooth(a, iters=1, target=320)
        paint(a, skin)
        fx, fy, fz = PIV["fore" + side]
        f = meta("fore" + side, [CAP((fx, fy, fz), (fx, fy, fz - 0.3), 0.115),
                                  EL((fx, fy, fz - 0.1), (0.135, 0.13, 0.15)),                  # antebraço grosso
                                  EL((fx, fy + 0.01, fz - HAND + 0.02), (0.075, 0.07, 0.08))], res=0.014)
        smooth(f, iters=1, target=320)
        paint(f, skin)
        br = wraps(fx, fy, fz, (0.17, 0.22, 0.27), lambda zz: 0.158 - (zz - 0.17) * 0.25, "bracer")
        hx, hy, hz = PIV["thigh" + side]
        # coxa verde, musculosa e cilíndrica (sem a bola no quadril, que empurrava o volume para trás)
        th = meta("thigh" + side, [CAP((hx, hy, hz - 0.02), (hx, hy, hz - THIGH), 0.135),
                                    EL((hx, hy - 0.04, hz - 0.15), (0.15, 0.14, 0.17))], res=0.016)
        smooth(th, iters=1, target=260)
        paint(th, skin)
        kx, ky, kz = PIV["shin" + side]
        sh = meta("shin" + side, [CAP((kx, ky, kz), (kx, ky, kz - 0.32), 0.115),
                                  EL((kx, ky - 0.03, kz - 0.1), (0.12, 0.12, 0.13)),           # panturrilha
                                  EL((kx, ky - 0.07, kz - 0.385), (0.115, 0.165, 0.055)),      # pé descalço largo
                                  EL((kx, ky - 0.0, kz - 0.36), (0.1, 0.1, 0.06))], res=0.016)
        smooth(sh, iters=1, target=320)
        paint(sh, skin)
        extra = wraps(kx, ky, kz, (0.1, 0.15, 0.2, 0.25), lambda zz: 0.15 - zz * 0.06, "wrap")
        for i in (-1, 0, 1):
            c = cone("nail", (kx + i * 0.055, ky - 0.21, kz - 0.4), (kx + i * 0.06, ky - 0.255, kz - 0.405), 0.024, seg=5)
            paint(c, lambda co, n: TUSK)
            extra.append(c)
        out["arm" + side] = [a]
        out["fore" + side] = [f] + br + fist(fx, fy, fz - HAND, s)
        out["thigh" + side] = [th]
        out["shin" + side] = [sh] + extra
    return out


def hips():
    _, _, z = PIV["hips"]
    h = meta("hips", [EL((0, -0.01, z), (0.23, 0.15, 0.16))], res=0.016)  # quadril estreito, sem bunda saliente
    smooth(h, iters=1, target=240)
    paint(h, lambda co, n: mix(HIDE_D, HIDE, 0.2 + 0.3 * n.z))
    belt = tube("belt", [(0, -0.02, z + 0.03), (0, -0.02, z + 0.17)], [0.27, 0.265], seg=16, squash=(1.0, 0.78), ref=(1, 0, 0))
    paint(belt, lambda co, n: mix(HIDE_D, HIDE, 0.6 + 0.4 * n.z))
    # fivela redonda de ferro, grande, como na referência
    buckle = ball("buckle", (0, -0.235, z + 0.1), (0.11, 0.035, 0.1), seg=(16, 8))
    paint(buckle, lambda co, n: mix(IRON_M, IRON_L, ss(-0.5, 0.7, n.z)))
    parts = [h, belt, buckle]
    # tanga em tiras de couro de comprimentos diferentes (borda rasgada), na frente mais longa e atrás mais curta
    for y, strips in ((-1, ((-0.17, 0.3), (-0.085, 0.4), (0.0, 0.46), (0.085, 0.38), (0.17, 0.28))), (1, ((-0.13, 0.3), (0.0, 0.36), (0.13, 0.28)))):
        for x, ln in strips:
            f = tube("flap", [(x, y * 0.19, z + 0.06), (x * 1.1, y * 0.21, z - 0.1), (x * 1.15, y * 0.22, z - ln)], [0.06, 0.058, 0.04],
                     seg=6, squash=(1.0, 0.16), ref=(0, 0, 1))
            smooth(f)
            paint(f, lambda co, n: mix(HIDE_D, hexc(0x9a5c30), 0.45 + 0.4 * n.z))
            parts.append(f)
    return {"hips": parts}


def assemble(head_parts):
    hx, hy, _ = PIV3["head"]
    # cabeça baixa, entre os trapézios e um pouco à frente
    m3 = Matrix.Translation((hx, hy + 0.02, 0.12)) @ Euler((-0.08, 0, 0)).to_matrix().to_4x4()
    xform3(head_parts["solid"] + head_parts["flat"] + head_parts["lit"], m3)
    parts = {"head": head_parts["solid"], "head@flat": head_parts["flat"], "head@lit": head_parts["lit"]}
    for d in (torso(), limbs(), hips()):
        for k, v in d.items():
            parts.setdefault(k, []).extend(v)
    solids = [o for k, v in parts.items() if "@" not in k for o in v]
    bake_ao(solids, strength=0.8, distance=0.12)
    return parts


if __name__ == "__main__":
    reset()
    parts = assemble(head())
    counts = export_parts(os.path.join(ROOT, "src", "game", "chars", "models", "orc.json"), parts, PIV)
    print("TRIS", sum(counts.values()), counts)
    if "review" in ARGS:
        review_setup((0, 0, 0))
        out = os.path.join(ROOT, ".shots")
        hc = B((0, PIV3["head"][1] + 0.04, 0.17))
        for name, yaw, pitch in [("front", 0, 5), ("tq", 35, 10), ("side", 90, 5)]:
            shot(os.path.join(out, f"bl-orc-head-{name}.png"), hc, 1.6, yaw, pitch)
        for name, yaw, pitch in [("front", 0, 10), ("tq", 35, 15), ("back", 180, 15)]:
            shot(os.path.join(out, f"bl-orc-body-{name}.png"), (0, 0, 0.95), 5.5, yaw, pitch)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "art", "orc.blend"))
