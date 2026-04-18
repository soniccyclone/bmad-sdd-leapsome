# Security Assessment Report (OWASP Top 10)

**Date:** 2026-04-14
**Scope:** Todo App Monorepo (packages/backend, packages/frontend)
**Framework:** OWASP Top 10 (2021)

---

## 1. Input Validation and Sanitization

### 1.1 Zod Schema Validation

All incoming request bodies and query parameters are validated through Zod schemas before any business logic executes.

| Endpoint | Validation | File:Line |
|----------|-----------|-----------|
| POST /api/todos | `schemas.CreateTodoRequest.safeParse(request.body)` -- enforces `description: string, min(1), max(2000)` | todos.ts:41 |
| GET /api/todos | `PaginationQuery.safeParse(request.query)` -- enforces `page: int, min(1)` and `limit: int, min(1), max(50)` | todos.ts:92 |
| PATCH /api/todos/:id | `UpdateBody.safeParse(request.body)` -- partial `description` + `completed`, with refinement requiring at least one field | todos.ts:148 |
| PATCH /api/todos/:id | UUID format validated via regex before DB query | todos.ts:141 |
| DELETE /api/todos/:id | UUID format validated via regex before DB query | todos.ts:219 |

**Assessment:** PASS. All endpoints use `safeParse` (not `parse`) avoiding thrown exceptions on invalid input. Validation failures return structured 400 errors without leaking internal details.

### 1.2 Sanitization Pipeline

**File:** `packages/backend/src/lib/sanitize.ts`

The `sanitize()` function applies three transformations in order (lines 18-29):
1. Trim leading/trailing whitespace
2. Collapse internal whitespace runs to single spaces
3. Strip HTML tags via regex `/<\/?[a-zA-Z][^>]*>/g`

The `validateDescription()` function (lines 35-43) then enforces:
- Non-empty after sanitization
- Maximum 2000 characters

**Where sanitization is applied:**
- POST /api/todos: `sanitize(parseResult.data.description)` at todos.ts:49
- PATCH /api/todos/:id: `sanitize(updates.description)` at todos.ts:160

**Assessment:** PASS with notes.

- FINDING S1 (Low): The HTML tag regex `/<\/?[a-zA-Z][^>]*>/g` is a defense-in-depth measure, not a primary XSS prevention layer. It handles common tags but could miss edge cases like tags with embedded newlines. This is acceptable because the primary XSS defense is React's output escaping (see Section 2). The sanitize.ts comment at line 15-16 correctly documents this design decision.

### 1.3 Missing Validation

- FINDING S2 (Info): The `Content-Type` header is not explicitly enforced on POST/PATCH endpoints. Fastify's default JSON parser handles this, but a request with `Content-Type: text/plain` and a JSON body may still be parsed depending on configuration. This is standard Fastify behavior and low risk.

---

## 2. XSS Prevention

### 2.1 Backend: Defense-in-Depth Tag Stripping

HTML tags are stripped on input (sanitize.ts:25). As noted in the source comment (sanitize.ts:15-16), this is defense-in-depth, not the primary XSS layer.

### 2.2 Frontend: React Output Escaping

React's JSX text rendering auto-escapes HTML entities. All user-supplied content is rendered as text nodes:

| Component | Rendering | File:Line |
|-----------|-----------|-----------|
| TodoItem description | `{todo.description}` inside `<span>` | TodoItem.tsx:138 |
| TodoItem edit input | `value={editValue}` as controlled input | TodoItem.tsx:119 |
| TodoItem error | `{errorMessage}` inside `<p>` | TodoItem.tsx:156 |

No component uses `dangerouslySetInnerHTML`. All user data flows through React's default escaping.

**Assessment:** PASS. Two-layer defense: server strips tags on input, React escapes on output.

---

## 3. SQL Injection Prevention

### 3.1 Drizzle ORM Parameterized Queries

All database operations use Drizzle ORM's query builder, which generates parameterized SQL:

| Operation | Code | File:Line |
|-----------|------|-----------|
| INSERT | `db.insert(todos).values({...})` | todos.ts:60-69 |
| SELECT with pagination | `db.select().from(todos).orderBy(...).limit(limit).offset(offset)` | todos.ts:103-108 |
| SELECT count | `db.select({ total: count() }).from(todos)` | todos.ts:109 |
| UPSERT | `db.insert(todos).values({...}).onConflictDoUpdate({...})` | todos.ts:180-193 |
| DELETE | `db.delete(todos).where(eq(todos.id, id))` | todos.ts:225 |
| Health check | `db.execute(sql\`SET LOCAL statement_timeout = '3s'; SELECT 1\`)` | health.ts:8 |

