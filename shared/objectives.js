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
