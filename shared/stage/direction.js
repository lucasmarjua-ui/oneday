// Stage direction: turns what happens in the rules into what the character
// does on stage. Pure functions only, so the mapping is covered by tests and
// the 3D layer just plays back whatever these return.

// Each trait has a body language. The option's strongest trait decides it.
export const TRAIT_ACTIONS = {
  bold: 'dash',
  prudent: 'rest',
  generous: 'give',
  cunning: 'sneak',
  diligent: 'work',
  curious: 'inspect',
};

export function actionForOption(option) {
  const traits = Object.entries(option?.traits || {}).filter(([, value]) => value > 0);
  if (!traits.length) return 'wait';
  traits.sort((a, b) => b[1] - a[1]);
  return TRAIT_ACTIONS[traits[0][0]] || 'wait';
}

// A real gamble gets a big reaction; a certain option just a nod.
export function reactionForOutcome({ hasChance, success }) {
  if (!hasChance) return 'nod';
  return success ? 'cheer' : 'stumble';
}

// Floating "+5 Energy" style labels for the resource changes of a choice.
export function deltaPopups(combined = {}, resources = {}, localize = value => value?.en ?? '') {
  return Object.entries(combined)
    .filter(([key, value]) => value !== 0 && resources[key])
    .map(([key, value]) => ({
      key,
      text: `${value > 0 ? '+' : ''}${value} ${localize(resources[key].label)}`,
      good: value > 0,
    }));
}

// --- Day cycle -------------------------------------------------------------

// Sky keyframes across the day, as [fraction, sky top, horizon, sun strength].
const EARTH_SKY = [
  [0.0, '#f6b878', '#ffd9a8', 0.55],
  [0.18, '#8fc3ea', '#d8ecf7', 0.95],
  [0.5, '#6fb0e6', '#cfe7f6', 1.0],
  [0.72, '#f0a35e', '#ffd08a', 0.75],
  [0.86, '#6b4f8c', '#e58a6a', 0.35],
  [1.0, '#141a3a', '#2c2f5c', 0.08],
];

const SKIES = {
  // Out in space the sky is black all day and the Sun never sets.
  'apollo-11': [
    [0.0, '#04050c', '#0d1024', 1.0],
    [1.0, '#04050c', '#0d1024', 1.0],
  ],
  // Overcast Normandy: dark at 03:00, a grey dawn, a long June evening.
  'd-day': [
    [0.0, '#1b2233', '#3a4256', 0.12],
    [0.15, '#7d8ca3', '#bcc4cc', 0.7],
    [0.45, '#9fb0c4', '#d7dde2', 0.9],
    [0.75, '#b9a08a', '#e6c9a4', 0.65],
    [0.9, '#5a4f6e', '#c08a72', 0.3],
    [1.0, '#1a1f38', '#2f3352', 0.08],
  ],
  giza: [
    [0.0, '#f2a86a', '#ffd9a0', 0.55],
    [0.2, '#86bde6', '#f3e3c3', 0.95],
    [0.5, '#5fa8e6', '#f0dcb4', 1.0],
    [0.75, '#f0995a', '#ffc77a', 0.7],
    [0.9, '#5b3f7a', '#e07c5a', 0.3],
    [1.0, '#151a38', '#2b2b55', 0.06],
  ],
};

/** Events played out in space: no sunset, no night. */
export function isSpaceEvent(eraId) {
  return eraId === 'apollo-11';
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

export function mixHex(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(ca.map((v, i) => v + (cb[i] - v) * t));
}

/** Sky colours and light strength at a point in the day (0 = start, 1 = end). */
export function skyAt(eraId, fraction) {
  const keys = SKIES[eraId] || EARTH_SKY;
  const f = Math.min(1, Math.max(0, fraction));
  let i = 0;
  while (i < keys.length - 2 && f > keys[i + 1][0]) i++;
  const [f0, top0, hor0, sun0] = keys[i];
  const [f1, top1, hor1, sun1] = keys[i + 1];
  const t = f1 === f0 ? 0 : (f - f0) / (f1 - f0);
  const sun = sun0 + (sun1 - sun0) * t;
  return {
    top: mixHex(top0, top1, t),
    horizon: mixHex(hor0, hor1, t),
    sun,
    // How "night" it is: lamps and windows switch on as the sun fades.
    night: Math.min(1, Math.max(0, (0.45 - sun) / 0.37)),
    // The sun travels from east to west over the day.
    sunAngle: Math.PI * (0.08 + 0.84 * f),
  };
}
