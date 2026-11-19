# Bombardier (anão de óculos com canhão no ombro) modelado no Blender (M3-05). Brief: docs/briefs/bombardier.md.
# Rodar: ver tools/blender/README.md. Base dos anões em dwarf.py. A bomba fica por código (bombardierBomb em cast-enemies.ts), na mão
# esquerda; o arremesso é com a esquerda (estilo throwL).
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from humanoid import finish, merge, place_head  # noqa: E402
from dwarf import HAND, RIG, arm, face, leg, shade, strip, torso_mass  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

SKIN, SKIN_D = hexc(0xf4a070), hexc(0xa0583a)
BEARD, BEARD_D = hexc(0xf27a24), hexc(0x9a3a10)
CAPC, CAP_D = hexc(0xa8643a), hexc(0x5a3018)
BRASS, BRASS_D, LENS, LENS_D = hexc(0xd8aa50), hexc(0x7a5420), hexc(0xf4d890), hexc(0xa87830)
COAT, COAT_D = hexc(0x4a5468), hexc(0x1e222e)
LEATH, LEATH_D = hexc(0x9a6236), hexc(0x4a2c18)
PANTS, PANTS_D = hexc(0x8a5a34), hexc(0x3e2614)
BOOT, BOOT_D = hexc(0x5a3a22), hexc(0x221408)
WOOD, WOOD_D, BAND, BAND_D = hexc(0xe8a850), hexc(0x7a4418), hexc(0x4a4448), hexc(0x1c1a1e)
DARK = hexc(0x120c08)


def disc(name, center, normal, r, thick=0.008, seg=16):
    """disco fino perpendicular a normal (boca do canhão, lente)"""
    o = ball(name, (0, 0, 0), (r, r, thick), seg=(seg, 4))
    q = Vector(normal).to_track_quat("Z", "Y")
    o.data.transform(Matrix.Translation(Vector(center)) @ q.to_matrix().to_4x4())
    o.data.update()
    return o


# ------------------------------------------------------------------ cabeça: gorro de aviador com abas e óculos na testa
def head():
    parts = face(SKIN, SKIN_D, BEARD, BEARD_D, DARK, beard_len=1.05)
    cap = meta("cap", [EL((0, 0.015, 0.035), (0.152, 0.152, 0.14)),
                       EL((0, -0.16, -0.03), (0.13, 0.1, 0.15), neg=True),             # abre o rosto até a testa
                       EL((-0.138, -0.02, -0.075), (0.035, 0.065, 0.1)),               # abas das orelhas, compridas
                       EL((0.138, -0.02, -0.075), (0.035, 0.065, 0.1))], res=0.008)
    smooth(cap, iters=1, target=300)
    paint(cap, lambda co, n: mix(CAP_D, CAPC, (0.35 + 0.65 * ss(-0.6, 0.6, n.z)) * (0.88 + 0.12 * math.cos(co.x * 40))))
    parts["solid"].append(cap)
    # sem borda em volta do rosto: com contorno ela virava uma faixa preta sobre os olhos; fica só o recorte do gorro
    seam = tube("seam", [(0, -0.12, 0.15), (0, -0.02, 0.19), (0, 0.09, 0.16), (0, 0.15, 0.06)], [0.01] * 4, seg=5)  # costura
    paint(seam, lambda co, n: CAP_D)
    parts["flat"].append(seam)
    # óculos de aviador empurrados para a testa: dois aros de latão com lente clara e a tira por trás
    for s in (-1, 1):
        x = s * 0.058
        rim = tube("rim", [(x, -0.1, 0.135), (x, -0.135, 0.165)], [0.042, 0.044], seg=12)
        paint(rim, lambda co, n: mix(BRASS_D, BRASS, 0.4 + 0.6 * ss(-0.5, 0.6, n.z)))
        parts["solid"].append(rim)
        lens = disc("lens", (x, -0.137, 0.168), (0, -0.65, 0.76), 0.032)
        paint(lens, lambda co, n, x=x: mix(LENS_D, LENS, ss(-0.02, 0.025, co.z - 0.168 - (co.x - x) * 0.6)))
        parts["flat"].append(lens)
    bridge = tube("bridge", [(-0.02, -0.132, 0.162), (0.02, -0.132, 0.162)], [0.012, 0.012], seg=6)
    paint(bridge, lambda co, n: BRASS_D)
    parts["solid"].append(bridge)
    return parts


