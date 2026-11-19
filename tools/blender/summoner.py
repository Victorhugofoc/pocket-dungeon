# Summoner (bruxa pálida de cabelo branco longo, vestido roxo com corpete de costelas de osso e livro aberto) modelada no Blender
# (M3-04). Brief: docs/briefs/summoner.md. Rodar: ver tools/blender/README.md. Forma "robed": sem pernas, o vestido fica no osso
# "skirt"; o livro fica no osso foreL, deitado no mundo sobre a mão na pose de repouso da receita (POSE_L, LEAN, OUT).
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from humanoid import Rig, finish, merge, place_head  # noqa: E402
from robed import bell_sleeve, fore_rot, local_dir, ring_loft  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
RIG = Rig(hipY=0.88, headY=0.58, shoulderY=0.45, shoulderX=0.22, arm=0.32, hipX=0.12, thigh=0.42)
HAND = 0.27
# a mesma pose da receita (cast-enemies.ts): mão direita erguida em garra, antebraço esquerdo à frente com o livro
POSE_R, POSE_L, LEAN, OUT = (-0.7, -2.2, 0.1, 0.9), (-0.05, -0.95), 0.06, 0.14
HEAD_LIFT, HEAD_SCALE = 0.12, 1.12

SKIN, SKIN_D, SKIN_L = hexc(0xf2dccc), hexc(0xb08878), hexc(0xfcf0e6)
DRESS, DRESS_L, DRESS_D = hexc(0x4a3054), hexc(0x6c4c78), hexc(0x24142a)
TRIM = hexc(0xb08a4a)
HAIR, HAIR_L, HAIR_D = hexc(0xe2d8c2), hexc(0xf6f0e0), hexc(0x8a8070)
LEATH, LEATH_D, UNDER = hexc(0x5a3230), hexc(0x2e1618), hexc(0x4a2c26)
BONE, BONE_D = hexc(0xd4bf92), hexc(0x8a7458)
COVER, COVER_D, PAGE, PAGE_D, GOLD = hexc(0x6a3a22), hexc(0x341a0e), hexc(0xdccca8), hexc(0xa8966e), hexc(0xc89a5a)
DARK, LIPS, EYE = hexc(0x120a14), hexc(0xb08a8c), hexc(0x7affc8)


def cloth(base, dark, light=None):
    def f(co, n):
        c = mix(dark, base, 0.35 + 0.65 * ss(-0.7, 0.5, n.z))
        return mix(c, light, 0.35 * ss(0.5, 1.0, n.z)) if light else c
    return f


def skin(co, n):
    c = mix(SKIN_D, SKIN, 0.5 + 0.5 * ss(-0.6, 0.5, n.z - 0.3 * n.y))
    return mix(c, SKIN_L, 0.3 * ss(0.5, 1.0, -n.y + n.z))


def hair(co, n):
    c = mix(HAIR_D, HAIR, 0.45 + 0.55 * ss(-0.6, 0.6, n.z - 0.2 * n.y))
    c = mix(c, HAIR_L, 0.35 * ss(0.4, 1.0, n.z))
    k = 0.88 + 0.12 * math.sin(co.x * 90 + co.y * 40)   # mechas
    return tuple(x * k for x in c)


def strip(name, obj, xz, r, color, squash=0.35):
    """faixa fina deitada na superfície da frente de obj, passando pelos pontos (x, z)"""
    pts = []
    for x, z in xz:
        ok, hit, n, _ = obj.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
        if ok:
            pts.append(hit + n * r * squash * 0.6)
    t = tube(name, pts, [r] * len(pts), seg=6, squash=(1.0, squash), ref=(0, 1, 0))
    paint(t, lambda co, n: color)
    return t


def slab(name, center, basis, size, fn):
    """caixa com eixos basis (3 vetores) e meias medidas size"""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2.0)
    m = Matrix((basis[0], basis[1], basis[2])).transposed().to_4x4()
    m = Matrix.Translation(Vector(center)) @ m @ Matrix.Diagonal((*size, 1))
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)   # base canhota espelha a caixa e virava as faces para dentro
    o = new_mesh(name, bm)
    flat_shade(o)
    paint(o, fn)
    return o


