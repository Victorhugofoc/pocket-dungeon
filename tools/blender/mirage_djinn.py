# Mirage Djinn (chefe do M10-03: gênio flutuante de cauda de fumaça) modelado no Blender. Brief: docs/briefs/mirage_djinn.md.
# Rodar: ver tools/blender/README.md. Grava art/mirage_djinn.blend e src/game/chars/models/mirage_djinn.json.
# Forma "djinn" (build.ts): tronco, cabeça e braços como os bípedes (pivôs de Rig, iguais a b.dims da receita); sem pernas,
# a cauda de fumaça é uma cadeia de ossos tail -> tail4 com os pontos de TAIL (repetidos na receita em b.joints).
# Blender: z para cima, frente em -y.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from mathutils import Matrix, Vector  # noqa: E402
from humanoid import Rig, finish, merge, place_head  # noqa: E402
from robed import ring_loft  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
RIG = Rig(hipY=0.95, headY=0.6, shoulderY=0.5, shoulderX=0.45, arm=0.34, hipX=0.0, thigh=0.42, bulk=1.25)
HAND = 0.34
HEAD_LIFT, HEAD_SCALE = 0.16, 1.2
ARMHOLE = (0.15, 0.16, 0.42)   # cava do colete vista de lado: meia largura (y), meia altura (z) e centro acima do pivô do tronco

# cadeia da cauda (Blender): começa sob a faixa, desce para trás e enrola para o lado e para a frente perto do chão
TAIL = [(0.0, 0.04, 0.8), (0.16, 0.18, 0.5), (-0.12, 0.36, 0.3), (-0.55, 0.42, 0.38)]
TIP = [(-0.8, 0.4, 0.6), (-0.88, 0.34, 0.86), (-0.8, 0.28, 1.06), (-0.66, 0.26, 1.16)]   # a ponta, presa no tail4, enrolada para cima
TAIL_BONES = ["tail", "tail2", "tail3", "tail4"]
for _b, _p in zip(TAIL_BONES, TAIL):
    RIG.piv[_b] = _p
    RIG.p3[_b] = (_p[0], _p[2], -_p[1])

SKIN, SKIN_D, SKIN_L = hexc(0x34b8b4), hexc(0x16686e), hexc(0x86eedd)
VEST, VEST_D, VEST_L, TRIM = hexc(0x55276e), hexc(0x26103a), hexc(0x7a3c98), hexc(0xe8508a)
GOLD, GOLD_D, GOLD_L = hexc(0xf6bc2e), hexc(0xc07a14), hexc(0xfff4b0)
CREAM, CREAM_D, CREAM_L = hexc(0xf0d49a), hexc(0xb08a4a), hexc(0xfff0cc)
RUBY, RUBY_L = hexc(0xd8203a), hexc(0xff7a8a)
FEATHER, FEATHER_T = hexc(0xff7a6a), hexc(0xffd9a8)
HAIR, HAIR_L = hexc(0x16121c), hexc(0x3a3046)
EYE, DARK = hexc(0xfff2a8), hexc(0x0a0a12)
SMOKE = [hexc(0x34b8b4), hexc(0x34b8b4), hexc(0x6a3aa8), hexc(0x7a2aa0), hexc(0xc02a7a), hexc(0xf0402e), hexc(0xff9a3a)]


def skin(co, n):
    c = mix(SKIN_D, SKIN, 0.5 + 0.5 * ss(-0.6, 0.5, n.z - 0.5 * n.y))
    return mix(c, SKIN_L, 0.35 * ss(0.45, 1.0, n.z - 0.2 * n.y))


def gold(co, n):
    c = mix(GOLD_D, GOLD, 0.35 + 0.65 * ss(-0.6, 0.5, n.z - 0.4 * n.y))
    return mix(c, GOLD_L, 0.5 * ss(0.55, 1.0, n.z - 0.3 * n.y))


def cloth(base, dark, light):
    def f(co, n):
        c = mix(dark, base, 0.35 + 0.65 * ss(-0.7, 0.5, n.z))
        return mix(c, light, 0.35 * ss(0.5, 1.0, n.z))
    return f


