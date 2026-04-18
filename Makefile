.PHONY: setup dev dev-db test test-e2e codegen spec-lint contract-check coverage \
       db-migrate db-seed db-studio db-wait db-test-ensure \
       docker-up docker-down docs-build docs-serve ci-check help

setup:             ## First-time setup: install deps, env, codegen, migrate
	cp -n .env.example .env || true
	npm install
	$(MAKE) docker-up
	$(MAKE) db-wait
	$(MAKE) db-migrate

dev:               ## Start dev environment (Postgres + codegen + migrate + servers + browser)
	$(MAKE) dev-db
	$(MAKE) db-wait
	$(MAKE) db-migrate
	npm run dev --workspace=packages/backend &
	npm run dev --workspace=packages/frontend

dev-db:            ## Start only Postgres (for local dev, not full compose stack)
	docker compose up -d postgres

test:              ## Run all tests (unit + integration) — requires Postgres
	$(MAKE) docker-up
	$(MAKE) db-wait
	$(MAKE) db-test-ensure
	npm test --workspaces --if-present

test-e2e:          ## Run E2E tests (starts app via Playwright webServer config)
	npx playwright test --config packages/frontend/playwright.config.ts

codegen:           ## Generate types, schemas, client from OpenAPI spec
	npm run generate --workspace=packages/api-spec

spec-lint:         ## Validate OpenAPI spec syntax
	npx @redocly/cli lint packages/api-spec/openapi.yaml

contract-check:    ## Validate API responses match spec (CI gate)
	npm run test:contract --workspace=packages/backend

coverage:          ## Run tests with coverage and merge reports
	npm test --workspaces --if-present -- --coverage --reporter=json
	npx nyc merge packages/backend/coverage packages/frontend/coverage coverage/merged.json
	npx nyc report --temp-dir coverage --report-dir coverage/combined --reporter=text --reporter=lcov

db-migrate:        ## Run Drizzle migrations
	set -a && . ./.env && set +a && npm run db:migrate --workspace=packages/backend

db-seed:           ## Populate dev database with sample todos
	npm run db:seed --workspace=packages/backend

db-studio:         ## Open Drizzle Studio for DB inspection
	npm run db:studio --workspace=packages/backend

db-wait:           ## Wait for Postgres to be healthy (timeout: 60s)
	@echo "Waiting for Postgres..."
	@i=0; while [ $$i -lt 60 ]; do \
		docker compose exec postgres pg_isready > /dev/null 2>&1 && break; \
		i=$$((i + 1)); sleep 1; \
	done; \
	if [ $$i -ge 60 ]; then echo "ERROR: Postgres failed to start within 60s"; exit 1; fi
	@echo "Postgres is ready."

db-test-ensure:    ## Create test database if it doesn't exist
	@docker compose exec postgres psql -U $${POSTGRES_USER:-todo} -tc \
		"SELECT 1 FROM pg_database WHERE datname = 'todo_test'" | grep -q 1 \
		|| docker compose exec postgres psql -U $${POSTGRES_USER:-todo} -c "CREATE DATABASE todo_test"

docker-up:         ## Start Docker Compose services
	docker compose up -d

docker-down:       ## Stop Docker Compose services
	docker compose down

ci-check:          ## CI gate: lint spec, generate types, compile-check generated output
	$(MAKE) spec-lint
	$(MAKE) codegen
	npx tsc --noEmit --strict --moduleResolution bundler --module ESNext --target ES2022 packages/api-spec/generated/types.ts
	@echo "CI check passed."

docs-build:        ## Build API docs (Scalar) + MkDocs site
	$(MAKE) codegen
	cd docs && mkdocs build

docs-serve:        ## Serve docs locally
	cd docs && mkdocs serve

help:              ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
