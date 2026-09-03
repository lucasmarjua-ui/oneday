import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectMemorySeed, extractMemorableState, mergeMemories } from '../shared/memories-logic.js';

test('selectMemorySeed returns an empty seed for a guest, regardless of stored memories', () => {
  const eraMemories = { flags: ['remembered-helped-thales'], counters: { merchantTrust: 5 } };
  const seed = selectMemorySeed(null, eraMemories);
  assert.deepEqual(seed, { flags: [], counters: {} });
});

test('selectMemorySeed returns the era memories for a logged-in user', () => {
  const user = { uid: 'u1' };
  const eraMemories = { flags: ['remembered-helped-thales'], counters: { merchantTrust: 5 } };
  assert.deepEqual(selectMemorySeed(user, eraMemories), eraMemories);
});

test('selectMemorySeed defaults to empty when a logged-in user has no memories yet', () => {
  assert.deepEqual(selectMemorySeed({ uid: 'u1' }, undefined), { flags: [], counters: {} });
});

test('extractMemorableState keeps only flags/counters the era declared as memorable', () => {
  const era = { memories: { flags: ['remembered-helped-thales'], counters: ['merchantTrust'] } };
  const dayState = { flags: ['met-thales', 'helped-thales', 'remembered-helped-thales'], counters: { merchantTrust: 4, kleonRespect: -2 } };
  assert.deepEqual(extractMemorableState(era, dayState), { flags: ['remembered-helped-thales'], counters: { merchantTrust: 4 } });
});

test('extractMemorableState returns nothing when the era declares no memorable state', () => {
  const dayState = { flags: ['met-thales'], counters: { merchantTrust: 4 } };
  assert.deepEqual(extractMemorableState({}, dayState), { flags: [], counters: {} });
});

test('mergeMemories unions flags per era and lets local counters win over cloud', () => {
  const local = { greece: { flags: ['remembered-helped-thales'], counters: { merchantTrust: 4 } } };
  const cloud = { greece: { flags: ['remembered-sophia-favor'], counters: { merchantTrust: 1, sophiaRespect: 2 } } };
  const merged = mergeMemories(local, cloud);
  assert.deepEqual(merged.greece.flags.sort(), ['remembered-helped-thales', 'remembered-sophia-favor']);
  assert.deepEqual(merged.greece.counters, { merchantTrust: 4, sophiaRespect: 2 });
});