# ------------------------------------------------------------------ cabeça: rosto pálido e fino, cabelo partido no meio
def head():
    parts = {"solid": [], "flat": [], "lit": []}
    h = meta("head", [
        EL((0, 0.01, 0.025), (0.078, 0.088, 0.09)),                  # crânio
        EL((0, -0.03, -0.03), (0.06, 0.064, 0.08)),                  # rosto
        CAP((0, -0.045, -0.075), (0, -0.052, -0.09), 0.022),         # queixo pequeno
        EL((-0.042, -0.056, -0.025), (0.03, 0.03, 0.03)),            # maçãs e bochechas cheias
        EL((0.042, -0.056, -0.025), (0.03, 0.03, 0.03)),
        CAP((0, -0.085, 0.02), (0, -0.1, -0.025), 0.011),            # nariz fino
        EL((-0.03, -0.092, 0.012), (0.02, 0.02, 0.013), neg=True),   # órbitas
        EL((0.03, -0.092, 0.012), (0.02, 0.02, 0.013), neg=True),
        CAP((0, 0.0, -0.08), (0, 0.01, -0.2), 0.025),                # pescoço fino
    ], res=0.006)
    smooth(h, iters=2, factor=0.5, target=460)
    paint(h, skin)
    parts["solid"].append(h)
    for s in (-1, 1):
        lid = ball("eye", (s * 0.03, -0.078, 0.01), (0.019, 0.008, 0.008), rot=(0, s * -0.2, 0), seg=(8, 4))
        paint(lid, lambda co, n: DARK)
        parts["flat"].append(lid)
        glow = ball("glow", (s * 0.03, -0.085, 0.009), (0.007, 0.004, 0.005), seg=(6, 4))
        paint(glow, lambda co, n: EYE)
        parts["lit"].append(glow)
        brow = tube("brow", [(s * 0.05, -0.08, 0.036), (s * 0.03, -0.09, 0.042), (s * 0.012, -0.091, 0.038)], [0.0035, 0.0035, 0.0035], seg=5)
        paint(brow, lambda co, n: HAIR_D)
        parts["flat"].append(brow)
    lips = tube("lips", [(-0.015, -0.087, -0.062), (0, -0.09, -0.062), (0.015, -0.087, -0.062)], [0.003, 0.0035, 0.003], seg=5)
    paint(lips, lambda co, n: LIPS)
    parts["flat"].append(lips)
    # cabelo: calota partida no meio e duas cortinas que descem dos lados do rosto até os ombros; o comprido das costas fica no tronco
    hr = meta("hair", [
        EL((0, 0.02, 0.04), (0.092, 0.1, 0.098)),
        EL((0, 0.07, -0.02), (0.085, 0.07, 0.1)),
        CAP((-0.07, -0.02, 0.03), (-0.08, 0.0, -0.13), 0.04),          # cortinas curtas: as longas saíam do corpo quando a cabeça girava
        CAP((0.07, -0.02, 0.03), (0.08, 0.0, -0.13), 0.04),
        CAP((-0.06, 0.04, 0.0), (-0.085, 0.06, -0.14), 0.045),
        CAP((0.06, 0.04, 0.0), (0.085, 0.06, -0.14), 0.045),
        EL((0, -0.08, 0.06), (0.06, 0.04, 0.04), neg=True),          # testa livre
        EL((0, -0.11, -0.04), (0.058, 0.06, 0.12), neg=True),        # rosto livre
    ], res=0.007)
    smooth(hr, iters=2, factor=0.5, target=520)
    paint(hr, hair)
    parts["solid"].append(hr)
    return parts


