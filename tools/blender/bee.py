# Abelha da Ninhada (técnica Broodmother da Vesper) modelada no Blender (M2-11, junto da Vesper). Rodar: ver tools/blender/README.md.
# Grava art/bee.blend e src/game/chars/models/bee.json. Blender: z para cima, frente em -y.
# Ossos (build.ts, forma "bat"): hips = o corpo (origem aqui), wingL/wingR em (±0,16, 0,05) do three, batem em torno do eixo da frente.
# Pequena no jogo (escala 0,5 na receita) e aparece em bando: poucas peças, formas grandes, cores chapadas e fortes.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F403

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

PIV = {"hips": (0, 0, 0), "wingL": (-0.16, 0, 0.05), "wingR": (0.16, 0, 0.05)}
YEL, YEL_D, YEL_L = hexc(0xffc62a), hexc(0xb87a10), hexc(0xffe58a)
BLK, BLK_D, BLK_L = hexc(0x3a3038), hexc(0x16101a), hexc(0x5e5262)
EYE, EYE_L = hexc(0x1a1420), hexc(0x6a5a8a)
WING, WING_D = hexc(0xeef6ff), hexc(0x8aa8cc)

ABD_TOP, ABD_DIR, ABD_LEN, NB = Vector((0, 0.06, 0.02)), Vector((0, 0.94, -0.34)).normalized(), 0.5, 5


def yellow(co, n):
    c = mix(YEL_D, YEL, 0.4 + 0.6 * ss(-0.7, 0.4, n.z))
    return mix(c, YEL_L, 0.4 * ss(0.4, 1.0, n.z))


def black(co, n):
    c = mix(BLK_D, BLK, 0.45 + 0.55 * ss(-0.6, 0.5, n.z))
    return mix(c, BLK_L, 0.35 * ss(0.5, 1.0, n.z))


def body():
    solid, flat = [], []
    # tórax felpudo amarelo
    th = meta("thorax", [EL((0, -0.08, 0.03), (0.16, 0.15, 0.15)), EL((0, -0.06, -0.03), (0.13, 0.12, 0.1))], res=0.012)
    smooth(th, iters=2, factor=0.5, target=150)
    paint(th, lambda co, n: tuple(x * (0.9 + 0.1 * abs(math.sin(co.x * 120 + co.z * 90))) for x in yellow(co, n)))   # pelo
    solid.append(th)
    # abdômen em gomos ao longo de um eixo para trás e para baixo; cada gomo é uma peça de uma cor só (listra de corte nítido,
    # pintada por vértice borrava), o seguinte um pouco encaixado no anterior
    radii = (0.14, 0.175, 0.17, 0.13, 0.075)
    for i, r in enumerate(radii):
        c = ABD_TOP + ABD_DIR * ABD_LEN * (i + 0.6) / NB
        g = sball("seg", tuple(c), (r * 1.02, ABD_LEN / NB * 0.85, r * 0.92), rot=(math.atan2(ABD_DIR.z, ABD_DIR.y), 0, 0), seg=(12, 7))
        paint(g, black if i % 2 else yellow)
        g["embed"] = True
        solid.append(g)
    tip = ABD_TOP + ABD_DIR * ABD_LEN * (NB - 0.4 + 0.6) / NB
    st = cone("sting", tip - ABD_DIR * 0.02, tip + ABD_DIR * 0.12, 0.03, seg=8)
    paint(st, lambda co, n: BLK_D)
    solid.append(st)
    # cabeça escura e redonda, olhos compostos grandes e brilhantes dos lados, antenas em cotovelo com ponta em bola
    hd = meta("head", [EL((0, -0.27, 0.04), (0.12, 0.1, 0.115)), EL((0, -0.33, -0.01), (0.075, 0.05, 0.06))], res=0.01)
    smooth(hd, iters=2, factor=0.5, target=130)
    paint(hd, black)
    solid.append(hd)
    for s in (-1, 1):
        e = sball("eye", (s * 0.075, -0.3, 0.06), (0.05, 0.052, 0.07), rot=(0, 0, s * 0.35), seg=(10, 6))
        paint(e, lambda co, n: mix(EYE, EYE_L, 0.6 * ss(0.3, 1.0, n.z - 0.3 * n.y)))
        flat.append(e)
        hi = sball("hi", (s * 0.09, -0.34, 0.1), (0.014, 0.008, 0.016), seg=(6, 4))
        paint(hi, lambda co, n: hexc(0xffffff))
        flat.append(hi)
        ant = tube("ant", [(s * 0.035, -0.33, 0.12), (s * 0.06, -0.37, 0.24), (s * 0.1, -0.46, 0.27)], [0.012, 0.01, 0.008], seg=5)
        paint(ant, lambda co, n: BLK_D)
        solid.append(ant)
        ab = sball("antip", (s * 0.1, -0.46, 0.27), (0.022, 0.022, 0.022), seg=(8, 5))
        paint(ab, black)
        solid.append(ab)
        # três patas finas dobradas sob o tórax
        for k in range(3):
            y0 = -0.14 + k * 0.07
            leg = tube("leg", [(s * 0.08, y0, -0.06), (s * 0.15, y0 + 0.01, -0.12), (s * 0.13, y0 + 0.05, -0.2)], [0.014, 0.011, 0.006], seg=5)
            paint(leg, lambda co, n: BLK_D)
            solid.append(leg)
    # ferrinho de boca: duas mandíbulas curtas
    for s in (-1, 1):
        m = cone("mand", (s * 0.025, -0.36, -0.04), (s * 0.008, -0.39, -0.08), 0.012, seg=5)
        paint(m, lambda co, n: BLK_D)
        flat.append(m)
    return solid, flat


