# Archer (esqueleto arqueiro de capuz e manto vermelho) modelado no Blender (M3-03). Brief: docs/briefs/archer.md.
# Rodar: ver tools/blender/README.md. O arco fica por código (archerBow em cast-enemies.ts). Blender: z para cima, frente em -y.
# Revisão 2: ossos robustos (massa de silhueta), crânio maior, capuz + capelete + manto como um pano só, mão esquerda fechada
# em volta do cabo do arco (eixo do cabo calculado pela pose da receita), aljava por cima do manto no ombro de trás.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from humanoid import Rig, finish, merge, place_head  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
RIG = Rig(hipY=0.92, headY=0.6, shoulderY=0.46, shoulderX=0.27, arm=0.34, hipX=0.12, thigh=0.42, bulk=1.0)
HAND = 0.3
HEAD_LIFT, HEAD_SCALE = 0.11, 1.22
# eixo do cabo do arco e direção do tiro no espaço do antebraço esquerdo em repouso (Blender), pela pose da receita
# (b.poseL, b.lean, b.stance.turn em cast-enemies.ts; restArm em kit.ts)
GRIP = Vector((-0.15, -0.98, 0.132)).normalized()
SHOT = Vector((-0.449, -0.052, -0.892)).normalized()
# linha da flecha (da mão da corda à do arco) no espaço do tronco e da cabeça em repouso, no Blender: o capelete e o capuz
# se abrem em volta dela para a flecha e a mão da corda não entrarem no pano
ARROW_TORSO = (Vector((0.008, -0.181, 1.499)), Vector((-0.701, -0.472, 1.462)))
ARROW_HEAD = (Vector((0.141, -0.077, 1.469)), Vector((0.009, -0.828, 1.381)))


def seg_dist(p, ab):
    a, b = ab
    d = b - a
    t = max(0.0, min(1.0, (p - a).dot(d) / d.length_squared))
    return (p - (a + d * t)).length

BONE, BONE_L, BONE_D = hexc(0xdcc48e), hexc(0xf0dfb0), hexc(0x8a6c40)   # osso bege quente, como o sprite
RED, RED_D, RED_DD = hexc(0x6a2420), hexc(0x34120e), hexc(0x1a0806)   # vinho amarronzado
HIDE, HIDE_D, FEATHER, EMBER, DARK = hexc(0x6a4428), hexc(0x3a2414), hexc(0xe8e0d0), hexc(0xff4a2a), hexc(0x120806)


def bone(co, n):
    c = mix(BONE_D, BONE, 0.62 + 0.38 * ss(-0.7, 0.4, n.z))
    return mix(c, BONE_L, 0.4 * ss(0.4, 1.0, n.z))


def osso(name, a, b, r, knob=1.5, seg=6):
    """osso longo: haste com nó nas duas pontas (cabeça do osso)"""
    out = [tube(name, [a, b], [r, r * 0.88], seg=seg)]
    for p, k in ((a, knob), (b, knob * 0.92)):
        out.append(ball(name + "_knob", p, (r * k, r * k, r * k), seg=(6, 4)))
    for o in out:
        paint(o, bone)
        o["no_ao"] = True
    return out


def cloth_paint(axis_y=0.0, lo=0.25):
    """pano: lado de fora vermelho com luz de cima, lado de dentro quase preto"""
    def f(co, n):
        out = Vector((co.x, co.y - axis_y, 0))
        inside = out.length > 1e-4 and n.dot(out.normalized()) < -0.2
        if inside:
            return RED_DD
        return mix(RED_D, RED, lo + (1 - lo) * ss(-0.6, 0.7, n.z) * (0.75 + 0.25 * ss(0.0, 0.5, -n.y)))
    return f


