# Venom Hydra (chefe, mãe da ninhada) modelada no Blender (M10-04). Brief: docs/briefs/venom_hydra.md.
# Rodar: ver tools/blender/README.md. Grava art/venom_hydra.blend e src/game/chars/models/venom_hydra.json.
# Forma "hydra" (build.ts): corpo no hips; cauda tail -> tail2 .. tail5; três pescoços neckX -> neckX2 -> cabeça
# (X = L, C, R; a cabeça do meio é o osso head, as outras headL/headR); 4 patas por cinemática inversa com as malhas
# `legfemur` e `legtibia` (ao longo de +z do three, pivô na origem), como no Deathstalker.
# Tudo é desenhado no espaço do three (y para cima, frente em +z) e passa ao Blender por B().
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from mathutils.bvhtree import BVHTree  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

GREEN, GREEN_D, GREEN_L, PLATE = hexc(0x2f6a22), hexc(0x0e260b), hexc(0x6aa83a), hexc(0x4f8e30)
CREAM, CREAM_D = hexc(0xd8cf86), hexc(0xa8994e)
SPIKE, SPIKE_D = hexc(0xecd88a), hexc(0x9a8a44)
MOUTH, MOUTH_D, TOOTH, EYE, PUPIL = hexc(0x8a1a1a), hexc(0x3a0606), hexc(0xeedcaa), hexc(0xff4a14), hexc(0x1a0a04)
LIGHT3 = Vector((-0.35, 0.82, 0.45)).normalized()  # luz de cima, da frente-esquerda (three)

HIP_Y = 0.3
OUTLINE = 0.02  # largura do contorno do jogo (build.ts OUTLINE), no espaço do modelo
DROP = 0.08  # tudo desce isto no fim (barriga rente ao chão); os números abaixo são de antes da descida
# cauda: do fim do corpo para trás, curvando para a direita (como o sprite, que a enrola para o lado)
TAIL = [(0, 0.27, -0.5), (0.05, 0.21, -0.78), (0.2, 0.18, -1.0), (0.44, 0.15, -1.1), (0.66, 0.13, -1.0), (0.78, 0.11, -0.74)]
TAIL_R = [0.17, 0.135, 0.1, 0.07, 0.042, 0.008]
TAIL_BONES = ["tail", "tail2", "tail3", "tail4", "tail5"]
# pescoços: base (dentro do peito), dois controles da curva em S e a nuca; (osso do 1º gomo, do 2º, da cabeça)
NECKS = {
    "C": dict(pts=[(0, 0.36, 0.28), (0, 0.62, 0.58), (0, 0.98, 0.36), (0, 1.04, 0.5)], bones=("neckC", "neckC2", "head"),
              fwd=(0, -0.12, 1)),
    "L": dict(pts=[(-0.1, 0.34, 0.3), (-0.24, 0.52, 0.56), (-0.3, 0.8, 0.48), (-0.36, 0.82, 0.62)], bones=("neckL", "neckL2", "headL"),
              fwd=(-0.42, -0.12, 1)),
    "R": dict(pts=[(0.1, 0.34, 0.3), (0.24, 0.52, 0.56), (0.3, 0.8, 0.48), (0.36, 0.82, 0.62)], bones=("neckR", "neckR2", "headR"),
              fwd=(0.42, -0.12, 1)),
}
NECK_SPLIT = 0.5  # parâmetro da curva onde começa o 2º gomo
NECK_R = (0.1, 0.075, 0.068)  # raio na base, no meio e na nuca
# patas: comprimentos e (encaixe x, y, z; pé x, z), iguais aos da receita
L1, L2 = 0.21, 0.2
LEGS = [(0.19, -0.07, 0.24, 0.48, 0.38), (0.19, -0.07, -0.3, 0.5, -0.32)]


def V3(p):
    return Vector(B(tuple(p)))


def EL3(c3, ax3, rot=None):
    return EL(B(tuple(c3)), (ax3[0], ax3[2], ax3[1]), rot=rot)


def n3(n):
    """normal do Blender para o three"""
    return Vector((n[0], n[2], -n[1]))


