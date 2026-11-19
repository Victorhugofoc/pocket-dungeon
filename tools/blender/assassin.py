# Assassin (ninja de máscara de raposa) modelado no Blender (M3-03). Brief: docs/briefs/assassin.md.
# Rodar: ver tools/blender/README.md. Adagas por código (fighterDagger em cast-enemies.ts); o cachecol longo é fita com física
# (b.ribbons). Revisão 2: corpo de lutador (peito e ombros largos, dorsais em V, cintura marcada, bíceps e antebraço), jaqueta
# escura com gola em V vermelha e peito aberto, calça larga bufante; máscara e cabelo como na revisão 1 (aprovados). A base de luta
# (pernas abertas, pé à frente, quadril girado) vem da receita (b.stance), o corpo é modelado ereto.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from humanoid import Rig, finish, merge, place_head  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
RIG = Rig(hipY=0.92, headY=0.58, shoulderY=0.46, shoulderX=0.3, arm=0.32, hipX=0.14, thigh=0.42)
HAND = 0.3

GREY, GREY_D, GREY_M = hexc(0x7c8088), hexc(0x40434a), hexc(0x62666e)
RED, RED_D, BLACK, BLACK_L = hexc(0xc8281e), hexc(0x6a1010), hexc(0x1e1e24), hexc(0x3a3a44)
MASK, MASK_D, WRAP, DARK = hexc(0xf4f2ee), hexc(0xb8b4ae), hexc(0xd8d4cc), hexc(0x0e0e12)
TOP, TOP_D = hexc(0x4e525c), hexc(0x26282e)   # jaqueta cinza escura (no sprite a calça é clara e a jaqueta escura)
SKIN, SKIN_D = hexc(0xd8a888), hexc(0x8a5a44)


def on(obj, x, z, lift=0.004):
    """ponto na superfície da frente de obj (raio de -y para +y na altura z) e a normal ali"""
    ok, hit, n, _ = obj.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
    return hit + n * lift, n


def strip(name, obj, xz, r, color, squash=0.35):
    """faixa fina deitada na superfície da frente de obj, passando pelos pontos (x, z)"""
    pts = []
    for x, z in xz:
        ok, hit, n, _ = obj.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
        if ok:  # raio que erra a peça devolveria a origem (o chão)
            pts.append(hit + n * r * squash * 0.6)
    t = tube(name, pts, [r] * len(pts), seg=6, squash=(1.0, squash), ref=(0, 1, 0))
    paint(t, lambda co, n: color)
    return t


def cloth(base, dark):
    return lambda co, n: mix(dark, base, 0.4 + 0.6 * ss(-0.7, 0.5, n.z))


def skin(co, n):
    return mix(SKIN_D, SKIN, 0.5 + 0.5 * ss(-0.6, 0.5, n.z))


# ------------------------------------------------------------------ cabeça: máscara de raposa e cabelo preso (aprovada na revisão 1)
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


def loft_skirt(name, ztop, zbot, rx0, rx1, ry0, ry1, open_front=0.0, seg=18, rows=3):
    """saia em tronco de cone, aberta na frente (open_front = meia abertura em rad), com espessura"""
    bm = bmesh.new()
    grid = []
    for i in range(rows + 1):
        u = i / rows
        z = ztop + (zbot - ztop) * u
        rx, ry = rx0 + (rx1 - rx0) * u, ry0 + (ry1 - ry0) * u
        row = []
        for j in range(seg + 1):
            a = open_front + (2 * math.pi - 2 * open_front) * j / seg
            zz = z + (0.02 * math.sin(j * 1.9) if i == rows else 0)
            row.append(bm.verts.new((rx * math.sin(a), -ry * math.cos(a), zz)))
        grid.append(row)
    for i in range(rows):
        for j in range(seg):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_mesh(name, bm)
    sol = o.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.022
    sol.offset = 0
    apply_mods(o)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


