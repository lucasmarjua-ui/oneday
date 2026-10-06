// Pure logic for the Daily Challenge's "one attempt per day" rule, kept
// separate from shared/daily-challenge.js so it's testable without pulling
// in that module's Firebase imports.
export function hasPlayedToday(storedResult, todayKey) {
  return !!storedResult && storedResult.date === todayKey;
}

// Today's featured event: the same for every player, a different one each
// day in turn. `dateKey` is YYYY-MM-DD (UTC).
export function featuredEventFor(dateKey, eventIds) {
  if (!eventIds.length) return null;
  const day = Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / 86400000);
  return eventIds[((day % eventIds.length) + eventIds.length) % eventIds.length];
}
