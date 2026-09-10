import { meetsResourceConditions } from './resources.js';
import { getCurrentSlot } from './day-engine.js';
import { resourceFraction } from './resource-bar.js';

export function getValidCards(cards, era, resourceState, dayState) {
  const slot = getCurrentSlot(era, dayState.elapsed);
  return cards.filter(card => {
    if (dayState.playedCardIds.includes(card.id) && card.repeatable !== true) return false;
    if (card.timeSlots && !card.timeSlots.includes(slot.id)) return false;
    const conditions = card.conditions || {};
    if (!meetsResourceConditions(resourceState, conditions.resources || {})) return false;
    // Narrative counters (e.g. an NPC's trust) use the exact same min/max
    // check as resource conditions -- meetsResourceConditions was already
    // generic, never resource-specific, so it's reused verbatim here.
    if (!meetsResourceConditions(dayState.counters || {}, conditions.counters || {})) return false;
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

export const TRAIT_BONUS_DEFAULT_CAP = 5;

// A success chance is shaped by the day itself, never by a class picked up
// front: `resourceBonus` reads a bounded resource (energy, health, standing)
// and swings the chance by up to ±scale/2 between empty and full, and
// `traitBonus` rewards choices the player has already leaned into today, so
// the person you're becoming shifts the odds of the next choice.
export function computeSuccessChance(spec, context = {}) {
  if (!spec) return 1;
  let chance = spec.base ?? 1;
  const { resourceState = {}, era, traits = {} } = context;
  let modified = false;
  if (spec.resourceBonus) {
    const config = era?.resources?.[spec.resourceBonus.resource];
    const value = resourceState[spec.resourceBonus.resource];
    if (config && value !== undefined) {
      chance += (resourceFraction(value, config) - 0.5) * spec.resourceBonus.scale;
      modified = true;
    }
  }
  if (spec.traitBonus) {
    const points = Math.min(traits[spec.traitBonus.trait] || 0, spec.traitBonus.cap ?? TRAIT_BONUS_DEFAULT_CAP);
    chance += points * spec.traitBonus.perPoint;
    modified = true;
  }
  // The [0.05, 0.95] band exists so no *roll* is ever a foregone conclusion.
  // An option with no bonus at all isn't a roll -- "walk past, 0h" is simply
  // certain, and clamping it to 0.95 would print odds on a sure thing.
  if (!modified) return Math.min(1, Math.max(0, chance));
  return Math.min(0.95, Math.max(0.05, chance));
}

export function resolveOption(option, context, rng) {
  const chance = computeSuccessChance(option.successChance, context);
  const success = rng() < chance;
  const outcome = (success ? option.success : option.failure) || { text: {}, resources: {} };
  return { success, chance, outcome };
}
