const KEY = 'oneday.memories';

function readAll() {
  try { const value = JSON.parse(localStorage.getItem(KEY) || '{}'); return typeof value === 'object' && value ? value : {}; }
  catch { return {}; }
}

export function getEraMemories(eraId) {
  return readAll()[eraId] || { flags: [], counters: {} };
}

export function recordEraMemories(eraId, { flags = [], counters = {} }) {
  const all = readAll();
  const existing = all[eraId] || { flags: [], counters: {} };
  all[eraId] = {
    flags: [...new Set([...existing.flags, ...flags])],
    counters: { ...existing.counters, ...counters },
  };
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent('memorieschange', { detail: all }));
  return all[eraId];
}