The health check uses a raw SQL template literal via Drizzle's `sql` tagged template, which still parameterizes values. The literal string `'3s'` is hardcoded, not user-supplied.

**Assessment:** PASS. No string concatenation or interpolation of user input into SQL. All user values flow through Drizzle's parameterized query builder.

---

## 4. Rate Limiting

### 4.1 Configuration

**File:** `packages/backend/src/app.ts` (lines 29-32)

```
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});
```

Applied globally via `@fastify/rate-limit` with 100 requests per minute per IP.

**Assessment:** PASS for MVP.

- FINDING S3 (Low): Rate limiting uses the default IP-based key. Behind a reverse proxy, all requests may share a single IP unless `X-Forwarded-For` / `trustProxy` is configured. The Fastify instance does not set `trustProxy`. For production deployment behind a load balancer, `trustProxy` should be configured.
- FINDING S4 (Info): No per-endpoint rate limits. The write endpoints (POST, PATCH, DELETE) share the same 100/min budget as reads. A targeted attack could exhaust the rate limit on writes specifically. For MVP this is acceptable.

---

## 5. Error Handling

### 5.1 Structured Error Responses

All error responses use the `errorResponse()` helper (todos.ts:22-24) which returns:

```json
{ "error": { "code": "...", "message": "..." } }
```

Error codes are from a known enum: `VALIDATION_ERROR`, `INVALID_ID`, `SERVICE_UNAVAILABLE`.

### 5.2 No Stack Traces in Responses

| Scenario | Response | File:Line |
|----------|----------|-----------|
| Validation failure | 400 + first Zod issue message | todos.ts:43-45, 94-96, 150-152 |
| Invalid UUID | 400 + "Invalid UUID format" | todos.ts:142-144, 220-222 |
| DB error | 503 + "Database unreachable" (generic) | todos.ts:80-83, 126-129, 204-207, 230-233 |
| Health DB failure | 503 + "Database unreachable" | health.ts:11-16 |
| Unexpected error | Re-thrown (`throw err`) -- Fastify's default handler returns 500 | todos.ts:85, 131, 208, 235 |

**Assessment:** PASS.

- FINDING S5 (Low): When unexpected (non-DB) errors are re-thrown (e.g., todos.ts:85), Fastify's default error handler may include the error message in the response body depending on the `NODE_ENV` setting. In production (`NODE_ENV=production`), Fastify returns a generic "Internal Server Error". In development, it may include the stack trace. Verify that production deployments set `NODE_ENV=production`.
- DB errors are logged server-side with full detail (`app.log.error(err, '...')`) but the response only says "Database unreachable". This is correct information separation.

---

## 6. CORS Configuration

**File:** `packages/backend/src/app.ts` (lines 24-26)

```
await app.register(cors, {
  origin: process.env.FRONTEND_URL!,
});
```

**Assessment:** PASS.

- CORS is restricted to the specific frontend origin from the `FRONTEND_URL` environment variable.
- Not using `origin: true` or `origin: '*'`.
- `@fastify/cors` default settings: no credentials, standard methods allowed.

- FINDING S6 (Info): The CORS configuration uses the default allowed methods (GET, HEAD, PUT, PATCH, POST, DELETE). This is broader than strictly needed (the app only uses GET, POST, PATCH, DELETE). However, this is standard practice and not a vulnerability.

---

## 7. Authentication and Authorization

**Assessment:** N/A for MVP.

The application has no authentication or authorization mechanism. All endpoints are publicly accessible. This is documented as intentional for the MVP scope.

**Security boundary documentation:**

| Concern | Current State | Production Requirement |
|---------|--------------|----------------------|
| Authentication | None | Add JWT/session auth before production |
| Authorization | None (all users can CRUD all todos) | Add user-scoped todo ownership |
| API key | None | Consider API key for external consumers |
| CSRF | No cookies used (API is stateless) | If cookies are added, implement CSRF tokens |

- FINDING S7 (Medium -- acknowledged MVP limitation): Without authentication, any client that can reach the backend can create, read, update, and delete any todo. Rate limiting provides some abuse protection but does not prevent unauthorized access. This must be addressed before any multi-user deployment.

---

## 8. Additional OWASP Categories

### 8.1 A01:2021 -- Broken Access Control

Not applicable (no access control implemented; see Section 7).

