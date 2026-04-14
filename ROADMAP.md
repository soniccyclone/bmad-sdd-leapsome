# BMAD Spec-Driven Development Roadmap

> Training exercise: Build a full-stack Todo app using the BMAD framework.
> Every command below is meant to be run in Claude Code (or your terminal where noted).
> Check off each item as you complete it.

---

## Step 1: Initialize BMAD and Generate Specifications

### 1.1 — Refine the PRD & Create a Project Brief

Use BMAD's brainstorming and review skills to pressure-test the PRD before building on it.

```bash
# Brainstorm scope decisions, tech stack, and open questions
/bmad-brainstorming

# Get a cynical review of the existing PRD to find gaps
/bmad-review-adversarial-general "Product Requirement Document (PRD) for the Todo App.md"

# Hunt for unhandled edge cases in the PRD
/bmad-review-edge-case-hunter "Product Requirement Document (PRD) for the Todo App.md"

# (Optional) Use deeper critique to refine further
/bmad-advanced-elicitation
```

Then ask Claude to produce these artifacts in `_bmad-output/`:

```
Write a refined PRD and a Project Brief based on the brainstorming and review findings.
Save them to _bmad-output/project-brief.md and _bmad-output/prd-refined.md.
```

### 1.2 — Architecture Design

Use party mode to get multi-perspective input on architecture, then have Claude produce the doc.

```bash
# Roundtable discussion on architecture decisions
# (tech stack, data model, API contracts, component structure)
/bmad-party-mode
```

> In the party mode session, ask:
> "Discuss the technical architecture for this Todo app — tech stack, API design, data model, component structure, and deployment approach."

Then ask Claude to produce the artifact:

```
Based on the party mode discussion, write a technical architecture document.
Include: tech stack choices, API contracts (endpoints, request/response shapes),
data model, component hierarchy, and project folder structure.
Save to _bmad-output/architecture.md
```

Review the architecture doc with BMAD quality tools:

```bash
/bmad-review-adversarial-general _bmad-output/architecture.md
/bmad-review-edge-case-hunter _bmad-output/architecture.md
```

### 1.3 — Story Creation

Break the work into trackable stories using beads. Each story gets acceptance criteria and test scenarios.

```bash
# Create epic-level issues first
bd create --title="Backend API — CRUD endpoints" --description="Implement REST API for todo CRUD operations per architecture doc" --type=feature --priority=2
bd create --title="Frontend UI — Todo management" --description="Build the todo management UI per architecture doc" --type=feature --priority=2
bd create --title="Testing — Unit, Integration, E2E" --description="Implement all test suites per test strategy" --type=task --priority=2
bd create --title="Docker — Containerize and orchestrate" --description="Dockerfiles, docker-compose, health checks, env config" --type=task --priority=2
bd create --title="QA — Coverage, accessibility, security" --description="Quality assurance reports and audits" --type=task --priority=2

# Then break into granular stories (example — adapt IDs to your actual beads):
bd create --title="API: Create todo endpoint" --description="POST /api/todos — create a new todo item. Acceptance: returns 201, persists to DB, validates input." --type=task --priority=2
bd create --title="API: List todos endpoint" --description="GET /api/todos — return all todos. Acceptance: returns 200, returns array, supports empty state." --type=task --priority=2
bd create --title="API: Update todo endpoint" --description="PATCH /api/todos/:id — toggle completion, edit text. Acceptance: returns 200, persists change, 404 on missing." --type=task --priority=2
bd create --title="API: Delete todo endpoint" --description="DELETE /api/todos/:id — remove a todo. Acceptance: returns 204, actually deletes, 404 on missing." --type=task --priority=2
bd create --title="UI: Todo list component" --description="Display all todos with completion status. Acceptance: renders list, shows empty state, distinguishes complete/incomplete." --type=task --priority=2
bd create --title="UI: Add todo form" --description="Input field + submit to create todos. Acceptance: clears on submit, validates non-empty, optimistic update." --type=task --priority=2
bd create --title="UI: Toggle and delete actions" --description="Complete/uncomplete and delete individual todos. Acceptance: instant visual feedback, syncs with backend." --type=task --priority=2
bd create --title="E2E: Playwright test suite" --description="Minimum 5 passing E2E tests covering all user journeys. Acceptance: create, complete, delete, empty state, error handling." --type=task --priority=2

# Wire up dependencies (adapt IDs to match your actual beads)
# bd dep add <child> <parent>
```

### 1.4 — Test Strategy

Ask Claude to produce a test strategy document:

