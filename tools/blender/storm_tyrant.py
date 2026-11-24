# Storm Tyrant (chefe do M10-07: rei de armadura sobre uma nuvem) modelado no Blender. Brief: docs/briefs/storm_tyrant.md.
# Rodar: ver tools/blender/README.md. Grava art/storm_tyrant.blend e src/game/chars/models/storm_tyrant.json.
# Forma "djinn" (build.ts): tronco, cabeça e braços como os bípedes (pivôs de Rig, iguais a b.dims da receita); sem pernas
# nem cauda: a nuvem e a saia do manto ficam no hips (flutuam juntas), a capa no osso cape.
# Blender: z para cima, frente em -y.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from mathutils import Matrix, Vector  # noqa: E402
from humanoid import Rig, finish, merge, place_head  # noqa: E402
from robed import ring_loft  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
RIG = Rig(hipY=0.95, headY=0.6, shoulderY=0.5, shoulderX=0.46, arm=0.34, hipX=0.0, thigh=0.42, bulk=1.3)
HAND = 0.34
HEAD_LIFT, HEAD_SCALE = 0.19, 1.3

ST_L, ST_M, ST_D, ST_K = hexc(0xf6f8fa), hexc(0xb0b6be), hexc(0x5c6068), hexc(0x24262c)
NAVY, NAVY_D, NAVY_L = hexc(0x22305e), hexc(0x10183a), hexc(0x3c4f8e)
GOLD, GOLD_D, GOLD_L = hexc(0xe2b04a), hexc(0x9a6a1a), hexc(0xfff0b0)
GEM, GEM_L = hexc(0x0a9ad8), hexc(0x5fe0ff)
SKIN, SKIN_D, SKIN_L = hexc(0xf4c09a), hexc(0xc08462), hexc(0xffe4cc)
WHITE, WHITE_D = hexc(0xfffaf0), hexc(0xb8b4ac)
LEATHER, LEATHER_D = hexc(0x9a6638), hexc(0x4e3220)
CLOUD_D, CLOUD, CLOUD_L = hexc(0x20262e), hexc(0x434c5a), hexc(0x707c8a)
SWIRL = hexc(0x7a8694)
DARK = hexc(0x0a0a12)


def steel(co, n):
    """aço: cinza médio, sombra funda embaixo, brilho só no alto das placas"""
    t = 0.35 + 0.65 * ss(-0.7, 0.8, n.z)
    spec = ss(0.72, 0.98, n.z * 0.6 - n.y * 0.55)
    base = mix(ST_K, ST_D, ss(-1.0, -0.3, n.z)) if n.z < -0.3 else mix(ST_D, ST_M, t)
    return mix(base, ST_L, spec * 0.8)


def sball(*a, **k):
    o = ball(*a, **k)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def skin(co, n):
    c = mix(SKIN_D, SKIN, 0.45 + 0.55 * ss(-0.6, 0.5, n.z - 0.5 * n.y))
    return mix(c, SKIN_L, 0.3 * ss(0.45, 1.0, n.z - 0.2 * n.y))


def gold(co, n):
    c = mix(GOLD_D, GOLD, 0.35 + 0.65 * ss(-0.6, 0.5, n.z - 0.4 * n.y))
    return mix(c, GOLD_L, 0.5 * ss(0.55, 1.0, n.z - 0.3 * n.y))


def hair(co, n):
    return mix(WHITE_D, WHITE, 0.4 + 0.6 * ss(-0.5, 0.6, n.z - 0.3 * n.y))


def navy(co, n):
    c = mix(NAVY_D, NAVY, 0.3 + 0.7 * ss(-0.7, 0.5, n.z - 0.2 * n.y))
    return mix(c, NAVY_L, 0.4 * ss(0.5, 1.0, n.z))


def crown_col(co, n):
    """prata clara da coroa: quase branca no alto, sem cair no escuro"""
    return mix(ST_M, ST_L, 0.45 + 0.55 * ss(-0.5, 0.8, n.z - 0.3 * n.y))


