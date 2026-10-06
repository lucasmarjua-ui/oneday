// One data test, run against every era in the registry. Adding an era means
// adding two JSON files and one registry entry -- and inheriting all of these
// checks automatically, rather than copying a per-era test file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ERAS } from '../shared/era-registry.js';
import { createResourceState, applyResourceDeltas, isCriticalDepleted } from '../shared/resources.js';
import { createDayState, isTimeUp, trackMinSeen, advanceTime } from '../shared/day-engine.js';
import { getValidCards, pickWeightedCard, resolveOption, openingCard } from '../shared/decision-engine.js';
import { getCriticalResourceKey } from '../shared/resources.js';
import { resolveEnding } from '../shared/endings.js';
import { pickDailyObjectives, isObjectiveComplete } from '../shared/objectives.js';
import { applyCounterDeltas } from '../shared/narrative.js';
import { resolvePersona } from '../shared/persona.js';
import { TRAITS } from '../shared/persona.js';
import { mulberry32 } from '../shared/rng.js';

const here = dirname(fileURLToPath(import.meta.url));
const readJson = relativePath => JSON.parse(readFileSync(join(here, '..', relativePath), 'utf8'));

function isBilingual(field) {
  return field && typeof field === 'object' && typeof field.en === 'string' && field.en.length > 0 && typeof field.es === 'string' && field.es.length > 0;
}

const loaded = ERAS.map(meta => ({ meta, era: readJson(meta.configPath), cards: readJson(meta.cardsPath) }));

test('the registry only lists eras whose files exist and whose ids match', () => {
  loaded.forEach(({ meta, era }) => {
    assert.equal(era.id, meta.id, `${meta.id}: era.json id must match the registry id`);
    assert.ok(isBilingual(meta.name), `${meta.id}: registry name`);
    assert.ok(isBilingual(meta.tagline), `${meta.id}: registry tagline`);
    assert.ok(isBilingual(meta.year), `${meta.id}: registry year`);
    assert.ok(Number.isInteger(meta.accent) && meta.accent >= 0 && meta.accent < 360, `${meta.id}: accent must be a hue 0-359`);
  });
  const hues = loaded.map(({ meta }) => meta.accent);
  assert.equal(new Set(hues).size, hues.length, 'each era should have its own accent hue');
});

