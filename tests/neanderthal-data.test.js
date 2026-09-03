import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createResourceState, applyResourceDeltas, isCriticalDepleted, getCriticalResourceKey } from '../shared/resources.js';
import { createDayState, isTimeUp, trackMinSeen, advanceTime } from '../shared/day-engine.js';
import { getValidCards, pickWeightedCard, resolveOption } from '../shared/decision-engine.js';
import { pickDailyObjectives, isObjectiveComplete } from '../shared/objectives.js';
import { createDefaultCharacter, findArchetype } from '../shared/character.js';
import { mulberry32 } from '../shared/rng.js';

const here = dirname(fileURLToPath(import.meta.url));
const era = JSON.parse(readFileSync(join(here, '../data/eras/neanderthal/era.json'), 'utf8'));
const cards = JSON.parse(readFileSync(join(here, '../data/eras/neanderthal/cards.json'), 'utf8'));
const greeceEra = JSON.parse(readFileSync(join(here, '../data/eras/greece/era.json'), 'utf8'));

function isBilingual(field) {
  return field && typeof field === 'object' && typeof field.en === 'string' && field.en.length > 0 && typeof field.es === 'string' && field.es.length > 0;
}

test('era.json declares bilingual text for every player-facing field', () => {
  assert.ok(isBilingual(era.name), 'era.name');
  assert.ok(isBilingual(era.tagline), 'era.tagline');
  assert.ok(isBilingual(era.goodEnding), 'era.goodEnding');
  assert.ok(isBilingual(era.badEnding), 'era.badEnding');
  era.day.slots.forEach(slot => assert.ok(isBilingual(slot.label), `slot ${slot.id} label`));
  Object.entries(era.resources).forEach(([key, config]) => assert.ok(isBilingual(config.label), `resource ${key} label`));
  era.archetypes.forEach(a => {
    assert.ok(isBilingual(a.name), `archetype ${a.id} name`);
    assert.ok(isBilingual(a.description), `archetype ${a.id} description`);
  });
  era.character.bases.forEach(base => assert.ok(isBilingual(base.label), `base ${base.id} label`));
  era.character.slots.forEach(slot => {
    assert.ok(isBilingual(slot.label), `slot ${slot.id} label`);
    slot.options.forEach(option => assert.ok(isBilingual(option.label), `${slot.id}/${option.id} label`));
  });
  era.objectivesPool.forEach(o => assert.ok(isBilingual(o.description), `objective ${o.id} description`));
  era.metaAchievements.forEach(a => {
    assert.ok(isBilingual(a.title), `achievement ${a.id} title`);
    assert.ok(isBilingual(a.description), `achievement ${a.id} description`);
  });
});

test('era.json archetypes only reference declared modifiers', () => {
  era.archetypes.forEach(archetype => {
    Object.keys(archetype.modifiers).forEach(key => {
      assert.ok(era.modifiers.includes(key), `${archetype.id} references undeclared modifier "${key}"`);
    });
  });
});

test('Neanderthal genuinely uses a different resource and modifier set than Greece (schema generalization)', () => {
  const neanderthalResourceKeys = Object.keys(era.resources).sort();
  const greeceResourceKeys = Object.keys(greeceEra.resources).sort();
  assert.notDeepEqual(neanderthalResourceKeys, greeceResourceKeys);
  assert.ok(!('hunger' in era.resources) && !('thirst' in era.resources), 'hunger/thirst should be fused into a single survival resource');
  assert.ok('survival' in era.resources, 'expected a fused survival resource');
  assert.deepEqual(era.modifiers.sort(), ['luck', 'might', 'wits']);
  assert.deepEqual(greeceEra.modifiers.sort(), ['charm', 'might', 'wits']);
  assert.ok(era.modifiers.includes('luck') && !greeceEra.modifiers.includes('luck'), 'luck should be exercised here but not in Greece');
});

test('cards.json is well-formed, has unique ids, and every option carries bilingual text', () => {
  assert.ok(cards.length >= 10, 'expected enough cards for a full playable day');
  const seenIds = new Set();
  cards.forEach(card => {
    assert.ok(card.id, 'card missing id');
    assert.ok(!seenIds.has(card.id), `duplicate card id: ${card.id}`);
    seenIds.add(card.id);
    assert.ok(isBilingual(card.text), `card ${card.id} text`);
    assert.ok(Array.isArray(card.options) && card.options.length >= 2, `card ${card.id} needs 2+ options`);
    card.options.forEach(option => {
      assert.ok(isBilingual(option.text), `${card.id}/${option.id} text`);
      assert.ok('success' in option, `${card.id}/${option.id} missing success outcome`);
      if (option.success?.text) assert.ok(isBilingual(option.success.text), `${card.id}/${option.id} success text`);
      if (option.failure?.text) assert.ok(isBilingual(option.failure.text), `${card.id}/${option.id} failure text`);
      if (option.successChance?.archetypeBonus) {
        assert.ok(era.modifiers.includes(option.successChance.archetypeBonus.modifier), `${card.id}/${option.id} references undeclared modifier`);
      }
    });
  });
});

test('every archetype modifier (might, wits, luck) is actually exercised by at least one card', () => {
  const usedModifiers = new Set();
  cards.forEach(card => card.options.forEach(option => {
    if (option.successChance?.archetypeBonus) usedModifiers.add(option.successChance.archetypeBonus.modifier);
  }));
  era.modifiers.forEach(modifier => assert.ok(usedModifiers.has(modifier), `modifier "${modifier}" is never used by any card option`));
});

function playOneDay(rng, pickOptionIndex) {
  const character = createDefaultCharacter(era);
  const archetype = findArchetype(era, character.archetypeId);
  let resourceState = createResourceState(era);
  let dayState = createDayState(era);
  const objectives = pickDailyObjectives(era, 3, rng);
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
  return { steps, resourceState, dayState, objectives, cardSequence };
}

test('a simulated day always terminates and never crashes, across many seeds', () => {
  for (let seed = 0; seed < 100; seed++) {
    const rng = mulberry32(seed * 7919 + 13);
    const result = playOneDay(rng, (card, rand) => Math.floor(rand() * card.options.length));
    assert.ok(result.steps < 500, `day did not terminate within the safety cap (seed ${seed})`);
    result.objectives.forEach(objective => isObjectiveComplete(objective, result)); // must not throw
  }
});

test('the same seed with the same choices produces an identical playthrough', () => {
  const pickFirst = () => 0;
  const a = playOneDay(mulberry32(2026), pickFirst);
  const b = playOneDay(mulberry32(2026), pickFirst);
  assert.deepEqual(a.cardSequence, b.cardSequence);
  assert.deepEqual(a.objectives.map(o => o.id), b.objectives.map(o => o.id));
  assert.deepEqual(a.resourceState, b.resourceState);
});