def gem_at(name, co, size):
    g = sball(name, co, size, seg=(10, 8))
    paint(g, lambda c, n: mix(GEM, GEM_L, ss(0.2, 1.0, n.z - n.y)))
    return g


# ------------------------------------------------------------------ cabeça: velho severo, barba branca cheia, coroa de pontas
def delete_faces(obj, cond):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if cond(f.calc_center_median(), f.normal)], context="FACES")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def shell(obj, push, thick):
    for v in obj.data.vertices:
        v.co += v.normal * push
    m = obj.modifiers.new("thick", "SOLIDIFY")
    m.thickness = thick
    m.offset = 1
    apply_mods(obj)
    for p in obj.data.polygons:
        p.use_smooth = True


def head():
    parts = {"solid": [], "flat": [], "lit": []}
    h = meta("head", [
        EL((0, 0.01, 0.01), (0.1, 0.11, 0.115)),                    # crânio
        EL((0, -0.04, -0.04), (0.088, 0.08, 0.085)),                # rosto
        CAP((-0.07, -0.09, 0.035), (0.07, -0.09, 0.035), 0.026),     # arcada pesada
        CAP((0, -0.1, 0.02), (0, -0.128, -0.03), 0.016),             # nariz reto
        EL((0, -0.126, -0.035), (0.021, 0.017, 0.016)),
        EL((-0.04, -0.1, 0.0), (0.024, 0.02, 0.016), neg=True),     # órbitas
        EL((0.04, -0.1, 0.0), (0.024, 0.02, 0.016), neg=True),
        CAP((0, 0.0, -0.1), (0, 0.02, -0.2), 0.065),                 # pescoço
    ], res=0.006)
    smooth(h, iters=2, factor=0.5, target=900)
    paint(h, skin)
    parts["solid"].append(h)
    for s in (-1, 1):
        ear = sball("ear", (s * 0.1, 0.0, -0.01), (0.022, 0.03, 0.04), seg=(8, 6))
        paint(ear, skin)
        parts["solid"].append(ear)
        # sobrancelha branca grossa, baixa no meio: cara fechada
        brow = tube("brow", [(s * 0.01, -0.122, 0.018), (s * 0.05, -0.12, 0.036), (s * 0.1, -0.094, 0.06), (s * 0.125, -0.07, 0.07)],
                    [0.017, 0.022, 0.016, 0.006], seg=8, squash=(1.0, 0.7), ref=(0, 1, 0))
        paint(brow, lambda co, n: mix(WHITE_D, WHITE, 0.6 + 0.4 * ss(-0.3, 0.6, n.z)))
        brow["no_ao"] = True
        parts["solid"].append(brow)
        sock = sball("socket", (s * 0.04, -0.104, 0.004), (0.021, 0.008, 0.011), rot=(0, s * 0.2, 0), seg=(8, 5))
        paint(sock, lambda co, n: DARK)
        eye = sball("eye", (s * 0.04, -0.111, 0.004), (0.014, 0.006, 0.009), seg=(8, 5))
        paint(eye, lambda co, n: hexc(0xf0f4f6))
        pup = sball("pupil", (s * 0.037, -0.117, 0.006), (0.0075, 0.003, 0.0075), seg=(6, 4))
        paint(pup, lambda co, n: hexc(0x101418))
        parts["flat"] += [sock, eye, pup]
        # cabelo branco dos lados, atrás das orelhas, caindo até a barba
        hs = meta("hairside", [EL((s * 0.1, 0.04, -0.02), (0.045, 0.065, 0.08)), EL((s * 0.095, 0.02, -0.1), (0.05, 0.055, 0.06))], res=0.006)
        smooth(hs, iters=1, target=200)
        paint(hs, hair)
        parts["solid"].append(hs)
    # barba branca cheia: das costeletas ao queixo e descendo larga até o peito, em mechas
    beard = meta("beard", [
        EL((-0.08, -0.04, -0.07), (0.03, 0.05, 0.07)),              # costeletas
        EL((0.08, -0.04, -0.07), (0.03, 0.05, 0.07)),
        EL((0, -0.08, -0.12), (0.1, 0.065, 0.065)),                 # queixo, abaixo da boca
        EL((0, -0.13, -0.2), (0.16, 0.08, 0.1)),                    # larga como o rosto, por cima do peitoral
        EL((0, -0.21, -0.3), (0.13, 0.07, 0.1)),
        EL((-0.055, -0.25, -0.38), (0.06, 0.05, 0.07)),             # pontas em mechas, a do meio mais longa
        EL((0.055, -0.25, -0.38), (0.06, 0.05, 0.07)),
        CAP((0, -0.255, -0.36), (0, -0.27, -0.47), 0.05),
        EL((0, -0.275, -0.5), (0.025, 0.025, 0.035)),              # ponta fechada             # ponta em V descendo pelo peito
    ], res=0.006)
    smooth(beard, iters=1, target=900)
    paint(beard, lambda co, n: mix(hair(co, n), WHITE, 0.3 * ss(0.5, 0.9, math.sin(co.x * 90 + co.z * 14))))
    parts["solid"].append(beard)
    for s in (-1, 1):
        mus = tube("mustache", [(s * 0.004, -0.14, -0.062), (s * 0.04, -0.138, -0.07), (s * 0.075, -0.125, -0.1), (s * 0.09, -0.115, -0.15)],
                   [0.016, 0.022, 0.018, 0.008], seg=8)
        smooth(mus)
        paint(mus, hair)
        parts["solid"].append(mus)
    # coroa: aro de prata alto com pontas, gema ciano na frente e nas pontas maiores
    band = tube("band", [(0.118 * math.cos(a), 0.012 + 0.124 * math.sin(a), 0.085) for a in [k * 2 * math.pi / 24 for k in range(25)]],
                [0.026] * 25, seg=6, squash=(0.45, 1.0), cap=False)
    paint(band, crown_col)
    parts["solid"].append(band)
    rim = tube("bandrim", [(0.124 * math.cos(a), 0.012 + 0.13 * math.sin(a), 0.06) for a in [k * 2 * math.pi / 24 for k in range(25)]],
               [0.01] * 25, seg=6, cap=False)
    paint(rim, crown_col)
    parts["solid"].append(rim)
    for k in range(5):
        a = -math.pi / 2 + (k - 2) * 0.62     # 5 pontas largas pela frente e lados; a do meio mais alta
        hgt = 0.145 - 0.025 * abs(k - 2)
        bx, by = 0.118 * math.cos(a), 0.012 + 0.124 * math.sin(a)
        sp = cone("spike", (bx, by, 0.095), (bx * 1.06, by * 1.06 - 0.004, 0.095 + hgt), 0.042, seg=8)
        paint(sp, crown_col)
        parts["solid"].append(sp)
        if k == 2:
            parts["lit"].append(gem_at("spikegem", (bx * 1.06, by * 1.06 - 0.016, 0.14), (0.02, 0.01, 0.024)))
    for a in (0.3, 1.57, 2.84):   # pontas menores atrás
        bx, by = 0.118 * math.cos(a), 0.012 + 0.124 * math.sin(a)
        sp = cone("spikeb", (bx, by, 0.095), (bx * 1.04, by * 1.04, 0.165), 0.034, seg=8)
        paint(sp, crown_col)
        parts["solid"].append(sp)
    seat = sball("seat", (0, -0.118, 0.085), (0.034, 0.014, 0.034), seg=(10, 8))
    paint(seat, gold)
    parts["solid"].append(seat)
    parts["lit"].append(gem_at("crowngem", (0, -0.13, 0.085), (0.024, 0.012, 0.026)))
    top = meta("hairtop", [EL((0, 0.015, 0.07), (0.105, 0.115, 0.06)),   # cabelo branco dentro da coroa
                           EL((0, 0.05, -0.02), (0.11, 0.09, 0.11)),     # e cobrindo a nuca até a gola
                           EL((0, 0.06, -0.12), (0.1, 0.07, 0.08)),
                           EL((0, 0.08, -0.22), (0.11, 0.06, 0.09))], res=0.006)   # cabelo longo caindo até os ombros
    smooth(top, iters=1, target=420)
    paint(top, hair)
    parts["solid"].append(top)
    return parts


