# Vesper (heroína, bruxa-vespa do veneno) modelada no Blender (M2-11). Brief: docs/briefs/vesper.md. Rodar: ver tools/blender/README.md.
# Forma "robed": sem pernas; o manto e o abdômen de vespa ficam no osso "skirt", as asas no "cape". Cajado com caveira no foreR,
# em pé no mundo na pose de repouso da receita; o brilho verde das órbitas da caveira fica por código (cast-heroes.ts).
# Regiões de cor (para as skins, M13-06): primary = laranja das listras e faixas, secondary = manto escuro, accent = asas.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from humanoid import Rig, finish, merge, place_head  # noqa: E402
from robed import bell_sleeve, fore_rot, local_dir, ring_loft  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
# as mesmas medidas e pose da receita (cast-heroes.ts); tests/models.test.ts confere as medidas
RIG = Rig(hipY=0.84, headY=0.55, shoulderY=0.44, shoulderX=0.24, arm=0.31, hipX=0, thigh=0.42)
HAND = 0.3
POSE_R, POSE_L, LEAN, OUT = (-0.75, -0.8), (-0.35, -0.75), 0.28, 0.16   # cajado à frente; curvada
HEAD_LIFT, HEAD_SCALE, HEAD_TILT = 0.15, 1.6, -0.2   # a cabeça olha um pouco para cima, contra a curva do corpo
STAFF_TOP = 0.66      # ponta do cajado acima da mão, na vertical do mundo
SKULL_UP, SKULL_S = 0.16, 1.85   # centro da caveira acima da ponta e escala; cast-heroes.ts repete os dois para o brilho das órbitas

SKIN, SKIN_D, SKIN_L = hexc(0xf0cca8), hexc(0xa8765a), hexc(0xffe4c8)   # pálida e quente (a fria lia cinza-branca)
SHADE = hexc(0x9a7484)   # olheira acinzentada (sinistra)
ORANGE, ORANGE_D, ORANGE_L = hexc(0xd26d00), hexc(0x8f3801), hexc(0xf08a20)
GRAY, GRAY_D = hexc(0x3a3339), hexc(0x1d141e)   # listras
ROBE, ROBE_D, ROBE_L = hexc(0x322b32), hexc(0x140a0c), hexc(0x4a4048)
HAIR, HAIR_L = hexc(0x221c28), hexc(0x4a4054)
CREAM, AMBER = hexc(0xf0c070), hexc(0xd8801c)
BONE, BONE_D, BONE_L = hexc(0xe8b878), hexc(0x74401e), hexc(0xffe8bc)
WOOD, WOOD_D = hexc(0x9a6448), hexc(0x553222)   # marrom médio (o escuro sumia na câmera do jogo)
IRIS = hexc(0xa8d030)


def cloth(base, dark, light=None):
    def f(co, n):
        c = mix(dark, base, 0.35 + 0.65 * ss(-0.7, 0.5, n.z))
        return mix(c, light, 0.35 * ss(0.5, 1.0, n.z)) if light else c
    return f


def skin(co, n):
    c = mix(SKIN_D, SKIN, 0.5 + 0.5 * ss(-0.6, 0.5, n.z - 0.3 * n.y))
    return mix(c, SKIN_L, 0.2 * ss(0.5, 1.0, -n.y + n.z))


def hand_skin(co, n):
    """mão envolta em faixas escuras de couro (como no sprite; clara, lia como luva branca na câmera do jogo)"""
    c = mix(hexc(0x1e1416), hexc(0x4a3a3c), 0.3 + 0.7 * ss(-0.6, 0.6, n.z))
    k = 0.8 + 0.2 * abs(math.sin(co.z * 260 + co.x * 90))   # voltas da faixa
    return tuple(x * k for x in c)


def face_skin(co, n):
    """pele pálida com olheira acinzentada sob os olhos (coordenadas da cabeça antes de ir para o osso)"""
    c = skin(co, n)
    k = max(math.exp(-((co.x - s * 0.03) ** 2 + (co.z + 0.004) ** 2 * 3) / 0.0004) for s in (-1, 1))
    c = mix(c, SHADE, 0.35 * k)
    return mix(c, mix(ROBE_D, ROBE, 0.5), ss(-0.068, -0.08, co.z))   # gola escura no pescoço


def hair(co, n):
    c = mix(HAIR, HAIR_L, 0.5 * ss(0.2, 1.0, n.z - 0.3 * n.y))
    k = 0.88 + 0.12 * abs(math.sin(co.x * 80 + 0.5 * math.sin(co.z * 30)))
    return tuple(x * k for x in c)


def wood(co, n):
    c = mix(WOOD_D, WOOD, 0.45 + 0.55 * ss(-0.6, 0.6, n.x - 0.5 * n.y))
    k = 0.85 + 0.15 * abs(math.sin(co.z * 60 + co.x * 30))
    return tuple(x * k for x in c)


def bone(co, n):
    c = mix(BONE_D, BONE, 0.4 + 0.6 * ss(-0.7, 0.4, n.z - 0.4 * n.y))
    return mix(c, BONE_L, 0.3 * ss(0.5, 1.0, n.z))


