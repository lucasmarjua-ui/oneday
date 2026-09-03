// Pure logic for the Daily Challenge's "one attempt per day" rule, kept
// separate from shared/daily-challenge.js so it's testable without pulling
// in that module's Firebase imports.
export function hasPlayedToday(storedResult, todayKey) {
  return !!storedResult && storedResult.date === todayKey;
}