# ------------------------------------------------------------------ tronco: peitoral de aço, gola com gemas, cinto de couro
def torso():
    z0 = RIG.P("torso")[2]
    sx = RIG.shoulderX
    t = meta("torso", [
        EL((0, 0.0, z0 + 0.04), (0.24, 0.18, 0.12)),                # cintura
        EL((0, -0.02, z0 + 0.17), (0.28, 0.21, 0.14)),
        EL((0, -0.01, z0 + 0.36), (0.38, 0.24, 0.21)),              # peito largo
        EL((0, 0.08, z0 + 0.42), (0.28, 0.14, 0.17)),               # costas
        EL((-sx + 0.08, 0.0, z0 + 0.48), (0.13, 0.13, 0.11)),       # ombros
        EL((sx - 0.08, 0.0, z0 + 0.48), (0.13, 0.13, 0.11)),
    ], res=0.01)
    smooth(t, iters=2, target=1400)

    def tint(co, n):
        c = steel(co, n)
        # sulco no meio do peitoral e borda de baixo da placa
        g = 0.55 * (1 - ss(0.0, 0.016, abs(co.z - (z0 + 0.13))))
        return mix(c, ST_K, g)
    paint(t, tint)
    out = [t]
    # peitoral: casca de placa por cima do peito, cortada embaixo (a borda vira a quina com contorno)
    pl = meta("breast", [EL((0, -0.02, z0 + 0.37), (0.36, 0.23, 0.21), stiff=6.0),           # placa só, em barril, frente chata
                         EL((0, -0.08, z0 + 0.36), (0.3, 0.17, 0.19), stiff=6.0)], res=0.007)
    delete_faces(pl, lambda c, n: c.z < z0 + 0.24 or c.y > 0.06 or c.z > z0 + 0.55)
    smooth(pl, target=900)
    shell(pl, 0.012, 0.02)
    def ptint(co, n):
        c = steel(co, n)
        g = 0.55 * (1 - ss(0.0, 0.05, co.z - (z0 + 0.25)))                    # borda de baixo da placa
        g = max(g, 0.5 * ss(z0 + 0.46, z0 + 0.54, co.z))                       # sombra sob a gola
        g = max(g, 0.4 * (1 - ss(0.1, 0.18, abs(co.x))) * ss(z0 + 0.3, z0 + 0.45, co.z))   # atrás da barba
        c = mix(c, ST_D, g)
        return mix(c, ST_L, 0.5 * (1 - ss(0.006, 0.02, abs(co.x))) * (co.y < -0.15))   # aresta central
    paint(pl, ptint)
    out.append(pl)
    # frisos em relevo: borda de baixo da placa e volta da gola, pousados na placa por raios (quina com contorno)
    import mathutils.bvhtree as bvt
    tree = bvt.BVHTree.FromObject(pl, bpy.context.evaluated_depsgraph_get())

    def ring_on(zc, rx, n=40, lift=0.012):
        pts = []
        for k in range(n + 1):
            a = -math.pi * 0.95 + 1.9 * math.pi * k / n     # frente e lados; atrás fica sob a capa
            d = Vector((math.sin(a), -math.cos(a), 0))
            hit, nrm, _, _ = tree.ray_cast(Vector((0, -0.02, zc)) + d * 1.0, -d)
            if hit:
                pts.append(hit + nrm * lift)
        return pts
    for zc in (z0 + 0.255,):
        pts = ring_on(zc, 0.36)
        if len(pts) > 4:
            rb = tube("platerim", pts, [0.02] * len(pts), seg=6, squash=(1.0, 0.7), cap=False)
            paint(rb, lambda co, n: mix(ST_D, ST_L, 0.25 + 0.75 * ss(-0.3, 0.9, n.z)))
            out.append(rb)
    for k in range(2):   # duas lâminas da barriga com degrau, entre a placa e o cinto
        zz = z0 + 0.19 - k * 0.075
        lm = tube("lame", [(0, -0.01, zz - 0.045), (0, -0.01, zz + 0.03)], [0.3 - 0.012 * k - 0.025, 0.3 - 0.012 * k], seg=28)
        lm.data.transform(Matrix.Diagonal((1.0, 0.82, 1.0, 1.0)))
        paint(lm, lambda co, n: mix(steel(co, n), ST_L, 0.35 * ss(0.4, 0.9, n.z)))
        out.append(lm)

    # gola alta de aço em volta do pescoço
    gor = tube("gorget", [(0, 0.03, z0 + 0.52), (0, 0.03, z0 + 0.58), (0, 0.035, z0 + 0.62)], [0.19, 0.16, 0.13], seg=20)
    paint(gor, steel)
    out.append(gor)
    gems = []
    for s in (-1, 1):   # engaste de ouro e gema ciano de cada lado da gola, sobre o peito alto
        st = sball("setting", (s * 0.27, -0.17, z0 + 0.56), (0.066, 0.026, 0.066), rot=(0.7, 0, 0), seg=(14, 8))
        paint(st, gold)
        out.append(st)
        gems.append(gem_at("chestgem", (s * 0.27, -0.192, z0 + 0.572), (0.05, 0.02, 0.05)))
    # cinto largo de couro com fivela de prata e gema ciano
    belt = tube("belt", [(0, 0.0, z0 - 0.08), (0, 0.0, z0 + 0.05)], [0.27, 0.262], seg=24)
    belt.data.transform(Matrix.Diagonal((1.0, 0.8, 1.0, 1.0)))
    paint(belt, lambda co, n: mix(LEATHER_D, LEATHER, 0.4 + 0.6 * ss(-0.6, 0.7, n.z - 0.3 * n.y)))
    buckle = sball("buckle", (0, -0.218, z0 - 0.015), (0.08, 0.028, 0.065), seg=(12, 8))
    paint(buckle, steel)
    out += [belt, buckle]
    gems.append(gem_at("beltgem", (0, -0.244, z0 - 0.015), (0.032, 0.014, 0.032)))
    return {"torso": out, "torso@lit": gems}