def delete_faces(obj, cond):
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    kill = [f for f in bm.faces if cond(f.calc_center_median(), f.normal)]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def shell(obj, push, thick):
    """casca: os vértices saem pela normal e o pano ganha espessura"""
    for v in obj.data.vertices:
        v.co += v.normal * push
    m = obj.modifiers.new("thick", "SOLIDIFY")
    m.thickness = thick
    m.offset = 1
    apply_mods(obj)
    for p in obj.data.polygons:
        p.use_smooth = True


# ------------------------------------------------------------------ cabeça: rosto turquesa de barba preta e turbante
def head():
    parts = {"solid": [], "flat": [], "lit": []}
    h = meta("head", [
        EL((0, 0.01, 0.01), (0.1, 0.11, 0.115)),                    # crânio
        EL((0, -0.04, -0.05), (0.088, 0.08, 0.085)),                # rosto e mandíbula larga
        CAP((-0.07, -0.09, 0.035), (0.07, -0.09, 0.035), 0.024),     # arcada pesada
        CAP((0, -0.1, 0.02), (0, -0.142, -0.03), 0.024),             # nariz grande e adunco
        EL((0, -0.14, -0.04), (0.032, 0.024, 0.022)),               # ponta do nariz caída
        EL((-0.04, -0.1, 0.0), (0.024, 0.02, 0.016), neg=True),     # órbitas
        EL((0.04, -0.1, 0.0), (0.024, 0.02, 0.016), neg=True),
        CAP((0, 0.0, -0.1), (0, 0.02, -0.2), 0.06),                  # pescoço grosso
    ], res=0.006)
    smooth(h, iters=2, factor=0.5, target=900)
    paint(h, skin)
    parts["solid"].append(h)
    for s in (-1, 1):
        # orelha pontuda, para fora e para trás
        ear = tube("ear", [(s * 0.09, 0.0, -0.03), (s * 0.15, 0.035, -0.005), (s * 0.21, 0.06, 0.03)], [0.034, 0.022, 0.004],
                   seg=8, squash=(1.0, 0.45), ref=(0, 1, 0))
        smooth(ear)
        paint(ear, skin)
        ring = tube("earring", [(s * (0.108 + 0.022 * (1 - math.cos(a))), 0.0, -0.035 - 0.026 * math.sin(a))
                                for a in [k * 2 * math.pi / 10 for k in range(11)]], [0.007] * 11, seg=5, cap=False)
        paint(ring, gold)
        parts["solid"] += [ear, ring]
        lift = 0.022 if s > 0 else 0.0   # uma sobrancelha erguida: deboche
        brow = tube("brow", [(s * 0.01, -0.116, 0.026 + lift * 0.4), (s * 0.048, -0.112, 0.044 + lift), (s * 0.088, -0.092, 0.066 + lift * 0.6)],
                    [0.016, 0.017, 0.007], seg=6, squash=(1.0, 0.6), ref=(0, 1, 0))
        paint(brow, lambda co, n: HAIR)
        parts["flat"].append(brow)
        sock = ball("socket", (s * 0.04, -0.104, 0.008), (0.021, 0.008, 0.012), rot=(0, s * 0.2, 0), seg=(8, 5))
        paint(sock, lambda co, n: DARK)
        parts["flat"].append(sock)
        eye = ball("eye", (s * 0.04, -0.111, 0.009), (0.015, 0.006, 0.009), seg=(8, 5))
        paint(eye, lambda co, n: hexc(0xfff0a8))
        pup = ball("pupil", (s * 0.038, -0.117, 0.009), (0.006, 0.003, 0.007), seg=(6, 4))
        paint(pup, lambda co, n: DARK)
        parts["flat"] += [eye, pup]
    # barba preta cheia, cobrindo o queixo e descendo em ponta; bigode largo
    beard = meta("beard", [
        EL((0, -0.075, -0.145), (0.068, 0.05, 0.045)),              # começa abaixo da boca
        EL((0, -0.088, -0.2), (0.058, 0.048, 0.06)),
        CAP((0, -0.095, -0.22), (0, -0.12, -0.34), 0.028),           # cunha longa até o peito
        CAP((0, -0.12, -0.34), (0, -0.13, -0.38), 0.02),
        EL((-0.072, -0.04, -0.1), (0.022, 0.04, 0.05)),             # costeletas finas pela mandíbula
        EL((0.072, -0.04, -0.1), (0.022, 0.04, 0.05)),
    ], res=0.006)
    smooth(beard, iters=1, target=360)
    paint(beard, lambda co, n: mix(HAIR, HAIR_L, 0.4 * ss(0.3, 1.0, n.z - n.y) + 0.25 * (math.sin(co.x * 160) > 0.6)))
    parts["solid"].append(beard)
    mus = tube("mustache", [(-0.09, -0.1, -0.085), (-0.05, -0.135, -0.068), (0, -0.142, -0.064), (0.05, -0.135, -0.068),
                            (0.09, -0.1, -0.085)], [0.005, 0.013, 0.011, 0.013, 0.005], seg=8)
    paint(mus, lambda co, n: HAIR)
    mouth = tube("mouth", [(-0.034, -0.124, -0.094), (-0.01, -0.132, -0.09), (0.018, -0.131, -0.086), (0.04, -0.122, -0.074)],
                 [0.008, 0.01, 0.01, 0.007], seg=6)   # sorriso torto, um canto mais alto
    paint(mouth, lambda co, n: hexc(0x3a0e1e))
    parts["flat"] += [mouth]
    parts["solid"].append(mus)
    # turbante: cúpula creme e voltas grossas de pano em volta, cada uma inclinada para um lado (lê como pano enrolado)
    def ttint(co, n):
        c = mix(CREAM_D, CREAM, 0.35 + 0.65 * ss(-0.7, 0.6, n.z - 0.3 * n.y))
        return mix(c, CREAM_L, 0.45 * ss(0.5, 1.0, n.z - 0.2 * n.y))
    dome = meta("turban", [EL((0, 0.035, 0.13), (0.125, 0.13, 0.085)), EL((0, 0.04, 0.18), (0.08, 0.085, 0.04))], res=0.007)
    smooth(dome, iters=2, target=500)
    paint(dome, ttint)
    parts["solid"].append(dome)
    for k, (zc, R, r, tilt) in enumerate(((0.07, 0.125, 0.036, 0.06), (0.11, 0.13, 0.036, -0.07), (0.15, 0.11, 0.032, 0.06))):
        pts = []
        for j in range(25):
            a = 2 * math.pi * j / 24
            x, y = R * math.cos(a), R * 1.04 * math.sin(a) + 0.035
            pts.append((x, y, zc + math.tan(tilt) * x * 0.55 + 0.012 * math.sin(a * 3 + k)))
        wrap = tube("wrap", pts, [r] * 25, seg=10, cap=False)
        smooth(wrap)
        paint(wrap, lambda co, n: mix(ttint(co, n), CREAM_D, 0.45 * ss(-0.2, -0.8, n.z)))
        parts["solid"].append(wrap)
    # joia na frente: engaste de ouro e rubi aceso; pena larga coral subindo da joia e curvando para trás
    seat = ball("seat", (0, -0.122, 0.1), (0.05, 0.018, 0.056), seg=(12, 8))
    paint(seat, gold)
    gem = ball("ruby", (0, -0.137, 0.1), (0.034, 0.016, 0.04), seg=(10, 8))
    paint(gem, lambda co, n: mix(hexc(0x8a0a1e), hexc(0xe0283c), ss(-0.2, 0.9, n.z - n.y)))
    parts["solid"] += [seat, gem]
    glint = ball("glint", (-0.008, -0.147, 0.11), (0.006, 0.004, 0.006), seg=(6, 4))
    paint(glint, lambda co, n: hexc(0xff9aa8))
    parts["lit"].append(glint)
    cap = meta("crown", [EL((0, 0.04, 0.2), (0.08, 0.08, 0.04)), CAP((0, 0.04, 0.22), (0, 0.04, 0.27), 0.02)], res=0.005)
    smooth(cap, iters=1, target=160)
    paint(cap, gold)
    parts["solid"].append(cap)
    fp = [(0.0, -0.13, 0.13), (0.02, -0.12, 0.2), (0.06, -0.07, 0.27), (0.11, 0.0, 0.3), (0.16, 0.08, 0.28)]
    fe = tube("feather", catmull(fp, 4), [0.006 + 0.034 * math.sin(math.pi * k / 16) ** 0.9 for k in range(17)],
              seg=10, squash=(0.4, 1.0), ref=(1, 0, 0))
    smooth(fe)
    paint(fe, lambda co, n: mix(mix(hexc(0xc8203a), hexc(0xff5a7a), ss(-0.1, -0.02, co.y)), hexc(0xffb070), ss(0.0, 0.08, co.y)))
    parts["lit"].append(fe)
    return parts


