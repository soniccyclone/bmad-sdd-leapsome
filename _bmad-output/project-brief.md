# Project Brief — Todo App

> This brief provides a high-level summary of the project for anyone who needs context without reading the full PRD. For implementation details, see the [Refined PRD](prd-refined.md). For decision rationale, see the [Brainstorming Session](brainstorming/brainstorming-session-2026-04-14-001.md).

---

## What We're Building

A full-stack Todo application — create, view, edit, complete, and delete personal tasks. Single user, no auth, no collaboration. Intentionally minimal scope with a production-quality foundation.

## Why

This is a training exercise using the BMAD (spec-driven development) framework for the Leapsome pathway. The goal is to demonstrate disciplined, spec-driven methodology — not to build a novel product. The codebase is the deliverable: working app, comprehensive tests, Docker deployment, QA reports, and documentation of how the BMAD process guided implementation.

## Who It's For

- **End user:** A single person managing their todo list
- **Developers:** Anyone reading or maintaining the codebase
- No other personas. Not optimized for reviewers, auditors, or demo audiences.

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| API design | OpenAPI 3.1 spec-first | Spec is the source of truth. Types, validators, route schemas, and API client all generated from it. Purest expression of spec-driven development. |
| Frontend | Vite + React SPA | Component testing maps to requirements. No SSR complexity. Vitest built in. |
| Backend | Fastify + TypeScript | First-class OpenAPI support. Lightweight, fast, well-maintained. |
| Database | PostgreSQL + Drizzle ORM | Eliminates SQLite datetime/concurrency concerns. Docker Compose already required so the delta is minimal. Drizzle provides typed queries with minimal abstraction. |
| Components | Radix UI | Accessible primitives, unstyled (CSS Modules for styling), MIT licensed, AI-friendly source code — each component is self-contained and traceable. |
| State management | TanStack Query | Optimistic updates + stale-while-revalidate + cache invalidation. Handles the SPA staleness problem cleanly. |
| Styling | CSS Modules | Vanilla CSS feel, scoped by default, no build complexity. |
| Pagination | Hybrid keyset + offset | Stable traversal via cursors, direct page jumps via offset fallback. User sees page numbers, not infinite scroll. |
| Automation | Makefile | Single entry point for all operations. Self-documenting. CI steps are make targets — no CI-specific scripts. |
| Migrations | AB (expand/contract) | All migrations backward-compatible from day one. Production habit baked in early. |
| IDs | UUIDv7 | Time-ordered for efficient indexing and natural insertion ordering. |

## Tech Stack Summary

```
Frontend:  Vite + React + TanStack Query + Radix UI + CSS Modules
Backend:   Fastify + OpenAPI + Zod (generated) + Drizzle ORM
Database:  PostgreSQL (Docker Compose)
Testing:   Vitest + React Testing Library + Playwright
Infra:     Docker Compose + Makefile
Docs:      ReadTheDocs (auto-generated from OpenAPI spec + codebase)
```

## Monorepo Structure

```
packages/
  api-spec/      # OpenAPI spec + codegen output (shared dependency)
  frontend/      # Vite + React SPA
  backend/       # Fastify API server
```

All three are npm workspace packages. `api-spec` is a dependency of both `frontend` and `backend`, ensuring they can never drift out of sync.

## Scope Boundaries

**In scope:**
- CRUD operations (create, read, edit, toggle, delete)
- Paginated list view (10/20/30/40/50 per page, page numbers)
- Optimistic updates with graceful error handling
- Input validation and sanitization (2000 char limit, XSS prevention, rate limiting)
- Accessibility (Radix UI, WCAG AA, keyboard navigation, screen reader support)
- Docker Compose deployment with health checks
- 70%+ test coverage, 5+ E2E Playwright tests

**Out of scope (explicitly excluded):**
- Auth, multi-user, collaboration
- Priorities, deadlines, tags, categories
- Search, filtering, sorting controls
- Rich text, notifications, offline support, WebSocket sync

See [PRD Section 10](prd-refined.md#10-explicit-exclusions) for the full exclusion list.

## Success Criteria

| Criterion | Target |
|---|---|
| CRUD | All operations work end-to-end |
| Stability | Zero unhandled exceptions; survives refresh, back-button, container restart |
| Performance | API p95 < 200ms, TTI < 2s on 3G |
| Accessibility | Zero critical WCAG AA violations |
| Coverage | >= 70% (excluding generated code) |
| E2E | >= 5 passing Playwright tests |
| Deployment | `docker-compose up` works with health checks passing |
| Security | Zero XSS/injection findings |
| DevEx | Clone → `make dev` → working in < 5 minutes |

## Deliverables

1. **BMAD artifacts** — project brief (this doc), refined PRD, architecture doc, test strategy
2. **Working application** — frontend + backend, all CRUD operations
3. **Test suites** — unit, integration, component, E2E
4. **Docker deployment** — Dockerfiles + docker-compose.yml
5. **QA reports** — coverage, accessibility, performance, security
6. **Documentation** — README, auto-generated API docs, BMAD process doc, AI integration log, framework comparison

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| OpenAPI codegen toolchain version conflicts | Lock all codegen dependency versions early. `make spec-lint` validates spec before codegen runs. |
| Generated code inflates coverage denominator | Configure Vitest coverage exclusions for all generated files. |
| Pagination multiplies test surface area | Budget for it — pagination touches every layer. |
| Radix UI doesn't cover a needed primitive | For a Todo app the surface area is small (button, checkbox, input, dropdown, toast). All covered by Radix. |

## What's Next

1. Architecture document (Step 1.2) — detailed technical architecture with API contracts, component hierarchy, data flow
2. Story creation (Step 1.3) — break work into beads issues with acceptance criteria
3. Test strategy (Step 1.4) — detailed test scenarios per layer
4. Implementation (Step 2) — build it
