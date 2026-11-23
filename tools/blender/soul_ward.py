# Soul Ward (Selo de Alma do Hollow King, M10-10 parte 2) modelado no Blender. Brief: docs/briefs/soul_ward.md. Rodar: ver tools/blender/README.md.
# Grava art/soul_ward.blend e src/game/chars/models/soul_ward.json. Blender: z para cima, frente em -y.
# Forma "wisp" (build.ts): hips no chão com o selo, parado; head (pivô no chão também) com a alma, que flutua e balança.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

PIV = {"hips": (0, 0, 0), "head": (0, 0, 0)}
# verde-menta claro (sprite ~#7fd3a6), sombra no máximo ~#4f9e7c
SOUL, SOUL_L, SOUL_D, SHEEN = hexc(0x6fd39a), hexc(0xa6eec4), hexc(0x3f9a6e), hexc(0xc8f7dc)
CORE, GOLD, GOLD_D, RUNE = hexc(0x1f4a40), hexc(0xe8c25a), hexc(0x8a6a2a), hexc(0x73ffcc)
BASE_Z = 0.3  # a base da alma: quase reta, flutuando acima do selo

# o buraco da alma: na frente, um pouco à esquerda, na metade de cima (como no sprite)
NUC_X, NUC_Z = -0.07, 0.66


def soul_tint(co, n):
    c = mix(SOUL_D, SOUL, ss(0.25, 0.7, co.z) * (0.55 + 0.45 * ss(-0.7, 0.3, n.z)))
    c = mix(c, SOUL_L, 0.7 * ss(0.3, 0.95, n.z) * ss(0.65, 0.95, co.z))
    # brilho largo e suave no alto à esquerda
    return mix(c, SHEEN, 0.35 * ss(0.65, 0.95, Vector(n).dot(Vector((-0.5, -0.3, 0.8)).normalized())))


def body():
    els = [
        EL((0, 0.0, 0.6), (0.46, 0.42, 0.34)),         # gota larga e baixa
        EL((0, 0.01, 0.46), (0.4, 0.37, 0.18)),        # base larga, fundida sem vinco
    ]
    # a voluta: a ponta do próprio corpo nasce da base, à frente-esquerda, e se enrola para cima num gancho só,
    # abaixo e à esquerda do olho (mesma malha e mesma cor: sem emenda, ponta redonda)
    hook = [(0.02, -0.3, 0.36), (-0.12, -0.39, 0.33), (-0.25, -0.42, 0.37), (-0.3, -0.42, 0.45), (-0.25, -0.42, 0.5),
            (-0.19, -0.41, 0.47)]
    rad = [0.06, 0.054, 0.046, 0.04, 0.034, 0.028]
    for i in range(len(hook) - 1):
        els.append(CAP(hook[i], hook[i + 1], rad[i], stiff=2.0))
    b = meta("soul", els, res=0.011)
    # base quase reta: o que passa de BASE_Z para baixo é achatado com uma borda macia
    for v in b.data.vertices:
        if v.co.z < BASE_Z + 0.04:
            v.co.z = BASE_Z + 0.04 - (BASE_Z + 0.04 - v.co.z) * 0.45
    smooth(b, iters=2, factor=0.4, target=3000)
    paint(b, soul_tint)
    return b


def surface(soul):
    """pouso na pele da frente: raio de (x, z) vindo de -y; devolve ponto e normal"""
    import mathutils.bvhtree as bvt
    tree = bvt.BVHTree.FromObject(soul, bpy.context.evaluated_depsgraph_get())

    def at(x, z):
        hit, nrm, _, _ = tree.ray_cast(Vector((x, -2.0, z)), Vector((0, 1, 0)))
        return hit, nrm
    return at


def decal(name, at, cx, cz, rx, rz, lift, col_fn, rings=6, seg=40):
    """disco pousado na pele (cada vértice no seu ponto da superfície), sem espessura: não sai do perfil"""
    bm = bmesh.new()
    hit, nrm = at(cx, cz)
    center = bm.verts.new(hit + nrm * lift)
    prev = None
    for r in range(1, rings + 1):
        ring = []
        for k in range(seg):
            a = 2 * math.pi * k / seg
            h, n = at(cx + math.cos(a) * rx * r / rings, cz + math.sin(a) * rz * r / rings)
            ring.append(bm.verts.new(h + n * lift))
        for k in range(seg):
            if prev is None:
                bm.faces.new((center, ring[(k + 1) % seg], ring[k]))
            else:
                bm.faces.new((prev[k], prev[(k + 1) % seg], ring[(k + 1) % seg], ring[k]))
        prev = ring
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_mesh(name, bm)
    paint(o, col_fn)
    return o


def eye_disc(at):
    """o buraco: verde-escuro chapado (não preto) no meio, clareando até a sombra do corpo na borda; sem brilho, como no sprite"""
    c, _ = at(NUC_X, NUC_Z)
    hole = decal("hole", at, NUC_X, NUC_Z, 0.165, 0.15, 0.006, lambda co, n: mix(CORE, SOUL_D, ss(0.1, 0.17, (Vector(co) - c).length)))
    return [hole]


def seal():
    """selo no chão: anel dourado com 4 marcas e um anel de runas aceso por dentro"""
    flat, lit = [], []
    for nm, R, w, col in (("ring", 0.78, 0.035, GOLD), ("ring_in", 0.56, 0.018, GOLD_D)):
        pts = [(R * math.cos(2 * math.pi * k / 48), R * math.sin(2 * math.pi * k / 48), 0.012) for k in range(49)]
        r = tube(nm, pts, [w] * len(pts), seg=4, squash=(1.0, 0.35), cap=False)
        paint(r, lambda co, n, col=col: col)
        flat.append(r)
    for k in range(4):  # marcas em losango nos 4 cantos, para fora do anel
        a = math.pi / 4 + k * math.pi / 2
        m = ball("mark", (0.88 * math.cos(a), 0.88 * math.sin(a), 0.012), (0.11, 0.05, 0.012), rot=(0, 0, a), seg=(4, 2))
        paint(m, lambda co, n: GOLD)
        flat.append(m)
    for k in range(12):  # runas: traços curtos acesos entre os dois anéis, alternando o tamanho
        a = 2 * math.pi * k / 12 + 0.13
        L = 0.06 if k % 2 else 0.04
        g = ball("rune", (0.67 * math.cos(a), 0.67 * math.sin(a), 0.014), (0.016, L, 0.008), rot=(0, 0, a), seg=(4, 2))
        paint(g, lambda co, n: RUNE)
        lit.append(g)
    return flat, lit


def build():
    soul = body()
    at = surface(soul)
    solid = [soul]
    hole = eye_disc(at)
    sflat, slit = seal()
    bake_ao([soul], strength=0.3, distance=0.1)
    return {"head": solid, "head@flat": hole, "hips@flat": sflat, "hips@lit": slit}


if __name__ == "__main__":
    reset()
    parts = build()
    counts = export_parts(os.path.join(ROOT, "src", "game", "chars", "models", "soul_ward.json"), parts, PIV)
    print("TRIS", sum(counts.values()), counts)
    if "review" in ARGS:
        review_setup((0, 0, 0))
        out = os.path.join(ROOT, ".shots")
        for name, yaw, pitch in [("front", 0, 12), ("tq", 35, 25), ("top", 0, 70)]:
            shot(os.path.join(out, f"bl-soul_ward-{name}.png"), (0, 0, 0.5), 3.4, yaw, pitch)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "art", "soul_ward.blend"))