def bez(pts, t):
    p0, p1, p2, p3 = (Vector(p) for p in pts)
    u = 1 - t
    return p0 * u ** 3 + p1 * 3 * u * u * t + p2 * 3 * u * t * t + p3 * t ** 3


# ---------------------------------------------------------------- pintura
def plates(co):
    """placas de escama mais claras em mosaico (costas e coxas do sprite)"""
    p = n3(co)
    v = math.sin(p.x * 31 + 0.4) * math.sin(p.z * 29 + 1.1) + 0.5 * math.sin((p.x + p.z) * 23)
    return ss(0.55, 0.85, v)


def scales(co):
    """escamas: células escuras pequenas, só um salpicado (o sprite tem escamas em pontos)"""
    c = Vector(co)
    v = math.sin(c.x * 47 + 1.3) * math.sin(c.y * 43 + 0.7) * math.sin(c.z * 45 + 2.1)
    return ss(0.45, 0.85, abs(v))


def skin(belly_dir=(0, -1, 0), belly_at=0.35, grooves=True):
    """verde nas costas, creme do lado `belly_dir` (no three), com sulcos em faixas no creme"""
    bd = Vector(belly_dir).normalized()

    def fn(co, n):
        m = n3(n)
        g = mix(GREEN_D, GREEN, ss(-0.75, 0.15, m.y))
        g = mix(g, GREEN_L, 0.75 * ss(0.55, 0.95, m.dot(LIGHT3)))
        g = mix(g, PLATE, 0.55 * plates(co) * ss(-0.2, 0.4, m.y))
        g = mix(g, GREEN_D, 0.35 * scales(co))
        c = mix(CREAM_D, CREAM, ss(-0.9, 0.1, m.y) * 0.6 + 0.4)
        if grooves:
            p = n3(co)
            c = mix(c, CREAM_D, 0.6 * ss(0.8, 1.0, abs(math.cos((p.y * 0.6 + p.z) * 34))))
        return mix(g, c, ss(belly_at - 0.12, belly_at + 0.08, m.dot(bd)))
    return fn


def spike_col(co, n):
    m = n3(n)
    return mix(SPIKE_D, SPIKE, ss(-0.5, 0.6, m.y))


def flat(col):
    return lambda co, n: col


# ---------------------------------------------------------------- peças
def top_y(obj, x, z, start=2.0):
    """altura da superfície de `obj` em (x, z) do three, por raio de cima para baixo"""
    dg = bpy.context.evaluated_depsgraph_get()
    tree = BVHTree.FromObject(obj, dg)
    hit = tree.ray_cast(V3((x, start, z)), Vector((0, 0, -1)))
    return hit[0].z if hit[0] is not None else None


