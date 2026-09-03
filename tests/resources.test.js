import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createResourceState, applyResourceDeltas, isCriticalDepleted, getCriticalResourceKey, meetsResourceConditions } from '../shared/resources.js';

const era = {
  resources: {
    energy: { min: 0, max: 100, start: 80 },
    health: { min: 0, max: 100, start: 100, critical: true },
    currency: { min: 0, max: 999999, start: 20 },
  },
};

test('createResourceState initializes from era.start values', () => {
  assert.deepEqual(createResourceState(era), { energy: 80, health: 100, currency: 20 });
});

test('applyResourceDeltas clamps to [min, max]', () => {
  let state = createResourceState(era);
  state = applyResourceDeltas(state, era, { energy: 50 });
  assert.equal(state.energy, 100);
  state = applyResourceDeltas(state, era, { energy: -500 });
  assert.equal(state.energy, 0);
});

test('applyResourceDeltas ignores unknown resource keys', () => {
  const state = createResourceState(era);
  assert.deepEqual(applyResourceDeltas(state, era, { mana: 10 }), state);
});

test('isCriticalDepleted is true only once a critical resource hits its min', () => {
  let state = createResourceState(era);
  assert.equal(isCriticalDepleted(state, era), false);
  state = applyResourceDeltas(state, era, { health: -100 });
  assert.equal(isCriticalDepleted(state, era), true);
});

test('getCriticalResourceKey identifies which resource is depleted', () => {
  let state = createResourceState(era);
  state = applyResourceDeltas(state, era, { health: -100 });
  assert.equal(getCriticalResourceKey(state, era), 'health');
});

test('meetsResourceConditions checks min/max ranges and ignores missing keys', () => {
  const state = { currency: 20 };
  assert.equal(meetsResourceConditions(state, { currency: { min: 10 } }), true);
  assert.equal(meetsResourceConditions(state, { currency: { min: 30 } }), false);
  assert.equal(meetsResourceConditions(state, { currency: { max: 10 } }), false);
  assert.equal(meetsResourceConditions(state, {}), true);
  assert.equal(meetsResourceConditions(state, { reputation: { min: 5 } }), true);
});