def hood_loft(name, rings, open_half, seg=24, thick=0.024, jag=None, cut=None):
    """pano em anéis (z, rx, ry, cy) aberto na frente: em cada anel os vértices vão de +a a 2π-a, com a = open_half(z, rx)
    (0 = anel fechado); a borda da abertura sai lisa porque segue os vértices, não as faces"""
    bm = bmesh.new()
    grid = []
    for i, (z, rx, ry, cy) in enumerate(rings):
        a0 = open_half(z, rx)
        row = []
        for j in range(seg + 1):
            a = a0 + (2 * math.pi - 2 * a0) * j / seg
            zz = z + (jag(j) if jag and i == len(rings) - 1 else 0.0)
            row.append(bm.verts.new((rx * math.sin(a), cy - ry * math.cos(a), zz)))
        grid.append(row)
    for i in range(len(grid) - 1):
        for j in range(seg):
            q = (grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j])
            if cut and cut(sum((v.co for v in q), Vector()) / 4):
                continue
            bm.faces.new(q)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_mesh(name, bm)
    sol = o.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = thick
    sol.offset = 0
    apply_mods(o)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def loft(name, rings, seg=16, cut=None, thick=0.022, jag=None):
    """pano em anéis (z, rx, ry, cy) de cima para baixo, aberto onde cut(x, y, z) for verdadeiro; jag(j) sacode a barra (anel de baixo)"""
    bm = bmesh.new()
    grid = []
    for i, (z, rx, ry, cy) in enumerate(rings):
        row = []
        for j in range(seg):
            a = 2 * math.pi * j / seg
            zz = z + (jag(j) if jag and i == len(rings) - 1 else 0.0)
            row.append(bm.verts.new((rx * math.sin(a), cy - ry * math.cos(a), zz)))
        grid.append(row)
    for i in range(len(grid) - 1):
        for j in range(seg):
            q = (grid[i][j], grid[i][(j + 1) % seg], grid[i + 1][(j + 1) % seg], grid[i + 1][j])
            c = sum((v.co for v in q), Vector()) / 4
            if cut and cut(c.x, c.y, c.z):
                continue
            bm.faces.new(q)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_mesh(name, bm)
    sol = o.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = thick
    sol.offset = 0
    apply_mods(o)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


