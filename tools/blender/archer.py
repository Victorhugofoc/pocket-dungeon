# Archer (esqueleto arqueiro de capuz e manto vermelho) modelado no Blender (M3-03). Brief: docs/briefs/archer.md.
# Rodar: ver tools/blender/README.md. O arco fica por código (bow() em kit.ts). Blender: z para cima, frente em -y.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from humanoid import Rig, finish, merge, place_head  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
RIG = Rig(hipY=0.92, headY=0.58, shoulderY=0.46, shoulderX=0.25, arm=0.34, hipX=0.11, thigh=0.42, bulk=0.8)
HAND = 0.3

BONE, BONE_L, BONE_D = hexc(0xd9cdb0), hexc(0xefe6cc), hexc(0x8a7a5a)
RED, RED_D = hexc(0x8e2632), hexc(0x3a0e14)
HIDE, HIDE_D, FEATHER, EMBER, DARK = hexc(0x6a4428), hexc(0x3a2414), hexc(0xe8e0d0), hexc(0xff4a2a), hexc(0x120806)


def bone(co, n):
    c = mix(BONE_D, BONE, 0.62 + 0.38 * ss(-0.7, 0.4, n.z))
    return mix(c, BONE_L, 0.4 * ss(0.4, 1.0, n.z))


def osso(name, a, b, r, knob=1.6, seg=5):
    """osso longo: haste fina com nó nas duas pontas"""
    out = [tube(name, [a, b], [r, r * 0.85], seg=seg)]
    for p, k in ((a, knob), (b, knob * 0.9)):
        out.append(ball(name + "_knob", p, (r * k, r * k, r * k), seg=(6, 4)))
    for o in out:
        paint(o, bone)
        o["no_ao"] = True
    return out


# ------------------------------------------------------------------ crânio e capuz (centro na origem)
def head():
    parts = {"solid": [], "flat": [], "lit": []}
    sk = meta("skull", [
        EL((0, 0.02, 0.04), (0.095, 0.11, 0.1)),                 # caixa craniana
        EL((-0.058, -0.06, -0.025), (0.032, 0.035, 0.028)),      # maçãs
        EL((0.058, -0.06, -0.025), (0.032, 0.035, 0.028)),
        EL((0, -0.05, -0.075), (0.062, 0.06, 0.03)),             # maxilar
        CAP((-0.07, -0.085, 0.035), (0.07, -0.085, 0.035), 0.022, stiff=1.6),  # arcada
        EL((-0.04, -0.105, 0.0), (0.03, 0.04, 0.028), neg=True),  # órbitas fundas
        EL((0.04, -0.105, 0.0), (0.03, 0.04, 0.028), neg=True),
        EL((0, -0.115, -0.038), (0.012, 0.03, 0.016), neg=True),  # buraco do nariz
    ], res=0.007)
    smooth(sk, iters=2, factor=0.5, target=280)
    paint(sk, bone)
    sk["no_ao"] = True  # dentro do capuz a oclusão escurecia o rosto todo; as órbitas já são peças escuras
    parts["solid"].append(sk)
    for s in (-1, 1):
        sock = ball("socket", (s * 0.04, -0.082, 0.0), (0.026, 0.012, 0.024), seg=(8, 5))
        paint(sock, lambda co, n: DARK)
        parts["flat"].append(sock)
        em = ball("ember", (s * 0.04, -0.092, -0.002), (0.009, 0.006, 0.009), seg=(6, 4))
        paint(em, lambda co, n: EMBER)
        parts["lit"].append(em)
    nose = ball("nose", (0, -0.1, -0.038), (0.01, 0.01, 0.014), seg=(5, 4))
    paint(nose, lambda co, n: DARK)
    parts["flat"].append(nose)
    gap = ball("teethgap", (0, -0.093, -0.08), (0.045, 0.01, 0.006), seg=(8, 3))
    paint(gap, lambda co, n: DARK)
    parts["flat"].append(gap)
    for i in range(4):  # dentes
        x = (i - 1.5) * 0.018
        t = ball("tooth", (x, -0.1 + abs(x) * 0.4, -0.08), (0.007, 0.006, 0.014), seg=(5, 3))
        paint(t, lambda co, n: BONE_L)
        parts["flat"].append(t)
    # capuz: esfera aberta na frente (rosto) e embaixo (pescoço), com espessura; ponta caindo para trás e gola sobre os ombros
    hood = ball("hood", (0, 0.025, 0.04), (0.165, 0.17, 0.17), seg=(14, 9))
    bm = bmesh.new()
    bm.from_mesh(hood.data)
    cut = [f for f in bm.faces if (lambda c: (c.y < -0.02 and (c.x / 0.105) ** 2 + ((c.z + 0.015) / 0.125) ** 2 < 1) or c.z < -0.1)(f.calc_center_median())]
    bmesh.ops.delete(bm, geom=cut, context="FACES")
    bm.to_mesh(hood.data)
    bm.free()
    sol = hood.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.03
    apply_mods(hood)
    smooth(hood)
    tip = tube("hoodtip", [(0, 0.15, 0.12), (0, 0.22, 0.04), (0, 0.25, -0.06)], [0.06, 0.035, 0.004], seg=8)
    smooth(tip)
    collar = meta("collar", [EL((0, 0.06, -0.13), (0.18, 0.15, 0.065)), EL((0, -0.0, -0.13), (0.1, 0.1, 0.1), neg=True)], res=0.012)
    smooth(collar, iters=1, target=200)
    for o in (hood, tip, collar):
        paint(o, lambda co, n: mix(RED_D, RED, 0.35 + 0.65 * ss(-0.5, 0.7, n.z)))
        parts["solid"].append(o)
    return parts


