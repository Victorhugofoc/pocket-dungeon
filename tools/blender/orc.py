# Orc modelado no Blender (D16). Rodar: ver tools/blender/README.md (trocar goblin.py por orc.py).
# Grava art/orc.blend e src/game/chars/models/orc.json (malhas por osso). O machado de duas lâminas continua por código na
# receita (osso "weapon", com a pegada de duas mãos da animação). Sprite de referência: docs/ref/orc.png.
# Blender: z para cima, frente em -y. Pivôs iguais a b.dims da receita "orc" em src/game/chars/cast-enemies.ts.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from mathutils import Euler, Matrix  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

HIP_Y, TORSO_Y, HEAD_Y, SH_Y, SH_X, ARM, HIP_X, THIGH, HAND = 0.84, 0.08, 0.6, 0.52, 0.41, 0.4, 0.2, 0.38, 0.38
T = HIP_Y + TORSO_Y
PIV3 = {
    "hips": (0, HIP_Y, 0), "torso": (0, T, 0), "head": (0, T + HEAD_Y, 0),
    "armL": (-SH_X, T + SH_Y, 0), "armR": (SH_X, T + SH_Y, 0), "foreL": (-SH_X, T + SH_Y - ARM, 0), "foreR": (SH_X, T + SH_Y - ARM, 0),
    "thighL": (-HIP_X, HIP_Y - 0.02, 0), "thighR": (HIP_X, HIP_Y - 0.02, 0),
    "shinL": (-HIP_X, HIP_Y - 0.02 - THIGH, 0), "shinR": (HIP_X, HIP_Y - 0.02 - THIGH, 0),
}
PIV = {k: B(v) for k, v in PIV3.items()}
C3 = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))  # three -> Blender

SKIN, SKIN_D, SKIN_L = hexc(0x557026), hexc(0x2a3010), hexc(0x7e9640)
IRON_D, IRON_M, IRON_L = hexc(0x34363a), hexc(0x6a6d72), hexc(0xb4b8be)
HIDE, HIDE_D, PANTS, PANTS_D = hexc(0x7a4422), hexc(0x3a1d0e), hexc(0x46464a), hexc(0x242428)
WRAP, TUSK, EYE, DARK, MOUTH = hexc(0x8a6a48), hexc(0xeee4c6), hexc(0xe8442a), hexc(0x160e0c), hexc(0x1a0606)


def skin(co, n):
    c = mix(SKIN_D, SKIN, 0.5 + 0.5 * ss(-0.9, 0.2, n.z))
    return mix(c, SKIN_L, 0.4 * ss(0.35, 1.0, n.z))


def xform3(objs, m3):
    mb = C3 @ m3 @ C3.inverted()
    for o in objs:
        o.data.transform(mb)
        o.data.update()


