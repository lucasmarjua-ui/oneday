import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBarResource, resourceFraction, resourceBarLevel } from '../shared/resource-bar.js';

test('isBarResource is true for bounded ranges, false for an effectively unlimited one', () => {
  assert.equal(isBarResource({ min: 0, max: 100 }), true);
  assert.equal(isBarResource({ min: 0, max: 100.0001 }), false);
  assert.equal(isBarResource({ min: 0, max: 999999 }), false);
});

test('resourceFraction maps value to [0, 1] across the resource range', () => {
  assert.equal(resourceFraction(0, { min: 0, max: 100 }), 0);
  assert.equal(resourceFraction(50, { min: 0, max: 100 }), 0.5);
  assert.equal(resourceFraction(100, { min: 0, max: 100 }), 1);
});

test('resourceFraction clamps out-of-range values instead of overflowing', () => {
  assert.equal(resourceFraction(-20, { min: 0, max: 100 }), 0);
  assert.equal(resourceFraction(150, { min: 0, max: 100 }), 1);
});

test('resourceFraction handles a non-zero min', () => {
  assert.equal(resourceFraction(30, { min: 20, max: 40 }), 0.5);
});

test('resourceFraction returns 0 for a degenerate zero-span range rather than dividing by zero', () => {
  assert.equal(resourceFraction(5, { min: 10, max: 10 }), 0);
});

test('resourceBarLevel buckets fraction into good/warn/critical at the documented thresholds', () => {
  assert.equal(resourceBarLevel(1), 'good');
  assert.equal(resourceBarLevel(0.51), 'good');
  assert.equal(resourceBarLevel(0.5), 'warn');
  assert.equal(resourceBarLevel(0.21), 'warn');
  assert.equal(resourceBarLevel(0.2), 'critical');
  assert.equal(resourceBarLevel(0), 'critical');
});