# ------------------------------------------------------------------ braços: ombreiras enormes em lâminas, aço até o punho, mãos nuas
def lames(name, center, r, count, drop, shrink, squash, rot):
    """lâminas sobrepostas: domos achatados empilhados, cada um com um friso escuro na borda (quina dura)"""
    from mathutils import Euler
    out = []
    R = Euler(rot).to_matrix()
    for k in range(count):
        c = Vector(center) + Vector(drop) * k
        rr = r * (1 - shrink * k)
        o = sball(f"{name}{k}", c, (rr, rr * 1.05, rr * squash), rot=rot, seg=(24, 14))
        paint(o, steel)
        rim = tube(f"{name}rim{k}", [c + R @ Vector((rr * math.cos(a), rr * 1.05 * math.sin(a), -rr * squash * 0.12))
                                     for a in [j * 2 * math.pi / 32 for j in range(33)]], [0.012] * 33, seg=6, cap=False)
        paint(rim, lambda co, n: mix(ST_D, ST_M, 0.4 + 0.6 * ss(-0.5, 0.8, n.z)))
        out += [o, rim]
    return out


def open_hand(x, y, z, s):
    """mão aberta: palma achatada, quatro dedos curvos, polegar na frente"""
    els = [EL((x, y, z), (0.058, 0.085, 0.08))]
    for dy in (-0.055, -0.019, 0.019, 0.055):
        L = 0.15 - abs(dy) * 0.6
        a = (x, y + dy, z - 0.05)
        b = (x - s * 0.012, y + dy * 1.6, z - 0.05 - L * 0.55)
        c = (x - s * 0.04, y + dy * 2.0, z - 0.05 - L)
        els += [CAP(a, b, 0.02, stiff=3.0), CAP(b, c, 0.017, stiff=3.0)]
    els += [CAP((x - s * 0.01, y - 0.06, z + 0.01), (x - s * 0.04, y - 0.11, z - 0.03), 0.022, stiff=3.0),
            CAP((x - s * 0.04, y - 0.11, z - 0.03), (x - s * 0.05, y - 0.13, z - 0.08), 0.018, stiff=3.0)]
    f = meta("hand", els, res=0.006)
    smooth(f, iters=1, target=420)
    paint(f, skin)
    return [f]


