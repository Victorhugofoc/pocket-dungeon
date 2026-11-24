# Iron Colossus (golem de ferro em placas com fornalha no peito) modelado no Blender (M10-08). Brief: docs/briefs/iron_colossus.md.
# Rodar: ver tools/blender/README.md. Bípede de humanoid.py; cada parte é casca de ferro em placas facetadas (`loft`: fileiras de
# pontos com espessura, faces chapadas e poucos segmentos), com faixas e rebites. Ferrugem salpicada por ruído fino na cor por
# vértice (`metal`); as placas grandes passam por uma subdivisão simples (`dense`, sem alisar) para o salpicado ter onde cair.
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mathutils import noise  # noqa: E402
from kit import *  # noqa: E402,F403
from humanoid import Rig, finish, merge  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
# iguais a b.dims da receita (cast-bosses.ts)
RIG = Rig(hipY=0.8, headY=0.34, shoulderY=0.42, shoulderX=0.44, arm=0.3, hipX=0.32, thigh=0.38, bulk=1.4)
HAND = 0.52

FE_K, FE_D, FE_M, FE_L = hexc(0x1f1f1e), hexc(0x3a3a37), hexc(0x5e5d58), hexc(0xa8a69e)
RU_D, RU_M, RU_L = hexc(0x5a2210), hexc(0x94401c), hexc(0xb5502a)
BR_D, BR_M = hexc(0x4a4426), hexc(0x847a40)
FIRE_D, FIRE_M, FIRE_L = hexc(0xe0400e), hexc(0xff8a24), hexc(0xffe08a)
SOOT = hexc(0x140a06)


def dense(o, levels=1):
    """subdivisão simples (sem alisar): mais vértices para a ferrugem salpicada, mesma forma facetada"""
    m = o.modifiers.new("sub", "SUBSURF")
    m.subdivision_type = "SIMPLE"
    m.levels = levels
    apply_mods(o)
    return o


def rust_at(co, n, k=1.0):
    """ferrugem em manchas médias de borda irregular (ruído médio + fino), um pouco mais no que está virado para cima"""
    v = noise.noise(Vector((co.x * 8 + 3.1, co.y * 8, co.z * 8))) + 0.45 * noise.noise(Vector((co.x * 27, co.y * 27 + 5, co.z * 27)))
    return k * ss(0.17, 0.23, v - 0.08 * max(0.0, n.z - 0.6) - 0.03)   # borda dura: placa de ferrugem, não degradê


def metal(z_lo, z_hi, rust=1.0, lift=1.0):
    """ferro: escuro embaixo, médio no meio, filete claro na aresta de cima da placa; ferrugem salpicada por cima"""
    def f(co, n):
        k = ss(z_lo, z_hi, co.z)
        c = mix(FE_D, FE_M, 0.25 + 0.75 * ss(-0.6, 0.8, n.z - 0.3 * n.y))
        c = mix(FE_K, c, 0.35 + 0.65 * ss(0.0, 0.3, k))
        c = tuple(min(1.0, x * lift) for x in c)
        r = rust_at(co, n, rust)
        c = mix(c, mix(RU_D, mix(RU_M, RU_L, ss(0.3, 0.9, n.z)), 0.4 + 0.6 * k), r * 0.95)
        edge = ss(-0.3, 0.5, n.z - 0.3 * n.y) * (1 - 0.8 * ss(0.85, 0.98, n.z))   # filete na aresta, não no tampo chato
        return mix(c, FE_L, 0.75 * ss(0.84, 0.97, k) * edge * (1 - r))   # brilho só no ferro limpo
    return f


def brass(co, n):
    c = mix(BR_D, BR_M, 0.3 + 0.7 * ss(-0.6, 0.8, n.z - 0.3 * n.y))
    return mix(c, RU_D, 0.6 * rust_at(co, n, 1.0))


def loft(name, rows, closed=True, thick=0.026, flat=True, cap=False):
    """malha por fileiras de pontos (todas com o mesmo número), com espessura; faces chapadas (ferro batido). cap = tampa chapada
    na última fileira (um polo fechando em ponto dava triângulos degenerados e uma estrela preta no contorno)"""
    bm = bmesh.new()
    grid = [[bm.verts.new(p) for p in row] for row in rows]
    n = len(rows[0])
    for i in range(len(grid) - 1):
        for j in range(n if closed else n - 1):
            k = (j + 1) % n
            bm.faces.new((grid[i][j], grid[i][k], grid[i + 1][k], grid[i + 1][j]))
    if cap:
        bm.faces.new(grid[-1])
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


