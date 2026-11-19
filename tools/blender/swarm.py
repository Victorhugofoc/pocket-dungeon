# Swarm (diabinho-morcego roxo) modelado no Blender (M3-02). Brief: docs/briefs/swarm.md. Rodar: ver tools/blender/README.md.
# Grava art/swarm.blend e src/game/chars/models/swarm.json. Blender: z para cima, frente em -y.
# Ossos (build.ts, forma "bat"): hips = a bola (origem aqui), wingL/wingR em (±0,16, 0,05) do three, batem em torno do eixo da frente.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

PIV = {"hips": (0, 0, 0), "wingL": (-0.16, 0, 0.05), "wingR": (0.16, 0, 0.05)}
PUR_L, PUR, PUR_D = hexc(0xa676b0), hexc(0x62386f), hexc(0x2c1236)
MEM, MEM_D = hexc(0xa82c3a), hexc(0x4e0d1f)
HORN, HORN_L, EYE, DARK, FANG, MOUTH = hexc(0x8a6a44), hexc(0xe0c890), hexc(0xffd34d), hexc(0x140812), hexc(0xf0e8dc), hexc(0x5a0a16)


def pur(co, n):
    c = mix(PUR_D, PUR, 0.45 + 0.55 * ss(-0.8, 0.3, n.z))
    return mix(c, PUR_L, 0.5 * ss(0.2, 1.0, n.z))


def body():
    parts = {"solid": [], "flat": [], "lit": []}
    b = meta("body", [
        EL((0, 0.02, 0.0), (0.27, 0.24, 0.235)),                  # bola única: cabeça e corpo
        EL((0, -0.06, -0.08), (0.2, 0.19, 0.15)),                 # papada / peito
        CAP((-0.17, -0.14, 0.11), (-0.025, -0.225, 0.045), 0.04, stiff=1.6),  # arcada em V, carranca
        CAP((0.17, -0.14, 0.11), (0.025, -0.225, 0.045), 0.04, stiff=1.6),
        EL((0, -0.235, -0.01), (0.04, 0.035, 0.03)),              # focinho chato
        EL((-0.075, -0.235, 0.025), (0.045, 0.04, 0.026), neg=True),  # órbitas
        EL((0.075, -0.235, 0.025), (0.045, 0.04, 0.026), neg=True),
        EL((0, -0.25, -0.088), (0.125, 0.05, 0.042), neg=True),     # boca larga
    ], res=0.01)
    smooth(b, iters=3, factor=0.5, target=400)
    paint(b, pur)
    parts["solid"].append(b)
    for s in (-1, 1):
        eye = ball("eye", (s * 0.075, -0.222, 0.022), (0.042, 0.012, 0.022), rot=(0, -s * 0.45, 0), seg=(8, 5))
        paint(eye, lambda co, n: EYE)
        parts["lit"].append(eye)
        pup = ball("pupil", (s * 0.07, -0.234, 0.02), (0.006, 0.004, 0.016), seg=(5, 4))
        paint(pup, lambda co, n: DARK)
        parts["flat"].append(pup)
        # presa de cima, branca, por fora da boca
        f = cone("fang", (s * 0.055, -0.255, -0.06), (s * 0.06, -0.265, -0.135), 0.022, seg=5)
        paint(f, lambda co, n: FANG)
        parts["flat"].append(f)
        # chifre curto, do alto para fora e para cima, curvando para trás
        h = tube("horn", [(s * 0.1, -0.04, 0.18), (s * 0.15, -0.03, 0.25), (s * 0.2, 0.0, 0.3), (s * 0.23, 0.05, 0.32)],
                 [0.058, 0.04, 0.022, 0.003], seg=7)
        smooth(h)
        paint(h, lambda co, n: mix(HORN, HORN_L, ss(0.2, 0.32, co.z)))
        parts["solid"].append(h)
        # orelha pontuda logo atrás do chifre
        e = tube("ear", [(s * 0.17, 0.04, 0.1), (s * 0.25, 0.08, 0.15), (s * 0.33, 0.13, 0.2)], [0.055, 0.035, 0.003],
                 seg=8, squash=(0.25, 1.0), ref=(0, 0, 1))
        smooth(e)
        paint(e, lambda co, n: mix(PUR_D, PUR, 0.5 + 0.5 * n.z))
        parts["solid"].append(e)
        # pezinho com garras
        ft = ball("foot", (s * 0.08, -0.05, -0.23), (0.045, 0.06, 0.035), seg=(8, 5))
        paint(ft, lambda co, n: PUR_D)
        parts["solid"].append(ft)
        for k in (-1, 0, 1):
            c = cone("claw", (s * 0.08 + k * 0.022, -0.09, -0.24), (s * 0.08 + k * 0.026, -0.13, -0.26), 0.01, seg=4)
            paint(c, lambda co, n: HORN_L)
            parts["flat"].append(c)
    m = ball("mouth", (0, -0.232, -0.088), (0.115, 0.035, 0.035), seg=(10, 5))  # sorriso largo, fundo vermelho-escuro
    paint(m, lambda co, n: MOUTH)
    parts["flat"].append(m)
    # rabo fino que desce por trás e enrola, com ponta de seta
    tail = tube("tail", [(0, 0.2, -0.1), (0.04, 0.34, -0.18), (0.08, 0.48, -0.2), (0.1, 0.6, -0.14), (0.1, 0.7, -0.04)],
                [0.04, 0.03, 0.022, 0.016, 0.01], seg=6)
    smooth(tail)
    paint(tail, lambda co, n: mix(PUR_D, PUR, 0.6))
    parts["solid"].append(tail)
    tip = cone("tip", (0.1, 0.69, -0.06), (0.1, 0.74, 0.04), 0.05, seg=3)  # ponta de seta
    tip.scale = (1, 1, 1)
    paint(tip, lambda co, n: PUR_D)
    parts["solid"].append(tip)
    bake_ao([b], strength=0.6, distance=0.08)
    return parts


