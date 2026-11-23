# Warden (golem de pedras empilhadas com runas douradas) modelado no Blender (M9-04). Brief: docs/briefs/warden.md.
# Rodar: ver tools/blender/README.md. Bípede de humanoid.py; cada parte é uma pilha de pedras talhadas (`rock`: bloco chanfrado com
# os vértices sacudidos, faces chapadas), com musgo no alto e runas acesas pousadas na face da pedra (`rune`).
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403
from humanoid import Rig, finish, merge  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
# iguais a b.dims da receita (cast-enemies.ts)
RIG = Rig(hipY=0.7, headY=0.5, shoulderY=0.54, shoulderX=0.47, arm=0.36, hipX=0.24, thigh=0.33)
HAND = 0.48

STONE, STONE_L, STONE_D = hexc(0x7c7a66), hexc(0xa8a48c), hexc(0x5c5a4c)
MOSS, MOSS_L = hexc(0x55603a), hexc(0x6c7848)
RUNE = hexc(0xd8983e)
EYE = hexc(0xffd870)
RNG = random.Random(7)


def stone_tint(seed):
    """cada pedra com um tom um pouco diferente; musgo no que está virado para cima"""
    k = 0.85 + 0.3 * random.Random(seed).random()
    base = tuple(min(1.0, c * k) for c in STONE)

    def f(co, n):
        c = mix(STONE_D, mix(base, STONE_L, ss(0.3, 1.0, n.z) * 0.6), 0.55 + 0.45 * ss(-0.7, 0.5, n.z))   # embaixo não vira buraco preto
        moss = ss(0.55, 0.9, n.z) * ss(0.1, 0.6, math.sin(co.x * 37 + seed) * math.cos(co.y * 31 - seed))
        return mix(c, mix(MOSS, MOSS_L, ss(0.7, 1.0, n.z)), moss * 0.75)
    return f


LEG_TINT = (0.8, 0.8, 0.84)


def rock(name, c, half, rot=(0, 0, 0), bev=0.35, jit=0.1, seed=None, tint=None):
    """pedra talhada: cubo com as quinas chanfradas, vértices sacudidos e faces chapadas; half = meias medidas (x, y, z)"""
    seed = RNG.randrange(1 << 20) if seed is None else seed
    r = random.Random(seed)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2.0)
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bev, segments=1, affect="EDGES")
    for v in bm.verts:
        v.co += Vector((r.uniform(-1, 1), r.uniform(-1, 1), r.uniform(-1, 1))) * jit   # no cubo de -1 a 1: proporcional à pedra
    m = Matrix.Translation(Vector(c)) @ Euler(rot).to_matrix().to_4x4() @ Matrix.Diagonal((*half, 1))
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_mesh(name, bm)
    flat_shade(o)
    f = stone_tint(seed)
    paint(o, f if not tint else (lambda co, n: tuple(a * b for a, b in zip(f(co, n), tint))))
    return o


def rune(name, objs, pts, d, r=0.014):
    """traço de runa aceso pousado na face das pedras: raios na direção d passando por pts (perto da superfície)"""
    d = Vector(d).normalized()
    hits = []
    for p in pts:
        best = None
        for o in objs:
            ok, hit, nrm, _ = o.ray_cast(Vector(p) - d * 0.5, d)
            if ok and (best is None or (hit - Vector(p)).length < (best[0] - Vector(p)).length):
                best = (hit, nrm)
        if best:
            hits.append(best[0] - d * r * 0.6)
    if len(hits) < 2:
        return None
    t = tube(name, hits, [r] * len(hits), seg=5)
    paint(t, lambda co, n: RUNE)
    return t


