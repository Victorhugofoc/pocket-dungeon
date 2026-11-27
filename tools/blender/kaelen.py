# Kaelen (herói, duelista da tempestade) modelado no Blender (M2-11). Brief: docs/briefs/kaelen.md. Rodar: ver tools/blender/README.md.
# Bípede sobre o humanoid.py, no molde do seraph.py: rosto humano (método da Frostine, em escala maior), cabelo branco revolto em
# mechas com uma caindo sobre o olho direito, casaco azul-marinho com debrum dourado e placas azul-claras, lenço vermelho, capa
# caída do lado direito com forro vermelho. Sem espada (decisão do usuário, 2026-11-26: é mago do raio): mão direita aberta, palma
# para cima, e o raio sobre ela fica por código (cast-heroes.ts), para piscar e crescer no ataque (M5-09).
# Regiões de cor (skins, M13-06): primary = azul-marinho (casaco, capa, botas), secondary = vermelho (lenço, forro), accent = dourado.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from humanoid import ROOT, Rig, finish, merge, place_head, xform3  # noqa: E402
from robed import fore_rot, local_dir  # noqa: E402
from seraph import girdle, on_surface  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
# as mesmas medidas e pose da receita (cast-heroes.ts); tests/models.test.ts confere as medidas
RIG = Rig(hipY=0.95, headY=0.58, shoulderY=0.46, shoulderX=0.27, arm=0.33, hipX=0.12, thigh=0.44, bulk=0.92)
HAND = 0.31
# mão direita aberta à frente e ao lado, palma para cima na altura da cintura (o raio por código fica sobre ela); a esquerda solta
POSE_R, POSE_L, LEAN, OUT = (-0.25, -1.15, 0.0, -0.15), (0.08, -0.3), 0.03, 0.13
HEAD_LIFT, HEAD_SCALE = 0.19, 1.75

SKIN, SKIN_D, SKIN_L = hexc(0xf7c69c), hexc(0xcc8458), hexc(0xffe2c4)
HAIR, HAIR_L, HAIR_D = hexc(0xe6e0d6), hexc(0xf8f4ec), hexc(0xa49cb4)   # prata quente, sombra lilás (sprite)
NAVY, NAVY_D, NAVY_L = hexc(0x2f4a8c), hexc(0x16214a), hexc(0x4a6ab4)   # mais claro que o sprite: na câmera do jogo o casaco sumia no chão escuro
CAPE = hexc(0x1c2a55)   # capa por fora, mais escura que o casaco (no jogo ela clareava)
STEEL, STEEL_L = hexc(0x4f88c8), hexc(0x8cc0ec)   # placas azul-claras
GOLD, GOLD_D, GOLD_L = hexc(0xe39a34), hexc(0x9c5a1a), hexc(0xffcf7a)
RED, RED_D, RED_L = hexc(0x8a2232), hexc(0x40101a), hexc(0xb03a48)
PANTS, PANTS_D = hexc(0x5a5a66), hexc(0x2a2a34)
BOOT, BOOT_D, BOOT_L = hexc(0x1c264c), hexc(0x0a0e20), hexc(0x34467e)
DARK, IRIS, BROW, LIPS = hexc(0x1a1e30), hexc(0x3a5a8a), hexc(0x8e8a98), hexc(0xb47460)
LEATHER, LEATHER_D = hexc(0x3a2c26), hexc(0x1c1412)


def cloth(base, dark, light=None):
    def f(co, n):
        c = mix(dark, base, 0.35 + 0.65 * ss(-0.7, 0.5, n.z))
        return mix(c, light, 0.35 * ss(0.5, 1.0, n.z)) if light else c
    return f


def skin(co, n):
    c = mix(SKIN_D, SKIN, 0.5 + 0.5 * ss(-0.6, 0.5, n.z - 0.3 * n.y))
    return mix(c, SKIN_L, 0.25 * ss(0.5, 1.0, -n.y + n.z))


def hair(co, n):
    c = mix(HAIR_D, HAIR, 0.4 + 0.6 * ss(-0.6, 0.55, n.z - 0.25 * n.y))
    return mix(c, HAIR_L, 0.4 * ss(0.45, 1.0, n.z))


def gold(co, n):
    t = 0.25 + 0.75 * ss(-0.6, 0.8, n.z)
    return mix(mix(GOLD_D, GOLD, t), GOLD_L, 0.5 * ss(0.65, 1.0, n.z * 0.6 - n.y * 0.5))


