// Applies deltas to the day's narrative counters (NPC trust, thread stage,
// ...) -- the exact same accumulate-a-named-number pattern already used for
// resource deltas, just without an era-declared min/max/start, since
// counters are lightweight and don't need a resource's full config.
export function applyCounterDeltas(counters, deltas = {}) {
  const next = { ...counters };
  Object.entries(deltas).forEach(([key, delta]) => {
    next[key] = (next[key] || 0) + delta;
  });
  return next;
}