def plate(name, base3, dir3, h, w, thick):
    """placa triangular achatada (espinho do sprite): base de largura w ao longo de z, ponta em dir3, espessura em x"""
    d = Vector(dir3).normalized()
    b0 = Vector(base3)
    along = Vector((0, 0, 1)) - d * d.z
    if along.length < 1e-3:
        along = Vector((0, 0, 1))
    along.normalize()
    sd = d.cross(along).normalized() * thick / 2
    tip = b0 + d * h - along * h * 0.25
    pts = [b0 + along * w / 2, b0 - along * w / 2, tip]
    bm = bmesh.new()
    a = [bm.verts.new(V3(p + sd)) for p in pts]
    c = [bm.verts.new(V3(p - sd)) for p in pts]
    bm.faces.new(a)
    bm.faces.new(c[::-1])
    for i in range(3):
        j = (i + 1) % 3
        bm.faces.new((a[i], c[i], c[j], a[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return paint(new_mesh(name, bm), spike_col)


def fang(name, base3, dir3, h, r, wide3=(0, 0, 1), flat_=0.6):
    """espinho grosso: cone de base larga inclinado, achatado na direção perpendicular a `wide3` (fica largo ao longo dela)"""
    o = spike(name, base3, dir3, h, r)
    d = Vector(dir3).normalized()
    w = Vector(wide3) - d * d.dot(Vector(wide3))
    if w.length > 1e-3:
        thin = d.cross(w.normalized()).normalized()
        S = Matrix.Translation(V3(base3)) @ Matrix.Scale(flat_, 4, Vector(B(tuple(thin)))) @ Matrix.Translation(-V3(base3))
        o.data.transform(S)
    return o


def spike(name, base3, dir3, h, r):
    d = Vector(dir3).normalized()
    o = cone(name, V3(base3), V3(tuple(Vector(base3) + d * h)), r, seg=7)
    return paint(o, spike_col)


def body():
    els = [
        EL3((0, 0.32, 0.2), (0.22, 0.19, 0.27)),   # peito
        EL3((0, 0.31, -0.07), (0.26, 0.19, 0.3)),  # barriga
        EL3((0, 0.29, -0.35), (0.2, 0.17, 0.23)),  # quadril
        EL3((0, 0.27, -0.52), (0.15, 0.13, 0.13)),  # raiz da cauda
        EL3((0, 0.35, 0.36), (0.14, 0.13, 0.13)),  # base dos pescoços
    ]
    for s in (-1, 1):  # ombros e ancas, onde as patas encaixam
        els.append(EL3((s * 0.17, 0.25, 0.24), (0.09, 0.09, 0.1)))
        els.append(EL3((s * 0.17, 0.24, -0.3), (0.1, 0.09, 0.11)))
    m = meta("body", els, res=0.012)
    smooth(m, iters=1, target=2400)
    paint(m, skin(belly_at=0.08))
    out = [m]
    # espinhos: fileira grande no meio e duas pequenas dos lados, do pescoço até o quadril
    for k in range(10):  # duas fileiras alternadas de cones grossos sobre o lombo
        z = 0.3 - k * 0.085
        x = 0.06 if k % 2 else -0.06
        y = top_y(m, x, z)
        if y is None:
            continue
        h = 0.17 * (1 - 0.35 * abs(k - 4) / 6)
        out.append(fang("spike", (x, y - 0.03, z), (x * 2, 1, -0.6), h, h * 0.42, (0, 0, 1)))
    return out


def catmull(pts, n):
    """curva Catmull-Rom pelos pontos, n amostras por trecho"""
    P = [Vector(p) for p in pts]
    P = [P[0] * 2 - P[1]] + P + [P[-1] * 2 - P[-2]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            t = k / n
            out.append(0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t ** 3))
    out.append(P[-2])
    return out


def tail():
    """cauda numa malha só (no osso tail; gomos separados deixavam o contorno marcar as emendas), afinando até a ponta"""
    n = 5
    C = catmull(TAIL, n)
    rad = []
    for i in range(len(TAIL) - 1):
        for k in range(n):
            f = k / n
            rad.append(TAIL_R[i] + (TAIL_R[i + 1] - TAIL_R[i]) * f)
    rad.append(TAIL_R[-1])
    d0 = (C[1] - C[0]).normalized()
    C = [C[0] - d0 * TAIL_R[0] * 0.5] + C
    rad = [TAIL_R[0] * 0.9] + rad
    o = tube("tail", [V3(p) for p in C], rad, seg=16, cap=True, ref=(0, 0, 1), squash=(1.0, 0.85))
    smooth(o, iters=1)
    out = [paint(o, skin(belly_at=0.1))]
    for i in range(1, len(C) - 2, 2):  # espinhos ao longo do dorso, menores para a ponta
        p, r = C[i], rad[i]
        if r < 0.03:
            continue
        d = (C[i + 1] - C[i - 1]).normalized()
        h = 0.15 * r / TAIL_R[0] + 0.025
        out.append(fang("tspike", tuple(p + Vector((0, r * 0.6, 0))), (-d.x * 0.6, 1, -d.z * 0.6), h, h * 0.42, tuple(d)))
    return {"tail": out}


def neck(key):
    N = NECKS[key]
    pts = N["pts"]
    b1, b2, bh = N["bones"]
    n = 18
    ts = [k / n for k in range(n + 1)]
    P = [bez(pts, t) for t in ts]
    R = [NECK_R[0] + (NECK_R[1] - NECK_R[0]) * ss(0, 0.5, t) + (NECK_R[2] - NECK_R[1]) * ss(0.5, 1, t) for t in ts]
    # o fim entra no crânio, afinando (a emenda com a cabeça fica dentro dela)
    fw0 = Vector(N["fwd"]).normalized()
    P += [P[-1] + fw0 * 0.03, P[-1] + fw0 * 0.06]
    R += [R[-1] * 0.85, R[-1] * 0.6]
    # a frente do pescoço (creme) olha para a frente da cabeça, um pouco para baixo
    fw = Vector(N["fwd"]).normalized()
    front = Vector((fw.x * 0.6, -0.35, fw.z)).normalized()
    out = {b1: [], b2: [], bh: []}
    # pescoço numa malha só, no osso da base (gomos separados deixavam o contorno marcar as emendas)
    o = tube(b1, [V3(p) for p in P], R, seg=16, cap=True, ref=(0, 0, 1))
    smooth(o, iters=1)
    out[b1].append(paint(o, skin(belly_dir=tuple(front), belly_at=0.5)))
    # espinhos na nuca, pelo lado de trás do pescoço
    for t in (0.2, 0.38, 0.56, 0.74, 0.9):
        p = bez(pts, t)
        tg = (bez(pts, min(1, t + 0.02)) - bez(pts, max(0, t - 0.02))).normalized()
        v = Vector((-fw.x, 0.3, -fw.z))
        back = (v - tg * v.dot(tg)).normalized()
        r = NECK_R[1]
        bone = b1
        out[bone].append(fang("nspike", tuple(p + back * r * 0.7), tuple(back - tg * 0.6), 0.085, 0.038, tuple(tg)))
    return out


HS = 1.15  # escala das cabeças (o crítico pediu mais massa de cima)
JAWS = {"C": "jaw", "L": "jawL", "R": "jawR"}


def head_frame(key):
    N = NECKS[key]
    pv = Vector(N["pts"][-1])
    f = Vector(N["fwd"]).normalized()
    side = Vector((0, 1, 0)).cross(f).normalized()
    up = f.cross(side).normalized()
    if up.y < 0:
        up = -up

    def P(x, y, z):
        return pv + (side * x + up * y + f * z) * HS
    return P, f, side, up


def hinge(key):
    P = head_frame(key)[0]
    return P(0, -0.012, 0.02)


def head(key):
    """cabeça de serpente-dragão (pedido do usuário, 2026-11-24): crânio chato em cunha que alarga nas bochechas, focinho
    curto e pontudo, sobrancelha pesada em V sobre olhos acesos em fenda, dois pares de chifres para trás; a mandíbula é
    peça própria (osso jaw*) e fica aberta em repouso, com presas longas curvas em cima e embaixo e língua bifurcada"""
    P, f, side, up = head_frame(key)
    yaw = math.atan2(f.x, f.z)
    solid, flat_, lit, jaw_s, jaw_f = [], [], [], [], []

    def el(c, ax):
        e = EL3(c, tuple(v * HS for v in ax))
        return (*e[:4], (0, 0, yaw), *e[5:])

    def tb(name, pts, radii, col, seg=8):
        o = tube(name, [V3(P(*q)) for q in pts], [r * HS for r in radii], seg=seg)
        return paint(smooth(o), col)

    def mirror(pts, s_):
        return [(s_ * x, y, z) for x, y, z in pts]
    els = [
        el(P(0, 0.025, 0.02), (0.085, 0.04, 0.08)),     # crânio chato e largo
        el(P(0, 0.018, 0.12), (0.06, 0.03, 0.085)),     # focinho curto em triângulo
        el(P(0, 0.012, 0.19), (0.03, 0.02, 0.035)),     # ponta pontuda
    ]
    for s_ in (-1, 1):
        els.append(el(P(s_ * 0.075, 0.0, -0.005), (0.045, 0.04, 0.055)))  # bochechas largas atrás (víbora)
        els.append(el(P(s_ * 0.05, 0.048, 0.06), (0.03, 0.018, 0.055)))   # arcada sobre o olho
    m = meta(key + "_head", els, res=0.007)
    bm = bmesh.new()  # corta o que desce abaixo da maxila: ali fica a boca
    bm.from_mesh(m.data)
    cut = [v for v in bm.verts if (n3(v.co) - P(0, -0.012, 0)).dot(up) < 0]
    bmesh.ops.delete(bm, geom=cut, context="VERTS")
    bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary])
    bm.to_mesh(m.data)
    bm.free()
    smooth(m, iters=1, target=1000)
    paint(m, skin(belly_dir=tuple(-up), belly_at=0.55, grooves=False))
    solid.append(m)
    dark = lambda co, n: mix(GREEN_D, GREEN, 0.5 * ss(-0.3, 0.8, n3(n).y))  # noqa: E731
    for s_ in (-1, 1):
        # sobrancelha pesada em V: alta atrás e fora, desce para a frente e para dentro
        # sobrancelha: lâmina cônica que sai de trás e aponta para a frente e para dentro, por cima do olho
        bb, bt = P(s_ * 0.08, 0.05, -0.005), P(s_ * 0.03, 0.05, 0.1)
        br = cone("brow", V3(bb), V3(bt), 0.024 * HS, seg=8)
        S = Matrix.Translation(V3(bb)) @ Matrix.Scale(0.55, 4, Vector(B(tuple(up)))) @ Matrix.Translation(-V3(bb))
        br.data.transform(S)
        solid.append(paint(br, dark))
        # chifres: o grande sai de trás do crânio e varre para trás e para cima; o da bochecha, para trás e para fora
        solid.append(tb("horn", mirror([(0.045, 0.05, -0.01), (0.068, 0.1, -0.08), (0.08, 0.125, -0.16), (0.072, 0.13, -0.23)], s_),
                        [0.024, 0.017, 0.009, 0.002], spike_col))
        solid.append(tb("horn2", mirror([(0.09, 0.0, -0.02), (0.125, 0.012, -0.075), (0.14, 0.022, -0.125)], s_),
                        [0.016, 0.008, 0.002], spike_col))
    # nuca: cobre a ponta do pescoço por baixo do crânio (a mandíbula aberta deixava ver a emenda)
    nape = ball("nape", V3(P(0, -0.012, -0.03)), tuple(v * HS for v in (0.068, 0.07, 0.06)), rot=(0, 0, yaw), seg=(16, 10))
    solid.append(paint(smooth(nape), skin(belly_dir=tuple(-up), belly_at=0.3, grooves=False)))
    # crista do alto do crânio à nuca
    for y, z, h in ((0.07, 0.04, 0.045), (0.07, -0.01, 0.06), (0.055, -0.06, 0.05)):
        solid.append(fang("crest", tuple(P(0, y - 0.012, z)), tuple(up * 0.8 - f * 0.9), h * HS, h * HS * 0.45, tuple(f)))
    # boca: céu e garganta escuros (aparecem com a mandíbula aberta)
    flat_.append(paint(ball("palate", V3(P(0, -0.01, 0.09)), tuple(v * HS for v in (0.056, 0.1, 0.008)), rot=(0, 0, yaw), seg=(14, 6)),
                       flat(MOUTH)))
    flat_.append(paint(ball("throat", V3(P(0, -0.02, 0.0)), tuple(v * HS for v in (0.052, 0.04, 0.035)), rot=(0, 0, yaw), seg=(12, 6)),
                       flat(MOUTH_D)))
    for s_ in (-1, 1):
        # presas de cima: um par longo e curvo na frente, outro menor, e a fileira miúda
        flat_.append(tb("fang", mirror([(0.026, -0.008, 0.16), (0.03, -0.045, 0.155), (0.022, -0.085, 0.135)], s_), [0.013, 0.008, 0.001],
                        flat(TOOTH), seg=7))
        flat_.append(tb("fang2", mirror([(0.05, -0.008, 0.09), (0.053, -0.035, 0.085), (0.046, -0.06, 0.07)], s_), [0.01, 0.006, 0.001],
                        flat(TOOTH), seg=6))
        for k in range(4):
            z = 0.03 + 0.038 * k
            if abs(z - 0.09) < 0.015:
                continue
            x = s_ * (0.058 - 0.024 * k / 3)
            flat_.append(paint(cone("tooth", V3(P(x, -0.008, z)), V3(P(x, -0.03, z + 0.004)), 0.008 * HS, seg=5), flat(TOOTH)))
    # olhos acesos em fenda, sob a sobrancelha
    for s_ in (-1, 1):
        e = P(s_ * 0.06, 0.034, 0.055)
        lit.append(paint(ball("eye", V3(e), (0.016 * HS, 0.03 * HS, 0.014 * HS), rot=(0, 0, yaw + s_ * 0.35), seg=(10, 6)), flat(EYE)))
        flat_.append(paint(ball("pupil", V3(e + side * s_ * 0.012 * HS), (0.003 * HS, 0.004 * HS, 0.013 * HS), rot=(0, 0, yaw), seg=(6, 4)),
                           flat(PUPIL)))
    for s_ in (-1, 1):  # narinas
        flat_.append(paint(ball("nostril", V3(P(s_ * 0.014, 0.026, 0.2)), tuple(v * HS for v in (0.008, 0.008, 0.006)), seg=(6, 4)),
                           flat(PUPIL)))
    # mandíbula: osso próprio, dobradiça atrás; fica aberta em repouso
    jw = meta(key + "_jaw", [el(P(0, -0.03, 0.09), (0.055, 0.022, 0.085)), el(P(0, -0.026, 0.01), (0.07, 0.032, 0.05)),
                             el(P(0, -0.03, 0.16), (0.026, 0.017, 0.03))], res=0.007)
    smooth(jw, iters=1, target=500)
    paint(jw, skin(belly_dir=tuple(-up), belly_at=0.1, grooves=False))
    jaw_s.append(jw)
    jaw_f.append(paint(ball("jawin", V3(P(0, -0.012, 0.08)), tuple(v * HS for v in (0.042, 0.09, 0.008)), rot=(0, 0, yaw), seg=(14, 6)),
                       flat(MOUTH_D)))
    # língua bifurcada de serpente
    jaw_f.append(tb("tongue", [(0, -0.008, 0.01), (0, -0.004, 0.09), (0, 0.0, 0.15)], [0.011, 0.009, 0.006], flat(MOUTH)))
    for s_ in (-1, 1):
        jaw_f.append(tb("fork", [(0, 0.0, 0.15), (s_ * 0.012, 0.004, 0.19), (s_ * 0.022, 0.006, 0.215)], [0.006, 0.004, 0.001], flat(MOUTH)))
        # presas de baixo, curvas para cima e para dentro
        jaw_f.append(tb("lfang", mirror([(0.022, -0.016, 0.15), (0.026, 0.015, 0.145), (0.018, 0.045, 0.13)], s_), [0.011, 0.007, 0.001],
                        flat(TOOTH), seg=7))
        for k in range(3):
            z = 0.04 + 0.035 * k
            x = s_ * (0.05 - 0.015 * k / 2)
            jaw_f.append(paint(cone("tooth", V3(P(x, -0.014, z)), V3(P(x, 0.008, z + 0.004)), 0.007 * HS, seg=5), flat(TOOTH)))
    return solid, flat_, lit, jaw_s, jaw_f


def legs():
    """uma pata: fêmur e tíbia ao longo de +z do three (Blender -y), pivô na origem; pé com 3 garras creme"""
    fem = meta("legfemur", [CAP(B((0, 0, 0)), B((0, 0, L1)), 0.075), EL(B((0, 0, L1 * 0.4)), (0.1, 0.11, 0.095))], res=0.01)
    fem = paint(smooth(fem, iters=1, target=320), skin(belly_at=0.6, grooves=False))
    tib = meta("legtibia", [CAP(B((0, 0, 0)), B((0, 0, L2 * 0.85)), 0.062), EL(B((0, 0, L2 * 0.95)), (0.075, 0.07, 0.055))],
               res=0.01)
    tib = paint(smooth(tib, iters=1, target=320), skin(belly_at=0.6, grooves=False))
    paw = paint(smooth(ball("paw", B((0, 0.01, L2 * 0.97)), (0.095, 0.045, 0.085), seg=(14, 8))), skin(belly_at=0.6, grooves=False))
    claws = []
    for k in (-1.5, -0.5, 0.5, 1.5):
        base = (k * 0.04, 0.035, L2 * 0.97)
        tip = (k * 0.075, 0.1, L2 + 0.06)
        claws.append(paint(cone("claw", B(base), B(tip), 0.024, seg=6), spike_col))
    return [fem], [tib, paw] + claws


PIV3 = {"hips": (0, HIP_Y, 0)}
for i, b in enumerate(TAIL_BONES):
    PIV3[b] = TAIL[i]
for k, N in NECKS.items():
    b1, b2, bh = N["bones"]
    PIV3[b1] = tuple(bez(N["pts"], 0.0))
    PIV3[b2] = tuple(bez(N["pts"], NECK_SPLIT))
    PIV3[bh] = tuple(N["pts"][-1])
    PIV3[JAWS[k]] = tuple(hinge(k))
PIV3 = {k: (v[0], v[1] - DROP, v[2]) for k, v in PIV3.items()}
PIV = {k: B(v) for k, v in PIV3.items()}
PIV["legfemur"] = PIV["legtibia"] = (0, 0, 0)


def build():
    parts = {"hips": body()}
    parts.update(tail())
    for k in NECKS:
        for bone, objs in neck(k).items():
            parts.setdefault(bone, []).extend(objs)
        solid, fl, lit, js, jf = head(k)
        bh = NECKS[k]["bones"][2]
        parts[bh] = parts.get(bh, []) + solid
        parts[bh + "@flat"] = fl
        parts[bh + "@lit"] = lit
        parts[JAWS[k]] = js
        parts[JAWS[k] + "@flat"] = jf
    for objs in parts.values():  # desce tudo (as patas são à parte)
        for o in objs:
            o.data.transform(Matrix.Translation((0, 0, -DROP)))
    fem, tib = legs()
    parts["legfemur"], parts["legtibia"] = fem, tib
    ao = [o for k, objs in parts.items() if "@" not in k and not k.startswith("leg") for o in objs]
    bake_ao(ao, strength=0.35, distance=0.08)
    return {k: v for k, v in parts.items() if v}


def preview_legs(fem, tib):
    """só para as capturas do Blender: as 4 patas na pose de repouso (o jogo resolve por cinemática inversa)"""
    out = []
    for ax, ay, az, hx, hz in LEGS:
        for s in (-1, 1):
            at = Vector((s * ax, HIP_Y - DROP + ay, az))
            foot = Vector((s * hx, 0, hz))
            o = foot - at
            h = math.hypot(o.x, o.z)
            d = min(o.length, L1 + L2 - 0.02)
            upa = math.atan2(o.y, h) + math.acos(max(-1, min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))))
            knee = math.acos(max(-1, min(1, (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2))))
            yaw = math.atan2(o.x, o.z)
            m_root = Matrix.Translation(V3(at)) @ Matrix.Rotation(yaw, 4, "Z")
            m_fem = m_root @ Matrix.Rotation(-upa, 4, "X")
            m_tib = m_fem @ Matrix.Translation((0, -L1, 0)) @ Matrix.Rotation(math.pi - knee, 4, "X")
            for src, mm in ((fem, m_fem), (tib, m_tib)):
                for so in src:
                    c = so.copy()
                    c.data = so.data.copy()
                    link(c)
                    c.matrix_world = mm
                    c.hide_render = False
                    out.append(c)
    return out


