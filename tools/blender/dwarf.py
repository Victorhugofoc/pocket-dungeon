# Base comum dos anões (M3-05: bombardier e berserker), sobre humanoid.py. Corpo baixo e largo: cabeça grande com nariz redondo e
# barba farta, tronco em barril, braços grossos e curtos, pernas curtas com botas largas. Cada script põe por cima o que é dele
# (gorro e casaco, elmo e manto). Blender: z para cima, frente em -y.
import math

from mathutils import Vector

from kit import CAP, EL, ball, meta, mix, paint, smooth, ss, tube
from humanoid import Rig

RIG = Rig(hipY=0.6, headY=0.5, shoulderY=0.4, shoulderX=0.34, arm=0.27, hipX=0.15, thigh=0.28)
HAND = 0.24


def shade(base, dark, lo=-0.7, hi=0.5):
    return lambda co, n: mix(dark, base, 0.35 + 0.65 * ss(lo, hi, n.z))


def strip(name, obj, xz, r, color, squash=0.35, lift=0.6):
    """faixa fina deitada na superfície da frente de obj (raio de -y para +y), passando pelos pontos (x, z)"""
    pts = []
    for x, z in xz:
        ok, hit, n, _ = obj.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
        if ok:
            pts.append(hit + n * r * squash * lift)
    if len(pts) < 2:
        return None
    t = tube(name, pts, [r] * len(pts), seg=6, squash=(1.0, squash), ref=(0, 1, 0))
    paint(t, lambda co, n: color)
    return t


def face(skin, skin_d, beard, beard_d, dark, brow=None, beard_len=1.0, angry=False, whites=False):
    """rosto do anão com a origem no centro da cabeça: bochechas, nariz redondo, olhos pequenos, barba e bigode.
    Devolve {"solid": [...], "flat": [...], "lit": []}"""
    parts = {"solid": [], "flat": [], "lit": []}
    f = meta("face", [EL((0, 0.0, 0.0), (0.135, 0.13, 0.14)),
                      EL((0, -0.06, -0.03), (0.12, 0.08, 0.09))], res=0.008)   # bochechas para a frente
    smooth(f, iters=1, target=260)
    paint(f, shade(skin, skin_d))
    parts["solid"].append(f)
    nose = meta("nose", [EL((0, -0.15, -0.015), (0.042, 0.04, 0.045)), CAP((0, -0.12, 0.03), (0, -0.145, -0.01), 0.025)], res=0.006)
    smooth(nose, iters=1, target=90)
    paint(nose, lambda co, n: mix(skin_d, mix(skin, (0.95, 0.6, 0.45), 0.25), 0.4 + 0.6 * ss(-0.6, 0.6, n.z)))
    parts["solid"].append(nose)
    for s in (-1, 1):
        if whites:   # olho claro com pupila: sob a aba de um elmo, só o escuro sumia
            wh = ball("white", (s * 0.05, -0.124, 0.034), (0.026, 0.01, 0.018), seg=(8, 5))
            paint(wh, lambda co, n: (0.96, 0.9, 0.8))
            parts["flat"].append(wh)
            eye = ball("eye", (s * 0.046, -0.132, 0.033), (0.011, 0.008, 0.012), seg=(6, 4))
        else:
            eye = ball("eye", (s * 0.05, -0.128, 0.032), (0.022, 0.012, 0.026), seg=(8, 5))
        paint(eye, lambda co, n: dark)
        parts["flat"].append(eye)
        bz = (0.05, 0.068, 0.08) if angry else (0.068, 0.07, 0.058)   # franzida em V: ponta de dentro mais baixa
        b = tube("brow", [(s * 0.02, -0.135, bz[0]), (s * 0.06, -0.13, bz[1]), (s * 0.095, -0.115, bz[2])], [0.022, 0.026, 0.018],
                 seg=6, squash=(1.0, 0.7))
        smooth(b)
        paint(b, shade(brow or beard, beard_d))
        parts["solid"].append(b)
    # barba farta: das bochechas até o meio do peito, larga embaixo, com mechas em ponta
    k = beard_len
    bd = meta("beard", [EL((0, -0.08, -0.07), (0.14, 0.085, 0.09)),
                        EL((0, -0.11, -0.07 - 0.1 * k), (0.13, 0.085, 0.1 * k)),
                        CAP((0, -0.12, -0.08 - 0.12 * k), (0, -0.13, -0.08 - 0.24 * k), 0.055),        # ponta do meio
                        CAP((-0.075, -0.1, -0.08 - 0.1 * k), (-0.09, -0.11, -0.08 - 0.19 * k), 0.045),  # gomos dos lados
                        CAP((0.075, -0.1, -0.08 - 0.1 * k), (0.09, -0.11, -0.08 - 0.19 * k), 0.045),
                        EL((-0.12, -0.02, -0.04), (0.035, 0.06, 0.07)),            # costeletas
                        EL((0.12, -0.02, -0.04), (0.035, 0.06, 0.07))], res=0.008)
    smooth(bd, iters=1, target=360)
    paint(bd, lambda co, n: mix(beard_d, beard, (0.35 + 0.65 * ss(-0.7, 0.5, n.z)) * (0.8 + 0.2 * math.cos(co.x * 90))))
    parts["solid"].append(bd)
    for s in (-1, 1):   # bigode caído, das narinas até o canto da barba
        m = tube("must", [(s * 0.01, -0.168, -0.045), (s * 0.065, -0.165, -0.06), (s * 0.12, -0.14, -0.085), (s * 0.15, -0.11, -0.12)],
                 [0.03, 0.038, 0.028, 0.01], seg=8)   # bigode largo, saindo para os lados além do rosto
        smooth(m)
        paint(m, shade(beard, beard_d))
        parts["solid"].append(m)
    mouth = ball("mouth", (0, -0.168, -0.085), (0.03, 0.01, 0.01), seg=(8, 4))
    paint(mouth, lambda co, n: dark)
    parts["flat"].append(mouth)
    return parts


