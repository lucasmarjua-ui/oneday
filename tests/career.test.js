// The historian's career and the end-of-day quiz.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { RANKS, MEDALS, XP, emptyCareer, seedCareer, xpForDay, rankFor, applyDay, eventCatalogue } from '../shared/career-logic.js';
import { pickQuiz, scoreQuiz } from '../shared/quiz-logic.js';
import { createRng } from '../shared/rng.js';
import { ERAS } from '../shared/era-registry.js';

const here = dirname(fileURLToPath(import.meta.url));
const readJson = path => JSON.parse(readFileSync(join(here, '..', path), 'utf8'));
const events = ERAS.filter(era => era.available).map(meta => ({ id: meta.id, era: readJson(`data/eras/${meta.id}/era.json`), cards: readJson(`data/eras/${meta.id}/cards.json`) }));
const bilingual = field => typeof field?.en === 'string' && field.en.trim() && typeof field?.es === 'string' && field.es.trim();

test('ranks climb in order and are bilingual', () => {
  assert.equal(RANKS[0].xp, 0);
  RANKS.forEach((rank, i) => {
    assert.ok(bilingual(rank.name), rank.id);
    if (i) assert.ok(rank.xp > RANKS[i - 1].xp, rank.id);
  });
});

test('rankFor finds the rank and the way to the next', () => {
  assert.equal(rankFor(0).rank.id, 'visitor');
  assert.equal(rankFor(RANKS[1].xp).rank.id, RANKS[1].id);
  const halfway = rankFor((RANKS[1].xp + RANKS[2].xp) / 2);
  assert.equal(halfway.index, 1);
  assert.ok(Math.abs(halfway.progress - 0.5) < 1e-9);
  const top = rankFor(1e9);
  assert.equal(top.next, null);
  assert.equal(top.progress, 1);
});

test('a day earns experience item by item', () => {
  const quiet = xpForDay({});
  assert.equal(quiet.total, XP.day);
  const big = xpForDay({ objectivesCompleted: 3, objectivesTotal: 3, newFacts: 4, newEnding: true, historical: true, quiz: { correct: 3, total: 3, perfect: true } });
  assert.equal(big.total, XP.day + 3 * XP.objective + XP.allObjectives + 4 * XP.newFact + XP.newEnding + XP.historicalEnding + 3 * XP.quizCorrect + XP.quizPerfect);
  assert.deepEqual(big.items.map(item => item.key), ['day', 'objectives', 'allObjectives', 'facts', 'ending', 'quiz', 'quizPerfect']);
});

test('old players start with what their collections are worth', () => {
  const career = seedCareer({ giza: { endings: ['a', 'b'], facts: ['x', 'y', 'z'] } }, { giza: { daysPlayed: 4 }, 'd-day': { daysPlayed: 1 } });
  assert.equal(career.xp, 2 * XP.newEnding + 3 * XP.newFact);
  assert.equal(career.days, 5);
  assert.deepEqual(career.events.sort(), ['d-day', 'giza']);
  assert.deepEqual(seedCareer(), emptyCareer());
});

test('applying a day adds up, unlocks medals once and reports a rank-up', () => {
  const eras = eventCatalogue(events);
  const day = { eventId: 'giza', endingId: 'set', historical: true, newEnding: true, newFacts: 5, objectivesCompleted: 3, objectivesTotal: 3, quiz: { correct: 3, total: 3, perfect: true } };
  const first = applyDay(emptyCareer(), day, { progressAll: { giza: { endings: ['set'], facts: [] } }, eras, streak: null });
  assert.equal(first.career.days, 1);
  assert.deepEqual(first.career.historical, ['giza:set']);
  assert.ok(first.rankUp);
  assert.deepEqual(first.newMedals.map(medal => medal.id).sort(), ['first-day', 'flawless', 'top-of-class', 'true-history']);
  const again = applyDay(first.career, day, { progressAll: {}, eras, streak: null });
  assert.equal(again.newMedals.length, 0);
  assert.deepEqual(again.career.historical, ['giza:set']);
  assert.equal(again.career.flawlessDays, 2);
});

