// Pure logic for cross-playthrough memories, kept separate from
// shared/memories.js so it's testable without that module's localStorage
// dependency (mirrors the daily-challenge / daily-challenge-logic split).

// Guests get no continuity, no exceptions: called at the start of every day,
// this is the single place that decides whether last time's memories apply.
export function selectMemorySeed(user, eraMemories) {
  if (!user) return { flags: [], counters: {} };
  return { flags: eraMemories?.flags || [], counters: eraMemories?.counters || {} };
}

// At day end, only the flags/counters an era explicitly declared as
// "memorable" graduate from that day's transient state into something
// persisted -- never the full flag/counter set, so this stays a handful of
// narratively-significant facts, not a decision log.
export function extractMemorableState(era, dayState) {
  const memorableFlags = era.memories?.flags || [];
  const memorableCounters = era.memories?.counters || [];
  const flags = (dayState.flags || []).filter(flag => memorableFlags.includes(flag));
  const counters = {};
  memorableCounters.forEach(key => {
    if (dayState.counters && key in dayState.counters) counters[key] = dayState.counters[key];
  });
  return { flags, counters };
}

// Merge policy: flags accumulate (once remembered, always remembered, same
// as achievement flags elsewhere in this project); counters take the local
// value when present (same "local wins on conflict" policy already used for
// character customization), since a counter represents current standing,
// not a cumulative total.
export function mergeMemories(local, cloud) {
  const eraIds = new Set([...Object.keys(local || {}), ...Object.keys(cloud || {})]);
  const result = {};
  eraIds.forEach(eraId => {
    const l = local?.[eraId] || {};
    const c = cloud?.[eraId] || {};
    result[eraId] = {
      flags: [...new Set([...(c.flags || []), ...(l.flags || [])])],
      counters: { ...(c.counters || {}), ...(l.counters || {}) },
    };
  });
  return result;
}
