function shuffle(list, rng) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickDailyObjectives(era, count, rng) {
  return shuffle(era.objectivesPool, rng).slice(0, count);
}

export function isObjectiveComplete(objective, { resourceState, dayState }) {
  const check = objective.check;
  switch (check.type) {
    case 'resourceAtLeast':
      return (resourceState[check.resource] ?? 0) >= check.value;
    case 'resourceAtMost':
      return (resourceState[check.resource] ?? 0) <= check.value;
    case 'resourceNeverBelow':
      return (dayState.minSeen[check.resource] ?? resourceState[check.resource] ?? 0) >= check.value;
    case 'flagSet':
      return dayState.flags.includes(check.flag);
    default:
      return false;
  }
}

/**
 * Where an objective stands mid-day, for the live tracker:
 * - 'done': achieved and cannot be undone (something that happened);
 * - 'holding': met right now, but only the end of the day settles it;
 * - 'failed': a "never below" objective that can no longer be kept;
 * - 'open': not there yet.
 */
export function objectiveStatus(objective, state) {
  const met = isObjectiveComplete(objective, state);
  switch (objective.check.type) {
    case 'flagSet':
      return met ? 'done' : 'open';
    case 'resourceNeverBelow':
      return met ? 'holding' : 'failed';
    case 'resourceAtLeast':
    case 'resourceAtMost':
      return met ? 'holding' : 'open';
    default:
      return 'open';
  }
}
