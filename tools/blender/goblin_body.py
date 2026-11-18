# Corpo, clava e montagem do goblin no esqueleto do jogo (receita "goblin" em src/game/chars/cast-enemies.ts).
import math

import bpy
from mathutils import Euler, Matrix

from kit import B, CAP, EL, ball, bake_ao, cone, hexc, meta, mix, paint, smooth, ss, tube

# Pivôs em coordenadas do three (unidades do modelo, antes de b.scale). O corpo é modelado em repouso, ereto: a curva e o
# agachamento vêm da animação (lean, crouch). Estes números têm de bater com b.dims da receita.
HIP_Y, TORSO_Y, HEAD_Y, SH_Y, SH_X, ARM, HIP_X, THIGH, HAND = 0.66, 0.08, 0.48, 0.4, 0.24, 0.3, 0.16, 0.27, 0.29
T = HIP_Y + TORSO_Y
PIV3 = {
    "hips": (0, HIP_Y, 0), "torso": (0, T, 0), "head": (0, T + HEAD_Y, 0),
    "armL": (-SH_X, T + SH_Y, 0), "armR": (SH_X, T + SH_Y, 0), "foreL": (-SH_X, T + SH_Y - ARM, 0), "foreR": (SH_X, T + SH_Y - ARM, 0),
    "thighL": (-HIP_X, HIP_Y - 0.02, 0), "thighR": (HIP_X, HIP_Y - 0.02, 0),
    "shinL": (-HIP_X, HIP_Y - 0.02 - THIGH, 0), "shinR": (HIP_X, HIP_Y - 0.02 - THIGH, 0),
}
PIV = {k: B(v) for k, v in PIV3.items()}
C3 = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))  # three -> Blender


def xform3(objs, m3):
    """aplica a objetos do Blender uma matriz escrita no espaço do three"""
    mb = C3 @ m3 @ C3.inverted()
    for o in objs:
        o.data.transform(mb)
        o.data.update()


SKIN, SKIN_D, SKIN_L = hexc(0x7d9438), hexc(0x3a4818), hexc(0xa8b858)
TOOTH = hexc(0xd8c890)
VEST, VEST_D, PAD = hexc(0x6e4026), hexc(0x3a2210), hexc(0x8e5a34)
PANTS, PANTS_D, WRAP = hexc(0x46523e), hexc(0x2f3b33), hexc(0x7a5a3a)
CLUB, CLUB_L = hexc(0x6e3e22), hexc(0xa06a3e)


def skin(co, n):
    c = mix(SKIN_D, SKIN, 0.55 + 0.45 * ss(-0.9, 0.2, n.z))
    return mix(c, SKIN_L, 0.35 * ss(0.3, 1.0, n.z))


def torso():
    _, _, z0 = PIV["torso"]
    t = meta("torso", [
        EL((0, 0.01, z0 + 0.22), (0.15, 0.105, 0.16)),            # peito
        EL((0, 0.0, z0 + 0.07), (0.13, 0.1, 0.11)),               # barriga
        EL((0, 0.03, z0 + 0.36), (0.13, 0.08, 0.06)),             # ombros caídos
        CAP((0, 0.0, z0 + 0.36), (0, -0.02, z0 + 0.47), 0.055),   # pescoço
        EL((-0.2, 0.0, z0 + 0.37), (0.1, 0.095, 0.05), rot=(0, 0.35, 0)),   # ombreira de couro (lado esquerdo)
        EL((-0.24, 0.0, z0 + 0.31), (0.085, 0.085, 0.04), rot=(0, 0.8, 0)),
    ], res=0.01)
    smooth(t, iters=2, target=520)

    def tint(co, n):
        if co.z > z0 + 0.4 or (co.z > z0 + 0.33 and abs(co.x) < 0.07):
            return mix(SKIN_D, SKIN, 0.7)
        if co.x < -0.12 and co.z > z0 + 0.27:
            return mix(VEST_D, PAD, 0.5 + 0.5 * n.z)
        c = mix(VEST_D, VEST, 0.4 + 0.6 * ss(z0, z0 + 0.3, co.z))
        if abs(co.x + (co.z - z0 - 0.2) * 0.9) < 0.018 and co.y < 0:  # correia diagonal
            c = VEST_D
        return c
    paint(t, tint)
    return {"torso": [t]}


