// localStorage wrapper around career-logic.js.
import { emptyCareer, seedCareer, applyDay } from './career-logic.js';
import { getAllProgress } from './progress.js';
import { getAllStats } from './stats.js';

const KEY = 'oneday.career';

export function getCareer() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (stored && typeof stored === 'object') return { ...emptyCareer(), ...stored };
  } catch {
    // Unreadable: rebuilt from the collections below.
  }
  // First time: seeded from the collections and saved, so later days add to it.
  const seeded = seedCareer(getAllProgress(), getAllStats());
  save(seeded);
  return seeded;
}

function save(career) {
  try {
    localStorage.setItem(KEY, JSON.stringify(career));
    window.dispatchEvent(new CustomEvent('careerchange', { detail: career }));
  } catch {
    // Not remembered this time.
  }
}

/** Record a finished day; returns what it earned (see applyDay). */
export function recordCareerDay(day, context) {
  const result = applyDay(getCareer(), day, { ...context, progressAll: getAllProgress() });
  save(result.career);
  return result;
}