test('every medal is bilingual, tiered and reachable', () => {
  const ids = new Set();
  MEDALS.forEach(medal => {
    assert.ok(!ids.has(medal.id), `duplicate ${medal.id}`);
    ids.add(medal.id);
    assert.ok(bilingual(medal.title) && bilingual(medal.description), medal.id);
    assert.ok(['bronze', 'silver', 'gold'].includes(medal.tier), medal.id);
  });
  const eras = eventCatalogue(events);
  const progressAll = Object.fromEntries(eras.map(era => [era.id, { endings: era.endingIds, facts: era.factIds }]));
  const career = { ...emptyCareer(), days: 99, historical: ['a'], alternative: ['a', 'b', 'c', 'd', 'e'], perfectQuizzes: 1, quizCorrect: 99, flawlessDays: 1, events: eras.map(era => era.id) };
  MEDALS.forEach(medal => assert.ok(medal.check({ career, progressAll, eras, streak: { longestStreak: 9 } }), `${medal.id} can never be won`));
});

test('every event has a quiz on its own facts', () => {
  events.forEach(({ id, era, cards }) => {
    const quiz = era.quiz || [];
    assert.ok(quiz.length >= 10, `${id}: only ${quiz.length} questions`);
    const ids = new Set();
    quiz.forEach(question => {
      assert.ok(!ids.has(question.id), `${id}: duplicate ${question.id}`);
      ids.add(question.id);
      const card = cards.find(entry => entry.id === question.factId);
      assert.ok(card?.fact, `${question.id}: no card with a fact "${question.factId}"`);
      assert.ok(bilingual(question.q), `${question.id}: question`);
      assert.equal(question.options.length, 3, `${question.id}: needs 3 options`);
      question.options.forEach(option => assert.ok(bilingual(option), `${question.id}: option`));
      assert.equal(new Set(question.options.map(option => option.en)).size, 3, `${question.id}: repeated option`);
    });
  });
});

test('the quiz asks about today first and keeps the right answer', () => {
  const { era } = events.find(entry => entry.id === 'giza');
  const seen = ['giza-bread', 'giza-cubit'];
  const picked = pickQuiz(era.quiz, seen, createRng(7), 3);
  assert.equal(picked.length, 3);
  assert.deepEqual(new Set(picked.slice(0, 2).map(question => question.factId)), new Set(seen));
  picked.forEach(question => {
    const original = era.quiz.find(entry => entry.id === question.id);
    assert.equal(question.options[question.answer], original.options[0]);
  });
  assert.deepEqual(scoreQuiz(picked, picked.map(question => question.answer)), { correct: 3, total: 3, perfect: true });
  assert.equal(scoreQuiz(picked, [null, null, null]).correct, 0);
  assert.deepEqual(pickQuiz([], seen), []);
});

test('two devices merge into the larger career and the full collection', async () => {
  const { mergeCareer } = await import('../shared/career-logic.js');
  const { mergeCollections } = await import('../shared/progress-logic.js');
  const merged = mergeCareer({ xp: 300, days: 4, medals: ['first-day'], events: ['giza'] }, { xp: 500, days: 2, medals: ['veteran'], events: ['giza', 'd-day'] });
  assert.equal(merged.xp, 500);
  assert.equal(merged.days, 4);
  assert.deepEqual(merged.medals.sort(), ['first-day', 'veteran']);
  assert.deepEqual(merged.events.sort(), ['d-day', 'giza']);
  assert.deepEqual(mergeCollections({ giza: { endings: ['a'], facts: ['x'] } }, { giza: { endings: ['b'], facts: ['x', 'y'] }, 'd-day': { endings: [], facts: ['z'] } }), {
    giza: { endings: ['b', 'a'], facts: ['x', 'y'] },
    'd-day': { endings: [], facts: ['z'] },
  });
});
