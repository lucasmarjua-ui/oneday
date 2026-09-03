import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { hasPlayedToday } from '../shared/daily-challenge-logic.js';
import { dailySeed, dateKey, mulberry32 } from '../shared/rng.js';
import { createResourceState, applyResourceDeltas, isCriticalDepleted } from '../shared/resources.js';
import { createDayState, isTimeUp, trackMinSeen, advanceTime } from '../shared/day-engine.js';
import { getValidCards, pickWeightedCard, resolveOption } from '../shared/decision-engine.js';
import { pickDailyObjectives } from '../shared/objectives.js';
import { createDefaultCharacter, findArchetype } from '../shared/character.js';

const here = dirname(fileURLToPath(import.meta.url));
const era = JSON.parse(readFileSync(join(here, '../data/eras/greece/era.json'), 'utf8'));
const cards = JSON.parse(readFileSync(join(here, '../data/eras/greece/cards.json'), 'utf8'));

test('hasPlayedToday recognizes a result cached for today', () => {
  const today = '2026-03-05';
  assert.equal(hasPlayedToday({ date: today }, today), true);
});

test('hasPlayedToday allows a fresh attempt once the date has moved on', () => {
  assert.equal(hasPlayedToday({ date: '2026-03-04' }, '2026-03-05'), false);
});

test('hasPlayedToday allows a fresh attempt when nothing is cached yet', () => {
  assert.equal(hasPlayedToday(null, '2026-03-05'), false);
  assert.equal(hasPlayedToday(undefined, '2026-03-05'), false);
});

test('dailySeed is stable across repeated calls for the same era and day (independent of who is asking)', () => {
  const date = new Date('2026-03-05T09:00:00Z');
  const playerASeed = dailySeed('greece', date);
  const playerBSeed = dailySeed('greece', date); // a second, independent call -- stands in for a second player
  assert.equal(playerASeed, playerBSeed);
});

function playDailyChallenge(eraId, seed, pickOptionIndex) {
  const character = createDefaultCharacter(era);
  const archetype = findArchetype(era, character.archetypeId);
  const rng = mulberry32(seed);
  let resourceState = createResourceState(era);
  let dayState = createDayState(era);
  const objectiveIds = pickDailyObjectives(era, 3, rng).map(o => o.id);
  const cardSequence = [];
  let steps = 0;
  while (!isTimeUp(dayState) && !isCriticalDepleted(resourceState, era) && steps < 500) {
    steps++;
    const valid = getValidCards(cards, era, resourceState, dayState);
    const card = valid.length ? pickWeightedCard(valid, rng) : { id: 'filler', options: [{ id: 'rest', cost: { time: 1 }, successChance: { base: 1 }, success: { resources: { energy: 5 } } }] };
    cardSequence.push(card.id);
    const option = card.options[pickOptionIndex(card, rng)];
    const { outcome } = resolveOption(option, archetype, rng);
    const combined = { ...(option.cost?.resources || {}) };
    Object.entries(outcome.resources || {}).forEach(([key, value]) => { combined[key] = (combined[key] || 0) + value; });
    resourceState = applyResourceDeltas(resourceState, era, combined);
    dayState = advanceTime(dayState, option.cost?.time || 0);
    dayState = trackMinSeen(dayState, resourceState);
    if (outcome.flagsSet?.length) dayState = { ...dayState, flags: [...dayState.flags, ...outcome.flagsSet] };
    dayState = { ...dayState, playedCardIds: [...dayState.playedCardIds, card.id] };
  }
  return { cardSequence, objectiveIds, resourceState };
}

test('two different players playing the same era on the same day, making the same choices, get an identical run', () => {
  const today = new Date('2026-03-05T00:00:00Z');
  const seed = dailySeed('greece', today);
  const pickFirstOption = () => 0;

  const playerA = playDailyChallenge('greece', seed, pickFirstOption);
  const playerB = playDailyChallenge('greece', seed, pickFirstOption); // "a second player", same day

  assert.deepEqual(playerA.cardSequence, playerB.cardSequence);
  assert.deepEqual(playerA.objectiveIds, playerB.objectiveIds);
  assert.deepEqual(playerA.resourceState, playerB.resourceState);
});

test('the same player on two different days gets a different challenge', () => {
  const day1 = dailySeed('greece', new Date('2026-03-05T00:00:00Z'));
  const day2 = dailySeed('greece', new Date('2026-03-06T00:00:00Z'));
  const pickFirstOption = () => 0;
  const runDay1 = playDailyChallenge('greece', day1, pickFirstOption);
  const runDay2 = playDailyChallenge('greece', day2, pickFirstOption);
  assert.notDeepEqual(runDay1.cardSequence, runDay2.cardSequence);
});

test('players making different choices on the same daily seed can diverge in outcome', () => {
  const today = new Date('2026-03-05T00:00:00Z');
  const seed = dailySeed('greece', today);
  const pickFirstOption = () => 0;
  const pickLastOption = card => card.options.length - 1;

  const playerA = playDailyChallenge('greece', seed, pickFirstOption);
  const playerB = playDailyChallenge('greece', seed, pickLastOption);

  // Same starting seed means the *card offered* at each step before a choice
  // diverges the state should still line up for as long as both players are
  // still in sync; what's asserted here is just that different choices are
  // *capable* of producing different final resources -- the seed alone
  // doesn't force identical outcomes, only identical choices do.
  assert.notDeepEqual(playerA.resourceState, playerB.resourceState);
});

test('dateKey formats as YYYY-MM-DD in UTC', () => {
  assert.equal(dateKey(new Date('2026-03-05T23:59:00Z')), '2026-03-05');
  assert.equal(dateKey(new Date('2026-03-06T00:01:00Z')), '2026-03-06');
});

test('firestore.rules makes daily leaderboard entries create-only (no update or delete)', () => {
  const rules = readFileSync(join(here, '../firestore.rules'), 'utf8');
  const dailySection = rules.slice(rules.indexOf('dailyLeaderboards'));
  assert.match(dailySection, /allow create:/);
  assert.match(dailySection, /allow update, delete: if false/);
});