# ------------------------------------------------------------------ tronco: costelas, coluna, clavículas, aljava
def torso():
    z0 = RIG.P("torso")[2]
    out = []
    out += osso("spine", (0, 0.05, z0 - 0.02), (0, 0.05, z0 + 0.48), 0.032, knob=1.3)
    for i in range(5):  # vértebras
        v = ball("vert", (0, 0.06, z0 + 0.03 + i * 0.09), (0.04, 0.032, 0.028), seg=(6, 4))
        paint(v, bone)
        out.append(v)
    for i, z in enumerate((z0 + 0.4, z0 + 0.3, z0 + 0.2)):
        w = 0.16 - i * 0.012
        for s in (-1, 1):
            pts = [(s * 0.025, 0.06, z), (s * w * 0.8, 0.045, z - 0.005), (s * w, -0.02, z - 0.02), (s * w * 0.8, -0.09, z - 0.04),
                   (s * 0.045, -0.125, z - 0.06)]
            r = tube("rib", pts, [0.024, 0.028, 0.028, 0.025, 0.02], seg=5)
            paint(r, bone)
            out.append(r)
    st = tube("sternum", [(0, -0.13, z0 + 0.4), (0, -0.135, z0 + 0.16)], [0.036, 0.026], seg=6, squash=(1.0, 0.5), ref=(0, 1, 0))
    paint(st, bone)
    out.append(st)
    for s in (-1, 1):
        out += osso("clav", (s * 0.03, -0.1, z0 + 0.44), (s * 0.22, -0.01, z0 + 0.46), 0.026, knob=1.2)
        sb = ball("scapula", (s * 0.1, 0.085, z0 + 0.36), (0.06, 0.015, 0.07), rot=(0, s * 0.3, 0), seg=(8, 5))
        paint(sb, bone)
        out.append(sb)
    # aljava de couro nas costas, inclinada, com flechas de penas claras saindo por cima do ombro direito
    qa, qb = Vector((0.12, 0.17, z0 + 0.04)), Vector((-0.12, 0.19, z0 + 0.52))
    q = tube("quiver", [qa, qb], [0.065, 0.078], seg=8)
    paint(q, lambda co, n: mix(HIDE_D, HIDE, 0.4 + 0.6 * ss(-0.5, 0.6, n.z)))
    rim = tube("qrim", [qa.lerp(qb, 0.94), qa.lerp(qb, 1.0)], [0.086, 0.086], seg=8)
    paint(rim, lambda co, n: HIDE_D)
    out += [q, rim]
    d = (qb - qa).normalized()
    for k, (ox, oy) in enumerate(((-0.02, -0.01), (0.02, 0.0), (0.0, 0.025), (-0.025, 0.02), (0.025, 0.03))):
        a = qb + Vector((ox, oy, 0)) - d * 0.05
        b = a + d * (0.24 + 0.04 * (k % 2))
        shaft = tube("arrow", [a, b], [0.012, 0.012], seg=4)
        paint(shaft, lambda co, n: HIDE)
        fl = tube("fletch", [b - d * 0.11, b], [0.04, 0.03], seg=3)
        paint(fl, lambda co, n: FEATHER)
        out += [shaft, fl]
    # correia da aljava atravessando o peito, do ombro direito ao quadril esquerdo, por cima das costelas
    pts = []
    for i in range(7):
        u = i / 6
        x = -0.2 + 0.38 * u
        zz = z0 + 0.46 - 0.4 * u
        pts.append((x, -0.15 + 0.07 * (abs(x) / 0.2) ** 2, zz))
    strap = tube("strap", pts, [0.026] * 7, seg=5, squash=(1.0, 0.3), ref=(0, 1, 0))
    paint(strap, lambda co, n: mix(HIDE_D, HIDE, 0.5 + 0.5 * n.z))
    out.append(strap)
    return {"torso": out}


