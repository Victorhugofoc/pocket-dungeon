# Gorged Ooze (M10-05), gosma gigante de boca enorme, modelada no Blender. Brief: docs/briefs/gorged_ooze.md. Rodar: ver
# tools/blender/README.md. Grava art/gorged_ooze.blend e src/game/chars/models/gorged_ooze.json. Blender: z para cima, frente em -y.
# Forma "slime" (build.ts): um osso só, hips com pivô no chão; a animação achata e estica tudo. O lábio de baixo é parte da
# própria malha da gosma (como peça de outro osso parecia uma boia colada na frente do corpo).
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from mathutils.bvhtree import BVHTree  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

PIV = {"hips": (0, 0, 0)}
GREEN, GREEN_L, SHEEN, GREEN_D, DEEP = hexc(0x62b834), hexc(0xa8e05a), hexc(0xf4ffd0), hexc(0x3a6418), hexc(0x356e3c)
THROAT, LIME = hexc(0x0e2614), hexc(0xd0f07a)
TONGUE, TOOTH, EYE, PUPIL, GLINT = hexc(0x4e9a36), hexc(0xe6dc9a), hexc(0xd8f0f0), hexc(0x0c140a), hexc(0xffffff)

# boca: o vão cavado na frente (elipsoide negativo); a tinta escurece o que fica na parede dele
MOUTH_C, MOUTH_AX = Vector((0, -0.86, 0.55)), Vector((0.46, 0.52, 0.4))
# lábio de baixo: U na frente da boca, de um canto ao outro
LIP = [(-0.52, -0.42, 0.22), (-0.47, -0.72, 0.17), (-0.28, -0.92, 0.13), (0, -0.98, 0.12),
       (0.28, -0.92, 0.13), (0.47, -0.72, 0.17), (0.52, -0.42, 0.22)]


def in_mouth(co):
    d = Vector(((co.x - MOUTH_C.x) / MOUTH_AX.x, (co.y - MOUTH_C.y) / MOUTH_AX.y, (co.z - MOUTH_C.z) / MOUTH_AX.z))
    return d.length


def ooze_tint(co, n):
    c = mix(GREEN_D, GREEN, ss(-0.6, 0.25, n.z) * (0.3 + 0.7 * ss(0.05, 0.6, co.z)))
    c = mix(c, GREEN_L, 0.75 * ss(0.2, 0.9, n.z) * ss(0.6, 1.2, co.z))
    c = mix(c, LIME, 0.5 * ss(0.6, 0.98, n.z) * ss(1.05, 1.4, co.z))
    # reflexo úmido no alto, à frente-esquerda
    c = mix(c, SHEEN, 0.85 * ss(0.86, 0.97, Vector(n).dot(Vector((-0.35, -0.45, 0.82)).normalized())) * ss(0.75, 1.0, co.z))
    # parede da boca: escura, mais funda quanto mais para dentro
    m = in_mouth(co)
    wall = mix(DEEP, hexc(0x4a8c4a), ss(-0.55, -0.95, co.y))
    wall = mix(wall, THROAT, ss(-0.46, -0.36, co.y) * ss(0.22, 0.08, abs(co.x)) * ss(0.3, 0.45, co.z))
    wall = mix(wall, mix(THROAT, DEEP, 0.45), ss(0.3, 0.7, n.z) * ss(0.45, 0.3, co.z))  # chão da boca: pega luz de cima, escurece
    lip = ss(-0.82, -0.9, co.y) * ss(0.36, 0.28, co.z)  # a borda do lábio de baixo fica com a cor da pele
    c = mix(c, wall, ss(1.55, 1.15, m) * ss(-0.1, -0.3, co.y) * ss(0.98, 0.82, co.z) * (1 - lip))
    return c


