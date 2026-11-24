# Dune Leviathan (serpente da areia, chefe) modelado no Blender (M10-02). Brief: docs/briefs/dune_leviathan.md.
# Rodar: ver tools/blender/README.md. Grava art/dune_leviathan.blend e src/game/chars/models/dune_leviathan.json.
# Forma "worm" (build.ts): o monte de areia no hips (no chão); o corpo em cadeia tail -> tail2 .. tail5 e a cabeça no head.
# Tudo é desenhado no espaço do three (y para cima, frente em +z) e passa ao Blender por B().
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

PLATE, PLATE_D, PLATE_L = hexc(0x8a6c3a), hexc(0x6a4e2c), hexc(0xd0a458)
BELLY, BELLY_D, BELLY_L = hexc(0xff9c8a), hexc(0xc86a60), hexc(0xffc8b8)
SAND, SAND_D, SAND_L = hexc(0xd9a048), hexc(0xa0702c), hexc(0xf0c478)
MAW, MAW_L, GUM, TOOTH = hexc(0x2a0408), hexc(0xa02030), hexc(0xe07a80), hexc(0xf6e2bc)
LIGHT = Vector((-0.35, -0.45, 0.82)).normalized()

# espinha: do monte até a cabeça (three), um ponto por osso e o da cabeça no fim
SPINE = [(0, 0.04, -0.12), (0, 0.38, -0.18), (0, 0.72, -0.14), (0, 1.0, 0.02), (0, 1.14, 0.25), (0, 1.11, 0.5)]
BONES = ["tail", "tail2", "tail3", "tail4", "tail5", "head"]
RAD = [0.33, 0.33, 0.33, 0.33, 0.33]
PIV3 = {"hips": (0, 0, 0)}
for b, p in zip(BONES, SPINE):
    PIV3[b] = p
PIV = {k: B(v) for k, v in PIV3.items()}


def V3(p):
    return Vector(B(p))


def lit_mix(n, dark, mid, light, up=0.1):
    n = Vector(n)
    c = mix(dark, mid, ss(-0.7, up, n.z))
    return mix(c, light, 0.7 * ss(0.6, 0.95, n.dot(LIGHT)))


def segment(name, a3, c3):
    """um gomo do corpo: barriga rosa em anéis (dentro da curva, para a frente) e placas marrons nas costas e nos lados"""
    a, c = Vector(a3), Vector(c3)
    d = (c - a).normalized()
    side = Vector((1, 0, 0))
    belly = side.cross(d).normalized()  # perpendicular no plano y-z, para dentro da curva (frente embaixo, chão em cima)
    r0 = RAD[min(BONES.index(name), len(RAD) - 1)]
    L = (c - a).length
    els, plates = [], []
    for k in range(2):  # dois anéis por gomo: vinco entre eles
        m = a + d * L * ((0.22 + 0.3 * k) if name == "tail5" else (0.27 + 0.5 * k))  # o último não entra na cabeça
        els.append(EL(V3(m), (r0, r0 * 0.92, r0)))
        # placa das costas: casca achatada, deslocada para trás, mais larga que o corpo
        plates.append((m - belly * r0 * 0.06, r0))
    body = meta(name, els, res=0.012)
    smooth(body, iters=1, target=500)
    bl = Vector(B(belly))

    A0, DD = V3(tuple(a)), Vector(B(d))

    def tint(co, n):
        u = (Vector(co) - A0).dot(DD) / L * 4  # 4 anéis por gomo
        groove = ss(0.75, 1.0, abs(math.cos(u * math.pi)))
        # a barriga fica do lado de baixo da curva, na sombra: o tom claro não depende da luz, só os sulcos escurecem
        return mix(lit_mix(n, BELLY, BELLY, BELLY_L), BELLY_D, 0.5 * groove)
    paint(body, tint)
    out = [body]
    for i, (m, r) in enumerate(plates):
        # placa: elipsoide aberto para a frente (a barriga fica à mostra), borda escura
        o = ball(f"{name}_plate{i}", B(tuple(m)), (r * 1.26 * (1.04 - 0.08 * i), r * 1.24 * (1.04 - 0.08 * i), r * 0.8), seg=(22, 10))
        # orienta a espessura (eixo menor) ao longo do gomo
        rot = Vector(B(d)).to_track_quat("Z", "X").to_matrix().to_4x4()
        o.matrix_world = Matrix.Translation(V3(tuple(m))) @ rot @ Matrix.Translation(-V3(tuple(m)))
        bpy.context.view_layer.update()
        o.data.transform(o.matrix_world)
        o.matrix_world = Matrix.Identity(4)
        # tira a frente da placa (o que fica do lado da barriga)
        bm = bmesh.new()
        bm.from_mesh(o.data)
        cen = V3(tuple(m))
        kill = [v for v in bm.verts if (v.co - cen).dot(bl) > r * 0.45]
        bmesh.ops.delete(bm, geom=kill, context="VERTS")
        bm.to_mesh(o.data)
        bm.free()
        smooth(o)
        dd, cc = Vector(B(d)), V3(tuple(m))
        paint(o, lambda co, n, dd=dd, cc=cc, r=r: mix(lit_mix(n, PLATE_D, PLATE, PLATE_L, up=0.3), PLATE_D,
                                                     0.75 * ss(-0.1 * r, -0.35 * r, (Vector(co) - cc).dot(dd))))
        out.append(o)
    return out