def wing(s):
    """asa de membrana: braço e três dedos de osso roxo, membrana vermelha com volume e borda em arcos.
    Quase na horizontal (lê de cima) e erguida para fora; o bater gira em torno do eixo da frente."""
    root, low = Vector((s * 0.17, 0.0, 0.1)), Vector((s * 0.2, 0.12, -0.04))
    # abertas a uns 20° acima da horizontal e um pouco para trás: a membrana fica de frente para a câmera alta
    wrist = Vector((s * 0.46, 0.0, 0.2))
    tips = [Vector((s * 0.95, 0.06, 0.26)), Vector((s * 0.9, 0.34, 0.12)), Vector((s * 0.55, 0.42, 0.02))]
    solid = []
    arm = tube("warm", [root, (root + wrist) / 2 + Vector((0, 0, 0.03)), wrist], [0.035, 0.03, 0.026], seg=6)
    solid.append(arm)
    claw = cone("wclaw", wrist, wrist + Vector((s * 0.02, -0.06, 0.06)), 0.018, seg=4)
    solid.append(claw)
    for t in tips:
        solid.append(tube("finger", [wrist, wrist.lerp(t, 0.55) + Vector((0, 0, 0.02)), t], [0.022, 0.015, 0.004], seg=5))
    for o in solid:
        paint(o, lambda co, n: mix(PUR_D, PUR_L, 0.4 + 0.4 * n.z))
    # contorno da membrana: raiz, punho, pontas, e entre as pontas um arco que recua para o punho
    outline = [root, wrist, tips[0]]
    for a, c in ((tips[0], tips[1]), (tips[1], tips[2]), (tips[2], low)):
        mid = (a + c) / 2
        outline.append(mid.lerp(wrist, 0.3))
        outline.append(c)
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in outline]
    bm.faces.new(vs)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=1, use_grid_fill=True)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    mem = new_mesh("membrane", bm)
    sol = mem.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.022
    sol.offset = 0
    apply_mods(mem)
    paint(mem, lambda co, n: mix(MEM_D, MEM, 0.35 + 0.65 * ss(0.15, 0.6, abs(co.x))))
    flat_shade(mem)
    return solid + [mem]


if __name__ == "__main__":
    reset()
    bp = body()
    parts = {"hips": bp["solid"], "hips@flat": bp["flat"], "hips@lit": bp["lit"], "wingL": wing(-1), "wingR": wing(1)}
    counts = export_parts(os.path.join(ROOT, "src", "game", "chars", "models", "swarm.json"), parts, PIV)
    print("TRIS", sum(counts.values()), counts)
    if "review" in ARGS:
        review_setup((0, 0, 0))
        out = os.path.join(ROOT, ".shots")
        for name, yaw, pitch in [("front", 0, 10), ("tq", 35, 25), ("top", 0, 70)]:
            shot(os.path.join(out, f"bl-swarm-{name}.png"), (0, 0.05, 0.05), 2.6, yaw, pitch)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "art", "swarm.blend"))