### 8.2 A02:2021 -- Cryptographic Failures

- No secrets stored in the codebase. `DATABASE_URL` and `FRONTEND_URL` are environment variables.
- FINDING S8 (Info): The `packages/backend/src/db/index.ts` (line 5) reads `DATABASE_URL` from environment. Ensure the connection string uses SSL in production (`?sslmode=require`). The current code does not enforce SSL.

### 8.3 A04:2021 -- Insecure Design

- The PATCH endpoint uses upsert semantics (todos.ts:179-193). If a client sends a PATCH with a UUID that does not exist, a new todo is created with description "Untitled" (todos.ts:184). This is by design but worth noting.
- FINDING S9 (Low): The upsert behavior means any valid UUID can be used to create a todo via PATCH, which is unusual REST semantics. Clients may expect PATCH to return 404 for non-existent resources. This could lead to confusion or accidental data creation.

### 8.4 A05:2021 -- Security Misconfiguration

- Environment variable validation at startup (app.ts:11-12): `DATABASE_URL` and `FRONTEND_URL` are required. App throws on missing vars.
- Fastify logger level defaults to 'info' (app.ts:16).
- Development transport (pino-pretty) only enabled when `NODE_ENV=development` (app.ts:18-19).

### 8.5 A06:2021 -- Vulnerable and Outdated Components

Not assessed in this review. Recommendation: run `npm audit` regularly.

### 8.6 A07:2021 -- Identification and Authentication Failures

Not applicable (no auth; see Section 7).

### 8.7 A08:2021 -- Software and Data Integrity Failures

- UUIDs are generated server-side using `uuidv7()` (todos.ts:57), not client-supplied for creation.
- Client-supplied UUIDs are only accepted for PATCH and DELETE, where they are validated against the UUID regex.

### 8.8 A09:2021 -- Security Logging and Monitoring Failures

- DB errors are logged with full context: `app.log.error(err, 'Database error during ...')` at todos.ts:80, 126, 204, 230.
- Fastify's built-in request logging provides access logs.
- FINDING S10 (Low): Failed validation attempts (400 responses) are not explicitly logged. While these are normal in a public API, logging them at `warn` level could help detect scanning or fuzzing attempts.

### 8.9 A10:2021 -- Server-Side Request Forgery (SSRF)

Not applicable. The backend does not make outbound HTTP requests based on user input.

---

## 9. Findings Summary

| ID | Severity | Category | Finding | Remediation |
|----|----------|----------|---------|-------------|
| S1 | Low | Input Validation | HTML tag regex is defense-in-depth, not exhaustive | Acceptable as-is; React output escaping is the primary XSS layer |
| S2 | Info | Input Validation | No explicit Content-Type enforcement | Standard Fastify behavior; no action needed |
| S3 | Low | Rate Limiting | No `trustProxy` configured for proxy deployments | Set `trustProxy` in production behind a reverse proxy |
| S4 | Info | Rate Limiting | No per-endpoint rate limits | Consider lower limits for write endpoints in production |
| S5 | Low | Error Handling | Fastify may expose stack traces if NODE_ENV != production | Verify NODE_ENV=production in deployment configs |
| S6 | Info | CORS | Default allowed methods broader than needed | No action needed |
| S7 | Medium | Authentication | No authentication (MVP) | Must add auth before multi-user deployment |
| S8 | Info | Crypto | DB connection may not enforce SSL | Add `?sslmode=require` to production DATABASE_URL |
| S9 | Low | Design | PATCH upsert creates new records for unknown UUIDs | Document the behavior; consider returning 404 if not found for stricter REST semantics |
| S10 | Low | Logging | Failed validations not logged | Add `warn`-level logging for repeated 400s from same IP |

---

## 10. Overall Assessment

**Verdict: Secure for MVP scope** with the explicit acknowledgment that authentication (S7) must be added before production/multi-user deployment.

**Strengths:**
- Consistent input validation via Zod schemas on every endpoint
- Two-layer XSS prevention (server-side tag stripping + React output escaping)
- Fully parameterized SQL via Drizzle ORM (no injection vectors)
- Structured error responses with no stack trace leakage in production mode
- Global rate limiting with reasonable defaults
- CORS restricted to specific frontend origin
- Environment variable validation at startup
- Server-side UUID generation prevents client ID manipulation on creation

**Primary risk:** The absence of authentication (S7) is the single most significant security gap, but is documented as an intentional MVP scope decision. All other findings are Low or Info severity.
