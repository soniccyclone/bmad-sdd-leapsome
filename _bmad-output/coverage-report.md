# Test Coverage Analysis Report

**Date:** 2026-04-14
**Scope:** Todo App Monorepo (packages/backend, packages/frontend)

---

## 1. Current Test Inventory

### Unit Tests: 24 total (Vitest)

**File:** `packages/backend/src/lib/sanitize.test.ts`

| Suite | Tests | What's Covered |
|-------|-------|----------------|
| `sanitize()` | 19 | Trimming, whitespace collapse, HTML tag stripping, angle brackets, ampersands, quotes, HTML entities, empty/whitespace input, UTF-8, long text, tags with attributes |
| `validateDescription()` | 5 | Valid input, empty string, exceeds 2000 chars, boundary at 2000, boundary at 1 |

### E2E Tests: 8 total (Playwright)

**File:** `packages/frontend/e2e/todo.spec.ts` -- 7 tests

| Test | What's Covered |
|------|----------------|
| Create + persist after refresh | POST /api/todos, input clearing, reload persistence |
| Complete + persist after refresh | PATCH toggle, checkbox state, CSS line-through, reload persistence |
| Delete + persist after refresh | DELETE /api/todos/:id, item removal, reload persistence |
| Empty state | "No todos yet" text, pagination hidden |
| Pagination (>10 todos) | Page 1 shows 10, page 2 shows remainder, navigation click |
| Edit description + persist | Click-to-edit, fill, Enter to save, reload persistence |
| Change per-page limit | Radix Select interaction, limit change to 20, pagination disappears |

**File:** `packages/frontend/e2e/accessibility.spec.ts` -- 1 test

| Test | What's Covered |
|------|----------------|
| No critical a11y violations | axe-core scan with WCAG 2.0 AA + 2.1 AA tags, filters to critical/serious |

### Component Tests: 0

No component-level tests exist (no `*.test.tsx` files found).

---

## 2. Gap Analysis: What Is NOT Tested

### Backend -- Untested Files

| File | Functions/Areas Not Tested | Risk |
|------|---------------------------|------|
| `packages/backend/src/routes/todos.ts` | All 4 route handlers (POST, GET, PATCH, DELETE) -- no integration/unit tests for request parsing, Zod validation, UUID regex check, sanitize-then-insert flow, upsert logic, pagination math, DB error handling (`isDbError`), 400/503 responses | **HIGH** |
| `packages/backend/src/routes/health.ts` | Health check route -- no test for the `SELECT 1` query, 503 on DB failure, statement timeout | MEDIUM |
| `packages/backend/src/app.ts` | `createApp()` -- CORS configuration, rate-limit registration, env var validation, Fastify logger setup | MEDIUM |
| `packages/backend/src/db/schema.ts` | Schema definition -- structural correctness, index definition, `$onUpdate` behavior | LOW (declarative) |
| `packages/backend/src/db/index.ts` | DB connection setup, missing DATABASE_URL throw | LOW (infrastructure) |

### Backend -- Specific Untested Logic in `todos.ts`

- `PaginationQuery` Zod schema coercion (line 12-15): page/limit defaults, min/max enforcement
- `UpdateBody` refinement (line 17-19): "at least one field" check
- `errorResponse()` helper (line 22-24)
- `isDbError()` detection (line 26-34): PostgresError name check, `severity`/`code` property detection
- POST handler: Zod parse failure -> 400, sanitize -> validateDescription -> 400, uuidv7 generation, DB insert, 201 response shape, DB error -> 503
- GET handler: pagination math `(page - 1) * limit`, `totalPages = Math.ceil(total / limit) || 0`, concurrent select+count query
- PATCH handler: UUID regex validation, upsert with `onConflictDoUpdate`, default "Untitled" description for new upserts (line 184)
- DELETE handler: UUID regex validation, idempotent delete (no 404 on missing)

### Frontend -- Untested Files

