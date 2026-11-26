# Frostine (heroína, maga do gelo) modelada no Blender (M2-11). Brief: docs/briefs/frostine.md. Rodar: ver tools/blender/README.md.
# Forma "robed": sem pernas, o vestido fica no osso "skirt". O cajado fica no osso foreR, em pé no mundo na pose de repouso da
# receita (POSE_R, LEAN, OUT); o floco aceso do topo e o floquinho da mão esquerda ficam por código (cast-heroes.ts).
# Regiões de cor (para as skins, M13-06): primary = azul escuro do vestido, secondary = azul claro, accent = pelo branco.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from humanoid import Rig, finish, merge, place_head  # noqa: E402
from robed import bell_sleeve, fore_rot, local_dir, ring_loft  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
# as mesmas medidas e pose da receita (cast-heroes.ts); tests/models.test.ts confere as medidas
RIG = Rig(hipY=0.92, headY=0.57, shoulderY=0.45, shoulderX=0.22, arm=0.31, hipX=0, thigh=0.42)
HAND = 0.29
POSE_R, POSE_L, LEAN, OUT = (-0.55, -0.95), (-0.6, -1.5, 0.25), 0.03, 0.2   # mão esquerda erguida à frente, palma para cima
HEAD_LIFT, HEAD_SCALE = 0.1, 1.3
STAFF_TOP = 0.62   # ponta do cajado acima da mão, ao longo da vertical; o floco por código fica 0,2 acima

SKIN, SKIN_D, SKIN_L = hexc(0xfdece4), hexc(0xe6bfb2), hexc(0xfff8f2)
BLUE, BLUE_D, BLUE_L = hexc(0x1e2c74), hexc(0x0b1030), hexc(0x4466b8)   # azul-marinho
SKY, SKY_D = hexc(0x9cc6f4), hexc(0x5a86cc)   # azul-gelo
ICE, ICE_L, ICE_D = hexc(0x9fe4ff), hexc(0xeafaff), hexc(0x3f86d0)
FUR, FUR_D = hexc(0xf4f7fc), hexc(0x9aaed4)
HAIR, HAIR_L, HAIR_D = hexc(0xe4ecf8), hexc(0xfbfdff), hexc(0x8a9cc8)
DARK, IRIS, LIPS, BROW = hexc(0x1a2040), hexc(0x2f78d0), hexc(0xb06078), hexc(0x8a9cc8)
STAFF, STAFF_D = hexc(0xdceaff), hexc(0x8eaedc)


def cloth(base, dark, light=None):
    def f(co, n):
        c = mix(dark, base, 0.35 + 0.65 * ss(-0.7, 0.5, n.z))
        return mix(c, light, 0.35 * ss(0.5, 1.0, n.z)) if light else c
    return f


BLUSH = hexc(0xf2b4b0)


def face_skin(co, n):
    """pele do rosto com rubor nas bochechas (coordenadas da cabeça antes de ir para o osso)"""
    c = skin(co, n)
    k = max(math.exp(-((co.x - s * 0.046) ** 2 + (co.z + 0.035) ** 2) / 0.0006) for s in (-1, 1)) * ss(0.0, -0.05, co.y)
    return mix(c, BLUSH, 0.45 * k)


def skin(co, n):
    c = mix(SKIN_D, SKIN, 0.5 + 0.5 * ss(-0.6, 0.5, n.z - 0.3 * n.y))
    return mix(c, SKIN_L, 0.3 * ss(0.5, 1.0, -n.y + n.z))


def hair(co, n):
    c = mix(HAIR_D, HAIR, 0.45 + 0.55 * ss(-0.6, 0.6, n.z - 0.2 * n.y))
    c = mix(c, HAIR_L, 0.35 * ss(0.4, 1.0, n.z))
    k = 0.9 + 0.1 * math.sin(co.x * 90 + co.y * 40)   # mechas
    return tuple(x * k for x in c)


def hair_tip(z_start, z_end):
    """cabelo que azula na ponta, de z_start a z_end"""
    def f(co, n):
        return mix(hair(co, n), HAIR_TIP, 0.6 * ss(z_start, z_end, co.z))
    return f


HAIR_TIP = hexc(0x9cc0ee)


