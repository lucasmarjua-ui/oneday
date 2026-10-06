// Pixel-art characters, built from text grids so there is no image pipeline:
// a 16x24 body is assembled from a head, a torso, an arm pose and a leg pose,
// then coloured by a palette. Each era dresses the same body differently, and
// NPCs reuse it tinted in their own colour. Everything here is pure data, so
// it is unit-tested without a browser; the 3D stage paints it onto canvases.

export const SPRITE_W = 16;
export const SPRITE_H = 24;

const HEAD = [
  '.....kkkkkk.....',
  '....khhhhhhk....',
  '...khhhhhhhhk...',
  '..khhhhhhhhhhk..',
  '..khhhhssssshk..',
  '..khhhsssssesk..',
  '..khhssssssesk..',
  '...khsssssssk...',
  '....kSsssssk....',
  '.....kkSSkk.....',
];

const TORSO = [
  '....kcccccck....',
  '...kcccccccck...',
  '...kcCccccccck..',
  '...kcCcccccck...',
  '...kcCcccccck...',
  '...kttttttttk...',
  '...kcCcccccck...',
];

const LEGS = {
  stand: [
    '....kppppppk....',
    '....kppkkppk....',
    '....kppk.kppk...',
    '....kppk.kppk...',
    '....kppk.kppk...',
    '...kfffk.kfffk..',
    '...kkkk..kkkk...',
  ],
  walkA: [
    '....kppppppk....',
    '...kppk.kppk....',
    '..kppk...kppk...',
    '..kppk....kppk..',
    '.kppk.....kppk..',
    'kfffk.....kfffk.',
    'kkkk.......kkkk.',
  ],
  walkB: [
    '....kppppppk....',
    '....kppkkppk....',
    '.....kpppk......',
    '.....kpppk......',
    '.....kpppk......',
    '....kffffk......',
    '....kkkkk.......',
  ],
  crouch: [
    '...kppppppppk...',
    '..kpppk.kpppk...',
    '..kfffk.kfffk...',
    '..kkkk...kkkk...',
    '................',
    '................',
    '................',
  ],
  sit: [
    '...kpppppppppk..',
    '...kppppppppppk.',
    '....kkkkkkkkfffk',
    '............kkkk',
    '................',
    '................',
    '................',
  ],
};

// Arms are painted over the torso: [x, y, key] with y counted from the top.
const ARMS = {
  down: [[9, 11, 'C'], [9, 12, 'C'], [9, 13, 'C'], [9, 14, 'C'], [9, 15, 's'], [10, 11, 'k'], [10, 12, 'k'], [10, 13, 'k'], [10, 14, 'k'], [10, 15, 'k'], [9, 16, 'k']],
  forward: [[8, 12, 'c'], [9, 12, 'c'], [10, 12, 'c'], [11, 12, 'c'], [12, 12, 'c'], [13, 12, 's'], [14, 12, 's'], [8, 11, 'k'], [9, 11, 'k'], [10, 11, 'k'], [11, 11, 'k'], [12, 11, 'k'], [13, 11, 'k'], [14, 11, 'k'], [9, 13, 'k'], [10, 13, 'k'], [11, 13, 'k'], [12, 13, 'k'], [13, 13, 'k'], [14, 13, 'k'], [15, 12, 'k']],
  up: [[11, 10, 'c'], [12, 10, 'c'], [13, 9, 'c'], [13, 8, 'c'], [14, 7, 'c'], [14, 6, 's'], [14, 5, 's'], [12, 9, 'k'], [12, 8, 'k'], [13, 7, 'k'], [13, 6, 'k'], [13, 5, 'k'], [14, 4, 'k'], [15, 5, 'k'], [15, 6, 'k'], [15, 7, 'k'], [14, 8, 'k'], [14, 9, 'k'], [13, 10, 'k']],
};

// Pose name -> how to assemble it. `drop` lowers head and torso (crouching, sitting).
export const POSES = {
  stand: { legs: 'stand', arm: 'down', drop: 0 },
  walkA: { legs: 'walkA', arm: 'down', drop: 0 },
  walkB: { legs: 'walkB', arm: 'down', drop: 0 },
  reach: { legs: 'stand', arm: 'forward', drop: 0 },
  raise: { legs: 'stand', arm: 'up', drop: 0 },
  crouch: { legs: 'crouch', arm: 'forward', drop: 4 },
  sit: { legs: 'sit', arm: 'down', drop: 4 },
};

export function buildFrame(poseName) {
  const pose = POSES[poseName];
  if (!pose) throw new Error(`Unknown pose: ${poseName}`);
  const rows = Array.from({ length: SPRITE_H }, () => Array(SPRITE_W).fill('.'));
  const paint = (lines, top) => lines.forEach((line, y) => {
    [...line].forEach((ch, x) => {
      const row = rows[top + y];
      if (row && ch !== '.') row[x] = ch;
    });
  });
  const legs = LEGS[pose.legs];
  // Legs stand on the ground line; the body stacks on top of them.
  const legTop = SPRITE_H - legs.filter(line => /[^.]/.test(line)).length;
  const bodyTop = pose.drop;
  paint(HEAD, bodyTop);
  paint(TORSO, bodyTop + HEAD.length);
  paint(legs, legTop);
  ARMS[pose.arm].forEach(([x, y, key]) => {
    const row = rows[y + bodyTop];
    if (row && x < SPRITE_W) row[x] = key;
  });
  return rows.map(row => row.join(''));
}

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) * amount);
  const g = clamp(((n >> 8) & 255) * amount);
  const b = clamp((n & 255) * amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const SKIN = { s: '#f2c79b', S: '#d39e74' };

// How the player character dresses in each era.
export const OUTFITS = {
  greece: { h: '#4a2f1d', c: '#efe8d8', C: '#c8bda4', t: '#3d6fb0', p: '#f2c79b', f: '#7a4a26' },
  cordoba: { h: '#f3ede0', c: '#2f8a62', C: '#21634a', t: '#d9a840', p: '#3b3a52', f: '#8a5a2b' },
  edo: { h: '#15131a', c: '#2e3f7c', C: '#1f2c5a', t: '#c0392b', p: '#2e3f7c', f: '#f1f1f1' },
  neanderthal: { h: '#5b3b22', c: '#8f6239', C: '#6c4626', t: '#4a3018', p: '#e2b58b', f: '#6c4626' },
  'future-city': { h: '#ff3fa4', c: '#20222f', C: '#14151f', t: '#2de2e6', p: '#2b2d3d', f: '#f4f4f4' },
  mars: { h: '#eeeeee', c: '#e2672f', C: '#b44c1f', t: '#f4f4f4', p: '#e2672f', f: '#8a8f99' },
};

export function playerPalette(eraId) {
  const outfit = OUTFITS[eraId] || OUTFITS.greece;
  return { k: '#1b1620', e: '#1b1620', ...SKIN, H: shade(outfit.h, 0.75), ...outfit };
}

// NPCs share the body but wear their own portrait colour, so a recurring face
// is recognisable on stage the same way it is in the dialog box.
export function npcPalette(color, eraId) {
  const base = playerPalette(eraId);
  return { ...base, c: color, C: shade(color, 0.72), t: shade(color, 0.5), h: shade(color, 0.35), p: shade(color, 0.6) };
}

export const FRAME_ORDER = Object.keys(POSES);
