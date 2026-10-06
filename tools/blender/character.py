"""Build the OneDay character in Blender and export it as assets/models/character.glb.

Run headless with the bpy module (pip install bpy):

    python tools/blender/character.py

The character is a low-poly figure about 1.5 units tall, with rigid body parts
parented to the bones of an armature: no skinning, so every pose stays crisp
when the stage renders it at pixel resolution. Every material is named
`pal_<key>` and recoloured at runtime from the event palette (skin, hair,
clothes...), so one model dresses as an astronaut, a builder, an interpreter or
a soldier. Accessories (`acc_*`) and hand props (`prop_*`) are hidden by the
stage unless an outfit or an action needs them.

Bones all point straight up, so their local axes match the world: rotating a
bone about X swings it forward or back, about Z sideways. Conventions used in
the animation tables below:
  - hanging limbs (arms, legs): X < 0 swings them forward;
  - upright parts (hips, spine, head): X > 0 leans them forward;
  - Z > 0 rotates towards the character's left (+X).
The character faces -Y in Blender, +Z in three.js.
"""
import math
import os
import sys

import bpy

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'models', 'character.glb')
FPS = 24

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = FPS

# --- Materials --------------------------------------------------------------------

DEFAULTS = {
    's': '#f2c79b', 'h': '#4a2f1d', 'c': '#efe8d8', 'C': '#c8bda4', 'p': '#3d6fb0', 'f': '#7a4a26', 't': '#3d6fb0',
    'e': '#1b1620', 'helmet': '#f4f4f1', 'visor': '#d9a63a', 'metal': '#9aa0a8', 'feather': '#2fae7a', 'cape': '#2f6f9e',
    'clay': '#b5643a', 'paper': '#f3e3bf', 'white': '#f4f4f1', 'red': '#e03a3a', 'wood': '#8a6a45', 'rope': '#c9a46a',
}
MATS = {}


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def material(key):
    if key in MATS:
        return MATS[key]
    hexcode = DEFAULTS[key]
    rgb = [srgb_to_linear(int(hexcode[i:i + 2], 16) / 255) for i in (1, 3, 5)]
    mat = bpy.data.materials.new(f'pal_{key}')
    mat.diffuse_color = (*rgb, 1)
    bsdf = mat.node_tree.nodes.get('Principled BSDF') if mat.node_tree else None
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (*rgb, 1)
        bsdf.inputs['Roughness'].default_value = 0.9
    MATS[key] = mat
    return mat


# --- Armature ---------------------------------------------------------------------

BONES = [
    ('hips', (0, 0, 0.60), None),
    ('spine', (0, 0, 0.70), 'hips'),
    ('head', (0, 0, 1.11), 'spine'),
    ('arm_L', (0.25, 0, 1.04), 'spine'),
    ('forearm_L', (0.25, 0, 0.81), 'arm_L'),
    ('hand_L', (0.25, 0, 0.60), 'forearm_L'),
    ('arm_R', (-0.25, 0, 1.04), 'spine'),
    ('forearm_R', (-0.25, 0, 0.81), 'arm_R'),
    ('hand_R', (-0.25, 0, 0.60), 'forearm_R'),
    ('thigh_L', (0.10, 0, 0.58), 'hips'),
    ('shin_L', (0.10, 0, 0.33), 'thigh_L'),
    ('foot_L', (0.10, 0, 0.08), 'shin_L'),
    ('thigh_R', (-0.10, 0, 0.58), 'hips'),
    ('shin_R', (-0.10, 0, 0.33), 'thigh_R'),
    ('foot_R', (-0.10, 0, 0.08), 'shin_R'),
]

arm_data = bpy.data.armatures.new('rig')
rig = bpy.data.objects.new('character', arm_data)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
for name, head, parent in BONES:
    bone = arm_data.edit_bones.new(name)
    bone.head = head
    bone.tail = (head[0], head[1], head[2] + 0.08)
    bone.roll = 0
    if parent:
        bone.parent = arm_data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
for pb in rig.pose.bones:
    pb.rotation_mode = 'XYZ'


# --- Meshes -------------------------------------------------------------------------

def attach(obj, bone):
    world = obj.matrix_world.copy()
    obj.parent = rig
    obj.parent_type = 'BONE'
    obj.parent_bone = bone
    obj.matrix_world = world


def box(name, bone, center, size, mat, bevel=0.0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center, rotation=[math.radians(a) for a in rot])
    obj = bpy.context.object
    obj.name = name
    obj.data.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 1
        mod.limit_method = 'NONE'
        bpy.ops.object.modifier_apply(modifier='bevel')
    obj.data.materials.append(material(mat))
    for poly in obj.data.polygons:
        poly.use_smooth = False
    attach(obj, bone)
    return obj


def cylinder(name, bone, center, radius, depth, mat, rot=(0, 0, 0), verts=8):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=center, rotation=[math.radians(a) for a in rot])
    obj = bpy.context.object
    obj.name = name
    obj.data.name = name
    obj.data.materials.append(material(mat))
    attach(obj, bone)
    return obj


