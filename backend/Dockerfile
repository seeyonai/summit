# ---- Build stage ----
FROM docker.m.daocloud.io/library/node:20 AS builder
WORKDIR /app

# Install deps first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Runtime stage ----
FROM docker.m.daocloud.io/library/node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Optional: healthcheck tool
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

# Install only production deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled app
COPY --from=builder /app/dist ./dist

# Files directory expected by the app (served at /files)
RUN mkdir -p /app/files \
  && chown -R node:node /app

USER node

# Defaults (can be overridden at runtime)
ENV PORT=2591 \
    RECORDING_FILE_DIR=/app/files
EXPOSE 2591

# Basic healthcheck hitting /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1

CMD ["node", "dist/index.js"]
