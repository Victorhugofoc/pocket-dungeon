# Hexer (velha bruxa muito curvada: nariz em gancho, cabelo branco arrepiado, manto roxo esfarrapado com forro laranja, cajado de
# espiral na mão esquerda, lanterna-gaiola pendurada na mão direita) modelada no Blender (M9-02). Brief: docs/briefs/hexer.md. Rodar: ver
# tools/blender/README.md. Forma "robed": sem pernas, o manto fica no osso "skirt"; o cajado fica no "foreL", em pé no mundo, e a
# lanterna no "foreR", pendendo para baixo do mundo na pose de repouso da receita (POSE_L, POSE_R, LEAN, OUT).
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from humanoid import Rig, finish, merge, place_head  # noqa: E402
from robed import bell_sleeve, fore_rot, local_dir, ring_loft  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
RIG = Rig(hipY=0.84, headY=0.42, shoulderY=0.4, shoulderX=0.19, arm=0.3, hipX=0.12, thigh=0.42)
HAND = 0.25
# a mesma pose da receita (cast-enemies.ts): braço direito esticado à frente com a mão caída, o esquerdo com o cajado à frente
POSE_R, POSE_L, LEAN, OUT = (-1.2, -1.0), (-0.9, -0.7), 0.9, 0.1
HEAD_LIFT, HEAD_SCALE, HEAD_FWD = 0.12, 1.4, 0.1

SKIN, SKIN_D, SKIN_L, NOSE = hexc(0xd88a52), hexc(0x8a4028), hexc(0xeeb27a), hexc(0xb0482e)
ROBE, ROBE_L, ROBE_D = hexc(0x7a3268), hexc(0xb05a8a), hexc(0x3a1432)
LINE, LINE_L, LINE_D = hexc(0xbc7131), hexc(0xd8975a), hexc(0x6e2e26)
HAIR, HAIR_L, HAIR_D = hexc(0xd2cdbc), hexc(0xf0ece0), hexc(0x8a8474)
WOOD, WOOD_L, WOOD_D = hexc(0x8a5c3a), hexc(0xb8885a), hexc(0x4a2c1c)
STRAP, STRAP_D = hexc(0x8b363a), hexc(0x4a1a1e)
CHARM, CHARM_D = hexc(0xb07a3a), hexc(0x4e2e16)
UNDER, UNDER_D = hexc(0x9a5426), hexc(0x4a2014)
DARK, EYE, BROW = hexc(0x140810), hexc(0x9cff6a), hexc(0x5a4a3e)


def cloth(base, dark, light=None):
    def f(co, n):
        c = mix(dark, base, 0.35 + 0.65 * ss(-0.7, 0.5, n.z))
        return mix(c, light, 0.35 * ss(0.5, 1.0, n.z)) if light else c
    return f


ROBE_C = cloth(ROBE, ROBE_D, ROBE_L)
LINE_C = cloth(LINE, LINE_D, LINE_L)


def robe_lined(center):
    """roxo por fora, laranja por dentro: a face cuja normal aponta para o eixo do pano é o forro"""
    c = Vector(center)

    def f(co, n):
        out = Vector((co.x - c.x, co.y - c.y, 0))
        if out.length > 1e-4 and Vector((n.x, n.y, 0)).dot(out) < -0.15 * out.length:
            return LINE_C(co, n)
        return mix(ROBE_C(co, n), LINE_C(co, n), ss(0.16, 0.0, co.z))
    return f


def skin(co, n):
    c = mix(SKIN_D, SKIN, 0.45 + 0.55 * ss(-0.6, 0.5, n.z - 0.3 * n.y))
    return mix(c, SKIN_L, 0.3 * ss(0.5, 1.0, -n.y + n.z))


def hair(co, n):
    c = mix(HAIR_D, HAIR, 0.45 + 0.55 * ss(-0.6, 0.6, n.z - 0.2 * n.y))
    c = mix(c, HAIR_L, 0.35 * ss(0.4, 1.0, n.z))
    k = 0.86 + 0.14 * math.sin(co.x * 80 + co.y * 50 + co.z * 30)   # mechas
    return tuple(x * k for x in c)


