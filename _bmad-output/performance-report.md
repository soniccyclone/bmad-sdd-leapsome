# Performance Analysis Report

**Date:** 2026-04-14
**Scope:** Todo App Monorepo (packages/backend, packages/frontend)
**Method:** Architectural analysis (no production benchmarks)

> This report assesses performance targets based on architecture, bundle analysis, and database design. Actual measurements under load require production benchmarks with tools like Lighthouse, k6, or pg_stat_statements. Findings here are directional, not measured.

---

## 1. Frontend Bundle Size and Time-to-Interactive

**Target:** TTI < 2s on simulated 3G (1.6 Mbps, 300ms RTT)

**Build output:**
- JavaScript: ~333 KB raw, ~106 KB gzipped
- CSS: ~9.6 KB raw, ~2.2 KB gzipped
- Total transfer: ~108 KB gzipped

**Assessment: LIKELY MET**

At 1.6 Mbps (simulated 3G), 108 KB transfers in roughly 540ms. Adding 300ms RTT for the initial connection, ~300ms for HTML + CSS, and browser parse/execute time, we estimate:

| Phase | Estimate |
|---|---|
| DNS + TCP + TLS | ~300ms (first connection) |
| HTML download + parse | ~100ms |
| JS download (106 KB gzipped) | ~540ms |
| JS parse + execute | ~200-400ms |
| First API call + render | ~400-600ms |
| **Total estimated TTI** | **~1.5-1.9s** |

This is tight but achievable. The Vite build produces hashed filenames, so returning visitors get cache hits on JS/CSS and only pay for the HTML request + API call.

**Risks:**
- The estimate assumes Vite's tree-shaking eliminates dead code from Radix UI and TanStack Query. If bundle grows past ~150 KB gzipped, TTI will exceed 2s on 3G.
- No code splitting is configured. The entire app loads as a single chunk. For a Todo app with one route this is fine -- code splitting would add complexity without meaningful savings.

**What needs measurement:** Run Lighthouse with simulated 3G throttling on the Docker build to get actual TTI. The dev server is not representative due to unbundled ESM.

---

## 2. API Response Time

**Target:** p95 < 200ms

**Architecture:**
- Fastify (one of the fastest Node.js frameworks, ~30K req/s on benchmarks)
- Drizzle ORM (thin SQL wrapper, minimal overhead vs raw queries)
- Single PostgreSQL instance, local Docker network
- Zod validation on request and response (adds ~1-5ms per parse)

**Assessment: LIKELY MET (single-user, low data volume)**

For the expected workload (single user, hundreds to low thousands of todos), the query path is:

```
Request → Zod parse (~1ms) → Drizzle query (~5-20ms) → Zod response parse (~1ms) → JSON serialize (~1ms)
```

Estimated response times by endpoint:

| Endpoint | Estimated p95 | Notes |
|---|---|---|
| `POST /api/todos` | ~10-30ms | Single INSERT + RETURNING |
| `GET /api/todos` | ~15-50ms | SELECT with ORDER BY + LIMIT/OFFSET, composite index |
| `PATCH /api/todos/:id` | ~10-30ms | Single UPDATE + RETURNING by primary key |
| `DELETE /api/todos/:id` | ~5-15ms | Single DELETE by primary key |
| `GET /health` | ~5-15ms | `SELECT 1` with 3s statement timeout |

All well under the 200ms target at single-user scale.

**Risks:**
- Offset pagination degrades as page number increases. `OFFSET 10000` requires Postgres to scan and discard 10000 rows. At single-user scale (< 5000 todos) this is not a concern. At 50K+ rows, late pages could exceed 200ms.
- Rate limiting middleware (`@fastify/rate-limit`) adds per-request overhead for the in-memory store lookup. Negligible but present.
- No connection pooling beyond Drizzle's default. Under concurrent load (not expected for single-user), connection acquisition could add latency.

**What needs measurement:** Use k6 or autocannon against the Docker deployment to measure actual p95 under simulated load. `pg_stat_statements` would reveal actual query execution times.

---

## 3. Optimistic Update Latency

**Target:** < 50ms for UI state change

**Architecture:**
- TanStack Query optimistic updates via `onMutate` callback
- State change is a synchronous `queryClient.setQueryData()` call
- No network round-trip required for the visual update

**Assessment: MET (by design)**

Optimistic updates are client-side state mutations. The `onMutate` callback runs synchronously before the network request fires:

