# Spellcaster (feiticeiro de pele azul, coroa de cristais magenta, gola alta vinho, manto verde-azulado e cetro) modelado no
# Blender (M3-04). Brief: docs/briefs/spellcaster.md. Rodar: ver tools/blender/README.md. Forma "robed": sem pernas, o manto
# fica no osso "skirt"; o cetro fica no osso foreR, em pé no mundo na pose de repouso da receita (POSE_R, LEAN, OUT).
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from humanoid import Rig, finish, merge, place_head  # noqa: E402
from robed import bell_sleeve, fore_rot, local_dir, ring_loft  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
RIG = Rig(hipY=0.86, headY=0.6, shoulderY=0.46, shoulderX=0.25, arm=0.32, hipX=0.12, thigh=0.42)
HAND = 0.28
# a mesma pose da receita (cast-enemies.ts): braço do cetro aberto com o antebraço em pé, o outro pendendo
POSE_R, POSE_L, LEAN, OUT = (-0.75, -2.15, 0.1, 0.9), (0.1, -0.55), 0.2, 0.05
HEAD_LIFT, HEAD_SCALE = 0.12, 1.2

SKIN, SKIN_D, SKIN_L = hexc(0x99bcc9), hexc(0x4f7484), hexc(0xc4dde6)
ROBE, ROBE_L, ROBE_D, HEM = hexc(0x2a7474), hexc(0x40928c), hexc(0x123a3c), hexc(0x2d152c)
COL, COL_D, LINING = hexc(0x6a2246), hexc(0x2e0c1c), hexc(0xa01a72)
CRY, CRY_L, CRY_D = hexc(0xd82ac0), hexc(0xff8ce8), hexc(0x5a0a48)
WOOD, WOOD_D, DARK, EYE = hexc(0x6a4278), hexc(0x3a2244), hexc(0x0a0610), hexc(0xd04fb0)


def cloth(base, dark, light=None):
    def f(co, n):
        c = mix(dark, base, 0.35 + 0.65 * ss(-0.7, 0.5, n.z))
        return mix(c, light, 0.35 * ss(0.5, 1.0, n.z)) if light else c
    return f


def skin(co, n):
    c = mix(SKIN_D, SKIN, 0.45 + 0.55 * ss(-0.6, 0.5, n.z - 0.3 * n.y))
    return mix(c, SKIN_L, 0.3 * ss(0.5, 1.0, -n.y + n.z))


def crystal(name, base, tip, r, seg=5, low=0.25):
    """cristal facetado: pirâmide longa para cima e curta para baixo"""
    base, tip = Vector(base), Vector(tip)
    d = tip - base
    up = cone(name, base, tip, r, seg=seg)
    dn = cone(name + "b", base, base - d * low, r, seg=seg)
    for o in (up, dn):
        flat_shade(o)
        paint(o, lambda co, n, b=base, d=d: mix(CRY_D, mix(CRY, CRY_L, ss(0.55, 1.0, (co - b).dot(d) / d.length_squared)),
                                                   ss(-0.2, 0.25, (co - b).dot(d) / d.length_squared)))
    return [up, dn]