def section(z, w, d, db, seg=16, cx=0.0, cy=0.0, sq=2.0):
    """corte horizontal em superelipse (sq > 2 = mais quadrado): largura w, frente d (-y), costas db"""
    pts = []
    for j in range(seg):
        a = 2 * math.pi * j / seg + math.pi / seg
        ca, sa = math.cos(a), math.sin(a)
        px = math.copysign(abs(sa) ** (2 / sq), sa)
        py = math.copysign(abs(ca) ** (2 / sq), ca)
        pts.append((cx + w * px, cy - (d if ca > 0 else db) * py, z))
    return pts


def ring(name, x, y, z_lo, z_hi, r_lo, r_hi, seg=10, rust=1.0, sq=2.4):
    """anel de placa facetado em volta de um membro (z_lo embaixo)"""
    o = loft(name, [section(z_lo, r_lo, r_lo, r_lo, seg, x, y, sq), section(z_hi, r_hi, r_hi, r_hi, seg, x, y, sq)], thick=0.026)
    dense(o)
    paint(o, metal(z_lo, z_hi, rust))
    return o


def shell(name, x, y, prof, seg=10, rust=1.0, sq=2.4, lift=1.0):
    """membro como casca facetada: prof = [(z, r)] de baixo para cima"""
    o = loft(name, [section(z, r, r, r, seg, x, y, sq) for z, r in prof], thick=0.022)
    dense(o)
    paint(o, metal(prof[0][0], prof[-1][0], rust, lift))
    return o


def rivets(pts, r=0.026):
    out = []
    for p in pts:
        b = ball("rivet", p, (r, r, r), seg=(6, 4))
        paint(b, lambda co, n: mix(FE_D, FE_L, 0.25 + 0.7 * ss(0.0, 0.9, n.z - 0.5 * n.y)))
        out.append(b)
    return out


def box(name, c, half, bev=0.15, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2.0)
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bev, segments=1, affect="EDGES")
    m = Matrix.Translation(Vector(c)) @ Euler(rot).to_matrix().to_4x4() @ Matrix.Diagonal((*half, 1))
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return flat_shade(new_mesh(name, bm))


# ------------------------------------------------------------------ cabeça: elmo em caixa de topo chato, fenda larga com brasa fraca
def head():
    hx = 0.0
    z0 = RIG.P("torso")[2]
    cy, cz = -0.25, z0 + 0.55   # entre as ombreiras e à frente delas, o topo na linha do alto delas
    rows = []
    for zz, w, d in ((cz - 0.12, 0.14, 0.13), (cz - 0.02, 0.155, 0.15), (cz + 0.08, 0.155, 0.15), (cz + 0.13, 0.12, 0.115)):
        rows.append(section(zz, w, d, d, 12, hx, cy, sq=4.0))
    helm = loft("helm", rows, thick=0.02, cap=True)
    dense(helm)
    paint(helm, metal(cz - 0.12, cz + 0.13, 0.9))
    rim = loft("rim", [section(cz - 0.13, 0.18, 0.175, 0.175, 12, hx, cy, 4.0), section(cz - 0.06, 0.175, 0.17, 0.17, 12, hx, cy, 4.0)], thick=0.035)   # aro de latão grosso na base
    paint(rim, brass)
    # placa da testa por cima da fenda (aba que faz sombra) e rebites grandes dos lados
    brow = box("brow", (hx, cy - 0.15, cz + 0.06), (0.15, 0.022, 0.03), 0.3)
    paint(brow, metal(cz + 0.03, cz + 0.09, 0.8))
    riv = rivets([(hx + s * 0.13, cy - 0.15, cz - 0.06) for s in (-1, 1)], r=0.022)
    slit = box("slit", (hx, cy - 0.153, cz + 0.01), (0.12, 0.01, 0.033), bev=0.3)
    paint(slit, lambda co, n: SOOT)
    glow = box("visor", (hx, cy - 0.16, cz + 0.008), (0.1, 0.005, 0.012), bev=0.3)
    paint(glow, lambda co, n: hexc(0x6a5a20))   # mais fraco que a fornalha: ela é o ponto mais claro
    parts = [helm, brow, rim, slit, glow] + riv
    hc = Vector((hx, cy, cz - 0.05))
    for o in parts:   # elmo grande: ~1/3 da largura do tronco
        o.data.transform(Matrix.Translation(hc) @ Matrix.Diagonal((1.25, 1.25, 1.25, 1)) @ Matrix.Translation(-hc))
    return {"head": [helm, brow, rim] + riv, "head@flat": [slit], "head@lit": [glow]}


