# Splitter (gosma rosa com ossos dentro) modelado no Blender (M3-02). Brief: docs/briefs/splitter.md. Rodar: ver tools/blender/README.md.
# Grava art/splitter.blend e src/game/chars/models/splitter.json. Blender: z para cima, frente em -y.
# Um osso só (build.ts, forma "slime"): hips com pivô no chão; a animação achata e estica a gosma inteira.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

PIV = {"hips": (0, 0, 0)}
PINK, PINK_L, SHEEN, PINK_D, DEEP = hexc(0xcc3879), hexc(0xfa74b8), hexc(0xffdcf6), hexc(0x691340), hexc(0x440624)
BONE, BONE_D, GLINT, TOOTH = hexc(0xf6c4cc), hexc(0xb06a80), hexc(0xfff2f8), hexc(0xfff0f4)

# ossos dentro da gosma, deitados na metade de cima da cúpula: (direção do centro, giro da tangente, comprimento)
BONE_SPEC = [((-0.7, -0.35, 0.55), 0.9, 0.36), ((0.75, -0.2, 0.45), -0.6, 0.32), ((0.35, 0.35, 0.85), 0.3, 0.36),
             ((-0.5, 0.6, 0.6), 1.4, 0.34)]
SKULL_U = (-0.45, -0.55, 0.75)
BONES, SKULL, SKULL_N = [], (0, 0, -9), (0, 0, 1)  # preenchidos em place() a partir da malha da gosma


def on_surface(obj, u, sink):
    """raio de fora para dentro até a superfície da gosma na direção u (a partir do meio do pudim); devolve ponto afundado e normal"""
    c, u = Vector((0, 0, 0.5)), Vector(u).normalized()
    ok, hit, n, _ = obj.ray_cast(c + u * 3, -u)
    return hit - n * sink, n


def place(obj):
    global SKULL, SKULL_N
    for u, rot, ln in BONE_SPEC:
        p, n = on_surface(obj, u, 0.012)
        t = n.cross(Vector((0, 0, 1))).normalized()
        t = (t * math.cos(rot) + n.cross(t) * math.sin(rot)).normalized()
        BONES.append((tuple(p), tuple(t), ln))
    sp, SKULL_N = on_surface(obj, SKULL_U, -0.01)
    SKULL = tuple(sp)


def slime_tint(co, n):
    c = mix(PINK_D, PINK, ss(-0.6, 0.2, n.z) * (0.4 + 0.6 * ss(0.0, 0.35, co.z)))
    c = mix(c, PINK_L, 0.7 * ss(0.25, 0.9, n.z))
    # reflexo úmido: mancha clara no alto à frente-esquerda e linha na curva da frente
    c = mix(c, SHEEN, 0.85 * ss(0.82, 0.97, Vector(n).dot(Vector((-0.35, -0.45, 0.82)).normalized())))
    # osso visto pela gosma: mancha escura em volta de cada osso e da caveira
    for p, _, ln in BONES + [(SKULL, None, 0.3)]:
        d = (Vector(co) - Vector(p)).length
        c = mix(c, PINK_D, 0.6 * (1 - ss(ln * 0.4, ln * 0.8, d)))
    return c


def blob():
    els = [
        EL((0, 0.0, 0.5), (0.64, 0.6, 0.5)),                      # pudim
        EL((0, -0.04, 0.8), (0.46, 0.42, 0.26)),                  # topo, um pouco para a frente
        EL((0, 0.0, 0.15), (0.74, 0.7, 0.18)),                    # base um pouco mais larga
        CAP((-0.3, -0.5, 0.84), (-0.05, -0.6, 0.74), 0.05, stiff=1.2),  # arcada pesada em V, carranca
        CAP((0.3, -0.5, 0.84), (0.05, -0.6, 0.74), 0.05, stiff=1.2),
        EL((-0.17, -0.6, 0.66), (0.1, 0.08, 0.065), neg=True),   # órbitas
        EL((0.17, -0.6, 0.66), (0.1, 0.08, 0.065), neg=True),
        EL((0, -0.66, 0.42), (0.26, 0.16, 0.15), neg=True),      # boca grande aberta
    ]
    # línguas que escorrem da base até o chão, de tamanhos diferentes
    # (lobos baixos e largos, colados à base: babado irregular, não pés)
    for ang, r, w in ((0.35, 0.74, 0.24), (1.15, 0.7, 0.13), (2.05, 0.8, 0.26), (3.05, 0.7, 0.15), (3.75, 0.84, 0.22),
                      (4.45, 0.68, 0.12), (5.25, 0.78, 0.25), (5.95, 0.69, 0.11)):
        els.append(EL((r * math.sin(ang), -r * math.cos(ang), 0.05), (w, w * 0.8, 0.07), rot=(0, 0, ang)))
    b = meta("slime", els, res=0.02)
    # o chão corta a gosma: achata o que ficou abaixo de z = 0
    for v in b.data.vertices:
        if v.co.z < 0.004:
            v.co.z = 0.004
    smooth(b, iters=2, factor=0.4, target=900)
    paint(b, slime_tint)
    return b


def bone(p, d, ln):
    p, d = Vector(p), Vector(d).normalized()
    a, c = p - d * ln / 2, p + d * ln / 2
    side = d.cross(Vector((0, 0, 1))).normalized() * 0.035
    side = side * 1.5
    objs = [tube("shaft", [a, c], [0.048, 0.048], seg=6)]
    for e in (a, c):  # cabeça do fêmur em duas bolas
        objs += [ball("knob", e + side, (0.066, 0.066, 0.066), seg=(8, 5)), ball("knob", e - side, (0.066, 0.066, 0.066), seg=(8, 5))]
    for o in objs:
        paint(o, lambda co, n: mix(BONE_D, BONE, 0.45 + 0.55 * ss(-0.4, 0.8, n.z)))
    return objs