def wood(co, n):
    c = mix(WOOD_D, WOOD, 0.4 + 0.6 * ss(-0.6, 0.6, n.z - 0.3 * n.y))
    k = 0.85 + 0.15 * math.sin(co.z * 140 + co.x * 60)   # veios
    return mix(tuple(x * k for x in c), WOOD_L, 0.25 * ss(0.6, 1.0, n.z))


def strip(name, objs, pts2, r, back=False, squash=0.4):
    """faixa deitada na superfície mais de fora entre objs (frente ou costas), passando pelos pontos (x, z)"""
    pts = []
    sgn = 1 if back else -1
    for x, z in pts2:
        best = None
        for obj in objs:
            ok, hit, n, _ = obj.ray_cast(Vector((x, sgn * 1.0, z)), Vector((0, -sgn, 0)))
            if ok and (best is None or sgn * hit.y > sgn * best[0].y):
                best = (hit, n)
        if best:
            pts.append(best[0] + best[1] * r * squash * 0.6)
    t = tube(name, pts, [r] * len(pts), seg=6, squash=(1.0, squash), ref=(0, 1, 0))
    paint(t, lambda co, n: mix(STRAP_D, STRAP, 0.4 + 0.6 * ss(-0.5, 0.6, n.z - sgn * n.y)))
    return t


