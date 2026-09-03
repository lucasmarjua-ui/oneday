import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDayState, getCurrentSlot, formatClock, advanceTime, isTimeUp, trackMinSeen } from '../shared/day-engine.js';

const era = {
  day: {
    totalTime: 16,
    startLabel: '07:00',
    endLabel: '23:00',
    slots: [
      { id: 'morning', from: 0, to: 4 },
      { id: 'midday', from: 4, to: 8 },
      { id: 'afternoon', from: 8, to: 12 },
      { id: 'night', from: 12, to: 16 },
    ],
  },
};

test('getCurrentSlot picks the right slot at boundaries', () => {
  assert.equal(getCurrentSlot(era, 0).id, 'morning');
  assert.equal(getCurrentSlot(era, 3.9).id, 'morning');
  assert.equal(getCurrentSlot(era, 4).id, 'midday');
  assert.equal(getCurrentSlot(era, 15.9).id, 'night');
  assert.equal(getCurrentSlot(era, 16).id, 'night');
});

test('formatClock converts elapsed time into a clock label', () => {
  assert.equal(formatClock(era, 0), '07:00');
  assert.equal(formatClock(era, 8), '15:00');
  assert.equal(formatClock(era, 16), '23:00');
});

test('advanceTime clamps at totalTime', () => {
  const state = createDayState(era);
  assert.equal(advanceTime(state, 20).elapsed, 16);
});

test('isTimeUp is true only once elapsed reaches totalTime', () => {
  const state = createDayState(era);
  assert.equal(isTimeUp(state), false);
  assert.equal(isTimeUp(advanceTime(state, 16)), true);
});

test('trackMinSeen records the lowest value seen for each resource', () => {
  let state = createDayState(era);
  state = trackMinSeen(state, { health: 80 });
  state = trackMinSeen(state, { health: 40 });
  state = trackMinSeen(state, { health: 60 });
  assert.equal(state.minSeen.health, 40);
});
