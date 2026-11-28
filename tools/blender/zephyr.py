# Zephyr (herói, pistoleiro) modelado no Blender (M2-11). Brief: docs/briefs/zephyr.md. Rodar: ver tools/blender/README.md.
# Bípede sobre o humanoid.py, no molde do kaelen.py: rosto curtido na sombra de um chapéu de aba larga marrom, lenço de bandido turquesa
# sobre nariz e boca (ponta curta no pescoço), cabelo branco, poncho terracota com faixa dourada e zigue-zague turquesa (frente em bico no
# torso, parte de trás comprida no cape), mangas de couro claro, cinturão, bota de cano alto e um revólver em cada mão (os dois atiram:
# estilo "dual", usuário 2026-11-26). Paleta "A" (usuário, 2026-11-27): terracota contra o chão verde, acento turquesa.
# Regiões de cor (skins, M13-06): primary = poncho, secondary = chapéu, accent = fita do chapéu, lenço e fivela.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from humanoid import ROOT, Rig, finish, merge, place_head, xform3  # noqa: E402
from robed import fore_rot  # noqa: E402
from seraph import girdle, on_surface  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
# as mesmas medidas e pose da receita (cast-heroes.ts); tests/models.test.ts confere as medidas
RIG = Rig(hipY=0.95, headY=0.58, shoulderY=0.46, shoulderX=0.29, arm=0.33, hipX=0.14, thigh=0.44, bulk=1.0)
HAND = 0.31
POSE_R, POSE_L, LEAN, OUT = (-1.4, -0.12), (0.12, -0.7), 0.02, 0.12
HEAD_LIFT, HEAD_SCALE, HEAD_FWD = 0.19, 1.75, 0.02

SKIN, SKIN_D, SKIN_L = hexc(0xd9a680), hexc(0x9a6648), hexc(0xecc0a0)
BEARD, BEARD_D, BEARD_L = hexc(0xcfcfcc), hexc(0x7e828c), hexc(0xeeeeea)   # cabelo grisalho: o branco puro na nuca lia como caveira
HAT, HAT_D, HAT_L = hexc(0x5a4030), hexc(0x2e2016), hexc(0x7c5c44)   # marrom-escuro (paleta A)
TURQ, TURQ_D, TURQ_L = hexc(0x3aa6a0), hexc(0x1d6664), hexc(0x8ad8cc)   # lenço, fita do chapéu e zigue-zague
TERRA, TERRA_D, TERRA_L = hexc(0xb4542e), hexc(0x6e2c18), hexc(0xd47a4a)   # poncho
BAND, DEEP, DEEP_D = hexc(0xf6d47a), hexc(0x5a2414), hexc(0x341208)   # faixa dourada e barra do poncho
HIDE, HIDE_D, HIDE_L = hexc(0xa8703e), hexc(0x5e3a1e), hexc(0xc89060)   # couro caramelo: separa a manga do poncho (o claro lia como braço nu)
VEST, VEST_D = hexc(0x6e3c24), hexc(0x3a1e14)
PANTS, PANTS_D = hexc(0x3c4a6e), hexc(0x1e2640)
BOOT, BOOT_D, BOOT_L = hexc(0x5a3420), hexc(0x2c160c), hexc(0x845034)
GUN, GUN_D, GUN_L = hexc(0xb8c2d0), hexc(0x5a6278), hexc(0xe8eef6)   # aço claro: escuro sumia no chão
WOOD, WOOD_D = hexc(0x7a4424), hexc(0x3a1c10)
GOLD, GOLD_D, GOLD_L = hexc(0xe3a83a), hexc(0x9c6a1a), hexc(0xffd88a)
DARK, BROW = hexc(0x1e2430), hexc(0xd8dae2)
GLOVE, GLOVE_D = hexc(0x4a2e1c), hexc(0x24140c)   # luva escura: a manga é de couro claro


def cloth(base, dark, light=None):
    def f(co, n):
        c = mix(dark, base, 0.35 + 0.65 * ss(-0.7, 0.5, n.z))
        return mix(c, light, 0.35 * ss(0.5, 1.0, n.z)) if light else c
    return f


def skin(co, n):
    c = mix(SKIN_D, SKIN, 0.45 + 0.55 * ss(-0.6, 0.5, n.z - 0.3 * n.y))
    return mix(c, SKIN_L, 0.2 * ss(0.5, 1.0, -n.y + n.z))


