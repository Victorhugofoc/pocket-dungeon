# Ferramentas para modelar personagens no Blender por script (rodar com Blender em segundo plano, ver tools/blender/README.md).
# Convenção: Blender com z para cima e a frente do personagem em -y. Na exportação, three = (x, z, -y).
import base64
import json
import math

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def new_mesh(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return link(bpy.data.objects.new(name, me))


def meta(name, elems, res=0.008, thresh=0.6):
    """Superfície de metaballs (une as formas suavemente) convertida em malha. Cada elemento:
    (tipo, centro, raio, tamanho xyz ou None, rotação euler ou None, negativo, rigidez)."""
    mb = bpy.data.metaballs.new(name)
    mb.resolution = res
    mb.render_resolution = res
    mb.threshold = thresh
    for t, co, r, size, rot, neg, stiff in elems:
        e = mb.elements.new(type=t)
        e.co = co
        e.radius = r
        if size:
            e.size_x, e.size_y, e.size_z = size
        if rot:
            e.rotation = Euler(rot).to_quaternion()
        e.use_negative = neg
        e.stiffness = stiff
    obj = link(bpy.data.objects.new(name + "_mb", mb))
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
    bpy.data.objects.remove(obj)
    out = link(bpy.data.objects.new(name, me))
    return out


K = 0.574  # com threshold 0,6 e rigidez 2, a superfície de uma bola isolada fica a 0,574 do raio


def EL(co, axes, rot=None, neg=False, stiff=2.0):
    """elipsoide com semi-eixos reais (isolado)"""
    m = max(axes)
    return ("ELLIPSOID", co, m / K, tuple(a / m for a in axes), rot, neg, stiff)


def E(co, r, size=None, rot=None, stiff=2.0):
    return ("ELLIPSOID" if size else "BALL", co, r, size, rot, False, stiff)


def NEG(co, r, size=None, rot=None, stiff=2.0):
    return ("ELLIPSOID" if size else "BALL", co, r, size, rot, True, stiff)


def CAP(a, b, r, stiff=2.0):
    """cápsula de a até b"""
    a, b = Vector(a), Vector(b)
    d = b - a
    rot = d.to_track_quat("X", "Z").to_euler()
    return ("CAPSULE", (a + b) / 2, r / K, (d.length / 2, 1, 1), tuple(rot), False, stiff)


def tube(name, pts, radii, seg=10, squash=(1.0, 1.0), cap=True, twist=0.0, ref=None):
    """tubo ao longo de pts com raio por ponto; squash achata a seção (largura, espessura)"""
    bm = bmesh.new()
    pts = [Vector(p) for p in pts]
    rings = []
    up = Vector((0, 0, 1))
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        r = Vector(ref) if ref else (up if abs(t.dot(up)) < 0.9 else Vector((0, 1, 0)))
        u = t.cross(r).normalized()
        v = u.cross(t).normalized()
        ring = []
        for k in range(seg):
            a = 2 * math.pi * k / seg + twist
            off = u * math.cos(a) * radii[i] * squash[0] + v * math.sin(a) * radii[i] * squash[1]
            ring.append(bm.verts.new(p + off))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for k in range(seg):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))
    if cap:
        for ring, p in ((rings[0], pts[0]), (rings[-1], pts[-1])):
            c = bm.verts.new(p)
            for k in range(seg):
                bm.faces.new((ring[k], ring[(k + 1) % seg], c))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_mesh(name, bm)


