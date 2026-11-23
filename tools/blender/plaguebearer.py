# Plaguebearer (zumbi inchado e enfaixado, barril de peste nas costas) modelado no Blender (M9-03). Brief: docs/briefs/plaguebearer.md.
# Rodar: ver tools/blender/README.md. Bípede de humanoid.py; o barril e as correias ficam no osso "torso"; as faixas são fitas de pano
# de verdade (com espessura), deitadas na pele por raios a partir do eixo de cada parte.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from humanoid import Rig, finish, merge, place_head  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
# iguais a b.dims da receita (cast-enemies.ts)
RIG = Rig(hipY=0.66, headY=0.46, shoulderY=0.44, shoulderX=0.36, arm=0.3, hipX=0.17, thigh=0.3)
HAND = 0.3

SKIN, SKIN_L, SKIN_D = hexc(0xcab070), hexc(0xe8d49a), hexc(0x4a1e1a)   # ocre-cáqui com sombra vinho
PUS, PUS_C, PUS_RIM = hexc(0xe0cc50), hexc(0xf4e690), hexc(0x7a2a22)
WRAP, WRAP_L, WRAP_D = hexc(0x8a6440), hexc(0xa8845a), hexc(0x3e2216)
BLOOD = hexc(0x6a1a14)
MOUTH = hexc(0x2a0c08)
WOOD, WOOD_L, WOOD_D = hexc(0x6a4226), hexc(0x8e5e34), hexc(0x2e1a0c)
IRON, IRON_D = hexc(0x74747c), hexc(0x2e2e34)
OOZE, OOZE_D = hexc(0xc8e050), hexc(0x7a9a20)


def skin(co, n, sore=1.0):
    # pele doentia: sombra embaixo, manchas esverdeadas
    k = 0.5 + 0.5 * math.sin(co.x * 41 + co.z * 37) * math.cos(co.y * 29)
    base = mix(SKIN, hexc(0x9a4a30), ss(0.2, 1.0, k) * 0.4)   # manchas inflamadas
    w = math.sin(co.x * 9 + co.z * 5 + 1.1) * math.cos(co.y * 8 - co.z * 10 + 0.4) + 0.5 * math.sin(co.x * 17 - co.y * 13 + co.z * 21)
    blot = ss(0.2, 0.55, w)
    base = mix(base, mix(hexc(0x6b1e1a), hexc(0x8a2a20), ss(0.55, 0.9, w)), blot * 0.85 * sore)   # feridas vinho (~35% da pele)
    return mix(SKIN_D, mix(base, SKIN_L, ss(0.55, 1.0, n.z) * 0.6), 0.3 + 0.7 * ss(-0.7, 0.5, n.z))


def skin_light(co, n):
    # cabeça e mãos: a mesma pele, com manchas fracas (com o mesmo ruído do corpo, a cabeça saía toda vermelha, como um gorro)
    return skin(co, n, 0.3)


def wrap(co, n):
    # pano sujo: listras da trama e manchas de sangue velho
    k = 0.8 + 0.2 * math.sin(co.x * 120 + co.y * 90 + co.z * 140)
    stain = ss(0.55, 0.85, math.sin(co.x * 23 + co.z * 31) * math.cos(co.y * 19 + co.z * 11))
    return mix(mix(WRAP_D, mix(WRAP, WRAP_L, ss(0.4, 1.0, n.z)), (0.35 + 0.65 * ss(-0.6, 0.6, n.z)) * k), BLOOD, stain * 0.8)


def wood(co, n):
    g = 0.75 + 0.25 * math.sin(co.z * 160 + math.sin(co.x * 40) * 2)
    return mix(WOOD_D, mix(WOOD, WOOD_L, ss(0.3, 1.0, n.z)), (0.3 + 0.7 * ss(-0.6, 0.6, n.z)) * g)


def iron(co, n):
    return mix(IRON_D, IRON, 0.3 + 0.7 * ss(-0.5, 0.8, n.z))


