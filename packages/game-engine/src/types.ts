/**
 * Game Engine Types
 * Core type definitions for the MTG-style card game
 */

export type CardColor = "W" | "U" | "B" | "R" | "G" | "C";

export type CardClass =
  | "Creature"
  | "Sorcery"
  | "Instant"
  | "Artifact"
  | "Enchantment"
  | "Land"
  | "Planeswalker";

export type AbilityKind = "Keyword" | "Activated" | "Triggered" | "Static";

export type Phase =
  | "untap"
  | "upkeep"
  | "draw"
  | "main1"
  | "combat_begin"
  | "combat_declare_attackers"
  | "combat_declare_blockers"
  | "combat_damage"
  | "combat_end"
  | "main2"
  | "end";

export type Zone =
  | "library"
  | "hand"
  | "battlefield"
  | "graveyard"
  | "exile"
  | "stack";

// ============================================================================
// MANA SYSTEM
// ============================================================================

export interface ManaPool {
  W: number; // White
  U: number; // Blue
  B: number; // Black
  R: number; // Red
  G: number; // Green
  C: number; // Colorless
}

export interface ManaCost {
  W: number;
  U: number;
  B: number;
  R: number;
  G: number;
  C: number; // Colorless
  generic: number; // Can be paid with any color
}

// ============================================================================
// CARD SYSTEM
// ============================================================================

export interface CardAbility {
  id: number;
  code: string; // e.g., "HASTE", "FLYING", "ETB_DEAL_DAMAGE"
  name: string;
  kind: AbilityKind;
  params?: Record<string, unknown>; // Ability-specific parameters
  rulesText: string;
}

/**
 * A card as it exists in the database (template)
 */
export interface CardTemplate {
  id: number;
  slug: string;
  name: string;
  class: CardClass;
  colors: CardColor[];
  manaCost: string; // String format like "3RR"
  rulesText: string;
  power?: number;
  toughness?: number;
  imageUrl?: string;
  lore?: string;
  abilities: CardAbility[];
}

/**
 * A card instance in a specific zone during gameplay
 */
export interface CardInPlay {
  instanceId: string; // Unique ID for this instance in this game
  template: CardTemplate;
  zone: Zone;
  ownerId: string; // Original owner
  controllerId: string; // Current controller
  isTapped: boolean;
  counters: {
    plusOnePlusOne: number;
    minusOneMinusOne: number;
    [key: string]: number; // Other counter types
  };
  damageMarked: number; // For creatures
  summoningSickness: boolean; // Can't attack/use tap abilities
  attachedTo?: string; // For auras/equipment (instanceId of target)
}

// ============================================================================
// PLAYER SYSTEM
// ============================================================================

export interface Player {
  id: string;
  name: string;
  life: number;
  manaPool: ManaPool;
  maxHandSize: number;
  hasPlayedLand: boolean; // This turn
  hasPriority: boolean;
  zones: {
    library: CardInPlay[];
    hand: CardInPlay[];
    battlefield: CardInPlay[];
    graveyard: CardInPlay[];
    exile: CardInPlay[];
  };
}

// ============================================================================
// STACK & PRIORITY
// ============================================================================

export interface StackItem {
  id: string;
  type: "spell" | "ability";
  source: CardInPlay | string; // Card or player
  targets: string[]; // instanceIds or playerIds
  resolved: boolean;
}

// ============================================================================
// COMBAT SYSTEM
// ============================================================================

export interface Attacker {
  instanceId: string;
  defendingPlayerId: string;
  blockedBy: string[]; // Array of blocker instanceIds
}

export interface Blocker {
  instanceId: string;
  blocking: string; // Attacker instanceId
  damageOrder?: number; // For multiple blockers
}

export interface CombatState {
  attackers: Attacker[];
  blockers: Blocker[];
  step: "declare_attackers" | "declare_blockers" | "damage" | "end" | null;
}

// ============================================================================
// GAME STATE
// ============================================================================

export interface GameState {
  id: string;
  players: Player[];
  currentPlayerIndex: number;
  activePlayerId: string;
  priorityPlayerId: string;
  phase: Phase;
  turn: number;
  stack: StackItem[];
  combat: CombatState;
  status: "waiting" | "in_progress" | "completed";
  winner?: string; // Player ID
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// GAME ACTIONS
// ============================================================================

export type GameAction =
  | { type: "PASS_PRIORITY" }
  | { type: "PASS_PHASE" }
  | { type: "PLAY_LAND"; instanceId: string }
  | { type: "CAST_SPELL"; instanceId: string; targets?: string[] }
  | { type: "ACTIVATE_ABILITY"; instanceId: string; abilityCode: string; targets?: string[] }
  | { type: "DECLARE_ATTACKERS"; attackers: string[] }
  | { type: "DECLARE_BLOCKERS"; blocks: { blockerId: string; attackerId: string }[] }
  | { type: "CONCEDE" }
  | { type: "MULLIGAN" };

// ============================================================================
// GAME EVENTS (for logging and triggers)
// ============================================================================

export type GameEvent =
  | { type: "GAME_STARTED"; players: string[] }
  | { type: "TURN_STARTED"; playerId: string; turn: number }
  | { type: "PHASE_CHANGED"; from: Phase; to: Phase }
  | { type: "CARD_DRAWN"; playerId: string; cardId: string }
  | { type: "CARD_PLAYED"; playerId: string; instanceId: string }
  | { type: "SPELL_CAST"; playerId: string; instanceId: string }
  | { type: "ABILITY_ACTIVATED"; playerId: string; instanceId: string; abilityCode: string }
  | { type: "CREATURE_ATTACKED"; instanceId: string; defenderId: string }
  | { type: "CREATURE_BLOCKED"; attackerId: string; blockerId: string }
  | { type: "DAMAGE_DEALT"; sourceId: string; targetId: string; amount: number }
  | { type: "LIFE_CHANGED"; playerId: string; oldLife: number; newLife: number }
  | { type: "CREATURE_DIED"; instanceId: string }
  | { type: "GAME_ENDED"; winner: string; reason: string };
