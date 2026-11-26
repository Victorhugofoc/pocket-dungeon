# Seraph (herói, paladino de placa branca e dourada) modelado no Blender (M2-11). Brief: docs/briefs/seraph.md.
# Rodar: ver tools/blender/README.md. Bípede no molde do shieldbearer.py (elmo fechado com fenda por booleano; escudo e espada
# modelados na orientação do mundo a partir da mão e levados ao antebraço por to_fore). Capa no osso "cape", tabardo no "skirt".
# O escudo também sai sozinho em models/seraph_shield.json (centro na origem, face para a frente), para o arremesso do M5-09.
# Regiões de cor (skins, M13-06): primary = azul (capa, tabardo, lenço), secondary = placa branca, accent = dourado.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from humanoid import ROOT, Rig, finish, merge, place_head, xform3  # noqa: E402
from robed import fore_rot  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
# as mesmas medidas e pose da receita (cast-heroes.ts); tests/models.test.ts confere as medidas
RIG = Rig(hipY=0.95, headY=0.6, shoulderY=0.48, shoulderX=0.31, arm=0.34, hipX=0.14, thigh=0.44, bulk=1.1)
HAND = 0.33
POSE_R, POSE_L, LEAN, OUT = (0.2, -1.8), (-0.45, -1.15), 0.04, 0.16   # espada erguida; escudo à frente
HEAD_LIFT = 0.2

WHITE, WHITE_M, WHITE_D = hexc(0xf1f4f9), hexc(0xc2c9d6), hexc(0x8790a4)
GOLD, GOLD_D, GOLD_L = hexc(0xe8b93a), hexc(0xa87a1e), hexc(0xffe08a)
BLUE, BLUE_D, BLUE_L = hexc(0x4f8fdc), hexc(0x24488a), hexc(0x7ab0ec)
SKY = hexc(0xa8d0f8)
DARK = hexc(0x1a2030)
STEEL, STEEL_D = hexc(0x7a8498), hexc(0x3a4152)   # sabatões
BLADE, BLADE_D = hexc(0xf4f8ff), hexc(0xaab6c8)
LEATHER, LEATHER_D = hexc(0x6b4a2e), hexc(0x352214)


def plate(co, n):
    """placa branca polida: sombra azulada embaixo, branco no alto, brilho na frente alta"""
    t = 0.15 + 0.85 * ss(-0.7, 0.75, n.z)
    spec = ss(0.6, 0.98, n.z * 0.6 - n.y * 0.55)
    return mix(mix(WHITE_D, WHITE_M, t), WHITE, 0.35 + 0.65 * max(spec, t * 0.6))


def gold(co, n):
    t = 0.25 + 0.75 * ss(-0.6, 0.8, n.z)
    return mix(mix(GOLD_D, GOLD, t), GOLD_L, 0.6 * ss(0.65, 1.0, n.z * 0.6 - n.y * 0.5))


def cloth(base, dark, light=None):
    def f(co, n):
        c = mix(dark, base, 0.35 + 0.65 * ss(-0.7, 0.5, n.z))
        return mix(c, light, 0.35 * ss(0.5, 1.0, n.z)) if light else c
    return f


def on_surface(obj, origin, direction, off):
    """ponto da superfície de obj visto de origin na direção dada (ray_cast no espaço do objeto), afastado off pela normal"""
    d = Vector(direction).normalized()
    ok, hit, nrm, _ = obj.ray_cast(Vector(origin) - d * 2.0, d)
    if not ok:
        return None, None
    return hit + nrm * off, nrm


def girdle(name, obj, z, center=(0, 0), r=0.02, n=24, off=0.004, squash=(1.0, 1.0), seg=5):
    """anel (debrum, cinto) pousado na superfície de obj na altura z, por raios horizontais vindos de fora"""
    pts = []
    for k in range(n + 1):
        a = math.pi + 2 * math.pi * k / n          # começa e termina atrás: a emenda do anel não aparece de frente
        d = Vector((-math.sin(a), math.cos(a), 0))
        p, _ = on_surface(obj, (center[0], center[1], z), d, off)
        if p is None:
            p, _ = on_surface(obj, (center[0], center[1], z), d, off)
        pts.append(p)
    pts = [p for p in pts if p is not None]
    return tube(name, pts, [r] * len(pts), seg=seg, cap=False, squash=squash)


