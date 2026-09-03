// Pure helpers for rendering a resource as a filled bar instead of a bare
// number. A resource only makes sense as a bar when its range is actually
// bounded -- currency's max is 999999 specifically to mean "no real
// ceiling", so it stays a plain chip instead of an always-near-empty bar.
const BAR_RANGE_THRESHOLD = 100;

export function isBarResource(config) {
  return (config.max - config.min) <= BAR_RANGE_THRESHOLD;
}

export function resourceFraction(value, config) {
  const span = config.max - config.min;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (value - config.min) / span));
}

export function resourceBarLevel(fraction) {
  if (fraction <= 0.2) return 'critical';
  if (fraction <= 0.5) return 'warn';
  return 'good';
}
