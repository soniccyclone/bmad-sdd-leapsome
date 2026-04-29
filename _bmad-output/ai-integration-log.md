# AI Integration Log

> Maintained throughout implementation. Updated after each substep.

---

## Agent Usage

| Phase | Task | Agent/Tool | Effective Prompts | Outcome |
|---|---|---|---|---|
| 1.1 | PRD brainstorming | Claude Code + BMAD brainstorming skill | Question Storming → Six Thinking Hats → Reverse Brainstorming sequence. Direct, decisive user input kept sessions efficient. | 22+ architectural decisions made before any code. Tech stack, pagination, error handling, security, accessibility all resolved. |
| 1.1 | PRD adversarial review | BMAD adversarial review skill | Review original PRD — found 14 gaps (no data model, no API contract, unmeasurable success criteria, no security, no accessibility). | Every finding addressed in refined PRD. |
| 1.1 | PRD edge case review | BMAD edge case hunter skill | Review refined PRD — found 13 unhandled paths (DELETE idempotency conflict, cursor precedence, retry count, UUID version, etc.). | All 13 folded into refined PRD. |
| 1.2 | Architecture roundtable | BMAD party mode (Winston, Amelia, Sally, John as independent subagents) | "Discuss the technical architecture" → agents react to each other → user challenges YAGNI on parent_id column. | Pagination simplified (dropped hybrid), no speculative schema, smart vs dumb component debate resolved, deployment target locked. |
| 1.2 | Architecture adversarial review | BMAD adversarial review skill | Found 12 issues: Dockerfile dev deps, hand-waved frontend Dockerfile, fragile Makefile, no .env strategy, undefined sanitization, stale updatedAt, missing request contract tests, pseudocode gaps, no logging, E2E needs running app, ReadTheDocs unspecified, pagination tiebreaker. | All 12 fixed. |
| 1.2 | Architecture edge case review | BMAD edge case hunter skill | Found 12 paths: db-wait timeout, optimistic create wrong page, $onUpdate bypass, empty PATCH body, health check timeout, nginx non-root, hardcoded pg username, test needs Postgres, Dockerfile lockfile, totalPages=0, double-escape, CORS undefined. | All 12 fixed. |
| 1.3 | Story creation | Claude Code + beads CLI | Created 8 epics + 35 stories with acceptance criteria and dependency chains. Parallel `bd create` calls for efficiency. | 43 issues, 9 ready to work, 34 blocked by dependencies. |
| 1.4 | Test strategy | Claude Code + BMAD adversarial review | Test strategy produced then reviewed — 10 findings (parallel isolation, test DB creation, Playwright Docker helper, mock strategy, browser matrix, coverage merge, etc.). | All 10 addressed. |
| 2.0 | AI integration log | Claude Code | Created this log file to track AI usage throughout the project. | Log structure established for ongoing updates. |
| 2.1 | Monorepo scaffold | Claude Code | Generated package.json files, tsconfig, .env.example, .gitignore. | Verified with `npm install` + workspace linking. |
| 2.1 | Docker Compose + Makefile | Claude Code | Wrote docker-compose.yml, Makefile with all targets. | Fixed macOS `timeout` compatibility (replaced with portable shell loop). |
| 2.1 | OpenAPI spec + codegen | Claude Code | Wrote openapi.yaml, configured codegen pipeline (openapi-typescript + openapi-zod-client + openapi-fetch). Installed Redocly for spec linting. | Full spec-first contract established with generated types and validation. |
| 2.1 | Sanitization module | Claude Code | Wrote sanitize.ts + 24 unit tests. First attempt had entity encode/decode issues (double-encoding risk). | Simplified to strip-tags-only approach since React handles output escaping. All 24 tests pass. |
| 2.2-2.3 | Parallel implementation | Claude Code (3 subagents) | 3 subagents built backend (Fastify setup, Drizzle schema, 5 route handlers), frontend (App shell, 6 TanStack Query hooks, 5 React components with CSS Modules), and CI/docs (GitHub Actions, MkDocs) simultaneously. | Full stack implemented in parallel with non-overlapping file scopes. |
| 2.4 | E2E tests | Claude Code (subagent) | Wrote 8 Playwright tests (7 functional + 1 accessibility). Configured webServer to auto-start backend + frontend. | All critical user journeys covered. |
| 3 | Docker | Claude Code (subagent) | Wrote Dockerfiles + nginx.conf. Docker verification agent found and fixed 3 production issues: api-spec .ts exports failing at runtime (added tsc build), pino-pretty not in production image (NODE_ENV override), IPv6 localhost resolution in Alpine (use 127.0.0.1). | Production containers verified and working. |
| 4 | QA | Claude Code (subagent) | Produced coverage, accessibility, and security reports by reading actual source code. | Reports generated but based on source analysis, not runtime metrics. |

