import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickDailyObjectives, isObjectiveComplete, objectiveStatus } from '../shared/objectives.js';
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

test('the live tracker only calls done what can no longer be undone', () => {
  const [a, b, c, d, e] = era.objectivesPool;
  const dayState = { minSeen: { thirst: 30 }, flags: ['found-shrine'] };
  const resourceState = { currency: 120, health: 80, thirst: 30 };
  assert.equal(objectiveStatus(d, { resourceState, dayState }), 'done');
  assert.equal(objectiveStatus(a, { resourceState, dayState }), 'holding');
  assert.equal(objectiveStatus(b, { resourceState, dayState }), 'open');
  assert.equal(objectiveStatus(c, { resourceState, dayState }), 'holding');
  assert.equal(objectiveStatus(c, { resourceState, dayState: { ...dayState, minSeen: { thirst: 5 } } }), 'failed');
  assert.equal(objectiveStatus(d, { resourceState, dayState: { ...dayState, flags: [] } }), 'open');
  assert.equal(objectiveStatus(e, { resourceState, dayState }), 'open');
});
