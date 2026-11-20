# Gravekeeper (chefe: coveiro encapuzado sem rosto, pá numa mão e lanterna na outra) modelado no Blender (M1-06).
# Brief: docs/briefs/gravekeeper.md. Rodar: ver tools/blender/README.md. Pá e lanterna ficam por código (gravekeeperShovel e
# gravekeeperLantern em cast-bosses.ts). Bípede de manto: pernas escuras sob a saia (osso "skirt"), mangas em sino que caem para o
# chão na pose de repouso da receita (POSE_R, POSE_L, LEAN, OUT).
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from mathutils import Matrix, Vector  # noqa: E402
from humanoid import Rig, finish, merge, place_head  # noqa: E402
from robed import bell_sleeve, fore_rot, local_dir, ring_loft  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
RIG = Rig(hipY=1.0, headY=0.5, shoulderY=0.5, shoulderX=0.36, arm=0.36, hipX=0.17, thigh=0.46, bulk=1.15)
HAND = 0.41
POSE_R, POSE_L, LEAN, OUT = (-0.3, -0.6), (-0.35, -1.9), 0.18, 0.5
HOOD_LIFT, HOOD_SCALE = 0.15, 1.06

ROBE, ROBE_D, ROBE_L = hexc(0x5a605c), hexc(0x2e3331), hexc(0x767c77)
MANTLE, MANTLE_D, MANTLE_L = hexc(0x60655d), hexc(0x34382f), hexc(0x767b70)
TRIM, VOID = hexc(0x8e8f78), hexc(0x050707)
EYE = hexc(0x7dffc0)
PALE, PALE_D = hexc(0xe0cfa0), hexc(0xa08c62)
HIDE, HIDE_D, BRASS = hexc(0x5e3c22), hexc(0x2e1c10), hexc(0x9a9a92)
LEG, LEG_D, SHOE = hexc(0x2a2d2c), hexc(0x121414), hexc(0x17181a)


def cloth(base, dark, light=None, lo=-0.7, hi=0.5):
    def f(co, n):
        c = mix(dark, base, 0.35 + 0.65 * ss(lo, hi, n.z))
        return mix(c, light, 0.35 * ss(0.5, 1.0, n.z)) if light else c
    return f


def pale(co, n):
    return mix(PALE_D, PALE, 0.4 + 0.6 * ss(-0.6, 0.6, n.z - 0.3 * n.y))


# ------------------------------------------------------------------ capuz pontudo com a abertura funda e escura; só os olhos acendem
def head():
    parts = {"solid": [], "flat": [], "lit": []}
    h = meta("hood", [
        EL((0, 0.02, 0.0), (0.225, 0.25, 0.25)),
        CAP((0, 0.06, 0.1), (0, 0.19, 0.18), 0.065),                  # ponta caída para trás
        EL((0, 0.07, -0.17), (0.25, 0.22, 0.09)),                     # a base abre sobre a pelerine, atrás da abertura
        EL((0, -0.2, -0.03), (0.155, 0.17, 0.21), neg=True),          # abertura do rosto, até a base
    ], res=0.008)
    smooth(h, iters=2, factor=0.5, target=900)

    def tint(co, n):
        c = mix(MANTLE_D, MANTLE, 0.3 + 0.7 * ss(-0.6, 0.7, n.z))
        c = mix(c, MANTLE_L, 0.3 * ss(0.5, 1.0, n.z))
        # borda da abertura um pouco mais clara; o lado de dentro some no escuro
        r = math.hypot(co.x / 0.155, co.z / 0.185)
        if co.y < -0.1:
            if n.y > 0.2 or r < 0.92:
                return VOID
            c = mix(c, TRIM, 0.55 * ss(1.25, 1.0, r))
        return c
    paint(h, tint)
    parts["solid"].append(h)
    void = ball("void", (0, -0.02, -0.02), (0.17, 0.15, 0.205), seg=(14, 10))
    smooth(void)   # sombreado suave: com faces chapadas a luz da lanterna desenhava facetas cinza no escuro
    paint(void, lambda co, n: VOID)
    parts["flat"].append(void)
    for s in (-1, 1):
        e = ball("eye", (s * 0.058, -0.178, 0.005), (0.02, 0.01, 0.012), rot=(0, s * 0.2, 0), seg=(8, 6))
        paint(e, lambda co, n: EYE)
        parts["lit"].append(e)
    return parts


