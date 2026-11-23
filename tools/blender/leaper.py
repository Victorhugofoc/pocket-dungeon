# Leaper (sapo dourado de chifres que salta no herói) modelado no Blender (M9-05). Brief: docs/briefs/leaper.md.
# Rodar: ver tools/blender/README.md. Forma "toad" (build.ts): corpo no osso hips, cabeça e 4 patas rígidas presas a ele.
# Pivôs iguais a b.dims da receita (cast-enemies.ts): cabeça em (0, headY, arm), patas da frente em (±shoulderX, shoulderY, arm),
# de trás em (±hipX, 0, -thigh), relativos ao quadril em hipY (three: y para cima, frente em +z).
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from humanoid import finish  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
DIMS = dict(hipY=0.42, headY=0.3, shoulderY=-0.02, shoulderX=0.25, arm=0.3, hipX=0.36, thigh=0.14)


class ToadRig:
    def __init__(self, hipY, headY, shoulderY, shoulderX, arm, hipX, thigh):
        self.d = dict(hipY=hipY, headY=headY, shoulderY=shoulderY, shoulderX=shoulderX, arm=arm, hipX=hipX, thigh=thigh)
        self.p3 = {
            "hips": (0, hipY, 0), "head": (0, hipY + headY, arm),
            "armL": (-shoulderX, hipY + shoulderY, arm), "armR": (shoulderX, hipY + shoulderY, arm),
            "thighL": (-hipX, hipY, -thigh), "thighR": (hipX, hipY, -thigh),
        }
        self.piv = {k: B(v) for k, v in self.p3.items()}

    def P(self, bone):
        return self.piv[bone]

    def dims_ts(self):
        return "{ " + ", ".join(f"{k}: {v}" for k, v in self.d.items()) + " }"


RIG = ToadRig(**DIMS)

GOLD, GOLD_D, GOLD_L = hexc(0xe4961a), hexc(0x9a460a), hexc(0xffc640)
CREAM, CREAM_D = hexc(0xffeab8), hexc(0xf0b870)
SPOT, SPOT_RIM = hexc(0x8a4a10), hexc(0x5a2a0a)
WART, WART_L = hexc(0xc85a10), hexc(0xff9a30)
HORN, HORN_L = hexc(0xb07a28), hexc(0xf0d47a)
EYE, PUPIL, MOUTH = hexc(0xffd84a), hexc(0x1a1008), hexc(0x3a1c0c)
TOE = hexc(0xf4d888)


def gold(co, n):
    c = mix(GOLD_D, GOLD, 0.3 + 0.7 * ss(-0.75, 0.35, n.z))
    return mix(c, GOLD_L, 0.45 * ss(0.45, 1.0, n.z))


# manchas do dorso: direção vista do centro do corpo (yaw: 0 = frente, + para +x; pitch: + para cima) e raio em rad;
# viram verrugas em relevo (`warts`); pela direção, não dependem de onde a superfície passa
SPOT_C = Vector((0, 0.1, 0.4))
SPOTS = [((0.0, 1.25), 0.2), ((-0.55, 1.0), 0.17), ((0.6, 0.95), 0.18), ((-2.6, 0.95), 0.17), ((2.5, 0.9), 0.16),
         ((-1.2, 0.75), 0.15), ((1.25, 0.7), 0.16), ((3.1, 0.55), 0.18), ((-2.2, 0.4), 0.13), ((2.15, 0.35), 0.14),
         ((-1.75, 0.3), 0.12), ((1.7, 0.25), 0.12), ((-0.3, 0.65), 0.1), ((0.35, 0.6), 0.1),
         ((-2.95, 0.25), 0.12), ((2.85, 0.15), 0.11), ((-0.9, 1.3), 0.12), ((0.95, 1.25), 0.12), ((3.14, 1.15), 0.13)]


def warts(name, target, center, dirs, k=1.0):
    """verrugas em relevo: lente achatada pousada na pele (raio vindo de fora para dentro, a partir de `center`) com anel castanho
    e miolo laranja pintados na própria malha, de borda limpa. dirs = [((yaw, pitch), raio angular)]"""
    out = []
    c = Vector(center)
    for (yaw, pitch), r in dirs:
        d = Vector((math.sin(yaw) * math.cos(pitch), -math.cos(yaw) * math.cos(pitch), math.sin(pitch)))
        ok, hit, nrm, _ = target.ray_cast(c + d * 3.0, -d)
        if not ok:
            continue
        rad = r * (hit - c).length * k
        q = nrm.to_track_quat("Z", "Y")
        w = ball(name, hit + nrm * rad * 0.05, (rad, rad, rad * 0.32), rot=q.to_euler(), seg=(12, 6))
        smooth(w)

        def f(co, n_, h=hit.copy(), R=rad):
            t = (Vector(co) - h).length / R
            return mix(mix(WART, WART_L, 0.3 + 0.7 * ss(0.5, 0.0, t)), SPOT_RIM, ss(0.45, 0.7, t))
        paint(w, f)
        out.append(w)
    return out


