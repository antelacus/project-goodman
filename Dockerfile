# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-bookworm-slim AS deps

# Install build dependencies for native modules (canvas, etc.)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci && npm cache clean --force

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for NEXT_PUBLIC_ variables and required env vars
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG OPENAI_API_KEY
ARG SUPABASE_SERVICE_ROLE_KEY

# Set environment variables for build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# ============================================
# Stage 3: Runner
# ============================================
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# Install runtime dependencies for canvas
RUN apt-get update && apt-get install -y \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create log directory with correct permissions
RUN mkdir -p /var/log/goodman && chown nextjs:nodejs /var/log/goodman

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy prompt templates (required at runtime by src/lib/prompts/index.ts)
COPY --from=builder /app/src/lib/prompts ./src/lib/prompts

# Set correct permissions
USER nextjs

# Expose port
EXPOSE 3000

# Set hostname for container
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Start the application
CMD ["node", "server.js"]