| File | What's Not Tested | Risk |
|------|-------------------|------|
| `packages/frontend/src/components/TodoItem.tsx` | Component rendering, editing flow (click -> input -> Enter/Escape/blur), toggle mutation, delete mutation, error message display, `getErrorMessage()` helper, pending/error CSS states | **HIGH** |
| `packages/frontend/src/components/TodoForm.tsx` | Form submission, disabled state when backend down, disabled when pending, input clearing on success | **HIGH** |
| `packages/frontend/src/components/TodoList.tsx` | List rendering, empty state conditional, `role="list"` attribute | MEDIUM |
| `packages/frontend/src/components/Pagination.tsx` | Page button rendering, `aria-current`, limit select change, pagination announcer DOM update, hidden when `totalPages <= 1` | MEDIUM |
| `packages/frontend/src/components/ErrorBanner.tsx` | Conditional rendering when backend down, recovery message toggle | MEDIUM |
| `packages/frontend/src/components/ErrorBoundary.tsx` | Error catching, fallback UI rendering, reload button | MEDIUM |
| `packages/frontend/src/components/LoadingState.tsx` | Spinner vs error state toggle, retry button callback | LOW |
| `packages/frontend/src/components/EmptyState.tsx` | Static rendering | LOW |
| `packages/frontend/src/hooks/useCreateTodo.ts` | Optimistic update logic (lines 36-75): snapshot, last-page detection, rollback on error, cache invalidation | **HIGH** |
| `packages/frontend/src/hooks/useToggleTodo.ts` | Optimistic toggle across all cached pages, rollback | HIGH |
| `packages/frontend/src/hooks/useDeleteTodo.ts` | Optimistic removal from all cached pages, total decrement, rollback | HIGH |
| `packages/frontend/src/hooks/useUpdateDescription.ts` | Optimistic description update, rollback | HIGH |
| `packages/frontend/src/hooks/useTodos.ts` | Query key generation, error throwing on API error | MEDIUM |
| `packages/frontend/src/hooks/useHealthCheck.ts` | Polling logic, recovery detection, `wasDown` ref behavior | MEDIUM |
| `packages/frontend/src/context/AppContext.tsx` | Context provider, `useAppContext` outside-provider throw | LOW |
| `packages/frontend/src/App.tsx` | Top-level composition, loading/error states, aria-live regions | MEDIUM |

---

## 3. Recommendations for Reaching 70% Coverage

### Priority 1: Backend Route Integration Tests (highest impact)

**File to create:** `packages/backend/src/routes/todos.test.ts`

These tests cover the densest logic in the project. Use `fastify.inject()` to test without a network layer, with a test database or mocked Drizzle.

| Test | Lines Covered |
|------|---------------|
| POST /api/todos with valid body returns 201 + correct shape | todos.ts:38-87 |
| POST /api/todos with empty body returns 400 VALIDATION_ERROR | todos.ts:41-46 |
| POST /api/todos with only-HTML description returns 400 (empty after sanitize) | todos.ts:49-55 |
| POST /api/todos with >2000 char description returns 400 | todos.ts:49-55 |
| GET /api/todos returns paginated list with correct pagination math | todos.ts:90-133 |
| GET /api/todos?page=0 returns 400 | todos.ts:92-97 |
| GET /api/todos?limit=51 returns 400 | todos.ts:92-97 |
| PATCH /api/todos/:id with valid body updates and returns 200 | todos.ts:136-211 |
| PATCH /api/todos/:id with invalid UUID returns 400 INVALID_ID | todos.ts:141-145 |
| PATCH /api/todos/:id with empty body returns 400 (refinement) | todos.ts:148-153 |
| PATCH /api/todos/:id creates via upsert when ID not found | todos.ts:179-193 |
| DELETE /api/todos/:id returns 204 | todos.ts:214-237 |
| DELETE /api/todos/:id with invalid UUID returns 400 | todos.ts:219-223 |
| DELETE /api/todos/:id for missing ID returns 204 (idempotent) | todos.ts:225 |
| DB error triggers 503 SERVICE_UNAVAILABLE (mock DB failure) | todos.ts:78-86, 124-132, 202-210, 228-236 |

**Estimated impact:** ~15 tests covering ~200 lines of untested backend code.

### Priority 2: Backend Health Route Test

**File to create:** `packages/backend/src/routes/health.test.ts`

| Test | Lines Covered |
|------|---------------|
| GET /health returns { status: "ok" } when DB is reachable | health.ts:6-9 |
| GET /health returns 503 when DB is unreachable | health.ts:10-17 |

**Estimated impact:** 2 tests, full coverage of health.ts.

### Priority 3: Frontend Component Tests (Vitest + Testing Library)

