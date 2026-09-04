import { computeStreakUpdate } from './streaks-logic.js';

const KEY = 'oneday.streak';
const DEFAULT_STREAK = { currentStreak: 0, longestStreak: 0, lastPlayedDate: null };

function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null');
    return value && typeof value === 'object' ? value : DEFAULT_STREAK;
  } catch { return DEFAULT_STREAK; }
}

export function getStreak() {
  return read();
}

export function recordStreakForToday(todayKey) {
  const updated = computeStreakUpdate(read(), todayKey);
  localStorage.setItem(KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('streakchange', { detail: updated }));
  return updated;
}
