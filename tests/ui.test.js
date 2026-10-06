// The interface's pure helpers: pixel icons and player settings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { icon, resourceIcon, ICON_NAMES } from '../shared/ui/icons.js';
import { getSettings, updateSettings, typingDelay, TEXT_SPEEDS } from '../shared/ui/settings.js';
import { ERAS } from '../shared/era-registry.js';

const here = dirname(fileURLToPath(import.meta.url));
const readJson = path => JSON.parse(readFileSync(join(here, '..', path), 'utf8'));

test('every resource in every era has its own HUD icon', () => {
  ERAS.filter(era => era.available).forEach(meta => {
    const era = readJson(`data/eras/${meta.id}/era.json`);
    Object.keys(era.resources).forEach(key => {
      assert.ok(ICON_NAMES.includes(key), `${meta.id}: no icon for "${key}"`);
    });
  });
});

test('icons are crisp SVG sized in whole pixels', () => {
  ICON_NAMES.forEach(name => {
    const svg = icon(name, 3);
    assert.match(svg, /^<svg [^>]*shape-rendering="crispEdges"/);
    const width = Number(svg.match(/width="(\d+)"/)[1]);
    const viewWidth = Number(svg.match(/viewBox="0 0 (\d+) /)[1]);
    assert.equal(width, viewWidth * 3, `${name} is not drawn at a whole scale`);
    assert.ok((svg.match(/<rect /g) || []).length > 3, `${name} is empty`);
  });
});

test('an unknown resource still gets an icon', () => {
  assert.match(resourceIcon('mystery'), /<svg/);
});

test('settings start sensible and accept changes', () => {
  const defaults = getSettings();
  assert.equal(defaults.music, true);
  assert.equal(defaults.sfx, true);
  assert.equal(typingDelay(), TEXT_SPEEDS.normal);
  updateSettings({ textSpeed: 'fast' });
  assert.equal(typingDelay(), TEXT_SPEEDS.fast);
  assert.ok(TEXT_SPEEDS.fast < TEXT_SPEEDS.normal && TEXT_SPEEDS.normal < TEXT_SPEEDS.slow);
  updateSettings({ textSpeed: 'normal' });
});
