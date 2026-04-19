import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/index.js';
import { sql } from 'drizzle-orm';

export async function healthRoute(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    try {
      await getDb().execute(sql`SELECT 1`);
      return reply.send({ status: 'ok' as const });
    } catch {
      return reply.status(503).send({
        error: {
          code: 'SERVICE_UNAVAILABLE' as const,
          message: 'Database unreachable',
        },
      });
    }
  });
}
