# Deathstalker (chefe caçador, escorpião blindado) modelado no Blender (M10-01). Brief: docs/briefs/deathstalker.md.
# Rodar: ver tools/blender/README.md. Grava art/deathstalker.blend e src/game/chars/models/deathstalker.json.
# Forma "scorpion" (build.ts): corpo no hips; pinças armL/R -> foreL/R -> clawL/R; cauda tail -> tail2 .. tail5 (ferrão no tail5);
# patas por cinemática inversa com as malhas `legfemur` e `legtibia` (ao longo de +z do three, pivô na origem).
# Tudo é desenhado no espaço do three (y para cima, frente em +z) e passa ao Blender por B().
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

DARK, DARK_D, STEEL, CHROME = hexc(0x3a3e46), hexc(0x121316), hexc(0x8a909a), hexc(0xf2f5f8)
GOLD, GOLD_D, GOLD_L = hexc(0xd88a1e), hexc(0x7a4a12), hexc(0xffc45a)
EYE, STING = hexc(0xc80a14), hexc(0x7ff3ff)
BELLY = hexc(0x4a2018)
LIGHT = Vector((-0.35, -0.45, 0.82)).normalized()  # luz de cima, da frente-esquerda (Blender)

HIP_Y = 0.34
# cauda: ângulo de cada gomo, medido de "para trás" (-z do three) subindo (+y); comprimentos
TAIL_DEG = [38, 74, 112, 150, 184]
TAIL_LEN = [0.17, 0.2, 0.22, 0.23, 0.23]
TAIL_R = [0.068, 0.076, 0.086, 0.094, 0.1]
TAIL_BONES = ["tail", "tail2", "tail3", "tail4", "tail5"]
# pinça (lado direito, x > 0; o esquerdo é o espelho): ombro, cotovelo, pulso, mão, dobradiça do dedo móvel
CLAW = dict(shoulder=(0.13, 0.35, 0.42), elbow=(0.25, 0.36, 0.53), wrist=(0.28, 0.37, 0.64), hinge=(0.23, 0.39, 0.88))
# patas: comprimentos (iguais aos da receita)
L1, L2 = 0.27, 0.33
# patas: (encaixe em z, pé em x, pé em z), iguais às da receita
ROWS = [(0.16, 0.42, 0.36), (0.04, 0.48, 0.04), (-0.1, 0.46, -0.28), (-0.24, 0.38, -0.56)]


def tdir(deg):
    a = math.radians(deg)
    return Vector((0, math.sin(a), -math.cos(a)))


def tail_points():
    pts = [Vector((0, 0.36, -0.45))]
    for d, L in zip(TAIL_DEG, TAIL_LEN):
        pts.append(pts[-1] + tdir(d) * L)
    return pts


TAIL = tail_points()
PIV3 = {"hips": (0, HIP_Y, 0)}
for i, b in enumerate(TAIL_BONES):
    PIV3[b] = tuple(TAIL[i])
for s, side in ((1, "R"), (-1, "L")):
    PIV3["arm" + side] = (s * CLAW["shoulder"][0], *CLAW["shoulder"][1:])
    PIV3["fore" + side] = (s * CLAW["elbow"][0], *CLAW["elbow"][1:])
    PIV3["claw" + side] = (s * CLAW["hinge"][0], *CLAW["hinge"][1:])
PIV = {k: B(v) for k, v in PIV3.items()}
PIV["legfemur"] = PIV["legtibia"] = (0, 0, 0)


def V3(p):
    return Vector(B(p))


# ---------------------------------------------------------------- pintura
def metal(co, n):
    """metal escuro: claro em cima, brilho cromado forte onde a luz bate (como o sprite)"""
    n = Vector(n)
    c = mix(DARK_D, DARK, ss(-0.7, 0.1, n.z))
    c = mix(c, STEEL, 0.35 * ss(0.4, 0.9, n.z))
    return mix(c, CHROME, 0.95 * ss(0.74, 0.95, n.dot(LIGHT)))


def gold(co, n):
    n = Vector(n)
    c = mix(GOLD_D, GOLD, ss(-0.6, 0.2, n.z))
    return mix(c, GOLD_L, 0.8 * ss(0.6, 0.95, n.dot(LIGHT)))


def flat(col):
    return lambda co, n: col