def palm_hand(x, y, z, s):
    """mão aberta com a palma para a frente em repouso (fica para cima com o antebraço deitado para a frente): dedos abertos
    em leque ao longo de x, curvados para a palma, polegar para fora"""
    els = [EL((x, y, z - 0.01), (0.085, 0.05, 0.08))]
    for dx in (-0.054, -0.018, 0.018, 0.054):
        L = 0.13 - abs(dx) * 0.5
        a = (x + dx, y, z - 0.06)
        b = (x + dx * 1.35, y + 0.012, z - 0.06 - L * 0.55)
        c = (x + dx * 1.6, y + 0.04, z - 0.06 - L)
        els += [CAP(a, b, 0.021, stiff=3.0), CAP(b, c, 0.018, stiff=3.0)]
    els += [CAP((x - s * 0.07, y + 0.01, z), (x - s * 0.13, y + 0.03, z - 0.05), 0.022, stiff=3.0)]
    f = meta("hand", els, res=0.006)
    smooth(f, iters=1, target=480)
    paint(f, skin)
    return [f]


def fist(x, y, z, s):
    """punho fechado: bloco da mão, quatro nós dos dedos dobrados para dentro, polegar por cima"""
    els = [EL((x, y, z - 0.02), (0.07, 0.085, 0.08))]
    for dy in (-0.054, -0.018, 0.018, 0.054):
        els.append(CAP((x - s * 0.02, y + dy, z - 0.1), (x - s * 0.055, y + dy, z - 0.07), 0.026, stiff=3.0))
    els.append(CAP((x - s * 0.01, y - 0.07, z - 0.01), (x - s * 0.05, y - 0.06, z - 0.08), 0.024, stiff=3.0))
    f = meta("fist", els, res=0.006)
    smooth(f, iters=1, target=420)
    paint(f, lambda co, n: mix(skin(co, n), SKIN_D, 0.5 * ss(0.6, 0.95, abs(math.sin((co.y - y) * 87)))
                                * ss(z - 0.07, z - 0.1, co.z)))
    return [f]


