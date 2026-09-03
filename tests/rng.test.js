import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, createRng, dailySeed, hashSeed } from '../shared/rng.js';

test('mulberry32 is deterministic for a given seed', () => {
  const a = mulberry32(12345);
  const b = mulberry32(12345);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});

test('mulberry32 produces values in [0, 1)', () => {
  const rng = mulberry32(1);
  for (let i = 0; i < 1000; i++) {
    const value = rng();
    assert.ok(value >= 0 && value < 1);
  }
});

test('different seeds produce different sequences', () => {
  assert.notEqual(mulberry32(1)(), mulberry32(2)());
});

test('createRng(seed) matches mulberry32(seed) deterministically', () => {
  const rng = createRng(42);
  assert.equal(typeof rng, 'function');
  assert.equal(rng(), mulberry32(42)());
});

test('dailySeed is deterministic for the same date and era', () => {
  const date = new Date('2026-03-05T12:00:00Z');
  assert.equal(dailySeed('greece', date), dailySeed('greece', date));
});

test('dailySeed differs across eras and across dates', () => {
  const date = new Date('2026-03-05T12:00:00Z');
  const otherDate = new Date('2026-03-06T12:00:00Z');
  assert.notEqual(dailySeed('greece', date), dailySeed('future-city', date));
  assert.notEqual(dailySeed('greece', date), dailySeed('greece', otherDate));
});

test('hashSeed returns a 32-bit unsigned integer', () => {
  const hash = hashSeed('hello world');
  assert.ok(Number.isInteger(hash) && hash >= 0 && hash <= 0xFFFFFFFF);
});