def fur(co, n):
    c = mix(FUR_D, FUR, 0.4 + 0.6 * ss(-0.6, 0.5, n.z))
    k = 0.92 + 0.08 * math.sin(co.x * 120 + co.z * 70) * math.sin(co.y * 90)   # tufos
    return tuple(x * k for x in c)


def ice(co, n):
    return mix(ICE_D, mix(ICE, ICE_L, ss(0.4, 1.0, n.z)), 0.6 + 0.4 * ss(-0.6, 0.6, n.z))


def crown_ice(co, n):
    """cristal da coroa: base gelo, pontas quase brancas (de cima precisa destacar do cabelo)"""
    return mix(ICE, ICE_L, 0.4 + 0.6 * ss(0.1, 0.22, co.z)) if n.z > -0.5 else ICE_D


def crystal(name, base, tip, r, seg=4, low=0.25, fn=None):
    """cristal facetado: pirâmide longa para cima e curta para baixo, faces chapadas"""
    base, tip = Vector(base), Vector(tip)
    d = tip - base
    up = cone(name, base, tip, r, seg=seg)
    dn = cone(name + "b", base, base - d * low, r, seg=seg)
    for o in (up, dn):
        flat_shade(o)
        paint(o, fn or (lambda co, n, b=base, d=d: mix(ICE_D, mix(ICE, ICE_L, ss(0.4, 1.0, (co - b).dot(d) / d.length_squared)),
                                                         0.45 + 0.55 * ss(-0.2, 0.2, (co - b).dot(d) / d.length_squared))))
        o["no_ao"] = True   # cristal dentro do cabelo ou na mão saía escuro na oclusão
    return [up, dn]


def strip(name, obj, xz, r, fn, squash=0.35):
    """faixa fina deitada na superfície da frente de obj, passando pelos pontos (x, z)"""
    pts = []
    for x, z in xz:
        ok, hit, n, _ = obj.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
        if ok:
            pts.append(hit + n * r * squash * 0.6)
    t = tube(name, pts, [r] * len(pts), seg=6, squash=(1.0, squash), ref=(0, 1, 0))
    paint(t, fn)
    return t


