# Rimefang Wyrm (chefe, dragão de gelo) modelado no Blender (M10-06). Brief: docs/briefs/rimefang_wyrm.md.
# Rodar: ver tools/blender/README.md. Grava art/rimefang_wyrm.blend e src/game/chars/models/rimefang_wyrm.json.
# Usa a forma "hydra" (build.ts) com um pescoço só: corpo no hips; cauda tail -> tail2 .. tail5 (malha única no tail);
# pescoço neckC -> neckC2 -> head -> jaw; asas wingL/wingR presas ao hips no ombro; 4 patas por cinemática inversa com
# as malhas `legfemur` e `legtibia` (ao longo de +z do three, pivô na origem), como na Venom Hydra.
# Tudo é desenhado no espaço do three (y para cima, frente em +z) e passa ao Blender por B().
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from mathutils.bvhtree import BVHTree  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

SKIN, SKIN_D, SKIN_L = hexc(0x6e8098), hexc(0x2c3648), hexc(0xb8c8d8)
BELLY, BELLY_D = hexc(0xe6e4cc), hexc(0xa4a692)
ICE, ICE_D = hexc(0xd6f6ff), hexc(0x6aa8d0)
HORN = hexc(0xa8d4ec)
WBONE, WBONE_L = hexc(0x6a84a2), hexc(0xbcd2e6)
MEM, MEM_D = hexc(0x9cc4e4), hexc(0x5a7eaa)
NAVY = hexc(0x2a3450)
CLAW, MOUTH, MOUTH_D, EYE, PUPIL = hexc(0xeef4f4), hexc(0x6a1a22), hexc(0x2a0810), hexc(0x7fe8ff), hexc(0x0a1420)
LIGHT3 = Vector((-0.35, 0.82, 0.45)).normalized()  # luz de cima, da frente-esquerda (three)

HIP_Y = 0.46
# cauda: da anca para trás, desce ao chão, curva para a direita e levanta a ponta (como o sprite)
TAIL = [(0, 0.42, -0.4), (0.02, 0.32, -0.7), (0.12, 0.18, -0.96), (0.34, 0.14, -1.1), (0.56, 0.24, -1.04), (0.64, 0.44, -0.86)]
TAIL_R = [0.13, 0.1, 0.075, 0.052, 0.034, 0.012]
TAIL_BONES = ["tail", "tail2", "tail3", "tail4", "tail5"]
# pescoço: base (dentro do peito), dois controles da curva em S e a nuca
NECK = [(0, 0.58, 0.24), (0, 0.86, 0.62), (0, 1.22, 0.38), (0, 1.27, 0.52)]
NECK_SPLIT = 0.5
NECK_R = (0.145, 0.1, 0.08)
HEAD_FWD = (0, -0.22, 1)
# asas: ombro (pivô do osso), punho e pontas dos 4 dedos, e o ponto onde a membrana encosta nas costas
WING_ROOT = (0.13, 0.66, 0.1)
# patas: comprimentos e (encaixe x, y, z; pé x, z), iguais aos da receita; patas retas, de pé
L1, L2 = 0.24, 0.24
LEGS = [(0.13, -0.1, 0.18, 0.15, 0.28), (0.14, -0.08, -0.31, 0.16, -0.22)]


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
def scales(co):
    """escamas: pontos escuros miúdos (o sprite tem escamas em pontinhos)"""
    c = Vector(co)
    v = math.sin(c.x * 61 + 1.3) * math.sin(c.y * 57 + 0.7) * math.sin(c.z * 59 + 2.1)
    return ss(0.5, 0.9, abs(v))