def head():
    """cabeça: casca marrom com borda grossa; boca em elipse larga virada para a frente e para baixo, gengiva salmão,
    poucos dentes grandes cor de marfim em duas fileiras e fundo vinho"""
    h3 = Vector(SPINE[-1])
    fwd = Vector((0, -0.15, 1)).normalized()
    side = Vector((1, 0, 0))
    up = fwd.cross(side).normalized()
    if up.y < 0:
        up = -up
    W, H = 1.15, 0.88  # elipse 1,3 : 1
    pts = [h3 - fwd * 0.06, h3 + fwd * 0.05, h3 + fwd * 0.15, h3 + fwd * 0.21]
    shell = tube("head", [V3(tuple(p)) for p in pts], [0.33, 0.39, 0.4, 0.37], seg=28, cap=False, ref=tuple(V3(tuple(up))))
    smooth(shell, iters=1)
    paint(shell, lambda co, n: lit_mix(n, PLATE_D, PLATE, PLATE_L, up=0.3))
    back = ball("nape", B(tuple(h3 - fwd * 0.2)), (0.33, 0.33, 0.33), seg=(18, 10))
    paint(smooth(back), lambda co, n: lit_mix(n, PLATE_D, PLATE, PLATE_L, up=0.3))
    mouth = h3 + fwd * 0.215
    ell = lambda a, r: side * math.cos(a) * r * W + up * math.sin(a) * r * H  # noqa: E731
    # borda grossa de casca marrom em volta da boca
    rim = tube("rim", [V3(tuple(mouth + ell(2 * math.pi * k / 32, 0.34))) for k in range(33)], [0.035] * 33, seg=8, cap=False)
    paint(smooth(rim), lambda co, n: lit_mix(n, PLATE_D, PLATE, PLATE_L, up=0.3))
    gum = tube("gum", [V3(tuple(mouth - fwd * 0.02 + ell(2 * math.pi * k / 32, 0.27))) for k in range(33)], [0.035] * 33, seg=8, cap=False)
    paint(smooth(gum), lambda co, n: lit_mix(n, BELLY_D, GUM, BELLY_L))
    # fundo: bacia vinho que escurece para dentro
    maw = ball("maw", B(tuple(mouth - fwd * 0.14)), (0.34, 0.1, 0.31), seg=(20, 12))
    mc = V3(tuple(mouth))
    ax = Vector(B(tuple(fwd)))

    def throat(co, n):
        q = Vector(co) - mc
        radial = (q - ax * q.dot(ax)).length
        return mix(MAW, MAW_L, ss(0.04, 0.24, radial))  # vermelho na borda, escuro no fundo
    paint(maw, throat)
    teeth = []
    for ring_r, n_t, ln, w_, back_off in ((0.26, 14, 0.13, 0.04, 0.0), (0.18, 10, 0.09, 0.032, 0.08)):
        for k in range(n_t):
            a = 2 * math.pi * (k + 0.5 * (ring_r < 0.2)) / n_t
            e = ell(a, 1.0)
            big = 1.35 if abs(math.cos(a)) > 0.85 else (0.75 if k % 2 else 1.0)  # presas dos cantos, alternando
            base = mouth - fwd * back_off + e * ring_r
            tip = base - e.normalized() * ln * big - fwd * 0.03
            t = cone("tooth", V3(tuple(base)), V3(tuple(tip)), w_ * big, seg=8)
            teeth.append(paint(t, lambda co, n: TOOTH))
    # cabeça oval: achata na vertical da boca e alarga nos lados (abertura 1,3 : 1)
    c = V3(tuple(mouth))
    S = (Matrix.Translation(c) @ Matrix.Scale(0.84, 4, Vector(B(tuple(up)))) @ Matrix.Scale(1.08, 4, Vector(B(tuple(side))))
         @ Matrix.Translation(-c))
    for o in [shell, back, rim, gum, maw] + teeth:
        o.data.transform(S)
    return [shell, back, rim], [gum, maw] + teeth


