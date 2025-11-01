# Docker build command (from monorepo root):
# DOCKER_BUILDKIT=1 docker build \
#   --build-arg ASSET_PREFIX=https://s3.seff.ai/big-pub-bucket \
#   -f apps/nextjs/Dockerfile -t zeeze-nextjs:latest .

# Testing/Development build (without CDN):
# DOCKER_BUILDKIT=1 docker build -f apps/nextjs/Dockerfile -t zeeze-nextjs:test .

# ---- Builder Stage ----
FROM oven/bun:1-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

# Set environment variables for the build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HUSKY=0
ENV SKIP_ENV_VALIDATION=1

# Copy workspace configuration files
COPY package.json turbo.json ./
COPY bun.lock ./

# Copy all workspace packages
COPY apps/ ./apps/
COPY packages/ ./packages/
COPY tooling/ ./tooling/

# Install dependencies using bun with workspace support
# --ignore-scripts skips native module compilation (bufferutil, better-sqlite3)
# These are optional performance optimizations that aren't needed in production
RUN bun install --frozen-lockfile --ignore-scripts

# Add build arguments for environment variables
ARG ASSET_PREFIX

ENV ASSET_PREFIX=${ASSET_PREFIX}

# Build the nextjs app specifically
WORKDIR /app/apps/nextjs
# Skip env validation during build (secrets provided at runtime)
# Provide dummy values for env vars that may be imported during build
RUN SKIP_ENV_VALIDATION=1 \
    POSTGRES_URL=postgresql://dummy:dummy@localhost:5432/dummy \
    AUTH_SECRET=dummy-secret-for-build-only \
    AUTH_DISCORD_ID=dummy \
    AUTH_DISCORD_SECRET=dummy \
    bun run next build

# ---- Static Assets Stage (for CDN extraction) ----
FROM scratch AS static-assets
COPY --from=builder /app/apps/nextjs/.next/static ./.next/static
COPY --from=builder /app/apps/nextjs/public ./public

# ---- Runner Stage ----
FROM oven/bun:1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user and group
RUN addgroup --system --gid 1001 bunjs && adduser --system --uid 1001 bunjs

# Copy the standalone output from the builder stage
COPY --from=builder --chown=bunjs:bunjs /app/apps/nextjs/.next/standalone ./
COPY --from=builder --chown=bunjs:bunjs /app/apps/nextjs/.next/static ./apps/nextjs/.next/static
COPY --from=builder --chown=bunjs:bunjs /app/apps/nextjs/public ./apps/nextjs/public

USER bunjs

EXPOSE 4271
ENV PORT=4271
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "apps/nextjs/server.js"]