# ------------------------------------------------------------------ cabeça: rosto azul chupado e coroa de cristais
def head():
    parts = {"solid": [], "flat": [], "lit": []}
    h = meta("head", [
        EL((0, 0.015, 0.03), (0.084, 0.094, 0.098)),                 # crânio
        EL((0, -0.035, -0.035), (0.066, 0.068, 0.09)),               # rosto comprido
        CAP((0, -0.055, -0.1), (0, -0.07, -0.14), 0.024),            # queixo fino
        EL((-0.052, -0.068, 0.0), (0.028, 0.03, 0.024)),             # maçãs altas
        EL((0.052, -0.068, 0.0), (0.028, 0.03, 0.024)),
        CAP((-0.066, -0.078, 0.06), (-0.01, -0.094, 0.036), 0.019, stiff=1.6),  # arcada em V, ponta de dentro mais baixa
        CAP((0.066, -0.078, 0.06), (0.01, -0.094, 0.036), 0.019, stiff=1.6),
        CAP((0, -0.09, 0.03), (0, -0.112, -0.03), 0.014),            # nariz longo
        EL((-0.052, -0.09, -0.06), (0.026, 0.03, 0.03), neg=True),   # bochechas fundas
        EL((0.052, -0.09, -0.06), (0.026, 0.03, 0.03), neg=True),
        EL((-0.034, -0.1, 0.018), (0.024, 0.026, 0.018), neg=True),  # órbitas fundas
        EL((0.034, -0.1, 0.018), (0.024, 0.026, 0.018), neg=True),
    ], res=0.006)
    smooth(h, iters=2, factor=0.5, target=520)
    paint(h, skin)
    parts["solid"].append(h)
    for s in (-1, 1):
        ear = tube("ear", [(s * 0.07, 0.0, 0.01), (s * 0.105, 0.03, 0.04), (s * 0.13, 0.05, 0.075)], [0.028, 0.018, 0.003],
                   seg=8, squash=(1.0, 0.4), ref=(0, 1, 0))
        smooth(ear)
        paint(ear, skin)
        parts["solid"].append(ear)
        sock = ball("socket", (s * 0.034, -0.083, 0.016), (0.022, 0.01, 0.014), rot=(0, s * 0.25, 0), seg=(8, 5))
        paint(sock, lambda co, n: DARK)
        parts["flat"].append(sock)
        eye = ball("eye", (s * 0.033, -0.091, 0.014), (0.009, 0.005, 0.006), seg=(6, 4))
        paint(eye, lambda co, n: EYE)
        parts["lit"].append(eye)
    mouth = tube("mouth", [(-0.026, -0.093, -0.088), (0, -0.101, -0.08), (0.026, -0.093, -0.088)], [0.0045] * 3, seg=5)
    paint(mouth, lambda co, n: DARK)
    parts["flat"].append(mouth)
    # coroa: aro escuro e cristais em volta, o da frente o mais alto
    band = tube("band", [(0.0, 0.0, 0.07), (0.0, 0.0, 0.095)], [0.088, 0.092], seg=16)
    paint(band, lambda co, n: mix(COL_D, COL, 0.5 + 0.5 * n.z))
    parts["solid"].append(band)
    # cristais grossos em magenta vivo (de cima, os finos e foscos liam como cabelo espetado; acesos, estouravam em branco no bloom)
    for ang, hgt, r in ((0, 0.2, 0.05), (-0.65, 0.15, 0.044), (0.65, 0.15, 0.044), (-1.5, 0.11, 0.04), (1.5, 0.11, 0.04),
                        (math.pi, 0.1, 0.04)):
        bx_, by_ = 0.088 * math.sin(ang), -0.088 * math.cos(ang)
        out = Vector((bx_, by_, 0)).normalized() * 0.03
        parts["solid"].extend(crystal("cry", (bx_, by_, 0.085), (bx_ + out.x, by_ + out.y, 0.085 + hgt), r, seg=4, low=0.3))
    return parts


