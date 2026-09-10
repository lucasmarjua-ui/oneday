import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getValidCards, pickWeightedCard, computeSuccessChance, resolveOption, TRAIT_BONUS_DEFAULT_CAP } from '../shared/decision-engine.js';
import { createDayState } from '../shared/day-engine.js';
import { mulberry32 } from '../shared/rng.js';

const era = {
  day: { totalTime: 16, slots: [{ id: 'morning', from: 0, to: 4 }, { id: 'night', from: 4, to: 16 }] },
  resources: { energy: { min: 0, max: 100, start: 50 } },
};

test('getValidCards filters by time slot', () => {
  const cards = [{ id: 'a', timeSlots: ['morning'] }, { id: 'b', timeSlots: ['night'] }];
  assert.deepEqual(getValidCards(cards, era, {}, createDayState(era)).map(c => c.id), ['a']);
});

test('getValidCards excludes already-played non-repeatable cards but keeps repeatable ones', () => {
  const dayState = { ...createDayState(era), playedCardIds: ['a', 'b'] };
  const cards = [{ id: 'a', timeSlots: ['morning'] }, { id: 'b', timeSlots: ['morning'], repeatable: true }];
  assert.deepEqual(getValidCards(cards, era, {}, dayState).map(c => c.id), ['b']);
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

test('getValidCards enforces counter conditions, e.g. an NPC trust threshold', () => {
  const cards = [
    { id: 'trusted-only', timeSlots: ['morning'], conditions: { counters: { trust: { min: 3 } } } },
    { id: 'always', timeSlots: ['morning'] },
  ];
  assert.deepEqual(getValidCards(cards, era, {}, { ...createDayState(era), counters: { trust: 1 } }).map(c => c.id), ['always']);
  assert.deepEqual(getValidCards(cards, era, {}, { ...createDayState(era), counters: { trust: 5 } }).map(c => c.id).sort(), ['always', 'trusted-only']);
});

test('a narrative thread only unlocks its follow-up once the intro flag is set', () => {
  const cards = [
    { id: 'intro', timeSlots: ['morning'], conditions: { flagsExcluded: ['met-npc'] } },
    { id: 'follow-up', timeSlots: ['morning'], conditions: { flagsRequired: ['met-npc'], flagsExcluded: ['resolved'] } },
    { id: 'resolution', timeSlots: ['morning'], conditions: { flagsRequired: ['helped-npc'], flagsExcluded: ['resolved'] } },
  ];
  const start = createDayState(era);
  assert.deepEqual(getValidCards(cards, era, {}, start).map(c => c.id), ['intro']);
  assert.deepEqual(getValidCards(cards, era, {}, { ...start, flags: ['met-npc'] }).map(c => c.id), ['follow-up']);
  assert.deepEqual(getValidCards(cards, era, {}, { ...start, flags: ['met-npc', 'helped-npc'] }).map(c => c.id).sort(), ['follow-up', 'resolution']);
  assert.deepEqual(getValidCards(cards, era, {}, { ...start, flags: ['met-npc', 'helped-npc', 'resolved'] }).map(c => c.id), []);
});

test('pickWeightedCard is deterministic for a seed and favors higher weights', () => {
  const cards = [{ id: 'rare', weight: 1 }, { id: 'common', weight: 9 }];
  assert.equal(pickWeightedCard(cards, mulberry32(7)).id, pickWeightedCard(cards, mulberry32(7)).id);
  const rng = mulberry32(99);
  const counts = { rare: 0, common: 0 };
  for (let i = 0; i < 2000; i++) counts[pickWeightedCard(cards, rng).id]++;
  assert.ok(counts.common > counts.rare * 3, `expected common >> rare, got ${JSON.stringify(counts)}`);
});

test('computeSuccessChance defaults to certainty with no spec and honors a bare base', () => {
  assert.equal(computeSuccessChance(undefined, {}), 1);
  assert.equal(computeSuccessChance({ base: 0.4 }, {}), 0.4);
});

test('a resource bonus swings the odds by the full scale between empty and full', () => {
  const spec = { base: 0.5, resourceBonus: { resource: 'energy', scale: 0.4 } };
  const empty = computeSuccessChance(spec, { era, resourceState: { energy: 0 } });
  const half = computeSuccessChance(spec, { era, resourceState: { energy: 50 } });
  const full = computeSuccessChance(spec, { era, resourceState: { energy: 100 } });
  assert.equal(half, 0.5, 'a half-full resource should leave the base untouched');
  assert.ok(Math.abs(empty - 0.3) < 1e-9, `expected 0.3 on empty, got ${empty}`);
  assert.ok(Math.abs(full - 0.7) < 1e-9, `expected 0.7 on full, got ${full}`);
});

test('a resource bonus is ignored when the era does not have that resource', () => {
  const spec = { base: 0.5, resourceBonus: { resource: 'oxygen', scale: 0.4 } };
  assert.equal(computeSuccessChance(spec, { era, resourceState: { energy: 100 } }), 0.5);
});

test('a trait bonus rewards choices already made today', () => {
  const spec = { base: 0.4, traitBonus: { trait: 'bold', perPoint: 0.05 } };
  assert.equal(computeSuccessChance(spec, { traits: {} }), 0.4);
  assert.ok(Math.abs(computeSuccessChance(spec, { traits: { bold: 3 } }) - 0.55) < 1e-9);
});

test('a trait bonus is capped, so a one-note day cannot buy certainty', () => {
  const spec = { base: 0.4, traitBonus: { trait: 'bold', perPoint: 0.05 } };
  const atCap = computeSuccessChance(spec, { traits: { bold: TRAIT_BONUS_DEFAULT_CAP } });
  const wayOverCap = computeSuccessChance(spec, { traits: { bold: 40 } });
  assert.equal(wayOverCap, atCap);
  const explicitCap = { base: 0.4, traitBonus: { trait: 'bold', perPoint: 0.05, cap: 2 } };
  assert.ok(Math.abs(computeSuccessChance(explicitCap, { traits: { bold: 9 } }) - 0.5) < 1e-9);
});

test('a real roll is always clamped into [0.05, 0.95], however good or bad the inputs', () => {
  const generous = { base: 0.9, resourceBonus: { resource: 'energy', scale: 0.4 } };
  assert.equal(computeSuccessChance(generous, { era, resourceState: { energy: 100 } }), 0.95);
  const punishing = { base: 0.1, resourceBonus: { resource: 'energy', scale: 0.4 } };
  assert.equal(computeSuccessChance(punishing, { era, resourceState: { energy: 0 } }), 0.05);
});

test('resolveOption takes the success branch below the chance and failure at or above it', () => {
  const option = { successChance: { base: 0.5 }, success: { text: 'yes' }, failure: { text: 'no' } };
  assert.equal(resolveOption(option, {}, () => 0.3).outcome, option.success);
  assert.equal(resolveOption(option, {}, () => 0.7).outcome, option.failure);
});

test('resolveOption falls back to an empty outcome when there is no failure branch', () => {
  const result = resolveOption({ successChance: { base: 0 }, success: { text: 'yes' } }, {}, () => 0.99);
  assert.equal(result.success, false);
  assert.deepEqual(result.outcome, { text: {}, resources: {} });
});

test('resolveOption reports the chance it actually rolled against', () => {
  const option = { successChance: { base: 0.5, traitBonus: { trait: 'curious', perPoint: 0.1 } } };
  assert.ok(Math.abs(resolveOption(option, { traits: { curious: 2 } }, () => 0.1).chance - 0.7) < 1e-9);
});

test('an option with no bonus at all is certain, not clamped down to 95%', () => {
  // "Walk past, 0h" is not a roll; printing 95% odds on it would be a lie.
  assert.equal(computeSuccessChance({ base: 1 }, {}), 1);
  assert.equal(computeSuccessChance({ base: 1 }, { era, resourceState: { energy: 10 } }), 1);
});

test('once a bonus applies, the [0.05, 0.95] band applies too', () => {
  const spec = { base: 1, traitBonus: { trait: 'bold', perPoint: 0.05 } };
  assert.equal(computeSuccessChance(spec, { traits: { bold: 2 } }), 0.95);
});
