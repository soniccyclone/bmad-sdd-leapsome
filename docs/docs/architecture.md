# Architecture

The full architecture document is maintained in the project planning artifacts:

[`_bmad-output/architecture.md`](https://github.com/your-org/todo-app/blob/main/_bmad-output/architecture.md)

## Summary

- **Monorepo** with npm workspaces (`packages/api-spec`, `packages/backend`, `packages/frontend`)
- **API-first** development: OpenAPI 3.1 spec drives generated TypeScript types and Zod schemas
- **Backend**: Fastify 5, Drizzle ORM, PostgreSQL 16
- **Frontend**: React 19, Vite, TanStack Query, Radix UI
- **Testing**: Vitest (unit/integration), Playwright (E2E planned)