def body():
    els = [
        EL((0, 0.06, 0.55), (0.78, 0.76, 0.55)),                   # pudim
        EL((0, -0.1, 0.98), (0.6, 0.6, 0.48)),                     # cúpula alta, pendendo para a frente
        EL((-0.35, 0.62, 0.3), (0.2, 0.18, 0.24), rot=(0.4, 0, 0)),  # escorridos nas costas
        EL((0.3, 0.66, 0.24), (0.17, 0.16, 0.2), rot=(0.4, 0, 0)),
        EL((0, 0.0, 0.14), (0.96, 0.92, 0.17)),                    # base larga
        EL((0, -0.64, 0.92), (0.42, 0.18, 0.085)),                 # lábio de cima, aba por cima da boca
        EL((0, -0.66, 0.05), (0.54, 0.38, 0.08)),                  # queixo que escorre para a poça
        CAP((-0.38, -0.56, 1.22), (-0.07, -0.69, 1.02), 0.07, stiff=1.2),  # sobrancelha em V, bem inclinada
        CAP((0.38, -0.56, 1.22), (0.07, -0.69, 1.02), 0.07, stiff=1.2),
        EL((-0.21, -0.68, 1.0), (0.12, 0.08, 0.075), neg=True),    # órbitas rasas
        EL((0.21, -0.68, 1.0), (0.12, 0.08, 0.075), neg=True),
        EL(tuple(MOUTH_C), tuple(MOUTH_AX), neg=True),             # boca enorme
    ]
    # lábio de baixo: borda grossa e achatada, irregular, que nasce do corpo nos cantos (gomos ao longo do U)
    lp = catmull([Vector(p) for p in LIP], 4)
    for i in range(0, len(lp), 2):
        p = lp[i]
        t = lp[min(i + 1, len(lp) - 1)] - lp[max(i - 1, 0)]
        k = 1 + 0.15 * math.sin(i * 1.9)
        els.append(EL(tuple(p + Vector((0, 0, 0.05))), (0.13 * k, 0.1 * k, 0.1 * k), rot=(0, 0, math.atan2(t.y, t.x))))
    for x, z in ((-0.36, 0.06), (-0.16, 0.06), (0.08, 0.05), (0.3, 0.05)):  # baba que escorre do lábio até a poça
        els.append(CAP((x, -0.97, 0.13), (x * 1.1, -1.04, 0.02), 0.035, stiff=1.5))
    # línguas baixas que escorrem da base (babado irregular, não pés)
    for ang, r, w in ((0.3, 0.92, 0.26), (1.1, 0.88, 0.15), (1.9, 0.96, 0.28), (2.75, 0.86, 0.17), (3.5, 1.0, 0.24),
                      (4.3, 0.85, 0.14), (5.05, 0.95, 0.27), (5.8, 0.86, 0.13)):
        els.append(EL((r * math.sin(ang), -r * math.cos(ang), 0.05), (w, w * 0.8, 0.08), rot=(0, 0, ang)))
    b = meta("ooze", els, res=0.02)
    for v in b.data.vertices:  # o chão corta a gosma
        if v.co.z < 0.004:
            v.co.z = 0.004
    smooth(b, iters=3, factor=0.45, target=10000)
    paint(b, ooze_tint)
    return b


