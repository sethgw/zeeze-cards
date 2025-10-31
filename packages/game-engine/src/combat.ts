/**
 * Combat System
 * Handles combat declaration, blocking, and damage calculation
 */

import type { Attacker, Blocker, GameState } from "./types";
import {
  canAttack,
  canBlock,
  getPower,
  getToughness,
  hasDeathtouch,
  hasDoubleStrike,
  hasFirstStrike,
  hasLifelink,
  hasTrample,
  hasVigilance,
  shouldDie,
} from "./abilities";

/**
 * Declare attackers for the current turn
 */
export function declareAttackers(
  state: GameState,
  attackingCreatureIds: string[],
  defendingPlayerIds: string[],
): GameState {
  if (state.phase !== "combat_declare_attackers") {
    throw new Error(
      "Can only declare attackers during declare attackers phase",
    );
  }

  const activePlayer = state.players.find((p) => p.id === state.activePlayerId);
  if (!activePlayer) {
    throw new Error("Active player not found");
  }

  // Validate all attackers
  const attackers: Attacker[] = [];

  for (let i = 0; i < attackingCreatureIds.length; i++) {
    const creatureId = attackingCreatureIds[i];
    const defenderId = defendingPlayerIds[i];

    if (!creatureId) {
      throw new Error(`Creature ID at index ${i} is undefined`);
    }

    if (!defenderId) {
      throw new Error(`No defender specified for attacker ${creatureId}`);
    }

    const creature = activePlayer.zones.battlefield.find(
      (c) => c.instanceId === creatureId,
    );

    if (!creature) {
      throw new Error(`Creature ${creatureId} not found on battlefield`);
    }

    if (!canAttack(creature)) {
      throw new Error(`Creature ${creature.template.name} cannot attack`);
    }

    // Tap attacker (unless it has vigilance)
    if (!hasVigilance(creature)) {
      creature.isTapped = true;
    }

    attackers.push({
      instanceId: creatureId,
      defendingPlayerId: defenderId,
      blockedBy: [],
    });
  }

  return {
    ...state,
    combat: {
      ...state.combat,
      attackers,
      step: "declare_blockers",
    },
    updatedAt: new Date(),
  };
}

/**
 * Declare blockers for attacking creatures
 */
export function declareBlockers(
  state: GameState,
  blocks: { blockerId: string; attackerId: string }[],
): GameState {
  if (state.phase !== "combat_declare_blockers") {
    throw new Error("Can only declare blockers during declare blockers phase");
  }

  const defendingPlayer = state.players.find(
    (p) => p.id !== state.activePlayerId,
  );
  if (!defendingPlayer) {
    throw new Error("Defending player not found");
  }

  const blockers: Blocker[] = [];
  const updatedAttackers = [...state.combat.attackers];

  for (const block of blocks) {
    const blocker = defendingPlayer.zones.battlefield.find(
      (c) => c.instanceId === block.blockerId,
    );
    const attacker = updatedAttackers.find(
      (a) => a.instanceId === block.attackerId,
    );

    if (!blocker) {
      throw new Error(`Blocker ${block.blockerId} not found`);
    }

    if (!attacker) {
      throw new Error(`Attacker ${block.attackerId} not found`);
    }

    // Find the actual attacker card
    const attackerCard = state.players
      .flatMap((p) => p.zones.battlefield)
      .find((c) => c.instanceId === block.attackerId);

    if (!attackerCard) {
      throw new Error(`Attacker card ${block.attackerId} not found`);
    }

    if (!canBlock(blocker, attackerCard)) {
      throw new Error(
        `Creature ${blocker.template.name} cannot block ${attackerCard.template.name}`,
      );
    }

    // Tap blocker
    blocker.isTapped = true;

    // Add to blocker list
    blockers.push({
      instanceId: block.blockerId,
      blocking: block.attackerId,
    });

    // Update attacker's blocked status
    attacker.blockedBy.push(block.blockerId);
  }

  return {
    ...state,
    combat: {
      ...state.combat,
      attackers: updatedAttackers,
      blockers,
      step: "damage",
    },
    updatedAt: new Date(),
  };
}

/**
 * Resolve combat damage
 */
export function resolveCombatDamage(state: GameState): GameState {
  if (state.phase !== "combat_damage") {
    throw new Error("Can only resolve damage during combat damage phase");
  }

  let newState = { ...state };

  // First strike damage (if any creatures have first strike)
  newState = resolveFirstStrikeDamage(newState);

  // Regular damage
  newState = resolveRegularDamage(newState);

  // Check for dead creatures and move them to graveyard
  newState = cleanupDeadCreatures(newState);

  return {
    ...newState,
    combat: {
      ...newState.combat,
      step: "end",
    },
    updatedAt: new Date(),
  };
}

/**
 * Resolve first strike damage
 */