# ------------------------------------------------------------------ tronco: corpete de costelas, tiras de couro, cabelo longo
def torso():
    z0 = RIG.P("torso")[2]
    sx = RIG.shoulderX
    t = meta("torso", [
        EL((0, 0.0, z0 + 0.3), (0.15, 0.1, 0.14)),
        EL((0, -0.03, z0 + 0.28), (0.12, 0.08, 0.07)),               # busto
        EL((0, 0.0, z0 + 0.1), (0.1, 0.078, 0.12)),                  # cintura fina
        EL((-sx + 0.05, 0.0, z0 + 0.4), (0.05, 0.055, 0.045)),
        EL((sx - 0.05, 0.0, z0 + 0.4), (0.05, 0.055, 0.045)),
    ], res=0.011)
    smooth(t, iters=2, target=360)

    def tint(co, n):
        if co.y < -0.04 and abs(co.x) < 0.075 - (z0 + 0.45 - co.z) * 0.08 and co.z > z0 + 0.04 and co.z < z0 + 0.38:
            return mix(LEATH_D, hexc(0x8a5a3a), 0.4 + 0.6 * ss(-0.5, 0.6, n.z))   # painel de couro acobreado do corpete (vestido fechado até o pescoço: o decote pintado por vértice saía manchado)
        return cloth(DRESS, DRESS_D, DRESS_L)(co, n)
    paint(t, tint)
    out = [t]
    # corpete: coluna e costelas de osso na frente
    out.append(strip("spine", t, [(0, z0 + 0.38), (0, z0 + 0.25), (0, z0 + 0.1)], 0.014, BONE, squash=0.5))
    for k in range(5):
        z = z0 + 0.34 - k * 0.055
        w = 0.07 - k * 0.006
        for s in (-1, 1):
            out.append(strip("rib", t, [(s * 0.01, z), (s * w * 0.6, z - 0.006), (s * w, z - 0.022)], 0.009, BONE, squash=0.5))
    # tiras de couro: cinto e uma tira diagonal no ombro
    belt = tube("belt", [(0, 0.0, z0 + 0.02), (0, 0.0, z0 + 0.06)], [0.122, 0.12], seg=16)
    paint(belt, cloth(LEATH, LEATH_D))
    out.append(belt)
    buck = ball("buckle", (0, -0.124, z0 + 0.04), (0.022, 0.01, 0.02), seg=(8, 5))
    paint(buck, lambda co, n: GOLD)
    out.append(buck)
    pouch = ball("pouch", (-0.1, -0.07, z0 - 0.02), (0.04, 0.03, 0.045), seg=(8, 6))   # bolsa de couro no cinto
    paint(pouch, cloth(LEATH, LEATH_D))
    out.append(pouch)
    # gola em pé atrás do pescoço
    col = ring_loft("collar", [((0, 0.02, z0 + 0.4), (0, 0, -1), 0.13, 0.1, 0, 0), ((0, 0.04, z0 + 0.52), (0, 0, -1), 0.13, 0.1, 0, 0)],
                    seg=16, open_half=lambda i: 1.3, thick=0.016)
    paint(col, cloth(DRESS, DRESS_D, DRESS_L))
    out.append(col)
    # cabelo comprido nas costas, solto até a cintura, jogado para a esquerda dela (-x)
    hz = RIG.P("head")[2] + HEAD_LIFT
    elems = [EL((0, 0.09, hz - 0.08), (0.11, 0.06, 0.08))]
    # mechas separadas, soltas e abertas para o lado oposto à mão erguida, com volume nos lados
    elems.append(EL((0, 0.11, hz - 0.22), (0.15, 0.07, 0.1)))
    long = meta("hairlong", elems, res=0.01)
    smooth(long, iters=2, factor=0.5, target=300)
    paint(long, hair)
    out.append(long)
    # mechas em fita afinando até a ponta, com onda, abertas para o lado oposto à mão erguida (as cápsulas de ponta redonda liam
    # como dedos de luva)
    for x0, x1, y1, z1, r in ((-0.1, -0.24, 0.15, z0 + 0.06, 0.05), (-0.05, -0.26, 0.17, z0 + 0.0, 0.055), (0.0, -0.11, 0.19, z0 - 0.07, 0.055),
                              (0.05, 0.02, 0.18, z0 + 0.0, 0.05), (0.1, 0.13, 0.14, z0 + 0.12, 0.042)):
        a, b = Vector((x0, 0.1, hz - 0.14)), Vector((x1, y1, z1))
        side = Vector((1, 0, 0))
        pts = [a + (b - a) * t + side * 0.025 * math.sin(t * 6.0 + x0 * 30) * t for t in (0, 0.25, 0.5, 0.75, 1.0)]
        st = tube("strand", pts, [r * 1.3, r * 1.3, r * 1.15, r * 0.8, 0.02], seg=8, squash=(1.0, 0.65), ref=(0, 1, 0))
        smooth(st)
        paint(st, hair)
        out.append(st)
    return {"torso": out}


