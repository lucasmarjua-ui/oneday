// Each era is pure content: two JSON files plus one entry here. `accent` is
// the only visual property an era carries -- a single hue the redesigned
// interface tints itself with while you're inside that world.
export const ERAS = [
  {
    id: 'greece',
    name: { en: 'Ancient Greece', es: 'Antigua Grecia' },
    tagline: { en: 'Rise from citizen to legend in one day in the agora.', es: 'Asciende de ciudadano a leyenda en un día en el ágora.' },
    year: { en: '440 BC', es: '440 a.C.' },
    accent: 28,
    configPath: './data/eras/greece/era.json',
    cardsPath: './data/eras/greece/cards.json',
    available: true,
  },
  {
    id: 'cordoba',
    name: { en: 'Córdoba, 961', es: 'Córdoba, 961' },
    tagline: { en: 'One day in the greatest city in Europe, between the library and the tanneries.', es: 'Un día en la mayor ciudad de Europa, entre la biblioteca y las tenerías.' },
    year: { en: '961 AD', es: '961 d.C.' },
    accent: 158,
    configPath: './data/eras/cordoba/era.json',
    cardsPath: './data/eras/cordoba/cards.json',
    available: true,
  },
  {
    id: 'edo',
    name: { en: 'Edo, 1750', es: 'Edo, 1750' },
    tagline: { en: "One day in the shogun's capital, from the temple bell to the fire watch.", es: 'Un día en la capital del shogun, de la campana del templo a la guardia de incendios.' },
    year: { en: '1750', es: '1750' },
    accent: 348,
    configPath: './data/eras/edo/era.json',
    cardsPath: './data/eras/edo/cards.json',
    available: true,
  },
  {
    id: 'neanderthal',
    name: { en: 'Neanderthals', es: 'Neandertales' },
    tagline: { en: 'Survive one day at the edge of the wild.', es: 'Sobrevive un día al filo de lo salvaje.' },
    year: { en: '50,000 BC', es: '50.000 a.C.' },
    accent: 18,
    configPath: './data/eras/neanderthal/era.json',
    cardsPath: './data/eras/neanderthal/cards.json',
    available: true,
  },
  {
    id: 'future-city',
    name: { en: 'Futuristic City', es: 'Ciudad Futurista' },
    tagline: { en: 'Hustle, hack and climb in a city that never logs off.', es: 'Búscate la vida, hackea y asciende en una ciudad que nunca se desconecta.' },
    year: { en: '2088', es: '2088' },
    accent: 288,
    configPath: './data/eras/future-city/era.json',
    cardsPath: './data/eras/future-city/cards.json',
    available: true,
  },
  {
    id: 'mars',
    name: { en: 'Mars Colony', es: 'Colonia de Marte' },
    tagline: { en: 'One sol in Ares Station, where every choice costs oxygen.', es: 'Un sol en la Estación Ares, donde cada decisión cuesta oxígeno.' },
    year: { en: '2140', es: '2140' },
    accent: 12,
    configPath: './data/eras/mars/era.json',
    cardsPath: './data/eras/mars/cards.json',
    available: true,
  },
];

export function getEraMeta(eraId) {
  return ERAS.find(era => era.id === eraId) || null;
}

export async function loadEra(eraId) {
  const meta = getEraMeta(eraId);
  if (!meta || !meta.available) throw new Error(`Era not available: ${eraId}`);
  const [era, cards] = await Promise.all([
    fetch(meta.configPath).then(response => response.json()),
    fetch(meta.cardsPath).then(response => response.json()),
  ]);
  return { era, cards };
}
