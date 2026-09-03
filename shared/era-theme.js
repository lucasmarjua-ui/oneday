// Applies an era's visual identity (era.theme) as CSS custom properties on
// <html>, the same "engine reads generic tokens, era supplies the values"
// pattern already used for resources and archetypes. No per-era branching
// here -- every era.theme uses the same token shape.
const TOKEN_PATHS = {
  '--bg': 'colors.bg',
  '--bg-panel': 'colors.panel',
  '--accent': 'colors.accent',
  '--accent-dark': 'colors.accentDark',
  '--accent-secondary': 'colors.accentSecondary',
  '--accent-ink': 'colors.accentInk',
  '--ink': 'colors.ink',
  '--ink-soft': 'colors.inkSoft',
  '--border': 'colors.border',
  '--font-heading': 'fonts.heading',
  '--font-body': 'fonts.body',
  '--bg-texture-image': 'textureImage',
  '--bg-texture-size': 'textureSize',
};

function readPath(theme, path) {
  return path.split('.').reduce((value, key) => value?.[key], theme);
}

export function applyEraTheme(era) {
  const root = document.documentElement.style;
  Object.entries(TOKEN_PATHS).forEach(([cssVar, path]) => {
    const value = readPath(era.theme, path);
    if (value) root.setProperty(cssVar, value);
    else root.removeProperty(cssVar);
  });
}

export function clearEraTheme() {
  const root = document.documentElement.style;
  Object.keys(TOKEN_PATHS).forEach(cssVar => root.removeProperty(cssVar));
}
