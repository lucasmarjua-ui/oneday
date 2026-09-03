import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickDailyObjectives, isObjectiveComplete } from '../shared/objectives.js';
import { mulberry32 } from '../shared/rng.js';

const era = {
  objectivesPool: [
    { id: 'a', check: { type: 'resourceAtLeast', resource: 'currency', value: 100 } },
    { id: 'b', check: { type: 'resourceAtMost', resource: 'health', value: 50 } },
    { id: 'c', check: { type: 'resourceNeverBelow', resource: 'thirst', value: 20 } },
    { id: 'd', check: { type: 'flagSet', flag: 'found-shrine' } },
    { id: 'e', check: { type: 'unknown-type' } },
  ],
};

test('pickDailyObjectives returns the requested count with no duplicates', () => {
  const picked = pickDailyObjectives(era, 3, mulberry32(5));
  assert.equal(picked.length, 3);
  assert.equal(new Set(picked.map(o => o.id)).size, 3);
});

test('pickDailyObjectives is deterministic for a given seed', () => {
  assert.deepEqual(
    pickDailyObjectives(era, 3, mulberry32(123)).map(o => o.id),
    pickDailyObjectives(era, 3, mulberry32(123)).map(o => o.id),
  );
});

test('isObjectiveComplete: resourceAtLeast', () => {
  const objective = era.objectivesPool[0];
  assert.equal(isObjectiveComplete(objective, { resourceState: { currency: 150 }, dayState: {} }), true);
  assert.equal(isObjectiveComplete(objective, { resourceState: { currency: 50 }, dayState: {} }), false);
});

test('isObjectiveComplete: resourceAtMost', () => {
  const objective = era.objectivesPool[1];
  assert.equal(isObjectiveComplete(objective, { resourceState: { health: 40 }, dayState: {} }), true);
  assert.equal(isObjectiveComplete(objective, { resourceState: { health: 60 }, dayState: {} }), false);
});

test('isObjectiveComplete: resourceNeverBelow reads dayState.minSeen, falling back to current value', () => {
  const objective = era.objectivesPool[2];
  assert.equal(isObjectiveComplete(objective, { resourceState: { thirst: 90 }, dayState: { minSeen: { thirst: 25 } } }), true);
  assert.equal(isObjectiveComplete(objective, { resourceState: { thirst: 90 }, dayState: { minSeen: { thirst: 10 } } }), false);
  assert.equal(isObjectiveComplete(objective, { resourceState: { thirst: 90 }, dayState: { minSeen: {} } }), true);
});

test('isObjectiveComplete: flagSet', () => {
  const objective = era.objectivesPool[3];
  assert.equal(isObjectiveComplete(objective, { resourceState: {}, dayState: { flags: ['found-shrine'] } }), true);
  assert.equal(isObjectiveComplete(objective, { resourceState: {}, dayState: { flags: [] } }), false);
});

test('isObjectiveComplete: unknown check type is always false', () => {
  assert.equal(isObjectiveComplete(era.objectivesPool[4], { resourceState: {}, dayState: {} }), false);
});