# ------------------------------------------------------------------ tronco: casaco azul-marinho, colete de couro, bandoleira, canhão
def torso():
    z0 = RIG.P("torso")[2]

    def tint(co, n):
        if co.y < -0.06 and abs(co.x) < 0.17 + 0.05 * ss(z0 + 0.35, z0 + 0.05, co.z) and co.z < z0 + 0.42:
            return mix(LEATH_D, LEATH, 0.4 + 0.6 * ss(-0.7, 0.5, n.z))   # colete de couro, aberto embaixo
        return mix(COAT_D, COAT, 0.35 + 0.65 * ss(-0.7, 0.5, n.z))
    t = torso_mass(z0, RIG.shoulderX, tint, extra=[EL((0, 0.02, z0 - 0.06), (0.25, 0.2, 0.1))])   # aba do casaco sobre o quadril
    parts = [t]
    # bandoleira do canhão: do ombro direito até o quadril esquerdo, com duas bolsinhas
    band = strip("band", t, [(0.26, z0 + 0.4), (0.12, z0 + 0.26), (-0.06, z0 + 0.12), (-0.22, z0 + 0.0)], 0.045, LEATH, squash=0.5)
    if band:
        parts.append(band)
    for x, z in ((0.06, z0 + 0.2), (-0.11, z0 + 0.07)):
        ok, hit, n, _ = t.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
        p = ball("pouch", tuple(hit + n * 0.02), (0.045, 0.03, 0.04), seg=(8, 5))
        paint(p, shade(LEATH, LEATH_D))
        parts.append(p)
    # botões de latão do casaco, na borda do colete
    for z in (z0 + 0.32, z0 + 0.22, z0 + 0.12):
        for s in (-1, 1):
            x = s * (0.14 + 0.05 * ss(z0 + 0.35, z0 + 0.05, z))
            ok, hit, n, _ = t.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
            if ok:
                bt = ball("button", tuple(hit + n * 0.006), (0.016, 0.01, 0.016), seg=(6, 4))
                paint(bt, lambda co, n: BRASS)
                parts.append(bt)
    # canhão de madeira nas costas: sai de baixo, atrás do quadril esquerdo, e passa sobre o ombro direito com a boca em sino
    # inclinado para trás e para fora: a boca passa bem do contorno da cabeça
    a, b = Vector((-0.08, 0.2, z0 + 0.22)), Vector((0.56, 0.34, z0 + 0.86))   # apoiado no ombro; a boca passa da cabeça, por fora
    ax = (b - a).normalized()
    ts = [0.0, 0.06, 0.5, 0.78, 0.9, 1.0]
    rs = [0.095, 0.11, 0.11, 0.12, 0.155, 0.19]   # boca em sino, 1,7x o tubo
    can = tube("cannon", [a + (b - a) * t for t in ts], rs, seg=14)
    smooth(can)

    def ctint(co, n):
        k = (Vector(co) - a).dot(ax) / (b - a).length
        if k > 0.985 and (Vector(co) - (a + (b - a) * k)).length < 0.15:
            return DARK  # boca
        return mix(WOOD_D, WOOD, (0.4 + 0.6 * ss(-0.6, 0.6, n.z)) * (0.85 + 0.15 * math.cos(k * 60)))
    paint(can, ctint)
    parts.append(can)
    bore = disc("bore", b + ax * 0.004, ax, 0.145)
    paint(bore, lambda co, n: DARK)
    for k, r in ((0.08, 0.113), (0.42, 0.113), (0.8, 0.125)):   # cintas escuras
        c = a + (b - a) * k
        ring = tube("cband", [c - ax * 0.025, c + ax * 0.025], [r, r], seg=14)
        paint(ring, lambda co, n: mix(BAND_D, BAND, 0.4 + 0.6 * ss(-0.6, 0.6, n.z)))
        parts.append(ring)
    lip = tube("lip", [b - ax * 0.04, b + ax * 0.004], [0.198, 0.204], seg=16)   # borda da boca, de latão
    paint(lip, lambda co, n: mix(BRASS_D, BRASS, 0.4 + 0.6 * ss(-0.5, 0.6, n.z)))
    parts.append(lip)
    return {"torso": parts, "torso@flat": [bore]}


def hips():
    z = RIG.P("hips")[2]
    p = meta("hips", [EL((0, 0.0, z), (0.24, 0.18, 0.13)), EL((0, 0.0, z - 0.08), (0.2, 0.16, 0.08))], res=0.012)
    smooth(p, iters=1, target=200)
    paint(p, shade(PANTS, PANTS_D))
    belt = tube("belt", [(0, 0.0, z + 0.05), (0, 0.0, z + 0.12)], [0.26, 0.255], seg=18)
    paint(belt, lambda co, n: mix(LEATH_D, LEATH, 0.3 + 0.4 * ss(-0.6, 0.6, n.z)))
    buckle = tube("buckle", [(0, -0.245, z + 0.085), (0, -0.275, z + 0.085)], [0.05, 0.05], seg=4, twist=math.pi / 4)
    paint(buckle, lambda co, n: BRASS)
    parts = [p, belt, buckle]
    for s in (-1, 1):   # bolsas de couro nos lados do cinto
        pc = ball("bag", (s * 0.21, -0.12, z + 0.0), (0.06, 0.045, 0.07), seg=(10, 6))
        paint(pc, shade(LEATH, LEATH_D))
        fl = ball("flap", (s * 0.21, -0.145, z + 0.04), (0.062, 0.03, 0.03), seg=(10, 5))
        paint(fl, shade(LEATH_D, BOOT_D))
        parts += [pc, fl]
    return {"hips": parts}


def limbs():
    sleeve = lambda co, n, z: mix(COAT_D, COAT, 0.35 + 0.65 * ss(-0.7, 0.5, n.z))   # noqa: E731
    glove = lambda co, n: mix(LEATH_D, LEATH, 0.4 + 0.6 * ss(-0.6, 0.6, n.z))       # noqa: E731
    cuff = lambda co, n: mix(LEATH_D, LEATH, 0.35 + 0.4 * ss(-0.6, 0.6, n.z))       # noqa: E731
    out = {}
    for side in ("L", "R"):
        out = merge(out, arm(side, sleeve, sleeve, glove, sleeve_cuff=cuff, k=1.12, fist=1.35),
                    leg(side, shade(PANTS, PANTS_D), shade(BOOT, BOOT_D), boot_top=shade(LEATH, LEATH_D)))
    return out


if __name__ == "__main__":
    reset()
    parts = merge(place_head(RIG, head(), lift=0.13, scale=1.36, fwd=0.03, tilt=-0.2), torso(), hips(), limbs())
    finish("bombardier", RIG, parts, ARGS, body_center=(0, 0, 0.75), body_dist=3.4, head_dist=1.2)
