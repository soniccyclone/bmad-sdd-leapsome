# Developer Setup

## Prerequisites

- Node.js 20+
- Docker and Docker Compose (for PostgreSQL)

## Quick Start

```bash
# Clone the repo
git clone <repo-url> && cd todo-app

# One-command setup: installs deps, starts Postgres, runs migrations
make setup

# Start all services in dev mode
make dev
```

This starts:

- **Backend** at `http://localhost:3000`
- **Frontend** at `http://localhost:5173`
- **PostgreSQL** at `localhost:5432`

## Useful Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start dev environment |
| `make test` | Run unit + integration tests |
| `make test-e2e` | Run end-to-end tests |
| `make codegen` | Regenerate types from OpenAPI spec |
| `make spec-lint` | Lint the OpenAPI spec |
| `make db-studio` | Open Drizzle Studio |
| `make help` | Show all available targets |

## Environment Variables

Copy `.env.example` to `.env`. The defaults work with the Docker Compose Postgres instance:

```bash
cp .env.example .env
```