# ------------------------------------------------------------------ tronco musculoso, colete roxo aberto, faixa dourada
def torso():
    z0 = RIG.P("torso")[2]
    sx = RIG.shoulderX
    els = [
        EL((0, 0.0, z0 + 0.04), (0.23, 0.17, 0.1)),                 # cintura
        EL((0, -0.03, z0 + 0.15), (0.26, 0.19, 0.13)),              # abdome
        EL((-0.2, 0.02, z0 + 0.24), (0.12, 0.13, 0.16)),            # dorsais: tronco em V
        EL((0.2, 0.02, z0 + 0.24), (0.12, 0.13, 0.16)),
        EL((0, -0.01, z0 + 0.37), (0.39, 0.25, 0.2)),               # peito largo
        EL((-0.14, -0.17, z0 + 0.38), (0.15, 0.055, 0.1)),          # peitorais (rasos: ficam por baixo do colete)
        EL((0.14, -0.17, z0 + 0.38), (0.15, 0.055, 0.1)),
        EL((0, 0.1, z0 + 0.42), (0.27, 0.13, 0.17)),                # costas
        EL((0, 0.04, z0 + 0.54), (0.27, 0.13, 0.09)),               # trapézio
        EL((-sx + 0.07, 0.0, z0 + 0.48), (0.13, 0.13, 0.11)),       # ombros
        EL((sx - 0.07, 0.0, z0 + 0.48), (0.13, 0.13, 0.11)),
    ]
    t = meta("torso", els, res=0.01)
    smooth(t, iters=2, target=1500)

    def open_w(z):   # meia largura da abertura da frente do colete na altura z (V que abre para baixo)
        return 0.13 + 0.05 * ss(z0 + 0.5, z0 + 0.15, z)

    def vest_w(co):
        """0..1: quanto o ponto está no colete (sem mangas, aberto na frente em V, cavas fundas)"""
        front = ss(open_w(co.z) - 0.012, open_w(co.z) + 0.012, abs(co.x)) if co.y < 0.02 else 1.0
        e = math.hypot(co.y / ARMHOLE[0], (co.z - z0 - ARMHOLE[2]) / ARMHOLE[1])
        arm = 1 - ss(0.28, 0.33, abs(co.x)) * (1 - ss(0.9, 1.1, e))      # cava: o braço sai nu, o alto do ombro fica coberto
        neck = 1 - ss(z0 + 0.58, z0 + 0.64, co.z) * (1 - ss(0.2, 0.24, abs(co.x)))   # sobe pelos ombros até a base do pescoço
        return front * arm * neck * ss(z0 + 0.13, z0 + 0.17, co.z)

    # colete: casca do tronco cortada numa malha fina (a borda sai limpa), por cima da pele
    # sem os peitorais: o pano cai quase plano do ombro, só fundo o bastante para cobri-los
    drape = [e for i, e in enumerate(els) if i not in (4, 5, 6)] + [EL((0, -0.02, z0 + 0.37), (0.39, 0.262, 0.205))]
    v = meta("vest", drape, res=0.006)
    delete_faces(v, lambda c, n: vest_w(c) < 0.5)
    smooth(v, target=1100)
    shell(v, 0.01, 0.014)
    paint(v, cloth(VEST, VEST_D, VEST_L))
    v["no_ao"] = True

    def tint(co, n):
        c = skin(co, n)
        if co.y < -0.12:   # esterno, abdome em gomos e sombra sob os peitorais
            g = (1 - ss(0.0, 0.022, abs(co.x))) * ss(z0 + 0.05, z0 + 0.32, co.z) * 0.55
            for zz in (z0 + 0.1, z0 + 0.18):
                g = max(g, 0.4 * (1 - ss(0.0, 0.013, abs(co.z - zz))) * (1 - ss(0.08, 0.13, abs(co.x))))
            g = max(g, 0.5 * (1 - ss(0.0, 0.028, abs(co.z - (z0 + 0.285)))) * ss(0.03, 0.07, abs(co.x)) * (1 - ss(0.2, 0.28, abs(co.x))))
            c = mix(c, SKIN_D, g)
        return c
    paint(t, tint)

    # cordão rosa em relevo na borda do V e na volta da cava, pousado na pele por raios
    import mathutils.bvhtree as bvt
    tree = bvt.BVHTree.FromObject(t, bpy.context.evaluated_depsgraph_get())
    trims = []
    for s in (-1, 1):
        pts = []
        for k in range(10):
            z = z0 + 0.58 - 0.4 * k / 9
            hit, nrm, _, _ = tree.ray_cast(Vector((s * (open_w(z) + 0.005), -1.0, z)), Vector((0, 1, 0)))
            if hit:
                pts.append(hit + nrm * 0.024)
        tr = tube("trim", pts, [0.021] * len(pts), seg=6, squash=(1.0, 0.55), ref=(0, 1, 0))
        paint(tr, lambda co, n: mix(TRIM, hexc(0xffa0c0), 0.4 * ss(0.2, 1.0, n.z - n.y)))
        trims.append(tr)
        ring = []
        for k in range(25):
            a = 2 * math.pi * k / 24
            y, z = ARMHOLE[0] * math.cos(a), z0 + ARMHOLE[2] + ARMHOLE[1] * math.sin(a)
            hit, nrm, _, _ = tree.ray_cast(Vector((s * 1.0, y, z)), Vector((-s, 0, 0)))
            if hit and abs(hit.x) > 0.2:
                ring.append(hit + nrm * 0.024)
        if len(ring) > 3:
            tr = tube("trim", ring, [0.021] * len(ring), seg=6, cap=False)
            paint(tr, lambda co, n: mix(TRIM, hexc(0xffa0c0), 0.4 * ss(0.2, 1.0, n.z - n.y)))
            trims.append(tr)
    # faixa dourada larga na cintura, com o nó caindo na frente
    sash = tube("sash", [(0, 0.0, z0 - 0.16), (0, 0.0, z0 + 0.02), (0, 0.0, z0 + 0.17)], [0.265, 0.258, 0.252], seg=24)
    sash.data.transform(Matrix.Diagonal((1.0, 0.82, 1.0, 1.0)))

    def stint(co, n):
        c = gold(co, n)
        return c
    paint(sash, stint)
    knot = ball("knot", (0.06, -0.2, z0 - 0.02), (0.05, 0.035, 0.045), seg=(10, 8))
    paint(knot, gold)
    tails = []
    for dx, ln in ((0.0, 0.17), (0.07, 0.13)):   # duas pontas largas de pano caindo do nó, sobre a fumaça
        tl = tube("sashtail", [(0.06, -0.21, z0 - 0.04), (0.06 + dx * 0.5, -0.225, z0 - 0.04 - ln * 0.5), (0.06 + dx, -0.22, z0 - 0.04 - ln)],
                  [0.04, 0.045, 0.05], seg=8, squash=(1.0, 0.25), ref=(0, 1, 0))
        paint(tl, stint)
        tails.append(tl)
    gem = ball("sashgem", (0.0, -0.225, z0 - 0.01), (0.04, 0.014, 0.04), seg=(12, 8))
    paint(gem, lambda co, n: mix(hexc(0x1e9a8a), hexc(0x8affe8), ss(0.3, 1.0, n.z - n.y)))
    return {"torso": [t, sash, gem], "torso@flat": [v] + trims}


