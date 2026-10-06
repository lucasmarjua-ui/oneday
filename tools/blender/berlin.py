"""The fall of the Berlin Wall in Blender: the scene sets for East Berlin on
9 November 1989, exported as assets/models/berlin-wall.glb.

    python tools/blender/berlin.py

- flat_interior: a room in an old Prenzlauer Berg tenement, cut away. A
  tiled coal stove with its bucket of briquettes, an RFT television on a
  sideboard, a sofa under the window, a table set for breakfast, a shelf of
  books and records, flowered wallpaper.
- press_room: the International Press Centre on Mohrenstraße. A long table
  on a dais with four chairs, microphones and name cards, the state emblem on
  the wall behind, rows of chairs and TV cameras on tripods.
- Prenzlauer Berg and Mitte: tenements with stucco peeling off (one with the
  Kaufhalle, one with a corner pub), a prefab panel block for the agency,
  the brick tower of the Gethsemane Church with candles on its steps, a
  newspaper kiosk, a street lamp, the traffic light with its little man,
  Trabants in blue and cream, a grey Wartburg, the TV Tower on the horizon.
- The border at Bornholmer Straße: the Wall in L-shaped concrete segments
  with a pipe along the top (white on the east side, painted on the west), a
  watchtower, the passport control hut, the striped barrier, floodlights and
  the steel arch of the Bösebrücke.
- The Brandenburg Gate with its Quadriga, and the thick, flat-topped wall in
  front of it that people danced on.

The back walls of the interiors are on Blender's -X and +Y sides, so the
cut-away faces the stage camera.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from kit import MODELS, box, cyl, strut, ico, lathe, prop, export  # noqa: E402

CONCRETE, CONCRETE2, CONCRETE3 = '#c9c6bd', '#b3afa5', '#8f8b82'
STUCCO, STUCCO2, STUCCO3 = '#b9a888', '#a89676', '#8c7d63'
WOOD, WOOD2, WOOD3 = '#7a5034', '#93653f', '#5c3a24'
GLASS, GLASS_LIT = '#5d7385', '#f2d98a'
STEEL, STEEL2 = '#6e737a', '#4c5056'
RED = '#c8302c'


def window(x, y, z, w=0.55, h=0.85, face='-y', lit=False, frame='#ece6d6'):
    """A window with a white frame and a cross bar on a facade facing `face`."""
    pane = GLASS_LIT if lit else GLASS
    if face == '-y':
        box((x, y - 0.02, z), (w + 0.1, 0.05, h + 0.1), frame)
        box((x, y - 0.05, z), (w, 0.03, h), pane)
        box((x, y - 0.07, z + h * 0.15), (w, 0.02, 0.04), frame)
        box((x, y - 0.07, z), (0.04, 0.02, h), frame)
    else:
        box((x - 0.02, y, z), (0.05, w + 0.1, h + 0.1), frame)
        box((x - 0.05, y, z), (0.03, w, h), pane)
        box((x - 0.07, y, z + h * 0.15), (0.02, w, 0.04), frame)
        box((x - 0.07, y, z), (0.02, 0.04, h), frame)


# --- Indoors -----------------------------------------------------------------------------------

def flat_interior():
    random.seed(3)
    # Floorboards and a rug.
    box((0, 0, -0.1), (7.0, 6.0, 0.2), WOOD2)
    for k in range(14):
        box((-3.5 + k * 0.5, 0, 0.003), (0.02, 6.0, 0.006), WOOD3)
    box((0.6, -0.6, 0.01), (2.6, 1.8, 0.02), '#8a3a34')
    box((0.6, -0.6, 0.02), (2.2, 1.4, 0.02), '#b85a3c')
    # Two walls with flowered wallpaper over a dark skirting board.
    box((-3.45, 0, 1.6), (0.3, 6.0, 3.2), '#c9c09a')
    box((0, 2.95, 1.6), (7.0, 0.3, 3.2), '#c9c09a')
    for k in range(24):
        y = -2.8 + (k % 12) * 0.5
        z = 0.6 + (k // 12) * 1.2 + (k % 2) * 0.6
        box((-3.29, y, z), (0.02, 0.12, 0.12), '#9a8a6a')
        box((-3 + (k % 12) * 0.55, 2.79, z + 0.3), (0.12, 0.02, 0.12), '#9a8a6a')
    box((-3.28, 0, 0.08), (0.04, 6.0, 0.16), WOOD3)
    box((0, 2.78, 0.08), (7.0, 0.04, 0.16), WOOD3)
    # The tiled stove in the corner, cream-green tiles, brass door; the coal bucket.
    box((-2.85, 2.35, 1.0), (0.9, 0.8, 2.0), '#cfd2b4', bevel=0.04)
    for z in range(5):
        box((-2.85, 1.94, 0.2 + z * 0.4), (0.92, 0.02, 0.02), '#a9ad8c')
    box((-2.85, 2.35, 2.05), (1.0, 0.9, 0.12), '#b9bc9c')
    box((-2.85, 1.93, 0.45), (0.3, 0.03, 0.25), '#b08a3a')
    cyl((-2.15, 2.0, 0.18), 0.17, 0.36, '#3a3a3a', verts=10)
    for i in range(5):
        box((-2.15 + random.uniform(-0.08, 0.08), 2.0 + random.uniform(-0.08, 0.08), 0.38), (0.1, 0.06, 0.05), '#1a1a1a')
    # The window over the sofa (on the left wall), with a net curtain and a plant.
    window(-3.28, -0.9, 1.75, w=1.2, h=1.3, face='x', lit=False)
    box((-3.25, -0.9, 1.75), (0.02, 1.3, 1.35), '#f2efe4')
    box((-3.15, -0.9, 1.08), (0.25, 1.4, 0.05), '#e8e2d2')
    cyl((-3.12, -0.4, 1.2), 0.08, 0.16, '#b5643a', verts=8)
    ico((-3.12, -0.4, 1.38), 0.13, '#4f7a3a', subdiv=1, jitter=0.03)
    # The sofa, brown corduroy, with a crocheted blanket.
    box((-2.85, -0.9, 0.25), (0.8, 2.0, 0.5), '#7a5a3a', bevel=0.05)
    box((-3.15, -0.9, 0.65), (0.25, 2.0, 0.5), '#6e5034', bevel=0.05)
    for y in (-1.95, 0.15):
        box((-2.85, y, 0.45), (0.8, 0.15, 0.4), '#6e5034', bevel=0.04)
    box((-2.75, -0.5, 0.52), (0.6, 0.7, 0.04), '#d9b85a')
    # The sideboard with the RFT television, its antenna, a radio and a vase.
    box((1.4, 2.5, 0.45), (2.2, 0.55, 0.9), WOOD, bevel=0.02)
    for x in (0.65, 1.4, 2.15):
        box((x, 2.21, 0.45), (0.65, 0.02, 0.75), WOOD2)
        box((x + 0.2, 2.19, 0.6), (0.06, 0.02, 0.04), '#c9b26a')
    box((1.1, 2.5, 1.2), (0.85, 0.6, 0.6), '#5a3a26', bevel=0.03)
    box((1.0, 2.19, 1.2), (0.6, 0.02, 0.45), '#2a3238')
    box((1.0, 2.18, 1.2), (0.5, 0.02, 0.36), '#4a6a7a')
    for x in (1.42, 1.48):
        cyl((x, 2.19, 1.05 + (x - 1.42) * 3), 0.03, 0.02, '#c9c6bd', rot=(90, 0, 0), verts=6)
    strut((1.2, 2.5, 1.5), (0.9, 2.5, 1.95), 0.01, '#c9c6bd', verts=4)
    strut((1.2, 2.5, 1.5), (1.55, 2.5, 1.95), 0.01, '#c9c6bd', verts=4)
    box((2.1, 2.5, 1.02), (0.5, 0.25, 0.25), '#d8c9a4', bevel=0.02)
    cyl((2.1, 2.37, 1.02), 0.07, 0.01, '#5a4a3a', rot=(90, 0, 0), verts=10)
    # A shelf of books and records.
    box((-1.3, 2.62, 1.0), (1.3, 0.3, 2.0), WOOD3)
    for z in (0.35, 0.85, 1.35, 1.8):
        box((-1.3, 2.5, z - 0.2), (1.2, 0.3, 0.03), WOOD)
        x = -1.85
        while x < -0.8:
            wdt = random.uniform(0.04, 0.09)
            box((x + wdt / 2, 2.5, z), (wdt, 0.22, random.uniform(0.28, 0.38)), random.choice(('#8a3a34', '#3a5a7a', '#c9b26a', '#4f6e3a', '#e8e2d2', '#5a3a26')))
            x += wdt + 0.01
    # The breakfast table and two chairs, cups, a coffee pot, the camera bag.
    cyl((-0.6, -1.6, 0.72), 0.5, 0.04, WOOD, verts=16)
    cyl((-0.6, -1.6, 0.36), 0.06, 0.72, WOOD3, verts=8)
    cyl((-0.6, -1.6, 0.02), 0.3, 0.04, WOOD3, verts=12)
    for cx, cy in ((-0.4, -1.45), (-0.8, -1.75)):
        cyl((cx, cy, 0.78), 0.05, 0.08, '#f2efe4', verts=8)
    cyl((-0.55, -1.8, 0.82), 0.07, 0.17, '#e8e2d2', verts=8, radius2=0.05)
    for dx in (-0.9, 0.9):
        x = -0.6 + dx * 0.8
        box((x, -1.6, 0.45), (0.42, 0.42, 0.05), WOOD2)
        for ox in (-0.18, 0.18):
            for oy in (-0.18, 0.18):
                strut((x + ox, -1.6 + oy, 0), (x + ox, -1.6 + oy, 0.45), 0.02, WOOD3, verts=4)
        box((x + (0.2 if dx > 0 else -0.2), -1.6, 0.75), (0.04, 0.42, 0.5), WOOD2)
    box((0.6, -2.2, 0.15), (0.4, 0.25, 0.3), '#3a3a34', bevel=0.03)
    # A calendar and a framed photo on the walls; a ceiling lamp.
    box((0.2, 2.79, 1.9), (0.4, 0.02, 0.55), '#f2efe4')
    box((0.2, 2.78, 2.05), (0.36, 0.02, 0.2), '#3a6a8a')
    box((-3.29, 1.3, 2.1), (0.02, 0.45, 0.35), WOOD3)
    box((-3.28, 1.3, 2.1), (0.02, 0.37, 0.27), '#a39882')
    strut((0.5, 0.2, 3.2), (0.5, 0.2, 2.6), 0.01, '#2a2a2a', verts=4)
    cyl((0.5, 0.2, 2.52), 0.25, 0.16, '#d9b85a', verts=10, radius2=0.08)
    return prop('flat_interior')


def press_room():
    random.seed(5)
    box((0, 0, -0.1), (8.0, 7.0, 0.2), '#7a6a5a')
    box((0.3, -0.3, 0.005), (6.8, 5.0, 0.01), '#6a4a4a')
    box((-3.95, 0, 1.75), (0.3, 7.0, 3.5), '#d9d2c2')
    box((0, 3.45, 1.75), (8.0, 0.3, 3.5), '#d9d2c2')
    # Wood panelling and curtains on the side wall.
    box((-3.79, 0, 0.6), (0.04, 7.0, 1.2), WOOD)
    for y in (-2.4, -0.4, 1.6):
        box((-3.76, y, 2.2), (0.06, 1.4, 2.2), '#6a5a7a')
        for k in range(5):
            box((-3.72, y - 0.56 + k * 0.28, 2.2), (0.03, 0.06, 2.2), '#5a4a6a')
    # The dais along the back wall, the long table with its cloth, four chairs.
    box((0.4, 2.55, 0.15), (6.0, 1.6, 0.3), WOOD3)
    box((0.4, 2.4, 0.72), (4.6, 0.8, 0.06), '#e8e2d2')
    box((0.4, 2.02, 0.5), (4.6, 0.04, 0.42), '#e8e2d2')
    for x in (-1.3, -0.15, 1.0, 2.15):
        box((x, 2.95, 0.65), (0.5, 0.5, 0.06), '#4a3a2a')
        box((x, 3.15, 1.0), (0.5, 0.06, 0.7), '#4a3a2a')
        for ox in (-0.2, 0.2):
            for oy in (2.75, 3.15):
                strut((x + ox, oy, 0.3), (x + ox, oy, 0.65), 0.02, STEEL2, verts=4)
        # A microphone, a glass of water and a name card in front of each place.
        strut((x - 0.1, 2.3, 0.75), (x - 0.1, 2.15, 1.05), 0.012, '#2a2a2a', verts=4)
        box((x - 0.1, 2.13, 1.07), (0.06, 0.08, 0.06), '#2a2a2a')
        cyl((x + 0.18, 2.3, 0.82), 0.04, 0.12, '#cfe0e8', verts=8)
        box((x, 2.08, 0.82), (0.32, 0.03, 0.12), '#f2efe4', rot=(-15, 0, 0))
    # The state emblem on the back wall: a hammer and compass in a ring of wheat.
    cyl((0.4, 3.29, 2.4), 0.6, 0.04, '#c9a43a', rot=(90, 0, 0), verts=20)
    cyl((0.4, 3.27, 2.4), 0.48, 0.04, '#d9cfa0', rot=(90, 0, 0), verts=20)
    box((0.4, 3.25, 2.4), (0.4, 0.03, 0.08), '#5a5a5a', rot=(0, 30, 0))
    box((0.4, 3.25, 2.4), (0.08, 0.03, 0.4), '#5a5a5a', rot=(0, 20, 0))
    for side in (-1, 1):
        box((0.4 + side * 0.25, 3.24, 2.25), (0.05, 0.03, 0.35), '#c9a43a', rot=(0, side * 20, 0))
    box((0.4, 3.29, 1.5), (5.0, 0.04, 0.5), '#b3302c')
    # Rows of chairs for the press, an aisle down the middle.
    for row in range(4):
        y = 0.6 - row * 0.85
        for x in (-2.6, -1.95, -1.3, 0.8, 1.45, 2.1, 2.75):
            box((x, y, 0.45), (0.45, 0.45, 0.05), '#4a5a6a')
            box((x, y - 0.22, 0.75), (0.45, 0.05, 0.55), '#4a5a6a')
            for ox in (-0.18, 0.18):
                strut((x + ox, y, 0), (x + ox, y, 0.45), 0.015, STEEL2, verts=4)
            if random.random() < 0.35:
                box((x, y + 0.05, 0.53), (0.25, 0.18, 0.08), random.choice(('#3a3a34', '#5a3a26', '#2a3238')))
    # TV cameras on tripods by the side wall and at the back.
    for cx, cy, ang in ((-3.1, 1.2, -30), (3.3, -1.8, 200), (-2.8, -2.6, 20)):
        for k in range(3):
            a = math.radians(k * 120)
            strut((cx, cy, 1.3), (cx + math.cos(a) * 0.35, cy + math.sin(a) * 0.35, 0), 0.02, '#2a2a2a', verts=4)
        box((cx, cy, 1.45), (0.3, 0.6, 0.35), '#3a3a3a', rot=(0, 0, ang), bevel=0.02)
        cyl((cx + math.cos(math.radians(ang + 90)) * 0.35, cy + math.sin(math.radians(ang + 90)) * 0.35, 1.45), 0.1, 0.2, '#1a1a1a', rot=(90, 0, ang), verts=10)
    # Ceiling lights.
    for x in (-1.5, 2.0):
        strut((x, 1.0, 3.5), (x, 1.0, 3.0), 0.01, '#2a2a2a', verts=4)
        box((x, 1.0, 2.95), (1.2, 0.3, 0.08), '#f2efe4')
    return prop('press_room')


# --- East Berlin streets ----------------------------------------------------------------------

def facade(width, floors, depth=2.2, color=STUCCO, seed=1):
    """An old tenement: rendered facade, cornices, rows of windows, patches of bare brick."""
    random.seed(seed)
    height = floors * 1.45 + 0.6
    box((0, depth / 2, height / 2), (width, depth, height), color)
    box((0, -0.04, height - 0.1), (width + 0.2, 0.16, 0.25), STUCCO3)
    for f in range(1, floors):
        box((0, -0.03, 0.3 + f * 1.45), (width + 0.05, 0.1, 0.08), STUCCO3)
    # Patches where the render has fallen off and the brick shows.
    for i in range(int(width * 1.2)):
        box((random.uniform(-width / 2 + 0.4, width / 2 - 0.4), -0.01, random.uniform(0.8, height - 0.6)), (random.uniform(0.3, 0.8), 0.02, random.uniform(0.2, 0.5)), random.choice(('#9a6a4a', STUCCO2, STUCCO3)))
    return height


def tenement(name, shop=None):
    width, floors = 5.0, 4
    height = facade(width, floors, seed=len(name))
    for f in range(1, floors):
        for k in range(4):
            x = -1.8 + k * 1.2
            window(x, 0, 0.95 + f * 1.45, lit=random.random() < 0.3)
            if f == 1 and k in (1, 2):
                # A small balcony on the first floor.
                box((x, -0.3, 0.45 + f * 1.45), (0.9, 0.55, 0.08), STUCCO3)
                for b in range(5):
                    strut((x - 0.4 + b * 0.2, -0.55, 0.49 + f * 1.45), (x - 0.4 + b * 0.2, -0.55, 0.85 + f * 1.45), 0.012, '#2a2a2a', verts=4)
                strut((x - 0.45, -0.55, 0.85 + f * 1.45), (x + 0.45, -0.55, 0.85 + f * 1.45), 0.015, '#2a2a2a', verts=4)
    # The ground floor: an arched doorway into the courtyard, and a shop.
    box((1.6, -0.02, 0.85), (0.9, 0.05, 1.7), WOOD3)
    cyl((1.6, -0.02, 1.7), 0.45, 0.05, WOOD3, rot=(90, 0, 0), verts=12)
    if shop == 'kaufhalle':
        box((-1.0, -0.03, 0.8), (2.8, 0.05, 1.3), GLASS_LIT)
        for x in (-2.0, -1.0, 0.0):
            box((x, -0.06, 0.8), (0.06, 0.03, 1.3), '#ece6d6')
        box((-1.0, -0.12, 1.75), (3.0, 0.2, 0.35), '#ece6d6')
        for i, x in enumerate((-2.1, -1.65, -1.2, -0.75, -0.3, 0.15)):
            box((x, -0.23, 1.75), (0.3, 0.02, 0.22), '#2f6f9e' if i % 2 else RED)
        # Crates of cabbages and a few apples outside.
        for i in range(2):
            box((-2.1 + i * 0.6, -0.5, 0.15), (0.5, 0.35, 0.3), '#a8946a')
            for j in range(3):
                ico((-2.25 + i * 0.6 + j * 0.15, -0.5, 0.36), 0.08, '#7aa04a' if i else '#c8402c', subdiv=1)
    elif shop == 'kneipe':
        for x in (-1.6, -0.4):
            window(x, 0, 0.85, w=0.8, h=0.9, lit=True)
        box((-1.0, -0.15, 1.65), (2.4, 0.06, 0.3), '#3a2a1a')
        for i in range(7):
            box((-1.9 + i * 0.3, -0.19, 1.65), (0.18, 0.02, 0.18), '#e8d27a')
        cyl((-2.3, -0.4, 1.9), 0.18, 0.05, '#c9a43a', rot=(90, 0, 0), verts=12)
        strut((-2.3, -0.02, 1.9), (-2.3, -0.4, 1.9), 0.02, '#2a2a2a', verts=4)
    else:
        for x in (-1.6, -0.4):
            window(x, 0, 0.95)
    # Chimneys and a TV aerial on the roof.
    for x in (-1.5, 0.8):
        box((x, 1.2, height + 0.3), (0.35, 0.35, 0.6), '#8a5a3a')
    strut((0.2, 0.8, height), (0.2, 0.8, height + 0.9), 0.015, '#4a4a4a', verts=4)
    for k in range(3):
        strut((-0.15, 0.8, height + 0.5 + k * 0.15), (0.55, 0.8, height + 0.5 + k * 0.15), 0.01, '#4a4a4a', verts=4)
    return prop(name)


def plattenbau():
    """A prefab concrete panel block, the kind the agency worked in."""
    width, floors = 6.0, 6
    height = floors * 1.15
    box((0, 1.2, height / 2), (width, 2.4, height), '#d6d2c6')
    for f in range(floors):
        box((0, -0.01, f * 1.15 + 0.02), (width, 0.03, 0.04), '#a8a49a')
        for k in range(6):
            x = -2.5 + k * 1.0
            box((x, -0.01, f * 1.15 + 0.6), (0.02, 0.03, 1.15), '#b8b4aa')
            if f > 0:
                window(x + 0.0, 0, f * 1.15 + 0.6, w=0.6, h=0.6, lit=random.random() < 0.4, frame='#f2efe4')
    # The glass entrance and the agency's sign.
    box((0, -0.05, 0.55), (2.4, 0.05, 1.1), GLASS_LIT)
    box((0, -0.25, 1.2), (2.8, 0.5, 0.08), '#a8a49a')
    box((0, -0.5, 1.45), (1.6, 0.05, 0.35), '#2f4f7e')
    for i in range(3):
        box((-0.4 + i * 0.4, -0.53, 1.45), (0.22, 0.02, 0.22), '#f2efe4')
    return prop('plattenbau')


def gethsemane():
    """The Gethsemane Church's red-brick tower and porch, candles on the steps."""
    random.seed(9)
    box((0, 0.6, 2.6), (1.6, 1.6, 5.2), '#a8503a')
    for z in range(1, 10):
        box((0, -0.21, z * 0.5), (1.62, 0.02, 0.03), '#8a3a2a')
    box((0, 0.6, 5.3), (1.8, 1.8, 0.2), '#7a3a2a')
    cyl((0, 0.6, 6.5), 1.2, 2.2, '#4f7a6a', rot=(0, 0, 45), verts=4, radius2=0.03)
    cyl((0, 0.6, 7.75), 0.04, 0.4, '#c9a43a', verts=4)
    box((0, 0.6, 7.85), (0.25, 0.04, 0.05), '#c9a43a')
    # A pointed arch doorway, a round window, the porch steps.
    box((0, -0.22, 1.0), (0.8, 0.05, 1.6), WOOD3)
    cyl((0, -0.22, 1.8), 0.4, 0.05, WOOD3, rot=(90, 0, 0), verts=3)
    cyl((0, -0.22, 3.4), 0.35, 0.04, '#e8c25a', rot=(90, 0, 0), verts=12)
    for k in range(3):
        box((0, -0.45 - k * 0.25, 0.1 + (2 - k) * 0.12), (2.0, 0.25, 0.12 + (2 - k) * 0.24), '#9c9488')
    # Dozens of candles burning on the steps.
    for i in range(26):
        x = random.uniform(-0.9, 0.9)
        k = random.randint(0, 2)
        z = 0.22 + (2 - k) * 0.24
        cyl((x, -0.45 - k * 0.25, z + 0.06), 0.025, 0.12, '#f2efe4', verts=6)
        ico((x, -0.45 - k * 0.25, z + 0.15), 0.025, '#ffcf5a', subdiv=1)
    box((1.4, -0.3, 0.55), (0.04, 0.6, 1.1), '#2a2a2a')
    box((1.4, -0.32, 0.9), (0.03, 1.4, 0.45), '#f2efe4')
    for i in range(4):
        box((1.38, -0.75 + i * 0.3, 0.9), (0.02, 0.2, 0.12), '#2f4f7e')
    return prop('gethsemane')