def shell(name, c3, axes3, seg=(14, 8), rot=(0, 0, 0)):
    """placa de casco: elipsoide (semi-eixos no three: x, y, z)"""
    o = ball(name, B(c3), (axes3[0], axes3[2], axes3[1]), rot=rot, seg=seg)
    return paint(smooth(o), metal)


def ring(name, c3, u3, v3, ru, rv, r, n=22, col=gold):
    """anel fino (faixa dourada) em volta de c3, no plano de u3 e v3"""
    c, u, v = V3(c3), V3(u3).normalized(), V3(v3).normalized()
    pts = [c + u * math.cos(2 * math.pi * k / n) * ru + v * math.sin(2 * math.pi * k / n) * rv for k in range(n + 1)]
    o = tube(name, pts, [r] * len(pts), seg=4, cap=False)
    return paint(smooth(o), col)


# ---------------------------------------------------------------- corpo
def body():
    solid, lit = [], []
    # carapaça (prossoma): domo largo e baixo na frente, borda dourada e crista dourada no meio
    pro = meta("prosoma", [
        EL(B((0, 0.36, 0.25)), (0.17, 0.21, 0.085)),
        EL(B((0, 0.4, 0.22)), (0.1, 0.16, 0.06)),
    ], res=0.012)
    solid.append(paint(smooth(pro, iters=1, target=700), metal))
    solid.append(ring("pro_rim", (0, 0.335, 0.25), (1, 0, 0), (0, 0, 1), 0.168, 0.205, 0.012, n=28))
    crest = tube("crest", [B((0, 0.445, 0.08)), B((0, 0.46, 0.2)), B((0, 0.45, 0.33))], [0.014, 0.024, 0.012], seg=6,
                 squash=(1.0, 0.6))
    solid.append(paint(crest, gold))
    for s in (-1, 1):  # arabesco: duas volutas em espiral abrindo da crista, e um arco até a borda de trás
        pts = []
        for k in range(9):
            f = k / 8
            a = math.pi * (0.5 + 1.6 * f)
            r = 0.075 * (1 - 0.6 * f)
            x, z = s * (0.075 + math.cos(a) * r * 0.8), 0.15 + math.sin(a) * r
            pts.append(B((x, 0.468 - 0.03 * abs(x) / 0.15 - 0.008 * f, z)))
        solid.append(paint(tube("scroll", pts, [0.014 - 0.007 * k / 8 for k in range(9)], seg=5), gold))
        arc = [B((s * 0.02, 0.455, 0.14)), B((s * 0.08, 0.44, 0.12)), B((s * 0.13, 0.41, 0.1))]
        solid.append(paint(tube("arc", arc, [0.012, 0.011, 0.008], seg=5), gold))
    # quelíceras
    for s in (-1, 1):  # quelíceras: presas curtas presas na borda da carapaça
        solid.append(paint(tube("chel", [B((s * 0.04, 0.345, 0.42)), B((s * 0.042, 0.33, 0.48)), B((s * 0.03, 0.31, 0.52))],
                                [0.024, 0.016, 0.004], seg=8), lambda co, n: mix(DARK_D, DARK, 0.5)))
    # olhos: par do meio no alto e grupos dos lados na frente
    for s in (-1, 1):
        # cachinho de contas no meio da frente (o sprite), e dois pontos pequenos de cada lado
        for (ex, ey, ez) in ((0.016, 0.44, 0.39), (0.03, 0.432, 0.365)):
            lit.append(paint(ball("eye", B((s * ex, ey, ez)), (0.017, 0.017, 0.014), seg=(8, 5)), flat(EYE)))
        for k in range(2):
            lit.append(paint(ball("eye", B((s * (0.11 + 0.02 * k), 0.405 - 0.006 * k, 0.43 - 0.03 * k)), (0.018, 0.018, 0.014),
                                  seg=(6, 4)), flat(EYE)))
    # abdômen (mesossoma): 6 placas afinando para trás, cada uma com faixa dourada na borda de trás
    for i in range(5):  # 5 placas largas, uma faixa dourada na borda de trás de cada
        z = 0.03 - i * 0.105
        w = 0.19 - i * 0.01
        h = 0.08 - i * 0.003
        solid.append(shell(f"plate{i}", (0, 0.36, z), (w, h, 0.085)))
        solid.append(ring(f"band{i}", (0, 0.36, z - 0.06), (1, 0, 0), (0, 1, 0), w * 0.93, h * 0.92, 0.02))
    belly = ball("belly", B((0, 0.3, -0.12)), (0.15, 0.4, 0.05), seg=(16, 8))
    solid.append(paint(smooth(belly), lambda co, n: mix(BELLY, DARK_D, 0.25)))
    return solid, lit


