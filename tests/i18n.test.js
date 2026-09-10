// The interface is bilingual by contract, not by good intentions: these
// tests fail if a string is added to one language and not the other, or if a
// page asks for a key that does not exist in the bundles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = relativePath => readFileSync(join(here, '..', relativePath), 'utf8');
const en = JSON.parse(read('data/i18n/en.json'));
const es = JSON.parse(read('data/i18n/es.json'));
const pages = ['index.html', 'game.html'].map(name => ({ name, source: read(name) }));

test('both language bundles declare exactly the same keys', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
});

test('no interface string is left empty or untranslated by omission', () => {
  Object.entries(en).forEach(([key, value]) => {
    assert.ok(typeof value === 'string' && value.trim().length > 0, `en.${key} is empty`);
    assert.ok(typeof es[key] === 'string' && es[key].trim().length > 0, `es.${key} is empty`);
  });
});

test('a string with placeholders keeps the same placeholders in both languages', () => {
  const placeholders = value => (value.match(/\{[a-zA-Z]+\}/g) || []).sort();
  Object.keys(en).forEach(key => {
    assert.deepEqual(placeholders(en[key]), placeholders(es[key]), `placeholders differ for "${key}"`);
  });
});

test('every data-i18n attribute in the pages resolves to a real key', () => {
  pages.forEach(({ name, source }) => {
    const used = [...source.matchAll(/data-i18n="([^"]+)"/g)].map(match => match[1]);
    assert.ok(used.length > 0, `${name} should localize something`);
    used.forEach(key => assert.ok(key in en, `${name} uses missing key "${key}"`));
  });
});

test('every t() lookup in the pages resolves to a real key', () => {
  pages.forEach(({ name, source }) => {
    const used = [...source.matchAll(/\bt\('([a-zA-Z][\w.]*)'/g)].map(match => match[1]);
    assert.ok(used.length > 0, `${name} should look up strings`);
    used.forEach(key => assert.ok(key in en, `${name} looks up missing key "${key}"`));
  });
});

test('the trait vocabulary the summary screen reads is fully translated', () => {
  ['bold', 'prudent', 'generous', 'cunning', 'diligent', 'curious'].forEach(trait => {
    assert.ok(`trait.${trait}` in en, `missing trait.${trait} in English`);
    assert.ok(`trait.${trait}` in es, `missing trait.${trait} in Spanish`);
  });
});

test('no key is declared in the bundles but used nowhere in the interface', () => {
  const source = pages.map(page => page.source).join('\n');
  // Some families are looked up dynamically (t(`trait.${name}`)); a key is
  // considered used if it is quoted literally or falls under such a prefix.
  const dynamicPrefixes = [...source.matchAll(/\bt\(`([\w.]*?)\$\{/g)].map(match => match[1]);
  const unused = Object.keys(en).filter(key =>
    !source.includes(`'${key}'`) &&
    !source.includes(`"${key}"`) &&
    !dynamicPrefixes.some(prefix => prefix && key.startsWith(prefix)));
  assert.deepEqual(unused, [], `unused i18n keys: ${unused.join(', ')}`);
});