def plate(co, n):
    t = 0.2 + 0.8 * ss(-0.7, 0.7, n.z)
    return mix(mix(NAVY_L, STEEL, t), STEEL_L, 0.55 * ss(0.5, 1.0, n.z * 0.6 - n.y * 0.6))


def gilt(o, emb=True):
    paint(o, gold)
    region(o, "accent")
    if emb:
        o["embed"] = True
    return o


# ------------------------------------------------------------------ cabeça: rosto jovem e decidido, cabelo branco revolto
def head():
    parts = {"solid": [], "flat": [], "lit": []}
    h = meta("head", [
        EL((0, 0.01, 0.025), (0.08, 0.086, 0.09)),                   # crânio
        EL((0, -0.028, -0.024), (0.068, 0.066, 0.07)),               # rosto
        EL((0, -0.04, -0.066), (0.05, 0.05, 0.036)),                 # maxilar mais firme, queixo curto
        EL((-0.04, -0.046, -0.024), (0.03, 0.026, 0.03), stiff=1.5),  # maçãs suaves (a dobra entre maçã e nariz vazava o contorno)
        EL((0.04, -0.046, -0.024), (0.03, 0.026, 0.03), stiff=1.5),
        CAP((0, -0.084, 0.012), (0, -0.102, -0.02), 0.012),          # nariz reto
        EL((-0.032, -0.094, 0.012), (0.018, 0.014, 0.01), neg=True),  # órbitas rasas
        EL((0.032, -0.094, 0.012), (0.018, 0.014, 0.01), neg=True),
        EL((-0.08, 0.0, -0.005), (0.012, 0.02, 0.026)),              # orelhas
        EL((0.08, 0.0, -0.005), (0.012, 0.02, 0.026)),
        CAP((0, 0.0, -0.08), (0, 0.01, -0.2), 0.03),                 # pescoço
    ], res=0.006)
    smooth(h, iters=2, factor=0.5)
    remesh(h, 780, iters=2)   # malha uniforme: a redução por colapso deixava planos no nariz e nas bochechas
    paint(h, skin)
    h["no_ao"] = True
    parts["solid"].append(h)

    def on(x, z, lift=0.0):
        ok, hit, nrm, _ = h.ray_cast(Vector((x, -0.5, z)), Vector((0, 1, 0)))
        return hit + nrm * lift if ok else Vector((x, -0.09, z))

    for s in (-1, 1):
        c = on(s * 0.033, 0.01, 0.002)
        white = sball("eyew", tuple(c), (0.02, 0.008, 0.012), rot=(0, s * -0.2, 0), seg=(10, 6))
        paint(white, lambda co, n: hexc(0xf4f2ee))
        iris = sball("iris", tuple(c + Vector((-s * 0.002, -0.006, -0.001))), (0.0105, 0.004, 0.0105), seg=(10, 6))
        paint(iris, lambda co, n: IRIS)
        pup = sball("pupil", tuple(c + Vector((-s * 0.002, -0.0085, -0.001))), (0.005, 0.002, 0.005), seg=(6, 4))
        paint(pup, lambda co, n: DARK)
        hi = sball("hi", tuple(c + Vector((s * 0.002, -0.01, 0.004))), (0.0032, 0.002, 0.0032), seg=(6, 4))
        paint(hi, lambda co, n: hexc(0xffffff))
        # pálpebra de cima reta e escura (olhar firme, sem cílio de moça)
        lid = tube("lid", [on(s * 0.055, 0.019, 0.004), on(s * 0.034, 0.026, 0.005), on(s * 0.013, 0.021, 0.004)], [0.0035, 0.0055, 0.0035], seg=6)
        paint(lid, lambda co, n: DARK)
        # sobrancelha grossa, a ponta de dentro mais baixa: decidido
        brow = tube("brow", [on(s * 0.06, 0.046, 0.003), on(s * 0.037, 0.05, 0.004), on(s * 0.014, 0.045, 0.004)], [0.0015, 0.0052, 0.0015], seg=6)   # quase reta: sério, não bravo
        paint(brow, lambda co, n: BROW)
        parts["flat"] += [white, iris, pup, hi, lid, brow]
    # boca curta, de canto um pouco erguido (meio sorriso de duelista)
    mouth = tube("mouth", [on(-0.014, -0.051, 0.003), on(0, -0.052, 0.004), on(0.014, -0.051, 0.003)], [0.0012, 0.0024, 0.0012], seg=6)
    paint(mouth, lambda co, n: hexc(0x8a4a3c))
    nose = tube("nshadow", [on(-0.006, -0.031, 0.002), on(0, -0.032, 0.003), on(0.006, -0.031, 0.002)], [0.0012, 0.0022, 0.0012], seg=6)
    paint(nose, lambda co, n: hexc(0xe0a07c))
    parts["flat"] += [mouth, nose]

    # cabelo: calota volumosa jogada para trás, testa e rosto livres; gomos alongados na mesma metaball (a borda sai em ondas
    # macias, sem pontas soltas: mecha em cone espetada para fora vira chifre)
    HC = Vector((0, 0.02, 0.03))
    elems = [
        EL((0, 0.018, 0.04), (0.088, 0.094, 0.094)),               # massa de base menor: os gomos fazem a superfície de fora
        EL((0, 0.06, -0.01), (0.084, 0.07, 0.094)),
        EL((0, 0.04, 0.085), (0.075, 0.08, 0.05)),                   # volume no alto
        CAP((-0.078, 0.035, 0.02), (-0.084, 0.055, -0.06), 0.032),   # costeletas recuadas: rentes à bochecha, o contorno vazava nela
        CAP((0.078, 0.035, 0.02), (0.084, 0.055, -0.06), 0.032),
    ]
    for az, el, ln in ((0.0, 1.2, 0.06), (-0.8, 0.9, 0.055), (0.8, 0.9, 0.055), (-1.5, 0.45, 0.05), (1.5, 0.45, 0.05),
                       (-2.2, 0.55, 0.055), (2.2, 0.55, 0.055), (3.14, 0.7, 0.06), (-2.7, -0.1, 0.055), (2.7, -0.1, 0.055),
                       (-1.9, -0.25, 0.05), (1.9, -0.25, 0.05), (3.14, -0.2, 0.06)):
        d = Vector((math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el)))
        c = HC + d * 0.104
        flow = Vector((math.sin(az) * 0.4, 1.0, -0.6))               # o cabelo corre para trás e para baixo
        t = (flow - d * flow.dot(d)).normalized()
        rot = t.to_track_quat("Z", "Y").to_euler()
        elems.append(EL(tuple(c + t * ln * 0.4), (0.03, 0.026, ln), rot=tuple(rot)))
    def mlock(az, el, ln, w):
        """mecha deitada na calota, dentro da mesma metaball: base larga e ponta fina, achatada contra a cabeça. Tubos soltos
        por cima da calota liam como cristais e o contorno de cada um riscava a têmpora"""
        d = Vector((math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el)))
        flow = Vector((math.sin(az) * 0.3, 0.4, -1.0))
        t = (flow - d * flow.dot(d)).normalized()
        rot = Matrix((d, t.cross(d), t)).transposed().to_euler()   # x = normal (fino), z = ao longo da mecha
        c = HC + d * 0.1
        elems.append(EL(tuple(c + t * ln * 0.3), (w * 0.6, w, ln * 0.5), rot=tuple(rot)))
        elems.append(EL(tuple(c + t * ln * 0.8 + d * 0.012), (w * 0.42, w * 0.6, ln * 0.34), rot=tuple(rot)))   # ponta solta da calota
    # barra revolta dos lados e da nuca (a de trás cai até a gola: de costas o cabelo virava uma bola lisa)
    for az, el, ln, w in ((-2.35, -0.4, 0.11, 0.03), (2.35, -0.4, 0.11, 0.03), (-2.0, 0.05, 0.1, 0.028), (2.0, 0.05, 0.1, 0.028),
                          (-2.1, -0.55, 0.14, 0.028), (2.1, -0.55, 0.14, 0.028), (-2.65, -0.5, 0.16, 0.032), (2.65, -0.5, 0.16, 0.032),
                          (3.14, -0.5, 0.17, 0.034), (-2.95, -0.25, 0.12, 0.03), (2.9, -0.3, 0.12, 0.03)):
        mlock(az, el, ln, w)
    elems += [EL((0, -0.1, -0.04), (0.072, 0.074, 0.104), neg=True),        # rosto livre
              EL((0, -0.09, 0.045), (0.06, 0.035, 0.028), neg=True)]       # testa livre (a franja cobre por cima)
    hr = meta("hair", elems, res=0.006)
    smooth(hr, iters=1, factor=0.5)
    remesh(hr, 1370, iters=1)   # malha uniforme: reduzido por colapso, o cabelo lia como papel amassado
    paint(hr, hair)
    parts["solid"].append(hr)

    def lock(name, root, dirn, ln, w, side=(0, 0, 0), flat_ref=None, droop=0.0, lift=None):
        """mecha larga e achatada, que afina na ponta arredondada e se curva para o lado (side)"""
        root, d = Vector(root), Vector(dirn).normalized()
        pts, radii = [], []
        for i in range(8):
            u = i / 7
            p = root + d * ln * u + Vector((0, 0, -droop)) * ln * u * u + Vector(side) * ln * u * u
            if lift is not None:
                p = p + Vector(lift) * ln * u * u
            pts.append(p)
            radii.append(w * (1 - u ** 1.6) + 0.0025)   # ponta fina: com ponta larga a mecha lia como placa
        o = tube(name, pts, radii, seg=8, squash=(1.0, 0.55), ref=flat_ref)
        smooth(o, iters=1)
        paint(o, hair)
        return o

    # franja: poucas mechas largas e chatas, de comprimentos diferentes, varridas para os lados (em fileira regular viravam dentes)
    for k, (x0, dx, ln, w) in enumerate(((-0.065, -0.6, 0.045, 0.034), (-0.028, -0.35, 0.05, 0.04), (0.012, 0.1, 0.042, 0.036))):
        root = Vector((x0, -0.07, 0.095))
        o = lock("bang", root, (dx, -0.62, -0.8), ln, w, side=(dx * 0.4, 0, 0), flat_ref=(0, 1, 0), droop=0.35)
        parts["flat"].append(o)   # sem contorno: o contorno entre mechas e testa virava riscos e uma faixa preta
    # a mecha comprida que cai sobre o olho direito (+x) até a maçã do rosto
    over = lock("eyelock", (0.035, -0.078, 0.09), (0.18, -0.45, -1.0), 0.095, 0.034, flat_ref=(0, 1, 0), droop=0.0)
    parts["flat"].append(over)
    return parts