# ------------------------------------------------------------------ cabeça (centro na origem)
def head():
    parts = {"solid": [], "flat": [], "lit": []}
    h = meta("head", [
        EL((0, 0.04, 0.04), (0.12, 0.14, 0.11)),                  # crânio careca, baixo e estreito
        EL((0, 0.03, 0.12), (0.075, 0.1, 0.05)),                  # topo afunilado
        EL((0, -0.06, -0.01), (0.135, 0.12, 0.11)),               # massa do rosto
        CAP((-0.135, -0.13, 0.075), (-0.018, -0.185, 0.02), 0.04, stiff=1.6),  # arcada pesada em V, carrancuda no meio
        CAP((0.135, -0.13, 0.075), (0.018, -0.185, 0.02), 0.04, stiff=1.6),
        EL((-0.11, -0.13, -0.03), (0.05, 0.045, 0.04)),           # maçãs
        EL((0.11, -0.13, -0.03), (0.05, 0.045, 0.04)),
        EL((0, -0.08, -0.1), (0.17, 0.13, 0.08)),                 # mandíbula mais larga que o crânio
        EL((0, -0.2, -0.115), (0.12, 0.07, 0.055)),               # queixo e lábio de baixo projetados (prognata)
        EL((0, -0.2, -0.015), (0.05, 0.045, 0.035)),              # nariz largo e chato
        EL((-0.066, -0.2, -0.004), (0.04, 0.045, 0.022), neg=True),  # órbitas fundas sob a arcada
        EL((0.066, -0.2, -0.004), (0.04, 0.045, 0.022), neg=True),
        EL((0, -0.235, -0.072), (0.095, 0.05, 0.016), neg=True),  # boca: fenda larga entre lábio e mandíbula
    ])
    smooth(h, iters=4, factor=0.5, target=950)
    paint(h, skin)
    parts["solid"].append(h)
    for s in (-1, 1):
        # olho em fenda, inclinado para dentro e para baixo (carranca), fundo na órbita
        eye = ball("eye", (s * 0.066, -0.192, -0.006), (0.026, 0.01, 0.0075), rot=(0, -s * 0.42, 0), seg=(8, 5))
        paint(eye, lambda co, n: EYE)
        parts["lit"].append(eye)
        # orelha pequena e pontuda, para o lado e um pouco para trás
        ear = tube("ear", [(s * 0.11, 0.0, -0.01), (s * 0.17, 0.04, 0.0), (s * 0.23, 0.09, 0.02), (s * 0.3, 0.15, 0.04)],
                   [0.04, 0.036, 0.02, 0.003], seg=8, squash=(0.18, 1.0), ref=(0, 0, 1))
        smooth(ear)
        paint(ear, lambda co, n: mix(SKIN_D, SKIN, 0.55 + 0.45 * n.z))
        parts["solid"].append(ear)
        # presa grossa subindo da mandíbula, por fora do lábio
        tusk = cone("tusk", (s * 0.075, -0.25, -0.1), (s * 0.095, -0.27, -0.005), 0.024, seg=7)
        smooth(tusk)
        paint(tusk, lambda co, n: mix(hexc(0xa89a78), TUSK, ss(-0.1, -0.02, co.z)))
        parts["solid"].append(tusk)
        nost = ball("nostril", (s * 0.022, -0.238, -0.03), (0.012, 0.008, 0.008), seg=(6, 4))
        paint(nost, lambda co, n: DARK)
        parts["flat"].append(nost)
    m = ball("mouth", (0, -0.21, -0.072), (0.09, 0.03, 0.014), seg=(12, 6))
    paint(m, lambda co, n: MOUTH)
    parts["flat"].append(m)
    for x in (-0.045, -0.015, 0.015, 0.045):  # dentes de baixo, curtos
        t = cone("tooth", (x, -0.238 + abs(x) * 0.3, -0.085), (x, -0.24 + abs(x) * 0.3, -0.06), 0.011, seg=4)
        paint(t, lambda co, n: TUSK)
        parts["flat"].append(t)
    return parts


# ------------------------------------------------------------------ corpo
def torso():
    _, _, z0 = PIV["torso"]
    t = meta("torso", [
        EL((0, 0.0, z0 + 0.0), (0.19, 0.15, 0.1)),                # cintura fina
        EL((0, -0.03, z0 + 0.13), (0.22, 0.19, 0.14)),            # barriga
        EL((0, -0.01, z0 + 0.35), (0.31, 0.19, 0.19)),            # peito largo
        EL((-0.13, -0.14, z0 + 0.38), (0.12, 0.06, 0.09)),        # peitorais
        EL((0.13, -0.14, z0 + 0.38), (0.12, 0.06, 0.09)),
        EL((0, 0.1, z0 + 0.43), (0.23, 0.14, 0.15)),              # corcunda
        EL((0, 0.04, z0 + 0.55), (0.29, 0.15, 0.1)),              # trapézio alto, esconde o pescoço
        EL((-0.3, 0.0, z0 + 0.48), (0.12, 0.13, 0.1)),            # ombros
        EL((0.3, 0.0, z0 + 0.48), (0.12, 0.13, 0.1)),
    ], res=0.012)
    smooth(t, iters=2, target=760)

    def tint(co, n):
        if co.z < z0 + 0.05:
            return mix(PANTS_D, PANTS, 0.5)
        c = skin(co, n)
        if co.y > 0.05:  # sulco da coluna e sombra entre as omoplatas
            c = mix(c, SKIN_D, 0.55 * (1 - ss(0.0, 0.05, abs(co.x))) + 0.25 * (1 - ss(0.05, 0.14, abs(co.x))) * ss(z0 + 0.2, z0 + 0.4, co.z))
        return c
    paint(t, tint)
    # correias de couro cruzadas no peito, de um ombro ao lado oposto da barriga
    straps = []
    for s in (-1, 1):
        pts, rad = [], []
        for i in range(9):
            u = i / 8
            x = s * (0.34 - 0.62 * u)
            zz = z0 + 0.52 - 0.42 * u
            d = 0.2 + 0.035 * (1 - (2 * u - 1) ** 2)  # acompanha a curva do peito
            depth = (1 - min(1, (x / 0.36) ** 2)) ** 0.5
            pts.append((x, -0.01 - d * max(0.25, depth) - 0.012, zz))
            rad.append(0.05)
        st = tube("strap", pts, rad, seg=6, squash=(1.0, 0.25), ref=(0, 1, 0))
        paint(st, lambda co, n: mix(HIDE_D, HIDE, 0.55 + 0.45 * n.z))
        straps.append(st)
    buckle = ball("buckle", (0, -0.245, z0 + 0.285), (0.05, 0.02, 0.05), seg=(10, 6))
    paint(buckle, lambda co, n: mix(IRON_M, IRON_L, ss(-0.3, 0.6, n.z)))
    # ombreira: peça única de chumbo que envolve o ombro esquerdo e desce em quatro lâminas em degrau, cada uma com o reflexo frio
    # só na borda de baixo. Presa ao tronco (no braço giraria com a pegada do machado).
    X0, Y0 = -0.38, T + 0.66
    lam = [((X0 - i * 0.06, -0.0, Y0 - i * 0.105), 0.17 - i * 0.01) for i in range(4)]
    pd = meta("pauldron", [EL(B((x, y, -z)), (r * 1.05, r * 1.0, r * 0.3), rot=(0, -(0.35 + i * 0.25), 0), stiff=4.0)
                           for i, ((x, z, y), r) in enumerate(lam)], res=0.012)
    smooth(pd, iters=1, target=420)
    cuts = [B((x, y, -z))[2] for (x, z, y), _ in lam]

    def ptint(co, n):
        d = min(abs(co.z - (c - 0.035)) for c in cuts)  # borda de baixo de cada lâmina
        if d < 0.014 and n.z < 0.6:
            return IRON_L
        if d < 0.026 and n.z < 0.6:
            return IRON_D
        return mix(IRON_D, IRON_M, 0.35 + 0.65 * ss(-0.2, 1.0, n.z))
    paint(pd, ptint)
    pad = [pd]
    for i, ((x, z, y), r) in enumerate(lam):  # rebites
        rv = ball("rivet", B((x - 0.03, y + 0.05, -z - 0.09)), (0.017, 0.017, 0.017), seg=(6, 4))
        paint(rv, lambda co, n: IRON_L)
        pad.append(rv)
    return {"torso": [t, buckle] + straps + pad}


