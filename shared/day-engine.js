export function createDayState(era) {
  return { elapsed: 0, totalTime: era.day.totalTime, flags: [], playedCardIds: [], minSeen: {} };
}

export function getCurrentSlot(era, elapsed) {
  return era.day.slots.find(slot => elapsed >= slot.from && elapsed < slot.to) || era.day.slots[era.day.slots.length - 1];
}

export function formatClock(era, elapsed) {
  const startHour = parseInt(era.day.startLabel.split(':')[0], 10);
  const hour = Math.min(startHour + elapsed, startHour + era.day.totalTime);
  return `${String(Math.round(hour)).padStart(2, '0')}:00`;
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
