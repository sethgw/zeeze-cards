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

# Copy workspace configuration files
COPY package.json turbo.json ./
COPY bun.lock ./

# Copy all workspace packages
COPY apps/ ./apps/
COPY packages/ ./packages/
COPY tooling/ ./tooling/

# Install dependencies using bun with workspace support
RUN bun install --frozen-lockfile

# Add build arguments for environment variables
ARG ASSET_PREFIX

ENV ASSET_PREFIX=${ASSET_PREFIX}

# Build the nextjs app specifically
WORKDIR /app/apps/nextjs
RUN bun run build

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
COPY --from=builder --chown=bunjs:bunjs /app/apps/nextjs/.next/static ./.next/static
COPY --from=builder --chown=bunjs:bunjs /app/apps/nextjs/public ./public

USER bunjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "server.js"]