def skin(belly_dir=(0, -1, 0), belly_at=0.35, bands=True):
    """azul-ardósia nas costas com brilho claro em cima, barriga creme em faixas do lado `belly_dir` (no three)"""
    bd = Vector(belly_dir).normalized()

    def fn(co, n):
        m = n3(n)
        g = mix(SKIN_D, SKIN, ss(-0.8, 0.1, m.y))
        g = mix(g, SKIN_L, 0.7 * ss(0.5, 0.95, m.dot(LIGHT3)))
        g = mix(g, SKIN_D, 0.15 * scales(co))
        c = mix(BELLY_D, BELLY, ss(-0.9, 0.2, m.y) * 0.4 + 0.6)
        if bands:
            p = n3(co)
            c = mix(c, BELLY_D, 0.95 * ss(0.72, 0.93, abs(math.cos((p.y * 0.8 + p.z) * 58))))
        return mix(g, c, ss(belly_at - 0.04, belly_at + 0.04, m.dot(bd)))
    return fn


def ice_col(co, n):
    m = n3(n)
    return mix(ICE_D, ICE, ss(-0.4, 0.7, m.dot(LIGHT3) + 0.3 * m.y))


def flat(col):
    return lambda co, n: col


# ---------------------------------------------------------------- peças
def top_y(obj, x, z, start=2.5):
    """altura da superfície de `obj` em (x, z) do three, por raio de cima para baixo"""
    dg = bpy.context.evaluated_depsgraph_get()
    tree = BVHTree.FromObject(obj, dg)
    hit = tree.ray_cast(V3((x, start, z)), Vector((0, 0, -1)))
    return hit[0].z if hit[0] is not None else None


def crystal(name, base3, dir3, h, r, facets=5):
    """cristal de gelo: prisma facetado que afina numa ponta (sombreado chapado, lê como gelo)"""
    d = Vector(dir3).normalized()
    b0 = Vector(base3)
    o = cone(name, V3(b0), V3(b0 + d * h), r, seg=facets)
    paint(o, ice_col)
    flat_shade(o)
    return o


def cluster(name, base3, dir3, h, r, n=3, spread=0.5, seed=0):
    """tufo de cristais: um grande no meio e menores abertos em volta"""
    d = Vector(dir3).normalized()
    side = d.cross(Vector((0, 1, 0)) if abs(d.y) < 0.9 else Vector((1, 0, 0))).normalized()
    up = side.cross(d).normalized()
    out = [crystal(name, base3, d, h, r)]
    for k in range(n):
        a = (k / n) * math.pi * 2 + seed
        dd = (d + (side * math.cos(a) + up * math.sin(a)) * spread).normalized()
        out.append(crystal(name, base3, dd, h * (0.55 + 0.1 * (k % 2)), r * 0.7))
    return out


def body():
    els = [
        EL3((0, 0.54, 0.2), (0.15, 0.2, 0.2)),     # peito erguido
        EL3((0, 0.49, -0.06), (0.135, 0.15, 0.26)),  # barriga
        EL3((0, 0.47, -0.3), (0.14, 0.16, 0.16)),  # anca
        EL3((0, 0.42, -0.4), (0.13, 0.13, 0.12)),  # raiz da cauda
        EL3((0, 0.64, 0.28), (0.16, 0.16, 0.15)),  # base do pescoço
    ]
    for s in (-1, 1):  # ombros (asas e patas) e ancas
        els.append(EL3((s * 0.12, 0.48, 0.18), (0.08, 0.13, 0.1)))  # ombro
        els.append(EL3((s * 0.12, 0.45, -0.3), (0.075, 0.13, 0.15)))  # anca, alongada para a cauda

        els.append(EL3((s * 0.1, 0.64, 0.1), (0.07, 0.06, 0.08)))  # raiz da asa
    m = meta("body", els, res=0.012)
    smooth(m, iters=1, target=2600)
    paint(m, skin(belly_dir=(0, -0.8, 0.45), belly_at=0.45))
    out = [m]
    # cristais do dorso: fileira do meio, maiores no lombo
    for k in range(8):
        z = 0.2 - k * 0.085
        y = top_y(m, 0, z)
        if y is None:
            continue
        h = 0.19 * (1 - 0.4 * abs(k - 3) / 4)
        h *= 0.8 + 0.35 * (k % 2)
        out.append(crystal("bspike", (0, y - 0.04, z), (0, 1, -0.55), h, h * 0.42))
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
    """cauda numa malha só (no osso tail), afinando até a ponta, cristais no dorso e um tufo na ponta"""
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
    o = tube("tail", [V3(p) for p in C], rad, seg=16, cap=True, ref=(0, 0, 1), squash=(1.0, 0.88))
    smooth(o, iters=1)
    out = [paint(o, skin(belly_dir=(0, -1, 0), belly_at=0.15))]
    for i in range(1, len(C) - 3, 2):  # cristais ao longo do dorso, menores para a ponta
        p, r = C[i], rad[i]
        if r < 0.025:
            continue
        d = (C[i + 1] - C[i - 1]).normalized()
        h = 0.15 * r / TAIL_R[0] + 0.04
        out.append(crystal("tspike", tuple(p + Vector((0, r * 0.65, 0))), (-d.x * 0.7, 1, -d.z * 0.7), h, h * 0.4))
    # tufo de cristais na ponta, apontando para fora e para cima
    tip, dt = C[-1], (C[-1] - C[-3]).normalized()
    out += cluster("ttip", tuple(tip - dt * 0.02), tuple(dt + Vector((0, 0.5, 0))), 0.27, 0.05, n=5, spread=0.7)
    return {"tail": out}


