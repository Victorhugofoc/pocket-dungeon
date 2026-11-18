# Goblin modelado no Blender (teste do pipeline, M3-01 revisão 2). Rodar: ver tools/blender/README.md.
# Grava art/goblin.blend (para abrir e ajustar à mão) e src/game/chars/models/goblin.json (malhas por osso para o jogo).
# Sprite de referência: docs/ref/goblin.png. Blender: z para cima, frente em -y.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

SKIN, SKIN_D, SKIN_L = hexc(0x7d9438), hexc(0x3a4818), hexc(0xa8b858)
EYE, DARK, TOOTH, MOUTH = hexc(0xffd23a), hexc(0x140c08), hexc(0xd8c890), hexc(0x120404)


def skin_tint(top=0.25, bottom=-0.2):
    def f(co, n):
        c = mix(SKIN_D, SKIN, 0.55 + 0.45 * ss(-0.9, 0.2, n.z))
        return mix(c, SKIN_L, 0.35 * ss(0.3, 1.0, n.z))
    return f


# ------------------------------------------------------------------ cabeça (centro na origem; colocada no osso depois)
def head():
    parts = {"solid": [], "flat": [], "lit": []}
    h = meta("head", [
        EL((0, 0.05, 0.05), (0.145, 0.19, 0.125)),               # crânio comprido para trás, baixo
        EL((0, -0.07, 0.0), (0.12, 0.12, 0.115)),                 # massa do rosto
        CAP((-0.13, -0.11, 0.085), (-0.015, -0.205, 0.0), 0.03, stiff=1.6),  # arcada em V, ponta de dentro baixa e à frente
        CAP((0.13, -0.11, 0.085), (0.015, -0.205, 0.0), 0.03, stiff=1.6),
        EL((-0.1, -0.14, -0.035), (0.04, 0.035, 0.03)),           # maçãs
        EL((0.1, -0.14, -0.035), (0.04, 0.035, 0.03)),
        EL((0, -0.14, -0.1), (0.135, 0.11, 0.06)),                # mandíbula larga e projetada
        EL((0, -0.215, -0.125), (0.075, 0.045, 0.04)),            # queixo
        EL((-0.072, -0.21, -0.012), (0.042, 0.045, 0.026), neg=True),  # órbitas fundas sob a arcada
        EL((0.072, -0.21, -0.012), (0.042, 0.045, 0.026), neg=True),
        EL((0, -0.27, -0.08), (0.06, 0.06, 0.03), neg=True),      # boca rasgada, cantos caídos
        EL((-0.06, -0.255, -0.097), (0.045, 0.06, 0.022), neg=True),
        EL((0.06, -0.255, -0.097), (0.045, 0.06, 0.022), neg=True),
    ])
    smooth(h, iters=4, factor=0.5, target=1400)
    paint(h, skin_tint())
    parts["solid"].append(h)
    # nariz em gancho
    nose = tube("nose", [(0, -0.18, 0.02), (0, -0.24, 0.005), (0, -0.28, -0.02), (0, -0.29, -0.045), (0, -0.28, -0.063)],
                [0.04, 0.038, 0.028, 0.016, 0.005], seg=12, squash=(1.15, 1.0), ref=(1, 0, 0))
    smooth(nose)
    paint(nose, skin_tint())
    parts["solid"].append(nose)
    for s in (-1, 1):
        # olho estreito aceso, fundo na órbita
        eye = ball("eye", (s * 0.072, -0.205, -0.012), (0.03, 0.012, 0.013), rot=(0, -s * 0.38, 0), seg=(10, 6))
        paint(eye, lambda co, n: EYE)
        parts["lit"].append(eye)
        pup = ball("pupil", (s * 0.068, -0.215, -0.012), (0.005, 0.004, 0.012), seg=(6, 4))
        paint(pup, lambda co, n: DARK)
        parts["flat"].append(pup)
        # orelha longa em folha, para trás, para fora e para cima
        ear = tube("ear", [(s * 0.12, 0.0, 0.04), (s * 0.2, 0.04, 0.07), (s * 0.3, 0.09, 0.11), (s * 0.37, 0.14, 0.14), (s * 0.44, 0.18, 0.17)],
                   [0.055, 0.075, 0.07, 0.045, 0.005], seg=10, squash=(0.22, 1.0), twist=0.0)
        smooth(ear)
        paint(ear, lambda co, n: mix(SKIN_D, SKIN, 0.6 + 0.4 * n.z))
        parts["solid"].append(ear)
        # presa de baixo subindo por fora do lábio
        tusk = cone("tusk", (s * 0.075, -0.235, -0.115), (s * 0.085, -0.255, -0.045), 0.016, seg=6)
        paint(tusk, lambda co, n: TOOTH)
        parts["solid"].append(tusk)
    # fundo da boca e dentes tortos
    m = ball("mouth", (0, -0.215, -0.09), (0.085, 0.025, 0.02), seg=(12, 6))
    paint(m, lambda co, n: MOUTH)
    parts["flat"].append(m)
    for i, (x, ln) in enumerate([(-0.06, 0.026), (-0.03, 0.034), (0.0, 0.026), (0.03, 0.036), (0.06, 0.024)]):
        top = -0.07 - 0.5 * x * x * 40 * 0.1
        t = cone("tooth", (x, -0.262 + abs(x) * 0.5, top), (x + 0.004, -0.264 + abs(x) * 0.5, top - ln), 0.013, seg=4)
        paint(t, lambda co, n: TOOTH)
        parts["flat"].append(t)
    return parts


if __name__ == "__main__":
    from goblin_body import PIV, PIV3, assemble
    reset()
    parts = assemble(head())
    counts = export_parts(os.path.join(ROOT, "src", "game", "chars", "models", "goblin.json"), parts, PIV)
    print("TRIS", sum(counts.values()), counts)
    if "review" in ARGS:
        review_setup((0, 0, 0))
        out = os.path.join(ROOT, ".shots")
        hc = B((0, PIV3["head"][1] + 0.12, 0.1))
        for name, yaw, pitch in [("front", 0, 5), ("tq", 35, 10), ("side", 90, 5)]:
            shot(os.path.join(out, f"bl-head-{name}.png"), hc, 1.6, yaw, pitch)
        for name, yaw, pitch in [("front", 0, 10), ("tq", 35, 15), ("back", 180, 15)]:
            shot(os.path.join(out, f"bl-body-{name}.png"), (0, 0, 0.75), 4.5, yaw, pitch)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "art", "goblin.blend"))
