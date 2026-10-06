// Endings and collections: how a day is judged, and what the player keeps
// from one playthrough to the next.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveEnding, historicalEnding } from '../shared/endings.js';
import { emptyProgress, recordDay, completion } from '../shared/progress-logic.js';
import { openingCard } from '../shared/decision-engine.js';

const era = {
  resources: { fuel: { min: 0, max: 100, critical: true }, oxygen: { min: 0, max: 100, critical: true }, samples: { min: 0, max: 99 } },
  endings: [
    { id: 'dry', when: { depleted: 'fuel' } },
    { id: 'gasp', when: { depleted: 'any' } },
    { id: 'abort', when: { flagsRequired: ['aborted'] } },
    { id: 'geologist', when: { flagsRequired: ['landed'], resources: { samples: { min: 10 } } } },
    { id: 'history', historical: true, when: { flagsRequired: ['landed'], flagsExcluded: ['aborted'] } },
    { id: 'orbit', when: {} },
  ],
};
const day = (flags = [], counters = {}) => ({ flags, counters, playedCardIds: [] });

test('a depleted resource picks its own ending, or the catch-all one', () => {
  assert.equal(resolveEnding(era, { dayState: day(), resourceState: {}, criticalKey: 'fuel' }).id, 'dry');
  assert.equal(resolveEnding(era, { dayState: day(), resourceState: {}, criticalKey: 'oxygen' }).id, 'gasp');
});

test('the first ending whose conditions hold wins, in order', () => {
  assert.equal(resolveEnding(era, { dayState: day(['aborted', 'landed']), resourceState: { samples: 50 } }).id, 'abort');
  assert.equal(resolveEnding(era, { dayState: day(['landed']), resourceState: { samples: 12 } }).id, 'geologist');
  assert.equal(resolveEnding(era, { dayState: day(['landed']), resourceState: { samples: 2 } }).id, 'history');
  assert.equal(resolveEnding(era, { dayState: day(), resourceState: { samples: 2 } }).id, 'orbit');
});

test('an event without endings has none, and the historical one is findable', () => {
  assert.equal(resolveEnding({}, { dayState: day(), resourceState: {} }), null);
  assert.equal(historicalEnding(era).id, 'history');
  assert.equal(historicalEnding({}), null);
});

test('the collection remembers each ending and fact once', () => {
  let progress = emptyProgress();
  let result = recordDay(progress, { endingId: 'orbit', factIds: ['a', 'b', 'a'] });
  assert.equal(result.newEnding, true);
  assert.deepEqual(result.newFacts, ['a', 'b']);
  progress = result.progress;
  result = recordDay(progress, { endingId: 'orbit', factIds: ['b', 'c'] });
  assert.equal(result.newEnding, false);
  assert.deepEqual(result.newFacts, ['c']);
  assert.deepEqual(result.progress, { endings: ['orbit'], facts: ['a', 'b', 'c'] });
  assert.deepEqual(recordDay(undefined, { endingId: null }).progress, emptyProgress());
});

test('completion counts only endings and facts that still exist', () => {
  const cards = [{ id: 'a', fact: { en: 'x' } }, { id: 'b' }, { id: 'c', fact: { en: 'y' } }];
  const done = completion({ endings: ['orbit', 'gone'], facts: ['a', 'b', 'zzz'] }, era, cards);
  assert.deepEqual(done, { endings: 1, totalEndings: 6, facts: 1, totalFacts: 2 });
});

test('the opening card comes first, and only first', () => {
  const cards = [{ id: 'other' }, { id: 'wake' }];
  const withOpening = { day: { openingCard: 'wake' } };
  assert.equal(openingCard(cards, withOpening, { playedCardIds: [] }).id, 'wake');
  assert.equal(openingCard(cards, withOpening, { playedCardIds: ['wake'] }), null);
  assert.equal(openingCard(cards, {}, { playedCardIds: [] }), null);
  assert.equal(openingCard(cards, { day: { openingCard: 'missing' } }, { playedCardIds: [] }), null);
});
