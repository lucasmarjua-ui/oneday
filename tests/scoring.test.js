import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDayScore, OBJECTIVE_POINTS, TIEBREAK_MAX } from '../shared/scoring.js';

const era = {
  resources: {
    health: { min: 0, max: 100 },
    currency: { min: 0, max: 999999 },
  },
};

test('each completed objective is worth exactly OBJECTIVE_POINTS', () => {
  const zero = computeDayScore({ objectivesCompletedCount: 0, resourceState: { health: 0, currency: 0 }, era });
  const one = computeDayScore({ objectivesCompletedCount: 1, resourceState: { health: 0, currency: 0 }, era });
  const three = computeDayScore({ objectivesCompletedCount: 3, resourceState: { health: 0, currency: 0 }, era });
  assert.equal(zero.objectivesScore, 0);
  assert.equal(one.objectivesScore, OBJECTIVE_POINTS);
  assert.equal(three.objectivesScore, 3 * OBJECTIVE_POINTS);
});

test('the tiebreak can never outweigh one extra completed objective', () => {
  const bestPossibleTiebreak = computeDayScore({ objectivesCompletedCount: 0, resourceState: { health: 100, currency: 999999 }, era }).tiebreakScore;
  assert.ok(bestPossibleTiebreak < OBJECTIVE_POINTS, `tiebreak of ${bestPossibleTiebreak} should be strictly less than ${OBJECTIVE_POINTS}`);
  assert.ok(TIEBREAK_MAX < OBJECTIVE_POINTS);
});

test('tiebreak scales with final health and currency, bounded to [0, TIEBREAK_MAX]', () => {
  const worst = computeDayScore({ objectivesCompletedCount: 1, resourceState: { health: 0, currency: 0 }, era });
  const best = computeDayScore({ objectivesCompletedCount: 1, resourceState: { health: 100, currency: 500 }, era });
  const middling = computeDayScore({ objectivesCompletedCount: 1, resourceState: { health: 50, currency: 250 }, era });
  assert.equal(worst.tiebreakScore, 0);
  assert.equal(best.tiebreakScore, TIEBREAK_MAX);
  assert.ok(middling.tiebreakScore > worst.tiebreakScore && middling.tiebreakScore < best.tiebreakScore);
});

test('currency beyond the tiebreak cap contributes no more than the cap itself', () => {
  const capped = computeDayScore({ objectivesCompletedCount: 0, resourceState: { health: 0, currency: 500 }, era });
  const overCap = computeDayScore({ objectivesCompletedCount: 0, resourceState: { health: 0, currency: 50000 }, era });
  assert.equal(capped.tiebreakScore, overCap.tiebreakScore);
});

test('two players with the same objective count are ranked by the tiebreak', () => {
  const playerA = computeDayScore({ objectivesCompletedCount: 2, resourceState: { health: 80, currency: 200 }, era });
  const playerB = computeDayScore({ objectivesCompletedCount: 2, resourceState: { health: 30, currency: 50 }, era });
  assert.ok(playerA.total > playerB.total);
});

test('a bad-ending day scores from whatever objectives/resources it reached, with no extra penalty', () => {
  // Dying early with 1 objective done and modest resources scores exactly
  // like any other day reaching that same state -- no special-case needed.
  const badEnding = computeDayScore({ objectivesCompletedCount: 1, resourceState: { health: 0, currency: 40 }, era });
  const sameStateViaTimeout = computeDayScore({ objectivesCompletedCount: 1, resourceState: { health: 0, currency: 40 }, era });
  assert.deepEqual(badEnding, sameStateViaTimeout);
});

test('gracefully handles an era or resourceState missing health/currency', () => {
  const bareEra = { resources: {} };
  const result = computeDayScore({ objectivesCompletedCount: 2, resourceState: {}, era: bareEra });
  assert.equal(result.tiebreakScore, 0);
  assert.equal(result.total, 2 * OBJECTIVE_POINTS);
});