def neck():
    n = 64
    ts = [k / n for k in range(n + 1)]
    P = [bez(NECK, t) for t in ts]
    R = [NECK_R[0] + (NECK_R[1] - NECK_R[0]) * ss(0, 0.5, t) + (NECK_R[2] - NECK_R[1]) * ss(0.5, 1, t) for t in ts]
    fw = Vector(HEAD_FWD).normalized()
    P += [P[-1] + fw * 0.03, P[-1] + fw * 0.06]
    R += [R[-1] * 0.85, R[-1] * 0.6]
    front = Vector((0, -0.3, 1)).normalized()  # frente do pescoço (creme) olha para a frente, um pouco para baixo
    o = tube("neckC", [V3(p) for p in P], R, seg=16, cap=True, ref=(1, 0, 0))
    smooth(o, iters=1)
    out = [paint(o, skin(belly_dir=tuple(front), belly_at=0.55))]
    # cristais na nuca, pelo lado de trás do pescoço
    for t in (0.15, 0.32, 0.5, 0.68, 0.85):
        p = bez(NECK, t)
        tg = (bez(NECK, min(1, t + 0.02)) - bez(NECK, max(0, t - 0.02))).normalized()
        v = Vector((0, 0.2, -1))
        back = (v - tg * v.dot(tg)).normalized()
        r = NECK_R[1]
        hh = 0.1 + 0.04 * (round(t * 10) % 2)
        out.append(crystal("nspike", tuple(p + back * r * 0.7), tuple(back - tg * 0.5), hh, hh * 0.42))
    return {"neckC": out}


HS = 1.55  # escala da cabeça (o crítico pediu ~20% maior)


def head_frame():
    pv = Vector(NECK[-1])
    f = Vector(HEAD_FWD).normalized()
    side = Vector((0, 1, 0)).cross(f).normalized()
    up = f.cross(side).normalized()
    if up.y < 0:
        up = -up

    def P(x, y, z):
        return pv + (side * x + up * y + f * z) * HS
    return P, f, side, up


def hinge():
    return head_frame()[0](0, -0.015, 0.02)