# ------------------------------------------------------------------ braços nus e grossos, braceletes de ouro, mãos abertas
def open_hand(x, y, z, s):
    """mão aberta numa malha só: palma achatada (dorso para fora), quatro dedos levemente abertos e curvos, polegar na frente"""
    els = [EL((x, y, z), (0.058, 0.085, 0.08))]
    for k, dy in enumerate((-0.055, -0.019, 0.019, 0.055)):
        L = 0.15 - abs(dy) * 0.6
        a = (x, y + dy, z - 0.05)
        b = (x - s * 0.01, y + dy * 1.7, z - 0.05 - L * 0.55)
        c = (x - s * 0.035, y + dy * 2.2, z - 0.05 - L)
        els += [CAP(a, b, 0.019, stiff=3.0), CAP(b, c, 0.016, stiff=3.0)]
    els += [CAP((x - s * 0.01, y - 0.06, z + 0.01), (x - s * 0.04, y - 0.11, z - 0.03), 0.021, stiff=3.0),
            CAP((x - s * 0.04, y - 0.11, z - 0.03), (x - s * 0.05, y - 0.13, z - 0.08), 0.017, stiff=3.0)]
    f = meta("hand", els, res=0.006)
    smooth(f, iters=1, target=420)
    paint(f, skin)
    return [f]