def car(name, color, length=2.4, wartburg=False):
    """A Trabant (or a longer Wartburg): two-tone body, round lights, chrome bumpers."""
    w = 1.05
    box((0, 0, 0.42), (w, length, 0.45), color, bevel=0.06)
    roof_len = length * (0.45 if not wartburg else 0.5)
    box((0, length * 0.04, 0.82), (w * 0.9, roof_len, 0.36), color, bevel=0.06)
    box((0, length * 0.04, 1.01), (w * 0.88, roof_len * 0.95, 0.04), '#f2efe4')
    for side in (-1, 1):
        box((side * w * 0.452, length * 0.04, 0.82), (0.02, roof_len * 0.85, 0.26), '#3a4a5a')
    box((0, length * 0.04 - roof_len / 2 - 0.01, 0.82), (w * 0.8, 0.02, 0.26), '#3a4a5a', rot=(-25, 0, 0))
    for side in (-1, 1):
        cyl((side * 0.32, -length / 2 - 0.01, 0.48), 0.09, 0.04, '#f2e6b4', rot=(90, 0, 0), verts=10)
        box((side * 0.32, length / 2 + 0.01, 0.48), (0.18, 0.04, 0.1), RED)
    for y in (-length / 2 - 0.03, length / 2 + 0.03):
        box((0, y, 0.28), (w * 0.95, 0.05, 0.07), '#c9c6bd')
    for side in (-1, 1):
        for y in (-length * 0.32, length * 0.32):
            cyl((side * w * 0.47, y, 0.2), 0.2, 0.14, '#1f1f1f', rot=(0, 90, 0), verts=10)
            cyl((side * w * 0.53, y, 0.2), 0.1, 0.02, '#c9c6bd', rot=(0, 90, 0), verts=8)
    return prop(name)


