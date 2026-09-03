import { meetsResourceConditions } from './resources.js';
import { getCurrentSlot } from './day-engine.js';

export function getValidCards(cards, era, resourceState, dayState) {
  const slot = getCurrentSlot(era, dayState.elapsed);
  return cards.filter(card => {
    if (dayState.playedCardIds.includes(card.id) && card.repeatable !== true) return false;
    if (card.timeSlots && !card.timeSlots.includes(slot.id)) return false;
    const conditions = card.conditions || {};
    if (!meetsResourceConditions(resourceState, conditions.resources || {})) return false;
    if ((conditions.flagsRequired || []).some(flag => !dayState.flags.includes(flag))) return false;
    if ((conditions.flagsExcluded || []).some(flag => dayState.flags.includes(flag))) return false;
    return true;
  });
}

export function pickWeightedCard(cards, rng) {
  if (cards.length === 0) return null;
  const totalWeight = cards.reduce((sum, card) => sum + (card.weight || 1), 0);
  let roll = rng() * totalWeight;
  for (const card of cards) {
    roll -= card.weight || 1;
    if (roll <= 0) return card;
  }
  return cards[cards.length - 1];
}

export function computeSuccessChance(spec, archetype) {
  if (!spec) return 1;
  let chance = spec.base ?? 1;
  if (spec.archetypeBonus) {
    const modifierValue = archetype?.modifiers?.[spec.archetypeBonus.modifier] ?? 0;
    chance += modifierValue * spec.archetypeBonus.scale;
  }
  return Math.min(0.95, Math.max(0.05, chance));
}

export function resolveOption(option, archetype, rng) {
  const chance = computeSuccessChance(option.successChance, archetype);
  const success = rng() < chance;
  const outcome = (success ? option.success : option.failure) || { text: {}, resources: {} };
  return { success, chance, outcome };
}