loaded.forEach(({ meta, era, cards }) => {
  const eraId = meta.id;

  test(`${eraId}: every player-facing field in era.json is bilingual`, () => {
    assert.ok(isBilingual(era.name), 'name');
    assert.ok(isBilingual(era.tagline), 'tagline');
    assert.ok(isBilingual(era.role), 'role');
    assert.ok(isBilingual(era.history), 'history');
    era.endings.forEach(ending => {
      assert.ok(isBilingual(ending.title), `ending ${ending.id} title`);
      assert.ok(isBilingual(ending.description), `ending ${ending.id} description`);
    });
    cards.filter(card => card.fact).forEach(card => assert.ok(isBilingual(card.fact), `card ${card.id} fact`));
    era.day.slots.forEach(slot => assert.ok(isBilingual(slot.label), `slot ${slot.id}`));
    Object.entries(era.resources).forEach(([key, config]) => assert.ok(isBilingual(config.label), `resource ${key}`));
    era.objectivesPool.forEach(objective => assert.ok(isBilingual(objective.description), `objective ${objective.id}`));
    era.metaAchievements.forEach(achievement => {
      assert.ok(isBilingual(achievement.title), `achievement ${achievement.id} title`);
      assert.ok(isBilingual(achievement.description), `achievement ${achievement.id} description`);
    });
    era.npcs.forEach(npc => {
      assert.ok(isBilingual(npc.name), `npc ${npc.id} name`);
      assert.ok(isBilingual(npc.role), `npc ${npc.id} role`);
    });
    era.personas.forEach(persona => {
      assert.ok(isBilingual(persona.name), `persona ${persona.id} name`);
      assert.ok(isBilingual(persona.description), `persona ${persona.id} description`);
    });
  });

  test(`${eraId}: declares one persona per trait plus a no-trait fallback`, () => {
    const byTrait = era.personas.filter(persona => persona.trait).map(persona => persona.trait);
    assert.deepEqual([...byTrait].sort(), [...TRAITS].sort(), 'every trait needs exactly one persona');
    const fallbacks = era.personas.filter(persona => !persona.trait);
    assert.equal(fallbacks.length, 1, 'exactly one trait-less fallback persona');
    const ids = era.personas.map(persona => persona.id);
    assert.equal(new Set(ids).size, ids.length, 'persona ids must be unique');
  });

  test(`${eraId}: a day with no choices at all still resolves to the fallback persona`, () => {
    const persona = resolvePersona(era, {});
    assert.ok(persona, 'a persona must always resolve');
    assert.ok(!persona.trait, `expected the trait-less persona, got "${persona.id}"`);
  });

  test(`${eraId}: declares a critical resource, so a day can actually end badly`, () => {
    const critical = Object.entries(era.resources).filter(([, config]) => config.critical);
    assert.ok(critical.length >= 1, 'at least one resource must be marked critical');
    Object.entries(era.resources).forEach(([key, config]) => {
      assert.ok(config.max > config.min, `resource ${key} needs a real range`);
      assert.ok(config.start >= config.min && config.start <= config.max, `resource ${key} starts outside its range`);
    });
  });

  test(`${eraId}: cards are well-formed, uniquely identified and bilingual throughout`, () => {
    assert.ok(cards.length >= 20, `expected a substantial card pool, got ${cards.length}`);
    const seen = new Set();
    cards.forEach(card => {
      assert.ok(card.id, 'card missing id');
      assert.ok(!seen.has(card.id), `duplicate card id: ${card.id}`);
      seen.add(card.id);
      assert.ok(isBilingual(card.text), `card ${card.id} text`);
      assert.ok(Array.isArray(card.options) && card.options.length >= 2, `card ${card.id} needs 2+ options`);
      const optionIds = new Set();
      card.options.forEach(option => {
        assert.ok(!optionIds.has(option.id), `duplicate option id ${option.id} in ${card.id}`);
        optionIds.add(option.id);
        assert.ok(isBilingual(option.text), `${card.id}/${option.id} text`);
        assert.ok('success' in option, `${card.id}/${option.id} missing success outcome`);
        if (option.success?.text) assert.ok(isBilingual(option.success.text), `${card.id}/${option.id} success text`);
        if (option.failure?.text) assert.ok(isBilingual(option.failure.text), `${card.id}/${option.id} failure text`);
      });
    });
  });

  test(`${eraId}: every option declares the trait it feeds, using only declared traits`, () => {
    cards.forEach(card => card.options.forEach(option => {
      assert.ok(option.traits && Object.keys(option.traits).length > 0, `${card.id}/${option.id} has no traits`);
      Object.keys(option.traits).forEach(trait => {
        assert.ok(TRAITS.includes(trait), `${card.id}/${option.id} uses unknown trait "${trait}"`);
      });
    }));
  });

  test(`${eraId}: every trait is reachable through this era's own cards`, () => {
    const used = new Set();
    cards.forEach(card => card.options.forEach(option => Object.keys(option.traits || {}).forEach(trait => used.add(trait))));
    TRAITS.forEach(trait => assert.ok(used.has(trait), `no option in ${eraId} ever awards "${trait}", so its persona is unreachable`));
  });

  test(`${eraId}: success chances only reference resources and traits that exist`, () => {
    cards.forEach(card => card.options.forEach(option => {
      const spec = option.successChance;
      if (!spec) return;
      if (spec.resourceBonus) {
        assert.ok(era.resources[spec.resourceBonus.resource], `${card.id}/${option.id} bonuses off undeclared resource "${spec.resourceBonus.resource}"`);
        assert.ok(typeof spec.resourceBonus.scale === 'number', `${card.id}/${option.id} resourceBonus needs a numeric scale`);
      }
      if (spec.traitBonus) {
        assert.ok(TRAITS.includes(spec.traitBonus.trait), `${card.id}/${option.id} bonuses off unknown trait "${spec.traitBonus.trait}"`);
        assert.ok(typeof spec.traitBonus.perPoint === 'number', `${card.id}/${option.id} traitBonus needs a numeric perPoint`);
      }
    }));
  });

  test(`${eraId}: every NPC and narrative thread resolves and chains coherently`, () => {
    assert.ok(era.npcs.length >= 3 && era.npcs.length <= 4, `expected 3-4 NPCs, got ${era.npcs.length}`);
    const npcIds = new Set();
    era.npcs.forEach(npc => {
      assert.ok(!npcIds.has(npc.id), `duplicate npc id ${npc.id}`);
      npcIds.add(npc.id);
      assert.ok(typeof npc.attitudeCounter === 'string' && npc.attitudeCounter.length > 0, `npc ${npc.id} needs an attitudeCounter`);
    });
    const threads = {};
    cards.forEach(card => {
      if (card.npcId) assert.ok(npcIds.has(card.npcId), `card ${card.id} references undeclared npc "${card.npcId}"`);
      if (card.threadId) (threads[card.threadId] ||= []).push(card.id);
    });
    Object.entries(threads).forEach(([threadId, ids]) => {
      assert.ok(ids.length >= 2 && ids.length <= 5, `thread "${threadId}" should chain 2-5 cards, has ${ids.length}`);
    });
  });

  test(`${eraId}: every flag-based objective can actually be set by some card`, () => {
    const setFlags = new Set();
    cards.forEach(card => card.options.forEach(option => {
      (option.success?.flagsSet || []).forEach(flag => setFlags.add(flag));
      (option.failure?.flagsSet || []).forEach(flag => setFlags.add(flag));
    }));
    era.objectivesPool
      .filter(objective => objective.check.type === 'flagSet')
      .forEach(objective => assert.ok(setFlags.has(objective.check.flag), `objective "${objective.id}" needs flag "${objective.check.flag}", which no card sets`));
  });

  test(`${eraId}: every declared memory is really produced by this era's cards`, () => {
    const setFlags = new Set();
    const counterKeys = new Set();
    cards.forEach(card => card.options.forEach(option => {
      (option.success?.flagsSet || []).forEach(flag => setFlags.add(flag));
      (option.failure?.flagsSet || []).forEach(flag => setFlags.add(flag));
      Object.keys(option.success?.countersAdd || {}).forEach(key => counterKeys.add(key));
      Object.keys(option.failure?.countersAdd || {}).forEach(key => counterKeys.add(key));
    }));
    (era.memories?.flags || []).forEach(flag => assert.ok(setFlags.has(flag), `memorable flag "${flag}" is never set`));
    (era.memories?.counters || []).forEach(key => assert.ok(counterKeys.has(key), `memorable counter "${key}" is never adjusted`));
  });

  test(`${eraId}: declares a historical ending, alternatives and a fallback`, () => {
    const endings = era.endings || [];
    assert.ok(endings.length >= 4, `expected at least 4 endings, got ${endings.length}`);
    assert.equal(endings.filter(ending => ending.historical).length, 1, 'exactly one ending must be the historical one');
    assert.equal(new Set(endings.map(ending => ending.id)).size, endings.length, 'ending ids must be unique');
    const last = endings[endings.length - 1];
    assert.deepEqual(last.when, {}, 'the last ending must be an unconditional fallback');
  });

  test(`${eraId}: every critical resource has its own ending, and endings only use real flags`, () => {
    Object.entries(era.resources).filter(([, config]) => config.critical).forEach(([key]) => {
      assert.ok(era.endings.some(ending => ending.when?.depleted === key), `no ending for running out of "${key}"`);
    });
    const setFlags = new Set(cards.flatMap(card => card.options.flatMap(option => [...(option.success?.flagsSet || []), ...(option.failure?.flagsSet || [])])));
    era.endings.forEach(ending => {
      if (ending.when?.depleted) assert.ok(era.resources[ending.when.depleted]?.critical, `${ending.id} depends on a non-critical resource`);
      [...(ending.when?.flagsRequired || []), ...(ending.when?.flagsExcluded || [])].forEach(flag => assert.ok(setFlags.has(flag), `ending ${ending.id} uses flag "${flag}", which no card sets`));
    });
  });

  test(`${eraId}: the day opens with its wake-up card`, () => {
    const card = openingCard(cards, era, { playedCardIds: [] });
    assert.ok(card, 'era.day.openingCard must name an existing card');
    assert.ok(!card.conditions?.flagsRequired?.length, 'the opening card cannot require flags');
    assert.ok(!card.timeSlots || card.timeSlots.includes(era.day.slots[0].id), 'the opening card must be playable in the first slot');
  });

  test(`${eraId}: teaches history: most cards carry a bilingual fact`, () => {
    const withFacts = cards.filter(card => card.fact).length;
    assert.ok(withFacts >= 15 && withFacts / cards.length >= 0.75, `only ${withFacts}/${cards.length} cards carry a fact`);
  });

  test(`${eraId}: the historical ending and several alternatives are reachable in play`, () => {
    const reached = new Set();
    for (let seed = 0; seed < 400; seed++) {
      const rng = mulberry32(seed * 104729 + 7);
      const result = playOneDay(era, cards, rng, (card, rand) => Math.floor(rand() * card.options.length));
      const criticalKey = getCriticalResourceKey(result.resourceState, era);
      reached.add(resolveEnding(era, { dayState: result.dayState, resourceState: result.resourceState, criticalKey }).id);
    }
    const historical = era.endings.find(ending => ending.historical).id;
    assert.ok(reached.has(historical), `the historical ending "${historical}" was never reached`);
    assert.ok(reached.size >= 4, `only ${reached.size} endings were ever reached: ${[...reached].join(', ')}`);
  });

  test(`${eraId}: a simulated day always terminates, across 60 seeds`, () => {
    for (let seed = 0; seed < 60; seed++) {
      const rng = mulberry32(seed * 7919 + 13);
      const result = playOneDay(era, cards, rng, (card, rand) => Math.floor(rand() * card.options.length));
      assert.ok(result.steps < 500, `did not terminate within the safety cap (seed ${seed})`);
      result.objectives.forEach(objective => isObjectiveComplete(objective, result));
      assert.ok(resolvePersona(era, result.dayState.traits), `no persona resolved (seed ${seed})`);
    }
  });

  test(`${eraId}: the same seed and the same choices reproduce the same day`, () => {
    const pickFirst = () => 0;
    const a = playOneDay(era, cards, mulberry32(2026), pickFirst);
    const b = playOneDay(era, cards, mulberry32(2026), pickFirst);
    assert.deepEqual(a.cardSequence, b.cardSequence);
    assert.deepEqual(a.resourceState, b.resourceState);
    assert.deepEqual(a.dayState.traits, b.dayState.traits);
  });
});

