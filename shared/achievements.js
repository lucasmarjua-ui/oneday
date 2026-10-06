// Its own key: the endings-and-facts collection lives in 'oneday.progress'
// and is rewritten every day, which used to wipe these running totals.
const KEY = 'oneday.challenges';
const EMPTY = { accumulated: {}, achievementsUnlocked: [] };

function read() {
  try { const value = JSON.parse(localStorage.getItem(KEY) || '{}'); return typeof value === 'object' && value ? value : {}; }
  catch { return {}; }
}
function write(value) { localStorage.setItem(KEY, JSON.stringify(value)); window.dispatchEvent(new CustomEvent('achievementchange', { detail: value })); }

export function getEraProgress(eraId) {
  const all = read();
  return { ...EMPTY, ...(all[eraId] || {}) };
}

export function recordDayGains(eraId, gains) {
  const all = read();
  const progress = { ...EMPTY, ...(all[eraId] || {}) };
  const accumulated = { ...progress.accumulated };
  Object.entries(gains).forEach(([resource, amount]) => {
    if (amount > 0) accumulated[resource] = (accumulated[resource] || 0) + amount;
  });
  all[eraId] = { ...progress, accumulated };
  write(all);
  return all[eraId];
}

export function checkAndUnlockMetaAchievements(eraId, era) {
  const all = read();
  const progress = { ...EMPTY, ...(all[eraId] || {}) };
  const unlocked = [...progress.achievementsUnlocked];
  const newlyUnlocked = [];
  (era.metaAchievements || []).forEach(achievement => {
    if (unlocked.includes(achievement.id)) return;
    const total = progress.accumulated[achievement.accumulates] || 0;
    if (total >= achievement.threshold) {
      unlocked.push(achievement.id);
      newlyUnlocked.push(achievement);
    }
  });
  if (newlyUnlocked.length > 0) {
    all[eraId] = { ...progress, achievementsUnlocked: unlocked };
    write(all);
  }
  return newlyUnlocked;
}
