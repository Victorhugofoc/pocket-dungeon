# Aurelius (herói, mago arcano velho) modelado no Blender (M2-11). Brief: docs/briefs/aurelius.md. Rodar: ver tools/blender/README.md.
# Forma "robed": sem pernas, o manto fica no osso "skirt". Mão direita erguida, aberta, palma para cima; o orbe aceso que flutua
# sobre ela fica por código (cast-heroes.ts). Grimório de couro preso ao quadril esquerdo.
# Regiões de cor (para as skins, M13-06): primary = roxo do manto e do chapéu, secondary = roxo claro do painel, accent = dourado.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from humanoid import Rig, finish, merge, place_head  # noqa: E402
from robed import bell_sleeve, fore_rot, local_dir, ring_loft  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
# as mesmas medidas e pose da receita (cast-heroes.ts); tests/models.test.ts confere as medidas
RIG = Rig(hipY=0.92, headY=0.56, shoulderY=0.45, shoulderX=0.27, arm=0.33, hipX=0, thigh=0.42)
HAND = 0.31
POSE_R, POSE_L, LEAN, OUT = (-0.85, -1.75), (0.1, -0.6), 0.16, 0.16   # mão direita aberta na altura do ombro
HEAD_LIFT, HEAD_SCALE = 0.19, 1.9

SKIN, SKIN_D, SKIN_L = hexc(0xf0c8ae), hexc(0xc08e7a), hexc(0xffe4d2)
ROSE = hexc(0xe08a80)
PURPLE, PURPLE_D, PURPLE_L = hexc(0x7c3cb0), hexc(0x3a1a5a), hexc(0xa468d8)   # roxo puxado ao magenta (o azulado lia azul no jogo)
LILAC, LILAC_D = hexc(0xac78e0), hexc(0x6a3ca0)
GOLD, GOLD_D, GOLD_L = hexc(0xe0aa3a), hexc(0x8a5a18), hexc(0xffe08a)
BEARD, BEARD_D, BEARD_L = hexc(0xeeecee), hexc(0xa8a2a6), hexc(0xffffff)
HIDE, HIDE_D, HIDE_L = hexc(0x7a3e2c), hexc(0x3a1a14), hexc(0xa05a3c)
PAGE = hexc(0xf0e2c0)
DARK = hexc(0x2a1a3a)


def cloth(base, dark, light=None):
    def f(co, n):
        c = mix(dark, base, 0.35 + 0.65 * ss(-0.7, 0.5, n.z))
        return mix(c, light, 0.35 * ss(0.5, 1.0, n.z)) if light else c
    return f


def gold(co, n):
    c = mix(GOLD_D, GOLD, 0.4 + 0.6 * ss(-0.6, 0.5, n.z))
    return mix(c, GOLD_L, 0.45 * ss(0.5, 1.0, n.z - 0.3 * n.y))


def skin(co, n):
    c = mix(SKIN_D, SKIN, 0.5 + 0.5 * ss(-0.6, 0.5, n.z - 0.3 * n.y))
    return mix(c, SKIN_L, 0.25 * ss(0.5, 1.0, -n.y + n.z))


def face_skin(co, n):
    """pele do rosto com nariz e bochechas rosados (coordenadas da cabeça antes de ir para o osso)"""
    c = skin(co, n)
    k = max(math.exp(-((co.x - s * 0.046) ** 2 + (co.z + 0.03) ** 2) / 0.0007) for s in (-1, 1)) * ss(0.0, -0.05, co.y)
    nose = math.exp(-((co.x) ** 2 + (co.z + 0.03) ** 2) / 0.0006) * ss(-0.09, -0.12, co.y)
    return mix(c, ROSE, 0.5 * max(k, nose))


def beard(co, n):
    c = mix(BEARD_D, BEARD, 0.4 + 0.6 * ss(-0.6, 0.6, n.z - 0.6 * n.y))
    c = mix(c, BEARD_L, 0.35 * ss(0.4, 1.0, -n.y))
    k = 0.86 + 0.14 * abs(math.sin(co.x * 75 + 0.4 * math.sin(co.z * 30)))   # mechas
    return tuple(x * k for x in c)


def beard_tip(z0, z1):
    """barba que fica cinza na ponta, de z0 a z1"""
    def f(co, n):
        return mix(beard(co, n), BEARD_D, 0.45 * ss(z0, z1, co.z))
    return f


