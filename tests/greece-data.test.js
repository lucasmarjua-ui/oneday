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
const era = JSON.parse(readFileSync(join(here, '../data/eras/greece/era.json'), 'utf8'));
const cards = JSON.parse(readFileSync(join(here, '../data/eras/greece/cards.json'), 'utf8'));

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
  era.npcs.forEach(npc => {
    assert.ok(isBilingual(npc.name), `npc ${npc.id} name`);
    assert.ok(isBilingual(npc.role), `npc ${npc.id} role`);
  });
});

test('era.json declares a small recurring cast (3-4 NPCs), each with a unique id and attitude counter', () => {
  assert.ok(era.npcs.length >= 3 && era.npcs.length <= 4, `expected 3-4 NPCs, got ${era.npcs.length}`);
  const seenIds = new Set();
  era.npcs.forEach(npc => {
    assert.ok(!seenIds.has(npc.id), `duplicate npc id: ${npc.id}`);
    seenIds.add(npc.id);
    assert.ok(typeof npc.attitudeCounter === 'string' && npc.attitudeCounter.length > 0, `npc ${npc.id} missing attitudeCounter`);
  });
});

test('era.json only declares memories for flags/counters that a card in cards.json can actually set', () => {
  const allSetFlags = new Set();
  const allCounterKeys = new Set();
  cards.forEach(card => card.options.forEach(option => {
    (option.success?.flagsSet || []).forEach(flag => allSetFlags.add(flag));
    (option.failure?.flagsSet || []).forEach(flag => allSetFlags.add(flag));
    Object.keys(option.success?.countersAdd || {}).forEach(key => allCounterKeys.add(key));
    Object.keys(option.failure?.countersAdd || {}).forEach(key => allCounterKeys.add(key));
  }));
  (era.memories?.flags || []).forEach(flag => assert.ok(allSetFlags.has(flag), `memorable flag "${flag}" is never set by any card`));
  (era.memories?.counters || []).forEach(key => assert.ok(allCounterKeys.has(key), `memorable counter "${key}" is never adjusted by any card`));
});

test('every card.npcId and threadId references a declared NPC and forms a coherent chain', () => {
  const npcIds = new Set(era.npcs.map(npc => npc.id));
  const threadCards = {};
  cards.forEach(card => {
    if (card.npcId) assert.ok(npcIds.has(card.npcId), `card ${card.id} references undeclared npc "${card.npcId}"`);
    if (card.threadId) (threadCards[card.threadId] ||= []).push(card);
  });
  Object.entries(threadCards).forEach(([threadId, threadCardList]) => {
    assert.ok(threadCardList.length >= 2 && threadCardList.length <= 4, `thread "${threadId}" should chain 2-4 cards, has ${threadCardList.length}`);
  });
});

test('era.json archetypes only reference declared modifiers', () => {
  era.archetypes.forEach(archetype => {
    Object.keys(archetype.modifiers).forEach(key => {
      assert.ok(era.modifiers.includes(key), `${archetype.id} references undeclared modifier "${key}"`);
    });
  });
});

test('cards.json is well-formed, has unique ids, and every option carries bilingual text', () => {
  assert.ok(cards.length >= 20, 'expected a substantial card pool');
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