def catmull(pts, n):
    """n pontos ao longo da curva Catmull-Rom por pts"""
    P = [Vector(p) for p in pts]
    P = [P[0] * 2 - P[1]] + P + [P[-1] * 2 - P[-2]]
    out = []
    for k in range(n):
        t = k / (n - 1) * (len(P) - 3)
        i = min(int(t), len(P) - 4)
        u = t - i
        p0, p1, p2, p3 = P[i:i + 4]
        out.append(0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    return out


def strip(name, obj, xz, r, fn, squash=0.35):
    """faixa fina deitada na superfície da frente de obj, passando pelos pontos (x, z)"""
    pts = []
    for x, z in xz:
        ok, hit, nn, _ = obj.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
        if ok:
            pts.append(hit + nn * r * squash * 0.6)
    t = tube(name, pts, [r] * len(pts), seg=6, squash=(1.0, squash), ref=(0, 1, 0))
    paint(t, fn)
    return t


def ring_tube(name, center, normal, rx, ry, r, fn, seg=24):
    """anel (debrum) em volta de um centro, perpendicular à normal"""
    c, nrm = Vector(center), Vector(normal).normalized()
    ux = Vector((1, 0, 0))
    ux = (ux - nrm * ux.dot(nrm)).normalized()
    uy = nrm.cross(ux).normalized()
    pts = [c + ux * rx * math.cos(2 * math.pi * k / seg) + uy * ry * math.sin(2 * math.pi * k / seg) for k in range(seg + 1)]
    t = tube(name, pts, [r] * len(pts), seg=5, cap=False)
    paint(t, fn)
    return t


def sweep(name, rings, seg=16, thick=0.012):
    """pano em anéis ao longo de uma curva (como ring_loft), mas com o eixo x de cada anel levado do anel anterior (transporte
    paralelo): ring_loft escolhe o lado de cima pelo sinal da normal, e na ponta do capuz, onde a curva desce, o anel virava e a
    malha torcia (a ponta parecia um pedaço solto). Cada anel: (centro, normal, rx, ry)"""
    bm = bmesh.new()
    grid = []
    ux = Vector((1, 0, 0))
    for c, nrm, rx, ry in rings:
        c, nrm = Vector(c), Vector(nrm).normalized()
        ux = (ux - nrm * ux.dot(nrm)).normalized()
        uy = nrm.cross(ux).normalized()
        grid.append([bm.verts.new(c + ux * (rx * math.sin(2 * math.pi * j / seg)) + uy * (ry * math.cos(2 * math.pi * j / seg))) for j in range(seg)])
    for r0, r1 in zip(grid, grid[1:]):
        for j in range(seg):
            k = (j + 1) % seg
            bm.faces.new((r0[j], r0[k], r1[k], r1[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_mesh(name, bm)
    if thick:
        sol = o.modifiers.new("thick", "SOLIDIFY")
        sol.thickness = thick
        sol.offset = 0
        apply_mods(o)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


# ------------------------------------------------------------------ cabeça: rosto pálido no fundo do capuz listrado, antenas
def head():
    parts = {"solid": [], "flat": [], "lit": []}
    h = meta("head", [
        EL((0, 0.008, 0.016), (0.068, 0.072, 0.074)),               # crânio
        EL((0, -0.022, -0.014), (0.058, 0.056, 0.058)),              # rosto
        EL((0, -0.03, -0.048), (0.036, 0.038, 0.03)),                # queixo fino
        EL((-0.036, -0.04, -0.006), (0.028, 0.028, 0.024)),          # maçãs do rosto altas
        EL((0.036, -0.04, -0.006), (0.028, 0.028, 0.024)),
        EL((-0.026, -0.073, 0.01), (0.014, 0.01, 0.008), neg=True),   # órbitas rasas
        EL((0.026, -0.073, 0.01), (0.014, 0.01, 0.008), neg=True),
        CAP((0, 0.005, -0.06), (0, 0.01, -0.16), 0.024),             # pescoço
    ], res=0.004)
    smooth(h, iters=3, factor=0.5, target=430)   # mais vértices: o rosto saía facetado de perto
    paint(h, face_skin)
    h["no_ao"] = True   # no fundo do capuz a oclusão deixava o rosto cinza-escuro
    parts["solid"].append(h)
    # nariz pequeno, só sugerido, um tom abaixo da pele (claro e grande lia como bola colada)
    nose = meta("nose", [CAP((0, -0.068, 0.002), (0, -0.078, -0.012), 0.0055), EL((0, -0.079, -0.015), (0.0075, 0.006, 0.006))], res=0.0025)
    smooth(nose, iters=3, factor=0.5, target=120)
    paint(nose, lambda co, n: mix(SKIN_D, SKIN, 0.45 + 0.4 * ss(-0.6, 0.6, n.z - 0.3 * n.y)))
    nose["no_ao"] = True
    parts["flat"].append(nose)

    def on(x, z, lift=0.0):
        ok, hit, nrm, _ = h.ray_cast(Vector((x, -0.5, z)), Vector((0, 1, 0)))
        return hit + nrm * lift if ok else Vector((x, -0.075, z))

    for s in (-1, 1):
        c = on(s * 0.027, 0.008, 0.002)
        white = sball("eyew", tuple(c), (0.014, 0.005, 0.009), rot=(0, s * -0.15, 0), seg=(8, 6))
        paint(white, lambda co, n: hexc(0xf4efe4))
        iris = sball("iris", tuple(c + Vector((s * 0.001, -0.004, -0.001))), (0.0075, 0.0025, 0.0075), seg=(8, 5))
        paint(iris, lambda co, n: mix(hexc(0x5a7a10), IRIS, ss(-0.8, 0.4, n.z)))
        pup = sball("pupil", tuple(c + Vector((s * 0.001, -0.0062, -0.001))), (0.0018, 0.0015, 0.0055), seg=(6, 4))   # pupila em fenda
        paint(pup, lambda co, n: hexc(0x100a10))
        hi = sball("hi", tuple(c + Vector((s * 0.003, -0.0075, 0.002))), (0.0018, 0.0012, 0.0018), seg=(5, 3))
        paint(hi, lambda co, n: hexc(0xffffff))
        # pálpebra pesada: a pele desce até o meio do olho (olhar meio fechado), com o traço escuro que sobe na ponta de fora
        lid = tube("lid", catmull([on(s * 0.012, 0.009, 0.003), on(s * 0.027, 0.0125, 0.0045), on(s * 0.042, 0.011, 0.003)], 5),
                   [0.0015, 0.0048, 0.0062, 0.0048, 0.0015], seg=8)
        smooth(lid)
        paint(lid, lambda co, n: mix(SKIN_D, SKIN, 0.5 + 0.3 * ss(-0.5, 0.8, n.z)))   # pele (o lilás lia maquiagem)
        lash = tube("lash", [on(s * 0.013, 0.007, 0.006), on(s * 0.027, 0.0075, 0.0078), on(s * 0.04, 0.0085, 0.006)],
                    [0.0004, 0.0018, 0.0004], seg=6)   # traço que afina nas duas pontas, sem passar do olho
        paint(lash, lambda co, n: hexc(0x1a1018))
        parts["flat"] += [white, iris, pup, hi, lid, lash]
        # sobrancelha fina e reta, a ponta de fora levantada (sinistra; caída lia triste no Aurelius)
        b0, b1, b2, b3 = on(s * 0.011, 0.022, 0.003), on(s * 0.022, 0.024, 0.003), on(s * 0.036, 0.027, 0.003), on(s * 0.05, 0.034, 0.002)
        # tubo que afina nas duas pontas (em metaball tão fina, a malha saía picotada)
        br = tube("brow", [b0, b1, b2, b3], [0.0008, 0.0026, 0.0022, 0.0005], seg=6, squash=(1.0, 0.6), ref=(0, 1, 0))
        smooth(br)
        paint(br, lambda co, n: HAIR)
        parts["flat"].append(br)
    # boca pequena e fechada, o canto direito levemente para cima (meio sorriso)
    # lábios como volume suave (metaball), rosado escuro com realce em cima
    lp = [on(-0.012, -0.046, 0.0015), on(0, -0.047, 0.003), on(0.011, -0.044, 0.0015)]
    lips = meta("lips", [CAP(tuple(lp[0]), tuple(lp[1]), 0.0042), CAP(tuple(lp[1]), tuple(lp[2]), 0.0042)], res=0.0018)
    smooth(lips, iters=3, factor=0.5, target=90)
    paint(lips, lambda co, n: mix(hexc(0x6a3044), hexc(0xb06878), ss(-0.6, 0.7, n.z)))
    line = tube("mline", [on(-0.011, -0.0435, 0.0055), on(0, -0.0438, 0.006), on(0.009, -0.042, 0.0055), on(0.013, -0.0395, 0.005)],
                [0.0002, 0.0011, 0.0008, 0.0002], seg=6)
    paint(line, lambda co, n: hexc(0x3a1828))
    parts["flat"] += [lips, line]
    # cabelo escuro: calota sob o capuz, franja que cai na diagonal pela testa e mechas dos lados do rosto
    hr = meta("hair", [
        EL((0, 0.024, 0.03), (0.075, 0.074, 0.074)),
    ], res=0.006)
    smooth(hr, iters=3, factor=0.5, target=180)
    paint(hr, hair)
    parts["solid"].append(hr)
    # mechas dos lados do rosto, tubos que afinam até a ponta (cortadas pela metaball, saíam retas e serrilhadas)
    # franja: mechas na diagonal pela testa, cada uma afinando em ponta
    for k, (x0, x1, z1, r) in enumerate(((0.035, -0.015, 0.05, 0.012), (0.015, -0.032, 0.047, 0.013), (-0.01, -0.05, 0.044, 0.012))):
        p0 = Vector((x0, -0.04, 0.075))
        fr = tube("fringe", [p0, Vector((x0 * 0.4 + x1 * 0.6, -0.066, 0.058)), Vector((x1, -0.07, z1 + 0.012)), Vector((x1 - 0.008, -0.068, z1))],
                  [r, r * 0.9, r * 0.5, 0.0015], seg=6, squash=(1.0, 0.6), ref=(0, 1, 0))
        smooth(fr)
        paint(fr, hair)
        parts["solid"].append(fr)
    for sd, r, z1 in ((-1, 0.019, -0.075), (1, 0.015, -0.06)):
        lk = tube("lock", [Vector((sd * 0.064, -0.03, 0.035)), Vector((sd * 0.068, -0.045, -0.01)), Vector((sd * 0.062, -0.052, -0.045)),
                           Vector((sd * 0.055, -0.055, z1))], [r, r * 0.95, r * 0.6, 0.002], seg=7, squash=(1.0, 0.65), ref=(1, 0, 0))
        smooth(lk)
        paint(lk, hair)
        parts["solid"].append(lk)

    # capuz: um "saco" de pano em anéis ao longo de uma curva, aberto na frente em volta do rosto, que sobe para trás e cai numa ponta;
    # listras laranja e cinza por faixa da curva (borda reta, presa aos anéis), dentro escuro
    # a abertura inclinada (topo mais à frente que a base) faz a aba de cima cobrir a testa, como capuz e não capacete
    # a curva sobe sempre (z crescente): ring_loft decide o lado de cima do anel pelo sinal da normal, e um trecho descendo virava o anel
    path = catmull([(0, -0.086, -0.012), (0, -0.04, -0.004), (0, 0.02, 0.012), (0, 0.075, 0.045), (0.006, 0.115, 0.1), (0.018, 0.16, 0.152),
                    (0.04, 0.215, 0.195), (0.066, 0.258, 0.215), (0.092, 0.296, 0.212), (0.113, 0.328, 0.19), (0.128, 0.352, 0.155)], 15)
    prof = [(0.082, 0.118), (0.112, 0.134), (0.112, 0.126), (0.104, 0.11), (0.088, 0.088), (0.068, 0.066), (0.05, 0.05), (0.034, 0.034),
            (0.022, 0.022), (0.013, 0.013), (0.005, 0.005)]
    NP = len(path)
    rings = []
    for i, c in enumerate(path):
        t = i / (NP - 1) * (len(prof) - 1)
        k = min(int(t), len(prof) - 2)
        u = t - k
        rx = prof[k][0] * (1 - u) + prof[k + 1][0] * u
        ry = prof[k][1] * (1 - u) + prof[k + 1][1] * u
        tan = (path[min(i + 1, NP - 1)] - path[max(i - 1, 0)]).normalized()
        rings.append((tuple(c), tuple(-tan), rx, ry))
    # abertura inclinada (o alto mais à frente, cobrindo a testa) e o lábio que dobra para fora: borda grossa e redonda, do próprio
    # pano (o aro em tubo solto lia como anel colado, com dentes pretos do contorno)
    # normal para a frente, como as dos outros anéis (-tan): para trás, o anel saía de cabeça para baixo e a malha torcia sobre o rosto
    n0 = Vector((0, -1, -0.62)).normalized()
    rings[0] = (rings[0][0], tuple(n0), rings[0][2], rings[0][3])
    lip = Vector(rings[0][0]) + n0 * 0.003
    rings.insert(0, (tuple(lip), tuple(n0), rings[0][2] * 1.06, rings[0][3] * 1.05))
    hood = sweep("hood", rings, seg=20, thick=0.012)

    def hood_paint(co, n):
        if (co - lip).dot(n0) > -0.006:
            return cloth(ORANGE, ORANGE_D, ORANGE_L)(co, n)   # lábio da abertura
        j = min(range(NP), key=lambda q: (co - path[q]).length_squared)
        if (co - path[j]).dot(n) < 0:
            return hexc(0x120c12)   # forro quase preto
        band = (j * 5) // 9 - 1
        if band % 2 == 1:
            return mix(GRAY_D, GRAY, 0.4 + 0.6 * ss(-0.6, 0.6, n.z))
        return cloth(ORANGE, ORANGE_D, ORANGE_L)(co, n)
    paint(hood, hood_paint)
    region(hood, "primary")
    parts["solid"].append(hood)
    # antenas escuras que saem do alto do capuz e enrolam para a frente, com a ponta laranja
    for s in (-1, 1):
        pts = []
        for k in range(9):
            t = k / 8
            th = t * math.pi * 1.5
            r = 0.07 * (1 - 0.55 * t)
            pts.append(Vector((s * (0.04 + 0.04 * t), -0.035 - r * math.sin(th) + 0.02 * t, 0.115 + r * (1 - math.cos(th)) * 0.9 + 0.05 * t)))
        an = tube("ant", pts, [0.0075 * (1 - 0.35 * k / 8) for k in range(9)], seg=6)
        paint(an, lambda co, n: mix(GRAY_D, GRAY, 0.5 + 0.5 * ss(-0.5, 0.6, n.z)))
        tip = sball("antip", tuple(pts[-1]), (0.011, 0.011, 0.011), seg=(8, 6))
        paint(tip, cloth(ORANGE, ORANGE_D, ORANGE_L))
        region(tip, "primary")
        an["no_ao"] = tip["no_ao"] = True
        parts["solid"] += [an, tip]
    return parts


# ------------------------------------------------------------------ tronco curvado escuro, pelerine listrada, faixa da cintura
def torso():
    z0 = RIG.P("torso")[2]
    t = meta("torso", [
        EL((0, 0.0, z0 + 0.27), (0.16, 0.13, 0.15)),                 # peito
        EL((0, 0.06, z0 + 0.34), (0.14, 0.12, 0.11)),                # costas curvadas
        EL((0, 0.0, z0 + 0.07), (0.14, 0.12, 0.12)),                 # cintura fina
        EL((-0.16, 0.0, z0 + 0.39), (0.08, 0.085, 0.065)),           # ombros caídos
        EL((0.16, 0.0, z0 + 0.39), (0.08, 0.085, 0.065)),
    ], res=0.01)
    smooth(t, iters=2, target=220)
    paint(t, cloth(ROBE, ROBE_D, ROBE_L))
    region(t, "secondary")
    out = [t]
    # debrum laranja dos dois lados da abertura do casaco
    for s in (-1, 1):
        st = strip("front", t, [(s * 0.035, z0 + 0.42), (s * 0.04, z0 + 0.28), (s * 0.045, z0 + 0.14), (s * 0.05, z0 + 0.02)], 0.016,
                   cloth(ORANGE, ORANGE_D, ORANGE_L), squash=0.4)
        region(st, "primary")
        st["no_ao"] = True
        out.append(st)
    # pelerine sobre os ombros, continuação do capuz: laranja com uma faixa cinza e a barra esfarrapada cinza
    rings = [((0, 0.03, z0 + 0.49), (0, 0, -1), 0.1, 0.09, 0, 0), ((0, 0.03, z0 + 0.45), (0, 0, -1), 0.2, 0.155, 6, 0.03),
             ((0, 0.03, z0 + 0.39), (0, 0, -1), 0.3, 0.2, 6, 0.04), ((0, 0.03, z0 + 0.33), (0, 0, -1), 0.32, 0.215, 6, 0.05)]
    cap = ring_loft("capelet", rings, seg=14, thick=0.012, jag=lambda j: 0.01 * math.sin(j * 2.3))

    def cap_paint(co, n):
        dz = co.z - z0
        if dz < 0.355 or 0.405 < dz < 0.44:
            return mix(GRAY_D, GRAY, 0.4 + 0.6 * ss(-0.6, 0.6, n.z))
        return cloth(ORANGE, ORANGE_D, ORANGE_L)(co, n)
    paint(cap, cap_paint)
    region(cap, "primary")
    out.append(cap)
    # faixa laranja na cintura, com a ponta caída na frente
    sash = tube("sash", [(0, 0.0, z0 - 0.05), (0, 0.0, z0 + 0.02), (0, 0.0, z0 + 0.08)], [0.17, 0.172, 0.158], seg=14, squash=(1.0, 0.9))
    smooth(sash)
    paint(sash, cloth(ORANGE, ORANGE_D, ORANGE_L))
    region(sash, "primary")
    end = tube("sashend", [(0.06, -0.15, z0 - 0.0), (0.075, -0.17, z0 - 0.12), (0.07, -0.19, z0 - 0.24)], [0.032, 0.03, 0.026],
               seg=6, squash=(1.0, 0.35), ref=(0, 1, 0))
    paint(end, cloth(ORANGE, ORANGE_D, ORANGE_L))
    region(end, "primary")
    for o in (sash, end):
        o["no_ao"] = True
    out += [sash, end]
    return {"torso": out}


# ------------------------------------------------------------------ manto escuro até o chão, barra esfarrapada, debrum laranja
SPEC = ((0.96, 0.15, 0.14), (0.75, 0.2, 0.19), (0.5, 0.26, 0.245), (0.25, 0.31, 0.295), (0.06, 0.35, 0.335))
FOLDS = 7
PANEL = 0.32


def famp(z):
    return 0.03 + 0.07 * (1 - z)


def skirt():
    rings = [((0, 0, z), (0, 0, -1), rx, ry, FOLDS, famp(z)) for z, rx, ry in SPEC]
    sk = ring_loft("robe", rings, seg=20, thick=0.02, jag=lambda j: 0.035 * (j % 2) + 0.012 * math.sin(j * 2.3))
    paint(sk, cloth(ROBE, ROBE_D, ROBE_L))
    region(sk, "secondary")
    out = [sk]
    # debrum laranja nas duas bordas da frente, colado ao manto da cintura até a barra
    for sg in (-1, 1):
        ep = []
        for k in range(9):
            z = 0.94 - (0.94 - 0.1) * k / 8
            d = Vector((sg * math.sin(PANEL), -math.cos(PANEL), 0))
            ok, hit, nn, _ = sk.ray_cast(Vector((0, 0, z)) + d * 1.0, -d)
            if ok:
                ep.append(hit + nn * 0.006)
        ed = tube("pedge", ep, [0.05] * len(ep), seg=6, squash=(1.0, 0.22), ref=(0, 1, 0))   # faixa larga (fina lia preto demais)
        paint(ed, cloth(ORANGE, ORANGE_D, ORANGE_L))
        region(ed, "primary")
        ed["no_ao"] = True
        out.append(ed)
    # barra: faixa laranja larga acima dos dentes esfarrapados, um pouco mais larga que o manto
    z, rx, ry = SPEC[-1]
    hem = ring_loft("hem", [((0, 0, 0.21), (0, 0, -1), 0.322, 0.307, FOLDS, famp(0.21)), ((0, 0, 0.12), (0, 0, -1), 0.344, 0.328, FOLDS, famp(0.12))],
                    seg=20, thick=0.016)
    paint(hem, cloth(ORANGE, ORANGE_D, ORANGE_L))
    region(hem, "primary")
    hem["no_ao"] = True
    out.append(hem)
    return {"skirt": out}


# ------------------------------------------------------------------ abdômen de vespa: gomos listrados atrás do quadril, ferrão
ABD_TOP, ABD_DIR, ABD_LEN = Vector((0, 0.1, 0.9)), Vector((0, 0.5, -0.866)), 0.8
ABD_R = (0.13, 0.195, 0.225, 0.21, 0.155, 0.085)


def abdomen():
    n = len(ABD_R)
    elems = []
    for i, r in enumerate(ABD_R):
        c = ABD_TOP + ABD_DIR * ABD_LEN * (i + 0.5) / n
        elems.append(EL(tuple(c), (r * 1.06, r, r * 0.66), rot=(math.atan2(ABD_DIR.y, -ABD_DIR.z), 0, 0)))
    ab = meta("abdomen", elems, res=0.012)
    smooth(ab, iters=2, factor=0.5, target=330)

    def ab_paint(co, nn):
        t = (co - ABD_TOP).dot(ABD_DIR) / ABD_LEN * n
        i, f = int(max(0, min(n - 1, math.floor(t)))), t - math.floor(t)
        c = cloth(ORANGE, ORANGE_D, ORANGE_L)(co, nn) if i % 2 == 0 else mix(GRAY_D, GRAY, 0.4 + 0.6 * ss(-0.6, 0.6, nn.z))
        return c
    paint(ab, ab_paint)
    region(ab, "primary")
    ab["embed"] = True   # nasce de dentro do manto
    tip = ABD_TOP + ABD_DIR * ABD_LEN
    sting = cone("sting", tip - ABD_DIR * 0.04, tip + ABD_DIR * 0.13, 0.034, seg=12)
    for p in sting.data.polygons:
        p.use_smooth = True
    paint(sting, lambda co, nn: mix(GRAY_D, GRAY, 0.5))
    return {"skirt": [ab, sting]}


# ------------------------------------------------------------------ asas: lentes achatadas creme e âmbar, borda laranja, nervura
def lens(name, L, W, T, fn, nu=8, nv=6):
    """lente achatada ao longo de +x (raiz na origem): largura W e espessura T no meio, afinando na raiz e na ponta"""
    o = sball(name, (0, 0, 0), (1, 1, 1), seg=(nv, nu))   # u_segments = em volta, v_segments = ao longo
    for v in o.data.vertices:
        nx, ny, nz = v.co
        u = (1 - nz) / 2   # polo de cima = raiz
        pr = math.sin(math.pi * u ** 0.75)
        k = pr / max(0.05, math.sqrt(max(0.0, 1 - nz * nz)))
        v.co = Vector((u * L, nx * W * k, ny * T * k))
    o.data.update()
    paint(o, fn)
    return o


def place(o, root, d, up):
    """leva a peça modelada ao longo de +x (normal +z) para a raiz, apontando para d com a face para up"""
    d = Vector(d).normalized()
    nrm = Vector(up)
    nrm = (nrm - d * nrm.dot(d)).normalized()
    w = nrm.cross(d).normalized()
    M = Matrix((d, w, nrm)).transposed().to_4x4()
    o.data.transform(Matrix.Translation(Vector(root)) @ M)
    o.data.update()
    return o


def wings():
    out, flat = [], []
    for s in (-1, 1):
        # o tronco curva para a frente (lean): a ponta de trás sobe, então as asas já saem apontando para baixo e abertas
        for L, W, d, up, root in ((0.7, 0.15, (s * 1.0, 1.0, -0.42), (s * 0.4, 0.75, 1.0), (s * 0.06, 0.14, 1.3)),
                                  (0.48, 0.11, (s * 1.35, 1.0, -0.7), (s * 0.5, 0.75, 1.0), (s * 0.06, 0.14, 1.24))):
            def wp(co, n, L=L, W=W):
                u = co.x / L
                pr = max(1e-4, abs(math.sin(math.pi * min(1.0, max(0.0, u)) ** 0.75)) * W)
                a = abs(co.y) / pr
                c = mix(CREAM, AMBER, 0.75 * ss(0.2, 0.85, a) + 0.25 * u)
                c = mix(c, ORANGE, ss(0.7, 0.88, a))
                return mix(c, ORANGE_D, ss(0.9, 1.0, a))   # borda escura no lugar do contorno
            # sem contorno: o contorno de uma lente fina vazava pela frente como manchas pretas
            w = lens("wing", L, W, 0.012, wp)
            place(w, root, d, up)
            region(w, "accent")
            w["no_ao"] = True
            flat.append(w)
            # nervura central fina e escura por cima da asa (sem contorno)
            dd = Vector(d).normalized()
            nrm = Vector(up)
            nrm = (nrm - dd * nrm.dot(dd)).normalized()
            pts = [Vector(root) + dd * L * t + nrm * 0.012 * math.sin(math.pi * t ** 0.75) ** 0.8 for t in (0.08, 0.35, 0.65, 0.9)]
            vn = tube("vein", pts, [0.005, 0.0045, 0.0035, 0.002], seg=4)
            paint(vn, lambda co, n: ORANGE_D)
            region(vn, "primary")
            flat.append(vn)
    return {"cape@flat": flat}


# ------------------------------------------------------------------ braços: mangas escuras em sino com faixas laranja; cajado
def fist(name, c, size=(0.04, 0.042, 0.048)):
    knuck = [EL((c[0] + dx, c[1] - size[1] * 0.75, c[2] - size[2] * 0.55), (0.013, 0.013, 0.013)) for dx in (-0.022, -0.007, 0.007, 0.022)]
    f = meta(name, [EL(c, size), EL((c[0], c[1] - 0.03, c[2] + 0.01), (0.015, 0.019, 0.02))] + knuck, res=0.006)
    smooth(f, iters=1, target=120)
    paint(f, hand_skin)
    f["no_ao"] = True
    return f


def grip(h, u):
    """mão fechada em volta da haste (eixo u): anel de pele ao longo da haste e nós dos dedos para fora"""
    u = Vector(u)
    out_ = u.cross(Vector((1, 0, 0))).normalized()
    if out_.y > 0:
        out_ = -out_
    elems = [CAP(tuple(h - u * 0.035), tuple(h + u * 0.035), 0.044)]
    for k in range(4):
        elems.append(EL(tuple(h + out_ * 0.04 + u * (0.027 - k * 0.018)), (0.015, 0.015, 0.012)))
    elems.append(CAP(tuple(h - out_ * 0.02 + u * 0.03), tuple(h - out_ * 0.03 + u * 0.06), 0.013))
    f = meta("grip", elems, res=0.006)
    smooth(f, iters=1, target=130)
    paint(f, hand_skin)
    f["no_ao"] = True
    return f


def sleeve_mouth(e, d, length, sag, axis):
    """centro e direção da boca do sino de bell_sleeve (mesma conta de robed.py)"""
    ax = Vector(axis).normalized()
    d = Vector(d)
    perp = d - ax * d.dot(ax)
    p1 = e + ax * length * 0.55
    p2 = e + ax * length * (0.75 + 0.25 * max(0.0, d.dot(ax))) + perp * length * sag
    return p2, (p2 - p1).normalized()


def hand_height(pose, side):
    """altura da mão no mundo (three) na pose de repouso, para o pé do cajado tocar o chão"""
    fr, a = fore_rot(pose, side, LEAN, OUT)
    sh = Vector(RIG.p3["armR" if side > 0 else "armL"])
    hand = sh + a @ Vector((0, -RIG.arm, 0)) + fr @ Vector((0, -HAND, 0))
    return hand.y + 0.06   # a forma "robed" flutua 0,06 (restArm em kit.ts)


def skull(center, u, f):
    """caveira grande cor de osso velho, de frente para f, na vertical u (no espaço do antebraço). Órbitas escuras sem contorno;
    o brilho verde dentro delas fica por código"""
    u = Vector(u).normalized()
    f = (Vector(f) - u * Vector(f).dot(u)).normalized()
    side = (-f).cross(u).normalized()
    M = Matrix.Translation(Vector(center)) @ Matrix((side, -f, u)).transposed().to_4x4() @ Matrix.Diagonal((SKULL_S, SKULL_S, SKULL_S, 1))
    sk = meta("skull", [
        EL((0, 0.01, 0.026), (0.07, 0.08, 0.076)),                    # crânio alto
        EL((0, -0.035, -0.022), (0.056, 0.045, 0.045)),               # face
        EL((-0.04, -0.045, -0.02), (0.022, 0.022, 0.018)),            # maçãs
        EL((0.04, -0.045, -0.02), (0.022, 0.022, 0.018)),
        EL((0, -0.042, -0.062), (0.04, 0.034, 0.02)),                 # maxilar
        EL((-0.026, -0.072, -0.0), (0.019, 0.014, 0.016), neg=True),  # órbitas fundas
        EL((0.026, -0.072, -0.0), (0.019, 0.014, 0.016), neg=True),
    ], res=0.005)
    smooth(sk, iters=2, factor=0.5, target=170)
    paint(sk, bone)
    sk["no_ao"] = True
    solid, flat = [sk], []

    def on(x, z, lift):
        ok, hit, nrm, _ = sk.ray_cast(Vector((x, -0.5, z)), Vector((0, 1, 0)))
        return (hit + nrm * lift) if ok else Vector((x, -0.08, z))
    for s in (-1, 1):
        p = on(s * 0.026, 0.0, 0.0015)
        o = sball("socket", tuple(p), (0.017, 0.004, 0.015), seg=(8, 5))
        paint(o, lambda co, n: hexc(0x2a1206))   # marrom quente no fundo
        flat.append(o)
    ns = sball("nosehole", tuple(on(0, -0.03, 0.002)), (0.008, 0.003, 0.011), seg=(8, 5))
    paint(ns, lambda co, n: hexc(0x2a1810))
    flat.append(ns)
    mo = tube("teethline", [on(-0.028, -0.06, 0.002), on(0, -0.062, 0.003), on(0.028, -0.06, 0.002)], [0.0025, 0.003, 0.0025], seg=4)
    paint(mo, lambda co, n: hexc(0x3a2416))
    flat.append(mo)
    for k in range(-3, 4):   # fileira de dentes sobre a linha
        for z in (-0.056,):
            tt = sball("tooth", tuple(on(k * 0.0085, z, 0.003)), (0.0038, 0.0025, 0.0055), seg=(5, 3))
            paint(tt, lambda co, n: hexc(0xfff0c8))
            flat.append(tt)
    for o in solid + flat:
        o.data.transform(M)
        o.data.update()
    return solid, flat


def staff(hand, u, f, height, flat):
    """cajado comprido de madeira torta, em pé no mundo, do chão até acima da cabeça; amarração e caveira no topo"""
    u = Vector(u).normalized()
    f = (Vector(f) - u * Vector(f).dot(u)).normalized()
    side = (-f).cross(u).normalized()
    bot, top = hand - u * (height - 0.03), hand + u * STAFF_TOP
    pts = []
    for k in range(9):
        t = k / 8
        p = bot + (top - bot) * t + side * (0.03 * math.sin(t * math.pi) + 0.008 * math.sin(t * 17)) + f * 0.012 * math.sin(t * 5 + 1)
        pts.append(p)
    shaft = tube("shaft", catmull(pts, 13), [0.032 - 0.006 * k / 12 + 0.004 * max(0.0, math.sin(k * 1.6)) for k in range(13)], seg=8)
    paint(shaft, wood)
    out = [shaft]
    for k, dz in enumerate((-0.15, -0.128, -0.106, -0.084, -0.062)):   # amarração de couro fina sob a caveira
        c = top + u * dz + side * 0.004 * (k % 2)
        band = tube("wrap", [c - u * 0.007, c + u * 0.007], [0.034, 0.034], seg=10)
        paint(band, lambda co, n: mix(hexc(0x2a1a14), hexc(0x5a3a26), 0.5 + 0.5 * ss(-0.5, 0.5, n.z)))
        out.append(band)
    sk, sf = skull(top + u * SKULL_UP, u, f)
    out += sk
    flat += sf
    for o in out:
        o["no_ao"] = True
        o["embed"] = True
    return out


def arms():
    out = {}
    flat = {"foreL": [], "foreR": []}
    for side, s, pose in (("L", -1, POSE_L), ("R", 1, POSE_R)):
        ax, ay, az = RIG.P("arm" + side)
        # ombro redondo (o tubo de ponta chata aparecia como bloco preto acima da pelerine)
        up = meta("sleeveU", [CAP((ax, ay, az - 0.01), (ax, ay, az - RIG.arm * 0.55), 0.06), CAP((ax, ay, az - RIG.arm * 0.55), (ax, ay, az - RIG.arm), 0.07)], res=0.012)
        smooth(up, iters=2, target=100)
        paint(up, cloth(ROBE, ROBE_D, ROBE_L))
        region(up, "secondary")
        fr, _ = fore_rot(pose, s, LEAN, OUT)
        down = local_dir(fr, (0, 0, -1))
        upw = local_dir(fr, (0, 0, 1))
        fwd = local_dir(fr, (0, -1, 0))
        e = Vector(RIG.P("fore" + side))
        hand = e + Vector((0, 0, -HAND))
        fore = meta("fore", [CAP(tuple(e + Vector((0, 0, 0.02))), tuple(e + Vector((0, 0, -0.17))), 0.062)], res=0.012)
        smooth(fore, iters=2, target=120)
        paint(fore, cloth(ROBE, ROBE_D, ROBE_L))
        region(fore, "secondary")
        wrist = tube("wrist", [e + Vector((0, 0, -0.19)), e + Vector((0, 0, -0.27))], [0.03, 0.028], seg=8)
        paint(wrist, skin)
        wrist["no_ao"] = True
        # manga em sino presa ao antebraço, caindo para o chão, com a boca laranja
        ln, r1, sag = 0.19, 0.15, 0.5
        ax_ = (Vector((0, 0, -1)) + down * 0.35).normalized()
        st0 = e + Vector((0, 0, -0.03))

        def drape_paint(co, n, st0=st0, ax_=ax_):
            d = co - st0
            radial = d - ax_ * d.dot(ax_)
            if radial.dot(n) < 0:
                return cloth(ORANGE, ORANGE_D, ORANGE_L)(co, n)   # forro laranja à mostra
            return mix(ROBE_D, ROBE, 0.55 + 0.45 * ss(-0.6, 0.5, n.z))
        drape = bell_sleeve("drape", st0, down, ln, 0.072, r1, sag=sag, folds=5, famp=0.06, axis=ax_, seg=10, rows=4)
        paint(drape, drape_paint)
        region(drape, "secondary")
        drape["no_ao"] = True
        # anel laranja de borda nítida na boca do sino (pintado no sino, o laranja borrava para o preto)
        mo, tg = sleeve_mouth(st0, down, ln, sag, ax_)
        uu = tg.cross(Vector((1, 0, 0)) if abs(tg.x) < 0.9 else Vector((0, 1, 0))).normalized()
        vv = tg.cross(uu).normalized()
        rp = [mo + (uu * math.cos(2 * math.pi * k / 10) + vv * math.sin(2 * math.pi * k / 10)) * r1 * 1.02 for k in range(11)]
        cuff = tube("cuff", rp, [0.016] * 11, seg=4, cap=False)
        paint(cuff, cloth(ORANGE, ORANGE_D, ORANGE_L))
        region(cuff, "primary")
        cuff["no_ao"] = True
        parts = [fore, wrist, drape, cuff]
        if side == "R":
            parts.append(grip(hand, upw))
            parts += staff(hand, upw, fwd, hand_height(POSE_R, 1), flat["foreR"])
        else:
            parts.append(fist("fist", tuple(hand + Vector((0, -0.004, 0.0)))))
        out["arm" + side] = [up]
        out["fore" + side] = parts
    out["foreR@flat"] = flat["foreR"]
    return out


if __name__ == "__main__":
    reset()
    parts = merge(place_head(RIG, head(), lift=HEAD_LIFT, scale=HEAD_SCALE, tilt=HEAD_TILT), torso(), skirt(), abdomen(), wings(), arms())
    soften(parts)
    finish("vesper", RIG, parts, ARGS, body_center=(0, 0.1, 0.95), body_dist=4.8, head_dist=1.3, form="robed")
