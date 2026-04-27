# Todo App

[![CI](https://github.com/soniccyclone/bmad-sdd-leapsome/actions/workflows/ci.yml/badge.svg)](https://github.com/soniccyclone/bmad-sdd-leapsome/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/soniccyclone/bmad-sdd-leapsome/main/.github/badges/coverage.json)](https://github.com/soniccyclone/bmad-sdd-leapsome/actions/workflows/ci.yml)

A full-stack Todo application built using BMAD spec-driven development. OpenAPI 3.1 specification is the single source of truth -- all types, validators, and the API client are generated from it.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React + TanStack Query + Radix UI + CSS Modules |
| Backend | Fastify + Zod (generated) + Drizzle ORM |
| Database | PostgreSQL 16 |
| API Contract | OpenAPI 3.1 (spec-first, codegen pipeline) |
| Testing | Vitest + React Testing Library + Playwright |
| Infrastructure | Docker Compose + Makefile |

## Quick Start

**Prerequisites:** Node 20+, Docker

```bash
# Clone and setup (installs deps, starts Postgres, runs migrations)
make setup

# Start development servers (frontend on :5173, backend on :3000)
make dev
```

That's it. `make setup` handles everything: dependency installation, Docker services, database creation, and migrations.

## Docker Deployment

```bash
# Build and run all services (frontend on :8080, backend on :3000)
docker compose up --build
```

All three services (Postgres, backend, frontend) have health checks. The backend waits for Postgres, and the frontend waits for the backend.

## Makefile Commands

Run `make help` for a full list. Key commands:

| Command | Description |
|---|---|
| `make setup` | First-time setup: install deps, env, codegen, migrate |
| `make dev` | Start dev environment (Postgres + migrate + servers) |
| `make test` | Run all tests (unit + integration) |
| `make test-e2e` | Run E2E Playwright tests |
| `make codegen` | Regenerate types/schemas/client from OpenAPI spec |
| `make spec-lint` | Validate OpenAPI spec syntax |
| `make db-seed` | Populate dev database with sample data |
| `make db-studio` | Open Drizzle Studio for DB inspection |
| `make docker-up` | Start Docker Compose services |
| `make docker-down` | Stop Docker Compose services |
| `make ci-check` | CI gate: lint spec, codegen, type-check |

## Running Tests

```bash
# Unit + integration tests (24 tests, requires Postgres)
make test

# E2E tests (8 Playwright tests, starts app automatically)
make test-e2e

# Tests with coverage
make coverage
```

## Project Structure

```
todo-app/
├── packages/
│   ├── api-spec/          # OpenAPI spec + generated types/schemas/client
│   ├── backend/           # Fastify API server + Drizzle ORM + migrations
│   └── frontend/          # Vite + React SPA + Playwright E2E tests
├── docs/                  # MkDocs documentation source
├── _bmad-output/          # BMAD process artifacts (specs, reports)
├── Makefile               # All automation commands
├── docker-compose.yml     # Postgres + backend + frontend orchestration
└── package.json           # npm workspaces root
```

The three packages are npm workspaces. `api-spec` is a dependency of both `frontend` and `backend`, ensuring they share the same types and can never drift out of sync.

## BMAD Documentation

### Specifications

- [Project Brief](_bmad-output/project-brief.md) -- high-level project summary and key decisions
- [Refined PRD](_bmad-output/prd-refined.md) -- detailed requirements (refined through adversarial review)
- [Architecture](_bmad-output/architecture.md) -- technical architecture, API design, data model, deployment
- [Test Strategy](_bmad-output/test-strategy.md) -- test pyramid, contract testing, coverage approach

### QA Reports

- [Coverage Report](_bmad-output/coverage-report.md) -- test inventory and coverage analysis
- [Accessibility Report](_bmad-output/accessibility-report.md) -- WCAG AA compliance assessment
- [Security Report](_bmad-output/security-report.md) -- OWASP Top 10 assessment
- [Performance Report](_bmad-output/performance-report.md) -- architectural performance analysis

### Process

- [AI Integration Log](_bmad-output/ai-integration-log.md) -- how AI agents were used throughout development
- [BMAD Roadmap](ROADMAP.md) -- step-by-step BMAD process documentation
- [Brainstorming Session](_bmad-output/brainstorming/brainstorming-session-2026-04-14-001.md) -- Question Storming + Six Thinking Hats + Reverse Brainstorming