1. Cancel in-flight queries (~0ms, no-op if none pending)
2. Snapshot current data (~0ms, reference copy)
3. `setQueryData` with optimistic value (~1-5ms, triggers React re-render)

The user sees the change within a single React render cycle (~5-16ms depending on frame budget). This is well under 50ms.

**Risks:**
- If the React component tree is deeply nested or re-renders are expensive, the render after `setQueryData` could take longer. For a flat Todo list this is not a concern.
- The `onError` rollback path also needs to feel instant. If the server rejects the mutation (e.g., validation failure), the rollback re-renders the previous state. Same performance profile.

**What needs measurement:** Chrome DevTools Performance tab can measure the actual time from click to paint. React DevTools Profiler can identify if any component re-renders are unexpectedly slow.

---

## 4. Database Query Performance

**Target:** < 50ms for all queries

**Schema:**
```sql
CREATE TABLE todos (
  id UUID PRIMARY KEY,
  description TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_todos_created_at_id ON todos(created_at, id);
```

**Assessment: LIKELY MET**

| Query pattern | Index used | Estimated time |
|---|---|---|
| INSERT single row | Primary key (B-tree) | < 5ms |
| SELECT by id | Primary key (index-only scan) | < 1ms |
| UPDATE by id | Primary key lookup | < 5ms |
| DELETE by id | Primary key lookup | < 5ms |
| SELECT ORDER BY created_at, id LIMIT N OFFSET M | `idx_todos_created_at_id` (composite) | < 10ms for early pages, grows with offset |
| COUNT(*) for pagination total | Sequential scan (no WHERE clause) | < 5ms at low volume, grows linearly |

The composite index on `(created_at, id)` directly supports the `ORDER BY created_at ASC, id ASC` clause used for pagination. Postgres can use the index for both ordering and row selection, avoiding a sort step.

**Risks:**
- `COUNT(*)` for pagination totals requires a full table scan in Postgres (MVCC means no cached row count). At 10K rows this is still fast (~1-2ms). At 100K+ rows it could reach 10-20ms. Not a concern for single-user scale.
- `OFFSET N` performance: Postgres must read and discard N rows. At `OFFSET 5000` with 50 items per page, expect ~5-10ms. At `OFFSET 50000`, potentially 20-50ms. The architecture note in the PRD acknowledges this: "Revisit only if evidence demands keyset."
- No query result caching. Every page load hits Postgres. Acceptable for single-user, but worth noting.

**What needs measurement:** Enable `pg_stat_statements` extension and run `EXPLAIN ANALYZE` on the paginated query with representative data volumes (100, 1000, 10000 rows) to verify index usage and actual execution times.

---

## 5. Summary

| Target | Status | Confidence |
|---|---|---|
| TTI < 2s on 3G | Likely met | Medium -- depends on actual parse/execute time |
| API p95 < 200ms | Likely met | High at single-user scale |
| Optimistic update < 50ms | Met by design | High -- synchronous client-side state |
| DB queries < 50ms | Likely met | High at expected data volumes |

All four performance targets appear achievable given the architecture. The main caveat is that these are architectural assessments, not measurements. The architecture does not contain any obvious bottlenecks or anti-patterns that would cause failures at the expected scale (single user, < 10K todos).

---

## 6. Recommendations

### Measure before optimizing

1. **Run Lighthouse CI** on the Docker frontend build with 3G throttling to get actual TTI numbers.
2. **Run load tests** (k6 or autocannon) against the Docker backend to measure actual p95 response times.
3. **Enable `pg_stat_statements`** in the Docker Postgres config to track real query performance over time.
4. **Use React DevTools Profiler** to verify that optimistic updates render within a single frame.

### Architecture improvements to consider (if measurements show issues)

1. **Bundle splitting:** If TTI exceeds 2s, consider dynamic imports for TanStack Query devtools (if included in production) or Radix UI components that aren't needed on initial render.
2. **Keyset pagination:** If offset pagination shows degradation past page 100 (5000+ offset), switch to cursor-based pagination using `(created_at, id)` as the cursor. The composite index already supports this.
3. **COUNT(*) caching:** If the pagination total count becomes slow, cache it in a Redis counter or use `TABLESAMPLE` for approximate counts. Not needed at single-user scale.
4. **Connection pooling:** If deploying beyond Docker Compose (e.g., managed Postgres), add PgBouncer or use Drizzle's pool configuration to manage connections.
5. **Response compression:** Verify that the Fastify backend sends gzip-compressed responses. The nginx frontend already has gzip enabled, but API responses from Fastify may not be compressed by default -- add `@fastify/compress` if needed.