# ------------------------------------------------------------------ crânio e capuz (centro na origem, escala HEAD_SCALE)
def head():
    parts = {"solid": [], "flat": [], "lit": []}
    sk = meta("skull", [
        EL((0, 0.02, 0.04), (0.098, 0.11, 0.1)),                 # caixa craniana
        EL((-0.06, -0.06, -0.025), (0.034, 0.036, 0.03)),        # maçãs
        EL((0.06, -0.06, -0.025), (0.034, 0.036, 0.03)),
        EL((0, -0.05, -0.078), (0.066, 0.062, 0.032)),           # maxilar
        CAP((-0.072, -0.088, 0.036), (0.072, -0.088, 0.036), 0.024, stiff=1.6),  # arcada
        EL((-0.042, -0.108, 0.0), (0.032, 0.042, 0.03), neg=True),  # órbitas fundas
        EL((0.042, -0.108, 0.0), (0.032, 0.042, 0.03), neg=True),
        EL((0, -0.118, -0.04), (0.013, 0.03, 0.017), neg=True),  # buraco do nariz
    ], res=0.007)
    smooth(sk, iters=2, factor=0.5, target=300)
    paint(sk, bone)
    sk["no_ao"] = True  # dentro do capuz a oclusão escurecia o rosto todo; as órbitas já são peças escuras
    parts["solid"].append(sk)
    jaw = meta("jaw", [CAP((-0.06, -0.035, -0.105), (0.06, -0.035, -0.105), 0.026), EL((0, -0.07, -0.118), (0.05, 0.03, 0.022))], res=0.008)
    smooth(jaw, iters=1, target=120)
    paint(jaw, bone)
    jaw["no_ao"] = True
    parts["solid"].append(jaw)
    for s in (-1, 1):
        sock = ball("socket", (s * 0.042, -0.086, 0.0), (0.028, 0.012, 0.026), seg=(8, 5))
        paint(sock, lambda co, n: DARK)
        parts["flat"].append(sock)
        em = ball("ember", (s * 0.042, -0.096, -0.002), (0.011, 0.007, 0.011), seg=(6, 4))
        paint(em, lambda co, n: EMBER)
        parts["lit"].append(em)
    nose = ball("nose", (0, -0.104, -0.04), (0.011, 0.01, 0.015), seg=(5, 4))
    paint(nose, lambda co, n: DARK)
    parts["flat"].append(nose)
    gap = ball("teethgap", (0, -0.097, -0.094), (0.05, 0.01, 0.007), seg=(8, 3))
    paint(gap, lambda co, n: DARK)
    parts["flat"].append(gap)
    for row, z in ((0, -0.083), (1, -0.104)):  # duas fileiras de dentes
        for i in range(5):
            x = (i - 2) * 0.016
            t = ball("tooth", (x, -0.104 + abs(x) * 0.5, z), (0.0075, 0.006, 0.011), seg=(5, 3))
            paint(t, lambda co, n: BONE_L)
            parts["flat"].append(t)
    # capuz: pano em anéis, de uma ponta caída para trás no alto até a gola larga que desce sobre o capelete do tronco;
    # a abertura do rosto é funda e a aba da frente faz sombra na testa. Os anéis de baixo são redondos e centrados no pescoço,
    # porque a cabeça gira sobre o tronco (o arqueiro mira de lado e a cabeça olha à frente)
    rings = [
        (0.178, 0.0, 0.0, 0.1),          # copa em domo contínuo, um pouco para trás (sem degrau na silhueta)
        (0.173, 0.065, 0.07, 0.078),
        (0.158, 0.105, 0.115, 0.05),
        (0.132, 0.135, 0.148, 0.03),
        (0.102, 0.15, 0.163, 0.015),
        (0.072, 0.155, 0.168, 0.01),
    ]
    for k in range(9):  # do rosto ao pescoço o pano alarga, caindo
        z = 0.055 - k * 0.03
        r = 0.157 + 0.003 * k + 0.0012 * k * k
        rings.append((z, r, r * 1.07, 0.008))
    rings += [(-0.19, 0.2, 0.2, 0.0)]
    ZC, HX, HZ = -0.035, 0.112, 0.14  # abertura do rosto: elipse de frente

    def open_half(z, rx):
        t = (z - ZC) / HZ
        if abs(t) >= 1:
            return 0.0
        return math.asin(min(0.95, HX * math.sqrt(1 - t * t) / rx))
    hz = RIG.P("head")[2] + HEAD_LIFT
    arrow = tuple((v - Vector((0, 0, hz))) / HEAD_SCALE for v in ARROW_HEAD)  # no espaço da cabeça antes da escala
    hood = hood_loft("hood", rings, open_half, seg=26, thick=0.018, jag=lambda j: -0.02 * (j % 2) - 0.008 * math.sin(j * 1.7),
                     cut=lambda c: seg_dist(c, arrow) < 0.075)
    smooth(hood, iters=1, factor=0.35, target=760)
    paint(hood, cloth_paint(0.02, 0.3))
    parts["solid"].append(hood)
    return parts


