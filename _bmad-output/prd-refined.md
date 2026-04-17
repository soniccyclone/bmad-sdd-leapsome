# Refined Product Requirement Document (PRD) — Todo App

> Refined from the original PRD through BMAD brainstorming (Question Storming, Six Thinking Hats, Reverse Brainstorming) and adversarial review. Every decision below has documented rationale in the [brainstorming session](brainstorming/brainstorming-session-2026-04-14-001.md).

---

## 1. Product Overview

A full-stack Todo application that allows an individual user to create, view, complete, and delete personal tasks. The application prioritizes clarity, reliability, and a production-quality foundation over feature breadth. This is an intentionally minimal MVP — scope is restricted to core CRUD operations with no plans to extend during this phase.

**Audience:** The end user managing their tasks, and the developers who maintain the codebase. No other personas are optimized for.

---

## 2. Data Model

A todo item consists of exactly these fields:

| Field | Type | Constraints |
|---|---|---|
| `id` | UUIDv7 | Primary key, server-generated. Time-ordered for efficient B-tree indexing and natural insertion ordering. |
| `description` | Plain text | Required, 1-2000 characters (grapheme clusters, not bytes) after whitespace stripping. No markdown, HTML, or rich text. |
| `completed` | Boolean | Default: `false` |
| `created_at` | Timestamp with timezone | Server-generated, immutable |
| `updated_at` | Timestamp with timezone | Server-managed, updated on every mutation |

**No additional metadata.** No tags, priorities, deadlines, categories, or user associations in this version.

---

## 3. Functional Requirements

### 3.1 — Core Operations

| Operation | Behavior |
|---|---|
| **Create** | User submits a plain text description. Server validates (non-empty after whitespace strip, <= 2000 chars), sanitizes input (strip HTML entities), persists, and returns the created todo. |
| **Read (List)** | Returns a paginated list of todos in insertion order (oldest first). Supports hybrid keyset+offset pagination. |
| **Update** | Upserts a todo by ID. Accepts partial updates to `completed` and/or `description`. If the ID does not exist (including previously deleted todos), the upsert resurrects/creates it with the provided fields. All mutations are idempotent. **MVP design note:** Upsert-on-missing is accepted behavior — updating a deleted todo's ID will recreate it. This simplifies the idempotency model at the cost of "un-deleting" being possible via direct API call. |
| **Delete** | Removes a todo by ID. Always returns `204 No Content`, even if the ID does not exist (truly idempotent). |

### 3.2 — Pagination

- **Default:** 10 items per page
- **User-configurable:** Dropdown selector for 10, 20, 30, 40, 50 items per page
- **API:** `?page=N&limit=N` — standard offset pagination (`LIMIT/OFFSET` with `created_at` index).
- **Bounds:** `page >= 1`, `limit` between 1 and 50. Enforced at the API level. API max aligns with UI max.
- **UI:** Page number navigation with direct-jump links. No infinite scrolling.

### 3.3 — Empty, Loading, and Error States

| State | Behavior |
|---|---|
| **Empty list** | Clear message indicating no todos exist, with a prompt to create one. |
| **Loading (initial)** | Loading animation on first page load. Exponential backoff retry if API is unavailable (1s, 2s, 4s, 8s, 16s — max 5 retries). After 5 failures, display "Service unavailable, please try again later." |
| **Loading (mutation)** | Optimistic update — UI reflects the change immediately. If the API call fails, roll back the optimistic update and display an error indication on the affected item. **Rate limit (429):** Display a distinct "Too many requests, please try again shortly" message — not a generic error. |
| **Backend down** | Banner: "Our site is experiencing problems." Preserve all currently visible data. Disable all input controls. No retry queue. **Recovery:** While the banner is shown, poll the `/health` endpoint every 30 seconds. On successful health response, auto-dismiss the banner, re-enable inputs, and trigger a stale-while-revalidate refetch. |
| **Empty last page** | If the last item on a page is deleted, remain on the (now empty) page. Page count updates on next navigation. |

---

## 4. API Contract

The API is defined by an **OpenAPI 3.1 specification** which is the single source of truth for all types, validators, and route schemas. The spec is written first; all code is generated from it.

### 4.1 — Endpoints