# ------------------------------------------------------------------ tronco: bloco trapezoidal de placas, fornalha grande embutida
def torso():
    z0 = RIG.P("torso")[2]
    core = meta("core", [EL((0, 0.02, z0 + 0.25), (0.34, 0.26, 0.3)), EL((0, 0.06, z0 + 0.5), (0.36, 0.24, 0.14))], res=0.02)
    smooth(core, iters=1, target=300)
    paint(core, metal(z0, z0 + 0.6, 0.6))   # o que aparece entre as placas é ferro, não um buraco preto
    out = [core]
    # couraça em bloco: estreita na cintura, larga e alta nos ombros, frente chata; corcova baixa atrás, também facetada
    rows = []
    for zz, w, d, db, cy in ((z0 + 0.08, 0.32, 0.25, 0.26, 0.02), (z0 + 0.22, 0.38, 0.29, 0.3, 0.02), (z0 + 0.38, 0.43, 0.3, 0.4, 0.02),
                             (z0 + 0.5, 0.43, 0.27, 0.42, 0.04), (z0 + 0.58, 0.36, 0.2, 0.38, 0.08), (z0 + 0.61, 0.3, 0.15, 0.32, 0.1),
                             (z0 + 0.625, 0.2, 0.1, 0.18, 0.11), (z0 + 0.635, 0.1, 0.05, 0.09, 0.12)):
        rows.append(section(zz, w, d, db, 16, 0, cy, sq=4.0))
    br = loft("breast", rows, thick=0.028, cap=True)
    dense(br)
    paint(br, metal(z0 + 0.08, z0 + 0.6))
    out.append(br)
    # costas: duas placas em degrau, no mesmo corte quadrado da couraça (só a metade de trás), com rebites na borda de baixo
    for k, rows_ in enumerate((((z0 + 0.42, 0.45, 0.46), (z0 + 0.58, 0.39, 0.49)), ((z0 + 0.2, 0.43, 0.37), (z0 + 0.4, 0.46, 0.45)))):
        rr = [section(zz, w, 0.1, back - 0.02, 32, 0, 0.02, 4.0)[9:24] for zz, w, back in rows_]
        pl = loft(f"back{k}", rr, closed=False, thick=0.032)
        dense(pl)
        paint(pl, metal(rows_[0][0], rows_[1][0]))
        out.append(pl)
        zb, back = rows_[0][0], rows_[0][2]
        out += rivets([(x, 0.02 + back + 0.005, zb + 0.035) for x in (-0.28, -0.1, 0.1, 0.28)], r=0.026)
    # faixa de placa da barriga com fivela de latão
    for k, (zb, zt) in enumerate(((z0 - 0.06, z0 + 0.05), (z0 + 0.03, z0 + 0.13))):
        f = loft(f"fauld{k}", [section(zb, 0.35 - 0.02 * k, 0.27 - 0.02 * k, 0.28, 16, 0, 0.02, 3.4),
                               section(zt, 0.33 - 0.02 * k, 0.25 - 0.02 * k, 0.27, 16, 0, 0.02, 3.4)], thick=0.032)
        dense(f)
        paint(f, metal(zb, zt))
        out.append(f)
    buckle = box("buckle", (0, -0.29, z0 - 0.005), (0.075, 0.022, 0.05), bev=0.3)
    paint(buckle, brass)
    out.append(buckle)
    # gola em placas em volta do elmo (fecha o vão entre a cabeça e as ombreiras)
    # gola: anel de ferro baixo atrás do elmo (o aro de latão fica no próprio elmo)
    gor = loft("gorget", [section(z0 + 0.44, 0.27, 0.16, 0.24, 12, 0, -0.06, 3.0), section(z0 + 0.52, 0.24, 0.14, 0.22, 12, 0, -0.08, 3.0)], thick=0.035)
    dense(gor)
    paint(gor, metal(z0 + 0.44, z0 + 0.52))
    out.append(gor)
    # fornalha: domina o peito, embutida na placa (moldura grossa rente), grade de barras largas e fogo aceso atrás
    fz, fw, fh = z0 + 0.2, 0.24, 0.19   # inteira no peito (embaixo dele a placa descolava quando o tronco se curva)
    fy = -0.34
    T = 0.04
    # moldura funda: vai da frente até dentro da couraça, sem fresta; barras e fogo recuados dentro dela
    frame = [box("frameT", (0, fy + 0.01, fz + fh), (fw + T, 0.055, T), 0.2), box("frameB", (0, fy + 0.01, fz - fh), (fw + T, 0.055, T), 0.2),
             box("frameL", (-fw, fy + 0.01, fz), (T, 0.055, fh), 0.2), box("frameR", (fw, fy + 0.01, fz), (T, 0.055, fh), 0.2)]
    for o in frame:
        dense(o)
        paint(o, metal(fz - fh - T, fz + fh + T, 0.8, lift=1.2))
    back = box("soot", (0, fy + 0.035, fz), (fw, 0.012, fh), 0.05)
    paint(back, lambda co, n: FIRE_M)
    bars = []
    for i in range(5):   # sem contorno (@flat): o contorno preto das barras comia o fogo entre elas
        x = -fw + 0.08 + (2 * fw - 0.16) * i / 4
        b = box("bar", (x, fy - 0.005, fz), (0.026, 0.014, fh), 0.25)
        paint(b, lambda co, n: mix(FE_K, FE_M, 0.3 + 0.6 * ss(-0.5, 0.8, -n.y + 0.3 * n.z)))
        bars.append(b)
    riv = rivets([(sx_ * fw, fy - 0.05, fz + sz * fh) for sx_ in (-1, 1) for sz in (-1, 1)], r=0.026)
    out += frame + riv
    # fogo: fundo laranja aceso e uniforme atrás da grade, um pouco mais claro embaixo (sem chamas em ponta: liam como dentes)
    glow = box("glow", (0, fy + 0.02, fz), (fw - 0.01, 0.004, fh - 0.01), 0.05)
    dense(glow)
    paint(glow, lambda co, n: mix(hexc(0xff9a30), hexc(0xff5a0c), ss(fz - fh, fz + fh, co.z)))
    fire = [glow, back]
    # ombreiras: três chapas em arco por cima do ombro, como telhas, facetadas; núcleo escuro por baixo
    for s in (-1, 1):
        out += pauldron(s, 1.06 if s < 0 else 1.0)
    return {"torso": out, "torso@lit": fire, "torso@flat": bars}