def chest_plate(obj, xc, zc, hw, hh, off=0.01, nx=6, nz=6):
    """casca pousada na frente de obj por raios (+y), retângulo de cantos redondos (hw x hh), e o debrum em anel fechado"""
    def shape(u, v):   # u, v em -1..1 -> ponto do retângulo arredondado (superelipse)
        return xc + hw * u, zc + hh * v
    bm = bmesh.new()
    grid = []
    for i in range(nz + 1):
        v = -1 + 2 * i / nz
        row = []
        for j in range(nx + 1):
            u = -1 + 2 * j / nx
            k = max(abs(u), abs(v))
            sc = 1.0 if k == 0 else k / (abs(u) ** 4 + abs(v) ** 4) ** 0.25   # quadrado -> superelipse
            x, z = shape(u * sc, v * sc)
            p, _ = on_surface(obj, (x, 0, z), (0, 1, 0), off)
            row.append(bm.verts.new(p if p is not None else (x, -0.12, z)))
        grid.append(row)
    for i in range(nz):
        for j in range(nx):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    pl = new_mesh("chestplate", bm)
    sol = pl.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.012
    sol.offset = -1
    apply_mods(pl)
    for p in pl.data.polygons:
        p.use_smooth = True
    paint(pl, plate)
    region(pl, "primary")
    pl["embed"] = True
    ring = []
    for j in range(18):
        a = 2 * math.pi * j / 18
        c, s_ = math.cos(a), math.sin(a)
        r = 1 / (abs(c) ** 4 + abs(s_) ** 4) ** 0.25
        x, z = shape(c * r * 0.98, s_ * r * 0.98)
        p, _ = on_surface(obj, (x, 0, z), (0, 1, 0), off + 0.004)
        if p is not None:
            ring.append(p)
    return pl, loop_tube("platerim", ring, 0.014, ref=(0, 1, 0), seg=4, squash=(1.0, 0.7))


