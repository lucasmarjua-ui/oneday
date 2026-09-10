// The one image-ish surface in the redesign: a thin "horizon band" under the
// play screen's masthead. It is drawn from the era's own accent hue, with a
// slow parallax drift, so every era gets an atmosphere without depending on
// photography. Eras that ship a real background photograph layer it in on
// top at low opacity and luminosity blend, so a photo-backed era and a
// generated one still read as the same component.

const PHOTO_ERAS = new Set(['greece', 'neanderthal', 'future-city']);

export function mountEraBand(host, meta) {
  if (!host || !meta) return;
  host.innerHTML = '';

  if (PHOTO_ERAS.has(meta.id)) {
    const photo = document.createElement('div');
    photo.className = 'era-band-photo';
    photo.style.backgroundImage = `url('./assets/era-bg-${meta.id}.jpg')`;
    host.appendChild(photo);
    return;
  }

  // No photograph for this era: draw a horizon out of the accent hue --
  // a few soft, slowly drifting bands rather than a flat gradient, so the
  // strip has some depth of its own.
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 1200 200');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  // Wider than the strip and offset back, so the slow drift below can never
  // pull an edge into view.
  svg.style.cssText = 'position:absolute;top:0;bottom:0;left:-4%;width:108%;height:100%;';

  const hue = meta.accent;
  const layers = [
    { d: 'M0,150 C220,116 380,168 620,138 C860,108 1020,152 1200,126 L1200,200 L0,200 Z', light: 22, alpha: 0.9, dur: 34 },
    { d: 'M0,168 C260,142 420,186 700,160 C920,140 1060,176 1200,152 L1200,200 L0,200 Z', light: 16, alpha: 0.95, dur: 46 },
  ];
  layers.forEach((layer, index) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', layer.d);
    path.setAttribute('fill', `hsl(${hue} 42% ${layer.light}% / ${layer.alpha})`);
    path.style.animation = `era-band-drift ${layer.dur}s ease-in-out ${index * -6}s infinite alternate`;
    svg.appendChild(path);
  });

  // A low sun/marker disc, placed differently per era via its own hue so no
  // two bands line up identically.
  const disc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  disc.setAttribute('cx', String(180 + (hue % 7) * 120));
  disc.setAttribute('cy', '96');
  disc.setAttribute('r', '34');
  disc.setAttribute('fill', `hsl(${(hue + 30) % 360} 64% 72% / 0.55)`);
  svg.insertBefore(disc, svg.firstChild);

  host.appendChild(svg);

  if (!document.getElementById('era-band-keyframes')) {
    const style = document.createElement('style');
    style.id = 'era-band-keyframes';
    style.textContent = '@keyframes era-band-drift { from { transform: translateX(-2%); } to { transform: translateX(2%); } }';
    document.head.appendChild(style);
  }
}
