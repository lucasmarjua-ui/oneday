// Where each card happens. An event is told across several scenes (a cabin,
// a harbour, the Moon's surface...), each its own small diorama; a scene has
// one or more spots the character walks to. A card goes to the first place
// whose keywords appear in its id; cards that match nothing fall back to a
// stable hash, so the same card always plays out in the same place.
// The first place of every event is where the day starts: waking up.

export const SCENES = {
  'apollo-11': {
    columbia: { kind: 'room', size: [7, 6], interior: true, entrance: [1, 1], cast: ['npc-neil', 'npc-collins'], outfit: 'cabin' },
    eagle: { kind: 'room', size: [6, 5], interior: true, entrance: [1, 1], cast: ['npc-neil'], outfit: 'cabin' },
    surface: { kind: 'island', size: 11, space: true, entrance: [-2, 2], cast: ['npc-neil'], outfit: 'helmet', showcase: true },
  },
  giza: {
    house: { kind: 'room', size: [7, 6], interior: true, entrance: [1.5, 1.5], cast: [] },
    village: { kind: 'island', size: 10, entrance: [-4, 4], crowd: 4 },
    harbour: { kind: 'island', size: 10, entrance: [-4, 4], crowd: 3 },
    quarry: { kind: 'island', size: 9, entrance: [-3, 4], crowd: 3 },
    pyramid: { kind: 'island', size: 12, entrance: [-6, 5], crowd: 4, showcase: true },
  },
};

// Which NPCs are physically present in which scenes. Anyone else speaks over
// the radio or from afar: their name shows, no body appears.
export const NPC_SCENES = {
  'apollo-11': { 'npc-neil': ['columbia', 'eagle', 'surface'], 'npc-collins': ['columbia'], 'npc-houston': [] },
  giza: { 'npc-hemiunu': ['village', 'pyramid'], 'npc-merer': ['harbour'], 'npc-tia': ['village', 'pyramid', 'quarry'] },
};

export const PLACES = {
  'apollo-11': [
    { id: 'bunk', scene: 'columbia', label: { en: 'Columbia, lunar orbit', es: 'Columbia, órbita lunar' }, pos: [-1, -1], keywords: ['wake', 'breakfast', 'neil-photos', 'suitup', 'transfer', 'undock', 'earthrise', 'home-burn', 'abort-dock', 'abort-tv'] },
    { id: 'cabin', scene: 'eagle', label: { en: 'Eagle', es: 'Eagle' }, pos: [0, 0], keywords: ['doi', 'pdi', 'alarm', 'boulders', 'sixty', 'contact', 'stay', 'west-crater', 'rest', 'communion', 'breaker', 'abort-climb', 'collins-alone', 'dust'] },
    { id: 'ladder', scene: 'surface', label: { en: 'Tranquility Base', es: 'Base Tranquilidad' }, pos: [-0.5, 1.5], keywords: ['hatch', 'first-step', 'magnificent', 'plaque', 'nixon'] },
    { id: 'flag', scene: 'surface', label: { en: 'Tranquility Base', es: 'Base Tranquilidad' }, pos: [2.5, 2.5], keywords: ['flag', 'earth', 'footprint'] },
    { id: 'experiments', scene: 'surface', label: { en: 'Tranquility Base', es: 'Base Tranquilidad' }, pos: [3, -2], keywords: ['experiments', 'samples'] },
  ],
  giza: [
    { id: 'house', scene: 'house', label: { en: 'Your house, workers\' town', es: 'Tu casa, poblado de obreros' }, pos: [-1, -1], keywords: ['wake'] },
    { id: 'bakery', scene: 'village', label: { en: 'The bakery', es: 'La panadería' }, pos: [1, -1], keywords: ['bread', 'grumble', 'orders', 'scribe'] },
    { id: 'healer', scene: 'village', label: { en: 'Tia\'s courtyard', es: 'El patio de Tia' }, pos: [-2.5, 1.5], keywords: ['tia'] },
    { id: 'harbour', scene: 'harbour', label: { en: 'The harbour basin', es: 'La dársena del puerto' }, pos: [0, 1], keywords: ['harbour', 'merer', 'casing'] },
    { id: 'quarry', scene: 'quarry', label: { en: 'The quarry', es: 'La cantera' }, pos: [0, 1], keywords: ['quarry', 'cubit'] },
    { id: 'ramp-foot', scene: 'pyramid', label: { en: 'Foot of the ramp', es: 'Pie de la rampa' }, pos: [-3, 4], keywords: ['sledge', 'ramp', 'heat', 'north', 'boat-pit', 'accident'] },
    { id: 'summit', scene: 'pyramid', label: { en: 'Above the King\'s Chamber', es: 'Sobre la Cámara del Rey' }, pos: [2, -2], y: 5.5, via: [-2.4, 3.3], keywords: ['crack', 'set', 'graffiti', 'tomb', 'sunset'] },
  ],
};

export function getPlaces(eraId) {
  return PLACES[eraId] || [];
}

export function getScenes(eraId) {
  return SCENES[eraId] || {};
}

export function getHomePlace(eraId) {
  return getPlaces(eraId)[0];
}

export function showcaseScene(eraId) {
  const scenes = getScenes(eraId);
  return Object.keys(scenes).find(id => scenes[id].showcase) || Object.keys(scenes)[0];
}

/** Is this NPC physically present in this scene (rather than a voice)? */
export function npcPresent(eraId, npcId, sceneId) {
  return (NPC_SCENES[eraId]?.[npcId] || []).includes(sceneId);
}

function stableHash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function placeForCard(eraId, card) {
  const places = getPlaces(eraId);
  if (!card) return places[0];
  const id = String(card.id || '');
  const byKeyword = places.find(place => place.keywords.some(keyword => id.includes(keyword)));
  if (byKeyword) return byKeyword;
  return places[stableHash(id) % places.length];
}