def front_strip(name, obj, xz, r, color, squash=0.4):
    """faixa fina deitada na frente de obj, pelos pontos (x, z)"""
    pts = []
    for x, z in xz:
        ok, hit, n, _ = obj.ray_cast(Vector((x, -1.5, z)), Vector((0, 1, 0)))
        if ok:
            pts.append(hit + n * r * squash * 0.6)
    t = tube(name, pts, [r] * len(pts), seg=6, squash=(1.0, squash), ref=(0, 1, 0))
    paint(t, lambda co, n: color)
    return t


# ------------------------------------------------------------------ tronco e pelerine larga com barra clara e rasgada
def torso():
    z0 = RIG.P("torso")[2]
    t = meta("chest", [
        EL((0, 0.0, z0 + 0.32), (0.25, 0.17, 0.24)),
        EL((0, 0.0, z0 + 0.1), (0.21, 0.155, 0.14)),
        CAP((0, 0.0, z0 + 0.4), (0, 0.0, z0 + 0.6), 0.09),           # pescoço sob o capuz
    ], res=0.012)
    smooth(t, iters=2, target=420)
    paint(t, cloth(ROBE, ROBE_D, ROBE_L))
    out = [t]
    zt = z0 + 0.63
    # pelerine: a frente desce em V sob a abertura do capuz, os lados cobrem os ombros
    tilt = lambda k: (0, 0.55 * k, -1)
    rings = [((0, 0.03, zt), tilt(1.0), 0.19, 0.16, 0, 0),
             ((0, 0.04, zt - 0.06), tilt(0.8), 0.36, 0.27, 7, 0.015),
             ((0, 0.05, zt - 0.17), tilt(0.25), 0.46, 0.35, 9, 0.035),
             ((0, 0.05, zt - 0.3), tilt(0.0), 0.48, 0.37, 9, 0.045),
             ((0, 0.05, zt - 0.36), tilt(0.0), 0.48, 0.37, 9, 0.045)]
    m = ring_loft("mantle", rings, seg=36, thick=0.02, jag=lambda j: 0.05 * (j % 12 == 3) + 0.008 * math.sin(j * 1.3))
    smooth(m, iters=3, factor=0.5)
    hem = zt - 0.29

    def mtint(co, n):
        c = cloth(MANTLE, MANTLE_D, MANTLE_L)(co, n)
        if co.z < hem:
            c = mix(c, TRIM, 0.95)
        return c
    paint(m, mtint)
    out.append(m)
    # fecho de osso descendo pelo peito, como a coluna clara do sprite
    out.append(front_strip("clasp", t, [(0, z0 + 0.35), (0, z0 + 0.22), (0, z0 + 0.1)], 0.022, PALE, squash=0.6))
    for z in (z0 + 0.32, z0 + 0.22, z0 + 0.12):
        out.append(front_strip("tie", t, [(-0.035, z), (0.035, z)], 0.012, PALE_D, squash=0.6))
    return {"torso": out}


# ------------------------------------------------------------------ cinto largo com fivela e bolsa (quadril)
def hips():
    z = RIG.P("hips")[2]
    belt = tube("belt", [(0, 0.0, z - 0.02), (0, 0.0, z + 0.2)], [0.25, 0.25], seg=22)
    belt.data.transform(Matrix.Diagonal((1.0, 0.8, 1.0, 1.0)))
    paint(belt, cloth(HIDE, HIDE_D))
    out = [belt]
    buck = ball("buckle", (0, -0.205, z + 0.085), (0.075, 0.025, 0.07), seg=(4, 2), rot=(0, 0, math.pi / 4))
    paint(buck, lambda co, n: mix(hexc(0x4a4c50), BRASS, 0.4 + 0.6 * ss(-0.5, 0.6, n.z - n.y)))
    hole = ball("buckle_in", (0, -0.222, z + 0.085), (0.035, 0.01, 0.032), seg=(4, 2), rot=(0, 0, math.pi / 4))
    paint(hole, lambda co, n: HIDE_D)
    pouch = meta("pouch", [EL((-0.19, -0.14, z + 0.0), (0.07, 0.05, 0.08))], res=0.01)
    smooth(pouch, target=120)
    paint(pouch, cloth(HIDE, HIDE_D))
    flap = ball("flap", (-0.19, -0.18, z + 0.05), (0.072, 0.025, 0.035), seg=(8, 5))
    paint(flap, cloth(hexc(0x5e3a1e), HIDE_D))
    return {"hips": [belt, buck, pouch, flap], "hips@flat": [hole]}