def street_lamp():
    strut((0, 0, 0), (0, 0, 3.2), 0.05, '#4a5a5a', verts=6)
    strut((0, 0, 3.2), (0, -0.6, 3.35), 0.04, '#4a5a5a', verts=6)
    box((0, -0.7, 3.3), (0.25, 0.45, 0.1), '#4a5a5a')
    box((0, -0.7, 3.24), (0.2, 0.38, 0.03), '#ffe2a0')
    return prop('street_lamp')


def traffic_light():
    strut((0, 0, 0), (0, 0, 1.9), 0.04, '#3a3a3a', verts=6)
    box((0, 0, 2.15), (0.3, 0.2, 0.55), '#2a2a2a', bevel=0.02)
    box((0, -0.11, 2.3), (0.2, 0.02, 0.2), '#3a1a1a')
    box((0, -0.11, 2.02), (0.2, 0.02, 0.2), '#5aff7a')
    # The little green man with his hat, striding.
    box((0, -0.125, 2.04), (0.05, 0.01, 0.08), '#1a3a1a')
    box((0, -0.125, 2.1), (0.08, 0.01, 0.02), '#1a3a1a')
    box((-0.02, -0.125, 1.98), (0.02, 0.01, 0.06), '#1a3a1a', rot=(0, 20, 0))
    box((0.02, -0.125, 1.98), (0.02, 0.01, 0.06), '#1a3a1a', rot=(0, -20, 0))
    return prop('traffic_light')


