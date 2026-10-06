// Pixel-art interface icons, drawn as crisp SVG from text grids: one rect per
// pixel, `shape-rendering: crispEdges`, so they stay sharp at any size.
const ICONS = {
  energy: { rows: ['...kkk', '..kyyk', '.kyyk.', 'kyyyyk', 'kkyyk.', '.kyk..', 'kyk...', 'kk....'], pal: { k: '#3a2a05', y: '#ffd84a' } },
  health: { rows: ['.kk.kk.', 'kRRkRRk', 'kRwRRRk', 'kRRRRRk', '.kRRRk.', '..kRk..', '...k...'], pal: { k: '#3a0f1c', R: '#ff4d6d', w: '#ffd0da' } },
  hunger: { rows: ['..kkkk..', '.kbbbbk.', 'kbwbbbbk', 'kbbbbbbk', 'kBBBBBBk', '.kkkkkk.'], pal: { k: '#3a2210', b: '#e0a35a', B: '#b5743a', w: '#ffe2b0' } },
  thirst: { rows: ['...k...', '..kbk..', '.kbbbk.', 'kbwbbbk', 'kbbbbbk', 'kbbbbbk', '.kkkkk.'], pal: { k: '#0b2440', b: '#4fb3ff', w: '#d6efff' } },
  currency: { rows: ['.kkkk.', 'kyyyyk', 'kywyyk', 'kyyyyk', 'kyyYyk', '.kkkk.'], pal: { k: '#3a2a05', y: '#ffcf3f', Y: '#c99320', w: '#fff3b8' } },
  reputation: { rows: ['...k...', '..kyk..', 'kkkykkk', 'kyyyyyk', '.kyyyk.', 'kyykyyk', 'kk...kk'], pal: { k: '#3a2a05', y: '#ffe07a' } },
  survival: { rows: ['...k..', '..kok.', '.koyok', 'koyyok', 'koyyok', '.kook.', '..kk..'], pal: { k: '#3a1405', o: '#ff7a1a', y: '#ffe28a' } },
  oxygen: { rows: ['.kkkk.', 'kbbbbk', 'kbwbbk', 'kbbbbk', 'kbbbbk', '.kkkk.'], pal: { k: '#0b2440', b: '#7fe3ff', w: '#ffffff' } },
  cursor: { rows: ['k....', 'kk...', 'kyk..', 'kyyk.', 'kyyyk', 'kyyk.', 'kyk..', 'kk...', 'k....'], pal: { k: '#14111c', y: 'currentColor' } },
  menu: { rows: ['wwwwwww', '.......', 'wwwwwww', '.......', 'wwwwwww'], pal: { w: 'currentColor' } },
  sound: { rows: ['...w...', '..ww.w.', 'www.w.w', 'www.w.w', 'www.w.w', '..ww.w.', '...w...'], pal: { w: 'currentColor' } },
  music: { rows: ['..wwww', '..w..w', '..w..w', '..w..w', 'ww.ww.', 'ww.ww.'], pal: { w: 'currentColor' } },
  back: { rows: ['..w....', '.ww....', 'wwwwwww', '.ww....', '..w....'], pal: { w: 'currentColor' } },
  play: { rows: ['w....', 'www..', 'wwwww', 'www..', 'w....'], pal: { w: 'currentColor' } },
  star: { rows: ['..w..', '.www.', 'wwwww', '.www.', 'w...w'], pal: { w: 'currentColor' } },
  next: { rows: ['wwwww', '.www.', '..w..'], pal: { w: 'currentColor' } },
};

const RESOURCE_ICON = { energy: 'energy', health: 'health', hunger: 'hunger', thirst: 'thirst', currency: 'currency', reputation: 'reputation', survival: 'survival', oxygen: 'oxygen' };

/** An inline SVG for `name`, `scale` CSS pixels per icon pixel. */
export function icon(name, scale = 2, className = 'px-icon') {
  const def = ICONS[name] || ICONS.reputation;
  const width = Math.max(...def.rows.map(row => row.length));
  const rects = [];
  def.rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const fill = def.pal[ch];
      if (ch !== '.' && fill) rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`);
    });
  });
  return `<svg class="${className}" viewBox="0 0 ${width} ${def.rows.length}" width="${width * scale}" height="${def.rows.length * scale}" shape-rendering="crispEdges" aria-hidden="true">${rects.join('')}</svg>`;
}

export function resourceIcon(key, scale = 2) {
  return icon(RESOURCE_ICON[key] || 'reputation', scale);
}

export const ICON_NAMES = Object.keys(ICONS);