def loop_tube(name, pts, radius, ref, seg=6, squash=(1.0, 1.0)):
    """tubo fechado (anel) ao longo de pts, sem repetir o primeiro ponto: o último anel liga no primeiro, então não há
    emenda nem ponta aberta. ref é a normal do plano do contorno; nas quinas a seção cresce no plano (meia-esquadria)
    para a borda não afinar nem se cruzar por dentro"""
    bm = bmesh.new()
    pts = [Vector(p) for p in pts]
    n = len(pts)
    r = Vector(ref).normalized()
    rings = []
    for i, p in enumerate(pts):
        a, b = (p - pts[i - 1]).normalized(), (pts[(i + 1) % n] - p).normalized()
        t = (a + b).normalized()
        u = t.cross(r).normalized()                 # no plano, perpendicular à bissetriz
        v = u.cross(t).normalized()                 # fora do plano
        miter = 1.0 / max(0.5, abs(u.dot(b.cross(r).normalized())))
        rings.append([bm.verts.new(p + u * math.cos(2 * math.pi * k / seg) * radius * squash[0] * miter
                                   + v * math.sin(2 * math.pi * k / seg) * radius * squash[1]) for k in range(seg)])
    for i in range(n):
        ra, rb = rings[i], rings[(i + 1) % n]
        for k in range(seg):
            bm.faces.new((ra[k], ra[(k + 1) % seg], rb[(k + 1) % seg], rb[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_mesh(name, bm)


def ball(name, co, size, rot=(0, 0, 0), seg=(16, 10)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg[0], v_segments=seg[1], radius=1.0)
    m = Matrix.Translation(Vector(co)) @ Euler(rot).to_matrix().to_4x4() @ Matrix.Diagonal((*size, 1))
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
    return new_mesh(name, bm)


def soften(parts):
    """sombreado suave em todas as peças, menos as de `flat_shade` (chapadas de propósito): tubo e bola saem facetados sem isso"""
    for objs in parts.values():
        for o in objs:
            if not o.get("facets"):
                for p in o.data.polygons:
                    p.use_smooth = True


def sball(*a, **k):
    """`ball` com sombreado suave: a bola comum sai facetada de perto (olho, gema, conta)"""
    o = ball(*a, **k)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def cone(name, base, tip, r, seg=6):
    bm = bmesh.new()
    base, tip = Vector(base), Vector(tip)
    d = (tip - base)
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=0.0, depth=d.length)
    q = d.to_track_quat("Z", "Y")
    m = Matrix.Translation((base + tip) / 2) @ q.to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
    return new_mesh(name, bm)


def smooth(obj, iters=0, factor=0.5, decimate=None, target=None):
    """suaviza e reduz a malha; target = número de triângulos desejado"""
    if target:
        decimate = min(1.0, target / max(1, sum(len(p.vertices) - 2 for p in obj.data.polygons)))
    if iters:
        m = obj.modifiers.new("smooth", "SMOOTH")
        m.iterations = iters
        m.factor = factor
    if decimate:
        d = obj.modifiers.new("dec", "DECIMATE")
        d.ratio = decimate
    apply_mods(obj)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def apply_mods(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
    old = obj.data
    obj.modifiers.clear()
    obj.data = me
    bpy.data.meshes.remove(old)


def flat_shade(obj):
    """faces chapadas de propósito (caixa, estrela, pedra talhada): `check_finish` não conta como faceta"""
    for p in obj.data.polygons:
        p.use_smooth = False
    obj["facets"] = True
    return obj


def paint(obj, fn):
    """cor por vértice: fn(co, normal) -> (r, g, b) em 0..1 (sRGB)"""
    me = obj.data
    attr = me.color_attributes.get("Col") or me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    me.color_attributes.active_color = attr
    for v in me.vertices:
        r, g, b = fn(v.co, v.normal)
        attr.data[v.index].color = (r, g, b, 1.0)
    return obj


def B(p):
    """ponto do three (y para cima, frente em +z) para o Blender"""
    return (p[0], -p[2], p[1])


def hexc(h):
    return ((h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255)


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def ss(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def bake_ao(objs, strength=0.75, distance=0.12, samples=24):
    """sombra de oclusão nas cavidades (órbita, boca, sob a arcada), multiplicada na cor por vértice"""
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.samples = samples
    sc.cycles.device = "CPU"
    if not sc.world:
        sc.world = bpy.data.worlds.new("w")
    sc.world.light_settings.distance = distance
    for o in objs:
        me = o.data
        base = me.color_attributes["Col"]
        ao = me.color_attributes.new("AO", "FLOAT_COLOR", "POINT")
        me.color_attributes.active_color = ao
        if not me.materials:
            me.materials.append(bpy.data.materials.new("m_" + o.name))
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    for o in objs:
        me = o.data
        base, ao = me.color_attributes["Col"], me.color_attributes["AO"]
        for i in range(len(me.vertices)):
            a = ao.data[i].color[0]
            k = 1 - strength * (1 - a)
            c = base.data[i].color
            base.data[i].color = (c[0] * k, c[1] * k, c[2] * k, 1)
        me.color_attributes.remove(ao)
        me.color_attributes.active_color = me.color_attributes["Col"]


Q = 8192  # posição em int16: passo de 1/8192 (alcance de ±4 unidades)


REGIONS = {"fixed": 0, "primary": 1, "secondary": 2, "accent": 3}


def region(obj, name):
    """marca a peça com a região de cor que a skin troca (M2-11, para o M13-06): primary, secondary, accent; sem marca = fixed"""
    obj["region"] = REGIONS[name]
    return obj


def export_parts(path, parts, pivots, meta=None):
    """Grava as malhas por osso para o jogo (lidas por src/game/chars/baked.ts). parts: {chave: [objetos]}, chave = 'osso'
    (sólido, com contorno), 'osso@flat' (sem contorno) ou 'osso@lit' (brilho). pivots: {osso: (x, y, z) no Blender}.
    Coordenadas convertidas para o three (x, z, -y), relativas ao pivô do osso; triângulos sem índice. Compactado:
    posição int16 (/Q), normal int8 (/127), cor sRGB uint8. Região de cor por vértice (uint8, ver `region`) só se alguma peça
    tiver marca; meta (dims, forma) vai na chave "meta", para o teste conferir com a receita."""
    import array
    out = {"q": Q}
    if meta:
        out["meta"] = meta
    for key, objs in parts.items():
        bone = key.split("@")[0]
        px, py, pz = pivots[bone]
        pos, nor, col, reg = array.array("h"), array.array("b"), array.array("B"), array.array("B")
        for o in objs:
            dg = bpy.context.evaluated_depsgraph_get()
            ev = o.evaluated_get(dg)
            me = ev.to_mesh()
            me.transform(o.matrix_world)
            me.calc_loop_triangles()
            attr = me.color_attributes.get("Col")
            rg = int(o.get("region", 0))
            for tri in me.loop_triangles:
                for li in tri.loops:
                    vi = me.loops[li].vertex_index
                    co = me.vertices[vi].co
                    n = me.corner_normals[li].vector if tri.use_smooth else tri.normal
                    pos.extend(round(v * Q) for v in (co.x - px, co.z - pz, -(co.y - py)))
                    nor.extend(max(-127, min(127, round(v * 127))) for v in (n.x, n.z, -n.y))
                    c = attr.data[vi].color if attr else (0.5, 0.5, 0.5, 1)
                    col.extend(max(0, min(255, round(v * 255))) for v in c[:3])
                    reg.append(rg)
            ev.to_mesh_clear()
        out[key] = {"n": len(pos) // 3, "position": base64.b64encode(pos.tobytes()).decode(),
                    "normal": base64.b64encode(nor.tobytes()).decode(), "color": base64.b64encode(col.tobytes()).decode()}
        if any(reg):
            out[key]["region"] = base64.b64encode(reg.tobytes()).decode()
    with open(path, "w") as f:
        json.dump(out, f)
    return {k: v["n"] // 3 for k, v in out.items() if k not in ("q", "meta")}


CHECK_VERBOSE = False


def check_finish(parts, budget=None, head_share=None, top=12):
    """Conferência de acabamento (M2-11, 2026-11-26), impressa no fim do script; só avisa, não para nada.
    - SOBREPOSICAO: pares de peças do mesmo osso, uma delas com contorno, cujas malhas se cruzam (broche atravessando a aba).
      Lista as maiores e todas com peça pequena. Encaixe proposital também aparece: ler a lista e conferir só o que não devia
      estar ali. o["embed"] = True tira a peça da lista.
    - DOBRA: arestas côncavas fundas (> 40°) em peça com contorno. Ali a casca do contorno vaza para a frente e vira risco
      preto (nariz e rosto, barba e bochecha). Saídas: alisar a dobra, ou levar a peça menor para '@flat'.
    - FACETA: arestas convexas com mais de 28° entre as faces (fora as peças de `flat_shade`, chapadas de propósito): a peça
      sai poligonal de perto (bola sem sombreado suave, poucos gomos, redução forte demais). Saídas: `sball`, mais gomos,
      `target` maior.
    - ORCAMENTO: total acima de `budget`, ou a cabeça (head + head@flat) abaixo de `head_share` do total."""
    from mathutils.bvhtree import BVHTree
    dg = bpy.context.evaluated_depsgraph_get()
    items, tris = [], {}
    for key, objs in parts.items():
        for o in objs:
            bm = bmesh.new()
            bm.from_object(o, dg)
            bm.transform(o.matrix_world)
            bm.normal_update()
            items.append((key, o, bm))
            tris[key] = tris.get(key, 0) + sum(len(f.verts) - 2 for f in bm.faces)
    trees = [(k, o, BVHTree.FromBMesh(bm), max(o.dimensions)) for k, o, bm in items if "@lit" not in k and not o.get("embed")]
    over = []
    for i in range(len(trees)):
        ki, oi, ti, si = trees[i]
        for kj, oj, tj, sj in trees[i + 1:]:
            # só no mesmo osso (de ossos diferentes, a pose de repouso não é a do jogo) e com ao menos uma peça de contorno
            # (camadas sem contorno, como as do olho, se sobrepõem de propósito)
            if ki.split("@")[0] != kj.split("@")[0] or ("@" in ki and "@" in kj):
                continue
            n = len(ti.overlap(tj))
            if n:
                over.append((n, f"{ki}:{oi.name}", f"{kj}:{oj.name}", si, sj))
    # as maiores (quase sempre encaixe proposital) e, sempre, as que envolvem peça pequena (broche, gema, estrela): é ali que
    # o cruzamento costuma ser acidente e vira pixel preto de perto
    big = sorted(over, reverse=True)[:top]
    small = [x for x in over if x not in big and min(x[3], x[4]) < 0.12]
    for n, a, b, _, _ in big + small:
        print(f"SOBREPOSICAO {a} x {b}: {n} pares de triângulos")
    for key, o, bm in items:
        crease = sum(1 for e in bm.edges if len(e.link_faces) == 2 and not e.is_convex and e.calc_face_angle(0) > math.radians(50))             if "@" not in key else 0
        inner = [e for e in bm.edges if len(e.link_faces) == 2]
        sharp = sum(1 for e in inner if e.is_convex and math.radians(30) < e.calc_face_angle(0) < math.radians(75)) / max(1, len(inner))   # acima de 75° é borda de propósito (tampa de tubo, aba)
        size = max(o.dimensions)
        flat = sum(1 for f in bm.faces if not f.smooth) if not o.get("facets") else 0
        if CHECK_VERBOSE:
            print(f"  {key}:{o.name} dobra={crease} quina={sharp:.0%} tam={size:.2f} chapada={flat}")
        if crease >= 3:
            print(f"DOBRA {key}:{o.name}: {crease} arestas côncavas fundas (risco do contorno)")
        if flat:
            print(f"FACETA {key}:{o.name}: {flat} faces sem sombreado suave (usar sball / smooth)")
        elif size > 0.1 and sharp > 0.25 and not o.get("facets"):
            print(f"FACETA {key}:{o.name}: {sharp:.0%} das arestas com quina (poucos gomos ou redução forte)")
        bm.free()
    total = sum(tris.values())
    if budget and total > budget:
        print(f"ORCAMENTO {total} triângulos, acima de {budget}")
    if head_share:
        hs = (tris.get("head", 0) + tris.get("head@flat", 0)) / max(1, total)
        if hs < head_share:
            print(f"ORCAMENTO cabeça com {hs:.0%} dos triângulos, abaixo de {head_share:.0%}")


def review_setup(target, dist=1.2, yaw=20, pitch=8, res=640):
    """câmera e luz para conferir: Workbench com cor por vértice, contorno e cavidade"""
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sh = sc.display.shading
    sh.light = "STUDIO"
    sh.color_type = "VERTEX"
    sh.show_cavity = True
    sh.cavity_type = "BOTH"
    sh.show_object_outline = True
    sh.show_shadows = True
    sh.background_type = "VIEWPORT"
    sh.background_color = (0.08, 0.16, 0.11)
    sc.view_settings.view_transform = "Standard"
    sc.render.resolution_x = sc.render.resolution_y = res
    cam = bpy.data.objects.get("cam") or link(bpy.data.objects.new("cam", bpy.data.cameras.new("cam")))
    cam.data.lens = 50
    sc.camera = cam
    return cam


def shot(path, target, dist, yaw, pitch):
    cam = bpy.context.scene.camera
    t = Vector(target)
    y, p = math.radians(yaw), math.radians(pitch)
    cam.location = t + Vector((math.sin(y) * math.cos(p), -math.cos(y) * math.cos(p), math.sin(p))) * dist
    cam.rotation_euler = (t - cam.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