## MCP Server Usage

MCP servers were integrated late in the project (after all features were complete) as a remediation step. See `_bmad-output/mcp-gap-analysis.md` for why they were initially skipped, and `_bmad-output/mcp-post-mortem.md` for the full findings.

### Chrome DevTools MCP

| Capability Used | Finding |
|---|---|
| Console inspection | Found form field accessibility issue (missing `id`/`name` on input) — fixed |
| Network waterfall | Confirmed all API calls return correct status codes (200/201/204) |
| Resource loading | Found `favicon.ico` 404 — fixed with inline SVG favicon |
| Lighthouse audit (desktop) | Accessibility: 100, Best Practices: 100, SEO: 82 |
| Lighthouse audit (mobile) | Accessibility: 100, Best Practices: 100, SEO: 82 |
| Accessibility tree | Confirmed proper ARIA roles, live regions, disabled states |

### Playwright MCP

| Capability Used | Finding |
|---|---|
| Browser automation | Full CRUD cycle verified (create, toggle, delete) |
| Accessibility snapshots | Semantic structure confirmed (headings, lists, labeled controls, status regions) |
| Mobile viewport (375x812) | Layout responsive, no overflow |
| Screenshot capture | Visual verification of all states (empty, with todos, completed, error) |
| Error state testing | Backend-down state renders gracefully with Retry button; recovery works |

### Postman MCP

Not integrated — user declined API key generation. Spec-first approach (OpenAPI codegen + Zod contract testing) covers most of what it provides.

### Key Lesson

Spec-driven development and MCP visual verification are orthogonal. Contract testing verifies that code output matches the spec. MCP servers verify that the code actually runs in a browser, looks correct, and handles edge cases gracefully. Skipping MCP because you have contract testing is like skipping integration tests because you have types. Both are needed for complete coverage.

## Test Generation

- AI generated 24 unit tests for sanitization (first attempt had 4 failures due to entity encoding logic — AI diagnosed and simplified the approach)
- AI generated 8 E2E Playwright tests covering all user journeys
- AI identified test gaps in coverage report: route handler integration tests and component tests are the priority for reaching 70%
- What AI missed: didn't generate integration tests or component tests during initial implementation — focused on unit + E2E, leaving the middle of the pyramid thin

## Debugging with AI

- **Sanitization double-encoding:** AI's initial encode-then-decode pipeline caused test failures. AI diagnosed that React handles output escaping, making entity encoding unnecessary. Simplified to tag-stripping only.
- **Docker production issues:** Verification agent found 3 issues that only manifest in production containers (not dev). AI diagnosed each from container logs and fixed.
- **Makefile macOS compatibility:** `timeout` command doesn't exist on macOS. AI replaced with portable shell loop.
- **Drizzle env loading:** drizzle-kit push didn't load .env. AI tried tsx --env-file approach (failed), then source .env in Makefile (worked).

## Limitations Encountered

| Phase | Limitation | Workaround |
|---|---|---|
| 1.2 | BMAD party mode agent manifest was empty — bmm module not installed | User ran interactive `npx bmad-method install` manually since CLI required TUI input |
| 1.2 | Edge case hunter and adversarial review output raw JSON/findings — user had to ask for processing | Reviewer role should auto-process findings into actionable format |
| 1.1-1.4 | Each BMAD review skill invocation requires re-reading the full document | Could benefit from incremental review on diffs only |
| 2.1 | BMAD party mode agent manifest was empty on fresh install — needed interactive TUI installer | Claude Code can't automate interactive TUI; user ran manually |
| 2.2-2.3 | Parallel subagents can produce conflicting changes if they modify the same files | Orchestrator must carefully scope prompts to non-overlapping files |
| 2.2-2.3 | AI generated optimistic update code with pseudocode comments initially | Adversarial review caught this; AI rewrote with real implementation |
| 2-4 | MCP servers skipped during implementation despite Leapsome requirements | Integrated post-completion as remediation. Found 2 bugs (favicon 404, form field a11y). Lighthouse confirmed 100/100 accessibility. Lesson: integrate MCP from the start. |
| 4 | Coverage report is based on source code analysis, not actual coverage metrics | Needs real test execution with coverage tooling to validate |