# Body. Front is -Y.
box('pelvis', 'hips', (0, 0, 0.64), (0.34, 0.20, 0.14), 'p', 0.02)
box('chest', 'spine', (0, 0, 0.90), (0.38, 0.22, 0.40), 'c', 0.03)
box('belt', 'spine', (0, 0, 0.73), (0.39, 0.23, 0.05), 't')
box('neck', 'head', (0, 0, 1.12), (0.12, 0.12, 0.06), 's')
box('face', 'head', (0, 0, 1.32), (0.40, 0.36, 0.38), 's', 0.05)
box('hair_top', 'head', (0, 0.02, 1.48), (0.42, 0.40, 0.09), 'h', 0.02)
box('hair_back', 'head', (0, 0.13, 1.33), (0.42, 0.14, 0.30), 'h', 0.02)
box('hair_fringe', 'head', (0, -0.17, 1.455), (0.42, 0.05, 0.07), 'h')
for x in (0.08, -0.08):
    box(f'eye_{"L" if x > 0 else "R"}', 'head', (x, -0.183, 1.31), (0.05, 0.02, 0.08), 'e')
for side, x in (('L', 0.25), ('R', -0.25)):
    box(f'upper_arm_{side}', f'arm_{side}', (x, 0, 0.93), (0.11, 0.11, 0.24), 'c', 0.015)
    box(f'lower_arm_{side}', f'forearm_{side}', (x, 0, 0.71), (0.10, 0.10, 0.21), 'C', 0.015)
    box(f'hand_{side}_mesh', f'hand_{side}', (x, 0, 0.56), (0.10, 0.10, 0.09), 's', 0.015)
    lx = 0.10 if side == 'L' else -0.10
    box(f'thigh_{side}_mesh', f'thigh_{side}', (lx, 0, 0.46), (0.15, 0.16, 0.26), 'p', 0.015)
    box(f'shin_{side}_mesh', f'shin_{side}', (lx, 0, 0.21), (0.13, 0.14, 0.25), 'p', 0.015)
    box(f'foot_{side}_mesh', f'foot_{side}', (lx, -0.04, 0.04), (0.14, 0.24, 0.08), 'f', 0.015)

# Accessories, shown per outfit.
box('acc_spacehelmet', 'head', (0, 0, 1.33), (0.52, 0.48, 0.50), 'helmet', 0.1)
box('acc_visor', 'head', (0, -0.245, 1.32), (0.36, 0.03, 0.24), 'visor', 0.01)
box('acc_backpack', 'spine', (0, 0.18, 0.92), (0.34, 0.14, 0.38), 'helmet', 0.02)
box('acc_combathelmet', 'head', (0, 0, 1.50), (0.46, 0.44, 0.16), 'helmet', 0.05)
box('acc_combathelmet_brim', 'head', (0, 0, 1.44), (0.52, 0.50, 0.03), 'helmet')
box('acc_kilt', 'hips', (0, 0, 0.55), (0.38, 0.24, 0.22), 't', 0.02)
box('acc_skirt', 'hips', (0, 0, 0.36), (0.40, 0.27, 0.62), 'p', 0.02)
box('acc_armband', 'arm_L', (0.25, 0, 0.97), (0.125, 0.125, 0.06), 'white')
box('acc_armband_cross', 'arm_L', (0.315, 0, 0.97), (0.01, 0.04, 0.04), 'red')
box('acc_cape', 'spine', (0, 0.135, 0.84), (0.46, 0.04, 0.56), 'cape', 0.01)
box('acc_morion', 'head', (0, 0, 1.51), (0.44, 0.40, 0.12), 'metal', 0.04)
box('acc_morion_crest', 'head', (0, 0, 1.59), (0.04, 0.38, 0.09), 'metal')
box('acc_morion_brim', 'head', (0, 0, 1.46), (0.56, 0.52, 0.03), 'metal')
for i, angle in enumerate((-50, -25, 0, 25, 50)):
    rad = math.radians(angle)
    box(f'acc_feathers_{i}', 'head', (math.sin(rad) * 0.16, 0.2, 1.52 + math.cos(rad) * 0.16), (0.06, 0.02, 0.34), 'feather', rot=(0, angle, 0))

# Hand props, shown by actions.
box('prop_cup', 'hand_R', (-0.25, -0.07, 0.55), (0.07, 0.07, 0.09), 'clay')
cylinder('prop_scroll', 'hand_R', (-0.25, -0.07, 0.56), 0.035, 0.22, 'paper', rot=(0, 90, 0))
box('prop_hammer', 'hand_R', (-0.25, -0.16, 0.56), (0.03, 0.28, 0.03), 'wood')
box('prop_hammer_head', 'hand_R', (-0.25, -0.30, 0.56), (0.06, 0.07, 0.13), 'metal')
cylinder('prop_bandage', 'hand_R', (-0.25, -0.07, 0.55), 0.045, 0.08, 'white', rot=(0, 90, 0))
box('prop_rope', 'hand_R', (-0.12, -0.55, 0.56), (0.03, 1.0, 0.03), 'rope')
box('prop_tablet', 'hand_L', (0.25, -0.10, 0.58), (0.20, 0.03, 0.26), 'paper', rot=(-30, 0, 0))


