// The 3D stage is driven by three pure modules: the pixel-art sprites, the
// places each card is sent to, and the direction that turns choices into
// actions. These tests pin the contracts the renderer relies on, for every era.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildFrame, POSES, SPRITE_W, SPRITE_H, OUTFITS, playerPalette, npcPalette } from '../shared/stage/sprites.js';
import { PLACES, getPlaces, placeForCard } from '../shared/stage/places.js';
import { actionForOption, reactionForOutcome, deltaPopups, skyAt, mixHex, TRAIT_ACTIONS } from '../shared/stage/direction.js';
import { ERAS } from '../shared/era-registry.js';
import { TRAITS } from '../shared/persona.js';

const here = dirname(fileURLToPath(import.meta.url));
const readJson = path => JSON.parse(readFileSync(join(here, '..', path), 'utf8'));
const eraIds = ERAS.filter(era => era.available).map(era => era.id);

test('every pose is a full 16x24 frame', () => {
  Object.keys(POSES).forEach(pose => {
    const frame = buildFrame(pose);
    assert.equal(frame.length, SPRITE_H, `${pose} height`);
    frame.forEach(row => assert.equal(row.length, SPRITE_W, `${pose} width`));
  });
});

test('an unknown pose is an error, not a blank sprite', () => {
  assert.throws(() => buildFrame('moonwalk'));
});

test('every pixel of every pose has a colour in every era palette and in NPC palettes', () => {
  const used = new Set(Object.keys(POSES).flatMap(pose => buildFrame(pose).join('').split('')));
  used.delete('.');
  eraIds.forEach(eraId => {
    [playerPalette(eraId), npcPalette('#7a5cc7', eraId)].forEach(palette => {
      used.forEach(key => assert.match(palette[key] || '', /^#[0-9a-f]{6}$/i, `${eraId} palette misses "${key}"`));
    });
  });
});

test('each era dresses the player differently', () => {
  eraIds.forEach(eraId => assert.ok(OUTFITS[eraId], `no outfit for ${eraId}`));
  const outfits = new Set(eraIds.map(eraId => JSON.stringify(OUTFITS[eraId])));
  assert.equal(outfits.size, eraIds.length);
});

test('an NPC wears their own colour', () => {
  assert.equal(npcPalette('#123456', 'edo').c, '#123456');
});

test('every era has a stage with unique places, starting at home, inside the island', () => {
  eraIds.forEach(eraId => {
    const places = PLACES[eraId];
    assert.ok(places && places.length >= 4, `${eraId} needs places`);
    assert.equal(new Set(places.map(place => place.id)).size, places.length, `${eraId} has duplicate places`);
    places.forEach(place => {
      assert.ok(Math.hypot(...place.pos) <= 8, `${eraId}/${place.id} is too close to the edge`);
      assert.ok(place.label.en && place.label.es, `${eraId}/${place.id} needs both labels`);
    });
  });
});

test('every NPC has a home on the stage', () => {
  eraIds.forEach(eraId => {
    const era = readJson(`data/eras/${eraId}/era.json`);
    (era.npcs || []).forEach(npc => {
      assert.ok(getPlaces(eraId).some(place => (place.npcs || []).includes(npc.id)), `${npc.id} has no place in ${eraId}`);
    });
  });
});

test('every card maps to a place, the same one every time', () => {
  eraIds.forEach(eraId => {
    const cards = readJson(`data/eras/${eraId}/cards.json`);
    const ids = new Set(getPlaces(eraId).map(place => place.id));
    cards.forEach(card => {
      const place = placeForCard(eraId, card);
      assert.ok(ids.has(place.id), `${card.id} went nowhere`);
      assert.equal(placeForCard(eraId, card).id, place.id);
    });
  });
});

test('cards are sent where their words say', () => {
  assert.equal(placeForCard('greece', { id: 'greece-temple-offering' }).id, 'temple');
  assert.equal(placeForCard('edo', { id: 'edo-canal-boat' }).id, 'canal');
  assert.equal(placeForCard('mars', { id: 'mars-greenhouse' }).id, 'greenhouse');
  assert.equal(placeForCard('greece', { id: 'anything', npcId: 'npc-kleon' }).id, 'assembly');
});

test('cards are spread across the stage, not piled in one place', () => {
  eraIds.forEach(eraId => {
    const cards = readJson(`data/eras/${eraId}/cards.json`);
    const visited = new Set(cards.map(card => placeForCard(eraId, card).id));
    assert.ok(visited.size >= getPlaces(eraId).length - 1, `${eraId} only uses ${[...visited].join(', ')}`);
  });
});

test('each trait has its own body language', () => {
  TRAITS.forEach(trait => assert.ok(TRAIT_ACTIONS[trait], `no action for ${trait}`));
  assert.equal(new Set(Object.values(TRAIT_ACTIONS)).size, TRAITS.length);
  assert.equal(actionForOption({ traits: { bold: 1 } }), 'dash');
  assert.equal(actionForOption({ traits: { prudent: 1, curious: 2 } }), 'inspect');
  assert.equal(actionForOption({}), 'wait');
});

test('every option in every era resolves to a known action', () => {
  const known = new Set([...Object.values(TRAIT_ACTIONS), 'wait']);
  eraIds.forEach(eraId => {
    readJson(`data/eras/${eraId}/cards.json`).forEach(card => {
      card.options.forEach(option => assert.ok(known.has(actionForOption(option)), `${card.id}/${option.id}`));
    });
  });
});

test('only real gambles get a big reaction', () => {
  assert.equal(reactionForOutcome({ hasChance: true, success: true }), 'cheer');
  assert.equal(reactionForOutcome({ hasChance: true, success: false }), 'stumble');
  assert.equal(reactionForOutcome({ hasChance: false, success: true }), 'nod');
});

test('resource popups skip zero changes and unknown resources', () => {
  const resources = { energy: { label: { en: 'Energy' } }, currency: { label: { en: 'Coin' } } };
  const popups = deltaPopups({ energy: -12, currency: 5, ghost: 3, hunger: 0 }, resources);
  assert.deepEqual(popups, [
    { key: 'energy', text: '-12 Energy', good: false },
    { key: 'currency', text: '+5 Coin', good: true },
  ]);
});

test('colours mix from one end to the other', () => {
  assert.equal(mixHex('#000000', '#ffffff', 0), '#000000');
  assert.equal(mixHex('#000000', '#ffffff', 1), '#ffffff');
  assert.equal(mixHex('#000000', '#ffffff', 0.5), '#808080');
});

test('the day ends in night in every era, and starts with the lights off', () => {
  eraIds.forEach(eraId => {
    const dawn = skyAt(eraId, 0);
    const noon = skyAt(eraId, 0.4);
    const night = skyAt(eraId, 1);
    assert.ok(noon.sun > night.sun, `${eraId}: noon should be brighter than night`);
    assert.ok(night.night > 0.9, `${eraId}: the lamps should be on at the end of the day`);
    assert.ok(noon.night === 0, `${eraId}: no lamps at noon`);
    assert.ok(dawn.sunAngle < night.sunAngle, `${eraId}: the sun crosses the sky`);
    [dawn, noon, night].forEach(sky => assert.match(sky.top, /^#[0-9a-f]{6}$/));
  });
  assert.deepEqual(skyAt('greece', -1), skyAt('greece', 0));
  assert.deepEqual(skyAt('greece', 2), skyAt('greece', 1));
});
