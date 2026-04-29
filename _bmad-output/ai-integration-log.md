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

### Human Smoketest Findings (Post-Completion)

After the AI declared the project complete, a human walkthrough of a structured smoketest checklist uncovered **7 bugs** that passed all 112 unit/integration tests and 8 E2E tests. None were caught by AI-driven MCP verification, Lighthouse audits, or automated test suites. Every one required human interaction with the running application to surface.

**What the human found that the AI missed:**

1. **Pagination dropdown disappeared when all items fit on one page.** Changing the per-page dropdown from 10 to 50 caused the entire pagination component (including the dropdown) to vanish via an early `return null`. The user was trapped at 50-per-page with no way to change back. *Root cause:* The AI coupled page button visibility with dropdown visibility in a single guard clause. A human noticed because they actually used the dropdown, then wanted to change it back.

2. **"Backend unavailable..." placeholder never appeared when the backend was down.** The health check had a chicken-and-egg deadlock: it required 2 consecutive failures to set `isBackendDown=true`, but only polled when `isBackendDown` was already `true`. On a fresh page load with the backend down, the health query fired once, failed, and never polled again. *Root cause:* The AI wrote the consecutive-failure guard to prevent flash-on-startup, but didn't test the scenario where the backend is down *before* the page loads. The AI's MCP verification only tested the "kill backend while app is running" path.

3. **E2E tests failed due to missing database migration.** The `db-test-ensure` Makefile target created the `todo_test` database but never ran migrations. The todos table didn't exist, so every API call returned an error instead of paginated data. *Root cause:* The AI wrote the database creation step but never tested `make test-e2e` from a clean state. The E2E tests had been passing in CI because CI ran migrations separately — but a prior CI change broke this, and the AI never re-verified.

4. **E2E tests hit rate limiter.** The 8th E2E test (creating 15 todos in a tight loop) tripped the 100 req/min rate limit. The test received a 429 response instead of todo data. *Root cause:* The AI set up rate limiting for production safety but didn't consider the E2E test load profile. The rate limiter was global, not per-test.

5. **Docker `docker compose up` only started Postgres.** The backend and frontend services had `profiles: [prod]`, requiring `--profile prod` to start. The Leapsome requirement explicitly says "runs via docker-compose up." *Root cause:* The AI added profiles to prevent Docker from building containers during local dev (when you only need Postgres). A reasonable optimization, but it violated the stated requirement. The human caught it by running the exact command from the smoketest checklist.

6. **Docker frontend returned HTML for API requests.** The nginx config had no proxy rules for `/api/` or `/health`. The SPA fallback (`try_files $uri /index.html`) caught all requests, so API calls returned `index.html` as JSON, crashing the frontend with "Cannot read properties of undefined." *Root cause:* During dev, Vite's proxy config handles API routing. The AI never tested the production nginx path because it declared Docker "working" after the containers started without checking whether the app actually functioned through nginx.

7. **Production backend crashed with "Unknown file extension .ts".** The api-spec package.json exports pointed to `.ts` files. In dev, `tsx` handles this transparently. In the Docker production image, Node.js can't import TypeScript. *Root cause:* The AI tested Docker builds (containers started) but never verified the backend could actually serve requests through the production image.

**Why automated testing missed all of these:**

- Unit and integration tests run in dev mode with `tsx`, which papers over module resolution issues.
- E2E tests use `reuseExistingServer` in non-CI mode, so they test against the dev stack, not the production Docker stack.
- MCP verification tested the dev server, not the Docker deployment.
- The AI's definition of "working" was "containers started and health check passed" — not "a human can use every feature end-to-end through the production deployment."

**Key lesson:** AI can build a spec-correct application, achieve 100% Lighthouse scores, and pass hundreds of automated tests — but it doesn't *use* the product the way a human does. A human clicks the dropdown and wants to change it back. A human runs `docker compose up` without flags. A human kills the backend before loading the page. These are not edge cases — they are the first things a real user or evaluator will try. **A structured human smoketest checklist is not optional, even when all automated checks pass.**
