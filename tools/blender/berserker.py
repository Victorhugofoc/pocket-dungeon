# Berserker (anão de elmo com chifres, peito nu tatuado, manto de pele) modelado no Blender (M3-05). Brief: docs/briefs/berserker.md.
# Rodar: ver tools/blender/README.md. Base dos anões em dwarf.py. Os dois machados ficam por código (berserkerAxe em cast-enemies.ts).
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from humanoid import Rig, finish, merge, place_head  # noqa: E402
import dwarf  # noqa: E402
from dwarf import arm, face, leg, shade, strip, torso_mass  # noqa: E402

# ombros mais largos que os do bombardier (o resto igual): a receita usa os mesmos números em BERSERKER (cast-enemies.ts)
dwarf.RIG = RIG = Rig(hipY=0.6, headY=0.5, shoulderY=0.4, shoulderX=0.42, arm=0.27, hipX=0.15, thigh=0.28)

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

SKIN, SKIN_D = hexc(0xf4b894), hexc(0xa8644a)
INK = hexc(0x2f6fd0)
BEARD, BEARD_D = hexc(0xf47e26), hexc(0xb04a14)
STEEL, STEEL_D, STEEL_L = hexc(0xa8b0bc), hexc(0x4a505c), hexc(0xe2e8f0)
HORN, HORN_D = hexc(0xf0e8d6), hexc(0x9a8a70)
FUR, FUR_D, FUR_L = hexc(0x7a4a28), hexc(0x2e1a0c), hexc(0xa87444)
PANTS, PANTS_D = hexc(0x6a4e36), hexc(0x2a1c12)
BOOT, BOOT_D = hexc(0x463424), hexc(0x181008)
LEATH, LEATH_D = hexc(0x6e4428), hexc(0x341e10)
DARK = hexc(0x140a06)


def steel(co, n):
    return mix(STEEL_D, STEEL, 0.3 + 0.7 * ss(-0.6, 0.7, n.z)) if n.z < 0.75 else mix(STEEL, STEEL_L, ss(0.75, 1.0, n.z))


def fur(co, n):
    k = 0.7 + 0.3 * math.sin(co.x * 90 + co.z * 70) * math.cos(co.y * 80)
    return mix(FUR_D, mix(FUR, FUR_L, ss(0.3, 1.0, n.z)), (0.15 + 0.85 * ss(-0.5, 0.6, n.z)) * k)   # pontas de baixo escuras


def skin(co, n):
    return mix(SKIN_D, SKIN, 0.35 + 0.65 * ss(-0.7, 0.5, n.z))


def ring(name, c, rx, ry, r, color, z_wave=0.0, seg=10, n=20):
    """anel fechado deitado (aba do elmo, borda de pele)"""
    pts = [(c[0] + rx * math.sin(2 * math.pi * k / n), c[1] - ry * math.cos(2 * math.pi * k / n),
            c[2] + z_wave * math.cos(2 * math.pi * k / n)) for k in range(n + 1)]
    t = tube(name, pts, [r] * len(pts), seg=seg, cap=False)
    paint(t, color)
    return t


