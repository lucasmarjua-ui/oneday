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

// How the player character dresses in each event, plus per-scene variants
// (an astronaut without and with a helmet).
export const OUTFITS = {
  'apollo-11': { h: '#6b4a2e', c: '#f2f1ec', C: '#c4c2bb', t: '#c8382c', p: '#f2f1ec', f: '#8d8f96' },
  giza: { s: '#c98b5a', S: '#a26a40', h: '#16120f', c: '#b9774a', C: '#93573a', t: '#f3ecd8', p: '#b9774a', f: '#9b6b3b' },
};

const VARIANTS = {
  // A gold sun visor over the face, a white helmet over the hair.
  helmet: { h: '#f4f4f1', H: '#cfcfca', s: '#d9a63a', S: '#a8781f', e: '#fff3c4' },
};

const DEFAULT_OUTFIT = { h: '#4a2f1d', c: '#efe8d8', C: '#c8bda4', t: '#3d6fb0', p: '#f2c79b', f: '#7a4a26' };

export function playerPalette(eraId, variant) {
  const outfit = OUTFITS[eraId] || DEFAULT_OUTFIT;
  const base = { k: '#1b1620', e: '#1b1620', ...SKIN, H: shade(outfit.h, 0.75), ...outfit };
  return variant && VARIANTS[variant] ? { ...base, ...VARIANTS[variant] } : base;
}

export function npcPalette(color, eraId, variant) {
  const base = playerPalette(eraId, variant);
  const tinted = { ...base, c: color, C: shade(color, 0.72), t: shade(color, 0.5), p: shade(color, 0.6) };
  // A helmet stays a helmet; otherwise NPCs get darker hair in their own hue.
  return variant === 'helmet' ? tinted : { ...tinted, h: shade(color, 0.35) };
}

/** Skin tones for crowds, so a town is not full of twins. */
export const SKIN_TONES = [
  { s: '#f2c79b', S: '#d39e74' },
  { s: '#c98b5a', S: '#a26a40' },
  { s: '#9b6a45', S: '#7a4f31' },
  { s: '#e0ac7d', S: '#b98557' },
];

export const FRAME_ORDER = Object.keys(POSES);
