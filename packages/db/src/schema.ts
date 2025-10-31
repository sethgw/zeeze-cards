import { relations, sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const Post = pgTable("post", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  title: t.varchar({ length: 256 }).notNull(),
  content: t.text().notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

export const CreatePostSchema = createInsertSchema(Post, {
  title: z.string().max(256),
  content: z.string().max(256),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ============================================================================
// ENUMS
// ============================================================================

export const cardClassEnum = pgEnum("card_class", [
  "Creature",
  "Sorcery",
  "Instant",
  "Artifact",
  "Enchantment",
  "Land",
  "Planeswalker",
]);

export const colorEnum = pgEnum("color", ["W", "U", "B", "R", "G", "C"]);

export const abilityKindEnum = pgEnum("ability_kind", [
  "Keyword",
  "Activated",
  "Triggered",
  "Static",
]);

export const pathEnum = pgEnum("path", ["EAS", "ERC1155"]);

export const gameRoomStatusEnum = pgEnum("game_room_status", [
  "waiting",
  "in_progress",
  "completed",
  "abandoned",
]);

// ============================================================================
// CARD SYSTEM TABLES
// ============================================================================

export const Card = pgTable("card", (t) => ({
  id: t.serial().notNull().primaryKey(),
  slug: t.varchar({ length: 256 }).notNull().unique(),
  name: t.varchar({ length: 256 }).notNull(),
  class: cardClassEnum().notNull(),
  colors: text()
    .array()
    .notNull()
    .default(sql`'{}'::text[]`), // Array of color codes
  manaCost: t.varchar({ length: 50 }).notNull(), // e.g. "3RR"
  rulesText: t.text().notNull(),
  power: t.integer(), // Creature only
  toughness: t.integer(), // Creature only
  edition: t.varchar({ length: 256 }).notNull(),
  imageUrl: t.varchar({ length: 512 }), // Generated image URL
  imagePrompt: t.text(), // Prompt used to generate the image
  lore: t.text(), // Flavor text / background story
  createdBy: t.varchar({ length: 256 }).notNull(), // User who created this card
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

export const Ability = pgTable("ability", (t) => ({
  id: t.serial().notNull().primaryKey(),
  code: t.varchar({ length: 100 }).notNull().unique(), // e.g. "HASTE", "FLYING"
  name: t.varchar({ length: 256 }).notNull(),
  kind: abilityKindEnum().notNull(),
  params: jsonb(), // JSON parameters for the ability
  rulesText: t.text().notNull(), // Template text for UI
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

export const CardAbility = pgTable(
  "card_ability",
  (t) => ({
    cardId: integer()
      .notNull()
      .references(() => Card.id, { onDelete: "cascade" }),
    abilityId: integer()
      .notNull()
      .references(() => Ability.id, { onDelete: "cascade" }),
    priority: t.integer().notNull().default(0), // Order of abilities on the card
  }),
  (table) => [primaryKey({ columns: [table.cardId, table.abilityId] })],
);

export const Rarity = pgTable("rarity", (t) => ({
  id: t.serial().notNull().primaryKey(),
  name: t.varchar({ length: 100 }).notNull().unique(), // Common, Uncommon, Rare, Mythic
  weight: t.integer().notNull(), // RNG weight for pack opening
  maxPerCombo: t.integer(), // Cap within a combo (null = unbounded)
}));

// ============================================================================
// DECK SYSTEM TABLES
// ============================================================================

export const Deck = pgTable("deck", (t) => ({
  id: t.serial().notNull().primaryKey(),
  userId: t.varchar({ length: 256 }).notNull(),
  name: t.varchar({ length: 256 }).notNull(),
  cards: jsonb().notNull(), // Array of {cardId: number, count: number}
  isValid: t.boolean().notNull().default(false), // Meets deck legality requirements
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

// ============================================================================
// GAME SYSTEM TABLES
// ============================================================================

export const GameRoom = pgTable("game_room", (t) => ({
  id: t.serial().notNull().primaryKey(),
  hostId: t.varchar({ length: 256 }).notNull(),
  name: t.varchar({ length: 256 }).notNull(),
  maxPlayers: t.integer().notNull().default(4),
  status: gameRoomStatusEnum().notNull().default("waiting"),
  players: jsonb().notNull(), // Array of {userId: string, deckId: number, ready: boolean}
  currentTurn: t.integer(), // Index of current player
  gameState: jsonb(), // Full game state (hands, battlefield, life totals, etc.)
  isAsync: t.boolean().notNull().default(false), // Async vs sync gameplay
  turnTimeLimit: t.integer(), // Seconds per turn (null = no limit for async)
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

export const GameMessage = pgTable("game_message", (t) => ({
  id: t.serial().notNull().primaryKey(),
  roomId: integer()
    .notNull()
    .references(() => GameRoom.id, { onDelete: "cascade" }),
  userId: t.varchar({ length: 256 }).notNull(),
  message: t.text().notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
}));

// ============================================================================
// BLOCKCHAIN STUB TABLES (for future implementation)
// ============================================================================

export const Combo = pgTable("combo", (t) => ({
  id: t.serial().notNull().primaryKey(),
  cardId: integer()
    .notNull()
    .references(() => Card.id, { onDelete: "cascade" }),
  season: t.integer().notNull(),
  frame: t.varchar({ length: 100 }).notNull(), // "Foil", "Non-Foil", "Borderless"
  artVariant: t.varchar({ length: 256 }).notNull(), // "Alt-Art A", "Signed"
  signature: t.varchar({ length: 256 }), // Signature if signed
  createdAt: t.timestamp().defaultNow().notNull(),
}));

export const ComboSupply = pgTable("combo_supply", (t) => ({
  id: t.serial().notNull().primaryKey(),
  comboId: integer()
    .notNull()
    .references(() => Combo.id, { onDelete: "cascade" }),
  rarityId: integer()
    .notNull()
    .references(() => Rarity.id, { onDelete: "cascade" }),
  cap: t.integer(), // Max supply (null = unbounded)
  minted: t.integer().notNull().default(0), // Off-chain tally
}));

export const Instance = pgTable("instance", (t) => ({
  key: t.varchar({ length: 66 }).notNull().primaryKey(), // hex keccak256(cardId, comboId, rarityId, contentHash)
  cardId: integer()
    .notNull()
    .references(() => Card.id, { onDelete: "cascade" }),
  comboId: integer()
    .notNull()
    .references(() => Combo.id, { onDelete: "cascade" }),
  rarityId: integer()
    .notNull()
    .references(() => Rarity.id, { onDelete: "cascade" }),
  contentHash: t.varchar({ length: 66 }).notNull(), // hex keccak256 of PNG
  owner: t.varchar({ length: 256 }).notNull(), // wallet address (lowercased)
  path: pathEnum().notNull(),
  attUID: t.varchar({ length: 66 }), // EAS UID
  tokenId1155: t.varchar({ length: 66 }), // ERC-1155 token id (hex)
  txHash: t.varchar({ length: 66 }), // Transaction hash
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const CardRelations = relations(Card, ({ many }) => ({
  cardAbilities: many(CardAbility),
  combos: many(Combo),
  instances: many(Instance),
}));

export const AbilityRelations = relations(Ability, ({ many }) => ({
  cardAbilities: many(CardAbility),
}));

export const CardAbilityRelations = relations(CardAbility, ({ one }) => ({
  card: one(Card, {
    fields: [CardAbility.cardId],
    references: [Card.id],
  }),
  ability: one(Ability, {
    fields: [CardAbility.abilityId],
    references: [Ability.id],
  }),
}));

export const ComboRelations = relations(Combo, ({ one, many }) => ({
  card: one(Card, {
    fields: [Combo.cardId],
    references: [Card.id],
  }),
  supplies: many(ComboSupply),
  instances: many(Instance),
}));

export const ComboSupplyRelations = relations(ComboSupply, ({ one }) => ({
  combo: one(Combo, {
    fields: [ComboSupply.comboId],
    references: [Combo.id],
  }),
  rarity: one(Rarity, {
    fields: [ComboSupply.rarityId],
    references: [Rarity.id],
  }),
}));

export const InstanceRelations = relations(Instance, ({ one }) => ({
  card: one(Card, {
    fields: [Instance.cardId],
    references: [Card.id],
  }),
  combo: one(Combo, {
    fields: [Instance.comboId],
    references: [Combo.id],
  }),
  rarity: one(Rarity, {
    fields: [Instance.rarityId],
    references: [Rarity.id],
  }),
}));

export const GameRoomRelations = relations(GameRoom, ({ many }) => ({
  messages: many(GameMessage),
}));

export const GameMessageRelations = relations(GameMessage, ({ one }) => ({
  room: one(GameRoom, {
    fields: [GameMessage.roomId],
    references: [GameRoom.id],
  }),
}));

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const CreateCardSchema = createInsertSchema(Card, {
  name: z.string().min(1).max(256),
  slug: z.string().min(1).max(256),
  colors: z.array(z.string()),
  manaCost: z.string().min(1).max(50),
  rulesText: z.string(),
  edition: z.string().min(1).max(256),
  lore: z.string().optional(),
  imagePrompt: z.string().optional(),
  createdBy: z.string().min(1).max(256),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateDeckSchema = createInsertSchema(Deck, {
  name: z.string().min(1).max(256),
  userId: z.string().min(1),
  cards: z.array(
    z.object({ cardId: z.number(), count: z.number().min(1).max(4) }),
  ),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateGameRoomSchema = createInsertSchema(GameRoom, {
  hostId: z.string().min(1),
  name: z.string().min(1).max(256),
  maxPlayers: z.number().min(2).max(4),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export * from "./auth-schema";