# ------------------------------------------------------------------ cabeça: rosto magro, nariz em gancho, queixo pontudo, cabelo arrepiado
def head():
    parts = {"solid": [], "flat": [], "lit": []}
    # o nariz entra na mesma superfície do rosto: em peça separada o contorno riscava o meio da cara
    h = meta("head", [
        EL((0, 0.015, 0.03), (0.072, 0.08, 0.08)),                   # crânio
        EL((0, -0.03, -0.02), (0.058, 0.062, 0.07)),                 # rosto magro
        CAP((0, -0.045, -0.078), (0, -0.092, -0.1), 0.019),          # queixo pontudo, projetado para a frente
        CAP((0, -0.075, 0.008), (0, -0.145, -0.012), 0.016),         # nariz em gancho: ponte fina na linha dos olhos, para a frente
        CAP((0, -0.145, -0.012), (0, -0.175, -0.055), 0.016),        # curva para baixo
        CAP((0, -0.175, -0.055), (0, -0.168, -0.105), 0.012),        # cai em gancho, à frente do queixo
        CAP((0, -0.168, -0.105), (0, -0.155, -0.122), 0.008),        # ponta virada para dentro, abaixo do queixo
        EL((-0.034, -0.08, 0.016), (0.018, 0.012, 0.012), neg=True),  # órbitas rasas
        EL((0.034, -0.08, 0.016), (0.018, 0.012, 0.012), neg=True),
        CAP((0, 0.02, -0.07), (0, 0.04, -0.15), 0.024),              # pescoço fino e curto
    ], res=0.005)
    smooth(h, iters=2, factor=0.5, target=700)
    paint(h, lambda co, n: mix(skin(co, n), NOSE, 0.5 * ss(-0.14, -0.17, co.y) * ss(-0.05, -0.09, co.z)))
    parts["solid"].append(h)
    wart = ball("wart", (0.014, -0.155, -0.022), (0.008, 0.008, 0.008), seg=(6, 4))
    paint(wart, lambda co, n: NOSE)
    parts["flat"].append(wart)
    for s in (-1, 1):
        lid = ball("eye", (s * 0.034, -0.076, 0.016), (0.016, 0.008, 0.011), rot=(0, s * -0.3, 0), seg=(8, 4))
        paint(lid, lambda co, n: DARK)
        parts["flat"].append(lid)
        glow = ball("glow", (s * 0.034, -0.083, 0.015), (0.004, 0.003, 0.004), seg=(6, 4))
        paint(glow, lambda co, n: EYE)
        parts["lit"].append(glow)
        brow = tube("brow", [(s * 0.056, -0.068, 0.036), (s * 0.036, -0.086, 0.034), (s * 0.018, -0.088, 0.028)], [0.007, 0.007, 0.005], seg=6)
        paint(brow, lambda co, n: BROW)
        parts["flat"].append(brow)   # sobrancelha pesada caída sobre o olho
    lip = tube("lips", [(-0.024, -0.084, -0.066), (0, -0.09, -0.072), (0.024, -0.084, -0.066)], [0.003, 0.004, 0.003], seg=5)
    paint(lip, lambda co, n: DARK)
    parts["flat"].append(lip)
    # cabelo: calota sobre o crânio e mechas espetadas para cima, para trás e para os lados, até os ombros
    hr = meta("hair", [
        EL((0, 0.03, 0.05), (0.08, 0.088, 0.08)),
        EL((0, 0.075, -0.03), (0.085, 0.065, 0.1)),                  # volume na nuca
        EL((0, -0.07, 0.07), (0.07, 0.04, 0.04), neg=True),          # testa livre
        EL((0, -0.11, -0.04), (0.06, 0.07, 0.11), neg=True),         # rosto livre
    ], res=0.007)
    smooth(hr, iters=2, factor=0.5, target=380)
    paint(hr, hair)
    parts["solid"].append(hr)
    # mechas ralas e desgrenhadas: a maioria cai para trás e pelos lados até os ombros; poucas pontas soltas no alto
    tufts = [((-0.06, 0.05, 0.03), (-0.12, 0.22, -0.28), 0.045), ((0.06, 0.05, 0.03), (0.13, 0.22, -0.29), 0.045),
             ((-0.04, 0.07, 0.04), (-0.08, 0.2, -0.34), 0.05), ((0.04, 0.07, 0.04), (0.09, 0.2, -0.33), 0.05),
             ((0.0, 0.08, 0.06), (0.0, 0.24, -0.36), 0.055), ((-0.07, 0.05, 0.0), (-0.13, 0.18, -0.18), 0.03),
             ((0.07, 0.05, 0.0), (0.13, 0.18, -0.19), 0.03), ((-0.03, 0.01, 0.1), (-0.12, 0.22, 0.02), 0.04),
             ((0.03, 0.01, 0.1), (0.12, 0.22, 0.0), 0.04), ((0.0, 0.0, 0.11), (0.0, 0.26, 0.03), 0.045),
             ((-0.06, 0.0, 0.07), (-0.17, 0.12, -0.04), 0.03), ((0.06, 0.0, 0.07), (0.17, 0.13, -0.06), 0.03)]
    for k, (a, b, r) in enumerate(tufts):
        a, b = Vector(a), Vector(b)
        bend = Vector((0, 0.03, 0.03 if b.z < a.z else 0.015))   # arqueia para fora antes de cair
        pts = [a, a + (b - a) * 0.3 + bend, a + (b - a) * 0.7 + bend * 0.6, b]
        t = tube("tuft", pts, [r, r * 0.95, r * 0.6, 0.006], seg=8, squash=(1.0, 0.5), twist=k * 0.7)
        smooth(t)
        paint(t, hair)
        parts["solid"].append(t)
    return parts