def kiosk():
    box((0, 0, 0.9), (1.4, 1.1, 1.8), '#e8e2d2')
    box((0, 0, 1.9), (1.7, 1.4, 0.15), '#2f6f9e')
    box((0, -0.56, 1.0), (1.1, 0.03, 0.55), GLASS_LIT)
    box((0, -0.62, 0.7), (1.2, 0.2, 0.05), '#a8946a')
    for i in range(4):
        box((-0.45 + i * 0.3, -0.6, 0.76), (0.25, 0.18, 0.04), random.choice(('#f2efe4', '#e8d8c8')), rot=(0, 0, random.uniform(-10, 10)))
        box((-0.45 + i * 0.3, -0.6, 0.79), (0.18, 0.05, 0.02), RED)
    box((0, -0.72, 2.12), (1.2, 0.04, 0.25), '#f2efe4')
    for i in range(6):
        box((-0.5 + i * 0.2, -0.75, 2.12), (0.12, 0.02, 0.14), '#2f6f9e')
    return prop('kiosk')


def tv_tower():
    """The Fernsehturm at Alexanderplatz, for the horizon."""
    lathe([(0.9, 0), (0.7, 1.5), (0.45, 3), (0.32, 8.5), (0.3, 10.5)], '#d6d2c6', segments=12)
    ico((0, 0, 11.6), 1.2, '#b8bcc0', subdiv=2)
    cyl((0, 0, 11.6), 1.22, 0.3, '#4a5a6a', verts=16)
    lathe([(0.25, 12.6), (0.18, 13.4), (0.12, 14.0)], '#d6d2c6', segments=8)
    strut((0, 0, 14.0), (0, 0, 16.0), 0.06, '#d8d0c0', verts=6)
    strut((0, 0, 15.0), (0, 0, 16.0), 0.07, RED, verts=6)
    return prop('tv_tower')


