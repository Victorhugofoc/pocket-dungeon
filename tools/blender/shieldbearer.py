# Shieldbearer (cavaleiro de escudo e lança) modelado no Blender (M9-01). Brief: docs/briefs/shieldbearer.md.
# Rodar: ver tools/blender/README.md. Escudo e lança também são daqui: cada um é modelado na orientação do mundo, a partir da mão,
# e levado ao repouso do osso do antebraço que o segura pela pose da receita (POSE_L, POSE_R, LEAN, OUT iguais a cast-enemies.ts).
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from humanoid import Rig, finish, merge, place_head, xform3  # noqa: E402
from robed import fore_rot  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
RIG = Rig(hipY=0.98, headY=0.56, shoulderY=0.48, shoulderX=0.36, arm=0.34, hipX=0.15, thigh=0.47)
HAND = 0.3
# pose de repouso da receita: antebraço do escudo atravessado na frente do peito, mão da lança junto ao quadril
POSE_L, POSE_R, LEAN, OUT = (-0.65, -1.05, 0.0, -0.7), (0.05, -0.95, 0.0, -0.6), 0.12, 0.15

ST_L, ST_M, ST_D, ST_K = hexc(0xd0d3d8), hexc(0x8a9099), hexc(0x464a52), hexc(0x141518)
MAIL, MAIL_D = hexc(0x50545c), hexc(0x1c1e22)
RED, RED_D = hexc(0x961c24), hexc(0x4a0c10)
FIELD, FIELD_D = hexc(0x989ca3), hexc(0x5c6068)
WOOD, WOOD_D = hexc(0x6a4428), hexc(0x3a2414)
LEATHER, LEATHER_D = hexc(0x4a2e1c), hexc(0x24160c)


def steel(co, n):
    """aço polido: sombra embaixo, brilho no topo e na frente alta"""
    t = 0.2 + 0.8 * ss(-0.6, 0.85, n.z)
    spec = ss(0.62, 0.98, n.z * 0.6 - n.y * 0.55)
    return mix(mix(ST_D, ST_M, t), ST_L, spec * 0.9)


def steel_dark(co, n):
    return mix(ST_K, ST_D, 0.35 + 0.65 * ss(-0.6, 0.8, n.z))


def mail(co, n):
    """cota de malha: fileiras de anéis em listras finas, mais escura que as placas"""
    rows = 0.6 + 0.4 * abs(math.cos(co.z * 95 + math.sin(co.x * 60) * 0.6))
    return mix(MAIL_D, MAIL, (0.35 + 0.65 * ss(-0.6, 0.6, n.z)) * rows)


def cloth(base, dark):
    return lambda co, n: mix(dark, base, 0.35 + 0.65 * ss(-0.7, 0.5, n.z))


def lames(name, center, r, count, drop, shrink, squash=0.5, rot=(0, 0, 0)):
    """lâminas sobrepostas (ombreira, sabatão): domos achatados empilhados, cada um menor e mais baixo; o contorno marca a borda"""
    out = []
    for k in range(count):
        c = Vector(center) + Vector(drop) * k
        rr = r * (1 - shrink * k)
        o = ball(f"{name}{k}", c, (rr, rr * 1.05, rr * squash), rot=rot, seg=(10, 6))
        paint(o, steel)
        out.append(o)
    return out