# ------------------------------------------------------------------ tronco: casaco esguio, placa azul-clara, debrum, lenço vermelho
def torso():
    z0 = RIG.P("torso")[2]
    t = meta("torso", [
        EL((0, 0.0, z0 + 0.33), (0.2, 0.13, 0.17)),                  # peito
        EL((0, -0.01, z0 + 0.17), (0.17, 0.115, 0.12)),              # barriga
        EL((0, 0.0, z0 + 0.04), (0.16, 0.11, 0.08)),                 # cintura
        EL((-0.19, 0.0, z0 + 0.43), (0.075, 0.075, 0.055)),          # ombros
        EL((0.19, 0.0, z0 + 0.43), (0.075, 0.075, 0.055)),
    ], res=0.01)
    smooth(t, iters=2, target=190)
    paint(t, cloth(NAVY, NAVY_D, NAVY_L))
    region(t, "primary")
    out = [t]
    flat = []
    # fecho do casaco: debrum dourado descendo um pouco à direita do meio, com botões
    pts = []
    for k in range(7):
        u = k / 6
        q, _ = on_surface(t, (0.035 - 0.01 * u, 0, z0 + 0.48 - 0.42 * u), (0, 1, 0), 0.004)
        if q is not None:
            pts.append(q)
    seam = tube("seam", pts, [0.013] * len(pts), seg=5, squash=(1.0, 0.5), ref=(0, 1, 0))
    paint(seam, gold)
    region(seam, "accent")
    flat.append(seam)
    for k in range(3):
        q, _ = on_surface(t, (-0.02, 0, z0 + 0.36 - 0.1 * k), (0, 1, 0), 0.008)
        if q is not None:
            out.append(gilt(sball("button", q, (0.017, 0.01, 0.017), seg=(8, 5))))
    # placa azul-clara no peito esquerdo (sprite): casca colada na frente do casaco, de cantos arredondados, com debrum dourado
    pl, rim = chest_plate(t, -0.115, z0 + 0.33, 0.075, 0.09)
    out.append(pl)
    flat.append(gilt(rim, emb=False))
    # cinto de couro com fivela dourada e o debrum dourado logo acima
    belt = tube("belt", [(0, 0.0, z0 + 0.05), (0, 0.0, z0 - 0.02)], [0.172, 0.172], seg=16, squash=(1.0, 0.72), cap=False)
    paint(belt, cloth(LEATHER, LEATHER_D))
    belt["embed"] = True
    trim = girdle("waisttrim", t, z0 + 0.085, r=0.012, n=16, off=0.004, squash=(1.0, 1.3), seg=4)
    buckle = sball("buckle", (0.0, -0.128, z0 + 0.015), (0.04, 0.016, 0.034), seg=(8, 5))
    out += [belt, gilt(trim), gilt(buckle)]
    # gola alta do casaco e lenço vermelho enrolado no pescoço, com a ponta caindo sobre o peito direito
    collar = tube("collar", [(0, 0.005, z0 + 0.49), (0, 0.01, z0 + 0.62)], [0.14, 0.125], seg=16, squash=(1.0, 0.92), cap=False)
    smooth(collar, iters=1)
    paint(collar, cloth(NAVY, NAVY_D, NAVY_L))
    region(collar, "primary")
    crim = tube("collarrim", [(0, 0.01, z0 + 0.615), (0, 0.01, z0 + 0.63)], [0.128, 0.128], seg=16, cap=False)
    scarf = tube("scarf", [(0, 0.0, z0 + 0.46), (0, -0.005, z0 + 0.5), (0, 0.0, z0 + 0.535)], [0.165, 0.158, 0.142], seg=16, squash=(1.0, 0.92), cap=False)
    smooth(scarf, iters=1)
    paint(scarf, cloth(RED, RED_D, RED_L))
    region(scarf, "secondary")
    out += [collar, gilt(crim), scarf]
    pts = []
    for k in range(5):
        u = k / 4
        q, _ = on_surface(t, (0.07 + 0.03 * u, 0, z0 + 0.48 - 0.2 * u), (0, 1, 0), 0.018)
        if q is not None:
            pts.append(q)
    tail = tube("scarftail", pts, [0.05 - 0.012 * k / 4 for k in range(len(pts))], seg=6, squash=(1.0, 0.35), ref=(0, 1, 0))
    smooth(tail, iters=1)
    paint(tail, cloth(RED, RED_D, RED_L))
    region(tail, "secondary")
    tail["embed"] = True
    out.append(tail)
    return {"torso": out, "torso@flat": flat}


