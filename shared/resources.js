export function createResourceState(era) {
  const state = {};
  Object.entries(era.resources).forEach(([key, config]) => { state[key] = config.start; });
  return state;
}

export function applyResourceDeltas(state, era, deltas = {}) {
  const next = { ...state };
  Object.entries(deltas).forEach(([key, delta]) => {
    const config = era.resources[key];
    if (!config) return;
    const current = next[key] ?? config.start;
    next[key] = Math.min(config.max, Math.max(config.min, current + delta));
  });
  return next;
}

export function isCriticalDepleted(state, era) {
  return Object.entries(era.resources).some(([key, config]) => config.critical && state[key] <= config.min);
}

export function getCriticalResourceKey(state, era) {
  const entry = Object.entries(era.resources).find(([key, config]) => config.critical && state[key] <= config.min);
  return entry ? entry[0] : null;
}

export function meetsResourceConditions(state, conditions = {}) {
  return Object.entries(conditions).every(([key, range]) => {
    const value = state[key];
    if (value === undefined) return true;
    if (range.min !== undefined && value < range.min) return false;
    if (range.max !== undefined && value > range.max) return false;
    return true;
  });
}
