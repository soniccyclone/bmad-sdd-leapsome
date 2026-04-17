# Technical Architecture — Todo App

> Produced through BMAD party mode roundtable (Winston/Architect, Amelia/Developer, Sally/UX Designer, John/PM) and refined through adversarial review. Every decision traces to user value or developer productivity.

---

## 1. System Overview

A full-stack Todo application with a React SPA frontend, Fastify API backend, and PostgreSQL database. All three run as Docker Compose services. The OpenAPI 3.1 specification is the single source of truth — all types, validators, route schemas, and the frontend API client are generated from it.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend   │────▶│   Backend   │────▶│  PostgreSQL  │
│  Vite+React  │◀────│   Fastify   │◀────│   (Docker)   │
│   (Docker)   │     │  (Docker)   │     │   Volume     │
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │
       └────────┬───────────┘
                │
        ┌───────┴───────┐
        │  OpenAPI Spec  │
        │ (api-spec pkg) │
        └───────────────┘
```

---

## 2. Monorepo Structure

```
todo-app/
├── packages/
│   ├── api-spec/              # OpenAPI spec + codegen
│   │   ├── openapi.yaml       # THE source of truth
│   │   ├── codegen.config.ts  # Generation configuration
│   │   └── generated/         # Types, Zod schemas, client
│   │       ├── types.ts       # TypeScript types from spec
│   │       ├── schemas.ts     # Zod validators from spec
│   │       └── client.ts      # Typed fetch client for frontend
│   │
│   ├── backend/
│   │   ├── src/
│   │   │   ├── app.ts         # Fastify app setup + plugins
│   │   │   ├── routes/        # Route handlers (wired to spec)
│   │   │   ├── db/
│   │   │   │   ├── schema.ts  # Drizzle schema definition
│   │   │   │   ├── migrate.ts # Migration runner
│   │   │   │   └── seed.ts    # Dev seed data
│   │   │   └── lib/           # Shared utilities (sanitization, etc.)
│   │   ├── migrations/        # Drizzle migration files
│   │   ├── Dockerfile
│   │   └── vitest.config.ts
│   │
│   └── frontend/
│       ├── src/
│       │   ├── main.tsx        # App entry point
│       │   ├── App.tsx         # Root layout + ErrorBoundary + aria-live
│       │   ├── components/     # UI components
│       │   ├── hooks/          # TanStack Query hooks
│       │   ├── styles/         # CSS Modules + design tokens
│       │   └── lib/            # Utilities
│       ├── Dockerfile
│       └── vitest.config.ts
│
├── docs/                       # MkDocs source for ReadTheDocs
│   └── mkdocs.yml
├── Makefile                    # Centralized automation
├── docker-compose.yml          # Orchestration
├── .env.example                # Default dev environment variables
├── .readthedocs.yaml           # ReadTheDocs config
├── package.json                # Workspace root
└── _bmad-output/               # BMAD artifacts
```

**npm workspaces** link `packages/api-spec` as a dependency of both `packages/frontend` and `packages/backend`. Import paths:
- Backend: `import { TodoSchema, CreateTodoSchema } from '@todo/api-spec/schemas'`
- Frontend: `import { client } from '@todo/api-spec/client'`

---

## 3. Data Model

### 3.1 — Schema (Drizzle)

```typescript
// packages/backend/src/db/schema.ts
import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const todos = pgTable('todos', {
  id: uuid('id').primaryKey(), // UUIDv7, server-generated
  description: text('description').notNull(),
  completed: boolean('completed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
```

### 3.2 — UUIDv7

PostgreSQL does not natively generate UUIDv7. Options:
- **`pg_uuidv7` extension** — cleanest, but requires extension installation in Docker image
- **Application-level generation** — use `uuidv7` npm package in Fastify, pass to Drizzle. Simpler Docker story, no extension dependency.

**Decision:** Application-level generation. The backend generates UUIDv7 before INSERT. Avoids Docker image customization and works with any Postgres instance.

### 3.3 — Indexes

```sql
CREATE INDEX idx_todos_created_at_id ON todos(created_at, id);
```

Composite index supports `ORDER BY created_at ASC, id ASC` + `LIMIT/OFFSET` pagination. The `id` tiebreaker ensures deterministic ordering when two todos share the same `created_at` timestamp (possible with application-level UUIDv7 generation in the same millisecond).

### 3.4 — Migration Strategy

**AB (expand/contract) migrations:**
- Every migration is backward-compatible
- No column renames or drops in the same migration as their replacement
- Drizzle Kit generates migrations from schema diffs
- Down migrations required (enforced in PR checklist)
- Migrations run automatically on `make dev`

---

## 4. API Design

### 4.1 — OpenAPI Spec-First Pipeline

```
openapi.yaml
    │
    ├──▶ openapi-typescript ──▶ TypeScript types
    ├──▶ openapi-zod-client ──▶ Zod validators (runtime enforcement)
    └──▶ openapi-fetch ──▶ Typed frontend API client

Fastify route handlers validate request/response via generated Zod schemas.
Integration tests validate API responses against the same schemas (contract testing for free).
```

**Spec validation enforced by tooling:**
- `make spec-lint` — validates OpenAPI spec syntax before codegen
- `make codegen` — regenerates all artifacts from spec
- `make dev` — runs spec-lint + codegen automatically on startup
- **CI gate:** PR fails if generated types diverge from spec (codegen runs in CI, diff check on generated files)

### 4.2 — Endpoints

| Method | Path | Description | Success | Error |
|---|---|---|---|---|
| `POST` | `/api/todos` | Create a todo | `201` | `400`, `429`, `503` |
| `GET` | `/api/todos` | List todos (paginated) | `200` | `400`, `503` |
| `PATCH` | `/api/todos/:id` | Update (completed/description, upsert) | `200` | `400`, `429`, `503` |
| `DELETE` | `/api/todos/:id` | Delete (always 204, idempotent) | `204` | `400`, `429`, `503` |
| `GET` | `/health` | Health check (DB connectivity) | `200` | `503` |

### 4.3 — Pagination

Standard offset pagination:
- Query params: `?page=N&limit=N`
- Bounds: `page >= 1`, `limit` 1-50 (enforced by Zod)
- Default: `page=1`, `limit=10`
- Order: `created_at ASC, id ASC` (oldest first, with `id` as tiebreaker for deterministic pagination)

Response envelope:
```json
{
  "data": [{ "id": "...", "description": "...", "completed": false, "createdAt": "...", "updatedAt": "..." }],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

### 4.4 — Path Parameter Validation

All `:id` params validated as UUID format via Zod before any DB query. Malformed UUIDs return `400` with `INVALID_ID` error code.

### 4.5 — Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description"
  }
}
```

Error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `INVALID_ID`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`.

No stack traces, file paths, or internal identifiers in any error response.

### 4.6 — Security

- **Input sanitization:** Server-side, before storage, implemented in `packages/backend/src/lib/sanitize.ts`. Pipeline:
  1. Trim leading/trailing whitespace
  2. Collapse internal whitespace runs to single spaces
  3. Strip HTML tags (regex-based — no DOM parser needed since we only accept plain text)
  4. Escape remaining HTML entities (`&`, `<`, `>`, `"`, `'`) as a defense-in-depth measure
  5. Validate length post-sanitization (1-2000 characters)
  - No external library required — the sanitization surface is small (plain text only, no rich content). A hand-rolled function with comprehensive unit tests is sufficient and avoids a DOMPurify dependency that's designed for a much harder problem (sanitizing HTML for safe rendering).
- **XSS prevention:** Frontend renders plain text only via React's default text escaping. No `dangerouslySetInnerHTML` anywhere in the codebase.
- **Rate limiting:** `@fastify/rate-limit` plugin, per-endpoint (e.g., 100 req/min per IP). App-layer for MVP; document that production moves this to edge/reverse proxy.
- **CORS:** Allow only the frontend origin.

---

## 5. Frontend Architecture

### 5.1 — Component Hierarchy

```
App
├── ErrorBoundary (global, feeds aria-live="assertive" region)
├── Header
├── TodoForm (smart: owns create mutation)
│   ├── Input (Radix)
│   └── SubmitButton (Radix)
├── TodoList
│   └── TodoItem (smart: owns toggle/delete/edit mutations)
│       ├── Checkbox (Radix — toggle complete)
│       ├── Description (display, plain text)
│       ├── EditInput (Radix — inline edit)
│       └── DeleteButton (Radix)
├── Pagination
│   ├── PageNumbers (direct-jump links)
│   └── LimitDropdown (Radix Select — 10/20/30/40/50)
├── LoadingState (initial load + retry)
├── EmptyState (distinct from loading — different copy, different visuals)
└── ErrorBanner (backend-down state with health poll recovery)
```

**Smart vs dumb components:**
- **Smart (own mutation state):** `TodoForm`, `TodoItem` — these call TanStack Query mutations and display their own pending/error states
- **Dumb (display only):** `Description`, `PageNumbers`, `LoadingState`, `EmptyState` — receive props, render UI

### 5.2 — State Management (TanStack Query)

```typescript
// packages/frontend/src/hooks/useTodos.ts
export function useTodos(page: number, limit: number) {
  return useQuery({
    queryKey: ['todos', { page, limit }],
    queryFn: () => client.GET('/api/todos', { params: { query: { page, limit } } }),
    staleTime: 0, // always refetch on focus/mount
  });
}

// packages/frontend/src/hooks/useCreateTodo.ts
export function useCreateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (description: string) =>
      client.POST('/api/todos', { body: { description } }),
    onMutate: async (description) => {
      // 1. Cancel in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      // 2. Snapshot current data for rollback
      const previousTodos = queryClient.getQueryData(['todos']);

      // 3. Optimistic update — insert a temporary todo with a placeholder ID
      queryClient.setQueryData(['todos'], (old) => ({
        ...old,
        data: [...(old?.data ?? []), {
          id: crypto.randomUUID(), // placeholder, replaced on refetch
          description,
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
      }));

      // 4. Return snapshot as context for rollback
      return { previousTodos };
    },
    onError: (err, _vars, context) => {
      // Rollback to snapshot
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
      // 429 gets a distinct message (handled by error display component)
    },
    onSettled: () => {
      // Refetch to get server-confirmed state
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}
```

**Pattern for all mutations:**
1. `onMutate` → cancel in-flight queries → snapshot current data → optimistic update
2. `onError` → rollback to snapshot → display error (distinct message for 429)
3. `onSettled` → invalidate and refetch (stale-while-revalidate)

### 5.3 — Error Handling Architecture

```
App.tsx
├── <ErrorBoundary> (catches render errors)
├── <div aria-live="assertive"> (global announcements)
│   └── ErrorBanner (shown when backend unreachable)
│       ├── Polls /health every 30s while visible
│       ├── Auto-dismisses on recovery
│       └── Re-enables inputs + triggers refetch
├── <main>
│   └── ... (normal app content)
```

**Error state hierarchy:**
1. **Render error** → ErrorBoundary catches, shows fallback UI
2. **Backend unreachable** → ErrorBanner at app root, disable inputs, health poll
3. **Mutation failure (4xx)** → Per-item error indication on the TodoItem that triggered it
4. **Rate limit (429)** → Distinct "too many requests" message, not generic error
5. **Initial load failure** → Loading animation with 5-retry exponential backoff (1s/2s/4s/8s/16s), then "service unavailable"

### 5.4 — Accessibility

- **Radix UI primitives** — semantic HTML, keyboard navigation, aria attributes built in
- **Two visual cues for completed state** — strikethrough + muted color (both defined in design tokens, contrast-verified)
- **Touch targets** — minimum 44x44 CSS pixels, our responsibility on top of Radix primitives
- **Focus management** — not required for MVP (post-MVP enhancement)
- **Live region** — `aria-live="polite"` for pagination state changes ("Showing page 2 of 5")
- **Global error region** — `aria-live="assertive"` at app root for error banner
- **Loading vs empty** — visually and semantically distinct states with different copy

### 5.5 — Styling

- **CSS Modules** — scoped styles, vanilla CSS, no build complexity
- **Design tokens** — centralized file defining colors, spacing, typography
- **Contrast verification** — all text colors verified against WCAG AA 4.5:1 ratio before implementation
- **Responsive** — fluid layout, 320px-1024px+, no horizontal scrolling, media queries for breakpoints

---

## 6. Backend Architecture

### 6.1 — Fastify Application Structure

```typescript
// packages/backend/src/app.ts
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import { todoRoutes } from './routes/todos';
import { healthRoute } from './routes/health';

const app = Fastify({ logger: true });

app.register(cors, { origin: process.env.FRONTEND_URL });
app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
app.register(todoRoutes, { prefix: '/api/todos' });
app.register(healthRoute);
```

### 6.2 — Route Handler Pattern

Every route handler:
1. Validates request against generated Zod schema (params, query, body)
2. Calls the database via Drizzle
3. Validates response against generated Zod schema
4. Returns typed response

```typescript
// packages/backend/src/routes/todos.ts
app.post('/api/todos', async (request, reply) => {
  const body = CreateTodoSchema.parse(request.body);
  const sanitized = sanitize(body.description);
  const id = generateUUIDv7();
  const todo = await db.insert(todos).values({
    id,
    description: sanitized,
  }).returning();
  reply.status(201).send(TodoResponseSchema.parse(todo[0]));
});
```

### 6.3 — Logging

Fastify's built-in Pino logger with structured JSON output:

```typescript
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' } // human-readable in dev
      : undefined,                 // JSON in production/Docker
  },
});
```

**Log levels by context:**
- `info` — request start/end (Fastify default), migration runs, server startup
- `warn` — rate limit triggered, validation failure, deprecated usage
- `error` — unhandled exceptions, DB connection failure, health check failure

Fastify automatically logs every request with method, URL, status code, and response time. Request IDs are generated by Fastify and included in every log line for correlation.

### 6.4 — Health Endpoint

```typescript
app.get('/health', async (_request, reply) => {
  try {
    await db.execute(sql`SELECT 1`);
    reply.send({ status: 'ok' });
  } catch {
    reply.status(503).send({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Database unreachable' }
    });
  }
});
```

Used by:
- Docker Compose health check (container readiness)
- Frontend health poll (error banner recovery)

---

## 7. Deployment Architecture

### 7.1 — Docker Compose (Single File)

```yaml
services:
  postgres:
    image: postgres:16
    env_file: .env
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U todo"]
      interval: 5s
      timeout: 3s
      retries: 5

  backend:
    build: ./packages/backend
    depends_on:
      postgres:
        condition: service_healthy
    env_file: .env
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 3s
      retries: 3

  frontend:
    build: ./packages/frontend
    depends_on:
      backend:
        condition: service_healthy
    ports:
      - "5173:5173"

volumes:
  pgdata:
```

### 7.2 — Dockerfiles

Both use multi-stage builds with non-root users:

**Backend:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
RUN addgroup -g 1001 app && adduser -u 1001 -G app -s /bin/sh -D app
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
USER app
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**Frontend:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
RUN addgroup -g 1001 app && adduser -u 1001 -G app -s /bin/sh -D app
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
```

The nginx config handles:
- **SPA fallback:** All non-file routes return `index.html` (client-side routing)
- **Caching headers:** Static assets (JS/CSS) get long-lived cache with content-hash filenames; `index.html` gets `no-cache`
- **Compression:** gzip enabled for text assets

### 7.3 — Environment Configuration

**Variables:**
- `DATABASE_URL` — Postgres connection string
- `FRONTEND_URL` — CORS origin
- `PORT` — Backend port (default 3000)
- `NODE_ENV` — development/production/test
- `LOG_LEVEL` — Pino log level (default: `info`)

**Strategy:**
- `.env.example` checked into the repo with default development values
- `.env` gitignored, created by `make setup` from `.env.example`
- Docker Compose uses `env_file: .env` instead of hardcoded values
- Compose profiles for dev/test environments via `docker compose --profile test up`

---

## 8. Makefile Automation

```makefile
.PHONY: dev test test-e2e codegen spec-lint contract-check db-seed db-studio db-wait docker-up docker-down docs-build docs-serve setup

setup:             ## First-time setup: install deps, env, codegen, migrate
	cp -n .env.example .env || true
	npm install
	$(MAKE) docker-up
	$(MAKE) db-wait
	$(MAKE) codegen
	$(MAKE) db-migrate

dev:               ## Start dev environment (Postgres + codegen + migrate + servers)
	$(MAKE) docker-up
	$(MAKE) db-wait
	$(MAKE) spec-lint
	$(MAKE) codegen
	$(MAKE) db-migrate
	npm run dev --workspaces

test:              ## Run all tests (unit + integration + E2E)
	npm test --workspaces

test-e2e:          ## Run E2E tests (starts app via Playwright webServer config)
	npx playwright test

codegen:           ## Generate types, schemas, client from OpenAPI spec
	cd packages/api-spec && npm run generate

spec-lint:         ## Validate OpenAPI spec syntax
	npx @redocly/cli lint packages/api-spec/openapi.yaml

contract-check:    ## Validate API responses match spec (CI gate)
	npm run test:contract --workspace=packages/backend

db-migrate:        ## Run Drizzle migrations
	npm run db:migrate --workspace=packages/backend

db-seed:           ## Populate dev database with sample todos
	npm run db:seed --workspace=packages/backend

db-studio:         ## Open Drizzle Studio for DB inspection
	npm run db:studio --workspace=packages/backend

docker-up:         ## Start Docker Compose services
	docker compose up -d

docker-down:       ## Stop Docker Compose services
	docker compose down

docs-build:        ## Build API docs (Scalar) + MkDocs site
	$(MAKE) codegen
	cd docs && mkdocs build

docs-serve:        ## Serve docs locally
	cd docs && mkdocs serve

db-wait:           ## Wait for Postgres to be healthy
	@echo "Waiting for Postgres..."
	@until docker compose exec postgres pg_isready -U todo > /dev/null 2>&1; do sleep 1; done
	@echo "Postgres is ready."

help:              ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
```

---

## 9. Testing Architecture

### 9.1 — Test Pyramid

```
        ┌─────────┐
        │   E2E   │  Playwright (5+ tests)
        │ (slow)  │  Full user journeys
        ├─────────┤
        │ Integr. │  Vitest + real Postgres
        │  (med)  │  API endpoint tests with Zod contract validation
        ├─────────┤
        │  Unit   │  Vitest
        │ (fast)  │  Business logic, sanitization, validation
        ├─────────┤
        │  Comp.  │  Vitest + React Testing Library
        │ (fast)  │  Component rendering, interaction, accessibility
        └─────────┘
```

### 9.2 — Contract Testing (Free)

Every integration test validates responses against generated Zod schemas:

```typescript
// Response contract: valid responses match the spec
const response = await app.inject({ method: 'GET', url: '/api/todos?page=1&limit=10' });
const parsed = TodoListResponseSchema.safeParse(response.json());
expect(parsed.success).toBe(true);
```

Request validation is also tested — every endpoint has negative tests confirming that invalid input is rejected with the correct error code:

```typescript
// Request contract: invalid input returns 400 with correct error shape
const response = await app.inject({
  method: 'POST', url: '/api/todos',
  payload: { description: '' }, // empty after whitespace strip
});
expect(response.statusCode).toBe(400);
const error = ErrorResponseSchema.safeParse(response.json());
expect(error.success).toBe(true);
expect(error.data.error.code).toBe('VALIDATION_ERROR');
```

If the API drifts from the spec — either accepting invalid input or producing invalid output — tests fail automatically.

### 9.3 — Coverage

- **Target:** 70% meaningful coverage
- **Exclusions:** All files in `packages/api-spec/generated/` excluded from coverage denominator
- **Vitest config:** `coverage.exclude: ['**/generated/**']`

### 9.4 — E2E Scenarios (Playwright)

Minimum 5 tests:
1. Create a todo
2. Complete a todo (toggle)
3. Delete a todo
4. Empty state display
5. Pagination navigation

**Infrastructure:** Playwright's `webServer` config starts the frontend and backend automatically before tests run. No manual `make dev` required — `make test-e2e` is self-contained.

Seed data via `make db-seed` for consistent test fixtures. Playwright `globalSetup` runs seed before the test suite.

---

## 10. Documentation Architecture

- **API docs:** Auto-generated from OpenAPI spec using [Scalar](https://github.com/scalar/scalar) (modern, OpenAPI 3.1 native). Served as a static page built during `make codegen`. Accessible at `/docs` in the frontend build or via `make docs-serve`.
- **Codebase docs:** MkDocs with Material theme, hosted via ReadTheDocs. Source lives in `docs/` at monorepo root. Sections: developer setup, architecture decisions, API reference (embeds Scalar output), contributing guide.
- **Config:** `.readthedocs.yaml` at repo root, `docs/mkdocs.yml` for MkDocs config.
- **Build:** `make docs-build` generates both API docs (from spec) and MkDocs site. CI publishes on merge to main.
- **README:** Setup instructions (local + Docker), how to run tests, links to hosted docs.
- **Makefile:** Self-documenting via `make help`.

---

## 11. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| OpenAPI spec discipline breaks under velocity | Medium | High | Codegen in CI, PR fails if generated files diverge. `make dev` enforces spec-lint + codegen on every startup. |
| Generated code inflates coverage denominator | High | Medium | Vitest coverage exclusions for `**/generated/**`. |
| UUIDv7 library adds unexpected complexity | Low | Low | Application-level generation via npm package. Fallback: UUIDv4 with separate `created_at` index. |
| Rate limiting insufficient at app layer | Low (MVP) | Low | Document as app-layer for MVP. Production moves to edge/reverse proxy. |
| Radix UI missing a needed primitive | Low | Low | Todo app surface area is small: checkbox, button, input, select, toast. All covered. |

---

## 12. Architectural Decisions Log

| # | Decision | Rationale | Alternatives Considered |
|---|---|---|---|
| ADR-01 | OpenAPI spec-first with codegen | Single source of truth prevents frontend/backend drift. Contract testing for free. | Code-first with swagger generation (rejected: spec becomes afterthought) |
| ADR-02 | Vite + React SPA over Next.js SSR | No SSR complexity needed. Component testing maps to requirements. Separate Dockerfiles requirement. | Next.js (rejected: SSR unnecessary, couples frontend to Node runtime) |
| ADR-03 | Fastify over Express | First-class schema validation, natural fit with OpenAPI pipeline. | Express (rejected: no native schema support, Zod bolted on) |
| ADR-04 | PostgreSQL over SQLite | Docker Compose already required. Eliminates datetime/concurrency concerns. Drizzle's most mature driver. | SQLite (rejected: datetime quirks, single-writer limitation) |
| ADR-05 | Drizzle over Prisma/Knex | Typed DSL close to SQL, lightweight, schema-as-code. SQLite→Postgres was trivial (now moot). | Prisma (rejected: heavy, opinionated), Knex (rejected: types bolted on) |
| ADR-06 | Radix UI over React Aria/Headless UI | Accessible primitives with AI-friendly source code. Self-contained per component, 2-3 hops from API to DOM. | React Aria (rejected: 3-tier architecture, hard to trace), Headless UI (rejected: limited component set) |
| ADR-07 | TanStack Query for state | Optimistic updates + SWR + cache invalidation in one library. Industry standard for server state. | Manual fetch + useState (rejected: reimplements TanStack Query poorly) |
| ADR-08 | Offset pagination over hybrid keyset+offset | Single-user app, predictable load. Keyset adds complexity for a problem that doesn't exist. | Hybrid (rejected during party mode: YAGNI) |
| ADR-09 | No speculative schema (parent_id) | YAGNI. Unused nullable column is cognitive overhead and implies contracts that don't exist. | Add parent_id now (rejected: speculative architecture) |
| ADR-10 | Application-level UUIDv7 generation | Avoids pg_uuidv7 extension dependency. Works with any Postgres instance. | DB-level generation (rejected: Docker image customization) |
| ADR-11 | Makefile as automation layer | Self-documenting, CI-portable, language-agnostic. Single entry point for all operations. | npm scripts only (rejected: fragmented across workspaces) |
| ADR-12 | Single Docker Compose (no registry) | Training exercise, not production deployment. Simplest path to deliverable. | Separate images + registry (rejected: production concern, out of scope) |
