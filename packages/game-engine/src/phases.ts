/**
 * Phase and Turn Management
 * Handles turn structure and phase transitions
 */

import type { GameState, Phase, Player } from "./types";
import { emptyManaPool } from "./mana";

/**
 * Get the next phase in turn order
 */
export function getNextPhase(currentPhase: Phase): Phase {
  const phaseOrder: Phase[] = [
    "untap",
    "upkeep",
    "draw",
    "main1",
    "combat_begin",
    "combat_declare_attackers",
    "combat_declare_blockers",
    "combat_damage",
    "combat_end",
    "main2",
    "end",
  ];

  const currentIndex = phaseOrder.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
    return "untap"; // Start new turn
  }

  return phaseOrder[currentIndex + 1]!;
}

/**
 * Check if a phase is a main phase (when sorcery-speed spells can be cast)
 */
export function isMainPhase(phase: Phase): boolean {
  return phase === "main1" || phase === "main2";
}

/**
 * Check if a phase is during combat
 */
export function isCombatPhase(phase: Phase): boolean {
  return phase.startsWith("combat_");
}

/**
 * Advance to the next phase
 */
export function advancePhase(state: GameState): GameState {
  const currentPhase = state.phase;
  const nextPhase = getNextPhase(currentPhase);

  // If we're going from "end" to "untap", advance to next turn
  const newTurn =
    currentPhase === "end" ? state.turn + 1 : state.turn;

  // If starting new turn, advance to next player
  let newPlayerIndex = state.currentPlayerIndex;
  let newActivePlayerId = state.activePlayerId;

  if (currentPhase === "end") {
    newPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    newActivePlayerId = state.players[newPlayerIndex]!.id;
  }

  // Update players based on phase
  const updatedPlayers = state.players.map((player, index) => {
    const updatedPlayer = { ...player };

    // Untap phase: untap all permanents
    if (nextPhase === "untap" && index === newPlayerIndex) {
      updatedPlayer.zones.battlefield = player.zones.battlefield.map(
        (card) => ({
          ...card,
          isTapped: false,
          summoningSickness: false, // Remove summoning sickness
        }),
      );
    }

    // Draw phase: draw a card
    if (nextPhase === "draw" && index === newPlayerIndex) {
      const library = [...player.zones.library];
      const hand = [...player.zones.hand];
      const drawnCard = library.shift();

      if (drawnCard) {
        drawnCard.zone = "hand";
        hand.push(drawnCard);
      }

      updatedPlayer.zones.library = library;
      updatedPlayer.zones.hand = hand;
    }

    // End phase: empty mana pool
    if (nextPhase === "end") {
      updatedPlayer.manaPool = emptyManaPool(player.manaPool);
    }

    // Reset hasPlayedLand at start of new turn
    if (nextPhase === "untap" && index === newPlayerIndex) {
      updatedPlayer.hasPlayedLand = false;
    }

    return updatedPlayer;
  });

  // Reset combat state when leaving combat
  const newCombat =
    !isCombatPhase(nextPhase) && isCombatPhase(currentPhase)
      ? {
          attackers: [],
          blockers: [],
          step: null,
        }
      : state.combat;

  return {
    ...state,
    phase: nextPhase,
    turn: newTurn,
    currentPlayerIndex: newPlayerIndex,
    activePlayerId: newActivePlayerId,
    priorityPlayerId: newActivePlayerId, // Active player gets priority
    players: updatedPlayers,
    combat: newCombat,
    updatedAt: new Date(),
  };
}

/**
 * Pass priority to the next player
 */
export function passPriority(state: GameState): GameState {
  const currentPriorityIndex = state.players.findIndex(
    (p) => p.id === state.priorityPlayerId,
  );

  if (currentPriorityIndex === -1) {
    return state;
  }

  const nextPriorityIndex =
    (currentPriorityIndex + 1) % state.players.length;
  const nextPriorityPlayerId = state.players[nextPriorityIndex]!.id;

  // If priority has passed all the way around and stack is empty, advance phase
  if (
    nextPriorityPlayerId === state.activePlayerId &&
    state.stack.length === 0
  ) {
    return advancePhase(state);
  }

  return {
    ...state,
    priorityPlayerId: nextPriorityPlayerId,
    updatedAt: new Date(),
  };
}

/**
 * Check if a player can take actions during current phase
 */
export function canTakeAction(
  state: GameState,
  playerId: string,
  actionType: "sorcery" | "instant" | "land" | "ability",
): boolean {
  // Must have priority
  if (state.priorityPlayerId !== playerId) {
    return false;
  }

  // Sorcery-speed actions require main phase, empty stack, and active player
  if (actionType === "sorcery" || actionType === "land") {
    return (
      state.activePlayerId === playerId &&
      isMainPhase(state.phase) &&
      state.stack.length === 0
    );
  }

  // Instant-speed actions can be taken anytime with priority
  if (actionType === "instant" || actionType === "ability") {
    return true;
  }

  return false;
}