def arms():
    out = {}
    for side, s in (("L", -1), ("R", 1)):
        ax, ay, az = RIG.P("arm" + side)
        a = meta("arm" + side, [EL((ax + s * 0.03, ay, az - 0.01), (0.15, 0.15, 0.13)),        # deltoide
                                 CAP((ax, ay, az - 0.05), (ax, ay, az - RIG.arm), 0.1),
                                 EL((ax, ay - 0.04, az - 0.19), (0.12, 0.12, 0.12)),            # bíceps
                                 EL((ax, ay + 0.04, az - 0.18), (0.1, 0.1, 0.12))], res=0.012)  # tríceps
        smooth(a, iters=1, target=360)
        paint(a, skin)
        fx, fy, fz = RIG.P("fore" + side)
        f = meta("fore" + side, [CAP((fx, fy, fz), (fx, fy, fz - 0.26), 0.09),
                                  EL((fx, fy, fz - 0.08), (0.115, 0.11, 0.13))], res=0.012)
        smooth(f, iters=1, target=320)
        paint(f, skin)
        # bracelete largo de ouro com dois frisos
        br = tube("bracer", [(fx, fy, fz - 0.06), (fx, fy, fz - 0.075), (fx, fy, fz - 0.09), (fx, fy, fz - 0.23),
                             (fx, fy, fz - 0.245), (fx, fy, fz - 0.26)], [0.112, 0.13, 0.121, 0.114, 0.124, 0.104], seg=18)
        paint(br, gold)
        out["arm" + side] = [a]
        out["fore" + side] = [f, br] + open_hand(fx, fy, fz - HAND + 0.01, s)
    return out


