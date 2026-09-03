const KEY = 'oneday.character';

const SHAPE_RENDERERS = {
  'none': () => '',
  'tunic-plain': color => `<rect x="65" y="100" width="70" height="95" rx="16" fill="${color}" /><rect x="65" y="100" width="70" height="16" rx="8" fill="${color}" opacity="0.75" />`,
  'tunic-fine': color => `<rect x="65" y="100" width="70" height="95" rx="16" fill="${color}" /><rect x="65" y="100" width="70" height="16" rx="8" fill="${color}" opacity="0.75" /><rect x="70" y="128" width="60" height="10" fill="#c9a24b" />`,
  'laurel': color => `<g>${[-24, -14, -4, 6, 16, 24].map(dx => `<ellipse cx="${100 + dx}" cy="${34 - Math.abs(dx) * 0.15}" rx="7" ry="3" fill="${color}" transform="rotate(${dx * 2} ${100 + dx} 34)" />`).join('')}</g>`,
  'petasos': color => `<ellipse cx="100" cy="38" rx="34" ry="9" fill="${color}" /><ellipse cx="100" cy="30" rx="15" ry="10" fill="${color}" />`,
  'staff': color => `<rect x="150" y="55" width="6" height="145" rx="3" fill="${color}" />`,
  'shield': color => `<circle cx="45" cy="150" r="22" fill="${color}" stroke="#3a2c1a" stroke-width="3" /><circle cx="45" cy="150" r="10" fill="none" stroke="#3a2c1a" stroke-width="2" />`,
  'lyre': color => `<rect x="140" y="120" width="20" height="30" rx="4" fill="${color}" /><rect x="136" y="98" width="4" height="42" fill="${color}" /><rect x="164" y="98" width="4" height="42" fill="${color}" />`,
  'jumpsuit': (color, accent) => `<rect x="65" y="100" width="70" height="95" rx="10" fill="${color}" /><rect x="97" y="103" width="6" height="88" rx="3" fill="${accent || color}" />`,
  'visor': (color, accent) => `<rect x="72" y="50" width="56" height="12" rx="6" fill="${color}" /><rect x="76" y="54" width="48" height="4" rx="2" fill="${accent || color}" />`,
  'earpiece-hud': (color, accent) => `<circle cx="127" cy="55" r="7" fill="${color}" /><circle cx="127" cy="55" r="3" fill="${accent || color}" />`,
  'datapad': (color, accent) => `<rect x="144" y="118" width="20" height="28" rx="3" fill="${color}" /><rect x="147" y="122" width="14" height="10" fill="${accent || color}" />`,
  'drone': (color, accent) => `<circle cx="158" cy="85" r="11" fill="${color}" /><rect x="140" y="83" width="34" height="3" rx="1.5" fill="${accent || color}" opacity="0.8" /><circle cx="158" cy="85" r="4" fill="${accent || color}" />`,
};

function renderShape(shapeId, color, accentColor) {
  const renderer = SHAPE_RENDERERS[shapeId] || SHAPE_RENDERERS.none;
  return renderer(color, accentColor);
}

function findOption(era, slotId, optionId) {
  const slot = era.character.slots.find(s => s.id === slotId);
  return slot?.options.find(o => o.id === optionId) || slot?.options[0];
}

function findBase(era, baseId) {
  return era.character.bases.find(b => b.id === baseId) || era.character.bases[0];
}

export function findArchetype(era, archetypeId) {
  return era.archetypes.find(a => a.id === archetypeId) || era.archetypes[0];
}

export function createDefaultCharacter(era) {
  return {
    eraId: era.id,
    archetypeId: era.archetypes[0].id,
    base: era.character.bases[0].id,
    slots: Object.fromEntries(era.character.slots.map(slot => [slot.id, slot.options[0].id])),
  };
}

export function setArchetype(character, archetypeId) {
  return { ...character, archetypeId };
}

export function setBase(character, baseId) {
  return { ...character, base: baseId };
}

export function setSlotOption(character, slotId, optionId) {
  return { ...character, slots: { ...character.slots, [slotId]: optionId } };
}

export function renderCharacterSVG(era, character, { size = 200 } = {}) {
  const base = findBase(era, character.base);
  const layers = [
    `<ellipse cx="100" cy="60" rx="26" ry="30" fill="${base.skinColor}" />` +
    `<rect x="70" y="95" width="60" height="90" rx="14" fill="${base.skinColor}" />` +
    `<rect x="55" y="100" width="18" height="70" rx="9" fill="${base.skinColor}" />` +
    `<rect x="127" y="100" width="18" height="70" rx="9" fill="${base.skinColor}" />` +
    `<rect x="78" y="180" width="18" height="60" rx="8" fill="${base.skinColor}" />` +
    `<rect x="104" y="180" width="18" height="60" rx="8" fill="${base.skinColor}" />`,
  ];
  era.character.slots.forEach(slot => {
    const option = findOption(era, slot.id, character.slots[slot.id]);
    if (option) layers.push(renderShape(option.shape, option.color, option.accentColor));
  });
  return `<svg viewBox="0 0 200 260" width="${size}" height="${size * 1.3}" xmlns="http://www.w3.org/2000/svg">${layers.join('')}</svg>`;
}

export function saveCharacter(eraId, character) {
  const all = readAll();
  all[eraId] = character;
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent('characterchange', { detail: all }));
}

export function loadCharacter(eraId) {
  const all = readAll();
  return all[eraId] || null;
}

function readAll() {
  try { const value = JSON.parse(localStorage.getItem(KEY) || '{}'); return typeof value === 'object' && value ? value : {}; }
  catch { return {}; }
}
