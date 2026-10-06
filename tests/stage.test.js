// The 3D stage is driven by three pure modules: the pixel-art sprites, the
// places each card is sent to, and the direction that turns choices into
// actions. These tests pin the contracts the renderer relies on, for every era.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildFrame, POSES, SPRITE_W, SPRITE_H, OUTFITS, playerPalette, npcPalette } from '../shared/stage/sprites.js';
import { PLACES, NPC_SCENES, getPlaces, getScenes, placeForCard, showcaseScene, npcPresent } from '../shared/stage/places.js';
import { actionForOption, reactionForOutcome, deltaPopups, skyAt, mixHex, TRAIT_ACTIONS, isSpaceEvent } from '../shared/stage/direction.js';
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
  assert.equal(npcPalette('#123456', 'giza').c, '#123456');
  assert.equal(npcPalette('#123456', 'apollo-11', 'helmet').c, '#123456');
});

test('every event has a stage with unique places, starting at home, inside their scene', () => {
  eraIds.forEach(eraId => {
    const places = PLACES[eraId];
    const scenes = getScenes(eraId);
    assert.ok(places && places.length >= 4, `${eraId} needs places`);
    assert.ok(Object.keys(scenes).length >= 3, `${eraId} needs at least three scenes`);
    assert.equal(new Set(places.map(place => place.id)).size, places.length, `${eraId} has duplicate places`);
    places.forEach(place => {
      const scene = scenes[place.scene];
      assert.ok(scene, `${eraId}/${place.id} is in an unknown scene`);
      const limit = scene.kind === 'room' ? Math.min(...scene.size) / 2 - 0.5 : scene.size - 3;
      assert.ok(Math.max(Math.abs(place.pos[0]), Math.abs(place.pos[1])) <= limit || Math.hypot(...place.pos) <= limit, `${eraId}/${place.id} is too close to the edge`);
      assert.ok(place.label.en && place.label.es, `${eraId}/${place.id} needs both labels`);
      if (place.y) assert.ok(Array.isArray(place.via), `${eraId}/${place.id} is up high with no way up`);
    });
    Object.entries(scenes).forEach(([id, scene]) => {
      assert.ok(places.some(place => place.scene === id), `${eraId}/${id} is a scene nobody goes to`);
      assert.ok(Array.isArray(scene.entrance), `${eraId}/${id} needs an entrance`);
    });
  });
});

test('every day starts indoors, at home, where the alarm goes off', () => {
  eraIds.forEach(eraId => {
    const home = getPlaces(eraId)[0];
    assert.equal(getScenes(eraId)[home.scene].kind, 'room', `${eraId} starts outdoors`);
    const era = readJson(`data/eras/${eraId}/era.json`);
    const cards = readJson(`data/eras/${eraId}/cards.json`);
    const opening = cards.find(card => card.id === era.day.openingCard);
    assert.ok(opening, `${eraId} has no opening card`);
    assert.equal(placeForCard(eraId, opening).id, home.id, `${eraId} wakes up somewhere else`);
    assert.equal(opening.alarm, true, `${eraId}: no alarm on the opening card`);
  });
});

test('the title screen shows each event\'s grandest scene', () => {
  eraIds.forEach(eraId => {
    const scene = getScenes(eraId)[showcaseScene(eraId)];
    assert.ok(scene && scene.kind === 'island', `${eraId} shows off a room`);
  });
});

test('every NPC is either somewhere on stage or a voice, never lost', () => {
  eraIds.forEach(eraId => {
    const era = readJson(`data/eras/${eraId}/era.json`);
    const scenes = getScenes(eraId);
    (era.npcs || []).forEach(npc => {
      const where = NPC_SCENES[eraId]?.[npc.id];
      assert.ok(Array.isArray(where), `${npc.id} is not cast in ${eraId}`);
      where.forEach(sceneId => assert.ok(scenes[sceneId], `${npc.id} is cast in unknown scene ${sceneId}`));
    });
    Object.values(scenes).forEach(scene => (scene.cast || []).forEach(id => {
      assert.ok((era.npcs || []).some(npc => npc.id === id), `${eraId}: cast member ${id} does not exist`);
    }));
  });
  assert.equal(npcPresent('apollo-11', 'npc-houston', 'eagle'), false);
  assert.equal(npcPresent('apollo-11', 'npc-neil', 'surface'), true);
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
  assert.equal(placeForCard('apollo-11', { id: 'apollo-first-step' }).id, 'ladder');
  assert.equal(placeForCard('apollo-11', { id: 'apollo-alarm-1202' }).id, 'cabin');
  assert.equal(placeForCard('giza', { id: 'giza-sledge' }).id, 'ramp-foot');
  assert.equal(placeForCard('giza', { id: 'giza-tia-herbs' }).id, 'healer');
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

test('on Earth the day ends in night and starts with the lights off; in space it never does', () => {
  eraIds.forEach(eraId => {
    const dawn = skyAt(eraId, 0);
    const noon = skyAt(eraId, 0.4);
    const night = skyAt(eraId, 1);
    [dawn, noon, night].forEach(sky => assert.match(sky.top, /^#[0-9a-f]{6}$/));
    if (isSpaceEvent(eraId)) {
      [dawn, noon, night].forEach(sky => assert.equal(sky.night, 0, `${eraId}: no night in space`));
      return;
    }
    assert.ok(noon.sun > night.sun, `${eraId}: noon should be brighter than night`);
    assert.ok(night.night > 0.9, `${eraId}: the lamps should be on at the end of the day`);
    assert.ok(noon.night === 0, `${eraId}: no lamps at noon`);
    assert.ok(dawn.sunAngle < night.sunAngle, `${eraId}: the sun crosses the sky`);
  });
  assert.deepEqual(skyAt('giza', -1), skyAt('giza', 0));
  assert.deepEqual(skyAt('giza', 2), skyAt('giza', 1));
});
