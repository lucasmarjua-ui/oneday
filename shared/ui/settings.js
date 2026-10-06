// Player settings, remembered between visits: music, sound effects and how
// fast the dialog types. Storage can be unavailable (private mode), in which
// case the defaults simply apply for this visit.
const KEY = 'oneday.settings';
const DEFAULTS = { music: true, sfx: true, textSpeed: 'normal' };

export const TEXT_SPEEDS = { slow: 34, normal: 18, fast: 7 };

let current = { ...DEFAULTS };
try {
  current = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
} catch {
  // Defaults it is.
}

const listeners = [];

export function getSettings() {
  return { ...current };
}

export function updateSettings(patch) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Not remembered, still applied.
  }
  listeners.forEach(listener => listener(getSettings()));
}

export function onSettingsChange(listener) {
  listeners.push(listener);
}

export function typingDelay() {
  return TEXT_SPEEDS[current.textSpeed] ?? TEXT_SPEEDS.normal;
}