def surface_hit(objs, origin, direction):
    """o ponto mais de fora entre os objetos, num raio que vem de origin na direção direction"""
    best = None
    for o in objs:
        ok, hit, nrm, _ = o.ray_cast(origin, direction)
        if ok and (best is None or (hit - origin).length < (best[0] - origin).length):
            best = (hit, nrm)
    return best


def band(name, objs, c, axis, width, a0=0.0, a1=2 * math.pi, n=18, tilt=0.0, lift=0.006, thick=0.012, wob=0.0, reach=0.6):
    """fita de pano em volta do eixo `axis` que passa por `c`: raios de fora para dentro, perpendiculares ao eixo (inclinados por
    `tilt` ao longo da volta), pousam a fita na pele; a fita tem `width` de largura ao longo do eixo e espessura `thick`"""
    c, axis = Vector(c), Vector(axis).normalized()
    ref = Vector((0, -1, 0)) if abs(axis.y) < 0.9 else Vector((1, 0, 0))
    u = (ref - axis * ref.dot(axis)).normalized()
    v = axis.cross(u).normalized()
    bm = bmesh.new()
    rows = []
    closed = abs(a1 - a0 - 2 * math.pi) < 1e-6
    count = n if closed else n + 1
    for j in range(count):
        a = a0 + (a1 - a0) * j / n
        d = u * math.cos(a) + v * math.sin(a)
        cc = c + axis * (tilt * math.sin(a) + wob * math.sin(a * 3 + 1.3))
        h = surface_hit(objs, cc + d * reach, -d)
        if not h:
            continue
        p, nrm = h
        p = p + nrm * lift
        rows.append([bm.verts.new(p - axis * width / 2), bm.verts.new(p + axis * width / 2)])
    if len(rows) < 2:
        bm.free()
        return None
    rng = range(len(rows)) if closed and len(rows) == count else range(len(rows) - 1)
    for k in rng:
        a, b = rows[k], rows[(k + 1) % len(rows)]
        bm.faces.new((a[0], b[0], b[1], a[1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_mesh(name, bm)
    sol = o.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = thick
    sol.offset = 1.0
    apply_mods(o)
    for p in o.data.polygons:
        p.use_smooth = True
    paint(o, wrap)
    return o


def boils(name, objs, spots):
    """pústulas: (yaw, pitch, raio) a partir do centro da peça; pousam na pele pelo raio, com miolo verde"""
    out = []
    for k, (c, d, r) in enumerate(spots):
        d = Vector(d).normalized()
        h = surface_hit(objs, Vector(c) + d * 0.8, -d)
        if not h:
            continue
        p, nrm = h
        b = ball(f"{name}{k}", p + nrm * r * 0.3, (r, r, r * 0.8), rot=nrm.to_track_quat("Z", "Y").to_euler(), seg=(8, 5))
        paint(b, lambda co, n, nm=nrm.copy(): mix(PUS_RIM, mix(PUS, PUS_C, ss(0.75, 0.98, n.dot(nm))), ss(0.05, 0.45, n.dot(nm))))
        out.append(b)
    return out


# ------------------------------------------------------------------ cabeça: careca, baixa, enfaixada, boca aberta
def head():
    parts = {"solid": [], "flat": [], "lit": []}
    h = meta("head", [
        EL((0, 0.01, 0.0), (0.115, 0.125, 0.11)),                     # crânio
        EL((0.045, 0.02, 0.085), (0.05, 0.05, 0.04)),                 # calombos no alto
        EL((-0.05, 0.05, 0.075), (0.045, 0.045, 0.035)),
        EL((0, -0.05, 0.075), (0.085, 0.045, 0.03)),                  # testa caída sobre os olhos
        EL((0, -0.07, -0.07), (0.13, 0.085, 0.075)),                  # maxilar largo, mais que a testa, para a frente
        EL((-0.07, -0.07, -0.02), (0.05, 0.05, 0.05)),                # bochechas caídas
        EL((0.07, -0.07, -0.02), (0.05, 0.05, 0.05)),
        EL((0, -0.13, -0.05), (0.058, 0.055, 0.042), neg=True),       # boca escancarada, funda
        EL((-0.042, -0.115, 0.025), (0.026, 0.02, 0.018), neg=True),  # órbitas fundas
        EL((0.042, -0.115, 0.025), (0.026, 0.02, 0.018), neg=True),
    ], res=0.006)
    smooth(h, iters=1, target=520)
    paint(h, lambda co, n: MOUTH if (co.y < -0.08 and abs(co.x) < 0.045 and -0.08 < co.z < -0.015 and n.y > -0.2) else skin_light(co, n))
    parts["solid"].append(h)
    mouth = ball("mouthin", (0, -0.1, -0.045), (0.042, 0.03, 0.028), seg=(8, 5))
    paint(mouth, lambda co, n: MOUTH)
    parts["flat"].append(mouth)
    for s in (-1, 1):
        eye = ball("eye", (s * 0.042, -0.112, 0.022), (0.02, 0.012, 0.017), seg=(6, 4))
        paint(eye, lambda co, n: hexc(0xe8f070))
        parts["lit"].append(eye)
        # dentes tortos no alto da boca
        for k in range(2):
            t = cone("tooth", (s * (0.012 + 0.018 * k), -0.13 + 0.01 * k, -0.022), (s * (0.014 + 0.018 * k), -0.132 + 0.01 * k, -0.045), 0.008, seg=5)
            paint(t, lambda co, n: hexc(0xd8c890))
            parts["flat"].append(t)
    # faixas na cabeça: uma em diagonal sobre o crânio e um olho, outra na testa

    # ponta solta da faixa caindo atrás
    return parts


# ------------------------------------------------------------------ tronco: barriga enorme, corcunda, faixas, barril nas costas
def torso():
    z0 = RIG.P("torso")[2]
    sx = RIG.shoulderX
    t = meta("torso", [
        EL((0, -0.12, z0 + 0.06), (0.35, 0.33, 0.3)),                 # barriga enorme e redonda, caída à frente
        EL((0, 0.04, z0 + 0.32), (0.26, 0.2, 0.17)),                  # peito e corcunda
        EL((-sx + 0.06, 0.02, z0 + 0.42), (0.11, 0.11, 0.1)),         # ombros caídos
        EL((sx - 0.06, 0.02, z0 + 0.42), (0.11, 0.11, 0.1)),
        CAP((0, 0.0, z0 + 0.38), (0, -0.04, z0 + 0.5), 0.11),         # pescoço grosso, curto
        EL((0, 0.02, z0 - 0.08), (0.24, 0.2, 0.12)),                  # cintura baixa
    ], res=0.012)
    smooth(t, iters=2, target=700)
    paint(t, skin)
    out = [t]
    # faixas: em volta do peito, em diagonal sobre a barriga e na cintura
    for k, (cz, w, tl, a0, a1) in enumerate(((z0 + 0.2, 0.085, -0.12, 0.2, 3.4),
                                             (z0 - 0.06, 0.1, 0.04, 0, 2 * math.pi), (z0 + 0.06, 0.08, 0.14, 2.6, 6.0))):
        b = band(f"twrap{k}", [t], (0, -0.03, cz), (0, 0, 1), w, a0=a0, a1=a1, n=26, tilt=tl, reach=0.8)
        if b:
            out.append(b)
    B0 = (0, -0.12, z0 + 0.06)
    out += boils("boil", [t], [(B0, (0.55, -1, 0.1), 0.085), (B0, (0.75, -0.8, -0.15), 0.045), (B0, (0.5, -1, -0.35), 0.038),
                              (B0, (0.85, -0.6, 0.25), 0.032), (B0, (0.7, -0.7, 0.45), 0.03), (B0, (-0.6, -0.9, 0.2), 0.04), (B0, (-0.2, -1, 0.5), 0.028), (B0, (0.35, -1, 0.35), 0.035),
                              ((0, 0.04, z0 + 0.32), (-0.9, -0.2, 0.6), 0.045), ((0, 0.04, z0 + 0.32), (-0.75, -0.5, 0.75), 0.032)])
    # barril de pé nas costas, um pouco acima dos ombros, inclinado para trás
    bc = Vector((-0.13, 0.38, z0 + 0.14))
    up = Vector((-0.28, 0.2, 1)).normalized()
    L, R = 0.4, 0.26
    prof = []
    for k in range(7):
        u = k / 6
        prof.append((bc + up * (u - 0.5) * 2 * L, R * (0.86 + 0.14 * math.sin(u * math.pi))))
    bar = tube("barrel", [p for p, _ in prof], [r for _, r in prof], seg=16)
    smooth(bar)
    paint(bar, wood)
    out.append(bar)
    for u in (0.08, 0.32, 0.68, 0.92):
        c = bc + up * (u - 0.5) * 2 * L
        r = R * (0.86 + 0.14 * math.sin(u * math.pi)) + 0.012
        hoop = tube("hoop", [c - up * 0.022, c + up * 0.022], [r, r], seg=16)
        paint(hoop, iron)
        out.append(hoop)
    # tampa quebrada e gosma escorrendo pela borda
    top = bc + up * L
    lid = tube("lidrim", [top - up * 0.01, top + up * 0.02], [R * 0.88, R * 0.8], seg=16)
    paint(lid, wood)
    out.append(lid)
    # correias: dos dois ombros (por fora do pescoço) até o barril
    for s_ in (-1, 1):
        st = tube("strap", [(s_ * 0.27, -0.12, z0 + 0.4), (s_ * 0.27, 0.0, z0 + 0.5), (s_ * 0.2 - 0.06, 0.2, z0 + 0.42),
                            (bc.x + s_ * 0.12, bc.y - 0.05, bc.z + 0.05)], [0.028] * 4, seg=6, squash=(1.0, 0.4), ref=(1, 0, 0))
        paint(st, lambda co, n: mix(WRAP_D, hexc(0x5a3420), 0.3 + 0.7 * ss(-0.5, 0.6, n.z)))
        out.append(st)
    # bastão de madeira clara saindo da boca do barril, bem acima dele
    side = Vector((-1, 0, 0))
    base = bc + side * (R + 0.04)
    a, b = base + up * (L + 0.2), base - up * (L + 0.3)
    pts = [a + (b - a) * (k / 6) for k in range(7)]
    stick = tube("staff", pts, [0.036, 0.04, 0.034, 0.04, 0.034, 0.038, 0.03], seg=8)
    paint(stick, lambda co, n: mix(hexc(0x7a5a30), hexc(0xd4b884), 0.35 + 0.65 * ss(-0.5, 0.7, n.z)))
    out.append(stick)
    for k in (1, 3, 5):   # nós
        kn = ball("knot", pts[k], (0.05, 0.05, 0.035), rot=up.to_track_quat("Z", "Y").to_euler(), seg=(8, 4))
        paint(kn, lambda co, n: mix(WOOD_D, WOOD, 0.4 + 0.6 * ss(-0.5, 0.7, n.z)))
        out.append(kn)
    hook = tube("crook", [a, a + up * 0.08 + side * 0.03, a + up * 0.1 - side * 0.06, a + up * 0.04 - side * 0.1], [0.034, 0.03, 0.026, 0.02], seg=7)
    paint(hook, lambda co, n: mix(hexc(0x7a5a30), hexc(0xd4b884), 0.35 + 0.65 * ss(-0.5, 0.7, n.z)))
    out.append(hook)
    for u in (0.32, 0.68):   # amarras de corda do cajado ao barril
        c = bc + up * (u - 0.5) * 2 * L
        tie = tube("tie", [c + side * (R - 0.01) + Vector((0, -0.04, 0)), c + side * (R + 0.07), c + side * (R - 0.01) + Vector((0, 0.04, 0))],
                   [0.016, 0.018, 0.016], seg=6)
        paint(tie, lambda co, n: mix(hexc(0x4a3018), hexc(0x9a7a4a), 0.4 + 0.6 * ss(-0.5, 0.7, n.z)))
        out.append(tie)
    lit = []
    goo = meta("goo", [EL(tuple(top - up * 0.02), (R * 0.72, R * 0.72, 0.025)),
                       CAP(tuple(top + Vector((0.08, -0.1, 0.0))), tuple(top + Vector((0.11, -0.14, -0.14))), 0.026),
                       CAP(tuple(top + Vector((-0.1, 0.04, 0.0))), tuple(top + Vector((-0.15, 0.06, -0.2))), 0.028),
                       CAP(tuple(top + Vector((0.0, 0.14, 0.0))), tuple(top + Vector((0.02, 0.2, -0.24))), 0.03),
                       EL(tuple(top + Vector((0.02, 0.2, -0.27))), (0.034, 0.034, 0.04))], res=0.008)
    smooth(goo, iters=1, target=360)
    paint(goo, lambda co, n, tz=top.z: mix(hexc(0x3a4a14), hexc(0x6a8020), ss(0.85, 1.0, n.z) * 0.5) if co.z > tz - 0.04 and n.z > 0.6
          else mix(OOZE_D, OOZE, 0.35 + 0.65 * ss(-0.5, 0.8, n.z)))
    goo["no_ao"] = True
    out.append(goo)
    return {"torso": out}


def hips():
    z = RIG.P("hips")[2]
    p = meta("hips", [EL((0, 0.02, z + 0.04), (0.22, 0.17, 0.12))], res=0.012)
    smooth(p, iters=1, target=200)
    paint(p, wrap)
    # tanga de trapos: tiras penduradas na frente e atrás
    out = [p]
    for k, (x, y) in enumerate(((-0.08, -0.15), (0.06, -0.16), (0.0, 0.17), (-0.12, 0.12))):
        r = tube("rag", [(x, y, z + 0.06), (x * 1.1, y * 1.1, z - 0.08), (x * 1.15 + 0.01, y * 1.15, z - 0.2)], [0.045, 0.04, 0.03],
                 seg=6, squash=(1.0, 0.3), ref=(0, 1, 0))
        paint(r, wrap)
        out.append(r)
    return {"hips": out}


def limbs():
    out = {}
    for side, s in (("L", -1), ("R", 1)):
        ax, ay, az = RIG.P("arm" + side)
        a = meta("arm" + side, [EL((ax, ay, az - 0.03), (0.105, 0.1, 0.1)),
                                CAP((ax, ay, az - 0.04), (ax, ay, az - RIG.arm + 0.02), 0.085),
                                EL((ax, ay - 0.01, az - 0.15), (0.095, 0.095, 0.11))], res=0.011)
        smooth(a, iters=1, target=200)
        paint(a, skin)
        aw = [band(f"awrap{side}{k}", [a], (ax, ay, az - zz), (0, 0, 1), 0.075, n=14, tilt=0.03 * s, reach=0.4)
              for k, zz in ()] + [band(f"awrapd{side}", [a], (ax, ay, az - 0.22), (0.25 * s, 0.2, 1), 0.06, a0=0.5, a1=4.5, n=12, reach=0.4)]
        fx, fy, fz = RIG.P("fore" + side)
        f = meta("fore" + side, [CAP((fx, fy, fz), (fx, fy, fz - HAND + 0.06), 0.095),
                                 EL((fx, fy - 0.01, fz - 0.09), (0.11, 0.11, 0.12)),
                                 EL((fx, fy - 0.02, fz - HAND - 0.01), (0.115, 0.105, 0.1)),                     # mão grande, inchada
                                 CAP((fx + s * 0.02, fy - 0.05, fz - HAND - 0.02), (fx + s * 0.03, fy - 0.08, fz - HAND - 0.09), 0.028),
                                 CAP((fx - s * 0.02, fy - 0.05, fz - HAND - 0.02), (fx - s * 0.02, fy - 0.09, fz - HAND - 0.08), 0.026),
                                 CAP((fx + s * 0.05, fy - 0.01, fz - HAND - 0.02), (fx + s * 0.07, fy - 0.03, fz - HAND - 0.08), 0.025)],
                 res=0.009)
        smooth(f, iters=1, target=280)
        paint(f, skin_light)
        fw = [band(f"fwrap{side}{k}", [f], (fx, fy, fz - zz), (0, 0, 1), 0.07, n=14, tilt=0.04 * s, reach=0.4)
              for k, zz in enumerate((0.16,))]
        # ponta solta de faixa pendendo do pulso
        tl = tube("ftail", [(fx + s * 0.07, fy + 0.02, fz - 0.2), (fx + s * 0.09, fy + 0.05, fz - 0.3), (fx + s * 0.08, fy + 0.07, fz - 0.4)],
                  [0.022, 0.02, 0.014], seg=6, squash=(1.0, 0.35), ref=(1, 0, 0))
        paint(tl, wrap)
        hx, hy, hz = RIG.P("thigh" + side)
        th = meta("thigh" + side, [CAP((hx, hy, hz), (hx + s * 0.01, hy, hz - RIG.thigh + 0.02), 0.12),
                                   EL((hx + s * 0.01, hy, hz - 0.1), (0.14, 0.14, 0.14))], res=0.012)
        smooth(th, iters=1, target=200)
        paint(th, skin)
        tw = [band(f"twrapL{side}{k}", [th], (hx, hy, hz - zz), (0, 0, 1), 0.085, n=14, tilt=0.03, reach=0.4)
              for k, zz in enumerate((0.1, 0.2))]
        kx, ky, kz = RIG.P("shin" + side)
        L = kz
        sh = meta("shin" + side, [CAP((kx, ky, kz), (kx, ky, kz - L + 0.1), 0.1),
                                  EL((kx, ky, kz - L + 0.1), (0.115, 0.12, 0.1)),
                                  EL((kx, ky - 0.07, kz - L + 0.045), (0.11, 0.16, 0.05))], res=0.011)   # pé largo em trapos
        smooth(sh, iters=1, target=240)
        paint(sh, lambda co, n: mix(hexc(0x241410), wrap(co, n), 0.55 if co.z > 0.12 else 0.2))
        if side == "R":
            fw += boils("fboil", [f], [((fx, fy, fz - 0.1), (0.8, -0.6, 0.0), 0.035)])
            aw += boils("aboil", [a], [((ax, ay, az - 0.1), (1, -0.3, 0.2), 0.045), ((ax, ay, az - 0.18), (0.9, -0.6, -0.1), 0.032)])
        else:
            tw += boils("tboil", [th], [((hx, hy, hz - 0.12), (-0.6, -1, 0.1), 0.04), ((hx, hy, hz - 0.2), (-0.9, -0.5, -0.2), 0.03)])
        out["arm" + side] = [a] + [b for b in aw if b]
        out["fore" + side] = [f, tl] + [b for b in fw if b]
        out["thigh" + side] = [th] + [b for b in tw if b]
        out["shin" + side] = [sh]
    return out


if __name__ == "__main__":
    reset()
    parts = merge(place_head(RIG, head(), lift=0.08, scale=1.1, fwd=0.06), torso(), hips(), limbs())
    print("DIMS", RIG.dims_ts())
    finish("plaguebearer", RIG, parts, ARGS, body_center=(0, 0, 0.75), body_dist=4.2, head_dist=1.0)