# --- The border ---------------------------------------------------------------------------

def wall_run(name, west_paint=False, segments=4):
    """L-shaped concrete segments with a pipe along the top. The -Y face is the
    one the camera sees; on the west side it is painted."""
    random.seed(21 if west_paint else 13)
    seg_w = 0.85
    total = seg_w * segments
    for i in range(segments):
        x = -total / 2 + seg_w * (i + 0.5)
        box((x, 0, 1.25), (seg_w - 0.02, 0.18, 2.5), CONCRETE if i % 2 else '#d2cfc6')
        box((x, 0.5, 0.06), (seg_w - 0.02, 1.0, 0.12), CONCRETE2)
        if west_paint:
            for k in range(4):
                box((x + random.uniform(-0.25, 0.25), -0.1, random.uniform(0.3, 2.2)), (random.uniform(0.2, 0.6), 0.02, random.uniform(0.2, 0.7)), random.choice(('#e03a3a', '#f2c14e', '#3a7ae0', '#5ac85a', '#e07ad0', '#1a1a1a', '#ff8a2a')))
    cyl((0, 0, 2.6), 0.2, total, '#d6d2c6', rot=(0, 90, 0), verts=10)
    return prop(name)


def wall_flat():
    """The thick, flat-topped wall in front of the Brandenburg Gate."""
    random.seed(4)
    box((0, 0, 0.75), (5.0, 1.4, 1.5), '#d6d2c6')
    box((0, 0, 1.52), (5.1, 1.5, 0.05), '#c9c6bd')
    for k in range(6):
        box((-2.5 + k * 0.85 + 0.42, -0.71, 0.75), (0.02, 0.02, 1.5), '#b3afa5')
    # Chalk writing and sparklers' scorch marks on its face.
    for i in range(7):
        box((random.uniform(-2.2, 2.2), -0.71, random.uniform(0.4, 1.3)), (random.uniform(0.3, 0.7), 0.01, 0.08), random.choice(('#f2efe4', '#e03a3a', '#3a7ae0', '#2a2a2a')))
    # Wooden crates stacked as steps at one end.
    for k, (dx, h) in enumerate(((3.0, 0.5), (2.65, 1.0))):
        box((dx, 0, h / 2), (0.45, 0.8, h), '#a8946a', bevel=0.02)
    return prop('wall_flat')


