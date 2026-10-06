"""D-Day in Blender: the scene sets for Omaha Beach, 6 June 1944, exported as
assets/models/d-day.glb.

    python tools/blender/dday.py

- hold_interior: a troopship's hold, cut away. Canvas bunks stacked five high
  on steel pipes, kit bags, rifles, inflatable life belts and helmets, a
  ladder up to the hatch, pipes overhead, the loudspeaker and a battle lamp.
- The beach defences Rommel ordered: Belgian gates, log stakes topped with
  Teller mines and concertina wire. The shingle bank and the low seawall
  that were the only cover, and the barrage balloons that floated over the
  beach by the afternoon.
- Above the bluffs: a hedgerow, a Norman stone house, Vierville's church
  steeple, an aid tent, a jeep ambulance with stretcher racks, and a
  stretcher.

The back walls of the interior are on Blender's -X and +Y sides, so the
cut-away faces the stage camera.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from kit import MODELS, PARTS, box, cyl, strut, ico, loft, prop, export  # noqa: E402
from mathutils import Matrix  # noqa: E402

STEEL, STEEL2, STEEL3 = '#8e939b', '#7a7f87', '#55595f'
OLIVE, OLIVE2, KHAKI, CANVAS = '#4f5638', '#6b6648', '#a89a6e', '#b8ab82'
STONE, STONE2, SLATE = '#b8ae98', '#a39882', '#4a4a50'


def roof(cx, cy, length, half_width, base_z, ridge_z, color, along_x=False):
    """A pitched roof: a triangular prism with its ridge along Y (or X)."""
    loft([(-length / 2, 0.03, base_z, ridge_z, half_width / 0.03), (length / 2, 0.03, base_z, ridge_z, half_width / 0.03)], color)
    m = Matrix.Translation((cx, cy, 0)) @ (Matrix.Rotation(math.radians(90), 4, 'Z') if along_x else Matrix.Identity(4))
    PARTS[-1].matrix_world = m @ PARTS[-1].matrix_world


def rifle(x, y, z, lean=15, rot=0):
    box((x, y, z + 0.55), (0.06, 0.06, 1.1), '#6e4a2a', rot=(lean, 0, rot))
    box((x, y - math.sin(math.radians(lean)) * 0.2, z + 0.95), (0.03, 0.03, 0.5), '#2a2a2a', rot=(lean, 0, rot))


# --- The troopship ----------------------------------------------------------------------

def hold_interior():
    box((0, 0, -0.1), (7.0, 6.0, 0.2), STEEL3)
    for k in range(7):
        box((-3 + k, 0, 0.005), (0.02, 5.8, 0.01), '#4a4e54')
    box((-3.45, 0, 1.6), (0.3, 6.0, 3.2), STEEL)
    box((0, 2.95, 1.6), (7.0, 0.3, 3.2), STEEL)
    # Ribs of the hull and rivet lines.
    for k in range(6):
        box((-3.28, -2.5 + k, 1.6), (0.08, 0.12, 3.2), STEEL2)
        box((-2.5 + k, 2.78, 1.6), (0.12, 0.08, 3.2), STEEL2)
    for z in (0.8, 1.6, 2.4):
        box((-3.29, 0, z), (0.02, 6.0, 0.03), STEEL3)
        box((0, 2.79, z), (7.0, 0.02, 0.03), STEEL3)
    # Canvas bunks five high on steel pipes, with kit and sleeping men's gear.
    for bx in (-2.4, -0.9, 0.6):
        for dx in (-0.65, 0.65):
            for dy in (-0.45, 0.45):
                strut((bx + dx, 2.25 + dy, 0), (bx + dx, 2.25 + dy, 3.0), 0.035, STEEL3, verts=6)
        for k in range(5):
            z = 0.25 + k * 0.6
            box((bx, 2.25, z), (1.3, 0.9, 0.05), CANVAS)
            strut((bx - 0.65, 1.8, z), (bx + 0.65, 1.8, z), 0.025, STEEL3, verts=5)
            if (k + int(bx * 3)) % 2 == 0:
                box((bx + 0.3, 2.2, z + 0.12), (0.45, 0.35, 0.2), OLIVE2, bevel=0.04)
            if k == 1:
                cyl((bx - 0.35, 2.2, z + 0.08), 0.2, 0.1, '#3a3a2a', verts=10)
    # Kit bags on the floor, rifles against the bulkhead, helmets, a life belt.
    for i in range(4):
        cyl((2.4 + (i % 2) * 0.5, 0.2 + i * 0.45, 0.3), 0.22, 0.6, OLIVE2, verts=8)
    for i in range(5):
        rifle(-3.15, -1.6 + i * 0.3, 0, lean=-12)
    for i in range(3):
        ico((1.8 + i * 0.4, -1.8, 0.12), 0.2, OLIVE, subdiv=2, squash=(1, 1, 0.6))
    # The ladder up to the hatch, pipes overhead, loudspeaker and battle lamp.
    for x in (2.2, 2.7):
        strut((x, 2.6, 0), (x, 2.75, 3.2), 0.03, STEEL3)
    for k in range(9):
        strut((2.2, 2.6 + k * 0.016, 0.3 + k * 0.32), (2.7, 2.6 + k * 0.016, 0.3 + k * 0.32), 0.02, STEEL3)
    strut((-3.3, 2.0, 3.0), (3.3, 2.0, 3.0), 0.07, STEEL2)
    strut((-3.3, 1.6, 2.85), (1.5, 1.6, 2.85), 0.05, '#9a6a4a')
    strut((-2.6, -2.9, 3.0), (-2.6, 2.9, 3.0), 0.06, STEEL2)
    box((-3.2, -0.4, 2.6), (0.15, 0.4, 0.35), '#3a3a3a', bevel=0.03)
    cyl((-3.1, -0.4, 2.6), 0.12, 0.05, '#1a1a1a', verts=10, rot=(0, 90, 0))
    box((1.6, 2.7, 2.6), (0.3, 0.12, 0.3), STEEL3)
    return prop('hold_interior')


# --- The beach --------------------------------------------------------------------------

def belgian_gate():
    for x in (-1.2, 1.2):
        strut((x, 0, 0.15), (x, 0, 2.4), 0.06, '#3a3a3a', verts=4)
        strut((x, 0, 0.15), (x * 0.6, 1.4, 0.15), 0.05, '#3a3a3a', verts=4)
        strut((x, 0, 2.4), (x * 0.6, 1.4, 0.15), 0.05, '#3a3a3a', verts=4)
        cyl((x, 0, 0.12), 0.12, 0.08, '#2a2a2a', rot=(0, 90, 0), verts=8)
    for z in (0.3, 1.25, 2.3):
        strut((-1.2, 0, z), (1.2, 0, z), 0.05, '#3a3a3a', verts=4)
    strut((-1.2, 0, 0.3), (1.2, 0, 2.3), 0.04, '#3a3a3a', verts=4)
    strut((1.2, 0, 0.3), (-1.2, 0, 2.3), 0.04, '#3a3a3a', verts=4)
    return prop('belgian_gate')


def stake_mine():
    strut((0, 0.5, 0), (0, -0.4, 1.5), 0.08, '#6e5236', verts=6)
    strut((0, 0.9, 0), (0, 0.2, 0.9), 0.06, '#5e4630', verts=6)
    cyl((0, -0.45, 1.58), 0.16, 0.08, OLIVE, verts=10, rot=(-30, 0, 0))
    return prop('stake_mine')


def shingle_bank():
    random.seed(11)
    for i in range(70):
        x = random.uniform(-2.0, 2.0)
        y = random.uniform(-0.5, 0.5)
        h = 0.35 * (1 - abs(y) * 1.4) + random.uniform(0, 0.08)
        ico((x, y, max(0.06, h)), random.uniform(0.08, 0.15), random.choice(('#8f8a7c', '#a59c86', '#77736a', '#9a948a')), subdiv=1, jitter=0.02)
    box((0, 0, 0.1), (4.1, 0.9, 0.2), '#8f8a7c')
    return prop('shingle_bank')


def seawall():
    box((0, 0, 0.45), (4.0, 0.35, 0.9), '#a09a8e', bevel=0.03)
    for k in range(5):
        strut((-1.8 + k * 0.9, -0.25, 0), (-1.8 + k * 0.9, -0.25, 1.05), 0.07, '#6e5236', verts=6)
    box((0, -0.25, 0.85), (4.0, 0.1, 0.12), '#6e5236')
    return prop('seawall')


def barbed_wire():
    turns, length = 14, 3.0
    pts = []
    for i in range(turns * 8 + 1):
        t = i / (turns * 8)
        a = t * turns * math.tau
        pts.append((-length / 2 + t * length, math.cos(a) * 0.3, 0.32 + math.sin(a) * 0.3))
    for a, b in zip(pts, pts[1:]):
        strut(a, b, 0.012, '#5a5a5a', verts=3)
    for x in (-1.4, 0, 1.4):
        strut((x, 0, 0), (x, 0, 0.8), 0.03, '#4a3a2a', verts=4)
    return prop('barbed_wire')


def barrage_balloon():
    ico((0, 0, 0), 1.0, '#9a9ea6', subdiv=2, squash=(0.6, 1.6, 0.6))
    for rot in (0, 90, -90):
        box((0, 1.4, 0), (0.05, 0.6, 0.6), '#8a8e96', rot=(0, rot, 0))
    strut((0, 0, -0.6), (0, 0, -6.0), 0.01, '#3a3a3a', verts=3)
    return prop('barrage_balloon')


# --- Above the bluffs ---------------------------------------------------------------

def hedgerow():
    box((0, 0, 0.45), (6.0, 1.0, 0.9), '#6e5236', bevel=0.15)
    for i in range(10):
        ico((-2.7 + i * 0.6, random.uniform(-0.2, 0.2), 1.05 + random.uniform(0, 0.2)), 0.45, random.choice(('#4f6e30', '#5f8a3a', '#3f5e28')), subdiv=1, jitter=0.06)
    for x in (-1.8, 1.4):
        strut((x, 0, 0.8), (x, 0, 2.2), 0.1, '#5a4030', verts=6)
        ico((x, 0, 2.5), 0.7, '#4f6e30', subdiv=1, jitter=0.08)
    return prop('hedgerow')


def norman_house():
    box((0, 0, 0.9), (3.0, 2.2, 1.8), STONE, bevel=0.02)
    for k in range(12):
        box((random.uniform(-1.4, 1.4), -1.11, random.uniform(0.2, 1.6)), (0.3, 0.01, 0.15), STONE2)
    # A steep slate roof, a chimney, shuttered windows, a door.
    roof(0, 0, 3.3, 1.3, 1.8, 3.1, SLATE, along_x=True)
    box((1.1, 0.3, 2.9), (0.4, 0.4, 0.9), STONE2)
    for x in (-0.9, 0.9):
        box((x, -1.12, 1.2), (0.5, 0.04, 0.55), '#2a2a2a')
        box((x - 0.33, -1.13, 1.2), (0.15, 0.04, 0.6), '#4f6e5a')
        box((x + 0.33, -1.13, 1.2), (0.15, 0.04, 0.6), '#4f6e5a')
    box((0, -1.12, 0.55), (0.6, 0.05, 1.1), '#5a4030')
    return prop('norman_house')


def church_steeple():
    box((0, 1.6, 1.0), (2.2, 3.0, 2.0), STONE)
    roof(0, 1.6, 3.1, 1.25, 2.0, 2.9, SLATE)
    box((0, 0, 1.8), (1.3, 1.3, 3.6), STONE2, bevel=0.02)
    box((0, -0.66, 3.0), (0.35, 0.04, 0.6), '#2a2a2a')
    cyl((0, 0, 4.4), 0.95, 1.6, SLATE, verts=4, radius2=0.02, rot=(0, 0, 45))
    strut((0, 0, 5.2), (0, 0, 5.7), 0.03, '#3a3a3a')
    strut((-0.15, 0, 5.55), (0.15, 0, 5.55), 0.03, '#3a3a3a')
    return prop('church_steeple')


def aid_tent():
    box((0, 0, 0.6), (2.4, 1.8, 1.2), OLIVE2)
    cyl((0, 0, 1.55), 1.75, 0.9, OLIVE, verts=4, radius2=0.05, rot=(0, 0, 45))
    for x, rot in ((0, 0), (-1.21, 90)):
        box((x, -0.91 if x == 0 else 0, 0.75), (0.5, 0.02, 0.5), '#f4f4f1', rot=(0, 0, rot))
        box((x, -0.92 if x == 0 else 0, 0.75), (0.4, 0.02, 0.12), '#e03a3a', rot=(0, 0, rot))
        box((x, -0.92 if x == 0 else 0, 0.75), (0.12, 0.02, 0.4), '#e03a3a', rot=(0, 0, rot))
    box((0.5, -0.9, 0.55), (0.8, 0.04, 1.1), '#2a2a1a')
    return prop('aid_tent')


def stretcher():
    for x in (-0.25, 0.25):
        strut((x, -1.0, 0.2), (x, 1.0, 0.2), 0.025, '#6e5236', verts=5)
    box((0, 0, 0.22), (0.5, 1.6, 0.03), KHAKI)
    box((0, 0.3, 0.32), (0.38, 1.1, 0.18), '#6b7a8a', bevel=0.05)
    for y in (-0.8, 0.8):
        for x in (-0.25, 0.25):
            strut((x, y, 0), (x, y, 0.2), 0.02, '#4a4a4a', verts=4)
    return prop('stretcher')


def jeep_ambulance():
    box((0, 0, 0.55), (1.3, 2.6, 0.45), OLIVE, bevel=0.05)
    box((0, -1.15, 0.85), (1.25, 0.3, 0.2), OLIVE2)
    box((0, -0.55, 1.05), (1.25, 0.05, 0.45), '#5a6040', rot=(-10, 0, 0))
    for x in (-0.68, 0.68):
        for y in (-0.85, 0.85):
            cyl((x, y, 0.3), 0.3, 0.2, '#2a2a24', rot=(0, 90, 0), verts=10)
    # Stretcher racks over the back, each with a red cross.
    for side in (-1, 1):
        strut((side * 0.55, 0.2, 0.8), (side * 0.55, 0.2, 1.5), 0.03, '#3a3a3a')
        strut((side * 0.55, 1.4, 0.8), (side * 0.55, 1.4, 1.5), 0.03, '#3a3a3a')
    box((0, 0.8, 1.5), (1.25, 1.4, 0.05), KHAKI)
    box((0, 0.8, 1.1), (1.25, 1.4, 0.05), KHAKI)
    box((0.66, 0.0, 0.6), (0.02, 0.35, 0.35), '#f4f4f1')
    box((0.67, 0.0, 0.6), (0.02, 0.25, 0.08), '#e03a3a')
    box((0.67, 0.0, 0.6), (0.02, 0.08, 0.25), '#e03a3a')
    box((0, 0.0, 0.81), (0.3, 0.3, 0.02), '#f4f4f1')
    return prop('jeep_ambulance')


BUILDERS = [hold_interior, belgian_gate, stake_mine, shingle_bank, seawall, barbed_wire, barrage_balloon,
            hedgerow, norman_house, church_steeple, aid_tent, stretcher, jeep_ambulance]
for build in BUILDERS:
    build()
bpy.context.view_layer.update()
export(os.path.join(MODELS, 'd-day.glb'), len(BUILDERS))