# ------------------------------------------------------------------ quadril: fumaça grossa saindo de baixo da faixa
def hips():
    z = RIG.P("hips")[2]
    h = meta("hips", [EL((0, 0.0, z + 0.02), (0.2, 0.15, 0.12))], res=0.012)
    smooth(h, iters=1, target=300)
    paint(h, lambda co, n: smoke_col(0.0, co, n))
    # pano roxo pendendo da faixa, só na frente (as pontas da faixa), sobre o começo da fumaça
    zt = RIG.P("torso")[2]
    sk = tube("flap", [(0.0, -0.24, zt - 0.14), (0.01, -0.25, zt - 0.24), (0.03, -0.22, zt - 0.36)], [0.12, 0.11, 0.08],
              seg=12, squash=(1.0, 0.22), ref=(0, 1, 0))
    smooth(sk)
    paint(sk, cloth(VEST, VEST_D, VEST_L))
    sk["no_ao"] = True
    return {"hips": [h, sk]}


def smoke_col(u, co, n):
    """cor da fumaça ao longo da cauda (u 0 = quadril, 1 = ponta): turquesa, azul, roxo, magenta, coral"""
    k = max(0.0, min(0.9999, u)) * (len(SMOKE) - 1)
    i = int(k)
    c = mix(SMOKE[i], SMOKE[i + 1], k - i)
    c = mix(tuple(x * 0.6 for x in c), c, 0.5 + 0.5 * ss(-0.6, 0.6, n.z - 0.2 * n.y))
    # veios claros da fumaça girando em volta da cauda, no mesmo tom (sem faixa escura)
    a = math.atan2(co.y, co.x)
    return mix(c, tuple(min(1, x * 1.25 + 0.05) for x in c), 0.35 * ss(0.7, 0.95, math.sin(a * 2 + u * 18)))