# ------------------------------------------------------------------ cabeça: bloco pequeno e quadrado, testa saliente, olhos acesos
def head():
    hx, hy, hz = RIG.P("head")
    c = Vector((hx + 0.03, hy - 0.12, hz + 0.07))
    h = rock("head", c, (0.15, 0.15, 0.125), rot=(0.12, 0.08, 0.1), bev=0.3, jit=0.12)
    brow = rock("brow", c + Vector((0.01, -0.07, 0.055)), (0.16, 0.07, 0.05), rot=(-0.15, 0.05, -0.08), bev=0.35, jit=0.12)
    jaw = rock("jaw", c + Vector((-0.01, -0.05, -0.09)), (0.15, 0.13, 0.07), rot=(0.15, -0.06, 0.06), bev=0.3, jit=0.1)
    lit = []
    for s in (-1, 1):
        e = ball("eye", c + Vector((s * 0.062, -0.148, 0.015 + s * 0.006)), (0.03, 0.014, 0.018), seg=(8, 4))
        paint(e, lambda co, n: EYE)
        lit.append(e)
    return {"head": [h, brow, jaw], "head@lit": lit}


# ------------------------------------------------------------------ tronco: peito de pedras empilhadas, ombros enormes, runas
def torso():
    z0 = RIG.P("torso")[2]
    sx = RIG.shoulderX
    st = []
    st.append(rock("chest", (0, -0.08, z0 + 0.34), (0.28, 0.25, 0.18), rot=(0.05, 0, 0.03), tint=(1.4, 1.4, 1.34)))   # mais clara: fica na sombra da cabeça e dos ombros
    st.append(rock("chestL", (-0.2, -0.02, z0 + 0.3), (0.13, 0.221, 0.14), rot=(0.08, 0.1, -0.08)))
    st.append(rock("chestR", (0.2, -0.02, z0 + 0.31), (0.13, 0.221, 0.15), rot=(0.06, -0.12, 0.1)))
    st.append(rock("belly", (0, -0.04, z0 + 0.1), (0.21, 0.208, 0.11), rot=(-0.04, 0, -0.05)))
    st.append(rock("waist", (0, 0.01, z0 - 0.04), (0.18, 0.182, 0.08), rot=(0, 0, 0.06)))
    st.append(rock("back", (0, 0.17, z0 + 0.36), (0.26, 0.13, 0.18), rot=(-0.15, 0, -0.03)))
    st.append(rock("hump", (0.02, 0.24, z0 + 0.44), (0.24, 0.15, 0.13), rot=(-0.3, 0.05, 0.05)))
    st.append(rock("hump2", (-0.06, 0.26, z0 + 0.36), (0.18, 0.1, 0.14), rot=(-0.1, -0.1, 0.12)))
    for s in (-1, 1):   # ombros: blocos enormes que sobem acima do pescoço
        big = 1.12 if s < 0 else 0.95
        st.append(rock("shoulder", (s * (sx - 0.08), 0.03, z0 + 0.42 + (0.03 if s < 0 else 0)), (0.2 * big, 0.2 * big, 0.15 * big), rot=(0.05, s * 0.25, s * 0.1)))
    # runa: um glifo quebrado e torto na barriga, fora do centro (sem letra nem "boca")
    rz, rx, K = z0 + 0.36, 0.1, 1.5
    c0 = (rx, rz)
    # rachadura estreita e torta, alta e de lado (larga e baixa, sob a cabeça, virava um sorriso)
    cracks = [[(0, 0), (0.03, 0.07), (0.02, 0.12), (0.06, 0.17)], [(0, 0), (-0.03, -0.07), (0.0, -0.13), (-0.02, -0.18)],
              [(0.03, 0.07), (0.09, 0.09)], [(0.0, -0.13), (0.06, -0.15)]]
    lit = [rune(f"crack{k}", st, [(c0[0] + x, -0.6, c0[1] + z) for x, z in pts], (0, 1, 0), r=0.024 if k < 2 else 0.016)
           for k, pts in enumerate(cracks)]
    core = ball("runecore", (c0[0], -0.6, c0[1]), (0.035, 0.02, 0.035), seg=(8, 5))
    ok = None
    for o in st:
        r_ = o.ray_cast(Vector((c0[0], -0.6, c0[1])), Vector((0, 1, 0)))
        if r_[0] and (ok is None or r_[1].y < ok.y):
            ok = r_[1]
    if ok is not None:
        core.location = (0, 0, 0)
        core.data.transform(Matrix.Translation(ok - Vector((c0[0], -0.6, c0[1]))))
    paint(core, lambda co, n: RUNE)
    lit.append(core)
    return {"torso": st, "torso@lit": [x for x in lit if x]}