def hair(co, n):
    """cabelo branco, com um cinza leve só no fundo das mechas"""
    c = mix(BEARD_D, BEARD, 0.55 + 0.45 * ss(-0.6, 0.6, n.z - 0.4 * n.y))
    k = 0.9 + 0.1 * abs(math.sin(co.x * 70 + 0.4 * math.sin(co.z * 25)))
    return tuple(x * k for x in mix(c, BEARD_L, 0.2))


def hide(co, n):
    return mix(HIDE_D, HIDE, 0.4 + 0.6 * ss(-0.6, 0.5, n.z - 0.3 * n.y))


def sleeve_mouth(e, d, length, sag, axis):
    """centro e direção da boca do sino de bell_sleeve (mesma conta de robed.py)"""
    ax = Vector(axis).normalized()
    d = Vector(d)
    perp = d - ax * d.dot(ax)
    p1 = e + ax * length * 0.55
    p2 = e + ax * length * (0.75 + 0.25 * max(0.0, d.dot(ax))) + perp * length * sag
    return p2, (p2 - p1).normalized()


def box(name, center, size, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    m = Matrix.Translation(Vector(center)) @ Euler(rot).to_matrix().to_4x4() @ Matrix.Diagonal((*size, 1))
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
    return flat_shade(new_mesh(name, bm))


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


# ------------------------------------------------------------------ cabeça: velho de nariz grande, sobrancelhas e barba brancas, chapéu
def head():
    parts = {"solid": [], "flat": [], "lit": []}
    h = meta("head", [
        EL((0, 0.01, 0.02), (0.085, 0.09, 0.09)),                    # crânio
        EL((0, -0.028, -0.026), (0.074, 0.068, 0.07)),               # rosto cheio
        EL((0, -0.034, -0.062), (0.06, 0.056, 0.042)),               # maxilar redondo (fica sob a barba)
        EL((-0.044, -0.047, -0.03), (0.04, 0.036, 0.036)),           # bochechas rasas (dobra funda virava risco preto do contorno)
        EL((0.044, -0.047, -0.03), (0.04, 0.036, 0.036)),
        EL((-0.033, -0.092, 0.012), (0.017, 0.013, 0.01), neg=True),   # órbitas rasas
        EL((0.033, -0.092, 0.012), (0.017, 0.013, 0.01), neg=True),
        CAP((0, 0.0, -0.08), (0, 0.01, -0.2), 0.03),                 # pescoço
    ], res=0.006)
    smooth(h, iters=2, factor=0.5, target=440)
    paint(h, face_skin)
    h["no_ao"] = True   # a oclusão do chapéu e da barba deixava o rosto cinza
    parts["solid"].append(h)
    # nariz grande, peça própria sem contorno: na dobra com o rosto o contorno virava um risco preto
    nose = meta("nose", [CAP((0, -0.068, -0.002), (0, -0.112, -0.024), 0.017), EL((0, -0.117, -0.032), (0.026, 0.023, 0.022))], res=0.004)
    smooth(nose, iters=2, factor=0.5, target=200)
    paint(nose, face_skin)
    nose["no_ao"] = True
    parts["flat"].append(nose)

    def on(x, z, lift=0.0):
        """ponto da pele do rosto em (x, z), vindo da frente, levantado `lift` pela normal"""
        ok, hit, nrm, _ = h.ray_cast(Vector((x, -0.5, z)), Vector((0, 1, 0)))
        return hit + nrm * lift if ok else Vector((x, -0.09, z))

    def brow_paint(co, n):   # branco por cima, cinza por baixo: sem contorno, o volume é que separa do rosto
        return mix(BEARD_D, BEARD, 0.25 + 0.75 * ss(-0.5, 0.6, n.z - 0.3 * n.y))

    for s in (-1, 1):
        c = on(s * 0.034, 0.006, 0.002)
        white = sball("eyew", tuple(c), (0.016, 0.006, 0.011), rot=(0, s * -0.2, 0), seg=(12, 8))
        paint(white, lambda co, n: hexc(0xf6f2ea))
        iris = sball("iris", tuple(c + Vector((-s * 0.002, -0.005, -0.001))), (0.0085, 0.003, 0.0085), seg=(8, 5))
        paint(iris, lambda co, n: hexc(0x3a5a8e))
        pup = sball("pupil", tuple(c + Vector((-s * 0.002, -0.0075, -0.001))), (0.004, 0.002, 0.004), seg=(6, 4))
        paint(pup, lambda co, n: hexc(0x14101c))
        hi = sball("hi", tuple(c + Vector((s * 0.0015, -0.009, 0.003))), (0.0025, 0.0015, 0.0025), seg=(5, 3))
        paint(hi, lambda co, n: hexc(0xffffff))
        # linha da pálpebra de cima em diagonal, baixa do lado do nariz (olhar bravo), e a sombra de pele por cima do olho
        lash = tube("lash", [on(s * 0.047, 0.0135, 0.007), on(s * 0.034, 0.0115, 0.0085), on(s * 0.021, 0.006, 0.007)], [0.0012, 0.0024, 0.0012], seg=5)
        paint(lash, lambda co, n: hexc(0x3a2228))
        lid = tube("lid", [on(s * 0.05, 0.02, 0.003), on(s * 0.034, 0.0175, 0.004), on(s * 0.018, 0.011, 0.003)], [0.004, 0.0055, 0.004], seg=6)
        smooth(lid)
        paint(lid, lambda co, n: mix(SKIN_D, SKIN, 0.3))   # pele sem realce: pálpebra rente, não faixa clara
        parts["flat"] += [white, iris, pup, hi, lid, lash]
        # sobrancelha farta e franzida (mago bravo): tufo de metaball que desce para o nariz e sobe para fora, ponta afinando
        p0, p1, p2 = on(s * 0.008, 0.026, 0.008), on(s * 0.03, 0.035, 0.012), on(s * 0.056, 0.045, 0.012)
        p3 = p2 + Vector((s * 0.03, 0.004, 0.012))
        br = meta("brow", [CAP(tuple(p0), tuple(p1), 0.011), CAP(tuple(p1), tuple(p2), 0.012), CAP(tuple(p2), tuple(p3), 0.007)], res=0.0035)
        smooth(br, iters=2, factor=0.5, target=180)
        paint(br, brow_paint)
        br["no_ao"] = True
        parts["flat"].append(br)
    # boca: lábio de baixo rosado e a linha escura, entre o bigode e a barba
    lips = tube("lips", [on(-0.014, -0.064, 0.003), on(0, -0.061, 0.004), on(0.014, -0.064, 0.003)], [0.004, 0.0055, 0.004], seg=6)
    paint(lips, lambda co, n: hexc(0xb86870))
    line = tube("mline", [on(-0.017, -0.063, 0.006), on(0, -0.056, 0.007), on(0.017, -0.063, 0.006)], [0.0018, 0.0022, 0.0018], seg=4)
    paint(line, lambda co, n: hexc(0x5a2830))
    parts["flat"] += [lips, line]
    # bigode em duas pontas que caem dos lados da boca
    for s in (-1, 1):
        q = [on(s * 0.004, -0.046, 0.01), on(s * 0.028, -0.052, 0.014), on(s * 0.05, -0.07, 0.012), on(s * 0.058, -0.1, 0.008)]
        m = meta("must", [CAP(tuple(q[0]), tuple(q[1]), 0.015), CAP(tuple(q[1]), tuple(q[2]), 0.013), CAP(tuple(q[2]), tuple(q[3]), 0.007)], res=0.004)
        smooth(m, iters=2, factor=0.5, target=150)
        paint(m, lambda co, n: mix(BEARD_D, BEARD, 0.3 + 0.7 * ss(-0.5, 0.6, n.z - 0.5 * n.y)))
        parts["flat"].append(m)   # sem contorno: a linha preta separava o bigode do rosto
    # barba até a cintura, larga no queixo e em ponta, afastada do peito (vai na cabeça, que gira por cima do tronco)
    path = [(-0.075, -0.095, 0.115, 0.045), (-0.085, -0.14, 0.13, 0.045), (-0.095, -0.2, 0.115, 0.04), (-0.105, -0.265, 0.085, 0.034),
            (-0.115, -0.33, 0.055, 0.026), (-0.12, -0.38, 0.025, 0.016)]
    elems = [EL((0, y, z), (w, d, 0.05)) for y, z, w, d in path]
    for s in (-1, 1):   # lados da barba que sobem pelas bochechas até o cabelo
        elems.append(CAP((s * 0.088, -0.0, 0.0), (s * 0.094, -0.045, -0.11), 0.032))   # liga ao cabelo dos lados
    elems.append(EL((0, -0.098, -0.062), (0.02, 0.012, 0.01), neg=True))   # deixa a boca aparecer
    bd = meta("beard", elems, res=0.007)
    smooth(bd, iters=2, factor=0.5, target=470)
    paint(bd, beard_tip(-0.22, -0.4))
    bd["no_ao"] = True
    parts["solid"].append(bd)
    for k, (dx, z1) in enumerate(((-0.045, -0.41), (0.0, -0.45), (0.045, -0.42))):   # pontas soltas da barba
        tip = tube("btip", [Vector((dx, -0.112, -0.3)), Vector((dx * 1.1, -0.12, -0.37)), Vector((dx * 0.8, -0.124, z1))],
                   [0.03, 0.02, 0.003], seg=9, squash=(1.0, 0.55), ref=(0, 1, 0))
        smooth(tip)
        paint(tip, beard_tip(-0.26, z1))
        tip["no_ao"] = True
        parts["solid"].append(tip)
    # cabelo branco: atrás da cabeça e dos lados, caindo até os ombros por baixo da aba
    hr = meta("hair", [
        EL((0, 0.03, 0.02), (0.092, 0.09, 0.09)),
        EL((0, 0.06, -0.08), (0.085, 0.06, 0.09)),
        CAP((-0.078, 0.02, 0.01), (-0.09, 0.04, -0.13), 0.035),
        CAP((0.078, 0.02, 0.01), (0.09, 0.04, -0.13), 0.035),
        CAP((0, 0.07, -0.05), (0, 0.08, -0.2), 0.06),
        EL((0, -0.11, -0.02), (0.07, 0.07, 0.12), neg=True),        # rosto livre
    ], res=0.008)
    smooth(hr, iters=2, factor=0.5, target=260)
    paint(hr, hair)
    parts["solid"].append(hr)
    for k, (dx, z1) in enumerate(((-0.07, -0.25), (-0.025, -0.29), (0.025, -0.28), (0.07, -0.24))):   # mechas até o meio das costas
        lk = tube("hlock", [Vector((dx * 0.9, 0.07, -0.05)), Vector((dx, 0.1, -0.14)), Vector((dx * 1.1, 0.12, -0.21)), Vector((dx * 1.2, 0.128, z1))],
                  [0.035, 0.033, 0.022, 0.003], seg=8, squash=(1.0, 0.55), ref=(0, 1, 0))
        smooth(lk)
        paint(lk, hair)
        parts["solid"].append(lk)

    # chapéu: aba larga e mole, cone reto e pontudo, fita dourada com broche do lado
    rings = [((0, 0.01, 0.1), (0, 0, -1), 0.1, 0.1, 0, 0), ((0, 0.01, 0.096), (0, 0, -1), 0.16, 0.16, 5, 0.03),
             ((0, 0.01, 0.082), (0, 0, -1), 0.215, 0.21, 5, 0.06)]
    brim = ring_loft("brim", rings, seg=32, thick=0.014, jag=lambda j: 0.012 * math.sin(j * 1.3) + 0.006 * math.sin(j * 3.1))
    # a aba cai nos lados e atrás e levanta um pouco na frente, para mostrar os olhos
    for v in brim.data.vertices:
        r = math.hypot(v.co.x, v.co.y)
        fr = -v.co.y / max(r, 1e-4)   # 1 na frente
        v.co.z += ss(0.12, 0.22, r) * (0.02 * fr - 0.035 * (1 - abs(fr)) - 0.015 * max(0.0, -fr))
    paint(brim, cloth(PURPLE, PURPLE_D, PURPLE_L))
    region(brim, "primary")
    # cone reto, levemente inclinado para trás: a curva dobrada lia como chapéu cortado no meio (pedido do usuário)
    cone_pts = [Vector((0, 0.01, 0.095)), Vector((0, 0.022, 0.2)), Vector((0, 0.036, 0.3)), Vector((0, 0.05, 0.4)), Vector((0, 0.066, 0.52))]
    cn = tube("hatcone", cone_pts, [0.108, 0.082, 0.056, 0.03, 0.001], seg=18)
    for p_ in cn.data.polygons:
        p_.use_smooth = True
    paint(cn, cloth(PURPLE, PURPLE_D, PURPLE_L))
    region(cn, "primary")
    band = tube("band", [(0, 0.01, 0.103), (0, 0.013, 0.138)], [0.116, 0.106], seg=24)   # acima da superfície do cone (senão listra)
    paint(band, gold)
    region(band, "accent")
    band["no_ao"] = True
    # broche dourado do lado esquerdo da fita (como no sprite): estrela de quatro pontas numa peça só, em relevo, pousada na fita
    # sem tocar a aba (de cones cruzados, o braço de baixo entrava na aba e cada cruzamento dava pixel preto), e gema redonda
    nrm = Vector((-0.75, -0.66, 0)).normalized()
    up = Vector((0, 0, 1))
    tan = up.cross(nrm).normalized()
    bc = Vector((0, 0.0115, 0.122)) + nrm * 0.113   # na superfície da fita
    bm = bmesh.new()
    ring = []
    for k in range(8):
        a = k * math.pi / 4
        r = (0.04 if k % 4 == 0 else 0.017) if k % 2 == 0 else 0.008
        ring.append(bc + (tan * math.cos(a) + up * math.sin(a)) * r)
    front = [bm.verts.new(p_ + nrm * 0.004) for p_ in ring]
    back = [bm.verts.new(p_ - nrm * 0.004) for p_ in ring]
    top = bm.verts.new(bc + nrm * 0.016)
    for k in range(8):
        k2 = (k + 1) % 8
        bm.faces.new((top, front[k], front[k2]))
        bm.faces.new((front[k], back[k], back[k2], front[k2]))
    bm.faces.new(list(reversed(back)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    star = flat_shade(new_mesh("star", bm))
    paint(star, gold)
    gem = sball("gem", tuple(bc + nrm * 0.016), (0.0085, 0.0085, 0.0085), seg=(10, 7))
    paint(gem, lambda co, n: mix(hexc(0x5a2ac0), hexc(0xe0c8ff), ss(-0.2, 1.0, n.z - 0.5 * n.y)))
    for o in (star, gem):
        o["no_ao"] = True
        region(o, "accent")
    parts["solid"] += [brim, cn, band, star]
    parts["flat"].append(gem)
    return parts


# ------------------------------------------------------------------ tronco: manto roxo com faixa dourada na frente, faixa da cintura
def torso():
    z0 = RIG.P("torso")[2]
    t = meta("torso", [
        EL((0, 0.0, z0 + 0.3), (0.2, 0.19, 0.17)),                  # peito fundo (de perfil lia magro)
        EL((0, -0.05, z0 + 0.25), (0.16, 0.14, 0.13)),               # peito para a frente
        EL((0, 0.06, z0 + 0.36), (0.16, 0.13, 0.11)),                # costas curvadas
        EL((0, -0.03, z0 + 0.1), (0.2, 0.2, 0.16)),                  # barriga de velho
        EL((-0.19, 0.0, z0 + 0.39), (0.09, 0.1, 0.075)),             # ombros redondos e caídos
        EL((0.19, 0.0, z0 + 0.39), (0.09, 0.1, 0.075)),
    ], res=0.01)
    smooth(t, iters=2, target=240)
    paint(t, cloth(PURPLE, PURPLE_D, PURPLE_L))
    region(t, "primary")
    out = [t]
    # faixa da frente: dourada larga com um fio roxo claro no meio
    st = strip("front", t, [(0, z0 + 0.5), (0, z0 + 0.35), (0, z0 + 0.2), (0, z0 + 0.04)], 0.045, gold, squash=0.3)
    region(st, "accent")
    st2 = strip("front2", t, [(0, z0 + 0.5), (0, z0 + 0.35), (0, z0 + 0.2), (0, z0 + 0.04)], 0.022, cloth(LILAC, LILAC_D), squash=0.45)
    region(st2, "secondary")
    # gola roxa com debrum dourado em volta do pescoço
    col = tube("collar", [(0, 0.01, z0 + 0.48), (0, 0.015, z0 + 0.55)], [0.14, 0.1], seg=24)
    paint(col, lambda co, n: gold(co, n) if co.z > z0 + 0.535 else cloth(PURPLE, PURPLE_D)(co, n))
    region(col, "primary")
    # faixa dourada larga e saliente na cintura (aparece dos dois lados da barba), fivela e duas pontas de lado
    sash = tube("sash", [(0, 0.0, z0 - 0.07), (0, 0.0, z0 + 0.03), (0, 0.0, z0 + 0.13)], [0.222, 0.228, 0.21], seg=16, squash=(1.0, 0.97))
    smooth(sash)
    paint(sash, gold)
    region(sash, "accent")
    knot = box("buckle", (0.13, -0.18, z0 + 0.03), (0.085, 0.024, 0.1), (0, 0, -0.62))   # fivela de lado (a barba cobre o meio)
    paint(knot, lambda co, n: mix(GOLD_L, GOLD, 0.5) if abs(co.z - z0 - 0.03) < 0.028 else gold(co, n))
    region(knot, "accent")
    ends = []
    for k, dx in enumerate((0.035, 0.07)):
        e = tube("sashend", [(0.14, -0.2, z0 - 0.02), (0.14 + dx * 0.5, -0.22, z0 - 0.12), (0.14 + dx, -0.25, z0 - 0.24)], [0.024, 0.022, 0.02],
                 seg=6, squash=(1.0, 0.35), ref=(0, 1, 0))
        paint(e, gold)
        region(e, "accent")
        ends.append(e)
    # correia de couro do ombro direito até o quadril esquerdo (segura o grimório)
    belt = strip("strap", t, [(0.17, z0 + 0.43), (0.08, z0 + 0.3), (-0.04, z0 + 0.18), (-0.15, z0 + 0.06)], 0.018, hide, squash=0.4)
    for o in (st, st2, col, sash, knot, belt, *ends):
        o["no_ao"] = True
    out += [st, st2, col, sash, knot, belt] + ends
    return {"torso": out}


# ------------------------------------------------------------------ manto até o chão: painel claro na frente, barra e bordado dourados
SPEC = ((1.04, 0.21, 0.21), (0.85, 0.245, 0.245), (0.6, 0.295, 0.295), (0.38, 0.33, 0.325), (0.22, 0.38, 0.37), (0.14, 0.405, 0.395),
        (0.08, 0.45, 0.43), (0.02, 0.48, 0.46))   # quase redondo: fundo de perfil, não chapado
HEM_Z = 0.12
FOLDS = 8


def famp(z):
    return 0.03 + 0.07 * (1 - z)   # pregas mais fundas embaixo


PANEL = 0.36    # meia abertura (radianos) do painel claro da frente


def robe_paint(co, n):
    ang = math.atan2(co.x, -co.y + 1e-6)   # 0 no meio da frente
    a = abs(ang)
    c = cloth(PURPLE, PURPLE_D, PURPLE_L)(co, n)
    if a < PANEL:
        c = cloth(LILAC, LILAC_D, PURPLE_L)(co, n)
    return c   # o debrum dourado do painel são tubos próprios (pintado, borrava entre os vértices)


def skirt():
    rings = [((0, 0, z), (0, 0, -1), rx, ry, FOLDS, famp(z)) for z, rx, ry in SPEC]
    sk = ring_loft("robe", rings, seg=28, thick=0.022, jag=lambda j: 0.012 * math.sin(j * 1.7))
    paint(sk, robe_paint)
    region(sk, "primary")
    # barra dourada larga no pé do manto, um pouco mais larga que ele
    z, rx, ry = SPEC[-1]
    hem = ring_loft("hem", [((0, 0, HEM_Z), (0, 0, -1), 0.44, 0.425, FOLDS, famp(HEM_Z)), ((0, 0, z - 0.004), (0, 0, -1), rx + 0.018, ry + 0.018, FOLDS, famp(z))],
                    seg=28, thick=0.02, jag=lambda j: 0.012 * math.sin(j * 1.7))
    paint(hem, gold)
    region(hem, "accent")
    hem["no_ao"] = True
    out = [sk, hem]
    # bordado: fio dourado fino em volta do manto, acima da barra, seguindo as pregas
    zl = 0.2
    rx, ry = 0.38 + (0.405 - 0.38) * (0.22 - zl) / 0.08, 0.37 + (0.395 - 0.37) * (0.22 - zl) / 0.08
    pts = []
    for j in range(33):
        a = 2 * math.pi * j / 32
        f = 1 + famp(zl) * math.cos(a * FOLDS)
        pts.append(Vector(((rx * f + 0.013) * math.sin(a), -(ry * f + 0.013) * math.cos(a), zl)))
    trim = tube("trim", pts, [0.01] * len(pts), seg=3, cap=False)
    paint(trim, gold)
    region(trim, "accent")
    trim["no_ao"] = True
    out.append(trim)
    # debrum dourado nítido nas duas bordas do painel claro, colado ao manto da cintura até a barra
    for sg in (-1, 1):
        ep = []
        for k in range(9):
            z = 0.98 - (0.98 - 0.15) * k / 8
            d = Vector((sg * math.sin(PANEL), -math.cos(PANEL), 0))
            ok, hit, nn, _ = sk.ray_cast(Vector((0, 0, z)) + d * 1.0, -d)
            if ok:
                ep.append(hit + nn * 0.006)
        ed = tube("pedge", ep, [0.016] * len(ep), seg=5, squash=(1.0, 0.4), ref=(0, 1, 0))
        paint(ed, gold)
        region(ed, "accent")
        ed["no_ao"] = True
        out.append(ed)
    # losango dourado no meio do painel, perto da barra (a faixa vertical lia como cajado)
    zd = 0.27
    ok, hit, nn, _ = sk.ray_cast(Vector((0, -1.0, zd)), Vector((0, 1, 0)))
    dia = box("diamond", tuple(hit + Vector((0, -0.012, 0))), (0.085, 0.016, 0.085), (0, 0.785, 0))
    paint(dia, gold)
    region(dia, "accent")
    dia["no_ao"] = True
    out.append(dia)
    # pontas das botas de couro aparecendo sob a barra
    for s in (-1, 1):
        sh = sball("shoe", (s * 0.12, -0.42, 0.035), (0.075, 0.115, 0.045), seg=(10, 6))
        paint(sh, lambda co, n: mix(hexc(0x24120c), hexc(0x4e2c1c), 0.4 + 0.6 * ss(-0.6, 0.5, n.z)))   # marrom-escuro (claro lia pele)
        out.append(sh)
    return {"skirt": out}


# ------------------------------------------------------------------ grimório de couro no quadril esquerdo
def book():
    K = 1.55   # grimório grande (pequeno lia como caixinha)
    zc = 0.66   # abaixo do punho esquerdo (mais alto, o polegar aparecia solto sobre a capa)
    rot = (0, 0, 0.9)   # no quadril, virado para a frente (de lado lia como um risco)
    c = Vector((-0.31, -0.13, zc))
    R = Euler(rot).to_matrix()
    cov = box("cover", tuple(c), (0.055 * K, 0.17 * K, 0.24 * K), rot)
    paint(cov, hide)
    pages = box("pages", tuple(c + R @ Vector((0.006 * K, -0.004 * K, 0))), (0.044 * K, 0.158 * K, 0.226 * K), rot)
    paint(pages, lambda co, n: mix(hexc(0xc8b48a), PAGE, 0.5 + 0.5 * ss(-0.5, 0.5, n.z)))
    # a capa de fora: lombada e capa cobrem as páginas dos lados de fora
    outer = box("outer", tuple(c + R @ Vector((-0.024 * K, 0, 0))), (0.012 * K, 0.176 * K, 0.246 * K), rot)
    paint(outer, hide)
    out = [cov, pages, outer]
    for sy in (-1, 1):   # cantos dourados
        for sz in (-1, 1):
            k = box("corner", tuple(c + R @ Vector((-0.03 * K, sy * 0.078 * K, sz * 0.111 * K))), (0.012 * K, 0.03 * K, 0.03 * K), rot)
            paint(k, gold)
            region(k, "accent")
            out.append(k)
    emb = box("emblem", tuple(c + R @ Vector((-0.033 * K, 0, 0))), (0.008 * K, 0.06 * K, 0.06 * K), (rot[0] + 0.785, rot[1], rot[2]))
    paint(emb, gold)
    region(emb, "accent")
    clasp = box("clasp", tuple(c + R @ Vector((0.0, -0.09 * K, 0))), (0.06 * K, 0.016 * K, 0.035 * K), rot)
    paint(clasp, gold)
    region(clasp, "accent")
    out += [emb, clasp]
    for o in out:
        o["no_ao"] = True
    return {"hips": out}


# ------------------------------------------------------------------ braços: mangas em sino com punho dourado; mão direita aberta
FLAT = {"foreL": [], "foreR": []}


def fist(name, c, size=(0.05, 0.04, 0.058)):
    knuck = [EL((c[0] + dx, c[1] - size[1] * 0.8, c[2] - size[2] * 0.5), (0.015, 0.014, 0.015)) for dx in (-0.024, -0.008, 0.008, 0.024)]
    thumb = CAP((c[0] + 0.035, c[1] - 0.02, c[2] + 0.01), (c[0] + 0.02, c[1] - 0.045, c[2] - 0.025), 0.014)
    f = meta(name, [EL(c, size)] + knuck + [thumb], res=0.007)
    smooth(f, iters=1, target=120)
    paint(f, lambda co, n: mix(SKIN_D, SKIN, 0.35 + 0.5 * ss(-0.6, 0.5, n.z)))   # sem o realce claro: lia como bola branca
    f["no_ao"] = True
    return f


def open_hand(h, up, flat):
    """mão aberta com a palma para cima: palma achatada na vertical do mundo e dedos curtos levemente curvos"""
    up = Vector(up)
    fwd = Vector((0, 0, -1))   # ao longo do antebraço
    side = fwd.cross(up).normalized()
    palm = tube("palm", [h + fwd * 0.005, h + fwd * 0.065], [0.05, 0.046], seg=10, squash=(1.0, 0.45), ref=tuple(up))
    smooth(palm)
    paint(palm, skin)
    palm["no_ao"] = True
    for k, dx in enumerate((-0.033, -0.011, 0.011, 0.033)):   # quatro dedos e o polegar
        ln = 0.085 if k in (1, 2) else 0.07
        b0 = h + fwd * 0.06 + side * dx
        f = tube("finger", [b0, b0 + fwd * ln * 0.6 + side * dx * 0.2 + up * 0.01, b0 + fwd * ln + side * dx * 0.35 + up * 0.028],
                 [0.015, 0.013, 0.008], seg=6)
        paint(f, skin)
        flat.append(f)
    th = tube("thumb", [h + side * 0.042 + fwd * 0.012, h + side * 0.08 + fwd * 0.042 + up * 0.03], [0.015, 0.008], seg=6)
    paint(th, skin)
    flat.append(th)
    return [palm]


def arms():
    out = {}
    for side, s, pose in (("L", -1, POSE_L), ("R", 1, POSE_R)):
        ax, ay, az = RIG.P("arm" + side)
        up = tube("sleeveU", [(ax, ay, az + 0.02), (ax, ay, az - RIG.arm * 0.5), (ax, ay, az - RIG.arm)], [0.062, 0.072, 0.086], seg=12)
        smooth(up)
        paint(up, cloth(PURPLE, PURPLE_D, PURPLE_L))
        region(up, "primary")
        fr, _ = fore_rot(pose, s, LEAN, OUT)
        down = local_dir(fr, (0, 0, -1))
        upw = local_dir(fr, (0, 0, 1))
        e = Vector(RIG.P("fore" + side))
        hand = e + Vector((0, 0, -HAND))
        fore = tube("fore", [e, e + Vector((0, 0, -0.12)), e + Vector((0, 0, -0.2))], [0.074, 0.066, 0.056], seg=10)
        smooth(fore)
        paint(fore, cloth(PURPLE, PURPLE_D, PURPLE_L))
        region(fore, "primary")
        wrist = tube("wrist", [e + Vector((0, 0, -0.18)), e + Vector((0, 0, -0.29))], [0.036, 0.034], seg=8)
        paint(wrist, skin)
        wrist["no_ao"] = True
        # manga em sino presa ao antebraço, com a boca dourada; o eixo mistura antebraço e chão, então ela gira com o braço
        raised = side == "R"   # no braço erguido a boca olhava para a câmera e mostrava o forro preto
        ln, r1, sag = (0.12, 0.095, 0.6) if raised else (0.17, 0.155, 0.55)
        ax_ = (Vector((0, 0, -1)) + down * (0.9 if raised else 0.35)).normalized()
        st0 = e + Vector((0, 0, 0.01))
        drape = bell_sleeve("drape", st0, down, ln, 0.088, r1, sag=sag, folds=5, famp=0.06, axis=ax_, seg=12, rows=5)
        paint(drape, lambda co, n: mix(PURPLE_D, PURPLE, 0.55 + 0.45 * ss(-0.6, 0.5, n.z)))   # forro roxo, nunca preto
        region(drape, "primary")
        drape["no_ao"] = True
        # anel dourado de borda nítida na boca do sino (peça própria, sem degradê para o roxo)
        mo, tg = sleeve_mouth(st0, down, ln, sag, ax_)
        u = tg.cross(Vector((1, 0, 0)) if abs(tg.x) < 0.9 else Vector((0, 1, 0))).normalized()
        v = tg.cross(u).normalized()
        rp = [mo + (u * math.cos(2 * math.pi * k / 12) + v * math.sin(2 * math.pi * k / 12)) * r1 * 1.04 for k in range(13)]
        cuff = tube("cuff", rp, [0.013] * 13, seg=4, cap=False)
        paint(cuff, gold)
        region(cuff, "accent")
        cuff["no_ao"] = True
        parts = [fore, wrist, drape, cuff]
        if side == "R":
            parts += open_hand(hand, upw, FLAT["foreR"])
        else:
            parts.append(fist("fist", tuple(hand + Vector((0, -0.005, 0.0)))))
        out["arm" + side] = [up]
        out["fore" + side] = parts
    return out


if __name__ == "__main__":
    reset()
    a = arms()
    a["foreR@flat"] = FLAT["foreR"]
    parts = merge(place_head(RIG, head(), lift=HEAD_LIFT, scale=HEAD_SCALE), torso(), skirt(), book(), a)
    soften(parts)   # tubos e bolas saíam com faces chapadas (check_finish)
    finish("aurelius", RIG, parts, ARGS, body_center=(0, 0, 0.95), body_dist=4.6, head_dist=1.5, form="robed")