def torso_mass(z0, sx, tint, extra=()):
    """tronco em barril: peito largo e fundo, barriga, ombros altos (o pescoço some na barba)"""
    t = meta("torso", [EL((0, 0.0, z0 + 0.26), (0.27, 0.19, 0.2)),
                       EL((0, -0.03, z0 + 0.08), (0.24, 0.19, 0.15)),
                       EL((-sx + 0.07, 0.01, z0 + 0.37), (0.1, 0.1, 0.08)),
                       EL((sx - 0.07, 0.01, z0 + 0.37), (0.1, 0.1, 0.08)),
                       CAP((0, 0.0, z0 + 0.36), (0, -0.01, z0 + 0.5), 0.09)] + list(extra), res=0.012)
    smooth(t, iters=2, target=520)
    paint(t, tint)
    return t


def arm(side, upper, fore, glove, sleeve_cuff=None, k=1.0, fist=1.0):
    """braço grosso e curto: (deltoide, bíceps) no arm, (antebraço, punho fechado) no fore; tintas por função (co, n, fz)"""
    s = -1 if side == "L" else 1
    ax, ay, az = RIG.P("arm" + side)
    a = meta("arm" + side, [EL((ax, ay, az - 0.02), (0.1 * k, 0.095 * k, 0.09 * k)),
                            CAP((ax, ay, az - 0.03), (ax, ay, az - RIG.arm + 0.02), 0.08 * k),
                            EL((ax, ay - 0.02, az - 0.13), (0.09 * k, 0.095 * k, 0.1))], res=0.011)
    smooth(a, iters=1, target=200)
    paint(a, lambda co, n: upper(co, n, az))
    fx, fy, fz = RIG.P("fore" + side)
    f = meta("fore" + side, [CAP((fx, fy, fz), (fx, fy, fz - HAND + 0.06), 0.07 * k),
                             EL((fx, fy - 0.01, fz - 0.08), (0.085 * k, 0.085 * k, 0.09)),
                             EL((fx, fy - 0.01, fz - HAND + 0.07), (0.075 * fist, 0.075 * fist, 0.035)),  # punho largo da luva
                             EL((fx, fy - 0.01, fz - HAND), (0.06 * fist, 0.065 * fist, 0.06 * fist)),     # punho fechado
                             EL((fx + s * 0.035, fy - 0.035, fz - HAND + 0.015), (0.025 * fist, 0.025 * fist, 0.03))], res=0.01)
    smooth(f, iters=1, target=220)

    def ftint(co, n):
        if co.z < fz - HAND + 0.07:
            return glove(co, n)
        return fore(co, n, fz)
    paint(f, ftint)
    out = {"arm" + side: [a], "fore" + side: [f]}
    if sleeve_cuff:
        c = tube("cuff", [(fx, fy, fz - HAND + 0.1), (fx, fy, fz - HAND + 0.05)], [0.085, 0.085], seg=12)
        paint(c, sleeve_cuff)
        out["fore" + side].append(c)
    return out


def leg(side, pants, boot, boot_top=None):
    """perna curta: coxa grossa e canela que entra na bota larga; boot_top = cor da borda da bota (pele, couro)"""
    s = -1 if side == "L" else 1
    hx, hy, hz = RIG.P("thigh" + side)
    th = meta("thigh" + side, [CAP((hx, hy, hz), (hx + s * 0.01, hy, hz - RIG.thigh + 0.02), 0.11),
                               EL((hx + s * 0.01, hy, hz - 0.1), (0.13, 0.13, 0.14))], res=0.012)
    smooth(th, iters=1, target=200)
    paint(th, pants)
    kx, ky, kz = RIG.P("shin" + side)
    L = kz  # do joelho até o chão
    sh = meta("shin" + side, [CAP((kx, ky, kz), (kx, ky, kz - L + 0.1), 0.095),
                              EL((kx, ky, kz - L + 0.11), (0.11, 0.115, 0.1)),                 # cano da bota
                              EL((kx, ky - 0.07, kz - L + 0.045), (0.1, 0.15, 0.05))], res=0.011)  # pé largo
    smooth(sh, iters=1, target=240)
    top = kz - L + 0.2

    def stint(co, n):
        if co.z < top:
            return boot(co, n)
        return pants(co, n)
    paint(sh, stint)
    out = {"thigh" + side: [th], "shin" + side: [sh]}
    if boot_top:
        r = tube("btop", [(kx, ky, top - 0.03), (kx, ky, top + 0.03)], [0.118, 0.12], seg=12)
        smooth(r)
        paint(r, boot_top)
        out["shin" + side].append(r)
    return out
