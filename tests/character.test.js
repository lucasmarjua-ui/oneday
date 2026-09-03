import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultCharacter, setArchetype, setBase, setSlotOption, findArchetype, renderCharacterSVG } from '../shared/character.js';

const era = {
  archetypes: [
    { id: 'warrior', modifiers: { might: 3 } },
    { id: 'orator', modifiers: { charm: 3 } },
  ],
  character: {
    bases: [{ id: 'base-a', skinColor: '#111' }, { id: 'base-b', skinColor: '#222' }],
    slots: [{ id: 'outfit', options: [{ id: 'plain', shape: 'tunic-plain', color: '#aaa' }, { id: 'fine', shape: 'tunic-fine', color: '#bbb' }] }],
  },
};

test('createDefaultCharacter picks the first archetype, base and slot options', () => {
  const character = createDefaultCharacter(era);
  assert.equal(character.archetypeId, 'warrior');
  assert.equal(character.base, 'base-a');
  assert.equal(character.slots.outfit, 'plain');
});

test('setArchetype/setBase/setSlotOption return new objects without mutating the input', () => {
  const original = createDefaultCharacter(era);

  const withArchetype = setArchetype(original, 'orator');
  assert.equal(original.archetypeId, 'warrior');
  assert.equal(withArchetype.archetypeId, 'orator');
  assert.notEqual(original, withArchetype);

  const withBase = setBase(original, 'base-b');
  assert.equal(original.base, 'base-a');
  assert.equal(withBase.base, 'base-b');

  const withSlot = setSlotOption(original, 'outfit', 'fine');
  assert.equal(original.slots.outfit, 'plain');
  assert.equal(withSlot.slots.outfit, 'fine');
});

test('findArchetype falls back to the first archetype for an unknown id', () => {
  assert.equal(findArchetype(era, 'nonexistent').id, 'warrior');
  assert.equal(findArchetype(era, 'orator').id, 'orator');
});

test('renderCharacterSVG returns a well-formed svg string reflecting the chosen base', () => {
  const character = createDefaultCharacter(era);
  const svg = renderCharacterSVG(era, character);
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.endsWith('</svg>'));
  assert.ok(svg.includes('#111'));
});
