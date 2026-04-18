import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { todos } from '../db/schema.js';
import { createApp } from '../app.js';
import { schemas } from '@todo/api-spec/schemas';

// Env vars (DATABASE_URL, FRONTEND_URL, LOG_LEVEL) are set via vitest.config.ts

let app: FastifyInstance;

beforeAll(async () => {
  app = await createApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await db.execute(sql`TRUNCATE TABLE todos`);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createTodo(description = 'Buy groceries') {
  const res = await app.inject({
    method: 'POST',
    url: '/api/todos',
    payload: { description },
  });
  return { res, body: JSON.parse(res.body) };
}

const VALID_UUID = '00000000-0000-0000-0000-000000000000';

// ---------------------------------------------------------------------------
// POST /api/todos
// ---------------------------------------------------------------------------

describe('POST /api/todos', () => {
  it('creates a todo with a valid description', async () => {
    const { res, body } = await createTodo('Buy groceries');

    expect(res.statusCode).toBe(201);
    const parsed = schemas.Todo.safeParse(body);
    expect(parsed.success).toBe(true);
    expect(body.description).toBe('Buy groceries');
    expect(body.completed).toBe(false);
  });

  it('returns 400 for empty description', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/todos',
      payload: { description: '' },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for whitespace-only description', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/todos',
      payload: { description: '   ' },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for description exceeding 2000 characters', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/todos',
      payload: { description: 'a'.repeat(2001) },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('strips HTML tags from description', async () => {
    const { res, body } = await createTodo('<b>Bold task</b>');

    expect(res.statusCode).toBe(201);
    expect(body.description).toBe('Bold task');
  });

  it('strips script tags (XSS attempt)', async () => {
    const { res, body } = await createTodo('<script>alert("xss")</script>Safe text');

    expect(res.statusCode).toBe(201);
    expect(body.description).toBe('alert("xss")Safe text');
    expect(body.description).not.toContain('<script');
  });
});

// ---------------------------------------------------------------------------
// GET /api/todos
// ---------------------------------------------------------------------------

describe('GET /api/todos', () => {
  it('returns empty array when no todos exist', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/todos' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const parsed = schemas.TodoListResponse.safeParse(body);
    expect(parsed.success).toBe(true);
    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
    expect(body.pagination.totalPages).toBe(0);
  });

  it('returns a single page of results with correct pagination', async () => {
    await createTodo('Task 1');
    await createTodo('Task 2');
    await createTodo('Task 3');

    const res = await app.inject({ method: 'GET', url: '/api/todos' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(3);
    expect(body.pagination.total).toBe(3);
    expect(body.pagination.totalPages).toBe(1);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(10);
  });

  it('returns correct page 2 for multiple pages', async () => {
    // Create 3 todos with limit=2 to get 2 pages
    await createTodo('Task 1');
    await createTodo('Task 2');
    await createTodo('Task 3');

    const page1 = await app.inject({
      method: 'GET',
      url: '/api/todos?page=1&limit=2',
    });
    const page2 = await app.inject({
      method: 'GET',
      url: '/api/todos?page=2&limit=2',
    });

    const body1 = JSON.parse(page1.body);
    const body2 = JSON.parse(page2.body);

    expect(body1.data).toHaveLength(2);
    expect(body2.data).toHaveLength(1);
    expect(body1.pagination.totalPages).toBe(2);
    expect(body2.pagination.totalPages).toBe(2);

    // Pages should have different items
    const ids1 = body1.data.map((t: { id: string }) => t.id);
    const ids2 = body2.data.map((t: { id: string }) => t.id);
    expect(ids1).not.toEqual(ids2);
  });

  it('uses default page=1 and limit=10', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/todos' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(10);
  });

  it('returns 400 for page=0', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/todos?page=0',
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for limit=51', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/todos?limit=51',
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns items in deterministic order (createdAt ASC, id ASC)', async () => {
    // Create several todos — uuidv7 is time-ordered so both
    // createdAt and id should produce ascending order
    await createTodo('First');
    await createTodo('Second');
    await createTodo('Third');

    const res = await app.inject({ method: 'GET', url: '/api/todos' });
    const body = JSON.parse(res.body);

    const descriptions = body.data.map((t: { description: string }) => t.description);
    expect(descriptions).toEqual(['First', 'Second', 'Third']);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/todos/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/todos/:id', () => {
  it('toggles completed status', async () => {
    const { body: created } = await createTodo('Toggle me');

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/todos/${created.id}`,
      payload: { completed: true },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const parsed = schemas.Todo.safeParse(body);
    expect(parsed.success).toBe(true);
    expect(body.completed).toBe(true);
    expect(body.updatedAt).not.toBe(created.updatedAt);
  });

  it('updates description', async () => {
    const { body: created } = await createTodo('Old description');

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/todos/${created.id}`,
      payload: { description: 'New description' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.description).toBe('New description');
  });

  it('returns 400 for empty body {}', async () => {
    const { body: created } = await createTodo('Some todo');

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/todos/${created.id}`,
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for malformed UUID', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/todos/not-a-uuid',
      payload: { completed: true },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('INVALID_ID');
  });

  it('upserts when ID does not exist (creates new todo)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/todos/${VALID_UUID}`,
      payload: { description: 'Upserted todo', completed: false },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe(VALID_UUID);
    expect(body.description).toBe('Upserted todo');
    expect(body.completed).toBe(false);

    // Verify it actually exists in the database
    const list = await app.inject({ method: 'GET', url: '/api/todos' });
    const listBody = JSON.parse(list.body);
    expect(listBody.pagination.total).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/todos/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/todos/:id', () => {
  it('deletes an existing todo', async () => {
    const { body: created } = await createTodo('Delete me');

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/todos/${created.id}`,
    });

    expect(res.statusCode).toBe(204);

    // Confirm it's gone
    const list = await app.inject({ method: 'GET', url: '/api/todos' });
    const listBody = JSON.parse(list.body);
    expect(listBody.pagination.total).toBe(0);
  });

  it('returns 204 for non-existent todo (idempotent)', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/todos/${VALID_UUID}`,
    });

    expect(res.statusCode).toBe(204);
  });

  it('returns 400 for malformed UUID', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/todos/bad-uuid',
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('INVALID_ID');
  });
});
