import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findNpc, renderNpcPortraitSVG } from '../shared/npc.js';

const era = {
  npcs: [
    { id: 'npc-thales', name: { en: 'Thales', es: 'Tales' }, portraitColor: '#b1502a', attitudeCounter: 'merchantTrust' },
  ],
};

test('findNpc returns the matching NPC by id', () => {
  assert.equal(findNpc(era, 'npc-thales').name.en, 'Thales');
});

test('findNpc returns null for an unknown id or a missing npcs list', () => {
  assert.equal(findNpc(era, 'npc-nobody'), null);
  assert.equal(findNpc({}, 'npc-thales'), null);
});

test('renderNpcPortraitSVG renders that NPC\'s portrait color', () => {
  const svg = renderNpcPortraitSVG(era.npcs[0]);
  assert.match(svg, /<svg/);
  assert.match(svg, /#b1502a/);
});

test('renderNpcPortraitSVG falls back to a default color for a missing NPC', () => {
  const svg = renderNpcPortraitSVG(null);
  assert.match(svg, /<svg/);
});