# ------------------------------------------------------------------ cabeça: rosto pálido e fino, franja partida, coroa de gelo
def head():
    parts = {"solid": [], "flat": [], "lit": []}
    h = meta("head", [
        EL((0, 0.01, 0.025), (0.082, 0.088, 0.09)),                  # crânio
        EL((0, -0.03, -0.026), (0.07, 0.066, 0.07)),                 # rosto cheio (o fino lia como caveira)
        EL((0, -0.036, -0.06), (0.058, 0.056, 0.04)),                # maxilar largo e redondo (o queixo em ponta lia estranho)
        EL((-0.044, -0.056, -0.03), (0.036, 0.034, 0.034)),          # bochechas redondas
        EL((0.044, -0.056, -0.03), (0.036, 0.034, 0.034)),
        CAP((0, -0.086, 0.008), (0, -0.1, -0.016), 0.011),           # nariz pequeno, mas com ponta que se vê
        EL((-0.033, -0.094, 0.014), (0.017, 0.014, 0.01), neg=True),   # órbitas bem rasas
        EL((0.033, -0.094, 0.014), (0.017, 0.014, 0.01), neg=True),
        CAP((0, 0.0, -0.08), (0, 0.01, -0.2), 0.024),                # pescoço fino
    ], res=0.006)
    smooth(h, iters=2, factor=0.5, target=460)
    paint(h, face_skin)
    h["no_ao"] = True   # a oclusão do cabelo e da coroa deixava o rosto cinza
    parts["solid"].append(h)
    def on(x, z, lift=0.0):
        """ponto da pele do rosto em (x, z), vindo da frente, levantado `lift` pela normal"""
        ok, hit, nrm, _ = h.ray_cast(Vector((x, -0.5, z)), Vector((0, 1, 0)))
        return hit + nrm * lift if ok else Vector((x, -0.09, z))

    for s in (-1, 1):
        c = on(s * 0.033, 0.012, 0.002)
        white = ball("eyew", tuple(c), (0.021, 0.008, 0.014), rot=(0, s * -0.2, 0), seg=(8, 5))
        paint(white, lambda co, n: hexc(0xf6f8ff))
        iris = ball("iris", tuple(c + Vector((-s * 0.001, -0.006, -0.001))), (0.011, 0.004, 0.012), seg=(8, 5))
        paint(iris, lambda co, n: IRIS)
        hi = ball("hi", tuple(c + Vector((s * 0.003, -0.009, 0.004))), (0.0032, 0.002, 0.0032), seg=(5, 3))
        paint(hi, lambda co, n: hexc(0xffffff))
        lash = tube("lash", [on(s * 0.056, 0.02, 0.004), on(s * 0.035, 0.028, 0.005), on(s * 0.013, 0.023, 0.004)], [0.0035, 0.0042, 0.003], seg=5)
        paint(lash, lambda co, n: DARK)
        # sobrancelha fina, ponta de dentro um pouco mais baixa (decidida, não triste)
        brow = tube("brow", [on(s * 0.058, 0.044, 0.003), on(s * 0.035, 0.05, 0.003), on(s * 0.014, 0.045, 0.003)], [0.003, 0.0035, 0.003], seg=5)
        paint(brow, lambda co, n: BROW)
        parts["flat"] += [white, iris, hi, lash, brow]
    # boca pequena rosada com a linha escura no meio, e uma sombra sob a ponta do nariz
    lips = tube("lips", [on(-0.017, -0.05, 0.002), on(0, -0.047, 0.003), on(0.017, -0.05, 0.002)], [0.004, 0.006, 0.004], seg=6)
    paint(lips, lambda co, n: LIPS)
    line = tube("mline", [on(-0.016, -0.05, 0.005), on(0, -0.048, 0.007), on(0.016, -0.05, 0.005)], [0.0016, 0.002, 0.0016], seg=4)
    paint(line, lambda co, n: hexc(0x7a3048))
    nose = tube("nshadow", [on(-0.008, -0.026, 0.002), on(0, -0.028, 0.003), on(0.008, -0.026, 0.002)], [0.0025, 0.003, 0.0025], seg=4)
    paint(nose, lambda co, n: hexc(0xd49a98))
    parts["flat"] += [lips, line, nose]
    # cabelo: calota partida no meio, franja que emoldura o rosto e cortinas até os ombros; o comprido das costas fica no tronco
    hr = meta("hair", [
        EL((0, 0.02, 0.04), (0.09, 0.098, 0.096)),
        EL((0, 0.07, -0.02), (0.086, 0.07, 0.1)),
        CAP((-0.07, 0.03, 0.0), (-0.08, 0.05, -0.08), 0.04),
        CAP((0.07, 0.03, 0.0), (0.08, 0.05, -0.08), 0.04),
        EL((0, -0.085, 0.055), (0.05, 0.04, 0.03), neg=True),        # testa livre, com a risca no meio
        EL((0, -0.11, -0.04), (0.066, 0.06, 0.11), neg=True),        # rosto livre
    ], res=0.007)
    smooth(hr, iters=2, factor=0.5, target=440)
    paint(hr, hair)
    parts["solid"].append(hr)
    # mechas finas dos lados do rosto, afinando em ponta na altura da gola (pela cabeça: com o giro, as longas atravessavam o corpo)
    for sd in (-1, 1):
        for k, (dx, dy, z1, r) in enumerate(((0.0, -0.035, -0.2, 0.024), (0.016, -0.005, -0.23, 0.026), (0.02, 0.03, -0.21, 0.024))):
            x0 = sd * (0.074 + dx)
            pts = [Vector((x0, dy, 0.03)), Vector((sd * (0.088 + dx), dy, -0.06)), Vector((sd * (0.094 + dx * 1.2), dy + 0.01, -0.14)),
                   Vector((sd * (0.09 + dx * 1.4), dy + 0.015, z1))]
            st = tube("lock", pts, [r, r * 0.95, r * 0.7, 0.004], seg=7, squash=(1.0, 0.6), ref=(1, 0, 0))
            smooth(st)
            paint(st, hair_tip(-0.1, z1))
            parts["solid"].append(st)
    # coroa de gelo: aro fino e sete cristais em volta, o da frente o mais alto (como no sprite)
    band = tube("band", [(0.0, 0.004, 0.076), (0.0, 0.004, 0.088)], [0.096, 0.098], seg=18)
    paint(band, ice)
    band["no_ao"] = True
    parts["solid"].append(band)
    for ang, hgt, r in ((0, 0.27, 0.038), (-0.3, 0.13, 0.024), (0.3, 0.13, 0.024), (-0.6, 0.2, 0.032), (0.6, 0.2, 0.032),
                        (-0.95, 0.11, 0.024), (0.95, 0.11, 0.024), (-1.3, 0.14, 0.026), (1.3, 0.14, 0.026), (-1.7, 0.08, 0.022), (1.7, 0.08, 0.022)):
        bx_, by_ = 0.096 * math.sin(ang), -0.096 * math.cos(ang) + 0.004
        out = Vector((bx_, by_, 0)).normalized() * 0.025
        parts["solid"].extend(crystal("cry", (bx_, by_, 0.082), (bx_ + out.x, by_ + out.y, 0.082 + hgt), r, low=0.15, fn=crown_ice))
    return parts


