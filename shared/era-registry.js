export const ERAS = [
  {
    id: 'greece',
    name: { en: 'Ancient Greece', es: 'Antigua Grecia' },
    tagline: { en: 'Rise from citizen to legend in one day in the agora.', es: 'Asciende de ciudadano a leyenda en un día en el ágora.' },
    icon: '\u{1F3DB}\u{FE0F}',
    configPath: './data/eras/greece/era.json',
    cardsPath: './data/eras/greece/cards.json',
    available: true,
  },
  {
    id: 'future-city',
    name: { en: 'Futuristic City', es: 'Ciudad Futurista' },
    tagline: { en: 'Hustle, hack and climb in a city that never logs off.', es: 'Búscate la vida, hackea y asciende en una ciudad que nunca se desconecta.' },
    icon: '\u{1F306}',
    configPath: './data/eras/future-city/era.json',
    cardsPath: './data/eras/future-city/cards.json',
    available: true,
  },
  {
    id: 'neanderthal',
    name: { en: 'Neanderthals', es: 'Neandertales' },
    tagline: { en: 'Survive one day at the edge of the wild.', es: 'Sobrevive un día al filo de lo salvaje.' },
    icon: '\u{1F525}',
    configPath: './data/eras/neanderthal/era.json',
    cardsPath: './data/eras/neanderthal/cards.json',
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