def hips():
    z = RIG.P("hips")[2]
    p = meta("hips", [EL((0, 0.0, z + 0.02), (0.165, 0.115, 0.1))], res=0.012)
    smooth(p, iters=1, target=120)
    paint(p, cloth(PANTS, PANTS_D))
    out = [p]
    # abas do casaco abertas na frente, até o meio da coxa, com a barra dourada
    nu, nv = 14, 3
    ztop, zbot = z + 0.06, z - 0.3
    bm = bmesh.new()
    grid = []
    gap = 0.42   # abertura da frente (rad, cada lado)
    for i in range(nv + 1):
        v = i / nv
        zz = ztop + (zbot - ztop) * v
        rx, ry = 0.2 + 0.085 * v, 0.14 + 0.07 * v
        row = []
        for j in range(nu + 1):
            a = gap + (2 * math.pi - 2 * gap) * j / nu
            f = 1 + 0.05 * math.cos(a * 5) * v
            row.append(bm.verts.new((rx * f * math.sin(a), -ry * f * math.cos(a), zz)))
        grid.append(row)
    for i in range(nv):
        for j in range(nu):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    sk = new_mesh("coattail", bm)
    sol = sk.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.014
    sol.offset = 0
    apply_mods(sk)
    for poly in sk.data.polygons:
        poly.use_smooth = True
    paint(sk, lambda co, n: cloth(NAVY, NAVY_D, NAVY_L)(co, n) if n.dot(Vector((co.x, co.y, 0)).normalized()) > 0 else mix(NAVY_D, NAVY, 0.75))   # dentro sem sumir no preto
    region(sk, "primary")
    sk["no_ao"] = True
    rx, ry = 0.285, 0.21
    hem = [Vector((rx * (1 + 0.05 * math.cos(a * 5)) * math.sin(a), -ry * (1 + 0.05 * math.cos(a * 5)) * math.cos(a), zbot + 0.006))
           for a in [gap + (2 * math.pi - 2 * gap) * j / nu for j in range(nu + 1)]]
    hm = tube("coathem", hem, [0.013] * len(hem), seg=5)
    edges = []
    for sd in (-1, 1):   # debrum das duas bordas da abertura
        a = gap if sd > 0 else 2 * math.pi - gap
        edges.append(tube("coatedge", [Vector(((0.2 + 0.085 * v) * math.sin(a), -(0.14 + 0.07 * v) * math.cos(a), ztop + (zbot - ztop) * v))
                                       for v in (0.0, 0.5, 1.0)], [0.012] * 3, seg=5))
    return {"skirt": [sk, gilt(hm), *[gilt(e) for e in edges]], "hips": out}