def belly(co, n):
    """dourado no dorso, creme na barriga e no papo (frente e embaixo)"""
    g = gold(co, n)
    cream = mix(CREAM_D, CREAM, 0.4 + 0.6 * ss(-0.6, 0.3, n.z))
    k = ss(-0.3, -0.65, n.y) * ss(0.15, -0.25, n.z) * ss(0.25, 0.1, abs(co.x)) + ss(-0.4, -0.8, n.z) * 0.8
    return mix(g, cream, min(1.0, k))


# ------------------------------------------------------------------ corpo: ovo sentado, a frente bem mais alta, papo creme
def body():
    b = meta("body", [
        EL((0, 0.0, 0.43), (0.41, 0.36, 0.28), rot=(-0.7, 0, 0)),      # tronco erguido na frente, garupa baixa
        EL((0, -0.17, 0.56), (0.35, 0.24, 0.3), rot=(-0.6, 0, 0)),     # peito e papo, alto, à frente
        EL((0, 0.22, 0.28), (0.34, 0.2, 0.19)),                         # ancas baixas e curtas
        EL((0, -0.06, 0.2), (0.3, 0.28, 0.14)),                         # barriga assentada
    ], res=0.012)
    smooth(b, iters=3, factor=0.5, target=3000)
    paint(b, belly)
    return {"hips": [b] + warts("wart", b, SPOT_C, SPOTS, k=1.15)}


# ------------------------------------------------------------------ cabeça: larga e chata, emburrada; olhos sob pálpebras pesadas
def head():
    hx, hy, hz = RIG.P("head")
    c = Vector((hx, hy, hz))
    elems = [
        EL(c + Vector((0, -0.02, 0.0)), (0.34, 0.24, 0.15), rot=(0.12, 0, 0)),   # crânio chato e largo
        EL(c + Vector((0, -0.1, -0.08)), (0.32, 0.17, 0.1)),                      # maxilar largo, pouco fundo
        EL(c + Vector((0, -0.02, -0.17)), (0.26, 0.18, 0.1)),                     # papo creme sob a boca
    ]
    eyes = []
    for s in (-1, 1):
        ec = c + Vector((s * 0.17, -0.07, 0.12))
        eyes.append((s, ec))
        elems.append(EL(ec + Vector((0, 0.01, 0.0)), (0.1, 0.09, 0.08)))                          # cúpula do olho
        elems.append(EL(ec + Vector((s * 0.01, -0.035, 0.04)), (0.1, 0.07, 0.04), rot=(0.35, 0, s * 0.3)))  # pálpebra pesada, caída para dentro
        elems.append(EL(ec + Vector((s * 0.02, 0.08, 0.06)), (0.06, 0.06, 0.06)))                 # base do chifre fundida no crânio
    h = meta("headmb", elems, res=0.008)
    smooth(h, iters=2, factor=0.5, target=3200)

    def mouth_z(x):
        """altura da boca: reta no meio, caindo nos cantos (cara emburrada)"""
        return c.z - 0.075 - 0.06 * ss(0.12, 0.3, abs(x))

    def hc(co, n):
        # manchas só no alto de trás da cabeça, longe das cristas dos olhos
        g = gold(co, n)
        under = ss(c.z - 0.06, c.z - 0.17, co.z) * ss(0.25, -0.35, n.z)
        g = mix(g, mix(CREAM_D, CREAM, 0.6), under)
        # boca: fenda escura contínua de canto a canto, só na frente e nos lados do focinho
        d = abs(co.z - mouth_z(co.x - c.x))
        front = ss(0.1, -0.35, n.y) * ss(c.y + 0.02, c.y - 0.08, co.y)
        # lábio claro logo acima da fenda
        lip = (1 - ss(0.008, 0.022, co.z - mouth_z(co.x - c.x) - 0.012)) * ss(0.0, 0.006, co.z - mouth_z(co.x - c.x)) * front
        g = mix(g, GOLD_L, lip * 0.7)
        return mix(g, MOUTH, (1 - ss(0.006, 0.009, d)) * front)
    paint(h, hc)
    solid, flat, lit = [h], [], []   # sem verrugas na cabeça: na pele chata viravam placas
    for s, ec in eyes:
        # olho: só a metade de baixo aparece sob a pálpebra
        eye = ball("eye", ec + Vector((s * 0.01, -0.075, -0.015)), (0.055, 0.03, 0.035), rot=(0, 0, -s * 0.3), seg=(12, 8))
        smooth(eye)
        paint(eye, lambda co, n: EYE)
        lit.append(eye)
        pup = ball("pupil", ec + Vector((s * 0.012, -0.102, -0.018)), (0.03, 0.008, 0.01), rot=(0, 0, -s * 0.3), seg=(8, 4))
        paint(pup, lambda co, n: PUPIL)
        flat.append(pup)
        # chifre: cone grosso de seção redonda, base dentro do crânio, sobe e curva para trás; ocre com a ponta clara
        # curto (≈ 60%), inclinado uns 40° para trás e um pouco para fora, base grossa fundida na crista
        # sobre a crista do olho, um pouco atrás; meio-termo de altura entre as rodadas do crítico, base mais fina, curvo para trás
        hb = ec + Vector((s * 0.015, 0.04, 0.06))
        hp_ = [hb, hb + Vector((s * 0.02, 0.04, 0.08)), hb + Vector((s * 0.045, 0.11, 0.135)), hb + Vector((s * 0.065, 0.19, 0.155))]
        hr = [0.06, 0.045, 0.028, 0.012]
        horn = meta("horn", [CAP(hp_[k], hp_[k + 1], (hr[k] + hr[k + 1]) / 2) for k in range(3)], res=0.008)
        smooth(horn, iters=2, factor=0.5, target=500)
        paint(horn, lambda co, n, z0=hb.z: mix(gold(co, n), SPOT_RIM, ss(z0 + 0.12, z0 + 0.19, co.z)))
        solid.append(horn)
    for s in (-1, 1):   # narinas
        nos = ball("nostril", c + Vector((s * 0.05, -0.255, 0.03)), (0.014, 0.008, 0.01), seg=(6, 4))
        paint(nos, lambda co, n: MOUTH)
        flat.append(nos)
    return {"head": solid, "head@flat": flat, "head@lit": lit}