# ------------------------------------------------------------------ saia longa rasgada na barra, forro escuro, cordões claros
SK = ((1.13, 0.225, 0.18), (0.96, 0.27, 0.215), (0.72, 0.35, 0.28), (0.46, 0.44, 0.35), (0.26, 0.5, 0.4))


def skirt():
    rings = [((0, 0.0, z), (0, 0, -1), rx, ry, 8 if i else 0, 0.02 + 0.02 * i) for i, (z, rx, ry) in enumerate(SK)]

    def jag(j):  # tiras rasgadas: pontas desiguais
        return 0.13 * (j % 5 == 1) + 0.07 * (j % 7 == 3) + 0.04 * math.sin(j * 2.7) - 0.03

    sk = ring_loft("robe", rings, seg=40, thick=0.024, jag=jag)
    smooth(sk, iters=1, factor=0.3)

    def tint(co, n):
        rad = Vector((co.x, co.y, 0))
        inside = rad.length > 1e-4 and n.dot(rad.normalized()) < -0.2
        if inside:
            return mix(VOID, ROBE_D, 0.3)
        c = cloth(ROBE, ROBE_D, ROBE_L)(co, n)
        # rasgos e manchas escuras perto da barra
        k = math.sin(co.x * 23 + co.z * 9) * math.sin(math.atan2(co.y, co.x) * 7 + co.z * 5)
        if co.z < 0.62 and k > 0.45:
            c = mix(c, VOID, 0.75)
        elif co.z < 0.5 and k < -0.6:
            c = mix(c, TRIM, 0.45)   # remendos mais claros
        return mix(c, ROBE_D, 0.4 * ss(0.5, 0.25, co.z))
    paint(sk, tint)
    out = [sk]
    flat = []

    def ry_at(z):
        for (z1, _, r1), (z2, _, r2) in zip(SK, SK[1:]):
            if z2 <= z <= z1:
                return r1 + (r2 - r1) * (z1 - z) / (z1 - z2)
        return SK[-1][2]

    for x0, ln in ((-0.05, 0.36), (0.035, 0.3)):   # cordões claros pendurados do cinto
        zs = [1.08 - ln * k / 4 for k in range(5)]
        pts = [(x0 + 0.01 * k, -ry_at(z) - 0.025, z) for k, z in enumerate(zs)]
        c = tube("strap", pts, [0.014] * 5, seg=6, squash=(1.0, 0.5), ref=(0, 1, 0))
        paint(c, lambda co, n: mix(hexc(0x5e4428), hexc(0x9a7c54), 0.5 + 0.5 * ss(-0.5, 0.5, n.z - n.y)))
        flat.append(c)
        knot = ball("knot", (pts[-1][0], pts[-1][1], pts[-1][2] - 0.01), (0.03, 0.022, 0.03), seg=(8, 6))
        paint(knot, lambda co, n: hexc(0x6a4a2a))
        out.append(knot)
    return {"skirt": out, "skirt@flat": flat}


# ------------------------------------------------------------------ pernas escuras e sapatos de bico
def legs():
    out = {}
    for side, s in (("L", -1), ("R", 1)):
        hx, _, hz = RIG.P("thigh" + side)
        th = tube("thigh", [(hx, 0, hz), (hx, 0, hz - RIG.thigh)], [0.11, 0.085], seg=10)
        smooth(th, iters=1)
        paint(th, cloth(LEG, LEG_D))
        kx, _, kz = RIG.P("shin" + side)
        sh = tube("shin", [(kx, 0, kz), (kx, 0.0, 0.1)], [0.085, 0.065], seg=10)
        smooth(sh, iters=1)
        paint(sh, cloth(LEG, LEG_D))
        shoe = meta("shoe", [EL((kx, -0.06, 0.065), (0.09, 0.15, 0.07)), EL((kx + s * 0.01, -0.2 + 0.05 * (s > 0), 0.05), (0.065, 0.08, 0.05))], res=0.01)
        smooth(shoe, iters=1, target=160)
        paint(shoe, cloth(SHOE, hexc(0x050505), hexc(0x3a3c40)))
        out["thigh" + side] = [th]
        out["shin" + side] = [sh, shoe]
    return out


