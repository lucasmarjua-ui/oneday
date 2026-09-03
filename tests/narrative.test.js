import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCounterDeltas } from '../shared/narrative.js';

test('applyCounterDeltas accumulates named counters starting from zero', () => {
  const result = applyCounterDeltas({}, { merchantTrust: 2 });
  assert.equal(result.merchantTrust, 2);
});

test('applyCounterDeltas adds onto an existing counter value', () => {
  const result = applyCounterDeltas({ merchantTrust: 3 }, { merchantTrust: -1 });
  assert.equal(result.merchantTrust, 2);
});

test('applyCounterDeltas leaves unrelated counters untouched and does not mutate the input', () => {
  const counters = { merchantTrust: 1, kleonRespect: 5 };
  const result = applyCounterDeltas(counters, { merchantTrust: 1 });
  assert.equal(result.merchantTrust, 2);
  assert.equal(result.kleonRespect, 5);
  assert.equal(counters.merchantTrust, 1, 'input counters object must not be mutated');
});

test('applyCounterDeltas with no deltas returns an equivalent copy', () => {
  const counters = { sophiaRespect: 4 };
  const result = applyCounterDeltas(counters);
  assert.deepEqual(result, counters);
  assert.notEqual(result, counters);
});