# --- Animations ----------------------------------------------------------------------
# Each clip: {bone: [(frame, (x, y, z)), ...]}, rotations in degrees, plus
# 'loc' for the hips offset as (side, up, forward).

def mirror(keys):
    return [(f, (x, -y, -z)) for f, (x, y, z) in keys]


def walk_cycle(n=16, stride=28, arm=24, lean=4, bob=0.03):
    q = n // 4
    return {
        'thigh_L': [(1, (-stride, 0, 0)), (1 + q, (0, 0, 0)), (1 + 2 * q, (stride, 0, 0)), (1 + 3 * q, (0, 0, 0)), (1 + n, (-stride, 0, 0))],
        'thigh_R': [(1, (stride, 0, 0)), (1 + q, (0, 0, 0)), (1 + 2 * q, (-stride, 0, 0)), (1 + 3 * q, (0, 0, 0)), (1 + n, (stride, 0, 0))],
        'shin_L': [(1, (6, 0, 0)), (1 + q, (stride * 1.2, 0, 0)), (1 + 2 * q, (stride * 0.9, 0, 0)), (1 + 3 * q, (8, 0, 0)), (1 + n, (6, 0, 0))],
        'shin_R': [(1, (stride * 0.9, 0, 0)), (1 + q, (8, 0, 0)), (1 + 2 * q, (6, 0, 0)), (1 + 3 * q, (stride * 1.2, 0, 0)), (1 + n, (stride * 0.9, 0, 0))],
        'arm_L': [(1, (arm, 0, 4)), (1 + 2 * q, (-arm, 0, 4)), (1 + n, (arm, 0, 4))],
        'arm_R': [(1, (-arm, 0, -4)), (1 + 2 * q, (arm, 0, -4)), (1 + n, (-arm, 0, -4))],
        'forearm_L': [(1, (-15, 0, 0)), (1 + n, (-15, 0, 0))],
        'forearm_R': [(1, (-15, 0, 0)), (1 + n, (-15, 0, 0))],
        'spine': [(1, (lean, 0, 0)), (1 + n, (lean, 0, 0))],
        'loc': [(1, (0, 0, 0)), (1 + q, (0, bob, 0)), (1 + 2 * q, (0, 0, 0)), (1 + 3 * q, (0, bob, 0)), (1 + n, (0, 0, 0))],
    }


CLIPS = {}
CLIPS['idle'] = {
    'spine': [(1, (0, 0, 0)), (25, (2, 0, 0)), (49, (0, 0, 0))],
    'head': [(1, (0, 0, 0)), (25, (3, 0, 0)), (49, (0, 0, 0))],
    'arm_L': [(1, (0, 0, 5)), (25, (2, 0, 6)), (49, (0, 0, 5))],
    'arm_R': [(1, (0, 0, -5)), (25, (2, 0, -6)), (49, (0, 0, -5))],
    'forearm_L': [(1, (-8, 0, 0)), (49, (-8, 0, 0))],
    'forearm_R': [(1, (-8, 0, 0)), (49, (-8, 0, 0))],
    'loc': [(1, (0, 0, 0)), (25, (0, -0.008, 0)), (49, (0, 0, 0))],
}
CLIPS['walk'] = walk_cycle()
CLIPS['run'] = walk_cycle(n=12, stride=48, arm=50, lean=16, bob=0.06)
CLIPS['run']['forearm_L'] = [(1, (-75, 0, 0)), (13, (-75, 0, 0))]
CLIPS['run']['forearm_R'] = [(1, (-75, 0, 0)), (13, (-75, 0, 0))]
CLIPS['carry'] = walk_cycle(n=20, stride=20, arm=0, lean=-4, bob=0.02)
CLIPS['carry']['arm_L'] = [(1, (-55, 0, -8)), (21, (-55, 0, -8))]
CLIPS['carry']['arm_R'] = [(1, (-55, 0, 8)), (21, (-55, 0, 8))]
CLIPS['carry']['forearm_L'] = [(1, (-50, 0, 0)), (21, (-50, 0, 0))]
CLIPS['carry']['forearm_R'] = [(1, (-50, 0, 0)), (21, (-50, 0, 0))]
CLIPS['push'] = walk_cycle(n=24, stride=18, arm=0, lean=28, bob=0.015)
CLIPS['push']['arm_L'] = [(1, (-80, 0, -6)), (25, (-80, 0, -6))]
CLIPS['push']['arm_R'] = [(1, (-80, 0, 6)), (25, (-80, 0, 6))]
CLIPS['push']['forearm_L'] = [(1, (-20, 0, 0)), (25, (-20, 0, 0))]
CLIPS['push']['forearm_R'] = [(1, (-20, 0, 0)), (25, (-20, 0, 0))]