| Method | Path | Description | Success | Error |
|---|---|---|---|---|
| `POST` | `/api/todos` | Create a todo | `201 Created` | `400` (validation), `429` (rate limit), `503` (DB down) |
| `GET` | `/api/todos` | List todos (paginated) | `200 OK` | `400` (invalid params), `503` |
| `PATCH` | `/api/todos/:id` | Update todo (completed and/or description). Upsert semantics — creates if ID missing. | `200 OK` | `400` (validation or malformed UUID), `429` (rate limit), `503` |
| `DELETE` | `/api/todos/:id` | Delete a todo. Always 204, even if missing (idempotent). | `204 No Content` | `400` (malformed UUID), `429`, `503` |
| `GET` | `/health` | Health check | `200 OK` | `503` (DB unreachable) |

### 4.2 — Path Parameter Validation

All `:id` path parameters are validated as UUIDv7 format before any database query. Malformed UUIDs return `400` with error code `INVALID_ID` — they never reach the database layer.

### 4.3 — Request/Response Shapes

Defined in the OpenAPI spec. Generated Zod schemas enforce validation at runtime on every request and response. Generated TypeScript types are consumed by both frontend and backend.

### 4.4 — Error Response Format

All error responses follow a consistent shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description of the problem"
  }
}
```

No stack traces, internal paths, or implementation details are exposed in error responses.

---

## 5. Frontend Requirements

### 5.1 — Interaction Model

- **Optimistic updates** for all mutations — UI reflects changes before server confirmation.
- **Stale-while-revalidate** — cached data is shown immediately, refetched silently in the background.
- **Cache invalidation on mutations** — creating, toggling, or deleting a todo invalidates the list cache and triggers a refetch.
- **Staleness window:** < 200ms under normal conditions (assumes low-latency network). On high-latency connections, stale data may be visible for the duration of the network round-trip. Users should not perceive stale data from their own actions due to optimistic updates.

### 5.2 — Responsive Design

- Must work on desktop (1024px+) and mobile (320px+) viewports.
- Touch targets meet WCAG AA minimum (44x44 CSS pixels).
- Layout adapts fluidly — no horizontal scrolling on any supported viewport.

### 5.3 — Visual Design

- Completed todos are **visually distinguishable** from active todos through at least two independent visual cues (e.g., strikethrough + muted color) to ensure accessibility.
- Color contrast meets WCAG AA 4.5:1 ratio for all text.
- Design tokens (colors, spacing, typography) are defined centrally and verified for contrast compliance before implementation.

### 5.4 — Accessibility

- All interactive elements use **semantic HTML** via Radix UI primitives (real `<button>`, `<input>`, `<checkbox>` — no `<div onClick>`).
- Full **keyboard navigation** — all actions reachable via Tab, Enter, Space, Escape.
- **Focus management** — focus moves logically after mutations (e.g., after deleting an item, focus moves to the next item or the input field).
- **Screen reader support** — all buttons have `aria-label` attributes associating them with their parent todo item.
- **Live region** — pagination state changes are announced via `aria-live="polite"` (e.g., "Showing page 2 of 5, 10 results").
- Target: **zero critical WCAG AA violations**.

---

## 6. Security Requirements

- **Input sanitization:** All user input is sanitized server-side before storage. HTML entities are stripped/escaped. Enforced by Zod validators generated from the OpenAPI spec.
- **XSS prevention:** Frontend renders todo descriptions as plain text only. No `dangerouslySetInnerHTML` or equivalent.
- **Rate limiting:** Per-endpoint rate limiting via Fastify plugin (e.g., 100 requests/minute per IP).
- **No sensitive data exposure:** Error responses contain no stack traces, file paths, or internal identifiers.
- **CORS:** Configured to allow only the frontend origin.

---

## 7. Performance Requirements

| Metric | Target |
|---|---|
| API response time (p95) | < 200ms for all endpoints under normal load |
| Time to interactive (frontend) | < 2 seconds on 3G connection |
| Optimistic update latency | < 50ms (UI update before network round-trip) |
| Database query time | < 50ms for paginated list queries |

"Instant" is defined as: the user perceives no delay between their action and the UI response. Optimistic updates achieve this by decoupling perceived latency from network latency.

---

## 8. Non-Functional Requirements

### 8.1 — Database

- **PostgreSQL** via Docker Compose.
- **Drizzle ORM** for typed query building and schema management.
- **AB (expand/contract) migration strategy** — all migrations are backward-compatible. No column renames or drops in the same migration as their replacement.
- **Dev tooling:** Drizzle Studio (or equivalent) for querying local dev database during development.

### 8.2 — Deployment

- **Docker Compose** orchestrates all services (frontend, backend, PostgreSQL).
- **Separate Dockerfiles** for frontend and backend with multi-stage builds, non-root users.
- **Health checks:** `/health` endpoint checked by Docker Compose to determine container readiness. Health endpoint reflects database connectivity status.
- **Volume mount:** PostgreSQL data directory persisted via Docker volume for durability across container restarts.
- **Environment configuration:** Supported via environment variables and compose profiles (dev/test).

### 8.3 — Developer Experience

- **Makefile** as the centralized automation interface — all operations invoked via make targets.
- **`make dev`**: Starts Docker Compose (Postgres + services), validates OpenAPI spec, runs codegen if spec changed, runs Drizzle migrations, starts dev servers.
- **`make test`**: Runs all test suites (unit, integration, E2E).
- **`make codegen`**: Generates types, Zod validators, route schemas, and frontend API client from OpenAPI spec.
- **`make spec-lint`**: Validates OpenAPI spec before codegen.
- **`make contract-check`**: Validates API responses against OpenAPI spec (CI gate).
- **`make db-seed`**: Populates dev database with sample todos.
- **`make db-studio`**: Opens database query interface.
- **`make docker-up`** / **`make docker-down`**: Manage Docker Compose lifecycle.
- All CI steps are make targets — no CI-specific scripts.

### 8.4 — Documentation

- **API documentation:** Auto-generated from the OpenAPI spec.
- **Codebase documentation:** ReadTheDocs integration covering API reference, developer setup, and architecture decisions.
- **README:** Setup instructions (local dev + Docker), how to run tests, links to all documentation.

---

## 9. Testing Requirements

| Layer | Tool | Scope |
|---|---|---|
| Unit tests | Vitest | Business logic, utility functions, Zod schema validation |
| Component tests | Vitest + React Testing Library | React components via Radix UI — rendering, interaction, accessibility |
| Integration tests | Vitest | API endpoints hitting real Postgres — request/response validation using generated Zod schemas (contract testing for free) |
| E2E tests | Playwright | Full user journeys — minimum 5 passing tests |
| Contract tests | Generated Zod validators | Every integration test validates responses against the OpenAPI spec automatically |

- **Coverage target:** Minimum 70% meaningful code coverage.
- **Coverage exclusions:** Generated code (types, validators, API client) is excluded from the coverage denominator.
- **Seed data:** E2E tests use `make db-seed` for consistent test fixtures.

---

## 10. Explicit Exclusions

The following are intentionally excluded from this version and will not be considered during implementation:

- User accounts, authentication, or authorization
- Multi-user support or collaboration
- Task prioritization, deadlines, or due dates
- Notifications (email, push, or in-app)
- Task categories, tags, or labels
- Search or filtering
- Sorting controls (list is insertion-order only)
- Drag-and-drop reordering
- Rich text or markdown in descriptions
- Undo/redo
- Offline support or service workers
- Retry queues for failed mutations
- WebSocket real-time sync between tabs

These are not future commitments. They are listed only to prevent scope creep during implementation.

---

## 11. Success Criteria

| Criterion | Measurable Target |
|---|---|
| Core functionality | All CRUD operations work end-to-end without user guidance |
| Stability | Zero unhandled exceptions in E2E test suite; application survives page refresh, back-button navigation, and container restart without data loss |
| Performance | Meets all targets in Section 7 |
| Accessibility | Zero critical WCAG AA violations in automated audit |
| Test coverage | >= 70% meaningful code coverage (excluding generated code) |
| E2E tests | >= 5 passing Playwright tests covering all user journeys |
| Deployment | `docker-compose up` launches the full application successfully with health checks passing |
| Security | Zero findings from XSS, injection, or input sanitization review |
| Developer experience | New developer can clone, run `make dev`, and have a working environment in under 5 minutes |