test('events genuinely differ from one another rather than being reskins', () => {
  const signatures = loaded.map(({ era }) => Object.keys(era.resources).sort().join(','));
  assert.equal(new Set(signatures).size, signatures.length, 'every event should track its own set of resources');
  const cardIds = new Set();
  loaded.forEach(({ meta, cards }) => cards.forEach(card => {
    assert.ok(!cardIds.has(card.id), `card id "${card.id}" is reused across eras (${meta.id})`);
    cardIds.add(card.id);
  }));
});

test('every event ships enough content to be worth replaying', () => {
  loaded.forEach(({ meta, cards }) => {
    const options = cards.reduce((n, card) => n + card.options.length, 0);
    assert.ok(cards.length >= 20 && options >= 55, `${meta.id}: ${cards.length} cards / ${options} options is too thin`);
  });
});

export function playOneDay(era, cards, rng, pickOptionIndex) {
  let resourceState = createResourceState(era);
  let dayState = createDayState(era);
  const objectives = pickDailyObjectives(era, 3, rng);
  const cardSequence = [];
  let steps = 0;
  while (!isTimeUp(dayState) && !isCriticalDepleted(resourceState, era) && steps < 500) {
    steps++;
    const valid = getValidCards(cards, era, resourceState, dayState);
    const card = openingCard(cards, era, dayState) || (valid.length ? pickWeightedCard(valid, rng) : null) || { id: 'filler', options: [{ id: 'rest', traits: { prudent: 1 }, cost: { time: 1 }, successChance: { base: 1 }, success: { resources: { energy: 5 } } }] };
    cardSequence.push(card.id);
    const option = card.options[pickOptionIndex(card, rng)];
    const { outcome } = resolveOption(option, { resourceState, era, traits: dayState.traits }, rng);
    const combined = { ...(option.cost?.resources || {}) };
    Object.entries(outcome.resources || {}).forEach(([key, value]) => { combined[key] = (combined[key] || 0) + value; });
    resourceState = applyResourceDeltas(resourceState, era, combined);
    dayState = advanceTime(dayState, option.cost?.time || 0);
    dayState = trackMinSeen(dayState, resourceState);
    dayState = { ...dayState, traits: applyCounterDeltas(dayState.traits, option.traits) };
    if (outcome.flagsSet?.length) dayState = { ...dayState, flags: [...dayState.flags, ...outcome.flagsSet] };
    if (outcome.countersAdd) dayState = { ...dayState, counters: applyCounterDeltas(dayState.counters, outcome.countersAdd) };
    dayState = { ...dayState, playedCardIds: [...dayState.playedCardIds, card.id] };
  }
  return { steps, resourceState, dayState, objectives, cardSequence };
}