def caster(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    return BVHTree.FromObject(obj, dg)


def hit(tree, origin, direction):
    loc, nor, _, _ = tree.ray_cast(Vector(origin), Vector(direction).normalized())
    return loc, nor


def drips(tree):
    """fios de baba pendurados no lábio de cima: cone largo na raiz que afina, e os mais longos engrossam numa gota em
    lágrima na ponta (perfil de raios num tubo só, sem bola solta)"""
    out = []
    for x, L, drop in ((-0.36, 0.07, False), (-0.27, 0.14, True), (-0.17, 0.06, False), (-0.08, 0.26, True), (0.02, 0.09, False),
                       (0.11, 0.05, False), (0.2, 0.18, True), (0.29, 0.08, False), (0.37, 0.11, True)):
        top, _ = hit(tree, (x, -0.74 + abs(x) * 0.35, 0.5), (0, 0, 1))  # teto da boca, visto de dentro
        if top is None:
            continue
        top = top + Vector((0, 0, 0.03))
        n = 11
        pts = [top + Vector((0.025 * L * math.sin(k * 0.6 + x * 9), -0.006 * k, -(L + 0.05) * k / (n - 1))) for k in range(n)]
        # cone que afina; o longo termina numa ponta redonda (gota), o curto numa ponta fina
        tip = 0.018 if drop else 0.006
        radii = [tip + (0.042 - tip) * (1 - k / (n - 1)) ** 1.6 for k in range(n)]
        radii[-1] = 0.004
        if drop:
            radii[-2] = tip * 1.15
        o = smooth(tube("drip", pts, radii, seg=12, ref=(1, 0, 0)))  # ref fixo: sem giro do anel; smooth só liga o suave
        paint(o, lambda co, n_: mix(GREEN, LIME, 0.35 + 0.4 * ss(-0.5, 0.8, n_.x - n_.y * 0.5)))
        out.append(o)
    return out


def bubbles(tree):
    """bolhas na pele: calombos claros meio afundados, pousados por raios vindos de fora"""
    out = []
    for yaw, z, r in ((-1.75, 0.55, 0.06), (-2.25, 0.95, 0.045), (-2.6, 0.4, 0.05), (2.0, 0.65, 0.06), (2.5, 1.05, 0.04),
                      (2.85, 0.38, 0.05), (1.25, 1.15, 0.045), (-1.2, 0.95, 0.05), (3.3, 0.8, 0.055), (-0.95, 0.42, 0.05)):
        dirv = Vector((math.sin(yaw), -math.cos(yaw), 0))
        loc, nor = hit(tree, Vector((0, 0, z)) + dirv * 2.0, -dirv)
        if loc is None:
            continue
        r *= 1.3
        b = ball("bubble", tuple(loc - nor * r * 0.3), (r, r, r * 0.5), rot=nor.to_track_quat("Z", "Y").to_euler(), seg=(14, 9))
        paint(b, lambda co, n: mix(mix(GREEN_L, LIME, 0.6), SHEEN, 0.9 * ss(0.8, 0.97, Vector(n).dot(Vector((-0.3, -0.4, 0.86)).normalized()))))
        out.append(b)
    return out


def eyes(tree):
    """olho claro com pupila escura pequena e pálpebra verde caída por cima (cobre uns 40%): olhar bravo semicerrado"""
    solid, flat, lit = [], [], []
    for s in (-1, 1):
        loc, nor = hit(tree, (s * 0.21, -1.5, 0.99), (0, 1, 0))
        c = loc + Vector((0, 0.02, 0))
        e = ball("eye", tuple(c), (0.11, 0.05, 0.07), rot=(0.1, 0, -s * 0.3), seg=(24, 14))
        paint(e, lambda co, n: EYE)
        flat.append(e)
        p = ball("pupil", tuple(c + Vector((-s * 0.018, -0.046, -0.022))), (0.034, 0.012, 0.034), rot=(0, 0, -s * 0.3), seg=(12, 8))
        paint(p, lambda co, n: PUPIL)
        flat.append(p)
        g = ball("glint", tuple(c + Vector((-s * 0.04, -0.05, -0.005))), (0.012, 0.006, 0.01), seg=(6, 4))
        paint(g, lambda co, n: GLINT)
        lit.append(g)
        # pálpebra: casca verde sobre a metade de cima, inclinada para o meio (desce no canto de dentro)
        lid = ball("lid", (0, 0, 0), (0.12, 0.062, 0.075), seg=(16, 10))
        for v in lid.data.vertices:  # achata a parte de baixo: fica só a casca que cobre o alto do olho
            v.co.z = max(v.co.z, 0.012)
        # depois inclina para o meio (desce no canto de dentro) e leva ao olho
        lid.data.transform(Matrix.Translation(c + Vector((0, -0.008, 0.012))) @ Euler((0.1, -s * 0.34, -s * 0.3)).to_matrix().to_4x4())
        paint(lid, lambda co, n: mix(GREEN_D, GREEN, 0.4 + 0.4 * ss(-0.2, 0.9, n.z)))
        solid.append(lid)
    return solid, flat, lit


def mouth(tree):
    """dentinhos rombudos pousados na borda de dentro do lábio de baixo (por raio de cima) e a língua baixa no fundo"""
    flat = []
    lp = catmull([Vector(p) for p in LIP], 4)
    for i in range(3, len(lp) - 3, 3):
        p = lp[i]
        inward = Vector((-p.x, -0.5 - p.y, 0))
        inward.normalize()
        q = p + inward * 0.06
        loc, nor = hit(tree, (q.x, q.y, 0.6), (0, 0, -1))
        if loc is None:
            continue
        t = cone("tooth", tuple(loc - Vector((0, 0, 0.01))), tuple(loc + Vector((0, 0, 0.06)) + inward * 0.012), 0.036, seg=6)
        paint(t, lambda co, n_: mix(TOOTH, hexc(0xfff6d0), ss(0.0, 0.9, n_.z)))
        flat.append(t)
    # língua com relevo, baixa e escura no fundo da boca
    tg = meta("tongue", [EL((0, -0.6, 0.2), (0.3, 0.26, 0.06)), EL((0, -0.78, 0.22), (0.22, 0.1, 0.05)),
                         EL((0, -0.6, 0.262), (0.018, 0.2, 0.02), neg=True)], res=0.015)
    smooth(tg, iters=1, factor=0.4, target=600)
    paint(tg, lambda co, n_: mix(mix(DEEP, TONGUE, ss(0.2, 0.25, co.z) * ss(0.0, 0.03, abs(co.x))), LIME, 0.2 * ss(0.6, 1.0, n_.z)))
    flat.append(tg)
    return flat


def catmull(pts, n):
    out = []
    P = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            t = k / n
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(pts[-1])
    return out


def pool():
    out = []
    pl = ball("pool", (0.03, -0.08, 0.0), (1.22, 1.16, 0.02), seg=(80, 4))
    for v in pl.data.vertices:  # borda irregular, com línguas que avançam
        a = math.atan2(v.co.y + 0.08, v.co.x - 0.03)
        k = 0.9 + 0.07 * math.sin(a * 5 + 1) + 0.03 * math.sin(a * 8 + 2) + 0.2 * max(0, math.sin(a * 3 + 0.4)) ** 4
        v.co.x, v.co.y = 0.03 + (v.co.x - 0.03) * k, -0.08 + (v.co.y + 0.08) * k
    paint(pl, lambda co, n: mix(GREEN_D, GREEN, 0.6))
    out.append(pl)
    drops = []
    for x, y, r in ((-1.2, -0.7, 0.08), (1.1, -0.85, 0.06), (1.3, 0.3, 0.07), (-1.05, 0.55, 0.05)):
        d = ball("drop", (x, y, 0.02), (r, r, r * 0.5), seg=(14, 7))
        paint(d, lambda co, n: mix(GREEN, GREEN_L, ss(0.0, 0.9, n.z)))
        drops.append(d)
    return out, drops


def build():
    b = body()
    tree = caster(b)
    lids, fl_eyes, lit = eyes(tree)
    pl, drops = pool()
    solid = [b] + lids + drips(tree) + drops
    flat = fl_eyes + bubbles(tree) + mouth(tree) + pl
    keep = {}
    col = b.data.color_attributes["Col"]
    for v in b.data.vertices:
        if in_mouth(v.co) < 1.4 and v.co.y < -0.2 and v.co.z < 0.95:
            keep[v.index] = tuple(col.data[v.index].color)
    bake_ao([b], strength=0.45, distance=0.14)
    for i, c in keep.items():
        a = col.data[i].color
        col.data[i].color = tuple(a[k] * 0.35 + c[k] * 0.65 for k in range(3)) + (1.0,)
    for objs in (solid, flat, lit):  # bolas e cones também com sombreamento suave (sem facetas)
        for o in objs:
            for p in o.data.polygons:
                p.use_smooth = True
    return {"hips": solid, "hips@flat": flat, "hips@lit": lit}


if __name__ == "__main__":
    reset()
    parts = build()
    counts = export_parts(os.path.join(ROOT, "src", "game", "chars", "models", "gorged_ooze.json"), parts, PIV)
    print("TRIS", sum(counts.values()), counts)
    if "review" in ARGS:
        review_setup((0, 0, 0))
        out = os.path.join(ROOT, ".shots")
        for name, yaw, pitch in [("front", 0, 10), ("tq", 35, 25), ("side", 90, 10), ("top", 0, 62)]:
            shot(os.path.join(out, f"bl-ooze-{name}.png"), (0, 0, 0.62), 4.8, yaw, pitch)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "art", "gorged_ooze.blend"))
