# Zeeze Cards

AI-powered Magic: The Gathering-style trading card game with blockchain integration.

## Features

- **AI Card Creation**: Generate custom cards with GPT-4o (lore/mechanics) and DALL-E 3 (artwork)
- **Full Game Engine**: MTG-style gameplay with mana, combat, abilities, and multiplayer support
- **Deck Building**: Create and validate decks with card limits and legality checking
- **Game Rooms**: Host 2-4 player games with sync/async modes
- **Blockchain Ready**: NFT integration via EAS attestations and ERC-1155 tokens (planned)
- **Cross-Platform**: Web (Next.js/TanStack Start) and mobile (Expo/React Native)

## Tech Stack

Turborepo monorepo containing:

```text
apps
  ├─ expo              # React Native mobile app (Expo SDK 54, NativeWind)
  ├─ nextjs            # Next.js 15 web app (primary)
  └─ tanstack-start    # TanStack Start web app (alternative)
packages
  ├─ api               # tRPC v11 API routes (card CRUD, game logic, AI generation)
  ├─ auth              # Better Auth authentication
  ├─ blockchain        # EAS/ERC-1155 NFT integration (planned)
  ├─ db                # Drizzle ORM + PostgreSQL schema
  ├─ game-engine       # MTG-style game engine (phases, combat, mana, abilities)
  └─ ui                # shadcn/ui components
tooling
  ├─ eslint, prettier, tailwind, typescript
```

## Quick Start

```bash
# Install dependencies
bun i

# Setup environment variables (see .env.example)
cp .env.example .env

# Generate Better Auth schema
bun --filter @zeeze/auth generate

# Push database schema
bun db:push

# Start development servers
bun dev
```

### Environment Variables

Required in `.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - For AI card generation
- `BETTER_AUTH_SECRET` - Auth encryption key
- `BETTER_AUTH_URL` - Auth callback URL

### Mobile Setup

Update `apps/expo/package.json` dev script for your platform:
- **iOS**: `"dev": "expo start --ios"` (requires XCode)
- **Android**: `"dev": "expo start --android"` (requires Android Studio)

For Expo OAuth, deploy Next.js app for auth proxy or add local IP to OAuth provider.

## Deployment

### Next.js → Vercel

1. Create new Vercel project, set root to `apps/nextjs`
2. Add environment variables (`DATABASE_URL`, `OPENAI_API_KEY`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`)
3. Deploy

### Expo → App Stores

```bash
# Install EAS CLI
bun add -g eas-cli

# Build and submit
cd apps/expo
eas build:configure
eas build --platform ios --profile production
eas submit --platform ios --latest
```

Update `getBaseUrl` in `apps/expo/src/utils/api.tsx` to point to production Next.js URL.

## Project Structure

- **Card Schema**: `packages/db/src/schema.ts` - Full MTG card model with abilities, colors, types
- **Game Engine**: `packages/game-engine/src/` - Combat, phases, mana, turns
- **AI Generation**: `packages/api/src/router/card.ts` - OpenAI integration for card creation
- **Blockchain**: `packages/blockchain/src/` - EAS/ERC-1155 NFT logic (in progress)

Built on [create-t3-turbo](https://github.com/t3-oss/create-t3-turbo).
