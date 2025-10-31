/**
 * Main Game Engine
 * Orchestrates game initialization, actions, and state management
 */

import type { CardInPlay, CardTemplate, GameAction, GameState, Player } from "./types";
import { declareAttackers, declareBlockers } from "./combat";
import { advancePhase, canTakeAction, passPriority } from "./phases";
import { createEmptyManaPool, parseManaString, payManaCost } from "./mana";

/**
 * Create a new game with players and their decks
 */
export function createGame(
  players: { id: string; name: string; deck: CardTemplate[] }[],
): GameState {
  if (players.length < 2 || players.length > 4) {
    throw new Error("Game must have 2-4 players");
  }

  const gamePlayers: Player[] = players.map((p, index) => {
    // Shuffle deck
    const shuffledDeck = shuffleArray([...p.deck]);

    // Create card instances
    const library: CardInPlay[] = shuffledDeck.map((template, cardIndex) => ({
      instanceId: `${p.id}-card-${cardIndex}`,
      template,
      zone: "library",
      ownerId: p.id,
      controllerId: p.id,
      isTapped: false,
      counters: { plusOnePlusOne: 0, minusOneMinusOne: 0 },
      damageMarked: 0,
      summoningSickness: false,
    }));

    // Draw starting hand (7 cards)
    const hand = library.splice(0, 7);
    hand.forEach((card) => {
      card.zone = "hand";
    });

    return {
      id: p.id,
      name: p.name,
      life: 20, // Starting life total
      manaPool: createEmptyManaPool(),
      maxHandSize: 7,
      hasPlayedLand: false,
      hasPriority: index === 0, // First player starts with priority
      zones: {
        library,
        hand,
        battlefield: [],
        graveyard: [],
        exile: [],
      },
    };
  });

  const firstPlayer = gamePlayers[0];
  if (!firstPlayer) {
    throw new Error("No players in game");
  }

  return {
    id: `game-${Date.now()}`,
    players: gamePlayers,
    currentPlayerIndex: 0,
    activePlayerId: firstPlayer.id,
    priorityPlayerId: firstPlayer.id,
    phase: "untap",
    turn: 1,
    stack: [],
    combat: {
      attackers: [],
      blockers: [],
      step: null,
    },
    status: "in_progress",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Process a game action and return the new state
 */
export function processAction(state: GameState, playerId: string, action: GameAction): GameState {
  // Check if game is over
  if (state.status === "completed") {
    throw new Error("Game is already completed");
  }

  switch (action.type) {
    case "PASS_PRIORITY":
      return passPriority(state);

    case "PASS_PHASE":
      if (state.priorityPlayerId !== playerId) {
        throw new Error("You don't have priority");
      }
      return advancePhase(state);

    case "PLAY_LAND":
      return playLand(state, playerId, action.instanceId);

    case "CAST_SPELL":
      return castSpell(state, playerId, action.instanceId, action.targets);

    case "DECLARE_ATTACKERS":
      return handleDeclareAttackers(state, playerId, action.attackers);

    case "DECLARE_BLOCKERS":
      return handleDeclareBlockers(state, playerId, action.blocks);

    case "CONCEDE":
      return handleConcede(state, playerId);

    default:
      throw new Error(`Unknown action type: ${(action as GameAction).type}`);
  }
}

/**
 * Play a land card from hand
 */
function playLand(state: GameState, playerId: string, instanceId: string): GameState {
  if (!canTakeAction(state, playerId, "land")) {
    throw new Error("Cannot play land at this time");
  }

  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error("Player not found");
  }

  if (player.hasPlayedLand) {
    throw new Error("Already played a land this turn");
  }

  const cardIndex = player.zones.hand.findIndex((c) => c.instanceId === instanceId);
  if (cardIndex === -1) {
    throw new Error("Card not found in hand");
  }

  const card = player.zones.hand[cardIndex];
  if (!card) {
    throw new Error("Card not found in hand at index");
  }
  if (card.template.class !== "Land") {
    throw new Error("Card is not a land");
  }

  // Move card from hand to battlefield
  player.zones.hand.splice(cardIndex, 1);
  card.zone = "battlefield";
  player.zones.battlefield.push(card);
  player.hasPlayedLand = true;

  return {
    ...state,
    updatedAt: new Date(),
  };
}

/**
 * Cast a spell from hand
 */
function castSpell(
  state: GameState,
  playerId: string,
  instanceId: string,
  _targets?: string[],
): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error("Player not found");
  }

  const cardIndex = player.zones.hand.findIndex((c) => c.instanceId === instanceId);
  if (cardIndex === -1) {
    throw new Error("Card not found in hand");
  }

  const card = player.zones.hand[cardIndex];
  if (!card) {
    throw new Error("Card not found in hand at index");
  }

  // Check if can cast (sorcery speed vs instant speed)
  const speed = card.template.class === "Instant" ? "instant" : "sorcery";
  if (!canTakeAction(state, playerId, speed)) {
    throw new Error(`Cannot cast ${speed}-speed spell at this time`);
  }

  // Parse and pay mana cost
  const manaCost = parseManaString(card.template.manaCost);
  const newManaPool = payManaCost(player.manaPool, manaCost);

  if (!newManaPool) {
    throw new Error("Not enough mana to cast spell");
  }

  player.manaPool = newManaPool;

  // Move card based on type
  player.zones.hand.splice(cardIndex, 1);

  if (card.template.class === "Creature" || card.template.class === "Artifact" || card.template.class === "Enchantment") {
    // Permanents go to battlefield
    card.zone = "battlefield";
    if (card.template.class === "Creature") {
      card.summoningSickness = true;
    }
    player.zones.battlefield.push(card);
  } else {
    // Instants and sorceries go to graveyard after resolution
    card.zone = "graveyard";
    player.zones.graveyard.push(card);
  }

  return {
    ...state,
    updatedAt: new Date(),
  };
}