# ------------------------------------------------------------------ tronco: corpete azul com gema, gola de pelo, cabelo longo
TORSO_LIT = []


def torso():
    z0 = RIG.P("torso")[2]
    sx = RIG.shoulderX
    t = meta("torso", [
        EL((0, 0.0, z0 + 0.3), (0.13, 0.088, 0.13)),
        EL((0, -0.025, z0 + 0.28), (0.1, 0.07, 0.06)),               # busto
        EL((0, 0.0, z0 + 0.09), (0.088, 0.068, 0.12)),               # cintura fina
        EL((-sx + 0.045, 0.0, z0 + 0.41), (0.05, 0.05, 0.04)),
        EL((sx - 0.045, 0.0, z0 + 0.41), (0.05, 0.05, 0.04)),
    ], res=0.01)
    smooth(t, iters=2, target=340)
    paint(t, cloth(BLUE, BLUE_D, BLUE_L))
    region(t, "primary")
    out = [t]
    # painel claro no meio da frente, do decote à cintura, com fio de gelo
    pan = strip("panel", t, [(0, z0 + 0.38), (0, z0 + 0.25), (0, z0 + 0.12), (0, z0 + 0.02)], 0.045, cloth(SKY, SKY_D, ICE_L), squash=0.3)
    region(pan, "secondary")
    out.append(pan)
    # cinto de pelo branco com gema
    belt = tube("belt", [(0, 0.0, z0 + 0.0), (0, 0.0, z0 + 0.05)], [0.098, 0.096], seg=16)
    paint(belt, fur)
    region(belt, "accent")
    out.append(belt)
    TORSO_LIT.extend(crystal("gemb", (0, -0.1, z0 + 0.025), (0, -0.104, z0 + 0.075), 0.022, low=0.6))
    TORSO_LIT.extend(crystal("gem", (0, -0.096, z0 + 0.3), (0, -0.102, z0 + 0.37), 0.028, low=0.8))
    # gola de pelo branco em gomos sobre os ombros e em volta do pescoço (sobe um pouco atrás)
    elems = []
    for k in range(22):
        a = k * 2 * math.pi / 22
        x, y = math.sin(a), -math.cos(a)
        if y < -0.82:
            continue                           # abre em V na frente: os dois lados descem em fileira até o busto (abaixo)
        back = max(0.0, y)                     # 1 atrás da nuca
        front = max(0.0, -y)
        rx = 0.1 + 0.13 * abs(x) ** 1.3
        lump = 1 + 0.18 * math.sin(k * 2.7)    # gomos irregulares de pelo
        sz = (0.06 - 0.025 * front) * lump
        elems.append(EL((rx * x, 0.1 * y + 0.015, z0 + 0.45 + 0.14 * back ** 1.5 - 0.04 * front), (sz, sz * 0.9, sz + 0.035 * back)))
        if back > 0.3:   # segunda fileira atrás: a gola sobe e emoldura a cabeça
            elems.append(EL((rx * x * 0.95, 0.1 * y + 0.03, z0 + 0.58 + 0.08 * back), (0.05 * lump, 0.04, 0.06)))
    for k in range(16):   # anel justo e alto em volta do pescoço: esconde o pescoço (antes lia como um pino)
        a = k * 2 * math.pi / 16
        x, y = math.sin(a), -math.cos(a)
        if y < -0.9:
            continue
        elems.append(EL((0.075 * x, 0.06 * y + 0.01, z0 + 0.53 + 0.04 * max(0.0, y)), (0.04, 0.036, 0.05)))
    for sd in (-1, 1):   # V curto no decote
        elems.append(EL((sd * 0.05, -0.085, z0 + 0.42), (0.04, 0.03, 0.04)))
    col = meta("collar", elems, res=0.011)
    smooth(col, iters=1, target=290)
    paint(col, fur)
    region(col, "accent")
    out.append(col)
    # cabelo comprido nas costas, liso, até a cintura
    hz = RIG.P("head")[2] + HEAD_LIFT
    pts = [Vector((0, 0.08, hz - 0.06)), Vector((0, 0.13, hz - 0.2)), Vector((0, 0.16, z0 + 0.25)), Vector((0, 0.17, z0 + 0.05)),
           Vector((0, 0.175, z0 - 0.08)), Vector((0, 0.18, z0 - 0.16))]
    long = tube("hairlong", pts, [0.1, 0.11, 0.1, 0.08, 0.05, 0.008], seg=14, squash=(1.0, 0.42), ref=(0, 1, 0))
    smooth(long, iters=1)
    paint(long, hair_tip(z0 + 0.1, z0 - 0.16))
    out.append(long)
    for sd in (-1, 1):   # duas mechas finas soltas na ponta, ao lado da cascata
        m = tube("hairtip", [Vector((sd * 0.07, 0.15, z0 + 0.2)), Vector((sd * 0.085, 0.165, z0 + 0.0)), Vector((sd * 0.07, 0.17, z0 - 0.1))],
                 [0.035, 0.028, 0.004], seg=8, squash=(1.0, 0.5), ref=(0, 1, 0))
        smooth(m)
        paint(m, hair_tip(z0 + 0.1, z0 - 0.1))
        out.append(m)
    return {"torso": out}


