import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankTraits, resolvePersona, TRAITS } from '../shared/persona.js';

const era = {
  personas: [
    { id: 'bold-one', trait: 'bold' },
    { id: 'careful-one', trait: 'prudent' },
    { id: 'kind-one', trait: 'generous' },
    { id: 'drifter', trait: null },
  ],
};

test('TRAITS is the single closed list every era writes against', () => {
  assert.deepEqual(TRAITS, ['bold', 'prudent', 'generous', 'cunning', 'diligent', 'curious']);
});

test('rankTraits orders traits by how often they were chosen', () => {
  const ranked = rankTraits({ bold: 2, generous: 5, prudent: 1 });
  assert.deepEqual(ranked.map(entry => entry.trait), ['generous', 'bold', 'prudent']);
});

test('rankTraits ignores traits never chosen, and an empty day ranks nothing', () => {
  assert.deepEqual(rankTraits({ bold: 0, cunning: 3 }).map(entry => entry.trait), ['cunning']);
  assert.deepEqual(rankTraits({}), []);
  assert.deepEqual(rankTraits(), []);
});

test('resolvePersona picks the persona for the most-chosen trait', () => {
  assert.equal(resolvePersona(era, { bold: 1, generous: 4 }).id, 'kind-one');
  assert.equal(resolvePersona(era, { prudent: 9 }).id, 'careful-one');
});

test('a day with no leaning at all falls back to the trait-less persona', () => {
  assert.equal(resolvePersona(era, {}).id, 'drifter');
  assert.equal(resolvePersona(era).id, 'drifter');
});

test('traits an era has no persona for never win the day', () => {
  // 'cunning' has no persona here; the highest trait that does should win.
  assert.equal(resolvePersona(era, { cunning: 10, bold: 1 }).id, 'bold-one');
});

test('a tie resolves to whichever persona the era lists first, deterministically', () => {
  const first = resolvePersona(era, { bold: 3, prudent: 3 });
  const second = resolvePersona(era, { prudent: 3, bold: 3 });
  assert.equal(first.id, 'bold-one');
  assert.equal(second.id, 'bold-one', 'the result must not depend on key insertion order');
});

test('an era with no personas at all resolves to null instead of throwing', () => {
  assert.equal(resolvePersona({ personas: [] }, { bold: 2 }), null);
  assert.equal(resolvePersona({}, { bold: 2 }), null);
});
