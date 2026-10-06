"""The Great Pyramid in Blender: the scene sets for Giza, exported as
assets/models/giza.glb.

    python tools/blender/giza.py

Everything is built from what archaeology has found. At the workers' town
(Heit el-Ghurab) that means mud-brick houses with palm-log roofs, bakeries
with rows of bell-shaped bread moulds and beer jars, domed granaries, and
the great limestone 'Wall of the Crow'. Elsewhere there is the harbour with
a cargo barge carrying a granite beam from Aswan, a limestone quarry with
blocks half freed by trenches, copper chisels and dolerite pounders, and the
pyramid itself, unfinished: a stepped core with casing stones being laid
and the granite beams of the King's Chamber on top.

Back walls of the interior are on Blender's -X and +Y sides, so the
cut-away faces the stage camera.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from kit import MODELS, PARTS, box, cyl, strut, ico, loft, prop, export  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

MUD, MUD2, MUD3 = '#b8875a', '#a87a4f', '#c99a6a'
PLASTER = '#e8dcc0'
LIME, LIME2, LIME3 = '#e6dcc4', '#d9cdb1', '#efe7d2'
PALM_LOG = '#7a5a38'
GRANITE = '#b48e8c'


def brick_wall(x0, y0, x1, y1, z0, z1, thickness=0.3, color=MUD, courses=True):
    """A mud-brick wall from (x0, y0) to (x1, y1), with darker mortar courses."""
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    length = math.hypot(x1 - x0, y1 - y0)
    angle = math.degrees(math.atan2(y1 - y0, x1 - x0))
    box((cx, cy, (z0 + z1) / 2), (length, thickness, z1 - z0), color, rot=(0, 0, angle))
    if courses:
        nx, ny = -math.sin(math.radians(angle)), math.cos(math.radians(angle))
        z = z0 + 0.22
        while z < z1 - 0.05:
            for side in (-1, 1):
                box((cx + nx * side * (thickness / 2 + 0.005), cy + ny * side * (thickness / 2 + 0.005), z), (length, 0.012, 0.025), MUD2, rot=(0, 0, angle))
            z += 0.22


def transform_since(start, matrix):
    for obj in PARTS[start:]:
        obj.matrix_world = matrix @ obj.matrix_world


# --- A worker's house -------------------------------------------------------------

def house_interior():
    box((0, 0, -0.1), (7.0, 6.0, 0.2), '#b99467')
    for k in range(10):
        box((random.uniform(-3, 3), random.uniform(-2.6, 2.6), 0.003), (random.uniform(0.3, 0.8), random.uniform(0.2, 0.5), 0.006), '#ad8a5e', rot=(0, 0, random.uniform(0, 90)))
    brick_wall(-3.5, -3.0, -3.5, 3.0, 0, 3.0, 0.35)
    brick_wall(-3.5, 3.0, 3.5, 3.0, 0, 3.0, 0.35)
    # Whitewashed lower band, inside.
    box((-3.31, 0, 0.5), (0.02, 6.0, 1.0), PLASTER)
    box((0, 2.81, 0.5), (7.0, 0.02, 1.0), PLASTER)
    # Palm-log roof beams over the back half (cut away in front).
    for k in range(6):
        y = 2.8 - k * 0.55
        strut((-3.5, y, 3.05), (0.5 - k * 0.6, y, 3.05), 0.09, PALM_LOG, verts=6)
    # A mud bench along the back wall with a reed mat, linen and a headrest.
    box((0.6, 2.35, 0.25), (3.6, 0.9, 0.5), MUD3, bevel=0.03)
    box((0.6, 2.32, 0.52), (3.2, 0.75, 0.04), '#c8a45c')
    box((1.4, 2.32, 0.56), (1.3, 0.6, 0.05), '#efe7d2')
    box((-0.4, 2.35, 0.6), (0.3, 0.12, 0.08), '#8a6a45')
    strut((-0.4, 2.35, 0.54), (-0.4, 2.35, 0.62), 0.03, '#8a6a45')
    # The hearth: a ring of stones with ash, and a cooking pot.
    for i in range(8):
        a = i / 8 * math.tau
        ico((-1.6 + math.cos(a) * 0.38, 0.3 + math.sin(a) * 0.38, 0.06), 0.1, '#8c7a6a', subdiv=1, jitter=0.02)
    cyl((-1.6, 0.3, 0.01), 0.3, 0.02, '#4a4440', verts=10)
    cyl((-1.6, 0.3, 0.1), 0.18, 0.2, '#b5643a', verts=8, radius2=0.12)
    # A saddle quern with its grinding stone, conical loaves in a basket.
    box((-2.6, -1.4, 0.12), (0.7, 0.4, 0.24), '#9c8d6c', bevel=0.05)
    box((-2.6, -1.4, 0.28), (0.3, 0.22, 0.1), '#8c7a6a', bevel=0.03)
    cyl((-2.0, -2.2, 0.08), 0.28, 0.16, '#c8a45c', verts=10, radius2=0.32)
    for i in range(4):
        a = i / 4 * math.tau
        cyl((-2.0 + math.cos(a) * 0.12, -2.2 + math.sin(a) * 0.12, 0.2), 0.07, 0.16, '#c98a4a', verts=6, radius2=0.01)
    # Beer jars in a wooden rack, a water jar.
    box((2.9, 1.2, 0.3), (0.5, 1.6, 0.06), '#8a6a45')
    for k in range(3):
        y = 0.7 + k * 0.5
        cyl((2.9, y, 0.33), 0.16, 0.12, '#b5643a', verts=8, radius2=0.2)
        cyl((2.9, y, 0.6), 0.2, 0.42, '#c27a48', verts=8, radius2=0.1)
    # A wall niche with an oil lamp, a small high window, a wooden door.
    box((-3.3, 1.2, 1.7), (0.1, 0.6, 0.5), '#5a4030')
    cyl((-3.22, 1.2, 1.5), 0.08, 0.05, '#c27a48', verts=8)
    box((0.6, 2.82, 2.3), (0.9, 0.06, 0.45), '#3a2a1a')
    box((-3.33, -1.6, 1.0), (0.06, 1.1, 2.0), '#6e5236', bevel=0.02)
    for z in (0.5, 1.5):
        box((-3.3, -1.6, z), (0.04, 1.1, 0.08), '#5a4030')
    return prop('house_interior')


# --- The workers' town ------------------------------------------------------------

def mud_house():
    for (x0, y0, x1, y1) in ((-1.1, -1.0, 1.1, -1.0), (1.1, -1.0, 1.1, 1.0), (1.1, 1.0, -1.1, 1.0), (-1.1, 1.0, -1.1, -1.0)):
        brick_wall(x0, y0, x1, y1, 0, 1.7, 0.2, MUD3, courses=False)
    box((0, 0, 1.75), (2.4, 2.2, 0.1), PALM_LOG)
    for k in range(5):
        strut((-1.2, -0.85 + k * 0.42, 1.82), (1.2, -0.85 + k * 0.42, 1.82), 0.05, '#8a6a45', verts=5)
    for side in ((-1.15, 0), (1.15, 0)):
        box((side[0], 0, 1.95), (0.1, 2.2, 0.25), MUD3)
    box((0, -1.12, 1.95), (2.4, 0.1, 0.25), MUD3)
    box((0.4, -1.11, 0.55), (0.5, 0.05, 1.1), '#3a2a1a')
    box((-0.6, -1.11, 1.25), (0.3, 0.05, 0.2), '#3a2a1a')
    cyl((-0.6, 0.5, 1.9), 0.13, 0.3, '#c27a48', verts=8, radius2=0.08)
    for k in range(4):
        strut((1.25, 0.3 + k * 0.01, 0), (1.25, 0.6, 1.9), 0.03, '#8a6a45')
    return prop('mud_house')


def bakery():
    for (x0, y0, x1, y1) in ((-1.6, 1.2, 1.6, 1.2), (-1.6, -1.2, -1.6, 1.2), (1.6, -1.2, 1.6, 1.2)):
        brick_wall(x0, y0, x1, y1, 0, 0.9, 0.18, MUD3, courses=False)
    # A trench of embers with rows of bell-shaped bread moulds (bedja).
    box((-0.4, 0.4, 0.02), (2.2, 0.7, 0.04), '#3a2a20')
    for i in range(5):
        for j in range(2):
            cyl((-1.2 + i * 0.4, 0.25 + j * 0.3, 0.17), 0.13, 0.3, '#a85a32', verts=8, radius2=0.08)
    # A domed oven, a kneading trough, big storage jars of grain.
    cyl((1.0, 0.6, 0.35), 0.45, 0.7, MUD, verts=10)
    ico((1.0, 0.6, 0.7), 0.45, MUD, subdiv=2, squash=(1, 1, 0.7))
    box((1.0, 0.16, 0.35), (0.3, 0.06, 0.3), '#2a1a10')
    box((-0.6, -0.65, 0.25), (1.4, 0.45, 0.25), '#8a6a45', bevel=0.03)
    box((-0.6, -0.65, 0.34), (1.2, 0.35, 0.06), '#e8d7b0')
    for x in (0.9, 1.3):
        cyl((x, -0.7, 0.4), 0.22, 0.8, '#c27a48', verts=8, radius2=0.12)
    return prop('bakery')


def granary():
    for k, x in enumerate((-0.9, 0, 0.9)):
        cyl((x, 0, 0.6), 0.42, 1.2, MUD3, verts=10)
        ico((x, 0, 1.2), 0.42, MUD3, subdiv=2, squash=(1, 1, 0.9))
        box((x, -0.42, 0.25), (0.22, 0.04, 0.22), '#3a2a1a')
        box((x, -0.1, 1.55), (0.18, 0.18, 0.06), '#3a2a1a')
    strut((1.4, -0.3, 0), (1.1, -0.2, 1.5), 0.03, '#8a6a45')
    strut((1.55, -0.2, 0), (1.25, -0.1, 1.5), 0.03, '#8a6a45')
    return prop('granary')


def wall_crow():
    box((0, 0, 1.5), (8.0, 1.2, 3.0), LIME2)
    for k in range(5):
        box((0, -0.61, 0.3 + k * 0.6), (8.0, 0.02, 0.04), '#c4b796')
    for k in range(8):
        box((-3.5 + k * 1.0 + (k % 2) * 0.5, -0.61, 1.5), (0.03, 0.02, 3.0), '#c4b796')
    box((0, -0.3, 0.9), (1.4, 1.0, 1.8), '#3a2a1a')
    box((0, -0.62, 1.95), (1.8, 0.1, 0.25), LIME3)
    return prop('wall_crow')


# --- The harbour ----------------------------------------------------------------------

def cargo_barge():
    loft([(-3.0, 0.3, 0.5, 0.75, 0.5), (-2.4, 1.0, 0.05, 0.6, 0.6), (2.4, 1.0, 0.05, 0.6, 0.6), (3.0, 0.3, 0.5, 0.8, 0.5)], '#7a4a26', deck='#9a6a3e')
    for y in (-1.6, 1.6):
        box((0, y, 0.68), (1.3, 0.15, 0.15), '#5a3a20')
    box((0, 0, 1.0), (0.9, 4.0, 0.75), GRANITE, bevel=0.04)
    for y in (-1.2, 0, 1.2):
        box((0, y, 1.0), (0.95, 0.06, 0.8), '#c9a46a')
    for side in (-1, 1):
        strut((side * 0.9, -2.2, 0.62), (side * 1.6, -2.6, 0.2), 0.03, '#8a6a45')
    strut((0, 2.7, 0.7), (0.3, 3.4, -0.1), 0.05, '#5a3a20')
    obj = prop('cargo_barge')
    obj.rotation_euler = (0, 0, math.radians(90))
    bpy.ops.object.transform_apply(rotation=True)
    return obj


def papyrus():
    for i in range(9):
        a = i / 9 * math.tau + random.uniform(0, 0.4)
        r = random.uniform(0.05, 0.35)
        h = random.uniform(1.0, 1.7)
        top = (math.cos(a) * (r + 0.15), math.sin(a) * (r + 0.15), h)
        strut((math.cos(a) * r, math.sin(a) * r, 0), top, 0.02, '#5f8a3a', verts=4)
        cyl(top, 0.16, 0.12, '#7aa84a', verts=6, radius2=0.02)
    return prop('papyrus')


# --- The quarry ---------------------------------------------------------------------

def quarry_face():
    # Three terraces stepping back into the hill.
    for k in range(3):
        box((0, 1.0 + k * 1.1, 0.55 + k * 0.55), (7.0 - k * 1.2, 1.2, 1.1 + k * 1.1), LIME if k % 2 else LIME2)
    # Blocks being freed: trenches cut round three sides, chisel marks.
    for i, x in enumerate((-2.2, -0.9, 0.4, 1.7)):
        h = 0.9
        box((x, -0.1, h / 2), (1.05, 0.95, h), LIME3 if i % 2 else LIME)
        box((x + 0.58, -0.1, h / 2), (0.1, 0.95, h), '#9c8d6c')
        for k in range(5):
            box((x - 0.3 + k * 0.15, -0.58, h * 0.6), (0.03, 0.01, 0.15), '#b0a27d', rot=(0, 20, 0))
    box((2.9, -0.2, 0.02), (1.2, 1.2, 0.04), '#c2b592')
    return prop('quarry_face')


def quarry_tools():
    strut((0, 0, 0.05), (0.5, 0.1, 0.05), 0.03, '#8a6a45')
    box((0.6, 0.1, 0.08), (0.18, 0.16, 0.16), '#7a5a38', bevel=0.03)
    for k in range(3):
        box((-0.3 + k * 0.12, 0.4, 0.02), (0.03, 0.22, 0.03), '#b87333')
    for k in range(3):
        ico((0.2 + k * 0.25, -0.35, 0.1), 0.1, '#3a3a38', subdiv=1, jitter=0.01)
    cyl((-0.5, -0.3, 0.15), 0.22, 0.3, '#c8a45c', verts=10, radius2=0.26)
    return prop('quarry_tools')


# --- The pyramid ----------------------------------------------------------------------

def pyramid_unfinished():
    top = 5.5
    course = top / 5
    for i in range(5):
        s = 9 - i * 1.5
        z0 = i * course
        box((0, 0, z0 + course / 2), (s, s, course), LIME2 if i % 2 else LIME)
        # Block joints on the two faces the camera sees.
        n = int(s / 0.75)
        for j in range(1, n):
            off = -s / 2 + j * s / n
            box((off, -s / 2 - 0.005, z0 + course / 2), (0.03, 0.01, course), '#c4b796')
            box((-s / 2 - 0.005, off, z0 + course / 2), (0.01, 0.03, course), '#c4b796')
        box((0, -s / 2 - 0.005, z0 + course * 0.5), (s, 0.01, 0.03), '#c4b796')
    # Smooth white casing stones being laid along the bottom course.
    for j in range(5):
        x = -3.6 + j * 1.05
        loft([(-0.5, 0.2, 0, 1.1, 1.0), (0.5, 0.2, 0, 1.1, 1.0)], LIME3)
        PARTS[-1].matrix_world = Matrix.Translation((x, -4.6, 0)) @ Matrix.Rotation(math.radians(90), 4, 'Z')
    # The King's Chamber roof: granite beams on the flat top, and a timber lever.
    for y in (0.85, 0.45, 0.05):
        box((0, y, top + 0.15), (2.4, 0.35, 0.3), GRANITE, bevel=0.02)
    strut((-1.2, -0.8, top), (-0.4, -0.3, top + 0.9), 0.05, '#8a6a45')
    return prop('pyramid_unfinished')


BUILDERS = [house_interior, mud_house, bakery, granary, wall_crow, cargo_barge, papyrus, quarry_face, quarry_tools, pyramid_unfinished]
for build in BUILDERS:
    build()
bpy.context.view_layer.update()
export(os.path.join(MODELS, 'giza.glb'), len(BUILDERS))