def limbs():
    out = {}
    for side, s in (("L", -1), ("R", 1)):
        ax, ay, az = PIV["arm" + side]
        a = meta("arm" + side, [EL((ax + s * 0.02, ay, az - 0.02), (0.155, 0.145, 0.13)),      # deltoide
                                 CAP((ax, ay, az - 0.05), (ax, ay, az - ARM), 0.105),
                                 EL((ax, ay - 0.03, az - 0.21), (0.12, 0.12, 0.12))], res=0.014)  # bíceps
        smooth(a, iters=1, target=300)
        paint(a, skin)
        fx, fy, fz = PIV["fore" + side]
        f = meta("fore" + side, [CAP((fx, fy, fz), (fx, fy, fz - 0.3), 0.11),
                                  EL((fx, fy, fz - 0.1), (0.125, 0.12, 0.14)),
                                  EL((fx, fy - 0.01, fz - HAND), (0.085, 0.09, 0.085)),            # punho
                                  EL((fx + s * 0.05, fy - 0.06, fz - HAND + 0.02), (0.04, 0.04, 0.045))],  # polegar
                 res=0.014)
        smooth(f, iters=1, target=320)
        paint(f, skin)
        br = tube("bracer", [(fx, fy, fz - 0.03), (fx, fy, fz - 0.12), (fx, fy, fz - 0.3)], [0.15, 0.15, 0.135], seg=12)
        paint(br, lambda co, n: mix(HIDE_D, HIDE, 0.5 + 0.5 * n.z))
        hx, hy, hz = PIV["thigh" + side]
        th = meta("thigh" + side, [CAP((hx, hy, hz), (hx, hy, hz - THIGH), 0.15), EL((hx, hy, hz), (0.18, 0.17, 0.12))], res=0.016)
        smooth(th, iters=1, target=240)
        paint(th, lambda co, n: mix(PANTS_D, PANTS, 0.5 + 0.5 * n.z))
        kx, ky, kz = PIV["shin" + side]
        sh = meta("shin" + side, [CAP((kx, ky, kz), (kx, ky, kz - 0.32), 0.115),
                                  EL((kx, ky - 0.07, kz - 0.385), (0.115, 0.165, 0.055)),  # pé descalço largo
                                  EL((kx, ky - 0.0, kz - 0.36), (0.1, 0.1, 0.06))], res=0.016)
        smooth(sh, iters=1, target=320)

        def stint(co, n, kz=kz):
            if co.z > kz - 0.05:
                return mix(PANTS_D, PANTS, 0.5 + 0.5 * n.z)  # barra da calça no joelho
            return skin(co, n)
        paint(sh, stint)
        nails = []
        for zz in (0.13, 0.22):  # faixas de couro enroladas na canela
            w = tube("wrap", [(kx, ky, kz - zz + 0.025), (kx, ky, kz - zz - 0.025)], [0.122 - zz * 0.03, 0.12 - zz * 0.03], seg=10)
            paint(w, lambda co, n: mix(HIDE_D, WRAP, 0.5 + 0.5 * n.z))
            nails.append(w)
        for i in (-1, 0, 1):
            c = cone("nail", (kx + i * 0.055, ky - 0.21, kz - 0.4), (kx + i * 0.06, ky - 0.255, kz - 0.405), 0.024, seg=5)
            paint(c, lambda co, n: TUSK)
            nails.append(c)
        out["arm" + side] = [a]
        out["fore" + side] = [f, br]
        out["thigh" + side] = [th]
        out["shin" + side] = [sh] + nails
    return out