def head():
    """cabeça de dragão: crânio com arcada sobre os olhos, focinho comprido e chato, dois pares de chifres longos para
    trás e para cima, espinhos atrás da mandíbula; a mandíbula é peça própria (osso jaw), aberta em repouso"""
    P, f, side, up = head_frame()
    yaw = math.atan2(f.x, f.z)
    pitch = math.atan2(-f.y, math.hypot(f.x, f.z))
    solid, flat_, lit, jaw_s, jaw_f = [], [], [], [], []

    def el(c, ax):
        return EL3(c, tuple(v * HS for v in ax), rot=(pitch, 0, yaw))

    def tb(name, pts, radii, col, seg=8):
        o = tube(name, [V3(P(*q)) for q in pts], [r * HS for r in radii], seg=seg)
        return paint(smooth(o), col)

    def mirror(pts, s_):
        return [(s_ * x, y, z) for x, y, z in pts]
    els = [
        el(P(0, 0.026, 0.0), (0.07, 0.04, 0.075)),     # crânio, chato em cima
        el(P(0, 0.024, 0.1), (0.058, 0.03, 0.09)),     # focinho em cunha, largo na base
        el(P(0, 0.02, 0.2), (0.03, 0.022, 0.05)),      # ponta estreita
    ]
    for s_ in (-1, 1):
        els.append(el(P(s_ * 0.05, 0.0, -0.01), (0.034, 0.038, 0.05)))     # bochechas, crânio mais estreito
        els.append(el(P(s_ * 0.048, 0.052, 0.045), (0.026, 0.014, 0.05)))  # aresta fina da sobrancelha
    m = meta("skull", els, res=0.007)
    bm = bmesh.new()  # corta o que desce abaixo da maxila: ali fica a boca
    bm.from_mesh(m.data)
    cut = [v for v in bm.verts if (n3(v.co) - P(0, -0.012, 0)).dot(up) < 0]
    bmesh.ops.delete(bm, geom=cut, context="VERTS")
    bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary])
    bm.to_mesh(m.data)
    bm.free()
    smooth(m, iters=1, target=1100)
    paint(m, skin(belly_dir=tuple(-up), belly_at=0.6, bands=False))
    solid.append(m)
    def ihorn(name, pts, radii, s_):
        """chifre de gelo facetado (seção de 5 lados, sombreado chapado)"""
        o = tube(name, [V3(P(*q)) for q in mirror(pts, s_)], [r * HS for r in radii], seg=5)
        paint(o, lambda co, n: mix(ICE_D, HORN, ss(-0.4, 0.8, n3(n).y)))
        flat_shade(o)
        return o
    for s_ in (-1, 1):
        # coroa: chifres longos varridos para trás (~55°), quase na linha do pescoço, e dois menores em leque
        solid.append(ihorn("horn", [(0.035, 0.06, -0.01), (0.05, 0.08, -0.09), (0.058, 0.092, -0.17), (0.055, 0.1, -0.25)],
                           [0.024, 0.017, 0.009, 0.002], s_))
        solid.append(ihorn("horn2", [(0.07, 0.03, -0.03), (0.1, 0.04, -0.08), (0.12, 0.045, -0.12)], [0.013, 0.007, 0.002], s_))
        # espinhos atrás da mandíbula (o leque do sprite)
        for k, (y, l) in enumerate(((-0.005, 0.09), (-0.03, 0.075), (-0.055, 0.06))):
            solid.append(crystal("frill", tuple(P(s_ * 0.07, y, -0.02)), tuple(-f * 1.0 + side * s_ * 0.22 - up * 0.12 * k), l * HS,
                                 0.014 * HS, facets=4))
    # crista de cristais do alto do crânio à nuca
    for y, z, h in ((0.075, 0.02, 0.05), (0.07, -0.04, 0.065)):
        solid.append(crystal("crest", tuple(P(0, y - 0.015, z)), tuple(up * 0.7 - f * 0.9), h * HS, h * HS * 0.35))
    # nuca: cobre a ponta do pescoço por baixo do crânio
    nape = ball("nape", V3(P(0, -0.012, -0.03)), tuple(v * HS for v in (0.065, 0.065, 0.06)), rot=(0, 0, yaw), seg=(16, 10))
    solid.append(paint(smooth(nape), skin(belly_dir=tuple(-up), belly_at=0.3, bands=False)))
    # boca: céu e garganta escuros (aparecem com a mandíbula aberta)
    flat_.append(paint(ball("palate", V3(P(0, -0.012, 0.1)), tuple(v * HS for v in (0.046, 0.12, 0.008)), rot=(pitch, 0, yaw), seg=(14, 6)),
                       flat(MOUTH)))
    flat_.append(paint(ball("throat", V3(P(0, -0.022, 0.0)), tuple(v * HS for v in (0.048, 0.04, 0.035)), rot=(0, 0, yaw), seg=(12, 6)),
                       flat(MOUTH_D)))
    for s_ in (-1, 1):
        # presas de cima: uma longa na frente e a fileira de dentes brancos
        flat_.append(tb("fang", mirror([(0.026, -0.01, 0.2), (0.028, -0.04, 0.195), (0.022, -0.07, 0.18)], s_), [0.011, 0.007, 0.001],
                        flat(CLAW), seg=7))
        for k in range(5):
            z = 0.04 + 0.032 * k
            x = s_ * (0.045 - 0.018 * k / 4)
            flat_.append(paint(cone("tooth", V3(P(x, -0.01, z)), V3(P(x, -0.036, z + 0.004)), 0.01 * HS, seg=5), flat(CLAW)))
    # olhos acesos sob a arcada
    for s_ in (-1, 1):
        e = P(s_ * 0.064, 0.044, 0.06)
        ey = yaw + s_ * 0.35
        flat_.append(paint(ball("socket", V3(e - side * s_ * 0.004 * HS), (0.02 * HS, 0.04 * HS, 0.012 * HS), rot=(0, 0, ey), seg=(12, 8)),
                           flat(SKIN_D)))
        lit.append(paint(ball("eye", V3(e + side * s_ * 0.004 * HS), (0.012 * HS, 0.032 * HS, 0.008 * HS), rot=(0, 0, ey), seg=(12, 8)),
                         flat(EYE)))
        flat_.append(paint(ball("pupil", V3(e + side * s_ * 0.019 * HS), (0.004 * HS, 0.004 * HS, 0.014 * HS), rot=(0, 0, ey), seg=(6, 4)),
                           flat(PUPIL)))
    for s_ in (-1, 1):  # narinas
        flat_.append(paint(ball("nostril", V3(P(s_ * 0.016, 0.04, 0.235)), tuple(v * HS for v in (0.004, 0.012, 0.004)), seg=(6, 4)),
                           flat(SKIN_D)))
    # mandíbula: osso próprio, dobradiça atrás; fica aberta em repouso
    jw = meta("jaw", [el(P(0, -0.032, 0.1), (0.045, 0.02, 0.1)), el(P(0, -0.028, 0.0), (0.06, 0.03, 0.05)),
                      el(P(0, -0.032, 0.19), (0.026, 0.016, 0.035))], res=0.007)
    smooth(jw, iters=1, target=500)
    paint(jw, skin(belly_dir=tuple(-up), belly_at=0.0, bands=True))
    jaw_s.append(jw)
    jaw_f.append(paint(ball("jawin", V3(P(0, -0.014, 0.09)), tuple(v * HS for v in (0.034, 0.1, 0.008)), rot=(pitch, 0, yaw), seg=(14, 6)),
                       flat(MOUTH_D)))
    for s_ in (-1, 1):
        jaw_f.append(tb("lfang", mirror([(0.02, -0.018, 0.19), (0.022, 0.01, 0.185), (0.016, 0.035, 0.17)], s_), [0.01, 0.006, 0.001],
                        flat(CLAW), seg=7))
        for k in range(4):
            z = 0.04 + 0.034 * k
            x = s_ * (0.04 - 0.014 * k / 3)
            jaw_f.append(paint(cone("tooth", V3(P(x, -0.016, z)), V3(P(x, 0.006, z + 0.004)), 0.007 * HS, seg=5), flat(CLAW)))
    return solid, flat_, lit, jaw_s, jaw_f


