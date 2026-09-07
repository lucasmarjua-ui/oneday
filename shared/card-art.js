// Decorative art for the glass option/archetype cards: a per-era, per-card
// background gradient wash, and a small purely-decorative SVG ornament (a
// circular gauge or a dot "connections map", alternating) that varies from
// one card to the next. None of this reads game state -- it exists so a
// row of 2-4 cards doesn't look like 2-4 copies of the same button.

const PALETTES = {
  // amber / terracotta, coherent with the Parthenon-sunset hero photo
  greece: ['#7c3f1d,#d98c4a', '#8a4a12,#e0a458', '#6b3410,#c97b3d', '#96501a,#f0b074'],
  // ochre / fire-orange, coherent with the campfire hero photo
  neanderthal: ['#5c2a0a,#e0791e', '#431407,#c2600f', '#6b330d,#f2924a', '#3d1a05,#d9720f'],
  // cyan / magenta neon, coherent with the cyberpunk skyline hero photo
  'future-city': ['#0e7490,#a21caf', '#1e1b4b,#d946ef', '#164e63,#c026d3', '#083344,#e879f9'],
};

export function getCardGradient(eraId, index) {
  const pairs = PALETTES[eraId] || PALETTES.greece;
  const [from, to] = pairs[index % pairs.length].split(',');
  return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
}

function hashSeed(seed) {
  let h = 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function gaugeSVG(seed) {
  const pct = 25 + (seed % 65); // 25-90%
  const circumference = 100.5;
  const dash = (pct / 100) * circumference;
  return `<svg class="option-ornament" viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" stroke-opacity="0.25" stroke-width="2.5"/>
    <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
      stroke-dasharray="${dash.toFixed(1)} ${circumference}" transform="rotate(-90 20 20)"/>
    <circle cx="20" cy="20" r="3" fill="currentColor"/>
  </svg>`;
}

function connectionsSVG(seed) {
  const points = Array.from({ length: 5 }, (_, i) => {
    const angle = ((seed * 53 + i * 71) % 360) * Math.PI / 180;
    const r = 8 + ((seed + i * 13) % 10);
    return [20 + Math.cos(angle) * r, 20 + Math.sin(angle) * r];
  });
  const lines = points.map((p, i) => {
    const next = points[(i + 1) % points.length];
    return `<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${next[0].toFixed(1)}" y2="${next[1].toFixed(1)}" stroke="currentColor" stroke-opacity="0.35" stroke-width="1"/>`;
  }).join('');
  const dots = points.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2" fill="currentColor"/>`).join('');
  return `<svg class="option-ornament" viewBox="0 0 40 40" aria-hidden="true">${lines}${dots}</svg>`;
}

export function renderCardOrnamentSVG(seed) {
  const h = hashSeed(seed);
  return h % 2 === 0 ? gaugeSVG(h) : connectionsSVG(h);
}