# ------------------------------------------------------------------ tronco: costelas, coluna, clavículas, capelete, aljava
def torso():
    z0 = RIG.P("torso")[2]
    zs = RIG.P("armL")[2]
    out = []
    out += osso("spine", (0, 0.06, z0 - 0.02), (0, 0.06, z0 + 0.52), 0.038, knob=1.25)
    for i in range(6):  # vértebras
        v = ball("vert", (0, 0.075, z0 + 0.02 + i * 0.085), (0.048, 0.04, 0.032), seg=(6, 4))
        paint(v, bone)
        out.append(v)
    for i, z in enumerate((z0 + 0.43, z0 + 0.355, z0 + 0.28, z0 + 0.205, z0 + 0.13)):
        w = 0.215 - i * 0.012
        for s in (-1, 1):
            pts = [(s * 0.03, 0.07, z), (s * w * 0.8, 0.06, z - 0.005), (s * w, -0.02, z - 0.02), (s * w * 0.82, -0.105, z - 0.04),
                   (s * 0.05, -0.145, z - 0.06)]
            r = tube("rib", pts, [0.032, 0.04, 0.04, 0.035, 0.026], seg=5, squash=(1.0, 0.8), ref=(0, 0, 1))
            paint(r, bone)
            out.append(r)
    st = tube("sternum", [(0, -0.15, z0 + 0.43), (0, -0.155, z0 + 0.14)], [0.044, 0.03], seg=6, squash=(1.0, 0.5), ref=(0, 1, 0))
    paint(st, bone)
    out.append(st)
    for s in (-1, 1):
        out += osso("clav", (s * 0.03, -0.12, z0 + 0.46), (s * (RIG.shoulderX - 0.02), -0.01, zs + 0.01), 0.03, knob=1.2)
        sb = ball("scapula", (s * 0.12, 0.1, z0 + 0.37), (0.075, 0.02, 0.085), rot=(0, s * 0.3, 0), seg=(8, 5))
        paint(sb, bone)
        out.append(sb)
    # capelete: continua a gola do capuz e cai sobre os ombros, aberto na frente em V para mostrar as costelas
    hz = RIG.P("head")[2] + HEAD_LIFT  # centro da cabeça no Blender
    top = hz - 0.19 * HEAD_SCALE
    mantle = loft("mantle", [
        (top + 0.06, 0.15, 0.15, 0.02),
        (top - 0.02, 0.25, 0.2, 0.03),
        (zs + 0.04, 0.33, 0.25, 0.04),
        (zs - 0.05, 0.35, 0.27, 0.05),
        (zs - 0.11, 0.36, 0.28, 0.06),
    ], seg=20, thick=0.024,
        cut=lambda x, y, z: (y < -0.06 and abs(x) < 0.05 + max(0.0, top + 0.02 - z) * 1.1) or seg_dist(Vector((x, y, z)), ARROW_TORSO) < 0.085,
        jag=lambda j: -0.05 * (j % 2) + 0.02 * math.sin(j * 2.1))
    smooth(mantle, iters=1, factor=0.35, target=520)
    paint(mantle, cloth_paint(0.04))
    out.append(mantle)
    # aljava de couro nas costas, por cima do manto, inclinada para o ombro de trás (direito); flechas de penas claras para fora
    qa, qb = Vector((-0.12, 0.3, z0 + 0.02)), Vector((0.17, 0.31, zs + 0.02))
    q = tube("quiver", [qa, qa.lerp(qb, 0.5), qb], [0.062, 0.068, 0.074], seg=8)
    paint(q, lambda co, n: mix(HIDE_D, HIDE, 0.4 + 0.6 * ss(-0.5, 0.6, n.z)))
    rim = tube("qrim", [qa.lerp(qb, 0.93), qa.lerp(qb, 1.0)], [0.082, 0.082], seg=8)
    paint(rim, lambda co, n: HIDE_D)
    band = tube("qband", [qa.lerp(qb, 0.3), qa.lerp(qb, 0.36)], [0.072, 0.072], seg=8)
    paint(band, lambda co, n: HIDE_D)
    out += [q, rim, band]
    d = (qb - qa).normalized()
    for k, (ox, oy) in enumerate(((-0.03, -0.02), (0.02, -0.025), (0.0, 0.025), (-0.035, 0.02), (0.035, 0.015))):
        a = qb + Vector((ox, oy, 0)) - d * 0.06
        b = a + d * (0.28 + 0.05 * (k % 2))
        shaft = tube("arrow", [a, b], [0.012, 0.012], seg=4)
        paint(shaft, lambda co, n: HIDE)
        fl = tube("fletch", [b - d * 0.11, b - d * 0.01], [0.038, 0.026], seg=3)
        paint(fl, lambda co, n: FEATHER)
        out += [shaft, fl]
    # correia da aljava atravessando o peito, do ombro direito ao quadril esquerdo, por cima das costelas
    pts = []
    for i in range(8):
        u = i / 7
        x = 0.2 - 0.4 * u
        zz = zs - 0.03 - 0.42 * u
        pts.append((x, -0.17 + 0.07 * (abs(x) / 0.2) ** 2, zz))
    strap = tube("strap", pts, [0.03] * 8, seg=5, squash=(1.0, 0.32), ref=(0, 1, 0))
    paint(strap, lambda co, n: mix(HIDE_D, HIDE, 0.5 + 0.5 * n.z))
    out.append(strap)
    return {"torso": out}