CLIPS['sit'] = {
    'loc': [(1, (0, -0.42, 0)), (49, (0, -0.42, 0))],
    'thigh_L': [(1, (-100, 0, 8)), (49, (-100, 0, 8))],
    'thigh_R': [(1, (-100, 0, -8)), (49, (-100, 0, -8))],
    'shin_L': [(1, (120, 0, 0)), (49, (120, 0, 0))],
    'shin_R': [(1, (120, 0, 0)), (49, (120, 0, 0))],
    'spine': [(1, (12, 0, 0)), (25, (14, 0, 0)), (49, (12, 0, 0))],
    'arm_L': [(1, (-45, 0, 4)), (49, (-45, 0, 4))],
    'arm_R': [(1, (-45, 0, -4)), (49, (-45, 0, -4))],
    'forearm_L': [(1, (-40, 0, 0)), (49, (-40, 0, 0))],
    'forearm_R': [(1, (-40, 0, 0)), (49, (-40, 0, 0))],
}
CLIPS['sleep'] = {
    'hips': [(1, (-90, 0, 0)), (65, (-90, 0, 0))],
    'loc': [(1, (0, -0.47, 0.0)), (65, (0, -0.47, 0.0))],
    'spine': [(1, (0, 0, 0)), (33, (-3, 0, 0)), (65, (0, 0, 0))],
    'head': [(1, (-10, 0, 0)), (65, (-10, 0, 0))],
    'arm_L': [(1, (0, 0, 8)), (65, (0, 0, 8))],
    'arm_R': [(1, (0, 0, -8)), (65, (0, 0, -8))],
    'thigh_L': [(1, (0, 0, 4)), (65, (0, 0, 4))],
    'thigh_R': [(1, (-30, 0, -4)), (65, (-30, 0, -4))],
    'shin_R': [(1, (40, 0, 0)), (65, (40, 0, 0))],
}
CLIPS['crouch'] = {
    'loc': [(1, (0, -0.2, 0)), (13, (0.03, -0.22, 0)), (25, (0, -0.2, 0))],
    'thigh_L': [(1, (-65, 0, 6)), (25, (-65, 0, 6))],
    'thigh_R': [(1, (-40, 0, -6)), (25, (-40, 0, -6))],
    'shin_L': [(1, (85, 0, 0)), (25, (85, 0, 0))],
    'shin_R': [(1, (75, 0, 0)), (25, (75, 0, 0))],
    'spine': [(1, (35, 0, 0)), (25, (35, 0, 0))],
    'head': [(1, (-25, 0, 0)), (13, (-25, 15, 0)), (25, (-25, 0, 0))],
    'arm_L': [(1, (-30, 0, 6)), (25, (-30, 0, 6))],
    'arm_R': [(1, (-30, 0, -6)), (25, (-30, 0, -6))],
    'forearm_L': [(1, (-45, 0, 0)), (25, (-45, 0, 0))],
    'forearm_R': [(1, (-45, 0, 0)), (25, (-45, 0, 0))],
}
CLIPS['give'] = {
    'arm_L': [(1, (0, 0, 5)), (9, (-75, 0, -6)), (27, (-75, 0, -6)), (37, (0, 0, 5))],
    'arm_R': [(1, (0, 0, -5)), (9, (-75, 0, 6)), (27, (-75, 0, 6)), (37, (0, 0, -5))],
    'forearm_L': [(1, (-8, 0, 0)), (9, (-15, 0, 0)), (37, (-8, 0, 0))],
    'forearm_R': [(1, (-8, 0, 0)), (9, (-15, 0, 0)), (37, (-8, 0, 0))],
    'spine': [(1, (0, 0, 0)), (9, (15, 0, 0)), (27, (15, 0, 0)), (37, (0, 0, 0))],
    'head': [(1, (0, 0, 0)), (9, (10, 0, 0)), (37, (0, 0, 0))],
}
CLIPS['pickup'] = {
    'spine': [(1, (0, 0, 0)), (13, (65, 0, 0)), (21, (65, 0, 0)), (37, (5, 0, 0))],
    'loc': [(1, (0, 0, 0)), (13, (0, -0.14, 0)), (21, (0, -0.14, 0)), (37, (0, 0, 0))],
    'thigh_L': [(1, (0, 0, 0)), (13, (-40, 0, 0)), (21, (-40, 0, 0)), (37, (0, 0, 0))],
    'thigh_R': [(1, (0, 0, 0)), (13, (-40, 0, 0)), (21, (-40, 0, 0)), (37, (0, 0, 0))],
    'shin_L': [(1, (0, 0, 0)), (13, (55, 0, 0)), (21, (55, 0, 0)), (37, (0, 0, 0))],
    'shin_R': [(1, (0, 0, 0)), (13, (55, 0, 0)), (21, (55, 0, 0)), (37, (0, 0, 0))],
    'arm_R': [(1, (0, 0, -5)), (13, (-60, 0, -5)), (21, (-55, 0, -5)), (37, (-45, 0, -5))],
    'forearm_R': [(1, (-8, 0, 0)), (13, (-5, 0, 0)), (21, (-20, 0, 0)), (37, (-70, 0, 0))],
    'arm_L': [(1, (0, 0, 5)), (13, (-40, 0, 5)), (37, (0, 0, 5))],
}
CLIPS['work'] = {
    'arm_R': [(1, (-160, 0, -10)), (7, (-150, 0, -10)), (10, (-45, 0, -5)), (13, (-50, 0, -5)), (17, (-160, 0, -10))],
    'forearm_R': [(1, (-30, 0, 0)), (10, (-40, 0, 0)), (17, (-30, 0, 0))],
    'arm_L': [(1, (-45, 0, -10)), (17, (-45, 0, -10))],
    'forearm_L': [(1, (-60, 0, 0)), (17, (-60, 0, 0))],
    'spine': [(1, (5, 0, 0)), (10, (22, 0, 0)), (17, (5, 0, 0))],
    'head': [(1, (10, 0, 0)), (17, (10, 0, 0))],
    'thigh_L': [(1, (-15, 0, 0)), (17, (-15, 0, 0))],
    'thigh_R': [(1, (15, 0, 0)), (17, (15, 0, 0))],
}
CLIPS['pull'] = {
    'spine': [(1, (-18, 0, 0)), (13, (-25, 0, 0)), (25, (-18, 0, 0))],
    'loc': [(1, (0, 0, 0)), (13, (0, -0.03, 0.04)), (25, (0, 0, 0))],
    'arm_L': [(1, (-75, 0, -12)), (13, (-45, 0, -12)), (25, (-75, 0, -12))],
    'arm_R': [(1, (-75, 0, 12)), (13, (-45, 0, 12)), (25, (-75, 0, 12))],
    'forearm_L': [(1, (-10, 0, 0)), (13, (-45, 0, 0)), (25, (-10, 0, 0))],
    'forearm_R': [(1, (-10, 0, 0)), (13, (-45, 0, 0)), (25, (-10, 0, 0))],
    'thigh_L': [(1, (-35, 0, 0)), (25, (-35, 0, 0))],
    'shin_L': [(1, (15, 0, 0)), (25, (15, 0, 0))],
    'thigh_R': [(1, (25, 0, 0)), (25, (25, 0, 0))],
    'shin_R': [(1, (10, 0, 0)), (25, (10, 0, 0))],
}
CLIPS['inspect'] = {
    'spine': [(1, (5, 0, 0)), (9, (30, 0, 0)), (37, (30, 0, 0))],
    'head': [(1, (0, 0, 0)), (9, (20, -15, 0)), (21, (20, 15, 0)), (37, (20, -15, 0))],
    'arm_R': [(1, (0, 0, -5)), (9, (-70, 0, 5)), (37, (-70, 0, 5))],
    'forearm_R': [(1, (-8, 0, 0)), (9, (-45, 0, 0)), (37, (-45, 0, 0))],
    'arm_L': [(1, (0, 0, 5)), (9, (-20, 0, -25)), (37, (-20, 0, -25))],
    'forearm_L': [(1, (-8, 0, 0)), (9, (-110, 0, 0)), (37, (-110, 0, 0))],
    'thigh_L': [(1, (0, 0, 0)), (9, (-20, 0, 0)), (37, (-20, 0, 0))],
    'shin_L': [(1, (0, 0, 0)), (9, (25, 0, 0)), (37, (25, 0, 0))],
}
CLIPS['point'] = {
    'arm_R': [(1, (0, 0, -5)), (8, (-105, 0, 5)), (31, (-105, 0, 5))],
    'forearm_R': [(1, (-8, 0, 0)), (8, (0, 0, 0)), (31, (0, 0, 0))],
    'head': [(1, (0, 0, 0)), (8, (-10, -10, 0)), (31, (-10, -10, 0))],
    'spine': [(1, (0, 0, 0)), (8, (-5, -10, 0)), (31, (-5, -10, 0))],
    'arm_L': [(1, (0, 0, 5)), (8, (10, 0, 15)), (31, (10, 0, 15))],
    'thigh_L': [(1, (0, 0, 0)), (8, (-20, 0, 0)), (31, (-20, 0, 0))],
}
CLIPS['talk'] = {
    'arm_R': [(1, (-30, 0, -6)), (9, (-50, 0, -14)), (17, (-30, 0, -6)), (25, (-40, 0, -10)), (33, (-30, 0, -6))],
    'forearm_R': [(1, (-60, 0, 0)), (9, (-95, 0, 0)), (17, (-60, 0, 0)), (25, (-80, 0, 0)), (33, (-60, 0, 0))],
    'arm_L': [(1, (-15, 0, 6)), (13, (-35, 0, 12)), (25, (-15, 0, 6)), (33, (-15, 0, 6))],
    'forearm_L': [(1, (-50, 0, 0)), (13, (-75, 0, 0)), (25, (-50, 0, 0)), (33, (-50, 0, 0))],
    'head': [(1, (0, 0, 0)), (9, (6, 8, 0)), (17, (-2, 0, 0)), (25, (6, -8, 0)), (33, (0, 0, 0))],
}
CLIPS['cheer'] = {
    'arm_L': [(1, (0, 0, 5)), (6, (-10, 0, 160)), (28, (-10, 0, 160)), (31, (0, 0, 5))],
    'arm_R': [(1, (0, 0, -5)), (6, (-10, 0, -160)), (28, (-10, 0, -160)), (31, (0, 0, -5))],
    'loc': [(1, (0, 0, 0)), (5, (0, -0.06, 0)), (9, (0, 0.28, 0)), (14, (0, 0, 0)), (16, (0, -0.06, 0)), (20, (0, 0.24, 0)), (25, (0, 0, 0)), (31, (0, 0, 0))],
    'thigh_L': [(1, (0, 0, 0)), (5, (-35, 0, 0)), (9, (-10, 0, 0)), (16, (-35, 0, 0)), (20, (-10, 0, 0)), (31, (0, 0, 0))],
    'thigh_R': [(1, (0, 0, 0)), (5, (-35, 0, 0)), (9, (-10, 0, 0)), (16, (-35, 0, 0)), (20, (-10, 0, 0)), (31, (0, 0, 0))],
    'shin_L': [(1, (0, 0, 0)), (5, (60, 0, 0)), (9, (30, 0, 0)), (16, (60, 0, 0)), (20, (30, 0, 0)), (31, (0, 0, 0))],
    'shin_R': [(1, (0, 0, 0)), (5, (60, 0, 0)), (9, (30, 0, 0)), (16, (60, 0, 0)), (20, (30, 0, 0)), (31, (0, 0, 0))],
    'head': [(1, (0, 0, 0)), (6, (-15, 0, 0)), (31, (0, 0, 0))],
}
CLIPS['stumble'] = {
    'spine': [(1, (0, 0, 0)), (7, (-25, 0, 8)), (16, (15, 0, 0)), (37, (15, 0, 0))],
    'arm_L': [(1, (0, 0, 5)), (7, (-30, 0, 80)), (16, (-40, 0, 20)), (37, (-40, 0, 20))],
    'arm_R': [(1, (0, 0, -5)), (7, (-60, 0, -70)), (16, (-40, 0, -20)), (37, (-40, 0, -20))],
    'loc': [(1, (0, 0, 0)), (7, (0, 0, 0.06)), (16, (0, -0.4, 0.1)), (37, (0, -0.4, 0.1))],
    'thigh_L': [(1, (0, 0, 0)), (7, (-30, 0, 0)), (16, (-85, 0, 10)), (37, (-85, 0, 10))],
    'thigh_R': [(1, (0, 0, 0)), (7, (10, 0, 0)), (16, (-70, 0, -10)), (37, (-70, 0, -10))],
    'shin_L': [(1, (0, 0, 0)), (16, (60, 0, 0)), (37, (60, 0, 0))],
    'shin_R': [(1, (0, 0, 0)), (16, (80, 0, 0)), (37, (80, 0, 0))],
    'head': [(1, (0, 0, 0)), (7, (-20, 0, 0)), (16, (10, 0, 0)), (37, (10, 0, 0))],
}
CLIPS['wave'] = {
    'arm_R': [(1, (-10, 0, -150)), (17, (-10, 0, -150))],
    'forearm_R': [(1, (0, 0, -25)), (5, (0, 0, 25)), (9, (0, 0, -25)), (13, (0, 0, 25)), (17, (0, 0, -25))],
    'head': [(1, (-5, 0, 6)), (17, (-5, 0, 6))],
    'arm_L': [(1, (0, 0, 5)), (17, (0, 0, 5))],
}
CLIPS['drink'] = {
    'arm_R': [(1, (0, 0, -5)), (11, (-55, 0, 15)), (31, (-55, 0, 15)), (41, (0, 0, -5))],
    'forearm_R': [(1, (-8, 0, 0)), (11, (-125, 0, 0)), (31, (-125, 0, 0)), (41, (-8, 0, 0))],
    'head': [(1, (0, 0, 0)), (14, (-25, 0, 0)), (28, (-25, 0, 0)), (41, (0, 0, 0))],
    'spine': [(1, (0, 0, 0)), (14, (-8, 0, 0)), (28, (-8, 0, 0)), (41, (0, 0, 0))],
}
CLIPS['write'] = {
    'arm_L': [(1, (-55, 0, -10)), (25, (-55, 0, -10))],
    'forearm_L': [(1, (-50, 0, 0)), (25, (-50, 0, 0))],
    'arm_R': [(1, (-45, 0, 10)), (7, (-48, 0, 14)), (13, (-45, 0, 8)), (19, (-48, 0, 14)), (25, (-45, 0, 10))],
    'forearm_R': [(1, (-70, 0, 0)), (7, (-75, 0, 0)), (13, (-70, 0, 0)), (19, (-75, 0, 0)), (25, (-70, 0, 0))],
    'head': [(1, (25, 0, 0)), (25, (25, 0, 0))],
    'spine': [(1, (8, 0, 0)), (25, (8, 0, 0))],
}
CLIPS['treat'] = {
    'loc': [(1, (0, -0.28, 0)), (25, (0, -0.28, 0))],
    'thigh_L': [(1, (-90, 0, 6)), (25, (-90, 0, 6))],
    'shin_L': [(1, (90, 0, 0)), (25, (90, 0, 0))],
    'thigh_R': [(1, (10, 0, -4)), (25, (10, 0, -4))],
    'shin_R': [(1, (100, 0, 0)), (25, (100, 0, 0))],
    'spine': [(1, (35, 0, 0)), (13, (40, 0, 0)), (25, (35, 0, 0))],
    'head': [(1, (20, 0, 0)), (25, (20, 0, 0))],
    'arm_L': [(1, (-55, 0, -10)), (13, (-70, 0, -20)), (25, (-55, 0, -10))],
    'arm_R': [(1, (-70, 0, 20)), (13, (-55, 0, 10)), (25, (-70, 0, 20))],
    'forearm_L': [(1, (-40, 0, 0)), (13, (-30, 0, 0)), (25, (-40, 0, 0))],
    'forearm_R': [(1, (-30, 0, 0)), (13, (-45, 0, 0)), (25, (-30, 0, 0))],
}
CLIPS['climb'] = {
    'arm_L': [(1, (-170, 0, -5)), (13, (-100, 0, -5)), (25, (-170, 0, -5))],
    'arm_R': [(1, (-100, 0, 5)), (13, (-170, 0, 5)), (25, (-100, 0, 5))],
    'forearm_L': [(1, (-10, 0, 0)), (13, (-60, 0, 0)), (25, (-10, 0, 0))],
    'forearm_R': [(1, (-60, 0, 0)), (13, (-10, 0, 0)), (25, (-60, 0, 0))],
    'thigh_L': [(1, (-10, 0, 0)), (13, (-75, 0, 0)), (25, (-10, 0, 0))],
    'thigh_R': [(1, (-75, 0, 0)), (13, (-10, 0, 0)), (25, (-75, 0, 0))],
    'shin_L': [(1, (15, 0, 0)), (13, (80, 0, 0)), (25, (15, 0, 0))],
    'shin_R': [(1, (80, 0, 0)), (13, (15, 0, 0)), (25, (80, 0, 0))],
    'spine': [(1, (12, 0, 0)), (25, (12, 0, 0))],
    'head': [(1, (-20, 0, 0)), (25, (-20, 0, 0))],
    'loc': [(1, (0, 0, 0)), (7, (0, 0.04, 0)), (13, (0, 0, 0)), (19, (0, 0.04, 0)), (25, (0, 0, 0))],
}
CLIPS['swim'] = {
    'hips': [(1, (80, 0, 0)), (25, (80, 0, 0))],
    'loc': [(1, (0, -0.42, 0)), (13, (0, -0.45, 0)), (25, (0, -0.42, 0))],
    'head': [(1, (-50, 0, 0)), (25, (-50, 0, 0))],
    'arm_L': [(1, (-180, 0, 0)), (7, (-90, 0, 10)), (13, (0, 0, 10)), (19, (-90, 0, 40)), (25, (-180, 0, 0))],
    'arm_R': [(1, (0, 0, -10)), (7, (-90, 0, -40)), (13, (-180, 0, 0)), (19, (-90, 0, -10)), (25, (0, 0, -10))],
    'thigh_L': [(1, (-15, 0, 0)), (7, (15, 0, 0)), (13, (-15, 0, 0)), (19, (15, 0, 0)), (25, (-15, 0, 0))],
    'thigh_R': [(1, (15, 0, 0)), (7, (-15, 0, 0)), (13, (15, 0, 0)), (19, (-15, 0, 0)), (25, (15, 0, 0))],
}
CLIPS['pray'] = {
    'loc': [(1, (0, -0.30, 0)), (49, (0, -0.30, 0))],
    'thigh_L': [(1, (5, 0, 4)), (49, (5, 0, 4))],
    'thigh_R': [(1, (5, 0, -4)), (49, (5, 0, -4))],
    'shin_L': [(1, (100, 0, 0)), (49, (100, 0, 0))],
    'shin_R': [(1, (100, 0, 0)), (49, (100, 0, 0))],
    'spine': [(1, (8, 0, 0)), (25, (12, 0, 0)), (49, (8, 0, 0))],
    'head': [(1, (25, 0, 0)), (49, (25, 0, 0))],
    'arm_L': [(1, (-35, 0, -14)), (49, (-35, 0, -14))],
    'arm_R': [(1, (-35, 0, 14)), (49, (-35, 0, 14))],
    'forearm_L': [(1, (-75, 0, -20)), (49, (-75, 0, -20))],
    'forearm_R': [(1, (-75, 0, 20)), (49, (-75, 0, 20))],
}
CLIPS['bow'] = {
    'spine': [(1, (0, 0, 0)), (11, (50, 0, 0)), (25, (50, 0, 0)), (37, (0, 0, 0))],
    'head': [(1, (0, 0, 0)), (11, (15, 0, 0)), (25, (15, 0, 0)), (37, (0, 0, 0))],
    'arm_L': [(1, (0, 0, 5)), (11, (-30, 0, -10)), (25, (-30, 0, -10)), (37, (0, 0, 5))],
    'arm_R': [(1, (0, 0, -5)), (11, (-30, 0, 10)), (25, (-30, 0, 10)), (37, (0, 0, -5))],
    'forearm_L': [(1, (-8, 0, 0)), (11, (-60, 0, 0)), (37, (-8, 0, 0))],
    'forearm_R': [(1, (-8, 0, 0)), (11, (-60, 0, 0)), (37, (-8, 0, 0))],
}
CLIPS['think'] = {
    'arm_R': [(1, (-35, 0, 12)), (49, (-35, 0, 12))],
    'forearm_R': [(1, (-130, 0, 0)), (49, (-130, 0, 0))],
    'arm_L': [(1, (-30, 0, -15)), (49, (-30, 0, -15))],
    'forearm_L': [(1, (-80, 0, -30)), (49, (-80, 0, -30))],
    'head': [(1, (5, 10, 6)), (25, (8, 16, 8)), (49, (5, 10, 6))],
    'loc': [(1, (0, 0, 0)), (25, (0.01, 0, 0)), (49, (0, 0, 0))],
}
CLIPS['salute'] = {
    'arm_R': [(1, (0, 0, -5)), (8, (-40, 0, -75)), (31, (-40, 0, -75))],
    'forearm_R': [(1, (-8, 0, 0)), (8, (-135, 0, 0)), (31, (-135, 0, 0))],
    'spine': [(1, (0, 0, 0)), (8, (-4, 0, 0)), (31, (-4, 0, 0))],
}
CLIPS['look'] = {
    'arm_R': [(1, (-40, 0, -70)), (49, (-40, 0, -70))],
    'forearm_R': [(1, (-130, 0, 0)), (49, (-130, 0, 0))],
    'head': [(1, (-8, -30, 0)), (25, (-8, 30, 0)), (49, (-8, -30, 0))],
    'spine': [(1, (-3, -8, 0)), (25, (-3, 8, 0)), (49, (-3, -8, 0))],
}
CLIPS['dig'] = {
    'spine': [(1, (50, 0, 0)), (11, (20, 0, 0)), (21, (50, 0, 0))],
    'loc': [(1, (0, -0.1, 0)), (21, (0, -0.1, 0))],
    'arm_L': [(1, (-25, 0, -8)), (11, (-120, 0, -8)), (21, (-25, 0, -8))],
    'arm_R': [(1, (-25, 0, 8)), (11, (-120, 0, 8)), (21, (-25, 0, 8))],
    'forearm_L': [(1, (-10, 0, 0)), (11, (-40, 0, 0)), (21, (-10, 0, 0))],
    'forearm_R': [(1, (-10, 0, 0)), (11, (-40, 0, 0)), (21, (-10, 0, 0))],
    'thigh_L': [(1, (-25, 0, 6)), (21, (-25, 0, 6))],
    'thigh_R': [(1, (-25, 0, -6)), (21, (-25, 0, -6))],
    'shin_L': [(1, (35, 0, 0)), (21, (35, 0, 0))],
    'shin_R': [(1, (35, 0, 0)), (21, (35, 0, 0))],
}
CLIPS['nod'] = {
    'head': [(1, (0, 0, 0)), (6, (16, 0, 0)), (11, (-2, 0, 0)), (17, (0, 0, 0))],
}