function resolveFirstStrikeDamage(state: GameState): GameState {
  const updatedPlayers = [...state.players];

  // Get all creatures involved in combat
  const combatCreatures = state.players.flatMap((p) => p.zones.battlefield);

  // Process attackers with first strike
  for (const attacker of state.combat.attackers) {
    const attackerCard = combatCreatures.find(
      (c) => c.instanceId === attacker.instanceId,
    );
    if (!attackerCard || !hasFirstStrike(attackerCard)) {
      continue;
    }

    const power = getPower(attackerCard);

    // If blocked, deal damage to blockers
    if (attacker.blockedBy.length > 0) {
      for (const blockerId of attacker.blockedBy) {
        const blockerCard = combatCreatures.find(
          (c) => c.instanceId === blockerId,
        );
        if (blockerCard) {
          blockerCard.damageMarked += power;

          // Deathtouch means any damage is lethal
          if (hasDeathtouch(attackerCard)) {
            blockerCard.damageMarked = getToughness(blockerCard);
          }
        }
      }
    } else {
      // Not blocked, deal damage to defending player
      const defender = updatedPlayers.find(
        (p) => p.id === attacker.defendingPlayerId,
      );
      if (defender) {
        defender.life -= power;

        // Lifelink: gain life
        if (hasLifelink(attackerCard)) {
          const attackingPlayer = updatedPlayers.find(
            (p) => p.id === attackerCard.controllerId,
          );
          if (attackingPlayer) {
            attackingPlayer.life += power;
          }
        }
      }
    }
  }

  // Process blockers with first strike dealing damage back to attackers
  for (const blocker of state.combat.blockers) {
    const blockerCard = combatCreatures.find(
      (c) => c.instanceId === blocker.instanceId,
    );
    if (!blockerCard || !hasFirstStrike(blockerCard)) {
      continue;
    }

    const attackerCard = combatCreatures.find(
      (c) => c.instanceId === blocker.blocking,
    );
    if (attackerCard) {
      const power = getPower(blockerCard);
      attackerCard.damageMarked += power;

      if (hasDeathtouch(blockerCard)) {
        attackerCard.damageMarked = getToughness(attackerCard);
      }
    }
  }

  return {
    ...state,
    players: updatedPlayers,
  };
}

/**
 * Resolve regular combat damage (for creatures without first strike or with double strike)
 */
function resolveRegularDamage(state: GameState): GameState {
  const updatedPlayers = [...state.players];

  // Get all creatures involved in combat
  const combatCreatures = state.players.flatMap((p) => p.zones.battlefield);

  // Process attackers
  for (const attacker of state.combat.attackers) {
    const attackerCard = combatCreatures.find(
      (c) => c.instanceId === attacker.instanceId,
    );
    if (!attackerCard) {
      continue;
    }

    // Skip if has first strike but not double strike (already dealt damage)
    if (hasFirstStrike(attackerCard) && !hasDoubleStrike(attackerCard)) {
      continue;
    }

    const power = getPower(attackerCard);

    // If blocked, deal damage to blockers
    if (attacker.blockedBy.length > 0) {
      let remainingDamage = power;

      for (const blockerId of attacker.blockedBy) {
        const blockerCard = combatCreatures.find(
          (c) => c.instanceId === blockerId,
        );
        if (blockerCard) {
          const damageToBlocker = Math.min(
            getToughness(blockerCard),
            remainingDamage,
          );
          blockerCard.damageMarked += damageToBlocker;
          remainingDamage -= damageToBlocker;

          // Deathtouch
          if (hasDeathtouch(attackerCard)) {
            blockerCard.damageMarked = getToughness(blockerCard);
          }
        }
      }

      // Trample: excess damage goes to defending player
      if (hasTrample(attackerCard) && remainingDamage > 0) {
        const defender = updatedPlayers.find(
          (p) => p.id === attacker.defendingPlayerId,
        );
        if (defender) {
          defender.life -= remainingDamage;
        }
      }

      // Lifelink
      if (hasLifelink(attackerCard)) {
        const attackingPlayer = updatedPlayers.find(
          (p) => p.id === attackerCard.controllerId,
        );
        if (attackingPlayer) {
          attackingPlayer.life += power;
        }
      }
    } else {
      // Not blocked, deal damage to defending player
      const defender = updatedPlayers.find(
        (p) => p.id === attacker.defendingPlayerId,
      );
      if (defender) {
        defender.life -= power;

        // Lifelink
        if (hasLifelink(attackerCard)) {
          const attackingPlayer = updatedPlayers.find(
            (p) => p.id === attackerCard.controllerId,
          );
          if (attackingPlayer) {
            attackingPlayer.life += power;
          }
        }
      }
    }
  }

  // Process blockers dealing damage to attackers
  for (const blocker of state.combat.blockers) {
    const blockerCard = combatCreatures.find(
      (c) => c.instanceId === blocker.instanceId,
    );
    if (!blockerCard) {
      continue;
    }

    // Skip if has first strike but not double strike
    if (hasFirstStrike(blockerCard) && !hasDoubleStrike(blockerCard)) {
      continue;
    }

    const attackerCard = combatCreatures.find(
      (c) => c.instanceId === blocker.blocking,
    );
    if (attackerCard) {
      const power = getPower(blockerCard);
      attackerCard.damageMarked += power;

      if (hasDeathtouch(blockerCard)) {
        attackerCard.damageMarked = getToughness(attackerCard);
      }

      // Lifelink
      if (hasLifelink(blockerCard)) {
        const defendingPlayer = updatedPlayers.find(
          (p) => p.id === blockerCard.controllerId,
        );
        if (defendingPlayer) {
          defendingPlayer.life += power;
        }
      }
    }
  }

  return {
    ...state,
    players: updatedPlayers,
  };
}

/**
 * Clean up dead creatures after damage
 */
function cleanupDeadCreatures(state: GameState): GameState {
  const updatedPlayers = state.players.map((player) => {
    const battlefield = [...player.zones.battlefield];
    const graveyard = [...player.zones.graveyard];

    const deadCreatures = battlefield.filter((card) => shouldDie(card));
    const aliveCreatures = battlefield.filter((card) => !shouldDie(card));

    // Move dead creatures to graveyard
    for (const creature of deadCreatures) {
      creature.zone = "graveyard";
      creature.damageMarked = 0; // Reset damage in graveyard
      graveyard.push(creature);
    }

    return {
      ...player,
      zones: {
        ...player.zones,
        battlefield: aliveCreatures,
        graveyard,
      },
    };
  });

  return {
    ...state,
    players: updatedPlayers,
  };
}
