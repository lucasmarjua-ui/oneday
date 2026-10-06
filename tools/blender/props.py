"""Model the stage props in Blender and export them as assets/models/props.glb.

Run headless with the bpy module (pip install bpy):

    python tools/blender/props.py

Every prop is one object named after it, built around the origin with its base
at height 0 and its front facing -Y (three.js +Z). The stage clones a prop by
name, places it, and derives its collision footprint from its bounds.
Low-poly and flat-shaded on purpose: the stage renders at pixel resolution and
inks every edge, so clean silhouettes matter more than polygon count.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from kit import MODELS, PARTS, box, cyl, strut, ico, loft, prop, export  # noqa: E402
from mathutils import Vector  # noqa: E402

# --- Apollo 11 ---------------------------------------------------------------------

def lunar_module():
    gold, gold2, foil = '#d4a73a', '#b8862a', '#2a2a2e'
    grey, grey2, dark = '#cfd2d6', '#9a9ea6', '#18191e'
    # Descent stage: an octagon wrapped in gold foil, with a black band.
    cyl((0, 0, 1.25), 1.15, 1.0, gold, verts=8, rot=(0, 0, 22.5))
    cyl((0, 0, 1.78), 1.17, 0.08, foil, verts=8, rot=(0, 0, 22.5))
    for i in range(4):
        a = math.radians(45 + i * 90)
        box((math.cos(a) * 1.0, math.sin(a) * 1.0, 1.2), (0.5, 0.5, 0.8), gold2, rot=(0, 0, 45 + i * 90))
    # Four legs with struts and round footpads.
    for i in range(4):
        a = math.radians(45 + i * 90)
        c, s = math.cos(a), math.sin(a)
        top = (c * 1.05, s * 1.05, 1.5)
        foot = (c * 2.0, s * 2.0, 0.12)
        strut(top, foot, 0.06, '#c0c0c0')
        strut((c * 1.1, s * 1.1, 0.8), (c * 1.75, s * 1.75, 0.5), 0.04, '#a8a8a8')
        cyl((c * 2.05, s * 2.05, 0.05), 0.32, 0.1, '#d8d8d8', verts=10)
    # The ladder down the front leg (-Y side faces the viewer once placed).
    a = math.radians(225)
    c, s = math.cos(a), math.sin(a)
    for k in range(7):
        t = 0.15 + k * 0.12
        p = Vector((c * (1.15 + 0.85 * t), s * (1.15 + 0.85 * t), 1.45 - 1.3 * t))
        box(tuple(p), (0.5, 0.05, 0.04), '#b0b0b0', rot=(0, 0, 45 + 180))
    box((c * 1.25, s * 1.25, 1.5), (0.7, 0.45, 0.06), '#b0b0b0', rot=(0, 0, 45))
    # Ascent stage: a faceted cabin, triangular windows, hatch, antennas, thrusters.
    box((0, 0.1, 2.35), (1.8, 1.4, 1.0), grey, bevel=0.12)
    box((0, -0.55, 2.4), (1.2, 0.5, 0.9), grey2, bevel=0.1)
    for x in (-0.32, 0.32):
        box((x, -0.82, 2.55), (0.3, 0.04, 0.3), dark, rot=(0, 45 if x > 0 else -45, 0))
    box((0, -0.85, 2.05), (0.5, 0.05, 0.5), grey2)
    cyl((0, 0.1, 2.95), 0.32, 0.25, grey2, verts=10)
    box((0, 0.75, 2.4), (1.0, 0.25, 0.6), gold, bevel=0.05)
    for x, y in ((-0.95, -0.55), (0.95, -0.55), (-0.95, 0.75), (0.95, 0.75)):
        box((x, y, 2.6), (0.18, 0.18, 0.18), grey2)
        box((x * 1.15, y, 2.6), (0.12, 0.08, 0.08), dark)
    strut((-0.6, 0.3, 2.85), (-0.7, 0.4, 3.5), 0.03, '#bbbbbb')
    cyl((-0.7, 0.4, 3.55), 0.28, 0.12, '#e8e8e8', verts=10, radius2=0.08)
    strut((0.6, 0.5, 2.85), (0.75, 0.6, 3.25), 0.03, '#bbbbbb')
    cyl((0.75, 0.6, 3.3), 0.18, 0.06, '#e8e8e8', verts=8)
    return prop('lunar_module')


def us_flag():
    strut((0, 0, 0), (0, 0, 2.2), 0.03, '#dddddd')
    strut((0, 0, 2.1), (1.15, 0, 2.1), 0.02, '#dddddd')
    for i in range(7):
        box((0.6, 0, 1.4 + i * 0.1), (1.1, 0.02, 0.1), '#b8302c' if i % 2 == 0 else '#f4f4f4')
    box((0.27, -0.012, 1.9), (0.45, 0.02, 0.38), '#2b3f8c')
    return prop('us_flag')


# --- Giza ------------------------------------------------------------------------------

def palm():
    pos = Vector((0, 0, 0))
    lean = Vector((0.06, 0.02, 0.5))
    for i in range(7):
        nxt = pos + lean
        strut(tuple(pos), tuple(nxt), 0.16 - i * 0.008, '#8a6a45' if i % 2 else '#9b7a52', verts=7)
        cyl(tuple(nxt), 0.17 - i * 0.008, 0.06, '#6e5236', verts=7)
        pos = nxt
        lean = lean + Vector((0.012, 0.004, -0.01))
    top = pos
    for i in range(9):
        a = i / 9 * math.tau
        d = Vector((math.cos(a), math.sin(a), 0))
        p1 = top + d * 0.6 + Vector((0, 0, 0.12))
        p2 = top + d * 1.25 + Vector((0, 0, -0.18))
        p3 = top + d * 1.6 + Vector((0, 0, -0.55))
        for p, q, w in ((top, p1, 0.42), (p1, p2, 0.36), (p2, p3, 0.2)):
            mid = (p + q) / 2
            seg = q - p
            box(tuple(mid), (w, seg.length, 0.05), '#4f8a3a' if i % 2 else '#62a04a',
                rot=(math.degrees(math.atan2(seg.z, math.hypot(seg.x, seg.y))), 0, math.degrees(a) - 90))
    for i in range(4):
        a = i / 4 * math.tau
        ico(tuple(top + Vector((math.cos(a) * 0.15, math.sin(a) * 0.15, -0.12))), 0.1, '#7a5a2a', subdiv=1)
    return prop('palm')


def nile_boat():
    loft([(-2.1, 0.12, 0.55, 0.85, 0.4), (-1.6, 0.55, 0.15, 0.6, 0.5), (-0.6, 0.75, 0.0, 0.5, 0.55),
          (0.6, 0.75, 0.0, 0.5, 0.55), (1.6, 0.55, 0.15, 0.6, 0.5), (2.1, 0.12, 0.55, 0.95, 0.4)], '#8a5a2b', deck='#a87a48')
    strut((0, 0, 0.5), (0, 0, 3.0), 0.05, '#5a3a20')
    strut((0, -0.05, 2.8), (0, -0.05, 2.8), 0.01, '#5a3a20')
    box((0, 0.02, 1.9), (0.04, 1.4, 1.7), '#f1e8d2')
    strut((0, -0.75, 2.75), (0, 0.75, 2.75), 0.03, '#5a3a20')
    strut((0, -0.7, 1.05), (0, 0.7, 1.05), 0.03, '#5a3a20')
    strut((0.3, 1.9, 1.2), (0.5, 2.6, -0.1), 0.04, '#5a3a20')
    box((0.5, 2.55, 0.0), (0.06, 0.35, 0.18), '#5a3a20')
    obj = prop('nile_boat')
    obj.rotation_euler = (0, 0, math.radians(90))
    bpy.ops.object.transform_apply(rotation=True)
    return obj


def sledge():
    for x in (-0.45, 0.45):
        loft([(-1.6, 0.06, 0.12, 0.3, 1.0), (-1.4, 0.06, 0.0, 0.22, 1.0), (1.5, 0.06, 0.0, 0.22, 1.0), (1.7, 0.06, 0.12, 0.28, 1.0)], '#8a6a45')
        PARTS[-1].location.x = x
        bpy.context.view_layer.objects.active = PARTS[-1]
        PARTS[-1].select_set(True)
    for y in (-1.2, -0.4, 0.4, 1.2):
        box((0, y, 0.26), (1.15, 0.12, 0.08), '#7a5a38')
    box((0, 0, 0.62), (0.8, 2.9, 0.65), '#b48e8c', bevel=0.03)
    for y in (-0.9, 0.9):
        box((0, y, 0.62), (0.84, 0.06, 0.68), '#c9a46a')
    return prop('sledge')


def water_jar():
    cyl((0, 0, 0.06), 0.14, 0.12, '#b5643a', verts=8, radius2=0.22)
    cyl((0, 0, 0.32), 0.24, 0.4, '#c27a48', verts=8, radius2=0.24)
    cyl((0, 0, 0.6), 0.24, 0.16, '#b5643a', verts=8, radius2=0.1)
    cyl((0, 0, 0.72), 0.1, 0.1, '#c27a48', verts=8)
    cyl((0, 0, 0.78), 0.13, 0.03, '#a85a32', verts=8)
    return prop('water_jar')


# --- Tenochtitlan -------------------------------------------------------------------

def canoe():
    loft([(-0.95, 0.06, 0.18, 0.32, 0.5), (-0.7, 0.24, 0.0, 0.3, 0.6), (0.7, 0.24, 0.0, 0.3, 0.6), (0.95, 0.06, 0.18, 0.32, 0.5)], '#7a4a26', deck='#4a2e18')
    strut((0.15, -0.35, 0.2), (0.4, -0.75, 0.7), 0.025, '#a87a48')
    box((0.11, -0.28, 0.08), (0.08, 0.22, 0.03), '#a87a48', rot=(0, 0, -30))
    obj = prop('canoe')
    obj.rotation_euler = (0, 0, math.radians(90))
    bpy.ops.object.transform_apply(rotation=True)
    return obj


def templo_mayor():
    stone, stone2, plaster = '#e8dfca', '#d6ccb2', '#f2ecdc'
    for i in range(4):
        s = 5.2 - i * 1.05
        box((0, 0.2 * i, i * 0.85 + 0.425), (s, s, 0.85), stone if i % 2 else stone2, bevel=0.03)
        box((0, 0.2 * i, i * 0.85 + 0.83), (s + 0.08, s + 0.08, 0.06), plaster)
    # Twin staircases up the front, with red balustrades.
    for x in (-0.6, 0.6):
        for k in range(16):
            box((x, -2.55 + k * 0.17, 0.1 + k * 0.22), (0.95, 0.2, 0.08), '#cfc4a8')
        strut((x * 1.95, -2.7, 0.2), (x * 1.95, -0.05, 3.55), 0.07, '#a8423a', verts=4)
    strut((0, -2.7, 0.2), (0, -0.05, 3.55), 0.09, '#a8423a', verts=4)
    # Shrines: Tlaloc in blue and white, Huitzilopochtli in red and white.
    for x, color, roof in ((-0.62, '#3f7fd8', '#f2ecdc'), (0.62, '#c0392b', '#f2ecdc')):
        box((x, 0.75, 4.0), (1.05, 1.1, 0.9), color, bevel=0.02)
        box((x, 0.18, 3.9), (0.4, 0.04, 0.6), '#1b1620')
        box((x, 0.75, 4.55), (1.2, 1.25, 0.2), roof)
        for k in range(3):
            box((x, 0.75, 4.75 + k * 0.12), (1.0 - k * 0.25, 1.0 - k * 0.25, 0.12), color)
    return prop('templo_mayor')


def litter():
    box((0, 0, 0.55), (0.9, 1.3, 0.12), '#d9a441', bevel=0.02)
    for x in (-0.55, 0.55):
        strut((x, -1.5, 0.6), (x, 1.5, 0.6), 0.04, '#8a5a3a')
    for x, y in ((-0.38, -0.55), (0.38, -0.55), (-0.38, 0.55), (0.38, 0.55)):
        strut((x, y, 0.6), (x, y, 1.75), 0.03, '#d9a441')
    box((0, 0, 1.8), (1.05, 1.45, 0.1), '#2f9e7a')
    box((0, 0, 1.92), (0.75, 1.1, 0.12), '#3fcf9a')
    for i in range(10):
        x = -0.48 + i * 0.107
        box((x, -0.74, 1.62), (0.06, 0.02, 0.3), '#3fcf9a' if i % 2 else '#2f9e7a')
        box((x, 0.74, 1.62), (0.06, 0.02, 0.3), '#3fcf9a' if i % 2 else '#2f9e7a')
    box((0, 0.2, 0.8), (0.6, 0.5, 0.4), '#c0392b', bevel=0.03)
    return prop('litter')


def round_tree():
    strut((0, 0, 0), (0.08, 0, 1.2), 0.14, '#6e5236', verts=7)
    strut((0.05, 0, 0.8), (0.45, 0.1, 1.4), 0.07, '#6e5236', verts=6)
    for (x, y, z, r, c) in ((0, 0, 1.75, 0.75, '#3f6e3a'), (0.45, 0.15, 1.45, 0.5, '#4f8a3a'), (-0.35, -0.1, 1.5, 0.5, '#4f8a3a'), (0.1, -0.2, 2.2, 0.45, '#5f9a44')):
        ico((x, y, z), r, c, subdiv=1, squash=(1, 1, 0.85), jitter=0.06)
    return prop('round_tree')


# --- D-Day ---------------------------------------------------------------------------

def lcvp():
    hull, wood, dark = '#6b7078', '#7a6a4e', '#3b3f45'
    loft([(-2.4, 1.1, 0.05, 0.9, 0.75), (-1.8, 1.25, 0.0, 0.95, 0.8), (2.2, 1.25, 0.0, 0.95, 0.8), (2.5, 1.15, 0.05, 0.95, 0.75)], hull, deck=None, closed_top=False)
    box((0, 0.0, 0.08), (2.3, 4.3, 0.08), dark)
    for x in (-1.22, 1.22):
        box((x, 0.1, 0.62), (0.08, 4.2, 0.62), wood)
    # The steel bow ramp, slightly lowered.
    box((0, -2.5, 0.55), (2.2, 0.12, 1.0), '#7a7f87', rot=(-12, 0, 0))
    for k in range(4):
        box((0, -2.58, 0.25 + k * 0.22), (2.0, 0.05, 0.03), '#5a5f68', rot=(-12, 0, 0))
    # The coxswain's station and two machine-gun tubs at the stern.
    box((0, 2.05, 0.85), (0.9, 0.6, 0.55), hull, bevel=0.04)
    for x in (-0.8, 0.8):
        cyl((x, 2.1, 1.05), 0.2, 0.25, dark, verts=8)
        strut((x, 2.1, 1.15), (x, 1.6, 1.25), 0.025, '#2a2a2a')
    obj = prop('lcvp')
    return obj


def hedgehog():
    for rx, ry, rz in ((0, 0, 0), (0, 90, 60), (90, 0, -60)):
        box((0, 0, 0.5), (0.12, 0.12, 1.5), '#3a3a3a', rot=(rx + 35, ry, rz))
        box((0, 0, 0.5), (0.04, 0.24, 1.5), '#2e2e2e', rot=(rx + 35, ry, rz))
    obj = prop('hedgehog')
    return obj


def sherman():
    olive, olive2, track = '#4f5638', '#5e6644', '#2a2a24'
    box((0, 0, 0.75), (1.7, 3.2, 0.7), olive, bevel=0.05)
    box((0, -1.55, 0.6), (1.7, 0.6, 0.6), olive2, rot=(-35, 0, 0))
    for x in (-1.0, 1.0):
        box((x, 0, 0.4), (0.42, 3.5, 0.6), track, bevel=0.08)
        for k in range(5):
            cyl((x * 1.2, -1.2 + k * 0.6, 0.32), 0.24, 0.1, '#3a3a32', rot=(0, 90, 0), verts=8)
    box((0, 0.15, 1.35), (1.2, 1.4, 0.55), olive2, bevel=0.15)
    cyl((0.15, -0.3, 1.7), 0.18, 0.1, olive, verts=8)
    strut((0, -0.55, 1.35), (0, -2.3, 1.42), 0.07, olive, verts=6)
    box((0.35, 1.2, 1.15), (0.2, 0.3, 0.12), '#d8d8c8')
    return prop('sherman')


def destroyer():
    grey, grey2, dark = '#6b7078', '#7a7f87', '#3b3f45'
    loft([(-3.6, 0.05, 0.4, 0.9, 0.2), (-2.6, 0.55, 0.0, 0.85, 0.4), (2.4, 0.6, 0.0, 0.75, 0.5), (3.2, 0.45, 0.1, 0.75, 0.5)], grey, deck='#5a5f68')
    box((0, -0.7, 1.15), (0.8, 1.2, 0.8), grey2, bevel=0.03)
    box((0, -0.9, 1.7), (0.6, 0.6, 0.35), grey2)
    strut((0, -0.9, 1.85), (0, -0.9, 2.7), 0.04, dark)
    for y in (0.2, 0.9):
        cyl((0, y, 1.2), 0.2, 0.9, grey2, verts=8)
        cyl((0, y, 1.67), 0.21, 0.06, dark, verts=8)
    for y, d in ((-2.2, -1), (2.2, 1)):
        cyl((0, y, 0.95), 0.32, 0.25, grey2, verts=8)
        strut((0, y, 1.0), (0, y + d * 0.8, 1.05), 0.04, dark)
    return prop('destroyer')


def bunker():
    box((0, 0, 0.6), (2.4, 2.0, 1.2), '#9a9a94', bevel=0.12)
    box((0, 0.1, 1.25), (2.6, 2.2, 0.18), '#8a8a84', bevel=0.05)
    box((0, -1.0, 0.75), (1.4, 0.06, 0.18), '#1a1a1a')
    box((0, -1.25, 0.55), (1.8, 0.5, 0.25), '#8a8a84', rot=(-20, 0, 0))
    return prop('bunker')


def rock():
    ico((0, 0, 0.3), 0.55, '#8c867a', subdiv=1, squash=(1, 0.8, 0.6), jitter=0.12)
    ico((0.45, 0.1, 0.18), 0.32, '#7d776c', subdiv=1, squash=(1, 0.9, 0.6), jitter=0.08)
    return prop('rock')


BUILDERS = [lunar_module, us_flag, palm, nile_boat, sledge, water_jar, canoe, templo_mayor, litter, round_tree,
            lcvp, hedgehog, sherman, destroyer, bunker, rock]
for build in BUILDERS:
    build()

export(os.path.join(MODELS, 'props.glb'), len(BUILDERS))
