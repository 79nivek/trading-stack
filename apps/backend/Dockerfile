# ---------- Stage 1: Install production dependencies ----------
FROM --platform=linux/amd64 docker.io/node:lts-alpine AS deps

RUN corepack enable

WORKDIR /app

# Copy lockfile and package.json first for better layer caching.
# Changes to source code won't invalidate the dependency cache.
COPY dist/backend/pnpm-lock.yaml dist/backend/package.json ./

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# ---------- Stage 2: Minimal production image ----------
FROM --platform=linux/amd64 docker.io/node:lts-alpine AS runner

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy only the built application (exclude source maps)
COPY dist/backend/main.js dist/backend/package.json ./

# Use non-root user for security
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD [ "node", "main.js" ]
