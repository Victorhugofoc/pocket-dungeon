# Base comum dos bípedes modelados no Blender (M3-03 em diante): pivôs dos ossos a partir de b.dims da receita, transformação
# no espaço do three, cabeça no osso, capa no osso "cape", oclusão, exportação e capturas de conferência.
# O corpo é modelado em repouso, ereto, com cada parte presa ao pivô do seu osso; curva e agachamento vêm da animação.
import os

import bpy
from mathutils import Euler, Matrix

from kit import B, bake_ao, export_parts, review_setup, shot

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
C3 = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))  # three -> Blender
TORSO_Y = 0.08


class Rig:
    """Pivôs como em build.ts: dims = os mesmos números de b.dims na receita (unidades do modelo, antes de b.scale)."""

    def __init__(self, hipY=0.92, headY=0.6, shoulderY=0.46, shoulderX=0.34, arm=0.34, hipX=0.13, thigh=0.42, bulk=1.0):
        self.hipY, self.headY, self.shoulderY, self.shoulderX = hipY, headY, shoulderY, shoulderX
        self.arm, self.hipX, self.thigh, self.bulk = arm, hipX, thigh, bulk
        T = hipY + TORSO_Y
        self.T = T
        self.p3 = {
            "hips": (0, hipY, 0), "torso": (0, T, 0), "head": (0, T + headY, 0),
            "armL": (-shoulderX, T + shoulderY, 0), "armR": (shoulderX, T + shoulderY, 0),
            "foreL": (-shoulderX, T + shoulderY - arm, 0), "foreR": (shoulderX, T + shoulderY - arm, 0),
            "thighL": (-hipX, hipY - 0.02, 0), "thighR": (hipX, hipY - 0.02, 0),
            "shinL": (-hipX, hipY - 0.02 - thigh, 0), "shinR": (hipX, hipY - 0.02 - thigh, 0),
            "cape": (0, T + 0.52, -0.2 * bulk), "skirt": (0, hipY, 0),
        }
        self.piv = {k: B(v) for k, v in self.p3.items()}

    def P(self, bone):
        """pivô do osso no Blender (x, y, z)"""
        return self.piv[bone]

    def dims_ts(self):
        return (f"{{ hipY: {self.hipY}, headY: {self.headY}, shoulderY: {self.shoulderY}, shoulderX: {self.shoulderX}, "
                f"arm: {self.arm}, hipX: {self.hipX}, thigh: {self.thigh} }}")


def xform3(objs, m3):
    """aplica a objetos do Blender uma matriz escrita no espaço do three"""
    mb = C3 @ m3 @ C3.inverted()
    for o in objs:
        o.data.transform(mb)
        o.data.update()


def place_head(rig, head_parts, lift=0.12, tilt=0.0, scale=1.0, fwd=0.0):
    """cabeça modelada com o centro na origem, colocada sobre o osso head (lift acima do pivô)"""
    hx, hy, _ = rig.p3["head"]
    m3 = Matrix.Translation((hx, hy + lift, fwd)) @ Euler((tilt, 0, 0)).to_matrix().to_4x4() @ Matrix.Diagonal((scale, scale, scale, 1))
    xform3(head_parts["solid"] + head_parts["flat"] + head_parts["lit"], m3)
    return {"head": head_parts["solid"], "head@flat": head_parts["flat"], "head@lit": head_parts["lit"]}


def merge(*dicts):
    parts = {}
    for d in dicts:
        for k, v in d.items():
            parts.setdefault(k, []).extend(v)
    return parts


def finish(name, rig, parts, args, ao=0.75, body_center=(0, 0, 0.85), body_dist=4.5, head_dist=1.4):
    """oclusão nas peças sólidas, exportação por osso, capturas de conferência (com 'review') e o .blend"""
    parts = {k: v for k, v in parts.items() if v}  # sem chave vazia (ex.: nada aceso na cabeça)
    # peça marcada com o["no_ao"] fica fora da oclusão: tubo cujos únicos vértices ficam dentro de outra peça (haste de osso
    # entre dois nós) sairia inteiro escuro
    solids = [o for k, v in parts.items() if "@" not in k for o in v if not o.get("no_ao")]
    bake_ao(solids, strength=ao, distance=0.1)
    pivots = {k.split("@")[0]: rig.P(k.split("@")[0]) for k in parts}
    counts = export_parts(os.path.join(ROOT, "src", "game", "chars", "models", f"{name}.json"), parts, pivots)
    print("TRIS", sum(counts.values()), counts)
    if "review" in args:
        review_setup((0, 0, 0))
        out = os.path.join(ROOT, ".shots")
        hc = B((0, rig.p3["head"][1] + 0.12, 0))
        for nm, yaw, pitch in [("front", 0, 5), ("tq", 35, 10)]:
            shot(os.path.join(out, f"bl-{name}-head-{nm}.png"), hc, head_dist, yaw, pitch)
        for nm, yaw, pitch in [("front", 0, 10), ("tq", 35, 15), ("side", 90, 10), ("back", 180, 15)]:
            shot(os.path.join(out, f"bl-{name}-body-{nm}.png"), body_center, body_dist, yaw, pitch)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "art", f"{name}.blend"))