def wing(s):
    """asa de morcego: braço ósseo afunilado e 4 dedos, membrana com volume e borda em arcos fundos entre os dedos.
    Aberta para fora e para trás, ~20° acima da horizontal (a membrana aparece de cima); o bater gira no eixo da frente.
    A membrana é um leque de triângulos a partir do punho (o polígono côncavo inteiro triangulava cruzado)."""
    R = Vector((s * WING_ROOT[0], WING_ROOT[1], WING_ROOT[2]))
    elbow = Vector((s * 0.3, 0.98, 0.02))
    wrist = Vector((s * 0.5, 1.18, -0.1))
    tips = [Vector((s * 1.0, 1.18, -0.44)), Vector((s * 0.95, 0.94, -0.72)), Vector((s * 0.66, 0.78, -0.86)), Vector((s * 0.36, 0.64, -0.76))]
    low = Vector((s * 0.12, 0.52, -0.42))  # onde a membrana encosta nas costas
    bone_col = lambda co, n: mix(WBONE, WBONE_L, 0.25 + 0.5 * ss(-0.3, 0.9, n3(n).dot(LIGHT3)))  # noqa: E731
    solid = []
    arm = catmull([R, elbow + Vector((0, 0.02, 0)), wrist], 4)
    solid.append(paint(smooth(tube("warm", [V3(p) for p in arm], [0.05 - 0.032 * k / (len(arm) - 1) for k in range(len(arm))], seg=8)),
                       bone_col))
    solid.append(crystal("wclaw", tuple(wrist), (s * 0.2, 1, 0.5), 0.13, 0.03))
    for t in tips:
        mid = wrist.lerp(t, 0.5) + Vector((0, 0.025, 0))
        solid.append(paint(tube("finger", [V3(wrist), V3(mid), V3(t)], [0.026, 0.017, 0.005], seg=6), bone_col))
    # borda: das pontas, um arco fundo que recua para o punho entre cada par; o último arco vai até as costas
    rim = [tips[0]]
    for a, c in ((tips[0], tips[1]), (tips[1], tips[2]), (tips[2], tips[3]), (tips[3], low)):
        for f, dip in ((0.25, 0.22), (0.5, 0.32), (0.75, 0.22)):
            rim.append(a.lerp(c, f).lerp(wrist, dip))
        rim.append(c)
    rim += [R, elbow]
    bm = bmesh.new()
    w = bm.verts.new(V3(wrist))
    vs = [bm.verts.new(V3(p)) for p in rim]
    for k in range(len(vs) - 1):
        bm.faces.new((w, vs[k], vs[k + 1]))
    bm.faces.new((w, vs[-1], bm.verts.new(V3(wrist.lerp(elbow, 0.02)))))
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-4)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=2, use_grid_fill=True)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mem = new_mesh("membrane", bm)
    sol = mem.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.024
    sol.offset = 0
    apply_mods(mem)

    def mcol(co, n):
        p = n3(co)
        k = ss(0.15, 0.95, abs(p.x)) * 0.5 + ss(0.7, 1.2, p.y) * 0.5
        c = mix(MEM_D, MEM, k)
        return mix(c, MEM_D, 0.4 * ss(0.0, -0.8, n3(n).y))  # lado de baixo mais escuro
    paint(mem, mcol)
    return solid + [mem]


