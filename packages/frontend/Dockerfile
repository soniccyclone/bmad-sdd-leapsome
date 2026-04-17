# Multi-stage build — must be built from monorepo root context
# docker build -f packages/frontend/Dockerfile .

# ── Builder ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# 1. Copy package manifests needed by npm ci (workspaces require root package.json)
COPY package.json package-lock.json ./
COPY packages/api-spec/package.json packages/api-spec/
COPY packages/frontend/package.json packages/frontend/

# 2. Install all deps (dev included — needed for build tooling)
RUN npm ci

# 3. Copy source for api-spec and frontend
COPY packages/api-spec/ packages/api-spec/
COPY packages/frontend/ packages/frontend/

# 4. Run codegen (generated files are gitignored, so must be produced here)
RUN npm run generate --workspace=packages/api-spec

# 5. Build frontend (tsc + vite build -> dist/)
RUN npm run build --workspace=packages/frontend

# ── Serve ────────────────────────────────────────────────────
FROM nginx:alpine

# Create non-root user
RUN addgroup -g 1001 app && adduser -u 1001 -G app -s /bin/sh -D app

# Adjust nginx directories so non-root user can write
RUN chown -R app:app /var/cache/nginx \
    && chown -R app:app /var/log/nginx \
    && chown -R app:app /etc/nginx/conf.d \
    && touch /var/run/nginx.pid \
    && chown app:app /var/run/nginx.pid

# Copy built static assets
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

# Copy nginx config
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf

USER app

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