def watchtower():
    box((0, 0, 2.2), (0.9, 0.9, 4.4), CONCRETE)
    for z in (1.1, 2.2, 3.3):
        box((0, -0.46, z), (0.92, 0.02, 0.04), CONCRETE3)
    box((0, 0, 4.9), (1.5, 1.5, 1.0), CONCRETE2)
    for side in range(4):
        a = side * math.pi / 2
        box((math.sin(a) * 0.76, -math.cos(a) * 0.76, 4.95), (1.3 if side % 2 == 0 else 0.02, 0.02 if side % 2 == 0 else 1.3, 0.45), '#3a4a5a')
    box((0, 0, 5.45), (1.7, 1.7, 0.1), CONCRETE3)
    box((0.4, 0.4, 5.62), (0.3, 0.3, 0.25), '#3a3a3a')
    cyl((0.4, 0.25, 5.65), 0.12, 0.1, '#ffe9a0', rot=(90, 0, 0), verts=10)
    box((0, -0.46, 0.6), (0.5, 0.03, 1.2), '#4a4e54')
    return prop('watchtower')


def control_booth():
    box((0, 0, 0.05), (2.2, 1.6, 0.1), CONCRETE2)
    box((0, 0.2, 1.1), (2.0, 1.2, 2.0), '#e8e2d2')
    for x in (-0.5, 0.5):
        box((x, -0.42, 1.35), (0.7, 0.05, 0.7), GLASS_LIT)
    box((0.95, -0.42, 0.85), (0.02, 0.05, 1.7), '#4a5a5a')
    box((0, 0.2, 2.15), (2.4, 1.6, 0.12), '#4a5a5a')
    box((0, -0.62, 2.0), (1.8, 0.05, 0.25), '#f2efe4')
    for i in range(8):
        box((-0.7 + i * 0.2, -0.65, 2.0), (0.12, 0.02, 0.12), '#2a2a2a')
    # A counter window for passports and a telephone line.
    box((-0.95, -0.2, 1.1), (0.05, 0.6, 0.5), GLASS_LIT)
    strut((0.7, 0.8, 2.2), (0.7, 0.8, 3.0), 0.02, '#4a4a4a', verts=4)
    return prop('control_booth')


