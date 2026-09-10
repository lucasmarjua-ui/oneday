// Who the day turned you into. Every option a player picks can carry a
// small `traits` delta (e.g. { bold: 1 }); they accumulate over the day in
// dayState.traits, and at the end the era's persona whose trait you leaned
// into most is revealed. There is no class chosen up front -- the persona is
// only ever read backwards from what you actually did.
export const TRAITS = ['bold', 'prudent', 'generous', 'cunning', 'diligent', 'curious'];

export function rankTraits(traits = {}) {
  return TRAITS
    .map(trait => ({ trait, value: traits[trait] || 0 }))
    .filter(entry => entry.value > 0)
    .sort((a, b) => b.value - a.value);
}

// Ties resolve in the order the era lists its personas, and a day with no
// leaning at all falls back to the era's trait-less persona (declared with
// `trait: null`), so this never returns undefined for a well-formed era.
export function resolvePersona(era, traits = {}) {
  const personas = era.personas || [];
  let best = null;
  let bestValue = 0;
  personas.forEach(persona => {
    if (!persona.trait) return;
    const value = traits[persona.trait] || 0;
    if (value > bestValue) { best = persona; bestValue = value; }
  });
  return best || personas.find(persona => !persona.trait) || personas[0] || null;
}
