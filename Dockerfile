# Use an official Bun image as the base
FROM oven/bun:latest as deps

# Set working directory
WORKDIR /app

# Copy dependencies files for Bun and Next.js
COPY package.json bun.lock /app/

# Install only dependencies (cached if unchanged)
RUN bun install

# Copy the rest of the application source code
FROM oven/bun:latest as builder
WORKDIR /app

# Copy installed dependencies and lockfiles from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/bun.lock ./bun.lock
COPY --from=deps /app/package.json ./package.json

# Copy application source code separately (enables better caching)
COPY . .

# Build the Next.js app (output to .next)
RUN bun run --bun build
RUN sh -c "if [ -d public ]; then cp -r public .next/standalone/; fi"
RUN cp -r .next/static .next/standalone/.next/

# ---- Production image ----
FROM oven/bun:latest as runner
WORKDIR /app

# wget is used by the container healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends wget && \
    rm -rf /var/lib/apt/lists/*

ENV TZ=America/Sao_Paulo
ENV NODE_ENV=production

# Copy only built output and dependencies

COPY --from=builder /app/.next/standalone/ ./

EXPOSE 3000

# Start Next.js app in production mode
CMD ["bun", "run", "/app/server.js"]
