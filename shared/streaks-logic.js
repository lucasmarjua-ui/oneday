// Pure logic for the global (cross-era) Daily Challenge streak, kept
// separate from shared/streaks.js so it's testable without that module's
// localStorage dependency (mirrors the memories / memories-logic split).

function yesterdayOf(todayKey) {
  const date = new Date(`${todayKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

// Playing today already counted -> no change (also covers the "already
// played" recap screen, which must read the streak without bumping it
// again). Playing on the day right after the last one extends the streak;
// any bigger gap (or a first-ever play) resets it to 1. longestStreak only
// ever moves up.
export function computeStreakUpdate(current, todayKey) {
  const currentStreak = current?.currentStreak || 0;
  const longestStreak = current?.longestStreak || 0;
  const lastPlayedDate = current?.lastPlayedDate || null;

  if (lastPlayedDate === todayKey) {
    return { currentStreak, longestStreak, lastPlayedDate };
  }
  const nextStreak = lastPlayedDate === yesterdayOf(todayKey) ? currentStreak + 1 : 1;
  return {
    currentStreak: nextStreak,
    longestStreak: Math.max(longestStreak, nextStreak),
    lastPlayedDate: todayKey,
  };
}

// Merge policy: whichever side played more recently wins the current-streak
// state (a stale device's higher currentStreak shouldn't override a more
// recent update); local wins ties, same as character customization
// elsewhere. longestStreak is always the max of both, so a personal best
// from either side is never lost to a merge.
export function mergeStreak(local, cloud) {
  const l = local || { currentStreak: 0, longestStreak: 0, lastPlayedDate: null };
  const c = cloud || { currentStreak: 0, longestStreak: 0, lastPlayedDate: null };
  const cloudIsNewer = c.lastPlayedDate && (!l.lastPlayedDate || c.lastPlayedDate > l.lastPlayedDate);
  const winner = cloudIsNewer ? c : l;
  return {
    currentStreak: winner.currentStreak || 0,
    lastPlayedDate: winner.lastPlayedDate || null,
    longestStreak: Math.max(l.longestStreak || 0, c.longestStreak || 0),
  };
}