# ------------------------------------------------------------------ braços: manga larga caindo em sino rasgado, mão pálida fechada
def fist(h, grip_axis):
    """punho fechado em volta de um cabo que passa por h na direção grip_axis (espaço do osso)"""
    g = Vector(grip_axis).normalized()
    out = []
    palm = ball("palm", tuple(h), (0.062, 0.058, 0.075), seg=(10, 8))
    paint(palm, pale)
    out.append(palm)
    for k in range(4):   # quatro dedos curvados em volta do cabo
        base = h + g * (0.045 - k * 0.03)
        f = tube("finger", [base + Vector((0, -0.04, 0.02)), base + Vector((0, -0.075, -0.01)), base + Vector((0, -0.06, -0.05))],
                 [0.017, 0.016, 0.012], seg=6)
        paint(f, pale)
        out.append(f)
    for o in out:
        smooth(o)
        o["no_ao"] = True   # a oclusão da manga deixava o punho cinza como pedra
    return out


def arms():
    out = {}
    for side, s, pose in (("L", -1, POSE_L), ("R", 1, POSE_R)):
        ax, ay, az = RIG.P("arm" + side)
        up = meta("sleeveU", [CAP((ax, ay, az - 0.1), (ax, ay, az - RIG.arm), 0.085)], res=0.012)
        smooth(up, iters=1, target=200)
        paint(up, cloth(ROBE, ROBE_D, ROBE_L))
        fr, _ = fore_rot(pose, s, LEAN, OUT)
        down = local_dir(fr, (0, 0, -1))
        e = Vector(RIG.P("fore" + side))
        fore = tube("fore", [e, e + Vector((0, 0, -0.2))], [0.085, 0.08], seg=12)
        paint(fore, cloth(ROBE, ROBE_D, ROBE_L))
        # manga em sino do cotovelo até além do pulso, com a boca rasgada pendendo para o chão
        # o antebraço da lanterna fica quase deitado: a manga é mais curta e cai mais, para não passar da mão como um focinho
        ln, sag, r1 = (0.34, 0.75, 0.24) if side == "R" else (0.3, 1.0, 0.19)   # a da lanterna não pode tampar a luz
        sl = bell_sleeve("sleeve", e + Vector((0, 0, 0.04)), down, ln, 0.09, r1, sag=sag, folds=5, famp=0.08,
                         jag=lambda j: 0.08 * (j % 4 == 0) + 0.03 * (j % 3), thick=0.02)
        mouth = e + Vector((0, 0, -0.34 if side == "R" else -0.2)) + down * (0 if side == "R" else 0.2)
        paint(sl, lambda co, n, m=mouth: mix(ROBE_D, VOID, 0.4) if (co - m).length < 0.08 else cloth(ROBE, ROBE_D, ROBE_L, lo=-1.1, hi=0.3)(co, n))
        wrist = tube("wrist", [e + Vector((0, 0, -0.3)), e + Vector((0, 0, -HAND + 0.04))], [0.04, 0.045], seg=8)
        paint(wrist, pale)
        hand = e + Vector((0, 0, -HAND))
        # cabo da pá e argola da lanterna ficam na vertical do mundo: o punho fecha em volta dessa direção
        grip = local_dir(fr, (0, 0, 1)) if side == "R" else Vector((1, 0, 0))
        for o in (up, fore, sl):
            o["no_ao"] = True   # a oclusão assada sob a pelerine aparecia em manchas pretas quando o braço abre
        out["arm" + side] = [up]
        out["fore" + side] = [fore, sl, wrist] + fist(hand, grip)
    return out


if __name__ == "__main__":
    reset()
    parts = merge(place_head(RIG, head(), lift=HOOD_LIFT, scale=HOOD_SCALE, fwd=0.05), torso(), hips(), skirt(), legs(), arms())
    finish("gravekeeper", RIG, parts, ARGS, body_center=(0, 0, 1.0), body_dist=5.0, head_dist=1.6)