def arms():
    out = {}
    for side, s in (("L", -1), ("R", 1)):
        ax, ay, az = RIG.P("arm" + side)
        a = tube("arm" + side, [(ax, ay, az - 0.02), (ax, ay, az - RIG.arm - 0.02)], [0.1, 0.095], seg=18)
        for p_ in a.data.polygons:
            p_.use_smooth = True
        paint(a, steel)
        rings = []
        for zz in (az - 0.14, az - 0.24):   # braçadeira em dois anéis encaixados, borda clara
            rg = tube("rerebrace", [(ax, ay, zz + 0.05), (ax, ay, zz - 0.04)], [0.108, 0.122], seg=18)
            for p_ in rg.data.polygons:
                p_.use_smooth = True
            paint(rg, lambda co, n: mix(steel(co, n), ST_L, 0.3 * ss(-0.2, 0.6, n.z)))
            rings.append(rg)
        # ombreira enorme: três lâminas que descem pelo braço, mais larga que a cabeça, com gema na de cima
        pad = lames("pauldron", (ax + s * 0.03, ay, az + 0.03), 0.185, 3, (s * 0.045, 0, -0.09), 0.1, 0.62, (0, s * 0.95, 0))
        out["arm" + side] = [a] + rings + pad
        fx, fy, fz = RIG.P("fore" + side)
        f = meta("fore" + side, [CAP((fx, fy, fz), (fx, fy, fz - 0.24), 0.095),
                                  EL((fx, fy, fz - 0.17), (0.12, 0.12, 0.1))], res=0.012)
        smooth(f, iters=1, target=320)
        paint(f, steel)
        # cotovelo e manopla de punho largo
        el = sball("elbow", (fx, fy + 0.02, fz), (0.1, 0.1, 0.08), seg=(10, 6))
        paint(el, steel)
        cuff = tube("cuff", [(fx, fy, fz - 0.15), (fx, fy, fz - 0.2)], [0.118, 0.13], seg=16)
        cuff2 = tube("cuff2", [(fx, fy, fz - 0.2), (fx, fy, fz - 0.26)], [0.128, 0.145], seg=16)
        paint(cuff, steel)
        paint(cuff2, steel)
        hand = fist(fx, fy, fz - HAND + 0.03, s) if side == "L" else palm_hand(fx, fy, fz - HAND + 0.03, s)
        hp = Vector((fx, fy, fz - 0.27))
        for o in hand:   # mãos grandes (1,35×), a partir do punho
            o.data.transform(Matrix.Translation(hp) @ Matrix.Diagonal((1.6, 1.6, 1.6, 1)) @ Matrix.Translation(-hp))
        out["fore" + side] = [f, el, cuff, cuff2] + hand
    return out