# ------------------------------------------------------------------ cabeça: elmo fechado, viseira com fenda escavada, pluma
def head():
    parts = {"solid": [], "flat": [], "lit": []}
    h = meta("helm", [
        CAP((0, 0.0, -0.09), (0, 0.0, 0.1), 0.14, stiff=4.0),           # tambor do elmo, laterais retas
        EL((0, 0.0, 0.12), (0.142, 0.142, 0.05), stiff=4.0),            # topo reto
        EL((0, -0.06, 0.0), (0.13, 0.09, 0.15), stiff=4.0),             # frente plana
        CAP((0, -0.152, 0.005), (0, -0.15, -0.1), 0.02),                 # nervura vertical no meio, abaixo da fenda
        EL((0, 0.0, -0.14), (0.15, 0.15, 0.04)),                        # base do elmo, larga, sobre o gorjal
    ], res=0.006)
    smooth(h, iters=1, factor=0.3, target=600)
    # fenda dos olhos: corte de verdade (booleano) por uma placa fina que entra pela frente; as paredes do corte saem escuras
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.transform(bm, matrix=Matrix.Translation((0, -0.19, 0.04)) @ Matrix.Diagonal((0.24, 0.24, 0.048, 1)), verts=bm.verts)
    cutter = new_mesh("slitcut", bm)
    bo = h.modifiers.new("slit", "BOOLEAN")
    bo.operation = "DIFFERENCE"
    bo.object = cutter
    apply_mods(h)
    bpy.data.objects.remove(cutter)
    for poly in h.data.polygons:
        poly.use_smooth = abs(poly.normal.z) < 0.9

    def tint(co, n):
        # paredes da fenda (normais em pé, dentro da faixa): quase pretas; o corte é na casca, não uma barra colada
        if abs(co.z - 0.04) < 0.027 and co.y < -0.06:
            return ST_K
        return steel(co, n)
    paint(h, tint)
    # o fundo da fenda: miolo escuro dentro do elmo, visto pelo corte
    core = ball("helmcore", (0, -0.01, 0.04), (0.125, 0.125, 0.06), seg=(12, 5))
    paint(core, lambda co, n: ST_K)
    core["no_ao"] = True
    parts["solid"].append(core)
    parts["solid"].append(h)
    lid = tube("helmtop", [(0, 0.0, 0.135), (0, 0.0, 0.165)], [0.146, 0.13], seg=18)   # tampa reta: o topo do grande elmo
    paint(lid, steel)
    parts["solid"].append(lid)
    # respiros: fileira de furos escuros no lado direito da viseira (sem contorno; com ele viravam bolinhas)
    # respiros: fendas verticais escuras deitadas na proa, abaixo da fenda dos olhos
    for k in range(3):
        for r in range(2):
            for sd in (-1, 1):
                x = sd * (0.045 + 0.026 * k)
                ok, hit, nrm, _ = h.ray_cast(Vector((x, -1.0, -0.035 - 0.032 * r)), Vector((0, 1, 0)))
                if not ok:
                    continue
                hole = ball("vent", hit + nrm * 0.002, (0.011, 0.004, 0.011), seg=(6, 3))
                paint(hole, lambda co, n: ST_K)
                parts["flat"].append(hole)
    # pluma vermelha: mechas afiladas saindo do topo e caindo em arco para trás
    # pluma: tufo de mechas largas que sobe pouco do topo e cai para trás até a nuca, como no sprite
    for k in range(6):
        dx = -0.03 + 0.012 * k
        ln = 1.0 - 0.12 * abs(k - 2.5)
        pts, radii = [], []
        for i in range(8):
            u = i / 7
            pts.append((dx * (1 + 0.4 * u), -0.01 + 0.42 * u * ln, 0.22 + (0.24 * math.sin(u * math.pi * 0.85) - 0.34 * u * u) * ln))
            radii.append(0.068 * (1 - u * 0.75) + 0.01)
        p = tube("plume", pts, radii, seg=6)
        smooth(p, iters=1)
        paint(p, lambda co, n: mix(RED_D, RED, 0.3 + 0.7 * ss(-0.5, 0.7, n.z)))
        parts["solid"].append(p)
    holder = tube("plumeholder", [(0, -0.01, 0.15), (0, -0.01, 0.23)], [0.03, 0.022], seg=8)
    paint(holder, steel)
    parts["solid"].append(holder)
    return parts