def pauldron(s, scale):
    ax, ay, az = RIG.P("armL" if s < 0 else "armR")
    out = []
    core = ball("paulcore", (ax + s * 0.06 * scale, ay, az - 0.02), (0.22 * scale, 0.24 * scale, 0.2 * scale), seg=(10, 6))
    flat_shade(core)
    paint(core, metal(az - 0.2, az + 0.2, 0.7))   # por dentro da ombreira é ferro, não um buraco escuro
    out.append(core)
    plates = [   # (centro x, centro z, raio, ângulo inicial, ângulo final, meio comprimento frente-trás)
        (0.03, 0.02, 0.27, -0.6, 1.15, 0.3),
        (0.05, -0.05, 0.275, 0.85, 1.3, 0.23),
    ]
    for k, (dx, dz, r, f0, f1, L) in enumerate(plates):
        r *= scale
        L *= scale
        rows = []
        nq, nf = 7, 7 if k == 0 else 4
        for i in range(nq):
            q = -1 + 2 * i / (nq - 1)
            end = math.sqrt(max(0.0, 1 - q * q))
            rr = r * ((0.45 + 0.55 * end) if k == 0 else (0.8 + 0.2 * end))
            row = []
            for j in range(nf):
                f = f0 + (f1 - f0) * j / (nf - 1)
                row.append((ax + s * (dx * scale + rr * math.sin(f)), ay + q * L, az + dz * scale + rr * math.cos(f) - r * 0.3))
            rows.append(row)
        pl = loft(f"pauldron{k}", rows, closed=False, thick=0.04)
        dense(pl)
        zt = az + dz * scale + r * math.cos(f0) - r * 0.3
        zb = az + dz * scale + r * math.cos(f1) - r * 0.3

        def tint(co, n, f0=f0, f1=f1, dx=dx, dz=dz, r=r):
            vx, vz = s * (co.x - ax) - dx * scale, co.z - (az + dz * scale - r * 0.3)
            k_ = 1 - ss(f0, f1, math.atan2(vx, vz))
            c = mix(FE_D, FE_M, 0.4 + 0.6 * ss(-0.6, 0.7, n.z - 0.3 * n.y))
            c = tuple(min(1.0, x * 1.15) for x in c)          # ombreira um tom acima do tronco
            c = mix(FE_K, c, 0.3 + 0.7 * ss(0.0, 0.3, k_))
            rr_ = rust_at(co, n)
            c = mix(c, mix(RU_D, RU_L, ss(0.3, 0.9, n.z)), rr_ * 0.9)
            return mix(c, FE_L, 0.75 * ss(0.75, 0.93, k_) * (1 - rr_))
        paint(pl, tint)
        out.append(pl)
        # rebites grandes na borda de baixo de cada chapa
        fr = f1 - 0.12
        out += rivets([(ax + s * (dx * scale + r * 0.85 * math.sin(fr)), ay + q * L * 0.7, az + dz * scale + r * 0.85 * math.cos(fr) - r * 0.3 - 0.0)
                       for q in (-0.6, 0.0, 0.6)], r=0.024)
    top = az + 0.02 * scale + 0.27 * scale * 0.7
    out += rivets([(ax + s * 0.05 * scale, ay + q * 0.16 * scale, top + 0.02) for q in (-1, 0, 1)], r=0.034)
    return out