# ------------------------------------------------------------------ capa: caída do lado direito, azul-marinho por fora, forro vermelho
def cape():
    ztop = RIG.P("armL")[2] + 0.05
    nu, nv = 12, 6
    bm = bmesh.new()
    grid = []
    a0, a1 = -1.0, 2.4      # do meio das costas à esquerda até a frente do ombro direito (+x)
    for i in range(nv + 1):
        v = i / nv
        row = []
        for j in range(nu + 1):
            u = j / nu
            a = a0 + (a1 - a0) * u
            side = ss(0.2, 1.0, u)                       # quanto mais à direita, mais longa e mais solta
            zbot = 0.42 - 0.14 * side
            z = ztop + (zbot - ztop) * v
            rx = 0.24 + (0.12 + 0.1 * side) * v ** 0.8
            ry = 0.15 + 0.22 * v ** 0.9
            fold = 0.17 * math.sin(u * 4.0 * math.pi) * ss(0.1, 0.5, v)
            r = 1.0 + fold
            x = rx * math.sin(a) * r + 0.04 * side
            y = 0.04 + ry * math.cos(a) * r + 0.1 * v * v
            row.append(bm.verts.new((x, y, z + 0.035 * math.sin(u * 9.0 + 0.6) * v ** 3)))
        grid.append(row)
    for i in range(nv):
        for j in range(nu):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    c = new_mesh("cape", bm)
    sol = c.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.02
    sol.offset = 0
    apply_mods(c)
    for p in c.data.polygons:
        p.use_smooth = True

    def tint(co, n):
        radial = Vector((co.x, co.y - 0.04, 0))
        outside = radial.length < 1e-4 or n.dot(radial.normalized()) > 0
        if outside:
            u = (math.atan2(co.x - 0.04, co.y - 0.04) - a0) / (a1 - a0)
            valley = max(0.0, -math.sin(u * 4.0 * math.pi))
            base = mix(NAVY_D, mix(CAPE, NAVY, 0.3 * ss(0.3, 1.0, n.z)), 0.4 + 0.6 * ss(-0.6, 0.5, n.z))
            return mix(base, NAVY_D, 0.7 * valley)   # vale das pregas escuro: de costas a capa lia como chapa lisa
        return mix(RED_D, RED, 0.5 + 0.5 * ss(-0.5, 0.6, n.z))
    paint(c, tint)
    region(c, "primary")
    c["no_ao"] = True
    out = [c]
    # debrum dourado na barra e na borda da frente
    hem, front = [], []
    for j in range(nu + 1):
        u = j / nu
        side = ss(0.2, 1.0, u)
        a = a0 + (a1 - a0) * u
        zb = 0.42 - 0.14 * side
        fold = 0.13 * math.sin(u * 4.0 * math.pi)
        rx, ry = (0.24 + 0.12 + 0.1 * side) * (1 + fold), (0.15 + 0.22) * (1 + fold)
        hem.append(Vector((rx * math.sin(a) + 0.04 * side, 0.04 + ry * math.cos(a) + 0.1, zb + 0.035 * math.sin(u * 9.0 + 0.6) + 0.008)))
    out.append(gilt(tube("capehem", hem, [0.014] * len(hem), seg=5)))
    for i in range(nv + 1):
        v = i / nv
        zb = 0.28
        z = ztop + (zb - ztop) * v
        rx, ry = 0.24 + 0.22 * v ** 0.8, 0.15 + 0.22 * v ** 0.9
        fold = 0.13 * math.sin(4.0 * math.pi) * ss(0.1, 0.5, v)
        front.append(Vector((rx * math.sin(a1) * (1 + fold) + 0.04, 0.04 + ry * math.cos(a1) * (1 + fold) + 0.1 * v * v,
                             z + 0.035 * math.sin(9.6) * v ** 3)))
    # sem debrum na borda da frente: a faixa dourada vertical ao lado da mão lia como cajado
    # gola enrolada e broche no ombro direito
    roll = []
    for k in range(13):
        a = a0 + (a1 - a0) * k / 12
        roll.append((0.245 * math.sin(a), 0.04 + 0.155 * math.cos(a), ztop + 0.005))
    rl = tube("caperoll", roll, [0.026] * 13, seg=6)
    paint(rl, cloth(NAVY, NAVY_D, NAVY_L))
    region(rl, "primary")
    rl["embed"] = True
    out.append(rl)
    out.append(gilt(sball("clasp", (0.245 * math.sin(a1 - 0.25), 0.02 + 0.155 * math.cos(a1 - 0.25), ztop), (0.035, 0.022, 0.035), seg=(8, 6))))
    return {"cape": out}


