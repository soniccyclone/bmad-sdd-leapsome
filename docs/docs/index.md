# Todo App

A full-stack todo application built with Fastify, React, and PostgreSQL.

## Documentation

- [Developer Setup](setup.md) -- get up and running locally
- [Architecture](architecture.md) -- system design and technical decisions
- [API Reference](https://github.com/your-org/todo-app/blob/main/packages/api-spec/openapi.yaml) -- OpenAPI spec (render with Scalar or Redocly)

## Project Structure

```
packages/
  api-spec/     OpenAPI spec + generated types/schemas
  backend/      Fastify server, Drizzle ORM, PostgreSQL
  frontend/     React SPA (Vite, TanStack Query, Radix UI)
```
