# Assassin (ninja de máscara de raposa) modelado no Blender (M3-03). Brief: docs/briefs/assassin.md.
# Rodar: ver tools/blender/README.md. Adagas por código (dagger() em kit.ts); o cachecol longo é fita com física (b.ribbons).
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from humanoid import Rig, finish, merge, place_head  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
RIG = Rig(hipY=0.92, headY=0.56, shoulderY=0.46, shoulderX=0.27, arm=0.32, hipX=0.13, thigh=0.42)
HAND = 0.3

GREY, GREY_D, GREY_M = hexc(0x8a8f99), hexc(0x4a4e58), hexc(0x6a6e78)
RED, RED_D, BLACK, BLACK_L = hexc(0xc8281e), hexc(0x6a1010), hexc(0x1e1e24), hexc(0x3a3a44)
MASK, MASK_D, WRAP, DARK = hexc(0xf4f2ee), hexc(0xb8b4ae), hexc(0xd8d4cc), hexc(0x0e0e12)


def on(obj, x, z, lift=0.004):
    """ponto na superfície da frente de obj (raio de -y para +y na altura z) e a normal ali"""
    ok, hit, n, _ = obj.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
    return hit + n * lift, n


def strip(name, obj, xz, r, color, squash=0.35):
    """faixa fina deitada na superfície da frente de obj, passando pelos pontos (x, z)"""
    pts = [on(obj, x, z, r * squash * 0.6)[0] for x, z in xz]
    t = tube(name, pts, [r] * len(pts), seg=6, squash=(1.0, squash), ref=(0, 1, 0))
    paint(t, lambda co, n: color)
    return t


def cloth(base, dark):
    return lambda co, n: mix(dark, base, 0.4 + 0.6 * ss(-0.7, 0.5, n.z))


# ------------------------------------------------------------------ cabeça: máscara de raposa e cabelo preso
def head():
    parts = {"solid": [], "flat": [], "lit": []}
    hair = meta("hair", [EL((0, 0.03, 0.02), (0.115, 0.12, 0.125)), EL((0, 0.09, 0.12), (0.05, 0.05, 0.045)),  # crânio e coque
                         CAP((0, 0.1, 0.14), (0, 0.2, 0.08), 0.03)], res=0.008)
    smooth(hair, iters=2, target=220)
    paint(hair, cloth(BLACK_L, BLACK))
    parts["solid"].append(hair)
    band = tube("hband", [(0, 0.075, 0.1), (0, 0.095, 0.135)], [0.04, 0.04], seg=8)
    paint(band, lambda co, n: RED)
    parts["solid"].append(band)
    mask = meta("mask", [
        EL((0, -0.05, 0.01), (0.112, 0.085, 0.125)),               # placa do rosto
        CAP((0, -0.1, -0.015), (0, -0.19, -0.04), 0.04, stiff=1.6),  # focinho curto em cunha
        EL((0, -0.11, 0.06), (0.07, 0.05, 0.04)),                  # testa
    ], res=0.007)
    smooth(mask, iters=2, factor=0.5, target=320)

    paint(mask, lambda co, n: mix(MASK_D, MASK, 0.55 + 0.45 * ss(-0.6, 0.5, n.z)))
    parts["solid"].append(mask)
    # marcas vermelhas como peças finas na superfície (cor por vértice borrava): dois riscos em cada bochecha e a chama da testa
    for s in (-1, 1):
        for k in range(2):
            z = -0.02 - k * 0.03
            parts["flat"].append(strip("mark", mask, [(s * 0.055, z + 0.01), (s * 0.08, z), (s * 0.1, z - 0.012)], 0.009, RED))
    parts["flat"].append(strip("brow", mask, [(0, 0.04), (0, 0.075), (0, 0.1)], 0.012, RED))
    nose = ball("mnose", (0, -0.232, -0.043), (0.02, 0.016, 0.016), seg=(6, 4))
    paint(nose, lambda co, n: BLACK)
    parts["flat"].append(nose)
    for s in (-1, 1):
        eye = ball("slit", (s * 0.048, -0.128, 0.025), (0.032, 0.008, 0.009), rot=(0, s * 0.4, 0), seg=(8, 4))
        paint(eye, lambda co, n: DARK)
        parts["flat"].append(eye)
        # orelha pontuda da máscara, branca por fora e vermelha por dentro
        ear = tube("mear", [(s * 0.06, -0.05, 0.1), (s * 0.085, -0.055, 0.17), (s * 0.1, -0.06, 0.23)], [0.05, 0.035, 0.003],
                   seg=8, squash=(1.0, 0.35), ref=(0, 1, 0))
        smooth(ear)
        paint(ear, lambda co, n: RED if n.y < -0.5 and abs(co.x) < 0.1 and co.z < 0.2 else MASK)
        parts["solid"].append(ear)
    return parts