def legs():
    """uma pata: fêmur e tíbia ao longo de +z do three (Blender -y), pivô na origem. Coxa grossa de músculo, canela que afina
    até o tornozelo azul-marinho, pé largo deitado para a frente com 3 garras brancas longas e um esporão atrás"""
    fem = meta("legfemur", [CAP(B((0, 0, 0)), B((0, 0, L1)), 0.058), EL(B((0, 0.0, L1 * 0.28)), (0.11, 0.13, 0.12)),
                            EL(B((0, 0.02, L1 * 0.72)), (0.062, 0.066, 0.06))], res=0.01)
    fem = paint(smooth(fem, iters=1, target=420), skin(belly_at=0.7, bands=False))
    navy = lambda co, n: mix(NAVY, SKIN_D, 0.6 * ss(-0.3, 0.9, n3(n).dot(LIGHT3)))  # noqa: E731
    tib = meta("legtibia", [CAP(B((0, 0, 0)), B((0, 0, L2 * 0.9)), 0.042), EL(B((0, 0, L2 * 0.12)), (0.065, 0.07, 0.065))], res=0.01)
    sk = skin(belly_at=0.7, bands=False)
    # canela na cor do corpo, azul-marinho só do meio para o tornozelo (z do three = -y do Blender, ao longo da pata)
    tib = paint(smooth(tib, iters=1, target=320), lambda co, n: mix(sk(co, n), navy(co, n), ss(L2 * 0.1, L2 * 0.45, -co[1])))
    # pé: a tíbia acaba no chão em +z; o pé deita para a frente (y do Blender = -z do three... aqui o "para a frente" do pé
    # é -y do Blender quando a pata está de pé, o que no espaço da malha é o eixo y)
    toe = lambda co, n: mix(SKIN_D, SKIN, 0.3 + 0.5 * ss(-0.3, 0.9, n3(n).dot(LIGHT3)))  # noqa: E731
    # o fim da tíbia (z = L2) é o chão. No jogo, o -y local da tíbia aponta para a frente do bicho (a cinemática inversa
    # dobra o joelho para trás): dedos e garras abertos para -y, um pouco acima do chão; esporão para +y
    paw = paint(smooth(ball("paw", B((0, -0.035, L2 * 0.95)), (0.08, 0.085, 0.04), seg=(14, 8))), navy)
    claws = []
    for k in (-1, 0, 1):
        # dedos deitados no chão, a garra curta nasce na ponta do dedo e curva para baixo
        a, b_ = (k * 0.035, -0.05, L2 * 0.96), (k * 0.075, -0.15, L2 * 0.97)
        claws.append(paint(smooth(tube("toe", [B(a), B(b_)], [0.032, 0.024], seg=8)), navy))
        claws.append(paint(cone("claw", B((k * 0.078, -0.155, L2 * 0.965)), B((k * 0.095, -0.22, L2 * 1.0)), 0.022, seg=6), flat(CLAW)))
    return [fem], [tib, paw] + claws