# ------------------------------------------------------------------ cabeça: elmo fechado em bico, fenda, crista e asas douradas
def decal(name, obj, x0, x1, zc, hh, off=0.003, nx=14):
    """faixa escura pousada na frente da casca por raios (+y), com as pontas arredondadas (altura que afina nas pontas);
    vai sem contorno: o corte por booleano deixava quinas onde o contorno vazava em rachaduras"""
    bm = bmesh.new()
    rows = []
    for i in range(nx + 1):
        u = i / nx
        x = x0 + (x1 - x0) * u
        t = 2 * u - 1
        h = hh * math.sqrt(max(0.0, 1 - t ** 6))
        col = []
        for z in (zc - h, zc + h):
            p, _ = on_surface(obj, (x, 0, z), (0, 1, 0), off)
            col.append(bm.verts.new(p if p is not None else (x, -0.2, z)))
        rows.append(col)
    for i in range(nx):
        bm.faces.new((rows[i][0], rows[i + 1][0], rows[i + 1][1], rows[i][1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_mesh(name, bm)
    for poly in o.data.polygons:
        poly.use_smooth = True
    return o


def head():
    parts = {"solid": [], "flat": [], "lit": []}
    # elmo de laterais retas (tambor), topo pouco abobadado e frente achatada com bico: mais alto que largo, não uma bola
    h = meta("helm", [
        CAP((0, 0.01, -0.11), (0, 0.01, 0.05), 0.163, stiff=4.0),       # tambor, laterais retas
        EL((0, 0.01, 0.075), (0.163, 0.172, 0.115), stiff=4.0),         # topo
        EL((0, -0.065, -0.03), (0.145, 0.115, 0.15), stiff=4.0),        # frente da viseira, achatada
        EL((0, 0.01, -0.17), (0.172, 0.178, 0.045), stiff=3.0),         # base larga sobre o gorjal
    ], res=0.006)
    smooth(h, iters=1, factor=0.3, target=1420)
    paint(h, plate)
    region(h, "secondary")
    h["no_ao"] = True
    parts["solid"].append(h)
    # quilha da viseira: aresta reta e fina das fendas até a borda, sem contorno (o bico em metaball virava um nariz mole)
    ridge = []
    for k in range(5):                                # para acima do debrum dourado (topo em z -0.132)
        q, _ = on_surface(h, (0, 0, 0.065 - 0.04 * k), (0, 1, 0), 0.006)
        if q is not None:
            ridge.append(q)
    rd = tube("ridge", ridge, [0.012] * len(ridge), seg=4, squash=(1.0, 1.4), ref=(0, 1, 0))
    paint(rd, plate)
    region(rd, "secondary")
    parts["flat"].append(rd)
    # fenda dos olhos: faixa escura pousada na viseira, uma de cada lado do bico, sem contorno
    for sd in (-1, 1):
        slit = decal("slit", h, sd * 0.03, sd * 0.135, 0.04, 0.017)
        paint(slit, lambda co, n: DARK)
        parts["flat"].append(slit)
    # debrum dourado na base do elmo (emenda atrás) e crista dourada da testa até a nuca, sem contorno (com ele, a borda da
    # crista virava um segundo risco preto ao lado)
    base = girdle("helmrim", h, -0.15, r=0.018, n=28, off=0.006, seg=6)
    paint(base, gold)
    region(base, "accent")
    base["embed"] = True
    parts["solid"].append(base)
    crest_pts = []
    for k in range(14):
        a = 0.5 + (math.pi * 0.8) * k / 13            # da testa (acima da fenda) por cima até a nuca
        d = Vector((0, math.cos(a), -math.sin(a)))
        p, _ = on_surface(h, (0, 0, 0.0), d, 0.004)
        if p is not None:
            crest_pts.append(p)
    crest = tube("crest", crest_pts, [0.006 + 0.026 * max(0.0, math.sin(math.pi * i / (len(crest_pts) - 1))) ** 0.6 for i in range(len(crest_pts))],
                 seg=6, squash=(0.6, 1.0))   # afina nas pontas
    paint(crest, gold)
    region(crest, "accent")
    parts["flat"].append(crest)
    # respiros: fendas curtas escuras na frente baixa da viseira, dos dois lados do bico (sem contorno)
    for r in range(2):
        for k in range(2):
            for sd in (-1, 1):
                x = sd * (0.055 + 0.032 * k)
                p, nrm = on_surface(h, (x, 0, -0.04 - 0.035 * r), (0, 1, 0), 0.002)
                if p is None:
                    continue
                hole = ball("vent", p, (0.007, 0.004, 0.014), seg=(6, 3))
                paint(hole, lambda co, n: DARK)
                parts["flat"].append(hole)
    # asas do elmo: três penas douradas largas de cada lado, em leque, saindo da têmpora para trás e para cima; o lado chato
    # fica para fora, então de lado lê-se a asa inteira e de frente, a borda
    for sd in (-1, 1):
        root = Vector((sd * 0.165, 0.05, 0.04))
        for k, (ln, el) in enumerate(((0.46, 1.0), (0.38, 0.62), (0.29, 0.28))):
            d = Vector((sd * 0.42, 0.75, el)).normalized()
            pts, radii = [], []
            for i in range(6):
                u = i / 5
                pts.append(root + d * ln * u + Vector((0, 0.04, 0.05)) * ln * u * u * 2)
                radii.append((0.035 + 0.065 * math.sin(math.pi * min(1.0, u * 1.25) * 0.85)) * (1 - u ** 3) + 0.004)
            f = tube("wing", pts, radii, seg=8, squash=(1.0, 0.2), ref=(sd, 0, 0))
            paint(f, lambda co, n: mix(gold(co, n), GOLD_L, 0.3 * ss(0.2, 0.4, abs(co.x))))
            region(f, "accent")
            f["no_ao"] = True
            parts["solid"].append(f)
        boss = sball("wingboss", root + Vector((sd * 0.01, 0.0, 0.0)), (0.035, 0.045, 0.045), seg=(8, 6))
        paint(boss, gold)
        region(boss, "accent")
        boss["embed"] = True
        parts["solid"].append(boss)
    return parts


# ------------------------------------------------------------------ tronco: couraça abaulada, debruns dourados, emblema e lenço azul
def torso():
    z0 = RIG.P("torso")[2]
    sx = RIG.shoulderX
    t = meta("torso", [
        EL((0, -0.01, z0 + 0.33), (0.25, 0.17, 0.18)),               # peito largo e abaulado
        EL((0, -0.03, z0 + 0.16), (0.21, 0.145, 0.13)),              # barriga
        EL((0, 0.0, z0 + 0.04), (0.19, 0.13, 0.08)),                 # cintura
        EL((-sx + 0.08, 0.0, z0 + 0.45), (0.085, 0.085, 0.06)),      # ombros
        EL((sx - 0.08, 0.0, z0 + 0.45), (0.085, 0.085, 0.06)),
        CAP((0, -0.15, z0 + 0.42), (0, -0.16, z0 + 0.16), 0.018, stiff=1.5),  # quilha do peitoral, suave
    ], res=0.01)
    smooth(t, iters=2, target=200)
    paint(t, plate)
    region(t, "secondary")
    out = [t]
    # debrum dourado embaixo da couraça e cinto dourado com fivela
    rim = girdle("cuirassrim", t, z0 + 0.1, r=0.016, n=16, off=0.004, squash=(1.0, 1.4), seg=4)
    belt = tube("belt", [(0, 0.0, z0 + 0.05), (0, 0.0, z0 - 0.02)], [0.205, 0.205], seg=16, squash=(1.0, 0.72), cap=False)
    buckle = sball("buckle", (0, -0.152, z0 + 0.015), (0.05, 0.018, 0.042), seg=(8, 5))
    for o in (rim, belt, buckle):
        paint(o, gold)
        region(o, "accent")
        o["embed"] = True
    out += [rim, belt, buckle]
    # emblema: sol dourado no meio do peito, com quatro pontas
    p, nrm = on_surface(t, (0, 0, z0 + 0.34), (0, 1, 0), 0.006)
    if p is not None:
        sun = sball("sun", p, (0.045, 0.016, 0.045), seg=(10, 5))
        paint(sun, gold)
        out.append(sun)
        for k in range(4):
            a = math.pi / 4 + k * math.pi / 2
            ray = cone("ray", p + Vector((math.cos(a) * 0.03, 0.002, math.sin(a) * 0.03)),
                       p + Vector((math.cos(a) * 0.085, -0.004, math.sin(a) * 0.085)), 0.018, seg=6)
            paint(ray, gold)
            out.append(ray)
        for o in out[-5:]:
            region(o, "accent")
            o["embed"] = True
    # frisos dourados nas bordas da placa do peito, sem contorno
    strips = []
    for sd in (-1, 1):
        pts = []
        for k in range(6):
            u = k / 5
            q, _ = on_surface(t, (sd * (0.15 - 0.03 * u), 0, z0 + 0.43 - 0.3 * u), (0, 1, 0), 0.004)
            if q is not None:
                pts.append(q)
        st = tube("chestgold", pts, [0.015] * len(pts), seg=5, squash=(1.0, 0.5), ref=(0, 1, 0))
        paint(st, gold)
        region(st, "accent")
        strips.append(st)
    # gorjal branco e lenço azul: gola em volta do pescoço e duas pontas caindo sobre o peito
    gorget = tube("gorget", [(0, 0.0, z0 + 0.53), (0, 0.0, z0 + 0.6)], [0.17, 0.12], seg=14, cap=False)
    paint(gorget, plate)
    region(gorget, "secondary")
    scarf = tube("scarf", [(0, 0.0, z0 + 0.5), (0, 0.0, z0 + 0.545), (0, 0.0, z0 + 0.6)], [0.2, 0.19, 0.145], seg=14, squash=(1.0, 0.9), cap=False)
    smooth(scarf, iters=1)
    paint(scarf, cloth(BLUE, BLUE_D, BLUE_L))
    region(scarf, "primary")
    out += [gorget, scarf]
    for sd, ln in ((-1, 0.2), (1, 0.15)):
        pts = []
        for k in range(5):
            u = k / 4
            q, _ = on_surface(t, (sd * (0.03 + 0.03 * u), 0, z0 + 0.5 - ln * u), (0, 1, 0), 0.016)
            if q is not None:
                pts.append(q)
        tail = tube("scarftail", pts, [0.05 - 0.015 * k / 4 for k in range(len(pts))], seg=5, squash=(1.0, 0.3), ref=(0, 1, 0))
        smooth(tail, iters=1)
        paint(tail, cloth(BLUE, BLUE_D, BLUE_L))
        region(tail, "primary")
        tail["embed"] = True
        out.append(tail)
    return {"torso": out, "torso@flat": strips}


def hips():
    z = RIG.P("hips")[2]
    p = meta("hips", [EL((0, 0.0, z + 0.02), (0.2, 0.14, 0.11))], res=0.012)
    smooth(p, iters=1, target=120)
    paint(p, lambda co, n: mix(WHITE_D, WHITE_M, 0.5 + 0.5 * ss(-0.6, 0.6, n.z)))
    region(p, "secondary")
    out = [p]
    # escarcelas: duas faixas de placa abaixo do cinto, cada uma com o debrum de baixo dourado
    for k, (zz, r) in enumerate(((z + 0.06, 0.218), (z + 0.0, 0.232))):
        f = tube("fauld", [(0, 0.0, zz + 0.035), (0, 0.0, zz - 0.035)], [r, r + 0.014], seg=12, squash=(1.0, 0.74), cap=False)
        paint(f, plate)
        region(f, "secondary")
        e = tube("fauldrim", [(0, 0.0, zz - 0.03), (0, 0.0, zz - 0.045)], [r + 0.016, r + 0.016], seg=12, squash=(1.0, 0.74), cap=False)
        paint(e, gold)
        region(e, "accent")
        e["embed"] = True
        out += [f, e]
    return {"hips": out}


def panel(name, ztop, zbot, wtop, wbot, y0, curve, flare, nu=6, nv=3, thick=0.014):
    """pano reto pendurado (tabardo): largura wtop -> wbot, curvo em volta do quadril (y0 na frente, curve nas bordas) e
    caindo para fora (flare); y0 negativo = frente"""
    bm = bmesh.new()
    sgn = -1 if y0 < 0 else 1
    grid = []
    for i in range(nv + 1):
        v = i / nv
        z = ztop + (zbot - ztop) * v
        w = wtop + (wbot - wtop) * v
        row = []
        for j in range(nu + 1):
            u = -1 + 2 * j / nu
            y = y0 + sgn * (flare * v * v - curve * (1 - u * u) * (1 - 0.6 * v)) + 0.008 * math.sin(u * 7.0) * v
            row.append(bm.verts.new((u * w, y, z)))
        grid.append(row)
    for i in range(nv):
        for j in range(nu):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_mesh(name, bm)
    sol = o.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = thick
    sol.offset = 0
    apply_mods(o)
    for p in o.data.polygons:
        p.use_smooth = True
    hem = tube(name + "hem", [(u * wbot, y0 + sgn * (flare - 0.0 * (1 - u * u)) + 0.008 * math.sin(u * 7.0), zbot + 0.012)
                              for u in [-1 + 2 * k / 6 for k in range(7)]], [0.019] * 7, seg=5)
    return o, hem


def tabard():
    z = RIG.P("hips")[2]
    out = []
    for nm, y0, wt, wb, nu in (("tabardF", -0.2, 0.13, 0.16, 5), ("tabardB", 0.19, 0.14, 0.17, 3)):
        o, hem = panel(nm, z + 0.04, z - 0.53, wt, wb, y0, 0.03, 0.06, nu=nu)
        paint(o, cloth(BLUE_L, BLUE, hexc(0xa8ccf4)))   # mais claro que a capa: na sombra do corpo o azul escuro sumia
        region(o, "primary")
        paint(hem, gold)
        region(hem, "accent")
        hem["embed"] = True
        out += [o, hem]
    return {"skirt": out}


# ------------------------------------------------------------------ capa: pano azul em dois tons, dos ombros à panturrilha
def cape():
    ztop, zbot = RIG.P("armL")[2] + 0.04, 0.3
    nu, nv = 12, 5
    bm = bmesh.new()
    grid = []
    for i in range(nv + 1):
        v = i / nv
        z = ztop + (zbot - ztop) * v
        rx = 0.29 + 0.3 * v ** 0.8
        ry = 0.17 + 0.25 * v ** 0.9
        span = 1.25 + 0.3 * v
        row = []
        for j in range(nu + 1):
            u = -1 + 2 * j / nu
            a = u * span
            fold = 0.16 * math.sin(u * 3.0 * math.pi) * ss(0.05, 0.45, v) * (1 - 0.3 * abs(u))
            r = 1.0 + fold
            x = rx * math.sin(a) * r
            y = 0.03 + ry * math.cos(a) * r + 0.12 * v * v
            row.append(bm.verts.new((x, y, z + 0.04 * math.sin(u * 7.0 + 0.8) * v ** 3)))   # barra irregular
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
        radial = Vector((co.x, co.y - 0.03, 0))
        out = radial.length < 1e-4 or n.dot(radial.normalized()) > 0
        if out:
            base = mix(mix(BLUE, BLUE_L, 0.35 + 0.65 * ss(-0.6, 0.5, n.z)), SKY, 0.6 * ss(-0.2, 0.7, n.z - 0.3 * n.y))
            # vale das pregas em azul escuro (mesma fase da dobra da malha): sem isso a capa lia chapada de costas
            v = (ztop - co.z) / (ztop - zbot)
            u = math.atan2(co.x, co.y - 0.03) / (1.25 + 0.3 * max(0.0, min(1.0, v)))
            valley = max(0.0, -math.sin(u * 3.0 * math.pi)) * ss(0.05, 0.45, v)
            return mix(base, BLUE_D, 0.85 * valley)
        return mix(BLUE, BLUE_L, 0.4)   # dentro mais claro que antes (azul-celeste do sprite)
    paint(c, tint)
    region(c, "primary")
    c["no_ao"] = True
    # gola enrolada no alto da capa e dois broches dourados na frente dos ombros
    roll_pts = []
    for k in range(13):
        u = -1 + 2 * k / 12
        a = u * 1.25
        roll_pts.append((0.3 * math.sin(a), 0.03 + 0.18 * math.cos(a), ztop + 0.01))
    roll = tube("caperoll", roll_pts, [0.03] * 13, seg=5)
    paint(roll, cloth(BLUE, BLUE_D, BLUE_L))
    region(roll, "primary")
    roll["embed"] = True
    out = [c, roll]
    for sd in (-1, 1):
        a = sd * 1.25
        br = sball("clasp", (0.3 * math.sin(a), 0.03 + 0.18 * math.cos(a) - 0.02, ztop + 0.0), (0.04, 0.025, 0.04), seg=(8, 6))
        paint(br, gold)
        region(br, "accent")
        br["embed"] = True
        out.append(br)
    return {"cape": out}


# ------------------------------------------------------------------ armas, na orientação do mundo com a origem na mão
def to_fore(objs, side, pose):
    """peças modeladas no mundo com a origem na mão vão para o repouso do osso do antebraço (como hang em kit.ts)"""
    fr, _ = fore_rot(pose, side, LEAN, OUT)
    f3 = RIG.p3["fore" + ("L" if side < 0 else "R")]
    m3 = Matrix.Translation((f3[0], f3[1] - HAND, f3[2])) @ fr.transposed().to_4x4()
    xform3(objs, m3)
    return objs


def sword():
    """espada ao longo de +z (Blender), punho na origem: pomo, punho de couro, guarda dourada, lâmina em losango com sulco"""
    grip = tube("grip", [(0, 0, -0.1), (0, 0, 0.1)], [0.024, 0.024], seg=8)
    paint(grip, cloth(LEATHER, LEATHER_D))
    pommel = sball("pommel", (0, 0, -0.13), (0.038, 0.038, 0.034), seg=(8, 5))
    paint(pommel, gold)
    guard = tube("guard", [(-0.16, 0, 0.14), (-0.08, 0, 0.12), (0.0, 0, 0.115), (0.08, 0, 0.12), (0.16, 0, 0.14)],
                 [0.018, 0.024, 0.03, 0.024, 0.018], seg=6, squash=(1.0, 0.8))
    paint(guard, gold)
    ends = [sball("guardend", (sd * 0.165, 0, 0.142), (0.025, 0.025, 0.025), seg=(6, 4)) for sd in (-1, 1)]
    for o in ends:
        paint(o, gold)
    # lâmina: seção em losango (tubo de 4 gomos, achatado), larga no forte e afinando até a ponta
    zs = [0.13, 0.4, 0.8, 1.06, 1.2, 1.3]
    rs = [0.05, 0.047, 0.043, 0.038, 0.02, 0.002]
    blade = tube("blade", [(0, 0, z) for z in zs], rs, seg=4, squash=(1.0, 0.22), ref=(0, 1, 0), twist=0.0)
    flat_shade(blade)
    paint(blade, lambda co, n: mix(BLADE_D, BLADE, 0.45 + 0.55 * ss(-0.8, 0.8, n.x * 0.5 - n.y * 0.6 + n.z * 0.3)))
    # sulco: risco escuro no meio das duas faces, do forte até 3/4 da lâmina
    fuller = []
    for sd in (-1, 1):
        f = tube("fuller", [(0, sd * 0.0095, 0.17), (0, sd * 0.0085, 0.95)], [0.008, 0.006], seg=5, squash=(1.0, 0.3), ref=(0, 1, 0))
        paint(f, lambda co, n: hexc(0x8794a8))
        f["no_ao"] = True
        fuller.append(f)
    for o in (pommel, guard, *ends):
        region(o, "accent")
    solid = [grip, pommel, guard, *ends, blade]
    for o in solid:
        o["no_ao"] = True
    return solid, fuller


SH_W, SH_TOP, SH_TIP, SH_BULGE = 0.31, 0.42, -0.5, 0.09
CREAM, CREAM_D = hexc(0xf6eed8), hexc(0xb8ae94)


def heater_outline(n=28):
    """contorno do escudo de cavaleiro no plano (x, z), fechado, no sentido horário visto de frente: topo levemente curvo,
    laterais retas até o meio e curva contínua até a ponta (sem quina na ponta, que rasgava a malha)"""
    pts = []
    nt = n // 4
    for k in range(nt):                                  # topo, da esquerda para a direita, arqueado para cima no meio
        u = -1 + 2 * k / nt
        pts.append((u * SH_W, SH_TOP + 0.03 * (1 - u * u)))
    ns = (n - nt) // 2
    for k in range(ns):                                  # lado direito até a ponta
        t = k / ns
        if t < 0.3:
            pts.append((SH_W, SH_TOP - (SH_TOP - 0.05) * t / 0.3))
        else:
            w = (t - 0.3) / 0.7                          # arco até a ponta
            pts.append((SH_W * math.cos(w * math.pi / 2) ** 0.85, 0.05 + (SH_TIP - 0.05) * math.sin(w * math.pi / 2)))
    pts.append((0.0, SH_TIP))
    for x, z in reversed(pts[nt + 1:nt + ns]):           # lado esquerdo, espelho do direito
        pts.append((-x, z))
    return pts


def shield_y(x, z):
    """frente do escudo (-y): curvo só em volta do eixo vertical, então a cruz sai reta"""
    return -SH_BULGE * (1 - (x / SH_W) ** 2)


def shield():
    """escudo abaulado, face para a frente (-y), centro na origem: campo creme, borda larga e cruz retas douradas, bossa lisa.
    A face é feita em anéis concêntricos do contorno (sem fileira degenerada na ponta); volta (com contorno: só a face; sem contorno: borda, cruz e bossa)"""
    out2 = heater_outline()
    rings = (0.0, 0.5, 1.0, "wide")   # o último é o anel que entra sob a borda
    bm = bmesh.new()
    cz = -0.02
    grid = []
    # o anel de fora da face vai até a beira de fora da borda dourada: o contorno preto do escudo sai da face, e a borda
    # fica sem contorno (o contorno da borda vazava um risco preto na face vista de lado)
    n = len(out2)
    def nrm(ax, az, bx, bz):
        l = math.hypot(bx - ax, bz - az)
        return (bz - az) / l, -(bx - ax) / l
    def grow(dist):
      out = []
      for i, (x, z) in enumerate(out2):
        (xa, za), (xb, zb) = out2[i - 1], out2[(i + 1) % n]
        n1, n2 = nrm(xa, za, x, z), nrm(x, z, xb, zb)
        mx, mz = n1[0] + n2[0], n1[1] + n2[1]
        ml = math.hypot(mx, mz)
        mx, mz = mx / ml, mz / ml
        if mx * x + mz * (z - cz) < 0:
            mx, mz = -mx, -mz
        d = dist / max(0.5, abs(mx * n2[0] + mz * n2[1]))   # meia-esquadria igual à da borda: a quina vai junto
        out.append((x + mx * d, z + mz * d))
      return out
    wide = grow(0.036)
    edge = grow(0.015)   # fora deste contorno a face fica dourada: o que espiar por baixo da borda é da cor dela

    def inside(x, z):
        hit = False
        for i in range(n):
            (xa, za), (xb, zb) = edge[i - 1], edge[i]
            if (za > z) != (zb > z) and x < xa + (z - za) * (xb - xa) / (zb - za):
                hit = not hit
        return hit
    for sc in rings:
        row = []
        for x, z in (out2[:1] if sc == 0 else wide if sc == "wide" else out2):
            px, pz = (x, z) if sc == "wide" else (x * sc, cz + (z - cz) * sc)
            row.append(bm.verts.new((px, shield_y(min(abs(px), SH_W), pz), pz)))
        grid.append(row)
    c = grid[0][0]
    for j in range(n):
        bm.faces.new((c, grid[1][j], grid[1][(j + 1) % n]))
    for i in range(1, len(rings) - 1):
        for j in range(n):
            k = (j + 1) % n
            bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][k], grid[i][k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    face = new_mesh("shield", bm)
    sol = face.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.04
    sol.offset = 0
    apply_mods(face)
    for poly in face.data.polygons:
        poly.use_smooth = True
    paint(face, lambda co, n: gold(co, n) if not inside(co.x, co.z)
          else mix(CREAM_D, CREAM, 0.45 + 0.55 * ss(-0.4, 0.9, -n.y * 0.7 + n.z * 0.5)) if n.y < -0.3
          else mix(hexc(0x34405a), hexc(0x56688a), 0.5))   # verso aço-azulado (o marrom destoava da paleta)
    region(face, "secondary")
    # borda dourada larga, tubo fechado seguindo o contorno (pontos a mais nas curvas)
    rim_pts = [Vector((x, shield_y(x, z) - 0.006, z)) for x, z in out2]
    # anel fechado (loop_tube): o tubo aberto com o 1º ponto repetido deixava emenda e ponta oca na quina de cima à
    # esquerda; ref fixo na normal do escudo para não torcer nas laterais em pé
    rim = loop_tube("rim", rim_pts, 0.044, ref=(0, 1, 0), seg=6, squash=(1.0, 1.1))   # funda: cobre a beira da face
    edges = {}
    for poly in rim.data.polygons:
        for ek in poly.edge_keys:
            edges[ek] = edges.get(ek, 0) + 1
    assert all(c == 2 for c in edges.values()), "borda do escudo com aresta aberta"   # garante o anel sem furo
    paint(rim, gold)
    # cruz dourada reta e de largura constante, deitada na face; as quatro pontas terminam na linha do meio da borda,
    # escondidas sob ela por igual
    # (as pontas descem até a face para a tampa do tubo não aparecer na frente da borda)
    def sink(k, last):
        return -0.012 if k in (0, last) else -0.024
    zs = (SH_TOP + 0.03, SH_TOP + 0.03 - 0.044, SH_TIP + 0.085, SH_TIP + 0.03)   # cheia até a beira de dentro da borda
    bar_v = tube("crossv", [Vector((0, shield_y(0, z) + sink(k, 3), z)) for k, z in enumerate(zs)],
                 [0.036] * 4, seg=6, squash=(1.0, 0.4), ref=(0, 1, 0))
    xs = [-SH_W, -SH_W + 0.044, -0.15, 0.0, 0.15, SH_W - 0.044, SH_W]
    bar_h = tube("crossh", [Vector((x, shield_y(x, 0.14) + sink(k, 6), 0.14)) for k, x in enumerate(xs)], [0.036] * 7,
                 seg=6, squash=(1.0, 0.4), ref=(0, 1, 0))
    boss = sball("boss", (0, shield_y(0, 0.14) - 0.04, 0.14), (0.062, 0.04, 0.062), seg=(8, 6))
    for o in (rim, bar_v, bar_h, boss):
        paint(o, gold)
        region(o, "accent")
    # a cruz e a bossa vão sem contorno (@flat): com ele, a casca vazava riscos pretos ao longo da cruz
    for o in (face, rim, bar_v, bar_h, boss):
        o["no_ao"] = True
    return [face], [rim, bar_v, bar_h, boss]


def export_shield(objs, flat):
    """o escudo sozinho (cópia), centro na origem, para o arremesso do ataque básico (M5-09)"""
    def dup(lst):
        out = []
        for o in lst:
            c = o.copy()
            c.data = o.data.copy()
            link(c)
            out.append(c)
        return out
    a, b = dup(objs), dup(flat)
    export_parts(os.path.join(ROOT, "src", "game", "chars", "models", "seraph_shield.json"), {"hips": a, "hips@flat": b}, {"hips": (0, 0, 0)})
    for c in a + b:
        bpy.data.objects.remove(c)


# ------------------------------------------------------------------ braços e pernas: placa branca, ombreiras e joelheiras douradas
def pauldron(name, c, r, sd):
    """ombreira de duas lâminas: a de cima branca com debrum dourado (sem contorno, que riscava a dobra junto ao gorjal), a de
    baixo, menor, dourada inteira (no sprite o dourado domina as ombreiras); volta (sólidas, sem contorno)"""
    solid, flat = [], []
    for k in range(2):
        cc = Vector(c) + Vector((sd * 0.035, 0, -0.065)) * k
        rr = r * (1 - 0.14 * k)
        rot = (0, sd * (0.5 + 0.35 * k), 0)
        o = sball(f"{name}{k}", cc, (rr, rr * 1.08, rr * 0.5), rot=rot, seg=(10, 6))
        paint(o, plate if k == 0 else gold)
        region(o, "secondary" if k == 0 else "accent")
        solid.append(o)
        if k == 0:
            m = Euler(rot).to_matrix()
            ring = [cc + m @ Vector((rr * math.cos(2 * math.pi * j / 12), rr * 1.08 * math.sin(2 * math.pi * j / 12), -0.01)) for j in range(13)]
            rim = tube(f"{name}rim{k}", ring, [0.022] * 13, seg=4, cap=False)
            paint(rim, gold)
            region(rim, "accent")
            flat.append(rim)
    return solid, flat


def limbs():
    out = {}
    for side, s, pose in (("L", -1, POSE_L), ("R", 1, POSE_R)):
        ax, ay, az = RIG.P("arm" + side)
        a = meta("arm" + side, [CAP((ax, ay, az - 0.05), (ax, ay, az - RIG.arm + 0.03), 0.078),
                                EL((ax, ay, az - 0.17), (0.085, 0.085, 0.1))], res=0.011)
        smooth(a, iters=1, target=110)
        paint(a, plate)
        region(a, "secondary")
        pad, padf = pauldron("pauldron", (ax + s * 0.04, ay, az + 0.01), 0.172, s)
        fx, fy, fz = RIG.P("fore" + side)
        f = meta("fore" + side, [CAP((fx, fy, fz), (fx, fy, fz - 0.24), 0.064),
                                  EL((fx, fy, fz - 0.13), (0.074, 0.074, 0.1)),                    # braçal
                                  EL((fx, fy, fz - HAND), (0.062, 0.072, 0.064)),                  # manopla fechada
                                  EL((fx + s * 0.03, fy - 0.03, fz - HAND + 0.02), (0.026, 0.026, 0.03))], res=0.01)
        smooth(f, iters=1, target=110)
        paint(f, lambda co, n, fz=fz: mix(WHITE_D, WHITE_M, 0.5 + 0.5 * ss(-0.6, 0.7, n.z)) if co.z < fz - HAND + 0.06 else plate(co, n))
        region(f, "secondary")
        couter = sball("couter", (fx + s * 0.03, fy + 0.035, fz + 0.005), (0.07, 0.058, 0.066), rot=(0, s * 0.4, 0), seg=(8, 4))
        paint(couter, gold)
        region(couter, "accent")
        cuff = tube("cuff", [(fx, fy, fz - HAND + 0.13), (fx, fy, fz - HAND + 0.06)], [0.074, 0.1], seg=12, cap=False)
        paint(cuff, plate)
        region(cuff, "secondary")
        cuffrim = tube("cuffrim", [(fx, fy, fz - HAND + 0.065), (fx, fy, fz - HAND + 0.05)], [0.102, 0.102], seg=12, cap=False)
        paint(cuffrim, gold)
        region(cuffrim, "accent")
        cuffrim["embed"] = True
        fore_parts = [f, couter, cuff, cuffrim]
        flat = []
        if side == "L":
            sh, shf = shield()
            export_shield(sh, shf)
            # o escudo à frente da mão, como na receita antiga: at(0.04, 0.02, 0.1) e giro -0.12 em y, no espaço do three
            xform3(sh + shf, Matrix.Translation((0.04, 0.02, 0.1)) @ Matrix.Rotation(-0.12, 4, "Y"))
            fore_parts += to_fore(sh, -1, POSE_L)
            flat += to_fore(shf, -1, POSE_L)
        else:
            sw, fl = sword()
            # inclinação da espada na mão, como na receita antiga (giro -0.12 em x e -0.22 em z, no espaço do three)
            m = Euler((-0.12, 0, -0.22)).to_matrix().to_4x4()
            xform3(sw + fl, m)
            fore_parts += to_fore(sw, 1, POSE_R)
            flat += to_fore(fl, 1, POSE_R)
        hx, hy, hz = RIG.P("thigh" + side)
        th = meta("thigh" + side, [CAP((hx, hy, hz - 0.02), (hx + s * 0.01, hy, hz - RIG.thigh + 0.04), 0.115),
                                   EL((hx + s * 0.01, hy - 0.01, hz - 0.18), (0.125, 0.125, 0.16))], res=0.012)
        smooth(th, iters=1, target=110)
        paint(th, plate)
        region(th, "secondary")
        kx, ky, kz = RIG.P("shin" + side)
        sh = meta("shin" + side, [CAP((kx, ky, kz - 0.04), (kx, ky, kz - 0.38), 0.088),
                                  EL((kx, ky + 0.01, kz - 0.17), (0.098, 0.104, 0.12)),            # greva
                                  CAP((kx, ky - 0.12, kz - 0.455), (kx, ky - 0.25, kz - 0.465), 0.032),  # ponta do sabatão, afilada
                                  EL((kx, ky - 0.07, kz - 0.445), (0.08, 0.14, 0.045)),            # sabatão
                                  EL((kx, ky, kz - 0.42), (0.08, 0.085, 0.05))], res=0.01)
        smooth(sh, iters=1, target=100)
        paint(sh, lambda co, n, kz=kz: mix(STEEL_D, STEEL, 0.3 + 0.7 * ss(-0.5, 0.8, n.z)) if co.z < kz - 0.39 else plate(co, n))   # sabatão escuro
        region(sh, "secondary")
        knee = sball("knee", (kx, ky - 0.09, kz - 0.005), (0.1, 0.05, 0.094), seg=(10, 6))
        paint(knee, gold)
        region(knee, "accent")
        wing = sball("kneewing", (kx + s * 0.055, ky - 0.045, kz - 0.005), (0.032, 0.058, 0.062), rot=(0, 0, s * 0.5), seg=(6, 4))
        paint(wing, plate)
        region(wing, "secondary")
        out["arm" + side] = [a] + pad
        out["arm" + side + "@flat"] = padf
        out["fore" + side] = fore_parts
        if flat:
            out["fore" + side + "@flat"] = flat
        out["thigh" + side] = [th]
        out["shin" + side] = [sh, knee, wing]
    return out


if __name__ == "__main__":
    reset()
    parts = merge(place_head(RIG, head(), lift=HEAD_LIFT), torso(), hips(), tabard(), cape(), limbs())
    soften(parts)
    print("DIMS", RIG.dims_ts())
    finish("seraph", RIG, parts, ARGS, body_center=(0, -0.1, 1.0), body_dist=4.8, head_dist=1.3, form="biped")