# ------------------------------------------------------------------ mão aberta (direita), palma para cima no mundo
def open_hand(h, up):
    """palma achatada perpendicular a `up` (vertical do mundo no osso) e dedos curtos levemente curvos para cima"""
    up = Vector(up)
    fwd = Vector((0, 0, -1))   # ao longo do antebraço
    side = fwd.cross(up).normalized()
    palm = tube("palm", [h + fwd * 0.0, h + fwd * 0.05], [0.04, 0.038], seg=10, squash=(1.0, 0.45), ref=tuple(up))
    smooth(palm)
    paint(palm, skin)
    palm["no_ao"] = True
    flat = []
    for k, dx in enumerate((-0.03, -0.01, 0.01, 0.03)):
        ln = 0.06 if k in (1, 2) else 0.05
        b0 = h + fwd * 0.045 + side * dx
        f = tube("finger", [b0, b0 + fwd * ln * 0.6 + side * dx * 0.2 + up * 0.008, b0 + fwd * ln + side * dx * 0.35 + up * 0.026],
                 [0.0105, 0.009, 0.005], seg=6)
        paint(f, skin)
        flat.append(f)
    th = tube("thumb", [h + side * 0.032 + fwd * 0.01, h + side * 0.064 + fwd * 0.035 + up * 0.024], [0.012, 0.006], seg=6)
    paint(th, skin)
    flat.append(th)
    return [palm], flat


# ------------------------------------------------------------------ braços e pernas
def fist(name, c, s):
    knuck = [EL((c[0] + s * 0.016, c[1] - 0.034 + 0.008 * abs(dz) / 0.024, c[2] - 0.03 + dz), (0.016, 0.016, 0.013)) for dz in (-0.018, -0.006, 0.006, 0.018)]
    thumb = CAP((c[0] - s * 0.02, c[1] - 0.03, c[2] + 0.01), (c[0] - s * 0.005, c[1] - 0.045, c[2] - 0.02), 0.012)
    f = meta(name, [EL(c, (0.036, 0.038, 0.045)), thumb] + knuck, res=0.006)
    smooth(f, iters=1, target=110)
    paint(f, skin)
    f["no_ao"] = True
    return f


def pauldron(c, sd):
    """ombreira azul-clara de duas lâminas com o debrum dourado"""
    solid, flat = [], []
    for k in range(2):
        cc = Vector(c) + Vector((sd * 0.03, 0, -0.06)) * k
        rr = 0.092 * (1 - 0.15 * k)
        rot = (0, sd * (0.5 + 0.35 * k), 0)
        o = sball(f"pauldron{k}", cc, (rr, rr * 1.05, rr * 0.36), rot=rot, seg=(10, 6))
        paint(o, plate)
        region(o, "primary")
        solid.append(o)
        m = Euler(rot).to_matrix()
        ring = [cc + m @ Vector((rr * math.cos(2 * math.pi * j / 12), rr * 1.05 * math.sin(2 * math.pi * j / 12), -0.008)) for j in range(12)]
        flat.append(gilt(loop_tube(f"pauldronrim{k}", ring, 0.012, ref=tuple(m @ Vector((0, 0, 1))), seg=4), emb=False))
    return solid, flat