# ------------------------------------------------------------------ bacia, braços e pernas
def hips():
    z = RIG.P("hips")[2]
    p = meta("pelvis", [
        EL((-0.095, 0.01, z + 0.02), (0.1, 0.06, 0.09), rot=(0, 0.4, 0.3)),  # asas do ilíaco
        EL((0.095, 0.01, z + 0.02), (0.1, 0.06, 0.09), rot=(0, -0.4, -0.3)),
        EL((0, 0.04, z - 0.04), (0.07, 0.045, 0.06)),                          # sacro
        EL((0, -0.035, z - 0.065), (0.06, 0.035, 0.03)),                       # púbis
        EL((0, -0.02, z - 0.02), (0.04, 0.06, 0.045), neg=True),               # vão da bacia
    ], res=0.008)
    smooth(p, iters=1, target=240)
    paint(p, bone)
    # pano rasgado vermelho na cintura, caindo na frente
    cl = tube("loin", [(0, -0.09, z - 0.0), (0, -0.11, z - 0.14), (0, -0.1, z - 0.28)], [0.085, 0.08, 0.06], seg=8,
              squash=(1.0, 0.15), ref=(0, 0, 1))
    paint(cl, lambda co, n: mix(RED_D, RED, 0.55))
    return {"hips": [p, cl]}


def fist_on_grip(fx, fy, fz):
    """mão esquerda fechada em volta do cabo do arco: dedos em anel em volta do eixo GRIP, polegar por cima"""
    out = []
    h = Vector((fx, fy, fz - HAND))
    u = SHOT.cross(GRIP).normalized()           # lado da mão
    w = GRIP.cross(u).normalized()              # ao longo do tiro, perpendicular ao cabo
    palm = ball("palm", h - w * 0.05, (0.046, 0.046, 0.046), seg=(7, 5))
    out.append(palm)
    for k in range(4):  # quatro dedos: arcos em volta do cabo (raio 0,04), da palma até a frente e de volta pelo outro lado
        c = h + GRIP * ((k - 1.5) * 0.024 - 0.012)
        pts = [c + (w * -math.cos(a) + u * math.sin(a)) * 0.056 for a in [i * 0.55 for i in range(7)]]
        out.append(tube("finger", pts, [0.02] * 7, seg=5))
    th = [h + GRIP * 0.045 + u * -0.035 - w * 0.02, h + GRIP * 0.06 + w * 0.02, h + GRIP * 0.05 + u * 0.03 + w * 0.03]
    out.append(tube("thumb", th, [0.018, 0.016, 0.014], seg=5))
    for o in out:
        paint(o, bone)
        o["no_ao"] = True  # dedos em volta do cabo: a oclusão deixava o punho preto
    return out


def pinch(fx, fy, fz):
    """mão direita na corda: punho com dois dedos curvados"""
    h = Vector((fx, fy - 0.005, fz - HAND + 0.02))
    out = [ball("palm", h, (0.046, 0.04, 0.05), seg=(7, 5))]
    for k in (-1, 0, 1):
        a = h + Vector((k * 0.022, -0.02, -0.035))
        out.append(tube("finger", [a, a + Vector((0, -0.035, -0.025)), a + Vector((0, -0.01, -0.06))], [0.016, 0.015, 0.013], seg=5))
    for o in out:
        paint(o, bone)
    return out


