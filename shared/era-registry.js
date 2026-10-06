// Each playable event is pure content: two JSON files plus one entry here.
// `accent` is the hue the interface tints itself with inside that event.
// Events are added one at a time, each researched and written as a whole.
export const ERAS = [
  {
    id: 'apollo-11',
    name: { en: 'Apollo 11', es: 'Apolo 11' },
    tagline: { en: 'Two of you will try to land on the Moon. Alarms, boulders and seconds of fuel stand in the way.', es: 'Dos de vosotros intentaréis alunizar. Alarmas, rocas y segundos de combustible se interponen.' },
    year: { en: '20 July 1969', es: '20 de julio de 1969' },
    place: { en: 'Sea of Tranquility, the Moon', es: 'Mar de la Tranquilidad, la Luna' },
    accent: 215,
    configPath: './data/eras/apollo-11/era.json',
    cardsPath: './data/eras/apollo-11/cards.json',
    available: true,
  },
  {
    id: 'giza',
    name: { en: 'The Great Pyramid', es: 'La Gran Pirámide' },
    tagline: { en: 'Lead your gang from the workers\' town to the top of the ramp and set the last granite beam before sunset.', es: 'Lleva a tu cuadrilla del poblado a lo alto de la rampa y coloca la última viga de granito antes del ocaso.' },
    year: { en: 'c. 2560 BC', es: 'h. 2560 a. C.' },
    place: { en: 'Giza, Egypt', es: 'Giza, Egipto' },
    accent: 40,
    configPath: './data/eras/giza/era.json',
    cardsPath: './data/eras/giza/cards.json',
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