def mound():
    """duna assimétrica (mais comprida para trás) com cratera de borda levantada em volta do corpo e lascas de areia curvas"""
    els = [EL(B((0, -0.08, -0.12)), (0.7, 0.76, 0.2)), EL(B((0, -0.06, -0.55)), (0.4, 0.38, 0.13))]
    import random
    rnd = random.Random(7)
    for k in range(12):  # borda da cratera
        a = 2 * math.pi * k / 12
        els.append(EL(B((math.cos(a) * 0.36, 0.06, -0.12 + math.sin(a) * 0.36)), (0.13, 0.13, rnd.uniform(0.1, 0.14))))
    m = meta("mound", els, res=0.02)
    for v in m.data.vertices:
        if v.co.z < 0:
            v.co.z = 0
    smooth(m, iters=1, target=1000)
    paint(m, lambda co, n: mix(lit_mix(n, SAND, SAND, SAND_L), SAND_D, 0.4 * ss(0.06, 0.0, co.z)))
    flakes = []
    for k in range(8):
        a = 2 * math.pi * k / 8 + rnd.uniform(-0.2, 0.2)
        r0 = 0.4 + rnd.uniform(0, 0.06)
        h = rnd.uniform(0.1, 0.17)
        out = Vector((math.cos(a), 0, math.sin(a)))
        c0 = Vector((0, 0.08, -0.12)) + out * r0
        pts = [c0, c0 + out * 0.06 + Vector((0, h * 0.6, 0)), c0 + out * 0.15 + Vector((0, h, 0))]
        f = tube("flake", [V3(tuple(p)) for p in pts], [0.13, 0.09, 0.035], seg=7, squash=(1.0, 0.3),
                 ref=tuple(V3((out.x, 0, out.z))))
        flakes.append(paint(smooth(f), lambda co, n: lit_mix(n, SAND_D, SAND, SAND_L, up=0.3)))
    return [m] + flakes


def build():
    parts = {"hips@flat": mound()}
    for i in range(5):
        parts[BONES[i]] = segment(BONES[i], SPINE[i], SPINE[i + 1])
    solid, flat_ = head()
    parts["head"] = solid
    parts["head@flat"] = flat_
    bake_ao([o for k, objs in parts.items() if "@" not in k for o in objs], strength=0.35, distance=0.1)
    return parts


if __name__ == "__main__":
    reset()
    parts = build()
    counts = export_parts(os.path.join(ROOT, "src", "game", "chars", "models", "dune_leviathan.json"), parts, PIV)
    print("TRIS", sum(counts.values()), counts)
    if "review" in ARGS:
        review_setup((0, 0, 0))
        out = os.path.join(ROOT, ".shots")
        for name, yaw, pitch in [("side", 90, 8), ("tq", 35, 25), ("front", 0, 12)]:
            shot(os.path.join(out, f"bl-dune_leviathan-{name}.png"), (0, 0, 0.55), 3.6, yaw, pitch)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "art", "dune_leviathan.blend"))
