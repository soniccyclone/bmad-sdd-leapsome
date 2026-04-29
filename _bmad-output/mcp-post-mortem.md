# MCP Post-Mortem: What Each Server Actually Solved

> Written after integrating and exercising both Playwright MCP and Chrome DevTools MCP against the completed Todo application.

---

## Summary

Two MCP servers were integrated and verified. A third (Postman MCP) was skipped by user decision (API key generation declined). The integration found two real bugs and confirmed the application was otherwise solid.

**Bottom line:** The bugs found were minor, but the confidence gained was not. Before MCP, we had 112 passing tests and zero visual verification. After MCP, we know the app actually works — not just that the code is correct.

---

## Chrome DevTools MCP: Findings

### What It Found (Real Issues)

1. **`favicon.ico` 404** — Browser's default favicon request returned 404. No favicon was configured. Fixed by adding an inline SVG favicon to `index.html`.

2. **Form field accessibility warning** — The todo input had `aria-label` but no `id` or `name` attribute. Chrome DevTools surfaced this as a console issue: "A form field element should have an id or name attribute." Fixed by adding `id="new-todo"` and `name="new-todo"` to the input in `TodoForm.tsx`.

### What It Confirmed Was Correct

- **Zero console errors** after fixes — no React warnings, no unhandled rejections, no module resolution issues.
- **Network waterfall clean** — all API calls (GET, POST, PATCH, DELETE) returned correct status codes (200, 201, 204). Health check working.
- **Accessibility tree well-structured** — proper ARIA roles, live regions for status updates, disabled states correctly reflected.

### Verdict

Worth the integration. The console issue warning about the missing `id`/`name` attribute is exactly the kind of thing that passes all tests but fails in accessibility audits. Lighthouse confirmed 100/100 accessibility only after the fix.

---

## Playwright MCP: Findings

### What It Found

No new bugs beyond what Chrome DevTools already surfaced. The application worked correctly through the full CRUD cycle automated via Playwright.

### What It Confirmed Was Correct

- **Create** — form submission creates todo, input clears, button disables.
- **Toggle** — checkbox marks complete, label flips to "as incomplete", visual strikethrough applied.
- **Delete** — todo removed, returns to empty state.
- **Mobile responsive** — layout adapts correctly at 375x812 (iPhone viewport). No overflow, no broken layout.
- **Error state** — backend down shows "Service unavailable, please try again later" with Retry button. Recovery works.
- **Accessibility snapshots** — proper semantic structure (headings, lists, buttons with labels, checkboxes with descriptive names, status live regions).

### Verdict

Worth the integration for confidence, even though it found no new bugs. The accessibility snapshots (YAML tree) provide a richer view than Chrome DevTools' a11y tree for verifying screen reader behavior. The ability to automate full user journeys and verify them visually is the missing piece that makes spec-driven development complete.

---

## Postman MCP: Not Integrated

Skipped by user decision — API key generation was declined. Our assessment from the gap analysis stands: the spec-first approach (OpenAPI codegen + Zod contract testing + integration tests) covers most of what Postman MCP provides. The main gap is interactive API exploration during debugging, which is a convenience, not a necessity.

---

## Lighthouse Audit Results

| Category | Desktop | Mobile |
|----------|---------|--------|
| Accessibility | 100 | 100 |
| Best Practices | 100 | 100 |
| SEO | 82 | 82 |

SEO failures (missing meta description, no robots.txt) are expected and irrelevant for this exercise.

---

## Was It Worth the Integration Effort?

**Yes.** Here's why:

1. **Two real bugs found** that passed all 112 tests: the favicon 404 and the form field `id`/`name` omission. Both are minor individually, but the accessibility issue would have been caught in any professional audit.

2. **Confidence gap closed.** Before MCP, we had a spec-correct application that had never been seen. After MCP, we have visual evidence that every state renders correctly, the error handling is graceful, the mobile layout works, and accessibility is 100/100.

3. **The gap analysis was right.** The original analysis predicted that MCP would catch things like console errors, missing accessibility attributes, and visual rendering issues. Chrome DevTools found exactly those. The prediction about runtime verification being orthogonal to contract testing was validated.

4. **The cost was low.** Total integration time was under 30 minutes for both servers. The browser install for Playwright MCP took the longest.

---

## Recommendations for Future Projects

1. **Integrate MCP servers from the start, not as a remediation step.** The bugs we found would have been caught immediately during development.

2. **Chrome DevTools MCP is the highest-value server for AI-driven development.** Console errors, network inspection, and accessibility audits are things the AI literally cannot do without it.

3. **Playwright MCP complements but doesn't replace Chrome DevTools MCP.** Use Playwright for automated interaction and accessibility snapshots. Use Chrome DevTools for runtime inspection and Lighthouse audits.

4. **Run Lighthouse after every visual change.** The 100/100 accessibility score is only meaningful if it's maintained. A Lighthouse audit takes 4 seconds.

5. **Spec-driven development + MCP visual verification = complete coverage.** Neither is sufficient alone. Together, they cover contract correctness (specs + tests) and runtime correctness (MCP + visual verification).