# ------------------------------------------------------------------ tronco: manto, gola alta de vampiro, cinto
def torso():
    z0 = RIG.P("torso")[2]
    sx = RIG.shoulderX
    t = meta("torso", [
        EL((0, 0.0, z0 + 0.3), (0.2, 0.13, 0.16)),
        EL((0, 0.0, z0 + 0.1), (0.15, 0.11, 0.12)),
        EL((-sx + 0.04, 0.0, z0 + 0.42), (0.08, 0.08, 0.06)),
        EL((sx - 0.04, 0.0, z0 + 0.42), (0.08, 0.08, 0.06)),
        CAP((0, 0.0, z0 + 0.42), (0, 0.0, z0 + 0.56), 0.045),
    ], res=0.012)
    smooth(t, iters=2, target=360)

    def tint(co, n):
        if co.z > z0 + 0.49:
            return skin(co, n)
        if co.y < -0.05 and abs(co.x) < 0.022:
            return ROBE_D                       # abertura escura no meio da frente
        return cloth(ROBE, ROBE_D, ROBE_L)(co, n)
    paint(t, tint)
    belt = tube("belt", [(0, 0.0, z0 + 0.03), (0, 0.0, z0 + 0.055)], [0.156, 0.154], seg=16)
    paint(belt, cloth(COL_D, hexc(0x0a0206)))
    # gola: pano em anéis que sobe atrás da cabeça e se abre em V na frente; vinho por fora, carmim por dentro
    zs = z0 + 0.4
    rings = []
    # gola contínua em arco atrás da cabeça, presa ao peito pelas duas frentes e abrindo para fora em pontas sobre os ombros
    spec = [(-0.06, 0.23, 0.17, 0.0, 0.5), (0.02, 0.24, 0.18, 0.02, 0.62), (0.09, 0.3, 0.22, 0.04, 0.78),
            (0.15, 0.39, 0.27, 0.05, 0.92), (0.2, 0.49, 0.32, 0.06, 1.02)]   # funil baixo atrás, abrindo para fora
    for dz, rx, ry, cy, _ in spec:
        rings.append(((0, cy, zs + dz), (0, 0, -1), rx, ry, 0, 0.0))
    col = ring_loft("collar", rings, seg=22, open_half=lambda i: spec[i][4], thick=0.022,
                    jag=lambda j: 0.05 * (j in (3, 19)) - 0.015 * (j % 2))   # duas pontas largas nos lados

    def ctint(co, n):
        out = Vector((co.x, co.y - 0.05, 0))
        if out.length > 1e-4 and n.dot(out.normalized()) < -0.15:
            return mix(COL_D, LINING, 0.5 + 0.5 * ss(zs, zs + 0.2, co.z))
        return cloth(COL, COL_D)(co, n)
    paint(col, ctint)
    return {"torso": [t, belt, col]}


# ------------------------------------------------------------------ saia longa até o chão, no osso skirt
def skirt():
    rings = []
    for z, rx, ry, cy, famp in ((0.99, 0.15, 0.11, 0.0, 0.0), (0.8, 0.2, 0.15, 0.01, 0.02), (0.55, 0.26, 0.2, 0.02, 0.04),
                                (0.3, 0.32, 0.26, 0.03, 0.06), (0.08, 0.37, 0.3, 0.04, 0.07), (-0.02, 0.39, 0.32, 0.04, 0.07)):
        rings.append(((0, cy, z), (0, 0, -1), rx, ry, 7, famp))
    sk = ring_loft("skirt", rings, seg=28, thick=0.022, jag=lambda j: 0.045 * (j % 2) + 0.01 * math.sin(j * 2.1))
    smooth(sk, iters=1, factor=0.3)

    def tint(co, n):
        if co.z < 0.1:
            return mix(HEM, hexc(0x5a2a5a), 0.4 + 0.6 * n.z)   # barra roxa
        if co.y < 0 and abs(co.x) < 0.03 + 0.06 * (1 - co.z):
            return ROBE_D                                       # abertura da frente
        return cloth(ROBE, ROBE_D, ROBE_L)(co, n)
    paint(sk, tint)
    return {"skirt": [sk]}


# ------------------------------------------------------------------ braços: mangas em sino, mãos, cetro
def fist(name, c, size=(0.04, 0.045, 0.048)):
    knuck = [EL((c[0] + dx, c[1] - size[1] * 0.75, c[2] - size[2] * 0.55), (0.014, 0.014, 0.014)) for dx in (-0.024, -0.008, 0.008, 0.024)]
    f = meta(name, [EL(c, size), EL((c[0], c[1] - 0.03, c[2] + 0.01), (0.016, 0.02, 0.022))] + knuck, res=0.007)
    smooth(f, iters=1, target=120)
    paint(f, skin)
    return f


