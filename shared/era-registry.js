// Each playable event is pure content: two JSON files plus one entry here.
// `accent` is the hue the interface tints itself with inside that event;
// `sortYear` places it on the title screen's timeline.
// Events are added one at a time, each researched and written as a whole.
export const ERAS = [
  {
    id: 'apollo-11',
    sortYear: 1969,
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
    sortYear: -2560,
    name: { en: 'The Great Pyramid', es: 'La Gran Pirámide' },
    tagline: { en: 'Lead your gang from the workers\' town to the top of the ramp and set the last granite beam before sunset.', es: 'Lleva a tu cuadrilla del poblado a lo alto de la rampa y coloca la última viga de granito antes del ocaso.' },
    year: { en: 'c. 2560 BC', es: 'h. 2560 a. C.' },
    place: { en: 'Giza, Egypt', es: 'Giza, Egipto' },
    accent: 40,
    configPath: './data/eras/giza/era.json',
    cardsPath: './data/eras/giza/cards.json',
    available: true,
  },
  {
    id: 'tenochtitlan',
    sortYear: 1519,
    name: { en: 'Tenochtitlan', es: 'Tenochtitlan' },
    tagline: { en: 'Be the voice between Cortés and Moctezuma on the day two worlds met. Every word you translate can change what happens.', es: 'Sé la voz entre Cortés y Moctezuma el día en que se encontraron dos mundos. Cada palabra que traduces puede cambiar lo que ocurre.' },
    year: { en: '8 November 1519', es: '8 de noviembre de 1519' },
    place: { en: 'Lake Texcoco, Mexico', es: 'Lago de Texcoco, México' },
    accent: 165,
    configPath: './data/eras/tenochtitlan/era.json',
    cardsPath: './data/eras/tenochtitlan/cards.json',
    available: true,
  },
  {
    id: 'd-day',
    sortYear: 1944,
    name: { en: 'D-Day: Omaha Beach', es: 'Día D: Omaha Beach' },
    tagline: { en: 'A combat medic\'s longest day: from the troopship, through the surf, to the top of the bluffs.', es: 'El día más largo de un sanitario: del barco de tropas, a través de las olas, hasta lo alto de los acantilados.' },
    year: { en: '6 June 1944', es: '6 de junio de 1944' },
    place: { en: 'Normandy, France', es: 'Normandía, Francia' },
    accent: 95,
    configPath: './data/eras/d-day/era.json',
    cardsPath: './data/eras/d-day/cards.json',
    available: true,
  },
  {
    id: 'berlin-wall',
    sortYear: 1989,
    name: { en: 'The Fall of the Berlin Wall', es: 'La caída del Muro de Berlín' },
    tagline: { en: 'Be in the room when a mumbled sentence opens the Wall, then race the crowd to Bornholmer Straße.', es: 'Estate en la sala cuando una frase titubeante abre el Muro, y corre con la multitud hasta Bornholmer Straße.' },
    year: { en: '9 November 1989', es: '9 de noviembre de 1989' },
    place: { en: 'East Berlin, GDR', es: 'Berlín Este, RDA' },
    accent: 0,
    configPath: './data/eras/berlin-wall/era.json',
    cardsPath: './data/eras/berlin-wall/cards.json',
    available: true,
  },
];

/** The playable events in the order they happened. */
export function erasByDate() {
  return ERAS.filter(era => era.available).sort((a, b) => a.sortYear - b.sortYear);
}

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