# ------------------------------------------------------------------ quadril: manto azul até a nuvem, faixas douradas; a nuvem
def puff_col(co, n):
    c = mix(CLOUD_D, CLOUD, 0.35 + 0.65 * ss(-0.7, 0.6, n.z))
    return mix(c, CLOUD_L, 0.55 * ss(0.45, 1.0, n.z - 0.2 * n.y))


def hips():
    zt = RIG.P("torso")[2]
    out = []
    # saia: do cinto até dentro da nuvem, abrindo em pregas
    rings = []
    for i in range(7):
        u = i / 6
        z = zt - 0.04 - (zt - 0.04 - 0.42) * u
        r = 0.25 + 0.34 * u ** 1.5
        rings.append(((0, 0.02 * u, z), (0, 0, -1), r, r * 0.86, 7, 0.09 * u))
    sk = ring_loft("skirt", rings, seg=36, thick=0.02)
    paint(sk, navy)
    out.append(sk)
    # duas faixas douradas descendo na frente do manto
    for s in (-1, 1):
        pts = []
        for i in range(7):
            u = i / 6
            z = zt - 0.06 - (zt - 0.06 - 0.45) * u
            r = (0.25 + 0.34 * u ** 1.5) * 0.86 * (1 + 0.09 * u) + 0.016
            pts.append((s * (0.07 + 0.08 * u), 0.02 * u - r * math.cos(0.28 + 0.14 * u), z))
        g = tube("goldtrim", pts, [0.016] * len(pts), seg=6, squash=(1.0, 0.5), ref=(0, 1, 0))
        paint(g, gold)
        out.append(g)
    # nuvem: gomos redondos escuros em volta e embaixo da saia, mais larga que os ombros
    els = []
    ring = [(0.5, 0.0, 0.34, 0.2), (0.38, -0.3, 0.32, 0.2), (0.0, -0.44, 0.3, 0.21), (-0.38, -0.3, 0.33, 0.2), (-0.52, 0.02, 0.32, 0.21),
            (-0.36, 0.34, 0.33, 0.2), (0.02, 0.46, 0.3, 0.21), (0.38, 0.32, 0.34, 0.2), (0.2, -0.42, 0.42, 0.15), (-0.2, -0.4, 0.44, 0.15),
            (0.5, -0.16, 0.48, 0.14), (-0.5, -0.14, 0.5, 0.14), (0.0, -0.3, 0.54, 0.15), (0.3, 0.18, 0.52, 0.15), (-0.3, 0.2, 0.5, 0.15)]
    for x, y, z, r in ring:
        els.append(EL((x, y, z), (r, r, r * 0.85)))
    for x, y, z, r in ((0, 0, 0.22, 0.38), (0.25, -0.15, 0.14, 0.2), (-0.25, 0.15, 0.14, 0.2), (0.62, 0.12, 0.24, 0.13),
                       (-0.64, -0.1, 0.22, 0.13), (0.1, -0.58, 0.24, 0.13)):
        els.append(EL((x, y, z), (r, r, r * 0.8)))
    els = [(t, (co[0] * 1.35, co[1] * 1.3, co[2]), r * 1.12, size, rot, neg, st) for t, co, r, size, rot, neg, st in els]
    cl = meta("cloud", els, res=0.012, thresh=0.6)
    smooth(cl, iters=1, target=2200)
    paint(cl, puff_col)
    out.append(cl)
    # espirais claras em alguns gomos da frente (como no sprite)
    import mathutils.bvhtree as bvt
    tree = bvt.BVHTree.FromObject(cl, bpy.context.evaluated_depsgraph_get())
    swirls = []
    for cx, cy, cz, rr in ((0.38, -0.3, 0.32, 0.12), (-0.38, -0.3, 0.33, 0.12), (0.0, -0.44, 0.3, 0.12), (0.52, 0.02, 0.32, 0.11),
                           (-0.52, 0.02, 0.32, 0.11), (0.2, -0.42, 0.44, 0.08), (-0.2, -0.4, 0.46, 0.08),
                           (-0.36, 0.34, 0.33, 0.12), (0.02, 0.46, 0.3, 0.12), (0.38, 0.32, 0.34, 0.12)):
        cx, cy = cx * 1.35, cy * 1.3   # a nuvem foi alargada
        c = Vector((cx, cy, cz))
        d = Vector((cx, cy, 0)).normalized()
        up = Vector((0, 0, 1))
        sd = d.cross(up).normalized()
        pts = []
        for k in range(16):
            ang = k * 0.5
            rad = rr * (0.15 + 0.85 * k / 15)
            o = c + sd * math.cos(ang) * rad + up * math.sin(ang) * rad * 0.85
            hit, nrm, _, _ = tree.ray_cast(o + d * 0.6, -d)
            if hit:
                pts.append(hit + nrm * 0.008)
        if len(pts) > 4:
            sw = tube("swirl", pts, [0.008 + 0.006 * k / len(pts) for k in range(len(pts))], seg=5)
            paint(sw, lambda co, n: SWIRL)
            swirls.append(sw)
    return {"hips": out, "hips@flat": swirls}