# ------------------------------------------------------------------ bacia, braços e pernas
def hips():
    z = RIG.P("hips")[2]
    p = meta("pelvis", [
        EL((-0.08, 0.01, z + 0.02), (0.085, 0.05, 0.08), rot=(0, 0.4, 0.3)),  # asas do ilíaco
        EL((0.08, 0.01, z + 0.02), (0.085, 0.05, 0.08), rot=(0, -0.4, -0.3)),
        EL((0, 0.03, z - 0.04), (0.06, 0.04, 0.05)),                          # sacro
        EL((0, -0.03, z - 0.06), (0.05, 0.03, 0.025)),                        # púbis
        EL((0, -0.02, z - 0.02), (0.035, 0.05, 0.04), neg=True),              # vão da bacia
    ], res=0.008)
    smooth(p, iters=1, target=220)
    paint(p, bone)
    # pano rasgado vermelho na cintura, caindo na frente
    cl = tube("loin", [(0, -0.07, z - 0.02), (0, -0.09, z - 0.14), (0, -0.085, z - 0.26)], [0.075, 0.07, 0.05], seg=8,
              squash=(1.0, 0.15), ref=(0, 0, 1))
    paint(cl, lambda co, n: mix(RED_D, RED, 0.6))
    return {"hips": [p, cl]}


def limbs():
    out = {}
    for side, s in (("L", -1), ("R", 1)):
        ax, ay, az = RIG.P("arm" + side)
        out["arm" + side] = osso("humerus", (ax, ay, az), (ax, ay, az - RIG.arm + 0.02), 0.038)
        fx, fy, fz = RIG.P("fore" + side)
        f = []
        f += osso("radius", (fx, fy, fz - 0.02), (fx, fy, fz - HAND + 0.05), 0.03, knob=1.35)
        palm = ball("palm", (fx, fy - 0.01, fz - HAND + 0.03), (0.045, 0.032, 0.045), seg=(7, 5))
        paint(palm, bone)
        f.append(palm)
        for k in (-1.5, -0.5, 0.5, 1.5):
            c = cone("finger", (fx + k * 0.02, fy - 0.015, fz - HAND + 0.01), (fx + k * 0.022, fy - 0.03, fz - HAND - 0.07), 0.014, seg=4)
            paint(c, bone)
            f.append(c)
        out["fore" + side] = f
        hx, hy, hz = RIG.P("thigh" + side)
        out["thigh" + side] = osso("femur", (hx, hy, hz), (hx, hy, hz - RIG.thigh + 0.02), 0.042)
        kx, ky, kz = RIG.P("shin" + side)
        sh = []
        cap_ = ball("kneecap", (kx, ky - 0.04, kz), (0.045, 0.03, 0.045), seg=(7, 5))
        paint(cap_, bone)
        sh.append(cap_)
        sh += osso("tibia", (kx, ky, kz - 0.02), (kx, ky, kz - 0.4), 0.034, knob=1.3)
        foot = meta("foot", [EL((kx, ky - 0.05, kz - 0.43), (0.055, 0.09, 0.032)), EL((kx, ky + 0.01, kz - 0.42), (0.045, 0.045, 0.04))],
                    res=0.01)
        smooth(foot, iters=1, target=90)
        paint(foot, bone)
        sh.append(foot)
        for k in (-1, 0, 1):
            t = cone("toe", (kx + k * 0.03, ky - 0.12, kz - 0.435), (kx + k * 0.034, ky - 0.17, kz - 0.445), 0.016, seg=4)
            paint(t, bone)
            sh.append(t)
        out["shin" + side] = sh
    return out


# ------------------------------------------------------------------ manto (osso cape)
def cloak():
    cx, cy, cz = RIG.P("cape")
    bm = bmesh.new()
    R, C = 6, 9
    grid = []
    for i in range(R + 1):
        u = i / R
        z = cz - 0.02 - 1.12 * u
        w = 0.32 + 0.26 * u   # abre para os lados embaixo: mancha mais larga vista de cima
        row = []
        for j in range(C + 1):
            v = j / C * 2 - 1
            x = v * w
            # atrás da aljava, abraçando os ombros dos lados; a barra vem para a frente porque o osso cape já inclina para trás
            y = 0.27 - 0.2 * u - (0.25 - 0.1 * u) * v * v
            zz = z
            if i == R:  # barra rasgada em pontas
                zz += 0.09 if j % 2 else -0.02
                zz += 0.04 * math.sin(j * 2.3)
            row.append(bm.verts.new((x, y, zz)))
        grid.append(row)
    for i in range(R):
        for j in range(C):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    c = new_mesh("cloak", bm)
    sol = c.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.025
    sol.offset = 0
    apply_mods(c)
    for p in c.data.polygons:
        p.use_smooth = True
    paint(c, lambda co, n: mix(RED_D, RED, 0.3 + 0.7 * ss(0.3, cz, co.z) * (0.6 + 0.4 * abs(n.y))))
    return {"cape": [c]}


if __name__ == "__main__":
    reset()
    parts = merge(place_head(RIG, head(), lift=0.1), torso(), hips(), limbs(), cloak())
    finish("archer", RIG, parts, ARGS, body_center=(0, 0, 0.95), body_dist=4.2, head_dist=1.1)