def hips():
    z = RIG.P("hips")[2]
    return {"hips": [rock("pelvis", (0, 0.01, z + 0.03), (0.28, 0.2, 0.12), rot=(0, 0, -0.04), tint=LEG_TINT)]}


def limbs():
    out = {}
    for side, s in (("L", -1), ("R", 1)):
        ax, ay, az = RIG.P("arm" + side)
        up = [rock("upper", (ax + s * 0.02, ay, az - 0.14), (0.12, 0.156, 0.15), rot=(0.06, 0, s * 0.08)),
              rock("upper2", (ax + s * 0.03, ay + 0.01, az - 0.29), (0.1, 0.137, 0.07), rot=(-0.1, 0.1, -s * 0.1))]
        fx, fy, fz = RIG.P("fore" + side)
        # antebraço que engrossa até o punho, o maior bloco do corpo, na altura do joelho
        fore = [rock("fore", (fx, fy, fz - 0.1), (0.13, 0.16, 0.1), rot=(0.08, 0, s * 0.06)),
                rock("fore2", (fx + s * 0.01, fy - 0.01, fz - 0.23), (0.15, 0.17, 0.08), rot=(-0.06, 0.08, -s * 0.05)),
                rock("fore3", (fx, fy - 0.01, fz - 0.31), (0.16, 0.18, 0.05), rot=(0.05, -0.06, s * 0.04)),
                rock("fist", (fx, fy - 0.03, fz - HAND + 0.06), (0.22, 0.21, 0.16), rot=(0.1, 0, s * 0.05)),
                rock("knuckle", (fx, fy - 0.2, fz - HAND + 0.04), (0.19, 0.06, 0.12), rot=(0.05, 0, 0), bev=0.3)]
        # runas na frente do antebraço (de frente e de cima se leem; na lateral viravam fresta de luz)
        # veios ramificados no antebraço e no dorso do punho, da mesma família da rachadura do peito
        V = [[(0, 0), (0.04, -0.07), (0.02, -0.15)], [(0, 0), (-0.05, -0.05)], [(0.04, -0.07), (0.09, -0.09)]]
        lit = [rune(f"vein{side}{k}", fore, [(fx + s * x, fy - 0.5, fz - 0.1 + z) for x, z in pts], (0, 1, 0), r=0.02 if k == 0 else 0.015)
               for k, pts in enumerate(V)]
        lit += [rune(f"fvein{side}{k}", fore, [(fx + s * x, fy - 0.03 + y, fz - HAND + 0.4) for x, y in pts], (0, 0, -1), r=0.018)
                for k, pts in enumerate([[(-0.08, 0.04), (0.0, -0.02), (0.07, -0.08)], [(0.0, -0.02), (0.02, 0.08)]])]
        hx, hy, hz = RIG.P("thigh" + side)
        th = [rock("thigh", (hx + s * 0.02, hy, hz - 0.13), (0.18, 0.19, 0.15), rot=(0.05, 0, s * 0.05), tint=LEG_TINT)]
        kx, ky, kz = RIG.P("shin" + side)
        sh = [rock("shin", (kx + s * 0.01, ky, kz - 0.14), (0.16, 0.17, 0.13), rot=(-0.05, 0, -s * 0.04), tint=LEG_TINT),
              rock("foot", (kx + s * 0.02, ky - 0.05, 0.06), (0.17, 0.21, 0.07), rot=(0, 0, s * 0.05), tint=LEG_TINT)]
        out["arm" + side] = up
        out["fore" + side] = fore
        out["fore" + side + "@lit"] = [x for x in lit if x]
        out["thigh" + side] = th
        out["shin" + side] = sh
    return out


if __name__ == "__main__":
    reset()
    parts = merge(head(), torso(), hips(), limbs())
    print("DIMS", RIG.dims_ts())
    finish("warden", RIG, parts, ARGS, ao=0.35, body_center=(0, 0, 0.75), body_dist=4.4, head_dist=1.1)
