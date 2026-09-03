export const OBJECTIVE_POINTS = 100;
export const TIEBREAK_MAX = 10;
export const CURRENCY_TIEBREAK_CAP = 500;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

// Objectives dominate the score; the tiebreak (health + currency, normalized)
// is capped well below OBJECTIVE_POINTS so it can only ever break a tie
// between playthroughs with the same objective count, never outweigh one.
// A day that ends in the bad ending scores exactly like any other day: the
// objectives completed and resources held at that moment, no extra penalty.
export function computeDayScore({ objectivesCompletedCount, resourceState, era }) {
  const healthConfig = era.resources?.health;
  const healthFraction = healthConfig
    ? clamp01((resourceState.health - healthConfig.min) / (healthConfig.max - healthConfig.min))
    : 0;
  const currencyFraction = 'currency' in resourceState ? clamp01(resourceState.currency / CURRENCY_TIEBREAK_CAP) : 0;
  const tiebreakScore = Math.round((healthFraction * 0.6 + currencyFraction * 0.4) * TIEBREAK_MAX);
  const objectivesScore = objectivesCompletedCount * OBJECTIVE_POINTS;
  return { objectivesScore, tiebreakScore, total: objectivesScore + tiebreakScore };
}