def hips():
    z = RIG.P("hips")[2]
    pel = meta("pelvis", [EL((0, 0.03, z + 0.02), (0.3, 0.22, 0.14))], res=0.02)
    smooth(pel, iters=1, target=200)
    paint(pel, metal(z - 0.12, z + 0.16, 0.8))
    skirt = loft("skirt", [section(z - 0.12, 0.35, 0.26, 0.27, 16, 0, 0.03, 3.0), section(z + 0.06, 0.31, 0.24, 0.25, 16, 0, 0.03, 3.0)], thick=0.03)
    dense(skirt)
    paint(skirt, metal(z - 0.12, z + 0.06))
    return {"hips": [pel, skirt]}


# ------------------------------------------------------------------ braços de anéis empilhados, manoplas enormes
def gauntlet(x, y, z, s):
    """manopla fechada em blocos: dorso, quatro dedos dobrados em placas, polegar por cima"""
    out = [box("hand", (x, y, z), (0.16, 0.17, 0.14), 0.45)]
    for k, dx in enumerate((-0.11, -0.037, 0.037, 0.11)):   # quatro nós dos dedos em relevo na frente, arredondados
        out.append(box("finger", (x + dx, y - 0.13, z - 0.1), (0.04, 0.07, 0.075), 0.6))
    out.append(box("thumb", (x - s * 0.14, y - 0.1, z + 0.0), (0.05, 0.08, 0.09), 0.55, rot=(0.3, 0, 0)))
    for o in out:
        if o.name.startswith("hand"):
            dense(o)
        paint(o, metal(z - 0.22, z + 0.14, 0.9))
    return out


