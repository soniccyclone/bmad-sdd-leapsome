# Test Strategy — Todo App

> Derived from the [Architecture Doc](architecture.md) section 9 and [Refined PRD](prd-refined.md) section 9. Every test traces to a user-facing behavior or an API contract.

---

## 1. Testing Philosophy

- **Tests verify behavior, not implementation.** Test what the user or consumer sees, not internal function calls.
- **Contract testing is free.** Every integration test validates responses against generated Zod schemas — if the API drifts from the OpenAPI spec, tests fail automatically.
- **Tests run with real infrastructure.** Integration tests hit real Postgres, not mocks. E2E tests run against real frontend + backend.
- **Coverage measures what matters.** Generated code is excluded from the denominator. 70% is the floor, not the target.

---

## 2. Test Pyramid

```
        ┌─────────────┐
        │     E2E      │  5+ Playwright tests — full user journeys
        │   (slowest)  │  Runs against real app via webServer config
        ├──────────────┤
        │ Integration  │  API endpoint tests — Vitest + real Postgres
        │   (medium)   │  Every response validated against OpenAPI spec
        ├──────────────┤
        │    Unit      │  Business logic — Vitest
        │   (fastest)  │  Sanitization, validation, UUIDv7, utilities
        ├──────────────┤
        │  Component   │  React components — Vitest + React Testing Library
        │   (fastest)  │  Rendering, interaction, accessibility
        └──────────────┘
```

---

## 3. Unit Tests (Vitest)

**Location:** `packages/backend/src/**/*.test.ts`, `packages/frontend/src/**/*.test.ts`

### 3.1 — Backend Unit Tests

| Module | What to Test | Example Cases |
|---|---|---|
| `lib/sanitize.ts` | Full sanitization pipeline | Trim whitespace, collapse internal whitespace, decode HTML entities before encoding (prevent double-escape), strip HTML tags, escape entities, reject empty-after-strip, reject >2000 chars, handle multi-byte UTF-8 characters, handle pre-encoded input like `&amp;` |
| `lib/uuid.ts` | UUIDv7 generation | Returns valid UUID format, is time-ordered (two sequential calls produce sortable IDs), is unique across 1000 rapid calls |
| Zod schemas (generated) | Schema validation | These are tested indirectly via integration tests — no separate unit tests needed for generated code |

### 3.2 — Frontend Unit Tests

| Module | What to Test | Example Cases |
|---|---|---|
| `lib/pagination.ts` | Pagination utility functions (if any) | Page number calculation, bounds clamping, total pages from total + limit |
| `lib/errors.ts` | Error classification | Distinguish 400 vs 429 vs 503, extract error code from response body, format user-facing messages |

**Note:** Most frontend logic lives in TanStack Query hooks and React components, which are tested at the component and integration layers, not as unit tests.

---

## 4. Component Tests (Vitest + React Testing Library)

**Location:** `packages/frontend/src/components/**/*.test.tsx`

**Mocking strategy:** Component tests wrap each component in a test `QueryClientProvider` with a mocked TanStack Query client. Mutations are mocked via `vi.fn()` to verify they're called with correct arguments and to simulate pending/error/success states. No network requests are made — component tests verify rendering and interaction behavior in isolation.