# ------------------------------------------------------------------ tronco: peitoral abaulado com quilha, gorjal, cinto
def torso():
    z0 = RIG.P("torso")[2]
    sx = RIG.shoulderX
    t = meta("torso", [
        EL((0, -0.01, z0 + 0.32), (0.235, 0.16, 0.17)),             # peito largo e abaulado
        EL((0, -0.03, z0 + 0.15), (0.2, 0.14, 0.13)),               # barriga de placas
        EL((0, 0.0, z0 + 0.04), (0.18, 0.125, 0.08)),               # cintura
        EL((-sx + 0.07, 0.0, z0 + 0.43), (0.08, 0.08, 0.06)),       # ombros
        EL((sx - 0.07, 0.0, z0 + 0.43), (0.08, 0.08, 0.06)),
        CAP((0, -0.145, z0 + 0.44), (0, -0.155, z0 + 0.12), 0.024),  # quilha do peitoral
    ], res=0.01)
    smooth(t, iters=2, target=560)
    paint(t, steel)
    # gorjal: anéis de aço descendo do pescoço
    gorget = []
    for k, (zz, r) in enumerate(((z0 + 0.5, 0.16),)):
        g = tube("gorget", [(0, 0.0, zz + 0.03), (0, 0.0, zz - 0.02)], [r * 0.92, r], seg=16)
        smooth(g)
        paint(g, steel)
        gorget.append(g)
    belt = tube("belt", [(0, 0.0, z0 + 0.04), (0, 0.0, z0 - 0.02)], [0.215, 0.215], seg=18, squash=(1.0, 0.74))
    paint(belt, cloth(LEATHER, LEATHER_D))
    buckle = ball("buckle", (0, -0.16, z0 + 0.01), (0.045, 0.015, 0.04), seg=(8, 4))
    paint(buckle, steel)
    return {"torso": [t, belt, buckle] + gorget}


