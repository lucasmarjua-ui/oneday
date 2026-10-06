// localStorage wrapper around progress-logic.js.
import { emptyProgress, recordDay } from './progress-logic.js';

const KEY = 'oneday.progress';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export function getProgress(eventId) {
  return { ...emptyProgress(), ...(readAll()[eventId] || {}) };
}

export function saveDay(eventId, day) {
  const all = readAll();
  const result = recordDay(all[eventId], day);
  all[eventId] = result.progress;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Not remembered this time.
  }
  return result;
}