# ------------------------------------------------------------------ tronco: jaqueta escura com gola em V vermelha, peito aberto
def torso():
    z0 = RIG.P("torso")[2]
    sx = RIG.shoulderX
    t = meta("torso", [
        EL((0, 0.0, z0 + 0.33), (0.215, 0.13, 0.14)),             # peito largo
        EL((-0.1, -0.05, z0 + 0.32), (0.1, 0.08, 0.08)),          # peitorais
        EL((0.1, -0.05, z0 + 0.32), (0.1, 0.08, 0.08)),
        EL((-0.13, 0.05, z0 + 0.25), (0.08, 0.08, 0.12)),         # dorsais
        EL((0.13, 0.05, z0 + 0.25), (0.08, 0.08, 0.12)),
        EL((0, 0.0, z0 + 0.12), (0.145, 0.1, 0.12)),              # cintura fina
        EL((-sx + 0.05, 0.0, z0 + 0.42), (0.07, 0.075, 0.06)),    # ombros (trapézio)
        EL((sx - 0.05, 0.0, z0 + 0.42), (0.07, 0.075, 0.06)),
        CAP((0, 0.0, z0 + 0.42), (0, -0.01, z0 + 0.54), 0.06),     # pescoço grosso
    ], res=0.01)
    smooth(t, iters=2, target=520)

    def tint(co, n):
        if co.z > z0 + 0.47:
            return BLACK  # gola alta / cachecol
        depth = z0 + 0.47 - co.z  # peito aberto em V: pele, do pescoço até o meio do peito
        if co.y < -0.06 and abs(co.x) < 0.075 - depth * 0.3 and depth < 0.2:
            return skin(co, n)
        return cloth(TOP, TOP_D)(co, n)
    paint(t, tint)
    # gola transpassada: duas faixas vermelhas largas do ombro até a faixa da cintura, em V
    collar = [strip("collar", t, [(s * 0.1, z0 + 0.45), (s * 0.075, z0 + 0.37), (s * 0.04, z0 + 0.28), (s * 0.005, z0 + 0.19)], 0.032,
                    RED, squash=0.45) for s in (-1, 1)]
    scarf = tube("scarf", [(0, 0.0, z0 + 0.48), (0, -0.005, z0 + 0.52), (0, 0.0, z0 + 0.58)], [0.09, 0.11, 0.095], seg=14)   # cachecol
    smooth(scarf)
    paint(scarf, cloth(BLACK_L, BLACK))
    # aba da jaqueta caindo sobre o quadril (o quimono passa da faixa): saia curta aberta na frente
    hem = loft_skirt("jhem", z0 + 0.02, z0 - 0.17, 0.19, 0.25, 0.14, 0.17, open_front=0.5)
    paint(hem, cloth(TOP, TOP_D))
    return {"torso": [t, scarf, hem] + collar}


def hips():
    z = RIG.P("hips")[2]
    p = meta("hips", [EL((0, 0.0, z), (0.18, 0.125, 0.11)), EL((0, 0.0, z - 0.09), (0.15, 0.11, 0.08))], res=0.012)  # calça larga
    smooth(p, iters=1, target=220)
    paint(p, cloth(GREY, GREY_D))
    sash = tube("sash", [(0, 0.0, z + 0.08), (0, 0.0, z + 0.17)], [0.168, 0.16], seg=16)   # faixa vermelha larga
    paint(sash, cloth(RED, RED_D))
    tails = []
    for k, (ln, ox) in enumerate(((0.2, -0.12), (0.15, -0.07))):   # pontas do nó caindo do lado esquerdo, largas e curtas
        tl = tube("sashtail", [(ox, -0.165, z + 0.12), (ox - 0.02, -0.18, z + 0.12 - ln * 0.5), (ox - 0.035, -0.175, z + 0.12 - ln)],
                  [0.045, 0.05, 0.045], seg=6, squash=(1.0, 0.28), ref=(0, 1, 0))
        paint(tl, cloth(RED, RED_D))
        tails.append(tl)
    knot = ball("knot", (-0.09, -0.165, z + 0.125), (0.045, 0.032, 0.04), seg=(8, 5))
    paint(knot, cloth(RED, RED_D))
    return {"hips": [p, sash, knot] + tails}


