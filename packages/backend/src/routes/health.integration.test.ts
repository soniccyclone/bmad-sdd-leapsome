import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
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

describe('GET /health', () => {
  it('returns 200 with status ok when DB is reachable', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toEqual({ status: 'ok' });

    const parsed = schemas.HealthResponse.safeParse(body);
    expect(parsed.success).toBe(true);
  });
});
