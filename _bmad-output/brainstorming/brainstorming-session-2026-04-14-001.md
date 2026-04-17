---
stepsCompleted: [1, 2, 3]
inputDocuments: ['Product Requirement Document (PRD) for the Todo App.md', 'leapsome-requirements.txt']
session_topic: 'Full-stack Todo app — scope decisions, tech stack, architecture patterns, implementation strategy'
session_goals: 'Identify PRD gaps, make tech stack decisions, surface edge cases, optimize path to Leapsome success criteria'
selected_approach: 'ai-recommended'
techniques_used: ['Question Storming', 'Six Thinking Hats', 'Reverse Brainstorming']
ideas_generated: [22]
context_file: ''
technique_execution_complete: true
facilitation_notes: 'User is decisive, minimal-first, production-minded. Values spec-driven development, source code availability for AI ingestion, and industrial-strength tooling without unnecessary complexity.'
---

# Brainstorming Session Results

**Facilitator:** Nathan
**Date:** 2026-04-14

## Session Overview

**Topic:** Full-stack Todo app — scope decisions, tech stack, architecture patterns, and implementation strategy
**Goals:**
- Identify gaps and blind spots in the PRD
- Make confident tech stack decisions (framework, DB, deployment)
- Surface edge cases and failure modes early
- Find the most efficient path to exceeding Leapsome success criteria

### Context Guidance

_Working from the existing PRD (simple CRUD Todo app) and Leapsome training requirements (BMAD framework, Docker, 70% coverage, 5+ E2E tests, accessibility, security review)._

### Session Setup

_Broad exploration across all dimensions — scope, tech stack, architecture, and strategy. User wants comprehensive coverage before committing to any decisions._

---

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Full-stack Todo app with focus on PRD gap analysis, tech stack decisions, edge case discovery, Leapsome criteria optimization

**Recommended Techniques:**
- **Question Storming:** Surface unknowns and unstated assumptions before committing to architecture
- **Six Thinking Hats:** Evaluate every decision from six perspectives — facts, feelings, benefits, risks, creativity, process
- **Reverse Brainstorming:** Deliberately break everything to find failure modes, test cases, and security concerns

---

## Technique Execution Results

### Phase 1: Question Storming — Mapping the Unknowns

22 questions raised, all resolved through interactive exploration.

#### Scope Decisions
- **Text input:** No character limit on input field, plain text only (no markdown/rich text rendering). Post-brainstorm: 2000 char max enforced at API level for abuse prevention.
- **Metadata:** Only what the PRD states — description, completion status, creation time. Nothing extra.
- **Ordering:** Natural insertion order (oldest first), no user-controlled sorting.

#### Architecture Decisions
- **Monorepo:** Single repo, npm workspaces
- **Structure:** `packages/api-spec`, `packages/frontend`, `packages/backend`
- **API contract:** OpenAPI spec-first — spec is the source of truth, all types/validators/route schemas generated from it
- **Database:** PostgreSQL via Docker Compose + Drizzle ORM (switched from SQLite during brainstorming — Docker Compose is already required, so the delta is minimal and eliminates all SQLite datetime/concurrency concerns)
- **Dev DB tooling:** Drizzle Studio or similar for querying local dev database during development

#### Tech Stack
- **Frontend:** Vite + React (SPA) — clean, no SSR complexity, component testing maps to Leapsome requirements
- **Backend:** Fastify + OpenAPI (spec-first, generate validators/types from spec)
- **Language:** TypeScript throughout
- **Styling:** CSS Modules
- **Component library:** Radix UI — unstyled accessible primitives, MIT licensed, AI-friendly source code (self-contained per component, 2-3 hops from API to DOM)
- **State management:** TanStack Query — optimistic updates, stale-while-revalidate, cache invalidation
- **Testing:** Vitest + React Testing Library (frontend), Vitest (backend integration), Playwright (E2E)

#### OpenAPI Workflow
- **Spec location:** `packages/api-spec/` workspace package — both frontend and backend depend on it
- **Codegen output:** Zod validators (runtime enforcement) + TypeScript types + Fastify route schemas + typed frontend API client (`openapi-fetch` or similar)
- **Dev workflow:** Codegen runs automatically on dev server start, always-latest during MVP
- **Contract testing:** Response validation baked into integration tests via generated Zod validators
- **Schema validation:** `make spec-lint` catches malformed specs before codegen runs
- **API docs:** Auto-generated from OpenAPI spec, ReadTheDocs integration for full codebase documentation

#### Pagination
- **Strategy:** Hybrid keyset + offset pagination
- **API supports both:** `?cursor=abc&limit=10` for stable traversal, `?page=N&limit=10` for direct jumps
- **Frontend:** Prefers cursors when available, falls back to offset for unvisited pages
- **Defaults:** page=1, limit=10
- **User controls:** Dropdown for 10/20/30/40/50 per page
- **Bounds:** page >= 1, limit between 1 and 1000, enforced in OpenAPI spec

#### Automation & DevEx
- **Makefile:** Centralized command interface — `make dev`, `make test`, `make codegen`, `make docker-up`, `make db-seed`, `make spec-lint`, `make contract-check`
- **CI backbone:** All CI steps are make targets, no CI-specific scripts
- **Seed data:** `make db-seed` populates dev Postgres with sample todos
- **Startup ordering:** Docker Compose `depends_on` with health checks
- **Auto-codegen:** `make dev` validates spec + runs codegen before starting services
- **Auto-migrations:** Drizzle migrations run on dev start, always on latest schema