def limbs():
    out = {}
    for side, s in (("L", -1), ("R", 1)):
        ax, ay, az = RIG.P("arm" + side)
        # braço: deltoide redondo, bíceps; manga da jaqueta até o cotovelo, larga na boca
        a = meta("arm" + side, [EL((ax, ay, az - 0.03), (0.066, 0.07, 0.066)),          # deltoide
                                CAP((ax, ay, az - 0.04), (ax, ay, az - RIG.arm + 0.02), 0.062),
                                EL((ax, ay - 0.025, az - 0.17), (0.068, 0.07, 0.09)),              # bíceps
                                EL((ax, ay + 0.01, az - RIG.arm + 0.035), (0.084, 0.086, 0.06))], res=0.011)  # boca da manga, larga
        smooth(a, iters=1, target=200)
        paint(a, cloth(TOP, TOP_D))
        cuff = tube("cuff", [(ax, ay, az - RIG.arm + 0.035), (ax, ay, az - RIG.arm + 0.005)], [0.08, 0.082], seg=12)   # barra vermelha
        paint(cuff, cloth(RED, RED_D))
        fx, fy, fz = RIG.P("fore" + side)
        # antebraço: grosso no cotovelo, afina no punho; braçadeira vermelha, luva preta com punho fechado
        f = meta("fore" + side, [CAP((fx, fy, fz), (fx, fy, fz - 0.24), 0.045),
                                  EL((fx, fy - 0.01, fz - 0.07), (0.058, 0.058, 0.08)),
                                  EL((fx, fy - 0.01, fz - HAND), (0.043, 0.048, 0.045)),
                                  EL((fx + s * 0.026, fy - 0.035, fz - HAND + 0.01), (0.02, 0.02, 0.026))], res=0.011)
        smooth(f, iters=1, target=240)

        def ftint(co, n, fz=fz):
            if co.z < fz - 0.25:
                return mix(BLACK, BLACK_L, 0.5 + 0.5 * n.z)          # luva preta
            if co.z < fz - 0.04:
                return cloth(RED, RED_D)(co, n)                      # braçadeira vermelha
            return skin(co, n)
        paint(f, ftint)
        wraps = []
        for zz in (fz - 0.1, fz - 0.17):   # voltas da faixa, em relevo
            w = tube("wrap", [(fx, fy, zz - 0.01), (fx, fy, zz + 0.01)], [0.056, 0.054], seg=10)
            paint(w, cloth(RED_D, RED_D))
            wraps.append(w)
        hx, hy, hz = RIG.P("thigh" + side)
        # calça larga: coxa em balão, mais cheia embaixo, perto do joelho
        th = meta("thigh" + side, [CAP((hx, hy, hz), (hx + s * 0.02, hy, hz - RIG.thigh + 0.02), 0.1),
                                   EL((hx + s * 0.015, hy, hz - 0.14), (0.115, 0.115, 0.17)),
                                   EL((hx + s * 0.02, hy, hz - RIG.thigh + 0.06), (0.12, 0.118, 0.11))], res=0.012)
        smooth(th, iters=1, target=240)
        paint(th, lambda co, n, hz=hz: mix(GREY_D, GREY, (0.4 + 0.6 * ss(-0.7, 0.5, n.z)) * (0.82 + 0.18 * math.cos((co.z - hz) * 38 + co.x * 20))))
        kx, ky, kz = RIG.P("shin" + side)
        # canela: a calça ainda bufante cobre o joelho, afina na panturrilha e entra na faixa clara; sapatilha preta
        # a boca da calça continua a coxa e afunila sem estrangular até a faixa (cone, não bola sobre bola)
        sh = meta("shin" + side, [EL((kx, ky, kz - 0.0), (0.112, 0.11, 0.08)),
                                  CAP((kx, ky, kz - 0.02), (kx, ky, kz - 0.14), 0.085),
                                  CAP((kx, ky, kz - 0.1), (kx, ky, kz - 0.38), 0.05),
                                  EL((kx, ky + 0.015, kz - 0.2), (0.058, 0.064, 0.09)),        # panturrilha
                                  EL((kx, ky - 0.065, kz - 0.425), (0.055, 0.11, 0.036)),      # sapatilha
                                  EL((kx, ky, kz - 0.4), (0.05, 0.055, 0.042))], res=0.01)
        smooth(sh, iters=1, target=300)

        def stint(co, n, kz=kz):
            if co.z < kz - 0.37:
                return mix(BLACK, BLACK_L, 0.4 + 0.6 * n.z)
            if co.z > kz - 0.13:
                return cloth(GREY, GREY_D)(co, n)
            return mix(MASK_D, WRAP, 0.5 + 0.5 * ss(-0.6, 0.5, n.z))  # canela enfaixada
        paint(sh, stint)
        ties = []
        for zz, rr in ((kz - 0.355, 0.06), (kz - 0.14, 0.07)):   # tornozeleira e amarração vermelhas como anéis
            t = tube("tie", [(kx, ky, zz - 0.02), (kx, ky, zz + 0.02)], [rr, rr], seg=10)
            paint(t, cloth(RED, RED_D))
            ties.append(t)
        out["arm" + side] = [a, cuff]
        out["fore" + side] = [f] + wraps
        out["thigh" + side] = [th]
        out["shin" + side] = [sh] + ties
    return out


if __name__ == "__main__":
    reset()
    parts = merge(place_head(RIG, head(), lift=0.13, scale=1.15), torso(), hips(), limbs())
    finish("assassin", RIG, parts, ARGS, body_center=(0, 0, 0.95), body_dist=4.2, head_dist=1.1)
