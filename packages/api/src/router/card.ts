import type { TRPCRouterRecord } from "@trpc/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod/v4";

import { and, desc, eq, ilike } from "@zeeze/db";
import { Card, cardClassEnum, CreateCardSchema } from "@zeeze/db/schema";

import { protectedProcedure, publicProcedure } from "../trpc";

export const cardRouter = {
  /**
   * Generate lore/flavor text for a card using AI
   * Input: User's initial card concept/prompt
   * Output: Generated lore, suggested abilities, and card characteristics
   */
  generateLore: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(10).max(1000),
        cardClass: z.enum(cardClassEnum.enumValues).optional(),
        colors: z.array(z.enum(["W", "U", "B", "R", "G", "C"])).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is not configured");
      }

      const colorNames: Record<string, string> = {
        W: "White",
        U: "Blue",
        B: "Black",
        R: "Red",
        G: "Green",
        C: "Colorless",
      };

      const colorContext = input.colors?.length
        ? `The card should be ${input.colors.map((c) => colorNames[c]).join(" and ")} colored.`
        : "";

      const classContext = input.cardClass
        ? `It should be a ${input.cardClass} card.`
        : "";

      const systemPrompt = `You are a Magic: The Gathering card designer. Create compelling lore and gameplay mechanics for trading cards.

Rules:
1. Generate rich, immersive flavor text (2-3 sentences)
2. Suggest appropriate abilities based on the card's theme
3. Suggest balanced stats (power/toughness if creature, mana cost, etc.)
4. Ensure the card fits MTG color pie philosophy
5. Be creative but balanced

Respond in JSON format:
{
  "name": "Card Name",
  "lore": "The flavor text/background story",
  "rulesText": "What the card does mechanically",
  "suggestedAbilities": ["ABILITY_CODE_1", "ABILITY_CODE_2"],
  "manaCost": "3RR",
  "power": 5,
  "toughness": 4,
  "class": "Creature"
}`;

      const result = await generateText({
        model: openai("gpt-4o"),
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Create a card based on this concept: ${input.prompt}. ${classContext} ${colorContext}`,
          },
        ],
        temperature: 0.8,
      });

      try {
        const generated = JSON.parse(result.text) as {
          name: string;
          lore: string;
          rulesText: string;
          suggestedAbilities: string[];
          manaCost: string;
          power?: number;
          toughness?: number;
          class: string;
        };

        return {
          name: generated.name,
          lore: generated.lore,
          rulesText: generated.rulesText,
          suggestedAbilities: generated.suggestedAbilities,
          manaCost: generated.manaCost,
          power: generated.power,
          toughness: generated.toughness,
          class: generated.class,
        };
      } catch {
        // Fallback if JSON parsing fails
        return {
          name: "Generated Card",
          lore: result.text,
          rulesText: "This card's abilities need to be defined.",
          suggestedAbilities: [],
          manaCost: "3",
          class: input.cardClass ?? "Creature",
        };
      }
    }),

  /**
   * Generate card art using DALL-E
   * Input: Image prompt + card name/lore for context
   * Output: Image URL and prompt used
   */
  generateImage: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(10).max(1000),
        cardName: z.string().optional(),
        lore: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is not configured");
      }

      // Import OpenAI directly for image generation (AI SDK doesn't support image gen yet)
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Enhance the prompt with MTG card art style
      const enhancedPrompt = `Magic: The Gathering card art style. ${input.prompt}.
      ${input.cardName ? `This is for a card called "${input.cardName}".` : ""}
      High quality fantasy illustration, dramatic lighting, detailed.`;

      const response = await client.images.generate({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "vivid",
      });

      const imageUrl = response.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error("Failed to generate image");
      }

      return {
        imageUrl,
        prompt: enhancedPrompt,
        revisedPrompt: response.data?.[0]?.revised_prompt,
      };
    }),

  /**
   * Create a new card
   */
  create: protectedProcedure
    .input(CreateCardSchema)
    .mutation(async ({ ctx, input }) => {
      const [card] = await ctx.db
        .insert(Card)
        .values({
          ...input,
        })
        .returning();

      return card;
    }),

  /**
   * List all cards with optional filters
   */
  list: publicProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          class: z.enum(cardClassEnum.enumValues).optional(),
          createdBy: z.string().optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const filters = [];

      if (input?.search) {
        filters.push(ilike(Card.name, `%${input.search}%`));
      }

      if (input?.class) {
        filters.push(eq(Card.class, input.class));
      }

      if (input?.createdBy) {
        filters.push(eq(Card.createdBy, input.createdBy));
      }

      const cards = await ctx.db.query.Card.findMany({
        where: filters.length > 0 ? and(...filters) : undefined,
        orderBy: desc(Card.createdAt),
        limit: input?.limit ?? 20,
        offset: input?.offset ?? 0,
        with: {
          cardAbilities: {
            with: {
              ability: true,
            },
          },
        },
      });

      return cards;
    }),

  /**
   * Get a single card by ID
   */
  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const card = await ctx.db.query.Card.findFirst({
        where: eq(Card.id, input.id),
        with: {
          cardAbilities: {
            with: {
              ability: true,
            },
          },
        },
      });

      if (!card) {
        throw new Error("Card not found");
      }

      return card;
    }),

  /**
   * Get a single card by slug
   */
  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const card = await ctx.db.query.Card.findFirst({
        where: eq(Card.slug, input.slug),
        with: {
          cardAbilities: {
            with: {
              ability: true,
            },
          },
        },
      });

      if (!card) {
        throw new Error("Card not found");
      }

      return card;
    }),

  /**
   * Delete a card (only if you created it)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Add authorization check to ensure user created this card
      await ctx.db.delete(Card).where(eq(Card.id, input.id));
      return { success: true };
    }),
} satisfies TRPCRouterRecord;
