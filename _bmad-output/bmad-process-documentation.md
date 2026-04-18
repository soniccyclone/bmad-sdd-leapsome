# BMAD Process Documentation

> How the BMAD framework guided the implementation of the Todo app, from PRD to deployed application.

---

## Phase Overview

### Step 1: Specification (PRD → Architecture → Stories → Test Strategy)

The original PRD was 17 lines of aspirational prose — no data model, no API contract, no measurable success criteria. BMAD's structured review process turned it into an implementable specification through four rounds of refinement.

### Step 2: Implementation (Scaffold → Backend → Frontend → E2E)

Implementation followed the dependency chain defined in the stories. Parallel subagents built independent work streams simultaneously, collapsing what would normally be sequential work into parallel batches.

### Step 3: Containerization (Dockerfiles → docker-compose → Verification)

Docker verification caught 3 production-only issues that would never surface in development (TypeScript exports failing at runtime, dev dependencies missing in production, IPv6 resolution in Alpine).

### Step 4: Quality Assurance (Coverage → Accessibility → Security → Performance)

QA reports were produced by reading actual source code, not running against a checklist. Every finding references specific files and lines.

---

## BMAD Skills Used and Value Added

### /bmad-brainstorming — 3 techniques, 22+ decisions

**What it did:** Facilitated a structured brainstorming session using Question Storming, Six Thinking Hats, and Reverse Brainstorming.

**Value added:**
- Question Storming surfaced 22 unknowns the PRD didn't address (data model, pagination, error states, deployment target)
- Six Thinking Hats stress-tested every decision from 6 perspectives — the Black Hat pass identified Drizzle+SQLite datetime concerns, which led to switching to PostgreSQL
- Reverse Brainstorming identified 12 failure modes that became security requirements, test cases, and error handling specs

**Key moment:** The brainstorming session resolved the entire tech stack before any code was written. Every framework, library, and pattern choice was made with documented rationale, preventing mid-implementation debates.

### /bmad-review-adversarial-general — 4 reviews, 46 total findings

**Used on:** Original PRD (14 findings), refined PRD (part of edge case), architecture doc (12 findings), test strategy (10 findings).

**Value added:**
- Original PRD review exposed that "basic error handling" and "visually distinguishable" were not specifications — they were wishes. Every finding became a concrete requirement in the refined PRD.
- Architecture review caught real implementation issues: Dockerfile copying all dev dependencies, sequential Makefile without health check waits, sanitization pipeline defined three times but never specified, `updatedAt` not auto-updating on mutations.
- Test strategy review caught parallel test isolation issues, missing test database creation, and the coverage merge problem across workspaces.

**Key moment:** The architecture adversarial review found that the frontend Dockerfile was hand-waved as "similar pattern." That single finding prevented a production deployment failure.

### /bmad-review-edge-case-hunter — 2 reviews, 25 total findings

**Used on:** Refined PRD (13 findings), architecture doc (12 findings).

**Value added:**
- PRD edge case review found the DELETE idempotency contradiction (claimed idempotent but returned 404), the undefined retry count, and the 2000-character unit ambiguity (characters vs bytes).
- Architecture edge case review found the `db-wait` infinite loop, the optimistic create appending to the wrong page, and the nginx Dockerfile never switching to non-root.

**Key moment:** The pagination tiebreaker finding — `ORDER BY created_at` without `id` as a tiebreaker could produce non-deterministic pagination when two todos share the same millisecond timestamp. This would have been an intermittent production bug.

### /bmad-party-mode — 4 agents, 2 rounds, 3 key outcomes

**Agents:** Winston (Architect), Amelia (Developer), Sally (UX Designer), John (PM) — each spawned as independent subagents.

**Value added:**
- Real disagreements emerged: John challenged hybrid pagination as over-engineering, Sally and Amelia debated smart vs dumb components, Winston conceded on YAGNI when the user pushed back on speculative `parent_id` column.
- Each agent brought domain-specific concerns: Sally flagged loading vs empty state distinction, Amelia identified the optimistic update rollback as the bug-hiding zone, Winston named spec discipline as the riskiest assumption.

**Key moment:** The user rejected the unanimous team recommendation to add a `parent_id` column, calling it a YAGNI violation. Both Winston and John acknowledged the user was right — "A column that does nothing is not free — it is a liability that accumulates interest in the form of confusion." This demonstrated that party mode produces genuine debate, not rubber-stamping.

---

## Quantitative Summary

| Metric | Count |
|---|---|
| BMAD skill invocations | 8 |
| Adversarial review findings | 46 (all addressed) |
| Edge case findings | 25 (all addressed) |
| Architectural decisions documented | 22+ (brainstorming) + 12 ADRs |
| Stories created | 43 (8 epics + 35 stories) |
| Dependency chains | 50+ links |
| Parallel subagent batches | 5 (3-agent parallelism) |
| Docker production issues caught | 3 |

---

## What Worked Well

1. **Spec quality before code.** The refined PRD and architecture doc were so detailed that implementation was mostly mechanical — the hard decisions were already made. No mid-sprint debates about pagination strategy or error handling.

2. **Adversarial + edge case as a pair.** The adversarial review finds what's wrong or missing. The edge case hunter finds what's unhandled. Together they're orthogonal and comprehensive — attitude-driven vs method-driven.

3. **Party mode for architecture.** Independent subagents genuinely disagree. The smart vs dumb component debate and the YAGNI pushback on `parent_id` would not have emerged from a single LLM roleplaying characters.

4. **Parallel subagents for implementation.** Three agents building backend, frontend, and CI simultaneously — with carefully scoped non-overlapping file boundaries — collapsed sequential work into parallel batches.

5. **Beads for dependency tracking.** The dependency chain (scaffold → codegen → backend/frontend → E2E → Docker → QA → docs) made the critical path visible and ensured nothing was attempted before its prerequisites were ready.

## What Was Surprising

1. **The brainstorming session made 22+ decisions in one sitting.** Expected it to be slower — the structured technique sequence (Question Storming → Six Thinking Hats → Reverse Brainstorming) kept momentum high.

2. **The user's YAGNI instinct was stronger than the team's.** All four agents recommended the `parent_id` column. The user rejected it. The agents conceded. This was the most valuable moment in the entire process — proof that party mode enables genuine pushback, not groupthink.

3. **Docker verification found 3 issues invisible in development.** TypeScript exports, dev dependencies, and IPv6 resolution — all work perfectly in dev but break in production containers. The verification agent caught all three from container logs.

## What Could Be Improved

1. **BMAD installer is interactive TUI.** Claude Code can't automate it. The user had to run it manually. A `--yes` or `--non-interactive` flag would solve this.

2. **Review skills output raw findings.** The edge case hunter outputs JSON. The user had to ask twice for findings to be processed into actionable format. The skill should auto-format findings.

3. **No incremental review.** Every review re-reads the full document. Reviewing only the diff from the last review would be more efficient for iterative refinement.

4. **Test pyramid is thin in the middle.** The parallel implementation focused on unit tests (sanitization) and E2E (Playwright), leaving integration tests and component tests as gaps. The coverage report identified this — it should have been caught during implementation, not QA.