# ------------------------------------------------------------------ vestido longo aberto na frente, saia de baixo e botas
def skirt():
    rings = []
    spec = ((1.0, 0.12, 0.09, 0.0, 0.0, 0.0), (0.82, 0.17, 0.13, 0.01, 0.02, 0.0), (0.58, 0.22, 0.17, 0.02, 0.04, 0.2),
            (0.32, 0.31, 0.24, 0.04, 0.06, 0.32), (0.08, 0.4, 0.32, 0.06, 0.07, 0.42), (-0.02, 0.43, 0.35, 0.07, 0.07, 0.45))
    for z, rx, ry, cy, famp, _ in spec:
        rings.append(((0, cy, z), (0, 0, -1), rx, ry, 6, famp))
    sk = ring_loft("dress", rings, seg=26, thick=0.022, open_half=lambda i: max(0.02, spec[i][5]),
                   jag=lambda j: 0.014 * math.sin(j * 2.3))
    paint(sk, lambda co, n: TRIM if co.z < 0.07 else cloth(DRESS, DRESS_D, DRESS_L)(co, n))
    under = ring_loft("under", [((0, 0.0, 0.7), (0, 0, -1), 0.15, 0.12, 0, 0), ((0, 0.01, 0.3), (0, 0, -1), 0.21, 0.17, 4, 0.04),
                                ((0, 0.02, 0.0), (0, 0, -1), 0.3, 0.24, 4, 0.05)], seg=18, thick=0.0)
    paint(under, cloth(UNDER, LEATH_D))
    out = [sk, under]
    for s in (-1, 1):   # pontas das botas aparecendo na frente
        bt = ball("boot", (s * 0.075, -0.26, 0.012), (0.04, 0.1, 0.024), seg=(10, 6))   # bico achatado
        paint(bt, cloth(hexc(0x3a2018), hexc(0x1a0c08)))
        out.append(bt)
    return {"skirt": out}


# ------------------------------------------------------------------ braços: mangas em sino, mão em garra, livro aberto
FLAT_L, FLAT_R = [], []


def claw(h):
    out = []
    hand_skin = skin
    palm = ball("palm", tuple(h + Vector((0, 0, -0.01))), (0.06, 0.036, 0.068), seg=(10, 6))
    paint(palm, hand_skin)
    out.append(palm)
    for k, dx in enumerate((-0.05, -0.017, 0.017, 0.05)):
        ln = 0.13 + 0.02 * (1 - abs(k - 1.5) / 1.5)
        f = tube("finger", [h + Vector((dx, 0, -0.055)), h + Vector((dx * 1.5, -0.035, -0.055 - ln * 0.5)),
                            h + Vector((dx * 1.7, -0.085, -0.055 - ln * 0.85))], [0.02, 0.017, 0.006], seg=7)
        paint(f, hand_skin)
        FLAT_R.append(f)   # dedos sem contorno: com contorno a garra virava um borrão preto
    th = tube("thumb", [h + Vector((-0.045, -0.015, -0.01)), h + Vector((-0.09, -0.05, -0.065))], [0.016, 0.006], seg=6)
    paint(th, hand_skin)
    FLAT_R.append(th)
    for o in out:
        o["no_ao"] = True
    return out