**File to create:** `packages/frontend/src/components/__tests__/TodoItem.test.tsx`

| Test | What It Covers |
|------|----------------|
| Renders description text and checkbox | Basic rendering |
| Checkbox click calls toggle mutation | handleToggle() |
| Delete button calls delete mutation | handleDelete() |
| Click description enters edit mode, shows input | handleDescriptionClick(), isEditing state |
| Enter key in edit input saves and exits edit mode | handleEditKeyDown(), saveEdit() |
| Escape key in edit input cancels and restores | handleEditKeyDown(), cancelEdit() |
| Blur on edit input saves | onBlur={saveEdit} |
| Shows error message on mutation error | getErrorMessage(), role="alert" |
| Rate limit error shows specific message | getErrorMessage() with 429 |
| Pending state applies opacity class | isPending logic |

**File to create:** `packages/frontend/src/components/__tests__/TodoForm.test.tsx`

| Test | What It Covers |
|------|----------------|
| Renders input and submit button | Basic rendering |
| Submit calls createMutation with trimmed text | handleSubmit() |
| Submit disabled when input empty or whitespace-only | isDisabled logic |
| Submit disabled when backend is down | isBackendDown check |
| Input cleared on successful create | onSuccess callback |

**File to create:** `packages/frontend/src/components/__tests__/Pagination.test.tsx`

| Test | What It Covers |
|------|----------------|
| Returns null when totalPages <= 1 | Early return |
| Renders correct number of page buttons | pages array generation |
| Active page has aria-current="page" | aria-current attribute |
| Click page button calls onPageChange | handlePageClick() |
| Limit select change calls onLimitChange | handleLimitChange() |

**Estimated impact:** ~20 component tests covering all interactive components.

### Priority 4: Frontend Hook Tests

**File to create:** `packages/frontend/src/hooks/__tests__/useCreateTodo.test.ts`

| Test | What It Covers |
|------|----------------|
| Calls POST /api/todos with description | mutationFn |
| Optimistically adds todo when on last page with room | onMutate last-page logic |
| Does not optimistically add when page is full | onMutate guard |
| Rolls back on error | onError context restore |
| Invalidates queries on settle | onSettled |

Repeat similar pattern for `useToggleTodo`, `useDeleteTodo`, `useUpdateDescription`.

**Estimated impact:** ~15 hook tests covering optimistic update logic.

---

## 4. Priority Order for Maximum Coverage Impact

| Priority | What to Write | Tests | Coverage Gain |
|----------|---------------|-------|---------------|
| **P1** | Backend route integration tests (`todos.test.ts`) | ~15 | Covers the entire API layer -- the core of the application |
| **P2** | Backend health route test (`health.test.ts`) | 2 | Completes backend route coverage |
| **P3** | Frontend component tests (TodoItem, TodoForm, Pagination) | ~20 | Covers all user-facing interactive behavior |
| **P4** | Frontend hook tests (optimistic updates, rollback) | ~15 | Covers the mutation/cache layer |
| **P5** | App.ts integration test (loading, error, composition) | ~3 | Covers top-level wiring |

**Reaching 70%:** Completing P1 + P2 + P3 (approximately 37 new tests) would likely bring overall project coverage above 70%, as these cover the bulk of application logic. The existing 24 unit tests and 8 E2E tests provide a solid base; the major gap is the complete absence of backend route tests and frontend component tests.

---

## 5. Current Coverage Estimate

| Area | Files | Approx. Lines | Tested Lines | Estimated Coverage |
|------|-------|---------------|--------------|-------------------|
| Backend: sanitize.ts | 1 | 43 | 43 | ~100% |
| Backend: routes, app, db | 4 | ~270 | 0 (unit) | ~0% (unit) |
| Frontend: components | 8 | ~320 | 0 (unit) | ~0% (unit) |
| Frontend: hooks | 6 | ~270 | 0 (unit) | ~0% (unit) |
| Frontend: context, App | 2 | ~80 | 0 (unit) | ~0% (unit) |
| **E2E (indirect)** | -- | -- | ~40% indirect | Partial |

**Estimated overall unit test coverage: ~5%** (only sanitize module has unit tests).

With E2E tests providing indirect coverage of the happy path, effective coverage is higher in practice, but formal code coverage tooling would report the unit-level figure.
