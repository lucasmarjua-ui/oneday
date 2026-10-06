// Collections that persist across playthroughs: the endings you have reached
// and the historical facts you have learned, per event. Pure functions; the
// storage wrapper is shared/progress.js.
export function emptyProgress() {
  return { endings: [], facts: [] };
}

/** Record a finished day. Returns the new progress and what was new this time. */
export function recordDay(progress, { endingId, factIds = [] }) {
  const current = { ...emptyProgress(), ...progress };
  const newEnding = !!endingId && !current.endings.includes(endingId);
  const newFacts = [...new Set(factIds)].filter(id => !current.facts.includes(id));
  return {
    progress: {
      endings: newEnding ? [...current.endings, endingId] : current.endings,
      facts: [...current.facts, ...newFacts],
    },
    newEnding,
    newFacts,
  };
}

export function completion(progress, era, cards) {
  const totalEndings = (era.endings || []).length;
  const totalFacts = cards.filter(card => card.fact).length;
  const endings = (progress?.endings || []).filter(id => (era.endings || []).some(ending => ending.id === id)).length;
  const facts = (progress?.facts || []).filter(id => cards.some(card => card.id === id && card.fact)).length;
  return { endings, totalEndings, facts, totalFacts };
}

/** Two devices' collections together: every ending and fact found on either. */
export function mergeCollections(local, cloud) {
  const ids = new Set([...Object.keys(local || {}), ...Object.keys(cloud || {})]);
  const result = {};
  ids.forEach(id => {
    const l = { ...emptyProgress(), ...(local?.[id] || {}) };
    const c = { ...emptyProgress(), ...(cloud?.[id] || {}) };
    result[id] = { endings: [...new Set([...c.endings, ...l.endings])], facts: [...new Set([...c.facts, ...l.facts])] };
  });
  return result;
}