def tail():
    parts = {b: [] for b in TAIL_BONES}
    lit = []
    for i, b in enumerate(TAIL_BONES):
        a, c = TAIL[i], TAIL[i + 1]
        d = (c - a).normalized()
        mid = (a + c) / 2
        r = TAIL_R[i]
        # gomo: casca alongada, mais gorda no meio, um pouco achatada dos lados
        seg = meta(b, [CAP(V3(a + d * r * 0.55), V3(c - d * r * 0.4), r), EL(V3(mid), (r * 1.08, r * 1.08, r * 1.08))], res=0.01)
        parts[b].append(paint(smooth(seg, iters=1, target=300), metal))
        # faixa dourada na junta da frente do gomo
        side = Vector((1, 0, 0))
        parts[b].append(ring(b + "_band", tuple(a + d * r * 0.25), tuple(side), tuple(d.cross(side)), r * 1.02, r * 1.02, 0.018, n=18))
    # télson: bulbo e gancho dourado que desce, com a ponta ciano acesa
    p5 = TAIL[-1]
    bd = tdir(205)
    bulb_c = p5 + bd * 0.075
    bulb = meta("bulb", [EL(V3(bulb_c), (0.085, 0.1, 0.085)), CAP(V3(p5 - bd * 0.01), V3(bulb_c), 0.07)], res=0.009)
    parts["tail5"].append(paint(smooth(bulb, iters=1, target=300), metal))
    hook, rad = [bulb_c + bd * 0.06], [0.045]
    for k in range(1, 13):
        f = k / 12
        hook.append(hook[-1] + tdir(205 + 95 * f) * 0.03)
        rad.append(0.045 * (1 - f) ** 0.7 + 0.004)
    cut = 3  # dourado até aqui, depois a ponta acesa
    g = smooth(tube("aculeus", [V3(p) for p in hook[:cut + 1]], rad[:cut + 1], seg=12))
    parts["tail5"].append(paint(g, gold))
    tip = smooth(tube("sting", [V3(p) for p in hook[cut:]], rad[cut:], seg=12))
    lit.append(paint(tip, flat(STING)))
    return parts, lit


def claw(s):
    """pinça de um lado (s = 1 direita, -1 esquerda): braço, antebraço com a mão e o dedo fixo, dedo móvel"""
    X = lambda p: (s * p[0], p[1], p[2])  # noqa: E731
    arm, fore, finger = [], [], []
    sh, el, wr, hg = CLAW["shoulder"], CLAW["elbow"], CLAW["wrist"], CLAW["hinge"]
    a = meta("arm", [CAP(B(X(sh)), B(X(el)), 0.045), EL(B(X(((sh[0] + el[0]) / 2, 0.365, (sh[2] + el[2]) / 2))), (0.05, 0.055, 0.05))],
             res=0.01)
    arm.append(paint(smooth(a, iters=1, target=300), metal))
    arm.append(ring("arm_band", X(el), (1, 0, 0), (0, 1, 0), 0.05, 0.05, 0.011, n=16))
    f = meta("fore", [CAP(B(X(el)), B(X(wr)), 0.05),
                      EL(B(X((0.29, 0.375, 0.76))), (0.115, 0.13, 0.085)),  # mão: cunha larga
                      EL(B(X((0.3, 0.375, 0.84))), (0.095, 0.06, 0.05)),
                      ], res=0.011)
    fore.append(paint(smooth(f, iters=1, target=520), metal))
    fore.append(ring("wrist_band", X(wr), (1, 0, 0), (0, 1, 0), 0.055, 0.055, 0.012, n=16))
    # dedo fixo (de fora): curva para dentro, ponta dourada
    fx = [X((0.34, 0.38, 0.85)), X((0.375, 0.38, 0.93)), X((0.39, 0.38, 1.01)), X((0.38, 0.38, 1.08)), X((0.345, 0.38, 1.13))]
    fore.append(paint(smooth(tube("fixed", [B(p) for p in fx], [0.046, 0.04, 0.03, 0.018, 0.004], seg=10)), gold))
    # dedo móvel (de dentro), preso na dobradiça
    mv = [X(hg), X((0.2, 0.39, 0.95)), X((0.17, 0.39, 1.02)), X((0.165, 0.39, 1.08)), X((0.185, 0.39, 1.12))]
    finger.append(paint(smooth(tube("finger", [B(p) for p in mv], [0.04, 0.034, 0.025, 0.014, 0.004], seg=10)), gold))
    return arm, fore, finger