def hips():
    _, _, z = PIV["hips"]
    h = meta("hips", [EL((0, 0.0, z), (0.27, 0.2, 0.19))], res=0.016)
    smooth(h, iters=1, target=260)
    paint(h, lambda co, n: mix(PANTS_D, PANTS, 0.5 + 0.5 * n.z))
    belt = tube("belt", [(0, 0, z + 0.05), (0, 0, z + 0.13)], [0.29, 0.28], seg=16, squash=(1.0, 0.8), ref=(1, 0, 0))
    paint(belt, lambda co, n: mix(HIDE_D, HIDE, 0.6 + 0.4 * n.z))
    buckle = ball("buckle", (0, -0.235, z + 0.09), (0.065, 0.025, 0.06), seg=(10, 6))
    paint(buckle, lambda co, n: mix(IRON_M, IRON_L, ss(-0.3, 0.6, n.z)))
    parts = [h, belt, buckle]
    for y, w, ln in ((-1, 0.17, 0.4), (1, 0.17, 0.26)):  # tanga de couro na frente e atrás, rente ao corpo
        f = tube("flap", [(0, y * 0.2, z + 0.06), (0, y * 0.21, z - 0.08), (0, y * 0.2, z - ln)], [w, w * 0.95, w * 0.85], seg=8,
                 squash=(1.0, 0.12), ref=(0, 0, 1))
        smooth(f)
        paint(f, lambda co, n: mix(HIDE_D, HIDE, 0.5 + 0.3 * n.z))
        parts.append(f)
    return {"hips": parts}


def assemble(head_parts):
    hx, hy, _ = PIV3["head"]
    # cabeça baixa e projetada; girada para trás para olhar à frente apesar da curva do tronco (lean)
    m3 = Matrix.Translation((hx, hy + 0.04, 0.17)) @ Euler((-0.25, 0, 0)).to_matrix().to_4x4()
    xform3(head_parts["solid"] + head_parts["flat"] + head_parts["lit"], m3)
    parts = {"head": head_parts["solid"], "head@flat": head_parts["flat"], "head@lit": head_parts["lit"]}
    for d in (torso(), limbs(), hips()):
        for k, v in d.items():
            parts.setdefault(k, []).extend(v)
    solids = [o for k, v in parts.items() if "@" not in k for o in v]
    bake_ao(solids, strength=0.8, distance=0.12)
    return parts


if __name__ == "__main__":
    reset()
    parts = assemble(head())
    counts = export_parts(os.path.join(ROOT, "src", "game", "chars", "models", "orc.json"), parts, PIV)
    print("TRIS", sum(counts.values()), counts)
    if "review" in ARGS:
        review_setup((0, 0, 0))
        out = os.path.join(ROOT, ".shots")
        hc = B((0, PIV3["head"][1] + 0.04, 0.17))
        for name, yaw, pitch in [("front", 0, 5), ("tq", 35, 10), ("side", 90, 5)]:
            shot(os.path.join(out, f"bl-orc-head-{name}.png"), hc, 1.6, yaw, pitch)
        for name, yaw, pitch in [("front", 0, 10), ("tq", 35, 15), ("back", 180, 15)]:
            shot(os.path.join(out, f"bl-orc-body-{name}.png"), (0, 0, 0.95), 5.5, yaw, pitch)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "art", "orc.blend"))