def skirt_loft(name, ztop, zbot, rx0, rx1, ry0, ry1, seg=20, rows=3):
    """saia em tronco de cone fechada, com espessura (cota de malha que cai até o meio da coxa)"""
    bm = bmesh.new()
    grid = []
    for i in range(rows + 1):
        u = i / rows
        z = ztop + (zbot - ztop) * u
        rx, ry = rx0 + (rx1 - rx0) * u, ry0 + (ry1 - ry0) * u
        row = []
        for j in range(seg):
            a = 2 * math.pi * j / seg
            row.append(bm.verts.new((rx * math.sin(a), -ry * math.cos(a), z + (0.015 * math.sin(j * 2.3) if i == rows else 0))))
        grid.append(row)
    for i in range(rows):
        for j in range(seg):
            bm.faces.new((grid[i][j], grid[i][(j + 1) % seg], grid[i + 1][(j + 1) % seg], grid[i + 1][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_mesh(name, bm)
    sol = o.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.02
    sol.offset = 0
    apply_mods(o)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def hips():
    z = RIG.P("hips")[2]
    p = meta("hips", [EL((0, 0.0, z + 0.02), (0.19, 0.13, 0.11))], res=0.012)
    smooth(p, iters=1, target=180)
    paint(p, mail)
    sk = skirt_loft("mailskirt", z + 0.04, z - 0.28, 0.21, 0.245, 0.155, 0.18)
    paint(sk, mail)
    # faixas de placas na cintura (faulds), sobre a malha
    faulds = []
    for k, (zz, r) in enumerate(((z + 0.065, 0.21),)):
        f = tube("fauld", [(0, 0.0, zz + 0.035), (0, 0.0, zz - 0.035)], [r, r + 0.012], seg=18, squash=(1.0, 0.75))
        paint(f, steel)
        faulds.append(f)
    return {"hips": [p, sk] + faulds}


def to_fore(objs, side, pose):
    """peças modeladas na orientação do mundo com a origem na mão vão para o repouso do osso do antebraço (como hang em kit.ts)"""
    fr, _ = fore_rot(pose, side, LEAN, OUT)
    f3 = RIG.p3["fore" + ("L" if side < 0 else "R")]
    m3 = Matrix.Translation((f3[0], f3[1] - HAND, f3[2])) @ fr.transposed().to_4x4()
    xform3(objs, m3)
    return objs


def kite_half(v):
    """meia largura do escudo pipa na altura v (topo 0.42, ponta -0.5)"""
    if v > 0.08:
        return 0.255
    k = (0.08 - v) / 0.58
    return 0.255 * math.sqrt(max(0.0, 1 - k ** 1.6))


def shield():
    """escudo pipa abaulado, face para a frente (-y), centro na origem; volta como peças sólidas e a faixa vermelha (sem contorno)"""
    bulge = 0.09

    def surf(u, v):
        w = kite_half(v)
        x = u * w
        return Vector((x, -bulge * (1 - u * u) - 0.02 * (1 - abs(v) / 0.5), v + 0.025 * (1 - u * u) * (v > 0.35)))
    nu, nv = 12, 18
    bm = bmesh.new()
    grid = []
    for i in range(nv + 1):
        v = 0.42 - 0.92 * i / nv
        grid.append([bm.verts.new(surf(-1 + 2 * j / nu, v)) for j in range(nu + 1)])
    for i in range(nv):
        for j in range(nu):
            a, b, c, d = grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]
            if i == nv - 1:
                bm.faces.new((a, b, d)) if j < nu // 2 else bm.faces.new((a, b, c))
            else:
                bm.faces.new((a, b, c, d))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    face = new_mesh("shield", bm)
    sol = face.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.05
    sol.offset = 0
    apply_mods(face)
    for p in face.data.polygons:
        p.use_smooth = True
    # frente branca acinzentada; o verso (madeira) e a espessura escuros
    paint(face, lambda co, n: mix(FIELD_D, FIELD, (0.45 + 0.55 * ss(-0.4, 0.9, -n.y * 0.7 + n.z * 0.5)) * (1.0 if co.x < 0 else 0.62))
          if n.y < -0.3 else mix(WOOD_D, WOOD, 0.5))
    # borda de aço em relevo seguindo o contorno
    rim_pts = []
    for k in range(11):
        u = -1 + 2 * k / 10
        rim_pts.append(surf(u, 0.42))
    for k in range(1, 11):
        v = 0.42 - 0.92 * k / 10
        rim_pts.append(surf(1, v) if v > -0.49 else surf(0, -0.5))
    for k in range(9, 0, -1):
        v = 0.42 - 0.92 * k / 10
        rim_pts.append(surf(-1, v))
    rim_pts.append(rim_pts[0])
    rim = tube("rim", [p + Vector((0, -0.01, 0)) for p in rim_pts], [0.034] * len(rim_pts), seg=5, cap=False)
    paint(rim, lambda co, n: mix(ST_K, ST_D, 0.3 + 0.7 * ss(-0.5, 0.9, n.z - n.y * 0.4)))
    # quina clara descendo pelo meio do escudo, do topo até a ponta
    keel = tube("keel", [surf(0, v) + Vector((0, -0.028, 0)) for v in (0.41, 0.1, -0.2, -0.47)], [0.011] * 4, seg=5)
    paint(keel, lambda co, n: ST_L)
    keel["no_ao"] = True
    # chevron vermelho (como no sprite): faixa em V invertido, colada na face, sem contorno
    stripe = []
    for s in (-1, 1):
        pts = []
        for k in range(7):
            u = s * k / 6 * 0.98
            v = 0.16 - 0.36 * abs(u)
            pts.append(surf(u, v) + Vector((0, -0.03, 0)))
        bmc = bmesh.new()
        rows = []
        for p in pts:
            rows.append([bmc.verts.new(p + Vector((0, 0, -0.1))), bmc.verts.new(p + Vector((0, 0, 0.1)))])
        for k in range(len(rows) - 1):
            bmc.faces.new((rows[k][0], rows[k + 1][0], rows[k + 1][1], rows[k][1]))
        bmesh.ops.recalc_face_normals(bmc, faces=bmc.faces)
        st = new_mesh("chevron", bmc)
        sol = st.modifiers.new("thick", "SOLIDIFY")
        sol.thickness = 0.004
        apply_mods(st)
        paint(st, lambda co, n: mix(RED_D, RED, 0.55 + 0.45 * ss(-0.4, 0.9, -n.y)))
        st["no_ao"] = True
        stripe.append(st)
    # alças de couro no verso, onde o antebraço entra
    straps = []
    for zz in (0.12, -0.08):
        sp = ball("strap", (0.0, 0.035, zz), (0.09, 0.02, 0.025), seg=(8, 4))
        paint(sp, cloth(LEATHER, LEATHER_D))
        straps.append(sp)
    for o in [face, rim, keel] + straps:
        o["no_ao"] = True
    return [face, rim, keel] + straps, stripe


def spear():
    """lança ao longo de +eixo (frente -y, um pouco para cima), mão na origem: 0,7 de haste atrás, 1,4 à frente, ponta de folha"""
    d = Vector((0.24, -math.cos(0.12), math.sin(0.12))).normalized()
    back, front = -0.72, 1.38
    shaft = tube("shaft", [d * back, d * front], [0.034, 0.031], seg=8)
    paint(shaft, lambda co, n: mix(WOOD_D, WOOD, 0.4 + 0.6 * ss(-0.6, 0.8, n.z)))
    socket = tube("socket", [d * (front - 0.02), d * (front + 0.12)], [0.036, 0.03], seg=8)
    paint(socket, steel)
    ring = tube("ring", [d * (front - 0.04), d * (front - 0.01)], [0.042, 0.042], seg=8)
    paint(ring, steel)
    # ponta em folha: losango achatado e comprido
    side = d.cross(Vector((0, 0, 1))).normalized()
    up = side.cross(d).normalized()
    base = d * (front + 0.12)
    leaf = [base, base + d * 0.12, base + d * 0.36]
    blade = tube("blade", leaf, [0.016, 0.085, 0.002], seg=6, squash=(1.0, 0.22), ref=tuple(up))
    paint(blade, lambda co, n: mix(ST_M, ST_L, 0.4 + 0.6 * ss(-0.3, 0.9, n.z)))
    butt = cone("butt", d * back, d * (back - 0.08), 0.03, seg=8)
    paint(butt, steel)
    grip = tube("grip", [d * -0.09, d * 0.09], [0.033, 0.033], seg=8)
    paint(grip, cloth(LEATHER, LEATHER_D))
    out = [shaft, socket, ring, blade, butt, grip]
    for o in out:
        o["no_ao"] = True
    return out


def limbs():
    out = {}
    for side, s, pose in (("L", -1, POSE_L), ("R", 1, POSE_R)):
        ax, ay, az = RIG.P("arm" + side)
        a = meta("arm" + side, [CAP((ax, ay, az - 0.05), (ax, ay, az - RIG.arm + 0.03), 0.075),
                                EL((ax, ay, az - 0.18), (0.08, 0.08, 0.1))], res=0.011)
        smooth(a, iters=1, target=160)
        paint(a, steel)
        # ombreira grande em três lâminas, como no sprite
        pad = lames("pauldron", (ax + s * 0.03, ay, az - 0.01), 0.112, 2, (s * 0.03, 0, -0.05), 0.12, squash=0.42, rot=(0, s * 0.55, 0))
        fx, fy, fz = RIG.P("fore" + side)
        f = meta("fore" + side, [CAP((fx, fy, fz), (fx, fy, fz - 0.22), 0.06),
                                  EL((fx, fy, fz - 0.12), (0.068, 0.068, 0.09)),
                                  EL((fx, fy, fz - HAND), (0.06, 0.07, 0.06)),                      # manopla fechada
                                  EL((fx + s * 0.03, fy - 0.03, fz - HAND + 0.02), (0.025, 0.025, 0.03))], res=0.01)
        smooth(f, iters=1, target=240)
        paint(f, lambda co, n, fz=fz: steel_dark(co, n) if co.z < fz - HAND + 0.05 else steel(co, n))
        # cotoveleira em leque
        couter = ball("couter", (fx + s * 0.035, fy + 0.04, fz + 0.005), (0.075, 0.06, 0.07), rot=(0, s * 0.4, 0), seg=(10, 6))
        paint(couter, steel)
        cuff = tube("cuff", [(fx, fy, fz - HAND + 0.12), (fx, fy, fz - HAND + 0.05)], [0.068, 0.098], seg=12)
        paint(cuff, steel)
        fore_parts = [f, couter, cuff]
        flat = []
        if side == "L":
            sh, stripe = shield()
            # escudo à frente do antebraço (atravessado), descendo para cobrir do ombro à coxa, virado um pouco para fora
            m = Matrix.Translation((-0.05, -0.07, -0.13)) @ Matrix.Rotation(-0.18, 4, "Z")
            for o in sh + stripe:
                o.data.transform(m)
            fore_parts += to_fore(sh, -1, POSE_L)
            flat += to_fore(stripe, -1, POSE_L)
        else:
            fore_parts += to_fore(spear(), 1, POSE_R)
        hx, hy, hz = RIG.P("thigh" + side)
        th = meta("thigh" + side, [CAP((hx, hy, hz - 0.02), (hx + s * 0.01, hy, hz - RIG.thigh + 0.04), 0.12),
                                   EL((hx + s * 0.01, hy - 0.01, hz - 0.18), (0.13, 0.13, 0.16))], res=0.012)
        smooth(th, iters=1, target=200)
        paint(th, steel)
        # escarcela: placa curva na frente da coxa, saindo da saia de malha
        tasset = ball("tasset", (hx + s * 0.01, hy - 0.1, hz - 0.08), (0.1, 0.03, 0.12), rot=(-0.12, 0, 0), seg=(10, 6))
        paint(tasset, steel)
        kx, ky, kz = RIG.P("shin" + side)
        sh = meta("shin" + side, [CAP((kx, ky, kz - 0.04), (kx, ky, kz - 0.38), 0.09),
                                  EL((kx, ky + 0.01, kz - 0.17), (0.1, 0.105, 0.12)),             # greva
                                  CAP((kx, ky - 0.12, kz - 0.45), (kx, ky - 0.22, kz - 0.458), 0.042),  # ponta do sabatão, romba
                                  EL((kx, ky - 0.08, kz - 0.44), (0.075, 0.14, 0.045)),           # sabatão
                                  EL((kx, ky, kz - 0.42), (0.075, 0.08, 0.05))], res=0.01)
        smooth(sh, iters=1, target=260)
        paint(sh, lambda co, n, kz=kz: steel_dark(co, n) if co.z < kz - 0.47 else steel(co, n))
        knee = ball("knee", (kx, ky - 0.09, kz - 0.005), (0.09, 0.06, 0.085), seg=(10, 6))
        paint(knee, steel)
        wing = ball("kneewing", (kx + s * 0.05, ky - 0.05, kz - 0.005), (0.035, 0.06, 0.065), rot=(0, 0, s * 0.5), seg=(8, 5))
        paint(wing, steel)
        out["arm" + side] = [a] + pad
        out["fore" + side] = fore_parts
        if flat:
            out["fore" + side + "@flat"] = flat
        out["thigh" + side] = [th, tasset]
        out["shin" + side] = [sh, knee, wing]
    return out


if __name__ == "__main__":
    reset()
    parts = merge(place_head(RIG, head(), lift=0.12, scale=1.15), torso(), hips(), limbs())
    print("DIMS", RIG.dims_ts())
    finish("shieldbearer", RIG, parts, ARGS, body_center=(0, -0.2, 0.95), body_dist=4.6, head_dist=1.1)
