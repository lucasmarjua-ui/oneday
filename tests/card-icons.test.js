import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyCardIcon, renderCardIconSVG } from '../shared/card-icons.js';

test('classifyCardIcon matches representative card ids from every era to a sensible category', () => {
  const samples = {
    'greece-market-haggle': 'market',
    'greece-well-water': 'water',
    'greece-bread-stall': 'food',
    'greece-wrestling-match': 'combat',
    'greece-shrine-path': 'explore',
    'greece-agora-debate': 'social',
    'greece-gymnasium-training': 'work',
    'greece-wake-stretch': 'rest',
    'neanderthal-water-source': 'water',
    'neanderthal-great-hunt': 'combat',
    'neanderthal-cave-rumor': 'explore',
    'neanderthal-fire-keeping': 'work',
    'futurecity-hydro-stand': 'water',
    'futurecity-security-patrol': 'combat',
    'futurecity-hidden-server': 'explore',
    'futurecity-boardroom-pitch': 'social',
    'futurecity-power-nap-pod': 'rest',
  };
  Object.entries(samples).forEach(([id, expected]) => {
    assert.equal(classifyCardIcon({ id }), expected, `expected ${id} -> ${expected}`);
  });
});

test('classifyCardIcon falls back to "default" for an id matching no keyword', () => {
  assert.equal(classifyCardIcon({ id: 'greece-totally-unrecognized-situation' }), 'default');
});

test('classifyCardIcon handles a missing or malformed card without throwing', () => {
  assert.equal(classifyCardIcon({}), 'default');
  assert.equal(classifyCardIcon(undefined), 'default');
});

test('renderCardIconSVG returns a well-formed svg for every known category and for an unknown one', () => {
  ['market', 'food', 'water', 'combat', 'explore', 'social', 'work', 'rest', 'default', 'nonexistent'].forEach(category => {
    const svg = renderCardIconSVG(category);
    assert.ok(svg.startsWith('<svg'));
    assert.ok(svg.endsWith('</svg>'));
  });
});