```
Write a test strategy document covering:
- Unit tests: what to test per component (frontend + backend)
- Integration tests: API endpoint tests with a real database
- E2E tests: Playwright scenarios for all user journeys (minimum 5)
- Test tooling: Jest/Vitest for unit, Playwright for E2E
- Coverage target: 70% minimum
Save to _bmad-output/test-strategy.md
```

Review it:

```bash
/bmad-review-adversarial-general _bmad-output/test-strategy.md
```

### 1.5 — Review All Step 1 Artifacts

```bash
# Structural review of each spec doc
/bmad-editorial-review-structure _bmad-output/project-brief.md
/bmad-editorial-review-structure _bmad-output/architecture.md
/bmad-editorial-review-structure _bmad-output/test-strategy.md

# Index all output docs for easy reference
/bmad-index-docs _bmad-output/
```

**Step 1 Deliverables Checklist:**
- [ ] `_bmad-output/project-brief.md`
- [ ] `_bmad-output/prd-refined.md`
- [ ] `_bmad-output/architecture.md`
- [ ] `_bmad-output/test-strategy.md`
- [ ] Stories created in beads (`bd list --status=open`)
- [ ] All artifacts reviewed with adversarial + edge case skills

---

## Step 2: Build the Application

### 2.1 — Project Setup

```bash
# Claim the setup work
bd ready
bd update <setup-issue-id> --claim

# Ask Claude to scaffold the project based on the architecture doc:
# "Initialize the project structure per _bmad-output/architecture.md.
#  Set up frontend, backend, and test directories.
#  Install dependencies and configure package.json with test commands."

# Verify setup
npm install   # or equivalent
npm test      # should run (even if no tests yet)

bd close <setup-issue-id>
```

### 2.2 — Backend (with tests alongside)

```bash
# For each API endpoint story:
bd update <issue-id> --claim

# Ask Claude to implement the endpoint per the architecture doc,
# AND write integration tests for it in the same pass.
# Example: "Implement POST /api/todos per architecture.md.
#  Write integration tests that hit the real endpoint."

# Run tests after each endpoint
npm test

# Review the code
/bmad-review-adversarial-general  # (paste the diff or point to files)
/bmad-review-edge-case-hunter     # (paste the diff or point to files)

bd close <issue-id>
```

Repeat for each backend story (create, list, update, delete).

### 2.3 — Frontend (with tests alongside)

```bash
# For each UI component story:
bd update <issue-id> --claim

# Ask Claude to build the component per architecture doc,
# AND write component tests.
# Example: "Build the TodoList component per architecture.md.
#  Write component tests for rendering, empty state, and status display."

# Start dev server and verify in browser
npm run dev

# Run component tests
npm test

bd close <issue-id>
```

Repeat for each frontend story (list, add form, toggle/delete).

### 2.4 — E2E Tests

```bash
bd update <e2e-issue-id> --claim

# Ask Claude to write Playwright tests covering all user journeys:
# "Write Playwright E2E tests per _bmad-output/test-strategy.md.
#  Must cover: create todo, complete todo, delete todo, empty state, error handling.
#  Minimum 5 passing tests."

# Run E2E tests
npx playwright test

bd close <e2e-issue-id>
```

**Step 2 Deliverables Checklist:**
- [ ] Working backend with all CRUD endpoints
- [ ] Working frontend with all UI components
- [ ] Unit and integration tests passing
- [ ] Minimum 5 E2E Playwright tests passing
- [ ] All stories closed in beads (`bd list --status=open` shows only remaining work)

---

## Step 3: Containerize with Docker Compose

```bash
bd update <docker-issue-id> --claim

# Ask Claude to create Docker and compose files:
# "Create Dockerfiles for frontend and backend with:
#  - Multi-stage builds
#  - Non-root users
#  - Health check endpoints
#  Then create docker-compose.yml that orchestrates all services
#  with networking, volumes, and environment config.
#  Support dev/test profiles via compose profiles."

# Test it works
docker-compose up --build
docker-compose ps          # all services healthy
docker-compose logs        # check for errors

# Verify health checks
curl http://localhost:<port>/health

# Test environment profiles
docker-compose --profile test up

docker-compose down

bd close <docker-issue-id>
```

**Step 3 Deliverables Checklist:**
- [ ] `Dockerfile` for frontend (multi-stage, non-root, health check)
- [ ] `Dockerfile` for backend (multi-stage, non-root, health check)
- [ ] `docker-compose.yml` with networking, volumes, env config
- [ ] `docker-compose up` launches the full app successfully
- [ ] Health check endpoints responding
- [ ] Dev/test environment profiles working

---

## Step 4: Quality Assurance

### 4.1 — Test Coverage