# ------------------------------------------------------------------ vestido: manto azul escuro aberto na frente, saia clara por baixo,
# barra de pelo branco e cauda atrás
SPEC = ((1.02, 0.1, 0.08, 0.0, 0.0, 0.0, 0.0), (0.84, 0.15, 0.12, 0.0, 0.02, 0.0, 0.0), (0.6, 0.23, 0.19, 0.01, 0.045, 0.0, 0.0),
        (0.35, 0.33, 0.31, 0.06, 0.07, 0.08, 0.0), (0.12, 0.43, 0.5, 0.17, 0.09, 0.3, 0.02), (0.02, 0.48, 0.62, 0.27, 0.09, 0.36, 0.06))
# (z, rx, ry, centro y, pregas, abertura da frente, centro x: a cauda puxa para trás e um pouco para a esquerda dela)


def skirt():
    rings = [((cx, cy, z), (0, 0, -1), rx, ry, 6, famp) for z, rx, ry, cy, famp, _, cx in SPEC]
    sk = ring_loft("gown", rings, seg=36, thick=0.022, open_half=lambda i: max(0.02, SPEC[i][5]), jag=lambda j: 0.02 * math.sin(j * 1.7))

    def gtint(co, n):
        c = cloth(BLUE, BLUE_D, BLUE_L)(co, n)
        c = mix(c, BLUE_L, 0.35 * ss(0.3, 0.05, co.z))   # clareia perto da barra
        ang = abs(math.atan2(co.x, -co.y + 1e-6))        # 0 no meio da frente
        if co.y < 0 and ang < 0.62 and co.z < 0.9:      # faixa azul-gelo da cintura à barra (borda nas colunas da malha)
            return cloth(SKY, SKY_D, ICE_L)(co, n)
        return c
    paint(sk, gtint)
    region(sk, "primary")
    # barra de pelo: dois anéis no pé do manto, um pouco mais largos, com tufos
    z, rx, ry, cy, famp, op, cx = SPEC[-1]
    hem = ring_loft("hem", [((cx, cy, z + 0.075), (0, 0, -1), rx + 0.01, ry + 0.01, 6, famp), ((cx, cy, z - 0.005), (0, 0, -1), rx + 0.035, ry + 0.035, 6, famp)],
                    seg=36, thick=0.04, open_half=lambda i: op, jag=lambda j: 0.02 * math.sin(j * 1.7) + 0.012 * math.sin(j * 4.3))
    paint(hem, fur)
    region(hem, "accent")
    # saia de baixo azul clara, que aparece na abertura da frente, com veios de gelo e barra branca
    under = ring_loft("under", [((0, 0.02, 0.5), (0, 0, -1), 0.24, 0.2, 0, 0), ((0, 0.04, 0.3), (0, 0, -1), 0.3, 0.26, 4, 0.03),
                                ((0, 0.08, 0.01), (0, 0, -1), 0.4, 0.36, 4, 0.04)], seg=20, thick=0.0)

    def utint(co, n):
        if co.z < 0.06:
            return fur(co, n)
        c = cloth(SKY, SKY_D, ICE_L)(co, n)
        v = abs(math.sin(co.x * 38 + 0.25 * math.sin(co.z * 20)))   # veios de gelo subindo da barra
        return mix(c, ICE_L, 0.55 * ss(0.94, 0.99, v) * ss(0.45, 0.1, co.z))
    paint(under, utint)
    region(under, "secondary")
    return {"skirt": [sk, hem, under]}