# ------------------------------------------------------------------ capa (osso cape): azul-marinho, dos ombros até a nuvem
def cape():
    zs = RIG.P("armL")[2] + 0.04
    bm = bmesh.new()
    R, C = 10, 16
    grid = []
    for i in range(R + 1):
        u = i / R
        z = zs - (zs - 0.74) * u
        w = 0.42 + 0.26 * u
        row = []
        for j in range(C + 1):
            v = j / C * 2 - 1
            x = v * w + 0.08 * u * u           # cai um pouco para o lado esquerdo do rei (direita na tela de frente)
            # as bordas envolvem os lados e vêm para a frente sobre as ombreiras; pregas fundas embaixo
            y = 0.24 + 0.3 * u - (0.22 - 0.02 * u) * v * v + 0.07 * (0.25 + u) * math.sin(v * math.pi * 4.5)
            zz = z + ((0.07 if j % 2 else -0.03) if i == R else 0) - 0.08 * (1 - u) ** 3 * v * v
            row.append(bm.verts.new((x, y, zz)))
        grid.append(row)
    for i in range(R):
        for j in range(C):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    c = new_mesh("cape", bm)
    sol = c.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.028
    sol.offset = 0
    apply_mods(c)
    for p in c.data.polygons:
        p.use_smooth = True

    def tint(co, n):
        if n.y < -0.25:   # forro
            return mix(NAVY_D, NAVY, 0.6)
        c = mix(NAVY_D, NAVY, (0.45 + 0.55 * ss(0.5, zs, co.z)) * (0.6 + 0.4 * abs(n.y)))
        return mix(c, NAVY_L, 0.5 * ss(0.45, 0.6, abs(co.x)))
    paint(c, tint)
    return {"cape": [c]}


if __name__ == "__main__":
    import bmesh  # noqa: F401
    reset()
    parts = merge(place_head(RIG, head(), lift=HEAD_LIFT, scale=HEAD_SCALE, fwd=0.02), torso(), hips(), arms(), cape())
    finish("storm_tyrant", RIG, parts, ARGS, body_center=(0, 0, 1.0), body_dist=5.2, head_dist=1.6)
