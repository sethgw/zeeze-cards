/**
 * Mana System
 * Handles mana pool management, cost parsing, and payment validation
 */

import type { CardColor, ManaCost, ManaPool } from "./types";

/**
 * Create an empty mana pool
 */
export function createEmptyManaPool(): ManaPool {
  return {
    W: 0,
    U: 0,
    B: 0,
    R: 0,
    G: 0,
    C: 0,
  };
}

/**
 * Parse a mana cost string like "3RR" or "2WU" into a ManaCost object
 */
export function parseManaString(costString: string): ManaCost {
  const cost: ManaCost = {
    W: 0,
    U: 0,
    B: 0,
    R: 0,
    G: 0,
    C: 0,
    generic: 0,
  };

  let i = 0;
  while (i < costString.length) {
    const char = costString[i];

    // Check for numbers (generic mana)
    if (char && /[0-9]/.test(char)) {
      let numStr = char;
      // Look ahead for multi-digit numbers
      const nextChar = costString[i + 1];
      while (i + 1 < costString.length && nextChar && /[0-9]/.test(nextChar)) {
        i++;
        numStr += costString[i];
      }
      cost.generic += parseInt(numStr, 10);
    }
    // Check for color symbols
    else if (char && ["W", "U", "B", "R", "G", "C"].includes(char)) {
      cost[char as CardColor]++;
    }
    // TODO: Handle hybrid mana like "W/U" and phyrexian mana like "P/R"

    i++;
  }

  return cost;
}

/**
 * Calculate the total converted mana cost (CMC)
 */
export function calculateCMC(cost: ManaCost): number {
  return (
    cost.generic +
    cost.W +
    cost.U +
    cost.B +
    cost.R +
    cost.G +
    cost.C
  );
}

/**
 * Check if a player can pay a mana cost with their current mana pool
 */
export function canPayCost(pool: ManaPool, cost: ManaCost): boolean {
  // First check if we have all the colored mana
  if (cost.W > pool.W) return false;
  if (cost.U > pool.U) return false;
  if (cost.B > pool.B) return false;
  if (cost.R > pool.R) return false;
  if (cost.G > pool.G) return false;
  if (cost.C > pool.C) return false;

  // Calculate remaining generic mana needed after colored costs
  const coloredUsed = cost.W + cost.U + cost.B + cost.R + cost.G + cost.C;
  const totalAvailable = pool.W + pool.U + pool.B + pool.R + pool.G + pool.C;
  const remainingAfterColored = totalAvailable - coloredUsed;

  // Check if we have enough remaining for generic costs
  return remainingAfterColored >= cost.generic;
}

/**
 * Pay a mana cost from a player's mana pool
 * Returns the new mana pool after payment, or null if cannot pay
 */
export function payManaCost(
  pool: ManaPool,
  cost: ManaCost,
): ManaPool | null {
  if (!canPayCost(pool, cost)) {
    return null;
  }

  const newPool = { ...pool };

  // Pay colored costs first
  newPool.W -= cost.W;
  newPool.U -= cost.U;
  newPool.B -= cost.B;
  newPool.R -= cost.R;
  newPool.G -= cost.G;
  newPool.C -= cost.C;

  // Pay generic cost from remaining mana (prioritize colorless first, then any color)
  let genericRemaining = cost.generic;

  // Use colorless first
  const colorlessUsed = Math.min(genericRemaining, newPool.C);
  newPool.C -= colorlessUsed;
  genericRemaining -= colorlessUsed;

  // Then use colored mana in order: W, U, B, R, G
  const colors: CardColor[] = ["W", "U", "B", "R", "G"];
  for (const color of colors) {
    if (genericRemaining <= 0) break;
    const used = Math.min(genericRemaining, newPool[color]);
    newPool[color] -= used;
    genericRemaining -= used;
  }

  return newPool;
}

/**
 * Add mana to a player's mana pool (e.g., from tapping a land)
 */
export function addMana(pool: ManaPool, mana: Partial<ManaPool>): ManaPool {
  return {
    W: pool.W + (mana.W ?? 0),
    U: pool.U + (mana.U ?? 0),
    B: pool.B + (mana.B ?? 0),
    R: pool.R + (mana.R ?? 0),
    G: pool.G + (mana.G ?? 0),
    C: pool.C + (mana.C ?? 0),
  };
}

/**
 * Empty a player's mana pool (happens at end of each phase)
 */
export function emptyManaPool(_pool: ManaPool): ManaPool {
  return createEmptyManaPool();
}

/**
 * Get total mana in pool
 */
export function getTotalMana(pool: ManaPool): number {
  return pool.W + pool.U + pool.B + pool.R + pool.G + pool.C;
}

/**
 * Format a mana cost for display
 */
export function formatManaCost(cost: ManaCost): string {
  let result = "";

  if (cost.generic > 0) {
    result += cost.generic.toString();
  }

  if (cost.W > 0) result += "W".repeat(cost.W);
  if (cost.U > 0) result += "U".repeat(cost.U);
  if (cost.B > 0) result += "B".repeat(cost.B);
  if (cost.R > 0) result += "R".repeat(cost.R);
  if (cost.G > 0) result += "G".repeat(cost.G);
  if (cost.C > 0) result += "C".repeat(cost.C);

  return result || "0";
}
