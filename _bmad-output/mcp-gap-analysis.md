# MCP Gap Analysis — What We Missed by Not Using MCP Servers

> Written after completing the full BMAD exercise. This document analyzes the concrete failures and blind spots that resulted from not integrating MCP servers (Playwright, Chrome DevTools, Postman) during development, despite the Leapsome requirements explicitly calling for them.

---

## The Mistake

The original rationale for skipping MCP servers was documented in the AI integration log:

> "No MCP servers were used in this project. The spec-first approach (OpenAPI codegen + Zod contract testing) replaced the need for Postman MCP."

This was wrong. Not because the spec-first approach lacked value — it didn't — but because it addressed a different problem than MCP servers solve. Spec-first ensures **contract correctness**. MCP servers provide **runtime verification**. These are orthogonal. Skipping one because you have the other is like skipping unit tests because you have type checking.

---

## Incident Timeline: What Went Wrong

### Incident 1: E2E Tests Claimed Passing Without Execution

**What happened:** After writing 8 Playwright E2E tests, the AI reported them as "done" because `npx playwright test --list` showed they were discoverable. They were never actually executed against the running application.

**What MCP would have caught:** A Playwright MCP would have executed each test in a real browser, showing pass/fail results with screenshots. The AI would have seen failures immediately and been forced to fix them before claiming completion.

**Impact:** The tests sat unvalidated through multiple commit cycles. When finally run, several were flaky due to timing issues with data loading after API calls.

### Incident 2: Zodios Refactor Broke the Frontend Silently

**What happened:** When replacing the openapi-fetch client with the generated Zodios client, the `client.ts` file was in a gitignored `generated/` directory. In CI, this file didn't exist after a fresh checkout + codegen. The frontend hooks couldn't resolve their imports.

**What MCP would have caught:** A Playwright MCP running the app after the refactor would have shown a blank page or error screen. A Chrome DevTools MCP would have shown module resolution errors in the console. Either would have caught the issue before pushing.

**Impact:** CI failed for multiple commits. The fix required three iterations: moving the file, updating exports, adding Vitest aliases.

### Incident 3: ErrorBanner Flash on Initial Load

**What happened:** The health check hook marked the backend as "down" on the very first failed request during startup. Since the backend takes a moment to boot, developers saw "Our site is experiencing problems" every time they started the app. This was reported by the user, not caught during development.

**What MCP would have caught:** A Chrome DevTools MCP would have shown the banner rendering during initial load. A Playwright MCP screenshot after `make dev` would have captured it visually.

**Impact:** Poor developer experience. Required a fix to add consecutive-failure thresholds before showing the banner.

### Incident 4: E2E Tests Using Developer Database

**What happened:** The E2E tests ran against the `todo` database (the development database), not `todo_test`. The `clearAllTodos` helper in `beforeEach` wiped all developer data on every test run.

**What MCP would have caught:** This wouldn't have been caught by MCP directly — it's a configuration issue. However, if a Playwright MCP had been running tests regularly during development, the developer would have noticed their data disappearing and identified the root cause sooner.

**Impact:** Any developer who ran `make test-e2e` lost all their dev data.

### Incident 5: Never Saw the Application

**What happened:** The AI wrote all components, CSS, accessibility attributes, responsive breakpoints, and design tokens without ever seeing the rendered application. Every visual decision was made based on code reading and spec compliance, not visual verification.

**What MCP would have caught:** Everything visual. A Playwright MCP would have provided screenshots at every step. A Chrome DevTools MCP would have shown the computed styles, layout, and accessibility tree. The AI would have been able to verify that:
- Completed todos actually look different from active ones
- The pagination truncation renders correctly
- Touch targets are actually 44x44 pixels
- The responsive layout works on mobile viewports
- The error banner looks professional, not broken
- The loading spinner animates

**Impact:** Unknown. The visual implementation may be correct, but we can't confirm it without looking.

---

## MCP Server Analysis: What Each Would Have Provided

### Playwright MCP

**Primary value:** Execute browser automation and see the results.

| Capability | What it solves |
|---|---|
| Run tests with real results | No more claiming tests pass without execution |
| Take screenshots | Visual verification of every component state |
| Interact with the app | Verify CRUD operations actually work in the UI |
| Mobile viewports | Confirm responsive design at 320px, 375px, etc. |
| Accessibility audit | Run axe-core and see the actual violations |

**Would have prevented:** Incidents 1, 2, 3, 5

### Chrome DevTools MCP

**Primary value:** Inspect the running application at runtime.

| Capability | What it solves |
|---|---|
| Console errors | Catch React warnings, unhandled rejections, module errors |
| Network waterfall | Verify API calls, response times, failed requests |
| DOM inspection | Verify ARIA attributes, computed styles, layout |
| Performance profiling | Measure real TTI, bundle parse time, render performance |
| Accessibility tree | Verify screen reader output matches expectations |

**Would have prevented:** Incidents 2, 3, 5

### Postman MCP

**Primary value:** Interactive API exploration and validation.

| Capability | What it solves |
|---|---|
| Request builder | Manually test edge cases not covered by automated tests |
| Collection runner | Run a suite of API tests with variables |
| Environment management | Switch between dev/test/prod API targets |
| Response validation | Verify response shapes match OpenAPI spec |

**Assessment:** Our spec-first approach (OpenAPI codegen + Zod contract testing) genuinely covers most of what Postman MCP provides. The integration tests validate every endpoint against generated schemas. However, Postman MCP adds **interactive exploration** — the ability to quickly test a hypothesis about an edge case without writing a formal test first. This is valuable during debugging.

---

## Root Cause Analysis

The root cause of skipping MCP servers was not laziness — it was a false equivalence:

> "We have contract testing, therefore we don't need runtime verification."

Contract testing verifies that **if the code runs, the output matches the spec**. It does not verify:
- That the code actually runs in a browser
- That the visual output matches design intent
- That the user experience is acceptable
- That the error states look right
- That the performance targets are met in practice

The BMAD spec-driven approach produced excellent specifications and thorough contract tests. But it created a false sense of completeness. Every document passed adversarial review. Every test passed. Every coverage target was met. And yet the AI had never seen the application it built.

**The lesson:** Spec-driven development is necessary but not sufficient. Visual verification is not a nice-to-have — it's the final validation layer that connects specs to reality.

---

## Remediation Plan

1. Integrate all three MCP servers (Playwright, Chrome DevTools, Postman)
2. Run a full visual verification pass with Playwright MCP
3. Inspect runtime behavior with Chrome DevTools MCP
4. Validate API edge cases with Postman MCP
5. Document what each server found in a post-mortem
6. Update the AI integration log with all findings