**Timer strategy:** Components that use `setInterval` (e.g., ErrorBanner's 30s health poll) are tested with `vi.useFakeTimers()` to advance time without waiting. Tests call `vi.advanceTimersByTime(30000)` to trigger poll cycles.

### 4.1 — TodoItem

| Scenario | What to Verify |
|---|---|
| Renders active todo | Description visible, checkbox unchecked, no completed styling |
| Renders completed todo | Two visual cues present (strikethrough + muted color), checkbox checked |
| Toggle mutation | Clicking checkbox triggers toggle mutation, shows pending state |
| Toggle rollback | On mutation error, checkbox reverts to previous state, error indicator shown |
| Delete action | Clicking delete button triggers delete mutation, item removed from list |
| Delete rollback | On mutation error, item reappears, error indicator shown |
| Edit description | Inline edit triggers update mutation, description updates |
| Rate limit error (429) | Distinct "too many requests" message shown, not generic error |
| Keyboard interaction | Checkbox togglable via Space, delete via Enter, tab order correct |
| Accessibility | `aria-label` on buttons associates with parent todo description |

### 4.2 — TodoForm

| Scenario | What to Verify |
|---|---|
| Submit valid description | Calls create mutation, clears input field |
| Reject empty input | Does not submit, shows validation feedback |
| Reject whitespace-only input | Does not submit, shows validation feedback |
| Pending state | Submit button disabled while mutation in flight |
| Error state | Shows error indication on mutation failure |
| Keyboard submission | Enter key submits form |

### 4.3 — Pagination

| Scenario | What to Verify |
|---|---|
| Renders page numbers | Correct number of page links based on totalPages |
| Current page highlighted | Active page visually distinct |
| Page navigation | Clicking page number updates query params and triggers refetch |
| Limit dropdown | Changing limit updates query params, resets to page 1 |
| aria-live announcement | Pagination change announced to screen readers |
| Empty state (totalPages=0) | No pagination controls shown |

### 4.4 — LoadingState

| Scenario | What to Verify |
|---|---|
| Initial loading | Shows loading animation |
| Retry in progress | Shows retry count or animation |
| Max retries exceeded | Shows "service unavailable" message |
| Visually distinct from empty | Different copy, different visuals than EmptyState |

### 4.5 — EmptyState

| Scenario | What to Verify |
|---|---|
| No todos | Shows "no todos yet" message with prompt to create one |
| Visually distinct from loading | Different copy, different visuals than LoadingState |

### 4.6 — ErrorBanner

| Scenario | What to Verify |
|---|---|
| Backend unreachable | Banner visible with "experiencing problems" message |
| Inputs disabled | All form inputs and buttons disabled while banner shown |
| Health poll recovery | Banner auto-dismisses when /health returns 200 |
| Inputs re-enabled | All inputs re-enabled after recovery |

---

## 5. Integration Tests (Vitest + Real Postgres)

**Location:** `packages/backend/src/routes/**/*.integration.test.ts`

**Infrastructure:** Tests use `app.inject()` (Fastify's built-in test helper — no HTTP server needed). Real Postgres via Docker Compose, using a dedicated `todo_test` database.

**Test isolation:** Each test runs inside a database transaction that is rolled back in `afterEach`. This ensures parallel test files never corrupt each other's state. The Vitest setup file wraps the Drizzle client in a transaction context per test.

**Rate limiting isolation:** Rate limit tests run in their own Fastify instance with an isolated rate limiter. They do not share state with other integration tests and can run in parallel safely.

### 5.1 — Contract Testing Pattern

Every integration test validates both request rejection and response shape:

```typescript
// Positive: response matches OpenAPI spec
const response = await app.inject({ method: 'GET', url: '/api/todos?page=1&limit=10' });
expect(response.statusCode).toBe(200);
expect(TodoListResponseSchema.safeParse(response.json()).success).toBe(true);

// Negative: invalid input returns correct error shape
const badResponse = await app.inject({ method: 'POST', url: '/api/todos', payload: { description: '' } });
expect(badResponse.statusCode).toBe(400);
expect(ErrorResponseSchema.safeParse(badResponse.json()).success).toBe(true);
```

### 5.2 — POST /api/todos

| Scenario | Expected | Contract Check |
|---|---|---|
| Valid description | 201, returns created todo with UUIDv7 id | Response matches TodoResponseSchema |
| Empty description | 400, VALIDATION_ERROR | Error matches ErrorResponseSchema |
| Whitespace-only description | 400, VALIDATION_ERROR | Error matches ErrorResponseSchema |
| Description > 2000 chars | 400, VALIDATION_ERROR | Error matches ErrorResponseSchema |
| HTML in description | 201, description sanitized (tags stripped, entities escaped) | Response matches TodoResponseSchema, description is clean |
| Rate limited | 429, RATE_LIMITED | Error matches ErrorResponseSchema |

### 5.3 — GET /api/todos

| Scenario | Expected | Contract Check |
|---|---|---|
| Empty database | 200, empty data array, total=0, totalPages=0 | Response matches TodoListResponseSchema |
| Single page of results | 200, data array with todos, correct pagination | Pagination envelope correct |
| Multiple pages | 200, correct slice of data per page param | Page 2 returns different items than page 1 |
| Default params (no query) | 200, page=1, limit=10 | Defaults applied correctly |
| page=0 | 400, VALIDATION_ERROR | Bounds enforced |
| limit=51 | 400, VALIDATION_ERROR | Bounds enforced |
| limit=-1 | 400, VALIDATION_ERROR | Bounds enforced |
| Ordering deterministic | Items ordered by created_at ASC, id ASC | Two items with same created_at maintain consistent order |

### 5.4 — PATCH /api/todos/:id

| Scenario | Expected | Contract Check |
|---|---|---|
| Toggle completed (existing) | 200, completed flipped, updatedAt changed | Response matches TodoResponseSchema |
| Update description (existing) | 200, description updated and sanitized | Response matches TodoResponseSchema |
| Both fields | 200, both updated | Response matches TodoResponseSchema |
| Empty body {} | 400, VALIDATION_ERROR (at least one field required) | Error matches ErrorResponseSchema |
| Upsert (never-existed ID) | 200, todo created with provided ID | Response matches TodoResponseSchema |
| Upsert (deleted ID — resurrection) | 200, todo recreated with provided ID (intentional MVP behavior) | Response matches TodoResponseSchema, todo appears in GET list |
| Malformed UUID | 400, INVALID_ID | Error matches ErrorResponseSchema |
| Description with HTML | 200, sanitized | Description in response is clean |

### 5.5 — DELETE /api/todos/:id

| Scenario | Expected | Contract Check |
|---|---|---|
| Delete existing todo | 204, no body | Todo gone from subsequent GET |
| Delete already-deleted todo | 204 (idempotent) | No error |
| Delete non-existent ID | 204 (idempotent) | No error |
| Malformed UUID | 400, INVALID_ID | Error matches ErrorResponseSchema |

### 5.6 — GET /health

| Scenario | Expected | Contract Check |
|---|---|---|
| DB is up | 200, { status: 'ok' } | — |
| DB is down | 503, SERVICE_UNAVAILABLE | Error matches ErrorResponseSchema |

### 5.7 — Cross-Cutting

| Scenario | Expected |
|---|---|
| Rate limiting triggers | 429 after exceeding threshold |
| CORS rejects wrong origin | Request from non-FRONTEND_URL origin rejected |
| Unknown endpoint | 404 (Fastify default) |
| Malformed JSON body | 400 |

---

## 6. E2E Tests (Playwright)

**Location:** `packages/frontend/e2e/**/*.spec.ts`

**Infrastructure:**
- Playwright `webServer` config starts both frontend and backend automatically
- `globalSetup` ensures Postgres is running and `todo_test` DB exists with migrations applied
- Each test creates its own data via API calls in `beforeEach` and cleans up in `afterEach` — tests are fully independent and order-insensitive
- A Playwright helper utility wraps `docker compose stop/start backend` for error recovery tests (test #10)
- Tests run against real browsers: Chromium, Firefox, and WebKit (Safari)

### 6.1 — Test Scenarios

| # | Scenario | Steps | Verification |
|---|---|---|---|
| 1 | **Create a todo** | Navigate to app → type description → submit | New todo appears in list, input cleared, todo persists on page refresh |
| 2 | **Complete a todo** | Find uncompleted todo → click checkbox | Todo shows completed styling (strikethrough + muted), checkbox checked, persists on refresh |
| 3 | **Delete a todo** | Find a todo → click delete | Todo removed from list, not present on refresh |
| 4 | **Empty state** | Delete all todos (or start with empty DB) | "No todos yet" message displayed, create prompt visible, no pagination controls |
| 5 | **Pagination navigation** | Seed 15+ todos → verify page 1 shows 10 → click page 2 | Page 2 shows remaining todos, page numbers update, URL query params update |
| 6 | **Edit a todo description** | Find a todo → trigger inline edit → change text → save | Description updated, persists on refresh |
| 7 | **Limit dropdown** | Change per-page limit from 10 to 20 | List shows up to 20 items, pagination updates |

### 6.2 — Accessibility E2E

| # | Scenario | Steps | Verification |
|---|---|---|---|
| 8 | **Keyboard-only workflow** | Tab to input → type → Enter to submit → Tab to checkbox → Space to toggle → Tab to delete → Enter to delete | All actions completable without mouse |
| 9 | **axe-core audit** | Run `@axe-core/playwright` on main page | Zero critical WCAG AA violations |

### 6.4 — Browser Matrix

| Browser | Viewport | Purpose |
|---|---|---|
| Chromium | 1280x720 (desktop) | Primary desktop browser |
| Firefox | 1280x720 (desktop) | Cross-browser compatibility |
| WebKit (Safari) | 1280x720 (desktop) | Safari/macOS compatibility |
| Chromium Mobile | 375x667 (iPhone SE) | Mobile layout + touch targets |
| WebKit Mobile | 390x844 (iPhone 14) | iOS Safari mobile |

Playwright `projects` config defines all five. CI runs all; local dev defaults to Chromium only for speed (`npx playwright test --project=chromium`).

### 6.5 — Error Handling E2E

| # | Scenario | Steps | Verification |
|---|---|---|---|
| 10 | **Backend down recovery** | Stop backend container → verify error banner → restart backend → verify auto-recovery | Banner shows, inputs disabled, banner dismisses on recovery, inputs re-enabled |

---

## 7. Test Infrastructure

### 7.1 — Tooling

| Tool | Purpose | Location |
|---|---|---|
| Vitest | Unit + component + integration tests | All packages |
| React Testing Library | Component rendering and interaction | `packages/frontend` |
| Playwright | E2E browser tests | `packages/frontend/e2e/` |
| `@axe-core/playwright` | Automated accessibility audit | E2E tests |
| `app.inject()` | Fastify test helper (no HTTP server) | `packages/backend` integration tests |

### 7.2 — Test Database Strategy

- Integration tests use a dedicated `todo_test` database (separate from dev `todo`)
- `make test` creates `todo_test` if it doesn't exist before running tests:
  ```makefile
  db-test-ensure:  ## Create test database if it doesn't exist
  	@docker compose exec postgres psql -U $${POSTGRES_USER} -tc \
  		"SELECT 1 FROM pg_database WHERE datname = 'todo_test'" | grep -q 1 \
  		|| docker compose exec postgres psql -U $${POSTGRES_USER} -c "CREATE DATABASE todo_test"
  ```
- Drizzle migrations run against `todo_test` before tests execute
- Each test runs inside a transaction that rolls back in `afterEach` — no cross-test contamination
- No mocks — all tests hit real Postgres

### 7.3 — Makefile Targets

| Target | What It Does |
|---|---|
| `make test` | Starts Postgres, waits for health, ensures `todo_test` DB exists, runs migrations, runs unit + component + integration tests across all workspaces |
| `make test-e2e` | Runs Playwright tests (webServer config starts app) |
| `make contract-check` | Runs contract-specific test suite (CI gate) |

### 7.4 — CI Integration

```
make spec-lint          # Validate OpenAPI spec
make codegen            # Regenerate types/schemas
git diff --exit-code packages/api-spec/generated/  # Fail if generated files changed
make test               # Unit + component + integration
make test-e2e           # E2E with Playwright
make contract-check     # Contract validation
```

---

## 8. Coverage

### 8.1 — Target

**70% meaningful coverage** — measured across backend and frontend combined.

**Merge strategy:** Vitest runs per-workspace and produces individual coverage reports (JSON format). A CI step merges them using `istanbul merge` (via `nyc merge`) into a single combined report. The combined percentage is what's checked against the 70% threshold.

```makefile
coverage:          ## Run tests with coverage and merge reports
	npm test --workspaces -- --coverage --reporter=json
	npx nyc merge packages/backend/coverage packages/frontend/coverage coverage/merged.json
	npx nyc report --temp-dir coverage --report-dir coverage/combined --reporter=text --reporter=lcov
```

### 8.2 — Exclusions

Files excluded from coverage denominator:
- `packages/api-spec/generated/**` — generated types, schemas, client
- `**/*.config.ts` — Vitest, Playwright, Drizzle config files
- `**/migrations/**` — Drizzle migration files
- `packages/backend/src/db/seed.ts` — dev seed script

### 8.3 — Vitest Config

```typescript
// vitest.config.ts (per workspace)
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      exclude: [
        '**/generated/**',
        '**/*.config.ts',
        '**/migrations/**',
        '**/seed.ts',
      ],
    },
  },
});
```

### 8.4 — What "Meaningful" Means

Coverage should be earned by tests that verify behavior, not by tests that exercise code paths for the sake of numbers. Specific guidance:

- **Do test:** Sanitization logic, validation edge cases, optimistic update rollback, error state rendering, pagination bounds
- **Don't test:** Generated code, config files, trivial getters, React component prop types
- **Do test:** Integration endpoints with multiple scenarios per endpoint (happy path + each error path)
- **Don't test:** Fastify plugin registration order, Drizzle migration SQL syntax

---

## 9. Test Data

### 9.1 — Seed Data (`make db-seed`)

The seed script creates a predictable set of todos for **manual testing and development** (not used by automated tests — see 9.2):

| # | Description | Completed | Purpose |
|---|---|---|---|
| 1-10 | "Todo item 1" through "Todo item 10" | false | Fill first page |
| 11-15 | "Todo item 11" through "Todo item 15" | false | Enable pagination testing |
| 16-18 | "Completed task 1" through "Completed task 3" | true | Test completed state styling |
| 19 | Long description (500 chars) | false | Test text wrapping |
| 20 | Description with special chars (`& < > " '`) | false | Test sanitization rendering |

### 9.2 — Automated Test Fixtures

Both integration tests and E2E tests do NOT use seed data. Each test creates its own data via API calls in `beforeEach` and cleans up in `afterEach`. This keeps tests fully isolated, order-insensitive, and deterministic — no test depends on another test's side effects or on seed data being intact.

---

## 10. Test Execution Order

```
1. Unit tests        (fastest — run first, fail fast)
2. Component tests   (fast — DOM rendering)
3. Integration tests (medium — real DB, real Fastify)
4. E2E tests         (slowest — real browser, real stack)
```

`make test` runs 1-3. `make test-e2e` runs 4. CI runs all four sequentially.