def toes(foot, fwd, s, r=0.028, n=4, spread=0.5, length=0.09):
    """dedos compridos abertos em leque a partir de foot, na cor do corpo, com a ponta um pouco mais clara"""
    out = []
    base = math.atan2(fwd[0], -fwd[1])
    for k in range(n):
        a = base + (k - (n - 1) / 2) * spread / (n - 1) * 2
        d = Vector((math.sin(a), -math.cos(a), 0))
        tip = foot + d * length + Vector((0, 0, -0.012))
        t = tube("toe", [foot, foot + d * length * 0.55 + Vector((0, 0, 0.008)), tip], [r * 1.25, r, r * 1.05], seg=7)
        smooth(t)
        paint(t, lambda co, n, f=foot: mix(gold(co, n), GOLD_D, 0.5 * ss(length * 0.6, length, (Vector(co) - f).length)))
        out.append(t)
    return out


# ------------------------------------------------------------------ patas: da frente grossas com cotovelo para fora, de trás dobradas
def limbs():
    out = {}
    for side, s in (("L", -1), ("R", 1)):
        ax, ay, az = RIG.P("arm" + side)
        sh = Vector((ax, ay, az))
        elbow = sh + Vector((s * 0.1, 0.0, -0.18))
        foot = Vector((ax + s * 0.08, ay - 0.1, 0.035))
        arm = meta("arm", [
            CAP(sh + Vector((s * -0.03, 0.04, 0.04)), elbow, 0.1),
            CAP(elbow, foot + Vector((0, 0, 0.04)), 0.08),
            EL(foot + Vector((0, -0.01, 0.025)), (0.07, 0.07, 0.04)),
        ], res=0.01)
        smooth(arm, iters=2, factor=0.5, target=800)
        paint(arm, gold)
        out["arm" + side] = [arm] + toes(foot, (s * 0.3, -1), s, r=0.026, length=0.12, spread=0.6)

        tx, ty, tz = RIG.P("thigh" + side)
        hp = Vector((tx, ty, tz))
        knee = Vector((tx + s * 0.1, ty - 0.22, 0.24))     # coxa grande que vai à frente, dobrada ao lado do corpo
        heel = Vector((tx + s * 0.12, ty + 0.08, 0.07))    # canela volta para trás, rente ao chão
        hfoot = Vector((tx + s * 0.2, ty - 0.02, 0.035))   # pé largo, espalmado para fora do corpo
        leg = meta("leg", [
            EL((hp + knee) / 2 + Vector((s * 0.02, 0.02, 0.0)), (0.15, 0.23, 0.16), rot=(0.75, 0, s * -0.15)),
            CAP(knee, heel, 0.085),
            CAP(heel, hfoot + Vector((0, 0, 0.02)), 0.06),
            EL(hfoot + Vector((0, 0, 0.02)), (0.08, 0.08, 0.035)),
        ], res=0.01)
        smooth(leg, iters=2, factor=0.5, target=1000)
        paint(leg, gold)
        out["thigh" + side] = [leg] + toes(hfoot, (s * 1.0, -0.6), s, r=0.034, n=4, spread=0.6, length=0.17)
    return out


if __name__ == "__main__":
    reset()
    parts = {}
    for d in (body(), head(), limbs()):
        for k, v in d.items():
            parts.setdefault(k, []).extend(v)
    print("DIMS", RIG.dims_ts())
    finish("leaper", RIG, parts, ARGS, ao=0.5, body_center=(0, 0, 0.45), body_dist=3.2, head_dist=1.3)