# ------------------------------------------------------------------ cabeça: elmo de aço com chifres e protetor de nariz
def head():
    parts = face(SKIN, SKIN_D, BEARD, BEARD_D, DARK, brow=BEARD_D, beard_len=0.75, angry=True, whites=True)
    helm = meta("helm", [EL((0, 0.01, 0.12), (0.158, 0.158, 0.13)),
                         EL((0, -0.16, -0.05), (0.14, 0.12, 0.14), neg=True),          # abre o rosto
                         EL((0, 0.0, -0.09), (0.2, 0.2, 0.1), neg=True)], res=0.008)    # e embaixo
    smooth(helm, iters=1, target=280)
    paint(helm, steel)
    parts["solid"].append(helm)
    parts["solid"].append(ring("rim", (0, 0.01, 0.105), 0.164, 0.164, 0.022, steel, z_wave=0.01))   # aba
    ridge = tube("ridge", [(0, -0.155, 0.09), (0, -0.1, 0.19), (0, 0.02, 0.235), (0, 0.13, 0.17)], [0.022, 0.024, 0.024, 0.02], seg=6)
    paint(ridge, steel)
    parts["solid"].append(ridge)
    guard = tube("guard", [(0, -0.165, 0.11), (0, -0.17, 0.075), (0, -0.168, 0.05)], [0.02, 0.016, 0.012], seg=6,
                 squash=(1.0, 0.55), ref=(0, 1, 0))   # protetor de nariz
    paint(guard, steel)
    parts["solid"].append(guard)
    for s in (-1, 1):
        # chifre curvo: sai do lado do elmo, abre para fora e sobe com a ponta para dentro
        pts = [(s * 0.13, 0.0, 0.15), (s * 0.2, -0.01, 0.17), (s * 0.25, -0.02, 0.22), (s * 0.255, -0.035, 0.29), (s * 0.235, -0.05, 0.35)]
        h = tube("horn", pts, [0.062, 0.05, 0.036, 0.022, 0.004], seg=10)
        smooth(h)
        paint(h, lambda co, n, s=s: mix(mix(HORN_D, HORN, ss(0.15, 0.22, co.z) * (0.6 + 0.4 * ss(-0.6, 0.6, n.z))), HORN_D, ss(0.29, 0.35, co.z)))
        parts["solid"].append(h)
        # placa da bochecha descendo ao lado do rosto
        cheek = meta("cheek", [EL((s * 0.13, -0.07, 0.03), (0.03, 0.06, 0.08), rot=(0, 0, -s * 0.5))], res=0.008)
        smooth(cheek, target=80)
        paint(cheek, steel)
        parts["solid"].append(cheek)
        base = tube("hbase", [(s * 0.12, 0.0, 0.145), (s * 0.165, -0.002, 0.16)], [0.07, 0.068], seg=10)
        paint(base, steel)
        parts["solid"].append(base)
    return parts


# ------------------------------------------------------------------ tronco nu e tatuado, manto de pele nos ombros e nas costas
def torso():
    z0 = RIG.P("torso")[2]
    sx = RIG.shoulderX
    t = torso_mass(z0, sx, skin, extra=[EL((0, 0.08, z0 + 0.36), (0.32, 0.17, 0.15)),      # corcunda dos trapézios
                                        EL((-0.11, -0.1, z0 + 0.28), (0.12, 0.08, 0.09)),     # peitorais
                                        EL((0.11, -0.1, z0 + 0.28), (0.12, 0.08, 0.09)),
                                        EL((0, -0.09, z0 + 0.02), (0.23, 0.17, 0.16))])      # barriga redonda, saliente
    parts, ink = [t], []
    # tatuagens azuis: arcos sob os peitorais, faixas em ponta nas costelas e na barriga
    for s in (-1, 1):
        for pts in ([(s * 0.03, z0 + 0.32), (s * 0.1, z0 + 0.36), (s * 0.18, z0 + 0.33), (s * 0.23, z0 + 0.26)],
                    [(s * 0.05, z0 + 0.22), (s * 0.12, z0 + 0.2), (s * 0.2, z0 + 0.16)],
                    [(s * 0.17, z0 + 0.12), (s * 0.12, z0 + 0.06), (s * 0.15, z0 + 0.0)]):
            st = strip("ink", t, pts, 0.04, INK, squash=0.15, lift=0.3)
            if st:
                ink.append(st)
    belly = strip("ink", t, [(0, z0 + 0.2), (0.03, z0 + 0.13), (-0.02, z0 + 0.07)], 0.04, INK, squash=0.15, lift=0.3)
    if belly:
        ink.append(belly)
    # manto de pele: tufos grossos sobre os ombros, gola atrás do pescoço e o pano felpudo caindo pelas costas até a cintura
    els = [EL((s * (sx - 0.03), 0.03, z0 + 0.42), (0.17, 0.16, 0.08)) for s in (-1, 1)]
    els += [EL((0, 0.12, z0 + 0.44), (0.24, 0.12, 0.1)),
            EL((0, 0.15, z0 + 0.5), (0.2, 0.09, 0.08)),                   # gola atrás da cabeça
            EL((0, 0.12, z0 + 0.24), (0.32, 0.1, 0.22)),
            EL((0, 0.16, z0 + 0.4), (0.27, 0.1, 0.12)),                   # corcunda
            EL((0, 0.11, z0 + 0.0), (0.3, 0.08, 0.14))]
    for i in range(13):   # tufos soltos na borda dos ombros
        a = -1.5 + 3.0 * i / 12
        r = 0.075 + 0.03 * ((i * 7) % 3) / 2
        els.append(EL((math.sin(a) * 0.32, 0.02 + math.cos(a) * 0.17, z0 + 0.37 - 0.04 * abs(math.sin(a * 3))), (r, r, r)))
    for i in range(7):    # barra em pontas irregulares, no meio da coxa
        x = -0.27 + 0.54 * i / 6
        els.append(EL((x, 0.12, z0 - 0.12 - 0.06 * ((i * 5) % 3) / 2), (0.055, 0.045, 0.09)))   # barra na altura do quadril
    mantle = meta("mantle", els, res=0.014)
    smooth(mantle, iters=1, target=620)
    paint(mantle, fur)
    parts.append(mantle)
    # correia de couro do manto cruzando o peito, com fivela
    strap = strip("strap", t, [(-0.24, z0 + 0.4), (-0.1, z0 + 0.37), (0.1, z0 + 0.37), (0.24, z0 + 0.4)], 0.026, LEATH_D, squash=0.5)
    if strap:
        parts.append(strap)
    return {"torso": parts, "torso@flat": ink}   # tatuagem sem contorno: com ele virava fita colada