def limbs():
    out = {}
    for side, s in (("L", -1), ("R", 1)):
        ax, ay, az = RIG.P("arm" + side)
        up = [shell("upper", ax, ay, [(az - RIG.arm - 0.02, 0.12), (az - 0.15, 0.13), (az, 0.12)]),
              ring("ub1", ax, ay, az - 0.2, az - 0.12, 0.155, 0.145),
              ring("ub2", ax, ay, az - RIG.arm + 0.01, az - 0.23, 0.16, 0.15)]
        fx, fy, fz = RIG.P("fore" + side)
        # antebraço longo: quatro anéis cada vez maiores até a manopla
        fore = [shell("fore", fx, fy, [(fz - HAND + 0.14, 0.16), (fz - 0.15, 0.15), (fz + 0.02, 0.13)])]
        for k, (zt, zb, rt, rb) in enumerate(((fz + 0.0, fz - 0.08, 0.155, 0.165), (fz - 0.09, fz - 0.17, 0.17, 0.18),
                                              (fz - 0.18, fz - 0.26, 0.185, 0.195), (fz - 0.27, fz - 0.35, 0.2, 0.215))):
            fore.append(ring(f"fb{k}", fx, fy, zb, zt, rb, rt))
        elbow = box("elbow", (fx, fy + 0.13, fz + 0.0), (0.1, 0.06, 0.1), 0.35)
        paint(elbow, metal(fz - 0.1, fz + 0.1, 1.0, lift=1.15))
        fore.append(elbow)
        g = gauntlet(fx, fy - 0.02, fz - HAND + 0.04, s)
        gp = Vector((fx, fy - 0.02, fz - HAND + 0.14))
        for o in g:   # manopla 1,4× mais larga que o antebraço
            o.data.transform(Matrix.Translation(gp) @ Matrix.Diagonal((1.5, 1.5, 1.45, 1)) @ Matrix.Translation(-gp))
        fore += g
        fore += rivets([(fx + 0.215 * math.sin(a), fy - 0.215 * math.cos(a), fz - 0.31) for a in (-0.7, 0.7)], r=0.024)
        out["arm" + side] = up
        out["fore" + side] = fore
        hx, hy, hz = RIG.P("thigh" + side)
        th = [shell("thigh", hx, hy, [(hz - RIG.thigh, 0.2), (hz - 0.14, 0.23), (hz + 0.02, 0.22)]),
              ring("tb", hx, hy, hz - 0.17, hz - 0.08, 0.25, 0.24)]
        kx, ky, kz = RIG.P("shin" + side)
        knee = box("knee", (kx, ky - 0.21, kz - 0.01), (0.16, 0.07, 0.14), 0.35, rot=(0.15, 0, 0))
        dense(knee)
        paint(knee, brass)   # joelheira de latão, como no sprite
        # greva larga (abre embaixo) e bota pesada de ferro com friso de latão
        sh = [shell("shin", kx, ky, [(0.1, 0.23), (kz - 0.15, 0.21), (kz + 0.02, 0.19)]),
              ring("sb", kx, ky, kz - 0.18, kz - 0.1, 0.23, 0.22), knee]
        boot = loft("boot", [section(0.0, 0.24, 0.34, 0.2, 12, kx, ky - 0.06, 3.0), section(0.08, 0.24, 0.33, 0.2, 12, kx, ky - 0.06, 3.0),
                             section(0.14, 0.22, 0.24, 0.2, 12, kx, ky - 0.03, 2.6)], thick=0.03)
        dense(boot)
        paint(boot, lambda co, n: mix(tuple(x * 0.7 for x in metal(0.0, 0.3, 0.6)(co, n)), brass(co, n), ss(0.18, 0.24, -co.y + ky)))   # biqueira de latão
        band = ring("bootband", kx, ky - 0.01, 0.12, 0.18, 0.245, 0.23, rust=0.5)
        paint(band, brass)
        cap = loft("bootcap", [section(0.0, 0.0, 0.0, 0.0, 12, kx, ky - 0.06), section(0.0, 0.24, 0.34, 0.2, 12, kx, ky - 0.06, 3.0)], thick=0.0)
        paint(cap, lambda co, n: FE_K)
        sh += [boot, band, cap]
        out["thigh" + side] = th
        out["shin" + side] = sh
    return out


if __name__ == "__main__":
    reset()
    parts = merge(head(), torso(), hips(), limbs())
    print("DIMS", RIG.dims_ts())
    finish("iron_colossus", RIG, parts, ARGS, ao=0.5, body_center=(0, 0, 0.75), body_dist=4.2, head_dist=1.0)