/**
 * Declare attackers
 */
function handleDeclareAttackers(
  state: GameState,
  playerId: string,
  attackerIds: string[],
): GameState {
  if (state.activePlayerId !== playerId) {
    throw new Error("Not your turn");
  }

  if (state.phase !== "combat_declare_attackers") {
    throw new Error("Not in declare attackers phase");
  }

  // For simplicity, assume all attackers target the next player
  const defendingPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  const defendingPlayer = state.players[defendingPlayerIndex];
  if (!defendingPlayer) {
    throw new Error("Defending player not found");
  }
  const defendingPlayerId = defendingPlayer.id;
  const defenderIds = attackerIds.map(() => defendingPlayerId);

  return declareAttackers(state, attackerIds, defenderIds);
}

/**
 * Declare blockers
 */
function handleDeclareBlockers(
  state: GameState,
  playerId: string,
  blocks: { blockerId: string; attackerId: string }[],
): GameState {
  // Find defending player (not active player)
  const defendingPlayer = state.players.find((p) => p.id !== state.activePlayerId);

  if (defendingPlayer?.id !== playerId) {
    throw new Error("You are not the defending player");
  }

  return declareBlockers(state, blocks);
}

/**
 * Handle player concession
 */
function handleConcede(state: GameState, playerId: string): GameState {
  const remainingPlayers = state.players.filter((p) => p.id !== playerId);

  if (remainingPlayers.length === 1) {
    const winner = remainingPlayers[0];
    if (!winner) {
      throw new Error("Winner not found");
    }
    return {
      ...state,
      status: "completed",
      winner: winner.id,
      updatedAt: new Date(),
    };
  }

  // Remove player from game
  return {
    ...state,
    players: remainingPlayers,
    updatedAt: new Date(),
  };
}

/**
 * Check for game end conditions (player at 0 life, etc.)
 */
export function checkGameEnd(state: GameState): GameState {
  const alivePlayers = state.players.filter((p) => p.life > 0);

  if (alivePlayers.length === 1) {
    const winner = alivePlayers[0];
    if (!winner) {
      throw new Error("Winner not found");
    }
    return {
      ...state,
      status: "completed",
      winner: winner.id,
      updatedAt: new Date(),
    };
  }

  if (alivePlayers.length === 0) {
    return {
      ...state,
      status: "completed",
      winner: undefined, // Draw
      updatedAt: new Date(),
    };
  }

  return state;
}

/**
 * Utility: Shuffle an array (Fisher-Yates algorithm)
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    const swapVal = shuffled[j];
    if (temp !== undefined && swapVal !== undefined) {
      shuffled[i] = swapVal;
      shuffled[j] = temp;
    }
  }
  return shuffled;
}