# ------------------------------------------------------------------ braços: mangas em sino com punho de pelo, mão aberta, cajado
FLAT_L = []
STAFF_LIT = []


def fist(name, c, size=(0.04, 0.045, 0.048)):
    knuck = [EL((c[0] + dx, c[1] - size[1] * 0.75, c[2] - size[2] * 0.55), (0.013, 0.013, 0.013)) for dx in (-0.022, -0.007, 0.007, 0.022)]
    f = meta(name, [EL(c, size), EL((c[0], c[1] - 0.03, c[2] + 0.01), (0.015, 0.019, 0.02))] + knuck, res=0.007)
    smooth(f, iters=1, target=110)
    paint(f, skin)
    f["no_ao"] = True   # mão saía cinza na oclusão
    return f


def grip(h, u):
    """mão fechada em volta da haste (eixo u): anel de pele ao longo da haste e nós dos dedos para fora"""
    u = Vector(u)
    out_ = u.cross(Vector((1, 0, 0))).normalized()
    if out_.y > 0:
        out_ = -out_                                   # nós dos dedos para a frente
    elems = [CAP(tuple(h - u * 0.035), tuple(h + u * 0.035), 0.034)]
    for k in range(4):
        elems.append(EL(tuple(h + out_ * 0.03 + u * (0.027 - k * 0.018)), (0.014, 0.014, 0.012)))
    elems.append(CAP(tuple(h - out_ * 0.02 + u * 0.03), tuple(h - out_ * 0.03 + u * 0.06), 0.013))   # polegar por cima
    f = meta("grip", elems, res=0.006)
    smooth(f, iters=1, target=130)
    paint(f, skin)
    f["no_ao"] = True
    return f


def open_hand(h, up):
    """mão aberta com a palma para cima: palma achatada na vertical do mundo e dedos curtos levemente curvos (sem contorno)"""
    up = Vector(up)
    fwd = Vector((0, 0, -1))   # ao longo do antebraço
    side = fwd.cross(up).normalized()
    palm = tube("palm", [h + fwd * 0.005, h + fwd * 0.05], [0.036, 0.034], seg=10, squash=(1.0, 0.45), ref=tuple(up))
    smooth(palm)
    paint(palm, skin)
    palm["no_ao"] = True
    for k, dx in enumerate((-0.024, 0.0, 0.024)):   # três dedos separados e o polegar
        ln = 0.07 if k == 1 else 0.06
        b0 = h + fwd * 0.045 + side * dx
        f = tube("finger", [b0, b0 + fwd * ln * 0.6 + side * dx * 0.3 + up * 0.008, b0 + fwd * ln + side * dx * 0.5 + up * 0.024],
                 [0.013, 0.011, 0.006], seg=6)
        paint(f, skin)
        FLAT_L.append(f)
    th = tube("thumb", [h + side * 0.03 + fwd * 0.01, h + side * 0.062 + fwd * 0.035 + up * 0.022], [0.012, 0.006], seg=6)
    paint(th, skin)
    FLAT_L.append(th)
    return [palm]


def hand_height(pose, side):
    """altura da mão no mundo (three) na pose de repouso, para o pé do cajado tocar o chão"""
    fr, a = fore_rot(pose, side, LEAN, OUT)
    sh = Vector(RIG.p3["armR" if side > 0 else "armL"])
    hand = sh + a @ Vector((0, -RIG.arm, 0)) + fr @ Vector((0, -HAND, 0))
    return hand.y + 0.06   # a forma "robed" flutua 0,06 (restArm em kit.ts)


