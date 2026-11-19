# Base comum dos personagens de manto (forma "robed" no jogo: flutuam, sem pernas; o manto fica no osso "skirt"). M3-04.
# Mangas em sino que caem para baixo do mundo na pose de repouso da receita, pano em anéis com pregas, saia longa e mãos.
# Blender: z para cima, frente em -y. As poses são as mesmas de b.poseL/b.poseR, b.lean e b.armOut na receita (cast-enemies.ts).
import math

import bmesh
from mathutils import Matrix, Vector

from kit import apply_mods, new_mesh


def _rx(a):
    return Matrix.Rotation(a, 3, "X")


def fore_rot(pose, side, lean, arm_out):
    """rotação do braço e do antebraço em repouso no espaço do three, como restArm em kit.ts (sem stance: manto não tem base)"""
    p = list(pose) + [0.0, 0.0]
    a = _rx(lean) @ Matrix.Rotation(side * p[3], 3, "Y") @ _rx(p[0]) @ Matrix.Rotation(side * (arm_out + p[2]), 3, "Z")
    return a @ _rx(p[1]), a


def to_b(v):
    return Vector((v[0], -v[2], v[1]))


def to_3(v):
    return Vector((v[0], v[2], -v[1]))


def local_dir(rot3, world_b):
    """direção do mundo (Blender) vista no espaço de repouso do osso (Blender), dada a rotação do osso no three"""
    return to_b(rot3.transposed() @ to_3(Vector(world_b))).normalized()


def ring_loft(name, rings, seg=20, open_half=None, thick=0.022, jag=None, cap_top=False):
    """pano em anéis. Cada anel: (centro, normal, rx, ry, folds, famp); o anel é perpendicular à normal (eixo x do anel = x do mundo
    projetado). open_half(i) abre a frente (-y) do anel i em ±a; jag(j) sacode a barra (último anel)."""
    bm = bmesh.new()
    grid = []
    for i, (c, nrm, rx, ry, folds, famp) in enumerate(rings):
        c, nrm = Vector(c), Vector(nrm).normalized()
        ux = Vector((1, 0, 0))
        ux = (ux - nrm * ux.dot(nrm)).normalized()
        uy = nrm.cross(ux).normalized()     # com normal para baixo (0,0,-1): uy = (0,-1,0)... frente
        if uy.y > 0:
            uy = -uy
        a0 = open_half(i) if open_half else 0.0
        row = []
        n = seg + 1 if a0 > 0 else seg
        for j in range(n):
            a = a0 + (2 * math.pi - 2 * a0) * j / seg
            f = 1 + famp * math.cos(a * folds) if folds else 1
            p = c + ux * (rx * f * math.sin(a)) + uy * (ry * f * math.cos(a))
            if jag and i == len(rings) - 1:
                p = p + nrm * jag(j)
            row.append(bm.verts.new(p))
        grid.append((row, a0 > 0))
    for i in range(len(grid) - 1):
        r0, o0 = grid[i]
        r1, o1 = grid[i + 1]
        m = min(len(r0), len(r1))
        closed = not (o0 or o1)
        for j in range(m if closed else m - 1):
            k = (j + 1) % m
            bm.faces.new((r0[j], r0[k], r1[k], r1[j]))
    if cap_top:
        r0 = grid[0][0]
        cv = bm.verts.new(sum((v.co for v in r0), Vector()) / len(r0))
        for j in range(len(r0) - (0 if not grid[0][1] else 1)):
            bm.faces.new((r0[(j + 1) % len(r0)], r0[j], cv))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_mesh(name, bm)
    if thick:
        sol = o.modifiers.new("thick", "SOLIDIFY")
        sol.thickness = thick
        sol.offset = 0
        apply_mods(o)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def bezier(p0, p1, p2, t):
    return p0 * (1 - t) ** 2 + p1 * 2 * (1 - t) * t + p2 * t * t


def bell_sleeve(name, elbow, down_local, length, r0, r1, sag=0.6, rows=6, seg=16, thick=0.02, folds=5, famp=0.06, jag=None, axis=(0, 0, -1)):
    """manga em sino do cotovelo (elbow, Blender) ao longo do antebraço (-z em repouso, ou axis), caindo para o lado de baixo do mundo
    (down_local, no espaço do osso): curva de Bézier do cotovelo até a boca; a boca alarga e se inclina para o chão"""
    e = Vector(elbow)
    ax = Vector(axis).normalized()
    d = Vector(down_local)
    perp = d - ax * d.dot(ax)
    p1 = e + ax * length * 0.55
    p2 = e + ax * length * (0.75 + 0.25 * max(0.0, d.dot(ax))) + perp * length * sag
    rings = []
    for i in range(rows + 1):
        t = i / rows
        c = bezier(e, p1, p2, t)
        tan = (bezier(e, p1, p2, min(1, t + 0.02)) - bezier(e, p1, p2, max(0, t - 0.02))).normalized()
        r = r0 + (r1 - r0) * t ** 1.6
        rings.append((c, tan, r, r, folds if i > 1 else 0, famp * t))
    return ring_loft(name, rings, seg=seg, thick=thick, jag=jag)
