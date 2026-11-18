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


def ball(name, co, size, rot=(0, 0, 0), seg=(16, 10)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg[0], v_segments=seg[1], radius=1.0)
    m = Matrix.Translation(Vector(co)) @ Euler(rot).to_matrix().to_4x4() @ Matrix.Diagonal((*size, 1))
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
    return new_mesh(name, bm)


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
    for p in obj.data.polygons:
        p.use_smooth = False
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


def export_parts(path, parts, pivots):
    """Grava as malhas por osso para o jogo (lidas por src/game/chars/baked.ts). parts: {chave: [objetos]}, chave = 'osso'
    (sólido, com contorno), 'osso@flat' (sem contorno) ou 'osso@lit' (brilho). pivots: {osso: (x, y, z) no Blender}.
    Coordenadas convertidas para o three (x, z, -y), relativas ao pivô do osso; triângulos sem índice. Compactado:
    posição int16 (/Q), normal int8 (/127), cor sRGB uint8."""
    import array
    out = {"q": Q}
    for key, objs in parts.items():
        bone = key.split("@")[0]
        px, py, pz = pivots[bone]
        pos, nor, col = array.array("h"), array.array("b"), array.array("B")
        for o in objs:
            dg = bpy.context.evaluated_depsgraph_get()
            ev = o.evaluated_get(dg)
            me = ev.to_mesh()
            me.transform(o.matrix_world)
            me.calc_loop_triangles()
            attr = me.color_attributes.get("Col")
            for tri in me.loop_triangles:
                for li in tri.loops:
                    vi = me.loops[li].vertex_index
                    co = me.vertices[vi].co
                    n = me.corner_normals[li].vector if tri.use_smooth else tri.normal
                    pos.extend(round(v * Q) for v in (co.x - px, co.z - pz, -(co.y - py)))
                    nor.extend(max(-127, min(127, round(v * 127))) for v in (n.x, n.z, -n.y))
                    c = attr.data[vi].color if attr else (0.5, 0.5, 0.5, 1)
                    col.extend(max(0, min(255, round(v * 255))) for v in c[:3])
            ev.to_mesh_clear()
        out[key] = {"n": len(pos) // 3, "position": base64.b64encode(pos.tobytes()).decode(),
                    "normal": base64.b64encode(nor.tobytes()).decode(), "color": base64.b64encode(col.tobytes()).decode()}
    with open(path, "w") as f:
        json.dump(out, f)
    return {k: v["n"] // 3 for k, v in out.items() if k != "q"}


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
