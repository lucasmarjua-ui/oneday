"""Tenochtitlan in Blender: the scene sets for 8 November 1519, exported as
assets/models/tenochtitlan.glb.

    python tools/blender/tenochtitlan.py

- chamber_interior: a room in Cuitlahuac's palace at Iztapalapa. White stucco
  walls with a painted frieze, cedar beams, reed mats, a woven chest, a
  backed reed seat (icpalli), a feather-mosaic shield, a brazier, and a
  curtained doorway onto the gardens.
- palace_hall: the palace of Axayacatl where the Spaniards were lodged. Red
  columns, painted murals, a dais with a jaguar pelt, feather hangings,
  braziers, food jars, and the plastered-over doorway that hid the royal
  treasure.
- The lake: the causeway's removable wooden bridge, the twin-towered fort
  at Xoloc, chinampa fields with their tall ahuejote willows, and the tule
  reeds.
- The city: plastered houses with roof gardens, the double-channel
  aqueduct from Chapultepec, market stalls, and a clay brazier.

Back walls of the interiors are on Blender's -X and +Y sides, so the
cut-away faces the stage camera.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from kit import MODELS, PARTS, box, cyl, strut, ico, prop, export  # noqa: E402

STUCCO, STUCCO2 = '#efe6d2', '#e2d7bf'
RED, TEAL, OCHRE, JADE = '#a8423a', '#2f9e7a', '#d9a441', '#3fcf9a'
CEDAR = '#8a5a3a'
REED = '#c8a45c'


def frieze(x0, y0, x1, y1, z, colors=(RED, TEAL, OCHRE)):
    """A painted band of repeating geometric panels along a wall."""
    length = math.hypot(x1 - x0, y1 - y0)
    n = max(1, int(length / 0.45))
    for i in range(n):
        t = (i + 0.5) / n
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        angle = math.degrees(math.atan2(y1 - y0, x1 - x0))
        box((x, y, z), (length / n * 0.9, 0.02, 0.22), colors[i % len(colors)], rot=(0, 0, angle))
        box((x, y, z), (length / n * 0.35, 0.025, 0.08), STUCCO, rot=(0, 0, angle))


def brazier(x, y, scale=1.0):
    for a in (0, 120, 240):
        r = math.radians(a)
        strut((x + math.cos(r) * 0.2 * scale, y + math.sin(r) * 0.2 * scale, 0), (x + math.cos(r) * 0.12 * scale, y + math.sin(r) * 0.12 * scale, 0.35 * scale), 0.04 * scale, '#7a4a2a', verts=5)
    cyl((x, y, 0.45 * scale), 0.22 * scale, 0.22 * scale, '#9c5a32', verts=10, radius2=0.32 * scale)
    cyl((x, y, 0.57 * scale), 0.28 * scale, 0.02, '#3a2a20', verts=10)


def icpalli(x, y, angle=0.0):
    """A woven reed seat with a tall backrest: the seat of lords."""
    start = len(PARTS)
    box((0, 0, 0.18), (0.7, 0.6, 0.36), REED, bevel=0.03)
    box((0, 0.3, 0.6), (0.7, 0.12, 0.9), REED, rot=(-12, 0, 0), bevel=0.03)
    for k in range(4):
        box((0, 0.24, 0.3 + k * 0.2), (0.72, 0.02, 0.03), '#a8823f', rot=(-12, 0, 0))
    from mathutils import Matrix
    m = Matrix.Translation((x, y, 0)) @ Matrix.Rotation(math.radians(angle), 4, 'Z')
    for obj in PARTS[start:]:
        obj.matrix_world = m @ obj.matrix_world


def feather_shield(x, y, z, facing):
    cyl((x, y, z), 0.32, 0.05, JADE, verts=14, rot=(90, 0, facing))
    cyl((x, y, z), 0.2, 0.06, OCHRE, verts=14, rot=(90, 0, facing))
    cyl((x, y, z), 0.08, 0.07, RED, verts=10, rot=(90, 0, facing))


# --- Iztapalapa ------------------------------------------------------------------------

def chamber_interior():
    box((0, 0, -0.1), (7.0, 6.0, 0.2), '#c9a47a')
    box((0, 0, 0.003), (6.8, 5.8, 0.004), '#d2ae84')
    box((-3.45, 0, 1.5), (0.3, 6.0, 3.0), STUCCO)
    box((0, 2.95, 1.5), (7.0, 0.3, 3.0), STUCCO)
    box((-3.29, 0, 0.3), (0.02, 6.0, 0.6), RED)
    box((0, 2.79, 0.3), (7.0, 0.02, 0.6), RED)
    frieze(-3.28, -2.9, -3.28, 2.9, 2.3)
    frieze(-3.4, 2.78, 3.4, 2.78, 2.3)
    for k in range(6):
        y = 2.8 - k * 0.55
        strut((-3.5, y, 3.05), (0.5 - k * 0.6, y, 3.05), 0.08, CEDAR, verts=6)
    # Reed mats, a woven chest, the backed seat, cushions, flowers.
    box((-1.4, 1.4, 0.02), (2.2, 1.4, 0.04), REED)
    box((-1.4, 1.7, 0.08), (1.8, 0.6, 0.12), '#efe7d2')
    box((1.6, 2.4, 0.25), (1.2, 0.6, 0.5), '#b08a4a', bevel=0.04)
    for k in range(3):
        box((1.6, 2.09, 0.12 + k * 0.14), (1.2, 0.02, 0.04), '#8a6a35')
    icpalli(-2.4, 2.2, 0)
    for k, color in enumerate((TEAL, RED, OCHRE)):
        box((0.8 + k * 0.55, 1.6, 0.08), (0.45, 0.45, 0.16), color, bevel=0.04)
    cyl((2.9, 1.2, 0.3), 0.18, 0.6, '#b5643a', verts=8, radius2=0.12)
    for k in range(5):
        ico((2.9 + math.cos(k) * 0.12, 1.2 + math.sin(k) * 0.12, 0.7 + (k % 2) * 0.08), 0.07, ('#e05a8a', '#ffd84a', '#ffffff')[k % 3], subdiv=1)
    feather_shield(-3.27, -0.6, 1.6, 90)
    # A brazier, and the doorway onto the gardens with its cotton curtain.
    brazier(2.6, -1.4)
    box((-3.45, -2.0, 1.1), (0.32, 1.2, 2.2), '#2a2a1a')
    box((-3.3, -2.0, 1.15), (0.04, 1.1, 2.1), '#efe7d2')
    for k in range(5):
        box((-3.28, -2.45 + k * 0.22, 1.15), (0.02, 0.04, 2.1), '#e2d7bf')
    box((0.6, 2.78, 2.0), (1.3, 0.04, 0.6), '#ffb36b')
    return prop('chamber_interior')


# --- The lake --------------------------------------------------------------------------

def causeway_bridge():
    # The causeways had gaps spanned by wooden bridges that could be removed.
    for x in (-0.9, 0.9):
        box((x, 0, -0.4), (0.6, 1.6, 0.8), '#bfae8a')
    for k in range(7):
        box((0, -0.6 + k * 0.2, 0.06), (2.4, 0.18, 0.08), CEDAR if k % 2 else '#7a4a2a')
    for x in (-1.2, 1.2):
        strut((x, -0.8, 0.0), (x, -0.8, 0.5), 0.04, CEDAR)
        strut((x, 0.8, 0.0), (x, 0.8, 0.5), 0.04, CEDAR)
        strut((x, -0.8, 0.5), (x, 0.8, 0.5), 0.03, CEDAR)
    return prop('causeway_bridge')


def xoloc_fort():
    for x in (-1.6, 1.6):
        box((x, 0, 1.4), (1.4, 1.4, 2.8), STUCCO, bevel=0.03)
        box((x, 0, 2.86), (1.5, 1.5, 0.12), RED)
        for i in range(4):
            for side in (-1, 1):
                box((x - 0.55 + i * 0.37, side * 0.7, 3.05), (0.18, 0.12, 0.25), STUCCO)
    box((0, 0, 2.2), (1.9, 1.0, 0.6), STUCCO2)
    box((0, 0, 2.55), (2.0, 1.1, 0.1), RED)
    frieze(-0.95, -0.51, 0.95, -0.51, 2.2, (TEAL, OCHRE))
    return prop('xoloc_fort')


def ahuejote():
    """The tall, narrow willow planted along the edges of chinampas."""
    strut((0, 0, 0), (0.05, 0, 1.4), 0.07, '#6e5236', verts=6)
    for k in range(4):
        ico((0.04, 0, 1.3 + k * 0.45), 0.32 - k * 0.04, '#5f8a3a' if k % 2 else '#6f9a44', subdiv=1, squash=(0.8, 0.8, 1.5), jitter=0.04)
    return prop('ahuejote')


def chinampa():
    box((0, 0, -0.12), (3.0, 1.2, 0.3), '#5a4a32')
    box((0, 0, 0.04), (2.9, 1.1, 0.04), '#6a8f3a')
    for row in range(3):
        y = -0.35 + row * 0.35
        for i in range(8):
            color = ('#c9b23a', '#7aa84a', '#e07a3a')[row]
            box((-1.25 + i * 0.36, y, 0.16), (0.12, 0.12, 0.22 + (i % 2) * 0.06), color)
    for x in (-1.4, -0.5, 0.5, 1.4):
        strut((x, -0.62, -0.2), (x, -0.62, 0.1), 0.04, '#7a5a38')
    return prop('chinampa')


def tule():
    for i in range(10):
        a = random.uniform(0, math.tau)
        r = random.uniform(0, 0.3)
        h = random.uniform(0.8, 1.3)
        strut((math.cos(a) * r, math.sin(a) * r, 0), (math.cos(a) * (r + 0.1), math.sin(a) * (r + 0.1), h), 0.025, '#6f8f3a', verts=4)
        if i % 3 == 0:
            cyl((math.cos(a) * (r + 0.1), math.sin(a) * (r + 0.1), h - 0.15), 0.04, 0.16, '#7a5a38', verts=5)
    return prop('tule')


# --- The city ----------------------------------------------------------------------------

def mexica_house():
    box((0, 0, 0.75), (2.2, 2.0, 1.5), STUCCO, bevel=0.02)
    box((0, 0, 1.55), (2.3, 2.1, 0.12), STUCCO2)
    box((0, -1.01, 0.12), (2.2, 0.02, 0.24), RED)
    box((0.4, -1.01, 0.6), (0.6, 0.04, 1.1), '#3a2a1a')
    box((0.4, -1.02, 0.6), (0.72, 0.03, 1.2), RED)
    for side in (-1, 1):
        box((side * 1.08, 0, 1.75), (0.1, 2.1, 0.3), STUCCO)
    box((0, -1.08, 1.75), (2.3, 0.1, 0.3), STUCCO)
    # A roof garden.
    box((-0.4, 0.3, 1.65), (1.0, 0.9, 0.12), '#5a4a32')
    for i in range(6):
        ico((-0.75 + (i % 3) * 0.35, 0.05 + (i // 3) * 0.45, 1.85), 0.15, ('#5f8a3a', '#e05a8a', '#78a04a')[i % 3], subdiv=1)
    return prop('mexica_house')


def aqueduct():
    for k in range(4):
        x = -1.5 + k * 1.0
        box((x, 0, 0.3), (0.95, 0.9, 0.6), '#bfae8a', bevel=0.02)
    for y in (-0.22, 0.22):
        box((0, y, 0.66), (4.0, 0.3, 0.12), '#a8977a')
        box((0, y, 0.7), (4.0, 0.2, 0.04), '#5fb3e6')
    box((0, 0, 0.7), (4.0, 0.06, 0.16), '#a8977a')
    return prop('aqueduct')


def market_stall():
    for x, y in ((-0.6, -0.5), (0.6, -0.5), (-0.6, 0.5), (0.6, 0.5)):
        strut((x, y, 0), (x, y, 1.4), 0.03, CEDAR)
    box((0, 0, 1.42), (1.5, 1.3, 0.05), '#efe2c2')
    box((0, 0, 0.02), (1.2, 1.0, 0.04), REED)
    goods = (('#e0b040', 0.12), ('#c0392b', 0.08), ('#6b3a20', 0.07), ('#7aa84a', 0.1))
    for i, (color, r) in enumerate(goods):
        x = -0.35 + (i % 2) * 0.7
        y = -0.25 + (i // 2) * 0.5
        cyl((x, y, 0.1), 0.22, 0.12, '#c8a45c', verts=10)
        for k in range(5):
            ico((x + math.cos(k * 1.3) * 0.1, y + math.sin(k * 1.3) * 0.1, 0.2 + (k % 2) * 0.05), r * 0.6, color, subdiv=1)
    return prop('market_stall')


def brazier_prop():
    brazier(0, 0, 1.2)
    return prop('brazier')


# --- Axayacatl -----------------------------------------------------------------------

def palace_hall():
    box((0, 0, -0.1), (8.0, 7.0, 0.2), '#d4c3a0')
    box((-3.95, 0, 1.75), (0.3, 7.0, 3.5), STUCCO)
    box((0, 3.45, 1.75), (8.0, 0.3, 3.5), STUCCO)
    box((-3.79, 0, 0.35), (0.02, 7.0, 0.7), RED)
    box((0, 3.29, 0.35), (8.0, 0.02, 0.7), RED)
    frieze(-3.78, -3.4, -3.78, 3.4, 2.6, (TEAL, OCHRE, RED, JADE))
    frieze(-3.9, 3.28, 3.9, 3.28, 2.6, (TEAL, OCHRE, RED, JADE))
    # A mural: a procession of figures in red and ochre.
    for i in range(7):
        x = -3.0 + i * 0.9
        box((x, 3.27, 1.5), (0.25, 0.02, 0.55), (RED, OCHRE, TEAL)[i % 3])
        cyl((x, 3.26, 1.88), 0.11, 0.02, '#c98a5a', verts=8, rot=(90, 0, 0))
    # Painted cedar columns carrying a beam.
    for x in (-2.5, 0.0, 2.5):
        cyl((x, 1.8, 1.6), 0.24, 3.2, RED, verts=8)
        box((x, 1.8, 3.25), (0.6, 0.6, 0.12), OCHRE)
    box((0, 1.8, 3.35), (7.6, 0.4, 0.16), CEDAR)
    # The dais: a stone platform, a seat with a jaguar pelt, feather hangings.
    box((0.4, 2.7, 0.2), (3.4, 1.2, 0.4), '#c9bfa8', bevel=0.03)
    icpalli(0.4, 2.75, 0)
    box((0.4, 2.45, 0.42), (1.2, 0.8, 0.03), '#e0b040')
    for i in range(14):
        ico((0.4 - 0.5 + (i % 5) * 0.25, 2.15 + (i // 5) * 0.28, 0.44), 0.035, '#2a1a10', subdiv=1, squash=(1, 1, 0.3))
    for i in range(6):
        box((-1.0 + i * 0.6, 3.28, 2.95), (0.12, 0.03, 0.6), (JADE, TEAL)[i % 2])
    feather_shield(-3.77, 1.0, 1.7, 90)
    feather_shield(-3.77, -1.0, 1.7, 90)
    # The walled-up treasure doorway: a stucco patch, a little too fresh.
    box((-3.8, -2.4, 1.0), (0.04, 1.3, 2.0), '#f6efe0')
    box((-3.79, -2.4, 1.0), (0.02, 1.4, 2.1), '#d6ccb4')
    # Braziers, mats with cushions, jars of food and water.
    brazier(2.9, -1.4)
    brazier(-2.4, -0.2)
    for x in (-1.6, 1.2):
        box((x, -0.6, 0.02), (1.6, 1.2, 0.04), REED)
        for k, color in enumerate((TEAL, RED)):
            box((x - 0.4 + k * 0.8, -0.3, 0.1), (0.45, 0.45, 0.16), color, bevel=0.04)
    for k in range(4):
        cyl((3.4, -0.5 + k * 0.55, 0.3), 0.2, 0.6, '#b5643a', verts=8, radius2=0.12)
    return prop('palace_hall')


BUILDERS = [chamber_interior, palace_hall, causeway_bridge, xoloc_fort, ahuejote, chinampa, tule, mexica_house, aqueduct, market_stall, brazier_prop]
for build in BUILDERS:
    build()
bpy.context.view_layer.update()
export(os.path.join(MODELS, 'tenochtitlan.glb'), len(BUILDERS))
