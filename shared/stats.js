const KEY = 'oneday.stats';

function read() {
  try { const value = JSON.parse(localStorage.getItem(KEY) || '{}'); return typeof value === 'object' && value ? value : {}; }
  catch { return {}; }
}
function write(value) { localStorage.setItem(KEY, JSON.stringify(value)); window.dispatchEvent(new CustomEvent('statschange', { detail: value })); }

export function getEraStats(eraId) {
  const all = read();
  return all[eraId] || { daysPlayed: 0, objectivesCompleted: 0 };
}

export function recordDayResult(eraId, { objectivesCompleted = 0 } = {}) {
  const all = read();
  const stats = all[eraId] || { daysPlayed: 0, objectivesCompleted: 0 };
  all[eraId] = { daysPlayed: stats.daysPlayed + 1, objectivesCompleted: stats.objectivesCompleted + objectivesCompleted };
  write(all);
  return all[eraId];
}
