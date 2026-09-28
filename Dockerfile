# Build stage
FROM node:22-slim AS builder

WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

COPY . .
RUN npx prisma generate && NODE_OPTIONS=--max-old-space-size=3072 npm run build

# The Nuxt output bundles its own runtime dependencies, so the final image only
# needs the Prisma CLI on top of it to run `migrate deploy` at startup.
RUN PRISMA_VERSION=$(node -p "require('./node_modules/prisma/package.json').version") \
    && mkdir /prisma-cli && cd /prisma-cli \
    && npm init -y > /dev/null \
    && npm install --omit=dev --no-audit --no-fund "prisma@${PRISMA_VERSION}"

# Production stage
FROM node:22-slim AS production

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /prisma-cli/node_modules ./node_modules
COPY --from=builder /app/.output ./.output
COPY prisma ./prisma/

USER node

EXPOSE 3000

HEALTHCHECK --interval=60s --timeout=5s --start-period=60s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/favicon.ico').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && exec node .output/server/index.mjs"]