# ------------------------------------------------------------------ tronco: quimono cinza com gola transpassada e faixa vermelha
def torso():
    z0 = RIG.P("torso")[2]
    t = meta("torso", [
        EL((0, 0.0, z0 + 0.32), (0.2, 0.125, 0.14)),            # peito
        EL((0, 0.0, z0 + 0.1), (0.15, 0.105, 0.13)),            # cintura
        EL((-0.19, 0.0, z0 + 0.42), (0.075, 0.08, 0.06)),         # ombros
        EL((0.19, 0.0, z0 + 0.42), (0.075, 0.08, 0.06)),
        CAP((0, 0.0, z0 + 0.42), (0, -0.01, z0 + 0.53), 0.05),   # pescoço
    ], res=0.01)
    smooth(t, iters=2, target=450)

    def tint(co, n):
        if co.z > z0 + 0.47:
            return BLACK  # gola alta / cachecol
        return cloth(GREY, GREY_D)(co, n)
    paint(t, tint)
    # gola transpassada: duas faixas vermelhas do ombro até a faixa da cintura, em V
    collar = [strip("collar", t, [(s * 0.13, z0 + 0.46), (s * 0.08, z0 + 0.34), (s * 0.03, z0 + 0.22), (-s * 0.01, z0 + 0.12)], 0.024,
                    RED, squash=0.4) for s in (-1, 1)]
    scarf = tube("scarf", [(0, 0.0, z0 + 0.48), (0, -0.005, z0 + 0.52), (0, 0.0, z0 + 0.57)], [0.08, 0.1, 0.085], seg=14)   # cachecol
    smooth(scarf)
    paint(scarf, cloth(BLACK_L, BLACK))
    return {"torso": [t, scarf] + collar}


def hips():
    z = RIG.P("hips")[2]
    p = meta("hips", [EL((0, 0.0, z), (0.16, 0.115, 0.1))], res=0.012)
    smooth(p, iters=1, target=200)
    paint(p, cloth(GREY_M, GREY_D))
    sash = tube("sash", [(0, 0.0, z + 0.07), (0, 0.0, z + 0.15)], [0.168, 0.162], seg=14)   # faixa vermelha larga
    paint(sash, cloth(RED, RED_D))
    tails = []
    for k, (ln, ox) in enumerate(((0.26, -0.11), (0.2, -0.06))):   # pontas do nó caindo do lado esquerdo
        tl = tube("sashtail", [(ox, -0.15, z + 0.1), (ox - 0.02, -0.16, z + 0.1 - ln * 0.5), (ox - 0.035, -0.15, z + 0.1 - ln)],
                  [0.035, 0.032, 0.028], seg=6, squash=(1.0, 0.3), ref=(0, 1, 0))
        paint(tl, cloth(RED, RED_D))
        tails.append(tl)
    knot = ball("knot", (-0.09, -0.155, z + 0.11), (0.04, 0.03, 0.035), seg=(8, 5))
    paint(knot, cloth(RED, RED_D))
    return {"hips": [p, sash, knot] + tails}


def limbs():
    out = {}
    for side, s in (("L", -1), ("R", 1)):
        ax, ay, az = RIG.P("arm" + side)
        a = meta("arm" + side, [CAP((ax, ay, az), (ax, ay, az - RIG.arm), 0.05), EL((ax, ay, az - RIG.arm + 0.04), (0.068, 0.068, 0.06))], res=0.012)
        smooth(a, iters=1, target=160)
        paint(a, cloth(GREY, GREY_D))
        fx, fy, fz = RIG.P("fore" + side)
        f = meta("fore" + side, [CAP((fx, fy, fz), (fx, fy, fz - 0.22), 0.05), EL((fx, fy - 0.01, fz - HAND), (0.055, 0.06, 0.055)),
                                  EL((fx + s * 0.03, fy - 0.04, fz - HAND + 0.01), (0.026, 0.026, 0.03))], res=0.012)
        smooth(f, iters=1, target=220)

        def ftint(co, n, fz=fz):
            if co.z < fz - 0.24:
                return mix(BLACK, BLACK_L, 0.5 + 0.5 * n.z)          # luva preta
            if co.z < fz - 0.07:
                return cloth(RED, RED_D)(co, n)                      # braçadeira vermelha
            return cloth(GREY, GREY_D)(co, n)
        paint(f, ftint)
        hx, hy, hz = RIG.P("thigh" + side)
        th = meta("thigh" + side, [CAP((hx, hy, hz), (hx, hy, hz - RIG.thigh + 0.04), 0.075),
                                   EL((hx + s * 0.01, hy, hz - RIG.thigh + 0.06), (0.1, 0.1, 0.1))], res=0.012)   # calça larga, bufante no joelho
        smooth(th, iters=1, target=220)
        paint(th, cloth(GREY_M, GREY_D))
        kx, ky, kz = RIG.P("shin" + side)
        sh = meta("shin" + side, [CAP((kx, ky, kz - 0.05), (kx, ky, kz - 0.38), 0.05),
                                  EL((kx, ky - 0.06, kz - 0.42), (0.05, 0.1, 0.035)),        # sapatilha
                                  EL((kx, ky + 0.0, kz - 0.4), (0.048, 0.05, 0.04))], res=0.01)
        smooth(sh, iters=1, target=260)

        def stint(co, n, kz=kz):
            if co.z < kz - 0.36:
                return mix(BLACK, BLACK_L, 0.4 + 0.6 * n.z)
            return mix(MASK_D, WRAP, 0.5 + 0.5 * ss(-0.6, 0.5, n.z))  # canela enfaixada, cor sólida
        paint(sh, stint)
        ties = []
        for zz, rr in ((kz - 0.34, 0.058), (kz - 0.18, 0.056)):   # tornozeleira e amarração vermelhas como anéis (a cor borrava)
            t = tube("tie", [(kx, ky, zz - 0.018), (kx, ky, zz + 0.018)], [rr, rr], seg=10)
            paint(t, cloth(RED, RED_D))
            ties.append(t)
        out["arm" + side] = [a]
        out["fore" + side] = [f]
        out["thigh" + side] = [th]
        out["shin" + side] = [sh] + ties
    return out


if __name__ == "__main__":
    reset()
    parts = merge(place_head(RIG, head(), lift=0.13, scale=1.15), torso(), hips(), limbs())
    finish("assassin", RIG, parts, ARGS, body_center=(0, 0, 0.95), body_dist=4.2, head_dist=1.1)
