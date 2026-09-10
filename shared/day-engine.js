// `seed` optionally pre-populates flags/counters at the start of the day --
// this is how persisted cross-playthrough memories (shared/memories.js) feed
// into a fresh day without the engine knowing anything about "memory" as a
// concept: it just accepts initial state, same as it always tracked state.
// `traits` always start empty: who you become is decided only by today.
export function createDayState(era, seed = {}) {
  return {
    elapsed: 0,
    totalTime: era.day.totalTime,
    flags: [...(seed.flags || [])],
    counters: { ...(seed.counters || {}) },
    traits: {},
    playedCardIds: [],
    minSeen: {},
  };
}

export function getCurrentSlot(era, elapsed) {
  return era.day.slots.find(slot => elapsed >= slot.from && elapsed < slot.to) || era.day.slots[era.day.slots.length - 1];
}

export function formatClock(era, elapsed) {
  const startHour = parseInt(era.day.startLabel.split(':')[0], 10);
  const hour = Math.min(startHour + elapsed, startHour + era.day.totalTime);
  return `${String(Math.round(hour)).padStart(2, '0')}:00`;
}

export function dayFraction(dayState) {
  if (!dayState || !dayState.totalTime) return 0;
  return Math.min(1, Math.max(0, dayState.elapsed / dayState.totalTime));
}

export function advanceTime(dayState, cost) {
  return { ...dayState, elapsed: Math.min(dayState.totalTime, dayState.elapsed + cost) };
}

export function isTimeUp(dayState) {
  return dayState.elapsed >= dayState.totalTime;
}

export function trackMinSeen(dayState, resourceState) {
  const minSeen = { ...dayState.minSeen };
  Object.entries(resourceState).forEach(([key, value]) => {
    minSeen[key] = minSeen[key] === undefined ? value : Math.min(minSeen[key], value);
  });
  return { ...dayState, minSeen };
}