def beard(co, n):
    c = mix(BEARD_D, BEARD, 0.35 + 0.65 * ss(-0.6, 0.5, n.z - 0.4 * n.y))
    c = mix(c, BEARD_D, 0.3 * max(0.0, math.sin(co.x * 160.0)) * ss(-0.03, -0.09, co.z))   # mechas da barba em listras suaves
    return mix(c, BEARD_L, 0.35 * ss(0.5, 1.0, n.z))


def gold(co, n):
    t = 0.25 + 0.75 * ss(-0.6, 0.8, n.z)
    return mix(mix(GOLD_D, GOLD, t), GOLD_L, 0.5 * ss(0.65, 1.0, n.z * 0.6 - n.y * 0.5))


def metal(co, n):
    return mix(mix(GUN_D, GUN, 0.3 + 0.7 * ss(-0.6, 0.6, n.z - 0.3 * n.y)), GUN_L, 0.45 * ss(0.6, 1.0, n.z))


def gilt(o, emb=True):
    paint(o, gold)
    region(o, "accent")
    if emb:
        o["embed"] = True
    return o


# ------------------------------------------------------------------ cabeça: rosto curtido, lenço sobre a boca, chapéu de aba larga
def head():
    parts = {"solid": [], "flat": [], "lit": []}
    h = meta("head", [
        EL((0, 0.01, 0.02), (0.076, 0.082, 0.086)),                  # crânio
        EL((0, -0.025, -0.025), (0.066, 0.066, 0.07)),               # rosto
        EL((0, -0.035, -0.065), (0.052, 0.05, 0.036)),               # maxilar (fica sob a barba)
        EL((-0.042, -0.05, -0.012), (0.026, 0.022, 0.024), stiff=1.5),   # maçãs marcadas de velho
        EL((0.042, -0.05, -0.012), (0.026, 0.022, 0.024), stiff=1.5),
        EL((0, -0.07, 0.03), (0.058, 0.022, 0.014)),                 # arco da sobrancelha
        CAP((0, -0.082, 0.008), (0, -0.104, -0.022), 0.015),         # nariz forte
        EL((0, -0.101, -0.026), (0.017, 0.014, 0.013)),              # ponta do nariz
        EL((-0.03, -0.092, 0.008), (0.017, 0.013, 0.01), neg=True),  # órbitas
        EL((0.03, -0.092, 0.008), (0.017, 0.013, 0.01), neg=True),
        EL((-0.078, 0.0, -0.005), (0.012, 0.02, 0.026)),             # orelhas
        EL((0.078, 0.0, -0.005), (0.012, 0.02, 0.026)),
        CAP((0, 0.0, -0.08), (0, 0.01, -0.2), 0.032),                # pescoço
    ], res=0.006)
    smooth(h, iters=2, factor=0.5)
    remesh(h, 480, iters=2)
    paint(h, skin)
    h["no_ao"] = True
    parts["solid"].append(h)

    def on(x, z, lift=0.0):
        ok, hit, nrm, _ = h.ray_cast(Vector((x, -0.5, z)), Vector((0, 1, 0)))
        return hit + nrm * lift if ok else Vector((x, -0.09, z))

    for s in (-1, 1):
        c = on(s * 0.031, 0.008, 0.002)
        # olhos apertados de quem mira: fenda clara curta, íris escura e pálpebra pesada por cima
        white = sball("eyew", tuple(c), (0.017, 0.006, 0.0075), rot=(0, s * -0.15, 0), seg=(10, 6))
        paint(white, lambda co, n: hexc(0xeee8dc))
        iris = sball("iris", tuple(c + Vector((-s * 0.002, -0.005, 0.0))), (0.0075, 0.003, 0.0072), seg=(8, 5))
        paint(iris, lambda co, n: DARK)
        # sobrancelha grossa e branca, caída para fora, de pontas finas
        brow = tube("brow", [on(s * 0.06, 0.022, 0.004), on(s * 0.05, 0.031, 0.005), on(s * 0.036, 0.036, 0.006), on(s * 0.022, 0.035, 0.005), on(s * 0.011, 0.03, 0.004)],
                    [0.0016, 0.006, 0.0085, 0.007, 0.0025], seg=8)
        paint(brow, lambda co, n: BROW)
        parts["flat"] += [white, iris, brow]   # sem pálpebra: qualquer traço acima do olho lia como 2ª sobrancelha

    # lenço de bandido cobrindo nariz e boca (o branco do sprite é lenço, não barba; usuário, 2026-11-27): casca por cima do rosto,
    # cortada logo abaixo dos olhos por um plano que sobe para a nuca, em ponta curta no pescoço e amarrada atrás. Turquesa (paleta A):
    # o branco até o peito lia como capuz de fantasma
    mk = meta("mask", [
        EL((0, 0.01, 0.0), (0.085, 0.091, 0.08)),                   # volta da cabeça (fica só a faixa abaixo do corte)
        EL((0, -0.028, -0.03), (0.073, 0.072, 0.074)),              # sobre o rosto
        EL((0, -0.038, -0.068), (0.058, 0.057, 0.04)),              # queixo
        CAP((0, -0.088, 0.006), (0, -0.108, -0.024), 0.024),        # tenda sobre o nariz, larga: sem vinco duro no meio
        EL((0, -0.066, -0.095), (0.05, 0.036, 0.042)),              # ponta curta no pescoço
        EL((0, -0.078, -0.128), (0.018, 0.018, 0.024)),
    ], res=0.006)
    smooth(mk, iters=3, factor=0.5)
    remesh(mk, 620, iters=2)
    cut_no = Vector((0, -0.4, 1)).normalized()
    bm = bmesh.new()
    bm.from_mesh(mk.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, -0.09, 0.0), plane_no=cut_no, clear_outer=True)
    # borda do corte em ordem (um anel só), para a bainha
    edges = [e for e in bm.edges if e.is_boundary]
    nxt = {}
    for e in edges:
        a, b = e.verts
        nxt.setdefault(a.index, []).append(b)
        nxt.setdefault(b.index, []).append(a)
    ring, prev, cur = [], None, edges[0].verts[0]
    while True:
        ring.append(cur.co.copy())
        cand = [v for v in nxt[cur.index] if prev is None or v.index != prev.index]
        prev, cur = cur, cand[0]
        if cur.index == edges[0].verts[0].index or len(ring) > len(edges):
            break
    bm.to_mesh(mk.data)
    bm.free()
    mk.data.update()
    for p in mk.data.polygons:
        p.use_smooth = True

    def mask_tint(co, n):
        c = mix(TURQ_D, TURQ, 0.4 + 0.6 * ss(-0.6, 0.5, n.z - 0.4 * n.y))
        fold = max(0.0, math.sin(co.x * 110.0 + co.z * 55.0)) * ss(-0.05, -0.1, co.z)   # dobras do pano caindo
        return mix(c, TURQ_D, 0.25 * fold)
    paint(mk, mask_tint)
    region(mk, "accent")
    mk["no_ao"] = True
    mk["embed"] = True
    parts["solid"].append(mk)
    step = max(1, len(ring) // 24)
    hem = loop_tube("maskhem", ring[::step], 0.0035, ref=tuple(cut_no), seg=3)
    paint(hem, lambda co, n: TURQ_L)   # barra clara
    hem["embed"] = True
    parts["flat"].append(hem)
    knot = sball("maskknot", (0, 0.098, 0.03), (0.011, 0.009, 0.01), seg=(8, 5))   # nó pequeno: o grande com as mechas lia como caveira
    paint(knot, mask_tint)
    region(knot, "accent")
    knot["embed"] = True
    parts["solid"].append(knot)
    for s in (-1, 1):
        tail = tube("masktail", [(s * 0.004, 0.1, 0.026), (s * 0.012, 0.106, 0.0), (s * 0.016, 0.108, -0.022)], [0.007, 0.005, 0.002], seg=6, squash=(1.0, 0.4), ref=(0, 1, 0))
        paint(tail, mask_tint)
        region(tail, "accent")
        tail["embed"] = True
        parts["solid"].append(tail)

    # cabelo branco: nuca em mechas até a gola e mechas curtas atrás da orelha, saindo de baixo da aba
    elems = [EL((0, 0.045, 0.005), (0.066, 0.042, 0.03)),
             EL((0, 0.06, -0.035), (0.062, 0.034, 0.045))]          # massa lisa na nuca, até a gola
    for x, dz in ((-0.05, 0.06), (-0.025, 0.075), (0.0, 0.08), (0.025, 0.075), (0.05, 0.06), (-0.068, 0.045), (0.068, 0.045)):
        elems.append(CAP((x, 0.055, 0.0), (x * 1.1, 0.078 - 0.02 * abs(x) / 0.07, -dz), 0.014))
    for s in (-1, 1):
        elems += [CAP((s * 0.07, 0.022, 0.034), (s * 0.078, 0.042, -0.025), 0.013),
                  CAP((s * 0.066, 0.0, 0.04), (s * 0.074, 0.012, 0.005), 0.011)]
    hr = meta("hair", elems, res=0.006)
    smooth(hr, iters=1, factor=0.5)
    remesh(hr, 400, iters=1)
    paint(hr, beard)
    parts["solid"].append(hr)

    # chapéu: copa com vinco no alto e duas pinças na frente, aba larga virada para cima dos lados, caída na frente e atrás
    cr = meta("crown", [
        EL((0, 0.005, 0.13), (0.08, 0.09, 0.07)),                    # copa de caubói, alta e estreita
        EL((0, 0.005, 0.07), (0.083, 0.093, 0.032)),                 # base que entra na aba: a testa não aparece entre as duas
        EL((0, 0.005, 0.18), (0.068, 0.08, 0.036)),
        EL((0, 0.012, 0.218), (0.016, 0.075, 0.036), neg=True),       # vinco central
        EL((-0.05, -0.068, 0.196), (0.022, 0.024, 0.04), neg=True),   # pinças da frente
        EL((0.05, -0.068, 0.196), (0.022, 0.024, 0.04), neg=True),
    ], res=0.006)
    smooth(cr, iters=2, factor=0.5)
    remesh(cr, 440, iters=2)
    paint(cr, lambda co, n: mix(mix(HAT_D, HAT, 0.6 + 0.4 * ss(-0.6, 0.5, n.z)), HAT_L, 0.3 * ss(0.6, 1.0, n.z)))
    region(cr, "secondary")
    cr["no_ao"] = True   # a sombra assada escurecia a copa e ela não casava com a aba
    parts["solid"].append(cr)

    RX, RY, R0, ZB = 0.232, 0.214, 0.06, 0.06
    nu, rows = 36, 4

    def brim_at(a, u):
        """ponto da aba no ângulo a (0 = frente, -y) e na fração u do raio"""
        rx, ry = R0 + (RX - R0) * u, R0 + (RY - R0) * u
        z = ZB + 0.07 * abs(math.sin(a)) ** 2.4 * u * u + 0.012 * max(0.0, math.cos(a)) ** 2 * u * u - 0.012 * max(0.0, -math.cos(a)) ** 2 * u * u   # frente erguida: olhos à vista
        return Vector((rx * math.sin(a), -ry * math.cos(a), z))

    bm = bmesh.new()
    grid = [[bm.verts.new(brim_at(2 * math.pi * j / nu, i / rows)) for j in range(nu)] for i in range(rows + 1)]
    for i in range(rows):
        for j in range(nu):
            bm.faces.new((grid[i][j], grid[i][(j + 1) % nu], grid[i + 1][(j + 1) % nu], grid[i + 1][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    br = new_mesh("brim", bm)
    sol = br.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.011
    sol.offset = 0
    apply_mods(br)
    for p in br.data.polygons:
        p.use_smooth = True
    paint(br, lambda co, n: mix(HAT_D, HAT, 0.65) if n.z < 0 else mix(HAT, HAT_L, 0.3 * ss(0.12, 0.23, Vector((co.x, co.y)).length)))
    region(br, "secondary")
    br["embed"] = True
    parts["solid"].append(br)
    band = girdle("hatband", cr, ZB + 0.02, r=0.01, n=20, off=0.002, squash=(1.0, 1.3), seg=5)
    gilt(band)
    paint(band, lambda co, n: mix(TURQ_D, TURQ, 0.4 + 0.6 * ss(-0.5, 0.6, n.z)))
    parts["solid"].append(band)   # sem concho: lia como peça solta
    return parts


# ------------------------------------------------------------------ tronco: colete de couro sob o poncho
def torso():
    z0 = RIG.P("torso")[2]
    t = meta("torso", [
        EL((0, 0.01, z0 + 0.33), (0.21, 0.12, 0.17)),             # peito raso: marcava o poncho por dentro
        EL((0, -0.01, z0 + 0.17), (0.18, 0.12, 0.12)),
        EL((0, 0.0, z0 + 0.04), (0.17, 0.115, 0.08)),
        EL((-0.2, 0.0, z0 + 0.43), (0.075, 0.075, 0.055)),
        EL((0.2, 0.0, z0 + 0.43), (0.075, 0.075, 0.055)),
    ], res=0.012)
    smooth(t, iters=2, target=160)
    paint(t, cloth(VEST, VEST_D))
    return {"torso": [t]}


# ------------------------------------------------------------------ poncho: frente em bico (torso) e parte de trás comprida (cape)
NECK_Z = RIG.T + 0.635
P_ROWS = [0.0, 0.22, 0.45, 0.66, 0.7, 0.79, 0.88, 0.91, 1.0]   # faixa dourada entre 0,7 e 0,88; barra escura de 0,91


ARM_Z = RIG.P("armL")[2]


def p_fold(a):
    return math.sin(a * 9 + math.sin(a * 4) * 1.2)


def p_open(a):
    """1 nos painéis da frente e de trás, 0 nas aberturas dos braços (o braço sai por baixo do pano, não o atravessa)"""
    return ss(0.3, 0.85, abs(math.cos(a))) ** 1.5   # transição larga: a passagem do ombro fica redonda, sem ponta


def hem_z(a):
    """altura da barra no ângulo a (0 = frente): painel em bico na frente e atrás, curto sobre o ombro nas aberturas dos braços,
    ondulada com as dobras"""
    w = p_open(a)
    long = RIG.T + 0.14 - 0.07 * abs(math.cos(a)) ** 10   # bico em V
    side = ARM_Z - 0.015
    return side + (long - side) * w + 0.016 * p_fold(a) * w


def poncho_at(a, t):
    z = NECK_Z + (hem_z(a) - NECK_Z) * t ** 1.25
    d = NECK_Z - z
    # abre até a largura do ombro e daí cai reto, com dobras que fundam para baixo (antes era cúpula: lia como barriga)
    r = (0.1 + 0.25 * (1 - math.exp(-d / 0.08))) * (1 + 0.1 * ss(0.04, 0.32, d) * p_fold(a))
    ys = 0.62 - 0.12 * ss(0.08, 0.32, d)   # frente achatada: pano, não volume do corpo
    return Vector((math.sin(a) * r * 1.22, -math.cos(a) * r * ys, z))


def band_color(t, base):
    if t >= 0.91:
        return DEEP
    if t >= 0.695:
        return BAND if t <= 0.885 else mix(BAND, DEEP, 0.5)
    return base


def poncho():
    nu = 36   # 9 dobras: 4 gomos cada
    bm = bmesh.new()
    grid = [[bm.verts.new(poncho_at(2 * math.pi * j / nu, t)) for j in range(nu)] for t in P_ROWS]
    for i in range(len(P_ROWS) - 1):
        for j in range(nu):
            bm.faces.new((grid[i][j], grid[i][(j + 1) % nu], grid[i + 1][(j + 1) % nu], grid[i + 1][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    po = new_mesh("poncho", bm)
    sol = po.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.014
    sol.offset = -1
    apply_mods(po)
    for p in po.data.polygons:
        p.use_smooth = True

    def tint(co, n):
        # fração t pela altura entre o pescoço e a barra no ângulo do vértice
        ys = 0.62 - 0.12 * ss(0.08, 0.32, NECK_Z - co.z)   # o mesmo achatamento do poncho_at
        a = math.atan2(co.x / 1.22, -co.y / ys)
        t = ((co.z - NECK_Z) / (hem_z(a) - NECK_Z)) ** (1 / 1.25) if co.z < NECK_Z else 0.0
        valley = 0.5 - 0.5 * p_fold(a)
        base = mix(TERRA, TERRA_D, 0.6 * ss(0.0, 0.45, t) * valley)
        base = mix(base, TERRA_L, 0.3 * ss(0.4, 1.0, n.z))
        if t < 0.08:
            base = TERRA_D
        out = Vector((co.x, co.y, 0))
        if out.length > 1e-4 and n.dot(out.normalized()) < -0.2:
            return mix(TERRA_D, DEEP, 0.5)   # por dentro
        return band_color(t, base)
    paint(po, tint)
    region(po, "primary")
    po["no_ao"] = True
    # zigue-zague turquesa no meio da faixa, rente à superfície (afastado, a ponta do ombro saía do pano)
    zz = []
    n = 48
    for k in range(n):
        a = 2 * math.pi * k / n
        t = 0.73 if k % 2 == 0 else 0.85
        p = poncho_at(a, t)
        out = Vector((p.x, p.y, 0)).normalized()
        zz.append(p + out * 0.003)
    zig = loop_tube("zigzag", zz, 0.0065, ref=(0, 0, 1), seg=3, squash=(1.0, 0.5))
    paint(zig, lambda co, n: TURQ)
    # gola: rolo escuro no pescoço
    col = tube("ponchoneck", [(0, 0.0, NECK_Z - 0.005), (0, 0.0, NECK_Z + 0.035)], [0.118, 0.1], seg=14, squash=(1.17, 0.78), cap=False)
    smooth(col, iters=1)
    paint(col, cloth(TERRA_D, DEEP))
    region(col, "primary")
    col["embed"] = True
    return {"torso": [po, col], "torso@flat": [zig]}


def back_hem(u):
    """barra da parte de trás em três pontas desiguais (u de 0 a 1, de um lado ao outro)"""
    peak = max(w * math.exp(-((u - c) / 0.1) ** 2) for c, w in ((0.2, 0.7), (0.52, 1.0), (0.84, 0.8)))
    return 0.98 - 0.36 * peak


def cape():
    """a parte de trás do poncho: das costas até a canela, rente às costas, com a faixa dourada na barra"""
    ztop = RIG.P("armL")[2]   # nasce por dentro do poncho: de costas a faixa dele dá a volta inteira por cima
    nu = 14
    rows = [0.0, 0.25, 0.5, 0.7, 0.78, 0.82, 0.9, 0.94, 1.0]
    bm = bmesh.new()
    grid = []
    a0, a1 = -1.2, 1.2       # a = 0 no meio das costas (+y); estreita: não aparece no quadril como peça solta
    for v in rows:
        row = []
        for j in range(nu + 1):
            u = j / nu
            a = a0 + (a1 - a0) * u
            zbot = back_hem(u)
            z = ztop + (zbot - ztop) * v
            rx = 0.24 + 0.08 * v ** 1.3
            ry = 0.11 + 0.09 * v ** 1.3                          # rente às costas, cai quase a prumo
            fold = 0.16 * math.sin(u * 5.0 * math.pi) * ss(0.05, 0.4, v)
            r = 1.0 + fold
            row.append(bm.verts.new((rx * math.sin(a) * r, 0.03 + ry * math.cos(a) * r, z + 0.02 * math.sin(u * 9.0 + 0.6) * v ** 3)))
        grid.append(row)
    for i in range(len(rows) - 1):
        for j in range(nu):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    c = new_mesh("ponchoback", bm)
    sol = c.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.026   # de lado, a 0,018 lia como papel
    sol.offset = 0
    apply_mods(c)
    for p in c.data.polygons:
        p.use_smooth = True

    def tint(co, n):
        # ângulo do parâmetro (a elipse tem rx != ry: o atan2 geométrico errava o u e a faixa vazava em manchas pelas dobras)
        v0 = min(1.0, max(0.0, (ztop - co.z) / (ztop - 0.8)))
        a = math.atan2(co.x / (0.24 + 0.08 * v0 ** 1.3), (co.y - 0.03) / (0.11 + 0.09 * v0 ** 1.3))
        u = min(1.0, max(0.0, (a - a0) / (a1 - a0)))
        v = (ztop - co.z) / (ztop - back_hem(u))
        radial = Vector((co.x, co.y - 0.03, 0))
        outside = radial.length < 1e-4 or n.dot(radial.normalized()) > 0
        if not outside:
            return mix(DEEP_D, DEEP, 0.6)
        valley = max(0.0, -math.sin(u * 5.0 * math.pi))
        base = mix(mix(TERRA_D, TERRA, 0.6 + 0.4 * ss(-0.5, 0.5, n.z)), TERRA_D, 0.55 * valley)
        if v >= 0.93:
            return DEEP
        if 0.8 <= v <= 0.91:
            return BAND
        return base
    paint(c, tint)
    region(c, "primary")
    c["no_ao"] = True
    return {"cape": [c]}


# ------------------------------------------------------------------ quadril: calça, cinturão com balas, coldres vazios
def hips():
    z = RIG.P("hips")[2]
    p = meta("hips", [EL((0, 0.0, z + 0.02), (0.175, 0.12, 0.105))], res=0.012)
    smooth(p, iters=1, target=120)
    paint(p, cloth(PANTS, PANTS_D))
    belt = tube("belt", [(0, 0.0, z + 0.115), (0, 0.0, z + 0.06)], [0.19, 0.192], seg=18, squash=(1.0, 0.72), cap=False)
    paint(belt, cloth(VEST, VEST_D))
    belt["embed"] = True
    out = [p, belt, gilt(sball("buckle", (0.0, -0.142, z + 0.088), (0.034, 0.014, 0.03), seg=(8, 5)))]
    for k in range(5):   # cartuchos no cinturão, à direita da fivela
        a = 0.45 + 0.2 * k
        x, y = 0.192 * math.sin(a), -0.138 * math.cos(a)
        b = tube("bullet", [(x, y, z + 0.068), (x, y, z + 0.108)], [0.009, 0.009], seg=5)
        out.append(gilt(b))
    for s in (-1, 1):   # coldre vazio de cada lado (os dois revólveres estão nas mãos)
        hx = s * 0.205
        hol = meta("holster", [CAP((hx, 0.02, z + 0.06), (hx + s * 0.01, -0.005, z - 0.13), 0.034)], res=0.008)
        smooth(hol, iters=1, target=60)
        paint(hol, cloth(VEST, VEST_D, HIDE_L))
        hol["embed"] = True
        out.append(hol)
    return {"hips": out}


# ------------------------------------------------------------------ revólver no repouso do antebraço (Blender: cano para -z)
def revolver(hx, hy, hz):
    """cano ao longo do antebraço, além da mão; coronha para +y (fica para baixo com o braço erguido à frente)"""
    out = []
    grip = meta("grip", [CAP((hx, hy + 0.005, hz + 0.004), (hx, hy + 0.085, hz + 0.032), 0.02)], res=0.006)
    smooth(grip, iters=1, target=50)
    paint(grip, cloth(WOOD, WOOD_D))
    grip["embed"] = True
    out.append(grip)
    y0 = hy - 0.03
    frame = tube("frame", [(hx, y0 + 0.004, hz + 0.01), (hx, y0, hz - 0.06)], [0.024, 0.025], seg=8, squash=(0.75, 1.0))
    drum = tube("drum", [(hx, y0 - 0.004, hz - 0.052), (hx, y0 - 0.004, hz - 0.122)], [0.036, 0.036], seg=8)
    barrel = tube("barrel", [(hx, y0 - 0.012, hz - 0.11), (hx, y0 - 0.012, hz - 0.36)], [0.016, 0.015], seg=8)
    rod = tube("rod", [(hx, y0 + 0.012, hz - 0.115), (hx, y0 + 0.012, hz - 0.3)], [0.009, 0.009], seg=5)
    sight = tube("sight", [(hx, y0 - 0.02, hz - 0.345), (hx, y0 - 0.03, hz - 0.35)], [0.004, 0.003], seg=4)
    hammer = tube("hammer", [(hx, y0 - 0.008, hz + 0.008), (hx, y0 - 0.03, hz + 0.026)], [0.007, 0.005], seg=5)
    for o in (frame, drum, barrel, rod, sight, hammer):
        smooth(o, iters=0)
        paint(o, metal)
        o["embed"] = True
        out.append(o)
    return out, Vector((hx, y0 - 0.012, hz - 0.36))


def fist(name, c, s):
    """luva fechada em volta da coronha (que sai para +y): dedos por baixo, polegar por cima da armação"""
    knuck = [EL((c[0] - s * 0.012, c[1] + 0.03, c[2] - 0.01 + dz), (0.014, 0.016, 0.012)) for dz in (-0.012, 0.0, 0.012)]
    thumb = CAP((c[0] + s * 0.022, c[1] - 0.012, c[2] + 0.012), (c[0] + s * 0.016, c[1] - 0.03, c[2] - 0.022), 0.011)
    f = meta(name, [EL((c[0], c[1] + 0.014, c[2]), (0.034, 0.036, 0.04)), thumb] + knuck, res=0.006)
    smooth(f, iters=1, target=100)
    paint(f, cloth(GLOVE, GLOVE_D))
    f["no_ao"] = True
    f["embed"] = True
    return f


def limbs():
    out = {}
    muzzles = {}
    for side, s in (("L", -1), ("R", 1)):
        ax, ay, az = RIG.P("arm" + side)
        a = meta("arm" + side, [CAP((ax, ay, az - 0.03), (ax, ay, az - RIG.arm + 0.03), 0.066)], res=0.01)
        smooth(a, iters=1, target=100)
        paint(a, cloth(HIDE, HIDE_D, HIDE_L))
        fx, fy, fz = RIG.P("fore" + side)
        f = meta("fore" + side, [CAP((fx, fy, fz), (fx, fy, fz - HAND + 0.07), 0.056)], res=0.009)
        smooth(f, iters=1, target=100)
        paint(f, cloth(HIDE, HIDE_D, HIDE_L))
        f["no_ao"] = True   # a sombra do poncho deixava o antebraço preto
        cuff = tube("cuff", [(fx, fy, fz - HAND + 0.09), (fx, fy, fz - HAND + 0.045)], [0.058, 0.064], seg=12, cap=False)
        paint(cuff, cloth(GLOVE, GLOVE_D))
        gun, muzzle = revolver(fx, fy, fz - HAND)
        muzzles[side] = muzzle - Vector((fx, fy, fz))
        out["arm" + side] = [a]
        out["fore" + side] = [f, cuff, fist("fist", (fx, fy, fz - HAND), s)] + gun
        hx, hy, hz = RIG.P("thigh" + side)
        th = meta("thigh" + side, [CAP((hx, hy, hz - 0.02), (hx + s * 0.005, hy, hz - RIG.thigh + 0.04), 0.088),
                                   EL((hx, hy, hz - 0.16), (0.1, 0.098, 0.15))], res=0.011)
        smooth(th, iters=1, target=110)
        th["no_ao"] = True
        paint(th, cloth(PANTS, PANTS_D))
        kx, ky, kz = RIG.P("shin" + side)
        sh = meta("shin" + side, [CAP((kx, ky, kz - 0.03), (kx, ky, kz - 0.38), 0.074),
                                  EL((kx, ky + 0.005, kz - 0.2), (0.086, 0.088, 0.16)),
                                  CAP((kx, ky - 0.1, kz - 0.45), (kx, ky - 0.2, kz - 0.46), 0.032),
                                  EL((kx, ky - 0.06, kz - 0.44), (0.074, 0.125, 0.045))], res=0.01)
        smooth(sh, iters=1, target=100)
        paint(sh, cloth(BOOT, BOOT_D, BOOT_L))
        fold = tube("bootfold", [(kx, ky, kz - 0.04), (kx, ky, kz - 0.1)], [0.1, 0.092], seg=12, cap=False)
        smooth(fold, iters=1)
        paint(fold, cloth(BOOT_L, BOOT))
        spur = sball("spur", (kx, ky + 0.1, kz - 0.43), (0.022, 0.006, 0.022), rot=(0, 0, 0), seg=(8, 4))
        paint(spur, gold)
        spur["embed"] = True
        out["thigh" + side] = [th]
        out["shin" + side] = [sh, fold, spur]
    return out, muzzles


if __name__ == "__main__":
    reset()
    parts_l, muzzles = limbs()
    for side, m in muzzles.items():
        print("MUZZLE_" + side + " (fore, three)", tuple(round(x, 3) for x in (m.x, m.z, -m.y)))
    parts = merge(place_head(RIG, head(), lift=HEAD_LIFT, scale=HEAD_SCALE, fwd=HEAD_FWD), torso(), poncho(), cape(), hips(), parts_l)
    soften(parts)
    print("DIMS", RIG.dims_ts())
    finish("zephyr", RIG, parts, ARGS, body_center=(0, -0.1, 1.0), body_dist=4.6, head_dist=1.4, form="biped")