def staff(hand, u, height):
    """cajado alto e fino, em pé no mundo: haste clara do chão até acima da cabeça, anéis de gelo e um pomo de cristal no topo,
    onde o floco aceso (por código) se apoia"""
    u = Vector(u)
    bot, top = hand - u * (height - 0.03), hand + u * STAFF_TOP
    shaft = tube("shaft", [bot, hand, top], [0.017, 0.02, 0.022], seg=7)
    paint(shaft, lambda co, n: mix(STAFF_D, STAFF, 0.4 + 0.6 * ss(-0.5, 0.6, n.z)))
    out = [shaft]
    for k, (t, r) in enumerate(((0.25, 0.03), (0.5, 0.028))):
        ring = tube("ring", [top - u * (t + 0.02), top - u * t], [r, r], seg=8)
        paint(ring, ice)
        out.append(ring)
    foot = cone("foot", bot + u * 0.06, bot - u * 0.02, 0.026, seg=4)   # ponteira de gelo
    flat_shade(foot)
    paint(foot, ice)
    out.append(foot)
    out += crystal("knob", top - u * 0.02, top + u * 0.1, 0.04, low=0.5)
    for o in out:
        o["no_ao"] = True   # haste fina saía azul-marinho na oclusão
    return out


def arms():
    out = {}
    for side, s, pose in (("L", -1, POSE_L), ("R", 1, POSE_R)):
        ax, ay, az = RIG.P("arm" + side)
        up = tube("sleeveU", [(ax, ay, az + 0.02), (ax, ay, az - RIG.arm * 0.5), (ax, ay, az - RIG.arm)], [0.07, 0.075, 0.08], seg=12)
        smooth(up)
        paint(up, cloth(BLUE, BLUE_D, BLUE_L))
        region(up, "primary")
        fr, _ = fore_rot(pose, s, LEAN, OUT)
        down = local_dir(fr, (0, 0, -1))
        upw = local_dir(fr, (0, 0, 1))
        e = Vector(RIG.P("fore" + side))
        hand = e + Vector((0, 0, -HAND))
        fore = tube("fore", [e, e + Vector((0, 0, -0.13)), e + Vector((0, 0, -0.2))], [0.058, 0.052, 0.045], seg=10)
        smooth(fore)
        paint(fore, cloth(SKY, SKY_D))
        region(fore, "secondary")
        wrist = tube("wrist", [e + Vector((0, 0, -0.2)), e + Vector((0, 0, -0.26))], [0.03, 0.026], seg=8)
        paint(wrist, skin)
        # manga em sino longa: sai do antebraço e cai para o chão até perto do quadril, com a boca de pelo branco; o eixo mistura
        # antebraço e chão, então ela gira com o braço no golpe em vez de ficar pendurada solta
        ln = 0.2
        ax_ = (Vector((0, 0, -1)) + down * 0.35).normalized()
        st0 = e + Vector((0, 0, -0.06))
        drape = bell_sleeve("drape", st0, down, ln, 0.065, 0.14, sag=0.45, folds=5, famp=0.08,
                            axis=ax_, jag=lambda j: 0.02 * (j % 3 == 0) + 0.01 * (j % 2))
        paint(drape, lambda co, n, st0=st0: fur(co, n) if (co - st0).length > ln * 0.8 else cloth(BLUE, BLUE_D, BLUE_L)(co, n))
        region(drape, "primary")
        drape["no_ao"] = True
        cuff = tube("cuff", [e + Vector((0, 0, -0.19)), e + Vector((0, 0, -0.23))], [0.056, 0.05], seg=12)   # punho de pelo
        smooth(cuff)
        paint(cuff, fur)
        region(cuff, "accent")
        parts = [fore, wrist, drape, cuff]
        if side == "L":
            parts += open_hand(hand, upw)
        else:
            parts.append(grip(hand, upw))
            parts += staff(hand, upw, hand_height(POSE_R, 1))
        out["arm" + side] = [up]
        out["fore" + side] = parts
    return out


if __name__ == "__main__":
    reset()
    a = arms()
    a["foreL@flat"] = FLAT_L
    a["torso@lit"] = TORSO_LIT
    parts = merge(place_head(RIG, head(), lift=HEAD_LIFT, scale=HEAD_SCALE), torso(), skirt(), a)
    finish("frostine", RIG, parts, ARGS, body_center=(0, 0, 0.95), body_dist=4.4, head_dist=1.2, form="robed")
