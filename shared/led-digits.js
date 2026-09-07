// Renders the digits in an option card's cost/time readout ("1h", "2h · -5")
// as small LED-style glyphs -- each lit segment of a classic 7-segment digit
// drawn as a short row of dots instead of a solid bar, so it reads as a
// dot-matrix display rather than plain numerals. Everything that isn't a
// digit (letters, spaces, punctuation, +/-) stays as ordinary text next to
// the glyphs -- only digits 0-9 have a segment mapping.

const DIGIT_W = 15;
const DIGIT_H = 25;

// Dot positions for each of the 7 segments (a=top, b=upper-right,
// c=lower-right, d=bottom, e=lower-left, f=upper-left, g=middle), 3 dots per
// segment, in a 15x25 box.
const SEGMENT_DOTS = {
  a: [[4, 2], [7.5, 2], [11, 2]],
  b: [[13, 5], [13, 8.5], [13, 12]],
  c: [[13, 14], [13, 17.5], [13, 21]],
  d: [[4, 23], [7.5, 23], [11, 23]],
  e: [[2, 14], [2, 17.5], [2, 21]],
  f: [[2, 5], [2, 8.5], [2, 12]],
  g: [[4, 12.5], [7.5, 12.5], [11, 12.5]],
};

const DIGIT_SEGMENTS = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc',
  '5': 'afgcd', '6': 'afgecd', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
};

function digitGlyphSVG(digit) {
  const segments = DIGIT_SEGMENTS[digit] || '';
  const dots = [...segments].flatMap(seg => SEGMENT_DOTS[seg] || []);
  const circles = dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.5"/>`).join('');
  return `<svg class="led-digit" viewBox="0 0 ${DIGIT_W} ${DIGIT_H}" width="${DIGIT_W}" height="${DIGIT_H}" aria-hidden="true">${circles}</svg>`;
}

export function renderLedText(str) {
  return [...String(str)].map(ch => {
    if (DIGIT_SEGMENTS[ch]) return digitGlyphSVG(ch);
    if (ch === ' ') return '<span class="led-char">&nbsp;</span>';
    return `<span class="led-char">${ch}</span>`;
  }).join('');
}
