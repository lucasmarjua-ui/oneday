import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStreakUpdate, mergeStreak } from '../shared/streaks-logic.js';

test('computeStreakUpdate extends the streak when the last play was yesterday', () => {
  const current = { currentStreak: 3, longestStreak: 5, lastPlayedDate: '2026-09-03' };
  const result = computeStreakUpdate(current, '2026-09-04');
  assert.deepEqual(result, { currentStreak: 4, longestStreak: 5, lastPlayedDate: '2026-09-04' });
});

test('computeStreakUpdate leaves the streak unchanged when already played today', () => {
  const current = { currentStreak: 4, longestStreak: 5, lastPlayedDate: '2026-09-04' };
  const result = computeStreakUpdate(current, '2026-09-04');
  assert.deepEqual(result, current);
});

test('computeStreakUpdate resets to 1 when the gap is more than one day', () => {
  const current = { currentStreak: 6, longestStreak: 6, lastPlayedDate: '2026-08-20' };
  const result = computeStreakUpdate(current, '2026-09-04');
  assert.deepEqual(result, { currentStreak: 1, longestStreak: 6, lastPlayedDate: '2026-09-04' });
});

test('computeStreakUpdate treats a never-played state (null lastPlayedDate) as a reset to 1', () => {
  const result = computeStreakUpdate({ currentStreak: 0, longestStreak: 0, lastPlayedDate: null }, '2026-09-04');
  assert.deepEqual(result, { currentStreak: 1, longestStreak: 1, lastPlayedDate: '2026-09-04' });
});

test('computeStreakUpdate raises longestStreak once currentStreak exceeds it, never lowers it', () => {
  const current = { currentStreak: 5, longestStreak: 5, lastPlayedDate: '2026-09-03' };
  const result = computeStreakUpdate(current, '2026-09-04');
  assert.equal(result.currentStreak, 6);
  assert.equal(result.longestStreak, 6);
});

test('computeStreakUpdate correctly crosses a month boundary when computing "yesterday"', () => {
  const current = { currentStreak: 2, longestStreak: 2, lastPlayedDate: '2026-08-31' };
  const result = computeStreakUpdate(current, '2026-09-01');
  assert.deepEqual(result, { currentStreak: 3, longestStreak: 3, lastPlayedDate: '2026-09-01' });
});

test('mergeStreak takes the state from whichever side played more recently', () => {
  const local = { currentStreak: 2, longestStreak: 4, lastPlayedDate: '2026-09-02' };
  const cloud = { currentStreak: 5, longestStreak: 5, lastPlayedDate: '2026-09-04' };
  const result = mergeStreak(local, cloud);
  assert.equal(result.currentStreak, 5);
  assert.equal(result.lastPlayedDate, '2026-09-04');
  assert.equal(result.longestStreak, 5);
});

test('mergeStreak prefers local on a tied lastPlayedDate and always keeps the higher longestStreak', () => {
  const local = { currentStreak: 3, longestStreak: 9, lastPlayedDate: '2026-09-04' };
  const cloud = { currentStreak: 3, longestStreak: 4, lastPlayedDate: '2026-09-04' };
  const result = mergeStreak(local, cloud);
  assert.equal(result.currentStreak, 3);
  assert.equal(result.lastPlayedDate, '2026-09-04');
  assert.equal(result.longestStreak, 9);
});

test('mergeStreak handles missing/undefined sides gracefully', () => {
  assert.deepEqual(mergeStreak(undefined, undefined), { currentStreak: 0, lastPlayedDate: null, longestStreak: 0 });
  const cloud = { currentStreak: 2, longestStreak: 2, lastPlayedDate: '2026-09-04' };
  assert.deepEqual(mergeStreak(undefined, cloud), { currentStreak: 2, lastPlayedDate: '2026-09-04', longestStreak: 2 });
});