#### Audience & Philosophy
- **Audience:** Real users and real maintainers — not reviewers. No contrived compliance.
- **Windows support:** Not supported. WSL available for those who need it.

### Phase 2: Six Thinking Hats — Stress-Testing Decisions

#### White Hat (Facts)
Complete inventory of all resolved decisions confirmed. Added Makefile as centralized automation.

#### Red Hat (Gut Feelings)
- Fastify + OpenAPI spec-first feels right
- Drizzle risk acknowledged (later resolved by switching to Postgres)
- Vite + React without Next.js feels like a relief
- CSS Modules is the boring-correct choice
- Makefile is solid

#### Yellow Hat (Benefits)
- OpenAPI spec-first: one artifact serves as architecture doc section, codegen source, and test validator
- Postgres + Drizzle: zero migration concerns, mature driver
- Vite + React: component tests map 1:1 to Leapsome requirements
- Pagination from day one: production-shaped API from the start
- Makefile: self-documenting project, trivially scriptable CI
- Every tool choice serves at least two deliverables

#### Black Hat (Risks)
Top concerns identified:
1. ~~Drizzle + SQLite datetime handling~~ (eliminated by switching to Postgres)
2. OpenAPI codegen toolchain fragility — mitigate by locking versions early
3. Generated code inflating coverage denominator — configure coverage exclusions
4. Pagination multiplying test surface area — budget for it
5. CSS Modules + accessibility requires manual work — mitigated by Radix UI

#### Green Hat (Creative Alternatives — all adopted)
- Generated typed API client for frontend (no hand-written fetch calls)
- Contract testing as CI gate (`make contract-check`)
- Makefile as sole CI interface
- Health endpoint defined in spec, used by Docker + monitoring
- Seed data via `make db-seed`

#### Blue Hat (Process)
- Brainstorming turned a 17-line PRD into 22+ explicit decisions with rationale
- Architecture doc needs to capture every decision with the "why"
- Story creation will be easier with pagination, error states, and health endpoints already defined
- This session itself is a deliverable for the AI integration log

### Phase 3: Reverse Brainstorming — Breaking Everything

#### Security & Input Boundaries
- **Input sanitization:** All user input sanitized server-side, HTML entities stripped/escaped
- **Character limit:** 2000 chars max on todo description, enforced in OpenAPI spec + Zod
- **Whitespace:** Strip during sanitization, reject empty-after-strip
- **Rate limiting:** Fastify rate-limit plugin, sensible defaults (e.g., 100 req/min per IP)
- **Pagination bounds:** Validated in OpenAPI spec, page >= 1, limit 1-1000
- **XSS prevention:** Plain text rendering + server-side sanitization

#### Infrastructure Resilience
- **DB failure:** Fastify returns clean 503 with meaningful error body, health endpoint reflects DB status
- **Initial load:** Loading state with exponential backoff retry, "service unavailable" after N failures
- **Schema validation:** `make spec-lint` catches malformed specs before codegen runs
- **Volume loss:** Accepted risk for MVP single-user scope, documented

#### Data Integrity
- **Optimistic update races:** Timestamped operations for conflict resolution + stale-while-revalidate ensures eventual consistency
- **Idempotent mutations:** All operations are idempotent (upserts, not blind updates)
- **Migration strategy:** AB (expand/contract) migrations from day one — all migrations backward-compatible
- **Empty last page after delete:** Remain on page, stale page count until next navigation

#### Stale SPA State
- **Strategy:** TanStack Query with optimistic updates + stale-while-revalidate + cache invalidation on mutations
- **Result:** Own actions are instant and correct, navigation triggers refetch, staleness window < 200ms

#### Error UX
- **Backend down:** Banner message "Our site is experiencing problems", preserve visible state, disable all inputs, no retry queue
- **Per-action failure:** Optimistic update rolls back, error indication on the failed action

#### Accessibility (via Radix UI)
- Keyboard navigation and focus management built into primitives
- Screen reader announcements for pagination state changes (aria-live region)
- Contrast-verified design tokens defined upfront
- Semantic HTML from Radix primitives (real buttons, real checkboxes)

#### DevEx Resilience
- **Startup ordering:** Docker Compose `depends_on` with health checks — Postgres ready before app starts
- **Stale codegen impossible:** `make dev` always validates spec + runs codegen before starting services
- **Auto-generated docs:** API docs from OpenAPI spec, ReadTheDocs for full codebase

---

## Creative Facilitation Narrative

This session moved from a deliberately vague 17-line PRD to a comprehensive set of 22+ architectural decisions, security requirements, and failure mode mitigations. The user (Nathan) demonstrated consistently strong instincts: ruthlessly minimal on scope, production-minded on architecture, and pragmatic about tooling. Key pivot moments included switching from SQLite to PostgreSQL (when the Docker Compose requirement made the SQLite simplicity argument collapse), choosing Radix UI based on AI source code ingestion quality rather than traditional evaluation criteria, and adopting hybrid keyset+offset pagination to solve the offset instability problem without sacrificing direct page navigation.

### Session Highlights

**User Creative Strengths:** Decisive, systems-thinking, production-experienced. Every decision was made through the lens of "what does this look like at scale" even while building an MVP.
**AI Facilitation Approach:** Structured technique progression with deep interactive exploration on key decision points (frontend framework, database choice, component library).
**Breakthrough Moments:** SQLite → Postgres pivot, source-code-availability as component library selection criterion, AB migration strategy from day one.
**Energy Flow:** Consistently high engagement, direct communication style, no time wasted on undecided states.