# ------------------------------------------------------------------ tronco: corcunda, xale esfarrapado, correia com bolsa
def torso():
    z0 = RIG.P("torso")[2]
    sx = RIG.shoulderX
    t = meta("torso", [
        EL((0, 0.01, z0 + 0.28), (0.14, 0.1, 0.14)),
        EL((0, 0.1, z0 + 0.33), (0.14, 0.12, 0.13)),                 # corcunda alta
        EL((0, 0.0, z0 + 0.09), (0.11, 0.085, 0.12)),
        EL((-sx + 0.05, 0.03, z0 + 0.35), (0.05, 0.055, 0.045)),    # ombros caídos
        EL((sx - 0.05, 0.03, z0 + 0.35), (0.05, 0.055, 0.045)),
    ], res=0.011)
    smooth(t, iters=2, target=360)
    paint(t, ROBE_C)
    out = [t]
    # xale sobre os ombros, com a barra em farrapos
    shawl = ring_loft("shawl", [((0, 0.03, z0 + 0.47), (0, 0, -1), 0.1, 0.09, 0, 0),
                                ((0, 0.04, z0 + 0.4), (0, 0, -1), 0.19, 0.15, 5, 0.05),
                                ((0, 0.05, z0 + 0.27), (0, 0, -1), 0.22, 0.18, 7, 0.08)],
                      seg=24, thick=0.016, jag=lambda j: 0.035 * ((j * 7) % 3) / 2 + 0.02 * (j % 2))
    paint(shawl, robe_lined((0, 0.04, 0)))
    out.append(shawl)
    # o tronco se curva LEAN para a frente: a capa é modelada já pendendo para o chão do mundo (visto do osso, o chão fica para a
    # frente e para baixo), da corcunda até cobrir a boca do manto
    wd = local_dir(Matrix.Rotation(LEAN, 3, "X"), (0, 0, -1))
    top = Vector((0, 0.07, z0 + 0.42))
    mrings = []
    for k, (f, rx, ry, folds, famp) in enumerate(((0.0, 0.13, 0.12, 0, 0), (0.28, 0.17, 0.17, 6, 0.05), (0.56, 0.21, 0.21, 7, 0.07),
                                                  (0.8, 0.26, 0.26, 7, 0.08))):
        c = top + wd * f + Vector((0, 0.12 * f, 0))
        mrings.append((tuple(c), tuple(wd), rx, ry, folds, famp))
    mantle = ring_loft("mantle", mrings, seg=26, thick=0.02, open_half=lambda i: 1.35,
                       jag=lambda j: 0.07 * ((j * 7) % 5) / 4)
    paint(mantle, robe_lined((0, 0.1, 0)))
    out.append(mantle)
    # correia do cajado: do ombro direito ao quadril esquerdo pela frente, e de volta pelas costas
    line = [(0.15 - 0.27 * k / 7, z0 + 0.42 - 0.42 * k / 7) for k in range(8)]
    for nm, bk in (("strap", False),):
        st = strip(nm, [t, shawl], line, 0.024, back=bk)
        smooth(st)
        out.append(st)
    return {"torso": out}


def staff_tube(name, pts, radii):
    s = tube(name, pts, radii, seg=8)
    smooth(s)
    paint(s, wood)
    return s


# ------------------------------------------------------------------ manto longo esfarrapado, aberto na frente sobre a saia laranja
def skirt():
    # a boca do manto fica baixa: com o tronco curvado, uma borda alta aparecia atrás como a de um tubo
    spec = ((0.8, 0.15, 0.13, 0.0, 0.0, 0.0), (0.7, 0.18, 0.15, 0.03, 0.03, 0.12), (0.55, 0.23, 0.19, 0.04, 0.05, 0.3),
            (0.3, 0.3, 0.25, 0.05, 0.07, 0.36), (0.08, 0.38, 0.32, 0.06, 0.06, 0.38), (-0.02, 0.41, 0.35, 0.06, 0.06, 0.38))
    rings = [((0, cy, z), (0, 0, -1), rx, ry, 7, famp) for z, rx, ry, cy, famp, _ in spec]
    sk = ring_loft("robe", rings, seg=28, thick=0.022, open_half=lambda i: max(0.02, spec[i][5]),
                   jag=lambda j: 0.16 * ((j * 7) % 5) / 4 + 0.03 * math.sin(j * 2.1))
    paint(sk, robe_lined((0, 0.05, 0)))
    under = ring_loft("under", [((0, 0.02, 0.75), (0, 0, -1), 0.15, 0.13, 0, 0), ((0, 0.03, 0.35), (0, 0, -1), 0.22, 0.18, 9, 0.04),
                                ((0, 0.04, 0.03), (0, 0, -1), 0.3, 0.25, 9, 0.05)], seg=28, thick=0.0,
                      jag=lambda j: 0.07 * ((j * 3) % 4) / 3)
    paint(under, lambda co, n: mix(cloth(UNDER, UNDER_D)(co, n), ROBE_D, 0.5 * ss(0.15, 0.0, co.z)))
    return {"skirt": [sk, under]}