```bash
# Generate coverage report
npm test -- --coverage

# Ask Claude to analyze gaps:
# "Analyze the test coverage report. Identify gaps and suggest
#  additional tests to reach 70% meaningful coverage."

# Write additional tests as needed, re-run
npm test -- --coverage
```

### 4.2 — Accessibility Testing

```bash
# Run Lighthouse or axe-core via Playwright
# Ask Claude: "Add an accessibility audit test using axe-core in Playwright.
#  Check for WCAG AA compliance. Save the report."

npx playwright test accessibility

# Review findings
/bmad-review-adversarial-general _bmad-output/accessibility-report.md
```

### 4.3 — Performance Testing

```bash
# Ask Claude: "Analyze application performance. Check bundle size,
#  API response times, and rendering performance.
#  Document findings in _bmad-output/performance-report.md."
```

### 4.4 — Security Review

```bash
# Use BMAD adversarial review on the full codebase
/bmad-review-adversarial-general src/
/bmad-review-edge-case-hunter src/

# Ask Claude: "Review the codebase for OWASP top 10 vulnerabilities
#  (XSS, injection, etc.). Document findings and remediations
#  in _bmad-output/security-report.md."
```

### 4.5 — Compile QA Reports

```bash
# Index all QA output
/bmad-index-docs _bmad-output/

# Structural review of reports
/bmad-editorial-review-structure _bmad-output/security-report.md
/bmad-editorial-review-structure _bmad-output/accessibility-report.md
```

**Step 4 Deliverables Checklist:**
- [ ] Test coverage >= 70% (`npm test -- --coverage`)
- [ ] Accessibility report — zero critical WCAG violations
- [ ] Performance report documented
- [ ] Security review documented with remediations
- [ ] All QA reports in `_bmad-output/`

---

## Step 5: Documentation & Session Close

### 5.1 — AI Integration Log

```bash
# Ask Claude: "Create an AI integration log documenting:
#  - Which tasks were completed with AI assistance
#  - Which BMAD skills were used and how they helped
#  - How AI assisted in generating test cases (and what it missed)
#  - Debugging cases where AI helped
#  - Limitations encountered
#  Save to _bmad-output/ai-integration-log.md"
```

### 5.2 — README

```bash
# Ask Claude: "Create a README.md with:
#  - Project overview
#  - Setup instructions (local dev + Docker)
#  - How to run tests
#  - How BMAD guided the implementation
#  - Link to AI integration log"
```

### 5.3 — Final Push

```bash
# Close all remaining beads
bd list --status=open
bd close <any-remaining-ids>

# Preflight checks
bd preflight
bd stats

# Commit and push everything
git add .
git commit -m "Complete BMAD SDD Todo App exercise"
git pull --rebase
bd dolt push
git push
git status  # must show "up to date with origin"
```

**Final Deliverables Checklist:**
- [ ] BMAD artifacts: project brief, refined PRD, architecture doc, test strategy
- [ ] Working Todo app (frontend + backend)
- [ ] Unit, integration, and E2E test suites
- [ ] Dockerfiles and docker-compose.yml (`docker-compose up` works)
- [ ] QA reports: coverage, accessibility, performance, security
- [ ] README with setup instructions
- [ ] AI integration log
- [ ] All code committed and pushed
- [ ] All beads issues closed (`bd stats`)

---

## BMAD Skills Quick Reference

| Command | When to Use |
|---|---|
| `/bmad-brainstorming` | Ideation, scope decisions, tech stack choices |
| `/bmad-party-mode` | Multi-perspective discussion (architecture, design decisions) |
| `/bmad-review-adversarial-general <path>` | Cynical quality review of any artifact |
| `/bmad-review-edge-case-hunter <path>` | Find unhandled edge cases in code or specs |
| `/bmad-advanced-elicitation` | Push Claude to reconsider and refine output |
| `/bmad-editorial-review-structure <path>` | Structural review of documents |
| `/bmad-editorial-review-prose <path>` | Polish prose quality |
| `/bmad-distillator <path>` | Compress docs for efficient LLM consumption |
| `/bmad-index-docs <folder>` | Generate index of docs in a folder |
| `/bmad-shard-doc <path>` | Split large docs into smaller files |

---

## Success Criteria

| Criterion | Target |
|---|---|
| BMAD Artifacts | Project brief, architecture, stories with acceptance criteria |
| Working Application | Todo app fully functional with all CRUD operations |
| Test Coverage | Minimum 70% meaningful code coverage |
| E2E Tests | Minimum 5 passing Playwright tests |
| Docker Deployment | Application runs successfully via `docker-compose up` |
| Accessibility | Zero critical WCAG violations |
| Documentation | README with setup instructions, AI integration log |
