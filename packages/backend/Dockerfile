# Multi-stage build — must be built from monorepo root context
# docker build -f packages/backend/Dockerfile .

# ── Builder ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# 1. Copy package manifests needed by npm ci (workspaces require root package.json)
COPY package.json package-lock.json ./
COPY packages/api-spec/package.json packages/api-spec/
COPY packages/backend/package.json packages/backend/

# 2. Install all deps (dev included — needed for build tooling)
RUN npm ci

# 3. Copy source for api-spec and backend
COPY packages/api-spec/ packages/api-spec/
COPY packages/backend/ packages/backend/

# 4. Run codegen (generated files are gitignored, so must be produced here)
RUN npm run generate --workspace=packages/api-spec

# 5. Build backend (tsc -> dist/)
RUN npm run build --workspace=packages/backend

# ── Production ───────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 app && adduser -u 1001 -G app -s /bin/sh -D app

# Copy package manifests for production install
COPY package.json package-lock.json ./
COPY packages/api-spec/package.json packages/api-spec/
COPY packages/backend/package.json packages/backend/

# Install production deps only
RUN npm ci --omit=dev

# Copy built backend
COPY --from=builder /app/packages/backend/dist packages/backend/dist

# Copy api-spec generated code (backend imports @todo/api-spec at runtime)
COPY --from=builder /app/packages/api-spec/generated packages/api-spec/generated

USER app

EXPOSE 3000

CMD ["node", "packages/backend/dist/server.js"]
