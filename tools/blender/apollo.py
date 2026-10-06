"""Apollo 11 in Blender: the scene sets for the first event, exported as
assets/models/apollo-11.glb.

    python tools/blender/apollo.py

- cm_interior: a cut-away of Columbia's cabin. Three couches face the main
  display console, with the guidance computer's DSKY, the two attitude
  balls (FDAI), the caution-and-warning lights and rows of switches. Around
  it are rendezvous windows, the side hatch and the equipment-bay lockers.
- lm_interior: Eagle's cramped cockpit, where the crew flew standing up. It
  has two triangular windows, the DSKY on its pedestal, the flight display
  panels, the wall of circuit breakers (one of them was famously pushed in
  with a felt-tip pen), the ascent engine cover, the forward hatch and the
  stowed backpacks.
- On the surface: craters, boulders, and the Early Apollo Scientific
  Experiments Package exactly as Apollo 11 left it (the passive seismometer
  with its solar wings, the laser ranging retroreflector), plus the solar
  wind sheet, the TV camera on its tripod, and the Earth.

The back walls of the interiors are on Blender's -X and +Y sides, so the cut-away
faces the stage camera.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from kit import MODELS, PARTS, box, cyl, strut, ico, lathe, arc_panel, prop, export  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402


def transform_since(start, angle_deg=0.0, offset=(0, 0, 0)):
    """Rotate (about Z, around the origin) and move every part built since PARTS[start]."""
    m = Matrix.Translation(Vector(offset)) @ Matrix.Rotation(math.radians(angle_deg), 4, 'Z')
    for obj in PARTS[start:]:
        obj.matrix_world = m @ obj.matrix_world


def polar(r, a, z=0.0):
    a = math.radians(a)
    return (math.cos(a) * r, math.sin(a) * r, z)


# --- Columbia ------------------------------------------------------------------------

def couch(angle, offset):
    start = len(PARTS)
    fabric, frame = '#d8d5cc', '#7a7f87'
    # Built facing +Y (feet towards the console), then turned into place.
    box((0, 0.05, 0.55), (0.72, 0.75, 0.12), fabric, bevel=0.03)
    box((0, -0.42, 0.88), (0.72, 0.14, 0.75), fabric, rot=(-28, 0, 0), bevel=0.03)
    box((0, -0.66, 1.33), (0.42, 0.14, 0.26), fabric, rot=(-28, 0, 0), bevel=0.03)
    box((0, 0.62, 0.72), (0.72, 0.55, 0.1), fabric, rot=(22, 0, 0), bevel=0.03)
    for x in (-0.4, 0.4):
        box((x, 0.0, 0.62), (0.06, 1.6, 0.06), frame)
        box((x, -0.25, 0.85), (0.08, 0.3, 0.06), '#5c616c')
    for x, y in ((-0.35, -0.5), (0.35, -0.5), (-0.35, 0.55), (0.35, 0.55)):
        strut((x, y, 0.0), (x, y, 0.58), 0.03, frame)
    transform_since(start, angle, offset)


def cm_interior():
    shell, shell2, rib, dark = '#c9ccd2', '#bcc0c8', '#8e939b', '#3b3f48'
    cyl((0, 0, -0.1), 3.05, 0.2, '#4f545f', verts=16)
    cyl((0, 0, 0.005), 2.2, 0.01, '#474c56', verts=16)
    for i in range(8):
        a0 = 45 + i * 22.5
        arc_panel(3.0, a0, a0 + 22.5, 0, 3.1, shell if i % 2 else shell2, lean=0.9)
        strut(polar(2.96, a0, 0), polar(2.06, a0, 3.1), 0.05, rib, verts=4)
    strut(polar(2.96, 225, 0), polar(2.06, 225, 3.1), 0.05, rib, verts=4)
    # The main display console, curving round the far side of the cabin.
    arc_panel(2.55, 100, 170, 0.95, 2.35, dark, lean=0.45, thickness=0.3)
    for k in range(9):
        a = 104 + k * 7.5
        for j, z in enumerate((1.15, 1.4, 1.65, 2.05)):
            r = 2.27 - (z - 0.95) * 0.32
            color = ('#f2f1ec', '#1b1620', '#9aa0a8', '#f2f1ec')[(k + j) % 4]
            box(polar(r, a, z), (0.07, 0.05, 0.07), color, rot=(0, 0, a))
    for a in (120, 150):
        ico(polar(2.05, a, 1.95), 0.17, '#1b1620', subdiv=2)
        ico(polar(1.99, a, 1.95), 0.11, '#f2f1ec', subdiv=2)
    # The DSKY: display and keypad, and the caution-and-warning matrix.
    box(polar(2.2, 135, 1.35), (0.5, 0.12, 0.42), '#2b2d33', rot=(0, 0, 135 - 90))
    for k in range(3):
        for j in range(4):
            box(polar(2.13, 133 + j * 1.8 - 2.7, 1.2 + k * 0.08), (0.06, 0.04, 0.05), '#d8d8d0', rot=(0, 0, 45))
    for k in range(4):
        for j in range(6):
            box(polar(2.04, 127 + j * 3.2, 2.12 + k * 0.07), (0.08, 0.04, 0.05), '#ffcf70' if (j + k) % 3 else '#f2f1ec', rot=(0, 0, 45))
    # Rendezvous windows and the side hatch.
    for a in (75, 195):
        box(polar(2.55, a, 2.15), (0.42, 0.12, 0.42), rib, rot=(0, 0, a - 90))
        box(polar(2.5, a, 2.15), (0.32, 0.12, 0.32), '#0b0c14', rot=(0, 0, a - 90))
    box(polar(2.75, 58, 1.2), (0.95, 0.15, 1.1), '#9aa0a8', rot=(0, 0, 58 - 90), bevel=0.06)
    box(polar(2.66, 58, 1.2), (0.25, 0.1, 0.08), '#5c616c', rot=(0, 0, 58 - 90))
    # Lower equipment bay lockers, with their handles.
    for k in range(3):
        for j in range(2):
            a = 196 + k * 9
            box(polar(2.82, a, 0.3 + j * 0.45), (0.5, 0.25, 0.4), '#9da1aa', rot=(0, 0, a - 90), bevel=0.02)
            box(polar(2.68, a, 0.3 + j * 0.45), (0.16, 0.04, 0.05), '#3b3f48', rot=(0, 0, a - 90))
    # Three couches, side by side, feet towards the console.
    toward = 135 - 90
    for k in (-1, 0, 1):
        couch(toward, (0.15 + k * 0.78, -0.15 + k * 0.78, 0))
    return prop('cm_interior')


# --- Eagle -----------------------------------------------------------------------------

def lm_interior():
    wall, wall2, dark, panel = '#7a7f8a', '#6e737e', '#2b2d33', '#4a4e58'
    box((0, 0, -0.1), (6.0, 5.0, 0.2), '#3f424a')
    for k in range(9):
        box((-2.4 + k * 0.6, 0, 0.005), (0.03, 4.8, 0.01), '#34363d')
    box((0, 2.45, 1.6), (6.0, 0.15, 3.2), wall)
    box((-2.95, 0, 1.6), (0.15, 5.0, 3.2), wall2)
    # The two triangular windows, slanted, with frames.
    for x in (-1.05, 1.05):
        cyl((x, 2.33, 2.15), 0.62, 0.1, dark, verts=3, rot=(90, 0, 90 if x < 0 else -90))
        cyl((x, 2.29, 2.15), 0.48, 0.08, '#0b0c14', verts=3, rot=(90, 0, 90 if x < 0 else -90))
    # The DSKY on its pedestal between the windows.
    box((0, 2.0, 0.7), (1.0, 0.6, 1.4), panel, bevel=0.03)
    box((0, 1.82, 1.25), (0.62, 0.3, 0.42), dark, rot=(-30, 0, 0))
    box((0.12, 1.69, 1.33), (0.3, 0.04, 0.16), '#1c5a2c', rot=(-30, 0, 0))
    for k in range(3):
        for j in range(5):
            box((-0.22 + j * 0.06, 1.69, 1.13 + k * 0.06), (0.04, 0.03, 0.04), '#d8d8d0', rot=(-30, 0, 0))
    # Flight display panels left and right, with attitude balls and gauges.
    for x in (-2.0, 2.0):
        box((x, 2.32, 1.45), (1.1, 0.12, 1.0), panel)
        ico((x - 0.15, 2.22, 1.6), 0.16, '#1b1620', subdiv=2)
        ico((x - 0.15, 2.17, 1.6), 0.1, '#f2f1ec', subdiv=2)
        for k in range(3):
            cyl((x + 0.3, 2.24, 1.2 + k * 0.25), 0.07, 0.04, '#d8d8d0', rot=(90, 0, 0), verts=8)
    # The circuit-breaker wall: rows and rows of little black buttons.
    box((-2.83, 0.2, 1.75), (0.08, 3.2, 1.3), panel)
    for k in range(6):
        for j in range(16):
            cyl((-2.77, -1.2 + j * 0.18, 1.25 + k * 0.2), 0.035, 0.06, '#1b1620', rot=(0, 90, 0), verts=6)
    # Hand controllers, armrests, the ascent engine cover, the forward hatch.
    for x in (-0.95, 0.95):
        box((x, 1.55, 0.95), (0.5, 0.25, 0.08), '#5c616c')
        strut((x, 1.55, 0.99), (x, 1.55, 1.2), 0.03, '#1b1620')
        box((x, 1.55, 1.22), (0.08, 0.08, 0.08), '#1b1620')
    cyl((1.2, 0.6, 0.0), 0.62, 0.75, '#8a8f9a', verts=12)
    cyl((1.2, 0.6, 0.75), 0.62, 0.06, '#5c616c', verts=12, radius2=0.5)
    box((0, 2.36, 0.42), (0.85, 0.08, 0.8), '#5a5f68', bevel=0.03)
    box((0.28, 2.3, 0.42), (0.06, 0.06, 0.25), '#2b2d33')
    # Two backpacks and helmets stowed for the moonwalk.
    for y in (-1.3, -0.5):
        box((2.3, y, 0.6), (0.7, 0.45, 1.2), '#e8e8e2', bevel=0.05)
        box((2.3, y - 0.25, 1.05), (0.4, 0.06, 0.25), '#9aa0a8')
    for y in (-1.7, 0.2):
        ico((2.6, y, 0.25), 0.25, '#f2f1ec', subdiv=2)
    return prop('lm_interior')


# --- The surface --------------------------------------------------------------------

def crater(name, r):
    # Lathe from just off the axis, capped flat in the middle.
    lathe([(0.02, 0.01), (r * 0.55, 0.015), (r * 0.82, 0.06), (r * 0.96, 0.2)], '#727270', segments=18)
    lathe([(r * 0.96, 0.2), (r * 1.03, 0.27), (r * 1.18, 0.14), (r * 1.4, 0.0)], '#979792', segments=18)
    cyl((0, 0, 0.005), r * 0.56, 0.01, '#727270', verts=18)
    for i in range(7):
        a = i / 7 * 360 + 13
        ico(polar(r * (1.05 + (i % 3) * 0.08), a, 0.18), 0.08 + (i % 2) * 0.05, '#8a8a85', subdiv=1, jitter=0.02)
    return prop(name)


def moon_boulder():
    ico((0, 0, 0.32), 0.5, '#7d7d78', subdiv=1, squash=(1.2, 0.9, 0.7), jitter=0.1)
    ico((0.45, 0.25, 0.15), 0.25, '#8a8a85', subdiv=1, jitter=0.05)
    return prop('moon_boulder')


def psep():
    gold, cell, line = '#d4a73a', '#1f3b7a', '#0f1f3f'
    for x, y in ((-0.18, -0.18), (0.18, -0.18), (-0.18, 0.18), (0.18, 0.18)):
        strut((x, y, 0), (x * 0.8, y * 0.8, 0.2), 0.02, '#bbbbbb')
    box((0, 0, 0.42), (0.48, 0.48, 0.45), gold, bevel=0.02)
    for side in (-1, 1):
        box((side * 0.82, 0, 0.5), (1.05, 0.55, 0.03), cell)
        for k in range(1, 4):
            box((side * (0.3 + k * 0.26), 0, 0.52), (0.015, 0.55, 0.01), line)
        box((side * 0.82, 0, 0.52), (1.05, 0.015, 0.01), line)
        strut((side * 0.24, 0, 0.5), (side * 0.3, 0, 0.5), 0.02, '#bbbbbb')
    strut((0, 0, 0.64), (0, 0, 1.05), 0.015, '#d0d0d0')
    cyl((0, 0, 1.08), 0.12, 0.05, '#e8e8e8', verts=8, radius2=0.04)
    return prop('psep')


def lrrr():
    for x, y in ((-0.35, -0.2), (0.35, -0.2), (0, 0.3)):
        strut((x, y, 0), (x * 0.6, y * 0.6, 0.3), 0.02, '#bbbbbb')
    box((0, 0, 0.32), (0.75, 0.5, 0.06), '#9aa0a8')
    start = len(PARTS)
    box((0, 0, 0), (0.95, 0.75, 0.08), '#3b3f48', bevel=0.01)
    for k in range(5):
        for j in range(6):
            cyl((-0.38 + j * 0.152, -0.28 + k * 0.14, 0.05), 0.05, 0.03, '#d9dde3', verts=8)
    for obj in PARTS[start:]:
        obj.matrix_world = Matrix.Translation((0, 0, 0.45)) @ Matrix.Rotation(math.radians(-25), 4, 'X') @ obj.matrix_world
    return prop('lrrr')


def swc():
    strut((0, 0, 0), (0, 0, 1.6), 0.02, '#d0d0d0')
    strut((-0.25, 0, 1.55), (0.25, 0, 1.55), 0.015, '#d0d0d0')
    box((0, -0.01, 0.95), (0.5, 0.01, 1.2), '#d9dde3')
    return prop('swc')


def tv_camera():
    for a in (0, 120, 240):
        strut(polar(0.4, a + 30, 0), (0, 0, 1.0), 0.015, '#9a9aa0')
    box((0, 0, 1.12), (0.22, 0.38, 0.2), '#555a66', bevel=0.02)
    cyl((0, -0.24, 1.12), 0.07, 0.12, '#1b1620', rot=(90, 0, 0), verts=8)
    return prop('tv_camera')


def earth():
    ico((0, 0, 0), 1.0, '#2f6fd0', subdiv=3)
    for (x, y, z, s, c) in ((0.55, -0.7, 0.35, 0.35, '#4f8a3a'), (0.2, -0.85, -0.35, 0.3, '#b8925a'), (-0.6, -0.65, 0.2, 0.28, '#4f8a3a'),
                            (0.7, -0.4, -0.5, 0.22, '#5f9a44'), (0.0, -0.4, 0.9, 0.3, '#f4f6ff'), (0.0, -0.3, -0.95, 0.28, '#f4f6ff')):
        v = Vector((x, y, z)).normalized() * 0.93
        ico(tuple(v), s, c, subdiv=1, squash=(1, 1, 0.55))
    for (x, y, z) in ((0.75, -0.6, 0.1), (-0.3, -0.85, -0.2), (0.4, -0.55, 0.65)):
        v = Vector((x, y, z)).normalized() * 0.98
        ico(tuple(v), 0.22, '#f4f4f4', subdiv=1, squash=(1.4, 1, 0.35))
    return prop('earth')


BUILDERS = [cm_interior, lm_interior, lambda: crater('crater_large', 2.0), lambda: crater('crater_small', 1.0),
            moon_boulder, psep, lrrr, swc, tv_camera, earth]
for build in BUILDERS:
    build()
bpy.context.view_layer.update()
export(os.path.join(MODELS, 'apollo-11.glb'), len(BUILDERS))
