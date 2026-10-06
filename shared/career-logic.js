// The player's career as a historian, across every event: experience,
// a rank, and medals. Pure functions; the storage wrapper is shared/career.js.

export const RANKS = [
  { id: 'visitor', xp: 0, name: { en: 'Curious Visitor', es: 'Visitante curioso' } },
  { id: 'apprentice', xp: 150, name: { en: 'Apprentice Chronicler', es: 'Aprendiz de cronista' } },
  { id: 'chronicler', xp: 450, name: { en: 'Chronicler', es: 'Cronista' } },
  { id: 'archivist', xp: 900, name: { en: 'Archivist', es: 'Archivero' } },
  { id: 'historian', xp: 1600, name: { en: 'Historian', es: 'Historiador' } },
  { id: 'scholar', xp: 2600, name: { en: 'Scholar', es: 'Erudito' } },
  { id: 'professor', xp: 4000, name: { en: 'Professor of History', es: 'Catedrático de Historia' } },
  { id: 'witness', xp: 6000, name: { en: 'Witness of the Ages', es: 'Testigo de los siglos' } },
];

export const XP = {
  day: 20,
  objective: 25,
  allObjectives: 25,
  newFact: 10,
  newEnding: 100,
  historicalEnding: 50,
  quizCorrect: 15,
  quizPerfect: 25,
};

const sum = (list, pick) => list.reduce((total, item) => total + pick(item), 0);
const totalFacts = progressAll => sum(Object.values(progressAll || {}), entry => (entry?.facts || []).length);

// Medals are checked against the career, every event's collection and the
// daily streak. Tiers colour the medal: bronze, silver, gold.
export const MEDALS = [
  { id: 'first-day', tier: 'bronze', title: { en: 'First Day', es: 'Primer día' }, description: { en: 'Live your first day in history.', es: 'Vive tu primer día en la historia.' }, check: ({ career }) => career.days >= 1 },
  { id: 'true-history', tier: 'bronze', title: { en: 'As It Happened', es: 'Tal como fue' }, description: { en: 'Reach a historical ending.', es: 'Alcanza un final histórico.' }, check: ({ career }) => career.historical.length >= 1 },
  { id: 'note-taker', tier: 'bronze', title: { en: 'Note Taker', es: 'Tomador de apuntes' }, description: { en: 'Learn 25 historical facts.', es: 'Aprende 25 datos históricos.' }, check: ({ progressAll }) => totalFacts(progressAll) >= 25 },
  { id: 'top-of-class', tier: 'bronze', title: { en: 'Top of the Class', es: 'Matrícula de honor' }, description: { en: 'Answer every question of a quiz right.', es: 'Acierta todas las preguntas de un examen.' }, check: ({ career }) => career.perfectQuizzes >= 1 },
  { id: 'streak-3', tier: 'bronze', title: { en: 'Habit', es: 'Costumbre' }, description: { en: 'Play the daily challenge 3 days in a row.', es: 'Juega el reto diario 3 días seguidos.' }, check: ({ streak }) => (streak?.longestStreak || 0) >= 3 },
  { id: 'flawless', tier: 'silver', title: { en: 'Flawless Day', es: 'Día perfecto' }, description: { en: 'Complete all three objectives in one day.', es: 'Cumple los tres objetivos en un mismo día.' }, check: ({ career }) => career.flawlessDays >= 1 },
  { id: 'what-if', tier: 'silver', title: { en: 'What If…', es: '¿Y si…?' }, description: { en: 'Find 5 alternative endings.', es: 'Descubre 5 finales alternativos.' }, check: ({ career }) => career.alternative.length >= 5 },
  { id: 'bookworm', tier: 'silver', title: { en: 'Bookworm', es: 'Ratón de biblioteca' }, description: { en: 'Learn 75 historical facts.', es: 'Aprende 75 datos históricos.' }, check: ({ progressAll }) => totalFacts(progressAll) >= 75 },
  { id: 'veteran', tier: 'silver', title: { en: 'Veteran', es: 'Veterano' }, description: { en: 'Live 25 days.', es: 'Vive 25 días.' }, check: ({ career }) => career.days >= 25 },
  { id: 'time-traveller', tier: 'gold', title: { en: 'Time Traveller', es: 'Viajero del tiempo' }, description: { en: 'Live a day in every event.', es: 'Vive un día en cada evento.' }, check: ({ career, eras }) => eras.length > 0 && eras.every(era => career.events.includes(era.id)) },
  { id: 'completionist', tier: 'gold', title: { en: 'Every Ending', es: 'Todos los finales' }, description: { en: 'Find every ending of one event.', es: 'Descubre todos los finales de un evento.' }, check: ({ progressAll, eras }) => eras.some(era => era.endingIds.length > 0 && era.endingIds.every(id => (progressAll?.[era.id]?.endings || []).includes(id))) },
  { id: 'encyclopaedia', tier: 'gold', title: { en: 'Walking Encyclopaedia', es: 'Enciclopedia andante' }, description: { en: 'Learn every fact of one event.', es: 'Aprende todos los datos de un evento.' }, check: ({ progressAll, eras }) => eras.some(era => era.factIds.length > 0 && era.factIds.every(id => (progressAll?.[era.id]?.facts || []).includes(id))) },
  { id: 'sharp-memory', tier: 'gold', title: { en: 'Sharp Memory', es: 'Memoria de elefante' }, description: { en: 'Answer 50 quiz questions right.', es: 'Acierta 50 preguntas de examen.' }, check: ({ career }) => career.quizCorrect >= 50 },
  { id: 'streak-7', tier: 'gold', title: { en: 'Devotion', es: 'Devoción' }, description: { en: 'Play the daily challenge 7 days in a row.', es: 'Juega el reto diario 7 días seguidos.' }, check: ({ streak }) => (streak?.longestStreak || 0) >= 7 },
];

