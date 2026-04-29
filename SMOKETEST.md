# Human Smoketest Checklist

> Walk through this before signing off. Each section maps to a Leapsome success criterion.
> Estimated time: 15-20 minutes.

---

## Prerequisites

- [ ] Docker Desktop running
- [ ] Node 20+ installed (`node --version`)
- [ ] Port 5432 free (or Postgres container already up)

---

## 1. Fresh Start (from clean state)

```bash
# Kill any running dev servers first
lsof -ti:3000 | xargs kill 2>/dev/null
lsof -ti:5173 | xargs kill 2>/dev/null

# Start everything from scratch
make setup   # installs deps, starts Postgres, runs migrations
make dev     # starts backend (:3000) + frontend (:5173)
```

- [ ] `make setup` completes without errors
- [ ] `make dev` starts both servers
- [ ] http://localhost:5173 loads in your browser
- [ ] http://localhost:3000/health returns `{"status":"ok"}`

---

## 2. CRUD Operations (Working Application)

Open http://localhost:5173 in your browser.

**Create:**
- [ ] Type "Test todo 1" and click Add (or press Enter)
- [ ] Todo appears in the list immediately
- [ ] Input clears after submission
- [ ] Add button disables when input is empty

**Toggle Complete:**
- [ ] Click the checkbox next to your todo
- [ ] Text gets strikethrough styling, checkbox fills
- [ ] Click again -- it toggles back to incomplete

**Edit:**
- [ ] Click the todo text to enter edit mode
- [ ] Change the text and press Enter (or click away)
- [ ] New text persists after page refresh

**Delete:**
- [ ] Click the X button on a todo
- [ ] Todo disappears from the list
- [ ] If no todos remain, "No todos yet" empty state appears

**Persistence:**
- [ ] Create 2-3 todos, toggle one complete
- [ ] Hard refresh the page (Cmd+Shift+R)
- [ ] All todos and their states survived the refresh

---

## 3. Pagination

- [ ] Create 11+ todos (keep adding quickly)
- [ ] Page 1 shows 10 items, pagination controls appear at the bottom
- [ ] Click page 2 -- shows remaining items
- [ ] Change the per-page dropdown (if present) -- list updates accordingly
- [ ] Delete todos down to <10 -- pagination disappears

---

## 4. Error Handling

```bash
# In a separate terminal, kill the backend
lsof -ti:3000 | xargs kill
```

- [ ] App shows "Service unavailable, please try again later" (not a blank screen or crash)
- [ ] A "Retry" button appears
- [ ] Input placeholder changes to "Backend unavailable..."

```bash
# Restart the backend
npm run dev --workspace=packages/backend &
```

- [ ] Click Retry -- app recovers and shows your todos again

---

## 5. Tests (Test Coverage + E2E)

```bash
# Unit + integration tests (requires Postgres running)
make test
```

- [ ] All tests pass (expect 49 backend + 63 frontend = 112 total)
- [ ] No test failures

```bash
# E2E tests (will start its own servers using todo_test database)
make test-e2e
```

- [ ] All 8 Playwright tests pass (7 functional + 1 accessibility)
- [ ] No flaky failures

**Coverage check:**
```bash
npm test --workspace=packages/backend -- --coverage 2>&1 | grep -B2 "All files"
npm test --workspace=packages/frontend -- --coverage 2>&1 | grep -B2 "All files"
```

- [ ] Backend coverage >= 70%
- [ ] Frontend coverage >= 70%

---

## 6. Docker Deployment

```bash
# Stop dev servers first
lsof -ti:3000 | xargs kill 2>/dev/null
lsof -ti:5173 | xargs kill 2>/dev/null

# Build and run the production stack (backend + frontend need the prod profile)
docker compose --profile prod up --build
```

- [ ] All three services start (postgres, backend, frontend)
- [ ] `docker compose ps` shows all services healthy
- [ ] http://localhost:8080 loads the app (production frontend via nginx)
- [ ] http://localhost:3000/health returns `{"status":"ok"}`
- [ ] CRUD operations work through the Docker deployment
- [ ] `docker compose logs` shows no errors

```bash
docker compose --profile prod down
```

---

## 7. Accessibility

Already verified via Lighthouse (100/100 desktop + mobile) and axe-core E2E test, but spot-check manually:

- [ ] Tab through the page -- focus rings visible on every interactive element
- [ ] Screen reader (Cmd+F5 on Mac) can navigate the form and todo list
- [ ] Completed todos are distinguishable without relying on color alone (strikethrough)

---

## 8. BMAD Artifacts

Verify these files exist and aren't empty stubs:

```bash
ls -la _bmad-output/
```

- [ ] `project-brief.md` -- project brief
- [ ] `prd-refined.md` -- refined PRD
- [ ] `architecture.md` -- technical architecture
- [ ] `test-strategy.md` -- test strategy
- [ ] `ai-integration-log.md` -- AI usage throughout (check MCP Server Usage section is filled in)
- [ ] `bmad-process-documentation.md` -- how BMAD guided implementation
- [ ] `framework-comparison.md` -- BMAD vs alternatives
- [ ] `coverage-report.md` -- test coverage analysis
- [ ] `accessibility-report.md` -- WCAG audit
- [ ] `performance-report.md` -- performance findings
- [ ] `security-report.md` -- security review
- [ ] `mcp-gap-analysis.md` -- what went wrong skipping MCP
- [ ] `mcp-post-mortem.md` -- what each MCP server found

---

## 9. CI

- [ ] Check GitHub Actions: https://github.com/soniccyclone/bmad-sdd-leapsome/actions
- [ ] Latest run is green (unit + integration + E2E)
- [ ] Coverage badge in README reflects actual coverage

---

## 10. Quick Sanity Checks

```bash
# All beads issues resolved
bd stats
```
- [ ] 0 open, 0 in-progress, 0 blocked

```bash
# Git is clean and pushed
git status
git log --oneline origin/main..HEAD
```
- [ ] Working tree clean (or only `.claude/settings.json` which is local prefs)
- [ ] No unpushed commits

---

## Success Criteria Summary

| Criterion | Target | How to verify |
|---|---|---|
| Working Application | CRUD fully functional | Section 2-4 above |
| Test Coverage | >= 70% | Section 5: `--coverage` output |
| E2E Tests | >= 5 passing | Section 5: 8 tests passing |
| Docker Deployment | `docker compose up` works | Section 6 |
| Accessibility | Zero critical WCAG violations | Section 7 + Lighthouse 100/100 |
| BMAD Artifacts | All spec docs present | Section 8 |
| Documentation | README + AI integration log | README.md + Section 8 |
| Framework Comparison | BMAD vs alternatives | `_bmad-output/framework-comparison.md` |
| CI | Green pipeline | Section 9 |

---

If everything above checks out, this exercise is ready to submit.