def book(h, u):
    """livro aberto deitado sobre a mão, lombada ao longo do antebraço; as metades se abrem em V raso"""
    u = Vector(u)
    a = Vector((0, 0, -1)) - u * (-u.z)
    a.normalize()
    c = u.cross(a).normalized()
    # tomo grosso: a frente desce um pouco, mostrando as páginas para a câmera alta
    fwd = Matrix.Rotation(-0.6, 3, c)
    a, u = fwd @ a, fwd @ u
    base = h + u * 0.05
    out = []
    for s in (-1, 1):
        tilt = Matrix.Rotation(s * 0.42, 3, a)   # entreaberto
        cc, uu = tilt @ c, tilt @ u
        out.append(slab("cover", base + cc * s * 0.14, (cc, a, uu), (0.145, 0.185, 0.016), cloth(COVER, COVER_D)))
        out.append(slab("pages", base + cc * s * 0.13 + uu * 0.04, (cc, a, uu), (0.115, 0.158, 0.028),
                        lambda co, n: PAGE if n.dot(u) > 0.5 else PAGE_D))
        for k in range(4):   # linhas de texto (sem contorno: o contorno preto as transformava em riscos grossos)
            FLAT_L.append(slab("line", base + cc * s * 0.13 + uu * 0.069 + a * (0.09 - k * 0.058), (cc, a, uu), (0.075, 0.006, 0.002),
                            lambda co, n: hexc(0x6a5a48)))
        for e in (-1, 1):   # cantos dourados
            g = slab("corner", base + cc * s * 0.25 + a * e * 0.155 + uu * 0.004, (cc, a, uu), (0.04, 0.04, 0.02), lambda co, n: GOLD)
            paint(g, lambda co, n: GOLD)
            out.append(g)
    spine = tube("spine", [base - a * 0.185, base + a * 0.185], [0.034, 0.034], seg=8)
    paint(spine, cloth(COVER, COVER_D))
    out.append(spine)
    for o in out:
        o["no_ao"] = True   # as páginas entre a capa e as linhas saíam pretas na oclusão
    return out


def arms():
    out = {}
    for side, s, pose in (("L", -1, POSE_L), ("R", 1, POSE_R)):
        ax, ay, az = RIG.P("arm" + side)
        up = meta("sleeveU", [EL((ax, ay, az - 0.05), (0.055, 0.058, 0.05)), CAP((ax, ay, az - 0.04), (ax, ay, az - RIG.arm), 0.06)], res=0.011)
        smooth(up, iters=1, target=180)
        paint(up, cloth(DRESS, DRESS_D, DRESS_L))
        fr, _ = fore_rot(pose, s, LEAN, OUT)
        down = local_dir(fr, (0, 0, -1))
        e = Vector(RIG.P("fore" + side))
        hand = e + Vector((0, 0, -HAND))
        fore = tube("fore", [e, e + Vector((0, 0, -0.14)), e + Vector((0, 0, -0.22))], [0.07, 0.06, 0.045], seg=10)
        smooth(fore)
        paint(fore, cloth(DRESS, DRESS_D, DRESS_L))
        wrist = tube("wrist", [e + Vector((0, 0, -0.2)), e + Vector((0, 0, -0.25))], [0.035, 0.03], seg=8)
        paint(wrist, skin)
        # manga em sino muito larga caindo do cotovelo para o chão
        ln = 0.24 if side == "R" else 0.22
        drape = bell_sleeve("drape", e + down * 0.02, down, ln, 0.08, 0.16, sag=0.0, folds=5, famp=0.09,
                            axis=down, jag=lambda j: 0.05 * (j % 4 == 0) + 0.02 * (j % 2))
        tip = Vector(e) + down * ln * 0.8   # boca da manga com barra clara
        paint(drape, lambda co, n, tip=tip, down=down: TRIM if (co - tip).dot(down) > 0
              else cloth(DRESS, DRESS_D, DRESS_L)(co, n))
        parts = [fore, wrist, drape]
        if side == "R":
            parts += claw(hand)
        else:
            parts += book(hand, local_dir(fr, (0, 0, 1)))   # a mão fica escondida sob a capa (a palma exposta lia como bola solta)
        out["arm" + side] = [up]
        out["fore" + side] = parts
    return out


if __name__ == "__main__":
    reset()
    a = arms()
    a["foreL@flat"] = FLAT_L
    a["foreR@flat"] = FLAT_R
    parts = merge(place_head(RIG, head(), lift=HEAD_LIFT, scale=HEAD_SCALE), torso(), skirt(), a)
    finish("summoner", RIG, parts, ARGS, body_center=(0, 0, 0.9), body_dist=4.2, head_dist=1.1)