def limbs():
    out = {}
    for side, s, pose in (("L", -1, POSE_L), ("R", 1, POSE_R)):
        ax, ay, az = RIG.P("arm" + side)
        a = meta("arm" + side, [CAP((ax, ay, az - 0.04), (ax, ay, az - RIG.arm + 0.03), 0.06)], res=0.01)
        smooth(a, iters=1, target=100)
        paint(a, cloth(NAVY, NAVY_D, NAVY_L))
        region(a, "primary")
        pad, padf = pauldron((ax + s * 0.02, ay, az + 0.0), s)
        fx, fy, fz = RIG.P("fore" + side)
        f = meta("fore" + side, [CAP((fx, fy, fz), (fx, fy, fz - HAND + 0.07), 0.052)], res=0.009)
        smooth(f, iters=1, target=100)
        paint(f, cloth(NAVY, NAVY_D, NAVY_L))
        region(f, "primary")
        cuff = tube("cuff", [(fx, fy, fz - HAND + 0.13), (fx, fy, fz - HAND + 0.05)], [0.058, 0.07], seg=12, cap=False)
        paint(cuff, plate)
        region(cuff, "primary")
        cuffrim = tube("cuffrim", [(fx, fy, fz - HAND + 0.058), (fx, fy, fz - HAND + 0.045)], [0.072, 0.072], seg=12, cap=False)
        fore_parts = [f, cuff, gilt(cuffrim)]
        flat = []
        if side == "R":
            fr, _ = fore_rot(POSE_R, 1, LEAN, OUT)
            palm, fing = open_hand(Vector((fx, fy, fz - HAND + 0.03)), local_dir(fr, (0, 0, 1)))
            fore_parts += palm
            flat += fing
        else:
            fore_parts.append(fist("fist", (fx, fy, fz - HAND), s))
        hx, hy, hz = RIG.P("thigh" + side)
        th = meta("thigh" + side, [CAP((hx, hy, hz - 0.02), (hx + s * 0.005, hy, hz - RIG.thigh + 0.04), 0.085),
                                   EL((hx, hy, hz - 0.16), (0.095, 0.095, 0.15))], res=0.011)
        smooth(th, iters=1, target=110)
        th["no_ao"] = True   # a oclusão da aba do casaco deixava uma mancha escura na coxa
        paint(th, cloth(PANTS, PANTS_D))
        kx, ky, kz = RIG.P("shin" + side)
        sh = meta("shin" + side, [CAP((kx, ky, kz - 0.03), (kx, ky, kz - 0.38), 0.07),
                                  EL((kx, ky + 0.005, kz - 0.2), (0.082, 0.085, 0.16)),          # cano da bota
                                  CAP((kx, ky - 0.1, kz - 0.45), (kx, ky - 0.2, kz - 0.46), 0.03),  # bico
                                  EL((kx, ky - 0.06, kz - 0.44), (0.07, 0.12, 0.045))], res=0.01)
        smooth(sh, iters=1, target=100)
        paint(sh, cloth(BOOT, BOOT_D, BOOT_L))
        region(sh, "primary")
        fold = tube("bootfold", [(kx, ky, kz - 0.045), (kx, ky, kz - 0.1)], [0.095, 0.088], seg=12, cap=False)   # dobra do cano
        smooth(fold, iters=1)
        paint(fold, cloth(BOOT_L, BOOT, STEEL))
        region(fold, "primary")
        out["arm" + side] = [a] + pad
        out["arm" + side + "@flat"] = padf
        out["fore" + side] = fore_parts
        if flat:
            out["fore" + side + "@flat"] = flat
        out["thigh" + side] = [th]
        out["shin" + side] = [sh, fold]
    return out


if __name__ == "__main__":
    reset()
    fr, arm = fore_rot(POSE_R, 1, LEAN, OUT)
    hand = Vector(RIG.p3["armR"]) + arm @ Vector((0, -RIG.arm, 0)) + fr @ Vector((0, -HAND, 0))
    print("HAND_R (three)", tuple(round(x, 3) for x in hand))
    parts = merge(place_head(RIG, head(), lift=HEAD_LIFT, scale=HEAD_SCALE), torso(), hips(), cape(), limbs())
    soften(parts)
    print("DIMS", RIG.dims_ts())
    finish("kaelen", RIG, parts, ARGS, body_center=(0, -0.1, 1.0), body_dist=4.6, head_dist=1.3, form="biped")