# ------------------------------------------------------------------ braços: mangas em sino esfarrapadas, mãos ossudas, amuleto
FLAT_R, LIT_R = [], []


def bony_hand(h, axis, down, flat):
    """mão magra de dedos compridos caindo para baixo do mundo (down, no espaço do osso)"""
    out = []
    palm = ball("palm", tuple(h + axis * 0.02), (0.042, 0.03, 0.05), seg=(10, 6))
    paint(palm, skin)
    palm["no_ao"] = True
    out.append(palm)
    side = axis.cross(down).normalized()
    for k, dx in enumerate((-0.03, -0.01, 0.01, 0.03)):
        ln = 0.07 + 0.015 * (1 - abs(k - 1.5) / 1.5)
        b = h + axis * 0.05 + side * dx
        f = tube("finger", [b, b + axis * ln * 0.45 + down * ln * 0.25, b + axis * ln * 0.6 + down * ln * 0.85],
                 [0.012, 0.01, 0.004], seg=6)
        paint(f, skin)
        flat.append(f)   # dedos sem contorno: com contorno viram borrão
    th = tube("thumb", [h + axis * 0.03 - side * 0.035, h + axis * 0.07 - side * 0.045 + down * 0.03], [0.011, 0.004], seg=6)
    paint(th, skin)
    flat.append(th)
    return out


def charm(start, down, side):
    """corrente curta e a lanterna-gaiola de bronze com o miolo verde aceso, pendendo para baixo do mundo"""
    out = []
    top = start + down * 0.09
    chain = tube("chain", [start, start + down * 0.045, top], [0.006, 0.006, 0.006], seg=5)
    paint(chain, lambda co, n: CHARM_D)
    FLAT_R.append(chain)
    fw = side.cross(down).normalized()
    h, r = 0.17, 0.058
    c = top + down * (h / 2 + 0.02)
    cap = cone("cap", tuple(c - down * h * 0.42), tuple(top), r * 1.1, seg=8)
    bot = cone("base", tuple(c + down * h * 0.42), tuple(c + down * (h * 0.42 + 0.03)), r * 0.9, seg=8)
    ring = tube("ring", [top, top - down * 0.02], [0.012, 0.012], seg=6)
    for o in (cap, bot, ring):
        paint(o, lambda co, n: mix(CHARM_D, CHARM, 0.35 + 0.65 * ss(-0.5, 0.7, n.z)))
        o["no_ao"] = True
        out.append(o)
    for k in range(4):   # grades
        a = k * math.pi / 2 + math.pi / 4
        off = side * math.cos(a) * r + fw * math.sin(a) * r
        bar = tube("bar", [c - down * h * 0.42 + off * 0.9, c + off * 1.12, c + down * h * 0.42 + off * 0.9], [0.007, 0.007, 0.007], seg=5)
        paint(bar, lambda co, n: CHARM)
        bar["no_ao"] = True
        out.append(bar)
    core = ball("core", tuple(c), (0.042, 0.042, 0.058), seg=(10, 6))
    paint(core, lambda co, n: EYE)
    LIT_R.append(core)
    return out


