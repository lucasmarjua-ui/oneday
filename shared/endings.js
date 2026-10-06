// How a historical day ends. Each event declares its endings in order: the
// first whose conditions hold is the one you reach. Exactly one is marked
// `historical` (what really happened); the rest are the other ways it could
// have gone. A day cut short by a depleted critical resource only matches
// endings declared for that depletion, and the last ending is the fallback.
import { meetsResourceConditions } from './resources.js';

function matches(when, { dayState, resourceState }) {
  const flags = dayState.flags || [];
  if ((when.flagsRequired || []).some(flag => !flags.includes(flag))) return false;
  if ((when.flagsExcluded || []).some(flag => flags.includes(flag))) return false;
  if (!meetsResourceConditions(resourceState || {}, when.resources || {})) return false;
  if (!meetsResourceConditions(dayState.counters || {}, when.counters || {})) return false;
  return true;
}

export function resolveEnding(era, { dayState, resourceState, criticalKey = null }) {
  const endings = era.endings || [];
  if (!endings.length) return null;
  if (criticalKey) {
    return endings.find(ending => ending.when?.depleted === criticalKey)
      || endings.find(ending => ending.when?.depleted === 'any')
      || endings[endings.length - 1];
  }
  return endings.find(ending => !ending.when?.depleted && matches(ending.when || {}, { dayState, resourceState }))
    || endings[endings.length - 1];
}

export function historicalEnding(era) {
  return (era.endings || []).find(ending => ending.historical) || null;
}