PIV3 = {"hips": (0, HIP_Y, 0)}
for i, b in enumerate(TAIL_BONES):
    PIV3[b] = TAIL[i]
PIV3["neckC"] = tuple(bez(NECK, 0.0))
PIV3["neckC2"] = tuple(bez(NECK, NECK_SPLIT))
PIV3["head"] = tuple(NECK[-1])
PIV3["jaw"] = tuple(hinge())
PIV3["wingL"] = (-WING_ROOT[0], WING_ROOT[1], WING_ROOT[2])
PIV3["wingR"] = WING_ROOT
PIV = {k: B(v) for k, v in PIV3.items()}
PIV["legfemur"] = PIV["legtibia"] = (0, 0, 0)


def build():
    parts = {"hips": body()}
    parts.update(tail())
    parts.update(neck())
    solid, fl, lit, js, jf = head()
    parts["head"], parts["head@flat"], parts["head@lit"] = solid, fl, lit
    parts["jaw"], parts["jaw@flat"] = js, jf
    parts["wingL"], parts["wingR"] = wing(-1), wing(1)
    fem, tib = legs()
    parts["legfemur"], parts["legtibia"] = fem, tib
    ao = [o for k, objs in parts.items() if "@" not in k and not k.startswith("leg") and not k.startswith("wing") for o in objs]
    bake_ao(ao, strength=0.35, distance=0.08)
    return {k: v for k, v in parts.items() if v}


def preview_legs(fem, tib):
    """só para as capturas do Blender: as 4 patas na pose de repouso (o jogo resolve por cinemática inversa)"""
    out = []
    for ax, ay, az, hx, hz in LEGS:
        for s in (-1, 1):
            at = Vector((s * ax, HIP_Y + ay, az))
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
    counts = export_parts(os.path.join(ROOT, "src", "game", "chars", "models", "rimefang_wyrm.json"), parts, PIV)
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
            shot(os.path.join(out, f"bl-rimefang_wyrm-{name}.png"), (0, 0.15, 0.6), 4.6, yaw, pitch)
        hc = B(tuple(Vector(PIV3["head"]) + Vector((0, 0, 0.12))))
        for name, yaw, pitch in [("head-side", 90, 5), ("head-tq", 30, 15)]:
            shot(os.path.join(out, f"bl-rimefang_wyrm-{name}.png"), hc, 1.1, yaw, pitch)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "art", "rimefang_wyrm.blend"))