def limbs():
    out = {}
    for side, s in (("L", -1), ("R", 1)):
        ax, ay, az = PIV["arm" + side]
        a = meta("arm" + side, [CAP((ax, ay, az), (ax, ay, az - ARM), 0.045), EL((ax, ay, az), (0.06, 0.06, 0.06))], res=0.016)
        smooth(a, iters=1, target=180)
        paint(a, skin)
        fx, fy, fz = PIV["fore" + side]
        f = meta("fore" + side, [CAP((fx, fy, fz), (fx, fy, fz - 0.2), 0.045), CAP((fx, fy, fz - 0.12), (fx, fy, fz - 0.22), 0.055),
                                  EL((fx, fy - 0.01, fz - HAND), (0.06, 0.065, 0.06)),                      # punho
                                  EL((fx + s * 0.035, fy - 0.045, fz - HAND + 0.01), (0.03, 0.03, 0.035))],  # polegar
                 res=0.016)
        smooth(f, iters=1, target=260)

        def ftint(co, n, fz=fz):
            if fz - 0.25 < co.z < fz - 0.17:
                return mix(VEST_D, WRAP, 0.5 + 0.5 * (int((co.z - fz) * 90) % 2))  # punho enfaixado
            return skin(co, n)
        paint(f, ftint)
        hx, hy, hz = PIV["thigh" + side]
        th = meta("thigh" + side, [CAP((hx, hy, hz), (hx, hy, hz - THIGH), 0.065), EL((hx, hy, hz), (0.08, 0.08, 0.07))], res=0.016)
        smooth(th, iters=1, target=200)
        paint(th, lambda co, n: mix(PANTS_D, PANTS, 0.5 + 0.5 * n.z))
        kx, ky, kz = PIV["shin" + side]
        sh = meta("shin" + side, [CAP((kx, ky, kz), (kx, ky, kz - 0.25), 0.05),
                                  EL((kx, ky - 0.08, kz - 0.29), (0.075, 0.14, 0.045)),   # pé grande descalço
                                  EL((kx, ky - 0.01, kz - 0.27), (0.055, 0.06, 0.045))], res=0.016)
        smooth(sh, iters=1, target=300)

        def stint(co, n, kz=kz):
            if co.z < kz - 0.245:
                return skin(co, n)
            if kz - 0.22 < co.z < kz - 0.06:
                return mix(VEST_D, WRAP, 0.4 + 0.6 * (int((co.z - kz) * 60) % 2))  # panos enrolados
            return PANTS_D
        paint(sh, stint)
        claws = []
        for i in (-1, 0, 1):
            c = cone("claw", (kx + i * 0.04, ky - 0.2, kz - 0.3), (kx + i * 0.045, ky - 0.25, kz - 0.31), 0.015, seg=5)
            paint(c, lambda co, n: TOOTH)
            claws.append(c)
        out["arm" + side] = [a]
        out["fore" + side] = [f]
        out["thigh" + side] = [th]
        out["shin" + side] = [sh] + claws
    return out


def hips():
    _, _, z = PIV["hips"]
    h = meta("hips", [EL((0, 0.0, z), (0.15, 0.11, 0.1)), EL((0, 0.0, z + 0.07), (0.155, 0.125, 0.035))], res=0.016)
    smooth(h, iters=1, target=260)
    paint(h, lambda co, n: VEST_D if co.z > z + 0.05 else PANTS)
    flap = tube("flap", [(0, -0.115, z + 0.06), (0, -0.13, z - 0.06), (0, -0.125, z - 0.2)], [0.08, 0.075, 0.06], seg=8,
                squash=(1.0, 0.15), ref=(0, 0, 1))  # tanga de couro na frente
    smooth(flap)
    paint(flap, lambda co, n: mix(VEST_D, VEST, 0.6))
    return {"hips": [h, flap]}


def club():
    """clava nodosa na mão direita, modelada ao longo de -y do three a partir da mão"""
    prof = [(0.032, 0.04), (0.03, -0.1), (0.045, -0.35), (0.075, -0.55), (0.095, -0.66), (0.08, -0.72), (0.03, -0.76)]
    c = tube("club", [B((0, y, 0)) for _, y in prof], [r for r, _ in prof], seg=10, ref=(1, 0, 0))
    knots = [ball("knot", B((math.sin(a) * (0.03 - y * 0.08), y, math.cos(a) * (0.03 - y * 0.08))), (0.03, 0.03, 0.03), seg=(6, 4))
             for y, a in ((-0.42, 0.3), (-0.55, 2.4), (-0.63, 4.4), (-0.3, 3.7), (-0.68, 1.2))]
    parts = [c] + knots
    for o in parts:
        smooth(o)
        paint(o, lambda co, n: mix(CLUB, CLUB_L, ss(0.3, 0.6, -co.z)))
    fx, fy, _ = PIV3["foreR"]
    m3 = Matrix.Translation((0, -HAND, 0.02)) @ Euler((-0.65, 0, 0.3)).to_matrix().to_4x4() @ Matrix.Diagonal((1.3, 1.3, 1.3, 1))
    m3 = Matrix.Translation((fx, fy, 0)) @ m3
    xform3(parts, m3)
    return {"foreR": parts}


def assemble(head_parts):
    hx, hy, _ = PIV3["head"]
    # a curva do tronco inclina a cabeça; ela é girada para trás e volta a olhar para a frente
    m3 = Matrix.Translation((hx, hy + 0.12, 0.1)) @ Euler((-0.5, 0, 0)).to_matrix().to_4x4() @ Matrix.Diagonal((1.3, 1.3, 1.3, 1))
    xform3(head_parts["solid"] + head_parts["flat"] + head_parts["lit"], m3)
    parts = {"head": head_parts["solid"], "head@flat": head_parts["flat"], "head@lit": head_parts["lit"]}
    for d in (torso(), limbs(), hips(), club()):
        for k, v in d.items():
            parts.setdefault(k, []).extend(v)
    solids = [o for k, v in parts.items() if "@" not in k for o in v]
    bake_ao(solids, strength=0.8, distance=0.1)
    return parts
