// Where on the stage each card happens. Every era's diorama has a handful of
// landmarks; a card is sent to the first landmark whose keywords appear in its
// id (or that its NPC belongs to), so the character walks to the agora to
// haggle and to the temple to make an offering. Cards that match nothing are
// spread across landmarks by a stable hash, so the same card always plays out
// in the same place. Positions are diorama coordinates (x, z) on a 24x24 island.

export const PLACES = {
  greece: [
    { id: 'home', label: { en: 'Your home', es: 'Tu casa' }, pos: [-5.5, 4.5], keywords: ['wake', 'family', 'sick-neighbor', 'night-watch'] },
    { id: 'agora', label: { en: 'The agora', es: 'El ágora' }, pos: [0, 1.5], keywords: ['agora', 'market', 'bread', 'thief', 'beggar', 'performer', 'dice', 'spartan', 'craftsman', 'potter', 'merchant'], npcs: ['npc-thales'] },
    { id: 'assembly', label: { en: 'The Pnyx', es: 'La Pnyx' }, pos: [4.5, -1.5], keywords: ['assembly', 'ostracism', 'dispute', 'kleon', 'philosopher', 'sophia', 'scroll'], npcs: ['npc-kleon', 'npc-sophia'] },
    { id: 'temple', label: { en: 'The temple', es: 'El templo' }, pos: [-2.5, -5.5], keywords: ['temple', 'athena', 'oracle', 'festival', 'stargazer'] },
    { id: 'gymnasium', label: { en: 'The gymnasium', es: 'El gimnasio' }, pos: [-5.5, -1], keywords: ['gymnasium', 'wrestling', 'theatre', 'poetry', 'symposium', 'tavern'] },
    { id: 'harbor', label: { en: 'Piraeus harbour', es: 'El puerto del Pireo' }, pos: [5.5, 5.5], keywords: ['fisherman', 'piraeus', 'well'] },
    { id: 'grove', label: { en: 'The olive hills', es: 'Las colinas de olivos' }, pos: [4, -6], keywords: ['olive', 'shrine'] },
  ],
  cordoba: [
    { id: 'home', label: { en: 'Your courtyard', es: 'Tu patio' }, pos: [-5.5, 4.5], keywords: ['wake', 'orphan'] },
    { id: 'souk', label: { en: 'The souk', es: 'El zoco' }, pos: [1, 2.5], keywords: ['souk', 'yusuf', 'bread', 'lamp', 'silk', 'thief'], npcs: ['npc-yusuf'] },
    { id: 'library', label: { en: 'The library', es: 'La biblioteca' }, pos: [4.5, -2.5], keywords: ['library', 'lubna', 'astrolabe', 'poetry'], npcs: ['npc-lubna'] },
    { id: 'clinic', label: { en: 'The clinic', es: 'La clínica' }, pos: [-4.5, -1.5], keywords: ['marwan', 'bathhouse'], npcs: ['npc-marwan'] },
    { id: 'mosque', label: { en: 'The Great Mosque', es: 'La Mezquita' }, pos: [-1, -5.5], keywords: ['mosque', 'caliph'] },
    { id: 'river', label: { en: 'The Guadalquivir', es: 'El Guadalquivir' }, pos: [5.5, 5.5], keywords: ['river', 'water', 'tannery'] },
  ],
  edo: [
    { id: 'home', label: { en: 'Your tenement', es: 'Tu casa de vecinos' }, pos: [-5.5, 4.5], keywords: ['wake', 'night-return', 'well'] },
    { id: 'market', label: { en: 'Nihonbashi market', es: 'El mercado de Nihonbashi' }, pos: [1, 2.5], keywords: ['miso', 'fish', 'soba', 'rice', 'pickpocket', 'dice', 'dutch', 'doctor', 'woodblock', 'paper', 'daimyo', 'horse'] },
    { id: 'temple', label: { en: 'Sensoji temple', es: 'El templo Sensoji' }, pos: [-1.5, -5.5], keywords: ['temple', 'tetsuo', 'shrine', 'garden', 'moon'], npcs: ['npc-tetsuo'] },
    { id: 'teahouse', label: { en: 'The tea-house', es: 'La casa de té' }, pos: [4.5, -2.5], keywords: ['hana', 'kabuki', 'bathhouse'], npcs: ['npc-hana'] },
    { id: 'street', label: { en: 'The fire-watch street', es: 'La calle de la guardia' }, pos: [-4.5, -1], keywords: ['saburo', 'sumo', 'fire'], npcs: ['npc-saburo'] },
    { id: 'canal', label: { en: 'The canal', es: 'El canal' }, pos: [5.5, 5.5], keywords: ['canal'] },
  ],
  neanderthal: [
    { id: 'camp', label: { en: 'The camp fire', es: 'La hoguera' }, pos: [-2.5, 3], keywords: ['wake', 'fire', 'share', 'ember', 'child', 'elder', 'stranger', 'night', 'burial', 'storm', 'injured', 'spear'], npcs: ['npc-ember'] },
    { id: 'cave', label: { en: 'The cave', es: 'La cueva' }, pos: [-4.5, -4.5], keywords: ['cave', 'kaia', 'shaman', 'fever'], npcs: ['npc-kaia'] },
    { id: 'forest', label: { en: 'The forest edge', es: 'El linde del bosque' }, pos: [4.5, -4], keywords: ['forag', 'berry', 'honey', 'flint', 'wolf', 'lost'] },
    { id: 'hunt', label: { en: 'The hunting grounds', es: 'El cazadero' }, pos: [4.5, 2.5], keywords: ['hunt', 'beast', 'deer', 'boar', 'predator', 'thorn', 'tracks'], npcs: ['npc-thorn'] },
    { id: 'river', label: { en: 'The river', es: 'El río' }, pos: [1, 6], keywords: ['water', 'river', 'ice', 'hide', 'tool'] },
  ],
  'future-city': [
    { id: 'pod', label: { en: 'Your sleep pod', es: 'Tu cápsula' }, pos: [-5.5, 4.5], keywords: ['wake', 'nap', 'memory', 'gene'] },
    { id: 'street', label: { en: 'Street level', es: 'A pie de calle' }, pos: [0, 2.5], keywords: ['street-market', 'diner', 'hydro', 'ramen', 'overclock', 'elder', 'charity', 'runner', 'arcade', 'broker', 'nyx'], npcs: ['npc-nyx'] },
    { id: 'tower', label: { en: 'Corporate tower', es: 'La torre corporativa' }, pos: [4.5, -3], keywords: ['boardroom', 'office', 'vance', 'recruiter', 'algorithm', 'crypto', 'union'], npcs: ['npc-vance'] },
    { id: 'rooftop', label: { en: 'The rooftops', es: 'Las azoteas' }, pos: [-4, -4.5], keywords: ['rooftop', 'farm', 'drone', 'billboard'] },
    { id: 'underground', label: { en: 'The server district', es: 'El distrito de servidores' }, pos: [4.5, 4.5], keywords: ['server', 'network', 'echo', 'blackout', 'coolant', 'traffic', 'security', 'gig'], npcs: ['npc-echo'] },
  ],
  mars: [
    { id: 'habitat', label: { en: 'Habitat ring', es: 'El anillo habitable' }, pos: [-4, 3], keywords: ['wake', 'ration', 'earth', 'arrival', 'council', 'quota', 'inventory', 'observation'] },
    { id: 'clinic', label: { en: 'Med bay', es: 'La enfermería' }, pos: [-5.5, -3], keywords: ['clinic', 'okonkwo', 'suit'], npcs: ['npc-okonkwo'] },
    { id: 'lifesupport', label: { en: 'Life support', es: 'Soporte vital' }, pos: [1.5, -4.5], keywords: ['scrubber', 'rask', 'oxygen', 'hull', 'recycler'], npcs: ['npc-rask'] },
    { id: 'greenhouse', label: { en: 'The greenhouse', es: 'El invernadero' }, pos: [5.5, -1], keywords: ['greenhouse'] },
    { id: 'surface', label: { en: 'The surface', es: 'La superficie' }, pos: [4, 5.5], keywords: ['piper', 'ice', 'dust', 'derelict', 'rover', 'eva'], npcs: ['npc-piper'] },
  ],
};

export function getPlaces(eraId) {
  return PLACES[eraId] || PLACES.greece;
}

export function getHomePlace(eraId) {
  return getPlaces(eraId)[0];
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
  if (card.npcId) {
    const byNpc = places.find(place => (place.npcs || []).includes(card.npcId));
    if (byNpc) return byNpc;
  }
  const id = String(card.id || '');
  const byKeyword = places.find(place => place.keywords.some(keyword => id.includes(keyword)));
  if (byKeyword) return byKeyword;
  return places[stableHash(id) % places.length];
}