def legs():
    """uma pata: fêmur e tíbia ao longo de +z do three (Blender -y), pivô na origem; ponta dourada"""
    fem = meta("legfemur", [CAP(B((0, 0, 0)), B((0, 0, L1)), 0.034), EL(B((0, 0, L1 * 0.45)), (0.042, 0.12, 0.042))], res=0.009)
    fem = paint(smooth(fem, iters=1, target=170), metal)
    knee = ring("knee", (0, 0, L1 - 0.02), (1, 0, 0), (0, 1, 0), 0.035, 0.035, 0.009, n=14)
    tib = tube("legtibia", [B((0, 0, 0)), B((0, 0, L2 * 0.4)), B((0, 0, L2 * 0.8))], [0.03, 0.026, 0.018], seg=8)
    tib = paint(smooth(tib), metal)
    tip = tube("foot", [B((0, 0, L2 * 0.8)), B((0, -0.005, L2 * 0.92)), B((0, -0.012, L2))], [0.019, 0.012, 0.003], seg=8)
    paint(tip, gold)
    return [fem, knee], [tib, tip]


def build():
    solid, eyes = body()
    tparts, sting = tail()
    parts = {"hips": solid, "hips@lit": eyes, "tail5@lit": sting}
    parts.update(tparts)
    for s, side in ((1, "R"), (-1, "L")):
        a, f, c = claw(s)
        parts["arm" + side], parts["fore" + side], parts["claw" + side] = a, f, c
    fem, tib = legs()
    parts["legfemur"], parts["legtibia"] = fem, tib
    ao = [o for k, objs in parts.items() if "@" not in k and not k.startswith("leg") for o in objs]
    bake_ao(ao, strength=0.35, distance=0.08)
    return parts


def preview_legs(fem, tib):
    """só para as capturas do Blender: 8 cópias da pata na pose de repouso (o jogo resolve por cinemática inversa)"""
    out = []
    rows = ROWS
    for az, hx, hz in rows:
        for s in (-1, 1):
            at = Vector((s * 0.15, HIP_Y - 0.02, az))
            foot = Vector((s * hx, 0, hz))
            o = foot - at
            h = math.hypot(o.x, o.z)
            d = min(o.length, L1 + L2 - 0.02)
            up = math.atan2(o.y, h) + math.acos(max(-1, min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))))
            knee = math.acos(max(-1, min(1, (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2))))
            yaw = math.atan2(o.x, o.z)
            # three: root.rotation.y = yaw; femur.rotation.x = -up; tibia.rotation.x = pi - knee (em z a partir do joelho)
            m_root = Matrix.Translation(V3(at)) @ Matrix.Rotation(yaw, 4, "Z")  # giro em y do three = z do Blender
            m_fem = m_root @ Matrix.Rotation(-up, 4, "X")  # giro em x do three = o mesmo giro em x do Blender
            m_tib = m_fem @ Matrix.Translation((0, -L1, 0)) @ Matrix.Rotation(math.pi - knee, 4, "X")
            for src, m in ((fem, m_fem), (tib, m_tib)):
                for so in src:
                    c = so.copy()
                    c.data = so.data.copy()
                    link(c)
                    c.matrix_world = m
                    c.hide_render = False
                    out.append(c)
    return out


if __name__ == "__main__":
    reset()
    parts = build()
    counts = export_parts(os.path.join(ROOT, "src", "game", "chars", "models", "deathstalker.json"), parts, PIV)
    print("TRIS", sum(counts.values()), counts)
    print("TAIL", [tuple(round(v, 3) for v in p) for p in TAIL])
    if "review" in ARGS:
        for k in ("legfemur", "legtibia"):
            for o in parts[k]:
                o.hide_render = True
        preview_legs(parts["legfemur"], parts["legtibia"])
        review_setup((0, 0, 0))
        out = os.path.join(ROOT, ".shots")
        for name, yaw, pitch in [("side", 90, 8), ("tq", 35, 25), ("top", 0, 70), ("front", 0, 12)]:
            shot(os.path.join(out, f"bl-deathstalker-{name}.png"), (0, 0, 0.45), 4.2, yaw, pitch)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "art", "deathstalker.blend"))