export function emptyCareer() {
  return { xp: 0, days: 0, quizCorrect: 0, quizAnswered: 0, perfectQuizzes: 0, flawlessDays: 0, events: [], historical: [], alternative: [], medals: [] };
}

/**
 * A player who played before careers existed starts with the experience
 * their collections are worth, so nobody begins again from zero.
 */
export function seedCareer(progressAll = {}, statsAll = {}) {
  const career = emptyCareer();
  Object.entries(progressAll).forEach(([eventId, entry]) => {
    const endings = entry?.endings || [];
    career.xp += endings.length * XP.newEnding + (entry?.facts || []).length * XP.newFact;
    if (endings.length) career.events.push(eventId);
  });
  Object.entries(statsAll).forEach(([eventId, stats]) => {
    career.days += stats?.daysPlayed || 0;
    if (stats?.daysPlayed && !career.events.includes(eventId)) career.events.push(eventId);
  });
  return career;
}

/** The experience a finished day earns, item by item. */
export function xpForDay({ objectivesCompleted = 0, objectivesTotal = 3, newFacts = 0, newEnding = false, historical = false, quiz = null }) {
  const items = [{ key: 'day', amount: XP.day }];
  if (objectivesCompleted) items.push({ key: 'objectives', amount: objectivesCompleted * XP.objective });
  if (objectivesTotal > 0 && objectivesCompleted >= objectivesTotal) items.push({ key: 'allObjectives', amount: XP.allObjectives });
  if (newFacts) items.push({ key: 'facts', amount: newFacts * XP.newFact });
  if (newEnding) items.push({ key: 'ending', amount: XP.newEnding + (historical ? XP.historicalEnding : 0) });
  if (quiz?.correct) items.push({ key: 'quiz', amount: quiz.correct * XP.quizCorrect });
  if (quiz?.perfect) items.push({ key: 'quizPerfect', amount: XP.quizPerfect });
  return { items, total: sum(items, item => item.amount) };
}

/** The rank for an amount of experience, and how far it is to the next one. */
export function rankFor(xp) {
  let index = 0;
  RANKS.forEach((rank, i) => { if (xp >= rank.xp) index = i; });
  const rank = RANKS[index];
  const next = RANKS[index + 1] || null;
  const progress = next ? (xp - rank.xp) / (next.xp - rank.xp) : 1;
  return { index, rank, next, progress: Math.max(0, Math.min(1, progress)) };
}

/**
 * Add a finished day to the career. `day` = { eventId, endingId, historical,
 * newEnding, newFacts, objectivesCompleted, objectivesTotal, quiz }.
 * `context` = { progressAll, eras, streak } after the day was saved.
 */
export function applyDay(career, day, context) {
  const before = { ...emptyCareer(), ...career };
  const gained = xpForDay(day);
  const next = {
    ...before,
    xp: before.xp + gained.total,
    days: before.days + 1,
    quizCorrect: before.quizCorrect + (day.quiz?.correct || 0),
    quizAnswered: before.quizAnswered + (day.quiz?.total || 0),
    perfectQuizzes: before.perfectQuizzes + (day.quiz?.perfect ? 1 : 0),
    flawlessDays: before.flawlessDays + (day.objectivesTotal > 0 && day.objectivesCompleted >= day.objectivesTotal ? 1 : 0),
    events: before.events.includes(day.eventId) ? before.events : [...before.events, day.eventId],
  };
  if (day.endingId) {
    const key = `${day.eventId}:${day.endingId}`;
    const list = day.historical ? 'historical' : 'alternative';
    if (!next[list].includes(key)) next[list] = [...next[list], key];
  }
  const newMedals = MEDALS.filter(medal => !before.medals.includes(medal.id) && medal.check({ career: next, ...context }));
  next.medals = [...before.medals, ...newMedals.map(medal => medal.id)];
  const rankBefore = rankFor(before.xp);
  const rankAfter = rankFor(next.xp);
  return { career: next, gained, newMedals, rankBefore, rankAfter, rankUp: rankAfter.index > rankBefore.index };
}

/** Two devices' careers together: the larger tallies, every medal and ending. */
export function mergeCareer(local, cloud) {
  const l = { ...emptyCareer(), ...(local || {}) };
  const c = { ...emptyCareer(), ...(cloud || {}) };
  const merged = emptyCareer();
  Object.keys(merged).forEach(key => {
    merged[key] = Array.isArray(merged[key]) ? [...new Set([...c[key], ...l[key]])] : Math.max(l[key] || 0, c[key] || 0);
  });
  return merged;
}

/** What every event offers, for the medals: [{ id, endingIds, factIds }]. */
export function eventCatalogue(loaded) {
  return loaded.map(({ id, era, cards }) => ({
    id,
    endingIds: (era.endings || []).map(ending => ending.id),
    factIds: cards.filter(card => card.fact).map(card => card.id),
  }));
}
