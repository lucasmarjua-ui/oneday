import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getValidCards, pickWeightedCard, computeSuccessChance, resolveOption } from '../shared/decision-engine.js';
import { createDayState } from '../shared/day-engine.js';
import { mulberry32 } from '../shared/rng.js';

const era = { day: { totalTime: 16, slots: [{ id: 'morning', from: 0, to: 4 }, { id: 'night', from: 4, to: 16 }] } };

test('getValidCards filters by time slot', () => {
  const cards = [{ id: 'a', timeSlots: ['morning'] }, { id: 'b', timeSlots: ['night'] }];
  const dayState = createDayState(era);
  assert.deepEqual(getValidCards(cards, era, {}, dayState).map(c => c.id), ['a']);
});

test('getValidCards excludes already-played non-repeatable cards', () => {
  const cards = [{ id: 'a', timeSlots: ['morning'] }];
  const dayState = { ...createDayState(era), playedCardIds: ['a'] };
  assert.equal(getValidCards(cards, era, {}, dayState).length, 0);
});

test('getValidCards keeps repeatable cards even after being played', () => {
  const cards = [{ id: 'a', timeSlots: ['morning'], repeatable: true }];
  const dayState = { ...createDayState(era), playedCardIds: ['a'] };
  assert.equal(getValidCards(cards, era, {}, dayState).length, 1);
});

test('getValidCards enforces resource conditions and required/excluded flags', () => {
  const dayState = { ...createDayState(era), flags: ['met-elder'] };
  const cards = [
    { id: 'needs-gold', timeSlots: ['morning'], conditions: { resources: { currency: { min: 50 } } } },
    { id: 'needs-flag', timeSlots: ['morning'], conditions: { flagsRequired: ['met-elder'] } },
    { id: 'excludes-flag', timeSlots: ['morning'], conditions: { flagsExcluded: ['met-elder'] } },
  ];
  assert.deepEqual(getValidCards(cards, era, { currency: 10 }, dayState).map(c => c.id), ['needs-flag']);
});

test('getValidCards enforces counter conditions (e.g. NPC trust thresholds)', () => {
  const cards = [
    { id: 'trusted-only', timeSlots: ['morning'], conditions: { counters: { merchantTrust: { min: 3 } } } },
    { id: 'no-counter-needed', timeSlots: ['morning'] },
  ];
  const lowTrust = { ...createDayState(era), counters: { merchantTrust: 1 } };
  assert.deepEqual(getValidCards(cards, era, {}, lowTrust).map(c => c.id), ['no-counter-needed']);
  const highTrust = { ...createDayState(era), counters: { merchantTrust: 5 } };
  assert.deepEqual(getValidCards(cards, era, {}, highTrust).map(c => c.id).sort(), ['no-counter-needed', 'trusted-only']);
});

test('a multi-card narrative thread only unlocks its follow-up after the intro flag is set', () => {
  const intro = { id: 'thread-intro', timeSlots: ['morning'], conditions: { flagsExcluded: ['met-npc'] } };
  const followUp = { id: 'thread-follow-up', timeSlots: ['morning'], conditions: { flagsRequired: ['met-npc'], flagsExcluded: ['thread-resolved'] } };
  const resolution = { id: 'thread-resolution', timeSlots: ['morning'], conditions: { flagsRequired: ['helped-npc'], flagsExcluded: ['thread-resolved'] } };
  const cards = [intro, followUp, resolution];

  const dayStart = createDayState(era);
  assert.deepEqual(getValidCards(cards, era, {}, dayStart).map(c => c.id), ['thread-intro']);

  const afterIntro = { ...dayStart, flags: ['met-npc'] };
  assert.deepEqual(getValidCards(cards, era, {}, afterIntro).map(c => c.id), ['thread-follow-up']);

  const afterFollowUp = { ...dayStart, flags: ['met-npc', 'helped-npc'] };
  assert.deepEqual(getValidCards(cards, era, {}, afterFollowUp).map(c => c.id).sort(), ['thread-follow-up', 'thread-resolution']);

  const afterResolution = { ...dayStart, flags: ['met-npc', 'helped-npc', 'thread-resolved'] };
  assert.deepEqual(getValidCards(cards, era, {}, afterResolution).map(c => c.id), []);
});

test('pickWeightedCard is deterministic for a given rng seed', () => {
  const cards = [{ id: 'a', weight: 1 }, { id: 'b', weight: 1 }, { id: 'c', weight: 1 }];
  assert.equal(pickWeightedCard(cards, mulberry32(7)).id, pickWeightedCard(cards, mulberry32(7)).id);
});

test('pickWeightedCard favors higher-weight cards over many draws', () => {
  const cards = [{ id: 'rare', weight: 1 }, { id: 'common', weight: 9 }];
  const rng = mulberry32(99);
  const counts = { rare: 0, common: 0 };
  for (let i = 0; i < 2000; i++) counts[pickWeightedCard(cards, rng).id]++;
  assert.ok(counts.common > counts.rare * 3, `expected common >> rare, got ${JSON.stringify(counts)}`);
});

test('computeSuccessChance applies archetype bonus and clamps to [0.05, 0.95]', () => {
  const archetype = { modifiers: { charm: 3 } };
  assert.equal(computeSuccessChance({ base: 0.5, archetypeBonus: { modifier: 'charm', scale: 0.1 } }, archetype), 0.8);
  assert.equal(computeSuccessChance({ base: 0.9, archetypeBonus: { modifier: 'charm', scale: 0.1 } }, archetype), 0.95);
  assert.equal(computeSuccessChance({ base: 0 }, archetype), 0.05);
});

test('computeSuccessChance ignores missing modifiers and defaults to 1 with no spec', () => {
  assert.equal(computeSuccessChance({ base: 0.5, archetypeBonus: { modifier: 'wits', scale: 0.1 } }, { modifiers: {} }), 0.5);
  assert.equal(computeSuccessChance(undefined, {}), 1);
});

test('resolveOption succeeds when the roll is below the success chance', () => {
  const option = { successChance: { base: 0.5 }, success: { text: 'yes' }, failure: { text: 'no' } };
  const result = resolveOption(option, {}, () => 0.3);
  assert.equal(result.success, true);
  assert.equal(result.outcome, option.success);
});

test('resolveOption fails when the roll is at or above the success chance', () => {
  const option = { successChance: { base: 0.5 }, success: { text: 'yes' }, failure: { text: 'no' } };
  const result = resolveOption(option, {}, () => 0.7);
  assert.equal(result.success, false);
  assert.equal(result.outcome, option.failure);
});

test('resolveOption falls back to an empty outcome object when failure is undefined', () => {
  const option = { successChance: { base: 0 }, success: { text: 'yes' } };
  const result = resolveOption(option, {}, () => 0.99);
  assert.equal(result.success, false);
  assert.deepEqual(result.outcome, { text: {}, resources: {} });
});