def boom_barrier():
    box((0, 0, 0.5), (0.3, 0.3, 1.0), '#e8e2d2')
    box((0, 0, 0.55), (0.32, 0.32, 0.12), RED)
    for i in range(8):
        box((0.2 + i * 0.4 + 0.2, 0, 0.95), (0.4, 0.1, 0.1), RED if i % 2 == 0 else '#f2efe4')
    box((3.6, 0, 0.45), (0.1, 0.1, 0.9), '#e8e2d2')
    return prop('boom_barrier')


def floodlight():
    strut((0, 0, 0), (0, 0, 4.5), 0.06, '#4a4e54', verts=6)
    box((0, 0, 4.55), (1.0, 0.12, 0.08), '#4a4e54')
    for x in (-0.35, 0.0, 0.35):
        box((x, -0.12, 4.45), (0.25, 0.2, 0.2), '#3a3a3a', rot=(-25, 0, 0))
        box((x, -0.23, 4.42), (0.2, 0.02, 0.15), '#fff2c0', rot=(-25, 0, 0))
    return prop('floodlight')


def bose_bridge():
    """The Bösebrücke: a deck over the railway carried by two steel arches."""
    length, width = 9.0, 3.0
    box((0, 0, 0.25), (width, length, 0.2), '#5e6066')
    box((0, 0, 0.36), (width - 0.6, length, 0.02), '#4a4c50')
    for side in (-1, 1):
        x = side * (width / 2 - 0.1)
        pts = []
        for k in range(13):
            t = k / 12
            pts.append((x, -length / 2 + t * length, 0.3 + math.sin(t * math.pi) * 2.6))
        for a, b in zip(pts, pts[1:]):
            strut(a, b, 0.09, '#5a7a6a', verts=6)
        for k in range(1, 12):
            px, py, pz = pts[k]
            strut((x, py, 0.35), (x, py, pz), 0.035, '#5a7a6a', verts=4)
        strut((x, -length / 2, 0.75), (x, length / 2, 0.75), 0.03, '#3a4a42', verts=4)
    for k in range(3, 10, 3):
        t = k / 12
        z = 0.3 + math.sin(t * math.pi) * 2.6
        strut((-width / 2 + 0.1, -length / 2 + t * length, z), (width / 2 - 0.1, -length / 2 + t * length, z), 0.05, '#5a7a6a', verts=4)
    return prop('bose_bridge')


