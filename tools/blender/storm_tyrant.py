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

ST_L, ST_M, ST_D, ST_K = hexc(0xe8ecf0), hexc(0x8a919a), hexc(0x464b53), hexc(0x121417)
NAVY, NAVY_D, NAVY_L = hexc(0x22305e), hexc(0x10183a), hexc(0x3c4f8e)
GOLD, GOLD_D, GOLD_L = hexc(0xe2b04a), hexc(0x9a6a1a), hexc(0xfff0b0)
GEM, GEM_L = hexc(0x0a9ad8), hexc(0x5fe0ff)
SKIN, SKIN_D, SKIN_L = hexc(0xe8a674), hexc(0xa86440), hexc(0xffd2a8)
WHITE, WHITE_D = hexc(0xfffaf0), hexc(0xb8b4ac)
LEATHER, LEATHER_D = hexc(0xa86c3c), hexc(0x52341e)
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
                           EL((0, 0.1, -0.22), (0.13, 0.08, 0.12)),
                           EL((0, 0.12, -0.32), (0.12, 0.06, 0.08))], res=0.006)   # cabelo longo caindo até os ombros
    smooth(top, iters=1, target=420)
    paint(top, hair)
    parts["solid"].append(top)
    return parts


# ------------------------------------------------------------------ armadura de ferro: placas em loft, facetadas, com quinas
def loft(name, rows, closed=True, thick=0.022, flat=True):
    """malha por fileiras de pontos (todas com o mesmo número); com espessura e faces chapadas (ferro batido)"""
    bm = bmesh.new()
    grid = [[bm.verts.new(p) for p in row] for row in rows]
    n = len(rows[0])
    for i in range(len(grid) - 1):
        for j in range(n if closed else n - 1):
            k = (j + 1) % n
            bm.faces.new((grid[i][j], grid[i][k], grid[i + 1][k], grid[i + 1][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_mesh(name, bm)
    if thick:
        sol = o.modifiers.new("thick", "SOLIDIFY")
        sol.thickness = thick
        sol.offset = 0
        apply_mods(o)
    for p in o.data.polygons:
        p.use_smooth = not flat
    return o


def section(z, w, d, db, ridge=0.0, seg=20, cx=0.0, cy=0.0):
    """corte horizontal do tronco: frente funda d com quilha (ridge), costas db; a=0 na frente (-y)"""
    pts = []
    for j in range(seg):
        a = 2 * math.pi * j / seg
        ca = math.cos(a)
        y = -(d * ca + ridge * max(0.0, ca) ** 6) if ca > 0 else -db * ca
        pts.append((cx + w * math.sin(a), cy + y, z))
    return pts


def iron(z_lo, z_hi):
    """ferro: tom médio frio, faixa escura na borda de baixo e um filete claro só na aresta de cima de cada placa"""
    def f(co, n):
        k = ss(z_lo, z_hi, co.z)
        c = mix(ST_D, ST_M, 0.3 + 0.7 * ss(-0.6, 0.7, n.z - 0.3 * n.y))
        c = mix(ST_K, c, 0.3 + 0.7 * ss(0.0, 0.3, k))
        return mix(c, ST_L, 0.95 * ss(0.8, 0.95, k) * ss(-0.4, 0.4, n.z - 0.3 * n.y))
    return f


def rivets(pts, r=0.014):
    out = []
    for p in pts:
        b = sball("rivet", p, (r, r, r), seg=(8, 5))
        paint(b, lambda co, n: mix(ST_M, ST_L, ss(0.0, 0.9, n.z - n.y)))
        out.append(b)
    return out


# ------------------------------------------------------------------ tronco: couraça de ferro facetada, gola em lâminas, cinto
def torso():
    z0 = RIG.P("torso")[2]
    sx = RIG.shoulderX
    t = meta("torso", [
        EL((0, 0.0, z0 + 0.04), (0.24, 0.18, 0.12)),
        EL((0, -0.0, z0 + 0.3), (0.33, 0.21, 0.24)),
        EL((-sx + 0.08, 0.0, z0 + 0.48), (0.13, 0.13, 0.11)),
        EL((sx - 0.08, 0.0, z0 + 0.48), (0.13, 0.13, 0.11)),
    ], res=0.012)
    smooth(t, iters=1, target=700)
    paint(t, lambda co, n: mix(ST_K, ST_D, 0.5))   # forro escuro por baixo das placas
    out = [t]
    # peitoral: barril facetado com quilha no meio, da gola até a primeira lâmina
    rows = []
    for zz, w, d, rd in ((z0 + 0.2, 0.34, 0.24, 0.03), (z0 + 0.27, 0.39, 0.265, 0.045), (z0 + 0.36, 0.415, 0.275, 0.05),
                         (z0 + 0.45, 0.4, 0.26, 0.045), (z0 + 0.52, 0.35, 0.225, 0.03), (z0 + 0.58, 0.26, 0.18, 0.0)):
        rows.append(section(zz, w, d, 0.19 + 0.04 * (zz < z0 + 0.5), rd * 1.6, seg=48, cy=0.01))
    pl = loft("breast", rows, thick=0.026, flat=False)

    def ctint(co, n):
        c = iron(z0 + 0.2, z0 + 0.58)(co, n)
        c = mix(c, ST_L, 0.7 * (1 - ss(0.008, 0.028, abs(co.x))) * (co.y < -0.12))     # aresta central viva
        return mix(c, ST_K, 0.45 * ss(z0 + 0.5, z0 + 0.57, co.z))                       # sombra sob a gola
    paint(pl, ctint)
    out.append(pl)
    # três lâminas da barriga (faldas), cada uma por baixo da de cima, abrindo um pouco embaixo
    for k, (zt, zb) in enumerate(((z0 + 0.215, z0 + 0.125), (z0 + 0.14, z0 + 0.05))):
        w0, d0 = 0.335 - 0.02 * k, 0.24 - 0.01 * k
        lm = loft(f"fauld{k}", [section(zb, w0 + 0.014, d0 + 0.014, 0.2, 0.02, seg=40, cy=0.01),
                                section(zt, w0 - 0.01, d0 - 0.01, 0.19, 0.02, seg=40, cy=0.01)], thick=0.03, flat=False)
        paint(lm, iron(zb, zt))
        out.append(lm)
    # gola: duas lâminas altas em volta do pescoço
    for k, (zb, zt, r0, r1) in enumerate(((z0 + 0.55, z0 + 0.62, 0.22, 0.19), (z0 + 0.61, z0 + 0.69, 0.19, 0.17))):
        g = loft(f"gorget{k}", [section(zb, r0, r0 * 0.95, r0 * 0.9, 0.0, seg=18, cy=0.03),
                                section(zt, r1, r1 * 0.95, r1 * 0.9, 0.0, seg=18, cy=0.03)], thick=0.02)
        paint(g, iron(zb, zt))
        out.append(g)
    # cinto largo de couro com fivela de ferro e gema ciano
    belt = tube("belt", [(0, 0.0, z0 - 0.11), (0, 0.0, z0 + 0.07)], [0.3, 0.295], seg=28)
    belt.data.transform(Matrix.Diagonal((1.0, 0.8, 1.0, 1.0)))
    paint(belt, lambda co, n: mix(LEATHER_D, LEATHER, 0.4 + 0.6 * ss(-0.6, 0.7, n.z - 0.3 * n.y)))
    buckle = loft("buckle", [[(0.085 * math.cos(q), -0.245, z0 - 0.02 + 0.085 * math.sin(q)) for q in [2 * math.pi * j / 20 for j in range(20)]],
                             [(0.065 * math.cos(q), -0.262, z0 - 0.02 + 0.065 * math.sin(q)) for q in [2 * math.pi * j / 20 for j in range(20)]]],
                  thick=0.02, flat=False)
    paint(buckle, lambda co, n: mix(ST_D, ST_L, 0.3 + 0.7 * ss(-0.3, 0.9, n.z - n.y)))
    out += [belt, buckle]
    gems = [gem_at("beltgem", (0, -0.262, z0 - 0.02), (0.042, 0.016, 0.042))]
    return {"torso": out, "torso@lit": gems}


# ------------------------------------------------------------------ braços: ombreiras de ferro em cúpula e lâminas, manoplas
def pauldron(side, s, scale):
    """ombreira como no sprite: chapas em arco por cima do ombro, da gola (aba erguida) para fora e para baixo, cada uma
    por cima da de baixo, como telhas; pontas da frente e de trás arredondadas"""
    ax, ay, az = RIG.P("arm" + side)
    out = []
    plates = [   # (centro x, centro z, raio, ângulo inicial, ângulo final, meio comprimento frente-trás)
        (0.02, 0.0, 0.24, -0.75, 1.15, 0.3),
        (0.05, -0.06, 0.25, 0.75, 1.45, 0.24),
        (0.08, -0.11, 0.255, 1.05, 1.7, 0.2),
    ]
    core = sball("paulcore", (ax + s * 0.07 * scale, ay, az - 0.04), (0.2 * scale, 0.22 * scale, 0.2 * scale), seg=(20, 12))
    paint(core, lambda co, n: mix(ST_K, ST_D, 0.5 + 0.5 * ss(-0.5, 0.8, n.z)))
    out.append(core)
    for k, (dx, dz, r, f0, f1, L) in enumerate(plates):
        r *= scale
        L *= scale
        rows = []
        for i in range(13):
            q = -1 + 2 * i / 12
            end = math.sqrt(max(0.0, 1 - q * q))             # pontas fecham em cúpula, sem o "C" visto de frente e de trás
            rr = r * ((0.3 + 0.7 * end) if k == 0 else (0.75 + 0.25 * end))   # só a de cima fecha em cúpula
            row = []
            for j in range(15):
                f = f0 + (f1 - f0) * j / 14
                row.append((ax + s * (dx * scale + rr * math.sin(f)), ay + q * L, az + 0.03 + dz * scale + rr * math.cos(f) - r * 0.3))
            rows.append(row)
        pl = loft(f"pauldron{k}", rows, closed=False, thick=0.034, flat=False)
        zt = az + 0.03 + dz * scale + r * math.cos(f0) - r * 0.3
        zb = az + 0.03 + dz * scale + r * math.cos(f1) - r * 0.3

        def tint(co, n, f0=f0, f1=f1, dx=dx, dz=dz, r=r):
            # brilho duro na aresta de cima da chapa (perto de f0), sombra embaixo (perto de f1)
            vx, vz = s * (co.x - ax) - dx * scale, co.z - (az + 0.03 + dz * scale - r * 0.3)
            f = math.atan2(vx, vz)
            k_ = 1 - ss(f0, f1, f)
            c = mix(ST_D, ST_M, 0.35 + 0.65 * ss(-0.6, 0.7, n.z - 0.3 * n.y))
            c = mix(ST_K, c, 0.25 + 0.75 * ss(0.0, 0.3, k_))
            return mix(c, ST_L, 0.95 * ss(0.72, 0.92, k_))
        paint(pl, tint)
        out.append(pl)
    return out


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


def ring_band(name, x, y, z_lo, z_hi, r_lo, r_hi, seg=12):
    """anel de ferro facetado em volta de um membro (z_lo embaixo)"""
    o = loft(name, [[(x + r_lo * math.cos(a), y + r_lo * math.sin(a), z_lo) for a in [2 * math.pi * j / seg for j in range(seg)]],
                    [(x + r_hi * math.cos(a), y + r_hi * math.sin(a), z_hi) for a in [2 * math.pi * j / seg for j in range(seg)]]],
             thick=0.018, flat=False)
    paint(o, iron(z_lo, z_hi))
    return o


def arms():
    out = {}
    for side, s in (("L", -1), ("R", 1)):
        ax, ay, az = RIG.P("arm" + side)
        a = loft("arm" + side, [[(ax + r * math.cos(q), ay + r * math.sin(q), zz) for q in [2 * math.pi * j / 20 for j in range(20)]]
                                for zz, r in ((az - RIG.arm + 0.01, 0.088), (az - 0.2, 0.094), (az - 0.08, 0.096), (az, 0.09))],
                 thick=0.018, flat=False)
        paint(a, iron(az - RIG.arm, az))
        bands = [ring_band("rerebrace", ax, ay, az - 0.2, az - 0.15, 0.104, 0.098, seg=20)]
        # a ombreira do lado da capa (L, à esquerda da tela) é a maior, como no sprite
        out["arm" + side] = [a] + bands
        out.setdefault("torso", []).extend(pauldron(side, s, 1.12 if side == "L" else 1.0))
        fx, fy, fz = RIG.P("fore" + side)
        f = loft("fore" + side, [[(fx + r * math.cos(a), fy + r * math.sin(a), zz) for a in [2 * math.pi * j / 24 for j in range(24)]]
                                 for zz, r in ((fz - 0.28, 0.145), (fz - 0.24, 0.132), (fz - 0.16, 0.11), (fz - 0.06, 0.112), (fz + 0.02, 0.1))],
                 thick=0.02, flat=False)
        paint(f, iron(fz - 0.28, fz + 0.02))
        # cotoveleira em cúpula e manopla de duas lâminas que abre no punho
        el = loft("elbow", [[(fx + 0.1 * math.cos(a) * math.sin(t), fy + 0.02 + 0.1 * math.sin(a) * math.sin(t), fz + 0.06 * math.cos(t))
                             for a in [2 * math.pi * j / 12 for j in range(12)]] for t in (0.3, 0.9, 1.4, 1.75)], thick=0.016)
        paint(el, iron(fz - 0.03, fz + 0.06))
        g1 = ring_band("gaunt1", fx, fy, fz - 0.285, fz - 0.245, 0.158, 0.148, seg=24)
        paint(g1, lambda co, n: mix(ST_D, ST_L, 0.25 + 0.6 * ss(-0.5, 0.9, n.z - 0.3 * n.y)))
        spike = cone("couter", (fx, fy + 0.1, fz + 0.01), (fx, fy + 0.19, fz - 0.03), 0.05, seg=8)
        paint(spike, iron(fz - 0.05, fz + 0.03))
        hand = fist(fx, fy, fz - HAND + 0.03, s) if side == "L" else palm_hand(fx, fy, fz - HAND + 0.03, s)
        hp = Vector((fx, fy, fz - 0.27))
        for o in hand:   # mãos grandes (1,6×), a partir do punho
            o.data.transform(Matrix.Translation(hp) @ Matrix.Diagonal((1.35, 1.35, 1.35, 1)) @ Matrix.Translation(-hp))
        out["fore" + side] = [f, el, g1, spike] + hand
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
        rings.append(((0, 0.02 * u, z), (0, 0, -1), r, r * 0.86, 9, 0.12 * u))
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
            pts.append((s * (0.05 + 0.17 * u), 0.02 * u - r * math.cos(0.2 + 0.32 * u), z))
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
    els = [(t, (co[0] * 1.6, co[1] * 1.55, co[2] * 0.8 - 0.04), r * 1.22, size, rot, neg, st) for t, co, r, size, rot, neg, st in els]
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
        cx, cy, cz = cx * 1.6, cy * 1.55, cz * 0.8 - 0.04   # a nuvem foi alargada e baixada
        c = Vector((cx, cy, cz))
        d = Vector((cx, cy, 0)).normalized()
        up = Vector((0, 0, 1))
        sd = d.cross(up).normalized()
        pts = []
        for k in range(16):
            ang = k * 0.5
            rad = rr * 1.25 * (0.15 + 0.85 * k / 15)
            o = c + sd * math.cos(ang) * rad + up * math.sin(ang) * rad * 0.85
            hit, nrm, _, _ = tree.ray_cast(o + d * 0.6, -d)
            if hit:
                pts.append(hit + nrm * 0.008)
        if len(pts) > 4:
            sw = tube("swirl", pts, [0.008 + 0.006 * k / len(pts) for k in range(len(pts))], seg=5)
            paint(sw, lambda co, n: SWIRL)
            swirls.append(sw)
    return {"hips": out, "hips@flat": swirls}


# ------------------------------------------------------------------ capa (osso cape): pesada, presa sob as ombreiras, varre o lado esquerdo
def cape():
    zs = RIG.P("armL")[2] + 0.1
    bm = bmesh.new()
    R, C = 18, 30
    grid = []
    for i in range(R + 1):
        u = i / R
        row = []
        for j in range(C + 1):
            v = j / C * 2 - 1
            left = max(0.0, -v)
            w = 0.6 + 0.24 * u ** 1.2                                          # cai na vertical, abre pouco embaixo
            x = v * w - 0.1 * u ** 1.3 * left
            y = 0.27 + 0.26 * u + 0.1 * v * v * u - 0.06 * u ** 1.5 * left ** 2   # bordas para trás, sem aba rígida
            zb = 0.4 - 0.1 * left - 0.04 * math.sin(v * 2.0 + 0.6)               # barra assimétrica, encosta na nuvem
            z = zs - (zs - zb) * u ** 0.95
            # 4 pregas fundas, rasas no ombro e fundas embaixo, empurradas para fora do eixo do corpo
            fold = (0.01 + 0.1 * u ** 1.2) * (math.sin(v * math.pi * 4.2 + u * 1.0) + 0.25 * math.sin(v * math.pi * 7.3 + 2.0))
            rd = Vector((x, y - 0.05, 0))
            rd = rd.normalized() if rd.length > 1e-4 else Vector((0, 1, 0))
            x, y = x + rd.x * fold, y + rd.y * fold
            if i == R:   # barra que ondula
                z += 0.025 * math.sin(v * 11.0) + 0.02 * math.sin(v * 5.0 + 1.0)
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    for i in range(R):
        for j in range(C):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    c = new_mesh("cape", bm)
    sol = c.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.034
    sol.offset = 0
    apply_mods(c)
    for p in c.data.polygons:
        p.use_smooth = True

    def tint(co, n):
        rd = Vector((co.x, co.y - 0.05, 0))
        rd = rd.normalized() if rd.length > 1e-4 else Vector((0, 1, 0))
        out_ = n.x * rd.x + n.y * rd.y
        if out_ < -0.2:   # forro, por dentro: azul médio, aparece na borda
            return mix(NAVY, NAVY_L, 0.35)
        crest = ss(0.3, 0.97, out_)                        # crista da prega mais clara, o vale azul bem escuro
        c = mix(mix(hexc(0x0a1028), NAVY, 0.15 + 0.85 * crest), NAVY_L, 0.5 * crest ** 2)
        return mix(c, NAVY_D, 0.35 * ss(zs - 0.1, zs, co.z))   # sombra sob as ombreiras
    paint(c, tint)
    # gola: a capa vira por cima dos ombros num rolo de pano preso sob as ombreiras
    col = tube("capecollar", [(-0.56, 0.12, zs - 0.02), (-0.3, 0.26, zs + 0.02), (0.0, 0.29, zs + 0.03), (0.3, 0.26, zs + 0.02), (0.56, 0.12, zs - 0.02)],
               [0.035, 0.045, 0.05, 0.045, 0.035], seg=10)
    smooth(col)
    paint(col, lambda co, n: mix(NAVY_D, NAVY_L, 0.3 + 0.5 * ss(0.0, 0.9, n.z)))
    # gola alta atrás da nuca: pano erguido que emoldura a cabeça
    gr = []
    for i in range(3):
        h = i / 2
        gr.append([(0.3 * math.sin(a) * (1 + 0.25 * h), 0.24 + 0.06 * h - 0.12 * math.cos(a) * (1 - 0.3 * h), zs + 0.02 + 0.22 * h * (0.6 + 0.4 * math.cos(a)))
                   for a in [-1.4 + 2.8 * j / 16 for j in range(17)]])
    hc = loft("highcollar", gr, closed=False, thick=0.03, flat=False)
    paint(hc, lambda co, n: mix(NAVY_D, NAVY, 0.4 + 0.6 * ss(-0.3, 0.8, n.z + n.y * 0.3)))
    return {"cape": [c, col, hc]}


if __name__ == "__main__":
    import bmesh  # noqa: F401
    reset()
    parts = merge(place_head(RIG, head(), lift=HEAD_LIFT, scale=HEAD_SCALE, fwd=0.02), torso(), hips(), arms(), cape())
    finish("storm_tyrant", RIG, parts, ARGS, body_center=(0, 0, 1.0), body_dist=5.2, head_dist=1.6)