BONE_NAMES = [b[0] for b in BONES]


def build_clip(name, keys):
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = action
    end = max(f for track in keys.values() for f, _ in track)
    # Every bone gets keys at both ends, so switching clips never leaves a
    # limb where the previous clip put it.
    for bone in BONE_NAMES:
        pb = rig.pose.bones[bone]
        track = keys.get(bone) or [(1, (0, 0, 0)), (end, (0, 0, 0))]
        for frame, (x, y, z) in track:
            pb.rotation_euler = (math.radians(x), math.radians(y), math.radians(z))
            pb.keyframe_insert('rotation_euler', frame=frame)
    hips = rig.pose.bones['hips']
    for frame, (sx, up, fwd) in keys.get('loc') or [(1, (0, 0, 0)), (end, (0, 0, 0))]:
        hips.location = (sx, up, fwd)
        hips.keyframe_insert('location', frame=frame)
    for pb in rig.pose.bones:
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)


for clip_name, clip_keys in CLIPS.items():
    build_clip(clip_name, clip_keys)
rig.animation_data.action = bpy.data.actions['idle']

os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format='GLB',
    export_animations=True,
    export_animation_mode='ACTIONS',
    export_force_sampling=True,
    export_frame_step=1,
    export_apply=True,
    export_yup=True,
)
print('wrote', os.path.normpath(OUT), 'clips:', len(CLIPS), file=sys.stderr)