# --- The Brandenburg Gate ----------------------------------------------------------------------

def brandenburg_gate():
    SAND, SAND2, SAND3 = '#d9ccb0', '#c9bb9c', '#a8987a'
    width = 9.0
    box((0, 0, 0.1), (width + 0.4, 2.2, 0.2), SAND3)
    # Twelve Doric columns, six on each face, framing five passages.
    for x in (-3.9, -2.4, -0.8, 0.8, 2.4, 3.9):
        for y in (-0.8, 0.8):
            cyl((x, y, 2.1), 0.32, 3.8, SAND, verts=10)
            box((x, y, 4.05), (0.8, 0.8, 0.12), SAND2)
    # Side walls between the outer columns and the guard houses.
    for x in (-4.4, 4.4):
        box((x, 0, 2.0), (0.4, 1.8, 3.8), SAND2)
    # Entablature, attic with relief panel, then the Quadriga on top.
    box((0, 0, 4.35), (width + 0.4, 2.0, 0.5), SAND)
    for k in range(18):
        box((-4.4 + k * 0.52, -1.01, 4.35), (0.18, 0.02, 0.35), SAND3)
    box((0, 0, 5.0), (width - 1.0, 1.6, 0.8), SAND2)
    box((0, -0.81, 5.0), (4.5, 0.02, 0.5), SAND3)
    box((0, 0, 5.45), (3.0, 1.4, 0.15), SAND3)
    # The Quadriga: a chariot, four horses, Victoria with her standard.
    COPPER = '#3f7a62'
    box((0, 0.2, 5.85), (0.7, 0.5, 0.5), COPPER)
    for i, x in enumerate((-0.75, -0.25, 0.25, 0.75)):
        box((x, -0.35, 5.95), (0.22, 0.9, 0.35), COPPER)
        box((x, -0.85, 6.2), (0.16, 0.3, 0.35), COPPER, rot=(30, 0, 0))
        for lx in (-0.06, 0.06):
            for ly in (-0.7, 0.0):
                strut((x + lx, ly, 5.53), (x + lx, ly, 5.85), 0.03, COPPER, verts=4)
    box((0, 0.25, 6.4), (0.22, 0.2, 0.75), COPPER)
    ico((0, 0.25, 6.9), 0.12, COPPER, subdiv=1)
    for side in (-1, 1):
        box((side * 0.3, 0.3, 6.65), (0.4, 0.05, 0.25), COPPER, rot=(0, side * 30, 0))
    strut((0.2, 0.15, 6.4), (0.2, 0.15, 7.6), 0.025, COPPER, verts=4)
    cyl((0.2, 0.15, 7.6), 0.14, 0.05, COPPER, rot=(90, 0, 0), verts=10)
    return prop('brandenburg_gate')


BUILDERS = [
    flat_interior, press_room,
    lambda: tenement('tenement_shop', 'kaufhalle'), lambda: tenement('tenement_pub', 'kneipe'), lambda: tenement('tenement'),
    plattenbau, gethsemane,
    lambda: car('trabant', '#7fb3d9'), lambda: car('trabant_cream', '#e2d6b0'), lambda: car('wartburg', '#8e939b', length=2.9, wartburg=True),
    street_lamp, traffic_light, kiosk, tv_tower,
    lambda: wall_run('wall_run'), lambda: wall_run('wall_painted', west_paint=True), wall_flat,
    watchtower, control_booth, boom_barrier, floodlight, bose_bridge, brandenburg_gate,
]
for build in BUILDERS:
    build()
bpy.context.view_layer.update()
export(os.path.join(MODELS, 'berlin-wall.glb'), len(BUILDERS))
