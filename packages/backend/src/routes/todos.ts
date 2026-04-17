import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, sql, count, asc } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '../db/index.js';
import { todos } from '../db/schema.js';
import { sanitize, validateDescription } from '../lib/sanitize.js';
import { schemas } from '@todo/api-spec/schemas';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const UpdateBody = schemas.UpdateTodoRequest.refine(
  (data) => data.description !== undefined || data.completed !== undefined,
  { message: 'At least one field (description or completed) must be provided' },
);

function errorResponse(code: string, message: string) {
  return { error: { code, message } };
}

function isDbError(err: unknown): boolean {
  // postgres.js errors and generic DB errors
  return (
    err instanceof Error &&
    (err.constructor.name === 'PostgresError' ||
      'severity' in err ||
      'code' in err)
  );
}

export async function todoRoutes(app: FastifyInstance) {
  // POST /api/todos — Create a new todo
  app.post('/api/todos', async (request, reply) => {
    try {
      // Parse and validate body
      const parseResult = schemas.CreateTodoRequest.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send(
          errorResponse('VALIDATION_ERROR', parseResult.error.issues[0].message),
        );
      }

      // Sanitize and validate description
      const description = sanitize(parseResult.data.description);
      const descError = validateDescription(description);
      if (descError) {
        return reply.status(400).send(
          errorResponse('VALIDATION_ERROR', descError),
        );
      }

      const id = uuidv7();
      const now = new Date();

      const [created] = await db
        .insert(todos)
        .values({
          id,
          description,
          completed: false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return reply.status(201).send({
        id: created.id,
        description: created.description,
        completed: created.completed,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      });
    } catch (err) {
      if (isDbError(err)) {
        app.log.error(err, 'Database error during todo creation');
        return reply.status(503).send(
          errorResponse('SERVICE_UNAVAILABLE', 'Database unreachable'),
        );
      }
      throw err;
    }
  });

  // GET /api/todos — List todos with pagination
  app.get('/api/todos', async (request, reply) => {
    try {
      const parseResult = PaginationQuery.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send(
          errorResponse('VALIDATION_ERROR', parseResult.error.issues[0].message),
        );
      }

      const { page, limit } = parseResult.data;
      const offset = (page - 1) * limit;

      const [rows, [{ total }]] = await Promise.all([
        db
          .select()
          .from(todos)
          .orderBy(asc(todos.createdAt), asc(todos.id))
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(todos),
      ]);

      const totalPages = Math.ceil(total / limit) || 0;

      return reply.send({
        data: rows.map((row) => ({
          id: row.id,
          description: row.description,
          completed: row.completed,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        })),
        pagination: { page, limit, total, totalPages },
      });
    } catch (err) {
      if (isDbError(err)) {
        app.log.error(err, 'Database error during todo listing');
        return reply.status(503).send(
          errorResponse('SERVICE_UNAVAILABLE', 'Database unreachable'),
        );
      }
      throw err;
    }
  });

  // PATCH /api/todos/:id — Update (upsert) a todo
  app.patch<{ Params: { id: string } }>('/api/todos/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      // Validate UUID format
      if (!UUID_REGEX.test(id)) {
        return reply.status(400).send(
          errorResponse('INVALID_ID', 'Invalid UUID format'),
        );
      }

      // Parse and validate body
      const parseResult = UpdateBody.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send(
          errorResponse('VALIDATION_ERROR', parseResult.error.issues[0].message),
        );
      }

      const updates = parseResult.data;

      // Sanitize description if provided
      let sanitizedDescription: string | undefined;
      if (updates.description !== undefined) {
        sanitizedDescription = sanitize(updates.description);
        const descError = validateDescription(sanitizedDescription);
        if (descError) {
          return reply.status(400).send(
            errorResponse('VALIDATION_ERROR', descError),
          );
        }
      }

      // Build the set clause for the conflict update
      const now = new Date();
      const setClause: Record<string, unknown> = { updatedAt: now };
      if (sanitizedDescription !== undefined) {
        setClause.description = sanitizedDescription;
      }
      if (updates.completed !== undefined) {
        setClause.completed = updates.completed;
      }

      // Upsert: insert with defaults if not exists, update if exists
      const [result] = await db
        .insert(todos)
        .values({
          id,
          description: sanitizedDescription ?? 'Untitled',
          completed: updates.completed ?? false,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: todos.id,
          set: setClause,
        })
        .returning();

      return reply.status(200).send({
        id: result.id,
        description: result.description,
        completed: result.completed,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      });
    } catch (err) {
      if (isDbError(err)) {
        app.log.error(err, 'Database error during todo update');
        return reply.status(503).send(
          errorResponse('SERVICE_UNAVAILABLE', 'Database unreachable'),
        );
      }
      throw err;
    }
  });

  // DELETE /api/todos/:id — Delete a todo (idempotent)
  app.delete<{ Params: { id: string } }>('/api/todos/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      // Validate UUID format
      if (!UUID_REGEX.test(id)) {
        return reply.status(400).send(
          errorResponse('INVALID_ID', 'Invalid UUID format'),
        );
      }

      await db.delete(todos).where(eq(todos.id, id));

      return reply.status(204).send();
    } catch (err) {
      if (isDbError(err)) {
        app.log.error(err, 'Database error during todo deletion');
        return reply.status(503).send(
          errorResponse('SERVICE_UNAVAILABLE', 'Database unreachable'),
        );
      }
      throw err;
    }
  });
}
