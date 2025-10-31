/**
 * Ability System
 * Handles keyword abilities and their effects
 */

import type { CardInPlay, GameState } from "./types";

/**
 * Check if a creature has a specific ability
 */
export function hasAbility(card: CardInPlay, abilityCode: string): boolean {
  return card.template.abilities.some(
    (ability) => ability.code === abilityCode,
  );
}

/**
 * Check if a creature has flying
 */
export function hasFlying(card: CardInPlay): boolean {
  return hasAbility(card, "FLYING");
}

/**
 * Check if a creature has haste
 */
export function hasHaste(card: CardInPlay): boolean {
  return hasAbility(card, "HASTE");
}

/**
 * Check if a creature has vigilance
 */
export function hasVigilance(card: CardInPlay): boolean {
  return hasAbility(card, "VIGILANCE");
}

/**
 * Check if a creature has trample
 */
export function hasTrample(card: CardInPlay): boolean {
  return hasAbility(card, "TRAMPLE");
}

/**
 * Check if a creature has first strike
 */
export function hasFirstStrike(card: CardInPlay): boolean {
  return hasAbility(card, "FIRST_STRIKE") || hasDoubleStrike(card);
}

/**
 * Check if a creature has double strike
 */
export function hasDoubleStrike(card: CardInPlay): boolean {
  return hasAbility(card, "DOUBLE_STRIKE");
}

/**
 * Check if a creature has deathtouch
 */
export function hasDeathtouch(card: CardInPlay): boolean {
  return hasAbility(card, "DEATHTOUCH");
}

/**
 * Check if a creature has lifelink
 */
export function hasLifelink(card: CardInPlay): boolean {
  return hasAbility(card, "LIFELINK");
}

/**
 * Check if a creature has defender
 */
export function hasDefender(card: CardInPlay): boolean {
  return hasAbility(card, "DEFENDER");
}

/**
 * Check if a creature can attack
 */
export function canAttack(card: CardInPlay): boolean {
  // Must be a creature
  if (card.template.class !== "Creature") {
    return false;
  }

  // Can't attack if tapped
  if (card.isTapped) {
    return false;
  }

  // Can't attack if has defender
  if (hasDefender(card)) {
    return false;
  }

  // Can't attack if has summoning sickness (unless has haste)
  if (card.summoningSickness && !hasHaste(card)) {
    return false;
  }

  return true;
}

/**
 * Check if a creature can block another creature
 */
export function canBlock(blocker: CardInPlay, attacker: CardInPlay): boolean {
  // Must be a creature
  if (blocker.template.class !== "Creature") {
    return false;
  }

  // Can't block if tapped
  if (blocker.isTapped) {
    return false;
  }

  // Flying creatures can only be blocked by creatures with flying or reach
  if (hasFlying(attacker)) {
    if (!hasFlying(blocker) && !hasAbility(blocker, "REACH")) {
      return false;
    }
  }

  return true;
}

/**
 * Get the power of a creature (with modifications from counters and damage)
 */
export function getPower(card: CardInPlay): number {
  if (!card.template.power) {
    return 0;
  }

  let power = card.template.power;
  power += card.counters.plusOnePlusOne;
  power -= card.counters.minusOneMinusOne;

  return Math.max(0, power);
}

/**
 * Get the toughness of a creature (with modifications from counters and damage)
 */
export function getToughness(card: CardInPlay): number {
  if (!card.template.toughness) {
    return 0;
  }

  let toughness = card.template.toughness;
  toughness += card.counters.plusOnePlusOne;
  toughness -= card.counters.minusOneMinusOne;

  return Math.max(0, toughness);
}

/**
 * Check if a creature should die (lethal damage or toughness <= 0)
 */
export function shouldDie(card: CardInPlay): boolean {
  const toughness = getToughness(card);

  // Dies if toughness is 0 or less
  if (toughness <= 0) {
    return true;
  }

  // Dies if damage is >= toughness
  if (card.damageMarked >= toughness) {
    return true;
  }

  return false;
}

/**
 * Apply triggered abilities (e.g., ETB - Enter The Battlefield)
 * This is a simplified implementation - real MTG has complex stack interactions
 */
export function triggerAbilities(
  state: GameState,
  card: CardInPlay,
  trigger: "ETB" | "DIES" | "ATTACK" | "BLOCK",
): GameState {
  const _triggeredAbilities = card.template.abilities.filter(
    (ability) =>
      ability.kind === "Triggered" && ability.code.startsWith(trigger),
  );

  // TODO: Implement full triggered ability resolution
  // For now, this is a stub that would need to be expanded
  // based on specific ability effects

  return state;
}

/**
 * Get all keyword abilities on a card as a string array
 */
export function getKeywordAbilities(card: CardInPlay): string[] {
  return card.template.abilities
    .filter((ability) => ability.kind === "Keyword")
    .map((ability) => ability.name);
}