def build():
    solid, flat, lit = [blob()], [], []
    place(solid[0])
    paint(solid[0], slime_tint)  # de novo, agora com a mancha escura em volta dos ossos
    for p, d, ln in BONES:
        solid += bone(p, d, ln)
    # caveira afundada pela metade na cúpula, à frente e à esquerda: crânio largo, maxilar estreito, órbitas grandes
    nrm = Vector(SKULL_N)
    up = (Vector((0, 0, 1)) - nrm * nrm.z).normalized()
    sk = ball("skull", SKULL, (0.16, 0.15, 0.14), seg=(14, 10))
    jaw = ball("jaw", tuple(Vector(SKULL) - up * 0.1 + nrm * 0.01), (0.08, 0.07, 0.06), seg=(10, 6))
    for o in (sk, jaw):
        smooth(o)
        paint(o, lambda co, n: mix(BONE_D, BONE, 0.5 + 0.5 * n.z))
        solid.append(o)
    side = nrm.cross(up).normalized()
    for s in (-1, 1):
        h = ball("sk_eye", tuple(Vector(SKULL) + nrm * 0.115 + side * s * 0.055 + up * 0.03), (0.05, 0.05, 0.05), seg=(8, 5))
        paint(h, lambda co, n: DEEP)
        flat.append(h)
        if s > 0:  # nariz em triângulo e fileira de dentes no maxilar: caveira, não globo ocular
            nose = cone("sk_nose", tuple(Vector(SKULL) + nrm * 0.135 - up * 0.04), tuple(Vector(SKULL) + nrm * 0.135 - up * 0.0), 0.024, seg=3)
            paint(nose, lambda co, n: DEEP)
            flat.append(nose)
            for k in (-1.5, -0.5, 0.5, 1.5):
                tt = ball("sk_tooth", tuple(Vector(SKULL) - up * 0.11 + nrm * 0.085 + side * k * 0.026), (0.012, 0.012, 0.018), seg=(5, 3))
                paint(tt, lambda co, n: DEEP)
                flat.append(tt)
        # olho: fundo escuro na órbita, com um brilho
        e = ball("eye", (s * 0.17, -0.585, 0.655), (0.08, 0.03, 0.05), rot=(0, -s * 0.35, 0), seg=(10, 6))
        paint(e, lambda co, n: DEEP)
        flat.append(e)
        g = ball("glint", (s * 0.17 - 0.025, -0.615, 0.675), (0.02, 0.01, 0.018), seg=(6, 4))
        paint(g, lambda co, n: GLINT)
        lit.append(g)
    m = ball("mouth", (0, -0.6, 0.42), (0.24, 0.06, 0.13), seg=(12, 7))
    paint(m, lambda co, n: DEEP)
    flat.append(m)
    for i in range(5):  # dentes de cima, para baixo
        x = (i - 2) * 0.085
        t = cone("tooth", (x, -0.66 + abs(x) * 0.3, 0.54 - abs(x) * 0.3), (x, -0.665 + abs(x) * 0.3, 0.45 - abs(x) * 0.3), 0.04, seg=4)
        paint(t, lambda co, n: TOOTH)
        flat.append(t)
    for i in range(4):  # dentes de baixo, para cima
        x = (i - 1.5) * 0.095
        t = cone("tooth", (x, -0.65 + abs(x) * 0.3, 0.3 + abs(x) * 0.2), (x, -0.655 + abs(x) * 0.3, 0.37 + abs(x) * 0.2), 0.034, seg=4)
        paint(t, lambda co, n: TOOTH)
        flat.append(t)
    # poça rasa e gotas soltas no chão
    pool = ball("pool", (0.05, -0.05, 0.0), (1.0, 0.95, 0.02), seg=(40, 4))
    for v in pool.data.vertices:  # borda irregular, com três línguas que avançam
        a = math.atan2(v.co.y + 0.05, v.co.x - 0.05)
        k = 0.9 + 0.08 * math.sin(a * 5 + 1) + 0.05 * math.sin(a * 9) + 0.22 * max(0, math.sin(a * 3 + 0.4)) ** 6
        v.co.x, v.co.y = 0.05 + (v.co.x - 0.05) * k, -0.05 + (v.co.y + 0.05) * k
    paint(pool, lambda co, n: mix(PINK_D, PINK, 0.5))
    flat.append(pool)
    for x, y, r in ((-0.95, -0.55, 0.07), (0.9, -0.7, 0.05), (1.05, 0.25, 0.06)):
        d = ball("drop", (x, y, 0.02), (r, r, r * 0.5), seg=(8, 4))
        paint(d, lambda co, n: mix(PINK, PINK_L, ss(0.0, 0.9, n.z)))
        solid.append(d)
    bake_ao([solid[0]], strength=0.55, distance=0.12)
    return {"hips": solid, "hips@flat": flat, "hips@lit": lit}


if __name__ == "__main__":
    reset()
    parts = build()
    counts = export_parts(os.path.join(ROOT, "src", "game", "chars", "models", "splitter.json"), parts, PIV)
    print("TRIS", sum(counts.values()), counts)
    if "review" in ARGS:
        review_setup((0, 0, 0))
        out = os.path.join(ROOT, ".shots")
        for name, yaw, pitch in [("front", 0, 12), ("tq", 35, 25), ("top", 0, 70)]:
            shot(os.path.join(out, f"bl-splitter-{name}.png"), (0, 0, 0.45), 4.2, yaw, pitch)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "art", "splitter.blend"))