def lens(name, L, W, T, fn, nu=8, nv=6):
    """lente achatada ao longo de +x (raiz na origem), como as asas da Vesper"""
    o = sball(name, (0, 0, 0), (1, 1, 1), seg=(nv, nu))
    for v in o.data.vertices:
        nx, ny, nz = v.co
        u = (1 - nz) / 2
        pr = math.sin(math.pi * u ** 0.7)
        k = pr / max(0.05, math.sqrt(max(0.0, 1 - nz * nz)))
        v.co = Vector((u * L, nx * W * k, ny * T * k))
    o.data.update()
    paint(o, fn)
    return o


def wing(s):
    """duas asas claras por lado (a da frente maior), quase na horizontal e um pouco erguidas, apontando para fora e para trás;
    sem contorno (a membrana fina vazava o contorno), com borda e nervura azul-acinzentadas"""
    out = []
    for L, W, d, root in ((0.42, 0.13, (s * 1.0, 0.55, 0.22), (s * 0.14, -0.06, 0.12)), (0.3, 0.09, (s * 0.8, 0.95, 0.12), (s * 0.13, 0.0, 0.09))):
        def wp(co, n, L=L, W=W):
            u = co.x / L
            pr = max(1e-4, abs(math.sin(math.pi * min(1.0, max(0.0, u)) ** 0.7)) * W)
            a = abs(co.y) / pr
            c = mix(WING, WING_D, 0.25 * u + 0.75 * ss(0.75, 1.0, a))
            return mix(c, WING_D, 0.7 * ss(0.0, 0.12, 0.12 - abs(co.y + 0.15 * W)))   # nervura
        w = lens("wing", L, W, 0.01, wp)
        dd = Vector(d).normalized()
        nrm = Vector((0, 0, 1))
        nrm = (nrm - dd * nrm.dot(dd)).normalized()
        ww = nrm.cross(dd).normalized()
        w.data.transform(Matrix.Translation(Vector(root)) @ Matrix((dd, ww, nrm)).transposed().to_4x4())
        w.data.update()
        out.append(w)
    return out


if __name__ == "__main__":
    reset()
    solid, flat = body()
    parts = {"hips": solid, "hips@flat": flat, "wingL@flat": wing(-1), "wingR@flat": wing(1)}
    soften(parts)
    bake_ao([o for o in solid if not o.get("embed")], strength=0.5, distance=0.06)
    counts = export_parts(os.path.join(ROOT, "src", "game", "chars", "models", "bee.json"), parts, PIV)
    print("TRIS", sum(counts.values()), counts)
    check_finish(parts)
    if "review" in ARGS:
        review_setup((0, 0, 0))
        out = os.path.join(ROOT, ".shots")
        for name, yaw, pitch in [("front", 0, 10), ("tq", 35, 25), ("side", 90, 10), ("top", 0, 70)]:
            shot(os.path.join(out, f"bl-bee-{name}.png"), (0, 0.0, 0.0), 2.2, yaw, pitch)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "art", "bee.blend"))