def catmull(pts, n):
    P = [Vector(p) for p in pts]
    P = [P[0] * 2 - P[1]] + P + [P[-1] * 2 - P[-2]]
    out = []
    for i in range(1, len(P) - 2):
        for k in range(n):
            t = k / n
            p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(P[-2])
    return out


# ------------------------------------------------------------------ cauda: fumaça grossa afinando em S, um pedaço por osso
def tail():
    pts = [RIG.P("hips")] + TAIL + TIP
    curve = catmull(pts, 8)
    L = [0.0]
    for a, b in zip(curve, curve[1:]):
        L.append(L[-1] + (b - a).length)
    tot = L[-1]

    def rad(u):   # grossa embaixo da faixa, afina até a ponta; bolhas de fumaça ao longo
        return (0.28 * (1 - u) ** 1.35 + 0.03) * (1 + 0.07 * math.sin(u * 30))   # funil largo na cintura, afinando até a ponta
    # um tubo só, cortado nos anéis das juntas: cada osso leva os anéis do seu pivô até o do próximo (sem sobreposição,
    # que dava faces brigando na emenda)
    piv = [Vector(p) for p in TAIL]
    idx = [min(range(len(curve)), key=lambda i: (curve[i] - p).length) for p in piv]
    us = [L[i] / tot for i in range(len(curve))]
    SEG = 18
    whole = tube("smoke", curve, [rad(u) for u in us], seg=SEG, cap=True)
    paint(whole, lambda co, n: smoke_col(us[min(range(len(curve)), key=lambda i: (curve[i] - co).length)], co, n))
    out = {}
    nring = len(curve) - 1
    for b_, bone in enumerate(TAIL_BONES):
        r0 = idx[b_] if b_ else 0
        r1 = idx[b_ + 1] if b_ + 1 < len(idx) else nring
        o = whole.copy()
        o.data = whole.data.copy()
        link(o)
        keep_cap = bone == "tail4"

        def drop(fi, r0=r0, r1=r1, keep_cap=keep_cap):
            if fi < nring * SEG:
                return not (r0 <= fi // SEG < r1)
            cap_end = fi >= nring * SEG + SEG   # a segunda tampa é a da ponta
            return not (keep_cap and cap_end)
        import bmesh
        bm = bmesh.new()
        bm.from_mesh(o.data)
        bm.faces.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if drop(f.index)], context="FACES")
        bm.to_mesh(o.data)
        bm.free()
        for p_ in o.data.polygons:
            p_.use_smooth = True
        o["no_ao"] = True
        out[bone] = [o]
    bpy.data.objects.remove(whole)
    # ponta em labaredas: três línguas finas abrindo da ponta, laranja vivo
    end = curve[-1]
    tan = (curve[-1] - curve[-4]).normalized()
    side = tan.cross(Vector((0, 0, 1))).normalized()
    up = Vector((0, 0, 1))
    for k, (sd, lift, ln, curl) in enumerate(((0.0, 0.3, 0.3, -0.6), (0.8, 0.0, 0.22, 0.8), (-0.8, 0.15, 0.2, -0.8), (0.35, -0.4, 0.15, 0.5))):
        d = (tan + side * sd + up * lift).normalized()
        fp = [end - tan * 0.06, end + d * ln * 0.45, end + d * ln * 0.8 + side * curl * ln * 0.25, end + d * ln + side * curl * ln * 0.5]
        f = tube("flame", catmull(fp, 4), [0.042 * (1 - q / 13) ** 0.9 + 0.003 for q in range(13)], seg=8, squash=(1.0, 0.45),
                 ref=tuple(side))
        smooth(f)
        paint(f, lambda co, n, e=end, ln=ln: mix(mix(hexc(0xa8286a), hexc(0xe0506a), ss(0.0, ln * 0.5, (co - e).length)), hexc(0xff8a7a),
                                                  ss(ln * 0.5, ln, (co - e).length)))
        out.setdefault("tail4@lit", []).append(f)
    return out


if __name__ == "__main__":
    reset()
    parts = merge(place_head(RIG, head(), lift=HEAD_LIFT, scale=HEAD_SCALE, fwd=0.02), torso(), hips(), arms(), tail())
    finish("mirage_djinn", RIG, parts, ARGS, body_center=(0, 0, 0.95), body_dist=5.0, head_dist=1.6)
