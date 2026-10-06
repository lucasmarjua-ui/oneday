"""Shared modelling helpers for the OneDay Blender scripts.

Import after `bpy`. Build parts with box/cyl/strut/ico/loft, then call
prop(name) to join them into one named object; export() writes a GLB.
"""
import math
import os
import random
import sys

import bpy  # noqa: I001  (bpy must be imported before bmesh and mathutils)
import bmesh
from mathutils import Vector

MODELS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'models')
random.seed(7)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
MATS = {}


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def mat(hexcode):
    if hexcode in MATS:
        return MATS[hexcode]
    rgb = [srgb_to_linear(int(hexcode[i:i + 2], 16) / 255) for i in (1, 3, 5)]
    material = bpy.data.materials.new(f'c{hexcode[1:]}')
    material.diffuse_color = (*rgb, 1)
    bsdf = material.node_tree.nodes.get('Principled BSDF') if material.node_tree else None
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (*rgb, 1)
        bsdf.inputs['Roughness'].default_value = 0.9
    MATS[hexcode] = material
    return material


PARTS = []


def finish(obj, color):
    obj.data.materials.append(mat(color))
    PARTS.append(obj)
    return obj


def box(center, size, color, rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center, rotation=[math.radians(a) for a in rot])
    obj = bpy.context.object
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 1
        bpy.ops.object.modifier_apply(modifier='bevel')
    return finish(obj, color)


def cyl(center, radius, depth, color, rot=(0, 0, 0), verts=8, radius2=None):
    if radius2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=center, rotation=[math.radians(a) for a in rot])
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=radius, radius2=radius2, depth=depth, location=center, rotation=[math.radians(a) for a in rot])
    return finish(bpy.context.object, color)


def strut(a, b, radius, color, verts=6):
    """A cylinder from point a to point b."""
    a, b = Vector(a), Vector(b)
    mid = (a + b) / 2
    direction = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=direction.length, location=mid)
    obj = bpy.context.object
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(direction.normalized())
    return finish(obj, color)


def ico(center, radius, color, subdiv=1, squash=(1, 1, 1), jitter=0.0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=radius, location=center)
    obj = bpy.context.object
    obj.scale = squash
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if jitter:
        for v in obj.data.vertices:
            v.co += Vector((random.uniform(-jitter, jitter), random.uniform(-jitter, jitter), random.uniform(-jitter, jitter)))
    return finish(obj, color)


def loft(sections, color, deck=None, closed_top=True):
    """A hull lofted through cross-sections (y, half_width, bottom, top, bottom_width_ratio)."""
    mesh = bpy.data.meshes.new('loft')
    bm = bmesh.new()
    rings = []
    for y, hw, zb, zt, ratio in sections:
        bw = hw * ratio
        rings.append([bm.verts.new((-hw, y, zt)), bm.verts.new((-bw, y, zb)), bm.verts.new((bw, y, zb)), bm.verts.new((hw, y, zt))])
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(3):
            bm.faces.new((r0[i], r0[i + 1], r1[i + 1], r1[i]))
        if closed_top:
            face = bm.faces.new((r0[3], r0[0], r1[0], r1[3]))
            face.material_index = 1 if deck else 0
    bm.faces.new(rings[0])
    bm.faces.new(list(reversed(rings[-1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new('loft', mesh)
    scene.collection.objects.link(obj)
    obj.data.materials.append(mat(color))
    if deck:
        obj.data.materials.append(mat(deck))
    PARTS.append(obj)
    return obj


def prop(name):
    """Join everything built since the last call into one object named `name`."""
    bpy.ops.object.select_all(action='DESELECT')
    for part in PARTS:
        part.select_set(True)
        for poly in part.data.polygons:
            poly.use_smooth = False
    bpy.context.view_layer.objects.active = PARTS[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    obj.data.name = name
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    PARTS.clear()
    return obj




def lathe(profile, color, segments=16, center=(0, 0, 0)):
    """Spin a (radius, height) profile around the vertical axis."""
    mesh = bpy.data.meshes.new('lathe')
    bm = bmesh.new()
    rings = []
    for r, h in profile:
        ring = []
        for i in range(segments):
            a = i / segments * math.tau
            ring.append(bm.verts.new((center[0] + math.cos(a) * r, center[1] + math.sin(a) * r, center[2] + h)))
        rings.append(ring)
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(segments):
            j = (i + 1) % segments
            bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new('lathe', mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mat(color))
    PARTS.append(obj)
    return obj


def arc_panel(radius, a0, a1, z0, z1, color, lean=0.0, thickness=0.08):
    """A wall panel following a circle between two angles (degrees), leaning inwards by `lean` at the top."""
    a0, a1 = math.radians(a0), math.radians(a1)
    mesh = bpy.data.meshes.new('arc')
    bm = bmesh.new()
    pts = []
    for a in (a0, a1):
        for r, z in ((radius, z0), (radius - lean, z1), (radius - lean - thickness, z1), (radius - thickness, z0)):
            pts.append(bm.verts.new((math.cos(a) * r, math.sin(a) * r, z)))
    v = pts
    for face in ((0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (0, 3, 2, 1), (4, 5, 6, 7)):
        bm.faces.new([v[i] for i in face])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new('arc', mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mat(color))
    PARTS.append(obj)
    return obj


def export(path, count):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True, export_animations=False)
    print('wrote', os.path.normpath(path), 'models:', count, file=sys.stderr)