def limbs():
    out = {}
    for side, s in (("L", -1), ("R", 1)):
        ax, ay, az = RIG.P("arm" + side)
        out["arm" + side] = osso("humerus", (ax, ay, az), (ax, ay, az - RIG.arm + 0.02), 0.05, knob=1.5)
        fx, fy, fz = RIG.P("fore" + side)
        f = []
        for k in (-1, 1):  # rádio e ulna
            f += osso("radius", (fx + k * 0.02, fy, fz - 0.03), (fx + k * 0.02, fy, fz - HAND + 0.05), 0.026, knob=1.4)
        f += fist_on_grip(fx, fy, fz) if side == "L" else pinch(fx, fy, fz)
        out["fore" + side] = f
        hx, hy, hz = RIG.P("thigh" + side)
        out["thigh" + side] = osso("femur", (hx, hy, hz), (hx, hy, hz - RIG.thigh + 0.02), 0.058, knob=1.45)
        kx, ky, kz = RIG.P("shin" + side)
        sh = []
        cap_ = ball("kneecap", (kx, ky - 0.05, kz), (0.055, 0.035, 0.055), seg=(7, 5))
        paint(cap_, bone)
        sh.append(cap_)
        for k, r in ((-1, 0.047), (1, 0.03)):  # tíbia e fíbula
            sh += osso("tibia", (kx - s * k * 0.018, ky, kz - 0.03), (kx - s * k * 0.018, ky, kz - 0.4), r, knob=1.3)
        foot = meta("foot", [EL((kx, ky - 0.06, kz - 0.435), (0.075, 0.11, 0.04)), EL((kx, ky + 0.01, kz - 0.42), (0.052, 0.05, 0.045))],
                    res=0.01)
        smooth(foot, iters=1, target=100)
        paint(foot, bone)
        sh.append(foot)
        for k in (-1, 0, 1):
            t = cone("toe", (kx + k * 0.034, ky - 0.14, kz - 0.44), (kx + k * 0.038, ky - 0.2, kz - 0.452), 0.019, seg=4)
            paint(t, bone)
            sh.append(t)
        out["shin" + side] = sh
    return out


# ------------------------------------------------------------------ manto (osso cape): cai do capelete até a canela, envolvendo os lados
def cloak():
    cx, cy, cz = RIG.P("cape")
    zs = RIG.P("armL")[2]
    bm = bmesh.new()
    R, C = 8, 14
    grid = []
    for i in range(R + 1):
        u = i / R
        z = zs + 0.02 - (zs - 0.36) * u
        w = 0.33 + 0.16 * u
        row = []
        for j in range(C + 1):
            v = j / C * 2 - 1
            x = v * w
            y = 0.17 + 0.03 * u - (0.25 - 0.05 * u) * v * v + 0.045 * (0.3 + u) * math.sin(v * math.pi * 3.5)  # pregas verticais
            zz = z
            if i == R:  # barra rasgada em pontas
                zz += (0.1 if j % 2 else -0.02) + 0.05 * math.sin(j * 2.3)
            row.append(bm.verts.new((x, y, zz)))
        grid.append(row)
    for i in range(R):
        for j in range(C):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    c = new_mesh("cloak", bm)
    sol = c.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.026
    sol.offset = 0
    apply_mods(c)
    for p in c.data.polygons:
        p.use_smooth = True

    def tint(co, n):
        if n.y < -0.25:  # forro (lado que olha para o corpo)
            return RED_DD
        return mix(RED_D, RED, (0.3 + 0.7 * ss(0.3, zs, co.z)) * (0.6 + 0.4 * abs(n.y)))
    paint(c, tint)
    return {"cape": [c]}


if __name__ == "__main__":
    reset()
    parts = merge(place_head(RIG, head(), lift=HEAD_LIFT, scale=HEAD_SCALE), torso(), hips(), limbs(), cloak())
    finish("archer", RIG, parts, ARGS, body_center=(0, 0, 0.95), body_dist=4.2, head_dist=1.2)
