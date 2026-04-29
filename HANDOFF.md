# Session Handoff

> Written at the end of a long session. Read this first in the next session.

## Where We Are

The BMAD SDD Todo app exercise is **functionally complete** — all Leapsome requirements satisfied, CI green, 112 tests passing, 80%+ coverage, Docker working. But we identified a critical process gap: **we never used MCP servers** despite Leapsome requiring them, and this caused real testing failures (see `_bmad-output/mcp-gap-analysis.md`).

## What Just Happened

We installed two MCP servers but haven't used them yet:
- **Playwright MCP** (`@playwright/mcp`) — browser automation, screenshots
- **Chrome DevTools MCP** (`chrome-devtools-mcp`) — console, network, DOM, performance

Config is in `.mcp.json` at project root. Claude Code needs a restart to activate them.

## Active Beads Tasks

Check `bd ready` for the current work queue. The remaining tasks are:

1. `bmad-sdd-leapsome-ayz` — **Integrate Playwright MCP server** (verify it works — use for inspecting E2E test accuracy, accessibility snapshots, automated browser interaction)
2. `bmad-sdd-leapsome-2lx` — **Integrate Chrome DevTools MCP server** (verify it works — use for visual verification of the app: screenshots, console errors, network, DOM, performance)
3. `bmad-sdd-leapsome-dqd` — **Visual verification pass** (use Chrome DevTools MCP to open the app, take screenshots of every state, verify CRUD visually, check for console errors; use Playwright MCP to verify E2E test selectors match the real DOM)
4. `bmad-sdd-leapsome-87l` — **Write MCP post-mortem** (what each server actually found/solved)
5. `bmad-sdd-leapsome-at4` — **Update AI integration log** with MCP findings

Postman MCP was skipped (user declined to generate API key). Task `bmad-sdd-leapsome-zgr` is closed.

## How to Start the Next Session

1. Run `bd prime` to load beads context
2. Run `bd ready` to see the task queue
3. Start the app: `make dev` (Postgres must be running via Docker)
4. Use Chrome DevTools MCP to open http://localhost:5173, take screenshots, verify the app visually, check console for errors
5. Use Playwright MCP to verify E2E test selectors, run accessibility snapshots, automate browser interactions
6. Document everything you find — this feeds the post-mortem

## Key Files

| File | Purpose |
|---|---|
| `ROADMAP.md` | The full BMAD exercise steps |
| `leapsome-requirements.txt` | Original Leapsome requirements |
| `_bmad-output/mcp-gap-analysis.md` | Analysis of what went wrong by skipping MCP |
| `_bmad-output/ai-integration-log.md` | AI usage log (needs MCP section updated) |
| `.mcp.json` | MCP server configuration |

## Project State

- Branch: `main`, clean, up to date with origin
- CI: green (unit + integration + E2E all passing)
- Docker: Postgres on 5432, `make dev` starts backend + frontend
- Beads: 98 closed, ~5 open (MCP tasks)
