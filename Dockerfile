# Use an official Bun image as the base
FROM oven/bun:alpine AS deps

# Set working directory
WORKDIR /app

# Copy dependencies files for Bun and Next.js
COPY package.json bun.lock /app/

# Install only dependencies (cached if unchanged)
RUN bun install

# ---- Builder stage ----
FROM oven/bun:alpine AS builder
WORKDIR /app

# Copy installed dependencies and lockfiles from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/bun.lock ./bun.lock
COPY --from=deps /app/package.json ./package.json

# Copy application source code separately (enables better caching)
COPY . .

# Build the Next.js app (output to .next)
RUN SKIP_ENV_VALIDATION=1 bun run --bun build

# ---- Production image ----
FROM oven/bun:alpine AS runner
WORKDIR /app

ENV TZ=America/Sao_Paulo
ENV NODE_ENV=production

# Copy only necessary files from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock ./bun.lock
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/public ./public

EXPOSE 3000

# Start Next.js app in production mode with Bun
CMD ["bun", "run", "start"]