def staff(hand, rot):
    """cajado torto em pé no mundo, um pouco inclinado para a frente e para fora, passando pela mão; a espiral grande no alto,
    enrolando para a frente, na altura da cabeça"""
    u = local_dir(rot, (-0.32, -0.25, 1.0))
    fw = local_dir(rot, (-0.75, -0.65, 0))
    fw = (fw - u * fw.dot(u)).normalized()
    sd = u.cross(fw).normalized()
    out = []
    b0 = hand - u * 0.6
    L = 1.5
    pts = [b0 + u * (L * k / 10) + sd * 0.02 * math.sin(k * 1.7) + fw * 0.012 * math.cos(k * 2.3) for k in range(11)]
    out.append(staff_tube("staff", pts, [0.026 - 0.004 * k / 10 for k in range(11)]))
    R = 0.13
    top = pts[-1]
    c = top + fw * R
    sp = []
    for k in range(17):
        a = k * (1.8 * math.pi) / 16
        r = R * (1 - 0.4 * a / math.pi)
        sp.append(c - fw * r * math.cos(a) + u * r * math.sin(a) * 1.1)
    out.append(staff_tube("crook", [pts[-2]] + sp, [0.023] + [0.023 - 0.009 * k / 16 for k in range(17)]))
    for k in (3, 6, 8):   # nós da madeira
        kn = ball("knot", tuple(pts[k] + sd * 0.02), (0.032, 0.032, 0.036), seg=(8, 6))
        paint(kn, wood)
        out.append(kn)
    fist = ball("fist", tuple(hand), (0.045, 0.045, 0.05), seg=(10, 6))   # mão fechada no cajado
    paint(fist, skin)
    fist["no_ao"] = True
    out.append(fist)
    return out


def arms():
    out = {}
    for side, s, pose in (("L", -1, POSE_L), ("R", 1, POSE_R)):
        ax, ay, az = RIG.P("arm" + side)
        up = meta("sleeveU", [EL((ax, ay, az - 0.05), (0.065, 0.068, 0.06)), CAP((ax, ay, az - 0.04), (ax, ay, az - RIG.arm), 0.075)], res=0.011)
        smooth(up, iters=1, target=180)
        paint(up, ROBE_C)
        fr, _ = fore_rot(pose, s, LEAN, OUT)
        down = local_dir(fr, (0, 0, -1))
        e = Vector(RIG.P("fore" + side))
        axis = Vector((0, 0, -1))
        hand = e + axis * HAND
        fore = tube("fore", [e, e + axis * 0.12, e + axis * 0.19], [0.062, 0.054, 0.04], seg=10)
        smooth(fore)
        paint(fore, ROBE_C)
        wrist = tube("wrist", [e + axis * 0.17, e + axis * 0.23], [0.024, 0.021], seg=8)
        paint(wrist, skin)
        # manga em sino esfarrapada caindo do cotovelo para o chão, forro laranja na boca
        ln = 0.18 if side == "R" else 0.2
        drape = bell_sleeve("drape", e + down * 0.02, down, ln, 0.08, 0.16, sag=0.0, folds=5, famp=0.1,
                            axis=down, jag=lambda j: 0.06 * (j % 3 == 0) + 0.025 * (j % 2))
        tip = Vector(e) + down * ln * 0.78
        paint(drape, lambda co, n, tip=tip, down=down: LINE_C(co, n) if (co - tip).dot(down) > 0 else ROBE_C(co, n))
        parts = [fore, wrist, drape]
        if side == "R":
            parts += bony_hand(hand, axis, down, FLAT_R)
            sd = axis.cross(down).normalized()
            parts += charm(hand + axis * 0.1 + down * 0.07, down, sd)
        else:
            parts += staff(hand + axis * 0.02, fr)
        out["arm" + side] = [up]
        out["fore" + side] = parts
    return out


if __name__ == "__main__":
    reset()
    a = arms()
    a["foreR@flat"] = FLAT_R
    a["foreR@lit"] = LIT_R
    parts = merge(place_head(RIG, head(), lift=HEAD_LIFT, scale=HEAD_SCALE, fwd=HEAD_FWD, tilt=-0.3), torso(), skirt(), a)
    finish("hexer", RIG, parts, ARGS, body_center=(0, 0, 0.85), body_dist=4.0, head_dist=1.2)