def hips():
    z = RIG.P("hips")[2]
    p = meta("hips", [EL((0, 0.0, z - 0.02), (0.24, 0.18, 0.1)), EL((0, 0.0, z - 0.08), (0.2, 0.16, 0.08))], res=0.012)
    smooth(p, iters=1, target=200)
    paint(p, shade(PANTS, PANTS_D))
    belt = tube("belt", [(0, 0.0, z - 0.02), (0, 0.0, z + 0.07)], [0.262, 0.255], seg=18)   # baixo, sob a barriga
    paint(belt, lambda co, n: mix(LEATH_D, LEATH, 0.3 + 0.5 * ss(-0.6, 0.6, n.z)))
    buckle = tube("buckle", [(0, -0.245, z + 0.025), (0, -0.28, z + 0.025)], [0.05, 0.046], seg=14)
    smooth(buckle)
    paint(buckle, steel)
    parts = [p, belt, buckle]
    # aba de couro na frente e atrás, curta
    for y, ang in ((-0.2, 0.0), (0.2, math.pi)):
        flap = meta("flap", [EL((0, y, z - 0.08), (0.12, 0.03, 0.1))], res=0.01)
        smooth(flap, target=80)
        paint(flap, shade(LEATH, LEATH_D))
        parts.append(flap)
    return {"hips": parts}


def limbs():
    def upper(co, n, az):
        if az - 0.17 < co.z < az - 0.12:
            return INK   # faixa tatuada no bíceps
        return skin(co, n)

    def fore(co, n, fz):
        if co.z < fz - 0.07:
            return mix(LEATH_D, LEATH, 0.35 + 0.5 * ss(-0.6, 0.6, n.z))   # braçadeira de couro
        return skin(co, n)
    out = {}
    for side in ("L", "R"):
        out = merge(out, arm(side, upper, fore, skin, k=1.3, fist=1.3),
                    leg(side, shade(PANTS, PANTS_D), shade(BOOT, BOOT_D), boot_top=fur))
        fx, fy, fz = RIG.P("fore" + side)
        for zz in (fz - 0.09, fz - 0.15):   # cintas de ferro da braçadeira
            r = tube("bstrap", [(fx, fy - 0.01, zz - 0.012), (fx, fy - 0.01, zz + 0.012)], [0.1, 0.1], seg=12)
            paint(r, steel)
            out["fore" + side].append(r)
    return out


if __name__ == "__main__":
    reset()
    parts = merge(place_head(RIG, head(), lift=0.0, scale=1.08, fwd=0.1, tilt=-0.35), torso(), hips(), limbs())
    finish("berserker", RIG, parts, ARGS, body_center=(0, 0, 0.75), body_dist=3.4, head_dist=1.2)