def arms():
    out = {}
    for side, s, pose in (("L", -1, POSE_L), ("R", 1, POSE_R)):
        ax, ay, az = RIG.P("arm" + side)
        up = tube("sleeveU", [(ax, ay, az + 0.02), (ax, ay, az - RIG.arm * 0.5), (ax, ay, az - RIG.arm)], [0.066, 0.07, 0.08], seg=12)
        smooth(up)
        paint(up, cloth(ROBE, ROBE_D, ROBE_L))
        fr, _ = fore_rot(pose, s, LEAN, OUT)
        down = local_dir(fr, (0, 0, -1))
        e = RIG.P("fore" + side)
        hand = Vector(e) + Vector((0, 0, -HAND))
        parts = []
        if side == "L":
            # braço pendendo: manga em sino até a mão, com a boca caída
            sl = bell_sleeve("sleeve", e, down, 0.2, 0.072, 0.14, sag=0.25, folds=5, famp=0.08, jag=lambda j: 0.025 * (j % 2))
            paint(sl, cloth(ROBE, ROBE_D, ROBE_L))
            wr = tube("wrist", [Vector(e) + Vector((0, 0, -0.17)), hand + Vector((0, 0, 0.03))], [0.034, 0.03], seg=8)
            paint(wr, skin)
            parts += [sl, wr, fist("hand", tuple(hand + Vector((0, -0.01, -0.01))), (0.055, 0.048, 0.065))]
            cuff = None
        else:
            # braço do cetro erguido: manga justa no antebraço e o pano que sobra caindo do cotovelo para o chão
            sl = tube("sleeveF", [e, Vector(e) + Vector((0, 0, -0.12)), Vector(e) + Vector((0, 0, -0.2))], [0.085, 0.075, 0.068], seg=12)
            smooth(sl)
            paint(sl, cloth(ROBE, ROBE_D, ROBE_L))
            drape = bell_sleeve("drape", Vector(e) + down * 0.02, down, 0.15, 0.09, 0.13, sag=0.0, folds=5, famp=0.08, axis=down)
            paint(drape, cloth(ROBE, ROBE_D, ROBE_L))
            wrist = tube("wrist", [Vector(e) + Vector((0, 0, -0.2)), Vector(e) + Vector((0, 0, -0.25))], [0.05, 0.04], seg=8)
            paint(wrist, skin)
            parts += [sl, drape, wrist, fist("hand", tuple(hand))]
            parts += scepter(hand, local_dir(fr, (0, 0, 1)))
        out["arm" + side] = [up]
        out["fore" + side] = parts
    lit = out.pop("_lit", None)
    return out


SCEPTER_LIT = []


def scepter(hand, u):
    """cetro curto em pé no mundo: cabo escuro com pomo, garras na ponta segurando um cristal magenta aceso"""
    u = Vector(u)
    w = u.cross(Vector((1, 0, 0))).normalized()
    v = u.cross(w).normalized()
    bot, top = hand - u * 0.85, hand + u * 0.2   # longo: desce até a altura do quadril
    shaft = tube("shaft", [bot, hand, top], [0.024, 0.026, 0.03], seg=7)
    paint(shaft, lambda co, n: mix(WOOD_D, WOOD, 0.4 + 0.6 * ss(-0.5, 0.6, n.z)))
    pom = ball("pommel", bot, (0.034, 0.034, 0.034), seg=(8, 5))
    paint(pom, lambda co, n: CRY_D)
    out = [shaft, pom]
    for k in range(3):
        a = k * 2 * math.pi / 3
        dirv = w * math.cos(a) + v * math.sin(a)
        claw = tube("claw", [top, top + dirv * 0.1 + u * 0.06, top + dirv * 0.085 + u * 0.16], [0.022, 0.018, 0.005], seg=5)
        paint(claw, lambda co, n: mix(WOOD_D, WOOD, 0.6))
        out.append(claw)
    for k, (off, ln, r) in enumerate(((0.0, 0.26, 0.075), (0.06, 0.15, 0.05), (0.06, 0.15, 0.05), (0.055, 0.13, 0.045))):
        if k == 0:
            d = u
        else:
            a = (k - 1) * 2 * math.pi / 3 + 0.4
            d = (u * 0.75 + (w * math.cos(a) + v * math.sin(a)) * 0.65).normalized()
        b0 = top + u * 0.09 + (d - u * d.dot(u)) * off
        for o in crystal("scry", b0, b0 + d * ln, r, seg=4, low=0.4):
            SCEPTER_LIT.append(o)
    return out


if __name__ == "__main__":
    reset()
    a = arms()
    a["foreR@lit"] = SCEPTER_LIT
    parts = merge(place_head(RIG, head(), lift=HEAD_LIFT, scale=HEAD_SCALE), torso(), skirt(), a)
    finish("spellcaster", RIG, parts, ARGS, body_center=(0, 0, 0.9), body_dist=4.2, head_dist=1.2)