if __name__ == "__main__":
    reset()
    parts = build()
    counts = export_parts(os.path.join(ROOT, "src", "game", "chars", "models", "venom_hydra.json"), parts, PIV)
    print("TRIS", sum(counts.values()), counts)
    print("PIV3", {k: tuple(round(v, 3) for v in p) for k, p in PIV3.items()})
    if "review" in ARGS:
        for k in ("legfemur", "legtibia"):
            for o in parts[k]:
                o.hide_render = True
        preview_legs(parts["legfemur"], parts["legtibia"])
        review_setup((0, 0, 0))
        out = os.path.join(ROOT, ".shots")
        for name, yaw, pitch in [("side", 90, 8), ("tq", 35, 25), ("top", 0, 70), ("front", 0, 12)]:
            shot(os.path.join(out, f"bl-venom_hydra-{name}.png"), (0, 0.1, 0.5), 4.4, yaw, pitch)
        hc = B(tuple(Vector(PIV3["head"]) + Vector((0, 0, 0.12))))
        for name, yaw, pitch in [("head-side", 90, 5), ("head-tq", 30, 15), ("head-front", 0, 5)]:
            shot(os.path.join(out, f"bl-venom_hydra-{name}.png"), hc, 1.0, yaw, pitch)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "art", "venom_hydra.blend"))
